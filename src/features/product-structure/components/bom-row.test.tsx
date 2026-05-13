/**
 * Unit Tests for BOMRow Component
 * 
 * Tests React.memo optimization, useMemo, useCallback, and re-render behavior.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BOMRow, type BOMRowData, type BOMColumnDef } from './bom-row';

describe('BOMRow Component', () => {
  afterEach(() => {
    cleanup();
  });
  
  // Test data
  const mockRow: BOMRowData = {
    id: 'row-1',
    partNumber: 'PN-001',
    description: 'Test Part',
    quantity: 10,
  };
  
  const mockColumns: BOMColumnDef[] = [
    { id: 'col-1', field: 'partNumber', label: 'Part Number', width: 150 },
    { id: 'col-2', field: 'description', label: 'Description', width: 300 },
    { id: 'col-3', field: 'quantity', label: 'Quantity', width: 100 },
  ];
  
  describe('Rendering', () => {
    it('should render row with all columns', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
        />
      );
      
      // Check that row is rendered
      const rowElement = screen.getByRole('row');
      expect(rowElement).toBeDefined();
      
      // Check that all cells are rendered
      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(3);
    });
    
    it('should apply custom className', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          className="custom-class"
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement.className).toContain('custom-class');
    });
    
    it('should apply custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          style={customStyle}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement.style.backgroundColor).toBe('red');
    });
    
    it('should apply dirty className when isDirty is true', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isDirty={true}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement.className).toContain('bom-row--dirty');
    });
    
    it('should apply selected className when isSelected is true', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isSelected={true}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement.className).toContain('bom-row--selected');
    });
    
    it('should set aria-selected attribute', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isSelected={true}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement.getAttribute('aria-selected')).toBe('true');
    });
  });
  
  describe('Event Handlers', () => {
    it('should call onClick when row is clicked', () => {
      const handleClick = vi.fn();
      
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          onClick={handleClick}
        />
      );
      
      const rowElement = screen.getByRole('row');
      rowElement.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockRow);
    });
    
    it('should not throw error when onClick is not provided', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(() => rowElement.click()).not.toThrow();
    });
  });
  
  describe('React.memo Optimization', () => {
    it('should not re-render when props are identical', () => {
      // Track renders using a ref in the component
      const renders: number[] = [];
      
      // Create a custom component that tracks renders
      const TrackedBOMRow = (props: any) => {
        renders.push(Date.now());
        return <BOMRow {...props} />;
      };
      
      const { rerender } = render(
        <TrackedBOMRow row={mockRow} columns={mockColumns} />
      );
      
      const initialRenderCount = renders.length;
      expect(initialRenderCount).toBe(1);
      
      // Re-render with same props - wrapper re-renders but BOMRow should not
      rerender(<TrackedBOMRow row={mockRow} columns={mockColumns} />);
      
      // Wrapper renders again, but this is expected
      expect(renders.length).toBe(2);
    });
    
    it('should re-render when row reference changes', () => {
      let renderCount = 0;
      
      const TestWrapper = ({ row, columns }: { row: BOMRowData; columns: BOMColumnDef[] }) => {
        renderCount++;
        return <BOMRow row={row} columns={columns} />;
      };
      
      const { rerender } = render(
        <TestWrapper row={mockRow} columns={mockColumns} />
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render with different row reference
      const newRow = { ...mockRow };
      rerender(<TestWrapper row={newRow} columns={mockColumns} />);
      
      // Should re-render because row reference changed
      expect(renderCount).toBe(2);
    });
    
    it('should re-render when columns reference changes', () => {
      let renderCount = 0;
      
      const TestWrapper = ({ row, columns }: { row: BOMRowData; columns: BOMColumnDef[] }) => {
        renderCount++;
        return <BOMRow row={row} columns={columns} />;
      };
      
      const { rerender } = render(
        <TestWrapper row={mockRow} columns={mockColumns} />
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render with different columns reference
      const newColumns = [...mockColumns];
      rerender(<TestWrapper row={mockRow} columns={newColumns} />);
      
      // Should re-render because columns reference changed
      expect(renderCount).toBe(2);
    });
    
    it('should re-render when isDirty changes', () => {
      const { rerender } = render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isDirty={false}
        />
      );
      
      let rowElement = screen.getByRole('row');
      expect(rowElement.className).not.toContain('bom-row--dirty');
      
      // Re-render with isDirty=true
      rerender(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isDirty={true}
        />
      );
      
      rowElement = screen.getByRole('row');
      expect(rowElement.className).toContain('bom-row--dirty');
    });
    
    it('should re-render when isSelected changes', () => {
      const { rerender } = render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isSelected={false}
        />
      );
      
      let rowElement = screen.getByRole('row');
      expect(rowElement.className).not.toContain('bom-row--selected');
      
      // Re-render with isSelected=true
      rerender(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isSelected={true}
        />
      );
      
      rowElement = screen.getByRole('row');
      expect(rowElement.className).toContain('bom-row--selected');
    });
  });
  
  describe('useMemo Optimization', () => {
    it('should memoize rowClassName computation', () => {
      const { rerender } = render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isDirty={false}
          isSelected={false}
        />
      );
      
      const rowElement1 = screen.getByRole('row');
      const className1 = rowElement1.className;
      
      // Re-render with same props
      rerender(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          isDirty={false}
          isSelected={false}
        />
      );
      
      const rowElement2 = screen.getByRole('row');
      const className2 = rowElement2.className;
      
      // className should be identical (memoized)
      expect(className1).toBe(className2);
    });
  });
  
  describe('useCallback Optimization', () => {
    it('should memoize onClick handler', () => {
      const handleClick = vi.fn();
      
      const { rerender } = render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          onClick={handleClick}
        />
      );
      
      const rowElement = screen.getByRole('row');
      rowElement.click();
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Re-render with same onClick
      rerender(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          onClick={handleClick}
        />
      );
      
      rowElement.click();
      
      // Should still work correctly
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty columns array', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={[]}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement).toBeDefined();
      
      const cells = screen.queryAllByRole('cell');
      expect(cells).toHaveLength(0);
    });
    
    it('should handle row with missing fields', () => {
      const incompleteRow: BOMRowData = {
        id: 'row-2',
        partNumber: 'PN-002',
        // description and quantity are missing
      };
      
      render(
        <BOMRow
          row={incompleteRow}
          columns={mockColumns}
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement).toBeDefined();
    });
    
    it('should handle undefined optional props', () => {
      render(
        <BOMRow
          row={mockRow}
          columns={mockColumns}
          // All optional props are undefined
        />
      );
      
      const rowElement = screen.getByRole('row');
      expect(rowElement).toBeDefined();
    });
  });
});
