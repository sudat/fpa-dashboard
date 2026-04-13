import { useState } from "react"
import { AnalysisPage } from "@/features/analysis/pages/analysis-page"
import { Sidebar, type NavItem } from "./sidebar"
import { AnalysisHeader } from "./analysis-header"
import { useAnalysisState } from "@/features/analysis/state/use-analysis-state"
import { AdminPage } from "@/features/admin/components/admin-page"
import { SPACING } from "@/lib/ui/theme"
import type { ABCResolution, UploadMetadata } from "@/lib/domain/upload-contract"

function buildAbcOverride(
  selectedA: string | null,
  selectedB: string | null,
  selectedC: string | null,
  _uploadHistory: UploadMetadata[],
): ABCResolution | undefined {
  if (!selectedA && !selectedB && !selectedC) return undefined
  return { A: null, B: null, C: null }
}

export function AppShell() {
  const [activeNav, setActiveNav] = useState<NavItem>("analysis")
  const [analysis, actions] = useAnalysisState()

  // EXTENSION POINT: snapshot policy (deferred)
  // Future: data snapshot version tracking — attach version metadata to analysis state snapshots
  // Future: data version comparison — enable diff between two snapshot versions

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <main className="flex min-w-0 flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeNav === "analysis" ? (
            <>
              <AnalysisHeader
                targetMonth={analysis.targetMonth}
                onTargetMonthChange={actions.setTargetMonth}
                selectedA={analysis.selectedA}
                selectedB={analysis.selectedB}
                selectedC={analysis.selectedC}
                availableScenarios={["実績", "予算", "見込", "着地見込"]}
                onSelectedAChange={actions.setSelectedA}
                onSelectedBChange={actions.setSelectedB}
                onSelectedCChange={actions.setSelectedC}
                activeOrgTab={analysis.activeOrgTab}
                onOrgTabChange={actions.setActiveOrgTab}
                activeTimeAxis={analysis.activeTimeAxis}
                onTimeAxisChange={actions.setActiveTimeAxis}
              />
              <div className={`flex-1 overflow-auto ${SPACING.cardPadding}`}>
                <AnalysisPage
                  state={analysis}
                  actions={actions}
                  abcOverride={buildAbcOverride(analysis.selectedA, analysis.selectedB, analysis.selectedC, [])}
                />
              </div>
            </>
          ) : (
            <div className={`flex-1 overflow-auto ${SPACING.cardPadding}`}>
              <AdminPage onNavigateToAnalysis={() => setActiveNav("analysis")} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
