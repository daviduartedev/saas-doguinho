// QA-03 (AUTH-04 corrigido): cria alvo2 via UI (seletores escopados) e testa rate limit.
import { BASE, DONO, browser, login, loginOk, newPage, record, shot } from "./helpers.mjs";

const ALVO = { email: "alvo2.rl@doguinho.local", senha: "qa123456" };
const b = await browser();

// Cria alvo2 (ignora se já existir)
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
  if (!(await page.locator("body").innerText()).includes(ALVO.email)) {
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
    await form.getByLabel("Nome", { exact: true }).fill("Alvo Dois RL");
    await form.getByLabel("E-mail", { exact: true }).fill(ALVO.email);
    await form.getByLabel("Senha inicial", { exact: true }).fill(ALVO.senha);
    await form.getByLabel("Centro").check();
    await form.getByRole("button", { name: "Criar usuário" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const ok = (await page.locator("body").innerText()).includes(ALVO.email);
    if (!ok) { console.log("FALHA ao criar alvo2 — abortando AUTH-04"); process.exit(1); }
  }
  console.log("alvo2 pronto");
  await ctx.close();
}

// AUTH-04: 5 senhas erradas → 6ª com senha correta deve ser bloqueada; Dono (outro e-mail) não é afetado.
{
  const { ctx, page } = await newPage(b);
  for (let i = 1; i <= 5; i++) {
    await login(page, { email: ALVO.email, senha: "errada123" });
    await page.waitForURL("**/entrar?erro=1**", { timeout: 15000 });
    console.log(`  tentativa errada ${i} → erro=1`);
  }
  await login(page, ALVO);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(700);
  const urlApos = page.url();
  const bloqueado = urlApos.includes("erro=1");
  console.log(`  6ª (senha correta) → ${urlApos}`);
  await shot(page, "auth", "auth-04-rate-limit");

  // Outro e-mail não deve estar bloqueado
  await login(page, DONO);
  const donoOk = await page.waitForURL("**/fechamento**", { timeout: 20000 }).then(() => true).catch(() => false);

  await record("AUTH-04", bloqueado && donoOk ? "PASS" : "FAIL",
    `6ª c/ senha correta bloqueada=${bloqueado} (url=${urlApos}); Dono ok=${donoOk}`);
  await ctx.close();
}

await b.close();
console.log("QA-03c done");
