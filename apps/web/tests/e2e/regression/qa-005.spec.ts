// Regressão QA-005: falha de rede no envio do Fechamento NÃO pode ser silenciosa.
import { expect, test } from "@playwright/test";

test("QA-005: submit offline mostra mensagem de erro (não falha em silêncio)", async ({ page, context }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("dono@doguinho.local");
  await page.getByLabel("Senha", { exact: true }).fill("coruja");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");

  await page.locator('input[aria-label^="Quantidade restante de"]').first().fill("3");
  await context.setOffline(true); // corta a rede antes do envio

  await page.getByRole("button", { name: /Enviar (fechamento|correção)/ }).click();

  // bug: "Failed to fetch" sem catch → nenhuma mensagem para o usuário
  await expect(page.locator("p.text-ketchup").first()).toBeVisible();

  await context.setOffline(false);
});
