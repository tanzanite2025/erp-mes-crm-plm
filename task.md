

## P0 服务层审计链收口与构建恢复（2026-04-06，待确认）

- [x] 20. 收口 `service_runtime.go` 的审计注入能力
  - [x] 盘点当前 `transactionManager` / `gormTransactionManager` 缺失的 `auditLogger` 注入边界。
  - [x] 明确默认运行时应如何提供 `defaultAuditLogger`，避免服务层继续各自绕过统一入口。
  - [x] 设计最小改造方案，确保不影响现有只读调用。

- [x] 21. 收口 `ProductionService` / `OrganizationService` 的审计写入主链
  - [x] 为关键写操作接入统一 `auditLogger`，替代散落或缺失的审计写入。
  - [x] 优先覆盖当前已暴露“测试名存在但断言未闭环”的删除 / 批量同步等高风险写操作。
  - [x] 保持日志语义英文、用户面说明中文，不额外扩散无关重构。

- [x] 22. 补服务层测试并核对 `/api/audit` 链路
  - [x] 为 `production_service_test.go` / `organization_service_test.go` 引入 `fakeAuditLogger` 或等价测试注入。
  - [x] 修复当前“测试标题为 writes audit，但实际未断言审计写入”的空壳测试。
  - [x] 核对 `/api/audit` 与 `models.AuditLog` / 相关 handler 的读链路是否承接服务层新写入格式。

- [x] 23. 推进构建恢复与结果总结
  - [x] 优先让与本链路相关的 `go test` / `go build` 恢复稳定。
  - [x] 已单独执行 `go build ./...`，当前工作区全量构建通过，无需再区分本轮残留与历史阻塞。
  - [x] 将结果同步到 `walkthrough.md`。

## P1 第三批接口语义升级（2026-04-06，已确认）

- [ ] 7. 拆分 `PATCH /users/:id` 与 `PUT /users/:id` 语义
  - [ ] 新增真正的 `ReplaceUserHandler`，让 `PUT /users/:id` 承接完整资源替换语义。
  - [ ] 保持 `PatchUserHandler` 仅处理按字段存在性更新。
  - [ ] 明确 replace 场景下的必填字段、可清空字段与禁止覆盖字段边界。

- [ ] 8. 为身份快照增加准确别名入口
  - [ ] 新增 `GET /auth/snapshot` 作为规范入口。
  - [ ] 暂时保留 `GET /profile` 作为兼容入口，避免一次性打断现有调用链。
  - [ ] 逐步将前端内部主调用迁移到 `/auth/snapshot`。

- [ ] 9. 统一 `fetchUsers` 长期返回契约
  - [ ] 将主查询接口收敛为分页结构：`items / total / page / pageSize`。
  - [ ] 为审批人选择、下拉选项等轻量场景拆出独立用户选项接口，避免继续复用主查询接口赌数组返回。
  - [ ] 清理当前“数组 / 分页结构”混用点，消除调用方理解不一致。

## P1 第三批接口语义升级测试补强（2026-04-06，待确认）

- [x] 10. 补 `ReplaceUserHandler` 后端回归测试
  - [x] 覆盖 `PUT /users/:id` 完整替换语义，断言 `username / phoneNumber / firstName / lastName / role / status / employeeId` 被整包覆盖。
  - [x] 覆盖“未提供 password 时不改密码”场景，避免 replace 误清空或误重置密码。
  - [x] 覆盖非法 `role / status` 校验与管理员保护边界，确保 replace 语义不突破既有安全约束。

- [x] 11. 补 `/auth/snapshot` 后端与前端回归测试
  - [x] 后端验证 `/auth/snapshot` 与 `/profile` 返回同一身份快照结构，确保别名不漂移。
  - [x] 前端验证身份快照同步函数主调用已切到 `/auth/snapshot`，并正确回填 `role / effectiveRoles / permissions`。
  - [x] 验证前端仍保持“以后端为准”的身份快照消费，不引入前端自判权限分支。

- [x] 12. 补用户分页契约后端与前端回归测试
  - [x] 后端验证 `GET /users` 返回 `items / total / page / pageSize`，并覆盖 `username / status / role` 过滤与 `options=true` 轻量分支。
  - [x] 前端验证 `fetchUsers()` 解析分页结果、`fetchUserOptions()` 解析轻量数组结果。
  - [x] 如测试基建允许，补充 `useUsersQuery / useUserOptionsQuery` 或消费层最小回归，避免再次出现数组/分页契约混用。

- [x] 13. 执行验证并同步总结
  - [x] 运行后端定向测试、前端测试与 `pnpm exec tsc --noEmit`。
  - [x] 将测试结果补充到 `walkthrough.md`。

## P1 前端回归测试接入与 hooks 补强（2026-04-06，待确认）

- [x] 14. 将前端 contract test 接入常用脚本与 CI
  - [x] 收敛 `package.json` 中的测试脚本层级，明确 contract tests 的常用入口。
  - [x] 将 `test:contracts` 接入现有 `.github/workflows/ci.yml`，确保 PR / main 分支持续校验。
  - [x] 避免把过重的前端测试直接塞进 `build`，优先走独立测试步骤，减少构建链路耦合。

- [x] 15. 补 `useUsersQuery / useUserOptionsQuery` hooks 层回归测试
  - [x] 验证 `useUsersQuery` 触发 `fetchUsers` 且 query key 保持分页查询语义。
  - [x] 验证 `useUserOptionsQuery` 触发 `fetchUserOptions` 且 query key 与主列表查询隔离。
  - [x] 覆盖 hooks 层最小职责边界，避免再次出现“分页列表 / 轻量选项”混用回退。

- [x] 16. 执行验证并同步总结
  - [x] 运行 Vitest 定向测试、`pnpm exec tsc --noEmit`，以及如有需要的 CI 配置校验。
  - [x] 将接入结果与 hooks 测试结果补充到 `walkthrough.md`。

## P1 生成链耦合治理（2026-04-06，待确认）

- [ ] 27. 盘点权限生成链的源事实层 / 转换层 / 运行时消费层
  - [ ] 识别当前源事实层：`server/authz/permissions.go`、自动生成的 `authenticated-route-catalog.ts`。
  - [ ] 识别当前转换层：`permission-catalog.ts`、`route-permissions-generator.ts`、`action-permission-catalog.ts`、`default-permissions.ts`。
  - [ ] 识别当前运行时消费层：`route-access.ts`、`use-roles.ts`、用户权限树构建与相关 UI 投影工具。

- [ ] 28. 标出生成链中的混合职责节点与隐式规则
  - [ ] 找出同时承担“生成 + fallback + 运行时匹配”的节点，避免继续把消费期猜测混进生成期。
  - [ ] 记录当前显式映射与高风险手工兜底：如 `ROUTE_TO_MENU_MAPPING`、页面/Tab parent 兜底、`routeBindings` 手工目录。
  - [ ] 记录当前缓存、排序、去重、路径规格化等逻辑分别属于哪一层，避免后续继续叠加第二真相。

- [ ] 29. 输出执行前规划并暂停等待确认
  - [ ] 给出后续最小执行顺序：先拆层、再收敛 fallback、最后补验证脚本/回归。
  - [ ] 明确本阶段只做规划与分层盘点，不直接大改业务代码。
  - [ ] 将结果同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

## P1 action routeBindings contract 化（2026-04-06，待确认）

- [ ] 41. 将 `action-permission-catalog.ts` 的 `routeBindings` 从字符串目录收敛为结构化 contract
  - [ ] 设计最小结构，例如 `{ method, path }`，避免继续依赖自由格式字符串。
  - [ ] 保留必要兼容层，避免一次性打断现有脚本或消费点。
  - [ ] 明确注释性附加信息是否需要独立字段承接，避免继续塞回同一字符串。

- [ ] 42. 收敛 `check-action-permission-closure.mjs` 为优先消费结构化 binding 的校验脚本
  - [ ] 先让脚本优先读取结构化 contract，再决定是否短期兼容旧字符串解析。
  - [ ] 继续校验：后端受保护路由是否存在绑定、catalog binding 是否命中真实 route。
  - [ ] 避免把脚本扩成大型静态分析器，优先保证 routeBindings 输入稳定可校验。

- [ ] 43. 执行最小验证并同步总结
  - [ ] 运行 `pnpm exec tsc --noEmit` 与 action closure 检查脚本。
  - [ ] 如脚本接入 `package.json` 或常用校验入口，再同步到文档。
  - [ ] 将结果补充到 `walkthrough.md`，并在必要时记录存量例外项。

## P1 action routeBindings 缺口补齐（2026-04-06，待确认）

- [ ] 45. 补齐 closure 脚本发现的 5 条未绑定后端受保护路由
  - [ ] 为 `action_trading_purchase_order_manage` 补 `POST /purchase/orders/:id/confirm-receipt`。
  - [ ] 为 `action_approval_config_manage` 补 `POST /workflows/definitions` 与 `POST /workflows/instances`。
  - [ ] 为 `action_approval_review` 补 `PATCH /workflows/tasks/:id/approve` 与 `PATCH /workflows/tasks/:id/reject`。

- [ ] 46. 重跑 closure 校验并确认未绑定缺口归零
  - [ ] 运行 `node scripts/check-action-permission-closure.mjs`。
  - [ ] 运行 `pnpm exec tsc --noEmit`。
  - [ ] 将结果同步到 `walkthrough.md`。

## P2 实验 / 沙箱模块长期常驻治理（2026-04-06，待确认）

- [ ] 49. 盘点实验 / 沙箱 / 临时验证模块在正式主链中的残留入口
  - [ ] 识别仍挂在正式 authenticated route 树中的实验模块，如 `experimental/*`。
  - [ ] 识别仍以正式模块名暴露但内部承接 sandbox 实现的入口，如 `system-management/logistics-api`。
  - [ ] 识别这些模块是否继续出现在生成路由目录、权限生成链、搜索入口与菜单/TAB 投影中。

- [ ] 50. 为每个目标项给出分类治理建议
  - [ ] 区分：转正保留、迁移到 labs/sandbox、从正式路由摘除但保留源码、确认无依赖后删除。
  - [ ] 明确哪些项只能摘“正式入口”，不能贸然删源码，避免影响后续排查与迁移。
  - [ ] 明确哪些项已经污染权限/搜索/生成链输入，应优先收敛。

- [ ] 51. 输出执行前规划并暂停等待确认
  - [ ] 将盘点结果与分类建议同步到 `implementation_plan.md`。
  - [ ] 明确本阶段只做规划，不直接删模块或改正式路由。
  - [ ] 完成后暂停，等待用户批准再进入执行阶段。

