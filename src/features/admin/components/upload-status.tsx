import type { UploadMetadata } from "@/lib/domain/upload-contract"
import { TYPOGRAPHY } from "@/lib/ui/theme"

interface UploadStatusProps {
  phase: "uploading" | "success" | "error"
  result: UploadMetadata | null
  errorMessage: string | null
  onRetry: () => void
  onReset: () => void
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function UploadStatus({
  phase,
  result,
  errorMessage,
  onRetry,
  onReset,
}: UploadStatusProps) {
  if (phase === "uploading") {
    return (
      <div className="flex items-center gap-3 rounded-none border bg-muted/30 px-4 py-3">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className={TYPOGRAPHY.body}>アップロード中...</span>
      </div>
    )
  }

  if (phase === "success" && result) {
    return (
      <div className="flex flex-col gap-2 rounded-none border border-green-500 bg-green-50 px-4 py-3 dark:bg-green-950/30">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-sm font-medium">✓ アップロード成功</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className={TYPOGRAPHY.small}>
            ID: {result.uploadId}
          </span>
          <span className={TYPOGRAPHY.small}>
            日時: {formatTimestamp(result.timestamp)}
          </span>
          <span className={TYPOGRAPHY.small}>
            ラベル: <strong className="text-foreground">{result.generatedLabel}</strong>
          </span>
          <span className={TYPOGRAPHY.small}>
            アップロード者: {result.uploader}
          </span>
        </div>
        <button
          onClick={onReset}
          className="mt-2 self-start rounded-none border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          新しいアップロード
        </button>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col gap-2 rounded-none border border-red-500 bg-red-50 px-4 py-3 dark:bg-red-950/30">
        <div className="flex items-center gap-2">
          <span className="text-red-600 text-sm font-medium">✗ エラー</span>
        </div>
        <p className={TYPOGRAPHY.small}>
          {errorMessage ?? "不明なエラーが発生しました"}
        </p>
        <div className="flex gap-2 mt-1">
          <button
            onClick={onRetry}
            className="rounded-none bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            再試行
          </button>
          <button
            onClick={onReset}
            className="rounded-none border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            リセット
          </button>
        </div>
      </div>
    )
  }

  return null
}
