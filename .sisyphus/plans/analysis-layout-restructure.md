# AnalysisWorkspace レイアウト再構築

## TL;DR

> **Quick Summary**: AnalysisWorkspaceのレイアウトをPRD準拠に再構築する。MajorAccountSummary（カード5枚）とTrendPanel/DifferencePanelの横並びを削除し、タブ切替方式（PL内訳 / GMV比率 / 推移グラフ / 差異分解）に変更する。科目名列の過剰な幅拡大を修正し、PRD 7.8に基づくGMV比率テーブルを新規追加する。
> 
> **Deliverables**:
> - タブ切替UI（PL内訳 / GMV比率 / 推移グラフ / 差異分解）
> - GMV比率テーブル（PL科目 × GMV比率表示）
> - 科目名列の幅修正
> - MajorAccountSummary / 差異分解アカウントサマリーの削除
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 6 → Task 7

---

## Context

### Original Request
ユーザーが画面上の3箇所を指摘：
1. MajorAccountSummary カード5枚 → 「無意味、広すぎる」
2. TrendPanel + DifferencePanel 横並び → 「無意味、TrendPanelは初期空」
3. DetailPanel の科目名列 → 「無意味に広がってる」

追加要望：
- PRD 7.8のGMV比率テーブルが存在しないため追加
- タブ（カルーセル）でグラフに切り替え
- 差異分解のアカウントサマリーは不要
- 推移グラフは月別折れ線（shadcn Chart / recharts）

### Interview Summary
**Key Discussions**:
- PL内訳テーブルとGMV比率テーブルは独立した表。両方ともテーブルがデフォルト表示
- GMV比率テーブル = PL科目をGMVで除算したパーセント表示（売上高/GMV, 売上原価/GMV 等）
- タブのデフォルトは各テーブル。推移グラフ・差異分解は切替で表示
- MajorAccountSummary は完全削除

**Research Findings**:
- GMV勘定: SaaS GMV / 広告 GMV / EC GMV / GMV（master-schema.ts、isGmv: true）
- `formatGmvRatio(numerator, denominator)` が既に実装済み（src/lib/format/rate.ts）
- `selectSummaryRows` は主要勘定のみフィルタ（GMVは含まず）
- Tabs component が `@base-ui/react/tabs` で実装済み（line variantあり）
- `activeSubView` state が既に存在（"trend" | "table"）→ 4値に拡張必要

### Metis Review
**Identified Gaps** (addressed):
- デフォルトタブ → ユーザー決定: テーブル（PL内訳）がデフォルト
- GMV比率テーブルの意味 → PRD 7.8「比率の標準分母はGMV」。科目/GMV比率表
- Cross-tab弱連動 → 差異分解バーClick → PL内訳タブに切替 + scroll + highlight
- 科目名列幅 → flex-1 を固定幅に変更

---

## Work Objectives

### Core Objective
AnalysisWorkspaceのレイアウトをタブ切替方式に再構築し、GMV比率テーブルを追加する。

### Concrete Deliverables
- `analysis-workspace.tsx` のレイアウト変更（Tabs-based）
- `selectGmvRatios` セレクタ新規追加
- `GmvRatioPanel` コンポーネント新規追加
- `activeSubView` state の4値拡張
- MajorAccountSummary / SummaryCard の削除
- AggregateAccordionTable の科目名列幅修正

### Definition of Done
- [ ] `bunx vitest run src/features/analysis/` → ALL PASS
- [ ] PL内訳タブにAggregateAccordionTableが表示される
- [ ] GMV比率タブに科目/GMV比率が表示される
- [ ] 推移グラフタブに折れ線グラフが表示される
- [ ] 差異分解タブに横棒グラフが表示される
- [ ] MajorAccountSummaryが画面に存在しない
- [ ] 科目名列が200px固定幅（flex-1ではない）

### Must Have
- 4タブ切替（PL内訳 / GMV比率 / 推移グラフ / 差異分解）
- GMV比率テーブル（各科目のB/GMV, B-A/GMV変化 etc.）
- 科目名列の幅修正（flex-1 → 固定幅）
- 既存チャートコンポーネントの再利用（TrendChart, DifferenceChart）
- PanelErrorBoundaryの維持

