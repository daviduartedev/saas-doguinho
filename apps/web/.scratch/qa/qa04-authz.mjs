// QA-04: Autorização — Perfil + Vínculo na UI e no servidor.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";

const OC = { email: "operador.centro@doguinho.local", senha: "qa123456", nome: "Operador Centro", perfil: "Operador", lojas: ["Centro"] };
const OM = { email: "operador.multi@doguinho.local", senha: "qa123456", nome: "Operador Multi", perfil: "Operador", lojas: ["Centro", "Jardim Juliana"] };
const RR = { email: "restrito@doguinho.local", senha: "qa123456", nome: "Restrito QA", perfil: "Restrito", lojas: ["Centro"] };

const b = await browser();
const lojaIds = {};

// ---------- SETUP (Dono): Perfil Restrito + 3 usuários ----------
const { ctx: dCtx, page: dPage } = await newPage(b);
await loginOk(dPage, DONO);
await dPage.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
{
  const form = dPage.locator("form", { has: dPage.getByRole("button", { name: "Criar usuário" }) });
  for (const label of await form.locator('label:has(input[name="lojaIds"])').all()) {
    lojaIds[(await label.innerText()).trim()] = await label.locator("input").getAttribute("value");
  }
}
console.log("lojaIds:", JSON.stringify(lojaIds));

// Perfil Restrito (só read_estoque)
await dPage.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
{
  const form = dPage.locator("form", { has: dPage.getByRole("button", { name: "Criar Perfil" }) });
  await form.getByLabel("Nome").fill("Restrito");
  await form.locator('input[name="perm_read_estoque"]').setChecked(true, { force: true });
  await form.getByRole("button", { name: "Criar Perfil" }).click();
  await dPage.waitForLoadState("networkidle");
  await dPage.waitForTimeout(900);
}
const perfilOk = (await dPage.locator("body").innerText()).includes("Restrito");
console.log("perfil Restrito criado:", perfilOk);

async function criarUsuario({ nome, email, senha, perfil, lojas }) {
  await dPage.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  const body0 = await dPage.locator("body").innerText();
  if (body0.includes(email)) return true;
  const form = dPage.locator("form", { has: dPage.getByRole("button", { name: "Criar usuário" }) });
  await form.getByLabel("Nome", { exact: true }).fill(nome);
  await form.getByLabel("E-mail", { exact: true }).fill(email);
  await form.getByLabel("Senha inicial", { exact: true }).fill(senha);
  await form.locator('select[name="perfilId"]').selectOption({ label: perfil });
  for (const loja of lojas) await form.getByLabel(loja, { exact: true }).check();
  await form.getByRole("button", { name: "Criar usuário" }).click();
  await dPage.waitForLoadState("networkidle");
  await dPage.waitForTimeout(900);
  return (await dPage.locator("body").innerText()).includes(email);
}

const ocOk = await criarUsuario(OC);
const omOk = await criarUsuario(OM);
const rrOk = await criarUsuario(RR);
await record("AUTHZ-01", perfilOk && ocOk && omOk && rrOk ? "PASS" : "FAIL",
  `perfil=${perfilOk} oc=${ocOk} om=${omOk} restrito=${rrOk}`, await shot(dPage, "authz", "authz-01-setup"));

// Extrai $ACTION_ID do form de criar produto (para AUTHZ-08)
await dPage.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
const produtoActionId = await dPage
  .locator("form", { has: dPage.getByRole("button", { name: "Cadastrar" }) })
  .locator('input[type="hidden"][name^="$ACTION_ID"]')
  .getAttribute("name");
console.log("criarProduto action id:", produtoActionId);

// ---------- helpers ----------
async function lojaOptions(page) {
  await page.getByRole("combobox").first().click();
  const opts = (await page.getByRole("option").allInnerTexts()).map((t) => t.trim());
  await page.keyboard.press("Escape");
  return opts;
}
async function navLabels(page) {
  return (await page.locator("nav").first().innerText()).split("\n").map((t) => t.trim()).filter(Boolean);
}
const contem = (texto, termo) => texto.includes(termo);

