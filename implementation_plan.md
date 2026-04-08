# implementation plan

## `search-engine` 纳入生产部署链修复（2026-04-08，待确认）

### 一、问题概述
当前顶层部署命令虽然会同步代码并执行 `server/deploy-prod.sh`，但实际默认部署路径仅重建 Go `app`，并未把 Rust 图像处理服务 `server/search-engine` 纳入生产编排。因此：

1. `server/search-engine/src/processor.rs` 的修复不会随默认部署自动发布；
2. 生产环境若仍依赖旧的 Rust 进程或宿主机 `localhost:8081` 假设，可能继续表现为旧问题；
3. 现有 `docker-compose.yml` 已纳入 `watchdog`，但未纳入图片上传实际依赖的 `search-engine`。

### 二、修复目标
本轮只修部署链，确保 Rust 图像处理服务成为正式的生产组成部分：

1. `docker-compose.yml` 新增 `search-engine` 服务；
2. `app` 显式通过环境变量访问 `http://search-engine:8081`；
3. `deploy-prod.sh` 默认部署路径把 `search-engine` 一起构建与启动；
4. 不破坏现有 `uploads/backups/postgres_data` 等运行时目录保护逻辑。

### 三、最小实施方案

#### A. `docker-compose.yml`
1. 新增 `search-engine` 服务：
   - `build: ./search-engine`
   - 容器内监听 `8081`
   - `restart: always`
2. `app` 增加环境变量：
   - `SEARCH_ENGINE_URL=http://search-engine:8081`
3. `app.depends_on` 增加对 `search-engine` 的依赖。

#### B. `deploy-prod.sh`
1. 默认 `app` 部署路径中，把 `search-engine` 与 `app` 一起 `up --build`；
2. `--full-build` 路径应包含 `search-engine`；
3. `--no-build` 快速路径也应保证 `search-engine` 被启动，而不是遗漏。

### 四、风险与注意事项
1. 不能因为加入新服务而漏掉现有 `db/redis/nginx_lb/watchdog` 语义；
2. 不能继续依赖宿主机 `localhost:8081`，否则容器内 Go 服务会指向错误位置；
3. 需要控制为最小改动，不扩散到 Nginx 站点配置或无关业务模块；
4. 若生产机首次构建 `search-engine` 较慢，属于预期现象。

### 五、涉及文件
- `server/docker-compose.yml`
- `server/deploy-prod.sh`
- 如需补说明，则同步 `walkthrough.md`

### 六、验证口径
完成后至少应满足：

1. 默认执行 `./deploy.sh` 时，`search-engine` 会随生产部署一起构建/启动；
2. Go `app` 会通过容器内地址访问 Rust 图像处理服务；
3. 新的 Rust 图像处理修复具备真正发布到服务器的路径；
4. `walkthrough.md` 记录本轮部署链修复与后续使用方式。

## 销售订单图片上传 `500 Image processing failed` 修复（2026-04-08，待确认）

### 一、问题概述
在上一轮修复上传路径漂移后，销售订单图片上传已能命中后端接口，但当前继续在图像处理链报：

1. 前端 `apiFetch` 对 `/sales-orders/evidence/upload` 返回 `500`；
2. 后端统一响应 `Image processing failed`；
3. 当前失败发生在 `HandleEvidenceUpload(...)` 调用 `services.GlobalSearchClient.ProcessImage(rawData)` 期间；
4. 该错误先于 Redis 查重与磁盘写入，因此不是 Redis 去重或落盘失败导致；
5. 若是大小超限，现有逻辑应返回 `413`，因此本次 `500` 也不是文件体积超限主因。

### 二、当前根因判断
当前代码表明，Rust `/v1/process-image` 中真正可能失败的高风险点只有两类：

1. `image::load_from_memory(raw_data)` 解码失败；
2. `webp::Encoder::from_image(&img)` 创建 WebP 编码器失败。

结合常见截图格式与当前错误口径，优先怀疑：

- Rust 图像处理链对部分 `DynamicImage` 输入格式的 WebP 编码兼容性不足；
- 其次才是个别图片解码失败。

### 三、修复目标
本轮不做前端规避，不把问题继续吞成笼统提示，而是从底层修复并提高可观测性：

