# APS 排产引擎 - API 设计

## 1. 目标

本文件用于描述排产引擎对外提供的接口，先把输入输出边界固定下来。

## 2. 建议接口

### 2.1 创建排产

- `POST /aps-scheduling/plans`
- 用于根据订单和当前资源生成初始计划

### 2.2 查询排产计划

- `GET /aps-scheduling/plans`
- 用于查询计划列表

### 2.3 查询单个计划

- `GET /aps-scheduling/plans/:id`
- 用于查看某个排产版本详情

### 2.4 触发重排

- `POST /aps-scheduling/plans/:id/recalculate`
- 用于对某个计划执行重新计算

### 2.5 写入动态事件

- `POST /aps-scheduling/events`
- 用于接收条码、签到、设备、缺料等事件

### 2.6 查询版本差异

- `GET /aps-scheduling/plans/:id/diff`
- 用于查看版本变化

## 3. 接口原则

1. 排产接口必须幂等
2. 事件接口必须可追溯
3. 重排接口必须返回版本号
4. 查询接口必须支持按产线和日期过滤

## 4. 简化原则

第一版 API 不要一次做太多，先保证：

- 能生成计划
- 能查计划
- 能写事件
- 能重排
- 能看版本
