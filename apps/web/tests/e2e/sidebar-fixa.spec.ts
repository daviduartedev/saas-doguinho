// Sidebar desktop: marca e footer fixos; ator sai do header.
import { expect, test } from "@playwright/test";
import { loginDono } from "./helpers";

const ATOR_DONO = "Dono · Dono";

test.describe("Sidebar fixa", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("no desktop o ator vive no footer do menu lateral, não no header", async ({ page }) => {
    await loginDono(page);
    const menu = page.getByRole("complementary");
    await expect(menu.locator("footer")).toContainText(ATOR_DONO);
    await expect(menu.getByRole("button", { name: "Sair" })).toBeVisible();
    await expect(page.getByRole("banner")).not.toContainText(ATOR_DONO);
  });

  test("marca e footer ficam na vista; só a lista de rotas rola", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await loginDono(page);

    const menu = page.getByRole("complementary");
    const marca = menu.getByRole("img", { name: "Doguinho do Coruja" });
    const sair = menu.getByRole("button", { name: "Sair" });
    const rotas = menu.getByRole("navigation", { name: "Seções" });

    await expect(marca).toBeInViewport();
    await expect(sair).toBeInViewport();
    await expect(menu.locator("footer")).toContainText(ATOR_DONO);

    const marcaAntes = await marca.boundingBox();
    const sairAntes = await sair.boundingBox();
    expect(marcaAntes && sairAntes).toBeTruthy();

    await rotas.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    const marcaDepois = await marca.boundingBox();
    const sairDepois = await sair.boundingBox();
    expect(marcaDepois?.y).toBe(marcaAntes?.y);
    expect(sairDepois?.y).toBe(sairAntes?.y);
    await expect(rotas.getByRole("link", { name: "Configurações" })).toBeInViewport();
  });
});
