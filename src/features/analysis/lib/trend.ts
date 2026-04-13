import { normalizeYearMonth, toFiscalYear } from "@/lib/loglass/schema";
import type { LoglassNormalizedRow, LoglassPeriodType } from "@/lib/loglass/types";

import { applyBucketFilter } from "./bucket-filter";

export interface TrendDataPoint {
  yearMonth: string;
  amount: number | null;
  type: "actual" | "forecast";
}

export interface TrendSeries {
  accountCode: string;
  accountName: string;
  departmentCode: string;
  periodType: LoglassPeriodType;
  points: TrendDataPoint[];
}

export function selectTrendSeries(
  rows: LoglassNormalizedRow[],
  accountCode: string,
  departmentCode: string,
  periodType: LoglassPeriodType,
  targetMonth: string,
): TrendSeries {
  const normalizedTargetMonth = normalizeYearMonth(targetMonth);
  const targetFiscalYear = toFiscalYear(normalizedTargetMonth);
  const filteredRows = applyBucketFilter(rows);
  const currentForecastScenarioKey = selectCurrentForecastScenarioKey(filteredRows, targetFiscalYear);
  const scopedRows = filteredRows.filter(
    (row) =>
      row.account.code === accountCode &&
      row.department.code === departmentCode &&
      row.period.periodType === periodType &&
      row.period.fiscalYear === targetFiscalYear,
  );

  const accountName = scopedRows[0]?.account.name ?? "";

  const actualRows = scopedRows.filter(
    (row) => row.metricType === "実績" && row.period.yearMonth <= normalizedTargetMonth,
  );
  const forecastRows = scopedRows.filter(
    (row) =>
      row.metricType === "見込" &&
      row.scenarioKey === currentForecastScenarioKey &&
      row.period.yearMonth > normalizedTargetMonth,
  );

  const points = [
    ...toTrendPoints(actualRows, "actual"),
    ...toTrendPoints(forecastRows, "forecast"),
  ].sort((left, right) => left.yearMonth.localeCompare(right.yearMonth, "ja"));

  return {
    accountCode,
    accountName,
    departmentCode,
    periodType,
    points,
  };
}

function toTrendPoints(
  rows: LoglassNormalizedRow[],
  type: TrendDataPoint["type"],
): TrendDataPoint[] {
  const monthlyAmounts = new Map<string, number>();

  rows.forEach((row) => {
    monthlyAmounts.set(row.period.yearMonth, (monthlyAmounts.get(row.period.yearMonth) ?? 0) + row.amount);
  });

  return [...monthlyAmounts.entries()].map(([yearMonth, amount]) => ({
    yearMonth,
    amount,
    type,
  }));
}

function selectCurrentForecastScenarioKey(rows: LoglassNormalizedRow[], targetFiscalYear: number): string | null {
  const scenarioKeys = [...new Set(
    rows
      .filter((row) => row.metricType === "見込" && row.period.fiscalYear === targetFiscalYear)
      .map((row) => row.scenarioKey)
      .filter((scenarioKey): scenarioKey is string => Boolean(scenarioKey)),
  )];

  scenarioKeys.sort(compareScenarioKeys);
  return scenarioKeys.at(-1) ?? null;
}

function compareScenarioKeys(left: string, right: string): number {
  const leftStamp = extractScenarioStamp(left);
  const rightStamp = extractScenarioStamp(right);

  if (leftStamp !== rightStamp) {
    return leftStamp - rightStamp;
  }

  return left.localeCompare(right, "ja");
}

function extractScenarioStamp(value: string): number {
  const match = value.match(/(\d{4})(?=時点)/);
  return match ? Number(match[1]) : Number.MIN_SAFE_INTEGER;
}
