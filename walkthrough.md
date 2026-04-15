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

## 2026-04-15 车型图片上传持久化接入（753-续）

- **变更概述**
  - 新增 `server/models/logistics_vehicle_photo.go`、`server/services/logistics_vehicle_photo_service.go`、`server/handlers/logistics_vehicle_photos.go`，补齐车型图片业务归属层，持久化 `vehicleId / url / viewType / caption / sortOrder / annotations`。
  - 在 `server/db/db.go` 注册 `LogisticsVehiclePhoto` 自动迁移，并在 `server/routes/routes.go` 新增 `POST /api/v1/logistics-config/vehicle-specs/:id/photos` 保存接口。
  - 在 `server/services/logistics_vehicle_specs_service.go` 与 `server/handlers/logistics_vehicle_specs.go` 收口车型规格读取链，让 `GET /api/v1/logistics-config/vehicle-specs` 直接返回 `photoEntry`，避免前端再发第二条车型图片查询。
  - 新增 `src/features/logistics-config/vehicle-loading/services/vehicle-photo-service.ts` 与 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-upload.ts`，复用 `AssetService.uploadFile` 完成“先传文件、再保存业务归属”的双段链路。
  - 新增 `src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx`，在 `src/features/logistics-config/vehicle-specs-library-tab.tsx` 每个车型卡片左侧接入上传区，支持视角选择、缩略图占位、图片数量摘要与上传按钮。
  - 在 `src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts`、`src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts`、`src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts` 收口前端类型与弹窗数据来源，优先使用后端返回的 `photoEntry`，静态 manifest 仅保留兜底结构。
  - 在 `src/locales/messages/zh-CN/logisticsConfig.ts` 与 `src/locales/messages/en-US/logisticsConfig.ts` 补充上传区文案、视角选择文案与上传成功/失败提示。

- **联动结果**
  - 车型规格库卡片左侧现在有固定上传入口，不需要再临时思考图片挂载位置。
  - 上传时先走现有 `/assets/upload` 文件上传，再走车型图片保存接口完成与 `vehicle.id` 的持久化绑定。
  - 上传成功后通过 React Query 失效 `vehicle-loading/specs` 查询，车型卡片缩略图、数量摘要和“查看实车图”弹窗会读取最新持久化结果。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/logistics-config/vehicle-specs-library-tab.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-upload.ts src/features/logistics-config/vehicle-loading/services/vehicle-photo-service.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts`：通过。
  - `go test ./db ./handlers ./models ./routes ./services -run ^$`：通过。
  - `go test ./...`：未作为本轮阻断项，仓库现存 `server/scripts` 多入口 `main` 冲突及若干既有测试数据问题仍会导致全量测试失败，与本次车型图片接入无直接关系。

## 2026-04-15 仓库 Go 脚本冲突与测试基座漂移清理（754）

- **变更概述**
  - 为 `server/scripts/route_snapshot.go` 与 `server/scripts/migrate_finance_dictionaries.go` 补齐与目录内其它独立脚本一致的构建排除标记，清除 `server/scripts` 包在仓库级 `go test ./...` 下的多 `main` 冲突。
  - 修复 `server/services/purchase_transaction_service_test.go` 的 `suppliers` 测试表结构，补齐 `we_chat / whats_app / facebook / instagram / telegram` 等已被当前 `Supplier` 模型与保存逻辑使用的字段。
  - 修复 `server/services/trading_test_schema_helper_test.go` 中 `sales_orders` / `purchase_orders` 的 `evidences` 默认值定义，改为可被 `json.RawMessage` 稳定扫描的 SQLite BLOB 表达。
  - 清理 `server/services/vehicle_contact_binding_service.go` 中残留的未使用导入，恢复 Go 包级编译通过。
  - 修复 `server/services/finance_master_service_test.go` 的测试库初始化，补齐 `PaymentMethod` 迁移，避免默认财务字典兼容逻辑在 SQLite 测试库中缺表。
  - 将 `server/productidentity/backfill_test.go` 调整为按当前 SKU 回填逻辑所需字段定义最小测试 schema，避免测试表结构落后于 `ProductType / Product / ProductAttributeValue` 当前模型，又规避 SQLite 下整表迁移语法兼容问题。
  - 修复 `server/repositories/production_repository_test.go` 中重复插入同一 `line_segments.id` 的测试用法，消除唯一键冲突。
  - 对齐多处 `server/handlers/*test.go` 中 `purchase_orders`、`purchase_order_lines`、`sales_orders` 的测试表结构，补齐支付字段、`returned_qty`、`evidences` 与 `workflow_instance_id` 等当前交易模型已依赖字段，统一修复工作流、入库、同步与稀疏保存相关失败。

- **收口结果**
  - 仓库级 Go 测试不再被 `server/scripts` 的多入口 `main` 直接阻断。
  - 既有交易/财务/库存/工作流/产品身份相关测试基座已向当前模型契约收口，避免继续出现“业务代码已升级、测试表还停在旧结构”的漂移。
  - 本轮优先修的是“仓库级验证链上的真实阻断项”，没有改写脚本业务逻辑，也没有引入新的测试框架。

- **验证结果**
  - `go test ./services -run "Purchase|SalesOrder|Partner|Trading"`：通过。
  - `go test ./handlers`：通过。
  - `go test ./productidentity`：通过。
  - `go test ./repositories`：通过。
  - `go test ./... -run ^$`：通过。
  - `go test ./...`：通过。

## 2026-04-15 车型图片链路按 `GEMINI.md` 规范收口（755）

- **变更概述**
  - 将 `src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts` 收口为共享类型与视角常量文件，移除本地 `VEHICLE_PHOTO_MANIFEST` 数据与 `getVehiclePhotoEntry()` / `hasVehiclePhotoImages()` fallback 能力，避免前端保留第二真相源。
  - 调整 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts`，弹窗状态仅消费后端返回的 `photoEntry`，不再在服务端缺字段时回退本地 manifest 数据。
  - 调整 `src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts`，为 `vehiclePhotoImageSchema` 补 `version`，移除 `annotations / tags / images` 上的 `.default([])`，并将 `vehicleSpecSchema.photoEntry` 改为必返字段，确保后端漏字段时由 Zod 直接 fail loudly。
  - 调整 `src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts` 与共享图片类型，使 `photoEntry`、`tags`、`annotations` 变为严格必备字段，对齐当前后端契约。
  - 在 `server/models/logistics_vehicle_photo.go` 为 `LogisticsVehiclePhoto` 增加 `Version` 字段，并在 `server/services/logistics_vehicle_photo_service.go` 的响应 DTO 映射中带出 `version`。
  - 在 `server/services/logistics_vehicle_specs_service.go` 将 `VehicleSpecResponse.PhotoEntry` 从可空指针改为必返对象，并保持 `GetVehicleSpecsCatalog()` 为每个车型显式填充完整 `photoEntry`。

- **规范收口结果**
  - 车型图片读取链现在只以服务端 `photoEntry` 为真相源，符合 `GEMINI.md` 的“后端权威”。
  - 前端 DTO 不再通过默认空数组为响应补缺，后端若漏发字段会直接暴露 contract drift，符合 `Fail Loudly`。
  - `photoEntry` 已从“后端实际必返、前端可选”收紧为前后端一致的必返契约。
  - 车型图片实体已具备 `version` 字段，为后续编辑、排序、删除等并发控制预留基础。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts src/features/logistics-config/vehicle-specs-library-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。
  - `go test ./db ./handlers ./models ./routes ./services -run ^$`：通过。

## 2026-04-15 `/shipping-management/contacts` 切到真实后端联系人页，并收紧车型规格加载状态判定（756）

- **变更概述**
  - 将 `src/routes/_authenticated/shipping-management/contacts.lazy.tsx` 从旧的 `@/features/trading/shipping-management/contacts-page` 切到真实的 `@/features/shipping-management/contacts-page`，使生产路由直接进入后端联系人管理页。
  - 调整 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query.ts`，复用 `src/lib/error-status.ts` 中的 `isForbiddenError()` 来识别 `403` 权限态，移除基于错误 message 的字符串猜测。
  - 修正 `src/features/shipping-management/contacts-page.tsx` 中真实联系人页的历史问题：移除未使用的变量、为 `PageHeader` 补齐必填 `icon`，并同步消除同文件的样式 warning。

