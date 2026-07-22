# 消息中心文件职责图

更新时间：2026-07-22

这份文档只说明“文件放哪里、谁负责什么”。消息中心当前唯一业务入口是 `/message-center`。

## 1. 页面入口层

`src/routes/_authenticated/message-center/*`

- `route.tsx`：鉴权与消息中心布局挂载。
- `index.tsx`：只做 `/message-center` 到 `/message-center/rules` 的默认入口重定向。
- `rules.tsx`：监听规则 TAB 的路由搜索参数与页头。
- `sources.tsx`：业务事件源 TAB 的路由搜索参数与页头。
- `templates.tsx`：通知内容模板 TAB 的路由搜索参数与页头。
- `executions.tsx`：执行日志 TAB 的路由搜索参数与页头。

这层不做数据读写，不写规则执行逻辑，也不直接拼业务模型。

## 2. TAB 壳层

`src/features/message-center/*`

- `message-center-layout.tsx`：只负责 `ModuleTabbedLayout` 与子路由出口。
- `tabs.ts`：只维护 4 个 TAB 的 key、中文文案 key 和 href。

后续新增 TAB，先在这里登记；不要把 TAB 壳逻辑塞回系统管理页。

## 3. TAB 页面实现层

`src/features/system-mgmt/tabs/*`

- `notification-rule-list.tsx`：监听规则列表、搜索、筛选、新建规则入口。
- `business-event-source-list.tsx`：事件源列表、模板导入、复制、展开态和规则引用查询。
- `rule-execution-log-tab.tsx`：执行日志查询、筛选、分页与可见数量控制。
- `tabs/components/rule-card*.tsx|ts`：单条规则卡片、状态行、模板绑定、规则完整度等规则内部交互。
- `tabs/components/business-event-source-*.tsx|ts`：事件源卡片、状态重命名事务、删除确认与差异计算。

这一层可以组合 UI 和 hook，但不要直接绕过 `RoutingService` 调接口。

## 4. 通知内容模板 UI 层

`src/features/system-mgmt/workflow-core/components/command-mgmt/*`

当前文件名仍保留 `Command` / `StandardCommand`，但业务语义已经是“通知内容模板”。

- `index.tsx`：模板列表页容器、搜索、新建/编辑弹窗状态。
- `command-list.tsx`：模板列表展示。
- `command-form.tsx`：模板表单。

后续重命名时应整体迁移，不要在别处再新增一套“模板”实现。

## 5. 前端配置契约层

`src/features/system-mgmt/workflow-core/data/*`

- `business-event-source-types.ts`：业务事件源 schema、实体、动作、字段、状态、运行时 meta。
- `business-event-source-schema.ts`：事件源创建/更新序列化与反序列化。
- `notification-rule-schema.ts`：监听规则 schema、segment、审批配置。
- `rule-execution-log-schema.ts`：执行日志 schema。
- `business-event-source-templates.ts`：业务事件源模板唯一注册点。
- `business-event-status-catalog.ts`：各事件源状态字典。
- `business-event-source-runtime-coverage.ts`：事件源接入状态标签。

所有事件源的 `entity/sourceCode/action/status` 必须先在这里表达清楚，再让页面和后端接入。

## 6. 前端数据读写层

`src/features/system-mgmt/workflow-core/hooks/*`

- `use-business-event-sources.ts`：业务事件源读取、创建、更新、删除。
- `use-notification-rules.ts`：监听规则读取、创建、更新、删除、启停。
- `use-commands.ts`：通知内容模板读取、创建、更新、删除。

`src/features/system-mgmt/workflow-core/services/routing-service.ts`

- 前端消息中心配置类 API 的唯一出口。
- 当前后端路径为 `/message-center/*`。

页面组件应只通过 hook 或 `RoutingService` 写入，不要散落 `apiFetch('/message-center/...')`。

## 7. 前端规则执行层

`src/features/system-mgmt/workflow-core/services/*`

- `rule-execution-core.ts`：规则执行总入口。
- `rule-matcher.ts`：规则、事件源、状态命中判断。
- `target-resolver.ts`：实体/sourceCode 推断、动态人员解析、模板变量替换。
- `notification-executor.ts`：通知动作执行与执行日志写入。
- `approval-executor.ts`：审批动作执行与执行日志写入。
- `execution-log-writer.ts`：前端执行链写入后端执行日志。
- `notification-rules-scan-scheduler.ts`：规则配置页挂载后的周期追溯扫描。
- `dispatch-service.ts`：旧工作流节点和追溯扫描的执行入口。

注意：这层运行在浏览器里。长期目标应是把核心执行和日志可信写入收敛到后端。

## 8. 后端配置与执行层

后端路由：

- `server/routes/routes.go`：`/message-center/*`

后端 handler：

- `server/handlers/business_event_source.go`
- `server/handlers/workflow_routing.go`
- `server/handlers/rule_execution_log.go`

后端 service：

- `server/services/business_event_source_service.go`
- `server/services/business_event_source_dto.go`
- `server/services/workflow_routing_service.go`
- `server/services/workflow_routing_dto.go`
- `server/services/rule_execution_log_service.go`
- `server/services/rule_execution_log_dto.go`
- `server/services/sales_order_business_event_service.go`
- `server/services/purchase_order_business_event_service.go`
- `server/services/production_business_event_service.go`
- `server/services/business_status_event_service.go`

后端 model：

- `business_event_sources`
- `standard_commands`
- `notification_rules`
- `rule_execution_logs`

后端真实业务状态变更优先在事务内调用业务事件 service，写执行日志并通过 Redis/WebSocket 推送通知。

## 9. 实时通知展示层

- `server/services/notification_publisher.go`：发布 Redis 通道 `xdfc_notifications`。
- `server/handlers/ws.go`：订阅 Redis 并按用户/权限投递 WebSocket。
- `src/hooks/use-notifications.ts`：前端 WS 入口，负责把 Workflow/Approval/System 消息沉淀到前端 store。
- `src/features/system-mgmt/notifications/notification-store.ts`：新版通知中心消息状态。
- `src/features/system-mgmt/notifications/components/notification-center.tsx`：底部通知中心弹窗。

底部通知中心应是用户查看消息的稳定入口；不要只 toast 不入库。

## 10. 维护红线

- 不恢复旧消息中心跳转入口。
- 不把消息中心配置塞回系统管理状态页。
- 不新增第二套事件源/规则/模板 API service。
- 不在页面组件里直接执行复杂规则。
- 不保留旧订单链接兼容修正；项目未正式生产，旧链接应直接清理。
- 新事件源必须同时说明：模板、实体、状态字典、默认落库策略、实时入口、追溯入口、执行日志策略。
