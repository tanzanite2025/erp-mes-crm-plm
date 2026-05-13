/**
 * Performance Benchmark Tests for BOM Optimizations
 * 
 * Benchmarks performance metrics against target requirements:
 * - Initial render: ≤100ms for 1000 rows
 * - Single field edit: ≤50ms
 * - Commit operation: ≤50ms for 1000 rows with 10% dirty
 * - Active Proxy count: ≤4,000 for 1000 rows
 * - Scroll frame rate: 60 FPS target
 * 
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBOMData } from '../hooks/use-bom-data';
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker';
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager';
import {
  generateBOMRows,
  generateBenchmarkDatasets,
  getExpectedPerformanceMetrics,
  BOMDataPresets,
  type BOMRowFields,
} from './test-data-generators';

/**
 * Performance benchmark result
 */
interface BenchmarkResult {
  name: string;
  rowCount: number;
  dirtyPercentage: number;
  initialRenderTime: number;
  editTime: number;
  commitTime: number;
  activeProxyCount: number;
  passed: boolean;
  details: {
    initialRenderPassed: boolean;
    editTimePassed: boolean;
    commitTimePassed: boolean;
    proxyCountPassed: boolean;
  };
}

/**
 * Run performance benchmark for a dataset
 */
async function runBenchmark(
  name: string,
  rows: BOMRowFields[],
  dirtyPercentage: number
): Promise<BenchmarkResult> {
  const rowCount = rows.length;
  const expectedMetrics = getExpectedPerformanceMetrics(rowCount, dirtyPercentage);
  
  // Benchmark initial render
  const renderStart = performance.now();
  const { result } = renderHook(() => useBOMData({ initialRows: rows }));
  const initialRenderTime = performance.now() - renderStart;
  
  // Benchmark single field edit
  const editStart = performance.now();
  act(() => {
    const updatedRow = { ...rows[0], quantity: rows[0].quantity + 1 };
    result.current.handleRowUpdate(updatedRow);
  });
  const editTime = performance.now() - editStart;
  
  // Benchmark commit operation
  const commitStart = performance.now();
  await act(async () => {
    await result.current.handleCommit();
  });
  const commitTime = performance.now() - commitStart;
  
  // Get active Proxy count
  const activeProxyCount = result.current.activeProxyCount;
  
  // Check if metrics meet targets
  const initialRenderPassed = initialRenderTime <= expectedMetrics.maxInitialRenderTime;
  const editTimePassed = editTime <= expectedMetrics.maxEditTime;
  const commitTimePassed = commitTime <= expectedMetrics.maxCommitTime;
  const proxyCountPassed = activeProxyCount <= expectedMetrics.maxActiveProxyCount;
  
  const passed = initialRenderPassed && editTimePassed && commitTimePassed && proxyCountPassed;
  
  return {
    name,
    rowCount,
    dirtyPercentage,
    initialRenderTime,
    editTime,
    commitTime,
    activeProxyCount,
    passed,
    details: {
      initialRenderPassed,
      editTimePassed,
      commitTimePassed,
      proxyCountPassed,
    },
  };
}

/**
 * Format benchmark result for display
 */
function formatBenchmarkResult(result: BenchmarkResult): string {
  const status = result.passed ? '✓ PASS' : '✗ FAIL';
  const expectedMetrics = getExpectedPerformanceMetrics(result.rowCount, result.dirtyPercentage);
  
  return `
${status} ${result.name}
  Rows: ${result.rowCount} (${result.dirtyPercentage}% dirty)
  Initial Render: ${result.initialRenderTime.toFixed(2)}ms (target: ≤${expectedMetrics.maxInitialRenderTime.toFixed(0)}ms) ${result.details.initialRenderPassed ? '✓' : '✗'}
  Edit Time: ${result.editTime.toFixed(2)}ms (target: ≤${expectedMetrics.maxEditTime}ms) ${result.details.editTimePassed ? '✓' : '✗'}
  Commit Time: ${result.commitTime.toFixed(2)}ms (target: ≤${expectedMetrics.maxCommitTime.toFixed(0)}ms) ${result.details.commitTimePassed ? '✓' : '✗'}
  Active Proxies: ${result.activeProxyCount} (target: ≤${expectedMetrics.maxActiveProxyCount.toFixed(0)}) ${result.details.proxyCountPassed ? '✓' : '✗'}
  `.trim();
}

