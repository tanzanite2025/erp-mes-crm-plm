# 变更记录与验证（walkthrough.md）

## 2026-04-14 侧边栏独立“物流”分类与物流配置中心多 TAB

- **变更概述**
  - 新增独立模块 `src/features/logistics-config`，以多 TAB 形式承载“物流供应商 / 扫描配置 / 接口平台”。
  - 新增 `src/routes/_authenticated/logistics-config/*` 路由骨架，并将默认入口重定向到 `/logistics-config/suppliers`。
  - 在 `src/components/layout/data/sidebar-data.ts` 的“系统配置”组中新增独立“物流”入口，路径为 `/logistics-config`。
  - 在 `src/features/authz/data/permission-catalog.ts` 中将 `/logistics-config` 归入现有 `settings` 菜单权限口径，避免未映射顶级路径报错。
  - 新增 `zh-CN / en-US` 的 `logisticsConfig` locale，并补齐侧边栏“物流”文案。

- **架构收口结果**
  - 物流配置型信息从原先散落于 `terminal-config/scanners`、`scan-platform`、`sandbox/logistics-api` 的状态，收口到独立“物流”模块入口。
  - 新模块明确定位为“集合信息与扫描配置中心”，未改动现有 `/purchase/logistics` 与 `/trading/logistics` 业务流。
  - `扫描配置` TAB 直接复用 `ScanPlatformModulePanel`，避免再造第二套扫码模组展示。
  - `接口/平台` TAB 复用现有 logistics provider 后端服务能力，避免配置语义再次分叉。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 装载示意图被截断修复

- **问题现象**
  - 弹窗内装载示意图在行数/层数较多时出现内容被裁切（底部箱体/信息被截断）。

- **原因定位**
  - `VehicleLoadingDiagram` 内部存在多处 `overflow-hidden` 与固定高度容器，导致内容超出时直接被裁剪且无法滚动查看。

- **修复方式**
  - 在 `src/features/logistics-config/vehicle-loading/components/vehicle-loading-diagram.tsx` 中：
    - 将示意图主容器与层容器从 `overflow-hidden` 调整为 `overflow-auto`，允许内容超出时在示意图区域内滚动。
    - 桌面端高度由 `h-[22rem]` 提升为 `sm:h-[26rem]`，减少在常见分辨率下的裁切概率。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 产品属性历史重复机器值治理（P2）

- **变更概述**
  - 在 `server/db/db.go` 增加启动期产品属性历史脏数据自愈：扫描 `product_attribute_options` 中同一分类下归一后等价的重复机器值，保留 canonical 记录、删除重复记录，并同步迁移 `product_attribute_values.option_value` 的历史引用。
  - 在 `server/db/db.go` 增加 `product_attribute_options(category, LOWER(value))` 唯一索引，补数据库级防复发约束。
  - 在 `server/services/product_service_types.go` 收口产品保存链，对 `attributeValues.categoryKey / optionValue` 做归一化，阻断新脏值写入。
  - 在 `src/features/engineering/adapters/product-api-adapter.ts` 与 `src/features/engineering/utils/product-code-normalization.ts` 收口前端读取/提交链，对产品属性值统一使用机器值归一化口径。
  - 在 `server/services/product_master_service_test.go` 新增定向测试，验证重复 option 清理会同步迁移历史产品属性引用。

- **架构收口结果**
  - 产品属性配置页仍然是全局属性字典页，未引入模板绑定语义漂移。
  - 历史重复项治理不再只停留在展示层去重，而是回到数据库与保存链统一收口。
  - 产品属性值与属性选项机器值口径已统一，避免旧大小写值继续在前后端之间回流。
  - 这一轮只完成 P2 数据治理与防复发，模板与产品属性接线方案仍保留为下一阶段独立工作。

- **验证结果**
  - `go test ./services -run "Product|Attribute"`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模板可预览装配器与“模板 -> 产品类型 -> 属性绑定”接线落地

