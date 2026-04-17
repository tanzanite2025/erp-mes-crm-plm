## 17. 用户权限模型简化分析：是否收敛为“直接给用户赋权”

### 17.0 最新执行进展补充（2026-04-17 第二轮去兼容化）

#### 已完成收口

1. `server/dependencies/effective_access.go` 运行时访问快照已收口为只读取 `user_permissions`，不再保留 `PrimaryRoleID / EffectiveRoles` 运行时语义。
2. `server/services/user_permission_service.go` 与 `server/handlers/user_permissions.go` 中已脱离主链的 `migrate-effective` 迁移实现已移除，避免继续保留旧角色快照回填入口。
3. 用户列表 / options 查询已移除 `role` 过滤；`server/services/user_query_*.go`、`server/handlers/users.go`、`src/routes/_authenticated/*/accounts.tsx` 已同步去掉活跃 `role` 筛选契约。
4. `src/features/users/services/user-api.ts` 的创建 / 替换活跃请求已不再发送 `role`；`src/features/users/adapters/user-api-adapter.ts` 也不再把 `role` 作为运行时主链字段透传。
5. `src/features/users/hooks/use-users-action-dialog-sync.test.ts`、`src/features/users/hooks/use-users.test.ts` 以及 `server/handlers/users_*test.go` 中残留的 `role / currentRole / effectiveRoles` 旧测试口径已继续收口，改为与当前权限单链路实现一致。
6. `server/handlers/users.go` 中仍带 role 历史语义的运行时 helper 已继续重命名；`resolveEmployeeRecordIDForBinding(...)` 与 `enforceBulkSyncPermissions(...)` 不再沿用旧角色命名。
7. `src/locales/messages/zh-CN/users.ts` 与 `src/locales/messages/en-US/users.ts` 已继续把用户域提示语、删除确认与校验提示从角色措辞刷新为显式权限措辞。
8. `src/features/users/components/users-role-bindings-dialog.tsx`、`src/features/users/hooks/use-role-display.ts`、`src/features/users/utils/role-display.ts`、`role-resolver.ts`、`department-role.ts` 及对应测试已物理下线；删除后 `pnpm exec tsc --noEmit --pretty false` 与全仓引用复扫均已通过。
9. `server/models/user.go` 已移除 legacy `Role` 字段，`server/middleware/auth.go`、`server/repositories/organization_repository.go`、`server/db/db.go` 已同步去除 `user.Role` 查询、admin 保护与 seed 依赖。
10. `server/handlers/users_*test.go`、`server/services/leave_service_test.go`、`server/handlers/leave_handlers_test.go`、`server/repositories/organization_repository_test.go`、`server/services/organization_service_test.go`、`server/dependencies/effective_access_test.go` 中可安全删除的 `"role"` payload、`models.User{ Role: ... }` seed 与 `role TEXT` 用户表测试列已继续清除。
11. 新定位到的“脚本 / 边缘工具”残留主要包括：`server/scripts/cleanup_cashier.go` 仍按 `users.role='cashier'` 做精准清理；`server/handlers/ws.go` 仍通过 `isAdminRole(client.Role)` 判定 admin 投递；`server/dependencies/effective_access.go` 仍保留 `fallbackPermissionsForRole(admin|superadmin)`；`server/db/db.go` 仍带 `hardenSeedAdminRole()`、`UPDATE users SET role='admin' ...`、`users.role` 约束清理等历史兼容逻辑。
12. 上述脚本 / 边缘工具残留已继续完成收口：`server/cmd/cleanup/main.go` 与 `server/scripts/cleanup_cashier.go` 已改为按受控用户名清理；`server/handlers/ws.go` 与 `server/handlers/alerts.go` 已改为基于 `permission:perm_manage` 做系统告警投递；`server/dependencies/effective_access.go` 已移除 `admin/superadmin` fallback；`server/db/db.go` 已删除仅服务于 `users.role` 的修补与约束清理逻辑，同时保留角色模板实体 `models.Role` 的模板种子与模板迁移。
13. 新定位到的“前端与文案措辞”残留主要包括：`src/features/users/utils/user-utils.ts` 仍使用 `isSuperAdmin` 与“Super Admin/超级管理员”注释；`src/features/users/hooks/use-users.ts` 仍抛出 `protected superadmin account` 错误；`data-table-row-actions.tsx`、`data-table-bulk-actions.tsx`、`users-columns.tsx` 仍沿用 `isSuperAdmin` 保护命名；`users-add-admin-dialog.tsx` 与 `src/locales/messages/zh-CN/users.ts` / `en-US/users.ts` 仍保留 `superadmin`、`ROOT 账户`、`权限切换` 等历史措辞。
14. 上述前端与文案残留已继续完成收口：`src/features/users/utils/user-utils.ts`、`use-users.ts`、`data-table-row-actions.tsx`、`data-table-bulk-actions.tsx`、`users-columns.tsx` 已改为“受系统保护账户 / protected account”语义；`users-add-admin-dialog.tsx` 与 `users` 中英文 locale 已将 `superadmin / ROOT / switch admin` 文案与 locale key 收口为“高权限账户 / 受保护账户 / 全系统管理权限 / access verify”语义。
15. `system-mgmt` 角色模板域中过时说明文案已继续完成收口：`src/locales/overrides/system-management.zh-CN.ts` 与 `src/locales/overrides/system-management.en-US.ts` 的角色矩阵安全提示已从 `ROOT / superadmin` 历史表述刷新为“系统保留的全局模板角色 / built-in global template role”语义，同时保留 `src/features/system-mgmt/*` 中真正承担模板保护逻辑的 `admin/superadmin` 内部判断实现。
16. 新收到的本地登录故障为：浏览器登录页打印 `[UserAuthForm] [AUTH_DIAG] LOGIN_RESPONSE_FAILED`，状态码 `502`，访问源为 `http://127.0.0.1:5173`。当前已确认：前端登录页直接 `fetch('/api/v1/auth/login')`；Vite 开发配置将 `/api` 代理到 `http://localhost:8080`；后端 `server/handlers/auth.go` 的 `LoginHandler` 本身只会返回 `200 / 400 / 401 / 429 / 500`，不会主动返回 `502`。因此当前初判更偏向 Vite 代理上游或 `127.0.0.1:8080` 本地服务响应异常，而不是登录 handler 主动回包 502。
17. 上述本地登录 `502` 已完成根因修复：排查确认 `127.0.0.1:8080` 实际对应 Docker 本地 `nginx` 负载入口，`502` 来自 `server-app-1` / `server-app-2` 上游不可用。容器日志显示两类启动崩溃原因：
   - `server/models/user_permission.go` 中 `GrantedBy` 作为可空 UUID 列却建模为 `string`，导致 seed admin explicit permissions 时把空值写成 `''`，触发 PostgreSQL `invalid input syntax for type uuid: ""`；
   - `server/db/db.go` 中 `ensurePackagingRuleMaterialUniqueIndex()` 在双副本启动时存在建索引竞态，可能触发 `pg_class_relname_nsp_index` 冲突并直接打崩容器。
18. 本轮已实施的修复为：
   - 将 `server/models/user_permission.go` 的 `GrantedBy` 改为 `*string`；
   - 将 `server/services/user_permission_service.go` 的 `GrantedBy` 读写适配为 `nil <-> nullable uuid`，避免再把空 UUID 落成空字符串；
   - 将 `server/db/db.go` 的 `ensurePackagingRuleMaterialUniqueIndex()` 包进事务级 `pg_advisory_xact_lock(...)`，把双副本启动时的唯一索引创建串行化；
   - 使用仓库推荐的 `powershell -ExecutionPolicy Bypass -File .\server\dev-up.ps1 -FullStack` 重新按 `.env.dev` 启动本地全栈，避免 `docker compose` 直接读取 `.env` 导致的本地数据库密码错配。
19. 新收到的前端崩溃为：`permission-catalog` 抛出 `[permission-catalog] Unmapped top-level path: /aps-scheduling`。当前已确认：
   - 路由 `src/routes/_authenticated/aps-scheduling/route.tsx` 已存在；
   - 侧边栏 `src/components/layout/data/sidebar-data.ts` 已为 `/aps-scheduling` 生成菜单项，并调用 `permissionIdForPath('/aps-scheduling')`；
   - `src/features/authz/data/permission-catalog.ts` 的 `ROUTE_TO_MENU_MAPPING` 尚未包含 `/aps-scheduling`，因此 `getMenuPermissionForPath('/aps-scheduling')` 直接抛错；
   - 当前问题属于 permission catalog 单源缺口，不是运行时权限裁决或路由守卫逻辑问题。
20. 上述 `/aps-scheduling` 崩溃已完成修复：结合侧边栏分组位置与现有权限契约，最终将 `/aps-scheduling` 收口到现有 `piecework` 菜单权限域，在 `src/features/authz/data/permission-catalog.ts` 中补齐 `/aps-scheduling -> piecework` 映射，避免新增一个前后端均未声明的孤立 `menu_aps_scheduling` 权限，保持 permission catalog 单源与当前权限契约一致。
21. 新收到的“账号权限模块 / 权限树未自动更新”问题，当前已回溯出如下链路：
   - 账号权限弹窗 `src/features/users/components/users-permissions-dialog.tsx` 通过 `buildPermissionTree(DEFAULT_PERMISSIONS)` 构建权限树；
   - 系统管理角色矩阵 `src/features/system-mgmt/hooks/use-roles.ts` 也在模块初始化时调用 `getDefaultPermissions()`，并把结果放进 `useState<Permission[]>(DEFAULT_PERMISSIONS)`；
   - `DEFAULT_PERMISSIONS` 由 `src/features/authz/data/default-permissions-registry.ts` 在模块加载时一次性收集 `ROUTE_DERIVED_PERMISSIONS + ACTION_PERMISSIONS` 后导出常量；
   - `ROUTE_DERIVED_PERMISSIONS` 又依赖 `src/features/authz/data/authenticated-route-catalog.ts` 这个由 `scripts/generate-authenticated-route-catalog.mjs` 生成的静态文件。
22. 由此可见，本轮高概率根因不是“权限树组件没有响应式刷新”，而是“权限树的上游静态输入没有自动更新”：
   - `package.json` 的 `dev` / `build` 脚本会在启动前执行 `generate-route-tree.mjs`、`generate-authenticated-route-catalog.mjs`、`generate-permission-contract.mjs`；
   - 但这些脚本只在启动 `vite` 前执行一次，运行中的开发态并没有针对 `src/routes/_authenticated/**` 的新增/改动自动重跑生成；
   - 同时 `route-permission-registry.ts`、`default-permissions-registry.ts`、`default-permission-queries.ts` 都在 import 时固化了一份派生结果，因此即便某些上游文件被手工更新，当前已加载页面也不一定会自动重算权限树。
