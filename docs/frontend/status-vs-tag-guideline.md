# 前端展示约定：状态类 vs 标签类

本文档用于统一销售、采购、仓库、质量、审批等模块里的前端展示语义，避免把“流程状态”和“说明标签”混成一套视觉。

## 目标

- 让用户一眼区分“当前处于什么业务状态”与“这只是一个补充标签/风险提示”。
- 让状态颜色、圆角、点位、字重在跨模块场景下保持一致。
- 让新页面接入时优先复用已有能力，而不是重新手写 `Badge`。

## 一句话规则

- 状态类：用 `AuditStatusDisplay`
- 标签类：用普通标签样式，不要伪装成状态

## 什么是状态类

状态类表示某个对象当前所处的正式业务阶段，通常来自后端字段、流程引擎、单据状态机或审批链路。

常见例子：

- 采购订单状态：`Draft / Sent / Awaiting / Received / Canceled`
- 采购退货单状态：`Created / Submitted / Completed / Canceled`
- 审批状态：`PENDING / APPROVED_L1 / APPROVED / REJECTED / CONSUMED / EXPIRED`
- 仓库调整状态：`PENDING / APPROVED / EXECUTED / REJECTED`
- 盘点任务状态：`DRAFT / IN_PROGRESS / COMPLETED / ADJUSTED`
- 质量标准审核联动状态：`Pending Review / Review Complete / Missing Review`

判定标准：

- 是否直接影响下一步可执行动作
- 是否表示对象生命周期中的一个正式阶段
- 是否应该在列表、详情、打印、审批、过滤中保持同一种语义

## 什么是标签类

标签类是补充说明，不代表主流程阶段。

常见例子：

- 异常分类
- 退货原因
- 风险提示
- 指标类型
- 归档标签
- 健康度标签
- 批次号、品类、渠道、来源标识

判定标准：

- 去掉后不影响主流程判断
- 更像注释、分类、补充视角，而不是对象状态机
- 同一对象可以同时存在多个标签

## 实现约定

### 1. 展示层统一

状态类统一使用：

- `src/components/common/audit-status-display.tsx`

组件输入：

- `meta.label`
- `meta.className`
- `meta.dotClassName`
- 可选 `meta.note`

可用能力：

- 只显示状态胶囊
- 胶囊 + 点位
- 只显示说明 note
- note 走 `text` 或 `box` 两种样式
- 在按钮、卡片、表格、详情块里复用

### 2. 业务语义放在模块内

不要把业务状态枚举判断写进共享组件。

正确做法：

- 各模块自己提供 `getXxxStatusMeta(...)`
- 共享组件只负责渲染

当前参考实现：

- 审批：`src/features/approval/approval-i18n.ts`
- 采购：`src/features/trading/data/purchase-status.ts`
- 仓库：`src/features/warehouse/utils/warehouse-status-display.ts`
- 质量：`src/features/quality/utils/quality-utils.ts`

### 3. 可点击筛选也按状态类处理

如果顶部筛选按钮本质上是在筛“状态”，仍然应该复用状态 token。

正确模式：

- 外层是 `button`
- 内层放 `AuditStatusDisplay`
- 选中态由按钮容器控制
- 状态文字和颜色仍由模块 `getXxxStatusMeta(...)` 提供

## 不推荐做法

不要这样做：

- 在每个页面单独手写一套 `Badge className='bg-blue...'`
- 把“异常分类”“风险提示”做成和正式状态完全一样的视觉
- 共享组件里直接写死采购/仓库/审批的业务枚举
- 同一状态在列表是蓝色、详情又变成绿色
- 同一业务含义在不同模块有不同字重、圆角和颜色

## 当前已落地参考

### 状态类

- 采购订单列表筛选：`src/features/trading/components/purchase/purchase-order-list.tsx`
- 采购主列表：`src/features/trading/components/purchase/purchase-order-master.tsx`
- 采购详情：`src/features/trading/components/purchase/purchase-order-detail.tsx`
- 采购表单头部：`src/features/trading/components/purchase/parts/purchase-order-header-fields.tsx`
- 采购收货确认：`src/features/trading/components/purchase/purchase-receipt-confirm-dialog.tsx`
- 采购退货：`src/features/trading/components/purchase/purchase-order-returns.tsx`
- 采购日志里的删除归档状态：`src/features/trading/components/purchase/purchase-order-logs.tsx`
- 审批历史/待办：`src/features/approval/tabs/approval-history.tsx`、`src/features/approval/tabs/approval-requests.tsx`
- 仓库调整/盘点：`src/features/warehouse/tabs/adjustment-history.tsx`、`src/features/warehouse/tabs/stocktake-mgmt.tsx`
- 质量标准列表/详情：`src/features/quality/components/*`、`src/features/quality/utils/quality-utils.ts`

### 标签类

- 采购退货的异常分类、退货原因：保留标签样式，不走状态组件
- 采购日志顶部四张概览卡的 `archive / risk / metric / health`：按标签类处理

## 新页面接入清单

新增页面时按下面顺序做：

1. 先判断字段是“状态类”还是“标签类”
2. 如果是状态类，在所属模块新增或复用 `getXxxStatusMeta(...)`
3. 页面上统一使用 `AuditStatusDisplay`
4. 如果只是标签类，保留普通标签样式，不要复用状态色语义
5. 如果同一对象有“主状态 + 审核状态 + 风险提示”，三者应拆开显示，不要混成一个 badge

## 简单判断口诀

- 决定流程走向的，是状态
- 只做补充说明的，是标签

