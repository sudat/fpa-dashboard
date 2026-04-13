import { useCallback, useRef, useState, type DragEvent } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TYPOGRAPHY, SPACING } from "@/lib/ui/theme"
import { useUploadFlow } from "../hooks/use-upload-flow"
import { ScenarioInputForm } from "./scenario-input-form"
import { UploadPreview } from "./upload-preview"
import { UploadStatus } from "./upload-status"

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"]

export function UploadSection() {
  const {
    state,
    selectFile,
    setScenarioInput,
    preview,
    commit,
    reset,
    dismissError,
  } = useUploadFlow()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const isTerminal = state.phase === "success" || state.phase === "error"
  const isUploading = state.phase === "uploading"
  const isPreviewing = state.phase === "previewing"
  const canPreview =
    state.phase === "file_selected" &&
    state.file !== null &&
    state.scenarioInput !== null
  const canCommit =
    (state.phase === "file_selected" || state.phase === "warning_shown") &&
    state.fileBase64 !== null &&
    state.scenarioInput !== null &&
    state.preview !== null &&
    !isUploading

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) selectFile(file)
    },
    [selectFile],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) selectFile(file)
    },
    [selectFile],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleConfirmReplacement = useCallback(() => {
  }, [])

  const handleCancelReplacement = useCallback(() => {
    reset()
  }, [reset])

  return (
    <Card>
      <CardHeader>
        <CardTitle>データアップロード</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex flex-col ${SPACING.sectionGap}`}>
          {isTerminal ? (
            <UploadStatus
              phase={state.phase as "uploading" | "success" | "error"}
              result={state.result}
              errorMessage={state.errorMessage}
              onRetry={dismissError}
              onReset={reset}
            />
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center rounded-none border-2 border-dashed px-6 py-10 transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : state.file
                      ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50"
                }`}
              >
                {state.file ? (
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="rounded-none bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      選択済み
                    </Badge>
                    <span className={TYPOGRAPHY.body}>{state.file.name}</span>
                    <span className={TYPOGRAPHY.small}>
                      ({(state.file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={reset}
                      className="rounded-none px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      変更
                    </button>
                  </div>
                ) : (
                  <>
                    <p className={`${TYPOGRAPHY.body} text-muted-foreground mb-2`}>
                      xlsxファイルをドラッグ＆ドロップ
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      ファイルを選択
                    </Button>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <ScenarioInputForm
                value={state.scenarioInput ?? {}}
                generatedLabel={state.generatedLabel}
                onChange={setScenarioInput}
                disabled={isUploading || isPreviewing}
              />

              {state.preview && (
                <UploadPreview
                  fileName={state.file?.name ?? null}
                  fileSize={state.file?.size ?? null}
                  previewData={state.preview}
                  replacementWarning={state.replacementWarning}
                  onConfirmReplacement={handleConfirmReplacement}
                  onCancelReplacement={handleCancelReplacement}
                />
              )}

              {state.errorMessage && state.phase === "error" && (
                <div className="rounded-none border border-red-300 bg-red-50 px-3 py-2 dark:bg-red-950/30">
                  <p className="text-red-600 text-sm">{state.errorMessage}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                {canPreview && !state.preview && (
                  <Button
                    onClick={preview}
                    disabled={isPreviewing}
                  >
                    {isPreviewing ? "プレビュー中..." : "プレビュー"}
                  </Button>
                )}
                {canCommit && (
                  <Button
                    onClick={commit}
                    disabled={isUploading}
                  >
                    {isUploading ? "アップロード中..." : "アップロード実行"}
                  </Button>
                )}
                {state.phase !== "idle" && (
                  <Button variant="ghost" onClick={reset}>
                    リセット
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
