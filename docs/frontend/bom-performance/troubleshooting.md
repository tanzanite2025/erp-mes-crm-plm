# BOM Performance Troubleshooting Guide (Historical)

**Version**: 1.0  
**Last Updated**: July 20, 2026
**Status**: Historical; the dedicated BOM performance experiment has been retired
**Target Audience**: Frontend Developers, DevOps Engineers, Support Team

> The feature flags, virtual-scroller configuration, row/cell components, and
> performance dashboard referenced by the original guide were removed. Treat the
> remaining examples as historical diagnostics, not runnable current APIs. For the
> active editor, begin with
> `src/features/product-structure/components/bom-editor/bom-workspace.tsx` and
> `src/features/product-structure/hooks/use-bom-workspace.ts`.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Error Messages](#error-messages)
3. [Performance Debugging](#performance-debugging)
4. [Recovery Procedures](#recovery-procedures)
5. [Monitoring Dashboard Usage](#monitoring-dashboard-usage)
6. [Diagnostic Tools](#diagnostic-tools)
7. [FAQ](#faq)

---

## Common Issues

### Issue 1: Slow Initial Render (> 100ms)

**Symptoms**:
- Initial page load takes longer than expected
- A browser profiler trace shows a long initial render
- Users report slow loading

**Possible Causes**:
1. Virtual scrolling not enabled
2. Too many rows being rendered initially
3. Heavy computations in render path
4. Large overscan buffer

**Current checks**:

1. Capture a React Profiler trace around `BOMWorkspace`.
2. Inspect the projection work in `hooks/use-bom-workspace-projection.ts`.
3. Confirm whether the summary or tree view is rendering the unexpected node set.
4. Measure before changing the active workspace behavior.

**Prevention**:
- Keep overscan between 5-10 rows
- Enable virtual scrolling for datasets > 100 rows
- Monitor initial render metrics in production

---

### Issue 2: Slow Edit Operations (> 50ms)

**Symptoms**:
- Typing feels laggy
- Field updates are delayed
- Performance dashboard shows high edit time

**Possible Causes**:
1. React re-rendering too many components
2. Missing React.memo on row components
3. Inline functions/objects breaking memoization
4. Heavy computations in onChange handlers

**Solutions**:

```typescript
// Historical memoization sketch; there is no current BOMRow module.
export const BOMRow = React.memo(
  function BOMRow({ row, onUpdate }: Props) {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Custom comparison
    return prevProps.row.id === nextProps.row.id &&
           prevProps.row.name === nextProps.row.name;
  }
);

// 3. Avoid inline functions in props
// BAD:
<BOMRow row={row} onUpdate={(r) => handleUpdate(r)} />

// GOOD:
const handleUpdate = useCallback((r) => handleUpdate(r), []);
<BOMRow row={row} onUpdate={handleUpdate} />

// 4. Profile edit performance
const handleEdit = (row: BOMRow) => {
  const endMonitoring = monitorEdit();
  try {
    handleRowUpdate(row);
  } finally {
    endMonitoring();
    const metrics = monitor.getLatestMetrics();
    console.log('Edit time:', metrics?.editTime);
  }
};
```

**Prevention**:
- Profile current workspace nodes before adding memoization
- Memoize callbacks with useCallback
- Avoid inline objects/arrays in props
- Profile edit operations regularly

---

### Issue 3: Slow Commit Operations (> 50ms)

**Symptoms**:
- Save button takes long to complete
- A measured save operation has high end-to-end latency
- Users report slow saves

**Possible Causes**:
1. Dirty marking not enabled
2. Comparing all rows instead of dirty rows only
3. Large number of dirty rows
4. Network latency (not optimization issue)

**Solutions**:

```typescript
// Historical prototype diagnostic: check dirty row count
const { dirtyCount, rows } = useBOMData({ initialRows });
console.log('Dirty rows:', dirtyCount, 'Total rows:', rows.length);
console.log('Dirty percentage:', (dirtyCount / rows.length * 100).toFixed(1) + '%');

// Historical prototype diagnostic: verify only dirty rows are compared
import { BOMDirtyMarker } from '@/lib/delta/dirty-marker';
const dirtyMarker = new BOMDirtyMarker();
const dirtyRowIds = dirtyMarker.getDirtyRows();
console.log('Dirty row IDs:', dirtyRowIds);

// Profile commit performance
const handleCommit = async () => {
  const start = performance.now();
  await monitorCommit(async () => {
    return await commitChanges();
  });
  const end = performance.now();
  console.log('Total commit time (including network):', end - start);
  
  const metrics = monitor.getLatestMetrics();
  console.log('Diff calculation time:', metrics?.commitTime);
};
```

**Prevention**:
- Enable dirty marking for all datasets > 100 rows
- Monitor dirty row percentage (should be < 20% typically)
- Separate diff calculation time from network time
- Set up alerts for commit time > 50ms

---

### Issue 4: High Memory Usage

**Symptoms**:
- Browser tab uses excessive memory
- Performance degrades over time
- Active Proxy count keeps increasing

**Possible Causes**:
1. Lazy Proxy not enabled
2. Proxies not being released
3. Memory leak in Proxy manager
4. Too many dirty rows not being committed

**Solutions**:

```typescript
// Historical prototype diagnostic: check active Proxy count
const { activeProxyCount } = useBOMData({ initialRows });
console.log('Active Proxies:', activeProxyCount);
console.log('Expected max:', rows.length * 0.2); // Should be ~20% of total

// Historical prototype diagnostic: force release clean Proxies
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager';
const proxyManager = new BOMProxyManager(dirtyMarker, (row) => row.id);
proxyManager.releaseCleanProxies();
console.log('Active Proxies after cleanup:', proxyManager.getActiveProxyCount());

// Historical prototype diagnostic: monitor Proxy lifecycle
const handleScroll = () => {
  console.log('Before scroll - Active Proxies:', activeProxyCount);
  // Scroll happens
  setTimeout(() => {
    console.log('After scroll - Active Proxies:', activeProxyCount);
  }, 100);
};
```

**Prevention**:
- Enable lazy Proxy for all datasets > 100 rows
- Monitor active Proxy count (should be < 20% of total rows)
- Commit dirty rows regularly to allow Proxy release
- Set up alerts for Proxy count > 4,000

---

### Issue 5: Changes Not Persisting

**Symptoms**:
- User edits are lost after scroll
- Changes disappear after commit
- Dirty markers not working

**Possible Causes**:
1. Dirty markers cleared prematurely
2. Proxy released while still dirty
3. State not updated correctly
4. Commit failed silently

**Solutions**:

```typescript
// 1. Verify dirty markers are preserved
const { isRowDirty } = useBOMData({ initialRows });
console.log('Row 1 dirty:', isRowDirty('row-1'));

// 2. Check Proxy preservation for dirty rows
import { BOMProxyManager } from '@/lib/delta/lazy-proxy-manager';
const proxyManager = new BOMProxyManager(dirtyMarker, (row) => row.id);

// Mark row as dirty
dirtyMarker.markDirty('row-1');

// Try to release - should not release
proxyManager.releaseProxy('row-1');
console.log('Proxy still active:', proxyManager.hasProxy('row-1')); // Should be true

// 3. Add commit error handling
const handleCommit = async () => {
  try {
    await commitChanges();
    console.log('Commit successful');
  } catch (error) {
    console.error('Commit failed:', error);
    // Dirty markers should still be preserved
    console.log('Dirty count after error:', dirtyCount);
  }
};

// 4. Enable local state persistence
import { ErrorRecoveryHandler } from '@/lib/delta/errors';
const recoveryHandler = new ErrorRecoveryHandler();
recoveryHandler.persistLocalState(rows, dirtyMarker.getDirtyRows());
```

**Prevention**:
- Never clear dirty markers before commit succeeds
- Preserve dirty Proxies during scroll
- Add comprehensive error handling
- Enable local state persistence

---

## Error Messages (Historical)

The delta, proxy-tracker, and virtual-scroller error classes in this section were
removed with the experiment. Use current runtime errors and logs when diagnosing
the active workspace.

### Error: "DiffEngineError: Failed to calculate delta"

**Meaning**: The diff engine encountered an error while comparing rows.

**Possible Causes**:
- Invalid row data structure
- Missing required fields
- Circular references in data

**Solution**:

```typescript
import { DiffEngineError } from '@/lib/delta/errors';

try {
  const delta = calculateDelta(dirtyRows);
} catch (error) {
  if (error instanceof DiffEngineError) {
    console.error('Diff engine error:', error.message);
    console.error('Operation:', error.operation);
    console.error('Context:', error.context);
    
    // Fallback to full diff
    const delta = calculateFullDiff(allRows);
  }
}
```

---

### Error: "ProxyTrackerError: Proxy creation failed"

**Meaning**: Failed to create a Proxy for a row.

**Possible Causes**:
- Row data is not an object
- Row is frozen or sealed
- Proxy already exists

**Solution**:

```typescript
import { ProxyTrackerError } from '@/lib/delta/errors';

try {
  const proxy = proxyManager.getProxy(row.id, row);
} catch (error) {
  if (error instanceof ProxyTrackerError) {
    console.error('Proxy tracker error:', error.message);
    console.error('Operation:', error.operation);
    console.error('Row ID:', error.context?.rowId);
    
    // Use row directly without Proxy
    return row;
  }
}
```

---

### Error: "VirtualScrollerError: Scroll calculation failed"

**Meaning**: Virtual scroller failed to calculate scroll position.

**Possible Causes**:
- Invalid scroll container
- Missing ref
- Incorrect row heights

**Solution**:

```typescript
import { VirtualScrollerError } from '@/lib/delta/errors';

try {
  const virtualRows = virtualizer.getVirtualItems();
} catch (error) {
  if (error instanceof VirtualScrollerError) {
    console.error('Virtual scroller error:', error.message);
    console.error('Context:', error.context);
    
    // Fallback to non-virtual rendering
    return <BOMTable rows={rows} />;
  }
}
```

---

## Performance Debugging

### Using Performance Monitor (Removed)

The BOM-specific monitor and hook are no longer available. This example is kept
only to document the former diagnostic flow.

```typescript
import { useBOMPerformanceMonitor } from '@/lib/performance/use-bom-performance-monitor';

function BOMManagement() {
  const { monitor, monitorEdit, monitorCommit } = useBOMPerformanceMonitor();
  
  // Get latest metrics
  const metrics = monitor.getLatestMetrics();
  console.log('Performance metrics:', metrics);
  
  // Get average metrics
  const average = monitor.getAverageMetrics();
  console.log('Average performance:', average);
  
  // Export metrics for analysis
  const json = monitor.exportMetrics();
  console.log('All metrics:', json);
  
  // Check if metrics meet targets
  const meetsTargets = 
    metrics.initialRenderTime <= 100 &&
    metrics.editTime <= 50 &&
    metrics.commitTime <= 50 &&
    metrics.activeProxyCount <= 4000;
  
  console.log('Meets performance targets:', meetsTargets);
}
```

### Using Browser DevTools

1. **Performance Tab**:
   ```
   1. Open DevTools (F12)
   2. Go to Performance tab
   3. Click Record
   4. Perform BOM operations (load, edit, commit)
   5. Stop recording
   6. Analyze flame graph for bottlenecks
   ```

2. **Memory Tab**:
   ```
   1. Open DevTools (F12)
   2. Go to Memory tab
   3. Take heap snapshot before operations
   4. Perform BOM operations
   5. Take heap snapshot after operations
   6. Compare snapshots to find memory leaks
   ```

3. **React DevTools**:
   ```
   1. Install React DevTools extension
   2. Open DevTools
   3. Go to Profiler tab
   4. Click Record
   5. Perform BOM operations
   6. Stop recording
   7. Analyze component render times
   ```

### Performance Checklist

- [ ] Initial render time ≤ 100ms
- [ ] Edit time ≤ 50ms
- [ ] Commit time ≤ 50ms
- [ ] Active Proxy count ≤ 4,000
- [ ] Dirty row percentage < 20%
- [ ] No memory leaks (stable memory over time)
- [ ] Scroll performance 60 FPS
- [ ] No unnecessary re-renders

---

## Recovery Procedures

### Procedure 1: Graceful Degradation

If optimizations fail, fall back to legacy behavior:

```typescript
import { ErrorRecoveryHandler } from '@/lib/delta/errors';

const recoveryHandler = new ErrorRecoveryHandler();

try {
  // Try optimized path
  const delta = calculateDeltaOptimized(dirtyRows);
} catch (error) {
  // Fall back to legacy path
  console.warn('Optimization failed, falling back to legacy:', error);
  const delta = recoveryHandler.fallbackToFullDiff(allRows);
}
```

### Procedure 2: Local State Persistence

Persist state locally to prevent data loss:

```typescript
import { ErrorRecoveryHandler } from '@/lib/delta/errors';

const recoveryHandler = new ErrorRecoveryHandler();

// Persist state before risky operation
recoveryHandler.persistLocalState(rows, dirtyMarker.getDirtyRows());

try {
  await commitChanges();
  recoveryHandler.clearLocalState();
} catch (error) {
  // Restore from local state
  const restored = recoveryHandler.restoreLocalState();
  if (restored) {
    setRows(restored.rows);
    restored.dirtyRowIds.forEach(id => dirtyMarker.markDirty(id));
  }
}
```

### Procedure 3: Retry with Exponential Backoff

Retry failed operations with increasing delays:

```typescript
import { ErrorRecoveryHandler } from '@/lib/delta/errors';

const recoveryHandler = new ErrorRecoveryHandler();

const handleCommit = async () => {
  const result = await recoveryHandler.retryWithBackoff(
    async () => await commitChanges(),
    {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 5000,
    }
  );
  
  if (result.success) {
    console.log('Commit successful after', result.attempts, 'attempts');
  } else {
    console.error('Commit failed after', result.attempts, 'attempts:', result.error);
  }
};
```

---

## Monitoring Dashboard Usage (Removed)

### Dashboard Variants

The compact and full dashboard variants were removed. Use browser profiling and
the active workspace code paths for current investigations.

### Interpreting Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Initial Render | < 50ms | 50-100ms | > 100ms |
| Edit Time | < 25ms | 25-50ms | > 50ms |
| Commit Time | < 25ms | 25-50ms | > 50ms |
| Active Proxies | < 2,000 | 2,000-4,000 | > 4,000 |
| Dirty Rows | < 10% | 10-20% | > 20% |

### Threshold Indicators

- 🟢 **Green**: Performance is excellent
- 🟡 **Yellow**: Performance is acceptable but approaching limits
- 🔴 **Red**: Performance is below target, action required

---

## Diagnostic Tools

### Tool 1: Performance Report Generator (Removed)

This generator depends on the removed BOM performance monitor and is historical
pseudocode, not a current diagnostic tool.

```typescript
import { BOMPerformanceMonitor } from '@/lib/performance/bom-performance-monitor';

function generatePerformanceReport() {
  const monitor = new BOMPerformanceMonitor();
  const metrics = monitor.getAllMetrics();
  const average = monitor.getAverageMetrics();
  
  const report = {
    summary: {
      totalMeasurements: metrics.length,
      averageInitialRender: average?.initialRenderTime,
      averageEditTime: average?.editTime,
      averageCommitTime: average?.commitTime,
      averageActiveProxies: average?.activeProxyCount,
    },
    details: metrics,
    timestamp: new Date().toISOString(),
  };
  
  console.log('Performance Report:', report);
  return report;
}
```

### Tool 2: Memory Leak Detector

```typescript
function detectMemoryLeaks() {
  const { activeProxyCount } = useBOMData({ initialRows });
  const measurements: number[] = [];
  
  // Measure Proxy count over time
  const interval = setInterval(() => {
    measurements.push(activeProxyCount);
    
    if (measurements.length >= 10) {
      clearInterval(interval);
      
      // Check if Proxy count is increasing
      const trend = measurements[measurements.length - 1] - measurements[0];
      
      if (trend > 100) {
        console.warn('Potential memory leak detected!');
        console.warn('Proxy count increased by:', trend);
        console.warn('Measurements:', measurements);
      } else {
        console.log('No memory leak detected');
      }
    }
  }, 1000);
}
```

### Tool 3: Render Performance Profiler

```typescript
function profileRenderPerformance() {
  let renderCount = 0;
  let totalRenderTime = 0;
  
  const BOMRowProfiled = React.memo(
    function BOMRow(props: Props) {
      const start = performance.now();
      
      useEffect(() => {
        const end = performance.now();
        renderCount++;
        totalRenderTime += (end - start);
        
        console.log('Render #' + renderCount + ':', (end - start).toFixed(2) + 'ms');
        console.log('Average render time:', (totalRenderTime / renderCount).toFixed(2) + 'ms');
      });
      
      return <BOMRow {...props} />;
    }
  );
  
  return BOMRowProfiled;
}
```

---

## FAQ

### Q: How do I enable/disable optimizations?

**A**: There is no current BOM-specific performance feature-flag API. The retired
flags have no supported replacement; evaluate changes in the active workspace
implementation instead.

### Q: How do I know if optimizations are working?

**A**: Check performance metrics:

```typescript
const { monitor } = useBOMPerformanceMonitor();
const metrics = monitor.getLatestMetrics();

console.log('Optimizations working:', {
  initialRender: metrics.initialRenderTime < 100,
  edit: metrics.editTime < 50,
  commit: metrics.commitTime < 50,
  proxies: metrics.activeProxyCount < 4000,
});
```

### Q: What should I do if performance degrades over time?

**A**: Follow this checklist:

1. Check for memory leaks (increasing Proxy count)
2. Monitor dirty row percentage (should be < 20%)
3. Verify optimizations are still enabled
4. Check for regressions in recent code changes
5. Profile with browser DevTools
6. Export and analyze performance metrics

### Q: Can I use optimizations with nested BOM structures?

**A**: The retired virtual-scroller configuration cannot be enabled. Nested BOM
structures are handled by the current workspace projection in
`src/features/product-structure/hooks/use-bom-workspace-projection.ts`.

### Q: How do I debug "Changes not persisting" issues?

**A**: Use this diagnostic:

```typescript
function debugChangePersistence(rowId: string) {
  console.log('=== Change Persistence Debug ===');
  console.log('Row ID:', rowId);
  console.log('Is dirty:', dirtyMarker.isDirty(rowId));
  console.log('Has Proxy:', proxyManager.hasProxy(rowId));
  console.log('Dirty rows:', dirtyMarker.getDirtyRows());
  console.log('Active Proxies:', proxyManager.getActiveProxyCount());
  
  // Try to get Proxy
  const proxy = proxyManager.getProxy(rowId, row);
  console.log('Proxy retrieved:', !!proxy);
  
  // Try to release Proxy
  proxyManager.releaseProxy(rowId);
  console.log('Proxy still active after release:', proxyManager.hasProxy(rowId));
}
```

### Q: What are the minimum requirements for optimizations?

**A**:
- React 18+
- TanStack Virtual 3+
- Modern browser with Proxy support
- Dataset size > 100 rows (recommended)

### Q: How do I rollback if optimizations cause issues?

**A**: The retired feature flags cannot roll back the active editor. Revert a
specific workspace change through the normal source-control and release process.

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check logs**: Look for error messages in browser console
2. **Capture evidence**: Attach a browser profiler trace and reproduction steps
3. **Create issue**: Include error messages, metrics, and reproduction steps
4. **Contact team**: Reach out to frontend team for assistance

**Support Channels**:
- Internal Slack: #frontend-support
- Email: frontend-team@company.com
- Documentation: [BOM Performance Optimization Guide](./optimization.md)

---

**Document Version**: 1.0  
**Last Updated**: July 20, 2026
**Maintained By**: Frontend Team
