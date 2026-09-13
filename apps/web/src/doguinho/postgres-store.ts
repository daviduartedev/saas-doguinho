import { AsyncLocalStorage } from "node:async_hooks";
import postgres from "postgres";
import { ConflictError } from "./errors";
import { SEED_LOJAS, SEED_ORGANIZATION_ID } from "./seed";
import type { Loja, Perfil, Produto, Submission } from "./types";
import type { StoredEstoque, StoredRascunho, StoredUser, Store } from "./store";
import { normalizeEmail, normalizeName } from "./store";

type Sql = postgres.Sql;

const txAls = new AsyncLocalStorage<Sql>();

/** ASVS 13.2: timeouts and pool size for the Neon round-trip from Vercel isolates. */
export function postgresPoolOptions(url: string, env: { VERCEL?: string | undefined }) {
  const serverless = Boolean(env.VERCEL);
  return {
    max: serverless ? 1 : 8,
    connect_timeout: 10,
    prepare: false as const,
    ssl: url.includes("sslmode=") ? ("require" as const) : undefined,
    ...(serverless ? { idle_timeout: 20 } : {}),
  };
}

export async function createPostgresStore(url: string): Promise<Store> {
  const root = postgres(url, postgresPoolOptions(url, { VERCEL: process.env.VERCEL }));
  const db = () => txAls.getStore() ?? root;

  await migrate(root);

  return {
    async insertOrganization(row) {
      await db()`INSERT INTO organizations (id, nome) VALUES (${row.id}, ${row.nome})`;
    },
    async getOrganization(id) {
      const rows = await db()`SELECT id, nome FROM organizations WHERE id = ${id}`;
      return (rows[0] as { id: string; nome: string } | undefined) ?? null;
    },

    async insertLoja(row) {
      await db()`INSERT INTO lojas (id, organization_id, nome) VALUES (${row.id}, ${row.organizationId}, ${row.nome})`;
    },
    async listLojas(organizationId) {
      const rows = await db()`SELECT id, organization_id, nome FROM lojas WHERE organization_id = ${organizationId} ORDER BY nome`;
      return rows.map(mapLoja);
    },
    async getLoja(id) {
      const rows = await db()`SELECT id, organization_id, nome FROM lojas WHERE id = ${id}`;
      return rows[0] ? mapLoja(rows[0]) : null;
    },

    async insertProduto(row) {
      await db()`INSERT INTO produtos (id, organization_id, nome, unidade, ativo) VALUES (${row.id}, ${row.organizationId}, ${row.nome}, ${row.unidade}, ${row.ativo})`;
    },
    async updateProduto(id, patch) {
      const rows = await db()`SELECT id, organization_id, nome, unidade, ativo FROM produtos WHERE id = ${id}`;
      const atual = rows[0] ? mapProduto(rows[0]) : null;
      if (!atual) return;
      const next = { ...atual, ...patch };
      await db()`UPDATE produtos SET nome = ${next.nome}, unidade = ${next.unidade}, ativo = ${next.ativo} WHERE id = ${id}`;
    },
    async deleteProduto(id) {
      await db()`DELETE FROM produtos WHERE id = ${id}`;
    },
    async getProduto(id) {
      const rows = await db()`SELECT id, organization_id, nome, unidade, ativo FROM produtos WHERE id = ${id}`;
      return rows[0] ? mapProduto(rows[0]) : null;
    },
    async listProdutos(organizationId) {
      const rows = await db()`SELECT id, organization_id, nome, unidade, ativo FROM produtos WHERE organization_id = ${organizationId} ORDER BY nome`;
      return rows.map(mapProduto);
    },
    async findProdutoByName(organizationId, nome) {
      const target = normalizeName(nome).toLowerCase();
      const rows = await db()`SELECT id, organization_id, nome, unidade, ativo FROM produtos WHERE organization_id = ${organizationId}`;
      return rows.map(mapProduto).find((produto) => normalizeName(produto.nome).toLowerCase() === target) ?? null;
    },

    async insertPerfil(row) {
      await db()`INSERT INTO perfis (id, organization_id, nome, permissions, template) VALUES (${row.id}, ${row.organizationId}, ${row.nome}, ${JSON.stringify(row.permissions)}, ${row.template})`;
    },
    async updatePerfil(id, patch) {
      const rows = await db()`SELECT id, organization_id, nome, permissions, template FROM perfis WHERE id = ${id}`;
      const atual = rows[0] ? mapPerfil(rows[0]) : null;
      if (!atual) return;
      const next = { ...atual, ...patch };
      await db()`UPDATE perfis SET nome = ${next.nome}, permissions = ${JSON.stringify(next.permissions)} WHERE id = ${id}`;
    },
    async deletePerfil(id) {
      await db()`DELETE FROM perfis WHERE id = ${id}`;
    },
    async getPerfil(id) {
      const rows = await db()`SELECT id, organization_id, nome, permissions, template FROM perfis WHERE id = ${id}`;
      return rows[0] ? mapPerfil(rows[0]) : null;
    },
    async listPerfis(organizationId) {
      const rows = await db()`SELECT id, organization_id, nome, permissions, template FROM perfis WHERE organization_id = ${organizationId} ORDER BY nome`;
      return rows.map(mapPerfil);
    },
    async findPerfilByName(organizationId, nome) {
      const target = normalizeName(nome).toLowerCase();
      const rows = await db()`SELECT id, organization_id, nome, permissions, template FROM perfis WHERE organization_id = ${organizationId}`;
      return rows.map(mapPerfil).find((perfil) => normalizeName(perfil.nome).toLowerCase() === target) ?? null;
    },
    async countUsersWithPerfil(perfilId) {
      const rows = await db()`SELECT COUNT(*)::int AS n FROM users WHERE perfil_id = ${perfilId} AND disabled = FALSE`;
      return Number(rows[0]?.n ?? 0);
    },

    async insertUser(row) {
      try {
        await db()`INSERT INTO users (id, organization_id, email, nome, is_dono, disabled, perfil_id, password_hash) VALUES (${row.id}, ${row.organizationId}, ${normalizeEmail(row.email)}, ${row.nome}, ${row.isDono}, ${row.disabled}, ${row.perfilId}, ${row.passwordHash})`;
      } catch (error) {
        // QA-008: a unique index é o backstop da corrida; a violação vira erro de domínio.
        if ((error as { code?: string }).code === "23505") {
          throw new ConflictError("Já existe um usuário com esse e-mail.");
        }
        throw error;
      }
    },
    async updateUser(id, patch) {
      const rows = await db()`SELECT id, organization_id, email, nome, is_dono, disabled, perfil_id, password_hash FROM users WHERE id = ${id}`;
      const atual = rows[0] ? mapUser(rows[0]) : null;
      if (!atual) return;
      const next = { ...atual, ...patch };
      await db()`UPDATE users SET disabled = ${next.disabled}, perfil_id = ${next.perfilId}, is_dono = ${next.isDono}, nome = ${next.nome} WHERE id = ${id}`;
    },
    async getUserById(id) {
      const rows = await db()`SELECT id, organization_id, email, nome, is_dono, disabled, perfil_id, password_hash FROM users WHERE id = ${id}`;
      return rows[0] ? mapUser(rows[0]) : null;
    },
    async getUserByEmail(organizationId, email) {
      const rows = await db()`SELECT id, organization_id, email, nome, is_dono, disabled, perfil_id, password_hash FROM users WHERE organization_id = ${organizationId} AND email = ${normalizeEmail(email)}`;
      return rows[0] ? mapUser(rows[0]) : null;
    },
    async listUsers(organizationId) {
      const rows = await db()`SELECT id, organization_id, email, nome, is_dono, disabled, perfil_id, password_hash FROM users WHERE organization_id = ${organizationId} ORDER BY nome`;
      return rows.map(mapUser);
    },
    async countDonos(organizationId) {
      const rows = await db()`SELECT COUNT(*)::int AS n FROM users WHERE organization_id = ${organizationId} AND is_dono = TRUE AND disabled = FALSE`;
      return Number(rows[0]?.n ?? 0);
    },

    async setVinculos(userId, lojaIds) {
      await db()`DELETE FROM vinculos WHERE user_id = ${userId}`;
      for (const lojaId of [...new Set(lojaIds)]) {
        await db()`INSERT INTO vinculos (user_id, loja_id) VALUES (${userId}, ${lojaId})`;
      }
    },
    async vinculosOf(userId) {
      const rows = await db()`SELECT loja_id FROM vinculos WHERE user_id = ${userId}`;
      return rows.map((row) => String(row.loja_id));
    },

    async upsertRascunho(row) {
      await db()`INSERT INTO rascunhos (loja_id, organization_id, calendar_day, linhas) VALUES (${row.lojaId}, ${row.organizationId}, ${row.calendarDay}, ${JSON.stringify(row.linhas)})
        ON CONFLICT (loja_id, calendar_day) DO UPDATE SET linhas = EXCLUDED.linhas`;
    },
    async getRascunho(lojaId, calendarDay) {
      const rows = await db()`SELECT loja_id, organization_id, calendar_day, linhas FROM rascunhos WHERE loja_id = ${lojaId} AND calendar_day = ${calendarDay}`;
      return rows[0] ? mapRascunho(rows[0]) : null;
    },
    async listRascunhosOnDay(organizationId, calendarDay) {
      const rows = await db()`SELECT loja_id, organization_id, calendar_day, linhas FROM rascunhos WHERE organization_id = ${organizationId} AND calendar_day = ${calendarDay}`;
      return rows.map(mapRascunho);
    },
    async deleteRascunho(lojaId, calendarDay) {
      await db()`DELETE FROM rascunhos WHERE loja_id = ${lojaId} AND calendar_day = ${calendarDay}`;
    },

    async insertSubmission(row) {
      await db()`INSERT INTO submissions (id, organization_id, loja_id, usuario_id, calendar_day, tipo, justificativa, enviado_em, linhas) VALUES (${row.id}, ${row.organizationId}, ${row.lojaId}, ${row.usuarioId}, ${row.calendarDay}, ${row.tipo}, ${row.justificativa}, ${row.enviadoEm}, ${JSON.stringify(row.linhas)})`;
    },
    async listSubmissions(lojaId) {
      const rows = await db()`SELECT * FROM submissions WHERE loja_id = ${lojaId} ORDER BY enviado_em`;
      return rows.map(mapSubmission);
    },
    async listSubmissionsByOrg(organizationId) {
      const rows = await db()`SELECT * FROM submissions WHERE organization_id = ${organizationId} ORDER BY enviado_em`;
      return rows.map(mapSubmission);
    },
    async submissionsOnDay(lojaId, calendarDay) {
      const rows = await db()`SELECT * FROM submissions WHERE loja_id = ${lojaId} AND calendar_day = ${calendarDay} ORDER BY enviado_em`;
      return rows.map(mapSubmission);
    },
    async listSubmissionsOnDayByOrg(organizationId, calendarDay) {
      const rows = await db()`SELECT * FROM submissions WHERE organization_id = ${organizationId} AND calendar_day = ${calendarDay} ORDER BY enviado_em`;
      return rows.map(mapSubmission);
    },
    async produtoHasHistory(produtoId) {
      const rows = await db()`SELECT 1 FROM submissions WHERE linhas::text LIKE ${"%" + produtoId + "%"} LIMIT 1`;
      return rows.length > 0;
    },

    async upsertEstoque(row) {
      await db()`INSERT INTO estoque (loja_id, organization_id, produto_id, quantidade) VALUES (${row.lojaId}, ${row.organizationId}, ${row.produtoId}, ${row.quantidade})
        ON CONFLICT (loja_id, produto_id) DO UPDATE SET quantidade = EXCLUDED.quantidade`;
    },
    async listEstoque(lojaId) {
      const rows = await db()`SELECT loja_id, organization_id, produto_id, quantidade FROM estoque WHERE loja_id = ${lojaId}`;
      return rows.map(mapEstoque);
    },
    async listEstoqueByOrg(organizationId) {
      const rows = await db()`SELECT loja_id, organization_id, produto_id, quantidade FROM estoque WHERE organization_id = ${organizationId}`;
      return rows.map(mapEstoque);
    },
    async getEstoque(lojaId, produtoId) {
      const rows = await db()`SELECT loja_id, organization_id, produto_id, quantidade FROM estoque WHERE loja_id = ${lojaId} AND produto_id = ${produtoId}`;
      return rows[0] ? mapEstoque(rows[0]) : null;
    },

    async insertSession(row) {
      await db()`INSERT INTO sessions (token, user_id, created_at) VALUES (${row.token}, ${row.userId}, ${row.createdAt})`;
    },
    async getSession(token) {
      const rows = await db()`SELECT token, user_id, created_at FROM sessions WHERE token = ${token}`;
      return rows[0]
        ? { token: String(rows[0].token), userId: String(rows[0].user_id), createdAt: Number(rows[0].created_at) }
        : null;
    },
    async deleteSession(token) {
      await db()`DELETE FROM sessions WHERE token = ${token}`;
    },
    async deleteSessionsForUser(userId) {
      await db()`DELETE FROM sessions WHERE user_id = ${userId}`;
    },

    async withLojaLock(lojaId, fn) {
      const reserved = await root.reserve();
      try {
        await reserved`BEGIN`;
        await reserved`SELECT id FROM lojas WHERE id = ${lojaId} FOR UPDATE`;
        try {
          const result = await txAls.run(reserved, fn);
          await reserved`COMMIT`;
          return result;
        } catch (error) {
          await reserved`ROLLBACK`;
          throw error;
        }
      } finally {
        reserved.release();
      }
    },
  };
}

