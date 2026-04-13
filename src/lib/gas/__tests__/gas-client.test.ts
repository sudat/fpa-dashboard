import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock window.google.script.run to reflect the real GAS API:
// - withSuccessHandler and withFailureHandler live on google.script.run itself
// - After chaining handlers, server functions are callable by name
//   e.g. runner.withSuccessHandler(cb).withFailureHandler(cb).fnName(...args)

const mockSuccessHandlers: Record<string, (result: unknown) => void> = {};
const mockFailureHandlers: Record<string, (error: Error) => void> = {};
const mockCalls: Record<string, unknown[][]> = {};

function resetMocks() {
  Object.keys(mockSuccessHandlers).forEach((k) => delete mockSuccessHandlers[k]);
  Object.keys(mockFailureHandlers).forEach((k) => delete mockFailureHandlers[k]);
  Object.keys(mockCalls).forEach((k) => delete mockCalls[k]);
}

// Build a chainable runner that captures handlers and records calls per function name
function createMockRun() {
  let pendingSuccessHandler: ((result: unknown) => void) | null = null;
  let pendingFailureHandler: ((error: Error) => void) | null = null;

  // Proxy that becomes callable per function name after chaining
  function makeChained(): Record<string, unknown> {
    return new Proxy(
      {},
      {
        get(_target, prop: string) {
          if (prop === "withSuccessHandler") {
            return vi.fn((cb: (result: unknown) => void) => {
              pendingSuccessHandler = cb;
              return makeChained();
            });
          }
          if (prop === "withFailureHandler") {
            return vi.fn((cb: (error: Error) => void) => {
              pendingFailureHandler = cb;
              return makeChained();
            });
          }
          // Any other property is treated as a server function call
          return vi.fn((...args: unknown[]) => {
            if (!mockCalls[prop]) mockCalls[prop] = [];
            mockCalls[prop].push(args);
            // Capture the handlers at time of call so tests can trigger them by function name
            const sc = pendingSuccessHandler;
            const fc = pendingFailureHandler;
            if (sc) mockSuccessHandlers[prop] = sc;
            if (fc) mockFailureHandlers[prop] = fc;
            pendingSuccessHandler = null;
            pendingFailureHandler = null;
          });
        },
      },
    );
  }

  const run = makeChained() as Record<string, unknown>;
  return run;
}

let mockRun: Record<string, unknown>;

beforeEach(() => {
  resetMocks();
  mockRun = createMockRun();

  Object.defineProperty(globalThis, "window", {
    value: {
      google: {
        script: {
          run: mockRun,
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

  it("startUploadSession resolves with a validated upload session", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const workbookBase64 = "dGVzdA==";
    const scenarioInput = { kind: "actual" as const, targetMonth: "2026-01" };
    const promise = gasClient.startUploadSession(workbookBase64, "actual_2026-01.xlsx", scenarioInput, null);

    mockSuccessHandlers["startUploadSession"]({
      uploadId: "abc-123",
    });

    const result = await promise;
    expect(result.uploadId).toBe("abc-123");
  });

  it("startUploadSession validates the workbook payload and sends the GAS contract", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const workbookBase64 = "dGVzdA==";
    const scenarioInput = { kind: "actual" as const, targetMonth: "2026-01" };
    const promise = gasClient.startUploadSession(workbookBase64, "actual_2026-01.xlsx", scenarioInput, null);

    mockSuccessHandlers["startUploadSession"]({
      uploadId: "abc-123",
    });

    await promise;
    expect(mockCalls["startUploadSession"]?.[0]).toEqual([
      workbookBase64,
      "actual_2026-01.xlsx",
      { kind: "actual", targetMonth: "2026-01" },
      null,
    ]);
  });

  it("appendUploadRows validates chunk rows before sending", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const rows = [{
      シナリオ: "実績",
      年月度: "2026-01",
      科目コード: "A001",
      外部科目コード: "",
      科目: "売上高",
      科目タイプ: "収益",
      部署コード: "D001",
      外部部署コード: "",
      部署: "営業部",
      金額: 1000,
    }];
    const promise = gasClient.appendUploadRows("upload-1", rows);

    mockSuccessHandlers["appendUploadRows"](undefined);

    await promise;
    expect(mockCalls["appendUploadRows"]?.[0]).toEqual(["upload-1", rows]);
  });

  it("finalizeUploadSession resolves with validated UploadMetadata", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.finalizeUploadSession("upload-1");

    mockSuccessHandlers["finalizeUploadSession"]({
      uploadId: "abc-123",
      timestamp: "2026-01-15T10:30:00+09:00",
      uploader: "test@example.com",
      scenarioInput: { kind: "actual", targetMonth: "2026-01" },
      generatedLabel: "2026/01月実績",
      replacementIdentity: {
        generatedLabel: "2026/01月実績",
        scenarioFamily: "actual",
      },
      fileName: "actual_2026-01.xlsx",
    });

    const result = await promise;
    expect(result.uploadId).toBe("abc-123");
    expect(mockCalls["finalizeUploadSession"]?.[0]).toEqual(["upload-1"]);
  });

  it("abortUploadSession resolves with a boolean result", async () => {
    const { gasClient } = await import("@/lib/gas/gas-client");

    const promise = gasClient.abortUploadSession("upload-1");

    mockSuccessHandlers["abortUploadSession"](true);

    await expect(promise).resolves.toBe(true);
    expect(mockCalls["abortUploadSession"]?.[0]).toEqual(["upload-1"]);
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