- **规范收口结果**
  - `/shipping-management/contacts` 不再依赖前端 mock 联系人卡片作为生产展示真相源，符合“后端权威”。
  - 车型规格权限态从文案匹配改为结构化状态判断，减少错误包装变化带来的误判风险。
  - 真实联系人页在 `forbidden / failed / empty / ok` 场景下继续沿用显式空态和禁用态，不再靠 mock 数据掩盖权限或接口问题。

- **验证结果**
  - `pnpm exec eslint src/routes/_authenticated/shipping-management/contacts.lazy.tsx src/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query.ts src/features/shipping-management/contacts-page.tsx src/features/shipping-management/contacts-list-panel.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 修复 `/shipping-management/contacts` 真实列表 `null` 导致的过滤崩溃（757）

- **变更概述**
  - 调整 `server/services/vehicle_contact_binding_service.go`，将 `ListVehicleContactBindings()` 改为返回“列表 + error”，数据库未初始化或查询失败时显式返回错误；查询成功时即使为空也保证返回非 `nil` 空切片。
  - 调整 `server/handlers/vehicle_contact_binding_handler.go`，让 `/shipping-management/vehicle-contacts` 在 service 报错时返回 `500`，成功时始终返回数组 JSON，而不是把 `nil` 透传成 `null`。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`，对联系人列表接口结果使用 `ensureArrayResponse()` 做数组契约校验；若响应不是数组，则进入现有错误态与 toast 流程，并把 `bindings` 维持为空数组，避免继续污染渲染链。

- **规范收口结果**
  - 联系人列表链现在明确区分“空列表”和“内部失败”：前者返回 `[]`，后者返回 `500`，不再混成 `null`。
  - 前端不再把非数组响应直接喂给 `useVehicleContactFilters()`，从根上阻断了 `bindings.filter(...)` 的渲染期崩溃。
  - 当后端异常时，联系人页会进入显式错误态，而不是通过 ErrorBoundary 反复重建导致页面抖动。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/hooks/use-vehicle-contact-filters.ts src/features/shipping-management/contacts-page.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。
  - `go test ./handlers ./services -run ^$`：通过。

## 2026-04-15 修复 `/shipping-management/contacts` 默认 filters 对象 identity 导致的循环渲染（758-第一阶段）

- **变更概述**
  - 调整 `src/features/shipping-management/contacts-page.tsx`，通过 `useMemo(() => createDefaultContactFilters(), [])` 持有稳定的默认远端 filters 引用，不再在 render 期直接创建新对象传给 `useVehicleContactBindings()`。
  - 保留 `useVehicleContactBindings()` 中 `reload -> filters` 与 `useEffect -> reload` 的真实依赖关系，不通过删依赖或忽略 lint 规则来止血。

- **规范收口结果**
  - 当前止血修复阻断了 `render -> 新 filters -> 新 reload -> effect -> setState -> render` 的循环链。
  - 联系人页现在优先保证页面稳定，不再因默认对象 identity 漂移触发 `Maximum update depth exceeded`。
  - “远端请求 filters / 本地 UI filters” 的进一步边界收口与 React Query 迁移已记录为后续预案，但未混入本轮止血修复。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/contacts-page.tsx src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 联系人页第二阶段 2A：拆分远端请求 filters 与本地 UI filters

- **变更概述**
  - 新增 `src/features/shipping-management/contact-filters.shared.ts`，将联系人页 filters 语义从实体类型中拆出，显式定义 `VehicleContactRemoteFilters`、`VehicleContactUiFilters` 以及各自默认值工厂。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`，使联系人列表读取 hook 只依赖远端请求 filters。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-filters.ts`，将本地筛选 hook 收口为 `useVehicleContactUiFilters()`，只负责 UI 侧筛选状态与本地过滤。
  - 调整 `src/features/shipping-management/contacts-page.tsx`，显式区分 `defaultRemoteFilters` 与 `uiFilters`，避免继续以同一组概念承载远端查询参数和本地界面交互状态。

- **规范收口结果**
  - 联系人页当前已完成第二阶段的第一步：远端请求参数与本地 UI 筛选状态在类型和入口层面完成拆分。
  - 列表读取链仍保持当前行为，但后续若迁到 React Query，query key 与 invalidate 策略已有更清晰的挂载点。
  - 本轮没有把 React Query 迁移混入同一次提交，保持了“边界先拆清，再推进读取层重构”的节奏。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/contact-filters.shared.ts src/features/shipping-management/contacts-page.tsx src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/hooks/use-vehicle-contact-filters.ts src/features/shipping-management/contacts-page.types.ts`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 联系人页第二阶段 2B：读取层迁到 React Query，并收口 invalidateQueries 刷新链

- **变更概述**
  - 新增 `src/features/shipping-management/query-keys.ts`，定义 `vehicleContactQueryKeys`，为联系人列表建立统一 query key 入口。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`，将联系人列表读取从手工 `useEffect + useState + reload` 迁移为 `useQuery()`；列表响应继续通过 `ensureArrayResponse()` 做 fail loudly 校验。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`，保存 / 删除成功后通过 `useQueryClient().invalidateQueries({ queryKey: vehicleContactQueryKeys.all() })` 触发列表刷新，不再依赖外部注入 `reload()`。
  - 调整 `src/features/shipping-management/contacts-page.tsx`，接入新的动作 hook 签名，保留页面现有显式错误态、加载态和本地 UI filters 过滤链。

- **规范收口结果**
  - 联系人列表的服务端真相现在正式归属到 React Query，而不是继续由页面自管拉取与刷新。
  - 保存 / 删除动作与列表读取层之间不再通过命令式 `reload()` 耦合，而是通过 query key 失效机制协同。
  - 本轮仍保持“本地 `uiFilters` 只负责前端显示过滤”的边界，没有把本地筛选重新回并到远端请求参数中。
  - 联系人列表接口若返回非数组，仍会通过 contract error 显式暴露，而不会被静默兜底成空态。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/query-keys.ts src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/contacts-page.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 联系人页自动化测试补齐：覆盖首屏读取、启停刷新与删除刷新

- **变更概述**
  - 新增 `e2e/shipping-management-contacts.spec.ts`，为联系人页补一条 Playwright 回归测试。
  - 测试沿用现有 `page.route('**/api/v1/**')` 方式，分别 mock 登录、用户快照、车型库接口与联系人接口。
  - 在测试内维护可变联系人内存数据，确保 `POST /shipping-management/vehicle-contacts/:id` 与 `DELETE /shipping-management/vehicle-contacts/:id` 后，后续 `GET` 会返回最新列表，用于验证 React Query 的 `invalidateQueries()` 刷新链。

- **覆盖结果**
  - 首屏进入 `/shipping-management/contacts` 后，联系人列表能正确展示 mock 数据。
  - 点击现有联系人“停用”按钮后，页面会依据后续 GET 返回的最新数据重新渲染，按钮状态从“停用”切换为“启用”。
  - 点击“删除”并确认后，对应联系人会从页面消失，证明删除后的列表刷新链正常。
  - 本轮没有修改联系人页业务代码，只补充了页面级自动化回归保护。

- **验证结果**
  - `pnpm exec eslint e2e/shipping-management-contacts.spec.ts`：通过。
  - `pnpm exec playwright test e2e/shipping-management-contacts.spec.ts`：通过。

## 2026-04-15 最近修改生产文件的冗余清理与修复

- **变更概述**
  - 删除旧联系人页残留：`src/features/trading/shipping-management/contacts-page.tsx`、`src/features/trading/shipping-management/contact-bindings.mock.ts`、`src/features/trading/shipping-management/contacts-boundary.tsx`，避免新旧两套联系人页实现并存。
  - 精简 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`，移除迁移期遗留且当前未被消费的 `filteredBindings` 返回值。
  - 精简 `src/features/shipping-management/query-keys.ts`，移除当前未使用的 `lists()` 预留 key，仅保留实际消费的 `all()` 与 `list(filters)`。
  - 新增 `src/features/logistics-config/vehicle-loading/data/vehicle-photo-view-type-label.ts`，统一图片视角标签解析；`vehicle-photo-dialog.tsx` 与 `vehicle-photo-upload-panel.tsx` 改为复用该共享出口。

