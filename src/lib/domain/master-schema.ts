import { z } from "zod";

import {
  EXCLUDED_BUCKET,
  UNASSIGNED_BUCKET,
  accountMasterEntrySchema,
  departmentMasterEntrySchema,
} from "./master-contract";
import type {
  AccountBucketStatus,
  AccountMasterEntry,
  DepartmentBucketStatus,
  DepartmentMasterEntry,
} from "./master-contract";

const accountMasterConfigSchema = z.array(accountMasterEntrySchema);
const departmentMasterConfigSchema = z.array(departmentMasterEntrySchema);

const DEFAULT_UNASSIGNED_SORT_ORDER = 99_000;

const NORMAL_ACCOUNT_BUCKET = {
  label: "通常",
  warningOnSave: false,
  autoAggregation: false,
  includeInAnalysis: true,
} as const;

const NORMAL_DEPARTMENT_BUCKET = {
  label: "通常",
  warningOnSave: false,
  autoAggregation: false,
  includeInAnalysis: true,
} as const;

export type AccountMasterConfig = readonly AccountMasterEntry[];
export type DepartmentMasterConfig = readonly DepartmentMasterEntry[];

export type MappedAccount = {
  rawAccountName: string;
  detailAccountName: string;
  aggregateAccountName: string;
  sortOrder: number;
  isGmv: boolean;
  bucketStatus: AccountBucketStatus;
  bucketLabel: string;
  warningOnSave: boolean;
  autoAggregation: boolean;
  includeInAnalysis: boolean;
};

export type MappedDepartment = {
  rawDepartmentName: string;
  detailDepartmentName: string;
  businessUnitName: string;
  sortOrder: number;
  bucketStatus: DepartmentBucketStatus;
  bucketLabel: string;
  warningOnSave: boolean;
  autoAggregation: boolean;
  includeInAnalysis: boolean;
};

export type RawMasterMappingRow = {
  部署名: string;
  明細科目名?: string;
  科目名?: string;
  [key: string]: unknown;
};

export type MasterMappedRow<T extends RawMasterMappingRow = RawMasterMappingRow> = T & {
  accountMapping: MappedAccount;
  departmentMapping: MappedDepartment;
};

export function getDefaultAccountMaster(): AccountMasterEntry[] {
  return accountMasterConfigSchema.parse([
    { detailAccountName: "SaaS GMV", aggregateAccountName: "GMV", sortOrder: 10, isGmv: true, bucketStatus: "normal" },
    { detailAccountName: "広告 GMV", aggregateAccountName: "GMV", sortOrder: 10, isGmv: true, bucketStatus: "normal" },
    { detailAccountName: "EC GMV", aggregateAccountName: "GMV", sortOrder: 10, isGmv: true, bucketStatus: "normal" },
    { detailAccountName: "GMV", aggregateAccountName: "GMV", sortOrder: 10, isGmv: true, bucketStatus: "normal" },
    { detailAccountName: "SaaS利用料売上", aggregateAccountName: "売上高", sortOrder: 20, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "広告売上", aggregateAccountName: "売上高", sortOrder: 20, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "EC売上", aggregateAccountName: "売上高", sortOrder: 20, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "売上高", aggregateAccountName: "売上高", sortOrder: 20, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "決済手数料", aggregateAccountName: "売上原価", sortOrder: 30, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "配信原価", aggregateAccountName: "売上原価", sortOrder: 30, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "配送原価", aggregateAccountName: "売上原価", sortOrder: 30, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "売上原価", aggregateAccountName: "売上原価", sortOrder: 30, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "売上総利益", aggregateAccountName: "売上総利益", sortOrder: 40, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "人件費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "広告宣伝費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "業務委託費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "採用費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "SaaS利用料", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "地代家賃", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "販管費", aggregateAccountName: "販管費", sortOrder: 50, isGmv: false, bucketStatus: "normal" },
    { detailAccountName: "営業利益", aggregateAccountName: "営業利益", sortOrder: 60, isGmv: false, bucketStatus: "excluded" },
    { detailAccountName: "経常利益", aggregateAccountName: "経常利益", sortOrder: 70, isGmv: false, bucketStatus: "excluded" },
    { detailAccountName: "税引前利益", aggregateAccountName: "税引前利益", sortOrder: 80, isGmv: false, bucketStatus: "excluded" },
    { detailAccountName: "当期純利益", aggregateAccountName: "当期純利益", sortOrder: 90, isGmv: false, bucketStatus: "excluded" },
    { detailAccountName: "未割当", aggregateAccountName: "未割当", sortOrder: DEFAULT_UNASSIGNED_SORT_ORDER, isGmv: false, bucketStatus: "unassigned" },
    { detailAccountName: "集計不要", aggregateAccountName: "集計不要", sortOrder: DEFAULT_UNASSIGNED_SORT_ORDER + 1, isGmv: false, bucketStatus: "excluded" },
  ]);
}

