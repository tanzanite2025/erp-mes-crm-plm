### 1. plan：engineering-db TypeScript 类型报错修复

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前 `engineering-db` 模块出现多处 TypeScript 类型报错，报错主要集中在：

1. 编辑态表单 / hook 把 `Input` 类型当成已存在实体使用
2. service 返回对象与 runtime schema 的必填字段不一致
3. tab 层 patch 调用继续依赖“输入态对象自带 `id`”的旧假设

从截图可见，当前至少已暴露：

1. `use-spoke-length-mgmt.ts` 访问 `formData.id`
2. `hub-service.ts` 返回结果不满足 `hubSchema`
3. `nipple-service.ts` 返回结果不满足 `nippleSchema`
4. `labeling-tab.tsx` 在 patch 场景中访问输入态对象上的 `id`

#### 1.2 当前排查结论

##### 1.2.1 输入态与实体态混用

当前部分代码把 `*Input` 类型既当“新建表单输入”使用，又当“编辑现有记录”使用。这会导致：

1. `Input` 类型本身未定义 `id`
2. patch 场景却直接读取 `formData.id`
3. TypeScript 在严格模式下正确报错

这类问题当前已经在：

1. `src/features/engineering-db/hooks/use-spoke-length-mgmt.ts`
2. `src/features/engineering-db/tabs/labeling-tab.tsx`

被实锤。

##### 1.2.2 service 返回映射未显式满足 schema

`hubService.getHubs()` 与 `nippleService.getNipples()` 当前把 `engineeringSpecService.getSpecs(...)` 的返回结果直接展开到对象上，再拼接 `id` / `version` / `createdAt`。但现有返回类型没有向 TypeScript 明确保证 `name` 一定存在，因此：

1. `hubSchema` 要求 `name: string`
2. `nippleSchema` 要求 `name: string`
3. service 返回值被推断为缺少必填 `name` 的对象数组
4. 最终与 `Promise<Hub[]>` / `Promise<Nipple[]>` 冲突

#### 1.3 推荐修复策略

本轮建议做最小、直接、可验证的修复：

##### 1.3.1 修复编辑态 patch 参数来源

原则：

1. patch 场景优先从当前记录 `currentRow` / 已持久化对象读取 `id`
2. 不再从 `*Input` 类型对象读取 `id`
3. 如确有需要，显式定义“编辑表单态”类型，而不是污染 `Input`

##### 1.3.2 修复 service 出口对象构造

原则：

1. `hubService` / `nippleService` 返回值必须显式构造 `name`
2. 返回对象结构应直接对齐 `hubSchema` / `nippleSchema`
3. 过滤逻辑保留，但不能依赖模糊推断来满足 `Promise<Hub[]>` / `Promise<Nipple[]>`

#### 1.4 涉及文件

预计涉及：

1. `src/features/engineering-db/hooks/use-spoke-length-mgmt.ts`
2. `src/features/engineering-db/tabs/labeling-tab.tsx`
3. `src/features/engineering-db/services/hub-service.ts`
4. `src/features/engineering-db/services/nipple-service.ts`

如在实施中发现相同模式的极少量同类文件，可做同模式最小补齐，但不扩成全面重构。

#### 1.5 非目标边界

本轮不做：

1. 不重构整个 `engineering-db` 数据建模体系
2. 不顺带统一所有 `Input` / `Entity` 类型命名
3. 不对无关模块进行大面积 schema 调整

#### 1.6 验证方式

建议执行：

1. 定向 TypeScript 校验，至少覆盖截图中的报错文件
2. 如项目已有统一校验命令，则在影响可控时执行一次 `tsc --noEmit`

#### 1.7 当前阶段结论

当前可以先按“修输入态 / 实体态边界 + 修 service 返回映射”这两条主线做最小收口。这样既能直接解决截图中的 `id` / `name` 报错，也不会把这次修复扩成对整个 `engineering-db` 的大规模重构。

### 1. audit：第十五轮审计修复（工龄权威下沉 + PII 脱敏权限裁决 + 语言契约收口）

日期：2026-04-12  
状态：待批准

### 1. plan：第四十四轮 Go 测试 Schema 基线收口

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第四十四轮承接第四十二轮架构收口的第三优先级：Go 测试 Schema 基线收口。

当前后端 Go 测试存在大量手写 `CREATE TABLE` SQL，已经出现：

1. 同一批表在多个测试 setup 中重复定义
2. 字段新增后某个测试文件漏改
3. schema 漂移靠逐点补丁修复

#### 1.2 当前排查结论

当前已经确认高频重复、且最容易漂移的表组主要包括：

1. `sales_orders` / `sales_order_lines`
2. `purchase_orders` / `purchase_order_lines`
3. `inventory` / `inbound_records` / `shipment_records`
4. `audit_logs`

这些表组当前散落在多个测试 setup 中，例如：

1. `server/services/inventory_command_service_test.go`
2. `server/handlers/inventory_command_handlers_test.go`
3. `server/services/sales_order_flow_test.go`
4. `server/services/purchase_transaction_service_test.go`

并且已经发生过真实漂移：

1. `sales_order_flow_test.go` 曾缺少 `payment_method` / `payment_method_name` / `payment_term` / `payment_term_name`
2. 这说明“复制一份 SQL 再改一点”的模式会持续制造补丁成本

#### 1.3 推荐首批收口范围

##### 1.3.1 首批 helper 边界

本轮建议先聚焦 trading 相关测试表，抽最小共享 helper：

1. `sales_orders`
2. `sales_order_lines`
3. `purchase_orders`
4. `purchase_order_lines`
5. `audit_logs`

原因：

1. 这批表已经在多个 test setup 中重复出现
2. 刚发生过真实列漂移
3. 更适合作为第一批 schema baseline helper 样板

##### 1.3.2 暂不纳入首批

本轮暂不一次性收口：

1. `inventory` / `shipment_records` / `inbound_records`
2. `workflow_*` 表
3. `mrp_requirements_test.go` 的专用简化表

这些可以在 trading helper 跑通后再考虑第二批。

#### 1.4 推荐实施顺序

本轮建议：

1. 新增共享 trading test schema helper / builder
2. 先让 1-2 个测试文件接入该 helper 作为样板
3. 通过定向 Go 测试验证 helper 可用后，再决定是否继续扩散

#### 1.5 第一轮样板建议

本轮建议优先接入：

1. `server/services/sales_order_flow_test.go`
2. `server/services/purchase_transaction_service_test.go`

原因：

1. 边界清晰
2. 交易表组集中
3. 更容易验证 helper 对 `sales_orders` / `purchase_orders` 的覆盖能力

#### 1.6 第一轮实施边界

本轮建议：

1. 先收 trading test schema helper
2. 只接入少量样板测试文件
3. 验证 helper 稳定后再扩到 inventory / workflow 测试

本轮不做：

1. 不一次性重写所有 Go 测试 setup
2. 不急于统一所有领域的测试 schema
3. 不把 AutoMigrate 与手写 SQL 改造同时推进

#### 1.7 当前阶段结论

第四十四轮当前已经明确：Go 测试 Schema 基线收口应先从 trading 相关的高频重复表组入手，抽共享 test schema helper，并只让少量样板测试文件先接入。当前最值得作为第一批样板的，是 `sales_order_flow_test.go` 与 `purchase_transaction_service_test.go`；等 trading helper 跑通后，再考虑是否把 inventory / workflow 的测试基线继续纳入第二批收口。

### 1. plan：第四十三轮 Service 出口 Runtime Contract 统一模式

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第四十三轮承接第四十二轮架构收口的第二优先级：Service 出口 Runtime Contract 统一模式。

当前已经出现三种并存模式：

1. adapter 内部直接 parse
2. service 出口 parse
3. 只有 adapter 映射，没有 runtime schema 防线

这会导致：

1. DTO Integrity 审计成本持续升高
2. service / adapter 责任边界不清
3. 同一类问题难以形成统一 code review 规则

#### 1.2 本轮目标

本轮目标是把“新收口链路”的模式统一为：

1. adapter 负责 DTO -> contract 映射
2. service 出口负责 `schema.parse(...)`
3. 对既有稳定链路不做一刀切全面迁移

#### 1.3 推荐实施对象

##### 1.3.1 首批样板链路

本轮建议优先从以下链路中选择 1-2 条样板实施：

1. `src/features/trading/customer/services/customer-service.ts`
2. `src/features/trading/supplier/services/supplier-service.ts`

说明：

1. 这两条链路当前更接近“ensureResponse + adapter 纯映射”模式
2. 风险清晰，边界相对集中
3. 已完成的 `StocktakeCoreService` 可作为 service 出口 parse 样板参考

##### 1.3.2 已有样板参考

当前可复用参考链路：

1. `StocktakeCoreService`
   - 已采用 service 出口 parse
2. 这可以作为新模式的实施模板，而不是再回到 adapter 内补 parse

#### 1.4 推荐实施顺序

本轮建议：

1. 先为选中的领域补 `data/schema.ts` 中缺失的 runtime schema
2. 再在 service 出口统一执行 `schema.parse(...)`
3. adapter 保持纯映射职责不变

#### 1.5 职责边界

本轮建议明确：

1. **adapter**：
   - 只负责 DTO -> contract 映射
   - 不再新增 parse 职责

2. **service**：
   - 负责 `ensureObjectResponse / ensureArrayResponse`
   - 负责 `schema.parse(...)`
   - 作为进入 UI 前的最终 runtime contract 防线

#### 1.6 第一轮实施边界

本轮建议：

1. 只选择 1-2 条样板链路
2. 样板优先选择 Customer / Supplier 中边界更小的链路
3. 验证模式可用后再逐步扩散

本轮不做：

1. 不一次性改全仓所有 service
2. 不回头全面重写已稳定运行的 parse 链路
3. 不把 Runtime Contract 改造与 Version Guard / Go 测试基线 helper 同轮并行铺开

#### 1.7 当前阶段结论

第四十三轮当前已经明确：Service 出口 Runtime Contract 的统一模式应该以“adapter 只映射、service 出口 parse”为目标边界推进，并通过少量样板链路先跑通模式，而不是一次性全仓重构。当前最适合进入第一轮样板化实施的链路是 `CustomerService` 与 `SupplierService`，而 `StocktakeCoreService` 已经可以作为统一模式的参考样板。

### 1. plan：第四十二轮架构收口规划（Version Guard / Runtime Contract / Test Schema Baseline）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

经过前四十轮审计与实施，问题已经不再主要是单点 bug，而是多处重复暴露同一类架构缺口：

1. `version` 锁字段在多个模块反复出现静默兜底或断言不一致
2. Service 出口的 runtime schema 防线在不同模块模式分裂
3. Go 后端测试大量手写建表 SQL，持续出现测试 schema 漂移

因此当前阶段应从“继续补丁”切换为“收口公共能力”。

#### 1.2 本轮最高优先级目标

本轮聚焦三项最高优先级架构能力：

1. **Version Guard 单源**
2. **Service 出口 Runtime Contract 统一模式**
3. **Go 测试 Schema 基线收口**

#### 1.3 目标一：Version Guard 单源

##### 1.3.1 目标

把核心实体 PATCH / 保存链路里的 `version` 校验从“各模块各自处理”收口为公共约束：

1. 核心写操作必须显式要求 `version`
2. 缺失版本必须 fail loud
3. 禁止 `?? 0` / `|| 0` 静默兜底

##### 1.3.2 推荐实现方向

本轮建议：

1. 抽公共 helper / invariant：
   - 例如统一的 `assertVersionForPatch(...)` / `buildVersionedPatchMetadata(...)` 这类能力
2. 让维护型 service 与事务型 service 统一走一套写前断言模式
3. 后续 code review 只接受 fail loud，不接受默认值降级

##### 1.3.3 预期收益

1. 降低 version 漏传/兜底重复发生概率
2. 降低 patch/save 链路风格分裂
3. 为后续模块提供可复用写操作模板

#### 1.4 目标二：Service 出口 Runtime Contract 统一模式

##### 1.4.1 目标

把 frontend service 出口的数据契约收口为统一模式，避免：

1. 有些链路在 adapter 内 parse
2. 有些链路在 service 出口 parse
3. 有些链路完全没有 parse

##### 1.4.2 推荐实现方向

本轮建议：

1. 优先统一为：
   - adapter 负责 DTO -> contract 映射
   - service 出口负责 `schema.parse(...)`
2. 对已存在 parse 的链路不立即全面改造，但新收口链路遵循统一模式
3. 对高风险 service 出口逐步补齐 schema 与 parse

##### 1.4.3 预期收益

1. 降低 DTO Integrity 审计成本
2. 让 service 责任边界更清晰
3. 避免 runtime schema 防线分布混乱

#### 1.5 目标三：Go 测试 Schema 基线收口

##### 1.5.1 目标

降低 Go 测试中手写 `CREATE TABLE` 的重复与漂移：

1. 避免每个测试文件各维护一套 `sales_orders` / `inventory` / `purchase_orders` SQL
2. 降低模型字段新增后测试基线漏改的概率

##### 1.5.2 推荐实现方向

本轮建议：

1. 优先抽共享 test schema helper / builder
2. 先从重复频次最高、漂移最频繁的表开始收口
3. 不急于一次性全切 AutoMigrate，优先降低重复 SQL 维护成本

##### 1.5.3 预期收益

1. 减少测试基线列漂移补丁
2. 降低后端测试维护成本
3. 提高测试 schema 与真实模型的一致性

#### 1.6 推荐实施顺序

本轮建议按以下顺序推进：

1. **先做 Version Guard 单源**
2. **再做 Service 出口 Runtime Contract 统一模式**
3. **最后做 Go 测试 Schema 基线 helper**

原因：

1. Version Guard 直接影响数据正确性与并发安全
2. Runtime Contract 直接影响前端稳定性与坏 DTO 穿透风险
3. Test Schema 收口更偏中期维护成本优化

#### 1.7 第一轮实施边界

本轮建议：

1. 先做最小可落地公共 helper / 约束
2. 选择少量已知问题链路作为接入样板
3. 验证 helper/模式本身是否稳定，再逐步扩散

本轮不做：

1. 不一次性重构所有维护型 service
2. 不一次性补全全仓所有 service parse
3. 不一次性改造所有 Go 测试 schema

#### 1.8 当前阶段结论

第四十二轮当前已经明确：系统已进入应优先收口公共架构能力，而不是继续主要依赖补丁推进的阶段。本轮最高优先级应落在三项能力上：Version Guard 单源、Service 出口 Runtime Contract 统一模式、Go 测试 Schema 基线收口。其中最先应实施的是 Version Guard 公共约束，再以少量链路样板推动 Runtime Contract 和测试基线的后续收口。

### 1. plan：第四十轮 SalesOrder 后端测试基线 `payment_method` 列漂移修复

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第四十轮关注的是 `SalesOrder` 后端测试基线中的 `payment_method` 列漂移，而不是生产业务字段新增：

1. 当前业务代码已经在使用 `payment_method` / `payment_method_name`
2. 需要确认问题是否只发生在测试建表基线
3. 若是测试基线缺列，应按最小边界补齐测试 schema

#### 1.2 当前排查结论

当前已经确认：

1. `server/services/sales_order_flow_test.go`
   - `setupSalesOrderFlowTestDB(...)` 里手写的 `sales_orders` 测试表当前缺少：
     - `payment_method`
     - `payment_method_name`
     - `payment_term`
     - `payment_term_name`

2. 生产写链路当前已经稳定依赖这些列：
   - `server/services/order_master_service.go`
   - `SaveSalesOrderForBulkSync(...)` 的 `updates` 明确包含：
     - `payment_method`
     - `payment_method_name`
     - `payment_term`
     - `payment_term_name`

3. DTO / mapper 也已同步这些字段：
   - `server/services/sales_order_dto.go`
   - `server/services/sales_order_mapper.go`

4. 其它测试基线已能证明这不是生产字段漂移，而是单个测试建表落后：
   - `server/services/inventory_command_service_test.go` 中的 `sales_orders` 建表已经包含 payment 相关列

#### 1.3 问题本质

这轮真实问题分为两类：

1. **Test schema drift**：测试文件里的手写建表 SQL 落后于当前业务模型
2. **Not a production contract bug**：这不是生产 handler/service 的字段契约错误，而是测试基线缺列

#### 1.4 推荐方案

##### 1.4.1 sales_order_flow_test.go

本轮建议必做：

1. 在 `sales_orders` 测试建表中补齐：
   - `payment_method`
   - `payment_method_name`
   - `payment_term`
   - `payment_term_name`

##### 1.4.2 修复边界

本轮建议：

1. 只修测试基线 SQL
2. 不改生产模型
3. 不改 handler / service 业务逻辑

#### 1.5 第一轮实施边界

本轮建议：

1. **最小修复**：只补 `sales_order_flow_test.go` 缺失列
2. **验证**：执行定向 Go 测试

本轮不做：

1. 不对 `SalesOrder` 整条生产链路做重构
2. 不在无证据前修改 DTO / mapper / model
3. 不把测试基线问题误判成线上业务契约问题

#### 1.6 当前阶段结论

第四十轮当前已经明确：`SalesOrder` 后端测试基线里的 `payment_method` 列漂移根因是 `server/services/sales_order_flow_test.go` 中手写 `sales_orders` 测试表缺少 payment 相关列，而业务代码本身早已稳定读写这些字段。正确修复方向应是最小化补齐测试建表 SQL，并通过定向 Go 测试验证，而不是去改生产模型或业务服务。

### 1. audit：第三十九轮物料维护版本锁审计（Material Maintenance Audit）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十九轮关注 `material-maintenance-service.ts` 的版本锁完整性：

1. PATCH 写路径是否强制要求 `version`
2. 是否存在 `?? 0 / || 0` 等静默兜底
3. 上游调用链是否其实已经掌握基线版本

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/material-archive/services/material-maintenance-service.ts`
   - `patchMaterial(id, delta, version)` 当前直接构造：
     - `metadata: { id, version }`
   - 当前未发现 `version ?? 0`、`version || 0` 或其它静默降级

2. 上游调用链已经有显式版本断言：
   - `src/features/material-archive/hooks/use-material-mgmt-data.ts`
   - 在 PATCH 前会检查：
     - `typeof data.version !== 'number'`
     - `Number.isNaN(data.version)`
   - 一旦缺失会：
     - `failLoudly(...)`
     - `throw error`

3. 当前物料维护返回链路也已具备 runtime schema 防线：
   - `material-maintenance-service.ts` 中的 `parseMaterial(...)`
   - 内部执行：
     - `materialApiDTOSchema.parse(...)`
   - `saveMaterial(...)` 与 `patchMaterial(...)` 都复用该 parse

4. 相邻 adapter 当前也未见会侵蚀 PATCH 版本锁的实锤默认值：
   - `toSaveMaterialApiDTO(...)` 只是透传：
     - `version: material.version`
   - 当前未见类似 `version ?? 0`

#### 1.3 问题本质

这轮真实情况分为两类：

1. **Version guard already exists**：PATCH 写路径当前已有显式版本强制校验
2. **Reported risk does not apply here**：你描述的版本锁削弱模式不适用于当前物料维护链路

#### 1.4 推荐方案

##### 1.4.1 material-maintenance-service.ts

本轮建议：

1. 保持当前 PATCH 版本传递逻辑
2. 不为不存在的问题追加无意义整改

##### 1.4.2 后续审计方向

本轮建议：

1. 如需继续推进，应转查那些仍存在 `version` 默认值或未做前置断言的维护 service
2. 不把已具备 fail loud 的链路误判成锁失效风险

#### 1.5 第一轮实施边界

本轮建议：

1. **非实锤项不动**：当前不修改 `material-maintenance-service.ts`
2. **可选后续**：如要继续，可转查其它维护 service 的版本锁边界

本轮不做：

1. 不在当前已具备版本断言的链路上重复加防线
2. 不把 false alarm 扩写成代码整改任务
3. 不在没有证据前泛化为整个物料模块并发锁体系问题

#### 1.6 当前阶段结论

第三十九轮当前已经明确：`material-maintenance-service.ts` 的 PATCH 写路径已经具备 version 强制校验，不存在你描述的 `?? 0 / || 0` 型静默降级问题。上游 `use-material-mgmt-data.ts` 也已经在发 PATCH 前做了 fail loud 断言，同时返回链路还复用了 `materialApiDTOSchema.parse(...)`。因此这轮在当前物料维护链路上的准确结论应是 false alarm；若后续继续推进，应把注意力转向其它真正削弱了 version 契约的维护 service。

### 1. audit：第三十八轮运行时未定义错误审计（Critical Reference Error / use-product-form-derive）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十八轮关注 `use-product-form-derive.ts` 是否存在运行时引用错误：

1. 是否直接调用了 `React.useState`
2. 但文件头部没有导入 `React`
3. 从而导致 hook 一挂载就白屏

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-product-form-derive.ts`
   - 文件顶部当前是：
     - `import { useEffect, useMemo, useState } from 'react'`
   - 因而 `useState` 已经被显式导入

2. 文件内部当前调用也不是 `React.useState(...)`
   - 实际使用的是：
     - `const [nextCodeDeriveError, setNextCodeDeriveError] = useState<string | null>(null)`

3. 同文件当前也没有其它 `React.` 命名空间调用

4. 因此这轮的真实结论是：
   - 当前代码与风险描述并不一致
   - 在 `use-product-form-derive.ts` 上未发现会导致 `React is not defined` 的现存实锤问题

#### 1.3 问题本质

这轮真实情况分为两类：

1. **Import is already correct**：`useState` 已被正确导入
2. **Reported scenario does not match current file**：所描述的 `React.useState` 未导入问题不适用于当前工作区版本

#### 1.4 推荐方案

##### 1.4.1 use-product-form-derive.ts

本轮建议：

1. 保持当前实现
2. 不为不存在的问题追加无意义修复

##### 1.4.2 若后续仍有白屏

本轮建议：

1. 优先核对浏览器/控制台报错堆栈
2. 对照当前工作区文件内容确认是否为旧代码、未保存缓存或其它 hook 引用错误

#### 1.5 第一轮实施边界

本轮建议：

1. **非实锤项不动**：当前不修改 `use-product-form-derive.ts`
2. **可选后续**：如要继续，可转查其它真实 runtime reference error 链路

本轮不做：

1. 不在已正确导入 `useState` 的文件上做无效修复
2. 不把 false alarm 扩写成代码整改任务
3. 不在没有堆栈证据前泛化为整个工程 hook 体系问题

#### 1.6 当前阶段结论

第三十八轮当前已经明确：`use-product-form-derive.ts` 并不存在“调用 `React.useState` 但未导入 `React`”的现存问题。当前文件已经正确从 `react` 导入 `useState`，且内部也并未使用 `React.useState` 命名空间调用。因此这轮在当前工作区代码上应判定为 false alarm；若后续仍观测到白屏，应优先依据真实堆栈继续定位其它运行时引用错误。

### 1. audit：第三十七轮 DTO Integrity Gap 扩展审计（Candidate Service Exits）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十七轮是在第三十六轮 false alarm 基础上继续往外扩展：

1. 跳过已确认有 `schema.parse(...)` 的产品维护链路
2. 转审其它真正可能缺少 runtime schema 防线的 service 出口
3. 优先找最小闭环的实锤候选，而不是一次性扩成全仓排查

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/warehouse/stocktake/services/stocktake-core-service.ts`
   - `getTasks()` / `getItems()` 当前是：
     - `ensureArrayResponse(...)`
     - `toStocktakeTaskContracts(...) / toStocktakeItemContracts(...)`
   - 当前未见 service 出口 parse

2. `src/features/trading/customer/services/customer-service.ts`
   - `getCustomers()` 当前是：
     - `ensureArrayResponse(...)`
     - `toCustomerContracts(...)`
   - 当前未见 runtime schema.parse

3. `src/features/trading/supplier/services/supplier-service.ts`
   - `getSuppliers()` / `executeSupplierTransaction(...)` 当前都依赖 adapter 转换
   - 当前未见 runtime schema.parse

4. 这些候选链路对应的 adapter 当前更接近纯映射：
   - `customer-api-adapter.ts`
   - `supplier-api-adapter.ts`
   - `stocktake-api-adapter.ts`
   - 当前主要是字段映射与默认值，不像 `toProductContract(...)` 那样内置 schema.parse

#### 1.3 问题本质

这轮真实情况分为两类：

1. **Real candidate exits found**：已经找到数条更符合“adapter-only mapping”模式的 service 出口
2. **Need a smallest-closure choice**：下一阶段不应同时改多个领域，而应先选一条最小闭环链路落地

#### 1.4 推荐方案

##### 1.4.1 候选优先级

本轮建议：

1. 优先审 `StocktakeCoreService`
2. 其次是 `CustomerService`
3. 再其次是 `SupplierService`

原因：

1. 仓储模块近期已在连续做 runtime contract 收口
2. 更适合沿用已有库存/盘点审计上下文继续最小补强

##### 1.4.2 实施边界

本轮建议：

1. 只从一条链路挑选最小闭环实锤项
2. 为对应 contract 建 schema 或复用现有 schema
3. 在 service 出口或 adapter 内建立明确 parse 防线

#### 1.5 第一轮实施边界

本轮建议：

1. **优先单点突破**：先选一条 service 出口实施
2. **不多域同时开工**：避免 Customer / Supplier / Stocktake 一次性混改

本轮不做：

1. 不把所有候选链路同时补 parse
2. 不在没有 schema 设计前直接批量塞 `parse(...)`
3. 不把扩展审计误推进成全局 DTO Integrity 重构

#### 1.6 当前阶段结论

第三十七轮当前已经明确：真正更像 DTO Integrity Gap 的链路不在产品维护，而在一些仍然采用“ensureResponse + adapter 纯映射”模式的 service 出口上。当前最值得优先推进的候选是 `StocktakeCoreService`，其次是 `CustomerService` 与 `SupplierService`。下一阶段应从其中选择一条最小闭环链路落地 runtime schema 防线，而不是一次性把多个领域全部展开。

### 1. audit：第三十六轮 DTO Integrity Gap 审计（Product Maintenance Service）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十六轮关注产品维护 Service 的 DTO 完整性风险：

1. `product-maintenance-service.ts` 是否仅依赖 adapter 映射
2. create / patch / save 返回链路是否缺少 runtime parse
3. `Product` 当前是否已经具备可复用的 schema 防线

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/services/product-maintenance-service.ts`
   - `createProduct(...)` 返回前会调用 `toProductContract(...)`
   - `patchProduct(...)` 返回前会调用 `toProductContract(...)`
   - `saveProduct(...)` 只是复用这两条链路

2. `src/features/engineering/adapters/product-api-adapter.ts`
   - `toProductContract(...)` 并不是纯字段映射
   - 其内部直接执行了 `productSchema.parse(...)`

3. `src/features/engineering/data/schema.ts`
   - 当前已经定义 `productSchema`
   - 因而产品维护返回值实际上已经过 runtime schema 校验

4. 因此这轮在产品维护链路上的真实结论是：
   - 当前未发现“Service 只依赖 adapter 转换、没有 runtime parse”这一实锤问题
   - 更准确地说，这是一次 false alarm

#### 1.3 问题本质

这轮真实情况分为两类：

1. **Runtime validation already exists**：`toProductContract(...)` 内部已执行 `productSchema.parse(...)`
2. **Risk description does not apply here**：你描述的 DTO 穿透风险成立于“adapter 只映射、不 parse”的链路，但产品维护链路并不符合这一前提

#### 1.4 推荐方案

##### 1.4.1 ProductMaintenanceService

本轮建议：

1. 保持当前返回链路
2. 不为不存在的问题追加一层重复 parse

##### 1.4.2 后续 DTO Integrity 审计方向

本轮建议：

1. 继续优先排查那些 adapter 内部**没有** schema.parse 的 service 出口
2. 不把已有 parse 的链路误判成 integrity gap

#### 1.5 第一轮实施边界

本轮建议：

1. **非实锤项不动**：本轮不修改 `ProductMaintenanceService`
2. **可选后续**：如要继续推进，可转审其它真正缺失 runtime schema 的 service

本轮不做：

1. 不在已有 `productSchema.parse(...)` 的链路上重复加 parse
2. 不把 false alarm 扩写成代码整改任务
3. 不在没有证据前泛化为整个 engineering 模块 DTO Integrity 全面重构

#### 1.6 当前阶段结论

第三十六轮当前已经明确：`ProductMaintenanceService` 并不存在“由于只依赖 adapter 而导致 DTO 穿透”的实锤缺口，因为它的返回链路最终会进入 `toProductContract(...)`，而该函数内部已经执行 `productSchema.parse(...)`。因此这轮在产品维护链路上的准确结论应是 false alarm；如果后续继续推进 DTO Integrity 审计，应把注意力转向那些 adapter 确实只做映射、没有 runtime schema 防线的 service 出口。

### 1. audit：第三十五轮版本兜底风险审计（Version Fallback Risk / Product Patch）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十五轮关注产品维护 PATCH 写路径中的版本锁完整性：

1. `product-maintenance-service.ts` 是否对 `version` 做了静默兜底
2. 编辑态写链路是否本来已持有基线版本却没有强制使用
3. 相邻 adapter 是否也存在类似默认值语义

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/services/product-maintenance-service.ts`
   - `patchProduct(current, product)` 当前构造 PATCH metadata 时写的是：
     - `version: product.version ?? 0`
   - 这属于对版本号的静默降级

2. 该问题对并发锁是高风险的：
   - `version` 是 PATCH 并发冲突判定的核心契约
   - 把缺失版本降级成 `0` 可能让后端收到伪合法版本值
   - 具体后果取决于后端实现，但风险包括：
     - 误判为合法写入
     - 跳过校验
     - 写覆盖

3. 当前真实问题并不是前端拿不到版本：
   - `saveProduct(product, current?)` 的编辑态已经要求 `current`
   - `patchProduct(current, product)` 也已经拿到了 `current: Product`
   - 因而 service 层至少掌握一个可信版本来源，不应继续 `?? 0`

4. 相邻代码还存在一个需要后续复核的版本默认值点：
   - `src/features/engineering/adapters/product-api-adapter.ts`
   - `toProductApiDTO(...)._v = product.version ?? 1`
   - 但当前最明确、最危险的实锤仍然是 PATCH metadata 的 `version ?? 0`

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Silent version downgrade**：PATCH metadata 把缺失版本降级为 `0`
2. **Lock contract erosion**：并发锁所需版本契约被 service 层悄悄削弱
3. **Version source already exists**：编辑态实际上已有 `current.version` 可用，不该再兜底

#### 1.4 推荐方案

##### 1.4.1 product-maintenance-service.ts

本轮建议必做：

1. 去掉 `version ?? 0`
2. 对 PATCH 写路径强制断言版本必须存在
3. 缺失版本时直接 fail loud

##### 1.4.2 version 来源

本轮建议：

1. 优先使用 `current.version` 作为 PATCH 基线版本
2. 或者在调用边界明确要求 `product.version` 必填
3. 但不能再用静默默认值代替

##### 1.4.3 product-api-adapter.ts

本轮建议：

1. 复核 `_v = product.version ?? 1` 是否只用于 create / bulk sync
2. 若该默认值会进入核心 PATCH/并发锁路径，也应同步收口

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口 `product-maintenance-service.ts` 的 PATCH 版本兜底
2. **必做**：让缺失版本直接失败，而不是降级
3. **复核项**：检查 adapter `_v` 默认值是否也需同步治理

本轮不做：

1. 不对整个 engineering 模块所有 version 字段一次性大重构
2. 不在没有证据前批量修改所有 `?? 0 / ?? 1`
3. 不引入新的前端推测版本逻辑

#### 1.6 当前阶段结论

第三十五轮当前已经明确：`product-maintenance-service.ts` 中 `version: product.version ?? 0` 是一个实锤的并发锁降级点。它的问题不在于“有没有版本”，而在于 service 层明明位于编辑态写链路、也已经拿到了 `current` 基线，却仍然选择用 `0` 对缺失版本做静默兜底。下一阶段应优先把这条 PATCH 写路径改成强制断言版本存在，并在必要时继续复核相邻 adapter 的 `_v` 默认值是否也会侵蚀并发锁契约。

### 1. plan：第三十四轮 Reservation 模型实现规划（Reservation Model Implementation）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十四轮开始把第三十三轮已经确认的 Reservation source of truth 落成可执行实现规划：

1. 建 Reservation 模型 / 表结构
2. 建 Reservation 生命周期
3. 将 Reservation 聚合接入 Inventory query
4. 让前端只读消费 `reserved` 与 `availableQty`

#### 1.2 当前规划结论

当前已经确认：

1. Reservation 模型最小字段面应至少包含：
   - `materialId`
   - `categoryCode`
   - `batchNo`
   - `quantity`
   - `status`
   - `sourceType`
   - `sourceId`
   - 生命周期时间戳（如创建、释放、核销、失效）

2. Reservation 生命周期必须作为独立状态机处理：
   - reserve
   - release
   - consume
   - expire / cancel

3. Inventory 查询侧的目标输出已明确：
   - `onHand`
   - `reserved`
   - `availableQty = onHand - reserved`

4. 前端仅承担消费接入：
   - Inventory DTO 扩展字段
   - adapter / schema 接入
   - 不新增任何公式计算

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Need a new source-of-truth model**：必须新增 Reservation 模型，而不是继续借用 shipment
2. **Need an explicit lifecycle**：预留不是静态数字，必须有状态迁移
3. **Need aggregate integration**：最终要把 Reservation 聚合接到 Inventory query 上

#### 1.4 推荐方案

##### 1.4.1 Reservation 模型

本轮建议必做：

1. 设计 Reservation 后端 model 与表结构
2. 明确索引维度（物料、仓类、批次、状态、来源单据）

##### 1.4.2 Reservation 生命周期

本轮建议必做：

1. 明确何时创建 reservation
2. 明确何时释放 / 核销 / 失效
3. 明确每种状态是否计入 `reserved`

##### 1.4.3 Inventory 聚合接入

本轮建议必做：

1. `onHand` 先来自当前库存余额
2. `reserved` 来自 Reservation 聚合
3. `availableQty = onHand - reserved`
4. 由 query / dto / mapper 输出给前端

##### 1.4.4 前端消费接入

本轮建议：

1. 扩展前端 `InventoryItemApiDTO`
2. adapter / schema 接入新增字段
3. 前端只读消费，不补公式

#### 1.5 第一轮实施边界

本轮建议：

1. **先建 Reservation source of truth**
2. **再做 Inventory 聚合输出**
3. **最后做前端消费接入**

本轮不做：

1. 不让 `ShipmentRecord` 回退承担 reservation 语义
2. 不在前端补任何 `reserved` / `availableQty` 公式
3. 不跳过生命周期设计直接拼装查询字段

#### 1.6 当前阶段结论

第三十四轮当前已经明确：如果要把 `availableQty = onHand - reserved` 做成真正可上线的权威契约，就必须先落地 Reservation 模型本身，再通过生命周期与聚合查询把 `reserved` 变成后端可审计数字，最后才把它暴露给前端消费。换句话说，下一阶段已经不再是“要不要做”，而是“按什么最小闭环、什么顺序去做”。

### 1. plan：第三十三轮 reserved 来源定义规划（Reservation Source of Truth）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十三轮是在第三十二轮来源规划基础上，把 `reserved` 的来源正式落锤：

1. `reserved` 采用独立 Reservation 模型 / 预留表
2. `ShipmentRecord` 不承担 `reserved` 权威语义
3. 后续 `availableQty = onHand - reserved` 必须建立在该 Reservation source of truth 之上

#### 1.2 当前规划结论

当前已经确认：

1. `reserved` 的权威来源不再尝试复用出库流水：
   - `ShipmentRecord` 继续只表达出库事务
   - 不再承载库存预留状态

2. 后续最小实现闭环应基于独立 Reservation 模型展开：
   - Reservation model / table
   - Reservation query / aggregation
   - Inventory query DTO / mapper 输出 `reserved`
   - 再进一步输出 `availableQty`

3. 这也意味着当前 architecture choice 已明确：
   - 牺牲一部分“最小改动”
   - 换取 `reserved` 语义的长期可审计性与可维护性

#### 1.3 问题本质

这轮真实问题分为两类：

1. **Reservation source is now defined**：`reserved` 来源已明确为独立 Reservation 模型
2. **Implementation surface is larger but cleaner**：实现面会变大，但语义边界会更干净

#### 1.4 推荐方案

##### 1.4.1 Reservation 模型

本轮建议必做：

1. 设计 Reservation 表 / 模型
2. 明确字段（物料、仓类/批次、数量、状态、来源单据、生命周期时间戳等）

##### 1.4.2 Reservation 生命周期

本轮建议必做：

1. 明确 reservation 的创建条件
2. 明确释放 / 核销 / 失效条件
3. 明确它与 shipment / inventory 的关系边界

##### 1.4.3 Inventory 聚合输出

本轮建议：

1. `onHand` 先锚定为当前库存余额
2. `reserved` 来自 Reservation 聚合
3. `availableQty = onHand - reserved`
4. 由后端 query / dto / mapper 输出，前端只消费

#### 1.5 第一轮实施边界

本轮建议：

1. **先做 Reservation source of truth**
2. **再做 Inventory 查询聚合扩展**
3. **最后做前端消费接入**

本轮不做：

1. 不让 `ShipmentRecord` 继续兼任预留语义
2. 不在前端补任何 `reserved` 或 `availableQty` 公式
3. 不跳过 reservation 生命周期设计直接拼 DTO 字段

#### 1.6 当前阶段结论

第三十三轮当前已经明确：`reserved` 的来源定义已经落锤为独立 Reservation 模型，这意味着库存预留从现在开始不应再借道 `ShipmentRecord` 或任何流水对象来勉强承载。下一步正确方向是围绕 Reservation source of truth 设计模型、生命周期和聚合查询，再由后端权威输出 `reserved` 与 `availableQty`，最后才让前端消费。

### 1. plan：第三十二轮 reserved / onHand 来源规划（Backend Inventory Source of Truth）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十二轮不是直接实现 `availableQty`，而是先解决其两个上游来源字段：

1. `onHand` 从哪里来
2. `reserved` 从哪里来

因为你已经确认：`availableQty = onHand - reserved`

#### 1.2 当前排查结论

当前已经确认：

1. `server/models/inventory.go`
   - 当前库存模型只有 `Quantity`
   - 没有 `OnHand`、`Reserved`、`AvailableQty`

2. `server/models/ShipmentRecord`
   - 当前只有 `Quantity`、`Status` 等流水字段
   - 还不足以稳定承接“预留量”权威语义

3. `server/services/inventory_command_service.go`
   - 当前也未暴露单独的 reservation / hold / allocate 语义对象

4. 因此当前最稳妥的判断是：
   - `onHand` 只能先从现有库存余额字段 `Inventory.Quantity` 明确命名得出
   - `reserved` 当前没有可靠、独立、可审计的权威来源

5. 这也意味着：
   - 不能简单用 `ShipmentRecord` 反推 `reserved`
   - 否则会把“流水记录”误当成“库存预留状态”，造成语义漂移

#### 1.3 问题本质

这轮真实问题分为两类：

1. **onHand has a conservative source**：当前可最保守地锚定到 `Inventory.Quantity`
2. **reserved source is missing**：当前没有稳定的后端 reservation source of truth

#### 1.4 推荐方案

##### 1.4.1 onHand

本轮建议：

1. 若继续推进，可先把 `onHand` 明确定义为当前库存余额字段
2. 该定义需在 DTO 语义上显式化，而不是前后端默认脑补

##### 1.4.2 reserved

本轮建议必做：

1. 先定义 `reserved` 的业务来源
2. 明确它是否来自预留表、已提交未出库占用、或其它业务对象
3. 在来源未落地前，不实现 `availableQty`

##### 1.4.3 availableQty

本轮建议：

1. 只有在 `onHand` 与 `reserved` 都有权威来源后，才实现 `availableQty = onHand - reserved`
2. 前端仍然只消费，不补公式

#### 1.5 第一轮实施边界

本轮建议：

1. **先定来源，后写字段**
2. **ShipmentRecord 不直接充当 reserved 的权威来源**
3. **未落地 reserved 前，不进入 availableQty 代码实现**

本轮不做：

1. 不直接用 shipment 流水倒推出 reserved
2. 不在前端实现 `availableQty = onHand - reserved`
3. 不在缺少 reservation 语义模型时硬加伪字段

#### 1.6 当前阶段结论

第三十二轮当前已经明确：`availableQty` 之所以还不能安全实现，根因不在 DTO，而在其上游来源字段并未建立。当前 `onHand` 还可以保守锚定到 `Inventory.Quantity`，但 `reserved` 目前没有可靠的后端权威来源；`ShipmentRecord` 作为流水对象也不足以直接承担该语义。因此下一步必须先确认 `reserved` 的真实来源，再谈 `availableQty` 的代码落地，否则只会生成新的伪契约。

### 1. plan：第三十一轮 availableQty 后端实现规划（Backend availableQty Contract）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十一轮不是直接编码，而是基于第三十轮审计结果，为 `availableQty` 的后端权威实现确定最小边界：

1. 后端当前没有 `availableQty`
2. 前端当前也没有重算 `availableQty`
3. 当前业务定义已确认：`availableQty = onHand - reserved`

#### 1.2 当前规划结论

当前已经确认：

1. 若要实现 `availableQty`，最小改造面应是：
   - `server/services/inventory_query_dto.go`
   - `server/services/inventory_query_mapper.go`
   - `server/services/inventory_query_service.go`
   - 前端 `src/features/warehouse/inventory/contracts/inventory-api-dto.ts`
   - 前端 `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
   - 必要时前端 `data/schema.ts`

