import { BASE, browser, newPage } from "./helpers.mjs";

const b = await browser();
const { ctx } = await newPage(b);
await ctx.addCookies([{ name: "doguinho_session", value: "token-lixo", url: BASE }]);

let url = `${BASE}/fechamento`;
for (let hop = 0; hop < 8; hop++) {
  const resp = await ctx.request.get(url, { maxRedirects: 0 });
  const loc = resp.headers()["location"] ?? "(sem location)";
  console.log(`hop ${hop}: GET ${url.replace(BASE, "")} → ${resp.status()} ${loc}`);
  if (resp.status() < 300 || resp.status() >= 400) break;
  url = loc.startsWith("http") ? loc : `${BASE}${loc}`;
}
await ctx.close();
await b.close();