export function getDefaultDepartmentMaster(): DepartmentMasterEntry[] {
  return departmentMasterConfigSchema.parse([
    { detailDepartmentName: "SaaS事業部", businessUnitName: "SaaS事業部", sortOrder: 10, bucketStatus: "normal" },
    { detailDepartmentName: "広告事業部", businessUnitName: "広告事業部", sortOrder: 20, bucketStatus: "normal" },
    { detailDepartmentName: "EC事業部", businessUnitName: "EC事業部", sortOrder: 30, bucketStatus: "normal" },
    { detailDepartmentName: "新規事業部", businessUnitName: "新規事業部", sortOrder: 40, bucketStatus: "normal" },
    { detailDepartmentName: "コーポレート", businessUnitName: "コーポレート", sortOrder: 50, bucketStatus: "normal" },
    { detailDepartmentName: "海外事業部", businessUnitName: "海外事業部", sortOrder: 60, bucketStatus: "normal" },
    { detailDepartmentName: "Fintech事業部", businessUnitName: "Fintech事業部", sortOrder: 70, bucketStatus: "normal" },
    { detailDepartmentName: "データソリューション事業部", businessUnitName: "データソリューション事業部", sortOrder: 80, bucketStatus: "normal" },
    { detailDepartmentName: "Marketplace事業部", businessUnitName: "Marketplace事業部", sortOrder: 90, bucketStatus: "normal" },
    { detailDepartmentName: "店舗DX事業部", businessUnitName: "店舗DX事業部", sortOrder: 100, bucketStatus: "normal" },
    { detailDepartmentName: "未割当", businessUnitName: "未割当", sortOrder: DEFAULT_UNASSIGNED_SORT_ORDER, bucketStatus: "unassigned" },
  ]);
}

export function applyMasterMapping(rawAccountName: string, accountMaster: AccountMasterConfig): MappedAccount;
export function applyMasterMapping<T extends RawMasterMappingRow>(
  rawRows: T[],
  accountMaster: AccountMasterConfig,
  departmentMaster: DepartmentMasterConfig,
): MasterMappedRow<T>[];
export function applyMasterMapping<T extends RawMasterMappingRow>(
  input: string | T[],
  accountMaster: AccountMasterConfig,
  departmentMaster?: DepartmentMasterConfig,
): MappedAccount | MasterMappedRow<T>[] {
  if (Array.isArray(input)) {
    if (!departmentMaster) {
      throw new Error("departmentMaster is required when mapping raw rows");
    }

    return input.map((row) => {
      const rawAccountName = normalizeName(row.明細科目名 ?? row.科目名 ?? UNASSIGNED_BUCKET.label);

      return {
        ...row,
        accountMapping: mapAccountName(rawAccountName, accountMaster),
        departmentMapping: applyDepartmentMapping(row.部署名, departmentMaster),
      };
    });
  }

  return mapAccountName(input, accountMaster);
}

export function applyDepartmentMapping(
  rawDepartmentName: string,
  departmentMaster: DepartmentMasterConfig,
): MappedDepartment {
  const parsedMaster = departmentMasterConfigSchema.parse(departmentMaster);
  const normalizedDepartmentName = normalizeName(rawDepartmentName);
  const matchedEntry = parsedMaster.find(
    (entry) => entry.detailDepartmentName === normalizedDepartmentName,
  );

  if (matchedEntry) {
    if (matchedEntry.bucketStatus === "unassigned") {
      return buildUnassignedDepartmentMapping(normalizedDepartmentName, matchedEntry);
    }

    return {
      rawDepartmentName: normalizedDepartmentName,
      detailDepartmentName: matchedEntry.detailDepartmentName,
      businessUnitName: matchedEntry.businessUnitName,
      sortOrder: matchedEntry.sortOrder,
      bucketStatus: matchedEntry.bucketStatus,
      bucketLabel: NORMAL_DEPARTMENT_BUCKET.label,
      warningOnSave: NORMAL_DEPARTMENT_BUCKET.warningOnSave,
      autoAggregation: NORMAL_DEPARTMENT_BUCKET.autoAggregation,
      includeInAnalysis: NORMAL_DEPARTMENT_BUCKET.includeInAnalysis,
    };
  }

  return buildUnassignedDepartmentMapping(normalizedDepartmentName, findUnassignedDepartmentEntry(parsedMaster));
}

export function getOrderedAggregateAccounts(accountMaster: AccountMasterConfig): string[] {
  const parsedMaster = accountMasterConfigSchema.parse(accountMaster);
  const aggregateOrder = new Map<string, number>();

  parsedMaster.forEach((entry) => {
    if (entry.bucketStatus === "excluded" || entry.aggregateAccountName === EXCLUDED_BUCKET.label) {
      return;
    }

    const current = aggregateOrder.get(entry.aggregateAccountName);

    if (current === undefined || entry.sortOrder < current) {
      aggregateOrder.set(entry.aggregateAccountName, entry.sortOrder);
    }
  });

  return [...aggregateOrder.entries()]
    .sort((left, right) => {
      if (left[1] !== right[1]) {
        return left[1] - right[1];
      }

      return left[0].localeCompare(right[0], "ja");
    })
    .map(([aggregateAccountName]) => aggregateAccountName);
}

