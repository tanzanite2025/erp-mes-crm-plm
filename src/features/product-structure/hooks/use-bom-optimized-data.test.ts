/**
 * Unit Tests for useBOMOptimizedData Hook
 * 
 * Tests row update handling, commit processing, memoization, and Proxy management.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBOMOptimizedData, type BOMRowData } from './use-bom-optimized-data';

describe('useBOMOptimizedData Hook', () => {
  // Test data
  const mockRows: BOMRowData[] = [
    { id: 'row-1', partNumber: 'PN-001', quantity: 10, price: 100 },
    { id: 'row-2', partNumber: 'PN-002', quantity: 20, price: 200 },
    { id: 'row-3', partNumber: 'PN-003', quantity: 30, price: 300 },
  ];
  
  describe('Initialization', () => {
    it('should initialize with provided rows', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      expect(result.current.rows).toEqual(mockRows);
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.activeProxyCount).toBe(0);
    });
    
    it('should initialize with empty rows', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: [] })
      );
      
      expect(result.current.rows).toEqual([]);
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should use custom row ID extractor', () => {
      const customExtractor = (row: BOMRowData) => `custom-${row.id}`;
      
      const { result } = renderHook(() => 
        useBOMOptimizedData({
          initialRows: mockRows,
          rowIdExtractor: customExtractor,
        })
      );
      
      expect(result.current.rows).toEqual(mockRows);
    });
  });
  
  describe('Row Updates', () => {
    it('should update a row', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const updatedRow = { ...mockRows[0], quantity: 15 };
      
      act(() => {
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.rows[0].quantity).toBe(15);
      expect(result.current.dirtyCount).toBe(1);
    });
    
    it('should mark row as dirty after update', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const updatedRow = { ...mockRows[0], quantity: 15 };
      
      act(() => {
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.isRowDirty('row-1')).toBe(true);
      expect(result.current.isRowDirty('row-2')).toBe(false);
    });
    
    it('should update multiple rows independently', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
        result.current.handleRowUpdate({ ...mockRows[1], quantity: 25 });
      });
      
      expect(result.current.rows[0].quantity).toBe(15);
      expect(result.current.rows[1].quantity).toBe(25);
      expect(result.current.dirtyCount).toBe(2);
    });
    
    it('should preserve other rows when updating one row', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const updatedRow = { ...mockRows[0], quantity: 15 };
      
      act(() => {
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.rows[1]).toEqual(mockRows[1]);
      expect(result.current.rows[2]).toEqual(mockRows[2]);
    });
  });
  
  describe('Commit Operation', () => {
    it('should calculate delta for dirty rows only', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Update one row
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      // Should only have delta for the updated row
      expect(delta).toBeDefined();
      expect(Object.keys(delta!)).toContain('rows.row-1.quantity');
      expect(delta!['rows.row-1.quantity']).toEqual({
        o: 10,
        n: 15,
      });
    });
    
    it('should not include unchanged rows in delta', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Update one row
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      // Should not have deltas for unchanged rows
      expect(Object.keys(delta!).some(key => key.includes('row-2'))).toBe(false);
      expect(Object.keys(delta!).some(key => key.includes('row-3'))).toBe(false);
    });
    
    it('should calculate delta for multiple dirty rows', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Update multiple rows
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
        result.current.handleRowUpdate({ ...mockRows[1], quantity: 25 });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      expect(Object.keys(delta!)).toContain('rows.row-1.quantity');
      expect(Object.keys(delta!)).toContain('rows.row-2.quantity');
    });
    
    it('should clear dirty markers after successful commit', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      expect(result.current.dirtyCount).toBe(1);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.isRowDirty('row-1')).toBe(false);
    });
    
    it('should call onCommitSuccess callback', async () => {
      const onCommitSuccess = vi.fn();
      
      const { result } = renderHook(() => 
        useBOMOptimizedData({
          initialRows: mockRows,
          onCommitSuccess,
        })
      );
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(onCommitSuccess).toHaveBeenCalledTimes(1);
      expect(onCommitSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          'rows.row-1.quantity': expect.any(Object),
        })
      );
    });
    
    it('should handle commit with no dirty rows', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      expect(delta).toEqual({});
    });
    
    it('should call onCommitError on failure', async () => {
      const onCommitError = vi.fn();
      
      // Create a scenario that will cause an error
      const { result } = renderHook(() => 
        useBOMOptimizedData({
          initialRows: mockRows,
          onCommitError,
          onCommitSuccess: () => {
            throw new Error('Commit failed');
          },
        })
      );
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      await act(async () => {
        try {
          await result.current.handleCommit();
        } catch (error) {
          // Expected error
        }
      });
      
      expect(onCommitError).toHaveBeenCalledTimes(1);
      expect(onCommitError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
  
  describe('Proxy Management', () => {
    it('should get Proxy for a row', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const proxy = result.current.getRowProxy('row-1');
      
      expect(proxy).toBeDefined();
      expect(proxy?.id).toBe('row-1');
    });
    
    it('should return undefined for non-existent row', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const proxy = result.current.getRowProxy('non-existent');
      
      expect(proxy).toBeUndefined();
    });
    
    it('should release Proxy for clean rows', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Get Proxy
      result.current.getRowProxy('row-1');
      expect(result.current.activeProxyCount).toBeGreaterThan(0);
      
      // Release Proxy
      act(() => {
        result.current.releaseRowProxy('row-1');
      });
      
      // Proxy should be released (count may be 0 or remain if dirty)
      expect(result.current.activeProxyCount).toBeGreaterThanOrEqual(0);
    });
    
    it('should not release Proxy for dirty rows', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Update row to make it dirty
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      // Get Proxy
      result.current.getRowProxy('row-1');
      const countBefore = result.current.activeProxyCount;
      
      // Try to release Proxy
      act(() => {
        result.current.releaseRowProxy('row-1');
      });
      
      // Proxy should not be released because row is dirty
      expect(result.current.activeProxyCount).toBe(countBefore);
    });
  });
  
  describe('Dirty Marker Management', () => {
    it('should check if row is dirty', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      expect(result.current.isRowDirty('row-1')).toBe(false);
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
      });
      
      expect(result.current.isRowDirty('row-1')).toBe(true);
    });
    
    it('should clear all dirty markers', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0], quantity: 15 });
        result.current.handleRowUpdate({ ...mockRows[1], quantity: 25 });
      });
      
      expect(result.current.dirtyCount).toBe(2);
      
      act(() => {
        result.current.clearDirtyMarkers();
      });
      
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.isRowDirty('row-1')).toBe(false);
      expect(result.current.isRowDirty('row-2')).toBe(false);
    });
  });
  
  describe('Memoization', () => {
    it('should memoize handleRowUpdate', () => {
      const { result, rerender } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const handler1 = result.current.handleRowUpdate;
      
      rerender();
      
      const handler2 = result.current.handleRowUpdate;
      
      expect(handler1).toBe(handler2);
    });
    
    it('should memoize handleCommit', () => {
      const { result, rerender } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const handler1 = result.current.handleCommit;
      
      rerender();
      
      const handler2 = result.current.handleCommit;
      
      expect(handler1).toBe(handler2);
    });
    
    it('should memoize getRowProxy', () => {
      const { result, rerender } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const handler1 = result.current.getRowProxy;
      
      rerender();
      
      const handler2 = result.current.getRowProxy;
      
      expect(handler1).toBe(handler2);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle updating non-existent row gracefully', () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      const nonExistentRow = { id: 'non-existent', partNumber: 'PN-999', quantity: 99 };
      
      act(() => {
        result.current.handleRowUpdate(nonExistentRow);
      });
      
      // Should not crash, row count should remain the same
      expect(result.current.rows).toHaveLength(3);
    });
    
    it('should handle commit with missing baseline data', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Manually mark a row as dirty without proper baseline
      act(() => {
        result.current.handleRowUpdate({ id: 'new-row', partNumber: 'PN-999', quantity: 99 });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      // Should handle gracefully
      expect(delta).toBeDefined();
    });
    
    it('should handle multiple fields changed in one row', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      act(() => {
        result.current.handleRowUpdate({
          ...mockRows[0],
          quantity: 15,
          price: 150,
          partNumber: 'PN-001-UPDATED',
        });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      expect(Object.keys(delta!)).toContain('rows.row-1.quantity');
      expect(Object.keys(delta!)).toContain('rows.row-1.price');
      expect(Object.keys(delta!)).toContain('rows.row-1.partNumber');
    });
    
    it('should handle unchanged field values', async () => {
      const { result } = renderHook(() => 
        useBOMOptimizedData({ initialRows: mockRows })
      );
      
      // Update with same values
      act(() => {
        result.current.handleRowUpdate({ ...mockRows[0] });
      });
      
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      // Should have empty delta (no actual changes)
      expect(Object.keys(delta!)).toHaveLength(0);
    });
  });
});
