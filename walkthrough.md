# 变更记录与验证（walkthrough.md）

## 2026-04-12 - architecture：Product 主数据链路接入全局码规范化

### 本轮目标

在 engineering 属性值链路、template/type 机器字段链路收口后，继续推进 `Product` 本体上的三类明确机器字段：

1. `Product.sku`
2. `Product.modelCode`
3. `Product.templateKey`

这一批继续按字段职责分型处理：

1. **大写业务编码**：`sku`
2. **固定 2 位数字码**：`modelCode`
3. **稳定大写引用键**：`templateKey`

### 本轮实现

本轮实际涉及的文件包括：

1. `src/lib/codecs/code-normalization.ts`
2. `src/features/engineering/components/product/product-basic-info.tsx`
3. `src/features/engineering/utils/product-form-utils.ts`
4. `src/features/engineering/hooks/use-product-form-derive.ts`
5. `src/features/engineering/hooks/use-product-form-submit.ts`
6. `src/features/engineering/adapters/product-api-adapter.ts`

### 关键实现点

1. **公共规范函数**
   - 在 `code-normalization.ts` 中新增：
     - `normalizeSku`
     - `normalizeModelCode`
     - `normalizeTemplateKey`
   - 这样 `Product` 主数据链路不再依赖零散的局部 `trim / toUpperCase / regex`。

2. **输入边界**
   - `product-basic-info.tsx`
     - `modelCode` 输入改为统一走 `normalizeModelCode`
     - `sku` 只读展示值统一走 `normalizeSku`
   - 保留了 `modelCode` 的 2 位数字约束，但把它显式并入公共 normalization 体系。

3. **派生链路**
   - `product-form-utils.ts`
     - `deriveSku` 统一走 `normalizeSku / normalizeModelCode`
     - `ensureSkuUnique` 改为基于规范化后的 SKU 比较
     - `buildBatchProducts / buildSingleVariantProduct` 中的 SKU 派生也统一走规范化
   - `use-product-form-derive.ts`
     - 后端发号返回的 `nextCode` 会统一走 `normalizeModelCode`
     - 自动生成的 SKU 会统一走 `normalizeSku`
   - `use-product-form-submit.ts`
     - 现有产品 SKU 去重 Map 改为基于 `normalizeSku` 统一比较

4. **DTO 出入口兜底**
   - `product-api-adapter.ts`
     - API -> contract 时统一规范：
       - `sku`
       - `modelCode`
       - `templateKey`
     - contract -> API DTO 时同样统一规范以上字段
     - 同时补齐 `templateKey` 的 patch 字段覆盖，避免保存增量遗漏该引用键

### 规则分型结果

到这一步，engineering 主数据内部已经至少明确出现以下几类 normalization 语义：

1. **小写 slug 机器值**
   - `ProductAttributeCategory.key`
   - `ProductAttributeOption.value`

2. **大写机器码 / 业务编码**
   - `ProductTemplate.code`
   - `ProductType.code`
   - `Product.sku`

3. **稳定大写键 / 引用键**
   - `ProductTemplate.componentKey`
   - `Product.templateKey`

4. **固定格式数字码**
   - `Product.modelCode`

这意味着 normalization 已经从“大小写清洗”演进成一套按字段职责分族治理的结构。

### 明确未动范围

本轮没有动以下字段：

1. `name`
2. `description`
3. `restrictions`
4. `attributeValues`
5. 其它自由文本字段

原因：

1. 它们不属于明确机器字段。
2. `attributeValues` 已在上一轮按小写 slug 规则独立收口，不应混改。

### 本轮收益

1. `sku` 不再只依赖局部派生函数输出，输入展示、派生、去重校验、DTO 出入口都统一了口径。
2. `modelCode` 不再只是表单里临时 `replace(/\D/g, '').slice(0, 2)`，而是有了专门的公共数字码规范函数。
3. `templateKey` 从隐式直传提升为稳定大写引用键，并纳入增量 patch 字段范围。

### 验证结果

已执行：

1. `pnpm exec eslint src/lib/codecs/code-normalization.ts src/features/engineering/components/product/product-basic-info.tsx src/features/engineering/utils/product-form-utils.ts src/features/engineering/hooks/use-product-form-derive.ts src/features/engineering/hooks/use-product-form-submit.ts src/features/engineering/adapters/product-api-adapter.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. ESLint 通过。
2. TypeScript 类型检查通过。

### 当前结果判断

到这一步，engineering 主数据域的 normalization 已经覆盖到三层：

1. **属性值层**：`key / value`
2. **模板与类型层**：`template code / componentKey / type code`
3. **产品主数据层**：`sku / modelCode / templateKey`

下一步若继续推进，最合理的是：

1. 继续盘点 `Product` 及其周边链路中的其它明确机器字段
2. 评估 `revisionNo / siteCode / changeOrderNo` 这类字段是否也需要按语义分型进入 normalization
3. 视复杂度决定是否把当前 `code-normalization.ts` 进一步演化为更显式的 normalization family 目录

## 2026-04-12 - architecture：Product/ChangeOrder 变更控制字段接入全局码规范化

### 本轮目标

在 engineering 已完成属性值、template/type、Product 主数据三批收口后，继续推进 Product / ChangeOrder / BOM 共用的一组变更控制字段：

1. `revisionNo`
2. `siteCode`
3. `changeOrderNo`

这一批继续按字段职责分型处理：

1. **稳定大写站点码**：`siteCode`
2. **大写业务单号**：`changeOrderNo`
3. **修订号**：`revisionNo`

其中 `revisionNo` 本轮只做最小规范收口，不擅自改写 `R1 / R2` 一类业务格式语义。

### 本轮实现

本轮实际涉及的文件包括：

1. `src/lib/codecs/code-normalization.ts`
2. `src/features/engineering/tabs/change-orders.tsx`
3. `src/features/engineering/services/change-order-service.ts`
4. `src/features/engineering/hooks/use-change-order-write-actions.ts`
5. `src/features/engineering/adapters/product-api-adapter.ts`
6. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
7. `src/features/engineering/hooks/use-bom-form.ts`

### 关键实现点

1. **公共规范函数**
   - 在 `code-normalization.ts` 中新增：
     - `normalizeSiteCode`
     - `normalizeChangeOrderNo`
     - `normalizeRevisionNo`
   - 这样这批变更控制字段不再依赖散落的局部 `trim / toUpperCase`。

2. **Change Order 输入与提交边界**
   - `change-orders.tsx`
     - `changeOrderNo` 输入改为统一走 `normalizeChangeOrderNo`
     - `siteCode` 输入改为统一走 `normalizeSiteCode`
     - `revisionNo` 输入改为统一走 `normalizeRevisionNo`
     - 编辑态回填 `normalizeOrder()` 也统一复用上述规范函数
     - `handleSave()` 提交前再次统一规范三者，并保持 `siteCode` 与 `isDefaultSite` 的原有联动语义

3. **保存边界兜底**
   - `change-order-service.ts`
     - 新增 `normalizeChangeOrderInput()`
     - 保存前统一规范 `changeOrderNo / siteCode / revisionNo`
     - 保持 `siteCode === ''` 时默认站点语义仍成立
   - `use-change-order-write-actions.ts`
     - mutation 入口再次兜底统一规范三者

4. **Product DTO 出入口兜底**
   - `product-api-adapter.ts`
     - API -> contract 时统一规范：
       - `revisionNo`
       - `changeOrderNo`
       - `siteCode`
     - contract -> API DTO 时同样统一规范以上字段
   - 这样 Product 主数据链与 ChangeOrder 侧不会各自继续漂移

5. **BOM 关联链路口径同步**
   - `bom-form-header.tsx`
     - 选择 change order 时，回填到 BOM 表头的 `changeOrderNo / siteCode / revisionNo` 统一复用规范函数
     - change order 下拉展示标签中的 `changeOrderNo` 也统一走规范化
   - `use-bom-form.ts`
     - 初始化编辑态/新建态时，对 `revisionNo` 统一走 `normalizeRevisionNo`

### 规则分型结果

到这一步，engineering 域内已经明确形成以下几类 normalization 语义：

1. **小写 slug 机器值**
   - `ProductAttributeCategory.key`
   - `ProductAttributeOption.value`

2. **大写机器码 / 业务编码**
   - `ProductTemplate.code`
   - `ProductType.code`
   - `Product.sku`

3. **稳定大写键 / 引用键**
   - `ProductTemplate.componentKey`
   - `Product.templateKey`

4. **固定格式数字码**
   - `Product.modelCode`

5. **变更控制字段**
   - `siteCode`
   - `changeOrderNo`
   - `revisionNo`

这意味着 normalization 已经不只是“码字段大小写清洗”，而是在 engineering 内开始覆盖业务控制字段契约。

### 明确未动范围

本轮没有动以下字段：

1. `title`
2. `description`
3. `effectiveFrom`
4. `effectiveTo`
5. 其它自由文本字段

原因：

1. 它们不属于明确机器字段。
2. 将日期或说明文案纳入同类规则会明显扩大风险面。

### 本轮收益

1. `changeOrderNo / siteCode / revisionNo` 不再依赖单页局部 `toUpperCase / trim`。
2. ChangeOrder、Product、BOM 三条相邻链路对这批控制字段开始共享统一口径。
3. `siteCode` 与 `isDefaultSite` 的原有业务联动在规范化后仍保持稳定。

### 验证结果

已执行：

1. `pnpm exec eslint src/lib/codecs/code-normalization.ts src/features/engineering/tabs/change-orders.tsx src/features/engineering/services/change-order-service.ts src/features/engineering/hooks/use-change-order-write-actions.ts src/features/engineering/adapters/product-api-adapter.ts src/features/engineering/components/bom-editor/bom-form-header.tsx src/features/engineering/hooks/use-bom-form.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 类型检查通过。
2. 目标文件 ESLint 无 error。
3. 仍存在 2 条既有 hooks warning：
   - `change-orders.tsx` 的 `useMemo` 依赖提示
   - `use-bom-form.ts` 的 `useEffect` 依赖提示
   - 本轮未扩大范围去顺手改动这两处结构性 warning。

