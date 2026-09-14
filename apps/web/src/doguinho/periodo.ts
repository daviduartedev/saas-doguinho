import { addCalendarDays } from "./clock";

export type PeriodoPreset = "hoje" | "7" | "30" | "custom";

export type Periodo = { from: string; to: string; preset: PeriodoPreset };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDay(day: string): boolean {
  if (!DATE_RE.test(day)) return false;
  const [year, month, date] = day.split("-").map(Number);
  const probe = new Date(Date.UTC(year!, month! - 1, date!));
  return probe.toISOString().slice(0, 10) === day;
}

function defaultPeriodo(hoje: string): Periodo {
  return {
    from: addCalendarDays(hoje, -6),
    to: hoje,
    preset: "7",
  };
}

export function parsePeriodo(
  search: { periodo?: string; de?: string; ate?: string },
  hoje: string,
): Periodo {
  const de = search.de?.trim();
  const ate = search.ate?.trim();
  if (de && ate && isValidCalendarDay(de) && isValidCalendarDay(ate)) {
    const [from, to] = de <= ate ? [de, ate] : [ate, de];
    return { from, to, preset: "custom" };
  }

  const preset = search.periodo?.trim();
  if (preset === "hoje") return { from: hoje, to: hoje, preset: "hoje" };
  if (preset === "30") {
    return { from: addCalendarDays(hoje, -29), to: hoje, preset: "30" };
  }
  if (preset === "7" || !preset || preset === "custom") return defaultPeriodo(hoje);
  return defaultPeriodo(hoje);
}

export function sliceSeries<T extends { calendarDay: string }>(series: T[], periodo: Periodo): T[] {
  return series.filter(
    (point) => point.calendarDay >= periodo.from && point.calendarDay <= periodo.to,
  );
}

export function periodoQueryParams(periodo: Periodo): Record<string, string | undefined> {
  if (periodo.preset === "custom") {
    return { periodo: "custom", de: periodo.from, ate: periodo.to };
  }
  return { periodo: periodo.preset };
}

export function periodoRecorteLabel(periodo: Periodo): string {
  if (periodo.preset === "hoje") return "Total no recorte de hoje";
  if (periodo.preset === "7") return "Total no recorte de 7 dias";
  if (periodo.preset === "30") return "Total no recorte de 30 dias";
  return `Total de ${formatDay(periodo.from)} a ${formatDay(periodo.to)}`;
}

function formatDay(calendarDay: string) {
  const [, month, day] = calendarDay.split("-");
  return `${day}/${month}`;
}
