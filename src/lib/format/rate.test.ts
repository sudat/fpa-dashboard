import { describe, expect, it } from "bun:test";
import { formatRate, formatGmvRatio, formatBps } from "./rate";

// ---------------------------------------------------------------------------
// formatRate
// ---------------------------------------------------------------------------
describe("formatRate", () => {
  it("formats a ratio as percentage with 1 decimal by default", () => {
    expect(formatRate(0.1234)).toBe("12.3%");
  });

  it("formats with custom decimal places", () => {
    expect(formatRate(0.1234, 2)).toBe("12.34%");
    expect(formatRate(0.1234, 0)).toBe("12%");
  });

  it("formats zero as 0.0%", () => {
    expect(formatRate(0)).toBe("0.0%");
  });

  it("formats negative ratios", () => {
    expect(formatRate(-0.05)).toBe("-5.0%");
  });

  it("returns ― for null", () => {
    expect(formatRate(null)).toBe("―");
  });

  it("returns ― for undefined", () => {
    expect(formatRate(undefined)).toBe("―");
  });
});

// ---------------------------------------------------------------------------
// formatGmvRatio
// ---------------------------------------------------------------------------
describe("formatGmvRatio", () => {
  it("calculates and formats a valid ratio", () => {
    expect(formatGmvRatio(500, 1000)).toBe("50.0%");
    expect(formatGmvRatio(123, 1000)).toBe("12.3%");
  });

  it("returns ― when denominator is null", () => {
    expect(formatGmvRatio(500, null)).toBe("―");
  });

  it("returns ― when numerator is null", () => {
    expect(formatGmvRatio(null, 1000)).toBe("―");
  });

  it("returns ― when denominator is undefined", () => {
    expect(formatGmvRatio(500, undefined)).toBe("―");
  });

  it("returns ― when denominator is zero (division by zero)", () => {
    expect(formatGmvRatio(500, 0)).toBe("―");
  });

  it("supports custom decimals", () => {
    expect(formatGmvRatio(500, 1000, 2)).toBe("50.00%");
  });
});

// ---------------------------------------------------------------------------
// formatBps
// ---------------------------------------------------------------------------
describe("formatBps", () => {
  it("formats basis points correctly", () => {
    expect(formatBps(0.0123)).toBe("123bps");
  });

  it("formats small values", () => {
    expect(formatBps(0.0001)).toBe("1bps");
  });

  it("formats zero", () => {
    expect(formatBps(0)).toBe("0bps");
  });

  it("formats negative values", () => {
    expect(formatBps(-0.005)).toBe("-50bps");
  });

  it("returns ― for null", () => {
    expect(formatBps(null)).toBe("―");
  });

  it("returns ― for undefined", () => {
    expect(formatBps(undefined)).toBe("―");
  });
});
