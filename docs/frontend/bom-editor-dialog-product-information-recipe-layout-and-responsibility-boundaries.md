# BOM 编辑弹窗：产品信息、配方布局与职责边界

适用入口：`/product-structure/bom` 新建／编辑 BOM，以及产品建档向导复用的 BOM 步骤。

面向使用者的五章说明由 [BOM 说明指南](bom-creation-operation-guide-content-navigation-and-responsibility-boundaries.md) 独立承接。指南章节只切换阅读内容；本文的移动端两步只切换编辑区域；共用物料分组属于业务目录，三者分别管理。

## 布局与数据归属

桌面宽度从 1024px 起采用左右布局：左侧单列填写产品、BOM 编号与类型、生效日期、归属、性能版本和重量、备注；右侧展示紧凑配方汇总和按分组折叠的物料编辑区。配方内部不再提供总览／明细 TAB。左列宽约 296–320px，右侧占用剩余空间。两侧在固定弹窗高度内分别处理内容滚动，配方明细的横向滚动由明细表处理。窄屏顶部提供“1 基本信息”和“2 配方明细”两个可点击步骤，每次仅显示一个区域；底部操作区始终位于正文滚动区之外。

移动端步骤仅切换显示，不提交表单、不增加步骤校验门槛。两个区域始终挂载，因此普通字段、各性能版本的重量会话暂存、配方输入与分组折叠状态都在切换时保留；切换到桌面宽度后同时显示两个区域。步骤状态由布局组件管理，不进入 BOM 数据和提交契约。

系统修订版本和生命周期状态继续展示在弹窗标题，保存草稿、提交评审和发布继续在底部。备注属于当前 BOM 的表单信息，归入左列。

内容锁定与生命周期操作分别判断：已批准的研发／生产 BOM 保持配方只读，底部仍分别提供“发布研发”／“发布生产”。发布使用已保存记录和版本号，不重新保存只读表单；已发布且锁定的研发 BOM 才在列表中显示“派生 MBOM”。派生结果为未锁定的生产 BOM 草稿。

整个编辑会话共用一个 React Hook Form 和一个 BOM 提交入口。左右列分别编辑同一份草稿，统一提交产品信息、重量、物料行及结构关系协议。改变列宽、排列或滚动方式的模块仅接收已渲染内容，不持有表单和保存回调。

## 审查结论与已完成拆分

原弹窗已有独立的初始化、权限、并发冲突、结构协议恢复、保存编排与配方工作区，主入口负责组合这些能力，边界合理。原顶部表单同时包含普通字段、公共版本查询、重量对比、会话草稿与选项弹窗，修改普通字段需要进入同一大文件，是本轮优先拆分的部分。

| 文件，路径相对 `src/features/product-structure/` | 负责内容 | 后续修改位置 |
| --- | --- | --- |
| `components/bom-action-dialog.tsx` | 组合表单、资源边界、权限、结构协议、保存编排与各展示区 | 新入口接入或已有领域能力的组合 |
| `components/bom-dialog-shell.tsx` | 弹窗尺寸、标题、修订版本与状态展示、变更记录入口、向导头部 | 外层弹窗与标题样式 |
| `components/bom-editor/bom-editor-product-information-and-recipe-layout.tsx` | 桌面左右排列、移动端步骤显示及区域滚动；输入仅为两个展示区 | 列宽、留白、移动端步骤切换 |
| `components/bom-editor/bom-product-configuration-information-panel.tsx` | 产品与归属选项、普通字段、备注，并组合性能版本字段 | BOM 基本信息交互 |
| `components/bom-editor/bom-product-configuration-fields.config.ts` | 普通字段定义、只读与禁用规则，声明生效日期使用独立输入组件 | 增减普通信息字段 |
| `components/bom-editor/bom-effective-start-date-text-input-with-calendar.tsx` | 生效开始手输、粘贴、日历年月选择、规范化及错误反馈 | 日期输入交互；传输契约见[日期专文](bom-effective-start-date-input-and-api-format-contract.md) |
| `components/bom-editor/bom-performance-version-and-weight-field.tsx` | 公共版本与重量单位选项、组合下拉、设置入口、管理弹窗开关 | 版本选择和入口展示 |
| `hooks/use-bom-performance-version-weight-drafts.ts` | 当前版本重量、不同版本的会话草稿、具体产品／归属切换时的清理；只写版本与重量字段，会话键包含 BOM、具体产品、BOM 类型和归属 | 版本切换及重量暂存规则 |
| `hooks/use-bom-product-performance-version-weight-comparison.ts`、`utils/bom-product-performance-version-weight-comparison.ts` | 查询完整 BOM 元数据，按具体产品、BOM 类型、归属和生命周期选择对比来源，再按性能版本展示 | 重量来源与比较范围 |
| `components/bom-editor/bom-performance-version-option-management-dialog.tsx` 及其内联编辑器 | 独立公共名称目录的新增、编辑、删除与刷新；名称保存后提示及延时关闭 | 公共版本目录维护 |
| `components/bom-editor/bom-workspace.tsx`、`bom-recipe-summary-and-section-accordion-editor.tsx` 及 `hooks/use-bom-workspace*.ts` | 配方分组折叠、添加删除、成本汇总与结构投影 | 配方工作区与明细交互 |
| `components/bom-editor/bom-item-row.tsx` | 单行物料、用量、损耗及标准用量计算 | 行内字段与计算展示 |
| `components/bom-dialog-footer.tsx` | 保存草稿和生命周期操作按钮，通过回调交给编排层 | 按钮排列与操作可用性 |
| `hooks/use-bom-form*.ts` | 表单状态、初值、详情和引用资料的加载与初始化 | 打开、切换记录、取消重开时的草稿来源 |
| `hooks/use-bom-submit-orchestrator.ts`、权限／并发／协议 Hook | 统一提交、评审发布、版本检查、只读与结构保护 | 保存与生命周期规则 |
| `services/bom-service.ts` 及后端 BOM 服务 | HTTP 契约、持久化与领域校验 | 保存协议和服务端规则 |

