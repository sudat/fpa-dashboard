import { useMemo } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useAnalysisData } from "@/features/analysis/hooks/use-analysis-data"
import { useAnalysisState } from "@/features/analysis/state/use-analysis-state"
import { buildUploadFromInput } from "@/lib/domain/__tests__/fixtures/upload-metadata-fixtures"
import type { ABCResolution, UploadMetadata } from "@/lib/domain/upload-contract"
import type { AnalysisData } from "@/lib/gas/gas-client"

const mockIsGasAvailable = vi.fn(() => true)
const mockGetAnalysisData = vi.fn<(scenarioFamily: "actual" | "budget" | "forecast", targetMonth: string) => Promise<AnalysisData>>()
const mockGetUploadHistory = vi.fn<() => Promise<UploadMetadata[]>>()
const mockResolveComparisonData = vi.fn(() => [])

vi.mock("@/lib/gas/gas-client", () => ({
  isGasAvailable: (...args: unknown[]) => mockIsGasAvailable(...args),
  gasClient: {
    getAnalysisData: (...args: unknown[]) => mockGetAnalysisData(...args as ["actual" | "budget" | "forecast", string]),
    getUploadHistory: (...args: unknown[]) => mockGetUploadHistory(...args as []),
  },
}))

vi.mock("@/features/analysis/lib/comparison-resolver", () => ({
  resolveComparisonData: (...args: unknown[]) => mockResolveComparisonData(...args),
}))

const overrideUploads = {
  予算: buildUploadFromInput(
    { kind: "budget", targetMonth: "2026-02" },
    { uploadId: "budget-2026-02", timestamp: "2026-02-05T00:00:00.000Z" },
  ),
  実績: buildUploadFromInput(
    { kind: "actual", targetMonth: "2026-02" },
    { uploadId: "actual-2026-02", timestamp: "2026-02-10T00:00:00.000Z" },
  ),
  見込: buildUploadFromInput(
    { kind: "forecast", targetMonth: "2026-02" },
    { uploadId: "forecast-2026-02", timestamp: "2026-02-20T00:00:00.000Z" },
  ),
} as const satisfies Record<string, UploadMetadata>

function createAnalysisData(scenarioFamily: "actual" | "budget" | "forecast", targetMonth: string): AnalysisData {
  const scenarioKey = scenarioFamily === "actual"
    ? "実績"
    : scenarioFamily === "budget"
      ? "2026年度予算"
      : "26年3月期着地見込0224時点"

  return {
    importData: [
      {
        scenarioKey,
        yearMonth: targetMonth,
        accountCode: "4001",
        extAccountCode: "EXT-4001",
        accountName: "SaaS利用料売上",
        accountType: "収益",
        deptCode: "D001",
        extDeptCode: "EXT-D001",
        deptName: "SaaS事業部",
        amount: scenarioFamily === "actual" ? 42000000 : scenarioFamily === "budget" ? 40500000 : 41000000,
      },
    ],
    accountMaster: [
      {
        detailAccountName: "SaaS利用料売上",
        aggregateAccountName: "売上高",
        sortOrder: 20,
        isGmv: false,
        bucketStatus: "normal",
      },
    ],
    departmentMaster: [
      {
        detailDepartmentName: "SaaS事業部",
        businessUnitName: "SaaS事業部",
        sortOrder: 10,
        bucketStatus: "normal",
      },
    ],
  }
}

function buildHarnessAbcOverride(selectedA: string | null, selectedB: string | null, selectedC: string | null): ABCResolution | undefined {
  if (!selectedA && !selectedB && !selectedC) {
    return undefined
  }

  return {
    A: selectedA ? overrideUploads[selectedA] : null,
    B: selectedB ? overrideUploads[selectedB] : null,
    C: selectedC ? overrideUploads[selectedC] : null,
  }
}

function IntegrationHarness() {
  const [state, actions] = useAnalysisState()
  const abcOverride = useMemo(
    () => buildHarnessAbcOverride(state.selectedA, state.selectedB, state.selectedC),
    [state.selectedA, state.selectedB, state.selectedC],
  )
  const data = useAnalysisData(state.targetMonth, abcOverride)

  return (
    <div>
      <div data-testid="target-month">{state.targetMonth}</div>
      <div data-testid="selected-a">{state.selectedA ?? "null"}</div>
      <div data-testid="selected-b">{state.selectedB ?? "null"}</div>
      <div data-testid="selected-c">{state.selectedC ?? "null"}</div>
      <div data-testid="loading-state">{data.isLoading ? "loading" : "idle"}</div>

      <button type="button" onClick={() => actions.setTargetMonth("2026-03")}>
        change-target-month
      </button>
      <button type="button" onClick={() => actions.setSelectedA("予算")}>
        select-a-budget
      </button>
      <button type="button" onClick={() => actions.setSelectedB("実績")}>
        select-b-actual
      </button>
      <button type="button" onClick={() => actions.setSelectedC("見込")}>
        select-c-forecast
      </button>
      <button type="button" onClick={actions.resetSelections}>
        reset-selections
      </button>
    </div>
  )
}

