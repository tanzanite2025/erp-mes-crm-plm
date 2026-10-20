# 消息中心业务覆盖地图

更新时间：2026-10-20。本文描述当前代码入口，不表示所有模板动作均有运行时触发，也不代表生产已部署。

## 1. 来源与真实入口

前端模板注册于 `workflow-core/data/business-event-source-templates.ts`，后端默认源在 `server/services/business_event_source_service.go`。模板、默认落库、真实触发是三个不同事实。

| 来源                   | 默认落库                       | 实际执行入口与覆盖                                                                                         |
| ---------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `SALES_ORDER`          | 是                             | 后端销售状态事务和履约联动，`sales_order_business_event_service.go`                                        |
| `PURCHASE_ORDER`       | 是                             | 后端采购状态事务，`purchase_order_business_event_service.go`                                               |
| `PRODUCTION_PLAN`      | 是                             | 已有计划创建/状态入口调用 `production_business_event_service.go`                                           |
| `PRODUCTION_TASK`      | 是                             | 已有任务创建入口；不把模板中的全部任务状态当作已覆盖                                                       |
| `PRODUCTION_OPERATION` | 是                             | 统一扫码工序执行事实                                                                                       |
| `PRODUCTION_OUTSOURCE` | 是                             | 下达、作废、发出、退回、检验处置、关闭等实际事实                                                           |
| `QUALITY_STANDARD`     | 是                             | 保存、提审、审批决定、发布和归档，品质专项服务                                                             |
| `BOM_ENGINEERING`      | 否，需导入                     | 保存、状态提升、被派生、修订/作废；后端 BOM 事务适配器                                                     |
| `BOM_MANUFACTURING`    | 否，需导入                     | 派生、状态提升、修订/旧版作废；研发优化及 stale 标志动作暂无真实入口                                       |
| `LOGISTICS_RECORD`     | 否，需导入                     | logistics_command_service.go 新建、状态变化、进入异常；删除同事务解除；承运商 DeliveryOrder 回调未接此来源 |
| 公共审批               | 系统必要提醒，不是可配置事件源 | `approval_service.go` 按真实申请节点与最终结果入箱                                                         |
| 系统告警               | 系统必要提醒，不是可配置事件源 | webhook 按告警轮次冻结有效管理账号并持久化解除                                                             |

自定义配置通知须有已落库且启用的业务源、启用规则、匹配段、有效内容模板和实际账号；默认源不等于已配置审批规则。品质提审缺少真实唯一审批链时明确拒绝，不伪造待办。

## 2. 统一运行链

```text
业务后端事务
  -> 真实业务/ApprovalRequest
  -> 规则匹配、模板快照、有效账号解析
  -> system_notification_inbox_entries + rule_execution_logs
  -> workflow_notification_outbox_entries（只存刷新提示）
提交后 worker -> Redis / WebSocket -> 客户端使查询失效
客户端 -> GET /message-center/inbox -> 当前账号快照和未读数
```

浏览器规则执行、追溯扫描、日志写入和两套正式消息 Store 已移除。配置页面只做 CRUD 和诊断。状态操作通过服务端精确 ID 已读/归档，业务解除与业务同事务持久化；员工离线也不会错过解除事实。

配置通知的解除条件在生成时存入收件内部，不再依赖后续源/规则是否仍启用或存在。品质、销售及通用业务路由共用相同解除服务；规则编辑只影响新通知，旧通知按原条件随真实业务解除。状态码受控重命名沿现有事务迁移未解除引用，公共审批与告警仍按各自真实节点/轮次解除，详见长期契约。

## 3. 来源特有边界

品质标准状态为 DRAFT、PENDING_APPROVAL、APPROVED、REJECTED、PUBLISHED、ARCHIVED；当前申请明确关联，不从历史推断。审批必要节点提醒由真实审批服务生成，不能通过前端第二次申请。

MBOM 当前从已发布 EBOM 派生时仍为 DRAFT，真实 RELEASED 才映射 EFFECTIVE。前端模板包含草稿及实际审核中间态，不得把派生当作自动发布。模板字段存在不保证该业务动作一定提供对应人员；动态账号缺失会记录跳过，不能猜测人员。

委外事件键包含根订单版本或收发/检验事实 ID；收件 targetId 统一为根订单，metadata 保存 factId。关闭时按来源/根订单/规则/段解除相应旧提醒，不合并不同真实事实。失败诊断直接读取原日志的当前状态，人工恢复后等待同一个 worker 投递，不查询另一份重试日志。

销售、采购、生产状态清单应以各域真实调用为准；本轮没有创建存量扫描补发。物流记录已接入真实事务，状态为 Pending、InTransit、Delivered、Exception、Canceled；没有派车、装车或司机字段。采购/销售收件权限和详情跳转分别绑定真实类型，具体见[物流契约](../../../docs/logistics-record-transaction-and-notification-delivery-contract.md)。BOM 标志动作仍需真实入口。

承运商 `DeliveryOrder` 的回调与实时查询已经统一轨迹事务、事实时间去重和购销权限；这不等于通知来源已接通。当前缺少可靠业务外键及主单创建/订阅入口，callback仍为认证接口，未作为公网厂商回调部署；后续沿既有共用收件服务接入，不建立另一套物流消息基础设施。

## 4. 文件及接入维护

收件模型、接口、状态、账号权限、保留清理、诊断恢复和验收统一见[消息中心长期契约](../../../docs/architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)。页面与服务分层见[文件职责图](message-center-file-responsibilities.md)。

新增来源先确认：真实事务入口、业务稳定事件键、账号解析与权限、模板/状态字典、展示快照、精确解除条件、默认落库策略。通知必须进入共用收件服务并提交后发布，失败恢复原任务；不能恢复浏览器扫描或从执行日志伪造历史消息。
