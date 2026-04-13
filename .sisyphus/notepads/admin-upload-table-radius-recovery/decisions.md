# Decisions (admin-upload-table-radius-recovery)

## Pre-Plan User Decisions
- Upload UI: 管理画面を拡張（別画面なし）
- Scenario tag: 構造化入力（種別/対象月/見込開始月）→ 自動ラベル生成
- A/B/C: 動的解釈（最新=B, ひとつ前=A, 前年=C）
- 同じタグ系統の再 upload は後勝ち上書き + 差し替え警告
- Detail table: 案B（集計科目ごとの折りたたみ型）。GMV が売上高の上
- Master editing: 明細科目→集計科目、明細部署→事業部、ソート順、GMV flag
- 未割当: 初期状態。警告付き保存可。未割当集約先に自動集計
- 集計不要: 営業利益より下の科目。分析画面では完全非表示
- Excel 原本: Google Drive に保存
- Master storage: Google Sheet を正本に。保存後即時反映
- Radius: app-wide でゼロに戻す
- shadcn baseline: `.shadcn/` に格納して design consistency 総合監査
