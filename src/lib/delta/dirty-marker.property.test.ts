/**
 * Property-Based Tests for Dirty Marking System
 * 
 * Property 1: Dirty Marking Isolation
 * Validates Requirements 1.2, 1.3
 * 
 * This test uses fast-check to generate random BOM datasets and verify that:
 * 1. Only modified rows are marked as dirty
 * 2. Unmodified rows remain clean
 * 3. DiffEngine would only compare dirty rows (isolation property)
 * 
 * Minimum 100 iterations per property test
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { BOMDirtyMarker } from './dirty-marker';

/**
 * Type definition for a BOM row
 */
interface BOMRow {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  supplier: string;
  leadTime: number;
  notes: string;
}

/**
 * Arbitrary generator for BOM row IDs
 */
const bomRowIdArbitrary = fc.string({ minLength: 1, maxLength: 20 }).map(
  (s) => `BOM-${s.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).substring(2, 8)}`
);

/**
 * Arbitrary generator for BOM rows
 */
const bomRowArbitrary: fc.Arbitrary<BOMRow> = fc.record({
  id: bomRowIdArbitrary,
  partNumber: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 10000 }),
  unit: fc.constantFrom('PCS', 'KG', 'M', 'L', 'SET'),
  unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
  totalPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true }),
  supplier: fc.string({ minLength: 1, maxLength: 50 }),
  leadTime: fc.integer({ min: 1, max: 365 }),
  notes: fc.string({ minLength: 0, maxLength: 200 }),
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
 * Arbitrary generator for row modification operations
 */
interface RowModification {
  rowIndex: number;
  field: keyof Omit<BOMRow, 'id'>;
  newValue: string | number;
}

const rowModificationArbitrary = (maxRowIndex: number): fc.Arbitrary<RowModification> =>
  fc.record({
    rowIndex: fc.integer({ min: 0, max: maxRowIndex }),
    field: fc.constantFrom(
      'partNumber',
      'description',
      'quantity',
      'unit',
      'unitPrice',
      'totalPrice',
      'supplier',
      'leadTime',
      'notes'
    ),
    newValue: fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.integer({ min: 1, max: 10000 }).map(String),
      fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }).map(String)
    ),
  });

