# Loglass Raw Schema Fix — 10列アラインメント

## TL;DR

> **Quick Summary**: Loglass xlsx 実データ(10列)に schema/normalize/fixture を完全アラインする。存在しない7列(集計科目名, 明細科目名, 科目名, 部署名, 対象年度, 対象月, 数値区分)を raw schema から排除し、master mapping で正当に付与するパイプラインに再構成する。
> 
> **Deliverables**:
> - `loglessRawRowSchema` を実データ10列に縮小
> - `normalizeRawRows()` を10列入力に対応
> - `applyMasterMapping()` のキーを `科目` に変更
> - fixture 全般を実データ10列形式に修正
> - `buildAggregateRawRows()` を集計科目名非依存に再構成
> - GAS経由データパスを10列入力に対応
> - 全テスト(290+)通過
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Schema → Fixtures → Normalize → Master Mapping → Analysis Hook → Test Fix

---

## Context

### Original Request
ユーザーが Loglass xlsx の実際の列構成(10列)と実装の前提(15+列)の不一致を発見。プロトタイプ(Code_v2.gs)は正しく10列前提だったが、TypeScript移植時に実データにない列をschemaに混入してしまった。

### Interview Summary
**Key Discussions**:
- 実データの列: `シナリオ | 年月度 | 科目コード | 外部科目コード | 科目 | 科目タイプ | 部署コード | 外部部署コード | 部署 | 金額`
- プロトタイプは正しく10列前提。`normalizePrototypeCsvRow()` で 科目→集計科目名 + 科目→明細科目名 として同一値をセット
- 集計科目/明細科目の区別は科目マスタで初めて付与されるべき
- GAS backend は既に10列で正しく動作している（`gas/lib/upload.js` の `XLSX_COL` マッピング）

**Research Findings**:
- Explore Agent 1: 6コアファイル + 4テストファイルが存在しない列を参照
- Explore Agent 2: パイプライン全体をマッピング。GAS path は10列→15列再構成→normalize の流れ
- Metis: GAS backend は**既に正しい**。フロントエンドのみ修正対象

### Metis Review
**Identified Gaps** (addressed):
- `buildAggregateRawRows()` が `row.集計科目名` に依存 → master lookup に変更
- `RawMasterMappingRow` type が `明細科目名/科目名/部署名` を参照 → `科目/部署` に変更
- GAS path `toRawRowsFromAnalysisData()` が15列再構成 → 10列出力に変更
- `normalizePrototypeCsvRow()` の扱い → prototype用として残す

---

## Work Objectives

### Core Objective
Loglass xlsx 実データの10列と完全に一致する raw schema に修正し、集計科目名/明細科目名を master mapping で正当に付与するパイプラインを確立する。downstream (aggregateByDepartment, selectors, UI) は不変。

### Concrete Deliverables
- `loglessRawRowSchema`: 実データ10列のみ定義
- `LoglessRawRow` type: 10フィールドのみ
- `normalizeRawRows()`: 10列入力対応、科目→aggregateName/detailName 初期値、年月度→年度/月 導出
- `RawMasterMappingRow`: `{ 部署, 科目? }` に変更
- `applyMasterMapping()`: `row.科目` をキーに変更
- `buildAggregateRawRows()`: 科目コード/科目タイプベースの分類に変更
- `toRawRowsFromAnalysisData()`: 10列 raw row 構築に変更
- fixtures: 10列形式に再生成

### Definition of Done
- [ ] `loglessRawRowSchema.parse({ シナリオ:"実績", 年月度:"2026-02", 科目コード:"4110", 外部科目コード:"", 科目:"売上高", 科目タイプ:"収益", 部署コード:"D001", 外部部署コード:"", 部署:"SaaS事業部", 金額:1000000 })` が valid
- [ ] 同 schema に `対象年度: 2026` 等を渡すと Zod validation error
- [ ] `normalizeRawRows()` が10列入力から metricType/fiscalYear を正しく導出
- [ ] `applyMasterMapping()` が `科目` フィールドを mapping key として使用
- [ ] 全290テスト通過