### 当前结果判断

到这一步，engineering 内的 normalization 已经从：

1. 属性机器值
2. 模板/类型机器值
3. Product 主数据码字段

继续扩展到了：

4. **Product / ChangeOrder / BOM 共用的变更控制字段**

下一步若继续推进，最合理的是：

1. 继续盘点 BOM / ECO 侧其它明确控制字段
2. 评估 `bomNo / bomVersion` 是否也需要按语义分型进入 normalization
3. 视复杂度决定是否把当前 normalization 进一步整理成更显式的 family 目录

## 2026-04-12 - engineering：清理 `change-orders.tsx` / `use-bom-form.ts` 的 hooks warning

### 本轮目标

清理上一轮变更控制字段收口后仍保留的 2 条既有 hooks warning，但不扩大到其它业务逻辑重构：

1. `src/features/engineering/tabs/change-orders.tsx`
2. `src/features/engineering/hooks/use-bom-form.ts`

### 实际变更

1. `change-orders.tsx`
   - 新增稳定空数组常量：
     - `EMPTY_CHANGE_ORDERS`
     - `EMPTY_PRODUCTS`
   - 将 `query.data ?? []` 改为稳定引用回退，避免 `products` 在 `useMemo` 依赖上每次 render 生成新数组。

2. `use-bom-form.ts`
   - 新增稳定空数组常量：
     - `EMPTY_PRODUCTS`
     - `EMPTY_CHANGE_ORDERS`
     - `EMPTY_MATERIALS`
   - 将 `query.data ?? []` 改为稳定引用回退，避免 `changeOrders` 在 `useEffect` 依赖上每次 render 生成新数组。

### 本轮收益

1. 清除了 2 条与稳定默认数组有关的 hooks warning。
2. 不改业务语义，只做最小结构修正。
3. 为后续继续做 engineering 域清理时提供了统一的“稳定空集合”处理方式。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/tabs/change-orders.tsx src/features/engineering/hooks/use-bom-form.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标文件 ESLint 无 error / warning。
2. TypeScript 类型检查通过。

## 2026-04-12 - architecture：BOM/ECO 控制字段接入全局码规范化

### 本轮目标

继续扩展 engineering 域内的 normalization，将 BOM/ECO 侧最明确的一组控制字段统一收口：

1. `bomNo`
2. `bomVersion`

这一批继续按字段职责分型处理：

1. **业务编号**：`bomNo`
2. **版本标签**：`bomVersion`

其中 `bomVersion` 本轮只做最小规范收口，保留类似 `V1.0` 的格式语义，不擅自改写版本演进策略。

### 本轮实现

本轮实际涉及的文件包括：

1. `src/lib/codecs/code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/services/bom-service.ts`
5. `src/features/engineering/components/bom-action-dialog.tsx`
6. `src/features/engineering/tabs/bom-mgmt.tsx`
7. `src/features/engineering/data/schema.ts`

### 关键实现点

1. **公共规范函数**
   - 在 `code-normalization.ts` 中新增：
     - `normalizeBomNo`
     - `normalizeBomVersion`
   - 这样 `bomNo / bomVersion` 不再依赖散落的默认值或局部展示规则。

2. **BOM 表单初始化与回填边界**
   - `use-bom-form.ts`
     - 默认值中的 `bomVersion` 改为统一走 `normalizeBomVersion('V1.0')`
     - 新建态 `bomNo` 改为统一走 `normalizeBomNo('')`
     - 编辑态回填时统一规范：
       - `bomNo`
       - `bomVersion`
       - `bomDisplayVersion`
     - 新建态初始化时同样统一规范 `bomVersion / bomDisplayVersion`
   - 同时修复了本轮中途暴露出的：
     - `Product` 类型缺失
     - `version` 缺失
     - 对 hook 返回值 `deltaProxy` 的非法写入

3. **BOM 表头展示与输入边界**
   - `bom-form-header.tsx`
     - `bomNo` 展示与输入统一走 `normalizeBomNo`
     - `bomVersion` 展示与输入统一走 `normalizeBomVersion`
   - 即便 `bomVersion` 当前主要是只读展示，也保证表头口径与初始化、保存边界一致。

4. **保存边界兜底**
   - `bom-service.ts`
     - 新增 `normalizeBOMInput()`
     - 保存前统一规范：
       - `bomNo`
       - `bomVersion`
       - `bomDisplayVersion`
     - create 与 patch 统一复用同一口径

5. **提交前兜底**
   - `bom-action-dialog.tsx`
     - 提交前再次统一规范 `bomNo / bomVersion / bomDisplayVersion`
     - 编辑态继续通过 `deltaProxy + commitDelta()` 计算最终提交差异
   - `bom-mgmt.tsx`
     - 上层提交入口也统一规范 `bomNo / bomVersion / bomDisplayVersion`
     - 编辑态改为直接消费 dialog 传回的 `delta`，避免重复在页面层再算一遍

6. **Schema 格式表达**
   - `data/schema.ts`
     - `bomNo` 改为 `trim()`
     - `bomVersion` 改为：
       - `trim()`
       - `regex(/^V[0-9]+(\\.[0-9]+)*$/)`
     - 这样 `V1.0` 语义在 schema 层也有明确表达

### 规则分型结果

到这一步，engineering 域内已经形成以下几类 normalization 语义：

1. **小写 slug 机器值**
2. **大写机器码 / 业务编码**
3. **稳定大写键 / 引用键**
4. **固定格式数字码**
5. **变更控制字段**
6. **BOM/ECO 控制字段**

其中本轮新增的是：

1. `bomNo`
2. `bomVersion`

这意味着 normalization 已从 Product 与 ChangeOrder，继续扩展到了 BOM/ECO 自身的编号与版本控制语义。

### 明确未动范围

本轮没有动以下字段：

1. `description`
2. `items`
3. `substitutes`
4. `standardUsage`
5. 其它工艺或路线版本字段

