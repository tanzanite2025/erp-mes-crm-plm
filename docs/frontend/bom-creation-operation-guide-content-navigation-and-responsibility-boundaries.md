# BOM 说明指南：内容、导航与职责边界

## 范围与入口

路由为 `/engineering/bom-creation-guide`，位于“产品管理 → 产品操作手册 → 如何建立 BOM”，与“如何建立产品”同级。沿用产品手册的页面样式，业务实现由 `features/product-structure` 独立承接。

首页产品管理分类也提供“如何建立 BOM”卡片，默认排在“如何建立产品”旁边，无需展开“查看更多”。卡片说明概括 BOM、性能版本与重量、分组配方和生命周期，点击进入本说明页；入口沿用指南独立页面权限过滤。

当前为五个阅读步骤，第一步提供用户主动点击的“录入归属、版本、重量与配方”。入口通过独立适配组件组合既有 `BOMActionDialog` 与 `useBOMWriteActions`，支持保存研发 BOM 草稿或保存并发布；后续派生及历史管理在 BOM 配方页面完成。章节切换不自动打开弹窗、不保存、不推进状态，也不维护持久化步骤进度。没有业务页面或写入权限时仍能阅读完整指南。

快捷入口须完成身份同步，同时具备 BOM 配方页面访问权限、`menu_engineering`（后端工程 API 访问）和 `action_engineering_bom_manage`（BOM 写入）。不新建权限位，不将指南阅读权限当作写入权限。关闭或保存失败不产生完成提示；保存失败保留编辑器以便重试。提交期间防重复提交及关闭，成功返回真实 BOM 后关闭，并提示到 BOM 配方继续处理。

## 内容口径

按“先认识 BOM → 具体产品与归属 → 性能版本与重量 → 分组配方 → 保存与生命周期”展开，包含以下解释：

- BOM 即物料清单，是具体产品的物料配方；具体产品与基础型号不同。研发 EBOM 与生产 MBOM 分开管理，当前新建入口创建研发 BOM。
- 每个章节先给出可执行的填写步骤。第一步直接突出“具体产品＋归属＋性能版本＋成品重量＋物料配方”及示例；快捷入口与列表新建复用业务编辑器，不复制表单或直接拼保存 API。
- 性能版本目录提供共用名称，每个具体产品只使用需要的名称。性能版本、BOM 修订号、生命周期状态分别表达配置、迭代和使用阶段。
- 重量是具体产品、性能版本及当前配方的成品重量，连同单位由人员填写，随当前 BOM 保存；不能把不同物料的用量相加当成重量。重量比较要对齐产品、BOM 类型与归属。
- 版本管理中的重量可以来自同一范围内已保存的 BOM，也可以是标记为“本次暂存”的会话草稿。每个性能版本优先取最新已发布记录，否则取最新未作废记录；当前 BOM 使用自身草稿值。保存 BOM 仅保存选中版本，不批量建立或修改其他版本的 BOM；维护共用名称不等于保存 BOM。
- 生效日期表达计划适用日期，与发布状态分别管理。
- 分组配置维护共用物料分类目录。组内物料、用量和损耗属于当前 BOM；修改共用名称、排序、默认项或启停属于公共目录维护。分组不定义生产路线、排产或真实父子组成关系。
- 标准用量按单位用量和损耗计算；预估成本按各物料标准用量与单价计算，独立于成品重量。
- 保存草稿、核对后直接发布、生产使用及后续修订分别说明。只有明确点击发布按钮才会发布，日期不自动发布。
- 生命周期解释复用独立业务说明内容。当前采用草稿、已发布、已作废三态，新建可保存并发布，已有草稿核对后直接发布。研发转生产为：研发发布且锁定 → 列表派生 MBOM → 独立生产草稿核对 → 直接发布生产，源研发记录不变。已发布 MBOM 修订当前直接创建已发布新版本并作废旧版，不虚构评审或批准步骤。

## 产品与 BOM 的资料职责及录入入口

