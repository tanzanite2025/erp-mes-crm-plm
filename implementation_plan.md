### 1. plan：production-shared 机器码字段统一收口

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