原因：

1. 它们不属于当前最明确的 BOM/ECO 控制字段。
2. 若把它们混入同批规则，会明显扩大风险面。

### 本轮收益

1. `bomNo / bomVersion / bomDisplayVersion` 开始在初始化、展示、提交、保存四层共享统一口径。
2. `V1.0` 这类版本格式在 schema 层也有了明确表达。
3. create 与 patch 两条 BOM 保存链路避免继续各自漂移。

### 验证结果

已执行：

1. `pnpm exec eslint "src/features/engineering/hooks/use-bom-form.ts" "src/features/engineering/components/bom-action-dialog.tsx" "src/features/engineering/tabs/bom-mgmt.tsx" "src/features/engineering/components/bom-editor/bom-form-header.tsx" "src/features/engineering/services/bom-service.ts" "src/features/engineering/data/schema.ts" "src/lib/codecs/code-normalization.ts"`
2. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 类型检查通过。
2. 目标文件 ESLint 通过。

### 当前结果判断

到这一步，engineering 内的 normalization 已经从：

1. 属性机器值
2. 模板/类型机器值
3. Product 主数据码字段
4. Product / ChangeOrder / BOM 共用的变更控制字段

继续扩展到了：

5. **BOM / ECO 自身的编号与版本控制字段**

下一步若继续推进，最合理的是：

1. 继续盘点 BOM / ECO 侧是否还有其它明确控制字段
2. 评估是否需要把 `bomDisplayVersion` 从派生字段进一步收拢为更明确的单一来源策略
3. 视复杂度决定是否把当前 normalization 继续整理成更显式的 family 目录

## 2026-04-12 - architecture：BOM/ECO `bomDisplayVersion` 单一来源治理

### 本轮目标

在 `bomNo / bomVersion` 已接入 normalization 之后，继续治理 `bomDisplayVersion` 的字段角色与读取口径。当前最关键的问题不再是大小写，而是：

1. `bomDisplayVersion` 在多个边界重复回写
2. 列表 / 预览 / 打印层又单独读取旧字段
3. `delta / save / display` 三层之间存在继续漂移风险

因此本轮目标是把 `bomDisplayVersion` 从“多处回写的半持久化字段”收拢成**前端单一来源派生口径**。

### 本轮实现

本轮实际涉及的文件包括：

1. `src/lib/codecs/code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-action-dialog.tsx`
4. `src/features/engineering/tabs/bom-mgmt.tsx`
5. `src/features/engineering/components/bom-mgmt/bom-table.tsx`
6. `src/features/engineering/components/bom-mgmt/bom-preview.tsx`

### 关键实现点

1. **新增统一派生入口**
   - 在 `code-normalization.ts` 中新增：
     - `deriveBomDisplayVersion(bomVersion)`
   - 当前实现统一复用 `normalizeBomVersion()`，使 `bomDisplayVersion` 在前端语义上明确成为 `bomVersion` 的展示派生结果。

2. **移除 form 初始化层的重复回写**
   - `use-bom-form.ts`
     - 编辑态初始化不再主动把 `bomDisplayVersion` 再回写一份
     - 新建态初始化也不再主动写入 `bomDisplayVersion`
   - 表单真正的单一业务输入继续收敛在：
     - `bomNo`
     - `bomVersion`

3. **移除 dialog / page 提交层的重复回写**
   - `bom-action-dialog.tsx`
     - 提交前不再重复构造 `bomDisplayVersion`
   - `bom-mgmt.tsx`
     - 页面提交入口同样不再重复构造 `bomDisplayVersion`
   - 这样 `delta` 计算与编辑态提交不再因为 display 字段复制而制造额外噪音。

4. **统一展示层读取口径**
   - `bom-table.tsx`
     - 展示时优先使用：
       - `deriveBomDisplayVersion(row.original.bomVersion || row.original.bomDisplayVersion)`
   - `bom-preview.tsx`
     - 预览显示与打印模板都统一使用：
       - `deriveBomDisplayVersion(bom.bomVersion || bom.bomDisplayVersion)`
   - 这意味着前端展示层开始以 `bomVersion` 为主、`bomDisplayVersion` 为兼容回退，而不是继续盲目信任旧字段。

### 当前字段角色判断

在当前前端实现中，`bomDisplayVersion` 已经被收拢成：

1. **展示派生字段**

而不再是：

1. 需要在 form 初始化、dialog 提交、page 提交三层都重复主动写入的字段

### 本轮收益

1. `bomDisplayVersion` 的前端语义明显清晰：它主要来源于 `bomVersion`。
2. `use-bom-form / bom-action-dialog / bom-mgmt` 三处重复回写被收掉，减少了 `delta` 漂移风险。
3. table / preview / print 三种展示口径开始统一，避免一个地方显示旧值、另一个地方显示新值。

### 当前仍保留的兼容策略

本轮没有直接粗暴删除 `bomDisplayVersion` 字段，而是采用：

1. **前端派生为主**
2. **旧字段兼容回退**

这样做的原因是：

1. 需要兼容现有数据结构
2. 需要避免在未确认后端契约前就擅自移除字段

### 验证结果

已执行：

1. `pnpm exec eslint "src/lib/codecs/code-normalization.ts" "src/features/engineering/hooks/use-bom-form.ts" "src/features/engineering/components/bom-action-dialog.tsx" "src/features/engineering/tabs/bom-mgmt.tsx" "src/features/engineering/services/bom-service.ts" "src/features/engineering/components/bom-mgmt/bom-table.tsx" "src/features/engineering/components/bom-mgmt/bom-preview.tsx"`
2. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 类型检查通过。
2. 目标文件 ESLint 无 error。
3. 仍保留 1 条既有 warning：
   - `bom-table.tsx` 中 `useReactTable()` 的 `react-hooks/incompatible-library`
   - 这是 TanStack Table 的既有兼容性提示，不是本轮新增错误。

### 当前结果判断

到这一步，engineering 内关于 BOM 版本字段的治理已经从：

1. `bomNo / bomVersion` 的 normalization

进一步扩展到了：

2. `bomDisplayVersion` 的前端单一来源治理

下一步若继续推进，最合理的是：

1. 进一步确认后端是否真的需要持久化 `bomDisplayVersion`
2. 若后端不依赖，继续评估在 schema / mutation-types / save payload 中进一步弱化或移除它
3. 继续盘点 BOM / ECO 侧是否还有其它明确控制字段值得纳入同类治理

## 2026-04-12 - architecture：BOM/ECO 生命周期与生效控制字段治理

### 本轮目标

继续沿着 BOM/ECO 头部控制字段推进，不再新增编号/版本字段，而是收口两类控制语义：

1. **生命周期枚举控制字段**
   - `changeType`
   - `status`
2. **生效日期边界字段**
   - `effectiveFrom`
   - `effectiveTo`

这一批的目标不是 machine code normalization，而是统一：

1. form 初始化
2. 表单输入
3. 提交保存边界
4. table / preview 展示口径

### 本轮实现

本轮实际涉及的文件包括：

1. `src/lib/codecs/code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/services/bom-service.ts`
5. `src/features/engineering/components/bom-mgmt/bom-table.tsx`
6. `src/features/engineering/components/bom-mgmt/bom-preview.tsx`

### 关键实现点

1. **公共规范函数**
   - 在 `code-normalization.ts` 中新增：
     - `normalizeBomChangeType`
     - `normalizeBomStatus`
     - `normalizeBomEffectiveDate`
   - 其中：
     - `changeType` 被收口为稳定枚举：`MANUAL | ECO | ECN`
     - `status` 被收口为稳定枚举：`draft | active | archived`
     - `effectiveFrom / effectiveTo` 统一收口为 `YYYY-MM-DD` 边界字符串

2. **表单初始化与回填口径**
   - `use-bom-form.ts`
     - 默认值改为统一走：
       - `normalizeBomChangeType('MANUAL')`
       - `normalizeBomStatus('active')`
     - 编辑态回填统一规范：
       - `changeType`
       - `status`
       - `effectiveFrom`
       - `effectiveTo`
     - 新建态初始化同样走统一默认口径

