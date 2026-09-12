// QA-11 BREAK-IT A: BREAK-01 double-click, BREAK-02 2 abas mesma Loja, BREAK-03 2 abas Lojas distintas,
// BREAK-04 refresh durante submit, BREAK-05 back + reenvio, BREAK-13 paginação rápida, BREAK-10 sessão expirada.
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const OC = { email: "operador.centro@doguinho.local", senha: "qa123456" };
const OM = { email: "operador.multi@doguinho.local", senha: "qa123456" };

async function preencherPaginaAtual(page, valor) {
  const inputs = await page.locator('input[aria-label^="Quantidade restante de"]').all();
  for (const i of inputs) await i.fill(valor);
  return inputs.length;
}

async function preencherTudo(page, valor) {
  let total = await preencherPaginaAtual(page, valor);
  for (const n of [2, 3]) {
    const btn = page.getByRole("button", { name: String(n), exact: true });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(150);
      total += await preencherPaginaAtual(page, valor);
    }
  }
  const b1 = page.getByRole("button", { name: "1", exact: true });
  if (await b1.count()) await b1.click();
  return total;
}

async function lojaId(page, nome) {
  await page.getByRole("combobox").click();
  await page.waitForTimeout(400);
  await page.getByRole("option", { name: nome, exact: true }).click();
  await page.waitForTimeout(1200);
  return new URL(page.url()).searchParams.get("loja");
}

async function historicoCount(page, id) {
  let total = 0;
  for (let p = 1; p <= 5; p++) {
    await page.goto(`${BASE}/historico?loja=${id}&page=${p}`, { waitUntil: "networkidle" });
    const n = await page.locator("ol > li").count();
    if (n === 0) break;
    total += n;
    if (n < 8) break;
  }
  return total;
}

async function estoqueCol(page, lojaNome) {
  await page.goto(`${BASE}/estoque?per=24`, { waitUntil: "networkidle" });
  return page.evaluate((alvo) => {
    const table = document.querySelector("table");
    if (!table) return null;
    const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const col = headers.indexOf(alvo);
    if (col < 0) return null;
    const out = {};
    for (const tr of table.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("th,td")].map((td) => td.textContent.trim());
      out[cells[0]] = cells[col] ?? "";
    }
    return out;
  }, lojaNome);
}

const b = await browser();

// IDs das Lojas, extraídos uma vez como Dono (switcher pode não renderizar para Operador com 1 Vínculo)
const IDS = {};
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  // ordem importa: onValueChange só dispara quando o valor MUDA (Centro já vem selecionado)
  for (const nome of ["Jardim Juliana", "Centro", "Magalhães"]) {
    IDS[nome] = await lojaId(page, nome);
  }
  await ctx.close();
}
console.log("Lojas:", JSON.stringify(IDS));

// ---------- BREAK-01: duplo clique no Enviar (Magalhães, fresh) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const magalhaes = IDS["Magalhães"];
  const antes = await historicoCount(page, magalhaes);
  await page.goto(`${BASE}/fechamento?loja=${magalhaes}`, { waitUntil: "networkidle" });
  const n = await preencherTudo(page, "1");
  await page.getByRole("button", { name: "Enviar fechamento" }).dblclick();
  await page.waitForTimeout(2500);
  const depois = await historicoCount(page, magalhaes);
  const ok = depois - antes === 1;
  await record("BREAK-01", ok ? "PASS" : "FAIL", `dblclick enviar: ${n} produtos, histórico ${antes}→${depois} (esperado +1)`);
  if (!ok) await shot(page, "breakit", "break-01");
  await ctx.close();
}

// ---------- BREAK-02: 2 abas, MESMA Loja (JJ), valores diferentes, simultâneo ----------
{
  const { ctx, page: tabA } = await newPage(b);
  await loginOk(tabA, OM);
  const jj = IDS["Jardim Juliana"];
  const antes = await historicoCount(tabA, jj);
  const tabB = await ctx.newPage();
  await tabA.goto(`${BASE}/fechamento?loja=${jj}`, { waitUntil: "networkidle" });
  await tabB.goto(`${BASE}/fechamento?loja=${jj}`, { waitUntil: "networkidle" });
  await preencherTudo(tabA, "1");
  await preencherTudo(tabB, "2");
  await Promise.all([
    tabA.getByRole("button", { name: "Enviar fechamento" }).click(),
    tabB.getByRole("button", { name: "Enviar fechamento" }).click(),
  ]);
  await tabA.waitForTimeout(3000);
  const depois = await historicoCount(tabA, jj);
  const errB = (await tabB.locator("p.text-ketchup").count()) ? await tabB.locator("p.text-ketchup").first().innerText() : "";
  const errA = (await tabA.locator("p.text-ketchup").count()) ? await tabA.locator("p.text-ketchup").first().innerText() : "";
  const ok = depois - antes === 1;
  await record("BREAK-02", ok ? "PASS" : "FAIL", `2 abas mesma Loja: histórico ${antes}→${depois} (esperado +1); erroA="${errA}" erroB="${errB}"`);
  if (!ok) { await shot(tabA, "breakit", "break-02a"); await shot(tabB, "breakit", "break-02b"); }
  await ctx.close();
}