describe("filter bar state/data flow integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsGasAvailable.mockReturnValue(true)
    mockGetAnalysisData.mockImplementation(async (scenarioFamily, targetMonth) => createAnalysisData(scenarioFamily, targetMonth))
    mockGetUploadHistory.mockResolvedValue([
      overrideUploads.実績,
      overrideUploads.予算,
      overrideUploads.見込,
    ])
  })

  it("re-fetches analysis data with the new target month and clears ABC selections", async () => {
    render(<IntegrationHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("idle")
    })

    fireEvent.click(screen.getByRole("button", { name: "select-a-budget" }))
    fireEvent.click(screen.getByRole("button", { name: "select-b-actual" }))
    fireEvent.click(screen.getByRole("button", { name: "select-c-forecast" }))

    await waitFor(() => {
      expect(screen.getByTestId("selected-a")).toHaveTextContent("予算")
      expect(screen.getByTestId("selected-b")).toHaveTextContent("実績")
      expect(screen.getByTestId("selected-c")).toHaveTextContent("見込")
    })

    mockGetAnalysisData.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "change-target-month" }))

    await waitFor(() => {
      expect(screen.getByTestId("target-month")).toHaveTextContent("2026-03")
      expect(screen.getByTestId("selected-a")).toHaveTextContent("null")
      expect(screen.getByTestId("selected-b")).toHaveTextContent("null")
      expect(screen.getByTestId("selected-c")).toHaveTextContent("null")
      expect(mockGetAnalysisData).toHaveBeenCalledTimes(3)
    })

    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(1, "actual", "2026-03")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(2, "budget", "2026-03")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(3, "forecast", "2026-03")
  })

  it("builds an abcOverride from state selections and passes it to resolveComparisonData", async () => {
    render(<IntegrationHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("idle")
    })

    mockResolveComparisonData.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "select-a-budget" }))
    fireEvent.click(screen.getByRole("button", { name: "select-b-actual" }))
    fireEvent.click(screen.getByRole("button", { name: "select-c-forecast" }))

    await waitFor(() => {
      expect(mockResolveComparisonData).toHaveBeenCalled()
    })

    expect(mockResolveComparisonData.mock.calls.at(-1)?.[3]).toEqual({
      A: overrideUploads.予算,
      B: overrideUploads.実績,
      C: overrideUploads.見込,
    } satisfies ABCResolution)
  })

  it("resetSelections restores the default target month and clears abcOverride", async () => {
    render(<IntegrationHarness />)

    await waitFor(() => {
      expect(screen.getByTestId("loading-state")).toHaveTextContent("idle")
    })

    fireEvent.click(screen.getByRole("button", { name: "change-target-month" }))

    await waitFor(() => {
      expect(screen.getByTestId("target-month")).toHaveTextContent("2026-03")
    })

    fireEvent.click(screen.getByRole("button", { name: "select-a-budget" }))
    fireEvent.click(screen.getByRole("button", { name: "select-b-actual" }))
    fireEvent.click(screen.getByRole("button", { name: "select-c-forecast" }))

    await waitFor(() => {
      expect(screen.getByTestId("selected-a")).toHaveTextContent("予算")
      expect(screen.getByTestId("selected-b")).toHaveTextContent("実績")
      expect(screen.getByTestId("selected-c")).toHaveTextContent("見込")
    })

    mockGetAnalysisData.mockClear()
    mockResolveComparisonData.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "reset-selections" }))

    await waitFor(() => {
      expect(screen.getByTestId("target-month")).toHaveTextContent("2026-02")
      expect(screen.getByTestId("selected-a")).toHaveTextContent("null")
      expect(screen.getByTestId("selected-b")).toHaveTextContent("null")
      expect(screen.getByTestId("selected-c")).toHaveTextContent("null")
      expect(mockGetAnalysisData).toHaveBeenCalledTimes(3)
      expect(mockResolveComparisonData).toHaveBeenCalled()
    })

    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(1, "actual", "2026-02")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(2, "budget", "2026-02")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(3, "forecast", "2026-02")
    expect(mockResolveComparisonData.mock.calls.at(-1)?.[3]).toBeUndefined()
  })
})
