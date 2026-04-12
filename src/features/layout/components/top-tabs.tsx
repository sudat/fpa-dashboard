import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

export const ORG_TABS = [
  "全社",
  "SaaS事業部",
  "広告事業部",
  "EC事業部",
  "フィンテック事業部",
  "メディア事業部",
  "インフラ事業部",
  "データ事業部",
  "グローバル事業部",
  "新規事業部",
] as const

export type OrgTab = (typeof ORG_TABS)[number]

interface TopTabsProps {
  activeOrgTab: OrgTab
  onOrgTabChange: (tab: OrgTab) => void
}

export function TopTabs({ activeOrgTab, onOrgTabChange }: TopTabsProps) {
  return (
    <ScrollArea className="w-full">
      <Tabs
        value={activeOrgTab}
        onValueChange={(v) => onOrgTabChange(v as OrgTab)}
        orientation="horizontal"
        className="flex flex-col"
        aria-label="組織タブ"
      >
        <TabsList variant="line" className="w-full gap-0">
          {ORG_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="px-3 py-1.5">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
