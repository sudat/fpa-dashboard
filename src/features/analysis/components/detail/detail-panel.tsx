import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AggregateAccordionTable } from "./aggregate-accordion-table"
import type { SummaryRow } from "@/features/analysis/lib/summary"

export interface DetailPanelProps {
  rows: SummaryRow[]
  detailRows?: Map<string, SummaryRow[]>
  highlightedRowId?: string
  className?: string
}

export function DetailPanel({
  rows,
  detailRows,
  highlightedRowId,
  className,
}: DetailPanelProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>詳細テーブル</CardTitle>
      </CardHeader>
      <CardContent>
        <AggregateAccordionTable
          summaryRows={rows}
          detailRows={detailRows ?? new Map()}
          highlightedRowId={highlightedRowId}
        />
      </CardContent>
    </Card>
  )
}
