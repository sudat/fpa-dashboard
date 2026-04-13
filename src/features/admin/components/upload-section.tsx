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
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-dashed px-6 py-10 transition-colors",
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
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={reset}
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
                detectedScenarios={state.detectedScenarios}
                generatedLabel={state.generatedLabel}
                isLoading={isPreviewing}
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
                <div className="rounded-md border border-[color:var(--negative)] bg-negative-muted px-3 py-2">
                  <p className="text-negative text-sm">{state.errorMessage}</p>
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
