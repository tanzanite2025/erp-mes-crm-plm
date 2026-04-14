### 1. plan：production-shared 机器码字段统一收口

### 1. plan：应收应付记录级证据挂载

日期：2026-04-13  
状态：已批准，待执行

#### 1.1 当前背景

当前应收/应付详情已经具备台账详情、收付款记录与核销分摊能力，也已有图片上传基础设施和订单级 evidence 组件。但现状仍无法表达“这一次收了多少 / 付了多少，对应的是哪几张截图”，因此无法形成记录级审计证据链。

#### 1.2 当前问题本质

当前真正缺失的不是一个页面附件区，而是**记录级证据挂载语义**：

1. `ReceiptRecord / PaymentRecord` 目前没有独立 evidence 绑定关系
2. 订单级 `evidences` 只能表达订单背景凭据，不能替代财务记录证据
3. 详情页当前只能看记录与核销，不能按记录联动展示截图
4. 若把这项需求继续堆进现有 dialog 或直接塞进记录表 JSON，会导致上传、业务、展示三层继续耦合

因此本轮目标不是“页面底部加附件”，而是**给收付款记录新增独立证据挂载能力，并在详情里按记录联动展示**。

#### 1.3 本轮目标

本轮按最小可运行范围实施：

1. 支持收款记录级图片证据挂载
2. 支持付款记录级图片证据挂载
3. 应收/应付详情支持“选中记录 -> 展示该记录证据”
4. 上传基础设施与业务挂载关系分离
5. 不破坏现有台账、记录、核销主链

#### 1.4 推荐实施策略

##### 1.4.1 后端新增记录级 evidence 模型与挂载关系

新增独立 settlement evidence 模型，而不是把 evidences JSON 直接塞进：

1. `receipt_records`
2. `payment_records`

推荐拆成：

1. evidence 资源对象（文件元数据）
2. record evidence 挂载关系（记录与资源绑定）

这样上传层与业务层可以保持解耦，后续扩到 PDF / Excel 也不会推倒重来。

##### 1.4.2 后端新增记录证据增删查接口

本轮优先新增：

1. 收款记录 evidence 查询 / 创建 / 删除接口
2. 付款记录 evidence 查询 / 创建 / 删除接口

优先按 receipt / payment 分开路由，避免本轮继续扩大到 settlement record 抽象统一。

##### 1.4.3 前端新增 settlement evidences 独立目录

前端不把证据逻辑继续堆进现有 500+ 行详情 dialog，而是新增独立目录承载：

1. contracts
2. services
3. hooks
4. components

详情页仅负责组合：

1. 记录列表
2. 当前选中记录
3. 该记录证据展示与上传

##### 1.4.4 订单 evidence 与记录 evidence 严格分层

本轮明确不复用订单级 `evidences` 语义承载财务记录证据：

1. 订单 evidence 继续表达订单背景凭据
2. 记录 evidence 只表达某次收款 / 付款的直接证据

#### 1.5 预计涉及文件

##### 后端

1. `server/models/settlement_evidence.go`
2. `server/services/settlement_evidence_dto.go`
3. `server/services/settlement_evidence_mapper.go`
4. `server/services/settlement_evidence_service.go`
5. `server/handlers/settlement_evidence_handler.go`
6. `server/routes/routes_settlement_evidence.go`
7. `server/routes/routes.go`
8. 必要时联动 `server/services/ar_ap_dto.go` 与 AR/AP 查询链

##### 前端

1. `src/features/trading/settlement-evidences/contracts/settlement-evidence-api-dto.ts`
2. `src/features/trading/settlement-evidences/services/settlement-evidence-service.ts`
3. `src/features/trading/settlement-evidences/hooks/use-settlement-record-evidences.ts`
4. `src/features/trading/settlement-evidences/components/settlement-record-evidence-panel.tsx`
5. `src/features/trading/settlement-evidences/components/settlement-evidence-upload.tsx`
6. `src/features/trading/settlement-evidences/components/settlement-evidence-gallery.tsx`
7. `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
8. `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`
9. 必要时拆出应收/应付的 records table / evidence section 子组件

#### 1.6 风险与破坏性评估

本轮主要风险点：

1. 若混用订单级 evidence 与记录级 evidence，会导致财务证据语义混乱
2. 若把上传、挂载、展示逻辑继续堆进现有 dialog，后续维护成本会继续恶化
3. 若本轮直接扩到 PDF / Excel / OCR / 阶段款语义，任务范围会失控
4. 若后端直接修改现有记录主表结构而不是新增挂载层，未来扩展会受限

因此本轮必须坚持：

1. 资源上传层与业务挂载层分离
2. 先做图片证据 MVP
3. 不破坏现有应收应付主链
4. 优先通过独立文件目录解耦职责

#### 1.7 验证策略

本轮验证至少覆盖：

1. 收款记录可上传并查询图片证据
2. 付款记录可上传并查询图片证据
3. 应收详情可按记录联动展示对应证据
4. 应付详情可按记录联动展示对应证据
5. 无证据记录可正常显示空态，不崩溃
6. `pnpm exec tsc --noEmit` 通过
7. 对应 Go 定向测试通过

#### 1.8 非目标边界

本轮不做：

1. 不扩到 PDF / Excel / 表格类附件
2. 不做 OCR 或金额识别
3. 不引入阶段款 / 里程碑语义扩展
4. 不重构现有订单 evidence 体系
5. 不重写应收应付整体页面结构

#### 1.9 当前阶段结论

本轮最安全、最方便、最解耦的路线，是把“收付款记录证据挂载”独立成一层，而不是把附件语义继续塞进订单或详情页面局部状态中。这样既能尽快拿到“按记录挂截图”的最小能力，也能为后续扩展文档类附件和更完整的财务审计链保留清晰边界。

#### 1.10 视觉收口补充（待确认）

当前记录级 evidence 功能链已经跑通，但新增 UI 仍只能算“基本贴住当前详情页体系”，还不能称为与系统视觉**完全对齐**。因此需要单独追加一轮视觉收口，而不是继续把它归为功能实现的一部分。

本轮补充仅做前端视觉收口，不扩业务能力：

1. 对齐记录 evidence panel 的标题层级
2. 对齐空态容器与文案层级
3. 对齐 `已挂凭证 / 缺少凭证` badge 的系统语义表达
4. 对齐 upload 区与 gallery 卡片的圆角、边框、留白、按钮层级
5. 对齐应收 / 应付详情中新增区块与既有区块的节奏一致性

##### 1.10.1 涉及文件

1. `src/features/trading/settlement-evidences/components/settlement-record-evidence-panel.tsx`
2. `src/features/trading/settlement-evidences/components/settlement-evidence-upload.tsx`
3. `src/features/trading/settlement-evidences/components/settlement-evidence-gallery.tsx`
4. `src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx`
5. `src/features/trading/payables/components/purchase-payable-detail-dialog.tsx`

##### 1.10.2 非目标边界

本轮不做：

1. 不新增后端接口
2. 不改记录 evidence 业务语义
3. 不顺手重构整个 AR/AP 详情结构
4. 不扩展新的附件能力

##### 1.10.3 验证策略

本轮至少验证：

1. 新增 evidence 区与现有详情弹窗字体层级一致
2. 标题、空态、badge、上传区和 gallery 视觉语言一致
3. `pnpm exec tsc --noEmit` 通过

##### 1.10.4 当前判断

只有在这一轮完成后，才能把“记录级证据区”的 UI 评价为与系统视觉完全对齐。当前状态更准确地说仍是“功能完成后的保守对齐”。

### 1. plan：新建型号模板链路加固

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

上一轮已经把“编辑产品规格”场景的模板绑定 authority 收口到了后端读取链，前端编辑弹窗现在优先消费后端返回的 resolved template 结果。但“新建型号”场景当前仍主要依赖前端根据 `typeId -> parent chain -> template` 做本地解析，因此创建态与编辑态仍不是同一套 authority。

#### 1.2 当前问题本质

如果创建态继续保留前端局部模板解析 authority，会持续存在以下风险：

1. 前端 options 中的分类父链不完整时，创建态会误判无模板
2. `templateId` 指向失效模板时，创建态只能在前端局部兜底
3. 创建态与编辑态可能对同一分类得出不同模板结果
4. 即便编辑态已经稳住，创建态仍可能再次出现同类 `Template Binding Broken`

因此当前真正要解决的不是“再给创建态加一个重试”，而是**让创建态也消费后端 authoritative template resolution**。

#### 1.3 本轮目标

本轮目标是让创建态与编辑态收敛到同一模板 authority：

1. 创建态选择分类时可拿到后端 resolved template 结果
2. 创建态与编辑态对同一分类得到一致模板结论
3. 当前端本地上下文陈旧时，也不会因为局部父链推断再次误判
4. 模板真实缺失时仍能明确展示错误

#### 1.4 推荐实施策略

##### 1.4.1 为创建态提供后端模板解析入口

优先推荐两种实现路径中的一种：

1. 新增按 `typeId` 解析模板的后端 endpoint
2. 或扩展现有产品类型 options 响应，直接附带每个分类可解析到的 resolved template 结果

返回结果建议与编辑态保持一致，包括：

1. `resolvedTemplateId`
2. `resolvedTemplateKey`
3. `templateResolutionSource`
4. `templateResolutionError`

##### 1.4.2 创建态前端改为优先消费后端 authority

创建态在用户选择分类后，应优先消费后端返回的 resolved template 结果，而不是立即使用本地 `productTypes` 递归父链推断。

本地推断仅保留为最小兜底，避免成为主 authority。

##### 1.4.3 创建态 / 编辑态对齐同一解析语义

无论是读取已有产品还是新建产品选择分类，都应尽量使用同一套：

1. 模板存在性判断
2. 模板有效性判断
3. 失败原因枚举
4. 前端错误态展示逻辑

#### 1.5 预计涉及文件

预计优先涉及：

1. 产品类型 / 模板相关后端 service、handler、route、DTO
2. `src/features/engineering/components/product-action-dialog.tsx`
3. `src/features/engineering/utils/product-create-template-resolution.ts`
4. `src/features/engineering/services/product-type-service.ts`
5. 必要时联动前端 contract / adapter

#### 1.6 风险与破坏性评估

本轮风险主要在于创建态请求节奏与接口契约：

1. 若创建态每次选分类都即时请求后端，需控制请求频率与错误态表现
2. 若扩展产品类型 options 响应，需要同步前端 adapter，避免类型漂移
3. 若创建态与编辑态使用的失败原因语义仍不统一，前端展示会再次分叉

因此本轮必须坚持：

1. 创建态优先消费后端 authority
2. 保持失败原因 machine-readable
3. 不顺手重构整个模板系统

#### 1.7 验证策略

本轮验证至少覆盖：

1. 新建型号时选择分类可稳定解析模板
2. 同一分类在创建态 / 编辑态得到一致模板结果
3. 无效模板绑定时，创建态给出明确错误原因
4. `pnpm exec tsc --noEmit` 通过
5. 若涉及后端新增解析入口，则执行对应 Go 定向测试

#### 1.8 非目标边界

本轮不做：

1. 不重构整个产品模板系统
2. 不改产品规格 UI 结构
3. 不扩到 BOM 模块
4. 不处理无关样式问题

#### 1.9 当前阶段结论

如果要避免“模板绑定问题只是从编辑态转移到创建态”，那么新建型号链路也必须跟进 authority 收口。最稳的做法是为创建态提供后端 authoritative template resolution，并让创建态与编辑态消费同一套 resolved template 语义。

### 1. plan：产品模板绑定根因级稳住

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

上一轮已经为“编辑产品规格”的 `Template Binding Broken` 增加了前端 fresh metadata fallback，可以降低由于旧分类树或旧模板缓存导致的误判。但当前目标已经升级为“从根因稳住”，这意味着不能继续依赖前端局部重试作为主要保障。

#### 1.2 当前问题本质

当前模板绑定 authority 仍然分散：

1. 后端在产品读取链中会按产品分类父链派生 `TemplateKey`
2. 前端在产品编辑弹窗中仍会再次根据 `typeId / parentId / templateId / templateKey` 本地推断具体模板
3. 当两边使用的上下文、缓存或数据时点不一致时，就可能出现前端误判或后端派生缺失

因此当前真正的问题不是“提示文案不好”，而是**同一模板绑定语义被前后端重复推断，authority 不集中**。

#### 1.3 本轮目标

本轮目标是把模板绑定 authority 尽量收回后端，并在进入前端前就得到明确结果：

1. 后端对产品分类父链模板绑定做一致性校验
2. 后端在产品读取链返回显式 resolved template 信息
3. 前端优先消费后端给出的解析结果，而不是自己再次做完整判定
4. 保留前端错误态展示，但错误来源应尽量来自后端 authoritative result

#### 1.4 推荐实施策略

##### 1.4.1 后端统一模板解析 authority

优先把以下语义收口到后端：

1. 产品分类父链是否能解析到有效模板
2. 解析到的模板是否真实存在
3. 该模板对应的 `componentKey / templateKey / templateId` 是什么
4. 若解析失败，失败原因属于：
   - 分类链缺失
   - 父链循环
   - 模板不存在
   - 模板不可用

##### 1.4.2 后端返回显式 resolved template 字段

建议在产品读取 DTO 中增加显式字段，例如：

1. `resolvedTemplateId`
2. `resolvedTemplateKey`
3. `templateResolutionSource`
4. `templateResolutionError`

这样前端在编辑态可优先直接消费后端 authority，而不是再次完整重建解析过程。

##### 1.4.3 前端降级为展示与兜底

前端仍可保留最小 fallback，但角色应调整为：

1. 优先使用后端 resolved template 结果
2. 当后端明确返回错误时，展示明确错误态
3. 仅在必要时执行最小本地兜底，不再承担主 authority

#### 1.5 预计涉及文件

预计优先涉及：

1. `server/services/product_edit_read_service.go`
2. `server/services/product_master_service.go`
3. `server/handlers/product_api_dto.go`
4. `server/handlers/product_mapper.go`
5. 产品类型 / 产品模板相关 service、handler、DTO
6. `src/features/engineering/contracts/product-api-dto.ts`
7. `src/features/engineering/adapters/product-api-adapter.ts`
8. `src/features/engineering/components/product-action-dialog.tsx`

#### 1.6 风险与破坏性评估

本轮风险主要在于模板读取 contract 变化：

1. 若后端新增字段但前端未同步 adapter，容易出现类型漂移
2. 若后端把旧的 `templateKey` 语义直接替换掉，可能影响现有调用点
3. 若没有明确区分“解析失败”和“暂时无模板”，前端仍可能误处理

因此本轮必须坚持：

1. 新增显式 resolved 字段优先，避免直接破坏旧字段兼容
2. 通过最小范围改动收口 authority，不顺手重构整套模板系统
3. 为失败原因提供可区分的 machine-readable 信息

#### 1.7 验证策略

本轮验证至少覆盖：

1. 编辑态产品返回的 resolved template 结果与后端分类链一致
2. 创建态与编辑态对同一分类解析结果一致
3. 无效分类模板绑定时，后端返回明确错误或明确失败原因
4. 前端在后端已给出 resolved template 时，不再因本地旧上下文误判
5. `pnpm exec tsc --noEmit` 通过
6. 对应 Go 定向测试 / 读取链校验通过

#### 1.8 非目标边界

本轮不做：

1. 不重构整个产品模板系统
2. 不改产品规格 UI 结构
3. 不扩到 BOM 模块
4. 不处理无关样式问题

#### 1.9 当前阶段结论

如果要真正从根因稳住模板绑定问题，关键不是继续堆前端 fallback，而是把模板解析 authority 收口到后端，并把显式 resolved result 提供给前端消费。只有这样，才能系统性降低前后端重复推断、缓存不一致和数据漂移带来的误判风险。

### 1. plan：编辑产品规格时 `Template Binding Broken`

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户在“编辑产品规格”弹窗中选择产品分类 `山地车圈` 后，页面底部出现 `Template Binding Broken` 错误，提示当前产品分类在其 category chain 中没有可解析模板绑定，导致规格模板区域无法正常解析，进一步阻断保存。

#### 1.2 当前排查结论

##### 1.2.1 当前前端报错来源明确

当前报错来自：

1. `src/features/engineering/components/product-action-dialog.tsx`

该弹窗在编辑态会执行：

1. `getEffectiveTemplate(...)`
2. 优先根据 `typeId -> parent chain -> templateId` 解析模板
3. 若类型链没有解析到模板，再尝试 `productTemplateKey -> concrete template`
4. 若两条链都失败，则设置 `templateResolveError` 并显示 `Template Binding Broken`

##### 1.2.2 当前可疑断点

当前高概率问题集中在以下三类之一：

1. `山地车圈` 所在产品分类链没有可用 `templateId`
2. 分类链虽然解析出了 `templateId`，但模板列表里没有对应模板
3. 编辑态 `currentRow.templateKey` 无法映射到具体模板，导致 fallback 失效

##### 1.2.3 当前前后端存在一条共同的分类父链解析逻辑

当前后端在：

1. `server/services/product_edit_read_service.go`

中通过 `resolveTemplateIDFromProductTypeChain(...)` 沿产品分类父链寻找 `template_id`，再将其映射为 `TemplateKey` 返回给编辑态读取链。

这说明当前问题并不只是一个单纯的前端展示异常，而很可能涉及：

1. 分类树绑定缺失
2. 编辑态回读 `TemplateKey` 为空
3. 前后端模板解析链路存在不一致

#### 1.3 推荐实施策略

本轮建议只做“模板绑定解析链路修复”，不扩展为模板系统重构：

1. 优先比对前端 `resolveTemplateFromTypeChain(...)` 与后端 `resolveTemplateIDFromProductTypeChain(...)` 的行为是否一致
2. 确认 `山地车圈` 当前分类节点及其父链上是否真实存在 `templateId`
3. 若编辑态 `TemplateKey` 回读为空或无法映射，应修复 fallback 逻辑或回读链路
4. 保持弹窗在模板缺失时继续给出明确错误态，而不是静默失败

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/product-action-dialog.tsx`
2. `src/features/engineering/components/specs/index.ts`
3. `src/features/engineering/utils/product-create-template-resolution.ts`
4. `server/services/product_edit_read_service.go`
5. 必要时联动模板相关 service / handler / route

#### 1.5 风险与破坏性评估

本轮风险主要在于模板解析 authority 不能被误改：

1. 若只修前端提示，不修根因，保存前仍会被阻断
2. 若只改 fallback，不核对分类链绑定，可能掩盖后端回读缺失
3. 若顺手改整个模板系统，会扩大任务范围与回归风险

因此本轮必须坚持：

1. 优先修绑定链路根因
2. 保持现有错误态可见
3. 不做产品模板系统大改

#### 1.6 验证策略

本轮验证至少覆盖：

1. 编辑 `山地车圈` 产品规格时可正确解析模板
2. 创建/编辑产品规格的模板切换不回退
3. 如模板真实缺失，错误态仍然明确可见
4. `pnpm exec tsc --noEmit` 通过
5. 若涉及后端修复，则执行对应 Go 定向测试或最小验证命令

#### 1.7 非目标边界

本轮不做：

1. 不改 BOM 模块
2. 不改产品规格 UI 结构
3. 不处理无关样式问题

#### 1.8 当前阶段结论

当前“编辑产品规格”中的 `Template Binding Broken` 更像是产品分类模板绑定链路断裂，而不是单纯的前端显示问题。下一步应优先确认 `山地车圈` 分类链、模板列表与编辑态 `TemplateKey` 回读之间的实际不一致点，再用最小改动修正模板解析根因。

### 1. plan：722 BOM 枚举/日期控制字段统一收口

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前 BOM 相关的 `changeType / status / effectiveFrom / effectiveTo` 已经不是“完全无规则”状态：底层 codec、保存前净化、展示层 normalize 都已经存在。但用户要求的是“统一收口”，而不是长期维持多层分散兜底。

#### 1.2 当前排查结论

##### 1.2.1 当前真实问题不是缺少 normalize，而是 authority 分散

当前已确认这组字段的规则分布在多层：

1. **底层 codec**
   - `src/lib/codecs/code-normalization.ts`
   - 已提供 `normalizeBomChangeType / normalizeBomStatus / normalizeBomEffectiveDate`

2. **工程层净化 helper**
   - `src/features/engineering/utils/product-code-normalization.ts`
   - 已提供 `normalizeEngineeringBomChangeType / normalizeEngineeringBomStatus / normalizeEngineeringBomEffectiveDate / normalizeBOMInput`

3. **保存层**
   - `src/features/engineering/services/bom-service.ts`
   - 保存前 `sanitizeBOMInput(...)` 会走 `normalizeBOMInput(...)`

4. **展示层**
   - `src/features/engineering/components/bom-mgmt/bom-table.tsx`
   - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
   - 已对 changeType/status/effectiveFrom 做展示 normalize

5. **表单输入层**
   - `src/features/engineering/components/bom-editor/bom-form-header.tsx`
   - 仍在组件内部通过多个 if/else 分散处理这组字段

因此当前问题不在“有没有规则”，而在“规则 authority 没有收成单一入口”。

##### 1.2.2 当前主要风险点

如果继续维持这种结构，会有三个风险：

1. 初始化值、输入时状态、保存前净化后的状态不一定长期一致
2. 组件层局部补丁越多，越难判断哪一层才是 authority
3. 后续如果扩 BOM 表单字段，会继续复制这种分散收口模式

#### 1.3 推荐实施策略

本轮建议只做“表单 authority 收口”，而不是重写整条 BOM 链：

1. 优先收口 BOM 表单初始化 / 输入链
2. 让 `changeType / status / effectiveFrom / effectiveTo` 在表单进入可编辑态时就尽量成为规范值
3. 保留 `normalizeBOMInput(...)` 作为保存前最终防线
4. 保留 table / preview 展示层 normalize 作为展示兜底

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/hooks/use-bom-form-initialization.ts`
4. `src/features/engineering/utils/product-code-normalization.ts`
5. `src/features/engineering/services/bom-service.ts`

#### 1.5 风险与破坏性评估

本轮风险主要不是业务规则变化，而是 authority 调整：

1. 若把组件层收口改得过猛，可能影响 BOM 表单当前交互
2. 若误删保存层 normalize，会削弱最终防线
3. 若顺手改展示层或后端模型，会扩大任务范围

因此本轮必须坚持：

1. 优先收口表单 authority
2. 保存层 normalize 保留
3. 展示层 normalize 保留

#### 1.6 验证策略

本轮验证至少覆盖：

1. 新建 BOM 弹窗中四个字段输入/切换后保持规范值
2. 编辑 BOM 弹窗回填后四个字段保持规范值
3. 保存 BOM 时 payload 仍经过统一净化
4. table / preview 展示不回退
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改后端 BOM 模型
2. 不扩散到无关 engineering 模块
3. 不顺手重构 BOM UI 结构

#### 1.8 当前阶段结论

722 当前的核心问题不是规则缺失，而是 `changeType / status / effectiveFrom / effectiveTo` 的 authority 仍然分散在初始化、输入、保存、展示四层。下一步最合理的实施方式，是优先把 BOM 表单初始化/输入链收口为更清晰的 authority，再保留保存层与展示层作为稳定兜底。

### 1. plan：`use-bom-form.ts` 最小职责拆分

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在 `use-bom-data.ts` 已完成最小职责拆分后，BOM 模块中第二个职责堆叠明显的点已经转移到 `src/features/engineering/hooks/use-bom-form.ts`：该文件同时承担表单初始化、选项读取、缺失分支处理、编辑态/创建态 reset 映射、change order 合法性清洗与 delta 跟踪。

这意味着当前 BOM 表单 hook 既是“表单状态容器”，又是“options 读取器”，还是“初始化映射器”，继续堆叠下去会提高后续误改风险。

#### 1.2 当前排查结论

##### 1.2.1 当前最合理的下一阶段拆分点就是 `use-bom-form.ts`

当前 BOM 前端链路中：

1. `use-bom-data.ts` 已经被收口为薄 orchestration hook
2. `use-bom-write-actions.ts` 职责清晰
3. `use-bom-read-data.ts` / `use-bom-import-export.ts` 已独立

因此下一阶段若继续做最小拆分，最值得处理的就是 `use-bom-form.ts`。

##### 1.2.2 当前建议拆分后的结构

本轮建议拆成三层：

1. **`use-bom-form-options.ts`**
   - 负责 products / materials / changeOrders 读取
   - 负责缺失分支处理与相关日志

2. **`use-bom-form-initialization.ts`**
   - 负责创建态 / 编辑态初始值
   - 负责表单 reset 映射
   - 负责 `changeOrderId` 合法性清洗

3. **`use-bom-form.ts`**
   - 保留 `useForm`
   - 保留 `useFieldArray`
   - 保留 `useDeltaTracker`
   - 组合 options 与 initialization 两层

#### 1.3 推荐实施策略

本轮建议只做前端 BOM form hook 层的最小拆分：

1. 新增 `use-bom-form-options.ts`
2. 新增 `use-bom-form-initialization.ts`
3. 将 `use-bom-form.ts` 收口成表单 orchestration hook
4. 保持 `BOMActionDialog` 调用接口尽量稳定

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/hooks/use-bom-form.ts`
2. `src/features/engineering/hooks/use-bom-form-options.ts`（新增）
3. `src/features/engineering/hooks/use-bom-form-initialization.ts`（新增）
4. `src/features/engineering/components/bom-action-dialog.tsx`（仅必要时最小跟随）

#### 1.5 风险与破坏性评估

本轮风险主要在于拆分时不能破坏 BOM 表单行为：

1. 若创建态与编辑态 reset 映射被拆乱，可能直接影响新建/编辑弹窗稳定性
2. 若 delta tracker 组合关系变化过大，可能影响编辑保存语义
3. 若 options 读取与清洗分支拆散后接口变化过多，会扩大 `BOMActionDialog` 改动面

因此本轮必须坚持：

1. 对外接口尽量稳定
2. 初始化行为不变
3. delta 语义不变

#### 1.6 验证策略

本轮验证至少覆盖：

1. 新建 BOM 弹窗正常初始化
2. 编辑 BOM 弹窗正常回填
3. change order 联动清洗逻辑不回退
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改 BOM 表单 UI 结构
2. 不扩散到 `use-bom-data.ts`
3. 不抽后端 BOM 服务

#### 1.8 当前阶段结论

当前 BOM 模块继续做最小拆分的最合理路径，就是把 `use-bom-form.ts` 从“表单状态 + 选项读取 + 初始化映射 + 清洗 + delta 跟踪”的混杂状态收口为更清晰的 orchestration hook。下一步应只在 form hook 层拆出 options 与 initialization 两层，降低后续维护时对 BOM 弹窗行为误伤的风险。

### 1. plan：BOM 总成本显示为 `楼0.00` 的展示异常修复

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户反馈新建 BOM 弹窗中“预估总成本”显示为 `楼0.00`，同时工段分布概览中的分段成本也出现相同前缀异常。这种现象非常不自然，且容易被误判为成本计算链或币种逻辑异常。

#### 1.2 当前排查结论

##### 1.2.1 当前真实问题不是计算链错误

通过定位 BOM 新建弹窗的成本概览组件，已经确认当前问题不在数值计算，而在展示字符串硬编码：

1. `SummaryPanel` 中总成本展示直接写为：`楼{totalCost.toFixed(2)}`
2. 工段成本展示直接写为：`楼{sectionCost.toFixed(1)}`

因此当前异常是**展示层污染**，不是 BOM 成本计算公式错误。

##### 1.2.2 当前主要风险点

当前风险主要是视觉误导与维护混淆：

1. 用户会误以为成本单位、货币符号或后端金额字段出了问题
2. 如果不先明确根因，后续维护者可能去错误地修改成本计算链
3. 这类硬编码若继续存在，后续其它 BOM 展示位也可能被复制污染

#### 1.3 推荐实施策略

本轮建议采用最小修复策略：

1. 仅修复 `summary-panel.tsx` 中成本展示前缀
2. 保持总成本与分段成本计算公式不变
3. 如有必要，仅做最小展示格式收口，不扩散到无关 BOM 组件

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/bom-editor/summary-panel.tsx`

#### 1.5 风险与破坏性评估

本轮风险很低，主要属于展示层最小修复：

1. 若直接删除前缀字符即可恢复正常，则变更面极小
2. 若继续沿错误方向调整成本计算链，会制造新的业务风险

因此本轮必须坚持：

1. 只修展示
2. 不动计算链
3. 不扩散

#### 1.6 验证策略

本轮验证至少覆盖：

1. 新建 BOM 弹窗中的总成本显示恢复正常
2. 工段分布概览中的分段成本显示恢复正常
3. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改 BOM item 的价格/用量计算逻辑
2. 不改 BOM 表单结构
3. 不扩散到后端 BOM 读写链路

#### 1.8 当前阶段结论

当前 `楼0.00` 问题已经明确属于 `summary-panel.tsx` 的展示硬编码异常，而不是 BOM 成本计算链错误。下一步应按最小修复原则直接清理错误前缀，并执行定向前端校验，避免继续让展示污染误导后续排查。

### 1. plan：客户卡片微信打开入口最小实现

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前需求已从“只做打开微信入口”进一步调整为：客户资料需要先支持记录更多海外沟通渠道信息，包括 `WhatsApp / Facebook / Instagram / Telegram`。当前阶段不要求这些渠道具备跳转能力，但需要能在客户编辑弹窗中录入并保存，为后续逐步接入真实渠道入口预留数据基础。

因此本轮的重点不再只是微信按钮，而是先把客户资料扩展成“多渠道联系方式记录”的基础层；其中微信保持已落地的最小跳转能力，其余渠道本轮只做资料录入与持久化。

#### 1.2 当前问题本质

当前系统并不是“缺少几个输入框”这么简单，而是缺少统一的客户多渠道资料链：

1. 客户前后端契约当前只补了 `wechat`，尚未覆盖 `whatsapp / facebook / instagram / telegram`
2. 客户编辑弹窗当前没有统一的多渠道资料录入区
3. 若未来每次接一个渠道就零散加一行字段，客户资料结构会继续堆叠
4. 若渠道字段不先统一建模，后续做展示、跳转、校验时会重复改动模型与 DTO
5. 若把“是否可跳转”和“资料存储”混成一步，容易把本轮范围重新做大

因此当前合理路线应改为：**先统一补齐客户多渠道资料字段，再在弹窗中集中录入；微信保留已实现的最小跳转入口，其余渠道先只记录不跳转。**

#### 1.3 本轮目标

本轮仅做最小可运行范围：

1. 继续使用独立 `contact-channels` 目录承载渠道能力与后续扩展位
2. 为客户资料统一补充 `wechat / whatsapp / facebook / instagram / telegram` 字段
3. 在客户编辑弹窗中新增上述渠道录入项
4. 当前仅 `wechat` 保留客户卡片打开入口
5. `whatsapp / facebook / instagram / telegram` 本轮仅保存与展示，不提供跳转按钮
6. 保持“资料记录”与“跳转能力”解耦，避免未来扩展时相互污染

#### 1.4 推荐实施策略

##### 1.4.1 先抽独立渠道目录与基础类型

本轮建议先新增独立目录，例如：

1. `src/features/communications/` 或
2. `src/features/contact-channels/`

目录内优先只放最小基础文件：

1. 渠道类型定义
2. 微信 deep link / scheme 构造工具
3. 最小入口能力封装

这样本轮微信能力不会散落在客户卡片组件内部，而 `WhatsApp / Facebook / Instagram / Telegram` 虽暂不开放跳转，也能沿同一目录逐步补齐能力。

##### 1.4.2 再补客户字段与契约

优先在客户前端数据结构与 API DTO 中统一新增多渠道字段，使客户弹窗、卡片和后续详情展示有统一字段来源。若后端尚未提供对应字段，则本轮执行时需要同步补齐最小后端字段支持与兼容读取策略。

##### 1.4.3 跳转能力与资料记录分层处理

本轮不引入单独 communication domain，不新增后端发起接口。能力边界改为：

1. `wechat`：沿用当前最小策略，检查字段是否为空；为空则提示；不为空则尝试通过独立工具文件拉起 `weixin://`
2. `whatsapp / facebook / instagram / telegram`：本轮只做字段录入与保存，不新增任何跳转逻辑
3. 不承诺微信一定直达具体会话窗口，因为这依赖客户端平台与微信自身能力

##### 1.4.4 UI 保持客户卡片最小侵入