23. 用户已明确要求采用“长远根因修复”，因此本轮不采用仅补 dev watch 的临时方案，而是直接收口为“单一权威路由源 + 去除 import-time 权限快照”：
   - 新增 `src/features/authz/data/authenticated-route-paths.ts`，前端运行时通过 `import.meta.glob('/src/routes/_authenticated/**/*.tsx')` 直接收集 authenticated route 路径，不再把 `authenticated-route-catalog.ts` 作为权限树唯一上游；
   - 新增 `scripts/authenticated-route-path-utils.mjs`，让脚本侧校验自行扫描 `src/routes/_authenticated`，不再反向依赖前端运行时 registry；
   - `src/features/authz/data/route-permission-registry.ts` 改为 getter 导出：按需从当前 route paths 生成 `route permissions`，不再导出 import-time 固化的 `ROUTE_PERMISSION_*` 常量；
   - `src/features/authz/data/default-permission-queries.ts`、`src/features/system-mgmt/utils/role-permission-tree.ts`、`src/features/system-mgmt/hooks/use-roles.ts`、`src/features/users/components/users-permissions-dialog.tsx` 均改为按需读取最新 default permissions，而不是在模块加载或组件生命周期初始阶段冻结一份旧权限树；
   - `package.json` 的 `dev` / `dev:frontend:debug` / `build` 已移除 `generate-authenticated-route-catalog.mjs` 的前置依赖，避免日常开发再受第二份静态目录制约。
24. 用户要求继续做“真实路由新增验证”，因此本轮计划补一个最小 authenticated 子路由来跑通真链路，原则如下：
   - 优先放在现有已映射顶层模块下，避免把“顶层 menu 映射漏配”与“权限树自动同步”混成一个问题；当前首选 `/_authenticated/basic-settings/permission-tree-smoke.tsx`，对外路径为 `/basic-settings/permission-tree-smoke`；
   - 页面内容保持最小，只用于验证 route file 被新增后，前端运行时 route collector 是否能立即把它纳入 route-derived permissions；
   - 验证观察点至少包含三处：`node scripts/verify-permissions.mjs` 的 route entries 数量变化、账号权限弹窗中是否出现新节点、系统管理权限树中是否出现新节点；
   - 本轮不把该测试路由包装成真实业务功能，也不顺手扩展 tab config / menu 文案；如需长期保留，后续再明确命名与归属。
   - 已执行结果：新增 `src/routes/_authenticated/basic-settings/permission-tree-smoke.tsx` 后，`node scripts/generate-route-tree.mjs` 已将 `/basic-settings/permission-tree-smoke` 写入 `src/routeTree.gen.ts`，`node scripts/verify-permissions.mjs` 通过且 `Route permission entries` 增至 `134`，同时本地 `http://127.0.0.1:5173/basic-settings/permission-tree-smoke` 返回 `200`；代码链路已跑通。
   - 由于当前会话未直接采集 UI 截图，账号权限弹窗 / 系统管理权限树节点是否已目视出现，仍以已提供的本地浏览器预览入口做最后人工确认。
25. 本轮 `current_problems` 为样式层静态告警清理，范围已收敛到 5 个文件、9 处类名：
   - `src/components/layout/header.tsx`：`md:left-[var(--header-fixed-left,var(--sidebar-width))]` 与两个 `max-w-[28rem]`；
   - `src/components/ui/dialog.tsx`：两个 `z-[101]`；
   - `src/features/engineering/tabs/template-mgmt.tsx`：`bg-gradient-to-r`、`min-h-[3rem]`；
   - `src/features/logistics-config/vehicle-loading/components/vehicle-loading-plan-dialog.tsx`：`bg-muted/[0.03]`；
   - `src/features/trading/shipping-management/components/shipping-vehicle-match-recommendation-dialog.tsx`：`bg-muted/[0.03]`。
26. 这些替换均属于 Tailwind 等价值收敛，不应改变 UI 语义：
   - `max-w-md` 等价 `28rem`，`min-h-12` 等价 `3rem`，`z-101` 与 `z-[101]` 语义一致；
   - `bg-linear-to-r` 与 `bg-gradient-to-r`、`bg-muted/3` 与 `bg-muted/[0.03]` 属于框架推荐的新写法；
   - `md:left-(--header-fixed-left,var(--sidebar-width))` 属于 CSS 变量 inset 简写，需要特别回归 fixed header 在桌面态的左偏移是否保持一致。
27. 因此本轮执行边界仅为“类名替换 + 定向回归”，不改 DOM 结构、不调样式 token、不顺手做视觉重构；验证以 IDE 告警消失和相关组件关键布局未回归为准。
   - 已执行结果：5 个文件中的 9 条 warning 已按计划替换；`pnpm exec tsc --noEmit --pretty false` 通过，且目标文件中旧告警类名（`max-w-[28rem]`、`z-[101]`、`bg-gradient-to-r`、`min-h-[3rem]`、`bg-muted/[0.03]` 等）已检索不到。
28. `/leave-management` 当前“新建请假申请”能力的真实口径已经确认是“本人自助申请”，不是“管理员为任意人员建单”：
   - 前端文案已直接写明 `仅支持本人申请，请假时长以后端权威试算结果为准`；
   - `src/features/org-personnel/hooks/use-submit-leave-request.ts` 只从 `useAuthStore().user?.employeeId` 判断是否允许提交；
   - `src/features/org-personnel/services/leave-service.ts` 的接口全部是 `/leaves/my`、`/leaves/preview`、`/leaves`、`/leaves/stats`，没有传入目标 `employeeId`；
   - `server/handlers/leave_handlers.go` 与 `server/services/leave_service.go` 也只接受当前登录用户上下文，不接受管理员显式指定申请人。
29. 真正的阻塞点在后端主链而非前端表现层：
   - `resolveCurrentEmployeeContext(userID)` 先去 `users` 表读取 `employee_id`；
   - 若账号未绑定员工档案，则直接返回 `ErrLeaveEmployeeUnbound`；
   - 后续试算、创建、列表、统计、撤销全部基于该 `context.EmployeeID` 操作 `leave_requests.employee_id`，因此当前弹窗报错是整个领域模型的一致体现，不是前端误判。
30. “人员管理”数据源与账号体系已确认是两层模型：
   - 组织人事前端通过 `/employees` 直接读取员工档案，说明员工名册本身可以独立存在；
   - 后端组织仓储存在 `DisableUsersByEmployeeIDs(...)` 之类逻辑，反向证明 `employee` 是主档，`user` 是可选绑定账号层，而不是一一强制存在。
31. 因此如果业务目标改为“某些部门只有管理账号，但仍要替无账号员工提交请假”，建议不要打补丁式放松前端校验，而应先确认产品口径并重建申请主体：
   - 方案A：把当前入口定义为“管理员代员工申请”，新增员工档案选择器，接口显式传 `employeeId`，后端按 `employeeId` 建单并记录 `created_by_user_id` / `submitted_by_user_id`；
   - 方案B：保留“本人申请”入口，再额外新增“代员工申请”入口，避免本人视角列表、统计、撤销语义被管理员场景污染；
   - 无论选 A 还是 B，都不建议继续把“当前登录账号绑定 employeeId”当作唯一申请主体，因为这与你描述的组织现实不一致。
32. 风险与改造影响面：
   - 接口层：`preview/create/list/stats/cancel` 都要重新定义哪些是“我的”、哪些是“按员工/按发起人/按审批视角”；
   - 数据层：可能需要在 `leave_requests` 增加 `submitted_by_user_id`、`created_by_user_id` 或 `proxy_submit` 标记，否则无法区分“本人申请”与“代申请”；
   - 前端层：弹窗需从只读当前人改为 employee picker，列表筛选与详情文案也要区分申请对象和操作人；
   - 权限层：谁能替他人发起请假，需要单独的业务权限或组织职责边界，不能默认所有登录人都能代提。
33. 用户已确认选择方案A，因此本轮实施计划以“仅代员工申请”单链路为准，不保留当前“本人申请”语义，避免两套申请主体并存继续打架：
   - 前端 `LeaveActionDialog` 不再基于 `isEmployeeBound` 禁用，而是新增员工档案查询/选择；候选源直接复用 `/employees`，仅按员工档案状态做必要过滤；
   - `use-submit-leave-request.ts` 不再从 `auth-store.user.employeeId` 决定可提交性，而改为基于表单选择的 `employeeId`；
   - `src/features/org-personnel/services/leave-service.ts` 的 preview/create 请求体改为显式携带 `employeeId`；
   - `server/handlers/leave_handlers.go` 与 `server/services/leave_service.go` 去掉 `My` 语义输入假设，改为验证目标 `employeeId` 是否存在，并以当前登录用户作为提交操作者而非申请对象本身。
   - 已执行结果：前端弹窗已接入员工档案 `Combobox`，并去除了“当前账号必须绑定员工档案”的阻塞逻辑；提交前试算与正式创建都改为显式传递 `employeeId`。
34. 推荐的数据层收口方式：
   - 保留 `leave_requests.employee_id` 作为申请对象员工主键；
   - 新增 `submitted_by_user_id`（或 `created_by_user_id`）记录当前操作账号，确保后续审批、审计、责任追溯有据可查；
   - 现阶段不建议再要求目标员工必须存在 user 账号，这与“无账号动态人员也可申请”的目标相冲突。
   - 已执行结果：`server/models/leave.go` 已新增 `submitted_by_user_id`；`db/db.go` 已增加历史回填逻辑，用 `users.employee_id -> leave_requests.employee_id` 反查补齐旧单据的提交人。
35. 推荐的接口与查询语义重命名：
   - 前端 query key 从 `leaves.my()` / `leaves.statsMy()` 调整为更中性的 `leaves.list()` / `leaves.stats()` 或等价命名；
   - 后端路由可继续沿用 `/leaves` 前缀，但应去掉 `/my` 这种本人语义，避免后续误导；
   - 若本轮范围受控，也可以先保留旧 URL 但内部语义改为“当前操作者可见的请假单列表”，同时在代码和文档中去掉 `My` 命名，后续再清理接口路径。
   - 已执行结果：前端 query key 已切到 `leaves.list()` / `leaves.stats()`；前端服务名、页面查询名、详情/列表 fallback 文案已去本人语义；后端当前保留 `/leaves/my` URL 仅作兼容路径，但内部逻辑已切为“当前操作者代提交的请假单”。
36. 本轮建议的最小可行落地顺序：
   - 第一步：后端模型与 handler/service 输入改造，打通 `employeeId + submitted_by_user_id` 建单链；
   - 第二步：前端弹窗接入员工档案选择器，移除“当前账号必须绑定员工”的阻塞提示；
   - 第三步：列表、详情、统计与 query key 去本人语义化，至少保证 UI 不再继续显示“仅支持本人申请”的错误文案；
   - 第四步：补回归测试，覆盖“无账号员工可被代提请假”的核心场景。
   - 已执行结果：上述四步均已完成；当前已通过 `pnpm exec tsc --noEmit --pretty false` 以及 `go test ./services ./handlers -run Leave` 定向验证。
37. `/trading/sales-orders` 当前异常现象是：页面打开后立即显示“重试”，且用户观察到没有任何后端请求动作与服务端错误日志。结合现有代码，错误态来自 `src/features/trading/components/sales-order-list-fixed.tsx` 中的 `if (isError)` 分支，而不是路由级 fallback。
38. 已确认该页主数据链为：
   - `SalesOrderList` 调用 `useGetSalesOrders(page, pageSize)`；
   - `useGetSalesOrders` 通过 React Query 执行 `getSalesOrders(...)`；
   - `getSalesOrders` 最终调用 `apiFetch('/sales-orders?...')`；
   - 因此若页面“零请求直失败”，高概率断点在真正 `fetch(...)` 之前，例如 `apiFetch` 的前置认证拦截、query 初始化阶段异常，或请求函数参数构造阶段抛错。
