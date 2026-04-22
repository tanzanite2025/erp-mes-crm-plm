
- [x] 808-分析当前用户权限管理是否可收敛为“直接给用户赋权”的单点模型（中文）
  - [x] 已梳理当前权限主链：
    - [x] 前端权限定义以 `src/features/authz/data/permission-catalog.ts` 为菜单权限清单源头
    - [x] 角色维护位于 `src/features/system-mgmt`，角色本身承载权限集合
    - [x] 用户侧当前主要是“绑定角色”，入口位于 `src/features/users/components/users-role-bindings-dialog.tsx`
    - [x] 后端登录与鉴权通过 `server/middleware/auth.go`、`server/dependencies/identity_access.go`、`server/dependencies/effective_access.go` 汇总有效角色与权限
  - [x] 已确认当前复杂度来源：
    - [x] 当前生效权限不是只来自用户，而是会合并 `user_roles`、`employee_roles`、`position_roles`、`org_default_roles`、历史 `user.role`、历史部门推导角色
    - [x] 部门维度还保留 `org_{deptId}` 这类历史/兼容角色族推导链路
    - [x] 最终权限判定虽然统一落到 permission id，但前置解析链路较长，确实存在理解和排错成本
  - [x] 已形成方案判断：
    - [x] “完全只按用户直赋权、彻底移除角色/部门解析”在概念上最直接，但会把批量授权、组织级默认权限、岗位继承能力全部打散到用户维度，长期运维成本可能更高
    - [x] 更稳妥的收口方向是“用户级覆盖优先”：保留角色作为权限模板，但最终以用户显式授权/拒绝作为最高优先级
    - [x] 若你的目标是“无论什么时候都读用户、单点覆盖”，建议落成 `用户显式权限覆盖角色权限`，而不是一步切到纯用户直赋权
  - [x] 已确认目标方向：
    - [x] 你已选择方案A：纯用户直赋权
    - [x] 后续目标收口为“最终只看用户权限，逐步废弃角色/部门/岗位对权限生效的影响”
    - [x] 你已补充当前仍处测试阶段，因此接受直接切换，不采用双轨并行
  - [x] 已完成本轮细化设计：
    - [x] 已明确纯用户直赋权的最终数据模型与读取链路
    - [x] 已明确角色、部门、岗位链路在方案A下的冻结、兼容或下线路径
    - [x] 已明确从现有有效权限快照迁移到用户显式权限的回填策略
    - [x] 已补充 `user_permissions` 表结构、字段约束、索引与来源字段草案
    - [x] 已补充 `GET /users/:id/permissions`、`PUT /users/:id/permissions`、`POST /users/permissions/migrate-effective` API 草案
    - [x] 已明确 `GET /users/:id/access` 的兼容保留策略，以及 `/users/:id/roles`、`PATCH /users/:id/primary-role` 等旧角色接口的冻结方向
    - [x] 已明确用户权限编辑页交互、DTO / hook / query key 收口方案，以及旧“角色管理”入口替换方式
    - [x] 已明确测试阶段直接切换的执行顺序、校验点与最小回退手册
  - [x] 已完成实施与验证：
    - [x] 已完成后端 `user_permissions` 模型、service、handler、routes、鉴权读取切换与 admin 显式权限 seed
    - [x] 已完成前端用户权限弹窗、DTO、adapter、API、hooks 与用户列表入口替换
    - [x] 已完成定向编译 / lint 验证，并更新 `walkthrough.md`

