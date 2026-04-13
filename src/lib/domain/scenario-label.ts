import { normalizeYearMonth } from "@/lib/loglass/schema";

import type { ABCResolution, ScenarioFamily, ScenarioInput, UploadMetadata } from "./upload-contract";

const SCENARIO_KIND_LABEL: Record<ScenarioFamily, string> = {
  actual: "実績",
  budget: "予算",
  forecast: "見込",
};

export function generateScenarioLabel(input: ScenarioInput): string {
  const targetMonth = normalizeYearMonth(input.targetMonth);
  const hasRangeStart = input.rangeStartMonth != null;
  const hasRangeEnd = input.rangeEndMonth != null;
  const rangeStartMonth = normalizeYearMonth(input.rangeStartMonth ?? input.targetMonth);
  const rangeEndMonth = normalizeYearMonth(input.rangeEndMonth ?? input.targetMonth);
  const forecastStart = input.forecastStart ? normalizeYearMonth(input.forecastStart) : null;

  if (hasRangeStart !== hasRangeEnd) {
    throw new Error("rangeStartMonth と rangeEndMonth は両方指定してください");
  }

  if (rangeStartMonth > rangeEndMonth) {
    throw new Error("rangeStartMonth は rangeEndMonth 以下である必要があります");
  }

  if (hasRangeEnd && rangeEndMonth !== targetMonth) {
    throw new Error("rangeEndMonth は targetMonth と一致している必要があります");
  }

  if (forecastStart !== null && forecastStart <= targetMonth) {
    throw new Error("forecastStart は targetMonth より後である必要があります");
  }

  const label =
    rangeStartMonth === rangeEndMonth
      ? `${formatLabelMonth(targetMonth)}${SCENARIO_KIND_LABEL[input.kind]}`
      : `${formatLabelMonth(rangeStartMonth)}〜${formatLabelMonth(rangeEndMonth)}${SCENARIO_KIND_LABEL[input.kind]}`;

  if (forecastStart === null) {
    return label;
  }

  const [, forecastMonth] = forecastStart.split("-");
  return `${label}(見込:${Number(forecastMonth)}月~)`;
}

export function resolveABC(uploadHistory: UploadMetadata[]): ABCResolution {
  if (uploadHistory.length === 0) {
    return { A: null, B: null, C: null };
  }

  const sortedUploads = [...uploadHistory].sort(compareUploadTimestampDesc);
  const latestUpload = sortedUploads[0]!;
  const scenarioFamily = latestUpload.replacementIdentity.scenarioFamily;
  const sameFamilyUploads = sortedUploads.filter(
    (upload) => upload.replacementIdentity.scenarioFamily === scenarioFamily,
  );

  const priorYearTargetMonth = shiftYearMonth(latestUpload.scenarioInput.targetMonth, -1);

  return {
    A: sameFamilyUploads[1] ?? null,
    B: latestUpload,
    C:
      sameFamilyUploads.find(
        (upload) => normalizeYearMonth(upload.scenarioInput.targetMonth) === priorYearTargetMonth,
      ) ?? null,
  };
}

function compareUploadTimestampDesc(left: UploadMetadata, right: UploadMetadata): number {
  const timestampResult = Date.parse(right.timestamp) - Date.parse(left.timestamp);

  if (timestampResult !== 0) {
    return timestampResult;
  }

  return right.uploadId.localeCompare(left.uploadId, "ja");
}

function shiftYearMonth(yearMonth: string, yearDelta: number): string {
  const normalizedYearMonth = normalizeYearMonth(yearMonth);
  const [year, month] = normalizedYearMonth.split("-");
  return `${Number(year) + yearDelta}-${month}`;
}

function formatLabelMonth(yearMonth: string): string {
  const normalizedYearMonth = normalizeYearMonth(yearMonth);
  const [year, month] = normalizedYearMonth.split("-");
  return `${year}/${month}月`;
}
