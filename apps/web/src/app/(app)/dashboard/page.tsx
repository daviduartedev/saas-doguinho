import { AppShell } from "@/components/shell/app-shell";
import { actorCan, rotuloStatus } from "@/doguinho/view";
import { criarLojaAction } from "@/doguinho/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadWorkspace } from "@/doguinho/workspace";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, produtos, app } = await loadWorkspace(loja);
  if (!actorCan(actor, "dashboard")) redirect("/fechamento");
  const dash = await app.dashboard(actor);
  const ativos = produtos.filter((produto) => produto.ativo);

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Hoje</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Dashboard</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Quem ainda não enviou o Fechamento, o Estoque atual e os últimos envios. Sem venda, sem faturamento.
          </p>
        </header>

        <section>
          <h2 className="font-display text-lg font-bold">Sem Fechamento hoje</h2>
          {dash.semFechamentoHoje.length === 0 ? (
            <p className="mt-2 text-sm text-steam">Todas as Lojas já enviaram.</p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {dash.semFechamentoHoje.map((item) => (
                <li key={item.id} className="rounded-md bg-ketchup px-3 py-1.5 text-sm font-semibold text-white">
                  {item.nome}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-x-auto rounded-md bg-sheet">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-semibold text-steam">Produto</th>
                {dash.estoque.map((coluna) => (
                  <th key={coluna.loja.id} className="px-4 py-3 font-semibold text-ink">
                    <span className="block">{coluna.loja.nome}</span>
                    <span className="text-xs font-medium text-ketchup">{rotuloStatus(coluna.status)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ativos.map((produto) => (
                <tr key={produto.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold">{produto.nome}</td>
                  {dash.estoque.map((coluna) => {
                    const valor = coluna.valores[produto.id];
                    return (
                      <td key={coluna.loja.id} className="tabular px-4 py-3 text-right font-semibold">
                        {valor === null || valor === undefined ? (
                          <span className="font-medium text-steam">nunca fechou</span>
                        ) : (
                          valor
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Envios recentes</h2>
          <ol className="mt-3 space-y-2">
            {dash.recentes.map((row) => (
              <li key={row.submission.id} className="rounded-md bg-sheet px-4 py-3 text-sm">
                <span className="font-semibold">
                  {row.submission.tipo === "correcao" ? "Correção" : "Fechamento"}
                </span>
                <span className="text-steam"> · {row.usuarioNome} · {formatWhen(row.submission.enviadoEm)}</span>
              </li>
            ))}
            {dash.recentes.length === 0 ? <li className="text-sm text-steam">Nenhum envio ainda.</li> : null}
          </ol>
        </section>

        {actor.isDono ? (
          <section className="max-w-sm rounded-md bg-sheet p-4">
            <h2 className="font-display text-lg font-bold">Nova Loja</h2>
            <form action={criarLojaAction} className="mt-3 space-y-3">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required />
              <Button type="submit">Criar Loja</Button>
            </form>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
