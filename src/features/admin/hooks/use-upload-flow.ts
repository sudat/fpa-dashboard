import { useState, useCallback, useRef } from "react"
import type { ScenarioInput, ReplacementWarning, UploadMetadata } from "@/lib/domain/upload-contract"
import { scenarioInputSchema } from "@/lib/domain/upload-contract"
import { gasClient, isGasAvailable, type UploadPreview } from "@/lib/gas/gas-client"
import { generateScenarioLabel } from "@/lib/domain/scenario-label"

export type UploadPhase =
  | "idle"
  | "file_selected"
  | "previewing"
  | "warning_shown"
  | "uploading"
  | "success"
  | "error"

export interface UploadState {
  phase: UploadPhase
  file: File | null
  fileBase64: string | null
  scenarioInput: ScenarioInput | null
  generatedLabel: string | null
  preview: UploadPreview["preview"] | null
  replacementWarning: ReplacementWarning | null
  result: UploadMetadata | null
  errorMessage: string | null
}

const INITIAL_STATE: UploadState = {
  phase: "idle",
  file: null,
  fileBase64: null,
  scenarioInput: null,
  generatedLabel: null,
  preview: null,
  replacementWarning: null,
  result: null,
  errorMessage: null,
}

function mockPreviewUpload(_base64: string, _input: ScenarioInput): UploadPreview {
  return {
    preview: {
      rawRowCount: 42,
      departments: ["全社", "SaaS事業部"],
      accounts: ["売上高", "売上原価", "販管費"],
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
      // strip data:xxx;base64, prefix
      const base64 = result.split(",")[1] ?? ""
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"))
    reader.readAsDataURL(file)
  })
}

export function useUploadFlow() {
  const [state, setState] = useState<UploadState>(INITIAL_STATE)
  const abortRef = useRef(false)

  const reset = useCallback(() => {
    abortRef.current = false
    setState(INITIAL_STATE)
  }, [])

  const selectFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setState((prev) => ({ ...prev, phase: "error", errorMessage: "xlsx形式のファイルを選択してください" }))
      return
    }
    try {
      const base64 = await fileToBase64(file)
      setState({
        ...INITIAL_STATE,
        phase: "file_selected",
        file,
        fileBase64: base64,
      })
    } catch (e) {
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "ファイル読み込みエラー",
      }))
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
    }))
  }, [])

  const preview = useCallback(async () => {
    const { fileBase64, scenarioInput } = state
    if (!fileBase64 || !scenarioInput) return

    abortRef.current = false
    setState((prev) => ({ ...prev, phase: "previewing", preview: null, replacementWarning: null }))

    try {
      const useMock = !isGasAvailable()
      const result = useMock
        ? mockPreviewUpload(fileBase64, scenarioInput)
        : await gasClient.previewUpload(fileBase64, scenarioInput)

      if (abortRef.current) return

      setState((prev) => ({
        ...prev,
        preview: result.preview,
        replacementWarning: result.replacementWarning,
        phase: result.replacementWarning ? "warning_shown" : "file_selected",
      }))
    } catch (e) {
      if (abortRef.current) return
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "プレビュー取得エラー",
      }))
    }
  }, [state])

  const commit = useCallback(async () => {
    const { fileBase64, scenarioInput, replacementWarning } = state
    if (!fileBase64 || !scenarioInput) return

    abortRef.current = false
    setState((prev) => ({ ...prev, phase: "uploading" }))

    try {
      const useMock = !isGasAvailable()
      const result = useMock
        ? mockCommitUpload(fileBase64, scenarioInput, replacementWarning)
        : await gasClient.commitUpload(fileBase64, scenarioInput, replacementWarning)

      if (abortRef.current) return

      setState((prev) => ({
        ...prev,
        phase: "success",
        result,
      }))
    } catch (e) {
      if (abortRef.current) return
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage: e instanceof Error ? e.message : "アップロードエラー",
      }))
    }
  }, [state])

  const dismissError = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "file_selected", errorMessage: null }))
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
