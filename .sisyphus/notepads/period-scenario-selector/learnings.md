## 2026-04-13 Session Start

### Project: FPA Dashboard (React + TypeScript + Vite + GAS)
### Plan: period-scenario-selector

### Key Files
- State: `src/features/analysis/state/use-analysis-state.ts`
- Data hook: `src/features/analysis/hooks/use-analysis-data.ts`
- Resolver: `src/features/analysis/lib/comparison-resolver.ts`
- Header: `src/features/layout/components/analysis-header.tsx`
- AppShell: `src/features/layout/components/app-shell.tsx`
- Workspace: `src/features/analysis/components/analysis-workspace.tsx` (line 172 has hardcoded "2026-02")
- GAS Upload: `gas/lib/upload.js`
- GAS History: `gas/lib/history.js`
- Upload form: `src/features/admin/components/scenario-input-form.tsx`
- Upload flow: `src/features/admin/hooks/use-upload-flow.ts`

### Conventions
- Reducer pattern in use-analysis-state.ts (action types + useCallback creators)
- shadcn/ui components in src/components/ui/
- GAS backend in gas/lib/ (var declarations, no ES modules)
- Test framework: vitest
- Build: `bun run build`
- Tests: `bun test`

### 2026-04-13 Task 4 Learnings
- `scripts/build-gas.ts` automatically copies every `gas/lib/*.js` file into `gas-dist/lib/`, so adding `gas/lib/detect.js` does not require a `gas/Code.js` export change.
- `Upload._normalizePeriod()` is reusable from other GAS modules and safely normalizes both `Date` values and `YYYY/MM/DD`-style strings into `YYYY-MM`.
- Scenario auto-detection can be derived from unique `(scenarioKey, yearMonth)` pairs first, then summarized per `scenarioKey` to compute `monthCount`, `rowCount`, `targetMonth`, and forecast `forecastStart`.

### 2026-04-13 Task 2 Learnings (AnalysisState extension)

- **TDD pattern**: RED→GREEN→REFACTOR worked cleanly. 7 new tests written first, all failed, then implementation made all 16 pass.
- **RESET_SELECTIONS trick**: Using `{ ...DEFAULT_STATE, activeOrgTab: state.activeOrgTab, activeTimeAxis: state.activeTimeAxis }` means new fields added to `DEFAULT_STATE` are automatically reset — no extra reducer logic needed.
- **SET_TARGET_MONTH side-effect**: Resets `selectedA/B/C` to `null` in the same reducer case to trigger re-resolution downstream.
- **Test runner**: Must use `bun run test` (which calls `vitest run`), NOT `bun test` (Bun's native runner which doesn't support `vi.useFakeTimers`).
- **Reducer field count**: `AnalysisState` now has 10 fields, `AnalysisAction` has 12 action types, `AnalysisActions` has 11 methods.

### 2026-04-13 Task 5 Learnings (per-upload sheet storage)

- `Upload.commitUpload()` can switch from row append to tab-level persistence with **KISS** by generating `upload_{uploadId}` first, deleting the conflicted tab before replacement, then copying the converted XLSX sheet into the active spreadsheet.
- Keeping `sheetName` in `UploadHistory` avoids guessing replacement targets later; legacy rows can still fall back to `upload_{uploadId}` for backward compatibility.
- `previewUpload()` can stay unchanged if `_parseXlsx()` accepts an optional persistence target and only keeps the converted sheet in commit flow.

### 2026-04-13 Task 9 Learnings (Filter Bar Components)

- **base-ui Select API** (`@base-ui/react` v1.3.0): NOT Radix. Uses `Select.Root` with `value` + `onValueChange` props. `SelectItem` requires string `value` prop. For nullable values, use a sentinel string marker (e.g. `"__auto__"`) and convert in onChange callback.
- **base-ui Popover API**: `Popover` wraps `PopoverPrimitive.Root` with `open` + `onOpenChange`. `PopoverTrigger` uses `render` prop pattern (not children) to render the trigger element.
- **Calendar month-picker mode**: react-day-picker supports `captionLayout="dropdown"` for year/month dropdown navigation. Combined with `mode="single"`, it allows month-level selection while showing a full calendar.
- **Date formatting without date-fns**: Native `Date.getFullYear()`, `Date.getMonth()` + `String.padStart()` is sufficient for YYYY-MM formatting. No external library needed.
- **ORG_TABS updated**: Now includes 10 tabs (フィンテック事業部, インフラ事業部, データ事業部, グローバル事業部, 新規事業部 added). Exported as `const` array with `OrgTab` type.
- **Component pattern**: Named exports, typed interface props, Tailwind styling, same callback pattern as time-axis-pills.tsx. No default exports.

### 2026-04-13 Task 6 Learnings (getAnalysisData per-upload sheets)

