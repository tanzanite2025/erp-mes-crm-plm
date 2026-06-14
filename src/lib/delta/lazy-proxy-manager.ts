/**
 * Lazy Proxy Manager
 *
 * Manages Proxy lifecycle based on visibility and modification state.
 * Creates Proxies only for visible rows and preserves Proxies for dirty rows.
 *
 * Performance Goals:
 * - Reduce active Proxy count from ~20,000 to ≤4,000 for 1000-row BOM
 * - O(1) Proxy creation and release operations
 * - Automatic garbage collection for clean, invisible rows
 */
import type { DirtyMarker } from './dirty-marker'

/**
 * Function to extract a unique row ID from a data object
 *
 * @param data - The data object (typically a BOM row)
 * @returns Unique identifier for the row
 *
 * @example
 * ```typescript
 * const extractor: RowIdExtractor = (row) => row.id;
 * const rowId = extractor({ id: 'BOM-001', name: 'Part A' }); // 'BOM-001'
 * ```
 */
export type RowIdExtractor<T = any> = (data: T) => string

/**
 * Manages Proxy lifecycle based on visibility and modification state
 */
export interface LazyProxyManager<T> {
  /**
   * Get or create Proxy for a row
   * @param rowId - Unique identifier for the row
   * @param data - Row data to create Proxy for
   * @returns Proxied row data
   */
  getProxy(rowId: string, data: T): T

  /**
   * Release Proxy for a row (if not dirty)
   * @param rowId - Unique identifier for the row
   */
  releaseProxy(rowId: string): void

  /**
   * Check if Proxy exists for a row
   * @param rowId - Unique identifier for the row
   * @returns True if Proxy exists
   */
  hasProxy(rowId: string): boolean

  /**
   * Get active Proxy count
   * @returns Number of active Proxies
   */
  getActiveProxyCount(): number

  /**
   * Force release all clean Proxies (not dirty)
   * Useful for memory cleanup during idle periods
   */
  releaseCleanProxies(): void
}

/**
 * Implementation of LazyProxyManager for BOM rows
 *
 * Uses Map for O(1) Proxy lookup and creation.
 * Integrates with DirtyMarker to preserve dirty row Proxies.
 *
 * Creates lightweight Proxies for individual rows that automatically
 * mark rows as dirty when modified.
 */
export class BOMProxyManager<
  T extends Record<string, unknown>,
> implements LazyProxyManager<T> {
  private proxyCache = new Map<string, T>()
  private dirtyMarker: DirtyMarker
  // @ts-expect-error - rowIdExtractor is stored for potential future use
  private rowIdExtractor: RowIdExtractor<T>
  private onMutation?: () => void

  /**
   * Create a new BOMProxyManager
   * @param dirtyMarker - Dirty marker instance for tracking modifications
   * @param rowIdExtractor - Function to extract row ID from row data
   * @param onMutation - Optional callback when any row is mutated
   */
  constructor(
    dirtyMarker: DirtyMarker,
    rowIdExtractor: RowIdExtractor<T>,
    onMutation?: () => void
  ) {
    this.dirtyMarker = dirtyMarker
    this.rowIdExtractor = rowIdExtractor
    this.onMutation = onMutation
  }

  /**
   * Get or create Proxy for a row
   *
   * If Proxy already exists in cache, return it.
   * Otherwise, create new Proxy and cache it.
   *
   * Time Complexity: O(1)
   */
  getProxy(rowId: string, data: T): T {
    let proxy = this.proxyCache.get(rowId)

    if (!proxy) {
      proxy = this.createRowProxy(data, rowId)
      this.proxyCache.set(rowId, proxy)
    }

    return proxy
  }

  /**
   * Create a Proxy for a single row
   *
   * The Proxy automatically marks the row as dirty when any field is modified.
   */
  private createRowProxy(data: T, rowId: string): T {
    return new Proxy(data, {
      set: (target, key, value) => {
        const oldValue = Reflect.get(target, key)

        // If value hasn't changed, don't record mutation
        if (oldValue === value) return true

        // Set the new value
        Reflect.set(target, key, value)

        // Mark the row as dirty
        this.dirtyMarker.markDirty(rowId)

        // Notify mutation callback
        this.onMutation?.()

        return true
      },
      deleteProperty: (target, key) => {
        Reflect.deleteProperty(target, key)

        // Mark the row as dirty
        this.dirtyMarker.markDirty(rowId)

        // Notify mutation callback
        this.onMutation?.()

        return true
      },
    })
  }

  /**
   * Release Proxy for a row (if not dirty)
   *
   * Only releases Proxy if the row is not marked as dirty.
   * Dirty rows maintain their Proxies to preserve pending changes.
   *
   * Time Complexity: O(1)
   */
  releaseProxy(rowId: string): void {
    // Only release if not dirty
    if (!this.dirtyMarker.isDirty(rowId)) {
      this.proxyCache.delete(rowId)
    }
  }

  /**
   * Check if Proxy exists for a row
   *
   * Time Complexity: O(1)
   */
  hasProxy(rowId: string): boolean {
    return this.proxyCache.has(rowId)
  }

  /**
   * Get active Proxy count
   *
   * Time Complexity: O(1)
   */
  getActiveProxyCount(): number {
    return this.proxyCache.size
  }

  /**
   * Force release all clean Proxies (not dirty)
   *
   * Iterates through all cached Proxies and releases those
   * that are not marked as dirty.
   *
   * Useful for memory cleanup during idle periods or after commit.
   *
   * Time Complexity: O(n) where n is the number of cached Proxies
   */
  releaseCleanProxies(): void {
    const dirtyRows = this.dirtyMarker.getDirtyRows()

    for (const [rowId] of this.proxyCache) {
      if (!dirtyRows.has(rowId)) {
        this.proxyCache.delete(rowId)
      }
    }
  }

  /**
   * Get all cached row IDs
   *
   * Useful for debugging and testing.
   *
   * @returns Array of row IDs that have cached Proxies
   */
  getCachedRowIds(): string[] {
    return Array.from(this.proxyCache.keys())
  }

  /**
   * Clear all Proxies (including dirty ones)
   *
   * WARNING: This will clear all Proxies, including those with pending changes.
   * Use with caution. Typically only used after successful commit or on unmount.
   */
  clearAll(): void {
    this.proxyCache.clear()
  }

  /**
   * Get Proxy tracker for a row (for advanced use cases)
   *
   * @param rowId - Unique identifier for the row
   * @returns Proxied row or undefined if not cached
   */
  getTracker(rowId: string): T | undefined {
    return this.proxyCache.get(rowId)
  }
}
