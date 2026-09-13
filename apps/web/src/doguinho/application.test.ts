import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";
import {
  AuthFailedError,
  ConflictError,
  ForbiddenError,
  UnauthenticatedError,
  ValidationError,
} from "./errors";
import type { Actor, QuantidadeLinha } from "./types";
import { SEED_DONO_EMAIL, SEED_DONO_PASSWORD } from "./seed";

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

describe("Doguinho application", () => {
  it("lets the seed Dono sign in and rejects public registration", async () => {
    const { app } = await createTestApp();

    const session = await app.entrar({
      email: SEED_DONO_EMAIL,
      senha: SEED_DONO_PASSWORD,
    });
    expect(session.actor.isDono).toBe(true);
    expect(session.token.length).toBeGreaterThan(16);

    expect(app).not.toHaveProperty("registrar");
    expect(
      await app.entrar({ email: "estranho@example.com", senha: "qualquer" }).catch((error) => error),
    ).toBeInstanceOf(AuthFailedError);
    expect(
      await app.entrar({ email: SEED_DONO_EMAIL, senha: "errada" }).catch((error) => error),
    ).toBeInstanceOf(AuthFailedError);
  });

  it("keeps the three seed Lojas and refuses a fourth", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const lojas = await app.listarLojas(dono);
    expect(lojas.map((loja) => loja.nome)).toEqual(["Centro", "Jardim Juliana", "Magalhães"]);

    await expect(app.criarLoja(dono, { nome: "Shopping" })).rejects.toBeInstanceOf(ValidationError);
    await expect(app.criarLoja(dono, { nome: "Shopping" })).rejects.toThrow(/3 Lojas/);
    const depois = await app.listarLojas(dono);
    expect(depois).toHaveLength(3);
  });

  it("registers Produto with a closed Unidade de medida and rejects duplicates and free text", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const extra = await app.criarProduto(dono, { nome: "Ketchup", unidade: "L" });
    expect(extra.unidade).toBe("L");
    await expect(app.criarProduto(dono, { nome: "ketchup", unidade: "L" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(
      app.criarProduto(dono, { nome: "Saco de milho", unidade: "saco" as never }),
    ).rejects.toBeInstanceOf(ValidationError);

    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    await app.editarProduto(dono, { id: pao.id, nome: "Pão de hot dog", unidade: "unidade" });
    await app.desativarProduto(dono, { id: pao.id });
    const ativos = (await app.listarProdutos(dono)).filter((produto) => produto.ativo);
    expect(ativos.find((produto) => produto.id === pao.id)).toBeUndefined();
  });

  it("refuses to delete a Produto that has Fechamento history", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const linhas = await linhasCompletas(app, dono, 1);
    await app.enviar(dono, { lojaId: centro.id, linhas });
    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    await expect(app.excluirProduto(dono, { id: pao.id })).rejects.toBeInstanceOf(ConflictError);
    await app.desativarProduto(dono, { id: pao.id });
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(historico[0].submission.linhas.some((linha) => linha.produtoId === pao.id)).toBe(true);
  });

  it("creates a named Perfil without Lojas on the checklist and keeps create Perfil/Loja Dono-only", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const perfil = await app.criarPerfil(dono, {
      nome: "Conferente",
      permissions: ["read_estoque", "submit_fechamento"],
    });
    expect(perfil.permissions).toEqual(["read_estoque", "submit_fechamento"]);
    expect(perfil).not.toHaveProperty("lojaIds");

    const operadorPerfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    expect(operadorPerfil.template).toBe(true);
    expect(operadorPerfil.permissions).not.toContain("dashboard");

    const user = await app.criarUsuario(dono, {
      email: "maria@doguinho.local",
      senha: "senha1234",
      nome: "Maria",
      perfilId: operadorPerfil.id,
      lojaIds: [(await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!.id],
    });
    const maria = (await app.entrar({ email: "maria@doguinho.local", senha: "senha1234" })).actor;
    await expect(app.criarLoja(maria, { nome: "Hack" })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      app.criarPerfil(maria, { nome: "Admin", permissions: ["dashboard"] }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      app.excluirPerfil(dono, { id: operadorPerfil.id }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(user.email).toBe("maria@doguinho.local");
  });

  it("lets the Dono attach Maria to Centro and Jardim Juliana and later change Vínculo and Perfil", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const lojas = await app.listarLojas(dono);
    const centro = lojas.find((loja) => loja.nome === "Centro")!;
    const praia = lojas.find((loja) => loja.nome === "Jardim Juliana")!;
    const estacao = lojas.find((loja) => loja.nome === "Magalhães")!;
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "maria@doguinho.local",
      senha: "senha1234",
      nome: "Maria",
      perfilId: perfil.id,
      lojaIds: [centro.id, praia.id],
    });
    const maria = (await app.entrar({ email: "maria@doguinho.local", senha: "senha1234" })).actor;
    expect(maria.vinculoLojaIds.sort()).toEqual([centro.id, praia.id].sort());
    await expect(app.estoqueDaLoja(maria, estacao.id)).rejects.toBeInstanceOf(ForbiddenError);

    await app.alterarVinculo(dono, { userId: maria.userId, lojaIds: [centro.id] });
    await app.alterarPerfilUsuario(dono, { userId: maria.userId, perfilId: perfil.id });
    const depois = await app.resolverSessao(
      (await app.entrar({ email: "maria@doguinho.local", senha: "senha1234" })).token,
    );
    expect(depois?.vinculoLojaIds).toEqual([centro.id]);
  });

  it("refuses removing the last Dono and does not require a Vínculo row for Dono access", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    await expect(app.rebaixarDono(dono, { userId: dono.userId })).rejects.toBeInstanceOf(
      ConflictError,
    );
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(estoque.loja.id).toBe(centro.id);
  });

  it("rejects an Operador of Loja A reading or writing Loja B and logs the 403", async () => {
    const { app, events } = await createTestApp();
    const dono = await asDono(app);
    const lojas = await app.listarLojas(dono);
    const centro = lojas.find((loja) => loja.nome === "Centro")!;
    const praia = lojas.find((loja) => loja.nome === "Jardim Juliana")!;
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "op@doguinho.local",
      senha: "senha1234",
      nome: "Operador Centro",
      perfilId: perfil.id,
      lojaIds: [centro.id],
    });
    const op = (await app.entrar({ email: "op@doguinho.local", senha: "senha1234" })).actor;
    await expect(app.estoqueDaLoja(op, praia.id)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      app.enviar(op, { lojaId: praia.id, linhas: await linhasCompletas(app, dono, 2) }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(app.historico(op, { lojaId: praia.id })).rejects.toBeInstanceOf(ForbiddenError);
    expect(events.some((event) => event.type === "forbidden_loja" && event.lojaId === praia.id)).toBe(
      true,
    );
    expect(events.every((event) => !JSON.stringify(event).includes("senha"))).toBe(true);
  });

  it("lets an Operador with no Vínculo authenticate but not Enviar", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "semloja@doguinho.local",
      senha: "senha1234",
      nome: "Sem Loja",
      perfilId: perfil.id,
      lojaIds: [],
    });
    const op = (await app.entrar({ email: "semloja@doguinho.local", senha: "senha1234" })).actor;
    expect(op.vinculoLojaIds).toEqual([]);
    const centro = (await app.listarLojas(dono))[0]!;
    await expect(
      app.enviar(op, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 1) }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("does not turn a Rascunho into official Estoque", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const linhas = await linhasCompletas(app, dono, 4);
    linhas[0] = { ...linhas[0], restante: 8 };
    await app.salvarRascunho(dono, { lojaId: centro.id, linhas });
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(Object.values(estoque.valores).every((valor) => valor === null)).toBe(true);
    expect(estoque.status).toBe("rascunho");
    const dash = await app.dashboard(dono);
    expect(dash.semFechamentoHoje.some((loja) => loja.id === centro.id)).toBe(true);
  });

  it("sets Estoque to quantidade restante for every Produto ativo and accepts 0", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    const linhas = await linhasCompletas(app, dono, 3);
    const comPao = linhas.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 0 } : linha,
    );
    const envio = await app.enviar(dono, { lojaId: centro.id, linhas: comPao });
    expect(envio.tipo).toBe("fechamento");
    expect(envio.justificativa).toBeNull();
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(estoque.valores[pao.id]).toBe(0);
    expect(estoque.status).toBe("enviado");
    for (const linha of comPao) {
      expect(estoque.valores[linha.produtoId]).toBe(linha.restante);
    }
  });

  it("leaves Estoque unchanged when Enviar is missing a Produto ativo", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const linhas = await linhasCompletas(app, dono, 5);
    linhas[0] = { ...linhas[0], restante: null };
    await expect(app.enviar(dono, { lojaId: centro.id, linhas })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(Object.values(estoque.valores).every((valor) => valor === null)).toBe(true);
  });

  it("rejects negatives, oversized numbers, and fractional unidade/pacote", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const produtos = await app.listarProdutos(dono);
    const pao = produtos.find((produto) => produto.nome === "Pão")!;
    const milho = produtos.find((produto) => produto.nome === "Milho")!;
    const linhas = await linhasCompletas(app, dono, 1);

    const negativo = linhas.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: -1 } : linha,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: negativo })).rejects.toBeInstanceOf(
      ValidationError,
    );

    const teto = linhas.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 100000 } : linha,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: teto })).rejects.toBeInstanceOf(
      ValidationError,
    );

    const meioPao = linhas.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 1.5 } : linha,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: meioPao })).rejects.toBeInstanceOf(
      ValidationError,
    );

    const milhoOk = linhas.map((linha) =>
      linha.produtoId === milho.id ? { ...linha, restante: 1.5 } : linha,
    );
    await app.enviar(dono, { lojaId: centro.id, linhas: milhoOk });
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(estoque.valores[milho.id]).toBe(1.5);
  });

  it("turns a double first Enviar into one Fechamento", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const linhas = await linhasCompletas(app, dono, 9);
    const primeiro = await app.enviar(dono, { lojaId: centro.id, linhas });
    const segundo = await app.enviar(dono, { lojaId: centro.id, linhas });
    expect(segundo.id).toBe(primeiro.id);
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(historico).toHaveLength(1);
    expect(historico[0].submission.tipo).toBe("fechamento");
  });

  it("requires Justificativa on the second submit of the day and keeps the original Fechamento", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    const primeiro = await linhasCompletas(app, dono, 18);
    await app.enviar(dono, { lojaId: centro.id, linhas: primeiro });
    const segundo = primeiro.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 16 } : linha,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: segundo })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const correcao = await app.enviar(dono, {
      lojaId: centro.id,
      linhas: segundo,
      justificativa: "Contei de novo o pão",
    });
    expect(correcao.tipo).toBe("correcao");
    expect(correcao.justificativa).toBe("Contei de novo o pão");
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(historico).toHaveLength(2);
    expect(historico.map((row) => row.submission.tipo).sort()).toEqual(["correcao", "fechamento"]);
    const linhaPao = correcao.linhas.find((linha) => linha.produtoId === pao.id)!;
    expect(linhaPao.anterior).toBe(18);
    expect(linhaPao.nova).toBe(16);
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(estoque.valores[pao.id]).toBe(16);
  });

  it("does not rewrite a past calendar day when the clock moves forward", async () => {
    let now = new Date("2026-09-10T21:00:00-03:00");
    const { app } = await createTestApp({ now: () => now });
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const dia10 = await app.enviar(dono, {
      lojaId: centro.id,
      linhas: await linhasCompletas(app, dono, 2),
    });
    now = new Date("2026-09-11T10:00:00-03:00");
    const dia11 = await app.enviar(dono, {
      lojaId: centro.id,
      linhas: await linhasCompletas(app, dono, 1),
      justificativa: "ontem",
      calendarDay: "2026-09-10",
    } as never);
    expect(dia11.calendarDay).toBe("2026-09-11");
    expect(dia11.tipo).toBe("fechamento");
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(
      historico.some(
        (row) => row.submission.id === dia10.id && row.submission.calendarDay === "2026-09-10",
      ),
    ).toBe(true);
  });

  it("disables a user so the next request cannot Enviar", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "op@doguinho.local",
      senha: "senha1234",
      nome: "Op",
      perfilId: perfil.id,
      lojaIds: [centro.id],
    });
    const session = await app.entrar({ email: "op@doguinho.local", senha: "senha1234" });
    await app.desligarUsuario(dono, { userId: session.actor.userId });
    await expect(app.resolverSessao(session.token)).resolves.toBeNull();
    await expect(
      app.entrar({ email: "op@doguinho.local", senha: "senha1234" }),
    ).rejects.toBeInstanceOf(AuthFailedError);
  });

  it("shows nunca fechou rather than a fake 0 and empty catalog cannot Enviar", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const estacao = (await app.listarLojas(dono)).find((loja) => loja.nome === "Magalhães")!;
    const estoque = await app.estoqueDaLoja(dono, estacao.id);
    expect(estoque.status).toBe("nunca_fechou");
    expect(Object.values(estoque.valores).every((valor) => valor === null)).toBe(true);

    for (const produto of await app.listarProdutos(dono)) {
      await app.desativarProduto(dono, { id: produto.id });
    }
    await expect(app.enviar(dono, { lojaId: estacao.id, linhas: [] })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it("puts a new Produto on an open Rascunho and on the next Correção, not on a closed day without Correção", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const praia = (await app.listarLojas(dono)).find((loja) => loja.nome === "Jardim Juliana")!;
    await app.salvarRascunho(dono, {
      lojaId: centro.id,
      linhas: await linhasCompletas(app, dono, 1),
    });
    const extra = await app.criarProduto(dono, { nome: "Ketchup", unidade: "L" });
    const rascunho = await app.rascunhoDoDia(dono, centro.id);
    expect(rascunho.some((linha) => linha.produtoId === extra.id)).toBe(true);

    await app.enviar(dono, { lojaId: praia.id, linhas: await linhasCompletas(app, dono, 2) });
    const form = await app.rascunhoDoDia(dono, praia.id);
    expect(form.some((linha) => linha.produtoId === extra.id)).toBe(true);
  });

  it("ignores client-supplied author and timestamps on Enviar", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const envio = await app.enviar(dono, {
      lojaId: centro.id,
      linhas: await linhasCompletas(app, dono, 1),
      usuarioId: "forjado",
      enviadoEm: "1999-01-01T00:00:00.000Z",
    } as never);
    expect(envio.usuarioId).toBe(dono.userId);
    expect(envio.enviadoEm.startsWith("1999")).toBe(false);
  });

  it("keeps history of a disabled user and hides dashboard from the Operador template", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "op@doguinho.local",
      senha: "senha1234",
      nome: "Op",
      perfilId: perfil.id,
      lojaIds: [centro.id],
    });
    const op = (await app.entrar({ email: "op@doguinho.local", senha: "senha1234" })).actor;
    await app.enviar(op, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 7) });
    await app.desligarUsuario(dono, { userId: op.userId });
    const historico = await app.historico(dono, { lojaId: centro.id });
    expect(historico[0].usuarioNome).toBe("Op");
    await expect(app.dashboard(op)).rejects.toBeInstanceOf(ForbiddenError);
    const dash = await app.dashboard(dono);
    expect(dash.recentes[0].submission.tipo).toBe("fechamento");
    expect(dash.historicos.length).toBeGreaterThan(0);
    expect(dash).not.toHaveProperty("vendas");
  });

  it("rejects Enviar when the session is gone", async () => {
    const { app } = await createTestApp();
    await expect(app.resolverSessao("missing")).resolves.toBeNull();
    expect(UnauthenticatedError).toBeDefined();
  });
});
