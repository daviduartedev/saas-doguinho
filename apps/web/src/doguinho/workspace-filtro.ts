export const FILTRO_TODAS = "todas";

export function resolveLojaFiltro(lojaParam: string | undefined, lojaIds: string[]): string {
  // ASVS 5.1.1: allowlist query param against known Loja ids
  if (!lojaParam || lojaParam === FILTRO_TODAS) return FILTRO_TODAS;
  return lojaIds.includes(lojaParam) ? lojaParam : FILTRO_TODAS;
}
