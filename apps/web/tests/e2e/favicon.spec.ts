// Favicon: a aba, bookmark e atalho usam a marca existente (#34).
import { expect, test } from "@playwright/test";

test.describe("Favicon com a marca", () => {
  test("/favicon.ico responde 200 com imagem (não 404)", async ({ request }) => {
    const res = await request.get("/favicon.ico");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"] ?? "").toMatch(/image|icon/);
  });

  test("/entrar declara a marca na aba, no bookmark e no atalho", async ({ page, request }) => {
    await page.goto("/entrar");

    const icon = page.locator('link[rel="icon"]').first();
    await expect(icon).toHaveAttribute("href", /marca-doguinho/);

    const apple = page.locator('link[rel="apple-touch-icon"]').first();
    await expect(apple).toHaveAttribute("href", /marca-doguinho/);

    const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifest = await request.get(manifestHref!);
    expect(manifest.status()).toBe(200);
    expect(JSON.stringify(await manifest.json())).toMatch(/marca-doguinho/);
  });
});
