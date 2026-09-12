import bcrypt from "bcryptjs";
import type { PasswordHasher } from "./types";

const COST = 12;

/** ASVS V6.2: dedicated password hash (bcrypt), not a general-purpose SHA. */
export function bcryptPasswords(): PasswordHasher {
  return {
    hash: (plain) => bcrypt.hash(plain, COST),
    verify: (plain, hash) => bcrypt.compare(plain, hash),
  };
}
