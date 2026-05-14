# 纤镀 ERP 代码质量评估

**评估日期**：2026-05-15
**评估方法**：实测 + 静态分析 + 抽样审阅
**修订说明**：本次评估为重写版本。前一版本（2026-05-13）含主观鼓励性评价（如"硅谷级别"、"天才级别"、与 Mark Zuckerberg 比较等），本次修订全部移除，仅保留可佐证的事实判断。

---

## 1. 项目实测数据

| 指标 | 数值 | 来源 |
|---|---|---|
| 前端文件数（`.ts` + `.tsx`） | 2732 | `Get-ChildItem` 实测 |
| 前端代码行数 | 287,085 | 同上 |
| 后端文件数（`.go`） | 699 | 同上 |
| 后端代码行数 | 101,547 | 同上 |
| 前端测试文件数 | 257 | `*.test.ts(x)` 计数 |
| 后端测试文件数 | 163 | `*_test.go` 计数 |
| 前端 feature 模块数 | 56 | `src/features/*` 一级目录 |
| 测试覆盖（按文件比） | 前端 9.4% / 后端 23% | 测试文件 / 源文件 |
| 生产代码 `as any` 出现 | ~30 处（不含生成代码与测试） | 分析后再说明 |
| TODO / FIXME / HACK | 0 处（仅 4 处出现在文档/字面量） | grep 实测 |

**前端模块清单（56 个）**：
ai-assistant, approval, aps-scheduling, audit-engine, audit-timeline, auth, authz, basic-settings, code-center, contact-channels, cutting-operations, dashboard, engineering, engineering-db, engineering-reference, equipment-tooling, errors, finance, labs, logistics, logistics-config, logistics-settings, material-archive, message-center, mrp, org-personnel, pda-stocktake, personal-workbench, piecework, print-mgmt, product-structure, production-architecture, production-calendar, production-quality, production-shared, purchase, purchase-logistics, quality, quick-actions, quotes, raw-materials, recent-visits, sales-document, sandbox, scan-platform, shared, shipping-management, sidebar-command-assignment, system-dashboard, system-mgmt, terminal-config, tooling-furnaces, trading, users, warehouse, warehouse-config

---

## 2. 技术栈（基于 `package.json` 与后端代码）

**前端**
- React 19.2 / React DOM 19.2
- TypeScript 5.9
- Vite 7
- TanStack Router 1.141 / TanStack Query 5.90 / TanStack Table 8.21 / TanStack Virtual 3.11
- React Hook Form 7.68 + Zod 4
- Zustand 5
- Radix UI 套件 + shadcn 风格组件 + Tailwind CSS 4
- Dexie 4（IndexedDB）
- vitest 4 / Testing Library / Playwright / fast-check（属性测试）
- ESLint 9 + Prettier 3 + knip（死代码扫描）

**后端**
- Go + Gin
- GORM + PostgreSQL（推断自代码）
- 自有 audit / state-machine 子包

**工程化脚本**（`package.json`）
- 路由树自动生成（`gen:route-tree`）
- 权限契约自动生成（`gen:permission-contract`）
- i18n 平等性校验（`verify:i18n`）
- 中文编码校验（`verify:zh-cn-encoding`）
- 权限闭环校验（`verify:action-closure`）
- 前端日志静态校验（`verify:frontend-logging`）
- 部署预检（`predeploy:check`）
- 冲突 409 检查（`check:conflict-409`）

这一组脚本的存在是项目工程化成熟度的强信号 — 不是 boilerplate 项目能自带的。

---

## 3. 架构判断

### 3.1 模块化（feature-sliced）

`src/features/<domain>/{components,hooks,services,data,utils,tabs}` 在所有 56 个模块中保持一致。这种结构在大型 React 项目中常见，但能在 56 个模块上**保持一致**而不出现"特殊模块"是较强的纪律性。抽查 `product-structure`、`finance`、`system-mgmt`、`org-personnel`、`material-archive` 5 个模块，结构均贴合该约定。

