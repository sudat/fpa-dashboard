import { describe, expect, test } from "vitest";

import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass";

import { selectGmvRatios } from "../summary";

function createComparisonRow(overrides: Partial<ComparisonSet>): ComparisonSet {
  return {
    rowKey: "comparison::D001::4000::2026-02::単月",
    accountName: "売上高",
    departmentName: "SaaS事業部",
    periodType: "単月",
    A: 100,
    B: 120,
    BA: 20,
    C: 80,
    BC: 40,
    ...overrides,
  };
}

describe("selectGmvRatios", () => {
  test("GMV合計Bを分母に主要PL科目の比率を返す", () => {
    const comparisonData = [
      createComparisonRow({
        rowKey: "comparison::D001::gmv-saas::2026-02::単月",
        accountName: "SaaS GMV",
        A: 400,
        B: 500,
        BA: 100,
        C: 300,
        BC: 200,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::gmv-ad::2026-02::単月",
        accountName: "広告 GMV",
        A: 100,
        B: 300,
        BA: 200,
        C: 50,
        BC: 250,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::4000::2026-02::単月",
        accountName: "売上高",
        A: 320,
        B: 400,
        BA: 80,
        C: 240,
        BC: 160,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::5000::2026-02::単月",
        accountName: "売上原価",
        A: 160,
        B: 240,
        BA: 80,
        C: 120,
        BC: 120,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::6000::2026-02::単月",
        accountName: "売上総利益",
        A: 160,
        B: 160,
        BA: 0,
        C: 120,
        BC: 40,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::7000::2026-02::単月",
        accountName: "販管費",
        A: 80,
        B: 100,
        BA: 20,
        C: 70,
        BC: 30,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::8000::2026-02::単月",
        accountName: "営業利益",
        A: 80,
        B: 60,
        BA: -20,
        C: 50,
        BC: 10,
      }),
      createComparisonRow({
        rowKey: "comparison::D002::4000::2026-02::単月",
        accountName: "売上高",
        B: 999,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::4000::2026-02::YTD",
        periodType: "YTD",
        accountName: "売上高",
        B: 999,
      }),
    ];

    expect(selectGmvRatios(comparisonData, "D001", "単月")).toEqual([
      {
        accountName: "売上高",
        A_ratio: 0.4,
        B_ratio: 0.5,
        BA_ratio: 0.1,
        C_ratio: 0.3,
        BC_ratio: 0.2,
      },
      {
        accountName: "売上原価",
        A_ratio: 0.2,
        B_ratio: 0.3,
        BA_ratio: 0.1,
        C_ratio: 0.15,
        BC_ratio: 0.15,
      },
      {
        accountName: "売上総利益",
        A_ratio: 0.2,
        B_ratio: 0.2,
        BA_ratio: 0,
        C_ratio: 0.15,
        BC_ratio: 0.05,
      },
      {
        accountName: "販管費",
        A_ratio: 0.1,
        B_ratio: 0.125,
        BA_ratio: 0.025,
        C_ratio: 0.0875,
        BC_ratio: 0.0375,
      },
      {
        accountName: "営業利益",
        A_ratio: 0.1,
        B_ratio: 0.075,
        BA_ratio: -0.025,
        C_ratio: 0.0625,
        BC_ratio: 0.0125,
      },
    ]);
  });

  test("GMVデータがない場合は全比率をnullで返す", () => {
    const comparisonData = [
      createComparisonRow({ accountName: "売上高", B: 400 }),
      createComparisonRow({ rowKey: "comparison::D001::5000::2026-02::単月", accountName: "売上原価", B: 240 }),
      createComparisonRow({ rowKey: "comparison::D001::6000::2026-02::単月", accountName: "売上総利益", B: 160 }),
      createComparisonRow({ rowKey: "comparison::D001::7000::2026-02::単月", accountName: "販管費", B: 100 }),
      createComparisonRow({ rowKey: "comparison::D001::8000::2026-02::単月", accountName: "営業利益", B: 60 }),
    ];

    expect(selectGmvRatios(comparisonData, "D001", "単月")).toEqual([
      { accountName: "売上高", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "売上原価", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "売上総利益", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "販管費", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "営業利益", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
    ]);
  });

  test("GMV合計Bが0なら全比率をnullで返す", () => {
    const comparisonData = [
      createComparisonRow({
        rowKey: "comparison::D001::gmv::2026-02::単月",
        accountName: "GMV",
        A: 100,
        B: 0,
        BA: -100,
        C: 50,
        BC: -50,
      }),
      createComparisonRow({ accountName: "売上高", B: 400 }),
      createComparisonRow({ rowKey: "comparison::D001::5000::2026-02::単月", accountName: "売上原価", B: 240 }),
      createComparisonRow({ rowKey: "comparison::D001::6000::2026-02::単月", accountName: "売上総利益", B: 160 }),
      createComparisonRow({ rowKey: "comparison::D001::7000::2026-02::単月", accountName: "販管費", B: 100 }),
      createComparisonRow({ rowKey: "comparison::D001::8000::2026-02::単月", accountName: "営業利益", B: 60 }),
    ];

    expect(selectGmvRatios(comparisonData, "D001", "単月")).toEqual([
      { accountName: "売上高", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "売上原価", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "売上総利益", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "販管費", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
      { accountName: "営業利益", A_ratio: null, B_ratio: null, BA_ratio: null, C_ratio: null, BC_ratio: null },
    ]);
  });
});
