// SCRATCH QA-04 (AUTHZ-08b/09): prova no seam DoguinhoApp que ações forçadas são rejeitadas.
// Arquivo temporário de evidência — a versão permanente nasce em QA-14 (tests/e2e + regressões).
import { describe, expect, it } from "vitest";
import { createTestApp } from "./test-harness";

async function setupOperadorCentro() {
  const { app } = await createTestApp();
  const donoSession = await app.entrar({ email: "dono@doguinho.local", senha: "coruja" });
  const dono = await app.resolverSessao(donoSession.token);
  if (!dono) throw new Error("sessão do Dono não resolveu");
  const lojas = await app.listarLojas(dono);
  const centro = lojas.find((loja) => loja.nome === "Centro");
  const magalhaes = lojas.find((loja) => loja.nome === "Magalhães");
  if (!centro || !magalhaes) throw new Error("seed sem Lojas esperadas");
  const perfis = await app.listarPerfis(dono);
  const operador = perfis.find((perfil) => perfil.nome === "Operador");
  if (!operador) throw new Error("seed sem Perfil Operador");
  await app.criarUsuario(dono, {
    email: "oc@doguinho.local",
    senha: "qa123456",
    nome: "Operador Centro",
    perfilId: operador.id,
    lojaIds: [centro.id],
  });
  const ocSession = await app.entrar({ email: "oc@doguinho.local", senha: "qa123456" });
  const oc = await app.resolverSessao(ocSession.token);
  if (!oc) throw new Error("sessão do operador não resolveu");
  return { app, oc, magalhaes };
}

describe("QA-04 — ações forçadas no servidor (sem UI)", () => {
  it("AUTHZ-09: enviar Fechamento em Loja fora do Vínculo → ForbiddenError", async () => {
    const { app, oc, magalhaes } = await setupOperadorCentro();
    await expect(
      app.enviar(oc, { lojaId: magalhaes.id, linhas: [], justificativa: null }),
    ).rejects.toThrow("Sem autorização para esta Loja.");
  });

  it("AUTHZ-09b: guardar Rascunho em Loja fora do Vínculo → ForbiddenError", async () => {
    const { app, oc, magalhaes } = await setupOperadorCentro();
    await expect(app.salvarRascunho(oc, { lojaId: magalhaes.id, linhas: [] })).rejects.toThrow(
      "Sem autorização para esta Loja.",
    );
  });

  it("AUTHZ-08b: criar Produto sem manage_produto → ForbiddenError", async () => {
    const { app, oc } = await setupOperadorCentro();
    await expect(app.criarProduto(oc, { nome: "Produto Forjado", unidade: "unidade" })).rejects.toThrow(
      /Sem autorização/,
    );
  });

  it("AUTHZ-08c: gerir usuários sem manage_users → ForbiddenError", async () => {
    const { app, oc } = await setupOperadorCentro();
    await expect(
      app.criarUsuario(oc, {
        email: "forjado@doguinho.local",
        senha: "qa123456",
        nome: "Forjado",
        perfilId: "",
        lojaIds: [],
      }),
    ).rejects.toThrow(/Sem autorização/);
  });
});
