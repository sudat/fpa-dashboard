import { Button } from "@/components/ui/button"

export const TIME_AXES = ["着地見込", "YTD", "単月"] as const
export type TimeAxis = (typeof TIME_AXES)[number]

interface TimeAxisPillsProps {
  activeTimeAxis: TimeAxis
  onTimeAxisChange: (axis: TimeAxis) => void
}

export function TimeAxisPills({ activeTimeAxis, onTimeAxisChange }: TimeAxisPillsProps) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label="期間軸">
      {TIME_AXES.map((axis) => {
        const isActive = activeTimeAxis === axis

        return (
          <Button
            key={axis}
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className="rounded-md px-3"
            aria-pressed={isActive}
            onClick={() => onTimeAxisChange(axis)}
          >
            {axis}
          </Button>
        )
      })}
    </div>
  )
}
