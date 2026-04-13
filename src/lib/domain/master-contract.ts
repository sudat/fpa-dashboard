import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const accountBucketStatusSchema = z.enum(["normal", "unassigned", "excluded"]);
export const departmentBucketStatusSchema = z.enum(["normal", "unassigned"]);

export const bucketBehaviorSchema = z.object({
  key: nonEmptyString,
  label: nonEmptyString,
  warningOnSave: z.boolean(),
  autoAggregation: z.boolean(),
  includeInAnalysis: z.boolean(),
});

export const unassignedBucketSchema = bucketBehaviorSchema.extend({
  key: z.literal("unassigned"),
  label: z.literal("未割当"),
  warningOnSave: z.literal(true),
  autoAggregation: z.literal(true),
  includeInAnalysis: z.literal(true),
});

export const excludedBucketSchema = bucketBehaviorSchema.extend({
  key: z.literal("excluded"),
  label: z.literal("集計不要"),
  warningOnSave: z.literal(false),
  autoAggregation: z.literal(false),
  includeInAnalysis: z.literal(false),
});

export const accountMasterEntrySchema = z.object({
  detailAccountName: nonEmptyString,
  aggregateAccountName: nonEmptyString,
  sortOrder: z.number().int(),
  isGmv: z.boolean().default(false),
  bucketStatus: accountBucketStatusSchema.default("normal"),
});

export const departmentMasterEntrySchema = z.object({
  detailDepartmentName: nonEmptyString,
  businessUnitName: nonEmptyString,
  sortOrder: z.number().int(),
  bucketStatus: departmentBucketStatusSchema.default("normal"),
});

export type AccountBucketStatus = z.infer<typeof accountBucketStatusSchema>;
export type DepartmentBucketStatus = z.infer<typeof departmentBucketStatusSchema>;
export type BucketBehavior = z.infer<typeof bucketBehaviorSchema>;
export type UnassignedBucket = z.infer<typeof unassignedBucketSchema>;
export type ExcludedBucket = z.infer<typeof excludedBucketSchema>;
export type AccountMasterEntry = z.infer<typeof accountMasterEntrySchema>;
export type DepartmentMasterEntry = z.infer<typeof departmentMasterEntrySchema>;

export const UNASSIGNED_BUCKET: UnassignedBucket = {
  key: "unassigned",
  label: "未割当",
  warningOnSave: true,
  autoAggregation: true,
  includeInAnalysis: true,
};

export const EXCLUDED_BUCKET: ExcludedBucket = {
  key: "excluded",
  label: "集計不要",
  warningOnSave: false,
  autoAggregation: false,
  includeInAnalysis: false,
};
