### 11. 追加边界调整：分类名可配置，不再直接以技术字段名作为最终分类名

根据本轮追加反馈，原“固定四类槽位”方案仍不满足最终目标，需要升级为更贴近业务表达的两层模型：

1. **分类定义层**
   - 由用户自行建立分类
   - 每个分类应具备：
     - 技术键 / 内部编码
     - 中文名
     - 英文名
     - 排序
     - 启用状态

2. **分类项定义层**
   - 每个分类下维护自己的可选值
   - 每个分类项应具备：
     - 值 / 内部编码
     - 中文名
     - 英文名
     - 排序
     - 启用状态

3. **前端展示原则**
   - 用户面优先展示配置后的中文/英文名称
   - 不直接把 `techSeries / tireType / brakeType / versionLevel` 这类技术键裸露为最终分类名
   - 中英展示需对齐系统翻译与当前语言环境

4. **对上一版方案的影响**
   - 当前已实现版本更接近“固定槽位 + 动态值”
   - 下一步若按你的最新要求推进，需要把现有 `category` 从固定枚举升级为用户可维护实体
   - 这会涉及：
     - 后端模型拆分或升级
     - 前端 TAB 结构调整
     - 产品表单对分类定义的动态读取与渲染策略

5. **本次调整的意义**
   - 固定的应当只是内部技术承载能力，而不是最终业务分类名
   - 业务分类名必须允许你按实际产品工程语义自行建立和演进

### 12. 产品实例值动态承载方案

#### 12.1 目标模型

1. **产品属性分类表**
   - 字段建议：
     - `id`
     - `key` / 内部编码
     - `nameZh`
     - `nameEn`
     - `description`
     - `sortOrder`
     - `active`

2. **产品属性分类项表**
   - 字段建议：
     - `id`
     - `categoryId`
     - `value` / 内部值
     - `labelZh`
     - `labelEn`
     - `description`
     - `sortOrder`
     - `active`

3. **产品实例值表**
   - 字段建议：
     - `id`
     - `productId`
     - `categoryKey`
     - `optionValue`
     - `sortOrder`
     - `createdAt / updatedAt / version`

#### 12.2 前端页面结构调整

1. `产品属性配置` TAB 不再直接把 `techSeries / tireType / brakeType / versionLevel` 当成最终分类展示。
2. 页面改为两层：
   - 左侧 / 上方：分类定义管理
   - 右侧 / 下方：当前分类下的分类项管理
3. 所有用户面显示遵循：
   - 中文环境优先 `nameZh / labelZh`
   - 英文环境优先 `nameEn / labelEn`
   - 不直接裸露内部编码

#### 12.3 产品表单改造范围

1. 产品表单不再以内置固定属性字段作为主要渲染入口。
2. 选择 `ProductType` 后，前端应查询该类型绑定的属性分类集合，并按绑定顺序动态渲染属性区。
3. 每个动态属性字段的展示名称来自 `ProductAttributeCategory.nameZh / nameEn`，可选值来自对应 `ProductAttributeOption`。
4. 产品保存与回显统一通过 `attributeValues[]` 完成，而不是通过 `tireType / brakeType / techSeries / versionLevel` 等固定字段。
5. 如果某些 `spec` 组件仍临时引用旧字段，需要在本轮明确列为迁移对象，并逐步替换为动态属性读取方式，而不是继续扩大固定字段依赖。

#### 12.4 旧实现迁移策略

1. 现有 `product_attribute_options.category` 固定枚举实现应视为过渡版。
2. 迁移方式建议：
   - 新增分类表
   - 将现有四类固定枚举映射为四条初始分类记录
   - 原 `product_attribute_options.category` 逐步迁移为 `categoryId`
3. 迁移目标：
   - 前台不再直接依赖固定枚举字符串
   - 默认数据仍可保留，但归属到“分类 + 分类项”两层结构中

#### 12.5 风险与注意事项

1. **迁移风险**
   - 需要兼容当前已落库的默认数据与当前表单读取链，并设计旧固定属性值向 `attributeValues` 的迁移脚本或补录逻辑。
2. **表单渲染边界**
   - 本轮目标就是让产品表单根据 `ProductType` 绑定结果动态长出属性字段，不再限定为四类既有消费位。
   - 若个别旧 `spec` 组件与动态字段结构耦合较深，需要识别为高风险触点并优先改造。
3. **展示一致性风险**
   - 需要统一中英文显示字段，避免再次出现技术键裸露。

#### 12.6 本轮方向完成标准

1. `产品属性配置` 页面不再直接以技术字段名作为最终分类名展示。
2. 分类名可由你自行建立并维护中英文名称。
3. 分类项归属于具体分类，不再依赖固定枚举 `category`。
4. 产品表单已按 `ProductType` 绑定结果动态渲染属性字段，而不是仅支持既有四类消费位。
5. 产品实例属性值已通过 `attributeValues` 动态保存与回显，不再依赖固定属性字段作为主链事实。
6. 验证通过后，再更新 `walkthrough.md`。

### 13. 产品属性配置页样式对齐实施计划（已批准）

日期：2026-04-10  
状态：已批准，进入执行

#### 13.1 目标

本轮目标不是继续修改产品属性配置页的数据结构，而是将 `src/features/engineering/tabs/product-attributes-mgmt.tsx` 的视觉表达对齐到工程模块现有系统风格，避免新页面成为独立设计语言。

#### 13.2 已确认的样式偏差

1. 页面头部当前使用 `PageHeader`，与工程模块多数 TAB 常见的标题信息块视觉不一致。
2. 分类统计卡使用了较强的自定义表现，如较重的 `italic`、`text-slate-*`、不一致的底色与选中态表达。
3. 分类定义区与分类项定义区当前采用裸 `div + border` 容器，未对齐系统常用的卡片容器层级。
4. 表头、按钮、间距与强调色使用方式，未完全贴合工程页既有基线。

#### 13.3 执行边界

1. 仅调整页面视觉结构与样式类名。
2. 不修改：
   - 分类定义与分类项定义的数据模型
   - 前后端接口
   - 字段命名与读写逻辑
   - 页面交互语义与操作流程
3. 不扩展新功能，不新增额外业务校验。

#### 13.4 实施方案

1. 将页面头部切换为工程模块统一的标题信息块样式。
2. 将分类统计卡改为与现有工程页一致的圆角、边框、底色、字号和强调色体系。
3. 将分类定义与分类项定义两个区域改为统一卡片容器结构，并对齐表头文本样式。
4. 对齐主按钮、操作按钮、空状态与内容间距，减少页面的独立视觉语言。

#### 13.5 风险与控制

1. 本轮风险主要是样式回归过程中误伤现有交互结构。
2. 控制方式：仅修改 `className`、容器层级与少量 UI 组件引入，不触碰业务方法与状态流。

#### 13.6 完成标准

1. `产品属性配置` 页在头部、统计区、列表区、按钮区与工程模块现有页面风格一致。
2. 页面功能、字段和接口行为保持不变。
3. 前端类型检查通过。

### 14. 产品属性动态化后的兼容壳层清理计划

日期：2026-04-10  
状态：待批准

#### 14.1 背景

当前产品属性主链已经切换到：

`ProductType -> ProductTypeAttributeBinding -> Product.attributeValues[]`

但代码中仍残留少量历史兼容层，包括：

1. `schema.ts` 中的固定属性字段定义
2. `getProductAttributeSummary()` 中对历史分类 key 的集中映射
3. `rim-spec` / SKU 派生等场景对 `versionLevel` 这一分类 key 的直接消费

这些残留如果没有实际业务价值，就会继续制造“固定字段仍是正式模型”的错觉，需要专项清理。

#### 14.2 本轮目标

1. 识别并删除已经失去业务价值的兼容字段与锚点。
2. 避免后续开发者误把历史字段当成当前主链事实来源。
3. 保留仍然有明确职责的动态分类内部编码消费位，但收敛命名和语义，避免表现为固定属性字段。

#### 14.3 执行边界

1. 本轮只处理“兼容壳层是否还应存在”的问题。
2. 不重做当前动态属性整体架构。
3. 不改变已通过验证的后端动态存储模型。
4. 若发现某处仍真实依赖某个分类 key（例如版本矩阵 / SKU 派生），则优先重命名或收敛语义，而不是盲删。

#### 14.4 计划步骤

1. 扫描并分类剩余引用：
   - 固定字段定义
   - 分类 key 常量/字符串
   - UI 展示摘要映射
2. 判断每类残留属于：
   - 必须保留的动态分类内部编码
   - 可迁移重命名的过渡语义
   - 可直接删除的无效兼容层
3. 对可删除部分执行清理。
4. 对必须保留部分收敛表达，避免再以“固定产品字段”方式继续暴露。
5. 执行验证：
   - `pnpm exec tsc --noEmit`
   - `go test ./...`

#### 14.5 风险与注意事项

1. **误删风险**
   - 某些分类 key 虽然看似历史残留，但实际上仍承担版本矩阵、SKU 派生或展示摘要的动态分类锚点职责。
2. **语义漂移风险**
   - 若只删除字段、不处理剩余 key 的命名表达，仍可能让后续开发者误解当前设计。
3. **清理顺序风险**
   - 应先判定“字段”与“分类 key”是否同义，再决定删除或重命名，避免把动态分类内部编码一起误删。

#### 14.6 完成标准

1. 无业务价值的兼容字段与锚点已被清理。
2. 仍需保留的分类 key 已明确收敛为动态分类内部编码语义。
3. 产品动态属性主链不再通过固定字段壳层制造歧义。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 15. 产品弹窗模板解析失败显式报错修复计划

日期：2026-04-10  
状态：待批准

#### 15.1 背景

当前产品弹窗已经收敛到以下模板主链：

`Product.typeId -> ProductType.templateId -> ProductTemplate.componentKey`

并且 `templateKey` 已改为派生字段，不再持久化。

