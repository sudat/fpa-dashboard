import * as XLSX from "xlsx"
import type { DetectedScenario } from "../hooks/use-upload-flow"
import type { ScenarioKind } from "@/lib/domain/upload-contract"

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

/**
 * Base64エンコードされたxlsxから1列目(シナリオ)・2列目(年月)だけ読んでシナリオを検出する。
 * GAS の Detect.detectScenarioInputs() と同等のロジック。
 */
export function detectScenariosFromBase64(base64: string): DetectedScenario[] {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

  const wb = XLSX.read(bytes, { type: "array", cellDates: true, dense: true })
  const sheet = wb.Sheets[wb.SheetNames[0]!]
  if (!sheet) return []

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })
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
    const row = rows[i] as unknown[]
    const scenarioKey = String(row?.[0] ?? "").trim()
    if (!scenarioKey) continue

    const yearMonth = normalizePeriod(row?.[1])
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
