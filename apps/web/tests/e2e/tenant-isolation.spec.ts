// Fronteira de Loja/tenant na UI.
// Nota: o seed em memória tem UMA Organização — isolamento Organização×Organização
// é enforced na camada app (assertOrg) e coberto por testes de unidade. Aqui o E2E
// cobre a fronteira de Loja: o filtro ?loja= é allowlist dos Vínculos do ator.
import { expect, test } from "@playwright/test";
import {
  OPERADOR_CENTRO,
  OPERADOR_JULIANA,
  OPERADOR_MAGALHAES,
  RESTRITO,
  login,
  loginDono,
} from "./helpers";

test.describe("Fronteira de Loja (?loja= allowlist)", () => {
  test("?loja com id inexistente cai no fallback (Loja do Vínculo), sem erro", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    await page.goto("/fechamento?loja=id-inexistente-qa");
    // resolveLojaFiltro ignora ids fora do Vínculo → conteúdo renderizado é o da Loja padrão (Centro)
    await expect(page.locator("body")).toContainText("Centro");
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("Restrito (Vínculo só Centro) não vê o filtro de Loja", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Magalhães" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toHaveCount(0);
  });

  test("Dono continua vendo as três Lojas", async ({ page }) => {
    await loginDono(page);
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Todas as Lojas" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Centro" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Magalhães" })).toBeVisible();
  });

  test("cada Operador de seed com uma Loja não vê o filtro", async ({ page }) => {
    for (const identidade of [OPERADOR_CENTRO, OPERADOR_JULIANA, OPERADOR_MAGALHAES]) {
      await login(page, identidade.email, identidade.senha);
      await expect(page.getByRole("combobox")).toHaveCount(0);
      await page.getByRole("button", { name: "Sair" }).click();
      await page.waitForURL("**/entrar**");
    }
  });
});