但在 `src/features/engineering/components/product-action-dialog.tsx` 中，模板解析仍通过异步 effect 调用 `getEffectiveTemplate()`。若模板接口不可用、返回异常或解析失败，当前 UI 仍可能退化为“模板待定”，形成静默掩盖。

#### 15.2 本轮目标

1. 模板解析失败时必须显式报错，而不是仅退化为空模板 UI。
2. 错误信息要能明确指出故障位置和失败原因，避免用户无感失败。
3. 在模板解析失败期间禁止提交产品表单，防止带着不完整模板上下文继续保存。

#### 15.3 执行边界

1. 本轮只修复模板解析失败的错误暴露与提交流程阻断。
2. 不重做模板主链模型，不回退到名称猜模板逻辑。
3. 不改变已有 `ProductType.templateId` 作为模板绑定事实来源的设计。
4. 不借由空白 UI 或静默 fallback 掩盖接口、数据或版本漂移问题。

#### 15.4 实施方案

1. 在 `product-action-dialog.tsx` 中新增模板解析专属错误状态。
2. 将 `getEffectiveTemplate()` 包裹进显式 `try/catch`：
   - 捕获请求失败
   - 捕获模板缺失或绑定失效场景
   - 记录英文日志
3. 在弹窗中展示醒目的模板错误提示块：
   - 明确提示模板链路出错
   - 指出是模板接口、绑定数据还是模板缺失导致的问题
4. 将提交按钮禁用条件扩展到模板解析失败状态，避免继续保存。

#### 15.5 风险与注意事项

1. **过度阻断风险**
   - 若未区分“未绑定模板”和“模板解析失败”，可能把本来允许无模板的类型也误拦截。
   - 因此需要明确判定：只有真正异常时阻断；若该类型本身无模板绑定且这是业务允许状态，则只按正常无模板路径展示。
2. **错误信息不清风险**
   - 若只展示通用失败文案，用户仍无法判断到底是接口没起、数据版本不一致，还是绑定了不存在的模板。
3. **状态竞争风险**
   - `watchedTypeId` 快速切换时，需要避免旧请求回写覆盖新状态。

#### 15.6 完成标准

1. 模板解析失败时，产品弹窗会显式展示错误，而不是静默退化。
2. 用户可以直接从界面判断“模板链路哪里出错”。
3. 模板解析失败时提交按钮被禁用。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 16. 物料档案模块第二阶段：后端 DTO 与兼容壳收敛计划

日期：2026-04-11  
状态：待确认

#### 16.1 背景

前一阶段已经完成前端 `MaterialOption` 语义收敛，明确了：

`/materials?options=true` -> `MaterialOption[]`

但后端侧仍可能存在以下治理缺口：

1. handler / service 输入输出边界仍可能直接复用 `model.Material`
2. 某些响应可能继续通过 `gin.H` 直接拼装，导致契约弱类型化
3. `version / _v` 兼容壳可能仍然残留在响应或补丁链路中，增加语义漂移
4. 旧 `material-service` 虽然前端主链已无现役引用，但其历史残片仍可能影响后续认知与维护边界

#### 16.2 本轮目标

1. 审清后端 material 模块的输入 DTO、输出 DTO、领域模型之间的边界。
2. 收敛不必要的 `model` 直出与 `gin.H` 弱类型响应，减少前后端契约漂移。
3. 评估并收敛 `version / _v` 兼容壳，仅保留有真实兼容价值的部分。
4. 在不破坏当前前端已通过验证主链的前提下，为后续删除历史残片创造条件。

#### 16.3 执行边界

1. 本轮只治理物料档案模块的数据契约与兼容壳问题。
2. 不扩展新业务能力，不新增字段语义，不改动既有业务流程。
3. 不在未确认消费方的情况下强行删除可能仍被依赖的接口字段。
4. 若发现某个兼容字段仍被真实消费，则优先收敛映射与命名，不做激进删除。

#### 16.4 审查范围

1. 后端 material 相关：
   - handler
   - service
   - DTO / contract
   - model
   - 路由与 options 查询分支
2. 前端仅做消费面复核，不再大面积改动已稳定的 `MaterialOption` 主链。
3. 旧入口与残片：
   - `material-service.ts`
   - `version / _v` 兼容字段
   - 可能残留的历史映射函数或过渡结构

#### 16.5 实施步骤

1. 先定位并标注后端各接口的事实契约：
   - 创建/更新物料
   - 物料列表查询
   - 物料 options 查询
   - patch / version 链路
2. 识别哪些场景正在：
   - 直接返回 `model.Material`
   - 直接接受 `model.Material` 作为输入
   - 使用 `gin.H` 拼装响应
3. 按“最小破坏”原则拆分 DTO：
   - 列表 DTO
   - options DTO
   - 明细 DTO
   - 保存/更新 DTO
4. 审查 `version / _v`：
   - 识别真实消费方
   - 对仅历史残留的兼容壳制定移除或降权方案
5. 对旧 `material-service`：
   - 若仅剩历史阻断壳，评估是否继续保留
   - 若当前保留更安全，则仅进一步降低暴露面，不强删
6. 执行验证：
   - `pnpm exec tsc --noEmit`
   - 后端相关测试 / 构建验证
   - 关键物料接口最小回归检查

#### 16.6 风险与控制

1. **接口回归风险**
   - DTO 收敛若触碰返回字段，可能影响仍未显式标注的消费方。
   - 控制方式：先审消费面，再做最小字段调整。
2. **兼容壳误删风险**
   - `version / _v` 可能仍承担补丁链或增量同步兼容职责。
   - 控制方式：先定位真实读方，再决定删除、保留或改名。
3. **认知漂移风险**
   - 若只改后端、不记录契约分层，后续仍可能重新退化回 `model` 直出。
   - 控制方式：在 `walkthrough.md` 明确记录最终契约边界与保留项。

#### 16.7 完成标准

1. 后端 material 主链的输入/输出 DTO 边界清晰，不再以 `model.Material` 或 `gin.H` 充当默认对外契约。
2. `version / _v` 兼容壳已完成审查，并对保留/收敛/移除做出明确处理。
3. 前端已完成的 `MaterialOption` 主链保持稳定，不被重新污染为完整 `Material` 语义。
4. 前端类型检查与后端相关验证通过。
5. 完成后更新 `walkthrough.md`。

### 17. 物料档案模块第三阶段：`_v` 兼容壳收口计划

日期：2026-04-11  
状态：待确认

#### 17.1 背景

前一轮已经完成两项关键收敛：

1. 前端主链已统一以 `version` 作为物料实体版本语义。
2. 后端物料响应已从分散的 `gin.H` 收敛到统一映射层，`_v` 当前仅作为兼容别名集中保留。

当前剩余问题不是“能否支持版本控制”，而是：

`version` 与 `_v` 双字段并存会继续制造“到底哪个才是正式契约”的歧义。

#### 17.2 本轮目标

1. 明确物料模块中 `version` 与 `_v` 的事实角色。
2. 停止 `_v` 在物料模块内继续作为主链语义扩散。
3. 在确认兼容风险可控的前提下，评估将 `_v` 从物料接口响应中降级或移除。
4. 保证 SDRTS patch / optimistic lock 主链继续稳定使用 `version` 语义。

#### 17.3 执行边界

1. 本轮只治理物料模块的 `_v` 兼容壳，不扩展到其他领域模块。
2. 不改变补丁协议 `metadata.version` 的现有设计。
3. 不在未确认消费面的情况下直接删除仍可能被历史逻辑读取的 `_v`。
4. 若发现某处仍真实依赖 `_v`，优先改为显式读取 `version`，再决定是否移除兼容字段。

#### 17.4 审查范围

1. 后端：
   - `models.Material` 的 JSON tag
   - material response helper / handler / service
   - patch / save / list / options 链路
2. 前端：
   - material archive adapters / contracts / services
   - 仍可能直接读取 `_v` 的历史调用点
3. 历史兼容面：
   - 缓存响应
   - 可能的外部脚本或同步入口

#### 17.5 实施步骤

1. 审查 `_v` 的实际消费面：
   - 前端是否仍直接读取 `_v`
   - 后端是否仍通过模型 tag 默认暴露 `_v`
2. 收敛输出策略：
   - 保持 `version` 为主链字段
   - 停止在物料 DTO / helper 中继续强化 `_v` 的存在感
3. 若兼容风险可控，执行一层收口：
   - 先从物料 response helper 或 DTO 层移除 `_v`
   - 保留前端 adapter 对 `_v` 的兜底读取能力一段时间，防止旧缓存或旧响应干扰
4. 执行验证：
   - `pnpm exec tsc --noEmit`
   - `go test ./...`
   - 抽查物料列表 / 保存 / patch 主链

#### 17.6 风险与控制

1. **隐藏消费面风险**
   - 某些历史代码或外部调用可能仍读取 `_v`。
   - 控制方式：先搜索消费点，再做分层移除。
2. **缓存兼容风险**
   - 旧缓存内容可能仍携带 `_v`。
   - 控制方式：前端 adapter 在过渡阶段继续接受 `_v` 兜底，但后端新响应优先收口。
3. **语义反复风险**
   - 如果只删除字段、不明确 `version` 是唯一主链字段，后续仍可能重新引入 `_v`。
   - 控制方式：在文档与映射层同时明确 `version` 是正式契约。

#### 17.7 完成标准

1. 物料模块中 `version` 已成为唯一主链版本语义。
2. `_v` 不再作为物料接口的主输出字段继续扩散。
3. 前端物料主链与 patch 协议保持稳定。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 18. 物料档案模块第四阶段：DTO 命名与语义对齐计划

日期：2026-04-11  
状态：待确认

#### 18.1 背景

前几轮已经完成以下关键收敛：

