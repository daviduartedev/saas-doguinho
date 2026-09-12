import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
for (let p = 1; p <= 3; p++) {
  await page.goto(`${BASE}/usuarios?page=${p}`, { waitUntil: "networkidle" });
  const users = await page.locator("ul > li").allInnerTexts();
  console.log(`página ${p}: ${users.length} usuários`);
  for (const u of users) console.log("  -", u.split("\n")[0]);
}
// tenta login com a conta da corrida
const { ctx: ctx2, page: p2 } = await newPage(b);
await p2.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await p2.getByLabel("E-mail", { exact: true }).fill("race@doguinho.local");
await p2.getByLabel("Senha", { exact: true }).fill("qa123456");
await p2.getByRole("button", { name: "Entrar" }).click();
await p2.waitForTimeout(3000);
console.log("login race@doguinho.local →", p2.url());
await ctx.close();
await ctx2.close();
await b.close();
