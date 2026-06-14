/**
 * Optimized BOM Cell Component
 *
 * Memoized BOM cell component that only re-renders when its value changes.
 * Uses React.memo with custom comparison function to prevent unnecessary re-renders.
 *
 * Performance Goals:
 * - Only re-render when cell value actually changes
 * - Memoize cell content rendering
 * - Memoize change handlers to prevent re-renders
 */

'use client'

import { memo, useMemo, useCallback, type CSSProperties } from 'react'
import type { BOMRowData, BOMColumnDef } from './bom-row'

/**
 * Props for BOMCell component
 */
export interface BOMCellProps<T extends BOMRowData = BOMRowData> {
  /**
   * Column definition
   */
  column: BOMColumnDef<T>

  /**
   * Cell value
   */
  value: unknown

  /**
   * Row data (for custom renderers)
   */
  row: T

  /**
   * Callback when cell value changes
   */
  onChange: (fieldName: string, value: unknown) => void

  /**
   * Custom className for the cell
   */
  className?: string
}

/**
 * Optimized BOM Cell Component
 *
 * Features:
 * - React.memo with custom comparison to prevent unnecessary re-renders
 * - useMemo for cell content rendering
 * - useCallback for change handlers
 * - Only re-renders when value or column actually changes
 */
function BOMCellComponent<T extends BOMRowData = BOMRowData>({
  column,
  value,
  row, // Used in column.render callback
  onChange,
  className,
}: BOMCellProps<T>) {
  // Memoize cell style based on column configuration
  const cellStyle: CSSProperties = useMemo(
    () => ({
      width: column.width,
      minWidth: column.minWidth,
      flex: column.width ? undefined : 1,
    }),
    [column.width, column.minWidth]
  )

  // Memoize change handler for this specific field
  const handleChange = useCallback(
    (newValue: unknown) => {
      onChange(String(column.field), newValue)
    },
    [column.field, onChange]
  )

  // Memoize cell content rendering
  const cellContent = useMemo(() => {
    // Use custom renderer if provided
    if (column.render) {
      return column.render(value, row, handleChange)
    }

    // Default rendering: display value as string
    if (value === null || value === undefined) {
      return <span className='text-muted-foreground/40'>-</span>
    }

    // Format numbers
    if (typeof value === 'number') {
      return <span className='tabular-nums'>{value.toLocaleString()}</span>
    }

    // Format booleans
    if (typeof value === 'boolean') {
      return <span>{value ? '✓' : '✗'}</span>
    }

    // Default: string representation
    return <span>{String(value)}</span>
  }, [column, value, row, handleChange])

  return (
    <div
      className={`bom-cell px-4 py-3 text-sm ${className || ''}`}
      style={cellStyle}
      role='cell'
    >
      {cellContent}
    </div>
  )
}

/**
 * Custom comparison function for React.memo
 *
 * Only re-render if:
 * - Value changed
 * - Column reference changed
 * - Row reference changed (for custom renderers)
 * - onChange callback changed
 */
function arePropsEqual<T extends BOMRowData>(
  prevProps: BOMCellProps<T>,
  nextProps: BOMCellProps<T>
): boolean {
  // Check if value changed (shallow comparison)
  if (prevProps.value !== nextProps.value) {
    return false
  }

  // Check if column reference changed
  if (prevProps.column !== nextProps.column) {
    return false
  }

  // Check if row reference changed (important for custom renderers)
  if (prevProps.row !== nextProps.row) {
    return false
  }

  // Check if onChange callback changed
  if (prevProps.onChange !== nextProps.onChange) {
    return false
  }

  // Check if className changed
  if (prevProps.className !== nextProps.className) {
    return false
  }

  // Props are equal, don't re-render
  return true
}

/**
 * Memoized BOM Cell Component
 *
 * Export memoized version with custom comparison function
 */
export const BOMCell = memo(
  BOMCellComponent,
  arePropsEqual
) as typeof BOMCellComponent

/**
 * Type helper for BOMCell with generic support
 */
export type BOMCellType = typeof BOMCell

/**
 * Editable BOM Cell Component
 *
 * A specialized cell component for editable fields.
 * Renders an input element instead of plain text.
 */
export interface EditableBOMCellProps<
  T extends BOMRowData = BOMRowData,
> extends BOMCellProps<T> {
  /**
   * Input type (text, number, etc.)
   */
  inputType?: 'text' | 'number' | 'email' | 'tel'

  /**
   * Placeholder text
   */
  placeholder?: string
}

function EditableBOMCellComponent<T extends BOMRowData = BOMRowData>({
  column,
  value,
  row: _row, // Required by interface but not used in this component
  onChange,
  className,
  inputType = 'text',
  placeholder,
}: EditableBOMCellProps<T>) {
  const cellStyle: CSSProperties = useMemo(
    () => ({
      width: column.width,
      minWidth: column.minWidth,
      flex: column.width ? undefined : 1,
    }),
    [column.width, column.minWidth]
  )

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue =
        inputType === 'number'
          ? parseFloat(event.target.value)
          : event.target.value

      onChange(String(column.field), newValue)
    },
    [column.field, onChange, inputType]
  )

  return (
    <div
      className={`bom-cell px-4 py-3 text-sm ${className || ''}`}
      style={cellStyle}
      role='cell'
    >
      <input
        type={inputType}
        value={String(value || '')}
        onChange={handleInputChange}
        placeholder={placeholder}
        className='w-full rounded border border-muted px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none'
      />
    </div>
  )
}

/**
 * Memoized Editable BOM Cell Component
 */
export const EditableBOMCell = memo(
  EditableBOMCellComponent,
  arePropsEqual
) as typeof EditableBOMCellComponent
