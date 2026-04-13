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
    // SheetJS は UTC midnight で Date を作るため UTC メソッドで読む
    const y = value.getUTCFullYear()
    const m = String(value.getUTCMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
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

  // col 0 = シナリオ, col 1 = 年月
  type ScenarioGroup = {
    kind: ScenarioKind
    months: string[]
    monthSet: Set<string>
    rowCount: number
  }
  const grouped = new Map<string, ScenarioGroup>()

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const scenarioKey = String(row?.[0] ?? "").trim()
    if (!scenarioKey) continue
    const yearMonth = normalizePeriod(row?.[1])
    if (!yearMonth) continue

    const kind = classifyScenario(scenarioKey)
    if (!grouped.has(scenarioKey)) {
      grouped.set(scenarioKey, { kind, months: [], monthSet: new Set(), rowCount: 0 })
    }
    const g = grouped.get(scenarioKey)!
    if (!g.monthSet.has(yearMonth)) {
      g.monthSet.add(yearMonth)
      g.months.push(yearMonth)
    }
    g.rowCount++
  }

  const results: DetectedScenario[] = []
  for (const [, g] of grouped) {
    g.months.sort()
    const latestMonth = g.months[g.months.length - 1] ?? null

    // targetMonth = そのシナリオの最新月（実績・見込どちらも同じ基準）
    const targetMonth = latestMonth ?? ""

    results.push({
      kind: g.kind,
      targetMonth,
      monthCount: g.months.length,
      rowCount: g.rowCount,
    })
  }

  return results.sort((a, b) => {
    const kd = KIND_ORDER[a.kind] - KIND_ORDER[b.kind]
    if (kd !== 0) return kd
    return a.targetMonth < b.targetMonth ? -1 : a.targetMonth > b.targetMonth ? 1 : 0
  })
}