// ---------- OC (operador.centro) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OC);

  // AUTHZ-02: páginas do dia a dia mostram só Centro
  let ok02 = true;
  const notas02 = [];
  for (const rota of ["/fechamento", "/estoque", "/historico"]) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    const bom = contem(body, "Centro") && !contem(body, "Jardim Juliana") && !contem(body, "Magalhães");
    if (!bom) ok02 = false;
    notas02.push(`${rota}: ${bom ? "só Centro" : "VAZOU outra Loja"}`);
  }
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const dashRedirect = page.url().startsWith(`${BASE}/fechamento`);
  notas02.push(`/dashboard → ${page.url()} (sem permissão dashboard)`);
  await record("AUTHZ-02", ok02 && dashRedirect ? "PASS" : "FAIL", notas02.join(" | "));

  // switcher de Loja só lista Centro
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const optsOC = await lojaOptions(page);
  const okSwitch = optsOC.length === 2 && optsOC.includes("Centro") && optsOC.includes("Todas as Lojas");
  await record("AUTHZ-02b", okSwitch ? "PASS" : "FAIL", `switcher OC = ${JSON.stringify(optsOC)}`,
    await shot(page, "authz", "authz-02-oc-estoque"));

  // AUTHZ-03: ?loja= fora do Vínculo → fallback, nunca Loja alheia
  let ok03 = true;
  const notas03 = [];
  for (const [nome, id] of [["Jardim Juliana", lojaIds["Jardim Juliana"]], ["Magalhães", lojaIds["Magalhães"]], ["lixo", "id-inexistente"]]) {
    await page.goto(`${BASE}/estoque?loja=${id}`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    const vazou = nome !== "lixo" && contem(body, nome);
    if (vazou) ok03 = false;
    notas03.push(`?loja=${nome}: ${vazou ? "VAZOU" : "fallback seguro"}`);
  }
  await record("AUTHZ-03", ok03 ? "PASS" : "FAIL", notas03.join(" | "),
    await shot(page, "authz", "authz-03-oc-loja-alheia"));

  // AUTHZ-08: POST forjado de criar Produto com o $ACTION_ID do Dono
  const resp = await ctx.request.post(`${BASE}/produtos`, {
    multipart: { [produtoActionId]: "", nome: "Produto Forjado QA", unidade: "unidade" },
  });
  const respBody = await resp.text();
  console.log("forced POST status:", resp.status(), respBody.slice(0, 200));
  await dPage.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  const criou = (await dPage.locator("body").innerText()).includes("Produto Forjado QA");
  await record("AUTHZ-08", !criou ? "PASS" : "FAIL",
    `POST forjado status=${resp.status()}; produto criado=${criou}`);

  // AUTHZ-10 (OC): nav reflete permissões
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const navOC = await navLabels(page);
  const okNavOC = contem(navOC.join(), "Fechamento") && contem(navOC.join(), "Estoque") && contem(navOC.join(), "Histórico")
    && !contem(navOC.join(), "Dashboard") && !contem(navOC.join(), "Produtos") && !contem(navOC.join(), "Usuários")
    && !contem(navOC.join(), "Perfis") && !contem(navOC.join(), "Configurações");
  await record("AUTHZ-10-OC", okNavOC ? "PASS" : "FAIL", `nav OC = ${JSON.stringify(navOC)}`);
  await ctx.close();
}