1. Go 侧需要尽量保留 Rust 返回的真实错误上下文；
2. Rust 侧需要把输入图像显式转换为稳定像素格式后再执行 WebP 编码；
3. 继续保留既有 10MB 限制、Redis 去重降级逻辑与磁盘落盘链路；
4. 不扩大到 WebSocket 通知链或其他搜索索引业务。

### 四、最小实施方案

#### A. Go 侧
1. 调整 `SearchServiceClient.ProcessImage(...)`：
   - 读取 Rust 非 200 响应体；
   - 将状态码与 Rust 真实错误文本一并包装返回；
   - 让后端日志能区分“解码失败”与“WebP 编码失败”。
2. `HandleEvidenceUpload(...)` 仍对前端保持稳定错误口径，但服务端日志必须带上真实底层原因。

#### B. Rust 侧
1. 在 `processor.rs` 中不再直接把 `DynamicImage` 原样喂给 `Encoder::from_image(...)`；
2. 显式将图像转换为稳定的 `RGBA8` 或等价兼容格式后再编码；
3. 保持 pHash 计算仍基于已解码图像；
4. 为解码失败与编码失败提供清晰错误消息。

### 五、风险与注意事项
1. 不能因为修复 WebP 编码兼容性而放松文件大小限制；
2. 不能把 Rust 真实错误直接原样暴露给前端用户，但应保留在后端日志；
3. 不能把 Redis 未初始化场景重新变成阻断上传的强依赖；
4. 需要避免改动搜索索引 `/v1/index`、`/v1/search` 正常链路。

### 六、涉及文件
- `server/services/search_client.go`
- `server/handlers/evidence_handler.go`
- `server/search-engine/src/processor.rs`
- 如需最小验证，可能涉及 `server/search-engine/Cargo.toml` 或现有测试/命令

### 七、验证口径
完成后至少应满足：

1. 常见截图上传不再因为 WebP 编码链直接返回 `500 Image processing failed`；
2. 若 Rust 仍失败，Go 日志中能直接看到更具体的底层错误；
3. 现有前后端编译/最小验证通过；
4. `walkthrough.md` 补充本轮根因、修复方式与验证结果。

## 销售订单图片上传报错排查（2026-04-08，待确认）

### 一、问题概述
当前在“建立订单”的图片上传链路中，前端控制台已出现：

1. `/trading/sales-orders/evidence/upload` 请求返回 `404 Not Found`；
2. UI 出现 `Evidence upload failed [API_ERROR] 404 Not Found`；
3. 页面同时出现“存储服务同步失败”提示；
4. 控制台还存在 WebSocket `1006` 断开日志。

本轮首先要判断：

- 主失败是否就是“上传接口不存在 / 未注册 / 路径不匹配”；
- “存储服务同步失败”是否只是并行背景任务告警，而非本次上传主因；
- Redis 未就绪或 Rust 服务异常是否真实参与了这条上传主链。

### 二、排查目标
本轮只做根因分析，不直接修改业务代码。

需要回答三个问题：

1. 前端上传调用的真实接口路径是什么，是否拼接正确；
2. 后端是否存在该上传 handler / route，以及是否已注册到主路由；
3. Redis、Rust、WebSocket、存储同步服务分别在该链路中承担什么角色，和当前 `404` 是否存在直接因果关系。

### 三、排查方法
建议按以下顺序确认：

1. 检查前端 `order-evidence-manager` 与相关 service，确认上传 URL、请求方法、触发前提；
2. 检查后端 `sales-orders` 相关 handlers / routes，确认是否存在 `evidence/upload` 路由；
3. 搜索“存储服务同步失败”提示来源，确认其对应的后端服务与异常口径；
4. 搜索 Redis 与 Rust 搜索服务在订单附件 / 证据上传链路中的调用点，判断是否实际参与；
5. 若确认后端无该路由，则优先判定为接口未实现或前后端契约漂移，而不是 Redis / Rust 问题。

### 四、风险与判断原则
1. `404 Not Found` 通常优先指向“路由不存在 / 反向代理未转发 / 路径拼错”，优先级高于存储、Redis、Rust 内部异常；
2. 若 Redis 或 Rust 真正故障，常见表征更接近 `500`、`502`、`503` 或业务错误体，而不是稳定的 `404`；
3. WebSocket `1006` 更可能影响通知体验，不应在没有代码证据前直接认定为上传失败主因；
4. 若确认是前后端契约漂移，应从接口定义与路由注册层修复，不做前端规避性补丁。

