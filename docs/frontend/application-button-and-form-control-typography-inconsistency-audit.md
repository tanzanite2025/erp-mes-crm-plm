# 全站按钮与表单控件字号不一致排查

排查日期：2026-11-02；整改日期：2026-11-03。排查对象为当前工作区，包含已有未提交的品质标准功能改动。以下原始数据保留为整改前基线；实际整改与验证结果见文末。

## 结论

控件没有共同执行的文字规格。公共组件默认值、业务包装组件、页面 `className` 和按钮内部文本元素分别定义字号、字重与字距，最终形成多套排版。截图中的四个控件使用同一字体家族 Maple UI，但字号分别是 14px、10px、11px、14px。

统一需要同时覆盖字号、行高、字重、字距、控件高度及占位文字。只调整公共 `Button` 的默认字号，现有页面覆盖和内部 `span` 仍然生效。

## 截图对应页头的浏览器实测

通过本地 Vite 隔离渲染真实 `QualityStandardsHeader`、`LanguageProvider`、React Query 提供器及全局 CSS，使用 Chromium 的 `getComputedStyle` 和 `getBoundingClientRect` 读取。未保存业务数据。

| 控件           | 字号 | 行高   | 字重 | 字距   | 实际高度 |
| -------------- | ---- | ------ | ---- | ------ | -------- |
| 环节管理       | 14px | 20px   | 500  | normal | 44px     |
| 变更记录       | 10px | 15px   | 900  | 1px    | 44px     |
| 全部类型       | 11px | 16.5px | 900  | normal | 36px     |
| 新增受控协议   | 14px | 20px   | 600  | normal | 44px     |
| 搜索框输入文字 | 14px | 20px   | 500  | normal | 48px     |
| 搜索框占位文字 | 10px | —      | 900  | 1px    | —        |

桌面 1800×1000 与手机 390×844 下，四个操作控件的字号、字重、高度均复现上述差异。展开类型下拉后，五个选项也均为 11px、900 字重、16.5px 行高。这些验证覆盖页头组件，不代表整站路由和业务交互回归。

## 直接原因及位置

1. **页面给同一排操作分别设置文字样式。** [quality-standards-header.tsx](../../src/features/quality/components/quality-standards-header.tsx) 中，环节管理沿用 `Button` 的 14px/500；变更记录在第 105 行设置 `text-[10px] font-black tracking-widest uppercase`；类型筛选在第 116 行设置 `text-[11px] font-black`；新增按钮在第 144 行设置 `text-sm font-semibold`。
2. **记录按钮的公共封装自带另一套规范。** [audit-timeline-trigger-button.tsx](../../src/components/common/audit-timeline-trigger-button.tsx) 第 39 行默认使用 10px、900 字重、加宽字距和全大写；当前页头又重复指定了一遍。其他页面复用此组件时会继承这一套样式。
3. **公共控件之间默认值不一致。** [button.tsx](../../src/components/ui/button.tsx) 第 7 行为 14px/500；[select.tsx](../../src/components/ui/select.tsx) 第 37、107 行的触发器和选项为 11px/700；[input.tsx](../../src/components/ui/input.tsx) 第 10 行为手机 12px、桌面 14px；[combobox.tsx](../../src/components/ui/combobox.tsx) 的两种触发器分别为 12px/700 和 12px/400。
4. **按钮尺寸没有定义文字规格。** `button.tsx` 的 `size` 仅规定高度、间距与内边距，`sm/default/lg` 均继承同一基础字号。页面普遍另加 `h-*` 和任意字号，`size` 因而不能代表一套完整控件规格。当前新增按钮同时使用 `size='sm'`、`h-11` 和 `text-sm`。
5. **筛选高度受到选择器优先级影响。** `SelectTrigger` 默认带 `data-size='default'`，组件设置 `data-[size=default]:h-9`。该属性选择器比页面的普通 `h-11` 优先级高，因此实测触发器仍为 36px。要统一高度，需要调整组件尺寸契约或相应属性变体。
6. **全局占位文字规则独立缩小字号。** [index.css](../../src/styles/index.css) 第 49—52 行把所有输入框和文本域占位文字设为 `text-[10px] font-black tracking-widest uppercase opacity-30`。当前搜索框即使设为 14px，占位文字仍为 10px，输入前后会发生明显变化。
7. **按钮内部文本存在独立覆盖。** 例如 [bom-toolbar.tsx](../../src/features/product-structure/components/bom-mgmt/bom-toolbar.tsx) 第 102、114、125 行的内部 `span` 使用手机 9px、较大屏幕 10px。修改按钮父元素字号不会覆盖子元素显式字号。

