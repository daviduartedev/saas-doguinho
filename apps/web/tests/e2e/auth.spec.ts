// Autenticação: login, credencial errada, logout, middleware.
import { expect, test } from "@playwright/test";
import { DONO, login, loginDono, logout } from "./helpers";

test.describe("Autenticação", () => {
  test("login com credenciais válidas leva ao Fechamento", async ({ page }) => {
    await loginDono(page);
    await expect(page).toHaveURL(/\/fechamento/);
    await expect(page.getByRole("navigation").first()).toBeVisible();
  });

  test("senha errada volta para /entrar com erro genérico (não vaza se o e-mail existe)", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail", { exact: true }).fill(DONO.email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL("**/entrar?erro=1**");
    await expect(page.locator("body")).toContainText("E-mail ou senha inválidos");
  });

  test("logout encerra a sessão e /fechamento volta a exigir login", async ({ page }) => {
    await loginDono(page);
    await logout(page);
    await expect(page).toHaveURL(/\/entrar/);
    await page.goto("/fechamento");
    await page.waitForURL("**/entrar**");
  });

  test("sem cookie, rota protegida redireciona para /entrar (middleware)", async ({ page }) => {
    await page.goto("/estoque");
    await page.waitForURL("**/entrar**");
  });

  test("usuário logado que visita /entrar é levado ao Fechamento", async ({ page }) => {
    await loginDono(page);
    await page.goto("/entrar");
    await page.waitForURL("**/fechamento**");
  });
});
