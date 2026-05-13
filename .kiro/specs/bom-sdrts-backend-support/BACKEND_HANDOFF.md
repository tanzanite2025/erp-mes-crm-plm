# 后端开发交接文档

**日期**: 2026-05-13  
**优先级**: 🔴 P0 - 关键  
**预计工作量**: 2-3 天

---

## 📋 快速概览

前端已经实现了 SDRTS（Sidecar Delta Relation Tracking System）协议，可以精确追踪用户对 BOM 树结构的操作。现在需要后端配合接收和处理这些差量数据。

**当前状态**:
- ✅ 前端已实现 Delta 追踪
- ✅ 前端已修复发送逻辑
- ⚠️ 后端无法接收 Delta 数据
- ⚠️ 审计日志无法记录详细操作

---

## 🎯 需要完成的工作

### 1. 更新 Go 数据模型（30 分钟）

**文件**: `server/models/engineering_master_types.go`

**需要添加**:

```go
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
```

**需要修改**:

```go
// SaveBOMInput 保存 BOM 的输入参数
type SaveBOMInput struct {
    // ... 现有字段保持不变
    
    // 🔥 新增字段
    SidecarDelta *DeltaSet `json:"_sidecarDelta,omitempty"`
}
```

**验证**:
```bash
go build ./server/models
```

---

### 2. 实现 Delta 处理逻辑（1-2 小时）

**文件**: `server/services/bom_service.go`

**需要添加**:

```go
// 定义详细的审计操作类型
const (
    AuditOpBOMCreate       = "bom.create"
    AuditOpBOMUpdate       = "bom.update"
    AuditOpBOMDelete       = "bom.delete"
    AuditOpRelationAdd     = "relation.add"
    AuditOpRelationRemove  = "relation.remove"
    AuditOpRelationMove    = "relation.move"
    AuditOpRelationUpdate  = "relation.update"
)

// processSidecarDelta 处理 Sidecar Delta 并记录审计日志
func (s *BOMService) processSidecarDelta(
    ctx context.Context,
    bomID string,
    delta *DeltaSet,
) error {
    if delta == nil || len(delta.Entries) == 0 {
        return nil
    }

    userID := ctx.Value("userID").(string)

    for _, entry := range delta.Entries {
        var auditOp string
        switch entry.Operation {
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

        err := s.auditService.LogBOMOperation(ctx, AuditLogEntry{
            EntityType: "bom_relation",
            EntityID:   bomID,
            Operation:  auditOp,
            Detail: map[string]interface{}{
                "path":     entry.Path,
                "value":    entry.Value,
                "oldValue": entry.OldValue,
            },
            UserID: userID,
        })
        if err != nil {
            // 审计日志失败不应阻塞主流程
            log.Printf("Failed to log audit entry: %v", err)
        }
    }

    return nil
}
```

**需要修改**:

```go
func (s *BOMService) SaveBOM(ctx context.Context, input SaveBOMInput) (*BOM, error) {
    // ... 现有的版本检查和保存逻辑
    
    // 🔥 处理 SDRTS Delta（在保存成功后）
    if input.SidecarDelta != nil {
        err := s.processSidecarDelta(ctx, bom.ID, input.SidecarDelta)
        if err != nil {
            log.Printf("Failed to process sidecar delta: %v", err)
            // 不阻塞主流程
        }
    } else {
        // 降级：记录全量变更
        s.auditService.LogBOMOperation(ctx, AuditLogEntry{
            EntityType: "bom",
            EntityID:   bom.ID,
            Operation:  AuditOpBOMUpdate,
            Detail: map[string]interface{}{
                "relationSidecar": input.RelationSidecar,
            },
            UserID: ctx.Value("userID").(string),
        })
    }
    
    return bom, nil
}
```

---

### 3. 强化版本检查（30 分钟）

**文件**: `server/services/bom_service.go`

**需要修改**:

```go
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
```

**需要添加错误类型**:

```go
// OptimisticLockError 乐观锁冲突错误
type OptimisticLockError struct {
    EntityType      string
    EntityID        string
    ExpectedVersion int
    ActualVersion   int
}

func (e *OptimisticLockError) Error() string {
    return fmt.Sprintf(
        "%s version mismatch: expected %d, got %d",
        e.EntityType,
        e.ExpectedVersion,
        e.ActualVersion,
    )
}
```

---

### 4. 编写单元测试（1-2 小时）

**文件**: `server/services/bom_service_test.go`

**需要测试的场景**:

```go
func TestSaveBOM_WithSidecarDelta(t *testing.T) {
    // 测试：接收并处理 Delta 数据
}

func TestSaveBOM_WithoutSidecarDelta(t *testing.T) {
    // 测试：降级处理（记录全量变更）
}

func TestSaveBOM_VersionMismatch(t *testing.T) {
    // 测试：版本冲突检测
}

func TestProcessSidecarDelta_AllOperations(t *testing.T) {
    // 测试：所有 Delta 操作类型
}

func TestProcessSidecarDelta_AuditLogFailure(t *testing.T) {
    // 测试：审计日志失败不阻塞主流程
}
```

---

## 📊 验收标准

### 功能验收
- [ ] `SaveBOMInput` 可以接收 `_sidecarDelta` 字段
- [ ] Delta 数据被正确解析
- [ ] 每个 Delta 条目生成一条审计日志
- [ ] 审计日志包含操作类型、路径、值
- [ ] 没有 Delta 时降级到全量审计
- [ ] 版本冲突时返回明确错误

