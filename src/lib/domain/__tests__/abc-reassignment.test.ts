import { describe, expect, test } from "vitest";

import { resolveABC } from "../scenario-label";

import {
  buildUploadFromInput,
  createUploadMetadata,
  febActualUpload,
  janActualUpload,
  janActualDuplicateUpload,
  janBudgetUpload,
  janForecastUpload,
  priorYearActualUpload,
} from "./fixtures/upload-metadata-fixtures";

describe("resolveABC", () => {
  test("single upload maps to B, A and C are null", () => {
    const result = resolveABC([janActualUpload]);

    expect(result.B).toBe(janActualUpload);
    expect(result.A).toBeNull();
    expect(result.C).toBeNull();
  });

  test("empty history returns all null", () => {
    expect(resolveABC([])).toEqual({ A: null, B: null, C: null });
  });

  test("two consecutive months: newer is B, older becomes A", () => {
    const result = resolveABC([janActualUpload, febActualUpload]);

    expect(result.B).toBe(febActualUpload);
    expect(result.A).toBe(janActualUpload);
    expect(result.C).toBeNull();
  });

  test("three uploads including prior year: latest=B, previous=A, prior-year=C", () => {
    const priorYearFeb = buildUploadFromInput(
      { kind: "actual", targetMonth: "2025-02" },
      { uploadId: "upload-2025-02", timestamp: "2025-02-28T00:00:00.000Z", fileName: "2025-02.xlsx" },
    );
    const previous = buildUploadFromInput(
      { kind: "actual", targetMonth: "2026-01" },
      { uploadId: "upload-prev", timestamp: "2026-01-31T00:00:00.000Z", fileName: "2026-01.xlsx" },
    );

    const result = resolveABC([priorYearFeb, previous, febActualUpload]);

    expect(result.B).toBe(febActualUpload);
    expect(result.A).toBe(previous);
    expect(result.C).toBe(priorYearFeb);
  });

  test("C targets prior-year same month as B, not just any prior-year upload", () => {
    const priorYearFeb = buildUploadFromInput(
      { kind: "actual", targetMonth: "2025-02" },
      { uploadId: "upload-2025-02", timestamp: "2025-02-28T00:00:00.000Z" },
    );
    const priorYearMar = buildUploadFromInput(
      { kind: "actual", targetMonth: "2025-03" },
      { uploadId: "upload-2025-03", timestamp: "2025-03-31T00:00:00.000Z" },
    );

    const result = resolveABC([priorYearFeb, priorYearMar, febActualUpload]);

    expect(result.B).toBe(febActualUpload);
    expect(result.C).toBe(priorYearFeb);
    expect(result.C?.uploadId).toBe("upload-2025-02");
  });

  test("mixed families: actual uploads resolve independently from budget uploads", () => {
    const result = resolveABC([janActualUpload, janBudgetUpload]);

    expect(result.B).toBe(janActualUpload);
    expect(result.A).toBeNull();
    expect(result.C).toBeNull();
  });

  test("mixed families: budget and forecast are separate families", () => {
    const result = resolveABC([janBudgetUpload, janForecastUpload]);

    expect(result.B).toBe(janForecastUpload);
    expect(result.A).toBeNull();
    expect(result.C).toBeNull();
  });

  test("same-month two uploads (overwrite): latest is B, older same-month becomes A", () => {
    const result = resolveABC([janActualUpload, janActualDuplicateUpload]);

    expect(result.B).toBe(janActualDuplicateUpload);
    expect(result.B?.uploadId).toBe("upload-jan-actual-v2");
    expect(result.A).toBe(janActualUpload);
    expect(result.C).toBeNull();
  });

  test("same-month duplicate plus different month: B is latest, A is other same-family", () => {
    const result = resolveABC([janActualUpload, janActualDuplicateUpload, febActualUpload]);

    expect(result.B).toBe(febActualUpload);
    expect(result.A).toBe(janActualDuplicateUpload);
    expect(result.C).toBeNull();
  });

  test("three same-family uploads with prior-year: C picks prior-year baseline", () => {
    const previous = buildUploadFromInput(
      { kind: "actual", targetMonth: "2025-12" },
      { uploadId: "upload-prev", timestamp: "2025-12-31T00:00:00.000Z" },
    );

    const result = resolveABC([priorYearActualUpload, previous, janActualUpload]);

    expect(result.B).toBe(janActualUpload);
    expect(result.A).toBe(previous);
    expect(result.C).toBe(priorYearActualUpload);
  });

  test("only prior-year uploads with no current-year: B is latest prior-year, no C", () => {
    const old = buildUploadFromInput(
      { kind: "actual", targetMonth: "2024-06" },
      { uploadId: "upload-2024-06", timestamp: "2024-06-30T00:00:00.000Z" },
    );

    const result = resolveABC([old, priorYearActualUpload]);

    expect(result.B).toBe(priorYearActualUpload);
    expect(result.A).toBe(old);
    expect(result.C).toBeNull();
  });

  test("unsorted input is handled correctly (sorted by timestamp desc internally)", () => {
    const result = resolveABC([febActualUpload, janActualUpload]);

    expect(result.B).toBe(febActualUpload);
    expect(result.A).toBe(janActualUpload);
  });

  test("A is second same-family upload after sorting, not second chronologically", () => {
    const budgetJan = createUploadMetadata({
      uploadId: "budget-jan",
      timestamp: "2026-01-15T00:00:00.000Z",
      scenarioInput: { kind: "budget", targetMonth: "2026-01" },
      generatedLabel: "2026/01月予算",
      replacementIdentity: { generatedLabel: "2026/01月予算", scenarioFamily: "budget" },
    });
    const budgetFeb = createUploadMetadata({
      uploadId: "budget-feb",
      timestamp: "2026-02-15T00:00:00.000Z",
      scenarioInput: { kind: "budget", targetMonth: "2026-02" },
      generatedLabel: "2026/02月予算",
      replacementIdentity: { generatedLabel: "2026/02月予算", scenarioFamily: "budget" },
    });

    const result = resolveABC([janActualUpload, budgetJan, budgetFeb]);

    expect(result.B).toBe(budgetFeb);
    expect(result.A).toBe(budgetJan);
  });
});
