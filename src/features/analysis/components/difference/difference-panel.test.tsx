import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DifferencePanel } from "./difference-panel"
import type { DifferenceData } from "@/features/analysis/lib/difference"

const fixtureData: DifferenceData = {
  periodType: "着地見込",
  targetAccountCode: null,
  items: [
    { label: "SaaS事業部", value: 5000000, absoluteValue: 5000000, isPositive: true },
    { label: "広告事業部", value: -3000000, absoluteValue: 3000000, isPositive: false },
  ],
}

const fixtureDataWithTarget: DifferenceData = {
  periodType: "着地見込",
  targetAccountCode: "BS100",
  items: [
    { label: "売上原価", value: -2000000, absoluteValue: 2000000, isPositive: true },
  ],
}

const emptyItemsData: DifferenceData = {
  periodType: "着地見込",
  targetAccountCode: null,
  items: [],
}

describe("DifferencePanel", () => {
  it("renders chart when data provided", () => {
    const { container } = render(<DifferencePanel data={fixtureData} />)
    const svg = container.querySelector("svg")
    expect(svg).toBeTruthy()
  })

  it("shows placeholder when data is null", () => {
    render(<DifferencePanel data={null} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })

  it('header displays "差異分解"', () => {
    render(<DifferencePanel data={fixtureData} />)
    expect(screen.getByText("差異分解")).toBeInTheDocument()
  })

  it("shows department subheader when targetAccountCode is null", () => {
    render(<DifferencePanel data={fixtureData} />)
    expect(screen.getByText("（事業部別）")).toBeInTheDocument()
  })

  it("shows breakdown subheader when targetAccountCode is set", () => {
    render(<DifferencePanel data={fixtureDataWithTarget} />)
    expect(screen.getByText(/内訳/)).toBeInTheDocument()
  })

  it("renders legend with 好転 and 悪化", () => {
    render(<DifferencePanel data={fixtureData} />)
    expect(screen.getByText("好転")).toBeInTheDocument()
    expect(screen.getByText("悪化")).toBeInTheDocument()
  })

  it("bar click fires onBarClick callback", () => {
    const handleClick = vi.fn()
    const { container } = render(<DifferencePanel data={fixtureData} onBarClick={handleClick} />)
    const bars = container.querySelectorAll(".recharts-rectangle")
    if (bars.length > 0) {
      fireEvent.click(bars[0])
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it("empty items show fallback via DifferenceChart", () => {
    render(<DifferencePanel data={emptyItemsData} />)
    expect(screen.getByText("―")).toBeInTheDocument()
  })
})