1. 前端物料主链已拆分为 `Material` 与 `MaterialOption`。
2. 后端成功响应已从 `gin.H` 收敛为明确 DTO。
3. 物料模块中的 `_v` 已移除，`version` 成为唯一正式版本语义。

当前剩余的问题主要不是字段契约，而是**命名与分层表达**仍不够对齐：

1. 后端 DTO 名称仍偏向 handler 内部视角，未完全贴近前端 contract 语义。
2. `SaveMaterialInput` / `MaterialResponse` / `MaterialOptionsResponse` 等命名与前端 `MaterialApiDTO / MaterialOptionApiDTO / MaterialListPageApiDTO` 的层次关系还不够直观。
3. 若不继续收敛，后续维护者仍可能误解“哪些是接口 DTO，哪些是领域输入，哪些是持久化模型”。

#### 18.2 本轮目标

1. 让物料模块后端 DTO 命名与前端 contract 语义更完全一致。
2. 进一步明确：
   - 接口响应 DTO
   - 接口输入 DTO
   - 领域服务输入
   - 持久化模型
   各自的边界。
3. 在不改变现有接口字段的前提下，提高后端契约的可读性与可维护性。

#### 18.3 执行边界

1. 本轮只做命名与分层对齐，不改变已稳定的接口字段。
2. 不扩展新业务能力，不重构物料领域流程。
3. 不重新引入 `gin.H` 弱类型响应或 `model.Material` 直出。
4. 若某个命名变更会影响较大范围调用，则优先通过局部 alias 或分步迁移降低风险。

#### 18.4 审查范围

1. 后端物料相关：
   - response DTO
   - options DTO
   - list page DTO
   - save / bulk sync 输入 DTO
   - handler 映射 helper
2. 前端物料相关：
   - `contracts/material-api-dto.ts`
   - `adapters/material-api-adapter.ts`
   - `services/material-core-service.ts`
   - `services/material-maintenance-service.ts`
3. 命名一致性：
   - 类型名
   - 映射函数名
   - 返回值层级表达

#### 18.5 实施步骤

1. 识别当前后端 DTO 与前端 contract 的命名差异。
2. 制定映射原则：
   - 响应 DTO 名称优先与前端 contract 对应
   - 输入 DTO 名称明确为 request / input 语义
   - 领域服务输入与 HTTP DTO 不混用
3. 按最小改动原则实施：
   - 重命名后端 DTO / helper 中的类型
   - 必要时调整局部映射函数命名
   - 保持 JSON 字段与接口行为不变
4. 执行验证：
   - `go test ./...`
   - `pnpm exec tsc --noEmit`
   - 抽查物料列表 / options / 保存 / patch 主链

#### 18.6 风险与控制

1. **命名变更波及风险**
   - 后端类型重命名可能影响测试、helper 或局部服务调用。
   - 控制方式：优先做局部重命名，逐层验证。
2. **语义过度对齐风险**
   - 后端与前端不一定需要一字不差同名，若强行完全一致可能反而模糊 request / response 边界。
   - 控制方式：对齐“语义层次”，不追求机械同名。
3. **回归风险**
   - 若重命名过程中误动 JSON tag 或响应结构，会破坏现有接口契约。
   - 控制方式：只改类型名与映射名，不改字段名。

#### 18.7 完成标准

1. 物料后端 DTO 命名与前端 contract 语义层次基本对齐。
2. request / response / service input / model 边界更清晰。
3. 物料接口字段保持不变。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 19. 物料档案模块第五阶段：服务层命名继续收敛计划

日期：2026-04-11  
状态：待确认

#### 19.1 背景

当前物料模块已经完成：

1. 前端 `Material / MaterialOption` 分层收敛。
2. 后端 response DTO 与 request DTO 命名对齐。
3. `_v` 兼容壳移除，`version` 成为唯一正式版本语义。

但服务层内部仍有少量类型名偏向“临时中间结构”表达，例如：

- `MaterialOptionItem`
- `MaterialListQuery`

这些命名虽然不直接暴露给前端，但仍会影响后端代码可读性，容易让维护者分不清：

- 这是查询参数
- 这是查询结果
- 这是接口 DTO
- 还是领域输入

#### 19.2 本轮目标

1. 继续收敛物料服务层内部类型命名，使其更贴近职责语义。
2. 明确服务层中的：
   - 查询参数
   - 查询结果
   - 服务输入
   各自的命名边界。
3. 在不改变 HTTP 契约的前提下，提高服务层的可读性与维护性。

#### 19.3 执行边界

1. 本轮只治理物料模块服务层命名，不扩展到其他领域模块。
2. 不改变任何 JSON 字段与接口行为。
3. 不重构业务逻辑，不迁移数据库模型。
4. 不重新混淆 HTTP DTO 与服务层内部类型。

#### 19.4 审查范围

1. `server/services/warehouse_master_service.go` 中的物料相关类型。
2. 引用这些类型的 handler / helper / tests。
3. 命名候选重点：
   - `MaterialOptionItem`
   - `MaterialListQuery`
   - 其他仍偏“item / input / payload”但语义不够明确的服务层类型

#### 19.5 实施步骤

1. 识别当前服务层命名中仍显含混的类型。
2. 按职责重命名：
   - 查询参数改为 query / filter 语义
   - 查询结果改为 result / record 语义
   - 服务输入保留 request / payload 语义
3. 同步调整引用点：
   - handler
   - response helper
   - tests
4. 执行验证：
   - `go test ./...`
   - `pnpm exec tsc --noEmit`
   - 抽查物料列表 / options / 保存 / patch 主链

#### 19.6 风险与控制

1. **命名连锁风险**
   - 服务层类型重命名容易漏改 handler 或测试引用。
   - 控制方式：以 grep 方式一次性覆盖所有引用后再验证。
2. **语义过度设计风险**
   - 如果为了“更正式”而命名过长，反而降低可读性。
   - 控制方式：优先使用简短但职责明确的命名。
3. **边界回退风险**
   - 若服务层命名继续模糊，后续又会出现 DTO / model / query 混用。
   - 控制方式：坚持 query、result、request、model 四类语义分层。

#### 19.7 完成标准

1. 物料服务层内部类型命名与职责更清晰。
2. handler / service / helper / tests 引用已同步。
3. 接口字段与行为保持不变。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 20. 物料档案模块第六阶段：拆分独立 dto/query 文件计划

日期：2026-04-11  
状态：待确认

#### 20.1 背景

当前物料模块已经完成多轮命名与语义收敛，但类型定义仍分散在：

- `server/handlers/material_response_helpers.go`
- `server/services/warehouse_master_service.go`

这导致几个问题：

1. handler、service 与类型定义混在同一文件，文件职责过重。
2. request / response / query / result 虽然命名已更清晰，但结构上仍未物理分层。
3. 后续继续治理时，维护者仍需要在大文件内跳跃查找相关类型。

#### 20.2 本轮目标

1. 将物料模块的 response dto、request dto、query/result 类型拆到独立文件。
2. 让 handler / service 文件更聚焦于逻辑，而非承载大量类型定义。
3. 在不改变接口字段与业务行为的前提下，进一步提升物料模块结构清晰度。

#### 20.3 执行边界

1. 本轮只做物料模块内部文件结构拆分，不扩展到其他模块。
2. 不改变 JSON 字段、接口路径、业务逻辑与数据库模型。
3. 不借拆文件之机引入新的业务抽象。
4. 拆分后命名与导入关系必须保持清晰，不制造循环依赖。

#### 20.4 目标拆分方向

1. handler 侧：
   - 新增独立 response dto 文件，用于承载 `MaterialApiDTO / MaterialOptionApiDTO / MaterialListPageApiDTO / MaterialOptionsApiDTO`
2. service 侧：
   - 新增独立 request / query / result 文件，用于承载：
     - `SaveMaterialAPIRequest`
     - `BulkSyncMaterialAPIRequest`
     - `BulkSyncMaterialsAPIPayload`
     - `MaterialListPageQuery`
     - `MaterialOptionQueryResult`
3. 原 handler / service 文件仅保留逻辑与必要导入。

#### 20.5 实施步骤

1. 识别现有类型定义与引用点。
2. 创建独立文件并迁移类型定义。
3. 同步修正：
   - package 内引用
   - handler / helper / service / tests 导入或直接引用
4. 执行验证：
   - `go test ./...`
   - `pnpm exec tsc --noEmit`
   - 抽查物料列表 / options / 保存 / patch 主链

#### 20.6 风险与控制

1. **循环依赖风险**
   - 拆文件若包边界处理不当，可能引入不必要耦合。
   - 控制方式：保持在既有 package 内部拆分，不跨 package 过度抽象。
2. **引用遗漏风险**
   - 类型迁移后，局部 tests / helper / handler 可能遗漏引用。
   - 控制方式：迁移后立即用 grep 和编译验证覆盖。
3. **结构收益不足风险**
   - 若拆分粒度过细，可能导致文件过多而收益有限。
   - 控制方式：优先按 response dto 与 service dto/query 两组拆分，不做碎片化切分。

#### 20.7 完成标准

1. 物料模块的 response dto 与 service request/query/result 已拆到独立文件。
2. handler / service 主文件职责更聚焦。
3. 接口字段与行为保持不变。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 21. 物料档案模块第七阶段：继续拆分 mapper 文件计划

日期：2026-04-11  
状态：待确认

#### 21.1 背景

当前物料模块已经完成：

1. handler response dto 独立成文件。
2. service request / query / result 独立成文件。
3. `material_response_helpers.go` 当前只剩映射逻辑。

但 mapper 仍然集中在同一个文件里，包含两类职责：

1. 完整物料实体 -> `MaterialApiDTO`
2. 轻量物料 options -> `MaterialOptionApiDTO`

虽然当前文件已比之前清晰，但若继续治理，mapper 仍可以进一步按职责物理拆分，使后续维护更直接定位到对应映射链。

#### 21.2 本轮目标

