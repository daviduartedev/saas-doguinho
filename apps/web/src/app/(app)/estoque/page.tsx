import { PageCanvas } from "@/components/ui/page-canvas";
import { ListingPager } from "@/components/ui/pager";
import { EstoqueTabela } from "@/components/estoque/estoque-tabela";
import { EstoqueToolbar } from "@/components/estoque/estoque-toolbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { ShellStatus } from "@/components/shell/shell-status";
import { criarProdutoAction } from "@/doguinho/admin-actions";
import type { EstoqueView } from "@/doguinho/types";
import { UNIDADES } from "@/doguinho/types";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";
import { paginate, parseListingQuery } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; per?: string; q?: string; novo?: string }>;
}) {
  const { loja, page, per, q, novo } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: true, lojaState: false });
  const { actor, filtro, produtos, app } = workspace;
  const query = parseListingQuery(q);
  const ativos = produtos.filter(
    (produto) =>
      produto.ativo &&
      (!query || produto.nome.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))),
  );
  const visao: EstoqueView[] = await app.estoqueDasLojas(actor);
  const listing = paginate(ativos, page, per);
  const podeGerir = actorCan(actor, "manage_produto");
  const mostrarNovo = novo === "1" && podeGerir;
  const statusLoja = visao.find((coluna) => coluna.loja.id === filtro);

  return (
    <PageCanvas>
      <ShellStatus status={statusLoja?.status ?? null} filtro={filtro} />
      <header className="flex flex-wrap items-start justify-between gap-4">
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
          className="listing-pad auto-fill-form rounded-lg border border-border bg-sheet"
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
  );
}