- **变更概述**
  - 新增后端模型 `server/models/product_template_attribute_binding.go`，并在 `server/models/product_template.go` 中为 `ProductTemplate` 增加 `attributeBindings` 关联，支持模板保存“装配了哪些全局属性分类”。
  - 在 `server/services/product_master_service.go` 中为模板查询增加 `AttributeBindings` 预加载，并在模板保存时同步持久化模板属性装配结构；在 `server/db/db.go` 中补 `AutoMigrate`。
  - 在 `server/services/product_template_defaults_test.go` 新增定向测试，验证模板保存会携带并读回属性装配结构。
  - 在前端 `src/features/engineering/data/schema.ts`、`contracts/product-template-api-dto.ts`、`adapters/product-template-api-adapter.ts`、`utils/product-code-normalization.ts`、`utils/default-builders.ts` 中补齐模板属性装配结构的契约、归一化与默认值。
  - 在 `src/features/engineering/services/product-template-service.ts` 将模板编辑态保存收口为整棵模板对象全量保存，以便稳定承载 `attributeBindings`。
  - 在 `src/features/engineering/tabs/template-mgmt.tsx` 中把模板弹窗升级为“左侧配置 + 右侧预览”形态：
    - 可从全局产品属性分类中选择接入模板
    - 可移除装配项
    - 可切换 `required`
    - 可实时查看模板规格组件与已装配属性分类预览
  - 在 `src/features/engineering/components/product-type-action-dialog.tsx` 与 `tabs/product-types-mgmt.tsx` 中加入模板装配摘要、类型绑定偏离提示，以及“保存后按模板同步属性绑定”的显式开关。
  - 在 `src/features/engineering/components/product-action-dialog.tsx` 中补充产品编辑弹窗只读提示，显式说明当前动态属性区对应模板来源，以及类型绑定是否未同步模板装配或已偏离模板定义。

- **架构收口结果**
  - 产品属性配置页继续是全局属性素材库，只维护标准分类与选项。
  - 模板页不再是黑盒记录，而是“模板结构编辑器 + 属性装配器 + 基础预览器”。
  - 产品类型页继续作为运行时最终生效层，模板装配不会静默覆盖类型绑定，必须通过显式同步动作落地。
  - 产品编辑页继续只消费产品类型最终绑定；模板只作为来源说明与一致性提示，不直接改写产品保存链。

- **验证结果**
  - `go test ./services -run "Template"`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模板编辑弹窗桌面端宽度与布局修正

- **变更概述**
  - 在 `src/features/engineering/tabs/template-mgmt.tsx` 中放大模板编辑弹窗桌面端容器宽度，改为 `max-w-[1500px]`，避免大屏下仍呈现窄竖条弹层。
  - 将弹窗主体重排为更明确的横向编辑器布局：左侧保留模板基础信息，右侧承载属性装配区与模板预览区。
  - 将属性装配区卡片改为更适合桌面端的双列展示，减轻长列表纵向堆叠造成的拥挤感。
  - 优化 footer 在小屏与桌面端的按钮排列，保持移动端兜底不被破坏。

- **架构收口结果**
  - 本轮仅调整模板编辑弹窗布局与尺寸，不改模板装配、保存、删除等业务语义。
  - 桌面端模板弹窗从“窄列长条”调整为“横向编辑器”，基础信息、属性装配与预览区可同时获得可读空间。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模板弹窗布局/内容解耦与固定三列重构

- **变更概述**
  - 新增 `src/features/engineering/components/template-mgmt/template-editor-dialog-layout.tsx`，专门负责模板编辑弹窗的 `DialogContent` 容器、固定三列比例与各列滚动布局。
  - 新增 `src/features/engineering/components/template-mgmt/template-editor-dialog.tsx`，承载模板编辑弹窗的基础信息列、属性装配列、预览列与底部操作区内容。
  - 在 `src/features/engineering/tabs/template-mgmt.tsx` 中移除大段弹窗 DOM，仅保留数据查询、状态、保存和事件编排，并改为挂载 `TemplateEditorDialog`。
  - 桌面端模板弹窗固定为 `80vw` 宽度，三列固定为 `26% / 44% / 30%`，各列独立滚动，避免属性增加时整体布局抖动。
  - 预览列中容易被裁切的文案改为可换行展示，减少右侧内容显示不完整的问题。

- **架构收口结果**
  - 模板弹窗的“布局/样式”与“内容/交互”已完成职责拆分，后续再调尺寸、滚动或列比例时无需继续在 `template-mgmt.tsx` 上反复打补丁。
  - `template-mgmt.tsx` 恢复为页面编排层，模板弹窗内部结构成为可独立维护的组件边界。
  - 本轮未修改模板装配的数据模型与保存语义，仅对前端结构与展示稳定性做了收口。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模板弹窗内部信息架构与三列内容重排

