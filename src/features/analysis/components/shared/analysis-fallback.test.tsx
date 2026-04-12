import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { AnalysisFallback } from "./analysis-fallback"

describe("AnalysisFallback", () => {
  describe("empty variant", () => {
    it("renders empty state with default message", () => {
      render(<AnalysisFallback variant="empty" />)
      expect(screen.getByTestId("analysis-fallback-empty")).toBeInTheDocument()
      expect(screen.getByText("―")).toBeInTheDocument()
    })

    it("renders empty state with custom message", () => {
      render(<AnalysisFallback variant="empty" message="科目を選択してください" />)
      expect(screen.getByText("科目を選択してください")).toBeInTheDocument()
    })
  })

  describe("error variant", () => {
    it("renders error state with default message", () => {
      render(<AnalysisFallback variant="error" />)
      expect(screen.getByTestId("analysis-fallback-error")).toBeInTheDocument()
      expect(screen.getByText("エラーが発生しました")).toBeInTheDocument()
    })

    it("renders error state with custom message", () => {
      render(<AnalysisFallback variant="error" message="データの取得に失敗しました" />)
      expect(screen.getByText("データの取得に失敗しました")).toBeInTheDocument()
    })

    it("renders retry button when onRetry is provided", () => {
      const onRetry = vi.fn()
      render(<AnalysisFallback variant="error" onRetry={onRetry} />)
      const retryButton = screen.getByText("再試行")
      expect(retryButton).toBeInTheDocument()

      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it("does not render retry button when onRetry is omitted", () => {
      render(<AnalysisFallback variant="error" />)
      expect(screen.queryByText("再試行")).not.toBeInTheDocument()
    })

    it("has alert role for accessibility", () => {
      render(<AnalysisFallback variant="error" />)
      expect(screen.getByTestId("analysis-fallback-error")).toHaveAttribute("role", "alert")
    })
  })

  describe("loading variant", () => {
    it("renders loading state", () => {
      render(<AnalysisFallback variant="loading" />)
      expect(screen.getByTestId("analysis-fallback-loading")).toBeInTheDocument()
      expect(screen.getByText("読み込み中...")).toBeInTheDocument()
    })

    it("renders skeleton bar", () => {
      const { container } = render(<AnalysisFallback variant="loading" />)
      const skeleton = container.querySelector(".h-2.w-24")
      expect(skeleton).toBeInTheDocument()
    })
  })

  describe("common behavior", () => {
    it("applies custom className", () => {
      render(<AnalysisFallback variant="empty" className="custom-class" />)
      expect(screen.getByTestId("analysis-fallback-empty")).toHaveClass("custom-class")
    })

    it("has status role for empty and loading variants", () => {
      render(<AnalysisFallback variant="empty" />)
      expect(screen.getByTestId("analysis-fallback-empty")).toHaveAttribute("role", "status")

      const { unmount } = render(<AnalysisFallback variant="empty" />)
      unmount()

      render(<AnalysisFallback variant="loading" />)
      expect(screen.getByTestId("analysis-fallback-loading")).toHaveAttribute("role", "status")
    })

    it("retry button fires callback multiple times", () => {
      const onRetry = vi.fn()
      render(<AnalysisFallback variant="error" onRetry={onRetry} />)
      const retryButton = screen.getByText("再試行")

      fireEvent.click(retryButton)
      fireEvent.click(retryButton)
      expect(onRetry).toHaveBeenCalledTimes(2)
    })
  })
})
