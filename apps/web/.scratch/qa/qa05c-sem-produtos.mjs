// QA-05c (FECH-12 corrigido): desativar TODOS os produtos (paginado) → Fechamento sem ativos.
import { BASE, DONO, browser, loginOk, newPage, record, shot } from "./helpers.mjs";
import { OC } from "./ensure-identities.mjs";

const b = await browser();

// Dono desativa todos (varre páginas)
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, DONO);
  for (const pg of [1, 2]) {
    await page.goto(`${BASE}/produtos?page=${pg}`, { waitUntil: "networkidle" });
    for (let i = 0; i < 10; i++) {
      const btn = page.getByRole("button", { name: "Desativar" }).first();
      if ((await btn.count()) === 0) break;
      await btn.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    }
  }
  await page.goto(`${BASE}/produtos?page=1`, { waitUntil: "networkidle" });
  const restam1 = await page.getByRole("button", { name: "Desativar" }).count();
  await page.goto(`${BASE}/produtos?page=2`, { waitUntil: "networkidle" });
  const restam2 = await page.getByRole("button", { name: "Desativar" }).count();
  console.log("ativos restantes:", restam1 + restam2);
  await shot(page, "fechamento", "fech-12-todos-desativados");
  await ctx.close();
}

// OC abre Fechamento sem produtos ativos
{
  const { ctx, page } = await newPage(b);
  await loginOk(page, OC);
  await page.goto(`${BASE}/fechamento`, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const msgVazio = body.includes("Não há Produtos ativos");
  const btnEnviar = page.getByRole("button", { name: /Enviar fechamento|Enviar correção/ });
  const desabilitado = (await btnEnviar.count()) === 0 || (await btnEnviar.isDisabled());
  await record("FECH-12", msgVazio && desabilitado ? "PASS" : "FAIL",
    `mensagem="${msgVazio}"; enviar desabilitado=${desabilitado}`,
    await shot(page, "fechamento", "fech-12b-sem-produtos"));
  await ctx.close();
}

await b.close();
console.log("QA-05c done");
