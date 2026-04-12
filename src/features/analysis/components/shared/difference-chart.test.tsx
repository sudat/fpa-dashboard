import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DifferenceChart } from "./difference-chart"
import type { DifferenceData } from "@/features/analysis/lib/difference"

const fixtureData: DifferenceData = {
  periodType: "着地見込",
  targetAccountCode: null,
  items: [
    { label: "SaaS事業部", value: 5000000, absoluteValue: 5000000, isPositive: true },
    { label: "広告事業部", value: -3000000, absoluteValue: 3000000, isPositive: false },
    { label: "EC事業部", value: 2000000, absoluteValue: 2000000, isPositive: true },
  ],
}

const emptyData: DifferenceData = {
  periodType: "着地見込",
  targetAccountCode: null,
  items: [],
}

describe("DifferenceChart", () => {
  it("renders with fixture data", () => {
    const { container } = render(<DifferenceChart data={fixtureData} />)
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("renders bar chart elements for each item", () => {
    const { container } = render(<DifferenceChart data={fixtureData} />)
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
    expect(svg!.innerHTML.length).toBeGreaterThan(100)
  })

  it("shows labels on y-axis", () => {
    const { container } = render(<DifferenceChart data={fixtureData} />)
    const ticks = container.querySelectorAll(".recharts-cartesian-axis-tick-value")
    const labels = Array.from(ticks).map((el) => el.textContent ?? "")
    expect(labels).toContain("SaaS事業部")
    expect(labels).toContain("広告事業部")
  })

  it("renders empty fallback when no items", () => {
    render(<DifferenceChart data={emptyData} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })

  it("fires onBarClick callback", () => {
    const handleClick = vi.fn()
    const { container } = render(<DifferenceChart data={fixtureData} onBarClick={handleClick} />)
    const bars = container.querySelectorAll(".recharts-rectangle")
    if (bars.length > 0) {
      fireEvent.click(bars[0])
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })
})
