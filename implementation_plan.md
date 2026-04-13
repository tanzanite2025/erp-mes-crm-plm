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

