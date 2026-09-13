// Header Loja filter: visible only when the actor sees more than one Loja.
import { expect, test } from "@playwright/test";
import {
  OPERADOR_CENTRO,
  OPERADOR_MULTI,
  SEM_LOJA,
  login,
  loginDono,
} from "./helpers";

test.describe("Filtro de Loja no header", () => {
  test("Operador com uma Loja no Vínculo não vê o Select", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("Sem Loja no Vínculo")).toHaveCount(0);
  });

  test("Dono (três Lojas) continua vendo o Select, inclusive Todas as Lojas", async ({ page }) => {
    await loginDono(page);
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Todas as Lojas" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Centro" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Magalhães" })).toBeVisible();
  });

  test("Operador com duas Lojas ainda vê o Select", async ({ page }) => {
    await login(page, OPERADOR_MULTI.email, OPERADOR_MULTI.senha);
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Todas as Lojas" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Centro" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Magalhães" })).toHaveCount(0);
  });

  test("ator sem Loja no Vínculo vê Sem Loja no Vínculo, sem Select", async ({ page }) => {
    await login(page, SEM_LOJA.email, SEM_LOJA.senha);
    await expect(page.getByText("Sem Loja no Vínculo", { exact: true })).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });
});
