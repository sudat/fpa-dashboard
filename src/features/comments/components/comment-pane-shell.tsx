/**
 * CommentPaneShell — DEFERRED placeholder boundary for the comment system.
 *
 * This component reserves the right-side panel space and explicitly lists
 * features that are deferred to a future release. It does NOT implement
 * any actual comment functionality.
 *
 * @deferred - Mention (@mention)
 * @deferred - Thread replies
 * @deferred - Notification integration
 * @deferred - Approval workflow
 */

import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { COMMENT_PANEL_WIDTH, TYPOGRAPHY } from "@/lib/ui/theme"

const DEFERRED_FEATURES = [
  "メンション（@宛先）",
  "スレッド返信",
  "通知連携",
  "承認ワークフロー",
] as const

interface CommentPaneShellProps {
  className?: string
}

export function CommentPaneShell({ className }: CommentPaneShellProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-l bg-muted/30",
        className,
      )}
      style={{ width: COMMENT_PANEL_WIDTH }}
      data-testid="comment-pane-shell"
      data-comment-status="deferred"
    >
      <div className="flex items-center gap-2 px-4 py-3">
        <h2 className={TYPOGRAPHY.sectionHeader}>コメント</h2>
        <span className="text-xs text-muted-foreground">（準備中）</span>
      </div>

      <Separator />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 text-center">
        <p className="text-muted-foreground mb-6">
          💬 コメント機能は今後のアップデートで追加予定です
        </p>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {DEFERRED_FEATURES.map((feature) => (
            <li
              key={feature}
              data-deferred-feature={feature}
              className="flex items-center gap-2"
            >
              <span aria-hidden="true">⏳</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator />
      <div className="px-4 py-2">
        <p className={TYPOGRAPHY.small}>
          v1.0 では分析に特化しています
        </p>
      </div>
    </aside>
  )
}
