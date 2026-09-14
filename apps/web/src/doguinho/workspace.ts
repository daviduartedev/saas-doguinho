import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { DoguinhoApp } from "./app";
import { SESSION_COOKIE } from "./constants";
import type { Actor, Loja } from "./types";
import { getApp } from "./runtime";
import { FILTRO_TODAS, resolveLojaFiltro } from "./workspace-filtro";

export { FILTRO_TODAS, resolveLojaFiltro } from "./workspace-filtro";

export type WorkspaceNeeds = {
  produtos?: boolean;
  lojaState?: boolean;
};

/** One session+lojas trip per RSC request. Layout and the page share it on Vercel. */
export const loadChrome = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect("/entrar");
  const app = await getApp();
  const chrome = await app.abrirChrome(token);
  if (!chrome) redirect("/sair");
  return { actor: chrome.actor, app, lojas: chrome.lojas };
});

export async function assembleWorkspace(
  app: DoguinhoApp,
  actor: Actor,
  lojas: Loja[],
  lojaParam: string | undefined,
  needs: { produtos: boolean; lojaState: boolean },
) {
  const filtro = resolveLojaFiltro(
    lojaParam,
    lojas.map((loja) => loja.id),
  );
  const lojaId = filtro === FILTRO_TODAS ? (lojas[0]?.id ?? "") : filtro;

  if (needs.lojaState && lojaId) {
    const estado = await app.estadoDaLoja(actor, lojaId);
    return {
      actor,
      lojas,
      lojaId,
      filtro,
      snap: estado.snap,
      produtos: estado.produtos,
      linhas: estado.linhas,
      app,
    };
  }

  const produtos = needs.produtos ? await app.listarProdutos(actor) : [];
  return { actor, lojas, lojaId, filtro, snap: null, produtos, linhas: [], app };
}

export async function loadWorkspace(lojaParam?: string, needs?: WorkspaceNeeds) {
  const { actor, app, lojas } = await loadChrome();
  return assembleWorkspace(app, actor, lojas, lojaParam, {
    produtos: needs?.produtos ?? true,
    lojaState: needs?.lojaState ?? true,
  });
}
