import { BASE, DONO, browser, newPage, loginOk } from "./helpers.mjs";

const b = await browser();
const { ctx, page } = await newPage(b);
await loginOk(page, DONO);
for (const rota of ["/configuracoes", "/usuarios"]) {
  const html = await (await ctx.request.get(`${BASE}${rota}`)).text();
  const matches = [...html.matchAll(/name="(\$ACTION_ID_[^"]+)"/g)];
  console.log(`${rota}: ${matches.length} action ids`);
  for (const m of matches) {
    const i = m.index;
    const antes = html.slice(Math.max(0, i - 400), i).replace(/\s+/g, " ");
    console.log("  ", m[1].slice(0, 30), "… contexto:", antes.slice(-120));
  }
}
await ctx.close();
await b.close();
