/**
 * Unit tests for OptimizedProxyTracker
 * 
 * Tests the optimized proxy tracker with dirty marking and shallow comparison.
 * Target: ≥90% code coverage
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOMDirtyMarker } from './dirty-marker';
import { OptimizedProxyTracker, type RowIdExtractor } from './optimized-proxy-tracker';

/**
 * Test BOM row interface
 */
interface TestBOMRow {
  id: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Test BOM dataset structure
 */
interface TestBOMData {
  rows: TestBOMRow[];
}

/**
 * Helper function to create test BOM data
 */
function createTestBOMData(rowCount: number): TestBOMData {
  return {
    rows: Array.from({ length: rowCount }, (_, i) => ({
      id: `BOM-${i.toString().padStart(3, '0')}`,
      partNumber: `PART-${i}`,
      quantity: 100 + i,
      unitPrice: 10.5 + i,
    })),
  };
}

describe('OptimizedProxyTracker', () => {
  let dirtyMarker: BOMDirtyMarker;
  let rowIdExtractor: RowIdExtractor<TestBOMRow>;

  beforeEach(() => {
    dirtyMarker = new BOMDirtyMarker();
    rowIdExtractor = (row: TestBOMRow) => row.id;
  });

  describe('constructor', () => {
    it('creates tracker with initial data', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      expect(tracker).toBeDefined();
      expect(tracker.data).toBeDefined();
      expect(tracker.data.rows).toHaveLength(5);
    });

    it('accepts optional onMutation callback', () => {
      const data = createTestBOMData(5);
      const onMutation = vi.fn();
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor,
        onMutation
      );

      expect(tracker).toBeDefined();
    });

    it('clones initial data to prevent external mutations', () => {
      const data = createTestBOMData(5);
      const originalFirstRow = { ...data.rows[0] };
      
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Mutate original data
      data.rows[0].quantity = 999;

      // Tracker should have original value
      expect(tracker.data.rows[0].quantity).toBe(originalFirstRow.quantity);
    });
  });

