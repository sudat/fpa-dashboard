import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

// Mock window.google.script.run before importing gas-client
const mockSuccessHandlers: Record<string, (result: unknown) => void> = {};
const mockFailureHandlers: Record<string, (error: Error) => void> = {};
const mockCalls: Record<string, unknown[][]> = {};

function createMockRunner(fnName: string) {
  const mockFn = (...args: unknown[]) => {
    if (!mockCalls[fnName]) mockCalls[fnName] = [];
    mockCalls[fnName].push(args);
  };

  (mockFn as unknown as Record<string, unknown>).withSuccessHandler = vi.fn(
    (cb: (result: unknown) => void) => {
      mockSuccessHandlers[fnName] = cb;
      return mockFn;
    },
  );

  (mockFn as unknown as Record<string, unknown>).withFailureHandler = vi.fn(
    (cb: (error: Error) => void) => {
      mockFailureHandlers[fnName] = cb;
      return mockFn;
    },
  );

  return mockFn;
}

function resetMocks() {
  Object.keys(mockSuccessHandlers).forEach((k) => delete mockSuccessHandlers[k]);
  Object.keys(mockFailureHandlers).forEach((k) => delete mockFailureHandlers[k]);
  Object.keys(mockCalls).forEach((k) => delete mockCalls[k]);
}

const mockCurrentUser = createMockRunner("getCurrentUser");
const mockPreviewUpload = createMockRunner("previewUpload");
const mockCommitUpload = createMockRunner("commitUpload");
const mockGetUploadHistory = createMockRunner("getUploadHistory");
const mockGetAccountMaster = createMockRunner("getAccountMaster");
const mockSaveAccountMaster = createMockRunner("saveAccountMaster");
const mockGetDepartmentMaster = createMockRunner("getDepartmentMaster");
const mockSaveDepartmentMaster = createMockRunner("saveDepartmentMaster");
const mockGetAnalysisData = createMockRunner("getAnalysisData");

beforeEach(() => {
  resetMocks();

  Object.defineProperty(globalThis, "window", {
    value: {
      google: {
        script: {
          run: {
            getCurrentUser: mockCurrentUser,
            previewUpload: mockPreviewUpload,
            commitUpload: mockCommitUpload,
            getUploadHistory: mockGetUploadHistory,
            getAccountMaster: mockGetAccountMaster,
            saveAccountMaster: mockSaveAccountMaster,
            getDepartmentMaster: mockGetDepartmentMaster,
            saveDepartmentMaster: mockSaveDepartmentMaster,
            getAnalysisData: mockGetAnalysisData,
          },
        },
      },
    },
    writable: true,
  });
});