39. 进一步校验后，简单的 “auth hydration 竞态” 不是最强根因：
   - `src/routes/_authenticated/trading/route.tsx` 已在 `beforeLoad` 中执行 `ensureAuthenticatedRouteSession(location.pathname)`；
   - `ensureAuthenticatedRouteSession()` 内部明确 `await waitForAuthHydration()`，随后才检查 `accessToken`；
   - 因此按当前路由设计，交易模块子页理论上不应在 auth persist 尚未 hydration 完成时就直接进入页面并发起列表查询。
40. 当前更接近根源的判断是“请求架构 + 错误呈现架构”双重问题，而不是 sales-orders 业务模型本身：
   - `src/lib/api-client.ts` 把 auth gate、circuit breaker 等失败都设计成可在真正 `fetch` 之前直接 `throw`；
   - `src/features/trading/components/sales-order-list-fixed.tsx` 又把所有 query error 压缩成一个无上下文的“重试”空态，既不展示 `error.message`，也不提供分类反馈；
   - 于是只要出现任何前置短路（auth gate、breaker、客户端契约异常等），用户侧看到的就都会是“页面直接重试、没有网络请求、服务端没有日志”。
41. 因而该问题更适合归类为架构问题，具体是：
   - **请求层职责过重**：`apiFetch` 同时承担 transport、auth gate、breaker、错误格式化；
   - **页面层错误语义过弱**：列表页没有把 query error 细分为未认证、短路保护、网络超时、后端 4xx/5xx、响应契约异常；
   - **可观测性断层**：真正的错误只在前端 logger 内部，页面与用户面完全看不到，导致排查时误判成“后端没动作”。
42. 如果后续进入修复，正确方向不应是单点补丁，而应做结构性收口：
   - 明确哪些错误允许在 `fetch` 前短路，以及这些错误如何统一向页面暴露；
   - 页面至少需要显示或上报真实错误类别，不能继续把所有 query error 一律压成“重试”；
   - 再根据实际短路类型（auth / breaker / contract）决定是否需要对子页 query 增加更明确的 ready 条件或错误边界。
43. 本轮建议的结构性修复方案：
   - **请求层收口**：改造 `src/lib/api-client.ts`，把当前混杂的裸 `Error` 抛出改为带结构化字段的统一错误对象/类型守卫，至少携带 `kind` / `status` / `code` / `message` / `endpoint` 等最小信息；
   - **错误解析层收口**：新增或复用前端错误解析工具，把 `apiFetch` 产生的 auth / breaker / timeout / network / http / contract 错误映射为页面可消费的稳定语义；
   - **页面层收口**：`src/features/trading/components/sales-order-list-fixed.tsx` 不再直接用一个“重试”块兜所有错误，而是消费统一错误语义，至少展示真实错误消息，并对未认证/短路保护/网络失败分别给出不同反馈；
   - **同构场景复核**：检查 Trading 其他列表页是否采用同样的 `isError -> retry` 空态，如果是，则优先抽一个 Trading 共享错误态或共享错误解析器，避免修一处漏多处。
   - 已执行结果：`src/lib/api-error.ts` 已落地，`apiFetch` 与 `api-response` 已改为抛结构化错误；`sales-order-list-fixed.tsx` 已切到共享 `TradingQueryErrorState`，能够显示具体错误原因而不是只有“重试”。
44. 预期修改文件（初步）：
   - `src/lib/api-client.ts`
   - `src/lib/error-status.ts` 或新增错误解析工具文件
   - `src/features/trading/components/sales-order-list-fixed.tsx`
   - 视复用情况，可能新增一个 Trading 共享 query error 组件/工具文件
   - 已执行结果：实际新增/修改文件为 `src/lib/api-error.ts`、`src/lib/api-client.ts`、`src/lib/api-response.ts`、`src/lib/error-status.ts`、`src/lib/handle-server-error.ts`、`src/features/trading/components/trading-query-error-state.tsx`、`src/features/trading/components/sales-order-list-fixed.tsx`、`src/main.tsx` 及 sales-order 本地化文案文件。
45. 风险与边界：
   - 这是请求层公共能力改造，影响面不止 sales-orders，因此必须尽量保持向后兼容，避免误伤其它已依赖 `status` / `isConflict` 的页面；
   - 本轮目标是“让错误真实可见且语义可判定”，不是顺手重写整个请求层；
   - 若发现 Trading 之外也大面积复用相同反模式，本轮仍先以 sales-orders + 最小共享抽象收口，不在一次任务里全仓重构。
   - 已执行结果：当前改造保留了原有 `status` / `isConflict` 字段，`main.tsx` 的 React Query retry 仅额外对 `auth_required / circuit_breaker / invalid_response` 关闭重试，保持现有 401/403/409 分支兼容。
46. 验证标准：
   - 正常登录态下，`/trading/sales-orders` 首屏能真实发起 `/sales-orders` 请求；
   - 若请求前被短路，前端 UI/控制台能看到明确错误原因，不再只显示“重试”；
   - `pnpm exec tsc --noEmit --pretty false` 通过；
   - 定向页面或相关测试验证通过，且不引入现有 409/403 等状态处理回归。
   - 已执行结果：`pnpm exec tsc --noEmit --pretty false` 与目标文件 eslint 已通过；页面层已具备对短路/网络/契约错误的结构化暴露能力。由于当前未自动化浏览器点击验证，本地最终视觉确认仍建议在 `/trading/sales-orders` 页面手动刷新一次检查。

47. 当前新增阻塞：登录 `502 Bad Gateway`
   - 现象：登录页 `UserAuthForm` 已输出 `[AUTH_DIAG] LOGIN_ATTEMPT` 与 `[AUTH_DIAG] LOGIN_RESPONSE_FAILED`，说明前端请求已经发出，不是此前 sales-orders 那类“请求前短路”；浏览器侧拿到的是 `502`，且无后端 `requestId`。
   - 已确认链路：当前前端同源 `/api` 会被 Vite 代理到 `http://localhost:8080`；该地址并非缺失服务，而是项目 Docker full stack 的 `xdfc-nginx-lb`。
   - 已确认上游状态：`docker ps` 显示 `server-app-1` / `server-app-2` 持续 `Restarting`，因此 nginx 返回 `502` 的本质是后端 app 上游不可用。
   - 已确认启动失败根因：`server/db/db.go` 的 `backfillLeaveRequestSubmittedByUsers()` 在启动迁移阶段执行历史回填时，使用 `u.employee_id = lr.employee_id` 比较，触发 PostgreSQL `character varying = uuid` 类型不匹配，应用直接 `log.Fatal` 退出。
48. 本轮建议的最小修复方案（待审批后执行）：
   - **只修启动阻塞点，不扩写业务语义**：收口 `server/db/db.go` 中请假单 `submitted_by_user_id` 的历史回填 SQL，使其在旧库 `employee_id` 字段类型不一致时仍能安全执行；
   - **保持迁移幂等**：只在 `submitted_by_user_id IS NULL` 的历史数据上补齐，不扩大更新范围；
   - **优先显式同型比较**：将 `users.employee_id` 与 `leave_requests.employee_id` 转为兼容可比较的统一类型，再进行匹配，避免 PostgreSQL 在启动期直接抛 `42883`；
   - **不顺手改登录前端**：本轮不改 `UserAuthForm`、不改 Vite 代理口径，因为前端链路已证明只是被动暴露后端 `502`。
   - 已执行结果：`server/db/db.go` 已将历史回填条件调整为 `NULLIF(BTRIM(u.employee_id), '') = CAST(lr.employee_id AS text)`，把 `varchar` 与 `uuid` 的直接比较收口为文本同型比较。
49. 预期修改文件（本轮）：
   - `server/db/db.go`
   - 若验证过程需要，可能补充 `task.md` / `walkthrough.md` 记录本次修复结果，但不额外扩散到其它业务文件。
50. 风险与边界：
   - 该修复位于后端启动迁移阶段，任何 SQL 误改都会影响整个 app 容器启动，因此必须保持最小改动；
   - 当前已知历史库存在字段类型不一致现象，本轮目标是让回填逻辑兼容这种现实数据形态，而不是在一次任务里重构整套请假表结构；
   - 若修复后仍有其它启动失败项，再按“逐个解阻塞”的方式继续，不把本轮范围扩大成 full stack 总体重构。
   - 已执行结果：本轮仅修改 `server/db/db.go` 一处启动回填 SQL，没有扩散到登录前端、路由代理或请假业务处理链。
51. 验证标准（本轮）：
   - `server-app-1` / `server-app-2` 不再持续重启；
   - `http://localhost:8080/api/v1/health` 返回 200，而非 nginx `502`；
   - 登录接口 `POST /api/v1/auth/login` 不再返回 `502`；
   - 如可行，补一次后端定向编译或启动验证，确保本次修复没有引入新的语法/编译问题。
   - 已执行结果：`go test ./db -run ^$` 与 `go test ./models -run ^$` 通过；`docker compose --env-file .env.dev -f docker-compose.yml up -d --build app nginx_lb` 已成功完成，当前 `server-app-1` / `server-app-2` 均为 `healthy`，`http://localhost:8080/api/v1/health` 已返回 200。为避免额外消耗登录限流窗口，本轮未主动再打一次登录 POST，但造成 `502` 的后端启动阻塞已被解除。

52. 当前新增问题：`/leave-management` 与 `/hall-of-fame` 缺失通用顶栏和通用 TAB 栏
   - 现象：两个页面能进入业务内容，但没有人员中心模块的通用 `Header` 与 `ModuleTabs`，视觉上像“脱离模块布局的孤页”。
   - 已确认根因：当前 `src/routes/_authenticated/leave-management.tsx` 与 `src/routes/_authenticated/hall-of-fame.tsx` 直接挂在 `/_authenticated` 下；其父级仅有 `AuthenticatedLayout`，不会经过 `src/routes/_authenticated/personnel/route.tsx` 中的 `ModuleTabbedLayout`。
   - 已确认布局提供点：通用顶栏与通用 TAB 栏由 `src/components/layout/module-tabbed-layout.tsx` 统一渲染；该布局内部固定输出 `Header` 与 `ModuleTabs`，因此问题不在页面内容组件本身，而在路由挂载层级。
   - 已确认配套缺口：`src/features/org-personnel/tabs.ts` 当前未包含 `/leave-management` 与 `/hall-of-fame` 的 TAB 定义；若仅调整路由层级而不补齐 tabs，激活态与模块导航仍会缺失。
53. 本轮建议的最小修复方案（待审批后执行）：
   - **收口到人员中心模块布局**：让 `/leave-management` 与 `/hall-of-fame` 复用 `/personnel` 模块的 `ModuleTabbedLayout`，而不是继续作为顶级 `_authenticated` 子路由裸渲染；
   - **保持既有对外 URL 不变**：优先在路由层做布局归并或布局包裹，尽量不改变用户当前访问地址，避免影响侧边栏、搜索和权限映射；
   - **同步补齐人员中心 tabs**：在 `src/features/org-personnel/tabs.ts` 中加入这两个页面的入口，确保顶部 TAB 可见且激活态按当前 URL 正确匹配；
   - **避免重复 Header**：若最终采用页面级包裹而非路由迁移，必须确保不会与 `AuthenticatedLayout` 或子布局叠出双 Header。
   - 已执行结果：本轮采用“页面级布局包裹 + 路由文件瘦身”方案，新建 `src/features/org-personnel/components/leave-management-route-page.tsx` 与 `src/features/org-personnel/components/hall-of-fame-route-page.tsx` 作为独立页面组件承载 `ModuleTabbedLayout`；原顶级路由文件仅负责引用对应页面组件，因此既保留了 `/leave-management` 与 `/hall-of-fame` 的既有 URL，也避免了路由文件内直接声明组件触发 Hook / Fast Refresh 规则冲突。
