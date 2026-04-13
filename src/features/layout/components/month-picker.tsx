import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"

interface MonthPickerProps {
  value: string
  onChange: (month: string) => void
}

function parseMonth(value: string): Date {
  const [y, m] = value.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, 1)
}

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseMonth(value)

  function handleSelect(date: Date | undefined) {
    if (!date) return
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    onChange(`${y}-${m}`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="justify-start gap-1.5 font-normal">
            <CalendarIcon className="size-4" />
            {formatMonthLabel(selected)}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={2030}
        />
      </PopoverContent>
    </Popover>
  )
}