- **收口结果**
  - 联系人页生产代码现在只保留 `src/features/shipping-management/contacts-page.tsx` 这一套真实实现，避免后续误改到旧 mock 版本。
  - 联系人读取 hook 与 query key 文件不再保留当前无人消费的迁移期冗余接口。
  - `vehicle-photo-*` 组件拆分结构保持不变，只收口了重复的标签解析逻辑，没有回退已完成的组件解耦。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/query-keys.ts src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx src/features/logistics-config/vehicle-loading/data/vehicle-photo-view-type-label.ts src/features/trading/shipping-management/index.tsx src/features/trading/shipping-management/tabs.ts`：通过。
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec playwright test e2e/shipping-management-contacts.spec.ts`：通过。

## 2026-04-15 修复 packaging-rules / vehicle-specs-library 车型规格卡片因 `t(undefined)` 崩溃

- **问题现象**
  - 打开 `/logistics-config/packaging-rules` 时，`VehicleSpecCardHeader` 调用链触发 `TypeError: Cannot read properties of undefined (reading 'split')`。
  - 根因不在 WebSocket 1006 或浏览器扩展 `runtime.lastError`，而在车型规格前端字段契约与接口 DTO 漂移。

- **原因定位**
  - `src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts` 仍把 `VehicleSpec` 定义为 `nameKey / notesKey`。
  - `src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts` 与 `getVehicleSpecs()` 实际返回的是 `name / notes`。
  - `src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-header.tsx` 与 `vehicle-spec-card-notes.tsx` 仍调用 `t(spec.nameKey)` / `t(spec.notesKey)`，导致把 `undefined` 传入 `translate()`。

- **修复方式**
  - 将 `VehicleSpec` 前端类型对齐到接口 DTO：从 `nameKey / notesKey` 收口为 `name / notes`。
  - 同步调整 `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts`，移除旧 key 字段并补齐当前契约所需的 `photoEntry`。
  - 调整 `vehicle-spec-card-header.tsx` 与 `vehicle-spec-card-notes.tsx`，直接显示 `spec.name` 与 `spec.notes`，仅保留真正需要 i18n 的字段翻译。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-header.tsx src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-notes.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 logistics-config recommendations 真接口收口

- **问题现象**
  - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts` 虽然定义了 `/api/v1/logistics/vehicle-loading/recommendations`，但运行时仍由 `USE_MOCK_RECOMMENDATIONS = true` 驱动本地推荐引擎与 mock 兜底。
  - 继续核对后确认，后端 `server/routes/routes.go` 当时并未注册 recommendations 路由，导致“切真接口”在此前实际上没有可用后端承接点。

- **修复方式**
  - 新增后端 recommendations 主链：
    - `server/services/logistics_vehicle_loading_recommendation_service.go`
    - `server/handlers/logistics_vehicle_loading.go`
    - `server/routes/routes.go` 中注册 `POST /api/v1/logistics/vehicle-loading/recommendations`
  - 新增后端最小回归保护：
    - `server/routes/routes_logistics_vehicle_loading_test.go`
    - `server/handlers/logistics_vehicle_loading_test.go`
  - 调整前端 recommendations contract：
    - `vehicle-loading.schema.ts` 为 request 补齐 `source / sourceLabel`
    - `vehicle-loading.schema.ts` 为 response 补齐 `selectedOrientationAxis`
  - 调整前端 recommendations 调用链：
    - `vehicle-loading-service.ts` 移除 `USE_MOCK_RECOMMENDATIONS`、本地引擎分支与 `MOCK_VEHICLE_SPECS` 运行时兜底
    - `use-vehicle-loading-recommendations.ts` 改为直接通过 React Query 调用真实接口
    - `vehicle-loading-tab.tsx` 更新来源提示文案，避免继续宣称“当前仍使用本地默认适配器”

- **收口结果**
  - recommendations 当前已通过统一后端接口返回，前端不再本地静默代算。
  - `vehicle-specs.mock.ts` 与 `utils/vehicle-recommendation-mock.ts` 仍保留在仓库中，但已脱离生产运行链，不再参与当前 recommendations 主路径。
  - `manual / packing-rule / api` 三种来源当前仍共享同一后端推荐 contract，差异化输入留待下一阶段继续补齐。

- **验证结果**
  - `go test ./routes ./handlers ./services`：通过。
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-recommendations.ts src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 logistics-config recommendations 三来源真实输入收口 + 脱链 mock/helper 清理

- **变更概述**
  - 扩展前后端 recommendations contract：
    - 前端 `vehicle-loading.types.ts`、`vehicle-loading.schema.ts`、`vehicle-loading-service.ts` 已新增显式 `packageInput`。
    - 后端 `server/services/logistics_vehicle_loading_recommendation_service.go` 已支持在 request 中接收 `packageInput`，且存在显式输入时优先采用该输入。
  - 落地来源差异化真实输入：
    - 新增 `use-vehicle-loading-source-package-input.ts`，统一为 `manual / packing-rule / api` 生成各自的 recommendations 输入。
    - 新增 `vehicle-loading-package-input.ts`，负责包装定义/API 草稿到推荐输入的映射与校验。
    - 新增 `vehicle-loading-source-input-panel.tsx`，在 `vehicle-loading-tab.tsx` 中展示并编辑来源输入。
    - `packing-rule` 已接入 `/packaging/profiles` 活动包装定义选择。
    - `api` 已接入显式箱型名称、单箱重量、长宽高、`canRotate`、`canInvert` 输入位。
  - 清理脱链文件：
    - 删除 `vehicle-specs.mock.ts`
    - 删除 `vehicle-recommendation-mock.ts`
    - 删除 `vehicle-loading-package-adapters.ts`
    - 删除 `vehicle-loading-result-mapper.ts`
  - 补充后端定向测试：
    - `server/handlers/logistics_vehicle_loading_test.go` 现在会验证显式 `packageInput` 可以覆盖默认箱型尺寸。

- **架构收口结果**
  - `manual / packing-rule / api` 三种来源已从“仅标签差异”推进为“输入差异”。
  - `packing-rule` 不再继续占位，而是实际消费包装定义 authority。
  - `api` 在仓库内尚无独立 upstream authoritative 结果源的前提下，当前明确收口为“显式 API contract 输入”模式，不再假装真实上游结果已经存在。
  - 包装定义单位目前仅对白名单单位做映射：长度支持 `mm / cm / m`，重量支持 `kg / g`；遇到未知单位会显式报错，避免静默算错。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-source-package-input.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-state.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-data.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-page.ts src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-recommendations.ts src/features/logistics-config/vehicle-loading/components/vehicle-loading-source-input-panel.tsx src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx`：通过。
  - `go test ./handlers -run TestGetVehicleLoadingRecommendationsHandlerReturnsRecommendations -count=1`：通过。
  - 脱链文件删除后已再次确认 `find_by_name` 无残留文件。

## 2026-04-15 logistics-config recommendations 中等收口（canInvert 语义 + authority 边界 + 默认常量）

- **变更概述**
  - 修正前后端朝向语义：
    - `canRotate` 现在明确表示“只允许底面旋转，长宽可互换，保持高度方向不变”。
    - `canInvert` 现在明确表示“允许改变竖直方向，将箱体侧放或翻面参与计算”。
    - 前端 `vehicle-orientation.ts` 与后端 `logistics_vehicle_loading_recommendation_service.go` 已同步收口该语义。
  - 修复前端旧朝向枚举 bug：
    - `vehicle-orientation.ts` 中部分对象字面量之前误用了简写，导致看似枚举 6 个朝向、实际可能只返回 1 个；本轮已修复。
  - 收口来源边界与交互：
    - `vehicle-loading-tab.tsx` 已明确说明 `packing-rule` 当前是“包装定义驱动试算”，箱数仍来自本页 summary。
    - `vehicle-loading-tab.tsx` 已明确说明 `api` 来源当前直接消费页面显式输入，不再回落默认箱型冒充真实来源。
    - `vehicle-loading-source-input-panel.tsx` 已在 `canRotate=false` 时自动复位并禁用 `canInvert`，避免暴露无效组合。
  - 收口默认箱型常量：
    - 前端默认箱型已统一为 `DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION`，降低前端内部漂移风险。
  - 补充定向测试：
    - 前端 `vehicle-loading-engine.test.ts` 已新增 `canRotate / canInvert` 朝向语义测试。
    - 后端 `logistics_vehicle_loading_test.go` 已新增 `canInvert` 会影响 recommendations 可行性的 handler 测试。