### Must NOT Have (Guardrails)
- MajorAccountSummary / SummaryCard の残存（完全削除）
- 差異分解タブ内のアカウントサマリー（ユーザー明示的に不要）
- 共有チャートコンポーネント（trend-chart.tsx, difference-chart.tsx）の改変
- セレクタの計算ロジック変更（selectTrendSeries, selectDifferenceData は不変）
- 新しいstate管理概念の追加（既存reducerパターンの拡張のみ）
- formatGmvRatio()を超える複雑な比率計算ロジック

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (Tests-after)
- **Framework**: vitest

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Component tests**: `bunx vitest run <test-file>`
- **Type check**: `bunx tsc --noEmit`
- **Visual**: Playwright screenshot for layout verification

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - state + data layer):
├── Task 1: activeSubView state の4値拡張 [quick]
├── Task 2: selectGmvRatios セレクタ新規追加 [deep]
└── Task 3: 科目名列の幅修正 [quick]

Wave 2 (After Wave 1 - UI components):
├── Task 4: GmvRatioPanel コンポーネント新規追加 (depends: 2) [unspecified-high]
└── Task 5: AnalysisWorkspace タブ化リファクタ (depends: 1, 3) [deep]

Wave 3 (After Wave 2 - cleanup + integration):
├── Task 6: MajorAccountSummary / SummaryCard の削除 (depends: 5) [quick]
└── Task 7: Cross-tab弱連動の実装 (depends: 5) [unspecified-high]

Wave FINAL (After ALL tasks):
├── F1: Plan compliance audit [oracle]
├── F2: Code quality review [unspecified-high]
├── F3: Visual QA [unspecified-high]
└── F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 5 → Task 6 → F1-F4
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | - | 5 | 1 |
| 2 | - | 4 | 1 |
| 3 | - | 5 | 1 |
| 4 | 2 | 5, 7 | 2 |
| 5 | 1, 3, 4 | 6, 7 | 2 |
| 6 | 5 | F1-F4 | 3 |
| 7 | 5 | F1-F4 | 3 |

### Agent Dispatch Summary

- **Wave 1**: 3 - T1 → `quick`, T2 → `deep`, T3 → `quick`
- **Wave 2**: 2 - T4 → `unspecified-high`, T5 → `deep`
- **Wave 3**: 2 - T6 → `quick`, T7 → `unspecified-high`
- **FINAL**: 4 - F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. activeSubView state の4値拡張

  **What to do**:
  - `src/features/analysis/state/use-analysis-state.ts` の `activeSubView` 型を `"trend" | "table"` から `"pl" | "gmv" | "trend" | "difference"` に変更
  - デフォルト値を `"pl"` に設定（PL内訳テーブルがデフォルト）
  - reducer の `SET_ACTIVE_SUB_VIEW` アクションの型を更新
  - 既存テストの該当箇所を修正
  - `lsp_find_references` で `activeSubView` の全参照を確認し漏れなく更新

  **Must NOT do**:
  - 新しいstate管理概念の追加
  - reducerパターンの変更（拡張のみ）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 型定義の変更とテスト更新のみ。ロジック変更なし
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `systematic-debugging`: バグではないため

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/features/analysis/state/use-analysis-state.ts` — 現在のstate定義。`activeSubView: "trend" | "table"` を4値に拡張する
  - `src/features/analysis/state/analysis-state.test.ts` — 既存テスト。DEFAULT_STATEのactiveSubViewとdispatchテストを更新

  **API/Type References**:
  - `src/features/analysis/state/use-analysis-state.ts:AnalysisActions` — setSelectedAccount等。setActiveSubViewアクションの引数型を変更

  **WHY Each Reference Matters**:
  - use-analysis-state.ts: 型定義の変更対象。現在の`"trend" | "table"`を確認
  - analysis-state.test.ts: テストの期待値を新しい4値に更新

  **Acceptance Criteria**:

  - [ ] `bunx vitest run src/features/analysis/state/analysis-state.test.ts` → ALL PASS
  - [ ] `activeSubView` の型が `"pl" | "gmv" | "trend" | "difference"` である
  - [ ] DEFAULT_STATE.activeSubView === "pl" である
  - [ ] `lsp_find_references` で `activeSubView` の全箇所が更新されている

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: State type extension — 4 values accepted
    Tool: Bash (vitest)
    Preconditions: use-analysis-state.ts updated with new type
    Steps:
      1. bunx vitest run src/features/analysis/state/analysis-state.test.ts
      2. Assert all tests pass (0 failures)
    Expected Result: All tests pass with new 4-value activeSubView type
    Failure Indicators: Type errors, test failures referencing old "trend"|"table" values
    Evidence: .sisyphus/evidence/task-1-state-extension.txt

  Scenario: Default value is "pl"
    Tool: Bash (vitest)
    Preconditions: State updated
    Steps:
      1. bunx vitest run src/features/analysis/state/analysis-state.test.ts -t "default"
      2. Assert DEFAULT_STATE.activeSubView === "pl"
    Expected Result: Default state has activeSubView "pl"
    Failure Indicators: "trend" or "table" as default value
    Evidence: .sisyphus/evidence/task-1-default-value.txt
  ```

  **Commit**: YES
  - Message: `refactor(analysis): extend activeSubView to support 4 tabs`
  - Files: `use-analysis-state.ts, analysis-state.test.ts`
  - Pre-commit: `bunx vitest run src/features/analysis/state/`