54. 预期修改文件（本轮）：
   - `src/routes/_authenticated/leave-management.tsx`
   - `src/routes/_authenticated/hall-of-fame.tsx`
   - `src/features/org-personnel/tabs.ts`
   - 如需更稳妥地复用布局，可能涉及 `src/components/layout/module-tabbed-layout.tsx` 或 `src/routes/_authenticated/personnel/route.tsx`，但目标是最小修改。
   - 已执行结果：实际修改为 `src/routes/_authenticated/leave-management.tsx`、`src/routes/_authenticated/hall-of-fame.tsx`、`src/features/org-personnel/tabs.ts`，并新增 `src/features/org-personnel/components/leave-management-route-page.tsx`、`src/features/org-personnel/components/hall-of-fame-route-page.tsx` 两个页面组件文件；未改动 `ModuleTabbedLayout` 和人员中心父路由本身。
55. 风险与边界：
   - 这两个页面当前是顶级可访问 URL，修复时不能顺手改掉现有侧边栏、搜索索引、权限路径 `/leave-management` 与 `/hall-of-fame`；
   - 如果直接改路由父子关系，需要留意 TanStack Router 生成树、重定向别名 `/personnel/leave` 与 `/personnel/stats` 的兼容性；
   - 本轮只解决“缺失通用顶栏和通用 TAB 栏”的布局挂载问题，不扩大为整个人员中心路由体系重构。
56. 验证标准（本轮）：
   - `/leave-management` 与 `/hall-of-fame` 页面恢复通用 `Header`；
   - 顶部出现人员中心统一 `ModuleTabs`，并且当前页签激活态正确；
   - 不出现双 Header、双 Tabs 或布局间距异常；
   - 原有 URL、侧边栏入口、搜索入口仍可正常进入页面。
   - 已执行结果：`pnpm exec tsc --noEmit --pretty false` 通过；`pnpm exec eslint src/routes/_authenticated/leave-management.tsx src/routes/_authenticated/hall-of-fame.tsx src/features/org-personnel/components/leave-management-route-page.tsx src/features/org-personnel/components/hall-of-fame-route-page.tsx src/features/org-personnel/tabs.ts` 通过。由于本轮未启动浏览器预览，UI 最终呈现仍建议你本地打开 `/leave-management` 与 `/hall-of-fame` 目视确认顶栏、TAB 与激活态。

57. 当前新增问题：物流接口平台页与物流供应商目录页数据源分叉
   - 现象：`/logistics-settings/platforms` 页面当前为空时，会显示“暂无物流接口配置”；但 `/logistics-config/suppliers` 仍固定显示顺丰速运、京东物流、17TRACK 等卡片，给人一种“系统里已经配置了这些物流平台”的错觉。
   - 已确认路由关系：`/logistics-settings/platforms` 与 `/logistics-config/platforms` 当前实际都复用 `src/features/logistics-config/platforms-tab.tsx`，属于同一个“物流接口平台配置页”。
   - 已确认真实数据源：平台配置页内部的 `LogisticsSandboxDashboard` 通过 React Query 调用 `/logistics-push/providers`，后端落到 `server/handlers/logistics_push.go` 和 `server/models/logistics_push.go` 的 `LogisticsAPIProvider` 表，属于真实可持久化的 API 平台配置。
   - 已确认静态目录来源：`/logistics-config/suppliers` 的 `src/features/logistics-config/supplier-directory-tab.tsx` 直接渲染前端常量 `ENTRIES`，其中顺丰、京东、17TRACK 的名称、网址、联系人、电话、备注均写死在前端文件内，不来自任何后端接口。
58. 已确认问题根因
   - **数据源分叉**：平台页使用真实后端表 `LogisticsAPIProvider`；供应商目录页使用前端硬编码常量 `ENTRIES`；两页没有共享单一事实来源。
   - **模板与目录分裂**：平台页新增弹窗使用另一套前端模板常量 `LOGISTICS_TEMPLATES` 预填名称、编码、endpoint；该模板集与供应商目录页 `ENTRIES` 也不是同一个结构，因此同一承运商信息会在两个文件里各自维护。
   - **编辑链不完整**：后端 `SaveLogisticsProviderHandler` 实际支持按 `id` 更新已有 `LogisticsAPIProvider`，但前端平台页没有“编辑已有 provider”入口，只提供新增 / 删除；供应商目录页更是完全没有任何 mutation。
   - **后续不会自动同步**：如果后面真实接入顺丰、京东、17TRACK API，只会反映到 `/logistics-push/providers` 这条平台配置链，`/logistics-config/suppliers` 仍会继续显示旧静态卡片，除非手动再改前端常量。
59. 影响范围
   - 用户会误以为 `/logistics-config/suppliers` 中出现的卡片代表“系统已建档、可编辑、可对接”的真实平台；
   - 运营同事无法从该页判断哪些平台只是目录占位、哪些平台已真正完成 API 接入；
   - 后续若多次接入/修改实际 API 凭证、endpoint、联系人等信息，前端两处静态模板和真实表容易长期漂移，形成维护成本和错误认知。
60. 建议的收口方案（待审批后执行）
   - **页面职责调整为“目录 + 记录”**：`/logistics-config/suppliers` 保留卡片化目录页，但不再伪装成真实 API 配置页；它应承载“联系人、电话、网站、备注、人工记录”等业务记录能力。
   - **显式展示 API 接入状态**：每张卡片必须明确标出“已接 API / 未接 API”，并在未接入时展示提示文案，避免用户把目录卡片误认为已完成真实平台对接。
   - **提供跳转入口**：对于已存在或可建立平台配置的承运商卡片，需要提供直达 `/logistics-settings/platforms` 或对应平台配置弹窗/页面的入口，帮助用户从目录页跳转到真实配置页。
   - **模板直选同步**：对于顺丰、京东、17TRACK 等已经在 `LOGISTICS_TEMPLATES` 中定义的平台，目录卡片创建时应优先从模板或真实 `LogisticsAPIProvider` 同步基础信息（名称、编码、默认 endpoint / 接入状态），而不是重复纯手工录入。
   - **允许手工补充但不允许无约束重复**：对“尚未接 API”的物流方允许人工创建目录卡片，但必须设置去重约束（至少基于 code / name 归一匹配），防止同一承运商被多次手工录入。
   - **补齐平台编辑闭环**：真实平台配置链仍需补齐“编辑已有 Provider”能力，让目录页跳转过去后可以继续维护 endpoint、凭证、状态等字段。
   - 已执行结果：本轮已将 `/logistics-config/suppliers` 改为直接读取 `/logistics-push/providers` 的真实数据源，不再使用前端静态 `ENTRIES`；目录页现在支持模板直选同步、自定义联系人/电话/网站/备注维护、API 状态提示与跳转到平台配置页。
61. 预期修改文件（待审批后执行）
   - `src/features/logistics-config/supplier-directory-tab.tsx`
   - `src/features/logistics-config/platforms-tab.tsx`
   - `src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx`
   - 可能新增/调整 `src/features/logistics-config` 下的 service / hook / adapter 文件，用于把页面从静态常量迁到真实数据源
   - 如需后端补字段或单独拆“物流供应商目录”模型，可能涉及 `server/handlers/logistics_push.go`、`server/models/logistics_push.go` 或新增专门 handler / model，但应以最小必要改动为目标
   - 倾向新增独立的“目录卡片数据层”文件，而不是把模板、状态映射、去重逻辑继续堆在单个页面组件里。
   - 已执行结果：实际修改为 `src/features/logistics-config/supplier-directory-tab.tsx`、`src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx`、`src/features/sandbox/logistics-api/types.ts`、`server/models/logistics_push.go`、`server/handlers/logistics_push.go`，并新增 `src/features/logistics-config/provider-directory.ts`；平台容器 `platforms-tab.tsx` 本身无需调整。
62. 验证标准（本轮待实施）
   - 用户能在 `/logistics-config/suppliers` 上清楚区分“目录记录信息”和“真实 API 对接状态”；
   - 顺丰 / 京东 / 17TRACK 等模板型承运商创建目录卡片时，能直接带出基础信息，减少重复录入；
   - 未接 API 的卡片会明确显示“未对接 API”，并提供去平台配置页的引导；
   - 已接 API 的卡片能跳转到真实平台配置，且目录页不会出现同一承运商的重复建档；
   - 平台页已有 Provider 支持编辑，避免只能新增/删除导致后续维护断链。
   - 已执行结果：`pnpm exec eslint src/features/logistics-config/supplier-directory-tab.tsx src/features/logistics-config/provider-directory.ts src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx src/features/sandbox/logistics-api/types.ts src/locales/messages/zh-CN/logisticsConfig.ts src/locales/messages/en-US/logisticsConfig.ts` 通过；`pnpm exec tsc --noEmit --pretty false` 通过；`go test ./handlers -run TestNonExistent -count=1` 已通过 handlers 定向编译校验。仍建议你在浏览器中目视确认目录卡片新增/编辑、API 状态标记和页面跳转体验。

63. 下一阶段物流强化重点（已由你确认优先级）
   - **接入健康度**：当前页面只有“已接 API / 未对接 API”的粗粒度状态，还缺少“最近验证成功 / 已建档未验证 / 最近异常 / 已停用”这类能支撑运维判断的健康度信息。
   - **验证闭环**：当前可以保存 endpoint 和凭证，但缺少手动测试连接、签名校验、认证校验以及最近测试结果回写能力，导致“保存成功 ≠ 平台可用”。
   - **引用保护**：当前 Provider 已能被真实业务链消费，但还没有明确的删除保护 / 改码保护；后续若被订单、轨迹或补偿任务引用，再误删或改 code 会直接破坏历史链路。
   - **能力标签**：当前系统默认所有物流平台是同质的，但成熟 ERP 会区分平台是否支持 `tracking / callback / label / order_create` 等能力；这有助于后续业务调用与页面提示不再误判。
   - **目录/接口信息分区**：虽然当前已经统一到单一数据源，但页面上仍需进一步把“联系人、电话、网站、备注”与“endpoint、凭证、验证结果、技术状态”做清晰分区，降低业务和运维的认知混淆。
64. 设计目标（下一阶段）
   - **让状态可运维**：用户不止知道“有没有建卡”，还要能一眼看出“这个平台现在能不能正常调用”；
   - **让错误可恢复**：当认证失败、endpoint 不通、额度不足、签名异常时，系统能给出可操作的恢复路径，而不是统一报“接口失败”；
   - **让历史不断链**：平台一旦被业务引用，关键标识和删除动作就要受到保护；
   - **让新增平台成本可控**：后续再增加一个物流平台时，尽量通过模板注册 + 能力标签 + 统一状态模型接入，而不是散点改很多文件；
   - **让页面职责更清晰**：目录页强调业务记录与协同，平台页强调接口配置与可用性验证，两者共享同一数据源但展示侧重点不同。
