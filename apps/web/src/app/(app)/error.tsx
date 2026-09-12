"use client";

import Link from "next/link";

/**
 * Error boundary do grupo (app) — QA-004.
 * Erros de domínio (AppError) chegam com a mensagem em dev; em produção o Next
 * entrega mensagem genérica + digest. Nos dois casos o usuário vê uma saída
 * amigável em vez da página branca "Application error".
 */
export default function AppGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <h1 className="font-display text-3xl font-bold text-ink text-balance">Não deu para concluir</h1>
      <p role="alert" className="rounded-md border border-border bg-sheet px-3 py-2 text-sm text-ketchup">
        {error.message || "Erro inesperado."}
      </p>
      {error.digest ? <p className="text-xs text-steam">Código do erro: {error.digest}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-ketchup px-4 py-2 text-sm font-semibold text-white"
        >
          Tentar de novo
        </button>
        <Link href="/fechamento" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-ink">
          Voltar ao Fechamento
        </Link>
      </div>
    </div>
  );
}
