import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
console.log("url inicial:", page.url());
await page.getByRole("combobox").click();
await page.waitForTimeout(500);
const opts = await page.getByRole("option").all();
console.log("opções:", await Promise.all(opts.map(async (o) => [await o.innerText(), await o.getAttribute("data-value")])));
await page.getByRole("option", { name: "Jardim Juliana", exact: true }).click();
await page.waitForTimeout(1500);
console.log("url após clique:", page.url());
await ctx.close();
await b.close();