### Must Have
- Raw schema が実データ10列と完全一致
- Master mapping で 集計科目名/sortOrder/isGmv を付与
- 全既存テスト通過
- GAS backend は変更不要（既に正しい）

### Must NOT Have (Guardrails)
- UI component の変更
- `aggregateByDepartment()` / `generateComparisonData()` のロジック変更
- selectors / comparison-resolver / bucket-filter の変更
- GAS backend (`gas/lib/upload.js`, `gas/Code.js`) の変更
- 新機能の追加（スキーマ自動検出等）
- `normalizedAccountSchema` / `loglassNormalizedRowSchema` の変更（downstream の安定契約）

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after（既存テスト修正 + 新規 schema テスト追加）
- **Framework**: vitest + React Testing Library

### QA Policy
- Schema/normalize/master: vitest pure function tests
- Pipeline integration: vitest with modified fixtures
- Build verification: `bun run build && bun run build:gas`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (foundation — schema + types + basic tests):
├── Task 1: Redefine loglessRawRowSchema to 10 real xlsx columns + add schema tests
├── Task 2: Create 10-col fixture factories (createLoglessRawRow)
└── Task 3: Regenerate loglass-small.ts fixture to 10-col format

Wave 2 (pipeline fix — normalize + master mapping):
├── Task 4: Update normalizeRawRows() for 10-col input + derive fields
├── Task 5: Update RawMasterMappingRow type + applyMasterMapping() key
└── Task 6: Restructure buildAggregateRawRows() without 集計科目名

Wave 3 (integration — analysis hook + GAS path):
├── Task 7: Update toRawRowsFromAnalysisData() for 10-col output
├── Task 8: Fix all test fixtures and test files
└── Task 9: Fix loglass-large.ts generator to 10-col format

