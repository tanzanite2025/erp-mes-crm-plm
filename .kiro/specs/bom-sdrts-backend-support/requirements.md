# Requirements Document

## Introduction

**Feature Name**: BOM SDRTS Backend Support  
**Version**: v1.0  
**Created**: 2026-05-13  
**Priority**: P0 - Critical  
**Type**: Backend Enhancement

### Problem Statement

前端已经实现了 SDRTS（Sidecar Delta Relation Tracking System）协议，可以精确追踪用户对 BOM 树结构的操作（添加、删除、移动、修改节点）。但是后端目前无法接收和处理这些差量数据，导致：

1. **审计日志价值低**: 只能记录"用户更新了 BOM"，无法记录具体操作
2. **增量更新无法实现**: 后端收到的是全量 JSON，无法优化性能
3. **SDRTS 协议失效**: 前端费力追踪的差量数据被丢弃

## Requirements

### FR-1: 接收和解析 _sidecarDelta

**需求描述**: 后端需要能够接收前端发送的 `_sidecarDelta` 字段

**用户故事**: 
作为后端服务，我需要接收前端发送的差量数据，以便记录详细的审计日志和实现增量更新。

**验收标准**:
- [ ] `SaveBOMInput` 结构体包含 `SidecarDelta` 字段
- [ ] 定义 `DeltaSet` 和 `DeltaEntry` 数据结构
- [ ] 支持 4 种操作类型：add, remove, move, update
- [ ] JSON 反序列化正确工作
- [ ] 单元测试覆盖

**数据结构**:
```go
type DeltaOperation string

const (
    DeltaOperationAdd    DeltaOperation = "add"
    DeltaOperationRemove DeltaOperation = "remove"
    DeltaOperationMove   DeltaOperation = "move"
    DeltaOperationUpdate DeltaOperation = "update"
)

type DeltaEntry struct {
    Operation DeltaOperation         `json:"op"`
    Path      string                 `json:"path"`
    Value     interface{}            `json:"value,omitempty"`
    OldValue  interface{}            `json:"oldValue,omitempty"`
}

type DeltaSet struct {
    Entries []DeltaEntry `json:"entries"`
}

type SaveBOMInput struct {
    // ... 现有字段
    SidecarDelta *DeltaSet `json:"_sidecarDelta,omitempty"`
}
```

**优先级**: P0（必须）

---

### FR-2: 详细审计日志

**需求描述**: 根据 `_sidecarDelta` 记录详细的操作审计日志

**用户故事**:
作为审计人员，我需要查看用户对 BOM 树结构的具体操作（如"移动节点 A 到节点 B 下"），以便进行合规审查和问题追溯。

**验收标准**:
- [ ] 定义详细的审计操作类型（relation.add, relation.remove, relation.move, relation.update）
- [ ] 每个 Delta 条目生成一条审计日志
- [ ] 审计日志包含操作路径、新值、旧值
- [ ] 降级处理：如果没有 Delta，记录全量变更
- [ ] 审计日志可查询和导出

**审计日志示例**:
```json
{
  "timestamp": "2026-05-13T16:00:00Z",
  "userId": "user123",
  "entityType": "bom_relation",
  "entityId": "BOM001",
  "operation": "relation.move",
  "detail": {
    "path": "/branchNodes/1/children",
    "value": "item:ITM002",
    "oldValue": null,
    "description": "移动节点 ITM002 到 section:MAIN 下"
  }
}
```

**优先级**: P0（必须）

---

### FR-3: 版本检查强化

**需求描述**: 强制所有更新操作携带版本号，防止并发冲突

**用户故事**:
作为系统，我需要确保所有更新操作都经过乐观锁检查，以防止数据覆盖。

**验收标准**:
- [ ] `SaveBOM` 强制要求 `version` 字段
- [ ] `DeriveMBOM` 要求源 BOM 的版本号
- [ ] 版本不匹配时返回明确的错误信息
- [ ] 错误信息包含期望版本和实际版本
- [ ] 单元测试覆盖版本冲突场景

**错误响应示例**:
```json
{
  "error": "OptimisticLockError",
  "message": "BOM version mismatch",
  "detail": {
    "entityType": "BOM",
    "entityId": "BOM001",
    "expectedVersion": 5,
    "actualVersion": 6
  }
}
```

**优先级**: P1（重要）

### Non-Functional Requirements

### NFR-1: 性能

**需求描述**: Delta 处理不应显著影响保存性能

**验收标准**:
- [ ] Delta 解析时间 < 10ms
- [ ] 审计日志写入异步化
- [ ] 大量 Delta（>100 条）不阻塞主流程

---

### NFR-2: 向后兼容

**需求描述**: 支持没有 Delta 的旧版本前端

