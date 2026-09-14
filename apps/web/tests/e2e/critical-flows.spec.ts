// Fluxos críticos de negócio: Fechamento → Estoque → Histórico, Correção com
// Justificativa, e Rascunho persistente. A Organização tem as 3 Lojas de seed;
// a suíte reutiliza Centro / Jardim Juliana / Magalhães (Fechamento é 1×/dia/Loja).
import { expect, test } from "@playwright/test";
import {
  OPERADOR_CENTRO,
  OPERADOR_JULIANA,
  OPERADOR_MAGALHAES,
  enviarRestante,
  loginOperador,
  preencherQuantidades,
} from "./helpers";

test.describe("Fluxos críticos", () => {
  test("Fechamento completo vira Estoque e entra no Histórico", async ({ page }) => {
    await loginOperador(page, OPERADOR_CENTRO);
    await enviarRestante(page, "5");

    await page.goto("/estoque");
    await expect(page.locator("body")).toContainText("5");

    await page.goto("/historico");
    await expect(page.getByRole("heading", { name: /Histórico/ })).toBeVisible();
    await expect(page.getByText(/Fechamento ·|Correção ·/).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Diferença" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Δ" })).toHaveCount(0);
  });

  test("Correção no mesmo dia exige Justificativa e registra no Histórico", async ({ page }) => {
    await loginOperador(page, OPERADOR_JULIANA);
    await enviarRestante(page, "5");
    await page.reload();

    await preencherQuantidades(page, "7");
    const just = page.getByLabel(/Justificativa/i);
    await expect(just).toBeVisible();
    await just.fill("");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    await expect(page.locator("body")).toContainText("Correção exige Justificativa");

    await just.fill("Contagem refeita após conferência física.");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");

    await page.goto("/historico");
    await expect(page.getByRole("heading", { name: /Histórico/ })).toBeVisible();
    await expect(page.getByText(/Correção ·/).first()).toBeVisible();
    await expect(page.getByText("Contagem refeita após conferência física.").first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Diferença" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Δ" })).toHaveCount(0);
  });

  test("Rascunho guardado sobrevive a reload", async ({ page }) => {
    await loginOperador(page, OPERADOR_MAGALHAES);
    const primeiro = page.locator('input[aria-label^="Quantidade restante de"]').first();
    await primeiro.fill("42");
    await page.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page.locator("p.text-ketchup")).toHaveCount(0);

    await page.reload();
    await expect(page.locator('input[aria-label^="Quantidade restante de"]').first()).toHaveValue("42");
  });
});
