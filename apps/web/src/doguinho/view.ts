import type { Actor, FechamentoStatus, Permission } from "./types";

export function actorCan(actor: Actor, permission: Permission): boolean {
  return actor.isDono || actor.permissions.includes(permission);
}

export function rotuloStatus(status: FechamentoStatus): string {
  switch (status) {
    case "nunca_fechou":
      return "Nunca fechou";
    case "rascunho":
      return "Rascunho";
    case "enviado":
      return "Enviado";
    case "correcao_necessaria":
      return "Correção necessária";
  }
}
