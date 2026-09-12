// Regressão QA-007: desativar um Produto não queima o nome para sempre —
// é possível cadastrar outro Produto com o mesmo nome (histórico preservado).
import { expect, test, type Page } from "@playwright/test";
import { loginDono } from "../helpers";

/** /produtos é paginado (8/pág.) e o item novo cai na última página — varre todas,
 *  com polling: a action de criar pode ainda estar em voo quando começamos. */
async function linhaProduto(page: Page, nome: string) {
  const linha = page.locator(`form:has(input[value="${nome}"])`).first();
  try {
    await expect(async () => {
      for (let p = 1; p <= 20; p++) {
        await page.goto(`/produtos?page=${p}`);
        if (await linha.count()) return;
        const temProxima = await page
          .getByRole("navigation", { name: "Paginação" })
          .getByRole("button", { name: String(p + 1), exact: true })
          .count();
        if (!temProxima) break;
      }
      throw new Error(`produto ainda não apareceu em /produtos: ${nome}`);
    }).toPass({ timeout: 15_000 });
  } catch (e) {
    const body = (await page.locator("body").innerText()).slice(0, 600);
    console.log(`[qa-007] url=${page.url()} body=${JSON.stringify(body)}`);
    throw e;
  }
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
