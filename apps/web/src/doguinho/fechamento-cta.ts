export type FechamentoCta = "rascunho" | "enviar";

export function ctaMostraSpinner(ativo: FechamentoCta | null, qual: FechamentoCta): boolean {
  return ativo === qual;
}

export function ctaDesabilitado(ativo: FechamentoCta | null, catalogoVazio: boolean): boolean {
  return catalogoVazio || ativo !== null;
}

export function ctaOpaco(ativo: FechamentoCta | null, qual: FechamentoCta): boolean {
  return ativo !== null && ativo !== qual;
}

export function avisoEnvio(input: {
  ok: boolean;
  erro: string | null;
  correcao: boolean;
}): { kind: "ok" | "erro"; text: string } | null {
  if (input.ok) {
    if (input.correcao) {
      return {
        kind: "ok",
        text: "Correção enviada. O registro anterior permanece.",
      };
    }
    return {
      kind: "ok",
      text: "Enviado. Isso é o Estoque agora.",
    };
  }

  if (input.correcao) {
    const prefix = "Não foi possível enviar a correção.";
    return {
      kind: "erro",
      text: input.erro ? `${prefix} ${input.erro}` : prefix,
    };
  }

  if (input.erro) {
    return { kind: "erro", text: input.erro };
  }

  return null;
}
