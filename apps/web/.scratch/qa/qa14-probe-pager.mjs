// Probe pager: o botão "2" é localizável como o teste espera?
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/produtos?page=1`, { waitUntil: "networkidle" });

const navs = await page.getByRole("navigation").evaluateAll((els) =>
  els.map((el) => ({ aria: el.getAttribute("aria-label"), text: el.innerText.replace(/\n/g, " ").slice(0, 80) })),
);
console.log("navigations:", JSON.stringify(navs, null, 1));

const pag = page.getByRole("navigation", { name: "Paginação" });
console.log("nav[Paginação] count:", await pag.count());
console.log("botão '2' exact:", await pag.getByRole("button", { name: "2", exact: true }).count());
console.log("botões quaisquer:", await pag.getByRole("button").allInnerTexts());

await ctx.close();
await b.close();