- **变更概述**
  - 在 `src/features/engineering/components/template-mgmt/template-editor-dialog.tsx` 中重排三列内部内容结构，不再只是把原有表单和预览块横向摆开。
  - 左列新增模板身份摘要区，将模板名称、编码、物理组件、描述做成更清晰的“模板是什么”信息卡，再将可编辑基础字段集中收口到下方基础信息编辑区。
  - 中列拆分为“装配操作区”和“已装配列表区”，将选择属性分类与新增操作从结果列表中分离出来，降低信息混杂感。
  - 右列拆分为“模板预览摘要”和“已装配属性预览”，让用户能更直观看到模板组件、描述与装配结果的最终呈现。
  - 各区块统一了标题层级、摘要标签、分隔边界与间距结构，提升模板弹窗作为编辑器的整体可读性。

- **架构收口结果**
  - 模板弹窗当前不仅完成了布局/内容拆分，也完成了三列内部信息架构收口。
  - 左列负责模板身份与基础信息编辑，中列负责装配动作与装配结果，右列负责最终预览，职责边界更稳定。
  - 本轮仍未改动模板数据模型与保存语义，只对前端呈现结构进行重排与优化。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模板主页预置模板禁止删除

- **变更概述**
  - 在 `src/features/engineering/tabs/template-mgmt.tsx` 中引入 `DEFAULT_PRODUCT_TEMPLATES`，以预置模板 `code` 集合作为系统模板识别依据。
  - 模板主页卡片遍历时对预置模板进行识别，并将其删除按钮改为禁用态，不再允许直接触发删除。
  - 普通自定义模板保持原有删除逻辑不变，仍可走既有确认与删除流程。
  - 为预置模板删除按钮补充不可删提示文案，降低误操作预期。

- **架构收口结果**
  - 模板主页已经在页面层明确区分“系统预置模板”和“普通模板”的删除能力。
  - 三个系统预置模板不再暴露可执行的删除入口，避免用户误以为系统模板可被随意移除。
  - 本轮未改动模板保存、编辑与创建语义，仅在主页卡片层增加删除保护。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 模板弹窗滚动策略收口（桌面端仅列内滚动）

- **变更概述**
  - 目标：不改变弹窗总高度的前提下，避免轻内容场景出现无意义的整体垂直滚动条。
  - 在 `src/features/engineering/components/template-mgmt/template-editor-dialog-layout.tsx` 中调整主体滚动策略：
    - 移动端：主体容器保留 `overflow-y-auto`，避免内容被截断。
    - 桌面端（lg+）：主体容器改为 `overflow-hidden`，三列区域 `h-full` 占满中间固定高度，仅各列容器 `overflow-y-auto` 独立滚动。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 物流模块新增“装载/配车”TAB（MOCK）

- **变更概述**
  - 在物流配置模块新增与“物流供应商”同级的 TAB：`/logistics-config/vehicle-loading`。
  - 新增 TAB 页面 `LogisticsVehicleLoadingTab`：
    - 出货汇总（箱数/体积/重量）先以可编辑示例数据占位。
    - 车型规格库先以前端常量 `MOCK_VEHICLE_SPECS` 提供，支持简单筛选。
    - 推荐结果先以 `mockRecommendVehicles()` 输出占位（按体积/重量估算需要车辆数，并输出 mock reason）。
  - 补齐中英文 i18n 文案：新增 `logisticsConfig.tabs.vehicleLoading` 与 `logisticsConfig.vehicleLoading.*`。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 物流装载示意弹窗按钮无响应修复

- **问题现象**
  - 在 `/logistics-config/vehicle-loading` 页面点击“查看装载示意”按钮无反应。

- **原因定位**
  - 页面组件未挂载 `VehicleLoadingPlanDialog`，且未将 `onViewDiagram` 回调传递给 `VehicleLoadingHeader` / `VehicleRecommendationPanel`，导致点击后没有任何可打开的弹窗实例。

- **修复方式**
  - 在 `src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx` 中补齐弹窗 `open` 状态与 `VehicleLoadingPlanDialog` 渲染。
  - 将 `onViewDiagram` 回调传给 `VehicleLoadingHeader` 与 `VehicleRecommendationPanel`，确保点击可打开弹窗。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 装载示意弹窗可读性修复（限制高度 + 内容滚动）

- **问题现象**
  - 装载示意弹窗在部分屏幕尺寸下上下溢出视口，导致内容不可读。

