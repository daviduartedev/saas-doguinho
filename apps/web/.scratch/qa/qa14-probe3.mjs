// Probe 3: /produtos?page=1 — HTML cru + erros de cliente.
import { BASE, DONO, browser, loginOk, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);

// HTML cru (sem JS): a página renderiza?
const res = await ctx.request.get(`${BASE}/produtos?page=1`);
const html = await res.text();
console.log("status:", res.status(), "| bytes:", html.length);
console.log("tem listing-frame?", html.includes("listing-frame"), "| tem 'Paginação'?", html.includes("Pagina"));
const nomes = [...html.matchAll(/value="([^"]+)"/g)].map((m) => m[1]).filter((v) => v.length > 2).slice(0, 20);
console.log("values no HTML:", JSON.stringify(nomes));

// Com JS: erros de hidratação?
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 300)));
await page.goto(`${BASE}/produtos?page=1`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
const inner = await page.locator("body").innerText();
console.log("innerText bytes:", inner.length, "| trecho:", JSON.stringify(inner.slice(0, 160)));

await ctx.close();
await b.close();
