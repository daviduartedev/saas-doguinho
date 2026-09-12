"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { enviarFechamentoAction, salvarRascunhoAction } from "@/doguinho/fechamento-actions";
import type { FechamentoStatus, Produto, QuantidadeLinha, UnidadeMedida } from "@/doguinho/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClientPager } from "@/components/ui/pager";
import { LISTING_PAGE_SIZE } from "@/lib/pagination";

function teclado(unidade: UnidadeMedida) {
  return unidade === "unidade" || unidade === "pacote" ? "numeric" : "decimal";
}

export function FechamentoForm({
  lojaId,
  lojaNome,
  status,
  linhasIniciais,
  produtos,
  exigeJustificativa,
  podeEnviar,
}: {
  lojaId: string;
  lojaNome: string;
  status: FechamentoStatus;
  linhasIniciais: QuantidadeLinha[];
  produtos: Produto[];
  exigeJustificativa: boolean;
  podeEnviar: boolean;
}) {
  const ativos = produtos.filter((produto) => produto.ativo);
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(ativos.length / LISTING_PAGE_SIZE) || 1);
  const safePage = Math.min(page, totalPages);
  const pageItems = ativos.slice((safePage - 1) * LISTING_PAGE_SIZE, safePage * LISTING_PAGE_SIZE);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const precisaCorrecao = exigeJustificativa;
  const skipAutosave = useRef(true);

  useEffect(() => {
    if (!podeEnviar) return; // somente-leitura: sem auto-save (QA-003)
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const data = new FormData();
      data.set("lojaId", lojaId);
      data.set("linhas", JSON.stringify(linhas));
      // auto-save é silencioso por design, mas nunca pode virar rejeição não tratada (QA-005/006)
      void salvarRascunhoAction(data).catch(() => {});
    }, 600);
    return () => window.clearTimeout(timer);
  }, [linhas, lojaId, podeEnviar]);

  function setRestante(produtoId: string, raw: string) {
    const restante = raw === "" ? null : Number(raw.replace(",", "."));
    setLinhas((atual) =>
      atual.map((linha) =>
        linha.produtoId === produtoId
          ? { ...linha, restante: Number.isNaN(restante as number) ? null : restante }
          : linha,
      ),
    );
  }

  function payload() {
    const data = new FormData();
    data.set("lojaId", lojaId);
    data.set("linhas", JSON.stringify(linhas));
    data.set("justificativa", justificativa);
    return data;
  }

  return (
    <div className="w-full">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-bold text-ink text-balance">
          Fechamento · {lojaNome}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] text-steam">
          Informe a quantidade restante de cada Produto ativo. Isso vira o Estoque oficial da Loja.
        </p>
      </header>

      {ativos.length === 0 ? (
        <p className="rounded-md border border-border bg-sheet px-3 py-2 text-sm">
          Não há Produtos ativos. O Dono precisa cadastrar o catálogo antes do Fechamento.
        </p>
      ) : null}

      {precisaCorrecao ? (
        <p className="mb-4 rounded-md bg-ketchup px-3 py-2 text-sm font-medium text-white">
          Já houve Fechamento hoje. Um novo envio é Correção e exige Justificativa. O registro anterior permanece.
        </p>
      ) : null}

      {status === "rascunho" ? (
        <p className="mb-4 rounded-md border border-mustard bg-sheet px-3 py-2 text-sm">
          Rascunho na Loja. Ainda não é Estoque.
        </p>
      ) : null}

      <div className="listing-frame">
      <table className="listing-stack w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ketchup text-white">
            <th className="listing-cell text-left font-semibold">Produto</th>
            <th className="listing-cell text-left font-semibold">Unidade</th>
            <th className="listing-cell text-right font-semibold">Quantidade restante</th>
          </tr>
        </thead>
        <tbody className="bg-sheet">
          {pageItems.map((produto) => (
            <LinhaProduto
              key={produto.id}
              produto={produto}
              valor={linhas.find((linha) => linha.produtoId === produto.id)?.restante ?? null}
              onChange={(raw) => setRestante(produto.id, raw)}
              disabled={!podeEnviar}
            />
          ))}
        </tbody>
      </table>
      </div>
      <ClientPager
        page={safePage}
        totalPages={totalPages}
        total={ativos.length}
        size={LISTING_PAGE_SIZE}
        onPage={setPage}
      />

      {precisaCorrecao && podeEnviar ? (
        <div className="mt-4">
          <Label htmlFor="justificativa">Justificativa</Label>
          <textarea
            id="justificativa"
            value={justificativa}
            onChange={(event) => setJustificativa(event.target.value)}
            className="mt-1 min-h-24 w-full rounded-md border border-border bg-[var(--control)] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ketchup"
            placeholder="Por que o número mudou?"
          />
        </div>
      ) : null}

      {erro ? <p className="mt-3 text-sm font-medium text-ketchup">{erro}</p> : null}
      {ok ? <p className="mt-3 text-sm font-medium text-ink">Enviado. Isso é o Estoque agora.</p> : null}

      {podeEnviar ? (
        <div className="sticky bottom-[var(--nav-end)] mt-5 flex flex-wrap justify-end gap-2 bg-paper py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            pending={pending}
            disabled={pending || ativos.length === 0}
            onClick={() =>
              start(async () => {
                try {
                  await salvarRascunhoAction(payload());
                } catch {
                  setErro("Não foi possível guardar o Rascunho. Verifique sua conexão e tente novamente.");
                  setOk(false);
                }
              })
            }
          >
            Guardar rascunho
          </Button>
          <Button
            type="button"
            size="sm"
            pending={pending}
            disabled={pending || ativos.length === 0}
            onClick={() =>
              start(async () => {
                try {
                  const result = await enviarFechamentoAction(payload());
                  setErro(result.ok ? null : result.erro);
                  setOk(result.ok);
                } catch {
                  // rede caiu ou sessão expirou no meio do envio (middleware redireciona o POST) — QA-005/QA-006
                  setErro("Não foi possível enviar. Verifique sua conexão; se persistir, entre novamente.");
                  setOk(false);
                }
              })
            }
          >
            {precisaCorrecao ? "Enviar correção" : "Enviar fechamento"}
          </Button>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-border bg-sheet px-3 py-2 text-sm text-steam">
          Seu Perfil não envia Fechamento nem Correção nesta Loja. O quadro acima é somente leitura.
        </p>
      )}
    </div>
  );
}

function LinhaProduto({
  produto,
  valor,
  onChange,
  disabled = false,
}: {
  produto: Produto;
  valor: number | null;
  onChange: (raw: string) => void;
  disabled?: boolean;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="listing-cell font-semibold text-ink" data-label="Produto">{produto.nome}</td>
      <td className="listing-cell text-steam" data-label="Unidade">{produto.unidade}</td>
      <td className="listing-cell text-right" data-label="Quantidade restante">
        <Input
          type="text"
          inputMode={teclado(produto.unidade)}
          value={valor ?? ""}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Quantidade restante de ${produto.nome}`}
          className="tabular ml-auto h-12 w-full max-w-[8rem] text-right text-lg font-semibold"
          placeholder=""
          disabled={disabled}
        />
      </td>
    </tr>
  );
}
