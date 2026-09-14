import { describe, expect, it } from "vitest";
import {
  montarPdfFechamento,
  montarPlanilhaFechamento,
  montarXlsxFechamento,
  nomeArquivoFechamento,
  type FechamentoExportSecao,
} from "./fechamento-export";

function secao(nome: string, restante: number | null, extra?: Partial<FechamentoExportSecao>): FechamentoExportSecao {
  return {
    lojaNome: nome,
    produtos: [
      { id: "pao", nome: "Pão", unidade: "unidade", ativo: true },
      { id: "sumido", nome: "Inativo", unidade: "kg", ativo: false },
    ],
    linhas: [
      { produtoId: "pao", restante },
      { produtoId: "sumido", restante: 99 },
    ],
    envios: [],
    ...extra,
  };
}

describe("montarPlanilhaFechamento", () => {
  it("monta as linhas do relatório de uma Loja, sem Produto inativo", () => {
    const rows = montarPlanilhaFechamento([secao("Centro", 13)]);

    expect(rows).toContainEqual(["Fechamento", "Centro"]);
    expect(rows).toContainEqual(["Produto", "Unidade", "Quantidade restante"]);
    expect(rows).toContainEqual(["Pão", "unidade", 13]);
    expect(rows.flat()).not.toContain("Inativo");
    expect(rows).toContainEqual(["Envios de hoje"]);
  });

  it("inclui as três Lojas no mesmo recorte quando o filtro é Todas", () => {
    const rows = montarPlanilhaFechamento([
      secao("Centro", 13),
      secao("Jardim Juliana", 4),
      secao("Magalhães", null),
    ]);
    const texto = rows.flat().map(String).join(" ");

    expect(texto).toContain("Centro");
    expect(texto).toContain("Jardim Juliana");
    expect(texto).toContain("Magalhães");
    expect(rows).toContainEqual(["Pão", "unidade", 13]);
    expect(rows).toContainEqual(["Pão", "unidade", 4]);
    expect(rows).toContainEqual(["Pão", "unidade", ""]);
  });

  it("inclui a timeline do dia quando já está no relatório", () => {
    const rows = montarPlanilhaFechamento([
      secao("Centro", 8, {
        envios: [
          {
            tipo: "fechamento",
            usuarioNome: "Operador Centro",
            justificativa: null,
            produtoNomes: { pao: "Pão" },
            linhas: [{ produtoId: "pao", anterior: null, nova: 11 }],
          },
          {
            tipo: "correcao",
            usuarioNome: "Operador Centro",
            justificativa: "Contagem refeita após conferência física.",
            produtoNomes: { pao: "Pão" },
            linhas: [{ produtoId: "pao", anterior: 11, nova: 8 }],
          },
        ],
      }),
    ]);

    expect(rows).toContainEqual([
      "Fechamento",
      "Operador Centro",
      "Pão",
      "",
      11,
      "",
      "",
    ]);
    expect(rows).toContainEqual([
      "Correção",
      "Operador Centro",
      "Pão",
      11,
      8,
      -3,
      "Contagem refeita após conferência física.",
    ]);
  });

  it("neutraliza fórmula no nome do Produto", () => {
    const rows = montarPlanilhaFechamento([
      {
        lojaNome: "Centro",
        produtos: [{ id: "x", nome: "=CMD()", unidade: "kg", ativo: true }],
        linhas: [{ produtoId: "x", restante: 1 }],
        envios: [],
      },
    ]);

    expect(rows).toContainEqual(["'=CMD()", "kg", 1]);
  });
});

describe("nomeArquivoFechamento", () => {
  it("usa o recorte da tela no nome do arquivo", () => {
    expect(nomeArquivoFechamento("xlsx", "todas")).toBe("fechamento-hoje.xlsx");
    expect(nomeArquivoFechamento("pdf", "todas")).toBe("fechamento-hoje.pdf");
    expect(nomeArquivoFechamento("xlsx", "Jardim Juliana")).toBe("fechamento-hoje-jardim-juliana.xlsx");
    expect(nomeArquivoFechamento("pdf", "Magalhães")).toBe("fechamento-hoje-magalhaes.pdf");
  });
});

function ysDoRotulo(pdf: string, rotulo: string): number[] {
  const re = new RegExp(`1 0 0 1 \\d+ ([\\d.]+) Tm\\n\\(${rotulo}\\) Tj`, "g");
  return [...pdf.matchAll(re)].map((match) => Number(match[1]));
}

describe("montarPdfFechamento", () => {
  it("pinta cabeçalho ketchup e colunas do listing no PDF", () => {
    const pdf = montarPdfFechamento(montarPlanilhaFechamento([secao("Centro", 13)])).toString("utf8");
    expect(pdf).toContain("0.89 0.11 0.14");
    expect(pdf).toContain("Fechamento");
    expect(pdf).toContain("Centro");
    expect(pdf).toContain("Pão");
  });

  it("não empilha duas Lojas no mesmo Y do subhead", () => {
    const pdf = montarPdfFechamento(
      montarPlanilhaFechamento([secao("Centro", 13), secao("Jardim Juliana", 4)]),
    ).toString("utf8");

    const centro = ysDoRotulo(pdf, "Centro");
    const jardim = ysDoRotulo(pdf, "Jardim Juliana");
    expect(centro.length).toBeGreaterThan(0);
    expect(jardim.length).toBeGreaterThan(0);

    const ambosNoTopo = centro.includes(725) && jardim.includes(725);
    expect(ambosNoTopo).toBe(false);
    expect(Math.max(...jardim) < Math.max(...centro) || jardim.some((y) => y !== 725)).toBe(true);
  });

  it("repete ketchup e o subhead da Loja quando a seção vira página", () => {
    const produtos = Array.from({ length: 55 }, (_, index) => ({
      id: `p${index}`,
      nome: `Item ${index}`,
      unidade: "kg",
      ativo: true,
    }));
    const pdf = montarPdfFechamento(
      montarPlanilhaFechamento([
        {
          lojaNome: "Centro",
          produtos,
          linhas: produtos.map((item) => ({ produtoId: item.id, restante: 1 })),
          envios: [],
        },
      ]),
    ).toString("utf8");

    expect((pdf.match(/0\.89 0\.11 0\.14 rg/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(ysDoRotulo(pdf, "Centro").filter((y) => y === 725).length).toBeGreaterThanOrEqual(2);
  });
});

describe("arquivos gerados", () => {
  it("grava os nomes das Lojas em texto no Excel e no PDF", () => {
    const rows = montarPlanilhaFechamento([
      secao("Centro", 13),
      secao("Jardim Juliana", 4),
    ]);
    const xlsx = montarXlsxFechamento(rows).toString("utf8");
    const pdf = montarPdfFechamento(rows).toString("utf8");

    expect(xlsx).toContain("Centro");
    expect(xlsx).toContain("Jardim Juliana");
    expect(xlsx).toContain("Pão");
    expect(pdf).toContain("Centro");
    expect(pdf).toContain("Jardim Juliana");
    expect(pdf).toContain("Pão");
  });
});
