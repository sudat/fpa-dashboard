import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatCurrency, formatCurrencyDelta } from "@/lib/format/currency"
import { EMPTY_STATE, SIGN_COLORS } from "@/lib/ui/tokens"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import { FinancialCell } from "@/features/analysis/components/shared/detail-table"
import type { SummaryRow } from "@/features/analysis/lib/summary"

function deltaColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return SIGN_COLORS.empty
  if (value > 0) return SIGN_COLORS.positive
  if (value < 0) return SIGN_COLORS.negative
  return SIGN_COLORS.neutral
}

function DeltaCell({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <span className={cn(TYPOGRAPHY.financial, "text-muted-foreground")}>
        {EMPTY_STATE}
      </span>
    )
  }
  return (
    <span className={cn(TYPOGRAPHY.financial, deltaColorClass(value))}>
      {formatCurrencyDelta(value)}
    </span>
  )
}

export function createDetailColumns(
  hasDetails: (accountName: string) => boolean,
): ColumnDef<SummaryRow>[] {
  return [
    {
      id: "accountName",
      header: "科目名",
      accessorKey: "accountName",
      cell: ({ row }) => {
        const canExpand = hasDetails(row.original.accountName)
        return (
          <div className="flex items-center gap-1">
            {canExpand && (
              <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
                aria-label={row.getIsExpanded() ? "折りたたむ" : "展開する"}
              >
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform",
                    row.getIsExpanded() && "rotate-90",
                  )}
                />
              </button>
            )}
            <span className={cn(!canExpand && "pl-6")}>{row.original.accountName}</span>
          </div>
        )
      },
    },
    {
      id: "A",
      header: "A",
      accessorKey: "A",
      cell: ({ getValue }) => (
        <FinancialCell value={formatCurrency(getValue() as number | null)} />
      ),
    },
    {
      id: "B",
      header: "B",
      accessorKey: "B",
      cell: ({ getValue }) => (
        <FinancialCell value={formatCurrency(getValue() as number | null)} />
      ),
    },
    {
      id: "BA",
      header: "B-A",
      accessorKey: "BA",
      cell: ({ getValue }) => <DeltaCell value={getValue() as number | null} />,
    },
    {
      id: "C",
      header: "C",
      accessorKey: "C",
      cell: ({ getValue }) => (
        <FinancialCell value={formatCurrency(getValue() as number | null)} />
      ),
    },
    {
      id: "BC",
      header: "B-C",
      accessorKey: "BC",
      cell: ({ getValue }) => <DeltaCell value={getValue() as number | null} />,
    },
  ]
}
