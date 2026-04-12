import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useAnalysisState, DEFAULT_STATE } from "./use-analysis-state"

describe("useAnalysisState", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns correct default state", () => {
    const { result } = renderHook(() => useAnalysisState())
    const [state] = result.current

    expect(state.activeOrgTab).toBe("全社")
    expect(state.activeTimeAxis).toBe("着地見込")
    expect(state.selectedAccount).toBeNull()
    expect(state.metricMode).toBe("amount")
    expect(state.weakLinkTarget).toBeNull()
    expect(state.activeSubView).toBe("trend")
  })

  it("setActiveTimeAxis does not change activeOrgTab", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setActiveOrgTab("SaaS事業部")
    })
    act(() => {
      result.current[1].setActiveTimeAxis("YTD")
    })

    const [state] = result.current
    expect(state.activeOrgTab).toBe("SaaS事業部")
    expect(state.activeTimeAxis).toBe("YTD")
  })

  it("setActiveOrgTab does not change activeTimeAxis", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setActiveTimeAxis("単月")
    })
    act(() => {
      result.current[1].setActiveOrgTab("広告事業部")
    })

    const [state] = result.current
    expect(state.activeTimeAxis).toBe("単月")
    expect(state.activeOrgTab).toBe("広告事業部")
  })

  it("setSelectedAccount does not change activeSubView", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setActiveSubView("table")
    })
    act(() => {
      result.current[1].setSelectedAccount("売上高")
    })

    const [state] = result.current
    expect(state.selectedAccount).toBe("売上高")
    expect(state.activeSubView).toBe("table")
  })

  it("setMetricMode toggles between amount and gmvRatio", () => {
    const { result } = renderHook(() => useAnalysisState())

    expect(result.current[0].metricMode).toBe("amount")

    act(() => {
      result.current[1].setMetricMode("gmvRatio")
    })
    expect(result.current[0].metricMode).toBe("gmvRatio")

    act(() => {
      result.current[1].setMetricMode("amount")
    })
    expect(result.current[0].metricMode).toBe("amount")
  })

  it("resetSelections returns to default state but preserves org tab and time axis", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setActiveOrgTab("EC事業部")
      result.current[1].setActiveTimeAxis("YTD")
      result.current[1].setSelectedAccount("売上高")
      result.current[1].setMetricMode("gmvRatio")
      result.current[1].setActiveSubView("table")
    })

    act(() => {
      result.current[1].resetSelections()
    })

    const [state] = result.current
    expect(state.activeOrgTab).toBe("EC事業部")
    expect(state.activeTimeAxis).toBe("YTD")
    expect(state.selectedAccount).toBeNull()
    expect(state.metricMode).toBe("amount")
    expect(state.activeSubView).toBe("trend")
    expect(state.weakLinkTarget).toBeNull()
  })

  it("setWeakLinkTarget stores the target", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setWeakLinkTarget({ accountName: "売上高", expandedAt: Date.now() })
    })

    expect(result.current[0].weakLinkTarget).toEqual({
      accountName: "売上高",
      expandedAt: expect.any(Number),
    })
  })

  it("weak link auto-expires after 3 seconds", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setWeakLinkTarget({ accountName: "売上高", expandedAt: null })
    })
    expect(result.current[0].weakLinkTarget).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(result.current[0].weakLinkTarget).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current[0].weakLinkTarget).toBeNull()
  })

  it("setWeakLinkTarget with null clears immediately", () => {
    const { result } = renderHook(() => useAnalysisState())

    act(() => {
      result.current[1].setWeakLinkTarget({ accountName: "売上高", expandedAt: null })
    })
    expect(result.current[0].weakLinkTarget).not.toBeNull()

    act(() => {
      result.current[1].setWeakLinkTarget(null)
    })
    expect(result.current[0].weakLinkTarget).toBeNull()
  })
})
