/**
 * Virtual Scroller Configuration for BOM Table
 *
 * This module provides optimized configuration for the TanStack Virtual-based
 * BOM table component to achieve smooth scrolling performance with large datasets.
 *
 * @module virtual-scroller-config
 */

/**
 * Configuration interface for BOM virtual scroller
 *
 * These settings control the virtual scrolling behavior to optimize
 * rendering performance for large BOM datasets (500-2000+ rows).
 */
export interface BOMVirtualScrollerConfig {
  /**
   * Number of rows to render above and below the visible viewport
   *
   * Higher values provide smoother scrolling but increase memory usage.
   * Recommended range: 5-10 rows
   *
   * @default 5
   */
  overscan: number

  /**
   * Estimated row height in pixels
   *
   * Used for initial render before actual measurements are available.
   * Should match the typical BOM row height for accurate scroll positioning.
   *
   * @default 48
   */
  estimateSize: number

  /**
   * Enable dynamic row height measurement
   *
   * When true, the virtual scroller will measure actual row heights
   * and adjust positioning accordingly. Required for rows with varying content.
   *
   * @default true
   */
  enableDynamicSize: boolean

  /**
   * Scroll event throttle delay in milliseconds
   *
   * Controls how frequently scroll events are processed.
   * 16ms = ~60 FPS, 8ms = ~120 FPS
   *
   * @default 16
   */
  scrollThrottle: number
}

/**
 * Default virtual scroller configuration optimized for BOM performance
 *
 * These values are tuned to achieve:
 * - 60 FPS scrolling performance
 * - Smooth scroll experience with minimal jank
 * - Efficient memory usage
 * - Support for dynamic row heights
 *
 * Performance targets:
 * - Initial render (1000 rows): ≤100ms
 * - Scroll frame time: ≤16.67ms (60 FPS)
 * - Memory: ≤4,000 active Proxy objects
 */
export const DEFAULT_BOM_VIRTUAL_CONFIG: BOMVirtualScrollerConfig = {
  overscan: 5,
  estimateSize: 48,
  enableDynamicSize: true,
  scrollThrottle: 16,
}

/**
 * Validation error for invalid configuration
 */
export class VirtualScrollerConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VirtualScrollerConfigError'
  }
}

/**
 * Validates a virtual scroller configuration
 *
 * Ensures all configuration values are within acceptable ranges
 * to prevent performance issues or rendering errors.
 *
 * @param config - Configuration to validate
 * @throws {VirtualScrollerConfigError} If configuration is invalid
 *
 * @example
 * ```typescript
 * const config: BOMVirtualScrollerConfig = {
 *   overscan: 5,
 *   estimateSize: 48,
 *   enableDynamicSize: true,
 *   scrollThrottle: 16,
 * };
 *
 * validateVirtualScrollerConfig(config); // OK
 * ```
 */
export function validateVirtualScrollerConfig(
  config: BOMVirtualScrollerConfig
): void {
  // Validate overscan
  if (!Number.isInteger(config.overscan) || config.overscan < 0) {
    throw new VirtualScrollerConfigError(
      `overscan must be a non-negative integer, got: ${config.overscan}`
    )
  }

  if (config.overscan > 50) {
    throw new VirtualScrollerConfigError(
      `overscan is too large (${config.overscan}), maximum recommended value is 50`
    )
  }

  // Validate estimateSize
  if (typeof config.estimateSize !== 'number' || config.estimateSize <= 0) {
    throw new VirtualScrollerConfigError(
      `estimateSize must be a positive number, got: ${config.estimateSize}`
    )
  }

  if (config.estimateSize < 20 || config.estimateSize > 200) {
    throw new VirtualScrollerConfigError(
      `estimateSize (${config.estimateSize}px) is outside recommended range (20-200px)`
    )
  }

  // Validate enableDynamicSize
  if (typeof config.enableDynamicSize !== 'boolean') {
    throw new VirtualScrollerConfigError(
      `enableDynamicSize must be a boolean, got: ${typeof config.enableDynamicSize}`
    )
  }

  // Validate scrollThrottle
  if (typeof config.scrollThrottle !== 'number' || config.scrollThrottle <= 0) {
    throw new VirtualScrollerConfigError(
      `scrollThrottle must be a positive number, got: ${config.scrollThrottle}`
    )
  }

  if (config.scrollThrottle < 8 || config.scrollThrottle > 100) {
    throw new VirtualScrollerConfigError(
      `scrollThrottle (${config.scrollThrottle}ms) is outside recommended range (8-100ms)`
    )
  }
}

/**
 * Creates a validated virtual scroller configuration
 *
 * Merges provided configuration with defaults and validates the result.
 *
 * @param config - Partial configuration to merge with defaults
 * @returns Validated complete configuration
 * @throws {VirtualScrollerConfigError} If resulting configuration is invalid
 *
 * @example
 * ```typescript
 * // Use defaults
 * const config1 = createVirtualScrollerConfig();
 *
 * // Override specific values
 * const config2 = createVirtualScrollerConfig({
 *   overscan: 10,
 *   scrollThrottle: 8, // 120 FPS
 * });
 * ```
 */
export function createVirtualScrollerConfig(
  config?: Partial<BOMVirtualScrollerConfig>
): BOMVirtualScrollerConfig {
  const mergedConfig: BOMVirtualScrollerConfig = {
    ...DEFAULT_BOM_VIRTUAL_CONFIG,
    ...config,
  }

  validateVirtualScrollerConfig(mergedConfig)

  return mergedConfig
}
