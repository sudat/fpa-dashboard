import { useState, useCallback, useRef } from "react"
import type { ScenarioKind, ScenarioInput, ReplacementWarning, UploadMetadata } from "@/lib/domain/upload-contract"
import { computeReplacementIdentity, scenarioInputSchema } from "@/lib/domain/upload-contract"
import { gasClient, isGasAvailable } from "@/lib/gas/gas-client"
import { generateScenarioLabel } from "@/lib/domain/scenario-label"
import { detectScenariosFromBase64, parseUploadWorkbookFromBase64 } from "../lib/detect-client"

const UPLOAD_ROW_CHUNK_SIZE = 1000

export type UploadPhase =
  | "idle"
  | "file_selected"
  | "warning_shown"
  | "uploading"
  | "success"
  | "error"

export interface DetectedScenario {
  kind: ScenarioKind
  targetMonth: string
  monthCount: number
  rowCount: number
  scenarioKey?: string
  firstMonth?: string
  lastMonth?: string
  forecastStart?: string
}

export interface UploadState {
  phase: UploadPhase
  file: File | null
  scenarioInput: ScenarioInput | null
  generatedLabel: string | null
  detectedScenarios: DetectedScenario[] | null
  replacementWarning: ReplacementWarning | null
  result: UploadMetadata | null
  errorMessage: string | null
  isReadingFile: boolean
}

const INITIAL_STATE: UploadState = {
  phase: "idle",
  file: null,
  scenarioInput: null,
  generatedLabel: null,
  detectedScenarios: null,
  replacementWarning: null,
  result: null,
  errorMessage: null,
  isReadingFile: false,
}

function mockCommitUpload(fileName: string, input: ScenarioInput, confirmedReplacement: ReplacementWarning | null): UploadMetadata {
  void confirmedReplacement
  const label = generateScenarioLabel(input)
  return {
    uploadId: `mock-${Date.now()}`,
    timestamp: new Date().toISOString(),
    uploader: "mock-user@example.com",
    scenarioInput: input,
    generatedLabel: label,
    replacementIdentity: {
      generatedLabel: label,
      scenarioFamily: input.kind,
    },
    fileName,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(",")[1] ?? ""
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"))
    reader.readAsDataURL(file)
  })
}

function shouldResetReplacementWarning(errorMessage: string): boolean {
  return errorMessage.includes("上書き確認が必要です") || errorMessage.includes("上書き対象が変更されています")
}

function autoPopulateFromDetected(detected: DetectedScenario[] | null): {
  scenarioInput: ScenarioInput | null
  generatedLabel: string | null
} {
  if (!detected || detected.length === 0) return { scenarioInput: null, generatedLabel: null }

  const actual = detected.find((scenario) => scenario.kind === "actual")
  const primary = actual ?? detected[0]
  const forecastStart = primary.kind === "actual"
    ? [...detected]
      .filter((scenario) => scenario.kind === "forecast")
      .map((scenario) => scenario.forecastStart ?? scenario.firstMonth ?? null)
      .filter((value): value is string => value !== null && value > primary.targetMonth)
      .sort((left, right) => left.localeCompare(right, "ja"))[0]
    : primary.forecastStart

  try {
    const scenarioInput = scenarioInputSchema.parse(
      forecastStart
        ? {
          kind: primary.kind,
          targetMonth: primary.targetMonth,
          forecastStart,
        }
        : {
          kind: primary.kind,
          targetMonth: primary.targetMonth,
        },
    )

    return {
      scenarioInput,
      generatedLabel: generateScenarioLabel(scenarioInput),
    }
  } catch {
    return { scenarioInput: null, generatedLabel: null }
  }
}

