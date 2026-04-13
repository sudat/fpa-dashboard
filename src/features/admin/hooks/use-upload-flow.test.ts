import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

const mocks = vi.hoisted(() => ({
  parseUploadWorkbookFromBase64: vi.fn(),
  getUploadHistory: vi.fn(),
  commitUpload: vi.fn(),
  isGasAvailable: vi.fn(() => true),
}))

vi.mock("../lib/detect-client", () => ({
  parseUploadWorkbookFromBase64: mocks.parseUploadWorkbookFromBase64,
}))

vi.mock("@/lib/gas/gas-client", () => ({
  gasClient: {
    getUploadHistory: mocks.getUploadHistory,
    commitUpload: mocks.commitUpload,
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
  mocks.parseUploadWorkbookFromBase64.mockReset()
  mocks.getUploadHistory.mockReset()
  mocks.commitUpload.mockReset()
  mocks.isGasAvailable.mockReset()
  mocks.parseUploadWorkbookFromBase64.mockReturnValue({
    rawRows: createUploadRows(),
    detectedScenarios: createDetectedScenarios(),
  })
  mocks.getUploadHistory.mockResolvedValue([])
  mocks.commitUpload.mockResolvedValue(createUploadMetadata())
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
    expect(mocks.commitUpload).not.toHaveBeenCalled()
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
    expect(mocks.commitUpload).toHaveBeenCalledTimes(1)
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
