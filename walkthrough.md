# 变更记录与验证（walkthrough.md）

## 2026-04-12 - purchase 模块方向 A 第一轮拆分

### 本轮目标

按已批准方案，先对采购单主链 UI 容器做低风险收口：

1. 拆分 `PurchaseOrderList`，降低列表页容器对筛选、详情展示和字典加载的集中堆叠。
2. 拆分 `PurchaseOrderActionDialog`，降低弹窗壳对元数据加载、布局壳和保存接线的集中堆叠。
3. 保持 `purchase-service`、`purchase-transaction-service`、DTO 与后端接口语义不变。

### 实际变更

#### 1. `PurchaseOrderList` 收口

主文件：

- `src/features/trading/components/purchase/purchase-order-list.tsx`

新增拆分文件：

- `src/features/trading/components/purchase/purchase-order-list-toolbar.tsx`
- `src/features/trading/components/purchase/purchase-order-detail-sheet.tsx`
- `src/features/trading/hooks/use-purchase-order-filter-options.ts`

本轮将以下职责从主列表容器中拆出：

1. 搜索框、状态筛选、支付方式筛选、账期筛选、新建按钮的展示与交互壳，收口到 `purchase-order-list-toolbar.tsx`。
2. 采购单详情 `Sheet` 的展示壳，收口到 `purchase-order-detail-sheet.tsx`。
3. 支付方式 / 账期筛选项的异步加载与 options 归并逻辑，收口到 `use-purchase-order-filter-options.ts`。

拆分后，`PurchaseOrderList` 仍保留：

1. 路由 search state / detailId 联动。
2. 分页状态与列表数据查询。
3. 过滤后的订单集合计算。
4. 新建 / 编辑 / 删除 / 打开详情等主容器协调逻辑。

#### 2. `PurchaseOrderActionDialog` 收口

主文件：

- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

新增拆分文件：

- `src/features/trading/components/purchase/purchase-order-action-dialog-shell.tsx`
- `src/features/trading/hooks/use-purchase-order-dialog-resources.ts`

本轮将以下职责从弹窗主文件中拆出：

1. Dialog 顶部标题区、底部汇总区、同步 loading 遮罩等纯壳层布局，收口到 `purchase-order-action-dialog-shell.tsx`。
2. 物料与单位元数据的异步加载逻辑，收口到 `use-purchase-order-dialog-resources.ts`。

拆分后，`PurchaseOrderActionDialog` 仍保留：

1. 供应商查询与订单详情查询接线。
2. `usePurchaseOrderForm` 表单状态接线。
3. create / save mutation 的保存协调逻辑。
4. Header / Lines 两个编辑部件的组合。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/components/purchase/purchase-order-list.tsx src/features/trading/components/purchase/purchase-order-list-toolbar.tsx src/features/trading/components/purchase/purchase-order-detail-sheet.tsx src/features/trading/components/purchase/purchase-order-action-dialog.tsx src/features/trading/components/purchase/purchase-order-action-dialog-shell.tsx src/features/trading/hooks/use-purchase-order-filter-options.ts src/features/trading/hooks/use-purchase-order-dialog-resources.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 本轮边界控制

本轮刻意未做：

1. 不改 `usePurchaseOrderForm` 内部状态模型。
2. 不改 `usePurchaseOrderMutations` 的 mutation 语义。
3. 不改 `purchase-transaction-service.ts` 的 intent 边界。
4. 不改 `features/purchase` 与 `features/trading` 的宿主目录归属。

### 当前结果判断

本轮已完成方向 A 的第一阶段目标：

1. 列表容器已不再直接承载筛选项异步来源与详情 Sheet 布局壳。
2. 编辑弹窗已不再直接承载所有元数据加载与完整 Dialog 结构壳。
3. 采购单主链的 UI 组织边界更清晰，为下一轮继续收口 `usePurchaseOrderForm` 与 transaction intent 分层创造了更低风险的入口。

### 建议下一步

若继续推进 purchase 第二阶段，建议优先：

1. 拆分 `usePurchaseOrderForm` 中“头部字段 / 行编辑 / 金额汇总 / 校验 / commit”几类职责。
2. 评估 `usePurchaseOrderMutations` 是否按 create / save / receive / delete 分组收口。
3. 视 intent 复杂度，评估 `purchase-transaction-service.ts` 是否按 header / line / workflow 进一步分组。

## 2026-04-12 - purchase 模块第二阶段第一轮收口

### 本轮目标

在不改后端接口语义、不改 DTO / adapter 契约的前提下，继续降低采购单编辑主链的前端复杂度：

1. 先对 `usePurchaseOrderForm` 做纯逻辑外提。
2. 再对 `usePurchaseOrderMutations` 做重复成功处理与缓存失效逻辑收口。
3. `purchase-transaction-service.ts` 本轮只评估，不强行拆分。

### 实际变更

