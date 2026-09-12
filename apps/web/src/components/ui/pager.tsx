"use client";

import { Pagination } from "@mantine/core";
import { useRouter } from "next/navigation";
import { LISTING_PAGE_SIZES } from "@/lib/pagination";

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>,
  patch: Record<string, string>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    query.set(key, value);
  }
  return `${pathname}?${query.toString()}`;
}

export function Pager({
  pathname,
  page,
  totalPages,
  params,
}: {
  pathname: string;
  page: number;
  totalPages: number;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  return (
    <ListingPager
      pathname={pathname}
      page={page}
      totalPages={totalPages}
      total={0}
      size={8}
      from={0}
      to={0}
      params={params}
      noun="itens"
      compact
    />
  );
}

export function ListingPager({
  pathname,
  page,
  totalPages,
  total,
  size,
  from,
  to,
  params,
  noun,
  compact = false,
}: {
  pathname: string;
  page: number;
  totalPages: number;
  total: number;
  size: number;
  from: number;
  to: number;
  params: Record<string, string | undefined>;
  noun: string;
  compact?: boolean;
}) {
  const router = useRouter();

  function go(next: number) {
    router.push(buildHref(pathname, params, { page: String(next) }));
  }

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      {compact ? null : (
        <p className="text-steam">
          Mostrando {from} a {to} de {total} {noun}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
        {compact ? null : (
          <label className="flex items-center gap-2 text-steam">
            <select
              value={size}
              aria-label="Itens por página"
              className="h-9 rounded-md border border-border bg-sheet px-2 text-sm text-ink"
              onChange={(event) => {
                const query = new URLSearchParams();
                for (const [key, value] of Object.entries(params)) {
                  if (value) query.set(key, value);
                }
                query.set("per", event.target.value);
                query.set("page", "1");
                router.push(`${pathname}?${query.toString()}`);
              }}
            >
              {LISTING_PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option} por página
                </option>
              ))}
            </select>
          </label>
        )}
        {totalPages > 1 ? <Pagination total={totalPages} value={page} onChange={go} /> : null}
      </div>
    </nav>
  );
}

export function ClientPager({
  page,
  totalPages,
  onPage,
  total,
  size,
  noun = "produtos",
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  total?: number;
  size?: number;
  noun?: string;
}) {
  const from = total !== undefined && size ? (total === 0 ? 0 : (page - 1) * size + 1) : null;
  const to = total !== undefined && size ? Math.min(page * size, total) : null;

  if (from === null && totalPages <= 1) return null;

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col gap-3 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      {from !== null && to !== null && total !== undefined ? (
        <p className="text-steam">
          Mostrando {from} a {to} de {total} {noun}
        </p>
      ) : null}
      {totalPages > 1 ? (
        <Pagination total={totalPages} value={page} onChange={onPage} className="sm:ml-auto" />
      ) : null}
    </nav>
  );
}
