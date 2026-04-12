import type { SummaryRow } from "@/features/analysis/lib/summary";
import { EMPTY_STATE } from "@/lib/ui/tokens";

import { SummaryCard } from "./summary-card";

export interface MajorAccountSummaryProps {
  rows: SummaryRow[];
  selectedAccount?: string | null;
  onAccountSelect?: (accountName: string) => void;
}

export function MajorAccountSummary({
  rows,
  selectedAccount,
  onAccountSelect,
}: MajorAccountSummaryProps) {
  if (rows.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-12 text-muted-foreground"
        data-testid="major-account-summary-empty"
      >
        {EMPTY_STATE}
      </div>
    );
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
  );
}
