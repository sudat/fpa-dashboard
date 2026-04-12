import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { AdminPage } from "./admin-page"

describe("AdminPage", () => {
  it("renders page title", () => {
    render(<AdminPage />)
    expect(screen.getByText("管理画面")).toBeInTheDocument()
  })

  it("renders both import log and warnings sections", () => {
    render(<AdminPage />)
    expect(screen.getByText("取込結果ログ")).toBeInTheDocument()
    expect(screen.getByText("未マッピング警告")).toBeInTheDocument()
  })

  it("renders import log table with correct columns", () => {
    render(<AdminPage />)
    expect(screen.getByText("日時")).toBeInTheDocument()
    expect(screen.getByText("ファイル名")).toBeInTheDocument()
    expect(screen.getByText("件数")).toBeInTheDocument()
    expect(screen.getByText("ステータス")).toBeInTheDocument()
  })

  it("renders import log rows with mock data", () => {
    render(<AdminPage />)
    expect(screen.getByText("2026年4月_予実データ.xlsx")).toBeInTheDocument()
    expect(screen.getByText("2026年3月_予実データ.xlsx")).toBeInTheDocument()
    expect(screen.getByText("成功")).toBeInTheDocument()
    expect(screen.getByText("部分成功")).toBeInTheDocument()
  })

  it("renders master diff warning items", () => {
    render(<AdminPage />)
    expect(screen.getByText("AI研究開発費")).toBeInTheDocument()
    expect(screen.getByText("グローバル展開推進室")).toBeInTheDocument()
  })

  it("renders type badges for warnings", () => {
    render(<AdminPage />)
    expect(screen.getByText("新規科目")).toBeInTheDocument()
    expect(screen.getByText("新規部署")).toBeInTheDocument()
  })

  it("has 分析画面で確認 button", () => {
    render(<AdminPage />)
    expect(screen.getByText("分析画面で確認")).toBeInTheDocument()
  })

  it("calls onNavigateToAnalysis when button clicked", () => {
    const onNavigate = vi.fn()
    render(<AdminPage onNavigateToAnalysis={onNavigate} />)
    fireEvent.click(screen.getByText("分析画面で確認"))
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("shows empty state when no import results", () => {
    render(<AdminPage importResults={[]} />)
    expect(screen.getByText("取込履歴はありません")).toBeInTheDocument()
  })

  it("shows empty state when no warnings", () => {
    render(<AdminPage warnings={[]} />)
    expect(screen.getByText("警告はありません")).toBeInTheDocument()
  })
})
