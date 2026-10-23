# BOM 说明指南：内容、导航与职责边界

## 范围与入口

路由为 `/engineering/bom-creation-guide`，位于“产品管理 → 产品操作手册 → 如何建立 BOM”，与“如何建立产品”同级。沿用产品手册的页面样式，业务实现由 `features/product-structure` 独立承接。

首页产品管理分类也提供“如何建立 BOM”卡片，默认排在“如何建立产品”旁边，无需展开“查看更多”。卡片说明概括 BOM、性能版本与重量、分组配方和生命周期，点击进入本说明页；入口沿用指南独立页面权限过滤。

当前为按步骤阅读的说明页：不接入 BOM 编辑弹窗、性能版本管理弹窗、分组管理弹窗，不维护编辑草稿、步骤完成进度或保存回调。相关页面仅提供普通路由链接，并按账号的路径权限过滤。没有相关页面权限时，仍能阅读完整指南。

## 内容口径

按“先认识 BOM → 具体产品与归属 → 性能版本与重量 → 分组配方 → 保存与生命周期”展开，包含以下解释：

- BOM 即物料清单，是具体产品的物料配方；具体产品与基础型号不同。研发 EBOM 与生产 MBOM 分开管理，当前新建入口创建研发 BOM。
- 性能版本目录提供共用名称，每个具体产品只使用需要的名称。性能版本、BOM 修订号、生命周期状态分别表达配置、迭代和使用阶段。
- 重量是具体产品、性能版本及当前配方的成品重量，连同单位由人员填写，随当前 BOM 保存；不能把不同物料的用量相加当成重量。重量比较要对齐产品、BOM 类型与归属。
- 版本管理中的重量可以来自同一范围内已保存的 BOM，也可以是标记为“本次暂存”的会话草稿。每个性能版本优先取最新已发布记录，否则取最新未作废记录；当前 BOM 使用自身草稿值。保存 BOM 仅保存选中版本，不批量建立或修改其他版本的 BOM；维护共用名称不等于保存 BOM。
- 生效日期表达计划适用日期，与批准、发布等状态分别管理。
- 分组配置维护共用物料分类目录。组内物料、用量和损耗属于当前 BOM；修改共用名称、排序、默认项或启停属于公共目录维护。分组不定义生产路线、排产或真实父子组成关系。
- 标准用量按单位用量和损耗计算；预估成本按各物料标准用量与单价计算，独立于成品重量。
- 保存草稿、核对评审、发布使用及后续修订分别说明。指南不承诺日期自动发布、保存自动审批或未实现的审批步骤。

说明依据为 [BOM 数据定义](../../src/features/product-structure/data/schema.ts)、[版本重量会话草稿](../../src/features/product-structure/hooks/use-bom-performance-version-weight-drafts.ts)、[重量比较来源](../../src/features/product-structure/utils/bom-product-performance-version-weight-comparison.ts)、[配方行](../../src/features/product-structure/components/bom-editor/bom-item-row.tsx)、[草稿汇总](../../src/features/product-structure/components/bom-editor/bom-recipe-draft-summary-strip.tsx)、[共用分组面板](../../src/features/product-structure/components/bom-section-management/bom-shared-section-management-panel.tsx)、[后端 BOM 服务](../../server/services/bom_service.go) 和 [状态机](../../server/services/state_machine/bom.go)。分组与工序的领域边界同时参考 [APS 数据模型](../architecture/aps-scheduling-engine/domain-model.md)。

## 当前文档入口与已知差异

- [BOM 编辑弹窗职责边界](bom-editor-dialog-product-information-recipe-layout-and-responsibility-boundaries.md)：左右布局、移动端两步、配方单视图、共用分组、草稿保护、发布与派生条件，以及现有评审交互的边界。
- [产品模板属性与 BOM 性能版本的边界](product-template-attribute-classification-business-components-reuse-guide.md)：模板属性独立维护，BOM 性能版本名称共用，具体产品的重量随 BOM 保存。
- [主数据归属表](../architecture/master-data-ownership-table.md)：性能版本目录的业务归属与兼容存储、重量、共用分组的读写入口。
- [手册导航与权限约定](../architecture/HOME快捷入口与全厂概览独立导航及权限约定.md)：两份独立手册、HOME 入口与各自页面权限。

