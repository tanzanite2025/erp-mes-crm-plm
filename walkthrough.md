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

## 2026-04-12 - purchase 模块第二阶段补充：保存协调层收口

### 本轮目标

继续推进 `usePurchaseOrderForm` 相关收口，把编辑保存链路中的以下逻辑从 `PurchaseOrderActionDialog` 中抽离：

1. `commit()`
2. 空 delta 判断
3. 版本存在性校验

目标是把 UI 弹窗里的“保存协调语义”降到最薄，只保留 mutation 分发。

### 实际变更

新增文件：

- `src/features/trading/hooks/purchase-order-form-save-helpers.ts`

调整文件：

- `src/features/trading/hooks/use-purchase-order-form.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

本轮新增的保存协调结构：

1. `buildPurchaseOrderSaveExecution()`
   - 根据 `initialOrder + finalData + delta` 统一返回三种结果：
   - `create`
   - `update`
   - `noop`

2. `prepareSaveExecution()`
   - 由 `usePurchaseOrderForm` 对外提供
   - 内部统一串联：
   - 提交前数据整形
   - `commit()`
   - 空 delta 判断
   - 编辑单版本校验

调整后，`PurchaseOrderActionDialog` 的保存逻辑已经由“自己决定 commit / noop / version 校验 / create / update”改为：

1. 调用 `prepareSaveExecution()`
2. 根据返回的 `mode` 分发到 `createMutation` / `saveMutation`
3. `noop` 时直接关闭弹窗

### 本轮收益

1. `PurchaseOrderActionDialog` 不再持有 SDRTS 相关细节判断，UI 侧职责继续变薄。
2. 采购单 form 层现在不只负责字段编辑，还开始承接保存前协调语义。
3. 后续若要继续抽出独立保存协调 hook，当前 helper 已经形成清晰过渡层。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/hooks/purchase-order-form-submit-helpers.ts src/features/trading/hooks/purchase-order-form-save-helpers.ts src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，采购单编辑前端主链已经从“弹窗 UI 直接协调 form、提交整形、delta commit、版本校验、mutation 调用”收口为：

1. `usePurchaseOrderForm` 负责 form 状态与保存准备
2. submit/save helpers 负责整理与协调语义
3. `PurchaseOrderActionDialog` 只负责 UI 呈现与 mutation 分发

这意味着 purchase 第二阶段在前端 form / save 协调层面的核心减重目标已经基本完成。 

## 2026-04-12 - purchase 模块第二阶段补充：保存协调再拆为专用 hook

### 本轮目标

继续推进采购单编辑链解耦，把原先挂在 `usePurchaseOrderForm` 上的保存协调能力再次下沉为独立专用 hook，使 form hook 重新聚焦“编辑 / 校验”，保存准备单独承担“提交整形 / delta commit / 保存执行判定”。

### 实际变更

新增文件：

- `src/features/trading/hooks/use-purchase-order-save-preparation.ts`

调整文件：

- `src/features/trading/hooks/use-purchase-order-form.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

本轮结构调整如下：

1. `usePurchaseOrderForm`
   - 移除 `prepareSubmitData`
   - 移除 `prepareSaveExecution`
   - 保留 `formData / handleHeaderChange / handleAddLine / handleRemoveLine / updateLine / validate / commit`

2. `usePurchaseOrderSavePreparation`
   - 输入：`initialOrder / formData / commit`
   - 输出：
   - `prepareSubmitData()`
   - `prepareSaveExecution()`
   - 内部复用：
   - `preparePurchaseOrderForSubmit()`
   - `buildPurchaseOrderSaveExecution()`

3. `PurchaseOrderActionDialog`
   - form 编辑仍使用 `usePurchaseOrderForm`
   - 保存准备改为使用 `usePurchaseOrderSavePreparation`
   - 继续保持 UI 层只负责根据保存结果分发 mutation

### 本轮收益

1. `usePurchaseOrderForm` 的职责重新收紧回“表单编辑 + 校验 + delta 能力暴露”。
2. 保存准备逻辑现在拥有独立 hook 入口，后续若要复用到其它采购单保存入口会更容易。
3. form hook 与 save 协调层的边界已经从“同文件不同 helper”进一步升级为“两个 hook 分层”。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/hooks/purchase-order-form-save-helpers.ts src/features/trading/hooks/purchase-order-form-submit-helpers.ts src/features/trading/hooks/use-purchase-order-save-preparation.ts src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到目前为止，purchase 第二阶段在前端采购单编辑链上已经形成四层较清晰边界：

1. UI 容器层：`PurchaseOrderActionDialog`
2. form 编辑层：`usePurchaseOrderForm`
3. save 准备层：`usePurchaseOrderSavePreparation`
4. 纯 helper 层：defaults / line / header / submit / save helpers

这意味着采购单前端主交互链最重的集中点已经基本拆散，后续若继续推进，优先级就更偏向 transaction service 边界评估，而不是继续深挖 form hook。 

## 2026-04-12 - purchase 模块第二阶段补充：transaction service 单文件分组导出

### 本轮目标

在不拆物理文件、不改变现有调用语义的前提下，对 `purchase-transaction-service.ts` 做边界显式化处理，在同一文件内形成 `core / header / line` 三组导出。

### 实际变更

调整文件：

- `src/features/trading/purchase/services/purchase-transaction-service.ts`

本轮新增三组导出对象：

1. `purchaseOrderTransactionCore`
   - `executePurchaseOrderTransaction`

2. `purchaseOrderHeaderTransactions`
   - `savePurchaseOrder`
   - `changePurchaseOrderExpectedDate`
   - `changePurchaseOrderSupplier`

3. `purchaseOrderLineTransactions`
   - `changePurchaseOrderLineAdd`
   - `changePurchaseOrderLineRemove`
   - `changePurchaseOrderLineContent`

同时继续保留原有命名导出，因此 `use-purchase-orders.ts` 等现有调用方无需改造即可保持兼容。

### 本轮收益

