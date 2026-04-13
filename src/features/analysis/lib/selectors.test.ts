import { describe, expect, test } from "vitest";

import { aggregateByDepartment } from "@/features/admin/lib/grouping";
import { generateComparisonData, normalizeRawRows } from "@/features/admin/lib/normalize-loglass";
import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass";
import type { LoglessRawRow } from "@/lib/loglass/types";

import {
  getMajorAccountNames,
  selectDifferenceData,
  selectSummaryRows,
  selectTrendSeries,
} from "./selectors";

function createRawRow(overrides: Partial<LoglessRawRow>): LoglessRawRow {
  return {
    シナリオ: "実績",
    年月度: "2026-02",
    部署コード: "D001",
    外部部署コード: "EXT-D001",
    部署: "SaaS事業部",
    科目コード: "4001",
    外部科目コード: "EXT-4001",
    科目: "SaaS利用料売上",
    科目タイプ: "収益",
    金額: 0,
    ...overrides,
  };
}

function buildAnalysisRawRows(): LoglessRawRow[] {
  const rows: LoglessRawRow[] = [];

  const addMonthRows = (input: {
    yearMonth: string;
    scenario: string;
    d001Revenue: number;
    d002Revenue: number;
    d001Cost: number;
    d002Cost: number;
    d001Sga: number;
    d002Sga: number;
  }) => {
    const businessUnits = [
      {
        departmentCode: "D001",
        departmentName: "SaaS事業部",
        departmentExternalCode: "EXT-D001",
        revenueDetailCode: "4101",
        revenueDetailName: "SaaS利用料売上",
        revenue: input.d001Revenue,
        costDetailCode: "5101",
        costDetailName: "決済手数料",
        cost: input.d001Cost,
        sgaDetailCode: "7101",
        sgaDetailName: "人件費",
        sga: input.d001Sga,
      },
      {
        departmentCode: "D002",
        departmentName: "広告事業部",
        departmentExternalCode: "EXT-D002",
        revenueDetailCode: "4102",
        revenueDetailName: "広告売上",
        revenue: input.d002Revenue,
        costDetailCode: "5102",
        costDetailName: "配信原価",
        cost: input.d002Cost,
        sgaDetailCode: "7102",
        sgaDetailName: "広告宣伝費",
        sga: input.d002Sga,
      },
    ];

    businessUnits.forEach((unit) => {
      const grossProfit = unit.revenue - unit.cost;
      const operatingProfit = grossProfit - unit.sga;

      rows.push(
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: unit.revenueDetailCode,
          外部科目コード: `EXT-${unit.revenueDetailCode}`,
          科目: unit.revenueDetailName,
          科目タイプ: "収益",
          金額: unit.revenue,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: "4000",
          外部科目コード: "EXT-4000",
          科目: "売上高",
          科目タイプ: "収益",
          金額: unit.revenue,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: unit.costDetailCode,
          外部科目コード: `EXT-${unit.costDetailCode}`,
          科目: unit.costDetailName,
          科目タイプ: "費用",
          金額: unit.cost,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: "5000",
          外部科目コード: "EXT-5000",
          科目: "売上原価",
          科目タイプ: "費用",
          金額: unit.cost,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: "6000",
          外部科目コード: "EXT-6000",
          科目: "売上総利益",
          科目タイプ: "収益",
          金額: grossProfit,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: unit.sgaDetailCode,
          外部科目コード: `EXT-${unit.sgaDetailCode}`,
          科目: unit.sgaDetailName,
          科目タイプ: "費用",
          金額: unit.sga,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: "7000",
          外部科目コード: "EXT-7000",
          科目: "販管費",
          科目タイプ: "費用",
          金額: unit.sga,
        }),
        createRawRow({
          シナリオ: input.scenario,
          年月度: input.yearMonth,
          部署コード: unit.departmentCode,
          外部部署コード: unit.departmentExternalCode,
          部署: unit.departmentName,
          科目コード: "8000",
          外部科目コード: "EXT-8000",
          科目: "営業利益",
          科目タイプ: "収益",
          金額: operatingProfit,
        }),
      );
    });
  };

  addMonthRows({
    yearMonth: "2025-04",
    scenario: "実績",
    d001Revenue: 10,
    d002Revenue: 20,
    d001Cost: 4,
    d002Cost: 5,
    d001Sga: 3,
    d002Sga: 4,
  });
  addMonthRows({
    yearMonth: "2025-05",
    scenario: "実績",
    d001Revenue: 12,
    d002Revenue: 19,
    d001Cost: 5,
    d002Cost: 6,
    d001Sga: 3,
    d002Sga: 5,
  });
  addMonthRows({
    yearMonth: "2026-02",
    scenario: "実績",
    d001Revenue: 40,
    d002Revenue: 30,
    d001Cost: 11,
    d002Cost: 13,
    d001Sga: 7,
    d002Sga: 11,
  });
  addMonthRows({
    yearMonth: "2024-04",
    scenario: "実績",
    d001Revenue: 8,
    d002Revenue: 18,
    d001Cost: 3,
    d002Cost: 4,
    d001Sga: 2,
    d002Sga: 3,
  });
  addMonthRows({
    yearMonth: "2024-05",
    scenario: "実績",
    d001Revenue: 9,
    d002Revenue: 17,
    d001Cost: 4,
    d002Cost: 5,
    d001Sga: 2,
    d002Sga: 4,
  });
  addMonthRows({
    yearMonth: "2025-02",
    scenario: "実績",
    d001Revenue: 35,
    d002Revenue: 25,
    d001Cost: 9,
    d002Cost: 10,
    d001Sga: 6,
    d002Sga: 8,
  });
  addMonthRows({
    yearMonth: "2025-03",
    scenario: "実績",
    d001Revenue: 36,
    d002Revenue: 24,
    d001Cost: 9,
    d002Cost: 10,
    d001Sga: 6,
    d002Sga: 8,
  });
  addMonthRows({
    yearMonth: "2025-04",
    scenario: "26年3月期着地見込0124時点",
    d001Revenue: 11,
    d002Revenue: 18,
    d001Cost: 4,
    d002Cost: 5,
    d001Sga: 3,
    d002Sga: 4,
  });
  addMonthRows({
    yearMonth: "2025-05",
    scenario: "26年3月期着地見込0124時点",
    d001Revenue: 13,
    d002Revenue: 18,
    d001Cost: 5,
    d002Cost: 7,
    d001Sga: 3,
    d002Sga: 5,
  });
  addMonthRows({
    yearMonth: "2026-02",
    scenario: "26年3月期着地見込0124時点",
    d001Revenue: 38,
    d002Revenue: 29,
    d001Cost: 10,
    d002Cost: 12,
    d001Sga: 7,
    d002Sga: 10,
  });
  addMonthRows({
    yearMonth: "2026-03",
    scenario: "26年3月期着地見込0124時点",
    d001Revenue: 50,
    d002Revenue: 33,
    d001Cost: 14,
    d002Cost: 15,
    d001Sga: 8,
    d002Sga: 11,
  });
  addMonthRows({
    yearMonth: "2026-03",
    scenario: "26年3月期着地見込0224時点",
    d001Revenue: 55,
    d002Revenue: 36,
    d001Cost: 13,
    d002Cost: 17,
    d001Sga: 9,
    d002Sga: 12,
  });

  return rows;
}

