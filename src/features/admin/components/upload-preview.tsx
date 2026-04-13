import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ReplacementWarning } from "@/lib/domain/upload-contract"
import { TYPOGRAPHY } from "@/lib/ui/theme"

interface UploadPreviewProps {
  fileName: string | null
  fileSize: number | null
  previewData: {
    rawRowCount: number
    departments: string[]
    accounts: string[]
  } | null
  replacementWarning: ReplacementWarning | null
  onConfirmReplacement: () => void
  onCancelReplacement: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadPreview({
  fileName,
  fileSize,
  previewData,
  replacementWarning,
  onConfirmReplacement,
  onCancelReplacement,
}: UploadPreviewProps) {
  return (
    <div className="flex flex-col gap-3">
      {fileName && (
        <div className="flex items-center gap-2">
          <Badge variant="outline">ファイル</Badge>
          <span className={TYPOGRAPHY.body}>{fileName}</span>
          {fileSize != null && (
            <span className={TYPOGRAPHY.small}>({formatFileSize(fileSize)})</span>
          )}
        </div>
      )}

      {previewData && (
        <div className="rounded-md border px-3 py-2">
          <div className="flex items-center gap-4">
            <span className={TYPOGRAPHY.small}>
              行数: <strong className="text-foreground">{previewData.rawRowCount}</strong>
            </span>
            <span className={TYPOGRAPHY.small}>
              部署: <strong className="text-foreground">{previewData.departments.length}件</strong>
            </span>
            <span className={TYPOGRAPHY.small}>
              科目: <strong className="text-foreground">{previewData.accounts.length}件</strong>
            </span>
          </div>
        </div>
      )}

      {replacementWarning && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-sm font-medium dark:text-amber-400">⚠ 上書き警告</span>
            </div>
            <p className={TYPOGRAPHY.small}>{replacementWarning.message}</p>
            <p className={TYPOGRAPHY.small}>
              既存ラベル: <strong className="text-foreground">{replacementWarning.generatedLabel}</strong>
            </p>
            <div className="flex gap-2 mt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={onConfirmReplacement}
                className="border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                上書きを確認
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelReplacement}
              >
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
