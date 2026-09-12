// Regressão QA-003: quem não tem submit_fechamento/submit_correcao não pode ver
// botões de ação nem editar quantidades no /fechamento (visão somente-leitura).
import { expect, test } from "@playwright/test";

test("QA-003: /fechamento sem permissão submit_* não mostra ações nem permite editar", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail", { exact: true }).fill("restrito@doguinho.local");
  await page.getByLabel("Senha", { exact: true }).fill("qa123456");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");

  // bug: botões renderizavam e o auto-save disparava ações rejeitadas no servidor
  await expect(page.getByRole("button", { name: /Enviar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Guardar rascunho" })).toHaveCount(0);
  const primeiro = page.locator('input[aria-label^="Quantidade restante de"]').first();
  await expect(primeiro).toBeDisabled();
});
