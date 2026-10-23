# 移动端弹窗清单、全高 3px 留白与系统安全区规范

更新日期：2026-10-23。三次复核扫描当前工作区 src 下全部 2,605 个非测试 TS / TSX / JS / JSX 源码文件，核对命名导入、导入别名、Radix 原语、原生 Portal、自定义覆盖层及浏览器原生对话框调用。以下是调用入口清单，不把公共壳与业务调用累计成独立弹窗数量。

## 排查结果与公共入口

最终共有 179 处公共弹窗及其封装组件调用，分布于 168 个文件，覆盖 41 个业务模块及公共组件；另有 3 个底层 Content 实现及 5 类自定义浮层。完整源码清单含底层实现，共 182 处 / 171 个文件。公共壳与其底层 DialogContent 会分别出现，不能将这些数字当作去重后的业务弹窗总数。

额外发现的 40 处浏览器原生调用（34 个文件；32 confirm、3 prompt、5 alert）已经迁移到统一应用弹窗；这些调用共用一个新增的 AlertDialog 入口，已计入上述 179 处。另补齐 3 处仓储反馈接口调用的 await。

| 组件入口 | 调用处数 | 最终接入点 |
| --- | ---: | --- |
| DialogContent | 106 | DialogContent |
| CommandDialog | 1 | DialogContent |
| SheetContent | 10 | SheetContent |
| AlertDialogContent | 11 | AlertDialogContent |
| ConfirmDialog | 18 | AlertDialogContent |
| ActionDialogShell | 32 | DialogContent |
| BOMDialogShell | 1 | DialogContent |

原有移动端尺寸包含 85vh / 90dvh / 94vh、仅 max-height、95vw / 100vw、四边 16px 和贴底抽屉等多套写法；全局搜索已有 h-svh，但缺少外侧留白。页面 viewport 未声明 viewport-fit=cover，安全区没有统一纳入弹窗几何。

## 统一规则

- 手机竖屏使用宽度小于 768px 的规则；768–1023px 且 pointer: coarse 的触屏横屏也适用。桌面尺寸仍由原组件控制。
- 顶、右、底、左各预留 3px；无安全区时 width = 100vw - 6px，height = 可用视口高度 - 6px。每侧 3px 不能只在整个宽高上减一次 3px。
- 系统安全区额外扣除：top = 3px + safe-area-inset-top，left = 3px + safe-area-inset-left；宽度扣左右安全区，高度扣上下安全区。安全区由浏览器 env() 提供，不能按 Pixel 或 iPhone 型号硬编码。
- 高度先声明 100vh 回退，支持 svh 时改用 100svh；同时支持 dvh 时使用 min(100svh, 100dvh)，保持地址栏展开时可见，并允许更短的内容视口限制高度。
- svh 是地址栏展开时的小视口。地址栏收起后仍保留稳定的小视口高度，底部可能出现额外空间；这是避免工具栏动画引起跳动的选择。
- viewport 同时声明 viewport-fit=cover 和 interactive-widget=resizes-content；后者用于支持该参数的 Android 浏览器，让软键盘缩小内容视口。不支持它的浏览器会忽略该参数。
- 弹窗根节点固定在可用视口左上侧，取消旧 translate、transform、scale 与 margin，避免仍按较大的布局视口居中。
- 根节点允许纵向滚动，保留业务已有的内部滚动区；公共标题与页脚不参与 flex 压缩。短确认框也使用统一的全高外框。
- 对自行组织标题、内容和页脚的复杂弹窗，使用 data-mobile-floating-surface-layout='column' 及 data-mobile-floating-surface-scroll-body 明确分配剩余高度。内容区最小保留 8rem；横屏或键盘导致视口过短时，外框继续滚动，避免内容被压至 0 高度。嵌套布局容器不得隐藏这一溢出。
- 全高外框并不代表内容自动合规。必须检查内部 overflow-hidden、固定两列、固定最小宽度、旧的 vh 限高以及未约束高度的 overflow-auto 子节点；列表最后一项、输入框和页脚操作都必须能够通过用户滚动到达。
- 文件预览必须同时检查加载、失败与已加载状态；子查看器在所有分支都应使用调用方传入的尺寸类。标题栏的每层 flex 容器都需允许收缩，长文件名或产品编码不得撑出外框；触屏操作不能依赖 hover 才显示。
- 原生 confirm / prompt / alert 必须使用 requestApplicationConfirmation / requestApplicationTextInput / showApplicationAlert，并在原本阻断后续操作的位置等待返回结果；不得把 Promise 直接用作布尔值。输入取消返回 null，确认空字符串仍返回空字符串。
- 个人记录抽屉在移动端禁用高度拖拽，避免在全高模式下意外改写桌面高度偏好。
- 从公共 DialogContent / AlertDialogContent / SheetContent 进入的组件自动获得 data-mobile-floating-surface；业务覆盖 data-slot（如手机侧栏）不会失去规则。
- 自定义浮层显式接入同一数据标记；嵌入搜索弹窗的知识详情只填充父级安全矩形，避免再次扣除安全区。

实现文件：[公共移动端浮层尺寸样式](../../src/styles/mobile-floating-surface-full-height-three-pixel-gutter-and-safe-area.css)、[样式入口](../../src/styles/index.css)、[viewport 声明](../../index.html)。

样式放在 components 层。尺寸、定位、滚动及显式接入的纵向布局契约使用 !important，以覆盖业务已有的 Tailwind 重要工具类及个人抽屉内联高度；业务 padding、表单与预览内容布局继续由组件负责。

## 二次复核发现及修正

