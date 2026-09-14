export const LISTING_PAGE_SIZE = 8;
export const HISTORICO_PAGE_SIZE = 5;
export const LISTING_PAGE_SIZES = [8, 16, 24] as const;

/** ASVS 5.1.1: treat `page` as an untrusted query integer and clamp it. */
export function parseListingPage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

/** ASVS 5.1.1: allow only the listed page sizes. */
export function parseListingSize(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? String(LISTING_PAGE_SIZE), 10);
  return (LISTING_PAGE_SIZES as readonly number[]).includes(n) ? n : LISTING_PAGE_SIZE;
}

export function paginate<T>(
  items: T[],
  rawPage: string | undefined,
  rawPer?: string,
) {
  const size = parseListingSize(rawPer);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size) || 1);
  const page = Math.min(parseListingPage(rawPage), totalPages);
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    totalPages,
    total,
    size,
    from: total === 0 ? 0 : start + 1,
    to: start + Math.min(size, total - start),
  };
}

/** ASVS 5.1.1: cap free-text listing filters. */
export function parseListingQuery(raw: string | undefined): string {
  return (raw ?? "").trim().slice(0, 80);
}
