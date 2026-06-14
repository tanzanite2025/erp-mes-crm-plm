/**
 * Error Classes and Handlers for BOM Delta System
 *
 * Provides specialized error classes with diagnostic information
 * and error recovery strategies for the BOM performance optimization system.
 *
 * Error Recovery Strategies:
 * - Graceful degradation: Fall back to full diff on error
 * - Local state persistence: Save state before risky operations
 * - Retry logic: Exponential backoff for transient errors
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('BOMDeltaErrors')

/**
 * Base error class for BOM delta system
 */
export class BOMDeltaError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: string

  /**
   * Timestamp when error occurred
   */
  public readonly timestamp: number

  /**
   * Additional diagnostic context
   */
  public readonly context?: Record<string, unknown>

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'BOMDeltaError'
    this.code = code
    this.timestamp = Date.now()
    this.context = context

    // Maintain proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Convert error to JSON for logging/reporting
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    }
  }
}

/**
 * Error thrown by DiffEngine during delta calculation
 */
export class DiffEngineError extends BOMDeltaError {
  /**
   * Number of rows being processed when error occurred
   */
  public readonly rowCount?: number

  /**
   * Row ID where error occurred (if applicable)
   */
  public readonly rowId?: string

  /**
   * Field name where error occurred (if applicable)
   */
  public readonly fieldName?: string

  constructor(
    message: string,
    code: string,
    context?: {
      rowCount?: number
      rowId?: string
      fieldName?: string
      [key: string]: unknown
    }
  ) {
    super(message, code, context)
    this.name = 'DiffEngineError'
    this.rowCount = context?.rowCount
    this.rowId = context?.rowId
    this.fieldName = context?.fieldName
  }
}

/**
 * Error thrown by ProxyTracker during Proxy operations
 */
export class ProxyTrackerError extends BOMDeltaError {
  /**
   * Operation being performed when error occurred
   */
  public readonly operation: 'create' | 'commit' | 'release' | 'get'

  /**
   * Row ID being operated on
   */
  public readonly rowId?: string

  /**
   * Number of active Proxies when error occurred
   */
  public readonly activeProxyCount?: number

  constructor(
    message: string,
    code: string,
    operation: 'create' | 'commit' | 'release' | 'get',
    context?: {
      rowId?: string
      activeProxyCount?: number
      [key: string]: unknown
    }
  ) {
    super(message, code, context)
    this.name = 'ProxyTrackerError'
    this.operation = operation
    this.rowId = context?.rowId
    this.activeProxyCount = context?.activeProxyCount
  }
}

/**
 * Error thrown by VirtualScroller
 */
export class VirtualScrollerError extends BOMDeltaError {
  /**
   * Scroll position when error occurred
   */
  public readonly scrollPosition?: number

  /**
   * Number of visible rows when error occurred
   */
  public readonly visibleRowCount?: number

  constructor(
    message: string,
    code: string,
    context?: {
      scrollPosition?: number
      visibleRowCount?: number
      [key: string]: unknown
    }
  ) {
    super(message, code, context)
    this.name = 'VirtualScrollerError'
    this.scrollPosition = context?.scrollPosition
    this.visibleRowCount = context?.visibleRowCount
  }
}

/**
 * Error recovery strategy configuration
 */
export interface ErrorRecoveryConfig {
  /**
   * Enable graceful degradation (fallback to full diff)
   */
  enableGracefulDegradation?: boolean

  /**
   * Enable local state persistence
   */
  enableStatePersistence?: boolean

  /**
   * Enable retry logic
   */
  enableRetry?: boolean

  /**
   * Maximum retry attempts
   */
  maxRetries?: number

  /**
   * Initial retry delay (ms)
   */
  initialRetryDelay?: number

  /**
   * Maximum retry delay (ms)
   */
  maxRetryDelay?: number

  /**
   * Retry backoff multiplier
   */
  retryBackoffMultiplier?: number
}

/**
 * Default error recovery configuration
 */
export const DEFAULT_ERROR_RECOVERY_CONFIG: Required<ErrorRecoveryConfig> = {
  enableGracefulDegradation: true,
  enableStatePersistence: true,
  enableRetry: true,
  maxRetries: 3,
  initialRetryDelay: 100,
  maxRetryDelay: 5000,
  retryBackoffMultiplier: 2,
}

/**
 * Error recovery handler
 */
export class ErrorRecoveryHandler {
  private config: Required<ErrorRecoveryConfig>
  private stateBackup: Map<string, unknown> = new Map()

