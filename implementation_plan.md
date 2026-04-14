### 1. plan：模板主页预置模板禁止删除

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板主页会展示系统预置模板与普通模板卡片，但当前卡片上的删除按钮未区分模板类型，导致系统预置模板也暴露出可删除入口。

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是布局，而是模板主页的删除权限表达错误：

1. 三个系统预置模板从业务上不应允许被随意删除
2. 卡片上仍显示可点击删除按钮，会误导用户
3. 如果不在页面层先限制，容易造成误操作预期

##### 1.2.2 目标体验

模板主页应明确区分：

1. 系统预置模板：可查看、可编辑，但不可删除
2. 用户自定义模板：可按原有流程删除

用户在预置模板卡片上应一眼看出“该模板不能删除”，而不是点下去才发现异常。

#### 1.3 推荐实施策略

本轮建议优先在模板主页卡片层做收口：

1. 在 `template-mgmt.tsx` 中判断模板是否属于系统预置模板
2. 对预置模板删除按钮改为禁用态或仅展示不可删提示
3. 对普通模板维持当前删除逻辑不变
4. 必要时补充 tooltip / 文案说明“系统预置模板不可删除”

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 必要时补充本页使用的文案配置

#### 1.5 风险与破坏性评估

本轮风险较低，但需要注意：

1. 不能误伤普通模板的删除能力
2. 预置模板判断逻辑必须可维护，不能靠脆弱的临时字符串硬编码散落多处
3. 页面层禁用后仍需保持交互反馈清晰，避免用户误以为按钮失效是 bug

#### 1.6 非目标边界

本轮不做：

1. 不修改模板保存与创建逻辑
2. 不重构模板主页卡片整体样式
3. 不扩展到其它主数据页面的删除权限收口

#### 1.7 当前阶段结论

模板主页应明确保护系统预置模板，避免删除入口给出错误预期。下一步应在模板卡片层实现“预置模板不可删除”的禁用与提示策略。

### 1. plan：模板弹窗内部信息架构与三列内容重排

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板弹窗已经完成宽度放大、固定三列与布局/内容拆分，但当前列内信息组织仍然不够稳定：

1. 基础信息、装配说明、装配列表、预览内容的区块边界不够鲜明
2. 视觉上更像把原有内容横向摊开，而不是经过规划的编辑器结构
3. 继续只调尺寸已经不能解决“内容摆放杂乱”的问题

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是宽度或裁切本身，而是模板弹窗三列内部的信息架构还没有收口：

1. 左列缺少“模板基础信息 / 模板身份摘要”的清晰层次
2. 中列缺少“装配操作区”与“装配结果区”的明确分离
3. 右列缺少“模板组件预览摘要”与“已装配属性预览”的稳定区块结构

##### 1.2.2 目标体验

模板弹窗应体现为一个结构明确的编辑器：

1. 左列：模板是什么
2. 中列：模板装配了什么、如何继续装配
3. 右列：当前模板最终会长成什么样

用户应能一眼分辨：

1. 哪里改基础信息
2. 哪里加/删属性分类
3. 哪里看最终结果

#### 1.3 推荐实施策略

本轮建议在已完成拆分的组件边界上继续做内容重排：

1. 在 `template-editor-dialog.tsx` 中为三列各自建立清晰的 section 分区
2. 左列增加模板身份摘要与基础字段分组
3. 中列拆成“装配操作条”与“已装配列表”两段
4. 右列拆成“模板规格摘要”与“装配结果预览”两段
5. 通过标题、说明、间距和容器层级统一视觉结构

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/template-mgmt/template-editor-dialog.tsx`
2. 必要时微调 `src/features/engineering/components/template-mgmt/template-editor-dialog-layout.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，主要是信息架构与前端展示重排，但需注意：

1. 不得破坏现有模板保存、装配、删除、required 切换行为
2. 不得把列内容重排成新的滚动陷阱或裁切问题
3. 必须维持当前已收口的固定三列布局稳定性

#### 1.6 非目标边界

本轮不做：

1. 不修改模板数据模型
2. 不新增拖拽排序或批量操作
3. 不调整产品类型页或产品编辑页布局
4. 不扩散到其它工程管理弹窗

#### 1.7 当前阶段结论

当前模板弹窗已经具备稳定的外层布局，但内部信息架构还未完成最后收口。下一步应对三列内部区块重新分组与排序，让弹窗真正成为可读、可用的模板编辑器。

### 1. plan：模板弹窗布局与内容解耦、固定三列重构

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板管理页已经支持模板属性装配与预览，但弹窗目前仍存在两个问题：

1. 预览列在当前固定布局尝试下仍然被裁切，显示不完整
2. `template-mgmt.tsx` 同时承载大量布局样式、三列 DOM 和编辑逻辑，导致每次调布局都在原文件上反复打补丁，稳定性差

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是数据或保存逻辑异常，而是模板弹窗前端结构还没有完成布局与内容职责分离：

1. 弹窗容器宽度、三列比例、内部滚动策略和列内容都堆在同一个文件中
2. 预览列最小宽度与整体三列分配没有稳定收口，导致右侧内容被裁切
3. 属性装配项数量变化时，布局调优容易反复牵动整个弹窗结构

##### 1.2.2 目标体验

桌面端模板弹窗应收口为稳定的三列编辑器：

1. 左列：基础信息
2. 中列：属性装配
3. 右列：模板预览

并满足：

1. 外层宽度固定
2. 三列比例固定
3. 各列必要时独立滚动
4. 添加属性不会导致整体布局抖动或右列被裁切

#### 1.3 推荐实施策略

本轮建议停止在 `template-mgmt.tsx` 原地堆叠布局补丁，改为结构性收口：

1. 抽出模板弹窗专用布局组件文件，只负责 `DialogContent`、三列 grid、滚动区与尺寸策略
2. 将基础信息列、属性装配列、预览列通过明确 props/slots 挂入布局组件
3. `template-mgmt.tsx` 保留状态、查询、保存与事件编排，不再承载整段三列布局细节
4. 固定桌面端宽度与三列比例，同时为预览列设置稳定最小宽度，彻底消除裁切问题

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 新增模板弹窗专用布局文件
3. 必要时新增模板弹窗内容片段文件

#### 1.5 风险与破坏性评估

本轮风险中低，主要是前端组件拆分与布局重构，但需注意：

1. 不得破坏模板保存、删除、装配增删与 required 切换语义
2. 拆分后 props 边界必须清晰，避免将状态管理重复散落到多个文件
3. 必须保留移动端/窄屏单列兜底，不让固定三列直接压坏小屏

#### 1.6 非目标边界

本轮不做：

1. 不修改模板数据模型
2. 不新增拖拽排序、折叠分组等新交互
3. 不重构产品类型页或产品编辑页
4. 不顺手处理无关工程页面样式

#### 1.7 当前阶段结论

当前模板弹窗问题已经不适合继续在单文件中局部调 class。下一步应先完成布局/内容职责拆分，再固定桌面端三列比例与预览列最小宽度，从结构上稳定模板弹窗表现。

### 1. plan：模板编辑弹窗桌面端宽度与布局修正

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前模板管理页已经支持模板属性装配与右侧基础预览，但弹窗在桌面端仍采用偏窄的容器宽度，导致：

1. 左侧基础字段区被压缩过窄
2. 中部属性装配区与右侧预览区可用宽度不足
3. 整体观感更接近“手机竖向长条弹层”，与桌面大屏使用场景不匹配

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是数据错误，而是模板弹窗的桌面端布局没有针对大屏展开：

1. 弹窗整体 `max-width` 偏小
2. 内部列宽分配不合理，导致装配区与预览区都被压缩
3. 说明文本、按钮和预览卡片在同一窄列中竞争空间，造成拥挤和阅读负担

##### 1.2.2 预期体验

桌面端应优先体现“横向编辑器”体验：

1. 左侧放基础信息
2. 右侧放属性装配与模板预览
3. 让装配区和预览区拥有足够宽度，不再出现大段留白却内容区很窄的情况

#### 1.3 推荐实施策略

本轮建议做最小但直接有效的布局修正：

1. 放大模板编辑弹窗桌面端宽度，优先使用 `xl / 2xl` 级别容器
2. 将弹窗主体改为更明确的横向分栏布局，可采用 `1:2` 或 `2:3` 分栏
3. 为属性装配区和预览区设置合理最小宽度，必要时分别允许内部滚动
4. 保持移动端仍可回落为单列，不破坏小屏体验

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 若出现文案密度问题，再评估是否调整少量 locale 文案

#### 1.5 风险与破坏性评估

本轮风险较低，主要是前端布局层调整，但需注意：