Wave FINAL:
├── F1: Schema compliance audit
├── F2: Code quality review
├── F3: Pipeline integration test
└── F4: Scope fidelity check
```

### Dependency Matrix

- **1**: - → 2, 3, 4, 5
- **2**: 1 → 3, 4, 8
- **3**: 1, 2 → 4, 8
- **4**: 1, 3 → 6, 7, 8
- **5**: 1 → 6, 7, 8
- **6**: 4, 5 → 7
- **7**: 4, 5, 6 → FINAL
- **8**: 2, 4, 5 → FINAL
- **9**: 2 → FINAL

### Agent Dispatch Summary

- **Wave 1**: T1 `deep`, T2 `quick`, T3 `quick`
- **Wave 2**: T4 `deep`, T5 `quick`, T6 `deep`
- **Wave 3**: T7 `deep`, T8 `unspecified-high`, T9 `quick`
- **FINAL**: F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

---

## TODOs

- [x] 1. Redefine loglessRawRowSchema to 10 real xlsx columns + schema tests

  **What to do**:
  - Read current `src/lib/loglass/schema.ts` completely
  - Change `loglessRawRowSchema` to define ONLY the 10 real xlsx columns:
    ```
    シナリオ: z.string() (non-empty)
    年月度: z.string() (format "yyyy-MM" or "yyyy/MM/dd" — use z.coerce or preprocess)
    科目コード: z.string()
    外部科目コード: z.string().default("")
    科目: z.string() (non-empty) ← was 科目名
    科目タイプ: z.enum(["収益","費用","資産","負債","その他"])
    部署コード: z.string()
    外部部署コード: z.string().default("")
    部署: z.string() (non-empty) ← was 部署名
    金額: z.number()
    ```
  - Remove these 7 fields from the schema: `対象年度`, `対象月`, `数値区分`, `部署名`, `科目名`, `集計科目名`, `明細科目名`
  - Update `LoglessRawRow` type (in types.ts) to match
  - Keep `prototypeLoglassCsvRowSchema` unchanged (it's for prototype CSV format, different column names)
  - Add new test file: `src/lib/loglass/__tests__/schema-10col.test.ts`:
    - Test: 10-col object passes validation
    - Test: object with `対象年度` is rejected
    - Test: object with `集計科目名` is rejected
    - Test: missing required fields are rejected
  - Run `bun test` to verify new tests pass (existing tests WILL break — that's expected)

  **Must NOT do**:
  - Do NOT change `normalizedAccountSchema` or `loglassNormalizedRowSchema`
  - Do NOT change `prototypeLoglassCsvRowSchema`
  - Do NOT touch any UI components

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`
  - **Parallelization**: Wave 1, blocks T2,T3,T4,T5

  **References**:
  - `src/lib/loglass/schema.ts:30-46` — current `loglessRawRowSchema` (15 fields to reduce to 10)
  - `src/lib/loglass/schema.ts:17-28` — `prototypeLoglassCsvRowSchema` (correct 10-col reference model)
  - `src/lib/loglass/types.ts:21` — `LoglessRawRow` type definition
  - `docs/prototype/Code_v2.gs` — prototype column definitions for reference

  **Acceptance Criteria**:
  - [ ] `loglessRawRowSchema` has exactly 10 fields matching real xlsx columns
  - [ ] New test file `schema-10col.test.ts` passes with 4+ test cases
  - [ ] `LoglessRawRow` type updated to match
  - [ ] `prototypeLoglassCsvRowSchema` unchanged

  **QA Scenarios**:
  ```
  Scenario: 10-col object validates successfully
    Tool: Bash (bun test)
    Steps:
      1. Run schema tests: bun test src/lib/loglass/__tests__/schema-10col.test.ts
      2. Assert all tests pass
    Expected Result: 4+ tests pass, 0 failures
    Evidence: .sisyphus/evidence/task-1-schema-tests.txt

  Scenario: 15-col object is rejected
    Tool: Bash (bun test)
    Steps:
      1. Run test that passes object with 対象年度 and 集計科目名
      2. Assert ZodError is thrown
    Expected Result: validation rejects phantom columns
    Evidence: .sisyphus/evidence/task-1-rejection.txt
  ```

  **Commit**: YES
  - Message: `refactor(schema): align loglessRawRowSchema with actual xlsx 10 columns`
  - Files: `src/lib/loglass/schema.ts`, `src/lib/loglass/types.ts`, `src/lib/loglass/__tests__/schema-10col.test.ts`

- [x] 2. Create 10-col fixture factory (createLoglessRawRow)

  **What to do**:
  - In `src/lib/fixtures/loglass-small.ts`, create a new factory function `createLoglessRawRow()` that generates 10-col objects (not 15-col)
  - Factory signature: `createLoglessRawRow(overrides: Partial<LoglessRawRow>): LoglessRawRow`
  - Default values should match typical xlsx data (シナリオ:"実績", 年月度:"2026-02", etc.)
  - Export the factory for use in test files
  - Do NOT regenerate the entire fixture array yet (T3 does that)
  - Add a small test to verify the factory produces valid 10-col objects

  **Must NOT do**:
  - Do NOT modify the existing `loglessSmallRawFixture` array yet (T3)
  - Do NOT change test files that consume the old fixture format (T8)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**: Wave 1 (after T1), blocks T3,T4,T8

  **References**:
  - `src/lib/fixtures/loglass-small.ts` — current fixture with 15-col factory
  - New `LoglessRawRow` type from T1 (10 fields)

  **Acceptance Criteria**:
  - [ ] `createLoglessRawRow()` factory exists and produces valid `LoglessRawRow` objects
  - [ ] Factory output passes `loglessRawRowSchema.parse()`

  **QA Scenarios**:
  ```
  Scenario: factory produces valid 10-col row
    Tool: Bash (bun test)
    Steps:
      1. Import createLoglessRawRow and loglessRawRowSchema
      2. Create a row with defaults
      3. Assert schema.parse(row) succeeds
    Expected Result: no validation error
    Evidence: .sisyphus/evidence/task-2-factory.txt
  ```

  **Commit**: YES (groups with T3)

