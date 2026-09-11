import type { PasswordHasher } from "./types";

/** Test adapter: not a production password hash. */
export function fakePasswords(): PasswordHasher {
  return {
    hash: async (plain) => `h:${plain}`,
    verify: async (plain, hash) => hash === `h:${plain}`,
  };
}
