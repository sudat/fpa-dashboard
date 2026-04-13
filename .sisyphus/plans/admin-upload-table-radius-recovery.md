# Admin Upload / Table Fidelity / Radius Recovery Plan

## TL;DR

> **Quick Summary**: 管理画面のモック状態を解消し、`xlsx取込 → 差分警告確認 → 分析画面反映` の本線を通す。同時に、詳細テーブルを PRD 準拠の折りたたみ型へ戻し、角丸トークンの逸脱をゼロへ戻す。
>
> **Deliverables**:
> - 管理画面からの実 upload フロー
> - Google Drive 原本保存 + Google Sheet マスタ/取込データ連携
> - 動的 A/B/C シナリオ解釈
> - GMV を最上位に含む詳細テーブル再構成
> - `集計不要` 非表示、`未割当` 警告付き保存
> - 全体ゼロ radius 復旧
> - 提供済み shadcn baseline repo を `.shadcn/` 配下に置いた整合性監査
>
> **Estimated Effort**: XL
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: upload/domain contract → GAS backend bridge → frontend admin wiring → analysis source switch → detail table recovery → zero-radius audit

---

## Context

### Original Request
- 最優先で upload 機能を作る
- 管理画面を拡張して admin が xlsx を取り込めるようにする
- detail table を現行業務に近い見え方へ戻す（案B: 集計科目ごとの折りたたみ型）
- GMV は売上高の上に出す
- 明細科目→集計科目、明細部署→事業部、各種ソート順を管理画面から編集したい
- `未割当` は警告付き保存可、`集計不要` は分析画面で完全非表示
- radius は app-wide でゼロに戻す
- 提供済み shadcn baseline repo を `.shadcn/` 配下に配置し、それを基準に design consistency を総合検証したい
- shadcn baseline の参照元は `https://ui.shadcn.com/create?preset=b1tMK2lJz&item=preview`

### Interview Summary
**Key Discussions**:
- Upload 入力元は direct xlsx upload
- シナリオタグは自由入力ではなく、構造化入力から自動生成する
- 同じタグ系統の再 upload は後勝ち上書き + 差し替え警告
- B は最新 upload、A はひとつ前、C は前年基準として動的に解釈する
- Excel 原本は Google Drive に保存する
- マスタ編集は保存後すぐ分析画面へ反映する

**Research Findings**:
- `src/features/admin/components/admin-page.tsx` は mock-only
- `src/features/analysis/pages/analysis-page.tsx` は `loglassSmallRawFixture` 依存
- `docs/prototype/Code_v2.gs` / `docs/prototype/index.html` に upload/archive/history の試作がある
- `src/features/admin/lib/normalize-loglass.ts` は reusable な正規化/比較ロジック境界
- `src/index.css` は `--radius: 0.625rem` で、さらに複数箇所に `rounded-*` 直書きが残る

### Metis Review
**Identified Gaps** (addressed in this plan):
- upload identity / overwrite semantics を domain contract task として先頭に固定
- backend bridge を frontend upload より先に置く
- detail table recovery を fixture 拡充ではなく source-of-truth switch と一緒に扱う
- zero-radius cleanup を token pass と hardcoded-class pass に分割
- `未割当` / `集計不要` / GMV order / A/B/C 再解釈を acceptance criteria に明記

### Difficulty

難易度: ★★★
根拠: 12+ files, 500+ lines, 4+ components
リスク: GAS backend 契約・Google Sheet master・analysis 再計算・UI 再構成が密結合

---

## Work Objectives

### Core Objective
現在の fixture/mock 主体のダッシュボードを、admin upload と master 編集を核とする運用可能な分析画面へ戻す。同時に、詳細表の業務適合性と UI 形状のズレを是正する。

### Concrete Deliverables
- 管理画面に xlsx upload UI と差し替え警告 UI を追加
- GAS backend に upload / archive / master / analysis データ取得 API を追加
- Google Sheet を master storage とした account/department mapping 管理
- 分析画面のデータソースを fixture から persisted import data へ切替
- 折りたたみ型詳細テーブル（GMV > 売上高 > … > 営業利益）
- `未割当` 警告保存、`集計不要` 非表示
- radius 0 を app-wide へ戻す
- `.shadcn/` baseline との design drift を説明可能にし、対象範囲は整合させる

