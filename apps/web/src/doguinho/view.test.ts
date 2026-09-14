import { describe, expect, it } from "vitest";
import { FILTRO_TODAS } from "./workspace-filtro";
import {
  fechamentoEhFormulario,
  homePath,
  linhasOficiaisDoDia,
  relatorioIncluiTimeline,
  statusRelatorioDono,
} from "./view";

describe("homePath", () => {
  it("manda o Dono ao Dashboard", () => {
    expect(homePath({ isDono: true })).toBe("/dashboard");
  });

  it("manda o Operador ao Fechamento", () => {
    expect(homePath({ isDono: false })).toBe("/fechamento");
  });
});

describe("fechamentoEhFormulario", () => {
  it("Dono lê relatório, Operador preenche o quadro", () => {
    expect(fechamentoEhFormulario({ isDono: true })).toBe(false);
    expect(fechamentoEhFormulario({ isDono: false })).toBe(true);
  });
});

describe("linhasOficiaisDoDia", () => {
  const produtos = [
    { id: "pao", ativo: true },
    { id: "inativo", ativo: false },
    { id: "milho", ativo: true },
  ];

  it("mostra o último envio de hoje e deixa em branco o que não veio", () => {
    expect(
      linhasOficiaisDoDia(
        { exigeJustificativa: true, valores: { pao: 13, milho: null } },
        produtos,
      ),
    ).toEqual([
      { produtoId: "pao", restante: 13 },
      { produtoId: "milho", restante: null },
    ]);
  });

  it("fica em branco quando ainda não houve envio hoje, mesmo com Estoque de outro dia", () => {
    expect(
      linhasOficiaisDoDia({ exigeJustificativa: false, valores: { pao: 18, milho: 4 } }, produtos),
    ).toEqual([
      { produtoId: "pao", restante: null },
      { produtoId: "milho", restante: null },
    ]);
  });
});

describe("statusRelatorioDono", () => {
  it("só marca Enviado quando já houve envio hoje", () => {
    expect(statusRelatorioDono({ exigeJustificativa: true })).toBe("enviado");
    expect(statusRelatorioDono({ exigeJustificativa: false })).toBeNull();
  });
});

describe("relatorioIncluiTimeline", () => {
  it("omite a timeline quando o Dono pede Todas as Lojas", () => {
    expect(relatorioIncluiTimeline(FILTRO_TODAS)).toBe(false);
  });

  it("traz a timeline quando o filtro é uma Loja", () => {
    expect(relatorioIncluiTimeline("loja-centro")).toBe(true);
  });
});
