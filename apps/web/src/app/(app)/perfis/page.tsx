import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarPerfilAction, editarPerfilAction } from "@/doguinho/admin-actions";
import { ALL_PERMISSIONS } from "@/doguinho/seed";
import { loadWorkspace } from "@/doguinho/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const LABELS: Record<(typeof ALL_PERMISSIONS)[number], string> = {
  read_estoque: "Ver Estoque",
  submit_fechamento: "Enviar Fechamento",
  submit_correcao: "Enviar Correção",
  read_history: "Ver histórico",
  dashboard: "Dashboard",
  manage_produto: "Gerir Produtos",
  manage_users: "Criar e desligar usuários",
};

export default async function PerfisPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, app } = await loadWorkspace(loja);
  if (!actor.isDono) redirect("/fechamento");
  const perfis = await app.listarPerfis(actor);

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Papéis</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Perfis</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Checklist de permissões. Lojas não entram aqui — o alcance de Loja é o Vínculo da pessoa.
          </p>
        </header>

        <form action={criarPerfilAction} className="space-y-3 rounded-md bg-sheet p-4">
          <h2 className="font-display text-lg font-bold">Novo Perfil</h2>
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" required />
          <fieldset>
            <legend className="text-sm font-medium">Permissões</legend>
            <ul className="mt-2 space-y-2">
              {ALL_PERMISSIONS.map((permission) => (
                <li key={permission}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`perm_${permission}`}
                      className="h-5 w-5 rounded-[6px] border-border accent-[var(--ketchup)]"
                    />
                    {LABELS[permission]}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
          <Button type="submit">Criar Perfil</Button>
        </form>

        <ul className="space-y-3">
          {perfis.map((perfil) => (
            <li key={perfil.id} className="rounded-md bg-sheet p-4">
              <form action={editarPerfilAction} className="space-y-3">
                <input type="hidden" name="id" value={perfil.id} />
                <div>
                  <Label htmlFor={`nome-${perfil.id}`}>Nome</Label>
                  <Input id={`nome-${perfil.id}`} name="nome" defaultValue={perfil.nome} required />
                </div>
                <ul className="space-y-2">
                  {ALL_PERMISSIONS.map((permission) => (
                    <li key={permission}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name={`perm_${permission}`}
                          defaultChecked={perfil.permissions.includes(permission)}
                          className="h-5 w-5 rounded-[6px] border-border accent-[var(--ketchup)]"
                        />
                        {LABELS[permission]}
                      </label>
                    </li>
                  ))}
                </ul>
                <Button type="submit" variant="outline">
                  Salvar
                </Button>
                {perfil.template ? (
                  <p className="text-xs text-steam">Perfil inicial Operador. Não remover enquanto estiver em uso.</p>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
