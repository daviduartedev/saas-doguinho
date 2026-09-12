// Debug: lista todas as páginas de /produtos com nomes e status.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

for (const pg of [1, 2, 3, 4]) {
  await page.goto(`${BASE}/produtos?page=${pg}`, { waitUntil: "networkidle" });
  const nomes = await page.locator('form input[name="nome"]').evaluateAll((els) => els.map((e) => e.value));
  const pager = (await page.locator('nav[aria-label="Paginação"]').innerText().catch(() => "(sem pager)")).replace(/\n/g, " ");
  console.log(`página ${pg}: ${nomes.length} forms → ${JSON.stringify(nomes)}`);
  console.log(`  pager: ${pager}`);
}
await ctx.close();
await b.close();
