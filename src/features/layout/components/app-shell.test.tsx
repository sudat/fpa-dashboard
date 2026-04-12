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

  it("switches org tabs", () => {
    render(<AppShell />)
    fireEvent.click(screen.getByText("SaaS事業部"))
    expect(screen.getByText("SaaS事業部 — 着地見込 コンテンツ")).toBeInTheDocument()
  })

  it("preserves active org tab when switching time axis", () => {
    render(<AppShell />)
    fireEvent.click(screen.getByText("SaaS事業部"))
    fireEvent.click(screen.getByText("YTD"))
    expect(screen.getByText("SaaS事業部 — YTD コンテンツ")).toBeInTheDocument()
  })

  it("handles rapid tab switching without crashing", () => {
    render(<AppShell />)
    const buttons = ["SaaS事業部", "広告事業部", "EC事業部", "YTD", "単月", "全社", "着地見込"]
    for (const label of buttons) {
      fireEvent.click(screen.getByText(label))
    }
    expect(screen.getByText("全社 — 着地見込 コンテンツ")).toBeInTheDocument()
  })
})
