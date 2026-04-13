# 变更记录与验证（walkthrough.md）

## 2026-04-13 - feat：735 应收应付记录级证据挂载 MVP

### 本轮目标

为应收/应付详情中的 `ReceiptRecord / PaymentRecord` 增加独立图片证据挂载能力，让页面支持“选中某条收款/付款记录 -> 查看并上传该记录对应截图”，而不是继续把财务证据混挂到订单级 evidence 中。

### 根因结论

本轮确认此前系统虽然已有：

1. 应收/应付台账
2. 收付款记录
3. 核销分摊
4. 图片上传基础设施

但仍缺失最关键的一层：**记录级证据挂载关系**。

这导致系统只能表达“收了多少钱 / 付了多少钱”，不能表达“这一次对应哪几张截图”。若继续把附件语义放在订单 evidence 或详情页局部状态里，上传、业务、展示三层会继续耦合。

### 实现细节

1. **新增后端记录级 evidence 模型**
   - 新增 `server/models/settlement_evidence.go`
   - 增加：
     - `SettlementEvidenceAsset`
     - `SettlementRecordEvidence`
   - 资源元数据与记录挂载关系分离，避免直接把 evidences JSON 塞进 `receipt_records / payment_records`

2. **新增后端 DTO / service / handler / route 骨架**
   - 新增：
     - `server/services/settlement_evidence_dto.go`
     - `server/services/settlement_evidence_mapper.go`
     - `server/services/settlement_evidence_service.go`
     - `server/handlers/settlement_evidence_handler.go`
     - `server/routes/routes_settlement_evidence.go`
   - 提供：
     - 收款记录 evidence 查询 / 创建 / 删除
     - 付款记录 evidence 查询 / 创建 / 删除

3. **注册迁移与主路由入口**
   - 更新 `server/db/db.go`
   - 更新 `server/routes/routes.go`
   - 让 settlement evidence 模型进入 AutoMigrate，并在主路由中注册新接口

4. **新增前端 settlement evidences 独立目录**
   - 新增：
     - `src/features/trading/settlement-evidences/contracts/settlement-evidence-api-dto.ts`
     - `src/features/trading/settlement-evidences/services/settlement-evidence-service.ts`
     - `src/features/trading/settlement-evidences/hooks/use-settlement-record-evidences.ts`
     - `src/features/trading/settlement-evidences/components/settlement-record-evidence-panel.tsx`
     - `src/features/trading/settlement-evidences/components/settlement-evidence-upload.tsx`
     - `src/features/trading/settlement-evidences/components/settlement-evidence-gallery.tsx`
   - 采用独立目录承载，符合“能解耦就拆文件”的约束

5. **应收/应付详情接入记录证据区**
   - 更新：
     - `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
     - `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
     - `src/features/trading/query-keys.ts`
   - 记录表现在支持选中某条记录
   - 下方新增独立 evidence panel
   - 当前采用懒加载记录证据方案，避免首轮就侵入现有 AR/AP 详情 DTO

### 当前实现边界

本轮明确保持：

1. 仅支持**图片**记录证据挂载
2. 未扩到 PDF / Excel / OCR
3. 未引入阶段款 / 里程碑语义
4. 未重构订单级 evidence 体系
5. 未重写应收应付整体页面结构

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./routes ./services -run ^$`

结果：

1. 前端 TypeScript 编译校验通过
2. 后端 handlers / routes / services 编译型校验通过

补充说明：

1. 之前尝试的 `go test ./handlers ./routes ./services -run "ArAp|Settlement|Receipt|Payment"` 暴露的是仓库内既有无关测试夹具问题（如 `purchase_order_lines.returned_qty`、`payment_methods` 测试表缺失），未在本轮任务中扩散修复

### 当前阶段结论

本轮已经把“按收付款记录挂截图”的最小链路搭起来：后端具备记录级 evidence 增删查骨架，前端详情也已支持按记录查看和上传图片证据。这样财务证据开始从“订单附件语义”中解耦出来，为后续扩展文档类附件与更完整的审计链保留了清晰边界。

### 增量更新：方向 1 - 记录表展示证据数与缺证据状态

在 MVP 基础上，继续完成了记录表层的可视化补强：

1. **后端详情接口直接返回记录 evidence 列表**
   - 更新 `server/models/ar_ap_ledger.go`
   - 更新 `server/services/ar_ap_dto.go`
   - 更新 `server/services/ar_ap_query_service.go`
   - 为 `ReceiptRecord / PaymentRecord` 增加 `Evidences` 关联
   - `GetReceivableLedgerByID / GetPayableLedgerByID` 与事务内 reload 现在会直接 preload `Evidences.Asset`
   - 这样详情记录表可直接使用后端 authoritative evidence 列表，不需要前端为每条记录额外发 N 次请求

2. **前端记录 DTO 增加 evidences 字段**
   - 更新：
     - `src/features/trading/receivables/contracts/receivable-api-dto.ts`
     - `src/features/trading/payables/contracts/payable-api-dto.ts`

3. **应收/应付记录表增加两列**
   - 更新：
     - `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
     - `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 新增：
     - `证据数`
     - `凭证状态`
   - 当前判定规则：
     - `evidences.length > 0` -> `已挂凭证`
     - `evidences.length === 0` -> `缺少凭证`

4. **本轮收益**
   - 财务人员在不点开证据区时，就能直接看到哪些记录缺凭证
   - 避免详情页打开时按记录逐条查询 evidence 数量，减少前端局部补丁式请求风暴

### 增量验证结果

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./routes ./services -run ^$`

结果：

1. 前端 TypeScript 编译校验通过
2. 后端 handlers / routes / services 编译型校验通过

### 增量更新：方向 1 - 只看缺凭证记录筛选

继续在记录表层补充缺凭证治理能力：

1. **应收记录表增加本地筛选开关**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 新增 `showOnlyMissingEvidenceRecords`
   - 基于 `record.evidences.length === 0` 做前端本地过滤
   - 空态文案区分：
     - `暂无收款记录`
     - `当前没有缺凭证的收款记录`

2. **应付记录表增加本地筛选开关**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 新增 `showOnlyMissingEvidenceRecords`
   - 基于 `record.evidences.length === 0` 做前端本地过滤
   - 空态文案区分：
     - `暂无付款记录`
     - `当前没有缺凭证的付款记录`

3. **当前实现策略**
   - 未新增后端接口
   - 直接复用后端已返回的 `evidences` 列表
   - 避免再次引入逐条请求或筛选状态漂移

### 本次筛选增强验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过

### 增量更新：方向 1 - 缺凭证高亮样式

继续增强缺凭证记录的可见性，但保持现有详情弹窗视觉体系不变：

1. **缺凭证行增加轻量背景提醒**
   - 更新：
     - `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
     - `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当 `record.evidences.length === 0` 时，记录行增加：
     - `bg-destructive/5`
     - `hover:bg-destructive/10`

2. **缺凭证状态改为醒目 badge**
   - `已挂凭证` 使用绿色轻量 badge
   - `缺少凭证` 使用红色轻量 badge
   - 仍然沿用当前系统按钮/表格/文本层级，不额外引入新字号或新斜体规则

3. **样式一致性约束**
   - 未调整新增卡片标题的 `text-sm font-medium` 口径
   - 未调整筛选按钮的 `Button size='sm'` 体系
   - 未新增额外斜体样式，避免与现有 dialog/table 风格漂移

### 本次样式增强验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过

### 增量更新：记录级证据区与系统视觉完全对齐

在用户确认后，继续对记录级 evidence UI 做了一轮专门的视觉收口，目标不是新增功能，而是把新增区块与现有 trading 详情视觉语言完全拉齐。

1. **以现有 order evidence 视觉语言为基准收口**
   - 对齐基准：
     - `src/features/trading/components/parts/order-evidence-manager.tsx`
     - `src/features/trading/components/parts/order-evidence-gallery.tsx`
   - 收口目标：
     - 标题 icon + 小号大写斜体标题
     - dashed 容器 / 空态占位语言
     - gallery 卡片圆角、边框、阴影、按钮层级
     - upload 区拖放风格视觉表达

2. **记录 evidence panel 视觉收口**
   - 更新 `src/features/trading/settlement-evidences/components/settlement-record-evidence-panel.tsx`
   - 调整内容：
     - 标题改为 `ImageIcon + text-[10px] font-black uppercase tracking-[0.2em] italic`
     - 右上角增加与 evidence 数量一致的轻量计数
     - “未选择记录 / 加载中 / 加载失败”全部改为统一的 rounded dashed 空态容器

3. **上传区视觉收口**
   - 更新 `src/features/trading/settlement-evidences/components/settlement-evidence-upload.tsx`
   - 调整内容：
     - 备注标签改为小号大写标签
     - 备注输入改为与现有 evidence note 输入一致的 `rounded-xl + text-xs`
     - 上传触发区改为大号 dashed dropzone，而不是普通 outline 按钮

4. **gallery 卡片视觉收口**
   - 更新 `src/features/trading/settlement-evidences/components/settlement-evidence-gallery.tsx`
   - 调整内容：
     - 空态改为 icon + italic placeholder
     - 证据卡片改为 `rounded-2xl border bg-background p-3 shadow-sm`
     - 图片 hover 改为 scale 过渡
     - 删除按钮改为圆形 destructive icon 按钮，与现有 evidence 卡片口径一致

5. **本轮视觉边界**
   - 保持应收 / 应付详情原有区块标题层级不动，避免为了对齐 evidence 区反而破坏当前 dialog 内部既有节奏
   - 不新增后端接口
   - 不修改记录 evidence 业务语义

### 本次视觉收口验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过

## 2026-04-13 - fix：734 新建型号模板链路加固

### 本轮目标

让“新建型号”场景的模板解析 authority 与编辑态保持一致，避免创建态继续只依赖前端 `typeId -> parent chain -> template` 本地推断而再次出现模板误判。

### 根因结论

本轮确认上一轮虽然已经稳住了编辑态，但创建态仍保留另一套前端局部解析 authority：

1. 用户选择分类后，前端会按当前 `productTypes` 递归父链解析模板
2. 若当前 options 上下文不完整、模板缓存陈旧或模板绑定真实失效，创建态仍可能再次出现与编辑态相同的模板断裂问题
3. 这样会导致创建态 / 编辑态对同一分类无法保证得到一致模板结果

因此本轮关键不是继续给创建态叠加重试，而是**让创建态也优先消费后端 authoritative template resolution**。

### 实现细节

1. **新增创建态后端模板解析入口**
   - 更新 `server/services/product_edit_read_service.go`
   - 导出 `ProductTemplateResolutionResult`
   - 新增 `ResolveProductTypeTemplate(typeID string)`
   - 复用后端已有模板解析 authority，按 `typeId` 返回：
     - `resolvedTemplateId`
     - `resolvedTemplateKey`
     - `templateResolutionSource`
     - `templateResolutionError`

2. **新增创建态模板解析 handler / route**
   - 更新 `server/handlers/product_type.go`
   - 新增 `GetProductTypeTemplateResolutionHandler`
   - 更新 `server/routes/routes.go`
   - 注册：
     - `GET /api/v1/engineering/product-types/template-resolution?typeId=...`

3. **前端新增创建态模板解析 service**
   - 更新 `src/features/engineering/contracts/product-type-api-dto.ts`
   - 更新 `src/features/engineering/services/product-type-service.ts`
   - 新增 `getTemplateResolution(typeId)`

4. **创建态改为优先消费后端 authority**
   - 更新 `src/features/engineering/components/product-action-dialog.tsx`
   - 创建态现在会先调用后端 `getTemplateResolution(typeId)`
   - 若后端已解析出有效模板，则优先使用后端结果
   - 仅在后端 authority 仍无法映射具体模板时，才退回本地 `getCreateProductTemplate(...)` 最小兜底

### 当前实现边界

本轮明确保持：

1. 未重构整个产品模板系统
2. 未改产品规格 UI 结构
3. 未改 BOM 模块
4. 未处理无关样式 warning

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./services ./handlers ./routes -run "ProductType|Product|Template"`

结果：

1. 前端 TypeScript 编译校验通过
2. 后端产品类型 / 产品 / 模板相关定向测试通过

### 当前阶段结论

本轮已经把“新建型号”链路也接入后端模板解析 authority：创建态现在会优先使用后端按 `typeId` 返回的 resolved template 结果，而不是继续只靠前端本地父链推断。这样创建态与编辑态现在更接近同一套模板裁决语义，可显著降低同类模板断裂问题从编辑态转移到创建态的风险。

## 2026-04-13 - fix：733 产品模板绑定根因级稳住

### 本轮目标

将产品模板绑定的 authority 从前端局部推断收口到后端读取链，避免编辑态与创建态因前后端重复解析、缓存漂移或父链不一致而再次出现 `Template Binding Broken` 误判。

### 根因结论

本轮确认真正的问题不是“前端没有重试”，而是**模板解析 authority 分散**：

1. 后端此前只派生 `templateKey`
2. 前端编辑弹窗又再次根据 `typeId / parentId / templateId / templateKey` 本地猜测具体模板
3. 同一模板绑定语义被前后端重复推断，导致：
   - 缓存时点不同会漂移
   - 父链缺失与模板缺失原因无法 machine-readable 暴露
   - 前端只能根据局部上下文做二次猜测

因此本轮核心不是继续堆前端 fallback，而是**把 resolved template authority 收回后端**。

### 实现细节

1. **后端产品模型增加显式模板解析结果字段**
   - 更新 `server/models/product.go`
   - 新增非持久化字段：
     - `ResolvedTemplateID`
     - `ResolvedTemplateKey`
     - `TemplateResolutionSource`
     - `TemplateResolutionError`

2. **后端产品 API DTO 暴露 resolved template authority**
   - 更新 `server/handlers/product_api_dto.go`
   - 更新 `server/handlers/product_mapper.go`
   - 将后端解析结果显式传递到前端 contract

3. **后端统一模板解析 authority**
   - 更新 `server/services/product_edit_read_service.go`
   - 将原本“只返回 `templateKey`”升级为完整解析结果：
     - `resolvedTemplateId`
     - `resolvedTemplateKey`
     - `templateResolutionSource`
     - `templateResolutionError`
   - 失败原因现在可区分：
     - `missingTypeId`
     - `missingTypeBinding`
     - `missingTemplateBinding`
     - `cyclicTypeChain`
     - `templateNotFound`
     - `templateInactive`
     - `templateKeyMissing`
   - 同时继续保留 `templateKey` 兼容现有调用点

4. **前端 Product contract 接入后端 resolved 字段**
   - 更新 `src/features/engineering/data/schema.ts`
   - 更新 `src/features/engineering/contracts/product-api-dto.ts`
   - 更新 `src/features/engineering/adapters/product-api-adapter.ts`

5. **产品编辑弹窗改为优先消费后端 authority**
   - 更新 `src/features/engineering/components/product-action-dialog.tsx`
   - 编辑态优先使用：
     - `resolvedTemplateId`
     - `resolvedTemplateKey`
     - `templateResolutionSource`
     - `templateResolutionError`
   - 仅在后端 authority 仍无法映射具体模板时，才继续执行本地最小 fallback
   - 保留现有红色错误态，但错误文案现在可带出后端解析结果

### 当前实现边界

本轮明确保持：

1. 未重构整个产品模板系统
2. 未改产品规格 UI 结构
3. 未改 BOM 模块
4. 未处理无关样式 warning

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./services ./handlers -run "Product|Template"`

结果：

1. 前端 TypeScript 编译校验通过
2. 后端产品 / 模板相关定向测试通过

### 当前阶段结论

本轮已经把产品模板绑定的主 authority 从“前端 + 后端各自推断”收口到后端读取链：后端现在会返回显式 resolved template 结果与失败原因，前端则优先消费后端 authority，并只保留最小本地兜底。这样可以系统性降低模板绑定因缓存漂移、父链不一致或解析语义分散而再次出现误判的风险。

## 2026-04-13 - fix：编辑产品规格 `Template Binding Broken`

### 本轮目标

修复“编辑产品规格”弹窗中由于模板绑定解析失败而出现 `Template Binding Broken` 的问题，避免后端模板绑定已更新但前端仍使用旧上下文元数据时误判为模板链断裂。

### 根因结论

本轮确认该问题并不只是一个单纯的前端提示问题，而是模板解析强依赖两类上下文：

1. 当前弹窗传入的 `productTypes`
2. 当前会话中的 `product templates` 列表缓存

编辑态模板解析链路会先尝试：

1. `typeId -> parent chain -> templateId -> template`
2. 若失败，再尝试 `productTemplateKey -> concrete template`

当当前弹窗上下文仍是旧分类树或旧模板缓存时，即使后台绑定已修正，前端仍可能把该产品类型误判为“无可解析模板绑定”，从而显示 `Template Binding Broken`。

### 实现细节

1. **增强产品编辑弹窗的模板解析 fallback**
   - 更新 `src/features/engineering/components/product-action-dialog.tsx`
   - 保留当前上下文解析优先级不变：
     - 编辑态：先按 `type chain` / `productTemplateKey` 解析
     - 创建态：先按 `type chain` 解析

2. **当前上下文解析失败时，主动刷新元数据后重试**
   - 新增 fresh fallback：
     - `ProductTypeService.getProductTypes({ isOptions: true })`
     - `productTemplateService.getTemplates({ fresh: true })`
   - 若第一次解析失败，则使用最新 product types 与 templates 再解析一次
   - 这样可以覆盖“后台已更新模板绑定，但前端仍停留在旧会话元数据”的场景

3. **保留真实缺绑定时的错误态可见性**
   - 若 fresh metadata 解析后仍然没有模板，则继续显示原有 `Template Binding Broken`
   - 本轮没有把错误态静默吞掉，也没有把问题伪装成成功

### 当前实现边界

本轮明确保持：

1. 未改产品规格 UI 结构
2. 未重构整个产品模板系统
3. 未改 BOM 模块
4. 未处理无关样式 warning

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮通过在产品编辑弹窗中增加 fresh metadata fallback，修复了“模板绑定已经存在但当前前端上下文仍判定失败”的高概率问题，同时保留了真实缺模板绑定时的明确错误提示。这样可以优先修正你当前遇到的“还是模板”问题，但不会掩盖真正缺失的分类模板绑定。

## 2026-04-13 - refactor：722 BOM 枚举/日期控制字段统一收口

### 本轮目标

收口 BOM 中 `changeType / status / effectiveFrom / effectiveTo` 的 authority，避免这组字段继续分散在初始化、输入、保存、展示四层各自局部修补。

### 根因结论

本轮确认 722 的真实问题不是“缺少规则”，而是“规则分散”：

1. 底层 codec 已有 normalize
2. 保存前 `normalizeBOMInput(...)` 已存在
3. table / preview 展示层已有兜底 normalize
4. 但 BOM 表单初始化与输入层此前仍在多个位置分散处理这组字段

因此当前真正要修的不是新增另一套规则，而是**收口 BOM 表单 authority**。

### 实现细节

1. **新增 BOM control 字段统一 helper**
   - 更新 `src/features/engineering/utils/product-code-normalization.ts`
   - 新增 `normalizeBOMControlFieldPatch(...)`
   - 统一收口：
     - `changeType`
     - `status`
     - `changeOrderNo`
     - `revisionNo`
     - `siteCode`
     - `effectiveFrom`
     - `effectiveTo`
     - `isDefaultSite`

2. **收口 BOM 表单初始化层 authority**
   - 更新 `src/features/engineering/hooks/use-bom-form-initialization.ts`
   - 创建态 / 编辑态 reset 前统一走 `normalizeBOMControlFieldPatch(...)`
   - 让表单进入可编辑态时，这组 control 字段就尽量已经是规范值

3. **收口 BOM 表单输入层 authority**
   - 更新 `src/features/engineering/components/bom-editor/bom-form-header.tsx`
   - `changeOrderId` 联动回填、select 输入、date 输入、siteCode 输入，统一改走 `normalizeBOMControlFieldPatch(...)`
   - 减少组件内部对这组字段的分散 normalize 分支

4. **保留保存层与展示层兜底不变**
   - `src/features/engineering/services/bom-service.ts` 继续保留 `normalizeBOMInput(...)`
   - `bom-table.tsx / bom-preview.tsx` 继续保留展示层 normalize
   - 本轮不削弱原有最终防线

### 当前实现边界

本轮明确保持：

1. 未扩到 `items / substitutes`
2. 未改 BOM 表格/预览的 UI 结构
3. 未处理无关样式 warning

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把 BOM 中 `changeType / status / effectiveFrom / effectiveTo` 的 authority 从“初始化层 + 输入层分散处理”收口到更清晰的表单 control helper 上，同时保留保存层和展示层兜底。这意味着后续如果继续维护 BOM 表单，不需要再分别在多个组件分支中手动补 normalize，风险明显更低。

