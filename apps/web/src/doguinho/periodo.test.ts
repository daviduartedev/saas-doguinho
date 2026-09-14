import { describe, expect, it } from "vitest";
import { parsePeriodo, sliceSeries } from "./periodo";

const HOJE = "2026-09-13";

describe("parsePeriodo", () => {
  it("defaults to 7 days when search is empty", () => {
    expect(parsePeriodo({}, HOJE)).toEqual({
      from: "2026-09-07",
      to: "2026-09-13",
      preset: "7",
    });
  });

  it("parses hoje", () => {
    expect(parsePeriodo({ periodo: "hoje" }, HOJE)).toEqual({
      from: "2026-09-13",
      to: "2026-09-13",
      preset: "hoje",
    });
  });

  it("parses 30 days", () => {
    expect(parsePeriodo({ periodo: "30" }, HOJE)).toEqual({
      from: "2026-08-15",
      to: "2026-09-13",
      preset: "30",
    });
  });

  it("parses custom de and ate", () => {
    expect(parsePeriodo({ de: "2026-09-01", ate: "2026-09-10" }, HOJE)).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
      preset: "custom",
    });
  });

  it("swaps inverted custom dates", () => {
    expect(parsePeriodo({ de: "2026-09-10", ate: "2026-09-01" }, HOJE)).toEqual({
      from: "2026-09-01",
      to: "2026-09-10",
      preset: "custom",
    });
  });

  it("falls back to 7 days on invalid custom date", () => {
    expect(parsePeriodo({ de: "nope" }, HOJE)).toEqual({
      from: "2026-09-07",
      to: "2026-09-13",
      preset: "7",
    });
  });
});

describe("sliceSeries", () => {
  const series = [
    { calendarDay: "2026-09-05", value: 1 },
    { calendarDay: "2026-09-10", value: 2 },
    { calendarDay: "2026-09-15", value: 3 },
  ];

  it("keeps points inside the period", () => {
    const periodo = parsePeriodo({ de: "2026-09-07", ate: "2026-09-13" }, HOJE);
    expect(sliceSeries(series, periodo)).toEqual([{ calendarDay: "2026-09-10", value: 2 }]);
  });
});
