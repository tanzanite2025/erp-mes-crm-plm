# 变更记录与验证（walkthrough.md）

### 实现细节（BOM 导入 authority 收口）

1. **停止在前端解析阶段生成 `standardUsage`**
   - `bom-excel-parser.ts` 不再根据 `unitUsage * (1 + wastage / 100)` 生成 `standardUsage`
   - 导入阶段只保留原始采集字段

2. **停止在导入落地阶段透传 `standardUsage`**
   - `use-bom-data.ts` 中 `processedItems` 不再写入 `standardUsage`
   - 同时移除对导入行里 `standardUsage` 的前端校验依赖

3. **authority 边界明确化**
   - 这一步把 `standardUsage` 从“客户端可带入的派生结果”降级回“应由服务端当前工程配置重算的值”

### 实现细节（源码字符集损坏修复）

1. **修复 `use-bom-data.ts` 的乱码报错块**
   - 删除损坏的 `toast.error('BOM 鐎电厧...')`
   - 保留已存在的本地化失败提示 `t('engineering.bomArchive.toasts.parseFailed')`

2. **修复 `drilling-action-dialog.tsx` 的损坏文案**
   - 标题
   - 描述
   - 按钮文案
   - 标签文案
   - placeholder 文案
   - 注释文本

### 实现细节（Drilling dialog 可维护性收口）

1. **显式使用产品 options 模式查询**
   - `useGetProducts({ mode: 'options' })`

2. **同步修复现有表单 immutability / typing 问题**
   - 引入 `DeltaSet`
   - 去掉 `delta?: any`
   - 补 `setFormData / updateField`
   - 移除 `useMemo` 对 `open` 的多余依赖

3. **保持边界不扩写**
   - 本轮没有新增钻孔公式联动
   - 没有把 dialog 扩成钻孔权威计算引擎

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有把 BOM 导入链路一次性改造成完整后端重算平台
2. 没有在没有实锤前编造钻孔联动 authority 泄露整改
3. 没有对 engineering-db 全域组件做乱码扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/hooks/use-bom-data.ts src/features/engineering/services/bom-excel-parser.ts src/features/engineering-db/components/drilling-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十一轮的真实问题按最小边界收口：BOM Excel 导入不再把客户端的 `standardUsage` 当作可直接落库的派生值；`use-bom-data.ts` 的乱码报错块已被移除；`drilling-action-dialog.tsx` 的大面积字符集损坏也已恢复可读，同时保持了“当前未实锤钻孔权威公式泄露”的审计结论，没有把本轮扩大成不存在的联动算法整改。

## 2026-04-12 - audit：第二十二轮审计修复（Sales Order 摘要 authority + i18n fallback gap + use-products 生命周期审计）

### 本轮目标

围绕两个实锤问题和一个非实锤点做最小、可验证收口：

1. 收口订单证据区标题的英文硬编码兜底
2. 为 `use-products.ts` 的 `options / page` 模式补生命周期边界
3. 保留销售详情摘要金额 authority 的真实审计结论，不虚构不存在的前端重算整改

### 本轮真实结论

1. `useSalesOrderDetailSummaryViewModel` 当前未实锤前端重算订单总额
2. 证据区标题存在 `Order Evidence` / `Purchase Evidence` 英文硬编码兜底
3. `use-products.ts` 已支持 `mode: 'options' | 'page'`，但此前仍共用同一个 `staleTime`

### 本轮实现

本轮修改文件：

1. `src/features/trading/components/parts/order-evidence-gallery.tsx`
2. `src/features/trading/components/parts/sales-order-detail-summary.tsx`
3. `src/features/trading/components/purchase/purchase-order-detail.tsx`
4. `src/features/engineering/hooks/use-products.ts`

### 实现细节（i18n fallback 收口）

1. **移除 `OrderEvidenceGallery` 内部英文兜底**
   - 删除 `fallbackTitle?: string`
   - 删除默认英文值 `Order Evidence`
   - 删除 `t(titleKey) || fallbackTitle` 这类英文 fallback 路径

2. **收口调用点**
   - `sales-order-detail-summary.tsx` 不再传 `fallbackTitle='Order Evidence'`
   - `purchase-order-detail.tsx` 不再传 `fallbackTitle='Purchase Evidence'`

3. **本地化契约明确化**
   - 标题统一直接走翻译键
   - 不再允许组件 props 层用英文硬编码兜底

### 实现细节（产品数据生命周期边界）

1. **为 `useGetProducts()` 引入模式化 `staleTime`**
   - `options`：`5 * 60 * 1000`
   - `page`：`60 * 1000`

2. **生命周期语义更清晰**
   - 下拉 options 允许更长缓存
   - 分页列表模式使用更短缓存，降低旧数据存留时间

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `useSalesOrderDetailSummaryViewModel` 编造不存在的金额重算整改
2. 没有把销售订单编辑态预览计算体系一次性重构
3. 没有做全项目 i18n fallback 扫荡式改造

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/components/parts/order-evidence-gallery.tsx src/features/trading/components/parts/sales-order-detail-summary.tsx src/features/trading/components/purchase/purchase-order-detail.tsx src/features/engineering/hooks/use-products.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十二轮的真实问题按最小边界收口：销售订单详情摘要没有被误改成前端金额重算逻辑；订单证据区的英文兜底已经移除；`use-products.ts` 也补上了按 `options / page` 区分的默认 `staleTime` 边界，从而让产品数据缓存语义更清晰，同时避免把本轮扩大成并不存在的财务 authority 整改工程。

