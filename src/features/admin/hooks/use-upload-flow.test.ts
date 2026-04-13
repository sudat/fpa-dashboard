import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useUploadFlow } from "./use-upload-flow"

describe("useUploadFlow", () => {
  beforeEach(() => {
    vi.stubGlobal("FileReader", class MockFileReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null
      readAsDataURL() {
        this.result = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,dGVzdA=="
        this.onload?.()
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("starts in idle phase", () => {
    const { result } = renderHook(() => useUploadFlow())
    expect(result.current.state.phase).toBe("idle")
    expect(result.current.state.file).toBeNull()
    expect(result.current.state.scenarioInput).toBeNull()
  })

  it("selects a valid xlsx file and transitions to file_selected", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const file = new File(["test"], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    await act(async () => {
      await result.current.selectFile(file)
    })

    expect(result.current.state.phase).toBe("file_selected")
    expect(result.current.state.file?.name).toBe("data.xlsx")
    expect(result.current.state.fileBase64).toBe("dGVzdA==")
  })

  it("rejects non-xlsx files", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const file = new File(["test"], "data.csv", { type: "text/csv" })

    await act(async () => {
      await result.current.selectFile(file)
    })

    expect(result.current.state.phase).toBe("error")
    expect(result.current.state.errorMessage).toContain("xlsx")
  })

  it("sets scenario input and generates label", () => {
    const { result } = renderHook(() => useUploadFlow())

    act(() => {
      result.current.setScenarioInput({
        kind: "actual",
        targetMonth: "2026-04",
      })
    })

    expect(result.current.state.scenarioInput).toEqual({
      kind: "actual",
      targetMonth: "2026-04",
    })
    expect(result.current.state.generatedLabel).toBe("2026/04月実績")
  })

  it("sets scenario input with forecastStart", () => {
    const { result } = renderHook(() => useUploadFlow())

    act(() => {
      result.current.setScenarioInput({
        kind: "actual",
        targetMonth: "2026-04",
        forecastStart: "2026-06",
      })
    })

    expect(result.current.state.generatedLabel).toBe("2026/04月実績(見込:6月~)")
  })

  it("ignores invalid scenario input (forecastStart before targetMonth)", () => {
    const { result } = renderHook(() => useUploadFlow())

    act(() => {
      result.current.setScenarioInput({
        kind: "actual",
        targetMonth: "2026-06",
        forecastStart: "2026-04",
      })
    })

    expect(result.current.state.scenarioInput).toBeNull()
    expect(result.current.state.generatedLabel).toBeNull()
  })

  it("resets to idle state", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const file = new File(["test"], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    await act(async () => {
      await result.current.selectFile(file)
    })

    expect(result.current.state.phase).toBe("file_selected")

    act(() => {
      result.current.reset()
    })

    expect(result.current.state.phase).toBe("idle")
    expect(result.current.state.file).toBeNull()
  })

  it("runs preview and updates state with mock data (GAS unavailable)", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const file = new File(["test"], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    await act(async () => {
      await result.current.selectFile(file)
    })

    act(() => {
      result.current.setScenarioInput({
        kind: "budget",
        targetMonth: "2026-04",
      })
    })

    await act(async () => {
      await result.current.preview()
    })

    expect(result.current.state.preview).not.toBeNull()
    expect(result.current.state.preview?.rawRowCount).toBe(42)
    expect(result.current.state.replacementWarning).toBeNull()
    expect(result.current.state.phase).toBe("file_selected")
  })

  it("runs commit and transitions to success (GAS unavailable)", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const file = new File(["test"], "data.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })

    await act(async () => {
      await result.current.selectFile(file)
    })

    act(() => {
      result.current.setScenarioInput({
        kind: "budget",
        targetMonth: "2026-04",
      })
    })

    await act(async () => {
      await result.current.preview()
    })

    await act(async () => {
      await result.current.commit()
    })

    expect(result.current.state.phase).toBe("success")
    expect(result.current.state.result).not.toBeNull()
    expect(result.current.state.result?.generatedLabel).toBe("2026/04月予算")
  })

  it("dismisses error and returns to file_selected", async () => {
    const { result } = renderHook(() => useUploadFlow())
    const badFile = new File(["test"], "data.csv", { type: "text/csv" })

    await act(async () => {
      await result.current.selectFile(badFile)
    })

    expect(result.current.state.phase).toBe("error")

    act(() => {
      result.current.dismissError()
    })

    expect(result.current.state.phase).toBe("file_selected")
    expect(result.current.state.errorMessage).toBeNull()
  })
})
