import { describe, expect, it } from "vitest";
import { homePath } from "./view";

describe("homePath", () => {
  it("manda o Dono ao Dashboard", () => {
    expect(homePath({ isDono: true })).toBe("/dashboard");
  });

  it("manda o Operador ao Fechamento", () => {
    expect(homePath({ isDono: false })).toBe("/fechamento");
  });
});
