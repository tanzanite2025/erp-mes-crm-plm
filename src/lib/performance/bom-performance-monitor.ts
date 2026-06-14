/**
 * BOM Performance Monitor
 *
 * Monitors and records performance metrics for BOM operations.
 * Uses high-precision timing (performance.now()) for accurate measurements.
 *
 * Performance Targets:
 * - Initial render: ≤100ms for 1000 rows
 * - Single field edit: ≤50ms
 * - Commit operation: ≤50ms for 1000 rows with 10% dirty
 * - Active Proxy count: ≤4,000 for 1000 rows
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('BOMPerformanceMonitor')

/**
 * Performance metrics for BOM operations
 */
export interface BOMPerformanceMetrics {
  /**
   * Initial render time (ms)
   */
  initialRenderTime: number

  /**
   * Single field edit time (ms)
   */
  editTime: number

  /**
   * Commit operation time (ms)
   */
  commitTime: number

  /**
   * Active Proxy count
   */
  activeProxyCount: number

  /**
   * Dirty row count
   */
  dirtyRowCount: number

  /**
   * Total row count
   */
  totalRowCount: number

  /**
   * Timestamp when metrics were recorded
   */
  timestamp: number
}

/**
 * Performance threshold configuration
 */
export interface BOMPerformanceThresholds {
  /**
   * Maximum acceptable initial render time (ms)
   */
  maxInitialRenderTime: number

  /**
   * Maximum acceptable edit time (ms)
   */
  maxEditTime: number

  /**
   * Maximum acceptable commit time (ms)
   */
  maxCommitTime: number

  /**
   * Maximum acceptable active Proxy count
   */
  maxActiveProxyCount: number
}

/**
 * Default performance thresholds
 */
export const DEFAULT_BOM_PERFORMANCE_THRESHOLDS: BOMPerformanceThresholds = {
  maxInitialRenderTime: 100, // 100ms for 1000 rows
  maxEditTime: 50, // 50ms for single field edit
  maxCommitTime: 50, // 50ms for commit with 10% dirty
  maxActiveProxyCount: 4000, // 4,000 Proxies for 1000 rows
}

/**
 * Performance status
 */
export type PerformanceStatus = 'excellent' | 'good' | 'warning' | 'critical'

/**
 * Performance metric with status
 */
export interface MetricWithStatus {
  value: number
  threshold: number
  status: PerformanceStatus
  percentage: number // Percentage of threshold used
}

/**
 * BOM Performance Monitor
 *
 * Provides high-precision timing and metrics collection for BOM operations.
 *
 * Features:
 * - High-precision timing using performance.now()
 * - Metrics history tracking
 * - JSON export for automated analysis
 * - Average metrics calculation
 * - Threshold-based status indicators
 */
export class BOMPerformanceMonitor {
  private metrics: BOMPerformanceMetrics[] = []
  private startTimes = new Map<string, number>()
  private thresholds: BOMPerformanceThresholds

  /**
   * Create a new BOM performance monitor
   *
   * @param thresholds - Performance thresholds (optional, uses defaults if not provided)
   */
  constructor(
    thresholds: BOMPerformanceThresholds = DEFAULT_BOM_PERFORMANCE_THRESHOLDS
  ) {
    this.thresholds = thresholds
  }

  /**
   * Start timing an operation
   *
   * @param operation - Operation name (e.g., 'initialRender', 'edit', 'commit')
   */
  startTiming(operation: string): void {
    this.startTimes.set(operation, performance.now())
  }

  /**
   * End timing an operation and return duration
   *
   * @param operation - Operation name
   * @returns Duration in milliseconds, or 0 if operation was not started
   */
  endTiming(operation: string): number {
    const startTime = this.startTimes.get(operation)

    if (startTime === undefined) {
      logger.warn('No start time found for operation', { operation })
      return 0
    }

    const duration = performance.now() - startTime
    this.startTimes.delete(operation)

    return duration
  }

  /**
   * Record a complete metric snapshot
   *
   * @param metrics - Partial metrics to record (missing fields default to 0)
   */
  recordMetrics(metrics: Partial<BOMPerformanceMetrics>): void {
    const completeMetrics: BOMPerformanceMetrics = {
      initialRenderTime: 0,
      editTime: 0,
      commitTime: 0,
      activeProxyCount: 0,
      dirtyRowCount: 0,
      totalRowCount: 0,
      timestamp: Date.now(),
      ...metrics,
    }

    this.metrics.push(completeMetrics)
  }

