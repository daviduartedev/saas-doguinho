import { createDoguinhoApp, SESSION_TTL_MS, type DoguinhoApp } from "./app";
import { saoPauloClock } from "./clock";
import { cryptoIds } from "./ids";
import { createMemoryStore } from "./memory-store";
import { bcryptPasswords } from "./passwords";
import { createPostgresStore } from "./postgres-store";

const globalForApp = globalThis as typeof globalThis & {
  __doguinhoApp?: Promise<DoguinhoApp>;
};

export function getApp(): Promise<DoguinhoApp> {
  if (!globalForApp.__doguinhoApp) {
    globalForApp.__doguinhoApp = boot();
  }
  return globalForApp.__doguinhoApp;
}

async function boot(): Promise<DoguinhoApp> {
  const url = process.env.DATABASE_URL;
  const store = url ? await createPostgresStore(url) : createMemoryStore();
  const app = createDoguinhoApp({
    store,
    clock: saoPauloClock(),
    passwords: bcryptPasswords(),
    ids: cryptoIds(),
    log: {
      security: (event) => {
        console.info("[doguinho]", event.type, {
          actorId: event.actorId,
          lojaId: event.lojaId,
        });
      },
    },
    sessionTtlMs: SESSION_TTL_MS,
  });
  await app.seed();
  return app;
}
