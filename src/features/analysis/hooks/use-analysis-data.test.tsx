import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { AnalysisData } from "@/lib/gas/gas-client"
import type { UploadMetadata } from "@/lib/domain/upload-contract"

const mockIsGasAvailable = vi.fn(() => false)
const mockGetAnalysisData = vi.fn<(scenarioFamily: "actual" | "budget" | "forecast", targetMonth: string) => Promise<AnalysisData>>()
const mockGetUploadHistory = vi.fn<() => Promise<UploadMetadata[]>>()

vi.mock("@/lib/gas/gas-client", () => ({
  isGasAvailable: (...args: unknown[]) => mockIsGasAvailable(...args),
  gasClient: {
    getAnalysisData: (...args: unknown[]) => mockGetAnalysisData(...args as ["actual" | "budget" | "forecast", string]),
    getUploadHistory: (...args: unknown[]) => mockGetUploadHistory(...args as []),
  },
}))

describe("useAnalysisData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockIsGasAvailable.mockReturnValue(false)
    mockGetUploadHistory.mockResolvedValue([])
  })

  it("falls back to fixture data when GAS is unavailable", async () => {
    const { useAnalysisData } = await import("./use-analysis-data")
    const { result } = renderHook(() => useAnalysisData())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetAnalysisData).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
    expect(result.current.normalizedData.length).toBeGreaterThan(0)
    expect(result.current.comparisonData.length).toBeGreaterThan(0)
    expect(result.current.normalizedData.some((row) => row.department.code === "ALL")).toBe(true)
  })

  it("loads persisted import data and applies master mapping when GAS is available", async () => {
    mockIsGasAvailable.mockReturnValue(true)

    mockGetAnalysisData.mockImplementation(async (scenarioFamily) => ({
      importData: [
        {
          scenarioKey: scenarioFamily === "actual" ? "実績" : scenarioFamily === "budget" ? "2026年度予算" : "26年3月期着地見込0224時点",
          yearMonth: "2026-02",
          accountCode: "4001",
          extAccountCode: "EXT-4001",
          accountName: "SaaS利用料売上",
          accountType: "収益",
          deptCode: "D001",
          extDeptCode: "EXT-D001",
          deptName: "未知の部署",
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
        {
          detailAccountName: "未割当",
          aggregateAccountName: "未割当",
          sortOrder: 99000,
          isGmv: false,
          bucketStatus: "unassigned",
        },
      ],
      departmentMaster: [
        {
          detailDepartmentName: "未割当",
          businessUnitName: "未割当",
          sortOrder: 99000,
          bucketStatus: "unassigned",
        },
      ],
    }))
    mockGetUploadHistory.mockResolvedValue([
      {
        uploadId: "actual-2026-02",
        timestamp: "2026-02-10T00:00:00.000Z",
        uploader: "fpa@example.com",
        scenarioInput: {
          kind: "actual",
          targetMonth: "2026-02",
        },
        generatedLabel: "2026/02月実績",
        replacementIdentity: {
          generatedLabel: "2026/02月実績",
          scenarioFamily: "actual",
        },
        fileName: "actual-2026-02.xlsx",
      },
    ])

    const { useAnalysisData } = await import("./use-analysis-data")
    const { result } = renderHook(() => useAnalysisData())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockGetAnalysisData).toHaveBeenCalledTimes(3)
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(1, "actual", "2026-02")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(2, "budget", "2026-02")
    expect(mockGetAnalysisData).toHaveBeenNthCalledWith(3, "forecast", "2026-02")
    expect(mockGetUploadHistory).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBeNull()

    expect(
      result.current.normalizedData.some(
        (row) =>
          row.account.detailName === "SaaS利用料売上" &&
          row.account.aggregateName === "売上高" &&
          row.department.name === "未割当" &&
          row.metricType === "実績",
      ),
    ).toBe(true)
  })
})