3. **表单输入与回填交互口径**
   - `bom-form-header.tsx`
     - 选择 change order 后回填 `changeType` 时改为统一走 `normalizeBomChangeType`
     - 回填 `effectiveFrom / effectiveTo` 时改为统一走 `normalizeBomEffectiveDate`
     - 新增统一的字段读取与输入处理入口：
       - `getNormalizedFieldValue`
       - `handleNormalizedFieldChange`
     - `changeType / status / effectiveFrom / effectiveTo` 不再依赖局部字符串直写或零散 `slice(0, 10)`

4. **保存边界兜底**
   - `bom-service.ts`
     - 保存前统一规范：
       - `changeType`
       - `status`
       - `effectiveFrom`
       - `effectiveTo`
   - 这样 create / patch 两条链路继续共享同一口径

5. **展示层读取口径**
   - `bom-preview.tsx`
     - 预览页中的 `changeType` 改为统一走 `normalizeBomChangeType`
     - 预览页中的 `effectiveFrom` 改为统一走 `normalizeBomEffectiveDate`
   - `bom-table.tsx`
     - 变更信息列中的 `changeType` 与 `effectiveFrom` 改为统一走公共规范函数
     - 状态列中的 `status` 改为统一走 `normalizeBomStatus`

### 字段分型结果

到这一步，engineering 内和 BOM 相关的控制字段已经至少形成三种分型：

1. **编号/版本控制字段**
   - `bomNo`
   - `bomVersion`
   - `bomDisplayVersion`
2. **变更控制字段**
   - `changeOrderNo`
   - `siteCode`
   - `revisionNo`
3. **生命周期与生效控制字段**
   - `changeType`
   - `status`
   - `effectiveFrom`
   - `effectiveTo`

这说明当前治理已经不再只是“大小写清洗”，而是在逐步把 engineering 内部不同语义的字段收口成更清晰的 family。

### 本轮收益

1. `changeType / status` 不再依赖局部字符串直写，开始使用稳定枚举入口。
2. `effectiveFrom / effectiveTo` 不再由多个组件各自 `slice(0, 10)`，开始统一走单一日期边界格式函数。
3. form / service / table / preview 四层在这批字段上开始共享同一口径。

### 验证结果

已执行：

1. `pnpm exec eslint "src/lib/codecs/code-normalization.ts" "src/features/engineering/hooks/use-bom-form.ts" "src/features/engineering/components/bom-editor/bom-form-header.tsx" "src/features/engineering/services/bom-service.ts" "src/features/engineering/components/bom-mgmt/bom-table.tsx" "src/features/engineering/components/bom-mgmt/bom-preview.tsx"`
2. `pnpm exec tsc --noEmit`

结果：

1. TypeScript 类型检查通过。
2. 目标文件 ESLint 无 error。
3. `bom-table.tsx` 仍保留 1 条既有 warning：
   - `useReactTable()` 的 `react-hooks/incompatible-library`
   - 属于 TanStack Table 的既有兼容性提示，不是本轮新增问题。

### 当前结果判断

到这一步，BOM/ECO 头部最明确的一组控制字段已经基本完成首轮治理：

1. 编号与版本控制
2. display version 单一来源
3. 生命周期与生效控制

下一步若继续推进，最合理的是：

1. 再确认 schema 层是否要进一步显式表达 `effectiveFrom / effectiveTo` 的日期格式约束
2. 继续判断后端是否真的需要持久化 `bomDisplayVersion`
3. 评估 BOM/ECO 侧是否还存在需要单独分型的其它头部控制字段

## 2026-04-12 - architecture：BOM/ECO 生效日期 schema 约束显式化

### 本轮目标

在上一轮已经完成 `effectiveFrom / effectiveTo` 前端统一口径之后，继续把这组日期字段的要求下沉到 schema 层，补齐最终模型契约：

1. 允许空值
2. 非空时必须满足 `YYYY-MM-DD`

### 本轮实现

本轮实际涉及的文件包括：

1. `src/features/engineering/data/schema.ts`

### 关键实现点

1. **新增日期控制字段 schema**
   - 在 `schema.ts` 中新增：
     - `optionalControlDateSchema`
   - 规则为：
     - `trim()`
     - `nullable()`
     - `optional()`
     - `regex(/^$|^\\d{4}-\\d{2}-\\d{2}$/)`

2. **下沉到 masterDataControlSchema**
   - `effectiveFrom`
   - `effectiveTo`
   - 两个字段都改为统一复用 `optionalControlDateSchema`

### 当前契约结果

到这一步，这两个字段在 schema 层的契约已经明确为：

1. `undefined` 允许
2. `null` 允许
3. 空字符串允许
4. 非空字符串必须满足 `YYYY-MM-DD`

这与当前前端其它层的口径保持一致：

1. `input type='date'`
2. `normalizeBomEffectiveDate()`
3. `use-bom-form / bom-form-header / bom-service`

### 本轮收益

1. `effectiveFrom / effectiveTo` 不再只是 UI 和 service 层约定，而是成为了显式 schema 契约。
2. 历史 ISO 字符串仍可通过初始化层先裁剪，再安全进入表单。
3. 日期边界要求在模型层可被直接验证，不再完全依赖组件实现细节。

### 验证结果

已执行：

1. `pnpm exec eslint "src/features/engineering/data/schema.ts" "src/features/engineering/hooks/use-bom-form.ts" "src/features/engineering/components/bom-editor/bom-form-header.tsx" "src/features/engineering/services/bom-service.ts"`
2. `pnpm exec tsc --noEmit`

结果：

1. 未见新增业务错误。
2. 本轮未引入新的已知 lint / type 问题。

### 当前结果判断

到这一步，BOM/ECO 头部控制字段的治理已经进一步从：

1. 前端统一口径

下沉到了：

2. **schema 契约显式表达**

这意味着 `effectiveFrom / effectiveTo` 这组字段已经同时具备：

1. 输入层统一
2. 保存层统一
3. 展示层统一
4. 模型层显式验证

## 2026-04-12 - architecture：BOM `bomDisplayVersion` 请求/响应口径分离

### 本轮目标

在确认 `bomDisplayVersion` 后端本质上只是响应派生字段后，继续把请求口径与响应口径分离：

1. 前端不再主动把 `bomDisplayVersion` 当作可写字段提交
2. 后端 `SaveBOMInput` 不再通过完整模型隐式接收该字段
3. 继续保留响应阶段的 `bomDisplayVersion` 派生兼容

### 本轮实现

本轮实际涉及的文件包括：

1. `src/features/engineering/mutation-types.ts`
2. `src/features/engineering/services/bom-service.ts`
3. `server/services/engineering_master_service.go`

### 关键实现点

1. **前端输入类型收口**
   - `mutation-types.ts`
   - 将：
     - `SaveBOMInput = BOM`
   - 收口为：
     - `SaveBOMInput = Omit<BOM, 'bomDisplayVersion'>`
   - 这样 `bomDisplayVersion` 在前端类型层面不再被视为可写提交字段。

2. **前端 save payload 收口**
   - `bom-service.ts`
   - `normalizeBOMInput()` 不再构造或附带 `bomDisplayVersion`
   - 保存时仅提交真正可写字段，例如：
     - `bomNo`
     - `bomVersion`
     - `changeType`
     - `status`
     - `effectiveFrom`
     - `effectiveTo`

3. **后端输入 DTO 收口**
   - `engineering_master_service.go`
   - 将：
     - `type SaveBOMInput models.BOM`
   - 改为明确的输入 DTO 结构
   - 这个输入 DTO 只保留真正可写字段，不再通过完整模型隐式容纳 `DisplayVersion`
   - 同时新增：
     - `func (input SaveBOMInput) toModel() models.BOM`
   - 由该函数统一映射到持久化模型

