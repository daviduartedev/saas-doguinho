import { describe, expect, it } from "vitest";
import type { DoguinhoApp } from "./app";
import { createTestApp } from "./test-harness";
import { assembleWorkspace } from "./workspace";

async function setup() {
  const { app } = await createTestApp();
  const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  const dono = await app.resolverSessao(session.token);
  if (!dono) throw new Error("sessão do Dono não resolveu");
  const lojas = await app.listarLojas(dono);
  return { app, dono, lojas };
}

function withCallCounts(app: DoguinhoApp) {
  const counts = { produtos: 0, estado: 0 };
  const wrapped: DoguinhoApp = {
    ...app,
    listarProdutos: async (actor) => {
      counts.produtos += 1;
      return app.listarProdutos(actor);
    },
    estadoDaLoja: async (actor, lojaId) => {
      counts.estado += 1;
      return app.estadoDaLoja(actor, lojaId);
    },
  };
  return { app: wrapped, counts };
}

describe("assembleWorkspace", () => {
  it("chrome-only não busca catálogo nem Estoque da Loja", async () => {
    const { app, dono, lojas } = await setup();
    const spy = withCallCounts(app);
    const workspace = await assembleWorkspace(spy.app, dono, lojas, undefined, {
      produtos: false,
      lojaState: false,
    });
    expect(spy.counts).toEqual({ produtos: 0, estado: 0 });
    expect(workspace.produtos).toEqual([]);
    expect(workspace.snap).toBeNull();
    expect(workspace.linhas).toEqual([]);
    expect(workspace.lojas.length).toBeGreaterThan(0);
  });

  it("lojaState busca snapshot e rascunho em paralelo só da Loja do filtro", async () => {
    const { app, dono, lojas } = await setup();
    const centro = lojas.find((loja) => loja.nome === "Centro");
    if (!centro) throw new Error("seed sem Loja Centro");
    const spy = withCallCounts(app);
    const workspace = await assembleWorkspace(spy.app, dono, lojas, centro.id, {
      produtos: true,
      lojaState: true,
    });
    expect(spy.counts.produtos).toBe(0);
    expect(spy.counts.estado).toBe(1);
    expect(workspace.lojaId).toBe(centro.id);
    expect(workspace.filtro).toBe(centro.id);
    expect(workspace.produtos.length).toBeGreaterThan(0);
  });
});
