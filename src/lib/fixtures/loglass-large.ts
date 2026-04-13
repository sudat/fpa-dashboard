import {
  buildNormalizedRowKey,
  createNormalizedPeriod,
  deriveMetricTypeFromScenario,
  loglassNormalizedRowArraySchema,
  loglassRawRowArraySchema,
} from "../loglass/schema";
import type { LoglassNormalizedRow, LoglessRawRow } from "../loglass/types";

const departments = [
  ["D001", "EXT-D001", "SaaS事業部"],
  ["D002", "EXT-D002", "広告事業部"],
  ["D003", "EXT-D003", "EC事業部"],
  ["D004", "EXT-D004", "新規事業部"],
  ["D005", "EXT-D005", "コーポレート"],
  ["D006", "EXT-D006", "海外事業部"],
  ["D007", "EXT-D007", "Fintech事業部"],
  ["D008", "EXT-D008", "データソリューション事業部"],
  ["D009", "EXT-D009", "Marketplace事業部"],
  ["D010", "EXT-D010", "店舗DX事業部"],
] as const;

const accounts = [
  ["1001", "EXT-1001", "GMV", "SaaS GMV", "収益"],
  ["1002", "EXT-1002", "GMV", "広告 GMV", "収益"],
  ["1003", "EXT-1003", "GMV", "EC GMV", "収益"],
  ["4001", "EXT-4001", "売上高", "SaaS利用料売上", "収益"],
  ["4002", "EXT-4002", "売上高", "広告売上", "収益"],
  ["4003", "EXT-4003", "売上高", "EC売上", "収益"],
  ["5001", "EXT-5001", "売上原価", "決済手数料", "費用"],
  ["5002", "EXT-5002", "売上原価", "配信原価", "費用"],
  ["5003", "EXT-5003", "売上原価", "配送原価", "費用"],
  ["7001", "EXT-7001", "販管費", "人件費", "費用"],
  ["7002", "EXT-7002", "販管費", "広告宣伝費", "費用"],
  ["7003", "EXT-7003", "販管費", "業務委託費", "費用"],
  ["7101", "EXT-7101", "販管費", "採用費", "費用"],
  ["7201", "EXT-7201", "販管費", "SaaS利用料", "費用"],
  ["7301", "EXT-7301", "販管費", "地代家賃", "費用"],
] as const;

const scenarios = [
  ["実績", "実績"],
  ["2026年度予算", "予算"],
  ["26年3月期着地見込0224時点", "見込"],
] as const;

const periodTypes = ["単月", "YTD", "着地見込"] as const;
const months = [
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
] as const;

function amountFor(indices: {
  monthIndex: number;
  departmentIndex: number;
  accountIndex: number;
  scenarioIndex: number;
}): number {
  const base = (indices.accountIndex + 3) * 1_250_000;
  const departmentFactor = 1 + indices.departmentIndex * 0.12;
  const monthFactor = 1 + indices.monthIndex * 0.018;
  const scenarioFactor = [1, 0.97, 1.03][indices.scenarioIndex] ?? 1;

  return Math.round(base * departmentFactor * monthFactor * scenarioFactor);
}

function createLargeRawFixture(): LoglessRawRow[] {
  const rows: LoglessRawRow[] = [];

  months.forEach((yearMonth, monthIndex) => {
    departments.forEach(([departmentCode, externalDepartmentCode, departmentName], departmentIndex) => {
      accounts.forEach(([accountCode, externalAccountCode, _aggregateName, detailName, accountType], accountIndex) => {
        scenarios.forEach(([scenario], scenarioIndex) => {
          rows.push({
            シナリオ: scenario,
            年月度: yearMonth,
            部署コード: departmentCode,
            外部部署コード: externalDepartmentCode,
            部署: departmentName,
            科目コード: accountCode,
            外部科目コード: externalAccountCode,
            科目: detailName,
            科目タイプ: accountType,
            金額: amountFor({
              monthIndex,
              departmentIndex,
              accountIndex,
              scenarioIndex,
            }),
          });
        });
      });
    });
  });

  return rows;
}

function createLargeNormalizedFixture(rows: LoglessRawRow[]): LoglassNormalizedRow[] {
  return rows.map((raw, index) => {
    const periodType = periodTypes[index % periodTypes.length];
    const isAllCompanyRow = index % 19 === 0;
    const metricType = deriveMetricTypeFromScenario(raw.シナリオ);
    const scenarioKey = metricType === "実績" ? undefined : raw.シナリオ;
    const departmentCode = isAllCompanyRow ? "ALL" : raw.部署コード;

    return {
      rowKey: buildNormalizedRowKey({
        departmentCode,
        accountCode: raw.科目コード,
        yearMonth: raw.年月度,
        periodType,
        metricType,
        scenarioKey,
      }),
      scenarioKey,
      department: {
        code: departmentCode,
        externalCode: isAllCompanyRow ? "" : raw.外部部署コード,
        name: isAllCompanyRow ? "全社" : raw.部署,
        scope: isAllCompanyRow ? "全社" : "事業部",
      },
      account: {
        code: raw.科目コード,
        externalCode: raw.外部科目コード,
        name: raw.科目,
        type: raw.科目タイプ,
        aggregateName: raw.科目,
        detailName: raw.科目,
        hierarchyKey: `${raw.科目}::${raw.科目}`,
        isGmvDenominator: raw.科目 === "SaaS GMV" || raw.科目 === "広告 GMV" || raw.科目 === "EC GMV",
      },
      period: createNormalizedPeriod(raw.年月度, periodType),
      metricType,
      amount: raw.金額,
    };
  });
}

export const loglassLargeRawFixture = loglassRawRowArraySchema.parse(createLargeRawFixture());
export const loglassLargeFixture = loglassNormalizedRowArraySchema.parse(
  createLargeNormalizedFixture(loglassLargeRawFixture),
);