- [ ] 809-权限方案A第二轮：去兼容化，只保留新权限模型（中文）
  - [x] 已确认本轮目标调整：
    - [x] 不再保留旧角色兼容链
    - [x] 不再保留旧 `roles / primaryRoleId / effectiveRoles / roleBindings` 作为权限运行时语义
    - [x] 直接修复切到新权限模型后暴露的 BUG
  - [x] 已完成实施前梳理：
    - [x] 已梳理后端仍保留的旧角色兼容入口、返回字段与迁移兜底逻辑
    - [x] 已梳理前端仍消费旧角色语义的 hooks、API、弹窗与页面假设
    - [x] 已明确哪些旧接口直接下线、哪些旧字段直接从响应中移除
    - [x] 已明确本轮需要同步修复的新权限单链路 BUG 列表
  - [x] 已完成的阶段性执行：
    - [x] `server/handlers/users.go` 活跃写路径已停止写回 legacy `role` 与 role-binding sync
    - [x] 用户绑定/解绑员工与 bulk sync 已停止触碰 `user_roles` / `employee_roles` 同步链
    - [x] 前端用户权限弹窗、打印页、权限统计、`auth-store` 已移除运行时角色依赖
    - [x] `users-role-bindings-dialog.tsx` 已连同 `use-role-display.ts`、`role-display.ts`、`role-resolver.ts`、`department-role.ts` 及对应测试一并物理下线
    - [x] 后端 `CreateUser/BindUserEmployee/UnbindUserEmployee` 与 auth/access snapshot 回归测试已按权限单链路口径更新
    - [x] `server/dependencies/effective_access.go` 运行时访问快照已只读 `user_permissions`，不再保留 `PrimaryRoleID / EffectiveRoles` 运行时语义
    - [x] 用户列表 / options 查询已移除 `role` 筛选，前后端用户写入与列表响应契约已不再把 `role` 作为活跃主链字段
    - [x] 旧 `migrate-effective` 迁移 service / handler 已从活跃主链移除
    - [x] `use-users-action-dialog-sync`、`use-users`、`users_contract_regression_test.go`、`users_create_role_validation_test.go` 已去掉过期 `role/currentRole/effectiveRoles` 测试口径，按权限单链路断言
    - [x] `resolveEmployeeRecordIDForBinding(...)` 与 `enforceBulkSyncPermissions(...)` 等运行时 helper 已去除旧 role 命名，避免误导后续维护
    - [x] `src/locales/messages/*/users.ts` 已继续将剩余用户域文案从角色语义收口到显式权限语义
    - [x] `server/models/user.go` 已移除 legacy `Role` 字段；`server/middleware/auth.go`、`server/repositories/organization_repository.go`、`server/db/db.go` 已同步去掉 `user.Role` 运行时依赖
    - [x] 用户域与请假/组织相关测试中的 `"role"` payload、`models.User{ Role: ... }` seed、`role TEXT` schema 已继续收口并删除可安全移除的残留
    - [x] `server/cmd/cleanup/main.go` 与 `server/scripts/cleanup_cashier.go` 已从按 `users.role` 精准清理切到按受控用户名清理
    - [x] `server/handlers/ws.go` 与 `server/handlers/alerts.go` 已将系统告警投递从 `admin/role` 历史语义切到 `permission:perm_manage` 显式权限目标
    - [x] `server/db/db.go` 已去掉 `hardenSeedAdminRole()`、`UPDATE users SET role = 'admin' ...` 与 `users.role` 约束清理；`server/dependencies/effective_access.go` 已移除 `admin/superadmin` fallback 权限兜底
    - [x] `src/features/users/utils/user-utils.ts`、`use-users.ts`、`data-table-row-actions.tsx`、`data-table-bulk-actions.tsx`、`users-columns.tsx` 已将 `isSuperAdmin / protected superadmin account` 等用户侧旧命名收口为“受系统保护账户”语义
    - [x] `src/features/users/components/users-add-admin-dialog.tsx` 与 `src/locales/messages/zh-CN/users.ts`、`src/locales/messages/en-US/users.ts` 已将 `superadmin / ROOT 账户 / switch admin` 等用户侧历史措辞收口为“高权限账户 / 受保护账户 / 全系统管理权限”语义
    - [x] `src/locales/overrides/system-management.zh-CN.ts` 与 `src/locales/overrides/system-management.en-US.ts` 已将角色矩阵页 `ROOT/superadmin` 说明文案收口为“系统保留的全局模板角色 / built-in global template role”语义
  - [x] 已完成阶段性验证：
    - [x] `pnpm exec tsc --noEmit --pretty false`
    - [x] `go test ./handlers -run "CreateUserHandler|BindUserEmployeeHandler|UnbindUserEmployeeHandler"`
    - [x] `go test ./handlers -run "ReplaceUserHandler|GetProfileReturnsExpectedUserMetadata|GetAuthSnapshotHandler|GetUserAccessSnapshotHandler"`
    - [x] `pnpm exec vitest run src/features/users/services/user-api.test.ts`
    - [x] `go test ./dependencies -run "EffectiveAccess|ResolvePermissionsForRole"`
    - [x] `go test ./handlers -run "GetUsersHandler|GetProfileReturnsExpectedUserMetadata|GetAuthSnapshotHandler|GetUserAccessSnapshotHandler" -count=1`
    - [x] `pnpm exec vitest run src/features/users/hooks/use-users.test.ts src/features/users/hooks/use-users-action-dialog-sync.test.ts`
    - [x] `go test ./handlers -run "CreateUserHandler|BindUserEmployeeHandler|UnbindUserEmployeeHandler|ReplaceUserHandler|GetAuthSnapshotHandler|GetUserAccessSnapshotHandler" -count=1`
    - [x] `go test ./handlers -run ^$ -count=1`
    - [x] 删除死代码后再次执行 `pnpm exec tsc --noEmit --pretty false`
    - [x] 删除死代码后全仓复扫 `users-role-bindings-dialog / use-role-display / role-display / role-resolver / department-role` 已无引用残留
    - [x] `go test ./handlers ./services ./repositories ./middleware ./dependencies ./db -run ^$ -count=1`
    - [x] `go test ./handlers -run "CreateUserHandler|BindUserEmployeeHandler|UnbindUserEmployeeHandler|ReplaceUserHandler|GetUsersHandler|GetAuthSnapshotHandler|GetUserAccessSnapshotHandler|PreviewMyLeaveRequestHandler|CreateMyLeaveRequestHandler" -count=1`
    - [x] `go test ./services -run "PreviewMyLeaveRequest|CreateMyLeaveRequest|CancelMyLeaveRequest|GetMyLeaveStats" -count=1`
    - [x] 全仓复扫 `role TEXT / \"role\": / models.User{ Role: ... } / json:"role" / SELECT role / LOWER(role)`：`user.Role` 残留已清零
    - [x] `go test ./dependencies -run "EffectiveAccess|ResolvePermissionsForRole" -count=1`
    - [x] `go test -tags tools cleanup_cashier.go -run ^$ -count=1`（在 `server/scripts` 目录下单文件校验）
    - [x] 全仓复扫 `role ILIKE / client.Role / isAdminRole / ClaimString(claims, "role") / UPDATE users SET role = 'admin' / hardenSeedAdminRole / fallbackPermissionsForRole / System ALERT -> "admin"`：脚本与边缘工具残留已清零
    - [x] `pnpm exec tsc --noEmit --pretty false`
    - [x] 全仓复扫 `isSuperAdmin / protected superadmin / Superadmins / ROOT-level / ROOT 账户 / users.dialogs.admin* / users.toast.switchAdmin* / users.actions.addAdmin`（限定 `src/features/users` 与 `users` locale）：残留已清零
    - [x] `pnpm exec tsc --noEmit --pretty false`
    - [x] 全仓复扫 `ROOT / superadmin`（限定 `system-mgmt` locale override / message 与 `src/features/system-mgmt` 展示文案范围）：剩余命中仅为内部变量名与模板保护逻辑，不再是用户可见过时说明文字
  - [ ] 剩余收口：
    - [x] `server/handlers/users.go` 及用户域测试壳层中仍会误导为“按 role 生效”的 helper / 旧参数已继续收口
    - [x] locale 与少量测试口径中的 `roleBindings / effectiveRoles / primaryRoleId` 历史术语已继续按“显式权限主链”刷新
    - [x] `src/features/users/utils/role-resolver.ts`、`use-role-display.ts`、`role-display.ts`、`department-role.ts` 与 `users-role-bindings-dialog.tsx` 已确认无运行时消费者并已物理删除
    - [x] `user.Role` 运行时壳层、相关测试 payload / seed / schema 已继续清除；当前仅剩角色模板实体 `models.Role` 与相关 role catalog / role contract 测试
    - [x] `server/scripts/cleanup_cashier.go`、`server/cmd/cleanup/main.go`、`server/handlers/ws.go`、`server/dependencies/effective_access.go`、`server/db/db.go` 等脚本与边缘工具中的 `admin/role` 历史语义已继续收口
    - [x] 已区分“角色模板实体 `models.Role` 的模板权限能力”与“历史用户字段 / admin 角色兼容逻辑”，本轮仅删除后者，未误伤角色目录域
    - [x] 前端与文案中仍残留的 `superadmin / admin role / ROOT 账户 / 权限切换` 历史措辞已在 `src/features/users/*` 与 `src/locales/messages/*/users.ts` 中继续收口
    - [x] 已区分“用户管理前端中的历史用户/权限措辞”与“系统管理角色模板矩阵中的角色目录域语义”；本轮仅收口前者，未误改后者
    - [x] `system-mgmt` 中角色模板域的过时说明文字已继续收口；当前剩余 `admin/superadmin` 命中主要属于内部变量名或模板保护逻辑，不属于用户可见旧文案
    - [x] 已定位本地登录 `502` 的失败层级：`UserAuthForm` 走 `fetch('/api/v1/auth/login')`，开发环境下由 Vite 代理到 `http://localhost:8080`；`502` 来自 Docker 本地 `nginx` 反代上游不可用，而不是前端或 `LoginHandler` 主动回包
    - [x] 已验证 `127.0.0.1:8080` 与 `/api/v1/health` 的真实状态：最初由 `com.docker.backend.exe` 承载的 Docker 端口映射返回 `nginx/1.29.7 502`，根因是 `server-app-*` 容器反复重启
    - [x] 已完成根因修复并恢复本地链路：修复 `user_permissions.granted_by` 可空 UUID 建模与 `packaging_rules` 唯一索引启动竞态；随后按仓库约定执行 `powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -FullStack` 使用 `.env.dev` 拉起本地全栈
    - [x] 已完成恢复验证：`server-app-1` / `server-app-2` 均为 healthy；`http://127.0.0.1:8080/api/v1/health` 与 `http://127.0.0.1:5173/api/v1/health` 均返回 `200`
    - [x] 已定位 `/aps-scheduling` 路由的权限目录映射缺口：`src/routes/_authenticated/aps-scheduling/route.tsx` 与侧边栏 `permissionIdForPath('/aps-scheduling')` 已接入，但 `src/features/authz/data/permission-catalog.ts` 的 `ROUTE_TO_MENU_MAPPING` 尚未为该顶层路径声明 menu 映射
    - [x] 已确认 `/aps-scheduling` 归入现有 `piecework` 菜单权限域，而非新增独立 menu 权限；保持 permission catalog 单源与现有前后端权限契约不漂移
    - [x] 已在用户确认后补齐 `permission-catalog` 的 `/aps-scheduling -> piecework` 映射，并完成 `pnpm exec tsc --noEmit --pretty false` 定向验证
    - [x] 已回溯账号权限模块与权限树数据来源：`users-permissions-dialog.tsx` 与 `use-roles.ts` 都从 `DEFAULT_PERMISSIONS` 构建权限树，而 `DEFAULT_PERMISSIONS` 来自 `ROUTE_DERIVED_PERMISSIONS + ACTION_PERMISSIONS`
    - [x] 已定位“页面更新后权限节点未自动更新”的高概率断点：`AUTHENTICATED_ROUTE_PATHS` 由脚本生成且 `route-permission-registry.ts` / `default-permissions-registry.ts` 在模块加载时就完成一次性派生；`pnpm dev` 仅在启动前执行生成脚本，运行中的 Vite 并不会因新增/修改页面自动重跑这些脚本
    - [x] 已完成长远根因修复：前端权限派生改为直接从 `src/routes/_authenticated/**/*.tsx` 的运行时路由集合构建，不再依赖额外生成的 `authenticated-route-catalog.ts` 作为唯一上游
    - [x] 已同时去除权限树相关的 import-time 快照：`route-permission-registry.ts`、`default-permission-queries.ts`、`role-permission-tree.ts`、`use-roles.ts`、`users-permissions-dialog.tsx` 已改为按需读取最新权限派生结果
    - [x] 已完成定向验证：`pnpm exec tsc --noEmit --pretty false` 与 `node scripts/verify-permissions.mjs` 均通过；`verify-permissions` 也已切到脚本侧 route collector，不再依赖旧快照链
    - [x] 已完成“真实路由新增验证”：在已有顶层菜单映射下新增最小 authenticated 子路由 `/basic-settings/permission-tree-smoke`，避免把顶层 menu 映射问题混入本轮验证
    - [x] 新增测试路由仅承载最小页面内容，已用于验证“新增 route -> route collector -> route-derived permissions”整条链路；`routeTree.gen.ts` 已生成对应 `/basic-settings/permission-tree-smoke` 路径，且本地 `http://127.0.0.1:5173/basic-settings/permission-tree-smoke` 返回 `200`
    - [x] 已在用户确认后执行该最小路由验证；代码侧验证完成，账号权限弹窗 / 系统管理权限树已提供本地浏览器预览入口供手动目视确认是否出现新节点
    - [x] 已梳理 IDE 当前 `current_problems`：共 9 条告警，均为 Tailwind 类名可等价收敛写法，涉及 `header.tsx`、`dialog.tsx`、`template-mgmt.tsx`、`vehicle-loading-plan-dialog.tsx`、`shipping-vehicle-match-recommendation-dialog.tsx`
    - [x] 已在用户确认后执行当前样式告警清理，仅做等价类名替换：`md:left-[var(...)] -> md:left-(...)`、`max-w-[28rem] -> max-w-md`、`z-[101] -> z-101`、`bg-gradient-to-r -> bg-linear-to-r`、`min-h-[3rem] -> min-h-12`、`bg-muted/[0.03] -> bg-muted/3`
    - [x] 已完成告警清理后回归检查：`pnpm exec tsc --noEmit --pretty false` 通过，且目标文件中旧告警类名已检索不到
    - [x] 已定位 `/leave-management` 当前“新建请假申请”并非缺少候选人下拉，而是产品口径被设计成“仅支持本人申请”：前端文案、hook、service、后端 handler / service 全都只围绕 `currentUser -> users.employee_id -> employee` 解析申请人
    - [x] 已确认阻塞根因在后端主链：`server/services/leave_service.go` 的 `resolveCurrentEmployeeContext` 先查当前登录用户的 `users.employee_id`，未绑定即返回 `当前账号未绑定员工档案，无法发起请假申请`；`PreviewMyLeaveRequest / CreateMyLeaveRequest / ListMyLeaveRequests / GetMyLeaveStats / CancelMyLeaveRequest` 全部依赖该上下文
    - [x] 已确认“组织人事-人员管理”与账号体系并不等价：前端 `EmployeeCoreService.getEmployees()` 直接读 `/employees` 员工档案；仓库里也存在按 `employee_id` 反向禁用 linked users 的逻辑，说明员工档案可以先存在、账号只是可选绑定层
    - [x] 已确认最终产品口径选择方案A：当前 `/leave-management` 仅保留“代员工申请”，不再以“当前账号绑定员工档案”作为唯一申请主体
    - [x] 已在用户审批后完成前端弹窗改造：`LeaveActionDialog` 改为显式选择员工档案（允许无账号员工），并同步调整试算/提交/详情展示字段，统一展示“请假员工”而非“本人申请”
    - [x] 已在用户审批后完成后端请假主链切换：请假接口由 `currentUser -> employee_id` 模式改为显式接收 `employeeId`；同时为 `leave_requests` 增加 `submitted_by_user_id` 审计字段，并在 `db.go` 中补了历史回填
    - [x] 已完成本人语义清理：前端 query key 从 `leaves.my / statsMy` 收口到 `leaves.list / stats`，页面/文案/详情 fallback 已改为员工视角；当前后端继续保留 `/leaves/my` URL 仅作兼容路径，但内部语义已变为“当前操作者代提交的请假单”
    - [x] 已完成定向验证：`pnpm exec tsc --noEmit --pretty false` 通过，`go test ./services ./handlers -run Leave` 通过，证明“无账号员工可被代提请假”的核心链路已可编译并通过回归测试
    - [x] 已定位 `/trading/sales-orders` 的“重试”来源：页面不是路由级空态，而是 `src/features/trading/components/sales-order-list-fixed.tsx` 中 `useGetSalesOrders()` 返回 `isError` 后渲染的列表错误态
    - [x] 已梳理主数据链：`SalesOrderList -> useGetSalesOrders -> getSalesOrders -> apiFetch('/sales-orders?...')`；如果该链在 `apiFetch` 前抛错，就会出现“页面直接重试、后端零请求、服务端零日志”现象
    - [x] 已补查 authenticated 守卫：`/_authenticated/trading/route.tsx` 在进入交易模块前已执行 `ensureAuthenticatedRouteSession()`，其中明确 `await waitForAuthHydration()` 后再校验 `accessToken`；因此“auth hydration 竞态导致 sales-orders 先发请求”的猜测不是当前最强根因
    - [x] 当前更接近的根因归类是架构层冲突：`apiFetch` 设计了“可在真正 fetch 前直接拒绝请求”的前置闸门（如 auth gate / circuit breaker），而 `SalesOrderList` 对 query error 只渲染一个无错误详情的“重试”空态，导致前端一旦前置短路，就会出现“零请求、零服务端日志、UI 只剩重试”的盲排现象
    - [x] 已完成请求层结构性收口：新增 `src/lib/api-error.ts`，为 `apiFetch` / `api-response` 建立统一错误类型，当前已能区分 auth gate、circuit breaker、timeout、network、http、invalid response 等失败来源，而不是只抛裸 `Error`
    - [x] 已完成页面层错误暴露：`/trading/sales-orders` 已改用 Trading 共享错误态组件，失败时不再只有“重试”块，而会显示结构化错误摘要与真实错误明细
    - [x] 已完成 Trading 域同构模式的最小共享抽象：本轮先抽出 `TradingQueryErrorState` 作为共享错误态入口，避免把错误解析逻辑继续堆在 `sales-order-list-fixed.tsx`
    - [x] 已完成定向验证：`pnpm exec tsc --noEmit --pretty false` 通过，`pnpm exec eslint src/lib/api-client.ts src/lib/api-error.ts src/lib/api-response.ts src/lib/error-status.ts src/lib/handle-server-error.ts src/features/trading/components/sales-order-list-fixed.tsx src/features/trading/components/trading-query-error-state.tsx src/main.tsx` 通过
    - [x] 已定位登录 `502` 的外层链路：`UserAuthForm` 实际请求的是同源 `/api/v1/auth/login`，由 Vite 代理到 `http://localhost:8080`；当前 `localhost:8080` 返回 `nginx/1.29.7 502 Bad Gateway`，因此问题不在前端登录表单本身
    - [x] 已确认 `8080` 是项目自己的 Docker `xdfc-nginx-lb`，而不是随机外部服务；`docker ps` 显示 `server-app-1` / `server-app-2` 持续 `Restarting`，因此 `502` 来自 nginx 无法连通后端 app 上游
    - [x] 已锁定 app 容器重启根因：`server/db/db.go` 中 `backfillLeaveRequestSubmittedByUsers()` 启动回填执行 SQL `u.employee_id = lr.employee_id` 时触发 PostgreSQL `operator does not exist: character varying = uuid (SQLSTATE 42883)`，导致服务在启动迁移阶段 `log.Fatal` 退出
    - [x] 已完成 `server/db/db.go` 修复：将请假单 `submitted_by_user_id` 启动回填的匹配条件收口为 `NULLIF(BTRIM(u.employee_id), '') = CAST(lr.employee_id AS text)`，避免 `users.employee_id` 文本字段与 `leave_requests.employee_id` UUID 字段直接比较触发 PostgreSQL `42883`
    - [x] 已完成定向编译与只读 SQL 验证：`go test ./db -run ^$` 与 `go test ./models -run ^$` 通过；数据库中已确认 `users.employee_id` 为 `varchar`、`leave_requests.employee_id` 为 `uuid`，且新比较表达式可正常执行不再报类型错误
    - [x] 已完成运行验证：`docker compose --env-file .env.dev -f docker-compose.yml up -d --build app nginx_lb` 后，`server-app-1` / `server-app-2` 已恢复 `healthy`，`http://localhost:8080/api/v1/health` 返回 200，登录 `502` 的启动阻塞已解除

    - [x] 已定位 `/leave-management` 与 `/hall-of-fame` 缺失通用顶栏 / 通用 TAB 栏的根因：这两个页面当前直接挂在 `src/routes/_authenticated/leave-management.tsx` 与 `src/routes/_authenticated/hall-of-fame.tsx` 下，父级只有 `AuthenticatedLayout`，没有进入 `src/routes/_authenticated/personnel/route.tsx` 的 `ModuleTabbedLayout`
    - [x] 已确认通用布局提供点：人员中心模块的通用顶栏和通用 TAB 栏由 `src/components/layout/module-tabbed-layout.tsx` 提供，其中统一渲染 `Header` 与 `ModuleTabs`；只要页面不挂在 `/personnel` 模块布局下，就不会拿到这两层 UI
    - [x] 已确认当前人员中心 TAB 配置缺口：`src/features/org-personnel/tabs.ts` 只包含 `/personnel/org`、`/personnel/employees`、`/personnel/accounts`、`/personnel/rights`、`/personnel/permissions`、`/personnel/line`、`/personnel/topology`，未纳入 `/leave-management` 与 `/hall-of-fame`，因此即便补入模块布局，也需要同步补齐 TAB 定义与激活路径
    - [x] 已完成 `/leave-management` 与 `/hall-of-fame` 的布局修复：新增独立页面组件 `leave-management-route-page.tsx` 与 `hall-of-fame-route-page.tsx`，在保留顶级 URL 的前提下复用人员中心 `ModuleTabbedLayout`，恢复通用顶栏与通用 TAB 栏
    - [x] 已完成人员中心 TAB 配置补齐：`src/features/org-personnel/tabs.ts` 新增 `leave` 与 `stats` 两个 tab，分别指向 `/leave-management` 与 `/hall-of-fame`，保证模块导航可见且当前页签可正确激活
    - [x] 已完成定向验证：`pnpm exec tsc --noEmit --pretty false` 通过；`pnpm exec eslint src/routes/_authenticated/leave-management.tsx src/routes/_authenticated/hall-of-fame.tsx src/features/org-personnel/components/leave-management-route-page.tsx src/features/org-personnel/components/hall-of-fame-route-page.tsx src/features/org-personnel/tabs.ts` 通过

    - [x] 已定位 `/logistics-settings/platforms` 与 `/logistics-config/platforms` 的实际复用关系：两个路由当前都指向同一个 `src/features/logistics-config/platforms-tab.tsx`，并统一渲染 `LogisticsSandboxDashboard`
    - [x] 已确认物流接口平台页的数据源：`LogisticsSandboxDashboard` 通过 React Query 请求后端 `/logistics-push/providers`，后端对应 `server/handlers/logistics_push.go` + `server/models/logistics_push.go` 中的 `LogisticsAPIProvider` 真表，属于真实 API 平台配置链路
    - [x] 已确认 `/logistics-config/suppliers` 当前不是可编辑主数据页：`src/features/logistics-config/supplier-directory-tab.tsx` 直接使用前端常量 `ENTRIES` 写死展示顺丰、京东、17TRACK 三张目录卡片，没有任何查询、保存、编辑或删除能力
    - [x] 已确认“不可编辑”的直接原因：供应商目录页没有接后端 service / query / mutation；平台页虽然有后端 `saveProvider` 更新能力，但前端只提供“新增物流接口”和“删除”按钮，没有把现有 `provider` 回填到表单的编辑入口
    - [x] 已确认当前不存在自动同步：平台页模板来源于前端常量 `LOGISTICS_TEMPLATES`，供应商目录页来源于另一组前端常量 `ENTRIES`，两者彼此独立，且都不与 `/suppliers` 供应商主数据或 `LogisticsAPIProvider` 建立同步映射；后续即使接入真实 API，也不会自动反映到 `/logistics-config/suppliers`
    - [x] 已补充用户确认的产品方向：`/logistics-config/suppliers` 不应简单删除卡片，而应保留“联系方式/备注等人工记录”的自定义卡片能力；同时必须明确展示“已接 API / 未接 API”状态，并提供跳转到平台配置页的入口
    - [x] 已确认推荐收口方式：对于顺丰、京东、17TRACK 这类已存在于 `LOGISTICS_TEMPLATES` 的承运商，供应商目录页应支持从模板/平台配置直接同步带入基础信息，减少重复录入；对于尚未对接 API 的条目，则允许手工建卡，但需显式标注“未对接 API”
    - [x] 已完成 `/logistics-config/suppliers` 的单一数据源收口：目录页已从前端静态 `ENTRIES` 切换为 React Query 读取 `/logistics-push/providers`，支持“模板直选同步 + 自定义补充信息”的卡片模型，可维护联系人、电话、网站、备注，并明确显示“已接 API / 未对接 API”状态
    - [x] 已完成真实 API 平台配置的编辑闭环：后端 `LogisticsAPIProvider` 新增目录字段（`category / website / contact / phone / note`），`SaveLogisticsProviderHandler` 补充 code/name 去重校验；平台页 `LogisticsSandboxDashboard` 已支持编辑已有 Provider，并在目录页与平台页之间增加跳转入口与状态提示
    - [x] 已完成共享模板/去重辅助层：新增 `src/features/logistics-config/provider-directory.ts`，集中承载空对象、模板应用、API 状态判断与重复项识别，避免目录页和平台页再次各自维护一套逻辑
    - [x] 已完成定向验证：`pnpm exec eslint src/features/logistics-config/supplier-directory-tab.tsx src/features/logistics-config/provider-directory.ts src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx src/features/sandbox/logistics-api/types.ts src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts` 通过；`pnpm exec tsc --noEmit --pretty false` 通过；`go test ./handlers -run TestNonExistent -count=1`（仅编译校验 handlers）通过

    - [x] 已根据你确认的下一阶段方向收口物流优化重点：优先处理 **接入健康度、验证闭环、引用保护、能力标签、目录/接口信息分区**，暂不扩散到审批流、智能路由、复杂 BI 看板等当前阶段性价比不高的功能
    - [x] 已为平台配置页补齐“接入健康度”字段与展示：`LogisticsAPIProvider` 已新增 `verificationStatus / lastVerifiedAt / lastVerificationMessage`，平台页与目录页都能显示最近验证状态、时间和错误摘要
    - [x] 已为平台配置页补齐“验证闭环”：新增后端 `/logistics-push/providers/:id/verify` 手动验证接口与前端“测试连接”按钮；保存配置变更后会自动回退为 `unverified`，支持区分“已建档未验证 / 已验证可用 / 配置不完整 / 最近异常 / 已停用`
    - [x] 已增加“引用保护”：当 Provider 已被 `DeliveryOrder.carrier_code` 引用时，后端会阻止直接删除以及关键 `code` 修改，并提示改为停用/归档
    - [x] 已为模板与 Provider 增加“能力标签”：前端类型、模板定义、共享辅助层和平台/目录页 UI 已支持 `tracking / callback / label / order_create` 标签维护与展示
    - [x] 已完成“目录信息 / 接口信息”分区展示：目录页和平台页都已把联系方式、电话、网站、备注与 endpoint、凭证、验证状态、能力标签显式拆区呈现
    - [x] 已完成定向验证：`pnpm exec eslint src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx src/features/logistics-config/supplier-directory-tab.tsx src/features/logistics-config/provider-directory.ts src/features/sandbox/logistics-api/services/logistics-provider-service.ts src/features/sandbox/logistics-api/types.ts` 通过；`pnpm exec tsc --noEmit --pretty false --incremental false` 通过；`go test ./handlers -run TestNonExistent -count=1` 与 `go test ./services -run TestNonExistent -count=1` 通过

    - [x] 已确认进入物流第二轮细化，目标从“已有能力可用”继续收口到“判定更准、提示更清、交互更稳”，不扩散到低价值新功能
    - [x] 已完成验证状态机第二轮细化：新增 `reachable` 状态，并把验证结果与模板类型、能力标签、停用状态、必填字段及“下一步动作”提示收紧绑定，减少只因 endpoint 可达就被误判为“完全可用”的情况
    - [x] 已完成“测试连接”策略细化：后端验证服务现可按顺丰 / 京东 / 17TRACK / 通用平台输出更准确的结果摘要、失败原因与修复建议；页面会展示最近验证后的下一步动作，不再只有通用网络探测文案
    - [x] 已完成引用保护交互细化：列表页和编辑态会提前展示 `referenceCount` 与“禁止直接删除或改码”的风险提示；平台页删除按钮在已引用时直接禁用，并增加前置确认
    - [x] 已完成能力标签与页面联动细化：目录页和平台页都能更直观展示能力标签，用户可快速判断平台是偏轨迹、面单、回调还是建单能力组合
    - [x] 已完成信息分区与文案第二轮细化：目录页和平台页均补充“下一步动作”与引用风险提示，同时收口验证状态文案为更贴近 ERP 运维视角的表达
    - [x] 已完成第二轮定向验证：`pnpm exec eslint src/features/logistics-config/supplier-directory-tab.tsx src/features/logistics-config/provider-directory.ts src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx src/features/sandbox/logistics-api/services/logistics-provider-service.ts src/features/sandbox/logistics-api/types.ts` 通过；`pnpm exec tsc --noEmit --pretty false --incremental false` 通过；`go test ./handlers -run TestNonExistent -count=1` 与 `go test ./services -run TestNonExistent -count=1` 通过

    - [x] 已确认进入物流第三轮纯体验收口，目标只聚焦 **统一中英文文案、统一 badge / 状态颜色、统一“下一步动作”风格**，不再扩展新的业务功能或状态字段
    - [x] 已完成中英文文案统一：新增 `logisticsConfig.providerShared` 共享文案层，并把目录页、平台页中验证状态、能力标签、引用风险、未配置提示和下一步动作统一切换到中英文 locale
    - [x] 已完成 badge / 状态颜色统一：目录页与平台页都改为走共享 helper 输出的状态色映射，`unverified / reachable / healthy / invalid_config / error / disabled` 以及“API 已接入 / 未接入 / 已引用 / 启用中 / 已停用”颜色语义已一致
    - [x] 已完成“下一步动作”风格统一：目录页和平台页都统一改为简短、可执行、运维导向的动作提示，并通过共享 helper + locale 键输出，避免一页偏说明、一页偏操作的割裂感
    - [x] 已完成体验层重复文案清理：目录页和平台页都去掉了一部分重复状态提示，优先保留“验证摘要 / 下一步动作 / 引用风险”这三类最有信息量的提示位
    - [x] 已完成第三轮定向验证：`pnpm exec eslint src/features/logistics-config/supplier-directory-tab.tsx src/features/logistics-config/provider-directory.ts src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts` 通过；`pnpm exec tsc --noEmit --pretty false --incremental false` 通过

    - [x] 已确认进入物流第四轮视觉与信息层收口，目标只聚焦 **badge 尺寸/间距统一、卡片信息密度统一、文案层级和留白统一**，不新增状态、不新增能力、不改后端协议
    - [ ] 待你确认后，统一 badge 尺寸/间距：让目录页与平台页的状态 badge、能力 badge、操作按钮高度、圆角、字号、内边距和 gap 使用同一套视觉规则，消除当前“同类 badge 不同尺寸”的割裂感
    - [ ] 待你确认后，统一卡片信息密度：收口目录页与平台页卡片内部区块的标题字号、字段行高、摘要块高度和区块间距，减少一页偏紧、一页偏松的问题
    - [ ] 待你确认后，统一文案层级和留白：收口页面标题、区块标题、字段标签、提示块和按钮区的字号层级与上下留白，让用户更容易扫读出“主信息 / 次信息 / 提示信息”的层级
    - [ ] 待你确认后，顺带清理残余视觉噪音：对重复边框样式、局部过重强调、个别区块过密或过空的问题做小范围收口，但不改变现有信息结构和业务语义

    - [x] 已完成物流链路回溯与架构体检：从维护性、稳定性、职责边界和工业级角度复核目录页、平台页、Dialog 原语、shared helper、locale 与 React Query 主链
    - [x] 已整理一版“最小侵入优化计划”草案：优先只动 **Dialog 尺寸机制、平台页重复页眉职责、`provider-directory.ts` 的 domain/presentation 分层** 三项，不推翻现有业务页结构
    - [x] 已完成最小侵入优化 P0-1：`src/components/ui/dialog.tsx` 现已提供显式 `size` 尺寸机制，物流两个弹窗改为直接使用 `size='6xl'`，不再依赖和默认 `sm:max-w-lg` 抢优先级
    - [x] 已完成最小侵入优化 P0-2：移除了 `LogisticsSandboxDashboard` 内部重复页眉，平台配置页面现在仅保留 `platforms-tab.tsx` 作为页面级页眉来源
    - [x] 已完成最小侵入优化 P0-3：`src/features/logistics-config/provider-directory.ts` 已拆为 `provider-directory.domain.ts` 与 `provider-directory.presentation.ts`，并通过兼容 barrel 导出保持现有调用点稳定
    - [x] 已确认 `src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx` 目前 800+ 行，后续不应继续在单文件内堆叠，而应按职责做最小侵入拆分
    - [x] 已完成 P1-1：新增 `src/features/sandbox/logistics-api/hooks/use-logistics-platform-admin.ts`，将 React Query、mutation、副作用 toast、dialog 草稿态与页面动作编排从大组件中抽离
    - [x] 已完成 P1-2：新增 `src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx`，并拆出模板区、基础字段区、目录字段区、接口字段区、凭证字段区等 form sections
    - [x] 已完成 P1-3：新增 `src/features/sandbox/logistics-api/components/logistics-provider-card.tsx` 与 `logistics-platform-state.tsx`，把 provider 卡片展示、状态视图和大段 JSX 从主文件中移出
    - [x] 本轮未额外新增 toolbar 文件：当前刷新 / 新增操作区已足够轻量，继续拆分收益有限，先保持最小侵入
    - [x] 已按 P1 边界完成拆分：**未改 service 契约、未改 React Query 真相链、未改 locale 结构、未引入新的业务状态、未强行把目录页和平台页弹窗合并成一个万能组件**
    - [x] `LogisticsSandboxDashboard` 已收敛为页面组装层：当前仅负责 toolbar、dialog、state、grid 的组合与参数透传，不再直接承载 query、mutation、form draft 和大段字段 JSX
    - [x] 本轮 P1 已完成，不再继续扩大抽象范围；是否后续再评估目录页同步拆分，留待下一轮单独确认
    - [x] 已按边界完成本轮最小侵入优化：**未改后端协议、未改 React Query 真相链、未加新业务字段、未推翻现有页面路由结构、未把现有物流页面重写成大规模新组件体系**

    - [x] 已完成物流字段根源治理方案规划：明确字段归一化、Draft/Payload/DTO 分层、provider 规则单源和测试护栏
    - [x] 已完成字段链路审计：确认当前物流数据本体以 `LogisticsProvider` 为单一类型入口，但字段编辑、模板、展示、校验和提交链仍是多处手工维护，尚未达到“新增字段自动稳定落地”的根源治理状态
    - [x] 已完成根源治理 R1：新增物流字段 schema / registry，统一声明字段分组、默认值策略、模板接管范围、卡片展示范围与 provider 凭证归属，后续新增字段不再需要散落多处同步
    - [x] 已完成根源治理 R2：将当前物流 provider 明确拆为 `Draft / Payload / DTO / Model` 四层，前端草稿态、后端提交契约与后端返回对象职责边界已显式化
    - [x] 已完成根源治理 R3：`logistics-provider-service` 与 `logistics-mock-service` 已接入显式 adapter（`toLogisticsProviderPayload / fromLogisticsProviderDto / toLogisticsProviderDraft`），前端页面不再直接整对象 JSON 直发/直收
    - [x] 已完成根源治理 R4：provider 凭证完整性和规则已收口为单源，平台页凭证区现已正式接入 `appKey / appSecret / customerId / checkWord`，并由统一规则驱动完整性判断
    - [x] 已完成根源治理 R5：已补齐新增字段护栏测试，覆盖模板应用、前端 adapter、provider 规则与后端保存链“省略字段不覆盖 / 显式传空可清空”两类关键回归
    - [x] 已完成根源治理 R6：`server/handlers/logistics_push.go` 中 provider 保存链已从 `db.DB.Save(&input)` 收口为“读取现有记录 -> 按请求字段显式合并 -> 白名单字段 Updates”模式，阻断漏传字段导致的零值覆盖风险
    - [x] 已明确根源治理边界：**不做临时字段兜底补丁、不继续把字段散落在 section/card/hook 中各自维护、不回退到页面内手写 payload 拼装、不破坏现有 React Query 真相链与后端接口主链**
    - [x] 已明确根源目标：让后续新增物流字段时，优先只需修改字段 schema / adapter / provider 规则与对应测试，而不是继续在类型、默认值、模板、表单、卡片、校验和 service 提交之间人工逐处同步
    - [x] 已完成本轮根源治理验证：`pnpm exec vitest run src/features/sandbox/logistics-api/adapters/logistics-provider-adapter.test.ts src/features/sandbox/logistics-api/data/logistics-provider-rules.test.ts src/features/logistics-config/provider-directory.domain.test.ts`、`pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint` 与 `go test ./handlers -run LogisticsProvider` 全部通过

    - [x] 已完成目录页现状审计：`src/features/logistics-config/supplier-directory-tab.tsx` 已接入统一 draft / adapter / provider 规则主链，但仍同时承载 query、mutation、dialog、字段 JSX、卡片 JSX 与状态视图，职责尚未收敛到和平台页同级别
    - [x] 已完成目录页拆分 D1：新增 `src/features/logistics-config/hooks/use-logistics-supplier-directory-admin.ts`，抽离 query、save mutation、dialog 草稿态、模板备注、排序结果与页面动作编排
    - [x] 已完成目录页拆分 D2：新增 `src/features/logistics-config/components/logistics-supplier-form-dialog.tsx`，将目录页内联 dialog 壳层迁出，并在 dialog 内通过统一 draft 主链收口字段维护
    - [x] 已完成目录页拆分 D3：新增 `src/features/logistics-config/components/logistics-supplier-card.tsx` 与 `logistics-supplier-state.tsx`，把目录卡片展示、空态/加载态/错误态从主文件中移出
    - [x] 已完成目录页拆分 D4：新增 `src/features/logistics-config/components/logistics-supplier-toolbar.tsx`，将刷新/新增操作区也从主文件中抽离，主文件已达到与平台页同级的页面组装层颗粒度
    - [x] 已按目录页拆分边界完成实施：**未改后端协议、未改现有 query key、未推翻已落地的字段 registry / adapter / provider 规则、未把目录页和平台页强行合并成万能组件**
    - [x] `LogisticsSupplierDirectoryTab` 已收敛为页面组装层：当前只负责 header、toolbar、dialog、state、grid 的组合与参数透传，不再继续内联大段字段 JSX、卡片 JSX 与 mutation 细节
    - [x] 已完成目录页拆分验证：`pnpm exec tsc --noEmit --pretty false` 与目标文件 `eslint --format json` 通过，新增目录页组件文件 `errorCount: 0`、`warningCount: 0`

    - [x] 已完成第二轮 section 化审计：当前 `src/features/logistics-config/components/logistics-supplier-form-dialog.tsx` 虽已独立成 dialog 壳层，但内部字段区仍以内联 JSX 形式存在；平台页已拆成 `template / basic / directory / integration / credentials` 多个 form section，职责颗粒度仍高于目录页
    - [x] 已完成目录页 dialog section 化 S1：新增 `logistics-supplier-template-section.tsx` 与 `logistics-supplier-basic-fields-section.tsx`，模板选择区、基础字段区已从 dialog 主文件中抽离
    - [x] 已完成目录页 dialog section 化 S2：新增 `logistics-supplier-directory-fields-section.tsx`、`logistics-supplier-integration-fields-section.tsx` 与 `logistics-supplier-credentials-section.tsx`，目录字段区、接口字段区、能力/状态提示与凭证字段区已从 dialog 主文件中抽离
    - [x] 已完成 `logistics-supplier-form-dialog.tsx` 收敛：当前仅保留 header、section 组合、footer 与动作透传，不再内联大段字段 JSX
    - [x] 已按批准完成本轮边界升级：除结构对齐外，**已同步补齐目录页 credentials 区**，目录页 dialog 编辑范围已扩展；实现仍沿用统一 `Draft / adapter / provider rules` 主链，未新增第二套凭证真相
    - [x] 已完成目标：目录页 dialog 在组件颗粒度上继续向平台页靠齐，并已具备凭证编辑能力，同时保持 supplier 场景自身文案、配色与交互边界，未把两个页面硬合并成万能 section 组件
    - [x] 已完成本轮定向验证：`pnpm exec tsc --noEmit --pretty false` 与目标文件 `eslint --format json` 通过，`supplier-directory-tab.tsx`、`use-logistics-supplier-directory-admin.ts`、`logistics-supplier-form-dialog.tsx`、5 个新 section 文件与中英文 locale 文件全部 `errorCount: 0`、`warningCount: 0`

    - [x] 已完成 supplier dialog 测试基线审计：当前仓库尚无 logistics dialog UI/交互测试；现有测试以 `adapter / rules / hook / domain` 为主，未形成可直接复用的 dialog 渲染测试样板
    - [x] 已完成 `src/features/logistics-config/components/logistics-supplier-form-dialog.test.tsx`：采用 supplier dialog 组件级 UI/交互测试，而不是把断言塞回页面级 tab 测试
    - [x] 已完成测试覆盖点 T1“凭证区显示”——验证 dialog 打开后会渲染 credentials section 标题，以及当前 provider profile 应显示的凭证字段标签
    - [x] 已完成测试覆盖点 T2“凭证不完整保存态”——当 `isFormValid=true` 且 `isCredentialsComplete=false` 时，显示 supplier 场景 `credentialsIncomplete` 提示，并展示 `saveIncomplete` 按钮文案
    - [x] 已完成测试覆盖点 T3“凭证完整保存态”——当 `isFormValid=true` 且 `isCredentialsComplete=true` 时，不显示凭证缺失提示，并展示 `saveReady` 按钮文案
    - [x] 已完成测试覆盖点 T4“保存交互”——点击保存按钮会触发 `onSave`；当 `savePending=true` 或 `isFormValid=false` 时，保存按钮保持禁用
    - [x] 已完成测试前置补齐：`package.json` / `pnpm-lock.yaml` 已新增 `@testing-library/react`、`@testing-library/user-event`、`jsdom`，测试文件使用 `// @vitest-environment jsdom` 进行文件级环境切换，未影响现有默认 `node` 环境测试
    - [x] 已完成本轮测试验证：`pnpm exec vitest run src/features/logistics-config/components/logistics-supplier-form-dialog.test.tsx`、`pnpm exec eslint src/features/logistics-config/components/logistics-supplier-form-dialog.test.tsx vitest.config.ts` 与 `pnpm exec tsc --noEmit --pretty false` 全部通过

    - [x] 已完成 `/quality/standards` 前端承接方向校正：当前目标不是复刻历史截图，而是先把“质量标准”拆成能承接后续工序判定的页面信息架构；图片仅作为预览/打印参考，不作为主配置形态
    - [x] 已完成信息架构初判：`/quality/standards` 应拆成 **列表页 / 编辑页 / 预览页** 三层，而不是继续扩张当前“列表 + action dialog + detail dialog”结构
    - [x] 已批准：保留 `/quality/standards` 作为**列表页**，只负责标准检索、筛选、状态查看与动作分发，不承担复杂配置
    - [x] 已批准：新增 `/quality/standards/new` 与 `/quality/standards/$standardId/edit` 作为**独立编辑页**，承载标准基础信息、适用范围、检查项结构与后续工序承接入口
    - [x] 已批准：新增 `/quality/standards/$standardId/preview` 作为**独立预览页**，承接类似历史截图的标准总表阅读、打印与发布前确认视图
    - [x] 已批准：编辑页采用“顶部固定操作条 + 左侧章节导航 + 中间主编辑区 + 右侧摘要/校验区”的工作台结构，不再把复杂配置继续塞入 `StandardActionDialog`
    - [x] 已批准：预览页与编辑页职责硬分离；预览页只承接阅读/导出/发布前确认，不承担主编辑；历史密集矩阵仅作为预览渲染结果存在
    - [x] 已批准：当前 `QualityStandardsHeader`、`QualityStandardsDesktopView`、`QualityStandardsMobileView` 继续服务列表页；`StandardDetailDialog` 未来转为预览页内容渲染器；`StandardActionDialog` 未来降级或退场，不再作为主编辑器扩张
    - [x] 已批准：本阶段先锁定页面模块边界、路由拆分与用户流转，**暂不展开**标准项数据模型、规则表达式与后端契约细节；待页面承接方案确认后再进入下一轮定义
    - [x] 已按批准实施阶段 A：新增独立 route 文件与 page 组件时，采用 `src/routes/_authenticated/quality/standards.*.tsx` + `src/features/quality/pages/*` 的目录化结构，而不是继续把逻辑堆在 `tabs/quality-standards.tsx`
    - [x] 已按批准实施阶段 A：第一阶段仅完成**列表页与新路由骨架解耦**，未在本轮重做标准项编辑表单，先把页面壳层和跳转链路立住
    - [x] 已建立后续阶段边界：第二阶段迁移 `StandardDetailDialog` 到独立预览页；第三阶段再把 `StandardActionDialog` 替换为独立编辑页工作台
    - [x] 已按批准采用过渡策略：本轮以新页面路由为主链，但暂未物理删除旧 `StandardDetailDialog` / `StandardActionDialog` 文件，待后续阶段继续迁移与退场
    - [x] 已完成本轮主链切换：优先顺序按“新 route + page 骨架 -> 列表页跳转与状态同步”落地，且当前每一步都可独立回归
    - [x] 已完成阶段 A 代码落地：新增 `standards-index-page.tsx`、`standard-editor-page.tsx`、`standard-preview-page.tsx` 与对应 quality route；列表页新增跳转到 `/quality/standards/new`、`/quality/standards/$standardId/edit`、`/quality/standards/$standardId/preview` 的主链导航
    - [x] 已完成旧列表主链收敛：`use-quality-standards-mgmt.ts` 已收敛为纯列表数据/搜索状态 hook；`tabs/quality-standards.tsx` 已退化为新页面兼容导出，不再继续承载旧弹窗集控主链
    - [x] 已完成阶段 A 运行时接入：`pnpm run gen:route-tree` 已刷新 `routeTree.gen.ts`，确保新增 quality standards route 进入运行时路由树
    - [x] 已完成阶段 A 验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/routes/_authenticated/quality src/features/quality/pages src/features/quality/components/standard-route-stage-card.tsx src/features/quality/hooks/use-quality-standards-mgmt.ts src/features/quality/tabs/quality-standards.tsx src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts` 与 `pnpm exec prettier --check ...` 全部通过
    - [x] 已完成阶段 B 现状核验：后端当前只有 `GET /quality/standards` 列表接口，**没有** `GET /quality/standards/:id`；前端当前也没有 `getStandardById / useGetQualityStandard` 单条详情查询链
    - [x] 已确认当前列表响应会透传 `items`，说明标准预览所需的矩阵数据结构本身已经存在，但缺少“按 id 稳定获取单条标准”的权威入口
    - [x] 已按批准采用方案 B-1：后端已新增 `GET /quality/standards/:id`，前端已新增 `QualityCoreService.getStandardById(...)` 与 `useGetQualityStandard(...)`，preview page 现可基于 route param 独立加载单条标准详情
    - [x] 已完成阶段 B 内容迁移：`StandardDetailDialog` 的摘要区、审核区与矩阵区已抽为 `standard-preview-content.tsx` 共享内容组件，弹窗与 preview page 共用同一套预览 UI 主体
    - [x] 已完成阶段 B 页面落地：`/quality/standards/$standardId/preview` 现可渲染真实标准内容，并补齐 loading / not-found / forbidden / load-failed 状态
    - [x] 已完成阶段 B 验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/quality/components/standard-preview-content.tsx src/features/quality/components/standard-detail-dialog.tsx src/features/quality/pages/standard-preview-page.tsx src/features/quality/hooks/use-quality.ts src/features/quality/services/quality-core-service.ts src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts`、`pnpm exec prettier --check ...` 与 `go test ./handlers ./routes -run ^$` 全部通过
    - [x] 已开始阶段 C 规划：确认当前 `standards-index-page.tsx` 的编辑入口已稳定跳到 `/quality/standards/$standardId/edit`，阶段 C 的核心不再是列表导航，而是把 `StandardActionDialog` 的编辑主链迁入 editor page
    - [x] 已完成阶段 C 现状梳理：`standard-editor-page.tsx` 目前仍是页面骨架；`StandardActionDialog` 仍承载标准基础信息表单、delta 追踪、校验与提交入口；`useQualityMutations().saveStandardMutation` 与 `QualityMaintenanceService.saveStandard(...)` 可直接复用为 editor page 保存链
    - [x] 已发现阶段 C 新阻塞：前端 `QualityMaintenanceService.saveStandard(...)` 在编辑态会调用 `PATCH /quality/standards/:id`，但后端当前只存在 `GET /quality/standards`、`GET /quality/standards/:id` 与 `POST /quality/standards`，并**没有** `PATCH /quality/standards/:id`
    - [x] 已确认这不是 editor page 新引入的问题，而是旧 `StandardActionDialog` 编辑主链本身就存在的保存契约漂移；若直接迁入页面，只会把隐藏 bug 页面化
    - [x] 已按你批准采用阶段 C 方案 B：后端已新增真实 `PATCH /quality/standards/:id`，前端继续保留 `useDeltaTracker` + delta patch 提交流程，修复旧编辑链的保存契约漂移
    - [x] 已完成阶段 C 契约收敛：新增 `quality-standard-api-adapter.ts`，统一 quality standard 的前后端映射，并把 `remarks ↔ description` 的历史字段漂移收敛到 adapter / DTO 层
    - [x] 已完成阶段 C 页面化迁移：`standard-editor-page.tsx` 已从骨架升级为真实 editor page，支持 create / edit、详情加载、保存后跳 preview、forbidden / missing / load-failed 状态
    - [x] 已完成阶段 C 共享编辑层：新增 `use-standard-editor-form.ts` 与 `standard-editor-content.tsx`；`StandardActionDialog` 已退化为共享编辑内容的兼容壳层，不再维护第二套编辑 UI 真相
    - [x] 已完成阶段 C 验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/quality/adapters/quality-standard-api-adapter.ts src/features/quality/hooks/use-standard-editor-form.ts src/features/quality/components/standard-editor-content.tsx src/features/quality/components/standard-action-dialog.tsx src/features/quality/pages/standard-editor-page.tsx src/features/quality/services/quality-core-service.ts src/features/quality/services/quality-maintenance-service.ts src/features/quality/hooks/use-quality.ts src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts`、`pnpm exec prettier --check ...` 与 `go test ./handlers ./routes -run ^$` 全部通过
    - [x] 已开始阶段 D 规划：阶段目标聚焦于**下线旧弹窗壳层与收口列表页边界**，而不是再新增页面能力
    - [x] 已完成阶段 D 现状梳理：当前 `standards-index-page.tsx` 已仅保留列表查询、搜索与跳转，不再持有任何 detail/action dialog 状态
    - [x] 已完成阶段 D 依赖复核：`StandardDetailDialog`、`StandardActionDialog`、`StandardRouteStageCard` 当前都**没有运行时消费者**，说明它们已从 quality standards 主链退出，可作为物理下线候选
    - [x] 已按你批准采用阶段 D 激进收口：物理删除 `standard-detail-dialog.tsx`、`standard-action-dialog.tsx`、`standard-route-stage-card.tsx`
    - [x] 已进一步收口 `tabs/quality-standards.tsx`：确认其仅为两行兼容导出壳层且无显式消费者后，一并物理删除
    - [x] 已完成阶段 D 边界收口：quality standards 前端主链现只保留 list / editor / preview 三页模块；列表页继续只保留搜索、展示、进入 preview / editor / new 的导航动作
    - [x] 已完成阶段 D 验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/quality/pages/standards-index-page.tsx src/features/quality/pages/standard-editor-page.tsx src/features/quality/pages/standard-preview-page.tsx src/features/quality/components/standard-preview-content.tsx src/features/quality/components/standard-editor-content.tsx src/features/quality/hooks/use-standard-editor-form.ts src/features/quality/hooks/use-quality.ts src/features/quality/services/quality-core-service.ts src/features/quality/services/quality-maintenance-service.ts src/features/quality/adapters/quality-standard-api-adapter.ts src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts` 与 `pnpm exec prettier --check ...` 全部通过
    - [x] 已开始新一轮 List Page 体验优化规划：目标聚焦于 quality standards 列表页的**筛选、分页、状态视图**，不扩展 editor / preview 页面职责
    - [x] 已完成当前列表页缺口梳理：`useQualityStandardsMgmt()` 里 `page / pageSize / typeFilter` 当前全部写死；搜索为前端本地过滤；header 的筛选按钮仍是占位；desktop / mobile 虽有单条状态 badge，但没有列表层级状态视图与分页 UI
    - [x] 已确认本轮优先采用“最小改造面”方案：先复用现有后端 `GET /quality/standards?page&pageSize&type` 能力，不先新增后端关键字搜索接口；前端先补类型筛选、状态视图、分页控件与汇总态
    - [x] 已按你的要求升级规划范围：本轮不再采用“前端搜索 + 后端分页”的混合语义，而是统一升级为**服务端关键字搜索 + 服务端类型筛选 + 服务端状态筛选 + 服务端分页**
    - [x] 已确认当前后端列表接口仅支持 `page / pageSize / type`，因此本轮需要补齐新的服务端查询参数（至少包括 `keyword`、`status`）并同步扩前端 query hook / service 契约
    - [x] 已按你批准实施升级后方案边界：状态视图现直接映射到服务端 `status` 查询；关键字搜索也升级为服务端语义，并在筛选项变化时自动重置到第一页
    - [x] 已完成升级后文件改造：同步修改 `server/handlers/quality.go`、`src/features/quality/services/quality-core-service.ts`、`src/features/quality/hooks/use-quality.ts`、`src/features/quality/hooks/use-quality-standards-mgmt.ts`、`src/features/quality/pages/standards-index-page.tsx`、`src/features/quality/components/quality-standards-header.tsx`
    - [x] 已完成列表层独立组件补齐：新增 `src/features/quality/components/quality-standards-status-overview.tsx`、`src/features/quality/components/quality-standards-pagination.tsx` 与 `src/features/quality/types/quality-standards-list.ts`
    - [x] 已完成 List Page 服务端统一语义体验优化：quality standards 列表页现支持服务端关键字搜索、类型筛选、状态视图与分页联动
    - [x] 已完成本轮验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/quality/types/quality-standards-list.ts src/features/quality/components/quality-standards-status-overview.tsx src/features/quality/components/quality-standards-pagination.tsx src/features/quality/components/quality-standards-header.tsx src/features/quality/components/quality-standards-empty.tsx src/features/quality/hooks/use-quality-standards-mgmt.ts src/features/quality/hooks/use-quality.ts src/features/quality/services/quality-core-service.ts src/features/quality/pages/standards-index-page.tsx src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts`、`pnpm exec prettier --check ...` 与 `go test ./handlers ./routes -run ^$` 全部通过
    - [x] 已开始“状态统计增强”规划：目标是让 quality standards 的状态视图不只切换查询条件，还显示**后端权威分状态计数**
    - [x] 已完成现状核验：当前 `GET /quality/standards` 只返回 `items / total / page / pageSize`，并**没有** `stats` 或 `metadata.stats`；`quality-standards-status-overview.tsx` 当前也只展示标签与说明，不展示权威数量
    - [x] 已完成可复用范式确认：`customer-list` / `supplier-list` 已采用“列表主响应 + `metadata.stats`”模式，且前端在缺少 `metadata.stats` 时明确显示“统计暂不可用”，不再回退前端本地重算
    - [x] 已按你批准采用 `metadata.stats` 作为状态统计返回形态，保留现有 `items / total / page / pageSize` 主契约不变，只增不破
    - [x] 已按你批准采用统计口径：返回 `total / published / draft / archived` 四个权威计数，统计基于当前 `keyword / type` 查询上下文聚合，但不受当前 `status` 过滤二次裁剪
    - [x] 已完成后端状态统计增强：同步修改 `server/handlers/quality.go` 与 `server/handlers/quality_dto.go`，让 `GET /quality/standards` 返回 `metadata.pagination / metadata.stats`
    - [x] 已完成前端状态统计接线：同步修改 `src/features/quality/types/quality-standards-list.ts`、`src/features/quality/adapters/quality-standard-api-adapter.ts`、`src/features/quality/services/quality-core-service.ts`、`src/features/quality/hooks/use-quality.ts`、`src/features/quality/hooks/use-quality-standards-mgmt.ts`、`src/features/quality/components/quality-standards-status-overview.tsx` 与 `src/features/quality/pages/standards-index-page.tsx`
    - [x] 已完成状态视图增强：quality standards 列表页现可展示后端权威的 `全部 / 已发布 / 待审核 / 已归档` 四类计数，而不再只是纯切换按钮
    - [x] 已完成本轮验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/quality/types/quality-standards-list.ts src/features/quality/adapters/quality-standard-api-adapter.ts src/features/quality/services/quality-core-service.ts src/features/quality/hooks/use-quality.ts src/features/quality/hooks/use-quality-standards-mgmt.ts src/features/quality/components/quality-standards-status-overview.tsx src/features/quality/pages/standards-index-page.tsx src/locales/messages/zh-CN/quality.ts src/locales/messages/en-US/quality.ts`、`pnpm exec prettier --check ...` 与 `go test ./handlers ./routes -run ^$` 全部通过
    - [x] 已开始“URL 查询态同步”规划：目标是把 `keyword / type / status / page / pageSize` 从列表页本地状态提升为可直达、可分享、可刷新的路由 search 状态
    - [x] 已完成现状核验：`src/routes/_authenticated/quality/standards.tsx` 当前只有 `component`，**没有** `validateSearch`；`useQualityStandardsMgmt()` 当前完全使用本地 `useState` 持有查询条件
    - [x] 已完成可复用范式确认：仓库里已有 `validateSearch + Route.useSearch() + Route.useNavigate()` 与 `use-table-url-state.ts` 的 URL 状态同步模式，可直接参考其“默认值收敛到 URL、变更时重置 page”的做法
    - [x] 已按你批准采用 URL 同步边界：由 `/_authenticated/quality/standards` route 新增 search schema，收口 `keyword / type / status / page / pageSize` 五个查询参数，不把 editor / preview 的状态混入同一条 search 契约
    - [x] 已按你批准采用状态归属：`useQualityStandardsMgmt()` 现从 route search 派生状态并通过 `navigate({ search })` 回写 URL；`standards-index-page.tsx` 继续只做展示与跳转，不直接承载 search 细节
    - [x] 已完成 URL 查询态同步实施：同步修改 `src/routes/_authenticated/quality/standards.tsx`、新增 `src/features/quality/pages/standards-index-route-entry.tsx`、修改 `src/features/quality/pages/standards-index-page.tsx`、`src/features/quality/hooks/use-quality-standards-mgmt.ts` 与 `src/features/quality/types/quality-standards-list.ts`
    - [x] 已完成 URL 查询态收口：quality standards 列表页当前已支持 `keyword / type / status / page / pageSize` 与 route search 双向同步，可刷新恢复、可复制分享、可前进后退回放
    - [x] 已完成本轮验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/routes/_authenticated/quality/standards.tsx src/features/quality/pages/standards-index-route-entry.tsx src/features/quality/pages/standards-index-page.tsx src/features/quality/hooks/use-quality-standards-mgmt.ts src/features/quality/types/quality-standards-list.ts` 与 `pnpm exec prettier --check ...` 全部通过
    - [x] 已收到 workflow-core 运行时错误：`business-event-source-normalizer.ts` 试图从 `business-event-source-templates.ts` 读取 `DEFAULT_SALES_ORDER_EVENT_SOURCE`，但当前模块未提供该导出，导致 authenticated layout 下游 React 组件装载失败
    - [x] 已完成根因核验：`business-event-source-normalizer.ts` 仍从聚合文件 `business-event-source-templates.ts` 导入 `DEFAULT_SALES_ORDER_EVENT_SOURCE`，但聚合文件仅内部引用销售订单子模板、未继续对外导出该符号，因此触发 ESM 导出断裂
    - [x] 已按你批准的修复边界实施：本轮只收口导出契约断裂，不改 workflow event source 的数据结构、字段语义或其它模板模块
    - [x] 已按你批准的方案修复：将 `src/features/system-mgmt/workflow-core/data/business-event-source-normalizer.ts` 改为直连 `src/features/system-mgmt/workflow-core/data/business-event-source-templates/sales-order.ts`，不再依赖聚合文件兼容导出
    - [x] 已完成本轮验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint src/features/system-mgmt/workflow-core/data/business-event-source-normalizer.ts src/features/system-mgmt/workflow-core/data/business-event-source-templates.ts src/features/system-mgmt/workflow-core/data/business-event-source-templates/sales-order.ts` 与 `pnpm exec prettier --check ...` 全部通过
    - [x] 已收到第二处连锁错误：`use-business-event-sources.ts` 与多个 tab 组件仍通过 `src/features/system-mgmt/workflow-core/data/business-event-source-schema.ts` 读取 `DEFAULT_SALES_ORDER_EVENT_SOURCE`，但当前 schema barrel 只 `export * from './business-event-source-templates'`，而 templates 聚合文件并未暴露该符号
    - [x] 已完成根因核验：当前公开 API 真正缺失的是 `business-event-source-schema.ts` 对默认销售订单模板的稳定导出，而非 `use-business-event-sources.ts` 单点 import 写错
    - [x] 已收到你的批准：本轮不补 `business-event-source-schema.ts` 公开导出，而是把依赖 `DEFAULT_SALES_ORDER_EVENT_SOURCE` 的业务消费者批量改为直连 `business-event-source-templates/sales-order.ts`
    - [ ] 待实施批量直连：本轮将修改 `src/features/system-mgmt/workflow-core/hooks/use-business-event-sources.ts`、`src/features/system-mgmt/tabs/notification-rule-list.tsx`、`src/features/system-mgmt/tabs/business-event-source-list-helpers.ts`、`src/features/system-mgmt/tabs/components/rule-card.tsx`
    - [ ] 待完成验证：实施后执行 `tsc / eslint / prettier` 定向校验，并把结果回写到 `implementation_plan.md` 与 `walkthrough.md`
    - [x] 已定位“新增物流接口”弹窗越界根因：`src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 当前仅设置 `DialogContent size='6xl'` 与大内边距，但未设置 `max-height`、内部滚动与响应式列布局；`src/components/ui/dialog.tsx` 也只限制宽度、不限制高度，因此在较小视口/较高缩放下会把底部挤出屏幕
    - [x] 已完成影响边界核验：本轮 `workflow-core` 导出修复未触碰 `logistics-provider-form-dialog.tsx`、`logistics-sandbox-dashboard.tsx` 或 `src/components/ui/dialog.tsx`；当前越界问题属于物流接口弹窗自身布局约束缺失，不是本轮导出修复直接引入的回归
    - [x] 已收到你的批准：本轮修复范围扩大为“全局 `Dialog` 高度策略 + 物流接口弹窗本地布局”联合收口，不再局限于单个弹窗文件
    - [x] 已完成联合修复：已修改 `src/components/ui/dialog.tsx`，为通用弹窗补齐视口高度约束与滚动能力；同时修改 `src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx`，将物流接口弹窗从固定双列收口为响应式布局
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/components/ui/dialog.tsx src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 与 `pnpm exec prettier --check src/components/ui/dialog.tsx src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的布局诉求：继续压缩“新增物流接口”弹窗内部占高，但保持字体大小、文案层级与输入控件字号不变，只收缩留白、间距和非必要的垂直占用
    - [x] 已收到你的确认：本轮仅修改 `src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 的容器级留白，不再扩大到新的全局样式调整
    - [x] 已完成实施：已压缩弹窗 header / section / footer / grid gap / py / p 等垂直留白，未触碰字体、图标大小和字段文案
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 与 `pnpm exec prettier --check src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到第二轮诉求：当前弹窗仍有滚动条，希望再压一轮高度，但继续保持字体大小、图标大小和字段文案不变
    - [x] 已收到你的确认：本轮继续只修改 `src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx` 及其直接承载区块，优先压缩区块卡片自身的上下内边距、内部分组间距、提示区与 footer 的垂直占用，不扩散到新的全局样式
    - [x] 已完成实施：已对 `logistics-provider-form-dialog.tsx` 及其 `provider-form-sections` 下的模板区、基础字段区、目录区、接口区、凭证区继续压缩 `p / pt / pb / gap / space-y / h-* / min-h-*`，目标是尽量消除当前视口下的滚动条，但未触碰字号、图标大小、字段文案和业务交互
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/sandbox/logistics-api/components/logistics-provider-form-dialog.tsx src/features/sandbox/logistics-api/components/provider-form-sections/provider-template-section.tsx src/features/sandbox/logistics-api/components/provider-form-sections/provider-basic-fields-section.tsx src/features/sandbox/logistics-api/components/provider-form-sections/provider-directory-fields-section.tsx src/features/sandbox/logistics-api/components/provider-form-sections/provider-integration-fields-section.tsx src/features/sandbox/logistics-api/components/provider-form-sections/provider-credentials-section.tsx` 与 `pnpm exec prettier --check ...` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已完成销售管理缺口分析：前端 `src/features/trading/tabs.ts` 仅暴露 `customers / sales-orders / logistics / receivables / orders-analysis`，`src/routes/_authenticated/trading` 下也没有任何 `sales-returns` 路由文件，确认销售管理当前不存在销售退货入口
    - [x] 已完成后端主链核验：`server/routes/routes_trading.go` 暴露了 `/sales-orders`、`/customers`、`/quotes` 与 `/purchase/*` 资源，其中采购侧已有 `/purchase/returns` 与 `/purchase/orders/:id/returns`，但销售侧不存在 `/sales-returns` 或 `/sales-orders/:id/returns`；`server/authz/permissions.go` 也没有 `ActionTradingSalesReturn*` 权限常量
    - [x] 已完成能力对照：前端销售侧仅具备销售订单查询、patch、状态迁移、取消等交易能力（`sales-query-service.ts`、`sales-service.ts`、`sales-transaction-service.ts`），没有销售退货 DTO、service、hook、列表页、详情页或打印/证据链；采购退货则已形成较完整的可复用参照链路
    - [x] 已收到你的新方向：优先从仓库主链切入，内置一个不可修改的“虚拟退货仓”，让销售、仓库两侧都能先围绕该仓查看退货占用/回库结果，再考虑新增独立 TAB 处理销售退货/换货与销售订单同步
    - [x] 已完成可行性核验：`server/models/warehouse.go` 当前已存在系统内置 `SHIPPING_VIRTUAL`（虚拟发货仓），说明“内置系统虚拟仓”在现有仓库主数据模型中可行；`GetWarehouseCategoryOptionsHandler` 会把活跃库区下发到业务表单，可作为后续虚拟退货仓接入的现成通路
    - [x] 已完成保护边界核验：当前 `IsSystem` 只明确阻止系统仓删除（`DeleteWarehouseCategoryHandler` 与仓库分类页删除按钮），但**没有**阻止系统仓编辑；因此若要实现“不能修改的虚拟退货仓”，需要额外补齐后端 patch 拦截与前端编辑禁用，而不能只靠现有 `IsSystem`
    - [x] 已完成场景缺口核验：`src/features/warehouse/utils/warehouse-category-config.ts` 目前只支持 `product-inbound / material-inbound / shipment / stocktake / purchase-receipt`，没有 `sales-return` 场景；这意味着即便新增虚拟退货仓，也还需要补销售退货回仓的业务选择/默认落仓语义
    - [x] 已收到你新的收口要求：当前先不要处理任何销售退货 TAB、换货同步或销售订单联动扩展，只聚焦把“虚拟退货仓”本身搞定
    - [x] 已收到你的确认：本轮仅实施虚拟退货仓基础能力，包括 `SALES_RETURN_VIRTUAL` 系统预置、系统仓不可编辑保护，以及仓库场景补 `sales-return`；不新增销售侧 TAB、退货单据、打印、证据和订单同步语义
    - [x] 已完成实施：已在 `server/models/warehouse.go` 预置 `SALES_RETURN_VIRTUAL`，并在 `server/db/db.go` 收口默认仓库对齐逻辑；已在 `server/handlers/warehouse_category.go` 禁止系统仓 patch 编辑；已在 `src/features/warehouse/tabs/warehouse-category.tsx` 隐藏系统仓编辑/删除入口并补前端拦截；已在 `src/features/warehouse/utils/warehouse-category-config.ts` 增加 `sales-return` 场景与虚拟退货仓默认回落逻辑
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/warehouse/tabs/warehouse-category.tsx src/features/warehouse/utils/warehouse-category-config.ts`、`pnpm exec prettier --check src/features/warehouse/tabs/warehouse-category.tsx src/features/warehouse/utils/warehouse-category-config.ts` 与 `go test ./handlers ./db -run ^$` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的范围收口：先不做销售退货/换货业务单据，只在“销售管理”下把 `销售退货`、`销售换货` 两个 TAB/路由骨架先挂出来，作为后续业务页承载位
    - [x] 已收到你的确认：本轮仅实施销售管理下的 `销售退货` / `销售换货` TAB 骨架页，包括 trading tabs、trading 子路由和独立占位页组件；暂不接后端接口、暂不接销售订单数据、暂不接虚拟退货仓真实记录
    - [x] 已完成实施：已在 `src/features/trading/tabs.ts` 增加 `sales-returns / sales-exchanges` 两个 TAB；已新增 `src/routes/_authenticated/trading/sales-returns*.tsx` 与 `sales-exchanges*.tsx` 路由壳；已新增独立占位页 `src/features/trading/tabs/sales-returns-tab.tsx` 与 `sales-exchanges-tab.tsx`；并同步补齐 `src/locales/messages/zh-CN/trading.ts` 与 `en-US/trading.ts` 文案键
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/trading/tabs.ts src/features/trading/tabs/sales-returns-tab.tsx src/features/trading/tabs/sales-exchanges-tab.tsx src/routes/_authenticated/trading/sales-returns.tsx src/routes/_authenticated/trading/sales-returns.lazy.tsx src/routes/_authenticated/trading/sales-exchanges.tsx src/routes/_authenticated/trading/sales-exchanges.lazy.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 与 `pnpm exec prettier --check ...` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的范围收口：本轮不看销售订单列表，不规划跨模块提示；只聚焦 `src/features/trading/components/customer-list-item.tsx` 的客户动态卡片内部组织，先为后续销售退货提示预留承载层
    - [x] 已完成现状核验：`customer-list-item.tsx` 当前已同时承载卡片头部、`CustomerSalesClosureSummaryBlock`、`CustomerQuoteEntryBlock`、联系人/电话、地址、微信、余额与底部动作；说明它已经进入“动态摘要块已开始独立、但卡片编排仍集中在单文件”的半拆分状态
    - [x] 已收到你的确认：本轮只实施客户动态摘要承载层拆分，不接真实销售退货数据；通过新增独立摘要承载层组件，统一编排现有销售收口摘要与报价摘要，并为未来 `销售退货摘要块` 预留挂载位
    - [x] 已完成实施：已新增 `src/features/trading/customer/components/customer-dynamic-summary-layer.tsx`，统一承载 `CustomerSalesClosureSummaryBlock` 与 `CustomerQuoteEntryBlock`；已调整 `src/features/trading/components/customer-list-item.tsx`，令其只负责卡片壳、头部、静态资料区、底部动作区及对动态摘要承载层的调用
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/trading/components/customer-list-item.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/customer/components/customer-quote-entry-block.tsx src/features/trading/customer/components/customer-sales-closure-summary.tsx` 与 `pnpm exec prettier --check src/features/trading/components/customer-list-item.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/customer/components/customer-quote-entry-block.tsx src/features/trading/customer/components/customer-sales-closure-summary.tsx` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的范围收口：下一步新增独立 `customer-sales-return-summary-block.tsx`，但当前只做静态骨架/假空态结构；真实销售退货汇总字段晚一步再定
    - [x] 已收到你的确认：本轮仅新增 `src/features/trading/customer/components/customer-sales-return-summary-block.tsx`，并将其挂入 `customer-dynamic-summary-layer.tsx`；组件只展示“销售退货”标题、占位说明与空态提示，不发起查询、不接假统计数字、不增加假按钮
    - [x] 已完成实施：已新增独立文件 `src/features/trading/customer/components/customer-sales-return-summary-block.tsx`，提供静态销售退货摘要骨架与空态说明；已调整 `src/features/trading/customer/components/customer-dynamic-summary-layer.tsx`，将摘要顺序收口为 `销售收口摘要 -> 销售退货摘要(静态空态) -> 报价摘要`
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/trading/customer/components/customer-sales-return-summary-block.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/components/customer-list-item.tsx` 与 `pnpm exec prettier --check src/features/trading/customer/components/customer-sales-return-summary-block.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/components/customer-list-item.tsx` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的产品收口：客户卡片里的售后提示先只做“退货”这一半；卡片上只需要展示 `退货数量 / 总订单数量` 与一个直达 `销售退货` 页的按钮；`换货数量 / 总订单数量` 与跳转按钮本轮先不实现，但结构上要预留同位扩展能力
    - [x] 已收到你的确认：本轮仅改 `customer-sales-return-summary-block.tsx` 与必要的 trading route search 承载，使其从“静态空态”升级为“数量占位骨架 + 跳转按钮骨架”；在真实退货汇总数据链未就绪前，仅收口字段位和按钮位，不发明假数字
    - [x] 已完成实施：已调整 `src/features/trading/customer/components/customer-sales-return-summary-block.tsx`，将其收口为 `退货数量 / 总订单数量` 指标位骨架与“查看退货单”按钮；已调整 `src/features/trading/customer/components/customer-dynamic-summary-layer.tsx`，透传退货页跳转回调；已调整 `src/features/trading/components/customer-list-item.tsx`，让客户卡片按钮携带 `customerId / customerName` 跳到 `/trading/sales-returns`；已调整 `src/routes/_authenticated/trading/sales-returns.tsx`，补最小客户上下文 search 承载
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/trading/components/customer-list-item.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/customer/components/customer-sales-return-summary-block.tsx src/routes/_authenticated/trading/sales-returns.tsx src/features/trading/tabs/sales-returns-tab.tsx` 与 `pnpm exec prettier --check src/features/trading/components/customer-list-item.tsx src/features/trading/customer/components/customer-dynamic-summary-layer.tsx src/features/trading/customer/components/customer-sales-return-summary-block.tsx src/routes/_authenticated/trading/sales-returns.tsx src/features/trading/tabs/sales-returns-tab.tsx` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的范围纠正：当前先不定义退货统计口径，不展开采购参照；改为先收口“销售退货页面如何接入”的前端设计
    - [x] 已完成现状核验：客户卡片已能携带 `customerId / customerName` 跳到 `/trading/sales-returns`；`src/routes/_authenticated/trading/sales-returns.tsx` 已能承载最小 search；但 `src/features/trading/tabs/sales-returns-tab.tsx` 仍只是静态占位页，尚未消费客户上下文，也没有形成列表页过滤/详情承载结构
    - [x] 已收到新的方向纠正：销售退货主链必须由 `销售退货页` 自身承担订单、客户、数量等主数据接入；客户卡片只能读取销售订单总量与退货汇总值做展示，**禁止反向依赖**客户卡片显示结构作为销售退货页的数据来源
    - [x] 已收到你的确认：本轮按纠正后的方向实施销售退货页接入层——`sales-returns` 页负责承接订单/客户/数量主数据入口与筛选壳层；客户卡片带来的 `customerId / customerName` 仅作为“初始筛选上下文”，不是业务数据源
    - [x] 已完成实施：已新增 `src/features/trading/sales/utils/sales-return-route-search.ts` 独立收口销售退货页 search contract；已新增 `src/features/trading/sales-returns/components/sales-returns-context-banner.tsx` 与 `sales-returns-list-shell.tsx` 作为上下文提示区和列表壳层；已调整 `src/routes/_authenticated/trading/sales-returns.tsx` 与 `src/features/trading/tabs/sales-returns-tab.tsx`，让销售退货页正式消费客户上下文并以前端壳层方式前置主链入口
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/routes/_authenticated/trading/sales-returns.tsx src/features/trading/sales/utils/sales-return-route-search.ts src/features/trading/tabs/sales-returns-tab.tsx src/features/trading/sales-returns/components/sales-returns-context-banner.tsx src/features/trading/sales-returns/components/sales-returns-list-shell.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 与 `pnpm exec prettier --check src/routes/_authenticated/trading/sales-returns.tsx src/features/trading/sales/utils/sales-return-route-search.ts src/features/trading/tabs/sales-returns-tab.tsx src/features/trading/sales-returns/components/sales-returns-context-banner.tsx src/features/trading/sales-returns/components/sales-returns-list-shell.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的实施目标：开始定义并实现 `sales-returns` 页自己的真实查询壳层，但当前先进入规划阶段，先收口壳层职责与拆分边界，再等你确认后实施
    - [x] 已完成模式对齐核验：现有 `sales-orders` 已具备 `route search contract -> query service -> react-query hook -> 页面级 view model / 列表组件` 的拆分；`sales-returns` 当前只有 `route search contract + context banner + list shell`，还缺真正的查询层与页面级查询编排层
    - [x] 已收到你的确认：本轮为 `sales-returns` 新增“真实查询壳层”，但**不直接伪造退货数据**；通过独立 `query service / query hook / page query shell hook` 把 route search、分页、筛选、客户上下文与详情选中态统一编排起来，并让列表壳层真正消费查询 state
    - [x] 已完成实施：已扩展 `sales-return-route-search.ts` 以承载 `search / detailId / status / customerId / customerName`；已新增 `src/features/trading/sales/services/sales-return-query-service.ts`、`src/features/trading/sales/hooks/use-sales-return-queries.ts`、`src/features/trading/sales-returns/hooks/use-sales-return-query-shell.ts`；已新增 `src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx` 并升级 `sales-returns-list-shell.tsx` 与 `sales-returns-tab.tsx`，让销售退货页真实查询现有销售订单主链作为退货入口源订单；同时已调整 `SalesOrderMaster` 支持无操作列复用
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、`pnpm exec eslint --no-warn-ignored src/features/trading/query-keys.ts src/features/trading/components/sales-order-master.tsx src/features/trading/sales/utils/sales-return-route-search.ts src/features/trading/sales/services/sales-return-query-service.ts src/features/trading/sales/hooks/use-sales-return-queries.ts src/features/trading/sales-returns/hooks/use-sales-return-query-shell.ts src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx src/features/trading/sales-returns/components/sales-returns-list-shell.tsx src/features/trading/tabs/sales-returns-tab.tsx src/routes/_authenticated/trading/sales-returns.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 与 `pnpm exec prettier --check src/features/trading/query-keys.ts src/features/trading/components/sales-order-master.tsx src/features/trading/sales/utils/sales-return-route-search.ts src/features/trading/sales/services/sales-return-query-service.ts src/features/trading/sales/hooks/use-sales-return-queries.ts src/features/trading/sales-returns/hooks/use-sales-return-query-shell.ts src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx src/features/trading/sales-returns/components/sales-returns-list-shell.tsx src/features/trading/tabs/sales-returns-tab.tsx src/routes/_authenticated/trading/sales-returns.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 全部通过，结果已回写 `walkthrough.md`
    - [x] 已收到新的实施目标：开始定义真实“销售退货单”自己的 DTO / 查询接口 / 页面列表结构，并在这条主链稳定后，把客户卡片上的 `退货数量 / 总订单数量` 真实接回这条主链
    - [x] 已完成现状核验：后端目前**没有**销售退货路由、handler、service、model 或 DTO；采购侧已有 `purchase_returns` 完整模式（`model -> dto -> mapper -> handler -> service -> frontend service/hook`），可作为销售退货单主链的直接参照；客户卡片当前只通过 `customer-sales-closure-summary-service.ts` 读取订单总量摘要，销售退货摘要仍是 `-- / --` 骨架
    - [x] 已收到你的确认并锁定本轮实施边界：按**件数口径**先完整打通“销售退货单主链第一版”，具体包括 `server/models` 新增销售退货单/明细模型、`server/services` 新增 DTO / mapper / list query / create query 能力、`server/handlers` 与 `server/routes` 新增销售退货查询接口、前端新增对应 `contracts / service / hook / list structure`，并让 `sales-returns` 页从“源订单入口页”升级为“销售退货单列表页”
    - [x] 已完成实施：已在后端新增 `SalesReturn / SalesReturnLine` 模型、`sales_return_dto.go`、`sales_return_mapper.go`、`sales_return_service.go`、`sales_returns.go` 与 `customer_sales_return_summary.go`，并在 `routes_trading.go` / `db.go` 注册 `GET /sales-returns`、`GET /sales-returns/:id`、`POST /sales-orders/:id/returns` 与 `GET /customers/sales-return-summary`；已在前端新增 `sales-return-api-dto.ts`、`sales-return-service.ts`、`use-sales-returns.ts`、真实退货单列表/详情组件，并将 `sales-returns` 页查询壳层切到真实销售退货单列表；同时已让客户卡片通过 `customer-sales-return-summary-service.ts` 只读消费新的客户维度销售退货摘要，按 `退货总件数 / 总订单数` 展示
    - [x] 已完成最小回归保护：已新增 `server/services/sales_return_service_test.go` 覆盖销售退货单创建主链，新增 `server/handlers/customer_sales_return_summary_test.go` 覆盖客户销售退货摘要聚合返回
    - [x] 已完成验证：`go test ./services ./handlers ./routes -run "SalesReturn|CustomerSalesReturn"`、`pnpm exec tsc --noEmit --pretty false` 与目标文件 `eslint` 已通过；`walkthrough.md` 已回写本轮变更与验证结果；剩余仅为格式化收口（`prettier/gofmt`）

    - [x] 已完成根因分析：当前 `sales-returns` 页已经切到真实 `sales_returns` 主表查询，空态本身不是报错，而是因为它不再读取 `sales_orders`；同时前端没有任何实际“创建销售退货单”的入口，所以即使销售订单里有数据，销售退货首页仍会显示“暂无销售退货单”
    - [x] 已收到你新的产品方向纠正：当前 UI 表达具有强误导性；销售退货首页不应先把用户带到“真实退货单空列表”，而应先提供一个可操作入口——支持按**客户名 / 订单号等模糊搜索销售订单**，搜索结果中直接展示订单，并提供“执行退货/添加退货”按钮
    - [x] 已收到你的确认：销售退货页第一屏改为“源订单搜索与退货操作入口页”，真实销售退货单列表退居为结果区；首页先解决“怎么发起退货”，再展示“已经存在的退货单”
    - [x] 已完成实施：已把 `sales-return-query-service.ts` / `use-sales-return-queries.ts` 重新挂回页面主入口；已扩展 `sales-orders` 查询主链支持 `keyword / customerId`；已新增 `sales-returns-entry-shell.tsx` 与 `sales-return-source-order-master.tsx`，让销售退货首页支持按订单号、客户名、订单名称模糊搜索源订单，并在结果列表与详情区提供明确的“执行退货”按钮位；同时真实销售退货单列表降为首页下半区结果承载位
    - [x] 已完成语义收口：已同步重写 `sales-returns` 页入口文案与空态语义，避免继续把“暂无真实退货单”误表达成“没有销售退货主链”；客户卡片跳转到该页时仍会优先携带客户上下文进入源订单退货入口视图
    - [x] 已收到你的确认：本轮先按“方案 B”实施，只纠正销售退货首页入口与 UI，不在本轮完成完整退货创建表单
    - [x] 已完成新复杂度核验：当前 `GetSalesOrdersHandler -> ListSalesOrders` 只支持 `page / pageSize / status / withLines`，**不支持** `keyword / customerId`；因此“按客户名 / 订单号模糊搜索源订单”不是纯前端重排，必须扩展销售订单列表后端查询参数与前端 query service 契约
    - [x] 已收到你的再次确认：允许一并修改销售订单查询主链（`server/handlers/sales_orders.go`、`server/services/order_master_service.go`、前端 `sales-query-service.ts` / `sales-return-query-service.ts`），补 `keyword / customerId` 过滤能力
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint`、`go test ./handlers ./services -run "SalesOrder|SalesReturn"` 已通过；`walkthrough.md` 已回写本轮首页入口纠偏与源订单搜索链收口结果

    - [x] 已收到你的继续推进信号：在首页入口与搜索链纠偏完成后，下一步进入“`执行退货` 按钮接最小创建表单”的规划阶段
    - [x] 已收到你的确认：本轮按 **方案 A** 实施，把 `执行退货` 按钮接成**右侧抽屉**，并按订单明细逐行填写退货数量创建真实 `sales_return`
    - [x] 已完成实施：已新增独立 `sales-return-create-sheet.tsx` 抽屉组件，并将首页 `执行退货` 按钮从 toast 占位接成真实创建入口；表单已承载 `returnDate / issueCategory / reason / remarks / line quantity` 最小字段，支持按订单明细逐行填写退货数量，提交后复用现有 `createSalesReturn()` mutation 创建真实销售退货单
    - [x] 已完成刷新链收口：销售退货源订单列表查询已切到 `withLines: true`，以便抽屉直接复用源订单明细；创建成功后会关闭抽屉、选中新建退货单，并依赖现有 query invalidation 刷新首页下半区真实退货单结果区
    - [x] 已完成验证：`pnpm exec tsc --noEmit --pretty false` 与目标文件 `eslint` 已通过；`walkthrough.md` 已回写本轮最小创建抽屉接入结果

    - [x] 已收到你对下一步的选择：继续走 **方向 A**，在退货抽屉中为每条订单明细展示 `已退数量 / 可退数量`
    - [x] 已完成复杂度预判：这一步**不能只改前端**，因为当前销售订单源订单查询虽然已带 `lines`，但每条行数据仍只有订单数量，不包含销售退货聚合后的 `returnedQuantity / remainingReturnableQuantity`；若不补后端聚合字段，前端无法可靠展示真实可退口径
    - [x] 已收到你的确认：允许同步扩展销售订单明细响应契约，在销售退货源订单链中为每条订单行补 `returnedQuantity / remainingReturnableQuantity`，并在退货抽屉中展示 `已退 / 可退 / 本次退货` 三列
    - [x] 已完成实施：后端已在销售订单 `withLines / detail` 响应链中聚合 `sales_return_lines`，为每条订单行补齐 `returnedQuantity / remainingReturnableQuantity`；前端已同步扩展 `schema / sales-order-api-dto / adapter`，并在 `sales-return-create-sheet.tsx` 中展示 `已退 / 可退 / 本次退货`，同时以 `remainingReturnableQuantity` 作为数量输入上限与“全部带入”的默认值
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint`、`go test ./services ./handlers -run "SalesOrder|SalesReturn"` 已通过；`walkthrough.md` 已回写本轮方向 A 的行级可退数量收口结果

    - [x] 已收到你新的 UI 反馈：当前“创建销售退货单”侧边栏的明细区列布局割裂，`退货数量` 输入列会掉到下方，影响整体可读性与录入体验
    - [x] 已收到你的确认：本轮直接实施侧边栏布局优化，优先重构退货明细区的表格式布局，解决列错位与割裂问题，但不改业务逻辑
    - [x] 已完成实施：已将 `sales-return-create-sheet.tsx` 的退货明细区改为更稳定的表格式栅格布局，并增加横向滚动兜底；桌面宽度下统一使用固定列轨道展示 `明细信息 / 行号 / 订单数量 / 已退数量 / 可退数量 / 单价 / 退货数量`，避免 `退货数量` 输入框掉位；同时将抽屉宽度扩到 `sm:max-w-4xl`，并补充移动端字段标签，减少断裂感
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint` 已通过；`walkthrough.md` 已回写本轮侧边栏布局优化结果

    - [x] 已收到你对下一步的选择：继续走 **方案 B**，把退货明细区进一步做成更像“轻表格”的样式，强化表头、分隔和输入框层次
    - [x] 已完成复杂度预判：本轮仍可保持纯前端样式层重构，不需要改后端契约或退货创建逻辑；但要避免为了“更像表格”而把移动端彻底做坏，因此需要采用“桌面端轻表格 + 窄宽度保留滚动/标签兜底”的方案
    - [x] 已收到你的确认：允许继续优化 `sales-return-create-sheet.tsx` 的明细区视觉层次，包括表头底色、行分隔、单元格对齐、输入框容器样式与可退数量高亮，但不改字段、不改提交流程
    - [x] 已完成实施：退货明细区已进一步收口为“轻表格”风格；当前已增强表头底色与层级、行分隔与 hover 反馈、数字列 `tabular-nums` 对齐、输入列的独立容器和聚焦视觉，并继续保留桌面端固定列轨道与窄宽度滚动兜底
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint` 已通过；`walkthrough.md` 已回写本轮方案 B 的轻表格样式优化结果

    - [x] 已收到你新的 UI 指令：删除销售退货首页里最初用于占位说明的“全局退货单入口”卡片，并继续做 **方案 D** —— 为当前录入中的退货明细行增加更明确的激活态高亮
    - [x] 已完成范围预判：这一步仍然可以保持纯前端收口，不需要改后端或创建 payload；预计会涉及首页占位空态组件与 `sales-return-create-sheet.tsx` 的行交互样式
    - [x] 已收到你的确认：允许删除销售退货首页当前用于解释“全局退货单入口”的占位卡片/空态块，并在退货抽屉中增加“当前编辑行”的激活态高亮（例如高亮边框、背景、输入容器联动），但不改字段、不改提交逻辑
    - [x] 已完成实施：
      - 已移除销售退货首页未选中源订单时的占位卡片，并在未选中/未加载时不再为右侧保留空占位列
      - 已为退货抽屉当前聚焦输入的行增加明确激活态（整行背景、左侧强调线、输入容器联动高亮）
      - 已为数量大于 0 的已编辑行增加轻量完成态，帮助用户快速回看已录入行
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、目标文件 `eslint` 已通过；`walkthrough.md` 已回写本轮占位卡片删除与方案 D 收口结果

    - [x] 已完成补删：你截图里后续仍显示的并不是右侧空态卡片，而是 `sales-returns-entry-shell.tsx` 顶部残留的“销售退货全局入口”说明 Banner；本轮已将该顶部 Banner 一并移除
    - [x] 已完成回归验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx src/features/trading/sales-returns/components/sales-returns-entry-shell.tsx src/features/trading/sales-returns/components/sales-return-create-sheet.tsx` 已通过

    - [x] 已完成真实源定位：你后续继续截图反馈后，按字面串全仓检索确认，这张仍然存在的卡片真实渲染源并不是前面两个组件，而是 `src/features/trading/sales-returns/components/sales-returns-context-banner.tsx`
    - [x] 已完成最终修复：`SalesReturnsContextBanner` 现已改成**仅在存在客户上下文时才渲染**；全局销售退货入口场景直接 `return null`，因此不会再显示“销售退货全局入口 / 当前查看全部退货单入口”这张说明卡
    - [x] 已完成最终验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/trading/sales-returns/components/sales-returns-context-banner.tsx src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx src/features/trading/sales-returns/components/sales-returns-entry-shell.tsx src/features/trading/sales-returns/components/sales-return-create-sheet.tsx` 已通过

    - [x] 已完成彻底移除：为避免这张卡再被任何条件分支误保留，现已直接从 `src/features/trading/tabs/sales-returns-tab.tsx` 页面树中移除 `SalesReturnsContextBanner` 的 `import` 与 JSX 挂载，当前页面已不存在该卡片的挂载入口
    - [x] 已完成补充验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/trading/tabs/sales-returns-tab.tsx src/features/trading/sales-returns/components/sales-returns-context-banner.tsx src/features/trading/sales-returns/components/sales-return-source-order-spotlight.tsx src/features/trading/sales-returns/components/sales-returns-entry-shell.tsx src/features/trading/sales-returns/components/sales-return-create-sheet.tsx` 已通过

    - [x] 已收到你的新需求：把“执行退货”当前使用的右侧抽屉改成弹窗（modal/dialog）承载，而不是 `Sheet` 侧滑面板
    - [x] 已完成范围预判：这一步仍可保持纯前端收口，不改退货创建 payload / 后端链路 / 校验规则；主要影响创建容器组件、入口组件和弹窗尺寸/滚动/页脚行为
    - [x] 已收到你的确认：允许把 `sales-return-create-sheet.tsx` 从 `Sheet` 改为 `Dialog/Modal` 形态，并同步调整最大宽度、内容滚动、页脚固定与移动端适配，但不改字段、不改创建逻辑
    - [x] 已完成实施：
      - 已将 `SalesReturnCreateSheet` 从右侧 `Sheet` 改为居中 `Dialog`
      - 已保留当前已完成的轻表格样式、已退/可退字段展示、当前编辑行激活态与已编辑行轻完成态
      - 已同步调整弹窗尺寸、高度、内部滚动区与底部操作区布局，避免内容过长时挤出视口
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/trading/sales-returns/components/sales-return-create-sheet.tsx src/features/trading/sales-returns/components/sales-returns-entry-shell.tsx` 已通过；`walkthrough.md` 已回写本轮弹窗化收口结果

    - [x] 已收到你的追加反馈：当前销售退货弹窗宽度仍然不够，内容显示不全；希望参考项目里其他弹窗的宽度/高度写法，避免风格割裂
    - [x] 已完成对比分析：已对照项目内 `warehouse-category.tsx`、`adjustment-history.tsx`、`stocktake-mgmt.tsx` 等 `DialogContent` 写法；现有通用模式多为 `w-[95vw] + sm:max-w-[具体像素] + p-0 + overflow-hidden + rounded-2xl/md:rounded-[32px]`，而销售退货弹窗由于内部明细表存在 `min-w-[1048px]`，属于比普通表单更重的“工作台型弹窗”，不能简单套用小中型弹窗宽度
    - [x] 已收到你的确认：基于已分析出的根因，继续调整销售退货弹窗宽度/高度/内部滚动策略，使其对齐项目 Dialog 视觉风格，但升级为更大的工作台级弹窗，以确保轻表格明细完整显示
    - [x] 已完成实施：
      - 已确认根因不是 `96vw` 本身失效，而是 `DialogContent` 默认 `size='lg'` 注入的 `sm:max-w-lg` 在 `sm` 以上屏幕将弹窗卡死到 `512px`
      - 已在 `sales-return-create-sheet.tsx` 中为销售退货弹窗显式设置 `size='full'`，移除默认 `sm:max-w-lg` 约束影响
      - 已将弹窗尺寸调整为更接近工作台级大弹窗：`w-[calc(100vw-24px)] + max-w-[1440px] + h-[min(94vh,980px)]`
      - 已保留 `p-0 / overflow-hidden / rounded-2xl / md:rounded-[32px]` 的项目 Dialog 风格和当前内部滚动结构
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/trading/sales-returns/components/sales-return-create-sheet.tsx src/features/trading/sales-returns/components/sales-returns-entry-shell.tsx` 已通过；`walkthrough.md` 已回写本轮宽度根因修复结果

    - [x] 已收到你的新需求：希望销售退货弹窗内容更完整，增加图片上传能力，并在手机端优先调起摄像头；同时明确要求复用销售订单创建侧现有的图片上传链路，不要重复造轮子
    - [x] 已完成复用链定位：
      - 销售订单创建当前实际挂载的是 `src/features/sales-document/components/document-evidence-manager.tsx`，调用点在 `src/features/sales-document/components/document-header-fields.tsx`
      - 采购退货侧已有带 `capture='environment'` 的移动端拍照入口实现，位于 `src/features/trading/components/purchase/purchase-return-evidence-manager.tsx`
      - 当前未发现销售订单创建链路中存在浏览器端图片压缩逻辑；现状更像是前端 `10MB` 限制 + 服务端压缩/去重返回
      - 已进一步确认：销售退货创建链前后端当前**已支持 `evidences` 字段**，包括前端 `CreateSalesReturnPayload`、后端 `CreateSalesReturnRequest -> CreateSalesReturnInput` 映射，以及服务层落库 `record.Evidences`
    - [x] 已收到你的确认：允许在不重复造轮子的前提下，为销售退货弹窗接入一套**复用现有单据图片上传链路**的证据区，并补上移动端拍照入口；图片证据将随销售退货创建 payload 一并提交
    - [x] 已完成实施：
      - 已扩展 `DocumentEvidenceManager`，支持可选移动端拍照入口、可配置文案，并保持销售订单现有上传/排序/备注行为兼容
      - 已在销售退货弹窗中接入 `evidences` 证据区，支持普通上传与 `capture='environment'` 的手机拍照入口
      - 已将 `evidences` 接入现有销售退货创建 payload，不额外新增上传协议
      - 已补充销售退货证据区中英文文案，保持销售退货场景文案语义独立
    - [x] 已完成验证：`cmd /c pnpm exec tsc --noEmit --pretty false`、`eslint --no-warn-ignored src/features/sales-document/components/document-evidence-manager.tsx src/features/trading/sales-returns/components/sales-return-create-sheet.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts` 已通过；`walkthrough.md` 已回写本轮复用上传链与拍照入口接入结果

    - [x] 已完成业务分析：当前销售退货的 `returnNo` 已由系统自动生成，不应让用户手填；真正需要后补录的是客户发货后的物流/快递单号，而当前销售退货链路尚无 `trackingNo / carrier / transportMode` 等字段
    - [x] 已完成模型定稿：基于“软件尚未上线，不保留兼容双路”的原则，本轮规划采用**完整版单路模型**：
      - `returnNo` 继续作为系统自动生成的退货单主编号
      - 新增单一权威运输模型：`transportMode / trackingNo / carrier / shippedAt / trackingFilledAt / trackingFilledBy / logisticsNote`
      - 不新增第二套兼容字段，不保留旧语义兜底，不做前端影子状态持久化
      - “待补物流单号”改为派生提醒条件，而不是再存一套并行状态
      - 现有创建即 `Completed` 的语义需被替换为更符合真实退货过程的主状态流
    - [ ] 待你确认本轮实施范围：允许按**完整版单路方案**重构销售退货数据模型与交互，不做兼容双路，直接以未上线版本的最终业务模型为准
    - [ ] 待你确认后再实施：
      - 统一销售退货主状态流为单路生命周期，例如：`Created -> InTransit -> Received -> Closed / Canceled`
      - 创建退货单时由系统生成 `returnNo`，用户只选择运输方式；若为快递退货可先不填 `trackingNo`
      - 增加物流补录入口（详情页 / 列表操作 / 创建成功弱提示），用权威字段补录 `trackingNo` 等信息
      - 用派生规则计算“待补物流单号”：仅当 `transportMode = courier` 且 `trackingNo` 为空时触发提醒
      - 删除当前“创建即 Completed”的旧业务语义，避免数据链混乱
    - [ ] 待完成验证：待本轮完成后，执行 `tsc / eslint / go test` 定向校验并回写 `walkthrough.md`

    - [x] 已收到你对销售退货创建弹窗的新交互要求：当前“整单全部商品直接展开、逐行填数量”的方式不符合实际操作直觉；你希望改成**从客户订单商品中按 `+` 逐个加入退货商品行**，再在已加入清单中填写退货数量，而不是依赖“全部带入 / 全部退满”这类批量语义。
    - [x] 已完成实施：
      - 创建弹窗已改为“可选订单商品池 + 已加入退货清单”双区结构。
      - 订单商品不再默认直接进入退货清单，需由用户点击 `+` 显式加入。
      - 已加入的退货商品行支持移除，并仅在该清单中填写退货数量。
      - 当前“全部带入 / 全部退满 / 全部清零”相关批量操作与文案已下线并改为新清单语义。
      - 提交 payload 继续保持只提交已加入且数量大于 0 的行，未改后端销售退货单路模型。
    - [x] 已完成验证：`pnpm exec eslint src/features/trading/sales-returns/components/sales-return-create-sheet.tsx src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts src/features/sales-document/components/document-evidence-manager.tsx`、`pnpm exec tsc --noEmit --pretty false` 已通过；`walkthrough.md` 已回写本轮交互重构结果



    - [x] 已完成销售退货创建链路回溯审计：已从入口壳层、来源订单查询、创建弹窗状态、创建 mutation、service / DTO 与查询失效链路核对职责分工，确认当前不存在“提交错行 / 创建后来源订单不刷新 / 从列表发起时拿到空明细”等致命断链。
    - [x] 已完成问题收口：本轮修复规划先聚焦 3 个点，不扩大到新的销售退货主状态流改造：
      - `issueCategory` 当前以下拉 `name` 作为提交值，稳定性不足；建议收口为字典 `code` 作为权威值，展示层再映射回 `name`。
      - `selectedLineIds` 已承担“已加入退货行”真相，但 `lineDrafts` 仍保留“为全部订单行预建草稿”的旧模型残影；建议改为只为已加入行懒初始化，并在移除时直接删除对应草稿。
      - 顶部统计当前更接近“已加入行数”而非“有效提交行数”；建议显式澄清统计语义，避免 UI 文案与提交校验口径错位。
    - [ ] 待你确认本轮实施范围：允许按**单路稳定值 + 单一前端真相状态**修复销售退货创建弹窗，不做兼容双写，不顺带扩大到列表页/详情页的大改造。
    - [ ] 待你确认后再实施：
      - 将创建弹窗中的 `issueCategory` 选择值改为字典 `code`，提交时不再发送展示名。
      - 如展示侧仍需中文名称，则统一通过字典项 `code -> name` 映射渲染，而不是把 `name` 当持久值。
      - 将 `selectedLineIds` 收口为已加入退货行的唯一真相来源；`lineDrafts` 仅在加入时创建、移除时删除，不再为未加入商品预占状态位。
      - 将顶部统计/文案显式表达为“已加入退货商品数”或等价语义，提交阻断继续按“已加入且数量大于 0 的有效退货行”判断。
      - 保持现有 payload 规则：只提交已加入且数量大于 0 的行，不改变后端行项目提交边界。
    - [ ] 待完成验证：
      - 前端执行 `pnpm exec tsc --noEmit --pretty false`
      - 前端执行定向 `eslint`
      - 若本轮最终确认需要联动服务端一并收口 `issueCategory` 契约，再补 `go test` / 定向编译验证，并将结果回写 `walkthrough.md`


## 2026-04-20 订单结算方式收口：直接删除两个预付内置项（待确认）

- [ ] 阶段一：审计当前链路
  - 预期结果：确认财务中心 `payment terms` 字典中的系统内置项与当前下拉来源关系。
  - 已确认要点：
    - 财务中心 `payment terms` 为独立字典，订单相关下拉自动读取该字典。
    - 你已明确要求：直接删除两个预付内置项，避免业务继续误用精确比例语义。

- [ ] 阶段二：按最小范围收口结算方式语义
  - 预期结果：财务中心结算方式字典中不再存在这两个预付内置项。
  - 拟执行内容：
    - 财务中心结算方式字典中，直接删除“预付 100% / 预付 30% 尾款 70%”这两个预付内置项，不再保留为系统选项。
    - 其它仍带比例/分期语义的结算项（如 `30-60-10`）暂不在本轮一并扩大处理，先聚焦你明确点名的两个预付内置项。

- [ ] 阶段三：永久移除语义校验
  - 预期结果：这两个预付内置项在系统默认结算方式中永久不存在。
  - 重点关注：
    - 默认结算方式补种链不再重新写回 `PREPAY100` 与 `PREPAY30_BAL70`。
    - 本轮只做“删选项”，不顺带引入新的预付字段或计算逻辑。

- [ ] 待确认项
  - 是否按最小方案先只处理结算方式字典本身，不额外扩展其它结算方式项。
  - 你确认方案后，我再进入业务代码修改；在此之前不改动业务实现。


## 2026-04-20 收款登记职责收口：先完善应收侧（已完成）

- [x] 阶段一：确认职责归属
  - 预期结果：收款详细录入统一归属到应收台账，不在销售订单列表卡片/详情头部混入完整财务表单。
  - 已确认要点：
    - 销售订单列表与详情当前承载的是业务单据动作，如新增、编辑、删除、状态流转、打印与审计轨迹。
    - 应收侧已经存在 `SalesReceivableDetailDialog` -> `SettlementLedgerDetailDialog` -> `POST /receivables/:id/receipts` 这条收款登记主链。

- [x] 阶段二：补齐应收侧收款详细字段
  - 预期结果：应收详情中的收款登记可以完整承载财务录入，而不是只有简化字段。
  - 拟执行内容：
    - 以应收侧为唯一入口补齐收款详细字段，例如收款日期/时间、收款账号、收款方式、参考流水号、凭证截图等。
    - 前后端同步扩展 `ReceiptRecord` 模型、DTO、请求契约、详情响应与登记表单。
    - 保持销售订单侧不新增完整财务录入表单，避免订单管理与财务登记职责混杂。

- [x] 阶段三：订单侧只保留轻量能力
  - 预期结果：本轮即为订单侧补“查看应收 / 登记收款”轻入口，但不直接承载详细收款录入。
  - 重点关注：
    - 不把收款账号、收款日期、凭证上传等字段塞进销售订单列表卡片。
    - 收款凭证归属到收款记录本身，而不是订单附件语义。
    - 订单侧轻入口只负责跳转到对应应收或打开应收登记入口，不新增第二套财务表单。

- [x] 待确认后执行的验证建议
  - 前端静态校验：`pnpm exec tsc --noEmit --pretty false`
  - 前端定向 lint：按最终改动文件执行 `pnpm exec eslint`
  - 服务端定向验证：`go test ./services ./handlers`
  - 手工回归重点：
    - 应收详情内新增收款字段的录入、回显与提交
    - 收款凭证上传后在记录历史中可见
    - 销售订单列表/详情不新增重复财务表单
- [x] 待确认项
  - 是否按最小方案先只完善“应收详情中的收款登记”，不同时扩展应付侧。
  - 订单侧本轮已确认补轻入口，但不补完整财务录入表单；若你确认，我就按这个边界执行。
  - 你确认方案后，我再进入业务代码修改；在此之前不改动业务实现。

## 2026-04-20 应收事实源重构：订单即应收（已完成）

- [x] 阶段一：确立唯一事实源
  - 预期结果：明确 `sales_orders` 是应收唯一事实源，应收页不再以 `receivable_ledgers` 作为主真相。
  - 已完成结果：
    - 销售订单权威写入口在 `server/services/sales_order_command_service.go` 与 `server/services/sales_transaction_service.go`。
    - 销售订单状态权威重算在 `server/services/sales_fulfillment_service.go`。
    - 当前 `/trading/receivables` 只读取 `receivable_ledgers`，导致“订单存在但应收为空”的双真相漂移问题。

- [x] 阶段二：把应收查询主链改为直接读订单聚合
  - 预期结果：`/receivables` 后端不再先查 `receivable_ledgers`，而是直接基于销售订单聚合出应收视图。
  - 已完成结果：
    - 新增 `server/services/sales_order_receivable_service.go`，把应收列表、搜索、详情统一切到 `sales_orders` 聚合。
    - 以销售订单金额、状态、客户、币种、订单日期为主数据来源计算应收列表/详情字段。
    - 应收页与订单页共享同一份订单真相，订单变更后应收视图跟随变化。

- [x] 阶段三：重做收款记录归属关系
  - 预期结果：收款记录不再依赖 `ledger_id` 作为主关联键，而是直接挂到销售订单或统一结算主体上。
  - 已完成结果：
    - `server/models/ar_ap_ledger.go` 为 `receipt_records`、`settlement_allocations` 增加 `sales_order_id` 字段。
    - 新建收款记录与分摊记录时直接写入订单级归属，为后续删除 `ledger_id` 兼容链打基础。
    - 应收详情打开主键已切回订单聚合 ID，下一阶段将移除旧台账 ID fallback。

- [x] 阶段四：退役或降级 `receivable_ledgers`
  - 预期结果：`receivable_ledgers` 不再承担应收主真相职责。
  - 已完成结果：
    - `receivable_ledgers` 已从应收主查询链退出。
    - 旧应收台账模型、自动迁移和测试夹具已同步清理，不再保留兼容辅助层。

- [x] 阶段五：删除旧 `ledger` 兼容链并完成单一事实源收口
  - 预期结果：系统内不再保留 `ledger_id` fallback、旧 `receivable_ledgers` 兼容读取或按旧台账 ID 打开详情的双轨逻辑。
  - 已完成结果：
    - 删除后端基于 `ledger_id` 的 fallback 映射、旧 `receivable_ledgers` helper、`SourceDocumentNo` 查询入口与旧表自动迁移。
    - 删除前端 `sourceDocumentNo` 兜底过滤，并将应收页本地详情打开状态收口为订单主键语义。
    - 更新测试夹具与定向验证，仅保留订单主链数据模型，不再维护旧台账测试数据。
  - 风险提示：
    - 因本项目当前不保留旧历史数据，删除兼容链后，任何仍停留在旧结构中的本地/测试数据都视为无效数据，需要按订单主链重新准备。
    - 若仍有其它模块偷偷依赖 `receivable_ledgers` 或 `ledger_id`，本阶段会直接暴露编译/测试失败，需要一并清理。

## 2026-04-20 应收板块拆分治理（规划中）

- [x] 阶段一：识别高耦合文件与拆分优先级
  - 预期结果：明确应收板块中最容易继续膨胀的前后端文件，并形成先后拆分顺序。
  - 已完成结果：
    - 已确认后端首要拆分对象为 `server/services/sales_order_receivable_service.go`，其当前同时承载列表、搜索、详情、收款创建、状态推导、金额计算与映射职责。
    - 已确认前端首要拆分对象为 `src/features/trading/components/settlement-ledger-detail-dialog.tsx` 与 `src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts`，其当前承载弹窗编排、查询、派生、提交与搜索过滤等多重职责。
    - 已确认第二梯队拆分对象为 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx`、`server/handlers/ar_ap_handlers.go`、`src/features/trading/query-keys.ts`。

- [ ] 阶段二：第一批结构拆分（高收益主链）
  - 预期结果：在不改变业务语义的前提下，拆分最容易膨胀的核心文件，为后续新增字段、统计和核销动作预留稳定边界。
  - 待执行内容：
    - 后端将 `sales_order_receivable_service.go` 拆成列表、详情、收款、mapper、policy/calculator 等职责文件。
    - 前端将 `settlement-ledger-detail-dialog.tsx` 收口为更薄的容器层，并拆出内容编排/搜索筛选/底部提交等子组件。
    - 前端将 `use-settlement-ledger-detail-dialog-view-model.ts` 拆成搜索、历史、汇总、提交等更聚焦的 hooks。

- [ ] 阶段三：第二批结构拆分（页面与入口层）
  - 预期结果：页面容器、接口入口与缓存键管理分层，避免后续功能继续堆进页面文件或全局 trading 入口。
  - 待执行内容：
    - 拆分 `sales-receivables-tab.tsx` 的 summary、表格与页面状态管理。
    - 拆分 `ar_ap_handlers.go` 的 receivable / payable / settlement handler 文件。
    - 将应收 query keys 从 `src/features/trading/query-keys.ts` 中独立出来。

- [ ] 阶段四：命名与契约收口
  - 预期结果：在结构拆分完成后，逐步收口前端/DTO 中仍保留的 `Ledger` 历史命名，避免语义继续漂移。
  - 待执行内容：
    - 评估 `ReceivableLedger*` 类型别名、服务名、hook 名中的历史命名是否需要拆批次统一。
    - 保持 API 契约稳定的前提下，优先收口本地展示模型和内部实现命名。

- [ ] 阶段五：验证与总结
  - 预期结果：结构拆分完成后，关键链路验证通过，并在 `walkthrough.md` 中记录本轮拆分结果与风险说明。
  - 待执行内容：
    - 进行应收相关前后端定向测试与编译校验。
    - 更新 `walkthrough.md` 记录拆分后的文件边界、验证结果与剩余待办。

- [ ] 待确认项
  - 是否确认本轮第一批只做结构拆分，不同时引入新字段、新动作或新业务规则。
  - 是否确认第一批优先拆分 `sales_order_receivable_service.go`、`settlement-ledger-detail-dialog.tsx`、`use-settlement-ledger-detail-dialog-view-model.ts`。
  - 你确认后，我再进入第一批拆分实施。

- [ ] 补充任务：应收详情弹窗 view-model / 容器层前端测试
  - 预期结果：为第一批拆分后的 `view-model` 与薄容器补齐更稳定的前端测试护栏，确保后续继续拆分时能及时发现编排层回归。
  - 待执行内容：
    - 盘点并复用现有 `use-settlement-ledger-detail-dialog-view-model.test.tsx` 与 `settlement-ledger-detail-dialog.test.tsx`，避免重复创建并行测试入口。
    - 为 `view-model` 增补“编排层委派”断言，覆盖搜索、历史、汇总、提交四类子 hook 的结果透传与配置拼装。
    - 为容器层增补“薄容器连线”断言，覆盖 body / footer / search container 的 props 透传、`recordType` 对 `showDetailedFields` 的影响、`allocationHistory.length` 透传，以及提交禁用态联动。
    - 如有必要，补充轻量测试夹具或 mock helper，但不改动业务实现。

- [ ] 本轮测试任务验证与总结
  - 预期结果：新增测试通过，并在 `walkthrough.md` 中记录覆盖范围、验证命令与剩余测试空白。
  - 待执行内容：
    - 执行目标测试文件的 `vitest` 定向校验。
    - 执行本次测试相关文件的 `eslint` 与 `tsc --noEmit` 校验。
    - 如存在可复用测试入口，则补做与应收页打开详情相关的定向验证；若本轮仅做纯结构搬运且无现成入口，则至少完成页面级手工链路自检说明。
    - 更新 `walkthrough.md` 记录本轮测试补强结果。

- [ ] 本轮测试任务待确认项
  - 是否确认本轮先补 `view-model` 与容器层测试，不同步扩散到 `body/footer/search container` 各子组件的独立测试文件。
  - 是否确认优先扩展现有两个测试文件，而不是新建更多测试入口。
  - 你确认后，我再进入测试代码实施。

- [ ] 补充任务：第二批结构拆分起步（`sales-receivables-tab.tsx`）
  - 预期结果：将应收页当前聚合在单文件中的页面壳、摘要区、表格区和自动打开状态编排拆开，为后续新增筛选、批量动作和更多统计卡片预留稳定边界。
  - 待执行内容：
    - 盘点 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx` 当前承载的职责，明确页面容器、查询参数收口、自动打开逻辑、摘要渲染与表格渲染的拆分边界。
    - 优先将摘要卡片区与表格区拆成独立组件，保持现有 UI 文案、点击打开详情和路由联动语义不变。
    - 评估并视情况将 `selectedReceivableId / dismissedAutoOpenKey / autoOpenReceivableId / activeReceivableId` 相关页面状态收口到独立 hook 或更清晰的页面级 helper。
    - 保持 `SalesReceivableDetailDialog` 的打开/关闭契约不变，不在本轮引入新筛选条件、新接口调用或新业务规则。

- [ ] 本轮 `sales-receivables-tab.tsx` 拆分验证与总结
  - 预期结果：拆分后应收页主链路行为保持一致，并在 `walkthrough.md` 中记录新的文件边界与验证结果。
  - 待执行内容：
    - 执行目标文件及新拆出文件的 `eslint` 校验。
    - 执行 `pnpm exec tsc --noEmit --pretty false` 校验前端类型契约未漂移。
    - 如存在可复用测试入口，则补做与应收页打开详情相关的定向验证；若本轮仅做纯结构搬运且无现成入口，则至少完成页面级手工链路自检说明。
    - 更新 `walkthrough.md` 记录本轮拆分结果、验证命令与剩余第二批待办。

- [ ] 本轮 `sales-receivables-tab.tsx` 拆分待确认项
  - 是否确认第二批先从 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx` 开始，而不是同时并行推进 `ar_ap_handlers.go` 或 `query-keys.ts`。
  - 是否确认本轮优先拆页面壳 / 摘要区 / 表格区 / 自动打开状态边界，不顺手加入筛选栏、分页、批量操作等新能力。
  - 你确认后，我再进入这一文件的代码拆分实施。

- [ ] 补充任务：第二批结构拆分下一步（`src/features/trading/query-keys.ts`）
  - 预期结果：将当前混放在全局 `tradingQueryKeys` 中的应收 query keys 独立出来，降低应收链路继续拆分时对全局 trading 入口的耦合。
  - 待执行内容：
    - 盘点 `receivableList / receivableSearch / receivableDetail / receivables` 四个 key 的消费点，明确迁移范围仅限应收前端链路。
    - 新增应收专用 query keys 文件，并让 `use-receivables.ts`、`use-receivable-ledger-detail.ts` 等消费侧切到新入口。
    - 保持 key 结构和值语义不变，只调整组织位置与导出边界，避免影响现有缓存行为。
    - 暂不处理 `payables` 或其它 trading keys 的拆分，避免本轮范围外扩。

- [ ] 本轮 `query-keys.ts` 拆分验证与总结
  - 预期结果：应收 query keys 独立后，相关 hooks/mutation 的缓存读写与失效行为保持不变，并在 `walkthrough.md` 记录结果。
  - 待执行内容：
    - 执行目标文件及迁移文件的 `eslint` 校验。
    - 执行 `pnpm exec tsc --noEmit --pretty false` 校验类型契约未漂移。
    - 如存在定向测试入口，则补做应收 hooks / mutation 的 key 使用验证；若本轮仅为导出边界重组，则至少完成目标消费点巡检说明。
    - 更新 `walkthrough.md` 记录本轮拆分结果、验证命令与后续 `ar_ap_handlers.go` 待办。

- [ ] 本轮 `query-keys.ts` 拆分待确认项
  - 是否确认第二批下一步优先拆 `src/features/trading/query-keys.ts` 的应收部分，而不是直接进入 `server/handlers/ar_ap_handlers.go`。
  - 是否确认本轮只迁移应收 query keys，不顺手扩散到 payables、sales orders、sales returns 等其它 key 分组。
  - 你确认后，我再进入这一文件/模块的代码拆分实施。

- [ ] 补充任务：第二批后端入口拆分（`server/handlers/ar_ap_handlers.go`）
  - 预期结果：将当前混放在单文件中的应收列表/搜索/详情、应付列表/搜索/详情、收款登记、付款登记 handlers 按职责拆开，保留现有导出函数名、路由注册与 HTTP 语义不变。
  - 待执行内容：
    - 盘点 `GetReceivableLedgersHandler`、`SearchReceivableLedgersHandler`、`GetReceivableLedgerHandler`、`CreateReceiptRecordHandler`、`GetPayableLedgersHandler`、`SearchPayableLedgersHandler`、`GetPayableLedgerHandler`、`CreatePaymentRecordHandler` 的职责边界与共享逻辑。
    - 优先按“应收 handlers / 应付 handlers / 结算记录 handlers / 共享 helper”拆分，而不是继续把全部入口堆在一个文件里。
    - 保持 `server/routes/routes_ar_ap.go` 中现有 handler 名称与注册方式不变，避免本轮引入路由层联动改名。
    - 如有必要，抽取共享 query 构造或错误映射 helper，但不改动返回状态码、错误文案和服务层调用参数。

- [ ] 本轮 `ar_ap_handlers.go` 拆分验证与总结
  - 预期结果：拆分后路由入口、JSON 契约和错误映射保持一致，并在 `walkthrough.md` 中记录新的 handler 文件边界与验证结果。
  - 待执行内容：
    - 执行目标 handlers 文件与路由文件的 `go test ./handlers -run "Receivable|Payable|Receipt|Payment"` 或等效定向校验。
    - 执行受影响 Go 文件的格式化/编译校验，确认拆分后导入与符号引用正常。
    - 巡检 `server/routes/routes_ar_ap.go`，确认仍引用原导出 handler 名称。
    - 更新 `walkthrough.md` 记录本轮拆分结果、验证命令与剩余第二批待办。

- [ ] 本轮 `ar_ap_handlers.go` 拆分待确认项
  - 是否确认本轮先只拆 `server/handlers/ar_ap_handlers.go`，不同时扩散到 `routes_ar_ap.go` 以外的更多后端入口文件。
  - 是否确认本轮保持现有导出函数名、路由注册写法、状态码和中文错误文案不变，只做文件与 helper 级重组。
  - 你确认后，我再进入这一文件的代码拆分实施。

- [ ] 补充任务：既有测试契约收口（修 `TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract`）
  - 预期结果：让付款创建返回契约测试与真实 `PaymentRecordResponse` 对齐，避免共享断言 helper 把收款专属字段错误施加到付款返回结构上。
  - 待执行内容：
    - 盘点 `requireSettlementRecordJSONContract` 与 `PaymentRecordResponse` / `ReceiptRecordResponse` 的字段差异，确认问题根因是共享测试 helper 过宽，而不是支付创建业务实现异常。
    - 将收款记录与付款记录的 JSON 契约断言拆开，或改造为可配置 helper，确保付款侧不再强制要求 `receivedAt / receiptAccount`。
    - 保持现有业务实现、handler 返回 payload 与 DTO 定义不变，本轮优先修测试契约而不是改支付链路响应。
    - 回归 `TestCreateReceiptRecordHandlerReturnsLockedCreateResponseContract` 与 `TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract`，确保两侧契约都被正确覆盖。

- [ ] 本轮既有测试契约收口验证与总结
  - 预期结果：付款创建返回契约测试恢复通过，且收款侧契约断言不被误伤，并在 `walkthrough.md` 中记录根因与修复结果。
  - 待执行内容：
    - 执行 `go test ./handlers -run "CreateReceiptRecordHandlerReturnsLockedCreateResponseContract|CreatePaymentRecordHandlerReturnsLockedCreateResponseContract" -count=1`。
    - 如有必要，补执行 `go test ./handlers -run "Receipt|Payment" -count=1` 做相邻链路回归。
    - 更新 `walkthrough.md` 记录本轮测试契约收口结果与验证命令。

- [ ] 本轮既有测试契约收口待确认项
  - 是否确认本轮优先修测试 helper / 测试断言，不改 `PaymentRecordResponse` 或付款创建返回 payload。
  - 是否确认收口方向是“收款契约断言”和“付款契约断言”分离，而不是继续沿用一个覆盖两者的共享 helper。
  - 你确认后，我再进入测试代码修改阶段。

- [ ] 补充任务：修复 `action-permission-catalog.ts` 构建错误
  - 预期结果：修复 `src/features/authz/data/action-permission-catalog.ts` 中同文件内多处损坏的字符串常量，恢复 Vite/SWC 可正常解析该权限目录文件，并清掉该文件内已定位到的编码污染条目。
  - 待执行内容：
    - 基于当前巡检结果，处理 `action-permission-catalog.ts` 内已出现替代字符 `�` 的受损条目，而不扩散到其它 authz 文件。
    - 修复受损字符串，保持 `id`、`category`、`parentId` 等权限结构字段不变。
    - 统一恢复同文件内受损的 `label / desc / routeBindings` 文本，避免只修第一处后被下一处同类语法错误继续阻塞。
    - 本轮只修静态目录文本与语法问题，不改权限判定逻辑、路由绑定语义或权限层级结构。

- [ ] 本轮 `action-permission-catalog.ts` 修复验证与总结
  - 预期结果：目标文件恢复可编译，并在 `walkthrough.md` 中记录根因、修复范围与验证结果。
  - 待执行内容：
    - 执行目标文件相关的 `eslint` 或最小构建校验。
    - 执行 `pnpm exec tsc --noEmit --pretty false` 或等效前端编译校验，确认不再出现未闭合字符串。
    - 更新 `walkthrough.md` 记录本轮修复结果与验证命令。

- [ ] 本轮 `action-permission-catalog.ts` 修复待确认项
  - 是否确认本轮扩大为“同文件内多处受损文本收口”，但仍只处理 `action-permission-catalog.ts`，不扩散到 authz 其它目录文件。
  - 是否确认优先按“恢复正确中文文案 + 保持现有权限 ID/结构不变”的方向修复，而不是做全文件语义改写。
  - 你确认后，我再进入代码修改阶段。

- [ ] 补充任务：排查其它高风险目录是否存在同类文本污染
  - 预期结果：基于已修复的 `authz` 目录问题，继续对前端中高风险目录做只读巡检，确认是否还存在类似的编码污染、mojibake 或受损中文文案。
  - 待执行内容：
    - 优先排查 `src/features/trading`，原因是该目录已有 `copy-encoding-checklist.md` 与 `copy-encoding-guard.test.ts`，且历史上出现过文案乱码修复记录。
    - 第二优先排查 `src/features/scan-platform`，重点关注 `registry / catalog` 类文件中的静态中文标签与说明文案。
    - 第三优先排查 `src/features/org-personnel`，重点关注导入、弹窗、表格列定义等包含较多中文文案的组件与配置。
    - 如前述目录未发现问题，再决定是否扩大到 `src/data/seed` 等包含静态文本或种子数据的目录。
    - 本轮先做只读巡检和风险收敛，不直接批量改文案，不改业务逻辑。

- [ ] 本轮高风险目录文本污染排查验证与总结
  - 预期结果：形成明确的“已排查目录 / 发现文件 / 无问题目录”结论，并在 `walkthrough.md` 记录扫描方法与结果。
  - 待执行内容：
    - 对目标目录执行严格 UTF-8 解码检查、替代字符 `�` 检查，以及常见 mojibake 片段扫描。
    - 若发现可疑文件，记录文件路径、可疑片段类型和是否需要进入修复阶段。
    - 若未发现问题，也要记录已覆盖目录与扫描方法，避免后续重复排查。
    - 更新 `walkthrough.md` 记录本轮排查结果。

- [ ] 本轮高风险目录文本污染排查待确认项
  - 是否确认本轮先按“`trading` → `scan-platform` → `org-personnel` → 视结果再决定是否扩到 `src/data/seed`”的顺序排查。
 - 是否确认本轮先只做只读扫描与问题定位，不在未单独确认的情况下直接改动这些目录中的业务文件。
 - 你确认后，我再进入目录扫描阶段。

- [ ] 补充任务：收窄快捷扫描侧边栏卡片内容密度
  - 预期结果：将快捷扫描侧边栏中的每个快捷卡片从“标题 + 简短描述”调整为仅展示标题，减少移动端侧边栏被少量卡片占满的问题。
  - 待执行内容：
    - 定位快捷扫描侧边栏卡片列表的渲染组件，确认标题与简短描述的输出位置。
    - 仅移除卡片级简短描述的渲染，保留卡片标题、图标、跳转/触发行为、安装按钮和抽屉整体结构不变。
    - 不改快捷动作权限过滤、不改卡片排序、不改点击行为。
    - 先不清理 `quick-action-registry` 或多语言文案中的 `description` 字段，避免把本轮最小 UI 收窄变更扩大成数据结构调整。

- [ ] 本轮快捷扫描侧边栏收窄验证与总结
  - 预期结果：快捷扫描抽屉在桌面端与移动端都能正常渲染，卡片仅保留标题，布局未被破坏。
  - 待执行内容：
    - 执行目标文件相关的 `eslint` 校验。
    - 如有必要，补执行最小前端类型检查，确认未引入 TS 错误。
    - 更新 `walkthrough.md` 记录本轮 UI 收窄点与验证结果。

- [ ] 本轮快捷扫描侧边栏收窄待确认项
  - 是否确认本轮只去掉每个快捷卡片的简短描述，不处理抽屉头部的说明文案。
  - 是否确认本轮按最小变更处理：只改渲染层，不顺手删 `descriptionKey` 或国际化文案字段。
  - 你确认后，我再进入 UI 修改阶段。

- [ ] 补充任务：进一步压缩快捷扫描指令卡片高度
  - 预期结果：在已去掉卡片描述的基础上，继续将每个快捷扫描指令卡片的纵向高度再收窄一些，提升同屏可见卡片数，尤其改善移动端抽屉的空间占用。
  - 待执行内容：
    - 仅调整 `src/features/quick-actions/components/quick-action-drawer.tsx` 中卡片相关的间距与尺寸 class。
    - 优先考虑收窄外层卡片纵向内边距、卡片内部横向/纵向 gap，以及图标容器尺寸。
    - 保持标题可读性、按钮可点击性与整体触控体验，不做过度压缩。
    - 不改卡片标题文案、不改安装按钮逻辑、不改跳转/拍照/录像行为。

- [ ] 本轮快捷扫描卡片高度压缩验证与总结
  - 预期结果：快捷扫描抽屉中的卡片高度较当前版本更紧凑，但视觉层级和可点击性仍然正常。
  - 待执行内容：
    - 执行目标文件相关的 `eslint` 校验。
    - 如有必要，补执行最小前端类型检查，确认未引入 TS 错误。
    - 更新 `walkthrough.md` 记录本轮卡片高度收窄点与验证结果。

- [ ] 本轮快捷扫描卡片高度压缩待确认项
  - 是否确认本轮按“小幅收窄”处理：只调整卡片内边距、gap 和图标容器尺寸，不再动抽屉宽度或头部区域。
  - 是否确认本轮保持安装按钮可点击尺寸，不为了继续压缩高度而把按钮缩得过小。
  - 你确认后，我再进入 UI 修改阶段。

- [ ] 排查订单分析页 `/trading/orders-analysis` 的 500 错误
  - 预期结果：定位 `OrdersAnalysisTab` 中 `analytics.map is not a function` 的根因，明确是前端消费方式与接口契约不一致，还是后端返回异常，并给出最小修复路径。
  - 待执行内容：
    - 定位 `src/features/trading/sales/analytics/tabs/analytics-tab.tsx` 中 `analytics` 的使用位置。
    - 追踪 `useSalesAnalytics` -> `SalesAnalyticsService` -> `sales-query-service` -> 后端 handler 的完整数据流。
    - 确认 `/sales-orders/analytics/customer-product-stats` 与 `/sales-orders/analytics/global-product-ranking` 的实际响应结构。
    - 判断是否存在“前端把对象包裹响应当作数组使用”的契约错配。

- [ ] 形成订单分析页 500 的最小修复方案
  - 预期结果：在不扩散到整个 trading 模块的前提下，给出只修复订单分析页相关查询/适配层的最小方案。
  - 待执行内容：
    - 优先考虑在 `sales-query-service` / `analytics-service` 增加正确的数组字段提取与类型约束。
    - 保持 `analytics-tab.tsx` 继续消费稳定的数组结构，避免在渲染层散落兼容判断。
    - 不顺手改订单分析页的视觉样式或 unrelated 业务逻辑。

- [ ] 本轮订单分析页 500 验证与总结
  - 预期结果：修复后订单分析页不再因为 `map` / `reduce` 访问失败而触发错误边界，相关接口契约在前端被正确消费。
  - 待执行内容：
    - 执行目标文件相关的 `eslint` 校验。
    - 如有必要，补执行最小前端类型检查。
    - 更新 `walkthrough.md` 记录根因、修复点与验证结果。

- [ ] 本轮订单分析页 500 待确认项
  - 是否确认本轮按最小修复处理：只修正订单分析页相关 analytics 查询结果的解包/适配逻辑，不扩大到其它 trading 查询服务重构。
  - 是否确认优先在服务层统一把响应中的 `items` 提取成数组，而不是在 `analytics-tab.tsx` 临时加 `Array.isArray` 防御式补丁。
  - 你确认后，我再进入代码修复阶段。

- [ ] 评估订单分析从 `Trading` 顶部 tab 抽离为销售管理下独立菜单模块
  - 预期结果：明确订单分析是否应从现有 `/trading/orders-analysis` 顶部 tab 中抽离，改为销售管理分组下与“发货管理”同级的独立菜单入口，并为后续扩展详细分析预留结构。
  - 待执行内容：
    - 盘点当前 `Trading` 模块顶部 tab 结构、`orders-analysis` 路由挂载方式，以及 `shipping-management` 独立模块的组织方式。
    - 盘点主侧边栏销售管理分组的数据源与权限路径映射。
    - 对比“继续留在 Trading 顶部 tab”与“升级为独立分析模块”两种方案的扩展性、导航清晰度与改动范围。

- [ ] 形成订单分析独立模块的推荐方案
  - 预期结果：给出一个面向后续详细分析扩展的推荐结构，而不是只为当前页面做菜单搬家。
  - 待执行内容：
    - 优先评估“独立菜单模块 + 模块内自有 tabs”的结构，首个 tab 为订单分析，后续可扩展客户分析、产品分析、趋势分析等。
    - 明确新模块是否继续复用 `menu_trading` 权限，而不是立即拆新权限树。
    - 明确需要调整的层：侧边栏、路由、模块壳、搜索入口、多语言、路径权限映射。

- [ ] 本轮订单分析抽离方案待确认项
  - 是否确认推荐方向为：在“销售管理”分组下新增一个与“发货管理”同级的独立菜单入口，作为分析模块外壳，而不是继续塞在 `/trading` 顶部 tab 里。
  - 是否确认新模块命名优先考虑“销售分析/经营分析”这类可扩展名称，模块内第一个 tab 再落为“订单分析”，以适配后续详细分析升级。
  - 你确认后，我再进入结构改造的代码实施阶段。

- [ ] 清理订单分析旧兼容路径与遗留双入口
  - 预期结果：系统内只保留 `/sales-analysis/orders-analysis` 作为唯一有效入口，不再保留 `/trading/orders-analysis` 的兼容跳转或其它双路径并存的歧义实现。
  - 待执行内容：
    - 删除旧 `src/routes/_authenticated/trading/orders-analysis.tsx` 与其 lazy 路由文件，移除旧路由定义。
    - 清理代码中残留的 `/trading/orders-analysis` 旧路径引用，确保导航、搜索、权限与路由生成结果只指向新路径。
    - 不保留任何“暂时兼容”“过渡跳转”逻辑，避免未上线系统提前积累歧义路径。

- [ ] 本轮销售分析模块清理验证与总结
  - 预期结果：旧订单分析路径被彻底移除，路由树、认证路由清单与权限生成结果仅保留新销售分析路径，前端编译与静态检查通过。
  - 待执行内容：
    - 执行路由/权限相关生成脚本，刷新自动生成文件。
    - 执行目标文件相关的 `eslint` 校验。
    - 执行 `pnpm exec tsc --noEmit --pretty false`。
    - 更新 `walkthrough.md` 记录删除旧兼容路径的原因、范围与验证结果。

- [ ] 本轮销售分析模块清理待确认项
  - 是否确认本轮直接删除旧 `/trading/orders-analysis` 路由文件及其所有兼容跳转，不保留任何 fallback。
  - 是否确认若存在外部旧链接失效风险，也不在当前未上线阶段保留兼容层，而是统一以新路径为准。
  - 你确认后，我再进入代码清理阶段。

- [ ] 评估“原材料管理”是否应抽为资源管理下独立菜单模块
  - 预期结果：明确是否应在侧边栏“资源管理”分组下新增一个与“采购管理”同级的“原材料管理”菜单入口，并使用独立文件夹、独立模块壳与独立 tabs 组织。
  - 待执行内容：
    - 盘点资源管理分组当前菜单结构，以及采购管理模块的现有组织方式。
    - 盘点 `materials` / `material-archive` 当前路由、模块壳、tab 结构与权限映射。
    - 对比“继续作为隐式独立模块存在”与“正式升格为资源管理下一级菜单模块”两种方案的导航清晰度与后续扩展性。

- [ ] 形成原材料管理独立模块的推荐方案
  - 预期结果：给出一个符合当前项目结构、且便于后续继续扩展材料分类、组装件、主数据管理能力的方案。
  - 待执行内容：
    - 优先评估沿用现有 `/materials` 独立路由模块，补齐资源管理下侧边栏入口与命名收口，而不是重复新造第二套材料模块。
    - 明确是否需要把 `features/material-archive` 收口为更贴近“原材料管理”语义的独立模块目录。
    - 明确 tabs 是否继续保留“全部 / 组装件 / 动态分类”模式，还是重构为更稳定的业务页签。
    - 明确权限映射是否应继续挂在 `engineering`，还是迁到资源管理同域。

- [ ] 本轮原材料管理模块方案待确认项
  - 是否确认推荐方向为：在“资源管理”分组下新增一个与“采购管理”同级的“原材料管理”菜单入口，并复用现有 `/materials` 独立模块作为承载壳。
  - 是否确认本轮若实施，应优先做“入口显性化 + 模块命名/文件夹收口”，而不是先大改材料 tabs 的业务结构。
  - 你确认后，我再进入代码实施阶段。

- [ ] 纠正“原材料管理”入口与页面内部仍显示“物料管理/物料档案”语义错位
  - 预期结果：当你从侧边栏点开“原材料管理”后，页面内所有用户可见标题、tab、搜索、按钮、对话框、Excel 导出等命名，与“原材料管理”语义一致，不再出现“物料管理”“物料档案”这类混用。
  - 待执行内容：
    - 盘点 `/materials` 页面中的标题、tabs、toolbar、dialog、empty state、Excel 文案、命令搜索异步结果等用户可见命名。
    - 区分“仅代码内部文件名/组件名”与“用户可见文案”，优先修正用户实际看到的内容。
    - 明确哪些地方应改成“原材料管理”，哪些地方仍应保留“物料分类/包装/辅料”等领域术语。

- [ ] 形成原材料管理页面语义纠偏的最小修复方案
  - 预期结果：优先消除你当前看到的最刺眼语义错位，不把本轮扩大成整套材料主数据建模重命名。
  - 待执行内容：
    - 第一优先级：页面头部、tab 标题、命令搜索展示名、按钮文案、弹窗标题、导出模板标题等用户主路径文案。
    - 第二优先级：如果需要，再收口“全部物料”“登记档案”“物料档案维护”等与入口语义冲突的文案。
    - 暂不大改内部文件夹/组件名，避免把一次显示语义修正扩大成大规模重构。

- [ ] 本轮原材料管理语义纠偏待确认项
  - 是否确认本轮先按“用户可见文案优先”处理：把页面内显示的“物料管理/物料档案”收口为与你确认的“原材料管理”语义。
  - 是否确认本轮先不动内部代码文件名与组件名，只修正你实际看得到的标题、tab、按钮、弹窗和导出文案。
  - 你确认后，我再进入代码修正阶段。

- [ ] 纠偏：新建独立“原材料管理”模块，现有 `/materials` 物料管理保持不动
  - 预期结果：新增一个与现有物料管理并存但职责独立的“原材料管理”模块；原有 `/materials` 继续作为“物料管理”保留，不被改名、不被复用承载新模块。
  - 待执行内容：
    - 撤销此前把 `/materials` 误当作“原材料管理”的方案认定，明确其仍代表现有“物料管理”。
    - 评估新模块的独立路径、独立文件夹、独立模块壳与独立 tabs 组织方式。
    - 保证侧边栏中“物料管理”和“原材料管理”是两个不同入口，不发生语义混用。

- [ ] 形成“新增原材料管理模块，不碰现有物料管理”的实施方案
  - 预期结果：给出一个不会再污染现有 `/materials` 模块语义的新增方案。
  - 待执行内容：
    - 推荐为新模块选择独立路径，例如 `/raw-materials` 或等价明确命名路径。
    - 推荐新建独立目录，例如 `src/features/raw-materials`，而不是继续复用 `material-archive` 目录。
    - 规划新模块自己的 tabs、侧边栏入口、命令搜索入口与权限映射。

- [ ] 本轮新增原材料管理模块待确认项
  - 是否确认正确方向为：**新建**独立“原材料管理”模块，现有 `/materials` 物料管理完全不动。
  - 是否确认我接下来应先把此前误改到“原材料管理”的 `/materials` 可见文案恢复为“物料管理”，然后再新增独立原材料管理模块。
  - 你确认后，我再进入代码实施阶段。

- [ ] 最终纠偏：仓储下恢复“物料管理”，资源管理下新增独立“原材料管理”
  - 预期结果：系统同时存在两个清晰入口，且职责不混用：
    - 仓储分组下保留原有 `物料管理`（`/materials`）
    - 资源管理分组下新增独立 `原材料管理` 模块（新路径、新目录、新 tabs）
  - 待执行内容：
    - 将此前被误迁到资源管理分组的 `/materials` 入口恢复回仓储分组。
    - 恢复 `/materials` 的用户可见语义为 `物料管理`，不再冒充 `原材料管理`。
    - 为 `原材料管理` 新建独立路由、独立模块壳、独立 tabs 与独立功能目录。

- [ ] 本轮最终方案待确认项
  - 是否确认最终结构为：`物料管理` 回到仓储分组；`原材料管理` 作为资源管理下的新增独立模块。
  - 是否确认新模块继续采用我建议的独立路径 `/raw-materials` 与独立目录 `src/features/raw-materials`。
  - 你确认后，我再进入代码实施阶段。

- [ ] 阶段一：优先恢复现有 `/materials` 为仓储下原始物料管理入口与文案
  - 预期结果：先把此前误改的 `/materials` 菜单位置与用户可见文案恢复回原始状态：回到“仓储”分组，并恢复“物料档案 / 物料资源中心”等原有语义。
  - 待执行内容：
    - 将 `/materials` 从资源管理分组迁回仓储分组。
    - 恢复 `sidebar`、`commandMenu`、`materialArchive` 等已被误改为“原材料管理”的文案。
    - 恢复命令搜索中 `/materials` 的父级归属与关键词，不先引入 `raw-materials` 新入口。

- [ ] 阶段一恢复待确认项
  - 是否确认当前这一步只做“恢复 `/materials` 原状态”，不先新增 `原材料管理` 模块代码。
  - 恢复完成并验证后，我再进入阶段二新增独立 `raw-materials` 模块。

- [ ] 新增 `产品外观` 独立主数据 TAB 方案落地
  - 预期结果：在 `产品工程管理` 中新增独立 `产品外观` TAB，形成不依附于一维码页面、不强绑于产品型号建档流程的外观主数据维护入口。
  - 待执行内容：
    - 在工程管理模块 tabs 中新增 `产品外观` 入口。
    - 规划独立的外观主数据结构，至少覆盖：外观名称、条码位值、描述、启用状态、排序。
    - 将当前 basic-settings 中的一维码外观映射识别为待迁移数据源，而不是继续作为权威维护入口。

- [ ] 将一维码界面的外观来源改为读取 `产品外观`
  - 预期结果：一维码协议页和条码解析逻辑不再维护自己的外观字典，而是统一读取工程管理下 `产品外观` TAB 的主数据。
  - 待执行内容：
    - 移除或降级 basic-settings 中现有“外观码映射”编辑入口的权威地位。
    - 让一维码模拟、解析、显示统一读取新的外观主数据查询接口。
    - 保持条码位段结构不变，仅调整第 08 位“外观”字段的取值来源。
  - 本轮状态：延后，待 `产品外观` TAB 本体稳定后再接入。

- [ ] 将销售订单弹窗的外观选择改为读取 `产品外观`
  - 预期结果：销售订单录入时，外观作为客户需求字段由订单侧选择，产品型号建档本身不要求维护外观。
  - 待执行内容：
    - 在销售订单行或订单弹窗中引入外观选择器，并统一读取 `产品外观` 主数据。
    - 为订单保存外观关联字段及必要快照字段，避免后续主数据变更影响历史订单解释。
    - 为后续一维码按订单正确取值打基础。
  - 本轮状态：延后，待 `产品外观` TAB 本体完成后再接入。

- [ ] `产品外观` 方案待确认项
  - 已确认新增 TAB 命名为：`产品外观`。
  - 已确认本轮先只做：`产品外观` TAB 本体。

- [ ] 压缩 `产品外观` 页面高度与卡片密度
  - 预期结果：在常见桌面窗口高度下，6 张外观卡片尽量一屏内看完，减少为查看完整列表而发生的纵向滚动。
  - 待执行内容：
    - 按方案 B 将卡片重构为更接近表格式的信息布局。
    - 压缩页面顶部说明区、统计卡区和卡片内部留白。
    - 提高卡片信息密度，减少无效垂直间距。
    - 优先让单卡在更低高度内完整呈现：名称、条码位值、状态、排序和操作。
    - 仅做布局与视觉密度优化，不改业务字段、不改交互流程。

- [ ] `产品外观` 页面压缩待确认项
  - 已收到你选择：`方案 B`。
  - 待你审阅本轮文档更新后，我再开始修改 `src/features/engineering/tabs/product-appearance-mgmt.tsx` 的布局样式。

- [ ] 将 `产品外观` 编辑弹窗样式对齐系统 UDS1.0 视觉
  - 预期结果：新增 / 编辑外观弹窗与系统既有 UDS1.0 风格弹窗保持一致，具备统一的容器、标题区、表单区和底部操作区视觉语言。
  - 待执行内容：
    - 参考系统既有 `ActionDialogShell` 与相关弹窗实现，统一弹窗外层容器、圆角、阴影与分割线风格。
    - 统一标题区样式：粗黑斜体标题、辅助说明、副文案层级。
    - 统一表单区的输入框、分组容器、字段标签与启用开关区样式。
    - 统一底部按钮区的对齐方式、按钮尺寸与主次按钮视觉。
    - 仅做视觉与布局对齐，不改字段、不改保存逻辑。

- [ ] `产品外观` 编辑弹窗 UDS1.0 对齐待确认项
  - 待你审阅本轮文档更新后，我再开始修改 `src/features/engineering/tabs/product-appearance-mgmt.tsx` 的弹窗样式。

- [ ] 将 `产品外观` 从本地原型演进为可被销售订单无缝消费的共享主数据方案
  - 预期结果：`产品外观` 后续可支持上传图片，并在销售订单建立/编辑时做到“选择外观即能查看图片与说明”，同时为后续上线迁移到共享存储预留正确数据结构。
  - 当前现状确认：
    - `产品外观` 当前通过 `StorageService` 写入浏览器 IndexedDB，仅适合本地原型，不适合上线后的多人共享。
    - 销售订单明细行当前尚无 `appearanceId`、外观名称快照、条码位值快照、图片快照等字段。
  - 分阶段待执行内容：
    - 第一阶段：在 `产品外观` 主数据中补充图片相关字段，先完成前端原型能力。
    - 第二阶段：在销售订单明细行中新增外观选择能力，支持选择时查看图片、名称、说明和条码位值。
    - 第三阶段：订单保存时增加外观快照字段，避免未来主数据变更导致历史订单解释失真。
    - 第四阶段：后续上线前将 `产品外观` 从本地 IndexedDB 迁移到服务端数据库/文件存储/API。
  - 本轮建议范围：
    - 先做第一阶段与第二阶段所需的前端原型设计与最小可用实现准备。
    - 暂不直接进入服务端数据库和文件上传正式落地。

- [ ] `产品外观` 图片化与销售订单无缝选择方案待确认项
  - 待你确认后，我再开始第一阶段实现准备：先改前端数据模型、弹窗结构和订单侧选择交互原型。

- [ ] 按方案 B 将 `产品外观` 迁移为服务端共享主数据
  - 预期结果：`产品外观` 不再依赖浏览器 IndexedDB 作为最终存储，而是迁移到服务端数据库；图片继续复用现有 `/assets/upload` 资源上传能力，前端改为通过 API 统一读写。
  - 已确认的项目落点：
    - 后端已存在 `Gin + Gorm` 服务结构。
    - 资源上传已存在统一接口：`POST /assets/upload`。
    - 工程主数据已有 `product` 的 `handler / service types / service` 结构可参考。
  - 待执行内容：
    - 定义 `产品外观` 后端模型与数据库表字段。
    - 定义 `产品外观` 的查询、新增、更新、删除接口。
    - 明确图片字段只保存资源 URL / 名称 / 缩略图引用，不保存大图二进制到业务表。
    - 前端 `productAppearanceService` 从 `StorageService` 切换为 API 读写。
    - 为销售订单继续沿用外观快照字段，保证历史订单解释稳定。
  - 本轮建议范围：
    - 先完成服务端迁移设计文档与接口草案。
    - 待你确认后，再进入后端与前端 API 接入实现。

- [ ] `产品外观` 服务端共享存储方案 B 待确认项
  - 待你确认后，我再开始实现后端模型、路由、handler、service 以及前端 API 读写切换。

- [ ] 调整销售订单建立弹窗宽度到页面宽度的 95%
  - 预期结果：`销售订单` 建立 / 编辑弹窗在常见桌面场景下占据约 95% 页面宽度，优先减少弹窗内部横向滚动条。
  - 当前问题：订单弹窗当前宽度上限仍偏保守，内部明细编辑区在高密度列布局下容易出现水平滚动条。
  - 待执行内容：
    - 调整 `sales-order-action-dialog.tsx` 中 `DialogContent` 的最大宽度策略。
    - 优先放大外层弹窗宽度，不改订单字段结构，不改保存逻辑。
    - 若仍有局部横向滚动，再进一步评估明细区列宽是否需要微调，但本轮先只做弹窗宽度放大。
  - 本轮边界：
    - 只改 `销售订单` 弹窗宽度与相关容器宽度约束。
    - 不修改业务逻辑、数据结构、校验和接口。

- [ ] `销售订单` 弹窗宽度调整待确认项
  - 待你确认后，我再开始修改弹窗宽度并做前端校验。

- [ ] 将 `/basic-settings/linear-barcode` 页面中的外观映射弹窗改为只读，并将编辑入口统一收口到 `产品外观` TAB
  - 预期结果：线性条码页面只负责查看“外观编码 -> 外观说明”的映射结果，不再允许在该页面直接编辑；所有外观维护统一回到产品工程管理下的 `产品外观` TAB，避免数据漂移。
  - 当前现状确认：
    - `linear-barcode-mgmt.tsx` 仍通过 `AppearanceActionDialog` 打开外观映射配置弹窗。
    - `AppearanceActionDialog` 当前仍会读写 `StorageService` 中的 `xdfc_appearance_mapping`，存在与 `产品外观` 独立主数据中心并行维护的问题。
    - 这会导致线性条码页看到的外观映射与 `产品外观` TAB 中维护的外观主数据出现漂移风险。
  - 待执行内容：
    - 将线性条码页中的外观映射弹窗改为只读展示。
    - 移除该弹窗中的保存 / 重置等直接编辑能力。
    - 将弹窗数据源改为读取 `产品外观` 主数据，生成只读映射视图。
    - 取消按 `1-9` 固定占位渲染；只显示 `产品外观` 主数据里真实存在的外观条目。
    - 对于未在 `产品外观` TAB 中维护的位值（如 7 / 8 / 9），弹窗中不显示空卡片、不显示 Reserved 占位。
    - 若当前一个产品外观都未维护，则弹窗显示明确空态提示，而不是渲染空白列表。
    - 在弹窗中增加明确提示：如需编辑，请前往产品工程管理下的 `产品外观` TAB。
  - 本轮边界：
    - 只处理线性条码页的外观映射查看与编辑入口收口。
    - 不改条码协议其它段位规则，不改销售订单逻辑。

- [ ] `/basic-settings/linear-barcode` 外观映射只读化方案待确认项
  - 待你确认后，我再开始修改线性条码页与外观映射弹窗代码。

- [ ] 将 `AppearanceActionDialog` 对齐到 UDS 1.0 视觉规范
  - 预期结果：`查看外观编码映射` 弹窗在头部、主体内容区、底部操作区、卡片层次与按钮风格上统一到现有项目的 UDS 1.0 弹窗语言。
  - 当前问题：
    - 当前弹窗仍是基础 `DialogContent + DialogHeader + DialogFooter` 结构。
    - 头部缺少 UDS 1.0 常见的品牌化标题区与信息层次。
    - 内容区与卡片容器节奏较弱，视觉上与 `产品外观` 等 UDS 1.0 页面不一致。
    - 底部操作区也未对齐 UDS 1.0 的边界、按钮样式与分区逻辑。
  - 待执行内容：
    - 参考项目现有 `ActionDialogShell` / `产品外观` 管理弹窗风格，重构该弹窗头部、主体与底部布局。
    - 优化只读卡片的圆角、边框、徽标位值、字段块与滚动容器样式。
    - 保留当前“只显示真实外观条目 / 无数据则空态 / 前往产品外观入口”逻辑不变。
  - 本轮边界：
    - 只做视觉规范对齐与交互排版优化。
    - 不改外观映射数据来源、不改只读规则、不改跳转逻辑。

- [ ] `AppearanceActionDialog` UDS 1.0 视觉重构待确认项
  - 待你确认后，我再开始修改该弹窗样式与布局。

- [ ] 清理 `@[current_problems]` 中列出的样式 warning
  - 预期结果：清理当前 IDE 中列出的 Tailwind 样式 warning，使相关文件的 class 写法更规范，减少无效提示。
  - 当前问题范围：
    - `src/features/basic-settings/components/dm-simulation-section.tsx`
    - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
  - 待执行内容：
    - 将可直接替换的 Tailwind class 写法改为推荐写法，例如：
      - `rounded-[2rem]` -> `rounded-4xl`
      - `break-words` -> `wrap-break-word`
      - `dark:bg-white/[0.02]` -> `dark:bg-white/2`
      - `!h-11` -> `h-11!`
      - `!py-0` -> `py-0!`
      - `aspect-[16/8]` -> `aspect-16/8`
    - 去掉重复生效的 `opacity-20 / opacity-10` 组合。
    - 修正 `bg-[radial-gradient(...)]` 这类 class 的推荐写法。
  - 本轮边界：
    - 只清理 IDE 当前列出的样式 warning。
    - 不改组件结构、不改交互、不改业务逻辑。

- [ ] `@[current_problems]` 样式 warning 清理待确认项
  - 待你确认后，我再开始修改上述两个文件中的样式 class。

- [ ] 新建 `编码中心 > 共享编码源` 入口，并新增 `孔型孔数` TAB
  - 预期结果：在 `编码中心` 下新增 `共享编码源` 入口，并在该入口下先落一个 `孔型孔数` TAB，作为后续孔型孔数编码来源的集中入口。
  - 当前背景：
    - `编码中心` 菜单已经存在，但当前只有 `一维码` 与 `DM码`。
    - 用户已明确长期方向是 `编码中心 > 共享编码源`。
    - 当前阶段不迁移已有外观与其它现有能力，只优先落地 `孔型孔数`。
  - 待执行内容：
    - 新增 `共享编码源` 侧边栏菜单入口与对应路由壳层。
    - 在 `共享编码源` 下先新增 `孔型孔数` TAB。
    - 建立 `孔型孔数` 页面骨架与后续接入点。
    - 将孔型孔数相关读取/维护入口开始向该页面收口。
  - 本轮边界：
    - 只处理 `共享编码源` 和 `孔型孔数`。
    - 不迁移现有 `外观`。
    - 不改已有 `一维码`、`DM码`、`产品外观` 等现有页面的归属结构。
    - 不顺手处理其它编码属性。

- [ ] `共享编码源 > 孔型孔数` 实施待确认项
  - 待你最终确认文档后，我再开始修改路由、侧边栏与页面代码。

- [ ] 将孔型孔数协议拆为 `孔型前缀 1 位 + 孔数 2 位`
  - 预期结果：不再把 `孔型孔数` 仅作为笼统的 3 位组合段描述，而是在协议层明确拆分为两个独立字段：`孔型前缀` 与 `孔数`。
  - 当前背景：
    - 当前一维码这 3 位业务语义上已经是 `前缀 1 位 + 孔数 2 位`。
    - 继续以组合项维护会带来组合爆炸、分页膨胀与拼接型 bug 风险。
    - 用户已明确下一步要“一个一个来”，先只处理协议层拆分。
  - 待执行内容：
    - 调整协议规则描述，将原 `孔型孔数 3 位` 拆为：
      - `孔型前缀`：1 位
      - `孔数`：2 位
    - 调整协议页面的段位文案、说明文案与解析/组码字段表达。
    - 保持最终条码输出仍为连续 3 位，但内部字段表达拆开。
  - 本轮边界：
    - 先只处理协议层拆分。
    - 暂不处理型号适配关系。
    - 暂不重构其它编码属性。
    - 暂不进入 `共享编码源` 页面拆分为两个子模块的实现。

- [ ] `孔型前缀 1 位 + 孔数 2 位` 协议拆分待确认项
  - 待你确认文档后，我再开始修改协议层相关代码。

- [ ] 将 `共享编码源 > 孔型孔数` 页面拆分为“孔型前缀”和“孔数”两个独立维护入口
  - 预期结果：不再用“前缀 + 孔数”的组合项作为唯一主数据维护方式，而是把共享编码源页面拆成两个独立的数据维护入口，让前缀与孔数分别管理、分别复用。
  - 当前背景：
    - 一维码协议层已经拆成 `孔型前缀 1 位 + 孔数 2 位`。
    - 继续让共享编码源页面维护组合项，会导致组合数量膨胀、列表翻页过多、维护成本高。
    - 本轮用户已明确要求继续做共享编码源页面的数据结构与 UI 拆分。
  - 待执行内容：
    - 将共享编码源的数据结构从“组合项列表”拆为：
      - `孔型前缀` 独立列表
      - `孔数` 独立列表
    - 调整共享编码源页面 UI，使其能够分别管理两类主数据。
    - 调整一维码仿真 / 解析 / 下拉来源，使其从拆分后的共享源读取前缀和孔数选项。
    - 评估并处理旧组合型本地存储数据的迁移或兼容归一化。
  - 本轮边界：
    - 只处理共享编码源页面与其数据结构拆分。
    - 对接已完成的一维码协议拆分结果。
    - 暂不引入型号-孔型-孔数的约束矩阵。
    - 暂不扩展到外观、DM 或其它共享编码源模块。

- [ ] `共享编码源` 页面拆分待确认项
  - 待你确认文档后，我再开始修改共享编码源的数据结构、服务、页面 UI 与一维码接入代码。

- [ ] 清理 `共享编码源 > 孔型前缀 / 孔数` 的旧版兼容逻辑
  - 预期结果：由于系统尚未发布，不保留任何旧版组合型本地存储兼容、迁移、归一化逻辑，直接以当前拆分后的新结构作为唯一合法结构。
  - 当前背景：
    - 上一轮为了稳妥，保留了从旧组合项结构到 `prefixes + counts` 的兼容读取与迁移回写。
    - 你已明确说明系统未发布，因此不需要承担旧数据兼容成本。
  - 待执行内容：
    - 删除共享编码源中的旧组合项类型定义与兼容迁移逻辑。
    - 清理服务层对旧存储结构的识别、转换、回写代码。
    - 同步收口实现说明与文案，避免继续传达“支持旧版兼容”的错误信息。
  - 本轮边界：
    - 只清理 `共享编码源 > 孔型前缀 / 孔数` 相关旧版兼容逻辑。
    - 不改动一维码协议本身的当前拆分结构。
    - 不扩展到其它模块的历史兼容清理。

- [ ] `移除旧版兼容` 待确认项
  - 待你确认文档后，我再开始删除共享编码源的旧版兼容代码并执行校验。

- [ ] 优化 `共享编码源 > 孔型前缀 / 孔数` 页面高度与卡片布局
  - 预期结果：当前两张主卡片尽量占满可视区高度，减少页面整体纵向滚动；后续即使再增加卡片，也优先在卡片内部承载滚动，而不是让整页反复翻动。
  - 当前背景：
    - 现有页面以自然内容高度向下堆叠，两个卡片虽然左右并列，但没有充分利用整页可视高度。
    - 你明确希望页面“整页都占完”，避免以后卡片数增多时需要连续翻几次页面。
  - 待执行内容：
    - 调整共享编码源页面根布局与双卡片容器的高度分配。
    - 让卡片主体区域支持独立滚动，并保持头部统计与操作区稳定可见。
    - 评估在未来增加更多卡片时，是否应优先复用同一高度策略，而不是继续拉长整页。
  - 本轮边界：
    - 只优化 `共享编码源 > 孔型前缀 / 孔数` 页面布局高度与滚动体验。
    - 不改动当前数据结构、服务逻辑与一维码协议。
    - 不额外引入新的路由层级或复杂容器系统。

- [ ] `页面高度优化` 待确认项
  - 待你确认文档后，我再开始修改共享编码源页面的高度与滚动布局，并执行校验。

- [ ] 重构 `共享编码源 > 孔型前缀 / 孔数` 项展示为紧凑高密度布局
  - 预期结果：不再让单个 `14` / `16` 这种简单项占据大卡片高度；列表项需要明显压缩，优先用紧凑行、轻量信息块或表格式结构展示，让同屏可见数量显著提升。
  - 当前背景：
    - 上一轮虽然把页面高度撑满了，但当前单项卡片仍然过高，信息密度过低。
    - 从你给出的页面截图看，当前一屏仅容纳极少量孔数项，和实际数据密度明显不匹配。
  - 待执行内容：
    - 将前缀项、孔数项从“大卡片详情块”改为更紧凑的列表式展示。
    - 保留必要字段（编码 / 标签 / 排序 / 状态 / 操作），压缩说明、留白和重复视觉装饰。
    - 在保持可编辑、可删除、可识别的前提下，优先提升同屏展示条数。
  - 本轮边界：
    - 只调整 `共享编码源 > 孔型前缀 / 孔数` 页面项级展示样式与信息密度。
    - 不改动数据结构、服务逻辑、协议逻辑。
    - 不扩展到其它页面的通用表格系统。

- [ ] `页面紧凑化` 待确认项
  - 待你确认文档后，我再开始把当前大卡片改成紧凑列表布局，并执行校验。

- [ ] 将 `共享编码源 > 孔型前缀 / 孔数` 弹窗中的排序改为系统自动分配
  - 预期结果：新增或编辑孔型前缀、孔数时，用户不再看到也不需要维护 `排序` 字段；系统按既定规则自动分配排序，降低认知负担。
  - 当前背景：
    - 当前弹窗仍暴露 `排序` 输入框，要求用户理解并维护内部排序规则。
    - 你已明确希望“系统自动排就行，不要做成可选可修改”。
  - 待执行内容：
    - 移除孔型前缀、孔数弹窗中的排序输入项。
    - 调整保存逻辑，让系统在新增时自动分配顺序，在编辑时保持原有顺序稳定。
    - 如页面列表仍展示排序信息，则该值仅作只读展示，不再允许通过弹窗手工修改。
  - 本轮边界：
    - 只处理 `共享编码源 > 孔型前缀 / 孔数` 弹窗与对应保存逻辑中的排序交互。
    - 不扩展到其它页面的排序策略统一。
    - 不引入拖拽排序或手动上移下移能力。

- [ ] `自动排序` 待确认项
  - 待你确认文档后，我再开始移除弹窗排序输入并改为系统自动排序，然后执行校验。

- [ ] 在 `工程数据库` 下新增 `工程主数据` 承载层，并落地首个内部 TAB：`编织方式`
  - 预期结果：不再把编织比例/编法类全局工程字典挂在共享编码源或基础设置中，而是在 `工程数据库` 下建立新的 `工程主数据` 承载层，内部先落首个 TAB：`编织方式`，为后续更多工程主数据分类预留统一入口。
  - 当前背景：
    - 已确认该类数据应归属工程域，而不是编码中心。
    - 已确认页面命名不应收窄为“编织比例”，而应使用更能承接未来扩展的 `工程主数据 > 编织方式`。
    - 当前目标仍以第一阶段 MVP 为主：先把主数据本体承载结构搭好，再考虑图纸引用和上传联动。
  - 待执行内容：
    - 在 `工程数据库` 下新增 `工程主数据` 入口与内部 TAB 容器。
    - 首个内部 TAB 落 `编织方式`，作为比例型编织方式主数据的承载页。
    - 为 `编织方式` 建立独立的数据定义、服务、hook、页面与弹窗文件结构。
    - 第一阶段仅实现主数据闭环，不扩展到打孔图纸引用、上传解析与共享编码源联动。
  - 本轮边界：
    - 只处理 `工程主数据` 承载层和 `编织方式` 首个 TAB 的主数据本体。
    - 不在本轮接入 `打孔图纸原子中心` 的引用改造。
    - 不在本轮实现上传自动识别新编织方式。
    - 不在本轮把共享编码源改为消费该主数据。

- [ ] `工程主数据 > 编织方式` 待确认项
  - 待你确认文档后，我再开始新增 `工程主数据` 承载层、`编织方式` 首个 TAB 及其独立文件结构，并在完成后执行校验与更新 `walkthrough.md`。

- [ ] 将 `打孔方案` 中的编织比例改为引用 `工程主数据 > 编织方式`
  - 预期结果：`打孔方案` 不再维护自由文本或模块内写死的 `编织模式 / lacingPattern` 选项，而是统一引用 `工程主数据 > 编织方式` 中的主数据记录，保证 `1:1`、`2:1`、后续 `3:2` 等都来自唯一工程事实源。
  - 当前背景：
    - 第一阶段 `工程主数据 > 编织方式` 已完成主数据本体闭环。
    - 当前 `打孔方案` 仍使用 `drillingData.lacingPattern` 自由值与本地固定下拉选项，尚未与全局主数据打通。
    - 你已选择优先执行方案一：先把 `打孔方案` 改为引用 `编织方式` 主数据，再考虑上传识别或更下游消费链路。
    - 当前系统尚未上线，因此本轮不需要为旧 `lacingPattern` 保留兼容读取或迁移过渡层。
  - 待执行内容：
    - 调整 `DrillingPlan` 前端数据结构，直接由自由文本 `lacingPattern` 切换为 `weavingModeId` 主引用，并保留必要的显示冗余字段策略。
    - 改造 `打孔方案` 列表、弹窗、保存与 patch 链路，使其下拉数据来自 `weavingModeService` 而不是模块内固定常量。
    - 统一 `打孔方案` 页面搜索、展示、校验逻辑，使其围绕 `编织方式` 主数据而非自由文本运行。
  - 本轮边界：
    - 只处理 `打孔方案` 对 `编织方式` 主数据的引用改造。
    - 不在本轮实现图纸上传时对新编织方式的自动识别与提示创建。
    - 不在本轮把共享编码源、打印协议或其它工程模块一并改为消费 `编织方式`。
    - 不在本轮为未上线数据保留旧 `lacingPattern` 兼容字段或过渡映射层。

- [ ] `打孔方案 -> 编织方式主数据引用` 待确认项
  - 待你确认文档后，我再开始把 `打孔方案` 的编织比例字段改为引用 `工程主数据 > 编织方式`，并在完成后执行校验与更新 `walkthrough.md`。

- [ ] 对 `工程主数据 > 编织方式` 及其 `打孔方案` 消费链做稳定性整改
  - 预期结果：当前 `工程主数据 > 编织方式` 与 `打孔方案` 的主引用链在继续沿用 `EngineeringSpec` 通道的前提下，补齐删除保护、唯一性保护、读取副作用治理、失败语义分离与关键重文件职责收口，避免出现悬挂引用、重复主数据、读失败误判为空数据等稳定性问题。
  - 当前背景：
    - 已完成 `工程主数据 > 编织方式` 主数据本体与 `打孔方案 -> 编织方式` 主引用链改造。
    - 经审查，当前风险不在页面承载层，而在主数据完整性保护、服务层副作用与读写失败语义上。
    - 当前系统尚未上线，因此本轮允许直接优化主数据与消费链的内部实现，而不需要为历史线上数据做迁移兼容。
  - 待执行内容：
    - 为 `编织方式` 建立“被引用不可删除”保护，至少覆盖 `打孔方案.drillingData.weavingModeId` 的引用检查。
    - 为 `编织方式` 的归一化比例建立后端/服务侧唯一性保护，避免仅依赖前端内存列表拦截重复值。
    - 去除 `getWeavingModes()` 读取链中的隐式补种副作用，避免读操作顺带写入预置主数据。
    - 区分“读取失败”与“空数据”语义，避免主数据读取失败时继续按空列表推进保存、排序和唯一性判断。
    - 评估并收口 `weavingModeService.ts`、`production-db-service.ts`、`drilling-tab.tsx`、`drilling-action-dialog.tsx` 的职责边界，优先做最小必要拆分或内聚优化，不做无边界重构。
  - 本轮边界：
    - 优先处理数据完整性、删除保护、唯一性、失败语义与高风险职责混杂问题。
    - 不在本轮扩展新的工程主数据分类。
    - 不在本轮引入复杂后台迁移工具或批量清洗能力。
    - 若某些重文件拆分只涉及代码组织优化但不影响稳定性，可降级为后续优化项，不在本轮过度扩面。

- [ ] `工程主数据稳定性整改` 待确认项
  - 待你确认文档后，我再开始落地整改 `工程主数据 > 编织方式` 及其 `打孔方案` 消费链的稳定性问题，并在完成后执行校验与更新 `walkthrough.md`。

- [ ] 对 `工程主数据` 相关重文件做结构拆分
  - 预期结果：在不改变当前 `工程主数据 > 编织方式` 与 `打孔方案` 业务语义、接口契约和已完成稳定性整改结果的前提下，把当前职责过重的前端文件继续收口为“页面容器 + 页面状态 hook + 列表/表单区块组件”的结构，降低后续继续扩展工程主数据分类或工艺消费链时的维护成本。
  - 当前背景：
    - 已完成 `编织方式` 主数据本体、`打孔方案 -> 编织方式` 主引用改造，以及删除保护、唯一性保护、读取去副作用与失败语义整改。
    - 当前剩余主要问题已经从数据完整性风险转向前端文件职责仍然偏重，尤其是 `drilling-tab.tsx`、`drilling-action-dialog.tsx` 与 `engineering-master-weaving-mode-tab.tsx`。
    - 本轮目标是继续做“最小必要结构拆分”，而不是重新设计业务流程或扩大为全模块重构。
  - 待执行内容：
    - 将 `drilling-tab.tsx` 收口为页面容器，优先拆出页面状态 / 交互编排 hook，以及桌面表格卡片、移动端卡片列表、顶部工具栏等薄层组件。
    - 将 `drilling-action-dialog.tsx` 中的主数据选项装配、表单状态更新、保存前阻断判断与不同表单区块拆开，优先拆出表单 state hook 与 `基础信息 / 技术参数 / 附件上传` 区块组件。
    - 将 `engineering-master-weaving-mode-tab.tsx` 继续拆为页面容器 + 列表卡片/工具栏组件，减少页面文件同时承载搜索、指标、列表与动作编排。
    - 评估 `use-weaving-mode-mgmt.ts` 是否需要继续收口为“数据编排”与“搜索过滤”两个边界；若有必要，仅做最小必要拆分。
    - 保持 `weaving-mode-service.ts`、`production-db-service.ts` 当前稳定性整改结果不回退，不因拆文件重新引入副作用读取或失败伪装空数据的问题。
  - 本轮边界：
    - 优先做前端结构拆分与职责收口，不改变后端接口、数据库结构与主数据业务规则。
    - 不在本轮新增新的工程主数据分类。
    - 不在本轮做无明确收益的样式重写或全量 UI 视觉翻新。
    - 若某个文件拆分需要额外引入新的通用抽象但收益不明确，则降级为后续项，不在本轮过度扩面。

- [ ] `工程主数据结构拆分` 待确认项
  - 待你确认文档后，我再开始落地 `drilling-tab.tsx`、`drilling-action-dialog.tsx`、`engineering-master-weaving-mode-tab.tsx` 等相关重文件的结构拆分，并在完成后执行校验与更新 `walkthrough.md`。

- [ ] 继续收口 `use-weaving-mode-mgmt.ts` 的职责边界
  - 预期结果：在不改变当前 `编织方式` 主数据页对外行为、查询键、toast 语义与稳定性整改结果的前提下，把 `use-weaving-mode-mgmt.ts` 从“查询 + 预置初始化 + mutation 编排 + 搜索过滤”混合实现，进一步收口为更清晰的边界结构。
  - 当前背景：
    - 已完成 `drilling` 页面和 `weaving-mode` 页面容器化收口，但 `use-weaving-mode-mgmt.ts` 仍同时承载数据查询、预置补种初始化、保存/删除 mutation、toast 映射以及搜索过滤派生。
    - 当前文件虽然不大，但已经处于“继续加逻辑就会再次变重”的边界，适合在此时做一次小而稳的职责拆分。
  - 待执行内容：
    - 优先把 `编织方式` 主数据的查询 / 预置初始化 / mutation 编排收口到更聚焦的 hook 或 helper。
    - 将本地 `searchTerm / filteredData` 过滤派生从数据编排逻辑中拆开，避免一个 hook 同时承担远端状态和本地视图状态。
    - 保持 `engineering-master-weaving-mode-tab.tsx` 当前调用成本尽量不变，避免为拆分引入过多 props 或新的 UI 状态回传复杂度。
    - 不回退已有的失败语义、预置初始化策略和删除/重复错误提示。
  - 本轮边界：
    - 只处理 `use-weaving-mode-mgmt.ts` 及其最小必要配套文件。
    - 不在本轮继续扩拆 `weaving-mode-service.ts`、`engineering-master-weaving-mode-tab.tsx` 或其它页面文件，除非为完成 hook 边界收口必须做轻微配套调整。

- [ ] `use-weaving-mode-mgmt.ts 边界收口` 待确认项
  - 待你确认文档后，我再开始落地 `use-weaving-mode-mgmt.ts` 的职责拆分，并在完成后执行校验与更新 `walkthrough.md`。

- [ ] 为 `use-weaving-mode-query-state.ts` 与 `use-weaving-mode-filter-state.ts` 补测试
  - 预期结果：为新拆出的 `编织方式` hook 边界补上最小必要的前端回归测试，确保远端数据编排与本地过滤派生在后续继续演进时不会漂移。
  - 当前背景：
    - 已完成 `use-weaving-mode-mgmt.ts` 的职责收口，当前逻辑已拆成 `use-weaving-mode-query-state.ts` 与 `use-weaving-mode-filter-state.ts`。
    - 这两个 hook 刚从主 hook 中拆出，当前还没有独立测试保护，后续若继续调整预置初始化、toast 映射或搜索过滤规则，回归风险会偏高。
  - 待执行内容：
    - 为 `use-weaving-mode-query-state.ts` 补充 hook 测试，覆盖至少以下关键行为：
      - 空数据时显式触发一次预置初始化
      - 保存成功 / 删除成功后的查询失效
      - 重复比例、预置不可删、被打孔方案引用等错误映射的 toast 分支
      - `refetchWeavingModes()` 会重置补种尝试并触发重新刷新
    - 为 `use-weaving-mode-filter-state.ts` 补充 hook 测试，覆盖至少以下关键行为：
      - 默认不过滤时返回原始数据
      - 搜索 `label / normalizedRatioKey / description / system preset / custom` 等命中项时能正确过滤
      - 搜索大小写与空白处理符合当前实现语义
  - 本轮边界：
    - 只新增测试文件和必要的测试 mock/辅助封装。
    - 不在本轮继续改动 hook 业务实现，除非测试暴露出真实缺陷且必须一并修正。

- [ ] `编织方式 hook 测试补强` 待确认项
  - 待你确认文档后，我再开始为 `use-weaving-mode-query-state.ts` 与 `use-weaving-mode-filter-state.ts` 编写测试，并在完成后执行验证与更新 `walkthrough.md`。

- [ ] 为 `use-drilling-page-state.ts` 与 `use-drilling-action-dialog-state.ts` 补测试
  - 预期结果：为 `drilling` 页面新拆出的状态 hooks 建立独立前端回归测试，确保页面容器化后最关键的查询编排、预览逻辑、删除确认桥接、表单状态与保存前阻断语义在后续迭代中保持稳定。
  - 当前背景：
    - 已完成 `drilling-tab.tsx` 与 `drilling-action-dialog.tsx` 的结构拆分，并新增 `use-drilling-page-state.ts` 与 `use-drilling-action-dialog-state.ts`。
    - 这两个 hook 目前承载了 `drilling` 页面主要的状态编排，但还没有独立测试保护；后续若继续调整预览、删除、patch 保存或主数据阻断逻辑，容易出现无感回归。
  - 待执行内容：
    - 为 `use-drilling-page-state.ts` 补充 hook 测试，覆盖至少以下关键行为：
      - 基于产品映射和搜索词生成 `filteredRows`
      - `handleCreate / handleEdit` 对弹窗状态与当前行的影响
      - `handlePreview` 在 `no file / unresolved / cad / excel / pdf` 场景下的分支行为
      - `handleDelete` 是否通过确认流桥接到删除 mutation
      - `handleSave` 在新增 / patch 场景下是否正确调用 `ProductionDBService`
    - 为 `use-drilling-action-dialog-state.ts` 补充 hook 测试，覆盖至少以下关键行为：
      - 新建 / 编辑场景下初始表单状态构建
      - `availableWeavingModes / weavingModeItems` 过滤逻辑
      - `handleWeavingModeChange` 是否同步回写 `weavingModeId / weavingModeLabel`
      - 主数据加载失败、无可用编织方式、schema 校验失败时的阻断提示
      - `buildSaveParams()` 在新增 / patch / 无变更场景下的返回语义
  - 本轮边界：
    - 只新增测试文件和必要的测试 mock/辅助封装。
    - 不在本轮继续改动 `drilling` 业务实现，除非测试暴露出真实缺陷且必须一并修正。

- [ ] `drilling hooks 测试补强` 待确认项
  - 待你确认文档后，我再开始为 `use-drilling-page-state.ts` 与 `use-drilling-action-dialog-state.ts` 编写测试，并在完成后执行验证与更新 `walkthrough.md`。

- [ ] 为 `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 补页面容器层测试
  - 预期结果：为已完成容器化收口的两个页面入口补上薄容器层回归测试，确保页面只承担 props 拼装、状态透传与子组件编排，不在后续演进中重新混入业务实现或出现关键连线漂移。
  - 当前背景：
    - 已完成 `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 的页面容器化拆分，并分别收口到 toolbar / list-card / dialog / preview 挂载等薄层组件。
    - 已为下沉的 hooks 补完独立测试，但页面容器层当前还缺少“编排透传”保护；如果后续继续调整 props 结构或页面壳，很容易在不改 hook 的情况下引入 UI 连线回归。
  - 待执行内容：
    - 为 `engineering-master-weaving-mode-tab.tsx` 补充容器层测试，覆盖至少以下关键行为：
      - 指标卡统计是否基于 `filteredData` 透传到页面
      - `WeavingModeToolbar` 的 `searchTerm / onSearchTermChange / onCreate` 是否正确桥接
      - `WeavingModeListCard` 的 `onRetry / onEdit / onDelete` 是否正确透传到 hook 与页级状态
      - `WeavingModeActionDialog` 的 `open / currentRow / onSave / isLoading` 是否正确挂载
    - 为 `drilling-tab.tsx` 补充容器层测试，覆盖至少以下关键行为：
      - `DrillingToolbar` 的 `searchTerm / onSearchTermChange / onCreate` 是否正确桥接
      - `DrillingTableCard` 与 `DrillingMobileList` 是否接收到相同的 `rows / preview / edit / delete` 编排动作
      - `DrillingActionDialog` 的 `open / currentRow / onSave / isLoading` 是否正确挂载
      - `CADViewerDialog / PDFViewerDialog / ExcelViewerDialog` 是否接收到正确的 `open / onOpenChange / fileUrl / fileName / sku`
  - 本轮边界：
    - 只新增页面容器层测试文件与必要的测试 mock。
    - 不在本轮继续改动容器实现或子组件实现，除非测试暴露出真实缺陷且必须一并修正。

- [ ] `工程主数据页面容器层测试补强` 待确认项
  - 待你确认文档后，我再开始为 `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 编写页面容器层测试，并在完成后执行验证与更新 `walkthrough.md`。

- [ ] 分析 `一维码 > 业务编号` TAB 是否可以安全迁移到 `编码中心 > 共享编码源`
  - 预期结果：基于当前代码实现、路由结构、数据存储、调用方与导航入口，判断 `一维码 > 业务编号` 是否已经具备“安全移动到共享编码源”的条件，并输出明确结论、风险清单、迁移前置条件与推荐路径。
  - 当前背景：
    - 现状代码中，`共享编码源` 已有独立 layout 与 tabs，但目前只承载 `孔型孔数`。
    - `一维码 > 业务编号` 当前仍通过独立路由挂到 `SequenceMgmt`，并不是 `共享编码源` 下的现成复用挂载。
    - 你此前的产品方向是让更多共享字典型能力沉淀到 `编码中心 > 共享编码源`，但本轮需要先核实当前实现是否真的已经满足安全迁移条件，而不是直接按目标态判断。
  - 待执行内容：
    - 梳理 `一维码 > 业务编号` 的页面入口、tab 配置、路由定义与菜单/导航入口。
    - 梳理 `业务编号` 当前使用的数据存储 key、service、hook、schema 以及是否存在与 `一维码协议` 页的隐式耦合。
    - 梳理 `共享编码源` 当前 layout / tab / 数据组织方式，判断是否能容纳 `业务编号` 且不破坏现有 `孔型孔数` 实现。
    - 盘点 `SequenceMgmt` 的上游入口、下游消费方、跳转链路、文案语义与权限映射，判断迁移是否只属于“路由搬家”，还是会牵涉语义与依赖重构。
    - 输出结论：
      - 是否可以安全迁移
      - 不能安全迁移的阻断点
      - 若可迁移，推荐分几步迁移、是否需要兼容期
  - 本轮边界：
    - 本轮只做只读分析与结论输出，不直接改动业务代码、路由或导航。
    - 若分析后确认要实施迁移，需要单独进入新的规划与确认流程。

- [ ] `一维码 > 业务编号` TAB 迁移安全性分析 待确认项
  - 待你确认文档后，我再继续做代码级只读审查，并给出“是否可安全迁移到共享编码源”的正式分析结论。

- [ ] 盘点 `业务编号` 相关历史残留入口，重点核查 `'/basic-settings/sequences'`
  - 预期结果：输出一份“业务编号历史残留入口清单”，明确哪些入口仍有效、哪些已失效或漂移、哪些只是残留引用，并给出建议清理顺序。
  - 当前背景：
    - 上一轮分析已确认 `业务编号` 当前主挂载位于 `'/code-center/linear-barcode/numbering'`，但系统内仍可见 `'/basic-settings/sequences'` 等旧痕迹。
    - 你此前对 `共享编码源` 的约束是当前阶段先只处理 `孔型孔数`，其它已有入口先不动，因此本轮更适合先做残留盘点，而不是直接改迁入口。
  - 待执行内容：
    - 盘点 `'/basic-settings/sequences'` 是否仍有真实 route 文件、redirect、命令搜索、菜单入口、权限目录或自动生成目录残留。
    - 盘点 `业务编号 / SequenceMgmt / numbering rules` 相关的文案引用、深链接、页面跳转与命令搜索项。
    - 识别哪些引用是“仍有效入口”、哪些是“编译产物或目录残留”、哪些是“文案/说明级引用无需清理”。
    - 输出建议：
      - 应先清哪些残留
      - 哪些残留不能直接删
      - 若后续迁移到新承载层，哪些入口必须先兼容
  - 本轮边界：
    - 仅做只读盘点，不修改路由、菜单、命令搜索或代码实现。
    - 若后续决定清理残留或实施迁移，需要另开实施规划。

- [ ] `业务编号历史残留入口盘点清单` 待确认项
  - 待你确认文档后，我再继续盘点 `'/basic-settings/sequences'`、命令搜索、权限目录、自动生成目录和文案引用，并输出正式清单与建议。

- [ ] 清理 `业务编号` 残留入口（最小实施范围）
  - 预期结果：只清理已经确认失效的 `业务编号` 旧入口残留，避免用户再被导向不存在的页面，同时不扩散到 `业务编号` 的承载层迁移或语义重命名。
  - 当前背景：
    - 已确认 `'/code-center/linear-barcode/numbering'` 是当前唯一真实入口。
    - 已确认 `'/basic-settings/sequences'` 在当前代码树中无真实 route 文件或兼容跳转，属于失效旧入口残留。
    - 当前最大风险是命令搜索仍保留旧入口；其次是 `authenticated-route-catalog` 仍保留旧路径，说明目录生成链路或产物存在漂移。
  - 待执行内容：
    - 清理 `src/components/layout/data/search-data.ts` 中指向 `'/basic-settings/sequences'` 的旧命令搜索入口。
    - 追踪 `src/features/authz/data/authenticated-route-catalog.ts` 中 `'/basic-settings/sequences'` 的来源，判断应通过修正源文件还是重新生成目录来消除残留。
    - 仅在确认来源链后，按最小范围修复 `authenticated-route-catalog` 的旧路径残留。
    - 不改动 `SequenceMgmt` 组件实现，不改动 `basicSettings.sequences.*` 文案命名空间，不推进 `业务编号` 承载层迁移。
  - 本轮边界：
    - 只处理“失效旧入口残留”与其生成来源，不处理 `业务编号` 页面重命名、共享编码源承载迁移或发号服务改造。
    - 若发现 `authenticated-route-catalog` 的残留必须通过脚本重建或会牵涉更大范围生成文件，需要先回到规划阶段说明影响，再请求你确认。

- [ ] `业务编号残留入口最小清理` 待确认项
  - 待你确认文档后，我再开始清理 `search-data.ts` 的旧入口，并核查 `authenticated-route-catalog` 的残留来源链与最小修复路径。

- [ ] 新建全新的共享发号 TAB（统一承载一维码 / DM 码发号逻辑）
  - 预期结果：不直接移动旧的 `业务编号` TAB，而是在新的共享承载层下新增一个全新 TAB，专门管理一维码与 DM 码共用的发号规则 / 编号引擎。
  - 当前目标：
    - 明确新 TAB 的承载位置、命名、路由语义和信息架构。
    - 评估现有 `numbering-service`、`SequenceMgmt` 与一维码 / DM 码消费者是否可复用。
    - 明确旧 `业务编号` 页的兼容策略，以及销售订单条码能力是否继续共用底层引擎。
  - 需要分析的重点：
    - 新 TAB 是否挂在 `编码中心 > 共享编码源` 下，还是应作为独立共享能力承载层。
    - 新能力是只服务 `一维码 + DM 码`，还是沉淀为更通用的共享编号引擎。
    - 现有规则模型、接口与页面状态是否足以支撑 DM 码接入，是否需要抽象出新的共享视图层。
    - 旧 `'/code-center/linear-barcode/numbering'` 入口是否保留兼容期，以及命令搜索、tab、权限映射如何同步调整。
  - 本轮边界：
    - 仅做产品/架构/实现前置规划，不直接新增 route、tab、页面或服务。
    - 若结论指向需要大范围承载层调整，需在实施前再拆分迁移步骤并逐步确认。

- [ ] `共享发号 TAB` 方案待确认项
  - 待你确认文档后，我再继续做新共享发号 TAB 的承载方案分析、命名建议、影响面评估与后续实施顺序设计。