## 2026-04-12 - audit：第二十三轮审计修复（Material version lock authority + Excel 映射韧性 + filteredMaterials 影子逻辑核对）

### 本轮目标

围绕两个实锤问题和一个非实锤点做最小、可验证收口：

1. 收口物料 patch 调用中的版本 fallback
2. 提升物料 Excel 导入的映射韧性
3. 保留 `filteredMaterials` 当前仅为引用重命名的结论，不虚构前端影子计算整改

### 本轮真实结论

1. `use-material-mgmt-data.ts` 里此前确实存在 `data.version || 1`
2. `filteredMaterials` 当前只是 `materials` 的引用重命名，未实锤额外前端计算
3. 物料导入链路的真实问题位于 `material-archive/services/excel-service.ts`
4. 其问题主要是工作表定位、分类映射、全局版本与复合 ID 解析的韧性不足，而不是完全黑盒吞错

### 本轮实现

本轮修改文件：

1. `src/features/material-archive/hooks/use-material-mgmt-data.ts`
2. `src/features/material-archive/services/excel-service.ts`
3. `src/locales/messages/zh-CN/materialArchive.ts`
4. `src/locales/messages/en-US/materialArchive.ts`

### 实现细节（版本锁 authority 收口）

1. **移除 patch 时的非权威版本降级**
   - `use-material-mgmt-data.ts` 不再使用 `data.version || 1`
   - 当 patch 缺失 `version` 时：
     - `failLoudly(...)`
     - 直接抛错

2. **并发锁语义恢复强制性**
   - patch 必须携带真实版本号
   - 前端不再伪造默认版本 `1`

### 实现细节（Excel 映射韧性提升）

1. **收紧配置页校验**
   - `parseMaterialExcel()` 现在要求 `__SYSTEM_CONFIG__` 必须存在
   - `GLOBAL_MATERIAL_VERSION` 必须是有效正整数

2. **收紧维护页定位**
   - 不再默认回退到 `workbook.getWorksheet(1)`
   - 未找到维护页时显式失败

3. **收紧复合 ID 解析**
   - 新增 `parseCompositeId()`
   - 对 `id_version` 格式做显式校验
   - 无效格式直接失败，不再弱解析

4. **收紧分类映射**
   - `categoryMap.get(categoryLabel)` 缺失时直接报错
   - 不再把未映射标签原样透传到导入数据

5. **补齐显式失败词条**
   - `configSheetNotFound`
   - `invalidGlobalVersion`
   - `invalidCompositeId`
   - `categoryMappingMissing`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `filteredMaterials` 编造不存在的影子计算整改
2. 没有把整个物料导入体系一次性重构成全新平台
3. 没有对 material archive 其它 hooks 做扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/material-archive/hooks/use-material-mgmt-data.ts src/features/material-archive/services/excel-service.ts src/locales/messages/zh-CN/materialArchive.ts src/locales/messages/en-US/materialArchive.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十三轮的真实问题按最小边界收口：物料 patch 不再在版本缺失时静默降级到 `1`；物料 Excel 导入也从“工作表误命中 + 分类透传 + 版本语义偏弱”的宽松路径收紧为显式校验路径；同时 `filteredMaterials` 保持原样，因为当前并没有证据表明它承担了任何前端影子计算逻辑。

## 2026-04-12 - audit：第二十四轮源码损坏收口（Critical Source Corruption / Engineering Core）

### 本轮目标

围绕源码级损坏风险做最小、可验证收口：

1. 清理 `use-bom-form.ts` 中残留的前端降级语义
2. 对 engineering / engineering-db 关键文件做一次定向乱码扫描
3. 保持已恢复正常的核心文件稳定，不做无证据回滚

### 本轮真实结论

1. `use-bom-data.ts` 当前未见新的大面积乱码残留
2. `drilling-action-dialog.tsx` 当前未见新的大面积乱码残留
3. `use-bom-form.ts` 是本轮唯一仍需收口的高风险残留点
4. 当前风险更集中在历史污染残留与前端降级语义，而不是语法结构被字符集损坏破坏

### 本轮实现

本轮修改文件：

1. `src/features/engineering/hooks/use-bom-form.ts`

### 实现细节（use-bom-form.ts 残留污染收口）

1. **移除编辑态的 `standardUsage` 前端降级**
   - 不再使用 `standardUsage: item.standardUsage || 0`

2. **移除初始化态的 `standardUsage` 前端降级**
   - 不再在 `initialItems` 映射中写入 `standardUsage: item.standardUsage || 0`

3. **authority 边界恢复**
   - 表单只承接现有数据
   - 不再在前端因缺失值而主动回填 `0`

### 实现细节（定向乱码扫描）

1. **对 `engineering` 做定向检索**
   - 未发现新的大面积乱码残留

2. **对 `engineering-db` 做定向检索**
   - 未发现新的大面积乱码残留

