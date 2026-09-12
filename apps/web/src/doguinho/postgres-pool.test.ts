import { describe, expect, it } from "vitest";
import { postgresPoolOptions } from "./postgres-store";

describe("postgresPoolOptions", () => {
  it("na Vercel abre no máximo 1 conexão e desliga prepared statements", () => {
    const options = postgresPoolOptions("postgres://n@h/db?sslmode=require", { VERCEL: "1" });
    expect(options.max).toBe(1);
    expect(options.prepare).toBe(false);
    expect(options.connect_timeout).toBe(10);
    expect(options.ssl).toBe("require");
  });

  it("fora da Vercel mantém o pool local e ainda desliga prepared statements (Neon pooler)", () => {
    const options = postgresPoolOptions("postgres://n@h/db", {});
    expect(options.max).toBe(8);
    expect(options.prepare).toBe(false);
    expect(options.ssl).toBeUndefined();
  });
});
