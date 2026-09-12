import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { desativarProdutoAction } from "@/doguinho/admin-actions";
import { rotuloStatus } from "@/doguinho/view";
import type { EstoqueView, Produto } from "@/doguinho/types";
import { SubmitButton } from "@/components/ui/submit-button";

export function EstoqueTabela({
  visao,
  produtos,
  podeGerir,
}: {
  visao: EstoqueView[];
  produtos: Produto[];
  podeGerir: boolean;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-ketchup text-white">
          <th className="listing-cell text-left font-semibold">Produto</th>
          <th className="listing-cell text-left font-semibold">Unidade</th>
          {visao.map((coluna) => {
            const status = rotuloStatus(coluna.status);
            return (
              <th key={coluna.loja.id} className="listing-cell text-center font-semibold">
                <span className="block">{coluna.loja.nome}</span>
                {status ? (
                  <span className="mt-1 inline-block rounded-full bg-mustard px-2.5 py-0.5 text-[11px] font-semibold text-ink">
                    {status}
                  </span>
                ) : null}
              </th>
            );
          })}
          {podeGerir ? <th className="px-5 py-3.5 text-center font-semibold">Ações</th> : null}
        </tr>
      </thead>
      <tbody className="bg-sheet">
        {produtos.map((produto) => (
          <tr key={produto.id} className="border-b border-border last:border-0">
            <td className="listing-cell font-semibold text-ink">{produto.nome}</td>
            <td className="listing-cell text-steam">{produto.unidade}</td>
            {visao.map((coluna) => {
              const valor = coluna.valores[produto.id];
              return (
                <td key={coluna.loja.id} className="listing-cell tabular text-center text-base font-semibold text-ink">
                  {valor === null || valor === undefined ? "" : valor}
                </td>
              );
            })}
            {podeGerir ? (
              <td className="listing-cell">
                <div className="flex items-center justify-center gap-3 text-steam">
                  <Link
                    href="/produtos"
                    aria-label={`Editar ${produto.nome}`}
                    className="hover:text-ketchup"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={desativarProdutoAction}>
                    <input type="hidden" name="id" value={produto.id} />
                    <SubmitButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-steam hover:text-ketchup"
                      aria-label={`Desativar ${produto.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </div>
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