2. 当前真正的实现前提是：
   - 后端库存模型目前只有 `Quantity`
   - 当前未见 `Reserved` / `OnHand` 字段
   - 因而要实现 `availableQty = onHand - reserved`，必须先补足 `onHand` 与 `reserved` 的后端语义来源

3. 这意味着第三十一轮的首要任务已经从“确认语义”转为“落地语义”：
   - 明确 `onHand` 的后端来源
   - 明确 `reserved` 的后端来源
   - 在 query / dto / mapper 中显式输出 `availableQty`

#### 1.3 问题本质

这轮真实问题分为两类：

1. **Implementation path is known**：后端与前端需要改哪些文件已经明确
2. **Data-source chain is unresolved**：虽然语义已确认，但 `onHand` 与 `reserved` 的后端来源链路尚未落地

#### 1.4 推荐方案

##### 1.4.1 先补后端数据来源链路

本轮建议必做：

1. 明确 `onHand` 的来源（是否等于当前库存余额字段，还是需要独立查询）
2. 明确 `reserved` 的来源（是否已有预留表/占用逻辑，或需新增计算链路）

##### 1.4.2 若定义为后端新增权威字段

本轮建议：

1. 后端 query 层生成 `onHand`、`reserved`、`availableQty`
2. DTO 与 mapper 显式输出这些字段
3. 前端 DTO / adapter / schema 只做消费接入，不做公式计算

##### 1.4.3 前端消费边界

本轮建议：

1. 前端只消费后端返回的 `availableQty`
2. 不在前端临时实现 `availableQty = onHand - reserved`

#### 1.5 第一轮实施边界

本轮建议：

1. **先补数据来源链路，后补 DTO 与消费面**
2. **只做最小闭环**：query / dto / mapper / frontend consume
3. **前端不补公式**

本轮不做：

1. 不在未确认 `reserved` 来源前拍脑袋写假字段
2. 不在前端临时实现 `availableQty = onHand - reserved`
3. 不把当前规划阶段误推进成无依据代码实现

#### 1.6 当前阶段结论

第三十一轮当前已经明确：`availableQty` 的业务定义已经落锤为 `onHand - reserved`，但现有后端模型和查询链路还没有 `onHand` / `reserved` 这两个权威来源字段。因此下一步不是直接往 DTO 上硬塞一个 `availableQty`，而是先补齐后端数据来源、再扩展 query / dto / mapper，最后让前端只读消费。这样才能避免把一个看似简单的字段，做成前端补公式或后端拍脑袋造值的伪契约。

### 1. audit：第三十轮后端 DTO 契约审计（Backend Inventory DTO / availableQty）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第三十轮沿着上一轮 false alarm 继续往后追一层：

1. 后端库存 DTO 是否已经提供 `availableQty`
2. 后端 query / mapper 是否已经计算 `availableQty`
3. 后端库存模型是否已经具备 `reserved` / `availableQty` / `onHand` 等字段基础

#### 1.2 当前排查结论

当前已经确认：

1. `server/services/inventory_query_dto.go`
   - `InventoryItemResponse` 当前没有 `availableQty`
   - 也没有 `reserved`、`onHand` 等等价权威派生字段

2. `server/services/inventory_query_service.go`
   - `ListInventory(...)` 当前只是查询 `models.Inventory` 并补充物料分类映射
   - 没有库存可用量派生计算

3. `server/services/inventory_query_mapper.go`
   - `MapInventoryToResponse(...)` 当前只是字段映射
   - 没有 `availableQty` 或 `onHand - reserved` 的后端派生逻辑

4. `server/models/inventory.go`
   - 当前库存模型只有 `Quantity`、`TotalValue`、`AverageUnitCost` 等基础余额字段
   - 没有 `Reserved`、`AvailableQty` 等字段

5. 因此这轮真实结论是：
   - 前端当前没有重算 `availableQty`
   - 后端当前也没有提供 `availableQty` 权威字段

#### 1.3 问题本质

这轮真实问题分为两类：

1. **Frontend false alarm confirmed**：当前没有前端重算 `availableQty`
2. **Backend contract not yet present**：后端当前也尚未提供 `availableQty` 这类权威派生字段

#### 1.4 推荐方案

##### 1.4.1 当前实现边界

本轮建议：

1. 保留“当前前后端都未实现 `availableQty`”的真实结论
2. 不在没有业务确认前虚构前端或后端整改

##### 1.4.2 若业务确实需要 availableQty

本轮建议：

1. 由后端在 query / dto / mapper 链路显式提供 `availableQty`
2. 必要时同时明确 `reserved` 与 `onHand` 的语义来源
3. 前端只消费权威字段，不补公式

#### 1.5 第一轮实施边界

本轮建议：

1. **非实锤项不动**：当前不直接新增 `availableQty` 字段实现
2. **可选后续**：如你确认业务需要，再进入后端 availableQty 契约与实现规划

本轮不做：

1. 不在前端新增 `availableQty = onHand - reserved`
2. 不在缺少业务确认前直接改后端库存模型与 DTO
3. 不把当前审计结论误写成“已发现前端或后端现存 bug”

#### 1.6 当前阶段结论

第三十轮当前已经明确：`availableQty` 这类库存派生字段当前既没有在前端被重算，也没有在后端作为权威 DTO 字段被提供。因此这轮的真实结论不是“发现了可用库存字段被错误计算”，而是“该契约当前尚未存在”。如果后续业务确实需要 `availableQty`，正确方向只能是后端先定义并输出权威字段，前端再消费，而不是让前端或 adapter 临时补公式。

### 1. audit：第二十九轮 Inventory Core 审计（Computed Field Authority / availableQty）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十九轮关注 Inventory Core 是否在前端承担库存派生字段：

1. `inventory-core-service.ts` 是否计算 `availableQty`
2. inventory adapter 是否用 `onHand - reserved` 重算聚合字段
3. DTO 是否已经返回 `availableQty` 但被前端覆盖

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/warehouse/inventory/services/inventory-core-service.ts`
   - 当前未看到 `onHand - reserved` 这类前端公式计算
   - 当前未看到 `availableQty` 的前端重算或覆盖

2. `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
   - `toInventoryRecordContract(...)` 只做原始字段映射
   - `toInventoryViewContract(...)` 只补充展示字段
   - 当前没有派生 `availableQty`

3. `src/features/warehouse/inventory/contracts/inventory-api-dto.ts`
   - `InventoryItemApiDTO` 当前没有 `availableQty`
   - 因而不存在“后端已返回 availableQty，但前端又重算覆盖”的实锤问题

4. 因此这轮真实结论更接近 false alarm：
   - 当前未发现 Inventory Core 的前端 computed field leakage
   - 但这也意味着如果未来 UI 需要 `availableQty`，应由后端显式返回，而不是让前端补公式

#### 1.3 问题本质

这轮真实问题分为两类：

1. **No current frontend recomputation found**：当前未实锤 `availableQty` 前端派生
2. **Backend DTO contract gap (potential)**：若业务需要 `availableQty`，应由后端 DTO 提供权威字段，而非前端未来自算

#### 1.4 推荐方案

##### 1.4.1 Inventory Core / adapter

本轮建议：

1. 保持当前只做映射，不增加 `availableQty` 前端公式
2. 保留“当前未发现前端派生泄露”的审计结论

##### 1.4.2 availableQty 契约

本轮建议：

1. 若后续产品或库存页面需要 `availableQty`
2. 应推动后端在 DTO 中显式返回权威派生字段
3. 前端只消费，不重算

#### 1.5 第一轮实施边界

本轮建议：

1. **非实锤项不动**：不对 `inventory-core-service.ts` 做虚构整改
2. **可选后续**：如你继续追这个方向，可转入后端 DTO 契约审计

本轮不做：

1. 不在前端新增 `availableQty = onHand - reserved` 公式
2. 不对 inventory core / adapter 做无证据改写
3. 不在当前 false alarm 前提下制造不存在的问题修复

#### 1.6 当前阶段结论

第二十九轮当前已经明确：`inventory-core-service.ts`、inventory adapter 和 DTO 链路里，当前都没有实锤到前端重算 `availableQty` 或用 `onHand - reserved` 推导库存派生字段。因此这轮更准确的结论不是“发现了前端 computed field 泄露”，而是“当前未发现该问题，但若未来业务需要 `availableQty`，必须由后端 DTO 权威提供，前端不得补公式”。

### 1. audit：第二十八轮 DTO 运行时校验缺口（Validation Gap / Inventory Inbound Service）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十八轮关注库存入库 Service 的运行时校验完整性：

1. `inventory-transaction-service.ts` 的 `recordInbound(...)` 是否缺少 runtime schema parse
2. `toInboundRecordContract(...)` 是否仅做字段映射
3. `InboundRecord` 当前是否具备 zod 级运行时契约

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`
   - `recordInbound(...)` 在拿到响应后只做了 `ensureObjectResponse(...)`
   - 然后直接走 `toInboundRecordContract(...)`
   - 当前没有在 Service 出口执行 `inboundRecordSchema.parse(...)`

2. `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
   - `toInboundRecordContract(...)` 当前只是字段映射
   - 不承担 zod runtime 校验职责

3. `src/features/warehouse/inventory/data/schema.ts`
   - `InboundRecord` 目前是 TypeScript interface
   - 当前没有对应的 runtime schema 防线

4. 因此本轮真实问题是 Service 出口缺少最后一道运行时契约校验：
   - `ensureObjectResponse(...)` 只能保证对象形态
   - 不能保证字段非空、字段类型和业务契约完整性

5. 该问题会直接影响 UI 链路可靠性：
   - `product-inbound.tsx` 的入库 mutation 在成功后会继续驱动界面状态收口
   - 若返回 DTO 存在隐形 `null` 或字段漂移，可能穿透到上层界面逻辑

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Service exit validation gap**：`recordInbound(...)` 出口缺少 runtime parse
2. **Adapter-only mapping is insufficient**：字段映射不能代替 schema 校验
3. **Inbound contract has no runtime guard**：`InboundRecord` 当前仅有 TS interface，没有 zod 运行时防线

#### 1.4 推荐方案

##### 1.4.1 InboundRecord runtime schema

本轮建议必做：

1. 为 `InboundRecord` 建立 zod runtime schema
2. 保持 TS 类型从 schema 推导或与 schema 对齐

##### 1.4.2 inventory-transaction-service.ts

本轮建议必做：

1. 在 `recordInbound(...)` 出口执行 `parse(...)`
2. 保证进入 UI 逻辑前已经过最后一道运行时契约校验

##### 1.4.3 adapter 边界

本轮建议：

1. 保持 adapter 负责 DTO -> contract 映射
2. 不把 adapter 混成 runtime schema 替代品

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：补 `InboundRecord` runtime schema
2. **必做**：在 `recordInbound(...)` 出口补 parse 防线
3. **非目标**：不在本轮重写整个 inventory adapter 体系

本轮不做：

1. 不对全部 warehouse Service 一次性补全所有 schema parse
2. 不把整个 inventory 模块做全面 schema 重构
3. 不在没有证据前扩展到其它非 inbound 事务出口

#### 1.6 当前阶段结论

第二十八轮当前已经明确：库存入库 Service 的问题不是 DTO 转换有没有做，而是 `recordInbound(...)` 在 Service 出口缺少最后一道 runtime schema 防线。当前 `toInboundRecordContract(...)` 只是字段映射，而 `InboundRecord` 也仅是 TypeScript interface，不具备 zod 级运行时校验能力。因此下一阶段应聚焦在为 `InboundRecord` 补 runtime schema 并把 parse 收口到 `recordInbound(...)` 出口，而不是把问题泛化成整个 inventory adapter 体系的全面重写。

### 1. audit：第二十七轮库存调拨并发锁审计（Concurrency Lock Vacuum / Inventory Transfer）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十七轮关注库存调拨动作的并发锁完整性：

1. `inventory-transaction-service.ts` 的 `transferInventory(...)` 是否缺失 `version`
2. 调拨调用链是否已持有源库存版本但未透传
3. 库存主实体与 DTO 是否已具备版本字段

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/warehouse/inventory/services/inventory-transaction-service.ts`
   - `transferInventory(materialId, quantity, fromCat, toCat)` 当前未接收 `version`
   - 请求体只包含 `materialId`、`quantity`、`fromCategory`、`toCategory`
   - 未提交源库存快照版本

2. 前端库存主实体实际上已具备版本字段：
   - `InventoryRecord.version`
   - `InventoryItemApiDTO.version`

3. 适配器也没有丢版本：
   - `toInventoryRecordContract(dto)` 会把 `dto.version` 映射到前端实体
   - 因此问题不在读取侧，而在调拨写入链路

4. 因此本轮真实问题是并发锁参数在调拨链路中丢失：
   - 前端不是没有 `version`
   - 而是 `transferInventory()` 根本没有承接它

5. 该问题属于高危并发锁真空：
   - 调拨直接改变源库存数量
   - 若两个并发请求针对同一库存快照发起，且后端没有更强校验，则可能放大库存悬挂风险

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Version omission in transfer request**：调拨写请求未携带源库存版本
2. **Frontend has version but drops it**：前端实体与 DTO 已有 `version`，但服务层未透传
3. **Critical concurrency vacuum**：调拨动作缺失并发锁参数，存在库存悬挂与负库存风险

#### 1.4 推荐方案

##### 1.4.1 inventory-transaction-service.ts

本轮建议必做：

1. 为 `transferInventory(...)` 显式补充 `version`
2. 在请求体中提交源库存快照版本
3. 将调拨语义从“只凭 materialId + quantity”升级为“基于带版本快照的写操作”

##### 1.4.2 调拨调用链

本轮建议：

1. 从库存记录/库存列表的当前实体中透传 `version`
2. 避免在中间 hook / dialog / action 层丢失版本信息
3. 若调用点尚未持有源库存实体，则补齐最小必要读取

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：为调拨服务补齐 `version` 参数与请求载荷
2. **必做**：收口调拨调用链对源库存版本的透传
3. **非目标**：不在本轮重构整个库存模块

本轮不做：

1. 不对全部库存写接口一次性做统一重写
2. 不在没有证据前修改其它非调拨库存事务
3. 不把前后端整个库存并发模型一次性全面重构

#### 1.6 当前阶段结论

第二十七轮当前已经明确：库存调拨的前端链路并不是拿不到 `version`，而是 `transferInventory()` 在写请求上把 `version` 丢掉了。由于库存记录契约、DTO 和适配器都已经具备 `version` 字段，这个问题本质上是调拨写路径的并发锁漏传；风险等级应定为 [CRITICAL]。下一阶段应聚焦在为调拨服务补齐 `version` 参数并打通调用链透传，而不是泛化成整个库存模块的全面重写。

### 1. audit：第二十六轮逻辑泄露审计（Mold Loan Authority + BOM Core Parameter）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十六轮关注两个重灾区：

1. `use-mold-loan-mgmt.ts`
2. `use-bom-data.ts`

需要确认前端是否仍在承担：

1. 模具借还核心状态裁定
2. 模具资产初始化种子语义
3. BOM 工程核心参数（尤其 `standardUsage`）的前端计算或回填

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-bom-data.ts`
   - 当前未再看到 `standardUsage` 的前端生成、回填或透传落库
   - 这部分在前几轮已基本收口

2. `use-bom-data.ts` 当前更真实的职责是：
   - 结构校验
   - 物料主数据映射
   - `materialName` / `materialSpec` / `materialType` 补全
   - 这些属于映射与展示补全，不是工程核心参数公式计算

3. `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`
   - 在借入分支会前端拼装 `moldData`
   - 包含 `moldSn`、`moldName`、`maxCycles`、`currentCycles`
   - 因而前端确实参与了“外部模具资产种子数据”组装

4. 模具借还链路中更实锤的 authority 泄露位于 `src/features/equipment-tooling/services/mold-loan-service.ts`
   - `getLoans()` 会在前端把 `ACTIVE` + 逾期日期 判定成 `OVERDUE`
   - 这是对借还状态的前端再判定与覆盖

5. 因此这轮真实问题并不对称：
   - `use-bom-data.ts` 当前更像“已收口后的 false alarm”
   - 模具借还链路才是仍需继续治理的 authority 泄露重点

#### 1.3 问题本质

这轮真实问题分为三类：

1. **BOM standardUsage false alarm (current)**：`use-bom-data.ts` 当前未再实锤前端计算 `standardUsage`
2. **Mold status authority leak**：`MoldLoanService.getLoans()` 在前端动态改写借还状态为 `OVERDUE`
3. **Mold seed assembly boundary risk**：借入场景仍在前端拼装外部模具种子数据

#### 1.4 推荐方案

##### 1.4.1 use-bom-data.ts

本轮建议：

1. 保留“当前未再实锤 `standardUsage` 前端计算”的结论
2. 不虚构并不存在的 BOM 核心参数整改
3. 继续保持当前 authority 边界

##### 1.4.2 mold-loan-service.ts

本轮建议必做：

1. 收口 `getLoans()` 对 `status` 的前端动态改写
2. 由后端权威返回 `ACTIVE / RETURNED / OVERDUE` 等状态
3. 前端不再根据时间自行覆盖状态字段

##### 1.4.3 use-mold-loan-mgmt.ts

本轮建议：

1. 复核借入模式下 `moldData` 的 authority 边界
2. 仅保留必要的原始采集字段传递
3. 避免让前端承担资产初始化语义的最终裁定

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口模具借还状态的前端动态改写
2. **必做**：最小化借入场景的资产种子数据前端组装
3. **非实锤项不动**：`use-bom-data.ts` 保持当前实现

本轮不做：

1. 不把整个 equipment-tooling 模块一次性大重构
2. 不编造不存在的 `standardUsage` 现存问题并重复整改
3. 不在本轮改造所有资产服务的 authority 契约

#### 1.6 当前阶段结论

第二十六轮当前已经明确：`use-bom-data.ts` 在前几轮之后已基本收口，当前未再实锤前端计算 `standardUsage`；真正仍需继续治理的 logic leakage 主要在模具借还链路，其中最明确的问题是 `MoldLoanService.getLoans()` 仍在前端动态改写 `OVERDUE` 状态，而借入模式下的 `moldData` 组装也需要继续收口 authority 边界。因此下一阶段应聚焦在模具借还状态与借入资产种子语义，而不是回头虚构 BOM 数据钩子的旧问题仍然存在。

### 1. audit：第二十五轮离线持久层整改（Persistence Layer Drift / Dexie Reuse）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十五轮关注的是离线持久层与既有架构的一致性：

1. `persistence-service.ts` 是否仍在使用 `localStorage`
2. 项目内是否已有可复用的 Dexie / IndexedDB 实现
3. 当前离线层是否已经具备 `snapshot + pending log + sync meta` 的三层重算骨架

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/system-mgmt/services/persistence-service.ts`
   - 当前不再直接使用 `localStorage`
   - 读写链路通过 `StorageService`

2. `src/features/system-mgmt/services/storage-service.ts`
   - 底层使用原生 `IndexedDB`
   - 是轻量 key-value 包装层
   - 文件注释已明确“does not implement version locking”

3. 因此本轮真实问题不是 `localStorage` 残留，而是持久层漂移：
   - `PersistenceService` 没有接入项目内已经存在的 Dexie 离线架构
   - 仍在使用另一套轻量 IndexedDB KV 路径

4. 项目内已经存在可复用的 Dexie.js 能力：
   - `src/offline-sync/storage/dexie-offline-db.ts`
   - `src/offline-sync/storage/offline-storage.ts`

5. 现有 Dexie 离线层已经具备较完整的三层骨架：
   - `snapshots`
   - `pendingDeltas`
   - `syncMeta`
   - `conflictRecords`

6. 这些能力已经被离线适配器消费：
   - 例如 `stocktake-offline-adapter.ts` 已在使用 `OfflineStorage.transaction(...)`
   - 并通过 `enqueueDelta` / `upsertSyncMeta` 维护离线队列与同步状态

#### 1.3 问题本质

这轮真实问题分为三类：

1. **LocalStorage false alarm (current)**：`PersistenceService` 当前并未直接使用 `localStorage`
2. **Persistence layer drift**：系统管理持久层仍绕开现有 Dexie 离线架构
3. **Dexie reuse opportunity confirmed**：项目内已存在可直接复用的 snapshot / pending log / sync meta / conflict 骨架

#### 1.4 推荐方案

##### 1.4.1 PersistenceService

本轮建议必做：

1. 收口 `PersistenceService` 对轻量 IndexedDB KV 包装层的直接依赖
2. 将 authority 路径迁移到现有 Dexie / OfflineStorage 能力
3. 避免继续维护两套并行的离线持久化抽象

##### 1.4.2 Dexie / OfflineStorage 复用

本轮建议：

1. 直接复用 `offlineSyncDb` 与 `OfflineStorage`
2. 复用 `snapshots` / `pendingDeltas` / `syncMeta` / `conflictRecords` 表
3. 不重新发明新的 Dexie schema 或第二套离线数据库

##### 1.4.3 StorageService

本轮建议：

1. 将 `StorageService` 降级为非关键轻量 KV 场景
2. 不再承担需要版本锁、快照语义和 pending log 的关键路径

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：让 `PersistenceService` 对齐现有 Dexie 离线层
2. **必做**：优先复用 `OfflineStorage`，不重复造轮子
3. **非目标**：不在本轮重写整个 offline-sync 模块

本轮不做：

1. 不新建第二套 Dexie 数据库
2. 不做全仓持久层统一大重构
3. 不把所有轻量 KV 使用点一次性替换

#### 1.6 当前阶段结论

第二十五轮当前已经明确：`PersistenceService` 的问题并不是还在直接使用 `localStorage`，而是它仍绕开项目中已经存在的 Dexie 离线骨架，继续走轻量 IndexedDB KV 包装层。既然当前仓库已经有 `offlineSyncDb` 与 `OfflineStorage`，并且已经具备 `snapshot + pending log + sync meta + conflict` 的能力，下一阶段应聚焦在复用现有 Dexie 架构收口持久层漂移，而不是重新造一套新的离线存储轮子。

### 1. audit：第二十四轮源码损坏审计（Critical Source Corruption / Engineering Core）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十四轮关注的是更高优先级的源码健康风险：

1. `use-bom-data.ts`
2. `use-bom-form.ts`
3. `drilling-action-dialog.tsx`

需要确认这些工程核心文件中的乱码究竟是：

1. 注释损坏
2. 用户消息 / UI 文案损坏
3. 还是已经触及逻辑常量、字段名、控制流和版本管理可维护性

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-bom-data.ts`
   - 当前未见大面积乱码
   - 用户可见提示、导入链路异常消息、控制流文本当前可读
   - 本文件在之前轮次中已完成乱码 toast 收口

2. `src/features/engineering-db/components/drilling-action-dialog.tsx`
   - 当前文案、注释、字段标签均已恢复正常可读
   - 结构、字段名、控制流未见损坏残留

3. `src/features/engineering/hooks/use-bom-form.ts`
   - 当前仍是最值得警惕的残留污染点
   - 历史上存在乱码注释问题
   - 现阶段仍保留 `standardUsage: item.standardUsage || 0` 这类前端降级语义
   - 因而它不只是“显示层字符问题”，还叠加了逻辑漂移风险

4. 当前未看到乱码直接破坏 import、类型名、字段名或控制流结构：
   - 问题主要集中在注释、用户消息、UI 文案和局部逻辑残留

5. 但更广义的源码级损坏风险仍然成立：
   - engineering / engineering-db 范围内已多次出现乱码注释
   - 出现过乱码 toast
   - 出现过乱码 UI 文案
   - 说明历史字符集污染不是单点偶发，而是工程层面曾被错误写入过

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Historical source corruption confirmed**：工程核心域曾真实发生过字符集污染
2. **Current high-risk residual file**：`use-bom-form.ts` 仍带有残留污染与前端降级语义
3. **Recovered files should stay stable**：`use-bom-data.ts` 与 `drilling-action-dialog.tsx` 当前已恢复，不应无证据回滚或反复扰动

#### 1.4 推荐方案

##### 1.4.1 use-bom-form.ts

本轮建议必做：

1. 对 `use-bom-form.ts` 做一次定向深清洗
2. 收口历史损坏痕迹
3. 收口 `standardUsage: item.standardUsage || 0` 这类前端降级语义

##### 1.4.2 engineering / engineering-db 核心文件

本轮建议：

1. 对核心工程文件做一次定向乱码扫描
2. 逐个确认用户消息、注释、UI 标签是否仍有残留污染
3. 只修实锤文件，不做整域无差别重写

##### 1.4.3 已恢复文件

本轮建议：

1. 保持 `use-bom-data.ts` 当前实现
2. 保持 `drilling-action-dialog.tsx` 当前实现
3. 不对已恢复文件做无证据回滚

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：定向收口 `use-bom-form.ts`
2. **必做**：做一次关键工程文件乱码清扫
3. **非实锤项不动**：当前可读且已恢复的文件保持不变

本轮不做：

1. 不把整个工程仓一次性做全量编码迁移
2. 不在无证据前大范围重写所有 engineering 文件
3. 不对已恢复正常的文件做重复性改写

#### 1.6 当前阶段结论

第二十四轮当前已经明确：你指出的“源码级物理损坏”风险方向是成立的，但在当前代码状态下，`use-bom-data.ts` 与 `drilling-action-dialog.tsx` 已基本恢复正常；真正仍需要高度警惕和继续收口的核心文件是 `use-bom-form.ts`。因此下一阶段应聚焦在 `use-bom-form.ts` 的残留污染清洗，以及 engineering / engineering-db 关键文件的一次定向乱码审计，而不是对已经恢复的文件做无证据回滚。

### 1. audit：第二十三轮审计修复（Material version lock authority + Excel 映射韧性 + filteredMaterials 影子逻辑核对）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十三轮审计有三个关注点：

1. `use-material-mgmt-data.ts` 是否在 `patchMaterial` 调用中使用 `data.version || 1`
2. `excel-service.ts` 在大批量物料导入中的字段映射是否具有足够韧性
3. `use-material-mgmt-data.ts` 中 `filteredMaterials` 是否只是引用重命名而没有额外前端计算

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/material-archive/hooks/use-material-mgmt-data.ts`
   - 当前存在 `MaterialMaintenanceService.patchMaterial(data.id, delta, data.version || 1)`
   - 当 `data.version` 缺失时，会静默降级到 `1`

2. 该问题是真实的版本 authority 风险：
   - patch 语义本应要求版本号为强制前置条件
   - 当前回退到 `1` 会绕开缺失版本的显式失败路径
   - 会削弱并发冲突与审计链保护

3. `filteredMaterials`
   - 当前只是 `filteredMaterials: materials`
   - 未看到额外的筛选、映射、聚合或派生逻辑
   - 本轮**未实锤**“filteredMaterials 存在影子计算逻辑泄露”

4. 大批量物料导入的真实目标文件是 `src/features/material-archive/services/excel-service.ts`

5. 该文件存在若干导入映射韧性不足点：
   - `getWorksheetByNames(...) || workbook.getWorksheet(1)` 会在工作表命名失配时退回第一张表，存在误命中风险
   - `categoryMap.get(categoryLabel) || categoryLabel` 会把未映射的分类标签直接透传
   - `globalSnapshotVersion` 缺失时默认 `0`
   - `compositeId` 依赖最后一个 `_` 拆分 `id/version`，对异常格式鲁棒性有限

6. 但该导入链路并非完全黑盒吞错：
   - 最终仍通过 `materialExcelSchema.safeParse(...)` 校验
   - 校验失败会 `failLoudly(...)` 并抛错

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Version lock fallback**：物料 patch 在 `version` 缺失时静默回退到 `1`
2. **Excel mapping resilience gap**：物料导入映射存在工作表定位、分类映射、快照版本和 ID 解析韧性不足
3. **Filtered materials false alarm (current)**：`filteredMaterials` 当前仅为引用重命名，未实锤影子计算

#### 1.4 推荐方案

##### 1.4.1 use-material-mgmt-data.ts

本轮建议必做：

1. 移除 `data.version || 1` 的非权威降级
2. 当 patch 缺失 `version` 时显式失败
3. 保持并发锁版本号的强制性

##### 1.4.2 filteredMaterials

本轮建议：

1. 保留“当前仅重命名引用”的结论
2. 不虚构并不存在的前端影子计算整改
3. 如无新增需求，保持实现不动

##### 1.4.3 material-archive/services/excel-service.ts

本轮建议：

1. 收紧工作表定位，不再默认退回第一张表
2. 对分类映射缺失做显式失败，而不是透传原标签
3. 对 `globalSnapshotVersion` 与 `compositeId` 格式做更明确校验

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口 patchMaterial 调用中的版本 fallback
2. **必做**：提升 material excel service 的导入映射韧性
3. **非实锤项不动**：`filteredMaterials` 保持当前实现

本轮不做：

1. 不把整个物料导入体系一次性重构成全新导入平台
2. 不对 `filteredMaterials` 编造不存在的影子计算整改
3. 不把所有 material archive hook 一次性全面重写

#### 1.6 当前阶段结论

第二十三轮当前已经明确：`use-material-mgmt-data.ts` 中 `data.version || 1` 是实锤的非权威降级，会破坏版本锁的强制性；`filteredMaterials` 当前只是对 `materials` 的引用重命名，没有额外前端计算；而物料 Excel 导入链路的真实问题则在于 `material-archive/services/excel-service.ts` 的工作表定位、分类映射和快照版本等韧性不足。因此下一阶段应聚焦在版本锁 authority 收口与导入映射显式校验，而不是虚构 `filteredMaterials` 的影子逻辑整改。

### 1. audit：第二十二轮审计修复（Sales Order 摘要 authority + i18n fallback gap + use-products 生命周期审计）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十二轮审计有三个关注点：

1. `sales-order-detail-summary.tsx` / `useSalesOrderDetailSummaryViewModel` 是否前端重算财务汇总数据
2. `sales-order-detail-summary.tsx` 是否存在 `fallbackTitle='Order Evidence'` 这类英文兜底
3. `use-products.ts` 的 `staleTime` 是否符合产品数据生命周期契约

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/trading/hooks/use-sales-order-detail-summary-view-model.ts`
   - 当前未看到 `lines.reduce(...)` 或其它前端重算订单总额逻辑
   - 金额展示直接读取 `order.amount`
   - 因此本轮**未实锤**“销售详情摘要 view model 前端重算财务汇总”

2. 销售订单前端预览计算并非不存在，而是位于别处：
   - `src/features/trading/utils/sales-order-calc.ts` 存在 `previewOrderTotals()`
   - 注释已明确标注 `[PREVIEW-ONLY]`
   - 其语义是前端编辑态实时预览，而不是 `sales-order-detail-summary.tsx` 的详情摘要 authority 泄露

3. `src/features/trading/components/parts/sales-order-detail-summary.tsx`
   - 调用了 `OrderEvidenceGallery`
   - 显式传入 `fallbackTitle='Order Evidence'`

4. `src/features/trading/components/parts/order-evidence-gallery.tsx`
   - 当前实现为 `t(titleKey as never) || fallbackTitle`
   - 默认 `fallbackTitle = 'Order Evidence'`
   - 这属于 UI 层英文硬编码兜底，命中 i18n fallback gap

5. `src/features/engineering/hooks/use-products.ts`
   - 当前 `staleTime` 固定为 `5 * 60 * 1000`
   - 该 hook 已支持 `mode: 'options' | 'page'`
   - 但缓存时长仍未按模式分化

6. 因此 `use-products.ts` 的真实问题更偏向生命周期边界不清：
   - 对 options 下拉，5 分钟缓存未必不合理
   - 对 page 列表模式，沿用相同 `staleTime` 缺少明确的数据存留契约说明

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Summary authority false alarm (current)**：销售详情摘要当前未实锤前端重算财务汇总
2. **i18n fallback gap**：证据区标题存在英文硬编码兜底 `Order Evidence`
3. **Product query lifespan ambiguity**：`use-products.ts` 的 options / page 模式未分化 `staleTime`

#### 1.4 推荐方案

##### 1.4.1 sales-order-detail-summary.tsx / view model

本轮建议：

1. 保留“当前未实锤前端重算 totalAmount”的结论
2. 不虚构并不存在的摘要金额重算整改
3. 如后续审计扩到编辑态预览，则单独针对 `previewOrderTotals()` 审视边界

##### 1.4.2 i18n fallback

本轮建议必做：

1. 移除 `fallbackTitle='Order Evidence'` 英文兜底
2. 避免 `t(...) || 'English text'` 这类硬编码 fallback
3. 若翻译缺失，优先保持空值或显式缺失告警，而不是输出英文硬编码

##### 1.4.3 use-products.ts staleTime

本轮建议：

1. 明确区分 `options` 与 `page` 模式的数据生命周期
2. 为不同模式提供差异化或可配置的 `staleTime`
3. 避免把同一缓存时长默认套用到下拉数据和分页列表数据

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口证据区标题的英文兜底
2. **必做**：为 `use-products.ts` 补模式化 `staleTime` 边界
3. **非实锤项不动**：不对销售详情摘要编造不存在的金额重算整改

本轮不做：

1. 不把整个销售订单编辑态预览计算体系一次性重构
2. 不把所有 UI fallback 一次性全项目扫荡
3. 不在没有实锤前编造 `useSalesOrderDetailSummaryViewModel` 的财务逻辑泄露整改

#### 1.6 当前阶段结论

第二十二轮当前已经明确：`useSalesOrderDetailSummaryViewModel` 本身未实锤前端重算订单总额，当前金额展示直接读取 `order.amount`；真正实锤的问题在于证据区标题仍存在 `Order Evidence` 英文硬编码兜底，以及 `use-products.ts` 在 `options / page` 两种模式下沿用同一个 5 分钟 `staleTime`，缺少清晰的数据生命周期边界。因此下一阶段应聚焦在 i18n fallback 收口与产品查询缓存契约澄清，而不是虚构一个并不存在的销售详情金额重算整改。

### 1. audit：第二十一轮审计修复（BOM 导入公式漂移 + 源码编码损坏 + Drilling 联动 authority 审计）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十一轮审计有三个关注点：