  constructor(config: ErrorRecoveryConfig = {}) {
    this.config = {
      ...DEFAULT_ERROR_RECOVERY_CONFIG,
      ...config,
    }
  }

  /**
   * Save state before risky operation
   */
  saveState(key: string, state: unknown): void {
    if (!this.config.enableStatePersistence) {
      return
    }

    this.stateBackup.set(key, state)
  }

  /**
   * Restore state after error
   */
  restoreState<T>(key: string): T | undefined {
    if (!this.config.enableStatePersistence) {
      return undefined
    }

    return this.stateBackup.get(key) as T | undefined
  }

  /**
   * Clear saved state
   */
  clearState(key: string): void {
    this.stateBackup.delete(key)
  }

  /**
   * Clear all saved states
   */
  clearAllStates(): void {
    this.stateBackup.clear()
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return operation()
    }

    let lastError: Error | undefined
    let delay = this.config.initialRetryDelay

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break
        }

        logger.warn('Operation failed; retrying', {
          operationName,
          attempt: attempt + 1,
          maxAttempts: this.config.maxRetries + 1,
          message: lastError.message,
        })

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay))

        // Increase delay for next retry
        delay = Math.min(
          delay * this.config.retryBackoffMultiplier,
          this.config.maxRetryDelay
        )
      }
    }

    // All retries failed
    throw new BOMDeltaError(
      `Operation '${operationName}' failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`,
      'RETRY_EXHAUSTED',
      {
        operationName,
        attempts: this.config.maxRetries + 1,
        lastError: lastError?.message,
      }
    )
  }

  /**
   * Execute operation with graceful degradation
   * Falls back to fallback function if operation fails
   */
  async withGracefulDegradation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.config.enableGracefulDegradation) {
      return operation()
    }

    try {
      return await operation()
    } catch (error) {
      logger.warn('Operation failed, falling back to safe mode', {
        operationName,
        message: error instanceof Error ? error.message : String(error),
      })

      return fallback()
    }
  }

  /**
   * Execute operation with full error recovery
   * Combines state persistence, retry logic, and graceful degradation
   */
  async withFullRecovery<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    operationName: string,
    stateKey?: string,
    currentState?: unknown
  ): Promise<T> {
    // Save state if provided
    if (stateKey && currentState !== undefined) {
      this.saveState(stateKey, currentState)
    }

    try {
      // Try operation with retry
      const result = await this.withRetry(operation, operationName)

      // Clear saved state on success
      if (stateKey) {
        this.clearState(stateKey)
      }

      return result
    } catch (error) {
      // Restore state if available
      if (stateKey) {
        const restoredState = this.restoreState(stateKey)
        if (restoredState !== undefined) {
          logger.info('Restored state after error', { stateKey })
        }
      }

      // Fall back to safe mode
      return this.withGracefulDegradation(
        async () => {
          throw error
        },
        fallback,
        operationName
      )
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorRecoveryConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ErrorRecoveryConfig> {
    return { ...this.config }
  }
}

/**
 * Create a new error recovery handler with default configuration
 */
export function createErrorRecoveryHandler(
  config?: ErrorRecoveryConfig
): ErrorRecoveryHandler {
  return new ErrorRecoveryHandler(config)
}

/**
 * Check if error is a BOM delta error
 */
export function isBOMDeltaError(error: unknown): error is BOMDeltaError {
  return error instanceof BOMDeltaError
}

/**
 * Check if error is a DiffEngine error
 */
export function isDiffEngineError(error: unknown): error is DiffEngineError {
  return error instanceof DiffEngineError
}

/**
 * Check if error is a ProxyTracker error
 */
export function isProxyTrackerError(
  error: unknown
): error is ProxyTrackerError {
  return error instanceof ProxyTrackerError
}

/**
 * Check if error is a VirtualScroller error
 */
export function isVirtualScrollerError(
  error: unknown
): error is VirtualScrollerError {
  return error instanceof VirtualScrollerError
}

/**
 * Format error for display to user
 */
export function formatErrorForUser(error: unknown): string {
  if (isBOMDeltaError(error)) {
    return `操作失败: ${error.message}`
  }

  if (error instanceof Error) {
    return `发生错误: ${error.message}`
  }

  return '发生未知错误'
}

/**
 * Log error with diagnostic information
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  if (isBOMDeltaError(error)) {
    logger.error('BOM Delta Error', {
      ...error.toJSON(),
      additionalContext: context,
    })
  } else if (error instanceof Error) {
    logger.error('Error', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    })
  } else {
    logger.error('Unknown Error', {
      error: String(error),
      context,
    })
  }
}
