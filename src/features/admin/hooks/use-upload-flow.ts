import { useState, useCallback, useRef } from "react"
import type { ScenarioKind, ScenarioInput, ReplacementWarning, UploadMetadata } from "@/lib/domain/upload-contract"
import { scenarioInputSchema } from "@/lib/domain/upload-contract"
import { gasClient, isGasAvailable, type UploadPreview } from "@/lib/gas/gas-client"
import { generateScenarioLabel } from "@/lib/domain/scenario-label"
import { detectScenariosFromBase64 } from "../lib/detect-client"

export type UploadPhase =
  | "idle"
  | "file_selected"
  | "previewing"
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
  fileBase64: string | null
  scenarioInput: ScenarioInput | null
  generatedLabel: string | null
  preview: UploadPreview["preview"] | null
  detectedScenarios: DetectedScenario[] | null
  replacementWarning: ReplacementWarning | null
  result: UploadMetadata | null
  errorMessage: string | null
  isReadingFile: boolean
  isPreviewLoading: boolean
}

const INITIAL_STATE: UploadState = {
  phase: "idle",
  file: null,
  fileBase64: null,
  scenarioInput: null,
  generatedLabel: null,
  preview: null,
  detectedScenarios: null,
  replacementWarning: null,
  result: null,
  errorMessage: null,
  isReadingFile: false,
  isPreviewLoading: false,
}

function mockPreviewUpload(_base64: string, _input: ScenarioInput): UploadPreview {
  return {
    preview: {
      rawRowCount: 42,
      departments: ["全社", "SaaS事業部"],
      accounts: ["売上高", "売上原価", "販管費"],
      detectedScenarios: [
        {
          kind: "actual",
          targetMonth: "2026-01",
          monthCount: 12,
          rowCount: 42,
          firstMonth: "2025-02",
          lastMonth: "2026-01",
        },
      ],
    },
    replacementWarning: null,
  }
}

function mockCommitUpload(_base64: string, input: ScenarioInput, _warning: ReplacementWarning | null): UploadMetadata {
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
    fileName: "uploaded.xlsx",
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

function buildDefaultScenarioInput(): ScenarioInput {
  const now = new Date()
  const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  return scenarioInputSchema.parse({ kind: "actual" as ScenarioKind, targetMonth })
}

function extractDetectedScenarios(result: unknown): DetectedScenario[] | null {
  const obj = result as Record<string, unknown>
  const preview = obj?.preview as Record<string, unknown> | undefined
  if (Array.isArray(preview?.detectedScenarios)) {
    return preview.detectedScenarios as DetectedScenario[]
  }
  return null
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
  const fileBase64Ref = useRef<string | null>(null)
  const operationIdRef = useRef(0)

  const reset = useCallback(() => {
    operationIdRef.current += 1
    fileBase64Ref.current = null
    setState(INITIAL_STATE)
  }, [])

  const loadPreview = useCallback(async ({
    fileBase64,
    input,
    operationId,
    background,
  }: {
    fileBase64: string
    input: ScenarioInput
    operationId: number
    background: boolean
  }) => {
    setState((prev) => ({
      ...prev,
      isPreviewLoading: true,
      ...(background
        ? {}
        : {
          phase: "previewing" as UploadPhase,
          preview: null,
          replacementWarning: null,
          errorMessage: null,
        }),
    }))

    try {
      const useMock = !isGasAvailable()
      const result = useMock
        ? mockPreviewUpload(fileBase64, input)
        : await gasClient.previewUpload(fileBase64, input)

      if (operationId !== operationIdRef.current) return

      const detected = extractDetectedScenarios(result)
      const { scenarioInput, generatedLabel } = autoPopulateFromDetected(detected)

      setState((prev) => ({
        ...prev,
        preview: result.preview,
        replacementWarning: result.replacementWarning,
        detectedScenarios: detected ?? prev.detectedScenarios,
        scenarioInput: scenarioInput ?? prev.scenarioInput,
        generatedLabel: generatedLabel ?? prev.generatedLabel,
        isPreviewLoading: false,
        phase: result.replacementWarning ? "warning_shown" : "file_selected",
      }))
    } catch (e) {
      if (operationId !== operationIdRef.current) return

      setState((prev) =>
        background
          ? {
            ...prev,
            isPreviewLoading: false,
          }
          : {
            ...prev,
            phase: "error",
            errorMessage: e instanceof Error ? e.message : "プレビュー取得エラー",
            isPreviewLoading: false,
          },
      )
    }
  }, [])

  const selectFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState((prev) => ({ ...prev, phase: "error", errorMessage: "xlsx形式のファイルを選択してください" }))
      return
    }

    const operationId = ++operationIdRef.current
    fileBase64Ref.current = null
    setState({
      ...INITIAL_STATE,
      file,
      isReadingFile: true,
    })

    try {
      const base64 = await fileToBase64(file)
      if (operationId !== operationIdRef.current) return

      fileBase64Ref.current = base64

      const detected = detectScenariosFromBase64(base64)
      const { scenarioInput, generatedLabel } = autoPopulateFromDetected(detected)

      setState({
        ...INITIAL_STATE,
        phase: "file_selected",
        file,
        fileBase64: base64,
        detectedScenarios: detected.length > 0 ? detected : null,
        scenarioInput,
        generatedLabel,
      })

      void loadPreview({
        fileBase64: base64,
        input: scenarioInput ?? buildDefaultScenarioInput(),
        operationId,
        background: true,
      })
    } catch (e) {
      if (operationId !== operationIdRef.current) return

      setState({
        ...INITIAL_STATE,
        file,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "ファイル読み込みエラー",
      })
    }
  }, [loadPreview])

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
    }))
  }, [])

  const preview = useCallback(async () => {
    const fileBase64 = fileBase64Ref.current
    if (!fileBase64) return

    const operationId = ++operationIdRef.current
    await loadPreview({
      fileBase64,
      input: state.scenarioInput ?? buildDefaultScenarioInput(),
      operationId,
      background: false,
    })
  }, [loadPreview, state.scenarioInput])

  const commit = useCallback(async () => {
    const fileBase64 = fileBase64Ref.current
    const { scenarioInput, replacementWarning } = state
    if (!fileBase64 || !scenarioInput) return

    const operationId = ++operationIdRef.current
    setState((prev) => ({
      ...prev,
      phase: "uploading",
      errorMessage: null,
      isPreviewLoading: false,
    }))

    try {
      const useMock = !isGasAvailable()
      const result = useMock
        ? mockCommitUpload(fileBase64, scenarioInput, replacementWarning)
        : await gasClient.commitUpload(fileBase64, scenarioInput, replacementWarning)

      if (operationId !== operationIdRef.current) return

      setState((prev) => ({
        ...prev,
        phase: "success",
        result,
      }))
    } catch (e) {
      if (operationId !== operationIdRef.current) return

      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "アップロードエラー",
      }))
    }
  }, [state])

  const dismissError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: prev.replacementWarning ? "warning_shown" : prev.fileBase64 ? "file_selected" : "idle",
      errorMessage: null,
    }))
  }, [])

  return {
    state,
    selectFile,
    setScenarioInput,
    preview,
    commit,
    reset,
    dismissError,
  }
}
