// Verificação browser do QA-002 (loop de redirect) após o fix.
import { BASE, browser, newPage, record } from "./helpers.mjs";

const b = await browser();

// gatilho (a): cookie adulterado
{
  const { ctx, page } = await newPage(b);
  await ctx.addCookies([{ name: "doguinho_session", value: "token-lixo", url: BASE }]);
  const resp = await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" }).catch((e) => null);
  const url = page.url();
  const ok = resp && resp.status() === 200 && url.includes("/entrar");
  await record("QA-002-fix", ok ? "PASS" : "FAIL", `cookie lixo → status=${resp?.status()} url=${url} (esperado 200 em /entrar, sem loop)`);
  await ctx.close();
}

// gatilho (a) variante: ir direto ao /entrar com cookie lixo (middleware costumava devolver p/ /fechamento)
{
  const { ctx, page } = await newPage(b);
  await ctx.addCookies([{ name: "doguinho_session", value: "token-lixo-2", url: BASE }]);
  const resp = await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" }).catch((e) => null);
  const url = page.url();
  // esperado: middleware manda p/ /fechamento (cookie presente) → exigirActor → /sair apaga → /entrar sem cookie
  const ok = resp && resp.status() === 200 && url.includes("/entrar");
  const cookieDepois = (await ctx.cookies(BASE)).find((c) => c.name === "doguinho_session");
  await record("QA-002-fix", ok && !cookieDepois ? "PASS" : "FAIL", `/entrar c/ cookie lixo → url=${url}; cookie limpo=${!cookieDepois}`);
  await ctx.close();
}

await b.close();
console.log("verificação QA-002 concluída.");
