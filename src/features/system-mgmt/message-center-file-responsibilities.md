# 消息中心文件职责图

适用范围：

- `src/features/system-mgmt/tabs/*`
- `src/features/system-mgmt/workflow-core/*`

这份文档的目标不是解释业务，而是**钉死文件职责边界**。后面继续加业务事件源、通知规则、通知内容模板、执行日志能力时，优先按这里落位，避免再长回“大杂烩”。

## 1. 总体分层

```text
approval/routing 页面
  -> RoutingTab (4 个 TAB 页壳)
    -> 规则 TAB
      -> NotificationRuleList
        -> RuleCard
          -> RuleStatusRow
            -> RuleTemplatePanel
    -> 事件源 TAB
      -> BusinessEventSourceList
        -> BusinessEventSourceCard + drawers/model/helpers
    -> 模板 TAB
      -> CommandMgmt
        -> CommandList
        -> CommandForm
    -> 执行日志 TAB
      -> RuleExecutionLogTab

workflow-core
  -> data: schema / normalizer / template definitions
  -> hooks: 页面级数据读取与 CRUD 入口
  -> services: API、执行 core、matcher、resolver、executor
```

---

## 2. 四个 TAB 的职责边界

### A. RoutingTab

文件：

- [routing-tab.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/routing-tab.tsx)

职责：

- 只负责消息中心 4 个二级 TAB 的页壳
- 只负责每个 TAB 的标题、提示文案、切页容器
- 不负责规则编辑逻辑
- 不负责事件源编辑逻辑
- 不负责模板 CRUD 逻辑
- 不负责执行日志查询逻辑

禁止继续塞入：

- 任何规则数据拼装
- 任何事件源筛选状态
- 任何模板弹窗状态
- 执行日志 query/filter state

判断标准：

- `routing-tab.tsx` 应该永远像一个“导航壳”，而不是业务实现文件

---

### B. 通知与审批规则 TAB

主文件：

- [notification-rule-list.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/notification-rule-list.tsx)

子组件：

- [notification-rule-list-toolbar.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/notification-rule-list-toolbar.tsx)
- [notification-rule-create-actions.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/notification-rule-create-actions.tsx)
- [notification-rule-list-empty.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/notification-rule-list-empty.tsx)
- [rule-card.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/rule-card.tsx)
- [rule-card-model.ts](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/rule-card-model.ts)
- [rule-status-row.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/rule-status-row.tsx)
- [rule-template-panel.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/rule-template-panel.tsx)

#### `notification-rule-list.tsx`

职责：

- 规则列表页容器
- 调 `useNotificationRules()` 和 `useBusinessEventSources()`
- 列表级搜索、业务源筛选
- 新建规则
- 新建后滚动定位 / 高亮
- 把单条规则交给 `RuleCard`

不负责：

- 单条规则内部的状态编辑
- 模板预览细节
- 完整度算法
- 单状态行交互

#### `rule-card.tsx`

职责：

- 单条规则的外层壳
- 规则头部摘要
- 折叠/展开
- 规则级别 state
- 把状态行数据拼好后交给 `RuleStatusRow`
- 连接 `CommandForm` 作为模板创建/复制入口

不负责：

- 纯计算逻辑
- 模板预览渲染细节
- 单状态行的 UI 细节

#### `rule-card-model.ts`

职责：

- 规则卡纯函数
- 默认值
- 完整度判断
- 状态预览文案
- segment normalize / create

要求：

- 只放纯函数和常量
- 不依赖 React
- 不依赖 UI 组件

#### `rule-status-row.tsx`

职责：

- 单状态行编辑
- 通知对象
- 是否审批 / 审批人
- 高级项（动态通知对象 / 动态审批人）
- 状态级预览

不负责：

- 规则级筛选
- 列表级创建逻辑

#### `rule-template-panel.tsx`

职责：

- 状态行内部的“通知内容模板”块
- 模板选择
- 新建模板入口
- 复制模板入口
- 模板正文 / 跳转链接 / 变量高亮预览

规则：

- 模板相关 UI 继续往这个文件聚拢
- 不要把模板块重新塞回 `rule-status-row.tsx` 或 `rule-card.tsx`

---

### C. 业务事件源 TAB

主文件：

- [business-event-source-list.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/business-event-source-list.tsx)

相关文件：

- [business-event-source-list-helpers.ts](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/business-event-source-list-helpers.ts)
- [business-event-source-list-header.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/business-event-source-list-header.tsx)
- [business-event-source-list-hint.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/components/business-event-source-list-hint.tsx)
- `business-event-source-card*.ts(x)` 一组文件

职责：

- 管“有哪些业务流程已接入”
- 管事件源导入模板、复制、新建空白
- 管事件源卡片编辑入口

事件源卡片内部边界：

- `business-event-source-card.tsx`：卡片壳层
- `business-event-source-card-model*.ts`：草稿、diff、serialize/deserialize、局部保存
- `business-event-source-card-drawers.tsx`：状态/字段/接收人抽屉
- `business-event-source-card-primitives.tsx`：可复用基础片段

