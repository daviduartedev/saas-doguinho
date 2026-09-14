import { addCalendarDays, calendarDay, isoNow } from "./clock";
import { DASHBOARD_HISTORY_DAYS } from "./constants";
import {
  AuthFailedError,
  ConflictError,
  ForbiddenError,
  UnauthenticatedError,
  ValidationError,
} from "./errors";
import { isUnidadeMedida, requireQuantidade } from "./quantities";
import {
  ALL_PERMISSIONS,
  MAX_LOJAS,
  OPERADOR_PERFIL_NOME,
  SEED_DONO_EMAIL,
  SEED_DONO_PASSWORD,
  SEED_LOJAS,
  SEED_OPERADORES,
  SEED_ORGANIZATION_ID,
  SEED_PRODUTOS,
} from "./seed";
import { OPERADOR_TEMPLATE_PERMISSIONS } from "./types";
import { normalizeEmail, normalizeName } from "./store";
import type { Store, StoredEstoque, StoredRascunho, StoredUser } from "./store";
import type {
  Actor,
  Clock,
  Dashboard,
  EstoqueView,
  FechamentoStatus,
  HistoryRow,
  IdGenerator,
  Logger,
  Loja,
  PasswordHasher,
  Perfil,
  Permission,
  Produto,
  QuantidadeLinha,
  Session,
  Submission,
  UnidadeMedida,
  Usuario,
  RelatorioLoja,
  HistoricoPagina,
} from "./types";
import { linhasOficiaisDoDia } from "./view";

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MIN_PASSWORD = 8;

export type AppDeps = {
  store: Store;
  clock: Clock;
  passwords: PasswordHasher;
  ids: IdGenerator;
  log: Logger;
  sessionTtlMs?: number;
  organizationId?: string;
};

export type EnviarInput = {
  lojaId: string;
  linhas: QuantidadeLinha[];
  justificativa?: string | null;
};

export type DoguinhoApp = {
  seed: () => Promise<void>;
  entrar: (input: { email: string; senha: string }) => Promise<Session>;
  resolverSessao: (token: string) => Promise<Actor | null>;
  abrirChrome: (token: string) => Promise<{ actor: Actor; lojas: Loja[] } | null>;
  sair: (token: string) => Promise<void>;
  listarLojas: (actor: Actor) => Promise<Loja[]>;
  criarLoja: (actor: Actor, input: { nome: string }) => Promise<Loja>;
  listarProdutos: (actor: Actor) => Promise<Produto[]>;
  criarProduto: (actor: Actor, input: { nome: string; unidade: UnidadeMedida }) => Promise<Produto>;
  editarProduto: (
    actor: Actor,
    input: { id: string; nome: string; unidade: UnidadeMedida },
  ) => Promise<Produto>;
  desativarProduto: (actor: Actor, input: { id: string }) => Promise<void>;
  excluirProduto: (actor: Actor, input: { id: string }) => Promise<void>;
  listarPerfis: (actor: Actor) => Promise<Perfil[]>;
  criarPerfil: (actor: Actor, input: { nome: string; permissions: Permission[] }) => Promise<Perfil>;
  editarPerfil: (
    actor: Actor,
    input: { id: string; nome: string; permissions: Permission[] },
  ) => Promise<Perfil>;
  excluirPerfil: (actor: Actor, input: { id: string }) => Promise<void>;
  listarUsuarios: (actor: Actor) => Promise<Array<Usuario & { lojaIds: string[] }>>;
  criarUsuario: (
    actor: Actor,
    input: { email: string; senha: string; nome: string; perfilId: string; lojaIds: string[] },
  ) => Promise<Usuario>;
  desligarUsuario: (actor: Actor, input: { userId: string }) => Promise<void>;
  alterarVinculo: (actor: Actor, input: { userId: string; lojaIds: string[] }) => Promise<void>;
  alterarPerfilUsuario: (actor: Actor, input: { userId: string; perfilId: string }) => Promise<void>;
  rebaixarDono: (actor: Actor, input: { userId: string }) => Promise<void>;
  estoqueDaLoja: (actor: Actor, lojaId: string) => Promise<EstoqueView>;
  estoqueDasLojas: (actor: Actor) => Promise<EstoqueView[]>;
  estadoDaLoja: (
    actor: Actor,
    lojaId: string,
  ) => Promise<{ snap: EstoqueView; linhas: QuantidadeLinha[]; produtos: Produto[] }>;
  rascunhoDoDia: (actor: Actor, lojaId: string) => Promise<QuantidadeLinha[]>;
  salvarRascunho: (
    actor: Actor,
    input: { lojaId: string; linhas: QuantidadeLinha[] },
  ) => Promise<void>;
  enviar: (actor: Actor, input: EnviarInput) => Promise<Submission>;
  historico: (actor: Actor, input: { lojaId: string }) => Promise<HistoryRow[]>;
  historicoPagina: (
    actor: Actor,
    input: { lojaId: string; page: number; per: number },
  ) => Promise<HistoricoPagina>;
  enviosDoDia: (actor: Actor, input: { lojaId: string }) => Promise<HistoryRow[]>;
  relatoriosDoDia: (actor: Actor) => Promise<RelatorioLoja[]>;
  dashboard: (actor: Actor) => Promise<Dashboard>;
};

