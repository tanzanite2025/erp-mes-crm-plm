# 消息中心文件职责图

更新时间：2026-10-20。当前消息配置入口为 `/message-center`；个人消息从全局通知按钮查看。通用协议见[收件箱长期契约](../../../docs/architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)，业务覆盖见[覆盖地图](message-center-business-coverage-map.md)。

## 1. 页面与配置

| 位置                                                       | 职责                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `src/routes/_authenticated/message-center/`                | 鉴权、路由搜索参数和页面挂载；不执行业务规则                      |
| `src/features/message-center/`                             | 配置模块布局、监听规则/业务源/模板/日志 TAB                       |
| `src/features/system-mgmt/tabs/notification-rule-list.tsx` | 规则列表和 CRUD 交互                                              |
| 同目录 `business-event-source-list.tsx`                    | 业务源配置、导入模板、规则引用查询                                |
| 同目录 `rule-execution-log-tab.tsx`                        | 可信执行日志及管理投递诊断                                        |
| `workflow-core/components/command-mgmt/`                   | 通知内容模板管理；现有 StandardCommand 名称不代表另一套命令执行器 |
| `workflow-core/data/`                                      | 配置 schema、模板注册、状态字典和真实覆盖标签                     |
| `workflow-core/hooks/`                                     | 配置查询及 CRUD mutation，无扫描副作用                            |
| `workflow-core/services/routing-service.ts`                | 配置及执行日志查询/恢复 API，不写前端执行日志                     |

## 2. 个人收件与界面同步

以下通知文件相对于 `src/features/system-mgmt/notifications/`。

| 文件                                                            | 职责                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `system-notification-inbox-service.ts`                          | 收件分页和状态 HTTP 契约                                                 |
| `use-system-notification-inbox.ts`                              | 账号/权限/范围/游标查询键、周期对账、已读/归档、离线状态、身份变化清缓存 |
| `components/notification-center.tsx`                            | 收件箱与历史弹窗、未读角标、本页精确操作、重试/离线反馈                  |
| `components/system-notification-delivery-queue-diagnostics.tsx` | 管理员积压/暂停/错误诊断及原任务恢复                                     |
| `types.ts`                                                      | 通知类型和优先级契约                                                     |

`src/hooks/use-notifications.ts` 只消费实时刷新提示，保留权限、缓存失效和扫码临时动态。正文和未读来自服务端；WS 不承载另一份正式消息。审批角标在 `src/components/layout/use-sidebar-nav-badges.ts` 查询真实当前审批节点。

## 3. 后端业务与通用收件

