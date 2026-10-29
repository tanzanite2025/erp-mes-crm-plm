# 生产料号需求指南：数据来源、计算口径与维护边界

复核日期：2026-10-27。

## 用户入口与职责

独立页面 `/mrp/requirements-guide` 位于“生产管理 → 生产操作手册 → 如何分析料号需求”。首页生产管理快捷入口自动从同一导航数据生成卡片；原“料号需求”页提供有权限的指南链接。

页面分为五章：选单与准备、数据从哪里来、用量如何计算、库存与缺口、核对与下一步。标题、简介、章节按钮固定，只有当前章节正文滚动，切换章节时正文回到顶部。页面不自动查询订单、计算需求或打开业务编辑弹窗；相关业务页链接按现有路由权限投影显示。

本指南已同步共用需求分析基础的当前规则，详见[共用需求计算契约](../architecture/production-material-requirement-shared-expansion-bom-selection-stock-allocation-and-packaging-calculation-contract.md)。指南与知识库遵守[知识库、操作指南和业务文件主库边界](../architecture/knowledge-base-operation-guides-and-business-document-source-ownership-boundaries.md)：指南承接完整阅读顺序，领域内容独立维护；未来问答索引应引用领域解释和来源链接，不复制出另一套计算规则。当前未把本指南接入知识搜索索引，也未创建业务文件查看器。

## 文件职责

| 文件                                                                                                                                                                 | 职责                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [指南页面壳](../../src/features/mrp/pages/part-requirements-operation-guide-page.tsx)                                                                                | 固定页头、五章切换、正文滚动                                 |
| [章节结构及业务链接](../../src/features/mrp/data/part-requirements-operation-guide-chapter-definitions.ts)                                                           | 稳定章节标识、主题顺序、原页面地址，无业务请求               |
| [章节解释组件](../../src/features/mrp/components/part-requirements-guide/part-requirements-operation-guide-chapter-explanations.tsx)                                 | 说明、规则提示、计算示例、权限过滤后的链接                   |
| [中文内容](../../src/locales/messages/zh-CN/part-requirements-operation-guide.ts)、[英文内容](../../src/locales/messages/en-US/part-requirements-operation-guide.ts) | 业务解释的双语维护源，通过 `mrp.operationGuide` 接入既有词典 |
| [指南模块页签](../../src/features/mrp/part-requirements-operation-guide-tab-config.ts)、[MRP 模块布局](../../src/features/mrp/module.tsx)                            | 指南使用独立页签和阅读布局，原需求页布局保持其业务用途       |

新增页面采用路由派生权限 `tab_mrp_requirements_guide`，沿用 `menu_mrp` 父域权限回退。只拥有指南权限的账号可阅读全部内容，不因此获得订单、库存或 BOM 页访问权。指南不重复出现在计划中心的业务页签中。

路由树、认证路由目录、前后端权限派生物通过既有生成脚本更新，不手工维护第二份目录。MRP 侧栏业务入口直达 `/mrp/requirements`，避免 `/mrp` 前缀同时选中指南与计划中心。

## 权威计算链路

生产操作手册现另设 `/mrp/production-material-issuance-guide`。MRP 理论需求与实际下发、仓库领退分开承接，当前能力及后续安排见[生产领料下发及库存过账契约](../architecture/production-material-issuance-dispatch-warehouse-confirmation-and-inventory-posting-contract.md)。核对、冻结历史查询、明确下发与带原因撤回已接入 HTTP、独立权限及前端。原单内仓库领退、单据级进度和库存过账接口已接入；全订单总体进度已由独立只读查询接入，当前分析打印／导出不构成正式下发。

本指南“核对与下一步”说明两页结合，并按目标权限提供生产领料指南链接：料号需求继续承接计算、下发与打印入口；生产领料共用逐订单行需求依据，以总体物料待领和订单行进度核对领退。未下发来源也须纳入范围；已下发使用冻结依据；合并发料保留订单行分配，退料沿原分配核对。总体待领逐行计算后相加，超领单独显示；需求、库存缺口与包装沿用共用需求服务。总体进度已接入，原单内仓库办理独立承接；指南内不实现另一套计算。

