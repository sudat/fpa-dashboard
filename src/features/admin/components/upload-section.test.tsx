import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  useUploadFlow: vi.fn(),
  selectFile: vi.fn(),
  commit: vi.fn(),
  reset: vi.fn(),
  dismissError: vi.fn(),
}))

vi.mock("../hooks/use-upload-flow", () => ({
  useUploadFlow: mocks.useUploadFlow,
}))

import { UploadSection } from "./upload-section"

const baseState = {
  phase: "idle" as const,
  file: null,
  fileBase64: null,
  scenarioInput: null,
  generatedLabel: null,
  preview: null,
  detectedScenarios: null,
  replacementWarning: null,
  result: null,
  errorMessage: null,
  isReadingFile: false,
  isPreviewLoading: false,
}

beforeEach(() => {
  mocks.useUploadFlow.mockReset()
  mocks.selectFile.mockReset()
  mocks.commit.mockReset()
  mocks.reset.mockReset()
  mocks.dismissError.mockReset()
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
    })

    render(<UploadSection />)

    expect(screen.getByText("loglass.xlsx")).toBeInTheDocument()
    expect(screen.getByText("ファイルを読み込み中...")).toBeInTheDocument()
    expect(screen.getByText("読み込み中...")).toBeInTheDocument()
  })
})
