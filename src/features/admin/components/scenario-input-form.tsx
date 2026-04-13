import type { ScenarioKind } from "@/lib/domain/upload-contract"
import type { DetectedScenario } from "../hooks/use-upload-flow"
import { TYPOGRAPHY } from "@/lib/ui/theme"

const SCENARIO_KIND_LABEL: Record<ScenarioKind, string> = {
  actual: "実績",
  budget: "予算",
  forecast: "見込",
}

interface ScenarioInputFormProps {
  detectedScenarios: DetectedScenario[] | null
  generatedLabel: string | null
  isLoading?: boolean
}

export function ScenarioInputForm({
  detectedScenarios,
  generatedLabel,
  isLoading,
}: ScenarioInputFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className={TYPOGRAPHY.small}>ファイルを読み込み中...</span>
        </div>
      ) : detectedScenarios && detectedScenarios.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className={`${TYPOGRAPHY.small} text-muted-foreground`}>
            検出されたシナリオ
          </span>
          <ul className="flex flex-col gap-1">
            {detectedScenarios.map((scenario, i) => {
              const { startMonth, endMonth } = getDisplayRange(scenario)
              return (
                <li key={i} className={`${TYPOGRAPHY.body} flex items-center gap-2`}>
                  <span className="font-medium">
                    {SCENARIO_KIND_LABEL[scenario.kind] ?? scenario.kind}
                  </span>
                  <span className="text-muted-foreground">
                    {startMonth}〜{endMonth}
                    ({scenario.monthCount}ヶ月分, {scenario.rowCount}行)
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <span className={`${TYPOGRAPHY.small} text-muted-foreground`}>
          ファイルを選択するとシナリオを自動検出します
        </span>
      )}

      {generatedLabel && (
        <div className="rounded-md border bg-muted/50 px-3 py-2">
          <span className={TYPOGRAPHY.small}>生成ラベル: </span>
          <span className={`${TYPOGRAPHY.body} font-medium`}>{generatedLabel}</span>
        </div>
      )}
    </div>
  )
}

function getDisplayRange(scenario: DetectedScenario): {
  startMonth: string
  endMonth: string
} {
  const endMonth = scenario.lastMonth ?? scenario.targetMonth
  const startMonth = scenario.firstMonth ?? shiftYearMonth(endMonth, -(scenario.monthCount - 1))
  return { startMonth, endMonth }
}

function shiftYearMonth(yearMonth: string, monthDelta: number): string {
  const [yearStr, monthStr] = yearMonth.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const shifted = new Date(Date.UTC(year, month - 1 + monthDelta, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`
}
