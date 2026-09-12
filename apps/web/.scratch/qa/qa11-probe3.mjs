import { BASE, browser, newPage, loginOk } from "./helpers.mjs";

const OC = { email: "operador.centro@doguinho.local", senha: "qa123456" };
const CENTRO = "fc2a079d3328b276610e59cc610616b5";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, OC);
await page.goto(`${BASE}/fechamento?loja=${CENTRO}`, { waitUntil: "networkidle" });
await ctx.clearCookies();
await page.getByLabel("Justificativa").fill("probe");
await page.getByRole("button", { name: "Enviar correção" }).click();
await page.waitForTimeout(3000);
const body = await page.locator("body").innerText();
for (const termo of ["expirada", "Erro", "erro"]) {
  const i = body.indexOf(termo);
  if (i >= 0) console.log(`match "${termo}": ...${JSON.stringify(body.slice(Math.max(0, i - 60), i + 60))}...`);
}
// cheque específico: parágrafo de erro do form
const errCount = await page.locator("p.text-ketchup").count();
console.log("p.text-ketchup:", errCount, errCount ? await page.locator("p.text-ketchup").first().innerText() : "");
await ctx.close();
await b.close();
