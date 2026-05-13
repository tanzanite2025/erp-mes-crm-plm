/**
 * Unit Tests for BOMPerformanceMonitor
 * 
 * Tests timing operations, metrics recording, JSON export, and threshold checking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BOMPerformanceMonitor,
  createBOMPerformanceMonitor,
  DEFAULT_BOM_PERFORMANCE_THRESHOLDS,
  type BOMPerformanceMetrics,
  type BOMPerformanceThresholds,
} from './bom-performance-monitor';

describe('BOMPerformanceMonitor', () => {
  let monitor: BOMPerformanceMonitor;
  
  beforeEach(() => {
    monitor = new BOMPerformanceMonitor();
  });
  
  describe('Constructor', () => {
    it('should create monitor with default thresholds', () => {
      const monitor = new BOMPerformanceMonitor();
      const thresholds = monitor.getThresholds();
      
      expect(thresholds).toEqual(DEFAULT_BOM_PERFORMANCE_THRESHOLDS);
    });
    
    it('should create monitor with custom thresholds', () => {
      const customThresholds: BOMPerformanceThresholds = {
        maxInitialRenderTime: 200,
        maxEditTime: 100,
        maxCommitTime: 100,
        maxActiveProxyCount: 5000,
      };
      
      const monitor = new BOMPerformanceMonitor(customThresholds);
      const thresholds = monitor.getThresholds();
      
      expect(thresholds).toEqual(customThresholds);
    });
  });
  
  describe('Timing Operations', () => {
    it('should start and end timing correctly', () => {
      monitor.startTiming('test-operation');
      
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait ~10ms
      }
      
      const duration = monitor.endTiming('test-operation');
      
      expect(duration).toBeGreaterThanOrEqual(10);
      expect(duration).toBeLessThan(100); // Should be much less than 100ms
    });
    
    it('should return 0 for operation that was not started', () => {
      const duration = monitor.endTiming('non-existent-operation');
      
      expect(duration).toBe(0);
    });
    
    it('should handle multiple concurrent timings', () => {
      monitor.startTiming('operation-1');
      monitor.startTiming('operation-2');
      
      const duration1 = monitor.endTiming('operation-1');
      const duration2 = monitor.endTiming('operation-2');
      
      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
    });
    
    it('should clear start time after ending timing', () => {
      monitor.startTiming('test-operation');
      monitor.endTiming('test-operation');
      
      // Try to end again
      const duration = monitor.endTiming('test-operation');
      
      expect(duration).toBe(0);
    });
  });
  
  describe('Metrics Recording', () => {
    it('should record complete metrics', () => {
      const metrics: BOMPerformanceMetrics = {
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      };
      
      monitor.recordMetrics(metrics);
      
      const recorded = monitor.getLatestMetrics();
      expect(recorded).toEqual(metrics);
    });
    
    it('should record partial metrics with defaults', () => {
      const partialMetrics: Partial<BOMPerformanceMetrics> = {
        initialRenderTime: 80,
        activeProxyCount: 3000,
      };
      
      monitor.recordMetrics(partialMetrics);
      
      const recorded = monitor.getLatestMetrics();
      expect(recorded?.initialRenderTime).toBe(80);
      expect(recorded?.activeProxyCount).toBe(3000);
      expect(recorded?.editTime).toBe(0);
      expect(recorded?.commitTime).toBe(0);
      expect(recorded?.dirtyRowCount).toBe(0);
      expect(recorded?.totalRowCount).toBe(0);
      expect(recorded?.timestamp).toBeDefined();
    });
    
    it('should record multiple metrics', () => {
      monitor.recordMetrics({ initialRenderTime: 80 });
      monitor.recordMetrics({ initialRenderTime: 90 });
      monitor.recordMetrics({ initialRenderTime: 85 });
      
      const allMetrics = monitor.getMetrics();
      expect(allMetrics).toHaveLength(3);
      expect(allMetrics[0].initialRenderTime).toBe(80);
      expect(allMetrics[1].initialRenderTime).toBe(90);
      expect(allMetrics[2].initialRenderTime).toBe(85);
    });
  });
  
  describe('Metrics Retrieval', () => {
    it('should get all metrics', () => {
      monitor.recordMetrics({ initialRenderTime: 80 });
      monitor.recordMetrics({ initialRenderTime: 90 });
      
      const allMetrics = monitor.getMetrics();
      expect(allMetrics).toHaveLength(2);
    });
    
    it('should get latest metrics', () => {
      monitor.recordMetrics({ initialRenderTime: 80 });
      monitor.recordMetrics({ initialRenderTime: 90 });
      
      const latest = monitor.getLatestMetrics();
      expect(latest?.initialRenderTime).toBe(90);
    });
    
    it('should return undefined when no metrics recorded', () => {
      const latest = monitor.getLatestMetrics();
      expect(latest).toBeUndefined();
    });
    
    it('should get metric count', () => {
      expect(monitor.getMetricCount()).toBe(0);
      
      monitor.recordMetrics({ initialRenderTime: 80 });
      expect(monitor.getMetricCount()).toBe(1);
      
      monitor.recordMetrics({ initialRenderTime: 90 });
      expect(monitor.getMetricCount()).toBe(2);
    });
  });
  
  describe('Metrics Export', () => {
    it('should export metrics as JSON', () => {
      monitor.recordMetrics({ initialRenderTime: 80, activeProxyCount: 3000 });
      monitor.recordMetrics({ initialRenderTime: 90, activeProxyCount: 3500 });
      
      const json = monitor.exportMetrics();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].initialRenderTime).toBe(80);
      expect(parsed[1].initialRenderTime).toBe(90);
    });
    
    it('should export empty array when no metrics', () => {
      const json = monitor.exportMetrics();
      const parsed = JSON.parse(json);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });
  });
  
  describe('Average Metrics', () => {
    it('should calculate average metrics', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      monitor.recordMetrics({
        initialRenderTime: 100,
        editTime: 50,
        commitTime: 60,
        activeProxyCount: 4000,
        dirtyRowCount: 200,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const average = monitor.getAverageMetrics();
      
      expect(average?.initialRenderTime).toBe(90);
      expect(average?.editTime).toBe(40);
      expect(average?.commitTime).toBe(50);
      expect(average?.activeProxyCount).toBe(3500);
      expect(average?.dirtyRowCount).toBe(150);
      expect(average?.totalRowCount).toBe(1000);
    });
    
    it('should return undefined when no metrics recorded', () => {
      const average = monitor.getAverageMetrics();
      expect(average).toBeUndefined();
    });
    
    it('should round integer values in average', () => {
      monitor.recordMetrics({ activeProxyCount: 3001 });
      monitor.recordMetrics({ activeProxyCount: 3002 });
      
      const average = monitor.getAverageMetrics();
      
      // Average of 3001 and 3002 is 3001.5, should be rounded
      expect(Number.isInteger(average?.activeProxyCount)).toBe(true);
    });
  });
  
  describe('Metrics Clearing', () => {
    it('should clear all metrics', () => {
      monitor.recordMetrics({ initialRenderTime: 80 });
      monitor.recordMetrics({ initialRenderTime: 90 });
      
      expect(monitor.getMetricCount()).toBe(2);
      
      monitor.clearMetrics();
      
      expect(monitor.getMetricCount()).toBe(0);
      expect(monitor.getLatestMetrics()).toBeUndefined();
    });
  });
  
  describe('Performance Status', () => {
    it('should return excellent status for value ≤50% of threshold', () => {
      const status = monitor.getStatus(25, 100);
      expect(status).toBe('excellent');
    });
    
    it('should return good status for value ≤80% of threshold', () => {
      const status = monitor.getStatus(60, 100);
      expect(status).toBe('good');
    });
    
    it('should return warning status for value ≤100% of threshold', () => {
      const status = monitor.getStatus(90, 100);
      expect(status).toBe('warning');
    });
    
    it('should return critical status for value >100% of threshold', () => {
      const status = monitor.getStatus(120, 100);
      expect(status).toBe('critical');
    });
  });
  
  describe('Metric With Status', () => {
    it('should return metric with status information', () => {
      const metricWithStatus = monitor.getMetricWithStatus(60, 100);
      
      expect(metricWithStatus.value).toBe(60);
      expect(metricWithStatus.threshold).toBe(100);
      expect(metricWithStatus.status).toBe('good');
      expect(metricWithStatus.percentage).toBe(60);
    });
    
    it('should calculate percentage correctly', () => {
      const metricWithStatus = monitor.getMetricWithStatus(75, 100);
      
      expect(metricWithStatus.percentage).toBe(75);
    });
  });
  
  describe('Latest Metrics With Status', () => {
    it('should return all metrics with status', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const metricsWithStatus = monitor.getLatestMetricsWithStatus();
      
      expect(metricsWithStatus).toBeDefined();
      expect(metricsWithStatus?.initialRenderTime).toBeDefined();
      expect(metricsWithStatus?.editTime).toBeDefined();
      expect(metricsWithStatus?.commitTime).toBeDefined();
      expect(metricsWithStatus?.activeProxyCount).toBeDefined();
      
      // Check status for initialRenderTime (80ms vs 100ms threshold = 80%, which is "good")
      expect(metricsWithStatus?.initialRenderTime.value).toBe(80);
      expect(metricsWithStatus?.initialRenderTime.threshold).toBe(100);
      expect(metricsWithStatus?.initialRenderTime.status).toBe('good');
    });
    
    it('should return undefined when no metrics recorded', () => {
      const metricsWithStatus = monitor.getLatestMetricsWithStatus();
      expect(metricsWithStatus).toBeUndefined();
    });
  });
  
  describe('Threshold Checking', () => {
    it('should return true when all metrics meet thresholds', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(true);
    });
    
    it('should return false when initialRenderTime exceeds threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 120, // Exceeds 100ms threshold
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(false);
    });
    
    it('should return false when editTime exceeds threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 60, // Exceeds 50ms threshold
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(false);
    });
    
    it('should return false when commitTime exceeds threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 60, // Exceeds 50ms threshold
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(false);
    });
    
    it('should return false when activeProxyCount exceeds threshold', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 5000, // Exceeds 4000 threshold
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(false);
    });
    
    it('should return false when no metrics recorded', () => {
      const meetsThresholds = monitor.meetsThresholds();
      expect(meetsThresholds).toBe(false);
    });
  });
  
  describe('Performance Summary', () => {
    it('should return complete summary', () => {
      monitor.recordMetrics({
        initialRenderTime: 80,
        editTime: 30,
        commitTime: 40,
        activeProxyCount: 3000,
        dirtyRowCount: 100,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      monitor.recordMetrics({
        initialRenderTime: 90,
        editTime: 40,
        commitTime: 45,
        activeProxyCount: 3500,
        dirtyRowCount: 150,
        totalRowCount: 1000,
        timestamp: Date.now(),
      });
      
      const summary = monitor.getSummary();
      
      expect(summary.totalRecordings).toBe(2);
      expect(summary.averageMetrics).toBeDefined();
      expect(summary.latestMetrics).toBeDefined();
      expect(summary.meetsThresholds).toBe(true);
    });
    
    it('should return summary with no metrics', () => {
      const summary = monitor.getSummary();
      
      expect(summary.totalRecordings).toBe(0);
      expect(summary.averageMetrics).toBeUndefined();
      expect(summary.latestMetrics).toBeUndefined();
      expect(summary.meetsThresholds).toBe(false);
    });
  });
  
  describe('Threshold Management', () => {
    it('should update thresholds', () => {
      monitor.updateThresholds({
        maxInitialRenderTime: 200,
      });
      
      const thresholds = monitor.getThresholds();
      expect(thresholds.maxInitialRenderTime).toBe(200);
      expect(thresholds.maxEditTime).toBe(50); // Unchanged
    });
    
    it('should support partial threshold updates', () => {
      monitor.updateThresholds({
        maxInitialRenderTime: 200,
        maxEditTime: 100,
      });
      
      const thresholds = monitor.getThresholds();
      expect(thresholds.maxInitialRenderTime).toBe(200);
      expect(thresholds.maxEditTime).toBe(100);
      expect(thresholds.maxCommitTime).toBe(50); // Unchanged
      expect(thresholds.maxActiveProxyCount).toBe(4000); // Unchanged
    });
    
    it('should get current thresholds', () => {
      const thresholds = monitor.getThresholds();
      
      expect(thresholds).toEqual(DEFAULT_BOM_PERFORMANCE_THRESHOLDS);
    });
  });
  
  describe('Factory Function', () => {
    it('should create monitor with default thresholds', () => {
      const monitor = createBOMPerformanceMonitor();
      const thresholds = monitor.getThresholds();
      
      expect(thresholds).toEqual(DEFAULT_BOM_PERFORMANCE_THRESHOLDS);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      monitor.recordMetrics({
        initialRenderTime: 0,
        editTime: 0,
        commitTime: 0,
        activeProxyCount: 0,
        dirtyRowCount: 0,
        totalRowCount: 0,
        timestamp: Date.now(),
      });
      
      const latest = monitor.getLatestMetrics();
      expect(latest?.initialRenderTime).toBe(0);
    });
    
    it('should handle very large values', () => {
      monitor.recordMetrics({
        initialRenderTime: 10000,
        editTime: 5000,
        commitTime: 8000,
        activeProxyCount: 100000,
        dirtyRowCount: 50000,
        totalRowCount: 100000,
        timestamp: Date.now(),
      });
      
      const latest = monitor.getLatestMetrics();
      expect(latest?.initialRenderTime).toBe(10000);
    });
    
    it('should handle negative threshold (edge case)', () => {
      const status = monitor.getStatus(50, -100);
      // Negative threshold results in negative percentage, which is ≤50%, so "excellent"
      expect(status).toBe('excellent');
    });
  });
});