function mapAccountName(rawAccountName: string, accountMaster: AccountMasterConfig): MappedAccount {
  const parsedMaster = accountMasterConfigSchema.parse(accountMaster);
  const normalizedAccountName = normalizeName(rawAccountName);
  const matchedEntry = parsedMaster.find((entry) => entry.detailAccountName === normalizedAccountName);

  if (matchedEntry) {
    if (matchedEntry.bucketStatus === "excluded") {
      return {
        rawAccountName: normalizedAccountName,
        detailAccountName: matchedEntry.detailAccountName,
        aggregateAccountName: matchedEntry.aggregateAccountName,
        sortOrder: matchedEntry.sortOrder,
        isGmv: matchedEntry.isGmv,
        bucketStatus: matchedEntry.bucketStatus,
        bucketLabel: EXCLUDED_BUCKET.label,
        warningOnSave: EXCLUDED_BUCKET.warningOnSave,
        autoAggregation: EXCLUDED_BUCKET.autoAggregation,
        includeInAnalysis: EXCLUDED_BUCKET.includeInAnalysis,
      };
    }

    if (matchedEntry.bucketStatus === "unassigned") {
      return buildUnassignedAccountMapping(normalizedAccountName, matchedEntry);
    }

    return {
      rawAccountName: normalizedAccountName,
      detailAccountName: matchedEntry.detailAccountName,
      aggregateAccountName: matchedEntry.aggregateAccountName,
      sortOrder: matchedEntry.sortOrder,
      isGmv: matchedEntry.isGmv,
      bucketStatus: matchedEntry.bucketStatus,
      bucketLabel: NORMAL_ACCOUNT_BUCKET.label,
      warningOnSave: NORMAL_ACCOUNT_BUCKET.warningOnSave,
      autoAggregation: NORMAL_ACCOUNT_BUCKET.autoAggregation,
      includeInAnalysis: NORMAL_ACCOUNT_BUCKET.includeInAnalysis,
    };
  }

  return buildUnassignedAccountMapping(normalizedAccountName, findUnassignedAccountEntry(parsedMaster));
}

function buildUnassignedAccountMapping(
  rawAccountName: string,
  entry: AccountMasterEntry,
): MappedAccount {
  return {
    rawAccountName,
    detailAccountName: rawAccountName,
    aggregateAccountName: entry.aggregateAccountName,
    sortOrder: entry.sortOrder,
    isGmv: false,
    bucketStatus: "unassigned",
    bucketLabel: UNASSIGNED_BUCKET.label,
    warningOnSave: UNASSIGNED_BUCKET.warningOnSave,
    autoAggregation: UNASSIGNED_BUCKET.autoAggregation,
    includeInAnalysis: UNASSIGNED_BUCKET.includeInAnalysis,
  };
}

function buildUnassignedDepartmentMapping(
  rawDepartmentName: string,
  entry: DepartmentMasterEntry,
): MappedDepartment {
  return {
    rawDepartmentName,
    detailDepartmentName: rawDepartmentName,
    businessUnitName: entry.businessUnitName,
    sortOrder: entry.sortOrder,
    bucketStatus: "unassigned",
    bucketLabel: UNASSIGNED_BUCKET.label,
    warningOnSave: UNASSIGNED_BUCKET.warningOnSave,
    autoAggregation: UNASSIGNED_BUCKET.autoAggregation,
    includeInAnalysis: UNASSIGNED_BUCKET.includeInAnalysis,
  };
}

function findUnassignedAccountEntry(accountMaster: AccountMasterEntry[]): AccountMasterEntry {
  return accountMaster.find((entry) => entry.bucketStatus === "unassigned") ?? {
    detailAccountName: UNASSIGNED_BUCKET.label,
    aggregateAccountName: UNASSIGNED_BUCKET.label,
    sortOrder: DEFAULT_UNASSIGNED_SORT_ORDER,
    isGmv: false,
    bucketStatus: "unassigned",
  };
}

function findUnassignedDepartmentEntry(
  departmentMaster: DepartmentMasterEntry[],
): DepartmentMasterEntry {
  return departmentMaster.find((entry) => entry.bucketStatus === "unassigned") ?? {
    detailDepartmentName: UNASSIGNED_BUCKET.label,
    businessUnitName: UNASSIGNED_BUCKET.label,
    sortOrder: DEFAULT_UNASSIGNED_SORT_ORDER,
    bucketStatus: "unassigned",
  };
}

function normalizeName(value: string): string {
  return value.trim();
}
