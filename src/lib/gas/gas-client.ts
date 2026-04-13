import type {
  ScenarioFamily,
  ScenarioInput,
  UploadMetadata,
  ReplacementWarning,
} from "@/lib/domain/upload-contract";
import {
  uploadMetadataSchema,
  replacementWarningSchema,
  scenarioInputSchema,
} from "@/lib/domain/upload-contract";
import type {
  AccountMasterEntry,
  DepartmentMasterEntry,
} from "@/lib/domain/master-contract";
import {
  accountMasterEntrySchema,
  departmentMasterEntrySchema,
} from "@/lib/domain/master-contract";
import { z } from "zod";

// GAS google.script.run response shapes (matching gas/Code.js output)

export interface CurrentUser {
  email: string;
  name: string;
}

export interface UploadPreview {
  preview: {
    rawRowCount: number;
    departments: string[];
    accounts: string[];
  };
  replacementWarning: ReplacementWarning | null;
}

export interface AnalysisData {
  importData: Array<{
    scenarioKey: string;
    yearMonth: string;
    accountCode: string;
    extAccountCode: string;
    accountName: string;
    accountType: string;
    deptCode: string;
    extDeptCode: string;
    deptName: string;
    amount: number;
  }>;
  accountMaster: AccountMasterEntry[];
  departmentMaster: DepartmentMasterEntry[];
}

const currentUserSchema = z.object({
  email: z.string().min(1),
  name: z.string().min(1),
});

const importDataRowSchema = z.object({
  scenarioKey: z.string().min(1),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
  accountCode: z.string().min(1),
  extAccountCode: z.string(),
  accountName: z.string().min(1),
  accountType: z.string().min(1),
  deptCode: z.string().min(1),
  extDeptCode: z.string(),
  deptName: z.string().min(1),
  amount: z.number().finite(),
});

const analysisDataSchema = z.object({
  importData: z.array(importDataRowSchema),
  accountMaster: z.array(accountMasterEntrySchema),
  departmentMaster: z.array(departmentMasterEntrySchema),
});

const uploadPreviewSchema = z.object({
  preview: z.object({
    rawRowCount: z.number().int().nonnegative(),
    departments: z.array(z.string()),
    accounts: z.array(z.string()),
  }),
  replacementWarning: replacementWarningSchema.nullable(),
});

const uploadHistorySchema = z.array(uploadMetadataSchema);

// google.script.run adapter — wraps callback-based API into Promises

declare global {
  interface Window {
    google?: {
      script?: {
        run?: GasRunnerWithHandlers & {
          getCurrentUser: GasRunner<() => CurrentUser>;
          previewUpload: GasRunner<(workbookDataBase64: string, scenarioInput: ScenarioInput) => UploadPreview>;
          commitUpload: GasRunner<(workbookDataBase64: string, scenarioInput: ScenarioInput, confirmedReplacement: ReplacementWarning | null) => UploadMetadata>;
          getUploadHistory: GasRunner<() => UploadMetadata[]>;
          getAccountMaster: GasRunner<() => AccountMasterEntry[]>;
          saveAccountMaster: GasRunner<(entries: AccountMasterEntry[]) => void>;
          getDepartmentMaster: GasRunner<() => DepartmentMasterEntry[]>;
          saveDepartmentMaster: GasRunner<(entries: DepartmentMasterEntry[]) => void>;
          getAnalysisData: GasRunner<(scenarioFamily: ScenarioFamily, targetMonth: string) => AnalysisData>;
        };
      };
    };
  }
}

// GAS API: withSuccessHandler and withFailureHandler live on google.script.run itself,
// not on individual server functions. After chaining handlers, the resulting object
// exposes all server functions as plain callables.
// Correct usage: runner.withSuccessHandler(cb).withFailureHandler(cb).fnName(...args)
interface GasRunnerWithHandlers {
  withSuccessHandler(callback: (result: unknown) => void): GasRunnerBase;
  withFailureHandler(callback: (error: Error) => void): GasRunnerBase;
}

