import { PageCanvas } from "@/components/ui/page-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarLojaAction } from "@/doguinho/admin-actions";
import { MAX_LOJAS } from "@/doguinho/seed";
import { loadWorkspace } from "@/doguinho/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: false, lojaState: false });
  if (!workspace.actor.isDono) redirect("/fechamento");
  const podeCriar = workspace.lojas.length < MAX_LOJAS;

  return (
    <PageCanvas>
        <header>
          <h1 className="font-display text-3xl font-bold text-ink">Configurações</h1>
          <p className="mt-3 max-w-xl font-display text-xl font-semibold leading-snug text-ink">
            Três Lojas. Um cardápio.
          </p>
        </header>

        {podeCriar ? (
          <section className="listing-pad max-w-sm rounded-lg border border-border bg-sheet">
            <h2 className="font-display text-lg font-bold">Nova Loja</h2>
            <form action={criarLojaAction} className="mt-3 space-y-3">
              <input type="hidden" name="loja" value={workspace.filtro} />
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required maxLength={80} />
              <SubmitButton>Criar Loja</SubmitButton>
            </form>
          </section>
        ) : null}

        <section>
          <h2 className="font-display text-lg font-bold">Lojas</h2>
          {workspace.lojas.length === 0 ? (
            <p className="mt-2 text-sm text-steam">Nenhuma Loja ainda.</p>
          ) : (
            <ul className="listing-frame mt-3 divide-y divide-border bg-sheet">
              {workspace.lojas.map((item) => (
                <li key={item.id} className="listing-pad text-sm font-semibold">
                  {item.nome}
                </li>
              ))}
            </ul>
          )}
        </section>
    </PageCanvas>
  );
}
