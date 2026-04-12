import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MajorAccountSummary } from "./major-account-summary";
import type { SummaryRow } from "@/features/analysis/lib/summary";

const fixtureRows: SummaryRow[] = [
  {
    accountCode: "100",
    accountName: "売上高",
    aggregateName: "売上高",
    periodType: "着地見込",
    A: 100000000,
    B: 123456789,
    BA: 23456789,
    C: 95000000,
    BC: 28456789,
  },
  {
    accountCode: "200",
    accountName: "売上原価",
    aggregateName: "売上原価",
    periodType: "着地見込",
    A: 50000000,
    B: 55000000,
    BA: 5000000,
    C: 48000000,
    BC: 7000000,
  },
  {
    accountCode: "300",
    accountName: "売上総利益",
    aggregateName: "売上総利益",
    periodType: "着地見込",
    A: 50000000,
    B: 68456789,
    BA: 18456789,
    C: 47000000,
    BC: 21456789,
  },
  {
    accountCode: "400",
    accountName: "販管費",
    aggregateName: "販管費",
    periodType: "着地見込",
    A: 30000000,
    B: 35000000,
    BA: 5000000,
    C: 28000000,
    BC: 7000000,
  },
  {
    accountCode: "500",
    accountName: "営業利益",
    aggregateName: "営業利益",
    periodType: "着地見込",
    A: 20000000,
    B: 33456789,
    BA: 13456789,
    C: 19000000,
    BC: 14456789,
  },
];

const rowsWithNulls: SummaryRow[] = [
  {
    accountCode: "500",
    accountName: "営業利益",
    aggregateName: "営業利益",
    periodType: "着地見込",
    A: null,
    B: null,
    BA: null,
    C: null,
    BC: null,
  },
];

const rowsWithNegative: SummaryRow[] = [
  {
    accountCode: "500",
    accountName: "営業利益",
    aggregateName: "営業利益",
    periodType: "着地見込",
    A: 30000000,
    B: 25000000,
    BA: -5000000,
    C: 32000000,
    BC: -7000000,
  },
];

describe("MajorAccountSummary", () => {
  it("renders all 5 major account cards", () => {
    render(<MajorAccountSummary rows={fixtureRows} />);
    expect(screen.getByTestId("major-account-summary")).toBeTruthy();
    expect(screen.getByTestId("summary-card-売上高")).toBeTruthy();
    expect(screen.getByTestId("summary-card-売上原価")).toBeTruthy();
    expect(screen.getByTestId("summary-card-売上総利益")).toBeTruthy();
    expect(screen.getByTestId("summary-card-販管費")).toBeTruthy();
    expect(screen.getByTestId("summary-card-営業利益")).toBeTruthy();
  });

  it("shows formatted currency values in compact mode", () => {
    render(<MajorAccountSummary rows={fixtureRows} />);
    const card = screen.getByTestId("summary-card-売上高");
    const bValue = card.querySelector('[data-value="B"]');
    expect(bValue?.textContent).toBe("1.2億");
  });

  it("shows delta with correct sign for positive value", () => {
    render(<MajorAccountSummary rows={fixtureRows} />);
    const card = screen.getByTestId("summary-card-売上高");
    const baValue = card.querySelector('[data-value="BA"]');
    expect(baValue?.textContent).toContain("+");
  });

  it("shows delta with correct sign for negative value", () => {
    render(<MajorAccountSummary rows={rowsWithNegative} />);
    const card = screen.getByTestId("summary-card-営業利益");
    const baValue = card.querySelector('[data-value="BA"]');
    expect(baValue?.textContent).toContain("△");
  });

  it("handles null values showing em-dash", () => {
    render(<MajorAccountSummary rows={rowsWithNulls} />);
    const card = screen.getByTestId("summary-card-営業利益");
    const bValue = card.querySelector('[data-value="B"]');
    expect(bValue?.textContent).toBe("―");
    const baValue = card.querySelector('[data-value="BA"]');
    expect(baValue?.textContent).toBe("―");
  });

  it("shows empty fallback when no data", () => {
    render(<MajorAccountSummary rows={[]} />);
    expect(screen.getByTestId("major-account-summary-empty")).toBeTruthy();
    expect(screen.getByText("―")).toBeTruthy();
  });

  it("fires onAccountSelect callback on card click", () => {
    const handleSelect = vi.fn();
    render(
      <MajorAccountSummary rows={fixtureRows} onAccountSelect={handleSelect} />,
    );
    fireEvent.click(screen.getByTestId("summary-card-売上高"));
    expect(handleSelect).toHaveBeenCalledWith("売上高");
  });

  it("highlights selected card", () => {
    render(
      <MajorAccountSummary rows={fixtureRows} selectedAccount="売上原価" />,
    );
    const selectedCard = screen.getByTestId("summary-card-売上原価");
    expect(selectedCard.className).toContain("ring-2");
    const unselectedCard = screen.getByTestId("summary-card-売上高");
    expect(unselectedCard.className).not.toContain("ring-2");
  });
});
