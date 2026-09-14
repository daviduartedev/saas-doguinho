import type { Clock } from "./types";

export const TIME_ZONE = "America/Sao_Paulo";

/** Calendar day in America/Sao_Paulo (working default). */
export function calendarDay(clock: Clock): string {
  return clock.now().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export function isoNow(clock: Clock): string {
  return clock.now().toISOString();
}

/** Civil YYYY-MM-DD arithmetic. Avoids DST drift from adding milliseconds. */
export function addCalendarDays(day: string, delta: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, date! + delta)).toISOString().slice(0, 10);
}

export function saoPauloClock(fixed?: Date): Clock {
  return { now: () => fixed ?? new Date() };
}
