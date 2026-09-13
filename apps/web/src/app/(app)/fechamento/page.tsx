import { FechamentoForm } from "@/components/fechamento/fechamento-form";
import { FechamentoRelatorio } from "@/components/fechamento/fechamento-relatorio";
import { ShellStatus } from "@/components/shell/shell-status";
import {
  actorCan,
  fechamentoEhFormulario,
  linhasOficiaisDoDia,
  statusRelatorioDono,
} from "@/doguinho/view";
import { loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; per?: string }>;
}) {
  const { loja, page, per } = await searchParams;
  const workspace = await loadWorkspace(loja);
  const { actor, lojas, lojaId, filtro, snap, produtos, linhas, app } = workspace;
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "Loja";
  const formulario = fechamentoEhFormulario(actor);
  const envios =
    lojaId && !formulario ? await app.enviosDoDia(actor, { lojaId }) : [];
  // QA-003: quem não pode enviar vê o quadro somente-leitura, sem ações nem auto-save
  const podeEnviar =
    formulario &&
    (actorCan(actor, "submit_fechamento") || actorCan(actor, "submit_correcao"));
  const statusChip = formulario
    ? (snap?.status ?? null)
    : snap
      ? statusRelatorioDono(snap)
      : null;

  return (
    <>
      <ShellStatus status={statusChip} filtro={filtro} />
      {lojaId && snap ? (
        formulario ? (
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
          <FechamentoRelatorio
            lojaId={lojaId}
            lojaNome={lojaNome}
            produtos={produtos}
            linhas={linhasOficiaisDoDia(snap, produtos)}
            envios={envios}
            page={page}
            per={per}
          />
        )
      ) : (
        <p className="text-[15px] text-steam">Esta conta autentica, mas não tem Vínculo com Loja. Peça ao Dono.</p>
      )}
    </>
  );
}
