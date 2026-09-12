// QA-03: Auth & sessão — executa AUTH-01..AUTH-10 da matriz.
import { BASE, DONO, browser, login, loginOk, logout, newPage, record, sessionCookie, shot } from "./helpers.mjs";

const b = await browser();

// --- AUTH-01: login feliz + flags do cookie ---
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  const ok = page.url().startsWith(`${BASE}/fechamento`);
  const cookie = await sessionCookie(ctx);
  const flags = cookie
    ? `httpOnly=${cookie.httpOnly} sameSite=${cookie.sameSite} path=${cookie.path} secure=${cookie.secure}`
    : "COOKIE AUSENTE";
  await record("AUTH-01", ok && cookie?.httpOnly ? "PASS" : "FAIL", `url=${page.url()} ${flags}`, await shot(page, "auth", "auth-01-pos-login"));
  await ctx.close();
}

// --- setup: usuário descartável para o teste de rate limit (via UI, como Dono) ---
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  await page.getByLabel("Nome", { exact: true }).fill("Alvo RL");
  await page.getByLabel("E-mail", { exact: true }).fill("alvo.rl@doguinho.local");
  await page.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
  await page.getByLabel("Centro").check();
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await page.waitForLoadState("networkidle");
  const criado = await page.getByText("alvo.rl@doguinho.local").count();
  await record("AUTH-SETUP", criado > 0 ? "PASS" : "FAIL", "usuário descartável alvo.rl criado via UI", await shot(page, "auth", "auth-setup-usuario"));
  await logout(page);
  await ctx.close();
}

// --- AUTH-02 / AUTH-03: mensagem genérica idêntica ---
let msg02 = "";
{
  const { ctx, page } = await newPage(b);
  await login(page, { email: "naoexiste@doguinho.local", senha: "qualquer1" });
  await page.waitForURL("**/entrar?erro=1**", { timeout: 15000 });
  msg02 = (await page.locator("form p").first().textContent())?.trim() ?? "";
  await record("AUTH-03", msg02 ? "PASS" : "FAIL", `inexistente → "${msg02}"`, await shot(page, "auth", "auth-03-inexistente"));
  await ctx.close();
}
{
  const { ctx, page } = await newPage(b);
  await login(page, { email: DONO.email, senha: "senhaerrada" });
  await page.waitForURL("**/entrar?erro=1**", { timeout: 15000 });
  const msg = (await page.locator("form p").first().textContent())?.trim() ?? "";
  const iguais = msg === msg02 && msg.length > 0;
  await record("AUTH-02", iguais ? "PASS" : "FAIL", `senha errada → "${msg}" | idêntica a AUTH-03: ${iguais}`, await shot(page, "auth", "auth-02-senha-errada"));
  await ctx.close();
}

// --- AUTH-05: logout ---
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await logout(page);
  const cookie = await sessionCookie(ctx);
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const redir = page.url().startsWith(`${BASE}/entrar`);
  await record("AUTH-05", !cookie && redir ? "PASS" : "FAIL", `cookie após logout: ${cookie ? "presente" : "ausente"}; /fechamento → ${page.url()}`);
  await ctx.close();
}

// --- AUTH-06: cookie adulterado ---
{
  const { ctx, page } = await newPage(b);
  await ctx.addCookies([{ name: "doguinho_session", value: "deadbeef".repeat(8), url: BASE }]);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const redir = page.url().startsWith(`${BASE}/entrar`);
  await record("AUTH-06", redir ? "PASS" : "FAIL", `token lixo → ${page.url()}`);
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

// --- AUTH-10: campos vazios (validação do browser, sem POST) ---
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

// --- AUTH-04 (por último): rate limit 5/15min por e-mail ---
{
  const { ctx, page } = await newPage(b);
  for (let i = 1; i <= 5; i++) {
    await login(page, { email: "alvo.rl@doguinho.local", senha: "errada123" });
    await page.waitForURL("**/entrar?erro=1**", { timeout: 15000 });
  }
  // 6ª tentativa com a senha CORRETA — se o rate limit bloqueia antes de verificar, falha mesmo assim
  await login(page, { email: "alvo.rl@doguinho.local", senha: "qa123456" });
  await page.waitForURL("**/entrar**", { timeout: 15000 });
  const bloqueado = page.url().includes("erro=1");
  // e outra conta (Dono) continua funcionando → limite é por e-mail
  await login(page, DONO);
  await page.waitForURL("**/fechamento**", { timeout: 20000 }).catch(() => {});
  const donoOk = page.url().startsWith(`${BASE}/fechamento`);
  await record("AUTH-04", bloqueado && donoOk ? "PASS" : "FAIL", `6ª c/ senha correta bloqueada=${bloqueado}; Dono ok=${donoOk}`, await shot(page, "auth", "auth-04-rate-limit"));
  await ctx.close();
}

await b.close();
console.log("QA-03 done");