### 五、涉及文件（预估）
- `src/features/trading/...order-evidence-manager...`
- `src/lib/api-client.ts`
- `server/routes/...sales...`
- `server/handlers/...sales...`
- 与“存储服务同步失败”提示相关的前后端文件
- 如有实际调用，再补充 Redis / Rust 相关服务文件

### 六、待你确认的边界
请确认是否按以下边界继续：

1. 本轮先只做代码级根因分析；
2. 不直接开始修复上传接口；
3. 先明确 `404` 与 Redis / Rust / WebSocket 的真实关系；
4. 输出结论后，再由你决定是否进入修复阶段。

## `error-action-registry` / `translate` 类型对齐修复（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成本次部署构建失败修复：

1. 根因定位为 `handle-server-error.ts` 将 `ErrorActionMetadata.messageKey` / `actionLabelKey` 作为普通 `string` 传入 `translate(...)`；
2. `src/lib/error-action-registry.ts` 已引入 `TranslationKey`；
3. `messageKey` 已收紧为 `TranslationKey`；
4. `actionLabelKey` 已收紧为 `TranslationKey | undefined`；
5. 验证通过：`pnpm exec tsc --noEmit`。

## `error-action-registry` / `translate` 类型对齐修复（2026-04-08，进行中）

### 一、问题概述
部署构建失败点位于 `src/lib/handle-server-error.ts`：

```ts
translate(locale, actionMetadata.messageKey)
translate(locale, actionMetadata.actionLabelKey)
```

其中 `translate` 的第二个参数要求是 `TranslationKey`，但 `src/lib/error-action-registry.ts` 当前把 `messageKey` / `actionLabelKey` 声明为普通 `string`，导致 `tsc` 在构建阶段报 `TS2345`。

### 二、最小修复策略
本轮采用最小修复：

1. 在 `src/lib/error-action-registry.ts` 中引入 `TranslationKey`；
2. 将 `messageKey` 类型收紧为 `TranslationKey`；
3. 将 `actionLabelKey` 类型收紧为 `TranslationKey | undefined`；
4. 不在 `handle-server-error.ts` 中继续扩大 `as any` 范围；
5. 保持注册表定义期即完成 i18n key 合法性校验。

### 三、验证要求
执行：

```bash
pnpm exec tsc --noEmit
```

目标：

1. `handle-server-error.ts` 中 `translate(...)` 不再报 `TS2345`；
2. 前端构建链恢复可通过状态。

## `customer / supplier`：核心标识字段变更事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `customer / supplier` 第二批主数据 TDO 接入，且验证通过：

