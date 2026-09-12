import { BASE, DONO, browser, newPage, loginOk, shot } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill("Milho");
await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
await page.waitForTimeout(3000);
const body = await page.locator("body").innerText();
console.log("url:", page.url());
console.log("contém 'Application error':", body.includes("Application error"));
console.log("contém 'Já existe':", body.includes("Já existe"));
console.log("alerts:", await page.getByRole("alert").count());
console.log("trecho:", JSON.stringify(body.slice(0, 400)));
await shot(page, "breakit", "qa004-probe");
await ctx.close();
await b.close();
