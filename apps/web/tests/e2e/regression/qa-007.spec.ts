// Regressão QA-007: desativar um Produto não queima o nome para sempre —
// é possível cadastrar outro Produto com o mesmo nome (histórico preservado).
import { expect, test, type Page } from "@playwright/test";
import { loginDono } from "../helpers";

/** /produtos é paginado (8/pág.). Memory store lista por inserção; Postgres
 *  ordena por nome — o item novo não cai necessariamente na última página. */
async function linhaProduto(page: Page, nome: string) {
  const linha = page.locator(`form:has(input[value="${nome}"])`).first();
  await expect(async () => {
    await page.goto("/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    const paginas = new Set<number>([1]);
    const pag = page.getByRole("navigation", { name: "Paginação" });
    if (await pag.count()) {
      for (const texto of await pag.getByRole("button").allInnerTexts()) {
        const n = Number.parseInt(texto, 10);
        if (!Number.isNaN(n)) paginas.add(n);
      }
    }
    for (const n of [...paginas].sort((a, b) => a - b)) {
      if (n !== 1) {
        await page.goto(`/produtos?page=${n}`);
        await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
      }
      if ((await linha.count()) > 0) return;
    }
    throw new Error(`produto ainda não apareceu: ${nome}`);
  }).toPass({ timeout: 20_000 });
  return linha;
}

test("QA-007: recriar Produto com nome de um desativado funciona", async ({ page }) => {
  await loginDono(page);
  const nome = `QA007 ${Date.now()}`;

  await page.goto("/produtos");
  await page.locator("input#nome").fill(nome);
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await page.waitForLoadState("networkidle"); // deixa a action terminar antes de navegar
  const linha = await linhaProduto(page, nome);
  await expect(linha).toBeVisible();

  await linha.getByRole("button", { name: "Desativar" }).click();
  await page.waitForLoadState("networkidle");

  // bug: findProdutoByName casava com inativo → ConflictError permanente
  await page.goto("/produtos");
  await page.locator("input#nome").fill(nome);
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toContainText("Já existe um Produto com esse nome");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(await linhaProduto(page, nome)).toBeVisible();
});