3. **扫描结论**
   - 当前无需对 `use-bom-data.ts` 与 `drilling-action-dialog.tsx` 做重复性回滚或改写

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有把整个工程仓做全量编码迁移
2. 没有对已恢复正常的 `use-bom-data.ts` / `drilling-action-dialog.tsx` 做无证据回滚
3. 没有对 engineering 全域文件做扫荡式重写

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/hooks/use-bom-form.ts src/features/engineering/hooks/use-bom-data.ts src/features/engineering-db/components/drilling-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十四轮的真实风险按最小边界收口：`use-bom-form.ts` 中残留的 `standardUsage || 0` 前端降级语义已被移除；对 engineering / engineering-db 的定向扫描也没有再发现新的大面积乱码残留。因此当前更合理的结论不是“所有核心文件仍在持续损坏”，而是“历史字符集污染曾真实存在，当前剩余高风险残留点已继续缩小并完成定向收口”。

## 2026-04-12 - audit：第二十五轮离线持久层收口（Persistence Layer Drift / Dexie Reuse）

### 本轮目标

围绕离线持久层漂移做最小、可验证收口：

1. 让 `PersistenceService` 脱离轻量 IndexedDB KV authority 路径
2. 复用项目内已有的 `OfflineStorage` / Dexie 骨架
3. 不重复发明新的 Dexie schema 或第二套离线数据库

### 本轮真实结论

1. `PersistenceService` 当前并不直接使用 `localStorage`
2. 真实问题是它此前仍绕开现有 Dexie 离线层，走另一套轻量 IndexedDB KV 路径
3. 项目内已经有现成的 `snapshots + pendingDeltas + syncMeta + conflictRecords` 骨架可复用

### 本轮实现

本轮修改文件：

1. `src/features/system-mgmt/services/persistence-service.ts`
2. `src/offline-sync/storage/offline-storage.ts`

### 实现细节（PersistenceService 对齐 Dexie 骨架）

1. **初始化改为直接检查 Dexie 离线库**
   - `initLocalStore()` 不再调用轻量 `StorageService`
   - 改为 `OfflineStorage.ensureReady()`

2. **保存路径改为 snapshot + pending log + sync meta**
   - `saveLocal()` 现在在事务中：
     - 读取既有 snapshot
     - 计算 `baseVersion / nextVersion`
     - `saveSnapshot(...)`
     - `enqueueDelta(...)`
     - `upsertSyncMeta(...)`

3. **删除路径改为 pending log + snapshot 移除 + sync meta 更新**
   - `deleteLocal()` 不再直接删轻量 KV
   - 改为在事务中记录 delete delta，并更新离线状态

4. **读取与导出路径改为基于 snapshots**
   - `getLocal()` 直接读取 `OfflineStorage.getSnapshot(...)`
   - `getFullDataSnapshot()` 改为聚合 `listSnapshotsByEntityType(...)`

### 实现细节（OfflineStorage 通用能力补齐）

1. **补充 `ensureReady()`**
   - 供 `PersistenceService` 启动期检测 Dexie 可用性

2. **补充 snapshot 列表与删除能力**
   - `listSnapshotsByEntityType(...)`
   - `removeSnapshot(...)`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有新建第二套 Dexie 数据库
2. 没有重写整个 `offline-sync` 模块
3. 没有把所有轻量 KV 使用点一次性替换

### 验证结果

已执行：

1. `pnpm exec eslint src/features/system-mgmt/services/persistence-service.ts src/offline-sync/storage/offline-storage.ts src/offline-sync/storage/dexie-offline-db.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十五轮的真实问题按最小边界收口：`PersistenceService` 已不再依赖轻量 IndexedDB KV 作为关键 authority 路径，而是直接复用项目现有的 Dexie / `OfflineStorage` 骨架来承接 `snapshot + pending log + sync meta` 语义。这样既对齐了离线重算架构，也避免了重复造轮子和继续维护两套并行的持久层抽象。

## 2026-04-12 - audit：第二十六轮逻辑泄露收口（Mold Loan Authority + BOM Core Parameter）

### 本轮目标

围绕模具借还 authority 与 BOM 核心参数 false alarm 做最小、可验证收口：

1. 收口模具借还状态的前端动态改写
2. 复核借入场景的资产种子数据边界
3. 保持 `use-bom-data.ts` 当前已收口的 `standardUsage` 边界，不扩写不存在的问题

### 本轮真实结论

1. `use-bom-data.ts` 当前未再实锤前端计算或回填 `standardUsage`
2. 模具借还链路的实锤问题在 `MoldLoanService.getLoans()` 的前端 `OVERDUE` 再判定
3. 借入场景仍需传递 `moldData` 给当前后端接口，但应尽量保持为最小原始采集语义

### 本轮实现

本轮修改文件：

1. `src/features/equipment-tooling/services/mold-loan-service.ts`
2. `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`

### 实现细节（模具借还状态 authority 收口）

1. **移除 `getLoans()` 的前端状态覆盖**
   - 不再在前端将 `ACTIVE + expectedReturnDate < now` 改写为 `OVERDUE`
   - 列表状态统一直接使用后端返回值

2. **authority 边界恢复**
   - `ACTIVE / RETURNED / OVERDUE` 等借还状态改由后端权威决定
   - 前端不再自行覆盖状态字段

### 实现细节（借入场景种子数据边界）

1. **保留当前接口必需字段**
   - `/mold-loans/borrow` 当前仍要求 `loan + moldData`
   - 因此本轮没有破坏既有接口契约

2. **保持种子数据组装最小化**
   - `moldData` 仅继续承接当前接口所需的：
     - `sn`
     - `name`
     - `maxCycles`
     - `currentCycles`
   - 不额外扩写资产初始化裁定逻辑

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有对 `use-bom-data.ts` 编造不存在的 `standardUsage` 再整改
2. 没有重构整个 `equipment-tooling` 模块
3. 没有在本轮改造全部资产服务 authority 契约

### 验证结果

已执行：

1. `pnpm exec eslint src/features/equipment-tooling/services/mold-loan-service.ts src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts src/features/engineering/hooks/use-bom-data.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十六轮的真实问题按最小边界收口：`use-bom-data.ts` 没有被误改成重复治理的目标；模具借还链路中最明确的 authority 泄露——前端自行把借单状态改写为 `OVERDUE`——已经移除；借入场景的数据组装也保持在当前后端接口要求的最小原始采集范围内，没有继续扩大前端资产初始化语义。