## 静态影响范围

扫描 `src` 下 `.tsx`，排除 `.spec.tsx` 与 `.test.tsx`；通过 TypeScript AST 统计同名 JSX 标签的直接使用，并检查 `className` 中字号、字重或字距覆盖。

| 组件标签                   | 使用数量 | 直接覆盖文字样式的使用数量 | 涉及文件数量 |
| -------------------------- | -------: | -------------------------: | -----------: |
| Button                     |    1,223 |                        745 |          326 |
| Input                      |      557 |                        295 |          155 |
| SelectTrigger              |      155 |                         74 |           49 |
| SelectItem                 |      277 |                         54 |           22 |
| AuditTimelineTriggerButton |       49 |                         12 |           12 |

`Button` 直接覆盖文字样式的占比约为 61%。其 `className` 中出现 492 次基础 `text-[10px]`、57 次基础 `text-[9px]`、17 次基础 `text-[8px]` 和 672 次 `font-black`。这些是源码声明次数，条件分支也计入，不能直接作为当前屏幕可见按钮数量。

上述统计未解析导入的样式常量、变量拼接、别名组件、原生 `button`、自定义包装组件或按钮后代元素，所以是直接覆盖的可确认范围。字号覆盖本身不一定错误；表格紧凑操作等场景需要明确的尺寸规格。

已有局部统一实践：[product-form-typography.styles.ts](../../src/features/engineering/components/product/product-form-typography.styles.ts) 集中定义产品表单的 13px 控件、按钮、行高和正常字距，但目前属于业务局部规范。

## 建议的整改顺序

1. **确定共享文字规格。** 普通工具栏按钮、筛选器及输入文字最终统一 13px、20px 行高，与侧边栏主目录字号一致；按钮统一 500 字重、正常字距；主次操作通过颜色和边框表达。同一排控件采用同一尺寸。紧凑场景使用明确的独立尺寸档位。
2. **让公共组件执行规格。** 将字号、行高、字重、字距与高度纳入共享尺寸定义，再由 `Button`、`SelectTrigger`、`SelectItem`、`Input`、`Combobox` 和记录按钮复用。尺寸变化应有明确结果。
3. **清理页面与内部文本覆盖。** 先处理当前品质标准页头，再迁移其他工具栏、弹窗操作区和记录按钮入口，连同内部 `span` 一起清理。根据实际用途保留紧凑表格及特殊内容的独立排版。
4. **同步占位文字。** 占位文字继承控件字号、字重和字距，通过主题颜色区分提示与输入内容；当前全局 10px/900 规则需要纳入整改。
5. **按真实布局验证。** 检查桌面、手机、中英文、下拉选项、禁用及加载状态；特别关注字号增大后的按钮换行、长文本、表格行高和弹窗底部操作区。

本次生成的页头隔离验证入口和桌面截图位于被 Git 忽略的 `output/playwright/`，文件名前缀为 `quality-standards-header-`。

## 已完成整改

