import { useState, useRef, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type ExpandedState,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"

import { cn } from "@/lib/utils"
import { EMPTY_STATE } from "@/lib/ui/tokens"
import { TYPOGRAPHY, SPACING } from "@/lib/ui/theme"

export interface DetailTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: ColumnDef<T>[]
  renderSubComponent?: (row: T) => React.ReactNode
  getRowId?: (row: T) => string
  highlightedRowId?: string
  className?: string
}

export function DetailTable<T extends Record<string, unknown>>({
  data,
  columns,
  renderSubComponent,
  getRowId,
  highlightedRowId,
  className,
}: DetailTableProps<T>) {
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const parentRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data,
    columns,
    state: { expanded },
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId,
    getRowCanExpand: () => Boolean(renderSubComponent),
  })

  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Fallback when scroll container has no height (e.g. jsdom test environment):
  // render all rows without virtualization measurements.
  const hasVirtualItems = virtualItems.length > 0
  const items = hasVirtualItems
    ? virtualItems
    : rows.map((row, index) => ({ index, key: row.id as string | number, start: 0, size: 40, end: 0, lane: 0 }))

  const paddingTop = hasVirtualItems && items.length > 0 ? items[0].start : 0
  const paddingBottom =
    hasVirtualItems && items.length > 0
      ? virtualizer.getTotalSize() - items[items.length - 1].end
      : 0

  const measureRef = useCallback(
    (node: HTMLTableSectionElement | null) => {
      if (node) virtualizer.measureElement(node)
    },
    [virtualizer],
  )

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-auto max-h-[70vh]", className)}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-background z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn("px-3 text-left", TYPOGRAPHY.tableHeader, SPACING.tableRowHeight)}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        {rows.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={columns.length} className="px-3 py-4 text-center text-muted-foreground">
                {EMPTY_STATE}
              </td>
            </tr>
          </tbody>
        ) : (
          <>
            {paddingTop > 0 && (
              <tbody aria-hidden="true">
                <tr>
                  <td style={{ height: paddingTop, padding: 0 }} />
                </tr>
              </tbody>
            )}
            {items.map((virtualRow) => {
              const row = rows[virtualRow.index]
              const isHighlighted = highlightedRowId !== undefined && row.id === highlightedRowId

              return (
                <tbody
                  key={row.id}
                  ref={virtualItems.length > 0 ? measureRef : undefined}
                  data-index={virtualItems.length > 0 ? virtualRow.index : undefined}
                >
                  <tr
                    className={cn(
                      "border-b transition-colors",
                      SPACING.tableRowHeight,
                      isHighlighted && "bg-accent/50",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && renderSubComponent && (
                    <tr>
                      <td colSpan={row.getVisibleCells().length} className="p-0">
                        {renderSubComponent(row.original)}
                      </td>
                    </tr>
                  )}
                </tbody>
              )
            })}
            {paddingBottom > 0 && (
              <tbody aria-hidden="true">
                <tr>
                  <td style={{ height: paddingBottom, padding: 0 }} />
                </tr>
              </tbody>
            )}
          </>
        )}
      </table>
    </div>
  )
}

export function NullCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">{EMPTY_STATE}</span>
  }
  return <>{String(value)}</>
}

export function FinancialCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className={cn(TYPOGRAPHY.financial, "text-muted-foreground")}>{EMPTY_STATE}</span>
  }
  return <span className={TYPOGRAPHY.financial}>{String(value)}</span>
}
