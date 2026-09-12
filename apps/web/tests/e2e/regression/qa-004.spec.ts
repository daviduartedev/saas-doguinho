// Regressão QA-004: erros de validação/permissão em páginas de gestão NÃO podem
// virar a página branca "Application error" — a mensagem de domínio deve aparecer.
// (roda contra dev server: em dev, error.message chega ao error boundary)
import { expect, test } from "@playwright/test";

test("QA-004: produto duplicado mostra a mensagem de domínio, não 'Application error'", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("dono@doguinho.local");
  await page.getByLabel("Senha", { exact: true }).fill("coruja");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");

  await page.goto("/produtos");
  await page.locator("input#nome").fill("Milho"); // já existe no seed
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();

  // bug: ConflictError sem error boundary → "Application error" e a mensagem nunca aparece
  await expect(page.locator("body")).toContainText("Já existe um Produto com esse nome");
  await expect(page.locator("body")).not.toContainText("Application error");
});
