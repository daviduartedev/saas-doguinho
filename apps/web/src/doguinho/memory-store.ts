import { ConflictError } from "./errors";
import type { Loja, Perfil, Produto, Submission } from "./types";
import type {
  StoredEstoque,
  StoredRascunho,
  StoredSession,
  StoredUser,
  Store,
} from "./store";
import { normalizeEmail, normalizeName } from "./store";

export function createMemoryStore(): Store {
  const organizations = new Map<string, { id: string; nome: string }>();
  const lojas = new Map<string, Loja>();
  const produtos = new Map<string, Produto>();
  const perfis = new Map<string, Perfil>();
  const users = new Map<string, StoredUser>();
  const vinculos = new Map<string, string[]>();
  const rascunhos = new Map<string, StoredRascunho>();
  const submissions: Submission[] = [];
  const estoque = new Map<string, StoredEstoque>();
  const sessions = new Map<string, StoredSession>();
  const locks = new Map<string, Promise<void>>();

  function rascunhoKey(lojaId: string, day: string) {
    return `${lojaId}:${day}`;
  }

  function estoqueKey(lojaId: string, produtoId: string) {
    return `${lojaId}:${produtoId}`;
  }

  return {
    async insertOrganization(row) {
      organizations.set(row.id, row);
    },
    async getOrganization(id) {
      return organizations.get(id) ?? null;
    },

    async insertLoja(row) {
      lojas.set(row.id, row);
    },
    async listLojas(organizationId) {
      return [...lojas.values()].filter((loja) => loja.organizationId === organizationId);
    },
    async getLoja(id) {
      return lojas.get(id) ?? null;
    },

    async insertProduto(row) {
      produtos.set(row.id, row);
    },
    async updateProduto(id, patch) {
      const atual = produtos.get(id);
      if (!atual) return;
      produtos.set(id, { ...atual, ...patch });
    },
    async deleteProduto(id) {
      produtos.delete(id);
    },
    async getProduto(id) {
      return produtos.get(id) ?? null;
    },
    async listProdutos(organizationId) {
      return [...produtos.values()].filter((produto) => produto.organizationId === organizationId);
    },
    async findProdutoByName(organizationId, nome) {
      const target = normalizeName(nome).toLowerCase();
      return (
        [...produtos.values()].find(
          (produto) =>
            produto.organizationId === organizationId &&
            normalizeName(produto.nome).toLowerCase() === target,
        ) ?? null
      );
    },

    async insertPerfil(row) {
      perfis.set(row.id, row);
    },
    async updatePerfil(id, patch) {
      const atual = perfis.get(id);
      if (!atual) return;
      perfis.set(id, { ...atual, ...patch });
    },
    async deletePerfil(id) {
      perfis.delete(id);
    },
    async getPerfil(id) {
      return perfis.get(id) ?? null;
    },
    async listPerfis(organizationId) {
      return [...perfis.values()].filter((perfil) => perfil.organizationId === organizationId);
    },
    async findPerfilByName(organizationId, nome) {
      const target = normalizeName(nome).toLowerCase();
      return (
        [...perfis.values()].find(
          (perfil) =>
            perfil.organizationId === organizationId &&
            normalizeName(perfil.nome).toLowerCase() === target,
        ) ?? null
      );
    },
    async countUsersWithPerfil(perfilId) {
      return [...users.values()].filter((user) => user.perfilId === perfilId && !user.disabled)
        .length;
    },

    async insertUser(row) {
      // QA-008: unicidade de e-mail é enforced AQUI, sem await entre checar e
      // inserir — a janela de corrida do check-then-insert na camada app some.
      const email = normalizeEmail(row.email);
      const duplicado = [...users.values()].some(
        (user) => user.organizationId === row.organizationId && user.email === email,
      );
      if (duplicado) throw new ConflictError("Já existe um usuário com esse e-mail.");
      users.set(row.id, { ...row, email });
    },
    async updateUser(id, patch) {
      const atual = users.get(id);
      if (!atual) return;
      users.set(id, { ...atual, ...patch });
    },
    async getUserById(id) {
      return users.get(id) ?? null;
    },
    async getUserByEmail(organizationId, email) {
      const target = normalizeEmail(email);
      return (
        [...users.values()].find(
          (user) => user.organizationId === organizationId && user.email === target,
        ) ?? null
      );
    },
    async listUsers(organizationId) {
      return [...users.values()].filter((user) => user.organizationId === organizationId);
    },
    async countDonos(organizationId) {
      return [...users.values()].filter(
        (user) => user.organizationId === organizationId && user.isDono && !user.disabled,
      ).length;
    },

    async setVinculos(userId, lojaIds) {
      vinculos.set(userId, [...new Set(lojaIds)]);
    },
    async vinculosOf(userId) {
      return vinculos.get(userId) ?? [];
    },

    async upsertRascunho(row) {
      rascunhos.set(rascunhoKey(row.lojaId, row.calendarDay), row);
    },
    async getRascunho(lojaId, calendarDay) {
      return rascunhos.get(rascunhoKey(lojaId, calendarDay)) ?? null;
    },
    async deleteRascunho(lojaId, calendarDay) {
      rascunhos.delete(rascunhoKey(lojaId, calendarDay));
    },

    async insertSubmission(row) {
      submissions.push(row);
    },
    async listSubmissions(lojaId) {
      return submissions.filter((row) => row.lojaId === lojaId);
    },
    async submissionsOnDay(lojaId, calendarDay) {
      return submissions.filter((row) => row.lojaId === lojaId && row.calendarDay === calendarDay);
    },
    async produtoHasHistory(produtoId) {
      return submissions.some((row) => row.linhas.some((linha) => linha.produtoId === produtoId));
    },

    async upsertEstoque(row) {
      estoque.set(estoqueKey(row.lojaId, row.produtoId), row);
    },
    async listEstoque(lojaId) {
      return [...estoque.values()].filter((row) => row.lojaId === lojaId);
    },
    async getEstoque(lojaId, produtoId) {
      return estoque.get(estoqueKey(lojaId, produtoId)) ?? null;
    },

    async insertSession(row) {
      sessions.set(row.token, row);
    },
    async getSession(token) {
      return sessions.get(token) ?? null;
    },
    async deleteSession(token) {
      sessions.delete(token);
    },
    async deleteSessionsForUser(userId) {
      for (const [token, session] of sessions) {
        if (session.userId === userId) sessions.delete(token);
      }
    },

    async withLojaLock(lojaId, fn) {
      const previous = locks.get(lojaId) ?? Promise.resolve();
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      locks.set(
        lojaId,
        previous.then(() => gate),
      );
      await previous;
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}