4. **响应兼容层保持不动**
   - 本轮没有删除：
     - `resolveBOMDisplayVersion()`
     - `hydrateBOMDerivedFields()`
   - 继续保留后端响应里的 `bomDisplayVersion` 派生结果，避免破坏现有前端展示兼容。

### 当前结果判断

到这一步，`bomDisplayVersion` 的角色在前后端都进一步清晰了：

1. **不是可写请求字段**
2. **不是数据库持久化字段**
3. **是响应阶段派生字段**

这意味着 BOM 版本相关字段已经形成较清晰的职责分层：

1. `bomVersion` 负责业务版本值
2. `bomDisplayVersion` 负责兼容展示输出

### 本轮收益

1. 前端 payload 不再继续提交冗余的 display 字段。
2. 后端输入 DTO 不再通过完整模型把派生响应字段暴露为“可提交字段”。
3. 请求/响应边界比之前更清晰，后续继续弱化 `bomDisplayVersion` 的历史负担会更安全。

### 验证结果

已执行：

1. `pnpm exec eslint "src/features/engineering/mutation-types.ts" "src/features/engineering/services/bom-service.ts"`
2. `pnpm exec tsc --noEmit`
3. `go test ./services ./handlers -run "BOM|Engineering"`

结果：

1. 前端 TypeScript 检查通过。
2. 目标前端文件 ESLint 无 error。
3. 后端 `services / handlers` 定向 Go 校验通过。

### 当前阶段结论

到这一步，`bomDisplayVersion` 已经完成从“前后端都可写的混合字段”向“响应派生字段”的进一步收口。后续如果继续推进，最自然的方向是：

1. 继续盘点是否还有类似“请求 DTO 与响应 DTO 混用”的工程字段
2. 或进一步评估是否要在后端响应层把 `version` / `bomVersion` 的命名关系整理得更清晰

## 2026-04-12 - architecture：Product 主数据链路 write contract 收口

### 本轮目标

在完成 BOM 请求/响应口径分离后，继续排查 engineering 内部更底层的 DTO 边界问题，并优先收口 Product 主数据链路中最明显的结构性问题：

1. `SaveProductInput = Product`

目标是让 Product 保存输入不再直接复用完整响应/领域模型。

### 本轮实现

本轮实际涉及的文件包括：

1. `src/features/engineering/mutation-types.ts`
2. `src/features/engineering/adapters/product-api-adapter.ts`
3. `src/features/engineering/services/product-maintenance-service.ts`
4. `src/features/engineering/hooks/use-product-write-actions.ts`

### 关键实现点

1. **SaveProductInput 收口为 write contract**
   - `mutation-types.ts`
   - 将：
     - `SaveProductInput = Product`
   - 收口为：
     - `Omit<Product, 'id' | 'version' | 'createdAt'> & { id?: string; version?: number; createdAt?: string }`
   - 这一步的核心意义不是改变行为，而是明确：
     - 保存输入不是完整响应模型
     - `id / version / createdAt` 在写入语义上属于单独控制字段

2. **Product adapter 显式围绕 write contract 工作**
   - `product-api-adapter.ts`
   - `toProductApiDTO()` 继续负责 write contract 到 API DTO 的转换
   - `PRODUCT_PATCH_FIELDS` 从 `keyof Product` 收口为 `keyof SaveProductInput`
   - `buildProductDelta()` 因此不再默认以完整 Product 响应模型为 patch 字段全集

3. **ProductMaintenanceService 输入边界同步收口**
   - `product-maintenance-service.ts`
   - `createProduct / patchProduct / saveProduct / bulkSyncProducts` 统一围绕 `SaveProductInput` 工作
   - create 时显式构造 write payload，再交给 adapter 做 API DTO 转换

4. **写入 hooks 跟随 write contract**
   - `use-product-write-actions.ts`
   - `saveProducts` 与 `syncProducts` 的 mutation 输入类型改为 `SaveProductInput[]`
   - 保持现有页面使用方式不变，只收窄写入边界的类型语义

### 轻量复核结果

本轮还额外轻量复核了：

1. `ProductAttributeCategory`
2. `ProductAttributeOption`
3. `ChangeOrder`

当前判断如下：

1. **ProductAttributeCategory / ProductAttributeOption**
   - 前端已使用 `Omit<id | version>` 作为保存输入
   - 虽然后端仍存在 `type SaveProductAttributeOptionInput models.ProductAttributeOption` 这类模型别名输入，但本轮尚未发现明确的派生展示字段被当作可写字段问题
   - 现阶段更像是“后端输入 DTO 仍可进一步精细化”，不是立刻必须处理的高优先级问题

2. **ChangeOrder**
   - 前端已使用 `SaveChangeOrderInput`
   - 当前链路中未见类似 `bomDisplayVersion` 这种明确的派生展示字段混入可写请求
   - 仍可作为后续 DTO 精细化候选，但本轮没有足够收益去扩大范围

因此，本轮决定：

1. **只实施 Product 主链路收口**
2. 其它三个候选仅记录复核结论，暂不扩大改动

### 本轮收益

1. Product 主数据保存输入不再直接等价于完整 Product 响应模型。
2. Product adapter 与 ProductMaintenanceService 的职责边界更清晰。
3. engineering 这条治理线开始从“字段规范化”继续下沉到“写入契约收口”。

### 验证结果

已执行：

1. `pnpm exec eslint "src/features/engineering/mutation-types.ts" "src/features/engineering/adapters/product-api-adapter.ts" "src/features/engineering/services/product-maintenance-service.ts" "src/features/engineering/hooks/use-product-write-actions.ts"`
2. `pnpm exec tsc --noEmit`

结果：

1. 目标文件 ESLint 无 error。
2. TypeScript 类型检查通过。

### 当前阶段结论

到这一步，engineering 内部 DTO 边界治理的优先级已经更清晰：

1. **BOM 请求/响应分离** 已完成
2. **Product write contract 收口** 已完成
3. `ProductAttributeCategory / ProductAttributeOption / ChangeOrder` 暂列为次级候选，当前无需扩大实施

## 2026-04-12 - architecture：Product 后端保存链路 DTO 收口

### 本轮目标

在前端 Product write contract 已收口的基础上，继续让后端 Product 保存链路对齐契约边界：

1. 保留现有 HTTP 请求字段兼容
2. 保留现有 `ProductApiDTO` 响应契约稳定
3. 将后端内部保存输入从宽 DTO 中进一步剥离出来

### 本轮实现

本轮实际涉及的文件包括：

1. `server/services/product_service_types.go`
2. `server/services/product_master_service.go`

### 关键实现点

1. **新增内部 ProductWriteInput**
   - 在 `product_service_types.go` 中新增 `ProductWriteInput`
   - 它只服务于后端 service 内部写入流程
   - 目的是把：
     - 外部 HTTP 输入 DTO
     - 内部保存输入
   - 这两层语义明确分开

2. **保留 `SaveProductAPIRequest` 作为外部 HTTP 输入 DTO**
   - 本轮没有改动 handler 对外绑定类型
   - `SaveProductHandler` 仍然接收：
     - `SaveProductAPIRequest`
   - 这样可以保持现有前端请求兼容

3. **新增 `toProductWriteInput()` 转换**
   - 将 `SaveProductAPIRequest` 转为内部 `ProductWriteInput`
   - 后端后续保存、PATCH 合成、批量同步不再直接在 `SaveProductAPIRequest` 上做内部流转

4. **`toProductModel()` 改为只接收 `ProductWriteInput`**
   - 这样 `models.Product` 的构造只从内部 write input 出发
   - 不再让外部 HTTP DTO 直接承担内部模型映射职责

5. **保存主路径改为统一走 `saveProductFromWriteInput()`**
   - 在 `product_master_service.go` 中抽出：
     - `saveProductFromWriteInput(input ProductWriteInput)`
   - 然后：
     - `SaveProduct()` 先把 `SaveProductAPIRequest` 转成 `ProductWriteInput`
     - 再交给统一保存逻辑

