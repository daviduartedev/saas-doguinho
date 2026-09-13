// #39: Fechamento do Dono é relatório do dia, sem envio nem banner de Correção.
import { expect, test } from "@playwright/test";
import { OPERADOR_CENTRO, enviarRestante, login, loginDono, logout } from "./helpers";

test.describe("Fechamento do Dono", () => {
  test("Dono em /fechamento não vê Enviar, Justificativa nem o banner de Correção", async ({
    page,
  }) => {
    await loginDono(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("heading", { name: /Fechamento/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Guardar rascunho" })).toHaveCount(0);
    await expect(page.getByLabel(/Justificativa/i)).toHaveCount(0);
    await expect(page.locator('input[aria-label^="Quantidade restante de"]')).toHaveCount(0);
    await expect(page.getByText("Já houve Fechamento hoje")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("Nunca fechou");
    await expect(page.locator("body")).not.toContainText("próximo envio é Correção");
  });

  test("Dono lê no relatório os números do último envio de hoje", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    await enviarRestante(page, "13");
    await logout(page);

    await loginDono(page);
    await page.goto("/fechamento");

    await expect(page.getByRole("heading", { name: "Fechamento · Centro" })).toBeVisible();
    await expect(page.locator('input[aria-label^="Quantidade restante de"]')).toHaveCount(0);
    await expect(page.locator('[aria-label^="Quantidade restante de"]').first()).toHaveText("13");
  });

  test("Dono continua gerindo Produtos, Usuários e Perfis", async ({ page }) => {
    await loginDono(page);
    await page.goto("/produtos");
    await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
    await page.goto("/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários" })).toBeVisible();
    await page.goto("/perfis");
    await expect(page.getByRole("heading", { name: "Perfis" })).toBeVisible();
  });
});
