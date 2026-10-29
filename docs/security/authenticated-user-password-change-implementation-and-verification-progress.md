# 登录用户自助修改密码：实施方案与逐步验收记录

更新日期：2026-10-28（北京时间）。状态：六步本地实施、第二轮完整性复核及第三轮应急恢复工具验证已完成，尚未部署；上线条件见文末。

## 目标与范围

在头像菜单增加“修改密码”，允许所有正常登录的用户（包括受保护的 admin）验证当前密码后修改自己的密码。成功后要求重新登录，并由服务端拒绝该账号所有旧 HTTP 登录凭证、WebSocket 凭证和连接票据。已有账号管理密码修改也必须触发同样的凭证失效。

本期不实现邮件/短信找回密码、管理员重置后首次登录强制改密、完整设备会话管理。登录页现有找回密码模拟流程改为明确提示联系管理员，避免虚假的发送成功信息。

## 实施前确认的现状

- `src/components/profile-dropdown.tsx` 没有修改密码入口。
- `server/handlers/user_update_handlers.go` 的通用账号编辑能写入密码，但受用户编辑权限和保护账号规则约束，不验证目标账号旧密码。
- `server/handlers/auth.go` 签发 24 小时 JWT；`server/middleware/auth.go` 当前不校验密码版本。
- `server/handlers/ws.go` 存在 Bearer 和 Redis 单次票据两条认证路径，已有连接也需要服务端处理失效。
- 用户审计已有密码脱敏能力，可以复用事务内写审计的基础设施。
- 找回密码页面目前只有本地延迟和模拟成功提示。

## 实施约定

1. `POST /api/v1/auth/change-password` 仅接受 `currentPassword`、`newPassword`；账号 ID 和已认证密码版本来自服务端认证上下文。无需账号管理权限，继承 CSRF 保护。
2. 用户新增 `password_version`（非空、默认 0）；JWT 和 WS 票据绑定该版本。历史无版本凭证只在账号版本为 0 时兼容，首次改密后失效。显式格式错误的版本不兼容。
3. 密码与版本递增、成功审计在同一事务中完成；并发请求必须比较原密码哈希及版本，避免旧请求覆盖新密码。版本只在真正写入密码时递增。
4. 新密码沿用现有账号表单的至少 8 位、包含小写字母及数字要求，并在后端强制执行；UTF-8 编码不超过 bcrypt 的 72 字节上限；不静默裁剪密码，拒绝首尾空白。旧密码按原始输入验证。
5. 当前密码错误返回可识别业务错误（422），不触发前端 401 自动登出；失效的登录凭证返回 401。改密接口按账号/IP 限流，审计和日志不得包含明文或哈希。
6. WS 握手校验当前版本，已有连接在发送消息前及周期检查中校验版本；这样不依赖前端自觉退出，也不依赖单节点内存通知。
7. 成功清除认证和 CSRF Cookie，前端清除登录状态及查询缓存，跳转登录页；取消/关闭弹窗清空密码。
8. 通用账号 PATCH/PUT 拒绝本人直接提交密码，防止绕过当前密码验证；账号表单编辑本人时隐藏密码输入并引导使用头像入口。管理员重置其他账号仍走原权限控制。

## 分步进度

| 步骤 | 内容                                           | 状态   | 验收证据                                                                                                        |
| ---- | ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 1    | 方案、范围与验收标准落文档                     | 已完成 | 本文档已建立；完成现有认证、账号编辑和 WS 代码核查                                                              |
| 2    | 密码规则、版本模型与 HTTP 旧凭证校验           | 已完成 | `go test ./security ./middleware -count=1` 通过；覆盖 UTF-8 上限、历史凭证、Bearer/Cookie 及格式错误的版本      |
| 3    | 自助改密接口、并发保护、审计、限流与管理端联动 | 已完成 | 服务层、HTTP、真实 PostgreSQL 并发和 Redis 跨中间件限流测试全部通过                                             |
| 4    | WS 凭证、票据和已有连接失效                    | 已完成 | 真实 WebSocket 连接验证通过；旧 Bearer/Redis 票据被拒绝，已有连接停止发消息并关闭                               |
| 5    | 头像入口、改密弹窗与真实的找回密码提示         | 已完成 | 相关 5 个 Vitest 文件、33 个用例通过，含失败保留身份、成功清缓存、关闭销毁密码和请求中禁止重复提交              |
| 6    | 集成检查、回归与发布说明                       | 已完成 | Go 全包编译、相关后端回归、33 个前端用例、TypeScript/ESLint/格式/中英文检查，以及真实浏览器桌面和移动端检查通过 |

