import { BASE, DONO, browser, newPage, loginOk, sessionCookie } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
const cookie = await sessionCookie(ctx);
console.log("cookie presente:", !!cookie, cookie ? `valor ${cookie.value.slice(0, 12)}… path=${cookie.path}` : "");

// GET via ctx.request (mesma jar de cookies que a página)
const r1 = await ctx.request.get(`${BASE}/usuarios`, { maxRedirects: 0 });
console.log("ctx.request GET /usuarios →", r1.status(), r1.headers()["location"] ?? "");
const body = await r1.text();
console.log("contém dono@:", body.includes("dono@doguinho.local"));

// POST de ação SEM multipart extra — só o actionId de desligar? não. usa criarLoja com nome curto
const r2 = await ctx.request.get(`${BASE}/configuracoes`, { maxRedirects: 0 });
console.log("ctx.request GET /configuracoes →", r2.status(), r2.headers()["location"] ?? "");
const html = await r2.text();
console.log("configuracoes contém 'Nova Loja':", html.includes("Nova Loja"), "| lojas li:", (html.match(/listing-pad text-sm font-semibold/g) || []).length);
await ctx.close();
await b.close();
