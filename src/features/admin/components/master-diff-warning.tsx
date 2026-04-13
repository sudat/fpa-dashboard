import { Badge } from "@/components/ui/badge"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import type { MasterDiffWarningItem } from "./admin-page"

interface MasterDiffWarningProps {
  warnings: MasterDiffWarningItem[]
}

const TYPE_CONFIG = {
  new_account: { label: "新規科目", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  new_department: { label: "新規部署", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  mapping_change: { label: "マッピング変更", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
} as const

export function MasterDiffWarning({ warnings }: MasterDiffWarningProps) {
  if (warnings.length === 0) {
    return <p className={TYPOGRAPHY.small}>警告はありません</p>
  }

  return (
    <ul className="flex flex-col gap-2 px-4">
      {warnings.map((warning) => {
        const typeConf = TYPE_CONFIG[warning.type]
        return (
          <li
            key={warning.id}
            className="flex items-center gap-3 rounded-none border px-3 py-2"
          >
            <Badge variant="outline" className={typeConf.className}>
              {typeConf.label}
            </Badge>
            <span className={TYPOGRAPHY.body}>{warning.code}</span>
            <span className={TYPOGRAPHY.body}>{warning.name}</span>
          </li>
        )
      })}
    </ul>
  )
}