要求：

- 新事件源功能优先落在 `business-event-source-card-*` 体系内
- 不要把事件源编辑逻辑重新写回 `business-event-source-list.tsx`

---

### D. 通知内容模板 TAB

主文件：

- [index.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/components/command-mgmt/index.tsx)

相关文件：

- [command-list.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/components/command-mgmt/command-list.tsx)
- [command-form.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/components/command-mgmt/command-form.tsx)

职责：

- 模板库管理页
- 模板搜索
- 模板新增/编辑/删除

要求：

- 模板页只负责“内容模板库”
- 不再引入规则上下文判断
- 规则内模板交互，优先放在 `rule-template-panel.tsx`
- 模板页只做资产管理，不做规则编排

---

### E. 执行日志 TAB

主文件：

- [rule-execution-log-tab.tsx](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/tabs/rule-execution-log-tab.tsx)

职责：

- 执行日志查询条件
- 前端关键词过滤
- 统计卡
- 日志列表渲染
- 错误文案兼容映射

当前状态：

- 这块已经偏大，是下一个可拆目标

建议后续拆分方向：

- `rule-execution-log-toolbar.tsx`
- `rule-execution-log-summary.tsx`
- `rule-execution-log-list.tsx`
- `rule-execution-log-presenter.ts`

---

## 3. hooks 的职责边界

### `useNotificationRules`

文件：

- [use-notification-rules.ts](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts)

职责：

- rules 数据加载
- rule CRUD
- 启停规则
- 新增/更新后触发补偿扫描

不负责：

- 列表 UI state
- 筛选 state
- 单规则编辑 UI state

备注：

- 如果以后要加“批量启停 / 批量删除 / 批量复制”，优先继续放这里或它的 helper，而不是散落在页面组件里

### `useBusinessEventSources`

文件：

- [use-business-event-sources.ts](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/hooks/use-business-event-sources.ts)

职责：

- 事件源数据加载
- 事件源 CRUD

### `useCommands`

文件：

- [use-commands.ts](C:/Users/P16V/Desktop/纤镀软件开发/XDFC/src/features/system-mgmt/workflow-core/hooks/use-commands.ts)

职责：

- 模板库数据加载
- 模板 CRUD

规则：

- 规则页、模板页都可以用这个 hook
- 但业务特化的模板交互，不要反向写回这个 hook

---

## 4. workflow-core 的职责边界

### data

目录：

- `workflow-core/data/*`

职责：

- schema
- DTO normalize / serialize / deserialize
- 默认模板定义
- 业务事件源定义

要求：

- 所有前后端 shape 锁定都在这里
- 新业务事件源先落 `data/business-event-source-templates/*`
- 不在页面组件里手搓 shape

### services

目录：

- `workflow-core/services/*`

职责：

- API 访问
- rule execution core
- matcher / resolver / executor
- execution log writer

要求：

- 业务执行链路改动，优先落 service
- 页面层只调用 service / hook，不直接拼执行逻辑

---

## 5. 后续加功能时的落位规则

### 加一个新的业务事件源

应该改：

- `workflow-core/data/business-event-source-templates/*`
- 必要时 `business-event-source-schema.ts`
- 若有默认导入逻辑，再看 `business-event-source-list-helpers.ts`

不应该改：

- `routing-tab.tsx`
- `notification-rule-list.tsx`

### 给规则增加新的状态级能力

例如：

- 升级审批链
- 增加抄送
- 增加通知策略

优先改：

- `rule-status-row.tsx`
- `rule-card-model.ts`
- 必要时 `notification-rule-schema.ts`

不应该优先改：

- `notification-rule-list.tsx`

### 给模板增加新的表现能力

例如：

- 变量高亮
- 预览模式
- 模板复制增强

优先改：

- `rule-template-panel.tsx`
- `command-form.tsx`
- `command-list.tsx`

### 给日志增加新的查看方式

例如：

- 按规则聚合
- 详情抽屉
- 回放

优先改：

- `rule-execution-log-tab.tsx`
- 拆出的 `rule-execution-log-*` 组件

---

## 6. 明确禁止的回退方式

以后继续做消息中心时，避免这几种回退：

1. 把纯函数重新塞回 `rule-card.tsx`
2. 把模板预览逻辑重新塞回 `rule-status-row.tsx`
3. 把事件源编辑逻辑塞回 `business-event-source-list.tsx`
4. 把执行日志过滤和渲染继续无限堆在 `rule-execution-log-tab.tsx`
5. 把 `routing-tab.tsx` 再次做成带大量业务 state 的大页

---

## 7. 当前推荐的下一步拆分顺序

1. 拆 `rule-execution-log-tab.tsx`
2. 保持 `routing-tab.tsx` 不动
3. 继续新增业务事件源时，严格走 `data template -> source list/card -> rule row` 这条线

---

## 8. 一句话原则

**RoutingTab 只做导航，List 只做列表，Card 只做单对象，Model 只做纯计算，Service 只做执行链路。**

谁跨了这条线，文件就会重新长胖。
