// SCRATCH QA-08: invariantes de Perfil/Usuário no seam app (mensagens exatas + caminhos sem UI).
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";

async function setup() {
  const { app } = await createTestApp();
  const session = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  const dono = await app.resolverSessao(session.token);
  if (!dono) throw new Error("sessão do Dono não resolveu");
  const lojas = await app.listarLojas(dono);
  const perfis = await app.listarPerfis(dono);
  const operador = perfis.find((p) => p.nome === "Operador")!;
  return { app, dono, lojas, operador };
}

describe("QA-08 — Perfis (seam app)", () => {
  it("PERF-04: excluir Perfil em uso → ConflictError", async () => {
    const { app, dono, lojas, operador } = await setup();
    await app.criarUsuario(dono, {
      email: "oc@doguinho.local", senha: "qa123456", nome: "OC", perfilId: operador.id, lojaIds: [lojas[0].id],
    });
    await expect(app.excluirPerfil(dono, { id: operador.id })).rejects.toThrow(
      "Perfil em uso não pode ser removido.",
    );
  });

  it("PERF-05: excluir Perfil livre → removido", async () => {
    const { app, dono } = await setup();
    const livre = await app.criarPerfil(dono, { nome: "Livre", permissions: ["read_estoque"] });
    await app.excluirPerfil(dono, { id: livre.id });
    expect((await app.listarPerfis(dono)).find((p) => p.id === livre.id)).toBeUndefined();
  });
});

describe("QA-08 — Usuários (seam app)", () => {
  it("USER-02: senha com 7 chars → ValidationError", async () => {
    const { app, dono, lojas, operador } = await setup();
    await expect(
      app.criarUsuario(dono, { email: "a@b.co", senha: "1234567", nome: "A", perfilId: operador.id, lojaIds: [lojas[0].id] }),
    ).rejects.toThrow("Senha deve ter pelo menos 8 caracteres.");
  });

  it("USER-03: e-mail sem @ → ValidationError", async () => {
    const { app, dono, lojas, operador } = await setup();
    await expect(
      app.criarUsuario(dono, { email: "sem-arroba", senha: "qa123456", nome: "A", perfilId: operador.id, lojaIds: [lojas[0].id] }),
    ).rejects.toThrow("E-mail inválido.");
  });

  it("USER-05: Perfil inexistente → ValidationError", async () => {
    const { app, dono, lojas } = await setup();
    await expect(
      app.criarUsuario(dono, { email: "a@b.co", senha: "qa123456", nome: "A", perfilId: "id-lixo", lojaIds: [lojas[0].id] }),
    ).rejects.toThrow("Perfil inválido.");
  });

  it("USER-06: Loja inexistente no Vínculo → ValidationError", async () => {
    const { app, dono, operador } = await setup();
    await expect(
      app.criarUsuario(dono, { email: "a@b.co", senha: "qa123456", nome: "A", perfilId: operador.id, lojaIds: ["loja-lixo"] }),
    ).rejects.toThrow("Loja inválida no Vínculo.");
  });

  it("USER-08: desligar último Dono → ConflictError", async () => {
    const { app, dono } = await setup();
    await expect(app.desligarUsuario(dono, { userId: dono.userId })).rejects.toThrow(
      "O último Dono não pode ser desligado.",
    );
  });

  it("USER-09: rebaixar último Dono → ConflictError", async () => {
    const { app, dono } = await setup();
    await expect(app.rebaixarDono(dono, { userId: dono.userId })).rejects.toThrow(
      "O último Dono não pode perder o acesso.",
    );
  });

  it("USER-10: não existe caminho para promover a Dono (interface não expõe)", async () => {
    const { app } = await setup();
    // Se existir promoção no futuro, este teste deve ser substituído pelo fluxo de 2 Donos.
    expect(Object.keys(app)).not.toContain("promoverDono");
  });
});