1. transaction service 的职责边界已从“阅读时靠命名推断”变成“导出层即显式分组”。
2. 后续若 intent 数量继续增加，可以直接将这三组自然下沉为独立文件，而不会重新整理调用边界。
3. 当前先不拆物理文件，避免在收益有限时增加跳转成本与重构噪音。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/purchase/services/purchase-transaction-service.ts src/features/trading/purchase/hooks/use-purchase-orders.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，purchase 第二阶段对 transaction service 的处理采取了“先显式分组、后按需物理拆分”的策略：

1. 当前边界已清晰
2. 现有调用保持稳定
3. 后续若继续扩展 intent，再拆文件会更自然

这使得 purchase 第二阶段的前端收口在 form、save、mutation、transaction 四层都已经具备较明确的边界。 

## 2026-04-12 - purchase 模块第二阶段补充：mutation 层优先消费 transaction 分组导出

### 本轮目标

在 transaction service 已完成 `core / header / line` 分组导出后，进一步让 `use-purchase-orders.ts` 优先消费这些分组对象，使 mutation 分层与 transaction 分层对齐。

### 实际变更

调整文件：

- `src/features/trading/purchase/hooks/use-purchase-orders.ts`

本轮主要调整：

1. transaction import 从单个函数平铺导入切换为：
   - `purchaseOrderHeaderTransactions`
   - `purchaseOrderLineTransactions`

2. mutation 调用关系改为显式分组映射：
   - `saveMutation / supplierChangeMutation / expectedDateChangeMutation`
     - 对应 `purchaseOrderHeaderTransactions`
   - `lineAddMutation / lineRemoveMutation / lineContentChangeMutation`
     - 对应 `purchaseOrderLineTransactions`

3. `patchMutation / createMutation / deleteMutation / confirmReceiptMutation`
   - 仍继续走原本的非 transaction service 路径
   - 保持边界含义稳定

### 本轮收益

1. mutation 分组与 transaction 分组开始一一对应，阅读路径更自然。
2. `use-purchase-orders.ts` 中“哪些 mutation 属于 header，哪些属于 line”不再靠命名猜测，而是直接体现在调用来源上。
3. 后续若 transaction service 真正拆物理文件，mutation 层只需做很小范围 import 调整。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/trading/purchase/hooks/use-purchase-orders.ts src/features/trading/purchase/services/purchase-transaction-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，purchase 第二阶段在前端采购单主交互链上的分层已经基本闭环：

1. form 编辑层
2. save 准备层
3. mutation 分组层
4. transaction 分组层

当前再继续深挖前端分层的收益已经明显下降，后续更适合转向真实业务需求或后端 transaction intent 扩展时再顺势演进。 

## 2026-04-12 - warehouse：`/warehouse/inbound` 入库入口显式化修复

### 本轮目标

修复 `/warehouse/inbound` 页面“看起来没有入库按钮”的真实业务问题，在不改后端接口语义、不改现有提交流程的前提下，让页面在空态与结果态都能明确表达如何执行入库。

### 问题复盘

本轮排查确认：

1. 页面并非没有入库能力。
2. 现有入库链路仍然存在：搜索结果 -> 打开入库弹窗 -> 提交入库。
3. 用户之所以感知为“没有按钮”，核心原因有两层：
   - 空态下没有明确提示“先搜索，再入库”
   - 结果项按钮原本是弱语义 `select` 且依赖 hover 才显著

### 实际变更

调整文件：

- `src/features/warehouse/tabs/product-inbound.tsx`
- `src/locales/messages/zh-CN/warehouse.ts`
- `src/locales/messages/en-US/warehouse.ts`

本轮已完成：

1. 搜索结果项右侧按钮改为常显，不再依赖 hover 才突出。
2. 按钮文案改为更强语义的 `登记入库 / Record Inbound`。
3. 按钮点击显式调用 `openInboundForm(item)`，并处理 `stopPropagation()`，避免与卡片点击形成重复触发。
4. 空态补充两类引导文案：
   - 首次进入未搜索时的引导
   - 搜索无结果时的引导

### 本轮收益

1. 用户在空态下不再只看到一个“空白结果区”，而能明确知道下一步应先搜索物料/产品。
2. 用户在结果态下不再依赖 hover 猜测入口，而能直接看到“登记入库”操作按钮。
3. 保持了原有权限门控与现有入库提交流程不变，风险较低。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/tabs/product-inbound.tsx src/locales/messages/zh-CN/warehouse.ts src/locales/messages/en-US/warehouse.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

本轮已完成的是“入库入口显式化修复”，而不是入库流程重做：

1. 后端 `/inventory/inbound` 语义未改。
2. 前端 `InventoryTransactionService.recordInbound()` 未改。
3. 页面主流程仍是“搜索 -> 选择结果 -> 弹窗登记 -> 提交入库”，但入口表达已从隐性变为显性。

## 2026-04-12 - org-personnel：新建请假申请无限更新根因修复

### 本轮目标

修复 `LEAVE_MANAGEMENT` 模块点击“新建请假申请”后触发的 `Maximum update depth exceeded` 崩溃，并优先从前端弹窗状态更新环的根因入手，而不是先把 `/leaves/stats` 与 `/leaves/my` 请求失败当成唯一问题。

### 根因判断

本轮排查确认，最可疑的根因是 `LeaveActionDialog` 中的关闭重置链路：

1. `useEffect` 在 `open === false` 时调用 `form.reset()` 与 `resetPreview()`
2. `resetPreview` 在旧实现中是返回对象里的内联函数，每次 render 都会生成新引用
3. 这使得 effect 依赖在每次 render 都变化
4. 一旦关闭链路触发 reset，就可能形成重复 render -> effect -> reset -> render 的更新环

### 实际变更

调整文件：

- `src/features/org-personnel/hooks/use-submit-leave-request.ts`
- `src/features/org-personnel/components/leave-action-dialog.tsx`

本轮已完成：

1. `useSubmitLeaveRequest` 中的 `resetPreview` 改为 `useCallback` 稳定引用。
2. `LeaveActionDialog` 中抽出 `DEFAULT_LEAVE_FORM_VALUES`，避免多处重复创建默认对象。
3. `LeaveActionDialog` 中抽出稳定的 `handleSubmitSuccess`，统一处理关闭后 reset。
4. 关闭时的 effect 改为依赖稳定的 `reset` 与 `resetPreview`，从根源上避免依赖每次 render 都变化。