- **修复方式**
  - 在 `src/features/logistics-config/vehicle-loading/components/vehicle-loading-plan-dialog.tsx` 中重构弹窗容器布局：
    - `DialogContent` 增加 `max-h-[calc(100vh-2rem)]`，保证弹窗不超过视口。
    - 头部与底部改为 `shrink-0` 固定区。
    - 中间主体改为 `flex-1 min-h-0 overflow-y-auto`，确保内容过长时在弹窗内部滚动。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 装载示意弹窗桌面端加宽（提升示意图可读性）

- **问题现象**
  - 桌面端弹窗宽度偏窄，示意图区域压缩，导致信息密度过高、难以阅读。

- **修复方式**
  - 在 `src/features/logistics-config/vehicle-loading/components/vehicle-loading-plan-dialog.tsx` 中调整弹窗宽度与两列比例：
    - `DialogContent` 改为 `w-[calc(100vw-2rem)] max-w-[1200px]`，在不超出视口的前提下尽可能加宽。
    - 两列比例从 `lg:grid-cols-[1.4fr_1fr]` 调整为 `lg:grid-cols-[1.85fr_1fr]`，优先保证左侧示意图区域宽度。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 订单列表卡片挂载独立包装预览摘要

- **变更概述**
  - 新增 `src/features/trading/components/parts/sales-order-packaging-summary-inline.tsx`，作为订单列表场景使用的轻量包装摘要组件。
  - 在 `src/features/trading/components/sales-order-master.tsx` 的数量区块下方挂载 `SalesOrderPackagingSummaryInline`。
  - 继续复用既有 `use-sales-order-packaging-preview.ts`，未新增第二套包装计算或聚合逻辑。
  - 在 `src/locales/messages/zh-CN/tradingSalesOrder.ts` 与 `src/locales/messages/en-US/tradingSalesOrder.ts` 中补充列表摘要 loading / error 文案。

- **架构收口结果**
  - 订单列表卡片当前只展示包装轻量摘要，包括总箱数、总体积、总毛重与告警数。
  - 列表页不复刻详情页完整展开内容，详细箱规组合与逐行拆分仍由详情页独立卡片承载。
  - 订单列表与订单详情继续共用同一包装消费层，避免后续出现双轨逻辑漂移。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/logistics-config src/routes/_authenticated/logistics-config src/components/layout/data/sidebar-data.ts src/features/authz/data/permission-catalog.ts src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/index.ts src/locales/messages/en-US/index.ts`：通过。

## 2026-04-14 产品档案列定义纯化：删除动作上浮至管理 Hook

- **变更概述**
  - 将 `src/features/engineering/hooks/use-product-columns.tsx` 中操作列内嵌的删除编排移除，列定义改为仅通过 `onDelete(product)` 转发事件。
  - 在 `src/features/engineering/hooks/use-product-mgmt.ts` 新增统一删除入口 `handleDeleteProduct`，由管理 Hook 统一承接删除确认、调用 `deleteProduct` mutation、成功/失败 toast 与错误日志。
  - 在 `src/features/engineering/tabs/product-parts-mgmt.tsx` 中将 `handleDeleteProduct` 注入 `useProductColumns(...)`，同时去掉 `t as any` 强转。

- **架构收口结果**
  - `use-product-columns.tsx` 不再直接依赖 `useProductWriteActions`。
  - `use-product-columns.tsx` 不再直接依赖 `sonner/toast`。
  - 删除副作用从渲染列定义上浮到管理 Hook，恢复“UI 渲染 + 事件转发”的单一职责边界。
  - 底层 `useProductWriteActions` 的删除 mutation 与 query invalidate 语义保持不变，仅上移 orchestration。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/engineering/hooks/use-product-columns.tsx src/features/engineering/hooks/use-product-mgmt.ts src/features/engineering/tabs/product-parts-mgmt.tsx`：通过，存在 1 条既有 `react-hooks`/`useReactTable()` 警告（`product-parts-mgmt.tsx`），本轮未新增阻塞错误。

## 2026-04-14 模具组名聚合下沉到后端接口

- **变更概述**
  - 在 `server/handlers/molds.go` 新增 `GetMoldGroupNamesHandler`，由后端直接执行模具组名聚合查询。
  - 在 `server/routes/routes_equipment.go` 注册 `GET /molds/group-names` 只读接口。
  - 在 `src/features/equipment-tooling/services/mold-core-service.ts` 将 `getGroupNames()` 从“全量拉模具 + 前端内存去重”切换为直接请求 `/molds/group-names`。
  - 保持 `AssetService.getGroupNames()` 的对外消费契约不变，上层调用点无需改签名。

