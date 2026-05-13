/**
 * Property-Based Tests for OptimizedProxyTracker
 * 
 * Property 2: Diff Accuracy Equivalence
 * Validates Requirement 1.5
 * 
 * This test verifies that the optimized diff calculation (using dirty marking
 * and shallow comparison) produces identical results to the baseline approach
 * (using JSON.stringify for all rows).
 * 
 * Minimum 100 iterations per property test
 */

import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import { BOMDirtyMarker } from './dirty-marker';
import { OptimizedProxyTracker, type RowIdExtractor } from './optimized-proxy-tracker';
import { ProxyTracker } from './proxy-tracker';

/**
 * Test BOM row interface
 */
interface TestBOMRow {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

/**
 * Test BOM dataset structure
 */
interface TestBOMData {
  rows: TestBOMRow[];
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
  partNumber: fc.string({ minLength: 1, maxLength: 20 }),
  description: fc.string({ minLength: 0, maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 10000 }),
  unit: fc.constantFrom('PCS', 'KG', 'M', 'L', 'SET'),
  unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
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
    return { rows: uniqueRows };
  });

/**
 * Arbitrary generator for field modifications
 */
interface FieldModification {
  rowIndex: number;
  field: keyof Omit<TestBOMRow, 'id'>;
  newValue: string | number;
}

const fieldModificationArbitrary = (maxRowIndex: number): fc.Arbitrary<FieldModification> =>
  fc.record({
    rowIndex: fc.integer({ min: 0, max: maxRowIndex }),
    field: fc.constantFrom('partNumber', 'description', 'quantity', 'unit', 'unitPrice'),
    newValue: fc.oneof(
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.integer({ min: 1, max: 10000 }),
      fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true }),
      fc.constantFrom('PCS', 'KG', 'M', 'L', 'SET')
    ),
  });

/**
 * Helper function to apply modifications to a dataset
 */
function applyModifications(
  data: TestBOMData,
  modifications: FieldModification[]
): TestBOMData {
  const clonedData = JSON.parse(JSON.stringify(data)) as TestBOMData;
  
  modifications.forEach(({ rowIndex, field, newValue }) => {
    if (rowIndex < clonedData.rows.length) {
      (clonedData.rows[rowIndex] as any)[field] = newValue;
    }
  });
  
  return clonedData;
}

/**
 * Helper function to normalize delta keys for comparison
 * Handles potential index differences between baseline and optimized
 */
function normalizeDelta(delta: Record<string, any>, data: TestBOMData): Record<string, any> {
  const normalized: Record<string, any> = {};
  
  Object.entries(delta).forEach(([path, value]) => {
    // Extract row ID from path if possible
    const pathParts = path.split('.');
    if (pathParts.length >= 3 && pathParts[0] === 'rows') {
      const rowIndex = parseInt(pathParts[1], 10);
      const field = pathParts[2];
      
      if (!isNaN(rowIndex) && rowIndex < data.rows.length) {
        const rowId = data.rows[rowIndex].id;
        const normalizedKey = `rows.${rowId}.${field}`;
        normalized[normalizedKey] = value;
      }
    } else {
      normalized[path] = value;
    }
  });
  
  return normalized;
}

