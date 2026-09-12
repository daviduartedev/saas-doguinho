import type { Actor, FechamentoStatus, Loja } from "./types";
import { getApp } from "./runtime";
import { exigirActor } from "./sessao";

export const FILTRO_TODAS = "todas";

export function resolveLojaFiltro(lojaParam: string | undefined, lojaIds: string[]): string {
  // ASVS 5.1.1: allowlist query param against known Loja ids
  if (!lojaParam || lojaParam === FILTRO_TODAS) return FILTRO_TODAS;
  return lojaIds.includes(lojaParam) ? lojaParam : FILTRO_TODAS;
}

export async function loadWorkspace(lojaParam?: string) {
  const actor = await exigirActor();
  const app = await getApp();
  const lojas = await app.listarLojas(actor);
  const produtos = await app.listarProdutos(actor);
  const filtro = resolveLojaFiltro(
    lojaParam,
    lojas.map((loja) => loja.id),
  );
  const lojaId = filtro === FILTRO_TODAS ? (lojas[0]?.id ?? "") : filtro;
  if (!lojaId) {
    return { actor, lojas, lojaId: "", filtro, snap: null, produtos, linhas: [], app };
  }
  const snap = await app.estoqueDaLoja(actor, lojaId);
  const linhas = await app.rascunhoDoDia(actor, lojaId);
  return { actor, lojas, lojaId, filtro, snap, produtos, linhas, app };
}

export function shellFrom(workspace: {
  actor: Actor;
  lojas: Loja[];
  filtro: string;
  snap: { status: FechamentoStatus } | null;
}) {
  return {
    lojas: workspace.lojas,
    lojaId: workspace.lojas.length === 0 ? "" : workspace.filtro,
    actor: workspace.actor,
    status: workspace.filtro === FILTRO_TODAS ? null : (workspace.snap?.status ?? null),
  };
}