1. 不能破坏现有模板保存、删除、属性装配交互
2. 不能让移动端弹窗直接继承桌面宽度导致溢出
3. 若引入内部滚动，需要避免 footer 按钮被遮挡

#### 1.6 非目标边界

本轮不做：

1. 不新增模板装配排序与拖拽
2. 不修改模板数据模型或保存语义
3. 不扩散到产品类型页或产品编辑页布局
4. 不处理无关页面的样式问题

#### 1.7 当前阶段结论

当前问题本质是模板编辑弹窗未按桌面端编辑器场景设计宽度与分栏。下一步应先放大弹窗容器并重排内部分栏，让模板基础信息、属性装配与右侧预览在大屏下同时具备可读性。 

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

### 1. plan：`mold-core-service.ts#getGroupNames` 聚合下沉到后端接口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/equipment-tooling/services/mold-core-service.ts` 中的 `getGroupNames()` 不是走后端聚合接口，而是：

1. 先调用 `getMolds()`
2. 全量拉取模具列表
3. 在前端执行 `map(groupName) + filter(Boolean) + Set 去重`

这意味着在大数据量场景下，组名聚合的计算重心错误地停留在前端，额外放大了网络传输与浏览器内存负担。

#### 1.2 当前排查结论

当前实查结果如下：

1. `MoldCoreService.getGroupNames()` 当前直接依赖 `getMolds()`，不是单独的聚合查询
2. `getMolds()` 最终调用的是后端 `GET /molds`
3. 后端 `server/handlers/molds.go` 当前提供：
   - `GET /molds`
   - `GET /molds/:id`
   - `GET /molds/check-sn`
   - `GET /molds/capacity`
   - 但没有“模具组名聚合”只读接口
4. `GET /molds?options=true` 仍返回全量模具记录，只是换成 options 口径，并未下推组名聚合
5. 当前至少有两个前端消费点依赖 `AssetService.getGroupNames()`：
   - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
   - `src/features/engineering/hooks/use-product-form-init.ts`

#### 1.3 本轮目标

1. 让模具组名列表的 authority 回到后端
2. 避免前端为了拿组名而全量拉取所有模具记录
3. 保持前端消费 `string[]` 的契约尽量不变，降低调用点改造成本

#### 1.4 推荐实施方向

1. 在后端新增模具组名聚合只读接口，例如 `GET /molds/group-names`
2. 在 handler 中直接基于数据库做去重查询：
   - 只返回非空 `group_name`
   - 去重
   - 视情况排序，保证返回稳定
3. 前端 `MoldCoreService.getGroupNames()` 改为直接调用新接口
4. `AssetService.getGroupNames()` 保持现有导出形态，避免上层调用点大面积改签名

#### 1.5 预计涉及文件

预计优先涉及：

1. `server/handlers/molds.go`
2. `server/routes/routes_equipment.go`
3. 如需解耦，新增 `server/services` 下模具组名聚合查询文件
4. `src/features/equipment-tooling/services/mold-core-service.ts`
5. 必要时复核 `src/features/equipment-tooling/services/asset-service.ts`
6. 复核消费点：
   - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
   - `src/features/engineering/hooks/use-product-form-init.ts`

#### 1.6 风险与注意点

1. 新接口必须保持 menu/equipment 权限口径与现有 `/molds` 一致，避免读权限漂移
2. 返回值应保持 `string[]` 或等价极简结构，避免把简单聚合又做成重 DTO
3. 若数据库中存在空字符串、空白字符串、大小写差异组名，需要明确是否在后端统一 trim / 过滤 / 排序
4. 不应继续复用 `/molds?options=true` 做“伪聚合”，否则只是换皮不换根因

#### 1.7 非目标边界

本轮不做：

1. 不重构整套模具列表分页接口
2. 不顺手改模具弹窗的数据加载方式
3. 不扩散到 drawing / capacity / loan 等无关 equipment 子模块
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. 后端新增组名聚合接口可返回去重后的模具组名列表
2. 前端 `getGroupNames()` 不再依赖全量 `getMolds()`
3. 模具弹窗与工程产品表单仍可正常读取组名选项
4. `go test ./handlers ./routes -run Mold` 或等价定向校验通过
5. `pnpm exec tsc --noEmit` 通过

#### 1.9 结论

这项问题的根因不在于“前端去重写法不够优雅”，而在于组名聚合 authority 放错了层。下一步应把模具组名去重与筛选收口到后端只读接口，让前端回归消费聚合结果，而不是继续承担全量取数后的二次计算。

### 1. plan：`mold-action-dialog.tsx` 读取链切换到 React Query

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/equipment-tooling/components/mold-action-dialog.tsx` 在弹窗打开时，仍通过 `useEffect` 手动读取服务端数据：

1. `AssetService.getGroupNames()`
2. `DrawingService.getDrawingsByMold(editData.sn)`

并把结果分别塞入本地 `useState`：

1. `groupNames`
2. `linkedDrawings`

这与“服务端真相归属于 React Query”的约束不一致，也让远端读链与表单本地 reset 副作用混在同一个 effect 中。

#### 1.2 当前排查结论

当前实查结果如下：

1. `mold-action-dialog.tsx` 的 `useEffect` 当前同时承担三类职责：
   - 远端读取 group names
   - 远端读取 linked drawings
   - 本地 `form.reset(...) / tracker.reset(...)`
2. `groupNames` 与 `linkedDrawings` 当前都以本地 state 形式存在，而不是 Query data
3. `DrawingService.getDrawingsByMold(moldSn)` 已经是稳定的服务层入口，适合直接接入 React Query
4. `AssetService.getGroupNames()` 现在也已切换到后端聚合接口，适合继续上接 React Query
5. 当前 equipment-tooling 域内虽然已有若干 `useQuery` 用法，但尚未为 mold dialog 抽出专门的 query hook

#### 1.3 本轮目标

1. 让 `groupNames` 与 `linkedDrawings` 的服务端真相归属于 React Query
2. 让 `mold-action-dialog.tsx` 不再在 `useEffect` 中手动 fetch 远端数据
3. 保留表单 reset / tracker reset 的本地副作用，但与远端读链解耦

#### 1.4 推荐实施方向

1. 新增 `useMoldGroupsQuery(open)`：
   - `enabled: open`
   - `queryFn: AssetService.getGroupNames`
2. 新增 `useMoldDrawingsQuery(open, moldSn)`：
   - `enabled: open && !!moldSn`
   - `queryFn: () => DrawingService.getDrawingsByMold(moldSn)`
   - 新建态直接返回空数组口径，不再手工 `Promise.resolve([])`
3. `mold-action-dialog.tsx` 去掉 `groupNames` / `linkedDrawings` 本地 state
4. 保留单独的 `useEffect` 只负责：
   - 根据 `editData` / `open` 执行 `form.reset(...)`
   - 执行 `tracker.reset(...)`

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/equipment-tooling/components/mold-action-dialog.tsx`
2. 新增 `src/features/equipment-tooling/hooks/use-mold-groups-query.ts`
3. 新增 `src/features/equipment-tooling/hooks/use-mold-drawings-query.ts`
4. 如需统一 key，复核 `src/features/equipment-tooling/hooks` 下现有 query key 组织
5. 必要时复核 `src/features/equipment-tooling/services/asset-service.ts`
6. 必要时复核 `src/features/equipment-tooling/services/drawing-service.ts`

#### 1.6 风险与注意点

1. 不要把表单 reset 逻辑也误并入 query hook，避免远端读链和本地表单生命周期再次耦合
2. 编辑态 / 新建态的 drawings 查询启用条件必须明确，避免空 `sn` 时发无效请求
3. 若 query 在关闭弹窗后保留缓存，要确保 reopened 时 UI 口径仍正确，不影响 reset 语义
4. 不把这次整改扩成整套 mold dialog 状态机重构

#### 1.7 非目标边界

本轮不做：

1. 不重构模具弹窗 UI 结构
2. 不顺手改保存 / duplicate check / onConfirm 写链
3. 不扩散到 drawing 管理页或 mold 管理页其它读链
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. `mold-action-dialog.tsx` 不再在 `useEffect` 中手动 fetch `groupNames` / `linkedDrawings`
2. `groupNames` 与 `linkedDrawings` 改由 query hook 提供
3. 新建态不请求 drawings，编辑态在有 `sn` 时正常读取 drawings
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过，若仅剩既有 warning 需在 `walkthrough.md` 记录

#### 1.9 结论

这项问题的根因不是“`useEffect` 里请求写得太长”，而是服务端真相的归属层级错误。下一步应把模具组名和关联图纸读取都收口到 React Query，让弹窗组件只负责消费 query 结果与管理本地表单重置，而不是继续手动编排远端读取。

