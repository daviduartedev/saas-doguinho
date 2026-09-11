import { createDoguinhoApp, type DoguinhoApp } from "./app";
import { cryptoIds } from "./ids";
import { capturingLogger } from "./log";
import { createMemoryStore } from "./memory-store";
import { fakePasswords } from "./passwords-fake";
import type { Store } from "./store";

const DEFAULT_NOW = new Date("2026-09-10T21:00:00-03:00");

export async function createTestApp(input?: { now?: Date | (() => Date) }) {
  const store = createMemoryStore();
  const captured = capturingLogger();
  const nowFn = (): Date => {
    if (typeof input?.now === "function") return input.now();
    return input?.now ?? DEFAULT_NOW;
  };
  const app = createDoguinhoApp({
    store,
    clock: { now: nowFn },
    passwords: fakePasswords(),
    ids: cryptoIds(),
    log: captured.logger,
  });
  await app.seed();
  return { app, store, events: captured.events };
}

export type { DoguinhoApp, Store };
