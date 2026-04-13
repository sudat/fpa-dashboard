import React from "react"

import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { generateComparisonData, normalizeRawRows } from "@/features/admin/lib/normalize-loglass"
import { aggregateByDepartment } from "@/features/admin/lib/grouping"
import { buildAnalysisFixtureRawRows } from "@/features/analysis/hooks/use-analysis-data"
import {
  DEFAULT_STATE,
  useAnalysisState,
  type AnalysisActions,
  type AnalysisState,
} from "@/features/analysis/state/use-analysis-state"

const gmvRatioPanelPropsSpy = vi.fn()
const trendPanelPropsSpy = vi.fn()
const differencePanelPropsSpy = vi.fn()
const detailPanelPropsSpy = vi.fn()

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => {
    void onValueChange

    return (
      <div data-testid="tabs" data-value={value}>
        {children}
      </div>
    )
  },
  TabsList: ({ children, ...props }: { children: React.ReactNode; variant?: string }) => {
    return (
      <div data-testid="tabs-list" data-variant={props.variant}>
        {children}
      </div>
    )
  },
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => {
    return (
      <button type="button" data-testid={`tab-trigger-${value}`}>
        {children}
      </button>
    )
  },
  TabsContent: ({ value, children }: { value: string; children: React.ReactNode }) => {
    return <div data-testid={`tab-content-${value}`}>{children}</div>
  },
}))

vi.mock("@/features/analysis/components/summary/gmv-ratio-panel", () => ({
  GmvRatioPanel: ({ rows }: { rows: Array<{ accountName: string }> }) => {
    gmvRatioPanelPropsSpy({ rows })
    return <div data-testid="gmv-ratio-panel">GMV比率パネル:{rows.length}件</div>
  },
}))

vi.mock("@/features/analysis/components/trend/trend-panel", () => ({
  TrendPanel: ({ series }: { series: { accountName?: string } | null }) => {
    trendPanelPropsSpy({ series })

    return <div>{series ? `trend:${series.accountName ?? "loaded"}` : "科目を選択してください"}</div>
  },
}))

vi.mock("@/features/analysis/components/difference/difference-panel", () => ({
  DifferencePanel: ({
    data,
    onBarClick,
  }: {
    data: { items: { label: string }[] } | null
    onBarClick?: (item: { label: string }) => void
  }) => {
    differencePanelPropsSpy({ data })

    return (
      <div>
        <div>差異分解</div>
        <button type="button" onClick={() => data?.items[0] && onBarClick?.(data.items[0])}>
          difference-click-first
        </button>
      </div>
    )
  },
}))

vi.mock("@/features/analysis/components/detail/detail-panel", () => ({
  DetailPanel: ({ highlightedRowId }: { highlightedRowId?: string }) => {
    detailPanelPropsSpy({ highlightedRowId })

    return <div>{`詳細テーブル:${highlightedRowId ?? "none"}`}</div>
  },
}))

import { AnalysisWorkspace, resolveDepartmentCode } from "./analysis-workspace"

const normalizedRows = aggregateByDepartment(normalizeRawRows(buildAnalysisFixtureRawRows()))
const comparisonData = generateComparisonData(normalizedRows, "2026-02")

function createActions(): AnalysisActions {
  return {
    setActiveOrgTab: vi.fn(),
    setActiveTimeAxis: vi.fn(),
    setSelectedAccount: vi.fn(),
    setMetricMode: vi.fn(),
    setWeakLinkTarget: vi.fn(),
    setActiveSubView: vi.fn(),
    resetSelections: vi.fn(),
  }
}

function renderWorkspace(overrides: Partial<AnalysisState> = {}) {
  const state: AnalysisState = {
    ...DEFAULT_STATE,
    ...overrides,
  }

  return render(
    <AnalysisWorkspace
      state={state}
      actions={createActions()}
      comparisonData={comparisonData}
      normalizedRows={normalizedRows}
      targetMonth="2026-02"
    />,
  )
}

function AnalysisWorkspaceHarness() {
  const [state, actions] = useAnalysisState()

  return (
    <AnalysisWorkspace
      state={state}
      actions={actions}
      comparisonData={comparisonData}
      normalizedRows={normalizedRows}
      targetMonth="2026-02"
    />
  )
}

