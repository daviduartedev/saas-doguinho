// QA-08c: PERF-03 corrigido — remover submit_fechamento E submit_correcao do Perfil Operador.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC } from "./ensure-identities.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
const linhaOperador = page.locator("div.grid", { hasText: "Operador" }).filter({ hasText: "inicial" }).first();
const href = await linhaOperador.locator('a[href*="editar="]').getAttribute("href");
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
const ficha = page.locator('form:has(input[name="perm_read_estoque"])');
await ficha.locator('input[name="perm_submit_fechamento"]').setChecked(false, { force: true });
await ficha.locator('input[name="perm_submit_correcao"]').setChecked(false, { force: true });
await ficha.getByRole("button", { name: "Guardar" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(900);

// OC: nav some com Fechamento + envio forçado é negado
const { ctx: ocCtx, page: ocPage } = await newPage(b);
await loginOk(ocPage, OC);
await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
const nav = await ocPage.locator("nav").first().innerText();
const semNav = !nav.includes("Fechamento");
// força envio mesmo sem nav (URL direta — form ainda renderiza, QA-003)
await ocPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
await ocPage.waitForTimeout(2500);
const erroEl = ocPage.locator("p.mt-3.text-sm.font-medium.text-ketchup").first();
const erroOC = (await erroEl.count()) > 0 ? (await erroEl.innerText()).trim() : null;
const negado = erroOC === "Sem autorização.";
await record("PERF-03", negado && semNav ? "PASS" : "FAIL",
  `nav sem Fechamento=${semNav}; envio forçado → "${erroOC ?? "nenhum"}" (efeito imediato da edição de Perfil)`,
  await shot(ocPage, "perfis", "perf-03b-efeito-imediato"));
await ocCtx.close();

// restaurar Operador
await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
const ficha2 = page.locator('form:has(input[name="perm_read_estoque"])');
await ficha2.locator('input[name="perm_submit_fechamento"]').setChecked(true, { force: true });
await ficha2.locator('input[name="perm_submit_correcao"]').setChecked(true, { force: true });
await ficha2.getByRole("button", { name: "Guardar" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(900);
console.log("Operador restaurado");

await ctx.close();
await b.close();
console.log("QA-08c done");
