// Probe: como a linha de um Produto recém-criado aparece no DOM?
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
const nome = `PROBE ${Date.now()}`;
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill(nome);
await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);

const porValue = await page.locator(`form:has(input[value="${nome}"])`).count();
const qualquerInput = await page.locator(`input[value="${nome}"]`).count();
const bodyTem = (await page.locator("body").innerText()).includes(nome);
const html = await page.content();
const idx = html.indexOf(nome);
console.log("form:has(input[value]):", porValue);
console.log("input[value]:", qualquerInput);
console.log("body innerText contém:", bodyTem);
console.log("trecho html:", idx >= 0 ? html.slice(Math.max(0, idx - 220), idx + 120) : "(nome ausente no HTML)");
await ctx.close();
await b.close();