1. 将物料 mapper 按职责进一步拆成更清晰的文件。
2. 保持 mapper 所在 package 与对外函数签名不变。
3. 在不改变接口行为的前提下，提高 handler 层映射逻辑的可维护性。

#### 21.3 执行边界

1. 本轮只拆物料 mapper 文件，不扩展到其他模块。
2. 不改变 DTO 结构、JSON 字段与接口行为。
3. 不重新命名已稳定的 DTO 类型与 service types。
4. 不做过度碎片化拆分，优先按“完整物料映射”与“物料 options 映射”两组组织。

#### 21.4 目标拆分方向

1. `material_mapper.go`
   - 承载 `MaterialApiDTO` 相关映射函数
2. `material_option_mapper.go`
   - 承载 `MaterialOptionApiDTO` 相关映射函数
3. 原 `material_response_helpers.go`
   - 视迁移结果决定是否清空后删除，或保留为极薄中转文件

#### 21.5 实施步骤

1. 审查现有 mapper 函数依赖关系。
2. 创建新的 mapper 文件并迁移函数。
3. 同步修正 handler 调用与包内引用。
4. 若原文件已无保留价值，则清空或删除前需再次确认无残留引用。
5. 执行验证：
   - `go test ./...`
   - `pnpm exec tsc --noEmit`
   - 抽查物料列表 / options / 保存 / patch 主链

#### 21.6 风险与控制

1. **过度拆分风险**
   - mapper 文件拆得过碎会增加跳转成本。
   - 控制方式：只按两类职责拆，不继续细分单体 / 列表。
2. **引用遗漏风险**
   - 包内函数迁移后可能遗漏调用点。
   - 控制方式：迁移后用 grep + 编译验证覆盖。
3. **收益边界风险**
   - 若原文件只剩极少逻辑，继续拆分必须确保结构收益大于复杂度。
   - 控制方式：以“完整物料映射 vs options 映射”作为最后一级拆分，不再继续细碎化。

#### 21.7 完成标准

1. 物料 mapper 已按职责拆成更清晰的文件。
2. package、函数签名、接口行为保持不变。
3. 前端类型检查与后端测试通过。
4. 完成后更新 `walkthrough.md`。

### 22. 物料档案模块第八阶段：删除空壳 helper 文件计划

日期：2026-04-11  
状态：待确认

#### 22.1 背景

当前物料 handler 层已经完成如下结构收敛：

1. `material_api_dto.go` 承载 response dto。
2. `material_mapper.go` 承载完整物料映射。
3. `material_option_mapper.go` 承载物料 options 映射。

因此，原 `material_response_helpers.go` 已不再承载实际逻辑，只剩空壳包声明。继续保留该文件会造成：

1. 误导维护者以为仍有 helper 逻辑在该文件中。
2. 增加无意义的文件数量。
3. 降低目录结构的整洁度。

#### 22.2 本轮目标

1. 删除已无实际内容的 `material_response_helpers.go` 空壳文件。
2. 保持现有 handler 层的 dto / mapper 结构不变。
3. 在不改变任何接口行为的前提下完成物料 handler 层收尾清理。

#### 22.3 执行边界

1. 本轮仅删除空壳文件，不做新的结构调整。
2. 不改变 package、函数签名、DTO、接口字段与业务行为。
3. 删除前需确认不存在残留引用或特殊构建依赖。

#### 22.4 实施步骤

1. 确认 `material_response_helpers.go` 当前仅剩包声明。
2. 删除该文件。
3. 执行验证：
   - `go test ./...`
   - `pnpm exec tsc --noEmit`
   - 抽查物料列表 / options / 保存 / patch 主链

#### 22.5 风险与控制

1. **误删风险**
   - 若文件中仍有隐藏逻辑或构建依赖，删除会导致编译失败。
   - 控制方式：删除前再次读取并确认文件内容，删除后立即测试。
2. **收益有限风险**
   - 本轮属于收尾清理，收益较小。
   - 控制方式：限定为单文件删除，不扩展其它变更。

#### 22.6 完成标准

1. `material_response_helpers.go` 已删除。
2. 物料 handler 层目录结构与职责边界更整洁。
3. 前端类型检查与后端测试通过。
4. 完成后更新 `walkthrough.md`。

### 23. 沉淀前端状态治理建议到 `GEMINI.MD` 的计划

日期：2026-04-11  
状态：待确认

#### 23.1 背景

当前前端技术栈已经明确包含：

1. `Vite + React 19 + @tanstack/react-router`
2. `@tanstack/react-query`
3. `Zustand`
4. 自研 `apiFetch`

同时代码中仍存在若干基于 `window.dispatchEvent` / `window.addEventListener` 的字符串事件广播，例如：

- `xdfc_product_types_data_updated`
- `xdfc_products_data_updated`
- 其他若干 `xdfc_*_updated`

经分析，当前项目的核心瓶颈更偏向“客户端状态协同与跨模块刷新治理”，而不是“Server Components 式服务端流式渲染”。因此更适合优先推进：

- `React Query + Zustand + typed domain event bus`
- 并以 `WebSocket / SSE -> invalidateQueries` 作为高实时链路补充

#### 23.2 本轮目标

1. 将上述架构结论沉淀到 `GEMINI.MD`，供后续协作与演进统一参考。
2. 记录推荐路径、原因、优缺点与落地顺序。
3. 保持为纯文档沉淀，不改业务代码。

#### 23.3 执行边界

1. 本轮只更新架构说明文档，不修改前端或后端代码。
2. 若工作区内不存在 `GEMINI.MD`，不得擅自假定路径；需先与用户确认正确位置或是否允许创建。
3. 文档内容需聚焦当前项目现实栈，而非脱离上下文给出理想化建议。

#### 23.4 拟沉淀内容

1. 现状判断：
   - 当前是强 CSR + 客户端取数架构
   - 已有 React Query / Zustand / WebSocket 基础
   - 现有 `dispatchEvent` 本质上是原始事件总线
2. 推荐主方案：
   - `React Query` 管远端真相
   - `Zustand` 管本地 UI 交互态
   - typed domain event bus 替代裸 `dispatchEvent`
3. 推荐补充方案：
   - 高实时链路使用 `WebSocket / SSE -> invalidateQueries`
4. 暂不推荐主推：
   - `Server Components / RSC` 主导重构
5. 建议演进顺序：
   - 先替换字符串事件
   - 再统一 query / mutation / invalidation
   - 最后补高实时流式更新

#### 23.5 风险与控制

1. **文件定位风险**
   - 当前在工作区内未找到 `GEMINI.MD`，直接写入可能写错位置。
   - 控制方式：先向用户确认路径，或确认是否允许新建。
2. **文档脱离现实风险**
   - 若只写通用最佳实践，容易失去针对性。
   - 控制方式：明确引用现有 `react-query`、`zustand`、`dispatchEvent`、`WebSocket` 现状。

#### 23.6 完成标准

1. 已将状态治理结论沉淀到正确的 `GEMINI.MD` 文件。
2. 文档内容明确主方案、补充方案与不推荐方向。
3. 若文件不存在，已获得用户对路径或新建动作的确认。

### 24. BOM 主链漏洞修复与 MRP / 采购影响面收口计划

日期：2026-04-10  
状态：待批准

#### 24.1 背景

当前 BOM 模块已经不仅是工程台账功能，而是直接参与以下下游链路：

`Product -> BOM(active) -> BOM.items[].standardUsage -> MRP Requirements -> 采购/补料决策`

经审查，当前 BOM 主链存在以下高风险问题：

1. 前端 `getBOMs()` 期望直接拿到 `BOM[]`，但后端 `GET /engineering/bom` 返回分页对象，协议不一致。
2. 前端编辑态会尝试调用 `PATCH /engineering/bom/:id`，但后端没有对应路由，导致编辑保存链不闭环。
3. `mrp_requirements.go` 当前只按 `productId + 第一个 active BOM` 取 BOM，没有版本、生效期、站点等权威裁决规则。
4. `standardUsage` 仍可能由前端 Excel / UI 计算事实化，而不是由后端统一权威化。

#### 24.2 本轮目标

1. 修复 BOM 前后端主链断点，确保列表读取与编辑保存闭环可靠。
2. 收紧 BOM 对 MRP / 采购需求的影响入口，避免错误 BOM 或错误数值直接驱动下游。
3. 明确 BOM 的最小权威规则：唯一有效版本、权威用量来源、删除保护边界。

#### 24.3 执行边界

1. 本轮优先修复 P0 / P1 主链问题，不扩展新的 BOM 业务能力。
2. 本轮不重做整套 BOM 版本体系，但必须消除“多个 active BOM + 随机命中”的高风险状态。
3. 本轮若未引入完整版本裁决引擎，至少要保证 MRP 不再依赖不确定顺序选取 BOM。
4. 本轮可以暂缓 P2 级弱类型与编号治理，但需记录明确留尾项。

#### 24.4 实施方案

##### 24.4.1 对齐 BOM 列表协议

涉及文件：

- `src/features/engineering/services/bom-service.ts`
- `src/features/engineering/hooks/use-bom-data.ts`
- `server/handlers/bom.go`

动作：

1. 明确 `GET /engineering/bom` 的分页响应 DTO。
2. 前端显式解析 `items`，不再将分页对象误当作 `BOM[]`。
3. 校验 BOM 列表、预览、编辑入口都消费一致的数据结构。

##### 24.4.2 统一 BOM 编辑保存链

涉及文件：

