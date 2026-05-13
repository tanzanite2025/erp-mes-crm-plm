# BOM 架构重构 - 关键问题修复报告

## 修复日期
2026-05-13

## 问题概述

在代码审查中发现了 4 个关键架构问题，其中 2 个已立即修复，2 个需要后端配合。

---

## ✅ 已修复问题

### 1. ID 解析逻辑"私产"问题

**问题描述**:
- `protocol-adapter.ts` 中存在 `resolveFieldIdFromProtocolItemNodeId` 私有函数
- 手动使用 `nodeId.startsWith('field:')` 解析 ID
- 违反了"单一真相来源"原则

**风险**:
- ID 格式变更（如 `field:` → `f:`）会导致适配器崩溃
- 解析逻辑分散，难以维护

**修复方案**:
```typescript
// ❌ 修复前：手动解析
function resolveFieldIdFromProtocolItemNodeId(nodeId: string) {
  if (!nodeId.startsWith('field:')) {
    return undefined
  }
  const rawFieldId = nodeId.slice('field:'.length).trim()
  return rawFieldId || undefined
}

// ✅ 修复后：使用统一的 ID 解析器
import { parseLeafNodeId } from '../../utils/bom-node-id-resolver'

function resolveFieldReferenceByProtocolNodeId(
  nodeId: string,
  referencesByFieldId: Map<string, BOMWorkspaceResolvedFormItemReference>
) {
  const directMatch = referencesByFieldId.get(nodeId)
  if (directMatch) {
    return directMatch
  }

  // 使用统一的 ID 解析器
  const parsed = parseLeafNodeId(nodeId)
  if (parsed && 'fieldId' in parsed) {
    return referencesByFieldId.get(parsed.fieldId)
  }

  return undefined
}
```

**修复文件**:
- `src/features/product-structure/hooks/bom-workspace-branch-relation/protocol-adapter.ts`

**验证**:
- ✅ TypeScript 编译通过
- ✅ 所有测试通过
- ✅ ID 解析逻辑完全归口到 `bom-node-id-resolver.ts`

---

### 2. SDRTS 协议链路断层（前端部分）

**问题描述**:
- `useBOMRelationDeltaTracker.ts` 计算出的 `_sidecarDelta` 被丢弃
- `sanitizeBOMInput` 函数没有保留 `_sidecarDelta` 字段
- 前端费力追踪的差量数据在发送请求时被丢弃

**风险**:
- 🔴 **严重**: 审计日志无法记录用户的具体操作
- 🔴 **严重**: 后端收到的是全量 JSON，无法实现增量更新
- 🔴 **严重**: SDRTS 协议完全失效

**修复方案**:
```typescript
// ❌ 修复前：_sidecarDelta 被丢弃
function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
  // ... 其他处理
  return {
    ...sanitizedPayload,
    _v: sanitizedPayload.version,
    relationSidecar: normalizedData.relationSidecar,
    // ❌ _sidecarDelta 没有被保留！
  }
}

// ✅ 修复后：保留 _sidecarDelta
function sanitizeBOMInput(data: SaveBOMInput): SaveBOMInput {
  // ... 其他处理
  return {
    ...sanitizedPayload,
    _v: sanitizedPayload.version,
    relationSidecar: normalizedData.relationSidecar,
    // 🔥 CRITICAL: 保留 _sidecarDelta 用于 SDRTS 协议
    // 这是审计日志和增量更新的关键数据
    _sidecarDelta: data._sidecarDelta,
  }
}
```

**修复文件**:
- `src/features/product-structure/services/bom-service.ts`

**验证**:
- ✅ TypeScript 编译通过
- ✅ `_sidecarDelta` 现在会被发送到后端
- ⚠️ 需要后端配合接收和处理

---

## ⚠️ 待修复问题（需要后端配合）

### 3. SDRTS 协议链路断层（后端部分）

**问题描述**:
- Go 后端的 `SaveBOMInput` 结构体没有定义 `_sidecarDelta` 字段
- 即使前端发送了 `_sidecarDelta`，后端也无法接收

**影响范围**:
- `server/models/engineering_master_types.go`
- `server/services/bom_service.go`

**需要的修复**:

#### 3.1 更新 Go 模型定义

