import { BASE, DONO, browser, newPage, loginOk, sessionCookie } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
const cookie = await sessionCookie(ctx);
const html = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
const actionId = html.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1];
const nome = `Probe${Date.now() % 100000}`;

async function tentar(rotulo, extra) {
  const resp = await ctx.request.post(`${BASE}/configuracoes`, {
    multipart: { [actionId]: "", nome: `${rotulo}${nome}` },
    maxRedirects: 0,
    ...extra,
  });
  console.log(rotulo, "→", resp.status(), resp.headers()["location"] ?? "");
}

await tentar("A-sem-extra", {});
await tentar("B-cookie-explicito", { headers: { Cookie: `doguinho_session=${cookie.value}` } });
await tentar("C-origin", { headers: { Origin: BASE } });
await tentar("D-cookie+origin", { headers: { Cookie: `doguinho_session=${cookie.value}`, Origin: BASE } });

const depois = await (await ctx.request.get(`${BASE}/configuracoes`)).text();
for (const r of ["A-sem-extra", "B-cookie-explicito", "C-origin", "D-cookie+origin"]) {
  console.log(r, "criou?", depois.includes(`${r}${nome}`));
}
await ctx.close();
await b.close();