## P2 实验 / sandbox 源码路径语义迁移（2026-04-06，待确认）

- [ ] 58. 盘点需迁移到 `labs` / `sandbox` 语义路径的实验源码目录与 import 影响面
  - [ ] 识别 `src/features/experimental/**` 的组件、hooks、data、tabs 与 `/_authenticated/experimental/**` 的引用关系。
  - [ ] 识别 `src/features/logistics-api-sandbox/**` 的组件、services、types 与正式路由壳的引用关系。
  - [ ] 明确本轮只迁“源码目录语义”，不恢复正式入口。

- [ ] 59. 形成最小目录迁移方案
  - [ ] 为 `src/features/experimental/**` 设计更明确的目标目录，如 `src/features/labs/experimental/**`。
  - [ ] 为 `src/features/logistics-api-sandbox/**` 设计更明确的目标目录，如 `src/features/sandbox/logistics-api/**`。
  - [ ] 列出需要同步修改的 import、路由壳引用与可能受影响的生成文件。

- [ ] 60. 输出执行前规划并暂停等待确认
  - [ ] 将迁移方案、风险与验证预案同步到 `implementation_plan.md`。
  - [ ] 明确目录迁移属于结构级改动，执行前先暂停等待用户批准。
  - [ ] 批准后再进入实际 rename / import 更新 / 验证阶段。

## P2 兼容路径 / 键名升级专项（2026-04-06，待确认）

- [ ] 70. 规划 `/experimental/*` 路由别名与迁移策略
  - [ ] 明确目标命名空间与最终目标路径，避免继续沿用 `experimental` 作为正式语义。
  - [ ] 设计兼容期策略：是保留旧路由重定向，还是短期双挂载后再下线。
  - [ ] 明确权限生成链、搜索入口、导航入口应在迁移的哪一阶段切换。

- [ ] 71. 规划 `/experimental/*` API 命名升级策略
  - [ ] 盘点前端调用点与后端接口面，明确哪些接口需要别名兼容。
  - [ ] 设计兼容期：保留旧 API 别名还是由前端先切换、新旧共存一段时间。
  - [ ] 明确本轮不把“命名升级”扩成业务协议重构。

- [ ] 72. 规划 `experimental.*` i18n key 迁移策略并暂停等待确认
  - [ ] 设计新 key 命名空间，避免继续把 `experimental` 暴露为长期用户面语义。
  - [ ] 明确是否需要兼容旧 key、批量替换范围与验证方式。
  - [ ] 将专项方案、风险与验证预案同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 73. 切换为“直接清理旧 experimental 入口”专项并暂停等待确认
  - [ ] 明确本轮不再保留旧 `/experimental/*` 路由、旧 `/experimental/*` API alias 与旧 `experimental.*` 兼容消费层。
  - [ ] 盘点并清理旧入口涉及的文件：旧 authenticated experimental 路由壳、旧 route lazy 文件、旧 API 路径引用、旧 i18n key 消费点。
  - [ ] 明确需要同步删除或切换的生成产物与入口引用，避免删除后残留无效导入或 route tree 脏引用。
  - [ ] 将破坏性影响、验证步骤与回滚建议同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 74. 直接清理旧 experimental 路由入口
  - [ ] 删除 `src/routes/_authenticated/experimental/**` 下不再需要的旧路由文件。
  - [ ] 清理所有指向旧 `/experimental/*` 的前端导航与入口引用，统一改为 `/labs/experimental/*`。
  - [ ] 重新生成 route tree，确认删除旧路由后生成产物无残留引用。

- [ ] 75. 直接清理旧 experimental API 入口
  - [ ] 删除后端 `server/routes/routes.go` 中旧 `/experimental/*` 分组，仅保留 `/labs/experimental/*`。
  - [ ] 全量确认前端实验模块 API 调用均已切换到 `/labs/experimental/*`。

- [ ] 78. 实施可安全改名的 residual naming / 文案语义统一
  - [ ] 优先处理实验模块内部局部命名：组件名、函数名、hooks 命名、局部类型名、页面标题文案等。
  - [ ] 统一“实验中心 / labs / laboratory”相关用户面文案语义，避免同一模块多套表述并存。
  - [ ] 同步调整搜索关键词、菜单父级描述等低风险用户面语义文本。

- [ ] 79. 完成验证与文档整理
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充生成与定向搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮 residual naming 收敛范围、保留项与验证结果。

- [ ] 80. 规划实验模块内部剩余命名债清理并暂停等待确认
  - [ ] 盘点 `src/features/labs/experimental/**` 内仍残留的 `use-experimental.ts`、`Lab*`、`Experimental*` 内部命名债。
  - [ ] 明确本轮仅处理内部函数名、hooks 名、局部类型名、组件名与文件内语义命名，不改路径、API 前缀、权限 ID、query key。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 81. 实施实验模块内部命名收敛
  - [ ] 统一 hooks 文件与导出命名，减少 `use-experimental.ts` 与 `useLab*` 混杂语义。
  - [ ] 统一实验模块页面、组件、局部类型中的 `Lab* / Experimental*` 命名风格。
  - [ ] 同步调整所有内部 import / export 引用，避免残留旧命名。

- [ ] 82. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧内部命名不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮内部命名收敛结果与保留项。

- [ ] 83. 规划实验模块 hooks 文件名收敛并暂停等待确认
  - [ ] 将 `src/features/labs/experimental/hooks/use-experimental.ts` 纳入文件名语义收敛范围。
  - [ ] 明确本轮仅处理文件名与 import 路径迁移，不改导出名、query key、API 路径、权限 ID。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 84. 实施 hooks 文件名迁移
  - [ ] 将 `use-experimental.ts` 重命名为更符合当前语义的文件名。
  - [ ] 同步更新所有内部 import 路径，确保调用方全部切换。

- [ ] 85. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧文件路径不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮文件名收敛结果与保留项。

- [ ] 86. 规划实验模块单文件 any 类型治理并暂停等待确认
  - [ ] 仅针对 `src/features/labs/experimental/hooks/use-lab-experimental.ts` 盘点 `any` 出现位置与最小替代类型方案。
  - [ ] 明确本轮不扩散到其他模块，不处理别的文件中的类型债。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 87. 实施 use-lab-experimental.ts 单文件 any 治理
  - [ ] 为 query 返回值、mutation 入参等位置补充最小可接受类型。
  - [ ] 保持 query key、API 路径、导出名与运行时行为不变。

- [ ] 88. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充定向 lint 或搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮单文件类型治理结果与保留项。

- [ ] 89. 规划“生产上线主链技术债治理”并暂停等待确认
  - [ ] 明确本轮主线仅覆盖正式生产链路中的认证 / 身份快照 / 用户 / 角色 / 权限链。
  - [ ] 明确本轮不将实验模块、sandbox 业务线、历史兼容清理、局部文案与命名美化混入正式主战场。
  - [ ] 将治理目标、阶段划分、风险、验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 90. 第一阶段：生产主链接口契约与类型收口
  - [ ] 盘点正式生产主链中返回结构、分页契约、options 轻量契约、patch / replace / snapshot 等语义漂移点。
  - [ ] 将认证快照权威入口收敛为 `GET /auth/snapshot`，直接删除旧 `GET /profile`，不保留兼容入口。
  - [ ] 优先治理认证 / 身份 / 用户 / 角色 / 权限链的前后端契约与前端 service 类型。
  - [ ] 建立“服务层稳定 contract -> hooks 消费 -> 页面承接”的单向边界，减少页面层自行猜结构。

- [ ] 91. 第二阶段：生产权限与职责边界收口
  - [ ] 固化“服务端为最终权限裁决来源、前端仅做展示与状态承接”的正式基线。
  - [ ] 收敛 service / hook / page / component 以及 handler / service / repository 的职责边界，减少跨层混杂。
  - [ ] 清理正式主链中仍可能诱导误用的边界命名、注释或旧约定。

- [ ] 92. 第三阶段：生成链 / 配置链 / 校验链稳定化
  - [ ] 收敛权限生成、路由 catalog、action binding、默认权限清单等认证 / 用户 / 权限链相关生成输入与运行时消费边界。
  - [ ] 补强脚本校验与定向验证，避免“生成输入、生成产物、运行时消费、人工理解”再次漂移。

- [ ] 93. 第四阶段：文档基线与上线治理总结
  - [ ] 拆分“当前执行文档”和“长期架构基线文档”的职责，避免 `walkthrough.md` 继续承担全部历史语义。
  - [ ] 更新 `walkthrough.md`，记录正式生产主链治理结果、保留项、风险与验证结论。

- [ ] 94. 规划“角色矩阵 -> 新增用户 -> 登录访问范围”真实链路回归并暂停等待确认
  - [ ] 明确本轮验证主链仅覆盖：角色矩阵修改部门角色权限、用户新增时自动绑定 `org_<dept>` 部门角色、登录后真实访问范围随角色变化生效。
  - [ ] 明确本轮不扩展为前端路由守卫改造，不把前端变成权限裁决源。
  - [ ] 将涉及的前后端入口、测试补强点、风险与验证步骤同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 95. 第一阶段：角色矩阵改权限真实链路回归
  - [ ] 盘点并验证 `useRoles` / `RoleService` / `role_handlers.go` 在角色矩阵勾选权限后的保存、回读与刷新一致性。
  - [ ] 补强“修改部门角色权限后重新读取角色 contract 仍一致”的前后端回归测试。
  - [ ] 明确本阶段以“后端返回稳定 role contract”为验收标准，不允许前端静默兜底回写。

- [ ] 96. 第二阶段：新增用户绑定部门角色真实链路回归
  - [ ] 验证新增用户时，员工所属部门存在 `org_<dept>` 角色会被自动绑定；缺失时直接报错阻断保存。
  - [ ] 补强 `users-action-dialog` / `use-users-action-dialog-sync` / 用户创建 handler 的联动回归测试。
  - [ ] 确认最终写入用户记录的 role 标识与当前部门角色 contract 一致。

- [ ] 97. 第三阶段：登录后真实访问范围验证
  - [ ] 盘点登录鉴权、身份快照、有效权限解析链：`/auth/snapshot`、effective access、middleware、角色权限解析服务。
  - [ ] 补强“部门角色权限变化后，登录态读取到的新访问范围随之变化”的后端回归测试。
  - [ ] 必要时补最小前端 service 层验证，确认身份快照消费的是服务端真实权限结果而非页面本地推导。

