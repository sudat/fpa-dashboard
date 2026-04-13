import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ScenarioSelectProps {
  slot: "A" | "B" | "C"
  value: string | null
  options: string[]
  onChange: (value: string | null) => void
}

const AUTO_MARKER = "__auto__"

export function ScenarioSelect({
  slot,
  value,
  options,
  onChange,
}: ScenarioSelectProps) {
  const selectValue = value ?? AUTO_MARKER

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onChange(v === AUTO_MARKER ? null : v)}
    >
      <SelectTrigger size="sm" className="gap-1">
        <span className="text-muted-foreground">{slot}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AUTO_MARKER}>
          自動
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