## 2026-04-12 - audit：第二十七轮库存调拨并发锁收口（Concurrency Lock Vacuum / Inventory Transfer）

### 本轮目标

围绕库存调拨写路径的并发锁缺口做最小、可验证收口：

1. 为调拨服务补齐 `version` 参数
2. 让调拨请求显式提交源库存快照版本
3. 保持整改范围聚焦在调拨链路，不扩大到整个库存模块

### 本轮真实结论

1. 前端库存主实体与 DTO 本身已经具备 `version`
2. 真实问题在于 `transferInventory(...)` 写链路此前丢失了 `version`
3. 这属于高危并发锁缺口，可能放大库存悬挂与负库存风险

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **为调拨服务补齐 `version` 入参**
   - `transferInventory(...)` 现在显式接收：
     - `materialId`
     - `quantity`
     - `fromCat`
     - `toCat`
     - `version`

2. **为调拨请求补齐源库存快照版本**
   - `/inventory/transfer` 请求体新增：
     - `version`

3. **并发锁语义恢复**
   - 调拨动作不再是“只凭物料 ID 与数量”的裸写请求
   - 而是升级为“基于带版本快照的写操作”

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有重构整个库存模块
2. 没有对全部库存写接口一次性做统一改造
3. 没有修改其它非调拨库存事务

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/inventory/services/inventory-transaction-service.ts src/features/warehouse/services/inventory-transaction-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十七轮的真实问题按最小边界收口：库存调拨写路径已经显式补齐 `version`，从而不再把源库存并发锁快照静默丢在前端服务层。当前这一步至少保证了调拨请求能够把悲观锁所需的版本信息提交到后端，为后端进行冲突判定提供了必要前提，同时避免把整改范围扩大成整个库存事务体系的全面重写。

## 2026-04-12 - audit：第二十八轮 DTO 运行时校验收口（Validation Gap / Inventory Inbound Service）

### 本轮目标

围绕库存入库 Service 出口的 runtime 校验缺口做最小、可验证收口：

1. 为 `InboundRecord` 补齐 runtime schema
2. 在 `recordInbound(...)` 出口补 `parse(...)`
3. 保持 adapter 只负责映射，不承担 runtime 契约职责

### 本轮真实结论

