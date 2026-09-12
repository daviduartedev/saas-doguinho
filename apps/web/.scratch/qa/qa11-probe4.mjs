import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/produtos?per=24`, { waitUntil: "networkidle" });
const nomes = await page.locator('form input[name="nome"]').evaluateAll((els) => els.map((e) => e.value));
console.log("produtos na listagem:", JSON.stringify(nomes));
const ciclo = await page.locator('input[name="nome"][value="Ciclo QA"]').count();
console.log("Ciclo QA presente:", ciclo);
await ctx.close();
await b.close();