- [x] 3. Regenerate loglass-small.ts fixture to 10-col format

  **What to do**:
  - Replace the `loglessSmallRawFixture` array with 10-col versions of the same data
  - Each row should use: シナリオ, 年月度, 科目コード, 外部科目コード, 科目, 科目タイプ, 部署コード, 外部部署コード, 部署, 金額
  - Remove all phantom fields: 対象年度, 対象月, 数値区分, 部署名, 科目名, 集計科目名, 明細科目名
  - The existing business data (amounts, departments, accounts) should be PRESERVED
  - Use the factory from T2 where possible, but some rows may need explicit overrides
  - Verify the fixture is a valid `LoglessRawRow[]` by running schema validation

  **Must NOT do**:
  - Do NOT change the business semantics (amounts, departments, accounts)
  - Do NOT add or remove data rows

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**: Wave 1 (after T1,T2)

  **References**:
  - `src/lib/fixtures/loglass-small.ts` — current 15-col fixture data
  - T2 factory: `createLoglessRawRow()`
  - Actual xlsx column reference from user

  **Acceptance Criteria**:
  - [ ] `loglessSmallRawFixture` contains only 10-col objects
  - [ ] Every row passes `loglessRawRowSchema.parse()`
  - [ ] Same number of rows as before (no data loss)

  **Commit**: YES (with T2)
  - Message: `refactor(fixtures): regenerate fixtures to 10-column format`