describe("AnalysisWorkspace", () => {
  beforeEach(() => {
    gmvRatioPanelPropsSpy.mockClear()
    trendPanelPropsSpy.mockClear()
    differencePanelPropsSpy.mockClear()
    detailPanelPropsSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders 4 tab triggers and content panels", () => {
    renderWorkspace()

    expect(screen.getByTestId("tabs")).toBeInTheDocument()
    expect(screen.getByTestId("tab-trigger-pl")).toHaveTextContent("PL内訳")
    expect(screen.getByTestId("tab-trigger-gmv")).toHaveTextContent("GMV比率")
    expect(screen.getByTestId("tab-trigger-trend")).toHaveTextContent("推移グラフ")
    expect(screen.getByTestId("tab-trigger-difference")).toHaveTextContent("差異分解")
    expect(screen.getByTestId("tab-content-pl")).toBeInTheDocument()
    expect(screen.getByTestId("tab-content-gmv")).toBeInTheDocument()
    expect(screen.getByTestId("tab-content-trend")).toBeInTheDocument()
    expect(screen.getByTestId("tab-content-difference")).toBeInTheDocument()
  })

  it("renders selected account trend series when an account is selected", () => {
    renderWorkspace({ activeOrgTab: "SaaS事業部", selectedAccount: "売上高" })

    expect(screen.getByText(/trend:/)).toBeInTheDocument()
  })

  it("switching org tab does not crash and keeps common screen grammar", () => {
    const { rerender } = render(
      <AnalysisWorkspace
        state={DEFAULT_STATE}
        actions={createActions()}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
        targetMonth="2026-02"
      />,
    )

    rerender(
      <AnalysisWorkspace
        state={{ ...DEFAULT_STATE, activeOrgTab: "広告事業部" }}
        actions={createActions()}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
        targetMonth="2026-02"
      />,
    )

    expect(screen.getByTestId("tabs")).toBeInTheDocument()
    expect(screen.getByText(/詳細テーブル:/)).toBeInTheDocument()
  })

  it("resolves department codes for 全社 and 事業部 tabs", () => {
    expect(resolveDepartmentCode("全社")).toBe("ALL")
    expect(resolveDepartmentCode("SaaS事業部")).toBe("D001")
    expect(resolveDepartmentCode("広告事業部")).toBe("D002")
  })

  it("difference bar click fires setWeakLinkTarget", () => {
    const actions = createActions()

    render(
      <AnalysisWorkspace
        state={DEFAULT_STATE}
        actions={actions}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
        targetMonth="2026-02"
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "difference-click-first" }))

    expect(actions.setWeakLinkTarget).toHaveBeenCalledTimes(1)
    expect(actions.setWeakLinkTarget).toHaveBeenCalledWith({
      accountName: "SaaS事業部\u2060",
      expandedAt: expect.any(Number),
    })
  })

  it("passes highlightedRowId to DetailPanel from weakLinkTarget", () => {
    renderWorkspace({ weakLinkTarget: { accountName: "広告事業部\u2060", expandedAt: 123 } })

    expect(screen.getByText("詳細テーブル:広告事業部\u2060")).toBeInTheDocument()
    expect(detailPanelPropsSpy).toHaveBeenLastCalledWith({ highlightedRowId: "広告事業部\u2060" })
  })

  it("passes gmvRatioRows to GmvRatioPanel", () => {
    renderWorkspace()

    expect(gmvRatioPanelPropsSpy).toHaveBeenCalled()
    const { rows } = gmvRatioPanelPropsSpy.mock.calls[0][0]
    expect(rows.length).toBeGreaterThan(0)
  })

  it("clicking a difference bar sets and auto-clears weak link target after 3 seconds", () => {
    vi.useFakeTimers()

    render(<AnalysisWorkspaceHarness />)

    expect(screen.getByText("詳細テーブル:none")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "difference-click-first" }))

    expect(screen.getByText("詳細テーブル:SaaS事業部\u2060")).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText("詳細テーブル:none")).toBeInTheDocument()
  })
})
