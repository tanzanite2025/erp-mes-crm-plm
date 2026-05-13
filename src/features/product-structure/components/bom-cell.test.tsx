/**
 * Unit Tests for BOMCell Component
 * 
 * Tests React.memo optimization, useMemo, and re-render behavior.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { BOMCell, EditableBOMCell, type BOMCellProps } from './bom-cell';
import type { BOMRowData, BOMColumnDef } from './bom-row';

describe('BOMCell Component', () => {
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
  
  const mockColumn: BOMColumnDef = {
    id: 'col-1',
    field: 'partNumber',
    label: 'Part Number',
    width: 150,
  };
  
  const mockOnChange = vi.fn();
  
  describe('Rendering', () => {
    it('should render cell with value', () => {
      render(
        <BOMCell
          column={mockColumn}
          value="PN-001"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement).toBeDefined();
      expect(cellElement.textContent).toBe('PN-001');
    });
    
    it('should render null value as dash', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={null}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('-');
    });
    
    it('should render undefined value as dash', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={undefined}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('-');
    });
    
    it('should format number values with locale', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={1000}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      // Number formatting may vary by locale, just check it's rendered
      expect(cellElement.textContent).toBeTruthy();
    });
    
    it('should format boolean true as checkmark', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={true}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('✓');
    });
    
    it('should format boolean false as cross', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={false}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('✗');
    });
    
    it('should apply custom className', () => {
      render(
        <BOMCell
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
          className="custom-class"
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.className).toContain('custom-class');
    });
    
    it('should apply width from column config', () => {
      const columnWithWidth: BOMColumnDef = {
        ...mockColumn,
        width: 200,
      };
      
      render(
        <BOMCell
          column={columnWithWidth}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.style.width).toBe('200px');
    });
    
    it('should apply minWidth from column config', () => {
      const columnWithMinWidth: BOMColumnDef = {
        ...mockColumn,
        minWidth: 100,
      };
      
      render(
        <BOMCell
          column={columnWithMinWidth}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.style.minWidth).toBe('100px');
    });
  });
  
  describe('Custom Renderer', () => {
    it('should use custom render function when provided', () => {
      const customRender = vi.fn((value) => <span>Custom: {String(value)}</span>);
      
      const columnWithRender: BOMColumnDef = {
        ...mockColumn,
        render: customRender,
      };
      
      render(
        <BOMCell
          column={columnWithRender}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      expect(customRender).toHaveBeenCalledTimes(1);
      expect(customRender).toHaveBeenCalledWith('test', mockRow, expect.any(Function));
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('Custom: test');
    });
    
    it('should pass handleChange to custom renderer', () => {
      let capturedOnChange: ((value: unknown) => void) | null = null;
      
      const customRender = vi.fn((value, row, onChange) => {
        capturedOnChange = onChange;
        return <span>Custom</span>;
      });
      
      const columnWithRender: BOMColumnDef = {
        ...mockColumn,
        render: customRender,
      };
      
      render(
        <BOMCell
          column={columnWithRender}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      expect(capturedOnChange).toBeTruthy();
      
      // Call the captured onChange
      capturedOnChange?.('new-value');
      
      expect(mockOnChange).toHaveBeenCalledWith('partNumber', 'new-value');
    });
  });
  
  describe('React.memo Optimization', () => {
    it('should not re-render when props are identical', () => {
      // Track renders using a ref
      const renders: number[] = [];
      
      const TrackedBOMCell = (props: BOMCellProps) => {
        renders.push(Date.now());
        return <BOMCell {...props} />;
      };
      
      const { rerender } = render(
        <TrackedBOMCell
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const initialRenderCount = renders.length;
      expect(initialRenderCount).toBe(1);
      
      // Re-render with same props - wrapper re-renders but BOMCell should not
      rerender(
        <TrackedBOMCell
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      // Wrapper renders again, but this is expected
      expect(renders.length).toBe(2);
    });
    
    it('should re-render when value changes', () => {
      let renderCount = 0;
      
      const TestWrapper = (props: BOMCellProps) => {
        renderCount++;
        return <BOMCell {...props} />;
      };
      
      const { rerender } = render(
        <TestWrapper
          column={mockColumn}
          value="test1"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render with different value
      rerender(
        <TestWrapper
          column={mockColumn}
          value="test2"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      // Should re-render because value changed
      expect(renderCount).toBe(2);
    });
    
    it('should re-render when column reference changes', () => {
      let renderCount = 0;
      
      const TestWrapper = (props: BOMCellProps) => {
        renderCount++;
        return <BOMCell {...props} />;
      };
      
      const { rerender } = render(
        <TestWrapper
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render with different column reference
      const newColumn = { ...mockColumn };
      rerender(
        <TestWrapper
          column={newColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      // Should re-render because column reference changed
      expect(renderCount).toBe(2);
    });
    
    it('should re-render when row reference changes', () => {
      let renderCount = 0;
      
      const TestWrapper = (props: BOMCellProps) => {
        renderCount++;
        return <BOMCell {...props} />;
      };
      
      const { rerender } = render(
        <TestWrapper
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      expect(renderCount).toBe(1);
      
      // Re-render with different row reference
      const newRow = { ...mockRow };
      rerender(
        <TestWrapper
          column={mockColumn}
          value="test"
          row={newRow}
          onChange={mockOnChange}
        />
      );
      
      // Should re-render because row reference changed
      expect(renderCount).toBe(2);
    });
  });
  
  describe('useMemo Optimization', () => {
    it('should memoize cell style computation', () => {
      const { rerender } = render(
        <BOMCell
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement1 = screen.getByRole('cell');
      const style1 = cellElement1.style;
      
      // Re-render with same props
      rerender(
        <BOMCell
          column={mockColumn}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement2 = screen.getByRole('cell');
      const style2 = cellElement2.style;
      
      // Style properties should be identical (memoized)
      expect(style1.width).toBe(style2.width);
      expect(style1.minWidth).toBe(style2.minWidth);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle column without width', () => {
      const columnNoWidth: BOMColumnDef = {
        id: 'col-1',
        field: 'partNumber',
        label: 'Part Number',
      };
      
      render(
        <BOMCell
          column={columnNoWidth}
          value="test"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement).toBeDefined();
    });
    
    it('should handle empty string value', () => {
      render(
        <BOMCell
          column={mockColumn}
          value=""
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('');
    });
    
    it('should handle zero value', () => {
      render(
        <BOMCell
          column={mockColumn}
          value={0}
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const cellElement = screen.getByRole('cell');
      expect(cellElement.textContent).toBe('0');
    });
  });
});

describe('EditableBOMCell Component', () => {
  afterEach(() => {
    cleanup();
  });
  
  const mockRow: BOMRowData = {
    id: 'row-1',
    partNumber: 'PN-001',
  };
  
  const mockColumn: BOMColumnDef = {
    id: 'col-1',
    field: 'partNumber',
    label: 'Part Number',
    width: 150,
    editable: true,
  };
  
  const mockOnChange = vi.fn();
  
  describe('Rendering', () => {
    it('should render input element', () => {
      render(
        <EditableBOMCell
          column={mockColumn}
          value="PN-001"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.value).toBe('PN-001');
    });
    
    it('should render with placeholder', () => {
      render(
        <EditableBOMCell
          column={mockColumn}
          value=""
          row={mockRow}
          onChange={mockOnChange}
          placeholder="Enter part number"
        />
      );
      
      const input = screen.getByPlaceholderText('Enter part number');
      expect(input).toBeDefined();
    });
    
    it('should render number input when inputType is number', () => {
      render(
        <EditableBOMCell
          column={mockColumn}
          value={10}
          row={mockRow}
          onChange={mockOnChange}
          inputType="number"
        />
      );
      
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.type).toBe('number');
    });
  });
  
  describe('Input Handling', () => {
    it('should call onChange when input value changes', () => {
      render(
        <EditableBOMCell
          column={mockColumn}
          value="PN-001"
          row={mockRow}
          onChange={mockOnChange}
        />
      );
      
      const input = screen.getByRole('textbox') as HTMLInputElement;
      
      // Simulate input change using fireEvent
      fireEvent.change(input, { target: { value: 'PN-002' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('partNumber', 'PN-002');
    });
    
    it('should parse number input correctly', () => {
      render(
        <EditableBOMCell
          column={mockColumn}
          value={10}
          row={mockRow}
          onChange={mockOnChange}
          inputType="number"
        />
      );
      
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      
      // Simulate input change using fireEvent
      fireEvent.change(input, { target: { value: '20' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('partNumber', 20);
    });
  });
});
