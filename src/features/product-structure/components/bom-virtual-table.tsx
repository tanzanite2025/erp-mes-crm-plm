/**
 * BOM Virtual Table Component
 *
 * Optimized BOM table with virtual scrolling and lazy Proxy creation.
 *
 * Performance Goals:
 * - Render only visible rows plus overscan buffer
 * - Create Proxies only for visible rows
 * - Release Proxies for invisible clean rows
 * - Support dynamic row heights
 * - Target: ≤100ms initial render for 1000 rows
 */

'use client'

import { useRef, useEffect, useMemo, type CSSProperties } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker'
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager'
import { createLogger } from '@/lib/logger'
import {
  DEFAULT_BOM_VIRTUAL_CONFIG,
  type BOMVirtualScrollerConfig,
} from '../config/virtual-scroller-config'

const logger = createLogger('BOMVirtualTable')

/**
 * BOM row data structure (simplified for virtual table)
 */
export interface BOMVirtualRow {
  id: string
  [key: string]: unknown
}

/**
 * Column definition for BOM table
 */
export interface BOMColumn<T extends BOMVirtualRow = BOMVirtualRow> {
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
 * Props for BOMVirtualTable component
 */
export interface BOMVirtualTableProps<T extends BOMVirtualRow = BOMVirtualRow> {
  /**
   * BOM rows to display
   */
  rows: T[]

  /**
   * Column definitions
   */
  columns: BOMColumn<T>[]

  /**
   * Callback when a row is changed
   */
  onRowChange?: (row: T) => void

  /**
   * Virtual scroller configuration
   */
  config?: BOMVirtualScrollerConfig

  /**
   * Custom row renderer
   * If not provided, uses default row renderer
   */
  renderRow?: (props: BOMVirtualRowProps<T>) => React.ReactNode

  /**
   * Custom row height estimator
   * If not provided, uses config.estimateSize
   */
  estimateRowHeight?: (index: number) => number

  /**
   * Custom row key extractor
   * If not provided, uses row.id
   */
  getRowKey?: (row: T) => string

  /**
   * Custom class name for table container
   */
  className?: string

