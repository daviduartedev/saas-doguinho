// SCRATCH QA-07 (PROD-07): exclusão de Produto — com histórico bloqueada, sem histórico permitida.
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
  it("PROD-07: excluir Produto COM histórico → ConflictError", async () => {
    const { app, dono, centro } = await setup();
    const produtos = await app.listarProdutos(dono);
    const milho = produtos.find((p) => p.nome === "Milho")!;
    // dá histórico ao Milho: fechamento completo em Centro
    const ativos = produtos.filter((p) => p.ativo);
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: ativos.map((p) => ({ produtoId: p.id, restante: 1 })),
      justificativa: null,
    });
    await expect(app.excluirProduto(dono, { id: milho.id })).rejects.toThrow(
      "Produto com histórico de Fechamento não pode ser excluído.",
    );
  });

  it("PROD-07b: excluir Produto SEM histórico → permitido", async () => {
    const { app, dono } = await setup();
    const novo = await app.criarProduto(dono, { nome: "Descartável QA", unidade: "unidade" });
    await app.excluirProduto(dono, { id: novo.id });
    const depois = await app.listarProdutos(dono);
    expect(depois.find((p) => p.id === novo.id)).toBeUndefined();
  });
});