- **架构收口结果**
  - `canInvert` 不再只是 UI/contract 名义字段，而是成为真正参与 recommendations 算法的行为输入。
  - `packing-rule` 当前 authority 边界已被明确说清：本轮仍不扩大到 `calculatePackagingPlan()`，避免在没有完整业务上下文时混入伪 authority。
  - 本轮没有把单位换算继续扩大到 authority-driven；该项仍保留为后续优化项。

- **验证结果**
  - `pnpm exec vitest run src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-loading-engine.test.ts`：通过。
  - `go test ./handlers -run "TestGetVehicleLoadingRecommendationsHandler(ReturnsRecommendations|ConsumesCanInvert)" -count=1`：通过。
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-orientation.ts src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-loading-engine.test.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input.ts src/features/logistics-config/vehicle-loading/components/vehicle-loading-source-input-panel.tsx src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-16 logistics-config recommendations 单位映射 Authority 化改造（P3）

- **变更概述**
  - **梳理并收敛单位权限边界**：确认现有 `Unit` 模型具有 `category` 和 `code` 等基本信息，但未自带内置转换系数。因而此轮升级的目标并非动态推导全量单位换算，而是采用“服务端单位库拦截+核心白名单映射”组合。
  - **建立挂载点**：
    - 在 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-source-package-input.ts` 中通过 `useUnitsQuery` 获取激活的主数据单位库，与 `profilesQuery` 的加载状态共同作为衍生包输入的执行条件。
  - **严密校验机制升级**：
    - 重构 `toMillimeters` 和 `toKilograms` 方法。
    - 方法执行现在会首先寻找给定的 `unitCode` 是否在激活的 `units` 数据库里存在，如果不存在直接 `fail loudly` 报错。
    - 获取到的单位对象，其 `category` 必须为对应的 `LENGTH` 或 `WEIGHT` 类别，否则阻断后续计算。
    - 最后才继续通过对代码的标准识别做单位基础值的数学运算转换。

- **架构收口结果**
  - `packing-rule` 真正受到系统基础设定 `basic-settings/units` 库的主数据约束。无效或被停用的单位无法通过校验从而防止因为底层设定调整造成的静默算错风险。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-source-package-input.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input.ts`：通过。
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-16 shipping-management/contacts 车型联系人前后端数据流重构与 400 修复 (P4)

- **问题现象**
  - 在 `/shipping-management/contacts` 页面新增联系人时，点击“保存”按钮会在控制台隐蔽触发 `400 Bad Request`，导致数据无法落库。
  - 旧版 `api.ts` 的 `apiFetch` 在遇到非 20x 状态码时，直接抛弃了后端的错误信息报文，导致前端开发者完全无从排查具体的 400 原因。
  - 经排查证实，由于前端 `vehicle-contact-editor-dialog.tsx` 保存前强行抛弃非单项 Phone Channel 的组合策略，与后端过于复杂的 `normalizeVehicleContactChannels` 的补偿机制完全脱节，造成严重的契约漂移。

- **重构方案**
  - **废弃双向的过度复杂化逻辑**，改为**所见即所得 (1:1 映射)** 模式。
  - **前端状态精简**：
    - `vehicle-contact-editor-dialog.tsx` 移除了 `phoneChannels` 与 `nonPhoneChannels` 的分离状态，统归一个 `channels: ContactChannel[]`。
    - 移除了 `use-vehicle-contact-actions.ts` 里的冗长 `buildContactPayload`，直接透传与后端契约等同的 `VehicleContactBinding` 完整数据实体。
  - **后端校验降级**：
    - 彻底干掉了 `server/services/vehicle_contact_binding_service.go` 中“当缺少主电话时自动把第一个推为主电话并重排数组”的 `normalizeVehicleContactChannels`。
    - 后端仅保持基于输入的必填项与“且只能包含一个主电话联系方式”的强校验。
  - **api.ts 增强**：
    - 修复了 `src/lib/api.ts` 忽略后端 JSON 响应的问题，现遇到错误会正确提取 `errorData.error || errorData.message` 给调用方抛出。

- **架构收口结果**
  - 联系人编辑状态链大幅变短，前后端对于 `Channels` 数组的心智模型对齐到了“所见即发”的标准 Restful 模型。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `go build -v ./...`：后端编译通过。

## 2026-04-15 修复侧边栏 /shipping-management 权限映射缺失导致的崩溃

- **问题现象**
  - 进入已登录页面时，侧边栏构建阶段抛错：`[permission-catalog] Unmapped top-level path: /shipping-management`，并触发 ErrorBoundary 重建。

- **原因定位**
  - `src/components/layout/data/sidebar-data.ts` 存在菜单项 `url: '/shipping-management'`，其 `permissionId` 通过 `getMenuPermissionForPath()` 计算。
  - `src/features/authz/data/permission-catalog.ts` 的 `ROUTE_TO_MENU_MAPPING` 缺少 `'/shipping-management'`，导致 `getMenuPermissionForPath()` 直接 `throw`。

- **修复方式**
  - 在 `src/features/authz/data/permission-catalog.ts` 为 `'/shipping-management'` 补齐映射，并按“销售管理（与报价同级）”归属到 `menu_trading`。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 通用搜索顶栏 + 一致 TAB 栏第一批样板（logistics-config）

- **变更概述**
  - 新增 `src/components/layout/module-header-summary.tsx`，用于在统一 `Header` 左侧展示模块级标题与说明。
  - 改造 `src/components/layout/module-tabbed-layout.tsx`，新增可选 `headerTitle / headerDescription`，保持现有 `title` 行为向后兼容。
  - 改造 `src/features/logistics-config/index.tsx`，让 `logistics-config` 模块通过 `ModuleTabbedLayout` 在统一顶栏中显示模块识别信息，同时保留全局 `Search` 入口。
  - 在 `src/locales/messages/zh-CN/logisticsConfig.ts` 与 `src/locales/messages/en-US/logisticsConfig.ts` 中补充 `moduleDescription` 文案。

- **架构收口结果**
  - 本轮没有新造第二套搜索入口，而是明确复用既有 `Header + Search` 作为通用搜索顶栏能力。
  - `logistics-config` 作为第一批模块样板，已具备“统一 Header + 模块级 TabBar + 模块内容区摘要”的完整结构。
  - 这一步只收口模块级路由 TAB；页面内局部 TAB 的统一 variant 仍留待下一阶段推进。

- **验证结果**
  - `pnpm exec tsc --noEmit`：待执行。

## 2026-04-15 发货管理接入统一搜索顶栏与模块级多 TAB 结构

- **变更概述**
  - 新增 `src/features/trading/shipping-management/` 目录，按模块化方式拆分 `发货管理` 入口与子页内容。
  - 新增 `src/features/trading/shipping-management/index.tsx`，通过 `ModuleTabbedLayout` 接入统一 `Header + Search + ModuleTabs`。
  - 新增模块级 TAB 定义：`车型匹配` / `联系人` / `发货记录`。
  - `车型匹配` / `联系人` / `发货记录` 三个子页已对齐现有 `PageHeader` 模式，不再使用临时卡片充当页眉。
  - 新增 `src/routes/_authenticated/shipping-management/` 子路由目录，并将 `/shipping-management` 默认重定向到 `/shipping-management/vehicle-match`。
  - `src/routes/_authenticated/shipping-management.lazy.tsx` 已切换为加载新的模块入口，不再继续渲染旧的页内 Tabs 版本。
  - 在 `src/locales/messages/zh-CN/trading.ts` 与 `src/locales/messages/en-US/trading.ts` 中补齐 `trading.shippingManagement.*` 文案。

