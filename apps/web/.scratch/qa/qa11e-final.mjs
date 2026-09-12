// QA-11 BREAK-IT E (definitivo): BREAK-09 10k loja e BREAK-14 corrida de e-mail,
// extraindo o $ACTION_ID do FORM CORRETO (o primeiro da página é o logout do shell!).
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const b = await browser();

// ---------- BREAK-09b: nome de Loja com 10k chars via POST forçado ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  const actionId = await page.locator('form:has(input#nome) input[name^="$ACTION_ID"]').getAttribute("name");
  console.log("criarLoja actionId:", actionId);
  const resp = await ctx.request.post(`${BASE}/configuracoes`, {
    multipart: { [actionId]: "", nome: "L".repeat(10000) },
    maxRedirects: 0,
  });
  const loc = resp.headers()["location"] ?? "";
  let corpo = "";
  if (resp.status() >= 400) corpo = (await resp.text()).slice(0, 300);
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  const lojas = await page.locator("ul.listing-frame > li").allInnerTexts();
  const gigante = lojas.find((l) => l.length > 1000);
  await record("BREAK-09", gigante ? "FAIL" : "PASS", `10k nome de Loja via POST forçado: ${resp.status()} ${loc}; ${gigante ? `ACEITO (${gigante.length} chars) — sem limite server-side` : `rejeitado ${corpo}`}`);
  if (gigante) await shot(page, "breakit", "break-09-10k");
  await ctx.close();
}

// ---------- BREAK-14: corrida — 2 POSTs simultâneos, mesmo e-mail ----------
async function contarEmail(page, email) {
  let count = 0;
  for (let p = 1; p <= 4; p++) {
    await page.goto(`${BASE}/usuarios?page=${p}`, { waitUntil: "networkidle" });
    const textos = await page.locator("ul > li").allInnerTexts();
    if (textos.length === 0) break;
    count += textos.filter((t) => t.includes(email)).length;
  }
  return count;
}

for (const email of ["race@doguinho.local", "race2@doguinho.local"]) {
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const actionId = await page.locator('form:has(input#email) input[name^="$ACTION_ID"]').getAttribute("name");
  const perfilId = await page.locator('form:has(input#email) select[name="perfilId"] option').nth(1).getAttribute("value");
  const lojaId = await page.locator('form:has(input#email) input[name="lojaIds"]').first().getAttribute("value");
  console.log("criarUsuario actionId:", actionId, "perfil:", perfilId, "loja:", lojaId);
  const campos = { [actionId]: "", nome: "Race Teste", email, senha: "qa123456", perfilId, lojaIds: lojaId };
  const [r1, r2] = await Promise.all([
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
  ]);
  const st = `${r1.status()}→${r1.headers()["location"] ?? ""} | ${r2.status()}→${r2.headers()["location"] ?? ""}`;
  let corpo = "";
  if (r1.status() >= 500) corpo = (await r1.text()).slice(0, 150);
  if (r2.status() >= 500) corpo += " | " + (await r2.text()).slice(0, 150);
  const count = await contarEmail(page, email);
  const ok = count === 1;
  await record("BREAK-14", ok ? "PASS" : "FAIL", `corrida (${email}): ${st}; criados=${count}${corpo ? " 5xx=" + corpo : ""}`);
  if (!ok) await shot(page, "breakit", `break-14-${email.replace(/\W/g, "_")}`);
  await ctx.close();
}

await b.close();
console.log("QA-11E concluído.");
