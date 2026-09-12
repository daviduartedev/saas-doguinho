import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_TTL_MS } from "./app";
import { SESSION_COOKIE } from "./constants";
import { getApp } from "./runtime";
import type { Actor } from "./types";

export async function actorDaSessao(): Promise<Actor | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const app = await getApp();
  return app.resolverSessao(token);
}

export async function exigirActor(): Promise<Actor> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) redirect("/entrar");
  const app = await getApp();
  const actor = await app.resolverSessao(token);
  // Cookie presente mas token inválido/expirado/revogado: /sair apaga o cookie antes
  // de voltar ao login — senão middleware ↔ layout entram em loop de redirects (QA-002).
  if (!actor) redirect("/sair");
  return actor;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
  };
}
