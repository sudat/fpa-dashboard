# ヘッダー期間選択UI + データアップロードアーキテクチャ改修

## TL;DR

> **Quick Summary**: AnalysisHeaderに対象年月（月ピッカー）とA/B/Cシナリオ選択（ドロップダウン）を追加し、同時にGASバックエンドのデータ保存方式をImportDataシートから1アップロード=1シート方式に移行する。アップロード時の種別・対象月をXLSXから自動検出する。
> 
> **Deliverables**:
> - フィルターバーUI（対象年月ピッカー + A/B/Cセレクト + 組織ドロップダウン）
> - AnalysisState拡張（targetMonth, selectedA/B/C）
> - GASバックエンド改修（ImportData廃止、シート保存、自動検出）
> - アップロードフォーム改修（手動入力→自動検出表示）
> - ハードコード"2026-02"の完全除去
> - TDDによるテスト網羅
> 
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 4 → Task 8 → Task 9 → Task 10 → Task 12 → Task 14 → Task 15

---

## Context

### Original Request
AnalysisHeaderに年月の概念がなく、PRD 4.2にあるA/B/C比較選択ができない。また別タブで合意したデータアップロードのアーキテクチャ変更（ImportDataシート廃止、1アップロード=1シート保存、自動検出）も同時に実装する。

### Interview Summary
**Key Discussions**:
- 年月選択: 月ピッカー（カレンダーUI）を選択
- A/B/C選択: ユーザー選択可能、デフォルトはresolveABC自動推定
- 組織選択: タブからドロップダウンに変更、フィルターバーに1行統合
- 時間軸ピル: 下段に残す
- データ保存: ImportDataシート廃止 → 1アップロード=1Googleシート
- アップロード: 種別・対象月をXLSXの「計画・実績」列と年月列から自動検出
- テスト: TDD（vitest）

**Research Findings**:
- `resolveComparisonData()` 内部で `resolveABC()` を呼んでいる → abcOverrideパラメータで対応
- `analysis-workspace.tsx:172` にも `"2026-02"` のハードコードあり
- `_parseXlsx` の一時シート作成→破棄を「そのまま保存」に変更可能
- shadcn: select, popover, calendar が未インストール

### Metis Review
**Identified Gaps** (addressed):
- 隠しハードコード月: `analysis-workspace.tsx:172` → StateからtargetMonthを渡す
- resolveComparisonData API変更: Option A（abcOverride? パラメータ追加）を採用
- 月変更時のレースコンディション: useAnalysisDataのキャンセレーションパターンで対応済み
- shadcnコンポーネント未インストール: 最初のWaveでインストール
- 重複シナリオ割り当て: YAGNI — 制限なし（ユーザー責任）
- 月変更時のABCリセット: 自動推定値にリセットする

---

## Work Objectives

### Core Objective
予実分析画面の大前提である「対象年月とA/B/Cシナリオの選択」を可能にし、同時にデータアップロード基盤をスケーラブルな1アップロード=1シート方式に移行する。

### Concrete Deliverables
- AnalysisHeader フィルターバー（月ピッカー + A/B/Cセレクト + 組織ドロップダウン + 時間軸ピル）
- 拡張された AnalysisState（targetMonth, selectedA/B/C + 新アクション）
- resolveComparisonData の abcOverride 対応
- GAS Upload.commitUpload（シート保存方式）
- GAS Upload.getAnalysisData（シートから読み取り）
- GAS Upload.previewUpload（自動検出結果付き）
- 改修されたアップロードフォーム（自動検出表示）
- 全ハードコード"2026-02"の除去

### Definition of Done
- [ ] `grep -r "2026-02" src/` → 0 hits
- [ ] `bun test` → all pass
- [ ] `bun run build` → success
- [ ] フィルターバーの全セレクトが機能し、データが連動する
- [ ] アップロード→自動検出→コミット→分析表示までE2Eで繋がる

### Must Have
- 対象年月の選択（月ピッカー）
- A/B/Cシナリオのユーザー選択（デフォルト自動推定）
- 組織ドロップダウン
- ImportDataシート廃止
- 1アップロード=1シート保存
- XLSXからの種別・年月自動検出
- TDDによるテスト

### Must NOT Have (Guardrails)
- date-fns / dayjs の導入不可（ネイティブJSで対応）
- gas-client.ts のAPI surface変更不可（同じ関数シグネチャ維持）
- localStorage / sessionStorage へのフィルター状態永続化しない
- 下段分析エリア（グラフ/表）の変更しない
- 右サイドコメント領域に触らない
- 過剰なエラーハンドリング（YAGNI）
- コメントの過剰なJSDoc追加（AI slop回避）
-gasClientのAPIレスポンス形式は変えない（既存テストが壊れないように）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: TDD
- **Framework**: vitest
- **TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) - Navigate, interact, assert DOM, screenshot
- **GAS Backend**: Use Bash (node scripts) - Run test scripts with mocked GAS
- **API/Integration**: Use Bash (bun test) - Unit tests, integration tests

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation):
├── Task 1: Install shadcn components (select, popover, calendar) [quick]
├── Task 2: Extend AnalysisState with targetMonth + ABC selection [unspecified-high]
├── Task 3: Add abcOverride to resolveComparisonData [unspecified-high]
└── Task 4: GAS backend - auto-detect scenarios from XLSX [deep]

Wave 2 (After Wave 1 - core modules):
├── Task 5: GAS backend - commitUpload to sheet-based storage [deep]
├── Task 6: GAS backend - getAnalysisData from per-upload sheets [deep]
├── Task 7: Wire targetMonth through data flow (remove hardcoded months) [unspecified-high]
├── Task 8: Frontend upload - refactor scenario-input-form to auto-detect display [unspecified-high]
└── Task 9: Build filter bar UI components (MonthPicker, ScenarioSelect, OrgDropdown) [visual-engineering]

Wave 3 (After Wave 2 - integration):
├── Task 10: Integrate filter bar into AnalysisHeader [visual-engineering]
├── Task 11: Wire upload flow with auto-detection [unspecified-high]
└── Task 12: Wire AppShell - connect state to header + data flow [unspecified-high]

