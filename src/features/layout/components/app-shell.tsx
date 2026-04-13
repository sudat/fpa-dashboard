import { useState } from "react"
import { AnalysisPage } from "@/features/analysis/pages/analysis-page"
import { Sidebar, type NavItem } from "./sidebar"
import { AnalysisHeader } from "./analysis-header"
import { useAnalysisState } from "@/features/analysis/state/use-analysis-state"
import { AdminPage } from "@/features/admin/components/admin-page"

export function AppShell() {
  const [activeNav, setActiveNav] = useState<NavItem>("analysis")
  const [analysis, actions] = useAnalysisState()

  // EXTENSION POINT: snapshot policy (deferred)
  // Future: data snapshot version tracking — attach version metadata to analysis state snapshots
  // Future: data version comparison — enable diff between two snapshot versions

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeNav={activeNav} onNavChange={setActiveNav} />

      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeNav === "analysis" ? (
            <>
              <AnalysisHeader
                activeOrgTab={analysis.activeOrgTab}
                onOrgTabChange={actions.setActiveOrgTab}
                activeTimeAxis={analysis.activeTimeAxis}
                onTimeAxisChange={actions.setActiveTimeAxis}
              />
              <div className="flex-1 overflow-auto p-6">
                <AnalysisPage state={analysis} actions={actions} />
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <AdminPage onNavigateToAnalysis={() => setActiveNav("analysis")} />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
