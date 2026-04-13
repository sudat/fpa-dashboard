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

const DEFAULT_MAJOR_ACCOUNT_NAMES = ["売上高", "売上原価", "売上総利益", "販管費", "営業利益"] as const;

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

export function parseComparisonRowKey(rowKey: string): { departmentCode: string; accountCode: string } {
  const [, departmentCode = "", accountCode = ""] = rowKey.split("::");
  return { departmentCode, accountCode };
}
