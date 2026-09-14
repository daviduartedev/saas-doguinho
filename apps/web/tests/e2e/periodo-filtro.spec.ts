import { expect, test } from "@playwright/test";
import { loginDono } from "./helpers";

test.describe("Filtro de período", () => {
  test("Personalizado abre o calendário do sistema, não o datepicker nativo", async ({ page }) => {
    await loginDono(page);
    await page.goto("/historico");

    await page.getByRole("button", { name: "Personalizado" }).click();
    await expect(page.getByText("Não deu para concluir")).toHaveCount(0);
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await expect(page.getByLabel("De")).toBeVisible();
    await expect(page.getByLabel("Até")).toBeVisible();

    await page.getByRole("button", { name: "De", exact: true }).click();
    await expect(page.getByText("Não deu para concluir")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "De" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "De" }).getByRole("button", { name: "1", exact: true })).toBeVisible();
  });
});
