import { Component, useMemo, type ReactNode } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DifferencePanel } from "@/features/analysis/components/difference/difference-panel"
import { DetailPanel } from "@/features/analysis/components/detail/detail-panel"
import { GmvRatioPanel } from "@/features/analysis/components/summary/gmv-ratio-panel"
import { TrendPanel } from "@/features/analysis/components/trend/trend-panel"
import { AnalysisFallback } from "@/features/analysis/components/shared/analysis-fallback"
import { selectDifferenceData, selectGmvRatios, selectSummaryRows, selectTrendSeries } from "@/features/analysis/lib/selectors"
import { getMajorAccountNames, parseComparisonRowKey, type SummaryRow } from "@/features/analysis/lib/summary"
import type { AnalysisActions, AnalysisState } from "@/features/analysis/state/use-analysis-state"
import { ORG_TABS, type OrgTab } from "@/features/layout/components/top-tabs"
import type { TimeAxis } from "@/features/layout/components/time-axis-pills"
import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass"
import type { LoglassNormalizedRow, LoglassPeriodType } from "@/lib/loglass/types"
import { cn } from "@/lib/utils"

const ORG_TAB_DEPARTMENT_CODE_MAP = ORG_TABS.reduce<Partial<Record<Exclude<OrgTab, "全社">, string>>>(
  (accumulator, tab, index) => {
    if (tab !== "全社") {
      accumulator[tab] = `D${String(index).padStart(3, "0")}`
    }

    return accumulator
  },
  {},
)

export interface AnalysisWorkspaceProps {
  state: AnalysisState
  actions: AnalysisActions
  comparisonData: ComparisonSet[]
  normalizedRows: LoglassNormalizedRow[]
  targetMonth: string
  loading?: boolean
  className?: string
}

export function resolveDepartmentCode(orgTab: OrgTab): string {
  if (orgTab === "全社") {
    return "ALL"
  }

  return ORG_TAB_DEPARTMENT_CODE_MAP[orgTab] ?? "ALL"
}

function resolveDepartmentScope(orgTab: OrgTab): "全社" | "事業部" {
  return orgTab === "全社" ? "全社" : "事業部"
}

function resolvePeriodType(timeAxis: TimeAxis): LoglassPeriodType {
  return timeAxis
}

function toSummaryRow(row: ComparisonSet, aggregateName: string): SummaryRow {
  return {
    accountCode: parseComparisonRowKey(row.rowKey).accountCode,
    accountName: row.accountName,
    aggregateName,
    periodType: row.periodType,
    A: row.A,
    B: row.B,
    BA: row.BA,
    C: row.C,
    BC: row.BC,
  }
}

interface PanelErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface PanelErrorBoundaryState {
  hasError: boolean
}

class PanelErrorBoundary extends Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <AnalysisFallback variant="error" />
    }
    return this.props.children
  }
}

export { PanelErrorBoundary }

export function AnalysisWorkspace({
  state,
  actions,
  comparisonData,
  normalizedRows,
  targetMonth,
  loading,
  className,
}: AnalysisWorkspaceProps) {
  const departmentCode = resolveDepartmentCode(state.activeOrgTab)
  const departmentScope = resolveDepartmentScope(state.activeOrgTab)
  const periodType = resolvePeriodType(state.activeTimeAxis)

  const summaryRows = useMemo(
    () => selectSummaryRows(comparisonData, departmentCode, periodType),
    [comparisonData, departmentCode, periodType],
  )

  const detailRows = useMemo(() => {
    const accountAggregateMap = new Map<string, string>()

    normalizedRows
      .filter((row) => row.department.code === departmentCode)
      .forEach((row) => {
        accountAggregateMap.set(row.account.code, row.account.aggregateName)
      })

    const groupedDetailRows = new Map<string, SummaryRow[]>()
    const majorAccountNames = new Set(getMajorAccountNames())

    comparisonData
      .filter((row) => row.periodType === periodType)
      .filter((row) => parseComparisonRowKey(row.rowKey).departmentCode === departmentCode)
      .forEach((row) => {
        const accountCode = parseComparisonRowKey(row.rowKey).accountCode
        const aggregateName = accountAggregateMap.get(accountCode)

        if (!aggregateName || !majorAccountNames.has(aggregateName) || aggregateName === row.accountName) {
          return
        }

        const bucket = groupedDetailRows.get(aggregateName) ?? []
        bucket.push(toSummaryRow(row, aggregateName))
        groupedDetailRows.set(aggregateName, bucket)
      })

    groupedDetailRows.forEach((rows, aggregateName) => {
      rows.sort((left, right) => left.accountName.localeCompare(right.accountName, "ja"))
      groupedDetailRows.set(aggregateName, rows)
    })

    return groupedDetailRows
  }, [comparisonData, departmentCode, normalizedRows, periodType])

  const selectedAccountCode = useMemo(
    () => summaryRows.find((row) => row.accountName === state.selectedAccount)?.accountCode ?? null,
    [state.selectedAccount, summaryRows],
  )

  const trendSeries = useMemo(() => {
    if (!selectedAccountCode) {
      return null
    }

    return selectTrendSeries(normalizedRows, selectedAccountCode, departmentCode, periodType, targetMonth)
  }, [departmentCode, normalizedRows, periodType, selectedAccountCode, targetMonth])

  const differenceData = useMemo(
    () => {
      const data = selectDifferenceData(comparisonData, departmentScope, departmentCode, periodType)

      if (departmentScope !== "全社") {
        return data
      }

      return {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          label: ORG_TABS.includes(item.label as OrgTab) ? `${item.label}\u2060` : item.label,
        })),
      }
    },
    [comparisonData, departmentCode, departmentScope, periodType],
  )

  const gmvRatioRows = useMemo(
    () => selectGmvRatios(comparisonData, departmentCode, periodType),
    [comparisonData, departmentCode, periodType],
  )

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-4", className)} data-testid="analysis-workspace" aria-live="polite">
        <AnalysisFallback variant="loading" />
        <AnalysisFallback variant="loading" className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} data-testid="analysis-workspace" aria-live="polite">
      <Tabs
        value={state.activeSubView}
        onValueChange={(value) => {
          if (value === "pl" || value === "gmv" || value === "trend" || value === "difference") {
            actions.setActiveSubView(value)
          }
        }}
      >
        <TabsList variant="line">
          <TabsTrigger value="pl">PL内訳</TabsTrigger>
          <TabsTrigger value="gmv">GMV比率</TabsTrigger>
          <TabsTrigger value="trend">推移グラフ</TabsTrigger>
          <TabsTrigger value="difference">差異分解</TabsTrigger>
        </TabsList>
        <TabsContent value="pl">
          <PanelErrorBoundary>
            <DetailPanel
              rows={summaryRows}
              detailRows={detailRows}
              highlightedRowId={state.weakLinkTarget?.accountName}
            />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="gmv">
          <PanelErrorBoundary>
            <GmvRatioPanel rows={gmvRatioRows} />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="trend">
          <PanelErrorBoundary>
            <TrendPanel
              series={trendSeries}
              metricMode={state.metricMode === "gmvRatio" ? "rate" : "amount"}
              onMetricModeChange={(mode) => actions.setMetricMode(mode === "rate" ? "gmvRatio" : "amount")}
            />
          </PanelErrorBoundary>
        </TabsContent>
        <TabsContent value="difference">
          <PanelErrorBoundary>
            <DifferencePanel
              data={differenceData}
              onBarClick={(item) => {
                actions.setWeakLinkTarget({
                  accountName: item.label,
                  expandedAt: Date.now(),
                })
              }}
            />
          </PanelErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}
