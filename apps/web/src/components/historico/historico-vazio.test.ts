import { describe, expect, it } from "vitest";
import { historicoMensagemVazia } from "./historico-vazio";

describe("historicoMensagemVazia", () => {
  it("não diz que a Loja nunca teve Fechamento quando o recorte está vazio", () => {
    expect(historicoMensagemVazia(true)).toBe("Nenhum envio neste recorte.");
  });

  it("mantém um vazio sensato sem Loja selecionada", () => {
    expect(historicoMensagemVazia(false)).toBe("Nenhum Fechamento nesta Loja.");
  });
});
