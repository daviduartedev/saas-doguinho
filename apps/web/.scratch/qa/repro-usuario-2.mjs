// Repro fiel do bloco AUTH-SETUP do qa03 (seletores não-escopados) em store limpa.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
page.on("response", (r) => { if (r.request().method() === "POST") console.log("POST", r.url(), r.status()); });

await loginOk(page, DONO);
await page.goto(`${BASE}/usuarios`, { waitUntil: "networkidle" });
await page.getByLabel("Nome", { exact: true }).fill("Alvo RL");
await page.getByLabel("E-mail", { exact: true }).fill("alvo.rl@doguinho.local");
await page.getByLabel("Senha inicial", { exact: true }).fill("qa123456");
await page.getByLabel("Centro").check();
await page.getByRole("button", { name: "Criar usuário" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
const bodyText = await page.locator("body").innerText();
console.log("url:", page.url());
console.log("'Não foi possível':", bodyText.includes("Não foi possível"));
console.log("alvo.rl na lista:", bodyText.includes("alvo.rl@doguinho.local"));
console.log("digest:", bodyText.match(/Digest:\s*(\S+)/)?.[1] ?? "nenhum");
await b.close();
