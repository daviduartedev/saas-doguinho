"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "./errors";
import { SESSION_COOKIE } from "./constants";
import { loginAllowed, loginSucceeded } from "./rate-limit";
import { getApp } from "./runtime";
import { sessionCookieOptions } from "./sessao";
import { homePath } from "./view";

export async function entrarAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");
  if (!loginAllowed(email)) {
    redirect("/entrar?erro=1");
  }
  let destino: ReturnType<typeof homePath>;
  try {
    const app = await getApp();
    const session = await app.entrar({ email, senha });
    loginSucceeded(email);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, session.token, sessionCookieOptions());
    destino = homePath(session.actor);
  } catch (error) {
    if (error instanceof AppError) redirect("/entrar?erro=1");
    redirect("/entrar?erro=1");
  }
  redirect(destino);
}

export async function sairAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const app = await getApp();
    await app.sair(token);
  }
  jar.delete(SESSION_COOKIE);
  redirect("/entrar");
}