  /**
   * Get all recorded metrics
   *
   * @returns Array of all recorded metrics
   */
  getMetrics(): BOMPerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * Get the most recent metrics
   *
   * @returns Most recent metrics, or undefined if no metrics recorded
   */
  getLatestMetrics(): BOMPerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1]
  }

  /**
   * Export metrics as JSON string
   *
   * @returns JSON string of all metrics
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2)
  }

  /**
   * Get average metrics across all recordings
   *
   * @returns Average metrics, or undefined if no metrics recorded
   */
  getAverageMetrics(): Partial<BOMPerformanceMetrics> | undefined {
    if (this.metrics.length === 0) {
      return undefined
    }

    const sum = this.metrics.reduce(
      (acc, metric) => ({
        initialRenderTime: acc.initialRenderTime + metric.initialRenderTime,
        editTime: acc.editTime + metric.editTime,
        commitTime: acc.commitTime + metric.commitTime,
        activeProxyCount: acc.activeProxyCount + metric.activeProxyCount,
        dirtyRowCount: acc.dirtyRowCount + metric.dirtyRowCount,
        totalRowCount: acc.totalRowCount + metric.totalRowCount,
      }),
      {
        initialRenderTime: 0,
        editTime: 0,
        commitTime: 0,
        activeProxyCount: 0,
        dirtyRowCount: 0,
        totalRowCount: 0,
      }
    )

    const count = this.metrics.length

    return {
      initialRenderTime: sum.initialRenderTime / count,
      editTime: sum.editTime / count,
      commitTime: sum.commitTime / count,
      activeProxyCount: Math.round(sum.activeProxyCount / count),
      dirtyRowCount: Math.round(sum.dirtyRowCount / count),
      totalRowCount: Math.round(sum.totalRowCount / count),
    }
  }

  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void {
    this.metrics = []
  }

  /**
   * Get metric count
   *
   * @returns Number of recorded metrics
   */
  getMetricCount(): number {
    return this.metrics.length
  }

  /**
   * Get performance status for a metric value
   *
   * @param value - Metric value
   * @param threshold - Threshold value
   * @returns Performance status
   */
  getStatus(value: number, threshold: number): PerformanceStatus {
    const percentage = (value / threshold) * 100

    if (percentage <= 50) {
      return 'excellent'
    } else if (percentage <= 80) {
      return 'good'
    } else if (percentage <= 100) {
      return 'warning'
    } else {
      return 'critical'
    }
  }

  /**
   * Get metric with status
   *
   * @param value - Metric value
   * @param threshold - Threshold value
   * @returns Metric with status information
   */
  getMetricWithStatus(value: number, threshold: number): MetricWithStatus {
    const percentage = (value / threshold) * 100
    const status = this.getStatus(value, threshold)

    return {
      value,
      threshold,
      status,
      percentage,
    }
  }

  /**
   * Get all metrics with status for latest recording
   *
   * @returns Object with all metrics and their status, or undefined if no metrics
   */
  getLatestMetricsWithStatus(): Record<string, MetricWithStatus> | undefined {
    const latest = this.getLatestMetrics()

    if (!latest) {
      return undefined
    }

    return {
      initialRenderTime: this.getMetricWithStatus(
        latest.initialRenderTime,
        this.thresholds.maxInitialRenderTime
      ),
      editTime: this.getMetricWithStatus(
        latest.editTime,
        this.thresholds.maxEditTime
      ),
      commitTime: this.getMetricWithStatus(
        latest.commitTime,
        this.thresholds.maxCommitTime
      ),
      activeProxyCount: this.getMetricWithStatus(
        latest.activeProxyCount,
        this.thresholds.maxActiveProxyCount
      ),
    }
  }

  /**
   * Check if latest metrics meet all thresholds
   *
   * @returns True if all metrics are within thresholds, false otherwise
   */
  meetsThresholds(): boolean {
    const latest = this.getLatestMetrics()

    if (!latest) {
      return false
    }

    return (
      latest.initialRenderTime <= this.thresholds.maxInitialRenderTime &&
      latest.editTime <= this.thresholds.maxEditTime &&
      latest.commitTime <= this.thresholds.maxCommitTime &&
      latest.activeProxyCount <= this.thresholds.maxActiveProxyCount
    )
  }

  /**
   * Get performance summary
   *
   * @returns Summary of performance metrics
   */
  getSummary(): {
    totalRecordings: number
    averageMetrics?: Partial<BOMPerformanceMetrics>
    latestMetrics?: BOMPerformanceMetrics
    meetsThresholds: boolean
  } {
    return {
      totalRecordings: this.metrics.length,
      averageMetrics: this.getAverageMetrics(),
      latestMetrics: this.getLatestMetrics(),
      meetsThresholds: this.meetsThresholds(),
    }
  }

  /**
   * Update performance thresholds
   *
   * @param thresholds - New thresholds (partial update supported)
   */
  updateThresholds(thresholds: Partial<BOMPerformanceThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    }
  }

  /**
   * Get current thresholds
   *
   * @returns Current performance thresholds
   */
  getThresholds(): BOMPerformanceThresholds {
    return { ...this.thresholds }
  }
}

/**
 * Create a new BOM performance monitor with default thresholds
 *
 * @returns New BOMPerformanceMonitor instance
 */
export function createBOMPerformanceMonitor(): BOMPerformanceMonitor {
  return new BOMPerformanceMonitor()
}
