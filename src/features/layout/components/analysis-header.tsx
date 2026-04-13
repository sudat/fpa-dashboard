import { type OrgTab } from "./top-tabs"
import { TimeAxisPills, type TimeAxis } from "./time-axis-pills"
import { MonthPicker } from "./month-picker"
import { ScenarioSelect } from "./scenario-select"
import { OrgDropdown } from "./org-dropdown"

interface AnalysisHeaderProps {
  targetMonth: string
  onTargetMonthChange: (month: string) => void
  selectedA: string | null
  selectedB: string | null
  selectedC: string | null
  availableScenarios: string[]
  onSelectedAChange: (value: string | null) => void
  onSelectedBChange: (value: string | null) => void
  onSelectedCChange: (value: string | null) => void
  activeOrgTab: OrgTab
  onOrgTabChange: (tab: OrgTab) => void
  activeTimeAxis: TimeAxis
  onTimeAxisChange: (axis: TimeAxis) => void
}

export function AnalysisHeader({
  targetMonth,
  onTargetMonthChange,
  selectedA,
  selectedB,
  selectedC,
  availableScenarios,
  onSelectedAChange,
  onSelectedBChange,
  onSelectedCChange,
  activeOrgTab,
  onOrgTabChange,
  activeTimeAxis,
  onTimeAxisChange,
}: AnalysisHeaderProps) {
  return (
    <div className="space-y-2 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <MonthPicker value={targetMonth} onChange={onTargetMonthChange} />
        <ScenarioSelect slot="A" value={selectedA} options={availableScenarios} onChange={onSelectedAChange} />
        <ScenarioSelect slot="B" value={selectedB} options={availableScenarios} onChange={onSelectedBChange} />
        <ScenarioSelect slot="C" value={selectedC} options={availableScenarios} onChange={onSelectedCChange} />
        <OrgDropdown value={activeOrgTab} onChange={onOrgTabChange} />
      </div>
      <TimeAxisPills activeTimeAxis={activeTimeAxis} onTimeAxisChange={onTimeAxisChange} />
    </div>
  )
}
