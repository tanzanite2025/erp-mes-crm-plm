# BOM 配方页面无限刷新问题修复

## 问题描述

BOM 配方页面出现无限刷新,控制台不断输出相同的验证警告:
```
[BOM Protocol Sync] Validation warnings: (7) [{…}, {…}, {…}, {…}, {…}, {…}, {…}]
```

## 根本原因

`useBOMProtocolSync` hook 中的 `useEffect` 依赖项配置不当,导致无限循环:

1. **useCallback 依赖循环**: `validation`、`needsSync`、`performSync` 这些 `useCallback` 函数依赖于 `watchedItems` 等状态
2. **useEffect 依赖这些回调**: 每次状态变化时,`useCallback` 创建新的函数引用
3. **新引用触发 useEffect**: 导致重新验证和同步
4. **同步更新状态**: 触发新的渲染周期,回到步骤 1

## 修复方案

### 1. 移除 useCallback 依赖

将验证和同步逻辑直接内联到 `useEffect` 中,避免回调函数引用变化:

```typescript
// 之前: 依赖 useCallback
useEffect(() => {
  const currentValidation = validation()  // ❌ 每次都是新引用
  const shouldSync = needsSync()          // ❌ 每次都是新引用
  // ...
}, [validation, needsSync, performSync])  // ❌ 导致无限循环

// 之后: 直接内联逻辑
useEffect(() => {
  // ✅ 直接调用验证函数
  const currentValidation = validateProtocolConsistency(
    protocolDraft, watchedItems, fields, sections
  )
  
  // ✅ 直接检查是否需要同步
  const hasValidationIssues = currentValidation.errors.length > 0 || 
                               currentValidation.warnings.length > 0
  const itemsChanged = JSON.stringify(watchedItems) !== 
                       JSON.stringify(lastSyncedItemsRef.current)
  const shouldSync = hasValidationIssues || itemsChanged
  
  // ✅ 直接执行同步
  const doSync = () => {
    const syncedProtocol = buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
      sourceBOM, activeSections: sections, fields, watchedItems, authoritativeProtocolDraft
    })
    lastSyncedItemsRef.current = [...watchedItems]
    setDebouncedSyncedProtocol(syncedProtocol)
  }
  // ...
}, [watchedItems, protocolDraft, sections, fields, sourceBOM, authoritativeProtocolDraft, debounceMs, manualSyncOnly])
```

### 2. 防止日志刷屏

添加验证结果比较,只在验证结果真正变化时才输出日志:

```typescript
// 只在验证结果变化时记录
const validationChanged = 
  JSON.stringify(currentValidation) !== JSON.stringify(lastValidationRef.current)

if (validationChanged) {
  lastValidationRef.current = currentValidation
  
  if (currentValidation.errors.length > 0) {
    console.error('[BOM Protocol Sync] Validation errors:', currentValidation.errors)
  }
  if (currentValidation.warnings.length > 0) {
    console.warn('[BOM Protocol Sync] Validation warnings:', currentValidation.warnings)
  }
}
```

### 3. 优化依赖项

只依赖原始数据和配置,不依赖派生的回调函数:

```typescript
// ✅ 只依赖原始数据
[watchedItems, protocolDraft, sections, fields, sourceBOM, authoritativeProtocolDraft, debounceMs, manualSyncOnly]

// ❌ 不依赖派生回调
// [validation, needsSync, performSync]
```

## 修复效果

- ✅ 消除无限循环,页面不再无限刷新
- ✅ 验证警告只在真正变化时输出一次
- ✅ 保持原有的防抖和同步功能
- ✅ 性能优化,减少不必要的重新渲染

## 测试建议

1. 打开 BOM 配方页面,确认不再无限刷新
2. 修改表格中的 section 字段,确认同步正常工作
3. 检查控制台,确认警告只输出一次
4. 测试保存功能,确认数据正确同步到后端

## 相关文件

- `src/features/product-structure/hooks/use-bom-protocol-sync.ts`

## 注意事项

如果仍然看到验证警告,这是正常的(只要不是无限重复):
- `stale-id`: 项目 ID 已更改但协议仍引用旧 ID
- `section-drift`: 项目的 section 与协议中的 sectionCode 不一致
- `empty-branch`: 分支节点没有子节点

这些警告会触发自动同步修复,不影响功能使用。
