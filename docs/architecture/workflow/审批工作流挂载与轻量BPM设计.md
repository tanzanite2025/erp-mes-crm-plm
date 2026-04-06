# 审批工作流挂载与轻量 BPM 设计

## 1. 目标与边界

本文档聚焦“审批流与业务单据解耦”的实现方案，目标是：

1. 业务单据模型不再硬编码审批人和审批节点；
2. 审批状态流转由 `WorkflowService` 统一托管；
3. 支持通过 JSON 定义快速扩展“三级审批、金额阈值加签”等规则；
4. 保持后端裁决为唯一真源，前端仅展示流程状态。

---

## 2. 挂载模式（Attachment Pattern）

每个需要审批的业务单据（PO/SO/发票）增加：

- `WorkflowInstanceID`（流程实例 ID）

### 2.1 职责分离

- 业务单据：只维护业务字段（金额、币种、交易对象、明细等）；
- 工作流模块：维护节点、审批人分配、状态机流转和审批意见。

### 2.2 状态托管原则

单据状态（示例）：

- `Draft -> Pending -> Approved -> Rejected/Cancelled`

由 `WorkflowService` 驱动状态跃迁，业务 Handler 不直接写“最终审批态”。

---

## 3. 轻量 BPM 三层模型

## 3.1 WorkflowDefinition（流程定义）

定义层用于描述流程模板，建议字段：

- `ID`
- `Code`（如 `PO_APPROVAL_V1`）
- `Name`
- `Version`
- `Module`（PO/SO/INVOICE）
- `DefinitionJSON`（节点、路由、审批策略）
- `IsActive`

## 3.2 WorkflowInstance（流程实例）

实例层绑定业务单据，建议字段：

- `ID`
- `DefinitionID`
- `BusinessType`
- `BusinessRefID`
- `CurrentNodeID`
- `Status`（RUNNING / APPROVED / REJECTED / CANCELLED）
- `StartedAt`
- `FinishedAt`

## 3.3 WorkflowTask（流程任务）

任务层承载待办执行，建议字段：

- `ID`
- `InstanceID`
- `NodeID`
- `AssigneeUserID`
- `TaskStatus`（TODO / DONE / REJECTED / SKIPPED）
- `Action`
- `Comment`
- `ActionAt`

---

## 4. JSON 定义可扩展策略

通过定义层 JSON 承载审批策略，避免改业务模型代码：

1. 节点链路（顺序流）
2. 条件路由（金额阈值、部门、币种）
3. 会签/加签占位（后续启用）

示例策略：

- 当 `amount > 1_000_000` 时增加 `L3_FINANCE_REVIEW` 节点；
- 当 `currency != CNY` 时自动加入汇率复核节点。

---

## 5. Fail Loudly 约束

1. 未绑定实例：
   - 进入 `Pending` 前若 `WorkflowInstanceID` 为空，返回 `[CRITICAL_WORKFLOW_BINDING_MISSING]`。
2. 非法跳转：
   - 状态跃迁不满足状态机规则时，返回 `[CRITICAL_WORKFLOW_TRANSITION_INVALID]`。
3. 越权审批：
   - 非任务指派人提交审批动作，返回 `[SECURITY_WORKFLOW_ASSIGNEE_MISMATCH]`。
4. 并发审批：
   - 同任务重复处理需幂等保护，冲突返回 409 并记录审计日志。

---

## 6. 迁移策略（低风险）

1. 先引入三层模型与服务层，不影响现有单据读写；
2. 单据新增 `WorkflowInstanceID` 并允许空值（迁移窗口期）；
3. 新建单据逐步切流到 `WorkflowService`；
4. 旧审批配置逐步映射到 `WorkflowDefinition` 并下线。

---

## 7. 验证清单

1. 新建 PO：成功创建实例并生成首个待办任务；
2. 审批通过：实例状态变更并同步业务单据状态；
3. 金额越阈值：按 JSON 增加额外审批节点；
4. 非指派人审批：被拒绝且返回受控错误；
5. 重复审批提交：幂等处理不产生重复流转。