- [ ] 2. selectGmvRatios セレクタ新規追加

  **What to do**:
  - `src/features/analysis/lib/summary.ts` に `selectGmvRatios` 関数を追加
  - PL各科目（売上高、売上原価、売上総利益、販管費、営業利益）の A/B/BA/C/BC をGMV合計値で除算した比率を返す
  - GMV合計値の取得: comparisonData から aggregateAccountName === "GMV" の行を探し、その B 値を分母とする
  - 戻り値の型 `GmvRatioRow` を定義: `{ accountName, B_ratio, BA_ratio, C_ratio, BC_ratio, A_ratio }`（各値は number | null、null は分母0またはデータなし）
  - `src/features/analysis/lib/selectors.ts` から re-export
  - テストを追加（正常ケース、GMVデータなし、GMV=0のエッジケース）

  **Must NOT do**:
  - 既存セレクタ（selectSummaryRows等）の変更
  - formatGmvRatio()の変更（既存のものをそのまま使用）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 新しいデータ変換ロジックの設計と実装。エッジケース（GMV=0, null）の処理が必要
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `supabase-postgres-best-practices`: DB関連ではない

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/features/analysis/lib/summary.ts:selectSummaryRows` — 既存セレクタのパターン。filter→map→sort の流れを踏襲する
  - `src/features/analysis/lib/summary.ts:SummaryRow` — 既存の行型。GmvRatioRowも同様の構造にする

  **API/Type References**:
  - `src/lib/format/rate.ts:formatGmvRatio(numerator, denominator)` — GMV比率のフォーマット。null/0/undefinedのハンドリング済み
  - `src/lib/domain/master-schema.ts:76-79` — GMV勘定定義。SaaS GMV, 広告 GMV, EC GMV, GMV の4つが `isGmv: true` で `aggregateAccountName: "GMV"`
  - `src/features/admin/lib/normalize-loglass.ts:ComparisonSet` — comparisonDataの型。rowKey, accountName, A, B, BA, C, BC を持つ

  **Test References**:
  - `src/features/analysis/lib/__tests__/comparison-resolver.test.ts` — ComparisonSetのfixture作成パターン

  **WHY Each Reference Matters**:
  - summary.ts: セレクタの既存パターン（filter→map→sort）。同じ構造で追加
  - formatGmvRatio: 比率フォーマットの再利用。自分で計算ロジックを書かない
  - master-schema.ts: GMV勘定の定義。どのaccountNameがGMVかを判定する基準
  - ComparisonSet: 入力データの型。A, B, BA, C, BCフィールドの構造

  **Acceptance Criteria**:

  - [ ] `bunx vitest run src/features/analysis/lib/` → ALL PASS（新規テスト含む）
  - [ ] `selectGmvRatios` が SummaryRow[] 形式で各科目のGMV比率を返す
  - [ ] GMVデータなし → 全比率 null
  - [ ] GMV = 0 → 全比率 null（formatGmvRatioの仕様）
  - [ ] selectors.ts から re-export されている

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GMV ratios calculated correctly
    Tool: Bash (vitest)
    Preconditions: selectGmvRatios implemented with test fixtures
    Steps:
      1. Create fixture: GMV B=10000, 売上高 B=7300
      2. Call selectGmvRatios(comparisonData, "ALL", "着地見込")
      3. Assert 売上高.B_ratio === 0.73 (7300/10000)
    Expected Result: Each PL account ratio = account value / GMV total
    Failure Indicators: Ratios not matching expected values, null where data exists
    Evidence: .sisyphus/evidence/task-2-gmv-ratios-correct.txt

  Scenario: GMV data missing — all ratios null
    Tool: Bash (vitest)
    Preconditions: No GMV accounts in comparisonData
    Steps:
      1. Create fixture without GMV accounts
      2. Call selectGmvRatios
      3. Assert all ratio fields are null
    Expected Result: Every ratio is null when GMV total cannot be determined
    Failure Indicators: Non-null ratios when GMV is absent
    Evidence: .sisyphus/evidence/task-2-gmv-missing.txt

  Scenario: GMV total is zero — all ratios null
    Tool: Bash (vitest)
    Preconditions: GMV B=0 in data
    Steps:
      1. Create fixture with GMV B=0
      2. Call selectGmvRatios
      3. Assert all ratio fields are null (division by zero protection)
    Expected Result: null for all ratios (formatGmvRatio handles this)
    Failure Indicators: Infinity, NaN, or 0 instead of null
    Evidence: .sisyphus/evidence/task-2-gmv-zero.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): add selectGmvRatios selector`
  - Files: `summary.ts, selectors.ts, new test file`
  - Pre-commit: `bunx vitest run src/features/analysis/lib/`

