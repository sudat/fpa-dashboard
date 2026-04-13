import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { AdminPage } from "./admin-page"
import type { MasterDiffWarningItem } from "./admin-page"

const mockWarnings: MasterDiffWarningItem[] = [
  { id: "w1", type: "new_account", code: "ACC-NEW-001", name: "AI研究開発費", status: "pending" },
  { id: "w2", type: "new_department", code: "DEPT-NEW-001", name: "グローバル展開推進室", status: "pending" },
]

describe("AdminPage", () => {
  it("renders page title", () => {
    render(<AdminPage />)
    expect(screen.getByText("管理画面")).toBeInTheDocument()
  })

  it("renders import log section with card title", () => {
    render(<AdminPage />)
    expect(screen.getByText("取込結果ログ")).toBeInTheDocument()
  })

  it("renders import log table with correct columns", () => {
    render(<AdminPage />)
    expect(screen.getByText("アップロード日時")).toBeInTheDocument()
    expect(screen.getByText("ファイル名")).toBeInTheDocument()
    expect(screen.getByText("ステータス")).toBeInTheDocument()
  })

  it("renders import log rows with mock data", () => {
    render(<AdminPage />)
    expect(screen.getByText("2026年4月_予実データ.xlsx")).toBeInTheDocument()
    expect(screen.getByText("2026年3月_予実データ.xlsx")).toBeInTheDocument()
    expect(screen.getByText("成功")).toBeInTheDocument()
    expect(screen.getByText("部分成功")).toBeInTheDocument()
  })

  it("renders warning items in sheet when a partial result is clicked", () => {
    render(<AdminPage />)
    const partialRow = screen.getByText("2026年3月_予実データ.xlsx")
    fireEvent.click(partialRow)
    expect(screen.getByText("AI研究開発費")).toBeInTheDocument()
    expect(screen.getByText("グローバル展開推進室")).toBeInTheDocument()
  })

  it("renders type badges for warnings in sheet", () => {
    render(<AdminPage />)
    const partialRow = screen.getByText("2026年3月_予実データ.xlsx")
    fireEvent.click(partialRow)
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
    expect(screen.getByText("取込結果ログ")).toBeInTheDocument()
  })
})