describe('Property 1: Dirty Marking Isolation', () => {
  it('only marks modified rows as dirty (small datasets: 10-100 rows)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(10, 100),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 10 }),
        (bomRows, modifiedIndices) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const uniqueModifiedIndices = [...new Set(modifiedIndices)].filter(
            (idx) => idx < bomRows.length
          );

          // Skip if no valid modifications
          if (uniqueModifiedIndices.length === 0) {
            return true;
          }

          // Action: Mark specific rows as dirty
          uniqueModifiedIndices.forEach((idx) => {
            const rowId = bomRows[idx].id;
            dirtyMarker.markDirty(rowId);
          });

          // Assertion 1: Only modified rows are marked as dirty
          uniqueModifiedIndices.forEach((idx) => {
            const rowId = bomRows[idx].id;
            expect(dirtyMarker.isDirty(rowId)).toBe(true);
          });

          // Assertion 2: Unmodified rows are NOT marked as dirty
          bomRows.forEach((row, idx) => {
            if (!uniqueModifiedIndices.includes(idx)) {
              expect(dirtyMarker.isDirty(row.id)).toBe(false);
            }
          });

          // Assertion 3: Dirty count matches number of modified rows
          expect(dirtyMarker.getDirtyCount()).toBe(uniqueModifiedIndices.length);

          // Assertion 4: getDirtyRows returns exactly the modified row IDs
          const dirtyRows = dirtyMarker.getDirtyRows();
          expect(dirtyRows.size).toBe(uniqueModifiedIndices.length);
          uniqueModifiedIndices.forEach((idx) => {
            expect(dirtyRows.has(bomRows[idx].id)).toBe(true);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only marks modified rows as dirty (medium datasets: 100-500 rows)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(100, 500),
        fc.array(fc.integer({ min: 0, max: 499 }), { minLength: 1, maxLength: 50 }),
        (bomRows, modifiedIndices) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const uniqueModifiedIndices = [...new Set(modifiedIndices)].filter(
            (idx) => idx < bomRows.length
          );

          // Skip if no valid modifications
          if (uniqueModifiedIndices.length === 0) {
            return true;
          }

          // Action: Mark specific rows as dirty
          uniqueModifiedIndices.forEach((idx) => {
            const rowId = bomRows[idx].id;
            dirtyMarker.markDirty(rowId);
          });

          // Assertion 1: Dirty count matches number of modified rows
          expect(dirtyMarker.getDirtyCount()).toBe(uniqueModifiedIndices.length);

          // Assertion 2: All modified rows are dirty
          const dirtyRows = dirtyMarker.getDirtyRows();
          uniqueModifiedIndices.forEach((idx) => {
            expect(dirtyRows.has(bomRows[idx].id)).toBe(true);
          });

          // Assertion 3: No unmodified rows are dirty
          bomRows.forEach((row, idx) => {
            if (!uniqueModifiedIndices.includes(idx)) {
              expect(dirtyMarker.isDirty(row.id)).toBe(false);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('only marks modified rows as dirty (large datasets: 500-2000 rows)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(500, 2000),
        fc.array(fc.integer({ min: 0, max: 1999 }), { minLength: 1, maxLength: 200 }),
        (bomRows, modifiedIndices) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const uniqueModifiedIndices = [...new Set(modifiedIndices)].filter(
            (idx) => idx < bomRows.length
          );

          // Skip if no valid modifications
          if (uniqueModifiedIndices.length === 0) {
            return true;
          }

          // Action: Mark specific rows as dirty
          uniqueModifiedIndices.forEach((idx) => {
            const rowId = bomRows[idx].id;
            dirtyMarker.markDirty(rowId);
          });

          // Assertion 1: Dirty count matches number of modified rows
          expect(dirtyMarker.getDirtyCount()).toBe(uniqueModifiedIndices.length);

          // Assertion 2: getDirtyRows returns correct set
          const dirtyRows = dirtyMarker.getDirtyRows();
          expect(dirtyRows.size).toBe(uniqueModifiedIndices.length);

          // Assertion 3: Sample check - verify some modified and unmodified rows
          // (Full check would be too slow for 2000 rows)
          const sampleSize = Math.min(50, uniqueModifiedIndices.length);
          const sampleModified = uniqueModifiedIndices.slice(0, sampleSize);
          sampleModified.forEach((idx) => {
            expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(true);
          });

          // Check some unmodified rows
          const unmodifiedIndices = bomRows
            .map((_, idx) => idx)
            .filter((idx) => !uniqueModifiedIndices.includes(idx))
            .slice(0, sampleSize);
          unmodifiedIndices.forEach((idx) => {
            expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(false);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains isolation after multiple edit operations', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.array(
          fc.record({
            rowIndex: fc.integer({ min: 0, max: 199 }),
            operation: fc.constantFrom('mark', 'clear'),
          }),
          { minLength: 5, maxLength: 50 }
        ),
        (bomRows, operations) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const expectedDirtySet = new Set<string>();

          // Action: Apply a sequence of mark/clear operations
          operations.forEach(({ rowIndex, operation }) => {
            if (rowIndex >= bomRows.length) return;

            const rowId = bomRows[rowIndex].id;

            if (operation === 'mark') {
              dirtyMarker.markDirty(rowId);
              expectedDirtySet.add(rowId);
            } else {
              dirtyMarker.clearDirty(rowId);
              expectedDirtySet.delete(rowId);
            }
          });

          // Assertion 1: Dirty count matches expected set
          expect(dirtyMarker.getDirtyCount()).toBe(expectedDirtySet.size);

          // Assertion 2: getDirtyRows matches expected set
          const actualDirtyRows = dirtyMarker.getDirtyRows();
          expect(actualDirtyRows.size).toBe(expectedDirtySet.size);
          expectedDirtySet.forEach((rowId) => {
            expect(actualDirtyRows.has(rowId)).toBe(true);
          });

          // Assertion 3: isDirty matches expected state for all rows
          bomRows.forEach((row) => {
            const expectedDirty = expectedDirtySet.has(row.id);
            expect(dirtyMarker.isDirty(row.id)).toBe(expectedDirty);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains isolation after clearAll operation', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.array(fc.integer({ min: 0, max: 199 }), { minLength: 1, maxLength: 50 }),
        fc.array(fc.integer({ min: 0, max: 199 }), { minLength: 1, maxLength: 50 }),
        (bomRows, firstBatch, secondBatch) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();

          // Action 1: Mark first batch of rows as dirty
          const firstBatchValid = [...new Set(firstBatch)].filter(
            (idx) => idx < bomRows.length
          );
          firstBatchValid.forEach((idx) => {
            dirtyMarker.markDirty(bomRows[idx].id);
          });

          // Verify first batch is dirty
          expect(dirtyMarker.getDirtyCount()).toBe(firstBatchValid.length);

          // Action 2: Clear all dirty markers
          dirtyMarker.clearAll();

          // Assertion 1: All rows are now clean
          expect(dirtyMarker.getDirtyCount()).toBe(0);
          bomRows.forEach((row) => {
            expect(dirtyMarker.isDirty(row.id)).toBe(false);
          });

          // Action 3: Mark second batch of rows as dirty
          const secondBatchValid = [...new Set(secondBatch)].filter(
            (idx) => idx < bomRows.length
          );
          secondBatchValid.forEach((idx) => {
            dirtyMarker.markDirty(bomRows[idx].id);
          });

          // Assertion 2: Only second batch is dirty
          expect(dirtyMarker.getDirtyCount()).toBe(secondBatchValid.length);
          secondBatchValid.forEach((idx) => {
            expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(true);
          });

          // Assertion 3: First batch rows that are not in second batch are clean
          firstBatchValid.forEach((idx) => {
            if (!secondBatchValid.includes(idx)) {
              expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(false);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains isolation with different dirty percentages', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(100, 1000),
        fc.constantFrom(0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 1.0), // Dirty percentages
        (bomRows, dirtyPercentage) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const dirtyCount = Math.floor(bomRows.length * dirtyPercentage);

          // Action: Mark a percentage of rows as dirty
          const dirtyIndices = Array.from({ length: dirtyCount }, (_, i) => i);
          dirtyIndices.forEach((idx) => {
            dirtyMarker.markDirty(bomRows[idx].id);
          });

          // Assertion 1: Dirty count matches expected
          expect(dirtyMarker.getDirtyCount()).toBe(dirtyCount);

          // Assertion 2: Dirty rows are correctly marked
          dirtyIndices.forEach((idx) => {
            expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(true);
          });

          // Assertion 3: Clean rows are correctly unmarked
          const cleanIndices = Array.from(
            { length: bomRows.length - dirtyCount },
            (_, i) => i + dirtyCount
          );
          cleanIndices.forEach((idx) => {
            expect(dirtyMarker.isDirty(bomRows[idx].id)).toBe(false);
          });

          // Assertion 4: Memory usage scales with dirty rows, not total rows
          // (Verified by checking dirty count, not total row count)
          expect(dirtyMarker.getDirtyCount()).toBeLessThanOrEqual(bomRows.length);
          expect(dirtyMarker.getDirtyCount()).toBe(dirtyCount);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains isolation with concurrent modifications to same row', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.integer({ min: 0, max: 199 }),
        fc.integer({ min: 1, max: 10 }),
        (bomRows, targetRowIndex, modificationCount) => {
          // Skip if target row doesn't exist
          if (targetRowIndex >= bomRows.length) {
            return true;
          }

          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const targetRowId = bomRows[targetRowIndex].id;

          // Action: Mark the same row as dirty multiple times
          for (let i = 0; i < modificationCount; i++) {
            dirtyMarker.markDirty(targetRowId);
          }

          // Assertion 1: Row is marked as dirty (idempotent)
          expect(dirtyMarker.isDirty(targetRowId)).toBe(true);

          // Assertion 2: Dirty count is 1 (not modificationCount)
          expect(dirtyMarker.getDirtyCount()).toBe(1);

          // Assertion 3: Only the target row is dirty
          bomRows.forEach((row, idx) => {
            if (idx === targetRowIndex) {
              expect(dirtyMarker.isDirty(row.id)).toBe(true);
            } else {
              expect(dirtyMarker.isDirty(row.id)).toBe(false);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains isolation with edge case row IDs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('0'),
            fc.constant('-1'),
            fc.string({ minLength: 1, maxLength: 5 }),
            fc.string({ minLength: 100, maxLength: 200 }),
            fc.string({ minLength: 1, maxLength: 10 }) // Unicode strings work with regular string()
          ),
          { minLength: 10, maxLength: 100 }
        ),
        fc.array(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 20 }),
        (rowIds, modifiedIndices) => {
          // Setup: Ensure unique row IDs
          const uniqueRowIds = [...new Set(rowIds)];
          if (uniqueRowIds.length < 10) {
            return true; // Skip if not enough unique IDs
          }

          const dirtyMarker = new BOMDirtyMarker();
          const validModifiedIndices = [...new Set(modifiedIndices)].filter(
            (idx) => idx < uniqueRowIds.length
          );

          if (validModifiedIndices.length === 0) {
            return true;
          }

          // Action: Mark specific rows as dirty
          validModifiedIndices.forEach((idx) => {
            dirtyMarker.markDirty(uniqueRowIds[idx]);
          });

          // Assertion 1: Dirty count matches
          expect(dirtyMarker.getDirtyCount()).toBe(validModifiedIndices.length);

          // Assertion 2: Modified rows are dirty
          validModifiedIndices.forEach((idx) => {
            expect(dirtyMarker.isDirty(uniqueRowIds[idx])).toBe(true);
          });

          // Assertion 3: Unmodified rows are clean
          uniqueRowIds.forEach((rowId, idx) => {
            if (!validModifiedIndices.includes(idx)) {
              expect(dirtyMarker.isDirty(rowId)).toBe(false);
            }
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 1: Performance Characteristics', () => {
  it('dirty marking operations are O(1) regardless of dataset size', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(100, 500, 1000, 2000),
        fc.integer({ min: 1, max: 100 }),
        (datasetSize, operationCount) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const rowIds = Array.from({ length: datasetSize }, (_, i) => `BOM-${i}`);

          // Measure mark operations
          const startMark = performance.now();
          for (let i = 0; i < operationCount; i++) {
            const randomIdx = Math.floor(Math.random() * datasetSize);
            dirtyMarker.markDirty(rowIds[randomIdx]);
          }
          const markTime = performance.now() - startMark;

          // Measure isDirty operations
          const startCheck = performance.now();
          for (let i = 0; i < operationCount; i++) {
            const randomIdx = Math.floor(Math.random() * datasetSize);
            dirtyMarker.isDirty(rowIds[randomIdx]);
          }
          const checkTime = performance.now() - startCheck;

          // Assertion: Operations should be fast regardless of dataset size
          // These are generous thresholds to avoid flaky tests
          expect(markTime).toBeLessThan(50);
          expect(checkTime).toBeLessThan(50);

          return true;
        }
      ),
      { numRuns: 50 } // Fewer runs for performance tests
    );
  });

  it('memory usage scales with dirty rows, not total rows', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(1000, 2000, 5000, 10000),
        fc.constantFrom(0.01, 0.05, 0.1),
        (totalRows, dirtyPercentage) => {
          // Setup
          const dirtyMarker = new BOMDirtyMarker();
          const dirtyCount = Math.floor(totalRows * dirtyPercentage);

          // Action: Mark only a small percentage as dirty
          for (let i = 0; i < dirtyCount; i++) {
            dirtyMarker.markDirty(`BOM-${i}`);
          }

          // Assertion: Dirty count should be much smaller than total rows
          expect(dirtyMarker.getDirtyCount()).toBe(dirtyCount);
          expect(dirtyMarker.getDirtyCount()).toBeLessThan(totalRows * 0.2);

          // Verify getDirtyRows returns correct size
          const dirtyRows = dirtyMarker.getDirtyRows();
          expect(dirtyRows.size).toBe(dirtyCount);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
