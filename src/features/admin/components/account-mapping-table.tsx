import { useState } from "react";

import type { AccountMasterEntry, AccountBucketStatus } from "@/lib/domain/master-contract";
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

interface AccountMappingTableProps {
  entries: AccountMasterEntry[];
  onUpdate: (index: number, changes: Partial<AccountMasterEntry>) => void;
  onAdd: (detailName: string, aggregateName: string) => void;
  onRemove: (index: number) => void;
}

const BUCKET_OPTIONS: { value: AccountBucketStatus; label: string }[] = [
  { value: "normal", label: "通常" },
  { value: "unassigned", label: "未割当" },
  { value: "excluded", label: "集計不要" },
];

function rowClasses(bucketStatus: AccountBucketStatus): string {
  if (bucketStatus === "excluded") return "opacity-50 line-through";
  return "";
}

export function AccountMappingTable({
  entries,
  onUpdate,
  onAdd,
  onRemove,
}: AccountMappingTableProps) {
  const textInputClassName = cn(
    "h-7 rounded-md border border-input bg-background px-2 text-sm shadow-xs transition-colors outline-none",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
  );

  const selectClassName = cn(textInputClassName, "pr-8");

  const checkboxClassName = cn(
    "size-4 cursor-pointer rounded-sm border border-input bg-background text-primary shadow-xs transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
  );

  const [newDetailName, setNewDetailName] = useState("");
  const [newAggregateName, setNewAggregateName] = useState("");

  const handleAdd = () => {
    if (newDetailName.trim() && newAggregateName.trim()) {
      onAdd(newDetailName.trim(), newAggregateName.trim());
      setNewDetailName("");
      setNewAggregateName("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>明細科目名</TableHead>
            <TableHead>集計科目名</TableHead>
            <TableHead className="w-24">ソート順</TableHead>
            <TableHead className="w-20 text-center">GMV</TableHead>
            <TableHead className="w-32">バケット</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry, index) => (
            <TableRow key={`${entry.detailAccountName}-${index}`} className={rowClasses(entry.bucketStatus)}>
              <TableCell>
                <span className={TYPOGRAPHY.body}>{entry.detailAccountName}</span>
              </TableCell>
              <TableCell>
                <input
                  type="text"
                  value={entry.aggregateAccountName}
                  onChange={(e) => onUpdate(index, { aggregateAccountName: e.target.value })}
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
              <TableCell className="text-center">
                <input
                  type="checkbox"
                  checked={entry.isGmv}
                  onChange={(e) => onUpdate(index, { isGmv: e.target.checked })}
                   className={checkboxClassName}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <select
                    value={entry.bucketStatus}
                    onChange={(e) => onUpdate(index, { bucketStatus: e.target.value as AccountBucketStatus })}
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
                  {entry.bucketStatus === "excluded" && (
                    <Badge variant="outline" className="border-gray-400 bg-gray-100 text-gray-500 text-[10px]">
                      集計不要
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(index)}
                  aria-label={`${entry.detailAccountName} を削除`}
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
          placeholder="明細科目名"
          value={newDetailName}
          onChange={(e) => setNewDetailName(e.target.value)}
          className={cn(textInputClassName, "w-40")}
        />
        <input
          type="text"
          placeholder="集計科目名"
          value={newAggregateName}
          onChange={(e) => setNewAggregateName(e.target.value)}
          className={cn(textInputClassName, "w-40")}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newDetailName.trim() || !newAggregateName.trim()}>
          追加
        </Button>
      </div>
    </div>
  );
}