- `src/features/engineering/components/bom-action-dialog.tsx`
- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/hooks/use-bom-data.ts`
- `src/features/engineering/services/bom-service.ts`
- `server/routes/routes.go`
- `server/handlers/bom.go`
- `server/services/engineering_master_service.go`

动作：

1. 在“补齐 PATCH 后端链路”与“统一走 POST Save”之间选定一种主链。
2. 优先建议统一走已存在的 `POST /engineering/bom` 保存入口，先确保编辑可靠落库。
3. 若保留增量 patch 方案，则必须同时补齐路由、handler、service 与 version 冲突控制。

##### 16.4.3 为 MRP 建立最小权威 BOM 选择规则

涉及文件：

- `server/services/mrp_requirements.go`
- `server/services/engineering_master_service.go`
- `server/models/product.go`

动作：

1. 提炼权威 BOM 选择逻辑，禁止在 MRP 内直接按“第一个 active BOM”命中。
2. 若当前业务规则尚未完整固化，至少先强制同产品只有一个可供 MRP 消费的有效 BOM。
3. 为无法唯一裁决的场景返回显式错误或阻断结果，禁止静默选错。

##### 16.4.4 收回 `standardUsage` 的后端权威性

涉及文件：

- `src/features/engineering/hooks/use-bom-data.ts`
- `src/features/engineering/hooks/use-bom-form.ts`
- `server/services/engineering_master_service.go`

动作：

1. 后端在 `SaveBOM` 中统一重算或校验 `standardUsage`。
2. 前端可保留预览计算，但不得作为事实来源。
3. 对 Excel 导入、表单编辑、手工请求三条路径统一校验结果。

##### 16.4.5 收紧删除边界

涉及文件：

- `server/services/engineering_master_service.go`
- `server/handlers/bom.go`

动作：

1. 删除前校验是否为当前唯一有效 BOM。
2. 评估是否将硬删除改为仅允许删除草稿 / 未使用 BOM，其他场景改走归档。
3. 对破坏下游链路的删除尝试返回显式阻断错误。

##### 16.4.6 记录次级治理项

涉及文件：

- `src/features/engineering/components/bom-action-dialog.tsx`
- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/hooks/use-bom-data.ts`
- `src/features/engineering/data/schema.ts`

动作：

1. 记录 `any`、随机 `bomNo`、版本字段命名混杂等 P2 项。
2. 若本轮变更范围可控，可顺手收紧；若会扩大面，则明确延期到下一轮。

#### 16.5 风险与注意事项

1. **MRP 误拦截风险**
   - 若过早引入严格唯一约束，但历史数据已存在多个 active BOM，可能导致 MRP 无法出数。
   - 需要先决定是阻断并报错，还是先选定临时裁决规则。
2. **保存链切换风险**
   - 若从 patch 切回全量保存，需要确认不会破坏现有前端 delta 跟踪和并发提示。
3. **历史数据兼容风险**
   - 旧 BOM 记录可能缺少完整版本、生效期或站点数据，权威选择逻辑要考虑降级策略，但不能静默选错。
4. **删除策略收紧风险**
   - 若直接禁止删除，需确认前端提示足够明确，避免用户误解为系统故障。

#### 16.6 完成标准

1. BOM 列表读取协议与前端消费方式完全对齐。
2. BOM 编辑保存链闭环，编辑后的数据可稳定落库并重新读取。
3. MRP 不再通过“第一个 active BOM”这种不确定规则驱动需求计算。
4. `standardUsage` 已由后端统一重算或校验，采购核心数值不再依赖前端事实化。
5. BOM 删除边界已收紧，不会轻易破坏下游需求链。
6. 前端类型检查与后端测试通过。
7. 完成后更新 `walkthrough.md`。

### 17. BOM 编号、导入边界与版本字段语义治理计划

日期：2026-04-10  
状态：待批准

#### 17.1 背景

上一轮已优先修复 BOM 对 MRP / 采购链最危险的主链漏洞，但仍有一组次级治理项会持续影响可维护性与数据边界：

1. `use-bom-form.ts` 仍由前端随机生成 `bomNo`，权威编号来源不清晰。
2. `use-bom-data.ts` 在 BOM Excel 导入时会自动调用物料保存逻辑，BOM 导入与物料主数据维护边界仍然混杂。
3. 当前 BOM 前后端同时存在 `bomVersion / revisionNo / version` 等字段表达，DTO 语义不够收敛。
4. BOM 相关组件链虽已收紧主路径，但仍存在局部弱类型与命名混杂，后续维护成本偏高。

#### 17.2 本轮目标

1. 让 BOM 编号与关键版本字段表达更加权威、单一、可审计。
2. 收紧 BOM 导入对物料主数据的影响边界，避免静默副作用。
3. 清理剩余弱类型与语义混杂点，为后续 BOM 版本治理打基础。

#### 17.3 执行边界

1. 本轮不重做 BOM 整套版本体系，只收敛现有字段的 DTO 语义与使用方式。
2. 本轮不扩展新的导入功能，而是优先决定“自动建料是否允许”及其触发边界。
3. 若某些历史字段仍暂时必须兼容，可保留映射，但不能继续放任语义模糊。

#### 17.4 实施方案

##### 17.4.1 收回 `bomNo` 的后端权威生成

涉及文件：

- `src/features/engineering/hooks/use-bom-form.ts`
- `server/services/engineering_master_service.go`
- 如有需要：`server/models/product.go`

动作：

1. 移除前端新建 BOM 时的随机编号生成逻辑。
2. 在后端保存链中为新 BOM 分配权威编号。
3. 保证新建成功后前端展示后端返回的正式 `bomNo`。

##### 17.4.2 收紧 BOM 导入的自动建料边界

涉及文件：

- `src/features/engineering/hooks/use-bom-data.ts`
- `src/features/engineering/services/excel-service.ts`
- `src/features/material-archive/services/material-maintenance-service.ts`

动作：

1. 审查当前 Excel 解析结果中“抽取物料 -> 自动保存物料”的流程。
2. 在“禁止自动建料”与“允许但需显式提示/确认”之间确定边界。
3. 避免 BOM 导入在用户无感的情况下直接污染物料主数据。

##### 17.4.3 统一 BOM 版本字段语义

涉及文件：

- `src/features/engineering/data/schema.ts`
- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- `server/models/product.go`
- `server/services/engineering_master_service.go`

动作：

1. 明确 `bomVersion / revisionNo / version` 各自职责。
2. 尽量对外收敛为更清晰的 DTO 表达，减少同义字段并存。
3. 保证前端表单显示、后端序列化和保存逻辑语义一致。

##### 17.4.4 继续清理 BOM 弱类型残留

涉及文件：

- `src/features/engineering/components/bom-editor/*.tsx`
- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/hooks/use-bom-data.ts`

动作：

1. 清理仍残留的 `any` 或弱约束类型。
2. 将常用表单值、导入项、替代料结构改为显式类型。
3. 避免下一轮 BOM 改动再次因为类型漂移放大风险。

#### 17.5 风险与注意事项

1. **历史兼容风险**
   - 若直接重命名版本字段，可能影响已有前端显示或后端 JSON 序列化。
2. **导入体验变化风险**
   - 若收紧自动建料边界，用户原有导入习惯可能受影响，需要足够明确的提示。
3. **编号迁移风险**
   - 若 `bomNo` 生成逻辑从前端切到后端，需要确认历史 BOM 与新 BOM 的展示规则保持一致。

#### 17.6 完成标准

1. 新建 BOM 的 `bomNo` 不再由前端随机生成。
2. BOM 导入不会再静默修改物料主数据，或已加入显式边界控制。
3. `bomVersion / revisionNo / version` 的职责与 DTO 语义更加清晰。
4. BOM 相关前端弱类型进一步减少。
5. 前端类型检查与后端测试通过。
6. 完成后更新 `walkthrough.md`。

### 18. BOM 相关链路一致性与联动边界治理计划

日期：2026-04-10  
状态：待批准

#### 18.1 背景

在完成 BOM 主链收口与 P2 第一轮治理后，当前剩余风险不再只集中在单个字段，而更多体现在“相关链路之间是否一致”上。重点包括：

1. BOM 与产品、变更单之间仍存在页面层补链与隐式映射。
2. BOM 列表、详情、预览、打印等展示链路可能对版本字段、产品显示、条目内容采用不同口径。
3. BOM 导入、详情 DTO、预览视图、打印模板之间仍可能存在同义字段并行消费。
4. BOM 到 MRP / 采购链虽然已阻断核心静默选错问题，但仍需复查是否存在展示层掩盖或剩余降级路径。

#### 18.2 本轮目标

1. 让 BOM 相关链路在字段语义、展示口径、联动方式上更一致。
2. 降低页面层自行补链、猜测字段、兜底拼装带来的长期维护风险。
3. 继续为 MRP / 采购下游提供更稳定、可追溯的上游数据表达。

#### 18.3 执行边界

1. 本轮聚焦 BOM 相关链路一致性，不扩展新的 BOM 业务能力。
2. 本轮若发现需要调整 DTO 或页面消费方式，应优先收敛表达，而不是继续增加兼容壳层。
3. 本轮可继续复用上一轮已建立的后端权威边界，不回退到前端补事实来源的模式。

#### 18.4 实施方案

##### 18.4.1 收紧 BOM 与产品 / 变更单的事实映射

涉及文件：

- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- `src/features/engineering/tabs/bom-mgmt.tsx`
- `server/services/engineering_master_service.go`

动作：

1. 复查 BOM 表单中来自产品与变更单的派生字段填充方式。
2. 尽量减少页面层“如果没有就自己回填”的隐式补链。
3. 确保后端返回与前端显示使用同一事实字段来源。

##### 18.4.2 统一 BOM 列表 / 详情 / 预览 / 打印口径

涉及文件：

- `src/features/engineering/components/bom-mgmt/bom-table.tsx`
- `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
- `src/features/engineering/components/bom-detail-table.tsx`
- `src/features/print-mgmt/components/templates/bom-print-template.tsx`

动作：

1. 审查这些页面对 `bomNo / bomVersion / revisionNo / product` 的消费方式。
2. 统一版本展示与产品显示口径。
3. 避免列表和预览显示的是两套不同的字段含义。

##### 18.4.3 收敛 BOM 导入 / DTO / 预览之间的同义字段

