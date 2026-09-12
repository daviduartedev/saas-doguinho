"use client";

import type { CSSProperties, ComponentProps } from "react";
import { createContext, useContext, useId, useMemo } from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<string, { label: string; color: string }>;

const ChartContext = createContext<{ config: ChartConfig }>({ config: {} });

export function useChart() {
  return useContext(ChartContext);
}

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: ComponentProps<typeof Recharts.ResponsiveContainer>["children"];
}) {
  const id = useId();
  const style = useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, item] of Object.entries(config)) {
      vars[`--color-${key}`] = item.color;
    }
    return vars as CSSProperties;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div data-chart={id} className={cn("h-full w-full", className)} style={style}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip(props: ComponentProps<typeof Recharts.Tooltip>) {
  return <Recharts.Tooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-sheet px-3 py-2 text-xs">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const meta = config[key];
          return (
            <li key={key} className="flex items-center justify-between gap-6 tabular text-steam">
              <span>{meta?.label ?? key}</span>
              <span className="font-semibold text-ink">{item.value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
