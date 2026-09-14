import { describe, expect, it } from "vitest";
import { createDoguinhoApp } from "./app";
import { cryptoIds } from "./ids";
import { capturingLogger } from "./log";
import { createMemoryStore } from "./memory-store";
import { fakePasswords } from "./passwords-fake";
import type { PasswordHasher } from "./types";
import type { Store } from "./store";
import { assembleWorkspace } from "./workspace";

function appWith(store: Store, passwords: PasswordHasher = fakePasswords()) {
  return createDoguinhoApp({
    store,
    clock: { now: () => new Date("2026-09-10T21:00:00-03:00") },
    passwords,
    ids: cryptoIds(),
    log: capturingLogger().logger,
  });
}

describe("leitura em lote do Estoque e Dashboard", () => {
  it("não chama listEstoque/listSubmissions por Loja", async () => {
    const raw = createMemoryStore();
    const counts = { estoque: 0, estoqueOrg: 0, submissions: 0, submissionsOrg: 0, getUser: 0 };
    const store: Store = {
      ...raw,
      listEstoque: async (lojaId) => {
        counts.estoque += 1;
        return raw.listEstoque(lojaId);
      },
      listEstoqueByOrg: async (organizationId) => {
        counts.estoqueOrg += 1;
        return raw.listEstoqueByOrg(organizationId);
      },
      listSubmissions: async (lojaId) => {
        counts.submissions += 1;
        return raw.listSubmissions(lojaId);
      },
      listSubmissionsByOrg: async (organizationId) => {
        counts.submissionsOrg += 1;
        return raw.listSubmissionsByOrg(organizationId);
      },
      getUserById: async (id) => {
        counts.getUser += 1;
        return raw.getUserById(id);
      },
    };
    const captured = capturingLogger();
    const app = createDoguinhoApp({
      store,
      clock: { now: () => new Date("2026-09-10T21:00:00-03:00") },
      passwords: fakePasswords(),
      ids: cryptoIds(),
      log: captured.logger,
    });
    await app.seed();
    const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
    const dono = await app.resolverSessao(session.token);
    if (!dono) throw new Error("Dono sem sessão");
    const lojas = await app.listarLojas(dono);
    expect(lojas.length).toBeGreaterThanOrEqual(3);

    counts.estoque = 0;
    counts.estoqueOrg = 0;
    const visao = await app.estoqueDasLojas(dono);
    expect(visao.length).toBe(lojas.length);
    expect(counts.estoque).toBe(0);
    expect(counts.estoqueOrg).toBe(1);

    counts.submissions = 0;
    counts.submissionsOrg = 0;
    counts.getUser = 0;
    const dash = await app.dashboard(dono);
    expect(dash.estoque.length).toBe(lojas.length);
    expect(counts.submissions).toBe(0);
    expect(counts.submissionsOrg).toBe(1);
    expect(counts.getUser).toBe(0);
  });
});

describe("custo compartilhado do boot e do chrome", () => {
  it("seed já completo não hasheia senha nem grava usuário ou Vínculo", async () => {
    const raw = createMemoryStore();
    const counts = { hash: 0, insertUser: 0, updateUser: 0, setVinculos: 0 };
    const passwords: PasswordHasher = {
      hash: async (plain) => {
        counts.hash += 1;
        return fakePasswords().hash(plain);
      },
      verify: (plain, hash) => fakePasswords().verify(plain, hash),
    };
    const store: Store = {
      ...raw,
      insertUser: async (row) => {
        counts.insertUser += 1;
        return raw.insertUser(row);
      },
      updateUser: async (id, patch) => {
        counts.updateUser += 1;
        return raw.updateUser(id, patch);
      },
      setVinculos: async (userId, lojaIds) => {
        counts.setVinculos += 1;
        return raw.setVinculos(userId, lojaIds);
      },
    };
    const app = appWith(store, passwords);
    await app.seed();
    counts.hash = 0;
    counts.insertUser = 0;
    counts.updateUser = 0;
    counts.setVinculos = 0;

    await app.seed();

    expect(counts.hash).toBe(0);
    expect(counts.insertUser).toBe(0);
    expect(counts.updateUser).toBe(0);
    expect(counts.setVinculos).toBe(0);
  });

  it("abrirChrome não relê o usuário nem as Lojas depois da sessão", async () => {
    const raw = createMemoryStore();
    const counts = { getUser: 0, listLojas: 0, getSession: 0 };
    const store: Store = {
      ...raw,
      getUserById: async (id) => {
        counts.getUser += 1;
        return raw.getUserById(id);
      },
      listLojas: async (organizationId) => {
        counts.listLojas += 1;
        return raw.listLojas(organizationId);
      },
      getSession: async (token) => {
        counts.getSession += 1;
        return raw.getSession(token);
      },
    };
    const app = appWith(store);
    await app.seed();
    const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
    counts.getUser = 0;
    counts.listLojas = 0;
    counts.getSession = 0;

    const chrome = await app.abrirChrome(session.token);

    expect(chrome?.actor.email).toBe("dono@doguinho.local");
    expect(chrome?.lojas.map((loja) => loja.nome)).toEqual([
      "Centro",
      "Jardim Juliana",
      "Magalhães",
    ]);
    expect(counts.getUser).toBe(0);
    expect(counts.listLojas).toBe(0);
    expect(counts.getSession).toBe(0);
  });
});