Wave 4 (After Wave 3 - cleanup + verification):
├── Task 13: Remove ImportData references + cleanup [quick]
└── Task 14: Integration tests for full filter → data flow [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 5/6 → Task 7/8 → Task 9 → Task 10 → Task 12 → Task 14 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 9 | 1 |
| 2 | - | 7, 9, 10, 12 | 1 |
| 3 | - | 7, 12 | 1 |
| 4 | - | 5, 6, 8, 11 | 1 |
| 5 | 4 | 6, 13 | 2 |
| 6 | 4 | 13 | 2 |
| 7 | 2, 3 | 12 | 2 |
| 8 | 4 | 11 | 2 |
| 9 | 1, 2 | 10 | 2 |
| 10 | 9 | 12 | 3 |
| 11 | 4, 8 | - | 3 |
| 12 | 2, 3, 7, 10 | 14 | 3 |
| 13 | 5, 6 | - | 4 |
| 14 | 12 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **4** - T1 → `quick`, T2 → `unspecified-high`, T3 → `unspecified-high`, T4 → `deep`
- **Wave 2**: **5** - T5 → `deep`, T6 → `deep`, T7 → `unspecified-high`, T8 → `unspecified-high`, T9 → `visual-engineering`
- **Wave 3**: **3** - T10 → `visual-engineering`, T11 → `unspecified-high`, T12 → `unspecified-high`
- **Wave 4**: **2** - T13 → `quick`, T14 → `deep`
- **FINAL**: **4** - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Install shadcn UI components (select, popover, calendar)

  **What to do**:
  - Run `npx shadcn@latest add select popover calendar` to install the missing shadcn components
  - This automatically installs `react-day-picker` as a dependency of Calendar
  - Verify `bun run build` passes after installation
  - Verify no type errors with `bunx tsc --noEmit`

  **Must NOT do**:
  - Do NOT install date-fns or dayjs
  - Do NOT modify any existing components

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single command execution + verification
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not needed — just installing packages

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Task 9 (needs calendar/select/popover components)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/components/ui/tabs.tsx` - Existing shadcn component structure to compare against
  - `src/components/ui/button.tsx` - Another existing shadcn component for reference

  **External References**:
  - shadcn/ui Select: https://ui.shadcn.com/docs/components/select
  - shadcn/ui Popover: https://ui.shadcn.com/docs/components/popover
  - shadcn/ui Calendar: https://ui.shadcn.com/docs/components/calendar

  **WHY Each Reference Matters**:
  - tabs.tsx: Shows how existing shadcn components are structured in this project (exports, file organization)
  - This confirms the expected file structure after installation

  **Acceptance Criteria**:

  - [ ] `src/components/ui/select.tsx` exists
  - [ ] `src/components/ui/popover.tsx` exists
  - [ ] `src/components/ui/calendar.tsx` exists
  - [ ] `bun run build` → success
  - [ ] `bunx tsc --noEmit` → no errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: shadcn components installed and buildable
    Tool: Bash
    Preconditions: Clean working tree
    Steps:
      1. Run `ls src/components/ui/select.tsx src/components/ui/popover.tsx src/components/ui/calendar.tsx`
      2. Assert all 3 files exist (exit code 0)
      3. Run `bun run build`
      4. Assert build succeeds with exit code 0
    Expected Result: All component files exist, build passes
    Failure Indicators: File not found, build errors
    Evidence: .sisyphus/evidence/task-1-shadcn-install.txt
  ```

  **Commit**: YES
  - Message: `chore: install shadcn select, popover, calendar components`
  - Files: `package.json`, `src/components/ui/select.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/calendar.tsx`
  - Pre-commit: `bun run build`

- [x] 2. Extend AnalysisState with targetMonth + ABC selection (TDD)

  **What to do**:
  - RED: Write failing tests for new state fields in `src/features/analysis/state/analysis-state.test.ts`:
    - `SET_TARGET_MONTH` action → updates `targetMonth` field
    - `SET_SELECTED_A`, `SET_SELECTED_B`, `SET_SELECTED_C` actions → update respective fields
    - `RESET_SELECTIONS` → resets ABC to null (keeps targetMonth and org tab)
    - `SET_TARGET_MONTH` → also resets selectedA/B/C to null (triggers re-resolution)
  - GREEN: Implement in `use-analysis-state.ts`:
    - Add to `AnalysisState`: `targetMonth: string`, `selectedA: string | null`, `selectedB: string | null`, `selectedC: string | null`
    - Add to `AnalysisAction`: 4 new action types
    - Add to `DEFAULT_STATE`: `targetMonth: "2026-02"` (temporary default, will be dynamic later)
    - Add reducer cases
    - Add to `AnalysisActions` interface: `setTargetMonth`, `setSelectedA`, `setSelectedB`, `setSelectedC`
    - Add action creators with `useCallback`
  - REFACTOR: Clean up if needed

  **Must NOT do**:
  - Do NOT change existing action types or reducer cases
  - Do NOT add date-fns or dayjs
  - Do NOT add localStorage persistence
  - Do NOT add validation logic for ABC selections (YAGNI)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple state fields with TDD, needs careful testing
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `test-driven-development`: The task instructions already embed TDD workflow explicitly

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: Tasks 7, 9, 10, 12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/features/analysis/state/use-analysis-state.ts:10-17` - Current AnalysisState interface to extend
  - `src/features/analysis/state/use-analysis-state.ts:19-27` - Current AnalysisAction union to extend
  - `src/features/analysis/state/use-analysis-state.ts:29-36` - DEFAULT_STATE to add defaults
  - `src/features/analysis/state/use-analysis-state.ts:38-58` - Reducer function to add cases
  - `src/features/analysis/state/use-analysis-state.ts:63-71` - AnalysisActions interface to extend
  - `src/features/analysis/state/use-analysis-state.ts:73-124` - Hook with useCallback pattern to follow

  **Test References**:
  - `src/features/analysis/state/analysis-state.test.ts` - Existing test file to add tests to

  **WHY Each Reference Matters**:
  - use-analysis-state.ts: Complete state management pattern — every new field needs type, action, default, reducer case, and action creator
  - analysis-state.test.ts: Existing test patterns to match (describe/it structure, assertions)

  **Acceptance Criteria**:

  - [ ] `bun test src/features/analysis/state/analysis-state.test.ts` → PASS
  - [ ] Tests cover: SET_TARGET_MONTH, SET_SELECTED_A/B/C, RESET_SELECTIONS, targetMonth resets ABC

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: State transitions work correctly
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Run `bun test src/features/analysis/state/analysis-state.test.ts`
      2. Assert all tests pass
      3. Verify test count ≥ 4 new tests
    Expected Result: All tests pass, new state fields work correctly
    Failure Indicators: Test failures, missing test coverage
    Evidence: .sisyphus/evidence/task-2-state-tests.txt

  Scenario: Setting targetMonth resets ABC selections
    Tool: Bash
    Preconditions: State tests pass
    Steps:
      1. Check that test for "SET_TARGET_MONTH resets selectedA/B/C to null" exists and passes
    Expected Result: Target month change clears ABC overrides
    Failure Indicators: ABC values persist after month change
    Evidence: .sisyphus/evidence/task-2-reset-test.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis-state): add targetMonth and ABC selection state`
  - Files: `src/features/analysis/state/use-analysis-state.ts`, `src/features/analysis/state/analysis-state.test.ts`
  - Pre-commit: `bun test src/features/analysis/state/analysis-state.test.ts`

- [x] 3. Add abcOverride parameter to resolveComparisonData (TDD)

  **What to do**:
  - RED: Write failing test in `src/features/analysis/lib/__tests__/comparison-resolver.test.ts`:
    - When `abcOverride` is provided, `resolveABC()` is NOT called (use override values)
    - When `abcOverride` is undefined, existing auto-resolution behavior preserved
    - Test that overriding A to a different UploadMetadata changes the output
  - GREEN: Modify `src/features/analysis/lib/comparison-resolver.ts`:
    - Add optional parameter: `abcOverride?: ABCResolution` to `resolveComparisonData()`
    - When `abcOverride` provided, use it instead of calling `resolveABC()`
    - When not provided, keep existing `resolveABC(dedupedHistory)` call
    - Import `ABCResolution` type from upload-contract
  - REFACTOR: Clean up

  **Must NOT do**:
  - Do NOT change the existing resolveABC function
  - Do NOT change the return type of resolveComparisonData
  - Do NOT modify how slot values are resolved (resolveSlotValue stays the same)
  - Do NOT break existing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API change to core function, needs careful backward compatibility
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: Tasks 7, 12
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/features/analysis/lib/comparison-resolver.ts:19-98` - Full resolveComparisonData function to modify
  - `src/features/analysis/lib/comparison-resolver.ts:29` - The exact line where resolveABC is called (must be conditional)

  **API/Type References**:
  - `src/lib/domain/upload-contract.ts:64-68` - ABCResolution type definition `{ A, B, C: UploadMetadata | null }`

  **Test References**:
  - `src/features/analysis/lib/__tests__/comparison-resolver.test.ts` - Existing tests that must still pass

  **WHY Each Reference Matters**:
  - comparison-resolver.ts: The core function — line 29 is the critical branch point
  - ABCResolution type: The override parameter type — must match exactly
  - Existing tests: Must not break — any change must be backward compatible

  **Acceptance Criteria**:

  - [ ] `bun test src/features/analysis/lib/__tests__/comparison-resolver.test.ts` → PASS (all existing + new tests)
  - [ ] New test: abcOverride bypasses resolveABC
  - [ ] New test: undefined abcOverride uses auto-resolution

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Override parameter works correctly
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Run `bun test src/features/analysis/lib/__tests__/comparison-resolver.test.ts`
      2. Assert all tests pass
      3. Verify ≥ 2 new tests added
    Expected Result: All existing tests pass + new override tests pass
    Failure Indicators: Existing tests broken, new tests fail
    Evidence: .sisyphus/evidence/task-3-resolver-tests.txt

  Scenario: Backward compatibility preserved
    Tool: Bash
    Steps:
      1. Run `bun test src/features/analysis/lib/__tests__/comparison-resolver.test.ts`
      2. Verify all pre-existing test names still pass
    Expected Result: Zero regressions
    Evidence: .sisyphus/evidence/task-3-backward-compat.txt
  ```

  **Commit**: YES
  - Message: `feat(comparison-resolver): accept optional ABC override parameter`
  - Files: `src/features/analysis/lib/comparison-resolver.ts`, `src/features/analysis/lib/__tests__/comparison-resolver.test.ts`
  - Pre-commit: `bun test src/features/analysis/lib/__tests__/comparison-resolver.test.ts`

- [x] 4. GAS backend - auto-detect scenarios from XLSX data

  **What to do**:
  - Create new `gas/lib/detect.js` with scenario auto-detection functions:
    - `Detect.scanScenarios(dataRows)`: Scan parsed XLSX rows, extract unique (scenarioKey, yearMonth) combinations
    - `Detect.classifyScenario(scenarioKey)`: Use existing pattern (deriveMetricTypeFromScenario logic) to classify as actual/budget/forecast
    - `Detect.detectScenarioInputs(dataRows)`: Return array of `{ kind, targetMonth, forecastStart? }` detected from data
  - Modify `gas/lib/upload.js`:
    - `previewUpload()`: Call `Detect.detectScenarioInputs(dataRows)` and include detected scenarios in preview response
    - Add `detectedScenarios` field to preview response: `{ scenarios: Array<{kind, targetMonth, monthCount, rowCount}> }`
  - TDD: Write tests (in node-compatible format or inline assertions) for detect functions

  **Must NOT do**:
  - Do NOT modify `_parseXlsx` yet (that changes in Task 5)
  - Do NOT change `commitUpload` yet
  - Do NOT change `getAnalysisData` yet
  - Do NOT modify `gas-client.ts` response types yet

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: New GAS module with domain logic, needs thorough implementation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: Tasks 5, 6, 8, 11
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `gas/lib/upload.js:40-55` - `_normalizePeriod()` — date normalization pattern to reuse
  - `gas/lib/upload.js:84-104` - `_parseXlsx()` — how XLSX parsing works (column positions defined at lines 17-28)
  - `src/lib/loglass/schema.ts:119` - `deriveMetricTypeFromScenario()` — the TypeScript version of scenario classification logic to port to GAS

  **API/Type References**:
  - `gas/lib/upload.js:16-28` - XLSX_COL column positions (SCENARIO=0, DATE=1) — used to extract scenario and date
  - `src/lib/domain/upload-contract.ts:14-31` - ScenarioInput schema — the shape auto-detection must produce

  **WHY Each Reference Matters**:
  - XLSX_COL: Must use exact same column indices to read scenario name and date
  - deriveMetricTypeFromScenario: The classification logic — "実績" → actual, contains "予算/計画" → budget, else → forecast
  - ScenarioInput: Auto-detected results must match this shape exactly for downstream compatibility

  **Acceptance Criteria**:

  - [ ] `gas/lib/detect.js` exists with `scanScenarios`, `classifyScenario`, `detectScenarioInputs` functions
  - [ ] `previewUpload` returns `detectedScenarios` field in response
  - [ ] Detection correctly identifies mixed 実績/見込 scenarios from a single XLSX

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auto-detection identifies scenarios from mixed XLSX
    Tool: Bash (node script)
    Preconditions: detect.js created
    Steps:
      1. Write a small node test script that mocks XLSX rows with mixed scenarios
      2. Call Detect.detectScenarioInputs() with rows containing "実績" and "26年3月期着地見込..." entries
      3. Assert result contains both actual and forecast kinds
      4. Assert targetMonth values are correctly extracted
    Expected Result: Both actual and forecast scenarios detected with correct months
    Failure Indicators: Missing scenario types, incorrect month extraction
    Evidence: .sisyphus/evidence/task-4-detect-tests.txt

  Scenario: Detection handles edge case - empty rows
    Tool: Bash (node script)
    Steps:
      1. Call Detect.detectScenarioInputs([]) with empty array
      2. Assert returns empty array (no crash)
    Expected Result: Empty array returned gracefully
    Evidence: .sisyphus/evidence/task-4-detect-empty.txt
  ```

  **Commit**: YES
  - Message: `feat(gas): auto-detect scenarios from XLSX columns`
  - Files: `gas/lib/detect.js` (new), `gas/lib/upload.js`
  - Pre-commit: `node gas/lib/detect.js` (if self-testable) or manual review

- [x] 5. GAS backend - commitUpload to per-sheet storage

  **What to do**:
  - Modify `gas/lib/upload.js` `commitUpload()`:
    - Instead of normalizing rows and appending to ImportData, save the parsed XLSX as a permanent sheet
    - Rename `_parseXlsx` behavior: create spreadsheet, convert xlsx → sheet, but DON'T trash it
    - New sheet naming convention: `upload_{uploadId}` (unique per upload)
    - Record the sheet name in UploadHistory metadata
    - When replacing (overwrite): delete old sheet before creating new one
    - Still call `Storage.archiveToDrive()` for Drive backup (keep as-is)
  - Modify `gas/lib/history.js`:
    - Add `SHEET_NAME` column (index 11) to HISTORY_COLS and HISTORY_HEADER
    - Record the per-upload sheet name in new entries
  - Remove `_normalizeRows` function (no longer needed — raw data stays in sheet)

  **Must NOT do**:
  - Do NOT modify getAnalysisData (that's Task 6)
  - Do NOT remove Storage.archiveToDrive (keep Drive archive)
  - Do NOT change gas-client.ts
  - Do NOT change the previewUpload function

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core GAS backend change, needs careful sheet lifecycle management
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8, 9)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4 (needs detect.js)

  **References**:

  **Pattern References**:
  - `gas/lib/upload.js:84-104` - `_parseXlsx()` — current temp file pattern to modify (keep file instead of trashing)
  - `gas/lib/upload.js:155-224` - `commitUpload()` — current commit flow to replace
  - `gas/lib/storage.js:23-36` - `archiveToDrive()` — keep as-is for Drive backup
  - `gas/lib/history.js:9-27` - HISTORY_COLS and HISTORY_HEADER to extend with SHEET_NAME
  - `gas/lib/sheet-utils.js:28-35` - `getOrCreateSheet()` — sheet creation pattern

  **WHY Each Reference Matters**:
  - _parseXlsx: Must change from "create temp → parse → trash" to "create temp → parse → keep as permanent sheet"
  - commitUpload: The entire data persistence path changes — no more ImportData append
  - history.js: Must add sheet name column so getAnalysisData can find the right sheet later

  **Acceptance Criteria**:

  - [ ] `commitUpload` creates a permanent sheet instead of appending to ImportData
  - [ ] UploadHistory has new `sheetName` column
  - [ ] Old sheet is deleted on overwrite
  - [ ] `_normalizeRows` function removed
  - [ ] Drive archive still works

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Upload creates permanent sheet
    Tool: Bash (node mock)
    Steps:
      1. Verify commitUpload creates a sheet named `upload_{uuid}`
      2. Verify sheet contains the raw XLSX data (not normalized)
      3. Verify UploadHistory entry has sheetName column populated
    Expected Result: Sheet created with correct name, history recorded
    Evidence: .sisyphus/evidence/task-5-sheet-creation.txt

  Scenario: Overwrite deletes old sheet
    Tool: Bash (node mock)
    Steps:
      1. Mock an existing upload with sheet `upload_old123`
      2. Call commitUpload with confirmed replacement
      3. Verify old sheet is deleted and new sheet created
    Expected Result: Old sheet gone, new sheet exists
    Evidence: .sisyphus/evidence/task-5-overwrite.txt
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `feat(gas): commit upload to per-sheet storage`
  - Files: `gas/lib/upload.js`, `gas/lib/history.js`
  - Pre-commit: `grep -c "ImportData" gas/lib/upload.js` → should be 0 or only in comments

- [x] 6. GAS backend - getAnalysisData from per-upload sheets

  **What to do**:
  - Modify `gas/lib/upload.js` `getAnalysisData()`:
    - Instead of reading from ImportData sheet, read from per-upload sheets
    - Get upload history → filter by scenarioFamily → find relevant sheets
    - Read from those sheets, filtering by targetMonth
    - Use `getSheetValues()` with range specification for performance (only read needed columns)
    - Map raw rows to the same output format (importData, accountMaster, departmentMaster)
  - The output contract must remain identical to current behavior

  **Must NOT do**:
  - Do NOT change the return type/shape of getAnalysisData
  - Do NOT modify gas-client.ts response types
  - Do NOT break existing frontend code that calls getAnalysisData

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Critical read path, must maintain output compatibility
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 7, 8, 9)
  - **Blocks**: Task 13
  - **Blocked By**: Task 4 (needs detect.js for understanding data flow)

  **References**:

  **Pattern References**:
  - `gas/lib/upload.js:257-296` - Current `getAnalysisData()` reading from ImportData — same output format needed
  - `gas/lib/history.js:41-63` - `getUploadHistory()` — to find relevant upload sheets
  - `gas/lib/sheet-utils.js:43-50` - `readAllRows()` — sheet reading pattern

  **WHY Each Reference Matters**:
  - Current getAnalysisData: Must produce identical output shape — this is the contract
  - History: Need to find which sheets belong to which scenario family
  - SheetUtils: Reading pattern to follow, may need optimization for large sheets

  **Acceptance Criteria**:

  - [ ] getAnalysisData reads from per-upload sheets instead of ImportData
  - [ ] Output shape identical to current (importData, accountMaster, departmentMaster)
  - [ ] Filtering by targetMonth works correctly
  - [ ] Performance: no full-sheet scan for all data

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: getAnalysisData returns correct format from sheet storage
    Tool: Bash (node mock)
    Steps:
      1. Mock per-upload sheets with test data
      2. Call getAnalysisData("actual", "2026-02")
      3. Assert response has importData array with correct fields
      4. Assert only rows matching targetMonth="2026-02" and scenario "実績" are returned
    Expected Result: Same response shape as before, correct filtering
    Evidence: .sisyphus/evidence/task-6-get-data.txt

  Scenario: Handles missing sheet gracefully
    Tool: Bash (node mock)
    Steps:
      1. Call getAnalysisData with a month that has no uploads
      2. Assert returns { importData: [], accountMaster: [...], departmentMaster: [...] }
    Expected Result: Empty importData, no crash
    Evidence: .sisyphus/evidence/task-6-missing-sheet.txt
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `feat(gas): read analysis data from per-upload sheets`
  - Files: `gas/lib/upload.js`

- [x] 7. Wire targetMonth through data flow, remove hardcoded months

  **What to do**:
  - Modify `src/features/analysis/hooks/use-analysis-data.ts`:
    - Remove `ANALYSIS_TARGET_MONTH = "2026-02"` constant
    - Function signature already accepts `targetMonth` — keep it
  - Modify `src/features/analysis/pages/analysis-page.tsx`:
    - Accept `targetMonth` from props (passed from AnalysisState)
    - Pass `state.targetMonth` to `useAnalysisData(state.targetMonth)`
  - Modify `src/features/analysis/components/analysis-workspace.tsx`:
    - Line 172: Replace hardcoded `"2026-02"` with `targetMonth` prop
    - Add `targetMonth: string` to AnalysisWorkspaceProps
    - Thread from state → workspace
  - Add `abcOverride` parameter support:
    - `useAnalysisData` should accept optional ABC selections
    - Build `abcOverride` from state.selectedA/B/C (convert string IDs to UploadMetadata)
    - Pass to `resolveComparisonData`
  - Run `grep -r "2026-02" src/` to verify zero hardcoded months remain

  **Must NOT do**:
  - Do NOT change the component hierarchy
  - Do NOT add new state management — just thread existing state
  - Do NOT change analysis-workspace layout or rendering logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multi-file data flow change with careful prop threading
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 8, 9)
  - **Blocks**: Task 12
  - **Blocked By**: Task 2 (needs state), Task 3 (needs abcOverride param)

  **References**:

  **Pattern References**:
  - `src/features/analysis/hooks/use-analysis-data.ts:219-267` - useAnalysisData hook to modify
  - `src/features/analysis/pages/analysis-page.tsx:10-28` - AnalysisPage to accept targetMonth
  - `src/features/analysis/components/analysis-workspace.tsx:172` - THE hardcoded "2026-02" line to fix
  - `src/features/analysis/hooks/use-analysis-data.ts:127-141` - buildAnalysisData where abcOverride should be threaded

  **API/Type References**:
  - `src/features/analysis/lib/comparison-resolver.ts:19` - resolveComparisonData signature with new abcOverride param

  **WHY Each Reference Matters**:
  - analysis-workspace.tsx:172: The hidden hardcoded month Metis found — must be parameterized
  - use-analysis-data.ts:127-141: Where abcOverride needs to be passed through to resolveComparisonData
  - analysis-page.tsx: The bridge between state and data hook

  **Acceptance Criteria**:

  - [ ] `grep -r "2026-02" src/` → 0 hits
  - [ ] `bun test` → all pass
  - [ ] `bun run build` → success
  - [ ] targetMonth flows from state → page → hook → resolver
  - [ ] abcOverride flows from state.selectedA/B/C → hook → resolver

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No hardcoded months remain
    Tool: Bash
    Steps:
      1. Run `grep -rn "2026-02" src/`
      2. Assert zero output lines
    Expected Result: Zero matches
    Failure Indicators: Any remaining hardcoded month
    Evidence: .sisyphus/evidence/task-7-no-hardcode.txt

  Scenario: Full test suite passes
    Tool: Bash
    Steps:
      1. Run `bun test`
      2. Assert exit code 0
      3. Run `bun run build`
      4. Assert exit code 0
    Expected Result: All tests pass, build succeeds
    Evidence: .sisyphus/evidence/task-7-tests-build.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): wire targetMonth through data flow, remove hardcoded months`
  - Files: `src/features/analysis/hooks/use-analysis-data.ts`, `src/features/analysis/pages/analysis-page.tsx`, `src/features/analysis/components/analysis-workspace.tsx`
  - Pre-commit: `bun test && bun run build && grep -r "2026-02" src/`

- [x] 8. Frontend upload - refactor scenario-input-form to auto-detect display

  **What to do**:
  - Modify `src/features/admin/components/scenario-input-form.tsx`:
    - Remove the manual kind/targetMonth/forecastStart input fields
    - Replace with a display area showing auto-detected scenarios from preview response
    - Show detected scenarios as a list: `実績: 2026-01 〜 2026-12 (12ヶ月分, N行)`, `見込: 2026-01 〜 2026-03 (3ヶ月分, N行)`
    - Keep the generatedLabel display
    - The form becomes read-only display of detected results (no user input needed)
  - Modify `src/features/admin/hooks/use-upload-flow.ts`:
    - Remove `setScenarioInput` (no manual input)
    - After preview, auto-populate scenarioInput from detected scenarios
    - For commit: use the auto-detected scenarioInput
    - Add `detectedScenarios` to UploadState

  **Must NOT do**:
  - Do NOT change the file upload flow (select file → preview → commit)
  - Do NOT remove the replacement warning flow
  - Do NOT change gas-client.ts types (those update separately)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Significant UI + state refactoring for upload flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 9)
  - **Blocks**: Task 11
  - **Blocked By**: Task 4 (needs to know detect API shape)

  **References**:

  **Pattern References**:
  - `src/features/admin/components/scenario-input-form.tsx:34-221` - Current form to replace entirely
  - `src/features/admin/hooks/use-upload-flow.ts:81-199` - Upload flow hook to modify
  - `src/features/admin/hooks/use-upload-flow.ts:112-123` - setScenarioInput to remove/replace

  **WHY Each Reference Matters**:
  - scenario-input-form.tsx: The entire manual input form becomes a read-only display
  - use-upload-flow.ts: The state management for manual input becomes auto-detection driven

  **Acceptance Criteria**:

  - [ ] No manual kind/targetMonth/forecastStart inputs in scenario-input-form
  - [ ] Auto-detected scenarios displayed after preview
  - [ ] Upload flow still works: file → preview → commit
  - [ ] `bun test` → pass

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auto-detect display shows scenarios
    Tool: Playwright
    Preconditions: Dev server running, file selected, preview completed
    Steps:
      1. Navigate to admin page
      2. Upload a test xlsx file
      3. Verify preview shows detected scenarios list (not manual input fields)
      4. Assert no <select> elements for kind/targetMonth
    Expected Result: Scenario list displayed, no manual inputs
    Evidence: .sisyphus/evidence/task-8-auto-detect-ui.png

  Scenario: Build passes after refactoring
    Tool: Bash
    Steps:
      1. Run `bun run build`
      2. Assert exit code 0
    Expected Result: Clean build
    Evidence: .sisyphus/evidence/task-8-build.txt
  ```

  **Commit**: YES
  - Message: `feat(admin): refactor scenario input form to show auto-detected scenarios`
  - Files: `src/features/admin/components/scenario-input-form.tsx`, `src/features/admin/hooks/use-upload-flow.ts`
  - Pre-commit: `bun run build`

- [x] 9. Build filter bar UI components (MonthPicker, ScenarioSelect, OrgDropdown)

  **What to do**:
  - Create `src/features/layout/components/month-picker.tsx`:
    - Uses shadcn Popover + Calendar (month selection mode)
    - Displays current month as button trigger (e.g., "2026年2月")
    - Calendar opens in month-picker mode (captionLayout="dropdown-years" or similar)
    - Returns YYYY-MM string on selection
    - Props: `value: string, onChange: (month: string) => void`
  - Create `src/features/layout/components/scenario-select.tsx`:
    - Uses shadcn Select
    - Shows upload label options (from available scenarios list)
    - Has a "自動" (auto) option at top for auto-resolution
    - Props: `slot: "A" | "B" | "C", value: string | null, options: string[], onChange: (value: string | null) => void`
    - Display format: "A: 見込2026-01" / "B: 実績2026-02" / "C: 前年実績2025-02"
  - Create `src/features/layout/components/org-dropdown.tsx`:
    - Uses shadcn Select
    - Shows ORG_TABS options
    - Props: `value: OrgTab, onChange: (tab: OrgTab) => void`
    - Replaces TopTabs component's role in the filter bar
  - All components follow existing codebase patterns (typed props, Tailwind styling)

  **Must NOT do**:
  - Do NOT integrate into AnalysisHeader yet (that's Task 10)
  - Do NOT add date-fns/dayjs
  - Do NOT over-engineer — keep components simple
  - Do NOT add excessive comments or JSDoc

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component creation with design quality
  - **Skills**: [`design-principles`]
    - `design-principles`: UI component styling conventions for this project

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1 (needs shadcn components), Task 2 (needs state types)

  **References**:

  **Pattern References**:
  - `src/features/layout/components/top-tabs.tsx:24-45` - Current org tabs component pattern (props, Tabs usage)
  - `src/features/layout/components/time-axis-pills.tsx:11-28` - Current pill component pattern
  - `src/components/ui/tabs.tsx` - How shadcn components are structured in this project
  - `src/components/ui/select.tsx` - Newly installed Select component API
  - `src/components/ui/popover.tsx` - Newly installed Popover component API
  - `src/components/ui/calendar.tsx` - Newly installed Calendar component API

  **API/Type References**:
  - `src/features/layout/components/top-tabs.tsx:4-15` - ORG_TABS constant and OrgTab type
  - `src/features/analysis/state/use-analysis-state.ts:10-17` - AnalysisState for prop typing

  **External References**:
  - react-day-picker Calendar: https://daypicker.dev/
  - shadcn Calendar: https://ui.shadcn.com/docs/components/calendar

  **WHY Each Reference Matters**:
  - top-tabs.tsx: Pattern for how layout components receive and forward props in this codebase
  - time-axis-pills.tsx: Simpler component pattern showing the exact callback style used
  - ORG_TABS: The data source for OrgDropdown options
  - Calendar docs: Need to understand month-picker mode configuration

  **Acceptance Criteria**:

  - [ ] `src/features/layout/components/month-picker.tsx` exists and renders
  - [ ] `src/features/layout/components/scenario-select.tsx` exists and renders
  - [ ] `src/features/layout/components/org-dropdown.tsx` exists and renders
  - [ ] `bun run build` → success
  - [ ] All components accept typed props and call onChange callbacks

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MonthPicker renders and fires onChange
    Tool: Playwright
    Preconditions: Dev server running with test page showing MonthPicker
    Steps:
      1. Render MonthPicker with value="2026-02"
      2. Verify button displays "2026年2月"
      3. Click button → Popover opens
      4. Select a different month
      5. Assert onChange called with new YYYY-MM value
    Expected Result: Calendar popover opens, month selection fires callback
    Evidence: .sisyphus/evidence/task-9-month-picker.png

  Scenario: ScenarioSelect shows options with auto option
    Tool: Playwright
    Preconditions: Component rendered with options
    Steps:
      1. Render ScenarioSelect slot="A" with options=["見込2026-01", "見込2026-02"]
      2. Verify "自動" option is first in list
      3. Select "見込2026-02"
      4. Assert onChange called with "見込2026-02"
    Expected Result: Dropdown shows auto option + scenario labels
    Evidence: .sisyphus/evidence/task-9-scenario-select.png

  Scenario: OrgDropdown shows all org tabs
    Tool: Playwright
    Steps:
      1. Render OrgDropdown with value="全社"
      2. Open dropdown
      3. Assert all 10 ORG_TABS options are visible
      4. Select "SaaS事業部"
      5. Assert onChange called with "SaaS事業部"
    Expected Result: All org options available, selection works
    Evidence: .sisyphus/evidence/task-9-org-dropdown.png
  ```

  **Commit**: YES
  - Message: `feat(layout): add MonthPicker, ScenarioSelect, OrgDropdown components`
  - Files: `src/features/layout/components/month-picker.tsx` (new), `src/features/layout/components/scenario-select.tsx` (new), `src/features/layout/components/org-dropdown.tsx` (new)
  - Pre-commit: `bun run build`

