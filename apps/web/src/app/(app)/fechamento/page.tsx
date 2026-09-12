import { FechamentoForm } from "@/components/fechamento/fechamento-form";
import { ShellStatus } from "@/components/shell/shell-status";
import { actorCan } from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string }>;
}) {
  const { loja } = await searchParams;
  const workspace = await loadWorkspace(loja);
  const { actor, lojas, lojaId, filtro, snap, produtos, linhas } = workspace;
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "Loja";
  // QA-003: quem não pode enviar vê o quadro somente-leitura, sem ações nem auto-save
  const podeEnviar = actorCan(actor, "submit_fechamento") || actorCan(actor, "submit_correcao");

  return (
    <>
      <ShellStatus status={snap?.status ?? null} filtro={filtro} />
      {lojaId && snap ? (
        <FechamentoForm
          lojaId={lojaId}
          lojaNome={lojaNome}
          status={snap.status}
          linhasIniciais={linhas}
          produtos={produtos}
          exigeJustificativa={snap.exigeJustificativa}
          podeEnviar={podeEnviar}
        />
      ) : (
        <p className="text-[15px] text-steam">Esta conta autentica, mas não tem Vínculo com Loja. Peça ao Dono.</p>
      )}
    </>
  );
}
