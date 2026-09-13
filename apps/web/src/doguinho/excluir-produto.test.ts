import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";
import { SEED_DONO_EMAIL, SEED_DONO_PASSWORD } from "./seed";

async function asDono(app: Awaited<ReturnType<typeof createTestApp>>["app"]) {
  return (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
}

describe("Dono exclui Produto do catálogo", () => {
  it("excluir sem histórico some do catálogo e não resta linha", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const extra = await app.criarProduto(dono, { nome: "Descartável QA", unidade: "unidade" });

    await app.excluirProduto(dono, { id: extra.id });

    const catalogo = await app.listarProdutos(dono);
    expect(catalogo.find((produto) => produto.id === extra.id)).toBeUndefined();
    expect(catalogo.find((produto) => produto.nome === "Descartável QA")).toBeUndefined();
  });

  it("excluir com histórico some do catálogo e do próximo Fechamento; Histórico guarda nome e quantidades", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const extra = await app.criarProduto(dono, { nome: "Mostarda Extra", unidade: "L" });
    const ativos = (await app.listarProdutos(dono)).filter((produto) => produto.ativo);
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: ativos.map((produto) => ({
        produtoId: produto.id,
        restante: produto.id === extra.id ? 7 : 1,
      })),
    });

    await app.excluirProduto(dono, { id: extra.id });

    const catalogo = await app.listarProdutos(dono);
    expect(catalogo.find((produto) => produto.id === extra.id)).toBeUndefined();
    const proximo = await app.rascunhoDoDia(dono, centro.id);
    expect(proximo.some((linha) => linha.produtoId === extra.id)).toBe(false);

    const historico = await app.historico(dono, { lojaId: centro.id });
    const linha = historico[0].submission.linhas.find((item) => item.produtoId === extra.id);
    expect(linha?.nova).toBe(7);
    expect(historico[0].produtoNomes[extra.id]).toBe("Mostarda Extra");
  });

  it("depois de excluir com histórico, o mesmo nome pode ser cadastrado de novo", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const extra = await app.criarProduto(dono, { nome: "Ketchup Extra", unidade: "L" });
    const ativos = (await app.listarProdutos(dono)).filter((produto) => produto.ativo);
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: ativos.map((produto) => ({ produtoId: produto.id, restante: 1 })),
    });
    await app.excluirProduto(dono, { id: extra.id });

    const novo = await app.criarProduto(dono, { nome: "Ketchup Extra", unidade: "kg" });
    expect(novo.id).not.toBe(extra.id);
    expect(novo.ativo).toBe(true);
    expect(novo.nome).toBe("Ketchup Extra");
  });
});