当前可用的只读入口在 MRP 完整分析抽屉中：具有“生产领料：查看依据与单据”动作权限时，可明确点击“核对生产领料依据”，查看全部分析来源、采用 BOM、成品重量／性能版本和物料标准需求。此操作不下发、不占库存，分析变化后须重新核对。生产领料页的单据追溯可筛选、分页并展开冻结历史；只读权限覆盖当前系统共享生产数据，不授予发送或仓库确认。指南页面自身仍不加载业务查询。

核对后下发另需专属动作权限及全部范围确认；生产领料页的原单详情内可在具有撤回权限时填写原因，按查看时版本撤回无执行单据。重试保留原请求，不离线排队，下发及撤回不表示发料或库存变化。

后端权威实现：[MRP handler](../../server/handlers/mrp_requirements.go)、[GetMrpRequirements](../../server/services/mrp_requirements.go)。前端通过 [useRequirements](../../src/features/mrp/hooks/use-requirements.ts) 和 [requirement-core-service](../../src/features/mrp/services/requirement-core-service.ts) 请求、验证并展示结果。

| 数据               | 当前规则与边界                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| 销售订单           | 分页加载全部 Pending / Scheduling / InProgress；按完整成品 Qty，不扣完工、发货或已领                            |
| BOM                | 仅已发布、分析当天生效的 MBOM；优先客户专供，否则企业自有；唯一候选自动使用，多份逐订单行明确选择，不取最新创建 |
| 来源完整性         | 每行保留订单 ID、行 ID、版本、BOM ID／修订／性能版本／重量和配方贡献；缺失或单位异常时阻止完整汇总与打印导出    |
| 物料及单位         | 物料必须有效；配方、档案主单位和库存单位一致，不自动换算                                                        |
| 库存与占用         | 只读系统生产物料仓库 MATERIAL；逐批次 max(余额 − 有效 RESERVED 占用, 0) 后求和                                  |
| 跨分组库存         | 同物料按分组、物料 ID 固定顺序分配共享可用量；仅分析预览，不预占或规定实际发料优先级                            |
| 采购在途、生产在制 | 尚未接入，暂不计供应；界面明确待接入                                                                            |
| 包装               | 继续按本组需求总量换算并向上取整；不是按缺口采购量，规则因素、方向和主单位必须有效                              |
| 模具               | 按原订单型号与成品数量查询容量；展示用产品名称及性能版本不改变模具型号键                                        |

例如两组各需 80、可用库存共 100，分配 80 和 20，合计缺口 60。实物余额和有效占用列展示同物料的共享快照，本组有效供应使用分配量，不能把共享快照逐行相加。

指南用量示例仍为单件 2 m²、损耗 5%，标准用量 2.1 m²/件；100 件与 50 件共需 315 m²。库存 100、无占用则缺 215；有效占用 20 时可用 80、缺 235。每卷 25 m²，包装仍按总需求给出 13 卷。

## 已完成与后续治理

已对齐全部订单分页及状态、后端候选选择与生效期、含连字符订单号、逐行完整性核对、来源数量去重、MATERIAL 范围与有效占用、跨分组共享库存。选单区不再加载另一套 BOM 预览。

稳定身份、来源覆盖、冻结和幂等下发领域层，以及核对／历史／下发／撤回 HTTP 与前端均已接入。后续仍需总体进度、仓库确认、逐订单行领退分配和原子过账。分析查询仍是多次读取的参考结果，只读核对不能代替下发事务重核与正式提交。

“仓库共享链接”仍无发送处理。Excel 导出完整分析，不随表内搜索或仅看缺料改变范围；打印和导出均不构成正式下发。采购在途、生产在制及独立质检可用性判断尚未接入。规则变化同步领域实现、双语指南及本文，不能在指南复制业务算法。

## 验证

- [章节及权限链接测试](../../src/features/mrp/pages/part-requirements-operation-guide-chapters-and-permitted-business-links.spec.tsx)：单章显示、正文重置、无业务请求、关键口径、中英内容、业务链接权限。
- [导航与路由权限测试](../../src/components/layout/production-part-requirements-handbook-navigation-and-route-permissions.spec.ts)：生产手册独立入口、首页卡片、指南独立权限、MRP 权限回退、侧栏选中与最近访问标签。
- 执行相关 Vitest、TypeScript、i18n、权限契约与认证路由目录检查；用隔离业务请求的浏览器环境验证桌面和移动端阅读布局。
