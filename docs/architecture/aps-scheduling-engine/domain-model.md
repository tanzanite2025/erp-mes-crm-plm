# APS 排产引擎 - 数据模型

## 1. 目标

本文件用于描述排产引擎的基础对象，先把“排什么、排给谁、什么时候排”定义清楚。

## 2. 核心对象

### 2.1 Order

订单是排产的入口对象，至少包含：

- 订单号
- 客户
- 交期
- 优先级
- 数量
- 状态
- 是否允许拆分

### 2.2 Route / Process

订单需要映射到生产域的已发布工艺路线 `ProductionRoute`，路线步骤使用 `ProductionRouteStep`，至少包含：

- `ProductionLine` / `LineSegment`
- `ProcessStep` 作业项目
- `sequence` 工序顺序
- `estimatedMinutes` 每道工序耗时
- `executionMode` 本厂或委外执行方式
- `qualityGate` 质量关卡
- 是否必须按顺序执行
- 是否允许跨线

工程 BOM 的 `BOMSection` 只负责物料分类，不是 APS 的工段或工序来源。BOM 物料和路线步骤之间如果需要表达领料或消耗点，应通过独立的物料与工艺步骤关联，不应根据 `BOMItem.section` 猜测生产路线。

### 2.3 Production Resource

资源用于表达排产依赖的生产能力，至少包含：

- 产线
- L2/L3 生产结构节点
- 设备
- 人员
- 可用工时

### 2.4 Calendar

日历用于表达可排产日期，至少包含：

- 工作日
- 休息日
- 法定节假日
- 临时加班日
- 停线日

### 2.5 Schedule Plan

排产结果对象，至少包含：

- 关联订单
- 关联产线
- 开始时间
- 结束时间
- 占用资源
- 排产版本
- 状态

### 2.6 Schedule Event

动态调整事件，至少包含：

- 条码记录
- 签到记录
- 到岗记录
- 设备状态变化
- 缺料
- 停机
- 人工调整

## 3. 建议拆分

后续可进一步拆成：

- `order-model.md`
- `resource-model.md`
- `calendar-model.md`
- `schedule-plan-model.md`
- `schedule-event-model.md`

## 4. 简化原则

第一版先不要把模型做得太复杂，先保证：

1. 能描述订单
2. 能描述资源
3. 能描述日历
4. 能描述排产结果
5. 能记录动态事件