describe('Performance Benchmarks', () => {
  describe('Initial Render Time', () => {
    it('should render 100 rows within target time', async () => {
      const rows = BOMDataPresets.small(0);
      const result = await runBenchmark('100 rows', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.initialRenderPassed).toBe(true);
    });
    
    it('should render 500 rows within target time', async () => {
      const rows = BOMDataPresets.medium(0);
      const result = await runBenchmark('500 rows', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.initialRenderPassed).toBe(true);
    });
    
    it('should render 1000 rows within target time (≤100ms)', async () => {
      const rows = BOMDataPresets.large(0);
      const result = await runBenchmark('1000 rows', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      // Requirement 6.3: Initial render ≤100ms for 1000 rows
      expect(result.initialRenderTime).toBeLessThanOrEqual(100);
      expect(result.details.initialRenderPassed).toBe(true);
    });
    
    it('should render 2000 rows within target time', async () => {
      const rows = BOMDataPresets.extraLarge(0);
      const result = await runBenchmark('2000 rows', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.initialRenderPassed).toBe(true);
    });
  });
  
  describe('Single Field Edit Time', () => {
    it('should edit single field within target time (≤50ms)', async () => {
      const rows = BOMDataPresets.large(0);
      const result = await runBenchmark('1000 rows - single edit', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      // Requirement 6.5: Single field edit ≤50ms
      expect(result.editTime).toBeLessThanOrEqual(50);
      expect(result.details.editTimePassed).toBe(true);
    });
    
    it('should maintain edit performance with large datasets', async () => {
      const rows = BOMDataPresets.extraLarge(0);
      const result = await runBenchmark('2000 rows - single edit', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.editTimePassed).toBe(true);
    });
  });
  
  describe('Commit Operation Time', () => {
    it('should commit with 1% dirty rows within target time', async () => {
      const rows = BOMDataPresets.large(1);
      const result = await runBenchmark('1000 rows (1% dirty)', rows, 1);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.commitTimePassed).toBe(true);
    });
    
    it('should commit with 10% dirty rows within target time (≤50ms)', async () => {
      const rows = BOMDataPresets.large(10);
      const result = await runBenchmark('1000 rows (10% dirty)', rows, 10);
      
      console.info(formatBenchmarkResult(result));
      
      // Requirement 1.4: Commit ≤50ms for 1000 rows with 10% dirty
      expect(result.commitTime).toBeLessThanOrEqual(50);
      expect(result.details.commitTimePassed).toBe(true);
    });
    
    it('should commit with 50% dirty rows within target time', async () => {
      const rows = BOMDataPresets.large(50);
      const result = await runBenchmark('1000 rows (50% dirty)', rows, 50);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.commitTimePassed).toBe(true);
    });
    
    it('should commit with 100% dirty rows within target time', async () => {
      const rows = BOMDataPresets.large(100);
      const result = await runBenchmark('1000 rows (100% dirty)', rows, 100);
      
      console.info(formatBenchmarkResult(result));
      
      expect(result.details.commitTimePassed).toBe(true);
    });
  });
  
  describe('Memory Usage (Active Proxy Count)', () => {
    it('should maintain Proxy count within target (≤4,000 for 1000 rows)', async () => {
      const rows = BOMDataPresets.large(0);
      const result = await runBenchmark('1000 rows - Proxy count', rows, 0);
      
      console.info(formatBenchmarkResult(result));
      
      // Requirement 4.3: Active Proxy count ≤4,000 for 1000 rows
      expect(result.activeProxyCount).toBeLessThanOrEqual(4000);
      expect(result.details.proxyCountPassed).toBe(true);
    });
    
    it('should scale Proxy count linearly with row count', async () => {
      const datasets = [
        { rows: BOMDataPresets.small(0), name: '100 rows' },
        { rows: BOMDataPresets.medium(0), name: '500 rows' },
        { rows: BOMDataPresets.large(0), name: '1000 rows' },
      ];
      
      for (const dataset of datasets) {
        const result = await runBenchmark(dataset.name, dataset.rows, 0);
        console.info(formatBenchmarkResult(result));
        expect(result.details.proxyCountPassed).toBe(true);
      }
    });
  });
  
  describe('Dirty Marking System', () => {
    it('should only mark modified rows as dirty', () => {
      const rows = generateBOMRows({ rowCount: 100, seed: 12345 });
      const dirtyMarker = new BOMDirtyMarker();
      
      // Mark specific rows as dirty
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-5');
      dirtyMarker.markDirty('row-10');
      
      expect(dirtyMarker.getDirtyCount()).toBe(3);
      expect(dirtyMarker.isDirty('row-1')).toBe(true);
      expect(dirtyMarker.isDirty('row-2')).toBe(false);
      expect(dirtyMarker.isDirty('row-5')).toBe(true);
    });
    
    it('should clear dirty markers after commit', () => {
      const dirtyMarker = new BOMDirtyMarker();
      
      dirtyMarker.markDirty('row-1');
      dirtyMarker.markDirty('row-2');
      expect(dirtyMarker.getDirtyCount()).toBe(2);
      
      dirtyMarker.clearAll();
      expect(dirtyMarker.getDirtyCount()).toBe(0);
    });
  });
  
  describe('Lazy Proxy Management', () => {
    it('should create Proxies on demand', () => {
      const rows = generateBOMRows({ rowCount: 100, seed: 12345 });
      const dirtyMarker = new BOMDirtyMarker();
      const proxyManager = new BOMProxyManager(dirtyMarker, (row) => row.id);
      
      expect(proxyManager.getActiveProxyCount()).toBe(0);
      
      // Create Proxy for first row
      proxyManager.getProxy('row-1', rows[0]);
      expect(proxyManager.getActiveProxyCount()).toBe(1);
      
      // Create Proxy for second row
      proxyManager.getProxy('row-2', rows[1]);
      expect(proxyManager.getActiveProxyCount()).toBe(2);
    });
    
    it('should release clean Proxies', () => {
      const rows = generateBOMRows({ rowCount: 100, seed: 12345 });
      const dirtyMarker = new BOMDirtyMarker();
      const proxyManager = new BOMProxyManager(dirtyMarker, (row) => row.id);
      
      // Create Proxies
      proxyManager.getProxy('row-1', rows[0]);
      proxyManager.getProxy('row-2', rows[1]);
      expect(proxyManager.getActiveProxyCount()).toBe(2);
      
      // Release clean Proxy
      proxyManager.releaseProxy('row-1');
      expect(proxyManager.getActiveProxyCount()).toBe(1);
    });
    
    it('should preserve dirty Proxies', () => {
      const rows = generateBOMRows({ rowCount: 100, seed: 12345 });
      const dirtyMarker = new BOMDirtyMarker();
      const proxyManager = new BOMProxyManager(dirtyMarker, (row) => row.id);
      
      // Create Proxy and mark as dirty
      proxyManager.getProxy('row-1', rows[0]);
      dirtyMarker.markDirty('row-1');
      
      // Try to release dirty Proxy
      proxyManager.releaseProxy('row-1');
      
      // Proxy should still be active
      expect(proxyManager.hasProxy('row-1')).toBe(true);
    });
  });
  
  describe('Performance Monitoring', () => {
    it('should record performance metrics', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      // Record metrics
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
      
      expect(metrics).toBeDefined();
      expect(metrics?.initialRenderTime).toBe(80);
      expect(metrics?.editTime).toBe(30);
      expect(metrics?.commitTime).toBe(40);
    });
    
    it('should calculate average metrics', () => {
      const { result } = renderHook(() => useBOMPerformanceMonitor());
      
      // Record multiple metrics
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
        
        result.current.monitor.recordMetrics({
          initialRenderTime: 100,
          editTime: 50,
          commitTime: 60,
          activeProxyCount: 4000,
          dirtyRowCount: 200,
          totalRowCount: 1000,
          timestamp: Date.now(),
        });
      });
      
      const average = result.current.monitor.getAverageMetrics();
      
      expect(average?.initialRenderTime).toBe(90);
      expect(average?.editTime).toBe(40);
      expect(average?.commitTime).toBe(50);
    });
  });
  
  describe('Full Benchmark Suite', () => {
    it('should run all benchmarks and generate report', async () => {
      const datasets = generateBenchmarkDatasets();
      const results: BenchmarkResult[] = [];
      
      console.info('\n=== BOM Performance Benchmark Report ===\n');
      
      for (const dataset of datasets) {
        const result = await runBenchmark(
          dataset.name,
          dataset.rows,
          dataset.dirtyPercentage
        );
        results.push(result);
        console.info(formatBenchmarkResult(result));
        console.info('');
      }
      
      // Summary
      const passedCount = results.filter(r => r.passed).length;
      const totalCount = results.length;
      const passRate = (passedCount / totalCount) * 100;
      
      console.info('=== Summary ===');
      console.info(`Passed: ${passedCount}/${totalCount} (${passRate.toFixed(1)}%)`);
      console.info('');
      
      // All benchmarks should pass
      expect(passedCount).toBe(totalCount);
    });
  });
});
