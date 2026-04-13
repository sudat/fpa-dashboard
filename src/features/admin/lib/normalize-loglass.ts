import {
  buildNormalizedRowKey,
  createNormalizedPeriod,
  deriveMetricTypeFromScenario,
  loglassNormalizedRowArraySchema,
  loglassRawRowArraySchema,
  normalizeYearMonth,
} from "@/lib/loglass/schema";
import type {
  LoglessRawRow,
  LoglassNormalizedRow,
  LoglassNormalizedRowList,
  LoglassPeriodType,
} from "@/lib/loglass/types";

export interface ComparisonSet {
  rowKey: string;
  accountName: string;
  departmentName: string;
  periodType: LoglassPeriodType;
  A: number | null;
  B: number | null;
  BA: number | null;
  C: number | null;
  BC: number | null;
}

const PERIOD_TYPES: LoglassPeriodType[] = ["単月", "YTD", "着地見込"];
const PERIOD_TYPE_ORDER = new Map(PERIOD_TYPES.map((periodType, index) => [periodType, index]));

type ScenarioSelection = {
  currentForecastScenarioKey: string | null;
  previousForecastScenarioKey: string | null;
};

type ComparisonAccumulator = {
  departmentCode: string;
  departmentName: string;
  accountCode: string;
  accountName: string;
};

export function normalizeLoglassData(rawRows: LoglessRawRow[]): LoglassNormalizedRowList {
  const parsedRows = loglassRawRowArraySchema.parse(rawRows);
  return loglassNormalizedRowArraySchema.parse(normalizeRawRows(parsedRows));
}

export function normalizeRawRows(rawRows: LoglessRawRow[]): LoglassNormalizedRow[] {
  const parsedRows = loglassRawRowArraySchema.parse(rawRows);

  if (parsedRows.length === 0) {
    return [];
  }

  const deduplicatedRows = new Map<string, LoglassNormalizedRow>();

  parsedRows.forEach((rawRow) => {
    const metricType = deriveMetricTypeFromScenario(rawRow.シナリオ);
    const scenarioKey = metricType === "実績" ? undefined : rawRow.シナリオ.trim();

    PERIOD_TYPES.forEach((periodType) => {
      const period = createNormalizedPeriod(rawRow.年月度, periodType);
      const rowKey = buildNormalizedRowKey({
        departmentCode: rawRow.部署コード,
        accountCode: rawRow.科目コード,
        yearMonth: rawRow.年月度,
        periodType,
        metricType,
        scenarioKey,
      });

      const existingRow = deduplicatedRows.get(rowKey);

      if (existingRow) {
        existingRow.amount += rawRow.金額;
        return;
      }

      deduplicatedRows.set(rowKey, {
        rowKey,
        scenarioKey,
        department: {
          code: rawRow.部署コード,
          externalCode: rawRow.外部部署コード,
          name: rawRow.部署,
          scope: "事業部",
        },
        account: {
          code: rawRow.科目コード,
          externalCode: rawRow.外部科目コード,
          name: rawRow.科目,
          type: rawRow.科目タイプ,
          aggregateName: rawRow.科目,
          detailName: rawRow.科目,
          hierarchyKey: rawRow.科目,
          isGmvDenominator: rawRow.科目 === "SaaS GMV" || rawRow.科目 === "広告 GMV",
        },
        period,
        metricType,
        amount: rawRow.金額,
      });
    });
  });

  return [...deduplicatedRows.values()];
}

