// Fluxos críticos de negócio: Fechamento → Estoque → Histórico, Correção com
// Justificativa, e Rascunho persistente. A Organização tem as 3 Lojas de seed;
// a suíte reutiliza Centro / Jardim Juliana / Magalhães (Fechamento é 1×/dia/Loja).
import { expect, test } from "@playwright/test";
import { enviarRestante, loginDono, preencherQuantidades, selecionarLoja } from "./helpers";

test.describe("Fluxos críticos", () => {
  test("Fechamento completo vira Estoque e entra no Histórico", async ({ page }) => {
    await loginDono(page);
    const lojaId = await selecionarLoja(page, "Centro");

    await page.goto(`/fechamento?loja=${lojaId}`);
    await enviarRestante(page, "5");

    await page.goto(`/estoque?loja=${lojaId}`);
    await expect(page.locator("body")).toContainText("5");

    await page.goto(`/historico?loja=${lojaId}`);
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("Correção no mesmo dia exige Justificativa e registra no Histórico", async ({ page }) => {
    await loginDono(page);
    const lojaId = await selecionarLoja(page, "Jardim Juliana");

    await page.goto(`/fechamento?loja=${lojaId}`);
    const correcao = page.getByRole("button", { name: "Enviar correção" });
    if (!(await correcao.count())) {
      await preencherQuantidades(page, "5");
      await page.getByRole("button", { name: "Enviar fechamento" }).click();
      await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");
      await page.goto(`/fechamento?loja=${lojaId}`);
    }

    await preencherQuantidades(page, "7");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    await expect(page.locator("body")).toContainText("Correção exige Justificativa");

    await page.getByLabel(/Justificativa/i).fill("Contagem refeita após conferência física.");
    await page.getByRole("button", { name: "Enviar correção" }).click();
    await expect(page.locator("body")).toContainText("Enviado. Isso é o Estoque agora.");

    await page.goto(`/historico?loja=${lojaId}`);
    await expect(page.locator("ol li").nth(1)).toBeVisible();
  });

  test("Rascunho guardado sobrevive a reload", async ({ page }) => {
    await loginDono(page);
    const lojaId = await selecionarLoja(page, "Magalhães");

    await page.goto(`/fechamento?loja=${lojaId}`);
    const primeiro = page.locator('input[aria-label^="Quantidade restante de"]').first();
    await primeiro.fill("42");
    await page.getByRole("button", { name: "Guardar rascunho" }).click();
    await expect(page.locator("p.text-ketchup")).toHaveCount(0);

    await page.reload();
    await expect(page.locator('input[aria-label^="Quantidade restante de"]').first()).toHaveValue("42");
  });
});