- **架构收口结果**
  - `发货管理` 已从“单页内局部 Tabs”提升为“模块级路由 Tabs”。
  - 页面顶部现在会走统一 `Header`，因此可见全局 `Search` 入口；模块识别摘要改为放在模块内容区顶部，而不是插入通用顶栏。
  - 旧页面内 Tabs 不再作为主导航结构，避免与模块级 Tabs 叠加冲突。
  - 由于三个子页已各自拥有 `PageHeader`，发货管理模块内容区顶部的重复模块摘要已移除，避免标题与说明重复出现。

- **验证结果**
  - `pnpm exec tsc --noEmit`：待执行。

## 2026-04-15 联系人卡片绑定车型规格库（第一步前端共享抽象）

- **变更概述**
  - 新增 `src/features/logistics-config/vehicle-loading/query-keys.ts`，为车型规格库建立共享 query key。
  - 新增 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query.ts`，通过 React Query 提供共享车型规格库读取层。
  - `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-specs.ts` 已改为复用共享 query 层，不再直接使用 `useEffect + useState` 手动拉车型规格库。
  - 新增 `src/features/trading/shipping-management/contact-bindings.mock.ts`，定义“车型 -> 联系人卡片”前端绑定关系 mock 视图模型。
  - 改造 `src/features/trading/shipping-management/contacts-page.tsx`，让联系人页消费共享车型规格库，并以车型卡片 + 联系人卡片形式展示绑定关系，同时具备 loading / error / empty 三态。

- **架构收口结果**
  - 车型规格库 authority 不再挂死在 `vehicle-loading` 页面 hook 中，而是提升为可被多个页面复用的共享读取层。
  - “联系人绑定车型”仍保持为独立的绑定关系层，没有污染 `VehicleSpec` 主模型语义。

- **验证结果**
  - `pnpm exec tsc --noEmit`：待执行。

## 2026-04-15 车型规格库独立 TAB + 后端 authority 化（748）

- **变更概述**
  - 新增后端车型规格库 authority 骨架：
    - `server/models/logistics_vehicle_spec.go`
    - `server/services/logistics_vehicle_specs_service.go`
    - `server/handlers/logistics_vehicle_specs.go`
  - `server/routes/routes.go` 已新增 `GET /api/v1/logistics/vehicle-specs`，作为前端共享车型规格库读取入口。
  - 升级前端 `VehicleSpec` / zod schema，新增物理尺寸、可用装载空间、安全余量、装载约束、启用状态与备注字段。
  - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts` 已切到新的后端车型规格库 authority，并对响应执行 schema 校验。
  - 新增独立车型规格库页：
    - `src/features/logistics-config/vehicle-specs-library-tab.tsx`
    - `src/routes/_authenticated/logistics-config/vehicle-specs-library.tsx`
    - `src/routes/_authenticated/logistics-config/vehicle-specs-library.lazy.tsx`
  - `src/features/logistics-config/tabs.ts` 已加入 `车型规格库` 独立 TAB。
  - `src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx` 已从“车型库 + 配车计算”混合页收口为“只承载装载/配车计算”的页面。

- **架构收口结果**
  - 车型规格库不再长期附着于 `vehicle-loading` 页内，而是提升为独立 TAB 与共享 authority。
  - `vehicle-loading` 只负责消费车型库并做试算/推荐，不再承载主数据维护语义。
  - 车型规格字段不再只有名义体积与理想尺寸，开始显式区分“物理空间”与“可用空间”。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `go test ./handlers ./routes -run ^$`：通过。

## 2026-04-15 物流侧边栏独立一级分类（749 第一阶段：导航语义纠偏）

- **变更概述**
  - 调整 `src/components/layout/data/sidebar-data.ts`，将 `logistics-config` 从 `系统配置` 分组中移出，独立到新的一级分组 `物流`。
  - 保持现有路由 `/logistics-config/*` 不变，先只纠正侧边栏导航语义，不进行整套路由迁移。
  - 在 `src/locales/messages/zh-CN/sidebar.ts` 与 `src/locales/messages/en-US/sidebar.ts` 中补充 `sidebar.groups.logistics` 文案。

- **架构收口结果**
  - 物流入口不再继续压在“系统配置”语义下。
  - 当前阶段只调整导航信息架构，权限与现有路由兼容策略暂保持不变，降低迁移风险。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 物流 TAB 拆分为多个侧边菜单（750 第一阶段：物流配置）

- **变更概述**
  - 新增独立模块 `logistics-settings`：
    - `src/features/logistics-settings/index.tsx`
    - `src/features/logistics-settings/tabs.ts`
  - 新增新模块路由：
    - `src/routes/_authenticated/logistics-settings/route.tsx`
    - `src/routes/_authenticated/logistics-settings/route.lazy.tsx`
    - `src/routes/_authenticated/logistics-settings/index.tsx`
    - `src/routes/_authenticated/logistics-settings/scanning.tsx`
    - `src/routes/_authenticated/logistics-settings/scanning.lazy.tsx`
    - `src/routes/_authenticated/logistics-settings/platforms.tsx`
    - `src/routes/_authenticated/logistics-settings/platforms.lazy.tsx`
  - 侧边栏 `物流` 分组下新增并列入口 `物流配置`。
  - `src/features/logistics-config/tabs.ts` 已移除 `扫描配置`、`接口平台` 两个 TAB。
  - 旧路径 `/logistics-config/scanning`、`/logistics-config/platforms` 已改为兼容跳转到新入口：
    - `/logistics-settings/scanning`
    - `/logistics-settings/platforms`

- **架构收口结果**
  - 物流域不再只有一个不断膨胀的总入口，而是开始按能力簇拆为并列侧边菜单。
  - 第一阶段先把偏“配置/集成能力”的 `扫描配置`、`接口平台` 收口到 `物流配置`。
  - 当前仍保留旧路由兼容，避免直接打断已有书签和内部跳转。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。

## 2026-04-15 销售订单 fulfillmentRate 根因修复 + 详情抽屉化承接（751）

- **变更概述**
  - 后端新增 `server/services/sales_order_fulfillment.go`，统一计算销售订单 `fulfillmentRate`。
  - 后端在 `server/services/sales_order_dto.go`、`server/services/sales_order_mapper.go` 中补充 `fulfillmentRate` 返回，确保销售订单列表与详情都由服务端 authoritative 提供该字段。
  - `server/services/order_master_service.go` 调整销售订单列表查询：即使列表不回传完整 `lines` payload，也会最小预加载 `qty / delivered_qty` 以支撑 `fulfillmentRate` 计算。
  - 新增 `server/services/sales_order_fulfillment_test.go`，覆盖 fulfillment rate 计算与 DTO 映射。
  - 前端新增独立容器组件 `src/features/trading/components/sales-order-detail-sheet.tsx`，用底部 `Sheet` 承接销售单详情。
  - `src/features/trading/components/sales-order-list-fixed.tsx` 不再使用“列表 1/3 + 详情右侧内嵌面板”布局；点击销售单后保持主列表宽度稳定，通过 `detailId` 路由参数打开底部详情抽屉。
  - `src/features/trading/components/sales-order-detail.tsx` 支持直接接收 `orderId`，保证详情容器与业务内容解耦。

- **根因结论**
  - 报错不只是前端 fail loudly 严格，而是后端销售订单响应链此前并未真正返回 `fulfillmentRate`。
  - 同时，列表查询默认未带足够的行级交付信息，导致前端即使有契约字段也无法稳定拿到可计算数据。

- **架构收口结果**
  - `fulfillmentRate` 回归服务端 authoritative 字段，前端不再为缺字段而持续打日志。
  - 销售单详情不再继续挤压主列表，而是改由独立底部抽屉承接。
  - 详情业务内容组件与承接容器组件完成解耦，后续若要调整为其他容器样式，可继续复用 `SalesOrderDetail`。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `go test ./services ./handlers -run "TestCalculateSalesOrderFulfillmentRate|TestMapSalesOrderToResponseIncludesFulfillmentRate|TestMapSalesOrdersToListItemsIncludesFulfillmentRateWithoutLinesPayload|^$"`：通过。

