import { z } from "zod";

import { normalizeYearMonth } from "@/lib/loglass/schema";

import { generateScenarioLabel } from "./scenario-label";

const yearMonthPattern = /^\d{4}-\d{2}$/;
const scenarioLabelPattern = /^\d{4}\/\d{2}月(実績|予算|見込)(\(見込:\d{1,2}月~\))?$/;
const nonEmptyString = z.string().trim().min(1);

export const scenarioKindSchema = z.enum(["actual", "budget", "forecast"]);
export const scenarioFamilySchema = scenarioKindSchema;

export const scenarioInputSchema = z
  .object({
    kind: scenarioKindSchema,
    targetMonth: z.string().regex(yearMonthPattern),
    forecastStart: z.string().regex(yearMonthPattern).optional(),
  })
  .superRefine((value, ctx) => {
    const targetMonth = normalizeYearMonth(value.targetMonth);
    const forecastStart = value.forecastStart ? normalizeYearMonth(value.forecastStart) : null;

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
export type ABCResolution = {
  A: UploadMetadata | null;
  B: UploadMetadata | null;
  C: UploadMetadata | null;
};

export function buildReplacementIdentity(input: ScenarioInput): ReplacementIdentity {
  const scenarioInput = scenarioInputSchema.parse(input);

  return replacementIdentitySchema.parse({
    generatedLabel: generateScenarioLabel(scenarioInput),
    scenarioFamily: scenarioInput.kind,
  });
}

export function computeReplacementIdentity(
  existingUploads: UploadMetadata[],
  newInput: ScenarioInput,
): ReplacementWarning | null {
  const parsedUploads = z.array(uploadMetadataSchema).parse(existingUploads);
  const replacementIdentity = buildReplacementIdentity(newInput);
  const matchedUpload = parsedUploads.find(
    (upload) =>
      upload.replacementIdentity.generatedLabel === replacementIdentity.generatedLabel &&
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
