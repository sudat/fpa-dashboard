import { TopTabs, type OrgTab } from "./top-tabs"
import { TimeAxisPills, type TimeAxis } from "./time-axis-pills"

interface AnalysisHeaderProps {
  activeOrgTab: OrgTab
  onOrgTabChange: (tab: OrgTab) => void
  activeTimeAxis: TimeAxis
  onTimeAxisChange: (axis: TimeAxis) => void
}

export function AnalysisHeader({
  activeOrgTab,
  onOrgTabChange,
  activeTimeAxis,
  onTimeAxisChange,
}: AnalysisHeaderProps) {
  return (
    <div className="space-y-2 border-b px-4 pb-3 pt-3">
      <TopTabs activeOrgTab={activeOrgTab} onOrgTabChange={onOrgTabChange} />
      <TimeAxisPills activeTimeAxis={activeTimeAxis} onTimeAxisChange={onTimeAxisChange} />
    </div>
  )
}
