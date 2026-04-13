# UI/UX レイアウト全面修正

## TL;DR

> **Quick Summary**: FPA Dashboard のタイポグラフィ（text-xs → text-sm 引上げ）、テーブル列幅の適正化、スペーシング改善、最小限のレスポンシブ対応を行う。視覚のみの変更でロジック変更なし。
> 
> **Deliverables**:
> - theme.ts の TYPOGRAPHY 定数更新（tableHeader, small）
> - shadcn UI コンポーネントのデフォルトフォントサイズ引上げ（Button, Card, Tooltip）
> - テーブル列幅の固定ピクセル → 余裕のある固定幅へ拡張
> - AnalysisHeader / TimeAxisPills のスペーシング改善
> - 最小幅1024pxでの水平オーバーフロー防止
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3-5 (parallel) → Tasks 6-7 (parallel) → F1-F4

---

## Context

### Original Request
ユーザーが「文字がXSサイズで見にくい」と指摘。ui-ux-pro-maxスキルで包括レビューを実施し、タイポグラフィ・レイアウト・コントラスト・スペーシング・レスポンシブの6カテゴリにわたる問題を特定。

### Interview Summary
**Key Discussions**:
- text-xs（12px）がテーブルヘッダー、ボタン、Card、Tooltipで多用されており可読性が低い
- テーブル列幅が固定ピクセルで、text-smにした場合に収まらないリスク
- AnalysisHeaderのコントロール間スペースが狭い（gap-2）
- レスポンシブ対応がほぼない

**Research Findings**:
- theme.tsのTYPOGRAPHY定数は17ファイル90箇所で参照（良い集約度）
- shadcn NovaスタイルのButton/Card/Tooltipが text-xs/relaxed をデフォルトに設定
- テーブルコンポーネント（table.tsx）は既に text-sm 使用済み → 触らない
- gas-dist/は1.5MBの単一HTMLにビルド → GAS環境での動作検証が必要

### Metis Review
**Identified Gaps** (addressed):
- サイドバー折りたたみ → 新機能のため除外（CSS変数のみ存在）
- Badge/Button xs variant → 意図的に小さいため除外
- Chart component → チャート特有の要件のため除外
- Select component → 1箇所のみ、Button変更で相対的に目立たなくなるため除外
- 仮想スクロール行高 → h-10でtext-sm対応可能だが検証必要
- text-xs/relaxed vs text-xs → text-smに統一（/relaxedは外す）

---

## Work Objectives

### Core Objective
FPA Dashboardの全画面でタイポグラフィを text-sm ベースに統一し、テーブルの可読性とレイアウトのバランスを改善する。ロジック・状態管理・データフローへの変更は一切行わない。

### Concrete Deliverables
- `src/lib/ui/theme.ts` の TYPOGRAPHY 定数更新
- `src/index.css` の対応ユーティリティクラス更新
- `src/components/ui/button.tsx` のデフォルトフォントサイズ更新
- `src/components/ui/card.tsx` のデフォルトフォントサイズ更新
- `src/components/ui/tooltip.tsx` のフォントサイズ更新
- `src/features/analysis/components/detail/aggregate-accordion-table.tsx` の列幅拡張
- `src/features/layout/components/analysis-header.tsx` のスペーシング改善
- `src/features/layout/components/time-axis-pills.tsx` のスペーシング改善
- `src/features/admin/components/master-save-bar.tsx` のフォントサイズ修正

### Definition of Done
- [ ] `bun run build` が成功（exit 0）
- [ ] `bun run build:gas` が成功（exit 0）
- [ ] `bun run test` が全テスト成功
- [ ] `grep "text-xs" src/lib/ui/theme.ts` が 0 マッチ
- [ ] `grep "font-mono.*tabular-nums" src/lib/ui/theme.ts` が 2 マッチ（financial + financialLg 変更なし）
- [ ] agent-browser で1024×768表示時に水平スクロールなし

