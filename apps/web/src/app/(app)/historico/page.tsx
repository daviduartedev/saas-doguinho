import { EnviosLista } from "@/components/historico/envios-lista";
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
        <EnviosLista rows={listing.items} labelProduto={nomeProduto} />
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
