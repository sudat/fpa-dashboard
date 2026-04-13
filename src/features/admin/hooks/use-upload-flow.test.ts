import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => ({
  detectScenariosFromBase64: vi.fn(),
  parseUploadWorkbookFromBase64: vi.fn(),
  getUploadHistory: vi.fn(),
  startUploadSession: vi.fn(),
  appendUploadRows: vi.fn(),
  finalizeUploadSession: vi.fn(),
  abortUploadSession: vi.fn(),
  isGasAvailable: vi.fn(() => true),
}))

vi.mock("../lib/detect-client", () => ({
  detectScenariosFromBase64: mocks.detectScenariosFromBase64,
  parseUploadWorkbookFromBase64: mocks.parseUploadWorkbookFromBase64,
}))

vi.mock("@/lib/gas/gas-client", () => ({
  gasClient: {
    getUploadHistory: mocks.getUploadHistory,
    startUploadSession: mocks.startUploadSession,
    appendUploadRows: mocks.appendUploadRows,
    finalizeUploadSession: mocks.finalizeUploadSession,
    abortUploadSession: mocks.abortUploadSession,
  },
  isGasAvailable: mocks.isGasAvailable,
}))

import { useUploadFlow } from "./use-upload-flow"

class ImmediateFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null
  onerror: (() => void) | null = null
  result: string | null = null

  readAsDataURL() {
    this.result = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,dGVzdA=="
    this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>)
  }
}

