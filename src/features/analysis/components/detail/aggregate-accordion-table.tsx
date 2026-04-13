import { useMemo, useRef, useEffect } from "react"

import { cn } from "@/lib/utils"
import { TYPOGRAPHY, SPACING } from "@/lib/ui/theme"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import { AggregateGroup } from "./aggregate-group"
import {
  getOrderedAggregateAccounts,
  applyMasterMapping,
  getDefaultAccountMaster,
  type AccountMasterConfig,
} from "@/lib/domain/master-schema"
import type { SummaryRow } from "@/features/analysis/lib/summary"

export interface AggregateAccordionTableProps {
  summaryRows: SummaryRow[]
  detailRows: Map<string, SummaryRow[]>
  highlightedRowId?: string
  accountMaster?: AccountMasterConfig
  className?: string
}

interface AggregateSection {
  aggregateName: string
  summaryRow: SummaryRow
  detailRows: SummaryRow[]
  isUnassigned: boolean
}

function resolveTargetAggregate(accountName: string, accountMaster: AccountMasterConfig): string | null {
  const mapping = applyMasterMapping(accountName, accountMaster)
  if (mapping.bucketStatus === "excluded") return null
  return mapping.aggregateAccountName
}

export function buildAggregateSections(
  summaryRows: SummaryRow[],
  detailRows: Map<string, SummaryRow[]>,
  accountMaster: AccountMasterConfig,
): AggregateSection[] {
  const orderedAggregates = getOrderedAggregateAccounts(accountMaster)
  const aggregateSummaryMap = new Map<string, SummaryRow>()

  for (const row of summaryRows) {
    const targetAggregate = resolveTargetAggregate(row.accountName, accountMaster)
    if (!targetAggregate) continue
    aggregateSummaryMap.set(targetAggregate, row)
  }

  const sections: AggregateSection[] = []

  for (const aggregateName of orderedAggregates) {
    const summaryRow = aggregateSummaryMap.get(aggregateName)
    const details = detailRows.get(aggregateName) ?? []
    if (!summaryRow && details.length === 0) continue

    sections.push({
      aggregateName,
      summaryRow: summaryRow ?? buildEmptySummaryRow(aggregateName),
      detailRows: details,
      isUnassigned: aggregateName === "未割当",
    })
  }

  return sections
}

function buildEmptySummaryRow(aggregateName: string): SummaryRow {
  return {
    accountCode: aggregateName,
    accountName: aggregateName,
    aggregateName,
    periodType: "着地見込",
    A: null,
    B: null,
    BA: null,
    C: null,
    BC: null,
  }
}

export function AggregateAccordionTable({
  summaryRows,
  detailRows,
  highlightedRowId,
  accountMaster,
  className,
}: AggregateAccordionTableProps) {
  const master = accountMaster ?? getDefaultAccountMaster()
  const containerRef = useRef<HTMLDivElement>(null)

  const sections = useMemo(
    () => buildAggregateSections(summaryRows, detailRows, master),
    [summaryRows, detailRows, master],
  )

  useEffect(() => {
    if (highlightedRowId && containerRef.current) {
      const highlighted = containerRef.current.querySelector("[data-highlighted='true']")
      if (highlighted) {
        highlighted.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [highlightedRowId])

  if (sections.length === 0) {
    return <AnalysisFallback variant="empty" className={cn("py-4", className)} />
  }

  return (
    <div ref={containerRef} className={cn("w-full overflow-auto max-h-[70vh]", className)}>
      <div className="sticky top-0 bg-background z-10 border-b">
        <div className={cn("flex items-center gap-2 px-3", SPACING.tableRowHeight)}>
          <span className="w-4 shrink-0" />
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[200px]")}>科目名</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[120px] text-right")}>B</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-A</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[120px] text-right")}>C</span>
          <span className={cn(TYPOGRAPHY.tableHeader, "w-[100px] text-right")}>B-C</span>
        </div>
      </div>
      <div>
        {sections.map((section) => (
          <AggregateGroup
            key={section.aggregateName}
            aggregateName={section.aggregateName}
            summaryRow={section.summaryRow}
            detailRows={section.detailRows}
            highlightedRowId={highlightedRowId}
            isUnassigned={section.isUnassigned}
          />
        ))}
      </div>
    </div>
  )
}