- [ ] 3. 科目名列の幅修正

  **What to do**:
  - `src/features/analysis/components/detail/aggregate-accordion-table.tsx:115` の科目名ヘッダーの `flex-1 min-w-[120px]` を `w-[200px]` に変更
  - `src/features/analysis/components/detail/aggregate-group.tsx:107` の科目名セルの `flex-1 text-left min-w-[120px]` を `w-[200px] text-left` に変更
  - `aggregate-group.tsx:154` の明細行科目名 `min-w-[200px]` はそのまま（200pxで統一）
  - `aggregate-accordion-table.tsx:113` のヘッダー行の `flex items-center` レイアウトを維持しつつ科目名だけ固定幅に

  **Must NOT do**:
  - データ構造の変更
  - テーブルのcolgroup/col定義の変更（aggregate-group.tsx:132-139 は固定幅なので触らない）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: CSS classの変更のみ。2ファイル、数行の変更
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `design-principles`: CSS変更のみでデザイン設計不要

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/features/analysis/components/detail/aggregate-accordion-table.tsx:112-120` — ヘッダー行。科目名が `flex-1 min-w-[120px]`、数値列は固定幅（B=120px, B-A=100px, C=120px, B-C=100px）
  - `src/features/analysis/components/detail/aggregate-group.tsx:106-128` — 集計行ボタン。科目名が `flex-1 text-left min-w-[120px]`、同じ固定幅の数値列

  **WHY Each Reference Matters**:
  - ヘッダー行とデータ行の両方で科目名がflex-1になっている。両方を固定幅に変更する必要がある
  - 数値列の固定幅（B=120px等）は変更不要。科目名だけが過剰に広がっている原因

  **Acceptance Criteria**:

  - [ ] 科目名ヘッダーが `flex-1` クラスを持たない
  - [ ] 科目名ヘッダーが `w-[200px]` クラスを持つ
  - [ ] `bunx vitest run src/features/analysis/components/detail/` → ALL PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Column width fixed to 200px
    Tool: Bash (vitest)
    Preconditions: CSS classes updated
    Steps:
      1. bunx vitest run src/features/analysis/components/detail/aggregate-accordion-table.test.ts
      2. Assert 科目名 header does NOT contain "flex-1" in rendered class
      3. Assert 科目名 header contains "w-[200px]" in rendered class
    Expected Result: 科目名 column has fixed 200px width, no flex-1 expansion
    Failure Indicators: "flex-1" still present in 科目名 class
    Evidence: .sisyphus/evidence/task-3-column-width.txt

  Scenario: Existing detail table tests still pass
    Tool: Bash (vitest)
    Preconditions: CSS change applied
    Steps:
      1. bunx vitest run src/features/analysis/components/detail/
      2. Assert 0 test failures
    Expected Result: All existing tests pass with new column width
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-3-tests-pass.txt
  ```

  **Commit**: YES
  - Message: `fix(analysis): fix account name column width in detail table`
  - Files: `aggregate-accordion-table.tsx, aggregate-group.tsx`
  - Pre-commit: `bunx vitest run src/features/analysis/components/detail/`

