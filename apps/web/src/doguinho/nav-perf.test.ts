import { describe, expect, it } from "vitest";
import { createDoguinhoApp } from "./app";
import { cryptoIds } from "./ids";
import { capturingLogger } from "./log";
import { createMemoryStore } from "./memory-store";
import { fakePasswords } from "./passwords-fake";
import type { Store } from "./store";

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
