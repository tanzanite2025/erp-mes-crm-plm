/**
 * BOM Performance Dashboard Component
 *
 * Displays real-time performance metrics for BOM operations.
 *
 * Features:
 * - Real-time metric display (initial render, edit, commit times)
 * - Active Proxy count and dirty row count
 * - Performance threshold indicators (green/yellow/red)
 * - Metric export functionality
 *
 * Performance Targets:
 * - Initial render: ≤100ms for 1000 rows
 * - Single field edit: ≤50ms
 * - Commit operation: ≤50ms for 1000 rows with 10% dirty
 */

'use client'

import { useMemo } from 'react'
import { Download, Activity, Clock, Database, Edit, Save } from 'lucide-react'
import {
  type BOMPerformanceMonitor,
  type PerformanceStatus,
} from '@/lib/performance/bom-performance-monitor'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

/**
 * Props for BOMPerformanceDashboard component
 */
export interface BOMPerformanceDashboardProps {
  /**
   * BOM performance monitor instance
   */
  monitor: BOMPerformanceMonitor

  /**
   * Custom className
   */
  className?: string

  /**
   * Show detailed metrics (default: true)
   */
  showDetails?: boolean

  /**
   * Show export button (default: true)
   */
  showExport?: boolean
}

/**
 * Get status color based on performance status
 */
