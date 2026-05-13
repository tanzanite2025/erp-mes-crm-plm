# BOM Performance Hook Naming Fix

**Date**: May 13, 2026  
**Issue**: TypeError in production - `useBOMData` hook name collision  
**Status**: ✅ **RESOLVED**

---

## Problem Summary

During the BOM performance optimization project (Waves 0-12), we created a new performance-optimized hook called `useBOMData` that accidentally **overwrote** the existing `useBOMData` hook used by the BOM management UI.

### Error Message

```
TypeError: Cannot destructure property 'initialRows' of 'undefined' as it is undefined.
at useBOMData (use-bom-data.ts:153:3)
at BOMMgmt (bom-mgmt.tsx:26:7)
```

### Root Cause

1. **Original Hook** (`use-bom-data.ts`):
   - Purpose: Composite hook for BOM management UI
   - Returns: `{ readResource, saveBOM, deleteBOM, promoteBOM, deriveMBOM, downloadTemplate, parseExcel }`
   - Used by: `bom-mgmt.tsx` component

2. **New Performance Hook** (created in Wave 6):
   - Purpose: Optimized data management with dirty marking and lazy Proxy
   - Returns: `{ rows, handleRowUpdate, handleCommit, dirtyCount, getRowProxy, ... }`
   - Intended for: Virtual table component with performance optimizations

3. **Collision**: Both hooks had the same name and file path, causing the new hook to overwrite the original.

---

## Solution

### 1. Renamed Performance Hook

**Old Name**: `useBOMData`  
**New Name**: `useBOMOptimizedData`

**Files Renamed**:
- `src/features/product-structure/hooks/use-bom-data.ts` → `use-bom-optimized-data.ts`
- `src/features/product-structure/hooks/use-bom-data.test.ts` → `use-bom-optimized-data.test.ts`

### 2. Restored Original Hook

Restored the original `useBOMData` hook from git history (commit `9fc5632d`) with enhancements:

**Added Methods**:
- `promoteBOM(id, status, expectedVersion)` - Promote BOM status
- `deriveMBOM(id, params)` - Derive MBOM from EBOM

**Complete Interface**:
```typescript
interface BOMDataResult {
  readResource: BOMReadDataResource
  saveBOM: (params: { data: SaveBOMInput }) => Promise<boolean>
  deleteBOM: (id: string) => Promise<boolean>
  promoteBOM: (id: string, status: string, expectedVersion: number) => Promise<void>
  deriveMBOM: (id: string, params: { description: string; revisionNo: string }) => Promise<void>
  downloadTemplate: () => Promise<void>
  parseExcel: ReturnType<typeof useBOMImportExport>['parseExcel']
}
```

### 3. Updated References

**Files Updated**:
- `src/features/product-structure/hooks/use-bom-optimized-data.ts` - Renamed function and types
- `src/features/product-structure/hooks/use-bom-optimized-data.test.ts` - Updated imports and references
- `src/features/product-structure/__tests__/bom-integration.test.tsx` - Updated imports

---

## Hook Comparison

| Aspect | `useBOMData` (Original) | `useBOMOptimizedData` (New) |
|--------|-------------------------|------------------------------|
| **Purpose** | BOM management UI operations | Performance-optimized data management |
| **Returns** | API methods (CRUD, import/export) | Data state and handlers |
| **Used By** | `bom-mgmt.tsx` | Virtual table components (future) |
| **Dependencies** | `useBOMReadData`, `useBOMWriteActions`, `useBOMImportExport` | `BOMDirtyMarker`, `BOMProxyManager` |
| **Performance** | Standard | Optimized (dirty marking, lazy Proxy) |

---

## Usage Examples

### Original Hook (for UI)

```typescript
// In bom-mgmt.tsx
import { useBOMData } from '../hooks/use-bom-data'

export function BOMMgmt() {
  const {
    readResource,
    saveBOM,
    deleteBOM,
    promoteBOM,
    deriveMBOM,
    downloadTemplate,
    parseExcel,
  } = useBOMData()
  
  // Use for BOM management operations
}
```

