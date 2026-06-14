/**
 * useBOMOptimizedData Hook
 *
 * Optimized hook for BOM data management with dirty marking and lazy Proxy support.
 *
 * Features:
 * - Integrates with BOMDirtyMarker for change tracking
 * - Integrates with BOMProxyManager for lazy Proxy creation
 * - Memoized handlers to prevent unnecessary re-renders
 * - Only processes dirty rows during commit
 *
 * Performance Goals:
 * - Commit operation: ≤50ms for 1000 rows with 10% dirty
 */
import { useState, useCallback, useRef, useMemo } from 'react'
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker'
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useBOMOptimizedData')

/**
 * BOM row data interface
 */
export interface BOMRowData {
  id: string
  [key: string]: unknown
}

/**
 * Delta change entry
 */
export interface DeltaChange {
  /**
   * Old value
   */
  o: unknown

  /**
   * New value
   */
  n: unknown
}

/**
 * Delta set for BOM changes
 */
export interface DeltaSet {
  [path: string]: DeltaChange
}

/**
 * Options for useBOMOptimizedData hook
 */
export interface UseBOMOptimizedDataOptions<T extends BOMRowData> {
  /**
   * Initial BOM rows
   */
  initialRows: T[]

  /**
   * Callback when commit is successful
   */
  onCommitSuccess?: (delta: DeltaSet) => void

  /**
   * Callback when commit fails
   */
  onCommitError?: (error: Error) => void

  /**
   * Custom row ID extractor (defaults to row.id)
   */
  rowIdExtractor?: (row: T) => string
}

/**
 * Return value from useBOMOptimizedData hook
 */
export interface UseBOMOptimizedDataReturn<T extends BOMRowData> {
  /**
   * Current BOM rows
   */
  rows: T[]

  /**
   * Handler for row updates
   */
  handleRowUpdate: (updatedRow: T) => void

  /**
   * Handler for committing changes
   */
  handleCommit: () => Promise<DeltaSet>

  /**
   * Number of dirty rows
   */
  dirtyCount: number

  /**
   * Get Proxy for a row (for use in virtual scroller)
   */
  getRowProxy: (rowId: string) => T | undefined

  /**
   * Release Proxy for a row (when scrolled out of view)
   */
  releaseRowProxy: (rowId: string) => void

  /**
   * Check if a row is dirty
   */
  isRowDirty: (rowId: string) => boolean

  /**
   * Clear all dirty markers (after successful commit)
   */
  clearDirtyMarkers: () => void

  /**
   * Get active Proxy count
   */
  activeProxyCount: number
}

/**
 * Default row ID extractor
 */
const defaultRowIdExtractor = <T extends BOMRowData>(row: T): string => row.id

/**
 * useBOMOptimizedData Hook
 *
 * Provides optimized BOM data management with dirty marking and lazy Proxy support.
 *
 * @example
 * ```tsx
 * const {
 *   rows,
 *   handleRowUpdate,
 *   handleCommit,
 *   dirtyCount,
 *   getRowProxy,
 *   releaseRowProxy,
 * } = useBOMOptimizedData({
 *   initialRows: bomRows,
 *   onCommitSuccess: (delta) => {
 *     logger.info('Committed changes', delta);
 *   },
 * });
 * ```
 */