### Definition of Done
- [ ] 管理画面で xlsx を選択し、構造化タグ入力後に warning/commit を経て analysis に反映できる
- [ ] 同タグ再 upload で差し替え warning が出て、確認後に B/A が再解釈される
- [ ] 詳細テーブルが aggregate accordion で表示され、GMV が売上高の上に出る
- [ ] `集計不要` が analysis UI に一切出ない
- [ ] representative UI surfaces の computed `border-radius` が `0px`
- [ ] `.shadcn/` baseline と比較して主要 surface の design drift が説明可能で、必要差分が解消される

### Must Have
- xlsx direct upload
- Google Drive 原本保存
- Google Sheet master 読み書き
- 即時反映
- 既存テスト維持 + 追加

### Must NOT Have (Guardrails)
- コメント/通知/承認ワークフロー本実装
- 新しい設定画面の追加
- full auth redesign
- generalized report builder 化
- mobile-first redesign

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after（既存テスト維持 + 追加）
- **Framework**: vitest + existing React Testing Library

### QA Policy
- Backend/domain: vitest + pure function tests
- GAS bridge: command-driven smoke verification via generated mock/stub and integration tests where possible
- Frontend/admin upload: Playwright or browser automation on local app
- Analysis/table/radius: DOM assertions + screenshot/computed-style checks

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation/domain):
├── Task 1: Freeze upload/master/domain contract
├── Task 2: Add test assets + scenario identity tests
├── Task 3: Inventory radius usage and zero-radius target map
└── Task 4: Define analysis master entities and fallback defaults

Wave 2 (backend + admin foundation):
├── Task 5: GAS backend upload/archive/history/master APIs
├── Task 6: Frontend GAS client/data-access layer
├── Task 7: Admin upload UI + structured scenario inputs
└── Task 8: Admin master editor UI for account/department mapping/order

Wave 3 (analysis recovery):
├── Task 9: Switch analysis source from fixture to persisted import data
├── Task 10: Implement dynamic A/B/C reassignment + overwrite handling
├── Task 11: Rebuild detail table into accordion aggregate view
└── Task 12: Hide 集計不要 / handle 未割当 deterministically

Wave 4 (visual + integration hardening):
├── Task 13: Radius token reset
├── Task 14: Remove hardcoded rounded utilities
├── Task 15: Import shadcn baseline repo + design consistency audit
├── Task 16: Upload-to-analysis E2E and visual QA coverage
└── Task 17: Performance/regression pass on realistic dataset sizes

