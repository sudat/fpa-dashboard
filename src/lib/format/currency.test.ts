import { describe, expect, it } from "vitest";
import { formatCurrency, formatCurrencyDelta, parseCurrencyInput } from "./currency";

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe("formatCurrency", () => {
  it("formats positive values with thousand separators", () => {
    expect(formatCurrency(1234)).toBe("1,234");
    expect(formatCurrency(1000000)).toBe("1,000,000");
    expect(formatCurrency(1)).toBe("1");
  });

  it("formats negative values with △ prefix", () => {
    expect(formatCurrency(-1234)).toBe("△1,234");
    expect(formatCurrency(-1000000)).toBe("△1,000,000");
  });

  it("formats zero as '0' by default", () => {
    expect(formatCurrency(0)).toBe("0");
  });

  it("formats zero as '-' when configured", () => {
    expect(formatCurrency(0, { zeroDisplay: "-" })).toBe("-");
  });

  it("returns ― for null", () => {
    expect(formatCurrency(null)).toBe("―");
  });

  it("returns ― for undefined", () => {
    expect(formatCurrency(undefined)).toBe("―");
  });

  // Compact display
  describe("compact mode", () => {
    it("formats 億 values compactly", () => {
      expect(formatCurrency(150_000_000, { compact: true })).toBe("1.5億");
      expect(formatCurrency(100_000_000, { compact: true })).toBe("1億");
      expect(formatCurrency(1_230_000_000, { compact: true })).toBe("12.3億");
    });

    it("formats negative 億 values compactly", () => {
      expect(formatCurrency(-150_000_000, { compact: true })).toBe("△1.5億");
    });

    it("formats 万 values compactly", () => {
      expect(formatCurrency(10_000, { compact: true })).toBe("1万");
      expect(formatCurrency(3_450_000, { compact: true })).toBe("345万");
      expect(formatCurrency(12_500_000, { compact: true })).toBe("1,250万");
    });

    it("formats negative 万 values compactly", () => {
      expect(formatCurrency(-3_450_000, { compact: true })).toBe("△345万");
    });

    it("shows normal format for values below 万 threshold", () => {
      expect(formatCurrency(9999, { compact: true })).toBe("9,999");
    });
  });
});

// ---------------------------------------------------------------------------
// formatCurrencyDelta
// ---------------------------------------------------------------------------
describe("formatCurrencyDelta", () => {
  it("formats positive deltas with + prefix", () => {
    expect(formatCurrencyDelta(1234)).toBe("+1,234");
    expect(formatCurrencyDelta(1000000)).toBe("+1,000,000");
  });

  it("formats negative deltas with △ prefix", () => {
    expect(formatCurrencyDelta(-1234)).toBe("△1,234");
  });

  it("formats zero as '0' by default", () => {
    expect(formatCurrencyDelta(0)).toBe("0");
  });

  it("returns ― for null", () => {
    expect(formatCurrencyDelta(null)).toBe("―");
  });

  it("returns ― for undefined", () => {
    expect(formatCurrencyDelta(undefined)).toBe("―");
  });

  describe("compact mode", () => {
    it("formats positive compact with + prefix", () => {
      expect(formatCurrencyDelta(150_000_000, { compact: true })).toBe("+1.5億");
    });

    it("formats negative compact with △ prefix", () => {
      expect(formatCurrencyDelta(-150_000_000, { compact: true })).toBe("△1.5億");
    });
  });
});

// ---------------------------------------------------------------------------
// parseCurrencyInput
// ---------------------------------------------------------------------------
describe("parseCurrencyInput", () => {
  it("parses plain numbers with commas", () => {
    expect(parseCurrencyInput("1,234")).toBe(1234);
    expect(parseCurrencyInput("1,000,000")).toBe(1_000_000);
    expect(parseCurrencyInput("0")).toBe(0);
  });

  it("parses negative △ prefixed values", () => {
    expect(parseCurrencyInput("△1,234")).toBe(-1234);
  });

  it("parses + prefixed values", () => {
    expect(parseCurrencyInput("+1,234")).toBe(1234);
  });

  it("parses 億 compact values", () => {
    expect(parseCurrencyInput("1.5億")).toBe(150_000_000);
    expect(parseCurrencyInput("1億")).toBe(100_000_000);
  });

  it("parses negative 億 compact values", () => {
    expect(parseCurrencyInput("△1.5億")).toBe(-150_000_000);
  });

  it("parses 万 compact values", () => {
    expect(parseCurrencyInput("345万")).toBe(3_450_000);
    expect(parseCurrencyInput("12.5万")).toBe(125_000);
  });

  it("returns null for empty string", () => {
    expect(parseCurrencyInput("")).toBeNull();
  });

  it("returns null for whitespace", () => {
    expect(parseCurrencyInput("   ")).toBeNull();
  });

  it("returns null for empty state character", () => {
    expect(parseCurrencyInput("―")).toBeNull();
  });

  it("returns null for unparseable strings", () => {
    expect(parseCurrencyInput("abc")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseCurrencyInput(null as unknown as string)).toBeNull();
  });
});
