import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass";
import type { LoglassPeriodType } from "@/lib/loglass/types";

import { getMajorAccountNames, parseComparisonRowKey } from "./summary";

export interface DifferenceItem {
  label: string;
  value: number;
  absoluteValue: number;
  isPositive: boolean;
}

export interface DifferenceData {
  periodType: LoglassPeriodType;
  targetAccountCode: string | null;
  items: DifferenceItem[];
}

export function selectDifferenceData(
  comparisonData: ComparisonSet[],
  departmentScope: "全社" | "事業部",
  departmentCode: string,
  periodType: LoglassPeriodType,
  targetAccountCode?: string | null,
): DifferenceData {
  const resolvedTargetAccountCode = targetAccountCode ?? null;
  const majorAccountSet = new Set(getMajorAccountNames());
  const scopedRows = comparisonData
    .filter((row) => row.periodType === periodType)
    .filter((row) => {
      const { departmentCode: rowDepartmentCode, accountCode } = parseComparisonRowKey(row.rowKey);

      if (departmentScope === "全社") {
        return rowDepartmentCode !== "ALL" && (resolvedTargetAccountCode === null || accountCode === resolvedTargetAccountCode);
      }

      if (rowDepartmentCode !== departmentCode) {
        return false;
      }

      if (resolvedTargetAccountCode !== null) {
        return accountCode === resolvedTargetAccountCode;
      }

      return !majorAccountSet.has(row.accountName);
    });

  const grouped = new Map<string, { value: number; sample: ComparisonSet }>();

  scopedRows.forEach((row) => {
    const label = departmentScope === "全社" ? row.departmentName : row.accountName;
    const bucket = grouped.get(label) ?? { value: 0, sample: row };
    bucket.value += row.BA ?? 0;
    grouped.set(label, bucket);
  });

  const items = [...grouped.entries()]
    .map(([label, bucket]) => ({
      label,
      value: bucket.value,
      absoluteValue: Math.abs(bucket.value),
      isPositive: isFavorableDifference(bucket.sample.accountName, bucket.value),
    }))
    .sort((left, right) => {
      if (right.absoluteValue !== left.absoluteValue) {
        return right.absoluteValue - left.absoluteValue;
      }

      return left.label.localeCompare(right.label, "ja");
    })
    .slice(0, 5);

  return {
    periodType,
    targetAccountCode: resolvedTargetAccountCode,
    items,
  };
}

function isFavorableDifference(accountName: string, value: number): boolean {
  if (isExpenseAccount(accountName)) {
    return value < 0;
  }

  return value > 0;
}

function isExpenseAccount(accountName: string): boolean {
  return ["売上原価", "販管費", "費", "原価", "手数料", "コスト"].some((keyword) => accountName.includes(keyword));
}
