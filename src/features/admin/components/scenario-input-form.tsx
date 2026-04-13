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
        <span className={`${TYPOGRAPHY.small} text-muted-foreground`}>
          シナリオを検出中...
        </span>
      ) : detectedScenarios && detectedScenarios.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className={`${TYPOGRAPHY.small} text-muted-foreground`}>
            検出されたシナリオ
          </span>
          <ul className="flex flex-col gap-1">
            {detectedScenarios.map((scenario, i) => (
              <li key={i} className={`${TYPOGRAPHY.body} flex items-center gap-2`}>
                <span className="font-medium">
                  {SCENARIO_KIND_LABEL[scenario.kind] ?? scenario.kind}
                </span>
                <span className="text-muted-foreground">
                  {scenario.targetMonth}〜
                  {computeEndMonth(scenario.targetMonth, scenario.monthCount)}
                  ({scenario.monthCount}ヶ月分, {scenario.rowCount}行)
                </span>
              </li>
            ))}
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

function computeEndMonth(startMonth: string, monthCount: number): string {
  const [yearStr, monthStr] = startMonth.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const endMonth = month + monthCount - 1
  const endYear = year + Math.floor((endMonth - 1) / 12)
  const endM = ((endMonth - 1) % 12) + 1
  return `${endYear}-${String(endM).padStart(2, "0")}`
}