- [x] 4. Update normalizeRawRows() for 10-col input + derive fields

  **What to do**:
  - Read `src/features/admin/lib/normalize-loglass.ts` completely
  - Change `normalizeRawRows()` to:
    - Read `rawRow.科目` instead of `rawRow.科目名` for `account.name`
    - Read `rawRow.部署` instead of `rawRow.部署名` for `department.name`
    - Set `account.aggregateName = rawRow.科目` (initial value = same as 科目; master mapping enriches later)
    - Set `account.detailName = rawRow.科目` (initial value = same as 科目)
    - Set `account.hierarchyKey = rawRow.科目` (single-level until master mapping)
    - Set `account.isGmvDenominator = false` (master mapping sets the real value)
    - Derive `対象年度` from `年月度`: extract year from "yyyy-MM" string
    - Derive `対象月` from `年月度`: extract month from "yyyy-MM" string
    - Derive `数値区分` from `シナリオ` using existing `deriveMetricTypeFromScenario()`
  - Update `normalize-loglass.test.ts` to use 10-col fixture format
  - The output `NormalizedRow` shape must remain UNCHANGED (downstream consumers depend on it)

  **Must NOT do**:
  - Do NOT change `normalizedAccountSchema` or `loglassNormalizedRowSchema` output shape
  - Do NOT change `aggregateByDepartment()`, `generateComparisonData()`, selectors, etc.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`
  - **Parallelization**: Wave 2 (after T1,T3)

  **References**:
  - `src/features/admin/lib/normalize-loglass.ts:83-94` — current rawRow.集計科目名/明細科目名/部署名 access
  - `src/lib/loglass/schema.ts:147-167` — `normalizePrototypeCsvRow()` as reference pattern (科目 → both names)
  - `src/features/admin/lib/normalize-loglass.test.ts` — test fixtures to update

  **Acceptance Criteria**:
  - [ ] `normalizeRawRows()` accepts `LoglessRawRow[]` (10 fields)
  - [ ] `normalizeRawRows()` produces same `NormalizedRow[]` output shape
  - [ ] Period derivation: 年月度 "2026-02" → fiscalYear=2026, month=2
  - [ ] MetricType derivation: シナリオ → 数値区分 via deriveMetricTypeFromScenario()

  **QA Scenarios**:
  ```
  Scenario: normalize 10-col rows produces correct output
    Tool: Bash (bun test)
    Steps:
      1. Create 10-col test rows
      2. Run normalizeRawRows()
      3. Assert output has correct aggregateName (initially = 科目)
      4. Assert fiscalYear/month derived from 年月度
    Expected Result: normalized output matches expected structure
    Evidence: .sisyphus/evidence/task-4-normalize.txt
  ```

  **Commit**: YES
  - Message: `refactor(normalize): update normalizeRawRows for 10-col input`

- [x] 5. Update RawMasterMappingRow type + applyMasterMapping() key

  **What to do**:
  - Read `src/lib/domain/master-schema.ts` completely
  - Change `RawMasterMappingRow` type from `{ 部署名, 明細科目名?, 科目名? }` to `{ 部署, 科目? }`
  - Change `applyMasterMapping()` overload that takes arrays:
    - Replace `row.明細科目名 ?? row.科目名` with `row.科目` as mapping key
  - Change `applyDepartmentMapping()`:
    - Replace `row.部署名` with `row.部署`
  - Update `master-schema.test.ts` to use new field names
  - Verify the MappedAccount output (aggregateAccountName, detailAccountName, sortOrder, isGmv) remains unchanged

  **Must NOT do**:
  - Do NOT change `AccountMasterEntry` / `DepartmentMasterEntry` types (master config format unchanged)
  - Do NOT change master defaults (getDefaultAccountMaster, getDefaultDepartmentMaster)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**: Wave 2 (after T1)

  **References**:
  - `src/lib/domain/master-schema.ts:63-68` — `RawMasterMappingRow` type
  - `src/lib/domain/master-schema.ts:139` — `applyMasterMapping()` key resolution
  - `src/lib/domain/master-schema.ts:144` — `applyDepartmentMapping()` key resolution

  **Acceptance Criteria**:
  - [ ] `RawMasterMappingRow` has fields `部署` and `科目?` only
  - [ ] `applyMasterMapping()` uses `row.科目` as mapping key
  - [ ] `applyDepartmentMapping()` uses `row.部署` as mapping key
  - [ ] All master-schema tests pass

  **QA Scenarios**:
  ```
  Scenario: master mapping with 10-col row
    Tool: Bash (bun test)
    Steps:
      1. Create row with { 部署: "SaaS事業部", 科目: "売上高", ... }
      2. Run applyMasterMapping()
      3. Assert MappedAccount has correct aggregateAccountName
    Expected Result: mapping key resolution works with new field names
    Evidence: .sisyphus/evidence/task-5-master.txt
  ```

  **Commit**: YES
  - Message: `refactor(master): change mapping key from 明細科目名 to 科目`

- [x] 6. Restructure buildAggregateRawRows() without 集計科目名

  **What to do**:
  - Read `src/features/analysis/hooks/use-analysis-data.ts` completely (especially lines 41-99)
  - `buildAggregateRawRows()` currently categorizes rows by `row.集計科目名` into buckets:
    - revenue: "売上高", "売上原価", etc.
    - sga: "販管費", etc.
    - Then generates summary rows (売上総利益, 営業利益) from bucket totals
  - Change to categorize by `row.科目` (the real column) instead of `row.集計科目名`
  - The categorization rules should use the same account names that appear in 科目 column
  - Also update `buildAggregateRow()` (line 41-52) to produce 10-col rows instead of 15-col
  - Verify the generated aggregate rows (売上総利益, 営業利益) are still correct

  **Must NOT do**:
  - Do NOT change the aggregation logic (which accounts get summed)
  - Do NOT change the summary row names (売上総利益, 営業利益)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`
  - **Parallelization**: Wave 2 (after T4,T5)

  **References**:
  - `src/features/analysis/hooks/use-analysis-data.ts:41-52` — `buildAggregateRow()`
  - `src/features/analysis/hooks/use-analysis-data.ts:58-99` — `buildAggregateRawRows()`
  - `src/lib/fixtures/loglass-small.ts` — check which 科目 values correspond to which aggregates

  **Acceptance Criteria**:
  - [ ] `buildAggregateRawRows()` categorizes by `row.科目` not `row.集計科目名`
  - [ ] Generated aggregate rows are 10-col format
  - [ ] Summary rows (売上総利益, 営業利益) computed correctly

  **Commit**: YES
  - Message: `refactor(analysis): restructure aggregate row generation without 集計科目名`

