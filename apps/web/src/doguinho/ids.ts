import { randomBytes } from "node:crypto";
import type { IdGenerator } from "./types";

export function cryptoIds(): IdGenerator {
  return {
    id: () => randomBytes(16).toString("hex"),
    // ASVS V11.5 / V7.2: session identifier from CSPRNG, not a user id.
    token: () => randomBytes(32).toString("hex"),
  };
}
