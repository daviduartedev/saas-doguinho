import { NextResponse } from "next/server";
import {
  montarPdfFechamento,
  montarPlanilhaFechamento,
  montarXlsxFechamento,
  nomeArquivoFechamento,
  type FechamentoExportSecao,
} from "@/doguinho/fechamento-export";
import { getApp } from "@/doguinho/runtime";
import { actorDaSessao } from "@/doguinho/sessao";
import type { Actor, Loja } from "@/doguinho/types";
import { linhasOficiaisDoDia } from "@/doguinho/view";
import { FILTRO_TODAS, resolveLojaFiltro } from "@/doguinho/workspace-filtro";
import type { DoguinhoApp } from "@/doguinho/app";

export const dynamic = "force-dynamic";

async function secaoDaLoja(app: DoguinhoApp, actor: Actor, loja: Loja): Promise<FechamentoExportSecao> {
  const estado = await app.estadoDaLoja(actor, loja.id);
  const envios = await app.enviosDoDia(actor, { lojaId: loja.id });
  return {
    lojaNome: loja.nome,
    produtos: estado.produtos,
    linhas: linhasOficiaisDoDia(estado.snap, estado.produtos),
    envios: envios.map((row) => ({
      tipo: row.submission.tipo,
      usuarioNome: row.usuarioNome,
      justificativa: row.submission.justificativa,
      produtoNomes: row.produtoNomes,
      linhas: row.submission.linhas,
    })),
  };
}

export async function GET(request: Request) {
  const actor = await actorDaSessao();
  if (!actor) {
    return new NextResponse("Sessão expirada.", { status: 401 });
  }
  // ASVS 8.2.1 / 8.3.1: export is Dono-only, enforced on the server
  if (!actor.isDono) {
    return new NextResponse("Sem autorização.", { status: 403 });
  }

  const url = new URL(request.url);
  const formato = url.searchParams.get("formato");
  // ASVS 2.2.1: allowlist the file format
  if (formato !== "xlsx" && formato !== "pdf") {
    return new NextResponse("Formato inválido.", { status: 400 });
  }

  const app = await getApp();
  const lojas = await app.listarLojas(actor);
  const filtro = resolveLojaFiltro(
    url.searchParams.get("loja") ?? undefined,
    lojas.map((loja) => loja.id),
  );
  const recorte = filtro === FILTRO_TODAS ? lojas : lojas.filter((loja) => loja.id === filtro);
  const secoes = await Promise.all(recorte.map((loja) => secaoDaLoja(app, actor, loja)));
  const planilha = montarPlanilhaFechamento(secoes);
  const arquivo =
    formato === "xlsx" ? montarXlsxFechamento(planilha) : montarPdfFechamento(planilha);
  const nome =
    filtro === FILTRO_TODAS
      ? nomeArquivoFechamento(formato, "todas")
      : nomeArquivoFechamento(formato, recorte[0]?.nome ?? "todas");
  const tipo =
    formato === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/pdf";

  // ASVS 5.4.1 / 5.4.2 / 3.2.1: attachment download, declared type, no sniffing
  return new NextResponse(new Uint8Array(arquivo), {
    status: 200,
    headers: {
      "Content-Type": tipo,
      "Content-Disposition": `attachment; filename="${nome}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