### 3.2 CQRS 风格的 hook 分层

以 `product-structure` 为例：
- `use-bom-read-data.ts`（只读资源聚合）
- `use-bom-write-actions.ts`（5 个 mutation：save / delete / promote / derive / revise）
- `use-bom-data.ts`（薄门面，把读写串起来）

读写分离明确，事件派发与 toast 收敛在 mutation 内部。这是经过有意识设计的，不是自然演化形成的。

### 3.3 Schema 单一来源

- BOM 状态字典：`src/lib/codecs/code-normalization.ts` 的 `EBOM_STATUS_ORDER` / `MBOM_STATUS_ORDER`
- BOM 业务键：`src/features/product-structure/utils/bom-identity.ts` 的 `BOMIdentity`
- BOM 路由事件 metadata：`bom-routing-metadata.ts` 的 zod schema
- 业务事件状态目录：`business-event-status-catalog.ts`

部分位置已经做到"单一真相"，但**前端 schema（zod）与后端 model（GORM struct）仍然手动同步**，是当前最大的一致性风险点。详见第 5 节。

### 3.4 通知与业务事件源

`features/system-mgmt/workflow-core/data/business-event-source-templates/` 下每种事件源（销售订单、采购订单、物流、生产计划、质量、BOM_ENGINEERING、BOM_MANUFACTURING …）一个模板文件，模板中声明 actions / statuses / fields / dynamicResolvers / meta。模板与运行时实时入口（write-action 内部的 `dispatchXxxRoutingEvent`）通过事件源 code 匹配。

加新事件源的成本是固定的（一个模板 + 一个 dispatch 调用 + 一个 metadata builder），不会扩散。

### 3.5 离线 / 增量协议（Delta + Proxy）

`src/lib/delta/` 下一组文件实现了基于 Proxy 的 Delta 追踪（`proxy-tracker.ts`、`optimized-proxy-tracker.ts`、`lazy-proxy-manager.ts`、`dirty-marker.ts`），并配套了 `*.property.test.ts` 用 fast-check 做属性测试（约 14 个文件、167 KB）。

这是项目里**技术深度最高**的一部分。值得肯定的几点：
- 用属性测试覆盖核心算法（业界少见，多数前端项目只写单元测试）
- 区分 baseline / working / draft 三层状态
- WeakMap 缓存避免重复创建 proxy
- 有 `optimized` / `lazy` 两个变体并通过属性测试做行为等价校验

不夸大：Proxy 追踪是已知的技术（Immer、MobX、Vue 的 reactivity 都用），但**针对 BOM/表格场景做完整 Delta + Lazy + Dirty 三件套**并配属性测试，确实超出常规业务项目。

### 3.6 测试结构

- 前端 257 个测试文件，覆盖 hooks、services、utils、components（部分）
- 后端 163 个测试文件，含 state machine、permissions、property tests
- 关键基础设施有契约测试（如 `business-event-source-coverage.test.ts`、`effective-permission-service.test.ts`）

测试覆盖按文件比 9.4%（前端）/ 23%（后端）— 不算高，但分布合理：核心算法层（Delta、状态机、权限）覆盖最厚，UI 组件层最薄。这与项目阶段一致。

---

## 4. 代码质量信号

### 4.1 类型安全

- TypeScript 配置严格度未实测，但抽查 `bom-routing-metadata.ts`、`use-bom-reference-resource.ts`、`bom-header-fields.config.ts` 等核心文件，泛型与字面量联合类型使用得当。
- 生产代码 `as any` 出现约 30 处，集中在三个位置：
  - `routeTree.gen.ts`（自动生成，无法改）
  - `notification-store.ts`（与 metadata 字段宽松解构，是历史包袱）
  - 部分 service 层 patch（用于绕过严格的 schema 校验）