### 本轮收益

1. 修复重点落在“为什么会形成更新环”，而不是表面加条件绕过。
2. 弹窗关闭后的重置语义仍保留，没有靠删除 reset 行为来规避问题。
3. 后续 `react-hook-form + Dialog` 组合的可维护性更高，默认值与关闭成功回调也更集中。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/org-personnel/components/leave-action-dialog.tsx src/features/org-personnel/hooks/use-submit-leave-request.ts src/features/org-personnel/tabs/leave-management.tsx src/features/org-personnel/services/leave-service.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

本轮已经完成的是“无限更新根因修复”。`/leaves/stats` 与 `/leaves/my` 的请求失败是否仍独立存在，需要在崩溃修复后重新观察：

1. 若刷新后弹窗已可稳定打开，说明主崩溃链路已切断。
2. 若此时 `/leaves/*` 仍报错，再进入第二步排查请求失败本身。

## 2026-04-12 - warehouse：仓储提升为独立分类导航

### 本轮目标

将“仓储”从“资源管理”子菜单中提升为独立侧边栏分类，并把“仓储作业”与“物料档案”作为该分类下的并列入口，解决仓储域导航承载层级不合理的问题。

### 问题复盘

本轮执行前确认：

1. `仓储` 原先挂在侧边栏“资源管理”分组中。
2. `物料档案` 原先挂在侧边栏“工程管理”分组中。
3. 实际业务上二者都属于仓储域，但导航上被拆散，导致：
   - 仓储域边界表达不清晰
   - 继续把物料档案塞入 warehouse tabs 不合理
   - 仅靠菜单名加括号不能从结构上解决问题

### 实际变更

调整文件：

- `src/components/layout/data/sidebar-data.ts`
- `src/locales/messages/zh-CN/sidebar.ts`
- `src/locales/messages/en-US/sidebar.ts`

本轮已完成：

1. 新增独立侧边栏分组 `warehouseManagement / 仓储`。
2. 将 `仓储` 从“资源管理”分组移出。
3. 将 `物料档案` 从“工程管理”分组移出。
4. 在新的“仓储”分组下并列挂载：
   - `仓储作业` -> `/warehouse`
   - `物料档案` -> `/materials`
5. 保持现有路由、权限 ID 与页面行为不变，只调整导航承载层级。

### 本轮收益

1. 仓储域从“资源管理里的一个入口”升级为“独立业务分类”，边界更符合真实业务。
2. `仓储作业` 不再被迫代表整个仓储域本身，语义更准确。
3. `物料档案` 获得与仓储作业并列的入口，不再需要靠 tabs 或菜单括号补丁维持归属感。

### 验证结果

已执行：

1. `pnpm exec eslint src/components/layout/data/sidebar-data.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

本轮完成的是“侧边栏层级收口”，不是 warehouse 内部 tabs 的全量重做：

1. 现有 `/warehouse` 与 `/materials` 路由保持不变。
2. 现有权限门控保持不变。
3. 当前先解决“仓储域应该如何在导航层被表达”的问题，为后续再评估内部 tabs 是否继续减重打基础。

## 2026-04-12 - layout：侧边栏分类折叠与默认展开当前分类

### 本轮目标

为侧边栏分类增加折叠/展开能力，并默认展开当前命中路由所属分类，缓解菜单持续增长后单列信息密度过高的问题，同时保留现有整栏折叠与滚动兜底能力。

### 问题复盘

本轮执行前确认：

1. 当前侧边栏只有整栏折叠与内容区滚动兜底。
2. 各个 `NavGroup` 始终展开，导致单列导航扫描成本持续上升。
3. 问题核心不是“是否有滚动条”，而是“当前上下文是否足够突出，非当前分类是否能先收起”。

### 实际变更

调整文件：

- `src/components/layout/nav-group.tsx`

本轮已完成：

1. 为每个侧边栏分类标题增加可点击折叠/展开能力。
2. 为分类标题增加展开指示箭头，并在展开时旋转。
3. 根据当前 pathname 判断当前命中分类。
4. 当前命中分类默认展开，其它分类默认收起。
5. 保留现有链接、徽标、整栏折叠和内容滚动逻辑不变。

### 本轮收益

1. 侧边栏不再默认把所有分类同时摊开，显著降低了一列菜单的视觉密度。
2. 当前所在分类会自动展开，提升了当前上下文的可见性。
3. 改动集中在 `NavGroup`，没有扩大为整套侧边栏重写，风险较低。

### 验证结果

已执行：

1. `pnpm exec eslint src/components/layout/nav-group.tsx src/components/layout/data/sidebar-data.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

本轮已完成的是“分类级折叠增强”，不是更复杂的导航状态持久化建设：

1. 当前已实现分类可折叠与当前分类自动展开。
2. 现有整栏折叠与滚动兜底仍保留。
3. 若后续还需进一步优化，再考虑是否补用户手动展开状态持久化。

## 2026-04-12 - layout：侧边栏分类标题字号与颜色层级优化

### 本轮目标

在上一轮完成分类折叠后，继续优化侧边栏分类标题的视觉层级，让分组标题在字号、颜色和状态感知上更接近菜单标题级别，避免“菜单项比分类标题更显眼”的问题。

### 实际变更

调整文件：

- `src/components/layout/nav-group.tsx`

本轮已完成：

1. 提升分类标题容器的 padding 与圆角，使其更像可交互的分组头部。
2. 提升分类标题字号、字重与 tracking，增强分组标题感。
3. 提升默认颜色对比度，并增强 hover 态的可点击反馈。
4. 为展开态补充更明确的背景与前景色区分。
5. 保持现有折叠逻辑、菜单行为与路由逻辑不变。

### 本轮收益

1. 分类标题不再像弱辅助说明，而更像真正的导航分组标题。
2. 菜单项与分类标题之间的层级更清晰，扫描侧边栏时更容易先识别分组再识别具体入口。
3. 样式改动聚焦在 `NavGroup`，没有扩大到整套导航主题重做。

### 验证结果

