import type { UnidadeMedida } from "@/doguinho/types";
import { UNIDADES } from "@/doguinho/types";

export type FolhaModo = "criar" | "editar";

export type FolhaEstado = {
  aberto: boolean;
  modo: FolhaModo;
  passo: 1 | 2;
  nome: string;
  unidade: UnidadeMedida;
  produtoId: string | null;
  banner: string | null;
};

export function folhaInicial(): FolhaEstado {
  return {
    aberto: false,
    modo: "criar",
    passo: 1,
    nome: "",
    unidade: UNIDADES[0],
    produtoId: null,
    banner: null,
  };
}

export function folhaPodeContinuar(nome: string): boolean {
  return nome.trim().length > 0;
}

export function folhaAbrirCriar(): FolhaEstado {
  return { ...folhaInicial(), aberto: true };
}

export function folhaAbrirEditar(produto: {
  id: string;
  nome: string;
  unidade: UnidadeMedida;
}): FolhaEstado {
  return {
    aberto: true,
    modo: "editar",
    passo: 1,
    nome: produto.nome,
    unidade: produto.unidade,
    produtoId: produto.id,
    banner: null,
  };
}

export function folhaContinuar(estado: FolhaEstado): FolhaEstado {
  if (!folhaPodeContinuar(estado.nome)) return estado;
  return { ...estado, passo: 2 };
}

export function folhaVoltar(estado: FolhaEstado): FolhaEstado {
  return { ...estado, passo: 1 };
}

export function folhaAposCadastro(estado: FolhaEstado): FolhaEstado {
  return {
    ...estado,
    passo: 1,
    nome: "",
    unidade: UNIDADES[0],
    banner: "Produto cadastrado.",
  };
}

export function folhaFechar(): FolhaEstado {
  return folhaInicial();
}

export function folhaRotuloEnviar(modo: FolhaModo): "Cadastrar" | "Salvar" {
  return modo === "editar" ? "Salvar" : "Cadastrar";
}

export function folhaIndicador(passo: 1 | 2): string {
  return `${passo} / 2`;
}

export type FolhaAlvoFoco = "nome" | "unidade" | "banner" | null;

export function folhaAlvoFoco(estado: FolhaEstado): FolhaAlvoFoco {
  if (!estado.aberto) return null;
  if (estado.banner) return "banner";
  if (estado.passo === 2) return "unidade";
  return "nome";
}

export function folhaDeveAbortarNoDesktop(matchesMobile: boolean, aberto: boolean): boolean {
  return aberto && !matchesMobile;
}
