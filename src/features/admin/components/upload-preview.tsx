import { Badge } from "@/components/ui/badge"
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
          <Badge variant="outline" className="rounded-none">ファイル</Badge>
          <span className={TYPOGRAPHY.body}>{fileName}</span>
          {fileSize != null && (
            <span className={TYPOGRAPHY.small}>({formatFileSize(fileSize)})</span>
          )}
        </div>
      )}

      {previewData && (
        <div className="rounded-none border px-3 py-2">
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
        <div className="rounded-none border border-yellow-500 bg-yellow-50 px-4 py-3 dark:bg-yellow-950/30">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-yellow-600 text-sm font-medium">⚠ 上書き警告</span>
            </div>
            <p className={TYPOGRAPHY.small}>{replacementWarning.message}</p>
            <p className={TYPOGRAPHY.small}>
              既存ラベル: <strong className="text-foreground">{replacementWarning.generatedLabel}</strong>
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={onConfirmReplacement}
                className="rounded-none bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700"
              >
                上書きを確認
              </button>
              <button
                onClick={onCancelReplacement}
                className="rounded-none border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
