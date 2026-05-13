/**
 * Property-Based Tests for BOMProxyManager
 * 
 * Property 5: Lazy Proxy Lifecycle
 * Validates Requirements 4.1, 4.2
 * 
 * Property 6: Change Persistence Across Visibility
 * Validates Requirements 4.4, 4.5
 * 
 * This test verifies that the lazy Proxy manager correctly manages
 * Proxy lifecycle based on visibility and modification state.
 * 
 * Minimum 100 iterations per property test
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { BOMDirtyMarker } from './dirty-marker';
import { BOMProxyManager } from './lazy-proxy-manager';

/**
 * Test BOM row interface
 */
interface TestBOMRow {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description: string;
}

/**
 * Scroll action types
 */
type ScrollAction = 
  | { type: 'scrollTo'; position: number }
  | { type: 'scrollBy'; delta: number }
  | { type: 'scrollToRow'; rowIndex: number };

/**
 * Modification action
 */
interface ModificationAction {
  rowIndex: number;
  field: keyof Omit<TestBOMRow, 'id'>;
  newValue: string | number;
}

/**
 * Arbitrary generator for BOM row IDs
 */
const bomRowIdArbitrary = fc.string({ minLength: 1, maxLength: 10 }).map(
  (s) => `BOM-${s.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 6)}`
);

/**
 * Arbitrary generator for BOM rows
 */
const bomRowArbitrary: fc.Arbitrary<TestBOMRow> = fc.record({
  id: bomRowIdArbitrary,
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string({ minLength: 0, maxLength: 200 }),
  quantity: fc.integer({ min: 1, max: 10000 }),
  price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
});

/**
 * Arbitrary generator for BOM datasets with configurable size
 */
const bomDatasetArbitrary = (minRows: number, maxRows: number) =>
  fc.array(bomRowArbitrary, { minLength: minRows, maxLength: maxRows }).map((rows) => {
    // Ensure unique IDs
    const uniqueRows = rows.map((row, index) => ({
      ...row,
      id: `BOM-${index.toString().padStart(6, '0')}`,
    }));
    return uniqueRows;
  });

/**
 * Arbitrary generator for scroll actions
 */
const scrollActionArbitrary = (maxRowIndex: number): fc.Arbitrary<ScrollAction> =>
  fc.oneof(
    fc.record({
      type: fc.constant('scrollTo' as const),
      position: fc.integer({ min: 0, max: maxRowIndex }),
    }),
    fc.record({
      type: fc.constant('scrollBy' as const),
      delta: fc.integer({ min: -10, max: 10 }),
    }),
    fc.record({
      type: fc.constant('scrollToRow' as const),
      rowIndex: fc.integer({ min: 0, max: maxRowIndex }),
    })
  );

/**
 * Arbitrary generator for modification actions
 */
const modificationActionArbitrary = (maxRowIndex: number): fc.Arbitrary<ModificationAction> =>
  fc.record({
    rowIndex: fc.integer({ min: 0, max: maxRowIndex }),
    field: fc.constantFrom('name', 'description', 'quantity', 'price'),
    newValue: fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.integer({ min: 1, max: 10000 }),
      fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
    ),
  });

/**
 * Simulates visible rows based on scroll position
 */
function getVisibleRows(
  totalRows: number,
  scrollPosition: number,
  viewportSize: number,
  overscan: number
): number[] {
  const startIndex = Math.max(0, scrollPosition - overscan);
  const endIndex = Math.min(totalRows - 1, scrollPosition + viewportSize + overscan);
  
  const visibleIndices: number[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleIndices.push(i);
  }
  
  return visibleIndices;
}

/**
 * Applies a scroll action and returns new scroll position
 */
function applyScrollAction(
  action: ScrollAction,
  currentPosition: number,
  totalRows: number
): number {
  switch (action.type) {
    case 'scrollTo':
      return Math.max(0, Math.min(totalRows - 1, action.position));
    case 'scrollBy':
      return Math.max(0, Math.min(totalRows - 1, currentPosition + action.delta));
    case 'scrollToRow':
      return Math.max(0, Math.min(totalRows - 1, action.rowIndex));
    default:
      return currentPosition;
  }
}