两份指南的第一章复用同一组蓝色产品卡、紫色 BOM 卡和琥珀色录入提醒。产品承载基础型号、具体产品、框高、内外宽等物理规格，以及涂装、纹理等外观；BOM 承载具体产品的归属、性能版本、成品重量及单位、物料配方和生命周期。强调重量等 BOM 资料不应在产品规格或模板另建同义字段。先保存具体产品，再建立它实际需要的 BOM，不要求每个产品拥有全部性能版本。

“录入产品型号、规格与涂装”链接进入 `/engineering/products`，遵循已有产品页面权限；“录入归属、版本、重量与配方”主动打开共用研发 BOM 录入弹窗，沿用上述读取、身份同步及写入权限。产品入口进入业务页面，不额外构造新建产品路由参数；BOM 入口不复制表单或保存 API。原有卡片式草稿入口保留默认表现，两份指南使用内嵌按钮表现。

产品录入、BOM 基本信息及规格模板属性区同时显示简短的琥珀色提示。提示只解释职责，不自动删除存量属性、不改写数据或增加字段名称拦截。共享展示组件只渲染说明和调用方传入的动作；业务入口组合组件负责链接权限和复用 BOM 入口，编辑器继续负责实际输入与保存。

## 字段帮助弹层与长期复用

“BOM 类型”“归属”“性能版本”标签旁提供问号，使用系统 Popover。触发按钮为 `type=button`，位于 label 之外，点击仅阅读说明，锁定记录仍能查看；Escape 优先关闭帮助弹层，不关闭底层 BOM 编辑器。归属说明解释内部生产不选客户、客户专供必须指定客户，并举例说明它表示配方适用范围。

主题键、独立中英文词典与展示组件分开。`BOMFieldBusinessMeaningExplanation` 可直接嵌入指南，`BOMFieldBusinessMeaningHelpPopover` 可在其他页面引用同一主题，均不读取业务数据、不持有表单、不写入。第一轮不引入通用向导引擎或新的 BOM 数据层。

数据链路核对：`BOMActionDialog` 保留现有表单、引用资料、sidecar、锁定与乐观锁守卫；`useBOMWriteActions` 使用统一保存服务并刷新 `BOMS_QUERY_KEY` 与版本追溯。产品卡片读取的 BOM 关联选项 key 是该 BOM 根 key 的子级，因此会一并失效刷新。指南无需加载完整 BOM 列表门面。指南入口通过保存命令的 publishOnSave 意图复用事务内发布，无需额外状态回调；界面根据状态操作权限显示“保存并发布”，发布结果独立提示。历史批准记录的只读发布及作废继续由独立状态回调承接。

说明依据为 [BOM 数据定义](../../src/features/product-structure/data/schema.ts)、[版本重量会话草稿](../../src/features/product-structure/hooks/use-bom-performance-version-weight-drafts.ts)、[重量比较来源](../../src/features/product-structure/utils/bom-product-performance-version-weight-comparison.ts)、[配方行](../../src/features/product-structure/components/bom-editor/bom-item-row.tsx)、[草稿汇总](../../src/features/product-structure/components/bom-editor/bom-recipe-draft-summary-strip.tsx)、[共用分组面板](../../src/features/product-structure/components/bom-section-management/bom-shared-section-management-panel.tsx)、[后端 BOM 服务](../../server/services/bom_service.go) 和 [状态机](../../server/services/state_machine/bom.go)。分组与工序的领域边界同时参考 [APS 数据模型](../architecture/aps-scheduling-engine/domain-model.md)。

## 当前文档入口与已知差异