原 `bom-form-header.tsx` 和 `bom-header-fields.config.ts` 已由上述明确命名的组件与配置取代，移除不再使用的顶部横向网格、隐藏重量输入和重复生命周期字段配置。

## 后续扩展前应固定的约定

1. **区分 BOM 级和物料行级字段。** 产品、归属、性能版本、成品重量和备注属于当前 BOM；物料、用量、损耗属于具体行。新工艺字段先确定归属，再加入对应字段区和保存契约。
2. **固定性能版本的业务身份。** 共用目录提供标准版、轻量版等可选名称，各具体产品按需选用。重量保存在各自 BOM 上，比较范围按具体产品 `productId`、BOM 类型、归属及性能版本区分，不按基础型号 `typeId` 共用；修订号和生命周期继续独立。目录保存只维护名称，重量随当前 BOM 保存，其他会话版本草稿不批量持久化。
3. **统一草稿初始化时机。** 打开记录、切换实际 BOM 或取消后重开才应替换草稿。以后调整引用资料加载或刷新时，检查 `use-bom-form-initialization.ts` 的依赖，防止选项刷新间接触发 `form.reset` 覆盖正在填写的内容。
4. **保存与生命周期共享领域规则。** 新增必填项时同时检查保存草稿、评审、发布路径。当前 `submit` 使用表单提交校验；`promote` 在内容可保存且存在未保存改动或尚无记录时，先经过相同表单校验再保存，锁定的已批准记录直接发布已保存版本。发布权限、版本及物料／重量完整性继续由服务端校验；后续校验规则扩展应在统一编排和服务端定义阶段要求。
5. **计算规则扩展时再提取纯函数。** 目前用量和损耗更新集中在行组件。增加单位换算、成本口径或更复杂公式时，应先抽出可独立验证的领域计算，避免在左右布局或基本信息组件中增加公式。
6. **按业务变化扩展，不增加通用表单框架。** 本轮沿用现有表单、配方工作区和服务入口；新增独立字段组时按职责拆组件。布局组件始终只处理展示区域，公共目录和 BOM 保存继续使用各自服务。

第 3–5 项是后续涉及相应规则时的约束与检查点。初始化已增加编辑会话保护；生命周期和配方计算继续沿用既有规则。

## 验证边界

- 原版本目录与重量集成测试继续覆盖未选产品禁用、具体产品切换、重量暂存、锁定只读、独立目录保存和保存后关闭。
- `components/bom-editor-product-information-recipe-and-submit-boundaries.spec.tsx` 使用真实弹窗、表单、配方行和提交编排，覆盖左侧备注与右侧用量互不覆盖、移动步骤切换保留字段与各版本重量暂存、统一保存内容及原有先保存后评审行为；仅替换引用资料和 jsdom 无法计算的虚拟列表尺寸。
- 浏览器检查普通弹窗与向导复用入口，验证桌面左右排列、窄屏步骤仅显示当前区域、切换保留草稿且不会触发提交、操作按钮可见、配方用量计算与统一保存内容。

