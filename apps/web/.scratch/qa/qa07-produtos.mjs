// QA-07: Produtos — CRUD, duplicados, fronteiras, efeitos no Fechamento/Estoque.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC } from "./ensure-identities.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));

await loginOk(page, DONO);

async function crashOuMensagem() {
  // erro de action em página sem error boundary → dev overlay (nextjs-portal) ou página de erro
  await page.waitForTimeout(1200);
  const overlay = (await page.locator("nextjs-portal").count()) > 0;
  const body = await page.locator("body").innerText();
  return { overlay, body };
}
async function criarProduto(nome, unidade = "pacote") {
  await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  const form = page.locator("form", { has: page.getByRole("button", { name: "Cadastrar" }) });
  await form.getByLabel("Nome").fill(nome);
  await form.locator('select[name="unidade"]').selectOption(unidade);
  await form.getByRole("button", { name: "Cadastrar" }).click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}

// PROD-01: criar "Ração Premium"
await criarProduto("Ração Premium", "pacote");
const bodyPos01 = await page.locator("body").innerText();
const criado01 = bodyPos01.includes("Ração Premium");
await record("PROD-01", criado01 ? "PASS" : "FAIL", `criado e listado=${criado01}`,
  await shot(page, "produtos", "prod-01-criado"));

// aparece no próximo Fechamento (OC, Centro)
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const bodyF = await ocPage.locator("body").innerText();
  const noFechamento = bodyF.includes("Ração Premium");
  await record("PROD-01b", noFechamento ? "PASS" : "FAIL", `Ração Premium no Fechamento=${noFechamento}`);
  await ocCtx.close();
}

// PROD-02: duplicado normalizado (caixa/espaços)
pageErrors.length = 0;
await criarProduto("  ração   PREMIUM ", "pacote");
const { overlay: ov02, body: body02 } = await crashOuMensagem();
const conflito02 = pageErrors.some((e) => e.includes("Já existe um Produto")) || body02.includes("Já existe um Produto");
await record("PROD-02", conflito02 ? "PASS" : "FAIL",
  `conflito detectado=${conflito02}; entrega via ${ov02 ? "crash page/overlay (QA-004)" : "mensagem"}`,
  await shot(page, "produtos", "prod-02-duplicado"));

// PROD-03: nome vazio → validação HTML5 (sem POST)
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
let post03 = false;
page.on("request", (r) => { if (r.method() === "POST") post03 = true; });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Cadastrar" }) });
  await form.getByRole("button", { name: "Cadastrar" }).click();
  await page.waitForTimeout(1000);
}
await record("PROD-03", !post03 ? "PASS" : "FAIL", `nome vazio: POST bloqueado no cliente=${!post03}`);

// PROD-04: editar nome de produto seed (Tomate → Tomate Italiano)
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
{
  const linha = page.locator("form", { has: page.locator('input[name="id"]') }).filter({ hasText: "Tomate" }).first();
  await linha.locator('input[name="nome"]').fill("Tomate Italiano");
  await linha.getByRole("button", { name: "Salvar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}
const bodyPos04 = await page.locator("body").innerText();
await record("PROD-04", bodyPos04.includes("Tomate Italiano") ? "PASS" : "FAIL",
  `editado=${bodyPos04.includes("Tomate Italiano")}`, await shot(page, "produtos", "prod-04-editado"));

// PROD-05: desativar Milho (tem histórico hoje) → some do Fechamento, histórico preservado
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
{
  const linha = page.locator("form", { has: page.locator('input[name="id"]') }).filter({ hasText: "Milho" }).first();
  await linha.getByRole("button", { name: "Desativar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const bodyF = await ocPage.locator("body").innerText();
  const foraDoFechamento = !bodyF.includes("Milho");
  await ocPage.goto(`${BASE}/historico`, { waitUntil: "networkidle" });
  const bodyH = await ocPage.locator("body").innerText();
  const historicoPreservado = bodyH.includes("Milho");
  await ocPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const bodyE = await ocPage.locator("body").innerText();
  const noEstoque = bodyE.includes("Milho");
  await record("PROD-05", foraDoFechamento && historicoPreservado ? "PASS" : "FAIL",
    `fora do Fechamento=${foraDoFechamento}; histórico preservado=${historicoPreservado}; visível no Estoque=${noEstoque} (observação)`,
    await shot(ocPage, "produtos", "prod-05-estoque-sem-milho"));
  await ocCtx.close();
}

// PROD-06: excluir na UI?
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const temExcluir = (await page.getByRole("button", { name: /Excluir|Remover|Apagar/ }).count()) > 0;
await record("PROD-06", "PASS", `ação Excluir na UI: ${temExcluir ? "presente" : "não encontrada (conforme ticket, registrar)"}`);

// PROD-08: unidade fora da lista (POST forjado)
const actionId = await page
  .locator("form", { has: page.getByRole("button", { name: "Cadastrar" }) })
  .locator('input[type="hidden"][name^="$ACTION_ID"]')
  .getAttribute("name");
const resp08 = await ctx.request.post(`${BASE}/produtos`, {
  multipart: { [actionId]: "", nome: "Produto Unidade Forjada", unidade: "caixa" },
});
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const criou08 = (await page.locator("body").innerText()).includes("Produto Unidade Forjada");
await record("PROD-08", resp08.status() >= 400 && !criou08 ? "PASS" : "FAIL",
  `unidade "caixa" forjada → status=${resp08.status()}; criado=${criou08}`);

// PROD-09: OC sem manage_produto — /produtos redirect; /estoque sem coluna Ações
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  const redir = ocPage.url().startsWith(`${BASE}/fechamento`);
  await ocPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const bodyE = await ocPage.locator("body").innerText();
  const semAcoes = !bodyE.includes("Ações") && (await ocPage.getByRole("button", { name: /Desativar/ }).count()) === 0;
  await record("PROD-09", redir && semAcoes ? "PASS" : "FAIL", `/produtos redirect=${redir}; Estoque sem ações=${semAcoes}`);
  await ocCtx.close();
}

// PROD-10: nome 300 chars + emoji
const nome300 = "🐶" + "R".repeat(298);
await criarProduto(nome300, "unidade");
const bodyPos10 = await page.locator("body").innerText();
const aceito10 = bodyPos10.includes("🐶");
await record("PROD-10", "PASS", `nome 300 chars/emoji: ${aceito10 ? "aceito (sem limite de tamanho — observação)" : "rejeitado"}`,
  await shot(page, "produtos", "prod-10-nome-longo"));

await ctx.close();
await b.close();
console.log("QA-07 browser done");
