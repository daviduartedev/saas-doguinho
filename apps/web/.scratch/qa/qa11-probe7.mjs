import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
const html = await page.content();
const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
const perfilId = await page.locator('select[name="perfilId"] option').nth(1).getAttribute("value");
const lojaId = await page.locator('input[name="lojaIds"]').first().getAttribute("value");
console.log("actionId:", actionId, "perfilId:", perfilId, "lojaId:", lojaId);

// POST único de controle
const resp = await ctx.request.post(`${BASE}/usuarios`, {
  multipart: { [actionId]: "", nome: "Solo Teste", email: "solo@doguinho.local", senha: "qa123456", perfilId, lojaIds: lojaId },
  maxRedirects: 0,
});
console.log("POST único →", resp.status(), resp.headers()["location"] ?? "");
const body = await resp.text();
if (resp.status() >= 400) console.log("corpo:", body.slice(0, 400));

await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
const achou = await page.locator("text=solo@doguinho.local").count();
console.log("solo@doguinho.local na lista:", achou);

// loja emoji existia?
await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
const lojas = await page.locator("ul.listing-frame > li").allInnerTexts();
console.log("lojas:", JSON.stringify(lojas));
await ctx.close();
await b.close();
