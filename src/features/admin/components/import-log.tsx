import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TYPOGRAPHY } from "@/lib/ui/theme"
import type { ImportResult } from "./admin-page"

interface ImportLogProps {
  results: ImportResult[]
  onRowClick?: (result: ImportResult) => void
}

const STATUS_CONFIG = {
  success: { label: "成功", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  partial: { label: "部分成功", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  failed: { label: "失敗", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
} as const

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ImportLog({ results, onRowClick }: ImportLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>取込結果ログ</CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className={TYPOGRAPHY.small}>取込履歴はありません</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={TYPOGRAPHY.tableHeader}>アップロード日時</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>種別</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>年月</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>ファイル名</TableHead>
                <TableHead className={TYPOGRAPHY.tableHeader}>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => {
                const statusConf = STATUS_CONFIG[result.status]
                const isClickable = result.status !== "success" && onRowClick
                return (
                  <TableRow
                    key={result.id}
                    className={isClickable ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={isClickable ? () => onRowClick(result) : undefined}
                  >
                    <TableCell className={TYPOGRAPHY.body}>
                      {formatDate(result.uploadedAt)}
                    </TableCell>
                    <TableCell className={TYPOGRAPHY.body}>
                      {result.type}
                    </TableCell>
                    <TableCell className={TYPOGRAPHY.body}>
                      {result.yearMonth}
                    </TableCell>
                    <TableCell className={TYPOGRAPHY.body}>
                      {result.fileName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConf.className}>
                        {statusConf.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
