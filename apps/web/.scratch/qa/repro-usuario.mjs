// Repro 2: criar usuário — isolar o form "Novo usuário" e capturar o erro real.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
page.on("response", (r) => { if (r.request().method() === "POST") console.log("POST", r.url(), r.status()); });

await loginOk(page, DONO);
await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });

const form = page.locator("form", { has: page.getByRole("button", { name: "Criar usuário" }) });
await form.getByLabel("Nome", { exact: true }).fill("Alvo Dois");
await form.getByLabel("E-mail", { exact: true }).fill("alvo2.rl@doguinho.local");
await form.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
await form.getByLabel("Centro").check();
console.log("centro checked:", await form.getByLabel("Centro").isChecked());

await form.getByRole("button", { name: "Criar usuário" }).click();
await page.waitForTimeout(3000);
console.log("url:", page.url());
const bodyText = await page.locator("body").innerText();
console.log("'Não foi possível':", bodyText.includes("Não foi possível"));
console.log("alvo2 na lista:", bodyText.includes("alvo2.rl@doguinho.local"));
console.log("digest:", bodyText.match(/Digest:\s*(\S+)/)?.[1] ?? "nenhum");
await b.close();