export function createDoguinhoApp(deps: AppDeps): DoguinhoApp {
  const organizationId = deps.organizationId ?? SEED_ORGANIZATION_ID;
  const ttl = deps.sessionTtlMs ?? SESSION_TTL_MS;
  const dummyHashPromise = deps.passwords.hash("__dummy__");

  async function actorFromUser(user: StoredUser, knownVinculos?: string[]): Promise<Actor> {
    const vinculoLojaIds = user.isDono ? [] : (knownVinculos ?? (await deps.store.vinculosOf(user.id)));
    let permissions: Permission[] = [];
    if (user.isDono) permissions = ALL_PERMISSIONS;
    else if (user.perfilId) {
      const perfil = await deps.store.getPerfil(user.perfilId);
      permissions = perfil?.permissions ?? [];
    }
    return {
      userId: user.id,
      organizationId: user.organizationId,
      isDono: user.isDono,
      permissions,
      vinculoLojaIds,
      nome: user.nome,
      email: user.email,
    };
  }

  function lojasVisiveis(actor: Actor, lojas: Loja[]) {
    if (actor.isDono) return lojas;
    return lojas.filter((loja) => actor.vinculoLojaIds.includes(loja.id));
  }

  async function resolveChrome(token: string) {
    const row = await deps.store.getSessionChrome(token);
    if (!row) return null;
    if (deps.clock.now().getTime() - row.session.createdAt > ttl) {
      await deps.store.deleteSession(token);
      return null;
    }
    if (row.user.disabled) return null;
    const actor = await actorFromUser(row.user, row.vinculoLojaIds);
    return { actor, lojas: lojasVisiveis(actor, row.lojas) };
  }

  function assertOrg(actor: Actor) {
    if (actor.organizationId !== organizationId) throw new ForbiddenError();
  }

  function hasPermission(actor: Actor, permission: Permission) {
    return actor.isDono || actor.permissions.includes(permission);
  }

  function requireDono(actor: Actor) {
    assertOrg(actor);
    if (!actor.isDono) {
      deps.log.security({
        at: isoNow(deps.clock),
        type: "forbidden",
        actorId: actor.userId,
        detail: "dono_only",
      });
      throw new ForbiddenError("Ação reservada ao Dono.");
    }
  }

  function requirePermission(actor: Actor, permission: Permission) {
    assertOrg(actor);
    if (!hasPermission(actor, permission)) {
      deps.log.security({
        at: isoNow(deps.clock),
        type: "forbidden",
        actorId: actor.userId,
        detail: permission,
      });
      throw new ForbiddenError();
    }
  }

  async function requireLoja(actor: Actor, lojaId: string): Promise<Loja> {
    assertOrg(actor);
    const loja = await deps.store.getLoja(lojaId);
    if (!loja || loja.organizationId !== actor.organizationId) {
      deps.log.security({
        at: isoNow(deps.clock),
        type: "forbidden_loja",
        actorId: actor.userId,
        lojaId,
      });
      throw new ForbiddenError("Sem autorização para esta Loja.");
    }
    if (!actor.isDono && !actor.vinculoLojaIds.includes(loja.id)) {
      deps.log.security({
        at: isoNow(deps.clock),
        type: "forbidden_loja",
        actorId: actor.userId,
        lojaId,
      });
      throw new ForbiddenError("Sem autorização para esta Loja.");
    }
    return loja;
  }

  function sanitizePermissions(permissions: Permission[]): Permission[] {
    const unknown = permissions.filter((item) => !ALL_PERMISSIONS.includes(item));
    if (unknown.length) throw new ValidationError("Permissão desconhecida.");
    return ALL_PERMISSIONS.filter((item) => permissions.includes(item));
  }

  async function publicUser(user: StoredUser): Promise<Usuario> {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      nome: user.nome,
      isDono: user.isDono,
      disabled: user.disabled,
      perfilId: user.perfilId,
    };
  }

  function snapFrom(
    estoqueRows: StoredEstoque[],
    rascunhoRow: StoredRascunho | null | undefined,
    hoje: Submission[],
    produtos: Produto[],
  ) {
    const ativos = produtos.filter((produto) => produto.ativo);
    const valores: Record<string, number | null> = {};
    for (const produto of ativos) {
      valores[produto.id] =
        estoqueRows.find((row) => row.produtoId === produto.id)?.quantidade ?? null;
    }
    let status: FechamentoStatus = "nunca_fechou";
    if (hoje.length > 0) status = "enviado";
    else if (rascunhoRow && rascunhoRow.linhas.some((linha) => linha.restante !== null))
      status = "rascunho";
    else if (Object.values(valores).some((valor) => valor !== null)) status = "enviado";
    return {
      status,
      valores,
      rascunho: rascunhoRow?.linhas ?? null,
      hoje,
      exigeJustificativa: hoje.length > 0,
    };
  }

  async function statusDaLoja(lojaId: string) {
    const day = calendarDay(deps.clock);
    const [todosProdutos, estoqueRows, rascunhoRow, hoje] = await Promise.all([
      deps.store.listProdutos(organizationId),
      deps.store.listEstoque(lojaId),
      deps.store.getRascunho(lojaId, day),
      deps.store.submissionsOnDay(lojaId, day),
    ]);
    return snapFrom(estoqueRows, rascunhoRow, hoje, todosProdutos);
  }

  async function statusDasLojas(lojas: Loja[], produtos?: Produto[]) {
    const day = calendarDay(deps.clock);
    const [todosProdutos, estoqueRows, rascunhos, hoje] = await Promise.all([
      produtos ? Promise.resolve(produtos) : deps.store.listProdutos(organizationId),
      deps.store.listEstoqueByOrg(organizationId),
      deps.store.listRascunhosOnDay(organizationId, day),
      deps.store.listSubmissionsOnDayByOrg(organizationId, day),
    ]);
    const estoqueByLoja = new Map<string, StoredEstoque[]>();
    for (const row of estoqueRows) {
      const list = estoqueByLoja.get(row.lojaId) ?? [];
      list.push(row);
      estoqueByLoja.set(row.lojaId, list);
    }
    const rascunhoByLoja = new Map(rascunhos.map((row) => [row.lojaId, row]));
    const hojeByLoja = new Map<string, Submission[]>();
    for (const row of hoje) {
      const list = hojeByLoja.get(row.lojaId) ?? [];
      list.push(row);
      hojeByLoja.set(row.lojaId, list);
    }
    return lojas.map((loja) => ({
      loja,
      snap: snapFrom(
        estoqueByLoja.get(loja.id) ?? [],
        rascunhoByLoja.get(loja.id),
        hojeByLoja.get(loja.id) ?? [],
        todosProdutos,
      ),
    }));
  }

  async function linhasDoDia(lojaId: string): Promise<QuantidadeLinha[]> {
    const day = calendarDay(deps.clock);
    const [todosProdutos, rascunho] = await Promise.all([
      deps.store.listProdutos(organizationId),
      deps.store.getRascunho(lojaId, day),
    ]);
    const ativos = todosProdutos.filter((produto) => produto.ativo);
    const map = new Map((rascunho?.linhas ?? []).map((linha) => [linha.produtoId, linha.restante]));
    return ativos.map((produto) => ({
      produtoId: produto.id,
      restante: map.has(produto.id) ? map.get(produto.id)! : null,
    }));
  }

  function produtoNomesFrom(produtos: Produto[]): Record<string, string> {
    return Object.fromEntries(produtos.map((produto) => [produto.id, produto.nome]));
  }

  function historyFrom(
    submissions: Submission[],
    users: StoredUser[],
    produtos: Produto[],
  ): HistoryRow[] {
    const nomes = new Map(users.map((user) => [user.id, user.nome]));
    const produtoNomes = produtoNomesFrom(produtos);
    return submissions.map((submission) => ({
      submission,
      usuarioNome: nomes.get(submission.usuarioId) ?? "Usuário",
      produtoNomes,
    }));
  }

  async function historyRows(lojaId: string): Promise<HistoryRow[]> {
    const [submissions, users, produtos] = await Promise.all([
      deps.store.listSubmissions(lojaId),
      deps.store.listUsers(organizationId),
      deps.store.listProdutos(organizationId),
    ]);
    return historyFrom(
      [...submissions].sort((a, b) => (a.enviadoEm < b.enviadoEm ? 1 : -1)),
      users,
      produtos,
    );
  }

  async function historyByLoja(lojas: Loja[], produtos?: Produto[]): Promise<Map<string, HistoryRow[]>> {
    const since = addCalendarDays(calendarDay(deps.clock), -(DASHBOARD_HISTORY_DAYS - 1));
    const [submissions, users, catalogo] = await Promise.all([
      deps.store.listSubmissionsSinceByOrg(organizationId, since),
      deps.store.listUsers(organizationId),
      produtos ? Promise.resolve(produtos) : deps.store.listProdutos(organizationId),
    ]);
    const visiveis = new Set(lojas.map((loja) => loja.id));
    const grouped = new Map<string, HistoryRow[]>();
    for (const loja of lojas) grouped.set(loja.id, []);
    const ordered = [...submissions].sort((a, b) => (a.enviadoEm < b.enviadoEm ? 1 : -1));
    for (const row of historyFrom(ordered, users, catalogo)) {
      if (!visiveis.has(row.submission.lojaId)) continue;
      grouped.get(row.submission.lojaId)!.push(row);
    }
    return grouped;
  }

  async function ensureSeedOperadores() {
    const [lojas, users, vinculos] = await Promise.all([
      deps.store.listLojas(organizationId),
      deps.store.listUsers(organizationId),
      deps.store.listVinculosByOrg(organizationId),
    ]);
    const byEmail = new Map(users.map((user) => [user.email, user]));
    const vinculosByUser = new Map<string, string[]>();
    for (const row of vinculos) {
      const list = vinculosByUser.get(row.userId) ?? [];
      list.push(row.lojaId);
      vinculosByUser.set(row.userId, list);
    }
    const missing = SEED_OPERADORES.filter((spec) => !byEmail.has(spec.email));
    let perfil = missing.length === 0 ? null : await deps.store.findPerfilByName(organizationId, OPERADOR_PERFIL_NOME);
    if (missing.length > 0 && !perfil) return;
    let passwordHash: string | null = null;
    for (const spec of SEED_OPERADORES) {
      const loja = lojas.find((item) => item.nome === spec.lojaNome);
      if (!loja) continue;
      const existing = byEmail.get(spec.email);
      if (existing) {
        const atual = vinculosByUser.get(existing.id) ?? [];
        if (atual.length === 1 && atual[0] === loja.id) continue;
        // ASVS 8.2 / 8.4: Vínculo is the Loja allowlist — seed keeps exactly one Loja.
        await deps.store.setVinculos(existing.id, [loja.id]);
        continue;
      }
      if (!perfil) {
        perfil = await deps.store.findPerfilByName(organizationId, OPERADOR_PERFIL_NOME);
        if (!perfil) return;
      }
      if (!passwordHash) passwordHash = await deps.passwords.hash(SEED_DONO_PASSWORD);
      const user: StoredUser = {
        id: deps.ids.id(),
        organizationId,
        email: spec.email,
        nome: spec.nome,
        isDono: false,
        disabled: false,
        perfilId: perfil.id,
        passwordHash,
      };
      try {
        await deps.store.insertUser(user);
        await deps.store.setVinculos(user.id, [loja.id]);
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error;
        const reused = await deps.store.getUserByEmail(organizationId, spec.email);
        if (reused) {
          await deps.store.setVinculos(reused.id, [loja.id]);
        }
      }
    }
  }

  function sameLinhas(a: QuantidadeLinha[], b: Submission["linhas"]) {
    const left = [...a]
      .filter((linha) => linha.restante !== null)
      .map((linha) => `${linha.produtoId}:${linha.restante}`)
      .sort()
      .join("|");
    const right = [...b]
      .map((linha) => `${linha.produtoId}:${linha.nova}`)
      .sort()
      .join("|");
    return left === right;
  }

  return {
    async seed() {
      if (!(await deps.store.getOrganization(organizationId))) {
        await deps.store.insertOrganization({
          id: organizationId,
          nome: "Doguinho do Coruja",
        });
        for (const nome of SEED_LOJAS) {
          await deps.store.insertLoja({
            id: deps.ids.id(),
            organizationId,
            nome,
          });
        }
        for (const produto of SEED_PRODUTOS) {
          await deps.store.insertProduto({
            id: deps.ids.id(),
            organizationId,
            nome: produto.nome,
            unidade: produto.unidade,
            ativo: true,
            excluido: false,
          });
        }
        await deps.store.insertPerfil({
          id: deps.ids.id(),
          organizationId,
          nome: OPERADOR_PERFIL_NOME,
          permissions: [...OPERADOR_TEMPLATE_PERMISSIONS],
          template: true,
        });
        await deps.store.insertUser({
          id: deps.ids.id(),
          organizationId,
          email: SEED_DONO_EMAIL,
          nome: "Dono",
          isDono: true,
          disabled: false,
          perfilId: null,
          passwordHash: await deps.passwords.hash(SEED_DONO_PASSWORD),
        });
      }
      await ensureSeedOperadores();
    },

    async entrar(input) {
      const dummy = await dummyHashPromise;
      const email = normalizeEmail(input.email);
      const user = await deps.store.getUserByEmail(organizationId, email);
      const hash = user?.passwordHash ?? dummy;
      const matches = await deps.passwords.verify(input.senha ?? "", hash);
      if (!user || user.disabled || !matches) {
        deps.log.security({ at: isoNow(deps.clock), type: "login_failed" });
        throw new AuthFailedError();
      }
      const token = deps.ids.token();
      await deps.store.insertSession({
        token,
        userId: user.id,
        createdAt: deps.clock.now().getTime(),
      });
      deps.log.security({ at: isoNow(deps.clock), type: "login_ok", actorId: user.id });
      return { token, actor: await actorFromUser(user) };
    },

    async resolverSessao(token) {
      const chrome = await resolveChrome(token);
      return chrome?.actor ?? null;
    },

    async abrirChrome(token) {
      return resolveChrome(token);
    },

    async sair(token) {
      await deps.store.deleteSession(token);
    },

    async listarLojas(actor) {
      assertOrg(actor);
      const lojas = await deps.store.listLojas(actor.organizationId);
      return lojasVisiveis(actor, lojas);
    },

    async criarLoja(actor, input) {
      requireDono(actor);
      const nome = normalizeName(input.nome);
      if (!nome) throw new ValidationError("Informe o nome da Loja.");
      // QA-010: maxLength do client é contornável — o servidor enforce o teto.
      if (nome.length > 80) throw new ValidationError("Nome da Loja deve ter no máximo 80 caracteres.");
      const existentes = await deps.store.listLojas(organizationId);
      if (existentes.length >= MAX_LOJAS) {
        throw new ValidationError(`A Organização tem ${MAX_LOJAS} Lojas. Não é possível criar outra.`);
      }
      const loja = { id: deps.ids.id(), organizationId, nome };
      await deps.store.insertLoja(loja);
      return loja;
    },

    async listarProdutos(actor) {
      assertOrg(actor);
      return (await deps.store.listProdutos(actor.organizationId)).filter(
        (produto) => !produto.excluido,
      );
    },

    async criarProduto(actor, input) {
      requirePermission(actor, "manage_produto");
      const nome = normalizeName(input.nome);
      if (!nome) throw new ValidationError("Informe o nome do Produto.");
      // QA-010: maxLength do client é contornável — o servidor enforce o teto.
      if (nome.length > 80) throw new ValidationError("Nome do Produto deve ter no máximo 80 caracteres.");
      if (!isUnidadeMedida(input.unidade)) {
        throw new ValidationError("Unidade de medida inválida.");
      }
      // QA-007 / #40: desativado ou excluído com histórico não queima o nome.
      const existente = await deps.store.findProdutoByName(organizationId, nome);
      if (existente?.ativo) {
        throw new ConflictError("Já existe um Produto com esse nome.");
      }
      const produto: Produto = {
        id: deps.ids.id(),
        organizationId,
        nome,
        unidade: input.unidade,
        ativo: true,
        excluido: false,
      };
      await deps.store.insertProduto(produto);
      return produto;
    },

    async editarProduto(actor, input) {
      requirePermission(actor, "manage_produto");
      const produto = await deps.store.getProduto(input.id);
      if (!produto || produto.organizationId !== organizationId || produto.excluido) {
        throw new ForbiddenError();
      }
      const nome = normalizeName(input.nome);
      if (!nome) throw new ValidationError("Informe o nome do Produto.");
      // QA-010: maxLength do client é contornável — o servidor enforce o teto.
      if (nome.length > 80) throw new ValidationError("Nome do Produto deve ter no máximo 80 caracteres.");
      if (!isUnidadeMedida(input.unidade)) {
        throw new ValidationError("Unidade de medida inválida.");
      }
      const other = await deps.store.findProdutoByName(organizationId, nome);
      if (other && other.ativo && other.id !== produto.id) {
        throw new ConflictError("Já existe um Produto com esse nome.");
      }
      await deps.store.updateProduto(produto.id, { nome, unidade: input.unidade });
      return { ...produto, nome, unidade: input.unidade };
    },

    async desativarProduto(actor, input) {
      requirePermission(actor, "manage_produto");
      const produto = await deps.store.getProduto(input.id);
      if (!produto || produto.organizationId !== organizationId || produto.excluido) {
        throw new ForbiddenError();
      }
      await deps.store.updateProduto(produto.id, { ativo: false });
    },

    async excluirProduto(actor, input) {
      requirePermission(actor, "manage_produto");
      const produto = await deps.store.getProduto(input.id);
      if (!produto || produto.organizationId !== organizationId) throw new ForbiddenError();
      if (produto.excluido) return;
      if (await deps.store.produtoHasHistory(produto.id)) {
        await deps.store.updateProduto(produto.id, { ativo: false, excluido: true });
        return;
      }
      await deps.store.deleteProduto(produto.id);
    },

    async listarPerfis(actor) {
      assertOrg(actor);
      if (!actor.isDono && !hasPermission(actor, "manage_users")) {
        throw new ForbiddenError();
      }
      return deps.store.listPerfis(organizationId);
    },

    async criarPerfil(actor, input) {
      requireDono(actor);
      const nome = normalizeName(input.nome);
      if (!nome) throw new ValidationError("Informe o nome do Perfil.");
      if (await deps.store.findPerfilByName(organizationId, nome)) {
        throw new ConflictError("Já existe um Perfil com esse nome.");
      }
      const perfil: Perfil = {
        id: deps.ids.id(),
        organizationId,
        nome,
        permissions: sanitizePermissions(input.permissions),
        template: false,
      };
      await deps.store.insertPerfil(perfil);
      deps.log.security({
        at: isoNow(deps.clock),
        type: "perfil_created",
        actorId: actor.userId,
      });
      return perfil;
    },

    async editarPerfil(actor, input) {
      requireDono(actor);
      const perfil = await deps.store.getPerfil(input.id);
      if (!perfil || perfil.organizationId !== organizationId) throw new ForbiddenError();
      const nome = normalizeName(input.nome);
      if (!nome) throw new ValidationError("Informe o nome do Perfil.");
      await deps.store.updatePerfil(perfil.id, {
        nome,
        permissions: sanitizePermissions(input.permissions),
      });
      return { ...perfil, nome, permissions: sanitizePermissions(input.permissions) };
    },

    async excluirPerfil(actor, input) {
      requireDono(actor);
      const perfil = await deps.store.getPerfil(input.id);
      if (!perfil || perfil.organizationId !== organizationId) throw new ForbiddenError();
      if ((await deps.store.countUsersWithPerfil(perfil.id)) > 0) {
        throw new ConflictError("Perfil em uso não pode ser removido.");
      }
      await deps.store.deletePerfil(perfil.id);
    },

    async listarUsuarios(actor) {
      requirePermission(actor, "manage_users");
      const [users, vinculos] = await Promise.all([
        deps.store.listUsers(organizationId),
        deps.store.listVinculosByOrg(organizationId),
      ]);
      const lojaIdsByUser = new Map<string, string[]>();
      for (const row of vinculos) {
        const list = lojaIdsByUser.get(row.userId) ?? [];
        list.push(row.lojaId);
        lojaIdsByUser.set(row.userId, list);
      }
      return Promise.all(
        users.map(async (user) => ({
          ...(await publicUser(user)),
          lojaIds: lojaIdsByUser.get(user.id) ?? [],
        })),
      );
    },

    async criarUsuario(actor, input) {
      requirePermission(actor, "manage_users");
      const email = normalizeEmail(input.email);
      const nome = normalizeName(input.nome);
      if (!email.includes("@")) throw new ValidationError("E-mail inválido.");
      if (!nome) throw new ValidationError("Informe o nome.");
      if (!input.senha || input.senha.length < MIN_PASSWORD) {
        throw new ValidationError("Senha deve ter pelo menos 8 caracteres.");
      }
      if (await deps.store.getUserByEmail(organizationId, email)) {
        throw new ConflictError("Já existe um usuário com esse e-mail.");
      }
      const perfil = await deps.store.getPerfil(input.perfilId);
      if (!perfil || perfil.organizationId !== organizationId) {
        throw new ValidationError("Perfil inválido.");
      }
      const lojas = await deps.store.listLojas(organizationId);
      for (const lojaId of input.lojaIds) {
        if (!lojas.some((loja) => loja.id === lojaId)) {
          throw new ValidationError("Loja inválida no Vínculo.");
        }
      }
      const user: StoredUser = {
        id: deps.ids.id(),
        organizationId,
        email,
        nome,
        isDono: false,
        disabled: false,
        perfilId: perfil.id,
        passwordHash: await deps.passwords.hash(input.senha),
      };
      await deps.store.insertUser(user);
      await deps.store.setVinculos(user.id, input.lojaIds);
      return publicUser(user);
    },

    async desligarUsuario(actor, input) {
      requirePermission(actor, "manage_users");
      const user = await deps.store.getUserById(input.userId);
      if (!user || user.organizationId !== organizationId) throw new ForbiddenError();
      if (user.isDono && (await deps.store.countDonos(organizationId)) <= 1) {
        throw new ConflictError("O último Dono não pode ser desligado.");
      }
      await deps.store.updateUser(user.id, { disabled: true });
      await deps.store.deleteSessionsForUser(user.id);
      deps.log.security({
        at: isoNow(deps.clock),
        type: "user_disabled",
        actorId: actor.userId,
      });
    },

    async alterarVinculo(actor, input) {
      requirePermission(actor, "manage_users");
      const user = await deps.store.getUserById(input.userId);
      if (!user || user.organizationId !== organizationId) throw new ForbiddenError();
      const lojas = await deps.store.listLojas(organizationId);
      for (const lojaId of input.lojaIds) {
        if (!lojas.some((loja) => loja.id === lojaId)) {
          throw new ValidationError("Loja inválida no Vínculo.");
        }
      }
      await deps.store.setVinculos(user.id, input.lojaIds);
    },

    async alterarPerfilUsuario(actor, input) {
      requirePermission(actor, "manage_users");
      const user = await deps.store.getUserById(input.userId);
      if (!user || user.organizationId !== organizationId) throw new ForbiddenError();
      const perfil = await deps.store.getPerfil(input.perfilId);
      if (!perfil || perfil.organizationId !== organizationId) {
        throw new ValidationError("Perfil inválido.");
      }
      await deps.store.updateUser(user.id, { perfilId: perfil.id });
    },

    async rebaixarDono(actor, input) {
      requireDono(actor);
      const user = await deps.store.getUserById(input.userId);
      if (!user || user.organizationId !== organizationId) throw new ForbiddenError();
      if ((await deps.store.countDonos(organizationId)) <= 1) {
        throw new ConflictError("O último Dono não pode perder o acesso.");
      }
      await deps.store.updateUser(user.id, { isDono: false });
    },

    async estoqueDaLoja(actor, lojaId) {
      const loja = await requireLoja(actor, lojaId);
      requirePermission(actor, "read_estoque");
      const snap = await statusDaLoja(loja.id);
      return { loja, status: snap.status, valores: snap.valores, exigeJustificativa: snap.exigeJustificativa };
    },

    async estoqueDasLojas(actor) {
      requirePermission(actor, "read_estoque");
      const lojas = await deps.store.listLojas(organizationId);
      const visiveis = lojasVisiveis(actor, lojas);
      const colunas = await statusDasLojas(visiveis);
      return colunas.map(({ loja, snap }) => ({
        loja,
        status: snap.status,
        valores: snap.valores,
        exigeJustificativa: snap.exigeJustificativa,
      }));
    },

    async estadoDaLoja(actor, lojaId) {
      const loja = await requireLoja(actor, lojaId);
      requirePermission(actor, "read_estoque");
      const day = calendarDay(deps.clock);
      const [todosProdutos, estoqueRows, rascunhoRow, hoje] = await Promise.all([
        deps.store.listProdutos(organizationId),
        deps.store.listEstoque(loja.id),
        deps.store.getRascunho(loja.id, day),
        deps.store.submissionsOnDay(loja.id, day),
      ]);
      const snap = snapFrom(estoqueRows, rascunhoRow, hoje, todosProdutos);
      const ativos = todosProdutos.filter((produto) => produto.ativo);
      const map = new Map((rascunhoRow?.linhas ?? []).map((linha) => [linha.produtoId, linha.restante]));
      return {
        produtos: todosProdutos.filter((produto) => !produto.excluido),
        snap: {
          loja,
          status: snap.status,
          valores: snap.valores,
          exigeJustificativa: snap.exigeJustificativa,
        },
        linhas: ativos.map((produto) => ({
          produtoId: produto.id,
          restante: map.has(produto.id) ? map.get(produto.id)! : null,
        })),
      };
    },

    async rascunhoDoDia(actor, lojaId) {
      await requireLoja(actor, lojaId);
      return linhasDoDia(lojaId);
    },

    async salvarRascunho(actor, input) {
      const loja = await requireLoja(actor, input.lojaId);
      if (!hasPermission(actor, "submit_fechamento") && !hasPermission(actor, "submit_correcao")) {
        throw new ForbiddenError();
      }
      const day = calendarDay(deps.clock);
      const ativos = (await deps.store.listProdutos(organizationId)).filter((produto) => produto.ativo);
      const map = new Map(input.linhas.map((linha) => [linha.produtoId, linha.restante]));
      const linhas = ativos.map((produto) => ({
        produtoId: produto.id,
        restante: map.has(produto.id) ? map.get(produto.id)! : null,
      }));
      await deps.store.upsertRascunho({
        lojaId: loja.id,
        organizationId,
        calendarDay: day,
        linhas,
      });
    },

    async enviar(actor, input) {
      const loja = await requireLoja(actor, input.lojaId);
      const linhas = input.linhas;
      const justificativa = input.justificativa;
      return deps.store.withLojaLock(loja.id, async () => {
        const day = calendarDay(deps.clock);
        const hoje = await deps.store.submissionsOnDay(loja.id, day);
        const jaEnviou = hoje.length > 0;
        if (jaEnviou) {
          if (!hasPermission(actor, "submit_correcao")) throw new ForbiddenError();
        } else if (!hasPermission(actor, "submit_fechamento")) {
          throw new ForbiddenError();
        }

        const ativos = (await deps.store.listProdutos(organizationId)).filter((produto) => produto.ativo);
        if (ativos.length === 0) {
          throw new ValidationError("Não há Produtos ativos para Fechamento.");
        }
        for (const produto of ativos) {
          const linha = linhas.find((item) => item.produtoId === produto.id);
          if (!linha || linha.restante === null) {
            throw new ValidationError("Informe a quantidade restante de todos os Produtos ativos.");
          }
          requireQuantidade(linha.restante, produto.unidade, produto.nome);
        }

        const primeiro = hoje.find((row) => row.tipo === "fechamento") ?? hoje[0];
        const justificativaLimpa = justificativa?.trim() || null;
        // QA-010: teto server-side para a Justificativa (client não enforce).
        if (justificativaLimpa && justificativaLimpa.length > 1000) {
          throw new ValidationError("Justificativa deve ter no máximo 1000 caracteres.");
        }
        if (jaEnviou && !justificativaLimpa) {
          if (primeiro && sameLinhas(linhas, primeiro.linhas)) return primeiro;
          throw new ValidationError("Correção exige Justificativa.");
        }

        const estoqueRows = await deps.store.listEstoque(loja.id);
        const registroLinhas = ativos.map((produto) => {
          const linha = linhas.find((item) => item.produtoId === produto.id)!;
          const anterior =
            estoqueRows.find((row) => row.produtoId === produto.id)?.quantidade ?? null;
          return { produtoId: produto.id, anterior, nova: linha.restante as number };
        });

        const submission: Submission = {
          id: deps.ids.id(),
          organizationId,
          lojaId: loja.id,
          usuarioId: actor.userId,
          calendarDay: day,
          tipo: jaEnviou ? "correcao" : "fechamento",
          justificativa: jaEnviou ? justificativaLimpa : null,
          enviadoEm: isoNow(deps.clock),
          linhas: registroLinhas,
        };
        await deps.store.insertSubmission(submission);
        for (const linha of registroLinhas) {
          await deps.store.upsertEstoque({
            lojaId: loja.id,
            organizationId,
            produtoId: linha.produtoId,
            quantidade: linha.nova,
          });
        }
        await deps.store.deleteRascunho(loja.id, day);
        return submission;
      });
    },

    async historico(actor, input) {
      await requireLoja(actor, input.lojaId);
      requirePermission(actor, "read_history");
      return historyRows(input.lojaId);
    },

    async historicoPagina(actor, input) {
      // ASVS 8.2.1 / 8.3.1: same Loja allowlist and read_history as historico.
      await requireLoja(actor, input.lojaId);
      requirePermission(actor, "read_history");
      const per = Number.isInteger(input.per) && input.per > 0 ? input.per : 8;
      const page = Number.isInteger(input.page) && input.page > 0 ? input.page : 1;
      const [paged, users, produtos] = await Promise.all([
        deps.store.listSubmissionsPage(input.lojaId, { offset: (page - 1) * per, limit: per }),
        deps.store.listUsers(organizationId),
        deps.store.listProdutos(organizationId),
      ]);
      return { items: historyFrom(paged.rows, users, produtos), total: paged.total };
    },

    async enviosDoDia(actor, input) {
      // ASVS 4.1.1 / 4.2.1: same Loja scope and read_history as historico.
      await requireLoja(actor, input.lojaId);
      requirePermission(actor, "read_history");
      const day = calendarDay(deps.clock);
      const [submissions, users, produtos] = await Promise.all([
        deps.store.submissionsOnDay(input.lojaId, day),
        deps.store.listUsers(organizationId),
        deps.store.listProdutos(organizationId),
      ]);
      const nomes = new Map(users.map((user) => [user.id, user.nome]));
      const produtoNomes = produtoNomesFrom(produtos);
      return [...submissions]
        .sort((a, b) => {
          if (a.enviadoEm === b.enviadoEm) return 0;
          return a.enviadoEm < b.enviadoEm ? -1 : 1;
        })
        .map((submission) => ({
          submission,
          usuarioNome: nomes.get(submission.usuarioId) ?? "Usuário",
          produtoNomes,
        }));
    },

    async relatoriosDoDia(actor) {
      // ASVS 8.2.1 / 8.4.1: Estoque of visible Lojas only; no day timeline in this payload.
      requirePermission(actor, "read_estoque");
      const lojas = lojasVisiveis(actor, await deps.store.listLojas(organizationId));
      const produtos = await deps.store.listProdutos(organizationId);
      const catalogo = produtos.filter((produto) => !produto.excluido);
      const colunas = await statusDasLojas(lojas, produtos);
      return colunas.map(({ loja, snap }) => ({
        loja,
        produtos: catalogo,
        linhas: linhasOficiaisDoDia(snap, catalogo),
      }));
    },

    async dashboard(actor) {
      requirePermission(actor, "dashboard");
      const [lojas, produtos] = await Promise.all([
        deps.store.listLojas(organizationId),
        deps.store.listProdutos(organizationId),
      ]);
      const visiveis = lojasVisiveis(actor, lojas);
      const [colunas, historicoPorLoja] = await Promise.all([
        statusDasLojas(visiveis, produtos),
        historyByLoja(visiveis, produtos),
      ]);
      const estoque: EstoqueView[] = [];
      const semFechamentoHoje: Loja[] = [];
      const recentes: HistoryRow[] = [];
      const historicos: { loja: Loja; rows: HistoryRow[] }[] = [];
      for (const coluna of colunas) {
        const historico = historicoPorLoja.get(coluna.loja.id) ?? [];
        estoque.push({
          loja: coluna.loja,
          status: coluna.snap.status,
          valores: coluna.snap.valores,
          exigeJustificativa: coluna.snap.exigeJustificativa,
        });
        if (coluna.snap.hoje.length === 0) semFechamentoHoje.push(coluna.loja);
        recentes.push(...historico);
        historicos.push({ loja: coluna.loja, rows: historico });
      }
      recentes.sort((a, b) => (a.submission.enviadoEm < b.submission.enviadoEm ? 1 : -1));
      return { semFechamentoHoje, estoque, recentes: recentes.slice(0, 20), historicos };
    },
  };
}

export { actorCan, homePath, rotuloStatus } from "./view";

export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw new UnauthenticatedError();
  return actor;
}