已执行：

1. `pnpm exec eslint src/components/layout/nav-group.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，侧边栏导航已经完成两层连续优化：

1. 分类结构层：支持折叠并默认展开当前分类
2. 分类视觉层：标题字号、颜色与状态层级增强

这使得当前侧边栏在信息密度上更可控，在视觉层级上也更接近可长期扩展的状态。 

## 2026-04-12 - architecture：PDA 盘点扫描链路离线 SDRTS Phase A 最小骨架

### 本轮目标

在“离线基础设施层 + 模块 adapter”方向已确认后，先围绕 `warehouse stocktake PDA` 试点落第一轮最小骨架，只覆盖 `pdaSubmitScan` 场景的“本地入队 + 在线直传尝试 + 网络失败保留队列”。

### 实际变更

调整文件：

- `package.json`
- `src/offline-sync/types/offline-sync.ts`
- `src/offline-sync/storage/dexie-offline-db.ts`
- `src/offline-sync/storage/offline-storage.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
- `src/features/warehouse/stocktake/index.ts`
- `src/features/warehouse/hooks/use-stock-maintenance.ts`

本轮已完成：

1. 引入 `Dexie` 作为 IndexedDB 默认实现候选，并开始承接离线存储层。
2. 新增 `offline-sync` 最小 types，定义 `snapshot / pending log / sync meta` 所需基础结构。
3. 新增 `dexie-offline-db.ts` 与 `offline-storage.ts`，作为最小离线存储 facade。
4. 新增 `stocktake-offline-adapter.ts`，实现 PDA 单条扫描的最小离线 adapter。
5. `pdaSubmitScan` 现已改为：
   - 先入队本地 pending log
   - 在线时立即尝试正式提交
   - 网络类失败时保留 `queued`
   - 非网络类失败继续抛出
6. `use-stock-maintenance.ts` 已接入该 adapter，并在 UI 上区分“已同步”与“已保存为离线草稿”。

### 本轮边界

本轮明确仍未进入：

1. `pdaBulkSync` 批量 replay
2. `pdaPatchItem` 字段级冲突链路
3. 自动后台 flush 调度
4. 离线草稿列表展示与人工处理 UI

也就是说，这一轮完成的是 **Phase A 最小写入骨架**，而不是完整离线同步闭环。

### 验证结果

已执行：

1. `pnpm add dexie`
2. `pnpm exec eslint src/features/warehouse/stocktake/index.ts src/features/warehouse/hooks/use-stock-maintenance.ts src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts src/offline-sync/storage/offline-storage.ts src/offline-sync/storage/dexie-offline-db.ts src/offline-sync/types/offline-sync.ts`
3. `pnpm exec tsc --noEmit`

结果：

1. `Dexie` 依赖已加入项目。
2. 目标前端文件 `eslint` 通过。
3. 全量 TypeScript 类型检查通过。

### 当前结果判断

当前已经具备继续推进 PDA 离线试点的真实骨架：

1. 已有基础存储层，而不是继续停留在纸面方案。
2. 已有首个模块 adapter 接入点。
3. 已把 Phase A 控制在“先入队 + 尝试直传 + 失败保留”这个可验证边界内。

下一步若继续推进，最合理的是：

1. 增加 pending 队列读取 / flush 接口
2. 引入自动重试或手动 flush 入口
3. 再进入 `pdaBulkSync` 的 Phase B

## 2026-04-12 - architecture：PDA 盘点扫描链路离线 SDRTS Phase B（pending / flush / bulk sync）

### 本轮目标

在 Phase A 已有最小入队骨架的基础上，继续补齐：

1. pending 队列读取接口
2. 手动 flush 入口
3. 自动 online flush 入口
4. `pdaBulkSync` 批量补交路径

### 实际变更

调整文件：

- `src/offline-sync/storage/offline-storage.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
- `src/features/warehouse/stocktake/index.ts`
- `src/features/warehouse/hooks/use-stock-maintenance.ts`

本轮已完成：

1. 为 `offline-storage` 增加按 `intent` 读取全部日志与批量删除能力。
2. 为 `stocktake` 离线类型补充：
   - `StocktakePendingScanRecord`
   - `StocktakeFlushResult`
3. 为 `stocktake-offline-adapter` 增加：
   - `listPendingScans()`
   - `flushQueuedScans()`
   - `registerAutoFlush()`
4. 在 flush 过程中，按 `taskId` 聚合同一任务下的 queued 扫描：
   - 单条时仍走 `pdaSubmitScan`
   - 多条时切到 `pdaBulkSync`
5. 为 `use-stock-maintenance.ts` 增加：
   - pending 扫描数查询
   - 手动 flush mutation
   - online 自动 flush 注册
   - flush 后刷新 stocktake 查询与 pending 查询

### 关键实现说明

1. 这轮没有把 flush 做成全局调度中心，而是先维持在 `stocktake` adapter 内聚范围。
2. `pendingScanCount` 已改用 `React Query` 查询态维护，避免在 effect 中直接 `setState` 引发 hooks lint。
3. 自动 flush 只在浏览器 `online` 事件触发时执行，当前仍属最小可用策略。

### 本轮边界

本轮仍未进入：

1. `pdaPatchItem` 冲突记录与人工决策 UI
2. 通用全局离线任务看板
3. 更复杂的批次失败拆分与分批回写优化

因此，这一轮完成的是 **Phase B 最小闭环**，而不是完整冲突治理层。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/hooks/use-stock-maintenance.ts src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts src/offline-sync/storage/offline-storage.ts src/offline-sync/storage/dexie-offline-db.ts src/features/warehouse/stocktake/index.ts src/features/warehouse/stocktake/offline/stocktake-offline-types.ts src/offline-sync/types/offline-sync.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，PDA 离线试点已经从“只有入队”推进到“可读队列 + 可手动 flush + 可自动 flush + 可批量补交”：

1. Phase A：先入队、在线直传、网络失败保留
2. Phase B：pending 查询、手动/自动 flush、`pdaBulkSync` 批量补交

下一步若继续推进，最合理的是进入：

1. `pdaPatchItem` 的版本优先冲突链路
2. `conflict_records` 持久化
3. 人工处理入口与冲突升级 UI

## 2026-04-12 - architecture：PDA 盘点扫描链路离线 SDRTS Phase C（patch / conflict_records）

### 本轮目标

在 Phase B 的 scan flush 闭环基础上，继续推进 `pdaPatchItem`：

1. 为离线层增加 `conflict_records`
2. 支持 `pdaPatchItem` 离线入队
3. 支持 patch flush
4. 基于 `baseVersion` 提供最小冲突记录与查询能力

### 实际变更

调整文件：

- `src/offline-sync/types/offline-sync.ts`
- `src/offline-sync/storage/dexie-offline-db.ts`
- `src/offline-sync/storage/offline-storage.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
- `src/features/warehouse/stocktake/index.ts`
- `src/features/pda-stocktake/hooks/use-stocktake.ts`

