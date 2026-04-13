# Decisions (loglass-schema-fix)

## User Decisions
- Raw schema: 実データ10列に完全一致
- Normalize: 科目→aggregateName/detailName 初期値、年月度→年度/月導出
- Master mapping: row.科目 を mapping key に変更
- GAS backend: 変更不要（既に正しい）
- prototypeLoglessCsvRowSchema: そのまま残す（別フォーマット）
- normalizedAccountSchema / loglessNormalizedRowSchema: 変更禁止（downstream 安定契約）
