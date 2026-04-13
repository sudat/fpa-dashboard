# Upload Metadata-Only + B-First Dashboard Plan

## TL;DR

> **Quick Summary**: Replace single-month upload identity with range-based metadata, stop writing uploaded detail rows into the bound GAS spreadsheet, and refactor dashboard comparison selection into a B-first flow.
>
> **Deliverables**:
> - Metadata-only upload persistence design and implementation path
> - Range-label contract and replacement identity redesign
> - B-first A/B/C resolution and UI wiring
> - Migration / compatibility strategy for existing upload history
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 2 main waves + final verification
> **Critical Path**: Task 1 → Task 4 → Task 5 → Task 8 → Final verification

---

## Context

### Original Request
ユーザーは、アップロード時に A列/B列から実績期間と見込開始を認識し、範囲ラベルを生成するフローに合わせた実装タスクの計画を要求した。

### Interview Summary
**Key Discussions**:
- 現在のラベルは `2026/02月実績` のような単月形式で、想定フローの範囲ラベルとズレている。
- 現在のダッシュボードは A/B/C を独立管理しており、B起点の選択フローではない。
- 最重要制約として、**アップロード明細そのものは予実分析シートに書かない**。書くのは履歴・マッピング等のメタデータのみ。

**Research Findings**:
- `gas/lib/upload.js` は現在、アップロード行を `upload_*` シートへ追記している。
- `gas/lib/history.js` は `generatedLabel + scenarioFamily` を前提に履歴・置換判定を行う。
- `src/features/analysis/lib/comparison-resolver.ts` は現行ラベルと現行 `resolveABC()` に依存して比較データを生成する。

### Metis Review
**Identified Gaps** (addressed in plan):
- 分析データ取得元は、bound spreadsheet ではなく **archived Drive original を都度再読込する** 方針で確定した。
- ラベル変更がバリデーション、履歴キー、比較ロジック、UI 表示へ横断波及する点を明示する必要がある。
- 旧履歴との互換 / 移行方針を plan 内に明示する必要がある。

---

## Work Objectives

### Core Objective
アップロード明細を bound spreadsheet に永続化しない構成へ移行しつつ、範囲ラベルと B-first 比較フローを導入する。

### Concrete Deliverables
- 範囲ラベルを表現できる新しいドメイン契約
- metadata-only な upload/history 保存フロー
- B-first の ABC 解決ロジックと UI 状態管理
- 旧履歴互換または移行方針
- 回帰テスト群の更新

### Definition of Done
- [ ] `bun run test` が PASS
- [ ] `bun run lint` が PASS
- [ ] `bun run build` が PASS
- [ ] `bun run build:gas` が PASS
- [ ] アップロード後、bound spreadsheet に `upload_*` のような明細シートが作られない

### Must Have
- UploadHistory / mapping history に必要なメタデータだけを書き込む
- ラベルは uploaded content 由来の range label を使う
- B を基準に A/C を自動導出し、必要なら手動 override できる

### Must NOT Have (Guardrails)
- **raw uploaded detail rows を bound GAS spreadsheet に書かない**
- `upload_*` のような per-upload data sheet を新規作成しない
- コメント機能、権限、可視化 UI 再設計までスコープを広げない
- 旧単月ラベル前提のコードを無計画に一掃しない（互換 / 移行を設ける）

### Difficulty
- **難易度**: ★★★
- **根拠**: 15+ files, domain / GAS / dashboard state / tests に横断影響
- **リスク**: 分析データ取得元の設計未確定、旧履歴との互換、GAS と frontend の契約ズレ

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — すべてコマンドまたはツール実行で確認する。

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after（既存テスト基盤活用）
- **Framework**: Vitest

### QA Policy
- Domain / resolver 変更は unit test で検証
- GAS 契約変更は gas-client 経由の contract test と build:gas で検証
- UI 状態変更は component / integration test で検証
- metadata-only guardrail は static search + GAS build artifact inspection で検証

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation + storage contract):
├── Task 1: Implement Drive-original read architecture and compatibility boundary
├── Task 2: Redesign range label + replacement identity contracts
├── Task 3: Refactor upload detection/input metadata model
├── Task 4: Refactor GAS upload/history to metadata-only persistence
└── Task 5: Build analysis data source adapter without spreadsheet raw-detail writes

