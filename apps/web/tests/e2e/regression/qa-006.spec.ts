// Regressão QA-006: sessão expirada no meio do preenchimento → enviar NÃO pode
// quebrar a página em silêncio; o usuário precisa ver uma mensagem.
import { expect, test } from "@playwright/test";

test("QA-006: submit com sessão expirada mostra mensagem (não 'Application error')", async ({ page, context }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("operador.centro@doguinho.local");
  await page.getByLabel("Senha", { exact: true }).fill("coruja");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");

  await page.locator('input[aria-label^="Quantidade restante de"]').first().fill("3");
  await context.clearCookies(); // simula expiração da sessão no meio do preenchimento

  await page.getByRole("button", { name: /Enviar (fechamento|correção)/ }).click();

  // bug: promise rejeitada sem catch → "Application error" sem mensagem de domínio
  await expect(page.locator("p.text-ketchup").first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
});