- [ ] 4. GmvRatioPanel コンポーネント新規追加

  **What to do**:
  - `src/features/analysis/components/summary/gmv-ratio-panel.tsx` を新規作成
  - PL科目（売上高、売上原価、売上総利益、販管費、営業利益）の各行にGMV比率を表示
  - 列構成: `科目名 | B/GMV比率 | B-A/GMV変化 | C/GMV比率 | B-C/GMV変化`
  - AggregateAccordionTableと同じアコーディオン構造（集計科目 → 展開で明細）
  - 数値表示に `formatRate()` を使用（例: 73.0%, -5.2%）
  - GMVデータなしの場合は `<AnalysisFallback variant="empty" />`
  - テストを新規追加（正常表示、空データ、GMV=0）

  **Must NOT do**:
  - 既存AggregateAccordionTableの変更（コンポーネントの再利用またはコピー）
  - TrendChart / DifferenceChartの変更

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 新規コンポーネントの設計と実装。既存パターンの踏襲が必要だが、GMV比率特有の表示ロジックがある
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: 既存パターンの踏襲なので新規デザイン不要

  **Parallelization**:
  - **Can Run In Parallel**: YES（Task 5が依存）
  - **Parallel Group**: Wave 2 (with Task 5 — but 5 depends on 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/features/analysis/components/detail/aggregate-accordion-table.tsx` — テーブル構造のベース。ヘッダー行 + AggregateGroup のアコーディオン。同じ構造で比率列に差し替え
  - `src/features/analysis/components/detail/aggregate-group.tsx` — 集計行ボタン + 展開明細。DeltaValueコンポーネントの比率版を作る

  **API/Type References**:
  - `src/features/analysis/lib/selectors.ts:selectGmvRatios` — Task 2で追加されるセレクタ。GmvRatioRow[] を返す
  - `src/lib/format/rate.ts:formatRate(value, decimals)` — 比率フォーマット。0.73 → "73.0%"
  - `src/features/analysis/components/shared/analysis-fallback.tsx` — 空データ時のフォールバック

  **Test References**:
  - `src/features/analysis/components/detail/detail-panel.test.tsx` — DetailPanelのテストパターン。モックセレクタの使い方

  **WHY Each Reference Matters**:
  - aggregate-accordion-table.tsx: テーブル構造のテンプレート。ヘッダー+行のflexレイアウトを踏襲
  - aggregate-group.tsx: アコーディオン展開のインタラクションパターン
  - formatRate: 比率表示のフォーマット関数。GMV比率パネルでのみ使用
  - analysis-fallback: 空状態の統一UI

  **Acceptance Criteria**:

  - [ ] `bunx vitest run src/features/analysis/components/summary/gmv-ratio-panel.test.tsx` → ALL PASS
  - [ ] PL科目ごとに B/GMV, B-A/GMV変化, C/GMV, B-C/GMV変化 が表示される
  - [ ] GMVデータなし → AnalysisFallback variant="empty"
  - [ ] formatRate() でパーセント表示（73.0%形式）

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GMV ratio panel renders PL account ratios
    Tool: Bash (vitest)
    Preconditions: selectGmvRatios returns fixture data
    Steps:
      1. Render GmvRatioPanel with mock data
      2. Assert 売上高 row shows "73.0%" for B/GMV ratio
      3. Assert 売上原価 row shows correct ratio
      4. Assert 5 PL accounts rendered (売上高, 売上原価, 売上総利益, 販管費, 営業利益)
    Expected Result: Each PL account shows GMV ratio percentage
    Failure Indicators: Missing rows, raw decimal instead of percentage, null values
    Evidence: .sisyphus/evidence/task-4-gmv-panel-renders.txt

  Scenario: Empty state when no GMV data
    Tool: Bash (vitest)
    Preconditions: selectGmvRatios returns empty array
    Steps:
      1. Render GmvRatioPanel with empty data
      2. Assert AnalysisFallback with variant="empty" is rendered
      3. Assert no table rows rendered
    Expected Result: Empty state fallback displayed
    Failure Indicators: Empty table without fallback, error thrown
    Evidence: .sisyphus/evidence/task-4-gmv-panel-empty.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): add GmvRatioPanel component`
  - Files: `gmv-ratio-panel.tsx, gmv-ratio-panel.test.tsx, index.ts`
  - Pre-commit: `bunx vitest run src/features/analysis/components/summary/`

- [ ] 5. AnalysisWorkspace タブ化リファクタ

  **What to do**:
  - `src/features/analysis/components/analysis-workspace.tsx` のレイアウトを大幅変更
  - MajorAccountSummary, TrendPanel, DifferencePanel, DetailPanel の縦並び → Tabs ベースに変更
  - 新しいレイアウト構造:
    ```
    <Tabs value={state.activeSubView} onValueChange={actions.setActiveSubView}>
      <TabsList variant="line">
        <TabsTrigger value="pl">PL内訳</TabsTrigger>
        <TabsTrigger value="gmv">GMV比率</TabsTrigger>
        <TabsTrigger value="trend">推移グラフ</TabsTrigger>
        <TabsTrigger value="difference">差異分解</TabsTrigger>
      </TabsList>
      <TabsContent value="pl"><PanelErrorBoundary><DetailPanel /></PanelErrorBoundary></TabsContent>
      <TabsContent value="gmv"><PanelErrorBoundary><GmvRatioPanel /></PanelErrorBoundary></TabsContent>
      <TabsContent value="trend"><PanelErrorBoundary><TrendPanel /></PanelErrorBoundary></TabsContent>
      <TabsContent value="difference"><PanelErrorBoundary><DifferencePanel /></PanelErrorBoundary></TabsContent>
    </Tabs>
    ```
  - DifferencePanel からアカウントサマリー表示を削除（CardHeader/CardDescriptionのみ残す、SummaryCard的要素を除去）
    - ※ DifferencePanel自体はChartのみのシンプルな構造なので、現状のままでアカウントサマリー的なものは含んでいない可能性あり。その場合はそのまま配置
  - TrendPanelは科目未選択時の空状態を維持
  - AnalysisWorkspace内の useMemo 計算（summaryRows, detailRows, trendSeries, differenceData）はそのまま維持（タブ切替でもデータは使い回す）
  - テストを更新（MajorAccountSummaryモック → Tabs モック、4タブの存在確認）

  **Must NOT do**:
  - データ計算ロジック（useMemo内）の変更
  - 共有チャートコンポーネントの変更
  - PanelErrorBoundaryパターンの削除

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: AnalysisWorkspaceの構造大幅変更。複数コンポーネントの統合、既存テストの大幅更新が必要
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: UIデザインではなく構造変更

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Tasks 1, 3, 4)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Tasks 1, 3, 4

  **References**:

  **Pattern References**:
  - `src/components/ui/tabs.tsx` — Tabs/TabsList/TabsTrigger/TabsContent のAPI。base-ui Tabs のラッパー。"line" variant が利用可能
  - `src/features/analysis/components/trend/trend-panel.tsx:16-49` — 既存のTabs使用例（金額/比率切替）。Tabs/TabsList/TabsTriggerの使い方を参考

  **API/Type References**:
  - `src/features/analysis/components/analysis-workspace.tsx:AnalysisWorkspaceProps` — 現在のprops型。そのまま維持
  - `src/features/analysis/state/use-analysis-state.ts` — Task 1で更新されたstate。activeSubViewが4値に拡張済み

  **Test References**:
  - `src/features/analysis/components/analysis-workspace.test.tsx` — 既存テスト。MajorAccountSummary等のモックを新しいタブ構造に更新

  **WHY Each Reference Matters**:
  - tabs.tsx: タブコンポーネントのAPI。TabsContentにvalue属性が必要
  - trend-panel.tsx: プロジェクト内でのTabs使用パターン。TabsList variant="line" の使い方
  - analysis-workspace.tsx: リファクタ対象のメインファイル。現在のレイアウト構造を理解して差し替え
  - analysis-workspace.test.tsx: テストのモック更新。モックされている子コンポーネントの変更に対応

  **Acceptance Criteria**:

  - [ ] `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx` → ALL PASS
  - [ ] Tabs コンポーネントが4つの TabsTrigger を持つ
  - [ ] デフォルトタブが "pl"（PL内訳）
  - [ ] MajorAccountSummary がレンダリングされない
  - [ ] 各TabsContentにPanelErrorBoundaryでラップされたパネルが配置される
  - [ ] loading状態のスケルトン表示が維持される

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tab structure renders correctly
    Tool: Bash (vitest)
    Preconditions: AnalysisWorkspace refactored with Tabs
    Steps:
      1. Render AnalysisWorkspace with default state
      2. Assert 4 TabsTrigger elements rendered ("PL内訳", "GMV比率", "推移グラフ", "差異分解")
      3. Assert default activeSubView is "pl"
      4. Assert MajorAccountSummary is NOT in rendered output
    Expected Result: 4-tab layout with PL内訳 as default, no summary cards
    Failure Indicators: Missing tabs, wrong default, MajorAccountSummary still present
    Evidence: .sisyphus/evidence/task-5-tab-structure.txt

  Scenario: Loading state preserved
    Tool: Bash (vitest)
    Preconditions: AnalysisWorkspace with loading=true
    Steps:
      1. Render AnalysisWorkspace with loading={true}
      2. Assert AnalysisFallback variant="loading" is rendered
      3. Assert Tabs NOT rendered during loading
    Expected Result: Loading skeleton shown, no tab structure until data loads
    Failure Indicators: Tabs visible during loading, no loading fallback
    Evidence: .sisyphus/evidence/task-5-loading-state.txt

  Scenario: Tab switching updates content
    Tool: Bash (vitest)
    Preconditions: AnalysisWorkspace with data loaded
    Steps:
      1. Render AnalysisWorkspace
      2. Simulate setActiveSubView("gmv")
      3. Assert GmvRatioPanel content is visible
      4. Simulate setActiveSubView("trend")
      5. Assert TrendPanel content is visible
    Expected Result: Tab content switches on state change
    Failure Indicators: Wrong content shown, stale content after switch
    Evidence: .sisyphus/evidence/task-5-tab-switch.txt
  ```

  **Commit**: YES
  - Message: `refactor(analysis): restructure AnalysisWorkspace with tabs`
  - Files: `analysis-workspace.tsx, analysis-workspace.test.tsx`
  - Pre-commit: `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx`

- [ ] 6. MajorAccountSummary / SummaryCard の削除

  **What to do**:
  - `src/features/analysis/components/summary/major-account-summary.tsx` を削除
  - `src/features/analysis/components/summary/summary-card.tsx` を削除
  - `src/features/analysis/components/summary/major-account-summary.test.tsx` を削除
  - `src/features/analysis/components/summary/index.ts` から上記のexportを削除
  - analysis-workspace.tsx の import から MajorAccountSummary を削除（Task 5で既に削除されているはずだが確認）
  - 他ファイルからの参照を `lsp_find_references` で確認し、残存参照があれば削除

  **Must NOT do**:
  - GmvRatioPanel（Task 4で追加）の削除
  - AnalysisFallback の削除（他のコンポーネントが使用中）
  - summary.ts（lib）の変更 — セレクタは他で使われている可能性

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: ファイル削除とimport整理のみ
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - なし

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 7)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `src/features/analysis/components/summary/major-account-summary.tsx` — 削除対象。SummaryRow[] を受け取ってカードグリッドを表示
  - `src/features/analysis/components/summary/summary-card.tsx` — 削除対象。個別カードコンポーネント

  **WHY Each Reference Matters**:
  - 削除前に lsp_find_references で全参照を確認する必要がある

  **Acceptance Criteria**:

  - [ ] major-account-summary.tsx が存在しない
  - [ ] summary-card.tsx が存在しない
  - [ ] テストファイルが存在しない
  - [ ] index.ts から上記のexportが削除されている
  - [ ] `bunx vitest run src/features/analysis/` → ALL PASS（残存参照によるエラーなし）
  - [ ] `bunx tsc --noEmit` → no errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Files deleted and no references remain
    Tool: Bash
    Preconditions: Files deleted, imports cleaned
    Steps:
      1. ls src/features/analysis/components/summary/ — assert major-account-summary.tsx and summary-card.tsx do NOT exist
      2. grep -r "MajorAccountSummary\|SummaryCard" src/features/ — assert no results
      3. bunx tsc --noEmit — assert no errors
      4. bunx vitest run src/features/analysis/ — assert all pass
    Expected Result: No files, no references, no type errors, all tests pass
    Failure Indicators: Files still exist, import errors, test failures
    Evidence: .sisyphus/evidence/task-6-cleanup.txt
  ```

  **Commit**: YES
  - Message: `chore(analysis): remove MajorAccountSummary and SummaryCard`
  - Files: `major-account-summary.tsx, summary-card.tsx, tests, index.ts`
  - Pre-commit: `bunx vitest run src/features/analysis/`

