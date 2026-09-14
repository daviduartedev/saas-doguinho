// Viewport estreito: hamburger abre drawer (marca, rotas, ator, Sair). Sem faixa inferior.
import { expect, test } from "@playwright/test";
import { loginDono, logout } from "./helpers";

const ATOR_DONO = /Dono/;

test.describe("Desktop: aside, sem hamburger", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("hamburger ausente e o menu lateral permanece", async ({ page }) => {
    await loginDono(page);
    await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveCount(0);
    const menu = page.getByRole("complementary");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("navigation", { name: "Seções" })).toBeVisible();
    await expect(menu.getByRole("button", { name: "Sair" })).toBeVisible();
  });
});

test.describe("Mobile: hamburger no lugar da faixa", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger abre o drawer com marca, rotas, ator e Sair; faixa some", async ({ page }) => {
    await loginDono(page);

    await expect(page.getByRole("complementary")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Seções" })).toHaveCount(0);

    const hamburger = page.getByRole("button", { name: "Abrir menu" });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("img", { name: "Doguinho do Coruja" })).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Seções" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Fechamento" })).toBeVisible();
    await expect(drawer).toContainText(ATOR_DONO);
    await expect(drawer.getByRole("button", { name: "Sair" })).toBeVisible();
  });

  test("Sair no drawer encerra a sessão", async ({ page }) => {
    await loginDono(page);
    await logout(page);
    await expect(page).toHaveURL(/\/entrar/);
  });
});
