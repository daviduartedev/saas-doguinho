import { describe, expect, it } from "vitest";
import { addCalendarDays, calendarDay } from "./clock";

describe("addCalendarDays", () => {
  it("recua 29 dias civis a partir de 2026-09-10", () => {
    expect(addCalendarDays("2026-09-10", -29)).toBe("2026-08-12");
  });

  it("calendarDay do clock de teste casa com o dia fixo em São Paulo", () => {
    expect(calendarDay({ now: () => new Date("2026-09-10T21:00:00-03:00") })).toBe("2026-09-10");
  });
});
