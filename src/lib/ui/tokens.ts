/**
 * UI Display Tokens — shared constants for formatting and display.
 *
 * Japanese business conventions:
 * - Negative values use △ (not minus sign)
 * - Empty/null state uses ― (em dash)
 * - Positive deltas use + prefix
 */

/** Empty state character for null/undefined values */
export const EMPTY_STATE = "―" as const;

/** Negative value prefix (Japanese business convention) */
export const NEGATIVE_PREFIX = "△" as const;

/** Positive delta prefix */
export const POSITIVE_DELTA_PREFIX = "+" as const;

/** Default number of decimal places for rate display */
export const DEFAULT_RATE_DECIMALS = 1;

/**
 * Color tokens for value sign (positive / negative / neutral).
 * These are Tailwind class names — not raw colors — so they compose
 * with any theme or dark mode.
 */
export const SIGN_COLORS = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-rose-600 dark:text-rose-400",
  neutral: "text-foreground",
  empty: "text-muted-foreground",
} as const;

/** Compact display thresholds for currency */
export const COMPACT_THRESHOLDS = {
  /** 億 (100 million) — values >= this are shown as X.X億 */
  oku: 100_000_000,
  /** 万 (10 thousand) — values >= this (but < oku) are shown as X,XXX万 */
  man: 10_000,
} as const;
