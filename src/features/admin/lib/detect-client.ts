import * as XLSX from "xlsx"
import type { DetectedScenario } from "../hooks/use-upload-flow"
import type { ScenarioKind } from "@/lib/domain/upload-contract"
import { loglessRawRowSchema } from "@/lib/loglass/schema"
import type { LoglessRawRow } from "@/lib/loglass/types"

const KIND_ORDER: Record<ScenarioKind, number> = { actual: 0, budget: 1, forecast: 2 }

function classifyScenario(scenarioKey: string): ScenarioKind {
  const trimmed = scenarioKey.trim()
  if (trimmed === "実績") return "actual"
  if (trimmed.includes("予算") || trimmed.includes("計画")) return "budget"
  return "forecast"
}

function normalizePeriod(value: unknown): string | null {
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed?.y != null && parsed?.m != null) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}`
    }
  }
  const str = String(value ?? "").trim()
  const match = str.match(/^(\d{4})[/-](\d{1,2})/)
  if (match) return `${match[1]}-${match[2]!.padStart(2, "0")}`
  return null
}

export interface ParsedUploadWorkbook {
  rawRows: LoglessRawRow[]
  detectedScenarios: DetectedScenario[]
}

function readWorkbookRows(base64: string): unknown[][] {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const wb = XLSX.read(bytes, { type: "array", cellDates: true, dense: true })
  const sheet = wb.Sheets[wb.SheetNames[0]!]
  if (!sheet) return []

  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
}

function asTrimmedString(value: unknown): string {
  return String(value ?? "").trim()
}

function asFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const normalized = asTrimmedString(value).replaceAll(",", "")
  return Number(normalized)
}

function parseUploadRow(row: unknown[], rowNumber: number): LoglessRawRow | null {
  const scenarioKey = asTrimmedString(row[0])
  if (!scenarioKey) return null

  const yearMonth = normalizePeriod(row[1])
  if (!yearMonth) {
    throw new Error(`アップロードファイル ${rowNumber} 行目の「年月」が不正です`)
  }

  const parsed = loglessRawRowSchema.safeParse({
    シナリオ: scenarioKey,
    年月度: yearMonth,
    科目コード: asTrimmedString(row[2]),
    外部科目コード: asTrimmedString(row[3]),
    科目: asTrimmedString(row[4]),
    科目タイプ: asTrimmedString(row[5]),
    部署コード: asTrimmedString(row[6]),
    外部部署コード: asTrimmedString(row[7]),
    部署: asTrimmedString(row[8]),
    金額: asFiniteNumber(row[9]),
  })

  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    const label = typeof field === "string" ? `「${field}」` : "行データ"
    throw new Error(`アップロードファイル ${rowNumber} 行目の${label}が不正です`)
  }

  return parsed.data
}

function buildDetectedScenariosFromRawRows(rawRows: LoglessRawRow[]): DetectedScenario[] {
  if (rawRows.length === 0) return []

  type ScenarioGroup = {
    kind: ScenarioKind
    scenarioKey: string
    months: string[]
    monthSet: Set<string>
    rowCount: number
  }

  const grouped = new Map<string, ScenarioGroup>()
  let latestActualMonth: string | null = null

  for (const rawRow of rawRows) {
    const scenarioKey = rawRow.シナリオ
    const kind = classifyScenario(scenarioKey)

    if (!grouped.has(scenarioKey)) {
      grouped.set(scenarioKey, {
        kind,
        scenarioKey,
        months: [],
        monthSet: new Set(),
        rowCount: 0,
      })
    }

    const group = grouped.get(scenarioKey)!
    const yearMonth = rawRow.年月度
    if (!group.monthSet.has(yearMonth)) {
      group.monthSet.add(yearMonth)
      group.months.push(yearMonth)
    }
    group.rowCount++

    if (kind === "actual" && (latestActualMonth === null || yearMonth > latestActualMonth)) {
      latestActualMonth = yearMonth
    }
  }

  return [...grouped.values()]
    .map((group) => {
      group.months.sort()

      const firstMonth = group.months[0] ?? ""
      const lastMonth = group.months[group.months.length - 1] ?? ""

      return {
        kind: group.kind,
        scenarioKey: group.scenarioKey,
        targetMonth: group.kind === "forecast" ? latestActualMonth ?? lastMonth : lastMonth,
        monthCount: group.months.length,
        rowCount: group.rowCount,
        firstMonth,
        lastMonth,
        forecastStart: group.kind === "forecast"
          ? group.months.find((month) => latestActualMonth === null || month > latestActualMonth) ?? firstMonth
          : undefined,
      }
    })
    .sort((a, b) => {
      const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      if (kindDiff !== 0) return kindDiff

      const scenarioDiff = (a.scenarioKey ?? "").localeCompare(b.scenarioKey ?? "", "ja")
      if (scenarioDiff !== 0) return scenarioDiff

      return a.targetMonth < b.targetMonth ? -1 : a.targetMonth > b.targetMonth ? 1 : 0
    })
}

function buildDetectedScenariosFromWorkbookRows(rows: unknown[][]): DetectedScenario[] {
  if (rows.length <= 1) return []

  type ScenarioGroup = {
    kind: ScenarioKind
    scenarioKey: string
    months: string[]
    monthSet: Set<string>
    rowCount: number
  }

  const grouped = new Map<string, ScenarioGroup>()
  let latestActualMonth: string | null = null

  for (let i = 1; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? (rows[i] as unknown[]) : []
    const scenarioKey = asTrimmedString(row[0])
    if (!scenarioKey) continue

    const yearMonth = normalizePeriod(row[1])
    if (!yearMonth) continue

    const kind = classifyScenario(scenarioKey)
    if (!grouped.has(scenarioKey)) {
      grouped.set(scenarioKey, {
        kind,
        scenarioKey,
        months: [],
        monthSet: new Set(),
        rowCount: 0,
      })
    }

    const group = grouped.get(scenarioKey)!
    if (!group.monthSet.has(yearMonth)) {
      group.monthSet.add(yearMonth)
      group.months.push(yearMonth)
    }
    group.rowCount++

    if (kind === "actual" && (latestActualMonth === null || yearMonth > latestActualMonth)) {
      latestActualMonth = yearMonth
    }
  }

  return [...grouped.values()]
    .map((group) => {
      group.months.sort()

      const firstMonth = group.months[0] ?? ""
      const lastMonth = group.months[group.months.length - 1] ?? ""

      return {
        kind: group.kind,
        scenarioKey: group.scenarioKey,
        targetMonth: group.kind === "forecast" ? latestActualMonth ?? lastMonth : lastMonth,
        monthCount: group.months.length,
        rowCount: group.rowCount,
        firstMonth,
        lastMonth,
        forecastStart: group.kind === "forecast"
          ? group.months.find((month) => latestActualMonth === null || month > latestActualMonth) ?? firstMonth
          : undefined,
      }
    })
    .sort((a, b) => {
      const kindDiff = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
      if (kindDiff !== 0) return kindDiff

      const scenarioDiff = (a.scenarioKey ?? "").localeCompare(b.scenarioKey ?? "", "ja")
      if (scenarioDiff !== 0) return scenarioDiff

      return a.targetMonth < b.targetMonth ? -1 : a.targetMonth > b.targetMonth ? 1 : 0
    })
}

export function parseUploadWorkbookFromBase64(base64: string): ParsedUploadWorkbook {
  const rows = readWorkbookRows(base64)
  if (rows.length <= 1) {
    return { rawRows: [], detectedScenarios: [] }
  }

  const rawRows: LoglessRawRow[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = Array.isArray(rows[i]) ? (rows[i] as unknown[]) : []
    const parsedRow = parseUploadRow(row, i + 1)
    if (parsedRow) {
      rawRows.push(parsedRow)
    }
  }

  return {
    rawRows,
    detectedScenarios: buildDetectedScenariosFromRawRows(rawRows),
  }
}

/**
 * Base64エンコードされたxlsxからシナリオを検出する。
 * GAS の Detect.detectScenarioInputs() と同等のロジック。
 */
export function detectScenariosFromBase64(base64: string): DetectedScenario[] {
  return buildDetectedScenariosFromWorkbookRows(readWorkbookRows(base64))
}
