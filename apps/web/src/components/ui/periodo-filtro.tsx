"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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
      <div className="flex flex-wrap overflow-hidden rounded-md border border-border">
        {PRESETS.map((item) => (
          <button
            key={item.preset}
            type="button"
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
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-steam">
            De
            <Input
              type="date"
              value={periodo.from}
              onChange={(event) => escolherCustom(event.target.value, periodo.to)}
              className="h-9 w-auto text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-steam">
            Até
            <Input
              type="date"
              value={periodo.to}
              onChange={(event) => escolherCustom(periodo.from, event.target.value)}
              className="h-9 w-auto text-sm"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