#### 1. `usePurchaseOrderForm` 收口

主文件：

- `src/features/trading/hooks/use-purchase-order-form.ts`

新增文件：

- `src/features/trading/hooks/purchase-order-form-defaults.ts`
- `src/features/trading/hooks/purchase-order-form-helpers.ts`

本轮已外提的职责包括：

1. 默认空采购单与空行定义，收口到 `purchase-order-form-defaults.ts`。
2. 新建采购单草稿初始化逻辑，收口到 `createNewPurchaseOrderDraft()`。
3. 行新增 / 行删除 / 行更新后的重算逻辑，收口到独立 helper。
4. 表单校验逻辑，收口到 `validatePurchaseOrderForm()`。

拆分后，`usePurchaseOrderForm` 仍保留：

1. 与 `useDeltaTracker` 的状态接线。
2. 头部字段异步汇率加载。
3. 对外暴露的 `handleHeaderChange / handleAddLine / handleRemoveLine / updateLine / validate / commit` API。

#### 2. `usePurchaseOrderMutations` 收口

主文件：

- `src/features/trading/purchase/hooks/use-purchase-orders.ts`

本轮已收口的职责包括：

1. 抽出统一的 `invalidatePurchaseOrderQueries()`。
2. 抽出统一的保存成功、删除成功、确认收货成功处理函数。
3. 保持各 mutation 对外名称与调用方式不变，仅减少内部重复 `toast + invalidateQueries` 逻辑。

### 本轮刻意未做

1. 未修改 `purchase-transaction-service.ts` 的 intent 定义与请求结构。
2. 未调整 `PurchaseOrderActionDialog` 与其它调用方的外部 API。
3. 未把 mutation 正式拆成多个 hook，当前先做内部收口，避免破坏面过大。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/hooks/purchase-order-form-defaults.ts src/features/trading/hooks/purchase-order-form-helpers.ts src/features/trading/purchase/hooks/use-purchase-orders.ts src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

本轮已完成 purchase 第二阶段的第一轮低风险收口：

1. `usePurchaseOrderForm` 已从“把所有默认值与行编辑逻辑直接堆在 hook 内部”转为“hook 接线 + 纯逻辑 helper”结构。
2. `usePurchaseOrderMutations` 已先消除了大段重复成功处理逻辑，为后续按写操作类型进一步分组提供了更低风险的起点。
3. `purchase-transaction-service.ts` 当前仍保持稳定，暂不贸然拆分。

### 建议下一步

若继续推进 purchase 第二阶段，建议优先：

1. 进一步评估 `usePurchaseOrderForm` 是否值得把头部字段更新与汇率加载再拆成局部 helper / hook。
2. 评估 `usePurchaseOrderMutations` 是否按 create-save / line-edit / workflow 三组进一步收口。
3. 当 transaction intent 已形成明确边界后，再决定是否拆 `purchase-transaction-service.ts`。

## 2026-04-12 - purchase 模块第二阶段方案 2：mutation 分组收口

### 本轮目标

在保持现有调用方式兼容的前提下，对 `usePurchaseOrderMutations` 做进一步内部结构收口：

1. 按 `create-save`
2. 按 `line-edit`
3. 按 `workflow`

形成更明确的写操作分组，为后续进一步独立 hook 化做准备。

### 实际变更

主文件：

- `src/features/trading/purchase/hooks/use-purchase-orders.ts`

本轮在 hook 内部新增三组结构：

1. `createSaveMutations`
   - `createMutation`
   - `saveMutation`
   - `patchMutation`
   - `deleteMutation`

2. `lineEditMutations`
   - `lineAddMutation`
   - `lineRemoveMutation`
   - `lineContentChangeMutation`

3. `workflowMutations`
   - `supplierChangeMutation`
   - `expectedDateChangeMutation`
   - `confirmReceiptMutation`

同时为了避免影响现有调用方，本轮仍继续保留原来的扁平导出字段，并额外返回上述三个分组对象。

### 本轮收益

1. 采购单写操作已不再只有“一个平铺大对象”，而是开始显式出现三类职责边界。
2. 现有组件仍可继续按旧字段读取，不需要同步大面积改调用方。
3. 后续若继续推进，可以基于这三组逐步拆成更细的专用 hook，而不是再从平铺状态重新整理。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/purchase/hooks/use-purchase-orders.ts src/features/trading/components/purchase/purchase-order-list.tsx src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

至此，purchase 第二阶段已完成两层低风险收口：

1. `usePurchaseOrderForm` 的纯逻辑外提。
2. `usePurchaseOrderMutations` 的统一成功处理与 mutation 分组收口。

当前 `purchase-transaction-service.ts` 仍保持稳定边界，暂不继续拆分更稳妥。

## 2026-04-12 - purchase 模块第二阶段补充：`usePurchaseOrderForm` 头部字段 / 汇率加载收口

### 本轮目标