// ---------- BREAK-03: 2 abas, Lojas distintas (Centro + Magalhães), simultâneo ----------
{
  const { ctx, page: tabA } = await newPage(b);
  await loginOk(tabA, DONO);
  const centro = IDS["Centro"];
  const magalhaes = IDS["Magalhães"];
  const centroAntes = await historicoCount(tabA, centro);
  const magAntes = await historicoCount(tabA, magalhaes);
  const tabB = await ctx.newPage();
  await tabA.goto(`${BASE}/fechamento?loja=${centro}`, { waitUntil: "networkidle" });
  await tabB.goto(`${BASE}/fechamento?loja=${magalhaes}`, { waitUntil: "networkidle" });
  await preencherTudo(tabA, "7");
  await tabA.getByLabel("Justificativa").fill("BREAK-03 Centro");
  await preencherTudo(tabB, "8");
  await tabB.getByLabel("Justificativa").fill("BREAK-03 Magalhães");
  await Promise.all([
    tabA.getByRole("button", { name: "Enviar correção" }).click(),
    tabB.getByRole("button", { name: "Enviar correção" }).click(),
  ]);
  await tabA.waitForTimeout(3000);
  const centroDepois = await historicoCount(tabA, centro);
  const magDepois = await historicoCount(tabA, magalhaes);
  const ok = centroDepois - centroAntes === 1 && magDepois - magAntes === 1;
  await record("BREAK-03", ok ? "PASS" : "FAIL", `2 abas Lojas distintas: Centro ${centroAntes}→${centroDepois}, Magalhães ${magAntes}→${magDepois} (esperado +1/+1)`);
  if (!ok) { await shot(tabA, "breakit", "break-03a"); await shot(tabB, "breakit", "break-03b"); }
  await ctx.close();
}

// ---------- BREAK-04: refresh durante submit ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const centro = IDS["Centro"];
  const antes = await historicoCount(page, centro);
  await page.goto(`${BASE}/fechamento?loja=${centro}`, { waitUntil: "networkidle" });
  await preencherTudo(page, "9");
  await page.getByLabel("Justificativa").fill("BREAK-04 refresh mid-submit");
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.reload({ waitUntil: "domcontentloaded" }); // refresh imediato, sem esperar o submit
  await page.waitForTimeout(2500);
  const depois = await historicoCount(page, centro);
  const est = await estoqueCol(page, "Centro");
  const valores = Object.values(est ?? {});
  const todos7 = valores.every((v) => v === "7");
  const todos9 = valores.every((v) => v === "9");
  const coerente = todos7 || todos9;
  await record("BREAK-04", coerente ? "PASS" : "FAIL", `refresh mid-submit: histórico ${antes}→${depois} (0 ou +1 ok); Estoque ${todos9 ? "9 (aplicou)" : todos7 ? "7 (não aplicou)" : "MISTO! " + JSON.stringify(est)}`);
  if (!coerente) await shot(page, "breakit", "break-04");
  await ctx.close();
}

// ---------- BREAK-05: voltar e reenviar ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const centro = IDS["Centro"];
  const antes = await historicoCount(page, centro);
  await page.goto(`${BASE}/fechamento?loja=${centro}`, { waitUntil: "networkidle" });
  await preencherTudo(page, "4");
  await page.getByLabel("Justificativa").fill("BREAK-05 primeiro envio");
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.waitForTimeout(2000);
  const meioCount = await historicoCount(page, centro);
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // reenvia o que estiver no formulário pós-back
  const btn = page.getByRole("button", { name: /Enviar (correção|fechamento)/ });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(2000);
  }
  const depois = await historicoCount(page, centro);
  const delta2 = depois - meioCount;
  const ok = meioCount - antes === 1 && (delta2 === 0 || delta2 === 1);
  await record("BREAK-05", ok ? "PASS" : "FAIL", `back+reenvio: ${antes}→${meioCount}→${depois}; reenvio ${delta2 === 0 ? "rejeitado/idempotente" : "criou 2ª correção (mesmos valores)"}`);
  if (!ok) await shot(page, "breakit", "break-05");
  await ctx.close();
}

// ---------- BREAK-13: paginação rápida + submit ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OC);
  await page.goto(`${BASE}/fechamento?loja=${IDS["Centro"]}`, { waitUntil: "networkidle" });
  await preencherPaginaAtual(page, "5");
  for (const seq of [2, 1, 2, 1]) {
    await page.getByRole("button", { name: String(seq), exact: true }).click();
    await page.waitForTimeout(60);
  }
  await preencherTudo(page, "5"); // garante todas as páginas = 5
  await page.getByLabel("Justificativa").fill("BREAK-13 paginação rápida");
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.waitForTimeout(2500);
  const est = await estoqueCol(page, "Centro");
  const valores = Object.entries(est ?? {}).filter(([, v]) => v !== "");
  const todos5 = valores.length > 0 && valores.every(([, v]) => v === "5");
  await record("BREAK-13", todos5 ? "PASS" : "FAIL", `paginação rápida + submit: Estoque ${todos5 ? "todo 5" : "divergente " + JSON.stringify(est)}`);
  if (!todos5) await shot(page, "breakit", "break-13");
  await ctx.close();
}

// ---------- BREAK-10: sessão expirada no meio do preenchimento ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OC);
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  await preencherPaginaAtual(page, "3");
  await ctx.clearCookies(); // simula expiração
  await page.getByLabel("Justificativa").fill("BREAK-10 sessão expirada");
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText();
  const msg = body.includes("Sessão expirada") || body.includes("expirada");
  const est = await estoqueCol(page, "Centro").catch(() => null);
  const intacto = est ? Object.values(est).every((v) => v === "5" || v === "") : null;
  await record("BREAK-10", msg ? "PASS" : "FAIL", `submit sem sessão: msg sessão expirada=${msg}; Estoque intacto=${intacto}`);
  if (!msg) await shot(page, "breakit", "break-10");
  await ctx.close();
}

await b.close();
console.log("QA-11A concluído.");
