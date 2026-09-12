// Probe QA-007 UI: criar → desativar → recriar mesmo nome, observando cada passo.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 200)); });
await loginOk(page, DONO);
const nome = `PROBE7 ${Date.now()}`;

async function acharLinha() {
  for (let p = 1; p <= 10; p++) {
    await page.goto(`${BASE}/produtos?page=${p}`, { waitUntil: "networkidle" });
    const l = page.locator(`form:has(input[value="${nome}"])`).first();
    if (await l.count()) return l;
    const prox = await page.getByRole("navigation", { name: "Paginação" }).getByRole("button", { name: String(p + 1), exact: true }).count();
    if (!prox) return null;
  }
  return null;
}

await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill(nome);
await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
await page.waitForLoadState("networkidle");
const l1 = await acharLinha();
console.log("após criar #1:", l1 ? "encontrada" : "NÃO encontrada");

await l1.getByRole("button", { name: "Desativar" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
const lDepois = await acharLinha();
console.log("após desativar:", lDepois ? "ainda aparece" : "sumiu da lista");

await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill(nome);
await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(800);
const body = await page.locator("body").innerText();
console.log("pós criar #2 — 'Já existe'?", body.includes("Já existe"), "| 'Não deu para concluir'?", body.includes("Não deu para concluir"), "| url:", page.url());
const l2 = await acharLinha();
console.log("após criar #2:", l2 ? "encontrada" : "NÃO encontrada");

await ctx.close();
await b.close();
