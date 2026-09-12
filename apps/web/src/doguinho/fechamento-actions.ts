"use server";

import { revalidatePath } from "next/cache";
import { isAppError } from "./errors";
import { getApp } from "./runtime";
import { actorDaSessao } from "./sessao";
import type { QuantidadeLinha } from "./types";

function parseLinhas(formData: FormData): QuantidadeLinha[] {
  const raw = String(formData.get("linhas") ?? "[]");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => ({
    produtoId: String((item as QuantidadeLinha).produtoId ?? ""),
    restante:
      (item as QuantidadeLinha).restante === null || (item as QuantidadeLinha).restante === undefined
        ? null
        : Number((item as QuantidadeLinha).restante),
  }));
}

export async function salvarRascunhoAction(formData: FormData) {
  const actor = await actorDaSessao();
  if (!actor) return { ok: false as const, erro: "Sessão expirada." };
  try {
    const app = await getApp();
    await app.salvarRascunho(actor, {
      lojaId: String(formData.get("lojaId") ?? ""),
      linhas: parseLinhas(formData),
    });
    revalidatePath("/fechamento");
    revalidatePath("/estoque");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      erro: isAppError(error) ? error.message : "Não foi possível guardar.",
    };
  }
}

export async function enviarFechamentoAction(formData: FormData) {
  const actor = await actorDaSessao();
  if (!actor) return { ok: false as const, erro: "Sessão expirada." };
  try {
    const app = await getApp();
    await app.enviar(actor, {
      lojaId: String(formData.get("lojaId") ?? ""),
      linhas: parseLinhas(formData),
      justificativa: String(formData.get("justificativa") ?? "") || null,
    });
    revalidatePath("/fechamento");
    revalidatePath("/estoque");
    revalidatePath("/dashboard");
    revalidatePath("/historico");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      erro: isAppError(error) ? error.message : "Não foi possível enviar.",
    };
  }
}
