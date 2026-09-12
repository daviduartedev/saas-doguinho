import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
const lojas = await page.locator("ul.listing-frame > li").allInnerTexts();
console.log("total:", lojas.length);
for (const l of lojas) console.log(" -", JSON.stringify(l.slice(0, 60)), `(${l.length} chars)`);
await ctx.close();
await b.close();