6. **PATCH 合成路径改为围绕 `ProductWriteInput` 工作**
   - `BuildProductPatchInput()` 返回值由：
     - `SaveProductAPIRequest`
   - 改为：
     - `ProductWriteInput`
   - 当前 delta 字段白名单保持不变
   - 只是把 patch 合成目标从宽 DTO 换成更明确的内部 write input

7. **批量同步路径改为先转内部 write input**
   - `BulkSyncProducts()` 仍接收外部 payload：
     - `BulkSyncProductsAPIPayload`
   - 但内部改为：
     - `SaveProductAPIRequest -> ProductWriteInput -> models.Product`
   - 从而弱化 `SaveProductAPIRequest` 在 service 内部的职责扩散

### 本轮未扩大范围的部分

本轮刻意保持不动：

1. `ProductApiDTO` 响应契约
2. handler 对外请求字段名
3. `templateKey` 的外部兼容字段

原因是本轮的目标是**输入层职责收口**，不是一口气重构整个 Product API 契约。

### 本轮收益

1. 后端 Product 链路已经形成更清晰的三段分层：
   - HTTP 输入 DTO
   - 内部 write input
   - 响应 DTO

2. `SaveProductAPIRequest` 不再继续承担所有内部保存职责。

3. `SaveProduct / BuildProductPatchInput / BulkSyncProducts` 的内部输入语义已统一到同一条 write input 线上。

4. 前端已经收口的 Product write contract，现在在后端也有了更明确的对应层次。

### 验证结果

已执行：

1. `go test ./services ./handlers -run "Product|Engineering"`
2. `go test ./services ./handlers -run ^$`

结果：

1. Product / Engineering 定向 Go 校验通过。
2. `services / handlers` 空跑编译校验通过。

### 当前阶段结论

到这一步，Product 主数据链路已经在前后端两侧都完成了第一轮 DTO 边界收口：

1. 前端已不再把完整 `Product` 直接当保存输入
2. 后端也已不再让 `SaveProductAPIRequest` 继续充当唯一的内部保存模型

这意味着 engineering 这条治理线已经从“字段规范化”继续推进到了“请求/内部写入/响应”三层契约边界的实际落地。

## 2026-04-12 - architecture：Product `templateKey` 字段角色显式化

### 本轮目标

在 Product 主数据链路前后端 DTO 收口的基础上，继续把 `templateKey` 的字段角色讲清楚：

1. 它不是保存字段
2. 它来自后端派生
3. 它只作为响应兼容字段保留

### 本轮实现

本轮没有继续扩大业务逻辑改动，而是采用“最小行为变更 + 回归测试补强”的方式落地：

1. 复核后端当前事实：
   - `models.Product.TemplateKey` 使用 `gorm:"-"`
   - `ProductWriteInput` 不包含 `templateKey`
   - `BuildProductPatchInput()` 的白名单不包含 `templateKey`
   - `BulkSyncProducts()` 也不会写入 `templateKey`

2. 新增定向测试文件：
   - `server/services/product_master_service_test.go`

### 新增测试点

1. **`BuildProductPatchInput()` 拒绝 `templateKey` delta**
   - 新增测试：
     - `TestBuildProductPatchInputRejectsTemplateKeyDelta`
   - 目的：证明 `templateKey` 不属于 Product PATCH 可写字段白名单

2. **`templateKey` 只来自派生链路**
   - 新增测试：
     - `TestApplyDerivedTemplateKeysDerivesFromProductTypeTemplate`
   - 目的：证明当：
     - `Product.TypeID`
     - `ProductType.TemplateID`
     - `ProductTemplate.ComponentKey`
   - 建立关联后，`GetProductByID()` 返回的 `TemplateKey` 来自派生，而不是来自保存输入

### 本轮收益

1. `templateKey` 的事实角色被进一步锁定为：
   - **非持久化字段**
   - **非可写字段**
   - **响应派生字段**

2. 后续即使有人误把 `templateKey` 塞回 PATCH 或输入模型，也更容易被测试拦住

3. Product 主链路的 DTO 边界现在不仅靠实现约束，也开始有测试约束兜底

### 验证结果

已执行：

1. `go test ./services -run "Product|TemplateKey"`
2. `go test ./services ./handlers -run ^$`

结果：

1. `templateKey` 定向服务层测试通过
2. `services / handlers` 编译校验通过

### 当前阶段结论

到这一步，Product 主数据链路中 `templateKey` 的字段角色已经被进一步显式化：

1. 不落库
2. 不进入 save / patch / bulk sync 输入模型
3. 继续保留为后端派生的响应兼容字段

这意味着 Product 这条主链路中最容易产生“看起来像可写、实际上是派生”的边界模糊点，已经基本收口完成。

## 2026-04-12 - architecture：engineering 次级候选后端 DTO 收口

### 本轮目标

在 Product / BOM 主链路已经完成多轮 DTO 收口之后，继续清理 engineering 次级候选中的后端输入边界问题：

1. `ChangeOrder`
2. `ProductAttributeCategory`
3. `ProductAttributeOption`

其中本轮优先级是：

1. 先收口 `ChangeOrder`
2. 再最小收口 `ProductAttributeCategory / ProductAttributeOption` 的 create 输入 DTO

### 本轮实现

本轮实际涉及的文件包括：

1. `server/services/engineering_master_service.go`
2. `server/services/product_attribute_category_service.go`
3. `server/services/product_attribute_option_service.go`
4. `server/handlers/product_attribute_category.go`
5. `server/handlers/product_attribute_option.go`

### 关键实现点

1. **ChangeOrder 不再直接把 save input 当作模型别名使用**
   - `engineering_master_service.go`
   - 将 `SaveChangeOrderInput` 从：
     - `models.ChangeOrder` 的直接别名
   - 收口为显式的后端保存输入 DTO
   - 新增：
     - `toChangeOrderModel()`
   - 让 `SaveChangeOrder()` 改为围绕明确输入 DTO 转模型，而不是继续直接类型转换进 `models.ChangeOrder`

2. **ProductAttributeCategory create 路径不再直接绑定模型**
   - `product_attribute_category_service.go`
   - 新增显式的：
     - `SaveProductAttributeCategoryInput`
     - `toProductAttributeCategoryModel()`
   - `CreateProductAttributeCategory()` 改为接收 save input，再转换为 `models.ProductAttributeCategory`
   - `product_attribute_category.go` 中 create 分支也改为绑定 `services.SaveProductAttributeCategoryInput`

3. **ProductAttributeOption create 路径不再继续使用模型别名输入**
   - `product_attribute_option_service.go`
   - 将：
     - `type SaveProductAttributeOptionInput models.ProductAttributeOption`
   - 收口为显式 struct DTO
   - 新增：
     - `toProductAttributeOptionModel()`
   - `CreateProductAttributeOption()` 改为接收 save input，再转换为模型
   - `product_attribute_option.go` 中 create 分支改为绑定 `services.SaveProductAttributeOptionInput`

### 本轮刻意不扩大的范围

本轮有意保持以下范围不动：

1. `ChangeOrder` 响应阶段仍保持现有返回结构
2. `ProductAttributeCategory / ProductAttributeOption` 的 patch 路径继续沿用现有字段白名单逻辑
3. 不顺手改 Product / BOM 已稳定链路

原因是本轮目标是**后端输入层收口**，而不是再次扩大到完整响应 DTO 重构。

### 本轮收益

1. `ChangeOrder` 已不再继续使用模型别名充当后端保存输入。
2. `ProductAttributeCategory / ProductAttributeOption` 的 create 路径已去掉模型直绑。
3. engineering 次级候选的后端输入边界开始向 Product/BOM 已建立的治理方式靠拢。

### 验证结果

已执行：

1. `go test ./services ./handlers -run "ChangeOrder|ProductAttribute"`
2. `go test ./services ./handlers -run ^$`

结果：

1. ChangeOrder / ProductAttribute 定向 Go 校验通过。
2. `services / handlers` 编译校验通过。

### 当前阶段结论

到这一步，engineering 内部的 DTO 治理已经从主链路继续推进到次级候选：

