import type {
  Loja,
  Perfil,
  Permission,
  Produto,
  QuantidadeLinha,
  Submission,
  UnidadeMedida,
  Usuario,
} from "./types";

export type StoredUser = Usuario & { passwordHash: string };

export type StoredSession = {
  token: string;
  userId: string;
  createdAt: number;
};

export type StoredRascunho = {
  lojaId: string;
  organizationId: string;
  calendarDay: string;
  linhas: QuantidadeLinha[];
};

export type StoredEstoque = {
  lojaId: string;
  organizationId: string;
  produtoId: string;
  quantidade: number;
};

export type Store = {
  insertOrganization: (row: { id: string; nome: string }) => Promise<void>;
  getOrganization: (id: string) => Promise<{ id: string; nome: string } | null>;

  insertLoja: (row: Loja) => Promise<void>;
  listLojas: (organizationId: string) => Promise<Loja[]>;
  getLoja: (id: string) => Promise<Loja | null>;

  insertProduto: (row: Produto) => Promise<void>;
  updateProduto: (
    id: string,
    patch: { nome?: string; unidade?: UnidadeMedida; ativo?: boolean },
  ) => Promise<void>;
  deleteProduto: (id: string) => Promise<void>;
  getProduto: (id: string) => Promise<Produto | null>;
  listProdutos: (organizationId: string) => Promise<Produto[]>;
  findProdutoByName: (organizationId: string, nome: string) => Promise<Produto | null>;

  insertPerfil: (row: Perfil) => Promise<void>;
  updatePerfil: (id: string, patch: { nome?: string; permissions?: Permission[] }) => Promise<void>;
  deletePerfil: (id: string) => Promise<void>;
  getPerfil: (id: string) => Promise<Perfil | null>;
  listPerfis: (organizationId: string) => Promise<Perfil[]>;
  findPerfilByName: (organizationId: string, nome: string) => Promise<Perfil | null>;
  countUsersWithPerfil: (perfilId: string) => Promise<number>;

  insertUser: (row: StoredUser) => Promise<void>;
  updateUser: (
    id: string,
    patch: Partial<Pick<StoredUser, "disabled" | "perfilId" | "isDono" | "nome">>,
  ) => Promise<void>;
  getUserById: (id: string) => Promise<StoredUser | null>;
  getUserByEmail: (organizationId: string, email: string) => Promise<StoredUser | null>;
  listUsers: (organizationId: string) => Promise<StoredUser[]>;
  countDonos: (organizationId: string) => Promise<number>;

  setVinculos: (userId: string, lojaIds: string[]) => Promise<void>;
  vinculosOf: (userId: string) => Promise<string[]>;

  upsertRascunho: (row: StoredRascunho) => Promise<void>;
  getRascunho: (lojaId: string, calendarDay: string) => Promise<StoredRascunho | null>;
  deleteRascunho: (lojaId: string, calendarDay: string) => Promise<void>;

  insertSubmission: (row: Submission) => Promise<void>;
  listSubmissions: (lojaId: string) => Promise<Submission[]>;
  submissionsOnDay: (lojaId: string, calendarDay: string) => Promise<Submission[]>;
  produtoHasHistory: (produtoId: string) => Promise<boolean>;

  upsertEstoque: (row: StoredEstoque) => Promise<void>;
  listEstoque: (lojaId: string) => Promise<StoredEstoque[]>;
  getEstoque: (lojaId: string, produtoId: string) => Promise<StoredEstoque | null>;

  insertSession: (row: StoredSession) => Promise<void>;
  getSession: (token: string) => Promise<StoredSession | null>;
  deleteSession: (token: string) => Promise<void>;
  deleteSessionsForUser: (userId: string) => Promise<void>;

  withLojaLock: <T>(lojaId: string, fn: () => Promise<T>) => Promise<T>;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeName(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}