1. 后端 `partner_transaction_service.go` 已新增：`CUSTOMER_IDENTITY_CHANGE`、`SUPPLIER_IDENTITY_CHANGE`；
2. transaction payload 已限定为 `code` / `name`；
3. transaction 已复用版本控制、存在性校验、`code` 唯一性校验与审计日志；
4. 前端 `customer-service.ts` / `supplier-service.ts` 已新增 identity transaction 请求；
5. 前端 hooks 已新增 `identityChangeMutation`；
6. `customer-list.tsx` / `supplier-list.tsx` 已在纯 `code` / `name` 变更时优先命中显式 transaction；
7. 混合档案编辑继续保留在现有 `patch` 链中；
8. 验证通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run "Customer|Supplier"`。

## `customer / supplier`：核心标识字段变更事务化（2026-04-08，待确认）

### 一、目标
在已完成 `customer.status` / `supplier.status` 第一批主数据 TDO 接入后，继续推进第二批更高语义密度的主数据动作：主体核心标识字段变更。

本轮目标不是把普通档案编辑全部事务化，而是只挑选真正代表“主体身份识别”的字段建立显式 intent，并保留现有 `patch` 作为普通维护型修改的安全兜底。

### 二、候选字段与语义边界

#### A. `customer`
建议优先只纳入：

1. `code`
2. `name`

理由：

- 二者直接影响客户主体识别、检索、展示与审计语义；
- 相比联系人、电话、邮箱、地址，更容易被稳定表达为单一业务动作；
- 更适合作为显式 transaction intent，而不是继续与普通档案字段混在通用 `patch` 中。

建议 intent## 2. 隔离开发策略 (Sandbox Strategy)
> [!IMPORTANT]
> 为了响应“坏掉也不影响其他功能”的要求，我们将采取以下极简耦合方案：

1. **物理隔离**：所有新功能代码（Service、Schema、UI）均存放在独立文件中，严禁修改现有的 `employee-core-service.ts` 或核心 Hooks。
2. **逻辑沙箱**：
   - 在 `tabs.ts` 中仅作为静态入口注册。
   - UI 组件将使用 `React.lazy` 异步加载，并包裹在 `SafeTabBoundary` 中。即使新页签代码发生运行时崩溃，也会被局限在页签内部，不影响整个“人员管理”模块的使用。
   - 请假审批逻辑将作为插件式 Service 接入，不干扰原有的员工入职/转正流。

## 3. 核心功能设计
B. `supplier`
建议优先只纳入：

1. `code`
2. `name`

理由：

- 二者直接影响供应商主体识别、搜索命中、下游引用与审计语义；
- 相比分类、联系人、电话、主营产品，更接近稳定的主体身份字段；
- 适合用单一 transaction intent 表达。

建议 intent 颗粒：

1. `SUPPLIER_IDENTITY_CHANGE`
   - 允许 payload 包含 `code`、`name`
   - 可覆盖纯 `code`、纯 `name`、`code + name` 三类主体标识变更

不纳入本轮：

- `category`
- `mainProducts`
- `contactPerson`
- `contactPhone`
- `email`
- `address`
- `rating`
- `status`

### 三、前端分流建议
前端建议只在以下条件命中显式 transaction：

1. 编辑对象已存在；
2. delta 仅包含 `code`、`name`；
3. 不混入其他普通档案字段；
4. 提交时仍携带版本号，由后端负责最终裁决。

其余情况：

- 新建继续走现有 create；
- 混合档案编辑继续保留在 `patch`；
- 前端不新增任何自定义唯一性猜测逻辑。

### 四、后端职责
后端若执行本轮实现，建议承担：

1. 新增 customer / supplier 身份字段变更 transaction service；
2. 明确 payload 只允许 `code`、`name`；
3. 复用现有唯一性校验、存在性校验、乐观锁、审计日志与引用约束；
4. 若 `code` 或 `name` 在下游存在额外联动要求，由后端统一裁决，不前移到前端；
5. 返回最新实体快照，保证前端缓存可直接刷新。

### 五、风险评估
本轮风险高于状态事务化，主要在于：

1. `code` 可能具备唯一性约束；
2. `name` 可能被 UI 检索、打印文案、订单快照或外部同步引用；
3. 若历史单据保存的是冗余快照字段，需确认“改主数据名称”是否允许只影响未来显示；
4. 若 `code` 被外部系统当作对接键，需确认是否允许修改；
5. 若后端当前仅在通用 save / patch 中处理唯一性，需先抽出可复用业务裁决，再接 transaction。

### 六、涉及文件（预估）
- `src/features/trading/customer/services/customer-service.ts`
- `src/features/trading/customer/hooks/use-customer.ts`
- `src/features/trading/supplier/services/supplier-service.ts`
- `src/features/trading/supplier/hooks/use-supplier.ts`
- `src/features/trading/components/customer-list.tsx`
- `src/features/trading/components/supplier-list.tsx`
- `server/services/partner_transaction_service.go`
- `server/handlers/partner_transaction_handlers.go`
- 如需复用唯一性/映射逻辑，可能涉及现有 customer / supplier save/patch 相关文件

### 七、建议确认边界
建议你确认以下边界后再进入代码阶段：

1. 本轮只处理 `customer.code` / `customer.name` / `supplier.code` / `supplier.name`；
2. 纯 `code`、纯 `name`、`code + name` 走显式 transaction；
3. 混入其他字段时继续回落 `patch`；
4. 不新增前端唯一性判断，完全以后端裁决为准；
5. 完成后通过 `pnpm exec tsc --noEmit` 与 `go test ./handlers ./routes ./services -run "Customer|Supplier"` 验证。

## `trading/customer` / `trading/supplier`：主数据 TDO 接入（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `trading/customer` / `trading/supplier` 第一批主数据 TDO 接入，且验证通过：

1. 后端新增 customer / supplier 状态变更 transaction 服务与 handler；
2. 新增交易路由：`POST /customers/:id/transactions`、`POST /suppliers/:id/transactions`；
3. 前端 `customer-service.ts` / `supplier-service.ts` 已新增状态变更 transaction 请求；
4. 前端 hooks 已新增 `statusChangeMutation`；
5. `customer-list.tsx` / `supplier-list.tsx` 已在纯 `status` 变更场景下优先走显式 transaction；
6. `customer-action-dialog.tsx` 已补最小状态编辑入口；
7. 普通 customer / supplier 混合档案编辑仍继续保留在 `patch` 链中；
8. 已补齐 `customer` 原有前端依赖但后端缺失的 `PATCH /customers/:id` 兜底链；
9. 验证通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run "Customer|Supplier"`。

