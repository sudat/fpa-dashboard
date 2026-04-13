import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GmvRatioPanel } from "./gmv-ratio-panel";
import type { GmvRatioRow } from "@/features/analysis/lib/selectors";

const fixtureRows: GmvRatioRow[] = [
  { accountName: "売上原価", A_ratio: 0.50, B_ratio: 0.73, BA_ratio: 0.052, C_ratio: 0.48, BC_ratio: -0.052 },
  { accountName: "売上総利益", A_ratio: 0.50, B_ratio: 0.27, BA_ratio: -0.023, C_ratio: 0.52, BC_ratio: 0.023 },
  { accountName: "販管費", A_ratio: 0.30, B_ratio: 0.15, BA_ratio: 0.0, C_ratio: 0.28, BC_ratio: 0.0 },
  { accountName: "営業利益", A_ratio: 0.20, B_ratio: 0.12, BA_ratio: 0.08, C_ratio: 0.24, BC_ratio: -0.12 },
  { accountName: "経常利益", A_ratio: 0.18, B_ratio: 0.10, BA_ratio: -0.03, C_ratio: 0.20, BC_ratio: 0.06 },
];

const rowsWithNulls: GmvRatioRow[] = [
  { accountName: "売上原価", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
];

describe("GmvRatioPanel", () => {
  it("renders 5 PL account rows with correct percentages", () => {
    render(<GmvRatioPanel rows={fixtureRows} />);

    expect(screen.getByText("売上原価")).toBeTruthy();
    expect(screen.getByText("売上総利益")).toBeTruthy();
    expect(screen.getByText("販管費")).toBeTruthy();
    expect(screen.getByText("営業利益")).toBeTruthy();
    expect(screen.getByText("経常利益")).toBeTruthy();

    expect(screen.getByText("73.0%")).toBeTruthy();
    expect(screen.getByText("48.0%")).toBeTruthy();
    expect(screen.getByText("5.2%")).toBeTruthy();
    expect(screen.getByText("-5.2%")).toBeTruthy();
  });

  it("shows empty fallback when no data", () => {
    render(<GmvRatioPanel rows={[]} />);
    expect(screen.getByTestId("analysis-fallback-empty")).toBeTruthy();
  });

  it("displays ― for null values", () => {
    render(<GmvRatioPanel rows={rowsWithNulls} />);

    const emDashes = screen.getAllByText("―");
    expect(emDashes.length).toBeGreaterThanOrEqual(4);
  });
});