前次左右布局改造实测（2026-10-23）：相关两个测试文件共 18 项通过，受影响文件的 ESLint、Prettier 和项目 TypeScript 检查通过。普通弹窗和向导入口分别检查 1920、1366、1024、768、390、360px 六种宽度，共 12 个场景；桌面双列、移动步骤、底部按钮及统一保存内容均通过。浏览器使用隔离的引用数据和保存回调，不写入实际业务记录。窗口缩放检查等待布局和响应式样式稳定后再测量，避免把过渡动画的中间位置视为最终布局。

## 已实施的配方单视图与共用分组管理

### 业务语义与交互

`BOMSection` 是所有 BOM 共用的物料分类目录，示例包括备料、卷料、成型、机加、精细、涂装、包装。领域边界见 [APS 数据模型](../architecture/aps-scheduling-engine/domain-model.md)。生产工序由生产路线定义，实际父子结构由原有 `parent_children_protocol` 保存。界面统一使用“分组”，避免“段位”“层级分布”造成混淆。

配方顶部显示物料数、预估成本、已用分组数，随草稿更新。下方按分组展开物料、用量、损耗和备注。允许多个组同时展开；有明细的组默认展开，空组默认折叠，全部为空时展开默认分组。点击组标题仅切换当前组；组内新增明确传递该组编码。真实子层级继续在所属分组内展示，不因视图合并而扁平化。

“管理共用分组”在一个弹窗中完成列表选择、新增和内联编辑；删除确认也在面板内显示。独立分组配置页面与弹窗使用同一业务面板。保存只维护共用目录；物料与用量仍随当前 BOM 统一保存。只读账号可查看目录，写入继续受原管理权限及服务端校验限制。

### 固定的组件边界

以下路径相对 `src/features/product-structure/`：

| 文件 | 职责与数据边界 |
| --- | --- |
| `components/bom-editor/bom-recipe-draft-summary-strip.tsx` | 只显示当前草稿派生的汇总，不维护目录、不提交 BOM |
| `components/bom-editor/bom-recipe-summary-and-section-accordion-editor.tsx` | 组合汇总、明细表和目录管理入口，持有管理弹窗开关 |
| `hooks/use-bom-workspace.ts` | 分组独立展开状态，目标分组追加及原权限守卫 |
| `hooks/use-bom-workspace-projection.ts` | 从原协议投影结构、稳定物料行与成本；完整目录解析历史记录 |
| `components/bom-editor/item-table.tsx`、`bom-item-row.tsx` | 虚拟列表、分组标题、组内新增与原行内编辑、用量计算 |
| `hooks/use-bom-shared-section-management-editor.ts` | 共用目录编辑草稿、选择、权限、保存、删除和冲突反馈；不接收 BOM 表单或保存回调 |
| `components/bom-section-management/bom-shared-section-management-panel.tsx` | 配置页面和弹窗共用的列表、搜索、内联编辑和操作区 |
| `components/bom-section-management/bom-shared-section-inline-editor.tsx` | 目录编码、名称、说明、排序、默认与启用字段，不创建嵌套 form |
| `components/bom-section-management/bom-shared-section-management-dialog.tsx` | 打开关闭、尺寸和响应式布局，组合共用面板 |
| `tabs/bom-section-config.tsx` | 独立配置页标题和面板壳，不复制维护逻辑 |
| `hooks/use-bom-section-config.ts`、`services/bom-section-service.ts` | 原目录 HTTP 契约、版本补丁、目录及选项缓存刷新 |

原 `bom-flat-workspace-view.tsx`、`bom-tree-workspace-view.tsx`、`summary-panel.tsx` 已移除，避免保留两套工作区入口。

### 草稿与历史记录保护

- 初始化只在引用资料就绪并开始新的编辑会话时执行。目录刷新、同一 BOM 详情刷新均不重置草稿；关闭重开、切换实际记录才重新初始化。
- 配方结构解析使用完整目录。已停用但有明细的分组继续显示并标记停用，空的停用分组隐藏；停用分组不提供新增入口，历史行及结构随原保存路径保留。
- 共用目录保存等待目录列表和选项刷新完成。稳定编码在编辑态禁改，保留版本补丁、最后一个启用项保护、系统项删除保护、已引用删除保护及并发冲突反馈。
- 结构变更跟踪 Hook 自行初始化原关系基线。BOM 入口不再在每次渲染时重复重设基线，结构更新回调保持稳定，避免打开已有关系协议的 BOM 后持续更新。
- 基本信息下拉只接受当前可选值，忽略原生 select 在表单重置同步时发出的空值事件；禁用及锁定字段拒绝变更，防止初始化后产品被意外清空。