65. 建议实施顺序（下一阶段）
   - **P0-1 接入健康度模型**：在 `LogisticsAPIProvider` 中增加最近验证状态、最近验证时间、最近错误摘要等字段，并在页面上可视化展示；
   - **P0-2 测试连接 / 验证闭环**：提供手动测试入口，校验 endpoint 连通性、认证/签名有效性和响应结构，并把结果持久化；
   - **P0-3 引用保护**：为删除、停用、改码增加业务引用校验，优先从“硬删除”收口为“停用/归档”；
   - **P1-1 能力标签**：为模板和 Provider 增加能力清单，支持页面显示与后续业务调用分流；
   - **P1-2 信息分区**：重构目录页与平台页的展示布局，把目录信息和接口信息显式拆区呈现。
66. 预期修改范围（下一阶段待审批后执行）
   - `server/models/logistics_push.go`
   - `server/handlers/logistics_push.go`
   - 如需真实验证逻辑，可能新增 `server/services` 或 `server/sandbox/logistics` 下的 provider validation/service 文件
   - `src/features/logistics-config/provider-directory.ts`
   - `src/features/logistics-config/supplier-directory-tab.tsx`
   - `src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx`
   - `src/features/sandbox/logistics-api/types.ts`
   - 可能补充相应的 locale 文案与定向测试/编译校验
67. 范围边界（下一阶段）
   - **本轮不做** 审批流、智能路由引擎、复杂 BI 看板、多平台自动择优派单；
   - **本轮聚焦** 平台可用性、维护闭环、数据保护与展示清晰度；
   - 若真实第三方 API 需要外部密钥或网络环境，本轮优先先打通框架和状态机，不强行接入所有外部平台。
68. 第二轮细化目标（待审批后执行）
   - **让状态判定更准**：不是简单继续增加字段，而是把验证状态与平台模板、能力标签、停用状态、必填字段绑定，减少“状态看起来健康，但其实只是命中了宽松条件”的误判。
   - **让测试连接更像 ERP 运维工具**：当前验证链已经具备最小闭环，但结果仍偏通用；第二轮要把“失败原因 + 下一步动作”做得更可执行，帮助用户快速修复配置。
   - **让保护提示更前置**：当前引用保护主要由后端兜底；第二轮要把“为什么不能删 / 不能改”前移到前端交互层，降低误操作成本。
   - **让能力标签更可感知**：能力标签现在已经有了数据结构和基础 UI，但还需要更直接地作用到列表卡片、状态提示和使用认知上。
   - **让信息分区更稳定易读**：目录信息与接口信息虽然已拆开，但文案仍可进一步压缩为更适合 ERP 日常维护的表达方式。
69. 第二轮细化范围（待审批后执行）
   - **验证状态机收紧**：
     - 按模板/平台能力定义更严格的必填项校验；
     - 明确区分“endpoint 可达”与“配置完整、可继续联调”的语义；
     - 对 Disabled Provider 的展示和测试行为做更一致的处理。
   - **测试连接结果细化**：
     - 统一错误分类（配置错误 / 网络错误 / 平台异常 / 认证待补 / 停用）；
     - 对常见模板平台输出更明确的修复提示；
     - 如无法真正认证，则至少给出“当前只是网络探测，不代表平台业务认证已通过”的清晰提示。
   - **引用保护交互细化**：
     - 删除按钮前增加风险提示；
     - 若关键编码变更存在历史引用风险，编辑态就提前提示；
     - 对“建议停用/归档”的用户动作给出更明确引导。
   - **能力标签联动细化**：
     - 目录卡片上直观展示核心能力组合；
     - 平台页在编辑时让能力标签与模板默认值关系更清楚；
     - 为后续业务按能力选平台保留稳定契约。
   - **信息分区与文案细化**：
     - 收口“未配置 / 未验证 / 已停用 / 最近异常 / 配置不完整”的中文文案；
     - 减少重复提示，避免页面同时出现多个相近状态描述造成噪音；
     - 对目录页与平台页分别保留最需要的提示，不做机械复制。
70. 建议实施顺序（第二轮，待审批后执行）
   - **P0-1** 收紧验证状态机与结果分类；
   - **P0-2** 细化测试连接结果摘要与下一步动作提示；
   - **P1-1** 前移删除/改码风险提示；
   - **P1-2** 加强能力标签的列表化展示与模板联动；
   - **P1-3** 清理目录页 / 平台页重复和冗余文案。
71. 预期修改范围（第二轮待审批后执行）
   - `server/services/logistics_provider_validation_service.go`
   - `server/handlers/logistics_push.go`
   - `server/models/logistics_push.go`（如需补充状态字段枚举或统计字段）
   - `src/features/logistics-config/provider-directory.ts`
   - `src/features/logistics-config/supplier-directory-tab.tsx`
   - `src/features/sandbox/logistics-api/components/logistics-sandbox-dashboard.tsx`
   - 可能补充 `src/locales/messages/zh-CN/logisticsConfig.ts` 与 `en-US/logisticsConfig.ts`
72. 第二轮边界（待审批后执行）
   - **仍不做** 审批流、自动择优平台、复杂成本策略、BI 看板；
   - **仍坚持** React Query 作为前端服务端真相入口，不回退到局部 `useEffect + useState` 拉数；
   - **仍坚持** 以后端状态为准，前端只做前置提示和展示增强，不自建另一套判定真相。

#### 当前仍待收尾

1. 权限树自动同步的真实新增路由代码链路已验证闭环；如需最终 UI 结论，仅剩在本地浏览器中目视确认账号权限弹窗 / 系统管理权限树是否已出现 `/basic-settings/permission-tree-smoke` 对应节点。
2. 当前这批 `current_problems` 样式告警已完成等价替换与定向回归；若 IDE 刷新后仍有残留，需要再基于最新告警列表做增量清理。
3. 中文实施文档已补充本轮结果，但最终收尾前仍需再统一复核一次所有 `roleBindings / effectiveRoles / primaryRoleId` 历史术语是否只剩兼容说明，不再形成错误引导。

### 17.1 目标

1. 评估当前权限体系为何显得复杂。
2. 评估是否可以改为“直接选用户给权限，最终只读用户权限”的单点模型。
3. 给出可执行的收口方案与风险判断。

### 17.2 当前权限体系现状

1. 权限定义层：
   - 前端以 `src/features/authz/data/permission-catalog.ts` 作为权限清单源头。
   - 路由/菜单访问最终还是归一到 permission id 判定。
2. 权限模板层：
   - `roles` 承载权限集合，前端角色管理位于 `src/features/system-mgmt`。
   - 角色不是单一来源，还承担组织/部门权限模板的历史兼容职责。
3. 用户生效层：
   - 用户页当前主要是绑定角色，不是直接编辑 permission id。
   - 后端会从 `user_roles`、`employee_roles`、`position_roles`、`org_default_roles`、历史 `user.role`、历史部门角色推导等多层来源合并出 `effectiveRoles` 和 `permissions`。
4. 鉴权执行层：
   - `server/middleware/auth.go` 在请求进入时解析用户快照。
   - `server/middleware/authorization.go` 最终按 `permissions` / `roles` 做访问判断。

### 17.3 为什么你会觉得“过于复杂”

1. 当前模型不是“用户 -> 权限”单跳，而是“用户 -> 多类角色绑定/组织映射 -> 有效角色 -> 权限”。
2. 为兼容历史组织角色，还存在 `org_{deptId}` 这类部门角色家族推导。
3. 同一个用户的访问结果可能受到员工档案、部门、岗位、默认组织角色、显式绑定角色、历史字段等多源共同影响。
4. 这会带来两个真实问题：
   - 排错成本高：为什么某人有/没有权限，需要沿多条链路回溯。
   - 心智负担高：业务管理员不容易理解“最终是谁在决定权限”。

### 17.4 “纯用户直赋权”方案的优点

1. 模型直观：用户拥有什么权限，一眼可见。
2. 排错简单：最终只看用户，不再追角色、部门、岗位推导。
3. 单点覆盖明确：不会出现“部门又给了一份、角色又带来一份”的来源分散问题。

### 17.5 “纯用户直赋权”方案的主要代价

1. 批量管理能力下降：
   - 现在一个角色变更可影响一批人；纯用户直赋权后，需要逐人维护。
2. 组织治理能力下降：
   - 新员工入职、调岗、换部门时，系统难以自动继承基础访问范围。
3. 漂移风险更高：
   - 人越多，用户级权限越容易出现历史残留、口径不一致、同岗不同权。
4. 审计复杂度未必降低：
   - 虽然单个用户更直观，但全局看“谁应该拥有哪些权限”会失去模板约束。

### 17.6 更稳妥的建议：用户级覆盖优先，而不是彻底抛弃角色

建议方案：

1. 保留角色，继续作为“权限模板 / 批量分发工具”。
2. 新增用户显式权限层，例如：
   - `user_permission_grants`
   - `user_permission_denies`
3. 生效顺序收敛为：
   - 先取角色汇总权限
   - 再应用用户 `grant`
   - 最后应用用户 `deny`
4. 对外展示时明确分层：
   - “角色继承权限”
   - “用户额外授权”
   - “用户显式禁用”
   - “最终生效权限”

这样可以满足你的核心诉求：

1. 最终权限可落到用户单点确认。
2. 任何异常都能直接先看用户层覆盖，不必优先猜部门解析。
3. 仍保留批量授权与组织模板能力，不会把系统退化成大规模逐人打勾表。

### 17.7 若坚持走“只读用户、完全不解析部门”的影响范围

若选择彻底切到纯用户直赋权，至少需要处理：

1. 前端：
   - 新建用户权限编辑 UI，允许直接编辑 permission id
   - 重写用户管理页的权限展示与搜索/筛选能力
2. 后端：
   - 新增用户权限表与读写 API
   - 重写 `effective_access` / `identity_access` 汇总逻辑
   - 下线或冻结 `user_roles`、`employee_roles`、`position_roles`、`org_default_roles` 的生效职责
3. 数据迁移：
   - 需要把当前所有用户的有效权限快照回填成用户显式权限
   - 需要处理历史角色变更后的增量同步策略
4. 运维策略：
   - 新员工初始化授权
   - 离职/转岗授权回收
   - 同岗位批量调权

### 17.8 风险判断

1. 若直接一步切纯用户直赋权，改动面很大，且会碰到权限迁移、审计一致性、批量治理能力下降的问题。
2. 若采用“角色模板 + 用户覆盖优先”，可以先在不推翻现有权限清单和大部分角色体系的情况下，显著降低排错复杂度。
3. 从 ROI 看，方案B 更适合作为第一阶段落地。

### 17.9 当前建议

1. 不建议立刻删除角色 / 部门 / 岗位链路。
2. 建议先做“最终权限以用户层为准”的覆盖模型，把用户层变成真正的单点裁决入口。
3. 等覆盖模型跑稳、用户侧权限运营方式成熟后，再评估是否继续弱化角色与部门默认绑定。

### 17.10 暂停点

1. 当前仅完成架构分析与方案比较。
2. 待你确认以下方向后，再进入详细实施设计：
   - 方案A：纯用户直赋权
   - 方案B：角色模板保留，用户显式覆盖优先（推荐）

### 17.11 已确认决策

1. 你已明确选择方案A：纯用户直赋权。
2. 本轮后续设计将以“最终权限只从用户读取”为目标，不再把角色 / 部门 / 岗位链路继续作为长期生效来源。
3. 你已补充当前仍处测试阶段，因此倾向直接切换，不采用双轨并行，以避免两条链路相互打架并放大排错成本。

