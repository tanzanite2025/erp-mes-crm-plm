# BOM 架构 - 新发现的 5 个关键问题

**发现日期**: 2026-05-13  
**状态**: 🔧 修复中

---

## 问题总览

| # | 问题 | 严重程度 | 状态 |
|---|------|---------|------|
| 1 | 三重数据清洗冗余 | 🟡 中 | ✅ 已修复 |
| 2 | 协议解析"私产"残留 | 🟡 中 | 🔧 修复中 |
| 3 | SDRTS 协议"真空状态" | 🔴 高 | ✅ 已修复 |
| 4 | 测试与实现脱节 | 🟡 中 | ⚠️ 待修复 |
| 5 | 性能风险：协议实时同步 | 🟠 中高 | ⚠️ 待优化 |

---

## 问题 1: 三重数据清洗冗余 ✅

### 问题描述
Service 层存在"三重清洗"现象：
1. 第一重：`normalizeBOMInput` 工具函数
2. 第二重：`sanitizeBOMInput` 中手动 trim
3. 第三重：`saveBOMSchema.parse` (Zod)

### 根本原因
Zod schema 已经全面使用了 `.trim()`，Service 层的手动 trim 是完全冗余的。

### 风险
- 维护成本增加
- 逻辑不一致可能导致运行时崩溃
- 代码冗余

### 修复方案
移除 Service 层的手动 trim 函数，完全依赖 Zod schema 的 `.trim()`。

**修复前**:
```typescript
function trimToUndefined(value?: string) {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    return trimmed === '' ? undefined : trimmed
}

function trimToNull(value?: string | null) {
    if (value === undefined || value === null) return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

function trimRequiredValue(value?: string) {
    return (value || '').trim()
}

function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
    const sanitizedPayload = saveBOMSchema.parse({
        ...normalizedData,
        description: trimToUndefined(data.description),
        revisionNo: trimToUndefined(normalizedData.revisionNo),
        // ... 大量手动 trim
    })
}
```

**修复后**:
```typescript
/**
 * 清洗 BOM 输入数据
 * 
 * 注意：Zod schema 已经包含 .trim() 处理，这里只做必要的结构转换
 * 避免重复的手动 trim 操作
 */
function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
    const {
        siteCode: _siteCode,
        isDefaultSite: _isDefaultSite,
        ...normalizedData
    } = normalizeBOMInput(data)
    
    // Zod schema 会自动处理 trim，我们只需要做结构转换
    const sanitizedPayload = saveBOMSchema.parse({
        ...normalizedData,
        items: data.items.map((item: BOMItemDraft) => ({
            ...item,
            section: normalizeBOMSectionValue([], item.section),
        })),
    })

    return {
        ...sanitizedPayload,
        _v: sanitizedPayload.version,
        relationSidecar: normalizedData.relationSidecar,
        _sidecarDelta: data._sidecarDelta,
    }
}
```

### 修复文件
- ✅ `src/features/product-structure/services/bom-service.ts`

### 验证
- [ ] TypeScript 编译通过
- [ ] 测试通过
- [ ] 手动测试保存 BOM 功能

---

## 问题 2: 协议解析"私产"残留 🔧

### 问题描述
尽管引入了 `bom-node-id-resolver.ts`，但多个文件仍在手动检查 `nodeId.startsWith('field:')`。

### 发现的文件
1. `use-bom-protocol-recovery.ts` - 2 处
2. `use-bom-protocol-sync.ts` - 2 处
3. `bom-workspace-parent-children-protocol-adapter.ts` - 1 处

### 根本原因
ID 解析规则没有实现真正的"单一事实源"。

### 风险
- 如果 Resolver 修改了 ID 格式，适配器层会产生隐蔽的 Bug
- 树结构无法正确关联表单行
- 维护困难

### 修复方案
使用统一的 `parseLeafNodeId` 替换所有手动的 `startsWith('field:')` 检查。

**修复前**:
```typescript
const isFieldIdBased = itemNode.id.startsWith('field:')
if (isFieldIdBased) {
    const fieldId = itemNode.id.slice('field:'.length)
    // ...
}
```

**修复后**:
```typescript
import { parseLeafNodeId } from '../../utils/bom-node-id-resolver'

const parsed = parseLeafNodeId(itemNode.id)
if (parsed && 'fieldId' in parsed) {
    const fieldId = parsed.fieldId
    // ...
}
```

### 修复文件
- 🔧 `src/features/product-structure/hooks/use-bom-protocol-recovery.ts`
- 🔧 `src/features/product-structure/hooks/use-bom-protocol-sync.ts`
- 🔧 `src/features/product-structure/hooks/bom-workspace-parent-children-protocol-adapter.ts`

### 验证
- [ ] TypeScript 编译通过
- [ ] 所有测试通过
- [ ] ID 解析逻辑统一

---

## 问题 3: SDRTS 协议"真空状态" ✅

### 问题描述
`_sidecarDelta` 在前端定义和生成，但：
- ❌ `bom-service.ts` 的 `saveBOM` 没有透传
- ❌ Go 后端 `SaveBOMInput` 没有这个字段

### 根本原因
SDRTS 处于"前端自嗨"状态，Delta 数据在 Service 层被丢弃。

### 风险
- 🔴 **严重**: 审计日志无法还原用户的树结构操作意图
- 🔴 **严重**: 后端收到的依然是全量 JSON
- 🔴 **严重**: SDRTS 协议完全失效

### 修复方案

#### 前端修复
已在之前的修复中完成：
```typescript
// bom-service.ts
return {
    ...sanitizedPayload,
    _v: sanitizedPayload.version,
    relationSidecar: normalizedData.relationSidecar,
    // ✅ 保留 _sidecarDelta
    _sidecarDelta: data._sidecarDelta,
}
```