- **第二轮结构收口**
  - 新增 `src/features/trading/components/sales-order-detail-content.tsx`，将详情内容编排下沉为独立内容层文件。
  - `src/features/trading/components/sales-order-detail.tsx` 收口为容器层，负责详情 query、权限、mutation 与预览状态 orchestration。
  - `src/features/trading/components/parts/sales-order-detail-activity.tsx` 与 `src/features/trading/hooks/use-sales-order-detail-activity.ts` 的硬删除回调改为直接传递详情 authoritative `order`，不再只上传 `id`。
  - `src/features/trading/components/sales-order-list-fixed.tsx` 新增 `handleDeleteOrderFromDetail(order)`，详情抽屉删除/作废链不再依赖列表页 `orders.find()`，避免 URL 直达、跨页或筛选场景下动作链丢失上下文。

- **第二轮验证结果**
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

## 2026-04-15 车型实拍图旁路弹窗（753）

- **变更概述**
  - 新增 `src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts`，按 `vehicle.id` 维护车型实拍图清单、视角类型与静态标注元数据结构。
  - 新增 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts`，将实车图弹窗的选中车型与打开状态收口为独立 hook。
  - 新增 `src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx`，实现独立业务弹窗；不复用现有装载示意图业务弹窗，支持多张图片切换与图片位置 Metadata 展示。
  - 新增 `src/features/logistics-config/vehicle-loading/components/vehicle-photo-trigger-button.tsx`，统一“查看实车图”按钮样式与调用入口。
  - 在 `src/features/logistics-config/vehicle-specs-library-tab.tsx`、`src/features/logistics-config/vehicle-loading/components/vehicle-specs-table.tsx`、`src/features/logistics-config/vehicle-loading/components/vehicle-recommendation-panel.tsx` 接入统一实车图按钮。
  - 在 `src/features/logistics-config/vehicle-loading-tab.tsx` 接入实车图弹窗状态，并顺手将装载示意图尺寸来源从旧 `inner*` 字段收口为 `usableInnerSize`。
  - 在 `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts` 移除已失效的 `innerLengthMm / innerWidthMm / innerHeightMm` 字段，保持当前前端类型契约一致。
  - 在 `src/locales/messages/zh-CN/logisticsConfig.ts` 与 `src/locales/messages/en-US/logisticsConfig.ts` 补充车型实拍图相关文案。

- **架构收口结果**
  - 车型实拍图能力采用独立业务弹窗，不与现有“装载示意图”业务组件复用或耦合。
  - 图片展示链与车型主数据链保持松耦合，仅通过 `vehicle.id` 关联。
  - 当前仓库尚未挂入真实车型图片资源，因此弹窗已具备多视角与标注结构，但现阶段会显示明确空态而不是主流程报错。

- **验证结果**
  - `pnpm exec tsc --noEmit`：通过。
  - `pnpm exec eslint src/features/logistics-config/vehicle-specs-library-tab.tsx src/features/logistics-config/vehicle-loading-tab.tsx src/features/logistics-config/vehicle-loading/components/vehicle-specs-table.tsx src/features/logistics-config/vehicle-loading/components/vehicle-recommendation-panel.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-trigger-button.tsx src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts`：通过。

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

## 2026-04-16 `/shipping-management/contacts` 新增联系人弹窗 UDS 1.0 样式收口（759）

- **变更概述**
  - 调整 `src/features/shipping-management/vehicle-contact-editor-dialog.tsx`，将原先自定义 `fixed` 蒙层 + `Card` 弹窗重构为统一的 `ActionDialogShell` 承接。
  - 引入 `buildActionDialogShellClasses`，统一弹窗 content / header / body / footer 的 UDS 1.0 样式口径。
  - 对齐联系人弹窗内表单控件样式：标签统一为 `text-[10px] font-black uppercase`，输入框、选择器和文本域统一为 `h-10 rounded-xl` / `rounded-xl` 风格。
  - 调整 `src/features/shipping-management/vehicle-contact-channel-row.tsx`，将联系方式行切到更一致的 UDS 1.0 视觉：行级虚线容器、统一尺寸输入控件、`Checkbox` / `RadioGroup` 主项控件以及统一按钮样式。
  - 第二轮继续收口下拉交互：将 `vehicle-contact-editor-dialog.tsx` 中的车型、启用状态，以及 `vehicle-contact-channel-row.tsx` 中的联系方式类型选择，从浏览器原生 `<select>` 替换为项目现有 `Select / SelectTrigger / SelectContent / SelectItem` 体系。

- **收口结果**
  - 新增联系人 / 编辑联系人弹窗现在与项目内其它标准动作弹窗的头部、主体和底部操作区风格一致。
  - “联系方式”区块从原先偏原生表单混搭的样式，收口为更清晰的 UDS 1.0 信息层级与操作视觉。
  - 本轮仅调整 UI 承接和样式，没有扩大到联系人 `channels` 数据结构或保存链重构，保持现有数据契约稳定。
  - 弹窗内所有关键下拉现在都使用统一的 UDS 浮层菜单，不再出现浏览器原生下拉菜单观感。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/vehicle-contact-editor-dialog.tsx src/features/shipping-management/vehicle-contact-channel-row.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 修复 `/logistics-config/vehicle-loading` 页面 `categoryLabel` 导入漂移导致的模块加载 500（760）

- **变更概述**
  - 调整 `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-page.ts`，移除对不存在导出的 `categoryLabel` 引用，改为统一消费 `categoryLabelKey`，并通过 `useLanguage().t(...)` 生成分类筛选文案。
  - 调整 `src/features/logistics-config/vehicle-loading/components/vehicle-specs-table.tsx`，将车型类别展示从旧的 `categoryLabel(...)` 调用收口为 `t(categoryLabelKey(spec.category))`。
  - 复核 `src/features/logistics-config/vehicle-loading` 域内 `categoryLabel` 残留调用，确认旧命名引用已清空，避免同类模块加载/编译漂移重复出现。

- **收口结果**
  - `/logistics-config/vehicle-loading` 不再因为 ESM 命名导出不匹配在模块加载阶段直接失败。
  - 分类标签 authority 统一回到 `vehicle-loading.utils.ts` 现有的 `categoryLabelKey` 出口，没有再重新造一套 `categoryLabel` helper。
  - 本轮只做根因级导出契约修复，没有扩大到 `vehicle-loading` 其它状态、服务或算法链路改造。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-page.ts src/features/logistics-config/vehicle-loading/components/vehicle-specs-table.tsx src/features/logistics-config/vehicle-loading/data/vehicle-loading.utils.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 简化 `/logistics-config/packaging-rules` 弹窗“包装名称”为物料库搜索选择（761）

- **变更概述**
  - 调整 `src/features/logistics-config/packaging-rules-tab.tsx`，将“包装名称”从自由输入改为项目现有 `Combobox` 搜索选择。
  - 新增物料库 options 读取，复用 `MaterialCoreService.getMaterialOptions()` 与 `MATERIAL_OPTIONS_QUERY_KEY`，仅过滤并展示 `category === 'PACKAGING'` 的物料。
  - 选中包装物料后，将物料名称回填到 `draft.name`，保持当前 `PackagingProfile` 保存契约不变，不新增后端字段。
  - 补充包装物料 options 缺失时的 fail loudly 校验，避免弹窗在数据缺失时静默退化。

- **收口结果**
  - 包装定义弹窗中的“包装名称”不再脱离物料档案自由录入，而是收口到包材档案选择。
  - “产品”字段仍然只表示适用产品，没有与包装物料选择混用。
  - 本轮按最小方案执行，只完成前端来源闭环；后端仍仅保存 `name`，未新增 `packagingMaterialId` 强关系字段。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/packaging-rules-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `shipping-management` 车型联系人读写链的 Hook / Service 分层边界（764）

- **变更概述**
  - 新增 `src/features/shipping-management/services/vehicle-contact-service.ts`，统一承接车型联系人的列表读取、保存和删除请求。
  - 在 service 内补充后端响应契约校验：列表接口按数组响应校验、保存接口按对象响应校验，并将后端存储字段 `channelsJson` 适配为前端消费字段 `channels`。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`，移除 Hook 内直接 `apiFetch(...)` 请求，只保留 service 调用、`invalidateQueries` 和 `showToast` 副作用编排。
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`，移除 Hook 内直接请求和静默 `[]` 兜底，统一改为读取 service，并保持读取错误向上暴露。

- **收口结果**
  - 车型联系人写链不再把“请求 + Query 失效 + Toast”揉在同一个 Hook 中，分层边界回到 `service 承接请求 / hook 承接副作用编排`。
  - 车型联系人读链也同步回到同一边界，避免继续在 Hook 中直接请求并静默吞掉异常响应。
  - 前端消费层不再需要隐式依赖后端的 `channelsJson` 存储字段，DTO 适配已收口到 service 层。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/services/vehicle-contact-service.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `vehicle-contact-editor-dialog.tsx` 中基于 `Partial<T>` 的本地补丁更新表达（765）

- **变更概述**
  - 调整 `src/features/shipping-management/vehicle-contact-editor-dialog.tsx`，移除 `updateForm(patch: Partial<VehicleContactBindingForm>)`，改为明确字段更新入口 `updateFormField(field, value)`。
  - 移除 `updateChannel(index, patch: Partial<ContactChannel>)`，改为统一的 `updateChannels(...)` 承接器，以及更明确的 `setChannelType(...)`、`setChannelValue(...)` 更新函数。
  - `setPrimaryChannel`、`addChannel`、`removeChannel` 继续复用统一的 channel 更新承接，保持 `primaryPhone` 自动联动逻辑不变。

- **收口结果**
  - 车型联系人弹窗中不再使用业务层 `Partial<T>` 本地补丁更新写法。
  - 本地交互仍保持轻量，没有为了去掉 `Partial` 而把编辑弹窗升级成重型 SDRTS 提交器。
  - 当前表单校验、渠道增删改、主电话同步和最终保存 payload 语义保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/vehicle-contact-editor-dialog.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `vehicle-contact-service.ts` 中未使用 Zod Schema 的 DTO 解析（766）

- **变更概述**
  - 新增 `src/features/shipping-management/services/vehicle-contact.schema.ts`，使用 Zod schema 定义车型联系人渠道 DTO、原始联系人接口 DTO 与转换后联系人 DTO。
  - 将 `channelsJson` 的解析收口到 schema transform 边界，不再在 service 主逻辑中散落 `JSON.parse(...)` 与手写字段校验。
  - 调整 `src/features/shipping-management/services/vehicle-contact-service.ts`，移除手写 `VehicleContactBindingApiDTO` 与 `ensure*Response()` 解析流程，改为统一基于 schema `safeParse()` 验证列表与单项返回。

- **收口结果**
  - 车型联系人 service 已对齐 `GEMINI.md` 中“services 返回值必须基于 Zod Schema DTO” 的约束。
  - `channelsJson -> channels` 的适配不再散落在 service 主逻辑里，而是收口到 schema / DTO 解析边界。
  - 当前 hook / service 分层与联系人业务交互没有回退。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/services/vehicle-contact-service.ts src/features/shipping-management/services/vehicle-contact.schema.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `use-vehicle-contact-actions.ts` 的副作用编排职责（767）

- **变更概述**
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`，移除对 `showToast` 的依赖，去掉 Hook 内成功 / 失败文案与错误转译逻辑。
  - 保留 Hook 内的写动作调用与 `queryClient.invalidateQueries(...)`，继续由 Hook 承接刷新编排。
  - 调整 `src/features/shipping-management/contacts-page.tsx`，将保存、删除、启停切换等具体 UI 场景的成功 / 失败提示上浮到页面层展示。

