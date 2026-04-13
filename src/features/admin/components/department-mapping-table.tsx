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
  if (bucketStatus === "unassigned") return "bg-amber-50/50";
  return "";
}

export function DepartmentMappingTable({
  entries,
  onUpdate,
  onAdd,
  onRemove,
}: DepartmentMappingTableProps) {
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
                  className="h-7 w-full border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
                />
              </TableCell>
              <TableCell>
                <input
                  type="number"
                  value={entry.sortOrder}
                  onChange={(e) => onUpdate(index, { sortOrder: Number(e.target.value) })}
                  className="h-7 w-20 border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <select
                    value={entry.bucketStatus}
                    onChange={(e) => onUpdate(index, { bucketStatus: e.target.value as DepartmentBucketStatus })}
                    className="h-7 border border-input bg-transparent px-1 text-sm outline-none focus:border-ring"
                  >
                    {BUCKET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {entry.bucketStatus === "unassigned" && (
                    <Badge variant="outline" className="border-amber-500 bg-amber-50 text-amber-700 text-[10px]">
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
          className="h-7 w-40 border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
        />
        <input
          type="text"
          placeholder="事業部名"
          value={newBusinessUnitName}
          onChange={(e) => setNewBusinessUnitName(e.target.value)}
          className="h-7 w-40 border border-input bg-transparent px-2 text-sm outline-none focus:border-ring"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Button variant="outline" size="sm" onClick={handleAdd} disabled={!newDetailName.trim() || !newBusinessUnitName.trim()}>
          追加
        </Button>
      </div>
    </div>
  );
}
