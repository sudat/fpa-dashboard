import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORG_TABS, type OrgTab } from "./top-tabs"

interface OrgDropdownProps {
  value: OrgTab
  onChange: (tab: OrgTab) => void
}

export function OrgDropdown({ value, onChange }: OrgDropdownProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as OrgTab)}
    >
      <SelectTrigger size="sm" className="gap-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORG_TABS.map((tab) => (
          <SelectItem key={tab} value={tab}>
            {tab}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
