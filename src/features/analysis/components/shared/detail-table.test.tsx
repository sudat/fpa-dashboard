import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { DetailTable, NullCell, FinancialCell } from "./detail-table"
import type { ColumnDef } from "@tanstack/react-table"

interface TestRow {
  id: string
  name: string
  amount: number | null
  sub?: TestRow[]
}

const columns: ColumnDef<TestRow>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "名称" },
  {
    accessorKey: "amount",
    header: "金額",
    cell: ({ getValue }) => <FinancialCell value={getValue()} />,
  },
]

const fixtureData: TestRow[] = [
  { id: "R1", name: "売上高", amount: 10000000 },
  { id: "R2", name: "売上原価", amount: null },
  { id: "R3", name: "営業利益", amount: 5000000 },
]

describe("DetailTable", () => {
  it("renders rows from fixture data", () => {
    render(<DetailTable data={fixtureData} columns={columns} />)
    expect(screen.getByText("売上高")).toBeInTheDocument()
    expect(screen.getByText("売上原価")).toBeInTheDocument()
    expect(screen.getByText("営業利益")).toBeInTheDocument()
  })

  it("shows column headers", () => {
    render(<DetailTable data={fixtureData} columns={columns} />)
    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("名称")).toBeInTheDocument()
    expect(screen.getByText("金額")).toBeInTheDocument()
  })

  it("displays ― for null values", () => {
    render(<DetailTable data={fixtureData} columns={columns} />)
    const emDashes = screen.getAllByText("―")
    expect(emDashes.length).toBeGreaterThanOrEqual(1)
  })

  it("renders empty fallback when no rows", () => {
    render(<DetailTable data={[]} columns={columns} />)
    const emDashes = screen.getAllByText("―")
    expect(emDashes.length).toBeGreaterThanOrEqual(1)
  })

  it("highlights the specified row", () => {
    const { container } = render(
      <DetailTable data={fixtureData} columns={columns} highlightedRowId="R2" getRowId={(row) => row.id} />,
    )
    const rows = container.querySelectorAll("tbody tr")
    const highlightedRow = Array.from(rows).find((r) =>
      r.textContent?.includes("売上原価"),
    )
    expect(highlightedRow?.className).toContain("bg-accent")
  })
})

describe("FinancialCell", () => {
  it("renders formatted value", () => {
    render(<FinancialCell value="1,000万" />)
    expect(screen.getByText("1,000万")).toBeInTheDocument()
  })

  it("renders ― for null", () => {
    render(<FinancialCell value={null} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })
})

describe("NullCell", () => {
  it("renders value as string", () => {
    render(<NullCell value="hello" />)
    expect(screen.getByText("hello")).toBeInTheDocument()
  })

  it("renders ― for null", () => {
    render(<NullCell value={null} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })
})
