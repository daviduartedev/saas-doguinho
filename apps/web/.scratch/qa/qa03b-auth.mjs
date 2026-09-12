// QA-03 (continuação): AUTH-04, 06 (tolerante ao loop), 07, 08, 09, 10.
import { BASE, DONO, browser, login, loginOk, newPage, record, sessionCookie, shot } from "./helpers.mjs";

const b = await browser();

// --- AUTH-06: cookie adulterado — captura o loop sem quebrar o script ---
{
  const { ctx, page } = await newPage(b);
  await ctx.addCookies([{ name: "doguinho_session", value: "deadbeef".repeat(8), url: BASE }]);
  let outcome = "";
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle", timeout: 20000 });
    outcome = `página carregou: ${page.url()}`;
  } catch (error) {
    outcome = `ERRO DE NAVEGAÇÃO: ${String(error).includes("ERR_TOO_MANY_REDIRECTS") ? "ERR_TOO_MANY_REDIRECTS (loop)" : String(error).slice(0, 120)}`;
  }
  const pass = page.url().startsWith(`${BASE}/entrar`) && !outcome.includes("LOOP") && !outcome.includes("REDIRECTS");
  await record("AUTH-06", pass ? "PASS" : "FAIL", `token lixo → ${outcome}`, await shot(page, "auth", "auth-06-loop").catch(() => ""));
  await ctx.close();
}

// --- AUTH-07: logado acessando /entrar ---
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await record("AUTH-07", page.url().startsWith(`${BASE}/fechamento`) ? "PASS" : "FAIL", `logado em /entrar → ${page.url()}`);
  await ctx.close();
}

// --- AUTH-08: anônimo em rotas protegidas ---
{
  const { ctx, page } = await newPage(b);
  const alvos = ["/dashboard", "/usuarios", "/"];
  let all = true;
  for (const alvo of alvos) {
    await page.goto(`${BASE}${alvo}`, { waitUntil: "networkidle" });
    const ok = page.url().startsWith(`${BASE}/entrar`);
    if (!ok) all = false;
    console.log(`  anon ${alvo} → ${page.url()}`);
  }
  await record("AUTH-08", all ? "PASS" : "FAIL", "3 rotas redirecionaram a /entrar");
  await ctx.close();
}

// --- AUTH-09: cookie apagado no meio da sessão ---
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await ctx.clearCookies();
  await page.goto(`${BASE}/estoque`, { waitUntil: "networkidle" });
  await record("AUTH-09", page.url().startsWith(`${BASE}/entrar`) ? "PASS" : "FAIL", `sem cookie → ${page.url()}`);
  await ctx.close();
}

// --- AUTH-10: campos vazios (sem POST) ---
{
  const { ctx, page } = await newPage(b);
  let postFeito = false;
  page.on("request", (r) => { if (r.method() === "POST") postFeito = true; });
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForTimeout(1200);
  const ficou = page.url().startsWith(`${BASE}/entrar`);
  await record("AUTH-10", ficou && !postFeito ? "PASS" : "FAIL", `url=${page.url()} POST=${postFeito}`);
  await ctx.close();
}

// --- AUTH-04: rate limit 5/15min por e-mail (por último; bloqueia alvo.rl) ---
{
  const { ctx, page } = await newPage(b);
  for (let i = 1; i <= 5; i++) {
    await login(page, { email: "alvo.rl@doguinho.local", senha: "errada123" });
    await page.waitForURL("**/entrar?erro=1**", { timeout: 15000 });
  }
  await login(page, { email: "alvo.rl@doguinho.local", senha: "qa123456" });
  await page.waitForURL("**/entrar**", { timeout: 15000 });
  const bloqueado = page.url().includes("erro=1");
  await login(page, DONO);
  const donoOk = await page.waitForURL("**/fechamento**", { timeout: 20000 }).then(() => true).catch(() => false);
  await record("AUTH-04", bloqueado && donoOk ? "PASS" : "FAIL", `6ª c/ senha correta bloqueada=${bloqueado}; Dono ok=${donoOk}`, await shot(page, "auth", "auth-04-rate-limit"));
  await ctx.close();
}

await b.close();
console.log("QA-03b done");