### 1. plan：`linear-barcode-mgmt.tsx` fail loudly 与 UI 状态显式化

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx` 虽然已经用 `useQuery` 读取 `protocolConfig`，但组件本身仍保留了“默认配置先渲染、远端配置后水合”的结构：

1. `rules` 初始值为 `[]`
2. `mockInputs` 初始值为 `createDefaultLinearBarcodeMockInputs()`
3. 通过 `useEffect` 在 `protocolConfig` 返回后再执行 `setRules / setMockInputs`

这会让 UI 在 query 未就绪时先展示一套本地默认配置，形成 masking。

#### 1.2 当前排查结论

当前实查结果如下：

1. 当前问题不只是“API 失败时是否 fallback”，还包括加载阶段先用本地默认 `mockInputs / rules` 渲染
2. 文件里虽然已有 `if (error) return ...` 错误态，但主体渲染对加载阶段并没有严格 fail loudly，而是继续消费本地默认 state
3. `handleResetRules` 使用 `createDefaultLinearBarcodeProtocolConfig()` 作为“显式用户重置”是合理的，但它不应再承担远端加载失败或未加载时的伪 authority
4. 当前需要收口的是“配置读取真相归属”，不是删除所有 default builder

#### 1.3 本轮目标

1. 让线性条码配置真相直接归属于 React Query
2. UI 明确区分 loading / error / ready 三态
3. 移除加载链中的 masking，不再让默认配置伪装成远端已可用配置

#### 1.4 推荐实施方向

1. 去掉 `rules` / `mockInputs` 作为“远端配置镜像”的默认 hydration state
2. 由 query 数据派生 ready 态下的展示输入，或将本地可编辑草稿与 query 初值明确分层
3. 在 query 未就绪时显示明确 loading UI，而不是直接渲染模拟区默认配置
4. 在 query 失败时继续显示显式错误态，不再保留任何伪可用 fallback

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. `src/features/basic-settings/services/linear-barcode-protocol-service.ts`
3. 必要时复核 `src/features/basic-settings/data/linear-barcode-protocol.ts`
4. 必要时复核相关 simulation / rules 组件的入参契约

#### 1.6 风险与注意点

1. 不要误删“用户主动重置协议”为默认配置的能力，需区分 reset 与 load fallback
2. 若引入 ready 态后才渲染编辑区，要确保保存、重置、模拟链仍能正常工作
3. 不把这次整改扩成整套 linear-barcode 模块重构

#### 1.7 非目标边界

本轮不做：

1. 不重做 numberingService 或 protocol 后端接口
2. 不顺手改 appearance mapping / products 查询链
3. 不扩散到 dm-numbering 模块
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. query 未就绪时不再以默认 `mockInputs / rules` 伪装 ready UI
2. query 失败时显示显式错误态，而不是 fallback 配置
3. query 成功后编辑、保存、重置流程仍可正常工作
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不在于“有没有 error 分支”，而在于加载阶段仍然让本地默认配置充当了远端 authority。下一步应把线性条码配置的 ready 条件严格绑定到 query 状态，由 UI 层显式展示 loading / error，而不是继续用默认配置做 masking。

### 1. plan：构建失败修复（`linear-barcode-mgmt.tsx` TS 收口 + `terminal-resource-service.ts` 引用漂移）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前部署截图显示前端构建被 TypeScript 直接阻断，至少涉及两组明确问题：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
   - 存在未使用导入 `cn`
   - 存在未使用变量 `refetchProtocolConfig`
   - 渲染处 `protocolConfig.sequenceRuleKey` 的可空类型尚未完全收口
2. `src/features/terminal-config/services/terminal-resource-service.ts`
   - 当前引用 `@/lib/api-fetch`
   - 但仓库内不存在 `src/lib/api-fetch`
   - 实际 `apiFetch` 导出位于 `src/lib/api-client.ts`

这说明当前问题不是部署环境偶发，而是仓库内已经存在可稳定复现的编译级断点。

#### 1.2 当前排查结论

##### 1.2.1 `linear-barcode-mgmt.tsx` 的问题性质

当前 `linear-barcode-mgmt.tsx` 已处于“React Query 承担远端 authority，本地 state 承担编辑草稿”的方向上；本次报错更像是上一轮整改后的残留 TS 收口问题，而不是新的业务逻辑错误：

1. 未使用符号应直接移除，不能为了消警再伪造调用
2. `protocolConfig` 的 ready 语义虽已在 loading 分支中体现，但渲染点上的类型仍未完全让 TS 信服
3. 本轮修复必须保持“query 真相归属”方向不回退

##### 1.2.2 `terminal-resource-service.ts` 的问题性质

当前 `terminal-resource-service.ts` 的模块解析失败不是类型推断问题，而是明确的导入路径漂移：

1. 仓库内无 `src/lib/api-fetch`
2. 全局搜索可见 `apiFetch` 的真实导出位于 `src/lib/api-client.ts`
3. 因此正确方向应是修正引用口径，而不是额外补一个 `api-fetch` 别名文件遮盖漂移

##### 1.2.3 route tree 提示的处理口径

截图中还出现 route tree 生成提示：

1. `capture-route-component.tsx` “does not contain any route piece”
2. 当前截图里真正导致退出码为 2 的仍是后续 TypeScript error 汇总
3. 因此本轮先将其视为需复核的旁路告警，不在未证实阻断性的前提下顺手改路由结构

#### 1.3 本轮目标

1. 消除当前截图中的确定性 TypeScript 构建阻断项
2. 保持 `linear-barcode-mgmt.tsx` 已建立的 React Query authority 方向不回退
3. 修正 `terminal-resource-service.ts` 的模块引用漂移，而不是增加兼容层掩盖根因

#### 1.4 推荐实施方向

1. 在 `linear-barcode-mgmt.tsx` 中移除未使用符号
2. 在不改变现有 ready / loading / reset 语义的前提下，显式收紧 `protocolConfig` 的可空类型边界
3. 将 `terminal-resource-service.ts` 的 `apiFetch` 导入修正为真实导出位置
4. 实施后执行定向 `tsc` 或等价构建校验，确认截图中的 4 个编译错误全部消失

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. `src/features/terminal-config/services/terminal-resource-service.ts`
3. 必要时复核 `src/lib/api-client.ts`
4. 必要时复核 route 生成提示对应文件，但仅限确认是否仍阻断构建

#### 1.6 风险与注意点

1. 不能为绕过 TS 报错而把 `linear-barcode-mgmt.tsx` 再改回默认配置 hydration 或 masking 结构
2. 不能通过新增 `src/lib/api-fetch` 转发文件来掩盖真实漂移，否则会继续扩散错误引用口径
3. 若 route tree 提示在修复 TS 后仍阻断构建，需要重新回到规划阶段补充影响范围

#### 1.7 非目标边界

本轮不做：

1. 不重构线性条码模块整体交互
2. 不顺手改 numbering / appearance / product 查询链
3. 不扩散到 terminal-config 其它 service 重写
4. 不处理与当前构建失败无关的历史 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. `linear-barcode-mgmt.tsx` 不再出现未使用符号与可空类型报错
2. `terminal-resource-service.ts` 不再出现 `@/lib/api-fetch` 模块解析失败
3. `pnpm exec tsc --noEmit` 或等价前端构建校验通过
4. 如 route tree 提示仍存在，确认其是否仅为告警并在 `walkthrough.md` 记录

#### 1.9 结论

这次部署失败的根因不是“服务器构建机偶发异常”，而是仓库内已经存在稳定的编译断点：一部分来自 `linear-barcode-mgmt.tsx` 的整改后 TS 收口未完成，另一部分来自 `terminal-resource-service.ts` 的导入路径漂移。下一步应先完成这两处根因修复，再复核 route tree 提示是否仍需单独处理。

### 1. plan：`useSalesOrderInit` 水合迁移到 query + 稳定 defaultValues 边界

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/trading/hooks/use-sales-order-init.ts` 通过 `useEffect` 执行销售订单初始化：

1. 编辑态：直接 `setFormData(initialOrder)`
2. 新建态：异步调用 `numberingService.previewContractBarcode(...)`
3. 然后再批量 `setFormData(...)`

同时 `useSalesOrderForm` 里还通过 `useDeltaTracker` 持有 `formData`，再暴露一个 `setFormData` shim 给 `useSalesOrderInit` 回填。

#### 1.2 当前排查结论

当前实查结果如下：

