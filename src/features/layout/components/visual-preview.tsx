import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  FINANCIAL_COLORS,
  TYPOGRAPHY,
} from "@/lib/ui/theme"
import { SIGN_COLORS, NEGATIVE_PREFIX, POSITIVE_DELTA_PREFIX } from "@/lib/ui/tokens"

const SAMPLE_KPIS = [
  { label: "売上高", value: "12,345", unit: "百万", delta: "+5.2%", sign: "positive" as const },
  { label: "営業利益", value: "2,100", unit: "百万", delta: "△3.1%", sign: "negative" as const },
  { label: "経常利益", value: "2,450", unit: "百万", delta: "+1.8%", sign: "positive" as const },
  { label: "当期純利益", value: "1,680", unit: "百万", delta: "―", sign: "neutral" as const },
]

const SAMPLE_TABLE_ROWS = [
  { account: "売上高", actual: "12,345", forecast: "11,740", diff: "+605", prev: "11,200", yoy: "+1,145" },
  { account: "売上原価", actual: "7,890", forecast: "7,500", diff: "+390", prev: "7,200", yoy: "+690" },
  { account: "売上総利益", actual: "4,455", forecast: "4,240", diff: "+215", prev: "4,000", yoy: "+455" },
  { account: "販管費", actual: "2,100", forecast: "1,980", diff: "+120", prev: "1,950", yoy: "+150" },
  { account: "営業利益", actual: "2,355", forecast: "2,260", diff: "+95", prev: "2,050", yoy: "+305" },
]

function signClass(sign: "positive" | "negative" | "neutral" | "empty") {
  return FINANCIAL_COLORS[sign] ?? SIGN_COLORS[sign]
}

export function VisualPreview() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <div>
          <h1 className={TYPOGRAPHY.pageTitle}>予実分析ダッシュボード</h1>
          <p className={TYPOGRAPHY.small}>Visual Foundation Preview — システムのビジュアル基盤確認用</p>
        </div>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>主要指標 (KPI Cards)</h2>
          <div className="grid grid-cols-4 gap-4">
            {SAMPLE_KPIS.map((kpi) => (
              <Card key={kpi.label} size="sm">
                <CardHeader>
                  <CardTitle className="text-meta">{kpi.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-financial-lg">{kpi.value}</span>
                    <span className={TYPOGRAPHY.small}>{kpi.unit}</span>
                  </div>
                  <div className={`mt-1 text-financial ${signClass(kpi.sign)}`}>
                    {kpi.delta}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>タブ切替 & 詳細表</h2>
          <Tabs defaultValue="landing">
            <TabsList>
              <TabsTrigger value="landing">着地見込</TabsTrigger>
              <TabsTrigger value="ytd">YTD</TabsTrigger>
              <TabsTrigger value="monthly">単月</TabsTrigger>
            </TabsList>

            <TabsContent value="landing">
              <Card size="sm">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-table-header">科目</TableHead>
                        <TableHead className="text-table-header text-right">B: 実績+見込</TableHead>
                        <TableHead className="text-table-header text-right">A: 前月見込</TableHead>
                        <TableHead className="text-table-header text-right">B-A</TableHead>
                        <TableHead className="text-table-header text-right">C: 前年実績</TableHead>
                        <TableHead className="text-table-header text-right">B-C</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SAMPLE_TABLE_ROWS.map((row, i) => (
                        <TableRow key={row.account} className={i % 2 === 1 ? "bg-table-stripe" : ""}>
                          <TableCell className="font-medium">{row.account}</TableCell>
                          <TableCell className="text-right text-financial">{row.actual}</TableCell>
                          <TableCell className="text-right text-financial">{row.forecast}</TableCell>
                          <TableCell className="text-right text-financial text-positive">
                            {row.diff.startsWith(NEGATIVE_PREFIX) ? (
                              <span className="text-negative">{row.diff}</span>
                            ) : (
                              <span className="text-positive">{row.diff}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-financial">{row.prev}</TableCell>
                          <TableCell className="text-right text-financial text-positive">
                            {row.yoy}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ytd">
              <Card size="sm">
                <CardContent className="p-6 text-center text-muted-foreground">
                  YTD タブのコンテンツ（同じテーブル形式で表示予定）
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card size="sm">
                <CardContent className="p-6 text-center text-muted-foreground">
                  単月タブのコンテンツ（同じテーブル形式で表示予定）
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>バッジ (Badge Variants)</h2>
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">確認済</Badge>
            <Badge variant="secondary">レビュー中</Badge>
            <Badge variant="destructive">要確認</Badge>
            <Badge variant="outline">未着手</Badge>
            <Badge variant="ghost">メモ</Badge>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>財務値カラー (Financial Colors)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-none border p-4 space-y-2">
              <p className={TYPOGRAPHY.small}>ポジティブ (Positive)</p>
              <p className="text-financial-lg text-positive">{POSITIVE_DELTA_PREFIX}12.5%</p>
              <div className="h-2 w-full rounded-none bg-positive-muted" />
            </div>
            <div className="rounded-none border p-4 space-y-2">
              <p className={TYPOGRAPHY.small}>ネガティブ (Negative)</p>
              <p className="text-financial-lg text-negative">{NEGATIVE_PREFIX}8.3%</p>
              <div className="h-2 w-full rounded-none bg-negative-muted" />
            </div>
            <div className="rounded-none border p-4 space-y-2">
              <p className={TYPOGRAPHY.small}>ニュートラル (Neutral)</p>
              <p className="text-financial-lg">―</p>
              <div className="h-2 w-full rounded-none bg-muted" />
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>ボタン (Button Variants)</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">デフォルト</Button>
            <Button variant="secondary">セカンダリ</Button>
            <Button variant="outline">アウトライン</Button>
            <Button variant="ghost">ゴースト</Button>
            <Button variant="destructive">削除</Button>
            <Button size="sm">小</Button>
            <Button size="xs">極小</Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <h2 className={TYPOGRAPHY.sectionHeader}>タイポグラフィスケール (Typography Scale)</h2>
          <div className="space-y-3">
            <div>
              <span className={TYPOGRAPHY.small}>pageTitle →</span>
              <p className={TYPOGRAPHY.pageTitle}>売上高 着地見込分析</p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>sectionHeader →</span>
              <p className={TYPOGRAPHY.sectionHeader}>推移グラフ</p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>tableHeader →</span>
              <p className={TYPOGRAPHY.tableHeader}>科目名 / 前月見込 / 実績 / 差異</p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>body →</span>
              <p className={TYPOGRAPHY.body}>
                売上高は前月見込に対して{POSITIVE_DELTA_PREFIX}605百万円の上振れ。主にEC事業の好調による。
              </p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>meta →</span>
              <p className={TYPOGRAPHY.small}>最終更新: 2026年4月13日 14:30</p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>financial →</span>
              <p className="text-financial">1,234,567</p>
            </div>
            <div>
              <span className={TYPOGRAPHY.small}>financialLg →</span>
              <p className="text-financial-lg">12,345百万</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-6">
          <h2 className={TYPOGRAPHY.sectionHeader}>レイアウト定数 (Layout Constants)</h2>
          <div className={TYPOGRAPHY.body + " space-y-1 text-muted-foreground"}>
            <p>Sidebar: 220px (expanded) / 48px (collapsed)</p>
            <p>Viewport target: 1440px+ (desktop-first)</p>
          </div>
        </section>
      </div>
    </div>
  )
}
