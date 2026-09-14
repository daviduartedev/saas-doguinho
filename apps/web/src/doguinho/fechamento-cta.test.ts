import { describe, expect, it } from "vitest";
import { avisoEnvio, ctaDesabilitado, ctaMostraSpinner, ctaOpaco } from "./fechamento-cta";

describe("fechamento CTA", () => {
  it("só o clicado mostra spinner; o irmão fica opaco e os dois desabilitam", () => {
    expect(ctaMostraSpinner("enviar", "enviar")).toBe(true);
    expect(ctaMostraSpinner("enviar", "rascunho")).toBe(false);
    expect(ctaOpaco("enviar", "rascunho")).toBe(true);
    expect(ctaOpaco("enviar", "enviar")).toBe(false);
    expect(ctaDesabilitado("enviar", false)).toBe(true);
    expect(ctaDesabilitado(null, false)).toBe(false);
    expect(ctaDesabilitado(null, true)).toBe(true);
  });
});

describe("avisoEnvio", () => {
  it("sucesso de Correção e falha usam o copy combinado", () => {
    expect(avisoEnvio({ ok: true, erro: null, correcao: true })).toEqual({
      kind: "ok",
      text: "Correção enviada. O registro anterior permanece.",
    });
    expect(avisoEnvio({ ok: false, erro: "Justificativa obrigatória.", correcao: true })).toEqual({
      kind: "erro",
      text: "Não foi possível enviar a correção. Justificativa obrigatória.",
    });
    expect(avisoEnvio({ ok: true, erro: null, correcao: false })).toEqual({
      kind: "ok",
      text: "Enviado. Isso é o Estoque agora.",
    });
  });
});
