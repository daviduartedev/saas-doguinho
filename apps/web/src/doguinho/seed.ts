import type { Permission, UnidadeMedida } from "./types";

export const SEED_ORGANIZATION_ID = "org-doguinho";
export const SEED_DONO_EMAIL = "dono@doguinho.local";
export const SEED_DONO_PASSWORD = "coruja";
export const OPERADOR_PERFIL_NOME = "Operador";

export const SEED_LOJAS = ["Centro", "Jardim Juliana", "Magalhães"] as const;

export const SEED_OPERADORES = [
  { email: "operador.centro@doguinho.local", nome: "Operador Centro", lojaNome: "Centro" },
  { email: "operador.juliana@doguinho.local", nome: "Operador Jardim Juliana", lojaNome: "Jardim Juliana" },
  { email: "operador.magalhaes@doguinho.local", nome: "Operador Magalhães", lojaNome: "Magalhães" },
] as const;
export const MAX_LOJAS = SEED_LOJAS.length;

export const SEED_PRODUTOS: Array<{ nome: string; unidade: UnidadeMedida }> = [
  { nome: "Milho", unidade: "kg" },
  { nome: "Ervilha", unidade: "kg" },
  { nome: "Tomate", unidade: "kg" },
  { nome: "Cebola", unidade: "kg" },
  { nome: "Maionese", unidade: "L" },
  { nome: "Mostarda", unidade: "L" },
  { nome: "Salsicha", unidade: "unidade" },
  { nome: "Pão", unidade: "unidade" },
  { nome: "Molho de tomate", unidade: "L" },
];

export const ALL_PERMISSIONS: Permission[] = [
  "read_estoque",
  "submit_fechamento",
  "submit_correcao",
  "read_history",
  "dashboard",
  "manage_produto",
  "manage_users",
];