每步完成验证后立即更新本表，并在下方追加实际改动、验证结果和遗留项。不可将尚未执行的验证记为通过。

## 验收清单

- [x] 无账号管理权限的普通用户可以修改自己的密码，不能指定其他账号。
- [x] 受保护 admin 可自行改密，通用账号编辑的保护规则保持有效。
- [x] 当前密码错误、新旧相同、弱密码、超长和首尾空白被拒绝，原密码与登录状态不受影响。
- [x] 成功后旧密码不能登录，新密码可登录；所有旧 HTTP 凭证失效。
- [x] 管理端 PATCH/PUT 修改密码也递增版本；普通资料编辑不递增。
- [x] 并发改密最多一个请求成功；审计失败时密码和版本一起回滚。
- [x] 旧 WS Bearer、改密前签发的票据和已有连接均由服务端拒绝或关闭。
- [x] 缺少 CSRF、未登录、触发限流时分别正确拒绝。
- [x] 弹窗成功清理登录和查询缓存，失败保留表单交互；关闭后不保留密码。
- [x] 不再展示未经实际发送的找回密码邮件成功提示。
- [x] 通用账号 PATCH/PUT 不能绕过当前密码校验为本人改密。
- [x] 真实 PostgreSQL 为历史账号新增版本列时默认回填 0，保留原密码，迁移后可正常改密。

## 实施与验证记录

### 步骤 1：方案建立（已完成）

- 已核查头像、认证、账号修改、审计、WS 和找回密码流程。
- 工作区已有其他任务修改，实施仅调整本功能相关位置，保留已有改动。
- 新字段通过现有 `models.User` 的 GORM AutoMigrate 加入，不单独修改数据库启动流程。

### 步骤 2：规则与 HTTP 凭证版本（已完成）

- 用户模型增加不对外序列化的密码版本；新登录签发版本声明，认证中间件读取数据库当前版本并校验。
- 无声明的历史凭证只映射为版本 0；拒绝字符串、负数、小数、空值等格式错误版本。
- 后端新增统一规则和 bcrypt cost 11 哈希工具，密码不静默裁剪，支持内部空格并按 UTF-8 字节限制长度。
- 已验证：版本递增后，历史凭证和旧版本凭证通过 Bearer/Cookie 两种方式访问均返回 401；当前版本可访问。
- 执行结果：`go test ./security ./middleware -count=1` 全部通过。

### 步骤 3：自助改密与账号管理联动（已完成）

- 新增认证用户专用路由和严格请求解析，拒绝客户端指定账号；无需任何业务权限，沿用认证组 CSRF 保护。
- 当前密码错误返回 422；成功清除认证/CSRF Cookie。受保护 admin 可通过本接口改密，原通用编辑保护规则仍有效。
- bcrypt 验证和生成后，在事务中加行锁并再次比较原哈希、版本、账号状态；密码、版本和脱敏审计一起提交。
- PATCH/PUT 管理端密码写入自动递增版本；资料修改不递增。密码 SQL 写入关闭参数日志，避免数据库异常泄露哈希。
- 生产改密限流使用 Redis 原子计数：账号 5 次/5 分钟、IP 20 次/5 分钟，多实例共享；Redis 不可用时返回 503。无 Redis 的非生产环境采用内存限流。
- 执行结果：`go test ./services ./routes -run 'TestAuthenticatedPasswordChange|TestAdministrativePasswordChanges' -count=1 -v` 通过。设置专用测试环境变量后，真实 PostgreSQL 4 个并发请求只有 1 次成功且只有 1 条审计，Redis 的两套独立中间件共享次数限制。
- 测试使用独立临时 PostgreSQL/Redis 容器和隔离 schema，未修改开发业务数据库。

### 步骤 4：WebSocket 服务端失效（已完成）