涉及文件：

- `src/features/engineering/services/excel-service.ts`
- `src/features/engineering/hooks/use-bom-data.ts`
- `src/features/engineering/data/schema.ts`
- `src/features/engineering/components/bom-mgmt/*`

动作：

1. 审查导入结果、表单值、详情 DTO、预览视图是否存在同义字段不同名。
2. 尽量收敛成更稳定的 BOM 前端消费模型。
3. 避免后续继续依赖页面各自拼装字段语义。

##### 18.4.4 复查 BOM -> MRP / 采购下游剩余边界

涉及文件：

- `server/services/mrp_requirements.go`
- 相关前端 MRP / 采购展示文件

动作：

1. 复查 BOM 缺失、多版本、字段为空等场景是否仍存在静默降级。
2. 审查前端展示是否会掩盖后端已返回的显式异常。
3. 确保下游链路对 BOM 问题的暴露是直接、可定位的。

#### 18.5 风险与注意事项

1. **展示回归风险**
   - 若统一列表/预览/打印口径，可能引发表现细节变化，需要注意用户既有认知。
2. **字段收敛风险**
   - 若过快删除同义字段消费位，可能碰到某些页面仍在依赖旧命名。
3. **下游暴露风险**
   - 若把原本被展示层掩盖的问题直接显式化，短期内可能暴露更多历史数据脏值，但这是可接受的收口过程。

#### 18.6 完成标准

1. BOM 与产品 / 变更单的关键映射在前后端表达上更一致。
2. BOM 列表、详情、预览、打印对版本与产品显示的口径更统一。
3. BOM 导入 / DTO / 预览间的同义字段消费进一步减少。
4. BOM 到 MRP / 采购链的剩余降级路径完成复查与必要收口。
5. 前端类型检查与后端测试通过。
6. 完成后更新 `walkthrough.md`。

### 19. BOM 与 Change Order / Product 字段归一化及 MRP / 采购展示链治理计划

日期：2026-04-10  
状态：待批准

#### 19.1 背景

在完成 BOM 主链收口、P2 第一轮治理以及相关链路一致性收口后，当前剩余风险更多体现在：

1. BOM 表单和展示层仍会对 `changeOrderNo / revisionNo / siteCode / effectiveFrom` 等字段做页面级派生或补链。
2. BOM 与 Change Order / Product 的关系虽然更清晰了，但仍未完全做到“由后端返回权威结果，前端只消费”。
3. MRP / 采购前端页面需要再次复查，确认不会把后端 BOM 异常包装成模糊提示或静默降级。

#### 19.2 本轮目标

1. 继续压缩 BOM 与 Change Order / Product 之间的页面层补链逻辑。
2. 让 MRP / 采购前端对 BOM 问题的暴露更直接、更可定位。
3. 继续减少与这些链路直接相关的弱类型与兼容兜底。

#### 19.3 执行边界

1. 本轮聚焦字段归一化与下游展示链，不扩展新的 BOM 或 MRP 业务能力。
2. 本轮若发现历史脏数据，应优先显式暴露问题，而不是再增加新的静默回退。
3. 本轮应尽量复用上一轮已经建立的 BOM 后端权威边界，不回退到前端自算、自猜、自补的模式。

#### 19.4 实施方案

##### 19.4.1 收紧 BOM 与 Change Order / Product 的字段派生

涉及文件：

