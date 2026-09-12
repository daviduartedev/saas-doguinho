import { ValidationError } from "./errors";
import type { UnidadeMedida } from "./types";

export const QUANTITY_CAP = 99999;

export function decimalPlaces(unidade: UnidadeMedida): number {
  return unidade === "kg" || unidade === "g" || unidade === "L" || unidade === "mL" ? 3 : 0;
}

export function isUnidadeMedida(value: string): value is UnidadeMedida {
  return value === "unidade" || value === "kg" || value === "g" || value === "L" || value === "mL" || value === "pacote";
}

export function validarQuantidade(valor: number, unidade: UnidadeMedida): string | null {
  if (!Number.isFinite(valor)) return "Quantidade inválida.";
  if (valor < 0) return "Quantidade restante não pode ser negativa.";
  if (valor > QUANTITY_CAP) return "Quantidade acima do teto.";
  const factor = 10 ** decimalPlaces(unidade);
  if (Math.round(valor * factor) !== valor * factor) {
    return decimalPlaces(unidade) === 0
      ? "Use um número inteiro."
      : "Use até 3 casas decimais.";
  }
  return null;
}

export function requireQuantidade(valor: number, unidade: UnidadeMedida, nome: string) {
  const erro = validarQuantidade(valor, unidade);
  if (erro) throw new ValidationError(`${nome}: ${erro}`);
}
