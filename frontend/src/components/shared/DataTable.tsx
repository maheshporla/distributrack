import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/ui.types";

interface DataTablePagination {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Unique key extractor for each row, required for stable rendering. */
  getRowId: (row: T) => string | number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  pagination?: DataTablePagination;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Number of skeleton rows shown while loading. */
  skeletonRowCount?: number;
}

/**
 * Generic table with consistent column config, loading skeletons,
 * empty/error states, and optional pagination controls.
 *
 * Usage:
 *   <DataTable
 *     columns={[{ id: "name", header: "Name", accessor: "name" }]}
 *     data={products}
 *     getRowId={(p) => p.id}
 *   />
 */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription = "There's nothing to show here yet.",
  emptyAction,
  pagination,
  onRowClick,
  className,
  skeletonRowCount = 5,
}: DataTableProps<T>) {
  if (error) {
    return <ErrorState description={error} onRetry={onRetry} />;
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                style={{ width: column.width }}
                className={cn(
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.hideOnMobile && "hidden sm:table-cell",
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading &&
            Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(column.hideOnMobile && "hidden sm:table-cell")}
                  >
                    <Skeleton className="h-4 w-full max-w-[160px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading &&
            data.map((row) => (
              <TableRow
                key={getRowId(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.hideOnMobile && "hidden sm:table-cell",
                    )}
                  >
                    {typeof column.accessor === "function"
                      ? column.accessor(row)
                      : String(row[column.accessor] ?? "—")}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {!isLoading && data.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {pagination && !isLoading && data.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