- [ ] 98. 第四阶段：执行验证并整理文档
  - [ ] 执行本轮定向 `vitest` / `go test` / `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录真实链路回归结果、未覆盖项与后续保留风险。

- [ ] 99. 规划“权限核心逻辑抽离专项”并暂停等待确认
  - [ ] 先确认本轮主问题不是单点 bug，而是角色解析、部门角色绑定、有效权限计算、snapshot 回填、页面显示解释在多层重复实现。
  - [ ] 明确本轮优先级从“继续补真实链路回归”切换为“先抽离底层核心逻辑，再做链路验证”。
  - [ ] 将抽离目标、职责边界、迁移阶段、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 100. 第一阶段：收口后端权限核心
  - [ ] 将“用户主角色 + 部门角色族 + 有效权限集合 + effectiveRoles”统一收口为单一后端核心服务，避免 handler / middleware 各自 fallback。
  - [ ] 约束 `auth snapshot`、middleware、角色接口与用户接口只消费该核心结果，不再各自重复解析。
  - [ ] 明确任何 `org_<dept>` 相关角色家族合并逻辑只能存在一处权威实现。

- [ ] 101. 第二阶段：收口前端角色消费边界
  - [ ] 将前端划分为“写侧”与“读侧”：
  - [ ] 写侧只负责提交角色标识与权限变更，不推导有效权限。
  - [ ] 读侧只消费后端返回的稳定 contract，不再本地二次裁决权限。
  - [ ] 约束用户新增绑定、角色矩阵、用户表显示解释分别使用同一套只读 contract / resolver 边界。

- [ ] 102. 第三阶段：清理重复 fallback / 解释层
  - [ ] 排查并删除 handler、middleware、snapshot、前端页面中重复的 fallback 逻辑与隐式兜底。
  - [ ] 将页面层残留的 role drift / role resolver 解释限制为展示用途，不再参与真实权限裁决。
  - [ ] 确认登录、用户新增、角色矩阵三条链只沿同一事实来源流动。

- [ ] 103. 第四阶段：在抽离完成后再做真实链路回归
  - [ ] 回到“角色矩阵改权限 -> 新增用户绑定部门角色 -> 登录后访问范围验证”做最终回归。
  - [ ] 用定向 `vitest` / `go test` / `pnpm exec tsc --noEmit` 验证抽离后的单源逻辑真正闭环。
  - [ ] 更新 `walkthrough.md`，记录本轮抽离结果、保留项与真实链路验证结论。

- [ ] 104. 规划 `use-roles.ts` 专项收口并暂停等待确认
  - [ ] 确认 `src/features/system-mgmt/hooks/use-roles.ts` 仍包含前端本地权限扩展 / 默认权限补齐 / admin 全量补齐等第二套解释逻辑。
  - [ ] 明确本轮目标不是改页面表现，而是把 `use-roles.ts` 拆成两层：
  - [ ] “展示树辅助层”：仅服务权限树勾选 UI、父子节点展开/联动显示。
  - [ ] “后端 contract 消费层”：仅保存和消费后端返回的真实 `role.permissions` contract，不再本地补齐为持久化事实。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 105. 第一阶段：拆分 `use-roles.ts` 的双重职责
  - [ ] 从 `use-roles.ts` 中拆出“展示树辅助”工具，承载父子节点关系、排序、勾选联动等纯 UI 辅助逻辑。
  - [ ] 保留 `use-roles.ts` 作为后端角色 contract 的消费者，不再在加载后对 `role.permissions` 做持久化语义上的二次扩展。
  - [ ] 明确哪些值属于 UI 临时显示集合，哪些值属于后端返回/提交的真实权限集合。

- [ ] 106. 第二阶段：收口角色矩阵写侧
  - [ ] 调整角色矩阵勾选保存逻辑，使提交 payload 只表达后端 contract，而不是前端补齐后的整棵权限树。
  - [ ] 保留必要的页面交互体验，但禁止默认权限补齐 / admin 全量补齐继续作为前端事实来源。
  - [ ] 复查 `RoleService`、角色矩阵 hooks / tabs，确认不再存在另一套持久化权限解释。

- [ ] 107. 第三阶段：补回归测试与验证
  - [ ] 增加 `use-roles` 专项回归测试，锁住“展示树辅助”与“后端 contract 消费”边界。
  - [ ] 验证角色加载、勾选、保存、重新加载后不再因为前端本地扩展而漂移。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补后端 handler 合同验证。
  - [ ] 更新 `walkthrough.md`，记录本轮 `use-roles.ts` 专项收口结果与剩余保留项。

- [ ] 108. 规划 `effectiveRoles / role` snapshot 兼容链专项收严并暂停等待确认
  - [ ] 确认当前剩余弱冗余主要集中在 snapshot contract 的兼容层：后端 `GetAuthSnapshotHandler`、前端登录写入、`effective-permission-service`、`access-snapshot` 对 `role` 的回退读取。
  - [ ] 明确本轮目标是“让前后端优先只消费 `effectiveRoles`”，并把 `role` 从兼容事实链降级为过渡字段。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 109. 第一阶段：收严后端 snapshot 输出语义
  - [ ] 复查 `server/handlers/auth.go` 中登录响应与 `/auth/snapshot` 输出，明确 `effectiveRoles` 为角色事实来源。
  - [ ] 减少 `effectiveRoles <- role` 的兼容回填，避免 snapshot 继续在 handler 层做结构修补。
  - [ ] 保留必要过渡兼容，但要求权限与页面链的主消费逻辑不再依赖 `role`。

- [ ] 110. 第二阶段：收严前端 snapshot 写入与读取链
  - [x] 调整登录成功后的前端写入逻辑，优先以 `effectiveRoles` 为准，不再把 `role` 作为主读取来源。
  - [x] 调整 `effective-permission-service.ts` 与 `access-snapshot.ts`，限制 `role` fallback 的作用范围。
  - [x] 确认页面与 hooks 的角色读取工具优先消费 `effectiveRoles`，避免继续混用 `role/effectiveRoles`。

- [ ] 111. 第三阶段：补回归测试与验证
  - [x] 增加后端 snapshot contract 回归测试，锁住 `effectiveRoles` 主来源行为。
  - [x] 增加前端登录 / snapshot 同步 / access-snapshot 回归测试，锁住 `effectiveRoles` 主消费行为。
  - [x] 执行定向 `go test` / `vitest` / `pnpm exec tsc --noEmit`。
  - [x] 更新 `walkthrough.md`，记录本轮 snapshot 兼容链收严结果与剩余保留项。

- [ ] 112. 规划 compatibility-only 边界收口并暂停等待确认
  - [x] 确认当前剩余仅为 compatibility / display / UX assist 层保留项，不再属于权限事实来源。
  - [x] 明确本轮只聚焦三个尾部点：`getSnapshotRoleIds(...)`、`auth-session.ts`、登录链 fallback / resilience 处理。
  - [x] 明确本轮目标不是继续改权限裁决，而是进一步标注、压缩、隔离 compatibility-only 边界。
  - [x] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 113. 第一阶段：压缩 snapshot 兼容读取边界
  - [x] 复查 `getSnapshotRoleIds(...)` 与 `auth-session.ts` 的调用点，明确其仅用于宽兼容读取或 display 辅助。
  - [x] 视情况将其重命名、收窄使用面，或改为更薄的 compatibility wrapper。
  - [x] 禁止新的主链逻辑继续依赖这类宽兼容读取函数。

- [ ] 114. 第二阶段：压缩登录链 fallback / resilience 边界
  - [x] 复查登录成功后的最小身份写入与 snapshot 同步失败处理，明确哪些保留是 resilience，哪些属于历史兼容。
  - [x] 尽量把 fallback 处理压缩为最小必要路径，避免继续混入角色事实链。
  - [x] 保留必要稳定性，但将其限定为 compatibility-only / transition-only。

- [ ] 115. 第三阶段：补回归测试与验证
  - [x] 补 compatibility-only 边界专项测试，锁住这些函数/流程不再被抬升为事实来源。
  - [x] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补最小后端 handler 验证。
  - [x] 更新 `walkthrough.md`，记录本轮 compatibility-only 边界收口结果与最终保留项。

- [ ] 116. 规划“系统管理重复账号 TAB 下线 + 路由重定向”并暂停等待确认
  - [x] 确认 `/personnel/accounts` 与 `/system-management/accounts` 当前共用同一个 `Users` 底层页面，系统管理下的“用户账号”属于重复入口壳。
  - [x] 明确本轮目标不是改用户页业务逻辑，而是收口信息架构：移除系统管理中的重复 TAB，同时保留历史路由入口做兼容重定向。
  - [x] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 117. 第一阶段：移除系统管理中的重复 TAB
  - [x] 调整 `src/features/system-mgmt/tab-config.ts`，下线系统管理中的“用户账号”TAB。
  - [x] 保留人事账号中心中的“账户列表”作为唯一主入口。
  - [x] 确认不会影响系统管理其余 TAB 的展示与切换。

- [ ] 118. 第二阶段：保留历史路由并重定向
  - [x] 调整 `src/routes/_authenticated/system-management/accounts.tsx`，不再直接渲染 `Users`。
  - [x] 将 `/system-management/accounts` 重定向到 `/personnel/accounts`。
  - [x] 尽量保留当前 search 参数，避免旧书签与历史跳转失效。

- [ ] 119. 第三阶段：补验证与文档
  - [x] 验证系统管理 TAB 已不再出现重复账号入口。
  - [x] 验证访问 `/system-management/accounts` 时会正确跳转到 `/personnel/accounts`。
  - [x] 执行定向 `vitest` / `pnpm exec tsc --noEmit`。
  - [x] 更新 `walkthrough.md`，记录重复入口下线与兼容重定向结果。

- [ ] 120. 规划“最终全链弱冗余残留审计”并暂停等待确认
  - [ ] 基于当前已完成的后端单源、compatibility-only 边界收口与重复入口收口，重新梳理前端剩余残留项。
  - [ ] 聚焦仍可能造成误解的 compatibility / display / UX assist / legacy route 残留，不扩大到新的权限裁决改造。
  - [ ] 输出剩余项分层清单：必须处理、建议处理、可保留。
  - [ ] 将方案、范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认是否进入下一轮审计/实现。

- [ ] 121. 规划“删除未使用 legacy alias”并暂停等待确认
  - [ ] 复查 `getSnapshotRoleIds(...)` 与 `getAuthSessionRoleIds(...)` 的全局调用点，确认已无业务调用，仅剩定义本身与测试引用。
  - [ ] 明确本轮目标是删除未使用的 legacy alias，而不是继续保留兼容壳；系统内只保留显式的 compatibility-only 入口。
  - [ ] 同步调整受影响测试，移除“legacy alias 仍保留”的断言，改为锁住显式 compatibility-only 入口语义。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认后实施。

- [ ] 122. 第一阶段：删除未使用 legacy alias 导出
  - [ ] 调整 `src/features/authz/core/access-snapshot.ts`，删除 `getSnapshotRoleIds(...)`。
  - [ ] 调整 `src/features/authz/utils/auth-session.ts`，删除 `getAuthSessionRoleIds(...)`。
  - [ ] 确认现有业务代码仅保留显式 compatibility-only 与 effectiveRoles 主链读取入口。

- [ ] 123. 第二阶段：补测试与文档
  - [ ] 调整 `access-snapshot.test.ts` 与 `auth-session.test.ts`，删除 legacy alias 存续断言。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit` 验证删除后无引用残留。
  - [ ] 更新 `walkthrough.md`，记录 legacy alias 删除结果与最终保留边界。

