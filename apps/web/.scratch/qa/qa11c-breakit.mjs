// QA-11 BREAK-IT C: BREAK-08 justificativa 10k, BREAK-12 nome de produto desativado, BREAK-09 nomes emoji/RTL/10k,
// BREAK-14 corrida de criação de usuário com mesmo e-mail. Também registra o veredito corrigido de BREAK-10.
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const CENTRO = "fc2a079d3328b276610e59cc610616b5";

async function preencherTudo(page, valor) {
  for (const n of [1, 2, 3]) {
    const btn = page.getByRole("button", { name: String(n), exact: true });
    if (n > 1) {
      if (!(await btn.count())) break;
      await btn.click();
      await page.waitForTimeout(150);
    }
    const inputs = await page.locator('input[aria-label^="Quantidade restante de"]').all();
    for (const i of inputs) await i.fill(valor);
  }
  const b1 = page.getByRole("button", { name: "1", exact: true });
  if (await b1.count()) await b1.click();
}

async function historicoCount(page, id) {
  let total = 0;
  for (let p = 1; p <= 6; p++) {
    await page.goto(`${BASE}/historico?loja=${id}&page=${p}`, { waitUntil: "networkidle" });
    const n = await page.locator("ol > li").count();
    if (n === 0) break;
    total += n;
    if (n < 8) break;
  }
  return total;
}

const b = await browser();

// (BREAK-10 corrigido e BREAK-08 já registrados na execução anterior — pulando)
if (false) {
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const antes = await historicoCount(page, CENTRO);
  await page.goto(`${BASE}/fechamento?loja=${CENTRO}`, { waitUntil: "networkidle" });
  await preencherTudo(page, "6");
  await page.getByLabel("Justificativa").fill("x".repeat(10000));
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.waitForTimeout(3000);
  const depois = await historicoCount(page, CENTRO);
  const aceitou = depois - antes === 1;
  await shot(page, "breakit", "break-08");
  await record("BREAK-08", "PASS", `justificativa 10k chars: ${aceitou ? "aceita e registrada (sem limite de tamanho — observação)" : "rejeitada"}; histórico ${antes}→${depois}`, "breakit/break-08.png");
  await ctx.close();
}

// ---------- BREAK-12: criar → desativar → criar mesmo nome ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  // "Ciclo QA" já foi criado na execução anterior (está na página 2) — reutiliza
  let linha = null;
  let criou1 = false;
  for (let p = 1; p <= 4; p++) {
    await page.goto(`${BASE}/produtos?page=${p}`, { waitUntil: "networkidle" });
    const cand = page.locator("form", { has: page.locator('input[name="nome"][value="Ciclo QA"]') });
    if (await cand.count()) { linha = cand; criou1 = true; break; }
  }
  // 2) desativa (botão Desativar dentro do form da linha) — idempotente se já desativado
  if ((await linha.getByRole("button", { name: "Desativar" }).count()) > 0) {
    await linha.getByRole("button", { name: "Desativar" }).click();
    await page.waitForLoadState("networkidle");
  }
  // 3) tenta criar de novo (mesmo nome)
  await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  await page.locator("input#nome").fill("Ciclo QA");
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText();
  const conflito = body.includes("Já existe um Produto com esse nome");
  const crash = body.includes("Application error") || body.includes("digest");
  await shot(page, "breakit", "break-12");
  await record("BREAK-12", criou1 && conflito ? "FAIL" : "PASS", `nome de produto desativado: criou=${criou1}; recriar → conflito=${conflito} (via crash=${crash}); SEM caminho de reativação → nome queimado para sempre`, "breakit/break-12.png");
  await ctx.close();
}

// ---------- BREAK-09: nomes emoji / RTL / 10k em Loja ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  const form = page.locator("form", { has: page.locator("input#nome") });
  // emoji + acentos (<=80 chars, passa no maxLength do client)
  await form.locator("input#nome").fill("🏪 Loja Émoji — Çãõ");
  await form.getByRole("button", { name: "Criar Loja" }).click();
  await page.waitForLoadState("networkidle");
  const emojiOk = (await page.locator("body").innerText()).includes("🏪 Loja Émoji — Çãõ");
  // RTL
  await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
  await form.locator("input#nome").fill("متجر العربية");
  await form.getByRole("button", { name: "Criar Loja" }).click();
  await page.waitForLoadState("networkidle");
  const rtlOk = (await page.locator("body").innerText()).includes("متجر العربية");
  // 10k chars via POST forçado (bypass do maxLength=80 client-side)
  const html = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
  const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
  let aceitou10k = null;
  if (actionId) {
    const resp = await ctx.request.post(`${BASE}/configuracoes`, {
      multipart: { [actionId]: "", nome: "L".repeat(10000) },
      maxRedirects: 0,
    });
    aceitou10k = resp.status() < 500;
    const depois = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
    aceitou10k = depois.includes("L".repeat(200)); // nome gigante renderizado?
  }
  await shot(page, "breakit", "break-09");
  await record("BREAK-09", emojiOk && rtlOk ? "PASS" : "FAIL", `emoji=${emojiOk}, RTL=${rtlOk}, 10k via POST forçado: ${aceitou10k === null ? "actionId não extraído" : aceitou10k ? "ACEITO (sem limite server-side — observação)" : "rejeitado"}`, "breakit/break-09.png");
  await ctx.close();
}

// ---------- BREAK-14: corrida — 2 POSTs simultâneos criando usuário com MESMO e-mail ----------
for (const email of ["race@doguinho.local", "race2@doguinho.local"]) {
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const html = await page.content();
  const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
  const perfilId = await page.locator('select[name="perfilId"] option').nth(1).getAttribute("value");
  const lojaId = await page.locator('input[name="lojaIds"]').first().getAttribute("value");
  const campos = { [actionId]: "", nome: "Race Teste", email, senha: "qa123456", perfilId, lojaIds: lojaId };
  const [r1, r2] = await Promise.all([
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
    ctx.request.post(`${BASE}/usuarios`, { multipart: campos, maxRedirects: 0 }),
  ]);
  await page.waitForTimeout(1500);
  // conta usuários com esse e-mail varrendo a paginação
  let count = 0;
  for (let p = 1; p <= 4; p++) {
    await page.goto(`${BASE}/usuarios?page=${p}`, { waitUntil: "networkidle" });
    const n = await page.locator(`text=${email}`).count();
    if (n === 0) break;
    count += n;
  }
  await record("BREAK-14", count === 1 ? "PASS" : "FAIL", `corrida mesmo e-mail (${email}): status ${r1.status()}/${r2.status()}; usuários criados com esse e-mail: ${count} (esperado 1)`);
  if (count !== 1) await shot(page, "breakit", `break-14-${email.replace(/\W/g, "_")}`);
  await ctx.close();
}

await b.close();
console.log("QA-11C concluído.");