本轮 UI 以客户编辑弹窗为主承载多渠道资料录入，不重构整张客户卡片；客户卡片侧仅保留当前已存在的微信入口，不扩散新增多个海外渠道按钮，避免视觉噪音和范围膨胀。

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/communications/` 或 `src/features/contact-channels/` 下新增独立目录与文件
2. `src/features/trading/data/schema.ts`
3. `src/features/trading/customer/contracts/customer-api-dto.ts`
4. `src/features/trading/customer/adapters/customer-api-adapter.ts`
5. `src/features/trading/hooks/use-customer-action-view-model.ts`
6. `src/features/trading/components/customer-action-dialog.tsx`
7. `src/features/trading/components/customer-list.tsx`
8. 必要时联动客户保存接口对应的后端 DTO / model / handler

#### 1.6 风险与破坏性评估

本轮主要风险点：

1. 旧客户数据当前可能缺失新增渠道字段，若前端 schema 不做兼容会再次触发加载报错
2. 如果后端客户模型尚未提供新增渠道字段，前端单改无法持久化
3. 若弹窗一次性塞入过多字段但不做分组，表单可读性会明显下降
4. 若把本轮扩大成多平台跳转或外部协议接入，会使任务范围快速失控

因此本轮必须坚持：

1. 目录先独立，能力后最小落地
2. 本轮先统一完成客户多渠道资料记录
3. 当前仅微信保留最小跳转入口，其余渠道不做跳转
4. 不引入沟通审计、Webhook、时间轴等附加能力

#### 1.7 验证策略

本轮验证至少覆盖：

1. 新建/编辑客户时可录入 `wechat / whatsapp / facebook / instagram / telegram`
2. 历史客户在缺失新增字段时不会导致列表加载报错
3. 微信入口按钮继续可用，且微信字段为空时不会错误跳转
4. 非微信渠道本轮不出现误导性的“可跳转”入口
5. `pnpm exec tsc --noEmit` 通过
6. 若涉及后端字段持久化，则执行对应最小 Go 编译型验证

#### 1.8 非目标边界

本轮不做：

1. 不做企微侧边栏集成
2. 不做客户沟通审计或时间轴
3. 不做消息回传、Webhook、会话存档
4. 不做“规格确认即自动更新 TDO / 拓扑”
5. 不在本轮实现 `WhatsApp / Facebook / Instagram / Telegram` 的跳转协议或真实联动
6. 不处理个人微信 / 企业微信的完整平台兼容矩阵

#### 1.9 当前阶段结论

当前最合理的路线不是继续把每个海外渠道临时塞进客户弹窗，而是先把客户资料升级为统一多渠道记录结构，并保持“资料记录”与“跳转能力”分层。这样既能满足你现在先录资料的诉求，也能为后续逐个启用 `WhatsApp / Facebook / Instagram / Telegram` 的真实能力保留清晰扩展位。

### 1. plan：供应商复用客户沟通渠道/卡片交互方案

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

客户模块已经形成一套更清晰的沟通资料与卡片交互规范：

1. 编辑弹窗中将邮箱与社媒/IM 渠道统一归入“沟通渠道”分组
2. 渠道资料记录与跳转能力分层
3. 卡片本体不再承担“点击即编辑”行为，只保留菜单中的编辑入口
4. 当前仅微信保留最小跳转能力，其余渠道仅记录资料

现在用户要求将这套模式直接复用到供应商卡片与供应商编辑弹窗，避免客户与供应商在交互规则和资料结构上继续分叉。

#### 1.2 当前问题本质

当前问题不是单纯“给供应商多加几个输入框”，而是需要把客户已验证过的交互原则迁移到供应商：

1. 供应商资料结构当前未必具备与客户一致的多渠道字段
2. 供应商编辑弹窗当前未必按“沟通渠道分组”组织邮箱与社媒字段
3. 供应商卡片当前若仍支持点击卡片本体直接编辑，会与客户交互规则不一致
4. 若客户和供应商各自演化不同的沟通字段与交互方式，后续维护与扩展成本会持续增加

因此本轮真正目标是：**把客户已落地的沟通渠道建模、卡片交互约束和最小微信入口策略按同口径复用到供应商。**

#### 1.3 本轮目标

本轮仅做最小一致性落地：

1. 为供应商资料补齐与客户一致的沟通渠道字段：`wechat / whatsapp / facebook / instagram / telegram / email`
2. 在供应商编辑弹窗中新增“沟通渠道”分组
3. 供应商卡片移除“点击卡片本体即编辑”的行为，只保留菜单编辑入口
4. 若供应商已有微信字段，则供应商卡片可按客户同口径保留最小微信入口
5. `whatsapp / facebook / instagram / telegram` 本轮仍只做资料记录，不做跳转按钮
6. 前后端供应商契约、保存链路、历史数据兼容策略按客户同标准补齐

#### 1.4 推荐实施策略

##### 1.4.1 先对齐供应商数据模型与保存链路

优先将供应商模型、DTO、adapter、事务保存链补齐与客户一致的沟通渠道字段，并在读取路径上对历史数据做缺字段兼容，避免供应商列表出现与客户相同的加载报错。

##### 1.4.2 再对齐供应商编辑弹窗信息架构

供应商编辑弹窗应复用客户当前的信息架构原则：

1. 联系人 / 电话 / 状态归联系人信息
2. 邮箱 + 微信 + 其他社媒/IM 统一归“沟通渠道”分组
3. 地址保持独立区块

##### 1.4.3 最后对齐供应商卡片交互规则

供应商卡片应与客户保持一致：

1. 卡片本体不直接触发编辑
2. 编辑入口只保留在菜单动作中
3. 若本轮接入微信入口，则仅微信可跳转，其余渠道不新增按钮

#### 1.5 预计涉及文件

预计优先涉及：

1. `server/models/trading.go` 或供应商模型所在文件
2. `server/handlers/*supplier*.go`
3. `server/services/*supplier*.go`
4. `src/features/trading/data/schema.ts`
5. `src/features/trading/supplier/contracts/*`
6. `src/features/trading/supplier/adapters/*`
7. `src/features/trading/components/supplier-action-dialog.tsx`
8. `src/features/trading/components/supplier-list.tsx`

#### 1.6 风险与破坏性评估

本轮主要风险点：

1. 供应商链路与客户链路并不完全对称，直接照搬可能遗漏供应商专有字段
2. 历史供应商数据可能缺失新增渠道字段，需要做兼容兜底
3. 若供应商卡片已有其他点击行为，需要避免误伤既有功能

因此本轮必须坚持：

1. 先对齐供应商数据链，再改 UI
2. 保持“资料记录”与“跳转能力”分层
3. 卡片交互只收口编辑入口，不顺带做额外视觉重构

#### 1.7 验证策略

本轮验证至少覆盖：

1. 供应商编辑弹窗可录入并保存沟通渠道字段
2. 历史供应商数据缺字段时不会导致加载报错
3. 供应商卡片点击本体不再直接进入编辑
4. 菜单中的编辑入口仍正常工作
5. 若保留微信入口，微信字段为空时不会错误跳转
6. `pnpm exec tsc --noEmit` 通过
7. `go test ./handlers ./services -run ^$` 通过

#### 1.8 非目标边界

本轮不做：

1. 不做供应商沟通审计 / 时间轴
2. 不做 Telegram / Facebook / Instagram / WhatsApp 的真实跳转协议
3. 不做客户与供应商的通用抽象大重构
4. 不做无关 trading 模块视觉翻新

#### 1.9 当前阶段结论

当前最合理的路线不是让供应商模块继续保留一套不同的沟通资料和卡片交互模式，而是直接复用客户已经稳定下来的规则。这样既减少后续分叉，也能让新增渠道字段在客户/供应商两个主体上保持一致演进。

### 1. plan：销售侧客户信息增强

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

用户希望在销售相关客户信息中展示更有业务判断价值的摘要信号，而不是只显示静态主数据。目标信息包括：

1. 历史订单数
2. 累计销售额
3. 最后下单时间
4. 距今天数 / 沉默时长

这类信息本质上属于“客户销售画像摘要”，如果底层已有聚合能力，应优先复用后端聚合结果，而不是前端拉全量订单后再自行计算。

#### 1.2 当前排查结论

当前已确认：

1. 前端已有销售分析服务：
   - `src/features/trading/sales/analytics/services/analytics-service.ts`
   - `src/features/trading/sales/services/sales-query-service.ts`
2. 后端已有客户维度聚合接口：
   - `GET /sales-orders/analytics/customer-product-stats`
3. 当前该接口已提供：
   - `totalOrders`
   - `totalAmount`
4. 当前暂未发现现成字段：
   - `lastOrderDate`
   - `daysSinceLastOrder`

但用户已进一步明确：**现有 analytics 聚合是大致口径，本轮不要去动，除非能做到真实业务联动。**

因此本轮应把方向调整为：**不复用粗聚合结果作为客户卡片核心摘要，而是直接从真实销售订单链生成客户闭环信息。**

当前已确认两条权威事实来源：

1. 客户卡片当前布局定义在 `src/features/trading/components/customer-list.tsx`，目前为双列：`grid-cols-1 lg:grid-cols-2`
2. 销售订单权威状态定义在：
   - `src/features/trading/data/schema.ts`
   - `src/features/trading/data/sales-status.ts`

可直接用于“是否存在未完成订单”的真实判断口径：

1. `Draft`
2. `Pending`
3. `InProgress`

可视为未完成；而：

1. `Done`
2. `Canceled`

可视为已闭环。

#### 1.3 本轮目标

本轮仅做最小但有业务价值的增强：

1. 将客户卡片改为单列占满，提升信息承载空间
2. 在客户卡片直接展示“真实联动闭环摘要”
3. 优先展示：
   - 是否存在未完成订单
   - 最后下单时间
4. 仅当可严格来源于真实订单链时，再考虑补充：
   - 历史订单数
   - 累计销售额
5. 不修改现有粗粒度 analytics 聚合页逻辑
6. UI 仅做客户卡片增强，不改变销售订单主流程与保存链

#### 1.4 推荐实施策略

##### 1.4.1 先基于真实销售订单链补客户闭环摘要接口

更合理的方式是补一个更贴近客户卡片用途的真实摘要接口，直接从 `sales_orders` 主单出发，按客户聚合：

1. `hasOpenOrders`
2. `openOrderCount`
3. `lastOrderDate`
4. 必要时再补 `totalOrders`

这样可继续保持“后端裁决、前端消费”的边界，也不会污染现有 analytics 聚合口径。

##### 1.4.2 再扩展客户卡片 contract，而不是强绑 analytics contract

需要同步更新：

1. 客户列表或客户卡片所需的前端 contract
2. 相关 query service / hook
3. `customer-list.tsx` 展示结构

##### 1.4.3 UI 以客户卡片单列闭环摘要为主

本轮建议：

1. 将客户卡片从双列改为单列
2. 在卡片中新增一行或一组紧凑摘要信息
3. 不把卡片做成复杂分析面板

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/trading/components/customer-list.tsx`
2. 客户 query service / hook 所在文件
3. 后端客户摘要或销售订单聚合 handler / service（待实施时确认最合适落点）
4. 销售订单相关权威查询链（仅读取，不改主流程）

#### 1.6 风险与破坏性评估

本轮主要风险点：

1. 若误用粗聚合 analytics 结果，会出现口径不严谨，与你的“真实联动闭环”目标相冲突
2. 若前端自己计算“多久没下单”，会引入时区/日期差异和重复逻辑
3. 若客户卡片改为单列后不控制信息密度，反而会造成阅读负担

因此本轮必须坚持：

1. 闭环摘要由后端基于真实订单链裁决
2. 不动现有粗聚合 analytics 页口径
3. 客户卡片增强保持简洁，不演变成分析看板

#### 1.7 验证策略

本轮验证至少覆盖：

1. 客户卡片改为单列后布局正常
2. 客户卡片能正确显示是否存在未完成订单
3. 最后下单时间可正确展示
4. 无订单客户不报错，需有清晰空态或占位文案
5. `pnpm exec tsc --noEmit` 通过
6. `go test ./handlers ./services -run ^$` 通过

#### 1.8 非目标边界

本轮不做：

1. 不做客户标签系统
2. 不做流失预测模型
3. 不做额外 CRM 看板重构
4. 不把销售 analytics 整体重构成新域模型

#### 1.9 当前阶段结论

当前最合理的路线是复用现有销售分析聚合接口，在后端补足 `lastOrderDate / daysSinceLastOrder`，再把这些摘要信息增强到销售侧客户信息展示区。这样既能满足业务判断诉求，也能保持“后端聚合、前端消费”的清晰边界。

在你进一步明确“不要动粗聚合，只要真实联动闭环”之后，本轮更合理的路线应调整为：**不碰现有 analytics 大致口径，而是在客户卡片上直接接真实销售订单链的闭环摘要。** 这样客户卡片才能真正承担“客户当前业务状态概览”的作用，而不是展示一组可能存在口径偏差的分析结果。

### 1. plan：客户卡片闭环入口改造

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前客户卡片已经具备“真实销售闭环摘要”能力，但摘要本身只能回答“现在是什么状态”，不能承接后续完整处理动作。时间线入口最多承担“记录与追溯”，并不能完成真正的业务闭环。

若用户想继续处理客户相关订单，最终仍然必须进入销售订单管理页查看完整订单列表、定位未完成订单并进入详情。因此，这里需要把“记录入口”和“主闭环入口”职责拆清楚。

#### 1.2 当前排查结论

当前已确认：

1. 销售订单管理权威承接页已存在：
   - 路由：`/_authenticated/trading/sales-orders`
   - 文件：`src/routes/_authenticated/trading/sales-orders.tsx`
   - 页面组件：`src/features/trading/components/sales-order-list-fixed.tsx`
2. 当前销售订单页 search 参数仅有：
   - `search`
   - `detailId`
   - `activeCommandId`
3. 当前缺少明确的客户上下文承接字段：
   - `customerId`
   - 可选 `customerName`
4. 当前若从客户卡片跳转到订单页，只能依赖模糊搜索，不足以构成稳定闭环。

#### 1.3 本轮目标

本轮目标不是再造一个客户订单中心，而是最小改造现有链路，让客户卡片可以把用户稳定带到正确的订单管理上下文中：

1. 明确区分“时间线记录入口”和“主闭环入口”
2. 客户卡片新增主按钮，跳转到现有销售订单管理页
3. 销售订单管理页支持承接 `customerId` 上下文
4. 订单页进入后能稳定落到该客户订单视图，而不是只依赖文本搜索

#### 1.4 推荐实施策略

##### 1.4.1 不重复造轮子，直接复用现有销售订单管理页

本轮明确不新增：

1. 不新增客户业务中心页
2. 不新增客户订单专属面板
3. 不复制一套销售订单列表到客户模块

而是直接复用：

1. 现有销售订单路由
2. 现有销售订单列表页
3. 现有订单详情承接能力

##### 1.4.2 用结构化上下文替代模糊 search

本轮应在销售订单路由 search 契约中新增：

1. `customerId`
2. 可选 `customerName`

并以 `customerId` 作为稳定主键进行筛选承接。`customerName` 只可作为展示或兜底，不可作为主闭环依据。

##### 1.4.3 客户卡片只负责摘要 + 导航，不负责业务筛选实现

客户卡片职责应保持轻量：

1. 展示闭环摘要
2. 提供主按钮“查看完整订单”
3. 发起导航并携带 `customerId`

筛选落地、URL 承接、订单页初始化逻辑应全部收敛在销售订单页内部，避免客户卡片承担订单页业务规则。

##### 1.4.4 时间线入口降级

时间线本轮只保留记录职责：

1. 审计记录 -> 次级入口
2. 业务时间线 -> 如后续做，也应为次级入口
3. 主闭环入口必须是“查看完整订单”

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/routes/_authenticated/trading/sales-orders.tsx`
2. `src/features/trading/components/sales-order-list-fixed.tsx`
3. 销售订单列表相关 view-model / hooks（若客户筛选状态需进一步抽离）
4. `src/features/trading/components/customer-list.tsx`
5. 如有必要，新增独立导航工具或 search contract 工具文件，避免在页面里直接散落拼参逻辑

#### 1.6 风险与破坏性评估

本轮主要风险：

1. 若继续沿用 `search` 模糊搜索承接客户上下文，会导致闭环不稳定、客户改名后链接不可靠
2. 若客户卡片直接塞入订单页筛选实现细节，会导致卡片组件职责膨胀
3. 若在订单页内部把“模糊搜索”和“结构化 customer filter”混成一套状态，后续维护成本会迅速升高

因此本轮必须坚持：

1. 用 `customerId` 做结构化承接
2. 客户卡片只发起导航，不承载订单页筛选规则
3. 不新增重复页面，直接复用现有订单管理页

#### 1.7 验证策略

本轮验证至少覆盖：

1. 从客户卡片点击主按钮可进入销售订单管理页
2. 进入后能按目标客户正确收敛订单列表
3. 客户无订单时页面不报错，应显示空结果或清晰空态
4. 客户改名后，基于 `customerId` 的旧入口仍可稳定落页
5. `pnpm exec tsc --noEmit` 通过

#### 1.8 非目标边界

本轮不做：

1. 不新增客户业务中心页
2. 不重做销售订单管理整体布局
3. 不把时间线扩展成全功能 CRM 历史中心
4. 不联动做新的收款/交付综合工作台

#### 1.9 当前阶段结论

当前最合理的闭环路线不是让时间线承担主入口，而是让客户卡片上的主按钮直接跳转到现有销售订单管理页，并由订单管理页承接 `customerId` 上下文。这样既复用了已有轮子，也能保证职责清晰、链路稳定、后续可维护。

### 1. plan：客户卡片订单闭环显示口径调整

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前客户卡片的订单闭环区主要显示“有未完成订单 / 当前已闭环”与未完成订单数。这个口径虽然能表达状态，但不够直观，尤其无法一眼看出“当前已经闭环多少单、总共有多少单”。

用户明确希望改成更直观的闭环完成度表达，例如：

1. `0/0` = 没有订单
2. `0/1` = 有 1 单且尚未闭环
3. `1/1` = 全部闭环
4. `2/5` = 已闭环 2 单，总计 5 单

#### 1.2 当前排查结论

当前闭环摘要接口已经具备所需基础数据：

1. `openOrderCount`
2. `totalOrders`
3. `hasOpenOrders`
4. `lastOrderDate`
5. `daysSinceLastOrder`

因此本轮**不需要新增后端接口，也不需要修改查询链**。只需在前端稳定派生：

1. `closedOrderCount = totalOrders - openOrderCount`

并对异常场景做非负保护即可。

#### 1.3 本轮目标

本轮目标是提升客户卡片闭环信息的可读性与可比性：

1. 订单闭环主值改为“已完成数 / 总订单数”
2. 无订单客户显示 `0/0`
3. 保留辅助语义：
   - `暂无订单`
   - `未闭环 X 单`
   - `全部闭环`
4. 保留最后下单时间与沉默时长，但不抢主视觉层级

#### 1.4 推荐实施策略

##### 1.4.1 不改后端契约，只做前端稳定派生

本轮不改后端响应结构，不新增 `closedOrderCount` 字段，避免扩大链路变更面。前端基于现有摘要做稳定派生即可。

##### 1.4.2 派生逻辑抽到独立 util，避免堆进组件

本轮建议新增独立 util，例如：

1. 接收现有 `CustomerSalesClosureSummary | undefined`
2. 统一产出：
   - `closedOrderCount`
   - `totalOrders`
   - `closureRatioLabel`
   - `closureStatusLabel`

这样可以避免在 `customer-sales-closure-summary.tsx` 中散落计算逻辑，提升后续可维护性。

##### 1.4.3 视觉层级重排

本轮建议：

1. “订单闭环”区主值显示 `closed/total`
2. 状态文案降为次级说明
3. 最后下单时间、沉默时长继续保留为辅信息

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/trading/customer/components/customer-sales-closure-summary.tsx`
2. `src/features/trading/customer/services/customer-sales-closure-summary-service.ts`（若需补类型注释或复用导出）
3. `src/features/trading/customer/utils/customer-sales-closure-metrics.ts`（新增）

#### 1.6 风险与破坏性评估

本轮主要风险：

1. 若把“无订单”直接渲染成“全部闭环”，会造成语义误导
2. 若直接在组件里散写派生计算，后续再调口径会继续变成展示逻辑堆叠
3. 若异常数据下未做保护，可能出现负数闭环值

因此本轮必须坚持：

1. 无订单显示 `0/0` + `暂无订单`
2. `closedOrderCount` 做 `Math.max(0, totalOrders - openOrderCount)` 保护
3. 逻辑抽到独立 util，组件只负责展示

#### 1.7 验证策略

本轮验证至少覆盖：

1. 无订单客户显示 `0/0`
2. 有 1 单未完成客户显示 `0/1`
3. 全部完成客户显示 `1/1` 或对应完成数/总数
4. `pnpm exec tsc --noEmit` 通过

#### 1.8 非目标边界

本轮不做：

1. 不新增后端聚合字段
2. 不改销售订单状态判定口径
3. 不调整客户卡片其它非闭环摘要区块

#### 1.9 当前阶段结论

当前最合理的方案是复用现有 `openOrderCount / totalOrders` 数据，在前端将订单闭环主值调整为“已完成数 / 总订单数”。这样既满足直观表达，也不会重复造轮子或扩大后端变更面。

### 1. plan：个人记录缓冲区模块

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前需要一个绑定账户、仅本人可见的个人记录缓冲区，用来承接日常工作中的碎片化信息，例如：

1. 临时拍摄的图片
2. 当下无法处理、但以后可能回看的事项
3. 简短备注与现场记录

该空间当前明确**不是正式业务对象池**，也不是组织协作系统，而是账户附属的个人临时记录区。

同时，用户已明确未来希望从个人账户内部直接基于某条记录或某张图片发起业务调用，因此本轮虽然不实现正式业务流转，但必须为未来 action 扩展预留结构。

#### 1.2 当前约束

当前已确认的强约束如下：

1. 该模块必须新建独立文件夹 / 独立文件承载，不能散落挂靠现有客户、订单或审计模块
2. 模块默认仅账户本人可见
3. 管理员无审计权，也不提供后台查看入口
4. 图片统一复用现有图片压缩链，输出 WEBP
5. 不重复建设图片上传 / 压缩逻辑
6. 不做备份能力
7. 账户删除时，级联删除其个人记录与相关图片引用

#### 1.3 本轮目标

本轮目标是先把“个人记录缓冲区”定义成独立新模块，并把当前与未来边界一次性设计清楚：

1. 当前阶段只做个人记录 / 整理 / 挂起 / 归档
2. 不进入正式业务对象流转
3. 不承担组织协作任务
4. 模块结构、数据模型和服务边界为未来“从个人记录发起业务调用”预留扩展位

#### 1.4 推荐实施策略

##### 1.4.1 前后端均建立独立模块目录

前端建议新建：

1. `src/features/personal-workbench/`
   - `components/`
   - `hooks/`
   - `services/`
   - `data/`
   - `utils/`

后端建议新建：

1. `server/handlers/personal_workbench_handlers.go`
2. `server/services/personal_workbench_service.go`
3. `server/routes/routes_personal_workbench.go`

##### 1.4.2 先做“个人记录本体”，不做正式业务流转

本轮模块核心只承接：

1. 记录创建
2. 图片附件挂载
3. 轻量列式整理（收件箱 / 待整理 / 挂起 / 归档）
4. 个人范围内的编辑、排序与归档

##### 1.4.3 为未来 action 扩展位留接口，但不开放流程

本轮建议预留两类结构：

1. 前端 util / type 层预留 future action 类型占位
2. 后端数据模型预留 action log 或调用记录关联位

但本轮不实现：

1. 正式业务对象创建
2. 业务调用按钮
3. 业务模块联动写入

##### 1.4.4 图片能力直接复用现有 WEBP 压缩链

本轮个人记录区只负责消费现有图片能力：

1. 选择图片
2. 调用现有压缩/上传链
3. 保存压缩后的图片资产引用

避免重复建设图片处理逻辑。

#### 1.5 建议信息架构

当前建议的列结构：

1. `INBOX` / 收件箱
2. `ORGANIZING` / 待整理
3. `PARKED` / 挂起
4. `ARCHIVED` / 归档

当前建议的双入口形态：

1. 快速入口：弹窗
2. 深度整理入口：独立页面

#### 1.6 建议核心数据模型

建议至少拆成两类本体：

1. `personal_record`
   - `id`
   - `owner_user_id`
   - `title`
   - `note`
   - `column_key`
   - `sort_order`
   - `cover_image_asset_id`
   - `created_at`
   - `updated_at`
   - `archived_at`

2. `personal_record_asset`
   - `id`
   - `record_id`
   - `owner_user_id`
   - `storage_path`
   - `mime_type`
   - `width`
   - `height`
   - `size_bytes`
   - `created_at`

未来扩展建议预留：

3. `personal_record_action_log`
   - 当前先不开放业务流程
   - 仅作为未来“从个人记录发起业务调用”的结构预留

#### 1.7 风险与破坏性评估

本轮主要风险：

1. 若直接挂靠现有业务模块，未来一定会被业务语义污染
2. 若顺手把它做成正式任务/协作系统，会破坏当前“纯个人缓冲区”的边界
3. 若重复建设图片上传压缩链，会和现有图片能力形成双轨维护成本

因此本轮必须坚持：

1. 独立模块目录
2. 纯个人私有边界
3. 复用现有图片压缩链
4. 当前不做业务流转，只预留 future action 扩展位

#### 1.8 验证策略

本轮若进入实现，至少需要验证：

1. 仅本人可读取自己的个人记录
2. 管理员无额外查看入口
3. 图片上传链复用现有 WEBP 压缩能力
4. 账户删除时可级联清理该用户个人记录与图片引用
5. `pnpm exec tsc --noEmit` 通过
6. 相关 Go 编译型校验通过

#### 1.9 非目标边界

本轮不做：

1. 不做正式业务对象转化
2. 不做团队协作或共享看板
3. 不做管理员审计/恢复/导出
4. 不做备份与企业留存承诺

#### 1.10 当前阶段结论

当前最合理的路线是新建一个独立的“个人记录缓冲区”模块，当前只承接账户私有记录与图片整理，同时在数据模型和模块边界上为未来从个人记录发起业务调用的 action 扩展位做好准备。这样既不会污染真实业务系统，也能保证未来扩展时不需要推翻重建。

### 1. plan：个人记录缓冲区拖拽排序

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

个人记录缓冲区第一阶段已经完成：

1. 独立前后端模块骨架已建立
2. 弹窗 + 独立页面双入口已接入
3. 四列看板展示与最小读写链已打通

当前最直接影响可用性的缺口已经收敛为：记录虽然能分栏展示，但还不能像 Trello 一样进行列内排序和跨列搬移，因此“整理”动作仍然需要进入编辑器修改分栏，操作链偏重。

#### 1.2 当前排查结论

##### 1.2.1 本轮最值得优先补的是拖拽排序，而不是继续扩展附件能力

当前模块里：

1. 数据模型已经存在 `columnKey` 与 `sortOrder`
2. 看板已经按列分组展示
3. 弹窗与独立页面共用同一套 board 组件

因此第二阶段最自然的增强点是把现有字段真正用起来，让用户可以直接在看板上完成“搬移”和“排序”。相比继续扩展多图或 action 预留，这一能力对日常使用路径的改善最直接。

##### 1.2.2 本轮建议采用“前端拖拽 + 后端批量排序落库”的最小闭环

建议方案：

1. 前端在 `personal-workbench-board` 层引入拖拽能力
2. 前端拖拽完成后，本地立即重排列表并生成新的 `columnKey / sortOrder`
3. 后端补一个最小批量排序更新接口，统一提交本次受影响记录的新顺序
4. 后端仅按当前登录用户范围更新，避免越权改写他人记录

这样可以避免把排序落成多次单条 PATCH，也能减少跨列拖拽时的顺序竞争问题。

#### 1.3 推荐实施策略

本轮建议只做“最小可用拖拽排序”闭环：

1. 前端为四列看板接入列内排序与跨列拖拽
2. 保持卡片内容结构、编辑器结构基本不变
3. 新增批量排序 mutation，而不是重写现有创建/编辑接口
4. 后端新增排序请求 DTO 与批量更新服务
5. 不扩散到删除、批量归档、恢复、共享、管理员视图

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-board.tsx`
2. `src/features/personal-workbench/components/personal-workbench-column.tsx`
3. `src/features/personal-workbench/components/personal-workbench-card.tsx`
4. `src/features/personal-workbench/hooks/use-personal-workbench.ts`
5. `src/features/personal-workbench/services/personal-workbench-service.ts`
6. `server/services/personal_workbench_service.go`
7. `server/handlers/personal_workbench_handlers.go`
8. `server/routes/routes_personal_workbench.go`

如拖拽库需要独立适配层，可新增：

9. `src/features/personal-workbench/utils/record-reorder.ts`（新增）

#### 1.5 数据与接口方案

本轮建议新增一个最小排序接口，例如：

1. `POST /personal-workbench/records/reorder`

请求体只提交受影响记录的最小信息：

1. `id`
2. `columnKey`
3. `sortOrder`

后端约束：

1. 仅更新当前 `ownerUserId` 下的记录
2. 不允许借排序接口修改标题、备注、图片等其他字段
3. 使用事务一次性落库，避免部分成功导致列内顺序错乱

#### 1.6 风险与破坏性评估

本轮主要风险：

1. 若前端直接用索引排序但没有统一重排规则，跨列后刷新可能顺序漂移
2. 若仍复用单条 PATCH 多次提交，拖拽一次可能产生多次写入且中途失败
3. 若拖拽实现直接耦合编辑器状态，弹窗和独立页面容易出现行为不一致
4. 若移动端强行同步复杂手势，会扩大实现复杂度与误触风险

因此本轮必须坚持：

1. 排序规则集中在独立 helper 中
2. 使用批量排序接口而不是多次单条更新
3. 弹窗与页面继续共用同一套 board 层逻辑
4. 优先保证桌面端可用，移动端先不做重手势优化

#### 1.7 验证策略

本轮若进入实现，至少需要验证：

1. 列内拖拽后顺序立即更新且刷新后保持一致
2. 跨列拖拽后 `columnKey` 与 `sortOrder` 同步更新
3. 弹窗入口与独立页面入口行为一致
4. 非当前用户的数据不会被排序接口改写
5. `pnpm exec tsc --noEmit` 通过
6. 相关 Go 编译型校验通过

#### 1.8 非目标边界

本轮不做：

1. 不做多图编辑增强
2. 不做正式业务流转
3. 不做管理员查看或恢复
4. 不做移动端复杂拖拽手势细化

#### 1.9 当前阶段结论

个人记录缓冲区第二阶段最合理的增量，是在现有四列看板之上补齐“列内排序 + 跨列拖拽 + 批量排序落库”这一最小闭环。这样可以显著提升整理效率，同时保持模块边界稳定，不会把任务扩散到多图、协作或业务流转。

### 1. plan：个人记录弹窗完整相机面板

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录图片入口仅支持两类来源：

1. 常规文件选择
2. 在支持 `capture` 属性的移动端浏览器中，由系统决定是否直接调起相机

这能覆盖“能拍照上传”的最低要求，但还不能满足“页面内直接看到预览画面、点击拍照、切换前后摄像头”的完整录入体验。

#### 1.2 当前排查结论

##### 1.2.1 当前最佳承载点是 `personal-workbench-image-picker.tsx`

当前模块里：

1. `personal-workbench-card-editor.tsx` 已把图片能力集中交给 `personal-workbench-image-picker.tsx`
2. 上传链已经统一复用 `AssetService.uploadFile`
3. 当前图片状态仍是单图主图，适合先做“单次拍照 -> 单图上传”的最小闭环

因此本轮不需要改后端，也不需要新建第二套上传协议，最合理的落点是在现有 image picker 内补齐相机面板能力。

##### 1.2.2 本轮建议采用 `getUserMedia + canvas 截帧 + 现有上传链` 的最小闭环

建议方案：

1. 用 `navigator.mediaDevices.getUserMedia` 获取视频流
2. 在弹窗中展示视频预览画面
3. 拍照时通过 `canvas.drawImage` 截帧并导出 `Blob`
4. 将 `Blob` 包装为 `File` 后继续调用 `AssetService.uploadFile`
5. 用 `facingMode` 在 `user` / `environment` 间切换前后摄像头

#### 1.3 推荐实施策略

本轮建议只做“单图完整相机面板”最小闭环：

1. 在 `personal-workbench-image-picker.tsx` 中新增相机模式切换
2. 支持打开相机、关闭相机、切换前后摄像头、拍照上传
3. 保留原有文件选择/系统拍照入口作为降级方案
4. 权限失败或不支持环境时回退到原方案，不阻塞用户继续上传
5. 不修改后端接口，不扩散到多图或录像能力

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. `src/features/personal-workbench/components/personal-workbench-card-editor.tsx`

如需要隔离媒体流逻辑，可新增：

3. `src/features/personal-workbench/hooks/use-camera-capture.ts`（新增）

#### 1.5 兼容与降级方案

本轮必须明确以下前提：

1. `getUserMedia` 仅在安全上下文（HTTPS 或 localhost）下可用
2. 浏览器可能拒绝权限，或设备根本没有可用摄像头
3. 桌面端浏览器即使支持相机，也不一定具备前后摄像头切换语义

因此降级规则应固定为：

1. 若不支持 `navigator.mediaDevices.getUserMedia`，仅显示原上传入口
2. 若权限被拒绝或开启失败，提示失败原因并回退到原上传入口
3. 若无法可靠枚举摄像头，则保留单一默认摄像头预览

#### 1.6 风险与破坏性评估

本轮主要风险：

1. 若媒体流未在弹窗关闭时释放，可能导致摄像头持续占用
2. 若截帧与上传链耦合不清晰，容易把 image picker 变成多职责组件
3. 若把“不支持相机”当成错误而不是降级场景，会损伤桌面端与部分浏览器体验
4. 若一次性引入录像、多图、拍照历史等能力，会明显扩大任务范围

因此本轮必须坚持：

1. 弹窗关闭或切换模式时必须释放媒体流
2. 预览/拍照与上传职责尽量分层
3. 相机能力是增强，不可用时自动降级
4. 当前只做单次拍照上传，不扩展录像与多图

#### 1.7 验证策略

本轮若进入实现，至少需要验证：

1. 支持环境下可打开相机预览
2. 可在前置/后置摄像头之间切换
3. 点击拍照后能成功生成图片并进入现有上传链
4. 权限拒绝或不支持环境时可正常回退到原上传方式
5. 弹窗关闭后媒体流被正确释放
6. `pnpm exec tsc --noEmit` 通过

#### 1.8 非目标边界

本轮不做：

1. 不做录像
2. 不做连续拍摄
3. 不做多图编辑
4. 不做图片裁剪/滤镜/标注

#### 1.9 当前阶段结论

个人记录弹窗的完整相机面板应以“页面内相机预览 + 前后摄像头切换 + 拍照上传 + 自动降级”为核心，直接挂载在现有 image picker 之上，并继续复用既有上传链。这样可以显著提升手机端录入体验，同时不需要改动后端或推翻当前图片能力边界。

### 1. plan：个人记录完整页模块壳布局（方案 B）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录完整页虽然已经能独立访问，但页面结构仍然是：

1. `Header`
2. `Main`
3. `PageHeader`
4. `PersonalWorkbenchBoard`

这和系统里大量正式模块页的“模块壳 + 顶部承载条 + 正文内容区”结构不一致，因此用户会直接感知为：

1. 页面上方留白偏空
2. 缺少模块页骨架感
3. 标题信息重复
4. 整体不像系统里的正式模块

#### 1.2 当前排查结论

##### 1.2.1 当前问题不只是缺少 tab，而是缺少模块页壳层

从现状看：

1. 个人记录完整页没有采用 `ModuleTabbedLayout` 这一类模块承载方式
2. `PageHeader` 与 `PersonalWorkbenchBoard` 都在承担头部语义
3. 看板本身是轻量内容组件，不适合同时承担页面级结构职责

因此本轮更合理的方向不是仅仅“补一个标题条”，而是按方案 B 收口为正式模块页壳。

##### 1.2.2 本轮建议采用“模块壳 + 顶部操作条 + 正文看板”结构

建议结构：

1. 外层采用与系统其他模块相近的页面承载方式
2. 顶部提供模块标题与操作条/轻量 tab 承载
3. `PersonalWorkbenchBoard` 只负责正文看板，不再重复渲染页面级标题

这样既能提升一致性，也不会强行把个人记录模块扩成多业务 tab 系统。

#### 1.3 推荐实施策略

本轮建议只做“单模块正式页壳”最小闭环：

1. 为个人记录完整页增加模块级顶部承载层
2. 统一页面级标题、描述与主操作按钮的归属
3. 看板组件在完整页中隐藏内部标题
4. 弹窗模式保持当前轻量头部，不强制共用完整页壳层
5. 不扩展新的业务 tab，只保证结构和系统风格一致

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/index.tsx`
2. `src/features/personal-workbench/components/personal-workbench-board.tsx`
3. 如需复用现有壳层模式，可能参考：
   - `src/components/layout/module-tabbed-layout.tsx`
   - `src/features/trading/index.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接把完整页强塞进多 tab 体系，可能制造空 tab 或伪导航
2. 若弹窗和完整页强行完全同构，可能让弹窗变重，损伤轻量入口体验
3. 若只新增壳层但不处理 Board 内部标题，仍会存在结构重复问题

因此本轮必须坚持：

1. 完整页向正式模块壳靠拢，但不为了“像”而硬造多 tab
2. 弹窗保持轻量
3. 看板只承担正文职责

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 个人记录完整页拥有更接近系统模块页的顶部骨架
2. 页面标题不再重复
3. 完整页主操作按钮位置与整体留白节奏更自然
4. 弹窗入口不受影响
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不扩展共享/协作 tab
2. 不新增复杂筛选器中心
3. 不在本轮接入报表/分析副页面
4. 不重构弹窗为完整页同构结构

#### 1.8 当前阶段结论

个人记录完整页更适合按方案 B 收口为“正式模块页壳 + 顶部承载层 + 正文看板”的结构，而不是继续维持当前的轻量独页拼接形态。这样既能对齐系统已有模块风格，又能保持个人记录模块本身的独立边界。

### 1. plan：个人记录媒体面板视频录制（最长 10 秒）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录媒体面板已经支持：

1. 页面内相机预览
2. 拍照上传
3. 前后摄像头切换
4. 不支持环境自动降级到普通文件上传

下一步用户明确提出：视频也很必要，但必须强约束录制长度，最多 10 秒。这说明本轮目标不是一般的视频上传入口，而是“短视频证据式记录”。

#### 1.2 当前排查结论

##### 1.2.1 当前最自然的承载点仍是 `personal-workbench-image-picker.tsx`

当前媒体面板里：

1. 相机预览已经挂载在 `personal-workbench-image-picker.tsx`
2. 拍照链已经可以把浏览器采集结果转换成 `File` 并复用 `AssetService.uploadFile`
3. 当前单媒体模型仍适合先做“单段短视频 -> 上传”的最小闭环

因此本轮不需要改后端协议，只需要在现有媒体面板内增加视频录制状态机即可。

##### 1.2.2 本轮建议采用 `MediaRecorder + 10 秒倒计时 + 自动停止` 的最小闭环

建议方案：

1. 使用现有视频流作为录制输入源
2. 通过 `MediaRecorder` 启动录制
3. 录制中显示剩余秒数
4. 到达 10 秒后自动 `stop`
5. 录制完成后将 `Blob` 包装为 `File`，继续复用 `AssetService.uploadFile`

#### 1.3 推荐实施策略

本轮建议只做“单段 10 秒短视频录制”最小闭环：

1. 在相机面板内增加“拍照 / 录视频”两种模式切换
2. 视频模式中支持开始录制、手动停止、10 秒自动停止
3. 显示明确的录制倒计时与录制态提示
4. 录制失败或浏览器不支持时回退到拍照/文件上传
5. 不修改后端接口，不扩展多视频管理

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`

如录制状态机过重，可新增：

2. `src/features/personal-workbench/hooks/use-media-recorder.ts`（新增）

#### 1.5 限制与兼容方案

本轮必须固定以下约束：

1. 单次录制最大时长：10 秒
2. 仅支持单段录制，不做继续录下一段
3. 若浏览器不支持 `MediaRecorder`，则不显示视频录制入口或自动降级
4. 录制时仍需处于安全上下文并拥有媒体权限

降级策略：

1. 不支持 `MediaRecorder` 时，保留拍照与普通文件上传
2. 权限失败时，提示原因并回退到已有媒体能力
3. 若视频 MIME 能力有限，优先选取浏览器支持的容器格式，不强行指定不可用编码

#### 1.6 风险与破坏性评估

本轮主要风险：

1. 若录制状态与拍照状态混用不清，会使媒体面板交互复杂度明显上升
2. 若 10 秒自动停止与手动停止逻辑不统一，可能造成重复提交或空文件
3. 若录制结束后没有及时释放计时器/事件绑定，可能出现内存泄漏或状态错乱
4. 若将长视频需求带入本轮，会迅速扩散到压缩、预览、封面等复杂链路

因此本轮必须坚持：

1. 明确区分拍照态与录制态
2. 单段录制，统一收口到一次上传
3. 严格 10 秒封顶
4. 不扩展视频编辑链

#### 1.7 验证策略

本轮若进入实现，至少需要验证：

1. 支持 `MediaRecorder` 的环境下可以开始录制视频
2. 录制中可看到剩余秒数
3. 达到 10 秒自动停止并产出可上传文件
4. 手动提前停止也能正常上传
5. 不支持 `MediaRecorder` 时，拍照与普通上传仍然可用
6. `pnpm exec tsc --noEmit` 通过

#### 1.8 非目标边界

本轮不做：

1. 不做视频裁剪
2. 不做视频封面编辑
3. 不做多段拼接
4. 不做超过 10 秒的长视频录制
5. 不做视频库管理

#### 1.9 当前阶段结论

个人记录媒体面板的视频能力应以“单段短视频、最长 10 秒、录制中倒计时、自动停止、继续复用现有上传链”为边界实现。这样既能满足用户对视频记录的核心需求，又不会让媒体能力在当前阶段失控扩张。

### 1. plan：个人记录视频录制反馈强化（第一阶段）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录媒体面板已经支持 10 秒短视频录制，但录制中的视觉反馈仍偏功能性，主要依赖：

1. 倒计时文字
2. 开始/停止按钮状态
3. 录制中 badge

对于工业现场和一线操作场景，这种反馈还不够强，容易出现“以为录了 / 不确定是否仍在录”的心理负担。

#### 1.2 当前排查结论

##### 1.2.1 第一阶段最值得优先补的是录制中的强视觉反馈，而不是继续扩展媒体链路

当前更优先的问题不是：

1. 编码能力不足
2. 转发协议不足
3. 离线缓存缺失

而是录制动作本身的可感知性还不够强。

因此第一阶段应先补“录制反馈强化”，用最低风险提升现场可用性。

##### 1.2.2 本轮建议采用“红色高亮边缘 + 呼吸灯 + 明确录制状态”组合

建议方案：

1. 录制中时让视频面板外层切换到红色边框/高亮态
2. 为录制区域加入 `animate-pulse` 或等效呼吸灯效果
3. 保留现有倒计时与 badge，并让其视觉层级更明确

#### 1.3 推荐实施策略

本轮建议只做“录制反馈强化”最小闭环：

1. 只改前端录制态 UI 反馈
2. 不修改录制时长逻辑
3. 不修改上传链
4. 不修改相机/视频状态机结构
5. 不引入新的媒体能力

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-video-recorder.tsx`
2. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，主要在于：

1. 若动画和高亮过强，可能影响信息阅读或显得过躁
2. 若只加外观不统一录制态语义，可能造成按钮、badge、边框反馈不同步

因此本轮必须坚持：

1. 所有高亮只在 `isRecording=true` 时出现
2. 反馈风格与现有 UDS 视觉语言保持一致
3. 不把样式增强写成耦合业务逻辑的复杂状态机

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 开始录制后红色高亮与呼吸灯立即出现
2. 停止录制或自动停止后高亮立即消失
3. 现有倒计时、开始/停止按钮、上传链不受影响
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不调低码率
2. 不调整分辨率
3. 不做 IndexedDB 暂存
4. 不做 `Video_Ref` 协议升级
5. 不做视频增强或压缩

#### 1.8 当前阶段结论

个人记录视频能力的第一阶段收口，最适合先做“录制反馈强化”。这是低风险、高收益、对现场可用性最直接的一步，且不会扩大当前媒体链路复杂度。

### 1. plan：个人记录媒体能力重规划为本地优先

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录媒体面板的能力路径，仍然以“采集 -> 上传”为默认主路径：

1. 拍照后直接上传
2. 视频录制结束后自动上传

但从实际使用场景看，个人记录缓冲区并不一定要求所有现场采集结果都上云：

1. 有些内容只是当场记录一下，随后就不再需要
2. 手机端适合快速采集，但不适合长时间审阅细节
3. 用户可能希望先在手机采集，之后由电脑端决定哪些内容值得正式上传和处理

因此后续媒体路线更合理的方向，应从“默认立即上传”改为“本地优先、手动上传、可丢弃”。

#### 1.2 当前排查结论

##### 1.2.1 当前最需要调整的不是采集能力，而是媒体生命周期策略

当前已经具备：

1. 图片采集
2. 相机拍照
3. 10 秒短视频录制
4. 上传链统一复用 `AssetService.uploadFile`

真正需要重新定义的是：

1. 采集结果先放哪里
2. 什么时候上传
3. 什么情况下可以直接丢弃

##### 1.2.2 后续建议采用“本地暂存 + 手动上传 + 本地丢弃”策略

建议策略：

1. 新采集的图片/视频先保存在浏览器本地持久化存储中
2. 媒体面板中增加“上传到服务器”动作，由用户主动触发
3. 未上传的媒体允许直接删除
4. 上传成功后再将其转为正式云端引用

这套策略更符合“手机采集、电脑处理”的真实链路。

#### 1.3 推荐实施策略

后续若进入实现，建议拆成三个小阶段：

1. **阶段 A：本地暂存基础层**
   - 为图片/视频引入本地持久化（优先 IndexedDB）
   - 建立本地媒体草稿模型

2. **阶段 B：手动上传入口**
   - 在媒体面板中增加上传按钮
   - 上传后将本地草稿切换为已上传引用

3. **阶段 C：本地丢弃与清理策略**
   - 支持手动删除未上传草稿
   - 明确草稿清理时机

#### 1.4 预计涉及文件

后续若实施，预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. `src/features/personal-workbench/hooks/use-media-recorder.ts`
3. 可能新增：
   - `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
   - `src/features/personal-workbench/services/local-media-draft-store.ts`

#### 1.5 风险与破坏性评估

本轮重规划的主要风险点：

1. 若本地草稿模型与当前直接上传模型混用不清，会导致状态复杂化
2. 若本地持久化没有清理策略，可能造成浏览器存储膨胀
3. 若上传入口与记录保存入口耦合不清，用户会不明白“记录已保存”与“媒体已上传”的区别

因此后续实施必须坚持：

1. 明确区分“本地草稿媒体”与“已上传媒体”
2. 明确区分“保存记录”与“上传媒体”两个动作
3. 本地媒体必须有可见的丢弃和清理策略

#### 1.6 验证策略

后续若进入实现，至少需要验证：

1. 拍照/录视频后媒体先落本地，不自动上传
2. 用户点击“上传到服务器”后才进入现有上传链
3. 未上传媒体可手动丢弃
4. 页面刷新后本地草稿仍可恢复
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮重规划明确暂不做：

1. 分片上传
2. 视频增强
3. `Video_Ref` 转发协议升级
4. 自动封面抽帧
5. 多端自动同步本地草稿

#### 1.8 当前阶段结论

个人记录媒体能力的后续方向，应该从“默认上传”切换为“本地优先、手动上传、可丢弃”。这更符合个人缓冲区的私有属性，也更符合手机采集、电脑处理的实际工作流。后续若继续推进，应先围绕本地草稿模型与手动上传入口重新设计，再决定是否进入云端协议和业务流转层。

### 1. plan：个人记录本地草稿模型与 IndexedDB 暂存（第一小步）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

既然个人记录媒体能力已经明确要走“本地优先、手动上传、可丢弃”，那么第一步不应直接上“上传到服务器”按钮，而应先完成本地基础层：

1. 本地草稿媒体模型
2. 浏览器本地持久化
3. 页面刷新后的草稿恢复

没有这层基础，后续“手动上传”和“本地丢弃”都会缺少稳定承载点。

#### 1.2 当前排查结论

##### 1.2.1 第一小步最值得优先做的是本地草稿模型，而不是上传动作本身

当前媒体采集链已经具备：

1. 图片采集
2. 相机拍照
3. 10 秒视频录制
4. 录制反馈强化

但当前采集结果默认仍直接进入上传链，缺少本地媒体草稿的独立表示层。

因此第一小步最合理的目标，是先把“采集结果 = 本地草稿”这件事定义清楚。

##### 1.2.2 本轮建议采用“本地草稿模型 + IndexedDB 存储服务”最小闭环

建议方案：

1. 定义本地草稿媒体对象
2. 字段至少包括：
   - `id`
   - `kind`（image / video）
   - `status`（draft / uploaded）
   - `blob` 或可恢复引用
   - `createdAt`
   - `durationSeconds`（视频可选）
3. 通过 IndexedDB 做浏览器本地持久化
4. 页面刷新时能恢复草稿列表

#### 1.3 推荐实施策略

本轮建议只做“本地暂存基础层”最小闭环：

1. 新增本地草稿存储服务
2. 新增用于读写草稿的 hook
3. 将图片/视频采集结果先落本地草稿
4. 允许 UI 读到本地草稿，但暂不实现上传按钮
5. 不修改后端协议和现有云端数据结构

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. 新增：`src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. 新增：`src/features/personal-workbench/services/local-media-draft-store.ts`
4. 如需要补充类型：`src/features/personal-workbench/data/schema.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若把 `Blob` 直接和 UI 状态混写，容易造成组件状态过重
2. 若 IndexedDB 封装不清晰，后续手动上传与丢弃逻辑会重复散落
3. 若本地草稿状态与现有云端媒体字段混在一起，后续模型会难以维护

因此本轮必须坚持：

1. 本地草稿模型单独建模
2. IndexedDB 访问集中在独立 service 层
3. UI 只消费 hook 暴露的结果，不直接操作底层数据库

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 拍照后媒体可以写入本地草稿
2. 视频录制后媒体可以写入本地草稿
3. 页面刷新后本地草稿仍可恢复
4. 不支持 IndexedDB 的情况下有清晰降级策略或错误提示
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不实现“上传到服务器”按钮
2. 不做本地草稿删除 UI
3. 不做多端同步
4. 不做转发协议升级
5. 不做云端与本地草稿自动合并

#### 1.8 当前阶段结论

个人记录媒体能力的本地优先路线，第一小步应先补齐“本地草稿模型 + IndexedDB 暂存基础层”。这一步是后续手动上传、草稿丢弃、电脑端处理流程的基础，也是将媒体生命周期从“默认上传”改造成“本地优先”的关键承接层。

### 1. plan：个人记录媒体手动上传入口（下一步）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前本地草稿基础层已经具备：

1. 本地草稿媒体模型
2. IndexedDB 持久化
3. 页面刷新后草稿恢复

但当前仍处于过渡态：采集结果虽然已经先写入本地草稿，但同时仍会默认立即上传到服务器。这与“本地优先、用户决定是否上云”的目标仍不一致。

#### 1.2 当前排查结论

##### 1.2.1 下一步最关键的不是删除能力，而是把上传动作改成显式用户决策

当前已经不缺：

1. 媒体采集能力
2. 本地草稿承载层
3. 草稿恢复能力

真正还没完成的是：

1. 默认即时上传的切断
2. 显式“上传到服务器”动作
3. 本地草稿与云端媒体状态切换

##### 1.2.2 本轮建议采用“仅本地保存 + 手动点击上传”最小闭环

建议方案：

1. 图片/视频采集后仅保存本地草稿
2. UI 中增加“上传到服务器”按钮
3. 点击后才调用现有 `AssetService.uploadFile`
4. 上传成功后更新本地草稿状态，并把云端 URL 回写到当前记录编辑链

#### 1.3 推荐实施策略

本轮建议只做“手动上传入口”最小闭环：

1. 移除图片、拍照、视频录制后的默认即时上传
2. 在媒体面板中让当前草稿可见，并提供上传按钮
3. 上传成功后让当前编辑表单拿到云端 URL
4. 保留本地草稿恢复能力
5. 不做草稿删除 UI

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. `src/features/personal-workbench/services/local-media-draft-store.ts`
4. 如需调整类型：`src/features/personal-workbench/data/schema.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若停止默认上传后没有清晰的上传入口，用户会误以为媒体已经上云
2. 若上传成功后草稿状态与编辑表单值不同步，会造成记录和媒体状态错位
3. 若把“当前使用中的草稿”与“历史草稿列表”混在一起，UI 会变乱

因此本轮必须坚持：

1. 明确展示当前媒体仍为本地草稿
2. 上传成功后统一更新当前表单值与草稿状态
3. 当前先只围绕“当前草稿”闭环，不做复杂草稿中心

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 拍照后不再自动上传，只保存本地草稿
2. 视频录制后不再自动上传，只保存本地草稿
3. 点击“上传到服务器”后才进入现有上传链
4. 上传成功后当前记录可拿到云端 URL
5. 页面刷新后本地草稿仍可恢复
6. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做本地草稿删除 UI
2. 不做多端同步
3. 不做协议升级
4. 不做草稿批量管理
5. 不做本地与云端媒体自动合并

#### 1.8 当前阶段结论

在本地草稿基础层已经落地后，下一步最合理的推进就是补齐“手动上传入口”，并真正停止默认即时上传。只有完成这一步，个人记录媒体能力才会从“技术上具备本地草稿”进入“工作流上真正本地优先”。

### 1. plan：个人记录本地草稿删除/丢弃入口（下一步）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人记录媒体链路已经基本形成：

1. 采集后只保存本地草稿
2. 本地草稿可恢复
3. 用户可手动上传到服务器

但这条链路还缺最后一个关键动作：

1. 不需要的本地草稿如何丢弃

如果没有丢弃入口，本地优先策略就仍然是不完整的，因为用户虽然可以“不上传”，但无法方便地把无价值草稿清掉。

#### 1.2 当前排查结论

##### 1.2.1 下一步最值得补的是当前活跃草稿的删除/丢弃，而不是先做草稿中心

当前已经具备：

1. 本地草稿承载层
2. 手动上传入口
3. 当前草稿预览

真正还没完成的是：

1. 当前活跃草稿的主动清理
2. 本地状态与表单值的同步清空策略

因此下一步应优先围绕“当前活跃草稿”闭环，而不是马上扩成草稿中心或批量管理。

##### 1.2.2 本轮建议采用“当前草稿丢弃 + IndexedDB 同步清理”最小闭环

建议方案：

1. 在当前草稿预览区增加“丢弃”按钮
2. 点击后删除 IndexedDB 中对应草稿
3. 同步清空当前活跃草稿状态
4. 如当前表单媒体值仍依赖该草稿，需要同时清理表单引用

#### 1.3 推荐实施策略

本轮建议只做“当前活跃草稿删除/丢弃”最小闭环：

1. 只处理当前活跃草稿
2. 不做草稿列表页或草稿中心
3. 不做批量删除
4. 已上传草稿仅删除本地草稿记录，不删除云端资源
5. 确保 UI 与本地存储状态同步

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. `src/features/personal-workbench/services/local-media-draft-store.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若丢弃后未同步清空当前表单值，UI 会显示已无效的媒体引用
2. 若已上传草稿被误判为应删除云端资源，会超出本轮边界
3. 若当前活跃草稿状态与草稿列表状态不同步，会出现幽灵草稿

因此本轮必须坚持：

1. 丢弃动作只处理本地草稿层
2. 云端资源删除明确不在本轮范围
3. 当前草稿、草稿列表、表单值三者状态必须同步清理

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 当前未上传草稿可成功丢弃
2. 丢弃后 IndexedDB 中对应草稿被清理
3. 丢弃后当前草稿预览消失
4. 若表单值依赖该草稿，丢弃后表单值同步清空
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做草稿列表中心
2. 不做批量删除
3. 不做云端资源删除
4. 不做多端同步
5. 不做协议升级

#### 1.8 当前阶段结论

在本地草稿基础层与手动上传入口都已经具备后，下一步最合理的推进就是补齐“当前活跃草稿的删除/丢弃入口”。只有这一动作补齐，本地优先、按需上云、不需要即丢弃的工作流才算真正完整。

### 1. plan：快捷扫描右侧边栏接入个人缓冲区快捷媒体入口

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前右侧“快捷扫描”边栏已经具备一套可扩展的 quick action 机制：

1. `quick-action-registry.ts` 维护动作注册表
2. `quick-action-access.ts` 按当前账号权限过滤可见动作
3. `quick-action-drawer.tsx` 负责右侧抽屉展示与点击跳转

但目前这些入口全部是仓库/PDA 业务扫描动作，缺少“归属于当前账号个人缓冲区”的快捷媒体入口。

#### 1.2 当前排查结论

##### 1.2.1 本轮应新增“个人快捷媒体动作”，而不是把个人缓冲区强行塞进仓库扫描语义

当前快捷扫描入口包括：

1. 入库扫描
2. 出货扫描
3. 盘点扫描

这些都属于业务扫描流程。而你提出的：

1. 一键拍照
2. 一键录视频
3. 一键进入个人缓冲区

本质上属于“账号私有快捷采集能力”，因此应新增为独立 quick action，而不是复用仓库扫描动作含义。

##### 1.2.2 本轮建议采用“quick action + 独立 capture 页面 + 主屏幕快捷入口”组合

建议方案：

1. 右侧快捷扫描边栏新增：
   - `个人拍照`
   - `个人录视频`
   - `个人缓冲区`
2. 通过独立页面承接：
   - `/personal-workbench/capture?mode=photo`
   - `/personal-workbench/capture?mode=video`
3. 个人缓冲区入口直达个人记录模块
4. 桌面能力优先设计为“添加到主屏幕快捷入口”，而不是直接把媒体文件写入手机桌面文件系统

#### 1.3 推荐实施策略

本轮建议拆成两个层次：

1. **快捷入口层**
   - 扩展 quick action 类型、注册表、文案和权限过滤
   - 让右侧边栏可显示个人快捷媒体动作

2. **承接页面层**
   - 新增 personal capture 页面
   - 进入即按 query 参数直达拍照或录视频模式
   - 采集结果直接进入当前登录账号的个人缓冲区本地草稿链

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/quick-actions/types.ts`
2. `src/features/quick-actions/data/quick-action-registry.ts`
3. `src/features/quick-actions/services/quick-action-access.ts`
4. `src/features/quick-actions/components/quick-action-drawer.tsx`
5. `src/locales/messages/zh-CN/quickActions.ts`
6. 可能新增：
   - `src/features/personal-workbench/capture/index.tsx`
   - 对应 route 文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接复用当前编辑弹窗，会把弹窗语义与快捷采集模式混在一起
2. 若把个人动作和仓库扫描动作混成同类业务入口，后续权限与文案都会混乱
3. 若把“添加到桌面”误解为“直接写手机桌面文件”，会超出 Web 能力边界

因此本轮必须坚持：

1. 个人快捷动作独立建模
2. 使用独立 capture 页面承接一键模式
3. 桌面能力只承诺“主屏幕快捷入口”或“快捷启动”，不承诺文件直写桌面

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 当前账号可在右侧快捷扫描边栏看到个人快捷媒体入口
2. 点击“个人拍照”可直达拍照模式
3. 点击“个人录视频”可直达录视频模式
4. 点击“个人缓冲区”可直达个人记录模块
5. 采集结果仍归属于当前账号自己的本地草稿/个人缓冲区
6. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做浏览器直接写手机桌面文件系统
2. 不做多端同步
3. 不做草稿中心
4. 不做云端协议升级
5. 不做仓库扫描动作的大规模重构

#### 1.8 当前阶段结论

快捷扫描右侧边栏完全可以承接“账号隔离的一键拍照/一键录视频/个人缓冲区”能力，但应按“个人快捷媒体动作”独立建模，并通过独立 capture 页面承接一键模式。桌面能力建议落为“添加到主屏幕快捷入口”，而不是承诺浏览器直接写手机桌面文件。这样既能保持现有 quick action 架构清晰，又能让个人缓冲区真正进入移动端高频入口。

### 1. plan：方案A - 快捷采集成功后自动打开新建个人记录弹窗

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人快捷采集链路已经具备：

1. 右侧快捷入口
2. 快捷拍照 / 快捷录视频
3. 采集结果进入当前账号的个人本地草稿链

但当前仍存在体验割裂：

1. 快捷采集负责“抢现场”
2. `PersonalWorkbenchCardEditor` 负责“整理成记录”
3. 两者之间还没有自动串起来

这会让用户感觉弹窗没有直接参与快捷采集闭环。

#### 1.2 当前排查结论

##### 1.2.1 方案A最合理：采集成功后直接把媒体带入“新建个人记录”弹窗

当前最佳结合方式不是取消弹窗，而是重定义职责：

1. 快捷入口负责快速采集现场媒体
2. 新建个人记录弹窗负责补齐标题、备注、分栏
3. 快捷采集成功后自动唤起弹窗，并把最新草稿媒体回填进去

##### 1.2.2 本轮需要增加“快捷采集页 -> 记录弹窗”的桥接状态

建议方案：

1. 在快捷采集页中记录最近一次成功采集的草稿 id
2. 成功后自动打开 `PersonalWorkbenchCardEditor`
3. `PersonalWorkbenchCardEditor` 支持读取该草稿并显示为当前媒体
4. 用户仅需补充记录信息后保存

#### 1.3 推荐实施策略

本轮建议只做最小闭环：

1. 快捷拍照成功后自动打开新建弹窗
2. 快捷录视频成功后自动打开新建弹窗
3. 弹窗自动回填当前草稿媒体
4. 保持原有普通“新建记录”入口不变
5. 不做草稿中心或多记录选择器

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/capture/index.tsx`
2. `src/features/personal-workbench/components/personal-workbench-card-editor.tsx`
3. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
4. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
5. 如需承接状态：新增或调整 `personal-workbench` 内部页面状态管理

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若桥接状态设计不好，可能导致弹窗打开但拿不到刚采集的草稿
2. 若把快捷采集态和普通编辑态混在一起，可能误伤原有新建记录流程
3. 若弹窗只回填媒体但没有明确提示，用户会不理解媒体来源

因此本轮必须坚持：

1. 仅在快捷采集成功后触发自动打开弹窗
2. 普通新建入口保持原行为
3. 弹窗中明确体现“已带入刚采集媒体”的语义

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 快捷拍照成功后自动打开新建个人记录弹窗
2. 快捷录视频成功后自动打开新建个人记录弹窗
3. 弹窗中能看到刚采集的草稿媒体
4. 用户补充标题/备注/分栏后可正常保存记录
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做草稿中心
2. 不做多条草稿切换器
3. 不做多端同步
4. 不改后端协议
5. 不改仓库扫描入口逻辑

#### 1.8 当前阶段结论

方案A是当前最合理的结合方式：保留快捷采集入口负责“抢现场”，保留个人记录弹窗负责“整理记录”，并通过“采集成功后自动打开弹窗并回填草稿媒体”把两者真正打通。这样既不破坏现有模块边界，又能形成完整顺畅的个人记录闭环。

### 1. plan：快捷扫描个人卡片增加“放到桌面”入口

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前快捷扫描侧边栏已经具备：

1. 个人拍照
2. 个人录视频
3. 个人缓冲区

但这些入口仍停留在“应用内入口”层面，缺少更直接的移动端高频入口。用户期望在侧边栏卡片上直接看到“放到桌面”能力，让个人拍照/录视频/缓冲区变成更接近系统桌面图标的入口。

#### 1.2 当前排查结论

##### 1.2.1 Web 里最合理的“放到桌面”实现，不是直接创建系统桌面文件，而是 PWA 安装 / 添加到主屏幕

本项目当前已有：

1. `public/manifests/wheel-trace.webmanifest`
2. `public/sw.js`

因此最合理的实现方向是：

1. 优先使用浏览器提供的安装能力（如 `beforeinstallprompt`）
2. 浏览器不支持时，降级展示“添加到主屏幕”的操作指引
3. 将“个人拍照 / 个人录视频 / 个人缓冲区”映射为可安装入口或安装后直达路径

##### 1.2.2 当前需要解决两个层面的问题

1. **入口层**：在快捷扫描卡片上增加“放到桌面”按钮或次级操作
2. **目标层**：安装后的入口要能直达：
   - `/personal-workbench/capture?mode=photo`
   - `/personal-workbench/capture?mode=video`
   - `/personal-workbench`

#### 1.3 推荐实施策略

本轮建议按最小可落地能力实施：

1. 在快捷扫描卡片上增加“放到桌面”操作入口
2. 建立前端安装能力探测（是否可触发安装提示、是否已安装）
3. 若浏览器支持安装，则弹出安装引导
4. 若浏览器不支持安装，则展示对应设备的“添加到主屏幕”文本提示
5. 对三个个人入口分别带上目标路径参数，保证安装后能落到对应页面

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/quick-actions/components/quick-action-drawer.tsx`
2. `src/features/quick-actions/data/quick-action-registry.ts`
3. `src/features/quick-actions/types.ts`
4. `src/features/quick-actions` 下新增安装能力 hook 或 service
5. `public/manifests/wheel-trace.webmanifest`（如需补充 shortcuts）
6. `walkthrough.md`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 不同浏览器对安装能力支持差异较大
2. iOS Safari 通常没有标准 `beforeinstallprompt`，只能走手动指引
3. 若把“放到桌面”设计成主按钮，可能影响现有卡片点击跳转主流程

因此本轮必须坚持：

1. “放到桌面”作为次级操作，不破坏卡片主点击行为
2. 安装能力检测失败时必须优雅降级
3. 不承诺浏览器外的原生系统快捷方式能力

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 快捷扫描卡片出现“放到桌面”入口
2. 支持安装的浏览器能触发安装引导
3. 不支持安装的浏览器能看到合理的添加到主屏幕提示
4. 个人拍照 / 个人录视频 / 个人缓冲区能分别映射到正确目标
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做原生 App 壳
2. 不做浏览器外系统级快捷方式写入
3. 不做桌面端独立打包
4. 不改个人记录后端协议

#### 1.8 当前阶段结论

“放到桌面”应该被设计为快捷扫描个人卡片上的次级操作，并基于 PWA 安装 / 添加到主屏幕能力实现，而不是承诺超出 Web 能力边界的系统级桌面文件写入。只要把安装能力探测、降级指引和目标路径映射三件事做好，这个入口就能成为个人拍照 / 录视频 / 缓冲区的高频快捷链路。

### 1. plan：个人记录缓冲区 404 / 500 / Dialog 可访问性警告修复

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户反馈个人记录缓冲区存在三个表象问题：

1. 接口 404
2. 完整页面 500
3. Dialog 可访问性警告

经前后端链路排查后，三者并不完全同根。

#### 1.2 当前排查结论

##### 1.2.1 个人缓冲区接口 404 更像环境 / 部署同步问题，不像前端路径写错

当前已确认：

1. 前端 service 请求的是 `/personal-workbench/records`
2. `apiFetch` 会统一拼接为 `/api/v1/personal-workbench/records`
3. 后端存在对应路由：
   - `GET /personal-workbench/records`
   - `POST /personal-workbench/records`
   - `POST /personal-workbench/records/reorder`
   - `PATCH /personal-workbench/records/:id`

因此 404 更可能是：

1. 当前部署环境后端版本未同步
2. 代理未放通 `/api/v1/personal-workbench/*`
3. 运行中的服务未注册该路由组

本轮前端不应误改 service 路径去“撞”出一个假修复。

##### 1.2.2 完整页面 500 是前端缺少 query 错误兜底导致的放大结果

当前个人缓冲区完整页和弹窗链路均直接依赖 `usePersonalWorkbenchRecords()`，但尚未对 query error 做清晰兜底。若接口 404 或返回结构异常，错误会被上抛并最终落到全局错误边界，表现为整页 500。

##### 1.2.3 Dialog warning 大概率来自嵌套 Dialog 结构

当前结构中：

1. `PersonalWorkbenchDialog` 是外层缓冲区弹窗
2. `PersonalWorkbenchCardEditor` 是内层编辑弹窗

这属于典型的 `Dialog` 套 `Dialog` 结构，容易引发 focus trap、`aria-describedby` 或其它可访问性警告。

#### 1.3 推荐实施策略

本轮建议按“止血优先”实施：

1. 先给个人缓冲区完整页补错误兜底
2. 再给个人缓冲区弹窗补错误兜底
3. 调整个人缓冲区弹窗与编辑弹窗的打开方式，避免嵌套 `Dialog`
4. 将 404 保留为环境核对项，在文档中明确说明

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/index.tsx`
2. `src/features/personal-workbench/components/personal-workbench-dialog.tsx`
3. `src/features/personal-workbench/components/personal-workbench-card-editor.tsx`
4. `src/features/personal-workbench/hooks/use-personal-workbench-dialog-store.ts`
5. `walkthrough.md`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若错误兜底做得过重，可能掩盖真实 404 环境问题
2. 若调整弹窗结构时改动过大，可能影响当前“新建记录 / 编辑记录”交互
3. 若同时大改完整页和弹窗编排，容易扩大任务面

因此本轮必须坚持：

1. 前端只做错误兜底与弹窗结构修正，不改接口路径
2. 普通新建 / 编辑记录体验尽量保持不变
3. 通过最小方式解除嵌套 `Dialog`

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 个人缓冲区接口异常时，完整页不再直接 500
2. 个人缓冲区弹窗在接口异常时能显示错误态或空态
3. 新建 / 编辑记录流程仍可正常打开
4. Dialog 可访问性警告显著减少或消失
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改个人记录后端协议
2. 不重构个人记录整体模块架构
3. 不在前端伪造兼容路径掩盖 404 环境问题

#### 1.8 当前阶段结论

`t81` 的最小正确修法不是盲目改接口地址，而是区分三类问题：把 404 作为环境同步核对项记录下来，把 500 作为前端错误兜底缺失来修，把 Dialog warning 作为嵌套弹窗结构问题来处理。这样既能先止住用户可见故障，又不会因为误判而把问题越修越乱。

### 1. plan：个人缓冲区快捷采集链路分阶段加固

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人缓冲区快捷采集链路已经形成完整主闭环：

1. 右侧快捷扫描入口
2. 个人拍照 / 个人录视频
3. 本地媒体草稿
4. 自动打开新建个人记录弹窗
5. 手动上传 / 丢弃
6. 个人缓冲区页 / 弹窗
7. 放到桌面

但经过复核后，当前链路虽然可用，仍存在若干高优先级鲁棒性问题和后续升级空间。

#### 1.2 当前排查结论

##### 1.2.1 第一阶段（必修）：本地草稿账号隔离不足是当前最大真实漏洞点

当前 `PersonalLocalMediaDraft` 与 IndexedDB 草稿存储中未见明确账号字段，这意味着同一浏览器内若发生账号切换，不同账号理论上可能看到同一批本地草稿。

这是当前最需要优先修复的问题。

##### 1.2.2 第二阶段（次优先级）：状态源与交互策略仍偏脆弱

当前主要包括：

1. 草稿预览、本地草稿状态、上传后的 `coverImageUrl` 仍是多状态源并存
2. 快捷采集保存成功后的下一步去向不够明确
3. 自动录视频策略虽然接近“直达”，但在移动端兼容性和心理预期上偏激进

##### 1.2.3 第三阶段（增强）：当前链路仍可继续产品化

后续值得增强的方向包括：

1. 待整理草稿队列
2. manifest shortcuts
3. 更明确的草稿状态机

#### 1.3 推荐实施策略

本轮建议严格按三阶段推进，不并行摊大：

1. **第一阶段：必修**
   - 只修本地草稿账号隔离
   - 不顺手改其它交互

2. **第二阶段：次优先级**
   - 在账号隔离稳定后，再收敛状态源与保存后去向
   - 评估自动录视频从“自动开始”改为“自动准备 + 用户确认开始”是否更稳

3. **第三阶段：增强**
   - 再引入草稿队列、manifest shortcuts、状态机

#### 1.4 第一阶段预计涉及文件（必修）

预计优先涉及：

1. `src/features/personal-workbench/data/schema.ts`
2. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. `src/features/personal-workbench/services/local-media-draft-store.ts`
4. 可能需要读取当前账号信息的 store 文件

#### 1.5 第一阶段风险与破坏性评估

第一阶段主要风险：

1. 若直接修改草稿结构但不兼容旧数据，可能导致旧草稿读取异常
2. 若账号字段来源选错，可能造成误过滤或空列表
3. 若把隔离逻辑写到 UI 层而不是数据层，后续仍会漏口子

因此第一阶段必须坚持：

1. 在草稿数据层完成账号隔离
2. 对旧草稿做最小兼容
3. 不在本阶段顺手改 capture 页或编辑弹窗交互

#### 1.6 第二阶段风险与重点

第二阶段重点：

1. 统一草稿预览 / 上传结果 / 表单值的单一真相来源
2. 明确保存成功后的下一步动作
3. 平衡自动录视频的“直达感”与“可控感”

##### 1.6.1 第二阶段建议的具体实施方向

本阶段建议拆成三个最小改动点：

1. **状态源收敛**
   - 以“当前选中的媒体草稿 / 已上传媒体引用”作为更清晰的主状态
   - 减少 `value`、`activeDraft`、`activeDraftPreviewUrl` 在多个分支中共同决定 UI 的情况
   - 目标不是重写整个媒体面板，而是先把显示逻辑收成更单一的判断链

2. **保存后去向明确**
   - 当前快捷采集保存成功后缺少稳定明确的后续动作
   - 本阶段应明确至少一种默认策略，例如：
     - 保存后留在当前采集页，方便继续下一条
     - 或保存后返回个人缓冲区
   - 同时避免出现“保存成功但用户不知道下一步发生了什么”的悬空状态

3. **自动录视频策略优化**
   - 将当前“相机就绪后自动开始录制”调整为更稳的“自动打开相机并进入录制准备态”
   - 用户手动点开始录制，从而兼顾：
     - 浏览器兼容性
     - 用户心理预期
     - 现场录制可控性

##### 1.6.2 第二阶段预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
2. `src/features/personal-workbench/capture/index.tsx`
3. `src/features/personal-workbench/components/personal-workbench-card-editor.tsx`

##### 1.6.3 第二阶段实施边界

本阶段必须坚持：

1. 不推翻第一阶段已经完成的本地草稿账号隔离实现
2. 不引入第三阶段的草稿队列或状态机
3. 以最小编排调整换取更稳的用户感知与更低的状态复杂度

第二阶段风险在于：

1. 容易扩大到整体媒体面板重构
2. 若状态源收敛方式选错，可能误伤现有上传 / 丢弃链路

#### 1.7 第三阶段风险与重点

第三阶段更偏增强：

1. 待整理草稿队列会引入新的编排状态
2. manifest shortcuts 受浏览器实现差异影响
3. 草稿状态机会扩大 schema 与存储迁移面

##### 1.7.1 第三阶段建议的具体实施方向

第三阶段建议拆成三个增强模块：

1. **待整理草稿队列**
   - 将“采一条 -> 立刻整理一条”的当前模型，增强为“采集后进入待整理队列”
   - 允许用户在连续拍摄/录制后，按顺序整理多条草稿
   - 目标是提升高频现场采集场景的效率

2. **manifest shortcuts**
   - 在现有“放到桌面”能力之外，评估以标准 PWA shortcuts 方式提供：
     - 个人拍照
     - 个人录视频
     - 个人缓冲区
   - 目标是减少浏览器对动态切换 manifest 的不确定性影响

3. **本地草稿状态机**
   - 将当前相对粗糙的草稿状态增强为更明确的阶段，例如：
     - `local_draft`
     - `uploading`
     - `uploaded`
     - `linked_to_record`
   - 为后续草稿清理、恢复与队列处理打基础

##### 1.7.2 第三阶段预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/data/schema.ts`
2. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. `src/features/personal-workbench/services/local-media-draft-store.ts`
4. `src/features/personal-workbench/capture/index.tsx`
5. `src/features/personal-workbench/components/personal-workbench-card-editor.tsx`
6. `src/features/quick-actions/components/quick-action-drawer.tsx`
7. `public/manifests/*.webmanifest`

##### 1.7.3 第三阶段实施边界

本阶段必须坚持：

1. 不回退第一阶段已完成的账号隔离
2. 不回退第二阶段已完成的录制准备态与保存后默认流转
3. 先做增强编排，不扩散到个人记录后端协议

##### 1.7.4 第三阶段验证重点

第三阶段除 `pnpm exec tsc --noEmit` 外，还应重点验证：

1. 连续采集多条草稿后能顺序整理
2. shortcuts 不破坏现有放到桌面入口
3. 新状态机不破坏上传 / 丢弃 / 回填链路

因此第三阶段不应在前两阶段未稳定前提前实施。

#### 1.8 验证策略

三阶段都至少应覆盖：

1. `pnpm exec tsc --noEmit` 通过

其中：

1. 第一阶段重点验证账号切换后本地草稿不串数据
2. 第二阶段重点验证保存后流转与媒体显示一致性
3. 第三阶段重点验证新增增强能力不破坏现有闭环

#### 1.9 当前阶段结论

后续修复不应继续一锅端推进，而应按“先堵真实漏洞，再收敛状态与交互，最后做产品增强”的顺序实施。第一阶段必须优先修掉本地草稿账号隔离，这是当前最硬的漏洞点；其余优化应在隔离稳定后逐段推进。

### 1. plan：个人缓冲区更深层增强（历史迁移 / 队列批量 / shortcuts 兼容）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

前三阶段已经把个人缓冲区快捷采集链路补成了较完整前端闭环，但仍有三类更深层增强值得继续推进：

1. 历史旧草稿状态批量迁移
2. 更复杂的队列优先级与批量操作
3. 浏览器对 shortcuts 展示一致性的兼容增强

这些内容不再属于“当前闭环缺口”，但属于从“可用”走向“长期稳定可维护”的下一层增强。

#### 1.2 当前排查结论

##### 1.2.1 历史旧草稿状态目前仍主要依赖运行时兼容，而非显式迁移

当前状态机已经扩成：

1. `local_draft`
2. `uploading`
3. `uploaded`
4. `linked_to_record`

但历史 IndexedDB 里的旧草稿仍可能停留在旧语义，当前更多依赖运行时容忍，而不是显式批量迁移。

##### 1.2.2 待整理队列已成形，但还缺更高阶的操作能力

当前已支持顺序整理下一条草稿，但仍缺：

1. 优先级调整
2. 跳过某条
3. 批量清理已关联记录的草稿

##### 1.2.3 shortcuts 已接入，但跨浏览器一致性仍不稳定

当前 manifest 已补 shortcuts，但不同浏览器、不同安装路径、不同缓存策略下，展示效果仍可能不一致，因此还需要更明确的兼容策略与降级说明。

#### 1.3 推荐实施策略

本轮建议仍按“分层加固”执行，但不再拉成新三阶段，而是在同一轮里按先后顺序完成三块增强：

1. **先做历史草稿状态批量迁移**
   - 把旧状态在本地存储层统一校正

2. **再做队列优先级 / 批量操作**
   - 在 capture 页或相关编排层增加更高阶的队列管理能力

3. **最后做 shortcuts 兼容增强**
   - 在不破坏现有放到桌面与 shortcuts 的前提下补兼容策略

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/data/schema.ts`
2. `src/features/personal-workbench/hooks/use-local-media-drafts.ts`
3. `src/features/personal-workbench/services/local-media-draft-store.ts`
4. `src/features/personal-workbench/capture/index.tsx`
5. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
6. `src/features/quick-actions/components/quick-action-drawer.tsx`
7. `public/manifests/*.webmanifest`
8. 可能补充快捷入口文案文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若旧草稿迁移策略写错，可能导致历史草稿不可见或状态错乱
2. 若批量操作过多堆进当前 capture 页，可能再次把编排复杂度拉高
3. 若 shortcuts 兼容策略处理不当，可能让当前已经可用的安装入口变得更混乱

因此本轮必须坚持：

1. 迁移逻辑优先在本地数据层完成
2. 队列增强保持最小可理解交互，不做过重的任务管理 UI
3. shortcuts 兼容增强以补充说明和标准入口为主，不回退现有能力

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 历史旧草稿在升级后仍可读，且状态被映射到新状态机
2. 队列支持至少一种优先级/批量操作而不破坏现有顺序整理
3. shortcuts 兼容增强不破坏现有放到桌面入口
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改个人记录后端协议
2. 不重写整个 capture 页为独立任务中心
3. 不承诺不同浏览器 shortcuts 完全一致的原生体验

#### 1.8 当前阶段结论

这轮更深层增强应被视为“长期稳定性与产品化补强”，而不是当前闭环的补洞。正确做法是：先把历史旧草稿迁移问题收掉，再给队列补最低必要的优先级/批量操作，最后对 shortcuts 做跨浏览器兼容增强。这样能继续往深处走，但不会把已经稳定的前三阶段重新打乱。

### 1. plan：个人工作收纳箱第一批 MVP（便签 + 链接）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前个人缓冲区已经较适合承接“现场媒体草稿”，但对另一类高频工作信息仍没有合适容器：

1. 随手复制的一段文本
2. 某个网站网址或后台入口
3. 临时备注、说明、个人工作上下文

这类数据有价值，但又不适合硬塞进正式业务模块，也不适合继续套当前偏媒体/记录卡片的形态。

#### 1.2 当前排查结论

##### 1.2.1 第一批最值得先做的是便签与链接，而不是一上来做全类型工作收纳箱

当前最直接的痛点是“杂乱信息无处收”，其中价值最高、建模最清晰的两类就是：

1. **便签**
   - 直接粘贴文本
   - 用较大容器展示
   - 用于承接随手记下的工作内容

2. **链接**
   - 通过 `+` 号新增
   - 保存 URL 与备注
   - 用于承接后台入口、网站地址、查询页等零散链接

##### 1.2.2 第一批不应过早扩成联系人/提醒/复杂标签系统

若一开始把类型做得过多，会拉高信息模型、UI 编排和后续筛选复杂度。当前更合理的做法是：先用最小 MVP 验证“边缘工作数据容器”是否真能承接大量杂乱信息。

#### 1.3 推荐实施策略

本轮建议将“个人工作收纳箱”作为独立于个人媒体缓冲区的轻量前端容器来实现，但第一批只做：

1. **便签**
   - 支持标题 + 文本内容
   - 样式上采用更大的便签容器，而不是媒体卡片心智

2. **链接**
   - 支持标题（可选）+ URL + 备注
   - 提供明显的 `+` 号新增入口

3. **列表展示**
   - 允许同页混合展示便签与链接
   - 更偏工作收纳视图，不做媒体墙

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/` 下新增工作收纳箱相关 data / hooks / components / page
2. 可能补充到个人工作台入口或快捷入口
3. 相关本地存储封装文件
4. 中文文案文件

根据用户偏好，能解耦的内容尽量拆成单独文件，避免继续堆进已有媒体链路文件中。

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若继续复用“个人卡片”心智，可能导致 UI 看起来仍像被硬塞进不合适的容器
2. 若一开始把类型做太多，后续筛选、排序和交互会快速失控
3. 若直接耦合正式业务对象，会过早把边缘工作数据重新推回业务模块复杂度

因此本轮必须坚持：

1. 先把它当成独立的个人工作收纳能力
2. 第一批只做便签与链接
3. 默认独立存在，不强绑定正式业务对象

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 便签可直接新增、展示、编辑、删除
2. 链接可通过新增入口创建，并保存 URL 与备注
3. 便签与链接能稳定渲染在同一工作收纳视图
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不做联系人类型
2. 不做提醒/待办类型
3. 不做复杂标签/筛选系统
4. 不做与订单/客户/设备等正式业务对象的关联
5. 不改当前个人媒体缓冲区已稳定链路

#### 1.8 当前阶段结论

当前最合理的切入点不是继续泛化“个人卡片”，而是单独引入一个更适合承接边缘工作数据的“个人工作收纳箱”。第一批只做便签与链接，已经足以解决大量文本片段、网址入口和零散备注无处存放的问题，同时又不会把信息模型和 UI 复杂度拉得过高。

### 1. plan：问题修复（personal-workbench 权限映射 / service worker warning / notifications websocket）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在个人工作收纳箱 MVP 接入后，当前前端运行中出现了 3 类问题：

1. `permission-catalog` 报错：`Unmapped top-level path: /personal-workbench`
2. 浏览器 warning：service worker fetch handler is recognized as no-op
3. `useNotifications` 记录 websocket socket error

其中第一项已明确影响权限生成链路，第二项属于实现质量 warning，第三项仍需先区分前端现象与后端/代理根因。

#### 1.2 当前排查结论

##### 1.2.1 `/personal-workbench` 权限映射缺失是当前最明确、最应优先修复的问题

当前权限生成链路中：

1. `route-permissions-generator.ts` 会对所有 authenticated route 调用 `getMenuPermissionForPath`
2. `permission-catalog.ts` 中 `ROUTE_TO_MENU_MAPPING` 未覆盖 `/personal-workbench`
3. 因此在生成 route permission 时直接抛出 `Unmapped top-level path: /personal-workbench`

这属于权限契约缺口，必须补齐。

##### 1.2.2 `public/sw.js` 的 fetch 监听器确实是 no-op

当前 `public/sw.js` 中存在：

1. `self.addEventListener('fetch', () => {})`

浏览器会将其识别为 no-op fetch handler，并给出“可能带来导航开销”的 warning。若当前并未做 runtime caching，则可以直接移除该 handler。

##### 1.2.3 notifications websocket error 目前更像现象，不足以直接认定前端为根因

当前 `use-notifications.ts` 中：

1. 页面加载后会直接建立 `/api/v1/ws?token=...` WebSocket
2. `socket.onerror` 仅记录 error 并关闭 socket
3. `socket.onclose` 固定 5 秒重连

但从现有信息不足以判断是：

1. 后端 websocket 服务不可用
2. 代理层未转发 upgrade
3. token 失效或握手失败
4. 前端日志策略过于频繁，放大了本来可接受的连接失败

因此本轮不应臆造“前端一定是根因”的补丁。

#### 1.3 推荐实施策略

本轮建议按以下顺序处理：

1. **先修 permission catalog 映射缺口**
   - 补 `/personal-workbench` 的 menu 映射
   - 必要时同步覆盖其子路由

2. **再清理 service worker no-op fetch handler**
   - 若当前没有 runtime caching，就直接删除空 handler

3. **最后处理 notifications websocket**
   - 先做前端最小诊断增强或降噪
   - 不在根因未明前做重补丁式改造

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/authz/data/permission-catalog.ts`
2. 可能涉及 `src/features/authz/data/route-permissions-generator.ts` 或相关 registry
3. `public/sw.js`
4. `src/hooks/use-notifications.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若错误补 permission mapping，可能引入新的权限契约漂移
2. 若过度改 service worker，可能影响现有 PWA 安装能力
3. 若在未确认根因前大改 websocket 重连逻辑，可能掩盖真实后端或代理问题

因此本轮必须坚持：

1. 权限映射修复要对齐现有 permission contract 体系
2. service worker 只做 no-op handler 清理，不额外引入缓存策略
3. websocket 先做根因区分与最小前端修正，不靠猜测乱补

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 权限生成不再对 `/personal-workbench` 抛出 unmapped top-level path
2. 浏览器不再提示 no-op fetch handler warning
3. websocket 若仍失败，前端日志至少能更明确区分错误上下文，不制造误导
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不重写整套权限系统
2. 不新增 service worker runtime cache
3. 不在缺少后端证据时断言 websocket 问题只能由前端修复

#### 1.8 当前阶段结论

这轮问题里，真正确定且应优先修的是 `/personal-workbench` 的 permission catalog 映射缺口；service worker warning 可作为低风险质量修复一起带掉；notifications websocket error 则应坚持“先分清根因，再做最小改动”，避免把后端或代理层问题误包成前端补丁。

### 1. plan：personal-workbench 顶部统一 Tab 结构

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前“个人记录缓冲区”和“工作收纳箱”已经在功能上分离，但入口仍是：

1. 默认停留在个人记录缓冲区页面
2. 通过右上角按钮跳转到工作收纳箱

这虽然符合底层隔离原则，但从产品体验看不够直观，也与系统内常见的 Tab 切换心智不一致。

#### 1.2 当前排查结论

##### 1.2.1 当前问题主要在入口体验，而不是底层能力缺失

便签与链接功能当前已经存在，问题在于：

1. 用户进入 `/personal-workbench` 后第一眼只看到原来的四栏记录看板
2. 工作收纳箱入口退化成一个普通按钮，存在“功能做了但用户感知不到”的问题

##### 1.2.2 更合理的做法是统一为 Tab，而不是重新混合两套数据结构

当前更合适的调整是：

1. 顶部使用统一 Tab 结构
2. 提供 `个人记录缓冲区 / 工作收纳箱` 两个视图
3. 保持底层数据、存储和 hook 继续分离

也就是说，统一的是 UI 入口，不是底层模型。

#### 1.3 推荐实施策略

本轮建议按最小 UI 重构处理：

1. 在 `/personal-workbench` 顶部引入 Tab
2. 默认仍落在个人记录缓冲区 Tab
3. 工作收纳箱作为并列 Tab 展示
4. 若需要，可保留独立子路由作为直接访问入口，但主体验以 Tab 为准

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/index.tsx`
2. 可能新增或拆分 `personal-workbench` 页面级编排组件
3. `src/features/personal-workbench/workspace/index.tsx`（若需要调整为可嵌入视图）
4. 可能涉及 `src/routes/_authenticated/personal-workbench*` 的最小路由协调

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接把工作收纳箱逻辑塞回原页面，可能破坏当前隔离
2. 若同时保留子路由和 Tab，但状态同步处理不好，可能造成入口重复或体验混乱
3. 若改动过大，可能误伤当前已经稳定的媒体缓冲区链路

因此本轮必须坚持：

1. 只统一入口体验
2. 不回退独立存储与独立 hook
3. 能拆则拆，不把两套能力重新堆叠进一个大文件

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 进入 `/personal-workbench` 后能清晰看到两个 Tab
2. `个人记录缓冲区` 和 `工作收纳箱` 都可正常切换
3. 便签/链接与媒体记录仍各自独立工作
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不重新设计工作收纳箱信息模型
2. 不新增联系人/提醒等新类型
3. 不把便签/链接混入现有记录分栏看板数据结构

#### 1.8 当前阶段结论

当前最合理的下一步不是继续加按钮，而是把 `/personal-workbench` 顶部统一为 Tab 结构。这样既能让“个人记录缓冲区”和“工作收纳箱”在入口体验上与系统整体风格统一，又能继续保持底层实现的隔离，避免因为 UI 合并而把数据模型重新搅在一起。

### 1. plan：组织人事导航重构（新增独立侧边栏分组并整体挂载 /personnel）

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前虽然已经把“人事账号中心”命名升级为“组织人事”，但它仍然挂在“系统配置”分组下，信息架构仍不合理：

1. “组织人事”在语义上不应继续作为“系统配置”的子项
2. 当前入口虽然改名，但用户心智上仍会把它视为系统配置附属功能
3. 这与后续需要独立扩展组织、人事、账号等能力的方向不一致

现有结构会越来越难扩展，导航与权限语义也会逐步失真。

#### 1.2 当前排查结论

##### 1.2.1 当前核心问题不是单个页面拥挤，而是导航层级设计已经不适合继续扩展

当前风险主要在于：

1. 用一个超大 Tab 容器承接越来越多异质能力
2. KPI/绩效这类能力与账号权限并不属于同一平级 Tab 心智
3. 后续菜单权限、路由权限、页面职责都会越来越混乱

##### 1.2.2 当前更稳的第一步不是细拆内部结构，而是先独立出侧边栏分组

考虑到当前希望先避免引入 `KPI绩效` 和更多子分组，本轮更稳的方案是：

1. 新增一个独立侧边栏分组：**组织人事**
2. 第一轮先仅挂载当前 `/personnel` 入口
3. 内部页面结构与 Tab 先保持不变
4. 后续如用户接受，再继续拆成 `组织人员`、`账号权限` 等更细分组

这样能先把入口层级校正过来，同时避免一次性改得过猛。

#### 1.3 推荐实施策略

本轮建议先做最小侧边栏重构，而不是一上来细拆所有子页面：

1. 新增独立侧边栏分组“组织人事”
2. 将当前 `/personnel` 入口从“系统配置”组迁出并挂入新分组
3. 保持现有内部页面结构尽量不变
4. 等后续需求更明确后，再决定是否继续细拆二级分组

#### 1.4 预计涉及文件

预计优先涉及：

1. 侧边栏 / 导航数据定义文件
2. 当前 `/personnel` 入口所在分组配置
3. 可能涉及相关权限映射文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若侧边栏分组迁移与权限映射不同步，可能引入新的权限契约问题
2. 若在迁移时误改其他系统配置项归属，可能破坏现有导航顺序
3. 若第一轮就继续细拆页面分组，任务范围会失控

因此本轮必须坚持：

1. 先只改侧边栏分组与入口归属，不先做全面页面重写
2. 权限映射与菜单入口同步梳理
3. `KPI绩效` 本轮不接入

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 侧边栏中能看到独立的“组织人事”分组
2. 当前 `/personnel` 入口已从“系统配置”中迁出并挂在新分组下
3. 当前原有人事相关功能仍能正常进入
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不一次性重写所有人事相关页面
2. 不接入 `KPI绩效`
3. 不细拆组织人员 / 账号权限等子分组
4. 不在导航重构阶段顺手扩散到无关模块

#### 1.8 当前阶段结论

当前最稳的第一步不是马上细拆“组织人事”内部结构，而是先把它从“系统配置”中独立出来，成为一个真正独立的侧边栏分组，并先整体挂载当前 `/personnel` 入口。这样既能校正导航层级，又能为后续是否细拆留下空间。

### 1. plan：`/personnel/leave` 与 `/personnel/stats` 本地化收口

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前“组织人事”模块下新增的两个 Tab：

1. `/personnel/leave`
2. `/personnel/stats`

虽然路由已经接通，但页面内仍残留明显的中英混排文案，导致中英文模式切换时体验不一致，破坏系统整体语言规范。

#### 1.2 当前排查结论

##### 1.2.1 `leave-management.tsx` 存在典型的硬编码混排

当前已看到：

1. 标题使用英文 `Online Leave Requests`
2. 描述使用中文 `全数字化请假申请与审批追踪系统`
3. 页面内部分统计标签、按钮与提示仍是直接硬编码

这说明该页未完整接入 `orgPersonnel` 语言包。

##### 1.2.2 `personnel-statistics.tsx` 存在更明显的中英混合展示

当前已看到：

1. 荣誉榜标题使用英文 `Excellent Employee Hall of Fame`
2. 描述使用中文
3. 列表表头、单位和明细说明混合出现中文与英文缩写，例如 `Yrs`、`天请假`、`年`

这说明不仅标题文案未本地化，连单位与细节标签也未完成语言抽象。

##### 1.2.3 `leave-display.ts` 也可能是本轮必须一起收口的底层点

当前该文件中：

1. `leaveStatusLabelMap` 固定为中文
2. `leaveTypeLabelMap` 固定为中文
3. `Intl.DateTimeFormat` 固定写死 `zh-CN`

如果 `/personnel/leave` 页面继续使用这些工具函数，那么仅改页面 JSX 文案仍不足以彻底解决中英文模式切换问题。

#### 1.3 推荐实施策略

本轮建议按最小但完整的方式修复：

1. 先补齐 `orgPersonnel` 的中英文语言包字段
2. 再把 `leave-management.tsx` 与 `personnel-statistics.tsx` 改为统一走 `t(...)`
3. 最后检查 `leave-display.ts` 是否需要改成接收 locale / translate 参数，或拆出语言感知版本的展示 helper

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/org-personnel/tabs/leave-management.tsx`
2. `src/features/org-personnel/tabs/personnel-statistics.tsx`
3. `src/locales/messages/zh-CN/orgPersonnel.ts`
4. `src/locales/messages/en-US/orgPersonnel.ts`
5. `src/features/org-personnel/data/leave-display.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若只改页面标题而不改底层 helper，会留下半残的语言切换问题
2. 若语言包结构设计不一致，可能引入新的翻译 key 漏洞
3. 若顺手扩散到其他 org-personnel tab，会扩大任务范围

因此本轮必须坚持：

1. 只修 `leave` 与 `stats`
2. 优先做完整本地化，不做表层替换
3. 如底层 helper 固定中文，就同步收口到底层

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. `zh-CN` 下 `/personnel/leave` 与 `/personnel/stats` 不再出现中英混排
2. `en-US` 下对应页面不再残留中文硬编码
3. 单位、状态、类型、时间显示与当前语言模式一致
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不重写 leave / stats 的业务逻辑
2. 不重构整套 org-personnel 国际化结构
3. 不扩散到其他未提及的 personnel tab

#### 1.8 当前阶段结论

这轮问题的本质不是简单“改几句文案”，而是 `leave` / `stats` 两个 tab 尚未完整接入系统的本地化机制。要一次收干净，必须同时覆盖页面 JSX 文案、语言包字段，以及可能固定中文的底层展示 helper。这样才能保证中英文模式切换后页面真正一致，而不是继续保留半本地化状态。

### 1. plan：新增“服务中心”同级侧边栏分组

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前 `请假管理` 与 `荣誉榜` 虽然已经在 `组织人事` 模块内可访问，但它们的业务心智已经与基础组织、人事、账号权限明显不同：

1. `组织人事` 更偏组织结构、人员档案、账户权限等基础管理能力
2. `请假管理` 与 `荣誉榜` 更像独立的服务型入口
3. 如果继续留在同一个超大 Tab 容器中，后续导航语义会越来越失真

同时命名上已明确：

1. 不使用 `KPI`
2. 不使用 `员工`
3. 采用更中性的侧边栏名称：**服务中心**

#### 1.2 当前排查结论

##### 1.2.1 当前更合理的下一步是把 `leave` / `stats` 从 `组织人事` 中抽出

当前两个 Tab 的内容已经具备独立菜单特征：

1. `请假管理` 有完整的申请、列表、详情与统计闭环
2. `荣誉榜` 有独立页面标题、排行榜卡片与明细表格
3. 两者继续作为 `组织人事` 内部 tab，会让“组织人事”变成越来越杂的聚合页

##### 1.2.2 “服务中心”是当前更稳的命名与归属方案

之所以选 `服务中心`，是因为：

1. 相比 `KPI` 更不刺激
2. 相比带 `员工` 的命名更中性
3. 能自然承接 `请假管理` 与 `荣誉榜`
4. 后续若增加考勤、福利、自助事项，也仍然可兼容

#### 1.3 推荐实施策略

本轮建议按最小导航重构方式处理：

1. 新增同级侧边栏分组：`服务中心`
2. 将 `/personnel/leave` 与 `/personnel/stats` 对应入口从 `组织人事` tab 体系中迁出到侧边栏分组
3. 保持现有页面路由、页面组件和业务逻辑不变
4. 第一轮不继续新增其他“服务中心”页面

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/locales/messages/zh-CN/sidebar.ts`
3. `src/locales/messages/en-US/sidebar.ts`
4. `src/features/org-personnel/tabs.ts`
5. 可能涉及命令搜索相关导航数据与文案

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若侧边栏新增了“服务中心”，但 `组织人事` tab 仍保留相同入口，可能造成重复导航
2. 若同步不完整，可能导致搜索菜单、侧边栏、tab 结构语义不一致
3. 若顺手开始重构页面路由，会把任务范围扩大

因此本轮必须坚持：

1. 只做导航层调整
2. 页面业务逻辑保持不变
3. 如需保留 tab 访问能力，要明确是否允许“侧边栏入口 + 旧 tab”并存

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 侧边栏中新增独立的 `服务中心` 分组
2. `请假管理` 与 `荣誉榜` 可从 `服务中心` 正常进入
3. `组织人事` 的导航结构不再承载这两个独立服务型入口（或按确认方案处理重复入口）
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改 `请假管理` 与 `荣誉榜` 的业务逻辑
2. 不继续增加其他“服务中心”页面
3. 不重构整个人事模块路由体系

#### 1.8 当前阶段结论

当前更稳的方案，是新增一个与 `组织人事` 同级的 **服务中心** 侧边栏分组，并先承接 `请假管理` 与 `荣誉榜` 两个已经具备独立服务属性的入口。这样既能避免 `KPI`、`员工` 等易引起反感的命名，又能让导航结构更贴合实际内容，为后续继续扩展留出空间。

### 1. plan：个人工作台采用页内搜索方案

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前已经存在个人工作台能力，至少包含：

1. `个人记录缓冲区`
2. `工作收纳箱 / 个人链接类内容`

这类内容的核心价值不是“系统可检索”，而是“让人愿意放心记录和收纳”。因此搜索方案必须优先保护私密感与可控感，而不是优先追求与全局搜索打通。

#### 1.2 当前排查结论

##### 1.2.1 个人内容不应接入全局搜索结果

当前若把个人缓冲区、个人链接并入全局搜索，会带来两个直接问题：

1. 用户会自然联想到“我的私人记录被系统索引了”
2. 即使技术上按 `ownerUserId` 做隔离，也会削弱“仅自己可见”的产品心智

因此这类内容不能表现为“被系统全局索引的一部分”。

##### 1.2.2 更稳的方案是个人工作台内的统一搜索，而不是分散到多个独立搜索入口

目前个人工作台实现显示：

1. `src/features/personal-workbench/components/personal-workbench-records-view.tsx` 是个人记录页的主入口
2. `src/features/personal-workbench/index.tsx` 已有 `records / workspace` 双 Tab 结构
3. `usePersonalWorkbenchRecords()` 当前只拉取 `/personal-workbench/records`，天然属于个人域
4. `useWorkspaceItems()` 当前只拉取当前登录人的本地工作收纳内容，也属于个人域

因此更稳的方案是：

1. 在个人工作台页面内部只保留一个统一搜索输入
2. 统一搜索同时覆盖 `个人记录缓冲区` 与 `工作收纳箱`
3. 搜索结果按 Tab 分开展示，避免移动端结果过长难以查看
4. 搜索仅针对当前登录人的个人数据集
5. 不把结果接入 `Ctrl+K` 全局搜索，也不混入公共搜索结果

#### 1.3 推荐实施策略

本轮建议按最小且可信的方式实现：

1. 在 `src/features/personal-workbench/index.tsx` 顶部加入统一搜索状态
2. 统一搜索词下发到 `records` 与 `workspace` 两个 Tab 视图
3. 两个视图分别基于已加载数据做前端过滤，不新增服务端搜索域
4. 搜索结果继续按 `records / workspace` Tab 展示，兼顾移动端切换体验
5. 页面文案明确提示：`仅搜索你自己的内容`

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/personal-workbench/components/personal-workbench-records-view.tsx`
2. `src/features/personal-workbench/index.tsx`
3. `src/features/personal-workbench/workspace/components/personal-workbench-workspace-view.tsx`
4. 可能涉及 `workspace-board.tsx` 等空态/筛选结果展示组件
5. 如需文案抽离，可能涉及个人工作台本地化/文案定义文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若为了搜索顺手直接复用全局搜索体系，会破坏个人内容的私密心智
2. 若统一搜索直接把两类结果混排在一个长列表中，移动端体验会下降
3. 若后端新增搜索接口但边界不清，后续容易被误用为跨人查询入口
4. 若一开始就做服务端模糊搜索，会让范围与风险都不必要地扩大

因此本轮必须坚持：

1. 不接入全局搜索
2. 不让个人内容出现在全局搜索结果中
3. 统一入口，但结果分 Tab 展示，不做无边界混排
4. 优先做当前页数据集内过滤，避免过早引入新的搜索域

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 个人工作台顶部只有一个统一搜索入口
2. 该搜索可同时过滤自己的记录与工作收纳内容
3. 搜索结果按 `records / workspace` Tab 查看，移动端切换正常
4. 搜索结果范围仅限当前登录人已加载的个人内容
5. `Ctrl+K` 全局搜索中不会出现个人缓冲区记录内容
6. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不把个人内容接入全局搜索
2. 不新增跨用户搜索能力
3. 不改个人记录/个人链接的权限模型
4. 不扩散成新的服务端通用搜索系统

#### 1.8 当前阶段结论

个人工作台这类功能要优先保证“愿意放心使用”，而不是优先追求系统级统一搜索。当前更稳的方案，是在个人工作台内部提供**一个统一搜索入口**，同时搜索 `个人记录缓冲区` 与 `工作收纳箱`，并通过 Tab 分开展示结果；同时明确只搜索当前登录人的个人内容，不接入全局搜索。这样既保留“一处搜索”的效率，也不会破坏私密感与安全心智。

### 1. plan：销售管理侧边栏一级分类收口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前侧边栏里，`销售管理` 仍然挂在 `资源管理` 分组下，作为一个单独入口指向 `/trading`。这在当前功能较少时尚可接受，但如果后续继续增加报价、订单、客户、回款、售后等能力，继续让销售能力寄存在其他大分组下，会逐步造成导航扩展位不足与职责边界模糊。

同时，用户当前明确要求是：**先把分类建好，先别拆，把现在的销售管理整个丢进去**。这意味着本轮目标不是设计完整销售 IA，而是先完成侧边栏层级收口，为后续逐步拆分预留稳定位置。

#### 1.2 当前排查结论

##### 1.2.1 当前销售能力已经具备单独分类的最低条件

当前已确认：

1. 侧边栏已有 `销售管理` 入口：`/trading`
2. 命令搜索已存在销售相关入口：`/trading/customers`、`/trading/sales-orders`、`/trading/logistics`
3. 这些入口当前都仍归属在 `trading` 语义下，说明后续可继续围绕该域逐步扩展

因此，本轮最合适的动作不是拆模块，而是先把 `销售管理` 从“资源管理下的一个条目”升级为“独立一级分类下的当前承接入口”。

##### 1.2.2 本轮应优先做分类收口，而不是提前细拆子模块

当前更稳的方案是：

1. 在侧边栏中新增一级分类：`销售管理`
2. 先将当前 `/trading` 主入口整体迁入该分类
3. 暂不新增 `报价管理 / 客户管理 / 销售订单` 等新的侧边栏子入口
4. 保持现有销售页面路由、页面结构、业务逻辑不变
5. 命令搜索与中英文文案仅做归属同步，不提前扩张信息架构

这样可以先把层级摆正，再根据真实使用需求逐步拆分销售内部分组。

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 调整 `src/components/layout/data/sidebar-data.ts`，新增 `销售管理` 一级分类并承接现有 `/trading` 入口
2. 调整 `src/locales/messages/zh-CN/sidebar.ts` 与 `src/locales/messages/en-US/sidebar.ts`，补齐新的分组文案
3. 调整 `src/components/layout/data/search-data.ts` 以及 `commandMenu` 对应父级文案，使命令搜索归属与导航结构保持一致
4. 不新增新的销售业务路由，不拆现有 `trading` 页面内部 tabs

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/locales/messages/zh-CN/sidebar.ts`
3. `src/locales/messages/en-US/sidebar.ts`
4. `src/components/layout/data/search-data.ts`
5. `src/locales/messages/zh-CN/commandMenu.ts`
6. `src/locales/messages/en-US/commandMenu.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若顺手提前拆出客户/报价/订单多个入口，会扩大改动范围并引入新的 IA 决策成本
2. 若只改侧边栏，不同步命令搜索归属，会造成导航心智不一致
3. 若误改销售路由或页面内部 tab，会把本轮“只做分类收口”扩散成业务重组

因此本轮必须坚持：

1. 只做侧边栏分类收口
2. 保持 `/trading` 及其子页面业务逻辑不变
3. 同步更新命令搜索归属与中英文文案
4. 暂不细拆销售子模块

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 侧边栏出现独立一级分类 `销售管理`
2. 当前销售入口从原分组迁入 `销售管理` 分类后仍可正常访问 `/trading`
3. 命令搜索中的销售相关入口归属与新导航结构一致
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不新增 `报价管理` 独立页面
2. 不拆分 `客户管理 / 销售订单 / 物流` 为新的侧边栏子项
3. 不改销售业务表结构、接口或页面逻辑
4. 不扩散到采购、仓储等其他业务分类重组

#### 1.8 结论

当前最稳的做法，是先把 `销售管理` 建成独立一级分类，把现有 `/trading` 销售入口整体迁入该分类，先完成导航层级收口；后续再根据真实使用情况，逐步拆分客户、报价、订单等子模块。这样既能避免现在过度设计，又能为后续扩展预留稳定位置。

### 1. plan：销售管理内部TAB重排与报价管理占位页

日期：2026-04-14  
状态：已批准实施

#### 1.1 当前背景

当前 `trading` 模块内部已经存在五个业务 TAB：`客户管理 / 销售订单 / 应收 / 物流管理 / 订单分析`。用户已确认后续希望形成更完整的销售主链路结构，其中 `报价管理` 应位于 `客户管理` 与 `销售订单` 之间。

但当前并不希望一次性把完整报价业务做重，因此本轮更合适的实现方式，是先完成信息架构层的 TAB 重排，并补上 `报价管理` 的路由与占位页，为后续真实报价能力接入预留稳定位置。

#### 1.2 当前排查结论

##### 1.2.1 现有 trading TAB 结构已具备最小调整条件

当前已确认：

1. `src/features/trading/tabs.ts` 维护了当前 `trading` 的 TAB 顺序
2. `src/features/trading/index.tsx` 通过 `ModuleTabbedLayout` 渲染这些 TAB
3. 现有路由已独立存在：`/trading/customers`、`/trading/sales-orders`、`/trading/receivables`、`/trading/logistics`、`/trading/orders-analysis`
4. `src/features/trading/tabs/index.tsx` 已承接客户、订单、物流 TAB 的主视图组件

因此，本轮可以用很小的改动面完成：新增一个 `报价管理` TAB、补一条路由、提供一个占位页，并调整 TAB 显示顺序。

##### 1.2.2 本轮应优先做架构落位，而不是完整报价业务

当前更稳的方案是：

1. 将 TAB 顺序调整为 `客户管理 / 报价管理 / 销售订单 / 物流管理 / 应收 / 订单分析`
2. 新增 `报价管理` 路由与占位页
3. 占位页仅表达“报价管理即将逐步接入”的阶段状态
4. 不新增报价表结构、后端接口、审批流、转订单链路
5. 保持现有客户、订单、物流、应收、分析页面逻辑不变

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 调整 `src/features/trading/tabs.ts` 中的 TAB 顺序并插入 `quotes` 项
2. 在 `src/locales/messages/zh-CN/trading.ts` 与 `src/locales/messages/en-US/trading.ts` 中补齐 `报价管理` 及占位页文案
3. 在 `src/features/trading` 下新增报价管理占位页组件文件，保持结构解耦
4. 在 `src/routes/_authenticated/trading` 下新增对应 `quotes.tsx` 与 `quotes.lazy.tsx` 路由入口
5. 如有必要同步更新 `src/components/layout/data/search-data.ts` 以反映新的 TAB 入口

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/trading/tabs.ts`
2. `src/features/trading/tabs/index.tsx`
3. `src/locales/messages/zh-CN/trading.ts`
4. `src/locales/messages/en-US/trading.ts`
5. `src/routes/_authenticated/trading/quotes.tsx`（新增）
6. `src/routes/_authenticated/trading/quotes.lazy.tsx`（新增）
7. `src/features/trading/quotes/tabs/sales-quotes-tab.tsx`（新增）
8. `src/components/layout/data/search-data.ts`（如需同步命令搜索）

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若顺手把报价业务做重，会让任务范围从结构调整扩散为新模块建设
2. 若只改 TAB，不补路由与文案，会造成入口点击失败或显示缺失
3. 若误改现有订单、物流、应收页面，会影响当前已上线能力

因此本轮必须坚持：

1. 先做 TAB 落位
2. 新增报价管理占位页即可
3. 不改现有已上线业务逻辑
4. 新增文件优先独立目录化，避免继续堆叠到现有大文件

#### 1.6 验证策略

本轮至少需要验证：

1. `trading` TAB 顺序已调整为 `客户管理 / 报价管理 / 销售订单 / 物流管理 / 应收 / 订单分析`
2. 点击 `报价管理` 可正常进入占位页
3. 现有 `客户 / 订单 / 物流 / 应收 / 分析` TAB 仍可正常访问
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不接真实报价单数据表与接口
2. 不实现报价审批、版本、有效期、转订单等完整业务能力
3. 不重构现有客户、订单、物流、应收、分析实现
4. 不扩散到销售管理外的其他模块结构调整

#### 1.8 结论

本轮最合适的实施方式，是先把 `报价管理` 在销售管理内部 TAB 中落位，并提供独立占位页；这样可以先完成销售主链路的信息架构调整，同时把后续真实报价能力的接入口留稳，而不会在当前阶段把任务范围做得过重。

### 1. plan：报价管理改为侧边栏独立同级菜单

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在上一轮最小实现中，`报价管理` 被放入了 `trading` 内部 TAB，并新增了 `/trading/quotes` 占位页。这种做法适合“先把销售主链路顺序摆正”的轻量版本，但当前用户进一步明确了新的产品结构判断：`报价管理` 不应只是销售管理内部的一个 TAB，而应在侧边栏中作为与 `销售管理` 同级的独立菜单项存在。

这样做的核心原因是：后续 `报价管理` 自身还需要继续拆分出内部多 TAB 结构，例如零售报价模板、批发报价模板等。如果继续把它挂在 `trading` 内部，会出现“一级模块里再塞一个未来会继续膨胀的子模块”的问题，后续很容易再次返工。

#### 1.2 当前排查结论

##### 1.2.1 当前报价管理实现仍处于可迁移的早期阶段

当前已确认：

1. `报价管理` 目前只新增了 `trading` 内部 TAB 配置
2. 当前 `/trading/quotes` 仅是占位页，没有接入真实报价业务数据
3. 命令搜索、`trading` 文案与路由都仍处于轻量结构状态
4. 侧边栏目前只存在 `销售管理 -> /trading` 单入口，尚未新增报价管理独立菜单项

因此，现在调整架构的代价仍然较低，更适合立刻纠正为更长期稳定的结构。

##### 1.2.2 更稳的方案是把报价管理提升为侧边栏独立入口

当前更稳的方案是：

1. 在侧边栏中新增 `报价管理` 独立菜单项，与 `销售管理` 同级
2. `销售管理` 内部重新聚焦在 `客户管理 / 销售订单 / 物流管理 / 应收 / 订单分析`
3. 将当前 `/trading/quotes` 视为过渡实现，后续迁移到独立 `报价管理` 域
4. 为新的 `报价管理` 主页面预留自己的内部多 TAB 结构
5. 命令搜索、中英文文案、导航归属一起切换，避免心智割裂

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 调整 `src/components/layout/data/sidebar-data.ts`，在侧边栏中新增 `报价管理` 独立入口
2. 调整 `src/features/trading/tabs.ts`，从 `trading` 内部移除 `quotes` TAB
3. 为报价管理建立独立页面入口与独立模块壳子，并在该页面内部预留自己的多 TAB 结构
4. 将当前 `/trading/quotes` 占位实现迁移或改为新的独立报价管理入口承接
5. 同步更新 `search-data.ts`、`sidebar.ts`、`commandMenu.ts`、`trading.ts` 等文案与搜索归属

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/components/layout/data/search-data.ts`
3. `src/locales/messages/zh-CN/sidebar.ts`
4. `src/locales/messages/en-US/sidebar.ts`
5. `src/locales/messages/zh-CN/commandMenu.ts`
6. `src/locales/messages/en-US/commandMenu.ts`
7. `src/features/trading/tabs.ts`
8. `src/features/trading/index.tsx`（如需缩减 trading 结构）
9. 新的报价管理模块页面与路由文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若只新增侧边栏入口，不把 `trading` 内部 `quotes` 一并移出，会造成重复入口
2. 若迁移时仍沿用 `trading.quotes` 命名过深，后续独立模块边界会继续模糊
3. 若不提前定义报价管理自己的内部分层，后面零售/批发模板再次进入时仍会返工

因此本轮必须坚持：

1. 报价管理独立为侧边栏同级菜单项
2. `trading` 内部不再承接 `quotes` TAB
3. 新报价管理页面优先预留自己的内部多 TAB 结构
4. 命令搜索与文案归属同步切换

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 侧边栏出现与 `销售管理` 同级的 `报价管理` 独立菜单项
2. `trading` 内部 TAB 不再包含 `报价管理`
3. 新的 `报价管理` 页面可独立访问
4. 新页面已预留内部多 TAB 结构承接未来零售/批发模板拆分
5. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不一次性实现完整报价业务能力
2. 不直接实现零售/批发全部模板功能
3. 不重构现有客户、订单、物流、应收、分析业务实现
4. 不扩散到非销售类导航重组

#### 1.8 结论

当前更长期稳定的结构，不是把 `报价管理` 放在 `销售管理` 内部 TAB 中，而是将其提升为侧边栏中与 `销售管理` 同级的独立菜单项。这样 `销售管理` 可以继续聚焦既有销售执行链路，而 `报价管理` 自身也能拥有独立的内部多 TAB 结构，为零售模板、批发模板等后续拆分预留充足空间。

### 1. plan：销售单据共用模板层抽取

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在继续完善 `报价管理` 之前，当前更基础也更关键的问题已经明确：如果报价单与正式销售订单未来都要承载“动态客户 + 动态产品 + 动态明细行”的文档型编辑体验，那么不应先各做一套独立表单，而应优先把共用模板层抽出来。

用户当前明确确认的方向是：**先抽出来**。这里的“抽出来”不是把报价和销售订单的全部业务逻辑合并，而是先将两者都会用到的单据编辑模板层（表头、明细、底部统计/附件等）从当前正式销售订单实现中提炼出来，形成可复用的 `Sales Document` 骨架。

#### 1.2 当前排查结论

##### 1.2.1 当前正式销售订单已经具备可提炼的模板层雏形

当前已确认：

1. `src/features/trading/components/parts/order-header-fields.tsx` 已承接销售订单表头编辑区
2. `src/features/trading/components/parts/order-lines-editor.tsx` 已承接销售订单明细编辑区
3. `SalesOrderActionDialog` 已采用“表头 + 明细 + 底部统计/备注”的文档型结构
4. 客户与产品已是动态读取，说明共用模板层具备向报价单复用的基础条件

因此，本轮最值得做的不是先讨论字段映射细节，而是先把这些“订单专用模板”向“销售单据通用模板”提升一层。

##### 1.2.2 本轮应先抽模板层，而不是强行合并业务逻辑

当前更稳的方案是：

1. 共用 **UI 模板层**：表头、明细编辑器、底部统计/附件等
2. 共用 **字段骨架层**：两类单据共同使用的表头/明细字段结构定义
3. 暂不共用 **API / mutation / 保存逻辑 / 状态流**
4. 销售订单继续保留自己的保存与事务逻辑
5. 报价管理后续接入时直接复用这套模板层，而不是再复制一套表单

这样既能避免后续字段双份维护，又不会在当前阶段把两个业务域过早混成一团。

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 在新的独立目录下抽出通用销售单据模板组件（例如 `sales-document` 或同等语义目录）
2. 先迁移 `表头模板`，让其不再绑定“销售订单专属”命名
3. 再迁移 `明细编辑模板`，保留动态产品/单位/工艺项的可配置注入能力
4. 视现有结构决定是否同步抽出 `底部统计` 与 `附件/证据` 管理区
5. 先让正式销售订单接回这套共用模板，确认不破坏现有功能
6. 报价管理后续再以该模板层为基础接入自身业务容器

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/trading/components/parts/order-header-fields.tsx`
2. `src/features/trading/components/parts/order-lines-editor.tsx`
3. `src/features/trading/components/parts/order-footer-stats.tsx`（如需同步抽离）
4. `src/features/trading/components/sales-order-action-dialog.tsx`
5. 新增共用模板层目录与组件文件（建议独立目录）

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若一开始就把报价与正式订单的保存逻辑也合并，会迅速扩大任务范围
2. 若抽模板时直接修改太多字段命名，会扩大现有销售订单改动面
3. 若模板层抽得不够干净，后续报价接入时仍会复制粘贴并继续分叉

因此本轮必须坚持：

1. 先抽模板层，不合并业务逻辑层
2. 优先稳定迁移正式销售订单现有使用点
3. 新模板层使用更中性的 `Sales Document` 语义命名
4. 新增文件优先独立目录化组织

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 正式销售订单仍可正常打开与编辑
2. 表头、明细、底部统计等核心交互不受模板抽离影响
3. 共用模板层可被报价管理后续直接复用
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不直接实现完整报价业务能力
2. 不强行统一报价与订单的保存接口
3. 不合并两者状态流与事务逻辑
4. 不扩散到采购单据等其他业务模板重构

#### 1.8 结论

在报价管理继续深化之前，当前最值得优先实施的动作，是先把正式销售订单里的“单据模板层”抽出来，形成可供 `销售订单 / 报价管理` 共用的 `Sales Document` 骨架。这样后续无论增加字段还是调整交互，都可以只改一处模板层，而不必在两个业务模块中双份维护。

### 1. plan：报价管理单一主TAB方案

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在完成报价管理独立侧边栏入口与销售单据共用模板层抽取之后，当前关于报价管理下一阶段信息架构的关键决策已经进一步明确：**报价管理暂时不应继续拆成“客户 / 零售 / 批发”等多个一级主 TAB**，而应先保留一个主工作区，聚焦真正的核心对象——报价单。

用户当前已确认的方向是：报价管理先只保留一个主 TAB，即 `报价单`。其中客户不再作为报价管理里的一级页签，而是作为筛选维度存在；`零售 / 批发` 也先不做一级 TAB，而只作为数据类型字段或筛选项存在。这样既避免过早把导航拆碎，也能为未来更真实的扩展方向（如模板规则、加成计算、历史作废）保留空间。

#### 1.2 当前排查结论

##### 1.2.1 当前最不稳的拆法，是继续按客户或零售/批发切一级导航

当前已明确：

1. `客户` 若在报价管理中做一级 TAB，会与主销售域中的客户管理产生职责重叠
2. `零售 / 批发` 当前更像报价类型，不一定是长期稳定的导航层
3. 后续实际更可能新增的是 `模板规则 / 加成计算 / 历史作废` 等能力型工作区
4. 报价管理真正的主对象仍然是“报价单”本身，而不是客户主数据页或类型分区页

因此，当前继续把报价管理拆成多个一级主 TAB，反而更容易造成未来再次返工。

##### 1.2.2 当前更稳的方案，是先保留一个主工作区“报价单”

当前更稳的方案是：

1. 报价管理先只保留一个主 TAB：`报价单`
2. 客户作为顶部筛选、聚合或历史查看维度存在
3. `零售 / 批发` 先作为 `quoteType` 一类的数据字段存在
4. 报价管理首页先围绕“列表、筛选、历史、转单”组织，而不是继续拆导航
5. 等真实业务沉淀后，再按能力扩展独立 TAB

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 将 `quotes` 模块的主工作区先收口为单一 `报价单` 视图
2. 在该视图中预留客户筛选、状态筛选、类型筛选、历史版本与作废入口
3. 将 `零售 / 批发` 的差异暂时放入字段与筛选项层，而非导航层
4. 后续若确有需求，再增设 `模板规则 / 加成计算 / 历史作废` 等能力型 TAB

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/tabs.ts`
2. `src/features/quotes/index.tsx`
3. `src/features/quotes/tabs/index.tsx`
4. `src/routes/_authenticated/quotes/*`
5. `src/components/layout/data/search-data.ts`（如需同步搜索表达）

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若继续把客户提升为报价管理一级 TAB，会让客户主数据职责重复
2. 若过早把零售/批发上升为一级 TAB，后续真实业务变化时容易再次重构导航
3. 若首页不围绕报价单主对象组织，用户操作链会变散

因此本轮必须坚持：

1. 先保留单一主 TAB：`报价单`
2. 客户做筛选维度，不做一级 TAB
3. 类型先做字段，不做一级 TAB
4. 未来新增 TAB 必须按“能力”而非“临时类型”扩展

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 报价管理主工作区仍然聚焦在报价单处理
2. 客户可作为筛选与历史维度使用
3. 类型可作为字段与筛选项表达
4. 后续扩展 `模板规则 / 加成计算 / 历史作废` 不会再次破坏现有结构

#### 1.7 非目标边界

本轮不做：

1. 不再继续拆出 `客户 / 零售 / 批发` 一级 TAB
2. 不直接实现完整报价单业务
3. 不立即实现所有未来能力页签

#### 1.8 结论

当前更稳的报价管理结构，不是继续横向拆成“客户 / 零售 / 批发”等多个一级主 TAB，而是先保留一个主工作区 `报价单`，把客户作为筛选维度、把零售/批发作为数据类型字段。这样既能保证当前信息架构足够克制，又能为后续按能力扩展 `模板规则 / 加成计算 / 历史作废` 留出更长期稳定的位置。

### 1. plan：报价单工作区真实骨架

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价管理已经完成“单一主 TAB 收口”之后，下一步不应该继续纠结导航结构，而应该开始把 `报价单` 主工作区从占位页面推进到“可承载真实业务”的页面骨架。

这里的关键不是一步到位把完整报价系统做出来，而是先建立一层足够稳定的工作区结构：让用户能看到筛选区、列表区和关键动作入口，同时让后续接入真实报价单录入/编辑时，能够自然复用前面已经抽出的 `sales-document` 共用模板层，而不是再次复制一份销售订单表单实现。

#### 1.2 当前排查结论

##### 1.2.1 下一步最应该补的是“工作区骨架”，不是业务全量接入

当前已经具备：

1. 报价管理独立入口已建立
2. 报价管理已收口为单一 `报价单` 主工作区
3. 销售单据共用模板层已经抽出，可供报价单后续复用

当前仍然缺少：

1. `报价单` 页面内的真实筛选区结构
2. 报价单列表区的稳定信息架构
3. 新建/历史/作废/转正式单等关键动作入口的页面挂点

因此，下一步最合理的实施单元不是“完整报价业务”，而是“报价单工作区真实骨架”。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 先建立 `客户 / 状态 / 类型` 三类筛选区域
2. 先建立 `报价单列表` 的信息区、空态与操作列骨架
3. 先预留 `新建报价 / 历史版本 / 作废记录 / 转正式销售订单` 等动作入口
4. 录入/编辑区域后续优先复用 `sales-document` 模板层
5. 本轮不急于把 API、保存、审批、转单事务一次性并入

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 将 `QuoteOrdersTab` 从纯说明占位改为真实工作区骨架页面
2. 增加顶部筛选栏，至少包含 `客户 / 状态 / 类型`
3. 增加列表卡片或表格骨架，先提供列头、空态与操作区
4. 增加主动作入口：`新建报价`
5. 增加次动作入口占位：`历史版本 / 作废记录 / 转正式销售订单`
6. 保持数据来源先最小化，可先用占位数据或空态，不强行接入完整后端

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/tabs/index.tsx`
2. `src/features/quotes/components/*`（建议新增独立组件目录，避免继续堆叠）
3. `src/features/sales-document/components/*`（如需接回共用模板层）
4. `src/locales/messages/zh-CN/*`
5. `src/locales/messages/en-US/*`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接把完整报价业务一起接入，容易把页面骨架、状态流、API 与模板复用搅在一起
2. 若不先建立清晰的筛选区和列表区，后续真实数据接入时仍会反复改结构
3. 若不优先复用 `sales-document` 模板层，报价与销售订单表单会再次分叉

因此本轮必须坚持：

1. 先做页面骨架，不做完整业务闭环
2. 先做入口与占位，不急于接入全部动作逻辑
3. 录入/编辑层优先接共用模板，而不是复制销售订单实现

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. `报价单` 页面已具备筛选区、列表区、空态和动作入口
2. 页面结构能自然容纳后续真实报价数据接入
3. 页面结构能自然容纳后续复用 `sales-document` 模板层
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接实现完整报价单 CRUD
2. 不直接实现完整转正式销售订单事务
3. 不直接实现审批流、保存流与正式销售订单状态联动
4. 不在本轮拆出全部未来能力页签

#### 1.8 结论

报价管理完成单一主 TAB 收口之后，下一步最合理的动作，不是继续改导航，也不是直接把完整报价业务一次性塞进来，而是先把 `报价单` 主工作区搭成真实骨架：包含筛选区、列表区、空态与关键动作入口，并明确后续录入/编辑层优先复用 `sales-document` 共用模板层。这样可以用最小风险方式，把报价管理从“信息架构已确定”推进到“页面骨架可承载真实业务”。

### 1. plan：报价单列表假数据与服务层接口骨架

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在 `报价单` 主工作区的页面骨架已经落地之后，当前最合理的下一步不是直接接完整后端，而是先为报价列表补一层“最小可运行的数据骨架”。

也就是：先让筛选区真的能驱动列表变化，让列表从纯空态升级为可展示的假数据/本地 mock 数据，同时把这一层数据获取与筛选逻辑沉淀为可替换的 service/hook 结构。这样等后续接真实报价 API 时，只需要替换数据来源，而不必再次重写页面结构。

#### 1.2 当前排查结论

##### 1.2.1 当前最适合先补的是“假数据 + 服务层接口骨架”

当前已经具备：

1. 报价管理单一主 TAB 已稳定
2. `报价单` 工作区筛选栏与列表骨架已经存在
3. 页面结构已经能承载列表摘要、动作入口与未来扩展位

当前仍然缺少：

1. 可驱动筛选联动的最小数据源
2. 页面层之外的报价列表读取边界
3. 可供未来切换到真实 API 的 hook/service 承载点

因此，本轮最合适的实施单元是：**先补假数据与服务层接口骨架，再让筛选区与列表联动**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 定义 `quote summary` 级别的数据结构
2. 提供本地 mock 数据源或 mock service
3. 增加 `use-quote-list` 一类读取 hook，将筛选逻辑留在可替换层
4. 页面层只负责传入筛选条件和展示结果
5. 后续真实接口接入时，仅替换 service 数据源实现

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 新增报价列表数据模型文件
2. 新增 mock 数据文件或本地 service 文件
3. 新增读取 hook，接收 `customer / status / type / keyword` 等筛选条件
4. 让 `QuoteOrdersTab` 或列表组件改为消费 hook 返回的数据
5. 列表在有结果时展示摘要行，在无结果时展示真实空态

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/data/*`
2. `src/features/quotes/services/*`
3. `src/features/quotes/hooks/*`
4. `src/features/quotes/components/quote-workspace-list.tsx`
5. `src/features/quotes/tabs/index.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接把假数据写死在页面组件里，后续切换真实接口时仍然要重构页面层
2. 若不先定义摘要数据结构，列表字段会随着后续接口变化反复抖动
3. 若一上来直接接完整后端，会把 mock、筛选、读取、状态管理与真实 API 耦在一起

因此本轮必须坚持：

1. 页面层不直接持有大段假数据
2. 数据源必须独立成可替换结构
3. 只做读取与筛选联动，不扩展到完整 CRUD

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 切换 `客户 / 状态 / 类型 / 关键词` 时列表结果会联动变化
2. 列表可以展示至少一组假数据摘要
3. 结果为空时可以展示真实空态
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接接入真实报价后端 API
2. 不直接实现完整报价单 CRUD
3. 不直接实现转正式销售订单事务
4. 不直接实现审批流或持久化保存

#### 1.8 结论

对当前 `报价单` 工作区而言，方案 A 最合理的落地顺序，是先补“假数据 + 服务层接口骨架”，并让现有筛选区与列表真正联动。这样既能快速把页面从纯骨架推进到“有数据感知的工作区”，又能为后续切换到真实报价 API 保留稳定的 service/hook 替换边界。

### 1. plan：报价列表真实接口适配层

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在 `报价单` 页面已经具备 mock 数据、service 与 hook 读取骨架之后，下一步最自然的延伸，不是立即展开完整报价业务闭环，而是先把“读取链”从 mock 平滑推进到真实接口适配层。

也就是说：页面层仍然不直接请求 API，而是继续只依赖 `service / hook`。真实接口接入优先从**只读列表接口**开始，把报价摘要列表读取打通，并保留当后端接口未完全稳定时回退到 mock 数据的能力。这样可以先把“读取链”稳定下来，再考虑详情、编辑、保存和转正式销售订单事务。

#### 1.2 当前排查结论

##### 1.2.1 当前最适合优先接入的是真实“列表只读接口”

当前已经具备：

1. 页面层筛选区与列表结构已稳定
2. `quote summary` 数据结构已定义
3. `service / hook` 边界已经存在

当前仍然缺少：

1. 真实报价列表接口的适配实现
2. 真实接口返回与前端 `quote summary` 结构之间的映射层
3. mock 与 real api 的切换策略

因此，本轮最合理的实施单元，是：**优先接入真实报价列表只读接口，而不是直接扩散到详情和写入链**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 保持页面只消费 `useQuoteList`
2. 在 service 内部增加 `mock / real` 双数据源切换能力
3. 为真实接口返回定义 mapper，统一映射到 `QuoteSummary`
4. 若真实接口失败或未就绪，可临时回退 mock 数据，保证页面可用性
5. 等读取链稳定后，再考虑详情、编辑与转单事务

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 先确认后端是否已有报价列表只读接口或候选接口
2. 新增报价列表 API response -> `QuoteSummary` mapper
3. 在 `quote-list-service` 中增加真实接口分支
4. `useQuoteList` 继续对页面暴露统一读取结果，不让页面感知底层切换
5. 若真实接口暂不可用，则保留 mock 回退

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/services/quote-list-service.ts`
2. `src/features/quotes/hooks/use-quote-list.ts`
3. `src/features/quotes/data/*`
4. `src/features/quotes/api/*` 或现有通用请求层
5. 可能涉及后端报价列表接口对应的 routes / handlers / services（需先确认是否存在）

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若页面直接跳过 service 层连 API，会破坏后续 mock/real 切换边界
2. 若没有统一 mapper，后端返回一变化，页面字段会跟着抖动
3. 若过早把详情/编辑/写入一起接进来，读取链的稳定性会被稀释

因此本轮必须坚持：

1. 页面层不直接请求真实 API
2. 只优先接只读列表接口
3. 保留 mock 回退能力
4. 不扩展到详情与写入链

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 页面仍通过统一 `hook / service` 获取报价列表
2. 真实接口可被映射为稳定的 `QuoteSummary` 结构
3. 接口不可用时页面仍可回退 mock 或提供明确空态/错误态
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接接报价详情页
2. 不直接接完整报价单 CRUD
3. 不直接接审批流
4. 不直接接转正式销售订单事务

#### 1.8 结论

对当前报价管理而言，方向 2 最合理的推进方式，是先把读取链从 mock 平滑升级为“真实接口适配层”，并且只优先接入报价列表只读接口。页面层继续只依赖 `service / hook`，真实接口通过 mapper 映射到稳定的 `QuoteSummary` 结构，同时保留 mock 回退能力。这样可以先稳住读取链，再逐步推进详情、编辑与转单链路。

### 1. plan：固定正式报价列表接口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价列表已经具备“真实接口适配壳 + mock 回退”之后，下一步最关键的不是再扩展功能，而是**把正式后端列表接口固定下来**。如果继续长期保留多个候选 endpoint 并行试探，前端虽然能工作，但读取链的契约始终不稳定，后续无论是详情、编辑还是转单都无法建立在可靠的单一事实来源上。

因此，当前必须把“候选接口试探阶段”推进到“正式接口定版阶段”：确认唯一接口路径、确认查询参数命名、确认响应结构、确认前端 mapper 的最终映射边界。

#### 1.2 当前排查结论

##### 1.2.1 当前最需要固定的是单一后端列表路径与响应契约

当前已经具备：

1. 前端 `QuoteSummary` 已形成稳定摘要结构
2. 前端 `service / hook` 边界已经形成
3. 页面已经能消费真实接口适配结果或 mock 回退结果

当前仍然不稳定：

1. 真实接口路径仍是候选集合而非正式路径
2. DTO 字段仍兼容多种别名写法，说明后端契约尚未定版
3. mock 回退当前仍偏“默认保底”，尚未收敛为“异常兜底”

因此，本轮最值得优先推进的，就是固定正式报价列表接口。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 后端明确一个唯一报价列表只读接口
2. 查询参数统一为固定命名
3. 响应统一返回 `QuoteSummary` 所需的稳定字段集合
4. 前端 service 只保留单一正式接口路径
5. mock 回退仅在接口不可用或开发调试时启用

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 先在后端确定正式接口路径，例如 `/quotes`
2. 明确查询参数契约：
   - `customerSegment`
   - `status`
   - `type`
   - `q`
3. 明确返回结构：
   - `items`
   - `total`
   - `items[*]` 内包含稳定的摘要字段
4. 前端移除多 endpoint 轮询试探逻辑，改为单一路径调用
5. mock 回退改为受控兜底策略，并在 UI 中保留来源标识

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `server/routes/*`（如需新增正式报价列表路由）
2. `server/handlers/*`（如需新增报价列表 handler）
3. `server/services/*`（如需新增报价列表查询服务）
4. `src/features/quotes/contracts/quote-api-dto.ts`
5. `src/features/quotes/adapters/quote-api-adapter.ts`
6. `src/features/quotes/services/quote-list-service.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若后端接口路径不固定，前端读取链会长期停留在试探态
2. 若响应字段继续保留多别名兼容，详情/编辑链路会持续缺少稳定契约
3. 若直接移除 mock 回退而后端接口又未稳定，会导致页面失效

因此本轮必须坚持：

1. 正式接口必须先定版
2. 前端只在正式接口定版后收口单一路径
3. mock 回退只能降级，不可替代正式契约

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 前端只请求单一正式报价列表接口
2. 查询参数与响应字段已固定且前后端一致
3. 正式接口可稳定映射为 `QuoteSummary`
4. 接口失败时仍可按预期降级 mock 或提示错误
5. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩展报价详情页
2. 不直接扩展完整报价单 CRUD
3. 不直接扩展审批流
4. 不直接扩展转正式销售订单事务

#### 1.8 结论

当前报价管理继续往下推进之前，最值得优先固定的不是更多页面能力，而是**正式报价列表接口本身**。只有当后端单一路径、查询参数和响应结构都稳定之后，前端 `quote-list-service` 才能真正从“候选试探 + 兼容映射”收口到“正式契约 + 受控降级”。这一步是后续报价详情、编辑、转单链路能否稳定展开的前提。

### 1. plan：报价详情只读接口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在正式报价列表接口已经固定之后，下一步最自然的推进方向不是直接进入编辑与保存，而是先补齐 **报价详情只读接口**，让报价管理形成 `列表 -> 详情` 的正式读取闭环。

如果没有详情只读链路，前端后续无论接报价单预览、详情抽屉还是录入/编辑前的只读回显，都仍然缺少稳定入口。相比直接进入写入链，先把详情读取链打通，风险更小，也更符合当前“先稳读取，再扩写入”的节奏。

#### 1.2 当前排查结论

##### 1.2.1 当前最应该补的是详情读取，而不是直接进入编辑链

当前已经具备：

1. 正式报价列表接口已经固定
2. 前端列表读取链已经收口到单一路径
3. `QuoteSummary` 级别的列表摘要结构已经稳定

当前仍然缺少：

1. 单一正式报价详情接口
2. 前端 `quote detail` 级别的数据契约与 mapper
3. 列表到详情的正式读取闭环

因此，本轮最合理的实施单元，是：**先补报价详情只读接口，而不是直接扩展编辑、保存与审批链**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 后端固定一个详情只读路径，例如 `/quotes/:id`
2. 前端新增 `quote detail` contract / adapter / service / hook
3. 详情结构优先覆盖后续 `sales-document` 模板层所需字段
4. 页面层继续只通过 `hook / service` 获取详情
5. 详情接口稳定后，再进入编辑与转单链路

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 新增后端报价详情只读 handler 与 service
2. 固定详情返回结构，至少覆盖：
   - 头部基础字段
   - 明细行
   - 备注/需求
   - 金额/数量汇总
3. 前端新增详情 DTO 与 adapter
4. 前端新增 `useQuoteDetail` 一类读取 hook
5. 在报价页先提供详情入口或详情占位挂点

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `server/handlers/*`
2. `server/services/*`
3. `server/routes/routes_trading.go`
4. `src/features/quotes/contracts/*`
5. `src/features/quotes/adapters/*`
6. `src/features/quotes/services/*`
7. `src/features/quotes/hooks/*`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若跳过详情读取直接做编辑链，前端读写契约容易混在一起
2. 若详情结构不提前对齐 `sales-document` 模板层，后续表单回接时仍会返工
3. 若详情接口继续采取候选试探而不固定路径，会再次回到不稳定读取链

因此本轮必须坚持：

1. 详情接口必须走单一路径
2. 页面层不直接请求 API
3. 先做只读详情，不扩展到写入链

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 可通过正式接口稳定读取报价详情
2. 前端详情读取链通过统一 `hook / service` 消费
3. 详情结构可承接后续 `sales-document` 模板层字段
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩展报价编辑页
2. 不直接扩展完整报价单 CRUD
3. 不直接扩展审批流
4. 不直接扩展转正式销售订单事务

#### 1.8 结论

在正式报价列表接口固定之后，下一步最稳的方向，不是直接推进写入链，而是先补 **报价详情只读接口**，形成 `列表 -> 详情` 的正式读取闭环。只有详情读取链稳定之后，后续报价预览、表单回显、编辑、审批与转单链路，才有可靠的只读基础可依赖。

### 1. plan：报价详情展示容器升级

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在 `列表 -> 详情` 的正式只读闭环已经形成之后，下一步最自然的增强点，不是立刻进入编辑，而是先把当前右侧的“详情挂点”升级为更完整、更稳定的**报价工作弹窗**。

当前详情已经能读到数据，但展示层仍偏“信息挂点”而不是“成熟的单条报价工作台”。对于真实现场而言，业务人员打开一条报价后，往往不是只看摘要，而是要连续完成查看、改数值、导出 PDF、转发客户、转正式单等动作。右侧窄栏不适合承载这一整套动作流。

因此，这一轮更合理的动作，是先把详情展示容器升级为“点击报价打开弹窗”的交互形态：让弹窗承担单条报价的工作台职责，明确信息分组、展示顺序、动作区布局，以及是否拆出独立弹窗内容组件。

#### 1.2 当前排查结论

##### 1.2.1 当前最值得优先优化的是详情展示层，而不是详情读取链本身

当前已经具备：

1. 正式报价详情接口已经固定
2. 前端详情 `service / hook` 已接好
3. 页面已经能从列表选择并读取详情

当前仍然不足：

1. 详情展示仍偏临时挂点而非稳定工作台容器
2. 头部、金额、需求、明细等信息分组还不够清晰
3. 若继续堆叠在当前列表组件里，职责会快速膨胀

因此，本轮最合理的实施单元，是：**先升级为报价工作弹窗，而不是继续扩展右侧窄栏或直接转入编辑态**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 将详情展示从“挂点”升级为单条报价工作弹窗
2. 优先采用独立弹窗内容组件承载只读/局部编辑视图
3. 弹窗展示顺序尽量对齐后续 `sales-document` 模板层阅读顺序
4. 页面层继续只负责选中、加载与弹窗开关
5. 等弹窗工作台稳定后，再逐步放开编辑态和动作联通

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 将交互形态切换为“点击列表项打开报价工作弹窗”
2. 将弹窗内容拆为独立组件，避免继续堆在 `quote-workspace-list.tsx`
3. 至少分组展示：
   - 头部基础信息
   - 金额/数量汇总
   - 需求说明
   - 明细摘要
4. 在弹窗头部/底部预留动作位：保存 PDF、客户转发、转正式销售订单等
5. 保持既有 `useQuoteDetail` 读取链不变
6. 本轮优先落弹窗骨架与动作位，不把审批流/转单完整事务一并混入

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/*`
2. `src/features/quotes/tabs/index.tsx`
3. 可能涉及 `src/features/sales-document/components/*` 的只读复用评估
4. 可能涉及通用弹窗/抽屉 UI 组件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若继续把详情 UI 堆在列表组件里，组件职责会快速失控
2. 若仍坚持右侧窄栏，后续真实现场动作流会受到空间限制
3. 若弹窗阅读顺序与后续模板层不一致，编辑态接入时仍需返工
4. 若本轮把完整编辑/审批/转单事务一起混入，会过早引入复杂度

因此本轮必须坚持：

1. 优先优化单条报价工作弹窗，不扩展完整写入链
2. 能拆的展示/动作组件尽量拆开，避免继续集中堆叠
3. 读取链保持不变，聚焦交互容器升级

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 点击报价后可稳定打开工作弹窗
2. 弹窗内可完整展示报价详情主信息与明细摘要
3. 弹窗动作位可容纳 PDF、客户转发、转正式单等入口
4. 详情仍通过统一 `hook / service` 获取数据
5. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩展报价编辑页
2. 不直接扩展完整报价单 CRUD
3. 不直接扩展审批流
4. 不直接扩展转正式销售订单事务

#### 1.8 结论

在报价管理已经具备正式 `列表 -> 详情` 只读闭环之后，下一步最稳妥、也更贴近真实现场的方向，是先把当前“详情挂点”升级为**报价工作弹窗**。这一步的价值不在于立刻打通所有业务事务，而在于先把“看、改、导出、转发、转单”这些围绕单条报价的核心动作收拢到一个稳定工作台里，为未来进入编辑态打好结构基础。

### 1. plan：客户联系方式驱动的报价转发动作

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价工作弹窗骨架已经落地之后，下一步最值得优先接入的真实动作，不一定是最重的保存链路，而是**客户转发动作的真实联系方式驱动**。因为现场使用中，业务人员打开报价后最常见的动作之一，就是把报价快速发给客户，而这个动作是否可用，直接取决于客户主数据里是否存在 `wechat` 或 `whatsapp`。

如果动作区不读取客户真实联系方式，就只能停留在静态按钮；而如果简单隐藏按钮，又会让现场用户误以为系统不支持此动作。相比之下，更合适的策略是：动作位保持稳定，但根据客户真实联系方式动态决定文案与可用性。

#### 1.2 当前排查结论

##### 1.2.1 当前最值得优先打通的是真实联系方式读取，而不是外部发送集成本身

当前已经具备：

1. 报价工作弹窗已经存在
2. 正式报价详情读取链已经存在
3. 客户主数据模型中已经有 `wechat / whatsapp` 字段

当前仍然缺少：

1. 报价详情接口向前端暴露联系方式字段
2. 前端详情 contract / adapter 对联系方式的承接
3. 转发动作根据联系方式自动切换文案与可用性

因此，本轮最合理的实施单元，是：**先把联系方式读取与动作自适应打通，而不是直接做外部发送集成**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 后端报价详情响应补齐 `wechat / whatsapp`
2. 前端详情合约收口这两个字段
3. 弹窗动作区根据真实数据决定显示：
   - `转发微信`
   - `转发 WhatsApp`
4. 若联系方式缺失，不隐藏动作，而是保留按钮并点击提示缺失
5. 等联系方式驱动稳定后，再考虑对接真实发送链路

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 先扩展报价详情接口返回客户联系方式字段
2. 前端 `QuoteDetail` 合约与 adapter 增加联系方式映射
3. 弹窗动作区优先读取真实联系方式决定动作文案
4. 无联系方式时提供稳定占位与明确提示
5. 不在本轮对接外部微信/WhatsApp SDK 或系统集成

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `server/services/quote_query_service.go`
2. `server/services/quote_detail_dto.go`
3. `src/features/quotes/data/quote-detail.ts`
4. `src/features/quotes/contracts/quote-detail-api-dto.ts`
5. `src/features/quotes/adapters/quote-api-adapter.ts`
6. `src/features/quotes/components/quote-workspace-dialog.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若转发动作不读真实联系方式，会长期停留在静态假按钮
2. 若直接隐藏无联系方式动作，用户会误以为系统缺少该能力
3. 若本轮直接引入外部发送集成，会过早放大实现复杂度与环境依赖

因此本轮必须坚持：

1. 先补真实联系方式读取
2. 动作位优先稳定可见，不轻易隐藏
3. 本轮只做动作自适应与缺失提示，不做外部发送集成

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 报价详情可稳定读到客户联系方式字段
2. 弹窗动作区会按真实数据切换为 `转发微信` 或 `转发 WhatsApp`
3. 无联系方式时点击会明确提示“客户未留联系方式”
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接打通微信外部发送集成
2. 不直接打通 WhatsApp 外部发送集成
3. 不直接扩展审批流
4. 不直接扩展转正式销售订单完整事务
5. 不直接扩展完整 PDF 流程

#### 1.8 结论

对当前报价工作弹窗而言，最适合优先接入的真实动作，不是一次性把所有外部能力都打通，而是先让**客户联系方式驱动的转发动作**真实可用：有 `wechat` 就明确显示微信转发，有 `whatsapp` 就明确显示 WhatsApp 转发；若客户未留联系方式，也保持动作位稳定存在，并在点击时明确提示缺失。这样既贴近现场，也能倒逼客户主数据补全。

### 1. plan：报价真实 PDF 导出

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价工作弹窗已经具备详情展示、局部编辑位和真实转发动作自适应之后，下一步最值得优先打通的真实动作，是 **PDF 导出**。因为现场业务最常见的交付动作之一，就是把单条报价以稳定版式导出并发送给客户，而这一步若仍停留在静态按钮，占用的是用户最敏感的“交付出口”。

相比直接推进更重的外部发送集成或转单事务，先把“弹窗内一键保存 PDF”打通，风险更小，也更容易快速形成现场可感知价值。

#### 1.2 当前排查结论

##### 1.2.1 当前最应该优先打通的是导出闭环，而不是继续堆更多动作位

当前已经具备：

1. 报价工作弹窗已经落地
2. 正式报价详情读取链已经存在
3. 动作区已经有 `一键保存 PDF` 入口位

当前仍然缺少：

1. 真实 PDF 导出链路
2. 报价导出模板与详情字段的正式对齐
3. 从弹窗直接进入预览/打印/保存 PDF 的闭环

因此，本轮最合理的实施单元，是：**先打通报价 PDF 导出，而不是继续增加更多静态动作**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 优先复用项目已有打印/预览能力
2. 从报价工作弹窗直接进入导出流程
3. 报价导出版式优先满足客户沟通场景的阅读需求
4. 若详情字段不足，再最小补齐打印所需字段
5. 等 PDF 链路稳定后，再继续扩真实发送或转单

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 先盘点并复用现有打印/预览组件或服务
2. 为报价详情映射补齐 PDF 模板所需字段
3. 在报价工作弹窗中把 `一键保存 PDF` 接到真实导出动作
4. 优先支持“预览/打印后保存 PDF”这条稳定路径
5. 不在本轮同时混入外部发送集成与转单事务

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/*`
2. `src/features/quotes/data/quote-detail.ts`
3. `src/features/quotes/adapters/*`
4. `src/features/quotes/services/*`
5. 可能涉及现有打印/预览相关组件与路由

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若继续只保留静态 `PDF` 按钮，现场用户会把系统判断为“动作假接入”
2. 若为报价单单独再造一套打印语义，后续维护和样式一致性会变差
3. 若未先对齐打印所需字段，导出内容可能残缺或版式失真

因此本轮必须坚持：

1. 优先复用已有打印/预览链路
2. 先形成稳定导出闭环，再考虑更多附加动作
3. 需要补字段时只做最小补齐

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 从报价工作弹窗可进入真实 PDF 导出流程
2. 导出版式能完整展示报价核心信息与明细摘要
3. 导出链路与现有打印/预览能力兼容
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接打通微信外部发送集成
2. 不直接打通 WhatsApp 外部发送集成
3. 不直接扩展审批流
4. 不直接扩展转正式销售订单完整事务
5. 不直接扩展完整编辑保存事务

#### 1.8 结论

对当前报价工作弹窗而言，**真实 PDF 导出** 是比继续堆动作位更值得优先打通的现场能力。只要先让业务人员能够从弹窗直接稳定导出 PDF，报价单就真正具备了“查看 -> 导出 -> 交付”的基本闭环。后续再在这个基础上扩真实发送与转单，会更稳。

### 1. plan：报价弹窗真实保存

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价工作弹窗已经具备详情读取、真实转发动作自适应和真实 PDF 导出之后，下一步最值得优先接入的真实业务动作，是**保存当前报价**。因为对现场业务来说，“能改但不能落库”的弹窗仍然只是半成品；只有最小字段能真正保存，单条报价工作台才开始具备闭环价值。

相比直接打开完整报价编辑器，本轮更稳的方式，是先把当前弹窗中已经存在的最小局部编辑区接到真实保存链路：只处理最必要的字段，不一次性把全部表头和明细编辑都放开。

#### 1.2 当前排查结论

##### 1.2.1 当前最合理的是复用现有销售单 PATCH 语义，而不是新造 quotes 写入协议

当前已经具备：

1. 后端已有 `sales-orders/:id PATCH` 能力
2. 报价详情当前本质上仍基于 `SalesOrder` 数据来源
3. 弹窗里已经存在局部编辑区：金额与需求说明

当前仍然缺少：

1. 弹窗到真实保存接口的接线
2. `amountLabel` UI 输入到真实 `amount` 数值字段的收口
3. 保存成功后的详情 / 列表同步刷新

因此，本轮最合理的实施单元，是：**优先复用现有 PATCH 语义，只打通最小字段保存闭环**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 前端新增报价最小 PATCH service
2. 后端继续复用既有 `sales-orders/:id PATCH`
3. 本轮只保存：
   - `amount`
   - `requirements`
4. 保存成功后统一刷新详情与列表 query
5. 保存链稳定后，再考虑逐步放开更多字段

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 在前端新增最小报价 PATCH 请求封装
2. 将金额输入从 `amountLabel` 收口为真实可提交数值
3. 将 `requirements` 作为字符串字段直接提交
4. 保存成功后重新拉取详情和列表
5. 保存失败时在弹窗中提供明确反馈

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/services/*`
2. `src/features/quotes/hooks/*`
3. `src/features/quotes/components/quote-workspace-dialog.tsx`
4. `src/features/quotes/tabs/index.tsx`
5. 如有必要，可能补充 `src/features/quotes/query-keys.ts`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若继续只保留前端临时输入态，现场会误以为已保存
2. 若直接把完整编辑器放开，会过早引入大范围字段与明细行保存复杂度
3. 若金额仍以 `amountLabel` 文本直接处理，容易造成数值与展示层混淆

因此本轮必须坚持：

1. 先做最小字段真实保存
2. 复用既有 PATCH 语义，不新造写入协议
3. 区分展示文案与真实数值字段

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 弹窗修改金额与需求说明后可真实保存
2. 保存成功后详情与列表会刷新到最新状态
3. 保存失败时用户能看到明确提示
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩展完整报价编辑器
2. 不直接扩展审批流
3. 不直接扩展转正式销售订单完整事务
4. 不直接扩展完整明细行编辑保存

#### 1.8 结论

对当前报价工作弹窗而言，下一步比继续堆动作位更关键的，是让**最小局部编辑区具备真实保存能力**。优先复用既有 `sales-orders/:id PATCH` 语义，只先打通 `amount` 与 `requirements` 的最小保存闭环，能以最小风险让报价工作台从“可看、可导出”进一步进入“可局部维护”的真实业务阶段。

### 1. plan：报价转正式销售订单

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价工作弹窗已经具备详情读取、真实导出、联系方式驱动转发动作，以及最小真实保存能力之后，下一步最接近成交闭环的动作，就是 **转正式销售订单**。这一步一旦打通，报价工作台就不再只是“查看 / 沟通 / 局部维护”工具，而开始进入真正的业务承接阶段。

但与 PDF、转发、保存不同，“转正式销售订单”不应被当作普通字段更新处理。它本质上是一个**显式业务动作**：可能涉及状态迁移、单据复制、流程绑定、编号规则甚至后续执行链路，因此必须单独定义，不宜直接混入现有 PATCH 保存语义。

#### 1.2 当前排查结论

##### 1.2.1 当前需要先澄清“转单”的业务语义，而不是急着直接复用 PATCH

当前已经具备：

1. 报价详情与弹窗工作台已经稳定
2. 后端已有 `sales-orders PATCH` 能力
3. 前端已具备专门动作位 `转正式销售订单`

当前仍然不明确：

1. “转单”是否只是把当前报价状态改为 `converted`
2. 是否需要复制生成新的正式销售订单实体
3. 是否需要绑定现有 workflow / 审批链

因此，本轮最合理的实施前提，是：**先将“转正式销售订单”界定为显式业务动作，再决定接口实现方式**。

##### 1.2.2 当前更稳的落地方向

本轮更稳的方向是：

1. 优先定义单一正式转单入口
2. 前端使用专门 `service / hook` 调用，而不是混入普通保存 hook
3. 转单成功后刷新列表与详情
4. 根据后端返回结果决定是否跳转到正式销售订单页
5. 等最小转单闭环稳定后，再考虑更深的审批 / workflow 联动

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 先确认或补充后端转单接口
2. 前端新增专用转单 service / hook
3. 弹窗中的 `转正式销售订单` 只负责触发显式转单动作
4. 成功后刷新数据，并在需要时跳转到正式销售订单详情/列表
5. 失败时提供明确反馈

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `server/handlers/*`
2. `server/services/*`
3. `server/routes/routes_trading.go`
4. `src/features/quotes/services/*`
5. `src/features/quotes/hooks/*`
6. `src/features/quotes/components/quote-workspace-dialog.tsx`
7. `src/features/quotes/tabs/index.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若把“转单”当作普通 PATCH，会混淆字段更新与业务动作边界
2. 若不先澄清“转单”语义，可能导致后续正式销售订单与报价关系不清
3. 若转单成功后不刷新或不跳转，现场用户会误判动作未生效

因此本轮必须坚持：

1. 转单必须作为显式业务动作实现
2. 前端必须走专用 service / hook
3. 成功与失败都要有清晰反馈

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 从报价弹窗可真实触发转正式销售订单动作
2. 转单成功后报价状态 / 列表摘要能同步更新
3. 如有正式销售订单目标页，跳转行为正确
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩展完整报价编辑器
2. 不直接扩展审批流全链路
3. 不直接扩展完整明细行编辑保存
4. 不直接把转单混入普通保存 PATCH 语义

#### 1.8 结论

对当前报价工作弹窗而言，`转正式销售订单` 是比继续堆 UI 动作更接近真实业务承接的关键能力，但它必须被定义为**显式业务动作**，而不是字段级 PATCH。只有先把转单语义、接口边界和成功后的状态反馈定义清楚，后续实现才不会把报价维护链和正式承接链混在一起。

### 1. plan：报价页删除描述文案并移除 MOCK 回退

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价工作弹窗和报价列表的主链路已经基本接通之后，当前最影响真实联调判断的，不是功能位数量，而是**界面上的占位描述文案**与**数据层的 mock fallback**。只要这两项还存在，现场测试就很容易产生误判：一方面 UI 还在展示“说明性占位文本”，另一方面接口失败时前端又会自动切到 mock 数据，导致测试结果失真。

因此，这一轮的目标非常明确：**把报价页收口成只面向真实接口的数据链路**，并把不再需要的占位文案删掉，让真实问题直接暴露出来。

#### 1.2 当前排查结论

##### 1.2.1 当前确实还存在 mock fallback

当前已经确认：

1. `src/features/quotes/services/quote-list-service.ts` 仍保留 `quoteSummaryMockData`
2. 当 `/quotes` 请求失败时，列表服务会自动回退到 mock 数据
3. 这会掩盖后端真实问题，不利于你做现场真实数据测试

##### 1.2.2 当前还存在不必要的说明性文案

当前报价工作弹窗右侧仍保留“现场高频动作”的说明文案，这类文本在方案阶段有帮助，但在真实联调阶段会占用空间，也会让界面显得像演示稿而不是生产工作台。

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 删除报价工作弹窗右侧说明文案块
2. 移除报价列表链路中的 mock fallback
3. 保留真实接口返回空数组时的正常空态
4. 若真实接口失败，直接展示明确错误态，不再切换 mock 数据
5. 不在本轮混入其他功能扩展

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/quote-workspace-dialog.tsx`
2. `src/features/quotes/services/quote-list-service.ts`
3. 如有需要，可能涉及 `src/features/quotes/hooks/use-quote-list.ts`
4. 如有需要，可能涉及 `src/features/quotes/components/quote-workspace-list.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 移除 mock fallback 后，真实接口故障会直接暴露
2. 这会让问题看起来“更明显”，但这正是联调阶段应有的结果
3. 若错误态文案不清楚，用户可能误解为页面坏掉而不是接口失败

因此本轮必须坚持：

1. mock fallback 必须移除
2. 空数据与错误数据必须明确区分
3. 真实接口异常必须可见，不再被 mock 掩盖

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 报价列表不再使用 mock fallback
2. 真实接口返回空数据时正常显示空态
3. 真实接口失败时显示明确错误提示
4. 报价工作弹窗右侧描述文案已移除
5. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不扩展新业务功能
2. 不扩展审批流
3. 不扩展完整报价编辑器
4. 不补额外 mock 数据

#### 1.8 结论

对你当前的真实数据联调目标来说，最重要的不是继续增加交互位，而是**删掉一切会干扰真实判断的占位物**：包括右侧说明文案，以及报价列表中自动兜底的 mock fallback。只有把这些去掉，真实接口状态、空数据结果和后端故障才会被准确暴露，联调才有意义。

### 1. plan：报价管理页回归系统 1.0 视觉

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价管理页已经逐步接入真实详情、真实保存、真实转单与真实列表数据之后，当前最明显的问题已经从“功能是否存在”转变为“页面是否还像系统正式页面”。从你现在给出的截图看，报价管理页虽然功能块都在，但视觉上仍明显偏离系统 1.0：留白过大、层级不稳、筛选与列表像两个独立演示板块，错误态也更像海报而不是表格内态。

因此这一轮的目标不是继续加业务能力，而是把报价管理页**收口回系统现有 1.0 视觉语言**，确保它看起来像系统原生页面，而不是临时搭出来的方案稿。

#### 1.2 当前排查结论

##### 1.2.1 当前已有可复用的系统 1.0 视觉参照

当前最值得参考的现有页面包括：

1. `src/features/trading/components/sales-order-list-fixed.tsx`
2. `src/features/users/components/users-table.tsx`
3. `src/components/data-table/toolbar.tsx`

这些页面共同体现了系统 1.0 的一些稳定特征：

1. 页头和主体区之间的留白克制
2. 筛选更像工具栏，而不是独立大卡片
3. 表格容器、表头、行高、边框与 hover 风格统一
4. 空态/错误态尽量以内嵌式方式呈现，不抢主界面结构

##### 1.2.2 当前报价页的主要视觉偏差

当前报价页主要偏差包括：

1. 页头和内容区留白过大
2. 筛选区使用了偏展示型大卡片与说明文案
3. 列表头部放置了过多状态徽标，造成层级噪音
4. 错误态与空态视觉过于中心化，偏海报式
5. 按钮圆角、边框和块级间距比系统 1.0 更重

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 保留现有真实数据与交互链路，不改业务逻辑
2. 只重构报价管理页的视觉骨架与样式密度
3. 以系统已有列表页为参照统一：
   - 页头
   - 筛选条
   - 列表容器
   - 表头与行高
   - 空态与错误态
4. 控制改动范围在报价页自身文件内，避免误伤其他模块

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/tabs/index.tsx`
2. `src/features/quotes/components/quote-workspace-filters.tsx`
3. `src/features/quotes/components/quote-workspace-list.tsx`
4. 视情况可能涉及 `src/features/quotes/components/quote-workspace-dialog.tsx`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若只凭主观调整样式，容易越改越散
2. 若把视觉回归和功能改动混在一起，会增加回归风险
3. 若过度删减信息，可能损失必要的状态可读性

因此本轮必须坚持：

1. 以系统既有页面为视觉参照
2. 仅做样式与结构收口，不混入新业务逻辑
3. 保留必要状态信息，但压缩噪音性徽标与说明文本

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 报价管理页页头、筛选区、列表区已明显回归系统 1.0 视觉
2. 列表空态与错误态不再呈现为大幅中心海报式块
3. 真实数据链路不受影响
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不扩展新业务功能
2. 不改后端接口
3. 不重新设计全系统视觉规范
4. 不引入新的 mock 或展示性说明区块

#### 1.8 结论

对当前报价管理页来说，最需要的不是再叠功能，而是**回归系统 1.0 的正式页面质感**。这意味着把现在偏演示稿的布局、过重卡片感和夸张空态错误态收口回系统已有的列表页语言。只要参照现有 sales/users 页面统一页头、筛选、表格与状态表达，报价页就能尽快回到系统原生观感。

### 1. plan：报价页“新建报价”按钮无响应

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价页已经基本具备筛选、列表、详情工作台、保存、转单和真实数据联调能力之后，当前又暴露出一个明显的交互缺口：`新建报价` 按钮点击后没有任何反应，也没有错误提示。这类问题虽然表面看只是按钮没接，但对现场用户来说会直接造成“系统坏了”或“按钮是假动作”的判断。

因此，这一轮的目标不是盲目补一个新建功能，而是先把这个交互入口的行为边界定义清楚：**点击后必须有可见结果**，无论是打开真实新建入口，还是给出明确提示，都不能继续静默无反应。

#### 1.2 当前排查结论

##### 1.2.1 当前高概率是按钮未绑定有效行为

从当前报价页结构看，`新建报价` 分别出现在筛选区和空态区，最可能的问题是：

1. 按钮未绑定 `onClick`
2. 绑定了空实现
3. 目标新建入口尚未接入

这类问题的共同点是：**不会报错，但也不会产生任何可见结果**。

##### 1.2.2 本轮优先目标是消除静默无反应

本轮更稳的策略不是先大范围扩完整报价创建链，而是：

1. 先确认项目内是否已有可复用的新建入口
2. 若有，直接接入
3. 若没有，至少补充明确反馈，让用户知道当前能力未接入，而不是误以为系统失灵

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 排查 `新建报价` 按钮的事件绑定位置
2. 确认是否存在现成的报价创建弹窗、路由或复用链路
3. 优先复用已有入口
4. 若暂无稳定创建链，则点击后给出明确提示
5. 保证所有 `新建报价` 按钮行为一致

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/quote-workspace-filters.tsx`
2. `src/features/quotes/components/quote-workspace-list.tsx`
3. `src/features/quotes/tabs/index.tsx`
4. 如有复用入口，可能涉及 `src/features/trading/*` 或报价创建相关组件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接硬接一个不存在的新建链路，可能引入更大范围未完成行为
2. 若只临时弹 `alert` 而不解释边界，体验仍会较差
3. 若筛选区和空态区按钮行为不一致，会继续造成认知混乱

因此本轮必须坚持：

1. 所有 `新建报价` 按钮行为一致
2. 点击后必须有可见反馈
3. 优先复用现有稳定入口，不轻易新造完整创建链

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 点击 `新建报价` 后有明确结果
2. 筛选区与空态区按钮行为一致
3. 不再出现“无反应且无报错”
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不直接扩完整报价创建后端体系
2. 不混入无关视觉大改
3. 不扩展审批流
4. 不引入新的 mock 创建链

#### 1.8 结论

`新建报价` 按钮当前的问题，不只是“功能没做完”，而是**交互静默失败**。这类问题必须优先消除。最稳的方式是先确认是否有现成可复用的新建入口；若有就直接接上，若没有也必须提供明确提示，让按钮从“假动作”变成“有反馈的真实入口”。

### 1. plan：复用工作弹窗做新建报价

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价页的“新建报价”入口暴露出来之后，当前最合理的产品方向已经明确：**不再新造第二个弹窗**，而是直接复用现有 `quote-workspace-dialog`。因为现有工作弹窗本身就已经承担了报价详情查看、局部编辑、保存、导出和转单等核心工作区语义，如果再单独新增一个“新建报价弹窗”，不仅会造成视觉和行为重复，也会把报价创建与报价维护拆成两套交互体系。

因此，本轮的核心方向应当是：**把现有工作弹窗扩展成支持 create mode 的统一工作台**。

#### 1.2 当前排查结论

##### 1.2.1 当前不需要再新增第二个弹窗

当前已经具备：

1. 现有 `quote-workspace-dialog` 已承载主要报价工作区布局
2. 现有弹窗内已经具备金额、需求说明等核心编辑位
3. 当前缺少的不是第二个 UI 容器，而是“新建模式”的状态与字段

因此，从交互一致性和工程成本看，**直接复用现有工作弹窗比另造新弹窗更合理**。

##### 1.2.2 create mode 的最小差异已经相对清晰

新建模式最小需要处理的差异包括：

1. 增加动态客户选择字段
2. 提供空白初始值，而不是依赖已有详情
3. 保存按钮从“保存当前报价”切换为“创建报价”
4. 禁用或隐藏不适用于新建的动作：
   - PDF
   - 客户转发
   - 转正式销售订单

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 为 `quote-workspace-dialog` 增加 mode 概念
2. 页面层统一维护：
   - `detail mode`
   - `create mode`
3. 新建模式只开放最小字段
4. 复用已有保存链或最小新增创建保存链
5. 保证“新建”和“编辑已有报价”仍在同一工作台语义下完成

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/quote-workspace-dialog.tsx`
2. `src/features/quotes/tabs/index.tsx`
3. `src/features/quotes/components/quote-workspace-filters.tsx`
4. `src/features/quotes/components/quote-workspace-list.tsx`
5. 如需动态客户字段，可能涉及 `src/features/trading/customers/*` 或客户 service 复用
6. 如需真实创建保存，可能涉及 `src/features/quotes/services/*`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若 create mode 与 detail mode 状态边界不清，会让弹窗逻辑混乱
2. 若复用工作弹窗但不收口动作权限，新建态会出现不适用按钮
3. 若客户字段只做静态输入，不接动态数据，仍无法满足真实创建需求

因此本轮必须坚持：

1. 弹窗 mode 明确分离
2. 新建态与详情态动作边界明确
3. 客户字段优先接真实动态来源

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 点击 `新建报价` 后打开现有工作弹窗的 create mode
2. 新建态可编辑最小字段并显示动态客户字段
3. 新建态不再显示不适用动作
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不新增第二个独立新建弹窗
2. 不拆出第三套报价创建页面
3. 不扩展完整报价全字段编辑器
4. 不引入新的 mock 创建链

#### 1.8 结论

对当前报价模块来说，最合理的新建方案不是“再做一个新弹窗”，而是**直接复用现有工作弹窗并扩展 create mode**。这样可以保持统一的报价工作台语义，同时以最小改动补上动态客户字段和新建态动作边界，让“新建报价”与“维护报价”都在同一套成熟容器里完成。

### 1. plan：报价新建接入完整明细编辑器

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在把“新建报价”接入现有工作弹窗之后，当前暴露出的核心问题已经非常明确：**只有客户、金额、需求说明的简化表单并不能构成真实报价创建流**。报价的核心是产品明细行、数量、单价、金额与可编辑的表格结构；如果缺少这些内容，就无法完成真实业务录入，也无法支撑后续导出、转发与转单。

因此，这一轮必须修正方向：**报价新建必须接入完整明细编辑器，而不是继续在简化表单上修补**。

#### 1.2 当前排查结论

##### 1.2.1 当前 create mode 仍是低配录入态，不足以作为真实报价入口

当前 create mode 已经具备：

1. 复用现有工作弹窗
2. 动态客户选择
3. 金额与需求说明
4. 创建成功后原地切详情态

但仍缺失报价创建最关键的能力：

1. 产品选择
2. 明细表格
3. 数量与单价录入
4. 行级金额汇总

##### 1.2.2 最合理的方向是复用成熟单据编辑能力

项目中已经存在较成熟的交易单据编辑器能力，例如销售订单的：

1. 单据头字段编辑
2. 明细行表格编辑
3. 产品选择
4. 行编辑与保存编排

因此，本轮不应再新造一个“报价专用低配编辑器”，而应优先复用这些成熟能力，接到报价新建工作流上。

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 复用现有工作弹窗容器，不新增第二个弹窗
2. 在 create mode 下接入成熟的单据头/明细编辑器能力
3. 至少支持：
   - 客户选择
   - 产品选择
   - 明细行增删改
   - 数量 / 单价 / 金额
   - 需求说明
4. 创建成功后仍保留当前“原地切 detail mode”工作流

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/components/quote-workspace-dialog.tsx`
2. `src/features/quotes/tabs/index.tsx`
3. `src/features/trading/components/sales-order-action-dialog.tsx`
4. `src/features/sales-document/components/*`
5. `src/features/trading/customer/*`
6. `src/features/engineering/hooks/use-products*` 或相关产品数据来源
7. 视情况可能涉及 `src/features/quotes/services/*`

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若直接把销售订单完整编辑器强行塞进报价工作台，可能带入过多与报价无关字段
2. 若只做表格 UI，不接真实产品选择，仍然只是半成品
3. 若 create mode 和 detail mode 的职责边界不清，会继续让弹窗复杂化

因此本轮必须坚持：

1. 复用成熟能力，但要做报价场景裁剪
2. 优先保证“产品选择 + 明细表格 + 金额计算”完整可用
3. 保留创建成功后原地切详情态的统一工作流

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. 新建报价时可选择客户与产品
2. 明细表格可增删改，并能正常编辑数量/单价/金额
3. 创建成功后仍原地切入详情态
4. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不退回第二个独立新建弹窗方案
2. 不继续用低配简化表单冒充完整报价创建
3. 不引入新的 mock 产品链
4. 不扩展与报价无关的大量交易字段

#### 1.8 结论

对真实报价业务来说，**没有明细表格与产品选择，就不构成可用的新建报价能力**。因此下一步必须把 create mode 从“最小表单入口”升级为“完整报价录入入口”，优先复用现有成熟的单据编辑能力，让报价新建真正可录、可算、可继续流转。

### 1. plan：报价管理 TAB 职责拆分与稳定性优化

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

在报价管理页连续补齐视觉回归、新建入口、create mode、完整明细编辑器之后，当前报价 TAB 已经达到“可用”状态，但也明显暴露出结构性问题：`src/features/quotes/tabs/index.tsx` 逐步承担了页面入口、create mode 资源装配、明细编辑器拼装、创建保存分流、详情态保存与转换、弹窗模式切换等多重职责，已经接近单文件业务控制器。

如果继续在这个基础上叠加历史版本、作废记录、客户沟通链路或报价审批动作，当前结构会快速恶化，后续缺陷定位与改动成本都会显著上升。

#### 1.2 当前排查结论

##### 1.2.1 `quotes/tabs/index.tsx` 已经职责过载

当前文件同时承担：

1. 页面筛选状态
2. 报价列表与详情查询
3. create/detail 弹窗模式切换
4. create mode 资源加载（客户、产品、单位、工艺）
5. create mode 编辑器拼装
6. 创建保存与创建后切详情态
7. 详情态保存与转正式单

这使其不再是简单页面组件，而是混合了 view/controller/composition 角色的集中编排文件。

##### 1.2.2 报价域与 trading 域当前缺少防腐层

当前报价新建直接复用 trading 侧的：

1. `useSalesOrderForm`
2. `DocumentHeaderFields`
3. `DocumentLinesEditor`
4. `useSalesOrderMutations`

这条路径能快速复用成熟能力，但也意味着报价域目前直接暴露在销售订单域的字段、校验、mutation 语义之下。若未来报价与正式销售订单在字段/规则上产生分叉，当前实现会首先成为耦合断点。

##### 1.2.3 `quote-workspace-dialog` 需要控制继续膨胀

当前 `quote-workspace-dialog` 已承载：

1. 工作台外壳
2. create/detail 模式切换
3. 详情展示与局部编辑
4. 预览/转发/转单动作栏

虽然 create 内容已通过插槽外提，但整体仍有继续长成巨石组件的风险。因此需要在本轮优化中为后续 `shell + create/detail content` 拆分留出结构位。

#### 1.3 推荐实施策略

本轮建议按最小风险方式实施：

1. 从 `src/features/quotes/tabs/index.tsx` 中抽离报价工作台控制逻辑
2. 新增报价工作台 controller hook，统一维护：
   - dialog mode
   - selected quote id
   - 打印预览开关
   - 创建后原地切 detail mode
3. 新增 create editor 资源与保存编排 hook，统一维护：
   - customers/products/units/drilling/labeling 资源加载
   - create form 状态
   - 创建提交
4. 为报价域增加轻量 adapter / façade，减少对 trading mutation 细节的直接暴露
5. 保持 `quote-workspace-dialog` 作为工作台外壳，但进一步弱化其业务拼装职责

#### 1.4 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/tabs/index.tsx`
2. `src/features/quotes/components/quote-workspace-dialog.tsx`
3. 新增 `src/features/quotes/hooks/use-quote-workspace-controller.ts`
4. 新增 `src/features/quotes/hooks/use-quote-create-editor.ts`
5. 视情况新增 `src/features/quotes/services/quote-workspace-service.ts` 或 adapter 文件

#### 1.5 风险与破坏性评估

本轮主要风险：

1. 若拆分时接口边界不清，可能引入状态回传混乱
2. 若过度抽象，会让当前本已可用的工作流被无谓复杂化
3. 若 controller / adapter 设计不当，会把交易域耦合从页面层平移到另一层，而非真正收口

因此本轮必须坚持：

1. 只拆高价值职责，不做过度框架化
2. 优先解决状态边界和域耦合问题
3. 不回退现有完整创建能力

#### 1.6 验证策略

本轮若进入实现，至少需要验证：

1. `quotes/tabs/index.tsx` 职责明显收口
2. create mode 完整明细编辑能力不回退
3. 创建后原地切 detail mode 仍可用
4. 详情保存、转正式单、打印预览行为不受影响
5. TypeScript 编译通过

#### 1.7 非目标边界

本轮不做：

1. 不重做报价模块整体 UI
2. 不回退已接入的完整明细编辑器
3. 不扩展新的历史版本/作废记录/审批流功能
4. 不把交易域编辑器完全复制出一套报价专用实现

#### 1.8 结论

报价管理 TAB 当前最需要的不是继续堆功能，而是**做一次有限度的职责拆分与稳定性治理**。优先拆解 `quotes/tabs/index.tsx`、新增报价工作台 controller / create-editor hook，并为 quotes 与 trading 的复用关系加一层更清晰的防腐结构，才能让后续迭代继续稳定推进。

### 1. plan：报价域与 trading 域 adapter/façade 边界收口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

经过前几轮拆分后，报价工作台的页面编排层、dialog 内容层和 shell 层已经明显收口，但 quotes 域在“新建报价”这条链路上，仍然直接暴露在 trading 域的核心语义之下：

1. 表单状态来自 `useSalesOrderForm`
2. 创建提交来自 `useSalesOrderMutations`
3. 头部/明细/备注 UI 直接复用销售单据组件

这种复用本身没有问题，但当前缺少 quotes 侧自己的 adapter / façade，导致报价页虽然已经在结构上拆散了文件，却还没有在**领域边界**上真正收口。

#### 1.2 当前核心问题

##### 1.2.1 quotes 页面对 trading 语义仍然暴露过深

当前 quotes 页面层与 quotes hook 层，仍然知道并直接使用：

1. `useSalesOrderForm`
2. `useSalesOrderMutations`
3. trading 侧的表单字段与行编辑语义

这意味着只要 trading 域的字段规则、创建入参、校验逻辑稍有变化，quotes 域就会直接承压。

##### 1.2.2 现有 create-editor hook 仍偏向“复用拼装器”，而非“报价域 façade”

`use-quote-create-editor.ts` 当前已经把资源加载和创建保存从页面层抽走，但它仍直接公开 trading 风格的表单状态和行编辑操作。这是一个良好的过渡层，但还不是最终边界。

##### 1.2.3 若未来报价与正式销售订单分叉，当前实现仍会首先成为耦合断点

未来若出现：

1. 报价允许字段 ≠ 正式销售订单允许字段
2. 报价创建校验 ≠ 正式销售订单校验
3. 报价创建 API ≠ 正式销售订单创建 API

那么当前 quotes 直接暴露 trading 表单/mutation 的实现会最先失稳。

#### 1.3 本轮推荐目标

本轮不复制 trading 域，而是为 quotes 域增加轻量 adapter / façade，目标如下：

1. 页面层和工作台层优先依赖 quotes 自己的 hook / service 接口
2. trading 侧表单、mutation、资源装配细节尽量只停留在 quotes façade 内部
3. 保持现有成熟单据编辑器复用能力，不做重复建设

#### 1.4 推荐实施策略

建议按最小风险方式推进：

1. 新增 quotes 侧 façade / adapter 文件，例如：
   - `src/features/quotes/adapters/quote-sales-order-adapter.ts`
   - 或 `src/features/quotes/services/quote-create-facade.ts`
2. 将以下语义统一封装到 quotes 域：
   - create mode 初始表单
   - create mode 资源装配
   - create mode 创建提交
   - 创建成功后的 quotes 查询刷新与 detail mode 切换所需结果
3. `use-quote-create-editor.ts` 改为依赖 quotes façade，而不是直接依赖 trading mutation / trading 表单实现细节
4. 页面层与 dialog 层继续只消费 quotes 域返回的稳定接口

#### 1.5 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/hooks/use-quote-create-editor.ts`
2. 新增 `src/features/quotes/adapters/quote-sales-order-adapter.ts` 或等价 façade 文件
3. 视实现方式，可能新增 quotes 域类型文件用于描述 create editor 对外返回结构
4. `src/features/quotes/tabs/index.tsx`（只做接线级调整）

#### 1.6 风险与边界

主要风险：

1. 若 façade 抽象过厚，可能引入不必要的间接层
2. 若 façade 设计过薄，则只是把 trading 直接调用搬家，无法真正起到防腐作用

因此本轮必须坚持：

1. façade 只封装 quotes 真正在意的稳定语义
2. 不复制 trading 现有编辑器实现
3. 不回退已完成的完整报价创建能力

#### 1.7 验证策略

本轮若进入实现，至少验证：

1. 页面层不再直接依赖 trading mutation 语义
2. quotes create editor 对外接口更接近 quotes 语言，而非 sales order 语言
3. 创建报价、创建后切 detail mode、保存/转单/预览均不回退
4. TypeScript 编译通过

#### 1.8 结论

前几轮拆分解决的是“文件职责过载”问题；这一轮要解决的是“领域边界暴露过深”问题。下一步应为 quotes 域加一层轻量 adapter / façade，让报价工作台依赖 quotes 自己的稳定接口，而不是继续把 trading 域的表单与 mutation 语义直接扩散到页面与工作台层。

### 1. plan：createResources 并入 quotes create façade

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

上一轮已经完成 quotes 与 trading 的第一层 adapter/façade 收口：`use-quote-create-editor.ts` 不再直接处理 trading 创建 mutation、审计戳与查询刷新，而是转而依赖 `useQuoteSalesOrderAdapter(...)`。

但当前 create mode 资源装配仍然留在 `use-quote-create-editor.ts`：

1. 客户查询
2. 产品查询
3. 单位查询
4. 打孔查询
5. 贴标查询
6. drawing options 转换

这意味着 `use-quote-create-editor.ts` 仍然同时承担“报价工作台接口层”和“create mode 资源编排层”两种职责。

#### 1.2 当前问题

##### 1.2.1 façade 只收口了创建提交，没有收口资源装配

目前 quotes façade 已封装：

1. trading 表单桥接
2. trading 创建提交
3. 审计戳
4. 列表缓存刷新

但 create mode 资源仍在 façade 外部装配，导致 quotes create editor 仍然知道多个跨域查询细节。

##### 1.2.2 `use-quote-create-editor.ts` 仍偏重

它当前同时维护：

1. quotes façade 的桥接结果
2. customers/products/units/drilling/labeling 查询
3. drawing option 转换
4. createResources 聚合

这仍然不是一个足够薄的工作台接口层。

#### 1.3 本轮推荐目标

本轮建议进一步将 create mode 资源装配也下沉到 quotes create façade，使 quotes 域对外统一提供：

1. 报价草稿状态
2. 报价草稿编辑方法
3. createResources
4. 创建提交与创建状态

这样 `use-quote-create-editor.ts` 可以继续收口，甚至后续视情况退化为简单转发层。

#### 1.4 推荐实施策略

建议按最小风险方式推进：

1. 扩展 `src/features/quotes/adapters/quote-sales-order-adapter.ts`
   - 在 adapter 内整合：
     - `useGetCustomers`
     - `useGetProducts`
     - `useUnitsQuery`
     - drilling / labeling 查询
     - drawing option 转换
2. 在 adapter 对外暴露统一的 `createResources`
3. 简化 `use-quote-create-editor.ts`，只消费 quotes façade 并直接转发报价工作台所需接口
4. 保持 `tabs/index.tsx` 无需感知资源来源变化

#### 1.5 预计涉及文件

若后续进入实现，预计优先涉及：

1. `src/features/quotes/adapters/quote-sales-order-adapter.ts`
2. `src/features/quotes/hooks/use-quote-create-editor.ts`
3. 视情况可能补充 quotes 侧资源类型定义

#### 1.6 风险与边界

主要风险：

1. 若 adapter 收口过多，会演变成新的重文件
2. 若资源装配与表单桥接没有清晰分段，后续维护会重新堆叠

因此本轮必须坚持：

1. 继续做轻量 façade，而不是把所有 quotes 创建逻辑塞进一个巨型文件
2. 只收口 create mode 真正稳定且对页面不该暴露的资源装配细节
3. 不回退已完成的创建能力与 dialog 工作流

#### 1.7 验证策略

本轮若进入实现，至少验证：

1. `use-quote-create-editor.ts` 不再直接依赖客户/产品/单位/工艺查询细节
2. quotes façade 对外同时提供草稿编辑能力与 `createResources`
3. 页面层与工作台层行为不回退
4. TypeScript 编译通过

#### 1.8 结论

前一轮 adapter/façade 收口解决了“创建提交语义”外露的问题；这一轮要解决的是“资源装配细节”仍外露的问题。下一步应将 `createResources` 继续并入 quotes create façade，使报价工作台真正通过 quotes 域的单一稳定接口获取创建态所需能力。

### 1. plan：客户卡片补报价单号入口与报价弹窗联动

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前报价工作台已具备列表、创建、详情工作弹窗等完整能力，但客户侧仍缺一个重要闭环：在客户卡片中无法直接看到该客户是否已有报价、具体有哪些报价单号，也无法从客户卡片直接进入对应报价。

这会带来明显业务断层：用户在客户上下文里无法快速知道“这个客户有没有报价、报过哪几次、应该打开哪张报价单”，必须额外跳转到报价页再检索。

#### 1.2 本轮目标

本轮目标不是泛化做“客户全量报价历史中心”，而是优先补一个高频闭环：

1. 在客户卡片上显示该客户已有报价的单据号入口
2. 若存在多张报价，支持选择具体报价单号
3. 选中后直接拉起现有报价工作弹窗
4. 若当前没有报价，给出明确提醒并可直接拉起现有 create mode 报价弹窗
5. 继续复用现有 quotes detail/create mode，不复制第二套详情能力

#### 1.3 推荐实施思路

建议按最小风险方式推进：

1. 为客户卡片准备 quotes 侧的轻量报价摘要数据
   - 最低可行字段建议：
     - `quoteId`
     - `quoteNo`
     - `status`
     - `updatedAt`
2. 在客户卡片中增加“报价单号入口”展示区
3. 当该客户存在多张报价时，提供选择行为（如下拉、popover、菜单等）
4. 当该客户没有报价时，提供“暂无报价/立即报价”类提醒入口
5. 选中具体报价后，直接复用现有报价工作弹窗，进入对应 `detail mode`
6. 点击“立即报价”后，直接复用现有报价工作弹窗，进入对应 `create mode`

#### 1.4 关键边界

本轮必须坚持：

1. 不新增第二套报价详情弹窗
2. 不新增第二套新建报价弹窗
3. 不把客户模块直接耦合到报价详情实现内部
4. 优先通过 quotes 域对外提供轻量摘要/打开能力
5. 让客户卡片只知道“有哪些报价单号、用户选中了哪张、如何请求打开详情弹窗 / 新建弹窗”，而不是接管报价工作台逻辑

#### 1.5 预计涉及文件

若后续进入实现，预计优先涉及：

1. 客户卡片相关组件 / hooks（待定位具体文件）
2. quotes 侧摘要查询 hook / adapter（可能新增）
3. 报价工作弹窗打开能力的跨模块触发层（可能新增轻量 controller 或共享状态桥接）
4. 视情况补充客户侧到报价侧的联动类型定义

#### 1.6 风险与注意点

主要风险：

1. 若客户卡片直接持有报价工作台全部状态，会产生跨模块耦合膨胀
2. 若客户卡片只显示单据号但没有稳定的数据来源，后续会变成零散补丁
3. 若多报价选择交互做得过重，会让客户卡片本身变成次级报价页
4. 若“无报价时立即报价”另起一套创建入口，会破坏现有报价工作台闭环

因此本轮建议以“有报价则展示单据号并可选择、无报价则直接进入现有 create mode、两种情况都复用现有工作弹窗”为准，不扩展过多历史分析能力。

#### 1.7 验证策略

本轮若进入实现，至少验证：

1. 客户卡片能看到该客户已有报价单号
2. 多张报价时能正确选择具体报价
3. 无报价时能显示提醒并直接进入现有新建报价弹窗
4. 选择后能直接拉起现有报价工作弹窗
5. 报价页现有创建/详情/保存/转单能力不回退
6. TypeScript 编译通过

#### 1.8 结论

这一轮的核心不是新增一个“客户报价中心”，而是补齐“客户上下文 -> 报价工作台”的完整闭环：有报价就能直接打开对应报价，无报价就能直接进入现有新建报价弹窗。只有同时覆盖这两条路径，客户侧与报价侧才算真正打通。

### 1. plan：客户报价摘要升级为后端/独立接口级摘要

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前客户卡片的报价摘要来自 `useCustomerQuoteSummary`，其实现方式是：

1. 复用 quotes 列表接口 `/quotes`
2. 将客户名称塞入列表 `keyword`
3. 在前端对返回结果再次按 `customerName` 精确过滤

这种实现虽然能快速闭环，但数据语义并不稳定：

1. 客户卡片摘要被绑定在“报价列表页”的查询语义上
2. 容易受列表接口的分页、关键词搜索、后续筛选调整影响
3. 纯 `customerName` 匹配存在重名、改名、空格清洗差异等问题
4. 客户卡片只需要极小字段，却要复用更重的列表查询链路

#### 1.2 本轮目标

本轮目标是把客户报价摘要升级为**quotes 域独立摘要接口**，让客户卡片获取到更稳定、更精确的轻量数据：

1. 后端提供独立客户报价摘要接口，不再借道报价列表接口
2. 优先按 `customerId` 精确查询对应报价
3. 接口仅返回客户卡片所需的最小闭环字段
4. 前端新增独立 service / query key / hook 消费该接口
5. 客户卡片打开报价详情/新建报价的交互保持不变，仅替换摘要来源

#### 1.3 推荐接口形态

建议新增 quotes 域接口，例如：

1. `GET /quotes/customer-summary?customerId=...`

建议返回结构：

1. `items`
   - `quoteId`
   - `quoteNo`
   - `status`
   - `updatedAt`
   - `customerId`（可选，但建议带回，便于链路自校验）
2. `total`

说明：

1. 当前客户卡片只消费轻量展示，不需要复用列表页的 `amountLabel / ownerName / productSummary`
2. 返回字段越小，越能明确这是“客户卡片专用摘要接口”，避免未来再次被当成列表接口替代品

#### 1.4 推荐后端落点

建议落点：

1. `server/routes/routes_trading.go`
   - 为 quotes group 增加新的 GET 路由
2. `server/handlers/quotes.go`
   - 新增客户报价摘要 handler，解析 `customerId` / 兼容参数校验
3. `server/services/quote_query_service.go`
   - 新增客户报价摘要 query/service
   - 直接面向 `SalesOrder` 中报价数据做轻量投影查询

后端查询建议：

1. 优先 `customer_id = ?`
2. 仅查询未删除报价
3. 按 `updated_at desc` 排序
4. 仅选取摘要所需字段，避免 preload 全量明细行

#### 1.5 推荐前端落点

建议前端新增/调整：

1. `src/features/quotes/query-keys.ts`
   - 新增 customer summary query key
2. `src/features/quotes/contracts/*`
   - 新增客户报价摘要 DTO 定义
3. `src/features/quotes/services/*`
   - 新增独立 customer quote summary service
4. `src/features/quotes/hooks/use-customer-quote-summary.ts`
   - 改为直接消费独立接口
   - 入参从 `customerName` 升级为至少支持 `customerId`
5. `src/features/trading/components/customer-list-item.tsx`
   - 改为向 hook 传递 `customer.id`，必要时同时传 `customer.name` 作为兼容展示信息

#### 1.6 关键边界

本轮必须坚持：

1. 不新增第二套报价详情/创建弹窗
2. 不修改现有报价工作台 detail/create 核心逻辑
3. 不让客户卡片继续依赖报价列表接口的搜索/分页语义
4. 客户卡片只替换“摘要来源”，不接管 quotes 工作台内部状态
5. 尽量维持 quotes / trading 边界：摘要能力由 quotes 域提供，客户卡片只消费结果

#### 1.7 风险与注意点

主要风险：

1. 若后端摘要接口仍按 `customerName` 实现，稳定性提升有限
2. 若查询仍 preload 全量 `Lines`，会把“轻量摘要接口”做重
3. 若前端仍保留旧的列表复用分支，后续可能形成双轨来源
4. 若接口返回字段过多，会再次膨胀成次级列表接口

因此建议一次性做到：

1. 主查询走 `customerId`
2. 返回最小字段
3. 前端 hook 直接切到新接口
4. 删除/替换旧的列表复用摘要路径

#### 1.8 验证策略

若进入实现，至少验证：

1. 客户卡片在同名客户存在时不会串读其他客户报价
2. 已有报价客户能稳定展示正确单号列表
3. 无报价客户仍能正确显示“立即报价”入口
4. 选择报价后仍能打开现有 detail mode
5. 立即报价后仍能打开现有 create mode
6. 后端相关测试或最小定向校验通过
7. `pnpm exec tsc --noEmit` 通过

#### 1.9 结论

这轮升级的本质不是“再做一个查询接口”，而是把客户卡片报价摘要从“列表页副产物”升级成 quotes 域正式能力。只有这样，客户卡片上的报价入口才能在数据精度、接口边界和后续可维护性上真正稳定下来。

### 1. plan：`/auth/snapshot` 与登录 502 根因排查与修复

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前前端日志显示两条认证关键链路同时失败：

1. `GET /auth/snapshot` 返回 `502 Bad Gateway`
2. 登录页发起的 `POST /auth/login` 也返回 `502 Bad Gateway`

前端现象上表现为：

1. `AuthenticatedLayout` 在后台身份同步阶段调用 `/auth/snapshot`
2. 一旦失败，直接记录 `[CRITICAL] Background identity sync failed` 并跳回登录页
3. 登录页重新尝试 `/auth/login`，仍返回 502

这说明问题不是“某个页面单点请求失败”，而是认证公共链路整体异常。

#### 1.2 当前排查结论

已确认：

1. `POST /auth/login`
   - 由 `server/handlers/auth.go` 中 `LoginHandler` 处理
   - 登录成功前会调用 `dependencies.NewIdentityAccessServiceWithDB(db.DB).ResolveSnapshotForUser(user)`
   - 因此登录并不只是验密码，还依赖“身份权限快照解析”公共能力
2. `GET /auth/snapshot`
   - 由 `server/routes/routes.go` 挂在受保护路由上
   - `GetAuthSnapshotHandler` 自身较轻，但依赖 `AuthMiddleware` 预先完成 token 解析与 access snapshot 上下文装配
3. 两条链都共享“认证/权限快照”这条公共后端依赖

因此当前最优先怀疑点不是前端，而是：

1. 认证中间件链
2. `IdentityAccessService` / access snapshot 解析链
3. 其依赖的数据库、角色/权限数据或后端异常处理

#### 1.3 本轮目标

本轮目标是明确并修复导致 `/auth/login` 与 `/auth/snapshot` 同时 502 的根因：

1. 明确 502 来源于后端 panic、上游代理、还是公共依赖失败
2. 若是后端身份权限快照链路异常，修复其根因
3. 保持登录成功后仍返回稳定 token / user payload
4. 保持 `/auth/snapshot` 仍能返回前端所需身份与权限信息
5. 不用前端降级补丁去掩盖后端认证故障

#### 1.4 推荐实施顺序

建议按以下顺序推进：

1. 先复查 `server/middleware/auth.go`
   - 确认 token 解析、用户加载、access snapshot 注入过程是否可能 panic 或返回未兜底错误
2. 复查 `dependencies.NewIdentityAccessServiceWithDB(... )`
   - 确认 `ResolveSnapshotForUser(...)` / 相关解析逻辑对脏数据、缺失角色、空权限、DB 异常是否有稳定处理
3. 必要时做最小复现实验
   - 直接对 `/auth/login`、`/auth/snapshot` 做定向请求或后端测试
4. 只有在后端根因明确后，才考虑是否需要微调前端错误文案或跳转策略

#### 1.5 预计涉及文件

预计优先涉及：

1. `server/handlers/auth.go`
2. `server/middleware/auth.go`
3. `server/dependencies/*identity*` / `effective_access*` 相关文件（待进一步定位）
4. 如有必要，才涉及：
   - `src/components/layout/authenticated-layout.tsx`
   - `src/features/authz/services/effective-permission-service.ts`

#### 1.6 风险与注意点

主要风险：

1. 若只在前端把 502 改成“静默失败”，会让认证根因继续隐藏
2. 若登录链依赖 access snapshot，而 snapshot 解析对脏角色数据不容错，会导致整条认证链被拖垮
3. 若 `/auth/snapshot` 与 `/auth/login` 共用的公共依赖没有分层错误码，前端只能看到统一 502，难以定位

因此本轮必须坚持：

1. 优先修后端根因
2. 避免用前端重试/降级掩盖问题
3. 若发现后端错误边界不清晰，应补充更明确的服务端日志或错误响应

#### 1.7 验证策略

若进入实现，至少验证：

1. `POST /auth/login` 不再返回 502
2. `GET /auth/snapshot` 不再返回 502
3. 登录后 `AuthenticatedLayout` 不再陷入“同步失败 -> 重定向登录”循环
4. 前端登录与后台身份同步链路恢复正常
5. 定向后端测试或编译校验通过
6. `pnpm exec tsc --noEmit` 通过

#### 1.8 结论

这轮问题的关键不是“认证失败后如何前端兜底”，而是认证公共后端链路已经失稳。因为 `/auth/login` 与 `/auth/snapshot` 同时 502，所以必须优先从服务端认证/权限快照公共依赖入手，先恢复后端稳定性，再决定前端是否需要最小配套调整。

### 1. plan：客户管理报价记录区“新建报价”按钮引导增强

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前客户管理卡片在“暂无报价”场景下已经提供了“新建报价”入口，但按钮仍使用较弱的次级 outline 风格，与周围文字相比不够突出，难以承担“引导用户立即建立报价”的动作角色。

#### 1.2 本轮目标

本轮目标非常聚焦：

1. 提高“新建报价”按钮的视觉优先级
2. 让按钮更像主行动按钮，而不是次级附属操作
3. 增强“暂无报价 -> 立即建立报价”的引导感
4. 不改变现有联动逻辑与打开行为

#### 1.3 推荐实施方式

建议仅在 `src/features/trading/customer/components/customer-quote-entry-block.tsx` 中做最小 UI 调整：

1. 将“暂无报价”场景下的按钮从弱 outline 提升为更明显的主按钮或高对比强调样式
2. 结合更清晰的按钮文案，例如保留“新建报价”但增强颜色、阴影、hover 与尺寸感
3. 如有需要，可在按钮旁增加轻量提示标签，但不新增说明块级复杂结构

#### 1.4 关键边界

本轮必须坚持：

1. 不修改 `onCreateQuote` 行为
2. 不新增第二套报价创建入口
3. 不改已有报价时的打开/选择交互
4. 不把客户卡片做成独立报价页

#### 1.5 预计涉及文件

1. `src/features/trading/customer/components/customer-quote-entry-block.tsx`

#### 1.6 风险与注意点

1. 若视觉强调过重，可能压过整张客户卡片的其他操作
2. 若按钮样式与系统主按钮风格完全脱节，会破坏一致性
3. 因此建议做“明显但仍在系统设计语言内”的强化，而不是做广告式夸张样式

#### 1.7 验证策略

若进入实现，至少验证：

1. “暂无报价”场景下按钮显著更易发现
2. 点击仍正常打开现有报价工作台 `create mode`
3. TypeScript 编译通过

#### 1.8 结论

这轮不是功能新增，而是入口引导优化。目标是让“新建报价”在客户上下文中更像一个清晰、可感知、可立即采取的主行动入口，从而提高建立报价的引导效果。

### 1. plan：客户资料编辑保存失败（联系电话修改触发 `code/name` 为空）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前客户资料编辑中，仅修改联系电话后保存，会触发：

1. `POST /customers/:id/transactions`
2. 后端返回 `400`
3. 错误信息为：`invalid customer transaction payload: code and name must not be empty`

这说明问题不是联系电话字段本身非法，而是前端在提交统一保存事务时，没有把后端要求的最小主数据字段完整带回。

#### 1.2 当前排查结论

已确认：

1. `CustomerList.handleSaveCustomer(...)`
   - 在 patch 场景下，会调用 `buildCustomerSaveSnapshot(selectedCustomer, payload.data)` 生成 `finalData`
2. `customer-action-dialog.tsx`
   - 也会先用 `buildCustomerSaveSnapshot(customer, snapshot)` 生成一次 `nextData`
3. 后端 `partner_transaction_service.go`
   - 在统一保存事务里明确要求 `mergedFinalData.Code` 与 `mergedFinalData.Name` 不为空

因此本轮高概率根因在前端：

1. 局部编辑数据进入保存链时，`payload.data` / `snapshot` 中缺少 `code`、`name`
2. 某一层合并顺序或对话框返回数据不完整，导致最终提交给事务接口的 `finalData` 被裁空

#### 1.3 本轮目标

本轮目标是修复客户编辑保存链，使“只改联系电话”这类局部更新也能稳定提交：

1. 保证事务保存时 `finalData` 始终包含完整 `code` / `name`
2. 保证局部字段修改不会把其他必填主数据裁掉
3. 不回退现有事务保存架构
4. 不改后端统一保存语义，只修正前端 payload 组装缺口

#### 1.4 推荐实施方向

建议优先检查并修正以下点：

1. `src/features/trading/components/customer-action-dialog.tsx`
   - 确认提交给 `onSave` 的 `data` 是否已经是完整快照，还是仅局部变更
2. `src/features/trading/customer/utils/customer-save-snapshot.ts`
   - 确认合并逻辑是否会被空字符串、`undefined`、序列化裁剪等情况误伤
3. `src/features/trading/components/customer-list.tsx`
   - 确认 `handleSaveCustomer` 是否重复用不完整 `payload.data` 再次覆盖完整快照

优先怀疑点是：

1. 对话框层已经生成了较完整快照，但列表层又用较瘦的 `payload.data` 重新生成一次 `finalData`
2. 或对话框提交的 `data` 本身不是完整对象，只是局部 delta

#### 1.5 预计涉及文件

1. `src/features/trading/components/customer-action-dialog.tsx`
2. `src/features/trading/components/customer-list.tsx`
3. `src/features/trading/customer/utils/customer-save-snapshot.ts`

#### 1.6 风险与注意点

1. 若错误地把所有空字符串都回退成旧值，可能掩盖用户主动清空字段的意图
2. 若在两层都做快照合并，容易再次造成重复覆盖
3. 因此应优先明确“哪一层负责生成最终快照”，避免双重组装

#### 1.7 验证策略

若进入实现，至少验证：

1. 仅修改联系电话后可正常保存
2. 仅修改联系人、微信、地址等字段后也可正常保存
3. `code` / `name` 不会在 patch 保存时丢失
4. TypeScript 编译通过

#### 1.8 结论

这轮问题本质上不是后端校验过严，而是前端事务保存链没有稳定提交完整主数据快照。正确修复方式应是明确并收口客户编辑保存的最终快照装配责任，让局部编辑也能满足统一事务保存的最小数据要求。

### 1. plan：`use-bom-data.ts` 最小职责拆分

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在 `/engineering/bom` 页面 500 根因修复完成后，当前 BOM 模块中最明显的职责堆叠点已经明确暴露在 `src/features/engineering/hooks/use-bom-data.ts`：该文件同时承担了读取、错误策略、写入编排、Excel 导入导出与导入后二次加工。

这会带来两个持续风险：

1. 任何读取链修复都可能误伤写入或导入逻辑
2. 后续维护者很难快速判断某段改动属于“读链”、“写链”还是“导入链”

#### 1.2 当前排查结论

##### 1.2.1 当前最值得拆分的不是整个 BOM 模块，而是 `use-bom-data.ts`

当前 BOM 模块里：

1. `bom-mgmt.tsx` 主要仍是页面编排层
2. `use-bom-write-actions.ts` 职责相对清晰
3. `bom-service.ts` 仍然基本是服务层职责

真正多职责堆叠的是 `use-bom-data.ts`，因此本轮应优先做“最小职责拆分”，而不是整模块大重组。

##### 1.2.2 当前建议拆分后的结构

本轮建议拆成三层：

1. **`use-bom-read-data.ts`**
   - 负责 BOM / 产品 / 物料 query
   - 负责 `isLoading / loadError`
   - 负责读取结果分流

2. **`use-bom-import-export.ts`**
   - 负责模板下载
   - 负责 Excel 导入解析
   - 负责导入后二次加工与相关校验

3. **`use-bom-data.ts`**
   - 只负责 orchestration
   - 组合 read / write / import-export 三层
   - 对外返回接口尽量保持稳定，减少 `BOMMgmt` 变动

#### 1.3 推荐实施策略

本轮建议只做前端 hook 层的最小拆分：

1. 新增 `use-bom-read-data.ts`
2. 新增 `use-bom-import-export.ts`
3. 保留 `use-bom-write-actions.ts` 不动或仅做最小配合
4. 将 `use-bom-data.ts` 收口为薄组合层
5. 不动后端 BOM 服务，不动 BOM 表格/弹窗结构

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/hooks/use-bom-data.ts`
2. `src/features/engineering/hooks/use-bom-write-actions.ts`
3. `src/features/engineering/hooks/use-bom-read-data.ts`（新增）
4. `src/features/engineering/hooks/use-bom-import-export.ts`（新增）

#### 1.5 风险与破坏性评估

本轮风险主要在于拆分时是否会破坏 BOM 页现有稳定性：

1. 若对外返回接口变化过大，会扩大 `BOMMgmt` 改动面
2. 若把错误态逻辑拆散，可能把刚修好的 BOM 页面错误分支重新打乱
3. 若顺手改 BOM 表格、弹窗或后端，会扩大任务范围

因此本轮必须坚持：

1. 对外接口尽量稳定
2. 页面错误态逻辑保持不变
3. 只拆 hook 层，不扩散到无关层

#### 1.6 验证策略

本轮验证至少覆盖：

1. `/engineering/bom` 页面正常加载
2. BOM 页面错误态仍可正常展示
3. Excel 导入导出入口不受拆分影响
4. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不抽后端 `engineering_master_service.go`
2. 不重构 BOM UI 组件目录
3. 不扩散到 `use-bom-form.ts`

#### 1.8 当前阶段结论

当前 BOM 模块并不需要马上做整体系大重构，但 `use-bom-data.ts` 已经明确是职责最不清晰、最值得优先拆分的点。下一步应以最小改动方式拆出读取层与导入导出层，让 `use-bom-data.ts` 回归薄 orchestration hook，从而降低后续 BOM 读链、写链、导入链互相误伤的风险。

### 1. plan：`/engineering/bom` 页面 500 根因排查与修复

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户反馈 `/engineering/bom` 页面打开时直接 500，控制台出现：

1. `useBOMData.boms Error: [CRITICAL] BOM data is missing after load`
2. `BOMMgmt` 被 React error boundary 接管

这说明问题已经不是普通“列表加载失败提示”，而是 BOM 页面读取链把上游异常放大成了整页崩溃。

#### 1.2 当前排查结论

##### 1.2.1 当前真实故障链路

当前已确认读取链如下：

1. `BOMMgmt` 调用 `useBOMData()`
2. `useBOMData` 通过 React Query 调 `bomService.getBOMs()`
3. `bomService.getBOMs()` 请求 `/engineering/bom`
4. 若该接口失败，则 `bomsQuery.data` 在加载结束后仍为 `undefined`
5. `useBOMData` 当前逻辑把“加载完成但没有 data”统一视为 `[CRITICAL] BOM data is missing after load`
6. 随后执行 `failLoudly + throw`，导致页面级崩溃

因此当前 500 的表象在前端，但上游根因更可能位于：

1. 后端 `/engineering/bom` 列表接口本身异常
2. 或前后端列表契约不一致导致 parse 失败

##### 1.2.2 当前主要风险点

当前高风险点有两个层面：

1. **后端风险**
   - `ListBOMs` 预加载了：
     - `Product`
     - `ChangeOrder`
     - `Items`
     - `Items.Substitutes`
     - `Items.Substitutes.Material`
   - 任一关联查询、字段契约、脏数据、迁移差异都可能导致整个列表失败

2. **前端风险**
   - `useBOMData` 没有把“接口失败”和“空数据”区分开
   - 导致接口失败时，用户看到的是 `[CRITICAL] data missing`，而不是明确的错误态

#### 1.3 推荐实施策略

本轮建议按“先根因、后容错”处理：

1. 先定位并修复 `/engineering/bom` 列表接口或前后端契约根因
2. 再调整 `useBOMData`，把：
   - 接口失败
   - 空数据
   - 非法响应
   明确分流处理
3. BOM 页面在接口失败时应显示错误态/提示，而不是直接崩溃
4. 保持 BOM 管理页表格、弹窗、写入逻辑不变，只修读取链与错误呈现

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/hooks/use-bom-data.ts`
2. `src/features/engineering/services/bom-service.ts`
3. `src/features/engineering/tabs/bom-mgmt.tsx`
4. `server/handlers/bom.go`
5. `server/services/engineering_master_service.go`

#### 1.5 风险与破坏性评估

本轮风险主要在于 BOM 列表 authority 本身：

1. 如果只在前端去掉 `throw`，会掩盖后端真实失败
2. 如果只修后端不修前端错误分流，后续类似契约异常仍会再次把页面炸掉
3. BOM 模块属于核心工程主数据，不能接受“失败时静默空表”这种伪正常状态

因此本轮必须坚持：

1. 根因修复优先
2. 错误分流清晰
3. 页面 fail loudly 但不整页崩溃

#### 1.6 验证策略

本轮验证至少覆盖：

1. `/engineering/bom` 页面正常加载时 BOM 列表可显示
2. BOM 接口失败时页面显示明确错误，而不是直接崩溃
3. 定向前后端校验通过

#### 1.7 非目标边界

本轮不做：

1. 不顺手重构 BOM 表格或编辑弹窗结构
2. 不扩散到无关 engineering 模块
3. 不处理与本次 500 无关的 warning

#### 1.8 当前阶段结论

当前 `/engineering/bom` 的 500 不是单一前端报错，而是“上游 BOM 列表请求失败”与“前端错误分支设计过于激进”叠加造成的。下一步应优先修 BOM 列表接口或契约根因，并同步把 `useBOMData` 改成能区分接口失败与空数据的读取链，避免继续把 BOM 页面炸成整页错误。

### 1. plan：快捷扫描侧边栏 i18n 系统化收口

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前“快捷扫描”侧边栏已经出现明显的中英文混搭：

1. 面板标题、描述、空态、底部按钮为中文
2. 快捷动作卡片标题与描述为英文

这不是单纯的翻译遗漏，而是 `quick-actions` 模块从数据层到展示层都没有统一接入国际化体系。

#### 1.2 当前排查结论

##### 1.2.1 当前真实问题不是语言切换失效

当前 `LanguageProvider` 与 `useLanguage().t(...)` 是存在且可用的，真正的问题在于 quick-actions 模块没有系统接入：

1. `quick-action-registry.ts` 直接存储英文最终展示文案
2. `quick-action-drawer.tsx` 直接硬编码中文壳层文案
3. `quick-action-handle.tsx` 直接硬编码中文按钮与 `aria-label`

因此这块不是“切换没生效”，而是“根本没有统一 i18n 模式”。

##### 1.2.2 当前主要风险点

如果只把当前三张卡片英文替换成中文，会留下更大的结构性问题：

1. 英文模式仍不完整
2. 后续新增快捷动作时仍会继续散落硬编码
3. quick-actions 模块内部没有清晰的“文案 key authority”，长期维护风险高

#### 1.3 推荐实施策略

本轮建议按模块整体收口，而不是做局部替换：

1. `quick-action-registry.ts` 不再保存最终 `title / description` 文案，改为保存 i18n key
2. `quick-action-drawer.tsx` / `quick-action-handle.tsx` 统一接入 `useLanguage()` 与 `t(...)`
3. 为 quick-actions 模块补齐 `zh-CN / en-US` locale 文案
4. 保持权限判定、动作路由、排序逻辑不变，只调整文案 authority 与渲染方式

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/quick-actions/data/quick-action-registry.ts`
2. `src/features/quick-actions/components/quick-action-drawer.tsx`
3. `src/features/quick-actions/components/quick-action-handle.tsx`
4. `src/features/quick-actions/types.ts`
5. `src/locales/messages/zh-CN/*`
6. `src/locales/messages/en-US/*`

#### 1.5 风险与破坏性评估

本轮风险主要在于文案 authority 迁移，而不是业务逻辑变更：

1. 若 registry 与组件层同时改动但 key 设计不清晰，容易出现漏 key 或错 key
2. 若 locale 补齐不完整，某些语言模式下会出现回退或空字符串
3. 若顺手改权限或路由逻辑，会扩大影响面，不符合本轮目标

因此本轮必须坚持：

1. 文案 authority 单一化
2. 业务逻辑不变
3. 中英文两端都能完整渲染

#### 1.6 验证策略

本轮验证至少覆盖：

1. 中文模式下：标题、描述、卡片、空态、按钮全部为中文
2. 英文模式下：标题、描述、卡片、空态、按钮全部为英文
3. `pnpm exec tsc --noEmit` 通过

#### 1.7 非目标边界

本轮不做：

1. 不改 quick-actions 权限判定逻辑
2. 不新增新的快捷动作入口
3. 不改扫描页面业务逻辑
4. 不扩散到其它无关模块的国际化治理

#### 1.8 当前阶段结论

当前 quick-actions 模块的问题不是“有几句英文没翻译”，而是整个模块没有系统化中英文模式匹配。下一步应把 registry、组件、locale 三层统一收口到 `t(...) + locale keys` 体系中，让快捷扫描面板在中文与英文模式下都能完整一致地渲染，而不是继续维持中英硬编码混搭。

### 1. plan：新增型号模板读取链单独抽离

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前产品规格模板读取已经至少存在两种不同语义：

1. **新增型号**
   - 用户在创建态表单中选择分类
   - 系统按当前选择实时解析模板

2. **已建产品编辑**
   - 系统基于已有产品档案做读取补全
   - 当前允许结合历史 `templateKey` 兜底，避免既有档案因分类绑定变动而失真

这两条链路输入源不同、语义不同，不能长期共用一套“有效模板解析”入口。

#### 1.2 当前排查结论

##### 1.2.1 当前真实问题不是“都能解析模板”就够了

即使两条链当前都能解析模板，只要它们共用同一套入口，后续也容易在维护时被误解为同一种业务语义：

1. 新增型号是“当前选择态 authority”
2. 已建产品编辑是“既有产品补全 authority”

如果这两个 authority 不拆开，后续任何一侧需求变更都可能误伤另一侧。

##### 1.2.2 当前主要风险点

当前高风险点包括：

1. 若把编辑态的历史兜底逻辑带进新增态，会让创建态模板选择失去“当前选择即权威”的语义
2. 若把新增态的实时解析逻辑套回编辑态，会让历史产品在分类绑定变动时出现回显失真
3. 两条链若继续共用入口，后续维护者从命名上很难判断自己正在改哪一条路

#### 1.3 推荐实施策略

本轮建议采用明确分路的方式处理：

1. 为“新增型号模板读取链”单独抽离文件/入口
2. 该入口只负责：
   - 当前表单 `typeId` 对应分类模板绑定解析
   - 分类祖先链向上查找模板
3. 该入口**不负责**：
   - 历史产品 `templateKey` 兜底
   - 编辑态档案补全语义
4. 编辑态继续保留单独的“已建产品编辑读取链”入口
5. 在调用点上明确：
   - 创建态调用新增链
   - 编辑态调用编辑链

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/specs/index.ts`
2. `src/features/engineering/components/product-action-dialog.tsx`
3. 必要时新增 `src/features/engineering` 下专门承载新增型号模板读取链的文件

#### 1.5 风险与破坏性评估

本轮主要风险不在 UI，而在“调用点语义分流是否准确”：

1. 若创建态误调编辑态入口，会引入历史兜底污染
2. 若编辑态误调创建态入口，会丢失既有产品补全语义
3. 若只是文件拆开但命名仍然含糊，后续依然有高误用风险

因此本轮必须坚持：

1. 创建态 / 编辑态命名清晰区分
2. 调用点显式分流
3. 定向测试围绕“创建态不吃历史兜底、编辑态保留历史兜底”验证

#### 1.6 验证策略

本轮验证至少覆盖：

1. 创建态按当前分类直接绑定模板解析正确
2. 创建态按父分类继承模板解析正确
3. 创建态不依赖历史 `templateKey` 兜底
4. 编辑态继续保持既有产品补全语义不变
5. 前端 TypeScript 定向校验通过

#### 1.7 非目标边界

本轮不做：

1. 不改产品模板管理 UI
2. 不顺手重构规格组件本身
3. 不改后端产品写入逻辑
4. 不扩散到 BOM / Routing / 权限等无关模块

#### 1.8 当前阶段结论

这次最重要的不是“再把模板解析抽一个文件”，而是**明确新增态与编辑态是两种 authority**：新增型号模板读取必须以当前表单选择为准，已建产品编辑模板读取必须以档案补全语义为准。下一步应把这两条链在文件、命名、调用点、测试四个层面全部分开，避免后续任何人误把两条读取路径当成一条逻辑继续维护。

### 1. plan：已建产品编辑读取链从 product_master_service.go 单独抽离

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前“已建产品点击编辑”的读取链已经成为高风险关键路径：

1. 编辑态依赖产品读取后的模板补全语义正确
2. 当前模板绑定已支持分类祖先链解析，逻辑复杂度明显高于普通列表读取
3. 该逻辑目前仍埋在 `server/services/product_master_service.go` 中

由于该文件已经较大，继续把编辑态读取关键路径保留在大文件中，不利于后续稳定维护，也会提高误改风险。

#### 1.2 当前排查结论

##### 1.2.1 当前真正需要抽离的不是整份 product service

本轮不建议做“大拆文件”式重构，而是只抽离**已建产品编辑读取链**：

1. 产品基础读取后的模板派生
2. 分类祖先链模板绑定解析
3. 编辑态所需读取补全

也就是说，本轮应抽的是“编辑态 authority / 补全语义”，而不是所有产品 CRUD。

##### 1.2.2 当前主要风险点

如果不单独抽离，这条链路后续仍会面临：

1. `product_master_service.go` 内逻辑继续堆叠，关键编辑链难以单独审计
2. 模板派生与普通列表查询耦在一起，后续改查询时容易误伤编辑态
3. 高敏感逻辑没有形成独立命名与独立测试语义，维护成本偏高

#### 1.3 推荐实施策略

本轮建议采用**最小且安全的抽离策略**：

1. 把“已建产品编辑读取补全”抽到 `server/services` 下独立文件
2. 独立文件中承载：
   - 分类模板绑定祖先链解析 helper
   - 模板派生/编辑态补全 helper
   - 必要时为编辑态提供更明确的命名入口
3. `product_master_service.go` 保留对外服务函数，但把内部高风险实现委托给新文件
4. 保持 `GetProductByID(...)` 等现有对外签名与返回契约不变，避免影响 handler / 前端调用链

#### 1.4 预计涉及文件

预计优先涉及：

1. `server/services/product_master_service.go`
2. 新增 `server/services` 下专门承载产品编辑读取链的文件
3. `server/services/product_master_service_test.go`

#### 1.5 风险与破坏性评估

本轮主要风险不在业务规则变化，而在抽离时引入语义漂移：

1. 若抽离后函数职责不清，可能造成“列表读取”和“编辑读取”走出两套不同模板派生语义
2. 若只把代码移动位置而不固定测试断言，未来仍容易回退
3. 若抽离时改动对外接口，会放大影响面，不符合本轮“只收口关键路径”的目标

因此本轮必须坚持：

1. 对外契约不变
2. 内部职责更清晰
3. 测试覆盖更集中

#### 1.6 验证策略

本轮验证至少覆盖：

1. 直接分类绑定模板时，编辑读取补全正确
2. 子分类继承父分类模板时，编辑读取补全正确
3. 无模板绑定时，返回语义仍稳定
4. 定向 Go 测试通过

#### 1.7 非目标边界

本轮不做：

1. 不全面重构 `product_master_service.go` 全部产品 CRUD 逻辑
2. 不顺手改产品模板/产品分类管理链路
3. 不扩散到前端 UI 重构
4. 不扩散到 BOM / Routing / 权限等无关模块

#### 1.8 当前阶段结论

这次更合理的做法不是继续把编辑态关键链堆在 `product_master_service.go` 里，而是把“已建产品编辑读取补全”抽成独立文件与独立语义入口：让产品编辑读取链成为可单独审计、可单独测试、可单独维护的高可信路径，同时保持现有对外契约不变，尽量把风险收敛在服务层内部。

### 1. plan：产品型号编辑弹窗规格模板不回显修复

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户反馈：

1. 已存在的产品型号在“编辑产品规格”弹窗中，顶部“规格模板”字段为空
2. 中部规格区域未渲染模板表单，而是停留在“待选择规格模板”占位态
3. 产品模板管理页中的模板记录实际存在，且过程无任何报错提示

这说明问题更像是“编辑态模板绑定解析链路失效”，而不是“模板主数据不存在”。

#### 1.2 当前排查结论

##### 1.2.1 当前模板回显依赖链

当前前端链路如下：

1. `ProductPartsMgmt` 通过 `useProductMgmt()` 查询 `productTypes`
2. `ProductActionDialog` 在编辑时根据表单 `typeId`，从 `productTypes` 中找到 `selectedType`
3. 只有当 `selectedType.templateId` 存在时，才会调用 `getEffectiveTemplate(selectedType)`
4. 模板解析成功后：
   - 顶部“规格模板”输入框显示 `templateLabel`
   - 中部规格表单按 `componentKey` 渲染对应模板组件

##### 1.2.2 当前主要缺口

当前真实缺口不是模板数据缺失，而是弹窗上下文里的分类对象一旦缺少 `templateId`，界面就会静默退化：

1. `ProductActionDialog` 对 `selectedType.templateId` 为空的场景直接执行：
   - `setBoundTemplate(null)`
   - `setTemplateResolveError(null)`
2. 这会让 UI 看起来像“没有模板”，但不会暴露任何异常信息
3. 因此只要 `useProductMgmt -> ProductTypeService -> adapter/cache` 这条链中任一环节返回的是“缺少 `templateId` 的分类对象”，编辑态模板必然不回显

##### 1.2.3 当前高概率根因方向

高概率根因集中在以下链路：

1. `productTypes` 查询结果在进入编辑弹窗前，没有稳定保留 `templateId`
2. 可能存在 list/options DTO、归一化、缓存或树拍平过程中模板绑定字段被裁掉或覆盖
3. 当前组件对该异常缺少最小可观测性，导致页面仅表现为静默空白

#### 1.3 推荐实施策略

本轮建议最小且直达根因地处理：

1. 先修复 `productTypes` 进入编辑弹窗时的模板绑定完整性，确保 `selectedType.templateId` 可稳定获取
2. 复核 `ProductTypeService`、`product-type-api-adapter`、调用点查询方式，避免 list/options 查询口径不一致
3. 在 `ProductActionDialog` 中补充最小必要的容错/告警，避免再次无提示退化为“待选择规格模板”
4. 不改模板管理页，不重做规格表单组件结构，只修产品编辑回显链路

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/hooks/use-product-mgmt.ts`
2. `src/features/engineering/components/product-action-dialog.tsx`
3. `src/features/engineering/services/product-type-service.ts`
4. `src/features/engineering/adapters/product-type-api-adapter.ts`
5. 必要时复核 `src/features/engineering/tabs/product-parts-mgmt.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，主要是前端查询与回显链路修复，但仍需注意：

1. 若 `productTypes` 同时被列表筛选、分类树、编辑弹窗共用，调整查询口径时不能破坏现有分类展示
2. 若模板绑定字段问题来自后端返回口径差异，需要避免前端只做表面补丁而掩盖契约问题
3. 若增加容错提示，需要保持编辑弹窗当前交互结构不被打乱

#### 1.6 非目标边界

本轮不做：

1. 不改产品模板管理页 UI 或录入逻辑
2. 不顺手重构产品规格模板组件
3. 不扩散到 BOM / Routing / 权限等无关模块
4. 不处理无关样式 warning

#### 1.7 当前阶段结论

当前问题更像是“产品编辑态读取到的分类对象缺少模板绑定信息”，而不是模板页没有数据。下一步应优先修复 `productTypes -> selectedType.templateId -> getEffectiveTemplate(...)` 这条链路，并补足最小可观测性，防止同类问题继续以静默空白方式出现。
日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在 `engineering` 主线已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段收口
3. `720` BOM 剩余控制字段收口
4. `721` ProductProcessRouting 版本控制字段收口
5. `722` BOM 剩余枚举/日期控制字段收口

之后，下一组更自然、且仍然属于同类“字段规范化收口”的模块，是 `production-shared` 中的机器码字段：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，`production-shared` 域内已经具备：

1. `normalizeProductionLineCode(...)`
2. `normalizeProductionProcessStepCode(...)`
3. `normalizeProductionLineEntity(...)`
4. `normalizeProductionProcessStepEntity(...)`

并且已有局部接入：

1. `production-lines-service.ts` 保存边界已复用 `normalizeProductionLineEntity(...)`
2. `production-processes-service.ts` 保存边界已复用 `normalizeProductionProcessStepEntity(...)`
3. `production-resource-api-adapter.ts` DTO 边界已复用 `normalizeProductionLineCode / normalizeProductionProcessStepCode`

##### 1.2.2 当前主要缺口

当前真实问题不是缺少 helper，而是 line / process 页面边界仍有局部散落处理：

1. `line-dialog.tsx` 的输入边界、自动生成编号边界仍在局部处理
2. `process-library-panel.tsx` 提交前仍直接散落调用 `normalizeProductionProcessStepCode / normalizeProductionProcessStepEntity`
3. service / adapter 虽已接入 helper，但页面层与保存层之间还没有形成更清晰的单一入口语义

#### 1.3 推荐实施策略

本轮建议：

1. 保持 `production-code-normalization.ts` 作为 `production-shared` 机器码单一入口
2. 收口 line / process 的输入边界、提交前 payload 组装边界、service 保存边界、adapter DTO 边界
3. 去掉页面层重复散落的 code 规范化调用，让页面更多只表达用户输入与提交意图

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/production-shared/utils/production-code-normalization.ts`
2. `src/features/production-shared/tabs/line-mgmt/components/line-dialog.tsx`
3. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
4. `src/features/production-shared/services/production-lines-service.ts`
5. `src/features/production-shared/services/production-processes-service.ts`
6. `src/features/production-shared/adapters/production-resource-api-adapter.ts`

#### 1.5 非目标边界

本轮不做：

1. 不扩到 `segments / jobCategories / attributes`
2. 不重做 line / process 页面 UI 结构
3. 不顺手改无关 `version / authCode / delta` 逻辑
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`production-shared` 的 `ProductionLine.code / ProductionProcessStep.code` 已经有域内 helper 和部分 service / adapter 接入，但页面输入与提交前边界仍然存在局部散落的规范化调用。下一步最合理的方式，是把这两个字段继续收口到 `production-code-normalization.ts` 统一入口，让 line / process 的输入、提交、保存、DTO 边界共享同一套口径，作为 `engineering` 主线之后最自然的相邻字段治理模块。

### 1. plan：BOM 剩余枚举/日期控制字段接入统一 helper

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段 `bomNo / bomVersion` 收口
3. `720` BOM 剩余控制字段 `revisionNo / siteCode / changeOrderNo` 收口
4. `721` ProductProcessRouting 版本控制字段收口

之后，engineering 主线里下一组仍然自然留在 BOM 内、且规则已存在但边界未统一的字段，是：

1. `changeType`
2. `status`
3. `effectiveFrom`
4. `effectiveTo`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，底层已经具备：

1. `normalizeBomChangeType(...)`
2. `normalizeBomStatus(...)`
3. `normalizeBomEffectiveDate(...)`

并且 BOM 侧已有局部接入：

1. `bom-table.tsx` 展示列已使用这些 helper
2. `bom-preview.tsx` 预览视图已使用这些 helper
3. `schema.ts` 已对 `changeType / status / effectiveFrom / effectiveTo` 定义约束或默认值

##### 1.2.2 当前主要缺口

当前真实问题不是缺少规则，而是这组字段仍未接回 BOM 统一输入/保存入口：

1. `use-bom-form.ts` 默认值仍直接写死 `changeType: 'MANUAL' / status: 'active'`
2. `bom-form-header.tsx` 的 `changeType` 与日期输入还没有统一通过 BOM helper 收口
3. `normalizeBOMInput(...)` 当前尚未纳入这组字段
4. `bom-service.ts` 保存边界当前仍以 `trimToNull` 为主，没有明确复用 BOM 枚举/日期 helper

#### 1.3 推荐实施策略

本轮建议继续沿用 `719 / 720` 的收口方式：

1. 为 BOM 剩余枚举/日期控制字段补统一 helper 入口
2. 收口 BOM 默认值、输入边界、提交前 payload、service 保存边界
3. 保留表格/预览展示层继续复用底层 helper，但不再让表单与保存边界各自散落处理

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/tabs/bom-mgmt.tsx`
5. `src/features/engineering/services/bom-service.ts`

#### 1.5 非目标边界

本轮不做：

1. 不扩到 `items / substitutes`
2. 不改 BOM 表格/预览 UI 结构
3. 不顺手扩成 routing 或 Product 主线调整
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`BOM` 当前已经先后收口了 `bomNo / bomVersion` 以及 `revisionNo / siteCode / changeOrderNo`，但 `changeType / status / effectiveFrom / effectiveTo` 仍主要停留在“schema 有约束、展示层有 helper、表单与保存边界各自处理”的状态。下一步最合理的方式，就是把这组剩余枚举/日期字段也接回 `normalizeBOMInput(...)` 或相邻 BOM helper，让默认值、输入、提交、保存边界共享同一套口径，完成 BOM 控制字段主线的最后一段收口。

### 1. plan：ProductProcessRouting 版本控制字段接入统一 helper

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段收口
3. `720` BOM 剩余控制字段收口

之后，engineering 中下一组较自然的版本/控制语义字段，是 `ProductProcessRouting` 里的：

1. `versionControlTag`
2. `isCurrentlyActiveBlueprint`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，至少已有：

1. `schema.ts` 中 `versionControlTag` 默认值为 `V1.0`
2. `schema.ts` 中 `isCurrentlyActiveBlueprint` 默认值为 `true`
3. `default-builders.ts` 中 `createProductRoutingDraft(...)` 默认值为：
   - `versionControlTag: 'V1.0.0.Draft'`
   - `isCurrentlyActiveBlueprint: true`

##### 1.2.2 当前主要缺口

当前真实问题不是字段缺少定义，而是 `ProductProcessRouting` 这条链路还没有像前几轮那样形成完整的 service / adapter / write hook 收口点：

1. 当前主要只有 `createProductRoutingDraft(...)` 在管理默认值
2. `product-routing-view.tsx` 仍是本地 state / mock 风格视图
3. 当前未找到明确的 routing save service、DTO adapter、write hook
4. 因此如果直接套用 `718/719/720` 那种“全链路保存边界收口”模板，容易过度假设现状

#### 1.3 推荐实施策略

本轮建议更保守地推进：

1. 先为 `ProductProcessRouting` 抽取版本控制字段统一 helper
2. 优先收口当前已经真实存在的边界：
   - schema/default draft
   - 当前视图 state
   - 显示口径
3. 不假设当前已经存在完整 routing 保存链路
4. 在后续真正出现 routing save service / adapter 之后，再继续往更完整的边界推进

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/engineering/utils/product-code-normalization.ts` 或相邻 engineering helper 文件
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/components/product/product-routing-view.tsx`
4. 必要时复核 `src/features/engineering/data/schema.ts`

#### 1.5 非目标边界

本轮不做：

1. 不假造后端 routing save service
2. 不扩成 `routeNodes` 深层治理
3. 不把当前 mock 视图直接重构成完整编辑器
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`ProductProcessRouting` 的 `versionControlTag / isCurrentlyActiveBlueprint` 已经有零散默认值和展示位，但还没有形成像 `Product / ChangeOrder / BOM` 那样完整的输入-提交-保存链路。因此下一步最合理的方式，不是硬套完整收口模板，而是先把这两个字段提升成 engineering 域里的统一 helper，先收口 draft 默认值与当前视图 state 口径，再视后续真实保存链路是否出现决定下一层治理范围。