---

- [x] 7. Update toRawRowsFromAnalysisData() for 10-col output

  **What to do**:
  - Read `src/features/analysis/hooks/use-analysis-data.ts` lines 128-172
  - Currently `toRawRowsFromAnalysisData()`:
    1. Gets 10-col GAS importData
    2. Adds 部署名/明細科目名 to each row
    3. Applies master mapping
    4. RECONSTRUCTS 15-col LoglessRawRow objects
  - Change to:
    1. Gets 10-col GAS importData (unchanged)
    2. Maps to `{ 部署: row.deptName, 科目: row.accountName }` (new field names)
    3. Applies master mapping (which now uses `row.部署` and `row.科目`)
    4. Constructs 10-col LoglessRawRow objects (no phantom columns)
    5. Derives 年月度 from yearMonth, シナリオ from scenarioKey, etc.
  - The output should be valid `LoglessRawRow[]` (10 fields)
  - Downstream: the output goes to `buildAggregateRawRows()` → `normalizeRawRows()` (both already updated in T4,T6)

  **Must NOT do**:
  - Do NOT change `gasClient.getAnalysisData()` or the `AnalysisData` interface
  - Do NOT change the GAS backend

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `systematic-debugging`
  - **Parallelization**: Wave 3 (after T4,T5,T6)

  **References**:
  - `src/features/analysis/hooks/use-analysis-data.ts:128-172` — current 15-col reconstruction
  - `src/lib/gas/gas-client.ts` — `AnalysisData` interface (unchanged)
  - T4 updated `normalizeRawRows()` (accepts 10-col)
  - T5 updated `applyMasterMapping()` (uses `科目` key)
  - T6 updated `buildAggregateRawRows()` (uses `row.科目`)

  **Acceptance Criteria**:
  - [ ] `toRawRowsFromAnalysisData()` produces `LoglessRawRow[]` (10 fields)
  - [ ] No phantom columns in output
  - [ ] Master mapping applied correctly with new key fields

  **Commit**: YES
  - Message: `refactor(hook): update GAS data path for 10-col raw rows`

- [x] 8. Fix all test fixtures and test files

  **What to do**:
  - Update ALL test files that create raw rows with the old 15-col format:
    - `src/features/admin/lib/normalize-loglass.test.ts` — use `createLoglessRawRow()` factory
    - `src/features/analysis/lib/selectors.test.ts` — update `createRawRow()` factory and `buildAnalysisRawRows()`
    - `src/lib/loglass/normalize.test.ts` — update fixture creation
    - `src/lib/domain/__tests__/master-schema.test.ts` — update RawMasterMappingRow fixtures
    - `src/features/analysis/components/detail/aggregate-accordion-table.test.ts` — check fixture usage
    - `src/features/analysis/hooks/use-analysis-data.test.tsx` — check mock data
    - `src/features/admin/hooks/use-upload-flow.test.ts` — check fixture usage
    - `src/lib/domain/__tests__/upload-contract.test.ts` — check fixture usage
    - `src/lib/domain/__tests__/abc-reassignment.test.ts` — check fixture usage
    - `src/lib/domain/__tests__/overwrite-warning.test.ts` — check fixture usage
    - Any other test file referencing the old 15-col field names
  - Use `grep` for `科目名`, `部署名`, `集計科目名`, `明細科目名`, `対象年度`, `対象月`, `数値区分` across all test files
  - Each field reference must be updated to the correct 10-col equivalent
  - Run `bun test` after each file to verify no regressions

  **Must NOT do**:
  - Do NOT change the test assertions for normalized/analysis output (those are stable)
  - Do NOT skip any failing tests

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
  - **Parallelization**: Wave 3 (after T2,T4,T5)

  **References**:
  - All test files listed above
  - T2 factory: `createLoglessRawRow()`
  - T1 new schema: `loglessRawRowSchema`

  **Acceptance Criteria**:
  - [ ] Zero references to phantom columns (科目名/部署名/集計科目名/明細科目名) as raw field access
  - [ ] All 290+ tests pass
  - [ ] No test skips

  **Commit**: YES (with T9)
  - Message: `test: update all test fixtures and expectations for 10-col format`

