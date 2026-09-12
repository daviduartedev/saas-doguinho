// Fluxos críticos de negócio: Fechamento → Estoque → Histórico, Correção com
// Justificativa, e Rascunho persistente. Cada teste cria sua própria Loja
// (Fechamento é 1×/dia/Loja) — a suíte é idempotente entre re-runs.
import { expect, test } from "@playwright/test";
import { criarLoja, loginDono, preencherQuantidades, selecionarLoja } from "./helpers";

test.describe("Fluxos críticos", () => {
  test("Fechamento completo vira Estoque e entra no Histórico", async ({ page }) => {
    await loginDono(page);
    const nome = `E2E Fechamento ${Date.now()}`;
    await criarLoja(page, nome);
    const lojaId = await selecionarLoja(page, nome);

    await page.goto(`/fechamento?loja=${lojaId}`);
    await preencherQuantidades(page, "5");
    await page.getByRole("button", { name: "Enviar fechamento" }).click();
    await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");

    await page.goto(`/estoque?loja=${lojaId}`);
    await expect(page.locator("body")).toContainText("5");

    await page.goto(`/historico?loja=${lojaId}`);
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("Correção no mesmo dia exige Justificativa e registra no Histórico", async ({ page }) => {
    await loginDono(page);
    const nome = `E2E Correcao ${Date.now()}`;
    await criarLoja(page, nome);
    const lojaId = await selecionarLoja(page, nome);

    await page.goto(`/fechamento?loja=${lojaId}`);
    await preencherQuantidades(page, "5");
    await page.getByRole("button", { name: "Enviar fechamento" }).click();
    await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");

    // segunda submissão no dia = Correção
    await page.goto(`/fechamento?loja=${lojaId}`);
    await preencherQuantidades(page, "7");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    // sem Justificativa → rejeitado
    await expect(page.locator("body")).toContainText("Correção exige Justificativa");

    await page.getByLabel(/Justificativa/i).fill("Contagem refeita após conferência física.");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");

    await page.goto(`/historico?loja=${lojaId}`);
    await expect(page.locator("ol li")).toHaveCount(2);
  });

  test("Rascunho guardado sobrevive a reload", async ({ page }) => {
    await loginDono(page);
    const nome = `E2E Rascunho ${Date.now()}`;
    await criarLoja(page, nome);
    const lojaId = await selecionarLoja(page, nome);

    await page.goto(`/fechamento?loja=${lojaId}`);
    const primeiro = page.locator('input[aria-label^="Quantidade restante de"]').first();
    await primeiro.fill("42");
    await page.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page.locator("p.text-ketchup")).toHaveCount(0);

    await page.reload();
    await expect(page.locator('input[aria-label^="Quantidade restante de"]').first()).toHaveValue("42");
  });
});
