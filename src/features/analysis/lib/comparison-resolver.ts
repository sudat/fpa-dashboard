import { type ComparisonSet, generateComparisonData } from "@/features/admin/lib/normalize-loglass"
import { resolveABC } from "@/lib/domain/scenario-label"
import type { ABCResolution, ScenarioFamily, UploadMetadata } from "@/lib/domain/upload-contract"
import { normalizeYearMonth } from "@/lib/loglass/schema"
import type { LoglassNormalizedRow, LoglassPeriodType } from "@/lib/loglass/types"

const PERIOD_TYPES: LoglassPeriodType[] = ["単月", "YTD", "着地見込"]
const PERIOD_TYPE_ORDER = new Map(PERIOD_TYPES.map((periodType, index) => [periodType, index]))

type ComparisonAccumulator = {
  departmentCode: string
  departmentName: string
  accountCode: string
  accountName: string
}

type ResolvedComparisonSlot = "A" | "B" | "C"

export function resolveComparisonData(
  normalizedRows: LoglassNormalizedRow[],
  targetMonth: string,
  uploadHistory: UploadMetadata[],
  abcOverride?: ABCResolution,
): ComparisonSet[] {
  if (normalizedRows.length === 0) {
    return []
  }

  const dedupedHistory = dedupeUploadHistory(uploadHistory)
  const resolution = abcOverride ?? resolveABC(dedupedHistory)

  if (!resolution.B) {
    return generateComparisonData(normalizedRows, targetMonth)
  }

  const normalizedTargetMonth = normalizeYearMonth(targetMonth)
  const [targetYearRaw, targetMonthRaw] = normalizedTargetMonth.split("-")
  const targetYear = Number(targetYearRaw)
  const targetMonthNumber = Number(targetMonthRaw)
  const targetFiscalYear = targetMonthNumber <= 3 ? targetYear : targetYear + 1
  const comparisonSets: ComparisonSet[] = []

  PERIOD_TYPES.forEach((periodType) => {
    const periodRows = normalizedRows.filter((row) => row.period.periodType === periodType)
    const groupedRows = buildComparisonGroups(periodRows, targetFiscalYear, normalizedTargetMonth)

    groupedRows.forEach((group) => {
      const A = resolveSlotValue({
        slot: "A",
        upload: resolution.A,
        normalizedRows: periodRows,
        group,
        targetMonth: normalizedTargetMonth,
      })
      const B = resolveSlotValue({
        slot: "B",
        upload: resolution.B,
        normalizedRows: periodRows,
        group,
        targetMonth: normalizedTargetMonth,
      })
      const C = resolveSlotValue({
        slot: "C",
        upload: resolution.C,
        normalizedRows: periodRows,
        group,
        targetMonth: normalizedTargetMonth,
      })

      comparisonSets.push({
        rowKey: `comparison::${group.departmentCode}::${group.accountCode}::${normalizedTargetMonth}::${periodType}`,
        accountName: group.accountName,
        departmentName: group.departmentName,
        periodType,
        A,
        B,
        BA: calculateDiff(B, A),
        C,
        BC: calculateDiff(B, C),
      })
    })
  })

  return comparisonSets.sort((left, right) => {
    const departmentResult = left.departmentName.localeCompare(right.departmentName, "ja")

    if (departmentResult !== 0) {
      return departmentResult
    }

    const accountResult = left.accountName.localeCompare(right.accountName, "ja")

    if (accountResult !== 0) {
      return accountResult
    }

    return (PERIOD_TYPE_ORDER.get(left.periodType) ?? 0) - (PERIOD_TYPE_ORDER.get(right.periodType) ?? 0)
  })
}

function dedupeUploadHistory(uploadHistory: UploadMetadata[]): UploadMetadata[] {
  const deduped = new Map<string, UploadMetadata>()

  uploadHistory.forEach((upload) => {
    const key = `${upload.replacementIdentity.scenarioFamily}::${upload.replacementIdentity.generatedLabel}`
    const existing = deduped.get(key)

    if (!existing || compareUploadTimestampDesc(upload, existing) < 0) {
      deduped.set(key, upload)
    }
  })

  return [...deduped.values()]
}

function compareUploadTimestampDesc(left: UploadMetadata, right: UploadMetadata): number {
  const timestampResult = Date.parse(right.timestamp) - Date.parse(left.timestamp)

  if (timestampResult !== 0) {
    return timestampResult
  }

  return right.uploadId.localeCompare(left.uploadId, "ja")
}

