/**
 * XDFC SDRTS Dirty Marker System
 *
 * Tracks which BOM rows have been modified to enable incremental diff optimization.
 * Uses Set-based storage for O(1) mark/check operations.
 */

/**
 * Interface for tracking dirty (modified) rows in a dataset
 *
 * The DirtyMarker provides a lightweight mechanism to track which rows
 * have been modified without performing expensive deep comparisons.
 * This enables the DiffEngine to only compare dirty rows during commit operations.
 */
export interface DirtyMarker {
  /**
   * Mark a row as dirty (modified)
   *
   * @param rowId - Unique identifier for the row
   */
  markDirty(rowId: string): void

  /**
   * Check if a row is marked as dirty
   *
   * @param rowId - Unique identifier for the row
   * @returns true if the row is dirty, false otherwise
   */
  isDirty(rowId: string): boolean

  /**
   * Get all dirty row IDs
   *
   * @returns A new Set containing all dirty row IDs
   */
  getDirtyRows(): Set<string>

  /**
   * Clear dirty status for a specific row
   *
   * @param rowId - Unique identifier for the row
   */
  clearDirty(rowId: string): void

  /**
   * Clear all dirty markers
   *
   * Typically called after a successful commit operation
   */
  clearAll(): void

  /**
   * Get the count of dirty rows
   *
   * @returns Number of rows currently marked as dirty
   */
  getDirtyCount(): number
}

/**
 * Implementation of DirtyMarker using Set for O(1) operations
 *
 * This implementation is optimized for BOM (Bill of Materials) performance,
 * providing constant-time complexity for all core operations:
 * - markDirty: O(1)
 * - isDirty: O(1)
 * - clearDirty: O(1)
 * - getDirtyCount: O(1)
 *
 * Memory usage scales linearly with the number of dirty rows, not total rows.
 * For a 1000-row BOM with 10% modifications, this uses ~100 Set entries
 * instead of tracking state for all 1000 rows.
 */
export class BOMDirtyMarker implements DirtyMarker {
  private dirtyRows: Set<string> = new Set()

  /**
   * Mark a row as dirty (modified)
   *
   * Time Complexity: O(1)
   *
   * @param rowId - Unique identifier for the row
   */
  markDirty(rowId: string): void {
    this.dirtyRows.add(rowId)
  }

  /**
   * Check if a row is marked as dirty
   *
   * Time Complexity: O(1)
   *
   * @param rowId - Unique identifier for the row
   * @returns true if the row is dirty, false otherwise
   */
  isDirty(rowId: string): boolean {
    return this.dirtyRows.has(rowId)
  }

  /**
   * Get all dirty row IDs
   *
   * Returns a new Set to prevent external modification of internal state.
   *
   * Time Complexity: O(n) where n is the number of dirty rows
   *
   * @returns A new Set containing all dirty row IDs
   */
  getDirtyRows(): Set<string> {
    return new Set(this.dirtyRows)
  }

  /**
   * Clear dirty status for a specific row
   *
   * Time Complexity: O(1)
   *
   * @param rowId - Unique identifier for the row
   */
  clearDirty(rowId: string): void {
    this.dirtyRows.delete(rowId)
  }

  /**
   * Clear all dirty markers
   *
   * Typically called after a successful commit operation to reset
   * the dirty state for the next editing session.
   *
   * Time Complexity: O(1)
   */
  clearAll(): void {
    this.dirtyRows.clear()
  }

  /**
   * Get the count of dirty rows
   *
   * Time Complexity: O(1)
   *
   * @returns Number of rows currently marked as dirty
   */
  getDirtyCount(): number {
    return this.dirtyRows.size
  }
}