1. `useSalesOrderInit` 当前是典型的 effect hydration：远端/异步初值在渲染后再补写进表单状态
2. `useSalesOrderForm` 的初始化真相目前分散在：
   - `DEFAULT_ORDER`
   - `memoizedInitial`
   - `useDeltaTracker(...)`
   - `useSalesOrderInit(...)`
3. 新建态条码预览属于服务端/异步读取，更适合交给 query authority，而不是 effect 直接改表单 state
4. 当前风险不一定已经表现为 bug，但边界不稳定，后续容易引发 hydration/reset/脏状态判断问题

#### 1.3 本轮目标

1. 让销售订单初始化的异步读取归属于 query
2. 让表单默认值边界更稳定，减少 effect hydration
3. 保持现有保存、校验、行编辑逻辑语义不变

#### 1.4 推荐实施方向

1. 为新建态默认条码预览引入 `useQuery`
2. 根据 `initialOrder` / preview barcode / 默认分类 派生更稳定的初始表单值
3. 让 `useSalesOrderForm` 直接消费稳定初始值，尽量移除 `useSalesOrderInit` 的 effect 水合职责
4. 如确需保留局部 reset，也应仅在明确边界下执行，而不是承担主初始化 authority

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/trading/hooks/use-sales-order-init.ts`
2. `src/features/trading/hooks/use-sales-order-form.ts`
3. 如需拆分，新增 trading hooks 下的 sales-order init query 文件
4. 必要时复核 `src/features/basic-settings/services/numbering-service.ts`

#### 1.6 风险与注意点

1. 不要破坏 `useDeltaTracker` 当前的脏状态判断语义
2. 编辑态不能被新建态条码预览 query 误伤
3. 若改 defaultValues 边界，要确保 dialog reopen / initialOrder 切换时口径稳定
4. 不把这次整改扩成整套 sales order form 重构

#### 1.7 非目标边界

本轮不做：

1. 不重写销售订单保存链
2. 不顺手改 `useSalesOrderOps` 行编辑逻辑
3. 不扩散到 purchase order 初始化链
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. 新建态初始化不再依赖 `useEffect` 异步补写主表单 state
2. 编辑态仍能稳定回填既有订单数据
3. 条码预览、分类切换、保存前正式生成条码流程仍保持正确
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不是“`useSalesOrderInit` 代码短不短”，而是初始化 authority 被分散到了 effect、tracker 和默认对象之间。下一步应把异步初值收回 query，把表单主初值收口到更稳定的 defaultValues 边界，减少 hydration 风险。

### 1. plan：快捷扫描“个人拍照 / 个人录视频”入口改为更接近直开摄像头

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前右侧快捷扫描面板里的“个人拍照 / 个人录视频”入口，表面上属于“快捷采集”，但点击后用户仍会明显感知到先进入个人缓冲区采集页，而不是像原生相机一样直接拉起摄像头或录制能力。

#### 1.2 当前排查结论

当前实查结果如下：

1. `src/features/quick-actions/data/quick-action-registry.ts` 中两条入口当前都指向 `/personal-workbench/capture`，只通过 `search.mode=photo|video` 区分模式
2. `src/features/quick-actions/components/quick-action-drawer.tsx` 点击时只执行 `navigate(...)`，并没有在用户点击当次直接桥接采集动作
3. `src/features/personal-workbench/capture/index.tsx` 当前是“个人缓冲区快捷采集页”，页面内包含草稿队列、整理动作、清理动作与缓冲区说明文案，心智上属于中间工作台
4. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx` 当前拍照入口通过 `useEffect + setTimeout + input.click()` 尝试自动拉起文件选择；录视频入口则通过 effect 自动进入录制准备态，但不直接开始录制
5. 由于真正调用 `input.click()` 或 `getUserMedia()` 的时机发生在路由跳转后的页面 effect 中，移动端浏览器通常不会把这视为“同一次用户手势”，因此体验上不会是“点了就直接打开相机”

#### 1.3 本轮目标

1. 让“个人拍照 / 个人录视频”入口更接近用户预期的直开摄像头体验
2. 减少 capture 页作为缓冲区工作台的中间页感知
3. 保留个人缓冲区草稿链与后续整理能力，不破坏现有数据流

#### 1.4 推荐实施方向

1. 收敛 `/personal-workbench/capture` 页的职责，使其更偏“采集壳层”而不是“缓冲区工作台”
2. 优先把拍照/录像拉起动作绑定到页面首屏可执行的直接采集 UI，减少依赖异步 effect 的自动点击
3. 对拍照与录视频分别评估：
   - 拍照是否应优先使用更直接的相机 input / capture 方案
   - 录视频是否应在进入页后立即进入可录制相机态，并弱化缓冲区整理文案
