export const PERMISSIONS = [
  "read_estoque",
  "submit_fechamento",
  "submit_correcao",
  "read_history",
  "dashboard",
  "manage_produto",
  "manage_users",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const OPERADOR_TEMPLATE_PERMISSIONS: Permission[] = [
  "read_estoque",
  "submit_fechamento",
  "submit_correcao",
  "read_history",
];

export type UnidadeMedida = "unidade" | "kg" | "g" | "L" | "mL" | "pacote";

export const UNIDADES: UnidadeMedida[] = [
  "unidade",
  "kg",
  "g",
  "L",
  "mL",
  "pacote",
];

export type Actor = {
  userId: string;
  organizationId: string;
  isDono: boolean;
  permissions: Permission[];
  vinculoLojaIds: string[];
  nome: string;
  email: string;
};

export type Session = {
  token: string;
  actor: Actor;
};

export type Loja = {
  id: string;
  organizationId: string;
  nome: string;
};

export type Produto = {
  id: string;
  organizationId: string;
  nome: string;
  unidade: UnidadeMedida;
  ativo: boolean;
};

export type Perfil = {
  id: string;
  organizationId: string;
  nome: string;
  permissions: Permission[];
  template: boolean;
};

export type Usuario = {
  id: string;
  organizationId: string;
  email: string;
  nome: string;
  isDono: boolean;
  disabled: boolean;
  perfilId: string | null;
};

export type QuantidadeLinha = {
  produtoId: string;
  restante: number | null;
};

export type SubmissionLine = {
  produtoId: string;
  anterior: number | null;
  nova: number;
};

export type Submission = {
  id: string;
  organizationId: string;
  lojaId: string;
  usuarioId: string;
  calendarDay: string;
  tipo: "fechamento" | "correcao";
  justificativa: string | null;
  enviadoEm: string;
  linhas: SubmissionLine[];
};

export type FechamentoStatus =
  | "nunca_fechou"
  | "rascunho"
  | "enviado"
  | "correcao_necessaria";

export type EstoqueView = {
  loja: Loja;
  status: FechamentoStatus;
  valores: Record<string, number | null>;
  exigeJustificativa: boolean;
};

export type HistoryRow = {
  submission: Submission;
  usuarioNome: string;
};

export type Dashboard = {
  semFechamentoHoje: Loja[];
  estoque: EstoqueView[];
  recentes: HistoryRow[];
};

export type Clock = {
  now: () => Date;
};

export type PasswordHasher = {
  hash: (plain: string) => Promise<string>;
  verify: (plain: string, hash: string) => Promise<boolean>;
};

export type IdGenerator = {
  id: () => string;
  token: () => string;
};

export type SecurityEvent = {
  at: string;
  type: string;
  actorId?: string;
  lojaId?: string;
  detail?: string;
};

export type Logger = {
  security: (event: SecurityEvent) => void;
};