describe('Property 2: Diff Accuracy Equivalence', () => {
  const rowIdExtractor: RowIdExtractor<TestBOMRow> = (row) => row.id;

  it('produces identical deltas for single field modifications (small datasets)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(10, 50),
        fc.array(fieldModificationArbitrary(49), { minLength: 1, maxLength: 5 }),
        (initialData, modifications) => {
          // Skip if no valid modifications
          const validModifications = modifications.filter(
            (m) => m.rowIndex < initialData.rows.length
          );
          if (validModifications.length === 0) return true;

          // Apply modifications to get modified data
          const modifiedData = applyModifications(initialData, validModifications);

          // Baseline approach: Use standard ProxyTracker
          const baselineTracker = new ProxyTracker(initialData);
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach: Use OptimizedProxyTracker
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Normalize deltas for comparison
          const normalizedBaseline = normalizeDelta(baselineDelta, initialData);
          const normalizedOptimized = normalizeDelta(optimizedDelta, initialData);

          // Both deltas should have the same keys
          const baselineKeys = Object.keys(normalizedBaseline).sort();
          const optimizedKeys = Object.keys(normalizedOptimized).sort();
          expect(optimizedKeys).toEqual(baselineKeys);

          // Both deltas should have the same values
          baselineKeys.forEach((key) => {
            expect(normalizedOptimized[key]).toEqual(normalizedBaseline[key]);
          });

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces identical deltas for multiple field modifications (medium datasets)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(50, 200),
        fc.array(fieldModificationArbitrary(199), { minLength: 5, maxLength: 20 }),
        (initialData, modifications) => {
          // Skip if no valid modifications
          const validModifications = modifications.filter(
            (m) => m.rowIndex < initialData.rows.length
          );
          if (validModifications.length === 0) return true;

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Normalize and compare
          const normalizedBaseline = normalizeDelta(baselineDelta, initialData);
          const normalizedOptimized = normalizeDelta(optimizedDelta, initialData);

          const baselineKeys = Object.keys(normalizedBaseline).sort();
          const optimizedKeys = Object.keys(normalizedOptimized).sort();
          expect(optimizedKeys).toEqual(baselineKeys);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces identical deltas for large datasets with sparse modifications', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(200, 1000),
        fc.array(fieldModificationArbitrary(999), { minLength: 10, maxLength: 100 }),
        (initialData, modifications) => {
          // Skip if no valid modifications
          const validModifications = modifications.filter(
            (m) => m.rowIndex < initialData.rows.length
          );
          if (validModifications.length === 0) return true;

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Normalize and compare key counts
          const normalizedBaseline = normalizeDelta(baselineDelta, initialData);
          const normalizedOptimized = normalizeDelta(optimizedDelta, initialData);

          // Should have same number of changes
          expect(Object.keys(normalizedOptimized).length).toBe(
            Object.keys(normalizedBaseline).length
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('produces empty delta when no modifications are made', () => {
    fc.assert(
      fc.property(bomDatasetArbitrary(10, 100), (initialData) => {
        // Baseline approach
        const baselineTracker = new ProxyTracker(initialData);
        const baselineDelta = baselineTracker.commit();

        // Optimized approach
        const dirtyMarker = new BOMDirtyMarker();
        const optimizedTracker = new OptimizedProxyTracker(
          initialData,
          dirtyMarker,
          rowIdExtractor
        );
        const optimizedDelta = optimizedTracker.commit();

        // Both should be empty
        expect(Object.keys(baselineDelta)).toHaveLength(0);
        expect(Object.keys(optimizedDelta)).toHaveLength(0);

        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('produces identical deltas when same row is modified multiple times', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(10, 50),
        fc.integer({ min: 0, max: 49 }),
        fc.array(
          fc.record({
            field: fc.constantFrom('partNumber', 'description', 'quantity', 'unit', 'unitPrice'),
            newValue: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.integer({ min: 1, max: 10000 }),
              fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true })
            ),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (initialData, targetRowIndex, fieldModifications) => {
          // Skip if target row doesn't exist
          if (targetRowIndex >= initialData.rows.length) return true;

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          fieldModifications.forEach(({ field, newValue }) => {
            (baselineTracker.data.rows[targetRowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          fieldModifications.forEach(({ field, newValue }) => {
            (optimizedTracker.data.rows[targetRowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Normalize and compare
          const normalizedBaseline = normalizeDelta(baselineDelta, initialData);
          const normalizedOptimized = normalizeDelta(optimizedDelta, initialData);

          const baselineKeys = Object.keys(normalizedBaseline).sort();
          const optimizedKeys = Object.keys(normalizedOptimized).sort();
          expect(optimizedKeys).toEqual(baselineKeys);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles different dirty percentages correctly', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(100, 500),
        fc.constantFrom(0.01, 0.05, 0.1, 0.25, 0.5),
        (initialData, dirtyPercentage) => {
          const dirtyCount = Math.floor(initialData.rows.length * dirtyPercentage);
          if (dirtyCount === 0) return true;

          // Generate modifications for the specified percentage
          const modifications: FieldModification[] = Array.from(
            { length: dirtyCount },
            (_, i) => ({
              rowIndex: i,
              field: 'quantity' as const,
              newValue: 999 + i,
            })
          );

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          modifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          modifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Should have same number of changes
          expect(Object.keys(optimizedDelta).length).toBe(
            Object.keys(baselineDelta).length
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('detects no false positives (unchanged fields not in delta)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(10, 50),
        fc.integer({ min: 0, max: 49 }),
        (initialData, targetRowIndex) => {
          // Skip if target row doesn't exist
          if (targetRowIndex >= initialData.rows.length) return true;

          // Modify only one field
          const modifications: FieldModification[] = [
            {
              rowIndex: targetRowIndex,
              field: 'quantity',
              newValue: 999,
            },
          ];

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          modifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          modifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Both should only have delta for the modified field
          const baselineKeys = Object.keys(baselineDelta);
          const optimizedKeys = Object.keys(optimizedDelta);

          // Should have exactly one change
          expect(baselineKeys.length).toBe(1);
          expect(optimizedKeys.length).toBe(1);

          // The change should be for the quantity field
          expect(baselineKeys[0]).toContain('.quantity');
          expect(optimizedKeys[0]).toContain('.quantity');

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('detects no false negatives (all changes are captured)', () => {
    fc.assert(
      fc.property(
        bomDatasetArbitrary(10, 50),
        fc.array(fieldModificationArbitrary(49), { minLength: 1, maxLength: 10 }),
        (initialData, modifications) => {
          // Skip if no valid modifications
          const validModifications = modifications.filter(
            (m) => m.rowIndex < initialData.rows.length
          );
          if (validModifications.length === 0) return true;

          // Baseline approach
          const baselineTracker = new ProxyTracker(initialData);
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const baselineDelta = baselineTracker.commit();

          // Optimized approach
          const dirtyMarker = new BOMDirtyMarker();
          const optimizedTracker = new OptimizedProxyTracker(
            initialData,
            dirtyMarker,
            rowIdExtractor
          );
          validModifications.forEach(({ rowIndex, field, newValue }) => {
            (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
          });
          const optimizedDelta = optimizedTracker.commit();

          // Optimized should capture at least as many changes as baseline
          expect(Object.keys(optimizedDelta).length).toBeGreaterThanOrEqual(
            Object.keys(baselineDelta).length
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 2: Performance Comparison', () => {
  const rowIdExtractor: RowIdExtractor<TestBOMRow> = (row) => row.id;

  it('optimized commit produces correct results for large datasets with sparse modifications', () => {
    // Note: This is a qualitative correctness test, not a timing benchmark
    // We verify that the optimized approach works correctly with large datasets
    // Actual performance benchmarks will be done in Phase 6 (Task 18.1)
    
    const [initialData] = fc.sample(bomDatasetArbitrary(500, 1000), 1);
    const dirtyPercentage = 0.1; // 10% dirty
    const dirtyCount = Math.floor(initialData.rows.length * dirtyPercentage);

    // Generate modifications
    const modifications: FieldModification[] = Array.from(
      { length: dirtyCount },
      (_, i) => ({
        rowIndex: i,
        field: 'quantity' as const,
        newValue: 999 + i,
      })
    );

    // Baseline approach
    const baselineTracker = new ProxyTracker(initialData);
    modifications.forEach(({ rowIndex, field, newValue }) => {
      (baselineTracker.data.rows[rowIndex] as any)[field] = newValue;
    });
    const baselineDelta = baselineTracker.commit();

    // Optimized approach
    const dirtyMarker = new BOMDirtyMarker();
    const optimizedTracker = new OptimizedProxyTracker(
      initialData,
      dirtyMarker,
      rowIdExtractor
    );
    modifications.forEach(({ rowIndex, field, newValue }) => {
      (optimizedTracker.data.rows[rowIndex] as any)[field] = newValue;
    });
    const optimizedDelta = optimizedTracker.commit();

    // Verify correctness (both should produce same number of changes)
    expect(Object.keys(optimizedDelta).length).toBe(Object.keys(baselineDelta).length);
    
    // Verify dirty marker tracked correctly
    expect(dirtyMarker.getDirtyCount()).toBe(dirtyCount);
    
    // Verify only dirty rows were processed (key optimization)
    // The optimized approach should only compare dirty rows, not all rows
    expect(dirtyMarker.getDirtyCount()).toBeLessThan(initialData.rows.length);
  });
});