function buildNormalizedDataset(rawRows: LoglessRawRow[]) {
  const normalizedRows = normalizeRawRows(rawRows);
  return aggregateByDepartment(normalizedRows);
}

function buildComparisonDataset(rawRows: LoglessRawRow[]): ComparisonSet[] {
  return generateComparisonData(buildNormalizedDataset(rawRows), "2026-02");
}

describe("analysis selectors", () => {
  test("getMajorAccountNames returns the fixed major account order", () => {
    expect(getMajorAccountNames()).toEqual([
      "売上高",
      "売上原価",
      "売上総利益",
      "販管費",
      "営業利益",
    ]);
  });

  test("selectSummaryRows returns aggregate rows in major account order for all three time axes", () => {
    const comparisonData = buildComparisonDataset(buildAnalysisRawRows());

    expect(selectSummaryRows(comparisonData, "ALL", "単月")).toEqual([
      {
        accountCode: "4000",
        accountName: "売上高",
        aggregateName: "売上高",
        periodType: "単月",
        A: 67,
        B: 70,
        BA: 3,
        C: 60,
        BC: 10,
      },
      {
        accountCode: "5000",
        accountName: "売上原価",
        aggregateName: "売上原価",
        periodType: "単月",
        A: 22,
        B: 24,
        BA: 2,
        C: 19,
        BC: 5,
      },
      {
        accountCode: "6000",
        accountName: "売上総利益",
        aggregateName: "売上総利益",
        periodType: "単月",
        A: 45,
        B: 46,
        BA: 1,
        C: 41,
        BC: 5,
      },
      {
        accountCode: "7000",
        accountName: "販管費",
        aggregateName: "販管費",
        periodType: "単月",
        A: 17,
        B: 18,
        BA: 1,
        C: 14,
        BC: 4,
      },
      {
        accountCode: "8000",
        accountName: "営業利益",
        aggregateName: "営業利益",
        periodType: "単月",
        A: 28,
        B: 28,
        BA: 0,
        C: 27,
        BC: 1,
      },
    ]);

    expect(selectSummaryRows(comparisonData, "ALL", "YTD")).toEqual([
      {
        accountCode: "4000",
        accountName: "売上高",
        aggregateName: "売上高",
        periodType: "YTD",
        A: 127,
        B: 131,
        BA: 4,
        C: 112,
        BC: 19,
      },
      {
        accountCode: "5000",
        accountName: "売上原価",
        aggregateName: "売上原価",
        periodType: "YTD",
        A: 43,
        B: 44,
        BA: 1,
        C: 35,
        BC: 9,
      },
      {
        accountCode: "6000",
        accountName: "売上総利益",
        aggregateName: "売上総利益",
        periodType: "YTD",
        A: 84,
        B: 87,
        BA: 3,
        C: 77,
        BC: 10,
      },
      {
        accountCode: "7000",
        accountName: "販管費",
        aggregateName: "販管費",
        periodType: "YTD",
        A: 32,
        B: 33,
        BA: 1,
        C: 25,
        BC: 8,
      },
      {
        accountCode: "8000",
        accountName: "営業利益",
        aggregateName: "営業利益",
        periodType: "YTD",
        A: 52,
        B: 54,
        BA: 2,
        C: 52,
        BC: 2,
      },
    ]);

    expect(selectSummaryRows(comparisonData, "ALL", "着地見込")).toEqual([
      {
        accountCode: "4000",
        accountName: "売上高",
        aggregateName: "売上高",
        periodType: "着地見込",
        A: 210,
        B: 222,
        BA: 12,
        C: 172,
        BC: 50,
      },
      {
        accountCode: "5000",
        accountName: "売上原価",
        aggregateName: "売上原価",
        periodType: "着地見込",
        A: 72,
        B: 74,
        BA: 2,
        C: 54,
        BC: 20,
      },
      {
        accountCode: "6000",
        accountName: "売上総利益",
        aggregateName: "売上総利益",
        periodType: "着地見込",
        A: 138,
        B: 148,
        BA: 10,
        C: 118,
        BC: 30,
      },
      {
        accountCode: "7000",
        accountName: "販管費",
        aggregateName: "販管費",
        periodType: "着地見込",
        A: 51,
        B: 54,
        BA: 3,
        C: 39,
        BC: 15,
      },
      {
        accountCode: "8000",
        accountName: "営業利益",
        aggregateName: "営業利益",
        periodType: "着地見込",
        A: 87,
        B: 94,
        BA: 7,
        C: 79,
        BC: 15,
      },
    ]);
  });

  test("summary totals reconcile with rolled-up detail totals for all three time axes", () => {
    const comparisonData = buildComparisonDataset(buildAnalysisRawRows());
    const detailGroups = {
      売上高: ["SaaS利用料売上", "広告売上"],
      売上原価: ["決済手数料", "配信原価"],
      販管費: ["人件費", "広告宣伝費"],
    } as const;

    (["単月", "YTD", "着地見込"] as const).forEach((periodType) => {
      const summaryRows = selectSummaryRows(comparisonData, "ALL", periodType);
      const scopedRows = comparisonData.filter(
        (row) => row.periodType === periodType && row.rowKey.includes("comparison::ALL::"),
      );

      Object.entries(detailGroups).forEach(([summaryName, detailNames]) => {
        const summaryRow = summaryRows.find((row) => row.accountName === summaryName);
        const detailRows = scopedRows.filter((row) => detailNames.includes(row.accountName));

        expect(summaryRow).toBeDefined();
        expect(detailRows.reduce((total, row) => total + (row.A ?? 0), 0)).toBe(summaryRow?.A);
        expect(detailRows.reduce((total, row) => total + (row.B ?? 0), 0)).toBe(summaryRow?.B);
        expect(detailRows.reduce((total, row) => total + (row.BA ?? 0), 0)).toBe(summaryRow?.BA);
        expect(detailRows.reduce((total, row) => total + (row.C ?? 0), 0)).toBe(summaryRow?.C);
        expect(detailRows.reduce((total, row) => total + (row.BC ?? 0), 0)).toBe(summaryRow?.BC);
      });
    });
  });

  test("selectTrendSeries returns fiscal-year monthly points with actual/forecast split at target month", () => {
    const rawRows = buildAnalysisRawRows();
    const rows = buildNormalizedDataset(rawRows);

    expect(selectTrendSeries(rows, "4000", "ALL", "着地見込", "2026-02")).toEqual({
      accountCode: "4000",
      accountName: "売上高",
      departmentCode: "ALL",
      periodType: "着地見込",
      points: [
        { yearMonth: "2025-04", amount: 30, type: "actual" },
        { yearMonth: "2025-05", amount: 31, type: "actual" },
        { yearMonth: "2026-02", amount: 70, type: "actual" },
        { yearMonth: "2026-03", amount: 91, type: "forecast" },
      ],
    });
  });

  test("selectDifferenceData returns top items by absolute diff and favorable direction for revenue/expense rows", () => {
    const comparisonData = buildComparisonDataset(buildAnalysisRawRows());

    expect(selectDifferenceData(comparisonData, "全社", "ALL", "着地見込", "7000")).toEqual({
      periodType: "着地見込",
      targetAccountCode: "7000",
      items: [
        { label: "広告事業部", value: 2, absoluteValue: 2, isPositive: false },
        { label: "SaaS事業部", value: 1, absoluteValue: 1, isPositive: false },
      ],
    });

    expect(selectDifferenceData(comparisonData, "全社", "ALL", "着地見込", "4000")).toEqual({
      periodType: "着地見込",
      targetAccountCode: "4000",
      items: [
        { label: "広告事業部", value: 7, absoluteValue: 7, isPositive: true },
        { label: "SaaS事業部", value: 5, absoluteValue: 5, isPositive: true },
      ],
    });

    expect(selectDifferenceData(comparisonData, "事業部", "D001", "着地見込")).toEqual({
      periodType: "着地見込",
      targetAccountCode: null,
      items: [
        { label: "SaaS利用料売上", value: 5, absoluteValue: 5, isPositive: true },
        { label: "人件費", value: 1, absoluteValue: 1, isPositive: false },
        { label: "決済手数料", value: 0, absoluteValue: 0, isPositive: false },
      ],
    });
  });

  test("empty selector inputs return empty outputs", () => {
    expect(selectSummaryRows([], "ALL", "単月")).toEqual([]);
    expect(selectTrendSeries([], "4000", "ALL", "着地見込", "2026-02")).toEqual({
      accountCode: "4000",
      accountName: "",
      departmentCode: "ALL",
      periodType: "着地見込",
      points: [],
    });
    expect(selectDifferenceData([], "全社", "ALL", "単月")).toEqual({
      periodType: "単月",
      targetAccountCode: null,
      items: [],
    });
  });
});
