import { describe, expect, test } from "vitest";

import { computeReplacementIdentity } from "../upload-contract";

import {
  febActualUpload,
  janActualUpload,
  janBudgetUpload,
  janForecastUpload,
} from "./fixtures/upload-metadata-fixtures";

describe("computeReplacementIdentity", () => {
  test("same generated label + same scenarioFamily returns warning", () => {
    const warning = computeReplacementIdentity([janActualUpload], {
      kind: "actual",
      targetMonth: "2026-01",
    });

    expect(warning).not.toBeNull();
    expect(warning!.existingUploadId).toBe("upload-jan-actual");
    expect(warning!.generatedLabel).toBe("2026/01月実績");
    expect(warning!.scenarioFamily).toBe("actual");
    expect(warning!.message).toBe("同じシナリオ種別・ラベルのアップロードが既に存在します。上書き確認が必要です。");
  });

  test("same generated label + different scenarioFamily returns no warning", () => {
    const warning = computeReplacementIdentity([janActualUpload], {
      kind: "budget",
      targetMonth: "2026-01",
    });

    expect(warning).toBeNull();
  });

  test("different label returns no warning", () => {
    const warning = computeReplacementIdentity([janActualUpload], {
      kind: "actual",
      targetMonth: "2026-02",
    });

    expect(warning).toBeNull();
  });

  test("multiple existing uploads, one matches returns warning for matching one", () => {
    const warning = computeReplacementIdentity([janActualUpload, febActualUpload, janBudgetUpload], {
      kind: "budget",
      targetMonth: "2026-01",
    });

    expect(warning).not.toBeNull();
    expect(warning!.existingUploadId).toBe("upload-jan-budget");
    expect(warning!.scenarioFamily).toBe("budget");
  });

  test("no existing uploads returns no warning", () => {
    const warning = computeReplacementIdentity([], {
      kind: "actual",
      targetMonth: "2026-01",
    });

    expect(warning).toBeNull();
  });

  test("overwrite warning only for same scenarioFamily, not across families", () => {
    const warning = computeReplacementIdentity([janForecastUpload], {
      kind: "actual",
      targetMonth: "2026-01",
    });

    expect(warning).toBeNull();
  });

  test("forecast with forecastStart matches same forecast identity", () => {
    const warning = computeReplacementIdentity([janForecastUpload], {
      kind: "forecast",
      targetMonth: "2026-01",
      forecastStart: "2026-02",
    });

    expect(warning).not.toBeNull();
    expect(warning!.existingUploadId).toBe("upload-jan-forecast");
    expect(warning!.scenarioFamily).toBe("forecast");
  });

  test("forecast without forecastStart does not match forecast with forecastStart", () => {
    const plainActual = { kind: "actual" as const, targetMonth: "2026-01" };
    const warning = computeReplacementIdentity([janForecastUpload], plainActual);

    expect(warning).toBeNull();
  });
});
