# APS 排产引擎启发式 + 贪婪排产后端设计文档

## 1. 文档目标

本文档用于定义 APS 排产引擎中“启发式 + 贪婪”的核心实现方案，面向后端开发交付，重点解决：

- 订单下达后如何快速生成初始排产
- 如何在多约束下选择当前最优可行方案
- 如何把休息日、加班、条码签到等动态事件纳入重排
- 如何输出可追踪、可回放、可版本化的排产结果

---

## 2. 设计原则

1. **先可行，再优化**
   - 先生成一个能执行的计划，再逐步做局部优化。

2. **贪婪选择**
   - 每一步都选当前评分最高的可行方案，不追求一次性全局最优。

3. **启发式打分**
   - 使用业务经验规则对候选方案打分，而不是只依赖纯数学求解。

4. **静态排产 + 动态修正**
   - 初排使用静态规则，后续通过事件触发局部重排。

5. **版本化与审计**
   - 每次排产与重排都必须保留版本、差异和触发原因。

---

## 3. 模块划分

### 3.1 `order-normalizer`

职责：

- 接收订单输入
- 补齐排产所需字段
- 拆分工序任务
- 生成可调度任务列表

输出：

- 标准化订单任务

---

### 3.2 `candidate-scorer`

职责：

- 对每个待排任务生成候选方案
- 按业务规则打分
- 输出候选方案排序结果

评分维度示例：

- 交期紧迫度
- 优先级
- 资源匹配度
- 切换成本
- 日历可用度
- 设备状态
- 冻结区影响
- 产能负载均衡

---

### 3.3 `resource-matcher`

职责：

- 根据工艺、产线、设备、人员、班次等约束筛选可用资源
- 过滤掉不可排资源
- 输出候选资源集合

---

### 3.4 `time-window-finder`

职责：

- 在候选资源上寻找可插入时间窗
- 判断是否跨休息日、节假日、停线日
- 判断是否超出交期或冻结区

---

### 3.5 `greedy-planner`

职责：

- 从候选方案中选择当前评分最高的一个
- 写入临时排产结果
- 继续处理下一个任务

---

### 3.6 `event-driven-replanner`

职责：

- 接收条码、签到、设备、物料等事件
- 识别受影响范围
- 触发局部重排或全局重排

---

### 3.7 `schedule-version-store`

职责：

- 保存排产版本
- 保存版本差异
- 保存触发原因与审计信息

---

## 4. 数据结构

### 4.1 `OrderTask`

```go
type OrderTask struct {
    ID            string
    OrderID       string
    OrderNo       string
    Priority      int
    DueAt         time.Time
    Quantity      int
    AllowSplit    bool
    RouteID       string
    Status        string
    Frozen        bool
}
```

说明：

- `Frozen` 表示该任务是否处于冻结区，不允许随意重排。

---

### 4.2 `ResourceCandidate`

```go
type ResourceCandidate struct {
    ResourceID   string
    LineID       string
    StationID    string
    DeviceID     string
    UserID       string
    ShiftID      string
    Available    bool
    Score        float64
}
```

说明：

- 用于表达某个任务可用的候选资源及其评分。

---

### 4.3 `TimeWindowCandidate`

```go
type TimeWindowCandidate struct {
    StartAt      time.Time
    EndAt        time.Time
    WorkdayFlag  bool
    OvertimeFlag bool
    HolidayFlag  bool
    Conflict     bool
    Score        float64
}
```

说明：

- 用于表达某个资源上的可用时间窗。

---

### 4.4 `PlanAssignment`

```go
type PlanAssignment struct {
    TaskID     string
    ResourceID string
    StartAt    time.Time
    EndAt      time.Time
    Version    int
    Status     string
    Reason     string
}
```

说明：

- 单个任务最终被排到某个资源和时间窗上。

---

### 4.5 `ScheduleVersion`

```go
type ScheduleVersion struct {
    ID           string
    Version      int
    TriggerType  string
    TriggerID    string
    CreatedAt    time.Time
    CreatedBy    string
    DiffSummary  string
}
```

说明：

- 用于记录每次计划变化的版本信息。

---

### 4.6 `ReplanEvent`

```go
type ReplanEvent struct {
    ID         string
    Type       string
    Source     string
    OccurredAt time.Time
    Payload    map[string]any
}
```

说明：

- 用于接收条码、签到、设备、物料等事件。

---

## 5. 算法流程图文字版

### 5.1 初始排产流程

1. 接收订单列表与资源列表
2. 标准化订单任务
3. 按业务规则计算任务优先级
4. 依次取出最高优先级任务
5. 为任务筛选可用资源
6. 为每个资源寻找可用时间窗
7. 对每个候选方案进行启发式打分
8. 选择当前评分最高的可行方案
9. 写入排产结果
10. 标记该任务已处理
11. 重复以上步骤直到全部任务完成
12. 输出排产版本

---

### 5.2 动态重排流程

