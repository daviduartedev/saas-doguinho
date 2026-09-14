import { describe, expect, it } from "vitest";
import { ForbiddenError } from "./errors";
import { SEED_DONO_EMAIL, SEED_DONO_PASSWORD } from "./seed";
import { createTestApp } from "./test-harness";
import type { Actor, QuantidadeLinha } from "./types";

async function asDono(app: Awaited<ReturnType<typeof createTestApp>>["app"]) {
  return (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
}

async function linhasCompletas(
  app: Awaited<ReturnType<typeof createTestApp>>["app"],
  actor: Actor,
  restante: number,
): Promise<QuantidadeLinha[]> {
  const produtos = (await app.listarProdutos(actor)).filter((produto) => produto.ativo);
  return produtos.map((produto) => ({ produtoId: produto.id, restante }));
}

describe("relatoriosDoDia", () => {
  it("devolve quantidade restante de cada Loja visível sem a timeline do dia", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const lojas = await app.listarLojas(dono);
    const centro = lojas.find((loja) => loja.nome === "Centro")!;
    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    const primeiro = await linhasCompletas(app, dono, 18);
    await app.enviar(dono, { lojaId: centro.id, linhas: primeiro });
    const segundo = primeiro.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 13 } : linha,
    );
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: segundo,
      justificativa: "Contei de novo o pão",
    });

    const secoes = await app.relatoriosDoDia(dono);

    expect(secoes.map((secao) => secao.loja.nome)).toEqual([
      "Centro",
      "Jardim Juliana",
      "Magalhães",
    ]);
    expect(secoes.every((secao) => !("envios" in secao))).toBe(true);
    const centroSecao = secoes.find((secao) => secao.loja.id === centro.id)!;
    expect(centroSecao.linhas.find((linha) => linha.produtoId === pao.id)?.restante).toBe(13);
    const juliana = secoes.find((secao) => secao.loja.nome === "Jardim Juliana")!;
    expect(juliana.linhas.every((linha) => linha.restante === null)).toBe(true);
  });

  it("recusa quem não lê Estoque", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const restrito = await app.criarPerfil(dono, {
      nome: "Só Histórico",
      permissions: ["read_history"],
    });
    await app.criarUsuario(dono, {
      email: "so.historico@doguinho.local",
      senha: "senha1234",
      nome: "Arquivo",
      perfilId: restrito.id,
      lojaIds: [centro.id],
    });
    const actor = (await app.entrar({ email: "so.historico@doguinho.local", senha: "senha1234" }))
      .actor;
    await expect(app.relatoriosDoDia(actor)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
