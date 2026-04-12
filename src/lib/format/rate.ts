import { EMPTY_STATE, DEFAULT_RATE_DECIMALS } from "../ui/tokens";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a rate value as a percentage.
 *
 * - `0.1234` → `12.3%` (default 1 decimal)
 * - `0`      → `0.0%`
 * - Null/undefined → `―`
 *
 * @param value  Raw ratio (0–1 range)
 * @param decimals  Number of decimal places (default: 1)
 */
export function formatRate(
  value: number | null | undefined,
  decimals: number = DEFAULT_RATE_DECIMALS,
): string {
  if (value === null || value === undefined) return EMPTY_STATE;

  const pct = value * 100;
  return `${pct.toFixed(decimals)}%`;
}

/**
 * Format a GMV ratio (numerator / denominator).
 *
 * - Valid division → formatted percentage
 * - Denominator is 0 → `―`
 * - Denominator is null → `―`
 * - Numerator is null → `―`
 *
 * @param numerator   The value to divide
 * @param denominator The GMV total (or null)
 * @param decimals    Number of decimal places (default: 1)
 */
export function formatGmvRatio(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  decimals: number = DEFAULT_RATE_DECIMALS,
): string {
  if (numerator === null || numerator === undefined) return EMPTY_STATE;
  if (denominator === null || denominator === undefined) return EMPTY_STATE;
  if (denominator === 0) return EMPTY_STATE;

  return formatRate(numerator / denominator, decimals);
}

/**
 * Format a value in basis points (bps).
 *
 * 1 bp = 0.01% = 0.0001
 *
 * - `0.0123` → `123bps`
 * - Null/undefined → `―`
 */
export function formatBps(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_STATE;

  const bps = Math.round(value * 10_000);
  return `${bps}bps`;
}