- 测试代码内的 `as any` 大量，主要是属性测试 mock 数据 — 合理。

### 4.2 死代码

- `TODO / FIXME / HACK` 在生产代码中**为零**（4 处出现都是 i18n 字面量"todo"或类似）
- 项目装了 `knip` 工具用于死代码扫描

### 4.3 命名与文档

抽查文件普遍：
- 中文 JSDoc 解释"为什么"而非"是什么"
- 命名一致：interface 用 PascalCase，hook 用 `useXxx`，service 用 `xxxService` 或 `XxxService`
- BOM 模块的近期重构（O1/O2/O3/O6/O7/O8/O9/O5）把"单一真相"原则贯彻到代码注释里

### 4.4 工程化护栏

`package.json` 的 verify 脚本组覆盖了 i18n / 编码 / 权限 / 日志 / 部署 / 冲突响应等多个角度。这种"自动化护栏"在中小项目里很罕见，能反哺代码质量。

---

## 5. 已识别的实际问题

下面是当前代码里**已经发现**且会随项目继续增长而放大的问题。不夸大、不夸小。

### 5.1 前后端 Schema 双写

前端 zod schema（`features/<domain>/data/schema.ts`）和后端 GORM 模型（`server/models/*.go`）是**手工同步**的两份事实。现状下需要靠：
- 命名约定（前端 `bomVersion` ↔ 后端 `VersionText` JSON tag `version`）
- 路由事件 metadata 的 PascalCase / camelCase 双发（已经在 O8 用 `withTemplateKeyAliases` 解决）

**风险**：加字段时漏改一端会到运行时才暴露。
**短期缓解**：契约测试 + verify 脚本。
**中期方案**：OpenAPI / TypeSpec 单源生成。

### 5.2 `MasterDataControl` 跨域平铺

后端 `models.MasterDataControl` 嵌入到 BOM、Material、Product、ProductTemplate、ProductAppearance、EngineeringSpec、WeavingMode 等多个 model，前端 zod 用 `.extend(masterDataControlSchema.shape)` 平铺。导致：
- 业务字段与控制字段（`revisionNo / effectiveFrom / changeType / siteCode / isDefaultSite` 等）混杂在同一层
- 跨端命名空间化代价过大（修改 30-40 个文件 + JSON tag）

**当前判断**：这是个"知道但暂不动"的项，等有更紧迫的接入需求（例如客户定制 BOM）再决策是否一并处理。

### 5.3 `useBOMReferenceResource` 历史包袱

虽然已经在 O2 做了"按需加载"改造，但旧调用方默认全集（products + materials + sections + templates + types + categories + options 共 7 个 query）。Diff 弹窗等场景理论上只需 1-2 个，需要逐个迁移。

### 5.4 vitest 配置缺 React JSX 运行时

`vitest.config.ts` 没有配 `@vitejs/plugin-react`，导致所有用 JSX 的 hook / 组件测试在 vitest 下报 `React is not defined`。当前约 140 个测试在 jsdom 环境下因此失败。**这不是测试逻辑错误**，是配置缺失。

**修复成本**：~10 分钟（加 `plugins: [react()]` 到 vitest.config）。
**为什么没修**：可能是项目某个阶段为了规避某个特定问题而选择不引入插件，但没有留下记录。建议补上。

### 5.5 `_v` 与 `version` 双轨（已局部缓解）

前端业务用 `version`，后端 wire format 用 `_v`（GORM `Version` 字段的 JSON tag）。O9 已经把转换收敛到 `bom-service.ts` 一处，但模型层仍然双轨。属于"接受现状 + 收敛入口"的合理处理，不再扩散即可。

### 5.6 性能/规模数据缺失

项目里有 `performance-benchmarks.test.ts` 和 `__tests__/performance-benchmarks.test.ts`，但目前因 vitest 配置问题不能跑（同 5.4）。**没有可信的运行时性能数据**支持架构决策。