### 质量验收
- [ ] Go 编译通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有测试通过
- [ ] 无已知 Bug

### 性能验收
- [ ] Delta 解析时间 < 10ms
- [ ] 审计日志写入不阻塞主流程
- [ ] 保存操作总时间增加 < 5%

---

## 🧪 测试方法

### 1. 单元测试
```bash
go test ./server/services -v -run TestSaveBOM
```

### 2. 集成测试
使用 Postman 或 curl 发送请求：

```bash
curl -X POST http://localhost:8080/engineering/bom \
  -H "Content-Type: application/json" \
  -d '{
    "id": "BOM001",
    "version": 5,
    "relationSidecar": {...},
    "_sidecarDelta": {
      "entries": [
        {
          "op": "add",
          "path": "/branchNodes/0/children",
          "value": "item:ITM001"
        },
        {
          "op": "move",
          "path": "/branchNodes/1/children/2",
          "value": "item:ITM002",
          "oldValue": "/branchNodes/0/children/1"
        }
      ]
    }
  }'
```

### 3. 审计日志验证
查询数据库确认审计日志：

```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'bom_relation' 
  AND entity_id = 'BOM001'
ORDER BY created_at DESC;
```

预期结果：
```
| operation        | detail                                    |
|------------------|-------------------------------------------|
| relation.add     | {"path": "/branchNodes/0/children", ...}  |
| relation.move    | {"path": "/branchNodes/1/children/2", ...}|
```

---

## 📚 参考文档

### 必读文档
1. **后端需求文档**: `.kiro/specs/bom-sdrts-backend-support/requirements.md`
2. **关键问题修复报告**: `.kiro/specs/bom-file-responsibility-separation/CRITICAL_ISSUES_FIXED.md`
3. **前端实现**: `src/features/product-structure/hooks/useBOMRelationDeltaTracker.ts`

### 可选文档
- **架构设计**: `.kiro/specs/bom-file-responsibility-separation/design.md`
- **实施总结**: `.kiro/specs/bom-file-responsibility-separation/IMPLEMENTATION_SUMMARY.md`

---

## 🔍 Delta 数据格式示例

### 前端发送的数据
```json
{
  "id": "BOM001",
  "version": 5,
  "relationSidecar": {
    "branchNodes": [...],
    "itemNodes": [...]
  },
  "_sidecarDelta": {
    "entries": [
      {
        "op": "add",
        "path": "/branchNodes/0/children",
        "value": "item:ITM001"
      },
      {
        "op": "remove",
        "path": "/branchNodes/1/children/2",
        "oldValue": "item:ITM002"
      },
      {
        "op": "move",
        "path": "/branchNodes/2/children",
        "value": "item:ITM003",
        "oldValue": "/branchNodes/0/children/1"
      },
      {
        "op": "update",
        "path": "/itemNodes/0/label",
        "value": "新标签",
        "oldValue": "旧标签"
      }
    ]
  }
}
```

### 操作类型说明

| 操作类型 | 说明 | 示例 |
|---------|------|------|
| `add` | 添加节点 | 在 section 下添加新 item |
| `remove` | 删除节点 | 从树中删除 item |
| `move` | 移动节点 | 将 item 从 section A 移到 section B |
| `update` | 更新节点 | 修改节点的属性 |

---

## ⚠️ 注意事项

### 1. 向后兼容
- `_sidecarDelta` 是**可选字段**
- 旧版本前端不发送 Delta 时，降级到全量审计
- 不能破坏现有功能

### 2. 错误处理
- 审计日志失败**不应阻塞**主流程
- 使用 `log.Printf` 记录错误
- 保存操作应该成功

### 3. 性能考虑
- Delta 处理应该**异步化**
- 不要在主流程中等待审计日志写入
- 考虑使用消息队列

### 4. 安全考虑
- 验证 Delta 数据的合法性
- 防止注入攻击
- 确保用户权限检查

---

## 🚀 开始开发

### 步骤 1: 创建分支
```bash
git checkout -b feature/bom-sdrts-backend-support
```

### 步骤 2: 更新数据模型
编辑 `server/models/engineering_master_types.go`

### 步骤 3: 实现处理逻辑
编辑 `server/services/bom_service.go`

### 步骤 4: 编写测试
创建 `server/services/bom_service_test.go`

### 步骤 5: 运行测试
```bash
go test ./server/services -v
```

### 步骤 6: 集成测试
与前端联调，验证端到端流程

### 步骤 7: 提交代码
```bash
git add .
git commit -m "feat: implement SDRTS backend support"
git push origin feature/bom-sdrts-backend-support
```

---

## 💬 联系方式

如有问题，请联系：
- **前端负责人**: [前端开发者]
- **架构师**: [架构师]
- **项目经理**: [项目经理]

或查看相关文档：
- Slack: #bom-refactoring
- Wiki: [项目 Wiki 链接]

---

## ✅ 完成检查清单

开发完成后，请确认：

- [ ] 代码已提交到 Git
- [ ] 所有测试通过
- [ ] 代码已通过 Code Review
- [ ] 文档已更新
- [ ] 已与前端进行联调
- [ ] 已在测试环境验证
- [ ] 已通知相关人员

---

**祝开发顺利！** 🎉

如有任何问题，请随时联系前端团队。