- [x] 10. Integrate filter bar into AnalysisHeader

  **What to do**:
  - Modify `src/features/layout/components/analysis-header.tsx`:
    - Replace TopTabs with OrgDropdown in the filter bar
    - Add MonthPicker, 3x ScenarioSelect, OrgDropdown in a single row
    - Keep TimeAxisPills on the second row
    - Update props: accept targetMonth, selectedA/B/C, availableScenarios, and their change handlers
  - Layout:
    ```
    Row 1: [MonthPicker] [ScenarioSelect A] [ScenarioSelect B] [ScenarioSelect C] [OrgDropdown]
    Row 2: [TimeAxisPills] (unchanged)
    ```
  - Style: Use flexbox with gap, matching existing header styling (border-b, px-4, py-3)

  **Must NOT do**:
  - Do NOT delete `top-tabs.tsx` file (may be used elsewhere or useful as reference)
  - Do NOT change TimeAxisPills component
  - Do NOT change the data flow — just UI composition

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI layout integration with design quality
  - **Skills**: [`design-principles`]
    - `design-principles`: For consistent styling conventions

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: Task 12
  - **Blocked By**: Task 9 (needs UI components)

  **References**:

  **Pattern References**:
  - `src/features/layout/components/analysis-header.tsx:11-23` - Current header layout to replace
  - `src/features/layout/components/time-axis-pills.tsx:11-28` - TimeAxisPills to keep in second row
  - `src/features/layout/components/top-tabs.tsx:24-45` - Current TopTabs (being replaced by OrgDropdown)

  **WHY Each Reference Matters**:
  - analysis-header.tsx: The file being modified — current 2-row layout becomes filter bar + pills
  - time-axis-pills.tsx: Stays in second row unchanged
  - top-tabs.tsx: Being replaced by OrgDropdown — same data, different UI

  **Acceptance Criteria**:

  - [ ] AnalysisHeader renders filter bar row with: MonthPicker, 3 ScenarioSelects, OrgDropdown
  - [ ] Second row has TimeAxisPills unchanged
  - [ ] `bun run build` → success
  - [ ] No TopTabs import in analysis-header.tsx

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Filter bar renders all controls in single row
    Tool: Playwright
    Preconditions: Dev server running, analysis page loaded
    Steps:
      1. Navigate to analysis page
      2. Take snapshot of header area
      3. Verify MonthPicker button visible
      4. Verify 3 ScenarioSelect dropdowns visible
      5. Verify OrgDropdown visible
      6. Verify TimeAxisPills below filter bar
    Expected Result: Single row filter bar + pills row below
    Evidence: .sisyphus/evidence/task-10-filter-bar.png

  Scenario: Filter bar responsive on narrow viewport
    Tool: Playwright
    Steps:
      1. Resize to 1024px width
      2. Verify filter bar still usable (scrollable or wrapped)
    Expected Result: Controls accessible at narrower widths
    Evidence: .sisyphus/evidence/task-10-narrow.png
  ```

  **Commit**: YES
  - Message: `feat(layout): integrate filter bar into AnalysisHeader`
  - Files: `src/features/layout/components/analysis-header.tsx`
  - Pre-commit: `bun run build`

- [x] 11. Wire upload flow with auto-detection

  **What to do**:
  - Modify `src/features/admin/hooks/use-upload-flow.ts`:
    - After preview response, extract `detectedScenarios`
    - Auto-populate scenarioInput from first detected scenario (or prompt user to choose if multiple)
    - For commit: use auto-populated scenarioInput
  - Modify `src/features/admin/components/upload-section.tsx`:
    - Update to pass auto-detected data to the refactored scenario-input-form
    - Handle the case where preview returns multiple detected scenarios
  - Ensure the full upload flow works: select file → preview (auto-detect) → display → commit

  **Must NOT do**:
  - Do NOT change gas-client.ts
  - Do NOT change the commit API contract

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: State flow integration between auto-detection and upload process
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12)
  - **Blocks**: None
  - **Blocked By**: Task 4 (needs detect API), Task 8 (needs refactored form)

  **References**:

  **Pattern References**:
  - `src/features/admin/hooks/use-upload-flow.ts:125-154` - preview function to modify
  - `src/features/admin/hooks/use-upload-flow.ts:156-184` - commit function to modify
  - `src/features/admin/components/upload-section.tsx` - Container component to update

  **WHY Each Reference Matters**:
  - use-upload-flow preview/commit: Core flow that needs to switch from manual to auto input
  - upload-section.tsx: The container that wires form to hook

  **Acceptance Criteria**:

  - [ ] Upload flow: file → preview → auto-detect display → commit works
  - [ ] No manual scenario selection needed
  - [ ] `bun run build` → success

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full upload flow with auto-detection
    Tool: Playwright
    Preconditions: Dev server running, admin page
    Steps:
      1. Navigate to admin page
      2. Select an xlsx file
      3. Click preview
      4. Verify auto-detected scenarios displayed
      5. Click commit
      6. Verify success state
    Expected Result: Full flow completes without manual input
    Evidence: .sisyphus/evidence/task-11-upload-flow.png
  ```

  **Commit**: YES
  - Message: `feat(admin): wire upload flow with auto-detection`
  - Files: `src/features/admin/hooks/use-upload-flow.ts`, `src/features/admin/components/upload-section.tsx`
  - Pre-commit: `bun run build`

