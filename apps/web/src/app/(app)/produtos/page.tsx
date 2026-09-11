import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarProdutoAction,
  desativarProdutoAction,
  editarProdutoAction,
} from "@/doguinho/admin-actions";
import { actorCan } from "@/doguinho/view";
import { UNIDADES } from "@/doguinho/types";
import { loadWorkspace } from "@/doguinho/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, produtos } = await loadWorkspace(loja);
  if (!actorCan(actor, "manage_produto")) redirect("/fechamento");

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Catálogo</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Produtos</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Um catálogo para todas as Lojas. Desativar tira do próximo Fechamento e guarda o histórico.
          </p>
        </header>

        <form action={criarProdutoAction} className="grid gap-3 rounded-md bg-sheet p-4 sm:grid-cols-[1fr_8rem_auto]">
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
            <Button type="submit">Cadastrar</Button>
          </div>
        </form>

        <ul className="space-y-2">
          {produtos.map((produto) => (
            <li key={produto.id} className="rounded-md bg-sheet p-3">
              <form action={editarProdutoAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={produto.id} />
                <div className="min-w-[10rem] flex-1">
                  <Label htmlFor={`nome-${produto.id}`}>Nome</Label>
                  <Input id={`nome-${produto.id}`} name="nome" defaultValue={produto.nome} required />
                </div>
                <div>
                  <Label htmlFor={`unidade-${produto.id}`}>Unidade</Label>
                  <select
                    id={`unidade-${produto.id}`}
                    name="unidade"
                    defaultValue={produto.unidade}
                    className="h-11 rounded-md border border-border bg-[var(--control)] px-3 text-sm"
                  >
                    {UNIDADES.map((unidade) => (
                      <option key={unidade} value={unidade}>
                        {unidade}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="outline">
                  Salvar
                </Button>
              </form>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-steam">{produto.ativo ? "Ativo" : "Desativado"}</span>
                {produto.ativo ? (
                  <form action={desativarProdutoAction}>
                    <input type="hidden" name="id" value={produto.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Desativar
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
