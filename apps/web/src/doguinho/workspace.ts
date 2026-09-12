import { cache } from "react";
import type { DoguinhoApp } from "./app";
import type { Actor, EstoqueView, Loja, Produto, QuantidadeLinha } from "./types";
import { getApp } from "./runtime";
import { exigirActor } from "./sessao";
import { FILTRO_TODAS, resolveLojaFiltro } from "./workspace-filtro";

export { FILTRO_TODAS, resolveLojaFiltro } from "./workspace-filtro";

export type WorkspaceNeeds = {
  produtos?: boolean;
  lojaState?: boolean;
};

/** One session+lojas trip per RSC request. Layout and the page share it on Vercel. */
export const loadChrome = cache(async () => {
  const actor = await exigirActor();
  const app = await getApp();
  const lojas = await app.listarLojas(actor);
  return { actor, app, lojas };
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

  const produtosPromise: Promise<Produto[]> = needs.produtos
    ? app.listarProdutos(actor)
    : Promise.resolve([]);
  const statePromise: Promise<[EstoqueView | null, QuantidadeLinha[]]> =
    needs.lojaState && lojaId
      ? Promise.all([app.estoqueDaLoja(actor, lojaId), app.rascunhoDoDia(actor, lojaId)])
      : Promise.resolve([null, []]);

  const [produtos, [snap, linhas]] = await Promise.all([produtosPromise, statePromise]);

  return { actor, lojas, lojaId, filtro, snap, produtos, linhas, app };
}

export async function loadWorkspace(lojaParam?: string, needs?: WorkspaceNeeds) {
  const { actor, app, lojas } = await loadChrome();
  return assembleWorkspace(app, actor, lojas, lojaParam, {
    produtos: needs?.produtos ?? true,
    lojaState: needs?.lojaState ?? true,
  });
}
