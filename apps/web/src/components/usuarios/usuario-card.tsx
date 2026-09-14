import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  alterarPerfilUsuarioAction,
  alterarVinculoAction,
  desligarUsuarioAction,
} from "@/doguinho/admin-actions";
import type { Loja, Perfil, Usuario } from "@/doguinho/types";
import { PerfilSelect } from "./perfil-select";
import { VinculoCheckboxes } from "./vinculo-checkboxes";

export function UsuarioCard({
  user,
  lojas,
  perfis,
}: {
  user: Usuario & { lojaIds: string[] };
  lojas: Loja[];
  perfis: Perfil[];
}) {
  const chip = user.isDono ? "Dono" : user.disabled ? "desligado" : null;
  const chipClass = user.isDono
    ? "bg-ketchup text-sheet"
    : "bg-counter text-ink";

  return (
    <li className="listing-pad rounded-lg border border-border bg-sheet">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-ink">{user.nome}</h2>
          <p className="mt-1 break-all text-[15px] text-steam">{user.email}</p>
        </div>
        {chip ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}>
            {chip}
          </span>
        ) : null}
      </header>

      {!user.isDono && !user.disabled ? (
        <div className="mt-5 space-y-5">
          <section className="border-t border-border pt-4">
            <form action={alterarVinculoAction} className="space-y-2">
              <input type="hidden" name="userId" value={user.id} />
              <fieldset className="space-y-2">
                <legend className="text-[15px] font-medium text-ink">Vínculo</legend>
                <VinculoCheckboxes lojas={lojas} defaultCheckedIds={user.lojaIds} />
              </fieldset>
              <SubmitButton variant="primary" size="sm">
                Atualizar Vínculo
              </SubmitButton>
            </form>
          </section>

          {perfis.length > 0 ? (
            <section className="space-y-2 border-t border-border pt-4">
              <form action={alterarPerfilUsuarioAction} className="space-y-2">
                <input type="hidden" name="userId" value={user.id} />
                <Label htmlFor={`perfil-${user.id}`}>Perfil</Label>
                <PerfilSelect
                  id={`perfil-${user.id}`}
                  name="perfilId"
                  defaultValue={user.perfilId ?? undefined}
                  options={perfis}
                />
                <SubmitButton variant="counter" size="sm">
                  Trocar Perfil
                </SubmitButton>
              </form>
            </section>
          ) : null}

          <form action={desligarUsuarioAction} className="border-t border-border pt-4">
            <input type="hidden" name="userId" value={user.id} />
            <ConfirmSubmitButton variant="danger" size="sm" confirmMessage="Desligar este usuário?">
              Desligar
            </ConfirmSubmitButton>
          </form>
        </div>
      ) : null}
    </li>
  );
}
