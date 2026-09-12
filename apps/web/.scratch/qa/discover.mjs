// QA-01 Discovery: map the real application as Dono via Playwright.
// Output: docs/qa/evidence/discovery/<route>.aria.yml + <route>.png
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("../../docs/qa/evidence/discovery");
await mkdir(OUT, { recursive: true });

const routes = [
  ["dashboard", "/dashboard"],
  ["fechamento", "/fechamento"],
  ["estoque", "/estoque"],
  ["historico", "/historico"],
  ["produtos", "/produtos"],
  ["perfis", "/perfis"],
  ["usuarios", "/usuarios"],
  ["configuracoes", "/configuracoes"],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 850 } });
const report = [];

async function snap(name) {
  await page.waitForLoadState("networkidle");
  const aria = await page.locator("body").ariaSnapshot();
  await writeFile(path.join(OUT, `${name}.aria.yml`), aria, "utf8");
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const url = page.url();
  report.push({ name, url });
  console.log(`--- ${name} ${url}`);
}

// public page
await page.goto(`${BASE}/entrar`, { waitUntil: "domcontentloaded" });
await snap("entrar");

// login as Dono (seed)
await page.getByLabel("E-mail", { exact: true }).fill("dono@doguinho.local");
await page.getByLabel("Senha", { exact: true }).fill("coruja");
await page.getByRole("button", { name: /entrar/i }).click();
await page.waitForURL("**/fechamento**", { timeout: 15000 });
console.log("login ok ->", page.url());

for (const [name, route] of routes) {
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
    await snap(name);
  } catch (error) {
    report.push({ name, url: "ERROR", error: String(error).slice(0, 200) });
    console.log(`!!! ${name} failed: ${error}`);
  }
}

// root redirect behavior (logged in)
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await snap("root-logged-in");

console.log(JSON.stringify(report, null, 2));
await browser.close();
