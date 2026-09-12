"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppError, ValidationError } from "./errors";
import { ALL_PERMISSIONS } from "./seed";
import { getApp } from "./runtime";
import { exigirActor } from "./sessao";
import type { UnidadeMedida } from "./types";
import { UNIDADES } from "./types";

function fail(error: unknown): never {
  throw error instanceof AppError ? error : new Error("Não foi possível salvar.");
}

function voltarPerfis(formData: FormData): never {
  const loja = String(formData.get("loja") ?? "");
  if (/^[a-zA-Z0-9_-]+$/.test(loja)) redirect(`/perfis?loja=${loja}`);
  redirect("/perfis");
}

export async function criarLojaAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  try {
    const app = await getApp();
    await app.criarLoja(actor, { nome: String(formData.get("nome") ?? "") });
    revalidatePath("/dashboard");
    revalidatePath("/estoque");
  } catch (error) {
    fail(error);
  }
}

export async function criarProdutoAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const unidade = String(formData.get("unidade") ?? "") as UnidadeMedida;
  if (!UNIDADES.includes(unidade)) throw new ValidationError("Unidade de medida inválida.");
  try {
    const app = await getApp();
    await app.criarProduto(actor, {
      nome: String(formData.get("nome") ?? ""),
      unidade,
    });
    revalidatePath("/produtos");
    revalidatePath("/fechamento");
    revalidatePath("/estoque");
  } catch (error) {
    fail(error);
  }
}

export async function editarProdutoAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const unidade = String(formData.get("unidade") ?? "") as UnidadeMedida;
  if (!UNIDADES.includes(unidade)) throw new ValidationError("Unidade de medida inválida.");
  try {
    const app = await getApp();
    await app.editarProduto(actor, {
      id: String(formData.get("id") ?? ""),
      nome: String(formData.get("nome") ?? ""),
      unidade,
    });
    revalidatePath("/produtos");
  } catch (error) {
    fail(error);
  }
}

export async function desativarProdutoAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  try {
    const app = await getApp();
    await app.desativarProduto(actor, { id: String(formData.get("id") ?? "") });
    revalidatePath("/produtos");
    revalidatePath("/fechamento");
    revalidatePath("/estoque");
  } catch (error) {
    fail(error);
  }
}

export async function criarPerfilAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const permissions = ALL_PERMISSIONS.filter((item) => formData.get(`perm_${item}`) === "on");
  try {
    const app = await getApp();
    await app.criarPerfil(actor, {
      nome: String(formData.get("nome") ?? ""),
      permissions,
    });
    revalidatePath("/perfis");
  } catch (error) {
    fail(error);
  }
  voltarPerfis(formData);
}

export async function editarPerfilAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const permissions = ALL_PERMISSIONS.filter((item) => formData.get(`perm_${item}`) === "on");
  try {
    const app = await getApp();
    await app.editarPerfil(actor, {
      id: String(formData.get("id") ?? ""),
      nome: String(formData.get("nome") ?? ""),
      permissions,
    });
    revalidatePath("/perfis");
  } catch (error) {
    fail(error);
  }
  voltarPerfis(formData);
}

export async function criarUsuarioAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const lojaIds = formData.getAll("lojaIds").map(String);
  try {
    const app = await getApp();
    await app.criarUsuario(actor, {
      email: String(formData.get("email") ?? ""),
      senha: String(formData.get("senha") ?? ""),
      nome: String(formData.get("nome") ?? ""),
      perfilId: String(formData.get("perfilId") ?? ""),
      lojaIds,
    });
    revalidatePath("/usuarios");
  } catch (error) {
    fail(error);
  }
}

export async function desligarUsuarioAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  try {
    const app = await getApp();
    await app.desligarUsuario(actor, { userId: String(formData.get("userId") ?? "") });
    revalidatePath("/usuarios");
  } catch (error) {
    fail(error);
  }
}

export async function alterarVinculoAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  const lojaIds = formData.getAll("lojaIds").map(String);
  try {
    const app = await getApp();
    await app.alterarVinculo(actor, {
      userId: String(formData.get("userId") ?? ""),
      lojaIds,
    });
    revalidatePath("/usuarios");
  } catch (error) {
    fail(error);
  }
}

export async function alterarPerfilUsuarioAction(formData: FormData): Promise<void> {
  const actor = await exigirActor();
  try {
    const app = await getApp();
    await app.alterarPerfilUsuario(actor, {
      userId: String(formData.get("userId") ?? ""),
      perfilId: String(formData.get("perfilId") ?? ""),
    });
    revalidatePath("/usuarios");
  } catch (error) {
    fail(error);
  }
}