## 2026-04-13 - refactor：`use-bom-form.ts` 最小职责拆分

### 本轮目标

在不改变 BOM 弹窗初始化行为、编辑态回填语义与 delta 跟踪语义的前提下，将 `use-bom-form.ts` 中混杂的选项读取与初始化映射拆出，让该文件回归表单 orchestration hook。

### 实现细节

1. **抽离 BOM 表单 options 层 hook**
   - 新增 `src/features/engineering/hooks/use-bom-form-options.ts`
   - 当前单独负责：
     - products 选项读取
     - materials 选项读取
     - changeOrders 选项读取
     - 相关缺失分支处理
     - 相关日志上报

2. **抽离 BOM 表单 initialization 层 hook**
   - 新增 `src/features/engineering/hooks/use-bom-form-initialization.ts`
   - 当前单独负责：
     - 创建态初始值映射
     - 编辑态回填/reset
     - `changeOrderId` 合法性清洗
     - reset 后 tracker 同步

3. **收口 `use-bom-form.ts` 为薄 orchestration hook**
   - 更新 `src/features/engineering/hooks/use-bom-form.ts`
   - 当前保留：
     - `useForm`
     - `useFieldArray`
     - `useDeltaTracker`
   - 当前组合：
     - `useBOMFormOptions`
     - `useBOMFormInitialization`
   - 对外继续向 `BOMActionDialog` 暴露稳定接口，避免扩大调用点改动面

### 当前实现边界

本轮明确保持：

1. 未改 BOM 表单 UI 结构
2. 未扩散到 `use-bom-data.ts`
3. 未抽后端 BOM 服务

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把 `use-bom-form.ts` 从“表单状态 + 选项读取 + 初始化映射 + 清洗 + delta 跟踪”混杂状态收口为更清晰的 orchestration hook。现在 BOM 弹窗的 options 读取与 initialization 逻辑都拥有独立 hook，后续调整其中一层时，不再需要在单个大 form hook 中冒险混改其它职责。

## 2026-04-13 - fix：BOM 新建弹窗总成本显示为 `楼0.00`

### 本轮目标

修复 BOM 新建弹窗中“预估总成本”与工段分布概览成本显示为 `楼0.00` 的异常，确保 BOM 成本概览展示不再被错误硬编码前缀污染。

### 根因结论

本轮已确认该问题不是 BOM 成本计算链错误，而是 `summary-panel.tsx` 的展示层硬编码异常：

1. 总成本显示被写成了 `楼{totalCost.toFixed(2)}`
2. 分段成本显示被写成了 `楼{sectionCost.toFixed(1)}`

因此本次异常属于展示层污染，不涉及成本公式本身。

### 实现细节

1. **修复成本展示前缀**
   - 更新 `src/features/engineering/components/bom-editor/summary-panel.tsx`
   - 移除总成本与分段成本前面的错误硬编码字符 `楼`
   - 保持 `totalCost` 与 `sectionCost` 的计算逻辑完全不变

2. **顺手修复同文件的真实依赖错误**
   - 将 `resolveItemValue` 包装为 `useCallback`
   - 补齐 `totalCost` 的 `useMemo` 依赖
   - 避免继续留下 React Compiler / hooks 依赖不一致问题

### 当前实现边界

本轮明确保持：

1. 未改 BOM item 的价格或用量计算逻辑
2. 未改 BOM 表单结构
3. 未扩散到后端 BOM 读写链路

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把 BOM 新建弹窗中的 `楼0.00` 展示异常收口为一次明确的最小修复：问题根因在展示层硬编码，而不是成本计算链。现在总成本与分段成本的显示已经恢复正常，同时同文件的真实依赖错误也一并收掉，避免后续继续产生无关噪音。

## 2026-04-13 - refactor：`use-bom-data.ts` 最小职责拆分

### 本轮目标

在不改变 `/engineering/bom` 页面核心交互与已修好错误态逻辑的前提下，将 `use-bom-data.ts` 中混杂的读取链、导入导出链拆出，让该文件回归薄 orchestration hook。

### 实现细节

1. **抽离 BOM 读取层 hook**
   - 新增 `src/features/engineering/hooks/use-bom-read-data.ts`
   - 当前单独负责：
     - BOM 列表 query
     - 产品 query
     - 物料 query
     - `isLoading`
     - `loadError`
     - 读取结果分流
     - 读取链日志与 toast

2. **抽离 BOM 导入导出层 hook**
   - 新增 `src/features/engineering/hooks/use-bom-import-export.ts`
   - 当前单独负责：
     - 模板下载
     - Excel 解析
     - 导入后二次加工
     - 导入相关 fail loudly / logger / toast

3. **收口 `use-bom-data.ts` 为薄 orchestration hook**
   - 更新 `src/features/engineering/hooks/use-bom-data.ts`
   - 当前行为：
     - 组合 `useBOMReadData`
     - 组合 `useBOMWriteActions`
     - 组合 `useBOMImportExport`
   - 对外继续向 `BOMMgmt` 暴露基本一致的接口，避免扩大页面调用改动面

### 当前实现边界

本轮明确保持：

1. 未抽后端 `engineering_master_service.go`
2. 未重构 BOM UI 组件目录
3. 未扩散到 `use-bom-form.ts`
4. BOM 页面已有错误态逻辑保持不变

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经将 `use-bom-data.ts` 从“读取 + 写入 + 导入导出 + 错误策略”混杂状态收口为更清晰的组合层：BOM 读取链与导入导出链现在各自拥有独立 hook，后续修读链时不再容易误伤导入链，修导入链时也不必再在单个大 hook 中冒险改动其它职责。

## 2026-04-13 - fix：`/engineering/bom` 页面 500 根因修复

### 本轮目标

修复 `/engineering/bom` 页面在 BOM 列表加载阶段直接 500 并触发整页崩溃的问题，确保 BOM 页面在接口失败或契约异常时具备明确错误呈现，而不是被 `failLoudly` 直接炸掉。

### 根因结论

本轮确认该问题由两层因素叠加导致：

1. **前后端 BOM 契约存在 null 不一致**
   - 后端 `models.BOM.ChangeOrderID` 为 `*string`
   - 后端 `models.ChangeOrder.ProductID` 为 `*string`
   - 前端 `bomSchema / changeOrderSchema` 原本仅接受 `string | undefined`
   - 因此当后端返回 `null` 时，Zod parse 可能直接失败

2. **BOM 列表服务与全局 API 混合数组分页响应不兼容**
   - 全局 `apiFetch` 在分页场景下可能返回带有 `total/page/pageSize` 元数据的 Hybrid Array
   - `bomService.getBOMs()` 一度仍按普通对象响应直接执行 `bomListSchema.parse(...)`
   - 因此会出现：`Invalid input: expected object, received array`

3. **BOM 页面读取链对失败分支过于激进**
   - `useBOMData` 原逻辑在 query 加载结束且 `data` 为空时直接：
     - `failLoudly(...)`
     - `throw error`
   - 这会把上游接口失败或契约失败放大成 React error boundary 接管的整页崩溃

### 实现细节

1. **修复 BOM / ChangeOrder 前端 schema 的 null 兼容**
   - 更新 `src/features/engineering/data/schema.ts`
   - 调整：
     - `changeOrderSchema.productId`
     - `bomSchema.changeOrderId`
   - 现在接受后端指针字段可能返回的 `null`

2. **修复 BOM 列表服务对 Hybrid Array 分页响应的适配**
   - 更新 `src/features/engineering/services/bom-service.ts`
   - 新增 `normalizeBOMListResponse(...)`
   - 当前同时兼容：
     - 标准分页对象 `{ items, total, page, pageSize }`
     - `apiFetch` 返回的 Hybrid Array 分页结构

3. **修复 `useBOMData` 的错误分支设计**
   - 更新 `src/features/engineering/hooks/use-bom-data.ts`
   - 当前改为：
     - query loading 时返回空数组占位
     - query error 时返回空数组占位
     - 仅在“无错误、非加载、仍无数据”时才视为真正的 critical missing
   - 同时暴露 `loadError` 给页面层处理

4. **BOM 管理页补充页面内错误态**
   - 更新 `src/features/engineering/tabs/bom-mgmt.tsx`
   - 当 `loadError && !isLoading` 时，页面显示明确错误提示区块
   - 避免继续由 error boundary 接管整页

### 当前实现边界

本轮明确保持：

1. 未重构 BOM 表格或编辑弹窗结构
2. 未扩散到无关 engineering 模块
3. 当前主要修复读取契约与错误分流，不扩成 BOM 全模块重构

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把 `/engineering/bom` 页面 500 的两个直接根因同时收住：一方面修正了 BOM 前后端契约中 `null` 字段不兼容的问题，另一方面把 `useBOMData` 从“接口失败即整页崩溃”的过激分支改为“页面内明确错误态”。这样即使上游接口后续再出现失败，BOM 页面也不会再直接被 React error boundary 炸成整页异常。

## 2026-04-13 - fix：快捷扫描侧边栏 i18n 系统化收口

### 本轮目标

修复“快捷扫描”侧边栏出现中文壳层 + 英文卡片内容混搭的问题，并将 quick-actions 模块整体接入系统化中英文模式匹配，而不是只替换几句表面文案。

### 实现细节

1. **quick-actions registry 改为文案 key authority**
   - 更新 `src/features/quick-actions/types.ts`
   - 更新 `src/features/quick-actions/data/quick-action-registry.ts`
   - `QuickActionDefinition` 不再持有最终 `title / description` 字符串
   - 改为持有：
     - `titleKey`
     - `descriptionKey`

2. **drawer / handle 接入统一语言系统**
   - 更新 `src/features/quick-actions/components/quick-action-drawer.tsx`
   - 更新 `src/features/quick-actions/components/quick-action-handle.tsx`
   - 统一接入 `useLanguage()` 与 `t(...)`
   - 当前已覆盖：
     - 抽屉标题
     - 抽屉描述
     - 空态标题
     - 空态说明
     - 卡片标题
     - 卡片描述
     - 关闭按钮
     - 入口按钮文字
     - `aria-label`

3. **补齐 quick-actions 中英文 locale**
   - 新增 `src/locales/messages/zh-CN/quickActions.ts`
   - 新增 `src/locales/messages/en-US/quickActions.ts`
   - 更新：
     - `src/locales/messages/zh-CN/index.ts`
     - `src/locales/messages/en-US/index.ts`
   - 让 quick-actions 模块正式进入统一 locale 聚合体系

### 当前实现边界

本轮明确保持：

1. 未改 quick-actions 权限判定逻辑
2. 未新增新的快捷动作入口
3. 未改扫描页面业务逻辑
4. 当前仅收口 quick-actions 模块自身的国际化链路

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把 quick-actions 模块从“中文硬编码 + 英文硬编码混搭”收口到统一的 `t(...) + locale keys` 体系中。现在快捷扫描侧边栏在中文与英文模式下都具备完整文案来源，后续新增快捷动作时也不需要再继续散落硬编码字符串。

## 2026-04-13 - refactor：新增型号模板读取链单独抽离

### 本轮目标

将“新增型号创建态的模板读取链”从与编辑态共用的解析入口中单独抽离，明确创建态与编辑态是两种不同 authority，避免后续维护时误把两条路径混成一条。

### 实现细节

1. **新增创建态模板解析文件**
   - 新增 `src/features/engineering/utils/product-create-template-resolution.ts`
   - 单独承载新增型号模板读取链：
     - `resolveCreateProductTemplate(...)`
     - `getCreateProductTemplate(...)`
   - 该链只负责：
     - 按当前 `typeId` 解析模板
     - 沿分类祖先链向上查找模板绑定
   - 该链明确不承载历史产品 `templateKey` 兜底

2. **创建态 / 编辑态调用点显式分流**
   - 更新 `src/features/engineering/components/product-action-dialog.tsx`
   - 当前行为：
     - `isEdit === false` 时，创建态调用 `getCreateProductTemplate(...)`
     - `isEdit === true` 时，编辑态继续调用 `getEffectiveTemplate(...)`
   - 同时把日志中的 `mode` 明确为 `create / edit`，避免后续排查时混淆两条链路

3. **编辑态解析文件语义收口**
   - 更新 `src/features/engineering/components/specs/index.ts`
   - 将编辑态模板解析参数/返回命名收口为更明确的编辑语义
   - 继续保留编辑态的历史 `templateKey` 兜底能力，不让该逻辑反向污染新增态

### 当前实现边界

本轮明确保持：

1. 未改产品模板管理 UI
2. 未重构规格组件本身
3. 未扩散到后端产品写入链路
4. 当前只做创建态 / 编辑态模板读取分流，不继续扩散到其它产品表单语义

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

本轮已经把“新增型号模板读取链”从“编辑态有效模板解析链”中明确拆开：创建态现在只按当前表单选择与分类祖先链解析模板，编辑态则继续保留既有产品补全与历史 `templateKey` 兜底语义。这样后续即使继续调整其中一条链，也不容易再误伤另一条路径。

## 2026-04-13 - refactor：已建产品编辑读取链从 product_master_service.go 单独抽离

### 本轮目标

将“已建产品点击编辑时的读取补全链”从 `server/services/product_master_service.go` 中单独抽离，避免高敏感编辑态读取逻辑继续埋在大文件里，同时保持现有对外接口与返回契约完全不变。

### 实现细节

1. **新增独立编辑读取 service 文件**
   - 新增 `server/services/product_edit_read_service.go`
   - 单独承载编辑态高风险读取补全逻辑：
     - `productTypeTemplateBinding`
     - `resolveTemplateIDFromProductTypeChain(...)`
     - `loadProductTypeTemplateBindings(...)`
     - `loadTemplateKeyByTemplateID(...)`
     - `enrichProductsForEditRead(...)`

2. **product_master_service.go 保留对外入口，内部改为委托**
   - 更新 `server/services/product_master_service.go`
   - `applyDerivedTemplateKeys(...)` 不再内联实现完整模板派生链
   - 现在统一委托到 `enrichProductsForEditRead(...)`
   - 这样 `GetProductByID(...)`、列表读取等外部调用点签名不变，但编辑态读取补全逻辑已经独立收口

3. **补充抽离后的稳定性回归测试**
   - 更新 `server/services/product_master_service_test.go`
   - 当前已覆盖：
     - 直接分类绑定模板
     - 子分类继承父分类模板
     - 无模板绑定时返回空 `templateKey`

### 当前实现边界

本轮明确保持：

1. 未全面拆分 `product_master_service.go` 的其它 CRUD 链路
2. 未改变 `GetProductByID(...)` 等现有对外接口
3. 未扩散到前端 UI 结构重构
4. 未扩散到 BOM / Routing / 权限等无关模块

### 验证结果

已执行：

1. `go test ./services -run "TemplateKeys|ProductTypeTemplate|NoBinding"`

结果：

1. 后端定向回归通过。

### 当前阶段结论

本轮已经把“已建产品编辑读取链”从超大文件中最小安全地单独抽离出来：高敏感模板派生与编辑态补全逻辑现在位于独立文件、独立职责入口中，而对外调用契约保持不变。这样后续如果继续审计或增强编辑态读取链，将不再需要在 `product_master_service.go` 大文件中冒险改动整段逻辑。

## 2026-04-13 - fix：产品型号编辑弹窗规格模板不回显根因修复

### 本轮目标

修复“已建立的产品型号点击编辑后，规格模板不显示、模板表单不渲染”的问题，并确保修复落在模板绑定解析根因上，而不是仅在弹窗里做表面回显补丁。

### 根因结论

本轮确认真实问题不在模板页数据本身，而在“模板绑定解析语义”前后端同时存在偏差：

1. **后端模板派生链路过窄**
   - `server/services/product_master_service.go`
   - 旧逻辑在派生产品 `templateKey` 时，只检查产品当前 `typeId` 对应分类自己的 `template_id`
   - 如果模板绑定在父分类、产品挂在子分类，则产品返回给前端时 `templateKey` 会被派生成空

2. **前端编辑弹窗解析链路过窄**
   - `src/features/engineering/components/product-action-dialog.tsx`
   - 旧逻辑只检查当前分类自身的 `templateId`
   - 一旦当前分类未直接绑定模板，即使父分类已绑定、或产品历史上已有派生 `templateKey`，弹窗也会静默退化为“待选择规格模板”

因此这是一个**模板绑定解析规则在前后端同时收窄**的问题，而不是单纯 UI 不回显。

### 实现细节

1. **后端：模板派生改为沿分类祖先链解析**
   - 更新 `server/services/product_master_service.go`
   - 新增祖先链模板解析 helper：
     - `resolveTemplateIDFromProductTypeChain(...)`
   - `applyDerivedTemplateKeys(...)` 不再只看当前分类自身 `template_id`
   - 现在会沿 `parent_id -> parent_id ...` 向上查找第一个有效模板绑定

2. **后端：补回归测试覆盖父分类模板继承场景**
   - 更新 `server/services/product_master_service_test.go`
   - 新增：
     - `TestApplyDerivedTemplateKeysDerivesFromAncestorProductTypeTemplate`
   - 断言：子分类自身未绑模板、父分类绑定模板时，产品仍能正确派生 `templateKey`

3. **前端：规格模板解析收口为统一逻辑**
   - 更新 `src/features/engineering/components/specs/index.ts`
   - 新增：
     - `resolveTemplateFromTypeChain(...)`
     - `resolveTemplateFromProductTemplateKey(...)`
     - `resolveEffectiveTemplate(...)`
   - 新逻辑优先顺序：
     - 先按分类祖先链解析 `templateId`
     - 若仍无法解析，再按产品自身 `templateKey` 兜底映射模板

4. **前端：编辑弹窗切换到统一有效模板解析**
   - 更新 `src/features/engineering/components/product-action-dialog.tsx`
   - 编辑态模板解析不再只依赖当前分类直接绑定
   - 当分类未直接绑定模板但产品存在 `templateKey` 时，也能正确回显模板
   - 同时补充了解析失败日志，避免再次静默退化

### 当前实现边界

本轮明确保持：

1. 未改产品模板管理页 UI 或录入逻辑
2. 未重做规格表单组件结构
3. 未扩散到 BOM / Routing / 权限等无关模块
4. 仍保持最终模板元数据以现有模板表为权威来源

### 验证结果

已执行：

1. `go test ./services -run "TemplateKeys|ProductTypeTemplate"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端模板派生定向回归通过
2. 前端 TypeScript 编译校验通过

### 当前阶段结论

本轮已将“规格模板不回显”从表象修复提升为前后端一致的根因修复：后端产品 `templateKey` 派生与前端编辑弹窗模板解析都已改为支持分类祖先链模板绑定，并对历史产品保留 `templateKey` 兜底能力。这样既修复了当前编辑弹窗空白问题，也避免后续再因父子分类模板绑定语义不一致而重复出现同类故障。

## 2026-04-13 - fix：应收 / 应付页面样式纠偏与演示残留清理

### 本轮目标

修正应收 / 应付页面“功能已落地但视觉仍像演示壳层”的问题：让两个页面回到通用工业风样式体系，并删除“骨架已建立”演示卡片与 mock / placeholder 残留文案。

### 实现细节

1. **应收页面样式对齐**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 统计卡片改为工业风样式：
     - `rounded-[32px]`
     - `border-dashed`
     - `italic + font-black` 标题数字层级
   - 列表卡片改为通用工业风容器：
     - 顶部说明栏使用虚线分隔与 muted 背景
     - 卡片内容区去掉多余默认内边距

2. **应付页面样式对齐**
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 与应收页面保持同构样式：
     - 统计卡片风格一致
     - 列表卡片风格一致
     - 字体层级、圆角、边框风格一致

3. **删除演示卡片残留**
   - 删除应收页底部“销售应收骨架已建立”演示卡片
   - 删除应付页底部“采购应付骨架已建立”演示卡片

4. **清理本地化中的 mock / placeholder 文案**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`
   - 删除：
     - `placeholderTitle`
     - `placeholderDescription`
   - 把 `tableDescription` 改为真实页面语义，不再强调 mock 验证阶段

### 当前实现边界

本轮明确保持：

1. 未重做表格字段结构
2. 未扩展新的业务动作按钮
3. 未新增新的 mock 回退逻辑
4. 若后续真实数据异常，仍应按系统既有加载/错误链路处理，而不是重新显示演示卡片

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把应收 / 应付页面从“过渡演示页面”纠偏为“真实业务页面”视觉语义：样式已回到通用工业风体系，演示卡片已移除，mock / placeholder 残留文案已清理。当前页面展示更符合 `GEMINI.md` 的后端权威与 fail loudly 原则，也不再向用户传达“这里只是演示壳层”的错误信号。