- [ ] 7. Cross-tab弱連動の実装

  **What to do**:
  - 差異分解タブでバーをクリック → PL内訳タブに自動切替 + 該当行にスクロール + ハイライト
  - AnalysisWorkspace で onBarClick ハンドラを更新:
    1. `actions.setActiveSubView("pl")` でタブ切替
    2. `actions.setWeakLinkTarget({ accountName, expandedAt })` でハイライト設定
  - weakLinkTarget は3秒後に自動クリアされる（既存ロジック）のでそのまま利用
  - テストを追加（バーClick → タブ切替 + weakLinkTarget設定の確認）

  **Must NOT do**:
  - weakLinkTargetの自動クリアタイマーの変更
  - DetailPanel（AggregateAccordionTable）のスクロールロジックの変更

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: タブを跨ぐ連動の実装。タイミング（タブ切替→DOM描画→スクロール）の考慮が必要
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `systematic-debugging`: バグ修正ではない

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `src/features/analysis/components/analysis-workspace.tsx:219-224` — 現在のonBarClickハンドラ。`setWeakLinkTarget` を呼び出している。これに `setActiveSubView("pl")` を追加

  **API/Type References**:
  - `src/features/analysis/state/use-analysis-state.ts` — setActiveSubView と setWeakLinkTarget のアクション型

  **WHY Each Reference Matters**:
  - 現在のonBarClickハンドラの場所。ここにタブ切替を追加する
  - setWeakLinkTargetは既にDetailPanelのスクロール+ハイライトに連動している。タブ切替だけ追加

  **Acceptance Criteria**:

  - [ ] 差異分解バーClick → `setActiveSubView("pl")` が呼ばれる
  - [ ] 差異分解バーClick → `setWeakLinkTarget` が呼ばれる
  - [ ] `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx` → ALL PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Difference bar click switches to PL tab
    Tool: Bash (vitest)
    Preconditions: AnalysisWorkspace with tabs and difference data
    Steps:
      1. Render AnalysisWorkspace with activeSubView="difference"
      2. Simulate bar click in DifferenceChart
      3. Assert actions.setActiveSubView called with "pl"
      4. Assert actions.setWeakLinkTarget called with correct accountName
    Expected Result: Tab switches to PL + highlight target set
    Failure Indicators: Tab not switched, weakLinkTarget not set
    Evidence: .sisyphus/evidence/task-7-cross-tab-link.txt
  ```

  **Commit**: YES
  - Message: `feat(analysis): add cross-tab weak link for difference bar click`
  - Files: `analysis-workspace.tsx, analysis-workspace.test.tsx`
  - Pre-commit: `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx`

---

## Final Verification Wave (MANDATORY)

> 4 review agents run in PARALLEL. ALL must APPROVE.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `bunx vitest run src/features/analysis/`. Review all changed files for: `as any`, empty catches, console.log, unused imports. Check AI slop.
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Visual QA** — `unspecified-high` (+ playwright skill)
  Navigate to localhost:5173. Verify: 4 tabs visible, default tab is PL内訳, no MajorAccountSummary cards, 科目名列 is reasonable width. Switch tabs and verify content. Screenshot each tab.
  Output: `Tabs [4/4] | Default [correct/incorrect] | Cards removed [YES/NO] | Column width [fixed/broken] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read spec, read actual diff. Verify 1:1 — no missing, no scope creep. Check "Must NOT do" compliance.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `refactor(analysis): extend activeSubView to support 4 tabs` | use-analysis-state.ts, analysis-state.test.ts | `bunx vitest run src/features/analysis/state/` |