- 新票据保存签发时的密码版本；握手同时校验当前数据库版本及账号状态，改密前票据消费后返回 401，仍保持单次使用。
- 已有连接在每次发送前查询当前版本，空闲连接每 15 秒检查一次。失效或数据库校验失败时发送策略关闭码 1008 并关闭连接；数据库查询有 3 秒超时，消息写入有 10 秒超时。
- 已验证旧 Bearer（含无版本历史 token、旧版本、格式错误版本）、真实 Redis 旧票据均被拒绝。
- 使用真实 WebSocket 客户端验证：有效时可收消息，改密后的下一条消息不会送达；空闲连接也会被周期检查关闭。
- 执行结果：`go test ./handlers -run 'TestWebsocket|TestShouldDeliverNotification' -count=1 -v` 全部通过（配置独立 Redis 测试地址）。

### 步骤 5：头像改密交互与找回密码说明（已完成）

- 头像菜单接入独立改密弹窗，包含当前密码、新密码、确认新密码及重新登录说明，中英文同步。
- 复用密码输入组件；提交中禁止重复提交和关闭；关闭组件销毁密码状态。
- 当前密码错误和限流在弹窗中显示，保留登录及查询缓存；成功响应必须包含明确成功标记，随后取消查询、清空身份及查询缓存并跳转登录页。
- 新建/编辑账号前端复用相同密码规则，不再静默裁剪首尾空白；后端创建及编辑密码错误返回实际规则说明。
- 删除模拟邮件表单，找回密码页展示联系管理员及返回登录入口。
- 执行结果：`pnpm exec vitest run src/features/auth/change-current-user-password src/features/users/components/users-action-dialog.submit.spec.ts src/features/users/services/user-api.spec.ts src/features/users/hooks/use-users.spec.ts`：5 个文件、33 个用例全部通过。
- 后端账号/权限相关回归通过：`go test ./security ./middleware ./handlers ./services ./routes -run 'Test.*User|Test.*Account|Test.*Auth|Test.*Websocket|TestShouldDeliverNotification|TestAdministrativePassword' -count=1`（本次未设置外部集成变量的可选测试跳过；此前已单独运行真实 PG/Redis 验证）。

### 步骤 6：最终复核与集成验收（已完成）

- 补上旧通用编辑接口的本人改密绕过：PATCH/PUT 返回 `403 auth_self_password_change_required`。账号表单编辑本人时显示头像入口指引；管理员重置其他账号仍可用。
- 新建账号的数据库操作也关闭 SQL 参数日志，避免创建失败时输出密码哈希。
- 真实 PostgreSQL 增补验证：并发请求只提交一次；删除审计表模拟写入故障后，密码和版本保持原值；删除版本列模拟历史结构后运行 AutoMigrate，旧账号版本回填 0 且保留原密码。
- 后端最终相关测试全部通过（设置独立 PostgreSQL/Redis 测试环境变量）：`go test ./security ./middleware ./handlers ./services ./routes -run 'TestNewUserPassword|TestPasswordVersion|TestAuthenticatedHTTP|TestAuthenticatedPasswordChange|TestAdministrativePasswordChanges|TestWebsocket|TestShouldDeliverNotification' -count=1`；新增迁移测试另执行 `go test ./services -run 'TestAuthenticatedPasswordChangePostgres' -count=1 -v` 通过。
- 全包编译检查：`go test ./... -run '^$'` 通过。此命令仅验证全包及测试编译，不代表全仓所有测试已执行。
- 前端最终回归：相关 5 个 Vitest 文件、33 个用例通过；`tsc -b --pretty false` 通过；相关修改文件 ESLint、Prettier 通过。
- 契约及本地化：`verify:account-authz`（17 个原有账号路由）、`verify:i18n`、`verify:zh-cn-encoding` 全部通过。自助改密新路由另由真实认证/CSRF 中间件 HTTP 测试覆盖。
- 使用 Playwright CLI 操作真实 Chromium：普通用户登录后从头像打开弹窗，错误旧密码保持原页面并显示错误；正确提交后回到登录页；找回密码页展示联系管理员；桌面 1280×720 与移动端 390×844 的弹窗截图已目视检查，输入框及操作按钮可见。
- 浏览器交互使用模拟 API，不连接真实业务数据；后端凭证、数据库事务和 WS 验证由上述独立集成测试完成。浏览器其他业务模块的简化模拟响应产生无关控制台错误，未将其作为全站无错误验收。
- 截图：`output/playwright/authenticated-user-password-change-dialog-desktop.png`、`output/playwright/authenticated-user-password-change-dialog-mobile.png`（本地验收产物）。

