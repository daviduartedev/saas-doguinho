// QA-11 correções: re-verificar BREAK-04 (via histórico), BREAK-13 (Estoque=5), BREAK-10 (com captura correta).
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const OC = { email: "operador.centro@doguinho.local", senha: "qa123456" };
const CENTRO = "fc2a079d3328b276610e59cc610616b5";

async function estoqueCol(page, lojaNome) {
  await page.goto(`${BASE}/estoque?per=24`, { waitUntil: "networkidle" });
  return page.evaluate((alvo) => {
    const table = document.querySelector("table");
    if (!table) return null;
    const headers = [...table.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    const col = headers.findIndex((h) => h.startsWith(alvo));
    if (col < 0) return null;
    const out = {};
    for (const tr of table.querySelectorAll("tbody tr")) {
      const cells = [...tr.querySelectorAll("th,td")].map((td) => td.textContent.trim());
      out[cells[0]] = cells[col] ?? "";
    }
    return out;
  }, lojaNome);
}

const b = await browser();

// ---------- BREAK-04 (re-verificação): entrada do histórico tem todas as linhas = 9 ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/historico?loja=${CENTRO}`, { waitUntil: "networkidle" });
  const achou = await page.evaluate(() => {
    for (const li of document.querySelectorAll("ol > li")) {
      if (li.textContent.includes("BREAK-04 refresh mid-submit")) {
        const novas = [...li.querySelectorAll("tbody tr")].map((tr) => {
          const tds = tr.querySelectorAll("td");
          return tds[2]?.textContent.trim();
        });
        return { linhas: novas.length, todas9: novas.every((v) => v === "9") };
      }
    }
    return null;
  });
  const ok = achou && achou.linhas > 0 && achou.todas9;
  await record("BREAK-04", ok ? "PASS" : "FAIL", `re-verificação histórico: entrada BREAK-04 ${achou ? `${achou.linhas} linhas, todas nova=9: ${achou.todas9}` : "NÃO encontrada"}`);
  await ctx.close();
}

// ---------- BREAK-13 (re-verificação): Estoque Centro todo = 5 ----------
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const est = await estoqueCol(page, "Centro");
  const valores = Object.entries(est ?? {}).filter(([, v]) => v !== "");
  const todos5 = valores.length > 0 && valores.every(([, v]) => v === "5");
  await record("BREAK-13", todos5 ? "PASS" : "FAIL", `re-verificação: ${valores.length} produtos com valor, todos=5: ${todos5}${todos5 ? "" : " " + JSON.stringify(est)}`);
  await ctx.close();
}

// ---------- BREAK-10 (re-execução correta): sessão expirada no meio do preenchimento ----------
for (let tentativa = 1; tentativa <= 2; tentativa++) {
  const { ctx, page } = await newPage(b);
  const pageerrors = [];
  page.on("pageerror", (e) => pageerrors.push(String(e).slice(0, 160)));
  await loginOk(page, OC);
  await page.goto(`${BASE}/fechamento?loja=${CENTRO}`, { waitUntil: "networkidle" });
  await page.locator('input[aria-label^="Quantidade restante de"]').first().fill("3");
  await ctx.clearCookies();
  await page.getByLabel("Justificativa").fill(`BREAK-10 tentativa ${tentativa}`);
  await page.getByRole("button", { name: "Enviar correção" }).click();
  await page.waitForTimeout(3000);
  const urlDepois = page.url();
  const body = await page.locator("body").innerText().catch(() => "(página indisponível)");
  const msgVisivel = body.includes("expirada") || body.includes("Erro") || body.includes("erro");
  await shot(page, "breakit", `break-10-t${tentativa}`);
  await record("BREAK-10", msgVisivel ? "PASS" : "FAIL", `t${tentativa}: url=${urlDepois.replace(BASE, "")}; msg visível=${msgVisivel}; pageerrors=${JSON.stringify(pageerrors)}`);
  await ctx.close();
}

// Estoque Centro deve continuar = 5 (nada gravado pelos submits sem sessão)
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const est = await estoqueCol(page, "Centro");
  const valores = Object.entries(est ?? {}).filter(([, v]) => v !== "");
  const intacto = valores.length > 0 && valores.every(([, v]) => v === "5");
  await record("BREAK-10", intacto ? "PASS" : "FAIL", `integridade: Estoque Centro continua todo 5: ${intacto}`);
  await ctx.close();
}

await b.close();
console.log("QA-11B-fix concluído.");
