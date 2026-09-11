import { AppShell } from "@/components/shell/app-shell";
import type { EstoqueView } from "@/doguinho/types";
import { rotuloStatus } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, produtos, app } = await loadWorkspace(loja);
  const ativos = produtos.filter((produto) => produto.ativo);
  const visao: EstoqueView[] = [];
  for (const item of lojas) {
    visao.push(await app.estoqueDaLoja(actor, item.id));
  }

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">
            {actor.isDono ? "Todas as Lojas" : "Sua Loja"}
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-ink">Estoque</h1>
          <p className="mt-2 max-w-xl text-sm text-steam">
            Número oficial = quantidade restante do último Fechamento enviado. Rascunho não conta.
          </p>
        </header>

        {visao.length === 0 ? (
          <p className="text-sm text-steam">Sem Loja no Vínculo.</p>
        ) : (
          <div className="overflow-x-auto rounded-md bg-sheet">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-semibold text-steam">Produto</th>
                  <th className="px-4 py-3 font-semibold text-steam">Unidade</th>
                  {visao.map((coluna) => (
                    <th key={coluna.loja.id} className="px-4 py-3 font-semibold text-ink">
                      <span className="block">{coluna.loja.nome}</span>
                      <span className="text-xs font-medium text-ketchup">
                        {rotuloStatus(coluna.status)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ativos.map((produto) => (
                  <tr key={produto.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold">{produto.nome}</td>
                    <td className="px-4 py-3 text-steam">{produto.unidade}</td>
                    {visao.map((coluna) => {
                      const valor = coluna.valores[produto.id];
                      return (
                        <td key={coluna.loja.id} className="tabular px-4 py-3 text-right text-base font-semibold">
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
          </div>
        )}
      </div>
    </AppShell>
  );
}