| 位置                                                                                        | 职责                                                                                                |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `server/routes/routes.go`                                                                   | 个人收件认证接口及配置/诊断权限挂载                                                                 |
| `server/handlers/system_notification_inbox.go`                                              | 当前账号 HTTP 解析、查询/操作/恢复错误映射                                                          |
| 业务源、规则、执行日志 handler/service/DTO                                                  | 配置契约与可信诊断读取；不接受浏览器伪造执行结果                                                    |
| `server/services/approval_service.go`                                                       | 真实申请与当前节点决定，不把阅读当作审批                                                            |
| `server/services/approval_notification_inbox_service.go`                                    | 必要节点通知、结果和上一节点解除                                                                    |
| 品质、销售、采购、生产、物流、BOM 业务事件适配器                                            | 真实事件、事实键、业务字段、规则匹配及精确解除条件                                                  |
| `server/services/logistics_command_service.go`、`logistics_record_details_patch_service.go` | 物流真实写入、行锁、单调版本及审计；状态变化调用同一事务通知适配器                                  |
| `server/services/logistics_record_lifecycle_notification_routing_service.go`                | 物流事件键、真实模板字段、按采购/销售类型选择权限与详情链接                                         |
| `server/handlers/logistics_record_write_http_contract.go`                                   | JSON 数组和差量 HTTP 契约、购销范围校验、错误映射；不自行写通知                                     |
| `server/services/delivery_order_tracking_observation_persistence_service.go`                | 承运商回调与查询共用的轨迹事实事务、主单锁、时间边界、去重和查询额度；没有可靠业务外键前不自行通知  |
| `server/services/logistics_tracking_query_service.go`、`server/handlers/logistics_push.go`  | 受控厂商查询适配、HTTP签名及购销读取权限，调用同一轨迹事务服务；当前callback为认证路由              |
| `server/services/quality_standard_lifecycle_notification_routing_service.go`                | 品质规则匹配、模板校验和 operator 人员适配，调用共享创建器，不重复实现账号解析和入箱                |
| `server/services/rule_execution_log_service.go`                                             | 执行日志查询及原任务恢复适配；传递请求取消和数据库错误，不直接发布通知                              |
| `server/services/production_outsource_diagnostics_service.go`                               | 委外事实诊断；通知失败只读原日志当前状态，不遍历成功日志推断恢复                                    |
| `server/services/business_rule_notification_inbox_creation_service.go`                      | 品质、销售和通用业务共用账号解析/去重、逐账号日志及收件生成，将真实实体和生成时解除条件交给收件服务 |
| `server/services/business_rule_notification_inbox_status_resolution_service.go`             | 按原收件的来源、实体、目标和状态条件解除；源/规则停用或删除后仍生效，统一来源锁顺序及状态引用迁移   |
| `server/services/business_event_source_status_transaction_service.go`                       | 受控状态码重命名时，同事务迁移源配置、规则和未解除收件的语义引用，不改写展示正文或账号状态          |
| `server/services/system_notification_inbox_creation_service.go`                             | 账号、唯一约束、站内动作、正文与内部解除条件快照和刷新任务                                          |
| `server/services/system_notification_inbox_query_and_state_service.go`                      | 权限与账号过滤、分页/未读同快照、幂等操作及业务解除                                                 |
| `server/services/system_alert_notification_inbox_service.go`                                | 告警轮次去重、生成时冻结接收人、解除和迟到保护                                                      |
| `server/services/workflow_notification_outbox_delivery_service.go`                          | 提交后领取、重试、暂停、发布结果，以及失效收件对应暂停/延期任务的取消                               |
| `server/services/system_notification_delivery_queue_operations_service.go`                  | 原任务恢复、审计、队列诊断；按收件到队列的锁顺序执行有界清理并跳过被占用记录                        |
| `server/db/system_notification_inbox_cutover.go`                                            | 取消旧未发布完整载荷任务，不重建历史收件                                                            |
| `server/services/notification_publisher.go`、`server/handlers/ws.go`                        | Redis 发布与按账号分发，不维护业务状态或阅读状态                                                    |

## 4. 数据唯一归属和已删除路径

单据/审批保存业务事实，收件表保存账号展示快照与阅读等状态，outbox 保存短期刷新任务，规则日志保存诊断证据，审计保存操作证据。告警轮次表保存迟到保护墓碑，不是另一套告警正文历史。

配置通知使用生成时保存的解除条件；真实事件先解除原收件，再按当前启用配置生成新通知或申请。公共审批按真实申请/节点解除，告警按真实轮次解除。内部状态条件不进入员工收件接口，旧消息不从日志或现行规则补造条件。

浏览器 `NotificationService`、`DispatchService`、规则执行器、审批执行器、扫描器、日志 writer、两个本地通知 Store 和 BOM 前端 routing 服务已删除。旧 POST 执行日志接口已关闭；日志恢复只能恢复原队列任务。未调用的独立日志写入入口和旧 CLI 实时通知验收已移除；通知验证集中在隔离 PostgreSQL 集成测试，CLI 继续负责业务事实、并发与权限验收。

新文件与函数名称必须明确职责。新来源沿现有事务与共用收件服务接入，不建立第二个正式通知入口或重试调度器，不用本地未读累计替代数据库查询。缓存失效、权限快照和扫码动态是临时信号，应保留各自用途。