### 本次验证（2026-10-23）

相关 4 个测试文件共 29 项通过：原 15 项版本重量测试、7 项完整弹窗集成测试、5 项共享目录管理测试、2 项编辑会话初始化测试。

覆盖直接编辑、多个组独立折叠、非默认组新增及提交归属、停用分组历史明细、真实嵌套关系保存、生命周期锁定只读、共用保存不提交 BOM，以及目录刷新后备注、用量、选中版本重量和另一版本重量暂存保留。目录管理还验证独立配置页面复用、新增、稳定编码、默认项、权限、删除保护和并发失败后的草稿。

浏览器使用真实组件、隔离 API 与保存回调，未写实际业务库。普通 BOM 和向导各检查 1920、1366、1024、768、390、360px 六种宽度，共 12 个场景；共用分组弹窗检查 1366、768、390、360px 四种宽度，配置页面检查 1366、390px 两种宽度。布局、底部保存可见、分组独立折叠、目录改名和新增后刷新及草稿保留均通过。物料表在窄屏内允许横向滚动查看各列。

项目 TypeScript、Prettier 和国际化结构检查通过；受影响文件 ESLint 无错误，保留已有虚拟列表及状态同步相关警告。

## 早期生命周期核对记录（2026-10-23，评审流程已由三态方案替代）

以下为 2026-10-23 的历史核对与修复记录。2026-10-24 已采用草稿、已发布、已作废三态，评审／批准不再作为新记录的操作步骤。当前按钮、权限与事务见 [三态生命周期与保存发布契约](bom-three-state-lifecycle-direct-release-and-atomic-save-publish-contract.md)。历史修复记录如下：

- **已修正派生条件。** [列表派生按钮](../../src/features/product-structure/components/bom-mgmt/bom-table.tsx) 与 [后端派生服务](../../server/services/bom_service.go) 均要求源记录为研发 BOM、`RELEASED` 且已锁定，草稿、已批准、作废、未锁定及生产 BOM 均不提供该按钮。
- **已修正发布阻塞。** [弹窗底部操作](../../src/features/product-structure/components/bom-dialog-footer.tsx) 对已批准的 EBOM／MBOM 分别显示“发布研发”／“发布生产”，即使内容已锁定也可操作；前端守卫区分内容编辑与状态操作，提交编排不重新保存锁定表单。后端允许锁定记录的 `APPROVED → RELEASED`，继续执行状态机、权限、预期版本、物料及重量校验，发布后仍锁定。
- **仍需单独规划评审交互。** “提交评审”仍直接请求 `APPROVED`，沿用原有快速批准通道及其权限校验，尚未改为完整的 `DRAFT → REVIEWING → APPROVED → RELEASED` 分步操作界面。本次没有新增审批流或调整该目标状态。
- 后端派生 MBOM 实际创建为 `DRAFT`、未锁定；修订已发布 MBOM 时，新版本直接为 `RELEASED`，旧版作废。二者不能统称“派生／修订即生效”。[状态机](../../server/services/state_machine/bom.go) 对 EBOM 与 MBOM 使用同一状态转换表，不限制 MBOM 只能有发布／作废两态。

真实 PostgreSQL 验证还发现快照序号查询对 `MAX()` 使用 `FOR UPDATE`，导致发布与派生事务失败。[版本快照服务](../../server/services/bom_version_history_service.go) 已改为先锁定对应 BOM 行，再读取最大序号并写入快照，覆盖首份快照及并发写入场景。

本次修复验证（2026-10-23）：前端两个文件共 19 项通过，包括真实列表的源类型／状态／锁定条件、锁定的 EBOM／MBOM 发布、只读表单不重存，以及已有配方草稿行为；[后端 PostgreSQL 集成测试](../../server/services/bom_locked_approved_release_and_released_source_manufacturing_derivation_postgres_test.go) 共 4 组、10 个场景通过，覆盖发布后实际派生、内容与重量保留、权限／版本／完整性拒绝、非法源拒绝，以及并发快照连续编号。数据库测试在独立临时 schema 中运行并清理，不修改现有业务记录。

后续生命周期扩展应同时对齐按钮可用条件、提交目标、服务端校验及集成测试；说明指南继续解释状态含义和前置条件。