- [ ] 124. 规划“前端消费边界制度化”并暂停等待确认
  - [ ] 明确本轮目标不再是零散残留清理，而是把前端权限消费链按职责制度化分层。
  - [ ] 明确分层目标：主链 contract 消费层、compatibility-only 层、display/UX assist 层、legacy route/redirect 层。
  - [ ] 明确本轮不引入新的前端权限硬拦截；权限裁决仍以后端为准，前端只做 contract 消费边界收口。
  - [ ] 将方案、风险、涉及文件范围与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认。

- [ ] 125. 第一阶段：梳理并固化前端权限消费分层
  - [ ] 盘点 `src/features/authz/**`、`src/components/layout/**`、`src/components/layout/data/**`、`src/features/system-mgmt/**` 中的权限相关读取入口。
  - [ ] 将读取入口按“主链 contract / compatibility-only / display-only / UX assist / legacy route”分类。
  - [ ] 输出统一的边界规则，明确哪些层允许读什么字段、哪些层禁止再派生权限事实。

- [ ] 126. 第二阶段：收口共享入口与命名语义
  - [ ] 对仍存在语义混杂的 helper / service / route helper 做职责拆分或命名收严。
  - [ ] 优先把“像主链、实则只是展示/兼容”的入口改成更明确的层级表达。
  - [ ] 若发现多个模块重复承接相同消费职责，尽量收敛到单一共享入口。

- [ ] 127. 第三阶段：收口 layout / sidebar / tabs / route 配置层弱规则
  - [ ] 复查 layout、sidebar、tab、route catalog 相关配置是否仍混入权限事实解释或历史兼容歧义。
  - [ ] 清理低风险无效分支、失效配置与误导性命名。
  - [ ] 保留必要 legacy route/redirect，但要求表达上显式为 compatibility-only。

- [ ] 128. 第四阶段：补验证与制度化记录
  - [ ] 为关键 shared helper / boundary function 补最小回归测试，锁住主链与 compatibility/display 层隔离。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补最小 smoke 验证。
  - [ ] 更新 `walkthrough.md`，记录最终消费边界分层、已收口点与有意保留项。

- [ ] 129. 第三批专项：`route-access / route tab` 投影层语义收口（审批稿）
  - [ ] 复核 `src/features/authz/guards/route-access.ts` 的真实职责，明确其属于“权限快照投影/匹配工具”，不是前端权限事实裁决主链。
  - [ ] 梳理 `canAccessPath / getAccessibleTabs / getRequiredPermissionIdsForPath` 的业务调用面，区分哪些是 Tab 过滤、哪些是路由配置投影、哪些仍可能带有误导性命名。
  - [ ] 若确认需要重命名，只收口表达与共享入口，不新增任何新的前端硬拦截逻辑。
  - [ ] 若调用面仍依赖当前名字，则采用“新语义入口 + 过渡迁移 + 最终删除旧名”的渐进方式推进。
  - [ ] 输出第三批保留项：明确哪些 helper 仍允许存在，且只能被视为“基于快照的前端投影工具”，不能被继续当作权限裁决器。

- [ ] 130. 缺陷修复：产线拓扑保存未携带 `authCode` 且 403 提示语义混淆（审批稿）
  - [ ] 复核“手动搭建首个工段”到 `POST /production/lines` 的完整调用链，确认保存已有产线拓扑时需要携带授权码。
  - [ ] 为产线拓扑编辑/保存链路补齐前端授权码传递，确保已有产线编辑时能把 `authCode` 提交到后端。
  - [ ] 复核现有 403 错误映射，区分“权限不足”与“拓扑授权码无效”两类拒绝原因，避免统一提示误导用户。
  - [ ] 保持“后端为权限/授权事实来源”的原则，不新增前端硬裁决，仅补齐交互与错误展示。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录缺陷根因、修复点与保留项。

- [ ] 131. 缺陷修复：`/engineering/products` 页面文案单语化与中英模式对齐（审批稿）
  - [ ] 复核 `src/features/engineering/index.tsx` 与 `src/features/engineering/components/engineering-sidebar.tsx` 的可见文案来源，区分“语言包输出”“硬编码标签”“内部 token 直出”三类问题。
  - [ ] 清理 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 下的双语拼接文案，改为中文模式纯中文、英文模式纯英文的单语文案。
  - [ ] 去除页面组件对翻译结果的 `split(' / ')` / `split(' // ')` 依赖，避免把翻译字符串当作结构化数据再次拆分渲染。
  - [ ] 将 `OVERVIEW`、`ROUTING`、`SPEC:`、`NULL_CONSTRAINTS` 等硬编码或技术占位文本纳入 i18n，避免内部标识符直接暴露到 UI。
  - [ ] 保持页面现有结构、交互与权限链路不变，只修正文案来源与渲染策略，不扩展为视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录根因、修复边界、验证结果与有意保留项。

- [ ] 132. 延续修复：`productMgmt` 其余表单 / 详情区中英混排残留清理（审批稿）
  - [ ] 复核 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 尚未收口的双语拼接字段，重点覆盖详情区、弹窗、表单、限制标签、附件区与条码区入口文案。
  - [ ] 梳理这些 key 在 `product-overview-tab`、`product-action-dialog`、相关子组件中的真实消费面，避免只改语言包而遗漏仍依赖旧双语格式的组件。
  - [ ] 将剩余面向用户可见的 `PRODUCT_*`、`EDIT_*`、`LIVE_PREVIEW`、`UPLOAD_*`、`PRINT_*` 等 token 风格文案改为真正单语，不再直接上屏内部标识符。
  - [ ] 若存在组件继续依赖旧格式（如假定文案中同时含英文与中文），则同步去除对应的结构化拆分或格式假设。
  - [ ] 保持产品详情、创建/编辑弹窗、附件与条码交互逻辑不变，只清理文案来源与渲染方式，不扩展为表单结构或视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录本轮继续清理范围、验证结果与仍有意保留的 mixed 文案边界。

