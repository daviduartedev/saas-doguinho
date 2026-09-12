// QA-08 (browser): Perfis e Usuários — CRUD de Perfil, ciclo de vida, efeito imediato.
import { BASE, DONO, browser, login, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC, OM } from "./ensure-identities.mjs";

const ALVO = { email: "alvo.vinculo@doguinho.local", senha: "qa123456", nome: "Alvo Vínculo" };
const b = await browser();
const { ctx, page } = await newPage(b);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
await loginOk(page, DONO);

// ---------- PERF-01: criar Perfil "Estoquista" ----------
await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
  await form.getByLabel("Nome").fill("Estoquista");
  await form.locator('input[name="perm_read_estoque"]').setChecked(true, { force: true });
  await form.locator('input[name="perm_submit_fechamento"]').setChecked(true, { force: true });
  await form.getByRole("button", { name: "Criar Perfil" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
}
const bodyP = await page.locator("body").innerText();
const perfCriado = bodyP.includes("Estoquista") && bodyP.includes("2 de 7");
await record("PERF-01", perfCriado ? "PASS" : "FAIL", `Estoquista criado com 2/7 permissões=${perfCriado}`,
  await shot(page, "perfis", "perf-01-criado"));

// ---------- PERF-02: nome duplicado ----------
pageErrors.length = 0;
await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
  await form.getByLabel("Nome").fill("estoq uista".replace(" ", ""));  // "estou ista"? não — usar caixa diferente
}
// refazer limpo: duplicado por caixa
await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
  await form.getByLabel("Nome").fill("ESTOQUISTA");
  await form.getByRole("button", { name: "Criar Perfil" }).click();
  await page.waitForTimeout(2000);
}
const conflitoPerfil = pageErrors.some((e) => e.includes("Já existe um Perfil")) ||
  (await page.locator("body").innerText()).includes("Já existe um Perfil");
await record("PERF-02", conflitoPerfil ? "PASS" : "FAIL",
  `duplicado (caixa) rejeitado=${conflitoPerfil}; entrega via crash page (QA-004)`,
  await shot(page, "perfis", "perf-02-duplicado"));

// ---------- PERF-08: sem nome → HTML5 ----------
await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
let post08 = false;
page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/perfis")) post08 = true; });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
  await form.getByRole("button", { name: "Criar Perfil" }).click();
  await page.waitForTimeout(900);
}
await record("PERF-08", !post08 ? "PASS" : "FAIL", `nome vazio: POST bloqueado no cliente=${!post08}`);
page.removeAllListeners("request");

// ---------- PERF-06: ?editar= adulterado ----------
await page.goto(`${BASE}/perfis?editar=id-inexistente`, { waitUntil: "networkidle" });
const bodyE = await page.locator("body").innerText();
const semFicha = !bodyE.includes("Editar perfil") && !bodyE.includes("Novo perfil");
await record("PERF-06", semFicha ? "PASS" : "FAIL", `?editar=lixo → só lista, sem ficha=${semFicha}`);

// ---------- PERF-07: OC em /perfis ----------
{
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
  await record("PERF-07", ocPage.url().startsWith(`${BASE}/fechamento`) ? "PASS" : "FAIL",
    `OC em /perfis → ${ocPage.url()}`);
  await ocCtx.close();
}