- [BOM 三态生命周期与保存发布事务](bom-three-state-lifecycle-direct-release-and-atomic-save-publish-contract.md)：草稿直接发布、新建保存并发布、作废确认、历史状态兼容、权限与失败回滚。
- [BOM 编辑弹窗职责边界](bom-editor-dialog-product-information-recipe-layout-and-responsibility-boundaries.md)：左右布局、移动端两步、配方单视图、共用分组、草稿保护、发布与派生条件。
- [产品模板属性与 BOM 性能版本的边界](product-template-attribute-classification-business-components-reuse-guide.md)：模板属性独立维护，BOM 性能版本名称共用，具体产品的重量随 BOM 保存。
- [主数据归属表](../architecture/master-data-ownership-table.md)：性能版本目录的业务归属与兼容存储、重量、共用分组的读写入口。
- [手册导航与权限约定](../architecture/HOME快捷入口与全厂概览独立导航及权限约定.md)：两份独立手册、HOME 入口与各自页面权限。

`bom-performance/` 下的四份文档是已退休的渲染优化与监控实验归档，保留历史设计，不作为当前编辑器 API 或性能版本业务说明。2026-10-23 的核对结果统一记录在 [文档清理记录](../analysis/documentation-inventory-and-cleanup-plan-2026-07-02.md#2026-10-23-bom-and-product-handbook-follow-up)。

## 章节切换与滚动

顶部 1–5 使用系统的 Tabs 组件切换章节，默认显示第一章，一次仅显示当前章节正文。点击章节不再改变 URL 锚点或滚动整页；切换后正文从顶部开始。方向键和 Home／End 使用标准 Tabs 键盘操作。

指南标题、简介和五个章节入口位于正文滚动区之外。正文及其核对清单、相关链接在下方独立滚动，移动端同样保持标题与章节入口可见。窄屏缩小标题区的字号和留白，将五个章节排为一行并使用简短标签，为阅读保留空间；无障碍标签保留完整章节名称。

工程父路由在 BOM 指南与产品指南两个说明页路径设置 `mainClassName` 与 `contentClassName`，约束指南填满剩余高度，并关闭外层正文滚动。其他工程页面沿用已有布局，公共 `ModuleTabbedLayout` 不增加指南专用逻辑。两份指南分别维护自己的章节状态和正文滚动引用，不进入业务草稿、产品向导进度或持久化。

## 文件分工

以下路径除特别注明外，相对 `src/`：

| 文件 | 职责 |
| --- | --- |
| `features/product-structure/pages/bom-creation-operation-guide-page.tsx` | 说明页布局、章节切换、正文滚动、帮助内容与独立草稿入口的组合；不承担保存编排 |
| `features/product-structure/components/bom-creation-guide/bom-creation-guide-chapter-operation-instructions.tsx` | 各阅读章节的操作小步骤展示 |
| `features/engineering/components/product-and-bom-field-responsibility-explanations.tsx` | 两份指南共用的职责说明及录入区简短提示，只负责展示 |
| `features/product-structure/components/bom-creation-guide/product-and-bom-responsibility-guide-with-business-entry-actions.tsx` | 组合产品页面链接权限与既有 BOM 草稿入口 |
| `locales/messages/{zh-CN,en-US}/product-and-bom-field-responsibility-guidance.ts` | 两份指南及产品、BOM、模板编辑区的共用职责文案 |
| `features/product-structure/components/bom-creation-guide/bom-creation-guide-draft-entry.tsx` | 业务访问权限、主动打开、延迟加载、保存结果提示 |
| `features/product-structure/components/bom-creation-guide/bom-creation-guide-draft-dialog.tsx` | 组合现有 BOM 编辑器与写入 Hook，承接新建草稿或保存并发布，防止重复提交 |
| `features/product-structure/components/bom-field-business-meaning-help-popover.tsx` | 可复用的只读业务说明内容和问号弹层 |
| `features/product-structure/data/bom-field-business-meaning-help-topic-definitions.ts` | 业务说明主题与内容顺序，不持有表单状态 |
| `locales/messages/{zh-CN,en-US}/bom-field-business-meaning-help.ts` | 字段含义、填写方法与生命周期的独立文案 |
| `features/product-structure/data/bom-creation-operation-guide-section-definitions.ts` | 固定阅读顺序、内容条目键、相关页面地址 |
| `locales/messages/{zh-CN,en-US}/bom-creation-operation-guide.ts` | 独立中英文解释文案，通过现有 engineering 文案入口挂载 |
| `features/product-structure/bom-creation-operation-guide-tab-config.ts` | 说明页自己的模块标签定义 |
| `routes/_authenticated/engineering/bom-creation-guide.tsx` 和 `.lazy.tsx` | 路由声明与延迟加载 |
| `routes/_authenticated/engineering/route.tsx` | 两份指南各自选用独立标签并约束阅读区高度，其他工程页面继续使用各自标签和布局 |
| `components/layout/data/sidebar-data.ts` | 同级手册菜单入口 |
| `features/authz/data/route-permission-labels.ts` | 权限与最近访问使用的页面名称 |

增加路由后按现有脚本生成路由树、认证路由目录、前后端权限契约；新页面权限为 `tab_engineering_bom_creation_guide`，继续使用现有 `menu_engineering` 的模块权限投影规则。

后续增加操作时继续以独立入口和适配模块组合现有 BOM 业务组件。说明正文不承担业务表单、公共目录写入或保存编排，避免文案与编辑规则互相牵连。

## 验证

2026-10-24 产品与 BOM 职责说明及业务入口：

- 6 个相关文件共 59 项自动测试通过，覆盖两份指南、产品建档、模板草稿保存、BOM 编辑器，以及卡片／内嵌入口的主动打开、取消、保存刷新和权限边界。
- TypeScript 构建检查、国际化结构校验、受影响源码 ESLint、格式与差异检查通过。
- 浏览器覆盖两份指南的中文桌面 1366px、中文手机 390px、英文手机 320px 及英文深色桌面，职责卡与按钮无横向溢出；手机标题与章节栏固定。两份指南均主动打开既有 BOM 编辑器，产品与模板弹窗的提示在桌面和手机可见，指南只读账号不暴露产品入口或启用 BOM 写入。使用隔离 API 数据，未写入真实业务记录。

2026-10-24 操作步骤、字段帮助与草稿入口：

- 4 个文件共 38 项自动测试通过，覆盖五章切换、关键业务解释、指南独立权限、身份同步与业务写入权限、主动打开与取消、成功返回真实 BOM 并刷新关联选项及追溯缓存、防重复提交、失败保留并重试，以及锁定记录仍可查看字段帮助、问号不提交表单。
- TypeScript、国际化结构校验、受影响源码 ESLint 与格式检查通过。
- 浏览器验证使用实际工程布局，覆盖 1920×1080、1366×900、1024×768、768×1024、390×844、360×740、360×640、320×640，标题与步骤固定、正文独立滚动、中英文窄屏无横向溢出。另在桌面及两种手机尺寸检查类型、归属、归属客户和性能版本四个帮助入口，弹层在屏幕内，Escape 不关闭底层编辑器；通过一次隔离草稿提交验证现有服务、sidecar、关闭与保存提示链路，未写入真实业务记录。

2026-10-23：

- 初版说明页、手册导航权限与最近访问标签共 13 项自动测试通过。改为章节 Tabs 后，说明页和手册导航权限共 9 项测试通过，覆盖一次只显示当前章节、切换重置阅读位置、重量和分组含义、没有业务编辑入口、独立页面权限、中英文及相关页面权限过滤。
- TypeScript、国际化结构校验、认证路由目录检查通过；受影响文件 ESLint 无错误，工程父路由有一条既有 Fast Refresh 警告。
- 初版浏览器验证覆盖 1366、1024、768、390、360px 五种宽度及英文手机、深色桌面和指南独立权限。章节 Tabs 的验证另外使用实际工程模块布局，覆盖 1366×900、1024×768、768×1024、390×844、360×740、360×640 六种尺寸，标题与章节栏保持固定，仅正文滚动；外层页面及模块容器滚动位置保持为零。五个章节均可独立切换，阅读位置重置和键盘导航通过，英文窄屏无溢出。
- 浏览器验证使用隔离引用环境，未打开编辑弹窗、未写入业务记录。浏览器截图与检查脚本保留在本地 `output/playwright/`，不作为业务实现文件。
