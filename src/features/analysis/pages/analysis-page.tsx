import { useAnalysisData } from "@/features/analysis/hooks/use-analysis-data"
import { AnalysisWorkspace } from "@/features/analysis/components/analysis-workspace"
import type { AnalysisActions, AnalysisState } from "@/features/analysis/state/use-analysis-state"
import type { ABCResolution } from "@/lib/domain/upload-contract"

export interface AnalysisPageProps {
  state: AnalysisState
  actions: AnalysisActions
  abcOverride?: ABCResolution
}

export function AnalysisPage({ state, actions, abcOverride }: AnalysisPageProps) {
  const { normalizedData, comparisonData, isLoading, error } = useAnalysisData(state.targetMonth, abcOverride)

  return (
    <>
      <p className="sr-only">
        {state.activeOrgTab} — {state.activeTimeAxis} コンテンツ
      </p>
      {error ? <p className="sr-only">分析データの取得に失敗しました: {error.message}</p> : null}
      <AnalysisWorkspace
        state={state}
        actions={actions}
        comparisonData={comparisonData}
        normalizedRows={normalizedData}
        targetMonth={state.targetMonth}
        loading={isLoading}
      />
    </>
  )
}
