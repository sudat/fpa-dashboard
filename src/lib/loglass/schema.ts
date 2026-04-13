import { z } from "zod";

export const LOGGLASS_FISCAL_YEAR_END_MONTH = 3 as const;

const yearMonthPattern = /^\d{4}-\d{2}$/;
const nonEmptyString = z.string().trim().min(1);
const positiveMonth = z.number().int().min(1).max(12);

export const metricTypeSchema = z.enum(["予算", "実績", "見込"]);
export const accountTypeSchema = z.enum([
  "収益",
  "収益(配賦明細)",
  "収益(消去明細)",
  "費用",
  "費用(配賦明細)",
  "費用(消去明細)",
  "資産",
  "負債",
  "その他",
]);
export const periodTypeSchema = z.enum(["単月", "YTD", "着地見込"]);
export const comparisonColumnSchema = z.enum(["A", "B", "B-A", "C", "B-C"]);
export const departmentScopeSchema = z.enum(["全社", "事業部"]);

export const normalizedRowKeySchema = z.string().min(1).brand<"NormalizedRowKey">();

export const prototypeLoglassCsvRowSchema = z.object({
  "計画・実績": nonEmptyString,
  年月: z.union([z.date(), nonEmptyString]),
  ログラス科目コード: nonEmptyString,
  外部システム科目コード: z.string().trim().default(""),
  科目: nonEmptyString,
  科目タイプ: accountTypeSchema,
  ログラス部署コード: nonEmptyString,
  外部システム部署コード: z.string().trim().default(""),
  部署: nonEmptyString,
  金額: z.coerce.number().finite(),
});

export const loglessRawRowSchema = z.object({
  シナリオ: nonEmptyString,
  年月度: z.string().regex(yearMonthPattern),
  科目コード: nonEmptyString,
  外部科目コード: z.string().trim().default(""),
  科目: nonEmptyString,
  科目タイプ: accountTypeSchema,
  部署コード: nonEmptyString,
  外部部署コード: z.string().trim().default(""),
  部署: nonEmptyString,
  金額: z.coerce.number().finite(),
});

export const loglassRawRowSchema = loglessRawRowSchema;

export const normalizedPeriodSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  month: positiveMonth,
  yearMonth: z.string().regex(yearMonthPattern),
  periodType: periodTypeSchema,
});

export const normalizedDepartmentSchema = z.object({
  code: nonEmptyString,
  externalCode: z.string().trim().default(""),
  name: nonEmptyString,
  scope: departmentScopeSchema,
});

export const normalizedAccountSchema = z.object({
  code: nonEmptyString,
  externalCode: z.string().trim().default(""),
  name: nonEmptyString,
  type: accountTypeSchema,
  aggregateName: nonEmptyString,
  detailName: nonEmptyString,
  hierarchyKey: nonEmptyString,
  isGmvDenominator: z.boolean().default(false),
});

export const loglassNormalizedRowSchema = z.object({
  rowKey: normalizedRowKeySchema,
  scenarioKey: nonEmptyString.optional(),
  department: normalizedDepartmentSchema,
  account: normalizedAccountSchema,
  period: normalizedPeriodSchema,
  metricType: metricTypeSchema,
  amount: z.number().finite(),
});

export const loglassRawRowArraySchema = z.array(loglessRawRowSchema);
export const loglassNormalizedRowArraySchema = z.array(loglassNormalizedRowSchema);

type MetricType = z.infer<typeof metricTypeSchema>;
type PeriodType = z.infer<typeof periodTypeSchema>;
type PrototypeLoglassCsvRow = z.infer<typeof prototypeLoglassCsvRowSchema>;
type LoglessRawRow = z.infer<typeof loglessRawRowSchema>;
type LoglassNormalizedPeriod = z.infer<typeof normalizedPeriodSchema>;

export function normalizeYearMonth(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})[\/-](\d{1,2})/);

  if (match) {
    return `${match[1]}-${match[2]!.padStart(2, "0")}`;
  }

  if (yearMonthPattern.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`年月の正規化に失敗しました: ${trimmed}`);
}

export function toFiscalYear(
  yearMonth: string,
  fiscalYearEndMonth: number = LOGGLASS_FISCAL_YEAR_END_MONTH,
): number {
  const normalized = normalizeYearMonth(yearMonth);
  const [year, month] = normalized.split("-").map(Number);
  return month <= fiscalYearEndMonth ? year : year + 1;
}

export function deriveMetricTypeFromScenario(scenario: string): MetricType {
  const normalized = scenario.trim();

  if (normalized === "実績") return "実績";
  if (normalized.includes("予算") || normalized.includes("計画")) return "予算";

  return "見込";
}

export function createNormalizedPeriod(
  value: string | Date,
  periodType: PeriodType,
): LoglassNormalizedPeriod {
  const yearMonth = normalizeYearMonth(value);
  const [, monthRaw] = yearMonth.split("-");
  const month = Number(monthRaw);

  return normalizedPeriodSchema.parse({
    fiscalYear: toFiscalYear(yearMonth),
    month,
    yearMonth,
    periodType,
  });
}

export function normalizePrototypeCsvRow(row: PrototypeLoglassCsvRow): LoglessRawRow {
  const period = createNormalizedPeriod(row.年月, "単月");

  return loglessRawRowSchema.parse({
    シナリオ: row["計画・実績"],
    年月度: period.yearMonth,
    科目コード: row.ログラス科目コード,
    外部科目コード: row.外部システム科目コード,
    科目: row.科目,
    科目タイプ: row.科目タイプ,
    部署コード: row.ログラス部署コード,
    外部部署コード: row.外部システム部署コード,
    部署: row.部署,
    金額: row.金額,
  });
}

export function buildNormalizedRowKey(input: {
  departmentCode: string;
  accountCode: string;
  yearMonth: string;
  periodType: PeriodType;
  metricType: MetricType;
  scenarioKey?: string;
}) {
  const parts = [
    input.departmentCode.trim(),
    input.accountCode.trim(),
    normalizeYearMonth(input.yearMonth),
    input.periodType,
    input.metricType,
    input.scenarioKey?.trim() || "base",
  ];

  return normalizedRowKeySchema.parse(parts.join("::"));
}