// ---------- USER-01: criar alvo + login ----------
{
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  if (!(await page.locator("body").innerText()).includes(ALVO.email)) {
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
    await form.getByLabel("Nome", { exact: true }).fill(ALVO.nome);
    await form.getByLabel("E-mail", { exact: true }).fill(ALVO.email);
    await form.getByLabel("Senha inicial", { exact: true }).fill(ALVO.senha);
    await form.locator('select[name="perfilId"]').selectOption({ label: "Operador" });
    await form.getByLabel("Centro", { exact: true }).check();
    await form.getByRole("button", { name: "Criar usuário" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
  }
  const criado = (await page.locator("body").innerText()).includes(ALVO.email);
  const { ctx: aCtx, page: aPage } = await newPage(b);
  await login(aPage, ALVO);
  const logou = await aPage.waitForURL("**/fechamento**", { timeout: 20000 }).then(() => true).catch(() => false);
  await record("USER-01", criado && logou ? "PASS" : "FAIL", `criado=${criado}; login ok=${logou}`);
  await aCtx.close();
}

// ---------- USER-02/03: HTML5 no cliente ----------
await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
let postUser = false;
page.on("request", (r) => { if (r.method() === "POST" && r.url().includes("/usuarios")) postUser = true; });
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
  await form.getByLabel("Nome", { exact: true }).fill("Teste Curto");
  await form.getByLabel("E-mail", { exact: true }).fill("curto@doguinho.local");
  await form.getByLabel("Senha inicial", { exact: true }).fill("1234567");
  await form.getByLabel("Centro", { exact: true }).check();
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForTimeout(900);
}
const bloq02 = !postUser;
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
  await form.getByLabel("E-mail", { exact: true }).fill("sem-arroba");
  await form.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForTimeout(900);
}
await record("USER-02", bloq02 ? "PASS" : "FAIL", `senha 7 chars: bloqueado no cliente (minLength)=${bloq02}; mensagem de servidor coberta no seam`);
await record("USER-03", !postUser ? "PASS" : "FAIL", `e-mail sem @: bloqueado no cliente (type=email)=${!postUser}; seam cobre mensagem`);
page.removeAllListeners("request");

// ---------- USER-04: e-mail duplicado (caixa diferente) ----------
pageErrors.length = 0;
{
  const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
  await form.getByLabel("Nome", { exact: true }).fill("Duplicado");
  await form.getByLabel("E-mail", { exact: true }).fill("ALVO.VINCULO@doguinho.local");
  await form.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
  await form.getByLabel("Centro", { exact: true }).check();
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForTimeout(2000);
}
const dup04 = pageErrors.some((e) => e.includes("Já existe um usuário")) ||
  (await page.locator("body").innerText()).includes("Já existe um usuário");
await record("USER-04", dup04 ? "PASS" : "FAIL", `duplicado caixa-mista rejeitado=${dup04}; entrega via crash page (QA-004)`,
  await shot(page, "usuarios", "user-04-duplicado"));

