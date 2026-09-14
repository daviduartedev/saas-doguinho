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

describe("enviosDoDia", () => {
  it("returns only today's submissions for the Loja", async () => {
    let now = new Date("2026-09-10T21:00:00-03:00");
    const { app } = await createTestApp({ now: () => now });
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;

    await app.enviar(dono, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 2) });
    now = new Date("2026-09-11T10:00:00-03:00");
    await app.enviar(dono, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 1) });

    const hoje = await app.enviosDoDia(dono, { lojaId: centro.id });
    expect(hoje).toHaveLength(1);
    expect(hoje[0].submission.calendarDay).toBe("2026-09-11");
    expect(hoje[0].submission.tipo).toBe("fechamento");
  });

  it("includes Fechamento and Correção of the same day with author and Justificativa", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    const pao = (await app.listarProdutos(dono)).find((produto) => produto.nome === "Pão")!;
    const primeiro = await linhasCompletas(app, dono, 18);
    await app.enviar(dono, { lojaId: centro.id, linhas: primeiro });
    const segundo = primeiro.map((linha) =>
      linha.produtoId === pao.id ? { ...linha, restante: 16 } : linha,
    );
    await app.enviar(dono, {
      lojaId: centro.id,
      linhas: segundo,
      justificativa: "Contei de novo o pão",
    });

    const hoje = await app.enviosDoDia(dono, { lojaId: centro.id });
    expect(hoje.map((row) => row.submission.tipo)).toEqual(["fechamento", "correcao"]);
    expect(hoje[0].usuarioNome).toBeTruthy();
    expect(hoje[1].submission.justificativa).toBe("Contei de novo o pão");
    const paoLinha = hoje[1].submission.linhas.find((linha) => linha.produtoId === pao.id)!;
    expect(paoLinha.anterior).toBe(18);
    expect(paoLinha.nova).toBe(16);
    const inalterada = hoje[1].submission.linhas.find((linha) => linha.produtoId !== pao.id)!;
    expect(inalterada.anterior).toBe(inalterada.nova);
  });

  it("refuses a Loja outside the Vínculo", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const lojas = await app.listarLojas(dono);
    const centro = lojas.find((loja) => loja.nome === "Centro")!;
    const praia = lojas.find((loja) => loja.nome === "Jardim Juliana")!;
    const perfil = (await app.listarPerfis(dono)).find((item) => item.nome === "Operador")!;
    await app.criarUsuario(dono, {
      email: "op@doguinho.local",
      senha: "senha1234",
      nome: "Op",
      perfilId: perfil.id,
      lojaIds: [centro.id],
    });
    const op = (await app.entrar({ email: "op@doguinho.local", senha: "senha1234" })).actor;
    await expect(app.enviosDoDia(op, { lojaId: praia.id })).rejects.toBeInstanceOf(ForbiddenError);
  });
});