- **架构收口结果**
  - 模具组名聚合 authority 已回到后端，不再依赖前端全量加载模具列表。
  - 新接口仅返回去重后的 `string[]`，避免为简单聚合引入重 DTO。
  - 后端查询已对 `group_name` 执行 `TRIM`、空值过滤、去重与稳定排序。
  - `mold-action-dialog.tsx` 与 `use-product-form-init.ts` 继续复用既有 `AssetService.getGroupNames()`，消费层无额外扩散修改。

- **验证结果**
  - `go test ./handlers ./routes -run Mold`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-14 模具弹窗读取链切换到 React Query

- **变更概述**
  - 新增 `src/features/equipment-tooling/hooks/use-mold-groups-query.ts`，将模具组名读取收口到 React Query。
  - 新增 `src/features/equipment-tooling/hooks/use-mold-drawings-query.ts`，将按模具 SN 读取关联图纸收口到 React Query。
  - 改造 `src/features/equipment-tooling/components/mold-action-dialog.tsx`，移除 `useEffect` 中的手动远端读取与 `groupNames / linkedDrawings` 本地 state，改为直接消费 query 结果。
  - 保留 `useEffect` 仅负责本地 `form.reset(...) / tracker.reset(...)`，不再承担服务端读链。

- **架构收口结果**
  - `groupNames` 与 `linkedDrawings` 的服务端真相已归属于 React Query。
  - 新建态不再手工拼 `Promise.resolve([])`，drawings 查询由 `enabled: open && !!moldSn` 统一裁决。
  - `mold-action-dialog.tsx` 当前仅保留 `isAddingNewGroup` 作为本地 UI 状态，远端数据不再落本地副本 state。
  - 关闭弹窗的程序化路径（取消 / 保存后关闭 / 无变更关闭）已统一复用同一关闭边界，确保 `isAddingNewGroup` 状态一致重置。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/equipment-tooling/components/mold-action-dialog.tsx src/features/equipment-tooling/hooks/use-mold-groups-query.ts src/features/equipment-tooling/hooks/use-mold-drawings-query.ts`：通过，无新增阻塞错误。

## 2026-04-14 linear-barcode 加载失败 fail loudly 与 UI 状态显式化

- **变更概述**
  - 改造 `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`，移除以本地默认 `rules / mockInputs` 先行渲染再由 `useEffect` 用 `protocolConfig` 回填的 masking 结构。
  - 将线性条码页面的可编辑态收口为 `draftConfig`，仅在 React Query 成功返回 `protocolConfig` 后进入 ready UI。
  - 保留“用户主动重置为默认协议”的能力，但不再让 `createDefault...` 充当远端加载 fallback。

- **架构收口结果**
  - `linear-barcode-mgmt.tsx` 已显式区分 loading / error / ready 三态。
  - query 未就绪时不再渲染伪装成可用配置的默认模拟数据。
  - query 失败时由 UI 层显式展示错误状态与 retry，而不是回退到默认配置。
  - 用户编辑态与保存链仍由本地草稿承接，但 authority 起点已回到 React Query。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`：通过。

## 2026-04-14 useSalesOrderInit 水合链迁移到 query authority

- **变更概述**
  - 改造 `src/features/trading/hooks/use-sales-order-init.ts`，移除 `useEffect + setFormData(...)` 异步水合，改为通过 React Query 获取新建态默认条码预览，并派生稳定初始值。
  - 改造 `src/features/trading/hooks/use-sales-order-form.ts`，直接消费 `useSalesOrderInit(...)` 返回的稳定初始值，不再依赖 effect 回填主表单状态。
  - 改造 `src/features/trading/components/sales-order-action-dialog.tsx`，显式显示初始化中的 loading / error 状态，避免打开弹窗时先渲染半成品表单。
  - 在 `src/features/trading/query-keys.ts` 新增销售订单默认条码预览 query key。