export function generateComparisonData(
  normalizedRows: LoglassNormalizedRow[],
  targetMonth: string,
): ComparisonSet[] {
  if (normalizedRows.length === 0) {
    return [];
  }

  const normalizedTargetMonth = normalizeYearMonth(targetMonth);
  const [targetYearRaw, targetMonthRaw] = normalizedTargetMonth.split("-");
  const targetYear = Number(targetYearRaw);
  const targetMonthNumber = Number(targetMonthRaw);
  const targetFiscalYear = targetMonthNumber <= 3 ? targetYear : targetYear + 1;
  const comparisonSets: ComparisonSet[] = [];
  const scenarioSelection = selectForecastScenarios(normalizedRows, targetFiscalYear);

  PERIOD_TYPES.forEach((periodType) => {
    const periodRows = normalizedRows.filter((row) => row.period.periodType === periodType);
    const groupedRows = buildComparisonGroups(periodRows, targetFiscalYear, normalizedTargetMonth);

    groupedRows.forEach((group) => {
      const groupRows = periodRows.filter(
        (row) =>
          row.department.code === group.departmentCode &&
          row.account.code === group.accountCode,
      );

      const actualRows = groupRows.filter((row) => row.metricType === "実績");
      const forecastRows = groupRows.filter((row) => row.metricType === "見込");

      const previousYearActualRows = actualRows.filter(
        (row) => row.period.fiscalYear === targetFiscalYear - 1,
      );
      const currentFiscalYearActualRows = actualRows.filter(
        (row) => row.period.fiscalYear === targetFiscalYear,
      );

      const previousForecastRows = forecastRows.filter(
        (row) => row.scenarioKey === scenarioSelection.previousForecastScenarioKey,
      );
      const currentForecastRows = forecastRows.filter(
        (row) => row.scenarioKey === scenarioSelection.currentForecastScenarioKey,
      );

      const A = pickComparisonValue({
        periodType,
        targetFiscalYear,
        targetMonth: normalizedTargetMonth,
        targetMonthNumber,
        rows: previousForecastRows,
        kind: "A",
      });
      const B = pickComparisonValue({
        periodType,
        targetFiscalYear,
        targetMonth: normalizedTargetMonth,
        targetMonthNumber,
        rows: currentFiscalYearActualRows,
        currentForecastRows,
        kind: "B",
      });
      const C = pickComparisonValue({
        periodType,
        targetFiscalYear: targetFiscalYear - 1,
        targetMonth: shiftYearMonth(normalizedTargetMonth, -1),
        targetMonthNumber,
        rows: previousYearActualRows,
        kind: "C",
      });

      comparisonSets.push({
        rowKey: `comparison::${group.departmentCode}::${group.accountCode}::${normalizedTargetMonth}::${periodType}`,
        accountName: group.accountName,
        departmentName: group.departmentName,
        periodType,
        A,
        B,
        BA: calculateDiff(B, A),
        C,
        BC: calculateDiff(B, C),
      });
    });
  });

  return comparisonSets.sort((left, right) => {
    const departmentResult = left.departmentName.localeCompare(right.departmentName, "ja");

    if (departmentResult !== 0) {
      return departmentResult;
    }

    const accountResult = left.accountName.localeCompare(right.accountName, "ja");

    if (accountResult !== 0) {
      return accountResult;
    }

    return (PERIOD_TYPE_ORDER.get(left.periodType) ?? 0) - (PERIOD_TYPE_ORDER.get(right.periodType) ?? 0);
  });
}

