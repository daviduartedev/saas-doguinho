// QA-05: Fechamento — Rascunho → Fechamento → Estoque + fronteiras de quantidade.
// Ordem importa: validações (não persistem) antes do envio completo.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";

const OC = { email: "operador.centro@doguinho.local", senha: "qa123456" };
const b = await browser();

const qtd = (page, nome) => page.getByLabel(`Quantidade restante de ${nome}`, { exact: true });
async function preencher(page, nome, valor) {
  await qtd(page, nome).fill(String(valor));
  await page.waitForTimeout(150);
}
async function enviar(page) {
  await page.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await page.waitForTimeout(2500);
}
async function erroVisivel(page) {
  const body = await page.locator("body").innerText();
  const m = body.match(/(Informe a quantidade[^\n]*|[A-Za-zÀ-ú ]+: (Quantidade[^\n]*|Use[^\n]*))/);
  return m ? m[0] : null;
}

const { ctx, page } = await newPage(b);
await loginOk(page, OC);
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });

// FECH-02: rascunho parcial persiste após refresh
await preencher(page, "Milho", "10");
await preencher(page, "Salsicha", "5");
await page.getByRole("button", { name: "Guardar rascunho" }).click();
await page.waitForTimeout(1500);
await page.reload({ waitUntil: "networkidle" });
const vMilho = await qtd(page, "Milho").inputValue();
const vSalsicha = await qtd(page, "Salsicha").inputValue();
const bannerRascunho = (await page.locator("body").innerText()).includes("Rascunho na Loja");
await record("FECH-02", vMilho === "10" && vSalsicha === "5" && bannerRascunho ? "PASS" : "FAIL",
  `após refresh: Milho=${vMilho} Salsicha=${vSalsicha} banner=${bannerRascunho}`,
  await shot(page, "fechamento", "fech-02-rascunho-persiste"));

// FECH-03: envio com campo vazio
await enviar(page);
const e03 = await erroVisivel(page);
await record("FECH-03", e03?.includes("Informe a quantidade restante de todos os Produtos ativos") ? "PASS" : "FAIL",
  `erro: ${e03 ?? "nenhum"}`, await shot(page, "fechamento", "fech-03-incompleto"));

// FECH-04: negativo
await preencher(page, "Ervilha", "2");
await preencher(page, "Salsicha", "-1");
await enviar(page);
const e04 = await erroVisivel(page);
await record("FECH-04", e04?.includes("não pode ser negativa") ? "PASS" : "FAIL", `erro: ${e04 ?? "nenhum"}`);

// FECH-07: acima do teto
await preencher(page, "Salsicha", "100000");
await enviar(page);
const e07 = await erroVisivel(page);
await record("FECH-07", e07?.includes("acima do teto") ? "PASS" : "FAIL", `erro: ${e07 ?? "nenhum"}`);

// FECH-08: decimal em unidade
await preencher(page, "Salsicha", "1,5");
await enviar(page);
const e08 = await erroVisivel(page);
await record("FECH-08", e08?.includes("Use um número inteiro") ? "PASS" : "FAIL", `erro: ${e08 ?? "nenhum"}`);

// FECH-10: 4 casas decimais em kg
await preencher(page, "Salsicha", "5");
await preencher(page, "Milho", "0,0001");
await enviar(page);
const e10 = await erroVisivel(page);
await record("FECH-10", e10?.includes("Use até 3 casas decimais") ? "PASS" : "FAIL", `erro: ${e10 ?? "nenhum"}`,
  await shot(page, "fechamento", "fech-10-decimais"));

// FECH-01/05/06/09/11: envio completo com fronteiras válidas, cruzando a paginação 8+1
await preencher(page, "Milho", "0,001");   // FECH-09
await preencher(page, "Ervilha", "2,5");
await preencher(page, "Tomate", "3");
await preencher(page, "Cebola", "4");
await preencher(page, "Maionese", "1,5");
await preencher(page, "Mostarda", "0,75");
await preencher(page, "Salsicha", "99999"); // FECH-06
await preencher(page, "Pão", "0");          // FECH-05
await page.getByRole("button", { name: "2", exact: true }).click(); // página 2 (Molho de tomate)
await page.waitForTimeout(600);
await preencher(page, "Molho de tomate", "7");
await shot(page, "fechamento", "fech-11-pagina-2");
await enviar(page);
const bodyPos = await page.locator("body").innerText();
const enviado = bodyPos.includes("Enviado. Isso é o Estoque agora");
await record("FECH-01", enviado ? "PASS" : "FAIL", `envio completo: ${enviado ? "confirmado" : "sem confirmação"}`,
  await shot(page, "fechamento", "fech-01-enviado"));
await record("FECH-11", enviado ? "PASS" : "FAIL", "pág.1 + pág.2 preenchidas, envio a partir da pág.2");

// FECH-13: Estoque reflete item a item (visão OC: só coluna Centro)
await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
const esperado = { "Milho": "0.001", "Ervilha": "2.5", "Tomate": "3", "Cebola": "4", "Maionese": "1.5", "Mostarda": "0.75", "Salsicha": "99999", "Pão": "0" };
const falhas = [];
for (const [nome, valor] of Object.entries(esperado)) {
  const linha = page.locator("tr", { hasText: nome }).first();
  const texto = await linha.innerText();
  if (!texto.includes(valor)) falhas.push(`${nome}: esperado ${valor} em "${texto.replace(/\n/g, " | ")}"`);
}
await page.goto(`${BASE}/estoque?page=2`, { waitUntil: "networkidle" });
const linhaMolho = await page.locator("tr", { hasText: "Molho de tomate" }).first().innerText();
if (!linhaMolho.includes("7")) falhas.push(`Molho de tomate: esperado 7 em "${linhaMolho.replace(/\n/g, " | ")}"`);
await record("FECH-13", falhas.length === 0 ? "PASS" : "FAIL",
  falhas.length === 0 ? "9/9 produtos conferem no Estoque" : falhas.join(" ; "),
  await shot(page, "fechamento", "fech-13-estoque"));
await ctx.close();

// FECH-12 (Dono, por último — desativar é irreversível na UI): sem Produtos ativos
{
  const { ctx: dCtx, page: dPage } = await newPage(b);
  await loginOk(dPage, DONO);
  await dPage.goto(`${BASE}/produtos`, { waitUntil: "networkidle" });
  for (let i = 0; i < 12; i++) {
    const btn = dPage.getByRole("button", { name: "Desativar" }).first();
    if ((await btn.count()) === 0) break;
    await btn.click();
    await dPage.waitForLoadState("networkidle");
    await dPage.waitForTimeout(500);
  }
  const restam = await dPage.getByRole("button", { name: "Desativar" }).count();
  console.log("produtos ainda ativos:", restam);

  const { ctx: ocCtx, page: ocPage } = await newPage(b);
  await loginOk(ocPage, OC);
  await ocPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const bodyVazio = await ocPage.locator("body").innerText();
  const msgVazio = bodyVazio.includes("Não há Produtos ativos");
  const btnEnviar = ocPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ });
  const desabilitado = (await btnEnviar.count()) === 0 || (await btnEnviar.isDisabled());
  await record("FECH-12", msgVazio && desabilitado ? "PASS" : "FAIL",
    `mensagem=${msgVazio}; enviar desabilitado=${desabilitado}`,
    await shot(ocPage, "fechamento", "fech-12-sem-produtos"));
  await ocCtx.close();
  await dCtx.close();
}

await b.close();
console.log("QA-05 done");
