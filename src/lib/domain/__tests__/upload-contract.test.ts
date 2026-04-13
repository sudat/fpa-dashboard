import { describe, expect, test } from "vitest";

import { computeReplacementIdentity } from "../upload-contract";

describe("upload-contract", () => {
  test("computeReplacementIdentity returns a warning when generated label matches", () => {
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

  test("computeReplacementIdentity returns null when generated label differs", () => {
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
          kind: "budget",
          targetMonth: "2026-01",
        },
      ),
    ).toBeNull();
  });
});