1. `recordInbound(...)` 之前只有 DTO -> contract 映射，没有最后一道 runtime parse
2. `toInboundRecordContract(...)` 只是字段映射，不能代替 schema 校验
3. `InboundRecord` 之前只有 TypeScript interface，没有 zod 级运行时防线

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/inventory/data/schema.ts`
2. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **为 `InboundRecord` 补 runtime schema**
   - 新增 `inboundRecordSchema`
   - 并将 `InboundRecord` 类型改为从 schema 推导

2. **在 Service 出口补最后一道 parse 防线**
   - `recordInbound(...)` 先执行：
     - `ensureObjectResponse(...)`
     - `toInboundRecordContract(...)`
   - 然后新增：
     - `inboundRecordSchema.parse(contract)`

3. **adapter 边界保持清晰**
   - `inventory-api-adapter.ts` 继续只负责 DTO -> contract 映射
   - runtime 契约校验回归 Service 出口负责

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有重写整个 inventory adapter 体系
2. 没有对全部 warehouse Service 一次性补齐所有 schema parse
3. 没有扩展到其它非 inbound 事务出口

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/inventory/data/schema.ts src/features/warehouse/inventory/services/inventory-transaction-service.ts src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第二十八轮的真实问题按最小边界收口：库存入库 Service 在 DTO 映射之后已经重新补上 `inboundRecordSchema.parse(...)` 这道运行时防线，从而避免后端隐形 `null`、字段漂移或契约不完整的数据直接穿透到 UI。当前整改保持在 `InboundRecord` 与 `recordInbound(...)` 这条最小闭环内，没有把问题泛化成整个 inventory 模块的全面 schema 重构。

## 2026-04-12 - plan/impl：第三十四轮 Reservation 模型最小落地（Reservation Source of Truth + Inventory Aggregate Output）

### 本轮目标

围绕 `availableQty = onHand - reserved` 的后端权威链路做最小、可验证落地：

1. 为 `reserved` 建立独立 Reservation source of truth
2. 在库存查询中输出 `onHand / reserved / availableQty`
3. 同步前端 DTO / adapter / schema 只读消费接入

### 本轮实现

本轮修改文件：

1. `server/models/inventory.go`
2. `server/services/inventory_query_dto.go`
3. `server/services/inventory_query_mapper.go`
4. `server/services/inventory_query_service.go`
5. `server/services/inventory_command_service_test.go`
6. `server/handlers/inventory_query_handlers_test.go`
7. `server/handlers/inventory_command_handlers.go`
8. `src/features/warehouse/inventory/contracts/inventory-api-dto.ts`
9. `src/features/warehouse/inventory/data/schema.ts`
10. `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`

### 实现细节（后端）

1. **新增 Reservation 模型**
   - 在 `server/models/inventory.go` 新增 `Reservation`
   - 使用 `inventory_reservations` 作为独立预留表
   - 明确保留：
     - 物料
     - 仓类
     - 批次
     - 数量
     - 状态
     - 来源单据
     - 生命周期时间戳

2. **库存查询 DTO 输出权威派生字段**
   - 在 `server/services/inventory_query_dto.go` 扩展：
     - `onHand`
     - `reserved`
     - `availableQty`

3. **库存查询聚合 Reservation**
   - 在 `server/services/inventory_query_service.go` 新增 Reservation 聚合逻辑
   - 当前按 `material_id + category_code + batch_no + status=RESERVED` 聚合 `reserved`

4. **mapper 输出最终权威结果**
   - 在 `server/services/inventory_query_mapper.go` 中：
     - `onHand = item.Quantity`
     - `reserved = Reservation 聚合值`
     - `availableQty = onHand - reserved`

5. **兼容现有 patch 响应**
   - `PatchInventoryHandler` 的 mapper 调用补了显式 `reserved=0`
   - 避免旧响应链路因为新签名中断

### 实现细节（前端）

1. **扩展 DTO 契约**
   - `InventoryItemApiDTO` 新增：
     - `onHand`
     - `reserved`
     - `availableQty`

2. **扩展前端实体**
   - `InventoryRecord` 新增：
     - `onHand`
     - `reserved`
     - `availableQty`

3. **adapter 只读消费**
   - `toInventoryRecordContract(...)` 现在显式映射：
     - `onHand`
     - `reserved`
     - `availableQty`
   - 没有在前端补任何公式

### 测试与验证

已执行：

1. `go test ./handlers -run TestGetInventoryHandlerReturnsNamedPagedResponse`（在 `server` 目录执行）
2. `go test ./services -run TestRecordInboundMovingAverageUpdatesInventoryValue`（在 `server` 目录执行）
3. `pnpm exec eslint src/features/warehouse/inventory/contracts/inventory-api-dto.ts src/features/warehouse/inventory/data/schema.ts src/features/warehouse/inventory/adapters/inventory-api-adapter.ts src/features/warehouse/inventory/services/inventory-core-service.ts`
4. `pnpm exec tsc --noEmit`

结果：

1. Go handler 定向测试通过。
2. Go service 定向测试通过。
3. 定向 ESLint 通过。
4. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十四轮的最小实现闭环落地完成：`reserved` 已经不再依赖 `ShipmentRecord` 语义，而是有了独立 Reservation source of truth；库存查询链路可以后端权威输出 `onHand / reserved / availableQty`；前端也已经切换为只读消费这些字段，没有在客户端补任何公式。当前实现仍然是最小闭环——只触达库存查询聚合与消费契约，没有把整个 Reservation 生命周期接口一次性铺开。

## 2026-04-12 - audit/impl：第三十五轮版本兜底风险收口（Version Fallback Risk / Product Patch）

### 本轮目标

收口产品维护 PATCH 写路径中的版本静默降级：

1. 去掉 `version ?? 0`
2. 让编辑态 PATCH 缺失版本时直接失败
3. 复核相邻 adapter 是否需要最小同步修复

### 本轮实现

本轮修改文件：

1. `src/features/engineering/services/product-maintenance-service.ts`
2. `src/features/engineering/adapters/product-api-adapter.ts`

### 实现细节

1. **收口 PATCH 版本静默兜底**
   - `product-maintenance-service.ts`
   - 原先：
     - `metadata.version: product.version ?? 0`
   - 现在改为：
     - 优先取 `product.version ?? current.version`
     - 若版本仍缺失，直接抛出 `[CRITICAL]` 错误

2. **并发锁契约恢复为 fail loud**
   - 这意味着编辑态 PATCH 不再把缺失版本伪装成 `0`
   - Service 层会把缺失版本视为硬错误，而不是静默降级

3. **复核 adapter `_v` 默认值**
   - 当前 `_v: product.version ?? 1` 仍保留
   - 本轮未把它扩大整改为并发锁问题
   - 原因：当前 PATCH 并发锁路径由 `DeltaPayload.metadata.version` 独立承载，风险实锤点不在 `_v`

4. **顺手修平一个真实类型边界问题**
   - `toBulkSyncProductsApiDTO(...)` 的入参类型收口为 `SaveProductInput[]`
   - 与 `bulkSyncProducts(products: SaveProductInput[])` 的调用保持一致

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/engineering/services/product-maintenance-service.ts src/features/engineering/adapters/product-api-adapter.ts src/features/engineering/hooks/use-product-write-actions.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十五轮的真实风险按最小边界收口完成：产品维护 PATCH 写路径已经不再使用 `version ?? 0` 对缺失版本做静默降级，而是恢复为显式断言版本存在的 fail loud 语义。这样可以避免核心实体修改在并发锁环节被伪合法默认值侵蚀。与此同时，本轮没有把问题泛化成整个 engineering 模块 version 字段的全面重构，只顺手修平了与 bulk sync 相关的一个真实类型边界问题。

## 2026-04-12 - audit/impl：第三十七轮 DTO Integrity Gap 收口（StocktakeCoreService）

### 本轮目标

从第三十七轮候选链路中优先选择 `StocktakeCoreService`，为盘点任务/盘点项查询补 runtime schema 防线：

1. 为 `StocktakeTask` / `StocktakeItem` 建立 zod schema
2. 在 `StocktakeCoreService` 出口对 adapter 映射结果执行 parse
3. 保持改动限定在仓储盘点最小闭环内

### 本轮实现

本轮修改文件：

1. `src/features/warehouse/stocktake/data/schema.ts`
2. `src/features/warehouse/stocktake/services/stocktake-core-service.ts`

### 实现细节

1. **补充 Stocktake runtime schema**
   - 在 `stocktake/data/schema.ts` 中新增：
     - `stocktakeTaskSchema`
     - `stocktakeItemSchema`
     - `stocktakeTaskArraySchema`
     - `stocktakeItemArraySchema`
   - 同时让 `StocktakeTask` / `StocktakeItem` 类型从 schema 推导

2. **在 Service 出口执行 parse**
   - `StocktakeCoreService.getTasks()`
     - 现在对 `toStocktakeTaskContracts(...)` 结果执行 `stocktakeTaskArraySchema.parse(...)`
   - `StocktakeCoreService.getItems()`
     - 现在对 `toStocktakeItemContracts(...)` 结果执行 `stocktakeItemArraySchema.parse(...)`

3. **保持 adapter 只负责映射**
   - `stocktake-api-adapter.ts` 仍然保持 DTO -> contract 映射职责
   - runtime schema 防线明确收口在 service 出口

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/warehouse/stocktake/data/schema.ts src/features/warehouse/stocktake/services/stocktake-core-service.ts src/features/warehouse/stocktake/adapters/stocktake-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第三十七轮的最小闭环收口到 `StocktakeCoreService`：盘点任务与盘点项查询链路不再只是“ensureArrayResponse + adapter 纯映射”，而是在进入 UI 之前增加了明确的 zod runtime schema 防线。当前整改没有扩散到 `CustomerService` 或 `SupplierService`，保持了单链路、最小边界的实现策略。

## 2026-04-12 - plan/impl：第四十轮 SalesOrder 后端测试基线 `payment_method` 列漂移修复

### 本轮目标

修复 `SalesOrder` 后端测试基线中 `sales_orders` 手写建表 SQL 落后于当前业务模型的问题：

1. 补齐 payment 相关缺失列
2. 保持修复边界只落在测试基线
3. 通过定向 Go 测试验证

### 本轮实现

本轮修改文件：

1. `server/services/sales_order_flow_test.go`

### 实现细节

1. **补齐 sales_orders 测试表缺失列**
   - 在 `setupSalesOrderFlowTestDB(...)` 的 `CREATE TABLE sales_orders` 中新增：
     - `payment_method`
     - `payment_method_name`
     - `payment_term`
     - `payment_term_name`

2. **保持最小修复边界**
   - 本轮没有修改：
     - 生产 model
     - handler
     - service 业务逻辑
   - 只修正测试基线与当前业务字段集合的漂移

### 测试与验证

已执行：

1. `go test ./services -run SalesOrder`（在 `server` 目录执行）

结果：

1. 定向 Go 测试通过。

### 当前阶段结论

这一步把 `SalesOrder` 后端测试基线的 `payment_method` 列漂移按最小边界修复完成：根因是 `sales_order_flow_test.go` 里的手写建表 SQL 缺少 payment 相关列，而不是生产业务链路字段契约出错。当前整改仅补齐测试 schema，并通过定向 Go 测试验证通过。

## 2026-04-12 - plan/impl：第四十二轮架构收口第一阶段（Version Guard 单源）

### 本轮目标

先实现第四十二轮三项架构收口中的第一优先级：`Version Guard` 单源。

目标是：

1. 抽出公共 version 断言/helper
2. 让样板 PATCH / 关键写路径统一走 fail loud 模式
3. 先接入少量高风险样板链路，验证模式可行

### 本轮实现

本轮修改文件：

1. `src/lib/version-guard.ts`
2. `src/features/engineering/services/product-maintenance-service.ts`
3. `src/features/material-archive/services/material-maintenance-service.ts`
4. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`

