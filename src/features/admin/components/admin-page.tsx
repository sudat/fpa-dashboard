import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TYPOGRAPHY, SPACING } from "@/lib/ui/theme"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ImportLog } from "./import-log"
import { MasterDiffWarning } from "./master-diff-warning"
import { UploadSection } from "./upload-section"

export interface ImportResult {
  id: string
  fileName: string
  uploadedAt: string
  type: string
  yearMonth: string
  status: "success" | "partial" | "failed"
  errorMessage?: string
  warnings?: MasterDiffWarningItem[]
}

export interface MasterDiffWarningItem {
  id: string
  type: "new_account" | "new_department" | "mapping_change"
  code: string
  name: string
  status: "pending" | "approved" | "ignored"
}

interface AdminPageProps {
  importResults?: ImportResult[]
  onNavigateToAnalysis?: () => void
}

export function AdminPage({
  importResults = [],
  onNavigateToAnalysis,
}: AdminPageProps) {
  const [selectedResult, setSelectedResult] = useState<ImportResult | null>(null)

  const handleNavigateToAnalysis = () => {
    onNavigateToAnalysis?.()
    console.log("Navigate to analysis page")
  }

  return (
    <div className={`flex flex-col ${SPACING.sectionGap}`}>
      <h1 className={TYPOGRAPHY.pageTitle}>管理画面</h1>

      <UploadSection />
      <ImportLog results={importResults} onRowClick={setSelectedResult} />

      <div className="flex justify-end">
        <Button onClick={handleNavigateToAnalysis} size="lg">
          分析画面で確認
        </Button>
      </div>

      <Sheet
        open={selectedResult !== null}
        onOpenChange={(open) => { if (!open) setSelectedResult(null) }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>未マッピング警告</SheetTitle>
            <SheetDescription>
              {selectedResult?.fileName} の警告一覧
            </SheetDescription>
          </SheetHeader>
          {selectedResult?.warnings && (
            <MasterDiffWarning warnings={selectedResult.warnings} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
