import { AppShell } from "@/components/shell/app-shell";
import { actorCan, rotuloStatus } from "@/doguinho/view";
import { criarLojaAction } from "@/doguinho/admin-actions";
import { PageCanvas } from "@/components/ui/page-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { loadWorkspace } from "@/doguinho/workspace";
import { ListingPager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; per?: string }>;
}) {
  const { loja, page, per } = await searchParams;
  const { actor, lojas, lojaId, snap, produtos, app } = await loadWorkspace(loja);
  if (!actorCan(actor, "dashboard")) redirect("/fechamento");
  const dash = await app.dashboard(actor);
  const ativos = produtos.filter((produto) => produto.ativo);
  const listing = paginate(ativos, page, per);

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <PageCanvas>
        <header>
          <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
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

        <section>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-ketchup text-white">
                <th className="listing-cell text-left font-semibold">Produto</th>
                {dash.estoque.map((coluna) => {
                  const status = rotuloStatus(coluna.status);
                  return (
                    <th key={coluna.loja.id} className="listing-cell text-center font-semibold">
                      <span className="block">{coluna.loja.nome}</span>
                      {status ? (
                        <span className="mt-1 inline-block rounded-full bg-mustard px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                          {status}
                        </span>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="bg-sheet">
              {listing.items.map((produto) => (
                <tr key={produto.id} className="border-b border-border last:border-0">
                  <td className="listing-cell font-semibold">{produto.nome}</td>
                  {dash.estoque.map((coluna) => {
                    const valor = coluna.valores[produto.id];
                    return (
                      <td key={coluna.loja.id} className="listing-cell tabular text-center text-base font-semibold">
                        {valor === null || valor === undefined ? "" : valor}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <ListingPager
            pathname="/dashboard"
            page={listing.page}
            totalPages={listing.totalPages}
            total={listing.total}
            size={listing.size}
            from={listing.from}
            to={listing.to}
            params={{ loja: lojaId, per: String(listing.size) }}
            noun="produtos"
          />
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Envios recentes</h2>
          <ol className="mt-3 space-y-2">
            {dash.recentes.map((row) => (
              <li key={row.submission.id} className="listing-pad rounded-md bg-sheet text-sm">
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
          <section className="listing-pad max-w-sm rounded-md bg-sheet">
            <h2 className="font-display text-lg font-bold">Nova Loja</h2>
            <form action={criarLojaAction} className="mt-3 space-y-3">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required />
              <SubmitButton>Criar Loja</SubmitButton>
            </form>
          </section>
        ) : null}
      </PageCanvas>
    </AppShell>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