- `src/features/engineering/hooks/use-bom-form.ts`
- `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- `server/services/engineering_master_service.go`

动作：

1. 复查 BOM 表单初始化时哪些字段来自 Change Order，哪些字段来自 BOM 自身。
2. 尽量减少前端在缺失值时“自己猜测回填”的逻辑。
3. 优先让后端保存 / 查询结果返回稳定、可直接消费的字段值。

##### 19.4.2 复查 MRP / 采购前端展示链对 BOM 异常的处理

涉及文件：

- MRP / 采购相关前端页面与 hooks
- 如有必要：对应服务调用层

动作：

1. 检查 BOM 缺失、多 active BOM、关键字段缺失等异常在前端如何展示。
2. 防止后端显式错误被前端模糊 toast 或空数据展示再次掩盖。
3. 确保用户能直接看到 BOM 问题来自哪里。

##### 19.4.3 清理与上述链路直接相关的弱类型与兼容兜底

涉及文件：

- `src/features/engineering/*`
- `src/features/mrp/*`
- `src/features/procurement/*`（若存在）

动作：

1. 清理与 BOM 下游展示链直接相关的弱类型。
2. 去掉会掩盖错误来源的页面级默认值拼装。
3. 让异常优先显式暴露，而不是被 UI 吞掉。

#### 19.5 风险与注意事项

1. **下游数据暴露风险**
   - 更严格的显式错误可能会让历史脏数据问题更早暴露，但这是本轮治理目标的一部分。
2. **展示习惯变化风险**
   - 若原本页面使用了大量兜底文本，收紧后用户会更频繁看到真实异常提示，需要保证文案清晰。

#### 19.6 完成标准

1. BOM 与 Change Order / Product 的关键字段派生逻辑进一步收敛。
2. MRP / 采购前端不会再掩盖后端返回的 BOM 相关显式错误。
3. BOM 缺失、多 active BOM、关键字段异常在下游页面能被直接定位。
4. 与这些链路直接相关的弱类型和兼容兜底进一步减少。
5. 前端类型检查与后端测试通过。
6. 完成后更新 `walkthrough.md`。

### 20. BOM 后端字段归一化与 MRP / 采购异常提示统一计划

日期：2026-04-10  
状态：待批准

#### 20.1 背景

当前 BOM 与下游链路已经完成多轮收口，但仍存在两个尾部问题：

1. BOM 后端返回字段虽已更完整，但前端在部分场景下仍会对 Change Order 相关字段做补链消费。
2. MRP / 采购链中的某些页面仍需继续区分“正常无数据”与“后端分析失败导致的空数据”，避免异常被误显示为普通空态。

#### 20.2 本轮目标

1. 进一步提升 BOM 后端返回字段的权威性，继续减少前端补链。
2. 统一 MRP / 采购下游页面对异常空态与正常空态的提示策略。
3. 继续减少与这些链路直接相关的兼容壳层与弱类型。

#### 20.3 执行边界

1. 本轮不改 BOM 核心计算逻辑，只处理字段表达与异常提示策略。
2. 本轮如果发现历史脏数据，应优先显式暴露，而不是继续用空态 UI 吞掉问题。
3. 本轮继续遵循“后端为事实来源、前端负责展示”的边界。

#### 20.4 实施方案

##### 20.4.1 继续收紧 BOM 后端字段归一化

涉及文件：

- `server/services/engineering_master_service.go`
- `server/models/product.go`
- 对应前端消费文件

动作：

1. 复查 BOM 查询返回中哪些字段仍依赖前端补链才能完整展示。
2. 尽量让后端返回更稳定、可直接消费的 BOM / Change Order 关联字段。
3. 继续减少前端对派生字段的重复拼装。

##### 20.4.2 统一 MRP / 采购链的异常空态提示

涉及文件：

- `src/features/mrp/*`
- `src/features/procurement/*`（若存在）

动作：

1. 审查页面中哪些“空数据”是真空态，哪些其实是后端分析失败。
2. 统一异常空态的展示方式，避免用户误以为“没有数据”而不是“发生了 BOM 错误”。
3. 保证错误原因可直接定位到 BOM 链路。

##### 20.4.3 清理异常提示链上的兼容壳层

涉及文件：

- `src/features/mrp/*`
- `src/features/engineering/*`

动作：

1. 清理会把错误重新模糊化的兜底 toast / 默认文案 / 空态包装。
2. 继续减少链路上的弱类型与隐式兜底。

#### 20.5 风险与注意事项

1. **历史异常暴露风险**
   - 更严格地区分异常空态与正常空态后，可能会暴露更多历史数据问题，但这是本轮治理的目标之一。
2. **页面认知变化风险**
   - 用户可能从“看起来没数据”变成“直接看到错误原因”，需要确保文案足够清楚。

#### 20.6 完成标准

1. BOM 后端返回字段进一步减少前端补链依赖。
2. MRP / 采购页面可清晰区分正常空态与异常空态。
3. BOM 异常不会再被包装成普通“无数据”状态。
4. 与该链路直接相关的弱类型与兼容壳层进一步减少。
5. 前端类型检查与后端测试通过。
6. 完成后更新 `walkthrough.md`。

### 21. BOM DTO 收敛与 MRP 提示口径统一计划

日期：2026-04-10  
状态：待批准

#### 21.1 背景

在多轮 BOM 与 MRP 收口后，当前剩余问题已经从“是否报错”逐步转向“是否表达一致”：

1. BOM 前后端仍存在 `version / bomVersion / revisionNo` 等并行语义，虽然风险已下降，但前端消费负担仍偏高。
2. MRP `selection-tree`、分析抽屉、空结果提示之间已开始分流，但文案与提示层级仍未完全统一。
3. 若不继续收敛，后续 BOM 调整仍可能在展示层再次出现“字段理解不一致”的回潮。

#### 21.2 本轮目标

1. 进一步降低 BOM DTO 的歧义，减少前端对同义字段的理解成本。
2. 统一 MRP 关键提示链路的口径，让用户在选择前、分析中、分析后看到一致的异常表达。
3. 顺手清理本轮涉及文件中的样式 / 类型级噪音，避免后续治理被无关 warning 干扰。

#### 21.3 执行边界

1. 本轮继续聚焦 DTO 与提示口径，不重做 BOM / MRP 核心业务流程。
2. 若某些历史字段必须兼容，可保留，但应尽量减少前端直接消费它们的数量。
3. 本轮仍以“后端为事实来源，前端尽量只展示”作为边界。

#### 21.4 实施方案

##### 21.4.1 继续收敛 BOM DTO 表达

涉及文件：

- `server/models/product.go`
- `server/services/engineering_master_service.go`
- `src/features/engineering/data/schema.ts`
- 相关 BOM 前端消费文件

动作：

1. 审查 BOM 对外返回时哪些字段仍存在命名并行但语义接近的问题。
2. 尽量让前端主消费链聚焦更少、更稳定的字段集合。
3. 避免列表、表单、预览、打印再次各自理解一套版本字段语义。

##### 21.4.2 统一 MRP 提示链路口径

涉及文件：

- `src/features/mrp/components/requirements/selection-tree.tsx`
- `src/features/mrp/components/requirements/requirement-drawer.tsx`
- `src/locales/messages/zh-CN/mrp.ts`
- `src/locales/messages/en-US/mrp.ts`

动作：

1. 统一 BOM 缺失、分析失败、分析后空结果三类提示的表达层级。
2. 避免 `selection-tree` 与抽屉对同一类问题给出风格割裂的提示。
3. 让用户更容易从页面提示反推问题发生在 BOM 链路的哪个阶段。

##### 21.4.3 清理治理链上的噪音 warning

涉及文件：

- `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- 本轮涉及的其他前端文件

动作：

1. 清理已知样式 warning（如 `!h-11`）。
2. 如不引入额外风险，顺手移除本轮直接涉及文件中的低成本噪音问题。

#### 21.5 风险与注意事项

1. **兼容风险**
   - DTO 收敛时若处理不稳，可能影响旧页面仍在使用的字段。
2. **提示风格变化风险**
   - 提示统一后，用户会更明确看到 BOM 异常，需要确保文案准确而不过度惊扰。

#### 21.6 完成标准

1. BOM 主消费链对版本 / 修订 / Change Order 衍生字段的理解进一步收敛。
2. MRP `selection-tree` 与分析抽屉对 BOM 问题的提示口径更统一。
3. 本轮涉及文件中的主要 warning / 噪音问题进一步减少。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 22. BOM DTO 单源化与 MRP 阶段提示统一计划

日期：2026-04-10  
状态：待批准

#### 22.1 背景

经过多轮收口后，BOM 与 MRP 的核心问题已经大幅下降，但仍有两类尾部治理项：

1. 前端已经开始通过 `bomDisplayVersion` 等字段主动收敛 BOM 展示语义，但这些字段目前仍主要在前端补出，尚未完全形成后端单源。
2. MRP 页面虽然已经区分出部分错误态与空结果态，但“选择前 / 分析失败 / 分析后空结果”三阶段的提示语义仍可进一步统一。

#### 22.2 本轮目标

1. 继续将 BOM 主展示 DTO 收回后端定义，降低前端推断成本。
2. 统一 MRP 多阶段提示口径，让用户更容易判断问题发生在哪个阶段。
3. 继续减少与这两条链路直接相关的本地推断、兼容壳层与低价值噪音。

#### 22.3 执行边界

1. 本轮不重做 BOM / MRP 业务规则，只处理 DTO 来源与提示阶段语义。
2. 本轮若需保留历史字段兼容，应优先新增稳定主字段，而不是让前端继续自行拼装。
3. 本轮仍以“后端提供事实、前端负责展示”为边界。

#### 22.4 实施方案

##### 22.4.1 继续收紧 BOM DTO 单源化

涉及文件：

- `server/models/product.go`
- `server/services/engineering_master_service.go`
- `src/features/engineering/data/schema.ts`
- 相关 BOM 前端消费文件

动作：

1. 审查 BOM 后端返回结构中哪些字段仍需前端补出才能稳定展示。
2. 尽量让后端直接返回前端主消费链所需的稳定字段，如统一展示版本。
3. 继续减少列表、预览、打印、表单各自派生字段的需要。

##### 22.4.2 统一 MRP 多阶段提示语义

涉及文件：

- `src/features/mrp/components/requirements/selection-tree.tsx`
- `src/features/mrp/components/requirements/requirement-drawer.tsx`
- `src/features/mrp/pages/part-requirements.tsx`
- `src/locales/messages/zh-CN/mrp.ts`
- `src/locales/messages/en-US/mrp.ts`

动作：

1. 统一“选择前无可分析 BOM”、“分析失败”、“分析后空结果”三阶段的提示层级与文案。
2. 避免用户只能看到结果，却无法判断问题属于前置缺失、计算失败还是异常空结果。
3. 尽量让提示文案与视觉层级呈现稳定的一致性。

##### 22.4.3 清理本轮直接涉及的噪音问题

涉及文件：

- 本轮涉及的 BOM / MRP 前端文件

动作：

1. 顺手清理本轮直接涉及文件中的低成本 warning。
2. 避免后续治理继续被与主问题无关的噪音打断。

#### 22.5 风险与注意事项

1. **DTO 兼容风险**
   - 若后端新增或收敛字段时处理不稳，可能影响旧消费位。
2. **提示层级变化风险**
   - 阶段提示更清晰后，用户会更频繁感知到 BOM 链路问题，需要确保表达准确、稳定。

#### 22.6 完成标准

1. BOM 主展示链进一步依赖后端稳定字段，而不是前端补推断。
2. MRP 在选择前、分析失败、分析后空结果三阶段的提示语义更统一。
3. 与上述链路直接相关的本地推断、兼容壳层与 warning 进一步减少。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 23. BOM DTO 最终单源化与 MRP 三阶段提示模板统一计划

日期：2026-04-10  
状态：待批准

#### 23.1 背景

当前 BOM 与 MRP 治理已经推进到尾段，关键风险已大幅收敛，但还有两类最后的表达层问题：

1. 后端已经开始返回 `bomDisplayVersion`，但前端主消费链仍可能并行理解 `version / bomVersion / bomDisplayVersion / revisionNo` 等字段。
2. MRP 已开始区分“选择前缺 BOM”“分析失败”“分析后空结果”，但三阶段的视觉等级、文案模板和传递路径仍可进一步统一。

#### 23.2 本轮目标

1. 继续推动 BOM 主展示 DTO 接近最终单源化，减少前端并行理解多个版本字段。
2. 让 MRP 三阶段提示形成更稳定的一致模板，降低用户理解成本。
3. 继续减少与这些链路直接相关的本地推断、兼容壳层和治理噪音。

#### 23.3 执行边界

1. 本轮继续聚焦字段单源与提示模板，不重做 BOM / MRP 核心业务流程。
2. 若历史字段仍需兼容，应优先降低其在主展示链中的直接使用频率。
3. 本轮仍坚持“后端提供事实，前端负责表达”的边界。

#### 23.4 实施方案

##### 23.4.1 继续收紧 BOM DTO 主展示字段集合

涉及文件：

- `server/models/product.go`
- `server/services/engineering_master_service.go`
- `src/features/engineering/data/schema.ts`
- `src/features/engineering/components/bom-mgmt/*`
- `src/features/print-mgmt/components/templates/bom-print-template.tsx`

动作：

1. 审查前端主展示链是否仍在直接读取多套版本相关字段。
2. 尽量让列表、预览、打印、表单优先围绕更少的后端稳定字段消费。
3. 进一步减少页面层对版本 / 修订相关字段的本地组合推断。

##### 23.4.2 统一 MRP 三阶段提示模板

涉及文件：

- `src/features/mrp/components/requirements/selection-tree.tsx`
- `src/features/mrp/components/requirements/requirement-drawer.tsx`
- `src/features/mrp/pages/part-requirements.tsx`
- `src/locales/messages/zh-CN/mrp.ts`
- `src/locales/messages/en-US/mrp.ts`

动作：

1. 统一“选择前缺 BOM / 分析失败 / 分析后空结果”三阶段的视觉等级。
2. 统一三阶段提示的标题、正文、来源表达方式。
3. 让用户更容易从提示直接判断问题卡在 BOM 链路的哪个阶段。

##### 23.4.3 清理本轮直接涉及的残留噪音

涉及文件：

- 本轮涉及的 BOM / MRP 前后端文件

动作：

1. 顺手清理本轮直接涉及文件中的低成本 warning 或弱类型噪音。
2. 避免在最终尾段治理中继续被小噪音干扰。

#### 23.5 风险与注意事项

1. **兼容风险**
   - 若过快降低旧字段在前端的使用频率，可能碰到个别未覆盖消费位。
2. **提示收敛风险**
   - 三阶段模板统一后，用户会更连续地感知 BOM 问题，需要确保提示不误导、不过度放大。

#### 23.6 完成标准

1. BOM 主展示链对版本相关字段的直接理解进一步收敛到更稳定的后端字段集合。
2. MRP 三阶段提示模板在视觉等级、文案结构与传递路径上更统一。
3. 与上述链路直接相关的本地推断、兼容壳层与 warning 进一步减少。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 24. 前端旧版本字段残留审计、MRP 三阶段提示抽象与 BOM P2 封板评估计划

日期：2026-04-10  
状态：待批准

#### 24.1 背景

当前 BOM P2 相关治理已经完成多轮收口，系统性风险已显著下降。进入这一阶段后，剩余工作更偏向“尾段质量收口”：

1. 前端主链可能仍存在少量直接读取旧版本字段的残留点，需要做最后审计。
2. MRP 三阶段提示虽然已统一大方向，但组件层仍可能存在重复结构，适合进一步抽象。
3. 用户已明确希望判断本轮 BOM P2 是否可以正式封板，因此需要给出工程化结论，而不是只继续无限细化。

#### 24.2 本轮目标

1. 审清前端主链残留的旧版本字段读取点，并做必要收敛。
2. 将 MRP 三阶段提示进一步抽象成统一组件或模板函数，降低后续维护成本。
3. 基于现状、验证与剩余风险，给出 BOM P2 是否可正式封板的明确结论。

#### 24.3 执行边界

1. 本轮不再扩展新的 BOM / MRP 业务规则，只做残留审计、表达抽象和阶段总结。
2. 若发现新的高风险缺口，可记录为封板阻塞项；若仅剩低风险优化项，应避免无限延长治理周期。
3. 本轮封板评估应基于代码现状、验证结果和剩余风险，而不是主观判断。

#### 24.4 实施方案

##### 24.4.1 审计前端旧版本字段残留

涉及文件：

- `src/features/engineering/**/*`
- `src/features/print-mgmt/**/*`

动作：

1. 全面搜索前端主链对 `version / bomVersion / bomDisplayVersion / revisionNo` 的直接消费点。
2. 区分“业务上确需保留”的字段与“历史残留直读”。
3. 对残留直读点做最小范围收敛。

##### 24.4.2 抽象 MRP 三阶段提示

涉及文件：

- `src/features/mrp/components/requirements/selection-tree.tsx`
- `src/features/mrp/components/requirements/requirement-drawer.tsx`
- 如有必要：新增单独小组件文件

动作：

1. 抽出可复用的提示卡片结构或模板函数。
2. 统一选择前缺 BOM、分析失败、分析后空结果的标题 / 正文 / 视觉等级结构。
3. 在不引入过度复杂度的前提下，减少重复 JSX 和重复样式定义。

##### 24.4.3 BOM P2 封板评估

涉及文件：

- `walkthrough.md`
- 必要时参考 `task.md` / `implementation_plan.md`

动作：

1. 汇总当前已完成的 BOM P2 收口项。
2. 标明仍存在的剩余问题，并区分为“阻塞封板”或“可延后优化”。
3. 输出明确结论：
   - 可正式封板
   - 或暂不建议封板（并列出阻塞项）

#### 24.5 风险与注意事项

1. **过度治理风险**
   - 若仅剩低价值重复优化，应避免因追求完全洁癖而拖延封板。
2. **误判封板风险**
   - 若仍有高风险数据一致性缺口，则不能因为主链稳定就草率封板。

#### 24.6 完成标准

1. 前端主链旧版本字段残留点完成审计并做必要收敛。
2. MRP 三阶段提示抽象为更统一的组件或模板函数。
3. 对 BOM P2 是否可正式封板给出明确结论与依据。
4. 前端类型检查与后端测试通过。
5. 完成后更新 `walkthrough.md`。

### 25. watchdog Rust 构建失败修复计划

日期：2026-04-11  
状态：待批准

#### 25.1 背景

当前 `server/dev-up.ps1` 触发的 `docker compose up -d --build search-engine app nginx_lb watchdog` 被 `watchdog` 镜像构建失败阻断。日志显示：

1. Go app builder 仍在正常推进，真正失败的是 `watchdog builder` 的 `cargo build --release`。
2. Rust 编译器报错为 `unexpected closing delimiter: '}'`。
3. 报错位置集中在 `src/main.rs` 72-83 行附近，属于典型的分支/括号闭合不匹配问题。

#### 25.2 本轮目标

1. 修复 `watchdog/src/main.rs` 中导致编译失败的闭合错误。
2. 先恢复 `cargo build --release` 成功，确认 watchdog 可单独完成构建。
3. 若 watchdog 恢复后 compose 仍阻塞，再判断是否存在下一层问题。

#### 25.3 执行边界

1. 本轮优先只修 Rust watchdog 构建错误，不主动扩展到无关模块。
2. 若问题仅为语法/结构闭合错误，应保持最小修改范围，避免引入行为变化。
3. 验证顺序优先为 watchdog 单体构建，再考虑整条 compose 链。

#### 25.4 实施方案

##### 25.4.1 定位 `src/main.rs` 报错代码块

涉及文件：

- `server/watchdog/src/main.rs`

动作：

1. 读取报错附近代码，确认 `match` / `if` / 闭包或局部块的闭合层级。
2. 判断是否存在误多写 `}`、误早结束分支、或分号位置导致的块结构漂移。
3. 保持最小范围修复。

##### 25.4.2 验证 watchdog 单体构建

涉及命令：

- `cargo build --release`

动作：

1. 在 watchdog 工程目录直接验证编译。
2. 若仍失败，继续按编译器输出逐层修复，直到 watchdog 单体通过。

##### 25.4.3 必要时评估 compose 链后续阻塞

涉及命令：

- `docker compose up -d --build search-engine app nginx_lb watchdog`

动作：

1. 仅在 watchdog 单体恢复后，才评估是否需要再次触发 compose 构建。
2. 若 compose 仍失败，区分是否为新的独立问题，不与本轮根因混淆。

#### 25.5 风险与注意事项

1. **最小修复原则**
   - 若只是括号/块结构问题，不应顺带改动业务逻辑。
2. **链式误判风险**
   - compose 失败日志可能包含并行阶段输出，需区分真正首个失败点与被取消任务。

#### 25.6 完成标准

1. `watchdog/src/main.rs` 的闭合错误被修复。
2. `cargo build --release` 在 watchdog 工程内通过。
3. 如执行 compose 验证，需明确说明是否已恢复或是否存在新的独立阻塞。
4. 完成后更新 `walkthrough.md`。

### 26. 物料档案模块去冗余、清旧代码与 DTO 收敛治理计划

日期：2026-04-11  
状态：待批准

#### 26.1 背景

对物料档案模块的只读审计显示，该模块当前已具备较完整的主链：

1. 前端已有 `schema / contracts / adapters / core-service / maintenance-service` 分层。
2. 后端已有 `routes / handlers / services`，并支持 `GET / POST / PATCH / DELETE / sync`。
3. 模块存在明确的 SDRTS Patch 链与版本控制能力。

但同时也存在以下收口问题：

1. `src/features/material-archive/services/material-service.ts` 已废弃但仍保留在主目录中，属于硬阻断式历史残片。
2. 前端在 options 场景下将轻量 DTO 补齐为完整 `Material`，语义边界偏松。
3. 后端输入层仍直接借用 `models.Material`，响应层则以 `gin.H` 映射为主，DTO 化不够彻底。
4. `version / _v` 双字段兼容壳说明仍有历史字段并行状态。

#### 26.2 本轮目标

1. 清理或隔离物料档案模块中的旧入口、废弃残片与易误用兼容壳。
2. 收敛前端 DTO / adapter / schema 责任边界，降低“轻量对象伪装完整实体”的语义风险。
3. 评估并收敛后端 material 输入输出映射方式，增强契约清晰度与变更可控性。
4. 在不破坏现有主链的前提下，提升物料档案模块的可维护性与可审计性。

#### 26.3 执行边界

1. 本轮不扩展新的物料业务能力，只做结构治理与冗余收口。
2. 若某些兼容壳仍被外部链路依赖，应优先做显式隔离或标记，而不是贸然删除。
3. DTO 收敛应以“不破坏现有前后端契约”为前提，避免一次性重构过大。
4. 如发现后端 struct DTO 化会牵涉大量无关模块，可先做最小必要收敛。

#### 26.4 实施方案

##### 26.4.1 清理旧入口与历史残片

涉及文件：

- `src/features/material-archive/services/material-service.ts`
- 如存在：`src/features/material-archive/services/material-service.ts.txt`
- `src/features/material-archive/index.tsx`
- 相关 import 使用点

动作：

1. 检查废弃服务入口是否仍被任何现役模块引用。
2. 若无引用，评估将其迁出主链、删除备份残片或改为更明确的迁移占位。
3. 避免保留会在运行时直接抛错但又容易被误 import 的主目录导出入口。

##### 26.4.2 收敛前端 DTO / adapter / schema 语义边界

涉及文件：

- `src/features/material-archive/contracts/material-api-dto.ts`
- `src/features/material-archive/adapters/material-api-adapter.ts`
- `src/features/material-archive/data/schema.ts`
- `src/features/material-archive/services/material-core-service.ts`

动作：

1. 审视 options 场景是否需要独立轻量类型，而不是统一映射为完整 `Material`。
2. 收敛默认填充值与兼容补齐逻辑，减少伪造完整实体的风险。
3. 明确哪些字段属于 API DTO、哪些字段属于前端领域对象、哪些字段只用于表单/列表展示。

##### 26.4.3 评估后端输入输出 DTO 收敛

涉及文件：

- `server/handlers/materials.go`
- `server/handlers/material_patch_handler.go`
- `server/handlers/material_response_helpers.go`
- `server/services/warehouse_master_service.go`

动作：

1. 评估 `SaveMaterialInput models.Material` 这类直接复用 model 的输入方式是否可最小替换为更清晰的输入 struct。
2. 评估 `gin.H` 响应映射是否需要逐步收敛为显式 response struct。
3. 收敛 `version / _v` 双字段兼容策略，明确保留原因或去留方案。

##### 26.4.4 验证与记录

涉及文件：

- `walkthrough.md`

涉及验证：

- 前端类型检查
- 物料相关前后端测试或最小回归验证

动作：

1. 验证物料档案主链查询、保存、Patch、删除、导入不被治理破坏。
2. 在 `walkthrough.md` 记录本轮实际收敛项、保留兼容项及理由。

#### 26.5 风险与注意事项

1. **误删兼容入口风险**
   - 某些废弃文件虽看似未使用，但可能被低频入口或脚本动态引用，删除前必须先确认真实引用情况。
2. **过度收敛风险**
   - 若一次性同时改动前端类型层与后端返回契约，容易把结构治理做成大重构。
3. **语义收缩风险**
   - options 轻量对象与完整 material 的边界收紧后，可能暴露现有 UI 对默认值的隐性依赖。

#### 26.6 完成标准

1. 物料档案模块旧/废弃入口与历史残片完成审查，并完成必要清理或隔离。
2. 前端 DTO / adapter / schema 至少完成一轮职责收敛，降低显著语义混用点。
3. 后端输入输出映射的主要冗余点形成明确治理结果：已收敛、暂保留、或延后处理。
4. 完成必要验证，并在 `walkthrough.md` 记录本轮治理结果。