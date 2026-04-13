import { cn } from "@/lib/utils"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import { formatCurrencyDelta } from "@/lib/format/currency"
import { CHART_COLORS } from "@/lib/ui/theme"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import type { DifferenceData, DifferenceItem } from "@/features/analysis/lib/difference"

const chartConfig = {
  value: { label: "差異" },
  positive: { label: "好転", color: CHART_COLORS.positive },
  negative: { label: "悪化", color: CHART_COLORS.negative },
} satisfies ChartConfig

export interface DifferenceChartProps {
  data: DifferenceData
  onBarClick?: (item: DifferenceItem) => void
  className?: string
}

export function DifferenceChart({ data, onBarClick, className }: DifferenceChartProps) {
  const { items } = data

  if (items.length === 0) {
    return <AnalysisFallback variant="empty" className={cn("h-[240px] py-0", className)} />
  }

  const chartData = items.map((item) => ({
    ...item,
    barColor: item.isPositive ? "var(--color-positive)" : "var(--color-negative)",
  }))

  return (
    <ChartContainer config={chartConfig} className={cn("h-[240px] w-full", className)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <XAxis
          type="number"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => formatCurrencyDelta(value, { compact: true })}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const numValue = typeof value === "number" ? value : null
                return numValue !== null ? formatCurrencyDelta(numValue, { compact: true }) : EMPTY_STATE
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="value"
          radius={4}
          cursor={onBarClick ? "pointer" : undefined}
          onClick={onBarClick ? (_data, index) => {
            const item = items[index]
            if (item) onBarClick(item)
          } : undefined}
        >
          {chartData.map((entry, index) => (
            <Cell key={`${entry.label}-${index}`} fill={entry.barColor} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
