// Regressão QA-010: tetos de tamanho enforced no SERVIDOR (maxLength do client
// é contornável por POST forjado / preenchimento programático).
import { expect, test } from "@playwright/test";
import { loginDono } from "../helpers";

test("QA-010: Configurações não oferece Nova Loja além das 3 da Organização", async ({ page }) => {
  await loginDono(page);
  await page.goto("/configuracoes");
  await expect(page.locator("form:has(input#nome)")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Nova Loja" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lojas" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});

test("QA-010: nome de Produto > 80 chars via UI é rejeitado com mensagem de domínio", async ({ page }) => {
  await loginDono(page);
  await page.goto("/produtos");
  await page.locator("input#nome").fill("P".repeat(81));
  await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
  await expect(page.locator("body")).toContainText("no máximo 80");
  await expect(page.locator("body")).not.toContainText("Application error");
});
