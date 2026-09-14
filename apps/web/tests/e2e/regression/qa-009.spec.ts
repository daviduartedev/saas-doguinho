// Regressão QA-009: ação de Loja NÃO pode estourar "Application error"
// (redirect()/AppError dentro do try era engolido pelo catch → fail() → 500).
// Com o teto de 3 Lojas, o formulário some; o domínio recusa a quarta.
import { expect, test } from "@playwright/test";
import { loginDono } from "../helpers";

test("QA-009: Configurações lista as 3 Lojas e não oferece criar outra", async ({ page }) => {
  await loginDono(page);
  await page.goto("/configuracoes");
  await expect(page.locator("body")).not.toContainText("Application error");
  await expect(page.getByRole("button", { name: "Criar Loja" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Nova Loja" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Lojas" })).toBeVisible();
  const lista = page.locator("ul.listing-frame");
  await expect(lista).toContainText("Centro");
  await expect(lista).toContainText("Jardim Juliana");
  await expect(lista).toContainText("Magalhães");
});
