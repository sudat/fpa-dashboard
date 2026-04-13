import { EXCLUDED_BUCKET, UNASSIGNED_BUCKET } from "@/lib/domain/master-contract";
import type { MappedAccount } from "@/lib/domain/master-schema";

type AccountLike = {
  name?: string;
  aggregateName?: string;
  detailName?: string;
  hierarchyKey?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readLabels(item: unknown): string[] {
  if (!isRecord(item)) {
    return [];
  }

  const labels: string[] = [];
  const directKeys = ["accountName", "aggregateName", "detailAccountName"] as const;

  directKeys.forEach((key) => {
    const value = item[key];

    if (typeof value === "string") {
      labels.push(value);
    }
  });

  if (isRecord(item.account)) {
    const account = item.account as AccountLike;

    if (typeof account.name === "string") {
      labels.push(account.name);
    }

    if (typeof account.aggregateName === "string") {
      labels.push(account.aggregateName);
    }

    if (typeof account.detailName === "string") {
      labels.push(account.detailName);
    }
  }

  return labels;
}

function readAccountMapping(item: unknown): MappedAccount | undefined {
  if (!isRecord(item) || !isRecord(item.accountMapping)) {
    return undefined;
  }

  return item.accountMapping as MappedAccount;
}

function isExcludedItem(item: unknown): boolean {
  const accountMapping = readAccountMapping(item);

  if (accountMapping?.includeInAnalysis === false || accountMapping?.bucketStatus === "excluded") {
    return true;
  }

  return readLabels(item).includes(EXCLUDED_BUCKET.label);
}

function isUnassignedItem(item: unknown): boolean {
  const accountMapping = readAccountMapping(item);

  if (accountMapping?.bucketStatus === "unassigned") {
    return true;
  }

  return readLabels(item).includes(UNASSIGNED_BUCKET.label);
}

function normalizeUnassignedMapping(accountMapping: MappedAccount): MappedAccount {
  return {
    ...accountMapping,
    detailAccountName: UNASSIGNED_BUCKET.label,
    aggregateAccountName: UNASSIGNED_BUCKET.label,
    bucketStatus: "unassigned",
    bucketLabel: UNASSIGNED_BUCKET.label,
    warningOnSave: UNASSIGNED_BUCKET.warningOnSave,
    autoAggregation: UNASSIGNED_BUCKET.autoAggregation,
    includeInAnalysis: UNASSIGNED_BUCKET.includeInAnalysis,
  };
}

function normalizeUnassignedItem<T>(item: T): T {
  if (!isRecord(item)) {
    return item;
  }

  const nextItem = { ...item } as Record<string, unknown>;
  const accountMapping = readAccountMapping(item);

  if (accountMapping) {
    nextItem.accountMapping = normalizeUnassignedMapping(accountMapping);
  }

  if (typeof nextItem.accountName === "string") {
    nextItem.accountName = UNASSIGNED_BUCKET.label;
  }

  if (typeof nextItem.aggregateName === "string") {
    nextItem.aggregateName = UNASSIGNED_BUCKET.label;
  }

  if (typeof nextItem.detailAccountName === "string") {
    nextItem.detailAccountName = UNASSIGNED_BUCKET.label;
  }

  if (isRecord(nextItem.account)) {
    const account = nextItem.account as AccountLike;

    nextItem.account = {
      ...account,
      name: UNASSIGNED_BUCKET.label,
      aggregateName: UNASSIGNED_BUCKET.label,
      detailName: UNASSIGNED_BUCKET.label,
      hierarchyKey: `${UNASSIGNED_BUCKET.label}::${UNASSIGNED_BUCKET.label}`,
    };
  }

  return nextItem as T;
}

export function filterExcludedFromAnalysis<T>(items: T[]): T[] {
  return items.filter((item) => !isExcludedItem(item));
}

export function aggregateUnassigned<T>(items: T[]): T[] {
  return items.map((item) => (isUnassignedItem(item) ? normalizeUnassignedItem(item) : item));
}

export function applyBucketFilter<T>(items: T[]): T[] {
  return aggregateUnassigned(filterExcludedFromAnalysis(items));
}
