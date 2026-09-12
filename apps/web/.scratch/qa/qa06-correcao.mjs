// QA-06: Correção e Histórico. Store limpa → OC envia V1 → correções.
import { BASE, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { ensureIdentities, OC, RR } from "./ensure-identities.mjs";

const V1 = { "Milho": "10", "Ervilha": "20", "Tomate": "30", "Cebola": "40", "Maionese": "11", "Mostarda": "22", "Salsicha": "33", "Pão": "44", "Molho de tomate": "55" };
const b = await browser();
await ensureIdentities(b);

const qtd = (page, nome) => page.getByLabel(`Quantidade restante de ${nome}`, { exact: true });
const erroEl = (page) => page.locator("p.mt-3.text-sm.font-medium.text-ketchup").first();
async function preencherTudo(page, valores) {
  const entradas = Object.entries(valores);
  for (const [nome, valor] of entradas.slice(0, 8)) await qtd(page, nome).fill(valor);
  await page.getByRole("button", { name: "2", exact: true }).click();
  await page.waitForTimeout(500);
  await qtd(page, entradas[8][0]).fill(entradas[8][1]);
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.waitForTimeout(500);
}
async function enviar(page) {
  await page.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await page.waitForTimeout(2500);
}
async function erro(page) {
  return (await erroEl(page).count()) > 0 ? (await erroEl(page).innerText()).trim() : null;
}
async function contarHistorico(page) {
  await page.goto(`${BASE}/historico`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const fechamentos = (body.match(/Fechamento · /g) ?? []).length;
  const correcoes = (body.match(/Correção · /g) ?? []).length;
  return { fechamentos, correcoes, body };
}

const { ctx, page } = await newPage(b);
await loginOk(page, OC);
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });

// Setup: envio V1
await preencherTudo(page, V1);
await enviar(page);
const v1Ok = (await page.locator("body").innerText()).includes("Enviado. Isso é o Estoque agora");
await record("CORR-00", v1Ok ? "PASS" : "FAIL", `setup: V1 enviado=${v1Ok}`);

// CORR-01: 2º envio diferente SEM Justificativa
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
await qtd(page, "Milho").fill("15");
await enviar(page);
const e01 = await erro(page);
await record("CORR-01", e01 === "Correção exige Justificativa." ? "PASS" : "FAIL", `erro: "${e01 ?? "nenhum"}"`,
  await shot(page, "correcao", "corr-01-sem-justificativa"));

// CORR-04: Justificativa só com espaços
await page.locator("#justificativa").fill("   ");
await enviar(page);
const e04 = await erro(page);
await record("CORR-04", e04 === "Correção exige Justificativa." ? "PASS" : "FAIL", `espaços → erro: "${e04 ?? "nenhum"}"`);

// CORR-02: com Justificativa → Correção criada
await page.locator("#justificativa").fill("Contagem refeita após inventário");
await enviar(page);
const corrigido = (await page.locator("body").innerText()).includes("Enviado. Isso é o Estoque agora");
await record("CORR-02", corrigido ? "PASS" : "FAIL", `correção enviada=${corrigido}`,
  await shot(page, "correcao", "corr-02-enviada"));

// CORR-07: Estoque reflete a Correção (Milho 10 → 15)
await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
const linhaMilho = await page.locator("tr", { hasText: "Milho" }).first().innerText();
await record("CORR-07", linhaMilho.includes("15") ? "PASS" : "FAIL",
  `Estoque Milho: "${linhaMilho.replace(/\n/g, " | ")}"`, await shot(page, "correcao", "corr-07-estoque"));

// CORR-03: reenvio IDÊNTICO ao 1º envio, sem Justificativa → idempotente
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
await preencherTudo(page, V1);
await page.locator("#justificativa").fill("");
await enviar(page);
const bodyIdem = await page.locator("body").innerText();
const idemOk = bodyIdem.includes("Enviado. Isso é o Estoque agora");
const { fechamentos, correcoes } = await contarHistorico(page);
await record("CORR-03", idemOk && fechamentos === 1 && correcoes === 1 ? "PASS" : "FAIL",
  `reenvio idêntico ok=${idemOk}; histórico: ${fechamentos} fechamento + ${correcoes} correção (esperado 1+1)`,
  await shot(page, "correcao", "corr-03-historico"));

// CORR-05: histórico com autor, horário, Justificativa, tabela de diferenças
const { body: bodyHist } = await contarHistorico(page);
const checks = [
  bodyHist.includes("Fechamento · Operador Centro"),
  bodyHist.includes("Correção · Operador Centro"),
  bodyHist.includes("Contagem refeita após inventário"),
  bodyHist.includes("Anterior") && bodyHist.includes("Nova") && bodyHist.includes("Δ"),
];
await record("CORR-05", checks.every(Boolean) ? "PASS" : "FAIL",
  `autor/tipo/justificativa/tabela: ${checks.map((c) => (c ? "ok" : "FALTA")).join(",")}`,
  await shot(page, "correcao", "corr-05-historico"));
await ctx.close();

// CORR-06: R (sem submit_correcao) tenta corrigir
{
  const { ctx: rCtx, page: rPage } = await newPage(b);
  await loginOk(rPage, RR);
  await rPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const btn = rPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ });
  const temBtn = (await btn.count()) > 0;
  let erroR = null;
  if (temBtn) {
    await btn.click();
    await rPage.waitForTimeout(2500);
    erroR = await erro(rPage);
  }
  await record("CORR-06", erroR === "Sem autorização." ? "PASS" : "FAIL",
    `botão visível=${temBtn} (QA-003); ao clicar: "${erroR ?? "nenhum"}"`,
    await shot(rPage, "correcao", "corr-06-restrito"));
  await rCtx.close();
}

await b.close();
console.log("QA-06 done");