describe("gasClient", () => {
  it("getCurrentUser resolves with validated user", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getCurrentUser();

    mockSuccessHandlers["getCurrentUser"]({ email: "test@example.com", name: "Test User" });

    const result = await promise;
    expect(result).toEqual({ email: "test@example.com", name: "Test User" });
  });

  it("getCurrentUser rejects on invalid response", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getCurrentUser();

    mockSuccessHandlers["getCurrentUser"]({ email: "", name: "" });

    await expect(promise).rejects.toThrow();
  });

  it("previewUpload resolves with validated preview", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const scenarioInput = { kind: "actual" as const, targetMonth: "2026-01" };
    const promise = gasClient.previewUpload("base64data", scenarioInput);

    mockSuccessHandlers["previewUpload"]({
      preview: { rawRowCount: 100, departments: ["営業部"], accounts: ["売上高"] },
      replacementWarning: null,
    });

    const result = await promise;
    expect(result.preview.rawRowCount).toBe(100);
    expect(result.replacementWarning).toBeNull();
  });

  it("previewUpload passes validated scenarioInput to GAS", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const scenarioInput = { kind: "actual" as const, targetMonth: "2026-01" };
    const promise = gasClient.previewUpload("data", scenarioInput);

    mockSuccessHandlers["previewUpload"]({
      preview: { rawRowCount: 0, departments: [], accounts: [] },
      replacementWarning: null,
    });

    await promise;
    expect(mockCalls["previewUpload"]?.[0]).toEqual(["data", { kind: "actual", targetMonth: "2026-01" }]);
  });

  it("commitUpload resolves with validated UploadMetadata", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const scenarioInput = { kind: "actual" as const, targetMonth: "2026-01" };
    const promise = gasClient.commitUpload("data", scenarioInput, null);

    mockSuccessHandlers["commitUpload"]({
      uploadId: "abc-123",
      timestamp: "2026-01-15T10:30:00+09:00",
      uploader: "test@example.com",
      scenarioInput: { kind: "actual", targetMonth: "2026-01" },
      generatedLabel: "2026/01月実績",
      replacementIdentity: {
        generatedLabel: "2026/01月実績",
        scenarioFamily: "actual",
      },
      fileName: "actual_2026-01_2026-01-15T10:30:00+09:00.xlsx",
    });

    const result = await promise;
    expect(result.uploadId).toBe("abc-123");
    expect(result.generatedLabel).toBe("2026/01月実績");
  });

  it("getUploadHistory resolves with validated array", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getUploadHistory();

    mockSuccessHandlers["getUploadHistory"]([]);

    const result = await promise;
    expect(result).toEqual([]);
  });

  it("getAccountMaster resolves with validated entries", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getAccountMaster();

    mockSuccessHandlers["getAccountMaster"]([
      {
        detailAccountName: "売上高",
        aggregateAccountName: "売上高",
        sortOrder: 20,
        isGmv: false,
        bucketStatus: "normal",
      },
    ]);

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].detailAccountName).toBe("売上高");
  });

  it("getDepartmentMaster resolves with validated entries", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getDepartmentMaster();

    mockSuccessHandlers["getDepartmentMaster"]([
      {
        detailDepartmentName: "SaaS事業部",
        businessUnitName: "SaaS事業部",
        sortOrder: 10,
        bucketStatus: "normal",
      },
    ]);

    const result = await promise;
    expect(result).toHaveLength(1);
    expect(result[0].detailDepartmentName).toBe("SaaS事業部");
  });

  it("saveAccountMaster validates entries before sending", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const entries = [
      {
        detailAccountName: "売上高",
        aggregateAccountName: "売上高",
        sortOrder: 20,
        isGmv: false,
        bucketStatus: "normal" as const,
      },
    ];

    const promise = gasClient.saveAccountMaster(entries);

    mockSuccessHandlers["saveAccountMaster"](undefined);

    await promise;
    expect(mockCalls["saveAccountMaster"]?.[0]).toEqual([entries]);
  });

  it("saveDepartmentMaster validates entries before sending", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const entries = [
      {
        detailDepartmentName: "SaaS事業部",
        businessUnitName: "SaaS事業部",
        sortOrder: 10,
        bucketStatus: "normal" as const,
      },
    ];

    const promise = gasClient.saveDepartmentMaster(entries);

    mockSuccessHandlers["saveDepartmentMaster"](undefined);

    await promise;
    expect(mockCalls["saveDepartmentMaster"]?.[0]).toEqual([entries]);
  });

  it("getAnalysisData resolves with validated analysis data", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getAnalysisData("actual", "2026-01");

    mockSuccessHandlers["getAnalysisData"]({
      importData: [
        {
          scenarioKey: "実績",
          yearMonth: "2026-01",
          accountCode: "A001",
          extAccountCode: "",
          accountName: "売上高",
          accountType: "収益",
          deptCode: "D001",
          extDeptCode: "",
          deptName: "営業部",
          amount: 1000000,
        },
      ],
      accountMaster: [],
      departmentMaster: [],
    });

    const result = await promise;
    expect(result.importData).toHaveLength(1);
    expect(result.importData[0].amount).toBe(1000000);
  });

  it("failure handler rejects the promise", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getCurrentUser();

    mockFailureHandlers["getCurrentUser"](new Error("GAS error"));

    await expect(promise).rejects.toThrow("GAS error");
  });
});

describe("isGasAvailable", () => {
  it("returns true when google.script.run exists", async () => {
    const { isGasAvailable } = await import("@/lib/gas/gas-client");
    expect(isGasAvailable()).toBe(true);
  });

  it("returns false when google.script.run is missing", async () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
    });

    const { isGasAvailable } = await import("@/lib/gas/gas-client");
    expect(isGasAvailable()).toBe(false);
  });

  it("returns false when window is undefined", async () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
    });

    const { isGasAvailable } = await import("@/lib/gas/gas-client");
    expect(isGasAvailable()).toBe(false);
  });
});

describe("gasClient error handling", () => {
  it("rejects with GasClientError when google.script.run is missing", async () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
    });

    const { gasClient, GasClientError } = await import("@/lib/gas/gas-client");

    await expect(gasClient.getCurrentUser()).rejects.toThrow(GasClientError);
  });

  it("rejects with ZodError when response is malformed", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.getAccountMaster();

    mockSuccessHandlers["getAccountMaster"]([
      { detailAccountName: "", aggregateAccountName: "x", sortOrder: 0 },
    ]);

    await expect(promise).rejects.toThrow();
  });
});
