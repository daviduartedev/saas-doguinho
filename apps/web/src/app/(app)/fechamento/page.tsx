import { FechamentoExportAcoes } from "@/components/fechamento/fechamento-export-acoes";
import { FechamentoForm } from "@/components/fechamento/fechamento-form";
import { FechamentoRelatorio } from "@/components/fechamento/fechamento-relatorio";
import { ShellStatus } from "@/components/shell/shell-status";
import {
  actorCan,
  fechamentoEhFormulario,
  linhasOficiaisDoDia,
  relatorioIncluiTimeline,
  statusRelatorioDono,
} from "@/doguinho/view";
import { FILTRO_TODAS, assembleWorkspace, loadChrome } from "@/doguinho/workspace";
import { resolveLojaFiltro } from "@/doguinho/workspace-filtro";

export const dynamic = "force-dynamic";

export default async function FechamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ loja?: string; page?: string; per?: string }>;
}) {
  const { loja, page, per } = await searchParams;
  const { actor, app, lojas } = await loadChrome();
  const filtro = resolveLojaFiltro(
    loja,
    lojas.map((item) => item.id),
  );
  const formulario = fechamentoEhFormulario(actor);
  const todas = !formulario && !relatorioIncluiTimeline(filtro) && lojas.length > 0;

  if (todas) {
    const secoes = await app.relatoriosDoDia(actor);
    return (
      <>
        <ShellStatus status={null} filtro={filtro} />
        <div className="w-full space-y-12">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-ink text-balance">Fechamento</h1>
              <p className="mt-2 max-w-2xl text-[15px] text-steam">
                Quantidade restante do último envio de hoje em cada Loja. Rascunho não entra.
              </p>
            </div>
            <FechamentoExportAcoes loja={FILTRO_TODAS} />
          </header>
          {secoes.map((secao) => (
            <FechamentoRelatorio
              key={secao.loja.id}
              lojaId={secao.loja.id}
              lojaNome={secao.loja.nome}
              produtos={secao.produtos}
              linhas={secao.linhas}
              envios={[]}
              mostrarTimeline={false}
              page={page}
              per={per}
              lojaFiltro={FILTRO_TODAS}
              tituloTag="h2"
              intro={false}
            />
          ))}
        </div>
      </>
    );
  }

  const workspace = await assembleWorkspace(app, actor, lojas, loja, {
    produtos: true,
    lojaState: true,
  });
  const { lojaId, snap, produtos, linhas } = workspace;
  const lojaNome = lojas.find((item) => item.id === lojaId)?.nome ?? "Loja";
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