async function migrate(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL
    )`;
  await sql`CREATE TABLE IF NOT EXISTS lojas (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      nome TEXT NOT NULL
    )`;
  await sql`CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      nome TEXT NOT NULL,
      unidade TEXT NOT NULL,
      ativo BOOLEAN NOT NULL
    )`;
  await sql`CREATE TABLE IF NOT EXISTS perfis (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      nome TEXT NOT NULL,
      permissions TEXT NOT NULL,
      template BOOLEAN NOT NULL
    )`;
  await sql`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      email TEXT NOT NULL,
      nome TEXT NOT NULL,
      is_dono BOOLEAN NOT NULL,
      disabled BOOLEAN NOT NULL,
      perfil_id TEXT REFERENCES perfis(id),
      password_hash TEXT NOT NULL
    )`;
  // QA-008: e-mail único por Organização enforced pelo banco (backstop da corrida).
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_org_email_key ON users (organization_id, email)`;
  await sql`UPDATE organizations SET nome = ${"Doguinho do Coruja"} WHERE id = ${SEED_ORGANIZATION_ID} AND nome <> ${"Doguinho do Coruja"}`;
  await sql`CREATE TABLE IF NOT EXISTS vinculos (
      user_id TEXT NOT NULL REFERENCES users(id),
      loja_id TEXT NOT NULL REFERENCES lojas(id),
      PRIMARY KEY (user_id, loja_id)
    )`;
  await sql`CREATE TABLE IF NOT EXISTS rascunhos (
      loja_id TEXT NOT NULL REFERENCES lojas(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      calendar_day TEXT NOT NULL,
      linhas TEXT NOT NULL,
      PRIMARY KEY (loja_id, calendar_day)
    )`;
  await sql`CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      loja_id TEXT NOT NULL REFERENCES lojas(id),
      usuario_id TEXT NOT NULL REFERENCES users(id),
      calendar_day TEXT NOT NULL,
      tipo TEXT NOT NULL,
      justificativa TEXT,
      enviado_em TEXT NOT NULL,
      linhas TEXT NOT NULL
    )`;
  await sql`CREATE TABLE IF NOT EXISTS estoque (
      loja_id TEXT NOT NULL REFERENCES lojas(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      produto_id TEXT NOT NULL REFERENCES produtos(id),
      quantidade DOUBLE PRECISION NOT NULL CHECK (quantidade >= 0),
      PRIMARY KEY (loja_id, produto_id)
    )`;
  await sql`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at BIGINT NOT NULL
    )`;
  await pruneToSeedLojas(sql);
}