### 17.12 方案A目标架构

1. 权限主数据：
   - 保留现有 permission catalog，不改 permission id 体系。
2. 用户授权模型：
   - 新增用户显式权限表，直接按 `user_id + permission_id` 存储。
   - 后端鉴权时直接解析用户权限，不再依赖角色展开。
3. 角色/部门/岗位定位：
   - 第一阶段仅作为迁移来源与对照参考，不再作为最终裁决来源。
   - 后续阶段可逐步降级为“模板 / 历史展示 / 停用待清理”。

### 17.13 建议实施阶段（测试期直接切换）

#### 第一阶段：接入用户显式权限并完成迁移准备

1. 新增 `user_permissions` 数据表与读写 API。
2. 用户管理页补“直接编辑用户权限”能力。
3. 新增“根据当前 effective permissions 回填用户显式权限”的一次性迁移脚本。
4. 补齐切换前校验清单：
   - 用户总量与迁移记录数一致
   - 空权限用户清单可解释
   - `admin / superadmin` 语义确认完毕

#### 第二阶段：一次性回填并直接切换读取来源

1. 先执行用户显式权限回填。
2. 紧接着将 `auth.go` / `identity_access.go` / `effective_access.go` 改为最终只读用户权限表。
3. `authorization.go` 保持判定逻辑不变，但其输入改为用户显式权限。
4. `user_roles`、`employee_roles`、`position_roles`、`org_default_roles` 自切换时刻起停止参与鉴权计算。

#### 第三阶段：冻结历史链路，避免继续相互影响

1. 前端移除以角色绑定作为主要授权入口的交互。
2. 角色、部门、岗位权限关系改为只读或直接冻结，不再影响实际鉴权。
3. 若仍需保留角色，只允许其作为历史查看或辅助导入工具，不再作为实时生效来源。

#### 第四阶段：切换后短周期验证与收口

1. 验证核心账号、管理员账号、空权限账号、跨部门账号的实际访问结果。
2. 收口切换后首轮问题，并修正迁移脚本或用户权限数据。
3. 确认稳定后，再清理无用的历史生效逻辑与界面入口。

### 17.14 数据迁移原则

1. 迁移基线不是读角色定义本身，而是读“当前用户最终有效权限快照”。
2. 这样可以最大限度保证切换后用户拿到的权限与切换前一致。
3. 迁移时需要为每个用户保存：
   - `user_id`
   - `permission_id`
   - `source = migrated_effective_snapshot`
   - `migrated_at`
4. 管理员 / 超管需单独校验，避免历史 bypass 语义与显式权限表冲突。

### 17.15 风险与控制措施

1. 风险：批量调权能力下降。
   - 控制：保留一段时间的角色模板导入工具，用于批量生成用户权限草稿。
2. 风险：迁移不完整导致用户丢权限。
   - 控制：切换前执行一次性迁移校验；切换后保留最小化回退开关，可临时恢复旧链路读取。
3. 风险：新员工/调岗后不再自动继承权限。
   - 控制：补齐用户初始化授权流程，否则组织运营成本会上升。
4. 风险：审计语义变化。
   - 控制：保留迁移来源、操作日志、授权人、授权时间等审计字段。
5. 风险：测试期直接切换后问题集中暴露。
   - 控制：缩小首批验证范围，先覆盖关键测试账号与核心页面，再开放更大范围测试。

### 17.16 需要额外设计的点

1. `admin / superadmin` 是否继续保留 bypass，还是改为也写入显式用户权限。
2. 用户权限 UI 是直接树状勾选，还是先按模块分组再勾选。
3. 是否需要“从角色导入权限到用户”的一次性快捷操作，减轻初始化成本。
4. 用户离职、停用、转岗时，权限是否自动冻结或复制到新账号。

### 17.17 暂停点（待你审阅）

1. 当前已根据你的补充前提，把方案A调整为测试期直接切换方案，不再采用双轨并行。
2. 若你认可该方向，下一步我再继续细化：
   - 表结构草案
   - API 草案
   - 页面交互草案
   - 直接切换步骤与最小回退步骤
3. 在你明确批准前，不开始修改权限业务代码。

### 17.18 表结构草案

#### 17.18.1 新增主表：`user_permissions`

目标：

1. 让“用户拥有哪些权限”有唯一、直接、可审计的存储位置。
2. 切换完成后，鉴权只读取此表，不再展开角色 / 部门 / 岗位链路。

建议字段：

1. `id`
   - 类型：UUID / 继承现有 `BaseModel` 主键风格
   - 用途：单条授权记录标识
2. `user_id`
   - 类型：UUID / string
   - 非空
   - 语义：对应 `users.id`
3. `permission_id`
   - 类型：varchar(120)
   - 非空
   - 存储前统一转小写、去空格
   - 语义：对应 permission catalog 中的唯一 id
4. `source`
   - 类型：varchar(40)
   - 非空
   - 默认值：`manual`
   - 建议值：`manual`、`migrated_effective_snapshot`、`imported_role_template`、`seed_admin`
5. `granted_by`
   - 类型：UUID / string，可空
   - 语义：最后一次写入该权限的操作者账号 id
6. `reason`
   - 类型：varchar(200)，可空
   - 语义：本次授权原因，便于审计与排障
7. `batch_id`
   - 类型：varchar(64)，可空
   - 语义：批量迁移或批量导入时用于追踪同一批次
8. `created_at` / `updated_at` / `deleted_at`
   - 继承现有软删除风格

索引与约束建议：

1. 唯一活动约束：`(user_id, permission_id, deleted_at)` 对应的“活动记录唯一”语义。
2. 查询索引：
   - `(user_id, deleted_at)`：读取单用户权限集合
   - `(permission_id, deleted_at)`：反查某权限分配给了哪些用户
3. 服务层约束：
   - 不允许写入空 `permission_id`
   - 不允许写入 catalog 中不存在的 `permission_id`
   - 写入前统一做 normalize + dedupe

#### 17.18.2 明确不新增的业务表

1. 本轮**不新增**长期存在的 `user_permission_denies`。
   - 方案A目标是纯用户直赋权，最小模型只保留 grant，不引入第二层覆盖语义。
2. 本轮**不新增**长期并行快照表。
   - 因为你已明确不希望双轨并行长期共存。
3. 最小回退不靠第二套业务表实现。
   - 改为切换前导出一次性备份（SQL / JSON）与批次号记录。

### 17.19 后端模型与边界设计

建议新增或调整的后端边界：

1. `server/models/user_permission.go`
   - 定义 `UserPermission` 模型
2. `server/services/user_permission_service.go`
   - 负责：
     - 规范化 permission ids
     - 校验 permission id 是否存在于权限清单
     - 读取用户权限集合
     - 事务化替换用户权限集合
     - 从旧 effective snapshot 回填用户权限
3. `server/handlers/user_permissions.go`
   - 负责用户权限 API 输入输出，不把替换逻辑散落在 `users.go`
4. `server/middleware/auth.go`
   - 切换后只从 `user_permissions` 解析 `permissions`
5. `server/middleware/authorization.go`
   - 保持 `RequirePermissions(...)` 判定方式不变
   - 但应移除“只因 `role=admin/superadmin` 就自动放行”的角色 bypass，改为管理员账号也通过显式 permission set 获权

边界判断：

1. 用户管理仍归 `users` 资源域。
2. 用户权限是 `users` 的子资源，因此路径应落在 `/users/:id/permissions`。
3. 一次性迁移属于管理动作，仍建议挂在 `/users` 域下，而不是另起独立资源域。

### 17.20 API 草案

#### 17.20.1 `GET /users/:id/permissions`

用途：

1. 返回单个用户当前**显式权限集合**。
2. 作为用户权限编辑页的唯一读取接口。

响应建议：

```json
{
  "userId": "u_123",
  "username": "alice",
  "status": "active",
  "employeeId": "EMP001",
  "permissions": [
    {
      "permissionId": "menu_dashboard",
      "label": "访问：仪表盘",
      "desc": "允许进入系统主控台",
      "source": "manual",
      "grantedBy": "u_admin",
      "updatedAt": "2026-04-16T23:00:00Z"
    }
  ],
  "total": 1
}
```

说明：

1. `label` / `desc` 不从数据库冗余存储，实时由 permission catalog 映射生成。
2. 这样前端不需要再额外 join 角色或权限矩阵就能直接渲染。

错误码建议：

1. `400`：用户 id 非法
2. `404`：用户不存在
3. `403`：当前操作者无用户权限查看权

#### 17.20.2 `PUT /users/:id/permissions`

用途：

1. 作为**唯一权威写入接口**，整套替换单用户权限集合。
2. 因为方案A最终只看用户权限，所以写接口应表达“全量替换”语义，而不是多处零散 patch。

请求建议：

```json
{
  "permissions": [
    "menu_dashboard",
    "permission_user_view"
  ],
  "source": "manual",
  "reason": "test-phase direct authorization"
}
```

写入语义：

1. 后端事务内锁定目标用户。
2. 读取当前活动中的 `user_permissions`。
3. 对请求中的 `permissions` 做 normalize + dedupe。
4. 校验所有 `permission_id` 都是已知权限。
5. 计算 diff：
   - 新增：插入新记录
   - 保留：更新时间 / 来源可选是否刷新
   - 删除：对不再保留的权限做软删除
6. 返回替换后的最新集合。

响应建议：

```json
{
  "userId": "u_123",
  "permissions": ["menu_dashboard", "permission_user_view"],
  "changeSummary": {
    "added": 1,
    "removed": 2,
    "unchanged": 5
  }
}
```

为什么选 `PUT`：

1. 它与“用户权限集合是完整资源”这个语义一致。
2. 可避免多个 `POST / DELETE / PATCH` 接口在测试期来回打架。
3. 更符合你要的“单点覆盖、唯一真相源”。

#### 17.20.3 `POST /users/permissions/migrate-effective`

用途：

1. 一次性把当前旧链路算出的 `effective permissions` 回填到 `user_permissions`。
2. 仅用于切换前准备，不作为长期日常业务接口。

请求建议：

```json
{
  "userIds": ["u_123", "u_456"],
  "overwriteExisting": true,
  "includeInactiveUsers": false,
  "source": "migrated_effective_snapshot"
}
```

响应建议：

```json
{
  "batchId": "perm-migrate-20260416-230500",
  "totalUsers": 2,
  "migratedUsers": 2,
  "skippedUsers": 0,
  "failedUsers": 0,
  "failures": []
}
```

说明：

1. `overwriteExisting = true` 适合测试期直接切换。
2. 默认只迁移 active 用户，避免无效账号带来噪音。
3. 该接口需要 `PermissionManage` 级别权限。

### 17.21 兼容接口与冻结接口设计

#### 17.21.1 继续保留：`GET /users/:id/access`

保留原因：

1. 前端已有 access snapshot 消费点。
2. 测试期直接切换时，保留同一路径更利于平滑替换前端读取逻辑。

切换后语义：

1. `permissions`：直接来自 `user_permissions`
2. `primaryRoleId`：返回空字符串
3. `effectiveRoles`：返回空数组
4. `roleBindings`：返回空数组
5. `diagnostics`：可补充 `role_chain_disabled`、`user_permissions_authoritative`

