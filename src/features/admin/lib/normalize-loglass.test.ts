import { describe, expect, test } from "vitest";

import { loglassSmallRawFixture } from "@/lib/fixtures/loglass-small";
import type { LoglassRawRow } from "@/lib/loglass/types";

import {
  generateComparisonData,
  normalizeLoglassData,
  normalizeRawRows,
} from "./normalize-loglass";

function createRawRow(overrides: Partial<LoglassRawRow> = {}): LoglassRawRow {
  return {
    対象年度: 2026,
    対象月: 2,
    シナリオ: "実績",
    数値区分: "実績",
    年月度: "2026-02",
    部署コード: "D001",
    外部部署コード: "EXT-D001",
    部署名: "SaaS事業部",
    科目コード: "4001",
    外部科目コード: "EXT-4001",
    科目名: "SaaS利用料売上",
    集計科目名: "売上高",
    明細科目名: "SaaS利用料売上",
    科目タイプ: "収益",
    金額: 0,
    ...overrides,
  };
}

describe("normalize-loglass", () => {
  test("normalizeRawRows expands each raw row into all time axes and preserves hierarchy metadata", () => {
    const [gmvRawRow] = loglassSmallRawFixture;
    const normalizedRows = normalizeRawRows([gmvRawRow]);

    expect(normalizedRows).toHaveLength(3);
    expect(normalizedRows.map((row) => row.period.periodType)).toEqual([
      "単月",
      "YTD",
      "着地見込",
    ]);
    expect(normalizedRows.every((row) => row.account.hierarchyKey === "GMV::SaaS GMV")).toBe(true);
    expect(normalizedRows.every((row) => row.account.isGmvDenominator)).toBe(true);
    expect(normalizedRows.every((row) => row.scenarioKey === undefined)).toBe(true);
  });

  test("normalizeLoglassData returns schema-valid rows with unique row keys for the small fixture", () => {
    const normalizedRows = normalizeLoglassData(loglassSmallRawFixture);
    const rowKeys = new Set(normalizedRows.map((row) => row.rowKey));

    expect(normalizedRows).toHaveLength(loglassSmallRawFixture.length * 3);
    expect(rowKeys.size).toBe(normalizedRows.length);
  });

  test("normalizeRawRows aggregates duplicate raw rows deterministically", () => {
    const duplicatedRows = [
      createRawRow({ 金額: 40 }),
      createRawRow({ 金額: 60 }),
    ];

    const normalizedRows = normalizeRawRows(duplicatedRows);

    expect(normalizedRows).toHaveLength(3);
    expect(normalizedRows.map((row) => row.amount)).toEqual([100, 100, 100]);
  });

  test("generateComparisonData builds 単月/YTD/着地見込 A-B-C values from normalized rows", () => {
    const rawRows: LoglassRawRow[] = [
      createRawRow({ 年月度: "2025-04", 対象月: 4, 金額: 10 }),
      createRawRow({ 年月度: "2025-05", 対象月: 5, 金額: 20 }),
      createRawRow({ 年月度: "2026-01", 対象月: 1, 金額: 30 }),
      createRawRow({ 年月度: "2026-02", 対象月: 2, 金額: 40 }),
      createRawRow({ 年月度: "2024-04", 対象月: 4, 対象年度: 2025, 金額: 5 }),
      createRawRow({ 年月度: "2024-05", 対象月: 5, 対象年度: 2025, 金額: 15 }),
      createRawRow({ 年月度: "2025-01", 対象月: 1, 対象年度: 2025, 金額: 25 }),
      createRawRow({ 年月度: "2025-02", 対象月: 2, 対象年度: 2025, 金額: 30 }),
      createRawRow({ 年月度: "2025-03", 対象月: 3, 対象年度: 2025, 金額: 45 }),
      createRawRow({
        年月度: "2025-04",
        対象月: 4,
        シナリオ: "26年3月期着地見込0124時点",
        数値区分: "見込",
        金額: 11,
      }),
      createRawRow({
        年月度: "2025-05",
        対象月: 5,
        シナリオ: "26年3月期着地見込0124時点",
        数値区分: "見込",
        金額: 21,
      }),
      createRawRow({
        年月度: "2026-01",
        対象月: 1,
        シナリオ: "26年3月期着地見込0124時点",
        数値区分: "見込",
        金額: 31,
      }),
      createRawRow({
        年月度: "2026-02",
        対象月: 2,
        シナリオ: "26年3月期着地見込0124時点",
        数値区分: "見込",
        金額: 35,
      }),
      createRawRow({
        年月度: "2026-03",
        対象月: 3,
        対象年度: 2026,
        シナリオ: "26年3月期着地見込0124時点",
        数値区分: "見込",
        金額: 60,
      }),
      createRawRow({
        年月度: "2026-03",
        対象月: 3,
        対象年度: 2026,
        シナリオ: "26年3月期着地見込0224時点",
        数値区分: "見込",
        金額: 65,
      }),
      createRawRow({
        科目コード: "9001",
        外部科目コード: "EXT-9001",
        科目名: "ゼロ売上",
        集計科目名: "売上高",
        明細科目名: "ゼロ売上",
        年月度: "2026-02",
        対象月: 2,
        金額: 0,
      }),
    ];

    const comparisonData = generateComparisonData(normalizeRawRows(rawRows), "2026-02");
    const targetRows = comparisonData.filter((row) => row.accountName === "SaaS利用料売上");

    expect(targetRows).toHaveLength(3);
    expect(targetRows).toEqual([
      {
        rowKey: expect.any(String),
        accountName: "SaaS利用料売上",
        departmentName: "SaaS事業部",
        periodType: "単月",
        A: 35,
        B: 40,
        BA: 5,
        C: 30,
        BC: 10,
      },
      {
        rowKey: expect.any(String),
        accountName: "SaaS利用料売上",
        departmentName: "SaaS事業部",
        periodType: "YTD",
        A: 98,
        B: 100,
        BA: 2,
        C: 75,
        BC: 25,
      },
      {
        rowKey: expect.any(String),
        accountName: "SaaS利用料売上",
        departmentName: "SaaS事業部",
        periodType: "着地見込",
        A: 158,
        B: 165,
        BA: 7,
        C: 120,
        BC: 45,
      },
    ]);

    expect(
      comparisonData.filter((row) => row.accountName === "ゼロ売上").map((row) => ({
        periodType: row.periodType,
        A: row.A,
        B: row.B,
        BA: row.BA,
        C: row.C,
        BC: row.BC,
      })),
    ).toEqual([
      { periodType: "単月", A: null, B: 0, BA: null, C: null, BC: null },
      { periodType: "YTD", A: null, B: 0, BA: null, C: null, BC: null },
      { periodType: "着地見込", A: null, B: 0, BA: null, C: null, BC: null },
    ]);
  });

  test("empty inputs return empty outputs", () => {
    expect(normalizeRawRows([])).toEqual([]);
    expect(normalizeLoglassData([])).toEqual([]);
    expect(generateComparisonData([], "2026-02")).toEqual([]);
  });
});