function buildComparisonGroups(
  rows: LoglassNormalizedRow[],
  targetFiscalYear: number,
  targetMonth: string,
): ComparisonAccumulator[] {
  const groups = new Map<string, ComparisonAccumulator>();

  rows.forEach((row) => {
    const isRelevantActual =
      row.metricType === "実績" &&
      (row.period.fiscalYear === targetFiscalYear || row.period.fiscalYear === targetFiscalYear - 1);
    const isRelevantForecast = row.metricType === "見込" && row.period.fiscalYear === targetFiscalYear;

    if (!isRelevantActual && !isRelevantForecast) {
      return;
    }

    if (row.metricType === "実績" && row.period.fiscalYear === targetFiscalYear && row.period.yearMonth > targetMonth) {
      return;
    }

    const groupKey = `${row.department.code}::${row.account.code}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        departmentCode: row.department.code,
        departmentName: row.department.name,
        accountCode: row.account.code,
        accountName: row.account.name,
      });
    }
  });

  return [...groups.values()];
}

function selectForecastScenarios(
  rows: LoglassNormalizedRow[],
  targetFiscalYear: number,
): ScenarioSelection {
  const scenarioKeys = [...new Set(
    rows
      .filter((row) => row.metricType === "見込" && row.period.fiscalYear === targetFiscalYear)
      .map((row) => row.scenarioKey)
      .filter((scenarioKey): scenarioKey is string => Boolean(scenarioKey)),
  )];

  scenarioKeys.sort((left, right) => compareScenarioKeys(left, right));

  return {
    currentForecastScenarioKey: scenarioKeys.at(-1) ?? null,
    previousForecastScenarioKey: scenarioKeys.at(-2) ?? null,
  };
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

  if (!match) {
    return Number.MIN_SAFE_INTEGER;
  }

  return Number(match[1]);
}

function pickComparisonValue(input: {
  periodType: LoglassPeriodType;
  targetFiscalYear: number;
  targetMonth: string;
  targetMonthNumber: number;
  rows: LoglassNormalizedRow[];
  currentForecastRows?: LoglassNormalizedRow[];
  kind: "A" | "B" | "C";
}): number | null {
  switch (input.periodType) {
    case "単月":
      return sumRows(input.rows.filter((row) => row.period.yearMonth === input.targetMonth));

    case "YTD":
      return sumRows(
        input.rows.filter((row) =>
          isWithinFiscalYearToTargetMonth(
            row.period.yearMonth,
            input.targetFiscalYear,
            input.targetMonth,
          ),
        ),
      );

    case "着地見込": {
      if (input.kind !== "B") {
        return sumRows(
          input.rows.filter((row) => isWithinFiscalYear(row.period.yearMonth, input.targetFiscalYear)),
        );
      }

      const actualToDate = input.rows.filter((row) =>
        isWithinFiscalYearToTargetMonth(
          row.period.yearMonth,
          input.targetFiscalYear,
          input.targetMonth,
        ),
      );
      const forecastRestOfYear = (input.currentForecastRows ?? []).filter(
        (row) =>
          isWithinFiscalYear(row.period.yearMonth, input.targetFiscalYear) &&
          row.period.yearMonth > input.targetMonth,
      );

      return sumRows([...actualToDate, ...forecastRestOfYear]);
    }
  }
}

function sumRows(rows: LoglassNormalizedRow[]): number | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((total, row) => total + row.amount, 0);
}

function calculateDiff(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null;
  }

  return left - right;
}

function shiftYearMonth(yearMonth: string, yearDelta: number): string {
  const normalized = normalizeYearMonth(yearMonth);
  const [yearRaw, monthRaw] = normalized.split("-");
  return `${Number(yearRaw) + yearDelta}-${monthRaw}`;
}

function isWithinFiscalYear(yearMonth: string, fiscalYear: number): boolean {
  const normalized = normalizeYearMonth(yearMonth);
  return toFiscalSequence(normalized) >= toFiscalSequence(`${fiscalYear - 1}-04`) &&
    toFiscalSequence(normalized) <= toFiscalSequence(`${fiscalYear}-03`);
}

function isWithinFiscalYearToTargetMonth(
  yearMonth: string,
  fiscalYear: number,
  targetMonth: string,
): boolean {
  const normalized = normalizeYearMonth(yearMonth);
  return toFiscalSequence(normalized) >= toFiscalSequence(`${fiscalYear - 1}-04`) &&
    toFiscalSequence(normalized) <= toFiscalSequence(targetMonth);
}

function toFiscalSequence(yearMonth: string): number {
  const [yearRaw, monthRaw] = normalizeYearMonth(yearMonth).split("-");
  return Number(yearRaw) * 100 + Number(monthRaw);
}
