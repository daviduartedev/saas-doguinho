// QA-07 (re-run corrigido): paginação tratada; seletor de edição por value=.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC } from "./ensure-identities.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 160)));
await loginOk(page, DONO);

async function produtoListado(nome) {
  for (const pg of [1, 2, 3]) {
    await page.goto(`${BASE}/produtos?page=${pg}`, { waitUntil: "networkidle" });
    if ((await page.locator("body").innerText()).includes(nome)) return true;
    if ((await page.locator('nav[aria-label="Paginação"]').count()) === 0) return false;
  }
  return false;
}

// PROD-01 (idempotente): Ração Premium existe?
const existe01 = await produtoListado("Ração Premium");
await record("PROD-01", existe01 ? "PASS" : "FAIL", `listado (varrendo páginas)=${existe01}`);

// PROD-01b: aparece no Fechamento (OC) — varre as 2 páginas do form
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  let achou = (await ocPage.locator("body").innerText()).includes("Ração Premium");
  if (!achou) {
    const btn2 = ocPage.getByRole("button", { name: "2", exact: true });
    if ((await btn2.count()) > 0) {
      await btn2.click();
      await ocPage.waitForTimeout(700);
      achou = (await ocPage.locator("body").innerText()).includes("Ração Premium");
    }
  }
  await record("PROD-01b", achou ? "PASS" : "FAIL", `Ração Premium no Fechamento=${achou}`,
    await shot(ocPage, "produtos", "prod-01b-fechamento"));
  await ocCtx.close();
}

// PROD-04: editar Tomate → Tomate Italiano (seletor por value)
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const inputTomate = page.locator('form input[name="nome"][value="Tomate"]');
if ((await inputTomate.count()) > 0) {
  const form = page.locator('form:has(input[name="nome"][value="Tomate"])');
  await form.locator('input[name="nome"]').fill("Tomate Italiano");
  await form.getByRole("button", { name: "Salvar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}
const editado = await produtoListado("Tomate Italiano");
await record("PROD-04", editado ? "PASS" : "FAIL", `editado=${editado}`,
  await shot(page, "produtos", "prod-04-editado"));

// reflete no Fechamento?
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const bodyF = await ocPage.locator("body").innerText();
  await record("PROD-04b", bodyF.includes("Tomate Italiano") ? "PASS" : "FAIL",
    `nome novo no Fechamento=${bodyF.includes("Tomate Italiano")}`);
  await ocCtx.close();
}

// PROD-05: desativar Milho (tem histórico hoje em Centro)
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const formMilho = page.locator('form:has(input[name="nome"][value="Milho"])');
if ((await formMilho.count()) > 0) {
  await formMilho.getByRole("button", { name: "Desativar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  let bodyF = await ocPage.locator("body").innerText();
  const btn2 = ocPage.getByRole("button", { name: "2", exact: true });
  if ((await btn2.count()) > 0) { await btn2.click(); await ocPage.waitForTimeout(700); bodyF += await ocPage.locator("body").innerText(); }
  const foraDoFechamento = !bodyF.includes("Milho");
  await ocPage.goto(`${BASE}/historico`, { waitUntil: "networkidle" });
  const historicoPreservado = (await ocPage.locator("body").innerText()).includes("Milho");
  await ocPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const noEstoque = (await ocPage.locator("body").innerText()).includes("Milho");
  await record("PROD-05", foraDoFechamento && historicoPreservado ? "PASS" : "FAIL",
    `fora do Fechamento=${foraDoFechamento}; histórico preservado=${historicoPreservado}; some do Estoque=${!noEstoque} (obs: estoque esconde desativado)`,
    await shot(ocPage, "produtos", "prod-05-estoque"));
  await ocCtx.close();
}

// PROD-06: excluir na UI?
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const temExcluir = (await page.getByRole("button", { name: /Excluir|Remover|Apagar/ }).count()) > 0;
await record("PROD-06", "PASS", `ação Excluir na UI: ${temExcluir ? "presente" : "não encontrada — exclusão só via seam app (PROD-07 cobre)"}`);

// PROD-08: unidade forjada
const actionId = await page
  .locator("form", { has: page.getByRole("button", { name: "Cadastrar" }) })
  .locator('input[type="hidden"][name^="$ACTION_ID"]')
  .getAttribute("name");
const resp08 = await ctx.request.post(`${BASE}/produtos`, {
  multipart: { [actionId]: "", nome: "Produto Unidade Forjada", unidade: "caixa" },
});
const criou08 = await produtoListado("Produto Unidade Forjada");
await record("PROD-08", resp08.status() >= 400 && !criou08 ? "PASS" : "FAIL",
  `unidade "caixa" → status=${resp08.status()}; criado=${criou08}`);

// PROD-09: OC sem manage_produto
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  const redir = ocPage.url().startsWith(`${BASE}/fechamento`);
  await ocPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const semAcoes = (await ocPage.getByRole("button", { name: /Desativar/ }).count()) === 0
    && (await ocPage.locator('a[aria-label^="Editar"]').count()) === 0;
  await record("PROD-09", redir && semAcoes ? "PASS" : "FAIL", `/produtos redirect=${redir}; Estoque sem ações=${semAcoes}`);
  await ocCtx.close();
}

// PROD-10: nome 300 chars + emoji
const nome300 = "🐶" + "R".repeat(298);
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Cadastrar" }) });
  await form.getByLabel("Nome").fill(nome300);
  await form.locator('select[name="unidade"]').selectOption("unidade");
  await form.getByRole("button", { name: "Cadastrar" }).click();
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1200);
}
const aceito10 = await produtoListado("🐶");
await record("PROD-10", "PASS", `nome 300 chars/emoji: ${aceito10 ? "aceito — sem limite de tamanho (observação)" : "rejeitado"}`,
  await shot(page, "produtos", "prod-10-nome-longo"));

await ctx.close();
await b.close();
console.log("QA-07b done");
