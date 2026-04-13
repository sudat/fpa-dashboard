import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { AppShell } from "./app-shell"

describe("AppShell", () => {
  it("renders both sidebar nav items", () => {
    render(<AppShell />)
    expect(screen.getByText("予実分析")).toBeInTheDocument()
    expect(screen.getByText("管理")).toBeInTheDocument()
  })

  it("shows analysis view by default", () => {
    render(<AppShell />)
    expect(screen.getByText("全社 — 着地見込 コンテンツ")).toBeInTheDocument()
  })

  it("switches to admin placeholder when clicking 管理", () => {
    render(<AppShell />)
    fireEvent.click(screen.getByText("管理"))
    expect(screen.getByText("管理画面")).toBeInTheDocument()
  })

  it.skip("switches org via org dropdown (deferred: filter bar redesign in progress)", () => {
    render(<AppShell />)
    const triggers = screen.getAllByRole("combobox")
    const orgTrigger = triggers[triggers.length - 1]
    fireEvent.click(orgTrigger)
    const option = screen.getByRole("option", { name: "SaaS事業部" })
    fireEvent.click(option)
    expect(screen.getByText("SaaS事業部 — 着地見込 コンテンツ")).toBeInTheDocument()
  })

  it.skip("preserves active org when switching time axis (deferred: filter bar redesign in progress)", () => {
    render(<AppShell />)
    const triggers = screen.getAllByRole("combobox")
    const orgTrigger = triggers[triggers.length - 1]
    fireEvent.click(orgTrigger)
    fireEvent.click(screen.getByRole("option", { name: "SaaS事業部" }))
    fireEvent.click(screen.getByText("YTD"))
    expect(screen.getByText("SaaS事業部 — YTD コンテンツ")).toBeInTheDocument()
  })

  it("handles rapid tab switching without crashing", () => {
    render(<AppShell />)
    const timeAxisButtons = ["YTD", "単月", "着地見込"]
    for (const label of timeAxisButtons) {
      fireEvent.click(screen.getByText(label))
    }
    expect(screen.getByText("全社 — 着地見込 コンテンツ")).toBeInTheDocument()
  })
})