  describe('dirty marking on field changes', () => {
    it('marks row as dirty when field is modified', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify a field
      tracker.data.rows[0].quantity = 200;

      // Row should be marked as dirty
      expect(dirtyMarker.isDirty('BOM-000')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('marks multiple rows as dirty when multiple fields are modified', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify multiple rows
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[2].partNumber = 'NEW-PART';
      tracker.data.rows[4].unitPrice = 99.99;

      // All modified rows should be marked as dirty
      expect(dirtyMarker.isDirty('BOM-000')).toBe(true);
      expect(dirtyMarker.isDirty('BOM-002')).toBe(true);
      expect(dirtyMarker.isDirty('BOM-004')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(3);
    });

    it('does not mark row as dirty when field value does not change', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      const originalQuantity = tracker.data.rows[0].quantity;

      // Set to same value
      tracker.data.rows[0].quantity = originalQuantity;

      // Row should NOT be marked as dirty
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('marks row as dirty only once for multiple field changes', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify multiple fields in the same row
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[0].partNumber = 'NEW-PART';
      tracker.data.rows[0].unitPrice = 99.99;

      // Row should be marked as dirty only once
      expect(dirtyMarker.isDirty('BOM-000')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('does not mark unmodified rows as dirty', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify only row 0
      tracker.data.rows[0].quantity = 200;

      // Other rows should NOT be marked as dirty
      expect(dirtyMarker.isDirty('BOM-001')).toBe(false);
      expect(dirtyMarker.isDirty('BOM-002')).toBe(false);
      expect(dirtyMarker.isDirty('BOM-003')).toBe(false);
      expect(dirtyMarker.isDirty('BOM-004')).toBe(false);
    });
  });

  describe('commit - optimized diff generation', () => {
    it('returns empty delta when no rows are dirty', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      const delta = tracker.commit();

      expect(delta).toEqual({});
      expect(Object.keys(delta)).toHaveLength(0);
    });

    it('generates delta only for dirty rows', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify row 0
      tracker.data.rows[0].quantity = 200;

      const delta = tracker.commit();

      // Should only have delta for row 0
      expect(delta['rows.0.quantity']).toBeDefined();
      expect(delta['rows.0.quantity'].o).toBe(100);
      expect(delta['rows.0.quantity'].n).toBe(200);

      // Should not have deltas for other rows
      expect(delta['rows.1.quantity']).toBeUndefined();
      expect(delta['rows.2.quantity']).toBeUndefined();
    });

    it('generates delta for multiple dirty rows', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify multiple rows
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[2].partNumber = 'NEW-PART';

      const delta = tracker.commit();

      // Should have deltas for both modified rows
      expect(delta['rows.0.quantity']).toBeDefined();
      expect(delta['rows.2.partNumber']).toBeDefined();
    });

    it('generates delta for multiple fields in same row', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify multiple fields in row 0
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[0].unitPrice = 99.99;

      const delta = tracker.commit();

      // Should have deltas for both fields
      expect(delta['rows.0.quantity']).toBeDefined();
      expect(delta['rows.0.unitPrice']).toBeDefined();
      expect(delta['rows.0.quantity'].o).toBe(100);
      expect(delta['rows.0.quantity'].n).toBe(200);
      expect(delta['rows.0.unitPrice'].o).toBe(10.5);
      expect(delta['rows.0.unitPrice'].n).toBe(99.99);
    });

    it('uses shallow comparison for field changes', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify a field
      const oldValue = tracker.data.rows[0].quantity;
      tracker.data.rows[0].quantity = 200;

      const delta = tracker.commit();

      // Should detect change using shallow comparison (===)
      expect(delta['rows.0.quantity']).toBeDefined();
      expect(delta['rows.0.quantity'].o).toBe(oldValue);
      expect(delta['rows.0.quantity'].n).toBe(200);
    });

    it('does not generate delta for unchanged fields in dirty rows', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify only quantity
      tracker.data.rows[0].quantity = 200;

      const delta = tracker.commit();

      // Should only have delta for quantity, not other fields
      expect(delta['rows.0.quantity']).toBeDefined();
      expect(delta['rows.0.partNumber']).toBeUndefined();
      expect(delta['rows.0.unitPrice']).toBeUndefined();
    });
  });

  describe('getDirtyCount', () => {
    it('returns 0 when no rows are dirty', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      expect(tracker.getDirtyCount()).toBe(0);
    });

    it('returns correct count after modifications', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[2].quantity = 300;

      expect(tracker.getDirtyCount()).toBe(2);
    });
  });

  describe('isRowDirty', () => {
    it('returns false for clean rows', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      expect(tracker.isRowDirty('BOM-000')).toBe(false);
    });

    it('returns true for dirty rows', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      tracker.data.rows[0].quantity = 200;

      expect(tracker.isRowDirty('BOM-000')).toBe(true);
    });
  });

  describe('clearDirtyMarkers', () => {
    it('clears all dirty markers', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Make some rows dirty
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[2].quantity = 300;

      expect(tracker.getDirtyCount()).toBe(2);

      // Clear dirty markers
      tracker.clearDirtyMarkers();

      expect(tracker.getDirtyCount()).toBe(0);
      expect(tracker.isRowDirty('BOM-000')).toBe(false);
      expect(tracker.isRowDirty('BOM-002')).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets tracker to new baseline data', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Make modifications
      tracker.data.rows[0].quantity = 200;
      expect(tracker.getDirtyCount()).toBe(1);

      // Reset with new data
      const newData = createTestBOMData(3);
      tracker.reset(newData);

      // Should have new data and no dirty markers
      expect(tracker.data.rows).toHaveLength(3);
      expect(tracker.getDirtyCount()).toBe(0);
    });

    it('clears all dirty markers on reset', () => {
      const data = createTestBOMData(5);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Make modifications
      tracker.data.rows[0].quantity = 200;
      tracker.data.rows[2].quantity = 300;
      expect(tracker.getDirtyCount()).toBe(2);

      // Reset
      tracker.reset(data);

      // All dirty markers should be cleared
      expect(tracker.getDirtyCount()).toBe(0);
    });
  });

  describe('Performance characteristics', () => {
    it('commit is fast for large datasets with few dirty rows', () => {
      const data = createTestBOMData(1000);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Mark only 10% as dirty
      for (let i = 0; i < 100; i++) {
        tracker.data.rows[i].quantity = 999;
      }

      // Measure commit time
      const start = performance.now();
      const delta = tracker.commit();
      const duration = performance.now() - start;

      // Should be fast (< 50ms for 1000 rows with 10% dirty)
      expect(duration).toBeLessThan(50);

      // Should only have deltas for dirty rows
      const deltaKeys = Object.keys(delta);
      expect(deltaKeys.length).toBeGreaterThan(0);
      expect(deltaKeys.length).toBeLessThanOrEqual(100 * 4); // 100 rows × 4 fields max
    });

    it('handles large datasets efficiently', () => {
      const data = createTestBOMData(2000);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // Modify 5% of rows
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        tracker.data.rows[i].quantity = 999;
      }
      const modifyDuration = performance.now() - start;

      // Modifications should be fast
      expect(modifyDuration).toBeLessThan(100);

      // Dirty count should be correct
      expect(tracker.getDirtyCount()).toBe(100);
    });
  });

  describe('Integration scenarios', () => {
    it('simulates typical BOM editing workflow', () => {
      const data = createTestBOMData(10);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // User edits row 0
      tracker.data.rows[0].quantity = 200;
      expect(tracker.getDirtyCount()).toBe(1);

      // User edits row 5
      tracker.data.rows[5].partNumber = 'NEW-PART';
      expect(tracker.getDirtyCount()).toBe(2);

      // User commits changes
      const delta = tracker.commit();
      expect(Object.keys(delta).length).toBeGreaterThan(0);

      // After commit, clear dirty markers
      tracker.clearDirtyMarkers();
      expect(tracker.getDirtyCount()).toBe(0);
    });

    it('handles multiple edit-commit cycles', () => {
      const data = createTestBOMData(10);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      // First edit cycle
      tracker.data.rows[0].quantity = 200;
      const delta1 = tracker.commit();
      expect(Object.keys(delta1).length).toBeGreaterThan(0);
      tracker.clearDirtyMarkers();

      // Second edit cycle
      tracker.data.rows[5].quantity = 300;
      const delta2 = tracker.commit();
      expect(Object.keys(delta2).length).toBeGreaterThan(0);
      tracker.clearDirtyMarkers();

      // Deltas should be independent
      expect(delta1).not.toEqual(delta2);
    });
  });

  describe('Edge cases', () => {
    it('handles empty dataset', () => {
      const data: TestBOMData = { rows: [] };
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      const delta = tracker.commit();
      expect(delta).toEqual({});
    });

    it('handles single row dataset', () => {
      const data = createTestBOMData(1);
      const tracker = new OptimizedProxyTracker(
        data,
        dirtyMarker,
        rowIdExtractor
      );

      tracker.data.rows[0].quantity = 200;

      const delta = tracker.commit();
      expect(delta['rows.0.quantity']).toBeDefined();
    });

    it('handles row ID extraction failure gracefully', () => {
      const data = createTestBOMData(5);
      const faultyExtractor: RowIdExtractor = () => {
        throw new Error('Extraction failed');
      };

      // Should not throw during construction
      expect(() => {
        new OptimizedProxyTracker(data, dirtyMarker, faultyExtractor);
      }).not.toThrow();
    });
  });
});
