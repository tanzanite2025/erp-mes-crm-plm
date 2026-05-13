/**
 * useBOMPerformanceMonitor Hook
 * 
 * React hook for monitoring BOM performance metrics.
 * 
 * Features:
 * - Automatic initial render time monitoring
 * - Manual edit operation monitoring
 * - Manual commit operation monitoring
 * - Access to BOMPerformanceMonitor instance
 * 
 * Performance Targets:
 * - Initial render: ≤100ms for 1000 rows
 * - Single field edit: ≤50ms
 * - Commit operation: ≤50ms for 1000 rows with 10% dirty
 */

import { useRef, useEffect, useCallback } from 'react';
import { BOMPerformanceMonitor, BOMPerformanceThresholds } from './bom-performance-monitor';

/**
 * Options for useBOMPerformanceMonitor hook
 */
export interface UseBOMPerformanceMonitorOptions {
  /**
   * Custom performance thresholds (optional)
   */
  thresholds?: BOMPerformanceThresholds;
  
  /**
   * Enable automatic initial render monitoring (default: true)
   */
  enableInitialRenderMonitoring?: boolean;
  
  /**
   * Callback when metrics are recorded
   */
  onMetricsRecorded?: (monitor: BOMPerformanceMonitor) => void;
}

/**
 * Return value from useBOMPerformanceMonitor hook
 */
export interface UseBOMPerformanceMonitorReturn {
  /**
   * BOM performance monitor instance
   */
  monitor: BOMPerformanceMonitor;
  
  /**
   * Start monitoring an edit operation
   * Returns a function to end the monitoring
   */
  monitorEdit: () => () => void;
  
  /**
   * Monitor a commit operation
   * Wraps the commit function and measures its execution time
   */
  monitorCommit: <T>(commitFn: () => Promise<T>) => Promise<T>;
}

/**
 * useBOMPerformanceMonitor Hook
 * 
 * Provides performance monitoring utilities for BOM operations.
 * Automatically monitors initial render time and provides functions
 * for monitoring edit and commit operations.
 * 
 * @example
 * ```tsx
 * function BOMTable({ rows }) {
 *   const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor();
 *   
 *   const handleEdit = () => {
 *     const endMonitoring = monitorEdit();
 *     // ... perform edit ...
 *     endMonitoring();
 *   };
 *   
 *   const handleCommit = async () => {
 *     await monitorCommit(async () => {
 *       // ... perform commit ...
 *     });
 *   };
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useBOMPerformanceMonitor(
  options: UseBOMPerformanceMonitorOptions = {}
): UseBOMPerformanceMonitorReturn {
  const {
    thresholds,
    enableInitialRenderMonitoring = true,
    onMetricsRecorded,
  } = options;
  
  // Create monitor instance (persistent across re-renders)
  const monitor = useRef(new BOMPerformanceMonitor(thresholds));
  
  // Monitor initial render time
  useEffect(() => {
    if (!enableInitialRenderMonitoring) {
      return;
    }
    
    // Start timing on mount
    monitor.current.startTiming('initialRender');
    
    // End timing on unmount or when effect cleanup runs
    return () => {
      const renderTime = monitor.current.endTiming('initialRender');
      
      // Only record if timing was actually measured
      if (renderTime > 0) {
        monitor.current.recordMetrics({
          initialRenderTime: renderTime,
        });
        
        // Call callback if provided
        onMetricsRecorded?.(monitor.current);
      }
    };
  }, [enableInitialRenderMonitoring, onMetricsRecorded]);
  
  // Memoized edit monitoring function
  const monitorEdit = useCallback((): (() => void) => {
    // Start timing
    monitor.current.startTiming('edit');
    
    // Return function to end timing
    return () => {
      const editTime = monitor.current.endTiming('edit');
      
      // Record metrics
      monitor.current.recordMetrics({
        editTime,
      });
      
      // Call callback if provided
      onMetricsRecorded?.(monitor.current);
    };
  }, [onMetricsRecorded]);
  
  // Memoized commit monitoring function
  const monitorCommit = useCallback(
    async <T,>(commitFn: () => Promise<T>): Promise<T> => {
      // Start timing
      monitor.current.startTiming('commit');
      
      try {
        // Execute commit function
        const result = await commitFn();
        
        // End timing
        const commitTime = monitor.current.endTiming('commit');
        
        // Record metrics
        monitor.current.recordMetrics({
          commitTime,
        });
        
        // Call callback if provided
        onMetricsRecorded?.(monitor.current);
        
        return result;
      } catch (error) {
        // End timing even on error
        monitor.current.endTiming('commit');
        
        // Re-throw error
        throw error;
      }
    },
    [onMetricsRecorded]
  );
  
  return {
    monitor: monitor.current,
    monitorEdit,
    monitorCommit,
  };
}

/**
 * Type helper for useBOMPerformanceMonitor return value
 */
export type UseBOMPerformanceMonitorHook = typeof useBOMPerformanceMonitor;