4. 若浏览器安全策略无法保证“导航后自动拉起”，则应显式优化为更纯粹的采集页，并尽量减少“像进入缓冲区页面”的认知噪音

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/quick-actions/components/quick-action-drawer.tsx`
2. `src/features/quick-actions/data/quick-action-registry.ts`
3. `src/features/personal-workbench/capture/index.tsx`
4. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
5. 必要时复核 `src/routes/_authenticated/personal-workbench/capture-route-component.tsx`

#### 1.6 风险与注意点

1. 不要承诺超出 Web 平台能力边界的“绝对直接调起原生相机”，尤其是在 iOS / Android WebView / 非 PWA 场景
2. 不要为了追求直开而破坏当前个人缓冲区草稿保存链
3. 录视频能力受 `MediaRecorder`、HTTPS、浏览器权限策略影响，需要保留能力检测与降级
4. 不把这次整改扩成整套个人缓冲区重构

#### 1.7 非目标边界

本轮不做：

1. 不重写个人缓冲区后端协议
2. 不扩展多端同步、草稿中心或批量管理
3. 不承诺直接写入手机桌面文件系统
4. 不重做快捷扫描面板全部交互

#### 1.8 验证策略

若进入实现，至少验证：

1. 点击“个人拍照”后，移动端体验不再先显著落到缓冲区工作台心智页面
2. 点击“个人录视频”后，进入的是明确的录制采集态，而不是缓冲区整理态
3. 采集成功后仍能进入个人缓冲区草稿/记录整理链
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不是“快捷入口文案写错了”，而是入口点击与真正采集动作被路由跳转分隔开了，导致移动端用户手势丢失；同时 `capture` 页又承担了缓冲区工作台职责，进一步放大了“不是直拍”的感知。下一步应优先收敛 capture 页为采集壳层，并把直拍/直录体验尽量绑定在更接近用户点击的链路上。

#### 1.10 根据最新确认补充的产品边界

用户已进一步明确：

1. “个人拍照” = 独立新建入口
2. “个人录视频” = 独立新建入口
3. “个人缓冲区” = 单独查看 / 整理历史草稿入口

这意味着：

1. `个人拍照 / 个人录视频` 不应读取或消费历史 `queuedDrafts`
2. `capture` 页不应继续展示“待整理草稿、稍后处理、清理已整理”等缓冲区工作台语义
3. 底层允许继续使用临时本地草稿作为技术桥接，但这只能服务“本次新建采集 -> 打开编辑器”，不能把“个人缓冲区”产品心智混入新建入口

#### 1.11 最新实施收口方向

基于上述边界，本轮应继续收口为：

1. `src/components/layout/nav-group.tsx` 中，分类标题通过 `SidebarGroupLabel className='... text-inherit'` 继承了外层按钮的文字色
2. 外层按钮当前使用 `text-sidebar-foreground/85`、`hover:text-sidebar-accent-foreground`、`isExpanded && text-sidebar-accent-foreground` 等颜色，因此分类文字会和菜单级文字过于接近
3. `src/components/ui/sidebar.tsx` 的 `SidebarGroupLabel` 默认样式本身已经使用 `text-sidebar-foreground/50`，说明 sidebar 组件体系已经具备主题化层级色能力
4. 因此更合理的方向不是硬编码新颜色，而是基于 `sidebar-*` token 为分类容器和标题重新建立一层与菜单项可区分的视觉层级

#### 1.3 本轮目标

1. 让侧边栏分类一眼可被识别为“分类层”
2. 保持具体菜单项维持当前可读性与 active 语义
3. 确保亮色 / 暗色模式都自动对齐现有 sidebar 主题体系

#### 1.4 推荐实施方向

1. 调整 `src/components/layout/nav-group.tsx` 中分类按钮容器样式，使其拥有独立但克制的层级底色
2. 去掉分类标题的 `text-inherit`，改为使用 `text-sidebar-foreground/*` 或等价 sidebar token
3. 保留 hover / expanded 态，但避免分类标题色与菜单项文字色完全一致
4. 优先在现有 `sidebar-*` 主题变量体系内完成，不增加脱离主题系统的硬编码色值

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/components/layout/nav-group.tsx`
2. 若确有必要，再复核 `src/components/ui/sidebar.tsx`

#### 1.6 风险与注意点

1. 不要为了区分层级而破坏当前 active 可读性
2. 不要引入只适配亮色模式的硬编码颜色
3. 不要顺手重做整个 sidebar 视觉体系

#### 1.7 非目标边界

本轮不做：

1. 不修改路由或 active 逻辑
2. 不调整菜单项图标语义
3. 不改 sidebar 数据结构

#### 1.8 验证策略

若进入实现，至少验证：

1. 全部分组展开时，分类卡片与菜单项层级一眼可分
2. 暗色 / 亮色模式下分类卡片与文字仍与 sidebar 主题一致
3. `pnpm exec tsc --noEmit` 通过
4. 定向 eslint 通过

#### 1.9 结论

这项需求的关键不是“换一个更花的颜色”，而是给侧边栏分类建立稳定的主题化层级视觉。下一步应优先在 `nav-group.tsx` 中利用现有 `sidebar-*` token 收口分类容器与标题的层级色，让分类与菜单项在亮暗模式下都清晰分层。

### 1. plan：`/terminal-config/scanners` 扫码能力模组与物流配置边界分析

日期：2026-04-14  
状态：分析中

#### 1.1 当前背景

用户提出的问题不是单点 UI 文案，而是信息架构与模块边界问题：

1. `/terminal-config/scanners` 页面中的“扫码能力模组”当前显示“已接入”
2. 需要确认该“已接入”是否真实对应采购/销售里的物流链路
3. 若物流相关能力和设置已经散落在多个页面/模块，需评估是否应独立成“物流”分类，并以多 TAB 壳层统一承载

#### 1.2 当前排查重点

本轮重点不在于直接改页面，而在于先查清真实结构：

1. `scanner-devices.tsx` 中“扫码能力模组”实际挂载了哪些插件与 catalog 项
2. `logistics-inbound` 当前的宿主究竟是采购物流、销售物流，还是仅 catalog 层面的展示
3. 现有物流能力是否已经分散在：
   - `purchase-logistics`
   - `features/logistics`
   - `scan-platform`
   - `sandbox/logistics-api`
4. 当前“物流设置”究竟是业务操作页、终端扫码接入页，还是供应商/API 配置页混杂

#### 1.3 分析目标

1. 明确 `/terminal-config/scanners` 的扫码能力模组与真实业务宿主的映射关系
2. 明确采购物流与销售/交易物流当前是否共用一套能力模型
3. 判断“物流是否应独立为分类 + 多 TAB 模块”是否有充分结构依据

#### 1.4 预期输出

分析完成后应给出：

1. 当前真实结构图（终端资源 / 扫码能力 / 采购物流 / 交易物流 / 配置 sandbox）
2. 当前最大问题是“展示已接入但业务边界未统一”、还是“模块本身就不该放在 scanners”
3. 推荐方向：
   - 保持现状
   - 在 terminal-config 下新增物流分类
   - 或将物流独立成正式模块并以多 TAB 承载配置/扫码/供应商/API 接入

#### 1.5 非目标边界

本轮不做：

1. 不直接修改 `/terminal-config/scanners` UI
2. 不直接迁移现有物流路由
3. 不顺手合并采购物流与交易物流代码

#### 1.6 当前阶段结论（待分析完成后补充）

当前初步迹象表明：`/terminal-config/scanners` 的“扫码能力模组”已经不仅是设备资源展示，而是开始承载 `scan-platform` 插件目录；其中 `logistics-inbound` 很可能只绑定采购物流宿主，而非覆盖采购/销售统一物流。下一步需要继续核对 `purchase-logistics` 的实际接入深度，以及 `features/logistics` 与 `sandbox/logistics-api` 的配置职责，才能决定是否应收口为独立“物流”分类或多 TAB 模块。

### 1. plan：侧边栏独立“物流”分类（集合信息与扫描配置中心）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

基于本轮分析与用户最新确认，当前问题已经不是“`/terminal-config/scanners` 文案是否准确”，而是物流相关的配置型信息缺少一个稳定、清晰、可交接的统一入口。

用户明确要求：

1. 新增一个侧边栏独立分类承载“物流”
2. 该分类主要用于放“集合信息与配置”，而不是新的业务操作流
3. 重点承载：
   - 物流供应商/承运商信息
   - 国内/国际物流网站或平台入口
   - 联系人、电话、备注
   - 扫描配置/扫码模组接入说明
4. 保持现有 `/purchase/logistics` 与 `/trading/logistics` 业务页不动

#### 1.2 当前排查结论

当前实查结果可归纳为：

1. `/terminal-config/scanners` 当前混合了两类语义：
   - 扫码设备/终端资源
   - `scan-platform` 业务扫码能力目录
2. `scan-platform` 中的 `logistics-inbound` 当前只明确指向采购物流宿主（`/purchase/logistics`），并不能代表采购/销售物流统一接入完成
3. 物流配置型信息当前已分散在多个位置：
   - `purchase-logistics`：采购物流绑定与离线草稿
   - `features/logistics`：交易/销售物流管理
   - `scan-platform`：扫码插件与宿主说明
   - `sandbox/logistics-api`：物流 provider / endpoint / 模板配置
4. 继续把这类信息挂在 `terminal-config/scanners` 下，会使“终端资源”和“物流配置中心”边界持续混淆

#### 1.3 本轮目标

1. 为物流配置型信息建立一个独立、稳定、易交接的侧边栏分类
2. 让物流供应商资料、平台入口、联系人信息与扫描配置不再散落各处
3. 不影响现有采购物流、销售/交易物流的业务流程页面

#### 1.4 推荐信息架构

建议新增侧边栏独立分类：`物流`

该分类下建议先承载一个正式模块页，并采用多 TAB 壳层，初步建议如下：

1. `物流供应商`
   - 承运商/服务商名称
   - 国内/国际分类
   - 官网/平台入口
   - 联系人
   - 电话
   - 对接备注
2. `扫描配置`
   - 物流相关扫码模组目录
   - 当前宿主说明（采购物流宿主、后续销售物流宿主等）
   - 权限、接入状态、推荐终端
   - 是否已真实接线、是否仅骨架就位
3. `接口/平台`
   - API endpoint
   - 平台账号/凭证占位
   - 模板/供应商接入参数
   - 后续国际物流平台扩展位

#### 1.5 模块边界约束

本轮必须严格保持以下边界：

1. 不迁移或重构 `/purchase/logistics`
2. 不迁移或重构 `/trading/logistics`
3. 不把新模块做成“新的物流业务操作中心”
4. 新模块只承载：
   - 集合信息
   - 配置
   - 扫描接入说明
   - 平台/供应商资料

#### 1.6 预计涉及文件（若进入实现）

预计优先涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. 侧边栏/路由挂载相关文件
3. 新增 `src/features/logistics-config` 或等价目录承载独立模块
4. 新增该模块下的多 TAB 页面、数据契约与展示组件
5. 必要时复用/迁移 `sandbox/logistics-api` 的 provider 配置能力，但不改原有采购/销售物流业务页

#### 1.7 风险与注意点

1. 不要把“物流配置中心”误做成“物流业务页第二套入口”
2. 不要把采购物流与交易物流的业务状态、时间线、绑定动作硬塞入该模块
3. 若要复用 `sandbox/logistics-api`，需先明确它是实验页、过渡页还是正式配置源，避免双入口并存
4. 扫描配置 TAB 中必须清楚区分：
   - 已真实接入
   - 仅骨架就位
   - 尚未接线

#### 1.8 非目标边界

本轮不做：

1. 不修改现有采购物流提交流程
2. 不修改现有交易/销售物流提交流程
3. 不顺手统一采购物流与交易物流的数据模型
4. 不重构 `scan-platform` 全部插件体系

#### 1.9 验证策略

若进入实现，至少验证：

1. 侧边栏已出现独立的“物流”分类入口
2. 新模块的 TAB 能清晰区分“供应商资料 / 扫描配置 / 接口平台”三类信息
3. 现有 `/purchase/logistics` 与 `/trading/logistics` 路由和业务行为保持不变
4. `pnpm exec tsc --noEmit` 通过

#### 1.10 当前阶段结论

结合用户最新确认，当前最合理的方向不是继续把物流相关信息挂在 `terminal-config/scanners` 下，也不是去动现有采购/销售物流业务页，而是新增一个侧边栏独立“物流”分类，作为“集合信息与扫描配置中心”。该模块应采用多 TAB 结构统一承载物流供应商、网站/联系人/电话、接口平台与扫描配置说明，让后续接手者能在一个清晰的域入口中看全物流配置资产。

### 1. plan：物流模块新增“包装规则”TAB（先做包装规则主数据）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前物流相关诉求中，已经明确需要一套可复用的包装规则真相来源，用于描述：

1. 包装尺寸有多大
2. 包装净重/毛重是多少
3. 单个包装可装多少产品/物料
4. 哪些产品/规格适用该包装规则

当前这部分需求应先沉淀为“包装规则主数据中心”，而不是直接联动销售订单、出货单或物流费用估算。否则会在基础定义尚未稳定前，把预算、执行、费用三个层级混在一起。

#### 1.2 当前约束与排查结论

##### 1.2.1 单位口径

本轮已确认：

1. 包装规则模块不自建单位体系
2. 尺寸单位、重量单位、容量单位统一复用系统现有单位引擎
3. 包装规则记录只保存单位标识，显示名称与换算逻辑由单位引擎提供

##### 1.2.2 拼装口径

本轮已确认：

1. 包装规则模块不重复维护第二套拼装/BOM 关系
2. 包装组成与拼装关系统一调用物料管理中的拼装引擎
3. 包装规则模块只承担“规则编排层”，不复制底层物料拼装结构

##### 1.2.3 当前建议的模块职责

当前更合理的模块定位不是“物流预算”，而是“包装规则”主数据 TAB：

1. 负责维护包装尺寸、净重、毛重、容量、适用范围等规则
2. 负责维护一条规则可适用哪些产品/物料/规格
3. 为后续销售、出货、物流预算、装箱单等链路提供统一读取来源
4. 当前不承担订单聚合、出货执行、承运商管理与物流费用估算

#### 1.3 本轮目标

1. 在物流模块下新增“包装规则”TAB 的规划与实现方案
2. 建立包装规则主数据模型，统一承载包装尺寸、净重、毛重、单包装容量与适用物料配置
3. 明确后续链路统一通过“包装规则 + 单位引擎 + 物料拼装引擎”组合取数
4. 不在本轮引入销售订单、出货单、物流费用的业务联动

#### 1.4 推荐实施方向

1. 前端新增“包装规则”TAB，作为物流模块下的独立主数据页
2. 后端新增包装规则头与包装规则适用明细的数据模型/接口边界
3. 规则头维护：
   - 规则编码
   - 规则名称
   - 包装类型
   - 长/宽/高及对应单位标识
   - 净重/毛重及对应单位标识
   - 启用状态
   - 备注
4. 规则适用明细维护：
   - 产品/物料
   - 规格/型号
   - 单包装容量值
   - 容量单位标识
   - 默认规则标记
   - 排序
5. 体积不作为手工主录字段，统一由长宽高计算，避免与尺寸字段不一致
6. 页面能力先聚焦：
   - 规则列表
   - 新增/编辑规则
   - 启停规则
   - 复制规则
   - 在规则内动态增删适用产品/物料配置行

#### 1.5 预计涉及文件

预计优先涉及：

1. 物流模块对应的前端 tab 注册与页面文件
2. 新增 `src/features/...` 下包装规则相关 contracts / services / hooks / components
3. 现有单位引擎调用入口
4. 现有物料管理拼装引擎调用入口
5. `server/models` 下包装规则相关模型文件
6. `server/services` 下包装规则 service / dto / mapper
7. `server/handlers` 下包装规则 handler
8. `server/routes` 下包装规则 route

#### 1.6 风险与注意点

1. 一个产品/规格在同一时刻若允许多条默认启用规则，后续读取会产生歧义，因此需明确默认规则唯一性约束
2. 毛重与净重定义必须统一，否则后续包装预算、出货与物流估算会出现语义漂移
3. 不能使用自由文本单位或自由文本包装描述代替结构化字段，否则后续无法稳定聚合与换算
4. 不能在包装规则模块内部复制单位体系或拼装体系，否则会形成第二套 authority

#### 1.7 非目标边界

本轮不做：

1. 不联动销售订单
2. 不联动出货单
3. 不做物流费用估算
4. 不做实际装箱执行
5. 不顺手扩成承运商、柜型、运输策略等完整物流管理模块

#### 1.8 验证策略

若进入实现，至少验证：

1. 包装规则可以稳定维护尺寸、净重、毛重、容量与适用物料范围
2. 单位字段均来自系统现有单位引擎，而不是本地自由输入
3. 包装规则模块没有重复维护第二套拼装结构，而是通过既有物料拼装引擎获取能力
4. 一个产品/规格的默认启用规则口径明确、可校验
5. 文档、实现与 `walkthrough.md` 保持同步

#### 1.9 结论

当前最合理的推进方式，不是直接做物流预算或销售/出货联动，而是先把“包装规则”做成清晰的主数据中心：包装规则模块负责规则编排，单位统一复用现有单位引擎，拼装统一复用物料管理拼装引擎。待这层真相来源稳定后，再由后续链路按统一口径读取并扩展。

---

## 2. 包装纯计算模块（多箱规边缘计算）规划（中文）

### 2.1 目标

新增一个独立的前端纯计算模块，负责处理“同一产品存在多个包装规格”时的装箱方案推导问题。典型场景包括：

1. 一个产品同时存在 `5` 个装、`10` 个装等多个包装定义
2. 订单数量不是单一箱规的整倍数，例如 `505`
3. 订单页、出货页、打印预览都需要读取同一套装箱推导结果

该模块本轮只负责“计算真相”，不直接耦合销售订单 UI、不直接持久化计算结果。

### 2.2 实施原则

1. 必须是纯函数模块，不依赖 React hooks、组件状态、请求副作用或浏览器环境
2. 必须接收结构化输入，而不是在函数内部自行拉取包装规则或产品信息
3. 必须可被多个消费方复用，包括包装规则页预览、销售订单卡片、出货页、打印预览
4. 必须先定义默认策略，再预留未来扩展策略位，避免把算法写死在页面事件里

### 2.3 建议落点

建议新增独立文件，优先放在物流包装规则同域下，例如：

1. `src/features/logistics-config/packaging-calculator.ts`

后续若包装成为独立域模块，再考虑迁移到更通用的位置；本轮先以“低迁移成本 + 高复用纯函数”优先。

### 2.4 输入与输出建议

#### 输入

建议至少包含：

1. `orderedQuantity`：订单数量
2. `productWeight`：产品单重
3. `profiles`：当前产品可选包装规则列表
4. 每条规则至少含：
   - `profileId`
   - `profileName`
   - `capacity`
   - `netWeight`
   - `length`
   - `width`
   - `height`
   - `dimensionUnitCode`
   - `weightUnitCode`

#### 输出

建议输出统一结果对象，包括：

1. `strategy`：本次使用的策略标识
2. `lines`：每种箱规被分配的箱数、承载件数、尾箱信息
3. `packedQuantity`：已装箱数量
4. `remainderQuantity`：剩余未装数量
5. `boxCount`：总箱数
6. `totalVolume`：总体积
7. `totalGrossWeight`：总毛重
8. `isExactMatch`：是否恰好无余数
9. `warnings`：如无规则、容量非法、单位不一致等告警

### 2.5 默认算法建议

本轮建议先采用“优先减少总箱数”的默认策略：

1. 按容量从大到小排序候选包装规则
2. 优先使用大箱规进行整除拆分
3. 若无法完全整除，再继续向下尝试更小箱规
4. 若仍有余数，则输出剩余未装数量，或按后续业务规则标记为尾箱/待人工处理

以 `505` 件、存在 `10` 个装和 `5` 个装为例：

1. 先使用 `10` 个装：得到 `50` 箱，余 `5`
2. 再使用 `5` 个装：得到 `1` 箱，余 `0`
3. 输出 `51` 箱、无未装余数

### 2.6 风险与边界

1. 若多个包装规则单位不一致，体积与重量汇总会失真，因此计算前需校验单位口径
2. 若存在容量为 `0` 或非法负数的规则，必须显式过滤并输出告警，不能静默参与计算
3. 若未来出现多个策略（最少箱数、最低包装重、最低体积、指定优先级），必须避免直接破坏当前函数签名
4. 本轮不做组合爆搜优化器；若后续箱规很多，再评估更复杂的最优解算法

### 2.7 非目标

本轮不做：

1. 不把结果直接写回订单数据库
2. 不在销售订单页直接接入 UI
3. 不做出货执行落库快照
4. 不做后端同步算法实现
5. 不做人工装箱拖拽或手动覆写交互

### 2.8 验证策略

若进入实现，至少验证：

1. 单一箱规可正确计算整箱数、余数、毛重、体积
2. 多箱规组合场景下可正确输出如 `505 = 50 * 10 + 1 * 5`
3. 无匹配规则、容量非法、数量为 `0` 等异常输入可稳定返回显式结果而非崩溃
  4. 纯函数模块不依赖 React/请求副作用，可单独被测试与复用
  5. 执行定向 TypeScript 校验，并在实现后同步更新 `walkthrough.md`

  ### 2.9 结论

  在真正联动销售订单或出货页面之前，先抽离“包装纯计算模块”是合理的。这样可以先稳定“多箱规边缘计算”的算法真相，再让订单卡片、出货页和打印预览统一消费，避免每个页面各写一套 `505` 件如何拆成 `10` 个装 + `5` 个装的重复逻辑。

---

## 3. 订单侧独立包装预览卡片能力规划（中文）

### 3.1 目标

订单侧后续不只会展示包装预览，还可能持续挂接更多协同动作，例如缺料提醒、指定账号通知、外部触达能力。因此本轮不应把包装展示逻辑直接揉进销售订单明细表格，而应把它抽象成一个可独立挂载的卡片能力。

该能力的核心目标是：

1. 让订单详情页、订单列表卡片、后续出货页都可以复用同一套包装预览消费层
2. 让包装计算、数据适配、展示外壳三层分离，避免未来继续把订单侧能力堆进单一组件
3. 为后续动作型扩展保留统一承载位，而不是每新增一个动作就侵入改造订单主表格

### 3.2 建议分层

建议拆成以下三层：

1. `calculator` 层：继续复用现有纯函数 `packaging-calculator.ts`，只负责装箱真相计算
2. `adapter / hook` 层：把订单行、产品重量、包装规则映射成卡片可消费的轻量视图模型
3. `card / panel` 层：只负责展示与动作插槽，不持有包装计算细节

这样订单详情页或订单列表只负责传入订单上下文并挂载卡片，而不直接参与包装规则过滤、箱规拆分或重量体积计算。

### 3.3 建议落点

为保持后续可扩展与可解耦，建议采用独立文件组织：

1. `src/features/trading/hooks/use-sales-order-packaging-preview.ts`
2. `src/features/trading/components/parts/sales-order-packaging-preview-card.tsx`
3. 如需进一步解耦，可追加 `src/features/trading/adapters/sales-order-packaging-preview-adapter.ts`

其中：

1. `hook` 负责 React Query 聚合包装规则与产品基础数据，并调用纯计算模块
2. `adapter` 负责把原始计算结果整理成适合订单卡片显示的字段
3. `card` 负责 UI 呈现，并预留未来动作区插槽

### 3.4 数据边界

订单侧独立卡片建议只依赖以下输入：

1. 订单或订单行基础数据：`productId`、`productModel`、`qty`、`uom`
2. 产品基础数据：至少包含产品单重
3. 包装规则主数据：当前产品所绑定的候选包装定义

卡片层不应直接请求微信发送、消息推送或缺料判断结果。本轮只处理包装预览真相与展示适配；后续动作能力应作为并列扩展位接入。

### 3.5 展示模型建议

建议卡片层统一消费如下信息：

1. 每个订单行的推荐箱规组合
2. 预估总箱数
3. 余数 / 尾箱信息
4. 预估总体积
5. 预估总毛重
6. 告警信息，例如无包装规则、单位不一致、无法整除

同时可再汇总一层订单级摘要，用于订单卡片或详情页概览展示。

### 3.6 后续动作扩展位

为满足后续扩展，建议卡片组件预留独立动作区域，但本轮只做结构预留，不接入真实业务动作：

1. 缺物料时发送给指定账号
2. 拉起微信或其他外部触达动作
3. 生成待办、通知、提醒或协同任务

这些动作未来应作为“订单侧独立卡片能力”的并列扩展，不应反向侵入包装计算模块。

### 3.7 风险与约束

1. 若直接把包装 UI 塞回订单表格，未来新增动作会导致表格持续膨胀，维护成本高
2. 若 `hook` 同时承担展示和动作编排，会再次形成新的耦合中心，因此应控制其职责边界
3. 若订单列表与订单详情直接复制两套卡片逻辑，后续扩展会出现行为漂移，因此必须共用同一消费层

### 3.8 本轮非目标

本轮不做：

1. 不接入真实微信发送
2. 不实现账号通知派发链路
3. 不做缺料判断引擎
4. 不改订单数据库持久化结构

### 3.9 结论

订单侧包装能力应被设计成“可独立挂载的卡片能力”，包装预览只是第一种消费者。这样后续无论接缺料提醒、账号通知还是微信触达，都可以沿着同一扩展槽位演进，而不必持续侵入销售订单列表或详情主表格。

---

## 4. 订单列表卡片挂载独立包装预览能力规划（中文）

### 4.1 目标

在已完成订单详情页首挂载的基础上，将独立包装预览能力继续挂到订单列表卡片中，但保持“列表只看摘要、详情看展开”的职责分层。

### 4.2 实施原则

1. 列表卡片必须复用现有订单侧包装预览 `hook / adapter`
2. 列表场景不复制详情页完整卡片结构，只展示高价值摘要
3. 不把包装计算逻辑回塞进订单列表主卡片内部

### 4.3 建议展示收口

订单列表卡片建议优先展示：

1. 预估总箱数
2. 预估总体积
3. 预估总毛重
4. 告警数 / 未匹配行数

如需完整箱规组合与逐行拆分明细，仍由订单详情页承载。

### 4.4 风险与约束

1. 若列表页直接复刻详情页卡片，会导致卡片过高、信息噪音过大
2. 若为列表页单独再写一套包装聚合逻辑，会造成后续详情/列表结果漂移
3. 列表卡片只应挂载摘要消费者，不应成为新的逻辑拼装中心

### 4.5 结论

订单列表卡片接入包装预览时，应只挂载独立能力的轻量摘要视图；包装真相与详细展示仍统一收口到现有消费层与详情页卡片，避免再次产生双轨实现。

---

## 5. 产品型号模板字段丢失链路排查规划（中文）

### 5.1 目标

针对当前产品编辑弹窗中出现的模板绑定异常与“至少 3 个字段缺失”问题，沿着后端到前端的完整链路排查根因，明确到底是字段本身没有被读取、接口没有返回、前端 adapter 没映射，还是此前重构把字段在初始化链路中覆盖掉了。

### 5.2 排查范围

本轮重点核对以下几层：

1. 后端产品模型与查询预加载是否包含模板绑定相关字段
2. 产品详情接口 DTO 是否把模板字段完整输出
3. 前端 `product-api-adapter` 是否把模板字段完整映射进 `Product`
4. 产品编辑弹窗 / init hook / form hook 是否在 reset 或派生阶段把字段丢失
5. 模板解析 fallback 逻辑是否只是暴露了上游字段缺失，而不是问题本体

### 5.3 关注字段

本轮至少核对以下模板相关字段在各层是否完整存在：

1. `templateId`
2. `templateKey`
3. `resolvedTemplateId`
4. `resolvedTemplateKey`
5. `templateResolutionSource`
6. `templateResolutionError`

如排查中发现“胎型”等业务字段实际是通过模板解析链派生出来，也需把其上游字段口径一并梳理清楚。

### 5.4 实施原则

1. 优先确认 authoritative source 在哪一层丢失，不做 UI 层猜测性回填
2. 若后端接口已返回而前端丢失，则修前端适配/初始化链
3. 若后端接口本身未返回，则优先修后端 DTO/查询链，而不是在前端拼装伪状态
4. 最终结论必须能指出“字段首次丢失的位置”

### 5.5 产出要求

排查完成后，至少输出：

1. 受影响字段清单
2. 每个字段在“模型 / DTO / adapter / form init / dialog”各层的存在情况
3. 首次丢失位置
4. 建议修复点与最小修复面

### 5.6 结论

这类模板绑定问题不能只看弹窗 warning。本轮应先把产品模板字段从后端到前端的完整链路跑通，确认字段首次丢失点，再决定修复落在查询、DTO、adapter 还是表单初始化阶段。

## 6. 产品属性脏数据治理与模板接线方案

### 6.1 背景

当前“产品属性配置”页维护的是全局属性分类与属性项字典，本身不带模板绑定语义；而产品编辑弹窗中的模板规格区又依赖 `product type -> template` 解析链。与此同时，属性项表中已出现同一分类下仅大小写不同、但归一后等价的历史重复机器值，导致下拉候选项重复、中文显示一致，放大了用户对“模板字段/型号字段整体丢失”的感知。

基于当前排查结果，本轮修复优先级调整为：先做属性脏数据治理（P2），在属性字典恢复单一机器值口径后，再设计模板与产品属性之间的接线方案。

### 6.2 第一阶段目标：产品属性脏数据治理

1. 盘点 `product_attribute_options` 中所有归一后冲突的数据组，至少覆盖：
   - 同一 `categoryKey` 下 `Hooked / hooked`、`Tubular / tubular`、`Lightweight / lightweight` 这一类仅大小写不同的重复项
   - 归一化后值相同、但中文/英文标签存在轻微差异的候选项
2. 明确每组冲突项的治理策略：
   - 保留哪一条作为 canonical option
   - 哪些旧值需要迁移引用或软删除/删除
   - 是否需要补齐统一的英文标签命名
3. 防止复发：
   - 继续沿用前后端已有的机器值归一化逻辑
   - 评估是否需要增加数据库级唯一性保护或治理脚本，避免历史脏数据再次写入
4. 验证结果：
   - 属性配置页不再出现仅大小写不同的重复项
   - 产品表单属性下拉不再展示重复选项

### 6.3 第二阶段目标：模板与产品属性接线方案

在脏数据治理完成后，再收口模板与属性的职责边界，避免带着脏数据直接做新绑定，导致错误被固化。

接线方案需优先回答以下问题：

1. 目标关系应落在哪一层：
   - 方案 A：模板直接绑定属性分类/属性项
   - 方案 B：保留现有“模板 -> 产品类型 -> 属性绑定”链，只增强类型绑定生成/继承机制
2. “模板规格组件”与“产品属性字典/类型属性绑定”的职责如何划分：
   - 模板规格组件负责结构化规格 UI 与模板专属字段
   - 属性字典负责标准下拉候选项
   - 类型属性绑定负责某个产品类型启用哪些标准属性分类
3. 是否需要模板层生成或校验产品类型属性绑定：
   - 若模板是 authoritative source，则需说明绑定同步时机与覆盖策略
   - 若产品类型仍是 authoritative source，则模板只负责规格渲染，不直接改写属性字典

### 6.4 推荐方向

推荐优先考虑方案 B：

1. 不把“产品属性配置页”直接改造成模板页，继续保持其作为全局字典维护入口
2. 不让模板直接持有属性项数据，避免模板层与属性字典层形成双向重复维护
3. 若模板确实需要约束某类产品应暴露哪些属性分类，应让模板影响“产品类型属性绑定”的生成或校验，而不是绕开产品类型直接接属性项表
4. 模板解析失败时，应显式暴露“模板链问题”；属性字典重复时，应显式暴露“数据治理问题”，避免两个问题在 UI 层混成一个现象

### 6.4.1 接线设计结论

本轮修订后的关系定义为：

1. `产品属性配置页`：维护全局属性分类与选项，定位为“标准属性素材库”
2. `产品模板页`：负责模板结构装配，可从全局属性素材库中选择性接入属性分类，并提供模板实时预览
3. `产品类型页`：选择模板，并将模板装配结构落地为“最终生效绑定”，允许少量人工覆写
4. `产品编辑页`：只消费所属产品类型的最终生效结构，并填写 `attributeValues`

换言之，模板不应再是黑盒。模板页本身必须成为“结构编辑器 + 属性装配器 + 预览器”；而运行时动态属性区的直接 authority 仍然是产品类型最终生效绑定。

### 6.4.2 推荐的数据模型扩展

建议新增一层“模板属性装配结构”，而不是只存一个抽象建议数组：

1. 可选实现 A：
   - 新增 `product_template_attribute_bindings`
   - 字段建议至少包括：`template_id`、`category_key`、`sort_order`、`required`、`active`
   - 预留扩展字段：`section_key` / `group_key`、`display_mode`
2. 可选实现 B：
   - 在模板表或模板扩展字段中保存 `assembledAttributeCategoryKeys`
   - 更轻量，但后续若要支持预览分区、必填、排序、展示模式，会较快失去结构化能力

推荐优先使用实现 A，因为它既能支撑模板页实时预览，也与现有 `product_type_attribute_bindings` 结构同构，后续便于做“模板装配结构 -> 类型最终生效绑定”的 diff、同步、审计与提示。

### 6.4.3 Authority 与覆盖规则

建议采用如下 authority 规则：

1. `属性字典` 是“素材库真相源”，负责维护标准分类与 option
2. `模板属性装配结构` 是“模板结构真相源”，负责定义模板在预览中长什么样，以及接入哪些属性分类
3. `产品类型属性绑定` 是“运行时真相源”，负责决定产品编辑页到底显示哪些动态属性

覆盖规则建议如下：

1. 模板装配变更后，不自动静默覆盖所有使用该模板的产品类型绑定
2. 产品类型页应提供显式动作，例如“按模板重建绑定”或“从模板补齐缺失项”
3. 若产品类型绑定与模板装配结构不一致，UI 只提示“已偏离模板定义”，但不阻止保存
4. 若产品类型尚未做任何人工调整，可允许一次性全量采用模板装配结构

### 6.4.4 读取链设计

读取链保持以下边界：

1. 模板读取链：
   - `模板自身字段 + 模板属性装配结构 + 全局属性素材库`
   - 用于模板页左侧配置区与右侧预览区实时渲染
2. 动态属性读取链：
   - `产品 -> 产品类型 -> 产品类型属性绑定 -> 属性分类/属性选项`
   - 用于产品编辑弹窗动态属性区渲染
3. 一致性提示链：
   - `产品类型 -> 模板属性装配结构`
   - 与 `产品类型属性绑定` 做 diff
   - 生成“缺少哪些模板装配项 / 多了哪些人工扩展项”的只读提示

这样可以避免“模板不可预览”与“运行时绑定缺失”再次被混成同一个问题。

### 6.4.5 写入链设计

写入链建议拆开处理：

1. 模板页：
   - 保存模板自身字段
   - 保存模板属性装配结构
   - 不直接写 `product_type_attribute_bindings`
2. 产品类型页：
   - 保存 `templateId`
   - 保存产品类型最终属性绑定
   - 可触发“从模板装配结构同步”动作，将模板结构复制为当前类型绑定草稿
3. 产品编辑页：
   - 仅保存 `attributeValues`
   - 不直接修改模板或产品类型绑定

### 6.4.6 UI / 交互建议

1. 模板管理页：
   - 增加“属性装配区”与“实时预览区”
   - 选择对象是 `ProductAttributeCategory`
   - 不直接选择具体 option 值，而是装配分类级结构
   - 允许调整排序、必填、分区（分区可先留接口后实现）
2. 产品类型管理页：
   - 显示当前模板解析结果
   - 显示“模板装配结构”与“当前类型属性绑定”的差异
   - 提供“按模板覆盖同步”与“仅补齐缺失项”两种显式动作（二选一即可先做其一）
3. 产品编辑弹窗：
   - 若模板存在但产品类型绑定为空，可提示“当前类型尚未同步模板结构”
   - 若绑定已偏离模板定义，可显示只读 badge 或提示文案，不阻断编辑

### 6.5 风险与约束

### 6.5 风险与约束

1. 若直接删除重复属性项，必须先确认是否已有产品 `attributeValues.optionValue` 引用了旧值；否则会造成历史产品数据悬挂
2. 若引入模板到属性的自动同步，必须避免覆盖人工维护的类型属性绑定，防止大面积破坏既有配置
3. 若后续需要数据修复脚本，应优先以可回放、可审计方式执行，避免在应用层做一次性不可追踪清洗
4. 若模板装配结构与产品类型最终绑定都能编辑，必须在 UI 上明确区分“模板定义”和“最终生效值”，避免再次形成双真相误解
5. 若后续需要支持模板继承链，需额外定义模板建议属性的继承/覆盖规则；本阶段先不引入模板层级继承扩散

### 6.6 实施顺序

1. 先输出属性脏数据盘点与 canonical 规则
2. 经确认后实施属性数据治理与防复发约束
3. 完成回归验证后，再输出模板与产品属性接线设计
4. 经二次确认后，先落模板属性装配结构的数据模型、DTO 与 adapter
5. 再落模板管理页的“装配区 + 预览区”能力
6. 再落产品类型页的“继承模板 / 偏离提示”能力
7. 最后落产品编辑弹窗的只读提示与定向 TypeScript 校验

### 6.7 结论

当前更合适的处理顺序不是立刻把模板和属性强行接起来，而是先消除属性字典中的历史重复值，让产品属性候选项恢复单一真相来源；随后再基于干净数据设计模板与产品属性的关系，优先通过“模板 -> 产品类型 -> 属性绑定”链路收口，而不是把模板页、属性页和类型绑定页揉成一个新的混合真相来源。
