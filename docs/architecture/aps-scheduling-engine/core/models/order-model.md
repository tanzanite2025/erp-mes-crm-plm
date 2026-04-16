# APS 排产引擎 - Order 模型

## 1. 目的

订单模型用于表达排产的输入来源。

## 2. 建议字段

- `id`
- `orderNo`
- `customerId`
- `priority`
- `dueDate`
- `quantity`
- `status`
- `allowSplit`
- `routeId`

## 3. 说明

订单进入排产前，应先被转换为可调度对象，再进入引擎计算。