#### 17.21.2 直接冻结：角色授权接口

切换完成后，以下接口不再参与真实授权：

1. `GET /users/:id/roles`
2. `POST /users/:id/roles`
3. `DELETE /users/:id/roles/:roleId`
4. `PATCH /users/:id/primary-role`

建议处理：

1. 在前端入口已切走后，后端直接返回 `410 Gone`
2. 错误体建议：

```json
{
  "error": "[DEPRECATED] role-based access disabled"
}
```

#### 17.21.3 用户基础接口的兼容收口

当前 `POST /users`、`PATCH /users/:id`、`PUT /users/:id` 仍带有 `role` 字段。方案A下建议：

1. `role` 从“必填且生效”降级为“兼容字段”。
2. 创建用户时不再因为缺少 `role` 而阻塞。
3. `syncUserRoleBinding(...)`、`syncEmployeeRoleBinding(...)`、`syncAccountRoleBindings(...)` 在切换后不再参与权限生效。
4. 旧 `users.role` 字段暂保留数据库列，但仅用于历史查看 / 数据过渡，不再被鉴权消费。

### 17.22 权限校验与鉴权切点设计

#### 17.22.1 已知权限校验

后端需要新增“permission id 是否存在”的统一校验函数，权威来源仍为现有 permission catalog / contract。

要求：

1. 未知 `permission_id` 一律拒绝写入，返回 `400`
2. 写入前统一 lower-case normalize
3. 服务层而不是 handler 层负责最终校验，避免多入口漂移

#### 17.22.2 登录与会话快照

切换后：

1. `GET /auth/snapshot` 中的 `permissions` 只来自 `user_permissions`
2. `effectiveRoles` 返回空数组
3. `role` / `primaryRoleId` 不再作为授权判断依据

这与当前前端权限同步逻辑兼容点在于：

1. 前端真正消费权限判定的核心仍是 `permissions`
2. 角色数组即使为空，也不影响菜单 / 页面权限判定，只需要同步清理依赖角色展示的 UI

#### 17.22.3 管理员语义

本轮建议做成：

1. `admin / superadmin` 不再因为角色名自动 bypass
2. 管理员账号在迁移时直接写入完整显式权限集
3. 这样才能满足“最终永远只读用户权限”的目标，不再残留隐藏特权链路

### 17.23 当前建议与剩余待细化项

当前已明确：

1. 单一主表：`user_permissions`
2. 单一核心读写接口：
   - `GET /users/:id/permissions`
   - `PUT /users/:id/permissions`
3. 单次迁移接口：
   - `POST /users/permissions/migrate-effective`
4. 兼容保留：
   - `GET /users/:id/access`
5. 切换后冻结：
   - `/users/:id/roles*`
   - `/users/:id/primary-role`

剩余待细化：

1. 用户权限编辑页 UI 草案
2. 前端 DTO / hook / query key 收口方案
3. 直接切换当天的执行顺序与回退操作手册

### 17.24 暂停点（待你审阅）

1. 当前已完成方案A的表结构与 API 设计细化。
2. 若你认可该设计，下一步我继续细化：
   - 前端页面与 DTO 设计
   - 直接切换执行顺序
   - 最小回退手册
3. 在你明确批准前，不开始修改权限业务代码。

### 17.25 前端页面设计

#### 17.25.1 页面定位

基于当前代码结构，建议不新开独立路由页面，而是先在 `src/features/users` 内完成“用户权限编辑”收口：

1. 用户列表页仍然是主入口：`src/features/users/index.tsx`
2. 当前行级操作中的“管理角色”入口，替换为“管理权限”入口：
   - 现位置：`src/features/users/components/data-table-row-actions.tsx`
   - 现 open key：`roles`
3. 当前弹窗 `UsersRoleBindingsDialog` 替换为新的 `UsersPermissionsDialog`
   - 宿主位置：`src/features/users/components/users-dialogs.tsx`

这样做的原因：

1. 用户管理员当前就在用户列表里操作账号，无需再跳转到系统管理页找角色矩阵。
2. 与方案A“最终只看用户”一致，授权动作应直接发生在用户上下文里。
3. 改造面最小，能复用当前 users provider / dialog 打开关闭机制。

#### 17.25.2 交互形态建议

建议优先采用**弹窗式用户权限编辑器**，而不是整页跳转：

1. 标题：`管理权限`
2. 副标题：显示当前用户名 / 员工号 / 状态
3. 顶部摘要区：
   - 用户名
   - 当前权限数
   - 最近更新时间
   - 数据来源标签（如 `manual` / `migrated_effective_snapshot`）
4. 主体分为两栏：
   - 左侧：权限树 / 模块分组
   - 右侧：已选权限摘要 + 搜索结果 / 快速统计
5. 底部操作：
   - `保存权限`
   - `重置未保存改动`
   - `关闭`

若保留现有工业风样式，建议继续沿用：

1. 圆角大弹窗
2. `border-dashed`
3. 顶部 icon + 说明区
4. 保存按钮使用高强调样式

#### 17.25.3 权限树复用策略

现有可复用资源：

1. `user-rights-desktop-matrix.tsx`
2. `user-rights-mobile-tree.tsx`
3. `buildPermissionTree(...)`
4. `permission-catalog.ts`

但不建议直接复用“角色矩阵”组件原样进入用户页，因为它当前以“多角色横向矩阵”为核心。建议收口为：

1. 新建用户态组件：
   - `user-permissions-desktop-tree.tsx`
   - `user-permissions-mobile-tree.tsx`
2. 复用已有的：
   - permission tree 数据结构
   - module / page / tab / action 分组规则
   - 展开 / 收起交互
3. 去掉角色列、多角色横向表头、role badge 编辑逻辑
4. 改为单用户单列勾选：
   - 每个 permission 节点只有一个 checkbox
   - 同时可显示“模块全选 / 页面全选”衍生状态

#### 17.25.4 搜索与可用性设计

用户权限规模可能较大，因此页面建议补以下能力：

1. 搜索框：支持按 `permissionId / label / desc / path` 搜索
2. 筛选开关：
   - 仅看已选
   - 仅看模块权限
   - 仅看动作权限
3. 快捷操作：
   - 全部展开
   - 全部收起
   - 清空当前选择
4. 变更提示：
   - 未保存改动时关闭弹窗前二次确认

#### 17.25.5 旧角色弹窗的替换策略

现状：

1. `UsersDialogs` 中挂的是 `UsersRoleBindingsDialog`
2. `data-table-row-actions.tsx` 中展示的是“manage roles”

切换建议：

1. 第一阶段：
   - 保留 `open === 'roles'` 这个 key，以减少 provider 变动
   - 但实际渲染从 `UsersRoleBindingsDialog` 改成 `UsersPermissionsDialog`
2. 文案层：
   - `manage roles` 改为 `manage permissions`
   - 所有 `roleBindings` 翻译文案逐步下线
3. 第二阶段：
   - 把 `roles` open key 重命名为 `permissions`
   - 清理旧角色管理相关 locale key

这样做可以先最小变更进入实施，再在后续清理命名债务。

### 17.26 前端 DTO / Hook / Query Key 设计

#### 17.26.1 新增 DTO

建议在 `src/features/users/contracts/user-api-dto.ts` 中新增：

1. `UserPermissionItemApiDTO`
   - `permissionId: string`
   - `label?: string`
   - `desc?: string`
   - `source?: string`
   - `grantedBy?: string`
   - `updatedAt?: string`
2. `UserPermissionsApiDTO`
   - `userId: string`
   - `username: string`
   - `status: 'active' | 'inactive' | 'suspended'`
   - `employeeId?: string`
   - `permissions: UserPermissionItemApiDTO[]`
   - `total: number`
3. `ReplaceUserPermissionsPayload`
   - `permissions: string[]`
   - `source?: string`
   - `reason?: string`
4. `MigrateEffectivePermissionsPayload`
   - `userIds?: string[]`
   - `overwriteExisting?: boolean`
   - `includeInactiveUsers?: boolean`
   - `source?: string`

#### 17.26.2 新增 schema

建议在 `src/features/users/data/schema.ts` 中新增：

1. `userPermissionItemSchema`
2. `userPermissionsResponseSchema`
3. `userPermissionsReplaceResultSchema`

注意：

1. 当前 `User` 上的 `role` 字段先不删除，只做兼容保留。
2. `UserAccessSnapshot` 也先不删，但切换后其 `roleBindings / effectiveRoles` 允许为空数组。

#### 17.26.3 新增 query key

建议在 `use-users.ts` 中新增：

1. `USER_PERMISSIONS_QUERY_KEY = ['users', 'permissions'] as const`
2. `USER_PERMISSIONS_MIGRATION_QUERY_KEY = ['users', 'permissions-migration'] as const`（若需要展示批次状态可保留）

保留现有：

1. `USER_ACCESS_SNAPSHOT_QUERY_KEY`
2. `USER_ROLE_BINDINGS_QUERY_KEY`

但切换后：

1. `USER_ROLE_BINDINGS_QUERY_KEY` 只用于过渡清理阶段
2. 新 UI 不再依赖它

#### 17.26.4 新增 hooks

建议在 `use-users.ts` 增加：

1. `useUserPermissionsQuery(userId, enabled)`
2. `replaceUserPermissionsMutation`
3. 可选：`migrateEffectivePermissionsMutation`

invalidate 规则建议：

1. 写入用户权限后，统一失效：
   - `USERS_QUERY_KEY`
   - `USER_PERMISSIONS_QUERY_KEY`
   - `USER_ACCESS_SNAPSHOT_QUERY_KEY`
2. 若仍保留旧 access 展示摘要，也要同步失效 access snapshot，避免顶部摘要滞后。

#### 17.26.5 user-api 收口建议

在 `src/features/users/services/user-api.ts` 中新增：

1. `fetchUserPermissions(id)` -> `GET /users/:id/permissions`
2. `replaceUserPermissions(id, payload)` -> `PUT /users/:id/permissions`
3. `migrateEffectivePermissions(payload)` -> `POST /users/permissions/migrate-effective`

并逐步下线：

1. `fetchUserRoleBindings`
2. `addUserRoleBinding`
3. `removeUserRoleBinding`
4. `setUserPrimaryRole`

### 17.27 前端页面落地建议

#### 17.27.1 新组件建议

建议新增：

1. `src/features/users/components/users-permissions-dialog.tsx`
2. `src/features/users/components/user-permissions-desktop-tree.tsx`
3. `src/features/users/components/user-permissions-mobile-tree.tsx`
4. `src/features/users/components/user-permissions-summary.tsx`

职责建议：

1. dialog：
   - 请求用户权限数据
   - 维护本地 draft
   - 处理保存 / 重置 / 关闭确认
2. desktop/mobile tree：
   - 纯展示 + toggle 事件转发
3. summary：
   - 显示数量、来源、变更统计、搜索命中数

#### 17.27.2 用户表格入口替换

建议修改：

1. `data-table-row-actions.tsx`
   - 图标可继续使用 `ShieldPlus`
   - 文案从“管理角色”改为“管理权限”
   - 点击后仍 `setOpen('roles')` 进入过渡态，后续再改 key
2. `users-columns.tsx`
   - `role` 列暂保留，但加规划说明：后续逐步替换为“权限数 / 授权状态”列

#### 17.27.3 access snapshot 顶部摘要调整

原角色弹窗顶部摘要有：