// After chaining, all server function names become callable properties
type GasRunnerBase = GasRunnerWithHandlers & Record<string, (...args: unknown[]) => void>;

type GasRunner<T extends (...args: never[]) => unknown> = {
  withSuccessHandler: (callback: (result: ReturnType<T>) => void) => GasRunnerBase;
  withFailureHandler: (callback: (error: Error) => void) => GasRunnerBase;
  (...args: Parameters<T>): void;
};

function runGas<R>(fnName: string, ...args: unknown[]): Promise<R> {
  return new Promise((resolve, reject) => {
    const runner = window.google?.script?.run;
    if (!runner) {
      reject(new GasClientError("google.script.run is not available"));
      return;
    }

    const gasFunction = (runner as unknown as Record<string, unknown>)[fnName];
    if (typeof gasFunction !== "function") {
      reject(new GasClientError(`Function "${fnName}" not found on google.script.run`));
      return;
    }

    // GAS API: withSuccessHandler/withFailureHandler live on google.script.run itself,
    // not on individual functions. Chain handlers on runner, then call the function by name.
    ((runner as unknown as GasRunnerWithHandlers)
      .withSuccessHandler((result) => resolve(result as R))
      .withFailureHandler((error) => reject(error)) as unknown as Record<string, (...a: unknown[]) => void>
    )[fnName](...args);
  });
}

export class GasClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GasClientError";
  }
}

export function isGasAvailable(): boolean {
  return typeof window !== "undefined" && !!window.google?.script?.run;
}

export const gasClient = {
  getCurrentUser(): Promise<CurrentUser> {
    return runGas<CurrentUser>("getCurrentUser").then((r) =>
      currentUserSchema.parse(r),
    );
  },

  previewUpload(workbookDataBase64: string, scenarioInput: ScenarioInput): Promise<UploadPreview> {
    const validated = scenarioInputSchema.parse(scenarioInput);
    return runGas<UploadPreview>("previewUpload", workbookDataBase64, validated).then((r) =>
      uploadPreviewSchema.parse(r),
    );
  },

  commitUpload(
    workbookDataBase64: string,
    scenarioInput: ScenarioInput,
    confirmedReplacement: ReplacementWarning | null,
  ): Promise<UploadMetadata> {
    const validated = scenarioInputSchema.parse(scenarioInput);
    return runGas<UploadMetadata>("commitUpload", workbookDataBase64, validated, confirmedReplacement).then((r) =>
      uploadMetadataSchema.parse(r),
    );
  },

  getUploadHistory(): Promise<UploadMetadata[]> {
    return runGas<UploadMetadata[]>("getUploadHistory").then((r) =>
      uploadHistorySchema.parse(r),
    );
  },

  getAccountMaster(): Promise<AccountMasterEntry[]> {
    return runGas<AccountMasterEntry[]>("getAccountMaster").then((r) =>
      z.array(accountMasterEntrySchema).parse(r),
    );
  },

  saveAccountMaster(entries: AccountMasterEntry[]): Promise<void> {
    const validated = z.array(accountMasterEntrySchema).parse(entries);
    return runGas<void>("saveAccountMaster", validated);
  },

  getDepartmentMaster(): Promise<DepartmentMasterEntry[]> {
    return runGas<DepartmentMasterEntry[]>("getDepartmentMaster").then((r) =>
      z.array(departmentMasterEntrySchema).parse(r),
    );
  },

  saveDepartmentMaster(entries: DepartmentMasterEntry[]): Promise<void> {
    const validated = z.array(departmentMasterEntrySchema).parse(entries);
    return runGas<void>("saveDepartmentMaster", validated);
  },

  getAnalysisData(scenarioFamily: ScenarioFamily, targetMonth: string): Promise<AnalysisData> {
    return runGas<AnalysisData>("getAnalysisData", scenarioFamily, targetMonth).then((r) =>
      analysisDataSchema.parse(r),
    );
  },
} as const;
