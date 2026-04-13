import { useCallback, type ChangeEvent } from "react"
import type { ScenarioKind, ScenarioInput } from "@/lib/domain/upload-contract"
import { scenarioInputSchema } from "@/lib/domain/upload-contract"
import { TYPOGRAPHY } from "@/lib/ui/theme"

const KIND_OPTIONS: { value: ScenarioKind; label: string }[] = [
  { value: "actual", label: "実績" },
  { value: "budget", label: "予算" },
  { value: "forecast", label: "見込" },
]

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

  const handleTargetMonthChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      tryBuildInput({ targetMonth: e.target.value })
    },
    [tryBuildInput],
  )

  const handleForecastStartChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      tryBuildInput({ forecastStart: e.target.value || undefined })
    },
    [tryBuildInput],
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
        <input
          id="target-month"
          type="month"
          value={targetMonth}
          onChange={handleTargetMonthChange}
          disabled={disabled}
          className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
        />

        {showForecastStart && (
          <>
            <label htmlFor="forecast-start" className={`${TYPOGRAPHY.body} text-muted-foreground`}>
              見込開始月
            </label>
            <input
              id="forecast-start"
              type="month"
              value={forecastStart}
              onChange={handleForecastStartChange}
              disabled={disabled}
              className="h-8 rounded-none border bg-background px-2 text-sm disabled:opacity-50"
            />
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
