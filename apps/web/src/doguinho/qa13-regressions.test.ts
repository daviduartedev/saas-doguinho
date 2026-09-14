// SCRATCH QA-13: testes de regressão red→green para os bugs encontrados na rodada.
// Cada bloco referencia o ID do bug em docs/qa/QA_REPORT.md.
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- mocks de fronteira Next (actions rodam fora do servidor Next aqui) ----
let sessionToken: string | undefined;
const redirectMock = vi.hoisted(() =>
  vi.fn((url: string): never => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${url}`), { digest: "NEXT_REDIRECT" });
  }),
);
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { criarLojaAction } from "./admin-actions";
import { getApp } from "./runtime";
import { exigirActor } from "./sessao";

const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn((nome: string) => (nome === "doguinho_session" && sessionToken ? { value: sessionToken } : undefined)),
    set: vi.fn(),
    delete: deleteMock,
  })),
}));

async function loginDono() {
  const app = await getApp();
  const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  sessionToken = session.token;
}

beforeEach(() => {
  sessionToken = undefined;
  redirectMock.mockClear();
  deleteMock.mockClear();
});

describe("QA-009 — criarLojaAction não pode engolir o erro de domínio", () => {
  it("quarta Loja propaga ValidationError (não vira 'Não foi possível salvar.')", async () => {
    await loginDono();
    const fd = new FormData();
    fd.set("nome", `Loja QA009 ${Date.now()}`);
    await expect(criarLojaAction(fd)).rejects.toMatchObject({ code: "validation" });
    await expect(criarLojaAction(fd)).rejects.toThrow(/3 Lojas/);
  });
});

describe("QA-002 — cookie de sessão inválido não pode cair em loop de redirects", () => {
  it("exigirActor com token inválido redireciona para /sair (limpa o cookie), não para /entrar", async () => {
    sessionToken = "token-lixo-que-nao-existe";
    await expect(exigirActor()).rejects.toThrow(/NEXT_REDIRECT \/sair/);
  });

  it("exigirActor sem cookie vai direto para /entrar", async () => {
    sessionToken = undefined;
    await expect(exigirActor()).rejects.toThrow(/NEXT_REDIRECT \/entrar/);
  });

  it("GET /sair apaga o cookie e redireciona para /entrar", async () => {
    const { GET } = await import("../app/sair/route");
    await expect(GET()).rejects.toThrow(/NEXT_REDIRECT \/entrar/);
    expect(deleteMock).toHaveBeenCalledWith("doguinho_session");
  });

  it("layout (app) com token inválido também vai para /sair (não /entrar)", { timeout: 15_000 }, async () => {
    sessionToken = "token-lixo-que-nao-existe";
    const { default: AppGroupLayout } = await import("../app/(app)/layout");
    await expect(AppGroupLayout({ children: null })).rejects.toThrow(/NEXT_REDIRECT \/sair/);
  });
});

describe("QA-004 — isAppError reconhece erros de domínio entre camadas (sem instanceof)", () => {
  it("objeto estrutural com code de domínio é tratado como AppError", async () => {
    const { isAppError } = await import("./errors");
    // simula erro que cruzou a fronteira de camadas do dev server (outra instância de errors.ts)
    const crossLayer = { name: "ConflictError", message: "Já existe um Produto com esse nome.", code: "conflict" };
    expect(isAppError(crossLayer)).toBe(true);
    expect(isAppError(new Error("boom"))).toBe(false);
    // erro de banco (SQLSTATE) NÃO pode vazar como mensagem de domínio
    expect(isAppError({ name: "PostgresError", message: "duplicate key", code: "23505" })).toBe(false);
  });
});

describe("QA-007 — nome de Produto desativado não pode ficar queimado para sempre", () => {
  it("criar Produto com nome de um desativado é permitido (histórico do antigo preservado)", async () => {
    await loginDono();
    const app = await getApp();
    const { actorDaSessao } = await import("./sessao");
    void actorDaSessao;
    const actor = { ...(await app.entrar({ email: "dono@doguinho.local", senha: "coruja" })).actor };
    const nome = `Produto QA007 ${Date.now()}`;
    const original = await app.criarProduto(actor, { nome, unidade: "unidade" });
    await app.desativarProduto(actor, { id: original.id });
    // bug: findProdutoByName casa com inativo → ConflictError para sempre
    const novo = await app.criarProduto(actor, { nome, unidade: "kg" });
    expect(novo.id).not.toBe(original.id);
    expect(novo.ativo).toBe(true);
  });
});

describe("QA-008 — corrida de e-mail duplicado na criação de usuário", () => {
  it("duas criações concorrentes com o mesmo e-mail: exatamente uma vence", async () => {
    const app = await getApp();
    const actor = (await app.entrar({ email: "dono@doguinho.local", senha: "coruja" })).actor;
    const perfis = await app.listarPerfis(actor);
    const email = `race-${Date.now()}@doguinho.local`;
    const input = { nome: "Corrida", email, senha: "qa123456", perfilId: perfis[0]!.id, lojaIds: [] as string[] };
    // bug: check-then-insert com ~1s de bcrypt entre os dois → ambas passam
    const results = await Promise.allSettled([app.criarUsuario(actor, input), app.criarUsuario(actor, input)]);
    const vitorias = results.filter((r) => r.status === "fulfilled");
    expect(vitorias).toHaveLength(1);
  });
});

describe("QA-010 — limites de tamanho enforced no servidor (client maxLength é contornável)", () => {
  it("criar Loja com nome > 80 chars é rejeitado", async () => {
    const app = await getApp();
    const actor = (await app.entrar({ email: "dono@doguinho.local", senha: "coruja" })).actor;
    await expect(app.criarLoja(actor, { nome: "L".repeat(81) })).rejects.toThrow(/80/);
  });

  it("criar Produto com nome > 80 chars é rejeitado", async () => {
    const app = await getApp();
    const actor = (await app.entrar({ email: "dono@doguinho.local", senha: "coruja" })).actor;
    await expect(app.criarProduto(actor, { nome: "P".repeat(81), unidade: "unidade" })).rejects.toThrow(/80/);
  });

  it("Justificativa > 1000 chars é rejeitada no enviar", async () => {
    const app = await getApp();
    const actor = (await app.entrar({ email: "dono@doguinho.local", senha: "coruja" })).actor;
    const lojas = await app.listarLojas(actor);
    const produtos = await app.listarProdutos(actor);
    const linhas = produtos.filter((p) => p.ativo).map((p) => ({ produtoId: p.id, restante: 1 }));
    await app.enviar(actor, { lojaId: lojas[0]!.id, linhas });
    await expect(
      app.enviar(actor, { lojaId: lojas[0]!.id, linhas, justificativa: "J".repeat(1001) }),
    ).rejects.toThrow(/1000/);
  });
});