1. `ChangeOrder` 已完成后端保存输入收口
2. `ProductAttributeCategory / ProductAttributeOption` 已完成 create 输入去模型直绑
3. 当前后续若继续推进，更适合评估是否要统一这些次级链路的响应 DTO 或 patch contract，但这已经不是本轮必须动作

## 2026-04-12 - architecture：ChangeOrder 响应 DTO 显式化

### 本轮目标

在 `ChangeOrder` 输入层已经完成收口的基础上，继续把其响应层从“模型直出”收口到显式 DTO / mapper 出口：

1. 统一 list / options / save 三个出口
2. 保持现有字段名兼容
3. 不扩大到独立 patch API

### 本轮实现

本轮实际涉及的文件包括：

1. `server/handlers/change_order_api_dto.go`
2. `server/handlers/change_order_mapper.go`
3. `server/handlers/change_orders.go`

### 关键实现点

1. **新增 `ChangeOrderApiDTO`**
   - 在 `change_order_api_dto.go` 中定义显式响应 DTO
   - 保持现有字段名不变，包括：
     - `id`
     - `changeOrderNo`
     - `title`
     - `productId`
     - `status`
     - `revisionNo`
     - `_v`
   - 同时保留 `product` 的兼容出口；若当前查询场景未 preload，则该字段可为空

2. **新增 `ChangeOrderListPageApiDTO`**
   - 用类型化分页响应替代匿名 `gin.H`
   - 明确分页输出结构：
     - `items`
     - `total`
     - `page`
     - `pageSize`

3. **新增 mapper 出口**
   - 在 `change_order_mapper.go` 中新增：
     - `toChangeOrderApiDTO()`
     - `toChangeOrderApiDTOs()`
   - 响应映射统一从这里出，避免 handler 继续直接回传 `models.ChangeOrder`

4. **统一 `GetChangeOrdersHandler` 的 list / options 出口**
   - `options=true` 时改为返回：
     - `toChangeOrderApiDTOs(items)`
   - 普通列表分页时改为返回：
     - `ChangeOrderListPageApiDTO`
     - 其中 `items` 来自 `toChangeOrderApiDTOs(items)`

5. **统一 `SaveChangeOrderHandler` 的保存返回出口**
   - 保存成功后改为返回：
     - `toChangeOrderApiDTO(saved)`
   - 从而让 save/list/options 三个出口都共享同一响应映射层

### 兼容策略

本轮刻意保持兼容：

1. **不改前端字段名**
2. **不删除 `product` 字段**
3. **不强制让 options 与 list 完全同态**

也就是说，当前仍允许：

1. options 场景没有 preload `Product`，因此 `product` 为空
2. list / save 场景若 preload 了 `Product`，则继续透出该字段

但无论哪种场景，现在都已经改为**通过 DTO / mapper 显式出口返回**，而不是直接从模型直出。

### 本轮收益

1. `ChangeOrder` 的响应层已经不再继续直接暴露 `models.ChangeOrder`。
2. list / options / save 三条路径已经统一到同一套 DTO 映射出口。
3. 后续如果要继续治理 `ChangeOrder` 的 options 精简 DTO 或详情 DTO，已经有了稳定入口。

### 验证结果

已执行：

1. `go test ./handlers ./services -run "ChangeOrder"`
2. `go test ./handlers ./services -run ^$`

结果：

1. ChangeOrder 定向 Go 校验通过。
2. `handlers / services` 编译校验通过。

### 当前阶段结论

到这一步，`ChangeOrder` 已经完成了两层关键收口：

1. 输入层不再直接围绕模型别名保存
2. 响应层不再直接模型直出，而是改为显式 DTO / mapper 出口

这意味着 engineering 次级候选里最复杂的一条链路，已经从“请求/保存/响应混用”明显推进到更清晰的契约边界状态。

## 2026-04-12 - architecture：ChangeOrder options DTO 瘦身

### 本轮目标

在 `ChangeOrder` 已经具备统一响应 DTO 出口的基础上，继续把 `options=true` 场景从较丰满的通用 DTO 中分离出来，显式收口为最小字段集：

1. 为 options 建立独立 DTO
2. 保持 list / save 继续沿用现有 `ChangeOrderApiDTO`
3. 不改前端字段名与现有读取逻辑

### 本轮实现

本轮实际涉及的文件包括：

1. `server/handlers/change_order_api_dto.go`
2. `server/handlers/change_order_mapper.go`
3. `server/handlers/change_orders.go`

### 关键实现点

1. **新增 `ChangeOrderOptionsApiDTO`**
   - 在 `change_order_api_dto.go` 中新增最小 options DTO
   - 当前保留字段包括：
     - `id`
     - `changeOrderNo`
     - `title`
     - `changeType`
     - `productId`
     - `siteCode`
     - `isDefaultSite`
     - `revisionNo`
     - `effectiveFrom`
     - `effectiveTo`
     - `status`
     - `_v`

2. **新增 options mapper**
   - 在 `change_order_mapper.go` 中新增：
     - `toChangeOrderOptionsApiDTO()`
     - `toChangeOrderOptionsApiDTOs()`
   - 让 options 场景不再继续共享较丰满的 `ChangeOrderApiDTO`

3. **收口 `options=true` 分支返回口径**
   - `change_orders.go` 中将：
     - `options=true`
   - 改为返回：
     - `toChangeOrderOptionsApiDTOs(items)`

4. **保持 list / save 现有口径不变**
   - 普通列表分页仍返回：
     - `ChangeOrderListPageApiDTO`
     - 内部 items 为 `ChangeOrderApiDTO`
   - 保存成功仍返回：
     - `ChangeOrderApiDTO`

### 兼容策略

本轮继续保持兼容优先：

1. **不修改字段名**
2. **不改 list / save DTO**
3. **不调整前端 schema / service / tab 读取逻辑**

因此，这一步的本质是：

1. 仅让 options 场景显式瘦身
2. 不改变现有页面主要依赖的 list / save 返回结构

### 本轮收益

1. `ChangeOrder` 的 options 返回语义已经与 list / save 显式分离。
2. `options=true` 不再继续共享较丰满 DTO，契约意图更清晰。
3. 后续若需要把 options 用于更轻量的下拉、选择器或缓存层，已经有明确稳定入口。

### 验证结果

已执行：

1. `go test ./handlers ./services -run "ChangeOrder"`
2. `go test ./handlers ./services -run ^$`

结果：

1. ChangeOrder 定向 Go 校验通过。
2. `handlers / services` 编译校验通过。

### 当前阶段结论

到这一步，`ChangeOrder` 的响应层已经从“单一 DTO 包打天下”进一步演进为：

1. `options=true` 走最小字段集 DTO
2. `list / save` 继续走较丰满的通用 DTO

这使得 `ChangeOrder` 的响应语义开始显式分层，同时仍把回归风险控制在很低的范围内。

## 2026-04-12 - architecture：ChangeOrder 响应分层定向测试

### 本轮目标

在 `ChangeOrder` 已经完成响应分层之后，补充最小但关键的 handler 定向测试，把当前契约边界固定下来：

1. 锁定 `options=true` 的最小字段集
2. 锁定普通 list 分页结构与较丰满 DTO 兼容出口
3. 锁定 save 成功响应继续返回 `ChangeOrderApiDTO`

### 本轮实现

本轮新增文件：

1. `server/handlers/change_orders_test.go`

### 测试实现点

1. **新增独立的 ChangeOrder handler 测试基建**
   - 在测试文件内创建最小 SQLite 表结构：
     - `products`
     - `change_orders`
   - 复用 `setupHandlerSQLiteTestDB()` 作为基础设施

2. **覆盖 `options=true` 最小字段集断言**
   - 新增：
     - `TestGetChangeOrdersHandlerOptionsReturnsMinimalDTO`
   - 验证返回 item 包含：
     - `id`
     - `changeOrderNo`
     - `title`
     - `changeType`
     - `productId`
     - `siteCode`
     - `isDefaultSite`
     - `revisionNo`
     - `effectiveFrom`
     - `effectiveTo`
     - `status`
     - `_v`
   - 同时验证**不包含**：
     - `product`
     - `description`
     - `createdAt`
     - `updatedAt`

