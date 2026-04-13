import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import type { SummaryRow } from "@/features/analysis/lib/summary"

import { SummaryCard } from "./summary-card"

export interface MajorAccountSummaryProps {
  rows: SummaryRow[]
  selectedAccount?: string | null
  onAccountSelect?: (accountName: string) => void
}

export function MajorAccountSummary({
  rows,
  selectedAccount,
  onAccountSelect,
}: MajorAccountSummaryProps) {
  if (rows.length === 0) {
    return <AnalysisFallback variant="empty" data-testid="major-account-summary-empty" />
  }

  return (
    <div
      className="grid grid-cols-3 gap-3 lg:grid-cols-5"
      data-testid="major-account-summary"
    >
      {rows.map((row) => (
        <SummaryCard
          key={row.accountName}
          accountName={row.accountName}
          A={row.A}
          B={row.B}
          BA={row.BA}
          C={row.C}
          BC={row.BC}
          selected={selectedAccount === row.accountName}
          onClick={
            onAccountSelect
              ? () => onAccountSelect(row.accountName)
              : undefined
          }
        />
      ))}
    </div>
  )
}
