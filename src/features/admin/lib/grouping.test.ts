import { describe, expect, test } from "vitest";

import { loglassSmallRawFixture } from "@/lib/fixtures/loglass-small";
import { deriveMetricTypeFromScenario } from "@/lib/loglass/schema";

import { normalizeRawRows } from "./normalize-loglass";
import {
  aggregateByDepartment,
  buildAccountHierarchy,
  computeGmvRatio,
  getAggregateAccounts,
  getDetailAccounts,
  groupByAccount,
  groupByDepartment,
  groupByMetricType,
  groupByTimeAxis,
} from "./grouping";

describe("grouping helpers", () => {
  test("groupByDepartment groups normalized rows by department name", () => {
    const actualRows = normalizeRawRows(
      loglassSmallRawFixture.filter((row) => deriveMetricTypeFromScenario(row.シナリオ) === "実績"),
    );

    const grouped = groupByDepartment(actualRows);

    expect([...grouped.keys()]).toEqual(["SaaS事業部", "広告事業部"]);
    expect(grouped.get("SaaS事業部")).toHaveLength(12);
    expect(grouped.get("広告事業部")).toHaveLength(12);
  });

  test("groupByAccount and hierarchy helpers keep aggregate/detail relationships explicit", () => {
    const normalizedRows = normalizeRawRows(loglassSmallRawFixture);

    const groupedByAccount = groupByAccount(normalizedRows);

    expect(groupedByAccount.get("SaaS利用料売上")).toHaveLength(9);
    expect(getAggregateAccounts(normalizedRows)).toEqual(
      ["SaaS GMV", "SaaS利用料売上", "決済手数料", "広告 GMV", "広告宣伝費", "広告売上", "人件費", "配信原価"],
    );
    expect(buildAccountHierarchy(normalizedRows).get("SaaS利用料売上")).toEqual(["SaaS利用料売上"]);
    expect(getDetailAccounts(normalizedRows, "SaaS利用料売上").map((row) => row.account.detailName).sort()).toEqual(
      Array(9).fill("SaaS利用料売上"),
    );
  });

  test("groupByTimeAxis and groupByMetricType split rows into deterministic buckets", () => {
    const normalizedRows = normalizeRawRows(loglassSmallRawFixture);

    const byTimeAxis = groupByTimeAxis(normalizedRows);
    const byMetricType = groupByMetricType(normalizedRows);

    expect([...byTimeAxis.keys()]).toEqual(["単月", "YTD", "着地見込"]);
    expect(byTimeAxis.get("単月")).toHaveLength(loglassSmallRawFixture.length);
    expect(byMetricType.get("実績")).toHaveLength(24);
    expect(byMetricType.get("見込")).toHaveLength(24);
    expect(byMetricType.get("予算")).toHaveLength(24);
  });

  test("aggregateByDepartment creates 全社 rows by summing business unit rows", () => {
    const actualMonthlyRows = normalizeRawRows(
      loglassSmallRawFixture.filter((row) => deriveMetricTypeFromScenario(row.シナリオ) === "実績"),
    ).filter((row) => row.period.periodType === "単月");

    const aggregatedRows = aggregateByDepartment(actualMonthlyRows);
    const allCompanyRows = aggregatedRows.filter((row) => row.department.name === "全社");

    expect(allCompanyRows).toHaveLength(8);
    expect(
      allCompanyRows.find((row) => row.account.detailName === "SaaS利用料売上"),
    ).toMatchObject({ amount: 42_000_000 });
    expect(
      allCompanyRows.find((row) => row.account.detailName === "広告売上"),
    ).toMatchObject({ amount: 31_000_000 });
  });

  test("computeGmvRatio uses GMV rows as denominator and handles missing denominator safely", () => {
    const actualMonthlyRows = normalizeRawRows(
      loglassSmallRawFixture.filter((row) => deriveMetricTypeFromScenario(row.シナリオ) === "実績"),
    ).filter((row) => row.period.periodType === "単月");

    expect(computeGmvRatio(actualMonthlyRows, "SaaS利用料売上")).toEqual({
      numerator: 42_000_000,
      denominator: 213_000_000,
      ratio: 42_000_000 / 213_000_000,
    });
    expect(computeGmvRatio([], "SaaS利用料売上")).toEqual({
      numerator: 0,
      denominator: null,
      ratio: null,
    });
  });
});
