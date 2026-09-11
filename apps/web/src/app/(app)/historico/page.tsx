import { AppShell } from "@/components/shell/app-shell";
import { loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, app, produtos } = await loadWorkspace(loja);
  const historico = lojaId ? await app.historico(actor, { lojaId }) : [];
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "";
  const nomeProduto = (id: string) => produtos.find((produto) => produto.id === id)?.nome ?? id;

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Caderninho</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Histórico · {lojaNome}</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Cada envio permanece. A diferença é o novo menos o anterior — não é um fato à parte.
          </p>
        </header>

        {historico.length === 0 ? (
          <p className="text-sm text-steam">Nenhum Fechamento nesta Loja.</p>
        ) : (
          <ol className="space-y-4">
            {historico.map((row) => (
              <li key={row.submission.id} className="rounded-md bg-sheet p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
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
                  <p className="mt-2 text-sm text-ink">{row.submission.justificativa}</p>
                ) : null}
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-steam">
                      <th className="py-1 font-medium">Produto</th>
                      <th className="py-1 text-right font-medium">Anterior</th>
                      <th className="py-1 text-right font-medium">Nova</th>
                      <th className="py-1 text-right font-medium">Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.submission.linhas.map((linha) => {
                      const delta =
                        linha.anterior === null ? null : linha.nova - linha.anterior;
                      return (
                        <tr key={linha.produtoId} className="border-t border-border">
                          <td className="py-1.5">{nomeProduto(linha.produtoId)}</td>
                          <td className="tabular py-1.5 text-right">{linha.anterior ?? "—"}</td>
                          <td className="tabular py-1.5 text-right font-semibold">{linha.nova}</td>
                          <td className="tabular py-1.5 text-right text-steam">
                            {delta === null ? "—" : delta}
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
      </div>
    </AppShell>
  );
}