- **收口结果**
  - `use-vehicle-contact-actions.ts` 不再承担 toast 展示职责，边界更接近项目内其它写动作 hook 的惯用模式。
  - query invalidation 没有被散回页面层，避免 UI 侧重新堆叠刷新逻辑。
  - 当前联系人写入 service、DTO 解析和业务语义均未回退。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/contacts-page.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `vehicle-contact.schema.ts` 中 `channelsJson` 的重复解析路径（769）

- **变更概述**
  - 调整 `src/features/shipping-management/services/vehicle-contact.schema.ts`，新增 `vehicleContactChannelDTOArraySchema`，统一承接联系人渠道数组的 DTO 校验与 `primary` 规范化。
  - 保留 `channelsJson` 的字段级 JSON 解析，但移除 `vehicleContactBindingDTOSchema.transform(...)` 内再次显式 `safeParse(...)` 的重复路径。
  - 当前 schema 组织改为：`raw schema -> parsed schema -> final DTO schema` 的单一路径组合，`vehicle-contact-service.ts` 继续只调用统一 DTO schema。

- **收口结果**
  - `vehicle-contact.schema.ts` 不再出现 transform 内再次 parse 同一字段的重叠解析路径。
  - DTO 解析入口更单一，schema / service 边界更统一。
  - 当前联系人 DTO 语义与 `channelsJson -> channels` 适配结果保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/services/vehicle-contact.schema.ts src/features/shipping-management/services/vehicle-contact-service.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `vehicle-contact-editor-dialog.tsx` 中实体装配与持久化载荷拼装职责（770）

- **变更概述**
  - 调整 `src/features/shipping-management/vehicle-contact-editor-dialog.tsx`，将 `onSaved` 契约从完整持久化实体改为提交 `VehicleContactBindingForm`，dialog 本身不再构造 `VehicleContactBinding`。
  - 调整 `src/features/shipping-management/contacts-page.tsx`，新增页面级 `toVehicleContactSaveInput(...)` 与 `toVehicleContactToggleInput(...)`，承接当前页面上下文的保存输入装配。
  - 调整 `src/features/shipping-management/services/vehicle-contact-service.ts`，让 service 接收 `VehicleContactBindingSaveInput`，并在更低层承接 `id` 生成与持久化请求载荷整形。

- **收口结果**
  - dialog 组件回到“收集表单输入并提交”的 UI 边界，不再自行决定实体身份与持久化字段。
  - 实体装配与持久化意图已下沉到页面管理层 / 写入层，`service` 纯请求边界仍保持不变。
  - 当前表单交互、校验与联系人保存语义保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/vehicle-contact-editor-dialog.tsx src/features/shipping-management/contacts-page.tsx src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/services/vehicle-contact-service.ts src/features/shipping-management/contacts-page.types.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 收口 `vehicle-contact-channel-row.tsx` 中领域交互规则与视图组件的耦合（771）

- **变更概述**
  - 调整 `src/features/shipping-management/vehicle-contact-channel-row.tsx`，让 row 组件改为接收上层显式传入的派生 UI 状态，如 `typeOptions`、`isTypeLocked`、`primaryControlMode`、`showRemoveAction`、`valuePlaceholder` 等。
  - 调整 `src/features/shipping-management/vehicle-contact-editor-dialog.tsx`，新增 `getChannelRowUiState(...)`，在表单层统一决定电话行锁定、主项展示模式、删除可用性与展示文案。

- **收口结果**
  - row 组件更接近纯展示 / 事件转发组件，不再直接裁决主要的领域交互规则。
  - `phone` 通道锁定、primary 展示模式与删除可用性等规则已更明确地回到表单层裁决。
  - 当前渠道编辑交互、primary 规则与 `phone` 通道约束语义保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/vehicle-contact-channel-row.tsx src/features/shipping-management/vehicle-contact-editor-dialog.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 修复 `contacts-list-panel.tsx` 中空状态依赖 props 契约遗漏（772）

- **变更概述**
  - 调整 `src/features/shipping-management/contacts-list-panel.tsx`，补齐 `vehicleSpecsLoading`、`vehicleSpecsError`、`vehicleSpecsStatus`、`vehicleOptionsCount` 四个缺失 props。
  - 新增 `VehicleSpecsLoadState` 类型导入，并将 `vehicleSpecsStatus` 直接对齐到 `useVehicleSpecsQuery()` 已导出的状态类型。

- **修复结果**
  - `contacts-list-panel.tsx` 中空状态区域不再引用未声明变量。
  - `ContactsPage` 现有传参已与子组件契约重新对齐，无需额外调整调用逻辑。
  - 当前空状态提示、按钮禁用与状态展示行为保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/contacts-list-panel.tsx src/features/shipping-management/contacts-page.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 审计域清理阶段 A1：将完整交易/仓储旧写入底层切到新事件链（773-A1）

