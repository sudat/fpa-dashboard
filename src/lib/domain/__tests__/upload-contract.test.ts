import { describe, expect, test } from "vitest";

import { buildReplacementIdentity, computeReplacementIdentity, uploadMetadataSchema } from "../upload-contract";

describe("upload-contract", () => {
  test("computeReplacementIdentity keeps matching legacy single-month uploads", () => {
    const warning = computeReplacementIdentity(
      [
        {
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
        },
      ],
      {
        kind: "actual",
        targetMonth: "2026-01",
      },
    );

    expect(warning).toEqual({
      existingUploadId: "upload-1",
      generatedLabel: "2026/01月実績",
      scenarioFamily: "actual",
      message: "同じシナリオ種別・ラベルのアップロードが既に存在します。上書き確認が必要です。",
      });
  });

  test("buildReplacementIdentity uses explicit range metadata for the replacement key", () => {
    expect(
      buildReplacementIdentity({
        kind: "actual",
        targetMonth: "2026-02",
        rangeStartMonth: "2025-04",
        rangeEndMonth: "2026-02",
        forecastStart: "2026-03",
      }),
    ).toEqual({
      generatedLabel: "2025/04月〜2026/02月実績(見込:3月~)",
      scenarioFamily: "actual",
      rangeStartMonth: "2025-04",
      rangeEndMonth: "2026-02",
      forecastStart: "2026-03",
      identityKey: "actual::2025-04::2026-02::2026-03",
    });
  });

  test("uploadMetadataSchema accepts range-aware history rows", () => {
    expect(
      uploadMetadataSchema.parse({
        uploadId: "upload-range",
        timestamp: "2026-02-15T00:00:00.000Z",
        uploader: "fpa@example.com",
        fileName: "range.xlsx",
        scenarioInput: {
          kind: "actual",
          targetMonth: "2026-02",
          rangeStartMonth: "2025-04",
          rangeEndMonth: "2026-02",
          forecastStart: "2026-03",
        },
        generatedLabel: "2025/04月〜2026/02月実績(見込:3月~)",
        replacementIdentity: {
          generatedLabel: "2025/04月〜2026/02月実績(見込:3月~)",
          scenarioFamily: "actual",
          rangeStartMonth: "2025-04",
          rangeEndMonth: "2026-02",
          forecastStart: "2026-03",
          identityKey: "actual::2025-04::2026-02::2026-03",
        },
      }),
    ).toMatchObject({
      generatedLabel: "2025/04月〜2026/02月実績(見込:3月~)",
      replacementIdentity: {
        identityKey: "actual::2025-04::2026-02::2026-03",
      },
    });
  });

  test("computeReplacementIdentity returns null when the uploaded range differs", () => {
    expect(
      computeReplacementIdentity(
        [
          {
            uploadId: "upload-1",
            timestamp: "2026-01-31T00:00:00.000Z",
            uploader: "fpa@example.com",
            fileName: "2026-01.xlsx",
            scenarioInput: {
              kind: "actual",
              targetMonth: "2026-02",
              rangeStartMonth: "2025-04",
              rangeEndMonth: "2026-02",
            },
            generatedLabel: "2025/04月〜2026/02月実績",
            replacementIdentity: {
              generatedLabel: "2025/04月〜2026/02月実績",
              scenarioFamily: "actual",
              rangeStartMonth: "2025-04",
              rangeEndMonth: "2026-02",
              identityKey: "actual::2025-04::2026-02::",
            },
          },
        ],
        {
          kind: "actual",
          targetMonth: "2026-01",
          rangeStartMonth: "2025-05",
          rangeEndMonth: "2026-01",
        },
      ),
    ).toBeNull();
  });
});
