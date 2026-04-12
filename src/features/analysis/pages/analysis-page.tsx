import { useMemo } from "react"

import { aggregateByDepartment } from "@/features/admin/lib/grouping"
import { generateComparisonData, normalizeRawRows } from "@/features/admin/lib/normalize-loglass"
import { AnalysisWorkspace } from "@/features/analysis/components/analysis-workspace"
import type { AnalysisActions, AnalysisState } from "@/features/analysis/state/use-analysis-state"
import { loglassSmallRawFixture } from "@/lib/fixtures/loglass-small"
import type { LoglassRawRow } from "@/lib/loglass/types"

const AGGREGATE_ACCOUNT_DEFINITIONS = [
  { code: "4000", name: "売上高", accountType: "収益" as const },
  { code: "5000", name: "売上原価", accountType: "費用" as const },
  { code: "6000", name: "売上総利益", accountType: "収益" as const },
  { code: "7000", name: "販管費", accountType: "費用" as const },
  { code: "8000", name: "営業利益", accountType: "収益" as const },
] as const

export const ANALYSIS_TARGET_MONTH = "2026-02"

type AggregateBucket = {
  baseRow: LoglassRawRow
  revenue: number
  cost: number
  sga: number
}

function buildAggregateRow(baseRow: LoglassRawRow, definition: (typeof AGGREGATE_ACCOUNT_DEFINITIONS)[number], amount: number): LoglassRawRow {
  return {
    ...baseRow,
    科目コード: definition.code,
    外部科目コード: `EXT-${definition.code}`,
    科目名: definition.name,
    集計科目名: definition.name,
    明細科目名: definition.name,
    科目タイプ: definition.accountType,
    金額: amount,
  }
}

export function buildAnalysisFixtureRawRows(): LoglassRawRow[] {
  const aggregateBuckets = new Map<string, AggregateBucket>()

  loglassSmallRawFixture.forEach((row) => {
    const bucketKey = [row.部署コード, row.年月度, row.数値区分, row.シナリオ].join("::")
    const bucket = aggregateBuckets.get(bucketKey) ?? {
      baseRow: row,
      revenue: 0,
      cost: 0,
      sga: 0,
    }

    if (row.集計科目名 === "売上高") {
      bucket.revenue += row.金額
    }

    if (row.集計科目名 === "売上原価") {
      bucket.cost += row.金額
    }

    if (row.集計科目名 === "販管費") {
      bucket.sga += row.金額
    }

    aggregateBuckets.set(bucketKey, bucket)
  })

  const aggregateRows = [...aggregateBuckets.values()].flatMap((bucket) => {
    const grossProfit = bucket.revenue - bucket.cost
    const operatingProfit = grossProfit - bucket.sga

    return [
      buildAggregateRow(bucket.baseRow, AGGREGATE_ACCOUNT_DEFINITIONS[0], bucket.revenue),
      buildAggregateRow(bucket.baseRow, AGGREGATE_ACCOUNT_DEFINITIONS[1], bucket.cost),
      buildAggregateRow(bucket.baseRow, AGGREGATE_ACCOUNT_DEFINITIONS[2], grossProfit),
      buildAggregateRow(bucket.baseRow, AGGREGATE_ACCOUNT_DEFINITIONS[3], bucket.sga),
      buildAggregateRow(bucket.baseRow, AGGREGATE_ACCOUNT_DEFINITIONS[4], operatingProfit),
    ]
  })

  return [...loglassSmallRawFixture, ...aggregateRows]
}

export interface AnalysisPageProps {
  state: AnalysisState
  actions: AnalysisActions
}

export function AnalysisPage({ state, actions }: AnalysisPageProps) {
  const normalizedRows = useMemo(() => {
    return aggregateByDepartment(normalizeRawRows(buildAnalysisFixtureRawRows()))
  }, [])

  const comparisonData = useMemo(() => {
    return generateComparisonData(normalizedRows, ANALYSIS_TARGET_MONTH)
  }, [normalizedRows])

  return (
    <>
      <p className="sr-only">
        {state.activeOrgTab} — {state.activeTimeAxis} コンテンツ
      </p>
      <AnalysisWorkspace
        state={state}
        actions={actions}
        comparisonData={comparisonData}
        normalizedRows={normalizedRows}
      />
    </>
  )
}