/** ASVS 1.2: seed names stay a bound parameter. Extra Lojas (E2E/smoke) are dropped. */
async function pruneToSeedLojas(sql: Sql) {
  const keep = [...SEED_LOJAS];
  const extras = await sql`
    SELECT id FROM lojas
    WHERE organization_id = ${SEED_ORGANIZATION_ID}
      AND nome <> ALL(${keep})
  `;
  const ids = extras.map((row) => String(row.id));
  if (ids.length === 0) return;
  await sql`DELETE FROM vinculos WHERE loja_id IN ${sql(ids)}`;
  await sql`DELETE FROM rascunhos WHERE loja_id IN ${sql(ids)}`;
  await sql`DELETE FROM submissions WHERE loja_id IN ${sql(ids)}`;
  await sql`DELETE FROM estoque WHERE loja_id IN ${sql(ids)}`;
  await sql`DELETE FROM lojas WHERE id IN ${sql(ids)}`;
}

function mapLoja(row: Record<string, unknown>): Loja {
  return { id: String(row.id), organizationId: String(row.organization_id), nome: String(row.nome) };
}

function mapProduto(row: Record<string, unknown>): Produto {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    nome: String(row.nome),
    unidade: row.unidade as Produto["unidade"],
    ativo: Boolean(row.ativo),
  };
}

