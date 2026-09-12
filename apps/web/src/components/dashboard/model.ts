import type { HistoryRow, Loja, Produto } from "@/doguinho/types";
import { FILTRO_TODAS } from "@/doguinho/workspace-filtro";

export type DayPoint = {
  day: string;
  calendarDay: string;
  entradas: number;
  saidas: number;
};

export type DashboardModel = {
  filtroNome: string;
  todas: boolean;
  ilustrativo: boolean;
  series: DayPoint[];
  totais: { entradas: number; saidas: number; liquido: number; lojas: number; produtos: number };
};

type LojaHistorico = { loja: Loja; rows: HistoryRow[] };

export function buildDashboardModel(input: {
  filtro: string;
  lojas: Loja[];
  produtos: Produto[];
  historicos: LojaHistorico[];
}): DashboardModel {
  const filtroNome =
    input.filtro === FILTRO_TODAS
      ? "Todas as Lojas"
      : (input.lojas.find((loja) => loja.id === input.filtro)?.nome ?? "Todas as Lojas");
  const derived = deriveFromHistory(input);
  const ilustrativo = derived.daysWithMovement < 4;
  const series = ilustrativo ? stubSeries(input) : derived.series;
  const produtos = input.produtos.filter((produto) => produto.ativo).length;
  const entradas = series.reduce((sum, point) => sum + point.entradas, 0);
  const saidas = series.reduce((sum, point) => sum + point.saidas, 0);

  return {
    filtroNome,
    todas: input.filtro === FILTRO_TODAS,
    ilustrativo,
    series,
    totais: {
      entradas,
      saidas,
      liquido: entradas - saidas,
      lojas: input.filtro === FILTRO_TODAS ? input.lojas.length : 1,
      produtos,
    },
  };
}

function deriveFromHistory(input: { filtro: string; historicos: LojaHistorico[] }) {
  const dayMap = new Map<string, DayPoint>();

  for (const { loja, rows } of input.historicos) {
    if (input.filtro !== FILTRO_TODAS && loja.id !== input.filtro) continue;
    for (const row of rows) {
      for (const linha of row.submission.linhas) {
        if (linha.anterior === null) continue;
        const delta = linha.nova - linha.anterior;
        if (delta === 0) continue;
        const day = row.submission.calendarDay;
        const existing = dayMap.get(day) ?? {
          day: labelDay(day),
          calendarDay: day,
          entradas: 0,
          saidas: 0,
        };
        existing.entradas += delta > 0 ? delta : 0;
        existing.saidas += delta < 0 ? -delta : 0;
        dayMap.set(day, existing);
      }
    }
  }

  const series = [...dayMap.values()].sort((a, b) => a.calendarDay.localeCompare(b.calendarDay));
  return { daysWithMovement: series.length, series };
}

function stubSeries(input: { filtro: string; lojas: Loja[] }) {
  const scoped =
    input.filtro === FILTRO_TODAS
      ? input.lojas
      : input.lojas.filter((loja) => loja.id === input.filtro);
  return lastDays(30).map((calendarDay, index) => {
    let entradas = 0;
    let saidas = 0;
    for (const loja of scoped) {
      const seed = hash(loja.id);
      entradas += 6 + ((seed + index * 13) % 18);
      saidas += 8 + ((seed + index * 7) % 22);
    }
    return { day: labelDay(calendarDay), calendarDay, entradas, saidas };
  });
}

function labelDay(calendarDay: string) {
  const [, month, day] = calendarDay.split("-");
  return `${day}/${month}`;
}

function lastDays(count: number) {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    days.push(date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }));
  }
  return days;
}

function hash(value: string) {
  let total = 0;
  for (const char of value) total = (total * 31 + char.charCodeAt(0)) >>> 0;
  return total;
}
