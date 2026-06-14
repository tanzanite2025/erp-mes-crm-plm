/**
 * Optimized BOM Row Component
 *
 * Memoized BOM row component that only re-renders when its data changes.
 * Uses React.memo with custom comparison function to prevent unnecessary re-renders.
 *
 * Performance Goals:
 * - Only re-render when row data actually changes
 * - Memoize computed values (className, styles)
 * - Memoize event handlers to prevent child re-renders
 */

'use client'

import { memo, useMemo, useCallback, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { BOMCell } from './bom-cell'

/**
 * BOM row data interface
 */
export interface BOMRowData {
  id: string
  [key: string]: unknown
}

/**
 * Column definition for BOM table
 */
export interface BOMColumnDef<T extends BOMRowData = BOMRowData> {
  id: string
  field: keyof T
  label: string
  width?: number
  minWidth?: number
  editable?: boolean
  render?: (
    value: unknown,
    row: T,
    onChange: (value: unknown) => void
  ) => React.ReactNode
}

/**
 * Props for BOMRow component
 */
export interface BOMRowProps<T extends BOMRowData = BOMRowData> {
  /**
   * Row data (should be a Proxy for change tracking)
   */
  row: T

  /**
   * Column definitions
   */
  columns: BOMColumnDef<T>[]

  /**
   * Custom style for the row
   */
  style?: CSSProperties

  /**
   * Custom className for the row
   */
  className?: string

  /**
   * Callback when row data changes
   */
  onRowChange?: (row: T) => void

  /**
   * Whether the row is dirty (has unsaved changes)
   */
  isDirty?: boolean

  /**
   * Whether the row is selected
   */
  isSelected?: boolean

  /**
   * Callback when row is clicked
   */
  onClick?: (row: T) => void
}

/**
 * Optimized BOM Row Component
 *
 * Features:
 * - React.memo with custom comparison to prevent unnecessary re-renders
 * - useMemo for computed className
 * - useCallback for event handlers
 * - Only re-renders when row data, columns, or props actually change
 */
function BOMRowComponent<T extends BOMRowData = BOMRowData>({
  row,
  columns,
  style,
  className,
  onRowChange,
  isDirty = false,
  isSelected = false,
  onClick,
}: BOMRowProps<T>) {
  // Memoize row className based on state
  const rowClassName = useMemo(
    () =>
      cn(
        'bom-row flex items-center border-b border-dashed border-muted/30',
        'hover:bg-amber-500/5 transition-colors',
        isDirty && 'bom-row--dirty bg-amber-50',
        isSelected && 'bom-row--selected bg-blue-50',
        className
      ),
    [isDirty, isSelected, className]
  )

  // Memoize field change handler
  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      Reflect.set(row, fieldName, value)

      // Notify parent component
      onRowChange?.(row)
    },
    [row, onRowChange]
  )

  // Memoize row click handler
  const handleRowClick = useCallback(() => {
    onClick?.(row)
  }, [row, onClick])

  return (
    <div
      className={rowClassName}
      style={style}
      onClick={handleRowClick}
      role='row'
      aria-selected={isSelected}
    >
      {columns.map((column) => {
        const value = row[column.field]

        return (
          <BOMCell
            key={column.id}
            column={column}
            value={value}
            row={row}
            onChange={handleFieldChange}
          />
        )
      })}
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 *
 * Only re-render if:
 * - Row data reference changed
 * - Columns reference changed
 * - Style changed
 * - isDirty changed
 * - isSelected changed
 */
function arePropsEqual<T extends BOMRowData>(
  prevProps: BOMRowProps<T>,
  nextProps: BOMRowProps<T>
): boolean {
  // Check if row reference changed
  if (prevProps.row !== nextProps.row) {
    return false
  }

  // Check if columns reference changed
  if (prevProps.columns !== nextProps.columns) {
    return false
  }

  // Check if style changed
  if (prevProps.style !== nextProps.style) {
    return false
  }

  // Check if className changed
  if (prevProps.className !== nextProps.className) {
    return false
  }

  // Check if isDirty changed
  if (prevProps.isDirty !== nextProps.isDirty) {
    return false
  }

  // Check if isSelected changed
  if (prevProps.isSelected !== nextProps.isSelected) {
    return false
  }

  // Check if callbacks changed (reference equality)
  if (prevProps.onRowChange !== nextProps.onRowChange) {
    return false
  }

  if (prevProps.onClick !== nextProps.onClick) {
    return false
  }

  // Props are equal, don't re-render
  return true
}

/**
 * Memoized BOM Row Component
 *
 * Export memoized version with custom comparison function
 */
export const BOMRow = memo(
  BOMRowComponent,
  arePropsEqual
) as typeof BOMRowComponent

/**
 * Type helper for BOMRow with generic support
 */
export type BOMRowType = typeof BOMRow
