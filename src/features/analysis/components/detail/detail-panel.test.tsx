import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { DetailPanel } from "./detail-panel"
import type { SummaryRow } from "@/features/analysis/lib/summary"

const baseRows: SummaryRow[] = [
  {
    accountCode: "100",
    accountName: "売上高",
    aggregateName: "売上高",
    periodType: "着地見込",
    A: 100000000,
    B: 120000000,
    BA: 20000000,
    C: 95000000,
    BC: 25000000,
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
    accountCode: "500",
    accountName: "営業利益",
    aggregateName: "営業利益",
    periodType: "着地見込",
    A: 20000000,
    B: 33000000,
    BA: 13000000,
    C: 19000000,
    BC: 14000000,
  },
]

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
]

const detailMap = new Map<string, SummaryRow[]>([
  [
    "売上高",
    [
      {
        accountCode: "110",
        accountName: "製品売上",
        aggregateName: "売上高",
        periodType: "着地見込",
        A: 70000000,
        B: 85000000,
        BA: 15000000,
        C: 65000000,
        BC: 20000000,
      },
      {
        accountCode: "120",
        accountName: "サービス売上",
        aggregateName: "売上高",
        periodType: "着地見込",
        A: 30000000,
        B: 35000000,
        BA: 5000000,
        C: 30000000,
        BC: 5000000,
      },
    ],
  ],
])

describe("DetailPanel", () => {
  it("renders rows with account names", () => {
    render(<DetailPanel rows={baseRows} />)
    expect(screen.getByText("売上高")).toBeInTheDocument()
    expect(screen.getByText("売上原価")).toBeInTheDocument()
    expect(screen.getByText("営業利益")).toBeInTheDocument()
  })

  it("renders column headers", () => {
    render(<DetailPanel rows={baseRows} />)
    expect(screen.getByText("科目名")).toBeInTheDocument()
    expect(screen.getByText("A")).toBeInTheDocument()
    expect(screen.getByText("B")).toBeInTheDocument()
    expect(screen.getByText("B-A")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()
    expect(screen.getByText("B-C")).toBeInTheDocument()
  })

  it("renders the section header", () => {
    render(<DetailPanel rows={baseRows} />)
    expect(screen.getByText("詳細テーブル")).toBeInTheDocument()
  })

  it("shows expand toggle for rows with detail data", () => {
    render(<DetailPanel rows={baseRows} detailRows={detailMap} />)
    const expandButtons = screen.getAllByRole("button", { name: /展開する|折りたたむ/ })
    expect(expandButtons.length).toBe(1)
  })

  it("expands to reveal detail rows on click", () => {
    render(<DetailPanel rows={baseRows} detailRows={detailMap} />)

    const expandButton = screen.getByRole("button", { name: "展開する" })
    fireEvent.click(expandButton)

    expect(screen.getByText("製品売上")).toBeInTheDocument()
    expect(screen.getByText("サービス売上")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "折りたたむ" })).toBeInTheDocument()
  })

  it("collapses detail rows on second click", () => {
    render(<DetailPanel rows={baseRows} detailRows={detailMap} />)

    const expandButton = screen.getByRole("button", { name: "展開する" })
    fireEvent.click(expandButton)
    expect(screen.getByText("製品売上")).toBeInTheDocument()

    const collapseButton = screen.getByRole("button", { name: "折りたたむ" })
    fireEvent.click(collapseButton)
    expect(screen.queryByText("製品売上")).not.toBeInTheDocument()
  })

  it("shows ― for null values", () => {
    render(<DetailPanel rows={rowsWithNulls} />)
    const emDashes = screen.getAllByText("―")
    expect(emDashes.length).toBeGreaterThanOrEqual(5)
  })

  it("highlights the specified row", () => {
    const { container } = render(
      <DetailPanel rows={baseRows} highlightedRowId="200" />,
    )
    const rows = container.querySelectorAll("tbody tr")
    const highlightedRow = Array.from(rows).find((r) =>
      r.textContent?.includes("売上原価"),
    )
    expect(highlightedRow?.className).toContain("bg-accent")
  })

  it("shows fallback when no rows", () => {
    render(<DetailPanel rows={[]} />)
    expect(screen.getByText("詳細テーブル")).toBeInTheDocument()
    const emDashes = screen.getAllByText("―")
    expect(emDashes.length).toBeGreaterThanOrEqual(1)
  })
})
