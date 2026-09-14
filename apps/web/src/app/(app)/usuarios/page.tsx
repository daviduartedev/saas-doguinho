import { PageCanvas } from "@/components/ui/page-canvas";
import { UsuarioCard } from "@/components/usuarios/usuario-card";
import { UsuarioCriarForm } from "@/components/usuarios/usuario-criar-form";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";
import { Pager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string }>;
}) {
  const { loja, page } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: false, lojaState: false });
  const { actor, lojas, filtro, app } = workspace;
  if (!actorCan(actor, "manage_users")) redirect("/fechamento");
  const [users, perfis] = await Promise.all([app.listarUsuarios(actor), app.listarPerfis(actor)]);
  const listing = paginate(users, page);

  return (
    <PageCanvas>
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Usuários</h1>
        <p className="mt-3 max-w-xl font-display text-xl font-semibold leading-snug text-ink">
          Quem entra em cada Loja.
        </p>
      </header>

      {actor.isDono || actorCan(actor, "manage_users") ? (
        <UsuarioCriarForm lojas={lojas} perfis={perfis} />
      ) : null}

      <ul className="space-y-3">
        {listing.items.map((user) => (
          <UsuarioCard key={user.id} user={user} lojas={lojas} perfis={perfis} />
        ))}
      </ul>
      <Pager
        pathname="/usuarios"
        page={listing.page}
        totalPages={listing.totalPages}
        params={{ loja: filtro }}
      />
    </PageCanvas>
  );
}
