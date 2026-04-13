# 科目マスタの正規化（集計科目設定の別シート外だし）

- 優先度: NiceToHave
- ステータス: 未着手
- 対象: AccountMaster シート構造

## 概要

現在 AccountMaster シートは明細科目→集計科目のマッピングと、集計科目の設定値（sortOrder, isGmv, bucketStatus）が1行に混在している。同一集計科目に属す行はこれらの設定値が全て同じになるため、集計科目の属性を別シートに正規化したい。

## 現状

**AccountMaster（1シート）**

| detailAccountName | aggregateAccountName | sortOrder | isGmv | bucketStatus |
|---|---|---|---|---|
| SaaS GMV | GMV | 10 | TRUE | normal |
| 広告 GMV | GMV | 10 | TRUE | normal |
| EC GMV | GMV | 10 | TRUE | normal |
| 人件費 | 販管費 | 50 | FALSE | normal |
| 広告宣伝費 | 販管費 | 50 | FALSE | normal |
| 営業利益 | 営業利益 | 60 | FALSE | excluded |

## 正規化後

**AccountMapping（明細→集計の紐付け）**

| detailAccountName | aggregateAccountName |
|---|---|
| SaaS GMV | GMV |
| 広告 GMV | GMV |
| EC GMV | GMV |
| 人件費 | 販管費 |
| 広告宣伝費 | 販管費 |

**AggregateAccount（集計科目の設定）**

| aggregateAccountName | sortOrder | isGmv | bucketStatus |
|---|---|---|---|
| GMV | 10 | TRUE | normal |
| 売上高 | 20 | FALSE | normal |
| 販管費 | 50 | FALSE | normal |
| 営業利益 | 60 | FALSE | excluded |

## メリット

- 明細科目追加時に設定値のコピペミスを防止
- 集計科目の設定変更（sortOrder変更など）を1箇所で完了
- データモデルの関心分離が明確になる

## 懸念点・注意事項

- スプレッドシートには外部キー制約がないため、AccountMapping側に存在しない aggregateAccountName を登録するリスクあり
- GAS側でJOIN時に参照整合性チェックが必要
- MasterEditor UI を2段構造（集計科目選択→明細紐付け）に改修する必要あり
- 部署マスタは構造がシンプル（isGmvなし、bucketStatus 2値のみ）なため正規化不要

## 対象範囲

- `gas/lib/master.js` - シート読み書きロジック
- `src/lib/domain/master-contract.ts` - Zodスキーマ定義
- `src/lib/domain/master-schema.ts` - マッピングロジック
- `src/features/admin/hooks/use-master-editor.ts` - エディタhook
- `src/features/admin/components/master-editor.tsx` - エディタUI
- `src/features/admin/components/account-mapping-table.tsx` - 科目テーブルUI

## トリガー条件

- 明細科目の追加が月次で頻発するようになった場合
- 集計科目の設定変更が定期的に発生する場合
