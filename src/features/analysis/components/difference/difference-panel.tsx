import { cn } from "@/lib/utils"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import { DifferenceChart } from "@/features/analysis/components/shared/difference-chart"
import type { DifferenceData, DifferenceItem } from "@/features/analysis/lib/difference"

export interface DifferencePanelProps {
  data: DifferenceData | null
  onBarClick?: (item: DifferenceItem) => void
  className?: string
}

export function DifferencePanel({ data, onBarClick, className }: DifferencePanelProps) {
  const subheader = data?.targetAccountCode
    ? `（${data.items[0]?.label ?? ""}の内訳）`
    : "（事業部別）"

  return (
    <Card className={cn("gap-2", className)}>
      <CardHeader className="gap-0.5">
        <CardTitle className={TYPOGRAPHY.sectionHeader}>差異分解</CardTitle>
        <CardDescription>{data ? subheader : ""}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">

        {data ? (
          <DifferenceChart data={data} onBarClick={onBarClick} />
        ) : (
          <AnalysisFallback variant="empty" className="h-[240px] py-0" />
        )}
      </CardContent>
    </Card>
  )
}