export function useUploadFlow() {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)
  const workbookBase64Ref = useRef<string | null>(null)
  const operationIdRef = useRef(0)

  const reset = useCallback(() => {
    operationIdRef.current += 1
    workbookBase64Ref.current = null
    setState(INITIAL_STATE)
  }, [])

  const selectFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState((prev) => ({ ...prev, phase: "error", errorMessage: "xlsx形式のファイルを選択してください" }))
      return
    }

    const operationId = ++operationIdRef.current
    workbookBase64Ref.current = null
    setState({
      ...INITIAL_STATE,
      file,
      isReadingFile: true,
    })

    try {
      const base64 = await fileToBase64(file)
      if (operationId !== operationIdRef.current) return

      const detectedScenarios = detectScenariosFromBase64(base64)
      if (detectedScenarios.length === 0) {
        throw new Error("アップロード対象データが見つかりませんでした")
      }

      workbookBase64Ref.current = base64

      const detected = detectedScenarios.length > 0 ? detectedScenarios : null
      const { scenarioInput, generatedLabel } = autoPopulateFromDetected(detected)

      setState({
        ...INITIAL_STATE,
        phase: "file_selected",
        file,
        detectedScenarios: detected,
        scenarioInput,
        generatedLabel,
      })
    } catch (e) {
      if (operationId !== operationIdRef.current) return
      workbookBase64Ref.current = null

      setState({
        ...INITIAL_STATE,
        file,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "ファイル読み込みエラー",
      })
    }
  }, [])

  const setScenarioInput = useCallback((input: ScenarioInput) => {
    const parsed = scenarioInputSchema.safeParse(input)
    if (!parsed.success) {
      return
    }
    const label = generateScenarioLabel(parsed.data)
    setState((prev) => ({
      ...prev,
      scenarioInput: parsed.data,
      generatedLabel: label,
      replacementWarning: null,
      phase: prev.file ? "file_selected" : prev.phase,
    }))
  }, [])

  const commit = useCallback(async () => {
    const workbookBase64 = workbookBase64Ref.current
    const { file, scenarioInput, replacementWarning } = state
    if (!workbookBase64 || !file || !scenarioInput) return

    const operationId = ++operationIdRef.current

    if (!replacementWarning && isGasAvailable()) {
      try {
        const uploadHistory = await gasClient.getUploadHistory()
        if (operationId !== operationIdRef.current) return

        const nextWarning = computeReplacementIdentity(uploadHistory, scenarioInput)
        if (nextWarning) {
          setState((prev) => ({
            ...prev,
            phase: "warning_shown",
            replacementWarning: nextWarning,
            errorMessage: null,
          }))
          return
        }
      } catch (e) {
        if (operationId !== operationIdRef.current) return

        setState((prev) => ({
          ...prev,
          phase: "error",
          errorMessage: e instanceof Error ? e.message : "既存アップロード確認エラー",
        }))
        return
      }
    }

    setState((prev) => ({
      ...prev,
      phase: "uploading",
      errorMessage: null,
    }))

    try {
      const useMock = !isGasAvailable()
      const result = useMock
        ? mockCommitUpload(file.name, scenarioInput, replacementWarning)
        : await (async () => {
          const { rawRows } = parseUploadWorkbookFromBase64(workbookBase64)
          if (rawRows.length === 0) {
            throw new Error("アップロード対象データが見つかりませんでした")
          }
          let uploadId: string | null = null
          let abortFailure: Error | null = null

          try {
            const session = await gasClient.startUploadSession(
              workbookBase64,
              file.name,
              scenarioInput,
              replacementWarning,
            )
            uploadId = session.uploadId

            for (let i = 0; i < rawRows.length; i += UPLOAD_ROW_CHUNK_SIZE) {
              await gasClient.appendUploadRows(
                uploadId,
                rawRows.slice(i, i + UPLOAD_ROW_CHUNK_SIZE),
              )
            }

            const finalized = await gasClient.finalizeUploadSession(uploadId)
            uploadId = null
            return finalized
          } catch (error) {
            if (uploadId) {
              try {
                await gasClient.abortUploadSession(uploadId)
              } catch (cleanupError) {
                abortFailure = cleanupError instanceof Error
                  ? cleanupError
                  : new Error("アップロード中断処理に失敗しました")
              }
            }

            if (abortFailure) {
              const baseMessage = error instanceof Error ? error.message : "アップロードエラー"
              throw new Error(`${baseMessage} / 後片付けにも失敗しました: ${abortFailure.message}`)
            }

            throw error
          }
        })()

      if (operationId !== operationIdRef.current) return

      setState((prev) => ({
        ...prev,
        phase: "success",
        result,
      }))
    } catch (e) {
      if (operationId !== operationIdRef.current) return

      const errorMessage = e instanceof Error ? e.message : "アップロードエラー"
      setState((prev) => ({
        ...prev,
        phase: "error",
        replacementWarning: shouldResetReplacementWarning(errorMessage) ? null : prev.replacementWarning,
        errorMessage,
      }))
    }
  }, [state])

  const dismissReplacementWarning = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "file_selected",
      replacementWarning: null,
      errorMessage: null,
    }))
  }, [])

  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: prev.replacementWarning ? "warning_shown" : prev.file ? "file_selected" : "idle",
      errorMessage: null,
    }))
  }, [])

  return {
    state,
    selectFile,
    setScenarioInput,
    commit,
    reset,
    dismissError,
    dismissReplacementWarning,
  }
}
