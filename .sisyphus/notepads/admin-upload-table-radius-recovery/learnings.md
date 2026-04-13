# Learnings (admin-upload-table-radius-recovery)

## Inherited from Phase 1
- `bun test` vs `bun run test`:前者はbun内蔵テストランナー、後者はvitest経由
- Tailwind v4: `tailwind.config.js` なし、CSS `@theme inline` で設定
- shadcn Base UI Nova: `@base-ui/react/*` primitives, CVA variants, `data-*` 属性
- Vite 8 + vite-plugin-singlefile: GAS HTML Service 用に single HTML 生成
- Recharts 3 + shadcn ChartContainer: ChartConfig で CSS 変数カラー登録
- `--radius: 0.625rem` が radius drift の根本原因
- loglassSmallRawFixture は集計科目ごと明細科目1個のみ（詳細テーブルが空に見える原因）
- normalize-loglass.ts は再利用可能な正規化境界として保存
- `resolveDepartmentCode()` は ORG_TABS index から導出（全社=ALL, SaaS=D001...）
- `generateComparisonData()` は最新2つの予測シナリオキーを選択
- 全社集計キーは `hierarchyKey + period + metric + scenario`
- `src/lib/domain/upload-contract.ts` で `ScenarioInput` / `UploadMetadata` / `ReplacementIdentity` を zod で固定化した
- シナリオラベルは free-text 解析ではなく `kind + targetMonth + forecastStart` から `generateScenarioLabel()` で決定的生成に寄せた
- 上書き警告は `generatedLabel + scenarioFamily` の一致で判定し、A/B/C は最新=B・同ファミリーの直前=A・前年同月=C で解決する
- バケット契約は `master-contract.ts` に寄せ、`未割当` は warningOnSave/autoAggregation/includeInAnalysis=true、`集計不要` は includeInAnalysis=false で明示した

## Task 3: Radius Inventory
- 全コードベースで29箇所の `rounded-*` 使用を特定（CSS tokens 8 + UI components 22 + features 5）
- 2箇所のみ例外: scroll-area.tsx L48 (scrollbar thumb `rounded-full`), time-axis-pills.tsx L22 (pill shape)
- button.tsx の `rounded-[min(var(--radius-md),10px)]` は token-driven なので T13 だけで解決
- inline `borderRadius` / `border-radius` は0件（すべてTailwindクラス使用）
- `src/lib/domain/master-schema.ts` でマスタ既定値を zod parse 済み配列として固定し、GMV=sortOrder 10 / 売上高=20 / 未割当=99000 で順序を明示すると UI 側が localeCompare 依存から抜けられる
- `applyMasterMapping` はオーバーロードで `string -> MappedAccount` と `rawRows -> account/department mapping 付き配列` の両方を持たせると、T8/T11 系の単体利用と upload 正規化後の一括適用を同じ入口で扱える
- `営業利益` 以降は `bucketStatus: "excluded"` で明示し、`getOrderedAggregateAccounts()` 側で `集計不要` を落とすと「存在はするが分析には出さない」を安全に表現できる

## Task T2: Upload Identity, Overwrite Warning, A/B/C Reassignment Tests
- `resolveABC()` C lookup uses `shiftYearMonth(latest.targetMonth, -1)` — must match exact prior-year month, not any prior-year upload
- Same-month duplicate uploads: both are same-family, so older becomes A (not discarded)
- `computeReplacementIdentity()` matches on BOTH `generatedLabel` AND `scenarioFamily` — actual "2026/01月実績" won't collide with budget "2026/01月予算" even though targetMonth is the same
- `buildUploadFromInput()` factory helper derives generatedLabel + replacementIdentity via real domain functions, preventing fixture/domain drift
- Test suite: 27 files, 221 tests (was 25/200)

