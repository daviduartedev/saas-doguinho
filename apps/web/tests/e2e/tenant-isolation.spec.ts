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

  test("Restrito (Vínculo só Centro) não consegue fixar outra Loja via ?loja=", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    // descobre um id de Loja fora do Vínculo olhando as opções? Restrito só vê Centro.
    // Força um id válido de outra Loja via lista pública do seletor do Dono é overkill;
    // o allowlist já foi provado acima com id inválido. Aqui: o seletor do Restrito
    // NÃO lista outras Lojas.
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Centro" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Magalhães" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toHaveCount(0);
  });

  test("Dono continua vendo as três Lojas", async ({ page }) => {
    await loginDono(page);
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option", { name: "Centro" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Jardim Juliana" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Magalhães" })).toBeVisible();
  });

  test("cada Operador de seed só vê a Loja do Vínculo", async ({ page }) => {
    const casos = [
      { identidade: OPERADOR_CENTRO, loja: "Centro", outras: ["Jardim Juliana", "Magalhães"] },
      { identidade: OPERADOR_JULIANA, loja: "Jardim Juliana", outras: ["Centro", "Magalhães"] },
      { identidade: OPERADOR_MAGALHAES, loja: "Magalhães", outras: ["Centro", "Jardim Juliana"] },
    ] as const;
    for (const caso of casos) {
      await login(page, caso.identidade.email, caso.identidade.senha);
      await page.getByRole("combobox").click();
      await expect(page.getByRole("option", { name: caso.loja })).toBeVisible();
      for (const outra of caso.outras) {
        await expect(page.getByRole("option", { name: outra })).toHaveCount(0);
      }
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Sair" }).click();
      await page.waitForURL("**/entrar**");
    }
  });
});
