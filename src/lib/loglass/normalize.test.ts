import { describe, expect, test } from "vitest";

import {
  buildNormalizedRowKey,
  createNormalizedPeriod,
  deriveMetricTypeFromScenario,
  normalizePrototypeCsvRow,
} from "./schema";

describe("loglass normalization helpers", () => {
  test("createNormalizedPeriod normalizes calendar month into fiscal month metadata", () => {
    expect(createNormalizedPeriod("2025/04/01", "YTD")).toEqual({
      fiscalYear: 2026,
      month: 4,
      yearMonth: "2025-04",
      periodType: "YTD",
    });

    expect(createNormalizedPeriod(new Date(2026, 1, 1), "単月")).toEqual({
      fiscalYear: 2026,
      month: 2,
      yearMonth: "2026-02",
      periodType: "単月",
    });
  });

  test("deriveMetricTypeFromScenario follows prototype scenario semantics", () => {
    expect(deriveMetricTypeFromScenario("実績")).toBe("実績");
    expect(deriveMetricTypeFromScenario("2026年度予算")).toBe("予算");
    expect(deriveMetricTypeFromScenario("26年3月期着地見込0224時点")).toBe("見込");
  });

  test("normalizePrototypeCsvRow maps prototype CSV columns into canonical raw contract", () => {
    const row = normalizePrototypeCsvRow({
      "計画・実績": "26年3月期着地見込0224時点",
      年月: "2026/02/01",
      ログラス科目コード: "4001",
      外部システム科目コード: "EXT-4001",
      科目: "SaaS利用料売上",
      科目タイプ: "収益",
      ログラス部署コード: "D001",
      外部システム部署コード: "EXT-D001",
      部署: "SaaS事業部",
      金額: 12500000,
    });

    expect(row).toEqual({
      対象年度: 2026,
      対象月: 2,
      シナリオ: "26年3月期着地見込0224時点",
      数値区分: "見込",
      年月度: "2026-02",
      部署コード: "D001",
      外部部署コード: "EXT-D001",
      部署名: "SaaS事業部",
      科目コード: "4001",
      外部科目コード: "EXT-4001",
      科目名: "SaaS利用料売上",
      集計科目名: "SaaS利用料売上",
      明細科目名: "SaaS利用料売上",
      科目タイプ: "収益",
      金額: 12500000,
    });
  });

  test("row key strategy stays unique across forecast snapshots", () => {
    const currentForecast = buildNormalizedRowKey({
      departmentCode: "D001",
      accountCode: "4001",
      yearMonth: "2026-02",
      periodType: "単月",
      metricType: "見込",
      scenarioKey: "26年3月期着地見込0224時点",
    });

    const priorForecast = buildNormalizedRowKey({
      departmentCode: "D001",
      accountCode: "4001",
      yearMonth: "2026-02",
      periodType: "単月",
      metricType: "見込",
      scenarioKey: "26年3月期着地見込0124時点",
    });

    expect(currentForecast).not.toBe(priorForecast);
    expect(String(currentForecast)).toContain("26年3月期着地見込0224時点");
  });
});
