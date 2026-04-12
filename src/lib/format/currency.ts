import {
  EMPTY_STATE,
  NEGATIVE_PREFIX,
  POSITIVE_DELTA_PREFIX,
  COMPACT_THRESHOLDS,
} from "../ui/tokens";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Format an absolute number with thousand separators (no sign, no ¥) */
function formatAbs(value: number): string {
  return Math.abs(value).toLocaleString("ja-JP", {
    maximumFractionDigits: 0,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CurrencyFormatOptions {
  /** When true, display compact form: 1.2億, 3,450万, etc. */
  compact?: boolean;
  /** How to render zero. Default: "0" */
  zeroDisplay?: "0" | "-";
}

/**
 * Format a currency value for cell display.
 *
 * - Positive → `1,234`
 * - Negative → `△1,234`
 * - Zero     → `0` (configurable)
 * - Null/undefined → `―`
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: CurrencyFormatOptions,
): string {
  if (value === null || value === undefined) return EMPTY_STATE;

  if (value === 0) return options?.zeroDisplay ?? "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? NEGATIVE_PREFIX : "";

  if (options?.compact && abs >= COMPACT_THRESHOLDS.oku) {
    return `${sign}${(abs / COMPACT_THRESHOLDS.oku).toFixed(1).replace(/\.0$/, "")}億`;
  }

  if (options?.compact && abs >= COMPACT_THRESHOLDS.man) {
    const manValue = abs / COMPACT_THRESHOLDS.man;
    const hasDecimal = manValue !== Math.floor(manValue);
    if (hasDecimal) {
      return `${sign}${manValue.toFixed(1).replace(/\.0$/, "")}万`;
    }
    return `${sign}${formatAbs(manValue)}万`;
  }

  return `${sign}${formatAbs(value)}`;
}

/**
 * Format a currency value as a delta with explicit +/- prefix.
 *
 * - Positive → `+1,234`
 * - Negative → `△1,234`
 * - Zero     → `0` or `-`
 * - Null/undefined → `―`
 */
export function formatCurrencyDelta(
  value: number | null | undefined,
  options?: CurrencyFormatOptions,
): string {
  if (value === null || value === undefined) return EMPTY_STATE;

  if (value === 0) return options?.zeroDisplay ?? "0";

  if (value > 0) {
    const abs = formatAbs(value);
    if (options?.compact) {
      const compacted = formatCurrency(value, { ...options, zeroDisplay: "0" });
      // formatCurrency doesn't add + for positive; we need to prepend it
      return `${POSITIVE_DELTA_PREFIX}${compacted}`;
    }
    return `${POSITIVE_DELTA_PREFIX}${abs}`;
  }

  // Negative — formatCurrency already adds △
  return formatCurrency(value, options);
}

/**
 * Parse a user-input currency string back to a number.
 *
 * Handles: `1,234`, `△1,234`, `+1,234`, `1.2億`, `3,450万`, etc.
 * Returns null if the input cannot be parsed.
 */
export function parseCurrencyInput(value: string): number | null {
  if (!value || value.trim() === "" || value === EMPTY_STATE) return null;

  const trimmed = value.trim();

  // Remove △ prefix (negative)
  let negative = false;
  let working = trimmed;
  if (working.startsWith(NEGATIVE_PREFIX)) {
    negative = true;
    working = working.slice(NEGATIVE_PREFIX.length);
  }
  // Remove + prefix
  if (working.startsWith(POSITIVE_DELTA_PREFIX)) {
    working = working.slice(POSITIVE_DELTA_PREFIX.length);
  }

  // Handle compact units
  if (working.endsWith("億")) {
    const num = parseFloat(working.slice(0, -1).replace(/,/g, ""));
    if (isNaN(num)) return null;
    return negative ? -(num * COMPACT_THRESHOLDS.oku) : num * COMPACT_THRESHOLDS.oku;
  }
  if (working.endsWith("万")) {
    const num = parseFloat(working.slice(0, -1).replace(/,/g, ""));
    if (isNaN(num)) return null;
    return negative ? -(num * COMPACT_THRESHOLDS.man) : num * COMPACT_THRESHOLDS.man;
  }

  // Plain number with commas
  const num = parseFloat(working.replace(/,/g, ""));
  if (isNaN(num)) return null;
  return negative ? -num : num;
}