3. **覆盖普通 list 分页结构与兼容字段**
   - 新增：
     - `TestGetChangeOrdersHandlerListReturnsPagedDTO`
   - 验证响应仍包含：
     - `items`
     - `total`
     - `page`
     - `pageSize`
   - 同时验证 item 仍保留较丰满 DTO 字段，例如：
     - `description`
     - `createdAt`
     - `updatedAt`
     - `_v`

4. **覆盖 save 成功响应兼容出口**
   - 新增：
     - `TestSaveChangeOrderHandlerReturnsChangeOrderAPIDTO`
   - 采用**更新成功场景**而不是新建场景：
     - 复用已 seed 的 change order
     - 避免 SQLite 测试表对自动主键生成能力的依赖
   - 验证保存成功后响应仍保留：
     - `description`
     - `createdAt`
     - `updatedAt`
     - `_v`

### 调整与问题处理

本轮测试实现中间遇到两个测试层问题，并都已收口：

1. **SQLite 测试表不具备业务库的主键自动生成能力**
   - 直接走新建保存场景时，会触发 `change_orders.id` 非空约束失败

2. **给新建请求手工补 `id` 后，会被服务层识别为更新路径**
   - 由于对应记录不存在，进一步触发 `record not found`

最终处理方式是：

1. 将 save 测试改为**更新成功场景**
2. 这样既能验证 handler 的响应 DTO 兼容出口
3. 又避免把测试耦合到 SQLite 对主键默认值的差异上

### 本轮收益

1. `ChangeOrder` 的响应分层已不再只靠人工约定，而是有测试护栏。
2. `options=true` 最小字段集与 list/save 兼容出口已被显式锁定。
3. 后续若有人把 `product` 或其它丰满字段误加回 options 口径，测试会第一时间暴露回归。

### 验证结果

已执行：

1. `go test ./handlers -run "ChangeOrder"`

结果：

1. ChangeOrder handler 定向测试通过。

### 当前阶段结论

到这一步，`ChangeOrder` 已经不仅完成了输入与响应契约收口，也补上了针对响应分层的定向测试护栏。这使得这条 engineering 次级候选链路从“口径逐步收清”进一步进入“已有测试保障可持续演进”的状态。

## 2026-04-12 - architecture：ChangeOrder 负向 handler 测试

### 本轮目标

在 `ChangeOrder` 成功路径与响应分层已有测试护栏的基础上，继续补齐 `SaveChangeOrderHandler` 的关键失败路径：

1. `400 validation`
2. `400 invalid payload`
3. `409 version conflict`

### 本轮实现

本轮继续在现有文件中扩展：

1. `server/handlers/change_orders_test.go`

### 测试实现点

1. **覆盖必填字段缺失时的 `400 validation`**
   - 新增：
     - `TestSaveChangeOrderHandlerRejectsMissingRequiredFields`
   - 使用 `changeOrderNo` 为空、`title` 为空的 payload
   - 验证：
     - 返回 `400`
     - 响应包含：
       - `change order number and title are required`

2. **覆盖非法 JSON / 绑定失败时的 `400 validation`**
   - 新增：
     - `TestSaveChangeOrderHandlerRejectsInvalidPayload`
   - 直接提交非法 JSON
   - 验证：
     - 返回 `400`
     - 响应包含：
       - `invalid change order payload`

3. **覆盖版本冲突时的 `409` 语义**
   - 新增：
     - `TestSaveChangeOrderHandlerReturnsConflictOnVersionMismatch`
   - 复用已 seed 的 `ChangeOrder`
   - 通过提交过期 `version` 触发冲突
   - 验证：
     - 返回 `409`
     - 响应包含统一 conflict 文案：
       - `数据已被更新，请刷新后重试`
     - 响应包含统一 conflict code：
       - `CONFLICT`

### 本轮收益

1. `SaveChangeOrderHandler` 的失败路径不再只靠人工约定。
2. `400 validation` 与 `409 version conflict` 的高价值语义已经被显式锁定。
3. 后续如果有人误把这些场景退化成泛化 `500`，测试会第一时间暴露回归。

### 验证结果

已执行：

1. `go test ./handlers -run "ChangeOrder"`

结果：

1. ChangeOrder handler 正向 + 负向定向测试通过。

### 当前阶段结论

到这一步，`ChangeOrder` 这条次级候选链路已经同时具备：

1. 输入层契约收口
2. 响应分层收口
3. 成功路径测试护栏
4. 关键失败路径测试护栏

这意味着它已经从“契约逐步显式化”进一步进入“关键成功/失败语义都已有测试保障”的状态。

## 2026-04-12 - architecture：selectedVariants 初始化规则收口

### 本轮目标

收口产品表单里 `selectedVariants` 的初始化规则，避免 `Version Level / Weight` 这类多版本核心数据继续散落在多个 `useEffect` 条件判断里。

### 本轮实现

本轮新增文件：

1. `src/features/engineering/commands/product-command.ts`

本轮修改文件：

1. `src/features/engineering/hooks/use-product-form.ts`
2. `src/features/engineering/hooks/use-product-form-init.ts`

### 实现细节

1. **新增统一初始化命令入口**
   - 新增 `ProductCommand.composeInitialState()`
   - 统一输入：
     - `isEdit`
     - `currentRow`
     - `versionLevelOptions`
     - `baseValues`
   - 统一输出：
     - `formValues`
     - `selectedVariants`

2. **把 edit 场景初始化从 hooks 条件中抽离**
   - 原先 edit 场景会在 `use-product-form-init.ts` 内部：
     - 手工补 `engineeringSpecId`
     - 再从 `currentRow.attributeValues.versionLevel + currentRow.weight` 组装 `selectedVariants`
   - 现在这些逻辑统一由 `ProductCommand.composeInitialState()` 负责。

3. **把 create 场景默认首个版本选取策略收口**
   - 原先 metadata 加载完成后：
     - 非编辑态
     - `selectedVariants` 为空
     - 才在 effect 内默认取第一个 `versionLevelOptions`
   - 现在改为通过 `composeInitialState()` 统一产出。

4. **让 `use-product-form` 默认值来源与命令入口对齐**
   - 原先 `useForm` 的 `defaultValues` 直接来自 `buildDefaultProductValues()`。
   - 现在改为来自 `ProductCommand.composeInitialState()` 的 `formValues`。

5. **让 `use-product-form-init` 只消费统一初始态结果**
   - 打开弹窗时：
     - 统一调用 `composeInitialState()`
     - 同时 reset `formValues`
     - 同时设置 `selectedVariants`
   - metadata 加载后仅在 create 且当前为空时，继续复用同一个命令入口补齐默认版本选择。

### 保持不变的边界

本轮刻意没有扩大范围：

1. 没有改 `buildBatchProducts`
2. 没有改 `buildSingleVariantProduct`
3. 没有改 `handleVariantToggle / updateVariantWeight`
4. 没有改后端 DTO 或服务层

### 本轮收益

1. `selectedVariants` 的初始化逻辑终于有了单一来源。
2. create / edit 的表单初始值与多版本初始值不再分散在多个 effect 中各自维护。
3. 后续如果 `Version Level / Weight` 的初始化策略再变化，只需要改 `ProductCommand.composeInitialState()`，而不是同步修改多处副作用逻辑。

### 验证结果

已执行：

1. `pnpm exec eslint src/features/engineering/hooks/use-product-form.ts src/features/engineering/hooks/use-product-form-init.ts src/features/engineering/commands/product-command.ts`
2. `pnpm exec tsc --noEmit`

结果：

1. 定向 ESLint 通过。
2. TypeScript 编译校验通过。

### 当前阶段结论

这一步把 `selectedVariants` 从“分散在 hooks 副作用中的初始化细节”提升为了“由统一命令入口负责的产品初始态规则”。虽然本轮没有继续扩到提交链路，但已经先把最核心、最容易漂移的初始化边界收了回来。
