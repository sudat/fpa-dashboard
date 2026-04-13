import { useState, useCallback, useMemo, useEffect } from "react";

import type {
  AccountMasterEntry,
  AccountBucketStatus,
  DepartmentMasterEntry,
  DepartmentBucketStatus,
} from "@/lib/domain/master-contract";
import {
  gasClient,
  isGasAvailable,
} from "@/lib/gas/gas-client";
import {
  getDefaultAccountMaster,
  getDefaultDepartmentMaster,
} from "@/lib/domain/master-schema";

export type SaveStatus = "idle" | "loading" | "success" | "error";

export interface MasterEditorState {
  accountEntries: AccountMasterEntry[];
  departmentEntries: DepartmentMasterEntry[];
  isDirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  unassignedCount: number;
  excludedCount: number;
  isLoading: boolean;
}

export interface MasterEditorActions {
  updateAccountEntry: (index: number, changes: Partial<AccountMasterEntry>) => void;
  updateDepartmentEntry: (index: number, changes: Partial<DepartmentMasterEntry>) => void;
  addAccountEntry: (detailName: string, aggregateName: string) => void;
  addDepartmentEntry: (detailName: string, businessUnitName: string) => void;
  removeAccountEntry: (index: number) => void;
  removeDepartmentEntry: (index: number) => void;
  save: () => Promise<void>;
  reset: () => void;
}

export type UseMasterEditorReturn = MasterEditorState & MasterEditorActions;

export function useMasterEditor(): UseMasterEditorReturn {
  const [accountEntries, setAccountEntries] = useState<AccountMasterEntry[]>([]);
  const [departmentEntries, setDepartmentEntries] = useState<DepartmentMasterEntry[]>([]);
  const [savedAccountEntries, setSavedAccountEntries] = useState<AccountMasterEntry[]>([]);
  const [savedDepartmentEntries, setSavedDepartmentEntries] = useState<DepartmentMasterEntry[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        if (isGasAvailable()) {
          const [accounts, departments] = await Promise.all([
            gasClient.getAccountMaster(),
            gasClient.getDepartmentMaster(),
          ]);
          if (!cancelled) {
            setAccountEntries(accounts);
            setSavedAccountEntries(accounts);
            setDepartmentEntries(departments);
            setSavedDepartmentEntries(departments);
          }
        } else {
          const defaultAccounts = getDefaultAccountMaster();
          const defaultDepartments = getDefaultDepartmentMaster();
          if (!cancelled) {
            setAccountEntries(defaultAccounts);
            setSavedAccountEntries(defaultAccounts);
            setDepartmentEntries(defaultDepartments);
            setSavedDepartmentEntries(defaultDepartments);
          }
        }
      } catch {
        if (!cancelled) {
          const defaultAccounts = getDefaultAccountMaster();
          const defaultDepartments = getDefaultDepartmentMaster();
          setAccountEntries(defaultAccounts);
          setSavedAccountEntries(defaultAccounts);
          setDepartmentEntries(defaultDepartments);
          setSavedDepartmentEntries(defaultDepartments);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(accountEntries) !== JSON.stringify(savedAccountEntries) ||
      JSON.stringify(departmentEntries) !== JSON.stringify(savedDepartmentEntries)
    );
  }, [accountEntries, departmentEntries, savedAccountEntries, savedDepartmentEntries]);

  const unassignedCount = useMemo(() => {
    const accountUnassigned = accountEntries.filter((e) => e.bucketStatus === "unassigned").length;
    const deptUnassigned = departmentEntries.filter((e) => e.bucketStatus === "unassigned").length;
    return accountUnassigned + deptUnassigned;
  }, [accountEntries, departmentEntries]);

  const excludedCount = useMemo(() => {
    return accountEntries.filter((e) => e.bucketStatus === "excluded").length;
  }, [accountEntries]);

  const updateAccountEntry = useCallback(
    (index: number, changes: Partial<AccountMasterEntry>) => {
      setAccountEntries((prev) => {
        const next = [...prev];
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], ...changes };
        }
        return next;
      });
      setSaveStatus("idle");
      setSaveError(null);
    },
    [],
  );

  const updateDepartmentEntry = useCallback(
    (index: number, changes: Partial<DepartmentMasterEntry>) => {
      setDepartmentEntries((prev) => {
        const next = [...prev];
        if (index >= 0 && index < next.length) {
          next[index] = { ...next[index], ...changes };
        }
        return next;
      });
      setSaveStatus("idle");
      setSaveError(null);
    },
    [],
  );

  const addAccountEntry = useCallback(
    (detailName: string, aggregateName: string) => {
      const maxSort = accountEntries.reduce(
        (max, e) => Math.max(max, e.sortOrder),
        0,
      );
      const newEntry: AccountMasterEntry = {
        detailAccountName: detailName,
        aggregateAccountName: aggregateName,
        sortOrder: maxSort + 10,
        isGmv: false,
        bucketStatus: "normal" as AccountBucketStatus,
      };
      setAccountEntries((prev) => [...prev, newEntry]);
      setSaveStatus("idle");
      setSaveError(null);
    },
    [accountEntries],
  );

  const addDepartmentEntry = useCallback(
    (detailName: string, businessUnitName: string) => {
      const maxSort = departmentEntries.reduce(
        (max, e) => Math.max(max, e.sortOrder),
        0,
      );
      const newEntry: DepartmentMasterEntry = {
        detailDepartmentName: detailName,
        businessUnitName: businessUnitName,
        sortOrder: maxSort + 10,
        bucketStatus: "normal" as DepartmentBucketStatus,
      };
      setDepartmentEntries((prev) => [...prev, newEntry]);
      setSaveStatus("idle");
      setSaveError(null);
    },
    [departmentEntries],
  );

  const removeAccountEntry = useCallback((index: number) => {
    setAccountEntries((prev) => prev.filter((_, i) => i !== index));
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  const removeDepartmentEntry = useCallback((index: number) => {
    setDepartmentEntries((prev) => prev.filter((_, i) => i !== index));
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    setSaveStatus("loading");
    setSaveError(null);
    try {
      if (isGasAvailable()) {
        await Promise.all([
          gasClient.saveAccountMaster(accountEntries),
          gasClient.saveDepartmentMaster(departmentEntries),
        ]);
      }
      setSavedAccountEntries(accountEntries);
      setSavedDepartmentEntries(departmentEntries);
      setSaveStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setSaveError(message);
      setSaveStatus("error");
    }
  }, [accountEntries, departmentEntries]);

  const reset = useCallback(() => {
    setAccountEntries(savedAccountEntries);
    setDepartmentEntries(savedDepartmentEntries);
    setSaveStatus("idle");
    setSaveError(null);
  }, [savedAccountEntries, savedDepartmentEntries]);

  return {
    accountEntries,
    departmentEntries,
    isDirty,
    saveStatus,
    saveError,
    unassignedCount,
    excludedCount,
    isLoading,
    updateAccountEntry,
    updateDepartmentEntry,
    addAccountEntry,
    addDepartmentEntry,
    removeAccountEntry,
    removeDepartmentEntry,
    save,
    reset,
  };
}