### 补充修正：表格表头与说明区字体继续纠偏

根据后续视觉检查，继续收紧了应收 / 应付列表区域里“默认表格字体感过强”的问题：

1. 表格说明区改为更贴近系统通用列表页的说明层级：
   - `text-[11px] md:text-sm`
   - `leading-6`
   - `text-muted-foreground/80`

2. 表格表头改为工业风小号高字重标题：
   - `text-[10px]`
   - `font-black`
   - `uppercase`
   - `tracking-widest`
   - `text-muted-foreground/60`

3. 表格正文单元格补齐统一间距与字重：
   - `px-4 md:px-6`
   - `py-3`
   - 首列 `font-medium`
   - 金额列 `tabular-nums`

本次补充修正后，应收 / 应付两页的列表卡片顶部说明区、表头字体、正文层级已经更接近系统中其它工业风列表页的表现。

补充验证：

1. `pnpm exec tsc --noEmit`
   - 通过

### 补充修正：应收 / 应付清单卡片说明文字对齐正常卡片辅助说明

根据继续核对，进一步把应收 / 应付“清单卡片”里的说明文字收口到系统中更常见的卡片辅助说明样式：

1. 使用：
   - `text-[10px] md:text-[11px]`
   - `font-medium`
   - `leading-5`
   - `text-muted-foreground/70`

2. 作用范围：
   - `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - `src/features/trading/payables/tabs/purchase-payables-tab.tsx`

3. 目的：
   - 让“查看应收/应付台账余额、账龄状态...”这类卡片说明文字，不再显得过大或过硬，而是回到系统里普通卡片说明文本的视觉档位。

## 2026-04-13 - feat：独立搜索弹窗式台账选择器

### 本轮目标

在远程搜索、筛选、排序与动态币种来源都已经具备之后，继续把台账选择从 allocation 行内控件提升为独立搜索弹窗，降低表单行内控件堆叠复杂度，并为后续更丰富的候选展示留出空间。

### 实现细节

1. **新增可复用独立搜索弹窗组件**
   - 新增 `src/features/trading/components/ledger-search-dialog.tsx`
   - 弹窗内部承载：
     - 关键词搜索
     - 状态筛选
     - 动态币种筛选
     - 金额区间筛选
     - 排序字段 / 排序方向
     - 候选列表单选
   - 交互模型采用：
     - 单选后确认
     - 支持取消关闭
     - 不点击即回填

2. **应收详情弹层接入弹窗触发入口**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 每条 allocation 行改为：
     - 展示当前已选台账文本
     - 点击“选择台账”打开独立弹窗
   - 详情弹层额外维护：
     - 当前正在编辑的 `sequenceNo`
     - 弹窗开关状态
   - 确认后只回填当前目标行 `ledgerId`

3. **应付详情弹层接入弹窗触发入口**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 行为与应收侧保持一致：
     - 行内最小展示
     - 弹窗中完成搜索、筛选、排序与选择确认
     - 回填当前目标 allocation 行

4. **复用现有搜索 authority**
   - 本轮没有新增后端接口
   - 继续复用既有：
     - 远程搜索接口
     - 结构化筛选
     - 服务端排序
     - finance currency authority 动态币种来源

### 当前实现边界

本轮明确保持：

1. 当前仅支持单选后确认，不支持多选
2. 当前不支持批量回填多个 allocation 行
3. 当前未扩成分页结果表格
4. 当前仍不是完整对账工作台

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 台账选择从“表单行内控件”推进到“独立搜索弹窗”阶段。当前 allocation 行只负责展示当前值与触发选择动作，复杂的搜索、筛选、排序与候选承载都被收口到独立弹窗中，交互边界更清晰，也更适合后续继续增强候选展示能力。

## 2026-04-13 - feat：币种下拉切换为系统动态来源

### 本轮目标

在状态/币种字典化下拉已经落地后，继续把币种从“本地常量字典”提升为“系统真实 authority 动态来源”，避免后续因为硬编码常量遗漏财务配置中的真实币种。

### authority 判定结果

本轮确认系统内现成币种 authority 已存在，无需新造接口：

1. **后端 authority**
   - `server/services/finance_master_service.go`
   - `ListCurrencies()`

2. **前端只读服务**
   - `src/features/finance/services/currency-core-service.ts`
   - `CurrencyCoreService.getCurrencies()`

3. **前端可复用资源 hook**
   - `src/features/trading/hooks/use-trading-finance-resources.ts`
   - 已支持 `includeCurrencies: true` 读取币种列表

因此本轮直接复用现有 finance currency authority，而不是继续维护 AR/AP 本地币种副本。

### 实现细节

1. **应收详情弹层接入动态币种来源**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 复用 `useTradingFinanceResources({ includeCurrencies: true })`
   - 币种下拉改为动态渲染 `currencies`
   - 仅展示 `Active` 币种

2. **应付详情弹层接入动态币种来源**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 复用 `useTradingFinanceResources({ includeCurrencies: true })`
   - 币种下拉改为动态渲染 `currencies`
   - 仅展示 `Active` 币种

3. **失败兜底策略**
   - 动态币种加载中：显示“币种字典加载中”
   - 动态币种为空且非 loading：禁用币种下拉，并显示“币种字典加载失败，请稍后重试”
   - 明确不再静默退回本地硬编码币种常量，避免用户误以为仍是系统真实配置

### 当前实现边界

本轮明确保持：

1. 状态下拉仍保持本地受控枚举
2. 当前币种展示使用 `code`，未额外拼接名称/符号
3. 当前未额外新增币种专用错误边界组件，仅在表单内做轻量提示
4. 当前未修改后端 AR/AP search 语义，仍只按传入 `currency` 过滤

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 台账搜索里的币种筛选从“本地常量字典”切换为“系统 finance currency authority 动态来源”。当前行为更符合系统真实配置，也更不容易因为后续新增币种或财务配置调整而遗漏同步。下一步若继续推进，更值得做的是币种下拉展示名称/符号增强，以及独立搜索弹窗阶段的交互升级。

## 2026-04-13 - feat：状态/币种字典化下拉 + 服务端排序

### 本轮目标

在远程搜索筛选增强之后，继续提升台账选择器的可控性与结果可预测性：把状态/币种筛选从自由输入升级为字典化下拉，并让后端 search 接口支持受控排序。

### 实现细节

1. **后端 search query 增加排序参数**
   - 更新 `server/services/ar_ap_dto.go`
   - `LedgerSearchQuery` 新增：
     - `SortBy`
     - `SortOrder`

2. **后端 handler 解析排序参数**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 应收 / 应付 search handler 现支持解析：
     - `sortBy`
     - `sortOrder`

3. **后端 search service 增加排序白名单**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增排序字段白名单：
     - `updated_at`
     - `outstanding_amount`
     - `ledger_no`
   - 默认排序：
     - `updated_at desc`
   - 当前排序方向支持：
     - `asc`
     - `desc`

4. **前端 search query key 扩展排序参数**
   - 更新 `src/features/trading/query-keys.ts`
   - 把 `sortBy / sortOrder` 纳入 search query key，避免缓存串用

5. **前端 search service / hook 扩展排序参数**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入字典化下拉与排序控件**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前新增/升级控件：
     - 状态 `Select`
     - 币种 `Select`
     - 排序字段 `Select`
     - 排序方向 `Select`

7. **独立搜索弹窗明确延期**
   - 本轮不实现独立搜索弹窗
   - 该项保留到下一阶段，避免与当前筛选/排序增强混做造成交互结构大改

### 当前实现边界

本轮明确保持：

1. 状态 / 币种候选仍是本地最小字典，不引入新的远程字典源
2. 排序字段采用白名单，不支持任意列排序
3. 当前仍未扩成独立搜索弹窗
4. 当前仍未扩成分页结果表格

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把远程搜索式台账选择器从“基础筛选增强”推进到“可控筛选 + 可控排序”的阶段。当前 AR/AP allocation 选择器已经具备：关键词远程搜索、状态/币种字典化下拉、金额区间筛选、服务端排序，以及远程候选优先展示。下一阶段更适合单独推进独立搜索弹窗，而不是继续在当前弹层内堆叠更多交互控件。

## 2026-04-13 - feat：远程搜索筛选增强

### 本轮目标

在真正的远程搜索式台账选择器已经落地后，继续增强最常用的结构化筛选能力，让搜索结果在中等规模数据下更快收敛，而不把选择器扩成复杂查询工作台。

### 实现细节

1. **后端 search query 增加结构化筛选参数**
   - 更新 `server/services/ar_ap_dto.go`
   - `LedgerSearchQuery` 新增：
     - `Currency`
     - `OutstandingMin`
     - `OutstandingMax`

2. **后端 handler 解析筛选参数**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 应收 / 应付 search handler 现支持解析：
     - `status`
     - `currency`
     - `outstandingMin`
     - `outstandingMax`

3. **后端 search service 增加筛选逻辑**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前过滤语义：
     - `status` 精确匹配
     - `currency` 精确匹配
     - `outstandingMin >=`
     - `outstandingMax <=`

4. **前端 query key 扩展为结构化筛选缓存键**
   - 更新 `src/features/trading/query-keys.ts`
   - 把 `keyword / status / currency / outstandingMin / outstandingMax` 全部纳入 search query key

5. **前端 search service / hook 改为结构化参数版本**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入轻量筛选 UI**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前新增筛选项：
     - 状态
     - 币种
     - 未结最小值
     - 未结最大值
   - 继续保留：
     - 关键词 debounce 搜索
     - 远程候选优先展示
     - 本地列表映射兜底

### 当前实现边界

本轮明确保持：

1. 当前筛选仍是轻量结构化参数，不是高级 DSL
2. 当前状态 / 币种筛选仍使用简单输入，不是受控字典下拉
3. 当前未扩成独立搜索弹窗或结果表格
4. 当前仍未补服务端排序策略配置

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把远程搜索式台账选择器从“只有关键词搜索”推进到“支持常用结构化筛选”的阶段。当前 AR/AP allocation 选择器已经具备：关键词远程搜索、状态筛选、币种筛选、金额区间筛选，以及远程候选优先展示。后续如果继续推进，更值得做的是状态/币种字典化下拉、结果分页、服务端排序与独立搜索弹窗，而不是继续扩增原始输入框数量。

## 2026-04-13 - feat：真正远程搜索式台账选择器落地

### 本轮目标

在客户端过滤版台账选择器已经可用的基础上，继续把 allocation 编辑器升级为真正的远程搜索式台账选择器：后端提供 search API，前端以 debounce 方式远程查询候选项，不再把已加载列表缓存作为唯一候选来源。

### 实现细节

1. **后端新增应收 / 应付台账 search DTO**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `LedgerSearchQuery`
     - `LedgerSearchCandidateResponse`
     - `LedgerSearchResponse`

2. **后端新增应收 / 应付台账 search service**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `SearchReceivableLedgers()`
     - `SearchPayableLedgers()`
   - 支持：
     - `keyword`
     - `page`
     - `pageSize`
     - `status`
   - 当前搜索字段：
     - 应收：`ledger_no / customer_name`
     - 应付：`ledger_no / supplier_name`

3. **后端新增 search handler 与 route**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 更新 `server/routes/routes_ar_ap.go`
   - 新增接口：
     - `GET /receivables/search`
     - `GET /payables/search`

4. **后端路由校验同步补充**
   - 更新 `server/routes/routes_ar_ap_test.go`
   - 断言 search 路由已注册

5. **前端新增远程搜索 DTO / service / hook**
   - 更新 `src/features/trading/query-keys.ts`
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 更新 `src/features/trading/receivables/hooks/use-receivables.ts`
   - 更新 `src/features/trading/payables/hooks/use-payables.ts`

6. **前端详情弹层接入 debounce 远程搜索**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 输入搜索词后 300ms debounce
     - 关键词长度达到阈值后触发远程查询
     - 选择器优先展示远程返回候选项
     - 本地列表仍作为回退展示映射来源

### 当前实现边界

本轮明确保持：

1. 当前远程搜索仍使用简单关键词匹配，不是高级条件组合查询
2. 当前仍未扩为独立搜索弹窗或分页表格选择器
3. 当前候选展示仍以最小字段为主，不返回完整 detail payload
4. 当前本地列表映射逻辑仍保留，作为过渡与兜底

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "ArAp|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端路由 / handler 定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP allocation 选择器从“本地过滤版搜索”推进到“真正远程搜索式选择器”的阶段。当前详情弹层已经具备：allocation 编辑、历史分组展示、目标台账展示名映射、历史筛选，以及后端 search API 支撑的 debounce 远程台账选择能力。后续如果继续推进，更值得做的是 search 结果分页、状态筛选、选择器独立弹窗，以及彻底移除对本地列表映射的过渡依赖。

## 2026-04-13 - feat：搜索式台账选择器 + allocation 历史筛选

### 本轮目标

在已经具备台账选择器和 allocation 历史分组展示之后，继续提升可用性：为台账选择器补客户端搜索能力，并为 allocation 历史补筛选能力，降低数据量上来后的操作成本。

### 实现细节

1. **应收台账选择器增加搜索过滤**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 新增 `ledgerSearchTerm`
   - 当前可按以下信息过滤台账候选：
     - 单据编号
     - 客户名称
     - 未收金额

2. **应付台账选择器增加搜索过滤**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 新增 `ledgerSearchTerm`
   - 当前可按以下信息过滤台账候选：
     - 单据编号
     - 供应商名称
     - 未付金额

3. **allocation 历史增加筛选词**
   - 应收 / 应付详情弹层均新增 `historySearchTerm`
   - 当前可按以下信息筛选历史分组：
     - `recordNo`
     - `recordDate`
     - 目标台账展示名
     - `remark`
     - `allocatedAmount`

4. **保持客户端过滤，不改后端 authority**
   - 本轮搜索与筛选均基于当前已加载数据做前端过滤
   - 不引入新的后端搜索接口

### 当前实现边界

本轮明确保持：

1. 当前搜索仍是客户端过滤，不是远程搜索
2. 当前选择器还不是弹出式搜索面板，仅是在现有弹层内增加搜索输入
3. 当前历史筛选未补高级条件组合，仅支持单关键词过滤

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 弹层从“基本可用”推进到“中等数据量下仍可操作”的阶段。当前详情弹层已经同时具备：allocation 编辑、台账选择器、按记录号分组的历史展示、目标台账展示名映射、客户端搜索与历史筛选。后续如果继续推进，更适合进入远程搜索、筛选持久化和专门对账工作台阶段，而不是继续堆叠基础弹层能力。

## 2026-04-13 - feat：allocation 历史按记录号分组 + 目标台账展示名映射

### 本轮目标

在已经具备 allocation 历史基础展示之后，继续把历史区域从“平铺底层字段”提升成更接近业务阅读的模式：按 `recordNo` 分组，并把目标台账从 `ledgerId` 映射为可读展示名。

### 实现细节

1. **后端 detail 数据继续对齐历史展示需求**
   - 更新 `server/services/ar_ap_dto.go`
   - 更新 `server/services/ar_ap_query_service.go`
   - 保持 detail 输出包含：
     - `receiptRecords / paymentRecords`
     - `allocations`
   - 让前端能够基于 `receiptRecordId / paymentRecordId` 做历史分组

2. **应收历史按记录号分组展示**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前行为：
     - 以 `receiptRecord` 为分组头
     - 每组下展示对应 allocations

3. **应付历史按记录号分组展示**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 以 `paymentRecord` 为分组头
     - 每组下展示对应 allocations

4. **目标台账展示名映射**
   - 前端使用现有列表数据 + 当前详情台账信息构造显示映射
   - 当前展示格式：
     - 单据编号
     - 往来方名称
     - 当前未结金额

### 当前实现边界

本轮明确保持：

1. 当前展示名映射仍依赖前端已加载列表数据，不是后端直接回传的完整 displayName
2. 当前历史分组仍在详情弹层内展示，未拆为专门的对账历史页
3. 当前未补 allocation 历史的筛选 / 搜索 / 展开折叠能力

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 allocation 历史从“技术字段列表”推进到“按记录号分组、可读展示目标台账”的阶段。当前 AR/AP 详情弹层已经同时具备：allocation 编辑、台账选择器、历史展示和按记录分组的阅读能力。后续如果继续推进，更值得做的是搜索式台账选择器、历史筛选与更完整的对账工作台，而不是再补基础可读性。

## 2026-04-13 - feat：allocation 历史明细展示接入

### 本轮目标

在已经具备 allocation 编辑与提交能力后，继续补上 allocation 历史明细展示，让应收 / 应付详情弹层不仅能“登记分摊”，也能直接看到“已经如何分摊过”。

### 实现细节

1. **后端 detail response 增加 allocations**
   - 更新 `server/services/ar_ap_dto.go`
   - `ReceivableLedgerDetailResponse / PayableLedgerDetailResponse` 新增 `allocations`

2. **后端 detail 查询预加载 settlement mappings**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前 detail 查询已预加载：
     - `ReceiptRecords / PaymentRecords`
     - `SettlementMappings`
   - detail 映射时同步输出 allocation 历史明细

3. **前端 detail DTO 对齐 allocations**
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`

4. **应收详情弹层展示 allocation 历史**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前展示字段：
     - `sequenceNo`
     - `ledgerId`
     - `allocatedAmount`
     - `remark`

5. **应付详情弹层展示 allocation 历史**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前展示字段：
     - `sequenceNo`
     - `ledgerId`
     - `allocatedAmount`
     - `remark`

### 当前实现边界

本轮明确保持：

1. 当前历史明细以 allocation 基础字段展示为主，尚未补目标台账名称映射
2. 当前仍未把 allocation 历史和具体 `recordNo` 做更细粒度的分组展示
3. 当前仍未扩成专门的对账明细页

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler|^$"`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 详情弹层从“只能录入 allocation”推进到“既能录入，也能查看 allocation 历史”的阶段。当前闭环已经覆盖：台账列表、详情读取、allocation 编辑、台账选择器、allocation 历史展示。后续更自然的增强点将是 allocation 历史按记录号分组、目标台账展示名映射，以及搜索式台账选择器，而不是再补基础骨架。

## 2026-04-13 - feat：allocation 编辑器接入台账选择器

### 本轮目标

在前端已经支持多条 allocation 编辑之后，继续把 `ledgerId` 的手工输入替换为台账选择器，降低误填风险并改善核销分摊录入体验。

### 实现细节

1. **应收分摊行接入台账选择器**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 复用 `useGetReceivables()` 列表结果生成可选项
   - 分摊行中的 `ledgerId` 从手工输入改为选择器

2. **应付分摊行接入台账选择器**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 复用 `useGetPayables()` 列表结果生成可选项
   - 分摊行中的 `ledgerId` 从手工输入改为选择器

3. **当前选择器展示信息**
   - 每个选项展示：
     - 单据编号
     - 往来方名称
     - 当前未结金额

### 当前实现边界

本轮明确保持：

1. 当前选择器仍基于已有列表数据，不是独立搜索弹窗
2. 当前未补模糊搜索 / 远程筛选能力
3. 当前 allocation 历史展示仍未单独展开

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 allocation 编辑器从“可编辑但仍需手填 ledgerId”推进到“可直接选择目标台账”的阶段。这样当前 AR/AP 的核销分摊体验已经具备基本可用性，后续更值得继续推进的是搜索式台账选择器、allocation 历史明细展示，以及更完整的对账交互，而不是再回退到原始输入模式。

## 2026-04-13 - feat：前端多条 allocation 编辑器接入

### 本轮目标

在后端已经切换到 `record + allocations` authority 后，把应收 / 应付详情弹层从“单金额兼容层”升级为真正可编辑多条 allocation 的前端模式，支持录入多笔分摊行并提交真实 `allocations[]`。

### 实现细节

1. **应收详情弹层升级为 allocation 编辑器**
   - 更新 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 当前支持：
     - 多条分摊行
     - 新增分摊行
     - 删除分摊行
     - 编辑 `ledgerId / allocatedAmount / remark`
     - 计算分摊合计并按真实 `allocations[]` 提交

2. **应付详情弹层升级为 allocation 编辑器**
   - 更新 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前支持：
     - 多条分摊行
     - 新增分摊行
     - 删除分摊行
     - 编辑 `ledgerId / allocatedAmount / remark`
     - 计算分摊合计并按真实 `allocations[]` 提交

3. **基础前端校验**
   - 提交前要求：
     - 至少存在一条 allocation
     - allocation 合计金额大于 0
     - 每条分摊行具备 `ledgerId`
     - 每条分摊行金额大于 0

4. **保持 authority 在后端**
   - 前端当前只做输入编排与合计提示
   - 最终金额守恒、超额校验、非法状态校验仍由后端裁决

