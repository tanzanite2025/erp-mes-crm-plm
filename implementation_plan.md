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

