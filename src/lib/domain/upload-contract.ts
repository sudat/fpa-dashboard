import { z } from "zod";

import { normalizeYearMonth } from "@/lib/loglass/schema";

import { generateScenarioLabel } from "./scenario-label";

const yearMonthPattern = /^\d{4}-\d{2}$/;
const scenarioLabelPattern = /^\d{4}\/\d{2}月(?:〜\d{4}\/\d{2}月)?(実績|予算|見込)(\(見込:\d{1,2}月~\))?$/;
const nonEmptyString = z.string().trim().min(1);

export const scenarioKindSchema = z.enum(["actual", "budget", "forecast"]);
export const scenarioFamilySchema = scenarioKindSchema;

export const scenarioInputSchema = z
  .object({
    kind: scenarioKindSchema,
    targetMonth: z.string().regex(yearMonthPattern),
    rangeStartMonth: z.string().regex(yearMonthPattern).optional(),
    rangeEndMonth: z.string().regex(yearMonthPattern).optional(),
    forecastStart: z.string().regex(yearMonthPattern).optional(),
  })
  .superRefine((value, ctx) => {
    const targetMonth = normalizeYearMonth(value.targetMonth);
    const hasRangeStart = value.rangeStartMonth != null;
    const hasRangeEnd = value.rangeEndMonth != null;
    const rangeStartMonth = normalizeYearMonth(value.rangeStartMonth ?? value.targetMonth);
    const rangeEndMonth = normalizeYearMonth(value.rangeEndMonth ?? value.targetMonth);
    const forecastStart = value.forecastStart ? normalizeYearMonth(value.forecastStart) : null;

    if (hasRangeStart !== hasRangeEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: hasRangeStart ? ["rangeEndMonth"] : ["rangeStartMonth"],
        message: "rangeStartMonth と rangeEndMonth は両方指定してください",
      });
    }

    if (rangeStartMonth > rangeEndMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rangeStartMonth"],
        message: "rangeStartMonth は rangeEndMonth 以下である必要があります",
      });
    }

    if (hasRangeEnd && rangeEndMonth !== targetMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rangeEndMonth"],
        message: "rangeEndMonth は targetMonth と一致している必要があります",
      });
    }

    if (forecastStart !== null && forecastStart <= targetMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["forecastStart"],
        message: "forecastStart は targetMonth より後である必要があります",
      });
    }
  });

export const scenarioLabelSchema = z.string().regex(scenarioLabelPattern);

export const replacementIdentitySchema = z.object({
  generatedLabel: scenarioLabelSchema,
  scenarioFamily: scenarioFamilySchema,
  rangeStartMonth: z.string().regex(yearMonthPattern).optional(),
  rangeEndMonth: z.string().regex(yearMonthPattern).optional(),
  forecastStart: z.string().regex(yearMonthPattern).optional(),
  identityKey: nonEmptyString.optional(),
});

export const uploadMetadataSchema = z.object({
  uploadId: nonEmptyString,
  timestamp: z.string().datetime({ offset: true }),
  uploader: nonEmptyString,
  scenarioInput: scenarioInputSchema,
  generatedLabel: scenarioLabelSchema,
  replacementIdentity: replacementIdentitySchema,
  fileName: nonEmptyString,
});

export const replacementWarningSchema = z.object({
  existingUploadId: nonEmptyString,
  generatedLabel: scenarioLabelSchema,
  scenarioFamily: scenarioFamilySchema,
  message: nonEmptyString,
});

export type ScenarioKind = z.infer<typeof scenarioKindSchema>;
export type ScenarioFamily = z.infer<typeof scenarioFamilySchema>;
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type ScenarioLabel = z.infer<typeof scenarioLabelSchema>;
export type ReplacementIdentity = z.infer<typeof replacementIdentitySchema>;
export type UploadMetadata = z.infer<typeof uploadMetadataSchema>;
export type ReplacementWarning = z.infer<typeof replacementWarningSchema>;
export type NormalizedScenarioInput = {
  kind: ScenarioKind;
  targetMonth: string;
  rangeStartMonth: string;
  rangeEndMonth: string;
  forecastStart?: string;
};
export type ABCResolution = {
  A: UploadMetadata | null;
  B: UploadMetadata | null;
  C: UploadMetadata | null;
};

export function normalizeScenarioInput(input: ScenarioInput): NormalizedScenarioInput {
  const parsed = scenarioInputSchema.parse(input);

  return {
    kind: parsed.kind,
    targetMonth: normalizeYearMonth(parsed.targetMonth),
    rangeStartMonth: normalizeYearMonth(parsed.rangeStartMonth ?? parsed.targetMonth),
    rangeEndMonth: normalizeYearMonth(parsed.rangeEndMonth ?? parsed.targetMonth),
    forecastStart: parsed.forecastStart ? normalizeYearMonth(parsed.forecastStart) : undefined,
  };
}

export function buildReplacementIdentityKey(input: ScenarioInput): string {
  const normalized = normalizeScenarioInput(input);

  return [
    normalized.kind,
    normalized.rangeStartMonth,
    normalized.rangeEndMonth,
    normalized.forecastStart ?? "",
  ].join("::");
}

export function buildReplacementIdentity(input: ScenarioInput): ReplacementIdentity {
  const scenarioInput = normalizeScenarioInput(input);

  return replacementIdentitySchema.parse({
    generatedLabel: generateScenarioLabel(scenarioInput),
    scenarioFamily: scenarioInput.kind,
    rangeStartMonth: scenarioInput.rangeStartMonth,
    rangeEndMonth: scenarioInput.rangeEndMonth,
    forecastStart: scenarioInput.forecastStart,
    identityKey: buildReplacementIdentityKey(scenarioInput),
  });
}

function getReplacementIdentityKey(upload: UploadMetadata): string {
  return upload.replacementIdentity.identityKey ?? buildReplacementIdentityKey(upload.scenarioInput);
}

export function computeReplacementIdentity(
  existingUploads: UploadMetadata[],
  newInput: ScenarioInput,
): ReplacementWarning | null {
  const parsedUploads = z.array(uploadMetadataSchema).parse(existingUploads);
  const replacementIdentity = buildReplacementIdentity(newInput);
  const matchedUpload = parsedUploads.find(
    (upload) =>
      getReplacementIdentityKey(upload) === replacementIdentity.identityKey &&
      upload.replacementIdentity.scenarioFamily === replacementIdentity.scenarioFamily,
  );

  if (!matchedUpload) {
    return null;
  }

  return replacementWarningSchema.parse({
    existingUploadId: matchedUpload.uploadId,
    generatedLabel: replacementIdentity.generatedLabel,
    scenarioFamily: replacementIdentity.scenarioFamily,
    message: "同じシナリオ種別・ラベルのアップロードが既に存在します。上書き確認が必要です。",
  });
}
