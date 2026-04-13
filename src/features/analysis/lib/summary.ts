import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass";
import type { LoglassPeriodType } from "@/lib/loglass/types";

import { applyBucketFilter } from "./bucket-filter";

export interface SummaryRow {
  accountCode: string;
  accountName: string;
  aggregateName: string;
  periodType: LoglassPeriodType;
  A: number | null;
  B: number | null;
  BA: number | null;
  C: number | null;
  BC: number | null;
}

export interface GmvRatioRow {
  accountName: string;
  A_ratio: number | null;
  B_ratio: number | null;
  BA_ratio: number | null;
  C_ratio: number | null;
  BC_ratio: number | null;
}

const DEFAULT_MAJOR_ACCOUNT_NAMES = ["売上高", "売上原価", "売上総利益", "販管費", "営業利益"] as const;
const GMV_ACCOUNT_NAMES = ["SaaS GMV", "広告 GMV", "EC GMV", "GMV"] as const;

export function getMajorAccountNames(): string[] {
  return [...DEFAULT_MAJOR_ACCOUNT_NAMES];
}

export function selectSummaryRows(
  comparisonData: ComparisonSet[],
  departmentCode: string,
  periodType: LoglassPeriodType,
): SummaryRow[] {
  const majorAccountNames = getMajorAccountNames();
  const majorAccountSet = new Set(majorAccountNames);
  const filteredComparisonData = applyBucketFilter(comparisonData);

  const summaryRows = filteredComparisonData
    .filter((row) => row.periodType === periodType)
    .filter((row) => parseComparisonRowKey(row.rowKey).departmentCode === departmentCode)
    .filter((row) => majorAccountSet.has(row.accountName))
    .map((row) => {
      const { accountCode } = parseComparisonRowKey(row.rowKey);

      return {
        accountCode,
        accountName: row.accountName,
        aggregateName: row.accountName,
        periodType: row.periodType,
        A: row.A,
        B: row.B,
        BA: row.BA,
        C: row.C,
        BC: row.BC,
      } satisfies SummaryRow;
    });

  return summaryRows.sort(
    (left, right) => majorAccountNames.indexOf(left.accountName) - majorAccountNames.indexOf(right.accountName),
  );
}

export function selectGmvRatios(
  comparisonData: ComparisonSet[],
  departmentCode: string,
  periodType: LoglassPeriodType,
): GmvRatioRow[] {
  const majorAccountNames = getMajorAccountNames();
  const majorAccountSet = new Set(majorAccountNames);
  const gmvAccountSet = new Set(GMV_ACCOUNT_NAMES);
  const filteredComparisonData = applyBucketFilter(comparisonData)
    .filter((row) => row.periodType === periodType)
    .filter((row) => parseComparisonRowKey(row.rowKey).departmentCode === departmentCode);

  const gmvTotal = filteredComparisonData
    .filter((row) => gmvAccountSet.has(row.accountName))
    .reduce<number | null>((total, row) => {
      if (row.B === null) {
        return total;
      }

      return (total ?? 0) + row.B;
    }, null);

  const ratioRows = filteredComparisonData
    .filter((row) => majorAccountSet.has(row.accountName))
    .map((row) => ({
      accountName: row.accountName,
      A_ratio: calculateGmvRatio(row.A, gmvTotal),
      B_ratio: calculateGmvRatio(row.B, gmvTotal),
      BA_ratio: calculateGmvRatio(row.BA, gmvTotal),
      C_ratio: calculateGmvRatio(row.C, gmvTotal),
      BC_ratio: calculateGmvRatio(row.BC, gmvTotal),
    }) satisfies GmvRatioRow);

  return ratioRows.sort(
    (left, right) => majorAccountNames.indexOf(left.accountName) - majorAccountNames.indexOf(right.accountName),
  );
}

export function parseComparisonRowKey(rowKey: string): { departmentCode: string; accountCode: string } {
  const [, departmentCode = "", accountCode = ""] = rowKey.split("::");
  return { departmentCode, accountCode };
}

function calculateGmvRatio(value: number | null, gmvTotal: number | null): number | null {
  if (value === null || gmvTotal === null || gmvTotal === 0) {
    return null;
  }

  return value / gmvTotal;
}
