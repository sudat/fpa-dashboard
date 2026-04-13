import { useEffect, useState } from "react"

import { aggregateByDepartment } from "@/features/admin/lib/grouping"
import { generateComparisonData, type ComparisonSet, normalizeRawRows } from "@/features/admin/lib/normalize-loglass"
import { applyBucketFilter } from "@/features/analysis/lib/bucket-filter"
import { resolveComparisonData } from "@/features/analysis/lib/comparison-resolver"
import { applyMasterMapping } from "@/lib/domain/master-schema"
import type { ScenarioFamily, UploadMetadata } from "@/lib/domain/upload-contract"
import { loglassSmallRawFixture } from "@/lib/fixtures/loglass-small"
import { gasClient, isGasAvailable, type AnalysisData } from "@/lib/gas/gas-client"
import { deriveMetricTypeFromScenario } from "@/lib/loglass/schema"
import type { LoglassMetricType, LoglassNormalizedRow, LoglessRawRow } from "@/lib/loglass/types"

const AGGREGATE_ACCOUNT_DEFINITIONS = [
  { code: "4000", name: "売上高", accountType: "収益" as const },
  { code: "5000", name: "売上原価", accountType: "費用" as const },
  { code: "6000", name: "売上総利益", accountType: "収益" as const },
  { code: "7000", name: "販管費", accountType: "費用" as const },
  { code: "8000", name: "営業利益", accountType: "収益" as const },
] as const

const ANALYSIS_SCENARIO_FAMILIES: ScenarioFamily[] = ["actual", "budget", "forecast"]
const UNASSIGNED_ACCOUNT_CODE = "UNASSIGNED"
const UNASSIGNED_EXTERNAL_ACCOUNT_CODE = "EXT-UNASSIGNED"
const ACCOUNT_AGGREGATE_MAP: Record<string, string> = {
  "SaaS利用料売上": "売上高",
  "広告売上": "売上高",
  "EC売上": "売上高",
  売上高: "売上高",
  "SaaS GMV": "GMV",
  "広告 GMV": "GMV",
  "EC GMV": "GMV",
  GMV: "GMV",
  決済手数料: "売上原価",
  配信原価: "売上原価",
  配送原価: "売上原価",
  売上原価: "売上原価",
  人件費: "販管費",
  広告宣伝費: "販管費",
  業務委託費: "販管費",
  採用費: "販管費",
  "SaaS利用料": "販管費",
  地代家賃: "販管費",
  販管費: "販管費",
}

export const ANALYSIS_TARGET_MONTH = "2026-02"

type AggregateBucket = {
  baseRow: LoglessRawRow
  revenue: number
  cost: number
  sga: number
}

export interface UseAnalysisDataResult {
  normalizedData: LoglassNormalizedRow[]
  comparisonData: ComparisonSet[]
  isLoading: boolean
  error: Error | null
}

function getAggregateCategory(accountName: string): string | undefined {
  return ACCOUNT_AGGREGATE_MAP[accountName]
}

function buildAggregateRow(baseRow: LoglessRawRow, definition: (typeof AGGREGATE_ACCOUNT_DEFINITIONS)[number], amount: number): LoglessRawRow {
  return {
    ...baseRow,
    科目コード: definition.code,
    外部科目コード: `EXT-${definition.code}`,
    科目: definition.name,
    科目タイプ: definition.accountType,
    金額: amount,
  }
}

export function buildAnalysisFixtureRawRows(): LoglessRawRow[] {
  return buildAggregateRawRows(loglassSmallRawFixture)
}

