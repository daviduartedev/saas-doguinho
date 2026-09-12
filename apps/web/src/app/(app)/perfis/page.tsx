import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PerfisFicha } from "@/components/perfis/perfis-ficha";
import { countPermissionsOn } from "@/components/perfis/labels";
import { PageCanvas } from "@/components/ui/page-canvas";
import { ALL_PERMISSIONS } from "@/doguinho/seed";
import { loadWorkspace, shellFrom } from "@/doguinho/workspace";
import { Pager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PerfisPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; novo?: string; editar?: string }>;
}) {
  const { loja, page, novo, editar } = await searchParams;
  const workspace = await loadWorkspace(loja);
  const { actor, filtro, app } = workspace;
  if (!actor.isDono) redirect("/fechamento");
  const perfis = await app.listarPerfis(actor);
  const listing = paginate(perfis, page);
  const editando = editar ? (perfis.find((item) => item.id === editar) ?? null) : null;
  const mostrarFicha = Boolean(editando) || novo === "1";
  const novoHref = filtro ? `/perfis?loja=${filtro}&novo=1` : "/perfis?novo=1";

  return (
    <AppShell {...shellFrom(workspace)}>
      <PageCanvas>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Perfis</h1>
            <p className="mt-2 max-w-xl text-sm text-steam">
              Checklist de permissões. Lojas não entram aqui: o alcance de Loja é o Vínculo da pessoa.
            </p>
          </div>
          <Link
            href={novoHref}
            className="inline-flex h-10 items-center justify-center gap-1.5 text-[15px] font-semibold text-ketchup hover:text-ketchup-hot"
          >
            <Plus className="h-4 w-4" />
            Novo perfil
          </Link>
        </header>

        {mostrarFicha ? <PerfisFicha perfil={editando} lojaId={filtro} /> : null}

        <div className="listing-frame">
          <div className="grid grid-cols-[minmax(10rem,1fr)_8rem_auto] bg-ketchup text-white">
            <div className="listing-cell font-semibold">Perfil</div>
            <div className="listing-cell font-semibold">Ligadas</div>
            <div className="listing-cell text-right font-semibold">Ações</div>
          </div>
          {listing.items.map((perfil) => {
            const href = filtro
              ? `/perfis?loja=${filtro}&editar=${perfil.id}`
              : `/perfis?editar=${perfil.id}`;
            return (
              <div
                key={perfil.id}
                className="grid grid-cols-[minmax(10rem,1fr)_8rem_auto] items-center border-b border-border bg-sheet last:border-0"
              >
                <div className="listing-cell font-semibold">
                  {perfil.nome}
                  {perfil.template ? (
                    <span className="ml-2 rounded-full bg-mustard px-2 py-0.5 text-[11px] font-semibold text-ink">
                      inicial
                    </span>
                  ) : null}
                </div>
                <div className="listing-cell tabular text-steam">
                  {countPermissionsOn(perfil.permissions)} de {ALL_PERMISSIONS.length}
                </div>
                <div className="listing-cell text-right">
                  <Link
                    href={href}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-sheet px-3 text-sm font-semibold text-ink"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        <Pager
          pathname="/perfis"
          page={listing.page}
          totalPages={listing.totalPages}
          params={{ loja: filtro }}
        />
      </PageCanvas>
    </AppShell>
  );
}