## `trading/customer` / `trading/supplier`：主数据 TDO 接入（2026-04-08，待确认）

### 一、目标
在已完成 `sales` / `purchase` 订单域局部事务化后，优先回到主数据域，补齐 `trading/customer` 与 `trading/supplier` 当前仍以 CRUD + `patch` 为主的编辑链路，为高频、单语义主数据动作建立显式 TDO 入口。

本轮目标：

1. 先盘点 customer / supplier 现有编辑入口、字段与后端裁决能力；
2. 只选择稳定、单语义、可审计的主数据动作建立 transaction intent；
3. 不把普通档案混合编辑强行包装成 transaction；
4. 继续保留 `patch` 作为未覆盖维护场景的安全兜底；
5. 复用后端主数据校验，不由前端猜测启停、唯一性或状态规则。

### 二、现状判断
当前确认到：

1. `trading/customer` 当前主要暴露 `create` / `patch` / `delete`；
2. `trading/supplier` 当前主要暴露 `create` / `patch` / `delete`；
3. 两者前端尚未形成类似 `sales-transaction-service.ts` / `purchase-transaction-service.ts` 的显式 transaction service；
4. 两者当前也未形成编辑弹窗中的纯语义分流规则；
5. 因此这两块是当前全局最明确仍未接稳 TDO 的主数据模块。

### 三、建议方案
建议把本轮拆成两个并行但边界独立的子专项：

#### A. `customer` 主数据 TDO
优先候选动作：

1. 客户主体启停；
2. 客户核心标识字段变更；
3. 客户归档 / 禁用；

约束：

- 仅处理可稳定表达为单一业务动作的场景；
- 若一次编辑混入多个普通档案字段，则继续保留在 `patch`；
- 若后端已存在唯一性、引用关系、禁删限制，必须复用原规则。

#### B. `supplier` 主数据 TDO
优先候选动作：

1. 供应商主体启停；
2. 供应商核心标识字段变更；
3. 供应商归档 / 禁用；

约束：

- 仅处理可稳定表达为单一业务动作的场景；
- 若一次编辑混入多个普通档案字段，则继续保留在 `patch`；
- 若后端已存在唯一性、引用关系、禁删限制，必须复用原规则。

### 四、前后端职责

#### 后端
1. 为 customer / supplier 增补显式 transaction handler 或等价业务入口；
2. 为每个 intent 限定 payload 结构与允许字段；
3. 复用现有存在性、唯一性、启停、引用约束等主数据校验；
4. 写审计日志并返回最新实体快照。

#### 前端
1. 为 customer / supplier 增加独立 transaction service；
2. 在对应 hooks 中补充 mutation；
3. 若存在编辑对话框，则对纯语义动作做显式分流；
4. 普通混合档案编辑继续保留在现有 `patchMutation`。

### 五、涉及文件（预估）
- `src/features/trading/customer/hooks/use-customer.ts`
- `src/features/trading/customer/services/customer-service.ts`
- `src/features/trading/supplier/hooks/use-supplier.ts`
- `src/features/trading/supplier/services/supplier-service.ts`
- `server/handlers/...customer...`
- `server/handlers/...supplier...`
- `server/services/...customer...`
- `server/services/...supplier...`

### 六、风险与注意事项
1. 主数据模块常含唯一性与引用约束，必须先确认后端裁决位置，避免前端自造规则；
2. 不能把普通档案 patch 伪装成 transaction，避免 TDO 退化为空壳；
3. customer / supplier 可能已有被订单、库存、工作流引用的删除限制，本轮必须优先复用已有约束；
4. 若发现后端尚无可复用语义入口，本轮需先补后端裁决，再接前端分流。

### 七、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮优先只做 `trading/customer` 与 `trading/supplier`；
2. 只为单语义、高频主数据动作接入 TDO，不强拆普通混合档案编辑；
3. customer / supplier 的普通维护型混合修改继续保留在 `patch`；
4. 完成后通过 `tsc` 与 `Customer|Supplier` 相关 Go 测试验证，并同步 `walkthrough.md`。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已确认 `purchase` 头部第二刀——供应商主体变更事务化——已在当前仓库中落地并验证通过：

