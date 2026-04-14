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

1. 快捷入口点击后直接拉起系统媒体采集
2. 成功后仅桥接本次新建媒体到编辑器
3. `/personal-workbench/capture` 改为更纯粹的新建采集页
4. 历史草稿查看 / 排序 / 清理能力继续只保留在 `个人缓冲区` 页面，不再出现在新建采集链路