### Performance Hook (for virtual table)

```typescript
// In bom-virtual-table.tsx (future implementation)
import { useBOMOptimizedData } from '../hooks/use-bom-optimized-data'

export function BOMVirtualTable({ initialRows }) {
  const {
    rows,
    handleRowUpdate,
    handleCommit,
    dirtyCount,
    getRowProxy,
    releaseRowProxy,
  } = useBOMOptimizedData({
    initialRows,
    onCommitSuccess: (delta) => {
      console.log('Committed:', delta)
    },
  })
  
  // Use for optimized data management
}
```

---

## Testing

### Type Checking

```bash
npx tsc --noEmit
# Result: ✅ No errors
```

### Unit Tests

```bash
npm run test src/features/product-structure/hooks/use-bom-optimized-data.test.ts
# Result: ✅ All tests pass
```

### Integration Tests

```bash
npm run test src/features/product-structure/__tests__/bom-integration.test.tsx
# Result: ✅ All tests pass
```

---

## Impact Assessment

### ✅ Fixed

- BOM management UI now works correctly
- No more `undefined` destructuring errors
- All CRUD operations functional
- Import/export functionality restored

### ⚠️ Note

The performance-optimized hook (`useBOMOptimizedData`) is **not yet integrated** into the BOM management UI. This was intentional - the hook was created as part of the performance optimization infrastructure but requires additional integration work (Wave 8 Task 16.1) to be used in production.

### 📋 Next Steps

To integrate the performance optimizations into the BOM management UI:

1. **Update `bom-mgmt.tsx`** to use `useBOMOptimizedData` for data management
2. **Replace `BOMTable`** with `BOMVirtualTable` component
3. **Enable feature flags** for gradual rollout
4. **Monitor performance** metrics in production

See [Deployment Rollout Plan](./bom-performance-deployment-rollout-plan.md) for details.

---

## Lessons Learned

### 1. Avoid Name Collisions

When creating new hooks, always check for existing hooks with the same name:

```bash
# Search for existing hooks
git log --all --oneline --follow -- "path/to/hook.ts"

# Check current usage
grep -r "useHookName" src/
```

### 2. Use Descriptive Names

The new hook name `useBOMOptimizedData` is more descriptive and clearly indicates its purpose.

### 3. Document Hook Purpose

Add clear documentation at the top of each hook file explaining:
- Purpose
- Use cases
- Dependencies
- Performance characteristics

### 4. Test Before Committing

Always run type checking and tests before committing:

```bash
npx tsc --noEmit
npm run test
```

---

## Files Changed

### Created
- `src/features/product-structure/hooks/use-bom-optimized-data.ts` (renamed from `use-bom-data.ts`)
- `src/features/product-structure/hooks/use-bom-optimized-data.test.ts` (renamed from `use-bom-data.test.ts`)
- `docs/bom-performance-hook-naming-fix.md` (this document)

### Modified
- `src/features/product-structure/hooks/use-bom-data.ts` (restored from git + enhancements)
- `src/features/product-structure/__tests__/bom-integration.test.tsx` (updated imports)

### Deleted
- None (files were renamed, not deleted)

---

## Verification Checklist

- [x] TypeScript compilation successful
- [x] No runtime errors in BOM management UI
- [x] All unit tests passing
- [x] All integration tests passing
- [x] Original `useBOMData` hook restored
- [x] Performance hook renamed to `useBOMOptimizedData`
- [x] All imports updated
- [x] Documentation created

---

## Contact

For questions about this fix, contact:
- **Frontend Team**: #frontend-team
- **BOM Performance Project**: #bom-performance

---

**Document Version**: 1.0  
**Last Updated**: May 13, 2026  
**Status**: Issue Resolved ✅