1. `use-bom-data.ts` 的 Excel 导入是否直接采信并入库 `standardUsage`
2. `use-bom-data.ts` 是否存在字符集损坏的乱码报错块
3. `drilling-action-dialog.tsx` 的复杂钻孔参数联动逻辑是否仍存在前端 authority 泄露

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-bom-data.ts`
   - `ExcelService.parseBOMExcel(file)` 返回的 `parsedItems` 含 `standardUsage`
   - `parseExcel()` 最终组装 `processedItems` 时直接写入 `standardUsage: item.standardUsage`
   - 当前前端导入链路会把客户端携带的 `standardUsage` 直接带入后续保存输入

2. 该问题是真实的公式 authority 漂移：
   - Excel 可能由用户手工维护，`standardUsage` 可能来自过时公式或人工错误值
   - 当前导入流程没有把它降级为“仅采集原始输入，待后端重算”的语义

3. `use-bom-data.ts` 存在实锤源码字符集损坏：
   - `toast.error('BOM 鐎电厧...')` 乱码报错真实存在
   - 这既破坏了用户错误提示，也说明源码文件发生编码损坏

4. `src/features/engineering-db/components/drilling-action-dialog.tsx`
   - 当前主要承担表单录入：方案名称、产品选择、编织模式、孔数、文件上传
   - 未看到基于几何参数的复杂钻孔权威公式结算逻辑
   - 当前**未实锤**“钻孔联动 authority 泄露”

5. 但 `drilling-action-dialog.tsx` 当前存在更真实的问题：
   - 标题、描述、按钮、字段标签存在大面积乱码
   - 属于源码字符集损坏 / 工程质量阻塞问题

#### 1.3 问题本质

这轮真实问题分为三类：

1. **StandardUsage import authority drift**：客户端 Excel 中的派生值被直接当作可入库数据透传
2. **Corrupted source blocker**：`use-bom-data.ts` 和 `drilling-action-dialog.tsx` 都存在字符集损坏
3. **Drilling authority false alarm (current)**：当前未实锤钻孔联动公式在前端承担权威计算

#### 1.4 推荐方案

##### 1.4.1 use-bom-data.ts / BOM Excel 导入

本轮建议必做：

1. 前端导入不再把 `standardUsage` 视为可直接入库的权威值
2. 导入侧只保留原始采集字段，或明确将 `standardUsage` 降级为待服务端重算
3. 最终以服务端当前工程配置重新核算 `standardUsage`

##### 1.4.2 源码字符集损坏

本轮建议必做：

1. 修复 `use-bom-data.ts` 中的乱码报错块
2. 修复 `drilling-action-dialog.tsx` 中的大面积乱码 UI 文案
3. 恢复源码可读性与用户消息可读性

##### 1.4.3 drilling-action-dialog.tsx

本轮建议：

1. 保留“当前未实锤复杂钻孔公式 authority 泄露”的结论
2. 不虚构不存在的前端联动公式整改
3. 仅按真实问题修复字符集损坏，并保持 authority 边界不扩写

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口 BOM Excel 导入对 `standardUsage` 的直接采信
2. **必做**：修复 `use-bom-data.ts` 的乱码报错块
3. **必做**：修复 `drilling-action-dialog.tsx` 的字符集损坏

本轮不做：

1. 不把整个 BOM 导入体系一次性扩成完整后端重算引擎重构
2. 不在没有实锤前编造钻孔联动 authority 泄露整改
3. 不对 engineering-db 全模块做一次性乱码全域扫荡

#### 1.6 当前阶段结论

第二十一轮当前已经明确：`use-bom-data.ts` 的 Excel 导入链路确实直接采信了客户端的 `standardUsage`，属于隐蔽的公式 authority 漂移；同文件中的乱码报错块也是实锤 blocker；`drilling-action-dialog.tsx` 当前未实锤前端承担钻孔权威公式，但文件本身确实存在大面积字符集损坏。因此下一阶段应聚焦在 BOM 导入 authority 收口与源码编码修复，而不是把范围扩大成未被证实的钻孔联动公式整改。

### 1. audit：第二十轮审计修复（Product Types 静默降级 + Material 分类 authority + UDS 深度核对）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第二十轮审计有三个关注点：

1. `product-types-mgmt.tsx` 是否通过 `data ?? []` 静默建立 `typeMap`
2. `use-material-mgmt-data.ts` 是否基于 `id` 或 magic value 做特殊分类硬编码
3. `product-types-mgmt.tsx` 第 248 行附近的 `shadow-inner` / `bg-muted/5` 是否命中 UDS 深度漂移

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/tabs/product-types-mgmt.tsx`
   - 存在 `const typeMap = useMemo(() => buildProductTypeMap(data ?? []), [data])`
   - 当查询失败、返回异常或缺失时，会静默建立空 `Map`

2. 该静默路径会影响父级名称展示：
   - `const parent = row.original.parentId ? typeMap.get(row.original.parentId) : null`
   - 空 `Map` 会让所有子级回退到 `rootLevel` 展示分支
   - 属于“失败态伪装成业务空态”的 ZERO TOLERANCE 问题

3. `src/features/material-archive/hooks/use-material-mgmt-data.ts`
   - 当前未看到按 `id` / magic value 判断“特殊分类”的逻辑
   - 分类过滤只是把 `category` 传给 `MaterialCoreService.getMaterials(...)`
   - 当前未实锤前端在数据层偷做特殊分类裁决

4. 材料分类 authority 的更真实现状是：
   - 模块分类地图仍由前端 `material-category-options.ts` 常量维护
   - 但这不是 `use-material-mgmt-data.ts` 本轮待审的“按 id 特判”问题本体

5. `src/features/engineering/tabs/product-types-mgmt.tsx` 第 248 行附近
   - 当前使用 `shadow-inner`
   - 同时搭配 `bg-muted/5`
   - 与现有圆角、虚线边框、柔和内阴影的 UDS 深度组合保持一致
   - 当前未发现“最后 1 像素”的物理深度漂移实锤

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Type map silent fallback**：类目查询失败时，父子层级关系被静默伪装为根级展示
2. **Material authority false alarm**：`use-material-mgmt-data.ts` 当前未实锤按 `id` 硬编码特殊分类
3. **UDS depth alignment confirmed**：`shadow-inner + bg-muted/5` 当前未发现需要整改的偏差

#### 1.4 推荐方案

##### 1.4.1 product-types-mgmt.tsx

本轮建议必做：

1. 移除 `typeMap` 的 `data ?? []` 静默降级
2. 将“父级缺失”和“查询失败”显式区分
3. 避免把错误态误导为 `rootLevel`

##### 1.4.2 use-material-mgmt-data.ts

本轮建议：

1. 保留“当前未实锤按 `id` 特殊分类硬编码”的结论
2. 不虚构并不存在的数据层分类判定整改
3. 如需补充，仅做 authority 注记或保持不动

##### 1.4.3 UDS 深度

本轮建议：

1. 保持 `shadow-inner + bg-muted/5` 当前实现
2. 不在无证据前做表面化视觉扰动

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：收口 `product-types-mgmt.tsx` 的 `typeMap` 静默降级
2. **非实锤项不动**：`use-material-mgmt-data.ts` 不做虚构整改
3. **非实锤项不动**：当前 UDS 深度实现保持不变

本轮不做：

1. 不把整个材料分类体系一次性重构成后端导航/分类平台
2. 不为 `use-material-mgmt-data.ts` 编造不存在的按 `id` 逻辑修复
3. 不对已对齐的 UDS 阴影深度做无依据改动

#### 1.6 当前阶段结论

第二十轮当前已经明确：`product-types-mgmt.tsx` 的 `typeMap` 确实存在 `data ?? []` 静默降级，会把失败态误导为根级层级展示；`use-material-mgmt-data.ts` 当前未实锤按 `id` 做特殊分类硬编码；`product-types-mgmt.tsx` 第 248 行附近的 `shadow-inner + bg-muted/5` 也未发现 UDS 偏差。因此下一阶段应聚焦在收口 `typeMap` 的静默 fallback，而不是对未实锤的材料分类逻辑和已对齐的视觉深度做形式主义整改。

### 1. audit：第十九轮审计修复（BOM 注释编码损坏 + 时间 authority 漂移 + use-products 静默降级审计）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十九轮审计有三个关注点：

1. `use-bom-form.ts` 是否存在业务注释编码损坏
2. `use-bom-form.ts` 是否在前端生成 `createdAt` 这类带审计权重的时间字段
3. `use-products.ts` 是否存在 `?? []` 静默降级，尤其在大分页/大列表场景下伪装加载失败

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-bom-form.ts`
   - 存在乱码注释片段，如 `鍓嶇涓嶅啀棰勮...`
   - 虽不影响运行，但已经破坏业务注记、authority 说明与可维护性

2. `use-bom-form.ts` 当前存在前端生成时间戳：
   - `initialValues.createdAt = new Date().toISOString()`
   - 初始化 `data.createdAt = new Date().toISOString()`
   - 这意味着前端正在参与 BOM 初始态审计时间字段的生成

3. `src/features/engineering/hooks/use-products.ts`
   - 当前未看到 `?? []` 或等价空数组 fallback
   - 当前实现只是对 `useQuery(...)` 的直接封装

4. 但 `use-products.ts` 的真实风险并不在“静默降级已发生”，而在于：
   - `PRODUCTS_QUERY_KEY` 固定复用
   - `ProductCoreService.getProducts()` 同时承载 options 与分页列表两种模式
   - 后续一旦列表页和下拉 options 共用该 hook 或共用 key，容易发生缓存语义混叠

#### 1.3 问题本质

这轮真实问题分为三类：

1. **Comment corruption**：BOM 关键业务注释因字符集损坏而丧失可读性
2. **Timestamp authority drift**：前端本地时钟参与生成 `createdAt` 这类带审计权重的字段
3. **Query-mode boundary ambiguity**：`use-products.ts` 当前尚未命中 `?? []`，但 query key 与数据模式边界没有明确建模

#### 1.4 推荐方案

##### 1.4.1 use-bom-form.ts 注释编码损坏

本轮建议必做：

1. 修复损坏的 BOM 业务注释文本
2. 恢复原本的 authority / 边界说明可读性
3. 仅修复明确损坏的业务注记，不顺带大规模改写全部注释

##### 1.4.2 前端 createdAt authority

本轮建议必做：

1. 从 `use-bom-form.ts` 中移除前端生成 `createdAt` 的逻辑
2. 由后端保存链路 / 数据库 authority 决定审计时间字段
3. 前端初始态若确需占位，应保持为空或由服务端 DTO 回填，而不是使用本地时间

##### 1.4.3 use-products.ts

本轮建议：

1. 保留“当前未实锤 `?? []` 静默降级”的结论
2. 补 `use-products.ts` 的 query key / 模式边界建模
3. 显式区分：
   - options 查询
   - 分页列表查询
4. 避免未来在大分页接入后出现缓存语义混叠或 authority 漂移

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：修复 `use-bom-form.ts` 注释字符集损坏
2. **必做**：移除 `use-bom-form.ts` 前端生成 `createdAt` 的逻辑
3. **必做**：最小收口 `use-products.ts` 的 query key / 模式边界

本轮不做：

1. 不把整个 engineering 产品查询体系一次性重构成完整分页平台
2. 不在没有实锤前虚构 `?? []` 静默降级整改
3. 不把所有带时间字段的表单一次性全域扫荡式重写

#### 1.6 当前阶段结论

第十九轮当前已经明确：`use-bom-form.ts` 的乱码业务注释是实锤的工程质量问题；同文件中前端生成 `createdAt` 也是明确的时间 authority 漂移；`use-products.ts` 当前未命中你担心的 `?? []` 静默降级，但其 query key 与数据模式边界确实不够清晰。因此下一阶段应聚焦在 BOM 注释修复、移除前端审计时间生成，以及补齐产品查询模式建模，而不是扩成并不存在的静默降级修复工程。

#### 1.1 当前背景

第十五轮审计有三个关注点：

1. 员工工龄是否仍由前端动态计算
2. 身份证/银行卡是否在无后端权限裁决下直接明文渲染
3. `employee-columns.tsx` 中是否存在语言契约漂移

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/org-personnel/components/employee-columns.tsx`
   - 在 `workYears` 列中直接调用 `previewPersonnelWorkYears(joinedDate)`
   - 不是消费后端返回的权威工龄值

2. `src/features/org-personnel/config/personnel-archive-columns.ts`
   - `previewPersonnelWorkYears()` 使用 `new Date(joinedDate)` 与 `new Date()` 做时间差
   - 属于前端基于设备时间的动态推导

3. `src/features/org-personnel/components/employee-columns.tsx`
   - 直接渲染 `idCard`
   - 直接渲染 `bankCard`

4. 当前员工前端契约还没有体现脱敏权限裁决：
   - `employee-api-dto.ts` 中只有 `idCard` / `bankCard`
   - `data/schema.ts` 中只有 `idCard` / `bankCard`
   - 未发现 `maskedIdCard` / `maskedBankCard` / `canViewSensitive` 等字段

5. 语言契约违规真实存在：
   - `employee-columns.tsx` 硬编码 `Unassigned`
   - `employee-columns.tsx` 硬编码 `Position`
   - `employee-management-list.tsx` 的岗位筛选 option label 也使用 `Unassigned`

#### 1.3 问题本质

这轮的真实问题分为三类：

1. **Work years authority breach**：工龄属于严谨的人事/财务审计逻辑，不应由前端用本地时间差计算
2. **PII masking breach**：身份证/银行卡脱敏不应由前端自作主张，必须由后端按权限裁决输出
3. **Language contract drift**：员工列配置中存在未经过 `t()` 的硬编码英文

#### 1.4 推荐方案

##### 1.4.1 工龄

本轮建议必做：

1. 后端员工列表/详情响应补充权威 `workYears`
2. 前端表格列直接消费后端 `workYears`
3. 删除 `previewPersonnelWorkYears()` 在员工列表中的使用

##### 1.4.2 PII 脱敏

本轮建议必做：

1. 后端员工响应增加脱敏后的敏感字段（如 `maskedIdCard` / `maskedBankCard`）
2. 若需要保留权限语义，也应由后端返回明确裁决结果
3. 前端列渲染仅展示后端裁决后的字段，不再直接渲染明文 `idCard` / `bankCard`

##### 1.4.3 i18n

本轮建议：

1. 将 `Unassigned` / `Position` 全部切回 `t()`
2. 如缺词条，则同步补中英文 locale

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：工龄权威下沉到后端 DTO
2. **必做**：敏感信息脱敏由后端裁决后输出
3. **必做**：员工列和岗位筛选中的英文硬编码收口到 i18n

本轮不做：

1. 不在前端新增一套“权限脱敏工具”替代后端裁决
2. 不把所有 org-personnel 页面一次性全部重构
3. 不把工龄逻辑扩成完整薪资/社保规则引擎重构

#### 1.6 当前阶段结论

第十五轮是实锤问题：员工工龄当前确实仍由前端本地时间动态推导，身份证/银行卡也仍被直接明文渲染，且缺少后端脱敏权限裁决；同时员工列与岗位筛选中还存在 `Unassigned` / `Position` 的语言契约漂移。因此这轮必须采用前后端联动修复，而不能停留在前端补丁层面。

### 1. audit：第十七轮审计修复（底层错误 i18n + BOM 表单 authority 边界 + Sales Master UDS 动效）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十七轮审计有三个关注点：

1. `use-product-form-init.ts` 的关键元数据错误提示是否仍为英文硬编码
2. `use-bom-form.ts` 是否在前端承担了不应承担的派生字段计算或静默降级
3. `sales-order-master.tsx` 的 Tab 切换动效是否存在 `duration-700` 这类 UDS 节奏漂移

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/hooks/use-product-form-init.ts`
   - 存在 `PRODUCT_METADATA_UNAVAILABLE_MESSAGE`
   - 内容为纯英文硬编码
   - 在 `isNotFoundError(error)` 分支下直接写入 `metadataInitError`

2. 该问题是真实的 i18n 漂移：
   - 即便是底层元数据初始化失败，也属于最终可见的用户提示
   - 中文环境下不应暴露英文错误说明

3. `src/features/engineering/hooks/use-bom-form.ts`
   - 存在 `productsQuery.data ?? EMPTY_PRODUCTS`
   - 存在 `changeOrdersQuery.data ?? EMPTY_CHANGE_ORDERS`
   - 存在 `materialsQuery.data ?? EMPTY_MATERIALS`
   - 当前请求异常会被静默降格为“空选项 / 空材料 / 空变更单”语义

4. `use-bom-form.ts` 当前未发现前端主动计算 `totalAmount`
   - 没有在 hook 中看到金额累计后回写表单或提交 payload 的逻辑
   - 本轮暂不支持“前端偷偷累计 BOM 总金额”这一指控

5. `use-bom-form.ts` 当前也未发现前端主动重算 `standardUsage`
   - 对编辑态仅透传 `currentRow.items[].standardUsage`
   - 对新建态仅透传 `initialItems[].standardUsage`
   - 当前更像是沿用外部传入值，而非在 hook 中自行推导公式

6. 但 BOM 表单本轮仍有两个真实风险：
   - query fallback 静默降级
   - `standardUsage` 仍以普通数值字段形式进入表单，authority 语义未被明确标注

7. `src/features/trading/components/sales-order-master.tsx`
   - 已命中 `animate-in fade-in duration-700`
   - 确实存在交易主视图动效节奏过慢的 UDS 漂移信号

#### 1.3 问题本质

这轮的真实问题分为三类：

1. **Low-level i18n drift**：底层错误提示仍以英文硬编码暴露给中文用户
2. **BOM form fail-loudly / authority ambiguity**：当前未实锤前端重算派生字段，但存在静默降级和 authority 语义模糊
3. **Sales master motion drift**：交易主视图 Tab 切换动效节奏偏慢，不符合更克制的 UDS 1.0 体验

#### 1.4 推荐方案

##### 1.4.1 use-product-form-init

本轮建议必做：

1. 删除 `PRODUCT_METADATA_UNAVAILABLE_MESSAGE` 的英文硬编码
2. 改为通过 `t()` / locale 词条输出中文可读提示
3. 保留英文日志/错误上下文，但用户面提示必须本土化

##### 1.4.2 use-bom-form

本轮建议必做：

1. 收口 `productsQuery.data ?? ...` / `changeOrdersQuery.data ?? ...` / `materialsQuery.data ?? ...`
2. 改为显式 loading / error / empty 语义，而非静默空集合
3. 对 `standardUsage` 补充 authority 边界说明：
   - 若当前仅作后端返回值承接，应避免让代码语义看起来像“前端权威公式”
   - 若存在可编辑场景，也应在提交或展示层明确“最终以服务端校准为准”

##### 1.4.3 sales-order-master

本轮建议：

1. 收口 `duration-700` 到更克制的时长
2. 保持 Trading 主视图 Tab 切换的工业化节奏一致
3. 不扩散成整页动画体系重构

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：产品元数据关键错误提示切回 i18n
2. **必做**：BOM 表单去静默 fallback，并最小澄清 `standardUsage` authority 边界
3. **必做**：销售主视图 Tab 切换动效节奏收口

本轮不做：

1. 不在没有实锤证据的前提下虚构 `totalAmount` 前端计算整改
2. 不把整个 BOM 编辑器扩成完整服务端结算引擎重构
3. 不把 Trading 全模块动画体系一次性重写

#### 1.6 当前阶段结论

第十七轮当前已经明确：`use-product-form-init.ts` 的英文硬编码错误提示是实锤 i18n 漂移；`use-bom-form.ts` 当前未发现前端主动重算 `totalAmount` 或 `standardUsage`，但静默 fallback 和 authority 语义模糊仍是实锤问题；`sales-order-master.tsx` 也已命中 `duration-700` 的动效节奏漂移。因此下一阶段应按最小、真实、可验证的边界实施，而不是对并不存在的前端派生公式做形式主义整改。

### 1. audit：第十四轮审计修复（Asset 状态迁移边界 + BOM Zod 契约 + Sales Detail Metadata UDS）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十四轮审计有三个关注点：

1. 资产状态迁移是否被静默降格为普通字段覆盖
2. BOM service 返回契约是否仍停留在 TypeScript type，而未对齐 Zod runtime contract
3. Sales detail 金额 metadata 是否存在 UDS 1.0 视觉细节漂移

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/equipment-tooling/services/asset-service.ts`
   - 当前本身更偏向 façade
   - 主要导出 `MoldCoreService` / `MoldTransactionService` / `FurnaceService` / `MoldLoanService`
   - 目前未在 façade 层看到直接通过通用 `patch/save` 覆盖状态字段的证据

2. 资产侧本轮还不能轻率下“已安全”结论：
   - façade 层干净，不代表底层 transaction/service 没有 shadow update
   - 下一阶段必须继续沿模具/设备状态迁移链路往下追命令入口

3. `src/features/engineering/services/bom-service.ts`
   - `BOMListResponse` 仍是 TypeScript type
   - `getBOMs/getBOMById/saveBOM` 仅使用 `ensureObjectResponse/ensureArrayResponse`
   - 缺少基于 Zod schema 的 DTO 运行时校验

4. `src/features/trading/hooks/use-sales-order-detail-summary-view-model.ts`
   - `contractAmount` 当前直接输出拼接后的金额字符串
   - 已定位金额 metadata 的数据出口
   - 但最终 UDS 视觉漂移仍需落到 summary 组件实际展示层继续确认

#### 1.3 问题本质

本轮的真实问题分为三类：

1. **Asset authority risk not yet closed**：当前未在 façade 层发现直接违规，但资产状态迁移必须继续追到底层 command/transaction
2. **BOM type schema gap**：BOM service 仍未以 Zod schema 作为返回契约单源
3. **Sales metadata aesthetics drift**：金额 metadata 的数据出口已定位，但样式层级仍需落到展示组件做 UDS 收口

#### 1.4 推荐方案

##### 1.4.1 Asset

本轮建议：

1. 继续深查 `MoldTransactionService` / `FurnaceService` 等底层状态迁移入口
2. 只要发现故障报修、周期核减、停机维护等状态变更由普通 patch/字段覆盖完成，就改为独立事务命令
3. 如状态变更天然伴随工单/流程，必须把 workflow/ticket 一并纳入命令语义

##### 1.4.2 BOM

本轮建议必做：

1. 新增 `bomApiSchema` / `bomListApiSchema`（或同类命名的 Zod DTO schema）
2. `getBOMs/getBOMById/saveBOM` 统一基于 schema 做 runtime parse
3. 不再让 BOM service 仅依赖 TypeScript interface 承担契约职责

##### 1.4.3 Sales Detail Metadata

本轮建议：

1. 找到 `sales-order-detail-summary.tsx` 实际渲染金额 metadata 的样式位置
2. 对齐金额标签、金额值、辅助 metadata 的字号 / 字重 / 透明度 / 跟踪字距
3. 保持 UDS 1.0 的层级与工业风一致性，不做无关重构

#### 1.5 第一轮实施边界

本轮建议：

1. **资产侧**：只改真实存在的状态迁移 shadow update，不做想象式 workflow 大改
2. **BOM 侧**：补齐 Zod schema 与 service runtime contract
3. **Sales 侧**：只修金额 metadata 的直接展示细节

本轮不做：

1. 不在未找到真实状态迁移违规前，先对 asset-service façade 做形式主义拆改
2. 不把整个 Engineering DTO 体系一次性全部切到 Zod
3. 不把 Sales detail 扩成整页视觉重构

#### 1.6 当前阶段结论

第十四轮当前已经明确：BOM service 的 Zod 契约缺口是实锤问题，Sales detail 金额 metadata 的数据出口也已定位；资产侧目前尚未在 façade 层发现直接违规，但不能因此提前判定安全，下一阶段必须继续沿真实状态迁移命令入口向下排查，确保不会把资产状态改变静默降格为普通字段覆盖。

### 1. audit：第十三轮审计修复（Purchase TDO Intent + Engineering 公共出口边界）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十三轮审计有两个关注点：

1. 采购事务中的“确认收货 / 支付申请”是否仍绕过 TDO intent 协议
2. `engineering/index.tsx` 是否被当作公共 barrel，泄露 internal hooks

本轮排查目标，是把“真实链路缺口”和“文件定位误判”区分清楚，不做想象式整改。

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
   - 本身只处理采购单 create / update 保存
   - 并未直接承载“确认收货 / 支付申请”动作

2. 采购模块真实风险在于事务协议分叉：
   - 普通采购单保存已经通过 `purchase-transaction-service.ts` 走 `intent`
   - `confirmPurchaseReceipt(...)` 仍直接 POST 到 `/purchase/orders/:id/confirm-receipt`
   - 其 `ConfirmPurchaseReceiptPayload` 当前没有显式 `intent`

3. `src/features/engineering/index.tsx`
   - 当前不是公共 barrel 导出文件
   - 它是 Engineering 页面组件实现
   - 未发现其导出 `useProductFormDerive` 等 internal hooks

#### 1.3 问题本质

这轮的真实问题不是“engineering 公共出口已经泄露”，而是：

1. **Purchase transaction intent drift**：普通保存已是 TDO/intent 协议，但“确认收货”仍是独立直接命令接口
2. **Engineering export leak 当前更接近误报**：没有发现公共入口泄露 internal hook 的事实证据

#### 1.4 推荐方案

##### 1.4.1 Purchase

本轮建议必做：

1. 为采购“确认收货”链路补显式 `intent`
2. 将其收口到与普通保存一致的 TDO/transaction 语义层
3. 如同时存在“支付申请”入口，按同样协议一并对齐

##### 1.4.2 Engineering

本轮建议：

1. 明确记录当前未发现公共出口泄露 internal hooks
2. 不做无效代码改造
3. 后续新增 barrel 公共入口时，继续限制只暴露 facade / component / contract 级导出

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：采购确认收货 intent/TDO 收口
2. **按需补充**：排查并对齐支付申请同类入口

本轮不做：

1. 不对并不存在的 engineering export leak 做形式主义清理
2. 不把整条 purchase 事务体系一次性重构为全新协议层

#### 1.6 当前阶段结论

第十三轮的真实修复重点在采购事务 intent 对齐：普通采购单保存已经具备 TDO intent，而“确认收货”仍停留在直接命令接口，容易让审计语义分叉。Engineering 侧本轮没有发现公共出口泄露 internal hooks，因此只应记录结论并继续守边界，而不是做虚假整改。

### 1. audit：第十一轮审计修复（Change Orders 后端权威边界 + Empty Array Masking + Assets 查询掩盖）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十一轮审计最初包含三类怀疑：

1. `change-orders.tsx` 是否仍在前端生成 `createdAt`
2. `change-orders.tsx` 是否通过空数组兜底掩盖查询失败
3. `use-assets.ts` 是否在前端承担逾期判断、维护周期预警等后端权威逻辑

本轮排查目标是区分：

