// Probe 2: (a) criar produto pela UI e ver o que a página mostra;
// (b) inspecionar as options do seletor de Loja (todas renderizadas? scroll?).
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

// (a) produto
const nome = `PROBE2 ${Date.now()}`;
await page.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill(nome);
await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1200);
const body = await page.locator("body").innerText();
console.log("== pós-Cadastrar: contém 'Não deu para concluir'?", body.includes("Não deu para concluir"));
console.log("== contém 'Já existe'?", body.includes("Já existe"));
console.log("== contém 'Application error'?", body.includes("Application error"));
for (const p of [1, 2, 3]) {
  await page.goto(`${BASE}/produtos?page=${p}`, { waitUntil: "networkidle" });
  const html = await page.content();
  const pag = await page.getByRole("navigation", { name: "Paginação" }).innerText().catch(() => "(sem pager)");
  console.log(`== page=${p}: nome presente? ${html.includes(nome)} | pager: ${JSON.stringify(pag.replace(/\n/g, " "))}`);
}

// (b) seletor de loja
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
await page.getByRole("combobox").click();
await page.waitForTimeout(500);
const options = await page.getByRole("option").allInnerTexts();
console.log("== options do seletor:", JSON.stringify(options));
const listbox = page.getByRole("listbox");
console.log("== listbox html (trecho):", (await listbox.innerHTML().catch(() => "(sem listbox)")).slice(0, 400));

await ctx.close();
await b.close();
