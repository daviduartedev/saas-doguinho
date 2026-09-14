"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PeriodoFiltro } from "@/components/ui/periodo-filtro";
import { periodoRecorteLabel, sliceSeries, type Periodo } from "@/doguinho/periodo";
import type { DashboardModel, DayPoint } from "./model";

const chartConfig = {
  entradas: { label: "Entradas", color: "var(--mustard)" },
  saidas: { label: "Saídas", color: "var(--ketchup)" },
};

export function DashboardPanel({
  model,
  periodo,
  queryParams,
}: {
  model: DashboardModel;
  periodo: Periodo;
  queryParams: Record<string, string | undefined>;
}) {
  const series = useMemo(() => sliceSeries(model.series, periodo), [model.series, periodo]);
  const entradas = series.reduce((sum, point) => sum + point.entradas, 0);
  const saidas = series.reduce((sum, point) => sum + point.saidas, 0);
  const liquido = entradas - saidas;
  const trendIn = trend(series, "entradas");
  const trendOut = trend(series, "saidas");
  const trendNet = trend(series, "liquido");

  const kpis = [
    {
      title: "Entradas",
      value: entradas,
      trend: trendIn,
      lead: leadCopy(trendIn, "Subiu neste recorte", "Caiu neste recorte"),
      note: "Produto que voltou à prateleira",
    },
    {
      title: "Saídas",
      value: saidas,
      trend: trendOut,
      lead: leadCopy(trendOut, "Mais saída neste recorte", "Menos saída neste recorte"),
      note: "Produto que saiu da prateleira",
    },
    {
      title: "Líquido",
      value: liquido,
      trend: trendNet,
      lead: leadCopy(trendNet, "Prateleira aumentou", "Prateleira diminuiu"),
      note: "Entradas menos saídas",
    },
    {
      title: model.todas ? "Lojas" : "Produtos",
      value: model.todas ? model.totais.lojas : model.totais.produtos,
      trend: null,
      lead: model.filtroNome,
      note: "Recorte do filtro do header",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-ink">Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-steam">
          Entradas e saídas da prateleira. {model.filtroNome}.
        </p>
        {model.ilustrativo ? (
          <p className="mt-2 text-xs font-medium text-steam">Série ilustrativa. Pouco histórico de Fechamento.</p>
        ) : null}
      </header>

      <section className="kpi-grid">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader>
              <CardTitle>{kpi.title}</CardTitle>
              {kpi.trend !== null ? <TrendBadge value={kpi.trend} /> : null}
            </CardHeader>
            <CardContent>
              <p className="kpi-value font-display text-3xl font-bold tabular text-ink">{kpi.value}</p>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-1">
              <p className="font-medium text-ink">{kpi.lead}</p>
              <p className="text-xs text-steam">{kpi.note}</p>
            </CardFooter>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader className="flex-col items-stretch gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Entradas e saídas</h2>
            <p className="mt-1 text-sm text-steam">{periodoRecorteLabel(periodo)}</p>
          </div>
          <PeriodoFiltro periodo={periodo} pathname="/dashboard" params={queryParams} />
        </CardHeader>
        <CardContent className="min-w-0 pt-4">
          <ChartContainer config={chartConfig} className="h-[280px] w-full min-w-0">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-entradas)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-entradas)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-saidas)" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="var(--color-saidas)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: "var(--steam)", fontSize: 12 }}
              />
              <YAxis hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="natural"
                dataKey="entradas"
                stroke="var(--color-entradas)"
                fill="url(#fillEntradas)"
                strokeWidth={2}
              />
              <Area
                type="natural"
                dataKey="saidas"
                stroke="var(--color-saidas)"
                fill="url(#fillSaidas)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
          <ul className="mt-3 flex flex-wrap justify-end gap-4 text-xs text-steam">
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-mustard" />
              Entradas
            </li>
            <li className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-ketchup" />
              Saídas
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function trend(series: DayPoint[], key: "entradas" | "saidas" | "liquido") {
  if (series.length < 4) return null;
  const half = Math.floor(series.length / 2);
  const value = (point: DayPoint) =>
    key === "liquido" ? point.entradas - point.saidas : point[key];
  const prev = series.slice(0, half).reduce((sum, point) => sum + value(point), 0);
  const next = series.slice(half).reduce((sum, point) => sum + value(point), 0);
  if (prev === 0) return next === 0 ? 0 : 100;
  return Math.round(((next - prev) / Math.abs(prev)) * 100);
}

function leadCopy(value: number | null, up: string, down: string) {
  if (value === null || value === 0) return "Estável neste recorte";
  return value > 0 ? up : down;
}

function TrendBadge({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-counter px-2 py-0.5 text-[11px] font-semibold tabular text-ink">
      <Icon className="h-3 w-3" />
      {up ? "+" : ""}
      {value}%
    </span>
  );
}