describe('Property 5: Lazy Proxy Lifecycle', () => {
  it('maintains Proxy count ≤ (visible rows + dirty rows) during scrolling', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(20, 100),
        fc.array(scrollActionArbitrary(99), { minLength: 5, maxLength: 20 }),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 0, maxLength: 10 }),
        (rows, scrollActions, dirtyRowIndices) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const viewportSize = 10;
          const overscan = 5;
          let scrollPosition = 0;
          
          // Mark some rows as dirty
          const validDirtyIndices = dirtyRowIndices.filter(i => i < rows.length);
          validDirtyIndices.forEach((index) => {
            const row = rows[index];
            const proxy = proxyManager.getProxy(row.id, row);
            proxy.quantity = 999; // Modify to mark as dirty
          });
          
          // Simulate scrolling
          scrollActions.forEach((action) => {
            scrollPosition = applyScrollAction(action, scrollPosition, rows.length);
            
            const visibleIndices = getVisibleRows(
              rows.length,
              scrollPosition,
              viewportSize,
              overscan
            );
            
            // Create Proxies for visible rows
            visibleIndices.forEach((index) => {
              if (index < rows.length) {
                const row = rows[index];
                proxyManager.getProxy(row.id, row);
              }
            });
            
            // Release Proxies for invisible rows
            rows.forEach((row, index) => {
              if (!visibleIndices.includes(index)) {
                proxyManager.releaseProxy(row.id);
              }
            });
            
            // Verify Proxy count constraint
            const activeProxyCount = proxyManager.getActiveProxyCount();
            const dirtyCount = dirtyMarker.getDirtyCount();
            const visibleCount = visibleIndices.length;
            const maxExpectedProxies = visibleCount + dirtyCount;
            
            // Proxy count should not exceed visible + dirty
            expect(activeProxyCount).toBeLessThanOrEqual(maxExpectedProxies);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('releases Proxies for clean rows when scrolled out of view', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.array(scrollActionArbitrary(199), { minLength: 10, maxLength: 30 }),
        (rows, scrollActions) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const viewportSize = 20;
          const overscan = 5;
          let scrollPosition = 0;
          
          // Track which rows were visible at some point
          const everVisibleRowIds = new Set<string>();
          
          // Simulate scrolling
          scrollActions.forEach((action) => {
            scrollPosition = applyScrollAction(action, scrollPosition, rows.length);
            
            const visibleIndices = getVisibleRows(
              rows.length,
              scrollPosition,
              viewportSize,
              overscan
            );
            
            // Create Proxies for visible rows
            visibleIndices.forEach((index) => {
              if (index < rows.length) {
                const row = rows[index];
                proxyManager.getProxy(row.id, row);
                everVisibleRowIds.add(row.id);
              }
            });
            
            // Release Proxies for invisible rows
            rows.forEach((row, index) => {
              if (!visibleIndices.includes(index)) {
                proxyManager.releaseProxy(row.id);
              }
            });
          });
          
          // After scrolling, all clean rows that are not visible should have no Proxy
          const finalVisibleIndices = getVisibleRows(
            rows.length,
            scrollPosition,
            viewportSize,
            overscan
          );
          
          rows.forEach((row, index) => {
            const isVisible = finalVisibleIndices.includes(index);
            const isDirty = dirtyMarker.isDirty(row.id);
            const hasProxy = proxyManager.hasProxy(row.id);
            
            // If row is clean and not visible, it should not have a Proxy
            if (!isDirty && !isVisible && everVisibleRowIds.has(row.id)) {
              expect(hasProxy).toBe(false);
            }
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('preserves Proxies for dirty rows regardless of visibility', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(30, 100),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 5, maxLength: 15 }),
        fc.array(scrollActionArbitrary(99), { minLength: 10, maxLength: 20 }),
        (rows, dirtyRowIndices, scrollActions) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const viewportSize = 15;
          const overscan = 5;
          let scrollPosition = 0;
          
          // Mark some rows as dirty and track their IDs
          const validDirtyIndices = dirtyRowIndices.filter(i => i < rows.length);
          const dirtyRowIds = new Set<string>();
          
          // First, create Proxies for all rows that will be dirty
          validDirtyIndices.forEach((index) => {
            const row = rows[index];
            proxyManager.getProxy(row.id, row);
            dirtyRowIds.add(row.id);
          });
          
          // Then modify them
          validDirtyIndices.forEach((index) => {
            const row = rows[index];
            const proxy = proxyManager.getProxy(row.id, row);
            proxy.quantity = 999; // Modify to mark as dirty
          });
          
          // Simulate scrolling
          scrollActions.forEach((action) => {
            scrollPosition = applyScrollAction(action, scrollPosition, rows.length);
            
            const visibleIndices = getVisibleRows(
              rows.length,
              scrollPosition,
              viewportSize,
              overscan
            );
            
            // Create Proxies for visible rows
            visibleIndices.forEach((index) => {
              if (index < rows.length) {
                const row = rows[index];
                proxyManager.getProxy(row.id, row);
              }
            });
            
            // Try to release Proxies for invisible rows
            rows.forEach((row, index) => {
              if (!visibleIndices.includes(index)) {
                proxyManager.releaseProxy(row.id);
              }
            });
          });
          
          // Verify all dirty rows still have Proxies
          dirtyRowIds.forEach((rowId) => {
            expect(proxyManager.hasProxy(rowId)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('handles mixed visible and invisible dirty rows correctly', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 150),
        fc.array(scrollActionArbitrary(149), { minLength: 5, maxLength: 15 }),
        (rows, scrollActions) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const viewportSize = 20;
          const overscan = 5;
          let scrollPosition = 0;
          
          // Make first 10 rows dirty
          const dirtyRowIds = new Set<string>();
          for (let i = 0; i < Math.min(10, rows.length); i++) {
            const row = rows[i];
            const proxy = proxyManager.getProxy(row.id, row);
            proxy.quantity = 999;
            dirtyRowIds.add(row.id);
          }
          
          // Scroll to middle/end to make dirty rows invisible
          scrollActions.forEach((action) => {
            scrollPosition = applyScrollAction(action, scrollPosition, rows.length);
            
            const visibleIndices = getVisibleRows(
              rows.length,
              scrollPosition,
              viewportSize,
              overscan
            );
            
            // Create Proxies for visible rows
            visibleIndices.forEach((index) => {
              if (index < rows.length) {
                const row = rows[index];
                proxyManager.getProxy(row.id, row);
              }
            });
            
            // Release Proxies for invisible rows
            rows.forEach((row, index) => {
              if (!visibleIndices.includes(index)) {
                proxyManager.releaseProxy(row.id);
              }
            });
          });
          
          // All dirty rows should still have Proxies, even if not visible
          dirtyRowIds.forEach((rowId) => {
            expect(proxyManager.hasProxy(rowId)).toBe(true);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 6: Change Persistence Across Visibility', () => {
  it('preserves changes after scrolling row out and back in (round-trip)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.array(modificationActionArbitrary(199), { minLength: 5, maxLength: 20 }),
        (rows, modifications) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const viewportSize = 20;
          const overscan = 5;
          
          // Apply modifications and track expected values
          const expectedValues = new Map<string, Partial<TestBOMRow>>();
          
          const validModifications = modifications.filter(m => m.rowIndex < rows.length);
          validModifications.forEach((mod) => {
            const row = rows[mod.rowIndex];
            const proxy = proxyManager.getProxy(row.id, row);
            
            // Apply modification
            (proxy as any)[mod.field] = mod.newValue;
            
            // Track expected value
            if (!expectedValues.has(row.id)) {
              expectedValues.set(row.id, {});
            }
            const expected = expectedValues.get(row.id)!;
            (expected as any)[mod.field] = mod.newValue;
          });
          
          // Scroll modified rows out of view
          const scrollPosition = Math.min(rows.length - viewportSize, rows.length - 1);
          const visibleIndices = getVisibleRows(
            rows.length,
            scrollPosition,
            viewportSize,
            overscan
          );
          
          // Release Proxies for invisible rows (dirty rows should be preserved)
          rows.forEach((row, index) => {
            if (!visibleIndices.includes(index)) {
              proxyManager.releaseProxy(row.id);
            }
          });
          
          // Scroll back to beginning to make modified rows visible again
          const backToStartIndices = getVisibleRows(rows.length, 0, viewportSize, overscan);
          
          // Verify all modifications are preserved
          expectedValues.forEach((expectedFields, rowId) => {
            const row = rows.find(r => r.id === rowId);
            if (!row) return;
            
            const proxy = proxyManager.getProxy(rowId, row);
            
            Object.entries(expectedFields).forEach(([field, expectedValue]) => {
              expect((proxy as any)[field]).toBe(expectedValue);
            });
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('includes all modifications in commit regardless of visibility', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(30, 100),
        fc.array(modificationActionArbitrary(99), { minLength: 5, maxLength: 15 }),
        (rows, modifications) => {
          // Skip if no rows
          if (rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          // Apply modifications
          const modifiedRowIds = new Set<string>();
          
          const validModifications = modifications.filter(m => m.rowIndex < rows.length);
          validModifications.forEach((mod) => {
            const row = rows[mod.rowIndex];
            const proxy = proxyManager.getProxy(row.id, row);
            
            // Apply modification
            (proxy as any)[mod.field] = mod.newValue;
            modifiedRowIds.add(row.id);
          });
          
          // Scroll to end to make modified rows invisible
          const viewportSize = 20;
          const overscan = 5;
          const scrollPosition = Math.max(0, rows.length - viewportSize);
          const visibleIndices = getVisibleRows(
            rows.length,
            scrollPosition,
            viewportSize,
            overscan
          );
          
          // Release Proxies for invisible rows
          rows.forEach((row, index) => {
            if (!visibleIndices.includes(index)) {
              proxyManager.releaseProxy(row.id);
            }
          });
          
          // Verify all modified rows are still marked as dirty
          const dirtyRowIds = dirtyMarker.getDirtyRows();
          modifiedRowIds.forEach((rowId) => {
            expect(dirtyRowIds.has(rowId)).toBe(true);
          });
          
          // Verify dirty count matches modification count
          expect(dirtyMarker.getDirtyCount()).toBe(modifiedRowIds.size);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('preserves multiple modifications to same row across visibility changes', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(20, 50),
        fc.integer({ min: 0, max: 49 }),
        fc.array(
          fc.record({
            field: fc.constantFrom('name', 'description', 'quantity', 'price'),
            newValue: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.integer({ min: 1, max: 10000 }),
              fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
            ),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (rows, targetRowIndex, fieldModifications) => {
          // Skip if target row doesn't exist
          if (targetRowIndex >= rows.length || rows.length === 0) return true;
          
          const dirtyMarker = new BOMDirtyMarker();
          const proxyManager = new BOMProxyManager<TestBOMRow>(
            dirtyMarker,
            (row) => row.id
          );
          
          const targetRow = rows[targetRowIndex];
          const proxy = proxyManager.getProxy(targetRow.id, targetRow);
          
          // Apply multiple modifications to same row
          const expectedValues: Partial<TestBOMRow> = {};
          fieldModifications.forEach((mod) => {
            (proxy as any)[mod.field] = mod.newValue;
            (expectedValues as any)[mod.field] = mod.newValue;
          });
          
          // Scroll row out of view
          const viewportSize = 10;
          const overscan = 2;
          const scrollPosition = Math.min(
            rows.length - viewportSize,
            targetRowIndex + viewportSize + overscan + 5
          );
          
          const visibleIndices = getVisibleRows(
            rows.length,
            scrollPosition,
            viewportSize,
            overscan
          );
          
          // Release Proxy if not visible
          if (!visibleIndices.includes(targetRowIndex)) {
            proxyManager.releaseProxy(targetRow.id);
          }
          
          // Row should still be marked as dirty
          expect(dirtyMarker.isDirty(targetRow.id)).toBe(true);
          
          // Scroll back to make row visible
          const backToRowIndices = getVisibleRows(
            rows.length,
            targetRowIndex,
            viewportSize,
            overscan
          );
          
          // Get Proxy again
          const proxyAgain = proxyManager.getProxy(targetRow.id, targetRow);
          
          // Verify all modifications are preserved
          Object.entries(expectedValues).forEach(([field, expectedValue]) => {
            expect((proxyAgain as any)[field]).toBe(expectedValue);
          });
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