- [x] 12. Wire AppShell - connect state to header + data flow

  **What to do**:
  - Modify `src/features/layout/components/app-shell.tsx`:
    - Pass `state.targetMonth` to AnalysisPage (→ useAnalysisData)
    - Pass `state.targetMonth`, `state.selectedA/B/C`, and their change handlers to AnalysisHeader
    - Pass upload history (available scenarios) to AnalysisHeader for ScenarioSelect options
    - Load upload history in AppShell (or analysis page) to provide scenario options
    - Wire ABC override logic:
      - Build abcOverride from selectedA/B/C if any are non-null
      - Pass through to useAnalysisData → buildAnalysisData → resolveComparisonData
  - Handle month change cascade:
    - When targetMonth changes → reset selectedA/B/C to null → auto-resolve from upload history
  - Verify the complete data flow: filter bar → state → data hook → comparison data → workspace

  **Must NOT do**:
  - Do NOT change the reducer logic
  - Do NOT add new state fields
  - Do NOT modify AnalysisWorkspace rendering logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Critical integration wiring, touches the main data flow
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Tasks 10, 7)
  - **Blocks**: Task 14
  - **Blocked By**: Task 2 (state), Task 3 (abcOverride), Task 7 (data flow), Task 10 (header UI)

  **References**:

  **Pattern References**:
  - `src/features/layout/components/app-shell.tsx:8-43` - Current AppShell to modify
  - `src/features/analysis/hooks/use-analysis-data.ts:219-267` - useAnalysisData to receive targetMonth + abcOverride

  **WHY Each Reference Matters**:
  - app-shell.tsx: The integration point — everything wires together here
  - useAnalysisData: Must receive targetMonth and abcOverride from state

  **Acceptance Criteria**:

  - [ ] AppShell passes targetMonth to AnalysisPage → useAnalysisData
  - [ ] AppShell passes ABC state + handlers to AnalysisHeader
  - [ ] Upload history loaded for scenario options
  - [ ] Month change resets ABC selections
  - [ ] `bun test` → all pass
  - [ ] `bun run build` → success

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full filter → data flow integration
    Tool: Playwright
    Preconditions: Dev server running, analysis page loaded
    Steps:
      1. Verify initial load shows data for default month
      2. Click MonthPicker, select different month
      3. Verify data reloads (loading state appears then resolves)
      4. Verify ABC dropdowns reset to "自動"
      5. Select a specific scenario in A dropdown
      6. Verify comparison data updates
    Expected Result: Filter changes trigger data reload
    Evidence: .sisyphus/evidence/task-12-integration.png

  Scenario: Build and test pass
    Tool: Bash
    Steps:
      1. Run `bun test`
      2. Run `bun run build`
      3. Assert both succeed
    Expected Result: All green
    Evidence: .sisyphus/evidence/task-12-tests.txt
  ```

  **Commit**: YES
  - Message: `feat: connect filter state to header and data flow in AppShell`
  - Files: `src/features/layout/components/app-shell.tsx`, `src/features/analysis/pages/analysis-page.tsx`, `src/features/analysis/hooks/use-analysis-data.ts`
  - Pre-commit: `bun test && bun run build`

- [ ] 13. Remove ImportData references + cleanup

  **What to do**:
  - Search for all references to `ImportData` in GAS backend:
    - `gas/lib/upload.js`: Remove IMPORT_DATA_SHEET constant, _normalizeRows function, ImportData references in commitUpload and getAnalysisData
    - Any other files referencing ImportData
  - Remove unused code:
    - `_normalizeRows` function (if not already removed in Task 5)
    - `IMPORT_DATA_HEADER` constant
    - Any dead imports
  - Verify no broken references remain
  - Run `grep -r "ImportData" gas/` → should return 0 hits

  **Must NOT do**:
  - Do NOT delete the actual ImportData sheet in production (that's a data migration concern)
  - Do NOT remove ImportData test fixtures from src/ (used in frontend tests)
  - Do NOT modify gas-dist/ (auto-generated)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Cleanup task, straightforward removal
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 14)
  - **Blocks**: None
  - **Blocked By**: Task 5 (commitUpload no longer uses ImportData), Task 6 (getAnalysisData no longer uses ImportData)

  **References**:

  **Pattern References**:
  - `gas/lib/upload.js:7` - IMPORT_DATA_SHEET constant
  - `gas/lib/upload.js:30-34` - IMPORT_DATA_HEADER constant
  - `gas/lib/upload.js:231-249` - _normalizeRows function
  - `gas/lib/upload.js:178-188` - ImportData usage in commitUpload

  **WHY Each Reference Matters**:
  - All ImportData references must be removed for clean migration
  - _normalizeRows is dead code once ImportData is gone

  **Acceptance Criteria**:

  - [ ] `grep -r "ImportData" gas/` → 0 hits (excluding gas-dist/)
  - [ ] `_normalizeRows` function removed
  - [ ] `IMPORT_DATA_SHEET` and `IMPORT_DATA_HEADER` constants removed
  - [ ] No broken references

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No ImportData references in GAS backend
    Tool: Bash
    Steps:
      1. Run `grep -rn "ImportData" gas/ --exclude-dir=gas-dist`
      2. Assert zero output lines
    Expected Result: Clean grep output
    Evidence: .sisyphus/evidence/task-13-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore: remove ImportData references from GAS backend`
  - Files: `gas/lib/upload.js`
  - Pre-commit: `grep -rn "ImportData" gas/ --exclude-dir=gas-dist`

