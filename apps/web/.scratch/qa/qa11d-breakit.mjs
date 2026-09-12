// QA-11 BREAK-IT D (re-execução limpa): BREAK-09 10k loja via POST forçado; BREAK-14 corrida de e-mail.
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const b = await browser();

// ---------- BREAK-09b: nome de Loja com 10k chars via POST forçado (bypass maxLength=80) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const html = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
  const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
  console.log("criarLoja actionId:", actionId);
  const resp = await ctx.request.post(`${BASE}/configuracoes`, {
    multipart: { [actionId]: "", nome: "L".repeat(10000) },
    maxRedirects: 0,
  });
  const loc = resp.headers()["location"] ?? "";
  console.log("POST 10k →", resp.status(), loc);
  if (resp.status() >= 400) console.log("corpo:", (await resp.text()).slice(0, 300));
  const depois = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
  const aceito = depois.includes("L".repeat(200));
  await record("BREAK-09", aceito ? "FAIL" : "PASS", `10k nome de Loja via POST forçado: ${resp.status()} ${loc}; renderizado depois: ${aceito} ${aceito ? "(sem limite server-side)" : "(rejeitado)"}`);
  await ctx.close();
}

// ---------- BREAK-14: corrida — 2 POSTs simultâneos, mesmo e-mail ----------
async function contarEmail(page, email) {
  let count = 0;
  for (let p = 1; p <= 4; p++) {
    await page.goto(`${BASE}/usuarios?page=${p}`, { waitUntil: "networkidle" });
    const textos = await page.locator("ul > li").allInnerTexts();
    const n = textos.filter((t) => t.includes(email)).length;
    if (textos.length === 0) break;
    count += n;
  }
  return count;
}

for (const email of ["race@doguinho.local", "race2@doguinho.local"]) {
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const html = await (await ctx.request.get(`${BASE}/usuarios`)).text();
  const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const perfilId = await page.locator('select[name="perfilId"] option').nth(1).getAttribute("value");
  const lojaId = await page.locator('input[name="lojaIds"]').first().getAttribute("value");
  const campos = { [actionId]: "", nome: "Race Teste", email, senha: "qa123456", perfilId, lojaIds: lojaId };
  const [r1, r2] = await Promise.all([
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
  ]);
  const loc1 = r1.headers()["location"] ?? "";
  const loc2 = r2.headers()["location"] ?? "";
  let corpo1 = "";
  if (r1.status() >= 400) corpo1 = (await r1.text()).slice(0, 200);
  if (r2.status() >= 400) corpo1 = (await r2.text()).slice(0, 200);
  const count = await contarEmail(page, email);
  const ok = count === 1;
  await record("BREAK-14", ok ? "PASS" : "FAIL", `corrida (${email}): ${r1.status()}→${loc1} | ${r2.status()}→${loc2}; criados=${count}${corpo1 ? " corpo4xx/5xx=" + corpo1 : ""}`);
  if (!ok) await shot(page, "breakit", `break-14-${email.replace(/\W/g, "_")}`);
  await ctx.close();
}

await b.close();
console.log("QA-11D concluído.");
