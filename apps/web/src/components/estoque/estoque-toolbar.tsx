import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

export function EstoqueToolbar({
  lojaId,
  query,
  podeGerir,
}: {
  lojaId: string;
  query: string;
  podeGerir: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form action="/estoque" method="get" className="relative">
        <input type="hidden" name="loja" value={lojaId} />
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steam" />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Buscar produto..."
          className="h-10 w-full bg-sheet pl-9 sm:w-[16rem]"
        />
      </form>
      {podeGerir ? (
        <Link
          href={`/estoque?loja=${lojaId}&novo=1`}
          className="inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-ketchup hover:text-ketchup-hot"
        >
          <Plus className="h-4 w-4" />
          Adicionar produto
        </Link>
      ) : null}
    </div>
  );
}
