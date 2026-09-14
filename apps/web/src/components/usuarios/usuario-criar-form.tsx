import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarUsuarioAction } from "@/doguinho/admin-actions";
import type { Loja, Perfil } from "@/doguinho/types";
import { PerfilSelect } from "./perfil-select";
import { VinculoCheckboxes } from "./vinculo-checkboxes";

export function UsuarioCriarForm({ lojas, perfis }: { lojas: Loja[]; perfis: Perfil[] }) {
  return (
    <form action={criarUsuarioAction} className="listing-pad space-y-4 rounded-lg border border-border bg-sheet">
      <h2 className="font-display text-lg font-bold text-ink">Novo usuário</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="senha">Senha inicial</Label>
          <Input id="senha" name="senha" type="password" minLength={8} required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="perfilId">Perfil</Label>
          <PerfilSelect id="perfilId" name="perfilId" options={perfis} className="mt-1" />
        </div>
      </div>
      <fieldset>
        <legend className="text-[15px] font-medium text-ink">Vínculo</legend>
        <div className="mt-2">
          <VinculoCheckboxes lojas={lojas} />
        </div>
      </fieldset>
      <SubmitButton>Criar usuário</SubmitButton>
    </form>
  );
}