### Must Have
- theme.ts の tableHeader, small を text-sm ベースに更新
- Button default/sm/lg の text-xs/relaxed → text-sm
- Card container の text-xs/relaxed → text-sm
- Tooltip の text-xs → text-sm
- テーブル列幅の拡張（科目名 200→240px 等）
- AnalysisHeader gap-2 → gap-3
- 全ビルド・テストの通過

### Must NOT Have (Guardrails)
- **金融タイポグラフィの変更禁止**: `TYPOGRAPHY.financial`, `TYPOGRAPHY.financialLg` は一切変更しない
- **Button xs variant / Badge の変更禁止**: 意図的に小さいサイズなので触らない
- **Table コンポーネントの変更禁止**: 既に text-sm なので変更不要
- **サイドバー折りたたみの実装禁止**: 新機能のため別プラン扱い
- **Chart / Select コンポーネントの変更禁止**: スコープ外
- **ロジック・状態・データフローの変更禁止**: 視覚のみの変更
- **新しいコンポーネントの作成禁止**: 既存コンポーネントの修正のみ
- **アニメーションの追加禁止**: スコープ外

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES（Vitest + React Testing Library）
- **Automated tests**: Tests-after（既存テストの回帰確認のみ。新規テストは書かない）
- **Framework**: Vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: Bash (`bun run build`, `bun run build:gas`)
- **Test regression**: Bash (`bun run test`)
- **Grep verification**: Bash (`grep` で text-xs 残存確認)
- **Visual verification**: agent-browser（1024×768 でスクリーンショット）

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - theme constants):
├── Task 1: theme.ts + index.css タイポグラフィ定数更新 [quick]

Wave 2 (shadcn components - parallel):
├── Task 2: Button component text-xs → text-sm [quick]
├── Task 3: Card component text-xs → text-sm [quick]
├── Task 4: Tooltip component text-xs → text-sm [quick]

Wave 3 (Feature components - parallel after Wave 1+2):
├── Task 5: テーブル列幅の拡張（aggregate-accordion-table） [quick]
├── Task 6: AnalysisHeader / TimeAxisPills スペーシング改善 [quick]
├── Task 7: Admin feature の text-xs 残存修正 [quick]

Wave 4 (Layout refinement):
├── Task 8: 最小幅対応とレイアウト微調整 [unspecified-high]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Visual QA at 1024×768 (unspecified-high)
├── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 5, 6, 7 | 1 |
| 2 | - | 5, 6, 7, F2 | 2 |
| 3 | - | 5, 6, 7, F2 | 2 |
| 4 | - | 5, 6, 7, F2 | 2 |
| 5 | 1 | 8, F1-F4 | 3 |
| 6 | 1 | 8, F1-F4 | 3 |
| 7 | 1 | 8, F1-F4 | 3 |
| 8 | 5, 6, 7 | F1-F4 | 4 |
| F1 | 8 | user okay | FINAL |
| F2 | 8 | user okay | FINAL |
| F3 | 8 | user okay | FINAL |
| F4 | 8 | user okay | FINAL |

### Agent Dispatch Summary

