import type { Clock } from "./types";

export const TIME_ZONE = "America/Sao_Paulo";

/** Calendar day in America/Sao_Paulo (working default). */
export function calendarDay(clock: Clock): string {
  return clock.now().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

export function isoNow(clock: Clock): string {
  return clock.now().toISOString();
}

export function saoPauloClock(fixed?: Date): Clock {
  return { now: () => fixed ?? new Date() };
}
