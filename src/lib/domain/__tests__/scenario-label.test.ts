import { describe, expect, test } from "vitest";

import type { UploadMetadata } from "../upload-contract";
import { scenarioLabelSchema } from "../upload-contract";
import { generateScenarioLabel, resolveABC } from "../scenario-label";

function createUploadMetadata(overrides: Partial<UploadMetadata> = {}): UploadMetadata {
  return {
    uploadId: "upload-1",
    timestamp: "2026-01-31T00:00:00.000Z",
    uploader: "fpa@example.com",
    fileName: "2026-01.xlsx",
    scenarioInput: {
      kind: "actual",
      targetMonth: "2026-01",
    },
    generatedLabel: "2026/01月実績",
    replacementIdentity: {
      generatedLabel: "2026/01月実績",
      scenarioFamily: "actual",
    },
    ...overrides,
  };
}

describe("scenario-label", () => {
  test("generateScenarioLabel returns 実績 label for actual target month", () => {
    expect(generateScenarioLabel({ kind: "actual", targetMonth: "2026-01" })).toBe("2026/01月実績");
  });

  test("generateScenarioLabel appends 見込 start for actual uploads with forecast metadata", () => {
    expect(
      generateScenarioLabel({
        kind: "actual",
        targetMonth: "2026-02",
        rangeStartMonth: "2025-04",
        rangeEndMonth: "2026-02",
        forecastStart: "2026-03",
      }),
    ).toBe("2025/04月〜2026/02月実績(見込:3月~)");
  });

  test("generateScenarioLabel returns 予算 label for budget target month", () => {
    expect(generateScenarioLabel({ kind: "budget", targetMonth: "2026-01" })).toBe("2026/01月予算");
  });

  test("generateScenarioLabel returns 見込 label for forecast target month", () => {
    expect(
      generateScenarioLabel({ kind: "forecast", targetMonth: "2026-01", forecastStart: "2026-02" }),
    ).toBe("2026/01月見込(見込:2月~)");
  });

  test("scenarioLabelSchema accepts both legacy and range-aware labels", () => {
    expect(scenarioLabelSchema.parse("2026/01月実績")).toBe("2026/01月実績");
    expect(
      scenarioLabelSchema.parse("2025/04月〜2026/02月実績(見込:3月~)"),
    ).toBe("2025/04月〜2026/02月実績(見込:3月~)");
  });

  test("resolveABC maps a single upload to B", () => {
    const upload = createUploadMetadata();

    expect(resolveABC([upload])).toEqual({
      A: null,
      B: upload,
      C: null,
    });
  });

  test("resolveABC maps newer upload to B and older upload to A", () => {
    const older = createUploadMetadata({
      uploadId: "upload-older",
      timestamp: "2026-01-15T00:00:00.000Z",
    });
    const newer = createUploadMetadata({
      uploadId: "upload-newer",
      timestamp: "2026-01-31T00:00:00.000Z",
    });

    expect(resolveABC([older, newer])).toEqual({
      A: older,
      B: newer,
      C: null,
    });
  });

  test("resolveABC maps prior-year baseline to C while keeping latest upload as B", () => {
    const priorYear = createUploadMetadata({
      uploadId: "upload-prior-year",
      timestamp: "2025-01-31T00:00:00.000Z",
      fileName: "2025-01.xlsx",
      scenarioInput: {
        kind: "actual",
        targetMonth: "2025-01",
      },
      generatedLabel: "2025/01月実績",
      replacementIdentity: {
        generatedLabel: "2025/01月実績",
        scenarioFamily: "actual",
      },
    });
    const previous = createUploadMetadata({
      uploadId: "upload-previous",
      timestamp: "2025-12-31T00:00:00.000Z",
      fileName: "2025-12.xlsx",
      scenarioInput: {
        kind: "actual",
        targetMonth: "2025-12",
      },
      generatedLabel: "2025/12月実績",
      replacementIdentity: {
        generatedLabel: "2025/12月実績",
        scenarioFamily: "actual",
      },
    });
    const latest = createUploadMetadata({
      uploadId: "upload-latest",
      timestamp: "2026-01-31T00:00:00.000Z",
      fileName: "2026-01.xlsx",
      scenarioInput: {
        kind: "actual",
        targetMonth: "2026-01",
      },
      generatedLabel: "2026/01月実績",
      replacementIdentity: {
        generatedLabel: "2026/01月実績",
        scenarioFamily: "actual",
      },
    });

    expect(resolveABC([priorYear, previous, latest])).toEqual({
      A: previous,
      B: latest,
      C: priorYear,
    });
  });
});