## 关键实现位置

| 职责                    | 文件                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 头像入口                | `src/components/profile-dropdown.tsx`                                                                                                  |
| 弹窗及成功清理          | `src/features/auth/change-current-user-password/change-current-user-password-dialog.tsx`                                               |
| 前端规则与请求          | `src/features/auth/change-current-user-password/new-user-password-policy-validation.ts`、`change-current-user-password-api-service.ts` |
| 后端路由及请求处理      | `server/routes/authenticated_user_password_change_routes.go`、`server/handlers/authenticated_user_password_change_handler.go`          |
| 事务、并发与审计        | `server/services/authenticated_user_password_change_service.go`                                                                        |
| 密码校验及哈希          | `server/security/user_password_validation_and_hashing.go`                                                                              |
| 认证版本校验            | `server/middleware/authenticated_user_password_version_validation.go`、`server/middleware/auth.go`                                     |
| 分布式改密限流          | `server/middleware/authenticated_user_password_change_rate_limiting.go`                                                                |
| WS 票据、握手及已有连接 | `server/handlers/ws.go`                                                                                                                |
| 账号管理联动            | `server/handlers/user_update_handlers.go`、`server/services/user_command_service.go`                                                   |

## 接口结果与复验入口

- 成功：200，`{"status":"ok","requiresSignIn":true}`，并清除认证/CSRF Cookie。
- 请求结构错误：400；未登录/凭证已失效：401；缺少 CSRF：403。
- 当前密码错误：422 `auth_current_password_incorrect`；新旧相同：422 `auth_new_password_unchanged`；不符合密码规则：422 `auth_new_password_invalid`。
- 触发限流：429 `auth_password_change_rate_limited`；生产限流依赖不可用：503 `auth_password_change_unavailable`；事务未成功：500 `auth_password_change_failed`。
- 后端可选集成测试分别通过 `PASSWORD_CHANGE_TEST_POSTGRES_DSN` 和 `PASSWORD_CHANGE_TEST_REDIS_ADDR` 指定独立测试服务；未设置时仅跳过依赖外部服务的用例。PostgreSQL 用例自行创建并清理隔离 schema，Redis 测试应使用专用实例。

## 发布注意事项

- 先运行包含新字段的数据库迁移，再启用读取新字段的认证服务；当前项目启动流程已有 AutoMigrate。
- 多实例发布应使所有实例升级到支持版本校验的代码，避免旧实例继续接受旧凭证。
- 历史版本 0 的登录默认可继续使用，账号第一次改密后全部失效。旧程序版本无法提供该失效保证，不应直接回滚到不校验版本的认证实现。
- 各设备的旧凭证从改密事务提交后被服务器拒绝；其他页面在下一次 HTTP 请求或 WS 重连时处理登出，并不保证所有设备界面同时跳转。空闲 WS 默认最多等待 15 秒检查周期后关闭。
- 部署后待验证：迁移成功、所有实例版本一致、生产 Redis 限流可用，以及两台设备之间的改密/重新登录流程。本地验收不代替部署验收。

## 第二轮完整性与异常边界复核

复核日期：2026-10-28。用户要求再次检查遗漏；以下项目完成后逐项更新，未验证项不计为通过。

