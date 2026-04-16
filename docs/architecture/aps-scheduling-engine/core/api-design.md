# APS 排产引擎 - API 设计

## 1. 排产生成

- `POST /aps-scheduling/plans`

## 2. 排产查询

- `GET /aps-scheduling/plans`
- `GET /aps-scheduling/plans/:id`

## 3. 重排

- `POST /aps-scheduling/plans/:id/recalculate`

## 4. 事件接入

- `POST /aps-scheduling/events`

## 5. 版本与差异

- `GET /aps-scheduling/plans/:id/diff`

## 6. 原则

- 幂等
- 可审计
- 可版本化
- 可局部重排
