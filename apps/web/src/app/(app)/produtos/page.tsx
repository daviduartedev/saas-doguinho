import { PageCanvas } from "@/components/ui/page-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  criarProdutoAction,
  desativarProdutoAction,
  editarProdutoAction,
  excluirProdutoAction,
} from "@/doguinho/admin-actions";
import { actorCan } from "@/doguinho/view";
import { UNIDADES } from "@/doguinho/types";
import { loadWorkspace } from "@/doguinho/workspace";
import { Pager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string }>;
}) {
  const { loja, page } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: true, lojaState: false });
  const { actor, filtro, produtos } = workspace;
  const listing = paginate(produtos, page);
  if (!actorCan(actor, "manage_produto")) redirect("/fechamento");

  return (
    <PageCanvas>
        <header>
          <h1 className="font-display text-3xl font-bold text-ink">Produtos</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Um catálogo para todas as Lojas. Desativar tira do próximo Fechamento e guarda o histórico.
            Excluir some do catálogo. O passado permanece no Histórico.
          </p>
        </header>

        <form action={criarProdutoAction} className="listing-pad auto-fill-form rounded-lg border border-border bg-sheet">
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

        <div className="listing-frame">
          <div className="listing-head listing-head-produtos">
            <div className="listing-cell font-semibold">Produto</div>
            <div className="listing-cell font-semibold">Unidade</div>
            <div className="listing-cell font-semibold">Status</div>
            <div className="listing-cell text-center font-semibold">Ações</div>
          </div>
          {listing.items.map((produto) => (
            <form
              key={produto.id}
              action={editarProdutoAction}
              className="listing-row listing-row-produtos"
            >
              <input type="hidden" name="id" value={produto.id} />
              <div className="listing-cell" data-label="Produto">
                <Label htmlFor={`nome-${produto.id}`} className="sr-only">
                  Nome
                </Label>
                <Input id={`nome-${produto.id}`} name="nome" defaultValue={produto.nome} required />
              </div>
              <div className="listing-cell" data-label="Unidade">
                <Label htmlFor={`unidade-${produto.id}`} className="sr-only">
                  Unidade
                </Label>
                <select
                  id={`unidade-${produto.id}`}
                  name="unidade"
                  defaultValue={produto.unidade}
                  className="h-11 w-full rounded-md border border-border bg-[var(--control)] px-3 text-sm"
                >
                  {UNIDADES.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </select>
              </div>
              <div className="listing-cell text-sm text-steam" data-label="Status">{produto.ativo ? "Ativo" : "Desativado"}</div>
              <div className="listing-cell flex flex-wrap items-center justify-end gap-2">
                <SubmitButton variant="outline" size="sm">
                  Salvar
                </SubmitButton>
                {produto.ativo ? (
                  <SubmitButton formAction={desativarProdutoAction} variant="ghost" size="sm">
                    Desativar
                  </SubmitButton>
                ) : null}
                <SubmitButton formAction={excluirProdutoAction} variant="ghost" size="sm">
                  Excluir
                </SubmitButton>
              </div>
            </form>
          ))}
        </div>
        <Pager
          pathname="/produtos"
          page={listing.page}
          totalPages={listing.totalPages}
          params={{ loja: filtro }}
        />
    </PageCanvas>
  );
}
