import type { Logger } from "./types";

export function silentLogger(): Logger {
  return { security: () => undefined };
}

export function capturingLogger() {
  const events: Parameters<Logger["security"]>[0][] = [];
  return {
    events,
    logger: { security: (event: (typeof events)[number]) => events.push(event) } satisfies Logger,
  };
}