### 实现细节

1. **新增公共 Version Guard helper**
   - `src/lib/version-guard.ts`
   - 新增：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

2. **产品维护链路接入 Version Guard**
   - `product-maintenance-service.ts`
   - `patchProduct(...)` 改为统一使用：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

3. **物料维护链路接入 Version Guard**
   - `material-maintenance-service.ts`
   - `patchMaterial(...)` 改为统一使用：
     - `assertRequiredVersion(...)`
     - `buildVersionedPatchMetadata(...)`

4. **库存调拨链路接入 Version Guard**
   - `inventory-transaction-service.ts`
   - `transferInventory(...)` 在发请求前先统一执行：
     - `assertRequiredVersion(...)`

### 当前边界

本轮只做了第一版样板接入，没有一次性改造全仓：

1. 没有同时扩到 `supplier / purchase / sales / warehouse-category`
2. 还没有进入第二优先级的 Runtime Contract 统一改造
3. 还没有进入第三优先级的 Go 测试 Schema helper 收口

### 测试与验证

已执行：

1. `pnpm exec eslint src/lib/version-guard.ts src/features/engineering/services/product-maintenance-service.ts src/features/material-archive/services/material-maintenance-service.ts src/features/warehouse/inventory/services/inventory-transaction-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第四十二轮的第一优先级“Version Guard 单源”落成了第一版可复用公共能力：核心写路径的 version 断言与 versioned patch metadata 不再完全散落在各模块内，而是开始收口到公共 helper。当前只在产品、物料、库存三条样板链路中验证模式，目的是先证明这套公共约束稳定可用，再决定是否继续向更多维护型 service 扩散。

## 2026-04-12 - plan/impl：第四十三轮 Service 出口 Runtime Contract 统一模式（Customer / Supplier 样板）

### 本轮目标

落地第四十三轮的首批样板链路，把 Service 出口 Runtime Contract 统一为：

1. adapter 只负责 DTO -> contract 映射
2. service 出口负责 `schema.parse(...)`
3. 先在 `CustomerService` 与 `SupplierService` 中验证模式

### 本轮实现

本轮修改文件：

1. `src/features/trading/data/schema.ts`
2. `src/features/trading/customer/services/customer-service.ts`
3. `src/features/trading/supplier/services/supplier-service.ts`

### 实现细节

1. **补充 Customer / Supplier runtime schema**
   - 在 `trading/data/schema.ts` 中新增：
     - `customerSchema`
     - `customerArraySchema`
     - `supplierSchema`
     - `supplierArraySchema`
   - 同时让 `Customer` / `Supplier` 类型从 schema 推导

2. **统一 CustomerService 出口 parse**
   - `getCustomers()` 改为对映射结果执行 `customerArraySchema.parse(...)`
   - `getCustomerList()` 改为对 `items` 执行 `customerArraySchema.parse(...)`
   - `executeCustomerTransaction()` / `createCustomer()` / `patchCustomer()` 改为对单条 contract 执行 `customerSchema.parse(...)`

3. **统一 SupplierService 出口 parse**
   - `getSuppliers()` 改为对映射结果执行 `supplierArraySchema.parse(...)`
   - `getSupplierList()` 改为对 `items` 执行 `supplierArraySchema.parse(...)`
   - `executeSupplierTransaction()` / `createSupplier()` / `patchSupplier()` 改为对单条 contract 执行 `supplierSchema.parse(...)`

4. **保持 adapter 纯映射职责不变**
   - `customer-api-adapter.ts`
   - `supplier-api-adapter.ts`
   - 本轮没有把 parse 塞回 adapter，继续保持 DTO -> contract 映射职责

### 测试与验证

已执行：

1. `pnpm exec eslint src/features/trading/data/schema.ts src/features/trading/customer/services/customer-service.ts src/features/trading/customer/adapters/customer-api-adapter.ts src/features/trading/supplier/services/supplier-service.ts src/features/trading/supplier/adapters/supplier-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把第四十三轮的统一模式在 `CustomerService` 与 `SupplierService` 两条样板链路中跑通：adapter 继续只负责映射，而 runtime schema 防线统一收口到 service 出口。这样既降低了 DTO Integrity 审计复杂度，也为后续把同类模式扩展到更多 trading / maintenance service 提供了明确模板。

