#
## `mold-loan` 页面层契约漂移修复方案（2026-04-07，待确认）

### 一、当前结论
当前 `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx` 的报错并不是页面局部拼写问题，而是页面层仍停留在旧版消费方式，而 hook / dialog 定义层已经完成新版契约收口。

已确认的两条定义层变化：

1. `useMoldLoanMgmt`
   - 当前正式返回值以：
     - `isOpen`
     - `setIsOpen`
     - `mode`
     - `currentRow`
     - `handleAddClick`
     - `handleEditClick`
     - `handleDialogSubmit`
     为主
   - 不再暴露旧页面草稿驱动字段：
     - `isDialogOpen`
     - `resetDraft`
     - `newLoan`
     - `setNewLoan`
     - `handleCreateRecord`

2. `MoldLoanActionDialog`
   - 当前正式 props 为：
     - `isOpen`
     - `onOpenChange`
     - `initialMode?`
     - `currentRow?`
     - `molds`
     - `partners`
     - `onSubmit`
   - 不再承接旧页面字段：
     - `mode`
     - `onModeChange`
     - `newLoan`
     - `onLoanChange`

### 二、本轮目标
本轮修复目标不是补回旧字段，而是让 `mold-loan-mgmt.tsx` 回到当前正式契约：

1. 页面层改为消费新版 `useMoldLoanMgmt` 返回值；
2. 页面层按新版 `MoldLoanActionDialog` props 正式接线；
3. 保持借出 / 借入业务语义不变；
4. 不制造兼容旧接口的回退壳。

### 三、实施顺序

#### Phase A：页面层改为消费新版 hook
涉及重点：
- `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`
- `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`

处理原则：
- 页面层不再自己持有 `newLoan` 草稿状态；
- 以 hook 返回的 `isOpen / currentRow / handleAddClick / handleDialogSubmit` 为准；
- 不回退 hook 到旧草稿驱动接口。

#### Phase B：页面层按新版 dialog 正式 props 接线
涉及重点：
- `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`
- `src/features/equipment-tooling/components/mold-loan-action-dialog.tsx`

处理原则：
- 使用 `initialMode` 承接新增时的借出/借入模式；
- 使用 `currentRow` 承接编辑态；
- 使用 `onSubmit` 接回 hook 的正式提交主链；
- 不把旧 `mode / newLoan / onLoanChange` props 再补回 dialog。

### 四、关键风险

1. 风险：页面此前可能依赖旧草稿驱动流程
   - 若直接补字段而不改消费边界，只会继续累积双真相
   - 处理原则：页面彻底切到新版正式契约

2. 风险：借出 / 借入初始模式依赖页面打开弹窗时传值
   - 若接线错误，可能导致新增借入时默认模式丢失
   - 处理原则：通过 `initialMode` 明确传递新增场景初始模式

3. 风险：编辑态与新增态入口共用同一 dialog
   - 若 `currentRow` 与 `initialMode` 的优先级处理不清，可能出现表单初始化错误
   - 处理原则：保持 dialog 内部当前“编辑优先、否则使用初始模式”的逻辑不变。

### 五、验证要求
至少执行：

```bash
pnpm exec tsc --noEmit
```

必要时补充：

```bash
pnpm exec eslint src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts src/features/equipment-tooling/components/mold-loan-action-dialog.tsx
```

### 六、明确不做事项
- 不把旧 `newLoan / resetDraft / onLoanChange` 字段补回 hook 或 dialog；
- 不把本轮扩展成 mold loan 全域重构；
- 不改借出 / 借入 / 归还业务语义；
- 不使用 `as any` 或新增兼容壳掩盖页面层契约漂移。

## ExcelJS 类型边界与销售订单状态映射收口方案（2026-04-07，待确认）

### 一、当前结论
在尝试继续清理目标文件 ESLint 债务时，已经暴露出两条新的根因层问题，说明当前范围不再只是 lint 收尾：

1. `src/features/material-archive/services/excel-service.ts`
   - 目前问题不再只是 `no-explicit-any`
   - 已升级为 ExcelJS 真实类型边界对齐问题
   - 当前自定义的窄类型未覆盖 `Date`、公式结果等 ExcelJS 合法值形态，因此与真实库类型发生冲突

2. `src/features/trading/components/sales-order-list-fixed.tsx`
   - 目前问题不再只是 `no-explicit-any`
   - 已升级为销售订单状态值到 i18n key 的正式映射收口问题
   - 当前状态值与翻译 key 存在命名差异，例如 `cancelled` / `canceled`、`completed` 等边界不一致

### 二、本轮目标
本轮不再把问题当成“顺手 lint 清理”，而是分别收口两条新的正式边界：

1. `excel-service.ts`：ExcelJS 类型边界；
2. `sales-order-list-fixed.tsx`：状态值 -> i18n key 映射边界；
3. 保持 `tsc` 与目标文件 eslint 可通过。

### 三、实施顺序

#### Phase A：ExcelJS 类型边界对齐
涉及重点：
- `src/features/material-archive/services/excel-service.ts`

处理原则：
- 不再用过窄的本地类型硬套 ExcelJS；
- 仅建立与当前使用面相匹配、但能覆盖真实值形态的最小兼容类型；
- 不破坏已完成的 `version` 契约统一。

#### Phase B：销售订单状态映射收口
涉及重点：
- `src/features/trading/components/sales-order-list-fixed.tsx`
- 相关销售订单状态定义 / locales key

处理原则：
- 先对齐真实状态枚举与正式翻译 key；
- 使用显式映射函数，不继续依赖宽泛字符串拼接；
- 不改动销售订单业务流程与筛选语义。

### 四、关键风险

1. 风险：ExcelJS 第三方类型面较宽
   - 若引入过度复杂的全量类型，可能扩大改动面
   - 处理原则：只覆盖当前实际读取 / 写入所用到的值形态

2. 风险：状态值与多语言 key 的命名差异可能牵涉历史数据
   - 若直接改业务状态值，可能影响筛选与展示
   - 处理原则：优先建立映射层，而非直接改业务枚举

3. 风险：当前问题已超出原 ESLint 范围
   - 若继续按“风格清理”思路推进，容易做成补丁式修复
   - 处理原则：以边界收口为目标，而非单纯消 warning。

### 五、验证要求
至少执行：

```bash
pnpm exec eslint src/features/material-archive/services/excel-service.ts src/features/trading/components/sales-order-list-fixed.tsx
pnpm exec tsc --noEmit
```

### 六、明确不做事项
- 不将本轮扩散成 ExcelJS 全域类型重写；
- 不直接改销售订单业务状态值本身作为快速绕过；
- 不继续使用 `as any`、宽泛断言或字符串硬拼接掩盖边界问题；
- 不顺手清理与本轮无关的其它历史 warning。

## 目标文件 ESLint 债务清理方案（2026-04-07，待确认）

### 一、当前结论
在完成本轮 TypeScript 根因修复后，`pnpm exec tsc --noEmit` 已恢复通过，说明截图中的主阻塞错误链已被切断。

当前剩余问题已从“编译失败”降级为“目标文件 ESLint 债务”，范围集中在：

1. `src/features/material-archive/services/excel-service.ts`
   - 存在若干 `@typescript-eslint/no-explicit-any`

2. `src/features/trading/components/sales-order-list-fixed.tsx`
   - 存在两个 `@typescript-eslint/no-explicit-any`
   - 存在 `react-hooks/exhaustive-deps` warning
   - 存在 class 简写 warning

3. `src/features/equipment-tooling/tabs/partner-mgmt.tsx`
   - 存在一个 `@typescript-eslint/no-explicit-any`

### 二、本轮目标
本轮不再处理编译阻塞，而是对刚才已经触达的目标文件完成收尾级 ESLint 清理：

1. 清退目标文件中的 `any`；
2. 处理局部 hook 依赖 warning；
3. 处理本轮目标文件中的 class 简写 warning；
4. 保持 `tsc` 继续通过。

### 三、实施顺序

#### Phase A：`excel-service.ts`
处理重点：
- 为 worksheet / row / cell 使用到的最小对象形态定义局部类型；
- 消除 `any`，但不引入庞大的 ExcelJS 全量类型耦合。

处理原则：
- 以最小必要结构类型替代 `any`；
- 不破坏已完成的 `version` 契约统一。

#### Phase B：`sales-order-list-fixed.tsx`
处理重点：
- 为当前残留 `any` 的事件 / 数据路径补正式类型；
- 将 `orders` 初始化收敛到稳定依赖形式；
- 顺手处理本文件 class 简写 warning。

处理原则：
- 不改动销售订单业务语义；
- 不把本轮扩展成 sales 列表组件全面重构。

#### Phase C：`partner-mgmt.tsx`
处理重点：
- 将错误处理中的 `any` 收口为更明确的错误类型。

处理原则：
- 仅处理本轮已暴露的 ESLint 错误；
- 不扩展成 equipment-tooling UI 重写。

### 四、关键风险

1. 风险：`excel-service.ts` 若直接引入大面积第三方类型，可能带来额外耦合与新错误
   - 处理原则：仅定义本地最小必要类型，不做过度类型化

2. 风险：`sales-order-list-fixed.tsx` 同时存在代码风格与类型问题
   - 若顺手重排太多逻辑，容易扩大改动面
   - 处理原则：只做为消除目标 lint 必需的最小收口

3. 风险：当前工作已完成主阻塞修复
   - 若继续扩散到全项目 warning，可能偏离本轮目标
   - 处理原则：仅处理已明确列入范围的目标文件。

### 五、验证要求
至少执行：

```bash
pnpm exec eslint src/features/material-archive/services/excel-service.ts src/features/trading/components/sales-order-list-fixed.tsx src/features/equipment-tooling/tabs/partner-mgmt.tsx
pnpm exec tsc --noEmit
```

### 六、明确不做事项
- 不把本轮扩展成全项目 ESLint 清零；
- 不为消除 lint 重新引入 `any` 旁路或业务弱类型兜底；
- 不改动与本轮范围无关的 trading / material / equipment 业务逻辑；
- 不顺手处理其他文件中的历史样式 warning。

## TypeScript 契约漂移根因修复方案（2026-04-07，待确认）

### 一、根因结论
本轮截图中的 TypeScript 报错并非单个文件损坏，而是两条前端契约迁移未闭环后集中暴露：

1. `Material` 版本字段契约漂移
   - 正式 `Material` schema 已收口到 `version`
   - 但 `src/features/material-archive/services/excel-service.ts` 仍在使用旧 `_v`
   - 这导致 Excel 导入导出链与正式实体类型发生直接冲突

2. `Trading Action Dialog` 组件 props 契约漂移
   - `PurchaseOrderActionDialog` / `SalesOrderActionDialog` 当前已内聚 save / patch mutation
   - 组件正式 props 已不再包含 `onSave`
   - 但 `purchase-order-list.tsx` / `sales-order-list-fixed.tsx` 仍按旧接口传入 `onSave`
   - `TS2322` 与随后出现的 `implicit any` 属于同一根因的连锁症状

同时已确认：

3. `partner-mgmt.tsx` unused import
   - 属于局部遗留清理问题
   - 不是本轮系统性根因

### 二、本轮目标
本轮不做“逐条消红”，而是从契约定义层完成统一收口：

1. 将 `Material` 领域版本字段统一到单一命名；
2. 清退 `Trading Action Dialog` 的旧 `onSave` 调用契约；
3. 最后再处理顺带暴露的孤立遗留（如 unused import）。

### 三、实施顺序

#### Phase A：统一 `Material.version` 契约
涉及重点：
- `src/features/material-archive/data/schema.ts`
- `src/features/material-archive/services/material-service.ts`
- `src/features/material-archive/services/excel-service.ts`
- `src/features/material-archive/hooks/use-material-mgmt-data.ts`

处理原则：
- 以正式 schema 为单一事实来源；
- 将 Excel 复合 ID 拼装 / 解析统一切到 `version`；
- 不保留 `_v` / `version` 双轨长期兼容层。

#### Phase B：清退 `Trading Action Dialog` 旧 props 契约
涉及重点：
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- `src/features/trading/components/purchase/purchase-order-list.tsx`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/sales-order-list-fixed.tsx`

处理原则：
- 以当前 action dialog 的正式 props 为单一事实来源；
- 列表页移除旧 `onSave` 传参；
- 保存与 patch 责任继续集中在弹窗内部 mutation 主链。

#### Phase C：收尾清理
涉及重点：
- `src/features/equipment-tooling/tabs/partner-mgmt.tsx`

处理原则：
- 仅清理孤立死代码；
- 不把本轮扩展成 equipment-tooling UI 重构。

### 四、关键风险

1. 风险：`Material` 导入导出链同时涉及 Excel 模板兼容
   - 若只改类型名而不改复合 ID 解析，会出现导出/导入链不一致
   - 处理原则：导出拼接、导入解析、批量同步使用同一版本字段命名

2. 风险：Trading 弹窗保存逻辑已内聚
   - 若同时保留旧 `onSave` 契约，容易形成双入口、双真相
   - 处理原则：明确以组件当前正式 props 为准，清退旧接口调用

3. 风险：截图报错包含局部症状
   - 若先修 unused import 等表层问题，容易掩盖真正的契约漂移
   - 处理原则：先收口主因，再处理症状。

### 五、验证要求
至少执行：

```bash
pnpm exec tsc --noEmit
```

必要时补充：

```bash
pnpm exec eslint src/features/material-archive/services/excel-service.ts src/features/trading/components/purchase/purchase-order-list.tsx src/features/trading/components/sales-order-list-fixed.tsx src/features/equipment-tooling/tabs/partner-mgmt.tsx
```

### 六、明确不做事项
- 不为了短期消红重新引入 `_v` / `version` 双字段长期并存；
- 不把 `Trading Action Dialog` 又退回到外部 `onSave` 驱动；
- 不把本轮扩散成 material / trading / equipment 三域的大规模重构；
- 不用局部类型断言或 `any` 作为掩盖性补丁。

## `warehouse` 下一批 DTO 补齐方案（2026-04-07，待确认）

### 一、当前结论
`warehouse` 域当前最明确的 PATCH contract 断链集中在两条已经由前端采用 SDRTS 语义、但后端仍未正式承接的链路：

1. `inventory`
   - 前端已存在 `patchInventory(...)`
   - 后端当前无正式 `PATCH /inventory/:id`
   - route 仍停留在 `GET /inventory`、`POST /inventory/inbound`、`POST /inventory/shipment`、`POST /inventory/transfer`、`POST /inventory/reconcile`

2. `shipment`
   - 前端已存在 `patchShipment(...)`
   - 后端当前无正式 `PATCH /inventory/shipment/:id`
   - 当前仅有：
     - `POST /inventory/shipment`
     - `POST /inventory/shipment/:id/commit`
     - `POST /inventory/shipment/:id/void`

同时已确认：

3. `inbound` / `transfer` / `adjustment`
   - 当前不是 SDRTS PATCH 主链
   - 本轮不应扩散改造到这些模块

### 二、本轮目标
本轮不重写整个 warehouse 域，只聚焦把前端已存在的 PATCH 语义补成正式后端 contract：

1. `inventory`：建立正式 PATCH DTO 与 route；
2. `shipment`：建立正式 PATCH DTO 与 route；
3. 保持 `inbound`、`transfer`、`commit/void`、`reconcile` 语义不变。

### 三、实施顺序

#### Phase A：`inventory`
预计补齐：
- `PatchInventoryHandlerRequest`
- `PatchInventoryRequest`
- `PATCH /inventory/:id`

处理原则：
- patch 入口承接 `op / delta / metadata.id / metadata.version`
- 明确 inventory 允许 patch 的字段范围（如数量、财务累计值、分类、更新时间等）
- 不另起第二套库存保存逻辑

#### Phase B：`shipment`
预计补齐：
- `PatchShipmentHandlerRequest`
- `PatchShipmentRequest`
- `PATCH /inventory/shipment/:id`

处理原则：
- patch 只处理出库单据元数据 / 草稿修改边界；
- 不与 `commit` / `void` 语义混用；
- 保持出库对库存影响的正式链仍由现有 commit/void 主链负责。

### 四、关键风险

1. 风险：`inventory` 同时带库存数量、成本、分类等会影响账实一致的数据
   - 若 patch 字段放得过宽，可能绕过既有对账与业务校验
   - 处理原则：仅开放真正被前端 patch 使用的字段，不把 PATCH 做成任意字段直通更新

2. 风险：`shipment` 已存在 `commit` / `void` 正式动作
   - 若 patch 也允许直接改状态，容易与正式审批动作冲突
   - 处理原则：状态类敏感动作继续保留在 `commit` / `void` 链，PATCH 只处理普通编辑字段

3. 风险：warehouse 历史接口以 POST 为主
   - 若直接引入 PATCH 而不保持主链一致，可能出现保存路径分叉
   - 处理原则：PATCH 只作为显式 delta 入口，底层尽量复用现有持久化主链。

### 五、验证要求
至少执行：

```bash
go test ./handlers ./routes ./services -run "Inventory|Shipment|Warehouse"
pnpm exec tsc --noEmit
```

### 六、明确不做事项
- 不改前端 `patchInventory(...)` / `patchShipment(...)` 的 URL 与 payload 设计；
- 不把本轮扩散到 `inbound` / `transfer` / `adjustment` 全域改造；
- 不用“继续兼容任意 raw map 更新”作为长期方案；
- 不改变 `commit` / `void` / `reconcile` 等既有业务语义。

## `trading` 下一批 DTO 补齐方案（2026-04-07，待确认）

### 一、当前结论
`trading` 域已经出现与 production / equipment 类似的 PATCH contract 漂移，只是三条链路成熟度不一致：

1. `supplier`
   - 前端已存在 `patchSupplier(...)`
   - 后端当前无正式 `PATCH /suppliers/:id`
   - `SaveSupplierHandler` 仍直接绑定 `models.Supplier`
   - 这是当前最明显的“前端已 patch、后端未正式接入”断链

2. `purchase-order`
   - 前端已存在 `patchPurchaseOrder(...)`
   - 后端当前无正式 `PATCH /purchase/orders/:id`
   - 当前仅有 `SavePurchaseOrderRequest`
   - 说明采购单仍停留在“前端 patch、后端只有 save”状态

3. `sales-order`
   - 后端已存在 `PatchSalesOrderRequest`
   - 已存在 `MapPatchSalesOrderRequestToModel(...)`
   - 但当前 route / handler 仍未正式暴露 `PATCH /sales-orders/:id`
   - 说明销售单更像“DTO 已部分补齐，但 patch 入口没接完”

### 二、本轮目标
本轮不追求一次性重写整个 trading 域，而是优先把最明显的 patch contract 断链补齐：

1. `supplier`：从直接绑定模型，收口为正式 POST / PATCH DTO 边界；
2. `purchase-order`：新增正式 patch DTO 与 PATCH 路由；
3. `sales-order`：优先判断是否只需把已有 patch DTO 接到 route / handler，不重复大改。

### 三、实施顺序

#### Phase A：`supplier`
预计补齐：
- `SaveSupplierRequest`
- `PatchSupplierHandlerRequest`
- `PatchSupplierRequest`
- `PATCH /suppliers/:id`

处理原则：
- 不再让 `SaveSupplierHandler` 直接绑定 `models.Supplier`
- patch 入口必须承接 `op / delta / metadata.id / metadata.version`
- 保持现有版本冲突与逻辑删除语义不变

#### Phase B：`purchase-order`
预计补齐：
- `PatchPurchaseOrderRequest`
- `MapPatchPurchaseOrderRequestToModel(...)`
- `PATCH /purchase/orders/:id`

处理原则：
- 继续复用现有采购单保存主链；
- 不破坏 workflow instance 创建、收货确认等既有链路；
- patch 语义仍遵循“读取现状 -> 应用正式 patch request -> 保存”。

#### Phase C：`sales-order`
预计动作：
- 若现有 `PatchSalesOrderRequest` 已足够，则仅新增正式 PATCH route / handler；
- 若 handler 仍混用 save 语义，再做最小范围补齐。

处理原则：
- 不重复重写已存在的 sales-order DTO / mapper；
- 只收口真正还缺的一层边界。

### 四、关键风险

1. 风险：`supplier` 当前直接绑定 `models.Supplier`
   - 若贸然切换，可能影响旧的全量保存调用
   - 处理原则：保留 POST save 语义，但改由显式 save DTO 承接，不直接暴露模型

2. 风险：采购/销售单同时带主表与明细行
   - patch 若处理不当，容易把“局部更新”误做成“整单替换”
   - 处理原则：明确 patch DTO 的允许字段，并复用既有 save 主链，不在 handler 内直接操作 association

3. 风险：sales-order 已有 patch DTO 雏形
   - 若重复大改，可能引入无谓回归
   - 处理原则：优先判断“已有 DTO 是否只差 route / handler 接入”，尽量最小改动

### 五、验证要求
至少执行：

```bash
go test ./handlers ./services ./routes -run "Supplier|PurchaseOrder|SalesOrder|Trading"
pnpm exec tsc --noEmit
```

### 六、明确不做事项
- 不修改前端 `patchSupplier(...)` / `patchPurchaseOrder(...)` / `patchSalesOrder(...)` 的 URL 设计；
- 不把本轮扩展成 trading 全域重构；
- 不在 handler 中继续追加“隐式兼容 map 更新”作为长期方案；
- 不因为 DTO 补齐而改动工作流、库存联动等无关业务语义。

## `use-users-action-dialog-sync` 测试工厂重建方案（2026-04-07，待确认）

### 一、根因结论
本轮报错集中在 `src/features/users/hooks/use-users-action-dialog-sync.test.ts`，但根因不是单个测试忘了补 `version`，而是**测试数据构造边界已经落后于正式 schema 演进**。

已确认的事实：

1. `src/features/org-personnel/data/schema.ts`
   - 正式 `Employee` schema 已要求 `version: number`

2. `src/features/system-mgmt/data/role-schema.ts`
   - 正式 `Role` schema 已要求 `version: number`

3. `src/features/users/hooks/use-users-action-dialog-sync.ts`
   - `employees` 参数类型为 `EmployeeOption[]`
   - 其中 `EmployeeOption.raw` 实际要求正式 `Employee`
   - `dynamicRoles` 实际要求正式 `Role[]`

4. `src/features/users/hooks/use-users-action-dialog-sync.test.ts`
   - 当前仍在手写：
     - `employees[].raw` 原始对象字面量
     - `dynamicRoles[]` 原始对象字面量
   - 这些字面量缺少 `version`，因此在严格模式下集中报错。

### 二、需要纠正的判断
本轮不是“项目里完全没有 mock 工厂”。

当前已存在：

1. `src/features/users/test-factories.ts`
   - `createTestUser`

2. `src/features/system-mgmt/test-factories.ts`
   - `createTestRole`

因此真正缺的不是“再建一整套 User/Role mock 基础设施”，而是：

1. **缺少 `Employee` 测试工厂**；
2. `use-users-action-dialog-sync.test.ts` 没有复用现有 `createTestRole`；
3. 测试仍在直接手写正式对象，导致 schema 一演进就集体失效。

### 三、建议方案

#### 1) 新增 `Employee` 测试工厂
新增文件建议：
- `src/features/org-personnel/test-factories.ts`

提供：
- `createTestEmployee(overrides?: Partial<Employee>): Employee`

默认应补齐：
- `id`
- `staffId`
- `name`
- `phone`
- `status`
- `version`
- `deptId`
- `lineId`
- `processId`

原则：
- 工厂产出必须对齐正式 `Employee` schema；
- 不新增“仅供测试使用但与正式 schema 脱节”的临时类型。

#### 2) 复用现有 `Role` 工厂
不新增新的 `createMockRole`。

直接复用：
- `src/features/system-mgmt/test-factories.ts`
  - `createTestRole`

原因：
- 当前 Role 工厂已经承接 `version` 默认值；
- 若这轮再新建第二套 Role mock，会把测试构造边界重新打散。

#### 3) 如有必要，补轻量 option 帮助函数
可选新增：
- `createEmployeeOption(employee: Employee, overrides?)`

用途：
- 降低 `EmployeeOption` 测试装配噪音；
- 但它必须基于正式 `Employee`，而不是重新定义裸对象结构。

### 四、实施文件
预计改动：

1. `src/features/org-personnel/test-factories.ts`
   - 新增 `createTestEmployee`

2. `src/features/users/hooks/use-users-action-dialog-sync.test.ts`
   - 改为使用 `createTestEmployee`
   - 改为使用 `createTestRole`
   - 视情况补轻量 `createEmployeeOption`

### 五、验证要求
至少执行：

```bash
pnpm exec vitest run src/features/users/hooks/use-users-action-dialog-sync.test.ts
pnpm exec tsc --noEmit
```

### 六、明确不做事项
- 不逐处手工补 `version: 1`；
- 不改 `use-users-action-dialog-sync.ts` 的业务逻辑；
- 不新建第二套 `Role` mock 工厂；
- 不把这轮测试修复扩散成 `User` / `Role` 正式 schema 改造。

## DTO 边界补齐专项实施方案（2026-04-07，已确认）

### 一、专项根因
当前多个模块已经在前端采用 SDRTS `DeltaPayload` / `DeltaSet` 进行 PATCH 更新，但后端仍存在大量“隐式 contract”实现：

1. handler 通过 `decodeJSONBodyMap(...)` 读取原始 JSON；
2. 再由 `buildXxxUpdates(payload map[string]json.RawMessage)` 手工拆字段；
3. 最后以 `map[string]interface{}` 或直接模型写库。

这类实现短期灵活，但会持续带来三类系统性问题：

- 前端 schema 增加 `version` / `sysVersion` / `delta` / 生命周期字段后，后端缺少单点 contract 收口，必须靠补 switch-case 追着对齐；
- 前端发送的是 SDRTS `DeltaItem { o, n }`，后端却可能按“裸值”理解，导致 runtime 500；
- handler、service、repository 的职责边界混乱，字段解释、权限判断、审计边界与持久化语义耦在一起，不利于演进。

### 二、专项目标
本专项不是简单“把几个字段补进 schema”，而是为高风险模块建立正式的 request DTO / service DTO / patch metadata 边界，减少 contract 漂移。

目标如下：

1. 所有纳入专项的模块，PATCH 入口必须有显式 DTO，不再让 handler 直接解释任意 JSON map；
2. 对采用 SDRTS 的模块，统一承接：
   - `op`
   - `delta`
   - `metadata.id`
   - `metadata.version`
   - 以及模块特有安全字段（如 `authCode`）；
3. 对嵌套结构建立可测试的 delta 应用规则，不再依赖前端偶然的对象形状；
4. 将“字段解释”下沉到 service 层或独立 mapper，不让 handler 同时承担协议解析器与业务逻辑入口。

### 三、纳入范围与优先级

#### P0：第一批必须补 DTO
1. `equipment-tooling`
   - `molds`
   - `furnaces`
   - `partners`
   - `drawings`

选择原因：
- 当前 schema 正在持续演进；
- 后端仍大量依赖 `decodeJSONBodyMap(...)`；
- 已出现多个“version / delta / 生命周期字段”被动追补信号，属于高风险 contract 漂移区。

2. `production line topology`

选择原因：
- 虽已补正式 `PATCH /production/lines/:id` contract；
- 但当前 delta 仍以 `map[string]json.RawMessage` 进入 service；
- 还需要继续收口为显式 delta DTO / metadata DTO，避免 topology 再次在嵌套结构上漂移。

#### P1：第二批建议补 DTO
1. `warehouse`
   - `inventory`
   - `shipment`

2. `trading`
   - `supplier`
   - `purchase-order`
   - 同步复核 `sales-order` 的 DTO 接入是否完整一致

3. `org-personnel`
   - `employee`
   - `org`

#### P2：后续统一治理
1. `material-archive`
2. `logistics`
3. `purchase-logistics`
4. `role-service` 对应后端

### 四、统一设计要求
对每个纳入模块，至少补齐以下结构：

1. `SaveXxxRequest`
   - 用于创建 / 全量保存场景；
   - 明确哪些字段允许客户端提交，哪些由服务端补齐。

2. `PatchXxxHandlerRequest`
   - 用于承接 HTTP PATCH body；
   - 必须显式声明：
     - `op`
     - `delta`
     - `metadata`

3. `PatchXxxServiceRequest`
   - 用于 service 层内部调用；
   - 负责把 HTTP 元信息与领域 patch 请求分离。

4. 如模块存在历史记录 / 审计事件
   - 继续补 `EventDTO` / `AuditDTO`；
   - 禁止前端随意附带任意字段穿透数据库。

### 五、SDRTS 统一收口要求
本专项必须同步补一层通用 delta 收口，否则每个模块都可能再次犯 production 这次的错误。

要求：

1. 为 `DeltaItem { o, n }` 建立统一解析模型；
2. 建立通用 helper，避免每个模块自行 `json.Unmarshal(raw, &target)`；
3. 明确“delta 原始载荷 -> 允许字段 -> 目标 DTO”的转换规则；
4. 对嵌套结构（segments、订单行、库存明细等）提供独立测试。

### 六、实施批次建议

#### Phase A
- `equipment-tooling/molds`
- `equipment-tooling/furnaces`
- `equipment-tooling/partners`
- `equipment-tooling/drawings`

交付要求：
- request DTO 补齐；
- 保留既有业务行为；
- 不扩大为 UI 重构。

#### Phase B
- `production line topology` 二次收口

交付要求：
- 将现有 `map[string]json.RawMessage` 收口到显式 delta DTO；
- 继续复用既有 `SaveProductionLine(...)` 主链；
- 不另起第二套 topology 持久化逻辑。

#### Phase C
- `warehouse` / `trading` 第一批 patch 模块

交付要求：
- 对齐 patch DTO；
- 统一版本冲突与错误语义；
- 保持现有 API path 不变。

### 七、风险与注意事项

1. 风险：前后端字段名可能长期存在“历史兼容名”
   - 处理原则：DTO 层允许兼容映射，但 service 层只保留一个正式字段名。

2. 风险：PATCH 与 Save 语义混用
   - 处理原则：显式区分 `SaveXxxRequest` 与 `PatchXxxRequest`，禁止一个结构同时承担两种语义。

3. 风险：嵌套结构 patch 易出现部分字段丢失
   - 处理原则：Patch 入口必须先获取完整现状，再应用 delta，再进入正式保存主链。

4. 风险：迁移期大面积改动影响范围广
   - 处理原则：按模块分批，每批只处理一组领域对象，不横向扩散。

### 八、明确不做事项
- 不在本专项中联动改 UI 交互；
- 不因 DTO 收口而随意变更已有 API URL；
- 不把所有模块一次性并行重写；
- 不继续依赖“前端加字段，后端补 switch-case”作为长期机制。

## `production line topology` 更新 contract 断链修复（审批稿，2026-04-07）

### 背景
`/personnel/line` 页面中“工段/工序注销”问题，在前端交互链收口后继续暴露出更深层根因：

1. 前端当前已能够进入 topology 授权与提交链；
2. 提交时实际命中 `productionResourceService.patchLine(...)`；
3. 浏览器控制台已明确返回：`PATCH /production/lines/:id -> 404 Not Found`；
4. 这说明问题已经不是“密码框是否弹出”，而是**前后端对 production line topology 更新的正式 contract 已经漂移。**

### 已确认的事实
#### 1) 前端当前 contract
- `src/features/production-shared/services/production-resource-service.ts`
- 当前 `patchLine(...)` 明确按 SDRTS 设计提交：
  - 方法：`PATCH`
  - 路径：`/production/lines/:id`
  - 载荷：`DeltaPayload`
  - 元数据：`id / version / authCode`

#### 2) 后端当前 contract
- `server/routes/routes_production.go`
- 当前只暴露：
  - `GET /production/lines`
  - `POST /production/lines`
  - `DELETE /production/lines/:id`
- **不存在** `PATCH /production/lines/:id`

#### 3) 后端保存主链
- `server/handlers/production_topology_handlers.go`
- `server/services/production_service.go`
- 当前真实主链是：
  - `POST /production/lines`
  - 绑定 `SaveProductionLineHandlerRequest`
  - 服务侧接收 `SaveProductionLineRequest{ Line, AuthCode, Operator, IP }`
- 即当前后端仍以“整条产线 DTO 全量保存”作为正式入口，而不是 delta patch。

### 根因判断
本轮真正根因不是单个按钮事件，也不是密码框组件，而是：

**前端已经按 SDRTS `PATCH + DeltaPayload` 设计了 topology 更新链，但后端 production line 仍停留在 `POST /production/lines` 的全量保存 contract。**

这会导致：

1. 前端拓扑敏感操作链已经进入正式提交；
2. 但请求目标路由在后端根本不存在；
3. 最终表现为 404、保存失败、用户感知为“输入密码后还是不生效”。

### 可选路线
#### 路线 A：前端回退对齐后端现有 POST contract
优点：
- 改动范围较小；
- 可以较快恢复 topology 修改功能。

风险：
- production line topology 链继续脱离 SDRTS patch 设计；
- 当前前端已有的 `delta / version / authCode` 结构会变成半废状态；
- 后续仍容易再次漂移。

#### 路线 B：后端补正式 `PATCH /production/lines/:id`
优点：
- 从根上统一 production line topology 更新 contract；
- 前端当前已建立的 topology 授权链、delta、version、authCode 语义可以成立；
- 与项目其余 SDRTS patch 设计更一致。

风险：
- 改动更深，需要补 routes / handler / service / tests；
- 需要明确 patch 语义是“真正 delta patch”还是“handler 接收 delta 后自行还原再保存”。

### 建议路线
从“禁止补丁、优先根因修复”的要求看，**建议优先采用路线 B：后端补正式 `PATCH /production/lines/:id` contract。**

原因：
- 当前问题已经不是前端偶发实现错误，而是明确的 contract 断链；
- 如果只让前端回退到 POST，全量保存虽然可能暂时恢复功能，但 production topology 链会继续成为一个脱离 SDRTS 的特例；
- 长期更稳妥的是把后端补齐成与前端一致的正式 patch 入口。

### 预计改动文件（若按路线 B 执行）
- `server/routes/routes_production.go`
- `server/handlers/production_topology_handlers.go`
- `server/services/production_service.go`
- 如缺少正式 patch DTO / mapper，最小范围补到 production DTO 文件
- 视需要补充 handler/service 定向测试

### 实施边界
- 不在页面层继续增加临时 fallback；
- 不把 404 当成普通错误提示问题处理；
- 不让 `segment-node.tsx` / `process-node.tsx` 重新发明自己的提交协议；
- 无论走哪条路线，都要保证 topology 敏感操作最终只服从一个正式 contract。

### 验证策略
- 前端：
  - `pnpm exec tsc --noEmit`
- 若走后端 PATCH 路线：
  - 定向验证 production routes / handlers / services
  - 至少覆盖 topology 更新成功、授权码错误、版本冲突三类场景

### 当前状态与暂停点
本节当前仅为 `production line topology` 更新 contract 断链审批稿：

1. 已确认 404 的真正根因是前后端 PATCH/POST contract 漂移；
2. 已明确两条修复路线及其风险；
3. 我建议优先采用“后端补正式 PATCH contract”路线；
4. **在你明确批准前，我不会继续修改这轮业务代码。**
 
## 任务扩展（2026-04-05）：项目冗余分析与优化计划

### 需求背景
当前项目采用高度模块化的 Features Architecture，长期并行开发与多轮重构后，疑似在以下层面存在冗余与残余：
- Features 之间职责重叠（如物流、供应商、类别等逻辑子集）
- Services / Hooks 存在重复 CRUD 与状态管理模式
- Components 层同时存在 `ui` 与 `uds` 两套使用路径，可能造成规范漂移
- 国际化、静态配置、重构遗留代码可能存在未清理残余

用户要求本轮先做**证据化分析**，确认这些问题是否真实存在、是否构成清理漏洞、以及后续应如何无损收敛；在未确认前，不直接做业务代码清理。

### 排查目标
1. 判断用户列举的冗余点是否在代码库中**真实存在**。
2. 区分“可直接抽象复用”“部分重合但语义不同”“暂无证据”的三类情况。
3. 对所有拟删除/合并对象先做全局引用与自动生成链路校验，避免静默失败。
4. 输出后续无损优化的优先级、风险和人工验证范围。

### 技术方案（先分析，后执行）

#### 1) Features 层职责重叠排查
- 对 `src/features/trading`、`src/features/purchase-logistics` 及相关采购/供应商模块进行目录级梳理。
- 重点比较请求接口、表单 Hook 骨架与物流 / 供应商实现是否存在语义相同但分散实现的情况。
- 若发现仅为同域不同场景，则标记为“不能直接硬合并”。

#### 2) Services / Hooks 通用模式排查
- 扫描 `src/features/*/services/*.ts` 的 `get/list/save/delete` 请求模式。
- 扫描 `src/features/*/hooks` 中列表查询、mutation、弹窗状态、表单行增删改与汇总逻辑。
- 重点确认哪些重复属于“可抽象公共骨架”，哪些已经携带强业务差异。

#### 3) Components / UI 规范一致性排查
- 检查 `src/components/ui` 的实际被引用情况，识别未使用组件。
- 统计 Feature 页面是否仍大量直接依赖基础 UI 组件，而非 `src/components/uds`。
- 对 `action-dialog.tsx` / `*-action-dialog.tsx` 类文件进行骨架比对，确认是否存在可抽象的通用模态框壳层。
- 如涉及 UI 建议，必须对齐 ERP UDS v1.0 规范。

#### 4) 国际化 / 配置 / Legacy 残余排查
- 扫描硬编码中文字符串是否仍大量停留在 Feature 组件中。
- 检查 `src/config` 是否仍保留已被后端动态字典/接口替代的静态常量。
- 排查 OrgMgmt、UnitMgmt 及近期重构模块中是否残留旧实现、备份文件、注释实验代码。

#### 5) 无损清理前置校验
- 对每一项拟删除或合并对象执行全局 grep 校验。
- 对路由相关改动，额外核对自动生成文件依赖，避免误伤 `routeTree.gen.ts` 或其上游输入。
- 对共用逻辑抽象建议，标明所有潜在调用方，防止只改一处导致其余模块静默偏移。

### 风险评估
1. 风险：表面重复代码背后可能承载不同业务约束，强行合并会引入回归。
2. 风险：删除未使用组件/旧代码时，可能遗漏动态引用、路由生成输入或懒加载入口。
3. 风险：若把基础 UI 统一替换为 UDS，范围可能迅速扩大为大规模视觉重构。
4. 风险：过度抽象 BaseService / 通用 Hook，可能再次制造新的维护负担。

### 产出与判定标准
- **已确认存在**：有明确文件、调用关系、重复骨架或残余引用证据。
- **部分存在但需谨慎**：结构相似，但字段、权限、状态机或上下文语义不同。
- **暂无证据**：当前检索未发现稳定重复源，不建议为统一而统一。

### 非破坏性说明
当前阶段仅更新规划并做代码级分析；**在你明确批准前，不修改业务代码、不删除文件、不做批量 UI 重构。**

## 技术债治理轮次（待确认）

### 目标背景
在完成 `ActionDialogShell` 多批低风险接入后，当前已稳定暴露出两类独立技术债：
- 多个 `*-action-dialog.tsx` 使用 `useEffect -> setState` 做表单回填，同步模式会持续触发 React lint。
- `job-action-dialog.tsx` 等文件仍残留显式 `any`，影响类型安全与后续复用。

用户本轮已明确要求**单独开一轮处理技术债**，因此本计划将其与“继续抽壳层”彻底拆分，避免范围漂移。

### 本轮范围
#### 1) `useEffect -> setState` 表单同步治理
- 优先目标：
  - `src/features/trading/components/customer-action-dialog.tsx`
  - `src/features/trading/components/supplier-action-dialog.tsx`
  - `src/features/basic-settings/components/unit-action-dialog.tsx`
  - `src/features/quality/components/standard-action-dialog.tsx`
- 治理原则：
  - 不改字段定义、不改保存 payload、不改打开/关闭语义。
  - 优先采用初始化函数、受控 key 重置、派生初值或局部 reducer 等方式，避免 effect 中同步写 state。

#### 2) 显式 `any` 类型治理
- 优先目标：
  - `src/features/org-personnel/components/job-action-dialog.tsx`
- 可接受动作：
  - 为 `onSubmit`、表单 schema、i18n key、`zodResolver` 结果补齐局部安全类型。
  - 将 `as any` 收敛为联合类型、具体 payload 类型或局部窄化断言。
- 不做事项：
  - 不发起全局 i18n key 类型系统重构。
  - 不改动与本轮弹窗无关的历史 `any`。

### 实施顺序
1. 先逐个读取目标弹窗，确认当前 state 初始化、reset、编辑态回填与关闭逻辑。
2. 优先修复最确定的 `useEffect -> setState` 场景，确保每个文件都能独立闭环。
3. 再收敛 `job-action-dialog.tsx` 中可局部闭合的 `any`。
4. 每完成一类文件后更新 `walkthrough.md`，记录“已处理 / 保留项 / 不处理原因”。

### 风险评估
1. 将 effect 同步改为初始化/派生模式时，若处理不当，可能造成“编辑态回填不刷新”或“关闭后再次打开仍保留脏数据”。
2. `react-hook-form` 与本地 state 混用的弹窗，若强行统一模式，可能扩大为状态模型重构。
3. `any` 类型治理若波及 i18n 或外部组件泛型，可能从局部修复演变为跨模块类型改造。

### 验证策略
- 定向检查目标文件 lint / TypeScript 报错是否下降。
- 人工验证以下场景：
  - 新建打开时应显示默认空表单
  - 编辑打开时应正确回填当前记录
  - 关闭再打开时不应残留上一条脏数据
  - 保存按钮、toast、关闭行为保持不变

### 明确排除项
- 不继续新增 `ActionDialogShell` 接入目标。
- 不顺手处理与本轮目标无关的 `any` / lint。
- 不进行全局表单架构重写，不引入新的通用 BaseForm 抽象.

## 技术债治理第二轮（待确认）

### 目标背景
第一轮技术债治理已经收敛了本地 state 弹窗中的 `useEffect -> setState` 与 `job-action-dialog.tsx` 的显式 `any`。

当前剩余的重点技术债，开始集中在 `react-hook-form` 体系下的 effect/reset 同步模式：
- 某些弹窗使用 `useEffect(() => form.reset(...))` 处理编辑态与新建态切换。
- 其中一部分可能是合理的表单库同步方式，另一部分也可能可以进一步收敛成更稳定的初始化策略。

用户当前明确要求**继续技术债处理**，因此第二轮将聚焦这类场景，而不回到结构抽壳任务。

### 第二轮范围
#### 1) `react-hook-form reset` 类 effect 场景评估与治理
- 首批排查目标：
  - `src/features/org-personnel/components/org-action-dialog.tsx`
  - 其他仍使用 `form.reset()` + effect 同步编辑态的标准 CRUD 弹窗（在实际筛查后决定是否纳入执行）
- 治理原则：
  - 先完成一轮目标文件筛选，再判断每个场景是否属于合理的表单库同步。
  - 仅在可证明“初始化函数 / key 重置 / 更稳定受控策略”更安全时才替换。
  - 不为了消除 lint 而破坏 `react-hook-form` 的默认工作方式。

#### 2) 剩余局部类型欠账
- 处理范围：
  - 只处理第二轮目标文件直接暴露的局部断言与宽类型。
- 不做事项：
  - 不扩展为全局 i18n 类型系统重构。
  - 不批量清理与第二轮目标无关的历史 `any`。

### 实施顺序
1. 先筛出仍使用 `form.reset()` + effect 同步编辑态数据的标准 CRUD 弹窗。
2. 逐个确认其与 `react-hook-form` 生命周期的耦合点，判断属于“合理同步”还是“可安全重构的技术债”。
3. 仅对能局部闭环的目标实施最小替换，并验证新建/编辑/关闭/再次打开行为。
4. 对不适合治理的场景明确记录“保留原因”，不强行改动。
5. 再处理筛入执行范围的目标文件中直接相关的局部类型欠账。

### 风险评估
1. `react-hook-form` 的 `reset()` 与默认值、受控组件、校验生命周期强绑定，错误替换可能导致字段不回填、dirty 状态异常或校验失效。
2. 若将所有 effect/reset 一刀切视为技术债，可能误伤本来就属于表单库推荐用法的同步场景。
3. 第二轮范围扩大后，若筛选不严，变更面可能快速扩大到多个表单模块。
4. 第二轮若处理不慎，回归成本会高于第一轮本地 state 弹窗治理。

### 验证策略
- 定向检查目标文件 eslint / TypeScript 报错。
- 人工验证以下场景：
  - 新建打开时默认值正确
  - 编辑打开时表单正确回填
  - 关闭后再次打开不残留上一条脏数据
  - `form.reset()`、提交按钮、关闭行为、校验提示语义不变

### 明确排除项
- 不继续新增壳层抽取任务。
- 不处理与第二轮目标文件无关的通用 lint。
- 不将 `react-hook-form` 场景统一改写为单一状态模型.

## users-action-dialog 高耦合表单技术债评估（待确认）

### 目标背景
`src/features/users/components/users-action-dialog.tsx` 与前两轮处理的标准 CRUD 弹窗不同，它同时承载了多类副作用：
- 打开弹窗时异步拉取员工、组织树、产线、工序与现有用户数据
- 基于员工选择自动回填姓名、手机号、用户名
- 基于员工部门角色自动推荐/锁定 role
- 在校验失败时主动注入 `setError()` / `clearErrors()`
- 在保存成功后执行 `form.reset()`、关闭弹窗与 toast

这类高耦合表单若直接套用前两轮“key 重建 + 默认值初始化”策略，存在较高误伤概率。因此本轮目标不是直接消灭所有 effect，而是**先拆模式，再评估状态收敛**。

### 本轮范围
#### 1) 副作用模式拆分
- 优先拆分以下逻辑块：
  - 员工/组织/产线/工序数据加载与名称映射
  - employeeId 变化后的自动回填逻辑
  - 部门角色推导与 role 错误注入逻辑
- 目标：降低 `UsersActionDialog` 主组件内 effect 的职责混杂度。

#### 2) 表单状态收敛评估
- 在副作用拆分完成后，再判断以下调用哪些属于必要同步、哪些可以简化：
  - `form.reset()`
  - `form.setValue()`
  - `form.setError()` / `form.clearErrors()`
- 不预设一定要移除所有副作用调用。

### 实施顺序
1. 先梳理 `users-action-dialog.tsx` 当前 effect、memo、watch、mutation 的责任边界。
2. 将“远程数据加载”和“employeeId 联动回填”优先拆为更清晰的局部逻辑块。
3. 再评估 form 生命周期相关调用是否需要进一步收敛。
4. 仅在行为可验证不变的前提下实施最小改动。

### 风险评估
1. 该文件与员工、组织、角色三条链路耦合较深，错误拆分可能导致员工绑定、角色推荐或编辑态锁定逻辑失效。
2. `form.setValue()` 与 `form.setError()` 当前承担业务联动职责，若过度消减，可能破坏动态校验反馈。
3. 该文件已经承载用户创建/编辑关键路径，本轮必须优先保证行为不变而不是强追 lint 清零。

### 验证策略
- 定向检查目标文件 eslint / TypeScript 报错。
- 人工验证以下场景：
  - 新建用户时员工列表过滤正确
  - 选择员工后姓名/手机号/用户名自动回填正确
  - 部门角色自动推荐与锁定语义正确
  - 编辑用户时既有角色与 employeeId 行为不偏移
  - 保存成功后关闭、toast 与 reset 语义不变

### 明确排除项
- 不扩大到 users 域以外的其他表单。
- 不将本轮升级为权限模型或用户域架构重构。
- 不为抽象而抽象，不额外引入新的全局表单基础设施。

## users-action-dialog 方向A：reset/关闭逻辑与提交拆薄（待确认）

### 目标背景
在完成 `users-action-dialog.tsx` 的副作用模式拆分后，当前主组件已明显瘦身，但仍有两块局部复杂度集中：
- `form.reset()` 与关闭逻辑分散在 `Dialog onOpenChange`、create success、update success 三处。
- `onSubmit` 仍同时承担编辑态角色解析、payload 构造、密码补充、错误注入与 mutation 调用。

这两类问题已经从“跨职责混杂”收敛为“局部实现过厚”，适合进入方向 A：先统一 reset/关闭收尾，再拆薄提交路径。

### 本轮范围
#### 1) reset / 关闭逻辑收敛
- 目标：
  - 将关闭弹窗与成功提交后的 reset 收尾逻辑统一到局部 helper。
- 原则：
  - 不改变当前保存成功后清空表单并关闭的用户体验。
  - 不提前移除 `form.reset()`，只先减少重复和分散调用。

#### 2) onSubmit 与 payload 构造拆薄
- 目标：
  - 抽出编辑态 role 解析逻辑。
  - 抽出 update payload 构造逻辑。
  - 抽出 create/update 成功后的共同收尾逻辑。
- 原则：
  - 保持 `UserUpdatePayload` 结构不变。
  - 保持 role 必填校验、employee dept role 校验与 toast 语义不变。

### 实施顺序
1. 先梳理 `users-action-dialog.tsx` 中所有 `form.reset()` 与关闭调用点。
2. 提取统一的 close/reset helper，消除重复收尾逻辑。
3. 再拆出 `onSubmit` 内的 role 解析与 payload 构造纯函数/局部 helper。
4. 最后复核 create / update 两条路径的行为是否仍一致。

### 风险评估
1. 若 reset/关闭逻辑收敛不当，可能导致关闭后再次打开时保留脏数据，或编辑态成功后表单残留旧值。
2. 若 payload 构造拆分不严谨，可能破坏空密码不提交、锁定角色场景显式回传 role 等既有修复成果。
3. 本轮虽不大改状态模型，但仍处于用户创建/编辑关键路径，必须优先保证行为一致。

## Phase 2 收尾：历史 lint / 旧债定向治理（待确认）

### 目标背景
在完成 Frontend Zero-Audit Permissions Phase 2 的主链路改造后，当前仍残留一批历史 lint / 旧债，它们主要集中在：
- 本轮新增权限入口投影过程中刚触达的旧文件
- 权限入口、固定目标路由跳转、监控横幅、基础配置页等周边文件
- 会持续影响后续权限链路维护的显式噪音（如重复 import、Hook 顺序问题、局部 `any`、仅类型 import）

用户当前明确要求“历史 lint / 旧债仍存在，处理一下吧”，因此本轮需要追加一个**收尾治理阶段**；但必须严格限制范围，避免从权限收尾扩展为全仓 lint 清零或大规模技术债重构。

### 本轮范围
#### 1) 与权限入口链路直接相关的旧债
- 优先目标：
  - `src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`
  - `src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`
  - `src/features/warehouse/components/shipment-history.tsx`
  - 以及本轮新增接入 `route-entry-access` 的少量周边文件
- 处理原则：
  - 仅收敛会影响权限入口稳定性或明显污染后续维护的局部问题。
  - 不顺手重构整页业务逻辑。

#### 2) 可局部闭合的低风险 lint
- 可接受动作：
  - 修复重复 import / 仅类型 import
  - 收敛本轮新触达文件中的局部 `any`
  - 调整因早返回导致的 Hook 顺序问题
  - 对固定目标路由入口继续补齐统一权限投影
- 不做事项：
  - 不发起全局 `any` 清零
  - 不处理纯样式类名建议 warning
  - 不把页面 effect/setState 模式全面重构为新的状态模型，除非其已直接妨碍本轮目标文件的稳定性

### 实施顺序
1. 先按“是否与权限入口链路直接相关”筛选目标文件。
2. 优先修复明确由本轮新增接入暴露出来的问题，如重复 import、类型不稳、Hook 顺序错误。
3. 再视情况处理目标文件中低风险、局部可闭合的历史 lint。
4. 对仍然存在但与本轮目标无强关联的旧债，明确记录为保留项，不继续扩面。
5. 最后执行 `tsc` / handlers 编译验证，并把结果写入 `walkthrough.md`。

### 风险评估
1. 某些历史 lint 背后是旧文件长期累积的状态模型问题，若范围控制不好，容易演变为页面级重构。
2. `system-anomaly-banner.tsx`、`dm-numbering-mgmt.tsx` 这类文件本身已有较多历史欠账，若试图一次性清空，可能偏离权限收尾目标。
3. 继续修改入口相关文件时，必须优先保证现有权限链路、固定目标跳转与文案行为不被破坏。

### 验证策略
- 必做：
  - `pnpm exec tsc --noEmit`
  - `go test ./handlers -run ^$`
- 选做：
  - 对实际改动文件执行定向 `eslint`

### 明确排除项
- 不做全仓 lint 清零。
- 不处理纯 Tailwind 类名优化 warning。
- 不把本轮升级为通用监控页重构、基础配置页重构或表单架构调整。

## Phase 2 收尾补充：剩余样式类名 warning 定向清理（待确认）

### 目标背景
在完成权限入口链路相关 lint / 旧债收尾后，当前 IDE 剩余问题已收敛为少量明确、低风险的 Tailwind 类名 warning。

用户当前要求“把剩下的都解决”，而这些 warning 在上一轮方案中属于明确保留项，因此需要单独追加一个补充收尾阶段。

### 本轮范围
#### 1) 仅处理已列出的剩余 warning
- 目标文件限定为：
  - `src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`
  - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
  - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
  - `src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`
  - `src/features/terminal-config/tabs/pda-terminal.tsx`
- 只处理 IDE 当前列出的 8 个 warning，不扩展到新的样式告警。

#### 2) 仅做等价类名替换
- 可接受动作：
  - `z-[100] -> z-100`
  - `bg-[length:200%_100%] -> bg-size-[200%_100%]`
  - `bg-gradient-to-b -> bg-linear-to-b`
  - `bg-primary/[0.02] -> bg-primary/2`
  - `rounded-[2rem] -> rounded-4xl`
  - `bg-emerald-500/[0.06] -> bg-emerald-500/6`
  - `bg-amber-500/[0.06] -> bg-amber-500/6`
- 不做事项：
  - 不改布局结构
  - 不改组件逻辑
  - 不做视觉语义重构

### 实施顺序
1. 按用户列出的 warning 清单逐文件替换。
2. 替换后执行目标文件定向 `eslint`。
3. 再执行一次 `pnpm exec tsc --noEmit`，确认没有引入副作用。
4. 将结果写入 `walkthrough.md`。

### 风险评估
1. 本轮风险极低，主要是类名替换写错导致样式类无效。
2. 因为不改逻辑和结构，理论上不会影响权限链路或业务行为。

### 验证策略
- 必做：
  - 定向 `eslint`（仅目标文件）
  - `pnpm exec tsc --noEmit`

### 明确排除项
- 不继续扩展到未列出的 warning。
- 不做视觉设计调整。
- 不把本轮升级为 UI 规范统一工程。

## Phase 2 收尾补充：pda-terminal 历史 no-console 清理（待确认）

### 目标背景
在完成剩余 8 个样式类名 warning 清理后，当前定向 `eslint` 仍被 `src/features/terminal-config/tabs/pda-terminal.tsx` 中 2 处历史 `console.*` 阻塞。

这部分不属于上一轮“仅清样式 warning”的审批范围，因此需要单独追加一个极小范围收尾阶段。

### 本轮范围
#### 1) 仅处理 `pda-terminal.tsx` 的 2 处 `no-console`
- 目标文件限定为：
  - `src/features/terminal-config/tabs/pda-terminal.tsx`
- 只处理当前定向 `eslint` 暴露的两处控制台输出，不扩展到其他文件。

#### 2) 采用最小改动
- 可接受动作：
  - 直接移除无必要的调试输出
  - 或改成不触发 `no-console` 的局部等价处理
- 不做事项：
  - 不改页面流程
  - 不改权限入口逻辑
  - 不新增日志框架或全局错误处理基础设施

### 实施顺序
1. 读取 `pda-terminal.tsx` 中两处 `console.*` 上下文。
2. 判断其是否属于纯调试输出；若是，则直接删除。
3. 若确有保留必要，则改为不触发 lint 的局部处理方式。
4. 执行该文件定向 `eslint` 与一次 `pnpm exec tsc --noEmit`。
5. 将结果补充到 `walkthrough.md`。

### 风险评估
1. 风险很低，主要是误删本地诊断信息后影响调试便利性。
2. 因为不改业务逻辑，不应影响 PDA 工作台行为。

### 验证策略
- 必做：
  - `pnpm exec eslint src/features/terminal-config/tabs/pda-terminal.tsx`
  - `pnpm exec tsc --noEmit`

### 明确排除项
- 不扩大到 `pda-shell.tsx` 或其他 terminal-config 文件。
- 不为这两处 console 引入新的日志/监控基础设施。

## 前端日志治理 / lint 规则治理（待确认）

### 目标背景
当前项目里暴露出的 `no-console` 问题，不适合继续按“发现一处删一处”的方式做局部补丁。这样虽然能短期消除面板告警，但不能回答三个根本问题：
- 前端到底允许哪些日志存在？
- 页面 / 组件 / hooks / services 各层是否应该有不同的日志边界？
- lint / CI 应如何提前拦截，而不是等到收尾阶段再人工扫尾？

用户已明确要求：**独做“前端日志治理 / lint 规则治理”，而不是继续在当前轮次里补丁式消噪。**

### 本轮目标
1. 建立前端日志分层治理边界。
2. 明确 `console.*` 的允许范围、替代出口与例外场景。
3. 设计 lint / CI 规则收敛方案，避免以后继续靠人工补丁。
4. 在方案获批前，暂停继续对单个业务文件的 `console` 做零散删除。

### 研究与设计范围
#### 1) 现状盘点
- 扫描前端代码中的 `console.log`、`console.warn`、`console.error`、`console.debug` 分布。
- 区分以下场景：
  - 页面/组件层临时调试输出
  - hooks/services 层错误兜底
  - 初始化/权限/契约断言日志
  - 测试或脚本中的合法控制台输出

#### 2) 治理策略设计
- 建议优先形成如下边界：
  - **页面/组件层**：默认禁止直接 `console.*`
  - **hooks/services 层**：仅允许通过统一日志出口或受控错误上报
  - **脚本/测试文件**：可保留必要控制台输出，但应与业务代码规则隔离
- 若需要统一出口，可评估：
  - 是否新增轻量 `logger` 工具
  - 是否只做 lint 规则分层，而暂不引入新日志基础设施

#### 3) lint / CI 规则治理
- 评估 `eslint.config.js` 中 `no-console` 的现状与可配置粒度。
- 设计“按目录 / 文件类型 / 运行环境”分层规则，而不是一刀切或完全放开。
- 若有必要，可在 `package.json` 或 `scripts/` 中增加定向校验命令，并评估是否接入 CI。

### 实施顺序
1. 先盘点前端 `console.*` 分布与使用语义。
2. 输出日志分层治理方案与替代策略。
3. 明确 lint 配置改法与 CI 接入点。
4. 先请你审批方案，再进入代码实施。

### 风险评估
1. 若直接全仓禁用 `console` 而没有替代策略，可能误伤真实需要的错误诊断信息。
2. 若过早引入复杂日志基础设施，可能把“治理任务”膨胀为新的架构工程。
3. 若 lint 规则粒度设计不当，可能导致脚本/测试/前端业务代码混用同一套不合适的限制。

### 验证策略
- 规划阶段：
  - 以方案完整性与边界清晰度为准
- 实施阶段（待批准后）：
  - 至少执行定向 `eslint`
  - `pnpm exec tsc --noEmit`
  - 必要时执行新增的日志治理校验脚本或 lint 命令

### 明确排除项
- 当前阶段不继续对 `pda-terminal.tsx` 做单点补丁。
- 当前阶段不直接发起全仓 `console` 批量替换。
- 当前阶段不默认引入重型日志/监控平台。

## 前端日志治理第二阶段：全仓替换 / scripts-tests 分层 / CI / 重型日志平台（待确认）

### 目标背景
第一阶段已经验证：通过轻量 `logger`、受控 `eslint` 例外与少量试点迁移，可以建立前端日志治理的最小闭环。

你当前要求继续进入扩面阶段，明确包括：
- **全仓 `console` 替换**
- **`scripts / tests` 分层规则**
- **CI 接入**
- **重型日志平台**

这意味着日志治理将从“试点验证”进入“工程级收敛”，需要单独规划，以避免直接扩大改动面后失控。

### 本轮目标
1. 系统性替换前端业务代码中的散落 `console.*`。
2. 为 `scripts/**`、测试文件与前端业务代码建立分层 lint 规则。
3. 将日志治理校验接入本地命令与 CI。
4. 明确并实施重型日志平台的最小接入方案。

### 范围拆分
#### 1) 全仓 `console` 替换
- 分层推进顺序建议：
  - **第一批**：页面 / 组件层
  - **第二批**：hooks / services
  - **第三批**：基础设施层（`main.tsx`、`routes/__root.tsx`、`lib/api-client.ts` 等）
- 原则：
  - 普通业务文件不再直接使用 `console.*`
  - 统一走轻量 `logger` 或未来的重型平台桥接出口

#### 2) `scripts / tests` 分层规则
- 目标：
  - 不再让脚本、测试、前端业务代码共用同一套 `no-console` 策略
- 建议分层：
  - `src/**` 前端业务代码：严格治理
  - `scripts/**`：允许必要控制台输出
  - `**/*.test.*` / `**/*.spec.*`：允许测试诊断输出，或使用更宽松规则

#### 3) CI 接入
- 目标：
  - 将日志治理从“人工发现问题”改为“提交前 / CI 自动阻断”
- 建议动作：
  - 在 `package.json` 增加日志治理命令，如 `lint:logging` 或按目录的 `eslint` 命令
  - 在 `.github/workflows/ci.yml` 中接入对应校验

#### 4) 重型日志平台
- 目标：
  - 明确哪些日志应进入浏览器控制台，哪些应进入远程平台
  - 为生产环境异常提供更稳定的诊断能力
- 规划要求：
  - 必须先明确供应商与接入方式
  - 必须说明环境变量与密钥管理
  - 必须明确脱敏边界，禁止把 token、密码、PII 直接上报
  - 必须提供降级策略：平台不可用时不影响前端主流程

### 实施顺序
1. 先全局盘点剩余 `console.*`，生成分层迁移清单。
2. 先完成 `eslint.config.js` 的分层规则扩展。
3. 再分批替换前端业务代码中的 `console.*`。
4. 补充 `package.json` / `scripts` / CI 接入。
5. 最后评估并接入重型日志平台的最小可运行方案。
6. 每一阶段完成后更新 `walkthrough.md`。

### 风险评估
1. 全仓替换会触达大量文件，若一次性推进过猛，容易引入回归或丢失真实诊断信息。
2. `scripts / tests` 分层规则若设计不当，可能误伤开发脚本与测试调试体验。
3. CI 接入后会提高工程门槛，必须确保规则合理且不会阻塞正常开发。
4. 重型日志平台若接入不慎，可能引入敏感信息泄露、额外网络依赖或前端运行时负担。

### 验证策略
- 分批验证：
  - 定向 / 全局 `eslint`
  - `pnpm exec tsc --noEmit`
  - 新增日志治理脚本验证
- CI 验证：
  - 确认工作流配置通过静态检查与目标命令执行
- 平台接入验证：
  - 验证开发/生产环境开关
  - 验证平台不可用时前端不受阻

### 明确排除项
- 在你批准前，不直接发起全仓 `console` 替换。
- 在你批准前，不修改 CI 工作流、不接入外部日志平台。
- 在你批准前，不默认把第一阶段试点直接扩展为全仓机械替换。

## 当前样式类名 warning 定向清理（2026-04-05，待确认）

### 需求背景
当前 IDE 明确列出一组 Tailwind 类名 warning，已经影响你继续上传服务器验证。该批问题均属于类名等价写法建议，风险低、边界清晰，适合做一次小范围定向收尾。

### 本轮目标
1. 仅清理当前 IDE 面板中列出的 Tailwind 类名 warning。
2. 仅做等价类名替换，不改结构、不改逻辑、不改视觉语义。
3. 在最小范围内恢复一个可继续上传服务器验证的前端状态。

### 修改范围
仅处理以下文件：
- `src/features/basic-settings/tabs/dm-numbering-mgmt.tsx`
- `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
- `src/features/system-mgmt/monitor/components/system-anomaly-banner.tsx`
- `src/features/system-mgmt/notifications/components/notification-center.tsx`
- `src/features/terminal-config/tabs/pda-terminal.tsx`
- `src/features/users/components/users-multi-delete-dialog.tsx`

### 实施策略
#### 1) 等价 Tailwind 类名替换
- 只替换 IDE 已提示的类名：
  - `bg-gradient-to-b -> bg-linear-to-b`
  - `rounded-[2rem] -> rounded-4xl`
  - `z-[100] -> z-100`
  - `bg-[length:200%_100%] -> bg-size-[200%_100%]`
  - `bg-gradient-to-br -> bg-linear-to-br`
  - `bg-gradient-to-r -> bg-linear-to-r`
  - `dark:hover:bg-white/[0.06] -> dark:hover:bg-white/6`
  - `dark:bg-white/[0.08] -> dark:bg-white/8`
  - `dark:bg-white/[0.06] -> dark:bg-white/6`
  - `bg-emerald-500/[0.06] -> bg-emerald-500/6`
  - `bg-amber-500/[0.06] -> bg-amber-500/6`

#### 2) 不扩散处理
- 不顺手处理未列出的 warning。
- 不处理 `console`、`any`、Hook、类型或业务逻辑问题。
- 不借机重构样式结构或统一 UI 规范。

### 风险评估
1. 风险很低，主要风险是个别类名替换写错导致样式失效。
2. 因为只做等价类名替换，不应影响交互逻辑或权限链路。
3. `notification-center` 与 `system-anomaly-banner` 属于全局 UI 入口，但本轮不改结构，因此风险可控。

### 验证策略
1. 对目标文件执行定向 `eslint`，确认 warning 清除。
2. 执行 `pnpm exec tsc --noEmit`，确认没有引入额外副作用。
3. 完成后更新 `walkthrough.md` 记录本轮结果。

### 明确排除项
- 不扩展为全仓 Tailwind warning 清理。
- 不修改任何业务逻辑、文案、状态流或组件结构。
- 在你确认前，不开始修改上述业务文件。

### 范围补充（已确认）
在执行目标文件定向 `eslint` 后，若仅剩 `src/features/system-mgmt/notifications/components/notification-center.tsx` 的既有类型错误阻塞（如 `import type` 与局部 `any`），则允许在**同一文件**内追加最小类型收敛：
- 将仅用于类型的位置改为 `import type`
- 将局部 `any` 改为可证明安全的最小类型或窄化

边界约束：
- 不扩展到其它文件
- 不改通知中心业务流程或交互语义
- 不借机发起通用类型系统治理

## 当前上传阻塞编译错误定向修复（2026-04-05，待确认）

### 需求背景
当前上传前编译输出显示两类高确定性错误：
- `src/features/warehouse/services/inventory-service.ts` 引用了失效的语言依赖路径，并使用了当前文件内未定义的 `AppLocale` / `DEFAULT_LOCALE`。
- `src/routes/_authenticated/terminal-config/pda.tsx` 从 `pda-terminal` 导入了不存在的导出成员。

这些问题会直接阻塞前端构建，因此需要单独做一次最小范围修复。

### 本轮目标
1. 恢复 `inventory-service.ts` 的可编译状态。
2. 修正 `pda.tsx` 与 `pda-terminal.tsx` 之间的导出契约。
3. 不扩展为 i18n、terminal-config 或 warehouse 域的重构任务。

### 修改范围
- `src/features/warehouse/services/inventory-service.ts`
- `src/routes/_authenticated/terminal-config/pda.tsx`
- 如需核对导出签名，仅只读查看 `src/features/terminal-config/tabs/pda-terminal.tsx`

### 实施策略
#### 1) `inventory-service.ts` 最小兼容修复
- 核对当前项目中实际存在的语言工具与 locale 类型来源。
- 将失效 import 替换为现有可用依赖，或退回到文件内最小安全默认值。
- 去除未使用 import，补齐缺失类型/常量定义。
- 不修改库存服务业务逻辑与接口契约。

#### 2) `pda.tsx` 导出契约修复
- 读取 `pda-terminal.tsx` 当前实际导出名。
- 将路由文件中的错误导入修正为现有导出，或在不改变行为的前提下恢复兼容导出。
- 不扩展到 terminal-config 其它路由。

### 风险评估
1. `inventory-service.ts` 若误接到错误的 locale 来源，可能造成文案语言回退逻辑偏移。
2. `pda.tsx` 若导出契约判断错误，可能导致页面路由正常编译但运行期挂载错误组件。
3. 本轮应优先恢复编译，不顺手做无关清理。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit` 确认编译恢复。
2. 如范围允许，对目标文件执行定向 `eslint`。
3. 完成后更新 `walkthrough.md` 记录变更与验证结果。

### 明确排除项
- 不扩展为通用 i18n 架构调整。
- 不重构 warehouse 服务层。
- 不处理与当前截图无关的其它 TypeScript / lint 报错。

## `/engineering/products` 页面中英混合文案修正（2026-04-06，待确认）

### 需求背景
当前 `/engineering/products` 页面在中文与英文模式下都存在大面积中英混排，根因并非单条文案缺失，而是该页当前采用了“双语拼接文案 + 组件二次拆分渲染 + 局部硬编码技术占位词”的实现方式，导致：
- 中文模式下仍显示大量英文 token / 英文标签。
- 英文模式下仍混入中文或中文说明。
- 页面组件把翻译结果通过 `split(' / ')`、`split(' // ')` 当作结构化数据解析，造成 i18n 与布局逻辑耦合。

用户当前要求：**中文就是中文，英文就是英文**，因此本轮需要从文案结构与渲染方式两侧同时收口，而不是只替换截图中少数可见字符串。

### 本轮目标
1. 将 `/engineering/products` 页面主视图切换为真正的单语显示：中文模式纯中文，英文模式纯英文。
2. 清理 `engineering.productMgmt` 下直接拼接中英双语的文案定义。
3. 移除页面组件对翻译字符串分隔符的依赖，防止后续继续出现中英耦合渲染。
4. 保持页面现有结构、交互、数据加载与权限链路不变。

### 修改范围
- `src/locales/messages/zh-CN/engineering.ts`
- `src/locales/messages/en-US/engineering.ts`
- `src/features/engineering/index.tsx`
- `src/features/engineering/components/engineering-sidebar.tsx`

### 实施策略
#### 1) 语言包单语化收口
- 重点处理 `engineering.productMgmt` 下当前使用“英文 token / 中文说明”或“中文说明 // 英文 token”结构的字段。
- 将这些字段改为：
  - `zh-CN` 仅输出中文用户文案
  - `en-US` 仅输出英文用户文案
- 不保留面向终端用户的内部 token，例如 `PRODUCT_MANAGEMENT_DASHBOARD`、`INITIALIZE_NEW_PROJECT`、`INITIATE_NEW_MODELLING_PROJECT`。

#### 2) 组件侧去结构化拆分
- 删除 `index.tsx` 与 `engineering-sidebar.tsx` 中对翻译结果执行 `split(' / ')`、`split(' // ')` 的逻辑。
- 改为直接渲染单语 `t(...)` 结果，避免“翻译字符串承担布局数据结构”的实现模式。

#### 3) 页面内硬编码文案纳入 i18n
- 将当前直接写死在组件中的 `OVERVIEW`、`ROUTING`、`SPEC:`、`NULL_CONSTRAINTS` 等文本改为从 `engineering.productMgmt` 或其子键读取。
- 若现有 key 不适合承载这些文案，则在 `engineering.ts` 内补充最小新增 key，但不扩展到无关模块。

#### 4) 严格控制影响范围
- 不调整页面布局层级。
- 不修改产品列表、详情面板、弹窗、服务层的业务逻辑。
- 不顺手扩散到 `engineering` 模块其它 tabs，除非本轮目标文件已直接依赖同一文案 key 且不修会造成明显断裂。

### 风险评估
1. `engineering.productMgmt` 下部分 key 可能已被其它 engineering 子组件复用，若只按首页截图调整，可能导致其它视图出现语义漂移。
2. 移除 `split(...)` 后，若组件布局仍假定“一个 key 返回两段内容”，需要同步收口对应 DOM 结构，避免出现空行或错位。
3. 某些当前可见英文并非翻译缺失，而是故意写死的视觉标签；若直接清空，需要保证替换后的 i18n key 覆盖完整。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit`，确认 i18n key 与组件改动未引入类型错误。
2. 对目标文件执行定向 `eslint`，确认未引入新的语法或 Hooks 问题。
3. 人工验证以下场景：
   - 中文模式下页面标题、按钮、空态、Tabs、规格标签均为纯中文。
   - 英文模式下上述区域均为纯英文。
   - 页面结构、交互、弹窗打开与列表选择行为保持不变。

### 明确排除项
- 不扩展为整个 `engineering` 模块的全面文案重写。
- 不进行视觉风格重构，只处理文案来源与渲染策略。
- 在你确认前，不开始修改上述业务文件。

## `productMgmt` 其余表单 / 详情区中英混排残留清理（2026-04-06，待确认）

### 需求背景
上一轮已完成 `/engineering/products` 首页入口区域的单语化修正，但 `engineering.productMgmt` 下仍有一批更深层文案保留旧的“中英拼接 / token 直出”模式，主要集中在：
- 详情区标题与标签
- 创建 / 编辑产品弹窗
- 表单字段 label / placeholder
- 约束标签区
- 附件区
- 条码区

如果只修首页入口，这些区域在中文/英文模式下仍会继续显示 `PRODUCT_*`、`EDIT_*`、`LIVE_PREVIEW`、`UPLOAD_*`、`PRINT_*` 等技术风格 token，无法达到 `productMgmt` 模块整体“中文就是中文，英文就是英文”的目标。

### 本轮目标
1. 继续清理 `engineering.productMgmt` 中除首页入口外的用户可见混排文案。
2. 将详情区、弹窗、表单、限制标签、附件区、条码区入口文案切换为真正单语。
3. 若相关组件仍依赖旧双语格式，同步移除这些格式假设。
4. 保持现有交互、数据流、保存逻辑与权限链路不变。

### 预估修改范围
- `src/locales/messages/zh-CN/engineering.ts`
- `src/locales/messages/en-US/engineering.ts`
- `src/features/engineering/components/product-overview-tab.tsx`
- `src/features/engineering/components/product-action-dialog.tsx`
- 以及 `productMgmt` 相关、真实消费上述 key 的少量子组件（仅读取后按需纳入，不预先扩面）

### 实施策略
#### 1) 语言包分区清理
- 重点复核 `engineering.productMgmt` 下以下分区：
  - `technicalArchive / coreCategory / estimatedWeight / riskConstraints / archiveLog / genericParts`
  - `dialog.*`
  - `form.*`
  - `restrictions.*`
  - `attachments.*`
  - `barcode.*`
- 将仍为“英文 token / 中文说明”或“中文 / 英文”拼接的字段改为单语版本。

#### 2) 消费组件联动收口
- 检查 `product-overview-tab`、`product-action-dialog` 及其直接子组件是否：
  - 直接渲染这些旧 key
  - 假定文案含双语分隔符
  - 直接展示技术 token 风格文案
- 若存在，则同步改为直接消费单语 `t(...)` 结果。

#### 3) 严格限制范围
- 不修改表单字段结构。
- 不修改保存 payload、服务调用、上传/打印/预览逻辑。
- 不顺手扩展到 `engineering` 其它 tabs 或无关 locale 模块。

### 风险评估
1. `productMgmt` 下深层 key 的消费面比首页入口更分散，若漏掉某个详情/弹窗子组件，可能出现局部仍旧混排。
2. 某些 key 可能被多个子组件复用，若只按字面翻译修改，需要复核是否会造成上下文语义不自然。
3. 条码、附件、限制标签区域可能存在视觉强化样式；文案变为单语后需要确认不会出现排版拥挤或空白异常。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit`。
2. 对实际改动文件执行定向 `eslint`。
3. 人工验证以下场景：
   - 中文模式下详情区、弹窗、表单、附件区、条码区不再混入英文 token。
   - 英文模式下上述区域不再混入中文说明。
   - 新建/编辑产品弹窗、附件区、条码区交互保持原状。

### 明确排除项
- 不扩展为整个 `engineering.ts` 的全量文案重写。
- 不进行表单结构调整或 UI 重设计。
- 在你确认前，不开始修改本轮新增目标文件。

## 人事账号中心产线管理 TAB 收口为 `产线 -> 工段 -> 工序`（2026-04-06，待确认）

### 需求背景
当前人事账号中心的产线管理 TAB 复用了 `src/features/production-shared/tabs/line-mgmt` 共享实现，但这条链路存在三类明显偏移：
- 前端类型层把 `Segment` 定义成 `processes`，而组件层又在使用 `jobCategories`
- 共享组件命名与文案混用了 `job / jobCategory / process`
- 后端真实模型为 `ProductionLine -> LineSegment -> JobCategory -> Station -> ProcessStep`，与用户当前明确要求的前端语义 `产线 -> 工段 -> 工序` 不一致

用户已经明确：**这一页就要 `产线 -> 工段 -> 工序`**。因此本轮的核心不是补丁式改文案，而是把前端共享页的展示模型、命名和保存投影统一收口到这个三层语义。

### 本轮目标
1. 将人事账号中心产线管理 TAB 的前端唯一展示语义收口为：`产线 -> 工段 -> 工序`。
2. 清理前端共享页中对 `job / jobCategory / station` 的错层级暴露与混乱命名。
3. 在不破坏现有后端深层模型的前提下，建立前端到后端的稳定投影适配。
4. 保持授权码、版本控制、保存冲突与权限链路不变。

### 预估修改范围
- `src/features/production-shared/tabs/line-mgmt/types.ts`
- `src/features/production-shared/tabs/line-mgmt/hooks/use-line-topology.ts`
- `src/features/production-shared/tabs/line-mgmt/components/line-card.tsx`
- `src/features/production-shared/tabs/line-mgmt/components/topology/segment-node.tsx`
- `src/features/production-shared/tabs/line-mgmt/components/topology/job-node.tsx`
- 以及该共享页中直接消费上述类型/回调的少量组件
- 如需仅做只读核对，可补读后端：`server/services/production_service.go`、`server/models/production.go`

### 实施策略
#### 1) 先统一前端展示抽象
- 将共享页前端类型统一为：
  - `ProductionLine`
  - `Segment`
  - `ProcessStep`
- 不再在该页面展示层沿用 `jobCategory`、`job`、`station` 作为用户可见节点概念。

#### 2) 建立前端到后端的投影适配
- 由于后端真实模型更深，不建议本轮直接重构后端数据模型。
- 更稳妥的方式是：
  - 前端页面内部只操作 `segments[].processes[]`
  - 在提交保存前，将前端三层结构映射到后端当前可接受的嵌套模型
  - 在读取回填时，将后端深层结构折叠回 `工段 -> 工序` 视图
- 这样可以先收口用户语义，再保留后端兼容性。

#### 3) 收口组件命名与统计逻辑
- 将 `handleAddJob / handleUpdateJobName / handleRemoveJob` 等命名统一改为 `Process` 语义。
- 将层级统计改为真实反映：
  - 工段数
  - 工序数
- 不再把中间层错误统计成“jobs”。

#### 4) 严格控制范围
- 不改授权码校验链路。
- 不改产线保存版本冲突处理。
- 不在本轮发起后端 `ProductionLine` / `LineSegment` / `JobCategory` / `Station` / `ProcessStep` 模型重构。
- 不扩展到拓扑模板中心的全量重写，除非共享类型变更必须同步极少量适配。

### 风险评估
1. 当前共享页前端类型与组件已不一致，直接修改命名可能引发较多编译/回调联动，需要按类型入口逐步收口。
2. 若前端三层语义与后端五层模型映射设计不严谨，可能导致保存后回填层级错乱或节点丢失。
3. 拓扑模板与产线详情共用这套结构，若投影边界没收紧，可能出现模板应用后层级错位。
4. 若把“工段 -> 工序”强行直接写死到后端而无过渡层，会扩大为服务端结构重构，超出本轮边界。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit`。
2. 对实际改动文件执行定向 `eslint`。
3. 人工验证以下场景：
   - 新增产线后可新增工段，再在工段下新增工序。
   - 编辑、删除、重命名节点时，用户侧只看到 `工段` 与 `工序` 概念。
   - 保存后重新进入页面，层级仍保持 `产线 -> 工段 -> 工序`。
   - 授权码、保存冲突提示与现有保存链路保持不变。

### 明确排除项
- 不在本轮直接重构后端深层生产拓扑模型。
- 不扩展为 wheel trace、排产、质检等其它消费产线拓扑模块的联动重构。
- 在你确认前，不开始修改上述业务文件。

## 产线拓扑三层模型彻底去兼容壳（2026-04-06，待确认）

### 需求背景
上一轮已经把人事账号中心产线管理 TAB 的**用户可见语义**收口为 `产线 -> 工段 -> 工序`，但当前代码结构仍保留了明显兼容壳：
- 前端共享类型中仍保留后端兼容容器 `jobCategories`
- 资源服务承担了“读取折叠 / 保存展开”的隐式投影逻辑
- `topology-template`、`work-architecture` 等共享消费方仍可能引用旧层级概念

这意味着当前状态属于“展示层干净、实现层兼容保留”，还不是“模型本身干净”。

如果目标升级为**彻底去兼容壳**，则需要继续推进：
- 前端共享 contract 不再夹带历史层级概念
- 共享模块统一消费三层模型
- 兼容转换从业务组件中抽离为显式 adapter / contract 边界，或直接由后端提供更干净的接口契约

### 本轮目标
1. 将前端共享产线拓扑模型真正统一为：`ProductionLine -> Segment -> ProcessStep`。
2. 清理前端共享层中残留的 `jobCategories / stations` 类型壳与隐式兼容逻辑。
3. 明确三层前端 contract 与后端深层模型之间的稳定边界。
4. 尽量减少业务组件对历史兼容映射的感知。

### 预估修改范围
- `src/features/production-shared/tabs/line-mgmt/types.ts`
- `src/features/production-shared/services/production-resource-service.ts`
- `src/features/production-shared/tabs/topology-template/**`
- `src/features/production-shared/tabs/work-architecture/**`
- `src/features/production-shared/tabs/line-mgmt/**`
- 若需要补契约文档或单独 adapter，可新增前端内部 adapter / mapper 文件
- 如需后端只读核对：`server/models/production.go`、`server/services/production_service.go`、相关 handler / repository

### 实施策略
#### 1) 先统一前端共享 contract
- 将 `line-mgmt/types.ts` 中的主模型收敛为三层：
  - `ProductionLine`
  - `Segment`
  - `ProcessStep`
- `JobCategory`、`Station` 若仍必须存在，只能退居 adapter / backend contract 类型，不再作为页面共享主类型。

#### 2) 将兼容转换抽离为显式 adapter
- 当前 `production-resource-service.ts` 内的折叠 / 展开逻辑是隐式兼容层。
- 本轮应将其升级为：
  - 独立 mapper / adapter 文件，或
  - 明确命名的 backend contract 类型 + frontend view model 类型转换层
- 目标是让业务组件只消费三层 view model，而不是继续感知历史结构。

#### 3) 清理共享消费面
- 逐个检查：
  - `topology-template`
  - `work-architecture`
  - 其它直接 import `line-mgmt/types.ts` 的页面
- 对这些模块进行最小必要适配，避免三层模型在一个模块成立、在另一个模块继续退回旧概念。

#### 4) 明确后端边界
- 若当前后端仍必须维持五层模型：
  - 则明确它只是 backend persistence model，不再让前端共享页面直接透传
- 若现有 handler 已难以支撑干净 contract：
  - 评估新增 projection 接口或更明确的 API response contract，但不在未审批前直接改后端。

### 风险评估
1. `line-mgmt/types.ts` 是共享类型入口，去兼容壳后会波及多个消费模块，联动面比上一轮更大。
2. 若模板中心或 work-architecture 仍依赖旧层级字段，可能出现连锁编译错误或运行时空数据。
3. 若前端彻底去壳但后端 contract 仍过于深层，adapter 设计不当会造成节点丢失、排序错乱或模板回填异常。
4. 若本轮进一步触碰后端接口契约，复杂度将显著上升，需严格控制是否越界成服务端重构。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit`。
2. 对所有实际改动文件执行定向 `eslint`。
3. 人工验证以下场景：
   - 产线管理 TAB 仍按 `产线 -> 工段 -> 工序` 正常编辑与保存。
   - 拓扑模板的创建、保存、复用不因去兼容壳而错层级。
   - `work-architecture` 等共享消费页不因类型收口而崩溃或出现空树。
   - 保存后回填顺序、节点名称、数量统计保持一致。

 ### 明确排除项
 - 不在本轮默认连带重构所有后端生产拓扑模型。
 - 不联动 wheel trace、报工、排产、质检等更广泛生产链模块，除非被共享类型编译阻塞直接命中。
 - 在你确认前，不开始修改本轮新增目标文件。

## 架构大瘦身：产线拓扑唯一合法层级收口为 `产线 -> 工段 -> 工序`（2026-04-06，待确认）

### 需求背景
用户最新指令已经进一步收紧，不再接受“前端三层展示、后端五层兼容”的中间态解释，而是明确要求：
- 主产线拓扑中**只有** `产线（ProductionLine） -> 工段（LineSegment） -> 工序（ProcessStep）`
- `岗位/工种（JobCategory）` 与 `工位（Station）` 在当前业务视图中属于**冗余且错误**的层级
- 主拓扑链不应继续围绕这两个历史中间层做读取、保存、预加载、DTO 回退或 UI 命名兼容

基于现有代码证据，当前系统仍存在明显偏移：
- `server/models/production.go` 仍把 `LineSegment` 挂接到 `JobCategory`，再由 `JobCategory` 挂接 `Station`
- `server/repositories/production_repository.go` 仍对 `Segments.JobCategories.Stations.Processes` 做预加载
- `server/services/production_service.go` 仍在保存产线时清理 `jobIDs / stationIDs`
- `server/services/production_line_contract.go` 仍在 `segment.Processes` 为空时回退遍历 `JobCategory -> Station -> ProcessStep`

这说明现在的问题已经不是“文案不准”或“前端命名错位”，而是**主拓扑后端事实来源仍被旧五层结构绑架**。

### 本轮目标
1. 明确主产线拓扑唯一事实来源为：`ProductionLine -> LineSegment -> ProcessStep`。
2. 将 `JobCategory / Station` 从主产线拓扑链的 contract、保存链、回填链与展示链中剥离。
3. 把旧 `Station` 相关能力映射从“主拓扑的一部分”降级为“待独立评估的历史子域”。
4. 在真正执行前，先把破坏性边界、数据迁移风险、联动模块与验证方案写清楚，等待审批。

### 本轮范围
#### A. 主拓扑后端收口范围
- `server/models/production.go`
- `server/repositories/production_repository.go`
- `server/services/production_service.go`
- `server/services/production_line_contract.go`
- `server/handlers`、`server/routes` 中直接暴露 `/production/lines` contract 的少量调用点

#### B. 主拓扑前端对齐范围
- `src/features/production-shared/services/production-resource-service.ts`
- `src/features/production-shared/tabs/line-mgmt/**`
- `src/features/production-shared/tabs/topology-template/**`
- 任何直接消费主产线拓扑 contract 的少量共享类型/适配层

#### C. 旧站点能力映射仅做边界评估，不默认执行删除
- `AssignProcessToStation`
- `RemoveProcessFromStation`
- `ListStationMappings`
- `station_process_mappings`
- `work-architecture` 及相关前后端调用链

### 实施策略
#### 1) 先把“主拓扑”与“旧能力映射子域”分开
- 主拓扑只允许解释：`产线 -> 工段 -> 工序`
- 任何“站点/工位/岗位/工种/能力映射”概念，即使仍有保留价值，也不能再作为主拓扑中间层存在
- 因此本轮设计上要先把两件事拆开：
  - 主拓扑收口
  - 旧站点能力映射子域去耦评估

#### 2) 后端 contract 先收口为三层，不再允许 DTO fallback
- 对 `/production/lines` 的返回与保存 contract 明确约束为：
  - `ProductionLineDTO`
  - `ProductionSegmentDTO`
  - `ProductionProcessDTO`
- `mapProductionLineToDTO(...)` 不再在 `segment.Processes` 为空时回退遍历 `JobCategory / Station`
- `mapProductionLineDTOToModel(...)` 不再为三层 DTO 人工补 `JobCategories: []models.JobCategory{}` 之类兼容壳

#### 3) 清理主保存链中的旧层级清理逻辑
- `collectProductionAssociationIDs(...)` 需要收口为只服务于主拓扑三层关联
- `DeleteJobCategoriesNotIn(...)` 与 `DeleteProductionStationsNotIn(...)` 若仍只为主拓扑保存链服务，应从该主链移除
- `SaveProductionLine(...)` 中只保留主拓扑必需的版本校验、授权码校验、工段与工序关联同步

#### 4) 明确 persistence model 的两种路线
- 路线 A：**先让主拓扑 contract 与服务链三层化，旧表/旧模型暂时只作为历史遗留保留，不再参与主链**
- 路线 B：**同步把 GORM 主模型也收口为三层，并推进历史数据迁移 / 删表 / 删旧模型**

基于当前风险，本审批稿建议：
- **优先执行路线 A**，先消除主拓扑链上的错误层级依赖
- 再基于真实消费面决定是否单独开下一轮，把旧表与旧模型彻底删除

#### 5) 前端只做 contract 对齐，不再承担“猜测后端五层”的职责
- 前端共享层只消费三层主 contract
- 不继续保留“读取时折叠 / 保存时展开”的隐式容错心智
- 若后端在审批后仍需临时兼容，也应通过明确 adapter 边界承担，而不是让业务组件混用旧层级术语

### 风险评估
1. **数据降维风险**：若历史数据当前真实存储在 `JobCategory / Station` 关联下，直接停用主链回退可能导致部分旧产线读取结果变空。
2. **隐藏依赖风险**：`work-architecture`、旧映射接口、测试代码或其它生产子模块可能仍绕过主 contract 依赖 `Station` 或 `JobCategory`。
3. **接口退场风险**：若主链 contract 直接变化，前端所有消费 `/production/lines` 的地方都必须同步对齐，否则会出现保存成功但回填错层级的问题。
4. **模型误删风险**：`Station` 虽然不是主拓扑合法层级，但它可能还承担独立“能力映射”语义；若不分域就直接删模型，容易误伤其它链路。

### 验证策略
1. 后端定向验证：
   - `go test` 覆盖 `production` 相关 services / handlers / routes / repositories
2. 前端静态验证：
   - `pnpm exec tsc --noEmit`
   - 对实际改动文件执行定向 `eslint`
3. 人工验证场景：
   - 新建/编辑产线时只能编辑 `工段` 与 `工序`
   - 保存后重新进入页面，仍保持 `产线 -> 工段 -> 工序`
   - 历史产线在去掉 DTO fallback 后不会无声丢失已有工序
   - 授权码、版本冲突、权限链路保持不变

### 明确排除项
- 在你确认前，不开始修改业务代码。
- 不在本轮未审批前直接删数据库表或做生产数据迁移。
- 不默认把 `Station` 相关所有后端/前端链路一轮内全部删除；先完成“主拓扑去错误层级”，再决定子域去留。

## 旧站点能力映射去耦：`Station` 不再挂靠主产线拓扑（2026-04-06，待确认）

### 需求背景
在主拓扑被明确收口为 `产线 -> 工段 -> 工序` 后，剩余的 `Station` 相关实现需要重新定性。

从现有代码证据看，`Station` 至少还残留在以下位置：
- `station_process_mappings`
- `AssignProcessToStation / RemoveProcessFromStation / ListStationMappings`
- `work-architecture` 相关页面与能力配置 UI

这说明 `Station` 不一定完全没有价值，但可以确定的是：
- 它**不能再被解释为主产线拓扑的中间层**
- 它若仍保留，只能作为独立子域存在，例如“能力映射”“资源映射”或其它单独语义

### 本轮目标
1. 把 `Station` 从主拓扑语义中剥离，避免后续继续误把它当成 `工段 -> 工序` 之间的合法层级。
2. 梳理旧 `Station` 链路到底是在表达什么业务能力。
3. 为下一轮提供清晰分叉：
   - 无人消费则彻底删除
   - 仍有业务价值则独立重命名、独立建模、独立接口

### 预估修改范围
- 本轮以分析与规划为主，重点核查：
  - `server/services/production_service.go`
  - `server/repositories/production_repository.go`
  - `server/models/production.go`
  - `server/handlers` 中 `production mappings` 相关 handler
  - `src/features/production-shared/tabs/work-architecture/**`
  - 其它直接引用 `Station` 或 `station_process_mappings` 的调用点

### 实施策略
#### 1) 先确认旧子域真实语义
- 判断它到底是在表示：
  - 工位能力映射
  - 人员/岗位能力挂载
  - 设备/资源节点
  - 或只是历史过度设计残留

#### 2) 明确拆域原则
- 无论最终命名为何，该子域都必须：
  - 不再参与 `/production/lines` 主 contract
  - 不再参与主拓扑保存/回填
  - 不再影响“工段下有哪些工序”这一核心事实

#### 3) 形成下一轮可执行选项
- 选项 A：无人消费，直接删除旧模型/旧表/旧接口
- 选项 B：存在消费，迁移为独立子域并重命名
- 选项 C：先冻结旧链路，只切断其与主拓扑的耦合，延后完整迁移

### 风险评估
1. 若误判为“完全无用”而直接删掉，可能破坏 `work-architecture` 或其它能力配置链路。
2. 若继续让它挂在主拓扑名下，即使前端页面已三层化，后端事实来源仍会再次回潮为错误层级。
3. 若不先定义新语义就做 rename，可能只是把旧设计换个名字保留下来。

### 验证策略
1. 核对全仓 `Station` / `station_process_mappings` 消费面是否完整。
2. 若后续进入执行阶段，必须分别验证：
   - 主拓扑编辑保存不再依赖旧站点链路
   - `work-architecture` 等旧消费面要么被替换，要么被明确隔离
3. 在 `walkthrough.md` 记录主拓扑收口与旧子域去耦的边界，防止后续再次混淆。

### 明确排除项
- 本审批稿阶段不直接删除 `Station` 相关表、模型、handler、route。
- 本审批稿阶段不假设 `work-architecture` 已可无损切换到新子域。
- 在你确认前，不开始修改相关业务代码。

## 当前 ai-assistant logger 未定义构建错误定向修复（2026-04-05，待确认）

### 需求背景
当前构建输出显示 `src/features/ai-assistant/services/provider-client.ts` 与 `src/features/ai-assistant/tabs/ai-access-control.tsx` 中存在 `TS2304: Cannot find name 'logger'`。

这说明此前日志治理替换已把 `console.*` 改为 `logger.*`，但当前文件内缺少对应的 `createLogger` 导入或 `logger` 实例声明，导致构建直接失败。

### 本轮目标
1. 恢复两个目标文件中的 `logger` 绑定。
2. 保持现有日志语义与业务逻辑不变。
3. 以最小改动恢复前端构建可通过状态。

### 修改范围
- `src/features/ai-assistant/services/provider-client.ts`
- `src/features/ai-assistant/tabs/ai-access-control.tsx`

### 实施策略
#### 1) `provider-client.ts`
- 检查是否已存在 `createLogger` 导入。
- 若缺失，则补齐 `import { createLogger } from '@/lib/logger'`。
- 若缺少实例，则在文件顶层补齐 `const logger = createLogger('AiProviderClient')`。

#### 2) `ai-access-control.tsx`
- 检查是否已存在 `createLogger` 导入。
- 若缺失，则补齐 `import { createLogger } from '@/lib/logger'`。
- 若缺少实例，则在文件顶层补齐 `const logger = createLogger('AiAccessControl')`。

### 风险评估
1. 风险很低，主要是 logger 实例名或插入位置错误导致重复定义或 import 顺序问题。
2. 因为不改调用点与业务逻辑，不应影响 AI 助手运行语义。

### 验证策略
1. 执行 `pnpm exec tsc --noEmit` 确认构建恢复。
2. 如范围允许，对两个目标文件执行定向 `eslint`。
3. 完成后更新 `walkthrough.md` 记录变更与验证结果。

### 明确排除项
- 不扩展到 ai-assistant 其它文件。
- 不调整 provider 重试策略、代理降级逻辑或 AI 权限配置行为。
- 不借机处理与本轮无关的 lint / 类型问题。

## 定向修复 `production-shared / scan-platform` 当前 TypeScript 编译错误（2026-04-06，待确认）

### 需求背景
当前编译输出显示两组直接阻断构建的 TypeScript 错误：

1. `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`
   - 组件仍从 `useWorkArchitecture()` 解构 `assignProcessToStation` / `removeProcessFromStation`
   - 但当前 hook 仅暴露 `assignProcessToJob` / `removeProcessFromJob`
   - 同时 `StationCapabilitiesDialog` props 已定义为 `jobId` / `jobName`，而 `station-node.tsx` 仍传入 `stationId` / `stationName`

2. `src/features/scan-platform/examples/wheel-trace/mock-wheel-trace-gateway.ts`
   - mock 数据仍包含 `stationName` / `stationCode`
   - 但 `WheelTraceStageSnapshot` 与 `WheelTraceTimelineNode` 已收敛到新的三层或阶段快照字段，不再接受这些旧字段
   - 因而 `WheelTraceLookupResponseContract.currentStage` 与 `timeline` 字面量均发生类型不匹配

### 本轮目标
1. 以最小改动恢复上述两组 TypeScript 错误。
2. 保持现有业务流与 UI 行为不做额外重构。
3. 明确本轮仅做 contract 对齐，不扩展到更大范围的站点能力子域拆旧或 wheel trace 领域建模调整。

### 修改范围
- `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`
- `src/features/production-shared/hooks/use-work-architecture.ts`（仅在确有必要时）
- `src/features/production-shared/tabs/work-architecture/components/station-capabilities-dialog.tsx`（仅在确有必要时）
- `src/features/scan-platform/examples/wheel-trace/mock-wheel-trace-gateway.ts`
- 必要时查看但尽量不修改：
  - `src/features/scan-platform/contracts/wheel-trace-gateway-contract.ts`
  - `src/features/scan-platform/models/wheel-trace.ts`

### 实施策略
#### 1) `production-shared` 部分
- 先以现有 `useWorkArchitecture` 暴露的 `job` 语义为准，不新增一套 `station` 兼容壳。
- 将 `station-node.tsx` 调整为与 `StationCapabilitiesDialog` 的当前 props 对齐：
  - 使用 `assignProcessToJob` / `removeProcessFromJob`
  - 传递 `jobId` / `jobName`
- 若 `station-node.tsx` 所持有的 `station` 实体本身就是历史残留 UI 节点，则仅把其 `id/name` 作为当前 dialog 所需标识透传，不在本轮扩大语义重构。

#### 2) `scan-platform` 部分
- 以 `WheelTraceStageSnapshot` 与 `WheelTraceTimelineNode` 当前定义为单一事实来源。
- 直接收敛 `mock-wheel-trace-gateway.ts` 中的 mock 字段：
  - 删除不再存在于类型中的 `stationName` / `stationCode`
  - 保留仍被 contract 接受的 `line/segment/process/team/operator/scannedAt` 等字段
- 不在本轮反向修改 contract 去重新接纳旧 `station` 字段。

### 风险评估
1. `station-node.tsx` 当前语义仍叫 `station`，但底层能力映射接口已偏向 `job`，本轮只能做编译层收敛，无法消除领域命名漂移。
2. wheel trace mock 一旦移除旧字段，若还有 UI 直接读取 `stationName`，可能暴露出下一层消费侧类型错误；但这正是应继续按 contract 收敛的信号。
3. 若 `useWorkArchitecture` 未来仍需兼容 `station` 语义，应在单独审批任务中统一设计，而不是在本轮临时补别名接口。

### 验证策略
1. 检索确认 `./station-node` 与等价旧路径引用已清空。
2. 执行 `pnpm exec tsc --noEmit`，确认重命名后无路径或类型回归。
3. 在 `walkthrough.md` 记录：
   - 文件名收口原因
   - 目标文件名
   - 验证结果

### 明确排除项
- 不修改后端 `Station` 相关接口、表结构与持久化逻辑。
- 不扩展到 `work-architecture` 其它文件的大范围批量重命名。
- 在你确认前，不执行文件重命名与 import 更新。
- 不在本轮扩展为“站点能力映射子域重命名 / 重建模”。
- 在你确认前，不开始删除上述业务文件。
### 需求背景
在主拓扑已收口为 `产线 -> 工段 -> 工序` 且 `line-mgmt` 下未消费历史壳已归档后，当前仍存在一条**活跃**的 `work-architecture` 能力映射链路保留旧命名漂移：
当前仓库工作区虽然干净，但本地磁盘上仍存在大量被 `.gitignore` 忽略的文件与目录。

这些内容本身不会进入 Git，但如果后续采用“整目录打包 / 整目录上传服务器”的方式部署，仍可能被误传：
- 本地环境配置与敏感凭据：`.env.local`、`.env.production`、`server/.env*`、`server/watchdog/.env`
- 证书与私钥：`server/xdfc_origin.crt`、`server/xdfc_origin.key`
- 运行时数据与备份：`server/uploads/`、`server/backups/`、`server/postgres_data/`
- 工具缓存与日志：`.gocache/`、`server/.gocache/`、`.playwright-cli/`、`server/.codex-tmp/`

当前 `.gitignore` 已覆盖其中大部分内容，但仍可进一步收敛一些“本地工具目录 / 自动化日志 / 运行时散落文件”规则，降低误上传风险。

### 本轮目标
1. 在不影响现有源码跟踪的前提下，加固 `.gitignore`。
2. 仅补充高风险、本地专属、明确不应入库也不应随源码上传服务器的规则。
3. 保持 `.env.example` 等应保留的示例文件继续可跟踪。

### 修改范围
- `.gitignore`
- 验证时只读检查 Git ignored 结果，不改其它业务文件

### 实施策略
#### 1) 保留现有已正确覆盖的规则
- 不删除已存在的：
  - `.env*` / `server/.env*`
  - `*.crt` / `*.key` / `*.pem`
  - `node_modules/` / `dist/`
  - `server/uploads/` / `server/backups/` / `server/postgres_data/`
  - `.gocache/` / `server/.gocache/`

#### 2) 仅补充缺失或更稳妥的高风险忽略项
- 优先考虑补充：
  - `.playwright-cli/`
  - 其它本地 IDE / agent / tool 目录（仅限已确认属于本地缓存或工具状态）
  - 如有必要，补充更明确的临时文件模式

#### 3) 不把部署策略错误完全寄托于 `.gitignore`
- 明确 `.gitignore` 只能降低误传风险，不能替代正确部署流程。
- 最优做法仍是：
  - 只上传 Git 跟踪文件
  - 或使用明确排除清单打包

### 风险评估
1. 若忽略规则写得过宽，可能误伤未来本应纳入版本控制的文件。
2. 若只依赖 `.gitignore` 而继续整目录上传，仍无法百分百避免误传运行时数据。
3. 对已被 Git 跟踪的文件，新增 `.gitignore` 规则不会自动停止跟踪；本轮应避免误以为单改 `.gitignore` 就能处理历史已入库文件。

### 验证策略
1. 查看 `.gitignore` 修改后的目标规则是否存在。
2. 通过 Git ignored 查询确认新增规则能覆盖目标目录/文件。
3. 在 `walkthrough.md` 中记录本轮仅是“降低误传风险”，并提示部署时仍应优先使用 Git 跟踪文件作为上传源。

### 明确排除项
- 不在本轮删除本地目录或清理用户数据。
- 不修改任何业务源码或部署脚本。
- 不把 `.env.example`、必要示例文件或应纳入版本控制的正式配置模板加入忽略。

## 统一 403 Forbidden 页面态 / 组件态处理链路（2026-04-05，待确认）

### 需求背景
当前前端已经基本完成“权限由后端下发、前端不再基于角色字符串放权”的方向收敛，但 `403` 的消费链路仍然分散：
- 已存在 `ForbiddenError` 页面与 `/403` 路由。
- `apiFetch` 已能抛出带 `status` 的错误对象。
- React Query 已在全局层面对 `401/500` 做了部分处理。
- 若业务页面或 mutation 各自处理错误不一致，仍会出现“只弹 toast”“误报空数据”“局部空白”“跳错页面”的体验断层。
- 从你补充的现场现象看，当前还存在一个更关键的信号：**连系统管理员账号也会落到 403 页面**。这说明本轮不能只做前端展示统一，还必须同步分析权限下发、缓存会话与后端权限聚合链路是否存在根因缺口。

用户本轮要求建立**统一 403 Forbidden 页面态 / 组件态处理链路**，但既有架构原则仍需保持：
- **权限裁决以后端为准**。
- **前端不做路由硬拦截**，避免重新形成双源权限解释。
- 前端负责**统一消费后端 403 并呈现明确状态**，而不是自行决定准入。

### 本轮目标
1. 建立统一的 `403` 页面级呈现协议。
2. 建立统一的 `403` 组件级 / 动作级反馈协议。
3. 明确 `401 / 403 / 404 / 500` 的前端分层消费边界。
4. 排查“系统管理员也返回 403”的根因链路，确认问题落在前端权限快照还是后端权限裁决。
5. 在不引入前端路由硬拦截的前提下，完成“后端拒绝 -> 前端稳定呈现”的体验闭环。

### 现状研判
#### 1) 已有基础能力
- `src/lib/api-client.ts`
  - 非 2xx 响应会抛出带 `status` 的错误对象。
  - `401` 已接入会话失效处理与登录跳转。
- `src/features/errors/forbidden.tsx`
  - 已有标准 Forbidden 页面组件，可直接作为页面级无权限态基础壳。
- `src/routes/(errors)/403.tsx` 与 `src/routes/_authenticated/errors/$error.tsx`
  - 已有错误页面路由承载能力。
- `src/main.tsx`
  - React Query 已统一停止对 `401/403` 重试，但全局错误消费仍偏向 toast / 跳转，尚未完成 `403` 分层。

#### 2) 当前缺口
- 页面主查询返回 `403` 时，许多页面仍可能落入通用 error/empty 分支，而不是标准 Forbidden 页面态。
- mutation / 局部查询返回 `403` 时，当前更多依赖通用 `handleServerError`，无法区分“无权限”与“普通失败”。
- 全局层面对 `403` 的处理策略尚未定型：哪些应整页呈现，哪些应局部提示，哪些不得整页跳错。
- 若系统管理员账号也被 `403`，则至少存在以下一种根因：
  - 后端 `/profile` 或等效权限快照未下发预期权限；
  - 前端 auth store / access snapshot 使用了过期或缺损权限集；
  - 后端 effective access、org role family、system admin 映射或 menu/page/action 补齐链路本身存在缺口。

### 实施策略
#### 1) 先建立统一错误分类工具，不直接散落在页面里写 `status === 403`
- 新增或收敛一个前端错误分类 helper，例如：
  - `getErrorStatus(error)`
  - `isForbiddenError(error)`
  - `isUnauthorizedError(error)`
- 所有页面级、组件级、全局级 403 识别都优先复用该层，避免各处自行猜测错误对象结构。

#### 1.5) 并行梳理“系统管理员也 403”的根因链路
- 前端侧排查：
  - 检查登录后 `/profile`（或等效会话接口）返回的 `permissions` 是否完整。
  - 检查 `auth-store`、access snapshot、权限同步服务是否会在 hydration / relogin / profile refresh 过程中丢失权限。
  - 检查是否存在旧缓存会话导致前端继续消费过期权限集。
- 后端侧排查：
  - 检查 `server/dependencies/effective_access.go`、`server/authz/permissions.go`、组织角色族映射与 system admin 角色补齐逻辑。
  - 检查系统管理员是否真正获得目标页面所需的 `menu/page/action` 权限，而不是仅有角色名。
  - 检查是否存在“管理员角色存在，但未投影到最终 effective permissions”的断层。
- 判定原则：
  - 若后端未下发权限，问题属于权限裁决/聚合链路，前端 Forbidden 只负责正确呈现，不应掩盖后端缺口。
  - 若后端已下发权限但前端快照缺失，则问题属于会话同步/缓存链路。

#### 2) 页面级：核心查询命中 403 时统一渲染 Forbidden 页面态
- 适用对象：详情页、主列表页、报表页、仪表板、模块首页等“页面主数据请求”。
- 处理原则：
  - 若页面主查询失败且错误为 `403`，页面主体改为渲染统一 Forbidden 状态组件。
  - 不应把 `403` 误当成“暂无数据”。
  - 不应只弹一次 toast 后留下空白或残缺页面。
- 呈现形态：
  - 优先复用 `src/features/errors/forbidden.tsx`，必要时提炼为可嵌入页面内容区的共用壳层。

#### 3) 组件级 / 动作级：mutation 或局部查询命中 403 时留在当前页面
- 适用对象：
  - 新增、编辑、删除、审批、打印、同步、导出等 mutation
  - 局部卡片、sheet、dialog、内嵌表格、二级面板查询
- 处理原则：
  - `403` 不跳转到整页 `/403`，避免把局部动作失败升级成全页中断。
  - 统一走受控提示，如 toast、inline alert、局部占位态。
  - 提示语义统一为“无权限执行当前操作”或“无权限查看当前数据块”，避免与网络异常混淆。

#### 4) 全局分层：明确 401 / 403 / 404 / 500 的责任边界
- `401`
  - 继续由会话失效链路处理：清认证态、跳登录页、保留 redirect。
- `403`
  - 不在全局层强制路由跳转。
  - 交由页面级 / 组件级消费者根据上下文渲染标准 Forbidden 态。
- `404`
  - 资源不存在与“空结果”分开处理，不混入 Forbidden。
- `500`
  - 保持通用服务端异常页 / toast 逻辑，但避免吞掉已分类的 `403`。

#### 5) 收口现有通用错误处理器
- 检查 `src/lib/handle-server-error.ts`：
  - 为 `403` 增加显式分支，避免继续走通用 `Something went wrong!`。
  - 但要保留“页面级主查询不应只靠 toast”的原则，因此该工具更适合作为 mutation / 组件级兜底。
- 检查 `src/main.tsx` 的 Query / Mutation 全局处理：
  - 保留 `401` 特殊处理。
  - 避免在 queryCache 全局把 `403` 一律 toast 化或路由跳转化。

### 预估修改范围
- 优先修改：
  - `src/lib/api-client.ts`
  - `src/lib/handle-server-error.ts`
  - `src/main.tsx`
  - `src/features/errors/forbidden.tsx`
- 可能新增：
  - `src/lib/error-status.ts` 或同类错误分类 helper
  - `src/components/forbidden-state.tsx` 或同类可嵌入式 Forbidden 壳层
- 根因排查可能涉及只读检查：
  - `src/stores/auth-store.ts`
  - `src/features/authz/**`
  - `server/dependencies/effective_access.go`
  - `server/authz/permissions.go`
  - 与 `/profile` / effective permissions 同步相关的 handler / service
- 可能小范围接入的业务页面：
  - 优先选择当前最容易暴露 `403` 断层的页面 / 模块做首批落点
  - 仅在确认统一 helper 与壳层形态后，少量接入验证，不做全仓机械替换

### 风险评估
1. 若把 `403` 处理做成全局强跳转，会重新演化为“前端决定访问权”，偏离当前架构原则。
2. 若只在全局 toast 层面处理 `403`，页面级主查询仍会保留空白或误判空态问题。
3. 若页面级与组件级边界划分不清，可能出现“局部按钮报 403 却整页跳错”或“整页无权却只弹 toast”的体验不一致。
4. 若一次性大面积接入所有页面，改动面会过大；本轮应先建立统一协议与基础设施，再小范围试点。
5. 若系统管理员误判 `403` 的根因在后端权限聚合，而我们只修前端展示，会把真实权限漏洞掩盖成“看起来更友好”的假闭环。

### 验证策略
1. 静态验证：
  - `pnpm exec tsc --noEmit`
  - 对实际改动文件执行定向 `eslint`
2. 场景验证：
  - 页面主查询返回 `403` 时，页面渲染标准 Forbidden 页面态
  - mutation 返回 `403` 时，仅显示受控提示，不整页跳错
  - 局部查询返回 `403` 时，局部区域显示无权限态或提示，不污染全页
  - 系统管理员账号访问目标页面时，不应因权限快照缺失或错误聚合被误判为 `403`
  - `401` 会话失效链路保持不回归
3. 文档验证：
  - 在 `walkthrough.md` 记录首批接入范围、验证结果、保留项与后续扩面建议

### 明确排除项
- 不引入 TanStack Router `beforeLoad` 形式的前端路由权限硬拦截。
- 不把前端路由 `meta` 重新变成权限裁决源。
- 不在本轮发起全仓页面逐个接入；先做统一协议、基础 helper 与首批试点。
- 不修改后端权限裁决逻辑；本轮只消费后端既有 `403` 结果。

### 验证策略
- 定向检查目标文件 eslint / TypeScript 报错。
- 人工验证以下场景：
  - 新建用户成功后表单 reset 与关闭语义正确
  - 编辑用户成功后关闭与 toast 正确
  - 空密码编辑时不提交 password
  - 锁定角色场景仍正确保留/回传 role

### 明确排除项
- 不继续拆远程数据加载 Hook。
- 不在本轮引入新的全局表单工具层。
- 不触碰 users 域外部逻辑与后端接口契约。

## users-action-dialog 提交边界统一（待确认）

### 目标背景
在完成 `users-action-dialog.tsx` 的 reset/关闭逻辑收敛与 update payload 拆薄后，当前剩余的不一致点主要在 create 路径：
- update 已通过显式 `UserUpdatePayload` builder 提交。
- create 仍直接透传表单 `values`，提交边界相比 update 更宽。

这会导致 create/update 两条路径在“提交前白名单化”层面仍存在不一致。为了进一步稳固前端提交边界，本轮将为 create 补齐显式 payload 构造，并统一 create/update 的提交方式。

### 本轮范围
#### 1) create 显式 payload 构造
- 目标：
  - 让 create 路径不再直接提交 `UserForm` 全量对象。
  - 改为仅提交创建接口真正需要的白名单字段。
- 原则：
  - 保持当前创建链路成功语义不变。
  - 不在本轮扩大为后端接口变更。

#### 2) create/update 提交边界一致化
- 目标：
  - 让 create/update 在主组件内都只消费 helper 产出的提交 payload。
  - 将主组件中的“提交前数据裁剪”从业务流程中进一步分离。
- 原则：
  - create 与 update 仍保留各自 mutation。
  - 不强行把两条路径合并成单一 mutation 分支。

### 实施顺序
1. 先确认 create 接口当前实际需要的字段集合。
2. 在 `users-action-dialog.submit.ts` 中新增 create payload builder。
3. 将 `users-action-dialog.tsx` 的 create 分支切换到显式 payload 提交。
4. 复核 create/update 两条路径的字段白名单与成功收尾是否一致。

### 风险评估
1. 若 create payload 白名单字段裁剪错误，可能导致创建用户缺字段、字段名不匹配，或误丢 `employeeId` / `role` / `password`。
2. create 路径若与后端当前隐式兼容字段不一致，可能引入“之前能创建、现在被裁掉”的回归。
3. 本轮属于提交边界收紧，验证重点应放在“提交内容仍完整、但更明确”，而不是仅看 UI 是否能关闭。

### 验证策略
- 定向检查目标文件 eslint / TypeScript 报错。
- 人工验证以下场景：
  - 新建用户时提交字段完整且创建成功
  - 员工绑定创建时 `employeeId`、角色、用户名仍正确提交
  - 编辑用户路径继续使用显式 update payload 且行为不变
  - 成功提交后的 toast、关闭、reset 语义不变

 ### 明确排除项
- 不继续扩展到 create/update 共用 service 层重写。
- 不触碰后端 users handler 或接口定义。
- 不扩大为 users 域全面 DTO 改造。

## 架构稳定性审计整改（2026-04-05，待确认）

### 需求背景
你已对 XDFC 项目完成一轮深度架构稳定性审计，并识别出 4 类高风险问题：
- 后端写路径存在 `ShouldBindJSON` + `Save()` 组合导致的零值覆写风险，可能把数据库中原有字段静默清空。
- 库存、贸易等模块之间存在同步联动调用，若链路中途失败，可能形成“库存已变更、订单进度未更新”的业财不一致。
- 当前权限体验主要依赖菜单可见性与局部页面控制，需进一步核实敏感页面是否存在“可直接输入 URL 进入后再由接口报错”或“页面先暴露部分信息再失败”的风险。
- 新引入或实验性模块（如 `print-mgmt`、`equipment-tooling`）可能尚未完全对齐既有的 fail-loudly 与强状态校验原则。

本轮目标不是做表面补丁，而是先建立“风险闭环整改计划”，按严重级别分阶段收敛，优先解决会造成**数据错误写入**与**跨模块一致性破坏**的问题。

### 本轮总体策略
按风险分为三个阶段执行，避免大面积并发改造：

#### Phase A：后端数据正确性（Critical）
- 先排查所有直接或间接使用 `db.DB.Save()`、`tx.Save()`、全量 struct 更新的写路径。
- 将不安全路径替换为以下受控模式之一：
  - 显式 `Updates(map[string]any)` 白名单更新
  - 显式 PATCH DTO -> model 字段映射
  - 先查询现有记录，再按允许变更字段逐项赋值后提交
- 对“编辑接口允许缺省字段不传”的场景，统一采用 PATCH 语义，避免把未传字段当成清空字段。
- 对高风险业务实体（物料、配置、用户、角色、工单、库存单、财务单据）优先处理。

#### Phase B：跨模块一致性（High）
- 梳理库存 -> 贸易交付进度、库存 -> 财务凭证、采购/销售 -> workflow 等联动链路。
- 区分两类情况：
  - **同库同事务可闭环**：尽量收口为单事务提交，避免“先写 A，再异步写 B”。
  - **天然跨边界不可单事务**：引入明确的失败记录、补偿入口、重试策略或待修复状态，禁止 silent failure。
- 对已有同步调用点补充失败后的显式日志、返回语义与测试，确保异常可见、可追踪、可补偿。

#### Phase C：权限入口与实验模块稳态（Medium）
- 审查敏感模块的页面入口、首屏数据拉取、危险操作按钮与服务端权限校验是否形成闭环。
- 对 `print-mgmt`、`equipment-tooling` 这类实验/新模块审查：
  - 轮询前置条件是否严格
  - 打印/下发类指令是否做状态断言
  - 后端是否拒绝非法状态迁移
  - 前端是否在失败时显式提示并停止后续链路

### 详细技术方案

#### 1) 后端 `Save` 风险治理方案
- 排查范围：
  - `server/handlers/**/*.go`
  - `server/services/**/*.go`
  - `server/db/**/*.go`
- 识别模式：
  - `ShouldBindJSON(&payload)` 后直接 `Save(&model)`
  - 使用请求体 struct 直接覆盖持久化 model
  - 在 update handler 中未区分 create / patch / replace 语义
- 改造原则：
  - 禁止把“前端未传字段”隐式解释为“要清空该字段”。
  - 对每个 update handler 明确字段白名单。
  - 如需支持显式清空字段，应由 DTO 明确表达，而不是依赖零值。
- 验证方式：
  - 为关键 handler 增加“缺失字段不应被清空”的回归测试。
  - 为已知历史高风险实体补充 create/update 差异测试。

#### 2) 模块联动一致性治理方案
- 先建立调用链清单，明确谁调用谁、调用发生在事务内还是事务外、失败时当前行为是什么。
- 对同库事务型联动：
  - 若库存写入与订单状态更新共享数据库连接且业务上必须原子，则合并到同一事务服务中处理。
- 对非原子联动：
  - 为失败结果增加显式记录（日志、状态字段或待补偿记录）。
  - 为业务返回增加“主操作成功但联动失败”的可观测语义，避免前端误判为全成功。
  - 视当前代码结构决定是否引入轻量 outbox/repair 机制，但本轮优先保证**先可见、再可补偿**。
- 验证方式：
  - 为关键联动补充 service/handler 测试，覆盖联动失败时主事务是否回滚、或是否留下明确待修复状态。

#### 3) 权限入口策略治理方案
- 先确认当前真实风险，而不是预设一定要上前端硬拦截：
  - 页面是否在无权限时仍先拉到敏感数据
  - 页面是否显示危险操作按钮并允许继续提交
  - 服务端是否已经完整拒绝敏感 API
- 约束前提：
  - 权限裁决仍以后端为准
  - 前端若做页面级阻断，只能作为 UX 层保护与即时反馈，不能替代服务端校验
- 本轮更偏向的收敛方向：
  - 保留菜单可见性策略的同时，补齐页面加载失败时的中文无权限提示
  - 确保敏感数据接口返回 401/403 时前端不展示脏数据、不继续连锁请求
  - 仅当你明确批准时，才评估是否对个别高风险路由增加轻量导航前检查

#### 4) 实验性模块 fail-loudly 治理方案
- 重点审查对象：
  - `print-mgmt`
  - `equipment-tooling`
  - 其他近期新增且带异步轮询/下发指令/状态迁移的模块
- 治理原则：
  - 非法状态不允许继续操作
  - 失败必须显式提示，不吞错
  - 轮询或重复提交必须有终止条件与状态门禁
  - 后端校验优先，前端只负责把错误清晰暴露给用户
- 验证方式：
  - 增加最小化失败路径测试
  - 必要时增加英文日志，帮助定位状态机断点

### 涉及文件范围（预计）
- 后端：
  - `server/handlers/**/*.go`
  - `server/services/**/*.go`
  - `server/routes/**/*.go`
  - `server/db/**/*.go`
- 前端：
  - `src/features/**`
  - `src/routes/**`
  - `src/lib/**`
  - `src/components/**`
- 文档：
  - `task.md`
  - `implementation_plan.md`
  - `walkthrough.md`

### 关键风险与破坏性变更说明
1. 将 `Save` 改为白名单更新后，可能暴露历史上依赖“全量覆盖”的隐式前端提交行为，需要逐个接口校验真实字段契约。
2. 若把跨模块联动从“调用后忽略失败”改为“失败即回滚”或“失败即报错”，部分现有前端流程可能首次暴露出真实错误，需要同步更新错误提示语义。
3. 权限入口策略与你之前的约束存在一个待确认边界：是否允许前端增加少量页面导航前检查用于 UX 提示；若不允许，本轮将仅做页面加载后 fail-loudly 与服务端拒绝后的安全收口。
4. 实验模块状态校验补严后，可能出现“以前能点、现在被禁止”的行为变化，但这属于预期的风险显性化。

### 验证策略
- 后端：
  - 定向 `go test` 覆盖高风险 handler/service
  - 优先增加“缺字段更新不清空”“联动失败可观测”“非法状态被拒绝”测试
- 前端：
  - 定向 `eslint` / `tsc --noEmit`
  - 对权限空态、失败提示、实验模块异常路径做最小回归
- 文档：
  - 执行完成后更新 `walkthrough.md`，记录每类问题的根因、改法、验证结果与保留项

### 需要你确认的事项
1. **执行优先级**：是否按本方案从 Phase A（`Save` 风险）开始，逐阶段推进？
2. **权限策略边界**：是否允许我把“前端路由/页面级前置检查”作为 UX 保护层纳入候选方案，前提是不替代后端裁决？如果你不希望这样做，我会只保留服务端拒绝 + 页面 fail-loudly 收口。
3. **实施方式**：你是希望我先完成 Phase A 的代码整改并验证，再回到 Phase B / C；还是希望我先做全量代码证据扫描，再一次性给出更细的执行清单？

### 非破坏性说明
当前阶段仅完成规划文档更新；**在你明确批准前，我不会开始修改业务代码。**

## 后端稳定链路重构蓝图（2026-04-05）

### 背景与目标
当前 `销售 / 采购 / 订单 / 库存 / workflow / logistics / voucher` 的主链路虽然业务上相对稳定，但后端控制方式仍偏向“分散写入 + 局部补回调”：

1. `handler`、`service`、关联模块都可能直接改业务状态。
2. 订单状态推进、审批完成后的业务单据回写、库存提交后的履约进度推进没有统一归口。
3. 目前已经暴露出两类结构性问题：
   - 部分链路是“有字段无闭环”（如 `delivered_qty`、`workflow_instance_id`）。
   - 部分链路是“闭环靠局部补丁成立”，继续扩展会导致 `workflow_service`、`inventory_command_service` 等核心文件越来越像杂糅编排器。

本蓝图目标不是继续新增零散回调，而是把稳定主链路收敛为：

- **单一编排入口**
- **状态机归口**
- **同库事务内强一致**
- **跨模块同步显式化**
- **后续可演进到领域事件 / outbox，而不是继续堆 if/Update**

### 设计原则
1. **状态拥有者唯一**
   - `workflow` 只拥有 `workflow_instances / workflow_tasks` 状态。
   - `purchase_orders.status` 由采购链路拥有。
   - `sales_orders.status` 与 `sales_order_lines.delivered_qty` 由销售履约链路拥有。
   - `inventory` 数量/金额由库存链路拥有。

2. **跨模块只能提供事实输入，不能随手定义对方状态**
   - 例如“出库已提交”是销售履约链路的输入事实，不应由库存模块直接拍板销售单变成什么状态。

3. **同库强一致链路必须统一放在一个事务脚本里完成**
   - 例如：审批通过 -> 采购单状态推进。
   - 例如：出库提交 -> 库存扣减 -> 凭证生成 -> 销售履约进度推进。

4. **普通 CRUD Service 与主链路编排解耦**
   - 基础 `repository/service` 保持偏原子能力。
   - 稳定业务主链路由单独 `application/usecase orchestrator` 负责组合。

### 目标分层（建议）
建议在 `server` 下新增一层“稳定链路编排层”，例如：

- `server/application/trading/`
- `server/application/purchase/`
- `server/application/workflow/`

或保持更贴近现有风格：

- `server/services/orchestration/`

推荐职责拆分如下：

1. **领域状态机层（纯规则）**
   - 目录建议：`server/domain/trading/`
   - 文件建议：
     - `sales_order_flow.go`
     - `purchase_order_flow.go`
     - `shipment_fulfillment_flow.go`
   - 只负责：
     - 当前状态是否合法
     - 允许哪些迁移
     - 迁移后的目标状态是什么
     - 是否已完成 / 是否部分完成

2. **应用编排层（事务脚本）**
   - 目录建议：`server/application/trading/`、`server/application/purchase/`
   - 文件建议：
     - `workflow_document_sync_service.go`
     - `sales_fulfillment_service.go`
     - `purchase_receipt_service.go`
   - 负责：
     - 开启事务
     - 加锁/读取聚合根
     - 调用状态机判断
     - 调用底层 service/repository 执行原子更新
     - 写 audit / domain event

3. **底层原子能力层（现有 services/repositories）**
   - 如 `inventory_command_service.go`、`voucher_service.go`、`workflow_service.go`
   - 目标是收敛为：
     - 更偏原子操作
     - 更少持有跨业务语义
     - 不再不断吸收“新补丁”

### 建议抽离的稳定链路服务

#### 1. `workflow_document_sync_service.go`
**定位**：负责 `workflow` 终态与业务单据状态之间的同步，而不是继续把业务单据逻辑塞进 `workflow_service.go`。

建议提供：

- `SyncAfterWorkflowApprovedTx(tx, instance)`
- `SyncAfterWorkflowRejectedTx(tx, instance)`

初期负责：

- `PURCHASE_ORDER`
  - `APPROVED`：`Draft -> Sent`
  - `REJECTED`：保留 `Draft`，补充显式失败语义（如状态备注/审计）

后续再扩展：

- `SALES_ORDER`
  - 待先确认销售单审批完成后的业务目标状态

#### 2. `sales_fulfillment_service.go`
**定位**：成为销售履约的唯一归口，不再让库存、物流、销售 handler 各自顺手改一部分。

建议负责：

- `ApplyShipmentCommittedTx(...)`
- `ApplyShipmentVoidedTx(...)`
- `RecalculateSalesOrderLineDeliveryTx(...)`
- `RecalculateSalesOrderStatusTx(...)`

统一处理：

- `sales_order_lines.delivered_qty`
- 行级 `status`
- 单据级 `sales_orders.status`
- “部分发货 / 全部完成 / 回退作废”语义

建议状态语义：

- `Pending`
  - 已建立销售单，等待进入履约
- `InProgress`
  - 已发生部分履约 / 部分发货
- `Done`
  - 全部明细达成履约
- `Canceled`
  - 单据被作废

此处要避免直接由 `inventory_command_service.go` 修改销售单状态，而应由它发出“shipment committed / voided”这一事实输入，再交给该服务统一重算。

#### 3. `purchase_receipt_service.go`
**定位**：统一采购到货 / 入库 / 收货数量 / 单据状态推进。

建议负责：

- `ApplyInboundCommittedTx(...)`
- `RecalculatePurchaseOrderReceiptTx(...)`
- `RecalculatePurchaseOrderStatusTx(...)`

统一处理：

- `purchase_order_lines.received_qty`
- 采购单 `status` 在 `Sent / Awaiting / Received` 之间的推进
- 后续若采购物流状态也要参与，可由该服务吸收，而不是让 `logistics.go` 直接改单据状态

### 状态机归口建议

#### 采购单状态机
- `Draft`
  - 可编辑
  - 待 workflow 批准
- `Sent`
  - workflow 已批准，正式下单
- `Awaiting`
  - 已发货 / 在途，等待收货
- `Received`
  - 全部完成收货
- `Canceled`
  - 作废

#### 销售单状态机
- `Draft`
  - 仅保留给历史兼容或人工草稿场景
- `Pending`
  - 单据已建立，待履约
- `InProgress`
  - 已发生部分认领/生产/发货
- `Done`
  - 全部明细履约完成
- `Canceled`
  - 作废

#### 关键约束
- 任何状态迁移都不应散落在 `handler` 内直接 `Update("status", ...)`
- 所有状态迁移都应走：
  - 状态机判断函数
  - 编排层事务脚本

### 领域事件建议（先轻量，后可升级 outbox）
当前阶段不建议直接上消息中间件，但建议先引入轻量领域事件抽象，以便从“直接互调”过渡到“显式同步”。

事件建议：

- `WorkflowApproved`
- `WorkflowRejected`
- `ShipmentCommitted`
- `ShipmentVoided`
- `InboundRecorded`
- `PurchaseReceiptUpdated`
- `SalesDeliveryUpdated`

初期做法：

- 先在事务内直接调用同步器，不必引入异步消费者
- 但命名和代码结构按事件驱动组织

后续若要增强可恢复性，再演进：

- `domain_events` / `outbox_events` 表
- 后台重放 / 补偿任务

### 现有文件的迁移边界建议

#### 保留为原子能力层
- `server/services/workflow_service.go`
  - 保留 workflow 自身 task/instance 推进
- `server/services/voucher_service.go`
  - 保留凭证原子创建
- `server/services/inventory_command_service.go`
  - 保留库存与出入库原子操作

#### 逐步迁出跨业务编排逻辑
- 从 `workflow_service.go` 迁出：
  - 业务单据状态回写
- 从 `inventory_command_service.go` 迁出：
  - 销售履约 / 订单进度推进
- 从 `handlers/logistics.go` 迁出：
  - 任何订单状态联动

### 分阶段实施建议（低风险顺序）

#### Blueprint Step 1：抽 `workflow_document_sync_service.go`
- 先把当前已补进 `workflow_service.go` 的采购单状态回写迁出到独立同步器
- 行为保持不变，仅完成职责解耦

#### Blueprint Step 2：建立采购状态机与收货编排
- 抽 `purchase_order_flow.go`
- 抽 `purchase_receipt_service.go`
- 统一 `received_qty` / `Awaiting` / `Received`
- 关键前提：当前 `InboundRecord` 模型尚未携带 `purchaseOrderId`、`purchaseOrderLineId` 或等价的稳定关联键，因此 **不能** 直接把 `RecordInbound` 安全接入采购收货推进；Step 2 需先完成“状态机/重算服务骨架 + 关联契约设计”，再进入真实业务接线。

#### Blueprint Step 3：建立销售履约编排
- 抽 `sales_order_flow.go`
- 抽 `sales_fulfillment_service.go`
- 统一 `delivered_qty` / `InProgress` / `Done`

#### Blueprint Step 4：清理 handler 直写状态
- 扫描并收敛所有 `Update("status", ...)`
- 对交易主链路改为只调用编排服务

#### Blueprint Step 5：补充观察性与补偿能力
- 若仍存在无法同事务闭环的链路，再增加：
  - audit 增强
  - repair 状态
  - outbox / retry

### 本蓝图对当前 Phase B 的直接指导意义
1. 后续不再优先选择“在现有 service 里继续补 if/Update”。
2. 所有新增一致性修复，优先问三个问题：
   - 这是谁拥有的状态？
   - 这是不是同库强一致链路？
   - 这条逻辑应该落在状态机、编排层，还是原子 service？
3. 当前已完成的采购单 workflow 回写，只作为过渡修复；正式结构应在后续迁入独立 `workflow_document_sync_service.go`。

### 风险与约束
1. 该蓝图会引入新的目录/文件分层，但目标是减少核心 service 的持续膨胀。
2. 销售单状态机在真正落地前仍需你确认业务语义，尤其是：
   - workflow 审批通过后销售单是否仍保持 `Pending`
   - 何时进入 `InProgress`
   - `Done` 是否严格以 `delivered_qty == qty` 为准
3. 采购链路当前还有一个结构性缺口：`inbound_records` 与 `purchase_order_lines` 之间缺少稳定外键/业务键映射，若不先补契约，任何“入库自动推进采购收货状态”的实现都只能依赖脆弱猜测。
4. 第一阶段实施时应坚持“行为不变优先”，先做职责迁移，再做状态闭环扩展。

## 确认收货按钮后端命令方案（待确认，2026-04-05）

### 背景
- 当前已完成的采购链路中，`RecordInbound(...)` 会推进 `purchase_order_lines.received_qty` 并重算 `purchase_orders.status`。
- 当前已完成的物流归口中，采购物流 `Type=Receipt` 进入 `InTransit / Delivered` 时，最多将采购单从 `Sent` 推进到 `Awaiting`。
- 根据最新业务确认：**物流扫描录入只是后期跟踪/录入动作；真正的“确认收货”应由采购订单侧人工点击按钮触发**。

### 关键业务边界
1. `Delivered` 仅代表“物流送达”，**不等价**于“业务确认收货完成”。
2. `purchase_orders.status = Received` 只能由人工确认收货驱动，而不能由物流状态直接驱动。
3. 物流模块只负责运输可见性与到货提示；采购订单模块负责收货确认、数量确认与库存生效。

### 目标设计
新增专用后端命令：`ConfirmPurchaseReceipt(...)`

该命令作为采购侧唯一的“收货生效点”，负责：
- 校验采购单状态是否允许收货（`Sent` / `Awaiting`）
- 校验本次收货明细、数量、批次、目标仓位
- 生成真实 `InboundRecord`
- 推进 `purchase_order_lines.received_qty`
- 重算 `purchase_orders.status`

### 计划中的结构调整
#### 1. 抽内部事务函数
- 从现有 `RecordInbound(...)` 中抽出内部事务函数，例如：`recordInboundTx(tx, inbound)`
- 保留现有公开入口不变
- 让“通用入库入口”与“确认收货命令”共享同一事务内原子逻辑

#### 2. 新增确认收货编排服务
- 新文件建议：`server/services/purchase_receipt_confirm_service.go`
- 核心入口建议：`ConfirmPurchaseReceipt(input ConfirmPurchaseReceiptInput) (..., error)`

建议输入模型：

```go
type ConfirmPurchaseReceiptInput struct {
    PurchaseOrderID string
    Operator        string
    Remarks         string
    ReceiptDate     time.Time
    Lines           []ConfirmPurchaseReceiptLineInput
}

type ConfirmPurchaseReceiptLineInput struct {
    PurchaseOrderLineID uint
    MaterialID          string
    Quantity            float64
    PurchasePrice       float64
    BatchNo             string
    TargetCategory      string
}
```

#### 3. 新增订单侧 handler
- 新接口建议：`POST /purchase-orders/:id/confirm-receipt`
- 新 handler 建议：`ConfirmPurchaseReceiptHandler`
- 由采购订单详情页“确认收货”按钮调用，而不是直接调用通用 `/inventory/inbound`

### 事务内动作（预期）
1. 锁定采购主单与涉及的采购明细
2. 校验不可超收：`received_qty + 本次确认 <= qty`
3. 按每个确认行生成 `InboundRecord`
4. 复用 `recordInboundTx(...)` 推进库存与明细收货数量
5. 最终统一调用 `recalculatePurchaseOrderStatusTx(...)`

### 状态推进约束
- `Draft -> Sent`：仍由 workflow 终态驱动
- `Sent -> Awaiting`：可由物流进入在途/送达时触发
- `Awaiting / Sent -> Received`：**只能由 ConfirmPurchaseReceipt(...) + 实际收货数量达成**

### 风险与约束
1. 不应让物流状态直接推进到 `Received`，否则会绕过仓库/采购侧的实际验收动作。
2. 不应让前端按钮直接修改采购单状态，而应通过专用命令统一写入 `InboundRecord` 与 `received_qty`。
3. “确认收货按钮”与“通用入库入口”必须共享同一套事务内原子逻辑，避免再次出现双写分叉。

### 建议实施顺序
1. 抽 `recordInboundTx(...)`
2. 新增 `purchase_receipt_confirm_service.go`
3. 新增 `ConfirmPurchaseReceiptHandler`
4. 补 service / handler 测试
5. 再接采购订单前端按钮

---

## 当前前端 TypeScript 报错修复方案（i18n 键 + CreateUserPayload 契约）

### 问题摘要
根据当前截图与代码扫描，报错至少分为三类：

1. `trading.requirements.*` 相关翻译键在组件中已被调用，但未被 `TranslationKey` 联合类型识别。
2. `users-add-admin-dialog.tsx` 当前为了遵守“前端不手动提权”的约束，移除了显式 `role`，导致提交对象不满足 `CreateUserPayload` 的必填契约。
3. 存在伴随型目标文件 lint/ts 报错，例如未使用的 `locale` 变量。

### 根因判断
1. `trading.requirements.*` 更像是“文案文件与语言类型注册未对齐”，而不是业务逻辑错误；需要优先核对中英文 trading 文案结构，以及语言聚合入口是否把新 key 纳入类型推导。
2. `UsersAddAdminDialog` 当前调用的是通用 `createUser` / `CreateUserPayload` 契约；在不新增专用后端管理员建号接口的前提下，前端仍需满足现有必填 `role` 字段，否则 TypeScript 与实际 API 契约都会失配。
3. `locale` 未使用属于低风险伴随问题，可在同轮顺手清理，但不应扩大到无关文件。

### 实施范围
- 优先修复截图中直接命中的高确定性文件：
  - `src/features/trading/components/requirements/requirement-stats.tsx`
  - `src/features/trading/tabs/index.tsx`
  - `src/features/components/supplier-list.tsx`
  - `src/features/users/components/users-add-admin-dialog.tsx`
  - `src/locales/messages/zh-CN/trading.ts`
  - `src/locales/messages/en-US/trading.ts`
- 若根因落在语言聚合/类型导出层，再最小化补充对应聚合入口，不扩散到无关模块。

### 方案原则
1. **先对齐契约，再修调用点**：如果文案键本身存在但类型没收录，优先修语言聚合；如果文案键缺失，再补 key。
2. **不绕开用户角色契约**：若 `CreateUserPayload.role` 为现有后端必填字段，前端不能用 `as any` 或弱化类型逃避，应明确传入受控角色或改为调用专用接口；本轮优先做与现有 API 契约一致的最小修复。
3. **不扩大范围**：只处理截图中直接命中的高确定性报错，不趁机重构整套 i18n 或用户体系。

### 风险与约束
1. 若 `trading.requirements.*` 键实际位于 `experimental.ts` 而非 `trading.ts`，需谨慎确认命名空间，避免把 key 补到错误文案域里造成重复定义。
2. `UsersAddAdminDialog` 的 `role` 修复必须与“前端不手动越权”原则兼容；若只能通过前端显式传固定角色满足现有接口，则需明确这只是对齐当前 API 契约，而不是前端新增权限裁决逻辑。
3. 若项目存在自动生成的语言类型文件，本轮修复后可能需要执行一次类型生成或全量 `tsc` 才能消除联合类型报错。

### 建议实施顺序
1. 先核对 `trading.requirements.*` 键的真实归属与语言聚合方式。
2. 最小化补齐缺失 key / 聚合注册，并清理未使用变量。
3. 修复 `UsersAddAdminDialog` 的创建 payload，与现有 `CreateUserPayload` 保持一致。
4. 执行 `pnpm exec tsc --noEmit`；如通过，再对目标文件运行 `eslint` 定向验证。

---

## 新增前端 TypeScript 报错修复方案（logistics carriers + production-calendar lint）

### 问题摘要
根据最新截图，新增报错集中在两类：

1. `src/features/logistics/types.ts` 中 `carrierTranslationKeyMap` 使用了 `trading.logistics.carriers.*` 键，但这些键当前未被 `TranslationKey` 联合类型识别。
2. `src/features/production-calendar/components/day-detail-sheet.tsx` 的 `catch(error)` 中未使用错误变量，触发 `TS6133`。

### 根因判断
1. `trading.logistics.carriers.*` 更像是语言包结构与类型聚合未对齐：英文 `trading.ts` 已包含 `logistics.carriers`，但中文文案结构或语言聚合链路可能缺失对应定义，导致 `TranslationKey` 漏收录。
2. `day-detail-sheet.tsx` 的未使用变量属于低风险伴随问题，可通过改为 `_error` 或移除变量名最小化修复。

### 实施范围
- 优先修复截图中直接命中的高确定性文件：
  - `src/locales/messages/zh-CN/trading.ts`
  - `src/locales/messages/en-US/trading.ts`
  - `src/features/logistics/types.ts`
  - `src/features/production-calendar/components/day-detail-sheet.tsx`
- 若根因落在语言聚合/类型导出层，再最小化补充对应聚合入口，不扩散到无关模块。

### 方案原则
1. **优先补语言结构，不绕类型**：若文案键本应存在，则先补齐语言包或聚合入口，不用 `as TranslationKey` 之类强转掩盖问题。
2. **最小化清理伴随报错**：`day-detail-sheet.tsx` 仅做未使用变量修复，不顺带重构数据获取逻辑。
3. **不扩大范围**：本轮仅收敛截图中明确出现的 `logistics carriers` 与 `production-calendar` 报错。

### 风险与约束
1. 若 `logistics.carriers` 仅在英文文案存在而中文缺失，本轮需要补齐中文结构并确保中英文层级一致，否则 `TranslationKey` 仍会漂移。
2. 若项目语言类型来自自动推导或生成，本轮修复后仍需依赖一次完整 `tsc` 才能确认联合类型已刷新。
3. `day-detail-sheet.tsx` 目前还存在其它旧式写法（如 `as any`），但若不构成当前截图中的新增报错，本轮不主动扩张处理。

### 建议实施顺序
1. 先核对中英文 `trading.ts` 的 `logistics.carriers` 结构是否一致。
2. 最小化补齐缺失语言键或聚合注册。
3. 清理 `day-detail-sheet.tsx` 的未使用错误变量。
4. 执行 `pnpm exec tsc --noEmit`；如通过，再对目标文件运行 `eslint` 定向验证。

---

## 新增前端 TypeScript 报错修复方案（logistics dialog 文案键缺失）

### 问题摘要
根据最新截图，`src/features/logistics/components/logistics-action-dialog.tsx` 中多处 `t('trading.logistics.dialog.*')` 调用未被 `TranslationKey` 联合类型识别，至少包括：

1. `contactLabel`
2. `contactPlaceholder`
3. `phoneLabel`
4. `phonePlaceholder`
5. `cancel`
6. `save`

### 根因判断
已核对中英文文案结构：`src/locales/messages/en-US/trading.ts` 已存在完整的 `logistics.dialog` 结构，而 `src/locales/messages/zh-CN/trading.ts` 当前缺失整个 `logistics.dialog` 对象。因此这不是组件调用错误，而是中文语言包层级缺失导致 `TranslationKey` 无法推导出这些键。

### 实施范围
- 优先修复截图中直接命中的高确定性文件：
  - `src/locales/messages/zh-CN/trading.ts`
- 对照文件：
  - `src/locales/messages/en-US/trading.ts`
- 若补齐后仍有类型遗漏，再最小化检查语言聚合/类型导出层，但默认不扩散到组件逻辑。

### 方案原则
1. **直接补齐缺失文案层级**：优先把中文 `logistics.dialog` 结构补齐到与英文一致，不在组件侧使用类型断言绕过。
2. **不改业务逻辑**：`logistics-action-dialog.tsx` 目前只是合法消费翻译键，本轮不对其状态管理或表单逻辑做额外改造。
3. **保持中英文层级一致**：新增键名、层级、插值参数与英文版保持一致，避免后续继续出现联合类型漂移。

### 风险与约束
1. 若中文文案只补了截图中暴露的 6 个键，但遗漏同级其它已调用键，`tsc` 仍会继续报错；因此应按完整 `dialog` 结构一次补齐。
2. 若项目语言类型存在缓存或推导延迟，补齐后仍需依赖一次完整 `tsc` 才能确认联合类型已刷新。

### 建议实施顺序
1. 按英文 `logistics.dialog` 结构一次性补齐中文 `trading.ts`。
2. 执行 `pnpm exec tsc --noEmit`。
3. 如通过，再对 `src/features/logistics/components/logistics-action-dialog.tsx` 与目标语言文件运行 `eslint` 定向验证。

---

## i18n 契约治理方案（locale 结构一致性 + 插值参数校验）

### 目标
从“组件报错后再零散补 key”的被动模式，升级为“在脚本 / CI 阶段提前发现 locale 契约漂移”的主动治理模式，解决以下长期问题：

1. `zh-CN` / `en-US` 文案对象结构长期手工维护，容易出现层级漂移。
2. `TranslationKey` 当前仅基于 `messages['zh-CN']` 推导，导致中文缺 key 时才会爆大量 TS 错误，而英文缺 key 可能被遗漏。
3. 当前没有自动化机制校验插值参数（如 `{{count}}`、`{{carrier}}`）在双语之间是否一致。

### 核心方案
1. **新增 locale parity 校验脚本**
   - 递归扫描 `src/locales/messages/zh-CN` 与 `src/locales/messages/en-US` 聚合后的消息树。
   - 产出完整 dot-path 清单，比较：
     - 仅存在于 `zh-CN` 的 key
     - 仅存在于 `en-US` 的 key
     - 同一路径但值类型不一致的项（例如一侧是字符串、一侧是对象）
2. **增加插值参数一致性校验**
   - 对字符串值提取 `{{param}}` 占位符集合。
   - 校验双语同一路径的占位符集合是否一致，避免运行时文案能显示但参数错位。
3. **接入脚本入口**
   - 在 `package.json` 中新增显式脚本，例如 `verify:i18n`。
   - 将该脚本接入现有 CI 流程中的前端校验链路，确保新增文案漂移在 PR / CI 阶段被阻断。
4. **保持运行时最小侵入**
   - 本轮不重构 `translate()` 运行时逻辑，不改动 `TranslationKey` 推导策略。
   - 先用“结构校验 + CI 兜底”建立稳定防线，再评估后续是否需要引入独立 message contract。

### 实施范围
- 优先新增 / 修改：
  - `scripts/` 下的 i18n 校验脚本
  - `package.json`
  - 如有必要，`.github/workflows/ci.yml`
- 可选新增复用工具文件，但应独立存放，避免把复杂逻辑堆叠进现有 locale 入口文件。
- 默认不改业务组件，不在本轮扩大到翻译运行时重构。

### 输出要求
1. 脚本执行失败时，必须输出清晰的差异分类：
   - missing in zh-CN
   - missing in en-US
   - type mismatch
   - interpolation mismatch
2. 输出应尽量带具体 key 路径，便于直接定位文件修改。
3. 若差异较多，输出需可读，不应只抛一个模糊异常。

### 风险与边界
1. 当前仓库可能已存在历史遗留文案漂移；脚本首次落地后，可能一次性暴露较多差异，需要决定是先清历史再强制接入 CI，还是先允许受控基线。
2. 若直接把脚本强接入现有 CI，而仓库当前存在未清理差异，可能导致 CI 全红；因此需要评估是否分阶段接入（先提供脚本与本地验证，再接入 CI，或先建立基线白名单）。
3. 本轮只治理“结构/参数一致性”，不处理文案翻译质量，也不处理运行时 fallback 策略优化。

### 建议实施顺序
1. 实现独立的 locale parity 校验脚本，先跑出当前差异全貌。
2. 视当前差异规模决定：
   - 若差异很少，则顺手清理后直接接入 `package.json` 与 CI。
   - 若差异很多，则先建立可审计的基线策略，再逐步收敛。
3. 运行新增脚本与 `pnpm exec tsc --noEmit`，确认本轮治理不会破坏现有前端类型链路。
4. 更新 `walkthrough.md` 记录治理方式、当前差异规模与后续约束。

---

## 历史 i18n baseline 债务清理方案（33 项差异分批收敛）

### 当前债务分布
根据 `scripts/i18n-parity-baseline.json`，当前历史差异共 `33` 项，且并非平均散落，而是集中在以下几组：

1. **`orgPersonnel`**
   - 同时存在 `missing in zh-CN` 与 `missing in en-US`
   - 是当前最大的一组结构漂移来源
2. **`trading.requirements`**
   - 主要集中在 `missing in en-US`
   - 属于同一命名空间下的成组缺失，适合整块补齐
3. **`users.dialogs`**
   - 双语各有单点差异
4. **零散单点**
   - `basicSettings.units.categories.all`
   - `engineering.productMgmt.serialLabel`

### 清理目标
不是简单“刷新 baseline 接受历史现状”，而是按批次实际补齐差异，最终将 baseline 压缩到 `0`，让 `verify:i18n` 从“只阻断新增问题”逐步升级为“历史 + 新增都清零”。

### 分批策略
1. **第一批：低风险单点清理**
   - 模块：`users`、`basicSettings`、`engineering`
   - 目标：先收掉双语单点与零散单点，快速降低 baseline，验证流程稳定
2. **第二批：`trading.requirements` 成组清理**
   - 模块：`trading`
   - 目标：一次性对齐 `requirements` 下成组缺失，避免继续逐 key 往返补丁
3. **第三批：`orgPersonnel` 成组清理**
   - 模块：`orgPersonnel`
   - 目标：处理当前规模最大、双向缺失同时存在的一组，必要时按 dialog / org / employeeDialog 子域分别核对

### 实施原则
1. **按模块整组修，不按截图逐条修**：同一命名空间下出现多条差异时，应直接核对整块结构，避免修 1 条冒 5 条。
2. **优先补齐 locale，不动业务组件**：本轮目标是历史文案债务清理，不是顺带调整调用逻辑。
3. **每批都要可回归**：每完成一批都要执行 `verify:i18n` 与 `tsc`，观察 baseline 是否按预期收缩。
4. **基线文件只反映“剩余债务”**：不得通过单纯重写 baseline 来掩盖未清理问题；只有实际清理后才刷新基线。

### 风险与边界
1. `orgPersonnel` 当前同时存在双向缺失，意味着两边都可能在不同时间线演进过；清理时需避免“把错误的一侧补到另一侧”而固化错误结构。
2. `trading.requirements` 可能涉及旧版与新版结构并存，需要先确认当前组件真实消费的是哪一套层级，再决定英文侧补齐还是中文侧裁撤旧结构。
3. 本轮只清理结构/参数差异，不顺带改文案措辞质量，也不处理业务页面是否已经废弃的问题；若遇到真正废弃的文案域，需要先审慎确认再删除。

### 建议实施顺序
1. 先完成 `users`、`basicSettings`、`engineering` 的低风险单点清理。
2. 再处理 `trading.requirements` 的整块对齐。
3. 最后处理 `orgPersonnel` 的双向成组差异。
4. 每批完成后执行：
   - `pnpm run verify:i18n`
   - `pnpm exec tsc --noEmit`
5. 全部清理后刷新 baseline，并确认差异降为 `0`。

---

## Phase 2：前端“零审计”权限架构转换方案

### 背景与目标
当前前端权限链路已经具备“后端 `/profile` 下发有效权限集”的基础，但仍残留前端自我裁决逻辑，典型表现包括：

1. `AppSidebar` 基于 `admin` / `superadmin` 角色做全量菜单 bypass。
2. `hasAuthSessionPermission(...)` 在命中系统管理员角色时直接返回 `true`。
3. `usePermissionAccess()` 继续向业务层暴露 `isSuperAdmin` 语义，诱导组件层保留角色旁路。
4. `AuthenticatedLayout` 当前以“后台异步同步”为主，权限未 ready 时仍可能先进入受保护树，再由组件或接口失败回收。

Phase 2 的目标不是把前端权限彻底移除，而是把前端降级为**后端权限快照的执行器**：

- 后端负责：角色族展开、权限矩阵解析、菜单/页面/动作权限闭包、最终 `permissions` 下发。
- 前端负责：等待后端 access snapshot ready，并仅根据 `permissionId` 判断页面、导航和动作是否可见/可进入。
- 明确禁止：前端基于 `role`、`effectiveRoles`、`admin`、`superadmin`、模块前缀等信息自行推导或放大权限。

### 设计原则
1. **后端唯一真源**：前端授权判定只允许使用 `/profile` 返回的 `permissions`。`role` 与 `effectiveRoles` 仅可保留作诊断、展示和审计信息，不得参与 allow 决策。
2. **前端零审计**：前端不解释“谁应当有权限”，只执行“当前 `permissions` 是否包含某个 `permissionId`”。
3. **默认拒绝**：在 access snapshot 未 ready 前，路由与页面都不应先渲染受保护内容再回收。
4. **统一注册表**：页面路由、侧边栏、tabs、按钮与危险操作入口都应复用同一套 permission registry / route access registry，避免页面能进但菜单隐藏、或菜单可见但页面被拒。
5. **服务端仍是最终裁决**：前端路由守卫仅负责 UX 层准入与早拦截，后端 API 继续保留硬校验，二者形成双层防线，但授权真相只来自后端。

### 核心改造点

#### 1. 收敛权限判定内核
- 目标文件：
  - `src/features/authz/utils/auth-session.ts`
  - `src/features/authz/hooks/use-permission-access.ts`
- 改造方向：
  - 删除 `isSystemAdmin(...) => true` 这类角色短路。
  - `hasAuthSessionPermission(...)` / `hasPermission(...)` 只做 `permissions` 集合匹配。
  - 不再向业务层暴露 `isSuperAdmin` 这类鼓励旁路的语义；若诊断需要，可转入 debug-only 工具，不供业务守卫使用。

#### 2. 建立路由级准入守卫
- 目标文件：
  - `src/features/authz/guards/route-access.ts`
  - `src/routes/_authenticated/**`
  - 必要时新增独立 route permission registry
- 改造方向：
  - 为受保护页面声明 `requiredPermission` / `requiredAnyPermissions`。
  - 在 TanStack Router `beforeLoad` 中完成：
    - 等待 auth hydration
    - 等待 `/profile` 同步完成或触发同步
    - 基于 `permissions` 判断是否允许进入
    - 无权限时统一跳转到 `403` / 无权限页 / 指定安全落点
  - 保证“无权页面不挂载”，而不是页面先挂载再由内部组件或接口失败收口。

#### 3. 统一导航、tabs 与页面级入口投影
- 目标文件：
  - `src/components/layout/app-sidebar.tsx`
  - `src/features/authz/guards/route-access.ts`
  - 使用 tabs / menu 的相关模块
- 改造方向：
  - 删除 `AppSidebar` 中的 admin bypass。
  - 导航、tabs、页内入口全部从同一 permission registry 读取 required permission。
  - 页面入口显示与否应与路由可达性一致，避免“入口消失但 URL 还能打开”或“入口可见但实际无权进入”。

#### 4. 收敛 access snapshot 同步时序
- 目标文件：
  - `src/components/layout/authenticated-layout.tsx`
  - `src/features/authz/services/effective-permission-service.ts`
  - `src/stores/auth-store.ts`
- 改造方向：
  - 从“后台异步同步，不阻塞渲染”调整为“准入前完成 access ready 确认”。
  - 明确区分：
    - `token ready`
    - `profile synced`
    - `access ready`
  - 在 access 未 ready 时，以加载态或受控空壳阻断受保护树，防止短暂越权 UI 闪现。

### 拟涉及文件
1. `src/components/layout/app-sidebar.tsx`
2. `src/components/layout/authenticated-layout.tsx`
3. `src/features/authz/utils/auth-session.ts`
4. `src/features/authz/hooks/use-permission-access.ts`
5. `src/features/authz/guards/route-access.ts`
6. `src/features/authz/services/effective-permission-service.ts`
7. `src/stores/auth-store.ts`
8. `src/routes/_authenticated/**`
9. 必要时新增：
   - `src/features/authz/guards/route-permission-registry.ts`
   - `src/routes/_authenticated/forbidden.tsx` 或等价无权限落点

### 风险与破坏性变更
1. **矩阵不完整会直接显性化**：若后端角色-权限矩阵、菜单权限或路由权限声明不完整，Phase 2 落地后对应入口将直接消失或被 403 拦截。这不是 bug，而是对历史隐性兜底的显性化。
2. **受保护路由需要补齐声明**：若当前某些页面仅靠菜单隐藏，没有明确 permission registry，接入路由守卫时需要先为这些页面补齐静态权限声明。
3. **时序变化可能影响首屏体验**：把背景同步改为准入同步后，authenticated 壳首屏可能多一层加载态；需要控制好体验，但不能牺牲授权一致性。
4. **业务代码可能暴露历史旁路依赖**：删除 `isSuperAdmin` 等语义后，若组件内仍有隐式依赖，会在编译或运行中暴露，需要逐步清理。

### 验证策略
1. **静态验证**：
   - `pnpm exec tsc --noEmit`
   - 必要时对目标文件执行定向 `eslint`
2. **权限链路回归**：
   - 无权限用户：菜单不显示、URL 直达被路由拦截、页面主体不挂载
   - 有权限用户：在没有 `admin` 角色旁路的前提下，依旧可正常看到入口并访问页面
   - 权限未同步完成：只出现受控加载态，不出现敏感页面闪现
3. **后端协同验证**：
   - 抽查 `/profile` 响应是否稳定返回 `permissions`
   - 抽查关键 API 的服务端权限中间件仍完整生效，防止前端守卫被误认为最终防线

### 建议实施顺序
1. 先删除最核心的前端越权源：`AppSidebar` admin bypass + `hasAuthSessionPermission` 角色短路。
2. 再建立统一 route permission registry，并为关键受保护页面补齐 `requiredPermission` 声明。
3. 然后把 `beforeLoad` 接入统一路由守卫，实现“无权不挂载”。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改. 根据既定流程：

1. 先完成 `task.md` 与 `implementation_plan.md` 更新.
2. 等你明确批准本方案后，再进入代码实施阶段.
3. 若实施中发现后端矩阵不完整或需要新增 403 落点等超出当前范围的事项，需回到本计划更新后再次确认.

## 页面级 403 正规接入收尾（2026-04-05，待确认）

### 需求背景
当前“统一 403 Forbidden 页面态 / 组件态处理链路”已经覆盖了一批真实页面主入口，但继续盘点后，仍存在 7 个页面具备以下共同特征：
- 文件本身是实际页面主入口，而非 dialog、局部子组件或包装壳.
- 存在明确的首屏 authoritative 主加载.
- 当前未以标准 `ForbiddenState` 承接主加载 `403`，仍停留在 `toast`、局部错误卡片、`logger` 或无显式错误收口状态.

用户当前要求直接进入执行，因此本节先把剩余 7 个页面的实施顺序、接入模式与风险边界固化；在你批准前，不开始业务代码修改.

### 本轮目标
1. 为剩余 7 个真实页面主入口建立统一、正规的页面级 `403 -> ForbiddenState` 收口.
2. 明确每个页面的 authoritative 主加载来源，避免把辅助加载或动作请求误升格为整页 Forbidden.
3. 保持 mutation、toast、局部 fallback、局部 retry 与运行态逻辑不变，只处理“首屏主加载 403”的页面态.

### 拟修改文件与 authoritative source

#### 第一批：优先级 P1
1. `src/features/terminal-config/tabs/pda-terminal.tsx`
   - authoritative source：`loadProtocolConfig()`
   - 计划接入：新增 `error` 状态，在主加载 `catch` 中收口；顶部用 `isForbiddenError(error)` 返回 `ForbiddenState`
   - 边界说明：不把自动提交、扫码结果、默认值保存等动作型失败升级为整页 Forbidden

2. `src/features/terminal-config/tabs/pda-shell.tsx`
   - authoritative source：`loadConfig()`
   - 计划接入：新增 `error` 状态，在首屏协议配置加载失败时收口；顶部用 `isForbiddenError(error)` 返回 `ForbiddenState`
   - 边界说明：`refreshQueue()`、`retryQueued()`、online/offline、wake lock、hotkey 等均视为运行态或局部链路，不升级为整页 Forbidden

3. `src/features/finance/tabs/payment-terms-tab.tsx`
   - authoritative source：`loadData()` -> `financeService.getPaymentTerms()`
   - 计划接入：新增 `error` 状态，改为页面内部显式承接错误；移除当前 `catch` 后继续 `throw error` 的断裂做法
   - 边界说明：保留刷新、保存、编辑、toast 语义不变

#### 第二批：优先级 P2
4. `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`
   - authoritative source：首屏 `Promise.all([MoldLoanService.getLoans(), MoldService.getMolds(), EquipmentPartnerService.getPartners()])`
   - 计划接入：建立统一 `loadData()` / `error` 收口，以并行主加载作为整页裁决依据
   - 边界说明：借出/归还、图片上传、弹窗提交保持动作级语义

5. `src/features/equipment-tooling/tabs/drawing-mgmt.tsx`
   - authoritative source：首屏 `Promise.all([DrawingService.getDrawings(), MoldService.getMolds()])`
   - 计划接入：建立统一 `loadData()` / `error` 收口；主加载 `403` 返回 `ForbiddenState`
   - 边界说明：日志查看、下载、上传、状态切换仍是局部动作链路

6. `src/features/equipment-tooling/tabs/partner-mgmt.tsx`
   - authoritative source：`EquipmentPartnerService.getPartners()`
   - 计划接入：在保留现有 `loadError` 字符串错误卡片的前提下，新增 `error` 状态专门识别 `403` 并优先显示 `ForbiddenState`
   - 边界说明：非 `403` 仍沿用当前错误卡片 + retry 语义，不强行抹平已有本地错误 UI

#### 第三批：优先级 P3
7. `src/features/finance/tabs/taxation-tab.tsx`
   - authoritative source：`loadData()` -> `taxService.getTaxRates()`
   - 计划接入：新增标准 `error` 状态，在首屏主加载 `403` 时显示 `ForbiddenState`
   - 边界说明：保存、编辑与 toast 保持原逻辑

### 接入模式

#### 1. 单一主加载页面
- 适用：`pda-terminal.tsx`、`pda-shell.tsx`、`payment-terms-tab.tsx`、`taxation-tab.tsx`
- 方案：
  - 新增 `const [error, setError] = useState<unknown>(null)`
  - 主加载开始前 `setError(null)`
  - `catch` 中 `setError(error)`
  - 顶部加 `if (isForbiddenError(error)) return <ForbiddenState />`

#### 2. 并行主加载页面
- 适用：`mold-loan-mgmt.tsx`、`drawing-mgmt.tsx`
- 方案：
  - 把首屏并行请求收敛到统一 `loadData()`
  - 用统一 `error` 状态承接并行主加载失败
  - 仅当该统一主加载返回 `403` 时渲染整页 `ForbiddenState`

#### 3. 保留局部错误 UI 的页面
- 适用：`partner-mgmt.tsx`
- 方案：
  - 现有 `loadError` 继续服务非 `403` 错误展示
  - 新增 `error: unknown` 专门识别状态码
  - 渲染优先级：`403 ForbiddenState` 高于现有错误卡片

### 实施顺序
1. 先做 `terminal-config` 两页，统一 PDA 相关页面口径.
2. 再做 `payment-terms-tab.tsx`，收口当前错误传播断裂点.
3. 然后处理 `equipment-tooling` 三页，其中先多源并行主加载页，再处理保留局部错误卡片的 `partner-mgmt.tsx`.
4. 最后用 `taxation-tab.tsx` 作为低风险收尾页.

### 风险评估
1. 若把辅助加载误判为 authoritative source，可能把本应局部降级的失败错误升级为整页 Forbidden，影响可用性.
2. `partner-mgmt.tsx` 已有本地错误卡片，若不区分 `403` 与其他错误，容易破坏既有 retry 体验.
3. `mold-loan-mgmt.tsx` 与 `drawing-mgmt.tsx` 的首屏依赖多路数据，若收口方式不统一，可能导致部分状态已更新、部分状态未更新的半加载页面.
4. `pda-shell.tsx` 与 `pda-terminal.tsx` 包含多条运行态链路，必须严格限制整页 Forbidden 只针对首屏配置加载，不扩大到扫码或队列动作.

### 验证策略
1. 静态验证：
   - 对本轮改动文件执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 页面级人工回归要点：
   - 首屏主加载返回 `403` 时显示 `ForbiddenState`
   - 非 `403` 错误仍保持原有空态 / 错误卡片 / toast 语义
   - 保存、删除、提交、上传、队列重试等动作级行为不受影响
3. 文档记录：
   - 在 `walkthrough.md` 记录每个页面的 authoritative source、接入方式、特殊边界与验证结果

### 明确排除项
- 不新增前端路由硬拦截，不把前端变成权限最终裁决方.
- 不顺手处理 dialog、局部子组件、局部查询或动作级 `403` 的统一治理扩面.
- 不将本轮升级为 terminal-config、equipment-tooling 或 finance 域的结构重构.

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改. 根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新.
2. 需等你明确批准本方案后，再进入 7 个页面的代码实施阶段.
3. 若执行中发现某页面的 authoritative source 与当前盘点不一致，需先更新本节计划再继续.

## 页面级 403 收尾第二轮（2026-04-05，待确认）

### 需求背景
在完成上一轮 7 个页面后，继续做全链路只读审计，已确认仍有 4 个真实页面主入口尚未完成正规的页面级 `403 -> ForbiddenState` 收口：
- `src/features/approval/tabs/approval-configs.tsx`
- `src/features/ai-assistant/tabs/ai-access-control.tsx`
- `src/features/approval/tabs/approval-requests.tsx`
- `src/features/approval/tabs/approval-history.tsx`

这 4 个页面的共同特征是：
- 都是实际页面主入口，而非 dialog 或局部组件；
- 都有明确的首屏 authoritative 主加载；
- 当前仍停留在 `toast-only`、`logger-only` 或“无页面级错误收口”的旧实现。

同时，审计中还发现旧的 forbidden 错误路由壳仍保留在仓库中，因此本轮追加一个**只读审计项**，判断它们现在是主链路依赖还是兼容层，但本轮不直接删除。

### 本轮目标
1. 为 4 个确认漏网页补齐页面级 `403 -> ForbiddenState`.
2. 清除主加载阶段的 `toast-only` / `logger-only` 旧处理方式.
3. 只读核查 `ForbiddenError` / `/403` 路由壳是否仍有真实依赖.

### 拟修改文件与 authoritative source

#### 第一批：优先级 P1
1. `src/features/approval/tabs/approval-configs.tsx`
   - authoritative source：`Promise.all([ApprovalService.getConfigs(), ApprovalService.getUsers()])`
   - 计划接入：新增页面级 `error` 状态，统一承接并行主加载失败；主加载 `403` 时整页显示 `ForbiddenState`
   - 边界说明：保存配置、删除配置、局部 toast 保持原语义

2. `src/features/ai-assistant/tabs/ai-access-control.tsx`
   - authoritative source：`aiPolicyService.getPolicy()`
   - 计划接入：新增页面级 `error` 状态，替换当前仅 `logger.error(...)` 的主加载失败处理；主加载 `403` 时整页显示 `ForbiddenState`
   - 边界说明：策略保存、局部成功提示、provider 参数编辑流程保持原逻辑

#### 第二批：优先级 P2
3. `src/features/approval/tabs/approval-requests.tsx`
   - authoritative source：`ApprovalService.getMyApprovals()`
   - 计划接入：新增页面级 `error` 状态；主加载 `403` 时整页显示 `ForbiddenState`
   - 边界说明：审批通过/拒绝、PIN 验证、toast 保持原逻辑

4. `src/features/approval/tabs/approval-history.tsx`
   - authoritative source：`ApprovalService.getMyApprovals()`
   - 计划接入：新增页面级 `error` 状态；主加载 `403` 时整页显示 `ForbiddenState`
   - 边界说明：搜索过滤、历史状态徽标与展示逻辑保持原逻辑

### 接入模式

#### 1. 并行主加载页面
- 适用：`approval-configs.tsx`
- 方案：
  - 新增 `const [error, setError] = useState<unknown>(null)`
  - 在 `fetchData()` 内统一 `setError(null)` / `setError(error)`
  - 顶部加 `if (isForbiddenError(error)) return <ForbiddenState />`

#### 2. 单一主加载页面
- 适用：`ai-access-control.tsx`、`approval-requests.tsx`、`approval-history.tsx`
- 方案：
  - 新增页面级 `error` 状态
  - 首屏主加载开始前清空错误，失败时收口错误对象
  - 顶部统一用 `isForbiddenError(error)` 返回 `ForbiddenState`

### 旧 forbidden 路由壳只读审计范围
- 目标文件：
  - `src/features/errors/forbidden.tsx`
  - `src/routes/(errors)/403.tsx`
  - `src/routes/_authenticated/errors/$error.tsx`
- 审计问题：
  1. 当前页面主加载链路是否仍主动跳转到 `/403` 或 `ForbiddenError`
  2. 这些文件是否仅剩错误路由体系兼容用途
  3. 若后续要删/降级，是否需要先确认其它错误页映射或外链入口
- 本轮边界：
  - 只读分析
  - 不删除文件
  - 不调整错误路由注册

### 风险评估
1. `approval-configs.tsx` 的主加载是双请求并行，若错误收口方式不统一，容易出现一部分数据已渲染、另一部分未准备好的半页面状态.
2. `approval-requests.tsx` 与 `approval-history.tsx` 当前没有统一页面级错误状态，接入时需避免影响既有审批动作与筛选逻辑.
3. `ai-access-control.tsx` 目前使用 `logger-only` 处理主加载失败，接入页面级错误时需避免误伤保存流程.
4. 旧 forbidden 路由壳可能仍被历史错误入口或外部跳转使用，因此本轮只读，不直接清理.

### 验证策略
1. 静态验证：
   - 对 4 个目标文件执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 页面级回归要点：
   - 首屏主加载返回 `403` 时整页显示 `ForbiddenState`
   - 非 `403` 错误仍保持当前页面的既有错误/空态/提示语义
   - 审批动作、AI 策略保存等 mutation 行为不受影响
3. 文档记录：
   - 在 `walkthrough.md` 记录 4 个页面的主加载来源、接入方式与旧 forbidden 路由壳的只读审计结论

### 明确排除项
- 不扩展到 approval / ai-assistant 之外的新模块.
- 不在本轮处理动作级 `403` 的统一治理.
- 不在未再次确认前删除 `ForbiddenError`、`/403` 路由或 `_authenticated/errors/$error.tsx` 中的映射。


### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮方案后，再进入 4 个页面的代码实施阶段。
3. 旧 forbidden 路由壳本轮只做只读审计；若后续要删/降级，需单独再确认一次。

## 旧 forbidden 路由壳删除（2026-04-05，待确认)

### 需求背景
经过上一轮只读审计，当前已确认以下旧 forbidden 路由壳不再属于“页面主加载 `403 -> ForbiddenState`”主链路：
- `src/features/errors/forbidden.tsx`
- `src/routes/(errors)/403.tsx`
- `src/routes/_authenticated/errors/$error.tsx` 中的 `forbidden` 映射

现状判断：
- `ForbiddenError` 只是 `ForbiddenState fullHeight` 的包装壳；
- 独立 `/403` 路由未发现仍被页面主加载链路主动跳转；
- `_authenticated/errors/$error.tsx` 中的 `forbidden` 映射更像历史兼容层，而非当前页面级 403 主链路必经路径。

用户当前要求进入删除阶段，因此本节用于固化删除范围、替代关系、风险边界与验证方案；在你批准前，不直接删除或修改错误路由映射。

### 本轮目标
1. 删除旧 `ForbiddenError` 包装壳与独立 `/403` 路由入口。
2. 移除错误路由聚合页中对 `forbidden` 的旧映射。
3. 确保仓库内不存在残余引用，并通过静态校验。

### 拟修改文件
1. `src/features/errors/forbidden.tsx`
   - 计划动作：删除文件
   - 删除依据：仅为 `ForbiddenState fullHeight` 包装壳，已无独立业务价值

2. `src/routes/(errors)/403.tsx`
   - 计划动作：删除文件
   - 删除依据：独立 `/403` 路由未发现仍被主链路使用

3. `src/routes/_authenticated/errors/$error.tsx`
   - 计划动作：移除 `ForbiddenError` 引用与 `forbidden` 映射项
   - 删除依据：当前页面级 403 已在页面主入口直接渲染 `ForbiddenState`，不再依赖该错误路由分发分支

### 替代关系与边界
- 当前有效主链路：各真实页面主入口在首屏主加载返回 `403` 时，直接 `return <ForbiddenState />`
- 本轮不删除：
  - `src/components/forbidden-state.tsx`
  - 页面级 `isForbiddenError(error)` 判断
  - 其它错误页（401 / 404 / 500 / maintenance）
- 本轮不新增新的 403 路由或前端硬拦截替代物，继续遵循“服务端为最终裁决”的边界。

### 风险评估
1. 若仍有历史入口、外链或人工导航依赖 `/403`，删除后将失去该落点。
2. 若 `_authenticated/errors/$error.tsx` 仍被某些统一错误分发逻辑用于 `forbidden` 类型，移除映射后可能暴露未覆盖分支。
3. 本轮删除的是错误路由兼容层，而不是页面级 `ForbiddenState` 主链路；必须避免误删 `ForbiddenState` 本体或页面内 403 判断。

### 验证策略
1. 依赖核查：
   - 搜索 `ForbiddenError`
   - 搜索 `/403`
   - 搜索 `_authenticated/errors/$error.tsx` 中的 `forbidden` 相关映射残留
2. 静态验证：
   - 对删除/修改涉及文件执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
3. 文档记录：
   - 在 `walkthrough.md` 记录删除依据、残余依赖核查结果与验证结果

### 明确排除项
- 不扩展删除其它错误页壳层。
- 不调整 `src/components/forbidden-state.tsx`。
- 不新增新的路由守卫或错误跳转机制。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮删除方案后，再进入文件删除与错误路由映射修改阶段。
3. 若执行中发现仍存在真实依赖 `/403` 或 `ForbiddenError` 的入口，需先回到本节更新方案后再继续.

## 删除路由前置权限同步阻塞（2026-04-05，待确认）

### 需求背景
当前在 `src/features/authz/guards/route-before-load.ts` 中存在如下前置逻辑：当本地内存里没有 `user.permissions` 时，会在路由继续前执行 `await syncEffectivePermissionsFromProfile()`。

这意味着：
- 前端会等待 `/profile` 返回后才放行路由；
- 页面业务数据请求会被这一前置同步间接阻塞；
- 前端把“权限元数据是否已同步”提升成了路由准入条件。

这与当前既定边界冲突：前端不做权限最终裁决，页面是否可见应由后端业务接口自行返回 `403`，前端只负责在页面主加载处渲染 `ForbiddenState`。

### 本轮目标
1. 删除 `route-before-load.ts` 中基于本地 `permissions` 缺失而触发的 `/profile` 前置等待。
2. 保留路由层面的登录态校验：未登录仍跳转 `/sign-in`。
3. 保留后台异步权限同步作为增强能力，但不再阻塞页面进入。

### 拟修改文件
1. `src/features/authz/guards/route-before-load.ts`
   - 计划动作：删除 `hasLocalPermissions` 判定、`setIsSyncing(true/false)` 与 `await syncEffectivePermissionsFromProfile()` 前置阻塞。
   - 保留内容：`waitForAuthHydration()`、`accessToken` 检查、未登录跳转 `/sign-in`。

### 保留关系与边界
- 保留：
  - `src/components/layout/authenticated-layout.tsx` 中的后台异步 `syncEffectivePermissionsFromProfile()`
  - 页面级 `isForbiddenError(error) -> <ForbiddenState />`
  - 服务端接口自身的 `403` 裁决
- 不处理：
  - `usePermissionAccess()` 当前“同步中默认 false”的策略
  - 侧边栏/按钮级权限显隐
  - 后端 `/profile` 返回结构

### 风险评估
1. 删除前置阻塞后，某些页面会在权限元数据尚未同步完成前先进入，这符合当前边界，但局部按钮显隐可能仍短暂依赖 `isSyncing` / `user` 状态。
2. 若仓库里存在其它 `beforeLoad` 也把前端权限数据作为准入门槛，本轮仅删除已定位到的这一处，必要时后续再继续排查。
3. 本轮不改变服务端 `403`，因此真正无权限的页面仍应由业务接口返回 `403`，并在页面层显示 `ForbiddenState`。

### 验证策略
1. 静态验证：
   - 对 `src/features/authz/guards/route-before-load.ts` 执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 行为验证：
   - 有 token 但本地尚无 `permissions` 时，不再等待 `/profile` 后才允许路由继续
   - 未登录时仍跳转 `/sign-in`
   - 真正无权限页面仍依赖后端 `403` + 页面级 `ForbiddenState`

### 明确排除项
- 不新增新的路由权限守卫。
- 不把前端权限同步改成新的阻塞式流程。
- 不修改页面级 ForbiddenState 主链路。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮方案后，再修改 `route-before-load.ts`。
3. 若执行中发现还有其它同类前置阻塞点，需先补充计划后再继续。

## 显式权限同步状态改造（2026-04-05，待确认）

### 需求背景
当前 `src/components/layout/authenticated-layout.tsx` 使用如下条件判断是否需要后台同步身份/权限：

`!user || !Array.isArray(user.permissions) || user.permissions.length === 0`

这会把“零权限用户”与“尚未同步完成”混为一谈，导致：
- 合法的零权限用户也可能被持续判定为需要同步；
- 同步状态机语义不清晰；
- `usePermissionAccess()` 在 `isSyncing` 与 `!user` 场景下统一返回 `false`，容易把‘尚未同步’与‘确实无权限’混淆。

### 本轮目标
1. 用显式同步状态替代 `permissions.length === 0` 作为“是否已同步”的判断依据。
2. 保证“零权限用户”不会被误判为“尚未同步”。
3. 最小联动 `usePermissionAccess()`，使其语义与新的同步状态保持一致。

### 拟修改文件
1. `src/stores/auth-store.ts`
   - 计划动作：增加显式同步状态字段（例如 `isIdentitySynced` 或等价状态字段）及对应 setter/reset 行为。
   - 设计要求：刷新后默认未同步；完成 `/profile` 同步后显式标记已同步；重置登录态时清空同步状态。

2. `src/components/layout/authenticated-layout.tsx`
   - 计划动作：将 `shouldSyncIdentity` 从 `permissions.length === 0` 判定切换到显式同步状态。
   - 保留内容：有 token 时的后台异步 `syncEffectivePermissionsFromProfile()`；未登录跳转 `/sign-in`。

3. `src/features/authz/hooks/use-permission-access.ts`
   - 计划动作：评估是否需要最小联动，让“未同步”与“已同步但零权限”可被区分；避免继续把同步窗口和零权限混成同一种 `false` 语义。
   - 本轮边界：只做最小必要修复，不扩展到动作级权限治理全量改造。

### 风险评估
1. 若同步状态字段设计不当，可能导致首次登录、刷新后恢复、登出重置之间出现状态残留。
2. `usePermissionAccess()` 被大量动作入口复用，若语义调整过大，可能联动过宽；因此本轮只允许最小改动。
3. 本轮不改变后端 `403` 与页面级 `ForbiddenState` 链路，需确保修复后仍保持“服务端裁决优先”。

### 验证策略
1. 静态验证：
   - 对 `src/stores/auth-store.ts`
   - `src/components/layout/authenticated-layout.tsx`
   - `src/features/authz/hooks/use-permission-access.ts`
   执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 行为验证：
   - 刷新后有 token 且未同步时，会触发一次后台同步；
   - 已同步但权限数组为空时，不会被反复判定为“未同步”；
   - 未登录时仍跳转 `/sign-in`；
   - 页面是否可见仍由后端 `403` + 页面级 `ForbiddenState` 决定。

### 明确排除项
- 不新增路由软拦截。
- 不引入新的前端权限守卫。
- 不做 ActionGuard 全量治理。
- 不修改页面级 ForbiddenState 主链路。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮方案后，再修改 `auth-store.ts`、`authenticated-layout.tsx`、`use-permission-access.ts`。
3. 若执行中发现必须扩展到动作级权限治理，需先回到本节补充方案后再继续。

## 删除模块级本地 TAB/权限裁决残留（2026-04-05，待确认）

### 需求背景
当前 `src/components/layout/module-tabbed-layout.tsx` 会基于前端本地 `user` 快照与 `getAccessibleTabs()` 的计算结果，直接渲染：

- `当前模块暂无可访问页签`
- `当前页签无权查看`

这意味着模块布局层仍在以前端本地权限计算结果宣判“当前模块/TAB 是否可见”，与既定边界冲突：
- 前端不应替后端裁决模块或页签是否允许访问；
- 前端不应把本地权限快照当成最终结论；
- 模块页面是否可见应由后端接口返回结果与页面自身错误态承接。

### 本轮目标
1. 删除模块布局层对 TAB 可见性的最终裁决。
2. 保持登录态校验不变。
3. 保持页面级 `403 -> ForbiddenState` 主链路不变。
4. 不新增任何前端管理员特权、万能兜底或新的前端权限守卫。

### 拟修改文件
1. `src/components/layout/module-tabbed-layout.tsx`
   - 计划动作：删除 `hasNoAccessibleTabs` / `shouldShowTabForbidden` 这类基于本地权限快照直接宣判模块或 TAB 不可见的终局 UI。
   - 调整方向：模块布局只负责承载页签外观与内容容器，不再输出“暂无可访问页签/当前页签无权查看”的最终权限结论。

2. `src/features/authz/guards/route-access.ts`
   - 计划动作：收敛 `getAccessibleTabs()` / `canAccessPath()` 在模块级布局中的使用边界，避免继续被用作模块主内容的最终准入裁决。
   - 边界要求：不为前端新增管理员特权或兜底逻辑。

3. 受影响模块入口（按实际最小范围）
   - 计划动作：如 `SystemMgmt` 等模块入口需要做最小适配，仅为移除布局层本地宣判服务，不扩展到页面业务逻辑。

### 风险评估
1. 删除模块布局层本地裁决后，某些模块可能会先展示页签壳，再由具体页面主请求返回 `403`；这符合后端裁决优先边界。
2. 若仓库中还有其它布局层存在类似“本地权限直接宣判最终可见性”的逻辑，本轮仅处理当前已定位到的模块 TAB 布局链路。
3. 本轮不修改登录态校验与页面级 ForbiddenState，需要确保改动后仍能由页面自身正确接住后端错误结果。

### 验证策略
1. 静态验证：
   - 对 `src/components/layout/module-tabbed-layout.tsx`
   - `src/features/authz/guards/route-access.ts`
   - 受影响模块入口文件
   执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 行为验证：
   - 系统管理账号刷新或重新登录后，不再被模块布局层直接宣判“暂无可访问页签”；
   - 模块最终是否可见由页面自身与后端结果决定；
   - 未登录时仍走既有登录态跳转链路。

### 明确排除项
- 不新增任何前端管理员特权或万能兜底。
- 不新增路由软拦截。
- 不扩展到 ActionGuard 全量治理。
- 不修改页面级 ForbiddenState 主链路。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮方案后，再修改 `module-tabbed-layout.tsx`、`route-access.ts` 与相关最小适配文件。
3. 若执行中发现还有其它布局层存在同类本地终局裁决，需先回到本节补充方案后再继续。

## 清理前端本地判权残留（2026-04-05，待确认）

### 需求背景
当前仓库仍存在多条前端本地权限裁决链：

1. 动作级前置短路
   - `src/features/authz/hooks/use-permission-access.ts`
   - 大量业务组件中的 `if (!guardPermission(...)) return`

2. 组件级本地显隐
   - `src/components/check-permission.tsx`
   - 以及各业务按钮/操作入口的 `CheckPermission`

3. 导航与入口本地过滤
   - `src/components/layout/app-sidebar.tsx`
   - `src/features/authz/guards/navigation-access.ts`
   - `src/features/authz/guards/route-entry-access.ts`

这些链路都会让前端基于本地权限快照先决定“按钮是否显示、动作是否能发、菜单是否展示、入口是否可见”，与既定边界冲突：
- 前端不应替后端裁决是否允许访问或执行；
- 前端不应在动作发出前先 return；
- 前端必须等待后端返回结果，无论返回多久。

### 本轮目标
1. 删除 `guardPermission()` / `hasPermission()` 在动作提交流程中的前置短路。
2. 删除 `CheckPermission` 作为终局显隐裁决的用途。
3. 删除 sidebar / nav / route-entry 等入口的本地权限过滤。
4. 保留登录态校验，不新增任何前端管理员特权、兜底或软拦截。

### 拟修改文件
1. `src/features/authz/hooks/use-permission-access.ts`
   - 计划动作：收敛或移除 `guardPermission()` / `hasPermission()` 作为终局裁决入口的职责，避免继续驱动动作级前置短路。

2. `src/components/check-permission.tsx`
   - 计划动作：移除其作为终局权限显隐裁决组件的职责；必要时最小替换现有调用点。

3. `src/components/layout/app-sidebar.tsx`
4. `src/features/authz/guards/navigation-access.ts`
5. `src/features/authz/guards/route-entry-access.ts`
   - 计划动作：删除菜单、导航入口、跨模块入口的本地权限过滤。

6. 直接调用点（按最小必要范围）
   - 例如使用 `guardPermission()`、`CheckPermission()`、`canAccessRouteEntry()` 的业务组件
   - 计划动作：仅做移除前端本地裁决所需的最小适配，不扩展到业务功能重构。

### 风险评估
1. 删除动作前置短路后，部分按钮点击会更频繁地触发后端 `403`；这符合后端裁决优先边界，但需要确保已有错误提示链路能承接。
2. 删除菜单/入口过滤后，前端会展示更多统一入口；最终可用性需由后端结果与页面自身承接。
3. 本轮涉及调用点较多，需严格控制为“删除前端裁决”而非额外功能改造。

### 验证策略
1. 静态验证：
   - 对 `use-permission-access.ts`
   - `check-permission.tsx`
   - `app-sidebar.tsx`
   - `navigation-access.ts`
   - `route-entry-access.ts`
   - 以及直接受影响调用点
   执行定向 `eslint`
   - 执行 `pnpm exec tsc --noEmit`
2. 行为验证：
   - 动作按钮不再因为前端本地权限判断而提前 return；
   - 菜单与跨模块入口不再以前端本地权限快照做最终显隐裁决；
   - 页面/动作最终是否允许访问或执行统一等待后端返回结果。

### 明确排除项
- 不新增任何前端管理员特权或万能兜底。
- 不新增路由软拦截。
- 不修改页面级 ForbiddenState 主链路。
- 不扩展到与本轮无关的 UI 样式或业务功能改造。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮方案后，再修改上述前端本地判权链路文件与相关最小适配调用点。
3. 若执行中发现还有其它前端本地终局裁决链路，需先回到本节补充方案后再继续。

## 治理 experimental / logistics-api-sandbox 模块（2026-04-05，待确认）

### 需求背景
当前 `src/features/experimental` 与 `src/features/logistics-api-sandbox` 都不是“纯死目录”：

1. `src/features/experimental`
   - 被 `src/routes/_authenticated/experimental/route.tsx`
   - `src/routes/_authenticated/experimental/route.lazy.tsx`
   - `src/routes/_authenticated/experimental/equipment.lazy.tsx`
   - `src/routes/_authenticated/experimental/tests.lazy.tsx`
   - `src/routes/_authenticated/experimental/reports.lazy.tsx`
   真实引用
   - `routeTree.gen.ts` 中也存在 `/experimental`、`/experimental/equipment`、`/experimental/tests`、`/experimental/reports`

2. `src/features/logistics-api-sandbox`
   - 被 `src/routes/_authenticated/system-management/logistics-api.tsx` 直接引用
   - 当前实际承载 `/_authenticated/system-management/logistics-api` 页面

这说明：
- 两个目录都不能直接物理删除；
- 但二者都存在明显治理债：`experimental` 长期以实验名义常驻正式路由，`logistics-api-sandbox` 以 sandbox 目录名承载真实系统管理页面。

### 本轮目标
1. 明确两个目录当前的真实运行关系与依赖链。
2. 为两个目录分别确定治理方向：删除下线，或迁正名保留。
3. 输出后续执行的最小改造路径，而不是直接粗暴删除目录。

### 治理方向候选
1. `experimental`
   - 方案 A：判定为历史实验模块，先下线 `_authenticated/experimental/*` 路由，再删除 feature 目录；
   - 方案 B：判定为仍需保留的正式模块，迁正名（目录、路由语义、tabs 文案）后继续保留。

2. `logistics-api-sandbox`
   - 方案 A：判定为历史沙箱页，先移除 `system-management/logistics-api` 路由与入口，再删除目录；
   - 方案 B：判定为正式系统管理子页，迁正名为正式目录，清除 sandbox 命名债。

### 拟修改文件（后续执行时）
1. `src/routes/_authenticated/experimental/*`
2. `src/features/experimental/*`
3. `src/routes/_authenticated/system-management/logistics-api.tsx`
4. `src/features/logistics-api-sandbox/*`
5. 相关 tabs / menu / route tree 生成产物与直接 import 调用点

### 风险评估
1. 两个目录都已接入真实路由树，直接删除会造成构建失败与运行时路由缺口。
2. 若误删仍在使用的实验/沙箱页面，可能影响系统管理或实验中心现有入口。
3. 若选择迁正名，需要同步处理目录引用、路由、tabs、文案与生成路由树，属于多点联动改造。

### 验证策略
1. 规划阶段验证：
   - 确认所有直接 import 与路由入口已盘清；
   - 确认 route tree 生成产物中对应路径是否仍存在。
2. 后续执行阶段验证（本轮仅预案，不执行）：
   - 重新生成 route tree / authenticated route catalog；
   - 执行定向 `eslint`；
   - 执行 `pnpm exec tsc --noEmit`；
   - 验证受影响菜单、入口与路由跳转链路。

### 明确排除项
- 本轮不直接物理删除这两个目录。
- 本轮不做无批准的路由下线。
- 本轮不扩展到与这两个目录无关的模块治理。

### 当前状态与暂停点
本节当前仅为实施计划，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新。
2. 需等你明确批准本轮治理方向后，再决定是执行“下线删除”还是“迁正名保留”。
3. 若执行中发现还有其它实验/沙箱目录被真实业务路由承载，需先回到本节补充方案后再继续。

## 全局技术债治理优先级计划（2026-04-06，待确认）

### 需求背景
本轮全局技术债审查已经完成，当前最重的债务不再是单个缺陷，而是四类会持续制造复杂度、误判与维护成本的结构性问题：

1. 认证 / 权限快照链复杂；
2. 权限相关 API 名称与实际行为失真；
3. 生成链耦合重；
4. 实验 / 沙箱模块长期常驻。

本节目标不是立即进入代码改造，而是先把以上 4 类债务整理为可执行、可分阶段推进、可审计回归的治理计划。根据既定流程：**当前阶段仅更新规划文档，需待你审批后再进入业务代码执行。**

### 优先级判断原则
本轮优先级不按“告警数量”排序，而按以下原则排序：

1. 是否持续制造隐性错误或状态漂移；
2. 是否阻塞后续功能开发与排障；
3. 是否会误导调用方或继续放大历史补丁；
4. 治理收益是否明显高于实施成本。

据此，建议执行顺序固定为：

1. **P0：认证 / 权限快照链复杂**
2. **P1：权限相关 API 名称与实际行为失真**
3. **P1：生成链耦合重**
4. **P2：实验 / 沙箱模块长期常驻**

### 分项治理方案

#### 1) P0：认证 / 权限快照链复杂

##### 治理目标
- 确认谁是权限快照的单一事实来源；
- 明确快照的生产、聚合、缓存、刷新与消费边界；
- 收敛前端对权限的再解释与猜测式推导；
- 为后续权限问题排查建立可解释链路。

##### 计划动作
1. 盘点当前权限快照全链路：
   - 后端生产点；
   - 前端接收点；
   - 本地缓存 / query cache / context / store；
   - 菜单、页面、tab、action 的消费入口；
   - 登录、刷新、切页、切部门、切角色时的刷新机制。
2. 输出“唯一权限快照契约”草案：
   - 角色来源；
   - 部门来源；
   - 直接授权；
   - 最终聚合权限；
   - `menu/page/tab/action` 作用域；
   - 版本 / 时间戳 / 来源标识。
3. 列出应由服务端最终裁决、前端仅做展示/禁用/提示的边界。
4. 标出当前多源快照、隐式 fallback、猜测式映射与重复缓存点，作为后续执行阶段的改造清单。

##### 重点范围
- `server/dependencies/effective_access.go` 及相关后端权限聚合链路；
- `server/authz/**`；
- 前端 `src/features/authz/**`、认证壳、菜单/路由/tab/action 权限投影链路；
- 用户、角色、部门相关权限消费入口。

##### 风险评估
1. 权限快照链涉及前后端多层联动，错误收敛可能导致权限判断短期回归。
2. 历史补丁可能已把部分规则散落到多个消费点，若盘点不完整会漏掉真实入口。
3. 若未先定义契约就直接改代码，容易把“一个复杂链”拆成“多个更隐蔽的复杂链”。

##### 验证预案
- 规划阶段：输出完整链路图、快照字段清单与问题分类。
- 执行阶段（后续审批后）：补充快照聚合测试、切页/刷新/重登一致性验证、菜单/页面/按钮裁决一致性回归。

##### 当前执行发现（2026-04-06）
1. 后端当前主链已基本清晰：`server/dependencies/effective_access.go` 负责聚合 `PrimaryRoleID / EffectiveRoles / Permissions`，`GET /profile` 返回当前用户的有效角色与权限集合，前端 `syncEffectivePermissionsFromProfile()` 在成功后把结果写回 `useAuthStore.user`，并设置 `isIdentitySynced = true`。
2. 当前真正的高风险点不在“后端没有单源”，而在“前端登录链路提前把状态标成已同步”：`src/features/auth/sign-in/components/user-auth-form.tsx` 曾在 `/profile` 同步前执行 `setIsIdentitySynced(true)`，若随后的 `/profile` 同步失败，Store 会停留在“已同步但 permissions 仍为空”的假状态。
3. 另一个重要事实是：前端当前并没有真正依赖本地守卫做最终裁决。`usePermissionAccess()` 当前为恒 `true`，`CheckPermission` 当前也只是透传 children，因此它们不能被当作可信判权来源；这与既有“后端为最终裁决、前端不做硬判权”的原则一致，但也意味着 P0 应优先修正身份同步状态，而不是贸然扩展前端硬守卫。

##### 当前已执行修复（2026-04-06）
1. 已在 `src/features/auth/sign-in/components/user-auth-form.tsx` 移除登录成功后过早设置 `isIdentitySynced = true` 的错误写入。
2. 当前改为：登录成功后先写入 `accessToken`，并显式保持 `isIdentitySynced = false`；只有 `syncEffectivePermissionsFromProfile()` 成功后，才由统一同步服务写入“已同步”状态。
3. 该修复的目标是消除“空权限假快照”长期滞留的问题，为后续继续收敛身份同步时序打底。
4. 已完成假守卫/假检查/假路由守卫的文件名级去误导清理：
   - `src/components/check-permission.tsx` -> `src/components/permission-passthrough.tsx`
   - `src/features/authz/hooks/use-permission-access.ts` -> `src/features/authz/hooks/use-permission-passthrough.ts`
   - `src/features/authz/guards/route-before-load.ts` -> `src/features/authz/guards/ensure-authenticated-route-session.ts`
   并已同步迁移全仓 import 路径，`tsc --noEmit` 通过。
5. 已收敛 `resolveStoredPermissionIds` 的裁决顺序：仅在 `isIdentitySynced === true` 且内存中已有权限快照时直接读取当前内存承接态；存在登录态但身份未同步完成时，优先触发 `/profile` 同步，避免继续走“内存优先、后端兜底”的顺序。
6. 已清理高风险业务入口的前端旁路裁决：
   - `users-add-admin-dialog.tsx` 去掉前端 `superadmin` 预判，仅以后端 `verifyAdminAccess` 为准；
   - `use-ai-permissions.ts` 去掉 `hasAuthSessionPermission / hasAuthSessionRole` 与 `superadmin` 硬编码放行；
   - `notification-center.tsx` 去掉“先本地权限判断，再决定要不要请求后端”的前置裁决；
   - `system-mgmt/tabs/index.tsx` 去掉 `perm_manage` 的前端本地预判，让删除角色入口不再由前端权限 helper 先挡住。
7. 已继续收敛底层能力层：
   - `src/features/authz/utils/auth-session.ts` 当前仅保留 `getAuthSessionRoleIds / getAuthSessionEffectiveRoleIds / getAuthSessionPermissionIds` 三个快照读取 helper；
   - `hasAuthSessionPermission / hasAuthSessionRole / hasAuthSessionAnyRole` 已从底层删除；
   - `src/features/authz/guards/route-access.ts` 已改为在文件内基于 `getAuthSessionPermissionIds(...)` + `permission-kernel` 做本地投影匹配，不再依赖“会话判权 helper”语义；
   - 当前全仓对 `hasAuthSessionPermission / hasAuthSessionRole / hasAuthSessionAnyRole` 的调用扫描结果为 0，`tsc --noEmit` 通过。
8. 已完成兼容别名与旧语义注释清理：
   - `src/components/permission-passthrough.tsx` 已删除 `CheckPermission` 兼容别名导出；
   - `src/features/authz/hooks/use-permission-passthrough.ts` 已删除 `usePermissionAccess / usePermission` 兼容别名导出；
   - `src/features/authz/guards/ensure-authenticated-route-session.ts` 已删除 `ensureRoutePermissionAccess` 兼容别名导出；
   - `src/lib/api-client.ts` 中旧语义的 `Auth Guard` 注释已收敛为 `Auth Session Gate`；
   - 当前全仓对 `CheckPermission / usePermissionAccess / usePermission / ensureRoutePermissionAccess / Auth Guard / route guard / check permission` 的代码层扫描结果为 0，`tsc --noEmit` 通过。

##### 待实施：P0 服务层审计链收口与构建恢复（2026-04-06）
1. 当前问题收敛：
   - `server/services/service_runtime.go` 当前仅提供 `transactionManager` 与 `gormTransactionManager`，没有把服务层审计能力纳入统一运行时注入；
   - `ProductionService` / `OrganizationService` 已有部分测试名称宣称“writes audit”，但现有测试断言并未真正验证审计写入闭环；
   - 当前服务层审计链更像“部分仓储/钩子可写、服务层入口未统一收口”，会导致后续写操作继续出现旁路。
2. 实施范围：
   - 为 `service_runtime.go` 增补统一的 `auditLogger` 注入边界，并提供默认实现承接；
   - 收口 `ProductionService` / `OrganizationService` 关键写操作，让删除、批量同步、组织/员工改写等高风险操作统一走服务层审计主链；
   - 复核 `/api/audit` 的读取链路与 `models.AuditLog` 格式，确保新增服务层写入不会落成“写得进、查不对”。
3. 预计涉及文件：
   - `server/services/service_runtime.go`
   - `server/services/production_service.go`
   - `server/services/organization_service.go`
   - `server/services/audit_service.go`
   - `server/services/production_service_test.go`
   - `server/services/organization_service_test.go`
   - 必要时涉及 `server/handlers` / `server/models` 中 `/api/audit` 的读取链路文件
4. 风险与注意事项：
   - 本轮目标是“服务层主链收口”，不顺手扩成审计系统全面重构；
   - 优先把已有假通过/空壳断言测试补实，再考虑新增覆盖；
   - 需要与现有 GORM hooks 审计能力区分边界，避免重复写日志或出现两套格式并存。
5. 验证预案：
   - 定向 `go test`：`server/services`、必要时 `server/handlers`；
   - 定向 `go build`：优先验证本轮相关包；
   - 如条件允许，再观察 `go build ./...` 是否仍只剩既有无关阻塞；
   - 前端继续用 `pnpm exec tsc --noEmit` 做回归兜底。
6. 已实施结果：
   - `server/services/service_runtime.go` 已新增 `serviceRuntime` 与 `defaultServiceRuntime()`，把 `transactionManager + auditLogger` 收敛为统一默认运行时注入入口；
   - `server/services/audit_service.go` 已从空壳恢复为最小可用实现，新增 `AuditEntry`、`auditLogger` 接口与 `defaultAuditLogger`，默认写入 `models.AuditLog`；
   - `server/services/production_service.go` 已接入 `auditLogger`，`DeleteProductionLine(...)` 删除成功后统一写入服务层审计；
   - `server/services/organization_service.go` 已接入 `auditLogger`，`DeleteEmployees(...)` 与 `BulkSyncEmployees(...)` 现在会按员工粒度写入 `Delete / Update / Create` 审计记录；
   - `server/services/production_service_test.go` / `server/services/organization_service_test.go` 已补 `fakeAuditLogger` 注入，原“writes audit”空壳测试已改为真实断言。
7. 实际验证结果：
   - `go test ./services` 通过；
   - `go build ./services ./handlers ./routes` 通过；
   - `/api/audit` 读取链路仍直接基于 `models.AuditLog` 承接，当前服务层新写入格式未引入额外读链路不兼容；
   - `go build ./...` 通过；
   - 结论：当前工作区不存在需额外区分的全量构建阻塞，P0 服务层审计链与构建恢复已阶段性闭环。

#### 2) P1：权限相关 API 名称与实际行为失真

##### 治理目标
- 建立“名称即契约”的接口语义；
- 区分原始配置、聚合快照、最终裁决；
- 区分 `create/update/patch/replace/sync` 等写操作语义；
- 降低调用方误用与后续重构误判概率。

##### 计划动作
1. 盘点权限相关 handler、service、hook、类型与前端 API 封装中所有高误导名称。
2. 对每个目标项标注：
   - 当前名称；
   - 实际行为；
   - 建议新名称；
   - 是否需要兼容层；
   - 是否涉及 breaking change。
3. 优先筛出最危险的失真模式：
   - `save*` 实际为 `create*` / `patch*` / `replace*`；
   - `get*Permissions` 实际返回聚合裁决或有效访问结果；
   - `toggle*` 实际执行整包重算或提交；
   - `list*` 实际返回加工后的聚合结果。
4. 设计兼容迁移策略，避免一次性改名破坏现有链路。

##### 当前盘点结果：角色权限编辑链命名失真清单（2026-04-06）
| 层级 | 当前名称 | 位置 | 名称给人的直觉 | 实际行为 | 失真类型 | 建议新名称 | 风险等级 |
|---|---|---|---|---|---|---|---|
| Hook | `togglePermission` | `src/features/system-mgmt/hooks/use-roles.ts` | 仅切换单个权限开/关 | 会按权限树规则补祖先、补子孙、删子孙，生成整包 `updatedRole`，再提交整包角色 | `toggle` 伪装成“整包重算+提交” | `applyPermissionTreeToggle` / `recalculateRolePermissionsByToggle` | 高 |
| Hook | `updateRoleLabel` | `src/features/system-mgmt/hooks/use-roles.ts` | 只 patch 一个 label 字段 | 本地构造完整 `updatedRole` 后走整包提交 | `update field` 伪装成 `upsert whole role` | `updateRoleLabelViaRoleUpsert` / `submitRoleLabelChange` | 中 |
| Hook | `addRole` | `src/features/system-mgmt/hooks/use-roles.ts` | 明确 create 新角色 | 本地先构造默认权限 role，再调用 `RoleService.saveRole(newRole)`，底层仍是 upsert 通道 | `create` 建立在 `upsert` 之上，服务层语义不透明 | `createRoleDraftAndSubmit` / 若服务层改名后配套 `createRole` | 中 |
| Hook | `deleteRole` | `src/features/system-mgmt/hooks/use-roles.ts` | 删除角色 | 本地先乐观删除，再调用后端删除；失败不完全恢复原状态，只 toast | 名称问题较小，主要是 optimistic delete | `deleteRoleOptimistically` | 低 |
| Service | `getRoles` | `src/features/system-mgmt/services/role-service.ts` | 获取角色列表 | 读取 `/roles`，并把 `permissions` JSON 反序列化成前端数组 | `get` 问题不大，但返回的是“前端规范化后的角色列表” | `fetchRoles` / `fetchAndNormalizeRoles` | 低 |
| Service | `saveRole` | `src/features/system-mgmt/services/role-service.ts` | 保存一个 role，含义模糊 | 调 `POST /roles`；后端按 `role.id` 执行 create/update/restore；返回规范化 role | `save` 伪装成 `upsert + restore` | `upsertRole` | 高 |
| Handler | `SaveRoleHandler` | `server/handlers/role_handlers.go` | 保存角色 | 先查 `role_id`；存在则更新，不存在则创建；若软删除则恢复；更新/创建都走同一路径 | `save` 伪装成 `upsert + undelete` | `UpsertRoleHandler` / `CreateOrUpdateRoleHandler` | 高 |
| HTTP 接口 | `POST /roles` | 前后端约定 | 可能被理解成 create | 实际是按 `role_id` upsert，并可能恢复已软删记录 | `POST` create 语义与 upsert 语义混杂 | 短期保留；长期拆为 `POST /roles` + `PATCH /roles/:id` + `POST /roles/:id/restore` | 高 |
| 辅助流程 | `bootstrapRolePermissions` | `src/features/system-mgmt/hooks/use-roles.ts` | 启动时补齐权限 | 会对角色权限做规范化，并对变更项再次 `saveRole` 回写后端 | “bootstrap” 里夹带持久化修正 | `normalizeAndBackfillRolePermissions` | 中 |
| 权限快照服务 | `resolveStoredPermissionIds` | `src/features/authz/services/effective-permission-service.ts` | 读取已存权限 ID | 在未同步时会触发 `/profile` 同步，承担“读 + 校准”职责 | `resolve stored` 伪装成 `resolve or sync` | `resolveOrSyncPermissionIds` | 高 |

##### 当前盘点结果：用户/权限快照链命名失真清单（2026-04-06）
| 层级 | 当前名称 | 位置 | 名称给人的直觉 | 实际行为 | 失真类型 | 建议新名称 | 风险等级 |
|---|---|---|---|---|---|---|---|
| Service | `syncEffectivePermissionsFromProfile` | `src/features/authz/services/effective-permission-service.ts` | 仅同步权限字段 | 实际会请求 `/profile`，规范化权限、解析角色、回写 `useAuthStore.user`，并设置 `isIdentitySynced = true` | `sync permissions` 伪装成 `sync identity snapshot` | `syncIdentitySnapshotFromProfile` / `syncAuthSnapshotFromProfile` | 高 |
| Service | `processAndNotifyPermissions` | `src/features/authz/services/effective-permission-service.ts` | 处理并通知权限 | 实际只做权限 ID 规范化 + 事件广播，不负责写回 Store | `process` 语义过宽，易被误解成完整权限处理管线 | `normalizePermissionsAndNotify` | 中 |
| Service | `resolveStoredPermissionIds` | `src/features/authz/services/effective-permission-service.ts` | 读取已存权限 ID | 在未同步时会触发 `/profile` 同步，承担“读 + 校准”职责 | `stored` 伪装成 `resolve or sync` | `resolveOrSyncPermissionIds` | 高 |
| Hook/API | `useGetUsers` | `src/features/users/hooks/use-users.ts` | 获取用户列表 | 实际透传 `userApi.getUsers(params)`，返回的既可能是数组，也被部分调用方当成 `{ items }` 分页结构使用 | `get users` 未明确返回契约形状 | `useFetchUsers` / `useUsersQuery`，并补明确响应类型 | 高 |
| API | `getUsers` | `src/features/users/services/user-api.ts` | 获取用户列表 | 当前返回 `apiFetch<User[]>('/users?...')`，但部分调用方按分页响应读取；名称未暴露“列表/分页/查询”契约差异 | `get` 语义过宽，返回形状与调用方认知漂移 | `fetchUsers` / `queryUsers`，并补统一响应类型 | 高 |
| API | `createUser` | `src/features/users/services/user-api.ts` | 创建普通用户 | 实际命中 `POST /users`，该接口受后端角色校验约束；在管理员创建链路中还被复用于特权创建场景 | `create user` 未暴露普通创建与特权创建的边界差异 | `createUser` 保留，但需拆出专用 `createAdminUser` 或专用 handler | 中 |
| API | `updateUser` | `src/features/users/services/user-api.ts` | 更新用户 | 当前走 `PATCH /users/:id`，但路由层同时也把 `PUT /users/:id` 指向同一 handler，接口契约未区分 patch / replace | `update` 伪装成 patch/put 合流 | `patchUser`（前端）+ 后端拆分 `PatchUserHandler` / `ReplaceUserHandler` | 中 |
| API | `verifyAdminAccess` | `src/features/users/services/user-api.ts` | 校验管理员访问 | 实际是“提交 passcode 并让后端按当前会话裁决是否允许敏感提权操作” | `verify access` 语义略抽象，未体现 challenge 性质 | `verifyAdminChallenge` / `requestAdminPrivilegeVerification` | 中 |
| Handler | `GetProfileHandler` | `server/handlers/auth.go` | 获取用户 profile | 实际返回的是权限聚合后的身份快照：用户基础信息 + 有效角色 + 最终权限集合 | `profile` 伪装成 `auth snapshot` | `GetAuthSnapshotHandler` / `GetEffectiveAccessProfileHandler` | 高 |
| Handler | `CreateUserHandler` | `server/handlers/users.go` | 创建用户 | 实际除创建外，还承担 role 存在性校验、安全角色限制等权限边界控制 | `create` 问题不大，但其“权限边界控制”职责未在名字里体现 | 可保留；在文档中标注其带有 role validation / security gate | 低 |
| Handler | `UpdateUserHandler` | `server/handlers/users.go` | 更新用户 | 实际同时被 `PATCH /users/:id` 与 `PUT /users/:id` 复用，内部更偏 patch 行为（按字段存在性更新） | `update` 伪装成 patch/replace 合流 | `PatchUserHandler`，如需保留 PUT 再补 `ReplaceUserHandler` | 高 |
| HTTP 接口 | `GET /profile` | 前后端约定 | 读取个人资料 | 实际是前端身份与权限快照主来源 | `profile` 伪装成 `effective access snapshot` | 短期保留；长期可加别名 `/auth/snapshot` 或 `/access/profile` | 高 |

##### 已实施：第一批最小命名校正（2026-04-06）
1. 前端已完成第一批高风险命名校正：
   - `RoleService.saveRole` -> `RoleService.upsertRole`
   - `useRoles.togglePermission` -> `useRoles.applyPermissionTreeToggle`
   - `syncEffectivePermissionsFromProfile` -> `syncIdentitySnapshotFromProfile`
   - `resolveStoredPermissionIds` -> `resolveOrSyncPermissionIds`
   - `verifyAdminAccess` -> `verifyAdminChallenge`
2. 后端已完成第一批对应校正：
   - `SaveRoleHandler` -> `UpsertRoleHandler`
   - `server/routes/routes_authz.go` 已同步切换到 `handlers.UpsertRoleHandler`
3. 主调用层已完成同步替换：
   - `users-add-admin-dialog.tsx`
   - `authenticated-layout.tsx`
   - `user-auth-form.tsx`
   - `auth-debug-indicator.tsx`
   - `use-roles.ts`
   - `system-mgmt/tabs/index.tsx`
   - `user-rights-desktop-matrix.tsx`
   - `user-rights-mobile-tree.tsx`
4. 残留扫描结果：
   - `saveRole / togglePermission / syncEffectivePermissionsFromProfile / resolveStoredPermissionIds / verifyAdminAccess / SaveRoleHandler / onTogglePermission` 已清零。
5. 验证：
   - `pnpm exec tsc --noEmit` 通过。

##### 已实施：第二批最小命名校正（2026-04-06）
1. 前端已完成第二批语义校正：
   - `getUsers` -> `fetchUsers`
   - `useGetUsers` -> `useUsersQuery`
   - `updateUser` -> `patchUser`
2. 后端已完成第二批对应校正：
   - `UpdateUserHandler` -> `PatchUserHandler`
   - `GetProfileHandler` -> `GetAuthSnapshotHandler`
   - `server/routes/routes.go` 已同步切换到新 handler 名称，`/profile` 与 `/users/:id` 的 HTTP 路径保持不变。
3. 主调用层已完成同步替换：
   - `src/features/users/index.tsx`
   - `src/features/users/components/users-action-dialog.tsx`
   - `src/features/users/hooks/use-users.ts`
   - `src/features/users/services/user-api.ts`
   - `src/features/system-mgmt/tabs/index.tsx`
   - `src/features/system-mgmt/tabs/perm-stats-tab.tsx`
   - `src/features/approval/services/approval-service.ts`
   - `src/features/approval/tabs/approval-configs.tsx`
4. 残留扫描结果：
   - `useGetUsers / getUsers / updateUser / ApprovalService.getUsers / UpdateUserHandler / GetProfileHandler` 已清零。
5. 验证：
   - `pnpm exec tsc --noEmit` 通过。

##### 已实施：第三批接口语义升级（2026-04-06）
1. `PATCH /users/:id` 与 `PUT /users/:id` 已完成分流：
   - `PATCH /users/:id` -> `PatchUserHandler`
   - `PUT /users/:id` -> `ReplaceUserHandler`
   - `ReplaceUserHandler` 已实现完整替换语义：对 `username / phoneNumber / firstName / lastName / role / status / employeeId` 做整包覆盖；密码仅在请求提供非空值时更新。
2. 身份快照已增加准确别名：
   - 保留 `GET /profile` 兼容入口；
   - 新增 `GET /auth/snapshot` 规范入口；
   - 前端 `syncIdentitySnapshotFromProfile()` 已切换到 `/auth/snapshot`。
3. 用户列表契约已统一：
   - `fetchUsers()` 统一返回分页结构：`items / total / page / pageSize`；
   - 新增 `fetchUserOptions()` / `useUserOptionsQuery()` 作为轻量用户选项查询；
   - `ApprovalService.fetchUserOptions()` 已替代审批配置场景对主用户列表查询的复用。
4. 主调用层已完成同步替换：
   - `src/features/users/index.tsx`
   - `src/features/users/components/users-table.tsx`
   - `src/features/users/components/users-action-dialog.tsx`
   - `src/features/users/components/users-action-dialog.submit.ts`
   - `src/features/users/hooks/use-users.ts`
   - `src/features/users/services/user-api.ts`
   - `src/features/users/data/schema.ts`
   - `src/features/system-mgmt/tabs/index.tsx`
   - `src/features/system-mgmt/tabs/perm-stats-tab.tsx`
   - `src/features/authz/services/effective-permission-service.ts`
   - `src/features/approval/services/approval-service.ts`
   - `src/features/approval/tabs/approval-configs.tsx`
   - `server/handlers/users.go`
   - `server/routes/routes.go`
5. 验证：
   - `pnpm exec tsc --noEmit` 通过；
   - `go build ./handlers ./routes` 通过；
   - 说明：`go build ./...` 仍会被项目内既有 `server/audit` 无关错误阻塞，不属于本轮 users/auth-snapshot 改动回归。

##### 已实施：第三批接口语义升级测试补强（2026-04-06）
1. 后端测试补强范围：
   - `ReplaceUserHandler`：覆盖完整替换语义、密码保留语义、非法 `role / status` 校验、管理员保护边界；
   - `/auth/snapshot`：验证与 `/profile` 使用同一快照 handler，返回结构一致；
   - `GET /users`：验证分页结构 `items / total / page / pageSize`、`username / status / role` 过滤，以及 `options=true` 轻量分支。
2. 前端测试补强范围：
   - `src/features/authz/services/effective-permission-service.ts`：验证身份快照同步已改走 `/auth/snapshot`，并正确回填 `role / permissions`；
   - `src/features/users/services/user-api.ts`：验证 `fetchUsers()` 与 `fetchUserOptions()` 的请求 URL 与返回契约；
   - 若现有测试基建允许，再补 `useUsersQuery / useUserOptionsQuery` 或最小消费层回归，确保分页/选项查询职责分离。
3. 预计涉及文件：
   - `server/handlers/*_test.go`（优先复用现有 handler 测试基建；若无则在 users/auth 对应测试文件补充）
   - `src/features/authz/services/*.test.ts`
   - `src/features/users/services/*.test.ts`
   - 必要时增补 `src/features/users/hooks/*.test.ts(x)`
4. 风险与注意事项：
   - 后端全量 `go test ./...` 可能继续受既有 `server/audit` 无关问题干扰，应优先采用定向包测试；
   - 前端测试需避免把“前端自判权限”重新带回断言逻辑，重点验证调用目标与承接结果；
   - `ReplaceUserHandler` 的密码断言应以哈希是否保持不变为准，避免直接依赖明文比较。
5. 验证预案：
   - 后端：执行 users/auth 相关定向 `go test`；
   - 前端：执行对应 Vitest 测试与 `pnpm exec tsc --noEmit`；
   - 完成后在 `walkthrough.md` 记录测试命令、结果与残留阻塞项。
6. 已实施结果：
   - 新增 `server/handlers/users_contract_regression_test.go`，覆盖 `ReplaceUserHandler`、`GetUsersHandler` 分页/选项契约，以及 `/profile` 与 `/auth/snapshot` 快照别名一致性；
   - 新增 `src/features/users/services/user-api.test.ts`，验证 `fetchUsers()` 与 `fetchUserOptions()` 请求 URL 与返回契约；
   - 新增 `src/features/authz/services/effective-permission-service.test.ts`，验证身份快照同步主调用走 `/auth/snapshot`，并由后端快照回填角色与权限；
   - 新增 `vitest.config.ts` 与 `package.json` 中的最小测试脚本，建立前端回归测试基线。
7. 实际验证结果：
   - `go test ./handlers -run "ReplaceUserHandler|GetUsersHandler|AuthSnapshotAlias|UsersContract"` 通过；
   - `pnpm exec vitest run src/features/authz/services/effective-permission-service.test.ts src/features/users/services/user-api.test.ts` 通过；
   - `pnpm exec tsc --noEmit` 通过。

##### 已实施：前端回归测试接入与 hooks 补强（2026-04-06）
1. 脚本与 CI 接入范围：
   - 复用现有 `test:contracts` 作为前端 contract tests 主入口；
   - 在 `.github/workflows/ci.yml` 的前端流水线中增加独立步骤执行 `pnpm run test:contracts`；
   - 维持 “lint / contract tests / build” 分层，避免把测试直接耦进 `build` 脚本导致问题定位困难。
2. hooks 测试补强范围：
   - 为 `src/features/users/hooks/use-users.ts` 新增 hooks 回归测试；
   - 覆盖 `useUsersQuery` 调用 `fetchUsers`、返回分页结构、query key 承接分页查询参数；
   - 覆盖 `useUserOptionsQuery` 调用 `fetchUserOptions`、返回轻量数组、query key 与主列表查询隔离。
3. 预计涉及文件：
   - `package.json`
   - `.github/workflows/ci.yml`
   - `src/features/users/hooks/use-users.test.ts(x)`
   - 如 hooks 测试需要，再补最小测试辅助封装，但避免引入重型 UI 测试依赖。
4. 风险与注意事项：
   - hooks 测试优先验证查询函数与 query key 边界，不把 React Query 内部实现细节写死；
   - CI 接入应尽量复用已有 job，避免无必要拆出新矩阵增加维护成本；
   - 保持“前端不自判权限、以后端快照为准”的测试边界，不在 hooks 测试中引入权限裁决逻辑。
5. 验证预案：
   - `pnpm run test:contracts`
   - `pnpm exec vitest run` 针对 hooks 与 contract tests 的定向执行
   - `pnpm exec tsc --noEmit`
   - 完成后在 `walkthrough.md` 记录脚本接入点、测试命令与结果。
6. 已实施结果：
   - `.github/workflows/ci.yml` 已在前端 job 中新增 `pnpm run test:contracts` 步骤；
   - `package.json` 的 `test:contracts` 已纳入 `src/features/users/hooks/use-users.test.ts`；
   - 新增 `src/features/users/hooks/use-users.test.ts`，通过 mock `useQuery` 验证 `useUsersQuery / useUserOptionsQuery` 的 query key 与 queryFn 分流边界。
7. 实际验证结果：
   - `pnpm exec vitest run src/features/authz/services/effective-permission-service.test.ts src/features/users/services/user-api.test.ts src/features/users/hooks/use-users.test.ts` 通过；
   - `pnpm exec tsc --noEmit` 通过。

##### 风险评估
1. 改名本身不难，但调用方、测试、文档与类型要同步，联动面不小。
2. 若没有兼容层，容易在短期内破坏已有调用与隐式约定。
3. 若没有先梳理快照链，就容易把命名校正建立在不稳定语义上。

##### 验证预案
- 规划阶段：输出“命名失真清单 + 建议新名称 + 迁移顺序”。
- 执行阶段（后续审批后）：补充接口契约回归、前后端调用链核对与类型检查。

#### 3) P1：生成链耦合重

##### 治理目标
- 把权限/路由/菜单/action/contract 生成链分层；
- 找出承担多重职责的生成节点；
- 将运行时猜测规则前移为显式清单或映射；
- 缩短生成链，避免产物成为“第二真相”。

##### 计划动作
1. 给生成链分层：
   - 源事实层；
   - 转换层；
   - 运行时消费层；
   - 验证层。
2. 盘点混合职责节点，重点识别：
   - 一边生成一边补 fallback；
   - 一边做 contract 一边补别名；
   - 一边运行时消费一边猜权限映射。
3. 把高风险隐式规则整理成显式映射表或清单草案。
4. 设计后续执行阶段的链路缩短方案，目标收敛为“源定义 -> 标准化 -> 消费”。

##### 重点范围
- 权限 contract、route permission、sidebar / tab / action 投影链；
- 权限验证脚本、生成脚本与运行时断言。

##### 风险评估
1. 生成链已参与现有权限主流程，拆解时若没有对照验证，容易出现静默漂移。
2. 某些生成产物已成为多处消费者的依赖，不能假设“删掉旧层”就一定安全。
3. 若未先稳定权限主链与 API 语义，过早拆生成链会放大不确定性。

##### 验证预案
- 规划阶段：输出分层图、混合职责节点清单、显式清单化候选项。
- 执行阶段（后续审批后）：补充生成脚本验证、权限产物比对、`tsc` / 定向 `eslint` / 权限验证脚本回归。

##### 当前盘点结果（2026-04-06）
1. 当前生成链已经能分成三层，但层间边界仍不干净：
   - 源事实层：
     - 后端 `server/authz/permissions.go` 作为后端托管权限 ID 的单一事实来源；
     - `scripts/generate-authenticated-route-catalog.mjs` 产出的 `src/features/authz/data/authenticated-route-catalog.ts` 作为前端“已认证路由路径目录”。
   - 转换层：
     - `src/features/authz/data/permission-catalog.ts` 维护 `MENU_PERMISSIONS` 与 `ROUTE_TO_MENU_MAPPING`；
     - `src/features/authz/data/route-permissions-generator.ts` 基于路由目录派生 page/tab 权限、route entry 与 fallback；
     - `src/features/authz/data/action-permission-catalog.ts` 维护 action 权限静态目录与 `routeBindings` 注释性映射；
     - `src/features/authz/data/default-permissions.ts` 汇总 route-derived + action 权限，并执行前后端权限契约校验。
   - 运行时消费层：
     - `src/features/authz/guards/route-access.ts` 读取 `ROUTE_PERMISSION_ENTRIES` 做运行时路径匹配；
     - `src/features/system-mgmt/hooks/use-roles.ts` 直接依赖 `DEFAULT_PERMISSIONS` 构造权限树辅助索引；
     - `src/features/system-mgmt/tabs/components/user-rights-utils.ts` 继续把权限列表投影为菜单/页面/TAB 树形 UI。
2. 当前高耦合/混合职责节点：
   - `route-permissions-generator.ts` 同时承担：
     - 路由规格化；
     - page/tab 权限生成；
     - route permission entry 生成；
     - fallback 规则写入；
     - 缓存与排序。
     这使它既像“编译期转换器”，又像“运行时访问规则生成器”。
   - `permission-catalog.ts` 同时承担：
     - 菜单权限字典；
     - rootPath 到 menu 的人工映射；
     - permission id 生成工具；
     - 未映射 rootPath 的运行时抛错。
     这让“静态目录”和“运行时校验/失败机制”耦在同一处。
   - `default-permissions.ts` 当前既做聚合，又在模块初始化时执行 `assertBackendPermissionContract(...)`，意味着“产物装配”和“契约验证”还未完全分离。
   - `route-access.ts` 当前直接消费 `ROUTE_PERMISSION_ENTRIES` 并再次做路径模式匹配，说明运行时仍部分依赖转换层产物的内部结构，而不是更稳定的查询接口。
3. 当前显式规则与高风险手工兜底：
   - `ROUTE_TO_MENU_MAPPING` 是 page/tab 生成的关键人工映射表；
   - `route-permissions-generator.ts` 中 page 的 `fallbackPermissionIds = [menuId]`、tab 的 `parentId = parentPageId || menuId` 仍包含“生成期兜底”；
   - `action-permission-catalog.ts` 的 `routeBindings` 目前更像文档性目录，而非真正可验证的 contract；
   - `DEFAULT_PERMISSIONS` 的排序、去重、聚合发生在运行时模块加载阶段，而不是显式构建阶段。
4. 这说明当前最需要的不是立刻大改业务消费层，而是先把链路重述为：
   - 源事实层：后端权限常量 + 已认证路由目录
   - 转换层：显式生成 menu/page/tab/action 产物
   - 消费层：只读取标准化产物，不再自行猜测或补 fallback
5. 建议的后续执行顺序（待审批后再做）：
   - 第一步：拆出“纯生成产物”和“运行时查询 helper”，降低 `route-permissions-generator.ts` 的混合职责；
   - 第二步：收敛 `permission-catalog.ts` / `default-permissions.ts` 里仍混杂的运行时校验与装配逻辑；
   - 第三步：补生成脚本/产物校验与最小消费层回归，确保不再出现 route/menu/tab/action 的第二真相。
6. 当前阶段结论：
   - 可以进入执行阶段，但应坚持“先拆层、后收敛 fallback、最后补验证”的顺序；
   - 本阶段先停在规划，不直接大改业务代码，等待用户确认。

##### 待实施：P1 action routeBindings contract 化（2026-04-06）
1. 当前问题收敛：
   - `src/features/authz/data/action-permission-catalog.ts` 里的 `routeBindings` 仍是自由格式字符串数组，本质上更像“文档目录”而非结构化 contract；
   - 现有 `scripts/check-action-permission-closure.mjs` 已具备后端路由扫描与绑定比对能力，但目前仍依赖正则解析 `GET /path (注释)` 这类字符串格式，输入本身不稳定；
   - 因此当前更高优先级不是再额外造一层测试，而是先把 `routeBindings` 收敛为机器可读、可直接校验的结构化输入。
2. 实施目标：
   - 把 `routeBindings` 从字符串数组升级为结构化 contract（例如 `{ method, path }`）；
   - 如存在备注性信息，拆为独立字段承接，避免继续把“route + 注释”混成单字符串；
   - 让 closure 校验脚本优先消费结构化 binding，从“解析文档文本”升级为“校验 contract”。
3. 最小实施范围：
   - `src/features/authz/data/action-permission-catalog.ts`
   - 如有必要新增轻量 helper / 类型文件承接 binding 结构
   - `scripts/check-action-permission-closure.mjs`
   - 必要时 `package.json` 中的校验脚本入口
4. 风险与注意事项：
   - 目标是把输入 contract 化，不顺手扩成“前后端权限系统大重构”；
   - 需评估是否保留短期兼容层，避免一次性打断依赖旧字符串的脚本或辅助输出；
   - 若现有少量 `routeBindings` 携带说明性文本，应先拆字段，不应继续让校验逻辑承受自由文本解析。
5. 建议执行顺序：
   - 第一步：定义结构化 `ActionRouteBinding` 类型与 catalog 最小落地格式；
   - 第二步：让 `check-action-permission-closure.mjs` 优先读取结构化 binding；
   - 第三步：执行 `pnpm exec tsc --noEmit` 与 action closure 脚本校验，并记录残留例外。
6. 当前阶段结论：
   - 推荐先做 routeBindings contract 化，再做最小生成链验证补强；
   - 本阶段先停在规划，等待用户确认后再进入代码执行。

##### 待实施：P1 action routeBindings 缺口补齐（2026-04-06）
1. 当前问题收敛：
   - `node scripts/check-action-permission-closure.mjs` 当前已能稳定消费结构化 binding，且 `invalid_route_bindings = 0`；
   - 当前真正剩余的问题不是 binding 结构错误，而是 5 条后端受保护路由尚未绑定到 action contract：
     - `POST /purchase/orders/:id/confirm-receipt` -> `action_trading_purchase_order_manage`
     - `POST /workflows/definitions` -> `action_approval_config_manage`
     - `POST /workflows/instances` -> `action_approval_config_manage`
     - `PATCH /workflows/tasks/:id/approve` -> `action_approval_review`
     - `PATCH /workflows/tasks/:id/reject` -> `action_approval_review`
2. 实施目标：
   - 仅补齐上述 5 条 routeBindings，避免顺手扩散到其他 action 目录重排；
   - 让 closure 脚本的 `unbound_backend_routes` 清零，确认当前 action contract 与后端受保护路由闭环。
3. 最小实施范围：
   - `src/features/authz/data/action-permission-catalog.ts`
   - 如有必要，仅补充极少量相关测试/脚本入口，不扩展新的生成链结构
4. 风险与注意事项：
   - 这一步是“补 contract 缺口”，不是重新定义 action 权限边界；
   - 需要保持 action 语义与现有后端受保护路由一致，避免因为图省事把多个不相关 route 误绑到同一 action；
   - 若 closure 脚本补齐后仍报错，应优先视为历史 contract 漏项继续补，不要回退结构化 binding 改造。
   - `node scripts/check-action-permission-closure.mjs`
   - `pnpm exec tsc --noEmit`
   - 完成后在 `walkthrough.md` 记录“未绑定路由归零”或明确剩余例外项。
6. 当前阶段结论：
   - P2 的下一步执行不应直接删模块，而应先按入口污染面做分批收口；
   - 本阶段先停在规划，等待用户确认后再进入执行阶段。

##### 待实施：P2 实验 / sandbox 源码路径语义迁移（2026-04-06）
1. 当前问题收敛：
   - 目前虽然已开始摘除 `experimental` 与 `system-management/logistics-api` 的正式暴露面，但源码目录语义仍不清晰：
     - `src/features/experimental/**` 仍直接使用 `experimental` 命名；
     - `src/features/logistics-api-sandbox/**` 仍与正式系统管理模块处于弱边界状态。
   - 这种目录命名会继续误导后续开发者，把保留中的实验 / sandbox 源码当作正式架构的一部分。
2. 初步迁移目标：
   - `src/features/experimental/**` -> 倾向迁到 `src/features/labs/experimental/**`
   - `src/features/logistics-api-sandbox/**` -> 倾向迁到 `src/features/sandbox/logistics-api/**`
   - 路由壳 `src/routes/_authenticated/experimental/**` 先保留路径不删，只更新 import 指向，维持“摘正式暴露但保留源码”策略。
3. 最小实施范围：
   - 目录 rename / 新路径落位
   - 受影响的前端 import 更新
   - 与实验模块相关的路由壳引用更新
   - 必要时重生成 `routeTree.gen.ts` 与 `authenticated-route-catalog.ts`
4. 风险与注意事项：
   - 目录迁移属于结构级改动，联动 import 范围可能较广；
   - 本轮目标是“目录语义清晰化”，不是恢复实验模块正式可用；
   - 若存在仅供留档或后续迁移参考的路由壳，应优先保留壳、改 import，不直接删除路由文件。
5. 建议执行顺序：
   - 第一步：迁 `src/features/experimental/**` 到 `src/features/labs/experimental/**` 并更新 import；
   - 第二步：迁 `src/features/logistics-api-sandbox/**` 到 `src/features/sandbox/logistics-api/**` 并更新 import；
   - 第三步：重生成相关产物并执行 `pnpm exec tsc --noEmit`；
   - 第四步：确认正式入口仍处于“已摘除暴露”状态，而不是被目录迁移意外恢复。
6. 当前阶段结论：
   - 可以进入执行阶段，但应先做目录级迁移，不继续扩大到功能逻辑改造；
   - 本阶段先停在规划，等待用户确认后再执行实际迁移。

##### 待实施：P2 兼容路径 / 键名升级专项（2026-04-06）
1. 当前问题收敛：
   - 目录语义与内部导出命名已开始收敛，但外部兼容边界仍沿用旧语义：
     - 路由路径仍为 `/experimental/*`
     - 前端调用的 API 仍为 `/experimental/*`
     - i18n key 仍为 `experimental.*`
   - 这些残留已经不再只是“变量名清理”，而是显式兼容迁移工程，若直接硬改，容易同时影响路由、权限、搜索、前后端接口与文案资源。
2. 专项目标：
   - 为实验模块建立新的长期命名语义，并通过兼容迁移逐步替换 `/experimental/*` 与 `experimental.*`；
   - 保证迁移期间旧入口可控，不因一次性切断导致构建或运行时断裂；
   - 将“路径升级 / API 升级 / i18n key 升级”拆成可分阶段交付的兼容工程。
3. 规划范围：
   - 路由层：`/_authenticated/experimental/**` 与对应前端访问路径
   - API 层：前端 `apiFetch('/experimental/...')` 调用点与后端对应 handler / route
   - 文案层：`experimental.*` i18n key 与其消费点
   - 生成/消费链：权限生成输入、搜索入口、导航 tabs、可能受路径变化影响的 helper
4. 建议兼容策略：
   - 路由：优先采用“新路径上线 + 旧路径重定向”策略，而不是立即移除旧路径；
   - API：优先采用“新接口命名上线 + 旧接口别名兼容”或“前端先切换、后端短期保留旧 alias”策略；
   - i18n：优先采用“新 key 批量替换 + 旧 key 短期保留”策略，避免一次性全量断裂。
5. 风险与注意事项：
   - 这一步会跨越前端路由、后端接口、权限生成、i18n 资源四层，必须分阶段执行；
   - 不应把命名升级顺手扩成业务逻辑重写；
   - 若现有正式入口已被摘除，迁移时必须确保不会因新增别名而意外恢复正式暴露。
6. 建议执行顺序：
   - 第一步：确定新的长期命名语义与目标路径/key 命名空间；
   - 第二步：先实施路由兼容迁移，再补权限/搜索/导航切换；
   - 第三步：实施 API 命名升级与兼容 alias；
   - 第四步：实施 i18n key 迁移；
   - 第五步：在兼容期验证通过后，再考虑移除旧路径/旧 key/旧 alias。
7. 验证预案：
   - 前端：`node scripts/generate-route-tree.mjs`、`node scripts/generate-authenticated-route-catalog.mjs`、`pnpm exec tsc --noEmit`
   - 权限：必要时重跑 action / route permission 相关校验脚本
   - 后端：若接口别名变更，执行对应 handler / routes 定向测试
   - 文案：检查 i18n key 消费点是否全部可解析
8. 当前阶段结论：
   - 本专项应单独分轮执行，不与当前“小范围命名清理”混做；
   - 当前先停在规划，等待用户批准后再进入兼容迁移代码实施。
修改 `action-permission-catalog.ts`。

#### 4) P2：实验 / 沙箱模块长期常驻
- 防止实验模块继续污染正式路由、权限、菜单与构建认知边界。

##### 计划动作
1. 在现有 `experimental` / `logistics-api-sandbox` 盘点基础上，继续扩大到其他实验态目录、调试页、验证页与临时模块。
2. 为每个目标项记录：
   - 当前用途；
   - 真实路由/菜单/权限入口；
   - 最后使用状态；
   - 是否参与构建；
   - 是否有正式模块依赖。
3. 按以下分类给出治理建议：
   - 转正保留；
   - 迁移到独立 `labs` / `sandbox`；
   - 从主路由摘除但保留源码；
   - 确认无依赖后删除。
4. 输出每类动作的前置条件、风险与验证清单。

##### 风险评估
1. 某些实验/沙箱目录可能已经被正式路由承载，直接删除会造成编译或运行时断裂。
2. 看似“临时”的模块可能仍承担排障、演示或运维入口作用，不能未经盘点直接下线。
3. 若命名与定位不清，会继续误导后续开发者把实验态代码当作正式架构的一部分。

##### 验证预案
- 规划阶段：输出资产清单、分类建议与依赖关系。
- 执行阶段（后续审批后）：验证路由入口、菜单可见性、构建/类型检查与受影响页面跳转。

### 分阶段里程碑

#### M1：权限主链可解释
- 交付物：权限快照链路图、单一快照契约草案、风险断点清单。
- 验收标准：能明确回答“谁生产、谁缓存、谁消费、谁刷新、谁裁决”。

#### M2：API 语义可读
- 交付物：命名失真清单、重命名优先级、兼容迁移策略。
- 验收标准：核心权限接口可区分配置、快照、裁决与写语义。

#### M3：生成链可审计
- 交付物：生成链分层图、混合职责节点清单、显式清单化方案。
- 验收标准：关键生成链可回答每一步“唯一职责是什么”。

#### M4：实验边界清晰
- 交付物：实验/沙箱资产表、分类决策表、后续下线/迁正名前置条件。
- 验收标准：正式模块与实验模块边界清晰，不再混淆主链认知。

### 拟修改文件（后续执行时）
当前阶段仅做规划，不进入业务代码修改。待你批准后，预计会优先触达以下范围：

1. `server/authz/**`
2. `server/dependencies/effective_access.go` 及相关权限聚合链路
3. `server/handlers/**`、`server/services/**` 中与权限 API 语义强相关的目标文件
4. `src/features/authz/**`
5. `src/components/layout/**`、相关受保护路由与权限消费入口
6. `scripts/**` 中与权限 contract / 生成链 / 校验链相关的脚本
7. `src/features/experimental/**`、`src/features/logistics-api-sandbox/**` 与其它待盘点实验态目录

### 非破坏性说明
当前阶段仅新增规划文档，不做以下操作：

1. 不修改权限快照生产、缓存或消费逻辑；
2. 不直接重命名权限 API 或调整前后端契约；
3. 不拆生成链、不删除生成产物、不改动路由生成输入；
4. 不删除实验/沙箱目录、不下线路由入口。

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始业务代码修改。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“全局技术债治理”计划后，再进入 Phase 1 执行；
3. 若你要求调整优先级、缩小范围或合并/拆分某项治理目标，应先更新本节再执行；
4. 若排查中发现实际联动面明显大于当前判断，需回到本节补充风险与方案后再继续。

## P2 实验模块兼容迁移改道：直接清理旧 experimental 入口（待确认）

### 需求背景
你已明确要求：旧入口直接清理，不再保留兼容层，以避免后续语义歧义与双入口长期共存。

这意味着本轮方案将从“兼容迁移”切换为“去兼容化清理”：
- 不保留旧 `/experimental/*` 路由壳
- 不保留旧 `/experimental/*` API alias
- 不保留旧 `experimental.*` 作为长期兼容命名空间

该方案属于**明确的破坏性变更**：任何仍依赖旧路径、旧 API、旧 i18n key 的代码或外部入口，都会在本轮后失效。

### 本轮目标
1. 让实验模块只保留一个 authoritative 入口：`/labs/experimental/*`。
2. 让实验模块后端只保留一个 authoritative API 前缀：`/labs/experimental/*`。
3. 让实验模块前端文案只保留一个 authoritative i18n 命名空间：`labExperimental.*`。
4. 清理旧 `experimental` 语义残留，避免未来继续把它误当正式入口。

### 执行范围
#### 1) 路由层
- 删除 `src/routes/_authenticated/experimental/**` 下旧实验模块路由文件。
- 清理所有仍指向 `/experimental/*` 的前端入口与跳转。
- 重新生成 `routeTree.gen.ts`，确保删除后无旧路由残留。

#### 2) API 层
- 删除 `server/routes/routes.go` 中旧 `/experimental/*` 分组。
- 保留并继续使用 `/labs/experimental/*` 分组。
- 全量确认实验模块前端请求已全部切换到新前缀。

#### 3) i18n 层
- 将实验模块页面/组件消费点全部收敛到 `labExperimental.*`。
- 若确认无剩余合法消费者，删除：
  - `src/locales/messages/zh-CN/experimental.ts`
  - `src/locales/messages/en-US/experimental.ts`
  - 以及对应聚合接入

#### 4) 生成产物与引用一致性
- 重新生成路由树与 authenticated route catalog。
- 清理删除旧文件后可能遗留的导入、生成引用和静态搜索入口脏数据。

### 实施顺序
1. 先做只读盘点，确认旧 `experimental` 路由 / API / i18n 的剩余真实引用面。
2. 先删旧路由入口，再生成 route tree，确认前端只剩 `/labs/experimental/*`。
3. 再删旧 API 分组，确保后端只暴露新前缀。
4. 最后删除旧 i18n namespace 与聚合接入，完成语义收口。
5. 执行 `pnpm exec tsc --noEmit` 与必要生成命令。
6. 更新 `walkthrough.md` 记录本轮破坏性变更与验证结果。

### 风险评估
1. 若仍有外部书签、菜单、搜索入口、文档或测试脚本引用旧 `/experimental/*`，本轮后将直接失效。
2. 若仍有后端联调脚本或前端残余调用旧 `/experimental/*` API，本轮后会直接返回 404 或路由未匹配。
3. 若删除旧 `experimental.*` i18n 字典时仍有消费者未迁移，会直接触发编译错误或运行时缺词。
4. 由于这是去兼容化方案，回滚手段只能依赖 Git 或重新恢复旧入口代码，不再有运行期兜底。

### 验证策略
- 静态校验：
  - 全局搜索旧 `/experimental/` 与 `experimental.` 剩余引用
  - 确认只剩明确保留的历史记录或非业务文本
- 生成与编译：
  - `node scripts/generate-route-tree.mjs`
  - `node scripts/generate-authenticated-route-catalog.mjs`
  - `pnpm exec tsc --noEmit`
- 必要时补充定向校验：
  - 实验模块路由入口
  - 实验模块 hooks / 页面
  - locale 聚合入口

### 回滚建议
- 在执行前建议先创建 Checkpoint / Git 提交点。
- 若执行后发现仍有外部旧入口依赖，可整体回滚本轮改动，再改回“分阶段清理”方案。

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始旧入口删除。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“直接清理旧 experimental 入口”方案后，再开始业务代码删除；
3. 若你要求保留部分旧入口（例如只删路由、不删 API），需先回到本节调整范围；
4. 若只读盘点发现旧入口真实引用面明显大于当前判断，需先补充风险再执行。

## P2 下一阶段：residual naming / 文案语义统一（待确认）

### 盘点结论
当前实验模块主链路已完成去兼容化清理，但全仓仍残留若干“命名与文案语义不统一”现象，主要分为三类：

#### 1) 可安全改名
- `src/features/labs/experimental/**` 内部的组件名、函数名、hooks 名、局部类型名仍混有 `LabExperiment` / `LabTests` / `LabReports` / `useLab*` 等多种命名风格。
- `labExperimental` 命名空间中的英文文案仍偏向 `Experimental Center`、`Experimental Equipment` 等旧语义，可统一成更稳定的实验室/实验中心表述。
- 搜索关键词、命令菜单父级描述、局部文案标签存在 “experimental / lab / 实验中心 / test projects” 并存情况，可做低风险统一。

#### 2) 高风险保留
- `routeTree.gen.ts` 中的 `AuthenticatedLabsExperimental*` 命名来自文件路由生成结果，不应手工清理。
- `/labs/experimental/*` 路径本身、后端 `/labs/experimental/*` API 前缀、权限生成输入与 route catalog 相关标识，不应在本轮继续改名。
- `features/sandbox/**` 与后端 `sandbox/**` 属于另一条业务语义线，本轮不与实验模块语义统一任务混做。

#### 3) 非本轮目标
- `use-experimental.ts` 中的 `exp_*` query key、若干既有 `any`、以及非实验模块的历史命名债，不纳入本轮统一，以免扩大为类型治理或缓存键重构。

### 本轮目标
1. 收敛实验模块内部可安全改名的 residual naming。
2. 统一实验模块用户面文案语义，减少 `experimental / lab / test projects` 混杂表述。
3. 保持路由、API、权限、生成链与缓存 key 稳定，不把本轮扩大为协议或架构重命名工程。

### 执行范围
#### 1) 实验模块内部命名收敛
- 目标目录：`src/features/labs/experimental/**`
- 可接受动作：
  - 调整组件/函数/局部类型命名，使其更贴近统一语义
  - 统一页面壳与 tab 工具函数命名风格
- 不做事项：
  - 不改路由文件路径
  - 不改导出契约到会影响外部 import 的程度，除非同步全量调用方且风险明确

#### 2) 文案语义统一
- 目标范围：
  - `src/locales/messages/{zh-CN,en-US}/labExperimental.ts`
  - 搜索入口与菜单父级说明等低风险用户面文案
- 优先统一方向：
  - 中文统一为“实验中心 / 实验设备 / 实验项目 / 实验报告”等稳定表述
  - 英文统一为偏 `Lab / Laboratory` 语义，而非继续混用 `Experimental` / `Test Projects`

#### 3) 保留项
- 不改 `routeTree.gen.ts` 生成命名
- 不改 `/labs/experimental/*` authoritative path
- 不改后端 handler 名与数据库字段
- 不触碰 `sandbox` 业务线

### 风险评估
1. 若对外部可见导出名改动过大，可能引入 import 断裂。
2. 若文案统一时误触 `TranslationKey` 契约边界，可能造成组件 key 与 locale 不一致。
3. 若把 query key、权限 ID、路径字符串一起改动，会把低风险文案统一任务扩大成运行时行为改造。

### 验证策略
- `pnpm exec tsc --noEmit`
- 全局搜索确认：
  - 旧语义残留是否仅剩明确保留项
  - 是否误触高风险路径/API/权限标识
- 必要时补充生成或定向搜索校验

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始 residual naming 改名。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“residual naming / 文案语义统一”方案后，再开始业务代码修改；
3. 若你希望扩大范围到 query key、权限 ID 或 sandbox 命名，需先回到本节补充风险后再执行。

## P2 下一子阶段：实验模块内部剩余命名债清理（待确认）

### 目标背景
在完成实验模块 residual naming / 文案语义统一后，实验模块内部仍残留一批“非用户面、但影响长期可读性”的命名债，主要集中在：
- `src/features/labs/experimental/hooks/use-experimental.ts`
- `src/features/labs/experimental/**` 内部的 `Lab* / Experimental*` 混合命名
- 局部类型名、工具函数名与组件导出名之间的风格不一致

你当前要求进一步清理这些内部命名债，因此本轮目标是**只做内部命名收敛**，不再触碰对外契约边界。

### 本轮目标
1. 收敛实验模块内部 hooks、组件、局部类型与工具函数命名。
2. 减少 `use-experimental.ts` 与 `useLab*` / `Lab*` / `Experimental*` 混杂并存。
3. 保持路径、API 前缀、权限 ID、query key、生成链与翻译 key 不变。

### 执行范围
#### 1) hooks / 工具函数命名
- 目标文件：`src/features/labs/experimental/hooks/use-experimental.ts` 及其调用方
- 可接受动作：
  - 重命名文件内导出函数名
  - 重命名局部 helper 与返回对象命名
  - 统一与 `LabExperimental` 语义对齐
- 不做事项：
  - 不改 query key（如 `exp_*`）
  - 不改 API 路径

#### 2) 页面 / 组件 / 类型命名
- 目标目录：`src/features/labs/experimental/**`
- 可接受动作：
  - 统一组件导出名
  - 统一局部类型名与函数名
  - 同步更新 import / export 调用方
- 不做事项：
  - 不改文件夹路径
  - 不改路由路径
  - 不改 locale key

### 风险评估
1. 若改动导出名但遗漏调用方，可能直接引发 TypeScript 编译错误。
2. 若把内部命名治理误扩到 query key、路径或权限标识，会把低风险命名清理扩大为运行时行为改造。
3. 若顺手重命名文件路径，会波及 route tree 与 import 面，超出本轮边界。

### 验证策略
- `pnpm exec tsc --noEmit`
- 全局搜索确认旧内部命名是否只剩明确保留项
- 不额外触发生成链，除非发现 import / route 侧确有联动需要

### 保留项
- `exp_*` query key 保留
- `/labs/experimental/*` 路径保留
- `/labs/experimental/*` API 前缀保留
- `labExperimental.*` locale key 保留

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始内部命名改名。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“实验模块内部剩余命名债清理”方案后，再开始业务代码修改；
3. 若你希望扩大到 query key、路径、API 或权限命名，需要先回到本节补充风险后再执行。

## P2 下一子阶段：实验模块 hooks 文件名收敛（待确认）

### 目标背景
在完成实验模块内部 hooks 导出名与调用方命名收敛后，`src/features/labs/experimental/hooks/use-experimental.ts` 文件名本身仍保留旧语义。当前你要求继续把该文件名一并收敛，使文件路径与导出语义一致。

### 本轮目标
1. 将 `use-experimental.ts` 重命名为更符合当前 `LabExperimental` 语义的文件名。
2. 同步迁移所有引用该文件的 import 路径。
3. 保持导出名、query key、路径、API、权限与 locale key 不变。

### 执行范围
- 目标文件：`src/features/labs/experimental/hooks/use-experimental.ts`
- 调用方范围：`src/features/labs/experimental/**` 及其他实际 import 该文件的前端代码
- 可接受动作：
  - 新建目标文件名并迁移原内容
  - 删除旧文件引用并切换 import
- 不做事项：
  - 不改导出函数名
  - 不改 query key
  - 不改 API 路径
  - 不改 hooks 运行时行为

### 风险评估
1. 若 import 路径切换不完整，会直接触发 TypeScript 编译错误。
2. 若误把本轮扩大为导出名或类型重构，会偏离“仅文件名迁移”的边界。
3. 若存在未搜索到的跨目录调用方，需要靠全局搜索和编译校验兜底。

### 推荐文件名
- 推荐目标：`use-lab-experimental.ts`

理由：
- 与当前导出名 `useLabExperimental*` 一致；
- 保持 kebab-case 风格；
- 不再保留旧 `experimental` 单独语义中心。

### 验证策略
- `pnpm exec tsc --noEmit`
- 全局搜索确认旧 `../hooks/use-experimental` 与对应绝对路径 import 不再残留

### 保留项
- `useLabExperimental*` 导出名保持不变
- `exp_*` query key 保留
- `/labs/experimental/*` 路径与 API 前缀保留
- `labExperimental.*` locale key 保留

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始 hooks 文件重命名。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“实验模块 hooks 文件名收敛”方案后，再开始业务代码修改；
3. 若你希望同时处理类型债或导出名再收敛，需要先回到本节补充风险后再执行。

## P2 下一子阶段：`use-lab-experimental.ts` 单文件 any 类型治理（待确认）

### 目标背景
当前实验模块 hooks 文件 `src/features/labs/experimental/hooks/use-lab-experimental.ts` 内仍存在多处 `any`，已被 IDE / ESLint 标记。你当前明确要求：**只处理该文件内的 `any`，不扩散到别的模块**。

### 本轮目标
1. 消除 `use-lab-experimental.ts` 内可安全替换的 `any`。
2. 为 query 返回值、mutation 入参与局部数据结构补充最小必要类型。
3. 保持 query key、API、路径、导出名与运行时行为不变。

### 执行范围
- 仅限：`src/features/labs/experimental/hooks/use-lab-experimental.ts`
- 可接受动作：
  - 为 `useQuery` 返回值补充局部接口/类型别名
  - 为 mutation `data` 入参补充最小结构类型
  - 在单文件内新增必要的局部类型声明
- 不做事项：
  - 不改其他模块文件
  - 不改页面层类型
  - 不改 API 协议字段命名
  - 不改 query key / 路径 / 权限 / locale key

### 风险评估
1. 若把类型收得过紧，可能与后端真实返回结构不一致，导致调用方编译报错。
2. 若顺手向页面或 schema 文件扩散，会超出本轮“单文件治理”边界。
3. 若缺乏后端严格契约，只能采用“最小约束类型”，避免制造伪精确类型。

### 实施策略
1. 优先使用最小局部类型：
   - 任务列表响应使用 `items?: unknown[]` 或更贴近现有调用的轻量结构；
   - 报告列表使用最小对象数组类型；
   - mutation 入参按当前使用方式定义可选字段结构。
2. 若某处暂无法安全精确建模，优先使用 `unknown` + 局部窄化，而不是继续保留 `any`。

### 验证策略
- `pnpm exec tsc --noEmit`
- 如有必要，对该文件做定向 lint / 搜索确认 `any` 已清空或仅剩明确保留项

### 保留项
- 修改范围仅限 `use-lab-experimental.ts`
- `exp_*` query key 保留
- `/labs/experimental/*` 路径与 API 前缀保留
- `useLabExperimental*` 导出名保留

### 当前状态与暂停点
本节当前仅为审批稿，尚未开始单文件类型治理。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“`use-lab-experimental.ts` 单文件 any 类型治理”方案后，再开始业务代码修改；
3. 若你希望扩大到页面层、schema 或其他模块，需要先回到本节补充风险后再执行。

## 总专项：生产上线主链技术债治理（第一批：仅认证 / 用户 / 权限链，待确认）

### 目标背景
当前仓库已完成若干局部治理：权限生成链收口、实验模块常驻治理、局部命名与类型清理、users / auth snapshot / approval 链路语义升级等。但从“正式生产上线”视角看，真正的全局主战场不应继续停留在实验模块或局部命名清理，而应转向**正式生产主链**的契约、类型、边界、生成链与文档基线治理。

本总专项第一批的目标，是先围绕**认证 / 用户 / 权限链**建立可长期维护的稳定基线，降低上线后因接口语义漂移、职责混杂、前端误判权、生成链失配、文档失真而引发的持续性维护成本。审批 / 工作流 / 交易 / 主数据配置链暂不纳入本批次。

### 本轮范围（第一批仅纳入认证 / 用户 / 权限链）
#### 纳入范围
- 认证 / 会话 / 身份快照链
- 用户 / 角色 / 权限链
- 与上述正式主链直接相关的前端 service / hooks / 页面消费边界
- 与认证 / 用户 / 权限链直接相关的权限生成、路由 catalog、action binding、校验脚本等生成链 / 配置链

#### 明确保留 / 暂不纳入
- `src/features/labs/experimental/**` 实验模块
- `src/features/sandbox/**` 与后端 `sandbox/**`
- 审批 / 工作流 / 交易主链
- 主数据 / 字典 / 系统配置链
- 单纯文案统一、局部命名美化、低风险 UI 清洁度问题
- 不影响正式生产主链的历史兼容路径清理

### 总体治理目标
1. 让认证 / 用户 / 权限链中的接口语义、分页契约、options 契约、patch / replace / snapshot 语义稳定下来。
2. 让前端消费层从“页面自行猜结构”收敛为“service 层提供稳定 contract，hooks 与页面按稳定类型消费”。
3. 固化“服务端为最终权限裁决来源，前端不做终局判权”的正式边界。
4. 收敛认证 / 用户 / 权限链相关生成输入、生成产物、运行时消费与校验脚本之间的关系。
5. 建立适合长期上线维护的文档基线，避免历史文档继续失真。

### 认证快照入口策略（本批次明确拍板）
- 正式唯一入口：`GET /auth/snapshot`
- 旧入口：`GET /profile`
- 处理策略：**直接删除旧入口，不保留兼容**

原因：
- `/profile` 语义与当前返回的“身份 + 角色 + 权限快照”不一致；
- 若继续保留双入口，会持续制造“哪个才是权威入口”的认知漂移；
- 本批次既然以认证 / 用户 / 权限链为主战场，就应一次性收敛认证快照正式入口。

### 分阶段实施方案
#### 第一阶段：正式生产主链接口契约与类型收口
优先链路：
- 认证 / 会话 / 身份快照
- 用户 / 角色 / 权限

主要动作：
- 盘点接口语义漂移点：
  - 分页结构
  - options 轻量接口
  - patch / replace 语义
  - snapshot / profile 语义
- 删除 `GET /profile`，仅保留并切齐 `GET /auth/snapshot`
- 收敛前端 service 层响应类型与请求 payload 类型
- 减少页面层重复局部类型与结构猜测

目标结果：
- 认证 / 用户 / 权限链形成“接口契约 -> service 类型 -> hooks 消费 -> 页面承接”的稳定单向流。

#### 第二阶段：正式生产权限与职责边界收口
主要动作：
- 固化权限边界：
  - 服务端负责最终裁决
  - 前端负责展示、提示、状态承接
- 收敛职责边界：
  - 前端：service / hook / page / component
  - 后端：handler / service / repository
- 清理仍可能诱导误用的旧命名、旧注释与旧约定

目标结果：
- 认证 / 用户 / 权限链不再继续回漂到“前端假守卫 / 跨层混杂 / 页面补协议”的状态。

#### 第三阶段：正式主链生成链 / 配置链 / 校验链稳定化
主要动作：
- 收敛并核对：
  - route catalog
  - permission contract
  - action routeBindings
  - default permissions 与运行时查询接口（仅限认证 / 用户 / 权限链直接相关部分）
- 增强 verify / closure / 定向搜索校验

目标结果：
- 生成输入、生成产物、运行时消费和人工理解之间的偏差可被脚本提前发现，而非上线后暴露。

#### 第四阶段：文档基线与上线治理总结
主要动作：
- 区分当前执行文档与长期架构基线文档
- 降低 `walkthrough.md` 承担全部历史语义的压力
- 输出本轮正式主链治理的保留项、风险项和后续索引

目标结果：
- 文档不再只是一份不断堆叠的流水账，而成为稳定决策基线的一部分。

### 风险评估
1. 若一次性铺得过大，可能把“总专项规划”直接做成多线并发重构，增加回归风险。
2. 若未区分正式生产主链与实验 / sandbox / 历史兼容线，容易再次分散主战场。
3. 若类型或契约收得过紧，而没有结合真实后端返回结构，可能制造伪精确类型并引发回归。
4. 若权限边界治理重新回到前端本地判权路线，会违背既定基线。
5. 若文档不分层，后续即使代码治理完成，也会再次因为历史描述漂移而被带偏。
6. **直接删除 `GET /profile` 属于破坏性变更**：若仓库内或外部仍有旧调用方，将在运行时直接失败，必须通过全局搜索、测试与定向验证确认无残留。

### 验证策略
- `pnpm exec tsc --noEmit`
- 视阶段补充：
  - 定向 `eslint`
  - 定向 `vitest`
  - 定向 `go test`
  - 生成脚本执行与 closure / contract 校验
  - 定向搜索确认旧语义残留仅存在于明确保留项

### 本轮治理原则
- 优先处理认证 / 用户 / 权限链，不再被实验模块或局部命名清洁度牵走主线。
- 优先处理契约、边界、类型、生成链这类“影响上线稳定性”的核心问题。
- 遇到会扩大为跨系统重构的改动，必须拆分子阶段并再次回到审批。

### 当前状态与暂停点
本节当前仅为缩范围后的总审批稿，尚未开始认证 / 用户 / 权限链技术债治理。根据既定流程：

1. 已先完成 `task.md` 与 `implementation_plan.md` 更新；
2. 需等你明确批准本轮“生产上线主链技术债治理（第一批：仅认证 / 用户 / 权限链）”后，再进入正式代码治理；
3. 审批 / 工作流 / 交易 / 主数据配置链将作为后续批次单独回到审批，不在本批次内执行。

## 真实链路回归专项：角色矩阵 -> 新增用户 -> 登录访问范围（待确认）

### 需求背景
当前角色 / 权限链的 contract 已完成一轮收口，但这还不足以证明真实业务链已经闭环。要确认修复真正站住，必须把以下三段链路串起来验证：

1. 在角色矩阵中修改部门角色权限；
2. 在用户新增流程中绑定该部门角色；
3. 在登录后身份快照 / 有效权限解析链中看到真实访问范围变化。

本轮目标是做**高价值真实链路回归**，而不是继续页面文案清理或局部 lint 收尾。

### 本轮目标
1. 证明角色矩阵勾选权限后，后端持久化与回读 contract 一致。
2. 证明新增用户绑定部门角色时，不会再出现“所属部门角色未配置/无法保存”的伪通过或伪失败。
3. 证明登录后的真实访问范围来自服务端角色权限解析结果，而不是前端本地推导。

### 范围边界
#### 纳入范围
- 前端：
  - `src/features/system-mgmt/hooks/use-roles.ts`
  - `src/features/system-mgmt/services/role-service.ts`
  - `src/features/system-mgmt/tabs/index.tsx`
  - `src/features/users/components/users-action-dialog.tsx`
  - `src/features/users/hooks/use-users-action-dialog-sync.ts`
  - `src/features/authz/services/effective-permission-service.ts`
- 后端：
  - `server/handlers/role_handlers.go`
  - `server/handlers/users.go`
  - `server/handlers/auth.go`
  - `server/dependencies/effective_access.go`
  - 鉴权相关 middleware / contract regression tests

#### 明确排除项
- 不发起前端路由硬拦截改造。
- 不把前端页面状态改成权限裁决源。
- 不顺手扩展到审批、交易、实验模块或其它业务链路。

### 分阶段实施方案
#### 第一阶段：角色矩阵改权限回归
主要验证点：
- `applyPermissionTreeToggle` 提交后的 payload 与后端 contract 一致；
- `RoleService.upsertRole` 返回结构化 `permissions: string[]`；
- `GetRolesHandler` 再读取时仍是同一套稳定权限集；
- `org_<dept>` 家族角色的权限解析仍由后端统一收口。

可能动作：
- 补前端 service / hook 定向回归；
- 补后端 handler regression，覆盖“改后再读”一致性。

#### 第二阶段：新增用户绑定部门角色回归
主要验证点：
- 选择员工后可正确匹配 `org_<dept>` 角色；
- 缺失部门角色时，保存前明确报错并阻断；
- 创建用户后实际落库 role 标识与部门角色 contract 一致。

可能动作：
- 补 `use-users-action-dialog-sync` / `users-action-dialog` 行为回归；
- 补用户创建 handler 的定向 contract regression。

#### 第三阶段：登录后真实访问范围验证
主要验证点：
- `/auth/snapshot` 返回的 permissions 随部门角色权限变化而变化；
- `ResolvePermissionsForRole` / `ResolveEffectiveAccessProfileForUser` 对部门角色家族仍正确合并；
- middleware / auth handler 读取到的是服务端真实权限结果。

可能动作：
- 补后端 effective access / auth snapshot regression；
- 必要时补前端 `effective-permission-service` 的消费验证。

#### 第四阶段：统一验证与文档整理
执行：
- `pnpm exec tsc --noEmit`
- 定向 `vitest`
- 定向 `go test`
- 更新 `walkthrough.md` 记录真实链路验证结果、边界与保留项。

### 风险评估
1. 若把真实链路回归直接做成 E2E 大工程，范围可能迅速失控。
2. 若只验证页面展示而不验证身份快照 / effective access，仍可能漏掉真正上线风险。
3. 若在本轮重新引入前端本地兜底或权限守卫，会违背既定“后端为事实来源”的基线。
4. 若过度扩展到登录 UI、路由跳转、外部页面访问控制，可能从定向回归演变为权限体系重构。

### 验证策略
- 前端：
  - `pnpm exec tsc --noEmit`
  - 定向 `vitest`：role / users / authz 相关测试
- 后端：
  - 定向 `go test ./handlers ./dependencies ...`
  - 必要时补 auth / middleware / effective access 相关回归
- 搜索校验：
  - 确认本轮没有重新引入前端静默兜底或旧 `/profile` 依赖

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已完成 `task.md` 与 `implementation_plan.md` 更新；
2. 在你明确批准前，不开始真实链路回归的代码修改与测试补强；
3. 你批准后，我将按“角色矩阵 -> 新增用户 -> 登录访问范围”顺序推进，并保持每一阶段都可独立验证。

## 权限核心逻辑抽离专项（待确认）

### 问题判断
当前权限问题之所以反复出现，不像是单个 bug，而更像是**同一条规则在多层被重复解释**：

- 后端 `dependencies/effective_access.go`
  - 负责：部门角色族解析、effectiveRoles 聚合、permissions 合并、menu scope 扩展；
- 后端 `handlers/auth.go`
  - 在 snapshot 输出阶段再次做 permissions fallback；
- 后端 `middleware/auth.go` / `middleware/authorization.go`
  - 在请求上下文注入阶段再次做 permissions fallback 与 role/permission 展开；
- 后端 `handlers/role_handlers.go`
  - 在角色读取时又通过 `ResolvePermissionsForRole` 生成展示 contract；
- 前端 `use-users-action-dialog-sync.ts`
  - 自己根据 `employee.deptId -> org_<dept>` 解析绑定角色；
- 前端 `role-resolver.ts`
  - 页面显示层又重新解释“用户 role 与部门角色”的关系。

这意味着：
1. 写侧和读侧没有彻底分离；
2. 权限裁决链和显示解释链没有被强制隔离；
3. fallback 太多，导致任何一层都可能在补前一层的漏洞；
4. 一旦 contract 有轻微漂移，多处逻辑都会同时失真。

### 抽离目标
本专项不是抽 UI，而是抽出**权限核心逻辑单源**，让后端成为唯一权威解释器，并让前端只做有限职责消费。

目标是形成以下单向链路：

`User + Employee + Role Records`
-> `Permission Core Resolver`
-> `EffectiveAccessProfile / Auth Snapshot / Role Contract`
-> `Frontend Service Contract`
-> `Frontend Display Only`

### 核心设计方向
#### 1) 后端建立单一权限核心解析入口
建议抽出一个明确的核心服务，例如：
- `server/authz/effective_access_resolver.go`
  或
- `server/services/access_profile_service.go`

由它统一负责：
- 主角色解析
- `org_<dept>` 部门角色族解析
- effectiveRoles 生成
- permissions 合并
- menu scope 扩展

并要求以下消费者全部只调它：
- `GetAuthSnapshotHandler`
- `middleware/auth.go`
- `middleware/authorization.go`
- `GetRolesHandler` 中任何需要派生 permissions 的地方

#### 2) 后端禁止多处 fallback 重复解释
本轮要明确禁止：
- snapshot 自己再拼 permissions
- middleware 再次自行推 permissions
- handler 各自再兜底部门角色族

允许存在的 fallback 只能在**单一核心服务内部**，且必须可测试、可追踪。

#### 3) 前端严格区分写侧与读侧
前端建议拆成两类职责：

- 写侧：
  - `useRoles`
  - `RoleService`
  - `use-users-action-dialog-sync`
  - 只负责提交 role id / permissions 变更、部门角色选择与表单联动；

- 读侧：
  - `effective-permission-service`
  - `users-table`
  - `role-resolver`
  - 只消费后端已确定的 contract / snapshot / display info；

前端不允许再自己“推导真实有效权限”，最多只允许：
- 绑定表单时根据员工部门匹配 `org_<dept>` role id
- 页面展示时解释标签和 drift 状态

#### 4) 显示解释层不得参与权限裁决
`role-resolver.ts` 这种文件应被明确降级为：
- display-only resolver
- 仅用于文案、标签、drift 提示

不得再被用于：
- 真实权限裁决
- 路由准入决定
- auth snapshot 替代来源

### 分阶段实施方案
#### 第一阶段：证据化梳理与核心 API 设计
- 盘点所有重复解析点与 fallback 点；
- 定义单一核心服务输入/输出模型；
- 明确哪些现有函数保留、哪些变为 wrapper、哪些删除。

#### 第二阶段：后端核心收口
- 将 effective access、snapshot、middleware、role contract 的派生逻辑都改为调用单一核心；
- 删除重复 fallback；
- 补后端回归测试，锁住单源行为。

#### 第三阶段：前端消费边界收口
- 将前端写侧/读侧职责切开；
- 禁止页面或 hook 再本地推导有效权限；
- 保留最小 display-only resolver。

#### 第四阶段：真实链路回归
- 在抽离完成后再执行：
  - 角色矩阵改权限
  - 新增用户绑定部门角色
  - 登录后访问范围验证

### 风险评估
1. 若不先抽离核心而直接继续加回归测试，只会把当前混乱结构“测试固化”。
2. 若抽离时误把 display resolver 也当成权限核心，可能再次把页面逻辑抬升为事实来源。
3. 若后端核心服务与现有 middleware/context 注入脱节，可能导致登录后 snapshot 与接口鉴权结果不一致。
4. 若一次性连前端页面和后端鉴权一起大改，范围会过大，必须分阶段推进。

### 验证策略
- 设计阶段：
  - 全局搜索确认重复解析点；
  - 输出“唯一权威入口 + 只读消费者 + display-only 层”边界图；
- 实施阶段（待批准后）：
  - `go test`：effective access / auth / role handlers / users handlers
  - `pnpm exec vitest`：role / users / authz 相关
  - `pnpm exec tsc --noEmit`
  - 最后再做真实链路回归验证

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已完成权限核心逻辑散落点盘点；
2. 已确认本轮优先级应从“继续补丁式回归”切换为“先抽离权限核心逻辑”；
3. 在你明确批准前，不开始核心逻辑抽离的代码修改；
4. 你批准后，我会先做后端核心收口设计，再推进前端消费边界收口，最后才回到真实链路回归。

## `use-roles.ts` 专项收口方案（审批稿）

### 背景与问题判断
在完成后端权限核心收口与前端 snapshot/page 消费链验证后，当前仍识别出一个高风险冗余点：

- `src/features/system-mgmt/hooks/use-roles.ts`

该文件目前同时承担了两类职责：

1. **后端 contract 消费职责**
   - 加载角色列表；
   - 保存角色权限；
   - 提供角色矩阵交互入口。

2. **前端本地权限解释职责**
   - 祖先/后代权限自动扩展；
   - 默认权限补齐；
   - admin / superadmin 全量权限补齐；
   - 加载后对 `role.permissions` 做本地二次归一化。

这意味着角色矩阵页面仍然保留了一套前端本地“权限解释器”，与“后端作为唯一事实来源”的目标冲突。

### 本轮目标
将 `use-roles.ts` 明确拆为两层：

#### 1) 展示树辅助层（display/tree assist）
仅负责：
- 权限树父子关系查询；
- UI 勾选联动辅助；
- 显示排序；
- 页面展示态的临时计算。

不得负责：
- 生成最终持久化 contract；
- 对后端返回的 `role.permissions` 做“真实权限集合”重写；
- 以默认权限 / admin 补齐作为事实来源。

#### 2) 后端 contract 消费层（contract consumer）
仅负责：
- 加载后端返回的角色及其真实 `permissions`；
- 提交用户在矩阵中的显式修改结果；
- 保持前端状态与后端 contract 一致。

不得负责：
- 加载时自动扩展成另一套“完整权限集合”；
- 在保存前偷偷补齐默认权限；
- 用前端规则替代后端对 admin/org 角色的解释。

### 计划改动文件
优先涉及：

- `src/features/system-mgmt/hooks/use-roles.ts`
- 可能新增：
  - `src/features/system-mgmt/hooks/use-role-permission-tree.ts`
  - 或 `src/features/system-mgmt/utils/role-permission-tree.ts`
- 可能配套检查：
  - `src/features/system-mgmt/services/role-service.ts`
  - 角色矩阵 tabs / components 中对 `role.permissions` 的消费点
  - 现有 `use-roles` 测试或新增专项测试文件

### 具体实施思路
#### 第一步：拆分纯 UI 辅助逻辑
- 将祖先/后代节点收集、排序、树联动辅助移出 `use-roles.ts`；
- 新文件只提供“显示树辅助”能力，不直接定义最终持久化权限集合。

#### 第二步：移除 contract 层本地补齐
- 去掉加载后对 `role.permissions` 的 `normalizeRolePermissions(...)` 式改写；
- 去掉默认权限补齐作为真实 contract 的来源；
- 让 `setRoles(...)` 保留后端真实返回值。

#### 第三步：限制保存 payload 的语义
- 角色矩阵交互可以用树辅助逻辑帮助用户勾选；
- 但最终提交给 `RoleService.upsertRole(...)` 的权限集合必须是定义清晰、可追踪的 contract 集合；
- 不允许“为了页面方便”继续把前端补出的祖先/后代/默认项混入事实层而无边界说明。

### 风险评估
1. 若直接删除树辅助逻辑，可能导致当前角色矩阵的勾选体验下降；
2. 若拆分不彻底，可能只是把相同冗余逻辑换到另一个文件，未真正解决问题；
3. 若保存 payload 语义界定不清，可能导致页面显示与后端存储再次漂移；
4. admin / superadmin 在 UI 上的全量勾选展示与真实 contract 之间需要明确边界，否则容易再次引入“展示即事实”。

### 验证策略
- 代码层：
  - 全局搜索确认前端不再存在第二套角色权限持久化解释；
  - 重点检查 `use-roles.ts`、`RoleService`、角色矩阵组件。
- 测试层：
  - 补 `use-roles` / 角色矩阵专项回归；
  - 覆盖“加载 -> 勾选 -> 保存 -> 重新加载”链路；
  - 验证后端返回值不会在前端加载阶段被偷偷扩展成另一套 contract。
- 命令验证：
  - `pnpm exec vitest run ...`
  - `pnpm exec tsc --noEmit`

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已确认 `use-roles.ts` 是当前最主要的前端冗余解释点；
2. 已明确本轮目标是“展示树辅助”与“后端 contract 消费”分层；
3. 在你明确批准前，不开始本专项业务代码修改；
4. 你批准后，我会先拆分 `use-roles.ts`，再补回归测试，最后更新 `walkthrough.md`。

## `effectiveRoles / role` snapshot 兼容链专项收严方案（审批稿）

### 背景与问题判断
在完成后端权限核心收口、前端 snapshot/page 消费链验证，以及 `use-roles.ts` 专项收口后，当前剩余的主要弱冗余集中在 snapshot contract 的角色字段兼容层：

- 后端：`server/handlers/auth.go`
- 前端登录写入：`src/features/auth/sign-in/components/user-auth-form.tsx`
- 前端 snapshot 同步：`src/features/authz/services/effective-permission-service.ts`
- 前端 snapshot 读取工具：`src/features/authz/core/access-snapshot.ts`

这些位置目前仍存在“优先读 `effectiveRoles`，缺失时回退 `role`”的兼容逻辑。它们不再主导权限裁决，但仍让 `role` 留在角色事实链中，影响 contract 纯度。

### 本轮目标
将 snapshot 角色 contract 收严为：

#### 1) `effectiveRoles` 成为主事实来源
适用于：
- 后端 `/auth/snapshot`
- 前端登录后内存身份写入
- 前端 snapshot 同步服务
- 前端 snapshot 读取工具

要求：
- 页面 / hooks / service 的主消费路径优先只依赖 `effectiveRoles`
- `role` 不再继续充当常规事实来源

#### 2) `role` 降级为过渡兼容字段
允许：
- 在必要兼容期间保留输出或解析能力
- 仅用于老链路过渡或 display 兼容

不得：
- 继续在主链中与 `effectiveRoles` 并列充当角色事实来源
- 继续成为 snapshot 读取工具的默认常态回退来源而无边界说明

### 计划改动文件
优先涉及：

- `server/handlers/auth.go`
- `src/features/auth/sign-in/components/user-auth-form.tsx`
- `src/features/authz/services/effective-permission-service.ts`
- `src/features/authz/core/access-snapshot.ts`
- 可能配套测试文件：
  - `server/handlers/users_contract_regression_test.go`
  - `src/features/authz/services/effective-permission-service.test.ts`
  - 新增 `access-snapshot` 或登录链专项测试

### 具体实施思路
#### 第一步：收严后端 snapshot 输出
- 复查登录响应和 `/auth/snapshot` 当前字段语义；
- 尽量减少 handler 内对 `effectiveRoles <- role` 的兼容回填；
- 明确后端上下文中 `effectiveRoles` 缺失属于异常，而不是常态。

#### 第二步：收严前端写入与读取
- 登录成功时，前端内存 user 的角色集合优先使用 `effectiveRoles`；
- `effective-permission-service.ts` 优先只以 `effectiveRoles` 更新角色集合；
- `access-snapshot.ts` 的 `getSnapshotEffectiveRoleIds(...)` 限制 `role` fallback 的使用范围。

#### 第三步：补回归测试
- 后端：锁住 snapshot 的 `effectiveRoles` 主来源行为；
- 前端：锁住登录写入、snapshot 同步、snapshot 读取工具均以 `effectiveRoles` 为主；
- 验证在兼容保留期间，不会重新把 `role` 抬升为事实来源。

### 风险评估
1. 若收严过快，而某些老接口或缓存数据仍只提供 `role`，可能导致前端短期角色为空；
2. 若后端上下文某些链路仍未稳定注入 `effectiveRoles`，收严后会暴露隐性缺陷；
3. 若前端 display 层仍混用 `role` 与 `effectiveRoles`，可能出现标签展示漂移；
4. 若测试只覆盖 service 层、不覆盖 handler contract，可能放过后端兼容回退残留。

### 验证策略
- 代码层：
  - 全局搜索 `effectiveRoles` / `role` 的主读取点；
  - 明确哪些地方仍允许兼容、哪些地方必须切到单源。
- 测试层：
  - `go test`：`auth` / `users_contract` 相关；
  - `vitest`：登录写入、`effective-permission-service`、`access-snapshot`；
  - `pnpm exec tsc --noEmit`。

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已确认当前剩余最值得继续收的弱冗余，是 `effectiveRoles / role` snapshot 兼容链；
2. 已明确本轮目标是让前后端主链优先只消费 `effectiveRoles`；
3. 在你明确批准前，不开始本专项业务代码修改；
4. 你批准后，我会先收严 snapshot contract，再补回归测试，最后更新 `walkthrough.md`。

## compatibility-only 边界收口方案（审批稿）

### 背景与问题判断
在完成后端权限核心收口、前端 snapshot/page 消费链验证、`use-roles.ts` 专项收口以及 `effectiveRoles / role` 主链收严后，当前剩余项已经不再属于权限事实来源，而主要是三类尾部保留逻辑：

1. **compatibility wrapper**
   - `src/features/authz/core/access-snapshot.ts` 中的 `getSnapshotRoleIds(...)`
   - `src/features/authz/utils/auth-session.ts`

2. **login resilience / compatibility**
   - `src/features/auth/sign-in/components/user-auth-form.tsx`
   - 登录成功后的最小身份写入与 snapshot 同步失败处理

3. **display / UX assist 残留**
   - 这部分当前已确认不再属于权限事实链，本轮不再扩大范围去动 display-only resolver 或表单预填逻辑。

本轮目标不是继续改权限裁决，而是把这些剩余尾部逻辑进一步压缩为更明确的 compatibility-only 边界，避免未来再次被误用为事实来源。

### 本轮目标
#### 1) 明确 compatibility-only 读取边界
适用于：
- `getSnapshotRoleIds(...)`
- `auth-session.ts`

要求：
- 这些工具仅用于宽兼容读取、过渡期辅助或非主链展示；
- 不再允许新主链逻辑依赖它们决定有效角色；
- 如果可以，进一步减薄 wrapper 或通过命名/导出边界强调其 compatibility-only 属性。

#### 2) 明确 login fallback / resilience 边界
适用于：
- 登录成功后的最小身份写入
- snapshot 同步失败时的兜底处理

要求：
- 仅承担稳定性与过渡职责；
- 不再让 fallback 逻辑混入角色事实链；
- 明确“主链失败时的保底”与“主链正常时的事实来源”之间的边界。

### 计划改动文件
优先涉及：

- `src/features/authz/core/access-snapshot.ts`
- `src/features/authz/utils/auth-session.ts`
- `src/features/auth/sign-in/components/user-auth-form.tsx`
- 可能配套：
  - `src/features/authz/core/access-snapshot.test.ts`
  - 新增 `auth-session` 或登录链专项测试
  - 现有 `effective-permission-service.test.ts`

### 具体实施思路
#### 第一步：压缩 compatibility wrapper
- 复查 `getSnapshotRoleIds(...)` 的真实调用点；
- 若其只剩兼容用途，则通过命名/导出收窄边界，避免被新逻辑误用；
- `auth-session.ts` 同理，只保留必要 wrapper，不再扩大语义。

#### 第二步：压缩登录链 fallback
- 复查登录成功后先写最小身份、再 sync snapshot 的链路；
- 评估 snapshot 同步失败时的 `processAndNotifyPermissions(...)` 是否还能进一步下沉为 resilience-only；
- 保留必要稳定性，但让代码表达更清楚：这是保底，不是事实来源。

#### 第三步：补测试锁边界
- 补 compatibility-only 边界专项测试；
- 锁住这些函数/流程不会重新被主链抬升为角色事实来源；
- 保证 `effectiveRoles` 主链仍不被回退污染。

### 风险评估
1. 若收口过度，可能影响少量仍依赖宽兼容读取的旧页面或旧调用点；
2. 若只改命名不补测试，后续仍可能被误用；
3. 若把登录链 resilience 收得太狠，可能削弱异常场景下的用户可恢复性；
4. 若在本轮误触 display/UX assist 范围，可能不必要扩大改动面。

### 验证策略
- 代码层：
  - 全局搜索 `getSnapshotRoleIds(...)`、`getAuthSessionRoleIds(...)`、登录链 fallback 调用点；
  - 确认主链读取仍只认 `effectiveRoles`。
- 测试层：
  - `vitest`：`access-snapshot` / `auth-session` / 登录相关轻量测试；
  - `pnpm exec tsc --noEmit`。

### 当前状态与暂停点
本节已执行完成，结论如下：

1. 已确认当前剩余项已全部降级到 compatibility / display / UX assist 层；
2. 已完成 `getSnapshotRoleIds(...)`、`auth-session.ts`、登录链 fallback/resilience 三个尾部点的边界收口；
3. 已补测试并完成 `walkthrough.md` 记录；
4. 当前该专项无需继续追加实现，除非后续审计发现新的弱冗余残留点。

## 系统管理重复账号 TAB 下线 + 路由重定向方案（已完成）

### 背景与问题判断
当前已确认：

- `/personnel/accounts`
- `/system-management/accounts`

这两个路由都直接渲染同一个 `Users` 页面：

- `src/routes/_authenticated/personnel/accounts.tsx`
- `src/routes/_authenticated/system-management/accounts.tsx`

它们共享：
- 相同的 search schema；
- 相同的 `Users` 组件；
- 相同的查询 / mutation / 缓存键；
- 相同的底层账号列表业务逻辑。

因此，系统管理中的“用户账号”TAB 当前不是独立功能，而是后期残留的重复入口壳。继续保留会造成：

1. 信息架构混乱；
2. 用户误以为两个入口有不同职责；
3. 后续开发容易误在重复入口上叠加额外逻辑，再次制造分叉。

### 本轮目标
#### 1) 信息架构收口
- 保留人事账号中心中的“账户列表”作为唯一主入口；
- 下线系统管理中的“用户账号”TAB；
- 避免系统管理再继续承载重复账号入口。

#### 2) 保留历史兼容入口
- 不直接删除 `/system-management/accounts` 路由；
- 将其改为重定向到 `/personnel/accounts`；
- 尽量保留 query/search 参数，兼容旧书签、旧外部跳转与历史导航。

### 计划改动文件
优先涉及：

- `src/features/system-mgmt/tab-config.ts`
- `src/routes/_authenticated/system-management/accounts.tsx`
- 可能配套检查：
  - `src/routes/_authenticated/personnel/accounts.tsx`
  - `src/routeTree.gen.ts`（由生成器自动更新，不手工编辑）
  - 现有与账号列表相关的轻量测试

### 具体实施思路
#### 第一步：移除重复 TAB
- 从 `systemManagementTabs` 中删除 `accounts` 项；
- 保持系统管理其余 tabs 不受影响；
- 将账号列表入口语义完全收回到人事账号中心。

#### 第二步：保留路由兼容
- 保留 `/system-management/accounts` 路由文件；
- 将页面实现改为跳转到 `/personnel/accounts`；
- 若存在 search 参数，则尽量原样透传。

#### 第三步：验证兼容性
- 验证系统管理 tabs 不再显示重复账号入口；
- 验证手动访问 `/system-management/accounts` 会跳到 `/personnel/accounts`；
- 验证原有账号列表功能不受影响。

### 风险评估
1. 若直接删除路由而不保留重定向，可能导致旧书签或旧跳转失效；
2. 若重定向未保留 search 参数，可能影响列表筛选上下文；
3. 若存在外部依赖系统管理账号入口的文档或操作习惯，用户需要短暂适应；
4. 若误删与系统管理 tabs 相关的其他配置，可能影响同模块其余页面。

### 验证策略
- 代码层：
  - 全局搜索 `/system-management/accounts` 剩余调用点；
  - 确认系统管理 tab 配置已移除该入口；
  - 确认 route 仍存在且仅承担重定向职责。
- 测试层：
  - 最小前端路由/组件回归（若已有现成模式则复用）；
  - `pnpm exec tsc --noEmit`；
  - 必要时加轻量 smoke 验证。

### 当前状态与暂停点
本节已执行完成，结论如下：

1. 已确认系统管理“用户账号”TAB 为重复入口壳；
2. 已完成“删除系统管理重复 TAB + 保留历史路由重定向”；
3. 已补做残留本地化分支清理，避免 UI 配置层误导；
4. 已完成验证与 `walkthrough.md` 记录，当前仅保留 `/system-management/accounts` 作为兼容跳转入口。

## 最终全链弱冗余残留审计方案（审批稿）

### 背景与问题判断
当前已完成：

- 后端权限事实单源收口；
- `effectiveRoles` 主链收严；
- compatibility-only 边界压缩；
- `/labs` 顶层路径映射补齐；
- 系统管理重复账号 TAB 下线与兼容重定向。

现阶段已不再存在明确的“第二套权限事实来源”，但仍可能残留一些会误导维护者或用户认知的弱冗余点，例如：

1. 命名上仍像主链、实则只是 compatibility / display 的读取入口；
2. 路由、菜单、TAB、catalog、文案中仍保留的 legacy / compatibility 痕迹；
3. 仅用于 UX assist 的保底逻辑，看起来却像业务主规则；
4. 已经被兼容保留，但仍容易被误当成正式入口的历史路径。

### 本轮目标
#### 1) 做最终残留审计，而不是继续大改权限裁决
- 本轮优先做“全链弱冗余残留审计”；
- 只识别、分类、标注残留点；
- 不把范围扩大到新的后端 contract 或权限裁决重构。

#### 2) 形成可执行的分层结果
- 输出“必须处理 / 建议处理 / 可保留”三级清单；
- 明确哪些残留属于 compatibility-only，哪些只是 display-only，哪些只是 UX assist；
- 为下一轮是否继续改实现提供依据。

### 预期审计范围
优先检查：

- `src/features/authz/**`
- `src/components/layout/**`
- `src/components/layout/data/**`
- `src/features/system-mgmt/**`
- 与 authenticated route catalog / sidebar / module tabs / route helper 相关的轻量配置层

重点关注：

- compatibility-only 读取函数剩余调用点；
- legacy route / redirect / catalog 残留；
- display / UX assist 层是否仍带有“像主链”的表达；
- 文案、本地化、配置分支中的失效能力残留。

### 具体实施思路
#### 第一步：全局搜索与分层归类
- 搜索 compatibility / role / effectiveRoles / redirect / route catalog / tabs 相关调用点；
- 将发现的点按“事实链风险 / 维护误导 / 纯兼容保留”分类；
- 明确哪些是必须动作，哪些仅需文档化保留。

#### 第二步：收口低风险残留（仅在你批准后）
- 对明显无争议的配置残留、文案残留、无效分支做轻量清理；
- 对仍需兼容保留的点，尽量改为更明确的 compatibility-only 表达；
- 避免引入新的业务逻辑调整。

#### 第三步：补文档与验证
- 更新 `walkthrough.md`，给出最终残留清单与处理结果；
- 必要时执行轻量 `vitest` / `pnpm exec tsc --noEmit`；
- 明确哪些保留项是有意而为之，避免后续重复排查。

### 风险评估
1. 若把“残留审计”误做成“新一轮大改”，会不必要扩大范围；
2. 若误删仍承担兼容职责的 legacy 路由或 helper，可能影响旧入口稳定性；
3. 若只做代码清理而不记录保留项，后续仍会重复出现“这是不是冗余”的讨论；
4. 若把 display/UX assist 误判成权限主链问题，可能浪费改造精力。

### 验证策略
- 代码层：
  - 全局搜索 compatibility-only 读取、legacy route、sidebar/tabs/catalog 残留点；
  - 确认未重新引入新的权限事实来源；
- 测试层：
  - 若仅为文档与审计，不强制改测试；
  - 若进入低风险清理实现，则执行最小 `vitest` / `pnpm exec tsc --noEmit`。

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已确认当前主干权限链改造已基本完成；
2. 下一轮建议先做“最终全链弱冗余残留审计”，而非直接继续大改；
3. 在你明确批准前，不开始本专项实现性改动；
4. 你批准后，我会先出残留清单，再决定是否进入低风险清理。

## 删除未使用 legacy alias 方案（审批稿）

### 背景与问题判断
经本轮残留审计已确认：

- `src/features/authz/core/access-snapshot.ts` 中的 `getSnapshotRoleIds(...)`
- `src/features/authz/utils/auth-session.ts` 中的 `getAuthSessionRoleIds(...)`

当前都已**没有业务调用点**，全局搜索结果仅剩：

1. 导出定义本身；
2. 对“legacy alias 仍保留”进行断言的测试代码。

因此，这两个函数已经不再承担真实兼容职责，继续保留只会带来两个问题：

1. 让后来维护者误以为这里仍是推荐入口；
2. 让 API 面上持续存在一层没有实际调用价值的历史壳。

结合你当前要求“系统只可能有一个，不需要兼容旧的”，这两个未使用 alias 已满足删除条件。

### 本轮目标
#### 1) 删除未使用 alias，而不是继续保留兼容壳
- 删除 `getSnapshotRoleIds(...)`；
- 删除 `getAuthSessionRoleIds(...)`；
- 保留已经显式命名的 compatibility-only 入口：
  - `getSnapshotCompatibleRoleIds(...)`
  - `getAuthSessionCompatibleRoleIds(...)`

#### 2) 同步收紧测试表达
- 删除“legacy alias 仍然保留”的测试断言；
- 保留对显式 compatibility-only 入口与 `effectiveRoles` 主读取隔离语义的测试。

### 计划改动文件
优先涉及：

- `src/features/authz/core/access-snapshot.ts`
- `src/features/authz/utils/auth-session.ts`
- `src/features/authz/core/access-snapshot.test.ts`
- `src/features/authz/utils/auth-session.test.ts`
- `walkthrough.md`

### 具体实施思路
#### 第一步：删除 alias 导出
- 从 `access-snapshot.ts` 中移除 `getSnapshotRoleIds(...)`；
- 从 `auth-session.ts` 中移除 `getAuthSessionRoleIds(...)`；
- 确认现有代码仅使用：
  - `getSnapshotCompatibleRoleIds(...)`
  - `getAuthSessionCompatibleRoleIds(...)`
  - `getSnapshotEffectiveRoleIds(...)`
  - `getAuthSessionEffectiveRoleIds(...)`

#### 第二步：收口测试
- 调整相关测试，删除“legacy alias 存续”断言；
- 改为锁住：
  - compatibility-only 入口仍可合并 `role/effectiveRoles`
  - effective reader 仍只认 `effectiveRoles`

#### 第三步：验证与文档
- 执行定向 `vitest`；
- 执行 `pnpm exec tsc --noEmit`；
- 更新 `walkthrough.md`，记录 legacy alias 删除与最终保留边界。

### 风险评估
1. 若存在仓库外部调用方依赖这两个 alias，本仓内搜索无法直接发现；
2. 若只删导出不改测试，会留下失败断言；
3. 若误删显式 compatibility-only 入口，会影响当前 display-only 消费点。

### 验证策略
- 代码层：
  - 全局搜索确认 `getSnapshotRoleIds(...)` 与 `getAuthSessionRoleIds(...)` 无业务引用；
  - 删除后再次搜索，确认仅剩历史记录或文档引用；
- 测试层：
  - `vitest`：`access-snapshot.test.ts`、`auth-session.test.ts`
  - `pnpm exec tsc --noEmit`

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已确认这两个 legacy alias 当前无业务调用；
2. 已明确本轮目标是直接删除，而不是继续保留兼容壳；
3. 在你明确批准前，不开始本专项实现修改；
4. 你批准后，我会先删导出，再调测试，最后补 `walkthrough.md`。

## 前端消费边界制度化方案（审批稿）

### 背景与问题判断
当前已完成：

- 后端权限事实单源收口；
- `effectiveRoles` 主链收严；
- compatibility-only 边界压缩；
- 重复入口与文案残留清理；
- 未使用 legacy alias 删除。

这意味着“明显错误的第二套事实来源”已基本消除，但前端仍缺少一套**长期稳定、可复用、可约束新代码的消费边界制度**。当前风险不再是显式 bug，而是：

1. 新代码可能再次在 layout、sidebar、tab、helper、service 中混入权限事实解释；
2. compatibility-only / display-only / UX assist 入口虽已存在，但尚未制度化成统一规则；
3. 不同模块仍可能各自实现一层“看起来差不多”的权限消费逻辑，未来再次分叉。

因此，下一轮不再只是清理残留，而是把前端权限消费边界正式制度化。

### 本轮目标
#### 1) 建立统一分层模型
前端权限消费链统一分为：

- **主链 contract 消费层**
  - 只消费后端 contract；
  - 读取权限事实、`effectiveRoles`、permission ids；
  - 禁止本地派生新的权限事实。

- **compatibility-only 层**
  - 仅承接过渡字段或旧数据形态；
  - 命名必须显式表现为 compatibility-only；
  - 禁止被新主链逻辑直接依赖。

- **display / UX assist 层**
  - 只负责展示、标签、提示、调试、空态、过滤辅助；
  - 不得承担权限裁决或事实补全职责。

- **legacy route / redirect 层**
  - 仅用于兼容历史入口；
  - 必须显式表达为兼容壳，不伪装成正式业务入口。

#### 2) 让制度可执行，而不是停留在命名层面
- 收口共享 helper / service / route helper 的职责；
- 必要时拆分文件，避免多层语义继续堆在一个函数内；
- 用最小测试锁住边界，防止未来回退。

### 预期改动范围
优先涉及：

- `src/features/authz/**`
- `src/components/layout/**`
- `src/components/layout/data/**`
- `src/features/system-mgmt/**`
- 必要时延伸到：
  - `src/features/users/**`
  - `src/routes/_authenticated/**` 中少量兼容 route / redirect 文件

### 具体实施思路
#### 第一步：梳理并建立边界清单
- 全局盘点权限相关读取入口与 helper；
- 为每个入口标注层级：主链 / compatibility-only / display-only / UX assist / legacy route；
- 找出仍存在语义混杂或重复承责的入口。

#### 第二步：收口共享入口与命名语义
- 把仍“看起来像主链、实则不是”的入口改成更明确的层级表达；
- 若多个模块重复做同类消费转换，优先提炼单一共享入口；
- 对能解耦的内容尽量拆分成独立文件，避免继续堆叠在单点模块中。

#### 第三步：收口配置层与历史兼容层
- 复查 layout / sidebar / tabs / route catalog / redirect helper 中的弱规则；
- 清理低风险失效分支与误导性命名；
- 保留必要历史兼容入口，但要求表达为明确的 compatibility-only 壳。

#### 第四步：补测试与文档
- 为关键边界函数补最小回归测试；
- 执行定向 `vitest` / `pnpm exec tsc --noEmit`；
- 更新 `walkthrough.md`，沉淀最终制度化边界与保留项说明。

### 风险评估
1. 若范围失控，容易把“制度化”做成新一轮大规模权限重构；
2. 若命名与职责调整过多，可能带来模块间连锁改动；
3. 若收口时误触前端守卫逻辑，可能与当前“权限裁决以后端为准”的原则冲突；
4. 若只做代码收口不做文档沉淀，后续新代码仍可能再次越界。

### 约束与边界
- 不新增前端权限硬拦截；
- 不把前端变成第二套权限裁决器；
- 以后端 contract 为唯一事实来源；
- 用户面消息保持中文，日志保持英文；
- 对能独立拆分的边界 helper，优先采用分文件方式组织。

### 验证策略
- 代码层：
  - 全局搜索 role / effectiveRoles / permission helper / route redirect / sidebar tabs 消费点；
  - 确认权限事实仍只来自后端 contract 与 `effectiveRoles` 主链；
- 测试层：
  - 为关键 shared helper 增补最小测试；
  - 执行定向 `vitest` 与 `pnpm exec tsc --noEmit`；
  - 必要时补轻量 smoke 验证。

### 当前状态与暂停点
本节当前仅为执行前审批稿：

1. 已明确下一轮是“前端消费边界制度化”，不是简单残留清理；
2. 已明确本轮仍坚持“后端为权限事实来源、前端不做硬裁决”的边界；
3. 在你明确批准前，不开始本专项实现修改；
4. 你批准后，我会先做边界清单，再按共享入口、配置层、测试与文档的顺序推进。

---

## 第三批审批稿：`route-access / route tab` 投影层语义收口

### 背景
前两批已完成：

1. 动作层伪守卫壳收口；
2. `navigation-access / route-entry-access` 透传型辅助壳收口。

当前剩余的高风险语义点是 `src/features/authz/guards/route-access.ts`：

- 它并不是“纯透传壳”；
- 也不应该被业务层理解为“前端权限裁决主链”；
- 它的真实职责更接近：基于后端返回的权限快照，在前端做路由路径 / Tab 配置的本地投影与匹配。

如果继续沿用 `canAccessPath / getAccessibleTabs` 这类表达，后续新代码仍可能把它误读成“前端判权入口”，与当前制度化目标冲突。

### 目标
本批次目标不是删除 `route-access.ts`，而是：

1. 明确其只属于“快照投影层”；
2. 收紧其命名，避免继续被理解为前端权限裁决器；
3. 保证不新增新的前端硬拦截、不改变后端为唯一事实来源的原则。

### 计划步骤
#### 第一步：职责复核与调用面分类
- 梳理 `route-access.ts` 当前导出：
  - `getRequiredPermissionIdsForPath`
  - `canAccessPath`
  - `getAccessibleTabs`
- 逐个定位调用面，分类为：
  - route / tab 配置投影；
  - 前端页面展示过滤；
  - 潜在误用为“硬权限判断”的入口。

#### 第二步：语义收口方案设计
- 若仅是配置投影，则改成更准确的命名，例如“resolved / projected / snapshot-based”语义；
- 若存在业务误用，优先改调用面表达，不新增新的判权逻辑；
- 若改名影响面较大，则采用“新名主入口 + 过渡别名 + 全仓迁移 + 删除旧名”的渐进方式。

#### 第三步：最小实现
- 仅修改共享入口与调用面命名；
- 不修改 `permission-kernel`、后端 contract、`effectiveRoles` 主链；
- 不引入新的本地兜底裁决与前端跳转拦截。

#### 第四步：验证与记录
- 搜索旧命名残留，确认业务调用面已切到新语义；
- 执行至少 `pnpm exec tsc --noEmit`；
- 更新 `walkthrough.md` 记录第三批结果与保留项。

### 风险评估
1. 如果把 `route-access.ts` 误判成“纯透传壳”，可能错误削弱现有 Tab/路径投影能力；
2. 如果把“投影 helper”继续命名成 access guard，后续仍会诱导新代码越界；
3. 如果实现时顺手扩展到真正的前端硬拦截，会偏离本专项边界；
4. 如果不保留必要投影 helper，部分前端配置层可能失去最小展示过滤能力。

### 约束与边界
- 不新增前端硬权限拦截；
- 不把 `route-access.ts` 升级成新的权限裁决器；
- 后端 contract 仍是唯一权限事实来源；
- 本批只做“快照投影层”的职责收口与命名拉正；
- 若发现需要破坏性调整，先回到规划并再次确认。

### 验证策略
- 搜索：
  - `canAccessPath`
  - `getAccessibleTabs`
  - `getRequiredPermissionIdsForPath`
- 确认新旧命名切换后，业务调用面不再把其表述为 guard / access control 主入口；
- 执行定向 `pnpm exec tsc --noEmit`；
- 必要时补最小搜索验证结果到 `walkthrough.md`。

### 当前状态与暂停点
本节当前仅为第三批执行前审批稿：

1. 已确认第三批目标是“投影层语义收口”，不是透传壳重复清理；
2. 已确认本批仍坚持“后端为唯一事实来源、前端不做硬裁决”；
3. 在你明确批准前，不开始第三批业务代码修改；
4. 你批准后，我会先做调用面清单，再开始共享入口与命名迁移。

---

## 缺陷修复审批稿：产线拓扑保存 `authCode` 缺失与 403 提示拆分

### 背景
当前“产线管理中心”点击“手动搭建首个工段”时，前端会立即把修改后的整条产线提交到 `POST /production/lines`。

已确认链路如下：

1. `line-card.tsx` 点击“手动搭建首个工段”；
2. `use-line-topology.ts` 在当前产线对象上新增 `segment` 并回调 `onUpdate`；
3. `line-mgmt/index.tsx` 的 `handleUpdateLine` 立即调用 `productionResourceService.saveLine(...)`；
4. 后端 `SaveProductionLineHandler` / `ProductionService.SaveProductionLine` 在编辑已有产线时要求校验 `authCode`。

当前缺陷是：

- 前端 `saveLine(...)` 请求体未携带 `authCode`；
- 后端因此返回 `403 UNAUTHORIZED`；
- 前端又把 403 统一映射为“后端指令验证未通过，请检查授权码”，导致权限不足与授权码无效无法区分。

### 目标
本次修复目标：

1. 为已有产线拓扑编辑补齐授权码提交；
2. 将 403 提示拆分为“权限不足”与“拓扑授权码无效”两类；
3. 不改变后端权限/授权事实来源，不新增前端硬拦截。

### 计划步骤
#### 第一步：前端保存链路补齐 `authCode`
- 梳理现有产线管理页中与编辑授权对话框相关的组件/状态；
- 将授权码输入结果接入 `handleUpdateLine -> saveLine(...)` 调用链；
- 仅在需要编辑已有产线拓扑时提交 `authCode`。

#### 第二步：资源服务与错误映射收口
- 为 `productionResourceService.saveLine(...)` 扩展可选 `authCode` 入参；
- 保持接口路径与后端 contract 不变，仅补齐请求体字段；
- 在前端错误处理处区分：
  - 权限不足（如 `insufficient permissions`）；
  - 拓扑授权失败（如 `UNAUTHORIZED` / topology auth invalid）。

#### 第三步：最小验证与记录
- 验证点击“手动搭建首个工段”时不再无条件触发授权失败；
- 执行至少 `pnpm exec tsc --noEmit`；
- 更新 `walkthrough.md` 记录根因、修复点和保留项。

### 风险评估
1. 若授权码状态接入位置不对，可能导致保存已有产线仍然拿不到 `authCode`；
2. 若误把新建产线与编辑产线混为一谈，可能给不需要授权码的路径引入额外负担；
3. 若错误提示拆分逻辑过于依赖文案字符串，后续后端返回体变化时可能再次失真；
4. 若实现时加入前端预判拦截，可能偏离“后端为唯一事实来源”的原则。

### 约束与边界
- 不新增前端硬权限裁决；
- 不修改后端授权规则，仅补齐前端传参与错误展示；
- 保持 `POST /production/lines` 合同不变，只按既有 handler 结构提交 `authCode`；
- 用户面消息保持中文，日志保持英文。

### 验证策略
- 定向检查：
  - `line-card.tsx`
  - `use-line-topology.ts`
  - `line-mgmt/index.tsx`
  - `production-resource-service.ts`
  - `SecurityAuthDialog` 相关调用点
- 校验 403 分支是否已拆分为不同提示；
- 执行 `pnpm exec tsc --noEmit`；

### 当前状态与暂停点
本节当前仅为缺陷修复执行前审批稿：

1. 已确认根因是 `DMPreview` 向 `bwip-js` 透传了 `height: undefined`；
2. 已确认正确方向是“按码制条件追加字段”，而不是继续透传空值；
3. 在你明确批准前，不开始本缺陷修复的业务代码修改；
4. 你批准后，我将直接实施 `dm-preview.tsx` 定向修复并完成最小验证。

---

## DTO 升级断链恢复审批稿：`production_topology_handlers.go` / `production_service.go`

### 背景
你指出 `production_topology_handlers.go` 与 `production_service.go` 在 DTO 升级后发生断链。

基于当前代码证据，已确认这条链路仍是旧形态：

1. `server/handlers/production_topology_handlers.go` 的 `SaveProductionLineHandler` 直接绑定 `services.ProductionLineDTO`；
2. `server/services/production_service.go` 的 `SaveProductionLineRequest` 仍持有 `Line ProductionLineDTO`；
3. `ProductionService.SaveProductionLine(...)` 仍调用 `mapProductionLineDTOToModel(...)` 与 `mapProductionLineToDTO(...)`；
4. `ListProductionLines()` 仍依赖 `mapProductionLinesToDTO(...)`；
5. `production_service_test.go` 也仍然以 `ProductionLineDTO` 构造测试输入。

但进一步全仓检索后，当前仓内只剩这些**引用点**，已找不到：

- `type ProductionLineDTO struct`
- `mapProductionLineDTOToModel`
- `mapProductionLineToDTO`
- `mapProductionLinesToDTO`

这说明本次问题不是单纯字段差异，而是 **DTO 升级后，产线拓扑 handler/service 主链没有完成同步迁移，导致类型与映射层被抽走或重命名后，旧入口仍在继续引用。**

### 根因判断
当前更接近以下场景之一：

1. 旧 `ProductionLineDTO` 已被新 DTO 替代，但 `production_topology_handlers.go` / `production_service.go` 未切换；
2. DTO/映射逻辑在重构中被拆到新文件或新命名，但当前生产拓扑链路未更新引用；
3. DTO 升级只完成了消费面或部分服务层，未完成请求绑定、服务签名、映射函数、测试的整链收口。

无论具体是哪一种，当前都不适合只在某一个文件里“临时补一个 struct”。如果只做局部补丁，会继续制造：

- handler 入参与 service contract 再次漂移；
- 列表返回与保存返回结构不一致；
- 测试恢复编译但运行时 JSON 绑定/嵌套映射仍错位；
- 后续前后端对 `segments/processes/version/authCode` 语义再次分叉。

### 建议恢复方案
本轮恢复建议按“单一后端 DTO contract”收口，而不是做临时编译修补。

#### 第一步：确认当前应回归的 DTO 形态
- 先以现有 `models.ProductionLine -> LineSegment -> ProcessStep` 为实体真相；
- 核对 DTO 升级目标是否只是命名调整，还是已经引入新的嵌套/字段；
- 若仓内确实已无新 DTO 落点，则以当前 model + handler JSON contract 为依据，恢复一份明确的产线 DTO 定义与映射层。

#### 第二步：收口 handler / service contract
- `SaveProductionLineHandler` 的 JSON 绑定结构应显式依赖统一的请求 DTO；
- `SaveProductionLineRequest` 不应继续依赖“失联的旧 DTO 名称”；
- `ListProductionLines` / `SaveProductionLine` 的返回 DTO 应使用同一套映射逻辑；
- 避免 handler 和 service 各自定义一份相似但不一致的入参结构。

#### 第三步：补齐映射与测试
- 恢复 `DTO <-> model` 的单向/双向映射函数；
- 核对 `segments`、`processes`、`version`、`id`、`isActive`、`description` 等字段是否完整透传；
- 更新 `production_service_test.go`，保证测试输入、版本冲突、授权码校验、新建初始 version 的断言都回到统一 contract 上；
- 如有必要，再补最小 handler 级回归，确保 JSON 绑定和错误分支未漂移。

### 预计改动文件
- `server/handlers/production_topology_handlers.go`
- `server/services/production_service.go`
- `server/services/production_service_test.go`
- 可能新增或恢复一个与 production service 同域的 DTO / mapper 文件（若确认当前确实缺失）

### 风险评估
1. 如果 DTO 升级时已经改了嵌套结构，仅恢复旧名字但不恢复新字段，会出现“能编译、但 JSON contract 错”的假修复；
2. `SaveProductionLine` 含乐观锁 `version` 与 `authCode` 校验，若请求 DTO 绑定层恢复不完整，会把并发控制或授权校验悄悄绕坏；
3. `segments/processes` 的映射若遗漏 `temp-` 相关 ID 语义，可能影响新增工段/工序的持久化行为；
4. 若只修 service 不修 test/handler，后续仍会留下编译盲区或运行时断链。

### 验证策略
- 优先执行与 production 拓扑链路直接相关的 Go 编译/测试；
- 至少覆盖：
  - `production_service_test.go`
  - `SaveProductionLineHandler` 绑定与错误分支相关测试（若已有）
- 若恢复过程中发现当前缺少 handler 回归，则补最小必要测试，确保：
  - 列表查询能返回统一 DTO；
  - 保存新增产线时 version 初始化正常；
  - 编辑产线时 version conflict / authCode invalid 分支保持原语义。

### 约束与边界
- 本轮先恢复 DTO 断链，不顺手扩展为生产拓扑领域重构；
- 不改变 repository 的持久化语义，除非 DTO 升级已要求字段对齐且不改无法恢复 contract；
- 不新增与本缺陷无关的接口；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 DTO 断链恢复执行前审批稿：

1. 已确认问题核心不是“某个字段类型错”，而是 `ProductionLineDTO` 及其映射层在仓内只剩引用、无定义落点；
2. 已确认正确方向是“恢复单一 DTO contract 并同步 handler/service/test”，而不是局部临时补类型；
3. 在你明确批准前，不开始本缺陷的业务代码修改；
4. 你批准后，我将直接进入产线拓扑后端链路修复，并按最小必要范围完成验证。

---

## 根因修复审批稿：`save_patch_semantics_test.go` 对旧 `services.SalesOrderDTO` 的错误依赖

### 背景
在恢复 `production` DTO 断链后，继续执行 `go test ./handlers -run Production` 时，当前被如下编译错误阻塞：

- `handlers/save_patch_semantics_test.go:162`
- `undefined: services.SalesOrderDTO`

进一步复核后已确认：

1. `server/handlers/sales_orders.go` 中真实保存入口是：
   - `func saveSalesOrderForBulkSync(tx *gorm.DB, order *models.SalesOrder)`
2. `saveSalesOrderForBulkSync(...)` 当前的职责是：
   - 对已有 `models.SalesOrder` 执行 sparse update / PATCH 语义保护；
   - 对未传字段回填数据库既有值，避免 `requirements`、`workflow_instance_id` 等字段在稀疏同步时被清空。
3. 但 `server/handlers/save_patch_semantics_test.go` 仍在使用：
   - `saveSalesOrderForBulkSync(testDB, &services.SalesOrderDTO{...})`

这说明本次失败的根因不是“业务主链真的还缺一个 `SalesOrderDTO`”，而是**测试仍停留在旧 DTO contract，已经与 handler 内部真实保存语义脱节。**

### 根因判断
当前不应通过“补回 `services.SalesOrderDTO`”来让测试重新编译，因为那会带来新的结构性问题：

1. 在 `handlers` 内部重新制造一个已退出主链的旧服务 DTO；
2. 让测试继续验证一条不存在的中间 contract；
3. 进一步扩大 `models.SalesOrder` 与 `services.SalesOrderDTO` 的双源漂移；
4. 掩盖真实保存语义已经切到 model 层的事实。

因此，这里必须按你要求从根源修：**让测试回到真实 contract，而不是恢复假契约。**

### 建议修复方案
#### 第一步：让测试输入对齐真实保存入口
- 将 `save_patch_semantics_test.go` 中对 `services.SalesOrderDTO` 的依赖替换为 `models.SalesOrder`；
- 构造稀疏更新输入时，仅设置当前测试真正要提交的字段；
- 保持 `saveSalesOrderForBulkSync(tx, *models.SalesOrder)` 作为单一被测入口。

#### 第二步：把测试断言聚焦到 PATCH 语义本身
- 明确验证“未提交字段必须保留旧值”，而不是验证旧 DTO 是否还能被隐式转换；
- 至少覆盖并保留以下断言：
  - `requirements` 不被稀疏更新清空；
  - `workflow_instance_id` 不被稀疏更新清空；
  - 已提交字段（如 `orderName`）可以正常更新；
  - `version` 等显式传入字段仍按当前保存语义生效。

#### 第三步：验证 handlers 包编译阻塞是否消失
- 优先执行：
  - `go test ./handlers -run SavePatchSemantics`
- 若通过，再视结果决定是否继续执行更广的 handlers 定向测试，确认 `services.SalesOrderDTO` 断链已彻底清除。

### 预计改动文件
- `server/handlers/save_patch_semantics_test.go`

### 风险评估
1. 若测试输入改造不谨慎，可能把“真实 PATCH 语义验证”退化成普通 Save 测试；
2. 若把未传字段错误地初始化为空值，可能误伤现有保留字段断言；
3. 若修复时顺手恢复 `services.SalesOrderDTO`，会重新引入伪 contract，偏离本次根因修复目标。

### 约束与边界
- 不补回 `services.SalesOrderDTO`；
- 不扩展为销售订单领域 DTO 重构；
- 只修真实编译阻塞点与其对应的 PATCH 语义测试；
- 若发现还有其它旧 DTO 消费点，再回到规划单独确认。

### 当前状态与暂停点
本节当前仅为根因修复执行前审批稿：

1. 已确认当前失败源头是测试对旧 `services.SalesOrderDTO` 的错误依赖；
2. 已确认正确方向是“测试回归真实 `models.SalesOrder` contract”，而不是补回旧 DTO；
3. 在你明确批准前，不开始本缺陷的业务代码修改；
4. 你批准后，我将直接收口 `save_patch_semantics_test.go` 并完成最小验证.

---

## `workflow` DTO 改造审批稿：收口 definition / instance / task 的 API contract

### 背景
当前 `workflow` 模块已经具备后端最小可运行骨架，并且采购/销售建单自动挂接 workflow 的主链已跑通。

但从当前代码边界看，`workflow` 仍明显存在 “API contract 与持久化 model 混用” 的问题：

1. `server/handlers/workflow.go`
   - `SaveWorkflowDefinitionHandler` 在 create 路径直接把请求体反序列化为 `models.WorkflowDefinition`；
   - `GetWorkflowDefinitionsHandler` 直接返回 `[]models.WorkflowDefinition`；
   - `GetWorkflowInstancesHandler` 直接返回 `[]models.WorkflowInstance`；
   - `GetWorkflowTasksHandler` 直接返回 `[]models.WorkflowTask`；
   - `ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler` 直接返回 `models.WorkflowInstance`。
2. `server/services/workflow_service.go`
   - `ApproveWorkflowTask(...)` / `RejectWorkflowTask(...)` 直接暴露 `models.WorkflowInstance`；
   - `ListWorkflowTasks(...)` 直接暴露 `[]models.WorkflowTask`。

这意味着当前 workflow 的外部 API 协议仍强耦合数据库 model，后续若新增展示字段、聚合字段、内部状态字段或 GORM 关联字段，极容易造成对外 contract 漂移。

### 改造目标
将 `workflow` 域收口为明确的三层边界：

1. **Request DTO**
2. **Response DTO**
3. **Internal Model（仅持久化/事务内部使用）**

目标不是重写 workflow 业务逻辑，而是稳定 API contract，让 `handler` 不再直接把 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask` 当成前后端协议。

### 建议文件划分
#### 1) DTO 定义文件
- 新增 `server/services/workflow_dto.go`
- 放置：
  - `SaveWorkflowDefinitionRequest`
  - `PatchWorkflowDefinitionRequest`
  - `CreateWorkflowInstanceRequest`
  - `WorkflowTaskDecisionRequest`
  - `WorkflowDefinitionResponse`
  - `WorkflowInstanceResponse`
  - `WorkflowInstanceListItemResponse`
  - `WorkflowInstanceListResponse`
  - `WorkflowTaskResponse`

#### 2) Mapper 文件
- 新增 `server/services/workflow_mapper.go`
- 放置：
  - `mapWorkflowDefinitionToResponse(...)`
  - `mapWorkflowDefinitionsToResponse(...)`
  - `mapWorkflowInstanceToResponse(...)`
  - `mapWorkflowInstancesToListItems(...)`
  - `mapWorkflowTaskToResponse(...)`
  - `mapWorkflowTasksToResponse(...)`

#### 3) 现有 service / handler 文件职责收口
- `server/services/workflow_service.go`
  - 保留 workflow 核心业务逻辑与事务推进；
  - 不再把返回 `models.*` 视作默认对外 contract。
- `server/handlers/workflow.go`
  - 仅负责绑定 Request DTO、调用 service、返回 Response DTO；
  - 不再直接把 `models.*` 暴露给前端。

### 第一轮建议范围
#### 优先纳入本轮
1. `GetWorkflowDefinitionsHandler`
2. `SaveWorkflowDefinitionHandler`
3. `CreateWorkflowInstanceHandler`
4. `GetWorkflowInstancesHandler`
5. `GetWorkflowTasksHandler`

#### 第二轮再纳入
1. `ApproveWorkflowTaskHandler`
2. `RejectWorkflowTaskHandler`

原因：审批/驳回会牵涉实例状态推进与错误分支返回，适合在第一轮 contract 收口稳定后再接入 DTO，避免一次性变动过多。

### 第一批 DTO 边界
#### Request DTO
- `SaveWorkflowDefinitionRequest`
  - `code`
  - `name`
  - `module`
  - `definitionJson`
  - `description`
  - `version`
  - `isActive`

- `PatchWorkflowDefinitionRequest`
  - `id`
  - `code *string`
  - `name *string`
  - `module *string`
  - `definitionJson *string`
  - `description *string`
  - `version *int`
  - `isActive *bool`

- `CreateWorkflowInstanceRequest`
  - `module`
  - `businessType`
  - `businessRefId`
  - `requesterId`

- `WorkflowTaskDecisionRequest`
  - `comment`

#### Response DTO
- `WorkflowDefinitionResponse`
  - `id`
  - `code`
  - `name`
  - `module`
  - `definitionJson`
  - `description`
  - `version`
  - `isActive`
  - `createdAt`
  - `updatedAt`

- `WorkflowInstanceResponse`
  - `id`
  - `definitionId`
  - `businessType`
  - `businessRefId`
  - `status`
  - `currentNodeId`
  - `requesterId`
  - `startedAt`
  - `finishedAt`
  - `createdAt`
  - `updatedAt`

- `WorkflowInstanceListItemResponse`
  - `id`
  - `businessType`
  - `businessRefId`
  - `status`
  - `requesterId`
  - `createdAt`
  - `updatedAt`

- `WorkflowInstanceListResponse`
  - `items`
  - `total`
  - `page`
  - `pageSize`

- `WorkflowTaskResponse`
  - `id`
  - `instanceId`
  - `nodeId`
  - `assigneeUserId`
  - `status`
  - `comment`
  - `createdAt`
  - `updatedAt`

### 风险评估
1. 如果把 DTO 改造扩大为 workflow 业务重写，容易超出本轮边界；
2. 如果在第一轮同时改审批/驳回全部返回 contract，可能增加回归面积；
3. 如果 handler 和 service 同时各自拼 response，仍会产生双源 contract；
4. 如果直接照抄 model 字段而不做 contract 选择，DTO 会沦为“机械复制”，收益有限；
5. 如果忽略采购/销售建单自动挂 workflow 的既有回归，可能误伤当前已跑通的主链。

### 验证策略
- 至少执行：
  - `go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"`
- 定向复核以下链路：
  - 流程定义创建/更新
  - 流程实例创建
  - 流程实例分页查询
  - 流程任务查询
  - 采购/销售建单自动挂接 workflow 实例
- 若第一轮纳入审批/驳回响应 DTO，则补最小 handler / mapper 回归验证错误分支语义不变。

### 约束与边界
- 本轮只做 `workflow` DTO contract 收口，不扩展到其它业务域；
- 不改变 workflow 核心审批状态机与业务推进逻辑；
- 不顺手重构采购/销售 domain model；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `workflow` DTO 改造执行前审批稿：

1. 已确认 `workflow` 当前主要问题是 API contract 与 `models.*` 强耦合；
2. 已确认正确方向是建立 `Request / Response / Internal Model` 三层边界；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将按“Definition/Instance/Task 查询与创建优先，审批/驳回第二轮”的顺序推进。

---

## `workflow` DTO 第二轮审批稿：审批/驳回任务 response contract 收口

### 背景
第一轮已完成 `workflow` 的 definition / instance / task 查询与创建接口 DTO 收口，并通过：

- `go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"`

当前剩余未收口点集中在审批/驳回任务的返回 contract：

1. `server/handlers/workflow.go`
   - `ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler` 最终仍直接 `c.JSON(http.StatusOK, instance)`；
2. `services.ApproveWorkflowTask(...)` / `services.RejectWorkflowTask(...)`
   - 当前仍返回 `models.WorkflowInstance`，而 handler 没有使用第一轮已建立的 `WorkflowInstanceResponse`。

因此，第二轮目标不是继续大改 workflow，而是把审批/驳回这两条返回链补齐到与第一轮一致的 DTO 边界。

### 改造目标
在不改变 workflow 审批状态推进逻辑的前提下：

1. 让审批/驳回接口返回 `WorkflowInstanceResponse`；
2. 复用第一轮已有 `WorkflowTaskDecisionRequest` 与 `MapWorkflowInstanceToResponse(...)`；
3. 保持现有错误分支状态码与中文错误语义不变。

### 预计改动文件
- `server/handlers/workflow.go`
- 如有必要，极小范围调整：
  - `server/services/workflow_mapper.go`
  - `server/services/workflow_dto.go`

### 实施策略
#### 1) 只收口 response，不重写 service 事务逻辑
- `services.ApproveWorkflowTask(...)` / `RejectWorkflowTask(...)` 可暂时继续返回 `models.WorkflowInstance`；
- 第二轮优先在 handler 出口统一映射为 `WorkflowInstanceResponse`；
- 若后续需要进一步让 service 直接返回 DTO，再作为第三轮讨论，不在本轮混做。

#### 2) 复用现有 DTO / mapper
- 请求体继续使用第一轮已有 `WorkflowTaskDecisionRequest`；
- 成功返回统一走 `MapWorkflowInstanceToResponse(instance)`；
- 不重复发明第二套 approve/reject response struct。

#### 3) 错误分支保持原语义
- `ErrWorkflowTaskNotFound` -> `404`
- `ErrWorkflowTaskAssigneeMismatch` -> `403`
- `ErrWorkflowTaskAlreadyHandled` -> `409`
- 其它错误 -> `500`
- 中文错误消息保持现有语义，不借 DTO 收口改文案。

### 风险评估
1. 如果第二轮顺手修改 service 返回签名，容易扩大为业务主链改动；
2. 如果映射层处理不严谨，可能让审批/驳回成功响应缺字段或字段名漂移；
3. 如果为了 DTO 收口改动错误分支结构，可能打破既有 handler 回归；
4. 审批/驳回与采购/销售单据 workflow 同步主链强相关，任何行为漂移都会放大影响。

### 验证策略
- 至少执行：
  - `go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"`
- 重点复核：
  - 审批通过（中间推进）
  - 审批通过（最终完成）
  - 审批拒绝
  - 审批人不匹配
  - 重复处理冲突
  - 采购/销售建单自动挂 workflow 回归

### 约束与边界
- 本轮只做审批/驳回 response DTO 收口；
- 不改 workflow 核心事务推进逻辑；
- 不扩展为采购/销售 domain DTO 改造；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为第二轮执行前审批稿：

1. 已确认第二轮目标是“审批/驳回成功返回统一切到 `WorkflowInstanceResponse`”；
2. 已确认本轮复用第一轮已有 DTO / mapper，不重造 contract；
3. 在你明确批准前，不开始第二轮业务代码修改；
4. 你批准后，我将以 handler 出口收口为主，完成最小必要改动与回归验证。

---

## `sales_orders / trading` DTO 收口审批稿：稳定订单域 API contract 与 PATCH 语义

### 背景
当前 `workflow` 域已完成第一、二轮 DTO 收口，但订单域仍主要由 `models.*` 承担外部协议职责。结合近期已修复问题，可以确认订单域存在两类结构性风险：

1. **API contract 与持久化 model 混用**
   - `sales_orders` / `trading` 链路中，至少部分 handler/service 仍直接接收或返回 `models.SalesOrder` / `models.PurchaseOrder`；
   - 测试曾一度对历史 `services.SalesOrderDTO` 产生错误依赖，说明 contract 边界并不清晰。

2. **PATCH / sparse update 语义脆弱**
   - 已确认 `saveSalesOrderForBulkSync(...)` 需要显式保护 `requirements`、`workflow_instance_id` 等未提交字段不被清空；
   - 若 DTO 收口方式不当，极易重新引入“零值覆盖持久化”的老问题。

此外，订单域当前还与 workflow 主链强耦合：采购/销售建单时会自动创建并绑定 `workflow_instance_id`。因此 DTO 改造必须保证 workflow 挂接行为不失真。

### 改造目标
将 `sales_orders / trading` 域至少收口为以下边界：

1. **Create / Save Request**
2. **Patch / Sync Request**
3. **Response（列表/详情按需拆分）**
4. **Internal Model（持久化/事务内部使用）**

目标不是一次性重写 trading 域，而是优先稳定订单主链的 API contract，并把 PATCH 语义保护正式纳入 contract 设计。

### 第一轮建议范围
#### 优先纳入本轮
1. `server/handlers/sales_orders.go`
   - 保存销售订单
   - 批量同步销售订单
   - 列表 / 详情读取（若同文件承载）
2. 与销售订单直接相关的 service / helper
   - 包括 sparse update / bulk sync / workflow 绑定读写边界

#### 暂不扩展为同轮大改
1. 采购订单整域 DTO 化
2. trading 其它子域（如 requirements / suppliers / logistics）统一收口
3. workflow service 事务逻辑重写

原因：销售订单链路已暴露出明确的 contract 漂移与 PATCH 风险，适合作为订单域 DTO 收口的第一突破口；若本轮同时铺开采购与其它 trading 子域，范围会明显失控。

### 建议 contract 结构
#### Request DTO
- `SaveSalesOrderRequest`
  - 面向创建 / 完整保存
- `PatchSalesOrderRequest`
  - 面向稀疏更新 / 批量同步
- 视需要拆：
  - `SaveSalesOrderLineRequest`
  - `PatchSalesOrderLineRequest`

#### Response DTO
- `SalesOrderResponse`
  - 面向创建 / 更新后返回与详情页读取
- `SalesOrderListItemResponse`
  - 面向列表页
- 视需要补：
  - `SalesOrderLineResponse`
  - `SalesOrderDetailResponse`

#### Internal Model
- `models.SalesOrder`
- `models.SalesOrderLine`

### 设计原则
#### 1) 先收口 response，再清晰定义 patch request
- 列表/详情不要继续默认共享 `models.SalesOrder`；
- 对外返回的字段集应明确，不跟随数据库 model 静默漂移。

#### 2) PATCH 语义必须成为 DTO 设计的一部分
- `requirements`
- `workflow_instance_id`
- 以及其它未提交即应保留原值的字段

不应再依赖“大家记得别直接 Save model”这种隐性规则，而应通过 `PatchSalesOrderRequest` 的可选字段设计显式表达。

#### 3) workflow 边界保持不变
- DTO 收口不能改变“建单 -> 自动挂 workflow_instance_id”的既有行为；
- 与 workflow 相关的 response 字段需稳定保留，不得在收口中意外丢失。

### 预计改动文件
- `server/handlers/sales_orders.go`
- 订单域相关 service / helper 文件（按实际落点确定）
- 可能新增：
  - `server/services/sales_order_dto.go`
  - `server/services/sales_order_mapper.go`

### 风险评估
1. 若把“完整保存”和“稀疏更新”继续混成一套 request，DTO 收口后仍可能发生字段覆盖；
2. 若 response 边界不清，列表/详情字段仍可能继续漂移；
3. 若收口时误伤 `workflow_instance_id`、状态字段或金额字段，会直接影响 trading 主链稳定性；
4. 若扩大到采购单与其它 trading 子域，范围容易迅速失控。

### 验证策略
- 至少执行：
  - `go test ./services ./handlers ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"`
- 重点复核：
  - 销售订单保存
  - 销售订单批量同步 / sparse update
  - `requirements` / `workflow_instance_id` 保留逻辑
  - 建单自动挂 workflow 实例
  - 采购/销售 workflow E2E 回归

### 约束与边界
- 本轮优先收口销售订单主链，不顺手铺开全部 trading 子域；
- 不重写 workflow service；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为订单域 DTO 收口执行前审批稿：

1. 已确认订单域当前主要问题是 contract 边界模糊与 PATCH 语义脆弱；
2. 已确认正确方向是“Create/Save Request + Patch/Sync Request + Response + Internal Model” 分层；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将先从销售订单主链切入，按最小范围推进 DTO 收口与回归验证。

---

## `purchase_orders` DTO 收口审批稿：稳定采购单主链 API contract 与 PATCH 语义

### 背景
销售订单主链第一轮 DTO 收口已完成，但采购单主链仍很可能延续旧模式：

1. handler 直接绑定或直接返回 `models.PurchaseOrder` / `models.PurchaseOrderLine`；
2. API contract 与持久化 model 混用；
3. 与 workflow 挂接逻辑耦合，但缺少明确的 request/response 边界。

采购单主链还与后续收货、库存、凭证链路相关，因此 contract 收口若继续滞后，后面联动改动时会持续放大漂移风险。

### 改造目标
将采购单主链至少收口为以下边界：

1. **Create / Save Request**
2. **Patch / Sync Request**
3. **Response（列表/详情按需拆分）**
4. **Internal Model（持久化/事务内部使用）**

目标不是一次性重写采购域，而是先稳定采购单主链的 API contract，并把 PATCH / sparse update 语义、workflow 挂接字段边界显式化。

### 第一轮建议范围
#### 优先纳入本轮
1. `server/handlers/purchase_orders.go`
   - 保存采购订单
   - 批量同步采购订单（若存在）
   - 列表 / 详情读取
2. 与采购订单直接相关的 service / helper
   - 包括 workflow 绑定、明细行替换、可能的 sparse update 保护逻辑

#### 暂不扩展为同轮大改
1. 收货/入库链路 DTO 化
2. 凭证联动链路 DTO 化
3. 其它 trading 子域统一重构

原因：采购单主链本身已足够大，且又和库存、凭证链路存在天然耦合，本轮应只收口“订单主链 API contract”，不把下游联动一起卷进来。

### 建议 contract 结构
#### Request DTO
- `SavePurchaseOrderRequest`
- `PatchPurchaseOrderRequest`
- 视需要拆：
  - `SavePurchaseOrderLineRequest`
  - `PatchPurchaseOrderLineRequest`

#### Response DTO
- `PurchaseOrderResponse`
- `PurchaseOrderListItemResponse`
- 视需要补：
  - `PurchaseOrderLineResponse`
  - `PurchaseOrderDetailResponse`
  - `BulkSyncPurchaseOrdersResponse`

#### Internal Model
- `models.PurchaseOrder`
- `models.PurchaseOrderLine`

### 设计原则
#### 1) 先收口 response，再明确 save/patch request
- 采购单列表/详情不要继续默认共享 `models.PurchaseOrder`；
- 对外字段集必须稳定，不跟随数据库 model 静默漂移。

#### 2) PATCH 语义显式化
- 若采购单当前存在“未提交字段应保留原值”的路径，应通过 `PatchPurchaseOrderRequest` 的可选语义显式表达；
- 不允许继续依赖“直接 Save model 但大家自己记住哪些字段别清空”这种隐式规则。

#### 3) workflow 边界保持不变
- DTO 收口不能改变“建单 -> 自动挂 workflow_instance_id”的既有行为；
- 与 workflow 相关的响应字段必须稳定保留。

### 预计改动文件
- `server/handlers/purchase_orders.go`
- 采购单相关 service / helper 文件（按实际落点确定）
- 可能新增：
  - `server/services/purchase_order_dto.go`
  - `server/services/purchase_order_mapper.go`

### 风险评估
1. 若把 save 与 patch 继续混成一套 request，DTO 收口后仍可能发生字段覆盖；
2. 若 response 边界不清，采购单列表/详情字段仍会继续漂移；
3. 若误伤 `workflow_instance_id`、状态、金额、收货相关字段，会直接影响采购主链稳定性；
4. 若顺手扩到库存/凭证链路，范围会迅速失控。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"`
- 重点复核：
  - 采购订单保存
  - 采购订单 workflow 挂接
  - 若存在 bulk sync / sparse update，则验证未提交字段保留逻辑
  - 采购/销售 workflow E2E 回归

### 约束与边界
- 本轮只做采购单主链 DTO 收口；
- 不顺手重构库存、收货、凭证下游；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为采购单主链 DTO 收口执行前审批稿：

1. 已确认采购单当前主要风险同样是 contract 边界模糊与潜在 PATCH 语义脆弱；
2. 已确认正确方向是“Create/Save Request + Patch/Sync Request + Response + Internal Model” 分层；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将按最小范围先收口采购单主链，并执行交易/workflow 定向回归。

---

## `purchase_orders` DTO 第二轮审批稿：收口收货确认与下游返回 contract

### 背景
采购单主链第一轮 DTO 收口已完成，但 `ConfirmPurchaseReceiptHandler` 仍然返回混合结构：

```json
{
  "purchaseOrder": ...,
  "createdInboundRecords": ...
}
```

当前这里至少存在两个边界问题：

1. `purchaseOrder` 返回还未统一复用第一轮 `PurchaseOrderResponse`；
2. `createdInboundRecords` 当前仍直接暴露下游入库记录 model，收货确认接口的 response contract 仍未独立收口。

同时，这条链路已经直连：

- 采购状态重算
- 入库记录创建
- 后续库存 / 凭证联动

因此，如果继续让收货确认返回混合 model，后续每次改库存/入库字段时都可能让采购接口 response 漂移。

### 改造目标
在不重写 `ConfirmPurchaseReceipt` 事务逻辑的前提下：

1. 让 `purchaseOrder` 返回统一切到第一轮已有 `PurchaseOrderResponse`；
2. 为 `createdInboundRecords` 设计最小必要 response DTO / result wrapper；
3. 保持成功/失败业务语义、状态码和中文错误消息不变。

### 预计改动文件
- `server/handlers/purchase_orders.go`
- 如有必要，极小范围新增或调整：
  - `server/services/purchase_order_dto.go`
  - `server/services/purchase_order_mapper.go`

### 实施策略
#### 1) 先只收口 handler 出口 response
- `services.ConfirmPurchaseReceipt(...)` 的事务与领域结果先不重写；
- 第二轮优先在 handler 层把结果统一映射成稳定 response DTO。

#### 2) 复用采购单第一轮 DTO
- `purchaseOrder` 成功返回统一走 `MapPurchaseOrderToResponse(...)`；
- 不再发明第二套采购单详情 response。

#### 3) 为入库记录补最小 result DTO
- 如果当前 `createdInboundRecords` 直接暴露 `models.InboundRecord`，则只为该返回场景补最小必要 response 结构；
- 不顺手把整个 inbound 域全面 DTO 化。

### 风险评估
1. 若顺手重写 `ConfirmPurchaseReceipt` 服务逻辑，容易扩大为收货/库存主链改造；
2. 若 `createdInboundRecords` response 设计过度，会把采购单第二轮变成入库域重构；
3. 若错误分支结构发生漂移，可能打破现有 handler / service 回归；
4. 这条链与采购状态重算、库存入库、凭证联动相关，任何行为变化都会放大影响面。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading|Receipt|Inbound"`
- 重点复核：
  - 采购收货确认成功
  - 采购状态重算
  - 入库记录创建
  - 采购/销售 workflow 回归

### 约束与边界
- 本轮只做采购收货确认返回 contract 收口；
- 不扩展为库存/凭证全链 DTO 重构；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为采购单第二轮执行前审批稿：

1. 已确认第二轮目标是“收货确认返回统一切到稳定 DTO contract”；
2. 已确认本轮复用第一轮已有 `PurchaseOrderResponse`，并仅为入库结果补最小必要 DTO；
3. 在你明确批准前，不开始第二轮业务代码修改；
4. 你批准后，我将以 handler 出口收口为主，完成最小必要改动与回归验证。

---

## `production` 子链路 DTO 收口审批稿：稳定 production topology 主链 contract

### 背景
当前已知 `production topology` 主链已经存在一定 DTO 雏形：

1. `server/services/production_dto.go` 已定义 `ProductionLineDTO` 及映射函数；
2. `server/handlers/production_topology_handlers.go` 中 `SaveProductionLineHandler` 已通过 request wrapper 组合 `ProductionLineDTO + AuthCode`；
3. `server/services/production_service.go` 已使用 `SaveProductionLineRequest` 作为 service 入口对象。

但从之前排查来看，production 子链路仍需要再做一次“边界收口”复核，确认当前 DTO 是否已经真正形成稳定 contract，还是仍存在以下问题：

- handler / service / test 对 DTO 与 model 的职责边界不够清晰；
- response wrapper 不够统一；
- 测试可能继续把旧 contract 当成默认边界。

### 改造目标
本轮不是从零重做 production DTO，而是要把 `production topology` 主链的边界钉牢：

1. 明确 `GetProductionLinesHandler` / `SaveProductionLineHandler` 的 request / response contract；
2. 明确 `ProductionService.SaveProductionLine(...)` 的 request object 与 DTO/model mapper 边界；
3. 确认测试绑定的是稳定 contract，而不是偶然沿用旧路径。

### 第一轮建议范围
#### 优先纳入本轮
1. `server/handlers/production_topology_handlers.go`
2. `server/services/production_service.go`
3. `server/services/production_dto.go`
4. 相关 production service / handler tests

#### 暂不扩展为同轮大改
1. 其它 production 子模块 DTO 化
2. 排产、报工、生产执行类子链路 DTO 化
3. 与 production 无关的 trading / inventory 链路联动改造

### 设计原则
#### 1) 优先复用既有 DTO，而不是重造 DTO
- 若 `ProductionLineDTO` 已经满足主链 contract，就优先加固其边界；
- 只在必要时补 response wrapper / mapper / request wrapper，不重复制造平行结构。

#### 2) 让 handler 与 service 的职责边界更清晰
- handler 只负责请求绑定、错误语义与 response 输出；
- service 只接受稳定 request object，并通过 mapper 进入 model。

#### 3) 不改变现有业务语义
- 版本冲突、授权码校验、事务内关联替换、审计字段处理都不能漂移。

### 预计改动文件
- `server/handlers/production_topology_handlers.go`
- `server/services/production_service.go`
- `server/services/production_dto.go`
- `server/services/production_service_test.go`
- 如有必要，极小范围调整相关 handler tests

### 风险评估
1. 若误判当前 `ProductionLineDTO` 已完全稳定，可能遗漏实际 contract 漂移点；
2. 若顺手重构整个 production 域，范围会迅速失控；
3. 若调整 request / response 结构时影响版本冲突或授权码分支，会直接破坏拓扑保存主链；
4. 若测试仍绑定旧 contract，后续 DTO 收口将持续反复。

### 验证策略
- 至少执行：
  - `go test ./services ./handlers -run "Production|Topology"`
- 重点复核：
  - production line 查询
  - production line 保存
  - 版本冲突
  - 授权码错误
  - DTO / mapper 契约是否与 handler 输出一致

### 约束与边界
- 本轮只做 `production topology` 主链 DTO 收口；
- 不顺手扩展到整个 production 域；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `production topology` DTO 收口执行前审批稿：

1. 已确认当前更像是“已有 DTO 雏形，但需要边界加固”；
2. 已确认应优先复用既有 `ProductionLineDTO` 与 `SaveProductionLineRequest`，避免重复发明 DTO；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将先复核主链现状，再按最小范围执行并跑 production 定向回归。

---

## `production` 其它子链路 DTO 收口审批稿：按子模块分阶段稳定 contract

### 背景
`production topology` 主链已经完成最小 DTO 边界加固，但 production 域并不只有 topology。一旦继续推进，必须避免把“其它子链路 DTO 收口”误做成整域大重构。

从现有代码形态看，`production` 其它子链路很可能至少包含以下几类：

1. **工艺配置类**
   - `ProcessStep`
   - `StationProcessMapping`
2. **查询/报表类**
   - 生产进度
   - 生产日历 / 看板 / 汇总
3. **潜在执行类**
   - 若存在排产、报工、执行记录等入口，也属于后续候选范围

这些子链路的风险结构并不一样：

- 配置类接口更容易出现 request 直接绑 model；
- 查询类接口更容易出现匿名 response、空数组/null 不稳定、跨层直出 model；
- 执行类接口往往和库存、订单、统计联动，改动风险更高。

### 改造目标
不是一次性“统一 production 全域 DTO”，而是：

1. 先识别 topology 之外最需要优先收口的接口；
2. 按子链路分批建立稳定 request/response contract；
3. 每一批都只做最小闭环并带验证，不把范围滚大。

### 建议优先级
#### 第一优先级：Process / Station 映射类入口
建议优先排查并收口：

1. `ListProcessSteps`
2. `SaveProcessStep`
3. `DeleteProcessStep`
4. `AssignProcessToStation`
5. `RemoveProcessFromStation`
6. `ListStationMappings`

原因：

- 当前 `production_service.go` 中这部分 service 仍直接收发 `models.ProcessStep` / `map[string][]string`；
- 相比 topology，这里 DTO 边界明显更弱；
- 但联动范围又比执行/报工链更小，适合作为 topology 之后的下一站。

#### 第二优先级：progress / report 查询类接口
建议排查：

- 生产进度
- 订单进度
- 看板/报表类 production handler / service

原因：

- 这类接口最容易发生“null vs []”、“匿名 response” 与字段漂移问题；
- 对前端契约稳定性影响大。

#### 暂缓项：执行 / 排产 / 报工类
若 production 域存在这类入口，建议后置，因为它们通常会牵连：

- 订单
- 库存
- 统计
- 凭证/财务联动

### 第一阶段建议范围
若你批准进入“production 其它子链路”的第一轮执行，我建议只先做：

1. `ProcessStep` request/response contract
2. `StationProcessMapping` request/response contract
3. 与上述两者直接相关的 handler/service/tests

不把 progress/report 和执行链一起卷进来。

### 设计原则
#### 1) 先收口配置类，再收口查询类
- 配置类入口更适合建立 DTO 模板；
- 查询类接口更容易受前端影响，放到下一轮更稳妥。

#### 2) 优先补 request wrapper / response DTO，不急于重写 service 事务
- 若当前 service 逻辑稳定，就优先在 handler 与 service 边界加 DTO；
- 不为了 DTO 化而重写核心业务过程。

#### 3) 空数组 / null contract 必须显式复核
- 尤其是 progress/report 查询接口，要明确哪些返回必须是 `[]` 而不是 `null`。

### 预计改动文件（按第一阶段）
- `server/handlers` 中 production 相关 handlers
- `server/services/production_service.go`
- 可能新增或扩展：
  - `server/services/production_dto.go`
  - 如有必要再拆 `production_process_dto.go` 一类文件
- 对应 tests

### 风险评估
1. 若不分阶段，production 域会迅速膨胀为大规模 DTO 重构；
2. 若先碰执行/排产链，联动面会超出当前可控范围；
3. 若查询类 contract 不复核空数组/null，前端很容易继续踩旧坑；
4. 若仍继续让配置类 service 直收发 `models.*`，production DTO 边界会长期半成品化。

### 验证策略
- 分阶段按子链路执行：
  - `go test ./services ./handlers -run "Production|Topology|Process|Station|Progress|Report"`
- 第一阶段重点复核：
  - process step 保存/删除
  - station-process 绑定/解绑
  - list/mapping response contract
  - 若涉及查询链，则复核空数组与 response 结构

### 约束与边界
- 本轮审批稿只定义“production 其它子链路”的分阶段策略；
- 真正执行时建议先只做 `ProcessStep + StationProcessMapping`；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `production` 其它子链路 DTO 收口执行前审批稿：

1. 已确认 topology 之外不能整域一起改，必须分阶段；
2. 已确认第一优先级应落在 `ProcessStep + StationProcessMapping`；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将先从 `ProcessStep + StationProcessMapping` 最小闭环切入，再决定是否进入 progress/report 查询链。

---

## `production` 查询/报表类 contract 收口审批稿：稳定 progress/report/dashboard/calendar response

### 背景
在 `production topology` 与 `ProcessStep + StationProcessMapping` 的配置类接口收口之后，production 域下一类高风险 contract，通常就是查询/报表接口。

这类接口的典型问题不是 request 绑 model，而是：

1. response 使用匿名结构；
2. 直接跨层暴露 `models.*`；
3. 空数据时 `null` / `[]` 语义不稳定；
4. 聚合字段缺少命名 contract，前后端都靠“默契”消费。

此前 `/dashboard/reports` 已经出现过典型问题：后端返回 `null` 导致前端 `null.length` 崩溃。这说明 production 查询类接口的 contract 稳定性，已经是明确的优先治理对象。

### 改造目标
本轮只做 **查询/报表类 response contract 收口**，不重写统计逻辑：

1. 先识别 production progress / report / dashboard / calendar 相关只读接口；
2. 把高风险匿名 response / 直出 model / `null` vs `[]` 的接口收口成稳定命名 response type；
3. 保持现有前端已依赖的字段语义和错误语义不变。

### 建议优先级
#### 第一优先级：progress / calendar 类查询
优先排查：

- production progress
- order progress
- production calendar / dashboard report 直接查询链

原因：

- 这类接口最容易因空数组/null 导致前端崩溃；
- 当前已有历史问题证明其 contract 风险真实存在。

#### 第二优先级：report / dashboard 聚合类接口
优先检查：

- 是否仍使用匿名 response
- 是否直接暴露内部 model
- 是否聚合字段没有正式命名结构

### 第一阶段建议范围
若你批准进入这一轮执行，我建议先只做：

1. `production progress` / `order progress` 查询链
2. 明确空数据统一返回 `[]`
3. 如有必要，为 response 增加最小命名 DTO / wrapper

先不把所有 dashboard/report 一起卷进来。

### 设计原则
#### 1) 先稳 response，再考虑 service 内部抽象
- 查询类接口优先保证外部 response shape 稳定；
- 若内部 service 逻辑已经稳定，不为 DTO 化而重写聚合算法。

#### 2) 空数组 contract 必须显式固定
- 对“列表 / 时间序列 / 聚合结果数组”类型的接口，空数据统一返回 `[]`；
- 不允许继续返回 `null` 让前端自行兜底。

#### 3) 命名 response type 优先于匿名 struct
- 即使只是只读聚合结果，也应该有正式命名的 response type；
- 避免字段悄悄漂移。

### 预计改动文件
- `server/handlers` 中 production progress / report / dashboard / calendar 相关 handlers
- 对应 service 文件
- 可能新增或扩展 production 查询 DTO 文件
- 对应 handler/service tests

### 风险评估
1. 若把范围拉得过大，容易扩成整个 dashboard/report 体系重构；
2. 若改变现有字段名或空态语义，可能直接打坏前端图表/列表；
3. 若查询接口仍保留匿名 response，后续每次字段调整都可能再次引入 contract 回归；
4. 若忽略空数组/null 问题，前端仍会持续踩稳定性坑。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"`
- 重点复核：
  - 空数据返回 `[]`
  - response shape 稳定
  - 错误状态码不变
  - 历史 `/dashboard/reports` 类问题不回归

### 约束与边界
- 本轮只做查询/报表类 response contract 收口；
- 不扩展为执行/排产/报工链路改造；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `production` 查询/报表类 contract 收口执行前审批稿：

1. 已确认这类接口的首要问题是 response shape 和空数据语义稳定性；
2. 已确认第一阶段应先从 progress / calendar 查询链切入；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将先定位相关 handler/service，再按最小范围执行与回归验证。

---

## `production` 查询/报表类 contract 收口第二阶段审批稿：report / dashboard / calendar 剩余聚合接口

### 背景
第一阶段已经完成：

1. `GetProductionPlansHandler`
2. `GetProductionStatsHandler`
3. `GetOrderProgressHandler`

的 response contract 收口，并固定了命名 response type 与空数组语义。

但 production 查询/报表类仍未完全收口。剩余高风险接口大概率集中在：

- report 类聚合查询
- dashboard 卡片/统计查询
- calendar / timeline 相关查询

这类接口通常不是简单列表，而是聚合后的嵌套结构、时间序列结构或卡片统计结构，因此更容易长期依赖匿名 response。

### 改造目标
第二阶段只做一件事：

1. 继续收口第一阶段未覆盖的 production 聚合只读接口；
2. 将剩余匿名 response / 直出 model / 空态不清晰的接口切到正式命名 response type；
3. 保持前端已依赖字段语义、错误语义与过滤参数行为不变。

### 建议范围
#### 优先纳入本轮
1. production dashboard 聚合接口
2. production calendar / timeline 查询接口
3. 其它 report 型只读聚合接口

#### 不纳入本轮
1. 写接口
2. 执行 / 排产 / 报工链路
3. 已在第一阶段完成收口的 plans/stats/order-progress

### 实施策略
#### 1) 复用第一阶段 query DTO 模式
- 优先扩展 `production_query_dto.go` / `production_query_mapper.go` 或在必要时拆独立 query DTO 文件；
- 不重复定义第一阶段已稳定的 response contract。

#### 2) 先从 handler 出口收口
- 若内部查询逻辑稳定，优先保持 service / SQL 不变；
- 在 handler 输出层补齐命名 response type 与空态处理。

#### 3) 显式固定数组空态
- 时间序列、列表、图表数据点等数组字段，空数据时统一返回 `[]`；
- 不允许模糊成 `null`。

### 预计改动文件
- `server/handlers` 中 production report / dashboard / calendar 相关 handlers
- 对应 service 文件（若 handler 之外已有聚合 struct）
- `server/services/production_query_dto.go`
- `server/services/production_query_mapper.go`
- 对应 handler / service tests

### 风险评估
1. 若字段名调整不谨慎，会直接打坏前端图表与卡片渲染；
2. 若空态语义未统一，前端仍会出现 `null.length`、空态误判或渲染分支混乱；
3. 若顺手重写聚合算法，范围会从 contract 收口扩大为报表逻辑重构；
4. 若 response 结构继续匿名，后续每次聚合字段扩展都可能再次引入回归。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"`
- 重点复核：
  - response shape 稳定
  - 数组字段空数据返回 `[]`
  - 错误状态码与错误语义不变
  - dashboard / calendar 前端已依赖字段不漂移

### 约束与边界
- 本轮只做 report / dashboard / calendar 剩余聚合只读接口；
- 不扩展为写接口或执行链路改造；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 production 查询/报表类第二阶段执行前审批稿：

1. 已确认第一阶段完成后，剩余高风险接口集中在 report / dashboard / calendar 聚合只读接口；
2. 已确认第二阶段应继续沿用命名 response type + 空数组显式语义的收口模式；
3. 在你明确批准前，不开始本轮业务代码修改；
4. 你批准后，我将先定位剩余聚合接口，再按最小范围执行与回归验证。

---

## A 级 DTO 总推进审批稿：workflow / trading / inventory / production / finance 核心边界分阶段收口

### 背景
当前仓库里与 ERP + MES 主链最相关、DTO 价值最高的一组模块，已经可以明确归纳为 A 级：

1. `workflow`
2. `sales_orders`
3. `purchase_orders`
4. `inventory` 命令链
5. `production` 主配置链
6. `production` 核心查询链
7. `voucher / finance` 核心读接口

但这组模块不能按“全部同时开始改”的方式推进。原因很明确：

- 它们横跨采购、销售、库存、生产、审批、财务；
- 存在大量跨域联动；
- 任何一个模块若顺手扩大范围，都可能把其他模块的稳定 contract 一起拖进来。

因此，本节定义的不是“单轮大改任务”，而是一个 **A 级总推进的分阶段执行计划**。

### 总体目标
目标不是一次性全面 DTO 化，而是：

1. 守住已完成模块的边界，不让 contract 回退；
2. 继续收口当前仍然最危险、最核心、最容易造成系统性风险的主链；
3. 每一阶段都只做一个最小闭环，并带有清晰回归验证。

### 当前模块状态判断
#### 已有主边界、进入“守边界/补缺口”状态
1. `workflow`
2. `sales_orders`
3. `purchase_orders`
4. `production` 主配置链
5. `production` 核心查询链

这些模块当前已经完成主要 DTO 收口或最小闭环，后续优先策略应是：

- 防回退
- 补剩余缺口
- 新接口默认走 DTO

而不是再进行无差别重写。

#### 当前最值得进入新实现阶段的 A 级模块
1. `inventory` 命令链
2. `voucher / finance` 核心读接口

### 建议阶段顺序
#### 阶段 1：Inventory 命令链 DTO 收口
建议优先覆盖：

1. 入库命令链
2. 出库命令链
3. commit / void / confirm 等状态型 command
4. 与订单状态、库存数量、成本、凭证联动最强的 response / error contract

原因：

- 当前风险最高；
- 联动最深；
- 一旦 contract 模糊，最容易演化成“写链炸全局”。

#### 阶段 2：Voucher / Finance 核心读接口 DTO 加固
建议优先覆盖：

1. voucher list
2. voucher detail
3. query filter / includeEntries contract
4. 空数据返回语义

原因：

- finance 读接口需要极稳；
- 相比 inventory 命令链，查询改造更可控；
- 能尽快补齐 A 级 finance 边界。

#### 阶段 3：A 级已完成模块的缺口补齐（按需）
仅在发现真实新缺口时执行：

- workflow 新接口或新 response 漂移点
- sales / purchase 新增聚合查询
- production 新增高风险读/写边界

### 设计原则
#### 1) A 级总推进不等于“一次性全面开工”
- 只允许按阶段推进；
- 每一阶段必须有单独审批与验证边界。

#### 2) 已完成模块以“守边界”优先
- 对 `workflow/trading/production` 已完成链路，后续优先防回退；
- 不为凑整齐而重复大改。

#### 3) 优先 command 风险高的写链，再处理 finance 核心读链
- 对 ERP + MES，inventory 命令链的 contract 风险高于一般读接口；
- finance 读接口则更强调稳定和可审计。

### 风险评估
1. 若把 A 级总推进理解为“大一统重构”，会直接失控；
2. 若在 inventory 命令链中同时改事务逻辑和 contract，风险极高；
3. 若 finance 读接口继续直出 model，后续字段扩展会持续产生前后端 contract 漂移；
4. 已完成模块若缺乏守边界策略，后续新增接口仍可能把旧问题重新带回来。

### 验证策略
- 按阶段执行定向回归：
  - `go test ./handlers ./services ./routes -run "Workflow|Trading|PurchaseOrder|SalesOrder|Inventory|Finance|Voucher|Production"`
- 若进入 inventory 阶段，应再进一步聚焦：
  - `Inventory|Inbound|Shipment|Commit|Void|PurchaseOrder|SalesOrder`
- 若进入 finance/voucher 阶段，应再进一步聚焦：
  - `Voucher|Finance`

### 约束与边界
- 本节只定义 A 级总推进的分阶段方案；
- 不允许据此直接并行大改所有 A 级模块；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 A 级 DTO 总推进执行前审批稿：

1. 已确认 A 级模块范围；
2. 已确认执行顺序应先 `inventory` 命令链，再 `voucher / finance` 核心读接口；
3. 在你明确批准前，不开始 A 级总推进下的业务代码修改；
4. 你批准后，我将按阶段先进入 `inventory` 命令链 DTO 收口，不会并行摊开所有 A 级模块。

---

## A 级模块 contract 巡检审批稿：检查新增接口是否回退到 `models.*`

### 背景
当前 A 级总推进已经完成两类关键实施：

1. `inventory` 命令链第一轮 DTO 收口
2. `voucher / finance` 核心读接口 DTO 加固

同时，`workflow`、`sales_orders`、`purchase_orders`、`production` 主配置链与核心查询链也已完成主要边界收口。

这时最合理的下一步，不是马上继续扩新模块，而是做一轮 **A 级模块 contract 巡检**，确认这些已完成模块中，是否因为后续新增接口或局部修复而出现边界回退。

### 巡检目标
本轮目标不是大改代码，而是识别以下问题：

1. handler 是否重新直接绑定或返回 `models.*`
2. 新增接口是否使用匿名 request / response 结构替代正式 DTO
3. 聚合查询是否回退到匿名 response、未命名 wrapper 或空态语义不稳定
4. tests 是否重新耦合到底层 model，而没有继续锁定稳定 contract

### 巡检范围
仅限当前 A 级模块：

1. `workflow`
2. `sales_orders`
3. `purchase_orders`
4. `inventory` 命令链
5. `production` 主配置链
6. `production` 核心查询链
7. `voucher / finance` 核心读接口

### 巡检方法
#### 1) handler 出口检查
重点检查：

- `c.ShouldBindJSON(&models.Xxx{})`
- `c.JSON(..., model)`
- handler 内匿名 struct request/response

#### 2) service contract 检查
重点检查：

- service 对外公开函数是否又开始直接收发 `models.*`
- 是否新增未命名 query/result struct 跨层传递

#### 3) test contract 检查
重点检查：

- handler tests 是否继续以 response DTO 断言
- 是否重新直接用 model 作为外部 response 断言

#### 4) 聚合查询空态检查
重点检查：

- `[]` vs `null`
- list/dashboards 是否存在匿名 response 回退

### 输出结果形式
巡检输出建议分三类：

1. **Green**：边界稳定，无需动作
2. **Yellow**：存在轻微漂移，建议后续补缺口
3. **Red**：已回退到高风险 contract，建议立即单独开闭环修复

### 执行原则
#### 1) 巡检优先于修改
- 本轮先得到完整清单；
- 不默认边查边改，避免范围膨胀。

#### 2) 若发现缺口，再按模块开小闭环
- 例如：
  - workflow 缺口一轮
  - inventory 缺口一轮
  - voucher 缺口一轮

#### 3) 已完成模块以“防回退”为第一目标
- 不为“更整齐”而重做已稳定链路；
- 只修真实缺口。

### 风险评估
1. 若直接边巡检边改，极容易失去边界；
2. 若缺乏统一判定标准，不同模块容易出现“看起来差不多，但实际 contract 水平不一致”；
3. 若 tests 回退到底层 model，未来新增接口时会持续放大 contract 漂移风险。

### 验证策略
- 第一阶段：静态巡检（grep + read）
- 第二阶段：仅对确认存在缺口的模块做局部修复
- 若进入修复阶段，再执行：
  - `go test ./handlers ./services ./routes -run "Workflow|Trading|PurchaseOrder|SalesOrder|Inventory|Finance|Voucher|Production"`
  - 或按缺口所属模块执行更细粒度回归

### 约束与边界
- 本轮只做 A 级模块 contract 巡检规划；
- 在你明确批准前，不开始巡检后的业务代码修复；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 A 级模块 contract 巡检执行前审批稿：

1. 已确认巡检目标是“找回退点”，不是立即大改；
2. 已确认巡检范围仅限当前 A 级模块；
3. 在你明确批准前，不开始新的业务代码修复；
4. 你批准后，我将先做静态巡检并给出 Green / Yellow / Red 清单，再决定是否进入补缺口执行。

---

## `workflow` contract 补缺口小闭环审批稿：修正 service 对外仍收发 `models.Workflow*` 的 Yellow 缺口

### 背景
在 A 级模块巡检中，`workflow` 被判定为 **Yellow**，原因不是 handler 侧完全失控，而是：

- `workflow` 已经具备 response DTO 与 mapper；
- 但部分 service 对外公开函数仍直接返回 `models.WorkflowInstance` / `models.WorkflowTask`；
- 这会导致后续新增 handler 或跨模块调用时，更容易绕回 model-first 方式，形成 contract 回退。

因此，本轮不需要重做 workflow，而是做一个 **补缺口小闭环**。

### 改造目标
本轮只做：

1. 修正 `workflow` service 对外 contract 中仍直接收发 `models.Workflow*` 的关键暴露点；
2. 让 service / handler / mapper 继续对齐到正式 response contract；
3. 不重写 workflow 事务与状态流转逻辑。

### 建议范围
#### 第一优先级
优先排查与补齐：

1. `ApproveWorkflowTask(...)`
2. `RejectWorkflowTask(...)`
3. `ListWorkflowTasks(...)`

原因：

- 它们直接对应已存在的外部 API；
- 已有 handler / mapper contract 可以复用；
- 是最容易在新增接口时继续把 `models.Workflow*` 外溢的点。

#### 第二优先级（按需）
若第一优先级修完后仍发现同类缺口，再补：

- instance list / detail 查询 service 边界
- 其它直接暴露 workflow model 的公开 service

### 实施策略
#### 1) 优先补 service result object，不重写事务逻辑
- 若当前 service 事务与业务逻辑稳定，则保持事务代码不动；
- 重点收口 service 返回对象与 mapper 边界。

#### 2) 复用现有 mapper / response DTO
- 不重复定义第二套 workflow response；
- 尽量复用现有 `WorkflowInstanceResponse` / `WorkflowTaskResponse` 相关 mapper。

#### 3) 只修真实 Yellow 缺口
- 不顺手重构整个 workflow 模块；
- 不把“补缺口”扩大成“workflow 第二轮全面 DTO 化”。

### 预计改动文件
- `server/services/workflow_service.go`
- `server/services/workflow_*dto.go` / `workflow_mapper.go`（按实际需要）
- `server/handlers` 中与 workflow task / instance 相关的 handler（仅当 call site 需要同步）
- `server/services/*workflow*test.go`
- `server/handlers/*workflow*test.go`

### 风险评估
1. 若顺手修改 workflow 事务逻辑，风险会远高于 contract 补缺口本身；
2. 若 service contract 和 handler contract 继续长期不一致，后续新增接口很容易直接回退到 `models.Workflow*`；
3. 若不复用现有 mapper，而是再造一套 workflow response，反而会制造重复 contract。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Workflow"`
- 重点复核：
  - 审批 / 驳回 response
  - task list response
  - instance 查询返回是否继续稳定
  - 既有 workflow 挂接与状态流转不回归

### 约束与边界
- 本轮只做 `workflow` Yellow 缺口补齐；
- 不扩展到 trading / inventory / production；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `workflow` contract 补缺口执行前审批稿：

1. 已确认这是一个 Yellow 缺口补齐任务，不是 workflow 全面重做；
2. 已确认应优先修正 service 对外仍收发 `models.Workflow*` 的链路；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先从审批/驳回与 task list 相关 service contract 切入，按最小闭环执行。

---

## `production` Yellow 缺口统一化审批稿：主配置链与核心查询链 contract 风格补齐

### 背景
在 A 级模块巡检中，`production` 被判定为 **Yellow**，但不是因为主链回退严重，而是因为：

- `production` 主配置链与核心查询链已经完成主要 DTO 收口；
- 但部分读接口仍以“直接返回 DTO slice / map / alias”的形式存在，缺少更统一的命名 response 风格；
- 查询链与写链在部分文件内仍混放，导致模块的 contract 边界看起来已收口但不够整齐，后续新增接口时更容易回退到匿名风格。

因此，本轮不应重做 production，而应做一个 **Yellow 缺口统一化小闭环**。

### 改造目标
本轮只做：

1. 提高 `production` 主配置链与核心查询链的 contract 风格一致性；
2. 用最小补强方式提升防回退能力；
3. 不重写 production 事务、保存逻辑或核心聚合 SQL。

### 建议范围
#### 第一优先级：主配置链读接口统一化
优先排查：

1. `GetProductionLinesHandler`
2. `GetProcessStepsHandler`
3. `GetStationMappingsHandler`

关注点：

- 是否需要更明确的命名 response type / wrapper；
- 是否仍停留在“虽然返回 DTO，但 contract 命名不够完整”的状态。

#### 第二优先级：核心查询链风格统一化
优先排查：

1. `GetProductionPlansHandler`
2. `GetProductionStatsHandler`
3. `GetOrderProgressHandler`

关注点：

- query DTO 是否已足够稳定；
- 是否需要在文件边界、mapper 入口或 response wrapper 上再做轻量统一；
- 不碰现有已稳定的空数组与字段语义。

### 实施策略
#### 1) 优先补 wrapper / response type，不动核心逻辑
- 如果当前问题只是 contract 风格不统一，就优先补命名 response type；
- 不为“整齐”而重写查询逻辑或事务代码。

#### 2) 复用既有 production DTO / mapper
- 继续复用：
  - `production_dto.go`
  - `production_process_dto.go`
  - `production_query_dto.go`
- 不重复定义第二套 production response。

#### 3) 只修 Yellow 缺口，不扩大范围
- 不重新做 production topology
- 不重新做 ProcessStep / StationProcessMapping
- 不重新做 plans/stats/order-progress 的核心逻辑

### 预计改动文件
- `server/handlers/production_topology_handlers.go`
- `server/handlers/production_process_handlers.go`
- `server/handlers/production_station_mapping_handlers.go`
- `server/handlers/production_plans.go`
- `server/services/production_dto.go`
- `server/services/production_process_dto.go`
- `server/services/production_query_dto.go`
- 如有必要补少量 handler/service tests

### 风险评估
1. 若把统一化误做成生产域重构，收益会远小于风险；
2. 若不统一，现有“看起来像 DTO，但 contract 命名不够完整”的边缘点会成为后续回退入口；
3. 若动到已稳定的空数组语义或查询字段名，前端看板和报告页会立即受影响。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Production|Topology|Process|Station|Progress"`
- 重点复核：
  - 主配置链读接口 response shape
  - 核心查询链空态语义
  - 已有 DTO / mapper 输出的一致性

### 约束与边界
- 本轮只做 `production` Yellow 缺口统一化；
- 不扩展到 workflow / trading / inventory / finance；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `production` Yellow 缺口统一化执行前审批稿：

1. 已确认这是 Yellow 统一化任务，不是 production 第二轮大改；
2. 已确认应优先统一主配置链读接口与核心查询链的 contract 风格；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先从主配置链读接口的 wrapper / 命名 response 一致性切入，再决定是否补核心查询链的轻量统一化。

---

## `production` 核心查询链轻量风格统一化审批稿：plans / stats / order-progress

### 背景
`production` Yellow 缺口统一化第一步已经完成主配置链读接口 wrapper 统一。接下来若继续推进，最合理的下一步不是再回头动主配置链，而是对核心查询链做一轮 **轻量风格统一化**。

这里的“轻量”有明确边界：

- 不重新做 query DTO；
- 不改写 plans / stats / order-progress 的查询逻辑；
- 不改变空数组语义、字段名和前端已依赖 contract。

### 改造目标
本轮只做：

1. 提高 `GetProductionPlansHandler`、`GetProductionStatsHandler`、`GetOrderProgressHandler` 的输出风格一致性；
2. 在不改变 response 语义的前提下，让 mapper / response 入口更清晰；
3. 降低核心查询链后续新增接口继续沿用不整齐风格的概率。

### 建议范围
#### 目标接口
1. `GetProductionPlansHandler`
2. `GetProductionStatsHandler`
3. `GetOrderProgressHandler`

#### 关注点
1. response wrapper 是否足够明确
2. handler 与 mapper 的边界是否足够清晰
3. 读写接口同文件共存是否已经形成维护性噪音，若有必要是否做最小拆分

### 实施策略
#### 1) 保持 contract 语义完全不变
- 不改字段名；
- 不改数组空态；
- 不改 SQL / 聚合逻辑；
- 不改第一阶段已稳定的 query DTO 定义。

#### 2) 优先做“风格统一”，不做“逻辑重构”
- 若当前问题能通过 wrapper / mapper 入口清晰化解决，就不拆逻辑；
- 若文件边界确实影响可维护性，再做最小拆分，而不是大调整。

#### 3) 复用现有 query DTO / mapper
- 继续复用：
  - `production_query_dto.go`
  - `production_query_mapper.go`
- 不再引入第二套查询 response。

### 预计改动文件
- `server/handlers/production_plans.go`
- `server/services/production_query_dto.go`
- `server/services/production_query_mapper.go`
- 如有必要补少量 handler tests

### 风险评估
1. 若把轻量统一化做成 query 重构，会破坏第一阶段已稳定 contract；
2. 若误动 `order-progress` 空数组语义，前端 dashboard / calendar 相关页面会立即受影响；
3. 若为“整齐”过度拆文件，收益可能低于维护成本。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"`
- 重点复核：
  - plans response shape
  - stats response shape
  - order-progress 空数组语义
  - 前端已依赖字段名未漂移

### 约束与边界
- 本轮只做 `production` 核心查询链轻量风格统一化；
- 不扩展到 workflow / trading / inventory / finance；
- 不改变既有中文用户面错误语义；
- 用户面消息保持中文，日志保持英文。

### 当前状态与暂停点
本节当前仅为 `production` 核心查询链轻量风格统一化执行前审批稿：

1. 已确认这是轻量风格统一化任务，不是 query 第二轮重做；
2. 已确认只处理 plans / stats / order-progress；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先复核 `production_plans.go` 与现有 query DTO/mapper，再按最小闭环执行。

---

## A 级模块 contract 回归巡检（第二轮）执行方案

### 背景
`workflow` 与 `production` 的 Yellow 缺口已经完成补齐，`inventory`、`voucher / finance` 也已完成前序 DTO 收口。当前最合理的下一步不是立刻扩到新的大模块，而是先对已收口的 A 级模块做一次 **第二轮 contract 回归巡检**，确认没有新增回退。

### 目标
本轮目标是：

1. 用一次面向 contract 的静态扫描确认最近已收口模块没有回退；
2. 对命中的问题做 Green / Yellow / Red 分级；
3. 只产出结论与后续最小闭环建议，不在巡检阶段默认扩展成大改。

### 巡检范围
#### 第一层：优先模块
- `workflow`
- `production`
- `inventory`
- `voucher / finance`

#### 第二层：相邻挂接面（按需）
- `sales_orders`
- `purchase_orders`

### 扫描重点
1. `models.*` 是否重新暴露到 handler / service 对外 contract
2. 是否重新出现匿名 request / response
3. handler 是否直接返回裸 model / 裸 slice / 裸 map
4. 新增接口是否绕过既有 DTO / mapper / wrapper 体系

### 建议扫描方法
1. 先用代码搜索定位目标模块中的：
   - `models.`
   - `c.JSON(`
   - `var input struct`
   - `[]models.`
   - `map[string]`
2. 再结合关键 handler / service 文件做人工复核，避免误报；
3. 输出时按模块分组，并给出命中类型与原因。

### 分级标准
#### Green
- 已收口模块未发现新的外部 contract 回退；
- 现有裸 slice / map 若已在既有统一方案内被明确接受，可维持 Green。

#### Yellow
- 存在 1~2 个小范围 contract 风格不一致点；
- 能通过补 DTO / wrapper / mapper 在最小闭环内修复。

#### Red
- 出现 service / handler 大面积重新暴露 model；
- 或新增接口系统性绕开 DTO / mapper 体系；
- 或存在会直接影响外部契约稳定性的高风险回退。

### 预期输出
1. 模块级结论清单（Green / Yellow / Red）
2. 命中文件与问题类型
3. 最值得优先处理的小闭环建议

### 风险与边界
- 本轮是巡检，不是功能改造；
- 不主动改业务逻辑；
- 不扩展到权限链、前端 UI、报表逻辑或数据库结构；
- 若发现缺口，需单独回到审批流程开下一轮小闭环。

### 当前状态
本节当前作为 A 级模块 contract 回归巡检（第二轮）的执行方案：

1. 已确认本轮目标是巡检和分级，而不是立即改代码；
2. 已确认优先检查 `workflow`、`production`、`inventory`、`voucher / finance`；
3. 已确认如发现 Yellow / Red 缺口，再单独开最小闭环；
4. 接下来将先执行代码搜索与关键文件复核，再输出巡检结论。

---

## `inventory query + commit contract` 补缺口执行方案

### 背景
在 A 级模块 contract 回归巡检（第二轮）中，`inventory` 被判定为 **Yellow**，问题集中在两个边界：

1. `inventory_query_service.go` 对外仍直接返回 `[]models.*`；
2. `CommitShipment` 公开 service 仍返回 `models.ShipmentRecord`；
3. `inventory_query_handlers.go` 仍使用 `gin.H{"items": ...}` 直接承载 model slice 输出。

这说明 `inventory` 第一轮命令链 DTO 收口完成后，查询链和个别 command service 公开返回值仍存在补缺口空间。

### 目标
本轮只做：

1. 将 inventory query service 对外返回值切到正式 DTO；
2. 为 inventory query handler 提供正式命名 paged response wrapper；
3. 将 `CommitShipment` 公开 service 返回值切到正式 DTO；
4. 不改库存业务逻辑、分页逻辑与事务逻辑。

### 建议范围
#### 第一部分：query chain
- `server/services/inventory_query_service.go`
- `server/handlers/inventory_query_handlers.go`
- 如缺少类型，新增独立文件：
  - `server/services/inventory_query_dto.go`
  - `server/services/inventory_query_mapper.go`

#### 第二部分：command service return contract
- `server/services/inventory_command_service.go`
- `server/handlers/inventory_command_handlers.go`

### 实施策略
#### 1) query 使用独立 DTO / mapper
- 优先新建独立 query DTO / mapper 文件；
- 不把 query response 继续堆叠到 command DTO 文件；
- 保持命令链与查询链边界清晰。

#### 2) `CommitShipment` 复用已有 shipment response DTO
- 优先复用 `InventoryShipmentRecordResponse`；
- 不重复定义第二套 shipment commit response。

#### 3) 只修 contract，不改逻辑
- 不改库存扣减逻辑；
- 不改分页逻辑；
- 不改错误状态码与中文错误语义；
- 不改 `RecordInbound/Shipment/Void` 已稳定 contract。

### 预计改动文件
- `server/services/inventory_query_service.go`
- `server/services/inventory_command_service.go`
- `server/handlers/inventory_query_handlers.go`
- `server/handlers/inventory_command_handlers.go`
- `server/services/inventory_query_dto.go`（如不存在则新增）
- `server/services/inventory_query_mapper.go`（如不存在则新增）
- 如有必要补充 inventory handler/service tests

### 风险评估
1. 若误改分页结构或字段名，库存列表页会直接受影响；
2. 若误动 `CommitShipment` 事务逻辑，会影响库存扣减与销售履约联动；
3. 若把 query DTO 混进 command DTO 文件，会进一步加重文件堆叠，不利于后续维护。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory"`
- 重点复核：
  - inventory list / inbound history / shipment history response shape
  - commit shipment response shape
  - commit 后库存与单据状态联动未回归

### 当前状态
本节当前作为 `inventory query + commit contract` 补缺口的执行方案：

1. 已确认本轮只处理 query + commit contract Yellow 点；
2. 已确认优先通过独立 query DTO / mapper + 复用 shipment DTO 的最小方案执行；
3. 已确认不改库存业务逻辑；
4. 接下来将先补 query contract 类型，再落 service / handler 改动并执行 Inventory 定向回归。

---

## `sales_orders` contract 小闭环审批稿

### 背景
`workflow`、`production`、`inventory`、`voucher / finance` 的 A 级主链 contract 已完成多轮收口与巡检。下一步若继续推进 A 级模块，`sales_orders` 是最合适的下一个小闭环候选，因为它：

- 属于核心单据主链；
- 已与 workflow 存在挂接；
- 一旦 contract 不稳，容易影响创建、保存、状态流转与跨模块联动。

### 改造目标
本轮目标不是重做 `sales_orders`，而是：

1. 复核 `sales_orders` 当前对外 contract 是否还存在明显缺口；
2. 识别最值得优先处理的一个最小闭环；
3. 在你批准后，只对命中的最小闭环做收口。

### 优先排查范围
#### 第一层：handler / service 外部 contract
- `server/handlers/sales_orders.go`
- `server/services/*sales*`

#### 第二层：workflow 挂接面
- 销售订单创建 / 保存时与 workflow instance 的交互边界
- 订单读接口是否暴露 workflow 相关 model 字段而缺少正式 response contract

### 重点问题类型
1. `models.SalesOrder` / `models.SalesOrderLine` 是否直接暴露到外部 contract
2. 是否存在匿名 request / response
3. 是否存在裸 model / 裸 slice / 裸 map 输出
4. workflow 挂接点是否仍未通过明确 DTO / response wrapper 固化

### 实施策略
#### 1) 先找最小闭环，不预设全面改造
- 如果命中点集中在单条保存 / 查询链，就先只处理那一条；
- 如果命中点集中在 workflow 挂接面，就先收口挂接面 contract；
- 不默认扩展到 sales fulfillment、invoice 或 shipment 全链。

#### 2) 不改业务逻辑，只收口 contract
- 不改销售订单状态机；
- 不改 workflow 创建逻辑；
- 不改已有中文错误语义；
- 不改订单字段含义与现有前端依赖。

### 预计改动文件（待复核后收敛）
- `server/handlers/sales_orders.go`
- `server/services/*sales*`
- 如缺少类型，补独立 sales DTO / mapper 文件
- 如有必要补少量 `SalesOrder|Workflow` 定向测试

### 风险评估
1. 若把小闭环误做成 trading 域大改，会放大风险；
2. 若误动 workflow 挂接逻辑，可能影响建单即发起流程的稳定性；
3. 若不先做复核，容易在错误位置投入过多改造成本。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "SalesOrder|Workflow"`
- 重点复核：
  - 保存 / 查询 response shape
  - workflow instance 挂接稳定性
  - 外部 contract 是否已脱离直接 model 暴露

### 当前状态与暂停点
本节当前仅为 `sales_orders` contract 小闭环执行前审批稿：

1. 已确认本轮只做 `sales_orders` 最小闭环，而不是整个 trading 域重构；
2. 已确认优先复核 handler / service contract 与 workflow 挂接面；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先扫描 `sales_orders` 相关 handler / service，再给出最小改动范围并执行。

---

## `purchase_orders` contract 小闭环审批稿

### 背景
第二轮 A 级模块巡检收尾后，若继续推进核心单据主链，`purchase_orders` 是当前最自然的下一步。原因是：

- 它与 `sales_orders` 形成对称主链；
- 已与 workflow 存在挂接关系；
- 若 contract 不稳，会影响建单、保存、收货联动与流程边界稳定性。

### 改造目标
本轮目标不是重做 `purchase_orders`，而是：

1. 复核 `purchase_orders` 当前对外 contract 是否存在明显缺口；
2. 识别最值得优先处理的一个最小闭环；
3. 在你批准后，只对命中的最小闭环做收口。

### 优先排查范围
#### 第一层：handler / service 外部 contract
- `server/handlers/purchase_orders.go`
- `server/services/*purchase*`

#### 第二层：workflow 挂接面
- 采购单创建 / 保存时与 workflow instance 的交互边界
- 采购单读接口是否暴露 workflow 相关 model 字段而缺少正式 response contract

### 重点问题类型
1. `models.PurchaseOrder` / `models.PurchaseOrderLine` 是否直接暴露到外部 contract
2. 是否存在匿名 request / response
3. 是否存在裸 model / 裸 slice / 裸 map 输出
4. workflow 挂接点是否仍未通过明确 DTO / response wrapper 固化

### 实施策略
#### 1) 先找最小闭环，不预设全面改造
- 如果命中点集中在单条保存 / 查询链，就先只处理那一条；
- 如果命中点集中在 workflow 挂接面，就先收口挂接面 contract；
- 不默认扩展到 purchase receipt、inventory inbound 或 voucher 全链。

#### 2) 不改业务逻辑，只收口 contract
- 不改采购单状态机；
- 不改 workflow 创建逻辑；
- 不改已有中文错误语义；
- 不改采购单字段含义与现有前端依赖。

### 预计改动文件（待复核后收敛）
- `server/handlers/purchase_orders.go`
- `server/services/*purchase*`
- 如缺少类型，补独立 purchase DTO / mapper 文件
- 如有必要补少量 `PurchaseOrder|Workflow` 定向测试

### 风险评估
1. 若把小闭环误做成 procurement 域大改，会放大风险；
2. 若误动 workflow 挂接逻辑，可能影响建单即发起流程的稳定性；
3. 若误碰收货 / 入库联动，容易把风险扩散到 inventory。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "PurchaseOrder|Workflow"`
- 重点复核：
  - 保存 / 查询 response shape
  - workflow instance 挂接稳定性
  - 外部 contract 是否已脱离直接 model 暴露

### 当前状态与暂停点
本节对应的 `purchase_orders` contract 小闭环已执行完成：

1. 已确认并实际按最小范围收口采购收货确认链；
2. 已完成命名 request DTO、service 正式 response DTO 与 request -> input mapper 收口；
3. 已完成 `go test ./handlers ./services -run "PurchaseOrder|Workflow"` 定向验证；
4. 当前该闭环结果已并入第二轮 A 级模块收尾结论。

## A 级模块 contract 防回退测试（审批稿）

### 背景
第二轮 A 级模块 contract 巡检与最小闭环已经完成了两类结果：

1. `inventory` 已完成 query + commit contract 补缺口；
2. `purchase_orders` 已完成收货确认链 contract 最小闭环；
3. `sales_orders` 经复核后主链基本 Green，暂不进入代码改造。

下一步最合适的收口方向，不是继续扩大业务改造，而是把上述关键结论转成可回归的防回退测试，提升后续稳定性。

### 改造目标
本轮目标限定为：

1. 为 A 级模块关键 contract 边界补最小必要的定向测试；
2. 固化 response shape、DTO 边界与 workflow 挂接关键断言；
3. 防止后续改动把已收口的 contract 回退为匿名 struct、裸 model 或不稳定响应。

### 优先覆盖范围
#### 第一优先级：已收口的 Yellow 点
- `server/services/inventory_query_service.go`
- `server/handlers/inventory_query_handlers.go`
- `server/services/inventory_command_service.go`
- `server/handlers/purchase_orders.go`
- `server/services/purchase_receipt_confirm_service.go`

#### 第二优先级：已判定 Green、但值得固化的主链
- `server/handlers/sales_orders.go`
- 与 `SalesOrder|Workflow` 相关的既有测试文件

### 重点断言类型
1. handler 返回值 shape 是否仍为正式命名 response；
2. service 对外返回是否仍为 DTO，而非 `models.*`；
3. purchase / sales 创建与 workflow 挂接的关键结果是否稳定；
4. 空列表、分页列表、收货确认结果等关键外部 contract 是否仍保持既有字段结构。

### 实施策略
#### 1) 只补最小必要测试，不扩大到测试体系重构
- 不重写已有测试基建；
- 不追求一次性覆盖所有 A 级模块；
- 优先围绕本轮已确认的关键 contract 边界补点状测试。

#### 2) 优先复用既有测试文件与测试数据模式
- 尽量落在既有 `handlers` / `services` 模块测试文件中；
- 复用当前 SQLite / GORM / handler 测试搭建方式；
- 避免无必要新增大而散的测试骨架。

#### 3) 不改变业务语义
- 不借测试补强之名改业务逻辑；
- 如测试暴露真实 contract 漏洞，再单独开新闭环处理；
- 本轮默认只做防回退固化，不做功能扩展。

### 预计改动文件（待批准后收敛）
- `server/handlers/*test.go`
- `server/services/*test.go`
- 如确有必要，补极少量测试辅助函数，但不新增复杂测试框架

### 风险评估
1. 若范围失控，容易把“防回退测试”做成测试体系重构；
2. 若断言写得过细，可能把正常演进误判为回归；
3. 若测试与业务实现耦合过深，会提高后续维护成本。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory|PurchaseOrder|SalesOrder|Workflow"`
- 重点关注：
  - 既有通过用例不回退
  - 新增 contract 定向断言稳定
  - workflow 挂接与 response shape 不被破坏

### 当前状态与暂停点
本节对应的 A 级模块 contract 防回退测试第一批已执行完成：

1. 已按最小范围覆盖 `inventory`、`purchase_orders`、`sales_orders` 的关键 contract 边界；
2. 已补 response shape、DTO 边界与 workflow 挂接关键断言；
3. 已完成 `go test ./handlers ./services -run "Inventory|PurchaseOrder|SalesOrder|Workflow"` 定向验证；
4. 当前该批测试结果已并入第二轮 A 级模块收尾结论。

## 第二轮 A 级模块 contract 巡检总收尾（已完成）

### 背景
第二轮 A 级模块 contract 巡检已经完成了核心执行动作：

1. `inventory` Yellow 点已完成最小闭环收口；
2. `purchase_orders` 已完成收货确认链 contract 最小闭环；
3. `sales_orders` 已复核为主链基本 Green，并完成旧审批稿清账；
4. 第一批 A 级 contract 防回退测试已完成并通过定向回归。

当前最合适的下一步，不是继续开新代码闭环，而是把第二轮巡检整体状态彻底收束，形成统一、可交接的最终口径。

### 改造目标
本轮目标限定为：

1. 统一第二轮 A 级模块 contract 巡检的最终状态表达；
2. 清理三份文档中残留的审批稿、执行前表述或悬空待办；
3. 形成“已收口 / 已验证 / 暂缓 / 下一轮再议”的干净收尾记录。

### 优先覆盖范围
#### 第一层：第二轮巡检涉及模块的最终状态
- `workflow`
- `production`
- `inventory`
- `voucher / finance`
- `sales_orders`
- `purchase_orders`

#### 第二层：文档一致性
- `task.md`
- `implementation_plan.md`
- `walkthrough.md`

### 重点问题类型
1. 是否仍存在“审批稿”状态，但其实已经完成或不再推进；
2. 是否仍存在“执行前”措辞，但实际已完成实现与验证；
3. 三份文档对同一模块状态是否存在口径不一致；
4. 是否仍有应划入“下一轮候选”的事项，错误地挂在本轮收尾中。

### 实施策略
#### 1) 只做状态收束，不进入新实现
- 不新增业务代码；
- 不追加新的测试批次；
- 不顺手开启下一轮模块闭环。

#### 2) 以“最终可交接”为标准整理文档
- 对每个模块只保留当前有效结论；
- 已完成的事项写清“已收口 + 已验证”；
- 暂缓项写清“已复核 + 暂不进入实现”；
- 后续候选项显式标注为“下一轮再议”。

#### 3) 优先保证三文档口径一致
- `task.md` 负责待办与状态；
- `implementation_plan.md` 负责收尾范围、结论与剩余边界；
- `walkthrough.md` 负责最终交付记录与验证结果。

### 预计改动文件
- `task.md`
- `implementation_plan.md`
- `walkthrough.md`

### 风险评估
1. 若清账不彻底，后续阅读者仍会误判哪些事项待做；
2. 若为追求“干净”误删必要上下文，可能降低交接可读性；
3. 若本轮顺手开启新实现，会打破当前收尾边界并扩大范围。

### 交付物
1. 第二轮 A 级模块 contract 巡检的最终状态总览；
2. 三份核心文档状态一致后的收尾版本；
3. 对“下一轮再议事项”的清晰边界说明。

### 当前状态与完成结果
本节已完成第二轮 A 级模块 contract 巡检总收尾：

1. 已统一第二轮巡检涉及模块的最终状态口径；
2. 已清理三份核心文档中的审批稿、执行前表述与悬空待办；
3. 已形成“已收口 / 已验证 / 暂缓 / 下一轮再议”的最终收尾表达；
4. 后续若继续推进新的模块闭环或第二批测试，应作为下一轮事项单独立项。

## 下一轮 `inventory` 后续最小闭环（审批稿）

### 背景
`inventory` 在第二轮 A 级巡检中，已经完成了首批明确 Yellow 点收口：

1. query service 已切到正式 DTO response；
2. query handler 已切到正式命名 paged wrapper；
3. `CommitShipment(...)` 已切到正式 DTO 返回值；
4. 第一批防回退测试也已覆盖 query handler 与 commit shipment 的关键 contract。

因此，若下一轮继续推进 `inventory`，应当把它作为独立新一轮立项，只挑一个新的最小边界处理，而不是回到上一轮继续扩展库存域改造。

### 改造目标
本轮目标限定为：

1. 复核 `inventory` 当前剩余 handler / service contract 边界；
2. 识别一个最值得优先处理的最小缺口；
3. 在你批准后，仅对该单一最小闭环做收口。

### 优先排查范围
#### 第一层：现有 `inventory` handler / service 对外 contract
- `server/handlers/inventory_*`
- `server/services/inventory_*`

#### 第二层：query / commit 主链之外的剩余边界
- transfer
- void / reconcile
- 其他已暴露给外部但尚未明确通过命名 contract 固化的链路

### 重点问题类型
1. 是否仍有 `models.Inventory*`、`models.InboundRecord`、`models.ShipmentRecord` 等直接暴露到对外 contract；
2. 是否仍存在匿名 request / response；
3. 是否仍存在 `gin.H` 承载不稳定外部结构；
4. 是否有单条 service / handler 已偏离既有 DTO / mapper / wrapper 风格。

### 实施策略
#### 1) 只找一个最小闭环，不做库存域扩展改造
- 不默认同时处理 transfer、void、reconcile 多条链；
- 先扫描，再只挑一个最值得优先处理的缺口；
- 一旦发现范围扩大，优先回退到更小目标。

#### 2) 不改业务逻辑，只收口 contract
- 不改库存数量/金额计算；
- 不改入库/出库事务语义；
- 不改已有中文错误语义与状态码；
- 不改既有调用方依赖的业务含义。

### 预计改动文件（待复核后收敛）
- `server/handlers/inventory_*`
- `server/services/inventory_*`
- 如缺少类型，按最小范围补独立 DTO / mapper 文件
- 如有必要补少量 `Inventory` 定向测试

### 风险评估
1. 若把“后续最小闭环”误做成库存域继续扩展，会迅速放大改动面；
2. 若误动事务或库存数值逻辑，风险会从 contract 扩散到业务正确性；
3. 若同时触碰多条库存链路，验证成本会明显上升。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory"`
- 重点复核：
  - 命中链路的 response shape
  - service 对外 contract 是否已脱离直接 model 暴露
  - 既有 inventory 主链测试不回退

### 当前状态与暂停点
本节当前仅为下一轮 `inventory` 后续最小闭环审批稿：

1. 已确认这是独立下一轮，不再挂在第二轮名下；
2. 已确认本轮只找一个新的最小闭环，不扩展为库存域继续重构；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先扫描 `inventory` 剩余 handler / service，再给出最小改动范围并执行。

## `inventory` 再下一条最小闭环（审批稿）

### 背景
上一条独立 `inventory` 闭环已经完成了命令成功响应统一：

1. `ReconcileInventoryHandler` 成功响应已切到 `InventoryCommandStatusResponse`；
2. `VoidShipmentHandler` 成功响应已切到 `InventoryCommandStatusResponse`；
3. 对应 `Inventory` 定向回归已通过。

因此，如果继续推进 `inventory`，需要再单独开一条新闭环，避免把多条小问题混成同一轮库存改造。

### 改造目标
本轮目标限定为：

1. 复核 `inventory` 剩余对外 contract 边界；
2. 再识别一个最值得优先处理的单一最小缺口；
3. 在你批准后，仅对该单一缺口做最小收口。

### 优先排查范围
#### 第一层：`inventory` 剩余 handler / service contract
- `server/handlers/inventory_*`
- `server/services/inventory_*`

#### 第二层：尚未优先处理的库存链路
- transfer
- void / reconcile 的请求边界
- bulk sync
- 其他仍可能偏离既有 DTO / mapper / wrapper 风格的链路

### 重点问题类型
1. 是否仍存在 `models.*` 直接进入 handler / service 外部 contract；
2. 是否仍存在匿名 request / response；
3. 是否仍存在裸 `gin.H`、裸 map、裸 slice 作为外部 contract；
4. 是否有单条链路与当前 `inventory` 已统一的 contract 风格明显不一致。

### 实施策略
#### 1) 每轮只收一个小点
- 不同时处理多个 inventory 子链；
- 先扫描，再挑一个最值得优先处理的点；
- 如发现范围扩大，优先缩回到更小目标。

#### 2) 不改业务逻辑，只收口 contract
- 不改库存数值逻辑；
- 不改事务语义；
- 不改权限校验逻辑；
- 不改错误状态码与中文错误语义。

### 预计改动文件（待复核后收敛）
- `server/handlers/inventory_*`
- `server/services/inventory_*`
- 如缺少类型，按最小范围补独立 DTO / mapper 文件
- 如有必要补少量 `Inventory` 定向测试

### 风险评估
1. 若本轮同时触碰多个库存子链，会放大改动面和验证成本；
2. 若误动事务或权限逻辑，风险会超出 contract 收口范围；
3. 若为追求统一而过度重构，会破坏“最小闭环”目标。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory"`
- 重点复核：
  - 命中链路的 request / response shape
  - service 对外 contract 是否已脱离直接 model 暴露
  - 既有 inventory 主链测试不回退

### 当前状态与暂停点
本节当前仅为 `inventory` 再下一条最小闭环审批稿：

1. 已确认这是在上一条 inventory 闭环之后单独新开的一轮；
2. 已确认本轮只再找一个最小缺口，不扩展为库存域继续改造；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先扫描剩余 inventory 边界，再给出最小改动范围并执行。

## `inventory transfer request DTO` 最小闭环（审批稿）

### 背景
在 `inventory` 已完成 query / commit contract、命令成功响应统一、bulk sync contract 收口之后，剩余高性价比的小点之一是 transfer 请求边界：

1. `TransferInventoryHandler` 当前直接绑定 `services.TransferInventoryInput`；
2. 该结构更接近 service input，而不是对外 request DTO；
3. 与当前 `inventory` 其他已收口链路相比，request 边界风格仍不够稳定。

因此，本轮适合单独开一个极小闭环，只处理 transfer 请求 contract，而不继续扩大库存域改造范围。

### 改造目标
本轮目标限定为：

1. 为 transfer 链补正式命名 request DTO；
2. 为 request -> service input 增加明确 mapper；
3. 让 handler 与 service input 边界职责更清晰，同时保持业务逻辑不变。

### 优先排查范围
#### 第一层：transfer 对外请求边界
- `server/handlers/inventory_command_handlers.go`
- `server/services/inventory_command_service.go`
- `server/services/inventory_command_dto.go`
- `server/services/inventory_command_mapper.go`

#### 第二层：transfer 定向测试
- `server/handlers/inventory_command_handlers_test.go`
- 如有必要，补少量 `services` 侧定向测试

### 重点问题类型
1. handler 是否直接绑定 service input，而不是正式命名 request DTO；
2. request -> service input 是否缺少明确 mapper；
3. transfer 请求 contract 是否与当前 inventory 其他链路风格不一致；
4. 在不改变业务逻辑的前提下，能否最小化收口请求边界。

### 实施策略
#### 1) 只收 request 边界，不动业务逻辑
- 不改 transfer 数量/金额计算；
- 不改 transfer 事务语义；
- 不改权限校验；
- 不改错误状态码与中文错误语义。

#### 2) 保持改动最小
- 新增 `TransferInventoryRequest`；
- 新增 request -> input mapper；
- handler 改为消费 request DTO；
- service 仍保留 `TransferInventoryInput` 作为内部输入结构。

### 预计改动文件
- `server/handlers/inventory_command_handlers.go`
- `server/services/inventory_command_dto.go`
- `server/services/inventory_command_mapper.go`
- 如有必要，更新 `server/handlers/inventory_command_handlers_test.go`

### 风险评估
1. 若误把 request 边界收口扩成 transfer 业务改造，会放大范围；
2. 若误改 service input 语义，可能影响既有 transfer 逻辑；
3. 若测试覆盖不足，后续仍可能回退到直接绑定 service input。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory"`
- 重点复核：
  - transfer request contract 已切到正式 DTO
  - request -> input mapper 生效
  - 既有 inventory 主链测试不回退

### 当前状态与暂停点
本节当前仅为 `inventory transfer request DTO` 最小闭环审批稿：

1. 已确认本轮只处理 transfer 请求边界，不进入 transfer 业务逻辑改造；
2. 已确认本轮目标是 request DTO + mapper 收口；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将按最小范围实现并执行 `Inventory` 定向回归。

## 第二批 `inventory` 防回退测试（审批稿）

### 背景
`inventory` 当前已经连续完成多条最小闭环：

1. query / commit contract 收口；
2. 命令成功响应统一；
3. bulk sync contract 收口；
4. transfer request DTO 收口。

在这种情况下，继续扩大实现改造的收益已经下降；更合适的下一步，是对刚刚收口和仍有风险的边界补第二批定向防回退测试。

### 改造目标
本轮目标限定为：

1. 为 `inventory` 补第二批定向防回退测试；
2. 覆盖 bulk sync、transfer、void 三条链的关键负向/shape 边界；
3. 在不改业务逻辑的前提下，提高后续回退可见性。

### 优先覆盖范围
#### 第一优先级：bulk sync 负向测试
- 非 admin 角色请求 bulk sync 应返回 403
- 非法 payload / 绑定失败应返回 400

#### 第二优先级：transfer request 负向测试
- 非法 payload / 缺字段 / 类型错误时应返回 400
- request contract 不应回退为 service input 直绑风格

#### 第三优先级：void success / request shape 测试
- success 响应保持 `InventoryCommandStatusResponse`
- request shape 仍通过 `VoidShipmentRequest` 承载审批字段

### 实施策略
#### 1) 只补测试，不进入实现改造
- 不再扩展 inventory 业务代码；
- 不修改库存事务逻辑；
- 不修改权限裁决逻辑；
- 仅通过测试锁住当前 contract 结果。

#### 2) 优先落在既有测试文件
- 优先复用 `server/handlers/inventory_command_handlers_test.go`
- 仅在必要时补少量 `services` 侧测试
- 不新增复杂测试框架

### 风险评估
1. 若断言写得过细，可能把正常演进误判为回归；
2. 若负向测试构造不准确，容易测到权限/业务副作用而不是 contract 本身；
3. 若范围继续扩大，容易从测试补强滑向新一轮实现改造。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "Inventory"`
- 重点关注：
  - bulk sync 权限与 payload 负向断言稳定
  - transfer request 负向断言稳定
  - void success / request shape 不回退

### 当前状态与暂停点
本节当前仅为第二批 `inventory` 防回退测试审批稿：

1. 已确认本轮目标是测试补强，不是新的实现闭环；
2. 已确认优先覆盖 bulk sync、transfer、void 三条链；
3. 在你明确批准前，不开始新增测试代码；
4. 你批准后，我将按最小范围补测试并执行 `Inventory` 定向回归。

## `purchase_orders` 再开一条最小闭环（审批稿）

### 背景
`purchase_orders` 当前已经完成了一条明确的最小闭环：采购收货确认链 contract 收口。

但与 `inventory` 连续收口前的状态类似，模块本身仍然较大，且收货确认链之外仍可能存在剩余 contract 边界未被正式复核。因此，当前最适合的下一轮实现型动作，是再单独开一条新的 `purchase_orders` 最小闭环，而不是直接扩大为 procurement 域改造。

### 改造目标
本轮目标限定为：

1. 复核 `purchase_orders` 剩余 handler / service 对外 contract；
2. 识别一个最值得优先处理的单一最小缺口；
3. 在你批准后，仅对该单一缺口做最小收口。

### 优先排查范围
#### 第一层：`purchase_orders` 剩余 handler / service contract
- `server/handlers/purchase_orders.go`
- `server/services/*purchase*`

#### 第二层：收货确认链之外的主链边界
- 列表 / 详情 / 已删除列表
- workflow 挂接相关返回边界
- 其他仍可能偏离既有 DTO / mapper / wrapper 风格的链路

### 重点问题类型
1. 是否仍存在 `models.PurchaseOrder*` 直接进入 handler / service 外部 contract；
2. 是否仍存在匿名 request / response；
3. 是否仍存在裸 model / 裸 slice / 裸 map 作为外部 contract；
4. 是否有单条链路与当前 `purchase_orders` 已收口风格明显不一致。

### 实施策略
#### 1) 每轮只收一个小点
- 不同时处理多个 purchase_orders 子链；
- 先扫描，再挑一个最值得优先处理的点；
- 如发现范围扩大，优先缩回到更小目标。

#### 2) 不改业务逻辑，只收口 contract
- 不改采购单字段含义；
- 不改收货事务逻辑；
- 不改状态重算与 workflow 挂接语义；
- 不改错误状态码与中文错误语义。

### 预计改动文件（待复核后收敛）
- `server/handlers/purchase_orders.go`
- `server/services/*purchase*`
- 如缺少类型，按最小范围补独立 DTO / mapper 文件
- 如有必要补少量 `PurchaseOrder|Workflow` 定向测试

### 风险评估
1. 若把最小闭环误做成 procurement 域继续扩展，会迅速放大改动面；
2. 若误动 workflow 挂接或状态重算，风险会超出 contract 收口范围；
3. 若同时触碰多条采购链路，验证成本会明显上升。

### 验证策略
- 至少执行：
  - `go test ./handlers ./services -run "PurchaseOrder|Workflow"`
- 重点复核：
  - 命中链路的 request / response shape
  - service 对外 contract 是否已脱离直接 model 暴露
  - 既有 purchase_orders 主链测试不回退

### 当前状态与暂停点
本节当前仅为 `purchase_orders` 再开一条最小闭环审批稿：

1. 已确认这是独立新一轮，不与既有收货确认链闭环混写；
2. 已确认本轮只找一个新的最小缺口，不扩展为 procurement 域继续改造；
3. 在你明确批准前，不开始业务代码修改；
4. 你批准后，我将先扫描剩余 purchase_orders 边界，再给出最小改动范围并执行。

## TypeScript 构建错误收口（审批稿，2026-04-07）

### 背景
当前前端构建被两处已可复现的类型错误阻断，但继续把它们当成两个孤立报错分别补平，风险很高。

进一步追链后，当前更接近的结论是：**共享 contract 已升级，但消费侧仍允许页面直接手写正式对象、直接猜共享结构，缺少单一构造入口与消费边界约束。**

当前已暴露的两个报错只是这一类问题在不同模块上的表象：

1. `src/features/equipment-tooling/tabs/mold-mgmt.tsx`
   - 在“分组内快速新增模具”时直接构造了一个 `Mold` 临时对象并传给 `setEditingMold(...)`。
   - 但 `src/features/equipment-tooling/data/schema.ts` 中当前 `Mold` 类型已要求包含 `version: number`，而页面仍在绕过统一入口直接手写对象，因此一旦正式字段升级，就会立刻漂移。

2. `src/features/org-personnel/tabs/employee-management-list.tsx`
   - 当前仍按 `line.segments[].jobCategories[]` 遍历产线结构构造名称映射。
   - 但现有 `Segment` 权威类型已不再包含 `jobCategories`，而是以 `processes` 为正式子节点字段，说明页面消费层仍在直接假设旧拓扑结构。

### 改造目标
本轮目标限定为：

1. 先明确这两处问题的共享根因，避免继续按补丁思路逐点修错；
2. 为 `equipment-tooling` 建立正式 `Mold` 对象的单一构造边界；
3. 为 `org-personnel` 收口对产线拓扑共享类型的消费边界；
4. 在不改变业务语义的前提下恢复 `pnpm exec tsc --noEmit`。

### 根因判断
#### 1) `equipment-tooling`：缺少正式 `Mold` 的单一构造入口
- `Mold` 目前由 zod schema 推导，已经承载了正式字段约束；
- `useAssets`、`MoldActionDialog`、`MoldMgmt` 都在消费 `Mold`，但“新建草稿/默认值”并没有被统一收敛到单一入口；
- 结果是：某些位置通过表单 schema `default()` 或 `form.reset(...)` 间接获得默认值，另一些位置却继续手写对象字面量；
- 一旦正式字段新增（如 `version`），手写入口就会与权威 schema 脱节。

#### 2) `org-personnel`：页面层直接猜共享拓扑结构
- `productionResourceService.getLines()` 明确返回 `ProductionLine[]`，其 `Segment` 权威类型当前只暴露 `processes`；
- 但 `employee-management-list.tsx` 仍按历史字段 `jobCategories` 去遍历 segment 子节点；
- 这说明员工管理页没有围绕“它真实需要的名称映射”建立稳定消费边界，而是直接把共享拓扑结构当成页面可随意假设的内部细节。

#### 3) 两个问题的共同根因
- **共享 contract 演进后，缺少强制性的消费收口机制。**
- 页面层仍能：
  - 直接手写正式领域对象；
  - 直接依赖共享结构的历史字段；
  - 在没有单一入口的情况下各自维护“我以为的模型”。
- 因此这轮不应只修“漏了 `version`”和“把 `jobCategories` 改名”，而应把这两条链的边界一起收紧。

### 预计改动文件
- `src/features/equipment-tooling/tabs/mold-mgmt.tsx`
- `src/features/equipment-tooling/components/mold-action-dialog.tsx`
- `src/features/equipment-tooling/data/schema.ts`
- `src/features/org-personnel/tabs/employee-management-list.tsx`
- `src/features/production-shared/services/production-resource-service.ts`
- `src/features/production-shared/tabs/line-mgmt/types.ts`
- 如复核发现同域还有同类直接构造 `Mold` 或直接读取旧拓扑字段的点，最多补充极少量同域文件，但不扩大到无关模块。

### 实施策略
#### 1) `equipment-tooling`：统一 `Mold` 草稿/默认值构造入口
- 先识别当前哪些地方在构造“新增模具默认对象”；
- 将页面层直接手写 `Mold` 的入口收敛为单一来源；
- 让 `mold-mgmt.tsx` 与 `mold-action-dialog.tsx` 共享同一套正式默认值逻辑；
- 不通过把 `version` 改回可选来掩盖问题。

#### 2) `org-personnel`：按真实消费需求收口共享类型读取
- 员工管理页的目标只是构建“组织/产线/工序名称映射”；
- 本轮会按这个真实需求重新核定它应该读取哪些权威节点；
- 如果页面其实只需要 `line` 和 `process` 名称，就不再让它耦合 `Segment` 的历史中间层字段；
- 如需要，再补最小显式类型，消除 `implicit any`，但不扩展为产线拓扑重构。

#### 3) 以边界整改为验收，而非只看编译通过
- 验收不只看 TS 报错消失；
- 还要确认：
  - 页面层是否还在直接手写正式 `Mold`；
  - 目标链是否还在直接读取旧字段 `jobCategories`；
  - 正式类型的新增字段未来是否仍会在多个页面入口重复漂移。

### 风险评估
1. 若错误地把 `version` 改回可选，虽然能暂时过编译，但会削弱正式模型约束，属于典型补丁式误修；
2. 若只把 `jobCategories` 改成另一个字段名，而不明确页面真实依赖层级，后续共享拓扑再演进时仍会复发；
3. 若把本轮扩展成 `equipment-tooling` 或产线拓扑整体重构，范围会超出“根因收口”的最小闭环；
4. 若没有建立清晰的单一入口，未来新增字段时仍会在别的页面再次出现同类漂移。

### 验证策略
- 至少执行：
  - `pnpm exec tsc --noEmit`
- 如有必要补充：
  - 目标文件定向 lint
  - 定向搜索确认页面层不再直接手写正式 `Mold` 对象
  - 定向搜索确认 `jobCategories` 旧字段读取未在本轮目标链继续残留

### 当前状态与暂停点
本节当前仅为 TypeScript 构建错误收口审批稿：

1. 已确认本轮优先处理的是“共享 contract 漂移 + 页面边界未收口”的根因，而不是两个孤立报错；
2. 已确认修复方向是“统一构造入口 + 对齐共享权威类型”，不是放宽类型约束；
3. 我已更新 `task.md` 与本方案文档；
4. **在你明确批准前，我不会开始修改业务代码。**

## 正式对象单一构造入口第二轮（审批稿，2026-04-07）

### 背景
第一轮已经验证：`equipment-tooling` 中“页面/弹窗直接手写正式对象默认值”确实会在共享 contract 演进时形成漂移。

当前继续盘点后，下一批最接近同一根因的目标是：

1. `src/features/equipment-tooling/components/furnace-action-dialog.tsx`
   - 仍在表单 `defaultValues` 与 `form.reset(...)` 中各自手写一套 `Furnace` 正式对象默认值；
   - 与第一轮 `MoldActionDialog` 的问题高度同构。

2. `src/features/equipment-tooling/tabs/furnace-mgmt.tsx`
   - 当前新增入口主要通过 `null + dialog` 打开，不像 `mold-mgmt.tsx` 那样直接手写完整正式对象；
   - 但如果 `Furnace` 默认值入口仍不统一，后续仍可能在别的页面或弹窗复制出第二套默认对象。

3. `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`
   - 当前存在 `createLoanDraft(...)`，但其对象是 `LoanDraft` UI 组合模型，不是正式 `MoldLoan` contract；
   - 因此它更像“本地草稿状态”，不应被误归类为本轮正式对象构造入口问题。

### 本轮目标
本轮目标限定为：

1. 盘清 `equipment-tooling` 中仍直接手写正式对象默认值的残留点；
2. 将单一构造入口从 `Mold` 推广到 `Furnace`；
3. 明确把 `LoanDraft` 等 UI 草稿模型排除在本轮正式对象治理之外；
4. 在不扩展模块重构的前提下保持 `tsc` 通过。

### 根因判断
#### 1) `Furnace` 与 `Mold` 属于同类问题
- `Furnace` 也是 schema 推导出的正式领域对象；
- 其默认值当前仍分散在 `furnace-action-dialog.tsx` 中手写两次；
- 这意味着一旦 `Furnace` 正式字段增加或约束升级，也会复现第一轮 `Mold` 的同类漂移。

#### 2) `LoanDraft` 目前不属于同类正式对象问题
- `LoanDraft` 的字段明显混合了借还 UI 所需的表单态与引用信息；
- 它不是 `MoldLoan` 正式 contract 的简单默认值副本；
- 因此本轮不应为了“统一入口”而强行把它塞回正式对象工厂模式。

### 预计改动文件
- `src/features/equipment-tooling/data/schema.ts`
- `src/features/equipment-tooling/components/furnace-action-dialog.tsx`
- 如复核确认 `furnace-mgmt.tsx` 或同域其它文件存在直接手写 `Furnace` 正式对象入口，再最小范围补充

### 实施策略
#### 1) 为 `Furnace` 增加共享草稿/默认值工厂
- 参考 `createMoldDraft(...)` 模式；
- 将 `type / maxTemp / currentTemp / version / createdAt` 等正式默认值统一收敛；
- 不放宽 `Furnace` 正式类型约束。

#### 2) 让弹窗默认值与 reset 只消费单一入口
- `furnace-action-dialog.tsx` 的 `defaultValues` 与新建态 `form.reset(...)` 统一改为共享工厂函数；
- 避免继续维护两套手写默认对象。

#### 3) 明确排除项
- 不把 `LoanDraft` 误当成正式 `MoldLoan` 对象整改；
- 不顺手扩展为借还管理表单重构；
- 不扩大到 `equipment-tooling` 全域对象工厂体系重写。

### 风险评估
1. 若误把 UI 草稿模型与正式领域对象混为一谈，会造成错误抽象；
2. 若为追求统一而扩大到借还管理整链，范围会超出本轮最小闭环；
3. 若 `Furnace` 默认值工厂设计不当，可能影响新建弹窗默认 `type` 的现有语义。

### 验证策略
- 至少执行：
  - `pnpm exec tsc --noEmit`
- 如有必要补充：
  - 定向搜索确认 `Furnace` 默认值不再在多个入口重复手写
  - 定向 lint 复核目标文件

### 当前状态与暂停点
本节当前仅为第二轮正式对象单一构造入口审批稿：

1. 已确认下一批同类问题优先目标为 `Furnace`；
2. 已确认 `LoanDraft` 暂不纳入本轮正式对象治理；
3. 我已完成盘点并同步到 `task.md` / `implementation_plan.md`；
4. **在你明确批准前，我不会开始第二轮业务代码修改。**

## `users` 测试数据构造边界收口（审批稿，2026-04-07）

### 背景
当前新暴露的 `users` TypeScript 错误，不适合按“给测试对象补一个 `version` 字段”来处理。

从现有代码看，问题更接近：**`User` 正式 schema 已升级，但测试层仍在直接手写正式 `User` 对象，而项目中缺少统一测试工厂/fixture 入口。**

目前已确认的现象：

1. `src/features/users/data/schema.ts`
   - `User` 正式 contract 当前已包含 `version`，并同时承接 `password`、`resolvedRole`、`roleInfo`、`createdAt`、`updatedAt` 等字段。

2. `src/features/users/utils/role-resolver.test.ts`
   - 仍直接手写 `User` 字面量作为 `resolveUserRole(...)` 入参；
   - 当前字面量未跟随正式 schema 同步补齐 `version`，因此在 schema 升级后直接触发编译错误。

3. 当前未发现稳定的共享 `User` 测试工厂入口
   - 这意味着每个测试文件都在维护“自己理解的 User 结构”；
   - 一旦 `User` contract 演进，同类测试会批量漂移。

### 本轮目标
本轮目标限定为：

1. 把这轮报错定义为“测试数据构造边界失控”而不是单点测试漏字段；
2. 为正式 `User` 类型建立统一测试工厂/fixture 入口；
3. 让消费正式 `User` 类型的目标测试统一走共享工厂；
4. 在不放宽正式 schema 的前提下恢复 `tsc` 通过。

### 根因判断
#### 1) 正式 `User` contract 已进入演进态
- `User` 现在不再只是最小展示结构；
- 它已经承接 SDRTS 所需 `version`，以及角色解析展示所需 `resolvedRole` / `roleInfo` 等字段；
- 因此它属于不适合在测试里到处裸写的正式领域对象。

#### 2) 测试层缺少统一构造边界
- `role-resolver.test.ts` 之类测试继续手写 `User` 对象；
- 测试里只关注某几个业务字段，却绕过正式构造入口直接声明完整实体；
- 这会让 schema 每次升级都要求人工到多处测试同步补字段。

#### 3) 根因不是 `version` 本身，而是“正式对象在测试中被裸写”
- 如果本轮只给一两个测试字面量补 `version`，后续 `User` 再增字段时仍会复发；
- 因此本轮应优先建立共享测试工厂，而不是继续散点补齐字面量对象。

### 预计改动文件
- `src/features/users/data/schema.ts`（如仅需导出类型，不一定改动）
- `src/features/users/utils/role-resolver.test.ts`
- 如确认还有同类目标测试，同域极少量补充
- 如当前缺少共享测试工厂，则最小新增一个 `users` 测试 helper / fixture 文件

### 实施策略
#### 1) 为正式 `User` 类型建立统一测试工厂
- 统一承接：`id / username / firstName / lastName / phoneNumber / status / role / version / createdAt / updatedAt` 等正式默认值；
- 允许通过 overrides 覆盖测试关心字段；
- 保持工厂职责只服务正式 `User` 测试对象，不扩展到所有用户 API payload。

#### 2) 只收口真正消费正式 `User` 的测试
- `role-resolver.test.ts` 优先切到共享工厂；
- 其他测试仅在其确实消费 `User` 正式类型时再纳入；
- `CreateUserPayload`、`UserOption`、`UserReplacePayload` 等 API contract 测试保持各自语义，不强行混入正式实体工厂。

#### 3) 禁止补丁式误修
- 不把 `version` 改回可选；
- 不在多个测试里继续各自补字段；
- 不用 `as User` 或宽断言掩盖正式 contract 漂移。

### 风险评估
1. 若把所有用户相关结构都强行并入同一测试工厂，会混淆正式实体与 API payload 边界；
2. 若只修单个报错测试，不建立共享入口，后续 `User` schema 继续演进时仍会再次大面积漂移；
3. 若工厂默认值设计不当，可能掩盖某些测试本来要显式声明的关键字段。

### 验证策略
- 至少执行：
  - `pnpm exec tsc --noEmit`
- 如有必要补充：
  - 定向搜索确认目标测试不再直接手写正式 `User` 对象
  - 定向测试 / lint 复核目标文件

### 当前状态与暂停点
本节当前仅为 `users` 测试数据构造边界收口审批稿：

1. 已确认本轮根因是“正式 `User` schema 升级 + 测试工厂缺失”；
2. 已确认修复方向是“共享测试工厂收口”，不是给单个测试补字段；
3. 我已同步到 `task.md` / `implementation_plan.md`；
4. **在你明确批准前，我不会开始这轮业务代码修改。**
