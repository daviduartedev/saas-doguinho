import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/estoque?per=24`, { waitUntil: "networkidle" });
const info = await page.evaluate(() => {
  const table = document.querySelector("table");
  if (!table) return { table: false };
  const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
  const firstRow = [...(table.querySelectorAll("tbody tr")[0]?.querySelectorAll("th,td") ?? [])].map((td) => td.textContent.trim());
  const rows = table.querySelectorAll("tbody tr").length;
  return { table: true, headers, firstRow, rows };
});
console.log(JSON.stringify(info, null, 1));
await ctx.close();
await b.close();
