import type { z } from "zod";

import type {
  accountTypeSchema,
  comparisonColumnSchema,
  departmentScopeSchema,
  loglassNormalizedRowArraySchema,
  loglassNormalizedRowSchema,
  loglassRawRowArraySchema,
  loglassRawRowSchema,
  loglessRawRowSchema,
  metricTypeSchema,
  normalizedAccountSchema,
  normalizedDepartmentSchema,
  normalizedPeriodSchema,
  normalizedRowKeySchema,
  periodTypeSchema,
  prototypeLoglassCsvRowSchema,
} from "./schema";

export type PrototypeLoglassCsvRow = z.infer<typeof prototypeLoglassCsvRowSchema>;
export type LoglessRawRow = z.infer<typeof loglessRawRowSchema>;
export type LoglassRawRow = z.infer<typeof loglassRawRowSchema>;
export type LoglassRawRowList = z.infer<typeof loglassRawRowArraySchema>;

export type LoglassMetricType = z.infer<typeof metricTypeSchema>;
export type LoglassAccountType = z.infer<typeof accountTypeSchema>;
export type LoglassPeriodType = z.infer<typeof periodTypeSchema>;
export type LoglassComparisonColumn = z.infer<typeof comparisonColumnSchema>;
export type LoglassDepartmentScope = z.infer<typeof departmentScopeSchema>;
export type NormalizedRowKey = z.infer<typeof normalizedRowKeySchema>;

export type LoglassNormalizedPeriod = z.infer<typeof normalizedPeriodSchema>;
export type LoglassNormalizedDepartment = z.infer<typeof normalizedDepartmentSchema>;
export type LoglassNormalizedAccount = z.infer<typeof normalizedAccountSchema>;
export type LoglassNormalizedRow = z.infer<typeof loglassNormalizedRowSchema>;
export type LoglassNormalizedRowList = z.infer<typeof loglassNormalizedRowArraySchema>;