- [ ] 133. 结构收口：人事账号中心产线管理 TAB 统一为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/**` 当前前端类型、组件 props、hook 命名与 UI 文案，确认哪些仍混用 `job / jobCategory / process / station` 抽象。
  - [ ] 明确人事账号中心产线管理 TAB 的唯一前端展示语义为 `产线 -> 工段 -> 工序`，去除当前共享页中把中间层误映射为 `工种 / 岗位类别` 的表达与命名。
  - [ ] 梳理前端保存 payload 与后端 `ProductionLine -> LineSegment -> JobCategory -> Station -> ProcessStep` 真实模型之间的差异，决定采用“前端投影适配”方式在不破坏现有后端模型的前提下收口展示与提交。
  - [ ] 统一列表统计、节点新增/重命名/删除动作与拓扑编辑器，使用户侧只能感知 `工段` 与其下 `工序`，不再暴露错层级概念。
  - [ ] 保持授权码、保存冲突、版本控制与权限链路不变，不扩展为整套生产拓扑后端重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录当前偏移根因、前端投影方案、验证结果与后端仍保留的深层模型边界。

- [ ] 134. 架构净化：产线拓扑三层模型彻底去兼容壳（审批稿）
  - [ ] 复核 `line-mgmt`、`topology-template`、`work-architecture`、`production-resource-service` 等共享消费面，识别当前仅为兼容旧后端五层结构而保留的 `jobCategories / stations / 投影折叠展开` 壳层。
  - [ ] 将前端共享 contract 真正统一为 `ProductionLine -> Segment -> ProcessStep`，不再让 `jobCategories` 作为前端主类型的一部分存在。
  - [ ] 将当前资源服务中的读取折叠 / 保存展开逻辑升级为显式 adapter 或 contract 层，并评估是否需要同步调整后端返回 contract，避免业务组件继续依赖隐式兼容转换。
  - [ ] 清理 `topology-template`、`work-architecture` 等共享模块中仍直接消费旧层级概念的类型与命名，确保三层模型在共享前端侧一致。
  - [ ] 明确哪些后端深层结构属于历史保留、哪些需要新增独立接口或只读 projection，避免继续让前端页面承担“猜测后端层级”的职责。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录去兼容壳边界、受影响模块、验证结果与仍明确延后的后端重构项。

- [ ] 135. 后端统一：产线拓扑 API / persistence model 收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/services/production_service.go`、对应 handler / route / repository，明确当前后端五层结构中哪些属于真实持久化需求，哪些只是历史抽象残留。
  - [ ] 设计统一三层后端 contract：对前端返回与接收的产线拓扑统一为 `ProductionLine -> Segment -> ProcessStep`，不再要求前端理解 `JobCategory / Station` 中间层。
  - [ ] 明确 persistence model 的迁移策略：是直接调整数据库与模型结构，还是保留底层表结构并在服务层建立后端防腐映射，分阶段去掉五层外露 contract。
  - [ ] 评估并列出受影响的后端消费链：产线保存、回填、权限校验、拓扑模板、work architecture、wheel trace 或其它读取生产拓扑的服务。
  - [ ] 明确兼容与迁移方案：旧数据如何迁移、旧接口如何退场、是否需要新增版本化 API 或一次性替换现有 `/production/lines` contract。
  - [ ] 完成前后端最小验证并更新 `walkthrough.md`，记录 contract 变化、迁移边界、回滚思路与明确排除项。

- [ ] 136. 站点能力映射子域重命名 / 重建模，并拆除旧表旧接口（审批稿）
  - [ ] 复核 `models.Station`、`station_process_mappings`、`production_station_mapping_handlers.go`、`work-architecture` 相关调用链，明确“站点能力映射”是否应独立为新的子域，而不再挂靠旧 `JobCategory / Station` 命名体系。
  - [ ] 设计新的领域命名与模型边界：明确旧 `Station`、旧 `station_process_mappings`、旧 `/production/mappings` 接口各自将被什么新实体与新接口替代。
  - [ ] 明确数据迁移策略：旧表如何迁移到新表、旧 ID 如何保留或映射、历史能力映射如何防止丢失或重复。
  - [ ] 明确拆除清单：哪些旧表、旧模型字段、旧 repository 方法、旧 handler / route、旧前端服务接口将在本轮被删除。
  - [ ] 评估受影响消费链：`work-architecture`、产线保存回填、wheel trace、团队/班组关联、其它直接读取站点能力映射的服务。
  - [ ] 完成迁移验证并更新 `walkthrough.md`，记录新旧模型对照、迁移脚本、回滚方案与明确排除项。

- [ ] 137. 定向修复 `production-shared / scan-platform` 当前 TypeScript 编译错误（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`use-work-architecture.ts` 与 `station-capabilities-dialog.tsx`，确认当前 `station` 语义与 `job` 能力映射接口之间的漂移边界。
  - [ ] 复核 `src/features/scan-platform/contracts/wheel-trace-gateway-contract.ts`、`models/wheel-trace.ts` 与 `examples/wheel-trace/mock-wheel-trace-gateway.ts`，确认 `currentStage` / `timeline` mock 数据与最新三层 contract 的差异。
  - [ ] 设计最小修复方案：仅修正目标调用点与 mock/props 字段，使其重新对齐现有 contract，不在本轮扩展到更大范围的站点能力重建模。
  - [ ] 执行定向 TypeScript 验证并更新 `walkthrough.md`，记录本轮变更点、验证结果与明确未处理项。

- [ ] 138. 加固 `.gitignore`，避免本地敏感文件 / 运行时目录 / 工具缓存被误传服务器（审批稿）
  - [ ] 复核当前 `.gitignore` 已覆盖项与本地实际存在的 ignored 文件，明确哪些敏感文件、缓存目录、运行时产物仍有补充空间。
  - [ ] 设计最小加固方案：只补充高风险且明确不应入库/不应随源码上传服务器的规则，不改动已存在的业务源码跟踪策略。
  - [ ] 执行定向验证，确认新增规则能覆盖目标文件/目录，并记录仍建议通过“仅传 Git 跟踪文件”规避的部署风险。

 - [ ] 139. 定向修复 `DMPreview` 二维码渲染参数透传 `undefined` 导致 bwip-js 报错（审批稿）
  - [ ] 复核 `src/features/basic-settings/components/dm-preview.tsx` 当前 `bwipjs.toCanvas(...)` 参数构造方式，确认 `qrcode` 与 `datamatrix` 分支是否显式透传了 `height: undefined`、`eclevel: undefined` 等非法 option。
  - [ ] 将条码渲染配置改为“按码制条件追加字段”的显式构造方式：公共字段与 `code128` 专属字段、`qrcode` 专属字段分离，避免把 `undefined` 作为 option 值传给 `bwip-js`。
  - [ ] 保持 `DMPreview` 现有 UI、canvas 尺寸、短码展示、后缀标签与视觉布局不变，不扩展为组件重构或条码样式重设计。
  - [ ] 重点验证 `qrcode`、`datamatrix`、`code128` 三类预览都能正常渲染，且控制台不再出现 `bwipp.invalidOptionType` / `height: not a realtype: undefined`。
  - [ ] 补充最小静态验证并更新 `walkthrough.md`，记录本轮根因、修复方式、验证结果与明确未处理项。

- [ ] 140. 架构大瘦身：产线拓扑唯一合法层级收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/repositories/production_repository.go`、`server/services/production_service.go`、`server/services/production_line_contract.go` 与前端 `src/features/production-shared/**`，确认当前仍残留的 `JobCategory` / `Station` 定义、预加载、DTO 回退与 UI 错层级命名。
  - [ ] 以“只有产线-工段-工序，其他层级均为冗余且错误”为单一事实来源，重写本轮边界：`JobCategory`、`Station` 不再作为主产线拓扑链的合法层级存在。
  - [ ] 将本轮执行拆成两段：一段收口主产线拓扑后端 contract / 持久化链，另一段评估旧 `Station` 能力映射是否应独立成新子域，而不是继续挂在主拓扑模型下。
  - [ ] 明确本轮高风险点：历史数据降维、旧接口退场、模板/工艺架构消费面联动、隐藏依赖排查不足导致的静默回归。
  - [ ] 在用户审批前不修改业务代码，只输出经过代码证据验证后的中文实施清单、风险、验证方案与确认点。

- [ ] 141. 后端主链收口：删除产线拓扑中的 `JobCategory / Station` 冗余层（审批稿）
  - [ ] 复核 `LineSegment.JobCategories`、`JobCategory`、`Station` 在 GORM 模型、预加载、保存事务、关联清理与 DTO 映射中的真实职责，区分“主拓扑冗余”与“其它子域借用”的边界。
  - [ ] 设计主产线拓扑唯一 contract：`ProductionLine -> LineSegment -> ProcessStep`，对外返回与保存均不再暴露 `jobCategories`、`stations`、折叠回退或兼容壳。
  - [ ] 规划后端代码改动：移除 `LineSegment` 上对 `JobCategory` 的主链依赖，删除产线保存链中 `DeleteJobCategoriesNotIn`、`DeleteProductionStationsNotIn`、相关 ID 收集与 DTO fallback 逻辑。
  - [ ] 评估数据库/持久化策略：若本轮不直接删表，也要明确这些表已退出主拓扑；若直接删表/删模型，则必须给出迁移、回滚与历史数据落点方案。
  - [ ] 识别所有受影响消费方：`/production/lines` 相关 handler/service/repository、前端 `line-mgmt`、`topology-template`、`work-architecture`、以及任何直接依赖旧层级字段的测试与适配代码。
  - [ ] 明确验证方案：后端定向 `go test`、前端 `pnpm exec tsc --noEmit`、目标文件 `eslint`、以及保存/回填/空树/历史数据读取场景验证。

- [ ] 142. 旧站点能力映射去耦：`Station` 不再挂靠主产线拓扑（审批稿）
  - [ ] 复核 `AssignProcessToStation`、`RemoveProcessFromStation`、`ListStationMappings`、`station_process_mappings`、`work-architecture` 等链路，确认哪些能力确实仍需要“站点/能力映射”子域，哪些只是历史命名残留。
  - [ ] 明确架构原则：即使保留某种“能力映射”实体，它也不能再作为主产线拓扑的中间层解释 `工段 -> 工序` 关系。
  - [ ] 设计下一步子域策略：独立重命名、独立接口、独立表/映射关系，或在确认无人消费后彻底删除旧 `Station` 链路。
  - [ ] 列出本轮暂不执行但必须预警的破坏性动作：删旧表、删旧 handler / route、删旧前端能力映射 UI、迁移历史映射数据。
  - [ ] 在 `walkthrough.md` 中预留验证与迁移记录位置，确保后续真正执行时可追溯主拓扑收口与子域拆分的边界。

- [ ] 143. 未消费历史壳归档：清理 `line-mgmt` 下遗留 `station-node` 文件（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/components/topology/station-node.tsx` 与 `topology-editor/station-node.tsx` 的真实消费情况，确认不存在静态 import、barrel 再导出、测试引用或动态装配依赖。
  - [ ] 将本轮范围严格限定为“未消费历史壳归档”，不触碰 `work-architecture/components/station-node.tsx` 与后端 `Station` 能力映射子域。
  - [ ] 设计归档式清理策略：优先直接删除两份无人消费文件；若发现仍有隐式依赖，则退回为“去入口暴露 + 文档标注待删”，避免误删活跃链路。
  - [ ] 明确风险点：路径删除可能影响 IDE 历史引用、未来未提交分支的旧 import、以及人肉回忆式复用；需通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：执行 `grep_search` 复核 `station-node` 引用、执行 `pnpm exec tsc --noEmit` 验证删除后无编译回归，并更新 `walkthrough.md` 记录归档结果。
  - [ ] 在用户审批前不删除业务文件，只输出归档范围、执行策略、风险与确认点。

- [ ] 144. 活跃链路净化：收口 `work-architecture` 中 `station / job` 命名漂移（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`station-capabilities-dialog.tsx`、`process-capability-node.tsx`、`hooks/use-work-architecture.ts` 与 `production-resource-service.ts` 的当前职责，区分“独立能力映射节点”与“旧主拓扑层级残留命名”。
  - [ ] 将本轮范围限定为前端活跃链路命名净化：统一节点 props、回调名、局部变量名与用户可见文案，避免继续混用 `station / job / process` 误导语义。
  - [ ] 明确接口边界：若后端 `/production/mappings` 当前请求体仍使用 `stationId`，则本轮仅在前端通过中性命名或 adapter 隔离该字段，不直接扩展为后端接口重命名。
  - [ ] 优先处理活跃调用面中的误导命名，如 `jobId / jobName`、`StationCapabilitiesDialog`、`assignProcessToJob / removeProcessFromJob` 与相关 props/局部变量，使其与“能力映射节点”语义一致。
  - [ ] 明确风险点：`work-architecture` 为活跃页面，命名调整若边界不清，可能引发 props 错传、能力映射弹窗失效或 TypeScript 联动错误。
  - [ ] 明确验证方案：执行 `pnpm exec tsc --noEmit`，并补充全仓检索确认 `work-architecture` 活跃链路中的目标旧命名已被收口，同时更新 `walkthrough.md` 记录本轮边界与保留项。
  - [ ] 在用户审批前不修改业务代码，只输出执行范围、改名策略、风险与确认点。

 - [ ] 145. 活跃文件名收口：重命名 `work-architecture/components/station-node.tsx`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx` 的真实消费面，确认静态 import、路径引用与导出名已经可安全切换到新的中性文件名。
  - [ ] 将本轮范围限定为“文件名与引用入口收口”，不借机扩展到其它组件批量更名或后端 `Station` 子域改造。
  - [ ] 拟定目标文件名为能力映射中性语义，例如 `capability-mapping-node.tsx`，并保持文件内部导出名与文件名一致，避免继续出现“文件名仍叫 station、导出已叫 capability” 的语义断裂。
  - [ ] 明确风险点：文件重命名会影响 import 路径、IDE 打开历史、未提交分支上的旧引用以及大小写/路径缓存问题，需要通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：更新所有引用后执行 `pnpm exec tsc --noEmit`，并检索确认 `work-architecture` 活跃链路中不再残留 `./station-node` 的真实引用。
  - [ ] 在用户审批前不执行文件重命名，只输出目标文件名、引用调整范围、风险与确认点。

- [x] 146. DTO 升级断链分析：恢复 `production_topology_handlers.go` / `production_service.go` 产线拓扑保存链（已完成）
  - [x] 已复核 `server/handlers/production_topology_handlers.go`、`server/services/production_service.go`、`server/services/production_service_test.go` 与相关 repository/model，确认当前 `SaveProductionLineHandler -> SaveProductionLine -> repository.SaveProductionLine` 的真实 contract。
  - [x] 已确认断链根因：当前代码仍引用 `services.ProductionLineDTO`、`mapProductionLineDTOToModel`、`mapProductionLineToDTO`、`mapProductionLinesToDTO`，但仓内已无这些 DTO/映射定义落点，说明 DTO 升级后主 handler/service 未完成同步迁移。
  - [x] 已按单一后端 DTO contract 恢复请求/响应/映射同源，避免仅在 handler 或 test 中临时补类型。
 - [x] 已完成改动面收口：新增 `server/services/production_dto.go`，恢复 `production_service.go` 的请求/返回类型与 model 映射，并让 `production_topology_handlers.go` / `production_service_test.go` 重新接回统一 DTO 定义。
 - [x] 已同步核对 JSON 字段、`segments/processes` 嵌套映射、`version` 与 `authCode` 语义，避免恢复后继续出现运行时错绑或落库丢字段。
 - [x] 已完成最小验证：`go test ./services -run Production` 通过；`go test ./handlers -run Production` 当前被无关既有断链 `handlers/save_patch_semantics_test.go:162 undefined: services.SalesOrderDTO` 阻塞。
 - [x] 已在 `walkthrough.md` 记录本次断链点、恢复方案与验证边界。

- [x] 147. 根因修复：收口 `save_patch_semantics_test.go` 对旧 `services.SalesOrderDTO` 契约依赖（已完成）
  - [x] 已复核 `server/handlers/save_patch_semantics_test.go`、`server/handlers/sales_orders.go`、相关 `models.SalesOrder` 字段与批量同步保存路径，确认当前真实 contract 已是 `saveSalesOrderForBulkSync(tx, *models.SalesOrder)`，而非 `*services.SalesOrderDTO`。
  - [x] 已确认断链根因：当前失败并非业务主链缺失 `SalesOrderDTO`，而是测试仍停留在旧 DTO 输入模型；未通过补一个 `services.SalesOrderDTO` 制造新的伪契约。
  - [x] 已按根因修复方向让测试与真实保存语义重新对齐，围绕 `models.SalesOrder` 的 PATCH/稀疏更新语义验证未提交字段保留逻辑。
  - [x] 改动面已限定在 `server/handlers/save_patch_semantics_test.go`，未扩展为销售订单领域接口重构。
  - [x] 已核对并保留关键断言：`requirements`、`workflow_instance_id` 在 sparse update 场景下继续保留既有值。
  - [x] 已完成验证：`go test ./handlers -run SavePatchSemantics` 通过，`services.SalesOrderDTO` 这条测试断链已消失。
  - [x] 已在 `walkthrough.md` 记录本次根因修复结果与验证范围。

- [x] 148. `workflow` DTO 改造：收口 definition / instance / task 的 API contract（第一、二轮已完成）
  - [x] 已复核 `server/handlers/workflow.go`、`server/services/workflow_service.go` 与 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask`，确认当前 workflow 模块哪些接口仍直接绑定或直接返回 `models.*`。
  - [x] 已定义 `workflow` 域单一 contract：将外部 API 明确拆为 `Request / Response / Internal Model` 三层，不再让 `handler` 直接把 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask` 当成前后端协议。
  - [x] 已落第一批 Request DTO：`SaveWorkflowDefinitionRequest`、`PatchWorkflowDefinitionRequest`、`CreateWorkflowInstanceRequest`、`WorkflowTaskDecisionRequest`。
  - [x] 已落第一批 Response DTO：`WorkflowDefinitionResponse`、`WorkflowInstanceResponse`、`WorkflowInstanceListItemResponse`、`WorkflowInstanceListResponse`、`WorkflowTaskResponse`。
  - [x] 已新增同域 mapper 并统一放置 `model -> response` 映射，避免 mapper 分散在 handler 内部。
  - [x] 已按第一轮范围收口 `workflow` 主链中的 definition / instance / task 查询与创建接口，未扩展到其它业务域 DTO 重构。
  - [x] 已验证第一轮未误伤 workflow 骨架行为；定向测试 `go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"` 通过，采购/销售建单自动挂 workflow 回归保持正常。
  - [x] 第二轮已完成：审批/驳回任务的返回 contract（`ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler`）已收口为 DTO response，并完成对应最小回归验证。

- [x] 149. `workflow` DTO 改造第二轮：收口审批/驳回 response contract（已完成）
  - [x] 已复核 `server/handlers/workflow.go` 中 `ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler` 当前仍直接返回 `models.WorkflowInstance` 的调用链，以及 `services.ApproveWorkflowTask` / `RejectWorkflowTask` 的返回边界。
  - [x] 已将第二轮范围限定为“审批/驳回任务 response DTO 收口”，未扩展为 workflow service 事务逻辑重写，也未顺手修改采购/销售业务同步逻辑。
  - [x] 已复用第一轮已有 `WorkflowTaskDecisionRequest` 与 `WorkflowInstanceResponse` / mapper，未新增重复 contract。
  - [x] 已保持审批/驳回错误语义不变：`task not found`、`assignee mismatch`、`already handled`、默认 500 分支的状态码与中文错误提示未漂移。
  - [x] 已完成验证：`go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"` 通过，审批通过、审批拒绝、审批人不匹配、重复处理与采购/销售 workflow 回归链路未被破坏。
  - [x] 已在 `walkthrough.md` 记录第二轮改造结果与验证范围。

- [x] 150. `sales_orders / trading` DTO 收口：稳定订单域 API contract 与 PATCH 语义（销售订单第一轮已完成）
  - [x] 已复核 `server/handlers/sales_orders.go`、相关 trading/workflow 测试与 `models.SalesOrder` 边界，确认当前高风险点集中在销售订单主链的 request/response contract 与 sparse update 语义。
  - [x] 已为销售订单主链建立订单域 contract：拆出 `Create/Save Request`、`Patch/Sync Request`、`Response`，不再让相关 handler 默认把 `models.SalesOrder` 当成对外协议。
  - [x] 已按第一轮范围优先收口销售订单主链：覆盖保存、批量同步、列表/详情响应，以及与 `workflow_instance_id` 相关的对外返回字段边界；本轮未同时大改采购单链路。
  - [x] 已保持 PATCH / 稀疏更新边界：`saveSalesOrderForBulkSync(...)` 的 `requirements`、`workflow_instance_id` 未提交字段保留逻辑未被破坏。
  - [x] 已保持与 workflow 的边界：销售订单新建自动挂 workflow 实例的既有行为保持不变，trading workflow 相关回归未失真。
  - [x] 已完成列表/详情 contract 收口：列表使用 `SalesOrderListResponse/ListItemResponse`，详情/保存返回使用 `SalesOrderResponse`。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"` 通过。
  - [ ] 后续待扩：采购单主链 DTO 收口与其它 trading 子域 contract 收口，后续另行规划确认。

- [x] 151. `purchase_orders` DTO 收口：稳定采购单主链 API contract 与 PATCH 语义（第一轮已完成）
  - [x] 已复核 `server/handlers/purchase_orders.go`、相关 trading/workflow 测试与 `models.PurchaseOrder` 边界，确认当前高风险点集中在采购单主链的 request/response contract。
  - [x] 已为采购单主链建立单一 contract：拆出 `Create/Save Request` 与 `Response`，不再让相关 handler 默认把 `models.PurchaseOrder` 当成对外协议。
  - [x] 已按第一轮范围收口采购订单主链：覆盖保存、列表/详情响应，以及与 `workflow_instance_id` 相关的对外字段边界；本轮未扩展到整个 trading 其它子域。
  - [x] 已保持与 workflow 的边界：采购单新建自动挂 workflow 实例的既有行为未被破坏，相关 workflow E2E 回归继续成立。
  - [x] 已完成列表/详情 contract 收口：列表使用 `PurchaseOrderListResponse/ListItemResponse`，详情/保存返回使用 `PurchaseOrderResponse`。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"` 通过。
  - [ ] 后续待扩：采购单 patch/sync 进一步细化，以及收货/库存/凭证相关子链路 contract 收口，后续另行规划确认。

- [x] 152. `purchase_orders` DTO 改造第二轮：收口收货确认与下游返回 contract（已完成）
  - [x] 已复核 `server/handlers/purchase_orders.go` 中 `ConfirmPurchaseReceiptHandler` 当前返回的 `purchaseOrder` / `createdInboundRecords` 混合结构，确认成功返回仍直接暴露 `models.*`。
  - [x] 已将第二轮范围限定为“采购收货确认返回 contract 收口”，统一让采购单返回延续第一轮的 `PurchaseOrderResponse`，并为收货结果设计最小必要 response 结构；未扩展为库存/凭证全链 DTO 化。
  - [x] 已复用第一轮已有采购单 DTO / mapper，未重复发明第二套采购单 response；并仅为 `createdInboundRecords` 补最小必要 result DTO。
  - [x] 已保持既有业务语义不变：收货确认成功后的采购单状态更新、入库记录创建、错误状态码与中文错误消息未漂移。
  - [x] 已完成验证：`go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading|Receipt|Inbound"` 通过，采购收货确认、采购状态重算、入库联动与 workflow 回归未被破坏。
  - [x] 已在 `walkthrough.md` 记录第二轮改造结果与验证范围。

- [x] 153. `production` 子链路 DTO 收口：稳定 production topology 主链 contract（已完成）
  - [x] 已复核 `server/handlers/production_topology_handlers.go`、`server/services/production_service.go`、`server/services/production_dto.go` 与相关测试，确认当前 production topology 主链已具备 DTO 雏形，主要剩余问题是 handler 入口仍使用匿名请求体。
  - [x] 已将本轮范围限定为 production topology 主链最小闭环：优先加固 `SaveProductionLineHandler` 的 request contract 边界，未顺手扩展到整个 production 其它子链路。
  - [x] 已识别并复用既有 `ProductionLineDTO`、`SaveProductionLineRequest` 与 mapper，未重复发明 production DTO；仅补充正式的 handler request DTO。
  - [x] 已保持既有业务语义不变：授权码校验、版本冲突处理、拓扑保存事务与错误状态码未漂移。
  - [x] 已补充最小 request contract 绑定测试，固定 `ProductionLineDTO + authCode` 的入口结构。
  - [x] 已完成验证：`go test ./services ./handlers -run "Production|Topology"` 通过，版本冲突、授权码与 production topology 主链回归未被破坏。
  - [x] 已在 `walkthrough.md` 记录本轮 DTO 边界加固结果与验证范围。

- [x] 154. `production` 其它子链路 DTO 收口：按子模块分阶段稳定 contract（第一阶段已完成）
  - [x] 已复核 `production topology` 之外的 production 入口与 service，确认当前第一优先级应落在 `ProcessStep` / `StationProcessMapping`，因为这部分仍直接收发 `models.ProcessStep`、匿名请求体或原始 map。
  - [x] 已按“子链路分阶段治理”执行第一阶段，而非整域一次性重构；本轮仅收口 `ProcessStep + StationProcessMapping` 最小闭环。
  - [x] 已完成第一优先级入口收口：`ProcessStep` / `StationProcessMapping` 相关入口已建立稳定 request/response contract。
  - [ ] 第二优先级待后续：production 查询/报表类接口（如进度、看板、日历、汇总），重点排查空数组/null、匿名 response、跨层混用结构。
  - [x] 已保持既有业务语义不变：工序保存、工位绑定、删除与映射查询错误语义及状态码未漂移。
  - [x] 已控制范围：未把 DTO 收口扩展为 production 域全面重构。
  - [x] 已完成验证：`go test ./services ./handlers -run "Production|Process|Station"` 通过，并补充最小 handler/service contract 测试固定入口结构。
  - [x] 已在 `walkthrough.md` 记录本阶段 DTO 收口结果与验证范围。

- [x] 155. `production` 查询/报表类 contract 收口：稳定 progress/report/dashboard/calendar response（第一阶段已完成）
  - [x] 已复核 production 查询/报表相关 handlers/services，确认第一批高风险入口集中在 `server/handlers/production_plans.go` 的 plans/stats/order-progress 查询链。
  - [x] 已将本轮范围限定为“查询/报表类 response contract 收口”，优先稳定只读接口输出结构；未扩展为执行/排产链路重构，也未改写核心统计逻辑。
  - [x] 已完成第一优先级入口收口：`GetProductionPlansHandler`、`GetProductionStatsHandler`、`GetOrderProgressHandler` 已切到正式命名 response type，并保持空数据稳定语义。
  - [ ] 第二优先级待后续：其它 production report / dashboard / calendar 聚合接口，继续排查匿名 response、直出内部 model 与字段集漂移风险。
  - [x] 已保持既有业务语义不变：查询过滤条件、错误状态码、无数据返回语义、聚合逻辑与前端已依赖字段名未漂移。
  - [x] 已控制风险：未把查询/报表类收口扩展为整个 dashboard/report 体系重构。
  - [x] 已完成验证：`go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"` 通过，response shape 与空数据语义未回归。
  - [x] 已在 `walkthrough.md` 记录第一阶段 contract 收口结果与验证范围。

- [x] 156. `production` 查询/报表类 contract 收口第二阶段：report / dashboard / calendar 其它聚合接口（调查完成，当前无新增后端落点）
  - [x] 已复核第一阶段未覆盖的 production 聚合查询接口，重点检查 `server/routes/routes_production.go` 与 `server/handlers`，确认当前 `/production` 路由组下仅剩 `plans/stats/order-progress` 三个只读聚合接口，且已在第一阶段收口完成。
  - [x] 已将第二阶段范围限定为“剩余聚合只读接口 response contract 收口”，并确认当前后端代码中不存在新的 `/production` 域 `report / dashboard / calendar` 聚合只读接口可继续改造。
  - [x] 已复用第一阶段已有 production query contract 结论，无需新增 response type，也不应为凑阶段而误扩到非 production 域接口。
  - [x] 已保持边界清晰：未扩展为写接口、执行链路或其它域（equipment / audit / experimental）接口改造。
  - [x] 已完成调查验证：当前 `/production` 路由落点已无剩余第二阶段后端聚合接口；因此本阶段不新增业务代码修改。
  - [x] 已在 `walkthrough.md` 记录调查结论与当前范围边界。

- [x] 157. A 级 DTO 总推进：主交易 / workflow / inventory / production / finance 核心边界分阶段收口（inventory 第一阶段已完成）
  - [x] 已将本轮定义为“**A 级总推进计划**”，执行按阶段推进，不并行摊开所有模块。
  - [x] 已确认 A 级范围包含：
    - `workflow`
    - `sales_orders`
    - `purchase_orders`
    - `inventory` 命令链
    - `production` 主配置链
    - `production` 核心查询链
    - `voucher / finance` 核心读接口
  - [x] 已确认已完成或已建立主边界的模块（workflow / sales_orders / purchase_orders / production 主配置链 / production 核心查询链）当前以**守边界、防回退、补缺口**为主，不重复大改。
  - [x] 已完成本轮优先新实现阶段之一：`inventory` 命令链 DTO 第一轮收口。
  - [x] 已完成 `inventory` 命令链第一轮的高风险 command 收口：入库/出库/提交/作废等 request/response contract 已从 `models.*` 上剥离，状态机错误语义、并发/冲突语义与订单/成本/凭证联动边界未被破坏。
  - [x] 已完成本轮优先新实现阶段之二：`voucher / finance` 核心读接口 DTO 加固（list/detail/filter/includeEntries/空数组语义）。
  - [x] 已保持既有业务语义不变：A 级模块当前已稳定的 workflow 挂接、patch 保护、状态流转、空数组语义、错误状态码与中文错误消息未漂移。
  - [x] 已完成阶段验证：
    - `go test ./handlers ./services ./routes -run "Inventory|Inbound|Shipment|Commit|Void|PurchaseOrder|SalesOrder"`
    - `go test ./handlers ./routes -run "Voucher|Finance"`
  - [x] 已在 `walkthrough.md` 记录 inventory 第一阶段与 voucher / finance 核心读接口 DTO 加固结果。

- [ ] 158. A 级模块 contract 巡检：检查新增接口是否回退到 `models.*`（审批稿）
  - [ ] 本轮定义为“**A 级模块巡检**”，而不是立即进行新一轮大改；先识别已完成模块内是否出现 contract 回退点，再决定是否进入补缺口实施。
  - [ ] 巡检范围限定在当前 A 级模块：
    - `workflow`
    - `sales_orders`
    - `purchase_orders`
    - `inventory` 命令链
    - `production` 主配置链
    - `production` 核心查询链
    - `voucher / finance` 核心读接口
  - [ ] 巡检重点包括：
    - handler 是否重新直接绑定或返回 `models.*`
    - 新增接口是否使用匿名 request / response 结构替代正式 DTO
    - 聚合查询是否回退到匿名 response 或 `[]` / `null` 语义不稳定
    - tests 是否仍然锁定稳定 contract，而不是重新耦合到底层 model
  - [ ] 本轮先输出巡检结果，不默认顺手修改所有发现项；若发现缺口，再按风险分成后续单独小闭环执行。
  - [ ] 保持既有业务语义不变：A 级已完成主链的 workflow 挂接、patch 保护、状态流转、冲突语义、空数组语义和错误消息不能在巡检中被意外修改。
  - [ ] 重点风险点：巡检范围跨多个主链，若不先做清单化检查，容易把“补缺口”演变成第二轮无边界重构。
  - [ ] 明确验证方式：先以静态巡检和定向 grep/read 为主；若最终发现并修复缺口，再按模块执行 `go test ./handlers ./services ./routes -run "Workflow|Trading|PurchaseOrder|SalesOrder|Inventory|Finance|Voucher|Production"` 或更细粒度验证。
  - [ ] 在用户确认巡检方案前，不修改业务代码；先输出巡检范围、判定标准和后续分批处理策略。

- [x] 159. `workflow` contract 补缺口小闭环：修正 service 对外仍收发 `models.Workflow*` 的 Yellow 缺口（已完成）
  - [x] 已将本轮限定为 `workflow` 模块的小闭环补缺口，未重做整个 workflow DTO 体系。
  - [x] 已完成当前 `workflow` service 对外公开函数中主要 Yellow 缺口的收口，优先补齐了：
    - 审批 / 驳回
    - task list
  - [x] 已让 `workflow` 的 service / handler 边界继续对齐正式 contract，降低后续新增接口再次直接复用 `models.Workflow*` 的风险。
  - [x] 本轮采用最小方案：优先补 service result object / mapper 边界，未重写 workflow 事务逻辑。
  - [x] 已保持既有业务语义不变：审批/驳回状态流转、任务分配、实例更新、中文错误消息与状态码未漂移。
  - [x] 已降低主要风险：service contract 与 handler response contract 的不一致点已缩小，workflow 新增挂接点回退到 `models.Workflow*` 的概率进一步下降。
  - [x] 已完成验证：`go test ./handlers ./services -run "Workflow"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮补缺口结果与验证范围。

- [x] 160. `production` Yellow 缺口统一化：主配置链与核心查询链的 contract 风格补齐（第一步已完成）
  - [x] 已将本轮限定为 `production` 模块 Yellow 缺口统一化，未开展 production 全域 DTO 改造。
  - [x] 已优先处理主配置链中最明显的统一性缺口：
    - `GetProductionLinesHandler`
    - `GetProcessStepsHandler`
    - `GetStationMappingsHandler`
  - [x] 已补充更明确的命名 response / wrapper：
    - `ProductionLinesResponse`
    - `ProcessStepsResponse`
    - `StationMappingsResponse`
  - [x] 本轮目标已部分达成：production 主配置链的 contract 风格更一致，防回退能力进一步增强。
  - [x] 本轮采用最小方案：只补 wrapper / response type，未改 topology / process / station mapping 的业务逻辑，也未触碰核心查询链逻辑。
  - [x] 已保持既有业务语义不变：production topology、process step、station mapping、plans/stats/order-progress 的字段语义、错误状态码、空数组语义与查询逻辑未漂移。
  - [x] 已控制风险：未把 Yellow 统一化演变成 production 重构；当前主配置链读接口统一化已完成，核心查询链是否继续细化统一，留待后续按需决定。
  - [x] 已完成验证：`go test ./handlers ./services -run "Production|Topology|Process|Station|Progress"` 通过。
  - [x] 已在 `walkthrough.md` 记录 production Yellow 缺口统一化第一步结果与验证范围。

- [x] 161. `production` 核心查询链轻量风格统一化：plans / stats / order-progress（已完成）
  - [x] 已将本轮限定为 `production` 核心查询链的轻量风格统一化，未重新进行 query DTO 改造，也未改写查询逻辑。
  - [x] 已完成范围内 3 个核心入口的风格统一：
    - `GetProductionPlansHandler`
    - `GetProductionStatsHandler`
    - `GetOrderProgressHandler`
  - [x] 已补充轻量 wrapper / response 统一入口：
    - `ProductionStatsEnvelopeResponse`
    - `OrderProgressListResponse`
    - `GetProductionPlansHandler` 继续保持 `ProductionPlansListResponse`
  - [x] 本轮目标已达成：核心查询链的 contract 可读性、一致性与防回退能力进一步提升。
  - [x] 本轮采用最小方案：只补轻量 wrapper / response 统一入口，未改 `[]` / `null` 语义，未改 SQL，也未改聚合逻辑。
  - [x] 已保持既有业务语义不变：plans/stats/order-progress 当前已稳定的字段名、空数组语义、错误状态码与前端已依赖 contract 未漂移。
  - [x] 已控制风险：未把轻量统一化演变成查询链重构。
  - [x] 已完成验证：`go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮结果与验证范围。

- [x] 162. A 级模块 contract 回归巡检（第二轮）
  - [x] 已对最近已收口的 A 级模块完成第二轮回归扫描，覆盖：
    - `workflow`
    - `production`
    - `inventory`
    - `voucher / finance`
    - `sales_orders`
  - [x] 已按巡检目标识别以下回退模式：
    - service / handler 对外重新暴露 `models.*`
    - 匿名 request / response 再次出现
    - handler 直接返回裸 model / 裸 slice / 裸 map
    - 新增接口绕开现有 DTO / mapper / wrapper 体系
  - [x] 已按模块产出结论并控制改动范围：
    - `workflow` = Green
    - `production` = Green
    - `voucher / finance` = Green
    - `inventory` = 命中 Yellow，并已在本轮完成收口后回到 Green
    - `sales_orders` = 当前主链基本 Green
  - [x] 本轮未扩大为业务重构，只对命中的 `inventory` Yellow 开了最小闭环并完成修复。
  - [x] 已完成本轮交付物：
    - 模块级 Green / Yellow / 已收口结论
    - 命中的问题类型与处理结果
    - 下一步最优先小闭环建议（`purchase_orders`）
  - [x] 已在 `walkthrough.md` 记录第二轮巡检正式总结与当前 A 级主链整体状态。

- [x] 163. `inventory query + commit contract` 补缺口
  - [x] 已仅处理第二轮巡检中命中的 `inventory` Yellow 点，未扩展到 `transfer / bulk sync / stocktake` 等其他库存链路。
  - [x] 已修正 query service 对外直接返回 `models.*` 的问题，覆盖：
    - `ListInventory`
    - `ListInboundHistory`
    - `ListShipmentHistory`
  - [x] 已为 inventory query handler 补正式命名 paged response / item response，不再使用 `gin.H{"items": ...}` 承载 `[]models.*`。
  - [x] 已修正 `CommitShipment` service 对外返回 `models.ShipmentRecord` 的 Yellow 缺口，改为返回正式 DTO。
  - [x] 已按最小范围补独立 query DTO / mapper 文件，避免继续堆叠到 command 文件中。
  - [x] 已保持既有业务语义不变：库存分页语义、入库/出库历史字段、commit 事务逻辑、错误状态码与中文错误语义未漂移。
  - [x] 已完成验证：`go test ./handlers ./services -run "Inventory"` 通过，query response shape 与 commit response contract 已回归确认。
  - [x] 已同步更新 `walkthrough.md` 与本项结果。

- [x] 165. `purchase_orders` contract 小闭环（已完成）
  - [x] 已将本轮限定为 `purchase_orders` 的 contract 小闭环，未扩展为整个 trading / procurement 域重构。
  - [x] 已优先复核 `purchase_orders` 的 handler / service / workflow 挂接面，并识别出最明确的最小闭环：采购收货确认链。
  - [x] 已完成本轮最小收口：
    - `ConfirmPurchaseReceiptHandler` 从匿名 request 切到正式命名 request DTO
    - `ConfirmPurchaseReceipt(...)` 公开 service 返回值切到 `ConfirmPurchaseReceiptResponse`
    - 已补 `MapConfirmPurchaseReceiptRequestToInput(...)` 统一 request -> service input 边界
  - [x] 本轮目标已达成：未重写采购单逻辑，只收口了当前最明确的 contract Yellow 点。
  - [x] 已保持既有业务语义不变：采购单字段语义、收货确认事务、入库创建、状态重算、workflow 挂接、错误状态码与中文错误语义未漂移。
  - [x] 已完成验证：`go test ./handlers ./services -run "PurchaseOrder|Workflow"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮结果与验证范围。

- [x] 164. `sales_orders` contract 小闭环（已复核，暂不进入实现）
  - [x] 已将本轮限定为 `sales_orders` 的 contract 小闭环复核，不扩展为整个 trading 域 DTO 重构。
  - [x] 已复核 `sales_orders` 的 handler / service / workflow 挂接面，重点检查了：
    - `models.SalesOrder*` 是否对外暴露
    - 是否存在匿名 request / response
    - 是否存在直接返回裸 model / 裸 slice / 裸 map 的接口
    - workflow 挂接链是否缺少稳定命名 contract
  - [x] 复核结论：当前 `sales_orders` 主链基本 Green。
  - [x] 已确认列表 / 详情 / 保存接口已有正式命名 request / response，workflow 挂接也已有定向覆盖。
  - [x] 当前未命中值得立即开刀的明确 contract Yellow 点，因此本项不进入实现阶段，避免为了改而改。
  - [x] 本轮结论已纳入第二轮 A 级模块巡检正式总结。

- [x] 166. A 级模块 contract 防回退测试（已完成）
  - [x] 本轮已限定为 A 级模块 contract 防回退测试补强，未扩展为业务逻辑重构或全量测试治理。
  - [x] 已优先把本轮已复核/已收口的关键 contract 边界转成第一批定向测试，覆盖：
    - `inventory`：query handler response DTO / commit response DTO
    - `purchase_orders`：收货确认链命名 request / response contract 与 `receiptDate` 解析边界
    - `sales_orders`：保存返回 response shape 与 workflow 挂接稳定性
  - [x] 本轮测试目标已达成：
    - handler / service 对外 contract 不回退到不稳定结构
    - response shape 已增加关键字段断言
    - workflow 挂接链关键结果已进一步固化
  - [x] 已采用最小增量策略：仅补必要的 handler / service 定向测试，未改已有业务语义。
  - [x] 已优先复用现有模块测试文件；仅新增 `server/handlers/inventory_query_handlers_test.go` 作为缺失的 query handler 测试文件。
  - [x] 已完成验证：`go test ./handlers ./services -run "Inventory|PurchaseOrder|SalesOrder|Workflow"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮测试补强与验证结果。

- [x] 167. 第二轮 A 级模块 contract 巡检总收尾（已完成）
  - [x] 本轮已限定为第二轮 A 级模块 contract 巡检的总收尾，未扩展为新的业务代码改造、下一轮模块闭环或测试体系重构。
  - [x] 已统一当前第二轮巡检涉及模块的最终状态口径，覆盖：
    - `workflow`
    - `production`
    - `inventory`
    - `voucher / finance`
    - `sales_orders`
    - `purchase_orders`
  - [x] 已按最终收尾口径整理三类状态：
    - 已收口并已验证
    - 已复核、当前基本 Green、暂不进入实现
    - 后续如需继续推进，应进入下一轮而非继续挂在本轮
  - [x] 已复核 `task.md`、`implementation_plan.md`、`walkthrough.md` 三份文档口径，并清理残留的审批稿/执行前表述。
  - [x] 本轮目标已达成：第二轮 A 级巡检已形成“可阅读、可交接、状态一致”的最终收尾材料。
  - [x] 已明确当前收尾边界：若后续继续推进新的模块闭环或第二批测试，应进入下一轮，不再挂在本轮名下。

- [x] 168. 下一轮 `inventory` 后续最小闭环（已完成）
  - [x] 本轮已作为独立下一轮立项，仅处理 `inventory` 的一个最小闭环，未回退到第二轮收尾范围。
  - [x] 已优先复核 `inventory` 当前剩余边界，并识别出最值得优先处理的最小 contract 缺口：命令成功响应风格不一致。
  - [x] 已完成本轮最小收口：
    - `ReconcileInventoryHandler` 成功响应从 `gin.H` 切到 `InventoryCommandStatusResponse`
    - `VoidShipmentHandler` 成功响应从 `gin.H` 切到 `InventoryCommandStatusResponse`
  - [x] 本轮目标已达成：未扩展整个库存域改造，只收口了 `inventory` 命令链中命中的单一最小边界。
  - [x] 已保持既有业务语义不变：库存数量/金额逻辑、入库/出库事务、reconcile / void 语义、错误状态码与中文错误语义未漂移。
  - [x] 已完成验证：`go test ./handlers ./services -run "Inventory"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮结果与验证范围。

- [x] 169. `inventory` 再下一条最小闭环（已完成）
  - [x] 本轮已作为新的独立闭环继续推进 `inventory`，并与上一条命令成功响应统一闭环分开管理。
  - [x] 已优先复核 `inventory` 在 query / commit / command success response 统一之后的剩余边界，并识别出最值得优先处理的单一最小 contract 缺口：bulk sync 链仍直接暴露 `models.Inventory`。
  - [x] 已完成本轮最小收口：
    - 已为 bulk sync 补 `BulkSyncInventoryItemRequest` / `BulkSyncInventoryResponse`
    - `BulkSyncInventory(...)` 已改为接收正式命名 request DTO 列表
    - `BulkSyncInventoryHandler` 已切到正式 request / response contract
  - [x] 本轮目标已达成：未继续扩展库存域，只收口了 bulk sync 这一条单一最小 contract 边界。
  - [x] 已保持既有业务语义不变：库存数量/金额逻辑、bulk sync 合并逻辑、权限校验、错误状态码与中文错误语义未漂移。
  - [x] 已完成验证：`go test ./handlers ./services -run "Inventory"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮结果与验证范围。

- [x] 170. `inventory transfer request DTO` 最小闭环（已完成）
  - [x] 本轮作为新的独立最小闭环，仅处理 `TransferInventoryHandler` 的 request contract，未扩展为整个库存域继续改造。
  - [x] 已优先复核 `TransferInventoryHandler` / `TransferInventory(...)` 当前边界，并识别出最小 contract 缺口：handler 直接绑定 service input。
  - [x] 已完成本轮最小收口：
    - 已新增 `TransferInventoryRequest`
    - 已新增 `MapTransferInventoryRequestToInput(...)`
    - `TransferInventoryHandler` 已改为消费正式 request DTO
  - [x] 本轮目标已达成：未改 transfer 业务逻辑，只完成 request -> input contract 收口。
  - [x] 已保持既有业务语义不变：库存数量/金额逻辑、transfer 事务语义、权限校验、错误状态码与中文错误语义未漂移。
  - [x] 已完成验证：`go test ./handlers ./services -run "Inventory"` 通过。
  - [x] 已在 `walkthrough.md` 记录本轮结果与验证范围。
