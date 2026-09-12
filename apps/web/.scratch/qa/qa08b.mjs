// QA-08b: PERF-06 (probe corrigido), USER-11, USER-12, PERF-03 (locators de form por :has).
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC, OM } from "./ensure-identities.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

// ---------- PERF-06: ?editar= adulterado → sem ficha (probe: form com switches) ----------
await page.goto(`${BASE}/perfis?editar=id-inexistente`, { waitUntil: "networkidle" });
const fichaPresente = (await page.locator('form:has(input[name="perm_read_estoque"])').count()) > 0;
await record("PERF-06", !fichaPresente ? "PASS" : "FAIL", `?editar=lixo → ficha renderizada=${fichaPresente} (esperado false)`);

// ---------- USER-11: alterar Vínculo de OM (tirar Centro) → efeito imediato ----------
{
  const { ctx: omCtx, page: omPage } = await newPage(b);
  await loginOk(omPage, OM);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const card = page.locator("li", { hasText: OM.email }).first();
  const vincForm = card.locator('form:has(input[name="lojaIds"])');
  await vincForm.getByLabel("Centro", { exact: true }).uncheck();
  await vincForm.getByRole("button", { name: "Atualizar Vínculo" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await omPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  await omPage.getByRole("combobox").first().click();
  const opts = (await omPage.getByRole("option").allInnerTexts()).map((t) => t.trim());
  await omPage.keyboard.press("Escape");
  const semCentro = !opts.includes("Centro") && opts.includes("Jardim Juliana");
  await record("USER-11", semCentro ? "PASS" : "FAIL", `sem Centro → switcher OM = ${JSON.stringify(opts)}`,
    await shot(omPage, "usuarios", "user-11-vinculo"));
  await omCtx.close();
}

// ---------- USER-12: alterar Perfil de OM → Restrito → nav muda na hora ----------
{
  const { ctx: omCtx, page: omPage } = await newPage(b);
  await loginOk(omPage, OM);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const card = page.locator("li", { hasText: OM.email }).first();
  const perfForm = card.locator('form:has(select[name="perfilId"])');
  await perfForm.locator('select[name="perfilId"]').selectOption({ label: "Restrito" });
  await perfForm.getByRole("button", { name: "Trocar Perfil" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await omPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const nav = (await omPage.locator("nav").first().innerText()).split("\n").map((t) => t.trim()).filter(Boolean);
  const soEstoque = nav.length === 1 && nav[0] === "Estoque";
  await record("USER-12", soEstoque ? "PASS" : "FAIL", `Perfil→Restrito: nav OM = ${JSON.stringify(nav)}`,
    await shot(omPage, "usuarios", "user-12-perfil"));
  await omCtx.close();

  // restaurar OM: Perfil Operador + Vínculo Centro+JJ
  const perfForm2 = card.locator('form:has(select[name="perfilId"])');
  await perfForm2.locator('select[name="perfilId"]').selectOption({ label: "Operador" });
  await perfForm2.getByRole("button", { name: "Trocar Perfil" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  const vincForm2 = card.locator('form:has(input[name="lojaIds"])');
  await vincForm2.getByLabel("Centro", { exact: true }).check();
  await vincForm2.getByRole("button", { name: "Atualizar Vínculo" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  console.log("OM restaurado");
}

// ---------- PERF-03: remover submit_fechamento do Perfil Operador → efeito imediato ----------
{
  await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
  // link Editar da linha do Operador (linha contém badge "inicial")
  const linhaOperador = page.locator("div.grid", { hasText: "Operador" }).filter({ hasText: "inicial" }).first();
  const href = await linhaOperador.locator('a[href*="editar="]').getAttribute("href");
  console.log("edit href:", href);
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  const ficha = page.locator('form:has(input[name="perm_read_estoque"])');
  const nomePerfil = await ficha.getByLabel("Nome").inputValue();
  console.log("editando perfil:", nomePerfil);
  await ficha.locator('input[name="perm_submit_fechamento"]').setChecked(false, { force: true });
  await ficha.getByRole("button", { name: "Guardar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);

  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  await ocPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await ocPage.waitForTimeout(2500);
  const erroEl = ocPage.locator("p.mt-3.text-sm.font-medium.text-ketchup").first();
  const erroOC = (await erroEl.count()) > 0 ? (await erroEl.innerText()).trim() : null;
  const negado = erroOC === "Sem autorização.";
  await record("PERF-03", negado ? "PASS" : "FAIL",
    `Operador sem submit_fechamento → OC enviar: "${erroOC ?? "nenhum"}"`,
    await shot(ocPage, "perfis", "perf-03-efeito-imediato"));
  await ocCtx.close();

  // restaurar
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
  const ficha2 = page.locator('form:has(input[name="perm_read_estoque"])');
  await ficha2.locator('input[name="perm_submit_fechamento"]').setChecked(true, { force: true });
  await ficha2.getByRole("button", { name: "Guardar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  // verifica restauração
  const { ctx: oc2Ctx, page: oc2Page } = await newPage(b);
  await loginOk(oc2Page, OC);
  await oc2Page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const navOC = await oc2Page.locator("nav").first().innerText();
  console.log("OC nav após restore:", navOC.includes("Fechamento") ? "ok" : "FALTANDO Fechamento");
  await oc2Ctx.close();
}

await ctx.close();
await b.close();
console.log("QA-08b done");
