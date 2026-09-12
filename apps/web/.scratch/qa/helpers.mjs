// Shared QA helpers: login, contexts, verdict log, evidence.
import { chromium } from "@playwright/test";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const BASE = process.env.QA_BASE ?? "http://localhost:3000";
export const DONO = { email: "dono@doguinho.local", senha: "coruja" };

const ROOT = path.resolve("../../docs/qa/evidence");
const RESULTS = path.join(ROOT, "results.jsonl");

export async function record(scenario, verdict, note = "", evidence = "") {
  await mkdir(ROOT, { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), scenario, verdict, note, evidence });
  await appendFile(RESULTS, line + "\n", "utf8");
  console.log(`${verdict.padEnd(10)} ${scenario} ${note}${evidence ? ` [${evidence}]` : ""}`);
}

export async function shot(page, area, name) {
  const dir = path.join(ROOT, area);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

export async function browser() {
  return chromium.launch();
}

export async function newPage(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 850 }, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
  return { ctx, page };
}

export async function login(page, { email, senha }) {
  await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

export async function loginOk(page, creds) {
  await login(page, creds);
  await page.waitForURL("**/fechamento**", { timeout: 20000 });
}

export async function logout(page) {
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/entrar**", { timeout: 15000 });
}

export async function sessionCookie(ctx) {
  const cookies = await ctx.cookies(BASE);
  return cookies.find((c) => c.name === "doguinho_session") ?? null;
}