本轮已完成：

1. `offline-sync` 新增 `OfflineConflictRecord` 类型。
2. Dexie 离线库新增 `conflictRecords` 表，并升级到 `version(2)`。
3. `offline-storage` 新增 conflict 的保存、查询、删除能力，并纳入事务范围。
4. `stocktake-offline-types.ts` 新增 patch / conflict 相关类型：
   - `StocktakePatchInput`
   - `StocktakeQueuedPatchPayload`
   - `StocktakePendingPatchRecord`
   - `StocktakePatchFlushResult`
   - `StocktakeConflictRecord`
5. `StocktakeOfflineAdapter` 新增：
   - `submitPatchItem()`
   - `listPendingPatches()`
   - `flushQueuedPatches()`
   - `listConflicts()`
   - `clearConflict()`
6. `registerAutoFlush()` 已扩展为同时触发 scan + patch 的 online flush。
7. `src/features/pda-stocktake/hooks/use-stocktake.ts` 已切换为通过 `StocktakeOfflineAdapter.submitPatchItem()` 走 patch 离线链路。

### 关键实现说明

1. patch 队列实体粒度采用 `warehouse.stocktake.item`，`entityId` 对齐到盘点项 `itemId`。
2. `path` 基于 `DeltaSet` 的 key 集合排序后拼接，作为最小冲突路径标识。
3. 当 `pdaPatchItem` 返回 409 / `isConflict` 时，当前实现会：
   - 将 pending delta 标记为 `conflict`
   - 写入 `conflictRecords`
   - 更新 `syncMeta.hasConflict = true`
4. 对于非网络类后端拒绝，当前先归入 `server_reject` 冲突记录，而不是直接丢弃。

### 本轮边界

本轮仍未进入：

1. 冲突自动合并策略
2. 冲突人工处理 UI
3. 冲突 resolved 生命周期闭环
4. 多 patch 同 path 压缩 / 折叠策略

因此，这一轮完成的是 **最小冲突记录层**，不是完整冲突治理工作台。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts src/features/warehouse/stocktake/offline/stocktake-offline-types.ts src/features/warehouse/stocktake/index.ts src/features/pda-stocktake/hooks/use-stocktake.ts src/offline-sync/types/offline-sync.ts src/offline-sync/storage/dexie-offline-db.ts src/offline-sync/storage/offline-storage.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，PDA 离线试点已经具备三段式最小能力：

1. scan 入队与直传
2. pending 查询 + flush + bulk sync
3. patch 入队 + patch flush + conflict_records

下一步若继续推进，最合理的是：

1. 给 `conflictRecords` 增加 resolved 处理流程
2. 做最小冲突列表 UI
3. 再评估是否引入 path 级 merge / replay 优化

## 2026-04-12 - architecture：PDA 盘点冲突处理最小人工入口（resolve / retry / clear）

### 本轮目标

在已有 `conflict_records` 的基础上，补齐最小人工处理闭环：

1. `resolved / clear` 流程
2. 刷新最新 item 后重试
3. PDA 扫描页中的最小人工处理入口

### 实际变更

调整文件：

- `src/offline-sync/types/offline-sync.ts`
- `src/offline-sync/storage/offline-storage.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
- `src/features/pda-stocktake/hooks/use-stocktake.ts`
- `src/features/pda-stocktake/components/stocktake-scanner.tsx`

本轮已完成：

1. `OfflineConflictRecord` 增加 `resolvedStrategy`，支持区分 `discard / retry`。
2. `offline-storage` 增加：
   - `getConflict()`
   - `markConflictResolved()`
3. `StocktakeOfflineAdapter` 增加：
   - unresolved 冲突过滤
   - `resolveConflict()`
   - `retryConflictAfterRefresh()`
4. `retryConflictAfterRefresh()` 会：
   - 先刷新最新 `StocktakeItem`
   - 用服务端最新 `version` 重建 patch 提交
   - 将原冲突记录标记为 `resolvedStrategy: 'retry'`
5. `resolveConflict()` 会：
   - 清理对应 pending patch
   - 将冲突记录标记为 `resolvedStrategy: 'discard'`
   - 回写 `syncMeta` 的 `hasConflict / queueState`
6. `pda-stocktake/hooks/use-stocktake.ts` 已补充：
   - `resolveConflictMutation`
   - `retryConflictMutation`
   - flush 后 conflict 刷新
7. `stocktake-scanner.tsx` 已增加最小冲突处理区：
   - 展示当前任务冲突数
   - `重新 flush`
   - `刷新后重试`
   - `清除冲突`

### 关键实现说明

1. 这轮将人工处理入口收敛在 `PDA stocktake scanner` 页面内，不额外扩出全局工作台。
2. `ScannerItemDetail` 已改为本地数量状态 + 显式构造 `DeltaSet`，避免直接修改 hook 返回代理值带来的 immutability lint。
3. 当前“刷新后重试”策略是：
   - 以服务端最新 item 的 `version` 为 base
   - 复用原冲突中的 `delta`
   - 重新进入 `submitPatchItem()` 链路

### 本轮边界

本轮仍未进入：

1. 多冲突批量处理面板
2. 冲突字段级 diff 可视化
3. 自动 merge 建议
4. resolved 记录历史查询页

因此，这一轮完成的是 **最小人工处理入口**，不是完整冲突运营面板。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/pda-stocktake/components/stocktake-scanner.tsx src/features/pda-stocktake/hooks/use-stocktake.ts src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts src/features/warehouse/stocktake/offline/stocktake-offline-types.ts src/offline-sync/storage/offline-storage.ts src/offline-sync/types/offline-sync.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，PDA 离线试点已经具备从“离线 patch 冲突”到“人工最小处理”的闭环：

1. 记录冲突
2. 展示冲突
3. 清除冲突
4. 刷新后重试

下一步若继续推进，最合理的是：

1. 冲突字段级对比 UI
2. resolved 历史与审计视图
3. path 级 merge / squash 策略

## 2026-04-12 - architecture：PDA 冲突处理增强（字段级 diff / resolved 历史 / merge 建议 / 批量处理）

### 本轮目标

在最小人工处理入口已具备的基础上，继续补齐：

1. 字段级 diff 可视化
2. resolved 历史展示区
3. 自动 merge 建议文案
4. 批量处理面板

### 实际变更

调整文件：

- `src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
- `src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts`
- `src/features/pda-stocktake/hooks/use-stocktake.ts`
- `src/features/pda-stocktake/components/stocktake-scanner.tsx`

