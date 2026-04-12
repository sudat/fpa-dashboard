import { buildNormalizedRowKey } from "@/lib/loglass/schema";
import type {
  LoglassMetricType,
  LoglassNormalizedRow,
  LoglassPeriodType,
} from "@/lib/loglass/types";

export function groupByDepartment(rows: LoglassNormalizedRow[]): Map<string, LoglassNormalizedRow[]> {
  return groupRows(rows, (row) => row.department.name);
}

export function groupByAccount(rows: LoglassNormalizedRow[]): Map<string, LoglassNormalizedRow[]> {
  return groupRows(rows, (row) => row.account.name);
}

export function groupByTimeAxis(
  rows: LoglassNormalizedRow[],
): Map<LoglassPeriodType, LoglassNormalizedRow[]> {
  return groupRows(rows, (row) => row.period.periodType) as Map<LoglassPeriodType, LoglassNormalizedRow[]>;
}

export function groupByMetricType(
  rows: LoglassNormalizedRow[],
): Map<LoglassMetricType, LoglassNormalizedRow[]> {
  return groupRows(rows, (row) => row.metricType) as Map<LoglassMetricType, LoglassNormalizedRow[]>;
}

export function getAggregateAccounts(rows: LoglassNormalizedRow[]): string[] {
  return [...new Set(rows.map((row) => row.account.aggregateName))].sort((left, right) =>
    left.localeCompare(right, "ja"),
  );
}

export function getDetailAccounts(
  rows: LoglassNormalizedRow[],
  aggregateName: string,
): LoglassNormalizedRow[] {
  return rows.filter((row) => row.account.aggregateName === aggregateName);
}

export function buildAccountHierarchy(rows: LoglassNormalizedRow[]): Map<string, string[]> {
  const hierarchy = new Map<string, string[]>();

  rows.forEach((row) => {
    const details = hierarchy.get(row.account.aggregateName) ?? [];

    if (!details.includes(row.account.detailName)) {
      details.push(row.account.detailName);
      hierarchy.set(row.account.aggregateName, details);
    }
  });

  return hierarchy;
}

export function computeGmvRatio(
  rows: LoglassNormalizedRow[],
  targetAccount: string,
): { numerator: number; denominator: number | null; ratio: number | null } {
  const numerator = rows
    .filter(
      (row) =>
        row.account.aggregateName === targetAccount ||
        row.account.detailName === targetAccount ||
        row.account.name === targetAccount,
    )
    .reduce((total, row) => total + row.amount, 0);

  const denominatorRows = rows.filter((row) => row.account.isGmvDenominator);

  if (denominatorRows.length === 0) {
    return { numerator, denominator: null, ratio: null };
  }

  const denominator = denominatorRows.reduce((total, row) => total + row.amount, 0);

  if (denominator === 0) {
    return { numerator, denominator, ratio: null };
  }

  return { numerator, denominator, ratio: numerator / denominator };
}

export function aggregateByDepartment(rows: LoglassNormalizedRow[]): LoglassNormalizedRow[] {
  if (rows.length === 0) {
    return [];
  }

  const businessUnitRows = rows.filter((row) => row.department.scope === "事業部");
  const aggregatedRows = new Map<string, LoglassNormalizedRow>();

  businessUnitRows.forEach((row) => {
    const aggregateKey = [
      row.account.hierarchyKey,
      row.period.yearMonth,
      row.period.periodType,
      row.metricType,
      row.scenarioKey ?? "base",
    ].join("::");
    const existingRow = aggregatedRows.get(aggregateKey);

    if (existingRow) {
      existingRow.amount += row.amount;
      return;
    }

    aggregatedRows.set(aggregateKey, {
      ...row,
      rowKey: buildNormalizedRowKey({
        departmentCode: "ALL",
        accountCode: row.account.code,
        yearMonth: row.period.yearMonth,
        periodType: row.period.periodType,
        metricType: row.metricType,
        scenarioKey: row.scenarioKey,
      }),
      department: {
        code: "ALL",
        externalCode: "",
        name: "全社",
        scope: "全社",
      },
    });
  });

  return [...businessUnitRows, ...aggregatedRows.values()];
}

function groupRows<Key extends string>(
  rows: LoglassNormalizedRow[],
  getKey: (row: LoglassNormalizedRow) => Key,
): Map<Key, LoglassNormalizedRow[]> {
  const groupedRows = new Map<Key, LoglassNormalizedRow[]>();

  rows.forEach((row) => {
    const key = getKey(row);
    const bucket = groupedRows.get(key) ?? [];
    bucket.push(row);
    groupedRows.set(key, bucket);
  });

  return groupedRows;
}
