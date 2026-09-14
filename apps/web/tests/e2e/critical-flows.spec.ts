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
    await expect(page.locator("body")).toContainText("Correção enviada. O registro anterior permanece.");

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
    const rotulo = await primeiro.getAttribute("aria-label");
    if (!rotulo) throw new Error("input de quantidade sem aria-label");
    await primeiro.fill("42");
    await expect(primeiro).toHaveValue("42");
    const guardar = page.getByRole("button", { name: "Guardar rascunho" });
    const salvo = page.waitForResponse(
      (res) => res.request().method() === "POST" && Boolean(res.request().headers()["next-action"]),
    );
    await guardar.click();
    await salvo;
    await expect(guardar).toBeEnabled();
    await expect(page.getByText("Não foi possível guardar o Rascunho")).toHaveCount(0);

    await page.reload();
    await expect(page.getByLabel(rotulo)).toHaveValue("42");
    await expect(page.getByText("Rascunho na Loja. Ainda não é Estoque.")).toBeVisible();
  });
});
