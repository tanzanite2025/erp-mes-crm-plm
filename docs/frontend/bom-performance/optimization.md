# BOM Performance Optimization Guide (Historical)

**Version**: 1.0  
**Last Updated**: July 20, 2026
**Status**: Historical; the dedicated BOM performance experiment has been retired
**Target Audience**: Frontend Developers, System Architects

> This guide preserves a retired virtual-table and performance-monitoring design.
> Its dedicated BOM row/cell, virtual table, dashboard, feature-flag,
> virtual-scroller configuration, and optimized-data modules are no longer part of
> the application. Current BOM editing starts at
> `src/features/product-structure/components/bom-action-dialog.tsx` and renders
> through `src/features/product-structure/components/bom-editor/bom-workspace.tsx`.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Dirty Marking System](#dirty-marking-system)
4. [Lazy Proxy Lifecycle](#lazy-proxy-lifecycle)
5. [Virtual Scrolling Configuration](#virtual-scrolling-configuration)
6. [React Rendering Optimizations](#react-rendering-optimizations)
7. [Performance Monitoring](#performance-monitoring)
8. [Best Practices](#best-practices)
9. [Code Examples](#code-examples)

---

## Overview

The retired BOM frontend experiment reported **8-10x performance improvements**
for large-scale BOM datasets (500-2000+ rows) through five strategies. These
figures are historical results, not current production benchmarks:

1. **Incremental Diff Optimization**: Dirty marking and shallow comparison
2. **Virtual Scrolling Enhancement**: Lazy Proxy creation and optimized configuration
3. **React Rendering Optimization**: Memoization to prevent unnecessary re-renders
4. **SDRTS Proxy Memory Management**: Lifecycle-aware Proxy creation and garbage collection
5. **Performance Monitoring Infrastructure**: Comprehensive measurement and reporting

### Historical Performance Results

The table records the retired experiment's measurements and does not establish a
current service-level target.

| Metric | Baseline | Optimized | Improvement |
|--------|----------|-----------|-------------|
| Initial Render (1000 rows) | 800ms | 0.42ms | **99.95%** |
| Single Field Edit | 150ms | 0.05ms | **99.97%** |
| Commit (1000 rows, 10% dirty) | 500ms | 0.32ms | **99.94%** |
| Active Proxies (1000 rows) | 20,000 | 0 | **100%** |

---

## Historical Architecture

The diagram below describes the removed experiment, not the active BOM component
graph.

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     BOM Management UI                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              BOMVirtualTable Component                │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         TanStack Virtual Scroller              │  │   │
│  │  │  • Renders only visible rows + overscan        │  │   │
│  │  │  • Dynamic row heights                         │  │   │
│  │  │  • Scroll performance optimization             │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    useBOMData Hook                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              State Management Layer                   │   │
│  │  • Row data management                               │   │
│  │  • Memoized update handlers                          │   │
│  │  • Dirty tracking integration                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Core Optimization Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ DirtyMarker  │  │ ProxyManager │  │ PerformanceMonitor│  │
│  │              │  │              │  │                 │   │
│  │ • Track      │  │ • Lazy       │  │ • Metrics       │   │
│  │   modified   │  │   creation   │  │   collection    │   │
│  │   rows       │  │ • Release    │  │ • Threshold     │   │
│  │ • O(1)       │  │   clean      │  │   alerts        │   │
│  │   lookup     │  │   proxies    │  │ • Export        │   │
│  └──────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SDRTS Delta Engine                        │
│  • Incremental diff calculation (dirty rows only)            │
│  • Shallow comparison optimization                           │
│  • Proxy-based change tracking                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Edit → Mark Row Dirty → Update Proxy → Re-render Row Only
                                    ↓
                            Commit Triggered
                                    ↓
                    Calculate Delta (Dirty Rows Only)
                                    ↓
                            Send to Backend
                                    ↓
                          Clear Dirty Markers
```

---

## Dirty Marking System (Retired)

The dirty marker and optimized proxy tracker described here were removed. This
section records the former design and does not describe a current integration.

### Concept

The dirty marking system tracks which rows have been modified, allowing the diff engine to compare only changed rows instead of the entire dataset.

### Architecture

```typescript
interface DirtyMarker {
  markDirty(rowId: string): void;
  isDirty(rowId: string): boolean;
  getDirtyRows(): string[];
  clearDirty(rowId: string): void;
  clearAll(): void;
  getDirtyCount(): number;
}

class BOMDirtyMarker implements DirtyMarker {
  private dirtyRows: Set<string>;
  
  // O(1) operations using Set
  markDirty(rowId: string): void {
    this.dirtyRows.add(rowId);
  }
  
  isDirty(rowId: string): boolean {
    return this.dirtyRows.has(rowId);
  }
  
  // ... other methods
}
```

### Usage Pattern

```typescript
// Initialize dirty marker
const dirtyMarker = new BOMDirtyMarker();

// Mark row as dirty when edited
function handleRowUpdate(row: BOMRow) {
  dirtyMarker.markDirty(row.id);
  updateRowData(row);
}

// Commit only dirty rows
async function handleCommit() {
  const dirtyRowIds = dirtyMarker.getDirtyRows();
  const dirtyRows = rows.filter(r => dirtyRowIds.includes(r.id));
  
  // Calculate delta for dirty rows only
  const delta = calculateDelta(dirtyRows);
  
  await saveDelta(delta);
  
  // Clear dirty markers after successful commit
  dirtyMarker.clearAll();
}
```

### Performance Impact

- **Before**: Compare all 1000 rows on commit → 500ms
- **After**: Compare only 100 dirty rows (10%) → 0.32ms
- **Improvement**: 99.94% faster

### Best Practices

1. **Mark dirty immediately** when a field changes
2. **Clear markers after successful commit** to prevent stale state
3. **Preserve dirty markers on error** to allow retry
4. **Use Set for O(1) lookup** instead of Array

---

## Lazy Proxy Lifecycle (Retired)

The lazy proxy manager was removed with the experiment. The lifecycle and usage
examples below are historical.

### Concept

Create Proxies only for visible rows and release Proxies for rows that scroll out of view (unless they are dirty).

### Architecture

```typescript
interface LazyProxyManager<T> {
  getProxy(id: string, data: T): T;
  releaseProxy(id: string): void;
  hasProxy(id: string): boolean;
  getActiveProxyCount(): number;
  releaseCleanProxies(): void;
}

class BOMProxyManager implements LazyProxyManager<BOMRow> {
  private proxyCache: Map<string, BOMRow>;
  private dirtyMarker: DirtyMarker;
  
  getProxy(id: string, data: BOMRow): BOMRow {
    if (this.proxyCache.has(id)) {
      return this.proxyCache.get(id)!;
    }
    
    const proxy = createProxy(data, () => {
      this.dirtyMarker.markDirty(id);
    });
    
    this.proxyCache.set(id, proxy);
    return proxy;
  }
  
  releaseProxy(id: string): void {
    // Don't release if row is dirty
    if (this.dirtyMarker.isDirty(id)) {
      return;
    }
    
    this.proxyCache.delete(id);
  }
}
```

### Lifecycle States

```
┌─────────────┐
│   Created   │ ← Row scrolls into view
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Active    │ ← User can edit
└──────┬──────┘
       │
       ├─────→ User edits → Mark Dirty
       │                         ↓
       │                   ┌─────────────┐
       │                   │    Dirty    │
       │                   └──────┬──────┘
       │                          │
       │                          ├─→ Commit Success → Clean
       │                          │
       │                          └─→ Scroll out → Preserve
       │
       ↓
┌─────────────┐
│  Released   │ ← Row scrolls out (if clean)
└─────────────┘
```

### Usage Pattern

```typescript
// In virtual scroller
function renderVisibleRows(visibleRange: Range) {
  const visibleRows = rows.slice(visibleRange.start, visibleRange.end);
  
  // Create Proxies for visible rows
  const proxies = visibleRows.map(row => 
    proxyManager.getProxy(row.id, row)
  );
  
  // Release Proxies for rows that scrolled out
  const invisibleRowIds = getAllRowIds().filter(
    id => !visibleRows.some(r => r.id === id)
  );
  
  invisibleRowIds.forEach(id => {
    proxyManager.releaseProxy(id); // Won't release if dirty
  });
  
  return proxies;
}
```

### Performance Impact

- **Before**: 20,000 active Proxies for 1000 rows → High memory usage
- **After**: 0-100 active Proxies (visible + dirty only) → 80-100% reduction
- **Memory Savings**: ~95% reduction in Proxy overhead

### Best Practices

1. **Create Proxies on demand** when rows become visible
2. **Release Proxies immediately** when rows scroll out (if clean)
3. **Preserve dirty Proxies** until commit succeeds
4. **Use Map for O(1) lookup** instead of Array
5. **Monitor Proxy count** to detect memory leaks

---

## Virtual Scrolling Configuration (Retired)

The dedicated virtual table and its configuration module were removed. The
following snippets are retained as design sketches only.

### Concept

Render only visible rows plus a small overscan buffer, dramatically reducing DOM nodes and React reconciliation overhead.

### Configuration

```typescript
interface BOMVirtualScrollerConfig {
  overscan: number;           // Number of rows to render outside viewport
  estimateSize: number;       // Estimated row height in pixels
  enableDynamicSize: boolean; // Support variable row heights
  scrollThrottle: number;     // Scroll event throttle in ms
}

const DEFAULT_BOM_VIRTUAL_CONFIG: BOMVirtualScrollerConfig = {
  overscan: 5,              // Render 5 extra rows above/below
  estimateSize: 48,         // 48px per row
  enableDynamicSize: true,  // Support nested rows
  scrollThrottle: 16,       // ~60 FPS
};
```

### Usage Pattern

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function BOMVirtualTable({ rows, columns }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => DEFAULT_BOM_VIRTUAL_CONFIG.estimateSize,
    overscan: DEFAULT_BOM_VIRTUAL_CONFIG.overscan,
  });
  
  const virtualRows = virtualizer.getVirtualItems();
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualRows.map(virtualRow => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={row.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <BOMRow row={row} columns={columns} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Performance Impact

- **Before**: Render all 1000 rows → 800ms initial render
- **After**: Render ~20 visible rows → 0.42ms initial render
- **Improvement**: 99.95% faster

### Tuning Guidelines

| Dataset Size | Overscan | Estimate Size | Notes |
|--------------|----------|---------------|-------|
| < 100 rows | 3-5 | 48px | Small buffer sufficient |
| 100-500 rows | 5-10 | 48px | Balance smoothness vs memory |
| 500-1000 rows | 5-10 | 48px | Keep overscan moderate |
| > 1000 rows | 5-8 | 48px | Minimize overscan for memory |

### Best Practices

1. **Keep overscan small** (5-10 rows) to minimize memory
2. **Use fixed row heights** when possible for best performance
3. **Enable dynamic sizing** only if needed (nested rows)
4. **Throttle scroll events** to maintain 60 FPS
5. **Monitor scroll performance** with Performance Monitor

---

## React Rendering Optimizations

### Concept

Use React.memo, useMemo, and useCallback to prevent unnecessary re-renders and expensive recalculations.

### Component Memoization

```typescript
// Before: Re-renders on every parent update
function BOMRow({ row, onUpdate }: Props) {
  return <div>{row.name}</div>;
}

// After: Only re-renders when props actually change
const BOMRow = React.memo(
  function BOMRow({ row, onUpdate }: Props) {
    return <div>{row.name}</div>;
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if row data changed
    return prevProps.row.id === nextProps.row.id &&
           prevProps.row.name === nextProps.row.name &&
           prevProps.row.quantity === nextProps.row.quantity;
  }
);
```

### Value Memoization

```typescript
function BOMTable({ rows }: Props) {
  // Before: Recalculates on every render
  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
  
  // After: Only recalculates when rows change
  const totalQuantity = useMemo(
    () => rows.reduce((sum, r) => sum + r.quantity, 0),
    [rows]
  );
  
  return <div>Total: {totalQuantity}</div>;
}
```

### Callback Memoization

```typescript
function BOMTable({ rows, onUpdate }: Props) {
  // Before: Creates new function on every render
  const handleRowUpdate = (row: BOMRow) => {
    onUpdate(row);
  };
  
  // After: Reuses same function reference
  const handleRowUpdate = useCallback(
    (row: BOMRow) => {
      onUpdate(row);
    },
    [onUpdate]
  );
  
  return rows.map(row => (
    <BOMRow key={row.id} row={row} onUpdate={handleRowUpdate} />
  ));
}
```

### Performance Impact

- **Before**: All 1000 rows re-render on single field edit → 150ms
- **After**: Only edited row re-renders → 0.05ms
- **Improvement**: 99.97% faster

### Best Practices

1. **Use React.memo for leaf components** (BOMRow, BOMCell)
2. **Implement custom comparison** for complex props
3. **Memoize expensive calculations** with useMemo
4. **Memoize callbacks** passed to child components
5. **Don't over-optimize** - profile first, optimize second
6. **Avoid inline objects/arrays** in props (breaks memoization)

---

## Performance Monitoring (Retired)

The BOM-specific performance monitor and React hook were removed. The following
metrics and examples are retained as design history only.

### Concept

Track key performance metrics in real-time to identify bottlenecks and validate optimizations.

### Metrics Tracked

```typescript
interface BOMPerformanceMetrics {
  initialRenderTime: number;    // Time to first render (ms)
  editTime: number;              // Time for single field edit (ms)
  commitTime: number;            // Time for commit operation (ms)
  activeProxyCount: number;      // Current active Proxy count
  dirtyRowCount: number;         // Current dirty row count
  totalRowCount: number;         // Total row count
  timestamp: number;             // Metric timestamp
}
```

### Usage Pattern

```typescript
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';

function BOMManagement() {
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor();
  
  // Monitor edit operation
  const handleEdit = (row: BOMRow) => {
    const endMonitoring = monitorEdit();
    
    try {
      updateRow(row);
    } finally {
      endMonitoring();
    }
  };
  
  // Monitor commit operation
  const handleCommit = async () => {
    await monitorCommit(async () => {
      return await commitChanges();
    });
  };
  
  // Display metrics
  const metrics = monitor.getLatestMetrics();
  
  return (
    <div>
      <BOMPerformanceDashboard metrics={metrics} />
      <BOMTable onEdit={handleEdit} onCommit={handleCommit} />
    </div>
  );
}
```

### Dashboard Component (Removed)

The BOM performance dashboard is no longer shipped. There is no current component
or import path for the example that previously appeared here.

### Threshold Alerts

| Metric | Warning | Critical |
|--------|---------|----------|
| Initial Render | > 100ms | > 200ms |
| Edit Time | > 50ms | > 100ms |
| Commit Time | > 50ms | > 100ms |
| Active Proxies | > 4,000 | > 8,000 |

### Best Practices

1. **Monitor in development** to catch regressions early
2. **Set up alerts** for production thresholds
3. **Export metrics** for analysis and reporting
4. **Track trends** over time to identify degradation
5. **Correlate metrics** with user feedback

---

## Best Practices

### General Guidelines

1. **Profile the active workspace** before changing rendering behavior
2. **Monitor performance metrics** in production
3. **Profile before optimizing** - measure, don't guess
4. **Test with realistic data** (1000+ rows)
5. **Validate backward compatibility** with existing tests

### Current BOM Editor Organization

The active editor uses the following paths:

```
src/features/product-structure/
├── tabs/bom-mgmt.tsx
├── components/
│   ├── bom-action-dialog.tsx
│   └── bom-editor/
│       ├── bom-workspace.tsx
│       ├── bom-flat-workspace-view.tsx
│       └── bom-tree-workspace-view.tsx
└── hooks/
    ├── use-bom-data.ts
    ├── use-bom-workspace.ts
    └── use-bom-workspace-projection.ts
```

### Testing Strategy

1. **Unit tests** for core utilities (dirty marker, Proxy manager)
2. **Integration tests** for complete workflows
3. **Performance benchmarks** for regression detection
4. **Property-based tests** for correctness validation

### Deployment Strategy

1. **Phase 1**: Internal testing (1-2 weeks)
2. **Phase 2**: 10% rollout (1-2 weeks)
3. **Phase 3**: 50% rollout (1-2 weeks)
4. **Phase 4**: 100% rollout (1 week)

---

## Code Examples

### Retired Integration Example

This example is historical pseudocode and is not expected to compile against the
current application.

```typescript
import { useBOMData } from '@/features/product-structure/hooks/use-bom-data';
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';
// The retired virtual table, dashboard, and feature flags have no import paths.

function BOMManagement() {
  const flags = getBOMPerformanceFeatureFlags();
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor();
  
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
      toast.success('Changes saved successfully');
    },
    onCommitError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
  
  const handleEdit = (row: BOMRow) => {
    const endMonitoring = monitorEdit();
    try {
      handleRowUpdate(row);
    } finally {
      endMonitoring();
    }
  };
  
  const handleSave = async () => {
    await monitorCommit(async () => {
      return await handleCommit();
    });
  };
  
  return (
    <div className="bom-management">
      {flags.enablePerformanceMonitoring && (
        <BOMPerformanceDashboard
          metrics={monitor.getLatestMetrics()}
          variant="compact"
        />
      )}
      
      <div className="bom-toolbar">
        <button onClick={handleSave} disabled={dirtyCount === 0}>
          Save Changes ({dirtyCount})
        </button>
      </div>
      
      {flags.enableVirtualScrolling ? (
        <BOMVirtualTable
          rows={rows}
          columns={columns}
          onRowUpdate={handleEdit}
          isRowDirty={isRowDirty}
        />
      ) : (
        <BOMTable
          rows={rows}
          columns={columns}
          onRowUpdate={handleEdit}
        />
      )}
    </div>
  );
}
```

### Retired Custom Hook Example

This example depends on the removed dirty-marker and lazy-proxy-manager modules
and is not expected to compile against the current application.

```typescript
import { useMemo, useCallback } from 'react';
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker';
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager';

export function useBOMData({ initialRows, onCommitSuccess, onCommitError }: Props) {
  const dirtyMarker = useMemo(() => new BOMDirtyMarker(), []);
  const proxyManager = useMemo(
    () => new BOMProxyManager(dirtyMarker, (row) => row.id),
    [dirtyMarker]
  );
  
  const [rows, setRows] = useState(initialRows);
  
  const handleRowUpdate = useCallback((updatedRow: BOMRow) => {
    dirtyMarker.markDirty(updatedRow.id);
    setRows(prev => prev.map(r => r.id === updatedRow.id ? updatedRow : r));
  }, [dirtyMarker]);
  
  const handleCommit = useCallback(async () => {
    try {
      const dirtyRowIds = dirtyMarker.getDirtyRows();
      const dirtyRows = rows.filter(r => dirtyRowIds.includes(r.id));
      
      const delta = calculateDelta(dirtyRows);
      await saveDelta(delta);
      
      dirtyMarker.clearAll();
      onCommitSuccess?.();
      
      return delta;
    } catch (error) {
      onCommitError?.(error);
      throw error;
    }
  }, [rows, dirtyMarker, onCommitSuccess, onCommitError]);
  
  return {
    rows,
    dirtyCount: dirtyMarker.getDirtyCount(),
    activeProxyCount: proxyManager.getActiveProxyCount(),
    handleRowUpdate,
    handleCommit,
    isRowDirty: (rowId: string) => dirtyMarker.isDirty(rowId),
    getRowProxy: (rowId: string) => {
      const row = rows.find(r => r.id === rowId);
      return row ? proxyManager.getProxy(rowId, row) : null;
    },
    releaseRowProxy: (rowId: string) => proxyManager.releaseProxy(rowId),
  };
}
```

---

## Conclusion

The retired BOM performance experiment explored incremental diff calculation,
lazy Proxy management, virtual scrolling, and React rendering optimizations. Its
results and rollout notes below are preserved for historical context only.

**Historical claims (not current guarantees)**:
- ✅ **99.95% average performance improvement** across all metrics
- ✅ **Backward compatible** with existing functionality
- ✅ **Feature flag controlled** for gradual rollout
- ✅ **Comprehensive monitoring** for production validation
- ✅ **Well-tested** with unit, integration, and property-based tests

For current integration points, see
`src/features/product-structure/tabs/bom-mgmt.tsx`,
`src/features/product-structure/components/bom-action-dialog.tsx`,
`src/features/product-structure/components/bom-editor/bom-workspace.tsx`, and
`src/features/product-structure/hooks/use-bom-workspace.ts`.

For troubleshooting, see [BOM Performance Troubleshooting Guide](./troubleshooting.md).

---

**Document Version**: 1.0  
**Last Updated**: July 20, 2026
**Maintained By**: Frontend Team
