/**
 * VirtualScrollerErrorBoundary Component
 *
 * React Error Boundary for BOM Virtual Scroller.
 * Catches errors during rendering and provides fallback UI.
 *
 * Features:
 * - Catches rendering errors in virtual scroller
 * - Displays user-friendly error message
 * - Provides retry functionality
 * - Logs errors for debugging
 */

'use client'

import React, { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { logError } from '@/lib/delta/errors'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Props for VirtualScrollerErrorBoundary
 */
export interface VirtualScrollerErrorBoundaryProps {
  /**
   * Child components to render
   */
  children: ReactNode

  /**
   * Fallback UI to render when error occurs (optional)
   */
  fallback?: ReactNode

  /**
   * Callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void

  /**
   * Callback when user clicks retry
   */
  onRetry?: () => void

  /**
   * Custom error message
   */
  errorMessage?: string

  /**
   * Show retry button (default: true)
   */
  showRetry?: boolean
}

/**
 * State for VirtualScrollerErrorBoundary
 */
interface VirtualScrollerErrorBoundaryState {
  /**
   * Whether an error has occurred
   */
  hasError: boolean

  /**
   * The error that occurred
   */
  error?: Error

  /**
   * Error info from React
   */
  errorInfo?: React.ErrorInfo
}

/**
 * VirtualScrollerErrorBoundary Component
 *
 * Catches errors in BOM virtual scroller and provides fallback UI.
 */
export class VirtualScrollerErrorBoundary extends Component<
  VirtualScrollerErrorBoundaryProps,
  VirtualScrollerErrorBoundaryState
> {
  constructor(props: VirtualScrollerErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
    }
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(
    error: Error
  ): VirtualScrollerErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error when it occurs
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with diagnostic information
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'VirtualScrollerErrorBoundary',
    })

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Update state with error info
    this.setState({
      errorInfo,
    })
  }

  /**
   * Handle retry button click
   */
  handleRetry = (): void => {
    // Call onRetry callback if provided
    this.props.onRetry?.()

    // Reset error state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    })
  }

  /**
   * Render fallback UI when error occurs
   */
  renderFallback(): ReactNode {
    const { fallback, errorMessage, showRetry = true } = this.props
    const { error } = this.state

    // Use custom fallback if provided
    if (fallback) {
      return fallback
    }

    // Default fallback UI
    return (
      <div className='flex min-h-[400px] items-center justify-center p-8'>
        <Alert variant='destructive' className='max-w-2xl'>
          <AlertCircle className='h-5 w-5' />
          <AlertTitle className='mb-2 text-lg font-semibold'>
            虚拟滚动加载失败
          </AlertTitle>
          <AlertDescription className='space-y-4'>
            <p className='text-sm'>
              {errorMessage ||
                '渲染 BOM 表格时发生错误。请尝试刷新页面或联系技术支持。'}
            </p>

            {error && (
              <details className='text-xs'>
                <summary className='mb-2 cursor-pointer font-medium'>
                  错误详情
                </summary>
                <pre className='max-h-40 overflow-auto rounded bg-muted p-3'>
                  {error.message}
                  {'\n\n'}
                  {error.stack}
                </pre>
              </details>
            )}

            {showRetry && (
              <div className='flex gap-2 pt-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={this.handleRetry}
                  className='gap-2'
                >
                  <RefreshCw className='h-4 w-4' />
                  重试
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => window.location.reload()}
                  className='gap-2'
                >
                  刷新页面
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.renderFallback()
    }

    return this.props.children
  }
}

/**
 * Hook to use VirtualScrollerErrorBoundary programmatically
 */
export function useVirtualScrollerErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const catchError = React.useCallback((error: Error) => {
    setError(error)
    logError(error, {
      source: 'useVirtualScrollerErrorBoundary',
    })
  }, [])

  return {
    error,
    hasError: error !== null,
    resetError,
    catchError,
  }
}

/**
 * Higher-order component to wrap component with error boundary
 */
export function withVirtualScrollerErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<VirtualScrollerErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <VirtualScrollerErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </VirtualScrollerErrorBoundary>
    )
  }
}

/**
 * Compact error display for inline errors
 */
export interface CompactErrorDisplayProps {
  error: Error
  onRetry?: () => void
  className?: string
}

export function CompactErrorDisplay({
  error,
  onRetry,
  className,
}: CompactErrorDisplayProps) {
  return (
    <div
      className={`flex items-center gap-2 text-sm text-destructive ${className || ''}`}
    >
      <AlertCircle className='h-4 w-4 flex-shrink-0' />
      <span className='min-w-0 flex-1 truncate'>{error.message}</span>
      {onRetry && (
        <Button
          variant='ghost'
          size='sm'
          onClick={onRetry}
          className='h-6 gap-1 px-2'
        >
          <RefreshCw className='h-3 w-3' />
          重试
        </Button>
      )}
    </div>
  )
}
