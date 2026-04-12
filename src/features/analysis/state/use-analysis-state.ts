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
}

export type AnalysisAction =
  | { type: "SET_ACTIVE_ORG_TAB"; payload: OrgTab }
  | { type: "SET_ACTIVE_TIME_AXIS"; payload: TimeAxis }
  | { type: "SET_SELECTED_ACCOUNT"; payload: string | null }
  | { type: "SET_METRIC_MODE"; payload: "amount" | "gmvRatio" }
  | { type: "SET_WEAK_LINK_TARGET"; payload: WeakLinkTarget | null }
  | { type: "CLEAR_WEAK_LINK_TARGET" }
  | { type: "SET_ACTIVE_SUB_VIEW"; payload: "trend" | "table" }
  | { type: "RESET_SELECTIONS" }

export const DEFAULT_STATE: AnalysisState = {
  activeOrgTab: "全社",
  activeTimeAxis: "着地見込",
  selectedAccount: null,
  metricMode: "amount",
  weakLinkTarget: null,
  activeSubView: "trend",
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
      resetSelections,
    },
  ]
}