### 当前实现边界

本轮明确保持：

1. 当前分摊目标 ledger 仍以手工输入 `ledgerId` 为主，还未做专门的台账选择器
2. 当前仍是详情弹层内编辑，不是完整对账工作台
3. 当前未补 allocation 历史明细的专门展示区域

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把前端从“单条 allocation 兼容模式”推进到“可编辑多条 allocation 的真实分摊输入模式”。这样 AR/AP 在当前阶段已经形成了从后端 allocation authority 到前端分摊编辑器的完整闭环，后续若继续推进，更合理的重点将是台账选择器、allocation 历史展示与更完整的对账交互，而不是再回退到单金额登记模型。

## 2026-04-13 - feat：SettlementAllocation 核销分摊阶段落地（后端 authority + 前端兼容层）

### 本轮目标

在已有 AR/AP 最小登记骨架的基础上，继续把“单台账直接回写”的临时模式升级为 `SettlementAllocation` 核销分摊模式，确保登记记录与实际核销关系可审计、可扩展，并先为现有前端补一层兼容包装，避免接口升级后页面失效。

### 实现细节

1. **后端登记 DTO 升级为 `record + allocations`**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `SettlementAllocationRequest`
     - `SettlementAllocationResponse`
   - `CreateReceiptRecordRequest / CreatePaymentRecordRequest` 新增 `allocations`
   - `CreateReceiptRecordResponse / CreatePaymentRecordResponse` 新增 `allocations`

2. **后端正式落地 `SettlementAllocation` 写入逻辑**
   - 更新 `server/services/ar_ap_query_service.go`
   - 当前登记流程已升级为：
     - 创建 `ReceiptRecord / PaymentRecord`
     - 校验 allocation 明细
     - 创建 `SettlementAllocation`
     - 同事务回写 ledger 的 `settledAmount / outstandingAmount / status / version`

3. **新增 allocation 级校验**
   - 当前已覆盖：
     - `allocations` 不能为空
     - allocation 合计必须等于 `record.amount`
     - allocation 金额不得超过目标 ledger 当前 `outstandingAmount`
     - 已结清 / 已作废 / 已取消 ledger 不允许继续分摊

4. **handler 错误映射补齐**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 对以下错误返回 400：
     - 分摊明细为空
     - 合计不一致
     - 超额分摊
     - 非法台账状态

5. **新增 AR/AP handler 负向测试**
   - 新增 `server/handlers/ar_ap_handlers_test.go`
   - 覆盖：
     - 金额与 allocation 合计不一致
     - 超额分摊
     - 已结清台账重复分摊
   - 测试数据库采用手工建表，绕开 SQLite 对 `uuid DEFAULT gen_random_uuid()` 的 DDL 兼容问题

6. **前端增加 allocation 兼容层**
   - 更新：
     - `src/features/trading/receivables/contracts/receivable-api-dto.ts`
     - `src/features/trading/payables/contracts/payable-api-dto.ts`
     - `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
     - `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前行为：
     - 现有“单金额登记”会自动包装为单条 allocation 请求
     - 不需要立即推翻现有详情弹层交互

### 当前实现边界

本轮明确保持：

1. 后端已进入 allocation authority 模式，但前端仍只是单条 allocation 兼容层
2. 当前前端尚未支持多条 allocation 手工编辑
3. 当前仍未进入完整对账工作台
4. 当前仍未补并发锁 / 乐观锁级的更严格核销冲突保护

### 验证结果

已执行：

1. `go test ./handlers -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler"`
2. `go test ./handlers ./routes ./db -run "CreateReceiptRecordHandler|CreatePaymentRecordHandler|^$"`
3. `pnpm exec tsc --noEmit`

结果：

1. AR/AP handler 负向测试通过。
2. 后端 routes/db 定向校验通过。
3. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“登记后直接回写单台账”的临时骨架推进到“登记记录 + allocation 分摊 + 台账同事务回写”的正式方向。虽然前端还只是单条 allocation 兼容模式，但后端 authority 已经切换到可继续扩展多台账核销的结构上，下一阶段只需要把前端弹层升级为真正可编辑多条 allocation 的模式，而不需要再推翻后端模型。

## 2026-04-13 - feat：前端应收 / 应付详情弹层与最小登记入口接入

### 本轮目标

在后端已经具备 AR/AP 详情读取与登记骨架接口之后，继续把前端页面从“只能看列表”推进到“可查看详情并登记一笔最小收款 / 付款”的阶段，但仍然不进入完整核销分摊界面。

### 实现细节

1. **补充前端 detail / settlement contracts**
   - 更新 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 更新 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 新增详情 DTO 与收款 / 付款登记 DTO

2. **补充 query key**
   - 更新 `src/features/trading/query-keys.ts`
   - 新增：
     - `receivableDetail(id)`
     - `payableDetail(id)`

3. **补充详情与登记 services**
   - 新增 `src/features/trading/receivables/services/receivable-ledger-detail-service.ts`
   - 新增 `src/features/trading/payables/services/payable-ledger-detail-service.ts`
   - 当前支持：
     - 读取详情
     - 提交最小收款 / 付款登记

4. **补充详情与登记 hooks**
   - 新增 `src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`
   - 新增 `src/features/trading/payables/hooks/use-payable-ledger-detail.ts`
   - 登记成功后自动失效列表与详情缓存

5. **新增独立详情弹层组件**
   - 新增 `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
   - 新增 `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
   - 当前弹层能力：
     - 展示台账基础信息
     - 展示历史收款 / 付款记录
     - 提交一笔最小登记

6. **页面接线**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 当前行为：
     - 点击列表行打开详情弹层
     - 在弹层中提交最小登记

### 当前实现边界

本轮明确保持：

1. 当前 UI 仍是最小详情弹层，不是完整详情页
2. 当前登记表单仅提交金额、日期、参考号等基础字段
3. 仍未进入 allocation 核销分摊 UI
4. 仍未补账龄分析专用视图与完整错误原因映射

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 前端从“只读列表”推进到“列表 + 详情弹层 + 最小收款/付款登记”的阶段。这样后续如果继续推进，只需要在现有 detail / mutation 结构上继续扩展 allocation、核销分摊与更完整的详情展示，而不需要再推翻当前的低耦合子域组织。

## 2026-04-13 - feat：AR/AP 详情读取与收款/付款登记骨架

### 本轮目标

在已经具备独立 ledger 模型与列表级只读接口的基础上，继续向前推进 AR/AP 的详情读取能力，以及最小收款/付款登记骨架，但仍然不进入完整 allocation 核销算法和复杂财务闭环。

### 实现细节

1. **补充 AR/AP 详情 DTO**
   - 更新 `server/services/ar_ap_dto.go`
   - 新增：
     - `ReceivableLedgerDetailResponse`
     - `PayableLedgerDetailResponse`
     - `ReceiptRecordResponse`
     - `PaymentRecordResponse`
     - `CreateReceiptRecordRequest/Response`
     - `CreatePaymentRecordRequest/Response`

2. **补充详情查询服务**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `GetReceivableLedgerByID(...)`
     - `GetPayableLedgerByID(...)`

3. **补充最小收款/付款登记骨架**
   - 更新 `server/services/ar_ap_query_service.go`
   - 新增：
     - `CreateReceiptRecord(...)`
     - `CreatePaymentRecord(...)`
   - 当前行为：
     - 新建 `ReceiptRecord / PaymentRecord`
     - 回写 ledger 的 `settledAmount / outstandingAmount / status / version`
     - 返回登记后的 ledger 详情与记录对象

4. **补充 handler 与 route**
   - 更新 `server/handlers/ar_ap_handlers.go`
   - 更新 `server/routes/routes_ar_ap.go`
   - 更新 `server/routes/routes_ar_ap_test.go`
   - 当前新增接口：
     - `GET /api/v1/receivables/:id`
     - `GET /api/v1/payables/:id`
     - `POST /api/v1/receivables/:id/receipts`
     - `POST /api/v1/payables/:id/payments`

### 当前实现边界

本轮明确保持：

1. 已有详情读取接口，但前端尚未扩写详情弹层或登记表单
2. 已有最小收款/付款登记骨架，但仍未实现 `SettlementAllocation` 分摊算法
3. 当前登记逻辑是“单台账直接回写 settled/outstanding”的骨架实现
4. 账龄仍是骨架级派生，不代表完整账龄分析已完成

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run ^$`

结果：

1. 后端定向编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“只有列表级只读接口”推进到“具备详情读取与最小登记骨架”的阶段。当前后端已经具备继续往登记表单、详情面板和 allocation 核销逻辑扩展的结构基础，但还没有把本轮扩大为完整财务闭环。

## 2026-04-13 - feat：独立 AR/AP 后端模型骨架与真实只读接口接入

### 本轮目标

在完成严格后端规划确认后，正式落地独立 AR/AP 后端主模型骨架，并提供最小真实只读接口，避免继续把前端页面长期挂在 mock 数据上。

### 实现细节

1. **新增独立 AR/AP 后端模型骨架**
   - 新增 `server/models/ar_ap_ledger.go`
   - 落地：
     - `ReceivableLedger`
     - `PayableLedger`
     - `ReceiptRecord`
     - `PaymentRecord`
     - `SettlementAllocation`

2. **接入数据库迁移**
   - 更新 `server/db/db.go`
   - 将上述 AR/AP 模型加入 `AutoMigrate`

3. **新增后端 DTO 与查询服务**
   - 新增 `server/services/ar_ap_dto.go`
   - 新增 `server/services/ar_ap_query_service.go`
   - 当前提供：
     - 分页列表响应
     - 汇总字段响应
     - 独立 ledger 查询映射

4. **新增后端 handler 与 route**
   - 新增 `server/handlers/ar_ap_handlers.go`
   - 新增 `server/routes/routes_ar_ap.go`
   - 新增 `server/routes/routes_ar_ap_test.go`
   - 更新 `server/routes/routes.go`
   - 当前新增只读接口：
     - `GET /api/v1/receivables`
     - `GET /api/v1/payables`

5. **前端切换为真实 API**
   - 更新 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 更新 `src/features/trading/payables/services/payables-query-service.ts`
   - 从 mock service 切换到真实 `/receivables` / `/payables` 请求

6. **前后端 contract 对齐**
   - 后端当前列表项已按前端现有 `documentNo / invoiceAmount / receivedAmount / paidAmount / outstandingAmount / agingBucket / status` 结构输出
   - 这样可以在不重写前端表格组件的前提下先完成真实接口接入

### 当前实现边界

本轮明确保持：

1. 已落地独立 ledger / settlement 模型骨架，但尚未实现完整写流程
2. 当前只提供列表级只读接口，不包含详情、登记、核销写接口
3. `agingBucket` 当前仍是骨架级派生字段，不代表最终账龄引擎已完成
4. 当前没有把订单或 voucher 继续包装成 AR/AP 主模型，而是转为独立表语义

### 验证结果

已执行：

1. `go test ./handlers ./routes ./db -run ^$`
2. `pnpm exec tsc --noEmit`

结果：

1. 后端定向编译校验通过。
2. 前端 TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“前端独立子域壳层”推进到“后端独立模型 + 真实只读接口”的阶段。最关键的变化是：应收 / 应付终于不再依赖订单或 voucher 的语义挪用，而是拥有了独立 ledger 入口。下一阶段如果继续推进，优先级应是补详情接口、收款/付款记录写入、以及 allocation 级核销逻辑，而不是继续在前端扩展 mock 或临时拼装 authority。

## 2026-04-13 - feat：销售应收 / 采购应付只读查询壳层接入

### 本轮目标

在上一轮完成 Tab、路由和独立子域骨架之后，继续把 AR/AP 页面升级为可读的只读查询壳层，但仍然不进入真实后端 AR/AP authority、收款/付款登记或核销写操作。

### 实现细节

1. **为销售应收建立只读查询分层**
   - 新增 `src/features/trading/receivables/contracts/receivable-api-dto.ts`
   - 新增 `src/features/trading/receivables/adapters/receivable-api-adapter.ts`
   - 新增 `src/features/trading/receivables/services/receivables-query-service.ts`
   - 新增 `src/features/trading/receivables/hooks/use-receivables.ts`

2. **为采购应付建立只读查询分层**
   - 新增 `src/features/trading/payables/contracts/payable-api-dto.ts`
   - 新增 `src/features/trading/payables/adapters/payable-api-adapter.ts`
   - 新增 `src/features/trading/payables/services/payables-query-service.ts`
   - 新增 `src/features/trading/payables/hooks/use-payables.ts`

3. **接入 query key**
   - 更新 `src/features/trading/query-keys.ts`
   - 新增 `receivables()` 与 `payables()`，保持与现有 trading 查询缓存模式一致

4. **页面从占位升级为只读视图**
   - 更新 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 更新 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 页面当前展示：
     - 汇总卡片
     - 只读表格
     - 当前阶段说明区

5. **补齐文案 key**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`

### 当前实现边界

本轮明确保持：

1. 当前 `receivables / payables` service 使用前端 mock 数据
2. 只读页面用于验证低耦合 contracts / adapters / hooks / queryKey 组织方式
3. 未引入真实后端 AR/AP handler / service / dto / route
4. 未新增收款、付款、核销、账龄重算等写逻辑
5. 未让前端按订单数据自行推导 authority，只是临时展示 mock 聚合结果

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - feat：736 客户卡片微信打开入口最小实现

### 本轮目标

在客户资料中补充 `wechat` 字段，并在客户卡片上提供“打开微信”最小入口；同时按后续多渠道扩展要求，将渠道能力放入独立 `contact-channels` 目录，避免直接堆叠到客户卡片组件内部。

### 实现细节

1. **新增独立 contact-channels 目录**
   - 新增：
     - `src/features/contact-channels/types.ts`
     - `src/features/contact-channels/wechat.ts`
     - `src/features/contact-channels/index.ts`
   - 当前仅提供最小微信能力：
     - `normalizeWeChatHandle(...)`
     - `canOpenWeChat(...)`
     - `openWeChat(...)`
   - 本轮仅尝试通过 `weixin://` 拉起微信客户端，不承诺直达指定会话窗口

2. **客户前后端字段链路补充 wechat**
   - 更新后端：
     - `server/models/trading.go`
     - `server/handlers/customer_dto.go`
     - `server/handlers/customers.go`
     - `server/services/partner_list_dto.go`
     - `server/services/partner_service.go`
     - `server/services/partner_transaction_service.go`
   - 更新前端：
     - `src/features/trading/data/schema.ts`
     - `src/features/trading/customer/contracts/customer-api-dto.ts`
     - `src/features/trading/customer/adapters/customer-api-adapter.ts`
     - `src/features/trading/hooks/use-customer-action-view-model.ts`
   - 现在客户 `wechat` 字段已进入：模型、DTO、adapter、save snapshot、PATCH delta 白名单与差量生成链路

3. **客户编辑弹窗接入微信输入**
   - 更新 `src/features/trading/components/customer-action-dialog.tsx`
   - 新增微信输入框，允许新建/编辑客户时录入微信号

4. **客户卡片接入微信入口按钮**
   - 更新 `src/features/trading/components/customer-list.tsx`
   - 卡片增加微信展示区
   - 当微信号为空时：按钮禁用，点击前会阻止错误跳转
   - 当微信号存在时：调用独立 `contact-channels` 能力尝试拉起微信

### 当前实现边界

本轮明确保持：

1. 不做企业微信侧边栏或会话归档
2. 不做客户沟通审计 / 时间轴 / Webhook
3. 不做 Telegram / Instagram / WhatsApp / Facebook 的实际接入
4. 不承诺微信一定直达指定客户聊天窗口

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./services -run ^$`

结果：

1. 前端 TypeScript 编译校验通过
2. 后端 handlers / services 编译型校验通过

### 增量更新：客户资料扩展为多渠道记录

在微信最小入口实现基础上，本轮继续按“先记录资料、后启用能力”的方式，把客户资料扩展为统一多渠道联系方式结构：

1. **客户模型扩展为 5 个渠道字段**
   - 新增/补齐：
     - `wechat`
     - `whatsapp`
     - `facebook`
     - `instagram`
     - `telegram`
   - 更新后端：
     - `server/models/trading.go`
     - `server/handlers/customer_dto.go`
     - `server/handlers/customers.go`
     - `server/services/partner_list_dto.go`
     - `server/services/partner_service.go`
     - `server/services/partner_transaction_service.go`
   - 更新前端：
     - `src/features/trading/data/schema.ts`
     - `src/features/trading/customer/contracts/customer-api-dto.ts`
     - `src/features/trading/customer/adapters/customer-api-adapter.ts`
     - `src/features/trading/hooks/use-customer-action-view-model.ts`

2. **客户编辑弹窗新增“社媒 / 沟通渠道”分组**
   - 更新 `src/features/trading/components/customer-action-dialog.tsx`
   - 将渠道字段集中到独立分组中录入：
     - 微信号
     - WhatsApp
     - Facebook
     - Instagram
     - Telegram
   - 当前该分组只承担资料录入和保存职责，不引入额外跳转状态

3. **能力边界继续保持收敛**
   - `wechat` 继续保留客户卡片上的最小打开入口
   - `whatsapp / facebook / instagram / telegram` 本轮仅保存资料，不新增跳转按钮
   - 这样客户资料结构已经为后续渠道扩展预留好稳定字段基础

### 本轮追加验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./services -run ^$`

结果：

1. 多渠道字段接入后前端 TypeScript 编译通过
2. 多渠道字段接入后后端 handlers / services 编译型校验通过

### 增量更新：客户保存链根因级修复

在客户渠道字段扩展完成后，编辑客户时通过事务保存 `/customers/:id/transactions` 出现 `code and name must not be empty`。本轮对该问题做了前后端双层根因加固，而不是继续停留在页面级补丁。

1. **前端收口完整快照生成职责**
   - 新增：
     - `src/features/trading/customer/utils/customer-save-snapshot.ts`
   - 提供 `buildCustomerSaveSnapshot(baseCustomer, draft)`，统一负责：
     - 将表单草稿转为普通对象快照
     - 在编辑态基于原客户对象生成完整 `finalData`
   - 接入位置：
     - `src/features/trading/components/customer-action-dialog.tsx`
     - `src/features/trading/components/customer-list.tsx`
   - 这样后续再新增渠道字段时，不需要每个页面自己记得写一套合并逻辑

2. **后端统一保存事务增加 authoritative merge**
   - 更新：
     - `server/services/partner_transaction_service.go`
   - 新增 `mergeCustomerSaveSnapshot(...)`
   - 在 `executeCustomerUnifiedSaveTx(...)` 中改为：
     - 先读取当前数据库客户 `current`
     - 再按 `deltaKeys` 将请求中的 `finalData` 合并到当前快照上
     - 最终使用合并后的 `mergedFinalData` 执行：
       - `code / name` 校验
       - 状态校验
       - 重复编码校验
       - 数据库更新
   - 这样即使前端未来遗漏未修改字段，服务端也会以后端当前值兜底，不再因未改字段缺失而导致事务保存失败

3. **本轮修复后的稳定性结论**
   - 这次修复不再只针对 `wechat`
   - 对当前客户所有字段，包括：
     - `wechat`
     - `whatsapp`
     - `facebook`
     - `instagram`
     - `telegram`
   - 以及后续新增的客户普通字段，都具备更稳定的事务保存边界

### 本轮追加验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./services -run ^$`

结果：

1. 前端统一快照收口后 TypeScript 编译通过
2. 后端 authoritative merge 接入后 handlers / services 编译型校验通过

### 增量更新：供应商复用客户沟通渠道与卡片交互方案

本轮将客户侧已经稳定下来的“沟通渠道资料结构 + 卡片交互规则 + 保存链路防腐”按同口径复用到供应商，避免客户/供应商继续分叉。

1. **供应商资料补齐沟通渠道字段**
   - 前端补齐：
     - `src/features/trading/data/schema.ts`
     - `src/features/trading/supplier/contracts/supplier-api-dto.ts`
     - `src/features/trading/supplier/adapters/supplier-api-adapter.ts`
     - `src/features/trading/hooks/use-supplier-action-view-model.ts`
   - 后端补齐：
     - `server/models/trading.go`
     - `server/handlers/supplier_dto.go`
     - `server/handlers/suppliers.go`
     - `server/services/purchase_order_dto.go`
     - `server/services/purchase_order_mapper.go`
     - `server/services/partner_list_dto.go`
     - `server/services/partner_service.go`
     - `server/services/partner_transaction_service.go`
   - 新增字段：
     - `wechat`
     - `whatsapp`
     - `facebook`
     - `instagram`
     - `telegram`
     - `email`

