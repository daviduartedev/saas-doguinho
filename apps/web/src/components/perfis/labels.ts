import type { Permission } from "@/doguinho/types";
import { ALL_PERMISSIONS } from "@/doguinho/seed";

export const PERMISSION_LABELS: Record<Permission, string> = {
  read_estoque: "Ver Estoque",
  submit_fechamento: "Enviar Fechamento",
  submit_correcao: "Enviar Correção",
  read_history: "Ver histórico",
  dashboard: "Dashboard",
  manage_produto: "Gerir Produtos",
  manage_users: "Criar e desligar usuários",
};

export function countPermissionsOn(permissions: Permission[]) {
  return ALL_PERMISSIONS.filter((item) => permissions.includes(item)).length;
}
