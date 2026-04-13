export const SIDEBAR_WIDTH = 220;
export const SIDEBAR_COLLAPSED_WIDTH = 48;

export const TYPOGRAPHY = {
  pageTitle: "text-xl font-semibold tracking-tight",
  sectionHeader: "text-base font-medium",
  tableHeader: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
  body: "text-sm",
  small: "text-xs text-muted-foreground",
  financial: "font-mono text-sm tabular-nums tracking-tight",
  financialLg: "font-mono text-2xl font-semibold tabular-nums tracking-tight",
} as const;

export const SPACING = {
  sectionGap: "gap-6",
  cardPadding: "p-4",
  tableRowHeight: "h-10",
} as const;

export const FINANCIAL_COLORS = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-foreground",
  empty: "text-muted-foreground",
  positiveBg: "bg-positive-muted",
  negativeBg: "bg-negative-muted",
} as const;

export const CHART_COLORS = {
  positive: "var(--chart-positive)",
  negative: "var(--chart-negative)",
  accent: "var(--chart-accent)",
  actual: "var(--chart-actual)",
} as const;

export const LAYOUT = {
  sidebarWidth: `${SIDEBAR_WIDTH}px`,
  sidebarCollapsedWidth: `${SIDEBAR_COLLAPSED_WIDTH}px`,
  mainContentMinWidth: "800px",
} as const;
