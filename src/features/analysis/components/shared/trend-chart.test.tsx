import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { TrendChart } from "./trend-chart"
import type { TrendSeries } from "@/features/analysis/lib/trend"

const fixtureSeries: TrendSeries = {
  accountCode: "BS100",
  accountName: "売上高",
  departmentCode: "DEPT001",
  periodType: "着地見込",
  points: [
    { yearMonth: "2026-01", amount: 10000000, type: "actual" },
    { yearMonth: "2026-02", amount: 12000000, type: "actual" },
    { yearMonth: "2026-03", amount: 11500000, type: "actual" },
    { yearMonth: "2026-04", amount: 13000000, type: "forecast" },
    { yearMonth: "2026-05", amount: 14000000, type: "forecast" },
  ],
}

const emptySeries: TrendSeries = {
  accountCode: "BS100",
  accountName: "売上高",
  departmentCode: "DEPT001",
  periodType: "着地見込",
  points: [],
}

describe("TrendChart", () => {
  it("renders with fixture data", () => {
    const { container } = render(<TrendChart series={fixtureSeries} />)
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("shows actual and forecast lines", () => {
    const { container } = render(<TrendChart series={fixtureSeries} />)
    const lines = container.querySelectorAll(".recharts-line-curve")
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it("formats x-axis labels as M月", () => {
    const { container } = render(<TrendChart series={fixtureSeries} />)
    const ticks = container.querySelectorAll(".recharts-cartesian-axis-tick-value")
    const labels = Array.from(ticks).map((el) => el.textContent ?? "")
    expect(labels.some((l) => l.includes("月"))).toBe(true)
  })

  it("renders empty fallback when no points", () => {
    render(<TrendChart series={emptySeries} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })

  it("renders reference line at last actual month", () => {
    const { container } = render(<TrendChart series={fixtureSeries} />)
    const refLines = container.querySelectorAll(".recharts-reference-line-line")
    expect(refLines.length).toBeGreaterThanOrEqual(1)
  })
})
