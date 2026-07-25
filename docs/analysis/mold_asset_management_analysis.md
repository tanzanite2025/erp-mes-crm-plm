# 模具资产管理审计历史记录

> 状态：原审计已过期，不再作为当前整改清单。
> 更新时间：2026-07-25

## 过期原因

原报告基于早期前端本地存储/IndexedDB 风险进行判断，其中提到的 `StorageService`、全量覆盖写入和前端本地事务缺失，已经不能代表当前模具资产模块的真实架构。

当前模具相关能力已经存在后端 API、服务和前端 feature 边界，例如：

- `server/handlers/molds.go`
- `server/handlers/mold_loans.go`
- `server/handlers/equipment_mold_dto.go`
- `src/features/equipment-tooling/services/mold-core-service.ts`
- `src/features/equipment-tooling/services/mold-loan-service.ts`
- `src/features/equipment-tooling/services/mold-maintenance-service.ts`
- `src/features/equipment-tooling/services/mold-transaction-service.ts`

因此，不能继续按原报告中的 IndexedDB 风险直接开工。

## 当前仍可保留的审计方向

后续如果重新审计模具资产，应基于当前后端链路重新确认：

1. 模具生命周期状态机是否合法；
2. 借出、归还、维保、报废是否在后端事务内闭环；
3. 状态变更、寿命调整、外借流转是否写入审计；
4. 删除是否保留历史引用，不产生孤儿借用记录；
5. 图纸版本与实际生产使用版本是否可追溯；
6. 遥测或寿命计数是否具备异常校验。

## 当前处理原则

这份文件只保留为历史提醒。真正要做模具治理时，应先重新画当前文件职责和数据链路，再决定是否拆分服务或补事务。
