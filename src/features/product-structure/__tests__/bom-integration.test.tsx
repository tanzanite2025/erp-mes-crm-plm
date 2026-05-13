/**
 * Integration Tests for BOM Component with Performance Optimizations
 * 
 * Tests complete workflow: load â†?edit â†?commit
 * Tests with feature flags enabled/disabled
 * Tests error scenarios
 * Tests with various dataset sizes
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBOMOptimizedData } from '../hooks/use-bom-optimized-data';
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';
import {
  setFeatureFlagsForTesting,
  resetFeatureFlags,
  getBOMPerformanceFeatureFlags,
} from '../config/feature-flags';
import {
  generateBOMRows,
  BOMDataPresets,
  type BOMRowFields,
} from './test-data-generators';

describe('BOM Component Integration Tests', () => {
  beforeEach(() => {
    // Reset feature flags before each test
    resetFeatureFlags();
  });
  
  afterEach(() => {
    resetFeatureFlags();
  });
  
  describe('Complete Workflow: Load â†?Edit â†?Commit', () => {
    it('should complete full workflow with small dataset', async () => {
      const initialRows = BOMDataPresets.small(0);
      
      // Load
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(100);
      expect(result.current.dirtyCount).toBe(0);
      
      // Edit
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.dirtyCount).toBe(1);
      expect(result.current.rows[0].quantity).toBe(999);
      
      // Commit
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      expect(delta).toBeDefined();
      expect(Object.keys(delta!)).toContain('rows.row-1.quantity');
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should complete full workflow with large dataset', async () => {
      const initialRows = BOMDataPresets.large(0);
      
      // Load
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(1000);
      
      // Edit multiple rows
      act(() => {
        for (let i = 0; i < 10; i++) {
          const updatedRow = { ...result.current.rows[i], quantity: 999 + i };
          result.current.handleRowUpdate(updatedRow);
        }
      });
      
      expect(result.current.dirtyCount).toBe(10);
      
      // Commit
      let delta;
      await act(async () => {
        delta = await result.current.handleCommit();
      });
      
      expect(Object.keys(delta!)).toHaveLength(10);
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should handle multiple edit-commit cycles', async () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Cycle 1: Edit and commit
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 100 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
      
      // Cycle 2: Edit and commit again
      act(() => {
        const updatedRow = { ...result.current.rows[1], quantity: 200 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
  });
  
  describe('Feature Flag Integration', () => {
    it('should work with all optimizations enabled', async () => {
      setFeatureFlagsForTesting({
        enableAllOptimizations: true,
        enableDirtyMarking: true,
        enableLazyProxy: true,
        enableVirtualScrolling: true,
        enableReactOptimizations: true,
      });
      
      const flags = getBOMPerformanceFeatureFlags();
      expect(flags.enableAllOptimizations).toBe(true);
      
      const initialRows = BOMDataPresets.large(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Should work normally
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should work with all optimizations disabled (legacy mode)', async () => {
      setFeatureFlagsForTesting({
        enableAllOptimizations: false,
      });
      
      const flags = getBOMPerformanceFeatureFlags();
      expect(flags.enableAllOptimizations).toBe(false);
      
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Should still work in legacy mode
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should work with performance monitoring enabled', async () => {
      setFeatureFlagsForTesting({
        enablePerformanceMonitoring: true,
      });
      
      const { result: monitorResult } = renderHook(() => useBOMPerformanceMonitor());
      const initialRows = BOMDataPresets.medium(0);
      const { result: dataResult } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Monitor edit operation
      let endMonitoring: () => void;
      act(() => {
        endMonitoring = monitorResult.current.monitorEdit();
      });
      
      act(() => {
        const updatedRow = { ...dataResult.current.rows[0], quantity: 999 };
        dataResult.current.handleRowUpdate(updatedRow);
      });
      
      act(() => {
        endMonitoring();
      });
      
      const metrics = monitorResult.current.monitor.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.editTime).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Error Scenarios', () => {
    it('should handle commit errors gracefully', async () => {
      const onCommitError = vi.fn();
      const initialRows = BOMDataPresets.small(0);
      
      const { result } = renderHook(() =>
        useBOMOptimizedData({
          initialRows,
          onCommitError,
          onCommitSuccess: () => {
            throw new Error('Commit failed');
          },
        })
      );
      
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      await act(async () => {
        try {
          await result.current.handleCommit();
        } catch (error) {
          // Expected error
        }
      });
      
      expect(onCommitError).toHaveBeenCalled();
    });
    
    it('should handle invalid row updates', async () => {
      const initialRows = BOMDataPresets.small(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Try to update non-existent row
      act(() => {
        const invalidRow = { id: 'non-existent', quantity: 999 } as BOMRowFields;
        result.current.handleRowUpdate(invalidRow);
      });
      
      // Should not crash
      expect(result.current.rows).toHaveLength(100);
    });
    
    it('should handle empty dataset', async () => {
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows: [] }));
      
      expect(result.current.rows).toHaveLength(0);
      expect(result.current.dirtyCount).toBe(0);
      
      // Commit should work with empty dataset
      await act(async () => {
        const delta = await result.current.handleCommit();
        expect(delta).toEqual({});
      });
    });
  });
  
  describe('Various Dataset Sizes', () => {
    it('should handle 100 rows', async () => {
      const initialRows = BOMDataPresets.small(10);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(100);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should handle 500 rows', async () => {
      const initialRows = BOMDataPresets.medium(10);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(500);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should handle 1000 rows', async () => {
      const initialRows = BOMDataPresets.large(10);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(1000);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should handle 2000 rows', async () => {
      const initialRows = BOMDataPresets.extraLarge(10);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows).toHaveLength(2000);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
    
    it('should handle nested structure', async () => {
      const initialRows = BOMDataPresets.nested(10);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.rows.length).toBeGreaterThan(0);
      
      // Check that some rows have parent-child relationships
      const hasNestedRows = result.current.rows.some(row => row.parentId);
      expect(hasNestedRows).toBe(true);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
  });
  
  describe('Proxy Management', () => {
    it('should create Proxies on demand', () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.activeProxyCount).toBe(0);
      
      // Get Proxy for first row
      act(() => {
        result.current.getRowProxy('row-1');
      });
      
      expect(result.current.activeProxyCount).toBeGreaterThan(0);
    });
    
    it('should release clean Proxies', () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Get Proxy
      act(() => {
        result.current.getRowProxy('row-1');
      });
      
      const countBefore = result.current.activeProxyCount;
      
      // Release Proxy
      act(() => {
        result.current.releaseRowProxy('row-1');
      });
      
      const countAfter = result.current.activeProxyCount;
      expect(countAfter).toBeLessThanOrEqual(countBefore);
    });
    
    it('should preserve dirty Proxies', () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Get Proxy and mark as dirty
      act(() => {
        result.current.getRowProxy('row-1');
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.isRowDirty('row-1')).toBe(true);
      
      const countBefore = result.current.activeProxyCount;
      
      // Try to release dirty Proxy
      act(() => {
        result.current.releaseRowProxy('row-1');
      });
      
      // Proxy should still be active
      const countAfter = result.current.activeProxyCount;
      expect(countAfter).toBe(countBefore);
    });
  });
  
  describe('Dirty Marker Integration', () => {
    it('should track dirty rows correctly', () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      expect(result.current.dirtyCount).toBe(0);
      
      // Mark multiple rows as dirty
      act(() => {
        for (let i = 0; i < 5; i++) {
          const updatedRow = { ...result.current.rows[i], quantity: 999 + i };
          result.current.handleRowUpdate(updatedRow);
        }
      });
      
      expect(result.current.dirtyCount).toBe(5);
      
      // Check individual rows
      expect(result.current.isRowDirty('row-1')).toBe(true);
      expect(result.current.isRowDirty('row-6')).toBe(false);
    });
    
    it('should clear dirty markers after commit', async () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.dirtyCount).toBe(1);
      
      await act(async () => {
        await result.current.handleCommit();
      });
      
      expect(result.current.dirtyCount).toBe(0);
      expect(result.current.isRowDirty('row-1')).toBe(false);
    });
    
    it('should support manual dirty marker clearing', () => {
      const initialRows = BOMDataPresets.medium(0);
      const { result } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      act(() => {
        const updatedRow = { ...result.current.rows[0], quantity: 999 };
        result.current.handleRowUpdate(updatedRow);
      });
      
      expect(result.current.dirtyCount).toBe(1);
      
      act(() => {
        result.current.clearDirtyMarkers();
      });
      
      expect(result.current.dirtyCount).toBe(0);
    });
  });
  
  describe('Performance Monitoring Integration', () => {
    it('should monitor complete workflow', async () => {
      const { result: monitorResult } = renderHook(() => useBOMPerformanceMonitor());
      const initialRows = BOMDataPresets.large(0);
      const { result: dataResult } = renderHook(() => useBOMOptimizedData({ initialRows }));
      
      // Monitor edit
      let endEdit: () => void;
      act(() => {
        endEdit = monitorResult.current.monitorEdit();
      });
      
      act(() => {
        const updatedRow = { ...dataResult.current.rows[0], quantity: 999 };
        dataResult.current.handleRowUpdate(updatedRow);
      });
      
      act(() => {
        endEdit();
      });
      
      // Monitor commit
      await act(async () => {
        await monitorResult.current.monitorCommit(async () => {
          return await dataResult.current.handleCommit();
        });
      });
      
      // Check metrics
      const metrics = monitorResult.current.monitor.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.editTime).toBeGreaterThanOrEqual(0);
      expect(metrics?.commitTime).toBeGreaterThanOrEqual(0);
    });
  });
});