- **架构收口结果**
  - 新建态条码预览 authority 已回归 React Query。
  - 销售订单表单初始化不再依赖 `useEffect` 在渲染后异步补写主 state。
  - 弹窗 UI 已显式区分初始化中 / 初始化失败 / 可编辑三态，减少 hydration 与 reset 风险。
  - 现有校验、行编辑、分类切换与保存前正式生成条码语义保持不变。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/trading/hooks/use-sales-order-init.ts src/features/trading/hooks/use-sales-order-form.ts src/features/trading/components/sales-order-action-dialog.tsx src/features/trading/query-keys.ts`：通过。

## 2026-04-14 快捷扫描个人拍照/录视频入口改为当次点击直采

- **变更概述**
  - 改造 `src/features/quick-actions/components/quick-action-drawer.tsx`，将“个人拍照 / 个人录视频”入口从单纯 `navigate(...)` 改为在当前点击手势中直接触发系统媒体采集。
  - 采集成功后，先通过 `useLocalMediaDrafts().saveDraft(...)` 保存本地草稿，再桥接到 `/personal-workbench/capture` 并携带 `draftId + autoEdit + mode`。
  - 改造 `src/routes/_authenticated/personal-workbench/capture.tsx` 与 `capture-route-component.tsx`，支持读取 `draftId / autoEdit` 搜索参数。
  - 改造 `src/features/personal-workbench/capture/index.tsx`，使其只承接“本次新建采集 -> 编辑器”链路，不再消费历史草稿队列。
  - 改造 `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`，当页面已带入 `initialDraftId` 时，不再重复自动拉起相机或录制准备态。

- **架构收口结果**
  - 快捷入口的“直采”动作已绑定在用户当次点击手势中，不再依赖导航后 effect 自动触发。
  - `个人拍照 / 个人录视频` 当前语义已收口为“独立新建入口”，不再读取历史草稿队列。
  - `个人缓冲区` 继续保留为历史草稿查看 / 整理入口，两者产品心智已隔离。
  - 技术层仍允许使用临时本地草稿承接“本次采集 -> 打开编辑器”的桥接，但不会把缓冲区工作台逻辑带入新建入口。
  - `capture` 页当前承担的职责已收口为新建采集壳层，而不是缓冲区中间页。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/quick-actions/components/quick-action-drawer.tsx src/features/personal-workbench/capture/index.tsx src/features/personal-workbench/components/personal-workbench-image-picker.tsx src/routes/_authenticated/personal-workbench/capture.tsx src/routes/_authenticated/personal-workbench/capture-route-component.tsx`：通过。

## 2026-04-14 capture 页面标题/描述收口为新建拍照/录像页

- **变更概述**
  - 调整 `src/features/personal-workbench/capture/index.tsx` 顶部标题与说明文案。
  - 将页面顶部表述从“个人快捷采集 / 一键拍照 / 一键录视频 / 独立新建采集入口”收口为更明确的“独立新建入口 / 新建拍照记录 / 新建录像记录 / 新建拍照页 / 新建录像页”。

- **架构收口结果**
  - `/personal-workbench/capture` 的页面文案已与当前职责边界一致，明确表达其是独立新建采集页。
  - 页面文案不再残留缓冲区或混合采集心智。
  - 本轮仅做标题/描述收口，未改动快捷入口、个人缓冲区页或底层采集逻辑。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/personal-workbench/capture/index.tsx`：通过。

## 2026-04-14 侧边栏方案A：请假管理 / 荣誉榜并回组织人事分组

- **变更概述**
  - 调整 `src/components/layout/data/sidebar-data.ts`。
  - 将 `请假管理`（`/personnel/leave`）与 `荣誉榜`（`/personnel/stats`）从“服务中心”分组并回“组织人事”分组。
  - 同时移除已变空的“服务中心”分组配置。

- **架构收口结果**
  - 侧边栏分组与 `/personnel*` 路由归属重新一致。
  - `组织人事 / 请假管理 / 荣誉榜` 现在同属组织人事域分组，减少了“人事域页面却由服务中心承载”的违和感。
  - 本轮未改动路由结构，也未修改 `checkIsActive(...)` 的底层匹配算法。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/components/layout/data/sidebar-data.ts src/components/layout/app-sidebar.tsx src/components/layout/nav-group.tsx`：通过。

## 2026-04-14 侧边栏分类卡片 / 文字层级色收口

- **变更概述**
  - 调整 `src/components/layout/nav-group.tsx` 中分类容器按钮与分类标题的样式。
  - 为分类容器补充基于 `sidebar-*` token 的独立层级底色、边框和文字层级色。
  - 去掉分类标题对外层按钮文字色的 `text-inherit` 继承，改为使用 `text-sidebar-foreground/78`，让分类层与菜单项层一眼可分。