1. 前端 `purchase-transaction-service.ts` 已存在 `ORDER_SUPPLIER_CHANGE` 与供应商主体事务请求函数；
2. 前端 `use-purchase-orders.ts` 已存在 `supplierChangeMutation`；
3. `purchase-order-action-dialog.tsx` 已在纯 `supplierId` / `supplierName` 变更场景下优先走显式 transaction；
4. 后端 `purchase_transaction_service.go` 已存在 `PurchaseTransactionIntentSupplierChange` 与 `executePurchaseOrderSupplierChangeTx(...)`；
5. 后端已复用供应商存在性校验、版本控制、审计与快照返回；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 的 `expectedDate` 事务化与行级三类基础事务后，继续压缩采购订单编辑中的 `patchMutation` 承担面，但本轮只处理一个稳定头部语义：供应商主体切换。

本轮目标：

1. 只处理 `supplierId` / `supplierName` 的纯头部变更；
2. 不并发处理 `expectedDate`、其他头部字段、收货状态或任何行级变更；
3. 继续避免 transaction 退化为 `patch` 包装壳；
4. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_SUPPLIER_CHANGE`

payload 建议仅承载：

- `supplierId`
- `supplierName`
- `operator`

语义约束为：

1. 只表达采购订单供应商主体切换；
2. 不允许混入其他头部字段修改；
3. 不允许混入任何行级修改；
4. 更新后返回最新采购订单快照并写入审计。

### 三、前后端职责

#### 后端
1. 在 `purchase_transaction_service.go` 中新增 `ORDER_SUPPLIER_CHANGE`；
2. 校验 payload 只包含供应商主体字段；
3. 复用现有供应商数据源完成存在性 / 可用性 / 名称一致性校验（如当前已有）；
4. 更新 `supplier_id` / `supplier_name`；
5. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增供应商主体事务请求函数；
2. 在 `use-purchase-orders.ts` 中新增对应 mutation；
3. 在 `purchase-order-action-dialog.tsx` 中新增纯 `supplierId` / `supplierName` 变更分流；
4. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 五、风险与注意事项
1. 若当前采购编辑中切换供应商会联动其他派生字段，本轮必须避免把附带变化误判为纯供应商主体切换；
2. 若后端当前对供应商停用、删除、名称漂移存在强校验，本轮必须复用现有规则，不得前端猜测；
3. 本轮不得破坏已落地的：
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`
   - `ORDER_LINE_ADD`
   - `ORDER_LINE_REMOVE`
4. `patch` 兜底链路必须保留。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `purchase` 的供应商主体变更事务化；
2. 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走该 transaction；
3. 若混入其他头部字段或行级字段，则不进入该 intent；
4. 其余采购订单编辑继续留在现有 transaction / `patch` 链中。

## `sales`：`status` / `statusNote` 联动重构（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 的 `status` / `statusNote` 联动重构：

