"use client";

import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Periodo, PeriodoPreset } from "@/doguinho/periodo";

const PRESETS: Array<{ preset: PeriodoPreset; label: string }> = [
  { preset: "hoje", label: "Hoje" },
  { preset: "7", label: "7 dias" },
  { preset: "30", label: "30 dias" },
  { preset: "custom", label: "Personalizado" },
];

function buildHref(
  pathname: string,
  params: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function PeriodoFiltro({
  periodo,
  pathname,
  params,
}: {
  periodo: Periodo;
  pathname: string;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();

  function escolherPreset(preset: PeriodoPreset) {
    if (preset === "custom") {
      router.push(
        buildHref(pathname, params, {
          periodo: "custom",
          de: periodo.from,
          ate: periodo.to,
          page: undefined,
        }),
      );
      return;
    }
    router.push(
      buildHref(pathname, params, {
        periodo: preset,
        de: undefined,
        ate: undefined,
        page: undefined,
      }),
    );
  }

  function escolherCustom(de: string, ate: string) {
    if (!de || !ate) return;
    router.push(
      buildHref(pathname, params, {
        periodo: "custom",
        de,
        ate,
        page: undefined,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit overflow-hidden rounded-md border border-border">
        {PRESETS.map((item) => (
          <button
            key={item.preset}
            type="button"
            aria-pressed={periodo.preset === item.preset}
            onClick={() => escolherPreset(item.preset)}
            className={cn(
              "h-9 px-3 text-xs font-semibold",
              periodo.preset === item.preset
                ? "bg-ketchup text-white"
                : "bg-sheet text-steam hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {periodo.preset === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <DatePickerInput
            label="De"
            value={periodo.from ? dayjs(periodo.from, "YYYY-MM-DD").toDate() : null}
            onChange={(date) => {
              if (date) escolherCustom(dayjs(date).format("YYYY-MM-DD"), periodo.to);
            }}
            valueFormat="YYYY-MM-DD"
            size="sm"
            className="w-auto"
          />
          <DatePickerInput
            label="Até"
            value={periodo.to ? dayjs(periodo.to, "YYYY-MM-DD").toDate() : null}
            onChange={(date) => {
              if (date) escolherCustom(periodo.from, dayjs(date).format("YYYY-MM-DD"));
            }}
            valueFormat="YYYY-MM-DD"
            size="sm"
            className="w-auto"
          />
        </div>
      ) : null}
    </div>
  );
}
