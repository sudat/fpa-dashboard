import { useAnalysisData } from "@/features/analysis/hooks/use-analysis-data"
import { AnalysisWorkspace } from "@/features/analysis/components/analysis-workspace"
import type { AnalysisActions, AnalysisState } from "@/features/analysis/state/use-analysis-state"

export interface AnalysisPageProps {
  state: AnalysisState
  actions: AnalysisActions
}

export function AnalysisPage({ state, actions }: AnalysisPageProps) {
  const { normalizedData, comparisonData, isLoading, error } = useAnalysisData()

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
        loading={isLoading}
      />
    </>
  )
}
