import { useCallback, type ChangeEvent } from "react"
import type { ScenarioKind, ScenarioInput } from "@/lib/domain/upload-contract"
import { scenarioInputSchema } from "@/lib/domain/upload-contract"
import { TYPOGRAPHY } from "@/lib/ui/theme"

const KIND_OPTIONS: { value: ScenarioKind; label: string }[] = [
  { value: "actual", label: "実績" },
  { value: "budget", label: "予算" },
  { value: "forecast", label: "見込" },
]

const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => {
  const year = new Date().getFullYear() - 3 + i
  return { value: String(year), label: `${year}年` }
})

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const month = i + 1
  return { value: String(month).padStart(2, "0"), label: `${month}月` }
})

function parseYearMonth(value: string): { year: string; month: string } {
  const [year = "", month = ""] = value.split("-")
  return { year, month }
}

function formatYearMonth(year: string, month: string): string {
  return `${year}-${month}`
}

interface ScenarioInputFormProps {
  value: Partial<ScenarioInput>
  generatedLabel: string | null
  onChange: (input: ScenarioInput) => void
  disabled?: boolean
}

export function ScenarioInputForm({
  value,
  generatedLabel,
  onChange,
  disabled,
}: ScenarioInputFormProps) {
  const kind = value.kind ?? ""
  const targetMonth = value.targetMonth ?? ""
  const forecastStart = value.forecastStart ?? ""
  const { year: tmYear, month: tmMonth } = parseYearMonth(targetMonth)
  const { year: fsYear, month: fsMonth } = parseYearMonth(forecastStart)

  const tryBuildInput = useCallback(
    (patch: Partial<ScenarioInput>) => {
      const merged: Partial<ScenarioInput> = {
        kind: (patch.kind ?? kind) as ScenarioKind | undefined,
        targetMonth: patch.targetMonth ?? targetMonth,
        forecastStart: patch.forecastStart !== undefined ? patch.forecastStart : forecastStart || undefined,
      }

      if (!merged.kind || !merged.targetMonth) return

      const candidate: ScenarioInput = {
        kind: merged.kind,
        targetMonth: merged.targetMonth,
        ...(merged.forecastStart ? { forecastStart: merged.forecastStart } : {}),
      }

      const parsed = scenarioInputSchema.safeParse(candidate)
      if (parsed.success) {
        onChange(parsed.data)
      }
    },
    [kind, targetMonth, forecastStart, onChange],
  )

  const handleKindChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      tryBuildInput({ kind: e.target.value as ScenarioKind })
    },
    [tryBuildInput],
  )

  const handleTargetMonthYearChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      tryBuildInput({ targetMonth: formatYearMonth(e.target.value, tmMonth) })
    },
    [tryBuildInput, tmMonth],
  )

  const handleTargetMonthMonthChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      tryBuildInput({ targetMonth: formatYearMonth(tmYear, e.target.value) })
    },
    [tryBuildInput, tmYear],
  )

  const handleForecastStartYearChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      tryBuildInput({ forecastStart: formatYearMonth(e.target.value, fsMonth) || undefined })
    },
    [tryBuildInput, fsMonth],
  )

  const handleForecastStartMonthChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      tryBuildInput({ forecastStart: formatYearMonth(fsYear, e.target.value) || undefined })
    },
    [tryBuildInput, fsYear],
  )

  const showForecastStart = kind === "actual" || kind === "forecast"

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[120px_1fr] items-center gap-x-4 gap-y-3">
        <label htmlFor="scenario-kind" className={`${TYPOGRAPHY.body} text-muted-foreground`}>
          種別
        </label>
        <select
          id="scenario-kind"
          value={kind}
          onChange={handleKindChange}
          disabled={disabled}
          className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
        >
          <option value="">選択してください</option>
          {KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label htmlFor="target-month" className={`${TYPOGRAPHY.body} text-muted-foreground`}>
          対象月
        </label>
        <div className="flex gap-2">
          <select
            id="target-month-year"
            value={tmYear}
            onChange={handleTargetMonthYearChange}
            disabled={disabled}
            className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
          >
            <option value="">--</option>
            {YEAR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            id="target-month"
            value={tmMonth}
            onChange={handleTargetMonthMonthChange}
            disabled={disabled}
            className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
          >
            <option value="">--</option>
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {showForecastStart && (
          <>
            <label htmlFor="forecast-start" className={`${TYPOGRAPHY.body} text-muted-foreground`}>
              見込開始月
            </label>
            <div className="flex gap-2">
              <select
                id="forecast-start-year"
                value={fsYear}
                onChange={handleForecastStartYearChange}
                disabled={disabled}
                className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
              >
                <option value="">--</option>
                {YEAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                id="forecast-start"
                value={fsMonth}
                onChange={handleForecastStartMonthChange}
                disabled={disabled}
                className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
              >
                <option value="">--</option>
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {generatedLabel && (
        <div className="rounded-none border bg-muted/50 px-3 py-2">
          <span className={TYPOGRAPHY.small}>生成ラベル: </span>
          <span className={`${TYPOGRAPHY.body} font-medium`}>{generatedLabel}</span>
        </div>
      )}
    </div>
  )
}
