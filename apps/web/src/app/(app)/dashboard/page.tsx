import { PageCanvas } from "@/components/ui/page-canvas";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { buildDashboardModel } from "@/components/dashboard/model";
import { loadWorkspace } from "@/doguinho/workspace";
import { actorCan } from "@/doguinho/view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: true, lojaState: false });
  if (!actorCan(workspace.actor, "dashboard")) redirect("/fechamento");
  const dash = await workspace.app.dashboard(workspace.actor);
  const model = buildDashboardModel({
    filtro: workspace.filtro,
    lojas: workspace.lojas,
    produtos: workspace.produtos,
    historicos: dash.historicos,
  });

  return (
    <PageCanvas>
      <DashboardPanel model={model} />
    </PageCanvas>
  );
}
