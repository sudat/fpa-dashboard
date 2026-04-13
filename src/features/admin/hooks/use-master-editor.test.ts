import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AccountMasterEntry, DepartmentMasterEntry } from "@/lib/domain/master-contract";
import { useMasterEditor } from "./use-master-editor";

const mockGetAccountMaster = vi.fn<() => Promise<AccountMasterEntry[]>>();
const mockSaveAccountMaster = vi.fn<(entries: AccountMasterEntry[]) => Promise<void>>();
const mockGetDepartmentMaster = vi.fn<() => Promise<DepartmentMasterEntry[]>>();
const mockSaveDepartmentMaster = vi.fn<(entries: DepartmentMasterEntry[]) => Promise<void>>();

vi.mock("@/lib/gas/gas-client", () => ({
  isGasAvailable: vi.fn(() => false),
  gasClient: {
    getAccountMaster: (...args: unknown[]) => mockGetAccountMaster(...args),
    saveAccountMaster: (...args: unknown[]) => mockSaveAccountMaster(...args),
    getDepartmentMaster: (...args: unknown[]) => mockGetDepartmentMaster(...args),
    saveDepartmentMaster: (...args: unknown[]) => mockSaveDepartmentMaster(...args),
  },
}));

async function importIsGasAvailable() {
  const mod = await import("@/lib/gas/gas-client");
  return vi.mocked(mod.isGasAvailable);
}

describe("useMasterEditor", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const isGasAvailable = await importIsGasAvailable();
    isGasAvailable.mockReturnValue(false);
  });

  it("loads default masters when GAS is unavailable", async () => {
    const { result } = renderHook(() => useMasterEditor());

    // Wait for useEffect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.accountEntries.length).toBeGreaterThan(0);
    expect(result.current.departmentEntries.length).toBeGreaterThan(0);
  });

  it("starts with isDirty=false", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("updateAccountEntry marks dirty", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.updateAccountEntry(0, { aggregateAccountName: "変更後" });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.accountEntries[0].aggregateAccountName).toBe("変更後");
  });

  it("updateDepartmentEntry marks dirty", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.updateDepartmentEntry(0, { businessUnitName: "変更後" });
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.departmentEntries[0].businessUnitName).toBe("変更後");
  });

  it("addAccountEntry appends a new entry", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const before = result.current.accountEntries.length;

    act(() => {
      result.current.addAccountEntry("新規科目", "集計科目");
    });

    expect(result.current.accountEntries.length).toBe(before + 1);
    const added = result.current.accountEntries[result.current.accountEntries.length - 1];
    expect(added.detailAccountName).toBe("新規科目");
    expect(added.aggregateAccountName).toBe("集計科目");
    expect(added.isGmv).toBe(false);
    expect(added.bucketStatus).toBe("normal");
  });

  it("addDepartmentEntry appends a new entry", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const before = result.current.departmentEntries.length;

    act(() => {
      result.current.addDepartmentEntry("新規部署", "事業部");
    });

    expect(result.current.departmentEntries.length).toBe(before + 1);
    const added = result.current.departmentEntries[result.current.departmentEntries.length - 1];
    expect(added.detailDepartmentName).toBe("新規部署");
    expect(added.businessUnitName).toBe("事業部");
    expect(added.bucketStatus).toBe("normal");
  });

  it("removeAccountEntry removes at index", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const before = result.current.accountEntries.length;
    const removedName = result.current.accountEntries[0].detailAccountName;

    act(() => {
      result.current.removeAccountEntry(0);
    });

    expect(result.current.accountEntries.length).toBe(before - 1);
    expect(result.current.accountEntries[0].detailAccountName).not.toBe(removedName);
  });

  it("removeDepartmentEntry removes at index", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const before = result.current.departmentEntries.length;
    const removedName = result.current.departmentEntries[0].detailDepartmentName;

    act(() => {
      result.current.removeDepartmentEntry(0);
    });

    expect(result.current.departmentEntries.length).toBe(before - 1);
    expect(result.current.departmentEntries[0].detailDepartmentName).not.toBe(removedName);
  });

  it("computes unassignedCount from both masters", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Default masters have 1 account unassigned + 1 department unassigned
    const accountUnassigned = result.current.accountEntries.filter(
      (e) => e.bucketStatus === "unassigned",
    ).length;
    const deptUnassigned = result.current.departmentEntries.filter(
      (e) => e.bucketStatus === "unassigned",
    ).length;

    expect(result.current.unassignedCount).toBe(accountUnassigned + deptUnassigned);
    expect(result.current.unassignedCount).toBeGreaterThan(0);
  });

  it("computes excludedCount from account entries only", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const accountExcluded = result.current.accountEntries.filter(
      (e) => e.bucketStatus === "excluded",
    ).length;

    expect(result.current.excludedCount).toBe(accountExcluded);
    expect(result.current.excludedCount).toBeGreaterThan(0);
  });

  it("save resolves successfully when GAS not available", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.updateAccountEntry(0, { aggregateAccountName: "変更" });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveStatus).toBe("success");
    expect(result.current.isDirty).toBe(false);
  });

  it("save handles GAS error", async () => {
    const isGasAvailable = await importIsGasAvailable();
    isGasAvailable.mockReturnValue(true);
    const mockAccounts: AccountMasterEntry[] = [
      { detailAccountName: "売上高", aggregateAccountName: "売上高", sortOrder: 10, isGmv: false, bucketStatus: "normal" },
    ];
    const mockDepts: DepartmentMasterEntry[] = [
      { detailDepartmentName: "SaaS事業部", businessUnitName: "SaaS事業部", sortOrder: 10, bucketStatus: "normal" },
    ];
    mockGetAccountMaster.mockResolvedValueOnce(mockAccounts);
    mockGetDepartmentMaster.mockResolvedValueOnce(mockDepts);
    mockSaveAccountMaster.mockRejectedValueOnce(new Error("GAS error"));

    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      result.current.updateAccountEntry(0, { aggregateAccountName: "変更" });
    });

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.saveStatus).toBe("error");
    expect(result.current.saveError).toBe("GAS error");
    expect(result.current.isDirty).toBe(true);
  });

  it("reset reverts to saved state", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const originalName = result.current.accountEntries[0].aggregateAccountName;

    act(() => {
      result.current.updateAccountEntry(0, { aggregateAccountName: "一時変更" });
    });

    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.accountEntries[0].aggregateAccountName).toBe(originalName);
  });

  it("updateAccountEntry with invalid index does nothing", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const originalEntries = [...result.current.accountEntries];

    act(() => {
      result.current.updateAccountEntry(-1, { aggregateAccountName: "invalid" });
    });

    expect(result.current.accountEntries).toEqual(originalEntries);
  });

  it("addAccountEntry assigns incrementing sortOrder", async () => {
    const { result } = renderHook(() => useMasterEditor());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const maxSort = result.current.accountEntries.reduce(
      (max, e) => Math.max(max, e.sortOrder),
      0,
    );

    act(() => {
      result.current.addAccountEntry("A", "B");
    });

    const added = result.current.accountEntries[result.current.accountEntries.length - 1];
    expect(added.sortOrder).toBe(maxSort + 10);
  });
});
