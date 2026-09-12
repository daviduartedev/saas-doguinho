import { AppShell } from "@/components/shell/app-shell";
import { PageCanvas } from "@/components/ui/page-canvas";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { buildDashboardModel } from "@/components/dashboard/model";
import { loadWorkspace, shellFrom } from "@/doguinho/workspace";
import { actorCan } from "@/doguinho/view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const workspace = await loadWorkspace(loja);
  if (!actorCan(workspace.actor, "dashboard")) redirect("/fechamento");
  const dash = await workspace.app.dashboard(workspace.actor);
  const historicos = await Promise.all(
    dash.estoque.map(async (coluna) => ({
      loja: coluna.loja,
      rows: await workspace.app.historico(workspace.actor, { lojaId: coluna.loja.id }).catch(() => []),
    })),
  );
  const model = buildDashboardModel({
    filtro: workspace.filtro,
    lojas: workspace.lojas,
    produtos: workspace.produtos,
    historicos,
  });

  return (
    <AppShell {...shellFrom(workspace)}>
      <PageCanvas>
        <DashboardPanel model={model} />
      </PageCanvas>
    </AppShell>
  );
}