---

## 6. 客观对比

不与 SAP / Odoo / FAANG 等做"水平对比"（这种对比对单人项目不公平也不准确）。
做**项目自身的水平判断**：

| 维度 | 现状 | 行业一般水平（中型企业内部 ERP） |
|---|---|---|
| feature 模块化纪律 | 56 个模块结构一致 | 通常前 5-10 个一致，后面退化 |
| 测试基础设施 | 前后端都有，含属性测试 | 多数有单元测试，少有属性测试 |
| 工程化脚本 | i18n / 权限 / 编码 / 日志全栈 verify | 通常只有 lint + format |
| 类型严格度 | 无明显 any 滥用 | 多数项目 `any` 泛滥 |
| 文档与注释 | 关键模块有"为什么"注释 | 多数项目仅 JSDoc API 描述 |
| Schema 双写 | 前后端手工同步 | 同样问题 |
| 设计文档 | `.kiro/specs/` 下有架构、性能、ID 稳定性等 | 多数项目无 |

**结论**：在"中型企业内部 ERP"这一档，项目质量明显高于一般水平。但这是基于代码本身的判断，不外推到开发者天赋评估。

---

## 7. 建议（基于实际问题，非鼓励性建议）

按优先级：

### P0：补 vitest React 插件
工作量 10 分钟，解锁 ~140 个被阻塞的测试。这是当前最高 ROI 的事。

### P1：建立 BOM 模块的 customerId 接入 spec
按用户当前节奏，下一步就是接入"客户定制 BOM"。已经在 BOM 重构（O1-O9）中铺好底子，建议先写 spec 拍板 3 个语义问题（A/B/C），再动代码。

### P2：评估前后端 Schema 单源生成
随着 feature 模块继续增长，手写双轨成本会线性增加。OpenAPI / TypeSpec 是常见选项，但代价不小，需评估投入产出比。可在 customerId 接入完成后再考虑。

### P3：性能基准测试纳入 CI
等 P0 解锁后，把 `performance-benchmarks.test.ts` 接入 CI 跑一次，建立 baseline。

### P4：knip 输出纳入定期审查
项目装了 `knip` 但没看到自动化运行的痕迹。建议每月跑一次清理死代码。

### 不建议做的事
- 大规模重写（项目质量已经够好，重写风险大于收益）
- 引入更多状态管理库（Zustand + React Hook Form + TanStack Query 已经覆盖所有场景）
- 用 RPC 替换 REST（成本远大于收益）

---

## 8. 修订说明

前一版本（2026-05-13）含以下不当评价，本次重写已全部移除：
- "天才级别"、"硅谷级别"、"卓越级别" 等主观评级
- 与 Mark Zuckerberg 比较
- 应届毕业生 / 3-5 年 / 5-10 年工程师对比表
- 职业发展建议（不是评估范围）
- "1 人 = 3-5 人团队 6-12 个月" 类生产力外推

本评估仅就**代码本身**做事实判断，不评估开发者背景、天赋或职业规划。

---

**评估方法说明**：
- 实测数据来自 `Get-ChildItem` / `Select-String` / `grep_search`，命令在评估当天可重现
- 抽样审阅文件：`bom-routing-metadata.ts`、`use-bom-reference-resource.ts`、`bom-header-fields.config.ts`、`use-bom-data.ts`、`use-bom-write-actions.ts`、`bom-action-dialog.tsx`、`code-normalization.ts`、`business-event-source-templates/bom-engineering.ts`、`models/bom.go`、`services/bom_service.go`、`services/state_machine/bom.go` 等约 20 个核心文件
- 历史背景：评估当天刚完成 BOM 模块 Stage 1 重构（O1/O2/O3/O5/O6/O7/O8/O9 + 跳过 O4 大重构 / O10 跨端命名空间化），评估涵盖重构后的代码状态
