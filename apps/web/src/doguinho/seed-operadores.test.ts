import { describe, expect, it } from "vitest";
import { createDoguinhoApp } from "./app";
import { ForbiddenError } from "./errors";
import { cryptoIds } from "./ids";
import { capturingLogger } from "./log";
import { createMemoryStore } from "./memory-store";
import { fakePasswords } from "./passwords-fake";
import {
  OPERADOR_PERFIL_NOME,
  SEED_DONO_EMAIL,
  SEED_DONO_PASSWORD,
  SEED_ORGANIZATION_ID,
} from "./seed";
import { createTestApp } from "./test-harness";
import { OPERADOR_TEMPLATE_PERMISSIONS, type Actor } from "./types";

const OPERADORES = [
  { email: "operador.centro@doguinho.local", loja: "Centro" },
  { email: "operador.juliana@doguinho.local", loja: "Jardim Juliana" },
  { email: "operador.magalhaes@doguinho.local", loja: "Magalhães" },
] as const;

async function operadoresDoSeed(
  app: Awaited<ReturnType<typeof createTestApp>>["app"],
  dono: Actor,
) {
  const users = await app.listarUsuarios(dono);
  return users.filter((user) => OPERADORES.some((spec) => spec.email === user.email));
}

describe("Seed de um Operador por Loja", () => {
  it("lets each seed Operador entrar and operate only the Loja of their Vínculo", async () => {
    const { app } = await createTestApp();
    const dono = (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
    const todas = await app.listarLojas(dono);
    expect(todas.map((loja) => loja.nome)).toEqual(["Centro", "Jardim Juliana", "Magalhães"]);

    for (const spec of OPERADORES) {
      const session = await app.entrar({ email: spec.email, senha: "coruja" });
      expect(session.actor.isDono).toBe(false);
      const lojas = await app.listarLojas(session.actor);
      expect(lojas.map((loja) => loja.nome)).toEqual([spec.loja]);
      const fora = todas.find((loja) => loja.nome !== spec.loja)!;
      await expect(app.estoqueDaLoja(session.actor, fora.id)).rejects.toBeInstanceOf(ForbiddenError);
    }
  });

  it("reuses existing seed Operadores on re-run and restores exactly one Vínculo", async () => {
    const { app } = await createTestApp();
    const dono = (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
    const lojas = await app.listarLojas(dono);
    const antes = await operadoresDoSeed(app, dono);
    expect(antes).toHaveLength(3);

    const centroOp = antes.find((user) => user.email === "operador.centro@doguinho.local")!;
    await app.alterarVinculo(dono, { userId: centroOp.id, lojaIds: lojas.map((loja) => loja.id) });

    await app.seed();
    await app.seed();

    const depois = await operadoresDoSeed(app, dono);
    expect(depois).toHaveLength(3);
    expect(depois.map((user) => user.id).sort()).toEqual(antes.map((user) => user.id).sort());
    const centro = lojas.find((loja) => loja.nome === "Centro")!;
    expect(depois.find((user) => user.id === centroOp.id)?.lojaIds).toEqual([centro.id]);
    for (const user of depois) {
      expect(user.lojaIds).toHaveLength(1);
    }
  });

  it("creates the three Operadores when the Organização already exists without them", async () => {
    const store = createMemoryStore();
    const ids = cryptoIds();
    const passwords = fakePasswords();
    const app = createDoguinhoApp({
      store,
      clock: { now: () => new Date("2026-09-10T21:00:00-03:00") },
      passwords,
      ids,
      log: capturingLogger().logger,
    });
    await store.insertOrganization({ id: SEED_ORGANIZATION_ID, nome: "Doguinho do Coruja" });
    for (const nome of ["Centro", "Jardim Juliana", "Magalhães"] as const) {
      await store.insertLoja({ id: ids.id(), organizationId: SEED_ORGANIZATION_ID, nome });
    }
    await store.insertPerfil({
      id: ids.id(),
      organizationId: SEED_ORGANIZATION_ID,
      nome: OPERADOR_PERFIL_NOME,
      permissions: [...OPERADOR_TEMPLATE_PERMISSIONS],
      template: true,
    });
    await store.insertUser({
      id: ids.id(),
      organizationId: SEED_ORGANIZATION_ID,
      email: SEED_DONO_EMAIL,
      nome: "Dono",
      isDono: true,
      disabled: false,
      perfilId: null,
      passwordHash: await passwords.hash(SEED_DONO_PASSWORD),
    });

    await app.seed();

    const dono = (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
    const ops = await operadoresDoSeed(app, dono);
    expect(ops).toHaveLength(3);
    const session = await app.entrar({
      email: "operador.magalhaes@doguinho.local",
      senha: "coruja",
    });
    expect((await app.listarLojas(session.actor)).map((loja) => loja.nome)).toEqual(["Magalhães"]);
  });

  it("resets a leftover Operador password to the seed senha on re-run", async () => {
    const { app, store } = await createTestApp();
    const dono = (await app.entrar({ email: SEED_DONO_EMAIL, senha: SEED_DONO_PASSWORD })).actor;
    const centroOp = (await operadoresDoSeed(app, dono)).find(
      (user) => user.email === "operador.centro@doguinho.local",
    )!;
    await store.updateUser(centroOp.id, { passwordHash: "h:qa123456" });
    await expect(
      app.entrar({ email: "operador.centro@doguinho.local", senha: "coruja" }),
    ).rejects.toThrow(/E-mail ou senha/);

    await app.seed();

    const session = await app.entrar({
      email: "operador.centro@doguinho.local",
      senha: "coruja",
    });
    expect(session.actor.userId).toBe(centroOp.id);
  });
});
