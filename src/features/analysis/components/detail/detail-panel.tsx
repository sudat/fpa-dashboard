import { useMemo } from "react"

import { cn } from "@/lib/utils"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DetailTable,
  FinancialCell,
} from "@/features/analysis/components/shared/detail-table"
import { createDetailColumns } from "./columns"
import { formatCurrency, formatCurrencyDelta } from "@/lib/format/currency"
import { SIGN_COLORS } from "@/lib/ui/tokens"
import type { SummaryRow } from "@/features/analysis/lib/summary"

export interface DetailPanelProps {
  rows: SummaryRow[]
  detailRows?: Map<string, SummaryRow[]>
  highlightedRowId?: string
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

function DetailSubTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map((row) => (
          <tr key={row.accountCode} className="border-b h-10">
            <td className="px-3 pl-10">
              <span className="text-sm">{row.accountName}</span>
            </td>
            <td className="px-3">
              <FinancialCell value={formatCurrency(row.A)} />
            </td>
            <td className="px-3">
              <FinancialCell value={formatCurrency(row.B)} />
            </td>
            <td className="px-3">
              <DeltaValue value={row.BA} />
            </td>
            <td className="px-3">
              <FinancialCell value={formatCurrency(row.C)} />
            </td>
            <td className="px-3">
              <DeltaValue value={row.BC} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function DetailPanel({
  rows,
  detailRows,
  highlightedRowId,
  className,
}: DetailPanelProps) {
  const hasDetails = useMemo(
    () => (accountName: string) => {
      if (!detailRows) return false
      const children = detailRows.get(accountName)
      return children !== undefined && children.length > 0
    },
    [detailRows],
  )

  const columns = useMemo(
    () => createDetailColumns(hasDetails),
    [hasDetails],
  )

  const renderSubComponent = useMemo(() => {
    if (!detailRows) return undefined
    return (row: SummaryRow) => {
      const children = detailRows.get(row.accountName)
      if (!children || children.length === 0) return null
      return <DetailSubTable rows={children} />
    }
  }, [detailRows])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>詳細テーブル</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {EMPTY_STATE}
          </p>
        ) : (
          <DetailTable
            data={rows as (SummaryRow & Record<string, unknown>)[]}
            columns={columns as import("@tanstack/react-table").ColumnDef<SummaryRow & Record<string, unknown>>[]}
            renderSubComponent={renderSubComponent as ((row: SummaryRow & Record<string, unknown>) => React.ReactNode) | undefined}
            getRowId={(row) => (row as SummaryRow).accountCode}
            highlightedRowId={highlightedRowId}
          />
        )}
      </CardContent>
    </Card>
  )
}