```go
// server/models/engineering_master_types.go

// DeltaOperation 表示差量操作类型
type DeltaOperation string

const (
    DeltaOperationAdd    DeltaOperation = "add"
    DeltaOperationRemove DeltaOperation = "remove"
    DeltaOperationMove   DeltaOperation = "move"
    DeltaOperationUpdate DeltaOperation = "update"
)

// DeltaEntry 表示单个差量条目
type DeltaEntry struct {
    Operation DeltaOperation         `json:"op"`
    Path      string                 `json:"path"`
    Value     interface{}            `json:"value,omitempty"`
    OldValue  interface{}            `json:"oldValue,omitempty"`
}

// DeltaSet 表示差量集合
type DeltaSet struct {
    Entries []DeltaEntry `json:"entries"`
}

// SaveBOMInput 保存 BOM 的输入参数
type SaveBOMInput struct {
    // ... 现有字段
    
    // SDRTS 协议：Sidecar Delta
    // 用于审计日志和增量更新
    SidecarDelta *DeltaSet `json:"_sidecarDelta,omitempty"`
}
```

#### 3.2 更新审计日志逻辑

```go
// server/services/bom_service.go

func (s *BOMService) SaveBOM(ctx context.Context, input SaveBOMInput) (*BOM, error) {
    // ... 现有逻辑
    
    // 🔥 处理 SDRTS Delta
    if input.SidecarDelta != nil && len(input.SidecarDelta.Entries) > 0 {
        // 记录详细的操作审计
        for _, delta := range input.SidecarDelta.Entries {
            auditDetail := map[string]interface{}{
                "operation": delta.Operation,
                "path":      delta.Path,
                "value":     delta.Value,
                "oldValue":  delta.OldValue,
            }
            
            // 记录到审计日志
            s.auditService.LogBOMOperation(ctx, AuditLogEntry{
                EntityType: "bom_relation",
                EntityID:   bom.ID,
                Operation:  string(delta.Operation),
                Detail:     auditDetail,
                UserID:     ctx.Value("userID").(string),
            })
        }
    } else {
        // 降级：记录全量变更
        s.auditService.LogBOMOperation(ctx, AuditLogEntry{
            EntityType: "bom",
            EntityID:   bom.ID,
            Operation:  "update",
            Detail:     map[string]interface{}{
                "relationSidecar": input.RelationSidecar,
            },
            UserID: ctx.Value("userID").(string),
        })
    }
    
    // ... 保存逻辑
}
```

**优先级**: 🔴 **P0 - 关键**

**预期收益**:
- ✅ 审计日志可以精确记录用户操作（如"移动节点 A 到节点 B 下"）
- ✅ 为未来的增量更新（PATCH）奠定基础
- ✅ 减少审计日志存储空间（只记录变更，不记录全量）

---

### 4. 审计语义缺失和版本检查盲区

**问题描述**:

#### 4.1 审计语义缺失
- 当前审计日志只记录 `operation: "update"`
- 无法区分具体的操作类型（添加、删除、移动、修改）
- 审计日志价值大打折扣

#### 4.2 版本检查盲区
- 某些边缘场景（如 Derive MBOM）可能没有携带版本号
- 乐观锁可能被绕过，导致数据覆盖

**需要的修复**:

#### 4.1 增强审计日志

```go
// server/services/bom_service.go

// 定义详细的操作类型
const (
    AuditOpBOMCreate       = "bom.create"
    AuditOpBOMUpdate       = "bom.update"
    AuditOpBOMDelete       = "bom.delete"
    AuditOpBOMDerive       = "bom.derive"
    AuditOpBOMPromote      = "bom.promote"
    AuditOpRelationAdd     = "relation.add"
    AuditOpRelationRemove  = "relation.remove"
    AuditOpRelationMove    = "relation.move"
    AuditOpRelationUpdate  = "relation.update"
)

func (s *BOMService) SaveBOM(ctx context.Context, input SaveBOMInput) (*BOM, error) {
    // 根据 Delta 记录详细操作
    if input.SidecarDelta != nil {
        for _, delta := range input.SidecarDelta.Entries {
            var auditOp string
            switch delta.Operation {
            case DeltaOperationAdd:
                auditOp = AuditOpRelationAdd
            case DeltaOperationRemove:
                auditOp = AuditOpRelationRemove
            case DeltaOperationMove:
                auditOp = AuditOpRelationMove
            case DeltaOperationUpdate:
                auditOp = AuditOpRelationUpdate
            default:
                auditOp = AuditOpBOMUpdate
            }
            
            s.auditService.Log(ctx, AuditLogEntry{
                Operation: auditOp,
                Detail: map[string]interface{}{
                    "path":     delta.Path,
                    "value":    delta.Value,
                    "oldValue": delta.OldValue,
                },
            })
        }
    }
}
```

#### 4.2 强化版本检查

