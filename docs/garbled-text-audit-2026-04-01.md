# 全仓乱码巡检与分批修复清单（2026-04-01）

## 1. 巡检结论（本次）

- 前端 `src` 疑似乱码命中：`1367` 行，`339` 个文件。
- 其中用户可见 UI（tabs/routes/layout/components）疑似乱码命中：`868` 行，`200` 个文件。
- 后端 `server` 疑似乱码命中：`429` 行，`74` 个文件（主要是注释、错误提示、日志文案）。
- 检测到 **1 个非 UTF-8 文件**：
  - `src/hooks/use-check-permission.ts`

说明：本次采用“高召回巡检”，目标是尽量不漏，可能包含少量误报。修复优先按“用户可见性 + 核心链路”排序。

## 2. 最高优先级（P0）：先修导航 / 标题 / 按钮

这些文件直接影响主导航、权限入口、页面标题、按钮和弹窗文案：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/components/layout/data/search-data.ts`
3. `src/features/system-mgmt/tabs/index.tsx`
4. `src/features/authz/data/route-derived-permissions.ts`
5. `src/features/approval/tabs/approval-configs.tsx`
6. `src/features/approval/tabs/approval-requests.tsx`
7. `src/features/approval/tabs/approval-history.tsx`
8. `src/features/system-mgmt/tabs/perm-stats-tab.tsx`
9. `src/features/finance/tabs/currency-tab.tsx`
10. `src/features/engineering/tabs/template-mgmt.tsx`
11. `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`
12. `src/features/equipment-tooling/tabs/mold-mgmt.tsx`
13. `src/features/equipment-tooling/tabs/mold-mgmt-optimized.tsx`
14. `src/features/basic-settings/tabs/security-settings.tsx`
15. `src/features/production-config/tabs/process-mgmt.tsx`

## 3. 分批修复计划（建议顺序）

### Batch A（导航与入口）

- 目标：优先恢复侧边栏、搜索、权限矩阵入口、系统管理页头可读性。
- 范围：
  - `src/components/layout/data/sidebar-data.ts`
  - `src/components/layout/data/search-data.ts`
  - `src/features/system-mgmt/tabs/index.tsx`
  - `src/features/authz/data/route-derived-permissions.ts`
  - `src/features/authz/data/default-permissions.ts`（补充，防止动作权限仍乱码）
- 验收：
  - 侧边栏、命令搜索、权限页标题/按钮中文正常。
  - 不改权限 ID，不改路由行为。

### Batch B（审批 + 系统管理）

- 目标：修复审批相关页面和系统管理页最易感知乱码。
- 范围：
  - `src/features/approval/tabs/*.tsx`
  - `src/features/system-mgmt/tabs/*.tsx`
  - `src/features/system-mgmt/notifications/**/*.ts*`
- 验收：
  - 按钮、状态、提示、弹窗文案可读。
  - 通知中心标题和动作文案可读。

### Batch C（核心业务模块）

- 目标：修复工程、设备工装、基础配置、财务、交易模块乱码。
- 范围：
  - `src/features/engineering/**/*`
  - `src/features/equipment-tooling/**/*`
  - `src/features/basic-settings/**/*`
  - `src/features/finance/**/*`
  - `src/features/trading/**/*`
- 验收：
  - 页面标题、表头、按钮、Toast 文案可读。
  - 不改接口契约，不改业务字段名。

### Batch D（其余 UI + 示例页）

- 目标：清尾，覆盖低频页面与示例代码。
- 范围：
  - `src/features/*` 剩余目录
  - `src/_samples/**/*`
  - `src/routes/**/*`
- 验收：
  - 全站抽样页面不再出现乱码文案。

### Batch E（后端注释与提示统一）

- 目标：清理后端乱码注释/提示，保证日志与接口消息可读。
- 范围：
  - `server/main.go`
  - `server/routes/routes.go`
  - `server/db/db.go`
  - `server/handlers/**/*.go`（优先 `approval.go`、`org_personnel.go`）
- 验收：
  - 对外提示中文统一，日志语言规范统一。
  - `go test ./... -run ^$` 通过。

## 4. 防止再次乱码（必须执行）

1. 全仓文本文件统一 `UTF-8 (no BOM)`。
2. 已引入 `.editorconfig`，强制 `charset = utf-8`、`end_of_line = lf`。
3. 在 CI 增加编码守卫：
   - 阻断非 UTF-8 文件提交。
   - 扫描典型乱码 token（如 `闂`、`锟`、`�`）并告警。
4. Windows 下避免使用会隐式转码的写文件方式，固定编码写入。

## 5. 建议节奏

- 第 1 天：Batch A + Batch B（先恢复你最关心的权限和审批文案）。
- 第 2 天：Batch C（核心业务页面）。
- 第 3 天：Batch D + Batch E + CI 编码守卫落地。

## 6. 当前进度（2026-04-01）

- Batch A：已完成（导航、搜索、权限矩阵入口、路由派生权限、动作权限文案）。
- Batch B：已完成第一轮逐文件核查（审批 tabs + 系统管理 tabs + 通知中心共 16 文件，UTF-8 严格校验通过）。
- Batch B：本轮已修复 2 处文案问题（通知规则页提示文案、通知服务注释错字），未发现新的用户可见乱码。
