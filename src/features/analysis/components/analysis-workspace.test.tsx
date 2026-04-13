import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import { generateComparisonData, normalizeRawRows } from "@/features/admin/lib/normalize-loglass"
import { aggregateByDepartment } from "@/features/admin/lib/grouping"
import { buildAnalysisFixtureRawRows } from "@/features/analysis/hooks/use-analysis-data"
import type { SummaryRow } from "@/features/analysis/lib/summary"
import {
  DEFAULT_STATE,
  useAnalysisState,
  type AnalysisActions,
  type AnalysisState,
} from "@/features/analysis/state/use-analysis-state"

const majorAccountSummaryPropsSpy = vi.fn()
const trendPanelPropsSpy = vi.fn()
const differencePanelPropsSpy = vi.fn()
const detailPanelPropsSpy = vi.fn()

vi.mock("@/features/analysis/components/summary/major-account-summary", () => ({
  MajorAccountSummary: ({
    rows,
    selectedAccount,
    onAccountSelect,
  }: {
    rows: SummaryRow[]
    selectedAccount: string | null
    onAccountSelect: (account: string | null) => void
  }) => {
    majorAccountSummaryPropsSpy({ rows, selectedAccount })

    return (
      <div data-testid="major-account-summary">
        <button type="button" onClick={() => onAccountSelect(rows[0]?.accountName ?? null)}>
          summary-select-first
        </button>
      </div>
    )
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
    />
  )
}

describe("AnalysisWorkspace", () => {
  beforeEach(() => {
    majorAccountSummaryPropsSpy.mockClear()
    trendPanelPropsSpy.mockClear()
    differencePanelPropsSpy.mockClear()
    detailPanelPropsSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders summary, trend, difference, and detail sections", () => {
    renderWorkspace()

    expect(screen.getByTestId("major-account-summary")).toBeInTheDocument()
    expect(screen.getByText("差異分解")).toBeInTheDocument()
    expect(screen.getByText(/詳細テーブル:/)).toBeInTheDocument()
    expect(screen.getAllByText("科目を選択してください").length).toBeGreaterThan(0)
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
      />,
    )

    rerender(
      <AnalysisWorkspace
        state={{ ...DEFAULT_STATE, activeOrgTab: "広告事業部" }}
        actions={createActions()}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
      />,
    )

    expect(screen.getByText("差異分解")).toBeInTheDocument()
    expect(screen.getByText(/詳細テーブル:/)).toBeInTheDocument()
  })

  it("resolves department codes for 全社 and 事業部 tabs", () => {
    expect(resolveDepartmentCode("全社")).toBe("ALL")
    expect(resolveDepartmentCode("SaaS事業部")).toBe("D001")
    expect(resolveDepartmentCode("広告事業部")).toBe("D002")
  })

  it("summary card click fires setSelectedAccount only", () => {
    const actions = createActions()

    render(
      <AnalysisWorkspace
        state={DEFAULT_STATE}
        actions={actions}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "summary-select-first" }))

    expect(actions.setSelectedAccount).toHaveBeenCalledTimes(1)
    expect(actions.setSelectedAccount).toHaveBeenCalledWith("売上高")
    expect(actions.setWeakLinkTarget).not.toHaveBeenCalled()
    expect(actions.setMetricMode).not.toHaveBeenCalled()
  })

  it("difference bar click fires setWeakLinkTarget", () => {
    const actions = createActions()

    render(
      <AnalysisWorkspace
        state={DEFAULT_STATE}
        actions={actions}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
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