function createFile() {
  return new File(["test"], "data.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

function createDetectedScenarios() {
  return [
    {
      kind: "actual" as const,
      targetMonth: "2026-02",
      monthCount: 11,
      rowCount: 220,
      firstMonth: "2025-04",
      lastMonth: "2026-02",
      scenarioKey: "実績",
    },
    {
      kind: "forecast" as const,
      targetMonth: "2026-02",
      monthCount: 1,
      rowCount: 20,
      firstMonth: "2026-03",
      lastMonth: "2026-03",
      forecastStart: "2026-03",
      scenarioKey: "26年3月期着地見込0224時点",
    },
  ]
}

function createUploadRows() {
  return [
    {
      シナリオ: "実績",
      年月度: "2026-02",
      科目コード: "A001",
      外部科目コード: "",
      科目: "売上高",
      科目タイプ: "収益",
      部署コード: "D001",
      外部部署コード: "",
      部署: "営業部",
      金額: 1200000,
    },
  ]
}

function createUploadMetadata() {
  return {
    uploadId: "upload-1",
    timestamp: "2026-02-15T10:30:00+09:00",
    uploader: "test@example.com",
    scenarioInput: {
      kind: "actual" as const,
      targetMonth: "2026-02",
      forecastStart: "2026-03",
    },
    generatedLabel: "2026/02月実績(見込:3月~)",
    replacementIdentity: {
      generatedLabel: "2026/02月実績(見込:3月~)",
      scenarioFamily: "actual" as const,
    },
    fileName: "actual_2026-02.xlsx",
  }
}

beforeEach(() => {
  vi.stubGlobal("FileReader", ImmediateFileReader)
  mocks.detectScenariosFromBase64.mockReset()
  mocks.parseUploadWorkbookFromBase64.mockReset()
  mocks.getUploadHistory.mockReset()
  mocks.startUploadSession.mockReset()
  mocks.appendUploadRows.mockReset()
  mocks.finalizeUploadSession.mockReset()
  mocks.abortUploadSession.mockReset()
  mocks.isGasAvailable.mockReset()
  mocks.detectScenariosFromBase64.mockReturnValue(createDetectedScenarios())
  mocks.parseUploadWorkbookFromBase64.mockReturnValue({
    rawRows: createUploadRows(),
    detectedScenarios: createDetectedScenarios(),
  })
  mocks.getUploadHistory.mockResolvedValue([])
  mocks.startUploadSession.mockResolvedValue({ uploadId: "upload-1" })
  mocks.appendUploadRows.mockResolvedValue(undefined)
  mocks.finalizeUploadSession.mockResolvedValue(createUploadMetadata())
  mocks.abortUploadSession.mockResolvedValue(true)
  mocks.isGasAvailable.mockReturnValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("useUploadFlow", () => {
  it("starts in idle phase", () => {
    const { result } = renderHook(() => useUploadFlow())
    expect(result.current.state.phase).toBe("idle")
    expect(result.current.state.file).toBeNull()
    expect(result.current.state.scenarioInput).toBeNull()
  })

  it("auto-populates an actual label with forecastStart from detected forecast rows", async () => {
    const { result } = renderHook(() => useUploadFlow())

    await act(async () => {
      await result.current.selectFile(createFile())
      await Promise.resolve()
    })

    expect(result.current.state.phase).toBe("file_selected")
    expect(result.current.state.scenarioInput).toEqual({
      kind: "actual",
      targetMonth: "2026-02",
      forecastStart: "2026-03",
    })
    expect(result.current.state.generatedLabel).toBe("2026/02月実績(見込:3月~)")
    expect(mocks.parseUploadWorkbookFromBase64).not.toHaveBeenCalled()
  })

  it("sets a reading state while FileReader is still pending", async () => {
    class ControlledFileReader {
      static latest: ControlledFileReader | null = null
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null

      constructor() {
        ControlledFileReader.latest = this
      }

      readAsDataURL() {}

      resolve() {
        this.result = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,dGVzdA=="
        this.onload?.(new ProgressEvent("load") as ProgressEvent<FileReader>)
      }
    }

    vi.stubGlobal("FileReader", ControlledFileReader)

    const { result } = renderHook(() => useUploadFlow())
    let pending: Promise<void> | undefined

    act(() => {
      pending = result.current.selectFile(createFile())
    })

    expect(result.current.state.isReadingFile).toBe(true)

    await act(async () => {
      ControlledFileReader.latest?.resolve()
      await pending
      await Promise.resolve()
    })

    expect(result.current.state.isReadingFile).toBe(false)
    expect(result.current.state.file?.name).toBe("data.xlsx")
  })

  it("shows a replacement warning before upload when the same label already exists", async () => {
    const { result } = renderHook(() => useUploadFlow())
    mocks.getUploadHistory.mockResolvedValue([createUploadMetadata()])

    await act(async () => {
      await result.current.selectFile(createFile())
    })

    await act(async () => {
      await result.current.commit()
    })

    expect(result.current.state.phase).toBe("warning_shown")
    expect(result.current.state.replacementWarning?.existingUploadId).toBe("upload-1")
    expect(mocks.startUploadSession).not.toHaveBeenCalled()
  })

  it("commits after confirmation when a replacement warning is shown", async () => {
    const { result } = renderHook(() => useUploadFlow())
    mocks.getUploadHistory.mockResolvedValue([createUploadMetadata()])

    await act(async () => {
      await result.current.selectFile(createFile())
    })

    await act(async () => {
      await result.current.commit()
    })

    expect(result.current.state.phase).toBe("warning_shown")

    await act(async () => {
      await result.current.commit()
    })

    expect(result.current.state.phase).toBe("success")
    expect(result.current.state.result?.generatedLabel).toBe("2026/02月実績(見込:3月~)")
    expect(mocks.startUploadSession).toHaveBeenCalledTimes(1)
    expect(mocks.parseUploadWorkbookFromBase64).toHaveBeenCalledWith("dGVzdA==")
    expect(mocks.startUploadSession).toHaveBeenCalledWith(
      "dGVzdA==",
      "data.xlsx",
      {
        kind: "actual",
        targetMonth: "2026-02",
        forecastStart: "2026-03",
      },
      expect.objectContaining({
        existingUploadId: "upload-1",
      }),
    )
    expect(mocks.appendUploadRows).toHaveBeenCalledWith("upload-1", createUploadRows())
    expect(mocks.finalizeUploadSession).toHaveBeenCalledWith("upload-1")
  })

  it("aborts the upload session when a chunk append fails", async () => {
    const { result } = renderHook(() => useUploadFlow())
    mocks.appendUploadRows.mockRejectedValueOnce(new Error("chunk failed"))

    await act(async () => {
      await result.current.selectFile(createFile())
    })

    await act(async () => {
      await result.current.commit()
    })

    expect(result.current.state.phase).toBe("error")
    expect(result.current.state.errorMessage).toContain("chunk failed")
    expect(mocks.abortUploadSession).toHaveBeenCalledWith("upload-1")
  })

  it("dismisses a validation error back to idle when no file is selected", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const badFile = new File(["test"], "data.csv", { type: "text/csv" })

    await act(async () => {
      await result.current.selectFile(badFile)
    })

    expect(result.current.state.phase).toBe("error")

    act(() => {
      result.current.dismissError()
    })

    expect(result.current.state.phase).toBe("idle")
    expect(result.current.state.errorMessage).toBeNull()
  })
})
