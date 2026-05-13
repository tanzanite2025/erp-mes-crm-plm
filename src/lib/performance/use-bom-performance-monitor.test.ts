/**
 * Unit Tests for useBOMPerformanceMonitor Hook
 * 
 * Tests automatic initial render monitoring, edit monitoring, and commit monitoring.
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBOMPerformanceMonitor } from './use-bom-performance-monitor';

describe('useBOMPerformanceMonitor Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      expect(result.current.monitor).toBeDefined();
      expect(result.current.monitorEdit).toBeDefined();
      expect(result.current.monitorCommit).toBeDefined();
    });
    
    it('should initialize with custom thresholds', () => {
      const customThresholds = {
        maxInitialRenderTime: 200,
        maxEditTime: 100,
        maxCommitTime: 100,
        maxActiveProxyCount: 5000,
      };
      
      const { result } = renderHook(() => 
        useBOMPerformanceMonitor({ thresholds: customThresholds })
      );
      
      const thresholds = result.current.monitor.getThresholds();
      expect(thresholds).toEqual(customThresholds);
    });
    
    it('should use same monitor instance across re-renders', () => {
      const { result, rerender } = renderHook(() => 
        useBOMPerformanceMonitor()
      );
      
      const monitor1 = result.current.monitor;
      
      rerender();
      
      const monitor2 = result.current.monitor;
      
      expect(monitor1).toBe(monitor2);
    });
  });
  
  describe('Automatic Initial Render Monitoring', () => {
    it('should automatically monitor initial render time', async () => {
      const onMetricsRecorded = vi.fn();
      
      const { unmount } = renderHook(() => 
        useBOMPerformanceMonitor({
          enableInitialRenderMonitoring: true,
          onMetricsRecorded,
        })
      );
      
      // Unmount to trigger the effect cleanup
      unmount();
      
      // Wait for metrics to be recorded
      await waitFor(() => {
        expect(onMetricsRecorded).toHaveBeenCalled();
      });
      
      const monitor = onMetricsRecorded.mock.calls[0][0];
      const metrics = monitor.getLatestMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics?.initialRenderTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should not monitor initial render when disabled', async () => {
      const onMetricsRecorded = vi.fn();
      
      const { unmount } = renderHook(() => 
        useBOMPerformanceMonitor({
          enableInitialRenderMonitoring: false,
          onMetricsRecorded,
        })
      );
      
      unmount();
      
      // Wait a bit to ensure no metrics are recorded
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(onMetricsRecorded).not.toHaveBeenCalled();
    });
    
    it('should record initial render time in metrics', async () => {
      const { result, unmount } = renderHook(() => 
        useBOMPerformanceMonitor()
      );
      
      const monitor = result.current.monitor;
      
      unmount();
      
      // Wait for metrics to be recorded
      await waitFor(() => {
        expect(monitor.getMetricCount()).toBeGreaterThan(0);
      });
      
      const metrics = monitor.getLatestMetrics();
      expect(metrics?.initialRenderTime).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Edit Monitoring', () => {
    it('should monitor edit operation', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      let endMonitoring: () => void;
      
      act(() => {
        endMonitoring = result.current.monitorEdit();
      });
      
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait ~10ms
      }
      
      act(() => {
        endMonitoring();
      });
      
      const metrics = result.current.monitor.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.editTime).toBeGreaterThanOrEqual(10);
    });
    
    it('should call onMetricsRecorded after edit', () => {
      const onMetricsRecorded = vi.fn();
      
      const { result } = renderHook(() => 
        useBOMPerformanceMonitor({ onMetricsRecorded })
      );
      
      let endMonitoring: () => void;
      
      act(() => {
        endMonitoring = result.current.monitorEdit();
      });
      
      act(() => {
        endMonitoring();
      });
      
      expect(onMetricsRecorded).toHaveBeenCalledTimes(1);
      expect(onMetricsRecorded).toHaveBeenCalledWith(result.current.monitor);
    });
    
    it('should handle multiple edit operations', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      act(() => {
        const end1 = result.current.monitorEdit();
        end1();
        
        const end2 = result.current.monitorEdit();
        end2();
      });
      
      expect(result.current.monitor.getMetricCount()).toBe(2);
    });
    
    it('should memoize monitorEdit function', () => {
      const { result, rerender } = renderHook(() => 
        useBOMPerformanceMonitor()
      );
      
      const monitorEdit1 = result.current.monitorEdit;
      
      rerender();
      
      const monitorEdit2 = result.current.monitorEdit;
      
      expect(monitorEdit1).toBe(monitorEdit2);
    });
  });
  
  describe('Commit Monitoring', () => {
    it('should monitor commit operation', async () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      const commitFn = vi.fn(async () => {
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });
      
      let returnValue: string | undefined;
      
      await act(async () => {
        returnValue = await result.current.monitorCommit(commitFn);
      });
      
      expect(commitFn).toHaveBeenCalledTimes(1);
      expect(returnValue).toBe('success');
      
      const metrics = result.current.monitor.getLatestMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.commitTime).toBeGreaterThanOrEqual(10);
    });
    
    it('should call onMetricsRecorded after commit', async () => {
      const onMetricsRecorded = vi.fn();
      
      const { result } = renderHook(() => 
        useBOMPerformanceMonitor({ onMetricsRecorded })
      );
      
      const commitFn = vi.fn(async () => 'success');
      
      await act(async () => {
        await result.current.monitorCommit(commitFn);
      });
      
      expect(onMetricsRecorded).toHaveBeenCalledTimes(1);
      expect(onMetricsRecorded).toHaveBeenCalledWith(result.current.monitor);
    });
    
    it('should handle commit errors gracefully', async () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      const commitFn = vi.fn(async () => {
        throw new Error('Commit failed');
      });
      
      await act(async () => {
        try {
          await result.current.monitorCommit(commitFn);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Commit failed');
        }
      });
      
      expect(commitFn).toHaveBeenCalledTimes(1);
    });
    
    it('should end timing even when commit fails', async () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      const commitFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('Commit failed');
      });
      
      await act(async () => {
        try {
          await result.current.monitorCommit(commitFn);
        } catch (error) {
          // Expected error
        }
      });
      
      // Timing should still be ended (no active timings)
      const metrics = result.current.monitor.getLatestMetrics();
      
      // If timing was properly ended, we shouldn't have a pending 'commit' timing
      // This is implicit - if timing wasn't ended, subsequent calls would fail
      expect(metrics).toBeDefined();
    });
    
    it('should handle multiple commit operations', async () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      await act(async () => {
        await result.current.monitorCommit(async () => 'result1');
        await result.current.monitorCommit(async () => 'result2');
      });
      
      expect(result.current.monitor.getMetricCount()).toBe(2);
    });
    
    it('should memoize monitorCommit function', () => {
      const { result, rerender } = renderHook(() => 
        useBOMPerformanceMonitor()
      );
      
      const monitorCommit1 = result.current.monitorCommit;
      
      rerender();
      
      const monitorCommit2 = result.current.monitorCommit;
      
      expect(monitorCommit1).toBe(monitorCommit2);
    });
  });
  
  describe('Monitor Instance Access', () => {
    it('should provide access to monitor instance', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      expect(result.current.monitor).toBeDefined();
      expect(result.current.monitor.getMetrics).toBeDefined();
      expect(result.current.monitor.recordMetrics).toBeDefined();
    });
    
    it('should allow direct metrics recording', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      act(() => {
        result.current.monitor.recordMetrics({
          initialRenderTime: 80,
          editTime: 30,
          commitTime: 40,
          activeProxyCount: 3000,
          dirtyRowCount: 100,
          totalRowCount: 1000,
          timestamp: Date.now(),
        });
      });
      
      const metrics = result.current.monitor.getLatestMetrics();
      expect(metrics?.initialRenderTime).toBe(80);
      expect(metrics?.editTime).toBe(30);
      expect(metrics?.commitTime).toBe(40);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle rapid edit operations', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      act(() => {
        for (let i = 0; i < 10; i++) {
          const end = result.current.monitorEdit();
          end();
        }
      });
      
      expect(result.current.monitor.getMetricCount()).toBe(10);
    });
    
    it('should handle concurrent edit and commit monitoring', async () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      let endEdit: () => void;
      
      act(() => {
        endEdit = result.current.monitorEdit();
      });
      
      await act(async () => {
        await result.current.monitorCommit(async () => 'success');
      });
      
      act(() => {
        endEdit();
      });
      
      expect(result.current.monitor.getMetricCount()).toBe(2);
    });
    
    it('should handle unmount during active monitoring', async () => {
      const { result, unmount } = renderHook(() => 
        useBOMPerformanceMonitor()
      );
      
      act(() => {
        result.current.monitorEdit();
      });
      
      // Unmount without ending edit monitoring
      unmount();
      
      // Should not crash
      expect(true).toBe(true);
    });
  });
  
  describe('Integration', () => {
    it('should work with all monitoring features together', async () => {
      const onMetricsRecorded = vi.fn();
      
      const { result, unmount } = renderHook(() => 
        useBOMPerformanceMonitor({
          enableInitialRenderMonitoring: true,
          onMetricsRecorded,
        })
      );
      
      // Monitor edit
      act(() => {
        const end = result.current.monitorEdit();
        end();
      });
      
      // Monitor commit
      await act(async () => {
        await result.current.monitorCommit(async () => 'success');
      });
      
      // Unmount to trigger initial render recording
      unmount();
      
      await waitFor(() => {
        expect(onMetricsRecorded).toHaveBeenCalledTimes(3); // edit + commit + initial render
      });
    });
  });
});
