# Learnings (loglass-schema-fix)

## Inherited from Previous Plans
- `bun run test` uses vitest (NOT `bun test`)
- Tailwind v4: `tailwind.config.js` なし、CSS `@theme inline` で設定
- shadcn Base UI Nova: `@base-ui/react/*` primitives, CVA variants
- `--radius: 0px` (T13 completed)
- All `rounded-*` → `rounded-none` (T14 completed)
- GAS backend は既に10列で正しい (`gas/lib/upload.js` の `XLSX_COL`)
- `prototypeLoglessCsvRowSchema` は prototype CSV 用。列名が xlsx と異なる（計画・実績 vs シナリオ等）

## Real Loglass xlsx columns (10)
シナリオ | 年月度 | 科目コード | 外部科目コード | 科目 | 科目タイプ | 部署コード | 外部部署コード | 部署 | 金額

## Pipeline Target
raw(10col) → normalize(derive basics) → master-apply(add aggregate/detail/sort/isGmv) → aggregate → comparison → UI

## 2026-04-13
- `src/lib/loglass/schema.ts` は `loglessRawRowSchema` を新設し、実xlsxの10列（シナリオ/年月度/科目コード/外部科目コード/科目/科目タイプ/部署コード/外部部署コード/部署/金額）に合わせた
- 既存参照を壊さんため `loglassRawRowSchema` は `loglessRawRowSchema` のエイリアスとして維持した
- 余計な列は Zod のデフォルト挙動で strip される前提なので、schema テストでは phantom columns が出力に残らんことを確認した
- `src/lib/fixtures/loglass-small.ts` は `createLoglessRawRow()` を追加し、24件すべてを実xlsx準拠の10列fixtureへ置換した
- normalize 初期値は YAGNI/KISS で `科目` を `aggregateName/detailName/hierarchyKey` にそのまま流し、`metricType` は `deriveMetricTypeFromScenario(raw.シナリオ)` から導出する
- `isGmvDenominator` は phantom `集計科目名` 依存を外し、実列 `科目` が `SaaS GMV` / `広告 GMV` のときだけ `true` にした
- `bun run build` の失敗原因はこのfixtureではなく、未移行の15列参照が残る `src/features/admin/lib/normalize-loglass.ts` / `src/features/analysis/hooks/use-analysis-data.ts` / `src/lib/fixtures/loglass-large.ts` 側
- `src/features/admin/lib/normalize-loglass.ts` は `LoglessRawRow[]` を受けるように更新し、`normalizeRawRows()` 内の phantom 15列参照（`数値区分` / `部署名` / `科目名` / `集計科目名` / `明細科目名`）をすべて10列実データ由来へ置き換えた
- この段階の正規化は DRY/KISS で `metricType` を `deriveMetricTypeFromScenario(rawRow.シナリオ)` に集約し、`aggregateName` / `detailName` / `hierarchyKey` は master 適用前の暫定値として `rawRow.科目` をそのまま使う
- `src/features/analysis/hooks/use-analysis-data.ts` も `LoglessRawRow` 前提へ更新し、aggregate row は phantom 列を捨てて 10 列だけ返すようにした
- analysis hook 側の集計カテゴリ判定は `科目` ベースに切り替え、`deriveMetricTypeFromScenario(rawRow.シナリオ)` を bucket key 生成に使うようにした
- GAS 由来 raw row 生成は master 適用後の `aggregateAccountName` を `科目` に入れることで、後段の aggregate 計算が 10 列 raw row だけで完結する