function buildComparisonGroups(
  rows: LoglassNormalizedRow[],
  targetFiscalYear: number,
  targetMonth: string,
): ComparisonAccumulator[] {
  const groups = new Map<string, ComparisonAccumulator>()

  rows.forEach((row) => {
    const isRelevantActual =
      row.metricType === "実績" &&
      (row.period.fiscalYear === targetFiscalYear || row.period.fiscalYear === targetFiscalYear - 1)
    const isRelevantPlan = row.metricType !== "実績" && row.period.fiscalYear === targetFiscalYear

    if (!isRelevantActual && !isRelevantPlan) {
      return
    }

    if (row.metricType === "実績" && row.period.fiscalYear === targetFiscalYear && row.period.yearMonth > targetMonth) {
      return
    }

    const groupKey = `${row.department.code}::${row.account.code}`

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        departmentCode: row.department.code,
        departmentName: row.department.name,
        accountCode: row.account.code,
        accountName: row.account.name,
      })
    }
  })

  return [...groups.values()]
}

function resolveSlotValue(input: {
  slot: ResolvedComparisonSlot
  upload: UploadMetadata | null
  normalizedRows: LoglassNormalizedRow[]
  group: ComparisonAccumulator
  targetMonth: string
}): number | null {
  if (!input.upload) {
    return null
  }

  const matchingRows = selectUploadRows(input.normalizedRows, input.upload, input.slot).filter(
    (row) => row.department.code === input.group.departmentCode && row.account.code === input.group.accountCode,
  )

  const targetYearMonth = normalizeYearMonth(input.upload.scenarioInput.targetMonth)

  switch (input.normalizedRows[0]?.period.periodType) {
    case "単月":
      return sumRows(matchingRows.filter((row) => row.period.yearMonth === targetYearMonth))
    case "YTD":
    case "着地見込":
      return sumRows(
        matchingRows.filter((row) =>
          isWithinFiscalYearToTargetMonth(row.period.yearMonth, targetYearMonth),
        ),
      )
  }
}

function selectUploadRows(
  rows: LoglassNormalizedRow[],
  upload: UploadMetadata,
  slot: ResolvedComparisonSlot,
): LoglassNormalizedRow[] {
  const family = upload.replacementIdentity.scenarioFamily

  if (family === "actual") {
    return selectActualRows(rows, upload, slot)
  }

  return selectLabeledScenarioRows(rows, upload, family)
}

function selectActualRows(
  rows: LoglassNormalizedRow[],
  upload: UploadMetadata,
  slot: ResolvedComparisonSlot,
): LoglassNormalizedRow[] {
  const targetYearMonth = normalizeYearMonth(upload.scenarioInput.targetMonth)
  const matchingRows = rows.filter(
    (row) => row.metricType === "実績" && row.period.yearMonth <= targetYearMonth,
  )

  const latestByMonthAndGroup = new Map<string, LoglassNormalizedRow>()

  matchingRows.forEach((row) => {
    const key = `${row.department.code}::${row.account.code}::${row.period.yearMonth}`
    latestByMonthAndGroup.set(key, row)
  })

  const resolvedRows = [...latestByMonthAndGroup.values()]

  if (slot === "C") {
    return resolvedRows.filter((row) => row.period.yearMonth <= targetYearMonth)
  }

  return resolvedRows
}

function selectLabeledScenarioRows(
  rows: LoglassNormalizedRow[],
  upload: UploadMetadata,
  family: Exclude<ScenarioFamily, "actual">,
): LoglassNormalizedRow[] {
  const metricType = family === "budget" ? "予算" : "見込"
  const generatedLabel = upload.generatedLabel
  const targetYearMonth = normalizeYearMonth(upload.scenarioInput.targetMonth)
  const exactMatches = rows.filter(
    (row) => row.metricType === metricType && row.scenarioKey === generatedLabel,
  )

  if (exactMatches.length > 0) {
    return exactMatches
  }

  return rows.filter(
    (row) => row.metricType === metricType && row.period.yearMonth === targetYearMonth,
  )
}

function sumRows(rows: LoglassNormalizedRow[]): number | null {
  if (rows.length === 0) {
    return null
  }

  return rows.reduce((total, row) => total + row.amount, 0)
}

function calculateDiff(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null
  }

  return left - right
}

function isWithinFiscalYearToTargetMonth(yearMonth: string, targetMonth: string): boolean {
  const normalizedYearMonth = normalizeYearMonth(yearMonth)
  const normalizedTargetMonth = normalizeYearMonth(targetMonth)
  const targetFiscalYear = toFiscalYear(normalizedTargetMonth)

  return toFiscalSequence(normalizedYearMonth) >= toFiscalSequence(`${targetFiscalYear - 1}-04`) &&
    toFiscalSequence(normalizedYearMonth) <= toFiscalSequence(normalizedTargetMonth)
}

function toFiscalYear(yearMonth: string): number {
  const [yearRaw, monthRaw] = normalizeYearMonth(yearMonth).split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  return month <= 3 ? year : year + 1
}

function toFiscalSequence(yearMonth: string): number {
  const [yearRaw, monthRaw] = normalizeYearMonth(yearMonth).split("-")
  return Number(yearRaw) * 100 + Number(monthRaw)
}
