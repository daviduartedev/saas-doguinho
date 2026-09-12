import { AppShell } from "@/components/shell/app-shell";
import { PageCanvas } from "@/components/ui/page-canvas";
import { ListingPager } from "@/components/ui/pager";
import { EstoqueTabela } from "@/components/estoque/estoque-tabela";
import { EstoqueToolbar } from "@/components/estoque/estoque-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarProdutoAction } from "@/doguinho/admin-actions";
import type { EstoqueView } from "@/doguinho/types";
import { UNIDADES } from "@/doguinho/types";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace, shellFrom } from "@/doguinho/workspace";
import { paginate, parseListingQuery } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; per?: string; q?: string; novo?: string }>;
}) {
  const { loja, page, per, q, novo } = await searchParams;
  const workspace = await loadWorkspace(loja);
  const { actor, lojas, filtro, produtos, app } = workspace;
  const query = parseListingQuery(q);
  const ativos = produtos.filter(
    (produto) =>
      produto.ativo &&
      (!query || produto.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))),
  );
  const visao: EstoqueView[] = [];
  for (const item of lojas) {
    visao.push(await app.estoqueDaLoja(actor, item.id));
  }
  const listing = paginate(ativos, page, per);
  const podeGerir = actorCan(actor, "manage_produto");
  const mostrarNovo = novo === "1" && podeGerir;

  return (
    <AppShell {...shellFrom(workspace)}>
      <PageCanvas>
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Estoque</h1>
            <p className="mt-2 max-w-xl text-sm text-steam">
              Número oficial = quantidade restante do último Fechamento enviado. Rascunho não conta.
            </p>
          </div>
          <EstoqueToolbar lojaId={filtro} query={query} podeGerir={podeGerir} />
        </header>

        {mostrarNovo ? (
          <form
            action={criarProdutoAction}
            className="listing-pad grid gap-3 rounded-lg border border-border bg-sheet sm:grid-cols-[1fr_8rem_auto]"
          >
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="unidade">Unidade</Label>
              <select
                id="unidade"
                name="unidade"
                className="mt-1 h-11 w-full rounded-md border border-border bg-[var(--control)] px-3 text-sm"
              >
                {UNIDADES.map((unidade) => (
                  <option key={unidade} value={unidade}>
                    {unidade}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <SubmitButton>Cadastrar</SubmitButton>
            </div>
          </form>
        ) : null}

        {visao.length === 0 ? (
          <p className="text-sm text-steam">Sem Loja no Vínculo.</p>
        ) : (
          <div>
            <div className="listing-frame">
              <EstoqueTabela visao={visao} produtos={listing.items} podeGerir={podeGerir} />
            </div>
            <ListingPager
              pathname="/estoque"
              page={listing.page}
              totalPages={listing.totalPages}
              total={listing.total}
              size={listing.size}
              from={listing.from}
              to={listing.to}
              params={{ loja: filtro, q: query || undefined, per: String(listing.size) }}
              noun="produtos"
            />
          </div>
        )}
      </PageCanvas>
    </AppShell>
  );
}