| 业务弹窗 | 问题 | 修正 |
| --- | --- | --- |
| 报价工作台 | 旧 vh 限高的父节点隐藏溢出；长表单最后字段无法滚动到达 | 内容区承担实际滚动，分配标题与页脚后的剩余高度；短屏保留外层滚动 |
| 实验资产子分类 | 手机上强制 160px + 1fr 两列；输入框和保存按钮超出外框 | 小屏单列、图片限制宽度、页脚按钮纵排、长父级 ID 换行 |
| 车辆照片 | 包裹照片和标注的 flex 内容区隐藏溢出，后续标注不可达 | 内容区允许纵向滚动，并保留可用最小高度 |
| 台账搜索 | 内层 grid 在限高下将结果表格压至 0px，并隐藏所有行 | 列表轨道采用内容高度，内容区使用剩余空间并滚动；保留横向表格滚动 |
| 结算台账详情 | 内层独立按 dvh 减固定值，未跟随父级 svh 与安全区 | 统一纵向布局与内容滚动；覆盖正常、错误与短屏状态 |
| 脑图节点编辑 | 二级容器保留旧 vh 上限并隐藏溢出 | 二级容器填充父级安全矩形，正文最小高度与外层滚动配合 |
| BOM 缺料预警 | 二级容器按 90vh 限高，短屏出现多层挤压 | 跟随父级可用高度，正文保留可滚动空间；720px 表格继续使用横向滚动 |
| 物料包装规则 | 材料选择 Popover 固定 486px，超出手机宽度 | 跟随触发器宽度，并使用 Radix 碰撞计算得到的可用宽高；移除正文旧 vh 上限 |
| 库存阈值 | 摘要卡片固定最小宽度 220px，叠加内边距后超出窄屏 | 小屏取消最小宽度，长编码换行；桌面保留原最小宽度 |
| 装箱预览 | 手机单列仍继承整屏高度与 overflow-hidden，预览或后续说明被裁切 | 小屏按内容排列并滚动；桌面保留并排布局；页脚动作换行 |
| 报价打印预览 | 320px 屏幕打印按钮越界 | 小屏标题与操作分行，操作允许换行，预览区分配剩余高度 |
| MRP 需求抽屉 | 头部标题、打印与导出强制同排，短屏正文空间被挤压 | 小屏分行、按钮换行、明确正文滚动与页脚高度 |
| 浏览器原生确认、原因输入及提示 | 系统原生对话框无法应用 3px、svh 与 safe-area 样式 | 40 处调用迁移到应用 AlertDialog；请求按顺序展示，保留确认、取消、默认值和焦点恢复 |

原生调用替换由 [请求队列](../../src/lib/application-confirm-prompt-and-alert-dialog-requests.ts) 与 [全局弹窗宿主](../../src/components/application-confirm-prompt-and-alert-dialog-host.tsx) 承担，宿主挂载于应用根部的语言与主题 Provider 内。PWA 安装使用的 promptEvent.prompt() 属于浏览器安装权限界面，保留浏览器控制，不属于业务对话框。

## 三次复核发现及修正

本轮沿实际导入的子组件检查内部布局，新增修改 10 个业务源码文件；公共尺寸规则保持一致。

| 业务弹窗 | 复现的问题 | 修正 |
| --- | --- | --- |
| CAD / PDF / Excel 档案预览 | 长文件名撑宽标题栏；横屏、短内容视口的正文被压到约 76–91px，工具按钮或失败内容被 overflow-hidden 裁切 | 逐层允许标题收缩；正文使用公共纵向布局与滚动契约，查看器保留至少 12rem；过短时通过内容和外框滚动到达控件 |
| CAD 子查看器 | 工具栏依赖 hover；失败分支忽略调用方尺寸；叠加说明没有宽度约束 | 无 hover 的触屏保持工具栏可见；失败分支使用传入尺寸；约束工具栏及说明宽度 |
| Excel 子查看器 | 加载和失败分支固定 h-64，忽略调用方的剩余高度 | 所有分支接收传入的尺寸类；失败说明增加内边距和居中排版；另使用双工作表、宽列和长表格验证正常状态 |
| 辐条 / 花鼓 / 辐帽附件预览 | 无空格长文件名越界；辐帽标题固定 80px 高，换行后与内容重叠 | 图标不压缩、文件名允许断行；辐帽标题改为最小高度，随文字扩展 |
| 受控协议 | 长产品标识在摘要和页脚撑宽布局，横屏的取消和确认按钮被挤出弹窗 | 摘要和页脚编码受宽度约束并断行；操作组不收缩且允许换行；内容接入公共剩余高度与滚动契约 |
| 人员导入的预览状态 | 长文件名挤出“更换文件”；固定 100px + 80px + 80px 列宽裁切性别、部门与联系方式；桌面长预览也可能把操作推到视口外 | 文件信息可换行，小屏人员记录改为两列并完整换行显示详情；弹窗限制可用高度，正文滚动、标题与页脚保留空间 |

出库已加载状态、人员新建表单、含多级工序的产线选择及 BOM 新建基本信息另进行浏览器验证，当前覆盖状态未发现新的不可达控件。辐条附件组件进行了实际渲染验证，花鼓和辐帽的内嵌同类标题进行了源码核对与相同修正。

## 自定义浮层

| 浮层 | 文件 | 接入说明 |
| --- | --- | --- |
| 知识详情抽屉 | [src/components/command-menu-knowledge-detail-drawer.tsx](../../src/components/command-menu-knowledge-detail-drawer.tsx) | knowledge-detail；嵌入搜索框时使用 data-mobile-floating-surface-within-parent，避免重复扣安全区 |
| 知识编辑浮层 | [src/features/basic-settings/knowledge-base/components/knowledge-base-entry-editor.tsx](../../src/features/basic-settings/knowledge-base/components/knowledge-base-entry-editor.tsx) | knowledge-editor |
| 个人记录底部抽屉 | [src/features/personal-workbench/components/personal-workbench-bottom-drawer.tsx](../../src/features/personal-workbench/components/personal-workbench-bottom-drawer.tsx) | personal-workbench；移动端全高覆盖持久化的桌面拖拽高度 |
| 车型联系人删除确认 | [src/features/shipping-management/vehicle-contact-delete-dialog.tsx](../../src/features/shipping-management/vehicle-contact-delete-dialog.tsx) | vehicle-contact-delete |
| 实验设备删除确认 | [src/features/labs/experimental/components/equipment-action-dialog.tsx](../../src/features/labs/experimental/components/equipment-action-dialog.tsx) | equipment-delete |

## 全部公共组件调用文件