1. 已补 `sales` 编辑弹窗中的 `statusNote` 最小编辑入口；
2. 已在 `sales-order-action-dialog.tsx` 中新增 `status` / `statusNote` 组合分流；
3. 当 delta 仅涉及 `status` / `statusNote` 时，统一优先走显式状态 transaction，而不是回落 `patchMutation`；
4. 其中目标状态为 `Canceled` 时继续走 `cancelMutation`，其余状态语义继续走 `statusTransitionMutation`；
5. 详情页状态按钮与编辑弹窗现在共享同一条状态语义主链；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales`：`status` / `statusNote` 联动重构（2026-04-08，待确认）

### 一、目标
在已完成 `sales` 的 `requirements`、`orderName`、`purchaseOrderNo` 事务化后，继续压缩 `sales` 头部 `patchMutation` 的承担面，并梳理 `status` / `statusNote` 当前混合承载的语义边界。

本轮目标：

1. 梳理并收敛 `status` / `statusNote` 的 transaction 语义；
2. 明确“纯状态切换”“纯状态备注修改”“状态与备注同时修改”三类场景的归属；
3. 不并发处理 `orderName`、`purchaseOrderNo`、`requirements`、交期、客户、分类/类型或任何行级变更；
4. 避免详情页状态按钮链路与编辑弹窗保存链路出现语义分叉；
5. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、现状判断
当前 `statusNote` 已存在于：

1. 前端 `SalesOrder` schema；
2. 表单默认值与初始化逻辑；
3. 详情展示；
4. 后端 patch 解析；
5. 现有 `ORDER_STATUS_TRANSITION` transaction payload。

进一步确认到：

- 当前后端唯一已落地的状态语义 transaction 是 `ORDER_STATUS_TRANSITION`；
- 详情页状态按钮直接走 `ORDER_STATUS_TRANSITION`；
- 编辑弹窗当前没有对 `status` / `statusNote` 做专门分流，仍可能回落 `patch`；
- 因此本轮重点不是补字段，而是重整状态语义边界与前后端分流规则。

### 三、建议方案
建议按以下语义分层重构：

#### 方案基线
1. `纯 status` 修改：继续走 `ORDER_STATUS_TRANSITION`；
2. `status + statusNote` 同时修改：继续走 `ORDER_STATUS_TRANSITION`；
3. `纯 statusNote` 修改：二选一
   - 方案 A：新增 `ORDER_STATUS_NOTE_CHANGE`，把纯备注修改从 patch 中剥离；
   - 方案 B：仍统一走 `ORDER_STATUS_TRANSITION`，但前端显式分流到该 transaction，而非落回 patch。

#### 当前建议
优先建议 **方案 B**：

1. 保持后端状态语义入口收敛在 `ORDER_STATUS_TRANSITION`；
2. 放宽其语义，使其支持“status 不变但 statusNote 改变”的显式 transaction；
3. 前端编辑弹窗新增 `status` / `statusNote` 识别分流：
   - 纯 `statusNote` 改变时，也走 `statusTransitionMutation`；
   - 同时修改 `status` 与 `statusNote` 时，仍走 `statusTransitionMutation`；
   - 混入其他字段时，不进入本轮链路；
4. 这样可避免新建 `ORDER_STATUS_NOTE_CHANGE` 与现有状态按钮链路产生重复语义。

### 四、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中审查并必要时调整 `ORDER_STATUS_TRANSITION` 的 payload 校验与 unchanged 判定；
2. 明确允许“status 不变但 statusNote 变化”的 transaction 语义；
3. 保持 `status_note` 更新、版本控制、审计与快照返回逻辑一致；
4. 如发现现有 `ORDER_STATUS_TRANSITION` 语义无法安全承载纯备注修改，再回退到新增 `ORDER_STATUS_NOTE_CHANGE` 的备选方案。

#### 前端
1. 在 `sales-order-action-dialog.tsx` 中新增 `status` / `statusNote` 的组合分流；
2. 纯 `statusNote` 修改时，优先走显式 transaction，而不是 `patchMutation`；
3. 同时修改 `status` 与 `statusNote` 时，继续走 `statusTransitionMutation`；
4. 复核 `sales-transaction-service.ts` 与 `use-sales-transactions.ts` 是否需要补充更清晰的调用封装；
5. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 五、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/sales-order-detail.tsx`
- `src/features/trading/components/parts/sales-order-detail-header.tsx`

### 六、风险与注意事项
1. `statusNote` 当前已被现有状态流转 transaction 使用，本轮最核心风险是让详情页按钮链路与编辑弹窗链路出现不同语义；
2. 若引入新 intent，容易与 `ORDER_STATUS_TRANSITION` 重叠，因此优先保持单一状态入口；
3. 本轮必须验证“状态不变、仅备注变化”不会被误判为 unchanged；
4. 本轮不得破坏已落地的：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_CLASSIFICATION_TYPE_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_REQUIREMENTS_CHANGE`
   - `ORDER_NAME_CHANGE`
   - `ORDER_PURCHASE_ORDER_NO_CHANGE`
   - `ORDER_STATUS_TRANSITION`
5. `patch` 兜底链路必须保留。

### 七、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮处理 `sales` 的 `status` / `statusNote` 联动语义重构；
2. 优先保持单一状态 transaction 入口，以 `ORDER_STATUS_TRANSITION` 为核心收敛；
3. 纯 `statusNote` 修改时，不再落回 `patch`，而是走显式状态 transaction；
4. 同时修改 `status` 与 `statusNote` 时，继续走现有状态 transaction；
5. 若混入其他头部字段或行级字段，则不进入本轮重构范围；
6. 其余销售订单编辑继续留在现有 transaction / `patch` 链中。