| 项目                         | 排查结论与处理                                                                                                   | 状态             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------- |
| 改密后的异步身份同步         | 快照按请求登录凭证合并；写入前核对凭证及账号；改密成功先清身份再等待查询取消                                     | 已修复并通过回归 |
| 旧请求影响新登录             | 旧 401 和延迟改密成功均核对请求所属凭证，不清除后来建立的会话；查询取消失败仍完成退出                            | 已修复并通过回归 |
| 前后端密码规则一致性         | 统一 Unicode White_Space 和 BOM 边界、bcrypt 前缀限制；前端拒绝孤立代理字符，明确 72 字节限制                    | 已修复并通过回归 |
| 生产限流故障                 | 同时检查实际 Gin Release 模式；Redis 操作上下文 2 秒、单次读写 1 秒；无响应依赖返回 503                          | 已修复并通过回归 |
| WebSocket 会话寿命与失效边界 | 已补原登录凭证到期计时；票据有效期取 60 秒与 JWT 剩余时间的较小值，连接不能延长原登录寿命                        | 已修复并通过回归 |
| 管理重置与自助改密交错       | 真实 PostgreSQL 暂停旧快照读取后的请求，先提交管理重置，再恢复自助请求；后者拒绝覆盖                             | 已通过回归       |
| 跨账号 IP 限流               | 真实 Redis 两个中间件交替请求，21 个不同账号在同一 IP 的第 21 次被拒绝；账号维度 5 次限制仍独立有效              | 已通过回归       |
| 日志及失败恢复               | 新增只记录账号、请求 ID、IP、固定结果码的日志；HTTP 审计故障时密码、版本和 Cookie 保持有效，日志不包含密码及哈希 | 已修复并通过回归 |

本轮已执行：相关 5 个前端文件、41 个用例通过；后端 security/middleware 的密码规则、凭证版本和限流故障测试通过。限流故障测试使用本地只接受 TCP 连接而不响应的服务，确认请求在 4 秒测试上限内返回 503，不触发改密处理。

本轮 PostgreSQL/Redis 集成回归已通过，包括版本迁移、事务回滚、并发提交、管理重置交错、跨实例及跨账号限流、WS 票据单次消费、连接密码版本失效及原 JWT 到期关闭。HTTP 故障/日志回归也已通过。

本轮最终验证记录：

- 前端：8 个文件、58 个 Vitest 用例通过，包含改密、账号表单/请求/查询、身份快照同步、实时权限刷新及 API 请求生命周期。
- 后端：设置独立 PostgreSQL/Redis 地址后，`go test ./security ./middleware ./handlers ./services ./routes -run 'TestNewUserPassword|TestPasswordVersion|TestAuthenticatedHTTP|TestAuthenticatedPasswordChange|TestAdministrativePasswordChanges|TestWebsocket|TestShouldDeliverNotification' -count=1` 全部通过。
- TypeScript 构建、相关文件 ESLint 和 Prettier、中英文结构与中文编码检查、17 个账号管理路由契约检查全部通过。
- `go test ./... -run '^$'` 全包及测试编译通过，此命令不运行测试用例。
- 未执行完整仓库测试全集；本轮的针对性验证覆盖上述改动，浏览器截图仍为第一轮验收产物。

### 明确的保证与边界

- 密码事务提交后，后续认证会拒绝旧密码版本。**此前已通过认证、正在执行的业务请求不会被撤销**；已经通过发送前校验的 WS 消息也存在与改密提交交错的极短窗口，不能声称绝对零消息越界。需要这种严格保证的业务，必须在业务事务内增加凭证版本栅栏，属于更大的授权体系改造。
- WS 空闲版本检查周期为 15 秒，数据库校验最多等待 3 秒，关闭帧写入最多等待 1 秒；繁忙连接还受单次消息写入最多 10 秒限制。原 JWT 到期有独立计时器，下一次发送前仍校验到期时间。
- 缺少 `exp` 的签名 JWT 不再接受；项目原有登录本就签发 `exp`。旧格式 WS 票据因不含原会话到期时间而被拒绝，升级期间客户端重取票据即可。服务端时钟应保持同步。
- 每条 WS 消息和每个空闲检查都会查用户版本；容量估算需计入“连接数 / 15 秒 + 发出消息数”的额外数据库读请求。不能改成无失效机制的本地缓存，否则跨实例撤销不再可靠。
- 网络中断导致提交结果未知时，不自动重放改密请求。用户按提示尝试新密码登录；事务及版本校验防止旧请求覆盖已提交结果。
- 浏览器持久化凭证即使因存储故障未能清理，服务端也会拒绝其旧密码版本；本功能不删除业务离线草稿或清空所有 IndexedDB 数据。

### 仍需安排的能力与上线条件

