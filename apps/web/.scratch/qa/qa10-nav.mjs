// QA-10: Navegação e estados de erro.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";

const ROTAS = ["/dashboard", "/fechamento", "/estoque", "/historico", "/produtos", "/usuarios", "/perfis", "/configuracoes"];
const b = await browser();
const { ctx, page } = await newPage(b);
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 120)));
await loginOk(page, DONO);

// NAV-01 + NAV-03: refresh e URL direta em cada rota
{
  const falhas = [];
  for (const rota of ROTAS) {
    pageErrors.length = 0;
    await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const urlOk = page.url().includes(rota);
    await page.reload({ waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    const quebrou = pageErrors.length > 0 || body.length < 50;
    if (!urlOk || quebrou) falhas.push(`${rota}: urlOk=${urlOk} erros=${pageErrors.length}`);
  }
  await record("NAV-01", falhas.length === 0 ? "PASS" : "FAIL", falhas.join(" | ") || "8 rotas: refresh limpo");
  await record("NAV-03", falhas.length === 0 ? "PASS" : "FAIL", falhas.join(" | ") || "8 rotas: URL direta limpa");
}

// NAV-02: back/forward após login e navegação
{
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  await page.goBack({ waitUntil: "networkidle" });
  const voltou = page.url().includes("/fechamento");
  await page.goForward({ waitUntil: "networkidle" });
  const avancou = page.url().includes("/estoque");
  const body = await page.locator("body").innerText();
  await record("NAV-02", voltou && avancou && body.length > 50 ? "PASS" : "FAIL",
    `back→${voltou ? "fechamento" : page.url()}; forward→${avancou ? "estoque" : page.url()}`);
}

// NAV-04: ?loja= lixo / vazio
{
  await page.goto(`${BASE}/estoque?loja=lixo`, { waitUntil: "networkidle" });
  const body1 = await page.locator("body").innerText();
  const okLixo = body1.includes("Centro") && pageErrors.length === 0;
  await page.goto(`${BASE}/estoque?loja=`, { waitUntil: "networkidle" });
  const body2 = await page.locator("body").innerText();
  const okVazio = body2.includes("Centro");
  await record("NAV-04", okLixo && okVazio ? "PASS" : "FAIL", `?loja=lixo fallback=${okLixo}; ?loja= vazio=${okVazio}`);
}

// NAV-05: rota inexistente
{
  const resp = await page.goto(`${BASE}/nao-existe`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const eh404 = resp?.status() === 404 || body.includes("404") || body.includes("não encontrada") || body.includes("not found");
  await record("NAV-05", eh404 ? "PASS" : "FAIL", `/nao-existe → status=${resp?.status()}; corpo sugere 404=${eh404}`,
    await shot(page, "nav", "nav-05-404"));
}

// NAV-06: histórico de Loja sem envios (Magalhães)
{
  await page.goto(`${BASE}/historico?loja=todas`, { waitUntil: "networkidle" });
  // seleciona Magalhães no switcher
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Magalhães" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  const body = await page.locator("body").innerText();
  const vazio = body.includes("Nenhum Fechamento nesta Loja");
  await record("NAV-06", vazio ? "PASS" : "FAIL", `Magalhães: estado vazio=${vazio}`,
    await shot(page, "nav", "nav-06-historico-vazio"));
}

// NAV-09: segunda aba na mesma sessão
{
  const page2 = await ctx.newPage();
  await page2.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const ok = page2.url().includes("/estoque") && (await page2.locator("body").innerText()).includes("Salsicha");
  await record("NAV-09", ok ? "PASS" : "FAIL", `2ª aba mesma sessão: estoque carrega=${ok}`);
  await page2.close();
}

// NAV-08: offline durante envio de Fechamento (como Dono em Centro — já houve hoje → correção)
{
  const { ctx: oCtx, page: oPage } = await newPage(b);
  await loginOk(oPage, DONO);
  await oPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  // estado do Estoque antes
  await oPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const antes = await oPage.locator("tr", { hasText: "Salsicha" }).first().innerText();
  await oPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  await oPage.getByLabel("Quantidade restante de Salsicha", { exact: true }).fill("1");
  await oPage.locator("#justificativa").fill("teste offline");
  await oCtx.setOffline(true);
  await oPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ }).click();
  await oPage.waitForTimeout(4000);
  const bodyOff = await oPage.locator("body").innerText();
  const travou = !bodyOff.includes("Enviado. Isso é o Estoque agora");
  await shot(oPage, "nav", "nav-08-offline");
  await oCtx.setOffline(false);
  // Estoque inalterado?
  await oPage.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  const depois = await oPage.locator("tr", { hasText: "Salsicha" }).first().innerText();
  const inalterado = antes === depois;
  await record("NAV-08", travou && inalterado ? "PASS" : "FAIL",
    `offline: envio não confirmado=${travou}; Estoque inalterado=${inalterado} (antes="${antes.replace(/\n/g, "|")}" depois="${depois.replace(/\n/g, "|")}")`);
  await oCtx.close();
}

// NAV-07: mobile 375×667
{
  const { ctx: mCtx, page: mPage } = await newPage(b, { viewport: { width: 375, height: 667 } });
  await loginOk(mPage, DONO);
  const notas = [];
  for (const rota of ["/fechamento", "/estoque", "/usuarios"]) {
    await mPage.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
    const overflowX = await mPage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const body = await mPage.locator("body").innerText();
    notas.push(`${rota}: overflowX=${overflowX} conteúdo=${body.length > 50}`);
    await shot(mPage, "nav", `nav-07-mobile${rota.replace(/\//g, "_")}`);
  }
  // ação principal alcançável no mobile: botão enviar do fechamento
  await mPage.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const btn = mPage.getByRole("button", { name: /Enviar fechamento|Enviar correção/ });
  const clicavel = (await btn.count()) > 0 && (await btn.isVisible());
  await record("NAV-07", notas.every((n) => n.includes("conteúdo=true")) && clicavel ? "PASS" : "FAIL",
    `${notas.join(" | ")}; botão enviar visível=${clicavel}`);
  await mCtx.close();
}

await ctx.close();
await b.close();
console.log("QA-10 done");