1. **真实的 authority breach / masking**
2. **并不存在的逻辑泄漏猜测**

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/tabs/change-orders.tsx`
   - 存在 `createdAt: order?.createdAt || new Date().toISOString()`
   - 这属于明确的后端权威越界

2. 同文件中还存在：
   - `const changeOrders = changeOrdersQuery.data ?? EMPTY_CHANGE_ORDERS`
   - 当查询失败或数据缺失时，会把失败语义压扁成空列表

3. `src/features/equipment-tooling/hooks/use-assets.ts`
   - 当前未发现 overdue 判定、维护周期预警、寿命阈值判断等前端业务逻辑
   - 因此“资产逻辑泄漏”这条当前更接近排除误报

4. 但 `use-assets.ts` 中存在同类 fail-loudly 不一致：
   - `molds: moldsQuery.data || []`
   - `furnaces: furnacesQuery.data || []`
   - `loans: loansQuery.data || []`

#### 1.3 问题本质

这轮真实问题不是“资产预警公式泄漏”，而是两类更明确的边界问题：

1. **Change Orders authority breach**：前端在生成具法律/审计意义的 `createdAt`
2. **Empty Array Masking**：前端把查询失败/缺失压成空集合语义

同时，`use-assets.ts` 提醒我们：即便没有逻辑泄漏，也可能有 fail-loudly 不一致，需要最小纳入治理。

#### 1.4 推荐方案

##### 1.4.1 Change Orders

本轮建议必做：

1. 去掉 `createdAt` 的前端 `new Date().toISOString()` 兜底
2. 收口 `changeOrdersQuery.data ?? EMPTY_CHANGE_ORDERS`
3. 让查询完成但数据缺失的情形显式失败，而不是静默显示空列表

##### 1.4.2 Assets

本轮建议：

1. 记录明确结论：当前未发现逾期判断/维保预警逻辑泄漏
2. 不做虚构整改
3. 若本轮允许顺手对齐，可最小收口 `use-assets.ts` 的 query 数据 fallback，使其与 fail-loudly 策略一致

#### 1.5 第一轮实施边界

本轮建议：

1. **必做**：修 `change-orders.tsx`
2. **可选最小增强**：收口 `use-assets.ts` 的 `query.data || []`

本轮不做：

1. 不虚构并不存在的资产预警公式整改
2. 不顺手重构整个 Change Orders service / schema 体系

#### 1.6 当前阶段结论

第十一轮的真实修复重点在 `change-orders.tsx`：一是去掉 `createdAt` 的前端权威越界，二是收口空数组兜底。`use-assets.ts` 当前没有发现前端预警逻辑泄漏，但存在与 fail-loudly 不一致的 query fallback，可在不扩大范围的前提下作为同轮最小增强项处理。

### 1. audit：第十轮审计修复（BOM 拓扑权威边界 + Asset 状态机语义事务 + MaterialMgmt 静默 fallback）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第十轮审计原本有三个关注点：

1. BOM 的多级用量汇总与环形依赖检查是否仍留在前端
2. `AssetService` 是否暴露了直接字段式状态迁移接口
3. `use-material-mgmt-data.ts` 中是否仍存在 `|| []` 这类静默掩盖

本轮排查的重点，是把“真实缺口”和“误报风险”区分开，不做想象式整改。

#### 1.2 当前排查结论

当前已经确认：

1. `src/features/engineering/services/bom-service.ts`
   - 当前主要职责是 API 调用与输入规范化
   - 未发现前端递归拓扑展开、环检测、前端多级用量汇总等逻辑
   - 因此这一点当前更接近“排除误报”而非真实泄漏

2. `src/features/equipment-tooling/services/asset-service.ts`
   - 当前未发现 `updateStatus(id, 'MAINTENANCE')` 这类直接字段式状态迁移接口
   - 现有暴露更多是 facade 级语义入口：
     - `lendMold`
     - `borrowMold`
     - `returnMold`
     - `updateTelemetry`
   - 因此当前没有证据支持“状态机越权”已发生

3. `src/features/material-archive/hooks/use-material-mgmt-data.ts`
   - 仍存在 `const data = materialList?.items || []`
   - 当 query 已完成但 `materialList` 缺失时，该写法会把异常语义掩盖成空数组
   - 这是本轮最明确、最应该整改的真实缺口

#### 1.3 问题本质

这轮排查表明：

1. **BOM 与 Asset 目前更像“边界仍需守住”而不是“已经失守”**
2. **MaterialMgmt 则存在真实的 fail-loudly 缺口**

因此如果贸然把三点都按同等严重度做大改，会制造无效改动；更合理的做法是：

1. 对误报项给出明确“当前未发现”的审计结论
2. 对真实缺口做最小而明确的修复

#### 1.4 推荐方案

##### 1.4.1 BOM

本轮建议：

1. 记录明确结论：当前未发现前端 BOM 拓扑泄漏
2. 不做虚假整改
3. 如顺手增强，只考虑最小补齐 `getBOMById()` 的 runtime contract 一致性，不扩大成整轮 BOM 架构改造

##### 1.4.2 AssetService

本轮建议：

1. 记录明确结论：当前未发现字段式状态机越权接口
2. 不做代码改造
3. 后续继续禁止新增 `updateStatus(...)` 这类 API，保持语义事务入口策略

##### 1.4.3 MaterialMgmt

本轮建议：

1. 收口 `use-material-mgmt-data.ts` 中的 `|| []`
2. 对 query 已完成后数据缺失的情况做显式失败
3. 保持与此前 BOM / Leaves / Material 主链路一致的 Fail Loudly 策略

#### 1.5 第一轮实施边界

本轮建议只做：

1. 修复 `use-material-mgmt-data.ts` 的静默 fallback
2. 如必要，最小补 BOM 单点 contract 一致性

本轮不做：

1. 不虚构 BOM 前端拓扑泄漏并重构整条链路
2. 不对不存在的 Asset 状态机越权做形式主义改动
3. 不扩大到整个 Material archive 全面治理

#### 1.6 当前阶段结论

第十轮审计的真实结论是：**BOM 拓扑与 Asset 状态机当前没有证据表明已失守；真正需要动手修的是 MaterialMgmt 的静默 fallback。** 下一轮实施应聚焦真实缺口，而不是把“排除误报”误当成“必须整改”的代码任务。

### 1. leave-fix：确认 `/leaves/stats` 与 `/leaves/my` 在崩溃修复后是否仍需单独处理

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

此前请假模块的崩溃修复，核心关注点是：当当前登录用户无法映射到有效员工上下文时，`/leaves/my` 与 `/leaves/stats` 是否都需要分别打补丁，还是应该视为同一根因问题。

这次排查的目标不是再做一遍修复，而是明确：**共同根因是否已经统一收口，以及后续还要不要把这两个接口视为完全同一种故障。**

#### 1.2 当前排查结论

当前已经确认：

1. 前端页面层：
   - `leave-management.tsx` 同时请求：
     - `LeaveService.getMyLeaveRequests()` -> `/leaves/my`
     - `LeaveService.getLeaveStats()` -> `/leaves/stats`
   - 页面当前把两者的 loading 合并为一个 `isLoading`

2. 前端缓存层：
   - `personnelQueryKeys.leaves.my()` 与 `personnelQueryKeys.leaves.statsMy()` 是分开的 query key
   - 撤销请假后会同时失效两个 key，说明前端已经承认两者是相关但独立的数据面

3. 后端服务层：
   - `ListMyLeaveRequests(userID)` 与 `GetMyLeaveStats(userID)` 都先调用 `resolveCurrentEmployeeContext(userID)`
   - 因此“用户未绑定员工 / 员工不存在 / 未授权”这类故障，对两个接口属于**共同根因**

4. 但两个接口在数据执行阶段仍然不同：
   - `/leaves/my` 走明细列表查询
   - `/leaves/stats` 走聚合统计（count / sum）

#### 1.3 结论判断

因此当前可以明确下结论：

1. **根因修复层面**
   - 不需要再把 `/leaves/my` 与 `/leaves/stats` 当作两套独立的“员工上下文崩溃”问题分别修
   - 因为它们的共同崩溃前提已经由 `resolveCurrentEmployeeContext` 统一约束

2. **运行观测与降级层面**
   - 仍然不能把两者当作完全等价接口
   - 因为后续聚合统计 SQL、count/sum 逻辑、响应结构漂移等问题，仍可能只影响 `/leaves/stats`
   - 同理，明细列表结构问题也可能只影响 `/leaves/my`

#### 1.4 推荐方案

推荐把这两个接口视为：

1. **共享根因的一组相关接口**
2. **但保留独立失败语义的数据面**

也就是说：

1. 共同根因继续收口在后端：
   - `resolveCurrentEmployeeContext`
   - `writeLeaveServiceError`
2. 页面体验上不要把两者彻底混成一个状态黑盒

#### 1.5 若继续增强鲁棒性，推荐下一步方向

如果后续要继续做 `leave-management.tsx` 的健壮性增强，建议优先：

1. 把“列表区”和“统计卡片区”拆分为各自可见的错误状态
2. 避免当前仅通过合并 `isLoading` 掩盖单接口退化
3. 当 `/leaves/stats` 失败但 `/leaves/my` 成功时，页面应仍能展示请假记录，只让统计卡片降级
4. 当 `/leaves/my` 失败但 `/leaves/stats` 成功时，页面也应给出对应区域的独立错误提示

#### 1.6 当前阶段结论

`/leaves/my` 与 `/leaves/stats` **在根因修复上不需要继续单独打一遍同类补丁**，因为它们共享同一个员工上下文前提；但**在后续观测、错误语义和降级体验上，仍建议保留单独处理意识**，因为明细查询和聚合统计的失败模式并不相同。

### 1. audit：第八轮审计修复（Mold Dialog 标题 italic + 健康度预览公式边界 + Personnel 展示逻辑碎片化）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第八轮审计聚焦在 UI 规范与“预览公式边界”两类问题：

1. `mold-action-dialog.tsx` 未完全遵守 UDS 1.0 标题规范
2. Mold 健康度预览虽然已有 UI-PREVIEW 注释，但公式仍直接内联在组件中
3. Personnel 列定义虽然未出现严重逻辑堆叠，但工龄展示依旧依赖前端推导，需要确认其边界表达是否足够清晰

#### 1.2 当前排查结论

当前已经确认：

1. `mold-action-dialog.tsx` 中：
   - `DialogTitle` 当前类名为 `text-lg sm:text-xl font-black tracking-tight uppercase`
   - 确实缺少 `italic`

2. 同文件中：
   - `healthPercent` 通过 `((watchedMax - watchedCurrent) / watchedMax) * 100` 直接在组件内计算
   - 虽有 `[UI-PREVIEW-INDICATOR]` 注释，但组件仍然掌握了具体公式

3. `employee-columns.tsx` 中：
   - 未发现薪资脱敏逻辑泄露
   - 工龄展示通过 `calculatePersonnelWorkYears(joinedDate)` 获得
   - 该函数位于 `personnel-archive-columns.ts`
   - 并已标注 `[UI-PREVIEW-VALUE]` / `[BACKEND-AUTHORITY]`

#### 1.3 问题本质

这轮问题的本质不是“少一个样式类”这么简单，而是：

1. **UI 规范未被彻底执行**：标题 italic 漏配说明 UDS 约束仍可能在局部漂移
2. **公式边界仍在组件层**：即使声明为预览，组件内联公式仍容易和后端权威口径分叉
3. **展示逻辑边界仍需显式表达**：Personnel 侧当前没有严重泄漏，但工龄推导属于高风险的“看似 harmless、实则可能漂移”的前端计算

#### 1.4 推荐方案（Mold Dialog 标题 italic）

建议直接修正 `mold-action-dialog.tsx` 的 `DialogTitle` 类名，补齐 `italic`。

这是一个低风险、应立即对齐的 UDS 1.0 规范项。

#### 1.5 推荐方案（健康度预览公式边界）

建议把 Mold 健康度预览从“组件内联公式”提升为“service/preview 边界”：

1. 优先候选：`AssetService.previewHealthScore(current, max)`
2. 如果当前后端尚未提供 preview API，第一轮也应至少把公式收口到 service/helper 边界，而不是继续留在组件内

这样做的价值在于：

1. 日后后端若引入温度系数、压力衰减、维护事件权重等规则，变更点更集中
2. 组件不再直接掌握“看似业务、实则可演化”的公式

#### 1.6 推荐方案（Personnel 工龄展示边界）

当前未发现薪资脱敏问题，因此本轮不应虚构范围扩大。

建议：

1. 保持工龄显示逻辑不再散落在列定义中
2. 继续强调其 **UI preview only** 角色
3. 若进入实施，优先评估是否需要把该展示口径进一步上提到 Personnel service / formatter 边界，而不是留在 columns 依赖的 config 函数中

#### 1.7 第一轮实施边界

本轮建议只做：

1. 修正 Mold Dialog 标题 italic
2. 收口 Mold 健康度预览公式边界
3. 最小复核 Personnel 工龄展示边界表达

本轮不做：

1. 不虚构或新增不存在的薪资脱敏需求
2. 不改后端健康度协议，除非已有可复用 preview 入口
3. 不重构整套 Personnel 列体系

#### 1.8 风险与控制策略

1. **把公式从组件搬到 helper 但仍未真正权威化的风险**
   - 仅“换个文件放公式”并不能完全解决与后端漂移的问题。
   - 控制策略：第一轮至少把公式从组件内联中移出；若已有 service 入口则优先接 service。

2. **为不存在问题扩大整改范围的风险**
   - Personnel 当前没看到薪资脱敏，不应凭审计想象扩大改动。
   - 控制策略：只处理已经证实存在的工龄展示边界问题。

3. **局部 UDS 修正未形成复用约束的风险**
   - 单独补 `italic` 容易再次遗漏。
   - 控制策略：本轮先最小修正；后续可考虑让这类 Dialog Title 复用统一 shell styles。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 修正 `mold-action-dialog.tsx` 标题类名
2. 评估并收口健康度预览到 service/helper 边界
3. 最小复核 `employee-columns.tsx` 与 `personnel-archive-columns.ts` 的工龄展示边界
4. 执行定向 `eslint` / `tsc`
5. 更新 `walkthrough.md`

#### 1.10 当前阶段结论

第八轮审计的问题都属于“局部实现仍未完全服从统一边界”的表现：一是 UDS 标题规范存在漏配，二是 Mold 健康度公式仍停留在组件层，三是 Personnel 工龄虽然已抽离，但其 UI-preview 性质仍需继续收口和明确。下一轮应优先做**样式规范补齐 + 预览公式脱组件 + 工龄展示边界最小收口**。

### 1. audit：第七轮审计修复（订单日期权威越界 + MaterialMaintenanceService DTO Zod 真空 + SalesOrder 校验职责边界）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第七轮审计聚焦到 Trading / Material 两条边界问题：

1. Sales Order 默认 `orderDate` 仍由前端直接生成
2. `validateSalesOrder` 的职责边界没有被显式限制，存在未来业务规则继续向前端泄漏的风险
3. `MaterialMaintenanceService` 主写链路缺少显式 runtime contract

这三项问题都指向同一个原则：**前端不应替后端生成权威业务字段，也不应承载最终业务裁决；service 边界必须对 DTO 契约负责。**

#### 1.2 当前排查结论

当前已经确认：

1. Sales Order 默认日期前端生成至少存在 3 个注入点：
   - `use-sales-order-form.ts` 的 `DEFAULT_ORDER.orderDate`
   - `use-sales-order-init.ts` 的 create 初始化分支
   - `trading/data/schema.ts` 中 `EMPTY_SALES_ORDER_LINE.orderDate`

2. 当前写法均为：
   - `new Date().toISOString().split('T')[0]`

3. `validateSalesOrder` 当前主要仍是 UI 完整性校验：
   - 状态锁定
   - customer / deliveryDate 必填
   - lines 非空
   - 行项目 `productModel / qty` 基本完整性

4. `MaterialMaintenanceService` 当前情况：
   - `saveMaterial / patchMaterial` 只做了 `ensureObjectResponse`
   - `saveMaterials` 对 bulk sync 请求未做显式 runtime parsing
   - `material-api-dto.ts` 仍是 TypeScript interface，不是 Zod contract

#### 1.3 问题本质

这轮问题的本质不是“前端日期格式不优雅”或“某个 service 少一层 parse”，而是：

1. **权威字段越界**：前端在模拟服务端业务时间
2. **裁决边界不清**：前端 validator 可能继续变成业务规则容器
3. **契约边界缺口**：Material 主写链路还没有做到 request/response runtime validation 前移

其风险包括：

1. 跨时区或客户端系统时间异常时，订单日期会漂移
2. 未来如果把物料配伍、价格波动等规则继续塞进 `validateSalesOrder`，前端会形成“伪业务引擎”
3. Material 接口结构漂移时，主写链路仍可能以弱约束方式吞掉错误

#### 1.4 推荐方案（Sales Order 默认日期）

建议收口 Sales Order 默认日期来源：

1. 前端不再用 `new Date().toISOString().split('T')[0]` 生成默认 `orderDate`
2. create 场景默认值改为留空、或仅保留用户可编辑字段的空态
3. 最终业务日期由：
   - 用户手动选择并由后端校验
   - 或后端在保存/创建时按规则分配

第一轮建议优先：

1. 去除前端自动注入默认审计日期
2. 最小对齐相关默认值结构，避免 UI 因空值崩溃

#### 1.5 推荐方案（`validateSalesOrder` 职责边界）

建议把 `validateSalesOrder` 明确限定为 **UI-only precheck**：

1. 允许保留：
   - 必填项空值检查
   - 行项目最小完整性检查
   - 当前页面是否允许编辑
2. 不允许继续承载：
   - 价格波动上限
   - 物料配伍
   - 信用额度
   - 任何必须由后端强制执行的业务裁决

第一轮不必把它重写成复杂框架，但要在命名/注释/调用边界上显式表达其 UI-only 角色。

#### 1.6 推荐方案（MaterialMaintenanceService DTO Zod 真空）

建议为 Material 主写链路补齐 runtime contract：

1. 为 `MaterialApiDTO / SaveMaterialApiDTO / BulkSyncMaterialsApiDTO` 建立 Zod schema
2. `MaterialMaintenanceService` 在 request/response 边界使用 parser
3. 让 adapter 层消费已解析的稳定 DTO，而不是承担“半校验半映射”的角色

优先覆盖：

1. `saveMaterial`
2. `patchMaterial`
3. `saveMaterials`

#### 1.7 第一轮实施边界

本轮建议只做：

1. 收口 Sales Order 前端默认 `orderDate` 注入点
2. 明确 `validateSalesOrder` 的 UI-only 边界
3. 为 MaterialMaintenanceService 主写链路补 runtime contract

本轮不做：

1. 不改后端订单日期协议
2. 不新增服务端业务规则镜像到前端
3. 不一次性 Zod 化 Material 全部 list/options/query 读链路
4. 不顺手重构整个 Trading 表单架构

#### 1.8 风险与控制策略

1. **去掉前端默认日期后 UI 空值兼容的风险**
   - 某些日期输入组件或展示逻辑可能默认假定 `orderDate` 总存在。
   - 控制策略：第一轮只去掉自动注入，同时检查 create 初始化与 line 默认值是否能接受空字符串。

2. **把 validator 边界说清但没有真正防漏的风险**
   - 如果只保留原函数名，后续仍可能有人继续把业务规则塞进去。
   - 控制策略：在注释、命名或导出边界上明确 UI-only 角色。

3. **Material schema 过宽导致治理价值不足的风险**
   - 如果 schema 全写成宽松类型，就无法真正防漂移。
   - 控制策略：优先锁定主写链路的顶层字段与控制字段，渐进收紧。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 清理 Sales Order 默认 `orderDate` 的前端注入点
2. 最小对齐 create 初始化和 line 默认值
3. 明确 `validateSalesOrder` 的 UI-only 边界
4. 为 Material DTO 新增 contract schema / parser
5. 改造 `MaterialMaintenanceService` 主写链路
6. 执行定向 `eslint` / `tsc`
7. 更新 `walkthrough.md`

#### 1.10 当前阶段结论

第七轮审计的三个问题都属于边界治理问题：**前端越过了应有权威边界，或没有在 service 边界显式承担 DTO 契约责任。** 因此下一轮应优先做“默认日期去前端权威化 + validator UI-only 边界显式化 + Material 主写链路 Zod contract 前移”，而不是分散做零碎补丁。

### 1. audit：第六轮审计修复（发号异常静默 + Engineering Spec DTO Zod 真空）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

第六轮审计暴露了两个同类问题：

1. **发号异常静默**：失败被记录但没有被用户感知
2. **DTO 运行时校验真空**：Engineering Spec 主读写链路仍大量依赖静态类型与 `any`，缺少 service 边界上的运行时契约

这两个问题虽然表面分属不同模块，但本质上都属于：**边界失败没有在最早可控处被显式表达**。

#### 1.2 当前排查结论

当前已经确认：

1. `use-product-form-derive.ts` 中：
   - `deriveNextCode()` 调用 `ProductCoreService.getNextCode()`
   - catch 分支只执行 `logger.error('Failed to derive next product code from authority engine', error)`
   - 没有 toast
   - 没有返回错误状态
   - 没有把失败抬升到 `useProductForm` / dialog 层

2. `engineering-spec-service.ts` 中：
   - `getSpecs / getSpec / saveSpec / patchSpec / syncSpecs` 基本都是裸 `apiFetch<T>`
   - `EngineeringSpec` 仅是 TypeScript interface，不是运行时 schema
   - `specData / drillingData / labelingData / ...` 仍是 `any`

3. `SpecsService` 中：
   - `getSpecs()` 先把远端数据映射到 `TechnicalSpec`，再用 `technicalSpecSchema.safeParse(...).success` 做过滤
   - 过滤失败项目会被静默丢弃
   - 发生异常时直接 `console.error + return []`
   - `saveSpec / patchSpec` 对请求/响应边界没有完整运行时约束

#### 1.3 问题本质

这轮问题的本质不是“缺一个 toast”或“少写一个 schema”，而是：

1. **失败没有在边界处 Fail Loudly**
2. **契约没有在 service / adapter 边界被显式验证**

其风险包括：

1. 发号器故障时，用户仍继续填写，错误延迟到保存阶段才暴露
2. 远端返回结构漂移时，前端会以“静默过滤 / 返回空数组 / any 透传”的形式吞掉问题
3. 审计上看不到明确失败点，排障成本高

#### 1.4 推荐方案（发号异常静默）

建议把产品发号失败从“仅日志”改为“**日志 + 用户可见状态 + UI 提示**”。

推荐方向：

1. `use-product-form-derive.ts` 暴露：
   - `nextCodeDeriveError`（或等价命名）
2. `use-product-form.ts` 继续向上转发该状态
3. `product-action-dialog.tsx` 在表单内显示发号异常提示

第一轮建议：

1. create 场景发号失败时给出明确中文提示
2. 仍允许用户看到当前表单，但不能再是“无感失败”
3. 是否阻断提交，以“仅在编码仍为空/默认值时阻断”为优先候选策略

#### 1.5 推荐方案（Engineering Spec DTO Zod 真空）

建议为 Engineering Spec 主链路补齐显式 runtime contract：

1. 为远端 Engineering Spec DTO 定义 Zod schema
2. 为 `getSpecs / getSpec / saveSpec / patchSpec` 建立 parser
3. 在 service / adapter 边界先解析，再把稳定结果交给 `SpecsService`

推荐落点：

1. `src/features/engineering/services/engineering-spec-service.ts`
2. 若 schema 较多，拆到独立 data/adapter 文件，遵循你之前“尽量解耦拆文件”的偏好

#### 1.6 第一轮实施边界

本轮建议只做：

1. 产品表单发号失败可见化
2. Engineering Spec 主读写链路 runtime parsing：
   - `getSpecs`
   - `getSpec`
   - `saveSpec`
   - `patchSpec`

本轮不做：

1. 不扩到所有其它发号入口
2. 不改后端接口字段
3. 不顺手重构整个 specs domain 的所有 `any`
4. 不先做 `syncSpecs` 的全量 schema 细化，除非主链路实现时证明它是阻塞点

#### 1.7 风险与控制策略

1. **发号失败提示过强导致误阻断的风险**
   - 如果后端只是瞬时失败，完全阻断创建可能影响录入连续性。
   - 控制策略：第一轮优先“显式提示 + 条件阻断空/默认编码提交”，而不是一刀切禁止。

2. **Engineering Spec schema 过宽仍无法发现漂移的风险**
   - 若直接把太多字段写成 `z.any()`，runtime contract 形式上存在但价值不足。
   - 控制策略：先锁定顶层必需字段与主链路控制字段，渐进收紧。

3. **静默过滤改为显式失败后引发现有脏数据暴露的风险**
   - 某些历史坏数据可能此前被过滤掉，现在会显式报错。
   - 控制策略：在读取链路提供更明确的错误上下文，必要时区分“单条坏数据”与“整体接口失效”。

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 改造 `use-product-form-derive.ts`，把发号失败状态显式化
2. 向 `use-product-form.ts` / dialog 传递并展示该状态
3. 为 Engineering Spec DTO 定义 runtime schema / parser
4. 改造 `engineering-spec-service.ts` 的主读写边界
5. 最小对齐 `SpecsService`，移除“过滤后直接吞掉”的口径
6. 执行定向 `eslint` / `tsc`
7. 更新 `walkthrough.md`

#### 1.9 当前阶段结论

第六轮审计的两个问题都指向同一个架构原则：**边界失败必须尽早、显式、可见地暴露出来**。因此下一轮不应只补一个 toast，也不应只加几行 `safeParse(...).success`，而应同时把：

1. 产品发号失败从静默日志提升为用户可见状态
2. Engineering Spec 的主 DTO 契约前移到 service / adapter 运行时边界

### 1. architecture：ProductCommand 收口 selectedVariants 交互命令

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

目前产品表单已经完成两段命令收口：

1. `composeInitialState()` 负责初始化
2. `composeSubmitPayload()` 负责编排提交前 payload

但 `selectedVariants` 在**用户交互变更**这一段，仍然主要由 hook 直接操作数组。这意味着同一个领域对象已经有：

1. 初始化命令
2. 交互变更散落在 hook
3. 提交前组合命令

命令边界还没有闭环。

#### 1.2 当前排查结论

当前已经确认：

1. `handleVariantToggle` 仍直接写在 `use-product-form-submit.ts` 中，职责包括：
   - 勾选时按当前表单 `weight` 生成新项
   - 取消时按 `level` 删除
   - 默认将新增项追加到末尾

2. `updateVariantWeight` 仍直接写在 `use-product-form-submit.ts` 中，职责包括：
   - 按 `level` 匹配已有项
   - 仅更新该项 `weight`
   - 若未命中则静默不变

3. `variant-matrix-section.tsx` 当前读取方式说明展示层默认依赖：
   - `level` 唯一
   - `selectedVariants` 可按 `find/some` 被稳定检索

#### 1.3 问题本质

当前问题不是代码行数，而是**selectedVariants 的状态迁移规则仍不是单一来源**。

其风险在于：

1. 初始态、交互态、提交态分别由不同层解释
2. 若后续要补去重、顺序、默认重量策略，容易继续散落在 hook 里
3. hook 既负责状态迁移，又负责提交编排，职责再次变宽

#### 1.4 推荐方案

建议在 `ProductCommand` 增加两类交互命令入口，例如：

1. `ProductCommand.toggleVariantSelection()`
2. `ProductCommand.updateVariantSelectionWeight()`

推荐输入：

1. 当前 `selectedVariants`
2. `level`
3. `checked` / `weight`
4. 必需时传入 `defaultWeight`

推荐输出：

1. 新的 `selectedVariants`

#### 1.5 建议迁入命令层的职责

第一轮建议只迁入以下内容：

1. 勾选时新 variant 的创建策略
2. 取消勾选时按 `level` 删除的策略
3. 按 `level` 更新重量的策略
4. `level` 唯一与顺序稳定的约束

#### 1.6 第一轮明确不迁入的职责

本轮不建议把以下内容一起改动：

1. `variant-matrix-section.tsx` 的 UI 结构
2. `useProductForm` 的状态存储方式
3. reducer / context / 外部状态库
4. `composeSubmitPayload()` 的输入输出结构

#### 1.7 推荐落地方式

建议：

1. `ProductCommand` 继续作为领域命令入口
2. hook 只负责：
   - 从 form 读取当前默认重量
   - 调用命令层生成下一状态
   - 通过 `setSelectedVariants` 分发结果

换句话说，这一步是把 hook 从“手写数组变更器”继续收敛成“状态分发器”。

#### 1.8 风险与控制策略

1. **过度抽象简单数组操作的风险**
   - 如果只是机械搬代码，可能徒增一层间接性。
   - 控制策略：只在命令层显式表达真正的领域规则（默认重量、唯一性、顺序），不做空泛包装。

2. **与初始化/提交命令边界重叠的风险**
   - 若状态迁移接口命名或输入设计不清，可能和已有命令职责重叠。
   - 控制策略：明确区分三段职责：`composeInitialState` / interaction transitions / `composeSubmitPayload`。

3. **未来 UI 交互变化导致命令层过细的风险**
   - 如果后续 UI 改成表格或批量编辑，命令命名过于贴近当前组件会失去复用性。
   - 控制策略：命令命名以领域状态迁移为中心，而不是以组件事件名为中心。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 扩展 `ProductCommand`，新增 variant 交互命令
2. 让其统一返回下一份 `selectedVariants`
3. 改造 `use-product-form-submit.ts` 调用命令层
4. 保持组件 props 与 UI 结构不变
5. 执行定向 `eslint` / `tsc`
6. 更新 `walkthrough.md`

#### 1.10 当前阶段结论

如果你选择继续做方案A，那么最稳的推进方式不是直接把 `handleVariantToggle / updateVariantWeight` 原样搬家，而是把它们提升为 `selectedVariants` 的**状态迁移命令**。这样 `ProductCommand` 才能真正覆盖产品表单的“初始化、交互、提交”三段核心规则。

### 1. architecture：ProductCommand 收口提交前组合

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

上一轮已经把 `selectedVariants` 的初始化规则收口到了 `ProductCommand.composeInitialState()`。但产品表单在**提交前组合**这一步，仍然存在命令职责分散：

1. hook 决定提交模式
2. utils 负责单 variant / 批量 variant 的产品派生
3. hook 再继续负责提交成功分支文案判断

这意味着初始化阶段已经有统一命令入口，但提交前组合阶段还没有单一来源。

#### 1.2 当前排查结论

当前已经确认：

1. `use-product-form-submit.ts` 仍负责：
   - 根据 `selectedVariants.length` 判定提交分支
   - 调用 `buildBatchProducts / buildSingleVariantProduct`
   - 决定成功 toast 分支

2. `product-form-utils.ts` 仍负责：
   - `deriveSku`
   - `buildBatchProducts`
   - `buildSingleVariantProduct`

3. `ProductCommand` 当前只覆盖：
   - `composeInitialState()`

#### 1.3 问题本质

当前问题不是函数放在哪里不好看，而是**产品表单的命令边界被切成了两段**：

1. 初始化有命令层
2. 提交前组合没有命令层

这会导致：

1. `selectedVariants` 的语义在 init 阶段和 submit 阶段分别由不同层解释
2. variant 数量分支、SKU 派生、属性回写这些命令式组合规则仍散落在 hook + utils
3. 后续若新增 variant 提交模式或修改派生策略，仍需跨多层同步改动

#### 1.4 推荐方案

建议在 `ProductCommand` 继续补一个提交前组合入口，例如：

1. `ProductCommand.composeSubmitPayload()`

推荐输入：

1. `values`
2. `selectedVariants`
3. `typeCode`
4. `isEdit`

推荐输出：

1. `mode`
   - `single`
   - `variant`
   - `batch`
   - `edit`
2. `productsToSave`

#### 1.5 建议迁入命令层的职责

第一轮建议只迁入以下内容：

1. 基于 `selectedVariants.length` 的提交模式判定
2. 单 variant 的产品派生
3. 批量 variant 的产品派生
4. `mode` 与 `productsToSave` 的统一返回结构

#### 1.6 第一轮明确不迁入的职责

为了控制范围，本轮不建议把以下职责一起卷入 `ProductCommand`：

1. `ProductCoreService.getProducts()`
2. `ensureSkuUnique()`
3. toast 文案选择与展示
4. 真正的 `onSubmit` 调用

原因是这些更偏向：

1. 编排层
2. 校验层
3. 交互反馈层

不宜和产品派生命令一次性揉在一起。

#### 1.7 推荐落地方式

建议：

1. 保留 `deriveSku` 等纯派生函数作为底层工具
2. 由 `ProductCommand.composeSubmitPayload()` 统一调用这些工具
3. `use-product-form-submit.ts` 改为只负责：
   - 获取远程产品列表
   - 做 SKU 唯一性校验
   - 调用 `onSubmit`
   - 展示 toast

换句话说，把 hook 从“命令 + 编排混合体”收敛成“编排器”。

#### 1.8 风险与控制策略

1. **一次性把校验和交互也卷入命令层的风险**
   - 会把简单的 payload compose 变成大而杂的 submit framework。
   - 控制策略：第一轮只收口 compose，不动校验/提示。

2. **edit 场景语义混淆的风险**
   - 若 edit 仍带单个 variant，`single` 与 `edit` 的文案/语义可能混淆。
   - 控制策略：命令层返回显式 `mode`，由 hook 再映射文案。

3. **工具函数职责重叠的风险**
   - 如果只新增命令层但不调整原 utils 角色，可能出现双入口。
   - 控制策略：第一轮让 utils 退回到底层纯派生，命令层负责面向表单业务的统一入口。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 扩展 `ProductCommand`，新增 `composeSubmitPayload()`
2. 让其统一返回 `mode + productsToSave`
3. 改造 `use-product-form-submit.ts` 消费统一结果
4. 保留 `ensureSkuUnique` 与 toast 在 hook 层
5. 执行定向 `eslint` / `tsc`
6. 更新 `walkthrough.md`

#### 1.10 当前阶段结论

既然初始化已经由 `ProductCommand.composeInitialState()` 统一，下一步最自然的演进就是把**提交前组合**也收口到同一个命令层。但为了避免范围失控，第一轮只应收口 `mode + productsToSave` 的生成，不要把远程读取、唯一性校验和交互提示一并卷进去。

### 1. architecture：selectedVariants 初始化规则收口

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前产品表单中，`selectedVariants` 决定的是多版本产品的初始化与提交口径，尤其关联：

1. `Version Level`
2. `Weight`
3. create / edit 两类打开场景下的默认形态

但目前这部分初始化逻辑并没有单一来源，而是散落在 `use-product-form-init.ts` 的多个 `useEffect` 分支中。

#### 1.2 当前排查结论

当前已经确认：

1. `selectedVariants` 状态定义在：
   - `src/features/engineering/hooks/use-product-form.ts`

2. 主要初始化分支位于：
   - `src/features/engineering/hooks/use-product-form-init.ts`

3. 当前分散规则至少包括：
   - metadata 加载后，非编辑态且 `selectedVariants` 为空时，默认选中首个 `versionLevelOptions`
   - 编辑态打开时，从 `currentRow` 的 `versionLevel + weight` 重新回填
   - 弹窗关闭时再手动清空 `selectedVariants`

4. 当前已有的通用基础能力位于：
   - `src/features/engineering/utils/product-form-utils.ts`
   - `src/features/engineering/utils/product-attribute-utils.ts`

#### 1.3 问题本质

这不是单纯的 hooks 代码分散，而是**产品多版本核心初始化规则缺少统一命令入口**。其风险在于：

1. create / edit 初始态来源不一致
2. 默认首个版本的选择规则被埋在副作用里，不易复用与测试
3. 后续如果 `Version Level / Weight` 规则再变化，需要在多个 effect 中同步修改，容易漏改

#### 1.4 推荐方案

建议新增统一命令模块，职责形态可命名为：

1. `ProductCommand.composeInitialState()`

推荐职责：

1. 输入：
   - `isEdit`
   - `currentRow`
   - `versionLevelOptions`
   - 其它初始化必需上下文

2. 输出：
   - `formValues`
   - `selectedVariants`

3. 统一负责：
   - create 场景默认表单值
   - edit 场景表单 reset 值
   - create 场景默认 `selectedVariants`
   - edit 场景从 `currentRow` 推导 `selectedVariants`
   - 默认首个 `versionLevel` 的选取策略

#### 1.5 推荐落点

建议新增独立文件，而不是继续堆在 hooks 内部。这里我遵循你之前“能解耦尽量拆文件”的偏好。

推荐候选：

1. `src/features/engineering/commands/product-command.ts`

或若希望更贴近表单域：

1. `src/features/engineering/commands/product-form-command.ts`

#### 1.6 第一轮实施边界

本轮建议只收口初始化，不扩大范围：

1. 收口 `form default/reset values`
2. 收口 `selectedVariants initial state`
3. 调整 `use-product-form` / `use-product-form-init` 调用方式

本轮不做：

1. 不顺手重写 `buildBatchProducts`
2. 不改 `handleVariantToggle / updateVariantWeight`
3. 不改后端 DTO / 服务层

#### 1.7 风险与控制策略

1. **create 与 edit 初始态不兼容的风险**
   - 如果统一函数只适配一种场景，另一种场景可能回归。
   - 控制策略：统一函数显式区分 create / edit 输入条件。

2. **过早把提交逻辑也卷入的风险**
   - 若一次性把初始化与提交都改掉，影响面会扩大。
   - 控制策略：第一轮只收口 initial state，不动 submit path。

3. **默认版本选择策略变化引发业务感知变化的风险**
   - 当前 create 场景默认取首个版本选项，如果位置改变但策略变化，用户会感知到差异。
   - 控制策略：第一轮仅搬迁逻辑，不改变策略。

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 新增 ProductCommand（或等价命令模块）
2. 提供 `composeInitialState()`
3. 让 `use-product-form` / `use-product-form-init` 改为消费统一初始态结果
4. 保持现有默认首个版本选择策略不变
5. 执行定向 `eslint` / `tsc`
6. 更新 `walkthrough.md`

#### 1.9 当前阶段结论

`selectedVariants` 当前的问题不在于某一行条件判断，而在于**产品多版本初始化规则缺少单一来源**。最合适的修法不是继续在 `useEffect` 里叠补丁，而是引入 `ProductCommand.composeInitialState()` 一类的统一命令入口，把 create/edit 的表单初始态与 `selectedVariants` 初始态一起收口。

### 1. architecture：ChangeOrder 负向 handler 测试规划

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

`ChangeOrder` 当前已经完成：

1. 保存输入 DTO 收口
2. 响应 DTO / mapper 收口
3. `options=true` 最小字段集分层
4. 成功路径 handler 定向测试

下一步最值得补齐的是**失败路径护栏**，优先锁定 `SaveChangeOrderHandler` 的 validation 与 conflict 语义，避免后续演进时把它们回退成不稳定的 `500` 或模糊错误响应。

#### 1.2 本轮测试范围

本轮只聚焦：

1. `SaveChangeOrderHandler`

不扩展到：

1. `GetChangeOrdersHandler` 负向查询参数校验
2. `DeleteChangeOrderHandler` 冲突语义
3. 前端调用层

#### 1.3 推荐测试位置

建议继续复用：

1. `server/handlers/change_orders_test.go`

原因：

1. 同一文件已经覆盖成功路径与响应分层
2. 负向用例继续放在这里，便于集中表达 `ChangeOrder` handler contract

#### 1.4 核心测试目标

##### A. 缺少必填字段时返回 `400 validation`

建议覆盖：

1. `changeOrderNo` 为空
2. `title` 为空

断言：

1. 返回状态码为 `400`
2. 响应包含：
   - `change order number and title are required`

##### B. 非法 JSON / 绑定失败时返回 `400 validation`

建议覆盖：

1. 传入非法 JSON
2. 或构造无法绑定的 payload

断言：

1. 返回状态码为 `400`
2. 响应包含：
   - `invalid change order payload`

##### C. 版本冲突时返回 `409`

建议覆盖：

1. 先 seed 一条已有 `ChangeOrder`
2. 再以过期 `version` 调用 `SaveChangeOrderHandler`
3. 触发 `services.ErrChangeOrderVersionConflict`

断言：

1. 返回状态码为 `409`
2. 维持当前统一 conflict 响应分支
3. 不回退成泛化 `500`

#### 1.5 实施方式建议

1. **validation 400**
   - 直接构造最小请求体
   - 刻意置空 `changeOrderNo` 或 `title`

2. **invalid payload 400**
   - 直接发送不合法 JSON 字符串

3. **version conflict 409**
   - 复用当前测试文件里的 seed 基建
   - 使用存在记录的真实 `id`
   - 提交明显过期的 `version`

#### 1.6 风险与控制策略

1. **测试过度依赖错误文案细节的风险**
   - 若把完整错误串全部写死，后续轻微调整文案会导致不必要失败。
   - 控制策略：只锁关键子串与状态码。

2. **版本冲突构造不稳定的风险**
   - 若测试没有正确 seed 当前 version，可能误测成成功更新。
   - 控制策略：明确 seed 一个已存在版本，再提交过期 version。

3. **继续扩大范围的风险**
   - 若顺手补 delete/query 等其它负向测试，会让本轮范围失控。
   - 控制策略：本轮仅补 `SaveChangeOrderHandler` 三类负向断言。

#### 1.7 明确不动范围

本轮不做：

1. 不改 handler 逻辑
2. 不改服务层版本冲突实现
3. 不改响应 DTO
4. 不扩到其它 engineering 模块

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 在 `server/handlers/change_orders_test.go` 追加 validation 400 测试
2. 追加 invalid payload 400 测试
3. 追加 version conflict 409 测试
4. 执行 `go test ./handlers -run "ChangeOrder"`
5. 更新 `walkthrough.md`

#### 1.9 当前阶段结论

当前 `ChangeOrder` 的成功路径与响应分层已经有了测试护栏，下一步最划算的工作是把 `SaveChangeOrderHandler` 的失败路径也锁住，特别是 `400 validation` 与 `409 version conflict` 两类高价值语义。这样可以让这条链路从“成功/响应有保障”进一步提升到“关键失败语义也有保障”。

### 1. architecture：ChangeOrder 响应分层定向测试规划

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

`ChangeOrder` 当前已经完成三步收口：

1. 保存输入 DTO 显式化
2. 通用响应 DTO / mapper 显式化
3. `options=true` 场景独立最小字段集 DTO

为了避免后续改动把这层边界再次模糊化，当前最有价值的下一步是补定向测试，把响应分层契约锁住。

#### 1.2 当前测试现状

当前排查结果显示：

1. `server/handlers` 下暂无 `ChangeOrder` 专项测试文件
2. `server/routes` 下也暂无对应 route 测试

因此本轮最合理的切入点是：

1. **先补 handler 层定向测试**

#### 1.3 推荐测试位置

建议新增：

1. `server/handlers/change_orders_test.go`

原因：

1. 这轮要验证的是**返回 JSON 契约分层**
2. handler 层最适合直接断言响应体字段是否存在/缺失
3. 成本低于 route 层全链路冒烟，且更聚焦

#### 1.4 核心测试目标

##### A. `options=true` 返回最小字段集

建议覆盖：

1. 调用 `GetChangeOrdersHandler`
2. 请求带上 `?options=true`
3. 断言响应 item 包含：
   - `id`
   - `changeOrderNo`
   - `title`
   - `changeType`
   - `productId`
   - `siteCode`
   - `isDefaultSite`
   - `revisionNo`
   - `effectiveFrom`
   - `effectiveTo`
   - `status`
   - `_v`
4. 断言响应 item **不包含**：
   - `product`
   - `description`
   - `createdAt`
   - `updatedAt`

##### B. 普通列表继续返回分页 + 较丰满 DTO

建议覆盖：

1. 调用 `GetChangeOrdersHandler`
2. 不带 `options=true`
3. 断言响应结构仍为：
   - `items`
   - `total`
   - `page`
   - `pageSize`
4. 断言 `items[0]` 仍可包含 list DTO 的较丰满字段，例如：
   - `description`
   - `createdAt`
   - `_v`

##### C. 保存成功仍返回 `ChangeOrderApiDTO`

建议覆盖：

1. 调用 `SaveChangeOrderHandler`
2. 传入最小合法保存请求
3. 断言响应仍保留当前兼容字段，例如：
   - `description`
   - `createdAt`
   - `_v`

#### 1.5 风险与控制策略

1. **测试写得过度依赖实现细节的风险**
   - 如果把所有字段和值都写死，后续小调整会导致测试过脆。
   - 控制策略：本轮只锁字段存在/缺失与核心结构，不锁无关细节。

2. **测试范围过大导致建桩复杂的风险**
   - 若一开始就上 route + DB 全链路，会拉高成本。
   - 控制策略：先在 handler 层构建最小可验证场景。

3. **遗漏 save/list 兼容出口的风险**
   - 只测 options 会让 list/save 未来仍有回归空间。
   - 控制策略：至少补一条 list 与一条 save 正向断言。

#### 1.6 明确不动范围

本轮不做：

1. 不改 `ChangeOrder` DTO 结构
2. 不改前端 schema 或调用逻辑
3. 不顺手扩到 `ProductAttributeCategory / ProductAttributeOption`

#### 1.7 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 新增 `server/handlers/change_orders_test.go`
2. 先补 `options=true` 最小字段集断言
3. 再补 list 分页结构兼容断言
4. 再补 save 成功响应兼容断言
5. 执行 `go test ./handlers -run "ChangeOrder"`
6. 更新 `walkthrough.md`

#### 1.8 当前阶段结论

当前 `ChangeOrder` 的契约治理已经有了比较清晰的形状，下一步最划算的工作不是继续扩大 DTO 拆分，而是**用 handler 定向测试把现有响应分层锁住**。这样能显著降低后续回归风险，也能为后面继续细化 detail DTO 提供更稳的护栏。

### 1. architecture：ChangeOrder 响应 DTO 细分评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

`ChangeOrder` 已经完成了两步基础收口：

1. 输入层不再直接围绕模型别名保存
2. 响应层已从模型直出切换到 `ChangeOrderApiDTO` / mapper 出口

下一步值得评估的是：是否需要继续把 `options` 与 `list/save` 的响应语义显式拆开。

#### 1.2 排查结果

本轮重点排查了：

1. `server/handlers/change_orders.go`
2. `server/handlers/change_order_api_dto.go`
3. `server/handlers/change_order_mapper.go`
4. `server/services/engineering_master_service.go`
5. `src/features/engineering/services/change-order-service.ts`
6. `src/features/engineering/tabs/change-orders.tsx`
7. `src/features/engineering/data/schema.ts`

#### 1.3 前端当前真实依赖

从前端 schema 与页面读取口径看，当前 `ChangeOrder` 的真实契约重心主要集中在：

1. `id`
2. `changeOrderNo`
3. `title`
4. `productId`
5. `status`
6. `description`
7. `createdAt`
8. `version / _v`
9. 以及来自 `masterDataControlSchema` 的：
   - `changeType`
   - `siteCode`
   - `revisionNo`
   - `effectiveFrom`
   - `effectiveTo`
   - `isDefaultSite`

同时确认到：

1. **当前前端并未真实依赖 `changeOrder.product` 嵌套对象**

#### 1.4 当前 options / list/save 差异的本质

当前三种返回场景中，真正的差异主要来自查询方式，而不是前端契约要求：

1. `options=true` 时不 preload `Product`
2. list / save 场景可能 preload `Product`

但由于前端 schema 并未声明 `product` 字段，因此：

1. `product` 更像**后端兼容透出字段**
2. 而不是当前前端必须依赖的正式字段

#### 1.5 推荐的 DTO 细分策略

当前最合适的细分方式不是一步拆成 options / list / detail 三套，而是：

1. **先拆 `options DTO`**
2. **list 与 save 继续共用现有 `ChangeOrderApiDTO`**

原因：

1. options 场景的最小字段集已经很清晰
2. list 与 save 当前字段语义仍高度一致
3. detail DTO 目前没有足够收益支持继续细分

#### 1.6 `ChangeOrderOptionsApiDTO` 最小字段集建议

建议 options DTO 只保留：

1. `id`
2. `changeOrderNo`
3. `title`
4. `status`
5. `changeType`
6. `productId`
7. `revisionNo`
8. `siteCode`
9. `isDefaultSite`
10. `effectiveFrom`
11. `effectiveTo`
12. `_v`

这里刻意**不包含**：

1. `product`
2. `description`
3. `createdAt`
4. `updatedAt`

因为这些字段对 options 语义不是必须项。

#### 1.7 `ChangeOrderApiDTO` 当前建议

对现有 `ChangeOrderApiDTO` 的建议是：

1. 继续作为 list / save 共用 DTO
2. 暂不再继续拆 detail DTO
3. `product` 仅保留在这个较丰满的 DTO 中

#### 1.8 推荐方案

##### A. 新增 `ChangeOrderOptionsApiDTO`

优先位置：

1. `server/handlers/change_order_api_dto.go`
2. `server/handlers/change_order_mapper.go`
3. `server/handlers/change_orders.go`

目标：

1. 为 `options=true` 建立显式最小字段集
2. 避免 options 场景继续共享过于丰满的 DTO

##### B. 保持 list/save 继续共用 `ChangeOrderApiDTO`

目标：

1. 不扩大到 detail DTO
2. 保持现有字段兼容
3. 继续允许 `product` 作为 list/save 的兼容透出字段

#### 1.9 风险与控制策略

1. **前端 options 调用兼容风险**
   - 若误删前端实际依赖字段，会影响下拉选择或回填。
   - 控制策略：options DTO 仅去除当前已确认未依赖字段。

2. **过度细分风险**
   - 若继续把 list/save/detail 全拆开，会让当前收益不足。
   - 控制策略：本轮仅拆 options DTO。

3. **后端 mapper 复杂度上涨风险**
   - DTO 数量增加后需要维护更多 mapper。
   - 控制策略：只新增一套 options mapper，保持最小增量。

#### 1.10 明确不动范围

本轮不做：

1. 不新增 `ChangeOrderDetailApiDTO`
2. 不调整前端 schema / 页面字段读取
3. 不触碰 `ProductAttributeCategory / ProductAttributeOption` 响应层

#### 1.11 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 为 `ChangeOrder` 新增 `ChangeOrderOptionsApiDTO`
2. 新增 options mapper
3. 让 `options=true` 分支返回最小字段集
4. 保持 list/save 继续走 `ChangeOrderApiDTO`
5. 执行定向 Go 校验并更新 `walkthrough.md`

#### 1.12 当前阶段结论

当前最合理的下一步不是继续把 `ChangeOrder` 全量拆成多套复杂 DTO，而是**只把 options 场景先显式瘦身**：让 `options` 走最小字段集，让 `list/save` 继续走现有较丰满 DTO。这样能继续提升契约清晰度，同时把范围和回归风险控制在很低水平。

### 1. architecture：engineering 次级候选响应 DTO / patch contract 评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在完成 engineering 次级候选的后端输入收口后，下一步自然的问题是：

1. `ChangeOrder` 是否还需要继续收口响应 DTO
2. `ChangeOrder` 是否需要单独拆 patch contract
3. `ProductAttributeCategory / ProductAttributeOption` 的响应层是否也需要同步治理

#### 1.2 排查结果

本轮重点排查了：

1. `server/handlers/change_orders.go`
2. `server/services/engineering_master_service.go`
3. `server/handlers/product_attribute_category.go`
4. `server/handlers/product_attribute_option.go`

#### 1.3 `ChangeOrder` 响应口径现状

当前 `ChangeOrder` 的返回口径有一个比较清晰但尚未显式化的特点：

1. list / options / save 均直接返回：
   - `models.ChangeOrder`

2. 但不同场景返回的“丰满度”其实不一致：
   - options 场景：不 preload `Product`
   - 列表场景：会 preload `Product`
   - save 场景：保存完成后也 preload `Product`

这意味着当前问题并不是字段名已经失控，而是：

1. **同一个模型被不同场景直接回传，但字段完整度依赖查询路径隐式决定**

#### 1.4 `ChangeOrder` patch / save 语义现状

当前 `ChangeOrder` 并没有像 Product / BOM 那样的独立 patch 合成路径：

1. 没有单独的 `PatchChangeOrder()`
2. 当前 `SaveChangeOrder()` 仍承担 create + update 的统一保存职责

因此，当前最值得继续推进的并不是立即扩一套 patch contract，而是：

1. **先把响应 DTO / 响应映射出口显式化**

#### 1.5 `ProductAttributeCategory / ProductAttributeOption` 响应层判断

当前这两条链路虽然也仍直接返回模型，但与 `ChangeOrder` 相比有两个差异：

1. 字段复杂度更低
2. 当前没有明显的派生字段 / 只读展示字段 / preload 丰满度差异问题

所以它们目前更像：

1. 风格上还没统一到 DTO mapper
2. 但业务风险并不高

也因此，短期内继续重构它们的响应层，收益不如优先处理 `ChangeOrder`。

#### 1.6 当前结论

当前更推荐的推进策略是：

1. **优先为 `ChangeOrder` 建立显式响应 DTO / mapper 出口**
2. **暂不为 `ChangeOrder` 新建 patch contract**
3. **`ProductAttributeCategory / ProductAttributeOption` 响应层暂维持现状**

#### 1.7 推荐方案

##### A. `ChangeOrder`：补响应 DTO / mapper 出口

优先位置：

1. `server/handlers/change_orders.go`
2. `server/services/engineering_master_service.go`
3. 如有必要，新增 `server/handlers/change_order_api_dto.go` 或同类 mapper 文件

目标：

1. 为 `ChangeOrder` 建立显式响应 DTO
2. list / options / save 都从统一 mapper 出口返回
3. 在不改变字段名的前提下，明确各场景返回语义

##### B. `ChangeOrder`：暂缓 patch contract

原因：

1. 当前系统没有独立 patch handler / patch service 结构
2. 直接扩 patch contract 会引入更大范围的 API 行为设计
3. 当前优先级不如先把响应层稳定下来

##### C. `ProductAttributeCategory / ProductAttributeOption`：响应层暂不动

目标：

1. 继续保持当前响应兼容
2. 只在后续若统一全模块 mapper 风格时再纳入整理

#### 1.8 风险与控制策略

1. **`ChangeOrder` 前端读取兼容风险**
   - 如果响应 DTO 改字段名，会直接影响前端页面。
   - 控制策略：本轮只改响应出口形态，不改字段名。

2. **options / list 字段差异被过度收窄风险**
   - 若为了统一 DTO 而错误移除 `Product` 等字段，可能影响现有列表显示。
   - 控制策略：统一 mapper 出口，但允许不同场景按现有数据源决定字段是否为空，不强求完全同态。

3. **范围扩张风险**
   - 若在 `ChangeOrder` 响应层治理时顺手扩大到属性模块，性价比不高。
   - 控制策略：本轮只优先做 `ChangeOrder`。

#### 1.9 明确不动范围

本轮不做：

1. 不为 `ChangeOrder` 新增独立 patch API
2. 不重构 `ProductAttributeCategory / ProductAttributeOption` 的响应 DTO
3. 不改前端现有字段读取逻辑

#### 1.10 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 为 `ChangeOrder` 新增显式响应 DTO / mapper
2. 统一 list / options / save 的响应出口
3. 保持字段兼容
4. 执行定向 Go 校验并更新 `walkthrough.md`

#### 1.11 当前阶段结论

当前 engineering 次级候选中，**最值得继续推进的是 `ChangeOrder` 的响应 DTO 显式化**；相比之下，`ProductAttributeCategory / ProductAttributeOption` 的响应层暂时维持现状更划算。这样既能延续契约治理的一致性，又不会把范围扩大到收益不足的地方。

### 1. architecture：engineering 次级候选后端 DTO 收口评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 Product 与 BOM 两条主链路完成多轮 DTO / 派生字段 / write contract 收口之后，engineering 模块当前剩余的次级候选主要集中在：

1. `ChangeOrder`
2. `ProductAttributeCategory`
3. `ProductAttributeOption`

这三条链路此前前端已做过一定程度的输入边界收口，但后端尚未完全对齐。

#### 1.2 排查结果

本轮重点排查了：

1. `server/handlers/change_orders.go`
2. `server/handlers/product_attribute_category.go`
3. `server/handlers/product_attribute_option.go`
4. `server/services/engineering_master_service.go`
5. `server/services/product_attribute_category_service.go`
6. `server/services/product_attribute_option_service.go`
7. `server/models/change_order.go`
8. `server/models/product_attribute_category.go`
9. `server/models/product_attribute_option.go`

#### 1.3 问题强度排序

当前建议优先级如下：

1. **最高优先级：`ChangeOrder`**
2. **中优先级：`ProductAttributeCategory`**
3. **中优先级：`ProductAttributeOption`**

#### 1.4 `ChangeOrder` 现状判断

当前 `ChangeOrder` 的混用程度最高，主要体现在：

1. `SaveChangeOrderInput` 仍直接定义为：
   - `type SaveChangeOrderInput models.ChangeOrder`

2. `SaveChangeOrderHandler` 直接绑定：
   - `services.SaveChangeOrderInput`

3. `SaveChangeOrder()` 内部直接：
   - `models.ChangeOrder(input)`

4. `GetChangeOrdersHandler` / `SaveChangeOrderHandler` 返回阶段直接回传：
   - `models.ChangeOrder`

这意味着它当前仍处于：

1. 请求 DTO
2. 内部保存输入
3. 响应模型

三者高度混用的状态，和 Product 收口前非常接近。

#### 1.5 `ProductAttributeCategory` 现状判断

`ProductAttributeCategory` 当前的问题主要集中在 create 输入路径：

1. `SaveProductAttributeCategoryHandler` 在 create 分支中仍把请求体直接反序列化到：
   - `models.ProductAttributeCategory`

2. `CreateProductAttributeCategory()` 也直接接收：
   - `models.ProductAttributeCategory`

3. patch 路径虽然已经走：
   - `BuildProductAttributeCategoryUpdates()`
   - `PatchProductAttributeCategory()`
   这意味着部分输入边界已经有字段白名单意识

当前还未发现明显的派生展示字段误写问题，因此它更像是：

1. **create 路径仍模型直绑**

而不是整条链路都需要像 Product 一样做三层分离。

#### 1.6 `ProductAttributeOption` 现状判断

`ProductAttributeOption` 的问题介于 `ChangeOrder` 与 `Category` 之间：

1. `SaveProductAttributeOptionInput` 仍直接定义为：
   - `type SaveProductAttributeOptionInput models.ProductAttributeOption`

2. create 路径 handler 仍直接反序列化到：
   - `models.ProductAttributeOption`

3. `CreateProductAttributeOption()` 直接接收：
   - `models.ProductAttributeOption`

4. patch 路径已有白名单更新逻辑，因此问题主要集中在 create 输入 DTO 偏宽

#### 1.7 当前结论

三者都还有后端 DTO 收口空间，但收益并不完全相同：

1. **`ChangeOrder` 值得优先做完整收口**
   - 因为它仍处于明显的请求/保存/响应混用状态

2. **`ProductAttributeCategory / ProductAttributeOption` 更适合做最小收口**
   - 重点放在 create 输入 DTO 去模型直绑
   - 暂不值得扩大到完整响应 DTO 改造

#### 1.8 推荐方案

##### A. `ChangeOrder`：完整度更高的后端输入收口

优先位置：

1. `server/services/engineering_master_service.go`
2. `server/handlers/change_orders.go`

目标：

1. 让 `SaveChangeOrderInput` 不再直接别名 `models.ChangeOrder`
2. 明确区分外部 save input 与内部保存模型
3. 保持当前返回结构兼容，必要时暂不独立拆响应 DTO

##### B. `ProductAttributeCategory`：最小 create 输入收口

优先位置：

1. `server/handlers/product_attribute_category.go`
2. `server/services/product_attribute_category_service.go`

目标：

1. create 路径不再直接绑定 `models.ProductAttributeCategory`
2. 定义更明确的 create/save input
3. patch 路径先保持现有字段白名单逻辑不变

##### C. `ProductAttributeOption`：最小 create 输入收口

优先位置：

1. `server/handlers/product_attribute_option.go`
2. `server/services/product_attribute_option_service.go`

目标：

1. create 路径不再直接绑定 `models.ProductAttributeOption`
2. 收口 `SaveProductAttributeOptionInput`，避免继续作为模型别名
3. patch 路径继续复用现有字段白名单

#### 1.9 风险与控制策略

1. **`ChangeOrder` 返回结构回归风险**
   - 当前 handler 直接返回 `models.ChangeOrder`。
   - 控制策略：本轮优先只收口输入层，不强推响应 DTO 重构。

2. **属性模块 create / patch 语义割裂风险**
   - create 若改 DTO，而 patch 仍保留 map 更新，可能出现风格不一致。
   - 控制策略：接受这种阶段性不一致，以最小收益优先；后续若需要再统一。

3. **范围扩张风险**
   - 若同时把三条链路都按 Product 规格完整重构，性价比不高。
   - 控制策略：按优先级分层处理，`ChangeOrder` 做得更完整，属性模块只做 create 输入收口。

#### 1.10 明确不动范围

本轮不做：

1. 不全面重构 `ChangeOrder` 响应 DTO
2. 不顺手改 Product / BOM 已稳定链路
3. 不改前端现有字段名与展示读取逻辑

#### 1.11 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 `ChangeOrder` 的后端 save input / handler 绑定 / service 输入边界
2. 再最小收口 `ProductAttributeCategory / ProductAttributeOption` 的 create 输入 DTO
3. 保持现有响应口径尽量稳定
4. 执行定向 Go 校验并更新 `walkthrough.md`

#### 1.12 当前阶段结论

当前 engineering 的次级候选后端 DTO 治理中，**`ChangeOrder` 是最值得优先推进的下一站**；`ProductAttributeCategory / ProductAttributeOption` 则更适合做“去模型直绑”的最小收口。这样可以在控制范围的前提下，继续延续 Product/BOM 已建立的契约治理节奏。

### 1. architecture：Product `templateKey` 字段角色收口评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

Product 主数据链路目前已经完成两步治理：

1. 前端 `SaveProductInput` 已从完整 `Product` 收口为更明确的 write contract
2. 后端已经把 `SaveProductAPIRequest` 与内部 `ProductWriteInput` 区分开

在此基础上，下一步最自然的细化点，就是把 `templateKey` 这个字段的角色彻底讲清楚：

1. 它是否仍有机会被当作可写字段
2. 它是否应被明确界定为“仅响应兼容字段”

#### 1.2 排查结果

本轮重点排查了：

1. `server/models/product.go`
2. `server/services/product_master_service.go`
3. `server/handlers/product_api_dto.go`
4. `server/handlers/product_mapper.go`

已确认的事实如下：

1. **`templateKey` 当前不落库**
   - `models.Product.TemplateKey` 使用：
     - `gorm:"-"`
   - 说明它从模型层面就不是持久化字段。

2. **`templateKey` 当前来自派生逻辑，而不是保存输入**
   - `applyDerivedTemplateKeys()` 会在读取与保存返回前对产品集合进行派生
   - 派生路径为：
     - `Product.TypeID`
     - `ProductType.TemplateID`
     - `ProductTemplate.ComponentKey`

3. **当前内部保存链路已经基本排除了 `templateKey` 的写入语义**
   - `ProductWriteInput` 当前不包含 `templateKey`
   - `BuildProductPatchInput()` 的 delta 白名单不包含 `templateKey`
   - `BulkSyncProducts()` 也不会把 `templateKey` 映射进 `models.Product`

4. **当前保留 `templateKey` 的位置主要在响应层**
   - `ProductApiDTO` 仍包含 `templateKey`
   - handler mapper 也会把 `product.TemplateKey` 回传给前端
   - 因此，它目前更像一个“响应兼容字段”，而不是写入字段

#### 1.3 当前结论

`templateKey` 当前已经基本满足“只读/派生字段”的事实状态，但角色声明还不够显式。

也就是说，当前问题已经不再是：

1. `templateKey` 真的会被写入数据库

而是：

1. 它虽然实际上是派生字段，但在契约语义上还没有被明确表达为“仅响应兼容字段”

#### 1.4 推荐方案

推荐按“显式声明，而非大规模重构”的方式推进：

##### A. 输入层进一步显式化

优先位置：

1. `server/services/product_service_types.go`
2. `server/services/product_master_service.go`

目标：

1. 确保所有 Product 输入模型都不包含 `templateKey`
2. 明确任何保存 / PATCH / bulk sync 路径都不接受该字段的写入语义

##### B. 响应层保持兼容

优先位置：

1. `server/handlers/product_api_dto.go`
2. `server/handlers/product_mapper.go`

目标：

1. 保留 `templateKey` 输出
2. 继续让前端展示层平滑读取该派生值

##### C. 验证层补强（按收益决定）

可选位置：

1. `server/services` 或 `server/handlers` 的定向测试

目标：

1. 用测试证明 `templateKey` 仅来自派生
2. 避免后续有人把它重新塞回输入 DTO 或 patch 白名单

#### 1.5 风险与控制策略

1. **误删前端兼容字段风险**
   - 如果过度收口，可能影响当前前端展示直接读取 `templateKey`。
   - 控制策略：本轮只收口输入语义，不动响应输出。

2. **测试成本与收益不匹配风险**
   - 当前事实已经较清晰，若新增测试过重，收益可能不高。
   - 控制策略：只在能低成本证明“不可写”时补充测试。

3. **语义过度设计风险**
   - 该字段当前已经基本安全，若大动干戈重构整套 Product 响应契约，收益不足。
   - 控制策略：只做“角色显式化”，不做大规模 contract 重排。

#### 1.6 明确不动范围

本轮不做：

1. 不删除 `ProductApiDTO.templateKey`
2. 不重构前端 `Product` 展示读取逻辑
3. 不扩到 `ChangeOrder / ProductAttributeOption / ProductAttributeCategory`

#### 1.7 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 复核并显式声明所有 Product 输入模型均不含 `templateKey`
2. 视收益决定是否补充一个定向校验/测试
3. 保持响应兼容输出不变
4. 更新 `walkthrough.md`

#### 1.8 当前阶段结论

`templateKey` 当前的事实角色已经很明确：**它是派生响应字段，而非保存字段**。下一步最值得做的不是大改，而是把这个事实在 Product 契约边界上再显式化一步，防止后续回归到“看起来像可写字段”的模糊状态。

### 1. architecture：Product 后端保存链路 DTO 收口评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

前端 Product 主数据链路已经完成第一步 write contract 收口：

1. `SaveProductInput` 不再直接等于完整 `Product`
2. `product-api-adapter.ts` 与 `product-maintenance-service.ts` 已围绕 write contract 工作

接下来最自然的下一步，就是让后端 Product 保存链路继续对齐，避免前端收窄了输入边界，但后端仍长期停留在“宽 DTO 混用”的结构。

#### 1.2 后端排查结果

本轮重点排查了：

1. `server/handlers/products.go`
2. `server/services/product_service_types.go`
3. `server/services/product_master_service.go`
4. `server/handlers/product_api_dto.go`
5. `server/models/product.go`

已确认的事实如下：

1. **当前后端已经优于最原始的模型直绑方案**
   - `SaveProductHandler` 绑定的是：
     - `services.SaveProductAPIRequest`
   - 而不是直接绑定：
     - `models.Product`

2. **后端已经存在独立响应 DTO**
   - `handlers/product_api_dto.go` 中定义了：
     - `ProductApiDTO`
   - 因此当前问题不在“完全没有 DTO”，而在 DTO 职责仍然偏宽。

3. **当前后端的主要结构问题在于：同一个宽 DTO 被多处复用**
   - `SaveProductAPIRequest` 同时承担：
     - 外部请求 DTO
     - service 层宽输入 DTO
     - PATCH 合成目标 DTO
   - `BuildProductPatchInput()` 会先把当前产品转回 `SaveProductAPIRequest`，再在这个宽 DTO 上叠 delta
   - `BulkSyncProducts()` 也直接批量消费 `SaveProductAPIRequest`

4. **字段层面的关键判断**
   - `models.Product.TemplateKey` 是：
     - `gorm:"-"`
   - 它属于派生响应字段
   - 但 `ProductApiDTO` 与 `SaveProductAPIRequest` 当前都保留了 `templateKey`
   - 这说明后端当前仍未完全把“派生响应字段”与“可写输入字段”明确区分。

5. **不是所有聚合字段都该被收掉**
   - `attachments`
   - `techSpecs`
   - `attributeValues`
   - `barcodeConfig`
   当前仍属于真实可写聚合字段，而非纯展示字段。

#### 1.3 当前结论

Product 后端保存链路当前的主要问题，不是“直接把 `models.Product` 当请求体”，而是：

1. `SaveProductAPIRequest` 的职责过宽
2. PATCH / Save / BulkSync 仍共用这一个宽 DTO
3. 派生字段 `templateKey` 仍夹在请求/响应边界中，没有彻底完成角色收口

因此，当前最值得做的不是重构整个 Product API，而是把：

1. **外部 API 输入 DTO**
2. **内部 Product write input**

进一步分开。

#### 1.4 推荐方案

推荐这一步按“请求 DTO / 内部 write input / 响应 DTO 三段分层”推进：

##### A. 外部 API 输入层

优先位置：

1. `server/services/product_service_types.go`
2. `server/handlers/products.go`

目标：

1. 保留现有 HTTP 请求契约兼容
2. 但不再让 `SaveProductAPIRequest` 同时承担所有内部职责

##### B. 内部保存输入层

优先位置：

1. `server/services/product_service_types.go`
2. `server/services/product_master_service.go`

目标：

1. 定义更明确的 Product write input
2. 让 `SaveProduct()` / `BulkSyncProducts()` 接收这个内部 write input 或先转换到该输入
3. 让 `BuildProductPatchInput()` 合成该 write input，而不是继续回写到 `SaveProductAPIRequest`

##### C. 响应层

优先位置：

1. `server/handlers/product_api_dto.go`
2. `toProductApiDTO(...)`

目标：

1. 暂不重构 `ProductApiDTO`
2. 保持现有响应契约稳定
3. 本轮只解决输入边界问题，不顺手扩大到响应 contract 清洗

#### 1.5 风险与控制策略

1. **PATCH 与 Save 语义漂移风险**
   - 当前 `BuildProductPatchInput()` 依赖把现有实体反向映回 `SaveProductAPIRequest`。
   - 控制策略：新增明确 write input 后，PATCH 仍沿用同一字段白名单，只替换合成目标类型。

2. **BulkSync 行为回归风险**
   - `BulkSyncProducts()` 当前直接消费 `SaveProductAPIRequest` 列表。
   - 控制策略：保持外部 payload 不变，仅在 service 内部转换到 write input。

3. **templateKey 角色误判风险**
   - `templateKey` 是派生字段，但可能仍被部分前端链路传入。
   - 控制策略：本轮优先弱化其内部写入语义，而不是立即删除外部兼容字段。

#### 1.6 明确不动范围

本轮不做：

1. 不重构整个 Product 响应 DTO
2. 不同步扩到 ChangeOrder / ProductAttributeOption / ProductAttributeCategory
3. 不改变现有前端 Product HTTP 请求字段名

#### 1.7 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先定义 Product 后端内部 write input
2. 再让 `SaveProduct()` / `BulkSyncProducts()` / `BuildProductPatchInput()` 对齐到该输入
3. 保持 `ProductApiDTO` 与现有 handler 响应不变
4. 执行定向验证并更新 `walkthrough.md`

#### 1.8 当前阶段结论

当前 Product 主数据链路已经在前端完成第一步收口，下一步最值得做的是继续收口后端输入层：不是推翻现有 `SaveProductAPIRequest` 与 `ProductApiDTO`，而是把**HTTP 输入 DTO 与内部 Product write input 明确分开**，从而真正完成前后端契约边界的一致化。

### 1. architecture：engineering 请求 DTO / 响应 DTO 进一步分离评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在最近几轮治理中，engineering 已经完成了多批“字段语义收口”：

1. machine code normalization
2. BOM 控制字段规范化
3. `bomDisplayVersion` 的请求/响应口径分离

接下来最自然的方向，不再是单点字段处理，而是继续排查 engineering 内部是否还存在更底层的结构问题：

1. 请求 DTO 与响应 DTO 混用
2. 完整领域模型直接兼作保存输入
3. 聚合/展示字段被默认视为可写字段

#### 1.2 本轮排查结果

本轮重点排查了：

1. `src/features/engineering/mutation-types.ts`
2. `src/features/engineering/services/*`
3. `src/features/engineering/adapters/*`
4. `src/features/engineering/data/schema.ts`

目前可以分成三类情况：

##### A. 已经相对健康的链路

1. **BOM**
   - `SaveBOMInput` 已经从完整 `BOM` 收口为 `Omit<BOM, 'bomDisplayVersion'>`
   - 前端保存边界与后端输入 DTO 已开始分离

2. **ProductType**
   - 已通过：
     - `SaveProductTypeInput`
     - `product-type-api-adapter.ts`
   - 实现请求/响应转换

3. **ProductTemplate**
   - 已通过：
     - `SaveProductTemplateInput`
     - `product-template-api-adapter.ts`
   - 实现请求/响应转换

##### B. 最值得优先继续治理的候选

1. **Product 主数据链路**
   - 当前 `mutation-types.ts` 中：
     - `SaveProductInput = Product`
   - 这意味着完整 `Product` 领域/响应模型仍被直接当作保存输入类型。

2. **ProductMaintenanceService**
   - 当前依旧以 `SaveProductInput` 作为保存输入
   - 再由 `product-api-adapter.ts` 转成 API DTO
   - 虽然 adapter 已存在，但输入边界仍然偏宽，容易把不应写入的字段一并视为可写。

3. **productSchema**
   - 目前 `Product` 上仍包含多个需要再次分型判断的字段：
     - `templateKey`
     - `attachments`
     - `attributeValues`
     - `techSpecs`
   - 这些字段中，有些可能是聚合响应字段，有些是可写字段，有些可能需要专门 write contract 才能表达清楚。

##### C. 次优先候选

1. **ProductAttributeCategory / ProductAttributeOption**
   - 当前虽然已经使用：
     - `Omit<id | version>`
   - 但整体仍直接复用 schema 类型，后续仍值得确认是否混入纯响应字段。

2. **ChangeOrder**
   - 当前前端使用 `SaveChangeOrderInput`
   - 输入边界比 Product 更清晰
   - 但后续仍可确认前后端是否还存在输入模型/响应模型混用。

#### 1.3 当前判断

当前最值得优先治理的不是再回到 BOM，而是：

1. **Product 主数据链路**

原因是：

1. `SaveProductInput = Product` 仍然是明显的完整模型直通输入。
2. Product 是 engineering 的上游主数据，一旦输入边界过宽，会把问题带到模板、属性值、条码配置等多个子链路。
3. 相比之下，`ProductType / ProductTemplate / BOM` 已经有更明显的输入/输出分层迹象。

#### 1.4 推荐方案

推荐按“先主链路，后周边”的顺序推进：

##### 第一步：Product 主数据链路 DTO 分离

优先位置：

1. `src/features/engineering/mutation-types.ts`
2. `src/features/engineering/adapters/product-api-adapter.ts`
3. `src/features/engineering/services/product-maintenance-service.ts`

目标：

1. 将 `SaveProductInput = Product` 改为更明确的 Product write contract
2. 明确哪些字段属于真正可写字段
3. 让 adapter 明确承担读写转换，而不是只做“宽模型转窄 DTO”的技术桥接

##### 第二步：属性值链路复核

优先位置：

1. `product-attribute-category-service.ts`
2. `product-attribute-option-service.ts`
3. 对应 `mutation-types.ts`

目标：

1. 确认当前 schema 复用是否已经足够安全
2. 若仍混入纯响应字段，再做次级 DTO 分离

##### 第三步：ChangeOrder 复核

优先位置：

1. `change-order-service.ts`
2. 对应后端 `SaveChangeOrderInput`

目标：

1. 判断是否仍存在输入/响应模型混用
2. 仅在有明确收益时再扩展范围

#### 1.5 风险与控制策略

1. **Product 写入字段过多的风险**
   - Product 聚合字段多，一次性全拆容易扩大范围。
   - 控制策略：只先定义 write contract，不顺手重构所有响应 contract。

2. **Adapter 过载风险**
   - 当前 adapter 已承担较多转换职责。
   - 控制策略：本轮只让 adapter 更明确地区分 write DTO 与 read contract，不增加无关逻辑。

3. **范围扩散风险**
   - 容易从 Product 一路扩到 attribute/template/type/change-order。
   - 控制策略：若进入实施，先只做 Product 主链路；其它候选仅做复核，不默认实施。

#### 1.6 明确不动范围

本轮不做：

1. 不重构整个 engineering contract 目录结构
2. 不扩到 production / authz / dashboard 等其它模块
3. 不顺手改动无明确问题的 `ProductType / ProductTemplate / BOM` 读写链路

#### 1.7 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 Product 主数据链路的 write contract
2. 再检查 `product-api-adapter.ts` 与 `product-maintenance-service.ts` 的输入边界是否同步变清晰
3. 再做属性值链路与 ChangeOrder 的轻量复核
4. 执行定向验证并更新 `walkthrough.md`

#### 1.8 当前阶段结论

当前这条治理线已经从“单字段规范化”进入“契约边界清理”。下一步最值得做的是优先收口 **Product 主数据链路**，因为它仍然保留着最明显的“完整响应模型直接充当保存输入”的结构性问题。

### 1. architecture：BOM `bomDisplayVersion` 后端依赖收口评估

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

前端已经完成 `bomDisplayVersion` 的单一来源治理：

1. 展示层优先从 `bomVersion` 派生
2. form / dialog / page 不再重复主动回写 `bomDisplayVersion`

但还剩一个关键问题没有确认：

1. 后端是否真的需要把 `bomDisplayVersion` 视作可提交字段
2. 还是它本质上只是一个响应阶段派生字段

#### 1.2 后端排查结果

本轮已排查的关键文件包括：

1. `server/models/product.go`
2. `server/services/engineering_master_service.go`
3. `server/handlers/bom.go`
4. `src/features/engineering/services/bom-service.ts`

已确认的事实如下：

1. `models.BOM.DisplayVersion` 在后端模型中声明为：
   - `gorm:"-"`
   - 说明它**不参与数据库持久化**。

2. 后端真实持久化的版本字段是：
   - `VersionText`
   - JSON 映射名为 `version`

3. 后端在多个返回路径中都会派生 `bomDisplayVersion`：
   - `GetBOMByID()`
   - `ListBOMs()`
   - `SaveBOM()`
   - 通过：
     - `resolveBOMDisplayVersion()`
     - `hydrateBOMDerivedFields()`

4. 后端当前没有把 `bomDisplayVersion` 用于：
   - 查询过滤
   - 唯一性判断
   - active 冲突判断
   - 变更单引用校验
   - 锁定/状态流转

5. `SaveBOMHandler` 仍会接收该字段的根本原因不是业务需要，而是：
   - `SaveBOMInput` 直接别名到 `models.BOM`
   - 因而请求体结构自然容纳了 `DisplayVersion`

#### 1.3 当前结论

到目前为止，可以明确判断：

1. `bomDisplayVersion` 在后端属于**响应阶段派生字段**
2. 它不是数据库持久化字段
3. 它也不是业务判定字段

因此，当前真正的冗余点是：

1. 前端 `bom-service.ts` 仍在提交 payload 中带上它
2. 后端 `SaveBOMInput` 仍复用完整模型，导致派生字段继续暴露为“可提交字段”

#### 1.4 推荐收口方向

推荐下一步按“请求/响应分离”的方式收口：

##### A. 前端请求层

优先位置：

1. `src/features/engineering/services/bom-service.ts`

目标：

1. 不再主动提交 `bomDisplayVersion`
2. 继续保留前端展示层对响应 `bomDisplayVersion` 的兼容读取

##### B. 后端输入 DTO 层

优先位置：

1. `server/services/engineering_master_service.go`
2. 必要时联动 `server/handlers/bom.go`

目标：

1. 将 `SaveBOMInput` 从 `models.BOM` 拆成更明确的输入 DTO
2. 让请求字段只包含真正可写字段
3. 保留 `models.BOM.DisplayVersion` 作为响应派生字段

##### C. 响应层

优先位置：

1. `resolveBOMDisplayVersion()`
2. `hydrateBOMDerivedFields()`

目标：

1. 暂不删除
2. 保持现有前端兼容与展示稳定

#### 1.5 风险与控制策略

1. **请求契约变更风险**
   - 若后端绑定模型直接切 DTO，可能影响现有前端 payload。
   - 控制策略：先收口前端，再让后端 DTO 兼容已有可写字段，避免一次性扩大改动。

2. **版本字段映射风险**
   - 后端当前持久化字段叫 `VersionText`，JSON 名却是 `version`，前端字段又叫 `bomVersion`。
   - 控制策略：本轮只处理 `bomDisplayVersion` 的可写性，不顺手重构 `version` 命名体系。

3. **展示兼容风险**
   - 若直接移除响应中的 `bomDisplayVersion`，可能影响尚未统一的旧读路径。
   - 控制策略：本轮只弱化请求口径，继续保留响应派生字段。

#### 1.6 明确不动范围

本轮不做：

1. 不重构 BOM `version` / `VersionText` 命名体系
2. 不扩到 ChangeOrder / Product 侧 DTO 结构治理
3. 不删除后端响应中的 `bomDisplayVersion`

#### 1.7 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口前端 `bom-service.ts`，不再主动提交 `bomDisplayVersion`
2. 再评估并收口后端 `SaveBOMInput` 的输入 DTO
3. 保留 `resolveBOMDisplayVersion()` / `hydrateBOMDerivedFields()` 作为响应兼容层
4. 执行定向验证并更新 `walkthrough.md`

#### 1.8 当前阶段结论

后端排查已经足够明确：`bomDisplayVersion` 不是持久化字段，也不是业务判定字段，而是响应阶段派生字段。下一步最值得做的不是删除展示兼容，而是把**请求口径和响应口径进一步分离**，从而彻底弱化 `bomDisplayVersion` 的“可写字段”身份。

### 1. architecture：BOM/ECO 生效日期 schema 约束显式化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在上一轮中，BOM/ECO 侧的生效日期字段已经完成了前端口径统一：

1. `effectiveFrom`
2. `effectiveTo`

当前已通过公共函数 `normalizeBomEffectiveDate()` 收口为 `YYYY-MM-DD` 边界字符串，并且已同步到：

1. form 初始化
2. 表单输入
3. 保存边界
4. table / preview 展示

但 schema 层目前仍缺少一条明确契约：

1. 空值是否允许
2. 非空时是否必须满足 `YYYY-MM-DD`

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/data/schema.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/services/bom-service.ts`

已确认的现状包括：

1. `effectiveFrom / effectiveTo` 当前通过前端公共函数被裁剪到 `YYYY-MM-DD`。
2. `bom-form-header.tsx` 中对应字段使用 `input type='date'`。
3. schema 目前仅继承自 BOM 结构字段，没有进一步显式表达日期格式约束。
4. 因此前端 UI 语义已经稳定，但 schema 仍未成为最终的格式守门人。

#### 1.3 本轮目标

本轮目标非常聚焦：

1. 在 `schema.ts` 中显式表达 `effectiveFrom / effectiveTo` 的日期格式契约。

更具体地说，需要明确：

1. 空字符串允许通过
2. 非空字符串必须满足 `YYYY-MM-DD`

#### 1.4 推荐方案

推荐在 `schema.ts` 中为日期字段引入一个轻量级的日期字符串 schema，例如：

1. `trim()`
2. 允许空字符串
3. 非空时匹配 `^\\d{4}-\\d{2}-\\d{2}$`

这样做的好处是：

1. 与当前 `input type='date'` 的浏览器输入语义一致
2. 与 `normalizeBomEffectiveDate()` 的输出一致
3. 不需要引入重型日期库

#### 1.5 推荐结构分层

##### A. Schema 层

优先位置：

1. `data/schema.ts`

职责：

1. 成为日期格式的最终守门人。
2. 明确空值与非空格式规则。

##### B. 对齐层

优先位置：

1. `use-bom-form.ts`
2. `bom-form-header.tsx`
3. `bom-service.ts`

职责：

1. 确认已有前端规范函数与 schema 规则完全一致。
2. 若有偏差，仅做最小对齐，不扩大范围。

#### 1.6 明确不动范围

本轮不扩到：

1. 其它模块的日期字段
2. 后端日期存储或解析策略
3. 其它 BOM 头字段
4. routing / item / substitute 内部时间字段

#### 1.7 风险与控制策略

1. **历史数据兼容风险**
   - 若已有数据包含完整 ISO 字符串，schema 直接收紧后可能影响回填。
   - 控制策略：继续保留前端初始化层的 `normalizeBomEffectiveDate()`，先把回填值裁剪到 `YYYY-MM-DD` 再进入表单。

2. **浏览器输入差异风险**
   - `input type='date'` 理论上返回 `YYYY-MM-DD`，但仍应以 schema 明确契约。
   - 控制策略：以 schema 作为最后守门人，UI 只做顺向对齐。

3. **范围扩散风险**
   - 容易把问题扩大到所有日期字段。
   - 控制策略：本轮只限制 `BOM.effectiveFrom / BOM.effectiveTo`。

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先在 `schema.ts` 中定义 BOM 生效日期字段的格式约束。
2. 再核对 `use-bom-form.ts / bom-form-header.tsx / bom-service.ts` 是否需要最小对齐。
3. 执行定向验证并更新 `walkthrough.md`。

#### 1.9 当前阶段结论

方向 A 的最合理落点已经明确：下一步不是再扩大控制字段范围，而是把 `effectiveFrom / effectiveTo` 已经形成的前端统一口径，进一步**下沉到 schema 契约层**，让日期格式要求变成显式且可验证的模型约束。

### 1. architecture：BOM/ECO 生命周期与生效控制字段治理

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 内已经完成：

1. 属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）
2. template/type 机器字段链路（`ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`）
3. Product 主数据链路（`sku / modelCode / templateKey`）
4. Product / ChangeOrder / BOM 共用的变更控制字段（`revisionNo / siteCode / changeOrderNo`）
5. BOM/ECO 控制字段（`bomNo / bomVersion`）
6. `bomDisplayVersion` 单一来源治理

继续往下盘点 BOM/ECO 侧字段时，最明确的下一批已经不再是编号/版本类字段，而是：

1. `changeType`
2. `status`
3. `effectiveFrom`
4. `effectiveTo`

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/data/schema.ts`
2. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
3. `src/features/engineering/hooks/use-bom-form.ts`
4. `src/features/engineering/services/bom-service.ts`
5. `src/features/engineering/components/bom-mgmt/bom-table.tsx`
6. `src/features/engineering/components/bom-mgmt/bom-preview.tsx`

已确认的现状包括：

1. `changeType` 当前在 BOM 表头通过下拉可选，且在选择 change order 时会被自动回填。
2. `status` 当前在 BOM 表头通过下拉可选，也在列表中承担生命周期展示语义。
3. `effectiveFrom / effectiveTo` 当前依赖 `slice(0, 10)` 的局部日期输入转换。
4. 这批字段目前主要依赖 schema/select/date input 的局部约束，尚未被作为一组独立语义字段治理。

#### 1.3 本轮结论

这批字段值得进入下一轮治理，但它们不应被混入已有的 code normalization 规则，而应按字段职责拆成两类：

##### A. 生命周期枚举控制字段

适用字段：

1. `changeType`
2. `status`

推荐方向：

1. 明确稳定枚举集合
2. 统一 UI / form / save / display 的取值口径
3. 避免局部字符串直写继续扩散

##### B. 生效日期边界字段

适用字段：

1. `effectiveFrom`
2. `effectiveTo`

推荐方向：

1. 统一日期输入格式化入口
2. 保持 form 输入值、保存值、展示值之间一致
3. 明确是否只接受 `YYYY-MM-DD` 还是允许完整 ISO 再截断

#### 1.4 当前推荐方向

更推荐把这批字段视为：

1. **控制语义字段治理**

而不是：

1. 普通字符串 normalization

原因：

1. `changeType / status` 的核心问题是稳定枚举和生命周期语义。
2. `effectiveFrom / effectiveTo` 的核心问题是日期边界与格式一致性。
3. 它们和 `bomNo / bomVersion`、`revisionNo / siteCode / changeOrderNo` 属于不同分型。

#### 1.5 推荐结构分层

##### A. 表单输入与回填层

优先位置：

1. `bom-form-header.tsx`
2. `use-bom-form.ts`

职责：

1. 统一 `changeType / status` 的默认值与可选值来源。
2. 统一 `effectiveFrom / effectiveTo` 的输入格式转换。

##### B. 保存边界层

优先位置：

1. `bom-service.ts`

职责：

1. 保证最终提交 payload 与 form 语义一致。
2. 避免日期字段在 create / patch 中出现不同格式。

##### C. 展示层

优先位置：

1. `bom-table.tsx`
2. `bom-preview.tsx`

职责：

1. 统一生命周期状态展示。
2. 统一生效日期展示与空值兜底。

##### D. Schema / 契约层

优先位置：

1. `data/schema.ts`
2. 如有必要，再评估 `mutation-types.ts`

职责：

1. 让枚举与日期边界在 schema 层表达更清晰。
2. 限制局部字符串随意扩张。

#### 1.6 明确不动范围

本轮不扩到：

1. `items`
2. `substitutes`
3. `standardUsage`
4. `description`
5. `productId / changeOrderId`

原因：

1. 这些字段不属于当前最明确的 BOM/ECO 控制语义字段。
2. `productId / changeOrderId` 的问题更偏引用关系，而不是 normalization / control semantics。

#### 1.7 风险与控制策略

1. **枚举扩散风险**
   - 若 `changeType / status` 继续依赖局部字符串常量，会继续造成表单、服务、展示层漂移。
   - 控制策略：统一枚举来源与取值口径。

2. **日期格式漂移风险**
   - `effectiveFrom / effectiveTo` 目前使用局部 `slice(0, 10)`，容易造成输入/展示/存储格式不一致。
   - 控制策略：收拢统一日期边界格式化入口。

3. **范围扩散风险**
   - 这批字段容易把问题扩大到所有日期或状态字段。
   - 控制策略：本轮只聚焦 BOM/ECO 头部字段，不扩到 routing、item 或其它模块。

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先明确 `changeType / status` 的稳定枚举口径。
2. 再明确 `effectiveFrom / effectiveTo` 的统一日期输入/展示格式。
3. 再收口 `bom-form-header.tsx / use-bom-form.ts`。
4. 再收口 `bom-service.ts` 与 table/preview 展示口径。
5. 执行定向验证并更新 `walkthrough.md`。

#### 1.9 当前阶段结论

继续排查后，BOM/ECO 侧最明确、最值得纳入下一批治理的字段已经比较清晰：

1. `changeType`
2. `status`
3. `effectiveFrom`
4. `effectiveTo`

这批字段的核心不是大小写，而是**生命周期枚举语义**与**生效日期边界语义**。如果继续推进，应该按这一分型来做，而不是简单复用已有的 machine code 或 business code normalization 模式。

### 1. architecture：BOM/ECO display version 单一来源治理

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 内已经完成：

1. 属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）
2. template/type 机器字段链路（`ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`）
3. Product 主数据链路（`sku / modelCode / templateKey`）
4. Product / ChangeOrder / BOM 共用的变更控制字段（`revisionNo / siteCode / changeOrderNo`）
5. BOM/ECO 控制字段（`bomNo / bomVersion`）

在这之后，BOM/ECO 侧最值得优先治理的问题已经不再是单个字段的大小写，而是：

1. `bomDisplayVersion` 是否应该继续被视为独立持久化字段
2. 还是应该被收拢为从 `bomVersion` 派生出来的展示字段

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/hooks/use-bom-form.ts`
2. `src/features/engineering/components/bom-action-dialog.tsx`
3. `src/features/engineering/tabs/bom-mgmt.tsx`
4. `src/features/engineering/services/bom-service.ts`
5. `src/features/engineering/components/bom-mgmt/bom-table.tsx`
6. `src/features/engineering/data/schema.ts`

已确认的现状包括：

1. `bomDisplayVersion` 当前在 form 初始化时会从 `bomVersion` 派生后回填。
2. `bomActionDialog.tsx` 与 `bom-mgmt.tsx` 提交前都会再次把 `bomDisplayVersion` 从 `bomVersion` 派生后回写。
3. `bom-service.ts` 保存边界也会继续把 `bomDisplayVersion` 从 `bomVersion` 派生后回写。
4. `bom-table.tsx` 列表展示当前优先直接读取 `row.original.bomDisplayVersion`。
5. `bomDisplayVersion` 当前不是用户直接编辑字段。

#### 1.3 本轮结论

本轮若进入实施，核心目标不应再是“给 `bomDisplayVersion` 增加 another normalization function”，而应是先决定其**单一来源策略**。

##### A. 方案一：继续保留为持久化字段

含义：

1. 后端/前端仍允许 `bomDisplayVersion` 独立存储
2. 但必须明确谁是唯一派生责任方

优点：

1. 兼容已有数据结构
2. 对现有展示层影响较小

缺点：

1. 很容易继续出现 `bomVersion !== bomDisplayVersion` 的漂移
2. 前端多个边界重复回写的复杂度仍然存在

##### B. 方案二：收拢为派生字段

含义：

1. `bomDisplayVersion` 不再作为需要四处主动写入的字段
2. 展示层统一从 `bomVersion` 派生

优点：

1. 单一来源清晰
2. patch / delta / service / form 初始化链路会明显简化

缺点：

1. 需要确认后端当前是否依赖该字段持久化
2. 需要统一列表、详情、编辑态的读取策略

#### 1.4 当前推荐方向

从当前代码现状看，更推荐把 `bomDisplayVersion` 定义为**派生字段**，而不是继续作为“处处回写的半持久化字段”。

原因：

1. 它不是用户直接编辑字段。
2. 当前所有写入点几乎都只是把 `bomVersion` 再复制一遍。
3. 继续保留多点回写只会增加 `delta` 与保存边界的漂移风险。

#### 1.5 推荐结构分层

##### A. 表单与提交层

优先位置：

1. `use-bom-form.ts`
2. `bom-action-dialog.tsx`
3. `bom-mgmt.tsx`

职责：

1. 明确提交时是否还需要主动携带 `bomDisplayVersion`。
2. 若选择派生字段，则移除重复回写。

##### B. 保存层

优先位置：

1. `bom-service.ts`

职责：

1. 明确 `bomDisplayVersion` 是否仍应出现在保存 payload 中。
2. 若仍保留，则只能有一个唯一派生入口。

##### C. 展示层

优先位置：

1. `bom-table.tsx`
2. 其它 BOM preview / details 展示文件

职责：

1. 若选择派生字段，展示层应统一优先从 `bomVersion` 派生，而不是依赖一个可能陈旧的 `bomDisplayVersion`。

##### D. Schema / 类型层

优先位置：

1. `data/schema.ts`
2. `mutation-types.ts`

职责：

1. 若 `bomDisplayVersion` 不是真正的业务输入字段，应重新评估它在 schema/type 中的定位。

#### 1.6 明确不动范围

本轮不扩到：

1. `description`
2. `items`
3. `substitutes`
4. `standardUsage`
5. 其它工艺路线或 routing 版本号

#### 1.7 风险与控制策略

1. **后端契约依赖风险**
   - 若后端当前明确依赖 `bomDisplayVersion` 持久化，前端不能擅自完全移除。
   - 控制策略：先按“前端单一来源治理”实施，必要时保留兼容字段，但只保留一个派生入口。

2. **展示层回归风险**
   - 列表/预览若仍优先读旧字段，可能出现显示值与编辑值不一致。
   - 控制策略：统一展示层优先级。

3. **delta 漂移风险**
   - 若 `bomDisplayVersion` 继续在多个边界被改写，会干扰 patch diff。
   - 控制策略：减少重复回写点，尽量让 delta 只围绕真正业务输入字段产生。

#### 1.8 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先明确 `bomDisplayVersion` 的字段角色（派生 vs 持久化）。
2. 再收口 `use-bom-form.ts / bom-action-dialog.tsx / bom-mgmt.tsx` 的重复回写。
3. 再收口 `bom-service.ts` 的唯一派生入口或 payload 出口策略。
4. 最后统一 `bom-table.tsx` 等展示层读取口径。
5. 执行定向验证并更新 `walkthrough.md`。

#### 1.9 当前阶段结论

下一步最值得推进的不是再增加一个新的版本字段 normalization，而是围绕 `bomDisplayVersion` 做**单一来源治理**。这一步如果做对，可以显著降低 BOM/ECO 侧 form、delta、save、table 展示之间的重复回写和契约漂移风险。

### 1. architecture：BOM/ECO 控制字段接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 内已经完成：

1. 属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）
2. template/type 机器字段链路（`ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`）
3. Product 主数据链路（`sku / modelCode / templateKey`）
4. Product / ChangeOrder / BOM 共用的变更控制字段（`revisionNo / siteCode / changeOrderNo`）

之后，下一批最自然的字段是 BOM/ECO 自己的控制字段：

1. `bomNo`
2. `bomVersion`

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/hooks/use-bom-form.ts`
2. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
3. `src/features/engineering/components/bom-action-dialog.tsx`
4. `src/features/engineering/tabs/bom-mgmt.tsx`
5. `src/features/engineering/services/bom-service.ts`
6. `src/features/engineering/data/schema.ts`

已确认的现状包括：

1. `use-bom-form.ts` 默认值直接写死 `bomVersion: 'V1.0'`。
2. `use-bom-form.ts` 新建时 `initialVersion` 直接回退到 `currentRow?.bomVersion || 'V1.0'`。
3. `bom-form-header.tsx` 中 `bomNo` 可编辑，但未见显式规范化。
4. `bom-form-header.tsx` 中 `bomVersion` 只读展示，但未见显式规范化。
5. `bom-service.ts` 保存边界当前基本直传 `data`。
6. `bomSchema` 仅要求 `bomVersion` 非空，并未给出更明确的格式规范。

#### 1.3 本轮结论

本轮若进入实施，应继续采用“按字段职责分型”的方式，而不是把 `bomNo / bomVersion` 粗暴并入此前某一条通用 uppercase 规则。

##### A. 业务编号

适用字段：

1. `bomNo`

推荐方向：

1. trim
2. 如后端未限定其它字符语义，优先做最小化大写收口
3. 不改写现有单号结构，只做规范化

##### B. 版本标签

适用字段：

1. `bomVersion`

推荐方向：

1. trim
2. 保持类似 `V1.0` 的稳定格式语义
3. 如需统一大小写，仅做最小化大写收口，不引入复杂版本重写逻辑

#### 1.4 推荐结构分层

##### A. 表单初始化与输入展示层

优先位置：

1. `use-bom-form.ts`
2. `bom-form-header.tsx`

职责：

1. `bomVersion` 的默认值、编辑态回填、只读展示与最终保存口径一致。
2. `bomNo` 若允许手工录入，应进入状态前走统一最小规范化。

##### B. 提交与保存边界层

优先位置：

1. `bom-action-dialog.tsx`
2. `bom-mgmt.tsx`
3. `bom-service.ts`

职责：

1. 即便 UI 层漏掉，也能在保存前统一规范 `bomNo / bomVersion`。
2. patch 与 create 两条链路尽量保持同一口径。

##### C. Schema / 契约层

优先位置：

1. `data/schema.ts`
2. 若后续存在 BOM adapter，再继续评估

职责：

1. 让 `bomVersion` 的格式语义至少在前端 schema 层有清晰表达。
2. 避免默认值、UI 展示值与最终提交值出现漂移。

#### 1.5 与前几批规则的关系

当前已经形成的规则类型包括：

1. 大写机器码
2. 小写 slug 机器值
3. 稳定大写枚举键 / 引用键
4. 固定格式数字码
5. 变更控制字段

而本轮进一步补充的是：

1. BOM 业务编号
2. BOM 版本标签

这说明 normalization 正在从 Product 主数据与 ChangeOrder 控制字段，继续扩展到 ECO/BOM 自己的版本控制语义。

#### 1.6 推荐实施范围

第一批建议只收口：

1. `bomNo`
2. `bomVersion`

原因：

1. 语义明确。
2. 已存在默认值或展示约束。
3. 与 BOM 行项目内容、描述字段边界清晰。

#### 1.7 明确不动范围

本轮不扩到：

1. `description`
2. `items`
3. `substitutes`
4. `standardUsage`
5. 其它工艺或路线版本字段

原因：

1. 它们不属于 BOM/ECO 当前最明确的控制字段。
2. 若混入这些字段，会明显扩大风险面。

#### 1.8 风险与控制策略

1. **误改 BOM 版本语义风险**
   - `bomVersion` 可能不仅仅是大写文本，而带有约定格式（如 `V1.0`）。
   - 控制策略：先做最小 trim/大写收口，不重写版本演进逻辑。

2. **业务编号生成语义不清风险**
   - `bomNo` 当前可能允许手输，也可能未来由后端生成。
   - 控制策略：在未确认后端生成规则前，仅补最小规范化边界。

3. **create / patch 口径不一致风险**
   - 当前 `bom-service.ts` 同时承载 POST 与 PATCH。
   - 控制策略：保存边界一次性收口，避免 create/patch 分裂。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 `use-bom-form.ts` 与 `bom-form-header.tsx`。
2. 再收口 `bom-service.ts` 的保存边界。
3. 再评估 `bom-mgmt.tsx / bom-action-dialog.tsx` 是否需要提交前兜底。
4. 如有必要，再补 `schema` 或其它契约层口径。
5. 执行定向验证并更新 `walkthrough.md`。

#### 1.10 当前阶段结论

`bomNo / bomVersion` 是当前最适合继续推进的一组 BOM/ECO 控制字段。它们既不属于自由文本，也不完全等同于此前的 machine code 或 change control 字段，因此应继续按语义分型治理，并在 BOM 表单初始化、展示、保存边界之间保持统一口径，避免后续继续依赖散落的默认值与局部展示规则。

### 1. architecture：Product/ChangeOrder 变更控制字段接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 内已经完成：

1. 属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）
2. template/type 机器字段链路（`ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`）
3. Product 主数据链路（`sku / modelCode / templateKey`）

之后，下一批最自然的字段不再是展示字段，而是 Product 与 ChangeOrder/BOM 共享的变更控制字段：

1. `revisionNo`
2. `siteCode`
3. `changeOrderNo`

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/tabs/change-orders.tsx`
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/adapters/product-api-adapter.ts`
4. `src/features/engineering/hooks/use-change-order-write-actions.ts`
5. `src/features/engineering/services/change-order-service.ts`
6. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
7. `src/features/engineering/hooks/use-bom-form.ts`

已确认的现状包括：

1. `change-orders.tsx` 中 `changeOrderNo` 输入直接 `toUpperCase()`。
2. `change-orders.tsx` 中 `siteCode` 输入直接 `toUpperCase()`。
3. `change-orders.tsx` 保存前对 `siteCode` 做了 `trim().toUpperCase()`，对 `revisionNo` 做了 `trim()`。
4. `product-api-adapter.ts` 中 `revisionNo / siteCode / changeOrderNo` 当前基本直传。
5. `default-builders.ts` 与 `use-bom-form.ts` 已为 `revisionNo` 约定默认值 `R1`，说明其格式语义已相对稳定。

#### 1.3 本轮结论

本轮若进入实施，应继续采用“按字段职责分型”的方式，而不是把三者粗暴合并为统一 uppercase 规则。

##### A. 稳定大写站点码

适用字段：

1. `siteCode`

推荐方向：

1. trim
2. 统一大写
3. 保持空值时与 `isDefaultSite` 的现有语义兼容

##### B. 大写业务单号

适用字段：

1. `changeOrderNo`

推荐方向：

1. trim
2. 统一大写
3. 不改写现有单号结构，仅做规范化

##### C. 修订号

适用字段：

1. `revisionNo`

推荐方向：

1. trim
2. 保持类似 `R1 / R2` 的业务格式语义
3. 若需做大小写统一，优先选择最小化的大写收口，而不是引入复杂重写规则

#### 1.4 推荐结构分层

##### A. 输入边界层

优先位置：

1. `change-orders.tsx`
2. `bom-form-header.tsx`

职责：

1. `changeOrderNo / siteCode` 输入与当前局部 `toUpperCase()` 逻辑统一到公共规范函数。
2. `revisionNo` 输入保留业务格式，但进入状态前也应走统一最小规范化。

##### B. 保存边界层

优先位置：

1. `change-order-service.ts`
2. `use-change-order-write-actions.ts`

职责：

1. 即便 UI 层漏掉，也能在提交前统一规范 `revisionNo / siteCode / changeOrderNo`。
2. 保证 mutation 入口与 service 保存边界口径一致。

##### C. 协议与共用主数据层

优先位置：

1. `product-api-adapter.ts`
2. `use-bom-form.ts`（若需补默认口径）

职责：

1. Product 侧 `revisionNo / siteCode / changeOrderNo` 的 DTO 出入口保持统一口径。
2. 避免 Product / ChangeOrder / BOM 三条链路各自漂移。

#### 1.5 与前几批规则的关系

当前已经形成的规则类型包括：

1. 大写机器码
2. 小写 slug 机器值
3. 稳定大写枚举键 / 引用键
4. 固定格式数字码

而本轮进一步补充的是：

1. 站点码
2. 业务单号
3. 修订号

这说明 normalization 体系已经从“码字段大小写处理”进一步扩展到“工程主数据控制字段契约治理”。

#### 1.6 推荐实施范围

第一批建议只收口：

1. `siteCode`
2. `changeOrderNo`
3. `revisionNo`

原因：

1. 语义明确。
2. 已存在局部散落规则。
3. 与标题、描述、生效日期等字段边界清晰。

#### 1.7 明确不动范围

本轮不扩到：

1. `title`
2. `description`
3. `effectiveFrom`
4. `effectiveTo`
5. 其它自由文本字段

原因：

1. 这些字段不是明确机器字段。
2. 若把日期或说明文案纳入同类规则，会明显扩大风险面。

#### 1.8 风险与控制策略

1. **误改修订号业务语义风险**
   - `revisionNo` 可能不仅仅是大写文本，还带有约定格式（如 `R1`）。
   - 控制策略：先做最小 trim/大写收口，不引入复杂格式重写。

2. **默认站点语义漂移风险**
   - `siteCode` 与 `isDefaultSite` 当前存在联动。
   - 控制策略：规范化时保留“空站点码 => 默认站点”的既有语义。

3. **Product / ChangeOrder / BOM 口径不一致风险**
   - 这些字段同时出现在多个链路上，若只改一处会造成继续漂移。
   - 控制策略：至少同步评估输入层、service 层、adapter 层与 BOM 关联读取层。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 `change-orders.tsx` 的输入与提交边界。
2. 再收口 `change-order-service.ts` 与 `use-change-order-write-actions.ts`。
3. 再收口 `product-api-adapter.ts` 的 DTO 出入口。
4. 最后评估 `bom-form-header.tsx / use-bom-form.ts` 是否需要同步口径补齐。
5. 执行定向验证并更新 `walkthrough.md`。

#### 1.10 当前阶段结论

`revisionNo / siteCode / changeOrderNo` 是当前最适合继续推进的一组 engineering 变更控制字段。它们不属于展示文案，也不完全等同于此前的 machine code，因此应继续按语义分型治理，并在 ChangeOrder、Product、BOM 三条相邻链路上保持统一收口，避免后续再出现控制字段契约漂移。

### 1. architecture：Product 主数据链路接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 内已完成：

1. 属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）
2. template/type 机器字段链路（`ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`）

之后，下一批仍属于 engineering 主数据域、且字段语义明确的候选点，是 `Product` 本体上的：

1. `sku`
2. `modelCode`
3. `templateKey`

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/components/product/product-basic-info.tsx`
2. `src/features/engineering/hooks/use-product-form-derive.ts`
3. `src/features/engineering/hooks/use-product-form-submit.ts`
4. `src/features/engineering/utils/product-form-utils.ts`
5. `src/features/engineering/adapters/product-api-adapter.ts`

已确认的现状包括：

1. `modelCode` 在 UI 输入层已有明确规则：仅允许数字，并限制为 2 位。
2. `sku` 在前端主要通过 `deriveSku(typeCode, modelCode, versionLevel)` 派生。
3. `sku` 的唯一性校验已存在，但当前是基于值比较，不是统一规范化后的比较。
4. `templateKey` 当前在 schema / adapter 中存在，但未见显式 normalization 收口。

#### 1.3 本轮结论

本轮若进入实施，应继续采用“按字段语义分型”的方式，而不是把三者粗暴合并为一个 normalize 规则。

##### A. 业务编码

适用字段：

1. `Product.sku`

推荐方向：

1. trim
2. 统一大写
3. 保持派生格式（如 `TYPECODE-01-V1`）不被意外破坏

##### B. 固定数字码

适用字段：

1. `Product.modelCode`

推荐方向：

1. 仅保留数字
2. 截断到 2 位
3. 必要时在派生/保存边界补默认值（如 `01`）

##### C. 稳定引用键

适用字段：

1. `Product.templateKey`

推荐方向：

1. trim
2. 统一大写
3. 保持为引用键语义，不做 slug 化

#### 1.4 推荐结构分层

##### A. 输入边界层

优先位置：

1. `product-basic-info.tsx`
2. 若其它 product 编辑组件也能输入这些字段，需要补充盘点

职责：

1. `modelCode` 保持 2 位数字约束。
2. `sku` 若允许手工录入，需确认是否应统一大写。
3. `templateKey` 若存在可编辑入口，需要按稳定大写键处理。

##### B. 派生链路层

优先位置：

1. `use-product-form-derive.ts`
2. `product-form-utils.ts`

职责：

1. `deriveSku` 输出值要与最终保存边界口径一致。
2. `buildBatchProducts / buildSingleVariantProduct` 中对 `sku` 的生成需要统一规范。
3. SKU 唯一性校验最好基于统一规范后的值进行比较。

##### C. 协议与保存边界层

优先位置：

1. `product-api-adapter.ts`
2. 若保存链路中有 `ProductCoreService` 或其它 service 边界，也应继续评估

职责：

1. API -> contract 与 contract -> API DTO 的 `sku / modelCode / templateKey` 保持统一口径。
2. 即便 UI 或前端派生逻辑变动，也不会把脏值直接送进保存链路。

#### 1.5 与前几批规则的关系

当前已形成的规则类型包括：

1. 大写机器码
2. 小写 slug 机器值
3. 稳定大写枚举键

而本轮 `Product` 主数据链路进一步引入：

1. 固定数字码（`modelCode`）
2. 大写业务编码（`sku`）
3. 稳定引用键（`templateKey`）

这意味着 normalization 体系已经不应再被理解为“单一 uppercase/lowercase 规则”，而是按字段职责分族治理。

#### 1.6 推荐实施范围

第一批建议只收口：

1. `Product.sku`
2. `Product.modelCode`
3. `Product.templateKey`

原因：

1. 都是 `Product` 本体上的明确机器字段。
2. 已存在局部派生或格式约束。
3. 与展示字段、属性值字段边界清晰。

#### 1.7 明确不动范围

本轮不扩到：

1. `name`
2. `description`
3. `restrictions`
4. `attributeValues`
5. 其它自由文本字段

原因：

1. 这些字段不属于明确机器字段。
2. `attributeValues` 已按上一批“小写 slug 机器值”独立收口，不应混改。

#### 1.8 风险与控制策略

1. **误改 SKU 业务语义风险**
   - `sku` 不只是一个展示字段，还与唯一性校验、批量派生直接相关。
   - 控制策略：不改 SKU 的业务拼接规则，只补规范化边界。

2. **数字码与大写码混淆风险**
   - `modelCode` 是固定数字码，不能误用大写机器码规则。
   - 控制策略：为 `modelCode` 保持数字专用规则。

3. **templateKey 漂移风险**
   - 若继续直传，未来不同入口可能写出大小写不一致的引用键。
   - 控制策略：在 adapter / 保存边界补统一大写键兜底。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 `product-basic-info.tsx` 的输入边界。
2. 再收口 `use-product-form-derive.ts` 与 `product-form-utils.ts` 的 SKU 派生链路。
3. 再收口 `product-api-adapter.ts` 的 DTO 出入口。
4. 如有必要，再补 `ProductCoreService` 或其它保存边界。
5. 最后执行定向验证并更新 `walkthrough.md`。

#### 1.10 当前阶段结论

`Product` 主数据链路是当前最自然的下一步，但它不是简单地“继续 uppercase”。它同时包含业务编码、数字码、引用键三类不同语义的机器字段。因此，下一步最合理的方式是继续按分型治理推进 `sku / modelCode / templateKey`，先统一输入、派生、adapter 与保存边界，再决定是否继续向更广的 Product 字段扩展。

### 1. architecture：engineering template/type 机器值接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 engineering 的属性值链路（`ProductAttributeCategory.key / ProductAttributeOption.value`）已经收口后，下一批仍留在 engineering 内部、且字段语义较明确的候选点是：

1. `ProductTemplate.code`
2. `ProductTemplate.componentKey`
3. `ProductType.code`

这几个字段都属于“机器值 / 程序键 / 内部代码”范畴，但它们的规则并不完全相同，因此仍需要**分型处理**。

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. `src/features/engineering/services/product-template-service.ts`
3. `src/features/engineering/adapters/product-template-api-adapter.ts`
4. `src/features/engineering/hooks/use-product-template-write-actions.ts`
5. `src/features/engineering/components/product-type-action-dialog.tsx`
6. `src/features/engineering/services/product-type-service.ts`
7. `src/features/engineering/adapters/product-type-api-adapter.ts`

已确认的现状包括：

1. `template-mgmt.tsx` 中 `code` 输入直接做了 `toUpperCase()`，说明它目前被当作大写码处理。
2. `ProductTemplate.componentKey` 目前来自受限选择项（如 `GENERAL` / `RIM` / `FORK`），属于稳定枚举键，不是自由文本。
3. `product-type-action-dialog.tsx` 中已有基于名称自动拼接大写 token 的逻辑，但没有把 `code` 输入边界与保存边界统一收口。
4. `product-template` 与 `product-type` 的 adapter / service 层仍基本直传 `code / componentKey`。

#### 1.3 本轮结论

本轮若进入实施，应把这批字段拆成两类处理：

##### A. 大写机器码

适用字段：

1. `ProductTemplate.code`
2. `ProductType.code`

推荐规则：

1. trim
2. 必要时清理空白
3. 统一转大写

##### B. 稳定大写枚举键

适用字段：

1. `ProductTemplate.componentKey`

推荐规则：

1. trim
2. 统一转大写
3. 保持受限键集合语义，不引入 slug 化

#### 1.4 推荐结构分层

##### A. 输入边界层

优先位置：

1. `template-mgmt.tsx`
2. `product-type-action-dialog.tsx`

职责：

1. `template.code` 输入时统一按大写机器码规范收口。
2. `productType.code` 输入与自动生成 token 逻辑保持同一规范口径。
3. `componentKey` 保持受限选择，但进入状态前仍做统一大写键收口。

##### B. 服务保存边界层

优先位置：

1. `product-template-service.ts`
2. `product-type-service.ts`

职责：

1. 在保存前对 `code / componentKey` 做最终规范化兜底。
2. 避免未来更换 UI 入口后重新漏掉。

##### C. 适配层与写动作层

优先位置：

1. `product-template-api-adapter.ts`
2. `product-type-api-adapter.ts`
3. `use-product-template-write-actions.ts`
4. 若存在 `product-type` 的 write actions，也需评估是否一起收口

职责：

1. 保证 contract <-> DTO 的码字段口径一致。
2. 保证 mutation 入口与 service 保存边界一致。

#### 1.5 与上一批 engineering 属性值链路的区别

上一批 engineering 属性值链路是：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

它们采用的是**小写 slug 风格机器值**。

而本轮的：

1. `ProductTemplate.code`
2. `ProductType.code`
3. `ProductTemplate.componentKey`

更接近：

1. 大写机器码
2. 大写枚举键

因此，本轮不应复用 `product-attribute-machine-value.ts`，而应回到大写码 / 大写键语义。

#### 1.6 推荐实施范围

第一批建议只收口：

1. `ProductTemplate.code`
2. `ProductTemplate.componentKey`
3. `ProductType.code`

原因：

1. 语义清晰。
2. 已存在局部大小写处理，说明团队已默认其为机器字段。
3. 与 `name / description / label` 等展示字段边界清晰。

#### 1.7 明确不动范围

本轮不扩到：

1. `name`
2. `description`
3. `Product.attributeValues`
4. 其它自由文本字段

原因：

1. 这些字段不是明确的码或程序键。
2. `Product.attributeValues` 已按上一批“小写 slug 风格机器值”独立收口，不应被混改。

#### 1.8 风险与控制策略

1. **误混规则风险**
   - 若把 `componentKey` 或 `template/type code` 套进工程属性的小写 slug 规则，会破坏现有大写语义。
   - 控制策略：显式区分“大写机器码/枚举键”和“小写 slug 机器值”两类规则。

2. **只改页面不改保存边界风险**
   - 若只改 `template-mgmt` 或 `dialog`，未来其它入口仍可能绕过。
   - 控制策略：service / adapter / write actions 一并评估。

3. **自动生成 code 与手输 code 漂移风险**
   - `product-type-action-dialog` 已有自动拼 token 逻辑，若不统一输入与保存边界，手输值可能与自动值规则不一致。
   - 控制策略：让自动生成与手输都落到同一规范函数上。

#### 1.9 推荐推进顺序

建议若进入实施，按以下顺序推进：

1. 先收口 `template-mgmt.tsx` 与 `product-type-action-dialog.tsx` 的输入边界。
2. 再收口 `product-template-service.ts` 与 `product-type-service.ts` 的保存边界。
3. 再收口 `product-template-api-adapter.ts`、`product-type-api-adapter.ts` 与 `use-product-template-write-actions.ts`。
4. 最后执行定向验证并更新 `walkthrough.md`。

#### 1.10 当前阶段结论

engineering 下一批最合理的目标不是继续横向扩大到所有 schema 字段，而是继续沿着“明确机器字段”推进到 `ProductTemplate.code / ProductTemplate.componentKey / ProductType.code`。这一批与上一轮工程属性值不同，应该按“大写机器码 + 大写枚举键”分型处理，再分别在输入层、保存边界、adapter、write actions 上做统一收口。

### 1. architecture：工程属性值模块接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在 PDA / scan-platform / warehouse-category / production shared 等模块已经完成第一批与第二批收口后，下一批最适合推进的是工程属性值模块。

但该模块与此前已经接入的 `normalizeMachineCode` 规则并不完全相同。

工程属性中的机器值（如属性分类 key、属性选项 value）当前已有独立规则，目标更接近：

1. 去首尾空白
2. 将空格与下划线折叠为 `-`
3. 移除非法字符
4. 连字符压缩
5. 最终转为小写

因此，本轮不应把它粗暴并入“全大写机器码”规则，而应在全局规范化体系下，保留并继续强化其**独立机器值契约**。

#### 1.2 当前现状判断

当前已识别的关键文件包括：

1. `src/features/engineering/utils/product-attribute-machine-value.ts`
2. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
3. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
4. `src/features/engineering/services/product-attribute-category-service.ts`
5. `src/features/engineering/services/product-attribute-option-service.ts`
6. `src/features/engineering/hooks/use-product-attribute-write-actions.ts`

当前最明确的机器值字段包括：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

#### 1.3 本轮结论

本轮若进入实施，应将工程属性值模块定义为“**小写 slug 风格机器值规范**”模块，而不是“通用大写机器码模块”。

也就是说：

1. 该模块继续使用 `product-attribute-machine-value.ts` 的契约。
2. 不直接替换为 `normalizeMachineCode`。
3. 但其输入边界、保存边界、写入动作仍应按“统一规范层”的思想收口。

#### 1.4 推荐结构分层

##### A. 输入边界层

优先位置：

1. `product-attribute-category-dialog.tsx`
2. `product-attribute-option-dialog.tsx`

职责：

1. 用户输入 `key / value` 时即时使用工程属性专用机器值规范函数。
2. 减少大小写、空格、下划线等输入漂移。

##### B. 服务保存边界层

优先位置：

1. `product-attribute-category-service.ts`
2. `product-attribute-option-service.ts`

职责：

1. 在保存前对 `key / value` 执行最终规范化兜底。
2. 保证即使未来换 UI 入口，也不会绕过规则。

##### C. 写动作与适配层

优先位置：

1. `use-product-attribute-write-actions.ts`
2. 若存在 adapter / DTO 映射层，则继续评估是否补最后一道兜底

职责：

1. 保证 optimistic update / save action 与 service 口径一致。
2. 避免“UI 已规范、写动作未规范”的漂移。

#### 1.5 规则差异说明

此前已经收口的模块主要分两类：

1. 大写机器码：如 PDA 原始码、物料码、设备码、仓库分类码、产线/工序 code
2. 小写机器值：如工程属性 `key / value`

因此，本轮必须显式保持这两类规则并存，而不是试图统一成单一大小写策略。

#### 1.6 推荐实施范围

第一批建议只收口：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

原因：

1. 语义最明确。
2. 已有专用规范函数。
3. 与显示字段、国际化标签字段边界清晰。

#### 1.7 明确不动范围

本轮不扩到：

1. `labelZh`
2. `labelEn`
3. `nameZh`
4. `nameEn`
5. 其它展示描述字段

原因：

1. 它们是展示文案，不是机器值。
2. 粗暴小写化或 slug 化会直接破坏业务语义。

#### 1.8 风险与控制策略

1. **误用大写机器码规则风险**
   - 若把 `normalizeMachineCode` 直接套到属性 key/value，会破坏现有小写 slug 约定。
   - 控制策略：继续使用 `product-attribute-machine-value.ts` 的专用规则。

2. **只改 dialog 不改 service 风险**
   - 若只在输入层处理，未来其它入口保存仍会漏。
   - 控制策略：dialog 输入层和 service 保存边界都要收口。

3. **写动作层漂移风险**
   - 若 write actions / optimistic update 不对齐，会出现本地态与服务提交口径不一致。
   - 控制策略：评估并补写动作层兜底。

#### 1.9 推荐推进顺序

建议后续若进入代码实施，按以下顺序推进：

1. 先收口 `product-attribute-category-dialog.tsx` 与 `product-attribute-option-dialog.tsx` 的输入边界。
2. 再收口 `product-attribute-category-service.ts` 与 `product-attribute-option-service.ts` 的保存边界。
3. 再评估 `use-product-attribute-write-actions.ts` 是否增加统一机器值兜底。
4. 最后执行定向验证并更新 `walkthrough.md`。

#### 1.10 当前阶段结论

工程属性值模块是“全局码规范化”中的下一类特例：它不属于大写机器码，而属于小写 slug 风格机器值。下一步最合理的方向不是强行复用 `normalizeMachineCode`，而是在全局规范化框架下，继续明确并收口 `ProductAttributeCategory.key / ProductAttributeOption.value` 的专用规范契约与输入/保存边界。

### 1. architecture：生产共享资源模块接入全局码规范化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在公共 `code-normalization.ts` 已建立，并已先收口 PDA / scan-platform / queue / warehouse-category 之后，下一批最合适的模块是生产共享资源（production shared）。

但经过排查，真正需要接入的重点并不是：

1. `production-resource-service.ts`
2. `production-resource-sync.ts`

因为这两个文件主要承担：

1. 服务聚合
2. 事件分发
3. 失效通知

它们不是编码字段的真实输入或保存边界。

#### 1.2 当前现状判断

当前在生产共享资源链路中，最值得优先收口的机器值字段包括：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

已识别的关键位置：

1. `src/features/production-shared/services/production-lines-service.ts`
2. `src/features/production-shared/services/production-processes-service.ts`
3. `src/features/production-shared/adapters/production-resource-api-adapter.ts`
4. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

当前特征是：

1. `code` 字段已存在明确语义。
2. 前端表单保存时仍有局部 `trim()` 逻辑。
3. adapter DTO 出口当前直接透传 `line.code / step.code`。
4. `sync` 文件本身没有码规范化需求。

#### 1.3 本轮结论

本轮若进入实施，应把生产共享资源模块理解为“明确的机器码保存边界模块”，而不是“事件同步模块”。

也就是说，本轮应优先收口：

1. 表单输入边界
2. 保存边界
3. DTO 出口兜底边界

而不是去改动同步通知本身。

#### 1.4 推荐结构分层

##### A. 表单输入层

优先位置：

1. `process-library-panel.tsx`
2. 其它工作架构或 production-shared 相关编辑表单

职责：

1. 用户输入 `code` 时即时走公共 normalization。
2. 避免大小写漂移在 UI 层继续扩散。

##### B. 服务保存边界层

优先位置：

1. `production-lines-service.ts`
2. `production-processes-service.ts`

职责：

1. 在提交保存前对 `line.code / step.code` 做最终规范化。
2. 保证即使未来换 UI 入口，也不会绕过规则。

##### C. DTO 适配层

优先位置：

1. `production-resource-api-adapter.ts`

职责：

1. 评估是否需要在 API DTO 出口增加最后一道规范化兜底。
2. 作为防腐层保证前端内部对象流转与后端协议输出的一致性。

#### 1.5 推荐实施范围

第一批建议先接入：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

原因：

1. 这两个字段语义最明确。
2. 与此前已建立的 `normalizeMachineCode` 契约最匹配。
3. 风险相对可控，不会误伤 `name / description / attributes` 等非机器码字段。

#### 1.6 与 production-resource-sync 的边界

当前明确不将以下内容纳入码规范化：

1. `PRODUCTION_LINES_UPDATED_EVENT`
2. `PRODUCTION_PROCESSES_UPDATED_EVENT`
3. `kind: 'lines' | 'processes'`

原因：

1. 它们属于事件协议键。
2. 当前已具有稳定语义。
3. 并不属于“用户输入的机器码 / 人工输入码”问题域。

#### 1.7 风险与控制策略

1. **误伤非机器字段风险**
   - 若把 `name / description / attributes` 也纳入统一大写，会直接破坏业务含义。
   - 控制策略：本轮只动 `code` 字段。

2. **只改表单不改保存边界风险**
   - 若只在 `process-library-panel` 改，换入口仍可能漏。
   - 控制策略：表单输入层和服务保存边界都要收口。

3. **adapter 透传漂移风险**
   - 若内部对象未规范，adapter 直接透传会把漂移继续送到后端。
   - 控制策略：评估 adapter 层增加最终兜底规范化。

#### 1.8 推荐推进顺序

建议后续若进入代码实施，按以下顺序推进：

1. 先为 `ProductionLine.code / ProductionProcessStep.code` 接入公共 normalization。
2. 再收口 `process-library-panel` 等表单输入边界。
3. 再评估 `production-resource-api-adapter.ts` 是否增加 DTO 出口兜底。
4. 最后执行定向验证并更新 `walkthrough.md`。

#### 1.9 当前阶段结论

生产共享资源模块的下一步重点，不在 `production-resource-sync.ts` 这种事件分发层，而在 `line.code / step.code` 的真实输入与保存边界。最合理的实施方式是只针对明确的机器码字段接入公共 normalization，避免扩大到名称、描述、attributes 等非机器值字段。

### 1. architecture：机器码 / 人工输入码全局规范化扩展方案

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前项目中已经存在“码规范化”动作，但主要分散在 PDA、扫码解析、队列 dedupe 和个别业务表单中，尚未形成全局统一能力。

这意味着：

1. 局部场景已经做过一定抽取。
2. 但新增工业流程仍可能继续各自写 `trim().toUpperCase()`。
3. 机器码与人工输入码缺少项目级统一入口，容易继续漂移。

因此，本轮真正需要推进的不是“补一个组件”，而是把现有局部抽取升级为一个可复用、可扩展、按码类型分层的规范化能力。

#### 1.2 当前现状判断

当前已识别的落点包括：

1. `src/features/terminal-config/tabs/pda-shell.tsx`
2. `src/features/terminal-config/tabs/pda-terminal.tsx`
3. `src/features/terminal-config/services/pda-shell-queue-service.ts`
4. `src/features/scan-platform/services/logistics-inbound-resolution-service.ts`
5. `src/features/scan-platform/services/wheel-trace-parser-service.ts`
6. `src/features/warehouse/tabs/warehouse-category.tsx`

这些位置已经说明“码规范化”并非完全缺失，但问题在于它们仍是：

1. 局部函数
2. 组件内规则
3. 服务内局部规则
4. 缺少统一契约与公共出口

#### 1.3 本轮结论

本轮的结论不是“从零开始设计规范化”，而是：

1. 现有工作属于**局部抽取**。
2. 目前缺少的是**全局统一规范层**。
3. 当前问题更适合定义为“之前做过，但没做完 / 做漏了”。

#### 1.4 推荐架构分层

##### A. 公共规范函数层

建议新增独立目录，例如：

1. `src/lib/codecs/`
2. 或 `src/lib/code-normalization/`

职责：

1. 承载所有码类型规范函数。
2. 提供明确、可复用的 normalization contract。
3. 避免组件和服务继续散落 `trim().toUpperCase()`。

##### B. 扫码主链接入层

优先接入：

1. `pda-shell`
2. `pda-terminal`
3. `scan-platform`
4. `pda-shell-queue-service`

职责：

1. 所有扫码输入统一走公共规范函数。
2. 解析器与队列 dedupe 复用同一套规则。

##### C. 业务保存边界层

后续接入：

1. `warehouse-category.code`
2. `engineering` 相关机器值（如 `category.key / option.value`）
3. 其它显式机器码字段

职责：

1. 输入层可做即时规范化体验。
2. 保存层必须做最终规范化兜底。

#### 1.5 规范函数拆分建议

本轮不建议只提供一个万能 `normalizeCode(value)`。

建议至少按语义拆出：

1. `normalizeMachineCode(value)`
2. `normalizeTrackingCode(value)`
3. `normalizeMaterialCode(value)`
4. `normalizeDeviceCode(value)`
5. `normalizeSceneKey(value)`
6. 如有需要，再补 `normalizeHumanEnteredCode(value)`

原因：

1. 不同字段的规范不完全相同。
2. 有的要全大写。
3. 有的只应 `trim`。
4. 有的要保留特定符号。
5. 有的更适合小写 key / slug 语义。

#### 1.6 推荐第一批实施范围

第一批建议先收口扫码主链：

1. `src/features/terminal-config/tabs/pda-shell.tsx`
2. `src/features/terminal-config/tabs/pda-terminal.tsx`
3. `src/features/terminal-config/services/pda-shell-queue-service.ts`
4. `src/features/scan-platform/services/logistics-inbound-resolution-service.ts`
5. `src/features/scan-platform/services/wheel-trace-parser-service.ts`

推荐原因：

1. 这些入口最像工业流程的真实入口。
2. 扫码场景最容易因为大小写与空白差异造成 dedupe、匹配或解析漂移。
3. 先统一这条主链，可以最快看到“全局规范化”的真实收益。

#### 1.7 第二批实施范围

在扫码主链收口后，再进入业务保存边界：

1. `src/features/warehouse/tabs/warehouse-category.tsx`
2. 工程属性等显式机器值管理页面
3. 其它保存边界中对 `code / key / value` 的机器字段处理

#### 1.8 本轮边界控制

本轮明确不做：

1. 不对所有输入字段无差别强制转大写。
2. 不在未区分字段语义前全局搜索替换 `trim().toUpperCase()`。
3. 不跳过服务层与保存边界，单靠组件层修补。

#### 1.9 风险与控制策略

1. **过度统一风险**
   - 若把所有码都压成同一规则，可能破坏 slug / key / scene 等字段语义。
   - 控制策略：按码类型建立独立函数契约。

2. **只改输入层不改保存层风险**
   - 若只在组件里清洗，换入口后仍会漏。
   - 控制策略：输入层做体验规范化，保存层做最终兜底规范化。

3. **扫码链与队列 dedupe 口径不一致风险**
   - 若解析前与队列 dedupe 使用不同规则，会继续出现同码不同键问题。
   - 控制策略：让扫码主链与队列统一复用公共规范函数。

#### 1.10 推荐推进顺序

建议后续若进入代码实施，按以下顺序推进：

1. 先建立公共 `code normalization` 目录与函数契约。
2. 先收口 `pda-shell / pda-terminal / scan-platform / pda-shell-queue-service`。
3. 再收口 `warehouse-category` 等业务机器码保存边界。
4. 最后视情况继续扩大到更多工业流程输入点。

#### 1.11 当前阶段结论

当前问题不应再被理解为“只有一个组件在处理大小写”，而应理解为：此前已在 PDA / 扫码等局部场景做过规范化抽取，但尚未形成全局统一能力。下一步最合理的方向不是继续在单个组件里补 `toUpperCase()`，而是建立一个按码类型拆分的公共规范函数层，并优先收口工业流程的扫码主链。

### 1. architecture：右侧悬浮小手柄快捷扫描入口方案

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前现场作业类页面已经逐步具备扫描、离线队列、冲突处理等能力，但入口仍偏模块化导航：用户需要先进入业务模块，再找到对应扫描页或扫描态入口。

这对高频岗位（如库管、收货、出库、盘点现场）仍然偏慢，尤其在手机 / PDA 终端场景下，理想方式应更接近：

1. 页面右侧有一个始终可达的小手柄。
2. 点击后展开可用快捷扫描动作。
3. 用户点击动作后直接进入对应扫描页。
4. 页面默认进入扫描态。

本轮目标不是做一个新的导航系统，而是在现有模块和离线架构之上增加一个面向现场作业的快捷入口层。

#### 1.2 目标形态结论

本轮明确采用：

1. **右侧悬浮小手柄**
2. **快捷动作抽屉 / 面板**
3. **按权限过滤显示**
4. **点击动作后直接跳转扫描态**

本轮明确不采用：

1. 不采用独立 Tab 管理页作为主入口形态。
2. 不采用账号硬编码动作表。
3. 不新建第二套路由协议或离线协议。

#### 1.3 推荐结构分层

##### A. 快捷入口层

职责：

1. 渲染右侧小手柄。
2. 展开 / 收起快捷动作面板。
3. 根据当前权限集过滤动作。
4. 负责点击动作后跳转到目标扫描页。

建议目录：

1. `src/features/quick-actions/data/quick-action-registry.ts`
2. `src/features/quick-actions/services/quick-action-access.ts`
3. `src/features/quick-actions/components/quick-action-handle.tsx`
4. `src/features/quick-actions/components/quick-action-drawer.tsx`

##### B. 扫描页接入层

职责：

1. 接收 `mode=scan` 或等效参数。
2. 页面进入后直接聚焦扫描输入。
3. 若页面本身支持 PDA / 手机扫描，默认进入扫描工作流。

##### C. 业务与离线层

职责保持不变：

1. 仍由原业务模块页面、Hook、adapter 承担。
2. 仍由既有离线基础设施承接离线队列与冲突治理。

#### 1.4 权限策略建议

本轮建议采用：

1. **快捷动作按权限过滤显示**。
2. 不按账号单独硬编码动作白名单。
3. 快捷动作与权限之间建立配置映射。

推荐字段模型：

1. `id`
2. `title`
3. `icon`
4. `targetRoute`
5. `scanMode`
6. `requiredPermissions`
7. `enabled`
8. `sortOrder`

这样可以保证：

1. 库管账号只看到入库 / 出库 / 盘点等可用动作。
2. 其它岗位只看到自己允许使用的扫描入口。
3. 不破坏现有权限体系的单一事实来源。

#### 1.5 与现有权限体验策略的边界

当前推荐边界是：

1. **主导航层**仍保持既有模块发现策略。
2. **快捷动作层**可以按权限直接过滤显示。

原因：

1. 主导航是模块级入口，偏“发现”和“排障”。
2. 快捷动作是岗位级作业入口，偏“高频执行”。

这意味着“主菜单尽量可见”和“快捷动作只显示可用项”可以同时成立，不冲突。

#### 1.6 与现有离线架构的兼容边界

本轮必须明确保持以下硬约束：

1. 手机扫码与 PDA 扫码**共用同一套离线体系**。
2. 快捷入口层不能再造第二套离线协议。

必须继续复用：

1. `offline-sync`
2. `stocktake-offline-adapter`
3. `pending_log`
4. `conflict_records`

也就是说，右侧小手柄只是：

1. 入口层
2. 权限过滤层
3. 扫描态跳转层

它不负责重建业务同步语义。

#### 1.7 首批快捷动作建议范围

建议先从高频、已具备扫描基础的动作开始：

1. `warehouse inbound`
2. `warehouse outbound`
3. `pda stocktake`

理由：

1. 现场价值高。
2. 与“直接扫”交互最匹配。
3. 能优先验证快捷入口层是否真正提升现场效率。

#### 1.8 扫描态跳转建议

建议每个快捷动作都指向既有业务页，并附带扫描态参数，例如：

1. `/warehouse/inbound?mode=scan`
2. `/warehouse/outbound?mode=scan`
3. `/pda-stocktake?mode=scan`

页面收到该参数后：

1. 自动进入扫描工作流。
2. 自动聚焦扫描输入。
3. 优先呈现适合手机 / PDA 的交互。

#### 1.9 预期修改范围

本轮若进入执行，预期主要涉及：

1. 新增 `quick-actions` 入口层目录与组件
2. 侧边布局或全局壳层中挂载右侧小手柄
3. 首批扫描页增加 `mode=scan` 进入能力
4. 权限过滤逻辑接入既有权限服务

#### 1.10 本轮边界控制

本轮明确不做：

1. 不新建第二套离线同步协议。
2. 不把快捷入口做成新的完整导航系统。
3. 不把动作与具体账号硬编码绑定。
4. 不在本轮扩大为所有模块全部接入快捷扫描。

#### 1.11 风险与控制策略

1. **快捷入口与主导航语义冲突风险**
   - 若快捷入口承担过多模块导航职责，会和主导航重复。
   - 控制策略：快捷入口只承载高频现场动作，不承载完整模块发现。

2. **权限过滤口径漂移风险**
   - 若快捷动作自己维护一套权限判断，后续容易与主权限体系分叉。
   - 控制策略：继续复用现有权限服务与权限契约。

3. **扫描态路由碎片化风险**
   - 若每个页面自己定义不同扫描参数，后续会越来越乱。
   - 控制策略：统一采用明确的扫描态参数约定（如 `mode=scan`）。

4. **手机扫码与 PDA 扫码分叉风险**
   - 若快捷入口为手机再造一套离线流程，会直接破坏当前离线架构。
   - 控制策略：手机 / PDA 只在 UI 与扫描能力接入上区分，离线层继续复用同一套体系。

#### 1.12 推荐推进顺序

建议后续若进入代码实施，按以下顺序推进：

1. 先建立快捷动作注册表与权限过滤函数。
2. 实现右侧小手柄与快捷抽屉 UI。
3. 为首批扫描页补齐 `mode=scan` 直接进入能力。
4. 定向验证移动端 / PDA 场景下的交互与权限表现。

#### 1.13 当前阶段结论

当前最适合的方案不是再建一个独立 Tab 管理页，而是在现有系统右侧增加一个面向现场作业的悬浮小手柄。它只负责“按权限展示快捷扫描动作，并一键进入扫描态页面”，同时继续复用既有 `offline-sync` 与模块 adapter，不再制造第二套手机扫码离线协议。

### 1. architecture：PDA 盘点扫描链路离线 SDRTS 试点细化方案

日期：2026-04-12  
状态：待批准

#### 1.1 试点目标

本轮在“首批试点选择”为 PDA 盘点扫描链路之后，继续把该试点细化到可施工粒度。目标不是立刻铺开所有离线能力，而是先为 PDA 盘点扫描构建一个最小可闭环的离线 SDRTS 样板。

该样板应至少验证：

1. 本地 Delta / Intent 入队
2. IndexedDB 持久化
3. 页面刷新后可恢复
4. 联网后 replay / flush
5. 幂等重试
6. 字段级冲突升级

#### 1.2 试点范围分期

##### Phase A：`pdaSubmitScan`

目标：

1. 以单条扫描写入验证最小入队 -> 恢复 -> 补交闭环。
2. 优先打通离线基础设施层与一个简单 adapter。

##### Phase B：`pdaBulkSync`

目标：

1. 验证批量日志与批次 replay。
2. 验证失败拆分、批量 ack、批次幂等策略。

##### Phase C：`pdaPatchItem`

目标：

1. 引入 `DeltaSet + version + intent` 场景。
2. 验证版本优先、字段级冲突、人工升级边界。

#### 1.3 推荐目录结构

##### A. 公共基础设施层

建议新建：

1. `src/offline-sync/types/`
2. `src/offline-sync/storage/`
3. `src/offline-sync/queue/`
4. `src/offline-sync/replay/`
5. `src/offline-sync/conflict/`
6. `src/offline-sync/core/`

职责：

1. Dexie / IndexedDB schema
2. `snapshot / pending_log / sync_meta` 访问
3. 队列状态迁移
4. replay / flush 编排
5. 冲突记录管理

##### B. PDA 试点 adapter 层

建议新建：

1. `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
2. `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
3. 如有必要，再补：
   - `stocktake-offline-conflict.ts`
   - `stocktake-offline-replay.ts`

职责：

1. 定义 PDA 扫描实体与 path 规则
2. 定义日志压缩规则
3. 定义冲突判定与升级条件
4. 定义如何调用既有 `StocktakeMaintenanceService` 完成正式提交

##### C. 页面 / Hook 调用层

PDA 页面、Hook 或 bridge 层只应调用：

1. `enqueueScanIntent(...)`
2. `flushPendingStocktake(...)`
3. `resolveStocktakeConflict(...)`

不得直接访问 Dexie / IndexedDB。

#### 1.4 最小本地表结构建议

##### A. `stocktake_snapshots`

建议字段：

1. `entityType`
2. `entityId`
3. `version`
4. `data`
5. `syncedAt`

##### B. `pending_deltas`

建议字段：

1. `opId`
2. `clientId`
3. `entityType`
4. `entityId`
5. `path`
6. `o`
7. `n`
8. `baseVersion`
9. `intent`
10. `createdAt`
11. `state` (`queued / syncing / conflict / expired`)
12. `batchId`（Phase B 起需要）

##### C. `sync_meta`

建议字段：

1. `entityType`
2. `entityId`
3. `latestAckVersion`
4. `lastSyncAt`
5. `hasConflict`
6. `queueState`

##### D. `conflict_records`（可选）

建议在进入 `pdaPatchItem` 阶段时引入，用于保存：

1. `opId`
2. `path`
3. `serverValue`
4. `localOldValue`
5. `localNewValue`
6. `resolutionState`

#### 1.5 最小接口草案

##### 公共层接口

1. `enqueueDelta(delta)`
2. `getPendingByEntity(entityType, entityId)`
3. `saveSnapshot(snapshot)`
4. `getSnapshot(entityType, entityId)`
5. `flushEntity(entityType, entityId)`
6. `markConflict(opId, detail)`

##### PDA adapter 接口

1. `enqueueScanIntent(payload)`
2. `enqueueBulkScanIntents(payloads)`
3. `enqueuePatchItemDelta(id, delta, version)`
4. `compressPendingStocktakeLogs(logs)`
5. `detectStocktakeConflict(serverSnapshot, log)`
6. `buildStocktakeSubmission(logs)`

#### 1.6 replay 规则建议

##### Phase A

1. 单条日志直接 replay。
2. 失败则保留在 `queued`。
3. 成功后写 ack、更新 `snapshot / sync_meta`。

##### Phase B

1. 批次日志优先按 `batchId` 聚合。
2. 对同实体、同路径可做压缩。
3. 批次失败时允许拆分重试。

##### Phase C

1. 先拉取服务端最新快照与版本。
2. 以 `baseVersion` 优先判断。
3. 同 path 冲突进入 `conflict_records`，并暂停自动重放。

#### 1.7 冲突边界建议

PDA 首批试点里建议区分两类：

1. **可自动合并**
   - 不同 path
   - 服务端当前值仍等于本地 `o`

2. **必须人工升级**
   - 同 path 且 `serverCurrent != o`
   - 高风险数量 / 状态字段冲突

这样可以避免首批试点一上来就做过度复杂的自动语义合并。

#### 1.8 与现有体系的兼容方式

PDA 试点必须继续通过既有正式边界提交：

1. `pdaSubmitScan` 最终仍走 `StocktakeMaintenanceService.pdaSubmitScan`
2. `pdaBulkSync` 最终仍走 `StocktakeMaintenanceService.pdaBulkSync`
3. `pdaPatchItem` 最终仍走 `StocktakeMaintenanceService.pdaPatchItem`

离线层只负责：

1. 延迟提交
2. 本地日志化
3. replay / flush
4. 冲突升级

不得替代既有 service / command 边界。

#### 1.9 推荐推进顺序

建议后续若进入代码实施，按以下顺序推进：

1. 先建立 `offline-sync/types + storage` 最小骨架
2. 再建立 `pending_log / sync_meta` 基础访问层
3. 再接 `stocktake-offline-adapter` 的 `pdaSubmitScan`
4. 打通单条 replay 后，再推进 `pdaBulkSync`
5. 最后再进入 `pdaPatchItem` 的冲突链路

#### 1.10 当前阶段结论

PDA 盘点扫描链路已经可以被细化为一个明确可施工的试点：公共层先落最小 `snapshot / pending_log / sync_meta`，模块侧只给 `stocktake` 提供 adapter，提交仍走既有 `StocktakeMaintenanceService`。这样既能验证离线基础设施层的价值，又能把试点风险控制在一个高价值、高清晰度、低外溢的范围内。

### 1. architecture：离线 SDRTS adapter 首批试点模块选择

日期：2026-04-12  
状态：待批准

#### 1.1 当前目标

在已经确定“公共离线基础设施层 + 模块 adapter”方向之后，需要选择一个最适合的首批试点模块，验证：

1. 离线日志入队
2. IndexedDB 持久化
3. replay / flush
4. 冲突判定
5. 与既有 service / command 边界的兼容

首批试点的选择必须兼顾工业现场价值与工程可控性，不能一开始就压到最复杂的事务链路上。

#### 1.2 本轮候选模块评估

##### A. 仓储产品入库 `product-inbound.tsx`

优点：

1. 业务价值明确。
2. 已有清晰表单提交流程。

不足：

1. 更偏单次表单提交，不是最典型的高频断网写入链路。
2. 冲突语义更靠近“重复入库 / 幂等提交”，不如扫描链路更适合先验证离线队列模型。

##### B. 仓储 PDA / 盘点扫描链路

相关接口：

1. `StocktakeMaintenanceService.pdaSubmitScan`
2. `StocktakeMaintenanceService.pdaBulkSync`
3. `StocktakeMaintenanceService.pdaPatchItem`

优点：

1. 工业现场断网价值最高。
2. 写入频率高，最能体现离线日志与恢复同步的真实价值。
3. `pdaPatchItem` 已具备 `DeltaSet + version + intent` 结构，和 SDRTS 离线化方向天然贴合。
4. PDA 场景天然适合“本地暂存 -> 联网后补交”的模型。

不足：

1. 扫描批量同步与单条 patch 需要分阶段收口，不宜一次全部铺开。

##### C. 仓储调整执行 `AdjustmentService.execute`

优点：

1. 已具备命令型意图 `STOCK_ADJUSTMENT_EXECUTE`。

不足：

1. 更像高语义命令执行，不适合作为离线基础设施的第一批验证对象。
2. 一旦离线重放失败，业务后果比 PDA 暂存更重。

##### D. 计件维护 `PieceworkMaintenanceService`

优点：

1. 也有 patch/update 形态。

不足：

1. 当前实现仍存在 `Partial<T>` 与 `any` 倾向。
2. 若拿它做首批试点，容易把“离线基础设施试点”与“旧协议整治”混在一起。

#### 1.3 首批试点推荐结论

首批最推荐的试点模块是：

1. **仓储盘点 PDA 扫描链路**

推荐理由：

1. 工业现场价值最高。
2. 高频写入，最能检验离线队列设计是否真的可用。
3. 已有 `DeltaSet + version + intent` 基础，适合作为 SDRTS 离线 adapter 首样板。
4. 既贴近现场，又没有一上来就进入最复杂的 Workflow 长事务核心。

#### 1.4 推荐试点范围

建议按三步推进，而不是一次全做：

##### Phase A：`pdaSubmitScan`

目标：

1. 先验证单条扫描写入的离线入队与恢复补交。
2. 先打通最小 `snapshot / pending_log / sync_meta`。

##### Phase B：`pdaBulkSync`

目标：

1. 在单条链路稳定后，再验证批量同步与批次 replay。
2. 验证压缩、批次 ack、失败拆分等策略。

##### Phase C：`pdaPatchItem`

目标：

1. 引入真正的 `DeltaSet + version` patch 场景。
2. 验证字段级冲突与版本优先合并策略。

#### 1.5 为什么不建议一开始就选其它模块

1. **不先选 `product-inbound`**
   - 更适合作为第二批“表单式离线提交”试点，而不是第一批“高频现场写入”试点。

2. **不先选 `AdjustmentService.execute`**
   - 命令执行语义更重，首批试点失败成本更高。

3. **不先选 `PieceworkMaintenanceService`**
   - 该模块更像旧协议整治对象，容易把离线架构试点与协议清理混在一起。

#### 1.6 试点成功标准

若后续进入执行，首批试点至少应验证：

1. 断网时扫描写入不丢失。
2. 页面刷新后本地待同步日志仍可恢复。
3. 联网后日志可自动 replay / flush。
4. 幂等重试不会重复应用。
5. 冲突可被识别与升级，而不是静默覆盖。

#### 1.7 当前阶段结论

如果要为离线 SDRTS adapter 选首批试点，最合适的不是“通用表单页”或“高语义命令执行”，而是**仓储盘点 PDA 扫描链路**。它既具备最强的工业现场价值，也具备较清晰的输入模型和较低的试点失控风险，适合作为离线基础设施层的第一批验证样板。

### 1. architecture：离线 SDRTS 基础设施层（方向 A）项目级架构方案

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

在工业现场断网属于常态的前提下，SDRTS 若要支持长周期离线与恢复同步，不能继续依赖内存态或让每个模块各自实现一套临时离线逻辑。

当前已确认的原则包括：

1. `o(old value)` 必须持久化，不能只放内存。
2. IndexedDB 应作为浏览器端离线主存储。
3. 不能把方案停留在“单一 pending queue”。
4. 必须继续遵守：
   - 后端权威
   - `services/` 去副作用化
   - `Workflow / DispatchService / StandardCommand` 边界

因此，本轮更适合先输出一个项目级架构分层方案，而不是直接让单个模块先写一版“离线重试逻辑”。

#### 1.2 架构结论

本轮推荐采用：

1. **公共离线基础设施层**
2. **模块级领域 adapter 层**
3. **页面 / hook 调用层**

核心原则是：

1. **离线能力平台化**
2. **冲突语义领域化**

也就是说：

1. IndexedDB、队列、同步状态机、重放编排应由公共层统一提供。
2. 不同模块的字段冲突、压缩规则、提交协议由各自 adapter 定义。

#### 1.3 推荐目录结构

建议在前端引入独立目录，例如：

1. `src/offline-sync/core/`
2. `src/offline-sync/storage/`
3. `src/offline-sync/queue/`
4. `src/offline-sync/replay/`
5. `src/offline-sync/conflict/`
6. `src/offline-sync/types/`

如后续需要模块适配层，则按模块放置：

1. `src/features/warehouse/offline/warehouse-sync-adapter.ts`
2. `src/features/production/offline/production-sync-adapter.ts`
3. `src/features/quality/offline/quality-sync-adapter.ts`

这样可以满足“公共能力集中、领域规则分散”的结构目标。

#### 1.4 三层数据模型建议

##### A. `snapshot`

职责：

1. 保存最近一次与服务端确认对齐后的实体快照。
2. 作为离线恢复时的本地基线。

##### B. `pending_log`

职责：

1. 保存尚未完成同步确认的 delta / intent。
2. 必须至少包含：
   - `entityType`
   - `entityId`
   - `path`
   - `o`
   - `n`
   - `baseVersion`
   - `opId`
   - `createdAt`
   - `state`

##### C. `sync_meta`

职责：

1. 保存实体同步状态元数据，例如：
   - `latestAckVersion`
   - `lastSyncAt`
   - `hasConflict`
   - `queueState`

这意味着浏览器端不应只有一个 `pending_queue`，而应采用：

1. `snapshot`
2. `pending_log`
3. `sync_meta`

三层配合。

#### 1.5 公共基础设施层职责

公共层应负责：

1. IndexedDB schema 与访问封装
2. `pending_log` 的入队 / 出队 / 状态迁移
3. `snapshot` 的读写与回填
4. `sync_meta` 的维护
5. 在线恢复后的 replay / flush 编排
6. `opId` 幂等标识生成
7. 通用冲突记录存储与状态管理

这些能力不应由各个业务模块重复实现。

#### 1.6 模块 adapter 层职责

模块 adapter 应负责：

1. 定义本模块哪些实体支持离线日志化
2. 定义 path 粒度与稳定标识规则
3. 定义日志压缩策略
4. 定义冲突判定策略
5. 定义自动合并 / 人工决策边界
6. 定义如何把 delta / intent 转为该模块最终提交协议

例如：

1. 仓储模块更关注数量、批次、库位冲突
2. 生产模块更关注工序状态、参数、报工冲突
3. 审批类模块可能很多字段根本不允许自动合并

因此冲突语义不能硬编码在公共层里。

#### 1.7 与现有体系的兼容原则

本轮必须明确保持以下兼容：

##### A. 不绕开 DTO / adapter / service

离线层最终不能直接跳过现有传输边界，而应通过模块 adapter 输出给既有 service / command 边界消费。

##### B. 不绕开 Workflow / StandardCommand

若某些业务当前必须通过事务命令、工作流或标准命令链路提交，则离线层只负责“延迟提交与重放”，不应自己成为新的业务写入口。

##### C. 不削弱后端权威

本地快照只是离线基线，不是新的最终权威读模型。

#### 1.8 最小接口草案

公共层可先定义以下级别的抽象接口：

1. `enqueueDelta(delta)`
2. `getEntitySnapshot(entityType, entityId)`
3. `saveEntitySnapshot(snapshot)`
4. `flushEntity(entityType, entityId)`
5. `flushAllPending()`
6. `markConflict(opId, detail)`
7. `resolveConflict(opId, resolution)`

模块 adapter 层可定义：

1. `compressPendingDeltas(deltas)`
2. `detectConflict(serverSnapshot, delta)`
3. `buildSubmissionPayload(deltas, snapshot)`
4. `applyServerAck(serverResponse)`

#### 1.9 推荐实施顺序

若后续进入执行，建议按以下顺序推进：

1. 先建立 `offline-sync` 公共骨架与 types
2. 先实现 `snapshot / pending_log / sync_meta` 的最小存储层
3. 再实现最小 flush / replay 编排
4. 再选择一个高价值模块做第一批 adapter 试点
5. 最后再评估是否继续推广到其它模块

#### 1.10 本轮边界控制

本轮明确不做：

1. 不直接写 IndexedDB 具体实现代码。
2. 不直接改某个业务模块进入试点。
3. 不将本轮扩大为全系统离线化施工。

#### 1.11 风险与控制策略

1. **公共层过度通用风险**
   - 如果公共层试图理解所有业务冲突语义，会重新变成上帝模块。
   - 控制策略：公共层只管“存储 / 编排 / 状态机”，冲突语义下放给 adapter。

2. **模块各自实现导致漂移风险**
   - 如果不抽公共层，各模块迟早各写一套 IndexedDB / 队列逻辑。
   - 控制策略：先平台化基础能力，再模块化语义。

3. **绕开既有写链风险**
   - 若离线层直接变成新的写入口，会破坏现有 `service / workflow / command` 边界。
   - 控制策略：离线层只负责“延迟、重放、冲突”，最终提交仍通过既有正式边界。

#### 1.12 当前阶段结论

当前最合理的方向不是“每个模块自己做离线”，也不是“做一个什么都懂的超级黑盒”，而是先建立一个独立的离线同步基础设施层，再让各模块通过自己的 adapter 挂接冲突语义与提交协议。这样既能复用底层能力，也不会破坏现有 DTO / service / workflow 的边界。

### 1. layout：侧边栏分类标题字号与颜色层级优化

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

上一轮已完成侧边栏分类折叠能力，但当前分类标题的视觉层级仍偏弱：

1. 标题字号比菜单项更小或接近偏小。
2. 标题颜色对比度较弱。
3. 折叠按钮本身存在，但分类标题没有形成足够明显的“分组标题”感。

这会影响侧边栏分组折叠后的可扫描性。

#### 1.2 当前问题判断

##### A. 分类标题层级弱于菜单项

当前用户感知是“菜单标题比分类标题还大”，这会让分组结构显得不清楚。

##### B. 分类标题颜色样式不够突出

如果分类标题只是浅色辅助文案，即使已经能折叠，用户也很难把它快速识别成真正的导航分组标题。

#### 1.3 本轮目标

本轮只处理视觉层级，不改变交互逻辑：

1. 提高分类标题字号。
2. 提高分类标题字重与颜色对比。
3. 补足 hover / expanded 状态下的视觉反馈。
4. 保持菜单项与分类标题之间更清晰的主次结构。

#### 1.4 建议实施方案

##### 第一步：提升标题字号与字重

目标：

1. 分类标题字号至少与菜单项接近，或略大于菜单项。
2. 保持 italic / 工业风格，但避免因为过小而失去结构感。

##### 第二步：增强颜色与状态样式

目标：

1. 默认态比当前更清晰。
2. hover 态更容易感知可点击。
3. 展开态与收起态在视觉上有明确区分。

##### 第三步：保持逻辑不变

目标：

1. 不修改当前分类自动展开逻辑。
2. 不修改菜单点击行为。
3. 不联动改变 sidebar 其它组件结构。

#### 1.5 预期修改范围

本轮预期主要涉及：

1. `src/components/layout/nav-group.tsx`

#### 1.6 本轮边界控制

本轮明确不做：

1. 不再次调整侧边栏信息架构。
2. 不重写折叠逻辑。
3. 不扩大为整套导航主题重做。

#### 1.7 风险与控制策略

1. **标题过强导致菜单项层级失衡风险**
   - 如果标题样式过重，可能压过具体菜单项。
   - 控制策略：让标题达到“清晰分组”而不是“比菜单更像主操作”。

2. **样式改动影响折叠态可读性风险**
   - 若在折叠态下仍保留过强标题样式，可能与 icon 模式冲突。
   - 控制策略：仅在展开侧边栏下强化标题层级。

#### 1.8 验证建议

若后续进入执行，建议至少验证：

1. 分类标题字号与颜色明显强于当前实现。
2. 菜单项与分类标题层级更清晰。
3. 分类折叠逻辑不受影响。
4. `pnpm exec eslint` 目标文件通过。
5. `pnpm exec tsc --noEmit` 通过。

#### 1.9 当前阶段结论

本轮更适合做一次小而准的视觉层级修正：只提升侧边栏分类标题的字号、字重与颜色状态，让分组结构真正可见，而不是继续扩大为导航组件重做。

### 1. layout：侧边栏分类支持折叠并默认展开当前分类

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前侧边栏在导航承载上已经出现新的体验问题：

1. 分组数量与菜单项数量都在增长。
2. 目前只有整栏折叠能力与内容区 `overflow-auto` 滚动兜底。
3. 每个分类分组本身始终展开，导致单列信息密度持续升高。

这意味着当前问题不只是“有没有滚动条”，而是“用户是否还能快速扫描并找到当前上下文入口”。

#### 1.2 当前问题判断

##### A. 当前没有分类级折叠能力

`NavGroup` 目前直接渲染标题与完整菜单列表，没有自己的展开/收起状态。

##### B. 单纯依赖滚动不能解决认知拥挤

即使菜单技术上不会溢出视区，用户仍会遇到：

1. 一屏可见内容过多
2. 分类之间边界感下降
3. 常用入口被挤到更深位置

##### C. 最合适的平衡方式是“默认只展开当前分类”

与其让所有分类始终展开，不如：

1. 当前路由所在分类默认展开
2. 其它分类默认收起
3. 用户按需再展开其它分类

#### 1.3 本轮目标

本轮目标是给侧边栏增加更稳妥的动态平衡能力：

1. 每个分类支持折叠/展开。
2. 默认展开当前命中路由所属分类。
3. 其它分类默认收起。
4. 保留现有整栏折叠与滚动兜底能力。

#### 1.4 建议实施方案

##### 第一步：在 `NavGroup` 引入分类级折叠状态

目标：

1. 分类标题可点击。
2. 标题右侧显示展开/收起指示。
3. 分类内容区可按状态显示或隐藏。

##### 第二步：自动展开当前分类

目标：

1. 根据当前 pathname 判断当前命中分类。
2. 当前分类初始默认展开。
3. 其它分类初始默认收起。

##### 第三步：保持现有滚动与整栏折叠作为兜底

目标：

1. 不破坏现在的 sidebar 整体收起逻辑。
2. 不移除 `SidebarContent` 的滚动能力。
3. 分类折叠作为“第一层减压”，滚动作为“最后兜底”。

#### 1.5 预期修改范围

本轮预期主要涉及：

1. `src/components/layout/nav-group.tsx`
2. 如需要，少量联动 `src/components/ui/sidebar.tsx`
3. 若有文案或交互细节需要，再少量联动对应 locale

#### 1.6 本轮边界控制

本轮明确不做：

1. 不扩大为整套侧边栏 UI 重写。
2. 不一次性引入复杂持久化状态。
3. 不同时改造命令面板、权限菜单与顶部导航。

#### 1.7 风险与控制策略

1. **分类收起后可发现性风险**
   - 若当前分类判断不准确，用户可能打开页面后看不到当前菜单组。
   - 控制策略：默认以当前 pathname 命中的分类为展开优先级。

2. **整栏折叠与分类折叠双层状态冲突风险**
   - 若状态耦合处理不好，可能导致图标栏与分类展开逻辑互相干扰。
   - 控制策略：分类折叠仅在 sidebar 展开态下发挥作用；整栏折叠保持现有逻辑。

3. **交互过重风险**
   - 若一次引入动画、持久化、自动平衡全套逻辑，改动面会扩大。
   - 控制策略：本轮先做最小可用方案，优先解决“默认只展开当前分类”。

#### 1.8 验证建议

若后续进入执行，建议至少验证：

1. 侧边栏每个分类可手动展开/收起。
2. 当前路由所属分类默认展开。
3. 其它分类默认收起。
4. sidebar 整体折叠/展开仍正常。
5. 内容区滚动兜底仍正常。
6. `pnpm exec eslint` 目标文件通过。
7. `pnpm exec tsc --noEmit` 通过。

#### 1.9 当前阶段结论

当前更稳妥的方案不是继续依赖单列滚动，而是在保留整栏折叠与滚动兜底的前提下，为每个分类增加折叠能力，并默认只展开当前分类。这能更好地平衡不断增长的菜单量与侧边栏可扫描性。

### 1. warehouse：将仓储从资源管理子菜单提升为独立分类导航

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前仓储能力在导航上的承载方式已经开始失衡：

1. “仓储”目前归于“资源管理”侧边栏菜单下。
2. 仓储模块内部已经承载库存、入库、出库、盘点、调整等多类作业页。
3. “物料档案”在业务归属上属于仓储主数据，但当前再继续塞入仓储 tabs 已不合适。

这说明当前问题已经不是菜单文案优化，而是导航层级不再匹配实际业务边界。

#### 1.2 当前问题判断

##### A. 仓储已从“资源子页”演变为独立业务域

从业务职责看，仓储已不只是资源管理中的一个小功能，而是包含：

1. 仓储作业
2. 仓储主数据
3. 仓储执行记录/报表

这种情况下，继续把它挂在“资源管理”下会削弱模块归属感，也让后续扩展更加别扭。

##### B. tabs 不再适合作为持续扩张的主导航承载层

tabs 更适合同模块内少量紧密相关的子视图，不适合不断吸纳新的独立业务入口。

##### C. 菜单文案加括号只能算临时补丁

例如“物料档案（仓储）”虽然能提示归属，但不能解决：

1. 侧边栏结构不清晰
2. 仓储域入口继续增长时的承载问题
3. 后续更多仓储主数据页的扩展路径

#### 1.3 本轮目标

本轮目标不是只给某个菜单改名字，而是把仓储导航结构收口为更稳定的业务域表达：

1. 将“仓储”提升为独立侧边栏分类/模块组。
2. 在该分类下并列承载：
   - 仓储作业
   - 物料档案
3. 保持现有页面路由与功能行为尽量不变。

#### 1.4 建议实施方案

##### 第一步：提升“仓储”为独立导航分类

目标：

1. 让仓储不再作为“资源管理”的一个普通子菜单。
2. 在侧边栏结构上单独形成仓储分类/分组。

##### 第二步：将“仓储作业”与“物料档案”作为并列入口

目标：

1. “仓储作业”不再代表整个仓储模块本身，而只是仓储分类下的一个页面。
2. “物料档案”作为仓储主数据入口，与仓储作业并列，而不是被硬塞进 tabs。

##### 第三步：页面内部继续表达业务归属

即使导航上已独立分类，页面标题/副标题/面包屑仍可保持“仓储域”归属表达，避免用户迷失。

#### 1.5 预期修改范围

本轮预期主要涉及：

1. 侧边栏导航配置文件
2. warehouse 模块 tabs / 路由入口配置
3. 物料档案页面在导航中的挂载位置
4. 如有必要，联动页面标题/面包屑文案

#### 1.6 本轮边界控制

本轮明确不做：

1. 不扩大为整套权限体系重构。
2. 不一次性重写 warehouse 页面内部全部 tabs。
3. 不顺手改造其它资源管理模块导航层级。
4. 不把本轮退化为单纯文案加括号补丁。

#### 1.7 风险与控制策略

1. **导航迁移后可发现性回归风险**
   - 用户原先从资源管理进入仓储，迁移后可能短期不适应。
   - 控制策略：保持命名直观，必要时在页面内保留仓储归属提示。

2. **权限挂载点联动风险**
   - 侧边栏分类提升后，菜单权限与路由权限映射需检查是否仍一致。
   - 控制策略：保持现有路由与 action 权限语义不变，优先做导航层收口，不扩大权限语义修改。

3. **tabs 与侧边栏双重语义冲突风险**
   - 若仓储分类已独立，但模块内部仍保持过多 tabs，可能形成二次拥挤。
   - 控制策略：本轮先解决侧边栏层级，内部 tabs 仅做必要最小调整。

#### 1.8 验证建议

若后续进入执行，建议至少验证：

1. 侧边栏中“仓储”已成为独立分类/分组。
2. “仓储作业”与“物料档案”可作为并列入口访问。
3. 原有仓储页面和物料档案页面路由访问正常。
4. 权限门控未因导航迁移而失效。
5. `pnpm exec eslint` 目标文件通过。
6. `pnpm exec tsc --noEmit` 通过。

#### 1.9 当前阶段结论

从信息架构看，当前更合理的长期方案不是“物料档案（仓储）”这类菜单补丁，而是将仓储正式提升为独立分类，再把“仓储作业”与“物料档案”并列承载在该分类下。这更符合实际业务边界，也更适合后续继续扩展仓储域能力。

### 1. org-personnel：新建请假申请崩溃（Maximum update depth exceeded）修复

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前 `LEAVE_MANAGEMENT` 模块在点击“新建请假申请”后会出现前端崩溃，控制台同时出现：

1. `/leaves/stats` 请求失败
2. `/leaves/my` 请求失败
3. React `Maximum update depth exceeded`

页面主链已排查到：

1. `src/features/org-personnel/tabs/leave-management.tsx`
2. `src/features/org-personnel/components/leave-action-dialog.tsx`
3. `src/features/org-personnel/hooks/use-submit-leave-request.ts`
4. `src/features/org-personnel/services/leave-service.ts`

#### 1.2 当前问题判断

##### A. 核心问题更像前端弹窗内部更新环

从当前代码结构看，列表页本身只是：

1. 查询 `/leaves/my`
2. 查询 `/leaves/stats`
3. 点击按钮打开 `LeaveActionDialog`

真正更可疑的是 `LeaveActionDialog` 内部：

1. `react-hook-form`
2. `useWatch`
3. `Dialog`
4. `open / onOpenChange`
5. `useEffect` 中的 reset 链路

这类组合若某个依赖在每次 render 都变化，或某个 ref callback 反复触发状态更新，很容易导致最大更新深度报错。

##### B. `/leaves/*` 请求失败可能是并发症状，不一定是根因

当前两个 query 发生在页面挂载时，本身需要进一步判断：

1. 是接口真的失败
2. 还是组件崩溃过程中请求被中断 / 边界重建后重复打断

因此本轮优先级应先放在“修复崩溃”，再决定是否要给 leaves 统计与列表查询补空态/错误态兜底。

#### 1.3 本轮目标

本轮目标分两层：

1. **必做**：修复新建请假申请弹窗打开即崩溃的问题。
2. **次做**：若 `/leaves/stats`、`/leaves/my` 请求失败在崩溃修复后仍存在，再补最小稳定性兜底。

#### 1.4 建议实施顺序

##### 第一步：收紧 `LeaveActionDialog` 的状态更新链路

重点检查并修复：

1. `useEffect(() => { if (!open) form.reset(...); resetPreview() }, [form, open, resetPreview])`
2. `useWatch()` 与 Dialog 打开关闭时的字段联动
3. 可能导致 `DialogContent` 或内部输入 ref 重复 setState 的写法

目标是让弹窗在打开/关闭过程中不再触发无限更新。

##### 第二步：确认 leaves 查询失败是否仍独立存在

如果崩溃修复后 `/leaves/stats`、`/leaves/my` 仍报错，则追加最小治理：

1. 明确错误来源
2. 避免列表页因查询失败直接影响弹窗使用
3. 视情况补错误提示或空态兜底

#### 1.5 预期修改文件

本轮预期主要涉及：

1. `src/features/org-personnel/components/leave-action-dialog.tsx`
2. `src/features/org-personnel/hooks/use-submit-leave-request.ts`
3. 如确有必要，再联动：
   - `src/features/org-personnel/tabs/leave-management.tsx`
   - `src/features/org-personnel/services/leave-service.ts`

#### 1.6 本轮边界控制

本轮明确不做：

1. 不修改后端 `/leaves` 接口语义。
2. 不扩大为整个人事请假模块重构。
3. 不顺手重写统计卡片或列表布局。

#### 1.7 风险与控制策略

1. **表单重置逻辑修复后行为漂移风险**
   - 若直接移除 reset 逻辑，可能留下旧表单值。
   - 控制策略：修复循环时仍保留“关闭后重置”语义。

2. **请求失败与崩溃根因混淆风险**
   - 若先处理请求失败而未解决更新环，页面仍会崩。
   - 控制策略：先解决 `Maximum update depth exceeded`，再判断查询失败是否独立存在。

3. **Dialog / form 组合回归风险**
   - 弹窗打开、关闭、试算、提交四个动作都需要回归。
   - 控制策略：修复后定向验证打开弹窗、试算、提交、关闭重开。

#### 1.8 验证建议

若后续进入执行，建议至少验证：

1. 点击“新建请假申请”后页面不再崩溃。
2. 弹窗可正常打开、关闭、重新打开。
3. 试算请假时长可正常执行。
4. 提交请假申请链路可正常执行。
5. `pnpm exec eslint` 目标文件通过。
6. `pnpm exec tsc --noEmit` 通过。

#### 1.9 当前阶段结论

当前请假申请问题应优先按“前端弹窗状态更新环”来处理，而不是先把 `/leaves/stats` 与 `/leaves/my` 当成唯一根因。最稳妥的修复顺序，是先让 `LeaveActionDialog` 恢复稳定打开与关闭，再判断列表查询失败是否还需要单独治理。

### 1. warehouse：`/warehouse/inbound` 缺少明确入库按钮的业务修复

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

当前 `/warehouse/inbound` 页面已经具备入库业务能力，但入口表达不清晰。

已排查到页面主文件：

1. `src/routes/_authenticated/warehouse/inbound.lazy.tsx`
2. `src/features/warehouse/tabs/product-inbound.tsx`

当前页面的实际入库链路为：

1. 用户搜索产品/物料
2. 点击搜索结果卡片触发 `openInboundForm(item)`
3. 弹出入库对话框
4. 点击弹窗确认按钮触发 `submitInbound()`
5. 调用 `InventoryTransactionService.recordInbound()` 提交入库

也就是说，问题不在“系统没有入库能力”，而在“页面没有明确暴露可理解的入库按钮入口”。

#### 1.2 当前问题判断

##### A. 主操作入口过弱

搜索结果卡片本身支持点击，但视觉上更像信息卡片，不像明确操作入口。

##### B. 按钮仅在 hover 时强调

当前卡片右侧按钮被包在 `NonBlockingPermissionBoundary` 中，且通过 `sm:opacity-0 group-hover:opacity-100` 做 hover 才显的强调效果。对于普通用户来说，会误判为“没有可以执行入库的按钮”。

##### C. 按钮文案语义偏弱

当前文案是 `warehouse.inbound.select`，更像“选择条目”，而不是“执行入库 / 登记入库”。

#### 1.3 本轮目标

本轮目标是在不改后端接口语义、不改提交流程的前提下，补齐一个**明确、常显、语义清楚**的入库入口。

目标包括：

1. 页面上能一眼看到可执行的入库按钮。
2. 按钮语义明确指向“入库”而不是“选择”。
3. 继续沿用现有 `openInboundForm()` 与 `submitInbound()` 流程。
4. 继续沿用现有权限控制 `action_warehouse_inbound_record`。

#### 1.4 建议实施方案

建议优先采用**最小业务修复**：

##### 第一步：补齐搜索结果卡片中的常显主按钮

在 `src/features/warehouse/tabs/product-inbound.tsx` 的搜索结果项中：

1. 保留卡片点击打开弹窗的现有行为，避免破坏已有快捷交互。
2. 右侧按钮改为常显，至少在桌面态不再依赖 hover 才可见。
3. 按钮文案改为“入库”或“登记入库”对应的 i18n 文案。

##### 第二步：必要时补充空结果 / 首次进入时的操作引导

若页面在无搜索结果时仍容易让用户误以为“没有入口”，可评估在结果区或搜索框附近补一条短提示，例如“搜索产品或物料后可执行入库”。

本项属于可选项，优先级低于主按钮显式化。

#### 1.5 预期修改文件

本轮预期主要涉及：

1. `src/features/warehouse/tabs/product-inbound.tsx`
2. 如缺少更合适文案，可能联动对应 locale 文案文件

#### 1.6 本轮边界控制

本轮明确不做：

1. 不修改 `/inventory/inbound` 后端接口语义。
2. 不修改 `InventoryTransactionService.recordInbound()` 的请求结构。
3. 不重构 `ProductInbound` 页面整体结构。
4. 不联动改造其它仓储页面。

#### 1.7 风险与控制策略

1. **权限门控误伤风险**
   - 如果按钮显式化但权限边界处理不当，可能导致无权限用户也看到可执行按钮。
   - 控制策略：继续保留 `NonBlockingPermissionBoundary` 和 `allowsAction('action_warehouse_inbound_record')` 现有门控。

2. **交互重复触发风险**
   - 当前卡片点击与按钮点击都可能打开弹窗，若事件冒泡处理不当可能产生重复触发。
   - 控制策略：若新增更明确按钮，需处理按钮点击与卡片点击的事件边界。

3. **视觉改动扩大风险**
   - 若顺手重做整页布局，会扩大业务修复范围。
   - 控制策略：本轮只聚焦入库入口显式化，不扩大为整页视觉重构。

#### 1.8 验证建议

若后续进入执行，建议至少验证：

1. `/warehouse/inbound` 页面中搜索结果项存在明确常显的“入库”操作入口。
2. 有权限用户点击按钮可正常打开入库弹窗。
3. 无权限场景仍遵守现有门控策略。
4. 入库弹窗确认后仍能正常调用现有提交流程。
5. `pnpm exec eslint` 目标文件通过。
6. `pnpm exec tsc --noEmit` 通过。

#### 1.9 当前阶段结论

当前 `/warehouse/inbound` 的核心问题不是业务能力缺失，而是入口表达失败。最稳妥的修复方式不是重写流程，而是在现有提交流程不变的前提下，把“入库”按钮显式化、常显化、语义化。

### 1. purchase：第二阶段收口规划（`usePurchaseOrderForm` / 写操作边界）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

`purchase` 方向 A 第一轮已完成 UI 容器拆分：

1. `PurchaseOrderList` 已拆出筛选工具栏、详情 sheet 和筛选项加载 hook。
2. `PurchaseOrderActionDialog` 已拆出 Dialog 壳和物料 / 单位元数据加载 hook。

这一步已经把采购单主链的 UI 壳层责任压薄，但当前最重的复杂度已进一步集中到采购单编辑主链内部：

1. `usePurchaseOrderForm`
2. `usePurchaseOrderMutations`
3. `purchase-transaction-service.ts`

因此，下一阶段更适合进入“状态与写操作边界收口”，而不是继续优先拆 UI 外壳。

#### 1.2 当前问题判断

##### A. `usePurchaseOrderForm` 过于中心化

当前 `src/features/trading/hooks/use-purchase-order-form.ts` 同时承担：

1. 表单默认值初始化
2. 新建单号生成
3. 头部字段编辑
4. 行项目增删改
5. 金额汇总 / 预览计算
6. 基础校验
7. 提交前 `commit` 整理

这意味着它已经不是单纯的“表单 hook”，而是采购单编辑状态的中心。若继续在同一 hook 中叠加逻辑，未来每次修改头部字段、行编辑或保存前整理，都可能互相牵连。

##### B. `usePurchaseOrderMutations` 写操作入口集中

当前 `src/features/trading/purchase/hooks/use-purchase-orders.ts` 中的 mutation 层同时承载：

1. create
2. save
3. delete
4. receive / confirm
5. 查询失效与 toast 逻辑

这在现阶段仍可工作，但若采购单写操作继续增长，会逐渐形成“所有写操作都堆在一个 hook 里”的热点。

##### C. `purchase-transaction-service.ts` intent 层仍偏平铺

当前事务 service 已有 intent 化方向，是好的基础；但 intent 与 payload 仍然偏平铺。如果下一阶段继续增加 header / line / workflow 类 intent，文件复杂度会继续上升。

#### 1.3 下一阶段目标

下一阶段不改后端接口语义，也不重写 DTO / adapter，而是在前端内部继续降低复杂度：

1. 先把 `usePurchaseOrderForm` 拆成更清晰的状态职责块。
2. 再评估 `usePurchaseOrderMutations` 是否适合按写操作类型分组。
3. 最后再决定 `purchase-transaction-service.ts` 是否需要继续按 header / line / workflow 分层。

#### 1.4 推荐实施顺序

##### 第一步：先拆 `usePurchaseOrderForm`

目标：

1. 识别并收口以下职责：
   - 头部字段更新
   - 行项目编辑
   - 金额汇总
   - 校验
   - `commit` 前整理
2. 尽量保持现有 `PurchaseOrderActionDialog` 调用方式低破坏。

建议方向：

1. 可优先抽出纯函数或局部 helper，而不是立刻把 hook 过度拆散。
2. 若拆 hook，优先保证“单向组合”，避免多个 hook 互相反向依赖。
3. 对金额计算、默认值生成、校验这类纯逻辑，优先抽到独立工具文件。

##### 第二步：评估 `usePurchaseOrderMutations` 分组

目标：

1. 判断是否需要拆成更细的写操作组合，例如：
   - create / save
   - delete
   - receive / workflow
2. 保持 React Query 的缓存失效口径一致。

建议方向：

1. 优先抽共用成功 / 失败处理逻辑，避免重复 toast 与 invalidateQueries。
2. 若分组，先从读写语义差异最大的操作切开，不一次性全拆。

##### 第三步：视复杂度决定是否继续拆事务 service

目标：

1. 评估 `purchase-transaction-service.ts` 当前 intent 是否已经出现明显的 header / line / workflow 三类边界。
2. 若证据不足，则本轮先不动该文件，仅在 plan 中记录下一步候选方向。

#### 1.5 本轮边界控制

本轮明确不做：

1. 不修改后端采购单接口语义。
2. 不修改 `purchase-order-api-dto.ts` 与 adapter 契约结构。
3. 不处理 `features/purchase` 与 `features/trading` 的宿主归属迁移。
4. 不把本轮扩大为采购、销售共用抽象重构。

#### 1.6 风险与控制策略

1. **表单状态拆分后行为漂移风险**
   - `usePurchaseOrderForm` 涉及默认值、行编辑和提交前整理，拆分不当容易引入隐性回归。
   - 控制策略：优先抽纯逻辑，保留外部 API 稳定，逐步减重。

2. **mutation 分组后缓存失效不一致风险**
   - 若不同写操作分散后 invalidation 口径不一致，容易产生列表 / 详情不同步。
   - 控制策略：抽统一失效 helper，先集中定义查询 key 策略。

3. **事务 service 过早拆分风险**
   - 在 intent 边界还不够稳定前过早拆文件，可能制造更多横跳导入。
   - 控制策略：先以“是否已形成明确三类 intent”为判断门槛，不满足则先不拆。

#### 1.7 验证建议

若后续进入执行，建议至少验证：

1. 新建采购单时默认值、头部字段编辑、行编辑与金额汇总正常。
2. 编辑已有采购单时详情加载、表单回填与保存链路正常。
3. 删除、保存、确认收货等写操作行为不变。
4. `pnpm exec eslint` 目标文件通过。
5. `pnpm exec tsc --noEmit` 通过。

#### 1.8 当前阶段结论

`purchase` 第二阶段最稳妥的入口，不是继续拆页面外壳，而是从 `usePurchaseOrderForm` 开始，先把采购单编辑主链的状态与纯逻辑进一步分层；随后再按低风险方式评估 mutation 与事务 intent 的进一步收口。

### 1. purchase：模块分析与下一步收口规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前模块入口

当前 `purchase` 模块并不是一个完全自洽的独立域，而是呈现出“页面宿主在 `features/purchase`，核心业务实现仍大量落在 `features/trading`”的结构。

当前主要入口包括：

1. `src/features/purchase/tabs/index.tsx`
   - 负责 `PurchaseOrders()` 与 `SupplierMgmt()` 的页面宿主
   - `PurchaseOrders()` 内部再包一层二级 Tabs：`orders / logs / returns`

2. `src/features/trading/components/purchase/**`
   - 承担采购单列表、详情、编辑弹窗、局部表单部件等 UI 组织

3. `src/features/trading/purchase/**`
   - 承担 purchase API service、transaction service、adapter、contracts、hooks 等业务链路

这意味着当前 purchase 的“展示入口”和“业务核心实现”已经跨两个 feature 目录分布。

#### 1.2 当前主链数据流

按采购单主链梳理，目前大致数据流为：

1. 页面宿主：
   - `src/features/purchase/tabs/index.tsx`

2. 列表容器：
   - `src/features/trading/components/purchase/purchase-order-list.tsx`
   - 负责分页、筛选、详情 sheet、编辑弹窗开关、删除动作、支付方式/账期字典加载

3. 编辑弹窗壳：
   - `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
   - 负责 supplier / material / unit 元数据加载、详情加载、保存动作接线

4. 表单状态与本地编辑逻辑：
   - `src/features/trading/hooks/use-purchase-order-form.ts`
   - 负责默认值、表头修改、行增删改、预览金额计算、校验、delta 提交前状态维护

5. 读写 hooks：
   - `src/features/trading/purchase/hooks/use-purchase-orders.ts`
   - 负责 React Query 查询与 mutation 封装，以及 toast / invalidateQueries

6. 基础 service：
   - `src/features/trading/purchase/services/purchase-service.ts`
   - 普通 REST 读写与收货确认

7. 事务式 service：
   - `src/features/trading/purchase/services/purchase-transaction-service.ts`
   - 负责按 intent 调用 `/purchase/orders/:id/transactions`

8. DTO / adapter：
   - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
   - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

#### 1.3 当前最重的热点文件

基于现有结构，当前最值得关注的热点包括：

1. `src/features/trading/components/purchase/purchase-order-list.tsx`
   - 同时承担列表、筛选、详情、弹窗、局部字典加载与路由 search state 联动
   - 已经出现典型的“列表页容器堆叠”趋势

2. `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
   - 同时承担详情加载、supplier/material/unit 元数据加载、表单 hook 接线与保存入口
   - 继续膨胀后容易变成下一个复杂弹窗壳文件

3. `src/features/trading/hooks/use-purchase-order-form.ts`
   - 同时承担：
     - 默认值初始化
     - 新建单据编号生成
     - 汇率拉取
     - 行编辑
     - 预览计算
     - 基础校验
   - 已经是采购单编辑主链最关键的状态热点

4. `src/features/trading/purchase/hooks/use-purchase-orders.ts`
   - 同时管理 create/save/supplier change/line add/remove/content change 等多个 mutation
   - mutation 与 query invalidation 逻辑集中，后续继续扩展会变重

5. `src/features/trading/purchase/services/purchase-transaction-service.ts`
   - 已经形成清晰 intent 分层，但 intent 数量多、payload 多，后续容易继续扩张为“大而平”的 transaction client

#### 1.4 当前结构问题判断

当前 purchase 还没有到必须大重构的程度，但已经有几个明显的架构信号：

1. **宿主边界分裂**
   - 页面在 `features/purchase`
   - 主体业务在 `features/trading/purchase`
   - 长期会让模块归属感变弱，排障成本提高

2. **列表容器责任偏多**
   - `PurchaseOrderList` 不只是“列表”，还承担了筛选、详情、编辑入口、辅助字典加载

3. **弹窗壳责任偏多**
   - `PurchaseOrderActionDialog` 已经开始混合“数据准备层 + 表单壳 + 保存协调层”三种职责

4. **表单 hook 过于中心化**
   - `usePurchaseOrderForm` 当前是采购单编辑主链的真正核心，任何继续叠加都容易让它变成新的高风险点

5. **事务意图层已出现价值，但还缺进一步分组**
   - `purchase-transaction-service.ts` 的 intent 化是好方向
   - 但后续若继续增加 intent，最好分组或拆文件，而不是继续平铺扩张

#### 1.5 下一步最推荐的低风险入口

当前如果要从 `purchase` 开始做下一轮，不建议一上来处理“宿主目录归属重构”，而更推荐先从采购单主链做低风险收口。

优先级建议如下：

##### 优先级 1：先拆采购单 UI 容器边界

目标文件：

1. `src/features/trading/components/purchase/purchase-order-list.tsx`
2. `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

理由：

1. 风险相对可控
2. 能先降低列表页与弹窗壳继续膨胀的趋势
3. 不会立即触碰最深的数据事务边界

##### 优先级 2：再收口采购单编辑状态边界

目标文件：

1. `src/features/trading/hooks/use-purchase-order-form.ts`
2. `src/features/trading/purchase/hooks/use-purchase-orders.ts`
3. `src/features/trading/purchase/services/purchase-transaction-service.ts`

理由：

1. 当前这三者共同组成采购单编辑主链
2. 若先把 UI 容器拆清，再来收口状态与事务边界会更稳

##### 优先级 3：最后再评估 purchase / trading 宿主边界

理由：

1. 这一步会涉及模块归属与目录迁移
2. 破坏面明显大于前两步
3. 更适合在主链边界已经清楚后单独推进

#### 1.6 当前推荐

如果下一轮正式启动 `purchase`，我当前最推荐：

1. **先选方向 A**：
   - 拆 `PurchaseOrderList`
   - 拆 `PurchaseOrderActionDialog`
   - 保持现有 service / transaction / DTO 不先大动

2. **下一轮再处理方向 B**：
   - 收口 `usePurchaseOrderForm`
   - 视情况拆 `purchase-transaction-service`

这样更符合“先减风险，再动主链”的顺序。

#### 1.7 当前阶段结论

`purchase` 模块当前最值得处理的不是“整模块重命名或迁目录”，而是采购单主链的 UI 容器与编辑状态边界。下一步最稳妥的入口，是先从 `PurchaseOrderList` 与 `PurchaseOrderActionDialog` 做低风险拆分和职责收口，再决定是否进入 `usePurchaseOrderForm` 与 transaction service 的第二阶段收口。

### 1. engineering：`/engineering/product-attributes` 历史 `option.value` 统一迁移

日期：2026-04-11  
状态：待批准

#### 1.1 当前背景

在 `/engineering/product-attributes` 已完成方向 A 的机器值治理后，系统已经实现：

1. 新增分类项 `value` 会自动规范化
2. 保存前后端双层格式校验与防重复
3. 已有 `option.value` 被保护为不可直接编辑

这解决了“未来继续写入脏机器值”的问题，但当前仍存在一个历史治理遗留点：

1. 现有历史 `option.value` 虽然没有冲突，但风格并不统一
2. 当前同时存在：
   - 全大写：`NORMAL` / `HIGHTG` / `STD`
   - 首字母大写：`Hooked` / `Disc` / `Lightweight`

也就是说，当前状态是“数据不撞车，但机器值风格不统一”。

#### 1.2 已完成的库内扫描结论

基于当前本地运行库的只读扫描，确认如下：

1. `product_attribute_options` 共 10 条记录
2. 不存在同一分类下仅大小写不同的重复值
3. 不存在按当前规范化规则收口后会撞值的记录
4. `product_attribute_values` 当前为空表
5. 因此本地库里暂无历史 `option_value` 的存量引用负担

这意味着：

1. 历史 `option.value` 统一迁移在当前本地库中的数据迁移成本较低
2. 但代码链路仍需一并收口，避免默认值与消费链口径不一致

#### 1.3 本轮目标

本轮目标不是继续分析，而是为下一轮正式执行建立明确映射和边界：

1. 统一历史 `product_attribute_options.value`
2. 如目标环境存在引用数据，则同步迁移 `product_attribute_values.option_value`
3. 同步调整前后端默认种子值与相关字典消费口径
4. 保持 `category.key` 继续稳定兼容，不扩大为全链迁移

#### 1.4 建议的目标映射表

建议将当前历史值统一映射为以下机器值：

1. `NORMAL` -> `normal`
2. `HIGHTG` -> `high-tg`
3. `Hooked` -> `hooked`
4. `Hookless` -> `hookless`
5. `Tubular` -> `tubular`
6. `Disc` -> `disc`
7. `STD` -> `std`
8. `Lightweight` -> `lightweight`
9. `Ultralight` -> `ultralight`
10. `Reinforced` -> `reinforced`

这些目标值符合当前已经落地的机器值规则：

1. 全小写
2. 连字符分隔
3. 可稳定搜索 / 比较 / 筛选

#### 1.5 预期代码收口范围

若进入执行，建议至少同步以下代码范围：

##### A. 后端默认种子值

1. `server/services/product_attribute_option_service.go`
2. `server/db/db.go`

原因：

1. 两处都定义了默认 `option.value`
2. 若只改数据库、不改默认值，后续环境初始化仍会继续写回旧值

##### B. 前端字典消费链

1. `src/features/engineering/hooks/use-product-form-init.ts`
2. `src/features/engineering/components/product/dynamic-attribute-section.tsx`
3. `src/features/engineering/utils/product-attribute-utils.ts`
4. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

原因：

1. 产品表单与动态属性下拉的真实值来自 `option.value`
2. 若值统一后，这些地方需要验证回显、提交与筛选是否仍正常

##### C. 产品保存 / 传输链

1. `server/services/product_master_service.go`
2. `server/models/product_attribute_value.go`
3. `src/features/engineering/adapters/product-api-adapter.ts`
4. `src/features/engineering/data/schema.ts`

说明：

1. 这些文件未必都需要代码修改
2. 但至少属于必须纳入验证的链路

#### 1.6 预期数据收口范围

##### A. 必做

1. `product_attribute_options.value`

##### B. 条件联动

1. `product_attribute_values.option_value`

当前本地库扫描结果为 0 行，因此本地环境无实际数据迁移负担。  
但若目标环境存在历史产品属性值，则必须同步迁移，否则会导致：

1. 产品表单回显不到下拉项
2. 动态属性显示失配
3. 旧值继续在产品数据中残留

因此下一轮正式执行时，仍应把 `product_attribute_values` 迁移脚本作为正式步骤保留，而不是假设所有环境都为空。

#### 1.7 建议执行顺序

建议按以下顺序执行：

1. 先更新默认种子值与代码常量口径
2. 再更新 `product_attribute_options.value`
3. 若目标环境存在引用数据，再同步更新 `product_attribute_values.option_value`
4. 最后做产品表单 / 动态属性 / 编辑保存回归验证

这个顺序能减少“代码先读新值、数据库仍是旧值”或“数据库已改、UI 仍按旧值处理”的错位窗口。

#### 1.8 风险与控制策略

1. **目标环境数据与本地扫描不一致风险**
   - 本地库当前为空表，不代表其它环境一定为空。
   - 控制策略：正式执行前再次扫描目标环境的 `product_attribute_values`。

2. **默认种子回写旧值风险**
   - 若只改数据库、不改默认种子，后续初始化可能继续补回旧值。
   - 控制策略：数据库与默认种子值一起收口。

3. **表单回显失配风险**
   - 产品表单下拉的 `value` 变更后，旧产品若仍存旧值可能无法正常回显。
   - 控制策略：若发现目标环境存在引用数据，必须同步迁移 `product_attribute_values`。

4. **误把本轮扩大为 `category.key` 主链迁移风险**
   - 当前任务只处理 `option.value`，不应顺势扩大为 `category.key` 重构。
   - 控制策略：明确 `category.key` 保持兼容稳定，不在本轮改名。

#### 1.9 验证建议

若后续进入执行，建议至少验证：

1. 字典页分类项列表显示正常
2. 新增分类项仍按新规则落值
3. 产品表单下拉能正确显示并提交新机器值
4. 编辑已有产品时动态属性回显正常
5. `pnpm exec eslint` 目标文件通过
6. `pnpm exec tsc --noEmit` 通过
7. 后端定向验证产品属性与产品保存相关链路

#### 1.10 当前阶段结论

历史 `option.value` 统一迁移已经具备进入执行的条件：当前本地库没有冲突，也没有 `product_attribute_values` 存量引用负担。下一轮的关键不是“能不能迁移”，而是按映射表把默认种子值、字典数据和可能存在的产品属性值引用一起收口，避免形成新旧值并存。

### 1. engineering：`/engineering/product-attributes` 机器值长期规范化治理

日期：2026-04-11  
状态：待批准

#### 1.1 当前问题

`/engineering/product-attributes` 当前除了页面结构与样式问题外，还暴露出一个更长期的治理风险：

1. `category.key` 本质上是内部机器值，但目前只是约定式地倾向小写，并没有形成强约束。
2. `option.value` 也在承担机器值职责，但目前允许大小写混用、空格/符号输入差异等潜在不一致来源。
3. 如果继续允许这些值以“看起来差不多、机器上却不同”的形式进入系统，后期容易在搜索、筛选、精确匹配、导入导出、统计与规则判断中形成隐性问题。

这类问题的风险不在于“现在立即报错”，而在于后期出了问题时**很难第一时间想到根因在机器值不规范**。

#### 1.2 长期目标

本轮长期目标是把以下字段明确收口为**机器值**：

1. `category.key`
2. `option.value`

它们应满足：

1. 稳定可比较
2. 稳定可搜索
3. 稳定可筛选
4. 不因大小写、空格、符号差异形成重复语义

同时，展示语义继续由以下字段承担：

1. `nameZh / nameEn`
2. `labelZh / labelEn`

也就是说，后续要进一步把“机器值”和“展示值”职责分离清楚。

#### 1.3 建议的统一规范

建议将 `category.key` 与 `option.value` 统一为同一种机器值格式：

1. 全小写
2. 去除首尾空白
3. 中间空白折叠并转为连接符
4. 非法符号剔除或拦截
5. 最终保存为稳定的 slug 风格机器值

示例：

1. ` Matte Black ` -> `matte-black`
2. `HIGH TEMP` -> `high-temp`
3. `fiber_12K` -> `fiber-12k`（若采用统一连字符规则）

这样比“仅自动转小写”更稳，因为还能一起处理空格、符号、粘贴污染与边缘输入。

#### 1.4 推荐治理策略：三层同时做

本轮建议按以下三层一起治理，而不是只做单点输入修补。

##### A. 输入层自动规范化

前端表单在录入 `category.key` 与 `option.value` 时，自动执行：

1. `trim`
2. 小写化
3. 空格转连字符
4. 连续分隔符压缩
5. 非法字符过滤

价值：

1. 立刻减少误输入
2. 对用户更直观
3. 能在日常录入阶段就拦住大部分脏值

##### B. 保存层强校验

无论输入框是否已经自动转换，保存前仍应再次统一规范化并校验：

1. 规范化后是否为空
2. 是否符合机器值格式
3. 是否与现有记录发生重复
4. 是否只是大小写/空白/符号差异导致的重复

价值：

1. 防止未来新增其它入口时绕过前端输入约束
2. 防止因历史代码或批量导入漏过前端规则
3. 确保最终持久化边界稳定

##### C. 存量数据治理

在真正收口前，需要排查现有数据中是否已存在：

1. `Black` / `black`
2. `High Temp` / `high-temp`
3. 其它规范化后会撞成同一个机器值的记录

若存在冲突，不建议直接静默覆盖，而应：

1. 先列出冲突清单
2. 明确保留值与合并策略
3. 再做数据清洗或人工确认

价值：

1. 避免“新规则上线后，旧脏数据继续污染搜索/筛选结果”
2. 避免规范化迁移时误合并数据

#### 1.5 为什么不能只做输入自动转换

只做输入自动转并不等于长期稳妥，原因包括：

1. 历史存量数据不会自动变干净。
2. 未来可能存在导入、脚本、其它保存入口绕过当前页面。
3. 即使输入自动转换，如果保存边界不校验，仍可能出现“规范化后撞值”的问题。
4. 只做页面层处理，会让根因继续停留在 UI，而不是正式保存边界。

因此，输入自动规范化是必要条件，但不是充分条件。

#### 1.6 最小联动范围

若进入执行，建议最小联动以下范围：

1. `src/features/engineering/tabs/product-attributes-mgmt.tsx`
   - 容器层保存前校验与提示

2. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
   - `category.key` 输入约束与提示

3. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
   - `option.value` 输入约束与提示

4. `src/features/engineering/utils/` 下新增或扩展规范化工具
   - 统一的机器值规范化函数
   - 统一的重复比较函数

5. 产品属性保存链路对应的前后端保存边界
   - 至少评估并补齐最终入库前的规范化/防重逻辑

#### 1.7 新发现的复杂度：`category.key` 已经是跨链稳定标识

在进入执行前补充排查后，确认了一个关键事实：`category.key` 目前并不只是产品属性管理页的内部字段，而是已经被以下链路直接依赖：

1. 前端产品表单动态属性渲染
2. 前端产品摘要与属性读取工具
3. 前端部分 SKU / 版本逻辑
4. 后端产品 DTO / 保存链路
5. `product_attribute_values` 中的 `categoryKey`

当前系统内还存在硬编码稳定 key，例如：

1. `techSeries`
2. `tireType`
3. `brakeType`
4. `versionLevel`

这意味着：

1. 若仅从管理页层面把这些 key 直接改成全新 slug，会导致既有产品属性值与消费点失配。
2. `category.key` 的正式收口已不再是局部页面治理，而是跨前后端主链迁移。

因此，这一发现使得原先“`category.key / option.value` 同步统一机器值”的执行范围出现了升级，需要在正式实施前再次确认边界。

#### 1.8 建议的执行分叉

基于当前复杂度，建议在执行前明确选择以下两种方向之一：

##### 方向 A：稳定旧 `category.key`，优先收口 `option.value`

适用场景：

1. 当前优先目标是长期稳定，但不希望本轮升级为跨链重构。
2. 希望先把最容易形成大小写/搜索/筛选隐患的 `option.value` 完整治理掉。

执行内容：

1. 保留现有已落库 `category.key` 作为稳定兼容标识，不做全量改名迁移。
2. 对 `category.key` 新增更严格的输入与保存校验，防止继续写入随意新 key。
3. 把 `option.value` 完整收口为统一机器值格式（输入规范化 + 保存校验 + 服务端防重）。
4. 排查 `option.value` 的存量冲突并制定清洗策略。

优点：

1. 风险显著更低。
2. 能先解决最现实的搜索/匹配隐患。
3. 不会立即冲击既有产品主链。

代价：

1. `category.key` 的历史 camelCase 不会在这一轮彻底统一成 slug。
2. `category.key` 的完全规范化需要后续单独作为正式迁移任务推进。

##### 方向 B：正式推进 `category.key` 全链迁移

适用场景：

1. 你希望一次把 `category.key` 与 `option.value` 都收口到统一机器值体系。
2. 可以接受本轮升级为跨前后端主链迁移任务。

执行内容：

1. 为既有 `category.key` 设计目标 slug。
2. 同步迁移前端常量、动态属性消费点、产品表单与属性工具。
3. 同步迁移后端 DTO / 保存链 / 默认种子数据。
4. 迁移已有 `product_attribute_values.category_key` 与相关数据。
5. 再在新体系下收口 `option.value`。

优点：

1. 理论上一轮内把机器值体系完全统一。

代价：

1. 破坏面明显扩大。
2. 需要处理历史产品数据迁移与兼容。
3. 验证范围会远超当前页面本身。

#### 1.9 当前推荐

从“长期最稳”和“当前避免隐形大坑”两者平衡来看，我更推荐：

1. **本轮采用方向 A**：
   - 保持既有 `category.key` 兼容稳定
   - 完整收口 `option.value`
   - 同时收紧 `category.key` 新增/编辑规则，避免继续失控

2. **把 `category.key` 全链迁移单独立项**：
   - 作为后续正式迁移任务
   - 在有充分时间处理产品属性值与消费点联动时推进

#### 1.10 风险与控制策略

1. **规范化后撞值风险**
   - 如 `Black` 与 `black` 会收敛为同一个机器值。
   - 控制策略：先扫描冲突，再决定是否自动阻断、人工合并或迁移。

2. **已有业务依赖旧值风险**
   - 若历史逻辑直接使用原始大小写值，规范化后可能影响既有精确匹配。
   - 控制策略：先排查消费点，确认 `value` 的使用口径，再做正式收口。

3. **用户感知偏差风险**
   - 用户可能误以为机器值就是展示值。
   - 控制策略：继续把中英文展示名与机器值分离，并在表单中保持说明。

4. **只改前端不改边界风险**
   - 新旧入口可能继续写入不一致值。
   - 控制策略：不把方案停留在输入框层，必须评估并补齐保存边界。

#### 1.11 验证建议

若后续进入执行，建议至少验证：

1. 正常输入大小写、空格、符号时，表单值是否被稳定规范化
2. 仅大小写不同的重复值是否会被阻止保存
3. 编辑已有记录时，是否不会误伤合法展示字段
4. `pnpm exec eslint` 目标文件通过
5. `pnpm exec tsc --noEmit` 通过
6. 若服务端联动，补充对应保存链路的定向验证

#### 1.12 当前阶段结论

`/engineering/product-attributes` 如果要做到长期最稳，不应只做“输入自动变小写”的轻量补丁，而应把 `category.key / option.value` 当成正式机器值治理：**输入自动规范化 + 保存层强校验 + 存量数据冲突排查** 三层一起做，才能最大限度降低后续隐性排错成本。

### 1. engineering：`/engineering/product-attributes` 先拆分再按 `GEMINI.md` 对齐样式

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

当前 `/engineering/product-attributes` 对应页面为：

1. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

该页面已经具备一定的工业风基础，例如：

1. 页面根节点已使用 `animate-in fade-in duration-700`
2. 存在 `rounded-[24px/32px]`
3. 存在 `dashed` 边框与 `italic` 标题

但当前更大的问题已经不只是视觉细节，而是**文件过长与嵌套过深**：

1. `product-attributes-mgmt.tsx` 同时承载页面容器、统计卡片、双列表卡片、两个弹窗和大量表单字段
2. 如果继续在同一个超长文件里直接做样式对齐，容易把结构与视觉修改混在一起
3. 这会提高误伤逻辑与回归排查成本

因此，这轮最合理的顺序应调整为：**先拆分文件，再做样式对齐**。

#### 1.2 调整后的目标

本轮新的主目标是两步走：

1. 先把 `product-attributes-mgmt.tsx` 拆成更小的页面局部组件
2. 在拆分后的结构上，再继续按 `GEMINI.md` 的 UDS 1.0 做样式对齐

这样可以避免一次性在超长文件内做过多视觉细节修改，降低破坏逻辑的风险。

#### 1.3 对齐依据

本轮将以 `GEMINI.md` 中的 UDS 1.0 规范为准，重点对齐：

1. `italic` 标题
2. `dashed` 边框
3. `rounded-[24px/32px]` 的工业大圆角
4. 页面整体 `animate-in fade-in duration-700`

换句话说，本轮不是功能改造，而是**视觉密度与样式语言的一致性收口**。

#### 1.4 建议拆分边界

结合当前页面结构，建议优先拆出以下局部组件：

1. **页面头部卡片**
   - 负责标题、图标、副标题说明

2. **分类统计卡片区**
   - 负责顶部分类摘要卡片列表

3. **分类定义卡片**
   - 负责左侧分类表格与操作按钮

4. **分类项定义卡片**
   - 负责右侧分类项表格与操作按钮

5. **分类弹窗表单**
   - 负责分类新增/编辑表单视图

6. **分类项弹窗表单**
   - 负责分类项新增/编辑表单视图

#### 1.5 页面容器层建议保留的逻辑

拆分后，页面容器层仍建议保留：

1. 数据加载与 `loadData`
2. `categories / options / selectedCategoryKey` 等状态
3. 新增、编辑、删除、保存等事件处理函数
4. 弹窗开关状态与当前编辑对象

也就是说，先拆**展示层与局部表单结构**，暂不下沉复杂状态逻辑，避免拆分过猛。

#### 1.6 拆分后再对齐样式的路径

在拆分后的结构上，再统一以下视觉细节会更安全：

1. 页面头部卡片
2. 分类统计卡片
3. 左右双列表卡片
4. 两个弹窗

届时样式对齐仍按以下方向执行：

1. `italic` 标题
2. `dashed` 边框
3. `rounded-[24px/32px]`
4. 字号、tracking、字重、按钮密度与空态层级统一

#### 1.7 本轮目标

本轮目标是先完成**结构减重**，为后续安全样式对齐建立更清晰的文件边界：

1. 降低单文件长度与嵌套深度
2. 保持业务逻辑不变
3. 为下一步视觉对齐提供更低风险的改动面

#### 1.8 本轮刻意不做的部分

本轮保持不动：

1. 数据加载逻辑
2. 保存/删除交互逻辑
3. DTO / schema / service
4. 其它 engineering 页面
5. 大范围样式重做（留到拆分后再做）

原因是本轮先做结构减重，不把拆分和大规模视觉微调混在同一轮里。

#### 1.9 风险与控制策略

1. **拆分过猛风险**
   - 如果把状态逻辑也大规模下沉，会增加回归面。
   - 控制策略：本轮先只拆展示块和局部表单结构，容器层保留状态与事件处理。

2. **拆分后样式碎片化风险**
   - 如果边拆边各自调整样式，可能形成新的不一致。
   - 控制策略：先完成拆分边界，再集中做样式收口。

3. **中英文布局回归风险**
   - 拆分后组件 props 变化可能影响中英文文本布局。
   - 控制策略：保持现有响应式结构与文本逻辑，拆分后做中英文快速检查。

#### 1.10 验证建议

本轮执行后建议至少验证：

1. `pnpm exec eslint src/features/engineering/tabs/product-attributes-mgmt.tsx`
2. `pnpm exec tsc --noEmit`
3. 若拆出新文件，则同步验证新增组件文件
4. 人工快速检查页面功能未受拆分影响

#### 1.11 当前阶段结论

`/engineering/product-attributes` 当前最合理的下一步，不是继续在超长文件里直接磨样式，而是先把 `product-attributes-mgmt.tsx` 拆成更小的局部组件，再在拆分后的结构上继续做 `GEMINI.md` 风格对齐。这样更稳、更易验证，也更符合“避免长文件继续堆叠”的要求。