#### 后端修复
已在之前的修复中完成：
```go
// engineering_master_types.go
type SaveBOMInput struct {
    // ... 现有字段
    SidecarDelta *DeltaSet `json:"_sidecarDelta,omitempty"`
}

// bom_service.go
if input.SidecarDelta != nil && len(input.SidecarDelta.Entries) > 0 {
    processSidecarDelta(ctx, tx, saved.ID, input.SidecarDelta)
}
```

### 修复文件
- ✅ `src/features/product-structure/services/bom-service.ts`
- ✅ `server/services/engineering_master_types.go`
- ✅ `server/services/bom_service.go`

### 验证
- ✅ TypeScript 编译通过
- ✅ Go 编译通过
- ✅ `_sidecarDelta` 被正确发送和接收
- [ ] 端到端测试

---

## 问题 4: 测试与实现脱节 ⚠️

### 问题描述
测试用例手动构造协议草案对象，而不是使用 `buildLive...` 系列函数。

### 风险
- "测试通过了，但线上挂了"
- 如果实际运行中生成的节点 ID 格式发生变化，测试无法捕捉到破坏性变更

### 示例
```typescript
// ❌ 测试中手动构造
const protocolDraft = {
    branchNodes: [
        { id: 'section:MAIN', ... }  // 硬编码字符串
    ],
    itemNodes: [
        { id: 'field:field-1', ... }  // 硬编码字符串
    ]
}

// ✅ 应该使用实际的构建函数
const protocolDraft = buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
    sourceBOM,
    activeSections,
    fields,
    watchedItems,
})
```

### 修复方案
1. 更新测试用例使用实际的构建函数
2. 使用 `resolveLeafNodeId`, `resolveSectionBranchNodeId` 等函数生成 ID
3. 避免硬编码 ID 字符串

### 修复文件
- ⚠️ `src/features/product-structure/hooks/bom-workspace-source/model-builder.test.ts`
- ⚠️ `src/features/product-structure/hooks/bom-workspace-branch-relation/synthetic-builder.test.ts`
- ⚠️ `src/features/product-structure/hooks/bom-workspace-branch-relation/protocol-adapter.test.ts`
- ⚠️ `src/features/product-structure/hooks/bom-workspace-branch-relation/integration.test.ts`

### 验证
- [ ] 所有测试通过
- [ ] 测试使用实际的构建函数
- [ ] 没有硬编码的 ID 字符串

---

## 问题 5: 性能风险：协议实时同步 ⚠️

### 问题描述
`useBOMProtocolSync.ts` 在表单每次变动时都会重新计算 `liveProtocolDraft` 并进行 Diff。

### 风险
- 对于拥有数百行物料的复杂 BOM，实时的深层对象对比和树重构可能导致 UI 明显掉帧
- 缺乏防抖或按需触发机制

### 性能分析
```typescript
// 当前实现：每次 watchedItems 变化都触发
useEffect(() => {
    const currentValidation = validation()  // 🔴 深层对象对比
    // ...
}, [validation])

const syncedProtocol = shouldSync ? performSync() : protocolDraft  // 🔴 重新构建整个协议
```

### 修复方案

#### 方案 1: 防抖处理
```typescript
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const debouncedItems = useDebouncedValue(watchedItems, 300)

useEffect(() => {
    const currentValidation = validation()
    // ...
}, [debouncedItems])  // 使用防抖后的值
```

#### 方案 2: 按需触发
```typescript
// 只在保存时同步，而不是实时同步
const syncBeforeSave = useCallback(() => {
    if (needsSync()) {
        return performSync()
    }
    return protocolDraft
}, [needsSync, performSync, protocolDraft])

// 在 Dialog 的 onSubmit 中调用
const handleSubmit = async (data) => {
    const syncedProtocol = syncBeforeSave()
    await saveBOM({ ...data, relationSidecar: syncedProtocol })
}
```

#### 方案 3: 增量更新
```typescript
// 不重新构建整个协议，只更新变化的部分
const performIncrementalSync = useCallback(() => {
    const changes = detectChanges(watchedItems, lastSyncedItemsRef.current)
    
    if (changes.length === 0) {
        return protocolDraft
    }
    
    // 只更新变化的节点
    return applyChangesToProtocol(protocolDraft, changes)
}, [watchedItems, protocolDraft])
```

### 推荐方案
**方案 2 (按需触发)** + **方案 1 (防抖)** 的组合：
- 编辑时使用防抖的轻量级验证
- 保存时执行完整的同步

### 修复文件
- ⚠️ `src/features/product-structure/hooks/use-bom-protocol-sync.ts`

### 验证
- [ ] 性能测试（100+ 行物料）
- [ ] UI 不掉帧
- [ ] 同步逻辑正确

---

## 修复优先级

### P0 - 立即修复（已完成）
1. ✅ 问题 1: 三重数据清洗冗余
2. ✅ 问题 3: SDRTS 协议"真空状态"

### P1 - 本周完成
3. 🔧 问题 2: 协议解析"私产"残留

### P2 - 下周完成
4. ⚠️ 问题 4: 测试与实现脱节
5. ⚠️ 问题 5: 性能风险：协议实时同步

---

## 修复进度

- [x] 问题 1 修复完成
- [x] 问题 3 修复完成
- [ ] 问题 2 修复中
- [ ] 问题 4 待修复
- [ ] 问题 5 待优化

---

**最后更新**: 2026-05-13  
**状态**: 2/5 已完成，1/5 修复中，2/5 待处理
