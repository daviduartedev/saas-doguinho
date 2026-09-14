import { describe, expect, it } from "vitest";
import {
  folhaAbrirCriar,
  folhaAbrirEditar,
  folhaAlvoFoco,
  folhaAposCadastro,
  folhaContinuar,
  folhaDeveAbortarNoDesktop,
  folhaFechar,
  folhaIndicador,
  folhaPodeContinuar,
  folhaRotuloEnviar,
  folhaVoltar,
} from "./produto-folha-state";

describe("produto folha state", () => {
  it("desabilita Continuar enquanto o nome está vazio", () => {
    expect(folhaPodeContinuar("")).toBe(false);
    expect(folhaPodeContinuar("   ")).toBe(false);
    expect(folhaPodeContinuar("Mostarda")).toBe(true);
  });

  it("abre cadastro no passo 1 e edição com valores preenchidos", () => {
    const criar = folhaAbrirCriar();
    expect(criar.aberto).toBe(true);
    expect(criar.modo).toBe("criar");
    expect(criar.passo).toBe(1);
    expect(criar.nome).toBe("");
    expect(criar.unidade).toBe("unidade");
    expect(folhaIndicador(criar.passo)).toBe("1 / 2");
    expect(folhaRotuloEnviar(criar.modo)).toBe("Cadastrar");

    const editar = folhaAbrirEditar({
      id: "p1",
      nome: "Pão",
      unidade: "pacote",
    });
    expect(editar.modo).toBe("editar");
    expect(editar.nome).toBe("Pão");
    expect(editar.unidade).toBe("pacote");
    expect(editar.produtoId).toBe("p1");
    expect(editar.passo).toBe(1);
    expect(folhaRotuloEnviar(editar.modo)).toBe("Salvar");
  });

  it("avança para unidade, Voltar conserva o nome e o cadastro volta ao passo 1", () => {
    const noPasso2 = folhaContinuar({
      ...folhaAbrirCriar(),
      nome: "Ketchup",
    });
    expect(noPasso2.passo).toBe(2);
    expect(folhaIndicador(noPasso2.passo)).toBe("2 / 2");
    expect(folhaContinuar({ ...folhaAbrirCriar(), nome: "" }).passo).toBe(1);

    const voltou = folhaVoltar(noPasso2);
    expect(voltou.passo).toBe(1);
    expect(voltou.nome).toBe("Ketchup");

    const depois = folhaAposCadastro({ ...noPasso2, unidade: "kg" });
    expect(depois.banner).toBe("Produto cadastrado.");
    expect(depois.passo).toBe(1);
    expect(depois.nome).toBe("");
    expect(depois.unidade).toBe("unidade");
    expect(depois.aberto).toBe(true);

    expect(folhaFechar().aberto).toBe(false);
    expect(folhaFechar().banner).toBeNull();
  });

  it("aponta o foco para unidade após Continuar e para o banner após cadastro", () => {
    const criar = folhaAbrirCriar();
    expect(folhaAlvoFoco(criar)).toBe("nome");
    expect(folhaAlvoFoco(folhaFechar())).toBeNull();

    const passo2 = folhaContinuar({ ...criar, nome: "Ketchup" });
    expect(folhaAlvoFoco(passo2)).toBe("unidade");

    const depois = folhaAposCadastro(passo2);
    expect(folhaAlvoFoco(depois)).toBe("banner");
  });

  it("aborta a folha quando o viewport deixa de ser mobile", () => {
    expect(folhaDeveAbortarNoDesktop(true, true)).toBe(false);
    expect(folhaDeveAbortarNoDesktop(false, true)).toBe(true);
    expect(folhaDeveAbortarNoDesktop(false, false)).toBe(false);
  });
});