**验收标准**:
- [ ] `_sidecarDelta` 为可选字段
- [ ] 没有 Delta 时降级到全量审计
- [ ] 不影响现有功能

---

### NFR-3: 可观测性

**需求描述**: 提供 Delta 处理的监控指标

**验收标准**:
- [ ] 记录 Delta 条目数量
- [ ] 记录 Delta 处理时间
- [ ] 记录 Delta 解析错误

### Technical Constraints

- 必须使用 Go 1.21+
- 必须与现有审计系统集成
- 必须支持 PostgreSQL 和 MySQL

### Dependencies

### 前置依赖
- 前端已实现 SDRTS 协议（已完成）
- 前端已修复 `_sidecarDelta` 发送（已完成）

### 后续依赖
- 审计日志查询 UI
- 增量更新优化（未来）

### Acceptance Test Scenarios

### 场景 1: 接收 Delta 数据
**前置条件**: 前端发送包含 `_sidecarDelta` 的请求  
**操作步骤**:
1. 前端保存 BOM，包含 3 个 Delta 条目
2. 后端接收请求
3. 检查 `SaveBOMInput.SidecarDelta`

**预期结果**:
- Delta 数据被正确解析
- 包含 3 个 DeltaEntry
- 每个 Entry 的字段完整

---

### 场景 2: 记录详细审计日志
**前置条件**: 收到包含 Delta 的保存请求  
**操作步骤**:
1. 后端处理 Delta
2. 为每个 Delta 条目生成审计日志
3. 查询审计日志

**预期结果**:
- 生成 3 条审计日志
- 每条日志包含操作类型、路径、值
- 日志可以被查询

---

### 场景 3: 版本冲突检测
**前置条件**: BOM 当前版本为 6  
**操作步骤**:
1. 前端发送更新请求，version = 5
2. 后端检查版本
3. 返回错误

**预期结果**:
- 返回 409 Conflict
- 错误信息包含期望版本和实际版本
- BOM 数据未被修改

---

### 场景 4: 降级处理
**前置条件**: 旧版本前端不发送 Delta  
**操作步骤**:
1. 前端发送保存请求，不包含 `_sidecarDelta`
2. 后端处理请求
3. 记录审计日志

**预期结果**:
- 保存成功
- 审计日志记录全量变更
- 不影响功能

### Success Metrics

### 功能指标
- Delta 接收成功率 100%
- 审计日志记录成功率 100%
- 版本冲突检测准确率 100%

### 性能指标
- Delta 解析时间 < 10ms
- 审计日志写入不阻塞主流程
- 保存操作总时间增加 < 5%

### 质量指标
- 单元测试覆盖率 > 80%
- 集成测试通过率 100%
- 无已知 Bug

### Risks and Mitigation

### 风险 1: Delta 格式不兼容
**影响**: 高  
**概率**: 低  
**缓解措施**:
- 严格的 JSON Schema 验证
- 前后端共享类型定义
- 端到端测试

### 风险 2: 审计日志存储压力
**影响**: 中  
**概率**: 中  
**缓解措施**:
- 异步写入审计日志
- 定期归档旧日志
- 监控存储使用

### 风险 3: 性能下降
**影响**: 中  
**概率**: 低  
**缓解措施**:
- 性能基准测试
- 异步处理非关键路径
- 批量写入优化

## Glossary

- **SDRTS**: Sidecar Delta Relation Tracking System - 用于追踪 BOM 树结构变更的协议
- **Delta**: 差量数据，记录具体的操作（添加、删除、移动、修改）
- **Sidecar**: 附加数据结构，与主数据并行存储
- **Optimistic Lock**: 乐观锁，通过版本号防止并发冲突

## Appendix

### A. Delta 操作类型说明

| 操作类型 | 说明 | 示例 |
|---------|------|------|
| add | 添加节点 | 在 section 下添加新 item |
| remove | 删除节点 | 从树中删除 item |
| move | 移动节点 | 将 item 从 section A 移到 section B |
| update | 更新节点 | 修改节点的属性 |

### B. 审计日志操作类型

| 操作类型 | 说明 |
|---------|------|
| bom.create | 创建 BOM |
| bom.update | 更新 BOM（全量） |
| bom.delete | 删除 BOM |
| bom.derive | 派生 BOM |
| bom.promote | 提升 BOM 状态 |
| relation.add | 添加关系节点 |
| relation.remove | 删除关系节点 |
| relation.move | 移动关系节点 |
| relation.update | 更新关系节点 |

### C. 相关文档
- 前端 SDRTS 实现: `useBOMRelationDeltaTracker.ts`
- 前端修复报告: `CRITICAL_ISSUES_FIXED.md`
- 架构设计: `bom-architecture-refactoring/design.md`