| 2 | `feat(analysis): add selectGmvRatios selector` | summary.ts, selectors.ts, selectors.test (or new test) | `bunx vitest run src/features/analysis/lib/` |
| 3 | `fix(analysis): fix account name column width in detail table` | aggregate-accordion-table.tsx, aggregate-group.tsx | `bunx vitest run src/features/analysis/components/detail/` |
| 4 | `feat(analysis): add GmvRatioPanel component` | gmv-ratio-panel.tsx, gmv-ratio-panel.test.tsx, index.ts | `bunx vitest run src/features/analysis/components/summary/` |
| 5 | `refactor(analysis): restructure AnalysisWorkspace with tabs` | analysis-workspace.tsx, analysis-workspace.test.tsx | `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx` |
| 6 | `chore(analysis): remove MajorAccountSummary and SummaryCard` | major-account-summary.tsx, summary-card.tsx, index.ts, related tests | `bunx vitest run src/features/analysis/` |
| 7 | `feat(analysis): add cross-tab weak link for difference bar click` | analysis-workspace.tsx, analysis-workspace.test.tsx | `bunx vitest run src/features/analysis/components/analysis-workspace.test.tsx` |

---

## Success Criteria

### Verification Commands
```bash
bunx tsc --noEmit  # Expected: no errors
bunx vitest run src/features/analysis/  # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present (4 tabs, GMV ratio table, column width fix, chart reuse)
- [ ] All "Must NOT Have" absent (no MajorAccountSummary, no account summary in difference, no chart modification)
- [ ] All tests pass
- [ ] No TypeScript errors