describe("waterfalls apontados pela medida", () => {
  it("dashboard lê o catálogo uma vez", async () => {
    const raw = createMemoryStore();
    const counts = { produtos: 0 };
    const store: Store = {
      ...raw,
      listProdutos: async (organizationId) => {
        counts.produtos += 1;
        return raw.listProdutos(organizationId);
      },
    };
    const app = appWith(store);
    await app.seed();
    const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
    const dono = await app.resolverSessao(session.token);
    if (!dono) throw new Error("Dono sem sessão");
    counts.produtos = 0;

    const dash = await app.dashboard(dono);

    expect(dash.estoque.length).toBeGreaterThanOrEqual(3);
    expect(counts.produtos).toBe(1);
  });

  it("listarUsuarios não lê Vínculo por usuário", async () => {
    const raw = createMemoryStore();
    const counts = { vinculosOf: 0 };
    const store: Store = {
      ...raw,
      vinculosOf: async (userId) => {
        counts.vinculosOf += 1;
        return raw.vinculosOf(userId);
      },
    };
    const app = appWith(store);
    await app.seed();
    const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
    const dono = await app.resolverSessao(session.token);
    if (!dono) throw new Error("Dono sem sessão");
    counts.vinculosOf = 0;

    const users = await app.listarUsuarios(dono);

    expect(users.length).toBeGreaterThanOrEqual(4);
    expect(users.every((user) => Array.isArray(user.lojaIds))).toBe(true);
    expect(counts.vinculosOf).toBe(0);
  });

  it("assembleWorkspace do Fechamento lê produtos, Loja e rascunho uma vez", async () => {
    const raw = createMemoryStore();
    const counts = { produtos: 0, getLoja: 0, rascunho: 0 };
    const store: Store = {
      ...raw,
      listProdutos: async (organizationId) => {
        counts.produtos += 1;
        return raw.listProdutos(organizationId);
      },
      getLoja: async (id) => {
        counts.getLoja += 1;
        return raw.getLoja(id);
      },
      getRascunho: async (lojaId, day) => {
        counts.rascunho += 1;
        return raw.getRascunho(lojaId, day);
      },
    };
    const app = appWith(store);
    await app.seed();
    const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
    const dono = await app.resolverSessao(session.token);
    if (!dono) throw new Error("Dono sem sessão");
    const lojas = await app.listarLojas(dono);
    const centro = lojas.find((loja) => loja.nome === "Centro");
    if (!centro) throw new Error("seed sem Loja Centro");
    counts.produtos = 0;
    counts.getLoja = 0;
    counts.rascunho = 0;

    const workspace = await assembleWorkspace(app, dono, lojas, centro.id, {
      produtos: true,
      lojaState: true,
    });

    expect(workspace.lojaId).toBe(centro.id);
    expect(workspace.produtos.length).toBeGreaterThan(0);
    expect(workspace.snap).not.toBeNull();
    expect(counts.produtos).toBe(1);
    expect(counts.getLoja).toBe(1);
    expect(counts.rascunho).toBe(1);
  });
});
