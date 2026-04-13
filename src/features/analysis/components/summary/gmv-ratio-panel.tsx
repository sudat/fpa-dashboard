import { cn } from "@/lib/utils"
import { TYPOGRAPHY, SPACING, FINANCIAL_COLORS } from "@/lib/ui/theme"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { formatRate } from "@/lib/format/rate"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import type { GmvRatioRow } from "@/features/analysis/lib/selectors"

export interface GmvRatioPanelProps {
  rows: GmvRatioRow[]
  className?: string
}

function DeltaRate({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span className={cn(TYPOGRAPHY.financial, FINANCIAL_COLORS.empty)}>
        {EMPTY_STATE}
      </span>
    )
  }

  const color =
    value > 0
      ? FINANCIAL_COLORS.positive
      : value < 0
        ? FINANCIAL_COLORS.negative
        : FINANCIAL_COLORS.neutral

  return (
    <span className={cn(TYPOGRAPHY.financial, color)}>
      {formatRate(value)}
    </span>
  )
}

export function GmvRatioPanel({ rows, className }: GmvRatioPanelProps) {
  if (rows.length === 0) {
    return <AnalysisFallback variant="empty" className={className} />
  }

  return (
    <div className={cn("w-full overflow-auto", className)}>
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className={cn("flex items-center gap-2 px-3", SPACING.tableRowHeight)}>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[200px]")}>科目名</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B/GMV比率</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-A/GMV変化</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>C/GMV比率</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-C/GMV変化</span>
        </div>
      </div>

      <div>
        {rows.map((row) => (
          <div
            key={row.accountName}
            className={cn("flex items-center gap-2 px-3", SPACING.tableRowHeight)}
          >
            <span className={cn(TYPOGRAPHY.body, "w-[200px]")}>{row.accountName}</span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right")}>
              {formatRate(row.B_ratio)}
            </span>
            <span className="w-[100px] text-right">
              <DeltaRate value={row.BA_ratio} />
            </span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right")}>
              {formatRate(row.C_ratio)}
            </span>
            <span className="w-[100px] text-right">
              <DeltaRate value={row.BC_ratio} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
