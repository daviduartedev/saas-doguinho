// Regressão QA-009: criar Loja com sucesso NÃO pode estourar "Application error"
// (redirect() dentro do try era engolido pelo catch → fail() → 500).
import { expect, test } from "@playwright/test";
import { loginDono } from "../helpers";

test("QA-009: criar Loja redireciona limpo e a Loja aparece na lista", async ({ page }) => {
  await loginDono(page);
  const nome = `QA009 ${Date.now()}`;
  await page.goto("/configuracoes");
  await page.locator("input#nome").fill(nome);
  await page.getByRole("button", { name: "Criar Loja" }).click();
  // bug: toda criação bem-sucedida caía em "Application error" (NEXT_REDIRECT engolido)
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.locator("ul.listing-frame")).toContainText(nome);
});
