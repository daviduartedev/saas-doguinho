import { expect, test } from "@playwright/test";
import { loginDono } from "../helpers";

test("awning nav stays mounted while the page body loads", async ({ page }) => {
  await loginDono(page);
  const nav = page.getByRole("navigation", { name: "Seções" }).first();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await nav.getByRole("link", { name: "Estoque" }).click();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fechamento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estoque" })).toBeVisible();
});
