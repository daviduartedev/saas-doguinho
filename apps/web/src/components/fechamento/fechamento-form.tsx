"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { enviarFechamentoAction, salvarRascunhoAction } from "@/doguinho/fechamento-actions";
import type { FechamentoStatus, Produto, QuantidadeLinha, UnidadeMedida } from "@/doguinho/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
}: {
  lojaId: string;
  lojaNome: string;
  status: FechamentoStatus;
  linhasIniciais: QuantidadeLinha[];
  produtos: Produto[];
  exigeJustificativa: boolean;
}) {
  const ativos = produtos.filter((produto) => produto.ativo);
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [justificativa, setJustificativa] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const precisaCorrecao = exigeJustificativa;
  const skipAutosave = useRef(true);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      const data = new FormData();
      data.set("lojaId", lojaId);
      data.set("linhas", JSON.stringify(linhas));
      void salvarRascunhoAction(data);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [linhas, lojaId]);

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
    <div className="mx-auto max-w-xl">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-steam">Encerramento</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-ink text-balance">
          Fechamento · {lojaNome}
        </h1>
        <p className="mt-2 max-w-md text-sm text-steam">
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

      {status === "nunca_fechou" ? (
        <p className="mb-4 rounded-md border border-border bg-sheet px-3 py-2 text-sm">
          Esta Loja ainda não tem Estoque oficial — não inventamos zero.
        </p>
      ) : null}

      {status === "rascunho" ? (
        <p className="mb-4 rounded-md border border-mustard bg-sheet px-3 py-2 text-sm">
          Rascunho na Loja. Ainda não é Estoque.
        </p>
      ) : null}

      <ol className="space-y-2">
        {ativos.map((produto) => (
          <LinhaProduto
            key={produto.id}
            produto={produto}
            valor={linhas.find((linha) => linha.produtoId === produto.id)?.restante ?? null}
            onChange={(raw) => setRestante(produto.id, raw)}
          />
        ))}
      </ol>

      {precisaCorrecao ? (
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

      <div className="sticky bottom-16 mt-5 flex gap-2 bg-paper py-3 md:bottom-0">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={pending || ativos.length === 0}
          onClick={() =>
            start(async () => {
              await salvarRascunhoAction(payload());
            })
          }
        >
          Guardar rascunho
        </Button>
        <Button
          type="button"
          className="flex-[2]"
          disabled={pending || ativos.length === 0}
          onClick={() =>
            start(async () => {
              const result = await enviarFechamentoAction(payload());
              setErro(result.ok ? null : result.erro);
              setOk(result.ok);
            })
          }
        >
          {precisaCorrecao ? "Enviar correção" : "Enviar fechamento"}
        </Button>
      </div>
    </div>
  );
}

function LinhaProduto({
  produto,
  valor,
  onChange,
}: {
  produto: Produto;
  valor: number | null;
  onChange: (raw: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-sheet px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{produto.nome}</p>
        <p className="text-xs text-steam">{produto.unidade}</p>
      </div>
      <Input
        type="text"
        inputMode={teclado(produto.unidade)}
        value={valor ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`Quantidade restante de ${produto.nome}`}
        className="tabular h-12 w-28 text-right text-lg font-semibold"
        placeholder="—"
      />
    </li>
  );
}
