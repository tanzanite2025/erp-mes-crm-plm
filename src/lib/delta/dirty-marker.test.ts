/**
 * Unit tests for DirtyMarker system
 * 
 * Tests the dirty marking functionality that enables incremental diff optimization.
 * Target: ≥90% code coverage
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { BOMDirtyMarker, type DirtyMarker } from './dirty-marker';

describe('BOMDirtyMarker', () => {
  let dirtyMarker: DirtyMarker;

  beforeEach(() => {
    dirtyMarker = new BOMDirtyMarker();
  });

  describe('markDirty', () => {
    it('marks a row as dirty', () => {
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
    });

    it('marks multiple rows as dirty', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
      expect(dirtyMarker.isDirty('row-2')).toBe(true);
      expect(dirtyMarker.isDirty('row-3')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(3);
    });

    it('handles marking the same row multiple times (idempotent)', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.getDirtyCount()).toBe(1);
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
    });

    it('handles empty string row IDs', () => {
      dirtyMarker.markDirty('');
      
      expect(dirtyMarker.isDirty('')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('handles special characters in row IDs', () => {
      const specialIds = [
        'row-with-dash',
        'row.with.dots',
        'row_with_underscore',
        'row with spaces',
        'row/with/slashes',
        'row@with#special$chars',
      ];

      specialIds.forEach((id) => {
        dirtyMarker.markDirty(id);
      });

      specialIds.forEach((id) => {
        expect(dirtyMarker.isDirty(id)).toBe(true);
      });
      expect(dirtyMarker.getDirtyCount()).toBe(specialIds.length);
    });
  });

  describe('isDirty', () => {
    it('returns false for unmarked rows', () => {
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
    });

    it('returns true for marked rows', () => {
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
    });

    it('returns false for non-existent rows', () => {
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.isDirty('row-2')).toBe(false);
      expect(dirtyMarker.isDirty('non-existent')).toBe(false);
    });

    it('distinguishes between similar row IDs', () => {
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
      expect(dirtyMarker.isDirty('row-10')).toBe(false);
      expect(dirtyMarker.isDirty('row-11')).toBe(false);
      expect(dirtyMarker.isDirty('row-2')).toBe(false);
    });
  });

  describe('getDirtyRows', () => {
    it('returns empty set when no rows are dirty', () => {
      const dirtyRows = dirtyMarker.getDirtyRows();
      
      expect(dirtyRows.size).toBe(0);
      expect(dirtyRows instanceof Set).toBe(true);
    });

    it('returns all dirty row IDs', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      const dirtyRows = dirtyMarker.getDirtyRows();
      
      expect(dirtyRows.size).toBe(3);
      expect(dirtyRows.has('row-1')).toBe(true);
      expect(dirtyRows.has('row-2')).toBe(true);
      expect(dirtyRows.has('row-3')).toBe(true);
    });

    it('returns a new Set (not a reference to internal state)', () => {
      dirtyMarker.markDirty('row-1');
      
      const dirtyRows1 = dirtyMarker.getDirtyRows();
      const dirtyRows2 = dirtyMarker.getDirtyRows();
      
      // Should be different Set instances
      expect(dirtyRows1).not.toBe(dirtyRows2);
      
      // But should have the same content
      expect(dirtyRows1.size).toBe(dirtyRows2.size);
      expect(dirtyRows1.has('row-1')).toBe(true);
      expect(dirtyRows2.has('row-1')).toBe(true);
    });

    it('prevents external modification of internal state', () => {
      dirtyMarker.markDirty('row-1');
      
      const dirtyRows = dirtyMarker.getDirtyRows();
      dirtyRows.add('row-2'); // Try to modify the returned Set
      
      // Internal state should not be affected
      expect(dirtyMarker.isDirty('row-2')).toBe(false);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });
  });

  describe('clearDirty', () => {
    it('clears dirty status for a specific row', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      
      dirtyMarker.clearDirty('row-1');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
      expect(dirtyMarker.isDirty('row-2')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('handles clearing non-existent rows gracefully', () => {
      dirtyMarker.markDirty('row-1');
      
      dirtyMarker.clearDirty('row-2'); // Clear a row that was never marked
      
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('handles clearing already cleared rows (idempotent)', () => {
      dirtyMarker.markDirty('row-1');
      
      dirtyMarker.clearDirty('row-1');
      dirtyMarker.clearDirty('row-1'); // Clear again
      
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('clears multiple rows independently', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      dirtyMarker.clearDirty('row-1');
      dirtyMarker.clearDirty('row-3');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
      expect(dirtyMarker.isDirty('row-2')).toBe(true);
      expect(dirtyMarker.isDirty('row-3')).toBe(false);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });
  });

  describe('clearAll', () => {
    it('clears all dirty markers', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      dirtyMarker.clearAll();
      
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
      expect(dirtyMarker.isDirty('row-2')).toBe(false);
      expect(dirtyMarker.isDirty('row-3')).toBe(false);
      expect(dirtyMarker.getDirtyCount()).toBe(0);
      expect(dirtyMarker.getDirtyRows().size).toBe(0);
    });

    it('handles clearing when no rows are dirty', () => {
      dirtyMarker.clearAll();
      
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('allows marking rows dirty after clearAll', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.clearAll();
      
      dirtyMarker.markDirty('row-2');
      
      expect(dirtyMarker.isDirty('row-1')).toBe(false);
      expect(dirtyMarker.isDirty('row-2')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });
  });

  describe('getDirtyCount', () => {
    it('returns 0 when no rows are dirty', () => {
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('returns correct count for single dirty row', () => {
      dirtyMarker.markDirty('row-1');
      
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('returns correct count for multiple dirty rows', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      expect(dirtyMarker.getDirtyCount()).toBe(3);
    });

    it('updates count when rows are cleared', () => {
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      dirtyMarker.markDirty('row-3');
      
      expect(dirtyMarker.getDirtyCount()).toBe(3);
      
      dirtyMarker.clearDirty('row-1');
      expect(dirtyMarker.getDirtyCount()).toBe(2);
      
      dirtyMarker.clearAll();
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('handles large numbers of dirty rows', () => {
      const rowCount = 1000;
      
      for (let i = 0; i < rowCount; i++) {
        dirtyMarker.markDirty(`row-${i}`);
      }
      
      expect(dirtyMarker.getDirtyCount()).toBe(rowCount);
    });
  });

  describe('Performance characteristics', () => {
    it('handles large-scale BOM datasets efficiently', () => {
      const rowCount = 2000;
      const dirtyPercentage = 0.1; // 10% dirty
      const dirtyCount = Math.floor(rowCount * dirtyPercentage);
      
      // Mark 10% of rows as dirty
      const startMark = performance.now();
      for (let i = 0; i < dirtyCount; i++) {
        dirtyMarker.markDirty(`row-${i}`);
      }
      const markTime = performance.now() - startMark;
      
      // Check dirty status for all rows
      const startCheck = performance.now();
      for (let i = 0; i < rowCount; i++) {
        dirtyMarker.isDirty(`row-${i}`);
      }
      const checkTime = performance.now() - startCheck;
      
      // Get dirty rows
      const startGet = performance.now();
      const dirtyRows = dirtyMarker.getDirtyRows();
      const getTime = performance.now() - startGet;
      
      // Verify correctness
      expect(dirtyMarker.getDirtyCount()).toBe(dirtyCount);
      expect(dirtyRows.size).toBe(dirtyCount);
      
      // Performance assertions (should be very fast)
      // These are generous thresholds to avoid flaky tests
      expect(markTime).toBeLessThan(50); // Marking 200 rows should take < 50ms
      expect(checkTime).toBeLessThan(50); // Checking 2000 rows should take < 50ms
      expect(getTime).toBeLessThan(10); // Getting dirty rows should take < 10ms
    });

    it('memory usage scales with dirty rows, not total rows', () => {
      const totalRows = 10000;
      const dirtyRows = 100;
      
      // Mark only 100 out of 10,000 rows as dirty
      for (let i = 0; i < dirtyRows; i++) {
        dirtyMarker.markDirty(`row-${i}`);
      }
      
      // Verify only dirty rows are tracked
      expect(dirtyMarker.getDirtyCount()).toBe(dirtyRows);
      
      // Check that non-dirty rows are not tracked
      for (let i = dirtyRows; i < totalRows; i++) {
        expect(dirtyMarker.isDirty(`row-${i}`)).toBe(false);
      }
    });
  });

  describe('Edge cases', () => {
    it('handles numeric string row IDs', () => {
      dirtyMarker.markDirty('123');
      dirtyMarker.markDirty('456');
      
      expect(dirtyMarker.isDirty('123')).toBe(true);
      expect(dirtyMarker.isDirty('456')).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(2);
    });

    it('handles UUID-style row IDs', () => {
      const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
      const uuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      
      dirtyMarker.markDirty(uuid1);
      dirtyMarker.markDirty(uuid2);
      
      expect(dirtyMarker.isDirty(uuid1)).toBe(true);
      expect(dirtyMarker.isDirty(uuid2)).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(2);
    });

    it('handles very long row IDs', () => {
      const longId = 'row-' + 'x'.repeat(1000);
      
      dirtyMarker.markDirty(longId);
      
      expect(dirtyMarker.isDirty(longId)).toBe(true);
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });

    it('handles Unicode characters in row IDs', () => {
      const unicodeIds = [
        'row-中文',
        'row-日本語',
        'row-한글',
        'row-العربية',
        'row-🚀',
        'row-emoji-😀',
      ];

      unicodeIds.forEach((id) => {
        dirtyMarker.markDirty(id);
      });

      unicodeIds.forEach((id) => {
        expect(dirtyMarker.isDirty(id)).toBe(true);
      });
      expect(dirtyMarker.getDirtyCount()).toBe(unicodeIds.length);
    });
  });

  describe('Integration scenarios', () => {
    it('simulates typical BOM editing workflow', () => {
      // Initial state: no dirty rows
      expect(dirtyMarker.getDirtyCount()).toBe(0);
      
      // User edits row 1
      dirtyMarker.markDirty('BOM-001');
      expect(dirtyMarker.getDirtyCount()).toBe(1);
      
      // User edits row 2
      dirtyMarker.markDirty('BOM-002');
      expect(dirtyMarker.getDirtyCount()).toBe(2);
      
      // User edits row 1 again (should not increase count)
      dirtyMarker.markDirty('BOM-001');
      expect(dirtyMarker.getDirtyCount()).toBe(2);
      
      // User commits changes
      const dirtyRows = dirtyMarker.getDirtyRows();
      expect(dirtyRows.size).toBe(2);
      expect(dirtyRows.has('BOM-001')).toBe(true);
      expect(dirtyRows.has('BOM-002')).toBe(true);
      
      // After successful commit, clear all dirty markers
      dirtyMarker.clearAll();
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });

    it('simulates partial commit scenario', () => {
      // User edits multiple rows
      dirtyMarker.markDirty('BOM-001');
      dirtyMarker.markDirty('BOM-002');
      dirtyMarker.markDirty('BOM-003');
      
      // Commit succeeds for some rows but fails for others
      dirtyMarker.clearDirty('BOM-001'); // Successfully committed
      dirtyMarker.clearDirty('BOM-002'); // Successfully committed
      // BOM-003 remains dirty due to commit failure
      
      expect(dirtyMarker.getDirtyCount()).toBe(1);
      expect(dirtyMarker.isDirty('BOM-003')).toBe(true);
    });

    it('simulates undo/redo scenario', () => {
      // User edits row 1
      dirtyMarker.markDirty('BOM-001');
      expect(dirtyMarker.getDirtyCount()).toBe(1);
      
      // User undoes the edit (row is no longer dirty)
      dirtyMarker.clearDirty('BOM-001');
      expect(dirtyMarker.getDirtyCount()).toBe(0);
      
      // User redoes the edit (row becomes dirty again)
      dirtyMarker.markDirty('BOM-001');
      expect(dirtyMarker.getDirtyCount()).toBe(1);
    });
  });
});