## Task T5: GAS Backend APIs
- GAS does NOT support ES modules — all gas/ code uses `var Namespace = Namespace || {};` pattern for global namespaced objects
- GAS `google.script.run` uses success/failure callbacks, NOT promises — gas-client.ts wraps via `withSuccessHandler`/`withFailureHandler` → Promise
- GAS xlsx parsing: `Utilities.base64Decode()` → blob → `DriveApp.createFile()` → `SpreadsheetApp.openById()` → read → trash temp file
- `PropertiesService.getScriptProperties()` for configurable SPREADSHEET_ID and UPLOAD_FOLDER_ID (avoids hardcoding)
- `build-gas.ts` updated to copy `gas/lib/*.js` into `gas-dist/lib/` — clasp push includes all .gs/.js files recursively
- zod schemas from domain contracts validate GAS responses client-side (defense in depth)
- Test suite: 29 files, 246 tests (was 29/246, +17 tests from gas-client)
- GAS build (`bun run build:gas`) assembles: Code.js + 5 lib files + index.html + appsscript.json

## Task: Upload UI Extension (Admin Screen)
- `useUploadFlow` state machine: idle → file_selected → previewing → (warning_shown|file_selected) → uploading → success/error
- GAS unavailable path uses local mock functions (mockPreviewUpload, mockCommitUpload) — preview returns fixed row count 42, commit generates deterministic metadata
- `fileToBase64()` uses FileReader.readAsDataURL → strips `data:xxx;base64,` prefix
- `ScenarioInputForm` uses native `<select>` and `<input type="month">` — no shadcn Select/Input components exist in this project
- forecastStart field shown only when kind=actual or kind=forecast (budget has no forecast concept)
- All radius explicitly `rounded-none` per project mandate — no rounded-lg/rounded-md anywhere
- `admin-page.test.tsx` survived UploadSection insertion — tests still pass (UploadSection renders without errors)
- Test suite: 31 files, 271 tests (was 31/271, +10 tests from use-upload-flow)
- Pre-existing failure in use-master-editor.test.ts (unrelated — filter on undefined accountEntries)

## Task T6: Admin Master Editor
- `useMasterEditor` hook: loads masters from `gasClient` or falls back to `getDefaultAccountMaster()`/`getDefaultDepartmentMaster()` when GAS unavailable
- Dirty tracking via JSON.stringify comparison of current vs saved state
- `addAccountEntry`/`addDepartmentEntry` compute `maxSort + 10` for new entry sortOrder
- vi.mock factory is hoisted above all declarations — cannot reference `let` variables in factory. Use `await import()` in beforeEach to reset mock state
- When testing GAS-available path with mocked gasClient, must provide `mockResolvedValueOnce` for getAccountMaster/getDepartmentMaster or state becomes undefined
- Test suite: 31 files, 271 tests (was 29/246, +25 tests from master-editor)
- All new components use `rounded-none`-compatible styling (no rounded-lg/rounded-md/rounded-xl added)
- Master editor components: `use-master-editor.ts`, `account-mapping-table.tsx`, `department-mapping-table.tsx`, `master-save-bar.tsx`, `master-editor.tsx`
- 未割当 rows get amber badge; 集計不要 rows get opacity-50 line-through treatment
- Department mapping only has 通常/未割当 bucket options (no 集計不要), matching `departmentBucketStatusSchema`
HERODIC

## Task T6: Admin Master Editor
- `useMasterEditor` hook: loads masters from `gasClient` or falls back to `getDefaultAccountMaster()`/`getDefaultDepartmentMaster()` when GAS unavailable
- Dirty tracking via JSON.stringify comparison of current vs saved state
- `addAccountEntry`/`addDepartmentEntry` compute `maxSort + 10` for new entry sortOrder
- vi.mock factory is hoisted above all declarations — cannot reference `let` variables in factory. Use `await import()` in beforeEach to reset mock state
- When testing GAS-available path with mocked gasClient, must provide `mockResolvedValueOnce` for getAccountMaster/getDepartmentMaster or state becomes undefined
- Test suite: 31 files, 271 tests (was 29/246, +25 tests from master-editor)
- All new components use zero-radius styling (no rounded-lg/rounded-md/rounded-xl added)
- 未割当 rows get amber badge; 集計不要 rows get opacity-50 line-through treatment
- Department mapping only has 通常/未割当 bucket options (no 集計不要), matching departmentBucketStatusSchema

