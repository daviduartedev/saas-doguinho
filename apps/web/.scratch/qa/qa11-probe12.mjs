import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
// login novo (a sessão anterior pode ter sido desligada pelos POSTs-logout errados)
await loginOk(page, DONO);
for (let p = 1; p <= 4; p++) {
  await page.goto(`${BASE}/usuarios?page=${p}`, { waitUntil: "networkidle" });
  const users = await page.locator("ul.space-y-3 > li").allInnerTexts();
  if (users.length === 0) break;
  console.log(`página ${p}: ${users.length}`);
  for (const u of users) console.log("  -", u.split("\n")[0]);
}
await ctx.close();
await b.close();