1. 接收动态事件
2. 判断事件影响范围
3. 定位受影响任务与资源
4. 冻结已执行区
5. 只对可重排区重新计算
6. 若局部重排失败，则扩大到全局重排
7. 生成新版本
8. 记录版本差异和触发原因
9. 输出新排产结果

---

## 6. 启发式评分建议

### 6.1 评分函数示例

```text
score = 交期紧迫度
      + 优先级权重
      + 资源匹配度
      + 时间窗可用度
      + 日历可用度
      + 事件加权
      - 切换成本
      - 冻结区冲突
      - 风险惩罚
```

---

### 6.2 权重建议

- 交期紧迫度：高权重
- 优先级：高权重
- 资源匹配度：高权重
- 切换成本：中权重
- 冻结区冲突：高惩罚
- 设备故障风险：中高惩罚
- 休息日条码确认上班：正向加权

---

## 7. 伪代码

### 7.1 初始排产伪代码

```text
function buildPlan(orders, resources, calendar, rules):
    tasks = normalizeOrders(orders)
    sortedTasks = sortTasksByHeuristic(tasks, rules)
    assignments = []

    for task in sortedTasks:
        if task.frozen:
            continue

        candidateResources = matchResources(task, resources, calendar, rules)
        bestCandidate = nil
        bestScore = -infinity

        for resource in candidateResources:
            windows = findAvailableWindows(task, resource, calendar, rules)

            for window in windows:
                score = scoreCandidate(task, resource, window, rules)

                if score > bestScore:
                    bestScore = score
                    bestCandidate = {task, resource, window, score}

        if bestCandidate is not nil:
            assignment = createAssignment(bestCandidate)
            assignments.append(assignment)
            markResourceOccupied(resource, window)
        else:
            markTaskUnscheduled(task)

    return createScheduleVersion(assignments)
```

---

### 7.2 动态重排伪代码

```text
function replan(event, currentPlan, orders, resources, calendar, rules):
    impactScope = detectImpactScope(event, currentPlan)

    if impactScope is empty:
        return currentPlan

    frozenArea = getFrozenAssignments(currentPlan)
    replanArea = getReplanTargets(currentPlan, impactScope)

    if canLocalReplan(replanArea, rules):
        updatedAssignments = greedyReplan(replanArea, resources, calendar, rules)
    else:
        updatedAssignments = globalReplan(orders, resources, calendar, rules)

    newVersion = buildNewVersion(currentPlan, updatedAssignments, event)
    saveVersionDiff(currentPlan, newVersion, event)

    return newVersion
```

---

## 8. API 草案

### 8.1 创建初始排产

`POST /aps-scheduling/plans`

请求：

```json
{
  "orderIds": ["O1001", "O1002"],
  "strategy": "greedy",
  "scope": "full"
}
```

返回：

```json
{
  "planId": "PLAN-20260417-001",
  "version": 1,
  "status": "draft",
  "assignmentCount": 18
}
```

---

### 8.2 查询排产计划

`GET /aps-scheduling/plans`

支持参数：

- `lineId`
- `dateFrom`
- `dateTo`
- `version`

---

### 8.3 查询单个计划

`GET /aps-scheduling/plans/:id`

返回完整排产明细与版本信息。

---

### 8.4 触发重排

`POST /aps-scheduling/plans/:id/recalculate`

请求：

```json
{
  "reason": "barcode attendance on holiday",
  "scope": "local"
}
```

返回：

```json
{
  "planId": "PLAN-20260417-001",
  "version": 2,
  "status": "recalculated"
}
```

---

### 8.5 写入动态事件

`POST /aps-scheduling/events`

请求：

```json
{
  "type": "barcode",
  "source": "attendance-machine",
  "payload": {
    "userId": "U001",
    "lineId": "LINE-01",
    "code": "BC-20260417-001"
  }
}
```

返回：

```json
{
  "eventId": "EVT-001",
  "accepted": true,
  "replanTriggered": true
}
```

---

## 9. 后端实现建议

### 9.1 静态排产入口

建议按下面路径组织：

- `planner/static/order`
- `planner/static/resource`
- `planner/static/apsengineplannerstatic.go`

### 9.2 动态重排入口

建议按下面路径组织：

- `planner/dynamic/local`
- `planner/dynamic/global`
- `events/barcode`
- `events/attendance`
- `events/machine`
- `events/material`

### 9.3 API 层

建议拆为：

- `api/handler`
- `api/dto`

---

## 10. 实施顺序建议

1. 先实现订单标准化
2. 再实现资源匹配
3. 再实现时间窗搜索
4. 再实现启发式评分
5. 再实现贪婪首排
6. 再实现事件驱动重排
7. 最后补版本、差异和审计

---

## 11. 结论

本方案适合 APS 场景的核心原因是：

- 可快速生成可执行计划
- 可解释性强
- 适应休息日、加班、条码签到等动态变化
- 易拆模块、易分阶段落地
- 便于后续接入更复杂优化算法

对于当前阶段，建议先把“启发式 + 贪婪”作为 APS 排产引擎的第一版主算法。
