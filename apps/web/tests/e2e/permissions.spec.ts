// Permissões: nav filtrada por Perfil + URL direta em área proibida.
// Identidades garantidas pelo global-setup (Restrito = só read_estoque).
import { expect, test } from "@playwright/test";
import { OPERADOR_CENTRO, RESTRITO, login } from "./helpers";

test.describe("Permissões por Perfil", () => {
  test("Restrito não vê nav de gestão (Produtos/Usuários/Perfis/Configurações)", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: "Produtos" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Perfis" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Configurações" })).toHaveCount(0);
  });

  // Comportamento real: página proibida REDIRECIONA para /fechamento (não renderiza conteúdo).
  test("Restrito em URL direta /produtos é redirecionado ao Fechamento (não vê o catálogo)", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    await page.goto("/produtos");
    await page.waitForURL("**/fechamento**");
    await expect(page.locator("input#nome")).toHaveCount(0);
  });

  test("Restrito em URL direta /usuarios é redirecionado ao Fechamento", async ({ page }) => {
    await login(page, RESTRITO.email, RESTRITO.senha);
    await page.goto("/usuarios");
    await page.waitForURL("**/fechamento**");
  });

  test("Operador (sem permissão dashboard) em /dashboard é redirecionado ao Fechamento", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    await page.goto("/dashboard");
    await page.waitForURL("**/fechamento**");
  });

  test("Operador não vê nav de gestão de usuários", async ({ page }) => {
    await login(page, OPERADOR_CENTRO.email, OPERADOR_CENTRO.senha);
    const nav = page.getByRole("navigation").first();
    await expect(nav.getByRole("link", { name: "Usuários" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Fechamento" })).toBeVisible();
  });
});
