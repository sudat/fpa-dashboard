import type { ScenarioInput, UploadMetadata } from "../../upload-contract";
import { buildReplacementIdentity } from "../../upload-contract";
import { generateScenarioLabel } from "../../scenario-label";

/**
 * Factory function for creating deterministic UploadMetadata test fixtures.
 * Deep-merges overrides including nested scenarioInput and replacementIdentity.
 */
export function createUploadMetadata(overrides: Partial<UploadMetadata> = {}): UploadMetadata {
  const defaultScenarioInput: ScenarioInput = {
    kind: "actual",
    targetMonth: "2026-01",
  };
  const scenarioInput: ScenarioInput = {
    ...defaultScenarioInput,
    ...overrides.scenarioInput,
  };
  const generatedLabel = overrides.generatedLabel ?? generateScenarioLabel(scenarioInput);
  const replacementIdentity = {
    ...buildReplacementIdentity(scenarioInput),
    ...overrides.replacementIdentity,
  };
  const defaults: UploadMetadata = {
    uploadId: "upload-1",
    timestamp: "2026-01-31T00:00:00.000Z",
    uploader: "fpa@example.com",
    fileName: "2026-01.xlsx",
    scenarioInput,
    generatedLabel,
    replacementIdentity,
  };

  return {
    ...defaults,
    ...overrides,
    scenarioInput,
    generatedLabel,
    replacementIdentity,
  };
}

/**
 * Helper: builds an UploadMetadata from a ScenarioInput, deriving generatedLabel
 * and replacementIdentity via the real domain functions.
 */
export function buildUploadFromInput(
  input: ScenarioInput,
  overrides: Partial<Omit<UploadMetadata, "scenarioInput" | "generatedLabel" | "replacementIdentity">> = {},
): UploadMetadata {
  return createUploadMetadata({
    ...overrides,
    scenarioInput: input,
  });
}

export const janActualUpload: UploadMetadata = buildUploadFromInput(
  { kind: "actual", targetMonth: "2026-01" },
  { uploadId: "upload-jan-actual", timestamp: "2026-01-31T00:00:00.000Z", fileName: "2026-01.xlsx" },
);

export const febActualUpload: UploadMetadata = buildUploadFromInput(
  { kind: "actual", targetMonth: "2026-02" },
  { uploadId: "upload-feb-actual", timestamp: "2026-02-28T00:00:00.000Z", fileName: "2026-02.xlsx" },
);

export const priorYearActualUpload: UploadMetadata = buildUploadFromInput(
  { kind: "actual", targetMonth: "2025-01" },
  {
    uploadId: "upload-prior-year-actual",
    timestamp: "2025-01-31T00:00:00.000Z",
    fileName: "2025-01.xlsx",
  },
);

export const janBudgetUpload: UploadMetadata = buildUploadFromInput(
  { kind: "budget", targetMonth: "2026-01" },
  { uploadId: "upload-jan-budget", timestamp: "2026-01-15T00:00:00.000Z", fileName: "2026-01-budget.xlsx" },
);

export const janForecastUpload: UploadMetadata = buildUploadFromInput(
  { kind: "forecast", targetMonth: "2026-01", forecastStart: "2026-02" },
  {
    uploadId: "upload-jan-forecast",
    timestamp: "2026-01-20T00:00:00.000Z",
    fileName: "2026-01-forecast.xlsx",
  },
);

export const janActualDuplicateUpload: UploadMetadata = buildUploadFromInput(
  { kind: "actual", targetMonth: "2026-01" },
  {
    uploadId: "upload-jan-actual-v2",
    timestamp: "2026-02-15T00:00:00.000Z",
    fileName: "2026-01-v2.xlsx",
  },
);