1. **生产上线验收（必做）**：备份及迁移、所有节点升级、Redis 故障/恢复、可信代理下 IP 判断，以及两台设备互相退出的实机流程。当前尚未部署。
2. **受保护管理员的应急恢复（必做运维约定）**：普通账号可由具备权限的管理员重置；受保护 `admin` 不能通过通用账号接口被重置。第三轮已补独立离线恢复命令及[恢复与上线验收规程](protected-administrator-emergency-password-recovery-and-password-change-production-acceptance-runbook.md)，验证进度见下表。生产使用前仍需落实身份核实、维护窗口、备份和恢复验收，不可直接写明文密码或只更新哈希而不递增版本。修改 `INITIAL_ADMIN_PASSWORD` 仅影响首次建库，不会重置已存在账号。
3. **后续增强（本期未实现）**：管理员重置后首次登录强制改密、邮件/短信身份验证找回、MFA、完整会话/设备管理。当前“找回密码”页面是联系管理员说明，不代表这些能力已经存在。

## 第三轮：受保护管理员应急恢复与上线规程

继续实施日期：2026-10-28。仅开发和验证恢复工具，不对现有开发或生产账号执行恢复。

| 步骤 | 内容                                                             | 状态                                                                                             |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1    | 确定恢复边界、默认只读预检、交互确认和安全输入约定               | 已完成                                                                                           |
| 2    | 离线恢复事务：限定受保护管理员、版本比较、密码规则、原子审计     | 已完成，SQLite 与真实 PostgreSQL 并发/回滚验证通过                                               |
| 3    | 命令：显式数据库配置、无启动副作用、隐藏密码输入、无密码参数     | 已接入 Dockerfile，参数拒绝/确认/输入异常、PG 只读预检/成功执行及真实 Linux PTY 隐藏输入测试通过 |
| 4    | 回归与真实 PostgreSQL 验证：回滚、并发、旧凭证失效和命令拒绝路径 | 已完成，PG 登录/凭证联动、相关后端回归、全包编译及 go vet 全部通过                               |
| 5    | 运维手册及生产多节点/双设备验收表                                | 已完成，生产执行结果保持待验收                                                                   |

恢复操作只供已获服务器及数据库运维权限的操作人，在完成身份核实、备份和维护窗口安排后使用。命令默认只读取指定账号的非敏感元数据；执行必须显式指定账号 UUID、预期密码版本、操作人和工单原因，并在交互终端再次确认目标及输入两次新密码。不会创建账号、激活账号、提升权限或执行数据库迁移，不提供网络恢复接口。

实际实现位置：

- `server/services/protected_administrator_emergency_password_recovery_service.go`：资格校验、版本比较及恢复/审计原子事务。
- `server/cmd/recover-protected-administrator-password/`：独立数据库连接和交互式维护命令，使用 `golang.org/x/term` 隐藏密码输入，不接受密码参数或管道。
- `server/Dockerfile`：构建并携带恢复二进制，API 原启动命令不变。
- [受保护管理员应急恢复与改密生产验收规程](protected-administrator-emergency-password-recovery-and-password-change-production-acceptance-runbook.md)：只读预检、确认、异常处理、恢复验收和生产验收表。

第三轮验证记录：

- 独立临时 PostgreSQL/Redis 中，恢复工具、自助改密、版本校验及 WS 相关测试全部通过；每个 PG 用例创建并清理隔离 schema。
- 命令回归验证了无数据库配置时拒绝连接、无终端时拒绝执行、禁止密码参数且错误不回显参数值、精确确认、二次密码不一致/中断时不写入、原始数据库错误脱敏和密码缓冲区清理。
- 实际 Linux 命令和 Linux 测试二进制交叉构建成功。在已有 Alpine 镜像创建的一次性容器中，通过 `/dev/ptmx` 建立真实终端，完整执行恢复，验证两次秘密输入期间 `ECHO` 均关闭、输出无密码、密码版本增至 1。新增 Linux 专用测试保留在命令目录，复验需设置独立 PG DSN 和 `PASSWORD_RECOVERY_TEST_COMMAND_BINARY`。
- Linux PTY 验证最初尝试使用临时 Python 镜像，但 Docker Hub 下载因网络超时未成功；后改用 Go Linux 专用测试与本地已有 Alpine 镜像，已完成相同验收，无需额外 Python 运行时。
- 生产镜像仅增加恢复二进制的构建/复制规则；已验证 Linux 二进制构建，未构建或发布完整生产镜像。
- 最终后端回归：独立 PG/Redis 下，恢复命令、security、middleware、handlers、services、routes 六个包的改密/恢复/WS 相关用例全部通过；`go test ./... -run '^$'` 全包及测试编译通过，`go vet ./cmd/recover-protected-administrator-password ./services` 通过。没有执行全仓测试全集。
- PostgreSQL 预检连接的实际写入尝试被数据库拒绝；生产状态和业务账号未被本轮工具修改。生产多节点、真实双设备及应急恢复演练仍按新规程逐项待验收。

