// #40: lista de Produtos mostra Excluir; sem histórico o Produto some do catálogo.
import { expect, test, type Page } from "@playwright/test";
import { loginDono } from "./helpers";

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

test("lista de Produtos tem Excluir e some o Produto sem histórico", async ({ page }) => {
  await loginDono(page);
  await page.goto("/produtos");
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();

  const catalogo = page.locator("form.listing-row-produtos").first();
  await expect(catalogo.getByRole("button", { name: "Desativar" })).toBeVisible();
  await expect(catalogo.getByRole("button", { name: "Excluir" })).toBeVisible();

  const nome = `Excluir QA ${Date.now()}`;
  await page.locator("input#nome").fill(nome);
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await page.waitForLoadState("networkidle");
  const linha = await linhaProduto(page, nome);
  await expect(linha.getByRole("button", { name: "Excluir" })).toBeVisible();
  await linha.getByRole("button", { name: "Excluir" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/produtos");
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
  const pag = page.getByRole("navigation", { name: "Paginação" });
  const paginas = new Set<number>([1]);
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
    await expect(page.locator(`form:has(input[value="${nome}"])`)).toHaveCount(0);
  }
});