- `History.getUploadHistory()` already exposes `replacementIdentity.scenarioFamily` plus `sheetName`, so `getAnalysisData()` can stay **KISS** by filtering history first, then concatenating rows from only matching upload tabs.
- Keeping the legacy row-level scenario classification (`実績` / `予算|計画` / other = forecast) inside `getAnalysisData()` preserves the old ImportData behavior even if a stored upload sheet contains unexpected mixed scenario labels.
- `bun run build` does not refresh `gas-dist/`; `bun run build:gas` is what copies updated `gas/lib/*.js` into `gas-dist/lib/`.

### 2026-04-13 Task 10 Learnings (Scenario auto-detect form)

- **DetectedScenario type**: Defined in `use-upload-flow.ts` (not upload-contract.ts) since gas-client.ts is outside admin feature scope. Type: `{ kind: ScenarioKind, targetMonth: string, monthCount: number, rowCount: number }`.
- **Auto-preview on selectFile**: `selectFile()` now triggers auto-preview immediately after reading base64, using a default `ScenarioInput` (`{kind: "actual", targetMonth: currentMonth}`). The mock returns `detectedScenarios` in the response.
- **extractDetectedScenarios()**: Uses `as Record<string, unknown>` cast to access `detectedScenarios` from the raw response, since `UploadPreview` type in gas-client.ts doesn't include it (zod strips unknown keys). Will work automatically when gas-client.ts types are updated.
- **Two-tier auto-populate**: `selectFile` auto-populates `scenarioInput` from detected scenarios. `preview()` (re-preview) updates `detectedScenarios` and preview data but does NOT override `scenarioInput`/`generatedLabel`. This preserves manual overrides via `setScenarioInput` (kept exported for backward compat).
- **fileBase64Ref**: Added to avoid stale closure issues in `commit()` and `preview()` — `selectFile` sets the ref, `commit`/`preview` read from it.
- **Form refactoring**: Replaced 6 Select inputs + state management with read-only list of detected scenarios. `computeEndMonth()` helper calculates end month from start + monthCount for display (e.g., "2026-01〜2026-12").
- **Test compatibility**: All 45 admin tests pass without changes. `setScenarioInput` remains exported so existing tests calling it directly continue to work.

### 2026-04-13 Task 11 Learnings (Upload flow wiring verification)

- **Wiring already correct from T8**: The full flow `file → selectFile() → preview → extractDetectedScenarios() → autoPopulateFromDetected() → scenarioInput set → ScenarioInputForm display → commit()` was already properly wired by T8.
- **upload-section.tsx** correctly passes `detectedScenarios`, `generatedLabel`, `isLoading` to `ScenarioInputForm`.
- **commit()** uses `state.scenarioInput` (auto-populated from detection) — no manual input needed.
- **preview() vs selectFile()**: `preview()` (re-preview) intentionally does NOT override `scenarioInput`/`generatedLabel` to preserve manual overrides. `selectFile()` always auto-populates from detected scenarios.
- **No changes needed**: All 3 files had zero LSP diagnostics. Build passes cleanly.

### 2026-04-13 Task 12 Learnings (Filter bar integration into AnalysisHeader)

- **Replaced TopTabs with OrgDropdown**: `analysis-header.tsx` no longer imports `TopTabs` component. Instead imports `OrgDropdown` (which uses `ORG_TABS` from `./top-tabs` internally). The `OrgTab` type is still imported from `./top-tabs`.
- **Two-row layout**: Row 1 = filter bar (MonthPicker + 3x ScenarioSelect + OrgDropdown), Row 2 = TimeAxisPills. Both inside a `div.space-y-2.border-b.px-4.py-3`.
- **Flex layout**: Filter bar uses `flex items-center gap-2` — compact, responsive, no wrapping.
- **app-shell.tsx wiring**: Had to update the caller to pass new props (`targetMonth`, `selectedA/B/C`, `availableScenarios`). The `availableScenarios` is hardcoded as `["実績", "予算", "見込", "着地見込"]` — will need to be derived from actual data later.
- **Build passes** with the wiring change. No LSP errors on analysis-header.tsx.

## T7: ImportData reference cleanup
- `grep -rn "ImportData" gas/` → 0 hits
- `grep -rn "IMPORT_DATA" gas/` → 0 hits
- All ImportData references were already removed by T5 and T6
- `node -c gas/lib/upload.js` → OK
- `bun run build` → success

### 2026-04-13 Task 14 Learnings (filter → state → data flow tests)

- `useAnalysisState()` + `useAnalysisData()` can be integration-tested in one harness component when ABC override creation is wrapped in `useMemo`; without memoization, a fresh override object would retrigger the data hook effect on every render.
- For this pipeline, mocking `gasClient.getAnalysisData`, `gasClient.getUploadHistory`, and `resolveComparisonData` keeps the test focused on the wiring points: targetMonth re-fetch, abcOverride passthrough, and RESET_SELECTIONS cascade.
- Existing fixture helper `buildUploadFromInput()` is the easiest way to create stable `UploadMetadata` objects for asserting exact `abcOverride` contents.
