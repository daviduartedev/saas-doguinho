// Setup reutilizável: garante Perfil "Restrito" + usuários OC/OM/R. Idempotente.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

export const OC = { email: "operador.centro@doguinho.local", senha: "qa123456", nome: "Operador Centro", perfil: "Operador", lojas: ["Centro"] };
export const OM = { email: "operador.multi@doguinho.local", senha: "qa123456", nome: "Operador Multi", perfil: "Operador", lojas: ["Centro", "Jardim Juliana"] };
export const RR = { email: "restrito@doguinho.local", senha: "qa123456", nome: "Restrito QA", perfil: "Restrito", lojas: ["Centro"] };

export async function ensureIdentities(b) {
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);

  // Perfil Restrito
  await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
  if (!(await page.locator("body").innerText()).includes("Restrito")) {
    await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
    await form.getByLabel("Nome").fill("Restrito");
    await form.locator('input[name="perm_read_estoque"]').setChecked(true, { force: true });
    await form.getByRole("button", { name: "Criar Perfil" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
  }

  // Usuários
  for (const u of [OC, OM, RR]) {
    await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
    if ((await page.locator("body").innerText()).includes(u.email)) continue;
    const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
    await form.getByLabel("Nome", { exact: true }).fill(u.nome);
    await form.getByLabel("E-mail", { exact: true }).fill(u.email);
    await form.getByLabel("Senha inicial", { exact: true }).fill(u.senha);
    await form.locator('select[name="perfilId"]').selectOption({ label: u.perfil });
    for (const loja of u.lojas) await form.getByLabel(loja, { exact: true }).check();
    await form.getByRole("button", { name: "Criar usuário" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
    const ok = (await page.locator("body").innerText()).includes(u.email);
    if (!ok) throw new Error(`falha ao criar ${u.email}`);
  }
  await ctx.close();
  console.log("identidades garantidas");
}

// Execução direta: node ensure-identities.mjs
if (process.argv[1] && process.argv[1].endsWith("ensure-identities.mjs")) {
  const b = await browser();
  await ensureIdentities(b);
  await b.close();
}
