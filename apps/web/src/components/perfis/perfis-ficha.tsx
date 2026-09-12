"use client";

import Link from "next/link";
import { Switch } from "@mantine/core";
import { ALL_PERMISSIONS } from "@/doguinho/seed";
import type { Perfil } from "@/doguinho/types";
import { criarPerfilAction, editarPerfilAction } from "@/doguinho/admin-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { PERMISSION_LABELS } from "./labels";

export function PerfisFicha({
  perfil,
  lojaId,
}: {
  perfil: Perfil | null;
  lojaId: string;
}) {
  const editing = Boolean(perfil);
  const cancelHref = lojaId ? `/perfis?loja=${lojaId}` : "/perfis";

  return (
    <form
      action={editing ? editarPerfilAction : criarPerfilAction}
      className="listing-pad space-y-4 rounded-lg border border-border bg-sheet"
    >
      {perfil ? <input type="hidden" name="id" value={perfil.id} /> : null}
      {lojaId ? <input type="hidden" name="loja" value={lojaId} /> : null}
      <h2 className="font-display text-lg font-bold">{editing ? "Editar perfil" : "Novo perfil"}</h2>
      <div>
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" name="nome" required defaultValue={perfil?.nome ?? ""} className="mt-1" />
      </div>
      <div className="grid gap-x-8 gap-y-3 auto-fill-form">
        {ALL_PERMISSIONS.map((permission) => (
          <Switch
            key={permission}
            name={`perm_${permission}`}
            defaultChecked={perfil?.permissions.includes(permission) ?? false}
            label={PERMISSION_LABELS[permission]}
          />
        ))}
      </div>
      {perfil?.template ? (
        <p className="text-xs text-steam">Perfil inicial Operador. Não remover enquanto estiver em uso.</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Link
          href={cancelHref}
          className="inline-flex h-8 items-center px-3 text-sm font-semibold text-steam hover:text-ink"
        >
          Cancelar
        </Link>
        <SubmitButton size="sm">{editing ? "Guardar" : "Criar Perfil"}</SubmitButton>
      </div>
    </form>
  );
}