function getStatusColor(status: PerformanceStatus): string {
  switch (status) {
    case 'excellent':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'good':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Get status label
 */
function getStatusLabel(status: PerformanceStatus): string {
  switch (status) {
    case 'excellent':
      return '优秀'
    case 'good':
      return '良好'
    case 'warning':
      return '警告'
    case 'critical':
      return '严重'
    default:
      return '未知'
  }
}

/**
 * Format time in milliseconds
 */
function formatTime(ms: number): string {
  if (ms < 1) {
    return '<1ms'
  }
  return `${ms.toFixed(1)}ms`
}

/**
 * Format number with thousands separator
 */
function formatNumber(num: number): string {
  return num.toLocaleString('zh-CN')
}

/**
 * Metric Card Component
 */
interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string
  threshold?: string
  status?: PerformanceStatus
  percentage?: number
}

function MetricCard({
  icon,
  label,
  value,
  threshold,
  status,
  percentage,
}: MetricCardProps) {
  return (
    <div className='flex items-start gap-3 rounded-lg border bg-card p-4'>
      <div className='mt-1 flex-shrink-0'>{icon}</div>
      <div className='min-w-0 flex-1'>
        <div className='mb-1 text-sm text-muted-foreground'>{label}</div>
        <div className='mb-2 text-2xl font-semibold'>{value}</div>
        {threshold && status && (
          <div className='flex items-center gap-2'>
            <Badge
              variant='outline'
              className={cn('text-xs', getStatusColor(status))}
            >
              {getStatusLabel(status)}
            </Badge>
            {percentage !== undefined && (
              <span className='text-xs text-muted-foreground'>
                {percentage.toFixed(0)}% of {threshold}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * BOM Performance Dashboard Component
 *
 * Displays real-time performance metrics with threshold indicators.
 */
export function BOMPerformanceDashboard({
  monitor,
  className,
  showDetails = true,
  showExport = true,
}: BOMPerformanceDashboardProps) {
  // Get latest metrics with status
  const metricsWithStatus = useMemo(() => {
    return monitor.getLatestMetricsWithStatus()
  }, [monitor])

  // Get latest metrics
  const latestMetrics = useMemo(() => {
    return monitor.getLatestMetrics()
  }, [monitor])

  // Get average metrics
  const averageMetrics = useMemo(() => {
    return monitor.getAverageMetrics()
  }, [monitor])

  // Check if meets thresholds
  const meetsThresholds = useMemo(() => {
    return monitor.meetsThresholds()
  }, [monitor])

  // Handle export
  const handleExport = () => {
    const json = monitor.exportMetrics()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bom-performance-metrics-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // No metrics recorded yet
  if (!latestMetrics || !metricsWithStatus) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Activity className='h-5 w-5' />
            性能监控
          </CardTitle>
          <CardDescription>暂无性能数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='py-8 text-center text-muted-foreground'>
            开始使用 BOM 表格以收集性能指标
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              性能监控
            </CardTitle>
            <CardDescription>
              实时性能指标 · {monitor.getMetricCount()} 次记录
            </CardDescription>
          </div>
          {showExport && (
            <Button
              variant='outline'
              size='sm'
              onClick={handleExport}
              className='gap-2'
            >
              <Download className='h-4 w-4' />
              导出数据
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Overall Status */}
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>整体状态:</span>
          <Badge
            variant={meetsThresholds ? 'default' : 'destructive'}
            className='gap-1'
          >
            {meetsThresholds ? (
              <>
                <span className='h-2 w-2 rounded-full bg-green-500' />
                达标
              </>
            ) : (
              <>
                <span className='h-2 w-2 rounded-full bg-red-500' />
                超标
              </>
            )}
          </Badge>
        </div>

        {/* Performance Metrics Grid */}
        {showDetails && (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {/* Initial Render Time */}
            <MetricCard
              icon={<Clock className='h-5 w-5 text-blue-600' />}
              label='初始渲染时间'
              value={formatTime(latestMetrics.initialRenderTime)}
              threshold={formatTime(
                metricsWithStatus.initialRenderTime.threshold
              )}
              status={metricsWithStatus.initialRenderTime.status}
              percentage={metricsWithStatus.initialRenderTime.percentage}
            />

            {/* Edit Time */}
            <MetricCard
              icon={<Edit className='h-5 w-5 text-green-600' />}
              label='编辑操作时间'
              value={formatTime(latestMetrics.editTime)}
              threshold={formatTime(metricsWithStatus.editTime.threshold)}
              status={metricsWithStatus.editTime.status}
              percentage={metricsWithStatus.editTime.percentage}
            />

            {/* Commit Time */}
            <MetricCard
              icon={<Save className='h-5 w-5 text-purple-600' />}
              label='提交操作时间'
              value={formatTime(latestMetrics.commitTime)}
              threshold={formatTime(metricsWithStatus.commitTime.threshold)}
              status={metricsWithStatus.commitTime.status}
              percentage={metricsWithStatus.commitTime.percentage}
            />

            {/* Active Proxy Count */}
            <MetricCard
              icon={<Database className='h-5 w-5 text-amber-600' />}
              label='活跃 Proxy 数量'
              value={formatNumber(latestMetrics.activeProxyCount)}
              threshold={formatNumber(
                metricsWithStatus.activeProxyCount.threshold
              )}
              status={metricsWithStatus.activeProxyCount.status}
              percentage={metricsWithStatus.activeProxyCount.percentage}
            />
          </div>
        )}

        {/* Additional Info */}
        <div className='grid grid-cols-2 gap-4 border-t pt-4'>
          <div>
            <div className='mb-1 text-sm text-muted-foreground'>脏行数</div>
            <div className='text-lg font-semibold'>
              {formatNumber(latestMetrics.dirtyRowCount)}
            </div>
          </div>
          <div>
            <div className='mb-1 text-sm text-muted-foreground'>总行数</div>
            <div className='text-lg font-semibold'>
              {formatNumber(latestMetrics.totalRowCount)}
            </div>
          </div>
        </div>

        {/* Average Metrics */}
        {averageMetrics && monitor.getMetricCount() > 1 && (
          <div className='border-t pt-4'>
            <div className='mb-3 text-sm font-medium'>平均性能指标</div>
            <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
              <div>
                <div className='mb-1 text-muted-foreground'>渲染</div>
                <div className='font-medium'>
                  {formatTime(averageMetrics.initialRenderTime || 0)}
                </div>
              </div>
              <div>
                <div className='mb-1 text-muted-foreground'>编辑</div>
                <div className='font-medium'>
                  {formatTime(averageMetrics.editTime || 0)}
                </div>
              </div>
              <div>
                <div className='mb-1 text-muted-foreground'>提交</div>
                <div className='font-medium'>
                  {formatTime(averageMetrics.commitTime || 0)}
                </div>
              </div>
              <div>
                <div className='mb-1 text-muted-foreground'>Proxy</div>
                <div className='font-medium'>
                  {formatNumber(averageMetrics.activeProxyCount || 0)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact version of BOM Performance Dashboard
 *
 * Shows only essential metrics in a compact format.
 */
export function BOMPerformanceDashboardCompact({
  monitor,
  className,
}: Pick<BOMPerformanceDashboardProps, 'monitor' | 'className'>) {
  const meetsThresholds = useMemo(() => {
    return monitor.meetsThresholds()
  }, [monitor])

  const latestMetrics = useMemo(() => {
    return monitor.getLatestMetrics()
  }, [monitor])

  if (!latestMetrics) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <Badge
        variant={meetsThresholds ? 'default' : 'destructive'}
        className='gap-1'
      >
        <Activity className='h-3 w-3' />
        {meetsThresholds ? '达标' : '超标'}
      </Badge>

      <div className='flex items-center gap-1 text-muted-foreground'>
        <Clock className='h-3 w-3' />
        {formatTime(latestMetrics.initialRenderTime)}
      </div>

      <div className='flex items-center gap-1 text-muted-foreground'>
        <Edit className='h-3 w-3' />
        {formatTime(latestMetrics.editTime)}
      </div>

      <div className='flex items-center gap-1 text-muted-foreground'>
        <Save className='h-3 w-3' />
        {formatTime(latestMetrics.commitTime)}
      </div>

      <div className='flex items-center gap-1 text-muted-foreground'>
        <Database className='h-3 w-3' />
        {formatNumber(latestMetrics.activeProxyCount)}
      </div>
    </div>
  )
}
