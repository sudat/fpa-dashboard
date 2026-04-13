import { describe, expect, test } from "vitest";

import type { ComparisonSet } from "@/features/admin/lib/normalize-loglass";
import type { MappedAccount } from "@/lib/domain/master-schema";
import type { LoglassNormalizedRow } from "@/lib/loglass/types";

import { applyBucketFilter } from "../bucket-filter";
import { selectDifferenceData } from "../difference";
import { selectSummaryRows } from "../summary";
import { selectTrendSeries } from "../trend";

type FilterableItem = {
  id: string;
  amount: number;
  accountMapping?: MappedAccount;
};

function createMappedAccount(overrides: Partial<MappedAccount>): MappedAccount {
  return {
    rawAccountName: "科目",
    detailAccountName: "科目",
    aggregateAccountName: "売上高",
    sortOrder: 10,
    isGmv: false,
    bucketStatus: "normal",
    bucketLabel: "通常",
    warningOnSave: false,
    autoAggregation: false,
    includeInAnalysis: true,
    ...overrides,
  };
}

function createComparisonRow(overrides: Partial<ComparisonSet>): ComparisonSet {
  return {
    rowKey: "comparison::D001::4000::2026-02::単月",
    accountName: "売上高",
    departmentName: "SaaS事業部",
    periodType: "単月",
    A: 10,
    B: 12,
    BA: 2,
    C: 8,
    BC: 4,
    ...overrides,
  };
}

function createNormalizedRow(overrides: Partial<LoglassNormalizedRow>): LoglassNormalizedRow {
  return {
    rowKey: "D001::4000::2026-02::着地見込::実績",
    scenarioKey: undefined,
    department: {
      code: "D001",
      externalCode: "EXT-D001",
      name: "SaaS事業部",
      scope: "事業部",
    },
    account: {
      code: "4000",
      externalCode: "EXT-4000",
      name: "売上高",
      type: "収益",
      aggregateName: "売上高",
      detailName: "売上高",
      hierarchyKey: "売上高::売上高",
      isGmvDenominator: false,
    },
    period: {
      yearMonth: "2026-02",
      fiscalYear: 2026,
      periodType: "着地見込",
    },
    metricType: "実績",
    amount: 12,
    ...overrides,
  };
}

describe("bucket-filter", () => {
  test("filters excluded items, aggregates unassigned items, and keeps normal items", () => {
    const items: FilterableItem[] = [
      {
        id: "normal",
        amount: 10,
        accountMapping: createMappedAccount({
          rawAccountName: "売上高",
          detailAccountName: "売上高",
          aggregateAccountName: "売上高",
        }),
      },
      {
        id: "excluded",
        amount: 99,
        accountMapping: createMappedAccount({
          rawAccountName: "営業利益",
          detailAccountName: "営業利益",
          aggregateAccountName: "営業利益",
          bucketStatus: "excluded",
          bucketLabel: "集計不要",
          includeInAnalysis: false,
          autoAggregation: false,
        }),
      },
      {
        id: "u1",
        amount: 3,
        accountMapping: createMappedAccount({
          rawAccountName: "未知A",
          detailAccountName: "未知A",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
      {
        id: "u2",
        amount: 7,
        accountMapping: createMappedAccount({
          rawAccountName: "未知B",
          detailAccountName: "未知B",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
    ];

    expect(applyBucketFilter(items)).toEqual([
      items[0],
      {
        id: "u1",
        amount: 3,
        accountMapping: createMappedAccount({
          rawAccountName: "未知A",
          detailAccountName: "未割当",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
      {
        id: "u2",
        amount: 7,
        accountMapping: createMappedAccount({
          rawAccountName: "未知B",
          detailAccountName: "未割当",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
    ]);
  });

  test("applyBucketFilter is deterministic for the same input", () => {
    const items: FilterableItem[] = [
      {
        id: "u1",
        amount: 2,
        accountMapping: createMappedAccount({
          rawAccountName: "未知A",
          detailAccountName: "未知A",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
      {
        id: "u2",
        amount: 5,
        accountMapping: createMappedAccount({
          rawAccountName: "未知B",
          detailAccountName: "未知B",
          aggregateAccountName: "未割当",
          bucketStatus: "unassigned",
          bucketLabel: "未割当",
          warningOnSave: true,
          autoAggregation: true,
        }),
      },
    ];

    expect(applyBucketFilter(items)).toEqual(applyBucketFilter(items));
  });

  test("summary output excludes 集計不要 rows", () => {
    const comparisonData = [
      createComparisonRow({
        rowKey: "comparison::D001::4000::2026-02::単月",
        accountName: "売上高",
      }),
      createComparisonRow({
        rowKey: "comparison::D001::9999::2026-02::単月",
        accountName: "集計不要",
        A: 100,
        B: 100,
        BA: 0,
        C: 100,
        BC: 0,
      }),
    ];

    expect(selectSummaryRows(comparisonData, "D001", "単月")).toEqual([
      {
        accountCode: "4000",
        accountName: "売上高",
        aggregateName: "売上高",
        periodType: "単月",
        A: 10,
        B: 12,
        BA: 2,
        C: 8,
        BC: 4,
      },
    ]);
  });

  test("trend output excludes 集計不要 rows and keeps 未割当 rows", () => {
    const rows = [
      createNormalizedRow({
        rowKey: "D001::9800::2026-02::着地見込::実績",
        account: {
          code: "9800",
          externalCode: "EXT-9800",
          name: "未割当",
          type: "費用",
          aggregateName: "未割当",
          detailName: "未知科目A",
          hierarchyKey: "未割当::未知科目A",
          isGmvDenominator: false,
        },
        amount: 5,
      }),
      createNormalizedRow({
        rowKey: "D001::9801::2026-02::着地見込::実績",
        account: {
          code: "9801",
          externalCode: "EXT-9801",
          name: "集計不要",
          type: "費用",
          aggregateName: "集計不要",
          detailName: "営業利益",
          hierarchyKey: "集計不要::営業利益",
          isGmvDenominator: false,
        },
        amount: 50,
      }),
    ];

    expect(selectTrendSeries(rows, "9800", "D001", "着地見込", "2026-02")).toEqual({
      accountCode: "9800",
      accountName: "未割当",
      departmentCode: "D001",
      periodType: "着地見込",
      points: [{ yearMonth: "2026-02", amount: 5, type: "actual" }],
    });
  });

  test("difference output excludes 集計不要 rows", () => {
    const comparisonData = [
      createComparisonRow({
        rowKey: "comparison::D001::4101::2026-02::着地見込",
        periodType: "着地見込",
        accountName: "SaaS利用料売上",
        BA: 4,
      }),
      createComparisonRow({
        rowKey: "comparison::D001::9999::2026-02::着地見込",
        periodType: "着地見込",
        accountName: "集計不要",
        BA: 100,
      }),
    ];

    expect(selectDifferenceData(comparisonData, "事業部", "D001", "着地見込")).toEqual({
      periodType: "着地見込",
      targetAccountCode: null,
      items: [{ label: "SaaS利用料売上", value: 4, absoluteValue: 4, isPositive: true }],
    });
  });
});