  /**
   * Custom style for table container
   */
  style?: CSSProperties

  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean
}

/**
 * Props for BOM virtual row component
 */
export interface BOMVirtualRowProps<T extends BOMVirtualRow = BOMVirtualRow> {
  row: T
  columns: BOMColumn<T>[]
  style: CSSProperties
  onRowChange?: (row: T) => void
}

/**
 * Default row renderer for BOM virtual table
 */
function DefaultBOMVirtualRow<T extends BOMVirtualRow>({
  row,
  columns,
  style,
  onRowChange,
}: BOMVirtualRowProps<T>) {
  return (
    <div
      className='bom-virtual-row flex items-center border-b border-dashed border-muted/30 transition-colors hover:bg-amber-500/5'
      style={style}
    >
      {columns.map((column) => {
        const value = row[column.field]
        const cellStyle: CSSProperties = {
          width: column.width,
          minWidth: column.minWidth,
          flex: column.width ? undefined : 1,
        }

        const handleChange = (newValue: unknown) => {
          Reflect.set(row, column.field, newValue)
          onRowChange?.(row)
        }

        return (
          <div
            key={column.id}
            className='bom-virtual-cell px-4 py-3 text-sm'
            style={cellStyle}
          >
            {column.render
              ? column.render(value, row, handleChange)
              : String(value)}
          </div>
        )
      })}
    </div>
  )
}

/**
 * BOM Virtual Table Component
 *
 * Implements virtual scrolling with lazy Proxy creation for optimal performance.
 *
 * Features:
 * - Virtual scrolling with configurable overscan
 * - Lazy Proxy creation for visible rows only
 * - Automatic Proxy release for invisible clean rows
 * - Dynamic row heights support
 * - Dirty row tracking and preservation
 */
export function BOMVirtualTable<T extends BOMVirtualRow = BOMVirtualRow>({
  rows,
  columns,
  onRowChange,
  config = DEFAULT_BOM_VIRTUAL_CONFIG,
  renderRow,
  estimateRowHeight,
  getRowKey = (row) => row.id,
  className = '',
  style,
  enablePerformanceMonitoring = false,
}: BOMVirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  // Initialize dirty marker and proxy manager
  const dirtyMarker = useRef(new BOMDirtyMarker())
  const proxyManager = useRef(
    new BOMProxyManager<T>(
      dirtyMarker.current,
      (row) => getRowKey(row),
      () => {
        // Mutation callback - could be used for performance monitoring
        if (enablePerformanceMonitoring) {
          logger.debug('Row mutated')
        }
      }
    )
  )

  // Performance monitoring
  const renderStartTime = useRef<number>(0)

  useEffect(() => {
    if (enablePerformanceMonitoring) {
      renderStartTime.current = performance.now()
    }
  }, [enablePerformanceMonitoring])

  useEffect(() => {
    if (enablePerformanceMonitoring && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current
      logger.debug('Initial render completed', { renderTimeMs: renderTime })
      renderStartTime.current = 0
    }
  })

  // Virtual scroller setup
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: estimateRowHeight || (() => config.estimateSize),
    overscan: config.overscan,
    // Enable dynamic size measurement if configured
    measureElement: config.enableDynamicSize
      ? (element) => element.getBoundingClientRect().height
      : undefined,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  // Memoize visible row IDs for efficient comparison
  const visibleRowIds = useMemo(
    () => new Set(virtualRows.map((vRow) => getRowKey(rows[vRow.index]))),
    [virtualRows, rows, getRowKey]
  )

  // Release Proxies for rows that scrolled out of view
  useEffect(() => {
    // Get all cached row IDs
    const cachedRowIds = proxyManager.current.getCachedRowIds()

    // Release Proxies for invisible clean rows
    cachedRowIds.forEach((rowId) => {
      if (!visibleRowIds.has(rowId)) {
        proxyManager.current.releaseProxy(rowId)
      }
    })

    if (enablePerformanceMonitoring) {
      logger.debug('Proxy cache stats', {
        activeProxies: proxyManager.current.getActiveProxyCount(),
        dirtyRows: dirtyMarker.current.getDirtyCount(),
        visibleRows: visibleRowIds.size,
      })
    }
  }, [visibleRowIds, enablePerformanceMonitoring])

  // Render row component
  const RowComponent = renderRow || DefaultBOMVirtualRow

  return (
    <div
      ref={parentRef}
      className={`bom-virtual-table-container overflow-auto ${className}`}
      style={{
        height: '100%',
        width: '100%',
        ...style,
      }}
    >
      {/* Table header */}
      <div className='bom-virtual-header sticky top-0 z-10 flex items-center border-b border-dashed border-muted bg-muted/30'>
        {columns.map((column) => {
          const headerStyle: CSSProperties = {
            width: column.width,
            minWidth: column.minWidth,
            flex: column.width ? undefined : 1,
          }

          return (
            <div
              key={column.id}
              className='bom-virtual-header-cell px-4 py-3 text-xs font-black tracking-widest text-muted-foreground/40 uppercase'
              style={headerStyle}
            >
              {column.label}
            </div>
          )
        })}
      </div>

      {/* Virtual scrolling container */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index]
          const rowId = getRowKey(row)

          // Get or create Proxy for visible row
          const proxiedRow = proxyManager.current.getProxy(rowId, row)

          const rowStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            transform: `translateY(${virtualRow.start}px)`,
            // Add data attribute for dynamic size measurement
            ...(config.enableDynamicSize && {
              'data-index': virtualRow.index,
            }),
          }

          return (
            <div
              key={rowId}
              data-index={virtualRow.index}
              ref={
                config.enableDynamicSize
                  ? rowVirtualizer.measureElement
                  : undefined
              }
            >
              <RowComponent
                row={proxiedRow}
                columns={columns}
                style={rowStyle}
                onRowChange={onRowChange}
              />
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className='flex h-48 items-center justify-center text-muted-foreground'>
          <p className='text-sm font-medium'>No data available</p>
        </div>
      )}
    </div>
  )
}

/**
 * Hook for managing BOM virtual table state
 *
 * Provides utilities for row updates, commit, and dirty tracking.
 */
/**
 * Hook for BOM virtual table (placeholder for future enhancements)
 *
 * @param _initialRows - Initial rows (reserved for future use)
 */
export function useBOMVirtualTable<T extends BOMVirtualRow>(_initialRows: T[]) {
  const dirtyMarker = useRef(new BOMDirtyMarker())
  const proxyManager = useRef(
    new BOMProxyManager<T>(dirtyMarker.current, (row) => row.id)
  )

  /**
   * Get dirty row count
   */
  const getDirtyCount = () => dirtyMarker.current.getDirtyCount()

  /**
   * Get dirty row IDs
   */
  const getDirtyRowIds = () => Array.from(dirtyMarker.current.getDirtyRows())

  /**
   * Clear all dirty markers
   */
  const clearDirty = () => {
    dirtyMarker.current.clearAll()
  }

  /**
   * Release all clean Proxies
   */
  const releaseCleanProxies = () => {
    proxyManager.current.releaseCleanProxies()
  }

  /**
   * Get active Proxy count
   */
  const getActiveProxyCount = () => proxyManager.current.getActiveProxyCount()

  return {
    dirtyMarker: dirtyMarker.current,
    proxyManager: proxyManager.current,
    getDirtyCount,
    getDirtyRowIds,
    clearDirty,
    releaseCleanProxies,
    getActiveProxyCount,
  }
}