此表由 TypeScript AST 扫描产生，包含文件名中没有 dialog / drawer 的内嵌弹窗。次数是当前文件内对应组件的 JSX 调用次数。

| 文件 | 组件与次数 |
| --- | --- |
| [src/components/action-dialog-shell.tsx](../../src/components/action-dialog-shell.tsx) | DialogContent × 1 |
| [src/components/application-confirm-prompt-and-alert-dialog-host.tsx](../../src/components/application-confirm-prompt-and-alert-dialog-host.tsx) | AlertDialogContent × 1 |
| [src/components/command-menu-view.tsx](../../src/components/command-menu-view.tsx) | CommandDialog × 1 |
| [src/components/config-drawer.tsx](../../src/components/config-drawer.tsx) | SheetContent × 1 |
| [src/components/confirm-dialog.tsx](../../src/components/confirm-dialog.tsx) | AlertDialogContent × 1 |
| [src/components/sign-out-dialog.tsx](../../src/components/sign-out-dialog.tsx) | ConfirmDialog × 1 |
| [src/components/ui/alert-dialog.tsx](../../src/components/ui/alert-dialog.tsx) | AlertDialogPrimitive.Content × 1 |
| [src/components/ui/command.tsx](../../src/components/ui/command.tsx) | DialogContent × 1 |
| [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) | DialogPrimitive.Content × 1 |
| [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) | SheetPrimitive.Content × 1 |
| [src/components/ui/sidebar.tsx](../../src/components/ui/sidebar.tsx) | SheetContent × 1 |
| [src/features/ai-assistant/components/daily-insight-modal.tsx](../../src/features/ai-assistant/components/daily-insight-modal.tsx) | DialogContent × 1 |
| [src/features/approval/components/approval-guard.tsx](../../src/features/approval/components/approval-guard.tsx) | DialogContent × 1 |
| [src/features/approval/tabs/approval-requests.tsx](../../src/features/approval/tabs/approval-requests.tsx) | DialogContent × 1 |
| [src/features/audit-timeline/components/data-timeline.tsx](../../src/features/audit-timeline/components/data-timeline.tsx) | SheetContent × 1 |
| [src/features/basic-settings/components/appearance-action-dialog.tsx](../../src/features/basic-settings/components/appearance-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/basic-settings/components/barcode-rule-config-dialog.tsx](../../src/features/basic-settings/components/barcode-rule-config-dialog.tsx) | DialogContent × 1 |
| [src/features/basic-settings/components/unit-action-dialog.tsx](../../src/features/basic-settings/components/unit-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/basic-settings/tabs/linear-barcode-mgmt.tsx](../../src/features/basic-settings/tabs/linear-barcode-mgmt.tsx) | DialogContent × 1 |
| [src/features/basic-settings/tabs/sequence-mgmt.tsx](../../src/features/basic-settings/tabs/sequence-mgmt.tsx) | DialogContent × 1 |
| [src/features/business-analysis/tabs/production-capacity-tab.tsx](../../src/features/business-analysis/tabs/production-capacity-tab.tsx) | DialogContent × 1 |
| [src/features/code-center/components/hole-code-source-action-dialog.tsx](../../src/features/code-center/components/hole-code-source-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/code-center/shared-hole-code-source-mgmt.tsx](../../src/features/code-center/shared-hole-code-source-mgmt.tsx) | ActionDialogShell × 2 |
| [src/features/cutting-operations/tabs/product-binding/components/product-binding-history-dialog-content.tsx](../../src/features/cutting-operations/tabs/product-binding/components/product-binding-history-dialog-content.tsx) | DialogContent × 1 |
| [src/features/cutting-operations/tabs/size-inventory/size-inventory-tab.tsx](../../src/features/cutting-operations/tabs/size-inventory/size-inventory-tab.tsx) | DialogContent × 1 |
| [src/features/dashboard/components/orders-progress.tsx](../../src/features/dashboard/components/orders-progress.tsx) | DialogContent × 1 |
| [src/features/dashboard/tabs/overview-tab.tsx](../../src/features/dashboard/tabs/overview-tab.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/cad-viewer/cad-viewer-dialog.tsx](../../src/features/engineering-db/components/cad-viewer/cad-viewer-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/drilling-action-dialog.tsx](../../src/features/engineering-db/components/drilling-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/excel-viewer/excel-viewer-dialog.tsx](../../src/features/engineering-db/components/excel-viewer/excel-viewer-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/hub-action-dialog.tsx](../../src/features/engineering-db/components/hub-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/labeling-action-dialog.tsx](../../src/features/engineering-db/components/labeling-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/nipple-action-dialog.tsx](../../src/features/engineering-db/components/nipple-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/pdf-viewer/pdf-viewer-dialog.tsx](../../src/features/engineering-db/components/pdf-viewer/pdf-viewer-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/spec-action-dialog.tsx](../../src/features/engineering-db/components/spec-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/spoke-length-action-dialog.tsx](../../src/features/engineering-db/components/spoke-length-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/components/spoke-length-preview-dialog.tsx](../../src/features/engineering-db/components/spoke-length-preview-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/technical-specification-document-library-selection-dialog.tsx](../../src/features/engineering-db/components/technical-specification-document-library-selection-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/technical-specification-document-preview-dialog.tsx](../../src/features/engineering-db/components/technical-specification-document-preview-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering-db/components/weaving-mode-action-dialog.tsx](../../src/features/engineering-db/components/weaving-mode-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering-db/tabs/cutting-plan-tab.tsx](../../src/features/engineering-db/tabs/cutting-plan-tab.tsx) | DialogContent × 1 |
| [src/features/engineering-db/tabs/hubs-tab.tsx](../../src/features/engineering-db/tabs/hubs-tab.tsx) | DialogContent × 1 |
| [src/features/engineering-db/tabs/nipples-tab.tsx](../../src/features/engineering-db/tabs/nipples-tab.tsx) | DialogContent × 1 |
| [src/features/engineering/components/category-manager-dialog.tsx](../../src/features/engineering/components/category-manager-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-action-dialog.tsx](../../src/features/engineering/components/product-action-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-appearance/product-appearance-editor-dialog.tsx](../../src/features/engineering/components/product-appearance/product-appearance-editor-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering/components/product-appearance/product-appearance-management-dialog.tsx](../../src/features/engineering/components/product-appearance/product-appearance-management-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/engineering/components/product-attributes/product-template-attribute-classification-management-dialog.tsx](../../src/features/engineering/components/product-attributes/product-template-attribute-classification-management-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-attributes/product-template-attribute-level-one-category-dialog.tsx](../../src/features/engineering/components/product-attributes/product-template-attribute-level-one-category-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-attributes/product-template-attribute-level-two-option-dialog.tsx](../../src/features/engineering/components/product-attributes/product-template-attribute-level-two-option-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-creation-guide/product-creation-guide-completion-summary-dialog.tsx](../../src/features/engineering/components/product-creation-guide/product-creation-guide-completion-summary-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-creation-guide/product-creation-guide-configuration-dialog-shell.tsx](../../src/features/engineering/components/product-creation-guide/product-creation-guide-configuration-dialog-shell.tsx) | DialogContent × 1 |
| [src/features/engineering/components/product-type-action-dialog.tsx](../../src/features/engineering/components/product-type-action-dialog.tsx) | DialogContent × 1 |
| [src/features/engineering/components/template-mgmt/product-physical-specification-template-delete-confirmation-dialog.tsx](../../src/features/engineering/components/template-mgmt/product-physical-specification-template-delete-confirmation-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/engineering/components/template-mgmt/template-editor-dialog.tsx](../../src/features/engineering/components/template-mgmt/template-editor-dialog.tsx) | DialogContent × 1 |
| [src/features/equipment-maintenance/components/maintenance-record-list.tsx](../../src/features/equipment-maintenance/components/maintenance-record-list.tsx) | DialogContent × 1、AlertDialogContent × 1 |
| [src/features/equipment-tooling/components/drawing-action-dialog.tsx](../../src/features/equipment-tooling/components/drawing-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/equipment-tooling/components/mold-action-dialog.tsx](../../src/features/equipment-tooling/components/mold-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/equipment-tooling/components/mold-loan-action-dialog.tsx](../../src/features/equipment-tooling/components/mold-loan-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/equipment-tooling/components/mold-master-library-group-preview-dialog.tsx](../../src/features/equipment-tooling/components/mold-master-library-group-preview-dialog.tsx) | DialogContent × 1 |
| [src/features/equipment-tooling/components/mold-master-library-group-selection-dialog.tsx](../../src/features/equipment-tooling/components/mold-master-library-group-selection-dialog.tsx) | DialogContent × 1 |
| [src/features/equipment-tooling/components/partner-action-dialog.tsx](../../src/features/equipment-tooling/components/partner-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/equipment-tooling/tabs/drawing-mgmt.tsx](../../src/features/equipment-tooling/tabs/drawing-mgmt.tsx) | DialogContent × 1 |
| [src/features/finance/components/currency-action-dialog.tsx](../../src/features/finance/components/currency-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/finance/components/payment-method-action-dialog.tsx](../../src/features/finance/components/payment-method-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/finance/components/payment-term-action-dialog.tsx](../../src/features/finance/components/payment-term-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/finance/components/tax-action-dialog.tsx](../../src/features/finance/components/tax-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/labs/experimental/components/category-action-dialog.tsx](../../src/features/labs/experimental/components/category-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/labs/experimental/components/equipment-action-dialog.tsx](../../src/features/labs/experimental/components/equipment-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/labs/experimental/components/equipment-category-delete-dialog.tsx](../../src/features/labs/experimental/components/equipment-category-delete-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/logistics-config/components/logistics-supplier-form-dialog.tsx](../../src/features/logistics-config/components/logistics-supplier-form-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics-config/provider-directory/components/logistics-provider-form-dialog.tsx](../../src/features/logistics-config/provider-directory/components/logistics-provider-form-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics-config/vehicle-loading/components/vehicle-loading-plan-dialog.tsx](../../src/features/logistics-config/vehicle-loading/components/vehicle-loading-plan-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics-config/vehicle-specs/components/vehicle-photo-dialog.tsx](../../src/features/logistics-config/vehicle-specs/components/vehicle-photo-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics-packaging-management/components/packaging-profile-form-dialog.tsx](../../src/features/logistics-packaging-management/components/packaging-profile-form-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics/components/logistics-action-dialog.tsx](../../src/features/logistics/components/logistics-action-dialog.tsx) | DialogContent × 1 |
| [src/features/logistics/components/logistics-mgmt.tsx](../../src/features/logistics/components/logistics-mgmt.tsx) | SheetContent × 1 |
| [src/features/material-archive/components/material-assembly-rule-dialog.tsx](../../src/features/material-archive/components/material-assembly-rule-dialog.tsx) | DialogContent × 1 |
| [src/features/material-archive/components/material-upsert-dialog.tsx](../../src/features/material-archive/components/material-upsert-dialog.tsx) | DialogContent × 1 |
| [src/features/mrp/components/requirements/requirement-drawer.tsx](../../src/features/mrp/components/requirements/requirement-drawer.tsx) | SheetContent × 1 |
| [src/features/org-personnel/components/employee-action-dialog.tsx](../../src/features/org-personnel/components/employee-action-dialog.tsx) | DialogContent × 1 |
| [src/features/org-personnel/components/employee-bulk-resign-dialog.tsx](../../src/features/org-personnel/components/employee-bulk-resign-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/org-personnel/components/employee-multi-delete-dialog.tsx](../../src/features/org-personnel/components/employee-multi-delete-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/org-personnel/components/import-personnel-dialog.tsx](../../src/features/org-personnel/components/import-personnel-dialog.tsx) | DialogContent × 1 |
| [src/features/org-personnel/components/leave-action-dialog.tsx](../../src/features/org-personnel/components/leave-action-dialog.tsx) | DialogContent × 1 |
| [src/features/org-personnel/components/leave-detail-dialog.tsx](../../src/features/org-personnel/components/leave-detail-dialog.tsx) | DialogContent × 1 |
| [src/features/org-personnel/components/org-action-dialog.tsx](../../src/features/org-personnel/components/org-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/org-personnel/components/production-selector.tsx](../../src/features/org-personnel/components/production-selector.tsx) | DialogContent × 1 |
| [src/features/org-personnel/tabs/attendance-devices.tsx](../../src/features/org-personnel/tabs/attendance-devices.tsx) | DialogContent × 2 |
| [src/features/org-personnel/tabs/employee-management-list.tsx](../../src/features/org-personnel/tabs/employee-management-list.tsx) | ConfirmDialog × 1 |
| [src/features/org-personnel/tabs/org-mgmt.tsx](../../src/features/org-personnel/tabs/org-mgmt.tsx) | ConfirmDialog × 1 |
| [src/features/personal-workbench/components/personal-workbench-card-editor.tsx](../../src/features/personal-workbench/components/personal-workbench-card-editor.tsx) | DialogContent × 1 |
| [src/features/personal-workbench/workspace/components/workspace-item-editor.tsx](../../src/features/personal-workbench/workspace/components/workspace-item-editor.tsx) | DialogContent × 1 |
| [src/features/piecework/components/rate-action-dialog.tsx](../../src/features/piecework/components/rate-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/piecework/tabs/piecework-pay-items-and-rates-maintenance.tsx](../../src/features/piecework/tabs/piecework-pay-items-and-rates-maintenance.tsx) | ConfirmDialog × 1、ActionDialogShell × 1 |
| [src/features/product-structure/components/bom-action-dialog.tsx](../../src/features/product-structure/components/bom-action-dialog.tsx) | BOMDialogShell × 1 |
| [src/features/product-structure/components/bom-dialog-shell.tsx](../../src/features/product-structure/components/bom-dialog-shell.tsx) | DialogContent × 1 |
| [src/features/product-structure/components/bom-editor/bom-performance-version-option-management-dialog.tsx](../../src/features/product-structure/components/bom-editor/bom-performance-version-option-management-dialog.tsx) | DialogContent × 1 |
| [src/features/product-structure/components/bom-protocol-recovery-dialog.tsx](../../src/features/product-structure/components/bom-protocol-recovery-dialog.tsx) | AlertDialogContent × 1 |
| [src/features/product-structure/components/bom-version-conflict-dialog.tsx](../../src/features/product-structure/components/bom-version-conflict-dialog.tsx) | AlertDialogContent × 1 |
| [src/features/product-structure/tabs/bom-section-config.tsx](../../src/features/product-structure/tabs/bom-section-config.tsx) | DialogContent × 1、ConfirmDialog × 1 |
| [src/features/product-structure/version-trace/components/bom-version-trace-dialog.tsx](../../src/features/product-structure/version-trace/components/bom-version-trace-dialog.tsx) | DialogContent × 1 |
| [src/features/production-calendar/components/day-detail-sheet.tsx](../../src/features/production-calendar/components/day-detail-sheet.tsx) | SheetContent × 1 |
| [src/features/production-outsourcing/orders/outsource-order-dialog.tsx](../../src/features/production-outsourcing/orders/outsource-order-dialog.tsx) | DialogContent × 1 |
| [src/features/production-outsourcing/partners/outsource-partner-dialog.tsx](../../src/features/production-outsourcing/partners/outsource-partner-dialog.tsx) | DialogContent × 1 |
| [src/features/production-outsourcing/transfers/index.tsx](../../src/features/production-outsourcing/transfers/index.tsx) | DialogContent × 1 |
| [src/features/production-quality/tabs/quality-inspection.tsx](../../src/features/production-quality/tabs/quality-inspection.tsx) | DialogContent × 1 |
| [src/features/production-shared/components/production-line-profile-dialog.tsx](../../src/features/production-shared/components/production-line-profile-dialog.tsx) | DialogContent × 1 |
| [src/features/production-shared/tabs/line-mindmap/components/mindmap-create-node-dialog.tsx](../../src/features/production-shared/tabs/line-mindmap/components/mindmap-create-node-dialog.tsx) | DialogContent × 1 |
| [src/features/production-shared/tabs/line-mindmap/components/mindmap-node-edit-dialog.tsx](../../src/features/production-shared/tabs/line-mindmap/components/mindmap-node-edit-dialog.tsx) | DialogContent × 1 |
| [src/features/production-shared/tabs/production-route/production-route-dialog.tsx](../../src/features/production-shared/tabs/production-route/production-route-dialog.tsx) | DialogContent × 1 |
| [src/features/production-shared/tabs/topology-template/components/template-card.tsx](../../src/features/production-shared/tabs/topology-template/components/template-card.tsx) | AlertDialogContent × 1 |
| [src/features/production-shared/tabs/topology-template/components/template-dialog.tsx](../../src/features/production-shared/tabs/topology-template/components/template-dialog.tsx) | DialogContent × 1 |
| [src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx](../../src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx) | DialogContent × 1、AlertDialogContent × 1 |
| [src/features/production-shared/topology/security-auth-dialog.tsx](../../src/features/production-shared/topology/security-auth-dialog.tsx) | DialogContent × 1 |
| [src/features/purchase/logistics/purchase-logistics-list.tsx](../../src/features/purchase/logistics/purchase-logistics-list.tsx) | SheetContent × 1 |
| [src/features/purchase/orders/components/purchase-order-action-dialog-shell.tsx](../../src/features/purchase/orders/components/purchase-order-action-dialog-shell.tsx) | DialogContent × 1 |
| [src/features/purchase/orders/components/purchase-order-detail-sheet.tsx](../../src/features/purchase/orders/components/purchase-order-detail-sheet.tsx) | SheetContent × 1 |
| [src/features/purchase/orders/components/purchase-order-returns.tsx](../../src/features/purchase/orders/components/purchase-order-returns.tsx) | DialogContent × 1 |
| [src/features/purchase/orders/components/purchase-receipt-confirm-dialog.tsx](../../src/features/purchase/orders/components/purchase-receipt-confirm-dialog.tsx) | DialogContent × 1 |
| [src/features/purchase/suppliers/components/supplier-action-dialog.tsx](../../src/features/purchase/suppliers/components/supplier-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/quality/components/controlled-protocol-dialog.tsx](../../src/features/quality/components/controlled-protocol-dialog.tsx) | DialogContent × 1 |
| [src/features/quality/components/standard-status-action-dialog.tsx](../../src/features/quality/components/standard-status-action-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/quick-actions/components/quick-action-drawer.tsx](../../src/features/quick-actions/components/quick-action-drawer.tsx) | SheetContent × 1 |
| [src/features/quotes/components/quote-print-preview-dialog.tsx](../../src/features/quotes/components/quote-print-preview-dialog.tsx) | DialogContent × 1 |
| [src/features/quotes/components/quote-workspace-dialog.tsx](../../src/features/quotes/components/quote-workspace-dialog.tsx) | DialogContent × 1 |
| [src/features/raw-materials/batch-engine/components/batch-engine-cutting-preview-dialog.tsx](../../src/features/raw-materials/batch-engine/components/batch-engine-cutting-preview-dialog.tsx) | DialogContent × 1 |
| [src/features/raw-materials/components/prepreg-bind-token-entry-dialog.tsx](../../src/features/raw-materials/components/prepreg-bind-token-entry-dialog.tsx) | DialogContent × 1 |
| [src/features/raw-materials/components/prepreg-catalog-dialog.tsx](../../src/features/raw-materials/components/prepreg-catalog-dialog.tsx) | DialogContent × 1 |
| [src/features/raw-materials/cut-size-library/cut-size-library-page.tsx](../../src/features/raw-materials/cut-size-library/cut-size-library-page.tsx) | DialogContent × 1 |
| [src/features/shared/team/team-action-dialog.tsx](../../src/features/shared/team/team-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/shipping-management/vehicle-contact-editor-dialog.tsx](../../src/features/shipping-management/vehicle-contact-editor-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/sidebar-command-config/components/command-category-form-dialog.tsx](../../src/features/sidebar-command-config/components/command-category-form-dialog.tsx) | DialogContent × 1 |
| [src/features/sidebar-command-config/components/command-library-form-dialog.tsx](../../src/features/sidebar-command-config/components/command-library-form-dialog.tsx) | DialogContent × 1 |
| [src/features/system-mgmt/notifications/components/notification-center.tsx](../../src/features/system-mgmt/notifications/components/notification-center.tsx) | DialogContent × 1 |
| [src/features/system-mgmt/tabs/components/business-event-source-card-drawer-panel.tsx](../../src/features/system-mgmt/tabs/components/business-event-source-card-drawer-panel.tsx) | DialogContent × 1 |
| [src/features/system-mgmt/tabs/components/business-event-source-card-drawers.tsx](../../src/features/system-mgmt/tabs/components/business-event-source-card-drawers.tsx) | AlertDialogContent × 2 |
| [src/features/system-mgmt/tabs/components/business-event-source-delete-dialog.tsx](../../src/features/system-mgmt/tabs/components/business-event-source-delete-dialog.tsx) | AlertDialogContent × 1 |
| [src/features/system-mgmt/workflow-core/components/command-mgmt/command-form.tsx](../../src/features/system-mgmt/workflow-core/components/command-mgmt/command-form.tsx) | DialogContent × 1 |
| [src/features/tooling-furnaces/components/furnace-action-dialog.tsx](../../src/features/tooling-furnaces/components/furnace-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/trading/components/customer-action-dialog.tsx](../../src/features/trading/components/customer-action-dialog.tsx) | ActionDialogShell × 1 |
| [src/features/trading/components/sales-order-action-dialog.tsx](../../src/features/trading/components/sales-order-action-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/components/sales-order-detail-sheet.tsx](../../src/features/trading/components/sales-order-detail-sheet.tsx) | SheetContent × 1 |
| [src/features/trading/components/sales-order-preassemble-scan-dialog.tsx](../../src/features/trading/components/sales-order-preassemble-scan-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/sales-exchanges/components/sales-exchange-create-dialog.tsx](../../src/features/trading/sales-exchanges/components/sales-exchange-create-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/sales-exchanges/components/sales-exchange-execution-dialogs.tsx](../../src/features/trading/sales-exchanges/components/sales-exchange-execution-dialogs.tsx) | DialogContent × 2 |
| [src/features/trading/sales-exchanges/components/sales-exchange-record-spotlight.tsx](../../src/features/trading/sales-exchanges/components/sales-exchange-record-spotlight.tsx) | ConfirmDialog × 1 |
| [src/features/trading/sales-returns/components/sales-order-sales-return-actual-amount-entry-dialog/sales-order-sales-return-actual-amount-entry-dialog.tsx](../../src/features/trading/sales-returns/components/sales-order-sales-return-actual-amount-entry-dialog/sales-order-sales-return-actual-amount-entry-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/sales-returns/components/sales-return-actual-amount-records/sales-return-actual-amount-record-detail-dialog.tsx](../../src/features/trading/sales-returns/components/sales-return-actual-amount-records/sales-return-actual-amount-record-detail-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/sales-returns/components/sales-return-create-sheet.tsx](../../src/features/trading/sales-returns/components/sales-return-create-sheet.tsx) | DialogContent × 1 |
| [src/features/trading/sales-returns/components/sales-return-inbound-dialog.tsx](../../src/features/trading/sales-returns/components/sales-return-inbound-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/sales-returns/components/sales-return-record-master.tsx](../../src/features/trading/sales-returns/components/sales-return-record-master.tsx) | AlertDialogContent × 1 |
| [src/features/trading/settlement-ledger-detail-dialog/components/ledger-search-dialog.tsx](../../src/features/trading/settlement-ledger-detail-dialog/components/ledger-search-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/settlement-ledger-detail-dialog/components/settlement-ledger-detail-dialog.tsx](../../src/features/trading/settlement-ledger-detail-dialog/components/settlement-ledger-detail-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/shipping-management/components/shipping-vehicle-match-recommendation-dialog.tsx](../../src/features/trading/shipping-management/components/shipping-vehicle-match-recommendation-dialog.tsx) | DialogContent × 1 |
| [src/features/trading/shipping-management/components/shipping-vehicle-specs-catalog-dialog.tsx](../../src/features/trading/shipping-management/components/shipping-vehicle-specs-catalog-dialog.tsx) | DialogContent × 1 |
| [src/features/users/components/users-action-dialog.tsx](../../src/features/users/components/users-action-dialog.tsx) | DialogContent × 1 |
| [src/features/users/components/users-delete-dialog.tsx](../../src/features/users/components/users-delete-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/users/components/users-multi-delete-dialog.tsx](../../src/features/users/components/users-multi-delete-dialog.tsx) | ConfirmDialog × 1 |
| [src/features/users/components/users-permissions-dialog.tsx](../../src/features/users/components/users-permissions-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse-config/tabs/material-thresholds.tsx](../../src/features/warehouse-config/tabs/material-thresholds.tsx) | ConfirmDialog × 1 |
| [src/features/warehouse/components/bom-alert-details-dialog.tsx](../../src/features/warehouse/components/bom-alert-details-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/components/packaging-assembly-print-dialog.tsx](../../src/features/warehouse/components/packaging-assembly-print-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/components/product-inbound-action-dialog.tsx](../../src/features/warehouse/components/product-inbound-action-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/components/product-inbound-form-dialog.tsx](../../src/features/warehouse/components/product-inbound-form-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/material-thresholds/components/material-threshold-dialog.tsx](../../src/features/warehouse/material-thresholds/components/material-threshold-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/shipment/components/shipment-dialog.tsx](../../src/features/warehouse/shipment/components/shipment-dialog.tsx) | DialogContent × 1 |
| [src/features/warehouse/tabs/adjustment-history.tsx](../../src/features/warehouse/tabs/adjustment-history.tsx) | DialogContent × 1、ConfirmDialog × 1 |
| [src/features/warehouse/tabs/stock-mgmt.tsx](../../src/features/warehouse/tabs/stock-mgmt.tsx) | ConfirmDialog × 1 |
| [src/features/warehouse/tabs/stocktake-mgmt.tsx](../../src/features/warehouse/tabs/stocktake-mgmt.tsx) | DialogContent × 1、ConfirmDialog × 1 |
| [src/features/warehouse/tabs/warehouse-category.tsx](../../src/features/warehouse/tabs/warehouse-category.tsx) | DialogContent × 1、ConfirmDialog × 1 |