## 2026-04-12 - plan/impl：第四十四轮 Go 测试 Schema 基线收口（trading helper 样板）

### 本轮目标

落地第四十四轮的第一批 Go 测试 Schema 基线收口：

1. 抽共享 trading test schema helper
2. 先接入少量样板测试文件
3. 验证能否减少重复手写 `CREATE TABLE` 与列漂移补丁

### 本轮实现

本轮修改文件：

1. `server/services/trading_test_schema_helper_test.go`
2. `server/services/sales_order_flow_test.go`
3. `server/services/purchase_transaction_service_test.go`

### 实现细节

1. **新增 trading test schema helper**
   - 新增 `applyTradingTestSchema(...)`
   - 当前支持按选项收口：
     - `sales_orders`
     - `sales_order_lines`
     - `purchase_orders`
     - `purchase_order_lines`
     - `audit_logs`

2. **接入 SalesOrder 样板测试**
   - `sales_order_flow_test.go` 不再手写 `sales_orders` / `sales_order_lines`
   - 改为复用 `applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includeSales: true})`

3. **接入 PurchaseTransaction 样板测试**
   - `purchase_transaction_service_test.go` 不再手写 `purchase_orders` / `purchase_order_lines` / `audit_logs`
   - 改为复用 `applyTradingTestSchema(t, testDB, tradingTestSchemaOptions{includePurchase: true, includeAuditLog: true})`