// ---------- OM (operador.multi) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OM);
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const optsOM = await lojaOptions(page);
  const okOpts = optsOM.includes("Centro") && optsOM.includes("Jardim Juliana") && !optsOM.some((o) => contem(o, "Magalhães"));

  await page.goto(`${BASE}/estoque?loja=${lojaIds["Jardim Juliana"]}`, { waitUntil: "networkidle" });
  const bodyJJ = await page.locator("body").innerText();
  const veJJ = contem(bodyJJ, "Jardim Juliana");

  await page.goto(`${BASE}/estoque?loja=${lojaIds["Magalhães"]}`, { waitUntil: "networkidle" });
  const bodyMag = await page.locator("body").innerText();
  const vazouMag = contem(bodyMag, "Magalhães");

  await record("AUTHZ-04", okOpts && veJJ && !vazouMag ? "PASS" : "FAIL",
    `switcher=${JSON.stringify(optsOM)}; vê JJ=${veJJ}; ?loja=Magalhães vazou=${vazouMag}`,
    await shot(page, "authz", "authz-04-om-magalhaes"));
  await ctx.close();
}

// ---------- R (restrito: só read_estoque) ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, RR);

  // AUTHZ-05: /fechamento sem submit_* — plano espera ausência de ações
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const bodyFech = await page.locator("body").innerText();
  const temEnviar = contem(bodyFech, "Enviar fechamento") || contem(bodyFech, "Enviar correção");
  const temRascunho = contem(bodyFech, "Guardar rascunho");
  await shot(page, "authz", "authz-05-restrito-fechamento");
  // tenta enviar mesmo assim
  let erroServidor = "";
  if (temEnviar) {
    await page.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
    await page.waitForTimeout(2500);
    const depois = await page.locator("body").innerText();
    erroServidor = contem(depois, "Sem autorização") ? "servidor rejeitou: Sem autorização" : "sem mensagem de autorização";
    await shot(page, "authz", "authz-05-restrito-envio");
  }
  await record("AUTHZ-05", !temEnviar && !temRascunho ? "PASS" : "FAIL",
    `ações visíveis: enviar=${temEnviar} rascunho=${temRascunho}; ao forçar: ${erroServidor || "n/d"}`);

  // AUTHZ-06: URLs diretas de gestão
  const notas06 = [];
  let ok06 = true;
  for (const rota of ["/produtos", "/usuarios", "/perfis", "/configuracoes"]) {
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const ok = page.url().startsWith(`${BASE}/fechamento`);
    if (!ok) ok06 = false;
    notas06.push(`${rota} → ${ok ? "redirect /fechamento" : page.url()}`);
  }
  await page.goto(`${BASE}/historico`, { waitUntil: "networkidle" });
  const bodyHist = await page.locator("body").innerText();
  const histNegado = contem(bodyHist, "Sem autorização") || contem(bodyHist, "Não foi possível") || page.url().startsWith(`${BASE}/fechamento`);
  notas06.push(`/historico → ${histNegado ? "negado (" + (page.url().includes("historico") ? "página de erro" : "redirect") + ")" : "VIU histórico"}`);
  await shot(page, "authz", "authz-06-restrito-historico");
  await record("AUTHZ-06", ok06 && histNegado ? "PASS" : "FAIL", notas06.join(" | "));

  // AUTHZ-07: /dashboard sem permissão
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await record("AUTHZ-07", page.url().startsWith(`${BASE}/fechamento`) ? "PASS" : "FAIL", `/dashboard → ${page.url()}`);

  // AUTHZ-10 (R): nav mínima
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const navR = await navLabels(page);
  const okNavR = navR.length === 1 && navR[0] === "Estoque";
  await record("AUTHZ-10-R", okNavR ? "PASS" : "FAIL", `nav R = ${JSON.stringify(navR)}`,
    await shot(page, "authz", "authz-10-restrito-nav"));
  await ctx.close();
}

// ---------- AUTHZ-10 (Dono): nav completa ----------
{
  await dPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const navD = await navLabels(dPage);
  const esperado = ["Dashboard", "Fechamento", "Estoque", "Histórico", "Produtos", "Usuários", "Perfis", "Configurações"];
  const okNavD = esperado.every((item) => navD.includes(item));
  await record("AUTHZ-10-D", okNavD ? "PASS" : "FAIL", `nav Dono = ${JSON.stringify(navD)}`);
}

await b.close();
console.log("QA-04 browser done");
