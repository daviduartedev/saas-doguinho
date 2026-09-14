import { PageCanvas } from "@/components/ui/page-canvas";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { buildDashboardModel } from "@/components/dashboard/model";
import { calendarDay, saoPauloClock } from "@/doguinho/clock";
import { parsePeriodo } from "@/doguinho/periodo";
import { FILTRO_TODAS, loadWorkspace } from "@/doguinho/workspace";
import { actorCan } from "@/doguinho/view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; periodo?: string; de?: string; ate?: string }>;
}) {
  const { loja, periodo: periodoParam, de, ate } = await searchParams;
  const workspace = await loadWorkspace(loja, { produtos: true, lojaState: false });
  if (!actorCan(workspace.actor, "dashboard")) redirect("/fechamento");
  const hoje = calendarDay(saoPauloClock());
  const periodo = parsePeriodo({ periodo: periodoParam, de, ate }, hoje);
  const dash = await workspace.app.dashboard(workspace.actor);
  const model = buildDashboardModel({
    filtro: workspace.filtro,
    lojas: workspace.lojas,
    produtos: workspace.produtos,
    historicos: dash.historicos,
  });

  return (
    <PageCanvas>
      <DashboardPanel
        model={model}
        periodo={periodo}
        queryParams={{ loja: workspace.filtro !== FILTRO_TODAS ? workspace.filtro : undefined }}
      />
    </PageCanvas>
  );
}