// ---------- USER-07: desligar usuário LOGADO (2 contexts) ----------
{
  const { ctx: aCtx, page: aPage } = await newPage(b);
  await loginOk(aPage, ALVO);
  // Dono desliga o alvo
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const card = page.locator("li", { hasText: ALVO.email }).first();
  await card.getByRole("button", { name: "Desligar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  const marcado = (await page.locator("body").innerText()).includes("desligado");
  // alvo navega → o que acontece?
  let destino = "";
  try {
    await aPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle", timeout: 20000 });
    destino = aPage.url();
  } catch (error) {
    destino = String(error).includes("ERR_TOO_MANY_REDIRECTS") ? "ERR_TOO_MANY_REDIRECTS (loop QA-002)" : String(error).slice(0, 100);
  }
  const morreu = destino.startsWith(`${BASE}/entrar`);
  await record("USER-07", morreu ? "PASS" : "FAIL",
    `desligado na lista=${marcado}; próxima navegação → ${destino}${morreu ? "" : " — sessão NÃO morreu limpa"}`,
    await shot(aPage, "usuarios", "user-07-desligado").catch(() => ""));
  await aCtx.close();
}

// ---------- USER-11: alterar Vínculo de OM (tirar Centro) ----------
{
  const { ctx: omCtx, page: omPage } = await newPage(b);
  await loginOk(omPage, OM);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const card = page.locator("li", { hasText: OM.email }).first();
  const vincForm = card.locator("form", { has: card.getByRole("button", { name: "Atualizar Vínculo" }) });
  await vincForm.getByLabel("Centro", { exact: true }).uncheck();
  await vincForm.getByRole("button", { name: "Atualizar Vínculo" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  // OM recarrega: switcher não deve mais ter Centro
  await omPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  await omPage.getByRole("combobox").first().click();
  const opts = (await omPage.getByRole("option").allInnerTexts()).map((t) => t.trim());
  await omPage.keyboard.press("Escape");
  const semCentro = !opts.includes("Centro") && opts.includes("Jardim Juliana");
  await record("USER-11", semCentro ? "PASS" : "FAIL", `Vínculo sem Centro → switcher OM = ${JSON.stringify(opts)}`,
    await shot(omPage, "usuarios", "user-11-vinculo"));
  await omCtx.close();
}

// ---------- USER-12: alterar Perfil de OM → Restrito ----------
{
  const { ctx: omCtx, page: omPage } = await newPage(b);
  await loginOk(omPage, OM);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const card = page.locator("li", { hasText: OM.email }).first();
  const perfForm = card.locator("form", { has: card.getByRole("button", { name: "Trocar Perfil" }) });
  await perfForm.locator('select[name="perfilId"]').selectOption({ label: "Restrito" });
  await perfForm.getByRole("button", { name: "Trocar Perfil" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  await omPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const nav = (await omPage.locator("nav").first().innerText()).split("\n").map((t) => t.trim()).filter(Boolean);
  const soEstoque = nav.length === 1 && nav[0] === "Estoque";
  await record("USER-12", soEstoque ? "PASS" : "FAIL", `Perfil→Restrito: nav OM = ${JSON.stringify(nav)}`);
  // restaurar OM: Perfil Operador + Vínculo Centro,JJ
  const perfForm2 = card.locator("form", { has: card.getByRole("button", { name: "Trocar Perfil" }) });
  await perfForm2.locator('select[name="perfilId"]').selectOption({ label: "Operador" });
  await perfForm2.getByRole("button", { name: "Trocar Perfil" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  const vincForm2 = card.locator("form", { has: card.getByRole("button", { name: "Atualizar Vínculo" }) });
  await vincForm2.getByLabel("Centro", { exact: true }).check();
  await vincForm2.getByRole("button", { name: "Atualizar Vínculo" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  console.log("OM restaurado");
  await omCtx.close();
}

// ---------- PERF-03: remover submit_fechamento do Perfil Operador (efeito imediato) ----------
{
  // id do Perfil Operador via link Editar
  await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
  const href = await page.locator('a[href*="editar="]', { hasText: "Editar" }).first().getAttribute("href");
  const operadorEditHref = await page.locator("div", { hasText: "Operador" }).last().locator("..").locator('a[href*="editar="]').getAttribute("href").catch(() => href);
  await page.goto(`${BASE}${operadorEditHref}`, { waitUntil: "networkidle" });
  const ficha = page.locator("form", { has: page.getByRole("button", { name: "Guardar" }) });
  const nomePerfil = await ficha.getByLabel("Nome").inputValue();
  console.log("editando perfil:", nomePerfil);
  await ficha.locator('input[name="perm_submit_fechamento"]').setChecked(false, { force: true });
  await ficha.getByRole("button", { name: "Guardar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);

  // OC tenta enviar fechamento → deve falhar
  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  await ocPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await ocPage.waitForTimeout(2500);
  const erroEl = ocPage.locator("p.mt-3.text-sm.font-medium.text-ketchup").first();
  const erroOC = (await erroEl.count()) > 0 ? await erroEl.innerText() : null;
  const negado = erroOC === "Sem autorização.";
  await record("PERF-03", negado ? "PASS" : "FAIL", `sem submit_fechamento no Perfil → OC enviar: "${erroOC ?? "nenhum"}"`,
    await shot(ocPage, "perfis", "perf-03-efeito-imediato"));
  await ocCtx.close();

  // restaurar Operador
  await page.goto(`${BASE}${operadorEditHref}`, { waitUntil: "networkidle" });
  const ficha2 = page.locator("form", { has: page.getByRole("button", { name: "Guardar" }) });
  await ficha2.locator('input[name="perm_submit_fechamento"]').setChecked(true, { force: true });
  await ficha2.getByRole("button", { name: "Guardar" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  console.log("Perfil Operador restaurado");
}

await ctx.close();
await b.close();
console.log("QA-08 browser done");
