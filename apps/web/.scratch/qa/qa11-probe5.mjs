import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
for (const p of [1, 2, 3]) {
  await page.goto(`${BASE}/produtos?page=${p}`, { waitUntil: "networkidle" });
  const nomes = await page.locator('form input[name="nome"]').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  console.log(`página ${p}:`, JSON.stringify(nomes));
}
await ctx.close();
await b.close();