继续收口 `usePurchaseOrderForm`，把头部字段更新与汇率解析逻辑从 hook 主体中拆开，同时保持外部 API 不变。

### 实际变更

主文件：

- `src/features/trading/hooks/use-purchase-order-form.ts`

新增文件：

- `src/features/trading/hooks/purchase-order-form-header-helpers.ts`

本轮新增并下沉的职责包括：

1. `normalizePurchaseOrderCurrencyValue()`
   - 统一 currency 字段输入值转为标准字符串。

2. `resolvePurchaseOrderExchangeRate()`
   - 统一根据货币字典解析汇率，并支持 fallback rate。

3. `buildPurchaseOrderHeaderPatch()`
   - 统一构造普通头部字段 patch。

4. `buildPurchaseOrderCurrencyPatch()`
   - 统一构造 currency / exchangeRate patch。

调整后，`usePurchaseOrderForm` 中的 `handleHeaderChange` 已不再直接承担具体 patch 结构拼装与汇率匹配细节，而是转为：

1. 识别字段类型
2. 拉取 currency metadata
3. 调用 header helper 生成 patch
4. 写回 `useDeltaTracker` 状态

同时，新建采购单初始化时默认汇率解析逻辑也改为复用 `resolvePurchaseOrderExchangeRate()`，避免同类逻辑继续在 hook 内重复展开。

### 本轮收益

1. `usePurchaseOrderForm` 的头部字段处理职责进一步变薄。
2. 普通字段 patch 与货币字段 patch 已形成明确分支，后续若继续拆 header 相关逻辑，路径更清晰。
3. 汇率解析逻辑已具备可复用 helper，减少新建初始化与字段更新两处重复实现。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/hooks/purchase-order-form-defaults.ts src/features/trading/hooks/purchase-order-form-helpers.ts src/features/trading/hooks/purchase-order-form-header-helpers.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，`usePurchaseOrderForm` 已从“单文件内直接承担默认值、行编辑、校验、头部 patch、汇率解析”进一步收口为：

1. hook 负责状态接线与异步协调
2. helper 负责默认值、行编辑、校验与头部 patch 纯逻辑

这已经把采购单编辑 hook 的结构明显拉开，为后续若要继续拆 header 专用 hook 或 commit 前整理逻辑提供了更稳的基础。

## 2026-04-12 - purchase 模块第二阶段补充：`commit` 前数据整形收口

### 本轮目标

继续收口 `usePurchaseOrderForm`，把提交前数据整形从保存弹窗链路中抽离出来，形成明确的提交前整理 helper。

### 实际变更

新增文件：

- `src/features/trading/hooks/purchase-order-form-submit-helpers.ts`

调整文件：

- `src/features/trading/hooks/use-purchase-order-form.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

本轮新增并下沉的职责包括：

1. `preparePurchaseOrderForSubmit()`
   - 统一在提交前对采购单头部与行项目做最小整形。

2. 行项目整形规则
   - 统一重排 `lineNo`
   - 统一将数量 / 金额字段转为 number
   - 对 `materialName / materialCode / specification / uom / note` 做 trim

3. 头部字段整形规则
   - 对 `supplierId / supplierName / purchaser / paymentMethod / paymentMethodName / paymentTerm / paymentTermName / note / currency` 做 trim 或默认值回填
   - 对 `amount / exchangeRate` 做 number 化

同时，`usePurchaseOrderForm` 现已对外提供 `prepareSubmitData()`，由 `PurchaseOrderActionDialog` 在保存时统一调用：

1. 编辑采购单时，`saveMutation` 使用整理后的 `finalData`
2. 新建采购单时，`createMutation` 也统一使用整理后的提交数据

这意味着提交前整理逻辑已不再散落在弹窗保存链，而是正式进入 form hook 的职责边界内。

### 本轮收益

1. 提交前数据整形已有明确单点，不再依赖调用方各自兜底。
2. 新建与编辑两条保存链路现在共享同一套提交前整理规则。
3. 后续若继续补充空值策略、字段裁剪或提交前防腐逻辑，可直接扩展 submit helper，而不必回到弹窗组件中继续堆逻辑。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/hooks/purchase-order-form-defaults.ts src/features/trading/hooks/purchase-order-form-helpers.ts src/features/trading/hooks/purchase-order-form-header-helpers.ts src/features/trading/hooks/purchase-order-form-submit-helpers.ts src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到目前为止，`usePurchaseOrderForm` 已形成三层相对清晰的结构：

1. hook 主体：状态接线、异步协调、对外 API
2. 局部 helper：默认值、行编辑、头部 patch、校验
3. submit helper：提交前数据整形

这已经把采购单编辑主链最重的前端 form 层进一步拉开，后续若继续推进，重点就不再是“是否还要拆纯逻辑”，而是是否值得把 `commit` / delta 提交语义进一步和保存协调层解耦。
