import { cn } from "@/lib/utils"
import { TYPOGRAPHY, CHART_COLORS } from "@/lib/ui/theme"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { Card, CardContent } from "@/components/ui/card"
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
      <CardContent className="space-y-2">
        <div className="space-y-0.5">
          <h3 className={TYPOGRAPHY.sectionHeader}>差異分解</h3>
          <p className="text-xs text-muted-foreground">{data ? subheader : ""}</p>
        </div>

        {data ? (
          <>
            <DifferenceChart data={data} onBarClick={onBarClick} />
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-none"
                  style={{ backgroundColor: CHART_COLORS.positive }}
                />
                好転
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-none"
                  style={{ backgroundColor: CHART_COLORS.negative }}
                />
                悪化
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-[240px] w-full items-center justify-center text-muted-foreground text-sm">
            {EMPTY_STATE}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
