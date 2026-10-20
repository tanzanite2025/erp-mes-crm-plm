# 审批工作流挂载与轻量 BPM 历史方案关闭说明

> 核查日期：2026-10-20。
> 文档状态：旧轻量 BPM 方案已退出当前架构；本文只说明关闭依据与当前审批入口，不再作为待开发方案。

## 1. 关闭依据

旧文档提出以 `WorkflowDefinition / WorkflowInstance / WorkflowTask` 三层模型托管销售、采购和发票审批，并要求单据持有 `WorkflowInstanceID`。这些表述不符合当前代码：

- 当前仓库不存在旧 `WorkflowService`、创建流程实例或审批 Workflow 任务的运行服务。
- `server/db/db.go` 中的 `dropLegacyWorkflowArtifacts` 明确删除旧三张表，并移除销售、采购的 `workflow_instance_id` 字段。
- 当前审批持久化模型为 `server/models/approval.go` 的 `ApprovalRequest`，表名为 `approval_requests`。

因此不再采用旧文档中的实例挂载、迁移窗口、JSON 三级审批示例和未实现的错误码。不能因为旧设计文件仍存在就重建这些表、服务和单据字段，也不能把收件箱建设扩展成第二套审批引擎。

## 2. 当前真实入口

| 职责                                     | 当前实现                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 审批申请、一级/二级审批与状态            | `server/models/approval.go`、`server/services/approval_service.go`                                                         |
| 申请、我的审批、审批决定、授权码验证接口 | `server/routes/routes_approval.go`、`server/handlers/approval.go`                                                          |
| 品质标准提审与当前申请关联               | `quality_standard_approval_routing_service.go`，与标准保存使用同一事务                                                     |
| 独立业务审批配置                         | `business_approval_policy_configuration_service.go`，目前接入品质标准；页面为 `/approval/business-approval-policies`       |
| 公共审批与业务装配                       | `approval_business_transaction_contract.go` 定义契约，`approval_business_transaction_contract_composition.go` 注入业务实现 |
| 品质审批结果回写                         | `quality_standard_approval_decision_service.go` 实现业务事务契约，由公共审批决定事务调用                                   |
| 规则配置与其他来源执行                   | `workflow_routing_service.go`、各业务事务事件服务、统一收件和提交后队列；浏览器只维护配置与查询                            |

表中的品质与规则服务位于 `server/services/`。`workflow-core` 目录名和 `ApprovalWorkflowResult` 类型名不代表旧 BPM 引擎仍在运行。

公共审批服务当前支持一级/二级审批；不能据此承诺已经支持任意层级、金额条件、并行会签或 BPMN。通用授权码机制与品质标准审批的差异，以各业务接口和[品质标准专项契约](../../quality-standard-approval-transaction-and-notification-delivery-contract.md)为准，不能把授权码写成所有审批统一必经步骤。

## 3. 审批与消息中心的长期边界

审批申请保存真实办理状态，消息中心只提供指向真实申请的提醒。标记已读、关闭弹窗和归档都不会完成审批；通知投递恢复也不能再次创建申请。

品质标准已通过明确的 `approval_request_id` 关联当前轮次。其他来源不能据此被描述为均已具备相同关联和事务保障，接入范围需逐项核查。

品质审批链配置已从监听规则迁至独立存储，通知源或规则停用不影响提审。品质监听规则只控制通知，不创建审批申请；在途申请保留原审批人快照。公共审批引擎不再包含品质专用分支。其他来源的规则内审批动作尚未迁移，不能据此声称全系统已完成相同分离。

全系统收件、投递、跨设备同步和迁移统一维护在[消息中心长期契约](system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)；运行入口见[各域拓扑](current-domain-topology-map.md)。本文件不再维护第二份通知或审批迁移清单。

## 4. 未来扩展条件

如果以后实际业务需要任意层级、条件审批或会签，应先对当前审批模型、权限、业务回写和数据迁移做专项设计，再决定是否需要新的流程模型。该需求尚不属于消息中心收件箱的实施范围，不能把旧 BPM 提案视为已确认的下一阶段。
