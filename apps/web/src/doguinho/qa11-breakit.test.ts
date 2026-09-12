// SCRATCH QA-11: payloads adulterados no seam app (BREAK-06/07).
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";

async function setup() {
  const { app } = await createTestApp();
  const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  const dono = await app.resolverSessao(session.token);
  if (!dono) throw new Error("sem Dono");
  const lojas = await app.listarLojas(dono);
  const centro = lojas.find((l) => l.nome === "Centro")!;
  const produtos = await app.listarProdutos(dono);
  const ativos = produtos.filter((p) => p.ativo);
  return { app, dono, centro, ativos };
}

describe("QA-11 — payloads adulterados (seam app)", () => {
  it("BREAK-06a: produtoId inexistente no lugar de um ativo → erro de incompleto, nada gravado", async () => {
    const { app, dono, centro, ativos } = await setup();
    const linhas = ativos.map((p, i) => ({ produtoId: i === 0 ? "id-adulterado" : p.id, restante: 1 }));
    await expect(app.enviar(dono, { lojaId: centro.id, linhas, justificativa: null })).rejects.toThrow(
      "Informe a quantidade restante de todos os Produtos ativos.",
    );
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(Object.values(estoque.valores).every((v) => v === null || v === undefined)).toBe(true);
  });

  it("BREAK-06b: linhas completas + produtoId extra adulterado → extra ignorado, Estoque só dos ativos", async () => {
    const { app, dono, centro, ativos } = await setup();
    const linhas = [
      ...ativos.map((p) => ({ produtoId: p.id, restante: 2 })),
      { produtoId: "id-adulterado", restante: 999 },
    ];
    await app.enviar(dono, { lojaId: centro.id, linhas, justificativa: null });
    const estoque = await app.estoqueDaLoja(dono, centro.id);
    expect(estoque.valores["id-adulterado"]).toBeUndefined();
    for (const p of ativos) expect(estoque.valores[p.id]).toBe(2);
  });

  it("BREAK-07: 1e15 / NaN / Infinity / -Infinity rejeitados", async () => {
    const { app, dono, centro, ativos } = await setup();
    const base = ativos.map((p) => ({ produtoId: p.id, restante: 1 }));
    const com = (v: number) => base.map((l, i) => (i === 0 ? { ...l, restante: v } : l));
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: com(1e15), justificativa: null })).rejects.toThrow(
      /acima do teto/,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: com(NaN), justificativa: null })).rejects.toThrow(
      /inválida|Informe a quantidade/,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: com(Infinity), justificativa: null })).rejects.toThrow(
      /inválida/,
    );
    await expect(app.enviar(dono, { lojaId: centro.id, linhas: com(-Infinity), justificativa: null })).rejects.toThrow(
      /inválida/,
    );
  });

  it("BREAK-07b: 1e15 como string via Number() ('1e15' → 1000000000000000) → teto", async () => {
    const { app, dono, centro, ativos } = await setup();
    const linhas = ativos.map((p, i) => ({ produtoId: p.id, restante: i === 0 ? Number("1e15") : 1 }));
    await expect(app.enviar(dono, { lojaId: centro.id, linhas, justificativa: null })).rejects.toThrow(
      /acima do teto/,
    );
  });
});