## 第四轮：隔离双实例与真实浏览器联调

继续验证日期：2026-10-28。使用专用临时 PostgreSQL、Redis、API 端口和浏览器上下文，不读取现有开发环境文件、不修改现有账号。本轮结果只代表本地隔离验收。

| 步骤 | 内容                                                                       | 状态                                                                    |
| ---- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1    | 从源码构建并以完整启动入口运行两个 API 实例，共享隔离数据库和 Redis        | 已完成，两个实例健康检查均返回 200，使用 release 模式                   |
| 2    | 两个独立浏览器会话真实登录；错误旧密码、成功改密、跨实例退出与新旧密码登录 | 已通过，覆盖受保护管理员及无业务权限普通账号，收尾修复复验通过          |
| 3    | 依赖故障恢复、代理 IP 边界及必要回归                                       | 已通过，双实例共享限额、Redis 暂停/恢复、代理边界及最终回归均通过       |
| 4    | 完整生产镜像构建尝试，记录实际结果和阻碍                                   | 已尝试，Docker Hub 连接超时，基础镜像元数据未获取成功，不能计为构建通过 |
| 5    | 更新上线规程，停止本轮临时进程和容器                                       | 已完成；保留原有服务与测试产物                                          |

第四轮已获得的证据：

- 两个完整 API 进程使用实际 `main`、路由、数据库迁移和 release 配置启动，分别通过独立 Vite 代理服务两个独立 Chromium 上下文。共享专用临时 PostgreSQL/Redis，不使用模拟登录或模拟改密接口。Chromium 在 `localhost` 安全上下文处理带 Secure 的 Cookie；这不替代生产 HTTPS/反向代理验收。
- 受保护管理员：错误旧密码返回 422，界面保留弹窗和登录，Cookie 认证的身份快照仍为 200；成功后密码版本为 1，当前页面身份/令牌为空，改密输入已销毁，可读 CSRF Cookie 已清除，回到登录页。
- 另一实例使用改密前 Bearer 和 Cookie 均返回 401，另一浏览器回到登录页；旧密码登录失败，新密码在另一实例登录和身份快照均成功。
- 两实例交替提交独立测试账号的错误旧密码：前 5 次均为 422，第 6 次返回 429。实际暂停专用 Redis 后，正确旧密码改密在约 2 秒返回 503，账号版本及成功审计数保持 `0/0`；恢复 Redis 后提交成功并变为 `1/1`，另一实例拒绝旧凭证。
- 新增代理边界回归：来自未受信地址的伪造 `X-Forwarded-For`/`X-Real-IP` 不改变客户 IP，21 个不同账号仍共享第 21 次 IP 限制；可信代理链使用最近的未受信跳点，21 个不同真实来源不会错误合并。生产代理链仍须实测。
- 浏览器发现退出瞬间侧栏告警和 AI 策略 Hook 会尝试受保护请求，虽被 API 客户端拦截，仍产生无意义错误。已补身份判断、侧栏按账号缓存、AI 异步响应按身份/请求代次核对；新增 7 个回归覆盖未登录、清缓存与渲染交错、旧响应、重新登录、跨账号缓存及新身份策略加载期间不显示旧能力，全部通过。管理员与普通账号浏览器复验均没有再出现这两类退出请求错误。新增文件 `src/features/auth/change-current-user-password/authenticated-background-queries-stop-after-password-change-and-ignore-obsolete-ai-policy-responses.spec.tsx`；代理测试为 `server/middleware/authenticated_user_password_change_trusted_proxy_forwarding_and_ip_limit_isolation_test.go`。
- `docker build --file server/Dockerfile` 已真实执行，但 Docker Hub 获取 Go/Rust 基础镜像元数据时连接超时，未进入源码构建；未降级基础镜像，未发布镜像。构建日志保存在 gitignored `output/security/authenticated-user-password-change-production-image-build-verification.log`。