- **变更概述**
  - 新增 `server/services/audit_legacy_bridge.go`，把旧 `Diff` JSON / `deltaKeys` 风格统一桥接为新 `AuditEvent.ChangeSet`。
  - 新增 `server/services/audit_legacy_adapter.go`，让现有 `AuditEntry` / `auditLogger` / `defaultAuditLogger` 直接转发到新 `server/audit/*` 写入链。
  - 调整 `server/audit/writer.go`，让新事件链落库时继续编码为当前时间线可读的 `DiffItem[]` JSON 结构，避免阶段 A1 立即打断读侧。

- **收口结果**
  - 交易 / 仓储域现有旧写入调用在不大面积改动业务文件的前提下，底层已统一转发到新事件写入链。
  - 旧 `AuditEntry/defaultAuditLogger` 仍暂存为兼容适配接口，但其底层已不再直接承担独立写入实现。
  - 阶段 B 之前，读侧仍可继续消费当前 `DiffItem[]` 结构；后续再移除 `audit_service.go` 的旧读取兼容层。

- **验证结果**
  - `go test ./services ./audit`：通过。

## 2026-04-16 审计域清理阶段 B：删除旧读侧兼容层并让时间线接口直接返回真实落库结构（773-B）

- **变更概述**
  - 调整 `server/handlers/audit_handlers.go`，移除对 `services.NormalizeAuditLogs(...)` 的调用。
  - 清理 `server/services/audit_service.go` 中仅用于旧审计 payload 兼容的读侧标准化逻辑。
  - 调整 `server/handlers/audit_handlers_test.go`，改为验证时间线接口返回真实存储的 `Diff` 结构。
  - 补齐 `server/handlers/suppliers.go` 中现有缺失的 `audit` / `trading_audit` 导入，以完成 handler 包测试验证。

- **收口结果**
  - 时间线读取接口不再承担旧 object-diff 到 `DiffItem[]` 的兼容转换职责。
  - 当前审计域后端已不再保留读侧兼容标准化层，读写两端进一步向新统一事件链收口。

- **验证结果**
  - `go test ./handlers -run DataTimeline`：通过。
  - `go test ./services ./audit`：通过。
  - `go test ./handlers ./audit ./services`：`handlers/suppliers.go` 因现有缺失导入问题失败，判定与本轮 A1 改造无关。

## 2026-04-16 审计域清理阶段 C / D：拆分 audit-engine 前端边界并收口混装类型/常量（773-C/D）

- **变更概述**
  - 新增 `src/features/audit-engine/` 目录，将 `audit-engine` 页面组件、stats hook、types、module 常量拆成独立 feature。
  - 调整 `/system-management/audit-engine` 路由，改为直接引用新 `audit-engine` feature。
  - 调整 `src/features/audit-timeline/types.ts` 与 `data/audit-modules.ts`，仅保留通用时间线概念。
  - 将原 `src/features/audit-timeline/components/audit-engine-tab.tsx` 与 `hooks/use-audit-engine-stats.ts` 收口为兼容转发层，避免潜在引用断裂。

- **收口结果**
  - `audit-engine` 页面不再和 `audit-timeline` 通用时间线能力混放在同一 feature 目录中。
  - 前端引擎总览与时间线详情的类型/常量边界已拆开，目录职责更清晰。

- **验证结果**
  - `pnpm exec eslint src/features/audit-engine/components/audit-engine-tab.tsx src/features/audit-engine/hooks/use-audit-engine-stats.ts src/features/audit-engine/types.ts src/features/audit-engine/data/audit-engine-modules.ts src/features/audit-timeline/components/audit-engine-tab.tsx src/features/audit-timeline/hooks/use-audit-engine-stats.ts src/features/audit-timeline/types.ts src/features/audit-timeline/data/audit-modules.ts src/routes/_authenticated/system-management/audit-engine.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 审计域清理阶段 A2：将组织域整组旧写入链与产线写入链切到新事件链（773-A2）

- **变更概述**
  - 调整 `server/services/organization_service.go`、`server/services/production_service.go`，移除对 `auditLogger` 的直接构造依赖。
  - 调整 `server/services/employee_assignment_commands.go`、`server/services/employee_import_service.go`、`server/services/org_personnel_patch_service.go`，把组织域残留旧写入链统一切到新事件写入链。
  - 调整 `server/services/organization_service_test.go`、`server/services/production_service_test.go`，使测试对齐新构造签名，并在需要处直接验证 `audit_logs` 落库结果。

- **收口结果**
  - `OrganizationService` 不再作为旧 `auditLogger` 依赖的中心节点向外扩散。
  - 组织域整组旧写入链与产线删除写入链已统一并入新审计事件链。
  - 当前后端残留的旧写入接口已进一步收缩，后续可继续推进阶段 B 的读侧兼容层删除。

- **验证结果**
  - `go test ./services ./audit`：通过。

## 2026-04-16 继续收口 `use-vehicle-contact-actions.ts` 中领域写操作与缓存失效策略的绑定（768）

- **变更概述**
  - 调整 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`，移除内部固定的 `invalidateQueries(...)`，让该 hook 只负责联系人保存 / 删除请求动作。
  - 调整 `src/features/shipping-management/contacts-page.tsx`，新增页面级 `refreshVehicleContacts()`，由当前页面负责保存、删除、启停切换后的 query invalidation。

- **收口结果**
  - 通用动作 hook 不再绑定当前页面缓存结构知识，领域操作与缓存失效策略边界进一步拆开。
  - 当前联系人页面仍能正常完成保存 / 删除 / 启停后的刷新与提示展示，用户侧行为没有回退。
  - `vehicleContactService` 纯请求边界继续保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/contacts-page.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 继续压缩 `/logistics-config/packaging-rules` 编辑弹窗内部垂直高度（763）

- **变更概述**
  - 调整 `src/features/logistics-config/packaging-rules-tab.tsx` 中弹窗内部纵向节奏，将外层滚动容器从 `space-y-7` 收口为 `space-y-5`，并同步收口 `py-7/lg:py-8`。
  - 调整主体区块容器与两个 section 标题区的纵向间距，将 `space-y-5` 收口为 `space-y-4`、`mb-5` 收口为 `mb-4`。
  - 调整 section 容器和汇总卡片的 padding / gap，将 `p-5 md:p-6` 收口为 `p-4 md:p-5`，并将汇总卡片从 `gap-4 p-6` 收口为 `gap-3 p-4`。
  - 调整备注输入框高度，将 `min-h-[132px] rows={4}` 压缩为 `min-h-[72px] rows={2}`，并同步下调内边距。

- **收口结果**
  - 弹窗内部不再因为较大的纵向留白和高备注区而过度拉高整体高度。
  - 主要字段区域在桌面端可见面积进一步提升，滚动需求继续下降。
  - 本轮只收口视觉间距与备注框高度，没有改动字段语义、保存链或后端数据契约。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/packaging-rules-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-16 调整 `/logistics-config/packaging-rules` 编辑弹窗宽度与响应式布局（762）

- **变更概述**
  - 调整 `src/features/logistics-config/packaging-rules-tab.tsx` 中编辑弹窗外层宽度，将 `DialogContent` 从 `w-[min(1120px,calc(100vw-2rem))]` 提升为 `w-[min(1360px,calc(100vw-1.5rem))]`。
  - 调整“基础信息”区响应式栅格，从 `grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` 提升为 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`。
  - 调整“尺寸与装箱”区响应式栅格，从 `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` 提升为 `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`，让四个尺寸/装箱字段更早横向并排。

- **收口结果**
  - 常见桌面窗口宽度下，包装规则编辑弹窗不再因为表单容器过窄而过早进入纵向滚动。
  - 中大屏幕下字段分布更均衡，基础信息和尺寸区的可视密度明显提高。
  - 本轮只调整布局承接，没有改动字段语义、保存链、汇总逻辑或后端数据契约。

- **验证结果**
  - `pnpm exec eslint src/features/logistics-config/packaging-rules-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