function buildAggregateRawRows(rawRows: LoglessRawRow[]): LoglessRawRow[] {
  const aggregateBuckets = new Map<string, AggregateBucket>()

  rawRows.forEach((row) => {
    const metricType = deriveMetricTypeFromScenario(row.シナリオ)
    const bucketKey = [row.部署コード, row.年月度, metricType, row.シナリオ].join("::")
    const bucket = aggregateBuckets.get(bucketKey) ?? {
      baseRow: row,
      revenue: 0,
      cost: 0,
      sga: 0,
    }
    const category = getAggregateCategory(row.科目)

    if (category === "売上高") {
      bucket.revenue += row.金額
    }

    if (category === "売上原価") {
      bucket.cost += row.金額
    }

    if (category === "販管費") {
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

  return [...rawRows, ...aggregateRows]
}

function buildAnalysisData(
  rawRows: LoglessRawRow[],
  targetMonth: string,
  uploadHistory?: UploadMetadata[],
): Pick<UseAnalysisDataResult, "normalizedData" | "comparisonData"> {
  const normalizedData = aggregateByDepartment(normalizeRawRows(rawRows))

  return {
    normalizedData,
    comparisonData:
      uploadHistory && uploadHistory.length > 0
        ? resolveComparisonData(normalizedData, targetMonth, uploadHistory)
        : generateComparisonData(normalizedData, targetMonth),
  }
}

function toMetricType(scenarioFamily: ScenarioFamily): LoglassMetricType {
  switch (scenarioFamily) {
    case "actual":
      return "実績"
    case "budget":
      return "予算"
    case "forecast":
      return "見込"
  }
}

function toRawRowsFromAnalysisData(analysisDataByFamily: AnalysisData[], targetMonth: string): LoglessRawRow[] {
  const masterSource = analysisDataByFamily.find((item) => item.accountMaster.length > 0 || item.departmentMaster.length > 0)

  if (!masterSource) {
    return []
  }

  return analysisDataByFamily.flatMap((analysisData, index) => {
    const scenarioFamily = ANALYSIS_SCENARIO_FAMILIES[index]
    const expectedMetricType = toMetricType(scenarioFamily)

    const mappedRows = applyBucketFilter(applyMasterMapping(
      analysisData.importData.map((row) => ({
        ...row,
        部署: row.deptName,
        科目: row.accountName,
      })),
      masterSource.accountMaster,
      masterSource.departmentMaster,
    ))

    return mappedRows.map((mappedRow) => {
      const isUnassignedAccount = mappedRow.accountMapping.bucketStatus === "unassigned"
      const scenarioKey = mappedRow.scenarioKey

      if (deriveMetricTypeFromScenario(scenarioKey) !== expectedMetricType) {
        throw new Error(`シナリオ種別の対応が不正です: ${scenarioKey}`)
      }

      return {
        シナリオ: scenarioKey,
        年月度: mappedRow.yearMonth || targetMonth,
        科目コード: isUnassignedAccount ? UNASSIGNED_ACCOUNT_CODE : mappedRow.accountCode,
        外部科目コード: isUnassignedAccount ? UNASSIGNED_EXTERNAL_ACCOUNT_CODE : mappedRow.extAccountCode,
        科目: mappedRow.accountMapping.aggregateAccountName,
        科目タイプ: mappedRow.accountType as LoglessRawRow["科目タイプ"],
        部署コード: mappedRow.deptCode,
        外部部署コード: mappedRow.extDeptCode,
        部署: mappedRow.departmentMapping.businessUnitName,
        金額: mappedRow.amount,
      } satisfies LoglessRawRow
    })
  })
}

async function loadPersistedRawRows(targetMonth: string): Promise<LoglessRawRow[]> {
  const analysisDataByFamily = await Promise.all(
    ANALYSIS_SCENARIO_FAMILIES.map((scenarioFamily) => gasClient.getAnalysisData(scenarioFamily, targetMonth)),
  )

  return buildAggregateRawRows(toRawRowsFromAnalysisData(analysisDataByFamily, targetMonth))
}

async function loadPersistedAnalysisSource(targetMonth: string): Promise<{
  rawRows: LoglessRawRow[]
  uploadHistory: UploadMetadata[]
}> {
  const [rawRows, uploadHistory] = await Promise.all([
    loadPersistedRawRows(targetMonth),
    gasClient.getUploadHistory(),
  ])

  return { rawRows, uploadHistory }
}

export function useAnalysisData(targetMonth = ANALYSIS_TARGET_MONTH): UseAnalysisDataResult {
  const [state, setState] = useState<UseAnalysisDataResult>({
    normalizedData: [],
    comparisonData: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const source = isGasAvailable()
          ? await loadPersistedAnalysisSource(targetMonth)
          : { rawRows: buildAnalysisFixtureRawRows(), uploadHistory: [] }

        if (cancelled) {
          return
        }

        setState({
          ...buildAnalysisData(source.rawRows, targetMonth, source.uploadHistory),
          isLoading: false,
          error: null,
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setState({
          normalizedData: [],
          comparisonData: [],
          isLoading: false,
          error: error instanceof Error ? error : new Error("分析データの取得に失敗しました"),
        })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [targetMonth])

  return state
}
