import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyDelta } from "@/lib/format/currency";
import { EMPTY_STATE } from "@/lib/ui/tokens";
import { FINANCIAL_COLORS, TYPOGRAPHY, SPACING } from "@/lib/ui/theme";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface SummaryCardProps {
  accountName: string;
  A: number | null;
  B: number | null;
  BA: number | null;
  C: number | null;
  BC: number | null;
  selected?: boolean;
  onClick?: () => void;
}

function deltaColor(value: number | null): string {
  if (value === null) return FINANCIAL_COLORS.empty;
  if (value > 0) return FINANCIAL_COLORS.positive;
  if (value < 0) return FINANCIAL_COLORS.negative;
  return FINANCIAL_COLORS.neutral;
}

export function SummaryCard({
  accountName,
  A,
  B,
  BA,
  C,
  BC: _BC,
  selected = false,
  onClick,
}: SummaryCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "cursor-pointer transition-colors",
        selected && "ring-2 ring-primary",
        onClick && "hover:bg-muted/50",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `${accountName} を選択` : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      data-testid={`summary-card-${accountName}`}
    >
      <CardHeader>
        <CardTitle className={TYPOGRAPHY.sectionHeader}>
          {accountName}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("flex flex-col gap-1.5", SPACING.cardPadding.replace("p-", "pt-0 "))}>
        <div className={cn(TYPOGRAPHY.financialLg, "leading-none")} data-value="B">
          {B !== null ? formatCurrency(B, { compact: true }) : EMPTY_STATE}
        </div>

        <div
          className={cn(TYPOGRAPHY.financial, deltaColor(BA))}
          data-value="BA"
        >
          {formatCurrencyDelta(BA, { compact: true })}
        </div>

        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span data-value="A">
            {A !== null ? formatCurrency(A, { compact: true }) : EMPTY_STATE}
          </span>
          <span data-value="C">
            {C !== null ? formatCurrency(C, { compact: true }) : EMPTY_STATE}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
