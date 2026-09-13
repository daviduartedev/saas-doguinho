// SCRATCH QA-07 (PROD-07): exclusão de Produto — some do catálogo; com histórico o passado fica.
// Temporário; versão permanente nasce em QA-14.
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";

async function setup() {
  const { app } = await createTestApp();
  const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  const dono = await app.resolverSessao(session.token);
  if (!dono) throw new Error("sessão do Dono não resolveu");
  const lojas = await app.listarLojas(dono);
  const centro = lojas.find((loja) => loja.nome === "Centro");
  if (!centro) throw new Error("seed sem Loja Centro");
  return { app, dono, centro };
}

describe("QA-07 — exclusão de Produto (seam app)", () => {
  it("PROD-07: excluir Produto COM histórico some do catálogo e guarda o passado", async () => {
    const { app, dono, centro } = await setup();
    const produtos = await app.listarProdutos(dono);
    const milho = produtos.find((p) => p.nome === "Milho")!;
    const ativos = produtos.filter((p) => p.ativo);
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: ativos.map((p) => ({ produtoId: p.id, restante: 1 })),
      justificativa: null,
    });
    await app.excluirProduto(dono, { id: milho.id });
    const depois = await app.listarProdutos(dono);
    expect(depois.find((p) => p.id === milho.id)).toBeUndefined();
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(historico[0].submission.linhas.some((linha) => linha.produtoId === milho.id)).toBe(true);
    expect(historico[0].produtoNomes[milho.id]).toBe("Milho");
  });

  it("PROD-07b: excluir Produto SEM histórico → permitido", async () => {
    const { app, dono } = await setup();
    const novo = await app.criarProduto(dono, { nome: "Descartável QA", unidade: "unidade" });
    await app.excluirProduto(dono, { id: novo.id });
    const depois = await app.listarProdutos(dono);
    expect(depois.find((p) => p.id === novo.id)).toBeUndefined();
  });
});
