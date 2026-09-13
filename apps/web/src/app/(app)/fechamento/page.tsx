import { FechamentoForm } from "@/components/fechamento/fechamento-form";
import { FechamentoRelatorio } from "@/components/fechamento/fechamento-relatorio";
import { ShellStatus } from "@/components/shell/shell-status";
import type { DoguinhoApp } from "@/doguinho/app";
import type { Actor, Loja } from "@/doguinho/types";
import {
  actorCan,
  fechamentoEhFormulario,
  linhasOficiaisDoDia,
  statusRelatorioDono,
} from "@/doguinho/view";
import { FILTRO_TODAS, loadWorkspace } from "@/doguinho/workspace";

export const dynamic = "force-dynamic";

async function relatorioDaLoja(app: DoguinhoApp, actor: Actor, loja: Loja) {
  const estado = await app.estadoDaLoja(actor, loja.id);
  const envios = await app.enviosDoDia(actor, { lojaId: loja.id });
  return {
    lojaId: loja.id,
    lojaNome: loja.nome,
    produtos: estado.produtos,
    linhas: linhasOficiaisDoDia(estado.snap, estado.produtos),
    envios,
  };
}

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
  const todas = !formulario && filtro === FILTRO_TODAS && lojas.length > 0;
  const secoes = todas
    ? await Promise.all(lojas.map((item) => relatorioDaLoja(app, actor, item)))
    : [];
  const envios =
    lojaId && !formulario && !todas ? await app.enviosDoDia(actor, { lojaId }) : [];
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
      {todas ? (
        <div className="w-full space-y-12">
          <header>
            <h1 className="font-display text-3xl font-bold text-ink text-balance">Fechamento</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-steam">
              Quantidade restante do último envio de hoje em cada Loja. Rascunho não entra.
            </p>
          </header>
          {secoes.map((secao) => (
            <FechamentoRelatorio
              key={secao.lojaId}
              lojaId={secao.lojaId}
              lojaNome={secao.lojaNome}
              produtos={secao.produtos}
              linhas={secao.linhas}
              envios={secao.envios}
              page={page}
              per={per}
              lojaFiltro={FILTRO_TODAS}
              tituloTag="h2"
              intro={false}
            />
          ))}
        </div>
      ) : lojaId && snap ? (
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
