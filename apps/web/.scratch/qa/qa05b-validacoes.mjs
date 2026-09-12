// QA-05b: re-verificação das validações com seletor preciso do elemento de erro (store limpa, pré-envio).
import { BASE, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { ensureIdentities, OC } from "./ensure-identities.mjs";

const b = await browser();
await ensureIdentities(b);

const qtd = (page, nome) => page.getByLabel(`Quantidade restante de ${nome}`, { exact: true });
const erroEl = (page) => page.locator("p.mt-3.text-sm.font-medium.text-ketchup").first();
async function preencher(page, nome, valor) {
  await qtd(page, nome).fill(String(valor));
  await page.waitForTimeout(150);
}
async function enviar(page) {
  await page.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await page.waitForTimeout(2500);
}
async function erro(page) {
  return (await erroEl(page).count()) > 0 ? (await erroEl(page).innerText()).trim() : null;
}

const { ctx, page } = await newPage(b);
await loginOk(page, OC);
await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });

// FECH-03: envio com campos vazios
await enviar(page);
const e03 = await erro(page);
await record("FECH-03", e03 === "Informe a quantidade restante de todos os Produtos ativos." ? "PASS" : "FAIL",
  `erro exato: "${e03 ?? "nenhum"}"`, await shot(page, "fechamento", "fech-03b-incompleto"));

// FECH-04: negativo (demais preenchidos)
await preencher(page, "Milho", "10");
await preencher(page, "Ervilha", "2");
await preencher(page, "Tomate", "3");
await preencher(page, "Cebola", "4");
await preencher(page, "Maionese", "1");
await preencher(page, "Mostarda", "2");
await preencher(page, "Salsicha", "-1");
await preencher(page, "Pão", "5");
await page.getByRole("button", { name: "2", exact: true }).click();
await page.waitForTimeout(600);
await preencher(page, "Molho de tomate", "7");
await page.getByRole("button", { name: "1", exact: true }).click();
await page.waitForTimeout(600);
await enviar(page);
const e04 = await erro(page);
await record("FECH-04", e04 === "Salsicha: Quantidade restante não pode ser negativa." ? "PASS" : "FAIL",
  `erro exato: "${e04 ?? "nenhum"}"`, await shot(page, "fechamento", "fech-04b-negativo"));

// FECH-07: acima do teto
await preencher(page, "Salsicha", "100000");
await enviar(page);
const e07 = await erro(page);
await record("FECH-07", e07 === "Salsicha: Quantidade acima do teto." ? "PASS" : "FAIL", `erro exato: "${e07 ?? "nenhum"}"`);

// FECH-08: decimal em produto "unidade"
await preencher(page, "Salsicha", "1,5");
await enviar(page);
const e08 = await erro(page);
await record("FECH-08", e08 === "Salsicha: Use um número inteiro." ? "PASS" : "FAIL", `erro exato: "${e08 ?? "nenhum"}"`);

// FECH-10: 4 casas decimais em kg
await preencher(page, "Salsicha", "5");
await preencher(page, "Milho", "0,0001");
await enviar(page);
const e10 = await erro(page);
await record("FECH-10", e10 === "Milho: Use até 3 casas decimais." ? "PASS" : "FAIL", `erro exato: "${e10 ?? "nenhum"}"`,
  await shot(page, "fechamento", "fech-10b-decimais"));

// Sanity: nada foi persistido por essas tentativas (Estoque segue vazio)
await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
const bodyEstq = await page.locator("body").innerText();
const linhaMilho = await page.locator("tr", { hasText: "Milho" }).first().innerText();
const celulaVazia = /Milho\s*kg\s*$/m.test(linhaMilho.replace(/\t/g, " ").trim()) || !linhaMilho.match(/\d/);
await record("FECH-03b", celulaVazia ? "PASS" : "FAIL",
  `tentativas inválidas não viraram Estoque (linha Milho: "${linhaMilho.replace(/\n/g, " | ")}")`);

await ctx.close();
await b.close();
console.log("QA-05b done");
