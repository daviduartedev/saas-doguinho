import { Ban, Save, Trash2 } from "lucide-react";
import { ProdutoFolha } from "@/components/produtos/produto-folha";
import { PageCanvas } from "@/components/ui/page-canvas";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { UnidadeSelect } from "@/components/ui/unidade-select";
import {
  criarProdutoAction,
  desativarProdutoAction,
  editarProdutoAction,
  excluirProdutoAction,
} from "@/doguinho/admin-actions";
import { actorCan } from "@/doguinho/view";
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

        <div className="produtos-desktop-only">
        <form action={criarProdutoAction} className="listing-pad auto-fill-form rounded-lg border border-border bg-sheet">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="unidade">Unidade</Label>
            <UnidadeSelect id="unidade" name="unidade" className="mt-1" />
          </div>
          <div className="flex items-end">
            <SubmitButton>Cadastrar</SubmitButton>
          </div>
        </form>
        </div>

        <ProdutoFolha
          produtos={listing.items.map((produto) => ({
            id: produto.id,
            nome: produto.nome,
            unidade: produto.unidade,
            ativo: produto.ativo,
          }))}
        />

        <div className="produtos-desktop-only">
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
                <UnidadeSelect
                  id={`unidade-${produto.id}`}
                  name="unidade"
                  defaultValue={produto.unidade}
                />
              </div>
              <div className="listing-cell text-sm text-steam" data-label="Status">{produto.ativo ? "Ativo" : "Desativado"}</div>
              <div className="listing-cell flex flex-wrap items-center justify-end gap-2">
                <SubmitButton variant="primary" size="icon" aria-label="Salvar">
                  <Save className="h-4 w-4" aria-hidden />
                </SubmitButton>
                {produto.ativo ? (
                  <SubmitButton
                    formAction={desativarProdutoAction}
                    variant="counter"
                    size="icon"
                    aria-label="Desativar"
                  >
                    <Ban className="h-4 w-4" aria-hidden />
                  </SubmitButton>
                ) : null}
                <ConfirmSubmitButton
                  formAction={excluirProdutoAction}
                  variant="danger"
                  size="icon"
                  aria-label="Excluir"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </ConfirmSubmitButton>
              </div>
            </form>
          ))}
        </div>
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
