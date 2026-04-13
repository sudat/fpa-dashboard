import { describe, expect, test } from "vitest"

import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass"
import { buildNormalizedRowKey, createNormalizedPeriod } from "@/lib/loglass/schema"
import type { LoglassNormalizedRow } from "@/lib/loglass/types"
import { buildUploadFromInput } from "@/lib/domain/__tests__/fixtures/upload-metadata-fixtures"

import { resolveComparisonData } from "../comparison-resolver"

function createNormalizedRow(input: {
  amount: number
  metricType?: LoglassNormalizedRow["metricType"]
  yearMonth: string
  scenarioKey?: string
}): LoglassNormalizedRow {
  const metricType = input.metricType ?? "実績"

  return {
    rowKey: buildNormalizedRowKey({
      departmentCode: "D001",
      accountCode: "4000",
      yearMonth: input.yearMonth,
      periodType: "単月",
      metricType,
      scenarioKey: input.scenarioKey,
    }),
    scenarioKey: input.scenarioKey,
    department: {
      code: "D001",
      externalCode: "EXT-D001",
      name: "SaaS事業部",
      scope: "事業部",
    },
    account: {
      code: "4000",
      externalCode: "EXT-4000",
      name: "売上高",
      type: "収益",
      aggregateName: "売上高",
      detailName: "売上高",
      hierarchyKey: "売上高::売上高",
      isGmvDenominator: false,
    },
    period: createNormalizedPeriod(input.yearMonth, "単月"),
    metricType,
    amount: input.amount,
  }
}

function pickSingleMonthResult(comparisonData: ComparisonSet[]): ComparisonSet {
  const match = comparisonData.find((row) => row.periodType === "単月")

  if (!match) {
    throw new Error("単月 comparison row が見つかりません")
  }

  return match
}

describe("resolveComparisonData", () => {
  test("1/10 upload: latest upload becomes B and A/C stay null", () => {
    const uploadHistory = [
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-01" },
        { uploadId: "actual-2026-01", timestamp: "2026-01-10T00:00:00.000Z" },
      ),
    ]
    const normalizedRows = [createNormalizedRow({ yearMonth: "2026-01", amount: 100 })]

    const result = pickSingleMonthResult(resolveComparisonData(normalizedRows, "2026-01", uploadHistory))

    expect(result.A).toBeNull()
    expect(result.B).toBe(100)
    expect(result.C).toBeNull()
  })

  test("2/10 upload: newer becomes B and older same-family upload becomes A", () => {
    const uploadHistory = [
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-01" },
        { uploadId: "actual-2026-01", timestamp: "2026-01-10T00:00:00.000Z" },
      ),
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-02" },
        { uploadId: "actual-2026-02", timestamp: "2026-02-10T00:00:00.000Z" },
      ),
    ]
    const normalizedRows = [
      createNormalizedRow({ yearMonth: "2026-01", amount: 100 }),
      createNormalizedRow({ yearMonth: "2026-02", amount: 120 }),
    ]

    const result = pickSingleMonthResult(resolveComparisonData(normalizedRows, "2026-02", uploadHistory))

    expect(result.A).toBe(100)
    expect(result.B).toBe(120)
    expect(result.C).toBeNull()
  })

  test("prior-year same-month upload becomes C", () => {
    const uploadHistory = [
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2025-02" },
        { uploadId: "actual-2025-02", timestamp: "2025-02-10T00:00:00.000Z" },
      ),
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-01" },
        { uploadId: "actual-2026-01", timestamp: "2026-01-10T00:00:00.000Z" },
      ),
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-02" },
        { uploadId: "actual-2026-02", timestamp: "2026-02-10T00:00:00.000Z" },
      ),
    ]
    const normalizedRows = [
      createNormalizedRow({ yearMonth: "2025-02", amount: 90 }),
      createNormalizedRow({ yearMonth: "2026-01", amount: 100 }),
      createNormalizedRow({ yearMonth: "2026-02", amount: 120 }),
    ]

    const result = pickSingleMonthResult(resolveComparisonData(normalizedRows, "2026-02", uploadHistory))

    expect(result.A).toBe(100)
    expect(result.B).toBe(120)
    expect(result.C).toBe(90)
  })

  test("same-tag overwrite keeps latest target-month snapshot without duplicate carry-over", () => {
    const uploadHistory = [
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-01" },
        { uploadId: "actual-2026-01-v1", timestamp: "2026-01-10T00:00:00.000Z" },
      ),
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-01" },
        { uploadId: "actual-2026-01-v2", timestamp: "2026-01-20T00:00:00.000Z" },
      ),
      buildUploadFromInput(
        { kind: "actual", targetMonth: "2026-02" },
        { uploadId: "actual-2026-02", timestamp: "2026-02-10T00:00:00.000Z" },
      ),
    ]
    const normalizedRows = [
      createNormalizedRow({ yearMonth: "2026-01", amount: 100 }),
      createNormalizedRow({ yearMonth: "2026-01", amount: 130 }),
      createNormalizedRow({ yearMonth: "2026-02", amount: 150 }),
    ]

    const result = pickSingleMonthResult(resolveComparisonData(normalizedRows, "2026-02", uploadHistory))

    expect(result.A).toBe(130)
    expect(result.B).toBe(150)
    expect(result.BA).toBe(20)
  })

  test("mixed scenario families resolve A/B/C within the latest upload family only", () => {
    const latestActual = buildUploadFromInput(
      { kind: "actual", targetMonth: "2026-02" },
      { uploadId: "actual-2026-02", timestamp: "2026-02-10T00:00:00.000Z" },
    )
    const previousActual = buildUploadFromInput(
      { kind: "actual", targetMonth: "2026-01" },
      { uploadId: "actual-2026-01", timestamp: "2026-01-10T00:00:00.000Z" },
    )
    const budgetUpload = buildUploadFromInput(
      { kind: "budget", targetMonth: "2026-01" },
      { uploadId: "budget-2026-01", timestamp: "2026-01-25T00:00:00.000Z" },
    )

    const normalizedRows = [
      createNormalizedRow({ yearMonth: "2026-01", amount: 100 }),
      createNormalizedRow({ yearMonth: "2026-01", amount: 999, metricType: "予算", scenarioKey: budgetUpload.generatedLabel }),
      createNormalizedRow({ yearMonth: "2026-02", amount: 120 }),
    ]

    const result = pickSingleMonthResult(
      resolveComparisonData(normalizedRows, "2026-02", [previousActual, budgetUpload, latestActual]),
    )

    expect(result.A).toBe(100)
    expect(result.B).toBe(120)
    expect(result.C).toBeNull()
  })
})