Wave 2 (B-first comparison + UI wiring):
├── Task 6: Implement B-first ABC resolver contract and tests
├── Task 7: Refactor analysis state + selector UI to B-first flow
├── Task 8: Rework comparison resolver and analysis data orchestration
└── Task 9: Update admin history UI, migration compatibility, and docs

Wave FINAL:
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Real QA execution
└── Task F4: Scope fidelity check
```

### Dependency Matrix
- **1**: None → 4, 5, 9
- **2**: 1 → 4, 6, 8, 9
- **3**: 2 → 4, 9
- **4**: 1, 2, 3 → 5, 9
- **5**: 1, 4 → 8
- **6**: 2 → 7, 8
- **7**: 6 → 8
- **8**: 5, 6, 7 → 9, FINAL
- **9**: 1, 2, 3, 4, 8 → FINAL

### Agent Dispatch Summary
- **Wave 1**: T1 → `oracle`, T2 → `quick`, T3 → `quick`, T4 → `unspecified-high`, T5 → `deep`
- **Wave 2**: T6 → `deep`, T7 → `visual-engineering`, T8 → `unspecified-high`, T9 → `writing`
- **FINAL**: F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Implement Drive-original read architecture and compatibility boundary

  **What to do**:
  - Implement the chosen canonical raw-data source: archived Drive original re-read on analysis requests.
  - Freeze a compatibility rule for old upload-history rows (`sheetName`-backed) vs new metadata-only rows.
  - Document the expected performance envelope and fallback behavior if Drive access fails.

  **Must NOT do**:
  - Do not assume raw rows remain in the bound spreadsheet.
  - Do not defer this decision to later tasks.

  **Recommended Agent Profile**:
  - **Category**: `oracle`
    - Reason: This is the architectural keystone and controls every downstream task.
  - **Skills**: [`writing-plans`]
    - `writing-plans`: Keeps the outcome concrete and implementation-ready.
  - **Skills Evaluated but Omitted**:
    - `brainstorming`: Requirements are already converged.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: 4, 5, 9
  - **Blocked By**: None

  **References**:
  - `gas/lib/upload.js` - Current per-upload sheet persistence path (`appendUploadRows`, `finalizeUploadSession`).
  - `gas/lib/history.js` - Current metadata schema, including `sheetName` storage.
  - `src/features/analysis/hooks/use-analysis-data.ts` - Current analysis load path that expects persisted data.
  - `docs/prd/prd_fpa_dashboard_master.md` - Performance and operational constraints.

  **Acceptance Criteria**:
  - [ ] A written architecture note exists in code comments / plan references for Drive-original re-read.
  - [ ] The choice explicitly states how old rows remain readable during transition.
  - [ ] Failure handling for missing/inaccessible Drive originals is explicitly defined.

  **QA Scenarios**:
  ```
  Scenario: Architecture decision captured before implementation
    Tool: Bash (bun test not required yet) + Read
    Preconditions: Task documentation updated in implementation branch
    Steps:
      1. Read modified contract/design files or comments that define the chosen raw-data source.
      2. Confirm they explicitly say raw detail rows are not written to the bound spreadsheet.
      3. Confirm they explicitly describe old-row compatibility.
    Expected Result: Decision is explicit, binary, and referenced by downstream tasks.
    Failure Indicators: Vague wording like "store elsewhere later" or no compatibility note.
    Evidence: .sisyphus/evidence/task-1-architecture-decision.md

  Scenario: Guardrail encoded in code path review
    Tool: Grep
    Preconditions: Relevant files modified
    Steps:
      1. Search for `upload_` and `appendRows(` under `gas/lib`.
      2. Verify new comments / code paths do not indicate writing raw rows to sheet storage.
    Expected Result: No active implementation path persists raw upload rows into bound spreadsheet sheets.
    Evidence: .sisyphus/evidence/task-1-no-raw-sheet-write.txt
  ```

  **Commit**: YES
  - Message: `refactor(storage): define metadata-only upload persistence boundary`
  - Files: `gas/lib/upload.js`, `gas/lib/history.js`, `src/features/analysis/hooks/use-analysis-data.ts`, docs/comments as needed
  - Pre-commit: `bun run test`

- [ ] 2. Redesign range label + replacement identity contracts

  **What to do**:
  - Extend `ScenarioInput` to represent actual range and forecast start.
  - Replace single-month label generation with range-label generation.
  - Introduce a replacement identity that does not depend on the old single-month regex.
  - Support dual-read or migration-safe parsing for old history rows.

  **Must NOT do**:
  - Do not hard-break existing upload-history parsing without a compatibility path.

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Tight domain model changes with focused test coverage.
  - **Skills**: [`writing-plans`]
    - `writing-plans`: Keeps contract changes exact and testable.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 6, 8, 9
  - **Blocked By**: 1

  **References**:
  - `src/lib/domain/upload-contract.ts` - Existing Zod schemas and replacement identity.
  - `src/lib/domain/scenario-label.ts` - Existing label generator and current ABC resolver.
  - `src/lib/domain/__tests__/scenario-label.test.ts` - Current expected label tests.
  - `src/lib/domain/__tests__/upload-contract.test.ts` - Current identity tests.

  **Acceptance Criteria**:
  - [ ] Contract tests cover both old-format and new-format history rows where required.
  - [ ] New range label examples are validated by schema.
  - [ ] `bun run test -- src/lib/domain/__tests__/scenario-label.test.ts src/lib/domain/__tests__/upload-contract.test.ts` passes.

  **QA Scenarios**:
  ```
  Scenario: New range label contract passes domain tests
    Tool: Bash
    Preconditions: Domain contract files updated
    Steps:
      1. Run `bun run test -- src/lib/domain/__tests__/scenario-label.test.ts src/lib/domain/__tests__/upload-contract.test.ts`.
      2. Confirm tests include at least one old-format compatibility case and one new range-label case.
    Expected Result: All targeted tests PASS.
    Failure Indicators: Regex mismatch, schema parse failure, or missing compatibility case.
    Evidence: .sisyphus/evidence/task-2-domain-tests.txt

  Scenario: Replacement identity no longer assumes single-target-month label
    Tool: Read
    Preconditions: Code updated
    Steps:
      1. Inspect `upload-contract.ts` replacement identity fields.
      2. Confirm identity fields are tied to range metadata / explicit key parts, not only the old label string.
    Expected Result: Replacement identity remains deterministic under new range label semantics.
    Evidence: .sisyphus/evidence/task-2-replacement-identity.md
  ```

  **Commit**: YES
  - Message: `refactor(domain): add range label and upload identity contracts`
  - Files: `src/lib/domain/upload-contract.ts`, `src/lib/domain/scenario-label.ts`, related tests
  - Pre-commit: `bun run test -- src/lib/domain/__tests__/scenario-label.test.ts src/lib/domain/__tests__/upload-contract.test.ts`

- [ ] 3. Refactor upload detection/input metadata model

  **What to do**:
  - Update detected scenario metadata to preserve actual start/end range and forecast start as first-class values.
  - Refactor admin upload flow auto-population so generated labels are based on detected ranges, not a single target month.
  - Ensure mock upload flow mirrors the real metadata shape.

  **Must NOT do**:
  - Do not add UI that lets users re-enter the raw uploaded detail itself.

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 9
  - **Blocked By**: 2

  **References**:
  - `src/features/admin/hooks/use-upload-flow.ts` - Current auto-population and upload state.
  - `gas/lib/detect.js` - Current scenario detection from A/B columns.
  - `src/features/admin/components/scenario-input-form.tsx` - Current label preview and detected range display.
  - `src/features/admin/hooks/use-upload-flow.test.ts` - Existing upload flow tests.

  **Acceptance Criteria**:
  - [ ] Auto-population creates range-aware scenario metadata.
  - [ ] Upload-flow tests cover actual-range-only and actual+forecast file cases.

  **QA Scenarios**:
  ```
  Scenario: Upload flow derives range metadata from detected workbook content
    Tool: Bash
    Preconditions: Upload-flow tests updated
    Steps:
      1. Run `bun run test -- src/features/admin/hooks/use-upload-flow.test.ts`.
      2. Confirm at least one test covers actual range + forecast start generation.
    Expected Result: PASS with assertions on generated range label and structured metadata.
    Evidence: .sisyphus/evidence/task-3-upload-flow-tests.txt

  Scenario: Scenario input form shows range-aware preview
    Tool: Bash
    Preconditions: Component test exists or updated
    Steps:
      1. Run `bun run test -- src/features/admin/components/upload-section.test.tsx src/features/admin/components/upload-status.test.tsx` if present, otherwise nearest admin component tests.
      2. Verify preview output includes range semantics rather than only a target month.
    Expected Result: Component tests PASS and rendered text matches new label semantics.
    Evidence: .sisyphus/evidence/task-3-range-preview.txt
  ```

  **Commit**: YES
  - Message: `feat(upload): derive range metadata from detected workbook content`
  - Files: `src/features/admin/hooks/use-upload-flow.ts`, `gas/lib/detect.js`, admin tests/components
  - Pre-commit: `bun run test -- src/features/admin/hooks/use-upload-flow.test.ts`

- [ ] 4. Refactor GAS upload/history to metadata-only persistence

  **What to do**:
  - Remove the active path that writes uploaded detail rows into spreadsheet data sheets.
  - Persist only upload metadata/history/mapping references needed for lookup and audit.
  - Update history schema, conflict detection, and finalize/abort logic to work without `sheetName`-backed raw detail storage.

  **Must NOT do**:
  - Do not create a hidden replacement sheet that still stores raw detail rows under another name.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Cross-cutting GAS storage change with migration implications.
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 9
  - **Blocked By**: 1, 2, 3

  **References**:
  - `gas/lib/upload.js` - `appendUploadRows`, `finalizeUploadSession`, `abortUploadSession`.
  - `gas/lib/history.js` - history header and conflict checks.
  - `gas/lib/sheet-utils.js` - current sheet write helpers.
  - `src/lib/gas/gas-client.ts` - current upload session bridge.

  **Acceptance Criteria**:
  - [ ] GAS build passes.
  - [ ] No active upload finalization path creates per-upload raw data sheets.
  - [ ] Upload history still records required metadata for lookup and conflict handling.

  **QA Scenarios**:
  ```
  Scenario: GAS build succeeds after metadata-only persistence refactor
    Tool: Bash
    Preconditions: GAS files updated
    Steps:
      1. Run `bun run build:gas`.
      2. Confirm build output contains updated upload/history modules without syntax errors.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-4-build-gas.txt

  Scenario: No per-upload raw-detail sheet path remains
    Tool: Grep
    Preconditions: GAS files updated
    Steps:
      1. Search `gas/lib` and `gas-dist/lib` for `upload_` and raw-row append calls.
      2. Verify no active finalize path persists detail rows into spreadsheet sheets.
    Expected Result: Search results only show intentional migration/compat comments or removed code references, not active persistence logic.
    Evidence: .sisyphus/evidence/task-4-no-sheet-write.txt
  ```

  **Commit**: YES
  - Message: `refactor(gas): persist upload metadata without raw spreadsheet rows`
  - Files: `gas/lib/upload.js`, `gas/lib/history.js`, `src/lib/gas/gas-client.ts`, build artifacts
  - Pre-commit: `bun run build:gas`

- [ ] 5. Build analysis data source adapter without spreadsheet raw-detail writes

  **What to do**:
  - Implement the chosen analysis-data retrieval path from Task 1.
  - Refactor `gasClient.getAnalysisData` / GAS backend flow so analysis reads from the new canonical raw-data source, not `upload_*` sheets.
  - Preserve master mapping enrichment and keep raw-detail spreadsheet writes forbidden.

  **Must NOT do**:
  - Do not leave the old sheet-backed path as the default for new uploads.

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Data source rewrite with performance and compatibility consequences.
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8
  - **Blocked By**: 1, 4

  **References**:
  - `src/features/analysis/hooks/use-analysis-data.ts` - current analysis loading pipeline.
  - `src/lib/gas/gas-client.ts` - current getAnalysisData bridge.
  - `gas/lib/upload.js` - current analysis data assembly.
  - `src/lib/domain/master-schema.ts` - downstream mapping assumptions.

  **Acceptance Criteria**:
  - [ ] Analysis data loading path is documented in code and uses the new source.
  - [ ] Existing analysis hook tests or new contract tests pass.

  **QA Scenarios**:
  ```
  Scenario: Analysis hook still loads normalized data through the new source
    Tool: Bash
    Preconditions: Analysis hook tests updated
    Steps:
      1. Run `bun run test -- src/features/analysis/hooks/use-analysis-data.test.tsx`.
      2. Confirm tests cover the new source adapter and still produce comparison data.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-5-analysis-hook-tests.txt

  Scenario: Master mapping enrichment remains intact
    Tool: Bash
    Preconditions: Analysis source adapter implemented
    Steps:
      1. Run targeted tests covering `applyMasterMapping` consumers, such as `bun run test -- src/features/analysis/integration/filter-state-data-flow.test.tsx`.
      2. Verify grouped analysis still returns mapped departments/accounts.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-5-master-mapping.txt
  ```

  **Commit**: YES
  - Message: `refactor(analysis): load analysis data without spreadsheet raw-row storage`
  - Files: `gas/lib/upload.js`, `src/lib/gas/gas-client.ts`, `src/features/analysis/hooks/use-analysis-data.ts`, related tests
  - Pre-commit: `bun run test -- src/features/analysis/hooks/use-analysis-data.test.tsx`

- [ ] 6. Implement B-first ABC resolver contract and tests

  **What to do**:
  - Redesign pure ABC resolution so B is the anchor selection.
  - Support A/C auto-derivation relative to B and optional manual override hooks.
  - Preserve the `ABCResolution` output contract for downstream consumers.

  **Must NOT do**:
  - Do not entangle UI state concerns directly inside pure resolver logic.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7, 8
  - **Blocked By**: 2

  **References**:
  - `src/lib/domain/scenario-label.ts` - current `resolveABC()` implementation.
  - `src/lib/domain/__tests__/abc-reassignment.test.ts` - current ABC expectations.
  - `src/features/analysis/lib/comparison-resolver.ts` - current ABCResolution consumer.

  **Acceptance Criteria**:
  - [ ] B-first resolver tests cover default auto, manual B change, and A/C override cases.
  - [ ] `bun run test -- src/lib/domain/__tests__/abc-reassignment.test.ts src/lib/domain/__tests__/scenario-label.test.ts` passes.

  **QA Scenarios**:
  ```
  Scenario: Pure resolver supports B-first auto-selection
    Tool: Bash
    Preconditions: Resolver tests updated
    Steps:
      1. Run `bun run test -- src/lib/domain/__tests__/abc-reassignment.test.ts src/lib/domain/__tests__/scenario-label.test.ts`.
      2. Confirm test cases assert B choice drives derived A/C values.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-6-bfirst-resolver.txt

  Scenario: Manual overrides do not break ABCResolution contract
    Tool: Read + Bash
    Preconditions: Tests updated
    Steps:
      1. Inspect resolver type signatures for `{ A, B, C }` stability.
      2. Run the same targeted test command and confirm override cases pass.
    Expected Result: Output shape remains unchanged while behavior changes.
    Evidence: .sisyphus/evidence/task-6-override-contract.md
  ```

  **Commit**: YES
  - Message: `feat(domain): add b-first abc resolution`
  - Files: `src/lib/domain/scenario-label.ts`, ABC tests
  - Pre-commit: `bun run test -- src/lib/domain/__tests__/abc-reassignment.test.ts src/lib/domain/__tests__/scenario-label.test.ts`

- [ ] 7. Refactor analysis state + selector UI to B-first flow

  **What to do**:
  - Change analysis state so B is primary, with explicit A/C auto/manual modes.
  - Replace three fully independent selector semantics with B-first UX.
  - Make selector options dynamic from actual upload history instead of hardcoded labels.

  **Must NOT do**:
  - Do not redesign unrelated tabs, charts, or detail panels.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI/state interaction changes matter more than raw styling.
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8
  - **Blocked By**: 6

  **References**:
  - `src/features/analysis/state/use-analysis-state.ts` - current independent state.
  - `src/features/layout/components/scenario-select.tsx` - current selector component.
  - `src/features/layout/components/analysis-header.tsx` - selector layout.
  - `src/features/layout/components/app-shell.tsx` - current hardcoded options / override builder.
  - `src/features/analysis/state/analysis-state.test.ts` - state behavior tests.

  **Acceptance Criteria**:
  - [ ] State tests reflect B-first behavior.
  - [ ] UI tests cover dynamic selector options and auto/manual A/C behavior.

  **QA Scenarios**:
  ```
  Scenario: Selecting B updates analysis state and derived A/C modes
    Tool: Bash
    Preconditions: State tests updated
    Steps:
      1. Run `bun run test -- src/features/analysis/state/analysis-state.test.ts`.
      2. Confirm tests assert B selection updates related A/C state.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-7-analysis-state.txt

  Scenario: Header selectors expose B-first interaction model
    Tool: Bash
    Preconditions: Component tests updated
    Steps:
      1. Run `bun run test -- src/features/layout/components/analysis-header.test.tsx src/features/layout/components/app-shell.test.tsx` if present, otherwise nearest selector tests.
      2. Confirm options are dynamic and A/C behavior reflects auto/manual relative to B.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-7-selector-ui.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): wire b-first selector state and ui`
  - Files: `src/features/analysis/state/use-analysis-state.ts`, `src/features/layout/components/scenario-select.tsx`, `analysis-header.tsx`, `app-shell.tsx`, tests
  - Pre-commit: `bun run test -- src/features/analysis/state/analysis-state.test.ts`

- [ ] 8. Rework comparison resolver and analysis data orchestration

  **What to do**:
  - Update comparison-resolution logic to use the new identity rules and B-first overrides.
  - Remove direct dependence on old single-month generated-label matching where inappropriate.
  - Ensure analysis data orchestration can consume the new metadata-only storage + B-first state.

  **Must NOT do**:
  - Do not regress fallback behavior for cases with no upload history.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`writing-plans`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 9, FINAL
  - **Blocked By**: 5, 6, 7

  **References**:
  - `src/features/analysis/lib/comparison-resolver.ts` - current dedupe / lookup / slot resolution.
  - `src/features/analysis/hooks/use-analysis-data.ts` - current hook orchestration.
  - `src/features/analysis/lib/__tests__/comparison-resolver.test.ts` - resolver expectations.
  - `src/features/analysis/integration/filter-state-data-flow.test.tsx` - end-to-end data flow coverage.

  **Acceptance Criteria**:
  - [ ] Resolver tests cover new identity and B-first override semantics.
  - [ ] Integration flow test still passes.
  - [ ] No code path assumes raw detail rows live in spreadsheet data sheets.

  **QA Scenarios**:
  ```
  Scenario: Comparison resolver passes with B-first overrides
    Tool: Bash
    Preconditions: Resolver updated
    Steps:
      1. Run `bun run test -- src/features/analysis/lib/__tests__/comparison-resolver.test.ts`.
      2. Confirm tests cover B-first auto and override cases.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-8-comparison-resolver.txt

  Scenario: Integration data flow survives end-to-end
    Tool: Bash
    Preconditions: Resolver + state + data hook updated
    Steps:
      1. Run `bun run test -- src/features/analysis/integration/filter-state-data-flow.test.tsx src/features/analysis/hooks/use-analysis-data.test.tsx`.
      2. Confirm filter-state-to-comparison flow remains green.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-8-integration-flow.txt
  ```

  **Commit**: YES
  - Message: `refactor(analysis): align comparison pipeline with b-first metadata flow`
  - Files: `src/features/analysis/lib/comparison-resolver.ts`, `src/features/analysis/hooks/use-analysis-data.ts`, related tests
  - Pre-commit: `bun run test -- src/features/analysis/lib/__tests__/comparison-resolver.test.ts`

- [ ] 9. Update admin history UI, migration compatibility, and docs

  **What to do**:
  - Update import log / upload status screens to show range labels and metadata-only semantics.
  - Implement old-history compatibility or migration helpers.
  - Update PRD / technical docs with the new storage and B-first rules.

  **Must NOT do**:
  - Do not silently drop old upload-history rows from admin UI.

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: This task is mostly UI wording, migration notes, and docs clarity.
  - **Skills**: [`writing-plans`, `writing-clearly-and-concisely`]
    - `writing-clearly-and-concisely`: Keeps doc and UI text concrete.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: FINAL
  - **Blocked By**: 1, 2, 3, 4, 8

  **References**:
  - `src/features/admin/components/import-log.tsx` - current import log columns.
  - `src/features/admin/components/upload-status.tsx` - success/error label display.
  - `docs/prd/prd_fpa_dashboard_master.md` - current product rules.
  - `docs/prd/prd_fpa_dashboard.md` - historical reference.

  **Acceptance Criteria**:
  - [ ] Admin UI shows range labels instead of single-month labels where applicable.
  - [ ] Docs explicitly state that raw uploaded detail rows are not written into the bound spreadsheet.
  - [ ] Old-history compatibility behavior is documented.

  **QA Scenarios**:
  ```
  Scenario: Admin history UI shows new metadata semantics
    Tool: Bash
    Preconditions: UI tests updated
    Steps:
      1. Run `bun run test -- src/features/admin/components/admin-page.test.tsx src/features/admin/components/upload-section.test.tsx`.
      2. Confirm import log / status content references range labels and not only single-yearMonth display.
    Expected Result: PASS.
    Evidence: .sisyphus/evidence/task-9-admin-ui.txt

  Scenario: Docs encode the no-raw-sheet-write guardrail
    Tool: Read
    Preconditions: Docs updated
    Steps:
      1. Read updated PRD sections.
      2. Verify explicit wording that upload detail rows are not persisted to the bound analysis spreadsheet.
    Expected Result: Clear and unambiguous documentation.
    Evidence: .sisyphus/evidence/task-9-doc-guardrail.md
  ```

  **Commit**: YES
  - Message: `docs(admin): document metadata-only uploads and range labels`
  - Files: admin UI, docs, compatibility helpers/tests
  - Pre-commit: `bun run test -- src/features/admin/components/admin-page.test.tsx`

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify the implementation leaves no raw upload-row persistence path in the bound spreadsheet, confirms range labels exist, and validates B-first flow behavior against the plan.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run lint`, `bun run test`, `bun run build`, `bun run build:gas`; review changed files for stale single-month assumptions and dead compatibility code.