## Task: Analysis persisted import data source
- `useAnalysisData` now owns the data-source switch: GAS available時は `actual` / `budget` / `forecast` を `gasClient.getAnalysisData()` で3本取得し、未提供時だけ fixture fallback する
- `applyMasterMapping()` を importData → raw row 変換の境界で噛ませると、既存の `normalizeRawRows() -> aggregateByDepartment() -> generateComparisonData()` を変えずに master 反映だけ差し込める
- 分析用の擬似集計科目（売上高/売上原価/売上総利益/販管費/営業利益）は raw row 段階で合成しておくと、fixture と persisted data で同じ downstream props を維持できる
- hook test では `vi.resetModules()` を beforeEach に入れて動的 import を毎回張り直すと、`isGasAvailable` / `gasClient` mock の切替が素直に効く

## Task: Comparison resolver
- `comparison-resolver.ts` は `resolveABC()` の前に `scenarioFamily + generatedLabel` で upload history を最新1件へ畳み込み、上書き済みシナリオを A/B/C 候補から重複排除する
- `useAnalysisData` では GAS 利用時だけ `gasClient.getUploadHistory()` を追加取得し、fixture fallback 側は既存 `generateComparisonData()` を維持すると差分を局所化できる
- 実績 family は `scenarioKey` で upload を識別できへんので、resolver 側で targetMonth ごとの最新スナップショットとして扱う設計に寄せると、少なくとも月次比較と overwrite テストを吸収しやすい

## Task: Analysis bucket filtering
- `applyMasterMapping()` 済み persisted import rows は `accountMapping.includeInAnalysis` を hook 境界で落とし、`bucketStatus: "unassigned"` は `detail/aggregate` 名を `未割当` に正規化してから raw row 化すると、component 側を触らずに render 出力の不変条件を守れる
- 未割当を comparison / trend / detail で安定して1バケット扱いしたい場合、raw row の `科目コード` も固定値（今回 `UNASSIGNED`）へ寄せると、master save 後も rowKey と selector 出力が決定的になる
- selector / transform 側でも `bucket-filter.ts` を噛ませて `集計不要` ラベルを防御的に除外しておくと、fixture 系や将来の直呼び出しでも UI へ漏れにくい
- jsdom では `scrollIntoView` 未実装なので、full vitest を安定化するには `src/test/setup.ts` で no-op polyfill を入れるのが安全

## Task 15: shadcn Baseline Design Consistency Audit
- Preset `b1tMK2lJz` decodes to **base-mira** (stone/blue/Montserrat), NOT base-nova — the CLI correctly resolves this
- Baseline has `--radius: 0` (same intent as live app's `--radius: 0px`) but component classes still use `rounded-md/lg/full` — these resolve to Tailwind defaults, NOT 0px
- Mira vs Nova: different spacing scales (h-7 vs h-8 buttons, text-xs vs text-sm), different focus rings (ring-2 vs ring-3)
- Stone vs Neutral: warm hue (49°-106°) vs achromatic (0°) across all foreground/border/ring tokens
- Live app's T13+T14 `rounded-none` overrides are correct and achieve the zero-radius intent
- 78 checks: 26 matches, 3 resolved (T14 radius), 10 deferred (style/color/font differences), 35 approximate matches
- All 10 deferred mismatches are design system identity decisions (Mira vs Nova, stone vs neutral), not bugs
- `components.json` style field: baseline has `base-mira`, live has `base-nova`
- `npx shadcn@latest init --preset <code> --template vite` works in temp dirs for baseline extraction
