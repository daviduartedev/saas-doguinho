// Regressão QA-002: cookie de sessão inválido/expirado NÃO pode cair em loop de
// redirects — o guard manda para /sair, que apaga o cookie e termina em /entrar.
import { expect, test } from "@playwright/test";

test("QA-002: cookie inválido → /sair limpa o cookie → /entrar (sem loop)", async ({ page, context }) => {
  await context.addCookies([
    { name: "doguinho_session", value: "token-lixo-que-nao-existe", url: "http://localhost:3000" },
  ]);
  await page.goto("/fechamento");
  // bug: middleware (confia no cookie) ↔ guard (redirect /entrar) em loop infinito
  await page.waitForURL("**/entrar**", { timeout: 10_000 });
  await expect(page).toHaveURL(/\/entrar/);
  // cookie removido pela rota /sair
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === "doguinho_session")).toBeUndefined();
});
