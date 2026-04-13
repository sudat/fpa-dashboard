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
import { cn } from "@/lib/utils"
import { useUploadFlow } from "../hooks/use-upload-flow"
import { ScenarioInputForm } from "./scenario-input-form"
import { UploadPreview } from "./upload-preview"
import { UploadStatus } from "./upload-status"

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"]

export function UploadSection() {
  const {
    state,
    selectFile,
    commit,
    reset,
    dismissError,
  } = useUploadFlow()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const isTerminal = state.phase === "uploading" || state.phase === "success" || state.phase === "error"
  const isReadingFile = state.isReadingFile
  const isUploading = state.phase === "uploading"
  const isInteractionDisabled = isReadingFile || isUploading
  const canCommit =
    (state.phase === "file_selected" || state.phase === "warning_shown") &&
    state.fileBase64 !== null &&
    state.scenarioInput !== null &&
    !isReadingFile &&
    !isUploading

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        void selectFile(file)
      }
    },
    [selectFile],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      if (isInteractionDisabled) return
      const file = e.dataTransfer.files[0]
      if (file) {
        void selectFile(file)
      }
    },
    [isInteractionDisabled, selectFile],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (isInteractionDisabled) return
    setIsDragOver(true)
  }, [isInteractionDisabled])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const handleConfirmReplacement = useCallback(() => {
    void commit()
  }, [commit])

  const handleCancelReplacement = useCallback(() => {
    reset()
  }, [reset])

  const handleRetry = useCallback(() => {
    if (state.fileBase64 && state.scenarioInput) {
      void commit()
      return
    }
    dismissError()
  }, [commit, dismissError, state.fileBase64, state.scenarioInput])

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
              onRetry={handleRetry}
              onReset={reset}
            />
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 transition-colors",
                  isInteractionDisabled && "opacity-70",
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : state.file
                      ? "border-[color:var(--positive)] bg-positive-muted"
                      : "border-muted-foreground/30 hover:border-muted-foreground/50",
                )}
              >
                {state.file ? (
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className="border-[color:var(--positive)] bg-positive-muted text-positive"
                    >
                      選択済み
                    </Badge>
                    <span className={TYPOGRAPHY.body}>{state.file.name}</span>
                    <span className={TYPOGRAPHY.small}>
                      ({(state.file.size / 1024).toFixed(1)} KB)
                    </span>
                    {isReadingFile && (
                      <>
                        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className={`${TYPOGRAPHY.small} text-muted-foreground`}>
                          読み込み中...
                        </span>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={reset}
                      disabled={isInteractionDisabled}
                    >
                      変更
                    </Button>
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
                      disabled={isInteractionDisabled}
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
                  disabled={isInteractionDisabled}
                  className="hidden"
                />
              </div>

              <ScenarioInputForm
                detectedScenarios={state.detectedScenarios}
                generatedLabel={state.generatedLabel}
                isLoading={state.isReadingFile}
              />

              {state.file && (state.preview || state.replacementWarning || state.isPreviewLoading) && (
                <UploadPreview
                  fileName={state.file?.name ?? null}
                  fileSize={state.file?.size ?? null}
                  previewData={state.preview}
                  replacementWarning={state.replacementWarning}
                  isLoading={state.isPreviewLoading}
                  onConfirmReplacement={handleConfirmReplacement}
                  onCancelReplacement={handleCancelReplacement}
                />
              )}

              <div className="flex items-center gap-3">
                {canCommit && (
                  <Button
                    onClick={() => { void commit() }}
                    disabled={isUploading}
                  >
                    {isUploading ? "アップロード中..." : "アップロード実行"}
                  </Button>
                )}
                {(state.phase !== "idle" || state.file !== null || state.isReadingFile) && (
                  <Button variant="ghost" onClick={reset} disabled={isUploading}>
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
