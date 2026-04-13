import { BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type NavItem = "analysis" | "admin"

interface SidebarProps {
  activeNav: NavItem
  onNavChange: (nav: NavItem) => void
}

const NAV_ITEMS: { key: NavItem; label: string; icon: React.ElementType }[] = [
  { key: "analysis", label: "予実分析", icon: BarChart3 },
  { key: "admin", label: "管理", icon: Settings },
]

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  return (
    <aside
      className="flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
      style={{ width: "var(--sidebar-width)", minWidth: "var(--sidebar-width)" }}
    >
      <div className="flex h-12 items-center px-4">
        <span className="text-sm font-semibold tracking-tight">FPA Dashboard</span>
      </div>

      <Separator />

      <nav className="flex flex-col gap-1 p-2" role="navigation" aria-label="メインナビゲーション">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start gap-2 px-3",
              activeNav === key && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
            onClick={() => onNavChange(key)}
            aria-current={activeNav === key ? "page" : undefined}
          >
            <Icon className="size-4" />
            {label}
          </Button>
        ))}
      </nav>
    </aside>
  )
}