`bom-performance/` 下的四份文档是已退休的渲染优化与监控实验归档，保留历史设计，不作为当前编辑器 API 或性能版本业务说明。2026-10-23 的核对结果统一记录在 [文档清理记录](../analysis/documentation-inventory-and-cleanup-plan-2026-07-02.md#2026-10-23-bom-and-product-handbook-follow-up)。

## 章节切换与滚动

顶部 1–5 使用系统的 Tabs 组件切换章节，默认显示第一章，一次仅显示当前章节正文。点击章节不再改变 URL 锚点或滚动整页；切换后正文从顶部开始。方向键和 Home／End 使用标准 Tabs 键盘操作。

指南标题、简介和五个章节入口位于正文滚动区之外。正文及其核对清单、相关链接在下方独立滚动，移动端同样保持标题与章节入口可见。窄屏缩小标题区的字号和留白，将五个章节排为一行并使用简短标签，为阅读保留空间；无障碍标签保留完整章节名称。

工程父路由仅在 BOM 指南路径设置 `mainClassName` 与 `contentClassName`，约束指南填满剩余高度，并关闭外层正文滚动。其他工程页面沿用已有布局，公共 `ModuleTabbedLayout` 不增加指南专用逻辑。章节状态和滚动引用仅属于说明页，不进入 BOM 业务草稿或持久化。

## 文件分工

以下路径除特别注明外，相对 `src/`：

| 文件 | 职责 |
| --- | --- |
| `features/product-structure/pages/bom-creation-operation-guide-page.tsx` | 说明页布局、章节切换、正文滚动与有权限的相关页面链接；不导入 BOM 编辑或写入服务 |
| `features/product-structure/data/bom-creation-operation-guide-section-definitions.ts` | 固定阅读顺序、内容条目键、相关页面地址 |
| `locales/messages/{zh-CN,en-US}/bom-creation-operation-guide.ts` | 独立中英文解释文案，通过现有 engineering 文案入口挂载 |
| `features/product-structure/bom-creation-operation-guide-tab-config.ts` | 说明页自己的模块标签定义 |
| `routes/_authenticated/engineering/bom-creation-guide.tsx` 和 `.lazy.tsx` | 路由声明与延迟加载 |
| `routes/_authenticated/engineering/route.tsx` | 在 BOM 指南路径选用独立标签并约束阅读区高度，其他工程页面继续使用各自标签和布局 |
| `components/layout/data/sidebar-data.ts` | 同级手册菜单入口 |
| `features/authz/data/route-permission-labels.ts` | 权限与最近访问使用的页面名称 |

增加路由后按现有脚本生成路由树、认证路由目录、前后端权限契约；新页面权限为 `tab_engineering_bom_creation_guide`，继续使用现有 `menu_engineering` 的模块权限投影规则。

未来接入实际操作时，另外增加明确命名的操作入口和适配模块，再组合现有 BOM 业务组件。说明正文不承担业务表单、公共目录写入或保存编排，避免文案与编辑规则互相牵连。

## 验证

2026-10-23：

- 初版说明页、手册导航权限与最近访问标签共 13 项自动测试通过。改为章节 Tabs 后，说明页和手册导航权限共 9 项测试通过，覆盖一次只显示当前章节、切换重置阅读位置、重量和分组含义、没有业务编辑入口、独立页面权限、中英文及相关页面权限过滤。
- TypeScript、国际化结构校验、认证路由目录检查通过；受影响文件 ESLint 无错误，工程父路由有一条既有 Fast Refresh 警告。
- 初版浏览器验证覆盖 1366、1024、768、390、360px 五种宽度及英文手机、深色桌面和指南独立权限。章节 Tabs 的验证另外使用实际工程模块布局，覆盖 1366×900、1024×768、768×1024、390×844、360×740、360×640 六种尺寸，标题与章节栏保持固定，仅正文滚动；外层页面及模块容器滚动位置保持为零。五个章节均可独立切换，阅读位置重置和键盘导航通过，英文窄屏无溢出。
- 浏览器验证使用隔离引用环境，未打开编辑弹窗、未写入业务记录。浏览器截图与检查脚本保留在本地 `output/playwright/`，不作为业务实现文件。
