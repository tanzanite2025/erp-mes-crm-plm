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

#### 当前仍待收尾

1. 本轮长远根因修复已完成；当前进入真实路由新增验证阶段，待用户确认后补一个最小 authenticated 子路由，验证权限树自动同步链在真路由新增场景下可闭环。
2. 已完成基础定向验证：`pnpm exec tsc --noEmit --pretty false` 通过；`node scripts/verify-permissions.mjs` 通过，且其 route 输入已不再依赖旧的 `authenticated-route-catalog.ts` 快照链。
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
