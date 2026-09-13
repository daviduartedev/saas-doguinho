import { PageCanvas } from "@/components/ui/page-canvas";
import { Pager } from "@/components/ui/pager";
import { loadWorkspace } from "@/doguinho/workspace";
import { paginate } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string }>;
}) {
  const { loja, page } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: true, lojaState: false });
  const { actor, lojas, lojaId, filtro, app, produtos } = workspace;
  const historico = lojaId ? await app.historico(actor, { lojaId }) : [];
  const listing = paginate(historico, page);
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "";
  const nomeProduto = (id: string, nomes: Record<string, string>) =>
    nomes[id] ?? produtos.find((produto) => produto.id === id)?.nome ?? id;

  return (
    <PageCanvas>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Histórico · {lojaNome}</h1>
        <p className="mt-2 max-w-xl text-sm text-steam">
          Cada envio permanece. A diferença é o novo menos o anterior, não é um fato à parte.
        </p>
      </header>

      {historico.length === 0 ? (
        <p className="text-sm text-steam">Nenhum Fechamento nesta Loja.</p>
      ) : (
        <ol className="space-y-4">
          {listing.items.map((row) => (
            <li key={row.submission.id} className="listing-frame bg-sheet">
              <div className="listing-pad flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  {row.submission.tipo === "correcao" ? "Correção" : "Fechamento"} · {row.usuarioNome}
                </p>
                <p className="text-xs text-steam">
                  {new Date(row.submission.enviadoEm).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
              </div>
              {row.submission.tipo === "correcao" && row.submission.justificativa ? (
                <p className="listing-pad pt-0 text-sm text-ink">{row.submission.justificativa}</p>
              ) : null}
              <table className="listing-stack w-full text-sm">
                <thead>
                  <tr className="bg-ketchup text-left text-white">
                    <th className="listing-cell font-semibold">Produto</th>
                    <th className="listing-cell text-right font-semibold">Anterior</th>
                    <th className="listing-cell text-right font-semibold">Nova</th>
                    <th className="listing-cell text-right font-semibold">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {row.submission.linhas.map((linha) => {
                    const delta =
                      linha.anterior === null ? null : linha.nova - linha.anterior;
                    return (
                      <tr key={linha.produtoId} className="border-t border-border">
                        <td className="listing-cell" data-label="Produto">
                          {nomeProduto(linha.produtoId, row.produtoNomes)}
                        </td>
                        <td className="listing-cell tabular text-right" data-label="Anterior">
                          {linha.anterior ?? ""}
                        </td>
                        <td className="listing-cell tabular text-right font-semibold" data-label="Nova">
                          {linha.nova}
                        </td>
                        <td className="listing-cell tabular text-right text-steam" data-label="Δ">
                          {delta === null ? "" : delta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </li>
          ))}
        </ol>
      )}
      <Pager
        pathname="/historico"
        page={listing.page}
        totalPages={listing.totalPages}
        params={{ loja: filtro }}
      />
    </PageCanvas>
  );
}
