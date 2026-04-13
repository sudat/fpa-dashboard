import { describe, expect, it } from "vitest";

import { loglessRawRowSchema } from "../schema";

describe("loglessRawRowSchema — 10-column xlsx alignment", () => {
  const validRow = {
    シナリオ: "実績",
    年月度: "2026-02",
    科目コード: "4110",
    外部科目コード: "",
    科目: "売上高",
    科目タイプ: "収益" as const,
    部署コード: "D001",
    外部部署コード: "",
    部署: "SaaS事業部",
    金額: 1000000,
  };

  it("accepts valid 10-col row", () => {
    expect(loglessRawRowSchema.parse(validRow)).toEqual(
      expect.objectContaining({ 科目: "売上高", 部署: "SaaS事業部" }),
    );
  });

  it("strips phantom column 対象年度", () => {
    const row = { ...validRow, 対象年度: 2026 };
    const result = loglessRawRowSchema.safeParse(row);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).not.toHaveProperty("対象年度");
    }
  });

  it("strips phantom column 集計科目名", () => {
    const row = { ...validRow, 集計科目名: "売上高" };
    const result = loglessRawRowSchema.safeParse(row);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).not.toHaveProperty("集計科目名");
    }
  });

  it("rejects row missing required field 科目", () => {
    const { 科目, ...rowWithout科目 } = validRow;
    const result = loglessRawRowSchema.safeParse(rowWithout科目);

    expect(result.success).toBe(false);
  });

  it("rejects row missing required field 部署", () => {
    const { 部署, ...rowWithout部署 } = validRow;
    const result = loglessRawRowSchema.safeParse(rowWithout部署);

    expect(result.success).toBe(false);
  });

  it("rejects blank 科目コード", () => {
    const result = loglessRawRowSchema.safeParse({ ...validRow, 科目コード: "   " });

    expect(result.success).toBe(false);
  });

  it("rejects blank 部署コード", () => {
    const result = loglessRawRowSchema.safeParse({ ...validRow, 部署コード: "   " });

    expect(result.success).toBe(false);
  });

  it("accepts row without optional 外部科目コード and defaults it to empty", () => {
    const { 外部科目コード, ...rowWithout外部 } = validRow;
    const result = loglessRawRowSchema.parse(rowWithout外部);

    expect(result.外部科目コード).toBe("");
  });
});