```go
// server/services/bom_service.go

func (s *BOMService) SaveBOM(ctx context.Context, input SaveBOMInput) (*BOM, error) {
    // 🔥 强制版本检查
    if input.Version == nil || *input.Version == 0 {
        return nil, errors.New("version is required for update operations")
    }
    
    // 查询当前版本
    currentBOM, err := s.GetBOMByID(ctx, input.ID)
    if err != nil {
        return nil, err
    }
    
    // 乐观锁检查
    if currentBOM.Version != *input.Version {
        return nil, &OptimisticLockError{
            EntityType:      "BOM",
            EntityID:        input.ID,
            ExpectedVersion: *input.Version,
            ActualVersion:   currentBOM.Version,
        }
    }
    
    // ... 继续保存逻辑
}

// DeriveMBOM 也需要版本检查
func (s *BOMService) DeriveMBOM(ctx context.Context, input DeriveMBOMInput) (*BOM, error) {
    // 🔥 确保源 BOM 的版本号被传递
    if input.SourceVersion == nil {
        return nil, errors.New("source BOM version is required")
    }
    
    // ... 派生逻辑
}
```

**优先级**: 🟡 **P1 - 重要**

**预期收益**:
- ✅ 审计日志更有价值，可以精确追溯操作
- ✅ 防止并发更新导致的数据覆盖
- ✅ 提高系统的数据一致性

---

## 📊 修复总结

### 已完成（前端）
| 问题 | 严重程度 | 状态 | 修复文件 |
|------|---------|------|---------|
| ID 解析逻辑"私产" | 🟡 中 | ✅ 已修复 | protocol-adapter.ts |
| SDRTS 链路断层（前端） | 🔴 高 | ✅ 已修复 | bom-service.ts |

### 待完成（后端）
| 问题 | 严重程度 | 状态 | 需要修改的文件 |
|------|---------|------|---------------|
| SDRTS 链路断层（后端） | 🔴 高 | ⚠️ 待修复 | engineering_master_types.go, bom_service.go |
| 审计语义缺失 | 🟡 中 | ⚠️ 待修复 | bom_service.go |
| 版本检查盲区 | 🟡 中 | ⚠️ 待修复 | bom_service.go |

---

## 🎯 后续行动计划

### 立即行动（本周）
1. ✅ 修复前端 ID 解析逻辑
2. ✅ 修复前端 SDRTS 链路断层
3. ⚠️ 与后端团队沟通，确认修复方案
4. ⚠️ 创建后端修复任务

### 短期行动（下周）
5. ⚠️ 后端实现 `_sidecarDelta` 接收
6. ⚠️ 后端实现详细审计日志
7. ⚠️ 后端强化版本检查
8. ⚠️ 端到端测试 SDRTS 协议

### 长期行动（本月）
9. ⚠️ 监控审计日志质量
10. ⚠️ 优化增量更新性能
11. ⚠️ 完善文档和示例

---

## 📝 技术债务记录

### 新增技术债务
- **TD-001**: 后端需要实现 `_sidecarDelta` 接收和处理
- **TD-002**: 审计日志需要支持详细的操作类型
- **TD-003**: 版本检查需要覆盖所有更新场景

### 已清理技术债务
- ✅ **TD-004**: ID 解析逻辑分散问题（已归口到 resolver）
- ✅ **TD-005**: SDRTS 前端链路断层（已修复）

---

## 🔍 验证清单

### 前端验证
- [x] TypeScript 编译通过
- [x] 所有测试通过
- [x] `_sidecarDelta` 被正确发送到后端
- [x] ID 解析使用统一的 resolver

### 后端验证（待完成）
- [ ] Go 编译通过
- [ ] `_sidecarDelta` 可以被正确接收
- [ ] 审计日志记录详细操作
- [ ] 版本检查覆盖所有场景
- [ ] 端到端测试通过

---

## 📚 相关文档

- **架构设计**: `.kiro/specs/bom-architecture-refactoring/design.md`
- **实施总结**: `.kiro/specs/bom-file-responsibility-separation/IMPLEMENTATION_SUMMARY.md`
- **迁移指南**: `.kiro/specs/bom-file-responsibility-separation/MIGRATION_GUIDE.md`

---

## 🙏 致谢

感谢代码审查中指出的关键问题，这些问题如果不及时修复，将会导致：
- 审计日志失去价值
- 增量更新无法实现
- 数据一致性风险
- 维护成本增加

通过本次修复，我们：
- ✅ 提高了代码质量
- ✅ 增强了系统可维护性
- ✅ 为未来的功能奠定了基础
- ⚠️ 识别了需要后端配合的关键问题

---

**最后更新**: 2026-05-13  
**状态**: 前端修复完成，等待后端配合
