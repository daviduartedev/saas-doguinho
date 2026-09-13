// Global setup da suíte E2E: garante as identidades de QA (idempotente).
// Roda uma vez antes dos testes, contra o dev server (memory store reseedado
// a cada restart do servidor — por isso a garantia é feita via HTTP/UI).
// Os três Operadores por Loja (centro/juliana/magalhaes, senha coruja) vêm do seed.
import { chromium, expect, type Page } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const DONO = { email: "dono@doguinho.local", senha: "coruja" };

const IDENTIDADES = [
  { email: "operador.multi@doguinho.local", senha: "qa123456", nome: "Operador Multi", perfil: "Operador", lojas: ["Centro", "Jardim Juliana"] },
  { email: "restrito@doguinho.local", senha: "qa123456", nome: "Restrito QA", perfil: "Restrito", lojas: ["Centro"] },
  { email: "semloja@doguinho.local", senha: "qa123456", nome: "Sem Loja", perfil: "Operador", lojas: [] },
];

async function loginDono(page: Page) {
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("E-mail", { exact: true }).fill(DONO.email);
  await page.getByLabel("Senha", { exact: true }).fill(DONO.senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/fechamento**");
}

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await loginDono(page);

    // Perfil "Restrito" (somente read_estoque)
    await page.goto(`${BASE}/perfis`, { waitUntil: "networkidle" });
    if (!(await page.locator("body").innerText()).includes("Restrito")) {
      await page.goto(`${BASE}/perfis?novo=1`, { waitUntil: "networkidle" });
      const form = page.locator("form", { has: page.getByRole("button", { name: "Criar Perfil" }) });
      await form.getByLabel("Nome").fill("Restrito");
      await form.locator('input[name="perm_read_estoque"]').setChecked(true, { force: true });
      await form.getByRole("button", { name: "Criar Perfil" }).click();
      await page.waitForLoadState("networkidle");
    }

    for (const u of IDENTIDADES) {
      await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
      if ((await page.locator("body").innerText()).includes(u.email)) continue;
      const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
      await form.getByLabel("Nome", { exact: true }).fill(u.nome);
      await form.getByLabel("E-mail", { exact: true }).fill(u.email);
      await form.getByLabel("Senha inicial", { exact: true }).fill(u.senha);
      await form.locator('select[name="perfilId"]').selectOption({ label: u.perfil });
      for (const loja of u.lojas) await form.getByLabel(loja, { exact: true }).check();
      await form.getByRole("button", { name: "Criar usuário" }).click();
      // bcrypt ~1s: espera web-first em vez de networkidle
      await expect(page.locator("body")).toContainText(u.email, { timeout: 15_000 });
    }
  } finally {
    await browser.close();
  }
}
