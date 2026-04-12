import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const TIME_AXES = ["着地見込", "YTD", "単月"] as const
export type TimeAxis = (typeof TIME_AXES)[number]

interface TimeAxisPillsProps {
  activeTimeAxis: TimeAxis
  onTimeAxisChange: (axis: TimeAxis) => void
}

export function TimeAxisPills({ activeTimeAxis, onTimeAxisChange }: TimeAxisPillsProps) {
  return (
    <Tabs
      value={activeTimeAxis}
      onValueChange={(v) => onTimeAxisChange(v as TimeAxis)}
      orientation="horizontal"
      className="flex flex-col"
      aria-label="期間軸"
    >
      <TabsList className="gap-1">
        {TIME_AXES.map((axis) => (
          <TabsTrigger key={axis} value={axis} className="rounded-full px-3 py-1">
            {axis}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
