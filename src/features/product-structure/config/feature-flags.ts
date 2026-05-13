/**
 * BOM Performance Feature Flags
 * 
 * Feature flags for gradual rollout of BOM performance optimizations.
 * Supports environment variable configuration for different deployment stages.
 * 
 * Rollout Strategy:
 * 1. Internal testing (development environment)
 * 2. 10% of users (staging environment)
 * 3. 50% of users (production with flag)
 * 4. 100% of users (production default)
 */

/**
 * BOM Performance Feature Flags Interface
 */
export interface BOMPerformanceFeatureFlags {
  /**
   * Master switch - enables/disables all optimizations
   * When false, all other flags are ignored and system uses legacy behavior
   */
  enableAllOptimizations: boolean;
  
  /**
   * Enable dirty marking system for incremental diff calculation
   * Requirement: 1.2, 1.3
   */
  enableDirtyMarking: boolean;
  
  /**
   * Enable lazy Proxy creation for memory optimization
   * Requirement: 4.1, 4.2
   */
  enableLazyProxy: boolean;
  
  /**
   * Enable virtual scrolling for large datasets
   * Requirement: 2.1, 2.3
   */
  enableVirtualScrolling: boolean;
  
  /**
   * Enable React rendering optimizations (memo, useMemo, useCallback)
   * Requirement: 3.1, 3.2, 3.3
   */
  enableReactOptimizations: boolean;
  
  /**
   * Enable performance monitoring and metrics collection
   * Requirement: 5.1, 5.2, 5.3
   */
  enablePerformanceMonitoring: boolean;
  
  /**
   * Enable error recovery strategies (retry, fallback, state persistence)
   * Requirement: 9.1, 9.2, 9.3
   */
  enableErrorRecovery: boolean;
  
  /**
   * Show performance dashboard in UI
   */
  showPerformanceDashboard: boolean;
  
  /**
   * Enable debug logging for troubleshooting
   */
  enableDebugLogging: boolean;
}

/**
 * Default feature flags (all optimizations enabled)
 */
export const DEFAULT_FEATURE_FLAGS: BOMPerformanceFeatureFlags = {
  enableAllOptimizations: true,
  enableDirtyMarking: true,
  enableLazyProxy: true,
  enableVirtualScrolling: true,
  enableReactOptimizations: true,
  enablePerformanceMonitoring: true,
  enableErrorRecovery: true,
  showPerformanceDashboard: false, // Hidden by default in production
  enableDebugLogging: false,
};

/**
 * Legacy feature flags (all optimizations disabled)
 * Used for rollback or comparison testing
 */
export const LEGACY_FEATURE_FLAGS: BOMPerformanceFeatureFlags = {
  enableAllOptimizations: false,
  enableDirtyMarking: false,
  enableLazyProxy: false,
  enableVirtualScrolling: false,
  enableReactOptimizations: false,
  enablePerformanceMonitoring: false,
  enableErrorRecovery: false,
  showPerformanceDashboard: false,
  enableDebugLogging: false,
};

/**
 * Development feature flags (all optimizations enabled + debug tools)
 */
export const DEVELOPMENT_FEATURE_FLAGS: BOMPerformanceFeatureFlags = {
  ...DEFAULT_FEATURE_FLAGS,
  showPerformanceDashboard: true,
  enableDebugLogging: true,
};

/**
 * Environment variable names for feature flags
 */
const ENV_VAR_PREFIX = 'VITE_BOM_PERF_';

const ENV_VAR_NAMES = {
  ENABLE_ALL: `${ENV_VAR_PREFIX}ENABLE_ALL`,
  ENABLE_DIRTY_MARKING: `${ENV_VAR_PREFIX}ENABLE_DIRTY_MARKING`,
  ENABLE_LAZY_PROXY: `${ENV_VAR_PREFIX}ENABLE_LAZY_PROXY`,
  ENABLE_VIRTUAL_SCROLLING: `${ENV_VAR_PREFIX}ENABLE_VIRTUAL_SCROLLING`,
  ENABLE_REACT_OPTIMIZATIONS: `${ENV_VAR_PREFIX}ENABLE_REACT_OPTIMIZATIONS`,
  ENABLE_PERFORMANCE_MONITORING: `${ENV_VAR_PREFIX}ENABLE_PERFORMANCE_MONITORING`,
  ENABLE_ERROR_RECOVERY: `${ENV_VAR_PREFIX}ENABLE_ERROR_RECOVERY`,
  SHOW_PERFORMANCE_DASHBOARD: `${ENV_VAR_PREFIX}SHOW_PERFORMANCE_DASHBOARD`,
  ENABLE_DEBUG_LOGGING: `${ENV_VAR_PREFIX}ENABLE_DEBUG_LOGGING`,
} as const;

/**
 * Parse boolean from environment variable
 * Supports: 'true', '1', 'yes', 'on' (case-insensitive)
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  
  const normalized = value.toLowerCase().trim();
  
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  
  return defaultValue;
}

/**
 * Get feature flags from environment variables
 * Falls back to default values if environment variables are not set
 */