## 已迁移的浏览器原生业务调用

此表是原生调用的迁移来源，不能与上表累计成独立弹窗数量。

| 文件 | 原生调用与次数 |
| --- | --- |
| [src/features/basic-settings/hooks/use-unit-mgmt.ts](../../src/features/basic-settings/hooks/use-unit-mgmt.ts) | confirm × 1 |
| [src/features/engineering-db/hooks/use-spoke-length-mgmt.ts](../../src/features/engineering-db/hooks/use-spoke-length-mgmt.ts) | confirm × 1 |
| [src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx](../../src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx) | confirm × 1 |
| [src/features/engineering/components/category-manager-dialog.tsx](../../src/features/engineering/components/category-manager-dialog.tsx) | confirm × 1 |
| [src/features/engineering/components/product-action-dialog.tsx](../../src/features/engineering/components/product-action-dialog.tsx) | confirm × 1 |
| [src/features/engineering/components/product-appearance/product-appearance-management-panel.tsx](../../src/features/engineering/components/product-appearance/product-appearance-management-panel.tsx) | confirm × 1 |
| [src/features/engineering/components/product-attributes/product-template-attribute-classification-management-panel.tsx](../../src/features/engineering/components/product-attributes/product-template-attribute-classification-management-panel.tsx) | confirm × 2 |
| [src/features/engineering/tabs/product-types-mgmt.tsx](../../src/features/engineering/tabs/product-types-mgmt.tsx) | confirm × 1 |
| [src/features/equipment-tooling/components/drawing-action-dialog.tsx](../../src/features/equipment-tooling/components/drawing-action-dialog.tsx) | confirm × 1 |
| [src/features/finance/hooks/use-currencies.ts](../../src/features/finance/hooks/use-currencies.ts) | confirm × 1 |
| [src/features/logistics-config/provider-directory/hooks/use-logistics-platform-admin.ts](../../src/features/logistics-config/provider-directory/hooks/use-logistics-platform-admin.ts) | confirm × 1 |
| [src/features/logistics-packaging-management/packaging-rules-tab.tsx](../../src/features/logistics-packaging-management/packaging-rules-tab.tsx) | confirm × 1 |
| [src/features/logistics/components/logistics-action-dialog.tsx](../../src/features/logistics/components/logistics-action-dialog.tsx) | alert × 3 |
| [src/features/logistics/components/logistics-mgmt.tsx](../../src/features/logistics/components/logistics-mgmt.tsx) | prompt × 1 |
| [src/features/material-archive/hooks/use-material-assembly-manager.ts](../../src/features/material-archive/hooks/use-material-assembly-manager.ts) | confirm × 1 |
| [src/features/material-archive/hooks/use-material-mgmt-actions.ts](../../src/features/material-archive/hooks/use-material-mgmt-actions.ts) | confirm × 1 |
| [src/features/org-personnel/tabs/attendance-devices.tsx](../../src/features/org-personnel/tabs/attendance-devices.tsx) | confirm × 1 |
| [src/features/product-structure/components/bom-mgmt/bom-table.tsx](../../src/features/product-structure/components/bom-mgmt/bom-table.tsx) | confirm × 1 |
| [src/features/product-structure/tabs/bom-mgmt.tsx](../../src/features/product-structure/tabs/bom-mgmt.tsx) | confirm × 1、prompt × 1 |
| [src/features/production-outsourcing/orders/index.tsx](../../src/features/production-outsourcing/orders/index.tsx) | confirm × 2 |
| [src/features/production-outsourcing/partners/index.tsx](../../src/features/production-outsourcing/partners/index.tsx) | confirm × 1 |
| [src/features/production-shared/tabs/line-mindmap/index.tsx](../../src/features/production-shared/tabs/line-mindmap/index.tsx) | confirm × 1 |
| [src/features/production-shared/tabs/production-route/index.tsx](../../src/features/production-shared/tabs/production-route/index.tsx) | confirm × 1 |
| [src/features/production-shared/tabs/topology-template/components/template-card.tsx](../../src/features/production-shared/tabs/topology-template/components/template-card.tsx) | prompt × 1 |
| [src/features/purchase/orders/components/purchase-order-list.tsx](../../src/features/purchase/orders/components/purchase-order-list.tsx) | confirm × 1 |
| [src/features/purchase/suppliers/components/supplier-list.tsx](../../src/features/purchase/suppliers/components/supplier-list.tsx) | confirm × 1 |
| [src/features/quotes/hooks/use-quote-transfer-handler.ts](../../src/features/quotes/hooks/use-quote-transfer-handler.ts) | alert × 2 |
| [src/features/shared/team/team-management-view.tsx](../../src/features/shared/team/team-management-view.tsx) | confirm × 1 |
| [src/features/trading/components/customer-list.tsx](../../src/features/trading/components/customer-list.tsx) | confirm × 1 |
| [src/features/trading/components/parts/sales-order-detail-header.tsx](../../src/features/trading/components/parts/sales-order-detail-header.tsx) | confirm × 1 |
| [src/features/trading/hooks/use-sales-order-detail-activity.ts](../../src/features/trading/hooks/use-sales-order-detail-activity.ts) | confirm × 1 |
| [src/features/warehouse/hooks/warehouse-ui-feedback.ts](../../src/features/warehouse/hooks/warehouse-ui-feedback.ts) | confirm × 1 |
| [src/features/warehouse/shipment/hooks/shipment-ui-feedback.ts](../../src/features/warehouse/shipment/hooks/shipment-ui-feedback.ts) | confirm × 1 |
| [src/hooks/use-protected-action.ts](../../src/hooks/use-protected-action.ts) | confirm × 1 |

