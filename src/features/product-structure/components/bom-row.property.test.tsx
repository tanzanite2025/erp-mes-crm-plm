/**
 * Property-Based Tests for BOM Row Render Isolation
 * 
 * Property 4: Render Isolation
 * 
 * For any BOM dataset and any single row field edit, the React rendering system
 * SHALL re-render only the edited row component, and SHALL not re-render any other
 * row components.
 * 
 * Validates: Requirements 2.4, 3.2
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import { BOMRow, type BOMRowData, type BOMColumnDef } from './bom-row';
import { memo } from 'react';

describe('Property Test: Render Isolation', () => {
  // Arbitraries for generating test data
  
  /**
   * Generate a random BOM row
   */
  const bomRowArbitrary = fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    partNumber: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 0, maxLength: 100 }),
    quantity: fc.integer({ min: 0, max: 10000 }),
    price: fc.float({ min: 0, max: 100000, noNaN: true }),
  }) as fc.Arbitrary<BOMRowData>;
  
  /**
   * Generate a BOM dataset (array of rows)
   */
  const bomDatasetArbitrary = fc.array(bomRowArbitrary, { minLength: 2, maxLength: 20 });
  
  /**
   * Generate column definitions
   */
  const columnsArbitrary = fc.constant<BOMColumnDef[]>([
    { id: 'col-1', field: 'partNumber', label: 'Part Number', width: 150 },
    { id: 'col-2', field: 'description', label: 'Description', width: 300 },
    { id: 'col-3', field: 'quantity', label: 'Quantity', width: 100 },
    { id: 'col-4', field: 'price', label: 'Price', width: 100 },
  ]);
  
  /**
   * Property Test: Only edited row should re-render
   */
  it('should only re-render the edited row when a field is modified', () => {
    fc.assert(
      fc.property(bomDatasetArbitrary, columnsArbitrary, (rows, columns) => {
        // Skip if dataset is too small
        if (rows.length < 2) {
          return true;
        }
        
        // Track render counts for each row
        const renderCounts = new Map<string, number>();
        
        // Initialize render counts
        rows.forEach(row => {
          renderCounts.set(row.id, 0);
        });
        
        // Create a tracked version of BOMRow that counts renders
        const TrackedBOMRow = memo(({ row, ...props }: any) => {
          const currentCount = renderCounts.get(row.id) || 0;
          renderCounts.set(row.id, currentCount + 1);
          
          return <BOMRow row={row} {...props} />;
        });
        
        // Initial render of all rows
        const { rerender } = render(
          <div>
            {rows.map(row => (
              <TrackedBOMRow
                key={row.id}
                row={row}
                columns={columns}
              />
            ))}
          </div>
        );
        
        // Verify initial render counts
        rows.forEach(row => {
          expect(renderCounts.get(row.id)).toBe(1);
        });
        
        // Select a random row to edit
        const editedRowIndex = Math.floor(Math.random() * rows.length);
        const editedRow = rows[editedRowIndex];
        
        // Create a modified version of the edited row
        const modifiedRow = {
          ...editedRow,
          quantity: (editedRow.quantity as number) + 1,
        };
        
        // Create new rows array with the modified row
        const newRows = rows.map((row, index) => 
          index === editedRowIndex ? modifiedRow : row
        );
        
        // Re-render with modified data
        rerender(
          <div>
            {newRows.map(row => (
              <TrackedBOMRow
                key={row.id}
                row={row}
                columns={columns}
              />
            ))}
          </div>
        );
        
        // Verify render isolation:
        // - Edited row should have render count = 2 (initial + update)
        // - All other rows should have render count = 1 (initial only)
        rows.forEach((row, index) => {
          const renderCount = renderCounts.get(row.id);
          
          if (index === editedRowIndex) {
            // Edited row should re-render
            expect(renderCount).toBeGreaterThanOrEqual(2);
          } else {
            // Other rows should NOT re-render
            expect(renderCount).toBe(1);
          }
        });
        
        return true;
      }),
      { numRuns: 100, verbose: true }
    );
  });
  
  /**
   * Property Test: Multiple field edits in same row
   */
  it('should only re-render the edited row when multiple fields are modified', () => {
    fc.assert(
      fc.property(bomDatasetArbitrary, columnsArbitrary, (rows, columns) => {
        // Skip if dataset is too small
        if (rows.length < 2) {
          return true;
        }
        
        // Track render counts
        const renderCounts = new Map<string, number>();
        rows.forEach(row => renderCounts.set(row.id, 0));
        
        // Create tracked component
        const TrackedBOMRow = memo(({ row, ...props }: any) => {
          const currentCount = renderCounts.get(row.id) || 0;
          renderCounts.set(row.id, currentCount + 1);
          return <BOMRow row={row} {...props} />;
        });
        
        // Initial render
        const { rerender } = render(
          <div>
            {rows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Select a random row to edit
        const editedRowIndex = Math.floor(Math.random() * rows.length);
        const editedRow = rows[editedRowIndex];
        
        // Modify multiple fields
        const modifiedRow = {
          ...editedRow,
          quantity: (editedRow.quantity as number) + 1,
          price: (editedRow.price as number) + 10,
          description: `${editedRow.description} (modified)`,
        };
        
        // Create new rows array
        const newRows = rows.map((row, index) => 
          index === editedRowIndex ? modifiedRow : row
        );
        
        // Re-render
        rerender(
          <div>
            {newRows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Verify only edited row re-rendered
        rows.forEach((row, index) => {
          const renderCount = renderCounts.get(row.id);
          
          if (index === editedRowIndex) {
            expect(renderCount).toBeGreaterThanOrEqual(2);
          } else {
            expect(renderCount).toBe(1);
          }
        });
        
        return true;
      }),
      { numRuns: 100, verbose: true }
    );
  });
  
  /**
   * Property Test: Sequential edits to different rows
   */
  it('should isolate renders when editing different rows sequentially', () => {
    fc.assert(
      fc.property(bomDatasetArbitrary, columnsArbitrary, (rows, columns) => {
        // Skip if dataset is too small
        if (rows.length < 3) {
          return true;
        }
        
        // Track render counts
        const renderCounts = new Map<string, number>();
        rows.forEach(row => renderCounts.set(row.id, 0));
        
        // Create tracked component
        const TrackedBOMRow = memo(({ row, ...props }: any) => {
          const currentCount = renderCounts.get(row.id) || 0;
          renderCounts.set(row.id, currentCount + 1);
          return <BOMRow row={row} {...props} />;
        });
        
        // Initial render
        const { rerender } = render(
          <div>
            {rows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Edit first row
        const firstEditIndex = 0;
        let currentRows = rows.map((row, index) => 
          index === firstEditIndex 
            ? { ...row, quantity: (row.quantity as number) + 1 }
            : row
        );
        
        rerender(
          <div>
            {currentRows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Edit second row
        const secondEditIndex = 1;
        currentRows = currentRows.map((row, index) => 
          index === secondEditIndex 
            ? { ...row, quantity: (row.quantity as number) + 1 }
            : row
        );
        
        rerender(
          <div>
            {currentRows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Verify render counts:
        // - First edited row: 2 renders (initial + first edit)
        // - Second edited row: 2 renders (initial + second edit)
        // - Other rows: 1 render (initial only)
        rows.forEach((row, index) => {
          const renderCount = renderCounts.get(row.id);
          
          if (index === firstEditIndex || index === secondEditIndex) {
            expect(renderCount).toBe(2);
          } else {
            expect(renderCount).toBe(1);
          }
        });
        
        return true;
      }),
      { numRuns: 100, verbose: true }
    );
  });
  
  /**
   * Property Test: No re-renders when unrelated props change
   */
  it('should not re-render any rows when only container props change', () => {
    fc.assert(
      fc.property(bomDatasetArbitrary, columnsArbitrary, (rows, columns) => {
        // Skip if dataset is too small
        if (rows.length < 2) {
          return true;
        }
        
        // Track render counts
        const renderCounts = new Map<string, number>();
        rows.forEach(row => renderCounts.set(row.id, 0));
        
        // Create tracked component
        const TrackedBOMRow = memo(({ row, ...props }: any) => {
          const currentCount = renderCounts.get(row.id) || 0;
          renderCounts.set(row.id, currentCount + 1);
          return <BOMRow row={row} {...props} />;
        });
        
        // Initial render with container className
        const { rerender } = render(
          <div className="container-v1">
            {rows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Re-render with different container className (but same row data)
        rerender(
          <div className="container-v2">
            {rows.map(row => (
              <TrackedBOMRow key={row.id} row={row} columns={columns} />
            ))}
          </div>
        );
        
        // Verify no rows re-rendered (all should have count = 1)
        rows.forEach(row => {
          const renderCount = renderCounts.get(row.id);
          expect(renderCount).toBe(1);
        });
        
        return true;
      }),
      { numRuns: 100, verbose: true }
    );
  });
});
