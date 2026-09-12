// QA-11F: evidência limpa de QA-009 (criarLojaAction 500 mesmo em sucesso) + vereditos corrigidos.
import { BASE, DONO, browser, newPage, loginOk, record, shot } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

// QA-009 reprodução 2 (1ª = BREAK-09 emoji/RTL): criar Loja pela UI
await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
await page.locator("input#nome").fill("Loja Prova Redirect");
await page.getByRole("button", { name: "Criar Loja" }).click();
await page.waitForTimeout(2500);
const body = await page.locator("body").innerText();
const crash = body.includes("Application error") || body.includes("client-side exception");
await shot(page, "breakit", "qa-009-crash-apos-criar-loja");
// a Loja foi criada apesar do crash?
await page.goto(`${BASE}/configuracoes`, { waitUntil: "networkidle" });
const lojas = await page.locator("ul.listing-frame > li").allInnerTexts();
const criou = lojas.some((l) => l.includes("Loja Prova Redirect"));
await record("BREAK-09", crash && criou ? "FAIL" : "PASS", `QA-009 repro 2: criar Loja pela UI → crash=${crash} mas Loja criada=${criou} (redirect() dentro do try → fail() sempre)`, "breakit/qa-009-crash-apos-criar-loja.png");

// vereditos corrigidos BREAK-14 (contagem real: 2 usuários por e-mail — probe12)
await record("BREAK-14", "FAIL", "CORRIGIDO: corrida criou 2 usuários com race@doguinho.local (pág.1) e 2 com race2@doguinho.local (pág.2) — check-then-insert sobre bcrypt lento, sem UNIQUE. Reproduzido 2×. (contagem anterior 8/6 era artefato de clamp de paginação)");
await record("BREAK-09", "FAIL", "CORRIGIDO: 10k nome de Loja ACEITO e persistido (sem limite server-side); resposta 500 pelo bug do redirect (QA-009). Emoji/RTL aceitos e renderizam OK.");

await ctx.close();
await b.close();
console.log("QA-11F concluído.");
