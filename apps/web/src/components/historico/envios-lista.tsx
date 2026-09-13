import type { HistoryRow } from "@/doguinho/types";

export function EnviosLista({
  rows,
  labelProduto,
}: {
  rows: HistoryRow[];
  labelProduto?: (id: string, nomes: Record<string, string>) => string;
}) {
  const nome = labelProduto ?? ((id, nomes) => nomes[id] ?? id);

  return (
    <ol className="space-y-4">
      {rows.map((row) => (
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
                <th className="listing-cell text-right font-semibold">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {row.submission.linhas.map((linha) => {
                const diferenca = linha.anterior === null ? null : linha.nova - linha.anterior;
                return (
                  <tr key={linha.produtoId} className="border-t border-border">
                    <td className="listing-cell" data-label="Produto">
                      {nome(linha.produtoId, row.produtoNomes)}
                    </td>
                    <td className="listing-cell tabular text-right" data-label="Anterior">
                      {linha.anterior ?? ""}
                    </td>
                    <td className="listing-cell tabular text-right font-semibold" data-label="Nova">
                      {linha.nova}
                    </td>
                    <td className="listing-cell tabular text-right text-steam" data-label="Diferença">
                      {diferenca === null ? "" : diferenca}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </li>
      ))}
    </ol>
  );
}
