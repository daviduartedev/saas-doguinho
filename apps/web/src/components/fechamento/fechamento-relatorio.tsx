import type { HistoryRow, Produto, QuantidadeLinha } from "@/doguinho/types";
import { EnviosLista } from "@/components/historico/envios-lista";
import { ListingPager } from "@/components/ui/pager";
import { paginate } from "@/lib/pagination";

export function FechamentoRelatorio({
  lojaId,
  lojaNome,
  produtos,
  linhas,
  envios,
  page,
  per,
}: {
  lojaId: string;
  lojaNome: string;
  produtos: Produto[];
  linhas: QuantidadeLinha[];
  envios: HistoryRow[];
  page?: string;
  per?: string;
}) {
  const ativos = produtos.filter((produto) => produto.ativo);
  const listing = paginate(ativos, page, per);
  const porId = new Map(linhas.map((linha) => [linha.produtoId, linha.restante]));

  return (
    <div className="w-full">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-bold text-ink text-balance">
          Fechamento · {lojaNome}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-steam">
          Quantidade restante do último envio de hoje nesta Loja. Rascunho não entra.
        </p>
      </header>

      {ativos.length === 0 ? (
        <p className="rounded-md border border-border bg-sheet px-3 py-2 text-sm">
          Não há Produtos ativos. Cadastre o catálogo em Produtos.
        </p>
      ) : (
        <>
          <div className="listing-frame">
            <table className="listing-stack w-full border-collapse text-sm">
              <thead>
                <tr className="bg-ketchup text-white">
                  <th className="listing-cell text-left font-semibold">Produto</th>
                  <th className="listing-cell text-left font-semibold">Unidade</th>
                  <th className="listing-cell text-right font-semibold">Quantidade restante</th>
                </tr>
              </thead>
              <tbody className="bg-sheet">
                {listing.items.map((produto) => {
                  const restante = porId.get(produto.id) ?? null;
                  return (
                    <tr key={produto.id} className="border-b border-border last:border-0">
                      <td className="listing-cell font-semibold text-ink" data-label="Produto">
                        {produto.nome}
                      </td>
                      <td className="listing-cell text-steam" data-label="Unidade">
                        {produto.unidade}
                      </td>
                      <td
                        className="listing-cell tabular text-right text-lg font-semibold text-ink"
                        data-label="Quantidade restante"
                        aria-label={`Quantidade restante de ${produto.nome}`}
                      >
                        {restante === null ? "" : restante}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ListingPager
            pathname="/fechamento"
            page={listing.page}
            totalPages={listing.totalPages}
            total={listing.total}
            size={listing.size}
            from={listing.from}
            to={listing.to}
            params={{ loja: lojaId, per }}
            noun="produtos"
          />
        </>
      )}

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-ink">Envios de hoje</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-steam">
          Quem enviou nesta Loja hoje. O Histórico guarda todos os dias.
        </p>
        {envios.length === 0 ? (
          <p className="mt-4 text-sm text-steam">Nenhum envio hoje nesta Loja.</p>
        ) : (
          <div className="mt-4">
            <EnviosLista rows={envios} />
          </div>
        )}
      </section>
    </div>
  );
}