- 新增 [shared-button-and-form-control-typography.css](../../src/styles/shared-button-and-form-control-typography.css)，以共享变量规定普通控件 13px / 20px / 500、紧凑操作 12px / 16px / 500，统一正常字距和原文大小写。普通控件由最初验证的 14px 调整为 13px，响应用户对侧边栏与业务区比例的反馈。
- `Button`、输入框、文本域、下拉触发器及选项、可搜索选择器、菜单项、页签及确认按钮统一接入；原生输入、文本域、选择器与按钮也采用共享规格。按钮内部普通文字继承规格，命名内容槽保留统计数字、辅助信息与徽标层次。
- 迁移脚本首轮清理 425 个文件中的 4,185 项独立文字样式声明，包含响应式字号、字重、行高、字距及按钮内部文字；产品表单原有样式常量同步接入。
- 占位文字继承控件字号、字重和字距，以主题色区分提示，移除全局 10px 超粗占位规则。
- `SelectTrigger` 尺寸改为根据 `size` 选择普通高度类，再与调用方合并，修复页面 `h-11` 被属性选择器压回 36px 的问题。侧边栏目录保留 13px 与现有层级字重。
- 增加 [check-and-migrate-shared-button-and-form-control-typography.mjs](../../scripts/check-and-migrate-shared-button-and-form-control-typography.mjs)，`pnpm run verify:control-typography` 只读检查；`--write` 用于迁移。检查接入 `pnpm lint`，扫描可静态解析的控件及内部文字类，CSS 同时约束传入的运行时类。它不声称能静态解析任意函数返回的类、跨文件样式对象或内联样式。

## 整改验证

- TypeScript 项目编译及 Vite 生产构建通过；产物确认包含 13px 与 12px 两档共享样式。
- Chromium 隔离渲染真实侧边栏、品质页头、仓库工具栏、BOM 工具栏、共享控件、日历、编辑及确认弹窗；6 组桌面、手机、中英文和深浅主题检查通过。普通按钮、菜单、下拉选项、输入与占位文字均为 13px，紧凑操作为 12px；未检测到横向越界，弹窗操作可见。验证不写入业务记录，不能代替每个业务路由的逐页视觉验收。
- 工作期间品质页头的类型筛选由其他工作区改动移除；最终浏览器回归使用 BOM 类型选择器和独立弹窗选择器验证下拉规格，没有恢复该业务筛选。
- 全量 Vitest 使用两个 worker 复核时：158 个文件通过，873 项通过；当时剩余 1 项为已有品质页面名称修改与 `recent-visit-labels.spec.ts` 旧文案断言不一致。2026-11-03 后续核实并将同一测试中的两处预期由“编辑品质标准工作台”“品质标准预览页”同步为“编辑品质标准”“品质标准详情”，保留原有路由与翻译键断言；该文件单独复跑 4 项全部通过。此前首轮高并发出现的 5 个失败文件单独复跑共 37 项全部通过。未在这两处预期修改后重新运行全量测试。
- 浏览器验证结果、隔离入口和截图保存在 `output/playwright/shared-control-thirteen-pixel-*`。

## 编辑环节与检验规则弹窗的后续修正

2026-11-03，根据实际弹窗截图继续检查，发现独立字段标签不在前述控件文字检查范围内：上方检验项目标签使用 10px，等级行沿用 `Label` 默认的 14px，控件本身为 13px；区块标题和说明文字也混用了多种字号、字重与行高。

- 在检验项目、偏差等级和环节管理表单中，字段标签复用 `control-typography`，统一为 13px / 20px / 500，使用一致的辅助文字颜色。等级行的标签与输入框间距同步为 8px。
- 弹窗主标题保留 18px，一级区块标题统一为 14px / 600，项目等级规则标题为 13px / 600；弹窗副标题为 13px，说明、空态、加载与错误提示统一为 12px / 20px。调整局限于这些编辑组件，不修改公共 `Label` 默认样式。后续布局复查将等级标题改为“项目名 · 等级规则”，明确其归属。
- 使用真实 `QualityStandardEditorDialog` 和嵌套的 `QualityInspectionStageManagementDialog` 隔离验证桌面、手机、中英文、深浅主题及目录加载失败/加载中的 6 组场景，共检查 12 个弹窗状态。所有字段标签均为 13px，与按钮、输入框和下拉控件一致，未发现横向越界。手机额外滚动检查了等级行，验证过程无业务写入。
- 相关现有测试 3 个文件、20 项通过，TypeScript 项目编译、相关组件 ESLint、Prettier 及共享控件文字规范检查通过。隔离入口、检查脚本、实测结果与截图位于 `output/playwright/`，文件名包含 `quality-inspection-rules-dialog`。