2. **供应商保存链按客户同口径加固**
   - 新增：
     - `src/features/trading/supplier/utils/supplier-save-snapshot.ts`
   - 前端在以下位置统一生成完整保存快照：
     - `src/features/trading/components/supplier-action-dialog.tsx`
     - `src/features/trading/components/supplier-list.tsx`
   - 后端在 `server/services/partner_transaction_service.go` 中新增：
     - `mergeSupplierSaveSnapshot(...)`
   - 统一保存事务 `executeSupplierUnifiedSaveTx(...)` 改为：
     - 先读取当前数据库供应商
     - 再按 `deltaKeys` 与请求 `finalData` 做 authoritative merge
     - 用合并后的 `mergedFinalData` 执行校验与落库
   - 这样后续供应商再新增普通字段时，也不会因未改字段缺失而导致保存事务失败

3. **供应商编辑弹窗对齐客户信息架构**
   - 更新：
     - `src/features/trading/components/supplier-action-dialog.tsx`
   - 新增“沟通渠道”分组，统一承载：
     - `email`
     - `wechat`
     - `whatsapp`
     - `facebook`
     - `instagram`
     - `telegram`
   - 保持联系人信息、产品范围、地址分区不混杂

4. **供应商卡片交互对齐客户规则**
   - 更新：
     - `src/features/trading/components/supplier-list.tsx`
   - 调整结果：
     - 供应商卡片本体不再点击即编辑
     - 编辑入口只保留菜单中的编辑动作
     - 供应商卡片新增最小微信入口
     - 其余渠道本轮仍只保存与展示，不做跳转按钮

