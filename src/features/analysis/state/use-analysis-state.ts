import { useReducer, useEffect, useCallback } from "react"
import type { OrgTab } from "@/features/layout/components/top-tabs"
import type { TimeAxis } from "@/features/layout/components/time-axis-pills"

export interface WeakLinkTarget {
  accountName: string
  expandedAt: number | null
}

export interface AnalysisState {
  activeOrgTab: OrgTab
  activeTimeAxis: TimeAxis
  selectedAccount: string | null
  metricMode: "amount" | "gmvRatio"
  weakLinkTarget: WeakLinkTarget | null
  activeSubView: "trend" | "table"
  targetMonth: string
  selectedA: string | null
  selectedB: string | null
  selectedC: string | null
}

export type AnalysisAction =
  | { type: "SET_ACTIVE_ORG_TAB"; payload: OrgTab }
  | { type: "SET_ACTIVE_TIME_AXIS"; payload: TimeAxis }
  | { type: "SET_SELECTED_ACCOUNT"; payload: string | null }
  | { type: "SET_METRIC_MODE"; payload: "amount" | "gmvRatio" }
  | { type: "SET_WEAK_LINK_TARGET"; payload: WeakLinkTarget | null }
  | { type: "CLEAR_WEAK_LINK_TARGET" }
  | { type: "SET_ACTIVE_SUB_VIEW"; payload: "trend" | "table" }
  | { type: "SET_TARGET_MONTH"; payload: string }
  | { type: "SET_SELECTED_A"; payload: string | null }
  | { type: "SET_SELECTED_B"; payload: string | null }
  | { type: "SET_SELECTED_C"; payload: string | null }
  | { type: "RESET_SELECTIONS" }

export const DEFAULT_STATE: AnalysisState = {
  activeOrgTab: "全社",
  activeTimeAxis: "着地見込",
  selectedAccount: null,
  metricMode: "amount",
  weakLinkTarget: null,
  activeSubView: "trend",
  targetMonth: "2026-02",
  selectedA: null,
  selectedB: null,
  selectedC: null,
}

function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
  switch (action.type) {
    case "SET_ACTIVE_ORG_TAB":
      return { ...state, activeOrgTab: action.payload }
    case "SET_ACTIVE_TIME_AXIS":
      return { ...state, activeTimeAxis: action.payload }
    case "SET_SELECTED_ACCOUNT":
      return { ...state, selectedAccount: action.payload }
    case "SET_METRIC_MODE":
      return { ...state, metricMode: action.payload }
    case "SET_WEAK_LINK_TARGET":
      return { ...state, weakLinkTarget: action.payload }
    case "CLEAR_WEAK_LINK_TARGET":
      return { ...state, weakLinkTarget: null }
    case "SET_ACTIVE_SUB_VIEW":
      return { ...state, activeSubView: action.payload }
    case "SET_TARGET_MONTH":
      return { ...state, targetMonth: action.payload, selectedA: null, selectedB: null, selectedC: null }
    case "SET_SELECTED_A":
      return { ...state, selectedA: action.payload }
    case "SET_SELECTED_B":
      return { ...state, selectedB: action.payload }
    case "SET_SELECTED_C":
      return { ...state, selectedC: action.payload }
    case "RESET_SELECTIONS":
      return { ...DEFAULT_STATE, activeOrgTab: state.activeOrgTab, activeTimeAxis: state.activeTimeAxis }
    default:
      return state
  }
}

const WEAK_LINK_TIMEOUT_MS = 3000

export interface AnalysisActions {
  setActiveOrgTab: (tab: OrgTab) => void
  setActiveTimeAxis: (axis: TimeAxis) => void
  setSelectedAccount: (account: string | null) => void
  setMetricMode: (mode: "amount" | "gmvRatio") => void
  setWeakLinkTarget: (target: WeakLinkTarget | null) => void
  setActiveSubView: (view: "trend" | "table") => void
  setTargetMonth: (month: string) => void
  setSelectedA: (a: string | null) => void
  setSelectedB: (b: string | null) => void
  setSelectedC: (c: string | null) => void
  resetSelections: () => void
}

export function useAnalysisState(): [AnalysisState, AnalysisActions] {
  const [state, dispatch] = useReducer(analysisReducer, DEFAULT_STATE)

  useEffect(() => {
    if (!state.weakLinkTarget) return
    const timer = setTimeout(() => {
      dispatch({ type: "CLEAR_WEAK_LINK_TARGET" })
    }, WEAK_LINK_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [state.weakLinkTarget])

  const setActiveOrgTab = useCallback((tab: OrgTab) => {
    dispatch({ type: "SET_ACTIVE_ORG_TAB", payload: tab })
  }, [])

  const setActiveTimeAxis = useCallback((axis: TimeAxis) => {
    dispatch({ type: "SET_ACTIVE_TIME_AXIS", payload: axis })
  }, [])

  const setSelectedAccount = useCallback((account: string | null) => {
    dispatch({ type: "SET_SELECTED_ACCOUNT", payload: account })
  }, [])

  const setMetricMode = useCallback((mode: "amount" | "gmvRatio") => {
    dispatch({ type: "SET_METRIC_MODE", payload: mode })
  }, [])

  const setWeakLinkTarget = useCallback((target: WeakLinkTarget | null) => {
    dispatch({ type: "SET_WEAK_LINK_TARGET", payload: target })
  }, [])

  const setActiveSubView = useCallback((view: "trend" | "table") => {
    dispatch({ type: "SET_ACTIVE_SUB_VIEW", payload: view })
  }, [])

  const setTargetMonth = useCallback((month: string) => {
    dispatch({ type: "SET_TARGET_MONTH", payload: month })
  }, [])

  const setSelectedA = useCallback((a: string | null) => {
    dispatch({ type: "SET_SELECTED_A", payload: a })
  }, [])

  const setSelectedB = useCallback((b: string | null) => {
    dispatch({ type: "SET_SELECTED_B", payload: b })
  }, [])

  const setSelectedC = useCallback((c: string | null) => {
    dispatch({ type: "SET_SELECTED_C", payload: c })
  }, [])

  const resetSelections = useCallback(() => {
    dispatch({ type: "RESET_SELECTIONS" })
  }, [])

  return [
    state,
    {
      setActiveOrgTab,
      setActiveTimeAxis,
      setSelectedAccount,
      setMetricMode,
      setWeakLinkTarget,
      setActiveSubView,
      setTargetMonth,
      setSelectedA,
      setSelectedB,
      setSelectedC,
      resetSelections,
    },
  ]
}
