import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SaveStatus } from "@/features/admin/hooks/use-master-editor";

interface MasterSaveBarProps {
  isDirty: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  unassignedCount: number;
  excludedCount: number;
  onSave: () => void;
  onReset: () => void;
}

export function MasterSaveBar({
  isDirty,
  saveStatus,
  saveError,
  unassignedCount,
  excludedCount,
  onSave,
  onReset,
}: MasterSaveBarProps) {
  const isSaving = saveStatus === "loading";

  return (
    <div className="sticky bottom-0 flex items-center justify-between border-t bg-background px-4 py-3">
      <div className="flex items-center gap-3">
        {isDirty && (
          <Badge variant="outline" className="border-blue-400 bg-blue-50 text-blue-700">
            未保存の変更あり
          </Badge>
        )}
        {unassignedCount > 0 && (
          <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700">
            {unassignedCount}件の未割当があります
          </Badge>
        )}
        {excludedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            集計不要: {excludedCount}件
          </span>
        )}
        {saveStatus === "success" && (
          <Badge variant="outline" className="border-green-500 bg-green-50 text-green-700">
            保存しました
          </Badge>
        )}
        {saveStatus === "error" && saveError && (
          <Badge variant="destructive">
            {saveError}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isDirty && (
          <Button variant="ghost" size="sm" onClick={onReset} disabled={isSaving}>
            リセット
          </Button>
        )}
        <Button
          size="sm"
          onClick={onSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
