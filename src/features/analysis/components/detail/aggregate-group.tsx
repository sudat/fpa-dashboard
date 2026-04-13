import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { EMPTY_STATE, SIGN_COLORS } from "@/lib/ui/tokens"
import { TYPOGRAPHY, SPACING } from "@/lib/ui/theme"
import { formatCurrency, formatCurrencyDelta } from "@/lib/format/currency"
import { FinancialCell } from "@/features/analysis/components/shared/detail-table"
import type { SummaryRow } from "@/features/analysis/lib/summary"

export interface AggregateGroupProps {
  aggregateName: string
  summaryRow: SummaryRow
  detailRows: SummaryRow[]
  defaultExpanded?: boolean
  highlightedRowId?: string
  isUnassigned?: boolean
  onExpandedChange?: (expanded: boolean) => void
  className?: string
}

function DeltaValue({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <span className={cn(TYPOGRAPHY.financial, "text-muted-foreground")}>
        {EMPTY_STATE}
      </span>
    )
  }
  const color =
    value > 0
      ? SIGN_COLORS.positive
      : value < 0
        ? SIGN_COLORS.negative
        : SIGN_COLORS.neutral
  return (
    <span className={cn(TYPOGRAPHY.financial, color)}>
      {formatCurrencyDelta(value)}
    </span>
  )
}

export function AggregateGroup({
  aggregateName,
  summaryRow,
  detailRows,
  defaultExpanded = false,
  highlightedRowId,
  isUnassigned = false,
  onExpandedChange,
  className,
}: AggregateGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const groupRef = useRef<HTMLDivElement>(null)
  const highlightedRef = useRef<HTMLTableRowElement>(null)

  useEffect(() => {
    if (highlightedRowId && detailRows.some((r) => r.accountCode === highlightedRowId)) {
      setExpanded(true)
    }
  }, [highlightedRowId, detailRows])

  useEffect(() => {
    if (expanded && highlightedRowId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [expanded, highlightedRowId])

  const handleToggle = useCallback(() => {
    const next = !expanded
    setExpanded(next)
    onExpandedChange?.(next)
  }, [expanded, onExpandedChange])

  const hasDetails = detailRows.length > 0

  return (
    <div
      ref={groupRef}
      className={cn("border-b last:border-b-0", className)}
      data-testid={`aggregate-group-${aggregateName}`}
    >
      <button
        type="button"
        onClick={hasDetails ? handleToggle : undefined}
        className={cn(
          "flex w-full items-center gap-2 px-3 transition-colors cursor-pointer",
          SPACING.tableRowHeight,
          expanded && "bg-muted/50",
        )}
        aria-expanded={hasDetails ? expanded : undefined}
        aria-label={expanded ? `${aggregateName}を折りたたむ` : `${aggregateName}を展開する`}
      >
        {hasDetails ? (
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-90",
            )}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}

        <span className={cn(TYPOGRAPHY.sectionHeader, "flex-1 text-left min-w-[120px]")}>
          {aggregateName}
          {isUnassigned && (
            <span className="ml-2 inline-flex items-center rounded-none bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
              未割当
            </span>
          )}
        </span>

        <span className={cn(TYPOGRAPHY.financial, "w-[120px] text-right")}>
          <FinancialCell value={formatCurrency(summaryRow.B)} />
        </span>
        <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right")}>
          <DeltaValue value={summaryRow.BA} />
        </span>
        <span className={cn(TYPOGRAPHY.financial, "w-[120px] text-right")}>
          <FinancialCell value={formatCurrency(summaryRow.C)} />
        </span>
        <span className={cn(TYPOGRAPHY.financial, "w-[100px] text-right")}>
          <DeltaValue value={summaryRow.BC} />
        </span>
      </button>

      {expanded && hasDetails && (
        <table className="w-full border-collapse text-sm">
          <tbody>
            {detailRows.map((row) => {
              const isHighlighted =
                highlightedRowId !== undefined && row.accountCode === highlightedRowId
              return (
                <tr
                  key={row.accountCode}
                  ref={isHighlighted ? highlightedRef : undefined}
                  className={cn(
                    "border-t transition-colors",
                    SPACING.tableRowHeight,
                    isHighlighted && "bg-accent/50",
                  )}
                >
                  <td className="px-3 pl-10" style={{ width: "calc(100% - 540px)" }}>
                    <span className="text-sm">{row.accountName}</span>
                  </td>
                  <td className="px-3 w-[120px] text-right">
                    <FinancialCell value={formatCurrency(row.A)} />
                  </td>
                  <td className="px-3 w-[120px] text-right">
                    <FinancialCell value={formatCurrency(row.B)} />
                  </td>
                  <td className="px-3 w-[100px] text-right">
                    <DeltaValue value={row.BA} />
                  </td>
                  <td className="px-3 w-[120px] text-right">
                    <FinancialCell value={formatCurrency(row.C)} />
                  </td>
                  <td className="px-3 w-[100px] text-right">
                    <DeltaValue value={row.BC} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
