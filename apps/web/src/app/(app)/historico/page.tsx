import { EnviosLista } from "@/components/historico/envios-lista";
import { PageCanvas } from "@/components/ui/page-canvas";
import { Pager } from "@/components/ui/pager";
import { loadWorkspace } from "@/doguinho/workspace";
import { LISTING_PAGE_SIZE, parseListingPage } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string }>;
}) {
  const { loja, page } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: false, lojaState: false });
  const { actor, lojas, lojaId, filtro, app } = workspace;
  const pagina = lojaId
    ? await app.historicoPagina(actor, {
        lojaId,
        page: parseListingPage(page),
        per: LISTING_PAGE_SIZE,
      })
    : { items: [], total: 0 };
  const totalPages = Math.max(1, Math.ceil(pagina.total / LISTING_PAGE_SIZE) || 1);
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "";
  const nomeProduto = (id: string, nomes: Record<string, string>) => nomes[id] ?? id;

  return (
    <PageCanvas>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink">Histórico · {lojaNome}</h1>
        <p className="mt-2 max-w-xl text-sm text-steam">
          Cada envio permanece. A diferença é o novo menos o anterior, não é um fato à parte.
        </p>
      </header>

      {pagina.total === 0 ? (
        <p className="text-sm text-steam">Nenhum Fechamento nesta Loja.</p>
      ) : (
        <EnviosLista rows={pagina.items} labelProduto={nomeProduto} />
      )}
      <Pager
        pathname="/historico"
        page={Math.min(parseListingPage(page), totalPages)}
        totalPages={totalPages}
        params={{ loja: filtro }}
      />
    </PageCanvas>
  );
}
