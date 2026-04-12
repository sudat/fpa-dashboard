import { cn } from "@/lib/utils"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendChart } from "@/features/analysis/components/shared/trend-chart"
import type { TrendSeries } from "@/features/analysis/lib/trend"

export interface TrendPanelProps {
  series: TrendSeries | null
  metricMode: "amount" | "rate"
  onMetricModeChange: (mode: "amount" | "rate") => void
  className?: string
}

export function TrendPanel({ series, metricMode, onMetricModeChange, className }: TrendPanelProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className={cn(TYPOGRAPHY.sectionHeader)}>
          {series?.accountName ?? "科目を選択してください"}
        </CardTitle>
        <CardAction>
          <Tabs
            value={metricMode}
            onValueChange={(value) => {
              if (value === "amount" || value === "rate") {
                onMetricModeChange(value)
              }
            }}
            aria-label="指標切替"
          >
            <TabsList>
              <TabsTrigger value="amount">金額</TabsTrigger>
              <TabsTrigger value="rate">比率</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
      </CardHeader>
      <CardContent>
        {series ? (
          <TrendChart series={series} metricMode={metricMode} />
        ) : (
          <div className="flex h-[280px] w-full items-center justify-center text-muted-foreground text-sm">
            科目を選択してください
          </div>
        )}
      </CardContent>
    </Card>
  )
}
