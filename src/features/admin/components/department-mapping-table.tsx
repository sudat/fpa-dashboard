import { useState } from "react";

import type { DepartmentMasterEntry, DepartmentBucketStatus } from "@/lib/domain/master-contract";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TYPOGRAPHY } from "@/lib/ui/theme";
import { cn } from "@/lib/utils";

interface DepartmentMappingTableProps {
  entries: DepartmentMasterEntry[];
  onUpdate: (index: number, changes: Partial<DepartmentMasterEntry>) => void;
  onAdd: (detailName: string, businessUnitName: string) => void;
  onRemove: (index: number) => void;
}

const BUCKET_OPTIONS: { value: DepartmentBucketStatus; label: string }[] = [
  { value: "normal", label: "通常" },
  { value: "unassigned", label: "未割当" },
];

function rowClasses(bucketStatus: DepartmentBucketStatus): string {
  if (bucketStatus === "unassigned") return "bg-amber-500/10";
  return "";
}

export function DepartmentMappingTable({
  entries,
  onUpdate,
  onAdd,
  onRemove,
}: DepartmentMappingTableProps) {
  const textInputClassName = cn(
    "h-7 rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
  );

  const selectClassName = cn(textInputClassName, "pr-8");

  const [newDetailName, setNewDetailName] = useState("");
  const [newBusinessUnitName, setNewBusinessUnitName] = useState("");

  const handleAdd = () => {
    if (newDetailName.trim() && newBusinessUnitName.trim()) {
      onAdd(newDetailName.trim(), newBusinessUnitName.trim());
      setNewDetailName("");
      setNewBusinessUnitName("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>明細部署名</TableHead>
            <TableHead>事業部名</TableHead>
            <TableHead className="w-24">ソート順</TableHead>
            <TableHead className="w-32">バケット</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => (
            <TableRow key={`${entry.detailDepartmentName}-${index}`} className={rowClasses(entry.bucketStatus)}>
              <TableCell>
                <span className={TYPOGRAPHY.body}>{entry.detailDepartmentName}</span>
              </TableCell>
              <TableCell>
                <input
                  type="text"
                  value={entry.businessUnitName}
                  onChange={(e) => onUpdate(index, { businessUnitName: e.target.value })}
                  className={cn(textInputClassName, "w-full")}
                />
              </TableCell>
              <TableCell>
                <input
                  type="number"
                  value={entry.sortOrder}
                  onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) })}
                  className={cn(textInputClassName, "w-20")}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <select
                    value={entry.bucketStatus}
                    onChange={(e) => onUpdate(index, { bucketStatus: e.target.value as DepartmentBucketStatus })}
                    className={selectClassName}
                  >
                    {BUCKET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {entry.bucketStatus === "unassigned" && (
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                      未割当
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(index)}
                  aria-label={`${entry.detailDepartmentName} を削除`}
                >
                  ✕
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center gap-2 border-t pt-3">
        <input
          type="text"
          placeholder="明細部署名"
          value={newDetailName}
          onChange={(e) => setNewDetailName(e.target.value)}
          className={cn(textInputClassName, "w-40")}
        />
        <input
          type="text"
          placeholder="事業部名"
          value={newBusinessUnitName}
          onChange={(e) => setNewBusinessUnitName(e.target.value)}
          className={cn(textInputClassName, "w-40")}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newDetailName.trim() || !newBusinessUnitName.trim()}>
          追加
        </Button>
      </div>
    </div>
  );
}