function mapPerfil(row: Record<string, unknown>): Perfil {
  const raw = row.permissions;
  const permissions = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    nome: String(row.nome),
    permissions,
    template: Boolean(row.template),
  };
}

function mapUser(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    email: String(row.email),
    nome: String(row.nome),
    isDono: Boolean(row.is_dono),
    disabled: Boolean(row.disabled),
    perfilId: row.perfil_id ? String(row.perfil_id) : null,
    passwordHash: String(row.password_hash),
  };
}

function mapRascunho(row: Record<string, unknown>): StoredRascunho {
  const linhas = typeof row.linhas === "string" ? JSON.parse(row.linhas) : row.linhas;
  return {
    lojaId: String(row.loja_id),
    organizationId: String(row.organization_id),
    calendarDay: String(row.calendar_day),
    linhas,
  };
}

function mapSubmission(row: Record<string, unknown>): Submission {
  const linhas = typeof row.linhas === "string" ? JSON.parse(row.linhas) : row.linhas;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    lojaId: String(row.loja_id),
    usuarioId: String(row.usuario_id),
    calendarDay: String(row.calendar_day),
    tipo: row.tipo as Submission["tipo"],
    justificativa: row.justificativa ? String(row.justificativa) : null,
    enviadoEm: String(row.enviado_em),
    linhas,
  };
}

function mapEstoque(row: Record<string, unknown>): StoredEstoque {
  return {
    lojaId: String(row.loja_id),
    organizationId: String(row.organization_id),
    produtoId: String(row.produto_id),
    quantidade: Number(row.quantidade),
  };
}