- [x] 9. Fix loglass-large.ts generator to 10-col format

  **What to do**:
  - Read `src/lib/fixtures/loglass-large.ts` completely
  - The file programmatically generates large fixture datasets
  - Change the generator to produce 10-col objects instead of 15-col
  - Remove phantom fields from the generation logic
  - Verify output passes `loglessRawRowSchema.parse()`

  **Must NOT do**:
  - Do NOT change the data volume or business logic of the generator

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
  - **Parallelization**: Wave 3 (after T2)

  **References**:
  - `src/lib/fixtures/loglass-large.ts` — current 15-col generator
  - T2 factory: `createLoglessRawRow()`

  **Acceptance Criteria**:
  - [ ] Generator produces 10-col objects only
  - [ ] Output passes `loglessRawRowSchema.parse()`

  **Commit**: YES (with T8)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

- [x] F1. **Schema Compliance Audit** — `oracle`
  Verify `loglessRawRowSchema` matches actual xlsx columns exactly. Verify old 15-col format is rejected by Zod. Verify all fixture data uses 10-col format. Verify GAS backend outputs are unchanged. Check evidence files exist in .sisyphus/evidence/.

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run build && bun run test`. Audit for: remaining references to `科目名`, `部署名`, `集計科目名`, `明細科目名` as raw field access (not post-mapping). Check for `as any` / `@ts-ignore`. Verify `RawMasterMappingRow` type updated everywhere.

- [x] F3. **Pipeline Integration Test** — `unspecified-high`
  Trace 10-col raw data through the full pipeline: raw(10) → normalize → master-apply → aggregate → comparison → verify output matches expected structure. Test both fixture path and GAS mock path.

- [x] F4. **Scope Fidelity Check** — `deep`
  Confirm no UI component changes. No aggregateByDepartment/generateComparisonData logic changes. No GAS backend changes. No new features added. No normalizedAccountSchema/loglassNormalizedRowSchema changes.

---

## Commit Strategy

- **1**: `refactor(schema): align loglessRawRowSchema with actual xlsx 10 columns`
- **2+3**: `refactor(fixtures): regenerate fixtures to 10-column format`
- **4**: `refactor(normalize): update normalizeRawRows for 10-col input`
- **5**: `refactor(master): change mapping key from 明細科目名 to 科目`
- **6**: `refactor(analysis): restructure aggregate row generation without 集計科目名`
- **7**: `refactor(hook): update GAS data path for 10-col raw rows`
- **8+9**: `test: update all test fixtures and expectations for 10-col format`

---

## Success Criteria

### Verification Commands
```bash
bun run test               # Expected: all tests pass (290+)
bun run build              # Expected: production build succeeds
bun run build:gas          # Expected: GAS artifact build succeeds
```

### Final Checklist
- [ ] loglessRawRowSchema が実データ10列と完全一致
- [ ] 旧15列形式が Zod validation で reject される
- [ ] normalizeRawRows() が10列入力から正しく導出
- [ ] applyMasterMapping() が 科目 をキーに動作
- [ ] buildAggregateRawRows() が集計科目名非依存で動作
- [ ] 全fixtureが10列形式
- [ ] 全テスト通過
- [ ] GAS backend 変更なし