- **架构收口结果**
  - 分类卡片与具体菜单项的层级已被明确区分。
  - 亮色 / 暗色模式继续通过 sidebar 主题变量体系自动对齐，没有引入脱离主题系统的硬编码颜色。
  - 本轮未改动路由、active 算法、菜单数据结构或整体 sidebar 架构。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/components/layout/nav-group.tsx src/components/layout/app-sidebar.tsx`：通过。
  - `src/components/ui/sidebar.tsx` 在 eslint 中被 ignore，未产生阻塞错误。

## 2026-04-14 物流模块新增包装规则主数据 TAB

- **变更概述**
  - 在 `server/models/packaging_profile.go` 新增 `PackagingProfile / PackagingProfileTarget`，用于承载包装主数据与适用对象范围。
  - 在 `server/handlers/packaging_profiles.go` 与 `server/handlers/packaging_profiles_response_helpers.go` 新增包装主数据读写接口与响应映射。
  - 在 `server/routes/routes.go` 的既有 `/packaging` 分组下新增：
    - `GET /packaging/profiles`
    - `POST /packaging/profiles`
    - `DELETE /packaging/profiles/:id`
  - 在 `server/db/db.go` 中将 `PackagingProfile / PackagingProfileTarget` 纳入 AutoMigrate。
  - 在前端 `src/features/logistics-config` 新增 `packaging-rules-service.ts` 与 `packaging-rules-tab.tsx`。
  - 在 `src/routes/_authenticated/logistics-config` 新增 `packaging-rules.tsx / packaging-rules.lazy.tsx` 路由文件。
  - 在 `src/features/logistics-config/tabs.ts` 中新增 `包装规则` TAB，并在 `zh-CN / en-US` 的 `logisticsConfig.ts` 中补齐文案。

- **架构收口结果**
  - 本轮没有直接复用旧 `packaging_rules` 的“物料包装换算”语义去硬承载新需求，而是新增了面向物流主数据的包装规则模型，避免误伤现有 MRP/换算链路。
  - 物流模块下已形成独立的“包装规则”TAB，作为后续包装预算、出货与物流链路的主数据入口。
  - 单位选择已直接复用系统现有单位引擎（`useUnitsQuery / unitService`）。
  - 适用对象支持动态选择 `产品 / 物料`，前端分别复用 `ProductCoreService.getProducts({ isOptions: true })` 与 `MaterialCoreService.getMaterialOptions()`。
  - 本轮已为后续拼装接入预留 `assemblySource` 字段，但没有凭空新增第二套拼装/BOM 引擎接口。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `go test ./handlers ./routes -run ^$`：通过。

## 2026-04-14 订单侧独立包装预览卡片（详情页首挂载）

- **变更概述**
  - 新增 `src/features/trading/hooks/use-sales-order-packaging-preview.ts`，以 React Query 聚合包装规则与产品基础数据，并复用 `src/features/logistics-config/packaging-calculator.ts` 输出订单侧包装预览视图模型。
  - 新增 `src/features/trading/components/parts/sales-order-packaging-preview-card.tsx`，将包装预览实现为独立卡片，而非塞入销售订单明细表格内部。
  - 在 `src/features/trading/components/sales-order-detail.tsx` 中挂载 `SalesOrderPackagingPreviewCard`，当前先接入订单详情页。
  - 在 `src/locales/messages/zh-CN/tradingSalesOrder.ts` 与 `src/locales/messages/en-US/tradingSalesOrder.ts` 中补充 `packagingPreview` 文案与告警键。
  - 为 `src/locales/messages/en-US/tradingSalesOrder.ts` 补充 `as const`，确保新增翻译键进入严格联合类型。

- **架构收口结果**
  - 包装计算真相继续留在物流域纯函数模块中，订单侧只新增消费层 `hook` 与独立展示卡片。
  - 销售订单详情页当前仅作为挂载方，不拥有包装过滤、箱规拆分或重量体积计算逻辑。
  - 新卡片底部已预留动作扩展位，可供后续接入“缺料提醒 / 指定账号通知 / 微信触达”等并列订单协同动作。
  - 用户面告警已在卡片层做本地化映射，避免直接向界面暴露英文内部 warning 文本；日志侧英文根因仍保留在底层模块。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
