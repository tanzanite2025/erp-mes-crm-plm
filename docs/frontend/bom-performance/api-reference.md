# BOM Performance Optimization - API Reference

**Version**: 1.0  
**Last Updated**: May 13, 2026  
**Target Audience**: Frontend Developers

## Table of Contents

1. [Core Interfaces](#core-interfaces)
2. [Dirty Marking API](#dirty-marking-api)
3. [Lazy Proxy Management API](#lazy-proxy-management-api)
4. [Performance Monitoring API](#performance-monitoring-api)
5. [Feature Flags API](#feature-flags-api)
6. [React Hooks API](#react-hooks-api)
7. [React Components API](#react-components-api)
8. [Error Handling API](#error-handling-api)
9. [Configuration API](#configuration-api)

---

## Core Interfaces

### BOMRow

Represents a single row in the BOM table.

```typescript
interface BOMRow {
  id: string;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  materialType: string;
  supplier?: string;
  cost?: number;
  leadTime?: number;
  notes?: string;
  level?: number;
  parentId?: string;
}
```

### BOMRowData

Base interface for BOM row data (used in hooks).

```typescript
interface BOMRowData {
  id: string;
  [key: string]: any;
}
```

---

## Dirty Marking API

### DirtyMarker Interface

```typescript
interface DirtyMarker {
  /**
   * Mark a row as dirty (modified)
   * @param rowId - Unique identifier of the row
   */
  markDirty(rowId: string): void;
  
  /**
   * Check if a row is dirty
   * @param rowId - Unique identifier of the row
   * @returns true if row is dirty, false otherwise
   */
  isDirty(rowId: string): boolean;
  
  /**
   * Get all dirty row IDs
   * @returns Array of dirty row IDs
   */
  getDirtyRows(): string[];
  
  /**
   * Clear dirty marker for a specific row
   * @param rowId - Unique identifier of the row
   */
  clearDirty(rowId: string): void;
  
  /**
   * Clear all dirty markers
   */
  clearAll(): void;
  
  /**
   * Get count of dirty rows
   * @returns Number of dirty rows
   */
  getDirtyCount(): number;
}
```

### BOMDirtyMarker Class

Implementation of DirtyMarker interface.

```typescript
class BOMDirtyMarker implements DirtyMarker {
  constructor();
  
  markDirty(rowId: string): void;
  isDirty(rowId: string): boolean;
  getDirtyRows(): string[];
  clearDirty(rowId: string): void;
  clearAll(): void;
  getDirtyCount(): number;
}
```

**Example**:

```typescript
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker';

const dirtyMarker = new BOMDirtyMarker();

// Mark row as dirty
dirtyMarker.markDirty('row-1');

// Check if dirty
console.log(dirtyMarker.isDirty('row-1')); // true

// Get all dirty rows
console.log(dirtyMarker.getDirtyRows()); // ['row-1']

// Get dirty count
console.log(dirtyMarker.getDirtyCount()); // 1

// Clear specific row
dirtyMarker.clearDirty('row-1');

// Clear all
dirtyMarker.clearAll();
```

---

## Lazy Proxy Management API

### LazyProxyManager Interface

```typescript
interface LazyProxyManager<T> {
  /**
   * Get or create a Proxy for a row
   * @param id - Unique identifier of the row
   * @param data - Row data
   * @returns Proxied row data
   */
  getProxy(id: string, data: T): T;
  
  /**
   * Release a Proxy (if not dirty)
   * @param id - Unique identifier of the row
   */
  releaseProxy(id: string): void;
  
  /**
   * Check if a Proxy exists
   * @param id - Unique identifier of the row
   * @returns true if Proxy exists, false otherwise
   */
  hasProxy(id: string): boolean;
  
  /**
   * Get count of active Proxies
   * @returns Number of active Proxies
   */
  getActiveProxyCount(): number;
  
  /**
   * Release all clean Proxies (not dirty)
   */
  releaseCleanProxies(): void;
}
```

### BOMProxyManager Class

Implementation of LazyProxyManager interface.

```typescript
class BOMProxyManager implements LazyProxyManager<BOMRow> {
  /**
   * Create a new Proxy manager
   * @param dirtyMarker - Dirty marker instance
   * @param rowIdExtractor - Function to extract row ID
   */
  constructor(
    dirtyMarker: DirtyMarker,
    rowIdExtractor: (row: BOMRow) => string
  );
  
  getProxy(id: string, data: BOMRow): BOMRow;
  releaseProxy(id: string): void;
  hasProxy(id: string): boolean;
  getActiveProxyCount(): number;
  releaseCleanProxies(): void;
}
```

**Example**:

```typescript
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager';
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker';

const dirtyMarker = new BOMDirtyMarker();
const proxyManager = new BOMProxyManager(
  dirtyMarker,
  (row) => row.id
);

// Get Proxy for a row
const row = { id: 'row-1', name: 'Part A', quantity: 10 };
const proxy = proxyManager.getProxy('row-1', row);

// Modify proxy (automatically marks as dirty)
proxy.quantity = 20;

// Check if Proxy exists
console.log(proxyManager.hasProxy('row-1')); // true

// Get active Proxy count
console.log(proxyManager.getActiveProxyCount()); // 1

// Try to release (won't release because dirty)
proxyManager.releaseProxy('row-1');
console.log(proxyManager.hasProxy('row-1')); // true (still active)

// Clear dirty marker
dirtyMarker.clearDirty('row-1');

// Now release will work
proxyManager.releaseProxy('row-1');
console.log(proxyManager.hasProxy('row-1')); // false
```

---

## Performance Monitoring API

### BOMPerformanceMetrics Interface

```typescript
interface BOMPerformanceMetrics {
  /** Time to first render in milliseconds */
  initialRenderTime: number;
  
  /** Time for single field edit in milliseconds */
  editTime: number;
  
  /** Time for commit operation in milliseconds */
  commitTime: number;
  
  /** Current active Proxy count */
  activeProxyCount: number;
  
  /** Current dirty row count */
  dirtyRowCount: number;
  
  /** Total row count */
  totalRowCount: number;
  
  /** Timestamp of measurement */
  timestamp: number;
}
```

### BOMPerformanceMonitor Class

```typescript
class BOMPerformanceMonitor {
  constructor();
  
  /**
   * Start timing an operation
   * @param operation - Operation name
   * @returns End timing function
   */
  startTiming(operation: string): () => number;
  
  /**
   * End timing an operation
   * @param operation - Operation name
   * @returns Elapsed time in milliseconds
   */
  endTiming(operation: string): number;
  
  /**
   * Record performance metrics
   * @param metrics - Performance metrics to record
   */
  recordMetrics(metrics: BOMPerformanceMetrics): void;
  
  /**
   * Get latest recorded metrics
   * @returns Latest metrics or null if none recorded
   */
  getLatestMetrics(): BOMPerformanceMetrics | null;
  
  /**
   * Get all recorded metrics
   * @returns Array of all metrics
   */
  getAllMetrics(): BOMPerformanceMetrics[];
  
  /**
   * Get average metrics across all recordings
   * @returns Average metrics or null if none recorded
   */
  getAverageMetrics(): BOMPerformanceMetrics | null;
  
  /**
   * Export metrics as JSON
   * @returns JSON string of all metrics
   */
  exportMetrics(): string;
  
  /**
   * Clear all recorded metrics
   */
  clearMetrics(): void;
}
```

**Example**:

```typescript
import { BOMPerformanceMonitor } from '@/lib/performance/bom-performance-monitor';

const monitor = new BOMPerformanceMonitor();

// Start timing
const endTiming = monitor.startTiming('render');

// Perform operation
renderBOMTable();

// End timing
const elapsed = endTiming();
console.log('Render time:', elapsed, 'ms');

// Record metrics
monitor.recordMetrics({
  initialRenderTime: elapsed,
  editTime: 0,
  commitTime: 0,
  activeProxyCount: 100,
  dirtyRowCount: 0,
  totalRowCount: 1000,
  timestamp: Date.now(),
});

// Get latest metrics
const latest = monitor.getLatestMetrics();
console.log('Latest metrics:', latest);

// Get average metrics
const average = monitor.getAverageMetrics();
console.log('Average metrics:', average);

// Export metrics
const json = monitor.exportMetrics();
console.log('Exported metrics:', json);

// Clear metrics
monitor.clearMetrics();
```

---

## Feature Flags API

### BOMPerformanceFeatureFlags Interface

```typescript
interface BOMPerformanceFeatureFlags {
  /** Master switch for all optimizations */
  enableAllOptimizations: boolean;
  
  /** Enable dirty marking optimization */
  enableDirtyMarking: boolean;
  
  /** Enable lazy Proxy creation */
  enableLazyProxy: boolean;
  
  /** Enable virtual scrolling */
  enableVirtualScrolling: boolean;
  
  /** Enable React rendering optimizations */
  enableReactOptimizations: boolean;
  
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  
  /** Enable error recovery features */
  enableErrorRecovery: boolean;
  
  /** Enable local state persistence */
  enableLocalStatePersistence: boolean;
  
  /** Enable retry logic */
  enableRetryLogic: boolean;
}
```

### Feature Flags Functions

```typescript
/**
 * Get current feature flags
 * @returns Current feature flags configuration
 */
function getBOMPerformanceFeatureFlags(): BOMPerformanceFeatureFlags;

/**
 * Set feature flags for testing
 * @param flags - Partial feature flags to override
 */
function setFeatureFlagsForTesting(
  flags: Partial<BOMPerformanceFeatureFlags>
): void;

/**
 * Reset feature flags to defaults
 */
function resetFeatureFlags(): void;

/**
 * Get preset configuration
 * @param preset - Preset name
 * @returns Feature flags configuration
 */
function getPresetConfiguration(
  preset: 'development' | 'staging' | 'production'
): BOMPerformanceFeatureFlags;
```

**Example**:

```typescript
import {
  getBOMPerformanceFeatureFlags,
  setFeatureFlagsForTesting,
  resetFeatureFlags,
  getPresetConfiguration,
} from '@/features/product-structure/config/feature-flags';

// Get current flags
const flags = getBOMPerformanceFeatureFlags();
console.log('Current flags:', flags);

// Set flags for testing
setFeatureFlagsForTesting({
  enableAllOptimizations: true,
  enablePerformanceMonitoring: true,
});

// Get preset configuration
const devFlags = getPresetConfiguration('development');
console.log('Development flags:', devFlags);

// Reset to defaults
resetFeatureFlags();
```

---

## React Hooks API

### useBOMData Hook

```typescript
interface UseBOMDataOptions {
  /** Initial row data */
  initialRows: BOMRowData[];
  
  /** Callback on successful commit */
  onCommitSuccess?: () => void;
  
  /** Callback on commit error */
  onCommitError?: (error: Error) => void;
}

interface UseBOMDataReturn {
  /** Current row data */
  rows: BOMRowData[];
  
  /** Number of dirty rows */
  dirtyCount: number;
  
  /** Number of active Proxies */
  activeProxyCount: number;
  
  /** Handle row update */
  handleRowUpdate: (row: BOMRowData) => void;
  
  /** Handle commit operation */
  handleCommit: () => Promise<Record<string, any>>;
  
  /** Check if row is dirty */
  isRowDirty: (rowId: string) => boolean;
  
  /** Get Proxy for a row */
  getRowProxy: (rowId: string) => BOMRowData | null;
  
  /** Release Proxy for a row */
  releaseRowProxy: (rowId: string) => void;
  
  /** Clear all dirty markers */
  clearDirtyMarkers: () => void;
}

/**
 * Hook for managing BOM data with optimizations
 * @param options - Hook options
 * @returns BOM data management utilities
 */
function useBOMData(options: UseBOMDataOptions): UseBOMDataReturn;
```

**Example**:

```typescript
import { useBOMData } from '@/features/product-structure/hooks/use-bom-data';

function BOMManagement() {
  const {
    rows,
    dirtyCount,
    activeProxyCount,
    handleRowUpdate,
    handleCommit,
    isRowDirty,
  } = useBOMData({
    initialRows: bomData,
    onCommitSuccess: () => {
      toast.success('Changes saved');
    },
    onCommitError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });
  
  return (
    <div>
      <div>Dirty rows: {dirtyCount}</div>
      <div>Active Proxies: {activeProxyCount}</div>
      <button onClick={handleCommit} disabled={dirtyCount === 0}>
        Save Changes
      </button>
      <BOMTable
        rows={rows}
        onRowUpdate={handleRowUpdate}
        isRowDirty={isRowDirty}
      />
    </div>
  );
}
```

### useBOMPerformanceMonitor Hook

```typescript
interface UseBOMPerformanceMonitorReturn {
  /** Performance monitor instance */
  monitor: BOMPerformanceMonitor;
  
  /** Monitor edit operation */
  monitorEdit: () => () => void;
  
  /** Monitor commit operation */
  monitorCommit: <T>(fn: () => Promise<T>) => Promise<T>;
}

/**
 * Hook for monitoring BOM performance
 * @returns Performance monitoring utilities
 */
function useBOMPerformanceMonitor(): UseBOMPerformanceMonitorReturn;
```

**Example**:

```typescript
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';

function BOMManagement() {
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor();
  
  const handleEdit = (row: BOMRow) => {
    const endMonitoring = monitorEdit();
    try {
      updateRow(row);
    } finally {
      endMonitoring();
    }
  };
  
  const handleCommit = async () => {
    await monitorCommit(async () => {
      return await commitChanges();
    });
  };
  
  const metrics = monitor.getLatestMetrics();
  
  return (
    <div>
      <BOMPerformanceDashboard metrics={metrics} />
      <BOMTable onEdit={handleEdit} onCommit={handleCommit} />
    </div>
  );
}
```

---

## React Components API

### BOMVirtualTable Component

```typescript
interface BOMVirtualTableProps {
  /** Row data */
  rows: BOMRowData[];
  
  /** Column definitions */
  columns: ColumnDef[];
  
  /** Row update handler */
  onRowUpdate?: (row: BOMRowData) => void;
  
  /** Check if row is dirty */
  isRowDirty?: (rowId: string) => boolean;
  
  /** Custom row renderer */
  renderRow?: (row: BOMRowData, index: number) => React.ReactNode;
  
  /** Virtual scroller configuration */
  config?: BOMVirtualScrollerConfig;
  
  /** Additional CSS class */
  className?: string;
}

/**
 * Virtual scrolling table component for BOM data
 */
function BOMVirtualTable(props: BOMVirtualTableProps): JSX.Element;
```

**Example**:

```typescript
import { BOMVirtualTable } from '@/features/product-structure/components/bom-virtual-table';

function BOMManagement() {
  const { rows, handleRowUpdate, isRowDirty } = useBOMData({ initialRows });
  
  return (
    <BOMVirtualTable
      rows={rows}
      columns={columns}
      onRowUpdate={handleRowUpdate}
      isRowDirty={isRowDirty}
      config={{
        overscan: 5,
        estimateSize: 48,
        enableDynamicSize: true,
        scrollThrottle: 16,
      }}
    />
  );
}
```

### BOMPerformanceDashboard Component

```typescript
interface BOMPerformanceDashboardProps {
  /** Performance metrics to display */
  metrics: BOMPerformanceMetrics | null;
  
  /** Dashboard variant */
  variant?: 'compact' | 'full';
  
  /** Export handler */
  onExport?: () => void;
  
  /** Additional CSS class */
  className?: string;
}

/**
 * Performance metrics dashboard component
 */
function BOMPerformanceDashboard(props: BOMPerformanceDashboardProps): JSX.Element;
```

**Example**:

```typescript
import { BOMPerformanceDashboard } from '@/features/product-structure/components/bom-performance-dashboard';

function BOMManagement() {
  const { monitor } = useBOMPerformanceMonitor();
  const metrics = monitor.getLatestMetrics();
  
  return (
    <BOMPerformanceDashboard
      metrics={metrics}
      variant="full"
      onExport={() => {
        const json = monitor.exportMetrics();
        downloadJSON(json, 'metrics.json');
      }}
    />
  );
}
```

---

## Error Handling API

### Error Classes

```typescript
/**
 * Base error class for BOM delta operations
 */
class BOMDeltaError extends Error {
  constructor(message: string, public context?: Record<string, any>);
}

/**
 * Error during diff engine operations
 */
class DiffEngineError extends BOMDeltaError {
  constructor(
    message: string,
    public operation: string,
    context?: Record<string, any>
  );
}

/**
 * Error during Proxy tracker operations
 */
class ProxyTrackerError extends BOMDeltaError {
  constructor(
    message: string,
    public operation: string,
    context?: Record<string, any>
  );
}

/**
 * Error during virtual scroller operations
 */
class VirtualScrollerError extends BOMDeltaError {
  constructor(message: string, context?: Record<string, any>);
}
```

### ErrorRecoveryHandler Class

```typescript
class ErrorRecoveryHandler {
  constructor();
  
  /**
   * Fall back to full diff calculation
   * @param rows - All rows
   * @returns Delta object
   */
  fallbackToFullDiff(rows: BOMRowData[]): Record<string, any>;
  
  /**
   * Persist state to local storage
   * @param rows - Current rows
   * @param dirtyRowIds - Dirty row IDs
   */
  persistLocalState(rows: BOMRowData[], dirtyRowIds: string[]): void;
  
  /**
   * Restore state from local storage
   * @returns Restored state or null
   */
  restoreLocalState(): { rows: BOMRowData[]; dirtyRowIds: string[] } | null;
  
  /**
   * Clear local storage state
   */
  clearLocalState(): void;
  
  /**
   * Retry operation with exponential backoff
   * @param fn - Function to retry
   * @param options - Retry options
   * @returns Retry result
   */
  retryWithBackoff<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
    }
  ): Promise<{ success: boolean; result?: T; error?: Error; attempts: number }>;
}
```

**Example**:

```typescript
import {
  DiffEngineError,
  ProxyTrackerError,
  ErrorRecoveryHandler,
} from '@/lib/delta/errors';

const recoveryHandler = new ErrorRecoveryHandler();

// Handle diff engine error
try {
  const delta = calculateDelta(dirtyRows);
} catch (error) {
  if (error instanceof DiffEngineError) {
    console.error('Diff error:', error.operation, error.context);
    const delta = recoveryHandler.fallbackToFullDiff(allRows);
  }
}

// Persist state before risky operation
recoveryHandler.persistLocalState(rows, dirtyRowIds);

// Retry with backoff
const result = await recoveryHandler.retryWithBackoff(
  async () => await commitChanges(),
  { maxRetries: 3, initialDelay: 1000 }
);

if (result.success) {
  recoveryHandler.clearLocalState();
} else {
  const restored = recoveryHandler.restoreLocalState();
  if (restored) {
    setRows(restored.rows);
  }
}
```

---

## Configuration API

### BOMVirtualScrollerConfig Interface

```typescript
interface BOMVirtualScrollerConfig {
  /** Number of rows to render outside viewport */
  overscan: number;
  
  /** Estimated row height in pixels */
  estimateSize: number;
  
  /** Support variable row heights */
  enableDynamicSize: boolean;
  
  /** Scroll event throttle in milliseconds */
  scrollThrottle: number;
}

/**
 * Default virtual scroller configuration
 */
const DEFAULT_BOM_VIRTUAL_CONFIG: BOMVirtualScrollerConfig;

/**
 * Validate virtual scroller configuration
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
function validateVirtualScrollerConfig(
  config: BOMVirtualScrollerConfig
): boolean;
```

**Example**:

```typescript
import {
  DEFAULT_BOM_VIRTUAL_CONFIG,
  validateVirtualScrollerConfig,
} from '@/features/product-structure/config/virtual-scroller-config';

// Use default configuration
const config = DEFAULT_BOM_VIRTUAL_CONFIG;

// Create custom configuration
const customConfig = {
  overscan: 10,
  estimateSize: 60,
  enableDynamicSize: false,
  scrollThrottle: 32,
};

// Validate configuration
if (validateVirtualScrollerConfig(customConfig)) {
  console.log('Configuration is valid');
} else {
  console.error('Configuration is invalid');
}
```

---

## Type Exports

All types are exported from their respective modules:

```typescript
// Dirty marking types
export type { DirtyMarker } from '@/lib/delta/dirty-marker';

// Lazy Proxy types
export type { LazyProxyManager } from '@/lib/delta/lazy-proxy-manager';

// Performance monitoring types
export type { BOMPerformanceMetrics } from '@/lib/performance/bom-performance-monitor';

// Feature flags types
export type { BOMPerformanceFeatureFlags } from '@/features/product-structure/config/feature-flags';

// Hook types
export type {
  UseBOMDataOptions,
  UseBOMDataReturn,
} from '@/features/product-structure/hooks/use-bom-data';

// Component types
export type { BOMVirtualTableProps } from '@/features/product-structure/components/bom-virtual-table';
export type { BOMPerformanceDashboardProps } from '@/features/product-structure/components/bom-performance-dashboard';

// Configuration types
export type { BOMVirtualScrollerConfig } from '@/features/product-structure/config/virtual-scroller-config';

// Error types
export type {
  BOMDeltaError,
  DiffEngineError,
  ProxyTrackerError,
  VirtualScrollerError,
} from '@/lib/delta/errors';
```

---

## Migration Guide

### From Legacy to Optimized

```typescript
// Before (Legacy)
function BOMManagement() {
  const [rows, setRows] = useState(bomData);
  
  const handleUpdate = (row: BOMRow) => {
    setRows(prev => prev.map(r => r.id === row.id ? row : r));
  };
  
  const handleCommit = async () => {
    const delta = calculateFullDiff(rows);
    await saveDelta(delta);
  };
  
  return <BOMTable rows={rows} onUpdate={handleUpdate} onCommit={handleCommit} />;
}

// After (Optimized)
function BOMManagement() {
  const {
    rows,
    dirtyCount,
    handleRowUpdate,
    handleCommit,
    isRowDirty,
  } = useBOMData({
    initialRows: bomData,
    onCommitSuccess: () => toast.success('Saved'),
    onCommitError: (error) => toast.error(error.message),
  });
  
  return (
    <BOMVirtualTable
      rows={rows}
      onRowUpdate={handleRowUpdate}
      isRowDirty={isRowDirty}
    />
  );
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | May 13, 2026 | Initial API documentation |

---

**Document Version**: 1.0  
**Last Updated**: May 13, 2026  
**Maintained By**: Frontend Team