- **Wave 1**: 1 task — T1 → `quick`
- **Wave 2**: 3 tasks — T2-T4 → `quick`
- **Wave 3**: 3 tasks — T5-T7 → `quick`
- **Wave 4**: 1 task — T8 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Theme Foundation: タイポグラフィ定数更新（theme.ts + index.css）

  **What to do**:
  - `src/lib/ui/theme.ts` の `TYPOGRAPHY.tableHeader` を `"text-xs font-medium uppercase tracking-wider text-muted-foreground"` → `"text-sm font-medium uppercase tracking-wider text-muted-foreground"` に変更
  - `src/lib/ui/theme.ts` の `TYPOGRAPHY.small` を `"text-xs text-muted-foreground"` → `"text-sm text-muted-foreground"` に変更
  - `TYPOGRAPHY.financial` と `TYPOGRAPHY.financialLg` は一切変更しない（確認のみ）
  - `src/index.css` の対応ユーティリティクラス（`.text-table-header`, `.text-meta` 等）が存在する場合、同じように text-xs → text-sm に更新
  - 変更後に `lsp_find_references` で TYPOGRAPHY 参照先を確認し、壊れていないことを確認

  **Must NOT do**:
  - financial, financialLg の変更
  - SPACING, FINANCIAL_COLORS, CHART_COLORS, LAYOUT の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1ファイルの定数変更のみ、機械的な作業
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1 (standalone)
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `src/lib/ui/theme.ts` — 全TYPOGRAPHY定数の定義場所。tableHeader, smallの2つを変更
  - `src/index.css` — CSSユーティリティクラス定義。`.text-table-header` 等が theme.ts と同期しているか確認

  **API/Type References**:
  - `src/lib/ui/theme.ts:TYPOGRAPHY` — 17ファイル90箇所で参照。変更後も同じキー名を維持

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Theme constants updated correctly
    Tool: Bash (grep)
    Preconditions: theme.ts modified
    Steps:
      1. grep "text-xs" src/lib/ui/theme.ts
      2. Expected: 0 matches
      3. grep "text-sm font-medium uppercase" src/lib/ui/theme.ts
      4. Expected: 1 match (tableHeader)
      5. grep "font-mono.*tabular-nums" src/lib/ui/theme.ts
      6. Expected: 2 matches (financial + financialLg unchanged)
    Expected Result: tableHeader and small use text-sm, financial classes untouched
    Evidence: .sisyphus/evidence/task-1-theme-constants.txt

  Scenario: Tests pass after theme change
    Tool: Bash
    Preconditions: theme.ts and index.css modified
    Steps:
      1. bun run test
      2. Expected: all tests pass, 0 failures
    Expected Result: No regressions from theme constant change
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-1-test-results.txt
  ```

  **Commit**: YES
  - Message: `fix(ui): upgrade theme typography from text-xs to text-sm`
  - Files: `src/lib/ui/theme.ts`, `src/index.css`
  - Pre-commit: `bun run test`

- [ ] 2. shadcn Button: text-xs/relaxed → text-sm

  **What to do**:
  - `src/components/ui/button.tsx` のベースクラス（7行目）の `text-xs/relaxed` → `text-sm` に変更
  - `sm` サイズバリアント（26行目）の `text-xs/relaxed` → `text-sm` に変更
  - `lg` サイズバリアント（27行目）の `text-xs/relaxed` → `text-sm` に変更
  - **`xs` サイズバリアント（24行目）は変更しない** — 意図的に小さい
  - `xs` バリアントは `text-[0.625rem]` のままで維持
  - 変更箇所に `/* custom: upgraded from text-xs/relaxed */` コメントを追加（shadcn再生成時の目印）

  **Must NOT do**:
  - xs バリアントの変更（`text-[0.625rem]` を維持）
  - icon バリアントの変更（テキストなし）
  - variant定義（default, outline等）の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1ファイルの3箇所のクラス名変更のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/ui/button.tsx:7` — ベースクラス定義。`text-xs/relaxed` → `text-sm`
  - `src/components/ui/button.tsx:24-27` — サイズバリアント。default, sm, lg を変更。xs は変更しない

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Button default/sm/lg upgraded
    Tool: Bash (grep)
    Preconditions: button.tsx modified
    Steps:
      1. grep "text-xs" src/components/ui/button.tsx
      2. Expected: 1 match only (xs variant, line 24: text-[0.625rem] not text-xs)
      3. grep "text-sm" src/components/ui/button.tsx
      4. Expected: 3+ matches (base + sm + lg variants)
    Expected Result: Only xs variant retains small text
    Evidence: .sisyphus/evidence/task-2-button-sizes.txt

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. bun run build
      2. Expected: exit 0
    Expected Result: No build errors
    Evidence: .sisyphus/evidence/task-2-build.txt
  ```

  **Commit**: NO (groups with Task 3, 4)
  - Files: `src/components/ui/button.tsx`

- [ ] 3. shadcn Card: text-xs/relaxed → text-sm

  **What to do**:
  - `src/components/ui/card.tsx` の Card container（15行目）の `text-xs/relaxed` → `text-sm` に変更
  - CardDescription（50行目）の `text-xs/relaxed` → `text-sm` に変更
  - 変更箇所に `/* custom: upgraded from text-xs/relaxed */` コメントを追加

  **Must NOT do**:
  - CardTitle（text-sm）の変更 — 既に正しいサイズ
  - size="sm" バリアント構造の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1ファイルの2箇所のクラス名変更のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/ui/card.tsx:15` — Card container。`text-xs/relaxed` → `text-sm`
  - `src/components/ui/card.tsx:50` — CardDescription。`text-xs/relaxed` → `text-sm`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Card default text upgraded
    Tool: Bash (grep)
    Steps:
      1. grep "text-xs" src/components/ui/card.tsx
      2. Expected: 0 matches
    Expected Result: No text-xs remaining in card component
    Evidence: .sisyphus/evidence/task-3-card-sizes.txt

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. bun run build
      2. Expected: exit 0
    Evidence: .sisyphus/evidence/task-3-build.txt
  ```

  **Commit**: NO (groups with Tasks 2, 4)

- [ ] 4. shadcn Tooltip: text-xs → text-sm

  **What to do**:
  - `src/components/ui/tooltip.tsx` の TooltipContent（51行目）の `text-xs` → `text-sm` に変更
  - 変更箇所に `/* custom: upgraded from text-xs */` コメントを追加

  **Must NOT do**:
  - アニメーションクラスの変更
  - kbd関連スタイルの変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1ファイルの1箇所のクラス名変更のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 5, 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/ui/tooltip.tsx:51` — TooltipContent base class

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tooltip text upgraded
    Tool: Bash (grep)
    Steps:
      1. grep "text-xs" src/components/ui/tooltip.tsx
      2. Expected: 0 matches
    Expected Result: No text-xs remaining in tooltip
    Evidence: .sisyphus/evidence/task-4-tooltip-sizes.txt
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `fix(ui): upgrade shadcn button/card/tooltip default font to text-sm`
  - Files: `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, `src/components/ui/tooltip.tsx`
  - Pre-commit: `bun run build`

- [ ] 5. テーブル列幅の拡張（aggregate-accordion-table.tsx）

  **What to do**:
  - `src/features/analysis/components/detail/aggregate-accordion-table.tsx` のヘッダー行（115-119行）の列幅を拡張:
    - 科目名: `w-[200px]` → `w-[240px]`（text-smで長い日本語科目名が収まるように）
    - B列: `w-[120px]` → `w-[130px]`
    - B-A列: `w-[100px]` → `w-[110px]`
    - C列: `w-[120px]` → `w-[130px]`
    - B-C列: `w-[100px]` → `w-[110px]`
  - ヘッダーの `TYPOGRAPHY.tableHeader` は Task 1 で既に text-sm に更新済み
  - 合計幅: 240+130+110+130+110 = 720px。サイドバー220px抜いて1024-220=804px内に収まることを確認
  - `aggregate-group.tsx` のデータ行も同じ列幅パターンを使用している場合は同様に更新

  **Must NOT do**:
  - 列を完全 flexible にすること（金融データの整列が崩れる）
  - テーブルのスクロール動作の変更
  - sticky header の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1-2ファイルの固定幅数値変更のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 6, 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/features/analysis/components/detail/aggregate-accordion-table.tsx:112-121` — ヘッダー行の列幅定義
  - `src/features/analysis/components/detail/aggregate-group.tsx` — データ行も同じ列幅パターンを使用しているか確認

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Table column widths updated
    Tool: Bash (grep)
    Steps:
      1. grep "w-\[200px\]" src/features/analysis/components/detail/aggregate-accordion-table.tsx
      2. Expected: 0 matches (old width gone)
      3. grep "w-\[240px\]" src/features/analysis/components/detail/aggregate-accordion-table.tsx
      4. Expected: 1+ match (new width present)
    Expected Result: Column widths expanded
    Evidence: .sisyphus/evidence/task-5-column-widths.txt

  Scenario: Build and tests pass
    Tool: Bash
    Steps:
      1. bun run build && bun run test
      2. Expected: both exit 0
    Evidence: .sisyphus/evidence/task-5-build-test.txt
  ```

  **Commit**: NO (groups with Tasks 6, 7)

- [ ] 6. AnalysisHeader / TimeAxisPills スペーシング改善

  **What to do**:
  - `src/features/layout/components/analysis-header.tsx`:
    - 行39の `space-y-2` → `space-y-3` に変更（行間を8px→12pxに）
    - 行40の `gap-2` → `gap-3` に変更（コントロール間スペースを8px→12pxに）
    - 行39の `px-4 py-3` → `px-5 py-3` に変更（左右パディングを16px→20pxに）
  - `src/features/layout/components/time-axis-pills.tsx`:
    - 行13の `gap-1` → `gap-2` に変更（pill間スペースを4px→8pxに）
    - Button の `px-3` → `px-3.5` に変更（pill内パディングを少し広く）

  **Must NOT do**:
  - コンポーネントの構造・ロジックの変更
  - MonthPicker, ScenarioSelect, OrgDropdown コンポーネント自体の変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 2ファイルのTailwindクラス微調整のみ
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 7)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/features/layout/components/analysis-header.tsx:39-47` — ヘッダーレイアウト
  - `src/features/layout/components/time-axis-pills.tsx:13-30` — pill ボタンのレイアウト

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Spacing classes updated
    Tool: Bash (grep)
    Steps:
      1. grep "space-y-2" src/features/layout/components/analysis-header.tsx
      2. Expected: 0 matches
      3. grep "space-y-3" src/features/layout/components/analysis-header.tsx
      4. Expected: 1 match
      5. grep "gap-1" src/features/layout/components/time-axis-pills.tsx
      6. Expected: 0 matches
    Expected Result: All spacing classes upgraded
    Evidence: .sisyphus/evidence/task-6-spacing.txt

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. bun run build
      2. Expected: exit 0
    Evidence: .sisyphus/evidence/task-6-build.txt
  ```

  **Commit**: NO (groups with Tasks 5, 7)

- [ ] 7. Admin feature の text-xs 残存修正

  **What to do**:
  - `src/features/admin/components/master-save-bar.tsx`:
    - 行40の `<span className="text-xs text-muted-foreground">` → `<span className="text-sm text-muted-foreground">` に変更
  - `src/features/admin/components/import-log.tsx`, `upload-status.tsx` 等にハードコード `text-xs` がある場合は `text-sm` に変更
  - ただし **意図的に小さいメタデータ**（タイムスタンプ等）は text-xs のまま維持
  - TYPOGRAPHY.small を使っている箇所は Task 1 の変更で自動的に text-sm になるため触らない

  **Must NOT do**:
  - Badge コンポーネント内の text-xs 変更
  - テーブルヘッダーで TYPOGRAPHY.tableHeader を使っている箇所（Task 1で自動対応）
  - 管理画面のロジック・状態変更

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 1-3ファイルのクラス名微修正
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 5, 6)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/features/admin/components/master-save-bar.tsx:40` — text-xs のハードコード箇所
  - grepで `text-xs` を検索して残存箇所を確認

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Admin text-xs removed
    Tool: Bash (grep)
    Steps:
      1. grep -rn "text-xs" src/features/admin/components/master-save-bar.tsx
      2. Expected: 0 matches
    Expected Result: Primary content text-xs removed from admin components
    Evidence: .sisyphus/evidence/task-7-admin-text-xs.txt

  Scenario: Build and tests pass
    Tool: Bash
    Steps:
      1. bun run build && bun run test
      2. Expected: both exit 0
    Evidence: .sisyphus/evidence/task-7-build-test.txt
  ```

  **Commit**: YES (groups with Tasks 5, 6)
  - Message: `fix(ui): widen table columns and improve spacing across layouts`
  - Files: `aggregate-accordion-table.tsx`, `aggregate-group.tsx`, `analysis-header.tsx`, `time-axis-pills.tsx`, `master-save-bar.tsx`, and other admin files as needed
  - Pre-commit: `bun run build && bun run test`

- [ ] 8. 最小幅対応とレイアウト微調整

  **What to do**:
  - `src/lib/ui/theme.ts` の `LAYOUT.mainContentMinWidth: "800px"` は現状維持（1024-220=804pxでちょうど収まる）
  - `app-shell.tsx` のメインコンテンツエリアに `min-w-0` を追加（flex child が縮まない問題の防止）
  - admin page のコンテンツが1024px幅でオーバーフローしないか確認
  - 必要に応じて `overflow-x-hidden` を適切な箇所に追加
  - `bun run build:gas` でGAS用ビルドも成功することを確認

  **Must NOT do**:
  - レスポンシブブレークポイントの追加（スコープ外）
  - サイドバー折りたたみの実装
  - モバイル対応の追加

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 複数ファイルの横断確認と微調整が必要。レイアウトの崩れを見つける必要がある
  - **Skills**: [`agent-browser`]
    - `agent-browser`: 1024×768での表示確認に必要

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all Wave 3 tasks)
  - **Parallel Group**: Wave 4 (standalone)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 5, 6, 7

  **References**:

  **Pattern References**:
  - `src/features/layout/components/app-shell.tsx:29-66` — メインレイアウト構造
  - `src/lib/ui/theme.ts:36-40` — LAYOUT定数

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No overflow at 1024px
    Tool: agent-browser
    Preconditions: Dev server running (bun run dev)
    Steps:
      1. Navigate to http://localhost:5173 at 1024×768 viewport
      2. Take screenshot of Analysis page (PL内訳 tab)
      3. Navigate to Admin page
      4. Take screenshot of Admin page
      5. Check for horizontal scrollbar on main content area
    Expected Result: No horizontal overflow on either page at 1024×768
    Failure Indicators: Horizontal scrollbar present, content clipped
    Evidence: .sisyphus/evidence/task-8-1024-analysis.png, .sisyphus/evidence/task-8-1024-admin.png

  Scenario: GAS build succeeds
    Tool: Bash
    Steps:
      1. bun run build:gas
      2. Expected: exit 0, gas-dist/index.html exists and >0 bytes
    Evidence: .sisyphus/evidence/task-8-gas-build.txt
  ```

  **Commit**: YES
  - Message: `fix(ui): ensure no overflow at 1024px minimum width`
  - Files: layout files as needed
  - Pre-commit: `bun run build && bun run build:gas`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep pattern). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build && bun run build:gas && bun run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Verify no accidental logic changes.
  Output: `Build [PASS/FAIL] | GAS Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Visual QA** — `unspecified-high` (+ `agent-browser` skill)
  Start dev server (`bun run dev`). Use agent-browser to navigate at 1024×768 viewport. Take screenshots of: Analysis page (PL内訳 tab), Admin page, sidebar, header controls. Verify: no horizontal overflow, text readable, tables not clipped, financial numbers aligned.
  Evidence: `.sisyphus/evidence/final-qa/` にスクリーンショット保存.
  Output: `Screenshots [N/N] | Overflow [NONE/FOUND] | Readability [OK/ISSUES] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `fix(ui): upgrade theme typography from text-xs to text-sm` | theme.ts, index.css | `bun run test` |
| 2 | `fix(ui): upgrade shadcn button/card/tooltip default font to text-sm` | button.tsx, card.tsx, tooltip.tsx | `bun run build` |
| 3 | `fix(ui): widen table columns and improve header spacing` | aggregate-accordion-table.tsx, analysis-header.tsx, time-axis-pills.tsx, master-save-bar.tsx | `bun run build` |
| 4 | `fix(ui): ensure no overflow at 1024px minimum width` | app-shell.tsx or layout files | `bun run build && bun run build:gas` |

---

## Success Criteria

### Verification Commands
```bash
bun run build                  # Expected: exit 0
bun run build:gas              # Expected: exit 0
bun run test                   # Expected: all tests pass
grep "text-xs" src/lib/ui/theme.ts  # Expected: 0 matches
grep "font-mono.*tabular-nums" src/lib/ui/theme.ts  # Expected: 2 matches (unchanged)
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Both builds succeed (web + GAS)
- [ ] No horizontal overflow at 1024×768
