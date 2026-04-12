import { cn } from "@/lib/utils"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { TYPOGRAPHY } from "@/lib/ui/theme"

export interface AnalysisFallbackProps {
  variant: "empty" | "error" | "loading"
  message?: string
  onRetry?: () => void
  className?: string
}

const DEFAULT_MESSAGES: Record<AnalysisFallbackProps["variant"], string> = {
  empty: "データがありません",
  error: "エラーが発生しました",
  loading: "読み込み中...",
} as const

export function AnalysisFallback({
  variant,
  message,
  onRetry,
  className,
}: AnalysisFallbackProps) {
  const displayMessage = message ?? DEFAULT_MESSAGES[variant]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12",
        variant === "loading" && "animate-pulse",
        className,
      )}
      data-testid={`analysis-fallback-${variant}`}
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <span className={cn(TYPOGRAPHY.small, "text-center")}>
        {variant === "empty" ? EMPTY_STATE : displayMessage}
      </span>

      {variant === "empty" && displayMessage !== DEFAULT_MESSAGES.empty && (
        <span className={cn(TYPOGRAPHY.small, "text-center")}>
          {displayMessage}
        </span>
      )}

      {variant === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            "mt-1 rounded-md px-3 py-1 text-xs font-medium",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "transition-colors",
          )}
        >
          再試行
        </button>
      )}

      {variant === "loading" && (
        <div className="mt-2 h-2 w-24 rounded bg-muted" />
      )}
    </div>
  )
}