- [ ] 14. Integration tests for full filter → data flow

  **What to do**:
  - Write integration tests covering:
    - Month selection triggers data reload with correct targetMonth
    - ABC selection override changes comparison data
    - Month change resets ABC to null
    - Full flow: select month → auto-resolve ABC → select override → verify data
    - Upload history provides scenario options to UI
  - Test file: `src/features/analysis/state/integration.test.ts` or extend existing test files
  - These are state + data flow tests, not UI tests (UI covered in component tests)

  **Must NOT do**:
  - Do NOT test GAS backend directly (no GAS runtime in test env)
  - Do NOT add flaky async tests

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration testing across multiple modules
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 13)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 12 (needs full integration wired)

  **References**:

  **Pattern References**:
  - `src/features/analysis/state/analysis-state.test.ts` - Existing state test patterns
  - `src/features/analysis/hooks/use-analysis-data.test.tsx` - Existing data hook test patterns
  - `src/features/analysis/lib/__tests__/comparison-resolver.test.ts` - Resolver test patterns

  **WHY Each Reference Matters**:
  - These files show the testing patterns: mock data fixtures, describe/it structure, assertion style

  **Acceptance Criteria**:

  - [ ] Integration test file created with ≥ 5 test cases
  - [ ] `bun test` → all pass
  - [ ] Tests cover: month change, ABC override, ABC reset, full flow

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Integration tests pass
    Tool: Bash
    Steps:
      1. Run `bun test`
      2. Assert all tests pass (including new integration tests)
      3. Verify test count increased by ≥ 5
    Expected Result: All green, new tests counted
    Evidence: .sisyphus/evidence/task-14-integration-tests.txt
  ```

  **Commit**: YES
  - Message: `test: integration tests for filter → data flow`
  - Files: new test file(s)
  - Pre-commit: `bun test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `chore: install shadcn select, popover, calendar components` - package.json, components/ui/*
- **2**: `feat(analysis-state): add targetMonth and ABC selection state` - use-analysis-state.ts, analysis-state.test.ts
- **3**: `feat(comparison-resolver): accept optional ABC override parameter` - comparison-resolver.ts, __tests__/comparison-resolver.test.ts
- **4**: `feat(gas): auto-detect scenarios from XLSX columns` - gas/lib/upload.js, gas/lib/detect.js (new)
- **5**: `feat(gas): commit upload to per-sheet storage` - gas/lib/upload.js, gas/lib/storage.js
- **6**: `feat(gas): read analysis data from per-upload sheets` - gas/lib/upload.js
- **7**: `feat(analysis): wire targetMonth through data flow, remove hardcoded months` - use-analysis-data.ts, analysis-workspace.tsx, analysis-page.tsx
- **8**: `feat(admin): refactor scenario input form to show auto-detected scenarios` - scenario-input-form.tsx, use-upload-flow.ts
- **9**: `feat(layout): add MonthPicker, ScenarioSelect, OrgDropdown components` - month-picker.tsx (new), scenario-select.tsx (new), org-dropdown.tsx (new)
- **10**: `feat(layout): integrate filter bar into AnalysisHeader` - analysis-header.tsx
- **11**: `feat(admin): wire upload flow with auto-detection` - use-upload-flow.ts, upload-section.tsx
- **12**: `feat: connect filter state to header and data flow in AppShell` - app-shell.tsx
- **13**: `chore: remove ImportData references` - upload.js, various
- **14**: `test: integration tests for filter → data flow` - integration test files

---

## Success Criteria

### Verification Commands
```bash
bun test                    # Expected: all tests pass
bun run build               # Expected: successful build
grep -r "2026-02" src/      # Expected: 0 hits
grep -r "ImportData" gas/   # Expected: 0 hits (after cleanup)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] No hardcoded months remain
- [ ] Filter bar UI renders correctly
- [ ] Upload auto-detection works
- [ ] Data flows from filter → analysis display