- [ ] F3. **Real QA** — `unspecified-high`
  Execute targeted upload/admin/analysis test suites and capture evidence for metadata-only persistence, range labels, and B-first selection.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Ensure only upload/history/domain/analysis-state/resolver/docs files changed, and that comments/auth/visualization redesign were not dragged in.

---

## Commit Strategy

- **1**: `refactor(storage): define metadata-only upload persistence boundary`
- **2**: `refactor(domain): add range label and upload identity contracts`
- **3**: `feat(upload): derive range metadata from detected workbook content`
- **4**: `refactor(gas): persist upload metadata without raw spreadsheet rows`
- **5**: `refactor(analysis): load analysis data without spreadsheet raw-row storage`
- **6**: `feat(domain): add b-first abc resolution`
- **7**: `feat(analysis): wire b-first selector state and ui`
- **8**: `refactor(analysis): align comparison pipeline with b-first metadata flow`
- **9**: `docs(admin): document metadata-only uploads and range labels`

---

## Success Criteria

### Verification Commands
```bash
bun run test      # Expected: all vitest suites pass
bun run lint      # Expected: 0 errors
bun run build     # Expected: build succeeds
bun run build:gas # Expected: GAS bundle build succeeds
```

### Final Checklist
- [ ] Range labels replace single-month labels where intended
- [ ] Upload history and replacement logic no longer depend on raw spreadsheet detail writes
- [ ] Bound spreadsheet stores metadata only
- [ ] B-first selection works with auto A/C and manual override
- [ ] Existing upload history remains readable or is explicitly migrated
- [ ] No out-of-scope comment/auth/visualization changes introduced
