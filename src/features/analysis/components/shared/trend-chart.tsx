import { cn } from "@/lib/utils"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/format/currency"
import { formatRate } from "@/lib/format/rate"
import { CHART_COLORS } from "@/lib/ui/theme"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import type { TrendSeries } from "@/features/analysis/lib/trend"

const chartConfig = {
  actual: { label: "実績", color: CHART_COLORS.actual },
  forecast: { label: "見込", color: CHART_COLORS.accent },
} satisfies ChartConfig

export interface TrendChartProps {
  series: TrendSeries
  metricMode?: "amount" | "rate"
  className?: string
}

function formatYearMonth(ym: string): string {
  const month = ym.split("-")[1]
  return month ? `${Number(month)}月` : ym
}

function formatValue(value: number | null, mode: "amount" | "rate"): string {
  if (value === null) return EMPTY_STATE
  return mode === "rate" ? formatRate(value) : formatCurrency(value, { compact: true })
}

export function TrendChart({ series, metricMode = "amount", className }: TrendChartProps) {
  const { points } = series

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] w-full items-center justify-center text-muted-foreground text-sm">
        {EMPTY_STATE}
      </div>
    )
  }

  const lastActualPoint = [...points]
    .reverse()
    .find((p) => p.type === "actual")

  const chartData = points.map((point) => ({
    yearMonth: point.yearMonth,
    label: formatYearMonth(point.yearMonth),
    actual: point.type === "actual" ? point.amount : null,
    forecast: point.type === "forecast" ? point.amount : null,
  }))

  return (
    <ChartContainer config={chartConfig} className={cn("h-[280px] w-full", className)}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={60}
          tickFormatter={(value: number) => formatValue(value, metricMode)}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name) => {
                const numValue = typeof value === "number" ? value : null
                return formatValue(numValue, metricMode)
              }}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--color-actual)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
          name="actual"
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          activeDot={{ r: 4 }}
          connectNulls={false}
          name="forecast"
        />
        {lastActualPoint && (
          <ReferenceLine
            x={formatYearMonth(lastActualPoint.yearMonth)}
            stroke="var(--color-actual)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
      </LineChart>
    </ChartContainer>
  )
}
