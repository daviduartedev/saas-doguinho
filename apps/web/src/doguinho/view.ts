import type { Actor, FechamentoStatus, Permission } from "./types";

export function actorCan(actor: Actor, permission: Permission): boolean {
  return actor.isDono || actor.permissions.includes(permission);
}

export function homePath(actor: Pick<Actor, "isDono">): "/dashboard" | "/fechamento" {
  return actor.isDono ? "/dashboard" : "/fechamento";
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
