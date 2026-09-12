// QA-09: Dashboard e Estoque. Estado de controle: Centro enviou hoje (V1 + correção Milho 10→15);
// JJ e Magalhães nunca fecharam. Milho desativado. 10 produtos ativos.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { ensureIdentities, OC, RR } from "./ensure-identities.mjs";

const b = await browser();
await ensureIdentities(b);

// ---------- DASH-01 (Dono): KPIs + série ilustrativa ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const ilustrativo = body.includes("Série ilustrativa");
  // KPIs: pega os valores dos cards
  const cards = await page.locator("section .grid, section").first().innerText().catch(() => "");
  // esperado real: 1 dia com movimento; entradas reais = 5 (Milho 10→15); ilustrativo mostra stub
  await record("DASH-01", "SUSPICIOUS",
    `ilustrativo=${ilustrativo} → KPIs Entradas/Saídas/Líquido calculados da série STUB, não dos dados reais (real: Entradas=5, Saídas=0). Disclaimer pequeno presente. Sem lista "sem Fechamento hoje" nem "recentes" no painel.`,
    await shot(page, "dashboard", "dash-01-dono"));

  // DASH-04: recortes 7/14/30
  let ok04 = true;
  for (const label of ["7 dias", "14 dias", "30 dias"]) {
    await page.getByRole("button", { name: label }).click();
    await page.waitForTimeout(600);
    if (!(await page.locator("body").innerText()).includes(`recorte de ${label}`)) ok04 = false;
  }
  await record("DASH-04", ok04 ? "PASS" : "FAIL", `recortes respondem sem erro=${ok04}`,
    await shot(page, "dashboard", "dash-04-recortes"));
  await ctx.close();
}

// ---------- DASH-02 (variante): perfil Gerente (dashboard) com Vínculo só Centro ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  // cria Perfil Gerente se não existir
  await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
  if (!(await page.locator("body").innerText()).includes("Gerente")) {
    await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
    await form.getByLabel("Nome").fill("Gerente");
    for (const p of ["read_estoque", "read_history", "dashboard"]) {
      await form.locator(`input[name="perm_${p}"]`).setChecked(true, { force: true });
    }
    await form.getByRole("button", { name: "Criar Perfil" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
  }
  // cria gerente.centro se não existir
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  if (!(await page.locator("body").innerText()).includes("gerente.centro@doguinho.local")) {
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
    await form.getByLabel("Nome", { exact: true }).fill("Gerente Centro");
    await form.getByLabel("E-mail", { exact: true }).fill("gerente.centro@doguinho.local");
    await form.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
    await form.locator('select[name="perfilId"]').selectOption({ label: "Gerente" });
    await form.getByLabel("Centro", { exact: true }).check();
    await form.getByRole("button", { name: "Criar usuário" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
  }
  await ctx.close();

  const { ctx: gCtx, page: gPage } = await newPage(b);
  await loginOk(gPage, { email: "gerente.centro@doguinho.local", senha: "qa123456" });
  await gPage.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const bodyG = await gPage.locator("body").innerText();
  const soCentro = !bodyG.includes("Jardim Juliana") && !bodyG.includes("Magalhães");
  await record("DASH-02", soCentro ? "PASS" : "FAIL",
    `Gerente(Centro): sem outras Lojas no dashboard=${soCentro}. Nota: OC (Perfil Operador) NÃO tem permissão dashboard → redirect (verificado em AUTHZ).`,
    await shot(gPage, "dashboard", "dash-02-gerente-centro"));
  await gCtx.close();
}

// ---------- DASH-03 (R): dashboard negado ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, RR);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await record("DASH-03", page.url().startsWith(`${BASE}/fechamento`) ? "PASS" : "FAIL", `R em /dashboard → ${page.url()}`);
  await ctx.close();
}

// ---------- ESTQ-01/02/03 (Dono) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  // Centro tem valores; JJ/Magalhães vazios. Linha Salsicha: 33 em Centro.
  const linhaSalsicha = await page.locator("tr", { hasText: "Salsicha" }).first().innerText();
  const celulas = linhaSalsicha.split(/\t|\n/).map((s) => s.trim()).filter(Boolean);
  const centroOk = celulas.includes("33");
  await record("ESTQ-01", centroOk ? "PASS" : "FAIL",
    `Salsicha row = ${JSON.stringify(celulas)} (Centro=33; demais vazias)`,
    await shot(page, "estoque", "estq-01-matriz"));

  // ESTQ-02: busca
  await page.goto(`${BASE}/estoque?q=TOMATE`, { waitUntil: "networkidle" });
  const bodyQ = await page.locator("body").innerText();
  const buscaOk = bodyQ.includes("Tomate Italiano") && bodyQ.includes("Molho de tomate") && !bodyQ.includes("Salsicha");
  await page.goto(`${BASE}/estoque?q=xyz`, { waitUntil: "networkidle" });
  const bodyX = await page.locator("body").innerText();
  const vazioOk = !bodyX.includes("Salsicha") && !bodyX.includes("Tomate");
  await record("ESTQ-02", buscaOk && vazioOk ? "PASS" : "FAIL",
    `q=TOMATE (caixa) → 2 resultados=${buscaOk}; q=xyz → vazio=${vazioOk}`,
    await shot(page, "estoque", "estq-02-busca"));

  // ESTQ-03: paginação 8/16/24
  const notas = [];
  let ok03 = true;
  await page.goto(`${BASE}/estoque?per=8`, { waitUntil: "networkidle" });
  const p8 = await page.locator('nav[aria-label="Paginação"]').innerText();
  if (!p8.includes("1 a 8 de 10")) { ok03 = false; notas.push(`per=8: "${p8.split("\n")[0]}"`); }
  await page.goto(`${BASE}/estoque?per=16`, { waitUntil: "networkidle" });
  const body16 = await page.locator("body").innerText();
  if (!body16.includes("1 a 10 de 10")) { ok03 = false; notas.push("per=16 não mostrou 1 a 10 de 10"); }
  await record("ESTQ-03", ok03 ? "PASS" : "FAIL", notas.join("; ") || "per=8 → '1 a 8 de 10' + 2 páginas; per=16 → '1 a 10 de 10'",
    await shot(page, "estoque", "estq-03-paginacao"));
  await ctx.close();
}

// ---------- ESTQ-04 (OC): só Centro ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OC);
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const soCentro = body.includes("Centro") && !body.includes("Jardim Juliana") && !body.includes("Magalhães");
  await record("ESTQ-04", soCentro ? "PASS" : "FAIL", `OC Estoque só Centro=${soCentro}`,
    await shot(page, "estoque", "estq-04-oc"));
  await ctx.close();
}

await b.close();
console.log("QA-09 done");
