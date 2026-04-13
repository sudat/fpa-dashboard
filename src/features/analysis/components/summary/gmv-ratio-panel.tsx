import { cn } from "@/lib/utils"
import { TYPOGRAPHY, FINANCIAL_COLORS, SPACING } from "@/lib/ui/theme"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { formatRate } from "@/lib/format/rate"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import type { GmvRatioRow } from "@/features/analysis/lib/selectors"

export interface GmvRatioPanelProps {
  rows: GmvRatioRow[]
  className?: string
}

function deltaColor(value: number | null): string {
  if (value === null) return FINANCIAL_COLORS.empty
  if (value > 0) return FINANCIAL_COLORS.positive
  if (value < 0) return FINANCIAL_COLORS.negative
  return FINANCIAL_COLORS.neutral
}

export function GmvRatioPanel({ rows, className }: GmvRatioPanelProps) {
  if (rows.length === 0) {
    return <AnalysisFallback variant="empty" />
  }

  return (
    <div className={cn("w-full overflow-auto max-h-[70vh]", className)}>
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className={cn("flex items-center gap-2 px-3", SPACING.tableRowHeight)}>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[200px]")}>科目名</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B/GMV</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-A/GMV</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>C/GMV</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-C/GMV</span>
        </div>
      </div>
      <div>
        {rows.map((row) => (
          <div
            key={row.accountName}
            className={cn("flex items-center gap-2 px-3 border-b", SPACING.tableRowHeight)}
          >
            <span className="w-[200px] truncate">{row.accountName}</span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right", FINANCIAL_COLORS.neutral)}>
              {row.B_ratio !== null ? formatRate(row.B_ratio) : EMPTY_STATE}
            </span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right", deltaColor(row.BA_ratio))}>
              {row.BA_ratio !== null ? formatRate(row.BA_ratio) : EMPTY_STATE}
            </span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right", FINANCIAL_COLORS.neutral)}>
              {row.C_ratio !== null ? formatRate(row.C_ratio) : EMPTY_STATE}
            </span>
            <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right", deltaColor(row.BC_ratio))}>
              {row.BC_ratio !== null ? formatRate(row.BC_ratio) : EMPTY_STATE}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