## 验证记录

- TypeScript 项目检查通过。
- Vite 生产构建通过；输出包含既有的 Excel 查看器导入与大分包提示。
- 修改文件的 Prettier 检查通过；ESLint 无错误，保留分类、设备、考勤及 BOM 等组件既有的 Hook 依赖警告。
- 修正后 32 个布局场景通过，覆盖 320×568、393×851、412×915、915×412 触屏横屏、393×300 短视口及上下／左右系统安全区。首轮检查覆盖 112 个场景；发现嵌套设备删除确认框定位偏移后，将根节点的 scale: 1 改为 scale: none，修正滚动后的固定定位参照。长确认框、表单及抽屉的底部按钮可滚动到达并通过点击可达性检查。
- 提取现有源码中的 138 组不同根节点尺寸工具类，在浏览器中逐项投射验证，全部遵守移动端统一矩形；8 类桌面弹窗在启用／移除数据标记后，位置与尺寸一致。
- Chromium 移动设备模拟通过原生 CDP 小视口差值覆盖，得到 100vh / 100dvh ≈ 851.10px、100svh ≈ 755.10px。弹窗实际高度约 749.10px，顶边 3px，底边约 752.10px，证明尺寸实际跟随较小的 svh，而非仅检查属性名称。
- 系统安全区使用 CDP 覆盖浏览器原生 env() 值验证，包括 top=24px / bottom=28px 和横屏 left=32px / right=20px / bottom=24px；尺寸在安全区基础上继续保留每侧 3px。
- 二次复核直接渲染真实业务组件的 16 个状态，在 320×640、412×915、844×390 触屏横屏和 393×300 短内容视口中完成 64 个场景。逐项检查安全矩形、横向输入框／按钮边界、可滚动内容末尾及隐藏溢出；全部通过。这些状态涉及报价、资产分类、车辆照片、脑图、物料规则、台账搜索、BOM 预警、装箱、MRP、打印、库存阈值、绑定历史、预浸料、用户权限及台账正常／错误状态。
- 原生对话框迁移另完成 15 个浏览器场景，覆盖 3 种手机视口中的确认取消、确认接受、输入取消、输入接受和提示关闭。验证长说明的按钮点击、默认输入值、返回值、父弹窗保留和焦点恢复；全部通过。材料选择浮层另通过 2 个小屏宽度场景。
- 请求队列、取消阻断、默认输入、空字符串、Escape、焦点恢复、重复响应保护和真实外观删除业务回归共 11 个测试通过。
- 二次修改后重新执行 138 组既有根节点工具类覆盖、8 类桌面尺寸及 Pixel 小视口差值检查，全部通过。TypeScript 项目检查与 Vite 生产构建通过。
- 三次复核补测 13 个真实组件状态：CAD、PDF、Excel 失败、Excel 双工作表已加载、辐条图片／PDF、出库已加载、受控协议、人员导入初始／预览、人员新建、产线选择、BOM 新建基本信息。4 种移动视口共 52 个场景及 1440×1000 桌面的 13 个场景通过安全区矩形、长标题、横向控件、隐藏裁切和内容末尾可达性检查。移动视口沿用 320×640、412×915、844×390 和 393×300，配合原生 safe-area 与 96px 小视口差值覆盖。
- 人员预览通过实际文件选择操作触发、API 响应使用本地数据；Excel 使用本地生成的 2 个工作表，每表 60 行 × 10 列，实际切换第二工作表并检查末尾单元格。未执行人员导入提交或其他业务保存。CAD 验证的是项目既有模拟加载分支，不代表 Autodesk SDK 或真实模型渲染验证。
- 三次修改的 TypeScript、生产构建、格式检查与差异空白检查通过；ESLint 无错误，保留 CAD 查看器既有的 viewer Hook 依赖警告。
- 本地隔离验证页面、逐项清单、测量数据与截图保存于忽略提交的 output/playwright/mobile-floating-surface-viewport-and-safe-area-audit/。

本清单覆盖当前源码入口；浏览器验证包含公共布局、自定义浮层、上述真实业务组件及统一确认／输入／提示宿主，不表示逐一执行过全部业务保存流程。短内容视口验证不能替代真实软键盘。Pixel / iPhone 实机地址栏、软键盘与系统手势交互仍需实机复核。
