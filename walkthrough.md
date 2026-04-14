# 变更记录与验证（walkthrough.md）

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
