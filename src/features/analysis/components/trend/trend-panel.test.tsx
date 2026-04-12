import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"
import { TrendPanel } from "./trend-panel"
import type { TrendSeries } from "@/features/analysis/lib/trend"

const fixtureSeries: TrendSeries = {
  accountCode: "BS100",
  accountName: "売上高",
  departmentCode: "DEPT001",
  periodType: "着地見込",
  points: [
    { yearMonth: "2026-01", amount: 10000000, type: "actual" },
    { yearMonth: "2026-02", amount: 12000000, type: "actual" },
    { yearMonth: "2026-03", amount: 13000000, type: "forecast" },
  ],
}

describe("TrendPanel", () => {
  it("renders chart when series provided", () => {
    const { container } = render(
      <TrendPanel series={fixtureSeries} metricMode="amount" onMetricModeChange={vi.fn()} />
    )
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("shows placeholder when series is null", () => {
    render(<TrendPanel series={null} metricMode="amount" onMetricModeChange={vi.fn()} />)
    const messages = screen.getAllByText("科目を選択してください")
    expect(messages.length).toBe(2)
    expect(messages[1]).toHaveClass("text-muted-foreground")
  })

  it("renders both metric toggle options", () => {
    render(<TrendPanel series={fixtureSeries} metricMode="amount" onMetricModeChange={vi.fn()} />)
    expect(screen.getByText("金額")).toBeInTheDocument()
    expect(screen.getByText("比率")).toBeInTheDocument()
  })

  it("fires onMetricModeChange when clicking toggle", async () => {
    const user = userEvent.setup()
    const onMetricModeChange = vi.fn()
    render(
      <TrendPanel series={fixtureSeries} metricMode="amount" onMetricModeChange={onMetricModeChange} />
    )

    await user.click(screen.getByText("比率"))
    expect(onMetricModeChange).toHaveBeenCalledWith("rate")
  })

  it("displays account name in header", () => {
    render(<TrendPanel series={fixtureSeries} metricMode="amount" onMetricModeChange={vi.fn()} />)
    expect(screen.getByText("売上高")).toBeInTheDocument()
  })
})