function getFeatureFlagsFromEnv(): BOMPerformanceFeatureFlags {
  // Check master switch first
  const enableAll = parseBooleanEnv(
    import.meta.env[ENV_VAR_NAMES.ENABLE_ALL],
    DEFAULT_FEATURE_FLAGS.enableAllOptimizations
  );
  
  // If master switch is off, return legacy flags
  if (!enableAll) {
    return LEGACY_FEATURE_FLAGS;
  }
  
  // Parse individual flags
  return {
    enableAllOptimizations: enableAll,
    enableDirtyMarking: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_DIRTY_MARKING],
      DEFAULT_FEATURE_FLAGS.enableDirtyMarking
    ),
    enableLazyProxy: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_LAZY_PROXY],
      DEFAULT_FEATURE_FLAGS.enableLazyProxy
    ),
    enableVirtualScrolling: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_VIRTUAL_SCROLLING],
      DEFAULT_FEATURE_FLAGS.enableVirtualScrolling
    ),
    enableReactOptimizations: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_REACT_OPTIMIZATIONS],
      DEFAULT_FEATURE_FLAGS.enableReactOptimizations
    ),
    enablePerformanceMonitoring: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_PERFORMANCE_MONITORING],
      DEFAULT_FEATURE_FLAGS.enablePerformanceMonitoring
    ),
    enableErrorRecovery: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_ERROR_RECOVERY],
      DEFAULT_FEATURE_FLAGS.enableErrorRecovery
    ),
    showPerformanceDashboard: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.SHOW_PERFORMANCE_DASHBOARD],
      DEFAULT_FEATURE_FLAGS.showPerformanceDashboard
    ),
    enableDebugLogging: parseBooleanEnv(
      import.meta.env[ENV_VAR_NAMES.ENABLE_DEBUG_LOGGING],
      DEFAULT_FEATURE_FLAGS.enableDebugLogging
    ),
  };
}

/**
 * Cached feature flags instance
 */
let cachedFeatureFlags: BOMPerformanceFeatureFlags | null = null;

/**
 * Get BOM performance feature flags
 * 
 * Reads from environment variables on first call, then caches the result.
 * Use `resetFeatureFlags()` to clear cache and re-read from environment.
 * 
 * @returns Current feature flags configuration
 */
export function getBOMPerformanceFeatureFlags(): BOMPerformanceFeatureFlags {
  if (cachedFeatureFlags === null) {
    cachedFeatureFlags = getFeatureFlagsFromEnv();
    
    // Log feature flags in development
    if (import.meta.env.DEV) {
      console.info('[BOM Performance] Feature flags:', cachedFeatureFlags);
    }
  }
  
  return cachedFeatureFlags;
}

/**
 * Reset cached feature flags
 * Forces re-reading from environment variables on next call to getBOMPerformanceFeatureFlags()
 * 
 * Useful for testing or dynamic configuration changes
 */
export function resetFeatureFlags(): void {
  cachedFeatureFlags = null;
}

/**
 * Override feature flags programmatically
 * 
 * WARNING: This is intended for testing only.
 * In production, use environment variables instead.
 * 
 * @param flags - Feature flags to set
 */
export function setFeatureFlagsForTesting(flags: Partial<BOMPerformanceFeatureFlags>): void {
  cachedFeatureFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...flags,
  };
}

/**
 * Check if a specific optimization is enabled
 * 
 * Respects the master switch - if enableAllOptimizations is false,
 * all individual optimizations are considered disabled.
 */
export function isOptimizationEnabled(
  optimization: keyof Omit<BOMPerformanceFeatureFlags, 'enableAllOptimizations'>
): boolean {
  const flags = getBOMPerformanceFeatureFlags();
  
  // Master switch overrides all
  if (!flags.enableAllOptimizations) {
    return false;
  }
  
  return flags[optimization];
}

/**
 * Get feature flag status summary for debugging
 */
export function getFeatureFlagSummary(): string {
  const flags = getBOMPerformanceFeatureFlags();
  
  const lines = [
    'BOM Performance Feature Flags:',
    `  Master Switch: ${flags.enableAllOptimizations ? '✓ ON' : '✗ OFF'}`,
    `  Dirty Marking: ${flags.enableDirtyMarking ? '✓' : '✗'}`,
    `  Lazy Proxy: ${flags.enableLazyProxy ? '✓' : '✗'}`,
    `  Virtual Scrolling: ${flags.enableVirtualScrolling ? '✓' : '✗'}`,
    `  React Optimizations: ${flags.enableReactOptimizations ? '✓' : '✗'}`,
    `  Performance Monitoring: ${flags.enablePerformanceMonitoring ? '✓' : '✗'}`,
    `  Error Recovery: ${flags.enableErrorRecovery ? '✓' : '✗'}`,
    `  Performance Dashboard: ${flags.showPerformanceDashboard ? '✓' : '✗'}`,
    `  Debug Logging: ${flags.enableDebugLogging ? '✓' : '✗'}`,
  ];
  
  return lines.join('\n');
}

/**
 * Log feature flags to console (development only)
 */
export function logFeatureFlags(): void {
  if (import.meta.env.DEV) {
    console.info(getFeatureFlagSummary());
  }
}

/**
 * Environment configuration examples
 * 
 * Add these to your .env file:
 * 
 * # Enable all optimizations (master switch)
 * VITE_BOM_PERF_ENABLE_ALL=true
 * 
 * # Enable specific optimizations
 * VITE_BOM_PERF_ENABLE_DIRTY_MARKING=true
 * VITE_BOM_PERF_ENABLE_LAZY_PROXY=true
 * VITE_BOM_PERF_ENABLE_VIRTUAL_SCROLLING=true
 * VITE_BOM_PERF_ENABLE_REACT_OPTIMIZATIONS=true
 * VITE_BOM_PERF_ENABLE_PERFORMANCE_MONITORING=true
 * VITE_BOM_PERF_ENABLE_ERROR_RECOVERY=true
 * 
 * # Show performance dashboard (development/staging only)
 * VITE_BOM_PERF_SHOW_PERFORMANCE_DASHBOARD=true
 * 
 * # Enable debug logging (development only)
 * VITE_BOM_PERF_ENABLE_DEBUG_LOGGING=true
 * 
 * # Disable all optimizations (rollback)
 * VITE_BOM_PERF_ENABLE_ALL=false
 */