第四轮最终验证记录：

- 无业务权限普通账号实际登录后显示权限数 0，仍可从头像打开改密、提交成功并使用新密码重新登录，身份快照为 200；版本/成功审计均为 1。管理员在修复后再次改密，版本/成功审计均为 2，当前身份、令牌、弹窗密码输入和 CSRF Cookie 均已清除，回到登录页；本次控制台没有错误，仅正常关闭 WS 的提示。
- 实际浏览器 Cookie 元数据确认：认证 Cookie 为 Secure + HttpOnly，CSRF Cookie 为 Secure 且允许页面读取。桌面和 390×844 视口的真实接口弹窗截图已保存并检查：`output/playwright/ordinary-account-real-api-password-change-dialog-desktop.png`、`output/playwright/administrator-real-api-password-change-dialog-mobile.png`。移动视口模拟不等于真实移动设备验收。
- 两实例日志扫描未发现本轮测试密码、bcrypt 哈希或 JWT。测试值仅用于临时隔离环境，未查询或修改现有开发/生产账号。搜索服务/Watchdog 未纳入本轮临时环境，页面会显示对应离线告警；没有把这些依赖算作已验收。
- 最新前端回归：9 个文件、65 个用例通过；TypeScript 构建、3 个本轮前端文件的 ESLint（零警告）、Prettier、中英文结构、中文编码和 17 个账号管理路由契约检查通过。Vite 生产构建成功，有大 chunk 和 Excel 查看器静态/动态导入的构建提示。
- 设置独立 PG/Redis 后，恢复命令、security、middleware、handlers、services、routes 六包的改密/恢复/WS 相关回归全部通过，包含本轮新增代理用例。未运行全仓测试全集。
- 已更新生产规程中的本地证据、生产边界和镜像构建阻碍；生产 HTTPS/代理链、真实双设备、容量/时钟及生产恢复演练仍待执行。本轮不部署、不发布镜像。

### 最终日志复核补充

扫描未发现密码、哈希或 JWT 之后，另行检查了 WS 票据，发现原通用访问日志仍记录 `?ticket=...`。已修复 API 的查询串/Referer 脱敏，并继续检查当前 Docker Web Nginx，发现其 `$request` 与原始 Referer 也会包含凭证；现改为仅记录方法、路径和协议，省略 Referer。票据短 TTL 和单次消费不作为允许记录的理由。

- 新增 `server/middleware/authentication_credentials_query_and_referer_log_redaction.go`：票据、令牌、密码、CSRF 和 API Key 等已知凭证参数统一替换；支持重复参数、编码后的参数名及大小写/分隔符变体；解析失败时整体隐藏，避免保留残余原文。Referer 移除用户信息和 URL 片段，查询参数按相同规则处理。
- 新增 `server/middleware/authentication_credentials_access_log_redaction_and_invalid_url_rejection_test.go`：敏感字段、重复/编码/畸形输入和实际 HTTP 成功/401 日志回归通过。后续 middleware/routes/handlers 相关用例、`go vet ./middleware` 和完整 API 构建通过；该追加回归未配置 PG/Redis，不把对应可选集成用例计作重复执行。
- `deployment/nginx/erp-web.conf` 已在现有 Nginx 1.30.4 Alpine 镜像中通过真实 `nginx -t`，一次性无外网容器实际请求返回 200 和 404，两个访问日志均保留方法/路径/状态，不含测试凭证及 Referer 内容。脱敏验证摘要保存于 `output/security/nginx-password-change-credential-access-log-redaction-results.json`。
- API 脱敏不控制 Nginx 错误日志、外层网关/CDN 或旧式主机模板继承的 combined 日志。生产规程已明确追加逐层检查及采集前脱敏；本轮没有声称这些环境已通过。已有日志不会被新代码追溯清理。
- 本轮两个 API 进程、两个 Vite 进程、两个 Chromium 上下文及临时 PG/Redis/Nginx 容器均已关闭。发现原有 `127.0.0.1:5197` 开发服务在本轮前已启动，已保留；本轮 `localhost` 独立监听进程已结束。