本轮已完成：

1. `StocktakeConflictRecord` 增加：
   - `fieldDiffs`
   - `mergeSuggestion`
   - `status`
2. adapter 内新增冲突展示辅助：
   - 字段级 diff 生成
   - merge suggestion 计算
   - `listResolvedConflicts()`
3. `use-stocktake.ts` 增加：
   - `resolvedConflictsQuery`
   - `batchResolveConflictMutation`
   - `batchRetryConflictMutation`
4. `stocktake-scanner.tsx` 现在已支持：
   - 冲突卡片内显示字段级 old/new diff
   - merge suggestion 文案
   - unresolved 与 resolved 两个分区
   - 批量刷新后重试
   - 批量清除冲突

### 关键实现说明

1. merge suggestion 目前是**规则型建议**，还不是自动 merge 执行器：
   - `version_conflict` -> 建议刷新后重试
   - `server_reject` -> 建议人工复核
   - `local_divergence` -> 建议清除本地变更
2. resolved 历史仍收敛在当前 `scanner` 页面内展示，没有扩成单独历史页。
3. 批量处理当前走串行 Promise 聚合，优先保证语义正确与边界清晰。

### 本轮边界

本轮仍未进入：

1. 自动 merge 真正执行
2. 冲突审计详情页
3. path 级 patch squash / coalesce
4. 通用跨模块冲突工作台

因此，这一轮完成的是 **PDA 试点冲突处理增强版 UI + 展示数据层**。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/pda-stocktake/components/stocktake-scanner.tsx src/features/pda-stocktake/hooks/use-stocktake.ts src/features/warehouse/stocktake/offline/stocktake-offline-adapter.ts src/features/warehouse/stocktake/offline/stocktake-offline-types.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标文件 `eslint` 通过。
2. 全量 TypeScript 类型检查通过。

### 当前结果判断

到这一步，PDA 离线试点的冲突处理已经从“能处理”提升到“可理解、可批量操作、可追踪历史”：

1. 能看字段级差异
2. 能看系统建议
3. 能批量重试 / 批量清除
4. 能看到已处理历史

下一步若继续推进，最合理的是：

1. 真正的 merge 决策执行
2. resolved 历史页与审计视图
3. 通用 offline conflict 工作台抽象

## 2026-04-12 - architecture：右侧悬浮小手柄快捷扫描入口（quick-actions）

### 本轮目标

在不新建第二套离线协议的前提下，为现场高频扫码作业增加一个可拔插的全局快捷入口层：

1. 右侧悬浮小手柄
2. 按权限过滤显示快捷动作
3. 点击后直接进入对应扫描页
4. 页面默认进入扫描态

### 本轮实现

新增独立目录：

- `src/features/quick-actions/types.ts`
- `src/features/quick-actions/data/quick-action-registry.ts`
- `src/features/quick-actions/services/quick-action-access.ts`
- `src/features/quick-actions/components/quick-action-handle.tsx`
- `src/features/quick-actions/components/quick-action-drawer.tsx`
- `src/features/quick-actions/components/quick-actions-floating.tsx`
- `src/features/quick-actions/index.ts`

联动文件：

- `src/components/layout/authenticated-layout.tsx`
- `src/routes/_authenticated/warehouse/inbound.tsx`
- `src/routes/_authenticated/warehouse/shipment.tsx`
- `src/routes/_authenticated/warehouse/stocktake.tsx`
- `src/routes/_authenticated/warehouse/stocktake.lazy.tsx`
- `src/features/warehouse/tabs/product-inbound.tsx`
- `src/features/warehouse/tabs/product-shipment.tsx`
- `src/features/warehouse/shipment/components/shipment-search.tsx`
- `src/features/warehouse/stocktake/components/stocktake-scan-entry.tsx`
- `src/features/warehouse/stocktake/components/stocktake-route-content.tsx`

### 关键实现点

1. **入口层独立化**
   - 快捷扫描入口被独立收敛到 `quick-actions` 目录。
   - 右侧小手柄只是全局增强层，不反向侵入业务页。

2. **挂载到全局壳层**
   - 在 `AuthenticatedLayout` 中挂载 `QuickActionsFloating`。
   - 若入口层失效，只影响快捷扫描，不影响主页面与既有业务链路。

3. **权限过滤**
   - 快捷动作从注册表读取。
   - 通过当前 `user.permissions` 做动作级过滤。
   - 与“主菜单尽量可见”策略解耦：主菜单仍走现有体验，快捷动作层按权限直接过滤显示。

4. **首批动作**
   - 入库扫描：`/warehouse/inbound?mode=scan`
   - 出库扫描：`/warehouse/shipment?mode=scan`
   - 盘点扫描：`/warehouse/stocktake?mode=scan`

5. **扫描态接入**
   - `inbound` 页面在 `mode=scan` 时自动聚焦搜索输入。
   - `shipment` 页面在 `mode=scan` 时自动聚焦搜索输入。
   - `stocktake` 页面在 `mode=scan` 时直接进入 `PDAStocktake` 扫描入口。

