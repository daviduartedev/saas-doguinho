import { FechamentoForm } from "@/components/fechamento/fechamento-form";
import { AppShell } from "@/components/shell/app-shell";
import { loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const { actor, lojas, lojaId, snap, produtos, linhas } = await loadWorkspace(loja);
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "Loja";

  return (
    <AppShell lojas={lojas} lojaId={lojaId} actor={actor} status={snap?.status ?? null}>
      {lojaId && snap ? (
        <FechamentoForm
          lojaId={lojaId}
          lojaNome={lojaNome}
          status={snap.status}
          linhasIniciais={linhas}
          produtos={produtos}
          exigeJustificativa={snap.exigeJustificativa}
        />
      ) : (
        <p className="text-[15px] text-steam">Esta conta autentica, mas não tem Vínculo com Loja. Peça ao Dono.</p>
      )}
    </AppShell>
  );
}
