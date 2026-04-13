import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  useUploadFlow: vi.fn(),
  selectFile: vi.fn(),
  commit: vi.fn(),
  reset: vi.fn(),
  dismissError: vi.fn(),
  dismissReplacementWarning: vi.fn(),
}))

vi.mock("../hooks/use-upload-flow", () => ({
  useUploadFlow: mocks.useUploadFlow,
}))

import { UploadSection } from "./upload-section"

const baseState = {
  phase: "idle" as const,
  file: null,
  scenarioInput: null,
  generatedLabel: null,
  detectedScenarios: null,
  replacementWarning: null,
  result: null,
  errorMessage: null,
  isReadingFile: false,
}

beforeEach(() => {
  mocks.useUploadFlow.mockReset()
  mocks.selectFile.mockReset()
  mocks.commit.mockReset()
  mocks.reset.mockReset()
  mocks.dismissError.mockReset()
  mocks.dismissReplacementWarning.mockReset()
})

describe("UploadSection", () => {
  it("shows an uploading status card while commit is in progress", () => {
    mocks.useUploadFlow.mockReturnValue({
      state: {
        ...baseState,
        phase: "uploading",
      },
      selectFile: mocks.selectFile,
      commit: mocks.commit,
      reset: mocks.reset,
      dismissError: mocks.dismissError,
      dismissReplacementWarning: mocks.dismissReplacementWarning,
    })

    render(<UploadSection />)

    expect(screen.getByText("アップロード中...")).toBeInTheDocument()
    expect(screen.queryByText("アップロード実行")).not.toBeInTheDocument()
  })

  it("shows loading affordances while the selected file is still being read", () => {
    mocks.useUploadFlow.mockReturnValue({
      state: {
        ...baseState,
        file: new File(["test"], "loglass.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        isReadingFile: true,
      },
      selectFile: mocks.selectFile,
      commit: mocks.commit,
      reset: mocks.reset,
      dismissError: mocks.dismissError,
      dismissReplacementWarning: mocks.dismissReplacementWarning,
    })

    render(<UploadSection />)

    expect(screen.getByText("loglass.xlsx")).toBeInTheDocument()
    expect(screen.getByText("ファイルを読み込み中...")).toBeInTheDocument()
    expect(screen.getByText("読み込み中...")).toBeInTheDocument()
  })

  it("shows a range-aware upload preview when metadata is available", () => {
    mocks.useUploadFlow.mockReturnValue({
      state: {
        ...baseState,
        phase: "file_selected",
        file: new File(["test"], "loglass.xlsx", {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        scenarioInput: {
          kind: "actual" as const,
          targetMonth: "2026-02",
          rangeStartMonth: "2025-04",
          rangeEndMonth: "2026-02",
          forecastStart: "2026-03",
        },
        generatedLabel: "2025/04月〜2026/02月実績(見込:3月~)",
        detectedScenarios: [
          {
            kind: "actual" as const,
            targetMonth: "2026-02",
            monthCount: 11,
            rowCount: 220,
            rangeStartMonth: "2025-04",
            rangeEndMonth: "2026-02",
          },
        ],
      },
      selectFile: mocks.selectFile,
      commit: mocks.commit,
      reset: mocks.reset,
      dismissError: mocks.dismissError,
      dismissReplacementWarning: mocks.dismissReplacementWarning,
    })

    render(<UploadSection />)

    expect(screen.getByText("2025/04月〜2026/02月実績(見込:3月~)")).toBeInTheDocument()
    expect(screen.getByText(/2025-04〜2026-02/)).toBeInTheDocument()
  })
})
