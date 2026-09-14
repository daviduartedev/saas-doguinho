import { describe, expect, it } from "vitest";
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

describe("historicoPagina", () => {
  it("devolve só a página pedida, mais novos primeiro", async () => {
    const { app } = await createTestApp();
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    await app.enviar(dono, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 20) });
    for (let restante = 19; restante >= 11; restante -= 1) {
      await app.enviar(dono, {
        lojaId: centro.id,
        linhas: await linhasCompletas(app, dono, restante),
        justificativa: `Ajuste ${restante}`,
      });
    }

    const primeira = await app.historicoPagina(dono, { lojaId: centro.id, page: 1, per: 8 });
    const segunda = await app.historicoPagina(dono, { lojaId: centro.id, page: 2, per: 8 });

    expect(primeira.total).toBe(10);
    expect(primeira.items).toHaveLength(8);
    expect(segunda.items).toHaveLength(2);
    expect(primeira.items[0].submission.tipo).toBe("correcao");
    expect(segunda.items[segunda.items.length - 1].submission.tipo).toBe("fechamento");
    expect(primeira.items[0].submission.enviadoEm >= primeira.items[7].submission.enviadoEm).toBe(
      true,
    );
  });
});

describe("dashboard recorte", () => {
  it("ignora envios fora da janela de 30 dias", async () => {
    let now = new Date("2026-09-10T21:00:00-03:00");
    const { app } = await createTestApp({ now: () => now });
    const dono = await asDono(app);
    const centro = (await app.listarLojas(dono)).find((loja) => loja.nome === "Centro")!;
    await app.enviar(dono, { lojaId: centro.id, linhas: await linhasCompletas(app, dono, 4) });

    now = new Date("2026-10-20T21:00:00-03:00");
    const dash = await app.dashboard(dono);
    expect(dash.recentes).toHaveLength(0);
    expect(dash.historicos.every((bloco) => bloco.rows.length === 0)).toBe(true);
  });
});