1. primary role
2. permissions count
3. effectiveRoles
4. diagnostics

切换后建议改成：

1. permissions count
2. source summary
3. diagnostics
4. last updated / last changed by

并删除：

1. `primaryRole`
2. `effectiveRoles`

### 17.28 测试阶段直接切换步骤

#### 17.28.1 切换前准备

1. 完成后端能力：
   - `user_permissions` 表
   - 读写 API
   - migrate-effective API
2. 完成前端能力：
   - 用户权限弹窗
   - 新 query / mutation
   - 旧角色入口替换
3. 预先导出回退材料：
   - `users.role`
   - `user_roles`
   - `employee_roles`
   - `position_roles`
   - `org_default_roles`
   - 关键管理员账号当前 effective permissions 快照

#### 17.28.2 一次性迁移执行顺序

推荐顺序：

1. 锁定本轮测试环境，不再继续修改角色矩阵
2. 执行 `POST /users/permissions/migrate-effective`
3. 检查迁移结果：
   - 总用户数
   - 成功数
   - 失败用户列表
4. 对失败用户先人工修正或补录
5. 验证关键账号：
   - admin
   - superadmin
   - 普通 active 用户
   - 空权限用户
   - 原依赖部门角色的用户
6. 切换后端鉴权读取来源到 `user_permissions`
7. 发布前端，启用用户权限弹窗并隐藏旧角色入口

#### 17.28.3 切换后即时验证清单

切换后 30 分钟内至少验证：

1. 登录是否正常
2. `/auth/snapshot` 返回的 `permissions` 是否非空且合理
3. 用户列表是否可正常加载
4. 用户权限弹窗是否能读写
5. 核心模块是否按权限正常进入：
   - Dashboard
   - 人事中心
   - 系统管理
   - 配置中心
6. 管理员账号是否仍可访问全量管理能力
7. 原本依赖 `org_` 部门角色的测试账号是否仍符合预期访问结果

#### 17.28.4 切换后短期清理

1. 将角色绑定按钮文案全面替换为权限管理
2. 旧角色接口前端不再调用
3. 后端对旧角色接口先返回明确 deprecated 提示，再择机改成 `410`
4. 清理所有“primaryRole 必须存在”的前端假设

### 17.29 最小回退手册

因为你明确不希望双轨并行，所以回退也应保持最小化：

#### 17.29.1 触发回退的条件

仅在以下情况触发：

1. 管理员账号大面积失权
2. 登录后 `permissions` 普遍为空
3. 核心模块大量 403，且无法在短时间通过补写 `user_permissions` 修复

#### 17.29.2 回退动作顺序

1. 暂停用户权限编辑入口，避免继续写入新数据
2. 切回 `auth.go / identity_access.go / effective_access.go` 到旧读取逻辑
3. 保留 `user_permissions` 数据，不立即删除
4. 用导出的备份确认旧角色 / 组织链仍完整
5. 标记本次迁移批次 `batch_id` 为失败批次，停止复用

#### 17.29.3 不建议的回退动作

1. 不建议一边保留新用户权限写入，一边恢复旧链路鉴权
2. 不建议做“部分用户走新、部分用户走旧”的运行时分流
3. 不建议在未冻结角色矩阵的情况下反复来回切换

### 17.30 当前结论与下一步

当前已完成：

1. 后端表结构与 API 草案
2. 前端页面设计、DTO / hook / query key 收口方案
3. 测试阶段直接切换步骤
4. 最小回退手册

下一步若进入实施，应按顺序：

1. 先改后端模型 / service / handler / middleware
2. 再改前端用户权限弹窗与 hooks
3. 最后执行迁移与直接切换

### 17.31 暂停点（待你批准实施）

1. 当前已把方案A的前端页面设计与切换步骤细化到实施前级别。
2. 若你批准，我下一步就进入真正代码实施阶段。
3. 在你批准前，不开始修改权限业务代码。

### 17.32 第二轮目标：去兼容化，只保留新权限模型

你最新要求是：

1. 不需要再兼容旧角色权限链。
2. 不需要继续保留旧角色语义对外暴露。
3. 直接按新权限模型修 BUG，而不是继续在新旧两套语义之间打补丁。

因此本轮目标从“测试期保留少量兼容壳”进一步收紧为：

1. 运行时权限判定只允许依赖 `user_permissions`。
2. 对外用户会话 / 用户权限接口只暴露新权限模型需要的数据。
3. 旧角色接口与旧角色字段不再作为前端工作前提。

### 17.33 本轮计划删除 / 收口的兼容项

#### 17.33.1 后端

计划直接处理：

1. `server/dependencies/effective_access.go`
   - 删除仅供旧角色链使用的 legacy effective access 解析逻辑。
   - 若迁移接口仍需要历史权限快照，则应同步判定为下线，避免系统继续依赖旧角色数据作为任何运行时前提。
2. `server/dependencies/identity_access.go`
   - 删除 role binding 收集、legacy diagnostics 与 role-based snapshot 拼装逻辑。
   - 收口为只返回：`userId / username / employeeId / permissions / diagnostics`。
3. `server/middleware/auth.go`
   - 不再向上下文写入 `role`、`effectiveRoles`。
   - 请求上下文仅保留新权限模型真正需要的数据。
4. `server/handlers/auth.go`
   - 登录响应与 `/auth/snapshot` 去掉 `primaryRoleId / role / effectiveRoles / roleBindings`。
   - 前端若仍依赖这些字段，应同步修改而不是继续兼容。
5. `server/routes/routes.go`
   - 下线旧角色接口：
     - `GET /users/:id/roles`
     - `POST /users/:id/roles`
     - `DELETE /users/:id/roles/:roleId`
     - `PATCH /users/:id/primary-role`
6. `server/handlers/users.go`
   - 删除与角色绑定接口、primary role 切换、legacy role fallback 相关的 handler / helper。
   - 仅保留用户基础信息、员工绑定与用户显式权限相关逻辑。

#### 17.33.2 前端

计划直接处理：

1. `src/features/users/services/user-api.ts`
   - 删除旧角色接口客户端方法。
2. `src/features/users/hooks/use-users.ts`
   - 删除：
     - `useUserRoleBindingsQuery`
     - `setPrimaryRoleMutation`
     - `addRoleBindingMutation`
     - `removeRoleBindingMutation`
   - 清理相关 query key。
3. `src/features/users/contracts/user-api-dto.ts`、`data/schema.ts`、`adapters/user-api-adapter.ts`
   - 删除旧 `UserRoleBinding*`、`UserRoleBindingsResponse` 契约。
   - 收口 `UserAccessSnapshot` 到新权限模型必要字段。
4. `src/features/users/components`
   - 删除未再使用的 `users-role-bindings-dialog.tsx`。
   - 用户列表只保留“管理权限”入口，不再保留任何角色管理 UI 假设。
5. 若前端其它区域仍展示：
   - `primaryRoleId`
   - `effectiveRoles`
   - `roleBindings`
   则一并改为新权限摘要，不做兼容兜底。

### 17.34 本轮预期顺带修复的 BUG

根据当前残留情况，本轮优先修这类问题：

1. 前后端仍返回或读取旧角色字段，导致页面状态判断混乱。
2. 上下文中还写入空 `role/effectiveRoles`，让调用方误以为角色链仍有效。
3. 用户权限页面与 access snapshot 仍混合展示旧角色摘要，造成“看起来像还有主角色”的伪语义。
4. 旧角色接口未真正下线，导致后续调用方误接回旧链路。

### 17.35 风险与控制

1. 风险：删除旧接口后，若仍有调用方未改，会直接报错。
   - 控制：先全局定位调用，再一并清理；不保留静默 fallback。
2. 风险：删除旧返回字段后，登录态 / 用户态页面可能出现类型错误。
   - 控制：先改 DTO / schema / hooks，再改响应与 handler。
3. 风险：迁移接口若仍依赖旧链路，会失去历史权限回填能力。
   - 控制：本轮接受该能力下线；若后续还要迁移，需单独定义离线脚本，而不是继续把旧链路塞在运行时系统内。

### 17.36 实施顺序

1. 先删前端 / 后端的旧接口消费与 DTO 契约。
2. 再删后端旧 handler / route / snapshot 字段。
3. 再做编译与 lint，直接修掉新权限单链路暴露的 BUG。
4. 最后更新 `walkthrough.md`。

### 17.37 暂停点（待你确认）

1. 当前已将本轮任务更新到 `task.md` 与 `implementation_plan.md`。
2. 本轮实施将是“去兼容化”硬切，不再保留旧角色接口与旧角色返回字段。
3. 若你确认，我下一步就直接开始删除兼容链并修复新权限 BUG。

### 17.38 当前实施进展（2026-04-17）

#### 17.38.1 已完成的收口

1. 后端活跃写路径：
   - `server/handlers/users.go` 的创建、编辑、替换、绑定员工、解绑员工、bulk sync 已停止把 legacy `role` 继续写回为运行时前提。
   - `syncAccountRoleBindings(...)`、`syncUserRoleBinding(...)`、`syncEmployeeRoleBinding(...)` 已从活跃用户写链中断开，不再随着用户修改继续回写 `user_roles` / `employee_roles`。
2. 前端运行时消费：
   - 用户管理主链已改为权限弹窗与权限摘要，不再依赖旧角色弹窗完成核心操作。
   - 采购打印页、权限统计页、`auth-store` 等运行时入口已停止继续消费 `user.role` 作为主要展示或判断来源。
   - `users-role-bindings-dialog.tsx` 已退化为 `UsersPermissionsDialog` 代理壳，避免误接回旧角色接口。
3. 契约与测试：
   - `users_create_role_validation_test.go` 已按“legacy role payload 忽略、旧 role binding 同步停用”的新口径调整。
   - `users_contract_regression_test.go` 已把 `/auth/snapshot`、`GET /users/:id/access` 的断言收口到权限单链路字段，并补齐 `user_permissions` 测试表结构。

#### 17.38.2 已完成验证

1. `pnpm exec tsc --noEmit --pretty false`：通过。
2. `go test ./handlers -run "CreateUserHandler|BindUserEmployeeHandler|UnbindUserEmployeeHandler"`：通过。
3. `go test ./handlers -run "ReplaceUserHandler|GetProfileReturnsExpectedUserMetadata|GetAuthSnapshotHandler|GetUserAccessSnapshotHandler"`：通过。

#### 17.38.3 当前仍未清理干净的残留

1. `server/handlers/users.go` 里仍保留一组已脱离路由主链的旧角色 handler / helper，需要继续物理删除。
2. locale、少量测试名与注释层仍残留 `roleBindings / effectiveRoles / primaryRoleId` 旧术语，需要继续收口。
3. `src/features/users/utils/role-resolver.ts`、`src/features/users/hooks/use-role-display.ts` 等旧角色工具已基本脱离运行时，但尚未完成最终删除或替换。
4. 用户列表查询与返回契约里仍保留少量 `role` 兼容字段；后续需要结合剩余消费者决定是彻底删除还是只保留历史展示值。

#### 17.38.4 下一步执行顺序

1. 删除 `users.go` 中已失效的旧角色 handler / helper 与对应回归测试残留。
2. 清理 locale、契约与无运行时消费者的旧角色工具文件。
3. 再执行一轮定向 `tsc` / `go test`，确认第二轮“去兼容化”可以正式收尾。
