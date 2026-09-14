"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Periodo, PeriodoPreset } from "@/doguinho/periodo";
import { DateField } from "@/components/ui/date-field";

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
          <DateField
            label="De"
            value={periodo.from}
            onChange={(de) => escolherCustom(de, periodo.to)}
          />
          <DateField
            label="Até"
            value={periodo.to}
            onChange={(ate) => escolherCustom(periodo.from, ate)}
          />
        </div>
      ) : null}
    </div>
  );
}
