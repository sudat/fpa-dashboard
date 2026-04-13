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

const MOCK_IMPORT_RESULTS: ImportResult[] = [
  {
    id: "1",
    fileName: "2026年4月_予実データ.xlsx",
    uploadedAt: "2026-04-13T10:30:00+09:00",
    type: "予実",
    yearMonth: "2026年4月",
    status: "success",
  },
  {
    id: "2",
    fileName: "2026年3月_予実データ.xlsx",
    uploadedAt: "2026-04-01T09:15:00+09:00",
    type: "予実",
    yearMonth: "2026年3月",
    status: "partial",
    errorMessage: "3件の未マッピング科目あり",
    warnings: [
      { id: "w1", type: "new_account", code: "ACC-NEW-001", name: "AI研究開発費", status: "pending" },
      { id: "w2", type: "new_department", code: "DEPT-NEW-001", name: "グローバル展開推進室", status: "pending" },
    ],
  },
]

export function AdminPage({
  importResults = MOCK_IMPORT_RESULTS,
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