6. **边界保持**
   - 本轮没有新建第二套手机扫码离线协议。
   - 手机扫码与 PDA 扫码仍共用同一套：
     - `offline-sync`
     - `stocktake-offline-adapter`
     - `pending_log`
     - `conflict_records`

### 额外收口

在接入 `mode=scan` 过程中，顺手把 `product-inbound.tsx` 里原有对 hook 返回值的直接修改收口为本地 `useState` 表单状态，避免 `react-hooks/immutability` lint 问题继续扩大。

### 验证结果

已执行：

1. `pnpm exec eslint src/components/layout/authenticated-layout.tsx src/features/quick-actions/**/*.ts src/features/quick-actions/**/*.tsx src/features/warehouse/shipment/components/shipment-search.tsx src/features/warehouse/tabs/product-inbound.tsx src/features/warehouse/tabs/product-shipment.tsx src/routes/_authenticated/warehouse/inbound.tsx src/routes/_authenticated/warehouse/shipment.tsx src/routes/_authenticated/warehouse/stocktake.tsx src/routes/_authenticated/warehouse/stocktake.lazy.tsx src/features/warehouse/stocktake/components/stocktake-scan-entry.tsx src/features/warehouse/stocktake/components/stocktake-route-content.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 类型检查通过。
2. 目标文件 ESLint 无 error。
3. 仍有 1 条 warning：`src/routes/_authenticated/warehouse/stocktake.lazy.tsx` 的 `react-refresh/only-export-components`。

### 当前结果判断

到这一步，系统已经具备一个真正可用的“右侧快捷扫描入口层”：

1. 右侧可快速展开
2. 动作按权限过滤
3. 点击直接进入扫描态
4. 与主业务、主导航、离线协议保持解耦

下一步若继续推进，最合理的是：

1. 为更多现场动作接入快捷扫描
2. 为 `stocktake.lazy.tsx` 的 fast refresh warning 做进一步文件级拆分优化
3. 视需要增加“最近使用 / 常用动作排序”

## 2026-04-12 - architecture：机器码 / 人工输入码全局规范化扩展（Phase 1）

### 本轮目标

把此前散落在 PDA、扫码解析、队列 dedupe 和业务表单中的局部大小写/空白清洗规则，提升为可复用的公共规范层，并先收口工业流程的扫码主链。

### 本轮实现

新增公共规范文件：

- `src/lib/codecs/code-normalization.ts`

新增函数：

1. `normalizeMachineCode`
2. `normalizeTrackingCode`
3. `normalizeMaterialCode`
4. `normalizeDeviceCode`
5. `normalizeSceneKey`
6. `normalizeTaskKey`

### 第一批已收口范围

1. `src/features/terminal-config/services/pda-shell-queue-service.ts`
   - 队列 payload 规范化
   - scene 规范化
   - dedupeKey 构建规范化

2. `src/features/terminal-config/tabs/pda-shell.tsx`
   - 原始扫码值统一使用 `normalizeMachineCode`
   - retry scene 排序口径统一使用 `normalizeSceneKey`
   - UI 输入与自动提交使用同一套 machine code 规范

3. `src/features/terminal-config/tabs/pda-terminal.tsx`
   - rawCode、deviceId、materialCode、scene、taskId 统一走公共规范函数
   - payload preview 与 submit 边界复用同一套规范
   - 默认配置保存时使用统一 scene / deviceId 规则

4. `src/features/scan-platform/services/logistics-inbound-resolution-service.ts`
   - tracking code 改为统一走 `normalizeTrackingCode`

5. `src/features/scan-platform/services/wheel-trace-parser-service.ts`
   - wheel barcode 解析改为统一走 `normalizeMachineCode`
   - 顺手清理空 interface lint，改为 type alias

### 第二批已补的保存边界

1. `src/features/warehouse/tabs/warehouse-category.tsx`
   - `code` 输入时统一走 `normalizeMachineCode`
   - create / patch 保存边界统一走 `normalizeMachineCode`

### 本轮收益

1. 扫码主链不再继续散落 `trim().toUpperCase()`。
2. PDA 输入、队列 dedupe、解析器、业务保存边界开始共用同一套规则。
3. 后续继续扩展到更多工业流程时，可以优先复用 `code-normalization.ts`，而不是继续在组件里复制规则。

### 本轮边界

本轮仍然保持：

1. 不对所有字段一刀切强制转大写。
2. 不对尚未确认语义的 key / slug / scene 之外字段做全仓替换。
3. 只先统一扫码主链与明确的机器码保存边界。

### 验证结果

已执行：

1. `pnpm exec eslint src/lib/codecs/code-normalization.ts src/features/terminal-config/services/pda-shell-queue-service.ts src/features/terminal-config/tabs/pda-shell.tsx src/features/terminal-config/tabs/pda-terminal.tsx src/features/scan-platform/services/logistics-inbound-resolution-service.ts src/features/scan-platform/services/wheel-trace-parser-service.ts src/features/warehouse/tabs/warehouse-category.tsx`
2. `pnpm exec tsc --noEmit`

结果：

1. ESLint 目标文件通过。
2. TypeScript 类型检查通过。

### 当前结果判断

到这一步，项目已经从“局部抽取”推进到“初步统一规范层”：

1. 公共规范函数已建立。
2. 扫码主链已优先收口。
3. 一个明确业务保存边界（`warehouse-category.code`）已并入统一规则。

下一步若继续推进，最合理的是：

1. 继续盘点其它工业流程里的显式机器码字段
2. 将更多 `category.key / option.value / material-like code` 保存边界并入公共规范
3. 视需要补充不同码类型更细分的 normalization contract

## 2026-04-12 - architecture：生产共享资源模块接入全局码规范化

### 本轮目标

在已完成 PDA / scan-platform / warehouse-category 第一批收口后，继续把 production shared 模块中语义最明确的机器码字段并入公共 normalization，优先覆盖：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

### 本轮实现

本轮实际收口的文件包括：

1. `src/features/production-shared/services/production-lines-service.ts`
2. `src/features/production-shared/services/production-processes-service.ts`
3. `src/features/production-shared/adapters/production-resource-api-adapter.ts`
4. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

### 关键实现点

1. **服务保存边界**
   - `production-lines-service.ts` 在保存 `line` 前，对 `line.code` 使用 `normalizeMachineCode`。
   - `production-processes-service.ts` 在保存 `step` 前，对 `step.code` 使用 `normalizeMachineCode`。

2. **表单输入边界**
   - `process-library-panel.tsx` 中：
     - `code` 输入时即时走 `normalizeMachineCode`
     - 编辑态回填时对 `process.code` 做统一规范化
     - `handleSave` 提交前再次用 `normalizeMachineCode` 做最终收口

3. **DTO 适配层兜底**
   - `production-resource-api-adapter.ts` 中：
     - API -> contract 时，对 `ProductionLine.code / ProductionProcessStep.code` 做 `normalizeMachineCode`
     - contract -> API DTO 时，同样对 `code` 做 `normalizeMachineCode`
   - 这样可以保证：
     - 服务边界规范化
     - 协议出口规范化
     - 协议入口反序列化后仍保持统一口径

### 明确未动范围

本轮明确没有扩到以下字段：

1. `name`
2. `description`
3. `attributes`
4. `production-resource-sync.ts` 中的事件名与 kind

原因：

1. 它们不属于明确的机器码 / 人工输入码问题域。
2. 对这些字段强行接入统一大写规则风险过高。

### 本轮收益

1. production shared 不再只靠局部 `trim()` 或 UI 输入层的零散规则。
2. `line.code / step.code` 在表单、服务、adapter 三层都获得统一口径。
3. 后续继续推进 production shared 其它机器值字段时，有了可直接复用的实现模板。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/production-shared/services/production-lines-service.ts src/features/production-shared/services/production-processes-service.ts src/features/production-shared/adapters/production-resource-api-adapter.ts src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/lib/codecs/code-normalization.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. ESLint 目标文件通过。
2. TypeScript 类型检查通过。

### 当前结果判断

到这一步，公共码规范化已经不再只覆盖扫码链路，而是开始进入生产基础主数据域：

1. PDA / scan-platform / queue 已收口
2. warehouse-category 已收口
3. production shared 中 `line.code / step.code` 已收口

下一步若继续推进，最合理的是：

1. 继续盘点 production shared 里其它明确机器值字段
2. 视需要把 `line-dialog` 的自动生成编号链路也显式纳入统一 normalization
3. 再向工程属性值模块推进 `category.key / option.value` 一类保存边界

## 2026-04-12 - architecture：工程属性值模块接入全局码规范化

### 本轮目标

在前两批已完成“大写机器码”收口后，继续推进工程属性值模块中另一类明确机器值：

1. `ProductAttributeCategory.key`
2. `ProductAttributeOption.value`

这批字段不属于大写机器码，而属于**小写 slug 风格机器值**，因此继续复用工程模块自己已有的 `product-attribute-machine-value.ts` 契约，而不是切到 `normalizeMachineCode`。

### 本轮实现

本轮实际涉及的文件包括：

1. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
2. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
3. `src/features/engineering/services/product-attribute-category-service.ts`
4. `src/features/engineering/services/product-attribute-option-service.ts`
5. `src/features/engineering/hooks/use-product-attribute-write-actions.ts`
6. `src/features/engineering/utils/product-attribute-machine-value.ts`

### 关键实现点

1. **输入边界**
   - 两个 dialog 原本已经在输入层使用 `normalizeProductAttributeMachineValue`：
     - `category.key`
     - `option.value`
   - 本轮确认并保留这一输入层规则，不改成大写机器码逻辑。

2. **服务保存边界**
   - `product-attribute-category-service.ts`
     - 保存前对 `category.key` 做最终规范化兜底。
   - `product-attribute-option-service.ts`
     - 保存前对 `option.categoryKey` 与 `option.value` 做最终规范化兜底。

3. **写动作层兜底**
   - `use-product-attribute-write-actions.ts`
     - `saveCategory` 前再次规范化 `key`
     - `saveOption` 前再次规范化 `categoryKey / value`
   - 这样可以保证 optimistic / mutation 入口与 service 边界口径一致。

### 规则差异说明

本轮明确保留了工程属性值模块的独立规则：

1. 小写字母
2. 数字
3. 连字符
4. 空格 / 下划线折叠为 `-`
5. 非法字符剔除

这与此前已收口的 PDA、仓库分类码、产线/工序 code 不同，后者主要属于大写机器码语义。

### 明确未动范围

本轮没有动以下字段：

1. `nameZh`
2. `nameEn`
3. `labelZh`
4. `labelEn`
5. 其它说明/展示字段

原因：

1. 它们属于展示文案，不是机器值。
2. 若误做 slug / lower-case 规范化，会直接破坏语义与国际化内容。

### 本轮收益

1. 工程属性值模块不再只依赖 UI 输入层的局部规范化。
2. `key / value` 已在输入层、service 保存边界、write actions 三层获得统一口径。
3. 全局码规范化体系现在已经明确分成两类并存：
   - 大写机器码
   - 小写 slug 风格机器值

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx src/features/engineering/services/product-attribute-category-service.ts src/features/engineering/services/product-attribute-option-service.ts src/features/engineering/hooks/use-product-attribute-write-actions.ts src/features/engineering/utils/product-attribute-machine-value.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. ESLint 目标文件通过。
2. TypeScript 类型检查通过。

### 当前结果判断

到这一步，全局码规范化已经形成两条清晰的语义分支：

1. **大写机器码链**
   - PDA / scan-platform / queue
   - warehouse-category
   - production shared `line.code / step.code`

2. **小写机器值链**
   - engineering `ProductAttributeCategory.key`
   - engineering `ProductAttributeOption.value`

下一步若继续推进，最合理的是：

1. 继续盘点 engineering 中其它明确机器值字段
2. 评估 product type / template / componentKey 一类字段是否需要同类分型规范
3. 最后再考虑是否需要把这两类规则进一步抽成更显式的“规范族”目录或命名约定