### 本轮追加验证（供应商）

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./services -run ^$`

结果：

1. 供应商沟通渠道字段、弹窗与卡片交互接入后前端 TypeScript 编译通过
2. 供应商 authoritative merge 与多渠道字段后端接入后 handlers / services 编译型校验通过

## 2026-04-13 - feat：客户卡片接入真实销售闭环摘要并改为单列占满

### 本轮目标

在不动现有粗粒度 analytics 聚合口径的前提下，让客户卡片直接展示来自真实销售订单链的闭环摘要，并将客户卡片从双列半宽改为单列占满，承载更完整的业务状态信息。

### 核心实现

1. **新增独立后端客户销售闭环摘要读链**
   - 新增：`server/handlers/customer_sales_closure_summary.go`
   - 路由接线：`server/routes/routes_trading.go`
   - 新增接口：`GET /customers/sales-closure-summary`
   - 数据来源直接基于 `sales_orders` 主单聚合，不复用现有 analytics 粗聚合接口
   - 输出字段：
     - `customerId`
     - `hasOpenOrders`
     - `openOrderCount`
     - `lastOrderDate`
     - `daysSinceLastOrder`
     - `totalOrders`

2. **未完成订单口径与最后下单时间均走真实订单链**
   - 未完成订单判定：
     - `Draft`
     - `Pending`
     - `InProgress`
   - 已闭环判定：
     - `Done`
     - `Canceled`
   - `lastOrderDate` 直接取客户维度销售订单最新 `order_date`
   - `daysSinceLastOrder` 在后端统一计算，避免前端重复处理日期差与时区问题

3. **新增独立前端读链与独立展示组件**
   - 新增 service：
     - `src/features/trading/customer/services/customer-sales-closure-summary-service.ts`
   - 新增 hook：
     - `src/features/trading/customer/hooks/use-customer-sales-closure-summary.ts`
   - 新增展示组件：
     - `src/features/trading/customer/components/customer-sales-closure-summary.tsx`
   - 新增 query key：
     - `src/features/trading/query-keys.ts`
       - `customerSalesClosureSummary()`

4. **客户卡片改为单列占满并接入闭环摘要**
   - 更新：`src/features/trading/components/customer-list.tsx`
   - 调整内容：
     - 客户卡片容器从 `grid-cols-1 lg:grid-cols-2` 改为 `grid-cols-1`
     - 在客户卡片顶部信息区新增独立闭环摘要块
     - 当前摘要优先展示：
       - 是否存在未完成订单
       - 未完成订单数
       - 最后下单时间
       - 沉默时长（距上次下单天数）

### 设计取舍

1. 本轮**明确不动**现有 `/sales-orders/analytics/*` 粗聚合分析接口口径
2. 客户卡片不直接消费 analytics 分析结果，避免“分析值”和“当前业务事实”混用
3. 本轮通过新增独立后端 handler、独立前端 service/hook/组件来承载能力，尽量减少把逻辑补丁式塞回旧文件

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./services -run ^$`

结果：

1. 前端客户卡片单列布局与闭环摘要接线后 TypeScript 编译通过
2. 后端独立客户销售闭环摘要 handler 接入后 handlers / services 编译型校验通过

## 2026-04-13 - feat：客户卡片主闭环入口改造

### 本轮目标

在客户卡片上明确区分“记录入口”和“主闭环入口”两类职责：

1. 时间线只负责记录
2. 主闭环入口直接跳转到现有销售订单管理页
3. 订单管理页承接结构化 `customerId` 上下文，而不是只依赖模糊搜索

### 核心实现

1. **销售订单路由 search 契约独立化并扩展客户上下文承接**
   - 新增：`src/features/trading/sales/utils/sales-order-route-search.ts`
   - 更新：`src/routes/_authenticated/trading/sales-orders.tsx`
   - 扩展字段：
     - `customerId`
     - `customerName`
   - 目的：让客户卡片可以稳定把用户带到现有订单管理页的目标客户上下文，而不是只依赖 `search` 字段做模糊命中

2. **销售订单列表按结构化客户上下文过滤**
   - 更新：`src/features/trading/hooks/use-sales-order-list-view-model.ts`
   - 更新：`src/features/trading/components/sales-order-list-fixed.tsx`
   - 调整点：
     - 销售订单页从路由 search 读取 `customerId/customerName`
     - 订单列表过滤优先使用 `customerId`，`customerName` 仅作兜底
     - 详情打开/关闭时保留客户上下文，避免闭环链路中断

3. **客户卡片新增主按钮“查看完整订单”**
   - 更新：`src/features/trading/components/customer-list.tsx`
   - 在客户卡片主操作区新增 `查看完整订单` 按钮
   - 点击后直接导航到：
     - `/_authenticated/trading/sales-orders`
     - 同时带上 `customerId/customerName`
   - 这样用户可以从客户卡片直接进入完整订单处理上下文，形成真正闭环

4. **审计入口降级为次级入口**
   - 更新：`src/components/common/audit-stamp.tsx`
   - 新增：`src/features/trading/customer/components/customer-audit-timeline-sheet.tsx`
   - 更新：`src/features/trading/components/customer-list.tsx`
   - 调整结果：
     - 底部 `AuditStamp` 默认不再显示时间线按钮
     - 审计记录改为客户卡片菜单中的次级入口：`查看审计记录`
     - 保留审计能力，但不再与主闭环入口混淆

### 设计取舍

1. 本轮**不新造客户业务中心页**
2. 本轮**不复制一套订单列表面板到客户模块**
3. 直接复用现有销售订单管理页作为真正闭环承接页
4. 使用 `customerId` 作为稳定主键，避免客户改名后链接失效
5. 客户卡片只负责展示摘要与发起导航，不承担订单页过滤规则实现

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 销售订单页 `customerId/customerName` 路由承接与客户卡片主闭环按钮接线后 TypeScript 编译通过
2. 审计入口降级为次级入口后未引入新的前端类型问题

## 2026-04-13 - feat：客户卡片订单闭环显示口径调整

### 本轮目标

将客户卡片“订单闭环”主值从“有未完成订单 / 当前已闭环”改为更直观的“已完成数 / 总订单数”表达，例如：

1. `0/0`
2. `0/1`
3. `1/1`
4. `2/5`

同时保持：

1. 无订单客户明确表达为 `0/0` + `暂无订单`
2. 最后下单时间与沉默时长继续保留为辅信息
3. 不新增后端接口，直接复用现有 `openOrderCount / totalOrders`

### 核心实现

1. **新增独立闭环派生 util**
   - 新增：`src/features/trading/customer/utils/customer-sales-closure-metrics.ts`
   - 统一负责：
     - `closedOrderCount`
     - `closureRatioLabel`
     - `closureStatusLabel`
   - 派生规则：
     - `closedOrderCount = Math.max(0, totalOrders - openOrderCount)`
   - 这样避免把展示计算继续堆进卡片组件

2. **客户卡片闭环主值改为 `closed/total`**
   - 更新：`src/features/trading/customer/components/customer-sales-closure-summary.tsx`
   - 调整后：
     - 主值显示 `closed/total`
     - 状态 badge 显示：
       - `暂无订单`
       - `未闭环 X 单`
       - `全部闭环`
   - 最后下单时间与沉默时长保留为次级信息

### 设计取舍

1. 本轮**不改后端契约**
2. 本轮**不新增 `closedOrderCount` 后端字段**
3. 仅在前端做稳定派生，缩小变更面
4. 通过独立 util 保持展示逻辑集中，便于后续再调口径

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 客户卡片订单闭环主值切换为 `已完成数 / 总订单数` 后 TypeScript 编译通过
2. 无订单场景可稳定显示 `0/0`，且展示逻辑已集中到独立 util

## 2026-04-13 - feat：个人记录缓冲区模块骨架

### 本轮目标

新增一个独立的“个人记录缓冲区”模块，满足以下边界：

1. 账户私有，仅本人可见
2. 管理员无审计权
3. 当前只做个人记录 / 整理 / 归档
4. 复用现有图片上传链
5. 预留未来从个人记录发起业务调用的 action 扩展位，但本轮不实现

### 核心实现

1. **后端独立模型与最小读写链**
   - 新增：`server/models/personal_workbench.go`
   - 新增：`server/services/personal_workbench_service.go`
   - 新增：`server/handlers/personal_workbench_handlers.go`
   - 新增：`server/routes/routes_personal_workbench.go`
   - 更新：`server/routes/routes.go`
   - 更新：`server/db/db.go`
   - 当前后端已实现：
     - 仅按当前 `userId` 读取自己的记录
     - 创建个人记录
     - PATCH 更新个人记录
     - `AutoMigrate` 接入：
       - `PersonalRecord`
       - `PersonalRecordAsset`
       - `PersonalRecordActionLog`

2. **前端独立模块目录**
   - 新增目录：`src/features/personal-workbench/`
   - 当前已新增：
     - `data/constants.ts`
     - `data/schema.ts`
     - `services/personal-workbench-service.ts`
     - `hooks/use-personal-workbench.ts`
     - `hooks/use-personal-workbench-dialog-store.ts`
     - `components/personal-workbench-image-picker.tsx`
     - `components/personal-workbench-card-editor.tsx`
     - `components/personal-workbench-card.tsx`
     - `components/personal-workbench-column.tsx`
     - `components/personal-workbench-board.tsx`
     - `components/personal-workbench-dialog.tsx`
     - `index.tsx`

3. **双入口接入：弹窗 + 独立页面**
   - 新增路由：
     - `src/routes/_authenticated/personal-workbench.tsx`
     - `src/routes/_authenticated/personal-workbench.lazy.tsx`
   - 更新：`src/components/profile-dropdown.tsx`
   - 当前可从头像下拉菜单进入：
     - `个人记录缓冲区`（弹窗）
     - `打开个人记录页面`（独立页面）

4. **图片能力复用现有上传链**
   - 个人记录图片上传复用：`AssetService.uploadFile`
   - 未新增第二套图片压缩 / 上传逻辑
   - 前端仅消费已有上传结果 URL，保持模块边界清晰

### 当前实现边界

本轮已经实现：

1. 独立模块目录与最小读写链
2. Trello 式四列轻量展示：
   - `INBOX`
   - `ORGANIZING`
   - `PARKED`
   - `ARCHIVED`
3. 图片、标题、备注、分栏编辑
4. 弹窗与独立页面共用同一套看板组件

本轮明确未实现：

1. 正式业务对象流转
2. 团队协作
3. 管理员查看 / 恢复 / 导出
4. 未来 action 调用 UI

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./routes ./services -run ^$`

结果：

1. 前端 `personal-workbench` 独立模块、路由与弹窗接线后 TypeScript 编译通过
2. 后端个人记录缓冲区最小读写链编译型校验通过

## 2026-04-13 - feat：个人记录缓冲区拖拽排序

### 本轮目标

在个人记录缓冲区现有四列看板基础上，补齐最小可用的拖拽整理闭环：

1. 支持列内排序
2. 支持跨列拖拽
3. 拖拽后同步持久化 `columnKey` 与 `sortOrder`
4. 保持弹窗与独立页面共用同一套看板逻辑

### 核心实现

1. **后端新增批量排序接口**
   - 更新：`server/services/personal_workbench_service.go`
   - 更新：`server/handlers/personal_workbench_handlers.go`
   - 更新：`server/routes/routes_personal_workbench.go`
   - 新增接口：`POST /personal-workbench/records/reorder`
   - 请求体只接收最小排序信息：
     - `id`
     - `columnKey`
     - `sortOrder`
   - 服务层使用事务逐条更新，并强制限定在当前 `ownerUserId` 范围内执行

2. **前端新增排序 helper 与批量排序 mutation**
   - 新增：`src/features/personal-workbench/utils/record-reorder.ts`
   - 更新：`src/features/personal-workbench/data/schema.ts`
   - 更新：`src/features/personal-workbench/services/personal-workbench-service.ts`
   - 更新：`src/features/personal-workbench/hooks/use-personal-workbench.ts`
   - 前端统一通过 helper 计算新的列内顺序与受影响记录集合，避免排序规则散落在组件中

3. **看板接入原生 HTML5 拖拽**
   - 更新：
     - `src/features/personal-workbench/components/personal-workbench-board.tsx`
     - `src/features/personal-workbench/components/personal-workbench-column.tsx`
     - `src/features/personal-workbench/components/personal-workbench-card.tsx`
   - 当前已实现：
     - 卡片可拖拽
     - 列内落点排序
     - 跨列拖入目标列
     - optimistic UI 更新
     - 落库失败时回滚本地顺序并弹错误提示

### 当前实现边界

本轮已经实现：

1. 最小拖拽排序闭环
2. 批量排序落库
3. 刷新后顺序稳定
4. 弹窗与独立页面共用同一套排序逻辑

本轮明确未实现：

1. 移动端复杂拖拽手势优化
2. 多图能力增强
3. 业务 action 调用 UI
4. 批量归档 / 批量恢复

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`
2. `go test ./handlers ./routes ./services -run ^$`

结果：

1. 前端拖拽排序、批量排序 mutation 与原有编辑链共存后 TypeScript 编译通过
2. 后端批量排序接口与个人记录服务编译型校验通过

## 2026-04-13 - feat：个人记录弹窗完整相机面板

### 本轮目标

在个人记录新建/编辑弹窗中补齐页面内完整相机面板，满足以下能力：

1. 页面内相机预览
2. 前后摄像头切换
3. 拍照按钮
4. 拍照后继续走现有上传链
5. 不支持环境自动降级到原文件上传方案

### 核心实现

1. **相机面板挂载到现有图片选择器**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 未新增第二套上传协议或后端接口
   - 继续复用：`AssetService.uploadFile`

2. **页面内相机预览与拍照链**
   - 使用 `navigator.mediaDevices.getUserMedia` 获取视频流
   - 使用 `<video>` 展示实时预览
   - 使用隐藏 `canvas` 对当前画面截帧
   - 将截帧结果转换为 `File` 后继续走既有上传流程

3. **摄像头切换与资源释放**
   - 使用 `facingMode` 在 `environment` / `user` 间切换
   - 关闭相机、切换镜头、组件卸载时统一释放媒体流
   - 避免摄像头持续占用

4. **兼容性降级**
   - 当环境不支持 `getUserMedia`、不处于安全上下文、或权限被拒绝时：
     - 保留原文件上传入口
     - 提示用户当前已回退为普通上传
   - 不把相机不可用视为阻塞性错误

### 当前实现边界

本轮已经实现：

1. 页面内相机预览
2. 拍照上传
3. 前后摄像头切换
4. 自动降级
5. 继续复用现有单图上传链

本轮明确未实现：

1. 录像
2. 连续拍摄
3. 多图编辑
4. 图片裁剪 / 滤镜 / 标注

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录图片选择器接入完整相机面板后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录完整页模块壳布局（方案 B）

### 本轮目标

将个人记录完整页从当前“`PageHeader + 看板直出`”的轻量独页结构，调整为更接近系统内正式模块页的页面骨架：

1. 顶部模块承载层
2. 页面级主操作按钮
3. 正文前置页头卡片
4. 看板退回正文层，不再重复承担页面标题职责

### 核心实现

1. **完整页增加模块级顶部承载层**
   - 更新：`src/features/personal-workbench/index.tsx`
   - 完整页顶部新增模块承载条：
     - 模块名标识
     - 当前页面标题
     - 主操作按钮 `新建记录`

2. **正文层统一为 PageHeader + Board**
   - 保留 `PageHeader` 作为正文前置页头卡片
   - 将 `PersonalWorkbenchBoard` 退回正文内容区
   - 完整页中不再让 Board 重复渲染自己的标题与新建按钮

3. **Board 组件补充页面壳适配参数**
   - 更新：`src/features/personal-workbench/components/personal-workbench-board.tsx`
   - 新增可选参数：
     - `hideHeading`
     - `hideCreateAction`
   - 使 Board 可以在：
     - 弹窗场景保持轻量头部
     - 完整页场景退回正文层

### 当前实现边界

本轮已经实现：

1. 更接近正式模块页的顶部骨架
2. 页面标题与主操作按钮上收至模块承载层
3. 完整页不再出现 Board 内部重复头部

本轮明确未实现：

1. 多业务 tab 体系
2. 共享/协作副页
3. 筛选器中心
4. 弹窗与完整页完全同构

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录完整页方案 B 结构改造后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录媒体面板 10 秒视频录制

### 本轮目标

在现有个人记录媒体面板中补齐短视频录制能力，并严格限制为单段、最长 10 秒：

1. 页面内视频录制
2. 录制中剩余秒数提示
3. 10 秒自动停止
4. 手动提前停止
5. 录制完成后继续走现有上传链

### 核心实现

1. **按更干净拆法拆出录制 hook 与录制 UI 组件**
   - 新增：`src/features/personal-workbench/hooks/use-media-recorder.ts`
   - 新增：`src/features/personal-workbench/components/personal-workbench-video-recorder.tsx`
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`

2. **录制状态机下沉到独立 hook**
   - `use-media-recorder.ts` 负责：
     - `MediaRecorder` 生命周期
     - 10 秒倒计时
     - 自动停止
     - 手动停止
     - 录制结果产出为 `File`

3. **视频录制 UI 独立承接**
   - `personal-workbench-video-recorder.tsx` 负责：
     - 开始录制按钮
     - 停止录制按钮
     - 录制中倒计时展示
     - 10 秒上限提示

4. **媒体面板回归编排层**
   - `personal-workbench-image-picker.tsx` 负责：
     - 拍照 / 录视频模式切换
     - 统一管理相机流
     - 监听录制结果并走现有 `AssetService.uploadFile`
     - 不支持 `MediaRecorder` 时继续降级到拍照/普通上传

### 当前实现边界

本轮已经实现：

1. 单段视频录制
2. 最长 10 秒
3. 自动停止与手动停止
4. 录制完成后上传
5. 保持拍照与普通上传共存

本轮明确未实现：

1. 视频裁剪
2. 封面编辑
3. 多段拼接
4. 长视频录制
5. 视频库管理

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录媒体面板接入 10 秒视频录制后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录视频录制反馈强化（第一阶段）

### 本轮目标

在不修改视频录制链路的前提下，先补强录制中的视觉反馈：

1. 红色高亮边缘
2. 呼吸灯效果
3. 更明确的录制中提示

### 核心实现

1. **录制 UI 强化**
   - 更新：`src/features/personal-workbench/components/personal-workbench-video-recorder.tsx`
   - 录制中时：
     - 切换到红色高亮边框
     - 增加 `animate-pulse` 呼吸灯效果
     - 增加“正在记录现场”提示文案

2. **媒体面板外层同步高亮**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当 `isRecording=true` 时，相机面板外层同步切换到红色高亮态
   - 保持录制中视觉反馈从局部控件扩展到整个采集面板

### 当前实现边界

本轮已经实现：

1. 更强的录制中视觉确认
2. 红色高亮边缘
3. 呼吸灯效果
4. 更明确的录制状态提示

本轮明确未实现：

1. 码率调整
2. 分辨率调整
3. IndexedDB 暂存
4. `Video_Ref` 协议升级
5. 视频增强或压缩

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录视频录制反馈强化后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录本地草稿模型与 IndexedDB 暂存基础层

### 本轮目标

为个人记录媒体能力补齐“本地优先”路线的第一层基础承载：

1. 本地草稿媒体模型
2. IndexedDB 本地持久化
3. 页面刷新后可恢复草稿
4. 为后续手动上传与本地丢弃预留状态层

### 核心实现

1. **本地草稿模型补充到 personal-workbench schema**
   - 更新：`src/features/personal-workbench/data/schema.ts`
   - 新增：
     - `PersonalLocalMediaDraftKind`
     - `PersonalLocalMediaDraftStatus`
     - `PersonalLocalMediaDraft`

2. **新增 IndexedDB 存储服务**
   - 新增：`src/features/personal-workbench/services/local-media-draft-store.ts`
   - 负责：
     - 打开数据库
     - 读取全部草稿
     - 保存草稿
     - 删除草稿

3. **新增本地草稿 hook**
   - 新增：`src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - 负责：
     - 初始化读取本地草稿
     - 暴露 `drafts`
     - 暴露 `isReady`
     - 暴露 `saveDraft`

4. **媒体面板接入本地草稿基础层**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当前行为：
     - 文件选择图片时先写本地草稿
     - 页面内拍照时先写本地草稿
     - 视频录制结束时先写本地草稿
     - 面板顶部显示当前本地草稿数量

5. **本轮过渡策略**
   - 为避免打断当前已可用的记录链路，本轮暂时保留现有即时上传行为
   - 也就是说：
     - 采集结果会先写本地草稿
     - 同时仍继续走当前上传链
   - 下一步做“手动上传入口”时，再将默认即时上传切换掉

### 当前实现边界

本轮已经实现：

1. 本地草稿模型
2. IndexedDB 基础持久化
3. 拍照/视频采集结果写入本地草稿
4. 刷新后理论可恢复草稿

本轮明确未实现：

1. 手动上传按钮
2. 本地草稿删除 UI
3. 云端与本地草稿自动合并
4. 多端同步
5. 默认关闭即时上传

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录本地草稿模型与 IndexedDB 暂存基础层接入后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录媒体手动上传入口

### 本轮目标

将个人记录媒体流程从“采集后默认即时上传”切换为“本地保存后人工上传”：

1. 停止默认即时上传
2. 显示当前本地草稿
3. 新增“上传到服务器”按钮
4. 上传成功后再回写当前编辑表单

### 核心实现

1. **本地草稿 hook 能力补充**
   - 更新：`src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - 新增：
     - `updateDraft`
     - `getDraftById`

2. **媒体面板切换为手动上传工作流**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当前行为改为：
     - 文件选择后仅保存本地草稿
     - 页面内拍照后仅保存本地草稿
     - 视频录制后仅保存本地草稿
     - 不再默认即时上传

3. **新增当前草稿可视区**
   - 在媒体面板中显示当前活跃草稿
   - 图片草稿显示图片预览
   - 视频草稿显示可播放预览
   - 显示 `未上传 / 已上传` 状态

4. **显式“上传到服务器”按钮**
   - 点击后才调用现有 `AssetService.uploadFile`
   - 上传成功后：
     - 将草稿状态更新为 `uploaded`
     - 将云端 URL 回写到当前编辑表单

### 当前实现边界

本轮已经实现：

1. 手动上传入口
2. 默认即时上传关闭
3. 本地草稿预览
4. 上传成功后表单值回写

本轮明确未实现：

1. 本地草稿删除 UI
2. 多端同步
3. 协议升级
4. 草稿批量管理
5. 本地与云端自动合并

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录媒体手动上传入口接入后 TypeScript 编译通过

## 2026-04-13 - feat：个人记录本地草稿删除/丢弃入口

### 本轮目标

为本地优先媒体链路补齐“当前草稿可丢弃”动作：

1. 当前活跃草稿增加丢弃入口
2. 丢弃后清理 IndexedDB 记录
3. 同步清空当前草稿态与必要的表单媒体值

### 核心实现

1. **本地草稿 hook 增加删除能力**
   - 更新：`src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - 新增：`removeDraft`
   - 用于删除 IndexedDB 中的本地草稿，并同步更新内存态 `drafts`

2. **当前活跃草稿增加“丢弃草稿”按钮**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 在当前草稿预览区增加 `丢弃草稿` 按钮

3. **丢弃动作的状态同步**
   - 删除本地草稿记录后：
     - 清空 `activeDraftId`
     - 移除当前草稿预览
   - 若当前草稿状态已为 `uploaded` 且当前表单值仍有媒体引用，则同步执行 `onChange('')`

### 当前实现边界

本轮已经实现：

1. 当前活跃草稿删除/丢弃入口
2. IndexedDB 草稿清理
3. 当前草稿预览同步消失
4. 已上传草稿丢弃时同步清空当前表单媒体值

本轮明确未实现：

1. 草稿列表中心
2. 批量删除
3. 云端资源删除
4. 多端同步
5. 协议升级

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录本地草稿删除/丢弃入口接入后 TypeScript 编译通过

## 2026-04-13 - feat：快捷扫描右侧边栏接入个人缓冲区快捷媒体入口

### 本轮目标

让右侧“快捷扫描”边栏能够直接承接个人缓冲区的高频移动端入口：

1. 个人拍照
2. 个人录视频
3. 个人缓冲区

### 核心实现

1. **扩展 quick actions 类型与注册表**
   - 更新：
     - `src/features/quick-actions/types.ts`
     - `src/features/quick-actions/data/quick-action-registry.ts`
   - 新增动作：
     - `personal_workbench_photo`
     - `personal_workbench_video`
     - `personal_workbench_buffer`

2. **补充快捷扫描中文文案**
   - 更新：`src/locales/messages/zh-CN/quickActions.ts`
   - 增加“个人拍照 / 个人录视频 / 个人缓冲区”标题与描述

3. **新增 personal capture 页面与路由**
   - 新增：
     - `src/features/personal-workbench/capture/index.tsx`
     - `src/routes/_authenticated/personal-workbench/capture.tsx`
     - `src/routes/_authenticated/personal-workbench/capture.lazy.tsx`
     - `src/routes/_authenticated/personal-workbench/capture-route-component.tsx`
   - 通过 query 参数承接：
     - `mode=photo`
     - `mode=video`

4. **媒体面板支持快捷采集页模式**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 新增：
     - `initialCaptureMode`
     - `autoStartCamera`
   - 使快捷采集页进入后即可直达拍照或录视频模式，并自动打开相机

### 当前实现边界

本轮已经实现：

1. 快捷扫描侧栏中的个人拍照入口
2. 快捷扫描侧栏中的个人录视频入口
3. 快捷扫描侧栏中的个人缓冲区入口
4. 独立快捷采集页与模式直达

本轮明确未实现：

1. 添加到主屏幕交互提示
2. 浏览器直接写手机桌面文件系统
3. 草稿中心
4. 多端同步
5. 云端协议升级

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 快捷扫描右侧边栏接入个人缓冲区快捷媒体入口后 TypeScript 编译通过

## 2026-04-13 - fix：快捷扫描个人拍照/录视频入口改为更接近直调体验

### 本轮目标

修正快捷扫描中“个人拍照 / 个人录视频”仍然过于像普通网页承接页的问题：

1. 个人拍照更接近直接调起系统拍照入口
2. 个人录视频更接近直入极简录制页

### 核心实现

1. **个人记录媒体面板增强快捷采集模式能力**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 新增能力：
     - `autoTriggerPhotoPicker`
     - `autoStartRecording`
     - `compactMode`
   - 具体行为：
     - 拍照模式下进入页面后自动尝试触发系统拍照选择器
     - 录视频模式下在相机就绪后自动开始录制
     - 快捷采集页中隐藏部分普通编辑态 UI，收敛为更接近直入模式

2. **快捷采集页调整为模式化直入说明与行为**
   - 更新：`src/features/personal-workbench/capture/index.tsx`
   - 当前行为：
     - `mode=photo` 时，进入页后自动尝试拉起系统拍照入口
     - `mode=video` 时，进入页后自动打开相机并自动开始录制

### 当前实现边界

本轮已经实现：

1. 个人拍照更接近系统拍照入口
2. 个人录视频更接近极简录制页直入模式

本轮仍然未实现：

1. 原生 App 级别的无页面系统录像接管
2. 浏览器直接写手机桌面文件系统
3. 主屏幕安装引导交互

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 快捷扫描个人拍照/录视频入口改为更接近直调体验后 TypeScript 编译通过

## 2026-04-13 - feat：方案A - 快捷采集成功后自动打开新建个人记录弹窗

### 本轮目标

将快捷采集入口与“新建个人记录”弹窗打通，形成“采集现场媒体 -> 整理记录”的闭环：

1. 快捷拍照成功后自动打开新建个人记录弹窗
2. 快捷录视频成功后自动打开新建个人记录弹窗
3. 弹窗自动回填刚采集的本地草稿媒体

### 核心实现

1. **个人记录媒体面板支持草稿桥接回填**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 新增能力：
     - `initialDraftId`
     - `onDraftCreated`
   - 具体行为：
     - 新建草稿成功时向外回调草稿 id
     - 支持外部指定当前草稿 id 并在编辑弹窗中回填对应草稿预览
     - 当草稿为视频且尚未上传时，允许在弹窗中直接预览本地视频草稿

2. **个人记录弹窗支持“快捷采集回填模式”**
   - 更新：`src/features/personal-workbench/components/personal-workbench-card-editor.tsx`
   - 具体行为：
     - 接收 `initialDraftId`
     - 当由快捷采集唤起时，顶部提示改为“已带入刚采集的现场媒体，请补充记录信息后保存”
     - 媒体面板自动读取并展示对应草稿

3. **快捷采集页在采集成功后自动唤起弹窗**
   - 更新：`src/features/personal-workbench/capture/index.tsx`
   - 具体行为：
     - 快捷拍照/录视频生成草稿后，记录该草稿 id
     - 自动打开 `PersonalWorkbenchCardEditor`
     - 保存成功后继续复用现有个人记录创建 mutation

### 当前实现边界

本轮已经实现：

1. 快捷采集成功后自动唤起新建个人记录弹窗
2. 新建弹窗自动回填刚采集的媒体草稿
3. 用户可在弹窗中继续补充标题、备注、分栏并保存

本轮仍然未实现：

1. 多条草稿切换器
2. 草稿中心
3. 多端同步
4. 后端协议升级

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 方案A“快捷采集成功后自动打开新建个人记录弹窗并回填草稿媒体”实现后 TypeScript 编译通过

## 2026-04-13 - feat：快捷扫描个人卡片增加“放到桌面”入口

### 本轮目标

为快捷扫描侧边栏中的个人卡片增加“放到桌面”次级操作，在不破坏主跳转行为的前提下，支持更直接的移动端高频入口：

1. 个人拍照卡片支持放到桌面
2. 个人录视频卡片支持放到桌面
3. 个人缓冲区卡片支持放到桌面

### 核心实现

1. **快捷扫描卡片增加安装次级按钮**
   - 更新：`src/features/quick-actions/components/quick-action-drawer.tsx`
   - 具体行为：
     - 保持卡片主点击继续走原有页面跳转
     - 仅对 `personal_workbench_photo` / `personal_workbench_video` / `personal_workbench_buffer` 三类卡片增加“放到桌面”次级按钮
     - 复用 `usePageInstall` 安装能力 hook
     - 若浏览器支持安装提示，则触发安装引导
     - 若浏览器不支持安装，则弹出“添加到主屏幕”说明

2. **补充快捷扫描侧边栏安装文案**
   - 更新：`src/locales/messages/zh-CN/quickActions.ts`
   - 新增文案：
     - 放到桌面
     - 已在桌面
     - 安装指引
     - 安装提示成功反馈
     - 手动添加到主屏幕标题

3. **为三类个人入口新增独立 manifest**
   - 新增：
     - `public/manifests/personal-workbench-photo.webmanifest`
     - `public/manifests/personal-workbench-video.webmanifest`
     - `public/manifests/personal-workbench-buffer.webmanifest`
   - 目标映射：
     - 个人拍照 -> `/personal-workbench/capture?mode=photo`
     - 个人录视频 -> `/personal-workbench/capture?mode=video`
     - 个人缓冲区 -> `/personal-workbench`

### 当前实现边界

本轮已经实现：

1. 侧边栏个人卡片出现“放到桌面”按钮
2. 支持安装时触发安装提示
3. 不支持安装时展示手动添加到主屏幕引导

本轮仍然未实现：

1. 原生系统级快捷方式直写
2. 浏览器外桌面文件写入
3. 桌面端独立打包

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 快捷扫描个人卡片增加“放到桌面”入口后 TypeScript 编译通过

## 2026-04-13 - fix：个人记录缓冲区 500 与 Dialog 可访问性问题止血修复

### 本轮目标

对 `t81` 做前端侧最小正确修复：

1. 个人记录缓冲区完整页在接口异常时不再直接放大为 500
2. 个人记录缓冲区弹窗在接口异常时有明确错误态兜底
3. 缓解外层缓冲区 Dialog 与内层编辑 Dialog 同时打开导致的可访问性警告

### 核心实现

1. **完整页补 query 错误兜底**
   - 更新：`src/features/personal-workbench/index.tsx`
   - 具体行为：
     - 使用 `isError / error / isPending / refetch`
     - 接口异常时展示错误态和重试按钮
     - 避免 query 异常直接放大成整页崩溃

2. **缓冲区弹窗补 query 错误兜底**
   - 更新：`src/features/personal-workbench/components/personal-workbench-dialog.tsx`
   - 具体行为：
     - 为弹窗内部列表区补充 loading / error 态
     - 接口异常时展示错误提示与重试按钮

3. **缓解嵌套 Dialog 问题**
   - 更新：`src/features/personal-workbench/components/personal-workbench-dialog.tsx`
   - 具体行为：
     - 新建 / 编辑记录时先关闭外层 `PersonalWorkbenchDialog`
     - 再打开 `PersonalWorkbenchCardEditor`
     - 降低 `Dialog` 套 `Dialog` 导致的可访问性警告概率

### 当前实现边界

本轮已经实现：

1. 接口异常时个人记录完整页不再直接落到 500
2. 个人缓冲区弹窗在接口异常时可见错误态与重试入口
3. 外层缓冲区弹窗与内层编辑弹窗不再维持同时打开状态

本轮未直接修复：

1. `404` 的真实环境根因（后端版本 / 代理 / 路由注册）
2. 个人记录后端协议

### 额外说明

当前已确认个人记录前端 service 路径与后端路由定义是对齐的，因此 `404` 仍应视为环境同步核对项，而不是前端接口地址错误。

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人记录缓冲区 500 与 Dialog 止血修复后 TypeScript 编译通过

## 2026-04-13 - fix：第一阶段必修 - 本地媒体草稿账号隔离

### 本轮目标

修复个人缓冲区快捷采集链路中的高优先级漏洞点：本地媒体草稿在同一浏览器多账号切换场景下可能串数据。目标是将本地草稿与当前登录账号绑定。

### 核心实现

1. **本地草稿 schema 增加账号归属字段**
   - 更新：`src/features/personal-workbench/data/schema.ts`
   - 新增字段：
     - `ownerUserId`
     - `ownerAccountNo`

2. **本地草稿存储层支持按账号读取**
   - 更新：`src/features/personal-workbench/services/local-media-draft-store.ts`
   - 新增能力：
     - `getAllByOwner(ownerUserId, ownerAccountNo)`
   - 行为：
     - 只返回归属于当前账号的本地草稿
     - 草稿按 `createdAt` 倒序返回，降低不同浏览器实现差异带来的顺序不确定性

3. **本地草稿 hook 接入当前登录账号**
   - 更新：`src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - 行为：
     - 读取当前 `AuthStore.user`
     - 初始化时按当前账号过滤草稿
     - 保存草稿时写入 `ownerUserId` 与 `ownerAccountNo`
     - 更新旧草稿时若缺少归属字段，则以当前账号补齐最小兼容字段

### 当前实现边界

本轮已经实现：

1. 同一浏览器中不同账号不会再直接共用同一批本地草稿
2. 新生成草稿会携带明确账号归属
3. 旧草稿在被当前账号更新时可补齐归属字段

本轮仍未实现：

1. 对无归属字段的历史旧草稿自动做离线迁移
2. 第二阶段中的状态源收敛与保存后流转优化
3. 第三阶段中的草稿队列、manifest shortcuts 与状态机增强

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 第一阶段“本地媒体草稿账号隔离”实现后 TypeScript 编译通过

## 2026-04-13 - fix：第二阶段 - 状态源收敛、保存后去向与录视频准备态优化

### 本轮目标

在不推翻第一阶段账号隔离的前提下，对快捷采集链路做第二阶段收敛优化：

1. 收敛媒体显示状态源
2. 明确保存成功后的默认去向
3. 将自动录视频从“自动开始录制”调整为更稳的录制准备态

### 核心实现

1. **媒体显示状态收敛**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当前调整：
     - 保留本地草稿块作为主要本地媒体状态展示
     - 已上传媒体预览仅在没有 `activeDraft` 时显示
     - 降低 `value + activeDraft + previewUrl` 同时驱动同一预览区域的混杂程度

2. **录视频进入方式调整为准备态**
   - 更新：`src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当前调整：
     - 新增 `autoPrepareRecording`
     - 视频模式下自动打开相机并进入录制准备态
     - 不再在相机 ready 后自动直接开始录制
     - UI 增加“准备录制”提示 badge

3. **保存成功后的默认去向明确**
   - 更新：`src/features/personal-workbench/capture/index.tsx`
   - 当前默认策略：
     - 快捷采集完成并在弹窗中保存个人记录后
     - 提示“个人记录已保存，正在返回个人缓冲区”
     - 自动跳转回 `/personal-workbench`

### 当前实现边界

本轮已经实现：

1. 录视频不再进入页面后立即自动开始录制
2. 快捷采集保存成功后存在明确默认流转
3. 媒体显示判断链比上一版更收敛

本轮仍未实现：

1. 更彻底的单一真相来源重构
2. 待整理草稿队列
3. manifest shortcuts
4. 本地草稿状态机增强

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 第二阶段优化后 TypeScript 编译通过

## 2026-04-13 - feat：第三阶段增强 - 草稿队列、manifest shortcuts 与草稿状态机

### 本轮目标

在前两阶段稳定基础上，为个人缓冲区快捷采集链路补充第三阶段增强能力：

1. 待整理草稿队列
2. manifest shortcuts
3. 更明确的本地草稿状态机

### 核心实现

1. **本地草稿状态机扩容**
   - 更新：
     - `src/features/personal-workbench/data/schema.ts`
     - `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
     - `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
   - 当前状态扩展为：
     - `local_draft`
     - `uploading`
     - `uploaded`
     - `linked_to_record`
   - 行为：
     - 新建草稿默认进入 `local_draft`
     - 上传中进入 `uploading`
     - 上传完成进入 `uploaded`
     - 在快捷采集弹窗中保存记录后，当前草稿标记为 `linked_to_record`

2. **快捷采集页支持待整理草稿队列**
   - 更新：`src/features/personal-workbench/capture/index.tsx`
   - 当前行为：
     - 读取当前账号下仍待整理的草稿（`local_draft` / `uploaded`）
     - 显示待整理草稿数量
     - 当前记录保存完成后，若还有下一条草稿，则自动切换到下一条继续整理
     - 所有待整理草稿处理完成后，再返回个人缓冲区

3. **manifest shortcuts 增强**
   - 更新：
     - `public/manifests/personal-workbench-buffer.webmanifest`
     - `public/manifests/personal-workbench-photo.webmanifest`
     - `public/manifests/personal-workbench-video.webmanifest`
   - 当前 shortcuts 提供：
     - 个人拍照
     - 个人录视频
     - 个人缓冲区

### 当前实现边界

本轮已经实现：

1. 多条草稿可顺序整理，而不再局限于一次处理一条
2. 草稿生命周期比前两阶段更明确
3. 现有放到桌面能力之外，manifest 中已有标准 shortcuts 补充

本轮仍未实现：

1. 对旧草稿状态做离线批量迁移
2. 更复杂的队列优先级或批量操作
3. 浏览器层面对 shortcuts 展示效果的完全一致性保证

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 第三阶段增强后 TypeScript 编译通过

## 2026-04-13 - feat：更深层增强 - 历史迁移、队列批量能力与 shortcuts 兼容

### 本轮目标

在前三阶段基础上继续补强长期稳定性与产品化能力：

1. 让历史旧草稿状态显式迁移到新状态机
2. 给待整理草稿队列增加优先级与批量操作
3. 为 shortcuts 增加跨浏览器兼容提示

### 核心实现

1. **历史旧草稿状态批量迁移**
   - 更新：
     - `src/features/personal-workbench/data/schema.ts`
     - `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - 当前行为：
     - 读取当前账号草稿后，对历史旧状态做显式映射
     - 旧 `draft` 迁移为 `local_draft`
     - 补齐 `queuePriority`
     - 迁移结果回写 IndexedDB，而不是仅依赖运行时容忍

2. **队列优先级与批量操作**
   - 更新：
     - `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
     - `src/features/personal-workbench/capture/index.tsx`
   - 新增能力：
     - `reprioritizeDraft`
     - `clearLinkedDrafts`
   - 当前交互：
     - 置顶当前
     - 稍后处理
     - 清理已整理
   - 同时在草稿 schema 中补充：
     - `queuePriority`
     - `linkedRecordAt`

3. **shortcuts 兼容增强**
   - 更新：
     - `src/locales/messages/zh-CN/quickActions.ts`
     - `src/features/quick-actions/components/quick-action-drawer.tsx`
   - 当前行为：
     - 在安装降级提示中补充兼容性说明
     - 明确告诉用户：不同浏览器可能展示为桌面图标、长按快捷入口或应用内快捷动作

### 当前实现边界

本轮已经实现：

1. 历史旧草稿不再只依赖运行时兼容，而会显式迁移到新状态机
2. 待整理草稿队列具备了最小可用的优先级与批量操作
3. shortcuts 兼容提示更完整，降低了用户把浏览器差异误判为失败的概率

本轮仍未实现：

1. 更复杂的批量选择面板或多选任务管理 UI
2. 浏览器层面对 shortcuts 呈现差异的完全统一控制
3. 旧草稿迁移进度或迁移审计展示

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 更深层增强实现后 TypeScript 编译通过

## 2026-04-13 - feat：个人工作收纳箱第一批 MVP - 便签与链接

### 本轮目标

新增独立于个人媒体缓冲区的“个人工作收纳箱”第一批 MVP，仅承接两类高频边缘工作数据：

1. 便签
2. 链接

并坚持：

1. 与当前个人媒体缓冲区链路隔离
2. 能拆就拆，尽量一个功能一个文件

### 核心实现

1. **独立的数据模型与本地存储**
   - 新增：
     - `src/features/personal-workbench/workspace/data/schema.ts`
     - `src/features/personal-workbench/workspace/services/workspace-item-store.ts`
     - `src/features/personal-workbench/workspace/hooks/use-workspace-items.ts`
   - 当前行为：
     - 便签与链接使用独立 IndexedDB 存储
     - 继续沿用账号隔离思路，仅读取当前账号条目
     - 与原个人媒体草稿存储彻底分开，避免互相影响

2. **独立的工作收纳箱页面与组件**
   - 新增：
     - `src/features/personal-workbench/workspace/index.tsx`
     - `src/features/personal-workbench/workspace/components/workspace-board.tsx`
     - `src/features/personal-workbench/workspace/components/workspace-item-editor.tsx`
     - `src/features/personal-workbench/workspace/components/workspace-note-card.tsx`
     - `src/features/personal-workbench/workspace/components/workspace-link-card.tsx`
   - 当前交互：
     - 新建便签
     - 新增链接
     - 编辑条目
     - 删除条目
     - 便签以较大容器样式展示
     - 链接显示 URL 与备注，并可直接新窗口打开

3. **独立路由与最小入口挂接**
   - 新增：
     - `src/routes/_authenticated/personal-workbench/workspace.tsx`
     - `src/routes/_authenticated/personal-workbench/workspace.lazy.tsx`
   - 更新：`src/features/personal-workbench/index.tsx`
   - 当前行为：
     - 从个人工作台主页可进入“工作收纳箱”
     - 仅做最小入口挂接，不改当前个人媒体缓冲区内部链路

### 当前实现边界

本轮已经实现：

1. 便签与链接有独立的本地收纳能力
2. 功能拆成数据 / 存储 / hook / 卡片 / 编辑器 / 页面 / 路由多个独立文件
3. 现有个人媒体缓冲区仍保持独立，不与工作收纳箱逻辑混写

本轮仍未实现：

1. 联系人类型
2. 提醒/待办类型
3. 复杂标签与筛选系统
4. 与订单/客户/设备等正式业务对象的关联

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 个人工作收纳箱第一批 MVP 实现后 TypeScript 编译通过

## 2026-04-13 - fix：personal-workbench 权限映射与 service worker warning

### 本轮目标

仅修复本轮已确认的两项问题：

1. `/personal-workbench` 未映射到 permission catalog
2. `public/sw.js` 中 no-op fetch handler 浏览器 warning

### 核心实现

1. **补齐 personal-workbench 权限映射**
   - 更新：`src/features/authz/data/permission-catalog.ts`
   - 当前行为：
     - 为 `/personal-workbench` 补充顶层路径映射
     - 消除 `permission-catalog` 对 `/personal-workbench` 抛出的 `Unmapped top-level path` 错误

2. **移除 service worker 空 fetch 监听器**
   - 更新：`public/sw.js`
   - 当前行为：
     - 删除 no-op `fetch` handler
     - 保留 install / activate 最小 installability 逻辑
     - 不额外引入 runtime caching

### 当前实现边界

本轮已经实现：

1. 个人工作台新路由不会再因 permission catalog 缺口导致权限生成报错
2. service worker 不再包含空 fetch 监听器 warning 来源

本轮未处理：

1. `useNotifications` websocket 根因修复
2. 任何额外的 service worker 缓存策略扩展

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 本轮两项修复后 TypeScript 编译通过

## 2026-04-13 - feat：personal-workbench 顶部统一 Tab 结构

### 本轮目标

将 `/personal-workbench` 顶部统一为与系统整体风格一致的 Tab 结构，同时保持“个人记录缓冲区”和“工作收纳箱”的底层实现继续隔离。

### 核心实现

1. **抽出独立视图组件**
   - 新增：
     - `src/features/personal-workbench/components/personal-workbench-records-view.tsx`
     - `src/features/personal-workbench/workspace/components/personal-workbench-workspace-view.tsx`
   - 当前行为：
     - 个人记录缓冲区页面编排抽成独立视图
     - 工作收纳箱页面编排抽成独立视图
     - 底层继续复用各自原有 hook / 存储 / 编辑器

2. **主页面统一为 Tab 外壳**
   - 更新：`src/features/personal-workbench/index.tsx`
   - 当前行为：
     - `/personal-workbench` 顶部提供两个 Tab：
       - `个人记录缓冲区`
       - `工作收纳箱`
     - 两个视图在同一工作台内切换，入口体验与系统其他 Tab 风格统一

3. **保留工作收纳箱独立直达页，但复用同一视图**
   - 更新：`src/features/personal-workbench/workspace/index.tsx`
   - 当前行为：
     - 仍可通过独立工作收纳箱页面直达
     - 页面内部不再重复维护一套独立编排逻辑，而是复用统一的工作收纳箱视图

### 当前实现边界

本轮已经实现：

1. 个人工作台入口体验统一为 Tab
2. 记录缓冲区与工作收纳箱都能在同一入口下直接切换
3. 底层仍保持独立存储、独立 hook、独立编辑器，不重新混模

本轮未做：

1. 不新增新的工作收纳箱类型
2. 不把便签/链接混进四栏记录看板的数据结构
3. 不取消工作收纳箱独立直达页

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 统一 Tab 改造后 TypeScript 编译通过

## 2026-04-13 - feat：组织人事最小分类调整

### 本轮目标

对当前“人事账号中心”先做最小导航升级：

1. 命名升级为“组织人事”
2. 第一轮整体承接现有内容
3. 暂不细拆内部结构

### 核心实现

1. **侧边栏导航命名升级**
   - 更新：
     - `src/locales/messages/zh-CN/sidebar.ts`
     - `src/locales/messages/en-US/sidebar.ts`
   - 当前行为：
     - 侧边栏入口从“人事账号中心 / Personnel & Accounts”统一升级为“组织人事 / Organization & Personnel`

2. **命令搜索命名同步**
   - 更新：
     - `src/locales/messages/zh-CN/commandMenu.ts`
     - `src/locales/messages/en-US/commandMenu.ts`
   - 当前行为：
     - 命令菜单中的父级与入口名称同步升级为“组织人事 / Organization & Personnel`

3. **模块外层标题沿用统一命名**
   - `src/routes/_authenticated/personnel/route.tsx` 已通过 `sidebar.items.personnelCenter` 取标题
   - 因此在侧边栏文案升级后，模块外层标题会自动同步为“组织人事”

### 当前实现边界

本轮已经实现：

1. 导航入口从“账号中心”语义升级为更中性的“组织人事”
2. 当前原有人事相关内容继续整体承接，不强行细拆

本轮未做：

1. 不细拆为组织人员 / 账号权限等子分组
2. 不接入 `KPI绩效`
3. 不重写人事模块内部页面结构

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 组织人事最小分类调整后 TypeScript 编译通过

## 2026-04-13 - feat：组织人事独立侧边栏分组

### 本轮目标

将“组织人事”从“系统配置”中独立出来，成为一个真正独立的侧边栏分组，并先整体挂载当前 `/personnel` 入口。

### 核心实现

1. **新增组织人事侧边栏分组文案**
   - 更新：
     - `src/locales/messages/zh-CN/sidebar.ts`
     - `src/locales/messages/en-US/sidebar.ts`
   - 当前行为：
     - 侧边栏已有独立分组文案：`组织人事 / Organization & Personnel`

2. **迁移 `/personnel` 入口归属**
   - 更新：`src/components/layout/data/sidebar-data.ts`
   - 当前行为：
     - 新增独立分组 `sidebar.groups.orgPersonnel`
     - 将 `/personnel` 从 `systemSettings` 分组中迁出
     - 先整体挂入新的“组织人事”分组
     - 其他系统配置项保持原位不动

### 当前实现边界

本轮已经实现：

1. 组织人事不再作为系统配置的子项显示
2. `/personnel` 已成为独立侧边栏分组下的唯一入口

本轮未做：

1. 不细拆为组织人员 / 账号权限等子分组
2. 不接入 `KPI绩效`
3. 不重写组织人事内部页面结构

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 组织人事独立侧边栏分组调整后 TypeScript 编译通过

## 2026-04-13 - style：头像下拉菜单 1.0 视觉对齐

### 本轮目标

将点击头像后的下拉菜单视觉风格对齐到 1.0 标准，同时不改动任何菜单功能行为。

### 核心实现

1. **触发器样式升级**
   - 更新：`src/components/profile-dropdown.tsx`
   - 当前行为：
     - 头像触发按钮改为更接近 1.0 的虚线边框、轻阴影和 hover 反馈
     - 头像 fallback 字体与底色层级更明确

2. **下拉菜单容器与头部样式升级**
   - 更新：`src/components/profile-dropdown.tsx`
   - 当前行为：
     - 菜单容器使用更大的圆角、虚线边框、毛玻璃背景和更强层级阴影
     - 用户信息头改为更清晰的头像 + 双层文字结构

3. **菜单项与退出项样式升级**
   - 更新：`src/components/profile-dropdown.tsx`
   - 当前行为：
     - 菜单项统一为更强字重、圆角块状点击区域
     - 危险项保持 destructive 语义，但视觉上更贴近系统 1.0 风格

### 当前实现边界

本轮已经实现：

1. 头像菜单视觉层级更接近系统 1.0 标准
2. 不影响个人记录缓冲区入口、个人工作台入口和退出逻辑

本轮未做：

1. 不修改 dropdown-menu 通用基础组件
2. 不改菜单项文案与跳转逻辑
3. 不扩散到其他下拉菜单

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 头像下拉菜单 1.0 视觉对齐后 TypeScript 编译通过

## 2026-04-13 - style：语言切换与主题切换菜单 1.0 视觉统一

### 本轮目标

将右上角语言切换与明暗模式切换的下拉菜单视觉风格统一到与头像菜单一致的 1.0 标准。

### 核心实现

1. **触发器样式统一**
   - 更新：
     - `src/components/language-switch.tsx`
     - `src/components/theme-switch.tsx`
   - 当前行为：
     - 两个按钮均升级为与头像菜单一致的圆形触发器风格
     - 使用虚线边框、轻阴影和统一 hover 反馈

2. **下拉容器样式统一**
   - 更新：
     - `src/components/language-switch.tsx`
     - `src/components/theme-switch.tsx`
   - 当前行为：
     - 菜单容器统一为更大圆角、虚线边框、毛玻璃背景和 1.0 阴影层级

3. **菜单项样式统一**
   - 更新：
     - `src/components/language-switch.tsx`
     - `src/components/theme-switch.tsx`
   - 当前行为：
     - 选项项统一使用更强字重、块状圆角点击区和一致的 focus 态
     - 当前选中项的 `Check` 图标统一为主色表现

### 当前实现边界

本轮已经实现：

1. 语言、主题、头像三套右上角菜单风格已明显趋于统一
2. 功能行为与切换逻辑不受影响

本轮未做：

1. 不修改通用 dropdown-menu 基础组件
2. 不扩散到其他模块下拉菜单

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 语言切换与主题切换菜单 1.0 视觉统一后 TypeScript 编译通过

## 2026-04-13 - fix：/personnel/leave 与 /personnel/stats 本地化收口

### 本轮目标

修复 `/personnel/leave` 与 `/personnel/stats` 中残留的中英混排问题，统一接入系统现有语言模式。

### 核心实现

1. **补齐 leave / stats 语言包字段**
   - 更新：
     - `src/locales/messages/zh-CN/orgPersonnel.ts`
     - `src/locales/messages/en-US/orgPersonnel.ts`
   - 当前行为：
     - 为 `leaveMgmt` 与 `statsPage` 补齐页眉、统计、表头、单位、详情和动作文案

2. **将 leave-display 收口为语言感知 helper**
   - 更新：`src/features/org-personnel/data/leave-display.ts`
   - 当前行为：
     - 请假状态标签支持 `zh-CN / en-US`
     - 请假类型标签支持 `zh-CN / en-US`
     - 时间格式按当前语言环境输出，而非固定 `zh-CN`

3. **leave 页面与相关组件切换为统一本地化文案**
   - 更新：
     - `src/features/org-personnel/tabs/leave-management.tsx`
     - `src/features/org-personnel/components/leave-list-toolbar.tsx`
     - `src/features/org-personnel/components/leave-detail-dialog.tsx`
     - `src/features/org-personnel/components/leave-action-dialog.tsx`
   - 当前行为：
     - 页眉、统计卡片、列表空态、按钮、详情弹窗、申请弹窗全部统一走 `t(...)`
     - 状态、类型、时间、单位不再固定中文

4. **stats 页面切换为统一本地化文案**
   - 更新：`src/features/org-personnel/tabs/personnel-statistics.tsx`
   - 当前行为：
     - 荣誉榜标题、说明、指标名称、表头、请假天数、工龄单位全部统一走 `t(...)`

### 当前实现边界

本轮已经实现：

1. `leave` 与 `stats` 在 `zh-CN` / `en-US` 下不再保留明显中英混排
2. 状态、类型、时间与单位已跟随当前语言模式切换

本轮未做：

1. 不重写 leave / stats 业务逻辑
2. 不扩散到其他 personnel tab

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. leave / stats 本地化收口后 TypeScript 编译通过

## 2026-04-13 - feat：服务中心方案A导航重构

### 本轮目标

新增与 `组织人事` 同级的 `服务中心` 侧边栏分组，并将 `请假管理` 与 `荣誉榜` 从 `组织人事` Tab 中完全迁出。

### 核心实现

1. **新增服务中心侧边栏分组与菜单文案**
   - 更新：
     - `src/locales/messages/zh-CN/sidebar.ts`
     - `src/locales/messages/en-US/sidebar.ts`
   - 当前行为：
     - 侧边栏新增 `服务中心 / Service Center`
     - 新增菜单项 `请假管理 / Leave Management`
     - 新增菜单项 `荣誉榜 / Hall of Fame`

2. **侧边栏结构迁移**
   - 更新：`src/components/layout/data/sidebar-data.ts`
   - 当前行为：
     - 新增独立分组 `sidebar.groups.serviceCenter`
     - 将 `/personnel/leave` 与 `/personnel/stats` 挂入该分组
     - `组织人事` 分组继续只承接 `/personnel` 基础入口

3. **组织人事 Tab 完全迁出这两个入口**
   - 更新：`src/features/org-personnel/tabs.ts`
   - 当前行为：
     - `组织人事` Tab 中移除 `请假管理`
     - `组织人事` Tab 中移除 `荣誉榜`
     - 采用方案A，不保留重复导航入口

4. **命令搜索同步归属调整**
   - 更新：
     - `src/locales/messages/zh-CN/commandMenu.ts`
     - `src/locales/messages/en-US/commandMenu.ts`
     - `src/components/layout/data/search-data.ts`
   - 当前行为：
     - 命令搜索中新增父级 `服务中心 / Service Center`
     - `请假管理` 与 `荣誉榜` 搜索结果已归到该新父级下

### 当前实现边界

本轮已经实现：

1. `服务中心` 成为与 `组织人事` 同级的独立侧边栏分组
2. `请假管理` 与 `荣誉榜` 已从 `组织人事` Tab 中完全迁出

本轮未做：

1. 不改 `请假管理` 与 `荣誉榜` 的业务逻辑
2. 不继续增加其他服务中心页面
3. 不重构整个人事模块路由体系

### 本轮验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. 服务中心方案A导航重构后 TypeScript 编译通过

## 2026-04-13 - impl：BOM 剩余枚举/日期控制字段接入统一 helper

### 本轮目标

将 `BOM` 中剩余仍未完整接回统一入口的枚举/日期控制字段收口到 engineering helper，重点覆盖：

1. `changeType`
2. `status`
3. `effectiveFrom`
4. `effectiveTo`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/services/bom-service.ts`

### 实现细节

1. **扩展 BOM 统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringBomChangeType(...)`
     - `normalizeEngineeringBomStatus(...)`
     - `normalizeEngineeringBomEffectiveDate(...)`
   - 同时扩展 `normalizeBOMInput(...)`，统一纳入：
     - `changeType`
     - `status`
     - `effectiveFrom`
     - `effectiveTo`

2. **收口 BOM 默认值边界**
   - `use-bom-form.ts` 中：
     - `changeType` 默认值改为统一复用 `normalizeEngineeringBomChangeType('MANUAL')`
     - `status` 默认值改为统一复用 `normalizeEngineeringBomStatus('active')`
     - 创建场景初始化值同步复用同一套 helper

3. **收口 BOM 输入边界与 change order 回填边界**
   - `bom-form-header.tsx` 中：
     - `changeType` 选择改为统一通过 BOM helper 处理
     - `status` 选择改为统一通过 BOM helper 处理
     - `effectiveFrom / effectiveTo` 输入改为统一通过 BOM 日期 helper 处理
     - 选择 change order 后回填 `changeType / effectiveFrom / effectiveTo` 时也统一通过 helper 收口

4. **收口 BOM 保存边界**
   - `bom-service.ts` 中：
     - `effectiveFrom / effectiveTo` 保存边界改为复用 `normalizeBOMInput(...)` 结果
     - 避免再直接基于原始输入做日期 trim 口径

### 当前阶段结论

这一步把 `BOM` 中的 `changeType / status / effectiveFrom / effectiveTo` 从“schema 与展示层已有规则，但表单默认值、输入边界、保存边界仍各自处理”的状态，正式接回 BOM 统一 helper。至此，BOM 这条控制字段规范化主线已经把核心控制字段、枚举字段和日期字段都收进统一入口。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：ProductProcessRouting 版本控制字段接入统一 helper

### 本轮目标

将 `ProductProcessRouting` 当前已存在但尚未形成统一入口的版本控制字段收口到 engineering helper，重点覆盖：

1. `versionControlTag`
2. `isCurrentlyActiveBlueprint`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/components/product/product-routing-view.tsx`

### 实现细节

1. **扩展 ProductProcessRouting 统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringRoutingVersionControlTag(...)`
     - `normalizeProductRoutingEntity(...)`
   - 明确将 `versionControlTag / isCurrentlyActiveBlueprint` 作为版本控制字段统一治理

2. **收口 routing draft 默认值边界**
   - `default-builders.ts` 中：
     - `createProductRoutingDraft(...)` 改为复用 `normalizeProductRoutingEntity(...)`
     - `versionControlTag` 默认值通过 `normalizeEngineeringRoutingVersionControlTag('V1.0.0.Draft')` 收口

3. **收口当前视图 state / 显示边界**
   - `product-routing-view.tsx` 中：
     - 当前蓝图 state 增加 `normalizedCurrentBlueprint`
     - 显示的 `versionControlTag` 统一来自 helper 处理后的值
     - 添加节点时也统一通过 `normalizeProductRoutingEntity(...)` 回写 state

### 当前阶段结论

这一步并没有假造 routing save service 或 adapter，而是只收口 `ProductProcessRouting` 当前真实存在的边界：draft 默认值、前端本地 state 与显示口径。现在 `versionControlTag / isCurrentlyActiveBlueprint` 已经具备 engineering 域内统一 helper，不再只散落在 schema 默认值和本地 mock state 中。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：BOM 剩余控制字段接入统一 helper

### 本轮目标

将 `BOM` 中剩余仍未完整接回统一入口的控制字段收口到 engineering helper，重点覆盖：

1. `revisionNo`
2. `siteCode`
3. `changeOrderNo`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`

### 实现细节

1. **扩展 BOM 统一 helper**
   - 在 `product-code-normalization.ts` 中扩展 `normalizeBOMInput(...)`
   - 让其统一纳入：
     - `changeOrderNo`
     - `siteCode`
     - `revisionNo`
     - `isDefaultSite`
   - 继续复用 `718` 已建立的 engineering 控制字段 helper，而不是新增 BOM 专属 codec

2. **收口 BOM 默认值与初始化值**
   - `use-bom-form.ts` 中：
     - `revisionNo` 默认值改为统一复用 `normalizeEngineeringRevisionNo('R1')`
     - 创建场景初始化值也统一复用该 helper

3. **收口 BOM 输入边界与 change order 回填边界**
   - `bom-form-header.tsx` 中：
     - `changeOrderNo / siteCode / revisionNo` 输入改为统一复用 engineering 控制字段 helper
     - change order 选中后的回填也改为统一通过 helper 收口
     - `siteCode` 输入/回填时同步维护 `isDefaultSite`

### 当前阶段结论

这一步把 `BOM` 中的 `revisionNo / siteCode / changeOrderNo` 从“局部已有规则、但仍分散在 form header、默认值与保存边界”的状态，正式接回 `normalizeBOMInput(...)` 和 engineering 控制字段 helper。现在 BOM 的控制字段已经与前面 `718 / 719` 的收口方式对齐，默认值、输入、回填与保存边界共享同一套口径。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把 AR/AP 从“仅有空页面”推进到“具备 contracts / adapters / services / hooks / queryKeys / page view 的只读结构壳层”。这样后续如果后端补齐真实 AR/AP 查询接口，只需要替换 service 层与 DTO 即可，不需要再回头重做页面和子域组织。同时页面仍然保持低耦合，没有把应收 / 应付查询逻辑塞进销售订单页或采购订单页。

## 2026-04-13 - feat：销售应收 / 采购应付低耦合骨架接入

### 本轮目标

在不进入 AR/AP 真实业务实现的前提下，先把销售应收与采购应付的模块骨架接入现有销售管理 / 采购管理 Tab 宿主，确保后续可以在独立子域内继续演进，而不是把逻辑直接塞进销售订单页或采购订单页。

### 实现细节

1. **销售管理新增应收 Tab**
   - 更新 `src/features/trading/tabs.ts`
   - 新增 `/trading/receivables` 页签入口

2. **采购管理新增应付 Tab**
   - 更新 `src/features/purchase/tabs.ts`
   - 新增 `/purchase/payables` 页签入口

3. **建立独立子域页面骨架**
   - 新增 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`
   - 新增 `src/features/trading/payables/tabs/purchase-payables-tab.tsx`
   - 页面当前只承载模块标题、说明和占位内容，不接真实 AR/AP 查询或写操作

4. **接入文件路由骨架**
   - 新增 `src/routes/_authenticated/trading/receivables.tsx`
   - 新增 `src/routes/_authenticated/trading/receivables.lazy.tsx`
   - 新增 `src/routes/_authenticated/purchase/payables.tsx`
   - 新增 `src/routes/_authenticated/purchase/payables.lazy.tsx`

5. **补齐中英文文案**
   - 更新 `src/locales/messages/zh-CN/trading.ts`
   - 更新 `src/locales/messages/en-US/trading.ts`
   - 更新 `src/locales/messages/zh-CN/purchase.ts`
   - 更新 `src/locales/messages/en-US/purchase.ts`

### 明确保留不变的边界

本轮没有扩大范围：

1. 没有接入真实 AR/AP 后端查询
2. 没有修改现有销售订单 / 采购订单业务逻辑
3. 没有把 AR/AP 暂时塞进 `finance-management`
4. 没有在前端自行计算余额、账龄、逾期或核销状态

### 验证结果

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

### 当前阶段结论

这一步已经把“销售里挂应收、采购里挂应付”的最小接入层搭起来了，同时保持了物理隔离：入口仍在业务模块中，但页面与后续逻辑的承载位置已经拆到独立子域目录。下一阶段如果继续推进，应优先补只读查询契约与列表/统计视图，而不是把 AR/AP 状态和聚合逻辑回写到订单页面内部。

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

## 2026-04-13 - impl：BOM / ECO 控制字段接入全局码规范化

### 本轮目标

将 engineering 中 BOM / ECO 的控制字段收口到统一 helper，重点覆盖：

1. `bomNo`
2. `bomVersion`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/tabs/bom-mgmt.tsx`
4. `src/features/engineering/services/bom-service.ts`

### 实现细节

1. **扩展 BOM / ECO 控制字段统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringBomNo(...)`
     - `normalizeEngineeringBomVersion(...)`
     - `normalizeBOMInput(...)`
   - 明确将 `bomNo / bomVersion` 作为 BOM/ECO 控制字段治理，而不是继续散落直接调用 lib codec

2. **收口 BOM 默认值与初始化值**
   - `use-bom-form.ts` 中：
     - 默认值里的 `bomVersion` 改为复用 `normalizeEngineeringBomVersion('V1.0')`
     - 初始化值里的 `bomVersion` 也改为统一 helper

3. **收口提交前 payload 边界**
   - `bom-mgmt.tsx` 中：
     - 提交前不再手动调用 `normalizeBomNo / normalizeBomVersion`
     - 改为统一复用 `normalizeBOMInput(...)`

4. **收口 service 保存边界**
   - `bom-service.ts` 中：
     - `sanitizeBOMInput(...)` 先统一走 `normalizeBOMInput(...)`
     - 不再只做 `bomNo / bomVersion` 的局部 trim

### 当前阶段结论

这一步把 `bomNo / bomVersion` 从“schema 有约束、form 有默认值、提交前和 service 又各自手动处理”的分散状态，收口成了 BOM/ECO 控制字段统一 helper。现在默认值、初始化值、提交前 payload、service 保存边界已经共享同一套口径，不需要继续在 `use-bom-form / bom-mgmt / bom-service` 之间重复拼接同一套规则。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：Product / ChangeOrder 变更控制字段接入全局码规范化

### 本轮目标

将 engineering 域内的变更控制字段收口到统一 helper，重点覆盖：

1. `revisionNo`
2. `siteCode`
3. `changeOrderNo`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/hooks/use-change-order-write-actions.ts`
4. `src/features/engineering/services/change-order-service.ts`
5. `src/features/engineering/tabs/change-orders.tsx`
6. `src/features/engineering/adapters/product-api-adapter.ts`

### 实现细节

1. **扩展 engineering 控制字段统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeEngineeringRevisionNo(...)`
     - `normalizeEngineeringSiteCode(...)`
     - `normalizeEngineeringChangeOrderNo(...)`
     - `normalizeChangeOrderInput(...)`
     - `normalizeChangeOrderEntity(...)`
   - 同时让 `normalizeSaveProductInput(...)` 也纳入：
     - `revisionNo`
     - `siteCode`
     - `changeOrderNo`

2. **收口 ChangeOrder draft 初始化边界**
   - `default-builders.ts` 中：
     - `createChangeOrderDraft(...)` 改为复用 `normalizeChangeOrderEntity(...)`
     - `buildChangeOrderDraft(...)` 改为复用 engineering 控制字段 helper

3. **收口 ChangeOrder 输入与保存边界**
   - `change-orders.tsx` 中：
     - `changeOrderNo / siteCode / revisionNo` 输入改为复用 engineering 控制字段 helper
     - 保存前 payload 组装改为复用 `normalizeChangeOrderInput(...)`

4. **去重 write actions 重复规范化**
   - `use-change-order-write-actions.ts` 不再重复做 `changeOrderNo / siteCode / revisionNo` 规范化
   - 直接交给 service / helper 处理

5. **收口 ChangeOrder service 保存边界**
   - `change-order-service.ts` 删除本地散落 normalize 实现
   - 改为直接复用 `normalizeChangeOrderInput(...)`

6. **让 Product 侧复用同一套控制字段 helper**
   - `product-api-adapter.ts` 中：
     - Product 的 `revisionNo / siteCode / changeOrderNo` DTO 入出边界
     - 改为统一复用 engineering 控制字段 helper

### 当前阶段结论

这一步把 `revisionNo / siteCode / changeOrderNo` 从“lib codec 可用，但 tab、draft、write actions、service、adapter 各自散落调用”收口成了 engineering 域内统一控制字段 helper。现在 `ChangeOrder` 与 `Product` 已经共享同一套控制字段边界，不需要继续在不同层次重复粘贴相同的 normalize 逻辑。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-13 - impl：717 Product 主数据链路接入全局码规范化

### 本轮目标

将 `Product` 主数据链路中的三类字段按语义分型收口到统一 helper，重点覆盖：

1. `Product.sku`
2. `Product.modelCode`
3. `Product.templateKey`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/utils/product-form-utils.ts`
3. `src/features/engineering/hooks/use-product-form-derive.ts`
4. `src/features/engineering/components/product/product-basic-info.tsx`
5. `src/features/engineering/adapters/product-api-adapter.ts`
6. `src/features/engineering/services/product-maintenance-service.ts`

### 实现细节

1. **扩展 Product 主数据统一 helper**
   - 在 `product-code-normalization.ts` 中新增：
     - `normalizeProductSkuValue(...)`
     - `normalizeProductModelCodeValue(...)`
     - `normalizeProductTemplateKeyValue(...)`
     - `deriveNormalizedProductSku(...)`
     - `normalizeSaveProductInput(...)`
   - 明确区分：
     - 业务编码：`sku`
     - 固定数字码：`modelCode`
     - 稳定引用键：`templateKey`

2. **收口 Product 输入与展示边界**
   - `product-basic-info.tsx` 中：
     - `modelCode` 输入改为复用 `normalizeProductModelCodeValue(...)`
     - `sku` 展示改为复用 `normalizeProductSkuValue(...)`

3. **收口 SKU 派生链路**
   - `product-form-utils.ts` 中：
     - 默认值里的 `modelCode / templateKey` 改为统一 helper
     - `deriveSku(...)` 改为复用 `deriveNormalizedProductSku(...)`
     - `ensureSkuUnique(...)` 改为基于统一规范后的 SKU 比较
   - `use-product-form-derive.ts` 中：
     - authority engine 回填的 `modelCode` 改为统一 helper
     - `skuPreview` 改为统一 helper + 派生 helper

4. **收口 DTO 边界**
   - `product-api-adapter.ts` 中：
     - API -> contract 的 `sku / modelCode / templateKey` 改为复用 Product helper
     - contract -> API DTO 前先走 `normalizeSaveProductInput(...)`

5. **收口保存边界**
   - `product-maintenance-service.ts` 中：
     - `createProduct(...)`
     - `patchProduct(...)`
     - `saveProduct(...)`
     - `bulkSyncProducts(...)`
   - 全部在 service 边界先统一走 `normalizeSaveProductInput(...)`

### 当前阶段结论

这一步把 `Product` 主数据链路的 `sku / modelCode / templateKey` 从“输入层、派生层、adapter、service 各自做一点”收口成了统一的领域 helper。现在这三类字段已经不再依赖散落的通用 codec 调用，而是通过 `engineering/product-code-normalization.ts` 形成清晰一致的 Product 主数据边界。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：714 生产共享资源模块接入全局码规范化

### 本轮目标

将 `production-shared` 中已经存在但分散的机器码处理逻辑收口为领域内部统一 helper，重点覆盖：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

### 本轮修改文件

1. `src/features/production-shared/utils/production-code-normalization.ts`
2. `src/features/production-shared/services/production-lines-service.ts`
3. `src/features/production-shared/services/production-processes-service.ts`
4. `src/features/production-shared/adapters/production-resource-api-adapter.ts`
5. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
6. `src/features/production-shared/tabs/line-mgmt/components/line-dialog.tsx`

### 实现细节

1. **新增 production-shared 统一 helper**
   - 新增 `production-code-normalization.ts`
   - 提供：
     - `normalizeProductionLineCode(...)`
     - `normalizeProductionProcessStepCode(...)`
     - `normalizeProductionLineEntity(...)`
     - `normalizeProductionProcessStepEntity(...)`

2. **收口 service 保存边界**
   - `production-lines-service.ts` 改为复用 `normalizeProductionLineEntity(...)`
   - `production-processes-service.ts` 改为复用 `normalizeProductionProcessStepEntity(...)`

3. **收口 adapter DTO 边界**
   - `production-resource-api-adapter.ts` 不再直接调用通用 `normalizeMachineCode`
   - line / process 的 DTO 入出边界统一复用 production-shared helper

4. **收口 process 输入边界**
   - `process-library-panel.tsx` 的：
     - 编辑态回填
     - 输入时规范化
     - 提交前组装
   - 全部统一复用 `normalizeProductionProcessStepCode(...)` / `normalizeProductionProcessStepEntity(...)`

5. **收口 line 输入边界**
   - `line-dialog.tsx` 的：
     - 编辑态回填
     - 新建态初始值
     - 自动生成 code
   - 统一复用 `normalizeProductionLineCode(...)` / `normalizeProductionLineEntity(...)`
   - 同时修复该文件对 `useDeltaTracker(...).data` 的直接修改问题，改为通过本地 `setForm(...)` 封装更新

### 当前阶段结论

这一步把 `production-shared` 里原本分散在 service、adapter、process form、line dialog 的机器码处理逻辑收成了模块内部统一入口。这样 `ProductionLine.code` 与 `ProductionProcessStep.code` 的输入边界、保存边界、DTO 边界已经对齐到同一套 production-shared helper，不需要继续在各文件散落补 `normalizeMachineCode(...)`。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：715 工程属性值模块接入全局码规范化

### 本轮目标

将工程属性值模块现有的 `product-attribute-machine-value` 规则从“多处散落重复调用”收口为更清晰的领域边界，重点覆盖：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

### 本轮修改文件

1. `src/features/engineering/utils/product-attribute-machine-value.ts`
2. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
3. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
4. `src/features/engineering/services/product-attribute-category-service.ts`
5. `src/features/engineering/services/product-attribute-option-service.ts`
6. `src/features/engineering/hooks/use-product-attribute-write-actions.ts`
7. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

### 实现细节

1. **扩展属性值专用 helper**
   - 在 `product-attribute-machine-value.ts` 中新增：
     - `normalizeProductAttributeCategoryInputKey(...)`
     - `normalizeProductAttributeOptionInputValue(...)`
     - `buildProductAttributeCategorySaveInput(...)`
     - `buildProductAttributeOptionSaveInput(...)`
     - `findProductAttributeOptionConflictInCategory(...)`
   - 明确把“输入态规范化”“保存态规范化”“按分类冲突判断”放到统一模块中

2. **收口 dialog 输入边界**
   - category dialog 改为复用 `normalizeProductAttributeCategoryInputKey(...)`
   - option dialog 改为复用 `normalizeProductAttributeOptionInputValue(...)`
   - 不再在组件里直接散落调用基础 normalize 函数

3. **收口 service 保存边界**
   - category service 改为复用 `buildProductAttributeCategorySaveInput(...)`
   - option service 改为复用 `buildProductAttributeOptionSaveInput(...)`

4. **去重 write actions 重复规范化**
   - `use-product-attribute-write-actions.ts` 不再重复对 payload 做机器值规范化
   - 直接把原始 payload 交给 service 的统一 helper 处理

5. **收口 tab 层散落逻辑**
   - `product-attributes-mgmt.tsx` 中：
     - 新建 category / option 时复用输入态 helper
     - 保存前 payload 组装改为复用保存态 helper
     - option 冲突判断改为复用 `findProductAttributeOptionConflictInCategory(...)`
   - 同时顺手修正了 `categories/options` 的稳定引用，以及避免在 effect 中同步 `setState` 的问题

### 当前阶段结论

这一步并没有替换掉工程属性值模块现有的小写机器值规则，而是把它正式提升为模块内部的单一权威入口。现在属性值链路的输入态、保存态、冲突判断与页面 payload 组装已经基本对齐，避免继续在 dialog、tab、write actions、service 之间重复散落同一套规则。

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。

## 2026-04-12 - impl：716 第二批遗漏边界补齐

### 本轮目标

补齐 `716` 第一批之后仍残留的 template 侧遗漏边界：

1. 新建草稿入口
2. sync 保存边界
3. `template-mgmt.tsx` 的稳定引用小缺口

### 本轮修改文件

1. `src/features/engineering/utils/default-builders.ts`
2. `src/features/engineering/services/product-template-service.ts`
3. `src/features/engineering/tabs/template-mgmt.tsx`

### 实现细节

1. **补齐 template 草稿入口**
   - `createProductTemplateDraft()` 改为复用 `normalizeProductTemplateEntity(...)`
   - 这样新建态初始值也统一经过 engineering 内部 helper

2. **补齐 template sync 保存边界**
   - `productTemplateService.sync(...)` 发送前改为先执行：
     - `templates.map(normalizeProductTemplateInput)`
   - 避免批量同步链路绕过 `code / componentKey` 规范化

3. **收口稳定引用小缺口**
   - `template-mgmt.tsx` 中将 `templatesQuery.data ?? []` 改为 `useMemo(...)`
   - 避免继续制造 hook 依赖不稳定 warning

### 当前阶段结论

`716` 第二批没有继续扩大范围，而是把 template 这条链路最后几个遗漏口补完整：从草稿创建，到页面编辑，再到 sync 保存，已经都能经过 engineering 内部统一 helper。这样 `716` 这条主线就从“第一批样板收口”推进到了更完整的边界闭环。

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

## 2026-04-12 - impl：716 工程 template / product type 模块接入全局码规范化（第一批）

### 本轮目标

恢复此前已规划的 `716` 主线，先把工程主数据里更核心的标识字段边界收口：

1. `ProductTemplate.code`
2. `ProductTemplate.componentKey`
3. `ProductType.code`

### 本轮修改文件

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/tabs/template-mgmt.tsx`
3. `src/features/engineering/hooks/use-product-template-write-actions.ts`
4. `src/features/engineering/services/product-template-service.ts`
5. `src/features/engineering/adapters/product-template-api-adapter.ts`
6. `src/features/engineering/components/product-type-action-dialog.tsx`
7. `src/features/engineering/services/product-type-service.ts`
8. `src/features/engineering/adapters/product-type-api-adapter.ts`

### 实现细节

1. **新增 engineering 内部统一规范化 helper**
   - 新增 `product-code-normalization.ts`
   - 提供：
     - `normalizeEngineeringTemplateCode(...)`
     - `normalizeEngineeringTemplateComponentKey(...)`
     - `normalizeProductTemplateInput(...)`
     - `normalizeProductTemplateEntity(...)`
     - `normalizeEngineeringProductTypeCode(...)`
     - `normalizeProductTypeInput(...)`
     - `normalizeProductTypeEntity(...)`

2. **收口 template 输入边界与保存边界**
   - `template-mgmt.tsx` 不再直接散落调用 `normalizeMachineCode` / `normalizeComponentKey`
   - 改为复用统一 helper 处理：
     - 编辑态回填
     - 输入时规范化
     - 提交前规范化
   - `use-product-template-write-actions.ts`、`product-template-service.ts`、`product-template-api-adapter.ts` 统一复用同一 helper，避免继续重复拼装规则

3. **收口 product type 输入边界与保存边界**
   - `product-type-action-dialog.tsx` 改为复用统一 helper 处理：
     - 编辑态回填
     - 自动生成 code
     - 手输 code
     - 提交前规范化
   - `product-type-service.ts`、`product-type-api-adapter.ts` 也统一改为复用同一 helper

### 当前阶段结论

这一步没有去重写整条工程主数据链路，而是先把 `template / product type` 中原本散落在页面、dialog、service、adapter 里的码规范化逻辑抽成了 engineering 内部统一 helper。这样做的收益是：

1. 工程主数据核心标识字段开始具备单一规范入口
2. 输入边界与保存边界不再各自拼一套局部规则
3. 后续若继续推进 `715` / `714`，可以沿用同样的“领域内 helper + 边界接入”模式

### 测试与验证

已执行：

1. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 编译校验通过。