同日第 1 项三层编辑验收后，重量规则已按环节分组：环节标题为 14px / 600，项目和等级区域标题为 13px / 600，新增项目选择器、按钮及标签继续为 13px / 20px / 500。补充到 9 组隔离浏览器场景、18 个规则／环节管理弹窗状态，包含多环节多项目、中英文、深浅主题和目录加载失败／加载中；无横向越界，目录失败仅提示一次。另在桌面和手机完成组内新增、移动环节、保存重开验证，无真实业务 API 写入。实现状态和验收证据见[检验环节配置文档](quality-standard-configurable-inspection-stage-catalog-and-item-name-snapshots.md)。

2026-11-03 收口：新增、编辑和详情统一按“环节 → 重量项目 → 等级规则”组织，删除旧 S/A/B 编辑及格式转换。当前格式重新验证 9 组、18 个规则／环节管理弹窗，控件和标签均为 13px；桌面和手机的新增、详情、编辑、移动环节、保存重开通过。最新结果位于 `output/playwright/quality-standard-internal-three-level-final-typography-browser-verification-results.txt`，品质前端 105 项回归通过。

## 品质标准操作按钮的胶囊样式收口

2026-11-03，继续核查发现公共 `Button` 默认 `rounded-md`，品质标准页头已有胶囊，但部分弹窗操作未声明圆角，列表图标按钮使用 `rounded-xl`，分页又继承了共享分页组件的圆角。字体已统一，按钮外形和局部悬停样式仍存在混用。

- 品质标准的新增、规则编辑、环节管理、重量项目及等级增删、基础信息、详情和失败重试均使用 `rounded-full`；列表编辑和详情图标按钮采用圆形，沿用系统 `ghost` 的悬停颜色，移除局部蓝色和缩放覆盖。页头新增与详情底部主按钮移除额外的大阴影、缩放等覆盖，主次操作使用共享 `default`／`outline`。
- 分页按钮通过品质标准调用处的样式统一胶囊圆角，每页条数选择器同步；共享单位加载失败重试改为胶囊描边按钮，权限不足提示的三个共享操作按钮补齐胶囊圆角。公共 `Button` 默认圆角未改动；状态概览卡片和指南章节导航保留各自的内容布局。
- 静态核对品质标准组件及独立编辑／详情页面的 50 处直接操作按钮调用，均声明胶囊圆角。浏览器覆盖中文浅色、英文深色、桌面和手机，共 90 个界面状态、560 次操作按钮测量，包含悬停、禁用、确认及目录和标准加载异常。圆角和 13px 字号全部通过，按钮无横向越界，实际业务 API 写入数为 0。使用真实组件和内存服务替身，未提交审批、发布或归档。
- 品质前端 12 个文件、118 项回归通过，TypeScript、相关 ESLint、Prettier 及共享控件文字检查通过。没有新增按钮包装组件或样式门禁。

结果文件为 `output/playwright/quality-standard-capsule-action-buttons-browser-verification-results.txt`、`output/playwright/quality-standard-capsule-action-buttons-standard-load-errors-browser-verification-results.txt`；脚本为 `verify-quality-standard-capsule-action-buttons-across-list-dialogs-and-failure-states.js`，截图以 `quality-standard-capsule-buttons-` 开头。