4. **在样板实施中反向补齐 helper 基线缺口**
   - 首次定向测试暴露出共享 helper 对真实模型覆盖不完整：
     - `purchase_orders` 缺少 `evidences`
     - `purchase_order_lines` 缺少 `returned_qty`
   - 随后已将这些列补入 helper
   - 同时在 `purchase_transaction_service_test.go` 的 seed 中显式写入 `Evidences: json.RawMessage("[]")`，避免 SQLite 默认值回读为 `string` 导致 `json.RawMessage` 扫描失败

### 测试与验证

已执行：

1. `go test ./services -run "SalesOrderFlow|PurchaseOrderTransaction|PurchaseOrderReceiptConfirmation"`

结果：

1. 定向 Go 测试通过。

### 当前阶段结论

这一步把第四十四轮的第一批收口模式跑通：交易测试中重复出现的 `sales_orders` / `purchase_orders` 相关建表 SQL 已经开始向共享 helper 收口，`sales_order_flow_test.go` 与 `purchase_transaction_service_test.go` 也已经完成样板接入。更重要的是，这次实施验证了共享 helper 的真正价值：一旦 helper 不完整，问题会集中暴露在一个地方，然后通过补齐公共基线即可同时避免后续更多测试继续复制错误 schema。

## 2026-04-12 - fix：engineering-db TypeScript 类型报错收口

### 本轮目标

修复 `engineering-db` 模块中一组已暴露的 TypeScript 报错，重点处理：

1. patch 场景错误从 `Input` 类型对象读取 `id`
2. service 返回对象与 schema 必填字段不匹配
3. dialog 直接修改 `useDeltaTracker(...).data` 导致不可变规则报错

### 本轮修改文件

1. `src/features/engineering-db/hooks/use-spoke-length-mgmt.ts`
2. `src/features/engineering-db/tabs/labeling-tab.tsx`
3. `src/features/engineering-db/services/hub-service.ts`
4. `src/features/engineering-db/services/nipple-service.ts`
5. `src/features/engineering-db/components/labeling-action-dialog.tsx`
6. `src/features/engineering-db/components/spoke-length-action-dialog.tsx`

### 实现细节

1. **修复 patch 场景的 `id` 来源**
   - `use-spoke-length-mgmt.ts` 与 `labeling-tab.tsx` 的保存参数新增 `recordId`
   - patch 时不再从 `SpokeLengthInput` / `LabelingDraftInput` 读取 `id`
   - 改为由编辑态组件从 `currentRow.id` 显式传入

2. **修复 service 返回映射与 schema 不一致**
   - `hub-service.ts` 与 `nipple-service.ts` 改为显式构造对象
   - `name` 统一按 `xxxData?.name ?? s.name`
   - 返回前通过 `hubSchema.safeParse(...)` / `nippleSchema.safeParse(...)` 做收口

3. **修复 dialog 对 `useDeltaTracker` 代理对象的直接写入**
   - `labeling-action-dialog.tsx`
   - `spoke-length-action-dialog.tsx`
   - 对齐仓内已有 `hub-action-dialog.tsx` / `nipple-action-dialog.tsx` 模式
   - 新增 `setFormData` / `updateField`
   - 不再直接写 `formData.xxx = ...`

4. **收口局部类型噪音**
   - `hub-service.ts` / `nipple-service.ts` 的 `delta` 参数改为 `Record<string, unknown>`
   - 去除本轮涉及文件中的 `console.error` 与部分 `any`
   - `use-spoke-length-mgmt.ts` 的失败提示改为直接中文文本，避免当前 i18n key 类型约束继续阻塞编译

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步把 `engineering-db` 当前最明显的类型断裂点收口到了两条主线：

1. patch 调用与 `Input` / 实体态边界重新对齐
2. dialog 表单更新方式与仓内现有 `useDeltaTracker` 样板对齐

这样既解决了截图中的 `id` / `name` 报错，也避免继续在 `engineering-db` 里保留“有的 dialog 直接改代理对象、有的 dialog 走 setFormData”的分裂写法。

## 2026-04-12 - fix：basic-settings 单点 TypeScript 编译阻塞

### 本轮目标

修复 `basic-settings` 中在完整 TypeScript 编译时新暴露出的单点阻塞：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. 未使用的 `AppearanceMapping` 类型导入

### 本轮实现

1. 删除 `linear-barcode-mgmt.tsx` 中未使用的 `AppearanceMapping` 类型导入
2. 保留 `AppearanceActionDialog` 导入不变
3. 不改动任何条码业务逻辑

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这次 follow-up 属于典型的“修掉上一批错误后露出的下一个编译断点”。当前已经按最小边界清除 `linear-barcode-mgmt.tsx` 的未使用类型导入，并确认完整 TypeScript 编译重新通过。
