# BOM Performance Optimization - Historical API Reference

**Version**: 1.0  
**Last Updated**: July 20, 2026
**Status**: Historical; the dedicated BOM performance experiment has been retired
**Target Audience**: Frontend Developers

> This page preserves the retired performance experiment for design context. The
> virtual table, row/cell, performance dashboard, BOM-specific feature flags,
> virtual-scroller configuration, optimized-data hook, and related error-boundary
> modules described below are no longer importable APIs. The active editor flow is
> `src/features/product-structure/components/bom-action-dialog.tsx` ->
> `src/features/product-structure/components/bom-editor/bom-workspace.tsx` ->
> `src/features/product-structure/hooks/use-bom-workspace.ts`.

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

## Dirty Marking API (Removed)

The dedicated dirty-marker and optimized-proxy-tracker modules were removed. The
signatures and imports in this section are historical and cannot be used by the
current BOM editor.

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

## Lazy Proxy Management API (Removed)

The lazy proxy manager was removed with the experiment. The examples below
preserve its former contract but no longer point to an importable module.

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

## Performance Monitoring API (Removed)

The BOM-specific performance monitor was removed. These metrics and examples are
retained only as a record of the retired experiment.

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

## Feature Flags API (Removed)

The BOM-specific performance feature-flag module was removed. The signatures in
this section are retained only to explain the historical experiment.

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

There is no supported replacement feature-flag import. Current BOM behavior is
implemented directly by the active workspace flow linked at the top of this page.

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

### useBOMPerformanceMonitor Hook (Removed)

This hook was removed with the BOM-specific performance monitor. The example is
historical and has no current import path.

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
      <BOMTable onEdit={handleEdit} onCommit={handleCommit} />
    </div>
  );
}
```

---

## React Components API (Removed)

The dedicated virtual table and performance dashboard were removed. Their
signatures remain below as historical design records, not supported components.

### BOMVirtualTable Component (Removed)

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

No current import path exists. The active BOM editor renders through
`components/bom-editor/bom-workspace.tsx`.

### BOMPerformanceDashboard Component (Removed)

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

No current performance-dashboard component is shipped for the BOM editor.

---

## Error Handling API (Removed)

The experiment-specific delta error module was removed. The class shapes below
are historical and are not current application error APIs.

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

## Configuration API (Removed)

### BOMVirtualScrollerConfig Interface (Removed)

The dedicated virtual-scroller configuration module was removed with the virtual
table experiment. The shape below is historical and has no current import path.

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

Use the active workspace implementation as the source of truth for current
rendering behavior; there is no replacement configuration API.

---

## Type Exports (Historical)

The retired component, feature-flag, optimized-data, error-boundary, and
virtual-scroller types are no longer exported. Import current types from the
active module that declares them; this historical page is not an export catalog.

---

## Migration Guide

### Retired Prototype Example

The comparison below records the old prototype migration. It does not represent
the current BOM editor implementation.

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

// Retired prototype (no longer available)
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
| 1.1 | July 20, 2026 | Marked retired APIs and removed stale import paths |
| 1.0 | May 13, 2026 | Initial API documentation |

---

**Document Version**: 1.0  
**Last Updated**: July 20, 2026
**Maintained By**: Frontend Team