export function useBOMOptimizedData<T extends BOMRowData>({
  initialRows,
  onCommitSuccess,
  onCommitError,
  rowIdExtractor = defaultRowIdExtractor,
}: UseBOMOptimizedDataOptions<T>): UseBOMOptimizedDataReturn<T> {
  // State for BOM rows
  const [rows, setRows] = useState<T[]>(initialRows)

  // State for dirty count (to trigger re-renders)
  const [dirtyCount, setDirtyCount] = useState(0)

  // State for active Proxy count (to trigger re-renders)
  const [activeProxyCount, setActiveProxyCount] = useState(0)

  // Refs for dirty marker and proxy manager (persistent across re-renders)
  const dirtyMarker = useRef(new BOMDirtyMarker())
  const proxyManager = useRef(
    new BOMProxyManager<T>(dirtyMarker.current, rowIdExtractor)
  )

  // Store baseline data for diff calculation
  const baselineData = useRef(new Map<string, T>())

  // Initialize baseline data
  useMemo(() => {
    initialRows.forEach((row) => {
      const rowId = rowIdExtractor(row)
      baselineData.current.set(rowId, { ...row })
    })
  }, [initialRows, rowIdExtractor])

  // Helper to update counts
  const updateCounts = useCallback(() => {
    setDirtyCount(dirtyMarker.current.getDirtyCount())
    setActiveProxyCount(proxyManager.current.getActiveProxyCount())
  }, [])

  // Memoized row update handler
  const handleRowUpdate = useCallback(
    (updatedRow: T) => {
      const rowId = rowIdExtractor(updatedRow)

      // Mark row as dirty
      dirtyMarker.current.markDirty(rowId)

      // Update rows state
      setRows((prevRows) =>
        prevRows.map((row) =>
          rowIdExtractor(row) === rowId ? updatedRow : row
        )
      )

      // Update counts
      updateCounts()
    },
    [rowIdExtractor, updateCounts]
  )

  // Memoized commit handler
  const handleCommit = useCallback(async (): Promise<DeltaSet> => {
    try {
      const dirtyRowIds = dirtyMarker.current.getDirtyRows()
      const delta: DeltaSet = {}

      // Only process dirty rows
      for (const rowId of dirtyRowIds) {
        const currentRow = rows.find((r) => rowIdExtractor(r) === rowId)
        const baselineRow = baselineData.current.get(rowId)

        if (!currentRow || !baselineRow) {
          logger.warn('Row not found for ID', { rowId })
          continue
        }

        // Calculate delta for this row using shallow comparison
        Object.keys(currentRow).forEach((fieldName) => {
          const oldValue = baselineRow[fieldName]
          const newValue = currentRow[fieldName]

          // Use shallow comparison
          if (oldValue !== newValue) {
            const path = `rows.${rowId}.${fieldName}`
            delta[path] = {
              o: oldValue,
              n: newValue,
            }
          }
        })
      }

      // Call success callback
      onCommitSuccess?.(delta)

      // Update baseline data after successful commit
      dirtyRowIds.forEach((rowId) => {
        const currentRow = rows.find((r) => rowIdExtractor(r) === rowId)
        if (currentRow) {
          baselineData.current.set(rowId, { ...currentRow })
        }
      })

      // Clear dirty markers after successful commit
      dirtyMarker.current.clearAll()

      // Update counts
      updateCounts()

      return delta
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      onCommitError?.(err)
      throw err
    }
  }, [rows, rowIdExtractor, onCommitSuccess, onCommitError, updateCounts])

  // Get Proxy for a row
  const getRowProxy = useCallback(
    (rowId: string): T | undefined => {
      const row = rows.find((r) => rowIdExtractor(r) === rowId)
      if (!row) {
        return undefined
      }

      const proxy = proxyManager.current.getProxy(rowId, row)
      updateCounts()
      return proxy
    },
    [rows, rowIdExtractor, updateCounts]
  )

  // Release Proxy for a row
  const releaseRowProxy = useCallback(
    (rowId: string): void => {
      proxyManager.current.releaseProxy(rowId)
      updateCounts()
    },
    [updateCounts]
  )

  // Check if a row is dirty
  const isRowDirty = useCallback((rowId: string): boolean => {
    return dirtyMarker.current.isDirty(rowId)
  }, [])

  // Clear all dirty markers
  const clearDirtyMarkers = useCallback((): void => {
    dirtyMarker.current.clearAll()
    updateCounts()
  }, [updateCounts])

  return {
    rows,
    handleRowUpdate,
    handleCommit,
    dirtyCount,
    getRowProxy,
    releaseRowProxy,
    isRowDirty,
    clearDirtyMarkers,
    activeProxyCount,
  }
}

/**
 * Type helper for useBOMOptimizedData return value
 */
export type UseBOMOptimizedDataHook = typeof useBOMOptimizedData
