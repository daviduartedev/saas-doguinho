import type { Actor, EstoqueView, FechamentoStatus, Permission, Produto, QuantidadeLinha } from "./types";

export function actorCan(actor: Actor, permission: Permission): boolean {
  return actor.isDono || actor.permissions.includes(permission);
}

export function homePath(actor: Pick<Actor, "isDono">): "/dashboard" | "/fechamento" {
  return actor.isDono ? "/dashboard" : "/fechamento";
}

export function fechamentoEhFormulario(actor: Pick<Actor, "isDono">): boolean {
  return !actor.isDono;
}

export function linhasOficiaisDoDia(
  snap: Pick<EstoqueView, "exigeJustificativa" | "valores">,
  produtos: Array<Pick<Produto, "id" | "ativo">>,
): QuantidadeLinha[] {
  return produtos
    .filter((produto) => produto.ativo)
    .map((produto) => ({
      produtoId: produto.id,
      restante: snap.exigeJustificativa ? (snap.valores[produto.id] ?? null) : null,
    }));
}

export function statusRelatorioDono(
  snap: Pick<EstoqueView, "exigeJustificativa">,
): FechamentoStatus | null {
  return snap.exigeJustificativa ? "enviado" : null;
}

export function rotuloStatus(status: FechamentoStatus): string | null {
  switch (status) {
    case "nunca_fechou":
      return null;
    case "rascunho":
      return "Rascunho";
    case "enviado":
      return "Enviado";
    case "correcao_necessaria":
      return "Correção necessária";
  }
}
