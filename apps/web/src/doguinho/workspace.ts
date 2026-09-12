import { getApp } from "./runtime";
import { exigirActor } from "./sessao";

export async function loadWorkspace(lojaParam?: string) {
  const actor = await exigirActor();
  const app = await getApp();
  const lojas = await app.listarLojas(actor);
  const produtos = await app.listarProdutos(actor);
  const lojaId = lojas.find((loja) => loja.id === lojaParam)?.id ?? lojas[0]?.id ?? "";
  if (!lojaId) {
    return { actor, lojas, lojaId: "", snap: null, produtos, linhas: [], app };
  }
  const snap = await app.estoqueDaLoja(actor, lojaId);
  const linhas = await app.rascunhoDoDia(actor, lojaId);
  return { actor, lojas, lojaId, snap, produtos, linhas, app };
}