Wave FINAL:
├── F1: Plan compliance audit
├── F2: Code quality review
├── F3: Real scenario QA
└── F4: Scope fidelity check
```

### Dependency Matrix

- **1**: - → 5, 7, 8, 9, 10
- **2**: 1 → 5, 10, 12, 16
- **3**: - → 13, 14, 15, 16
- **4**: 1 → 8, 9, 11, 12
- **5**: 1,2 → 6,7,8,9,10
- **6**: 5 → 7,8,9,16
- **7**: 5,6 → 10,16
- **8**: 4,5,6 → 9,12,16
- **9**: 4,5,6 → 10,11,12,16,17
- **10**: 1,2,5,7,9 → 11,12,16
- **11**: 4,9,10 → 16,17
- **12**: 2,4,8,9,10 → 16,17
- **13**: 3 → 14,15,16
- **14**: 3,13 → 15,16
- **15**: 3,13,14 → 16
- **16**: 6,7,8,9,10,11,12,13,14,15 → 17, FINAL
- **17**: 9,11,12,16 → FINAL

### Agent Dispatch Summary

- **Wave 1**: T1 deep, T2 quick, T3 quick, T4 deep
- **Wave 2**: T5 unspecified-high, T6 quick, T7 visual-engineering, T8 unspecified-high
- **Wave 3**: T9 deep, T10 deep, T11 visual-engineering, T12 deep
- **Wave 4**: T13 quick, T14 quick, T15 unspecified-high, T16 unspecified-high, T17 unspecified-high
- **FINAL**: F1 oracle, F2 unspecified-high, F3 unspecified-high, F4 deep

---

## TODOs

- [x] 1. Freeze upload / master / analysis domain contract

  **What to do**:
  - Define canonical types/schemas for upload metadata, scenario identity, replacement identity, account master, department master, unassigned bucket, excluded bucket
  - Encode the structured scenario input fields and auto-generated label rules
  - Define overwrite identity (default: same generated label + same scenario family)

  **Must NOT do**:
  - Do not wire UI/backend before this contract is frozen
  - Do not rely on free-text label parsing as the only truth

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: shared contract across backend, admin UI, and analysis
  - **Skills**: `systematic-debugging`, `writing-clearly-and-concisely`
    - `systematic-debugging`: root-cause discipline around current mismatches
    - `writing-clearly-and-concisely`: unambiguous contract definitions

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 7, 8, 9, 10
  - **Blocked By**: None

  **References**:
  - `src/features/admin/lib/normalize-loglass.ts` - existing normalization/comparison seam to preserve
  - `docs/prototype/Code_v2.gs` - prototype upload/history/master concepts to extract, not copy blindly
  - `docs/prd/prd_fpa_dashboard_master.md` - A/B/C semantics and detail table intent
  - `.sisyphus/drafts/admin-upload-table-radius-regression.md` - confirmed user decisions

  **Acceptance Criteria**:
  - [ ] Contract file(s) define scenario input fields and generated label format exactly
  - [ ] Contract defines `未割当` and `集計不要` behavior explicitly
  - [ ] Contract defines latest=B, previous=A, prior-year=C dynamic interpretation

  **QA Scenarios**:
  ```
  Scenario: scenario label generation happy path
    Tool: Bash (bun/vitest)
    Preconditions: contract tests exist with sample input targetMonth=2026-01, forecastStart=2026-02, kind=actual
    Steps:
      1. Run the domain test for label generation
      2. Assert generated label equals `2026/01月実績(見込:2月~)`
    Expected Result: test passes and exact label matches
    Failure Indicators: free-text label drift, missing month suffix, parse-only implementation
    Evidence: .sisyphus/evidence/task-1-label-generation.txt

  Scenario: excluded/unassigned semantics
    Tool: Bash (bun/vitest)
    Preconditions: domain tests with one unmapped account and one excluded account
    Steps:
      1. Run contract tests
      2. Assert unmapped rows resolve to `未割当`
      3. Assert excluded rows are marked analysis-hidden
    Expected Result: deterministic status assignment
    Evidence: .sisyphus/evidence/task-1-unassigned-excluded.txt
  ```

- [x] 2. Add upload identity, overwrite, and A/B/C reassignment tests

  **What to do**:
  - Create failing tests for latest/previous reassignment, same-tag overwrite warning, prior-year baseline mapping
  - Add deterministic sample xlsx metadata fixtures

  **Must NOT do**:
  - Do not implement backend/UI first

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `test-driven-development`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 5, 10, 12, 15
  - **Blocked By**: 1

  **References**:
  - `src/features/admin/lib/normalize-loglass.test.ts` - current comparison test style
  - `src/features/analysis/lib/selectors.test.ts` - dataset-driven assertions style

  **Acceptance Criteria**:
  - [ ] Tests cover same-tag overwrite warning path
  - [ ] Tests cover 1/10 upload -> B, then 2/10 upload -> previous becomes A
  - [ ] Tests cover C remaining prior-year baseline

  **QA Scenarios**:
  ```
  Scenario: dynamic B→A shift
    Tool: Bash (bun/vitest)
    Preconditions: two upload metadata fixtures exist for consecutive months
    Steps:
      1. Run upload identity tests
      2. Assert latest scenario resolves to B
      3. Assert previous scenario resolves to A
    Expected Result: deterministic reassignment passes
    Evidence: .sisyphus/evidence/task-2-ab-shift.txt

  Scenario: same-tag overwrite warning
    Tool: Bash (bun/vitest)
    Preconditions: two uploads with same generated label
    Steps:
      1. Run overwrite detection test
      2. Assert warning state is returned before commit
    Expected Result: silent overwrite does not occur
    Evidence: .sisyphus/evidence/task-2-overwrite-warning.txt
  ```

- [x] 3. Audit radius usage and define zero-radius target map

  **What to do**:
  - Inventory token-level and hardcoded `rounded-*` usage
  - Produce a list of representative surfaces that must end at `border-radius: 0px`

  **Must NOT do**:
  - Do not change styling yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 13, 14, 15
  - **Blocked By**: None

  **References**:
  - `src/index.css` - global radius token
  - `src/components/ui/*.tsx` - shared primitives
  - `src/features/**` - hardcoded rounded utility usage

  **Acceptance Criteria**:
  - [ ] Representative surface list exists (button/card/tab/input/badge/tooltip/dialog/chart)
  - [ ] Hardcoded pill exceptions are enumerated explicitly

  **QA Scenarios**:
  ```
  Scenario: rounded inventory completeness
    Tool: Bash (grep/ast-grep equivalent in test script)
    Preconditions: audit script or checklist exists
    Steps:
      1. Run inventory command/script
      2. Assert all shared UI primitives are listed
    Expected Result: no hidden rounded hotspots remain untracked
    Evidence: .sisyphus/evidence/task-3-radius-inventory.txt
  ```

- [x] 4. Define master entities and fallback defaults for account/department mapping

  **What to do**:
  - Freeze master schema for 明細科目→集計科目, 明細部署→事業部, sort order, GMV flag, `未割当`, `集計不要`
  - Decide code fallback defaults when sheet data is incomplete

  **Must NOT do**:
  - Do not allow circular or undefined structural states

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 8, 9, 11, 12
  - **Blocked By**: 1

  **References**:
  - `src/features/admin/lib/grouping.ts` - current grouping assumptions
  - `docs/prototype/Code_v2.gs` - master sync concept
  - `docs/prd/prd_fpa_dashboard_master.md` - GMV and table ordering requirements

  **Acceptance Criteria**:
  - [ ] Master schema can represent GMV above 売上高
  - [ ] `未割当` and `集計不要` are explicit, not implicit edge cases

  **QA Scenarios**:
  ```
  Scenario: master schema supports GMV ordering
    Tool: Bash (bun/vitest)
    Preconditions: schema/default tests exist
    Steps:
      1. Run master entity tests
      2. Assert GMV sort order < 売上高 sort order
    Expected Result: order contract passes
    Evidence: .sisyphus/evidence/task-4-gmv-order.txt
  ```

- [x] 5. Build GAS backend upload/archive/history/master APIs

  **What to do**:
  - Add GAS-side functions for current user, upload preview, commit upload, history fetch, master read/write
  - Reuse prototype concepts selectively for Drive archive and history, but align to new contract
  - Define failure boundaries for archive success + parse failure, etc.

  **Must NOT do**:
  - Do not expose prototype API shapes unchanged without reconciliation
  - Do not leave partial-write failure semantics undefined

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 6, 7, 8, 9, 10
  - **Blocked By**: 1, 2

  **References**:
  - `gas/Code.js` - current minimal entrypoint
  - `docs/prototype/Code_v2.gs` - preview/commit/history/archive concepts
  - `scripts/build-gas.ts` - GAS packaging path

  **Acceptance Criteria**:
  - [ ] Preview API detects overwrite candidates and returns warning payload
  - [ ] Commit API archives original xlsx to Drive and persists analysis/master data
  - [ ] History API returns latest upload metadata needed for B/A resolution

  **QA Scenarios**:
  ```
  Scenario: upload preview detects replacement
    Tool: Bash (integration test harness)
    Preconditions: one existing upload record with same generated label
    Steps:
      1. Invoke preview API with same-tag workbook metadata
      2. Assert warning payload contains replacement target details
    Expected Result: replacement is detected before commit
    Evidence: .sisyphus/evidence/task-5-preview-warning.txt

  Scenario: archive + persistence happy path
    Tool: Bash (integration test harness)
    Preconditions: valid workbook fixture and writable test stubs/mocks
    Steps:
      1. Invoke commit API
      2. Assert archive metadata saved
      3. Assert persisted analysis dataset saved
    Expected Result: both archive and data persistence succeed atomically or with explicit failure reporting
    Evidence: .sisyphus/evidence/task-5-commit-archive.txt
  ```

- [x] 6. Add frontend GAS client / data-access layer

  **What to do**:
  - Introduce a thin client for `google.script.run` interaction with typed request/response wrappers
  - Provide mock/fallback path for tests and local non-GAS execution

  **Must NOT do**:
  - Do not scatter direct `google.script.run` calls across components

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `code-simplifier`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7, 8, 9, 15
  - **Blocked By**: 5

  **References**:
  - current frontend lacks GAS client abstraction; create one consistent seam

  **Acceptance Criteria**:
  - [ ] Admin and analysis code can call backend through one typed client layer
  - [ ] Local test path does not require GAS runtime

  **QA Scenarios**:
  ```
  Scenario: local mock client path
    Tool: Bash (bun/vitest)
    Preconditions: mock client tests exist
    Steps:
      1. Run client tests without GAS runtime
      2. Assert request/response wrappers resolve correctly
    Expected Result: frontend tests remain runnable locally
    Evidence: .sisyphus/evidence/task-6-client-mock.txt
  ```

- [x] 7. Extend current 管理 screen with real upload UI

  **What to do**:
  - Add file picker/drop zone, structured scenario inputs, generated label preview, overwrite warning flow, submit state, success/failure state
  - Keep scope on current `管理` screen; no separate settings page

  **Must NOT do**:
  - Do not add free-text scenario tagging as primary flow
  - Do not bypass replacement warning

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `ui-ux-pro-max`, `writing-clearly-and-concisely`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 10, 15
  - **Blocked By**: 5, 6

  **References**:
  - `src/features/admin/components/admin-page.tsx` - current mount point
  - `docs/prototype/index.html` - old upload UX concepts
  - PRD upload flow sections

  **Acceptance Criteria**:
  - [ ] User can select xlsx and enter structured scenario inputs
  - [ ] Generated label preview updates deterministically
  - [ ] Same-tag upload shows replacement warning before final commit

  **QA Scenarios**:
  ```
  Scenario: upload form happy path
    Tool: Playwright
    Preconditions: local app running with mock/test backend
    Steps:
      1. Open 管理 screen
      2. Upload sample workbook `sample-2026-01.xlsx`
      3. Select kind=`実績`, target month=`2026-01`, forecast start=`2026-02`
      4. Assert label preview text equals `2026/01月実績(見込:2月~)`
      5. Submit and confirm success state
    Expected Result: upload commits and success UI appears
    Evidence: .sisyphus/evidence/task-7-upload-happy.png

  Scenario: replacement warning path
    Tool: Playwright
    Preconditions: same scenario already exists in test backend
    Steps:
      1. Repeat same upload
      2. Assert warning modal/banner appears
      3. Assert warning text names replacement target
    Expected Result: no silent overwrite
    Evidence: .sisyphus/evidence/task-7-replacement-warning.png
  ```

- [x] 8. Add admin master editor for mapping and sort order

  **What to do**:
  - Add editable master UI for account mapping, department mapping, aggregate order, department order, GMV flag
  - Support `未割当` and `集計不要`
  - Save allowed with warnings when `未割当` remains

  **Must NOT do**:
  - Do not require zero-warning save
  - Do not surface `集計不要` in analysis output after save

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `ui-ux-pro-max`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 9, 12, 15
  - **Blocked By**: 4, 5, 6

  **References**:
  - `src/features/admin/components/master-diff-warning.tsx` - current warning presentation seam
  - master schema from Task 4

  **Acceptance Criteria**:
  - [ ] Admin can edit detail→aggregate and detail-department→business-unit mappings
  - [ ] Save with remaining `未割当` shows warning, but persists
  - [ ] `集計不要` can be assigned and later excluded from analysis

  **QA Scenarios**:
  ```
  Scenario: warning save with 未割当
    Tool: Playwright
    Preconditions: one unmapped detail account present
    Steps:
      1. Open master editor
      2. Leave one item as `未割当`
      3. Save
      4. Assert warning summary appears and save still succeeds
    Expected Result: warning save allowed
    Evidence: .sisyphus/evidence/task-8-unassigned-warning.png

  Scenario: map account to 集計不要
    Tool: Playwright
    Preconditions: one low-priority account exists
    Steps:
      1. Assign account to `集計不要`
      2. Save
      3. Navigate to analysis
      4. Assert account text is absent from detail table
    Expected Result: excluded account hidden from analysis
    Evidence: .sisyphus/evidence/task-8-excluded-hidden.png
  ```

- [x] 9. Switch analysis source from fixture to persisted import data

  **What to do**:
  - Replace `loglassSmallRawFixture`-driven source path with imported/persisted data retrieval
  - Keep fixture/test fallback only for tests/dev if necessary

  **Must NOT do**:
  - Do not keep fixture as production path fallback silently

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 10, 11, 12, 15, 16
  - **Blocked By**: 4, 5, 6, 8

  **References**:
  - `src/features/analysis/pages/analysis-page.tsx` - current fixture source
  - `src/features/admin/lib/normalize-loglass.ts` - retained transform boundary

  **Acceptance Criteria**:
  - [ ] Analysis page renders imported dataset without fixture dependency in production path
  - [ ] Imported rows reflect current master mapping immediately after save

  **QA Scenarios**:
  ```
  Scenario: analysis reflects uploaded dataset
    Tool: Playwright
    Preconditions: uploaded workbook committed successfully
    Steps:
      1. Open analysis page
      2. Assert fixture-only markers/data are gone
      3. Assert imported department/account data appears
    Expected Result: analysis source switched successfully
    Evidence: .sisyphus/evidence/task-9-analysis-source.png
  ```

- [x] 10. Implement dynamic A/B/C reassignment and overwrite handling in comparison pipeline

  **What to do**:
  - Replace simplistic latest-two scenario selection with upload-history-aware identity rules
  - Ensure latest upload becomes B, previous becomes A, previous-year remains C

  **Must NOT do**:
  - Do not depend on lexicographic label sorting alone

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 11, 12, 15
  - **Blocked By**: 1, 2, 5, 7, 9

  **References**:
  - `src/features/admin/lib/normalize-loglass.ts` - current scenario selection logic to replace/extend
  - user-confirmed B/A/C interpretation in draft

  **Acceptance Criteria**:
  - [ ] 1/10 scenario is B until newer scenario exists
  - [ ] 2/10 scenario promotion demotes 1/10 to A
  - [ ] same-tag overwrite updates B without duplicating scenario family

  **QA Scenarios**:
  ```
  Scenario: multi-upload A/B/C mapping
    Tool: Bash (bun/vitest)
    Preconditions: uploaded history fixtures for Jan and Feb
    Steps:
      1. Run comparison pipeline tests
      2. Assert Jan upload resolves to A after Feb upload exists
      3. Assert Feb upload resolves to B
      4. Assert C remains prior-year baseline
    Expected Result: deterministic mapping passes
    Evidence: .sisyphus/evidence/task-10-abc-reassignment.txt
  ```

- [ ] 11. Rebuild detail table into aggregate accordion view

  **What to do**:
  - Reshape detail table to aggregate-first accordion groups matching PRD intent
  - Include GMV above 売上高
  - Ensure weak linkage from difference chart still lands user at the right row/group

  **Must NOT do**:
  - Do not keep current 5-summary-rows-as-table structure as the final behavior

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `ui-ux-pro-max`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 15, 16
  - **Blocked By**: 4, 9, 10

  **References**:
  - `src/features/analysis/components/detail/detail-panel.tsx`
  - `src/features/analysis/components/detail/columns.tsx`
  - `src/features/analysis/components/shared/detail-table.tsx`
  - `docs/prd/prd_fpa_dashboard_master.md` sections 7.6, 7.7, 7.11

  **Acceptance Criteria**:
  - [ ] Aggregate sections render in configured order with GMV first
  - [ ] Accordion expand/collapse reveals detail rows under each aggregate
  - [ ] Weak linkage expands target group and highlights target row

  **QA Scenarios**:
  ```
  Scenario: accordion hierarchy happy path
    Tool: Playwright
    Preconditions: analysis page has imported dataset with multiple detail rows per aggregate
    Steps:
      1. Open analysis page
      2. Assert aggregate order starts with GMV, then 売上高
      3. Expand GMV and 売上高 groups
      4. Assert detail rows become visible under each group
    Expected Result: PRD-like accordion table is rendered
    Evidence: .sisyphus/evidence/task-11-accordion.png

  Scenario: weak linkage from difference chart
    Tool: Playwright
    Preconditions: difference chart has clickable items
    Steps:
      1. Click one difference bar
      2. Assert corresponding accordion section opens
      3. Assert target row has temporary highlight styling
    Expected Result: weak linkage works without page transition
    Evidence: .sisyphus/evidence/task-11-weak-link.png
  ```

- [ ] 12. Enforce `未割当` fallback and `集計不要` exclusion in analysis transforms

  **What to do**:
  - Ensure unmapped items roll into `未割当`
  - Ensure excluded accounts never appear in rendered analysis output
  - Keep behavior deterministic after master save

  **Must NOT do**:
  - Do not silently drop unmapped items without warning

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 15, 16
  - **Blocked By**: 2, 4, 8, 9, 10

  **References**:
  - master schema from Task 4
  - analysis transforms from Task 9/10/11

  **Acceptance Criteria**:
  - [ ] unmapped items surface under `未割当`
  - [ ] `集計不要` items are absent from summary, detail, trend, and difference outputs

  **QA Scenarios**:
  ```
  Scenario: unassigned bucket visible
    Tool: Bash (bun/vitest)
    Preconditions: one unmapped account in dataset
    Steps:
      1. Run transform tests
      2. Assert resulting hierarchy contains `未割当`
    Expected Result: unmapped items remain visible but isolated
    Evidence: .sisyphus/evidence/task-12-unassigned.txt

  Scenario: excluded bucket hidden
    Tool: Playwright
    Preconditions: one excluded account exists in imported data
    Steps:
      1. Open analysis page
      2. Search for excluded account label
      3. Assert no match in UI
    Expected Result: excluded account completely hidden
    Evidence: .sisyphus/evidence/task-12-excluded-hidden.png
  ```

- [x] 13. Reset global radius token to zero

  **What to do**:
  - Set global radius tokens to 0 and verify shared primitives follow them

  **Must NOT do**:
  - Do not stop after token change without auditing hardcoded rounded utilities

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `design-principles`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 14, 15
  - **Blocked By**: 3

  **References**:
  - `src/index.css`

  **Acceptance Criteria**:
  - [ ] computed border-radius is 0 on token-driven card/button/input/tab examples

  **QA Scenarios**:
  ```
  Scenario: token-driven zero radius
    Tool: Playwright
    Preconditions: local app running after style change
    Steps:
      1. Open page
      2. Query representative button/card/input/tab elements
      3. Read computed `border-radius`
    Expected Result: each computed style equals `0px`
    Evidence: .sisyphus/evidence/task-13-zero-radius.txt
  ```

- [x] 14. Remove hardcoded rounded utility usage from feature/UI components

  **What to do**:
  - Replace explicit `rounded-full` / fixed rounded utilities that violate zero-radius policy

  **Must NOT do**:
  - Do not leave pills/charts/badges as implicit exceptions unless explicitly justified

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `design-principles`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 15
  - **Blocked By**: 3, 13

  **References**:
  - radius audit list from Task 3
  - `src/features/layout/components/time-axis-pills.tsx`
  - `src/components/ui/*`

  **Acceptance Criteria**:
  - [ ] no non-exempt rounded utilities remain in audited target list

  **QA Scenarios**:
  ```
  Scenario: hardcoded rounded cleanup
    Tool: Bash (grep/ast-grep) + Playwright
    Preconditions: audit list exists
    Steps:
      1. Run rounded-usage search
      2. Assert target files no longer contain banned rounded classes
      3. Spot-check computed radius in UI
    Expected Result: hardcoded rounded drift removed
    Evidence: .sisyphus/evidence/task-14-rounded-cleanup.txt
  ```

- [x] 15. Import provided shadcn baseline repo into `.shadcn/` and run design consistency audit

  **What to do**:
  - Bring the provided shadcn baseline repo into `.shadcn/`
  - Compare token definitions, typography, spacing, radius, component surfaces, and interaction states against the live app
  - Generate a concrete mismatch list and use it to drive/verify the visual recovery work in scope

  **Must NOT do**:
  - Do not rely on memory of the baseline repo
  - Do not treat radius parity alone as sufficient design parity

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `ui-ux-pro-max`, `design-principles`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: 16
  - **Blocked By**: 3, 13, 14

  **References**:
  - `https://ui.shadcn.com/create?preset=b1tMK2lJz&item=preview` - provided shadcn baseline source
  - provided shadcn baseline repo under `.shadcn/`
  - `src/index.css`
  - `src/components/ui/*`
  - `src/features/layout/*`

  **Acceptance Criteria**:
  - [ ] baseline repo is present under `.shadcn/`
  - [ ] documented mismatch list exists for radius, spacing, typography, component shape, and interaction states
  - [ ] required mismatches in this scope are resolved or explicitly deferred

  **QA Scenarios**:
  ```
  Scenario: baseline repo presence and audit output
    Tool: Bash + Read
    Preconditions: shadcn baseline URL is `https://ui.shadcn.com/create?preset=b1tMK2lJz&item=preview`
    Steps:
      1. Confirm `.shadcn/` contains the baseline repo files
      2. Read generated design audit artifact
      3. Assert mismatch categories include radius, spacing, typography, and component surfaces
    Expected Result: design parity work is grounded in the actual provided baseline
    Evidence: .sisyphus/evidence/task-15-design-audit.txt
  ```

- [ ] 16. Add end-to-end QA coverage for upload → analysis → table → radius

  **What to do**:
  - Add broad integration/E2E coverage across admin upload, overwrite warning, master save, analysis reflection, accordion table, and zero-radius assertions

  **Must NOT do**:
  - Do not rely on build/tests only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `e2e-testing`, `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 17, FINAL
  - **Blocked By**: 6,7,8,9,10,11,12,13,14,15

  **References**:
  - all prior task outputs

  **Acceptance Criteria**:
  - [ ] E2E proves upload to reflected analysis
  - [ ] E2E proves replacement warning path
  - [ ] E2E proves zero-radius on representative surfaces

  **QA Scenarios**:
  ```
  Scenario: full upload-to-analysis flow
    Tool: Playwright
    Preconditions: local app + test backend + workbook fixtures
    Steps:
      1. Upload a new workbook from 管理
      2. Save with one `未割当` warning
      3. Navigate to analysis
      4. Expand GMV and 売上高
      5. Assert imported rows and values are present
    Expected Result: end-to-end recovery path works
    Evidence: .sisyphus/evidence/task-16-full-flow.png

  Scenario: zero-radius regression
    Tool: Playwright
    Preconditions: app running after style cleanup
    Steps:
      1. Inspect button/card/tab/input/badge/dialog trigger
      2. Read computed `border-radius`
    Expected Result: representative surfaces resolve to `0px`
    Evidence: .sisyphus/evidence/task-16-radius-regression.txt
  ```

- [ ] 17. Run realistic dataset regression and performance verification

  **What to do**:
  - Validate the new source switch, accordion table, and transforms against large workbook sizes closer to real usage
  - Check that virtualization/expansion still behaves acceptably

  **Must NOT do**:
  - Do not verify only tiny fixtures

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: `verification-before-completion`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: FINAL
  - **Blocked By**: 9, 11, 12, 16

  **References**:
  - `src/lib/fixtures/loglass-large.ts` or new realistic workbook fixtures
  - virtualization code in `src/features/analysis/components/shared/detail-table.tsx`

  **Acceptance Criteria**:
  - [ ] large dataset does not break accordion/detail rendering
  - [ ] import/transform path completes within acceptable local verification bounds

  **QA Scenarios**:
  ```
  Scenario: realistic dataset smoke
    Tool: Bash + Playwright
    Preconditions: large workbook fixture exists
    Steps:
      1. Import realistic workbook fixture
      2. Open analysis page
      3. Expand multiple groups and scroll detail area
      4. Assert UI remains responsive and rows render correctly
    Expected Result: no empty/partial rendering for realistic data sizes
    Evidence: .sisyphus/evidence/task-17-large-dataset.txt
  ```

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Verify upload flow, Drive archive, master editing, A/B/C dynamic mapping, GMV ordering, `集計不要` exclusion, and zero-radius outcomes against this plan.

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run typecheck, lint, tests; audit for stray fixture-only production paths, direct `google.script.run` scattering, and leftover rounded utility drift.

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Execute actual upload, overwrite warning, master save with `未割当`, analysis reflection, accordion expansion, and computed-style radius checks. Save evidence under `.sisyphus/evidence/final-qa/`.

- [ ] F4. **Scope Fidelity Check** — `deep`
  Confirm no auth redesign, no separate settings page, no comment system work, no notification/approval overreach, and no chart redesign outside necessary linkage support.

---

## Commit Strategy

- **1**: `feat(domain): define upload and master contracts`
- **2**: `test(import): cover overwrite and abc reassignment`
- **3**: `feat(gas): add upload archive and master apis`
- **4**: `feat(admin): wire structured upload flow`
- **5**: `feat(master): add mapping and order editor`
- **6**: `feat(analysis): switch source to persisted imports`
- **7**: `feat(table): restore accordion detail hierarchy`
- **8**: `style(ui): reset radius tokens and remove rounded drift`
- **9**: `test(e2e): cover upload to analysis regression`

---

## Success Criteria

### Verification Commands
```bash
bun run test               # Expected: all tests pass including new upload/table/radius coverage
bun run build              # Expected: production build succeeds
bun run build:gas          # Expected: GAS artifact build succeeds
```

### Final Checklist
- [ ] 管理画面から xlsx upload できる
- [ ] 同タグ再 upload に差し替え警告が出る
- [ ] Drive に Excel 原本が残る
- [ ] master 編集が即時反映される
- [ ] `未割当` は warning save 可
- [ ] `集計不要` は分析画面で完全非表示
- [ ] GMV が売上高より上にある
- [ ] 詳細テーブルが aggregate accordion で表示される
- [ ] B/A/C が最新/前回/前年として動的に再解釈される
- [ ] representative UI surfaces の radius が 0px
- [ ] `.shadcn/` baseline と比較して対象範囲の design drift が解消される
