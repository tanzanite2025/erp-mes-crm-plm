# 变更记录与验证（walkthrough.md）

## 2026-04-10 产品工程“产品属性配置”TAB 实施

### 变更概述
- 本轮按已批准方案执行，在 `产品工程管理` 下新增一个与 `产品管理` 同级的 `产品属性配置` TAB。
- 该 TAB 的边界严格限制为**工程域自有产品属性配置**，本轮只纳入：
  - `techSeries`
  - `tireType`
  - `brakeType`
  - `versionLevel`
- 明确**不纳入**：
  - `engineeringSpecId`
  - `moldGroup`
  - `templateKey`
- 本轮目标不是重建公共字典，而是为工程模块补齐自己的产品属性元数据维护入口。

### 实际改动

#### 1. 新增工程域产品属性配置后端主数据链
- 新增 `server/models/product_attribute_option.go`
  - 建立 `product_attribute_options` 实体，承载产品属性分类、值、显示名称、排序、启用状态等字段。
- 新增 `server/services/product_attribute_option_service.go`
  - 提供产品属性项列表、创建、更新、删除能力。
- 新增 `server/handlers/product_attribute_option.go`
  - 暴露工程域产品属性配置的 HTTP handler。
- 更新 `server/routes/routes.go`
  - 新增：
    - `GET /engineering/product-attribute-options`
    - `POST /engineering/product-attribute-options`
    - `DELETE /engineering/product-attribute-options/:id`
- 更新 `server/db/db.go`
  - 将 `ProductAttributeOption` 接入 `AutoMigrate`。

#### 2. 新增前端“产品属性配置”TAB 与页面
- 更新 `src/features/engineering/tab-config.ts`
  - 新增 `product-attributes` 同级 TAB。
- 新增 `src/routes/_authenticated/engineering/product-attributes.lazy.tsx`
  - 建立新 TAB 的路由入口。
- 新增 `src/features/engineering/tabs/product-attributes-mgmt.tsx`
  - 提供产品属性项的列表、筛选、新增、编辑、删除界面。
- 新增 `src/features/engineering/services/product-attribute-option-service.ts`
  - 提供前端对 `product-attribute-options` 接口的读取与保存能力。

#### 3. 将产品表单切换到新属性配置数据链
- 更新 `src/features/engineering/data/schema.ts`
  - 新增 `ProductAttributeCategory` 与 `ProductAttributeOption` 前端类型定义。
- 更新 `src/features/engineering/hooks/use-product-form-init.ts`
  - 将 `techSeries`、`tireType`、`brakeType`、`versionLevel` 的选项来源，从前端本地常量切换为 `ProductAttributeOptionService.getProductAttributeOptions()`。
  - 保留兼容兜底：当新主数据表尚未初始化时，暂时回退到既有本地常量，避免产品表单因空配置完全失效。

#### 4. 更新工程模块文案
- 更新 `src/locales/messages/zh-CN/engineering.ts`
  - 新增 `engineering.tabs.productAttributes` 中文文案。
- 更新 `src/locales/messages/en-US/engineering.ts`
  - 新增 `engineering.tabs.productAttributes` 英文文案。

### 本轮效果
- `产品工程管理` 现在拥有了自己的 `产品属性配置` TAB，不再依赖前端硬编码来长期维护产品属性下拉项。
- `新增型号` 表单的以下字段已经切到工程域自己的属性配置链：
  - `techSeries`
  - `tireType`
  - `brakeType`
  - `versionLevel`
- 模具、规格、资产等其他域的数据仍保持各自所有权，未被混入该 TAB。

### 当前说明
- 由于本轮重点是先打通工程域主链，`product-meta-options.ts` 暂时保留为兼容兜底来源，后续在完成初始数据导入后可再评估是否彻底移除。
- 本轮尚未在文档中附加截图；待你在界面侧确认展示和联动后，可补录截图或录屏。

### 首批默认数据初始化（追加）
- 本轮继续为 `product_attribute_options` 增加首批默认数据初始化，覆盖以下 4 类工程域产品属性：
  - `techSeries`
  - `tireType`
  - `brakeType`
  - `versionLevel`
- 初始化策略采用“缺失即补”的幂等方式：
  - 启动时检查 `category + value`
  - 若不存在则插入默认项
  - 若已存在则保持现状，不覆盖用户后续在新 TAB 中的人工维护
- 默认数据当前包括：
  - `techSeries`: `NORMAL`, `HIGHTG`
  - `tireType`: `Hooked`, `Hookless`, `Tubular`
  - `brakeType`: `Disc`
  - `versionLevel`: `STD`, `Lightweight`, `Ultralight`, `Reinforced`

### 追加改动
- 更新 `server/db/db.go`
  - 新增产品属性默认数据定义与 `ensureDefaultProductAttributeOptions()`
  - 在后端启动初始化阶段执行幂等补齐
- 更新 `task.md`
  - 记录产品属性首批默认数据初始化执行项
- 更新 `implementation_plan.md`
  - 记录默认数据初始化策略与边界

### 追加验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 方向 B 重构（追加）
- 根据追加确认，本轮已将原“固定四类槽位 + 动态值”的过渡实现升级为方向 B：**分类定义 + 分类项定义**。
- 当前语义调整为：
  - 分类名由你维护
  - 分类项归属于分类
  - 界面显示使用中英文名称
  - `techSeries / tireType / brakeType / versionLevel` 仅保留为内部 key 与现有产品表单消费位的锚点

#### 方向 B 后端改动
- 新增 `server/models/product_attribute_category.go`
  - 建立 `product_attribute_categories` 模型，用于承载分类定义。
- 更新 `server/models/product_attribute_option.go`
  - 将属性项调整为以 `categoryKey` 归属分类。
  - 中文显示名字段切换为 `labelZh`。
- 新增 `server/services/product_attribute_category_service.go`
  - 提供分类定义的列表、创建、更新、删除能力。
- 新增 `server/handlers/product_attribute_category.go`
  - 提供分类定义接口入口。
- 更新 `server/routes/routes.go`
  - 新增：
    - `GET /engineering/product-attribute-categories`
    - `POST /engineering/product-attribute-categories`
    - `DELETE /engineering/product-attribute-categories/:id`
- 更新 `server/db/db.go`
  - 接入 `ProductAttributeCategory` 的 `AutoMigrate`
  - 启动时幂等初始化默认分类定义与默认分类项

#### 方向 B 前端改动
- 更新 `src/features/engineering/data/schema.ts`
  - 将 `ProductAttributeCategory` 升级为分类定义对象
  - 将 `ProductAttributeOption` 升级为使用 `categoryKey / labelZh`
  - 保留 `KnownProductAttributeCategoryKey` 作为现有四个消费位的内部锚点类型
- 新增 `src/features/engineering/services/product-attribute-category-service.ts`
  - 前端分类定义服务
- 更新 `src/features/engineering/services/product-attribute-option-service.ts`
  - 改为按 `categoryKey` 查询分类项
- 更新 `src/features/engineering/tabs/product-attributes-mgmt.tsx`
  - 页面改为两层结构：
    - 分类定义管理
    - 当前分类下分类项管理
  - 页面不再把技术 key 当作最终业务分类名显示
- 更新 `src/features/engineering/hooks/use-product-form-init.ts`
  - 产品表单继续读取现有四个消费位，但读取链已对齐为 `categoryKey / labelZh`

#### 当前效果
- 产品属性配置页现在支持：
  - 自定义分类名
  - 自定义分类项
  - 中英文名称分别维护
- 产品表单仍能兼容当前四个既有产品属性字段：
  - `techSeries`
  - `tireType`
  - `brakeType`
  - `versionLevel`
- 这样既满足“分类可配置”，又避免一次性把产品表单扩展到任意新字段自动生成，控制了本轮改造边界。

#### 方向 B 验证
- 执行：
```bash
pnpm exec tsc --noEmit --pretty false
cd server && go test ./...
```
- 结果：通过。

#### 产品属性配置页样式对齐（追加）
- 根据追加反馈，本轮继续对 `src/features/engineering/tabs/product-attributes-mgmt.tsx` 做了**仅视觉层**的样式回归，不改动任何业务逻辑。
- 本轮主要调整：
  - 将页面头部改为与工程模块一致的标题信息块风格
  - 将分类统计卡改为更接近系统统一的边框、底色、字号与强调色体系
  - 将“分类定义 / 分类项定义”两个区域切换为统一卡片容器结构
  - 对齐表头、按钮、间距与操作区的视觉语言
- 本轮明确未改动：
  - 分类定义与分类项定义的数据模型
  - 前后端接口
  - 字段命名
  - 页面交互语义与操作流程

#### 样式对齐验证
- 执行：
```bash
pnpm exec tsc --noEmit --pretty false
```
- 结果：通过。

#### 产品属性配置页样式纠偏（二次追加）
- 根据界面复核结果，本轮继续对 `src/features/engineering/tabs/product-attributes-mgmt.tsx` 做了第二轮样式纠偏，重点修正“已对齐但仍显突兀”的问题。
- 本轮主要修正：
  - 降低“分类定义 / 分类项定义”区块标题的视觉层级，避免强于页面主页眉
  - 将区块头部的主操作按钮从过强的强调样式调整为更接近系统默认按钮语言
  - 将两个弹窗的标题区、输入框、下拉框、说明区和底部按钮统一到工程模块现有弹窗风格
- 本轮仍然未改动：
  - 数据模型
  - 前后端接口
  - 字段语义
  - 页面交互逻辑

#### 二次纠偏验证
- 执行：
```bash
pnpm exec tsc --noEmit --pretty false
```
- 结果：通过。

#### 产品属性配置页字体基线对齐（继续追加）
- 针对界面复核中“看起来几乎没有变化”的反馈，本轮重新读取工程模块现有页面的真实字体基线，重点对比了页眉标题、描述文案、区块标题与 `italic` 用法。
- 本轮确认并对齐的基线：
  - 页眉标题采用 `font-black + tracking-tighter + italic`，并保留响应式字号层级
  - 页眉描述采用更小的辅助字号与 `uppercase + tracking-widest`
  - 区块标题采用与系统一致的 `text-sm + font-black + italic`
  - 区块副标题与主按钮文案统一为小字号大写辅助风格
- 本轮效果：
  - “产品属性配置”页眉与工程模块现有页眉的视觉张力重新对齐
  - “分类定义 / 分类项定义”不再停留在普通正文级标题样式，而是切回系统区块标题风格
  - 区块说明文案与按钮文案的字体层级明显收敛到系统现有页面基线

#### 字体基线对齐验证
- 执行：
```bash
pnpm exec tsc --noEmit --pretty false
```
- 结果：通过。

#### 产品属性配置页空状态提示对齐（继续追加）
- 继续补齐表格空状态提示的字体层级，对以下文案完成样式统一：
  - `暂无分类定义`
  - `当前分类下暂无分类项`
- 处理方式：将两处空状态提示统一切换为工程模块常见的辅助文案风格，即小字号、粗体、大写字距和较弱前景色，而不再使用默认正文文本样式。

#### 空状态提示验证
- 执行：
```bash
pnpm exec tsc --noEmit --pretty false
```
- 结果：通过。

## 2026-04-10 字典系统残留第一批最小清理

### 变更概述
- 本轮按已批准的方案 A 执行，但严格限制在**最小清理**范围：
  - 清理参数字典的前端死文案与 overrides 残留
  - 不进入业务模块改造
  - **明确排除 `UNIT / 单位管理`**，避免与全局例外边界混淆

### 核查结论

#### 1. `UNIT / 单位管理` 已确认是独立链路，不属于本轮退场对象
- 当前 `UNIT` 前端通过 `src/features/basic-settings/services/unit-service.ts` 读取 `/basic/units`。
- `trading`、`material-archive`、`basic-settings` 等模块仍直接依赖 `unitService.getUnits()`。
- 因此本轮不对 `UNIT` 的代码、路由、接口和文案做退场处理。

#### 2. 参数字典运行主链已基本退场
- `basic-settings` 当前实际 tabs 仅包含：
  - `dm-numbering`
  - `linear-barcode`
  - `units`
  - `sequences`
  - `enterprise`
  - `security`
- 当前路由 `src/routes/_authenticated/basic-settings/*` 中也不存在 `dictionary` 子路由。
- 本轮未检出前端业务主链对 `/dictionary/*` 的直接消费。

#### 3. 当前残留主要收敛为壳层残留
- 本轮确认的主要残留为：
  - locale 中的 `dictionary` / `dictionaryActions` 文案
  - `basic-settings` overrides 中的废弃 `dictionary` 覆盖块
  - 零引用静态数据文件：`src/data/data-dictionary.ts`、`src/types/data-dict.ts`
  - 废弃脚本：`server/scripts/check_dict.go`

### 实际清理

#### 1. 清理 `basicSettings` locale 中的参数字典死文案
- 更新 `src/locales/messages/zh-CN/basicSettings.ts`
  - 删除 `tabs.dictionary`
  - 删除 `dictionaryActions`
- 更新 `src/locales/messages/en-US/basicSettings.ts`
  - 删除 `tabs.dictionary`
  - 删除 `dictionaryActions`

#### 2. 清理 `commandMenu` locale 中的参数字典残留入口文案
- 更新 `src/locales/messages/zh-CN/commandMenu.ts`
  - 删除 `items.dictionary`
- 更新 `src/locales/messages/en-US/commandMenu.ts`
  - 删除 `items.dictionary`

#### 3. 清理 `basic-settings` overrides 中废弃的 `dictionary` 覆盖块
- 更新 `src/locales/overrides/basic-settings.zh-CN.ts`
  - 删除 `basicSettings.dictionary`
- 更新 `src/locales/overrides/basic-settings.en-US.ts`
  - 删除 `basicSettings.dictionary`

#### 4. 物理删除零引用残留文件
- 已删除：
  - `src/data/data-dictionary.ts`
  - `src/types/data-dict.ts`
  - `server/scripts/check_dict.go`

### 验证
- 执行代码检索确认：
  - `dictionaryActions`
  - `commandMenu.items.dictionary`
  - `basicSettings.tabs.dictionary`
  - `Parameter Dictionary` / `参数字典` / `Dictionary Atomic Center`
  均未再检出剩余引用。
- 执行零引用核查确认：
  - `initialDataDictionary` / `DataDictionaryItem` / `check_dict` 未再检出有效代码引用
  - `src/data/data-dictionary.ts`、`src/types/data-dict.ts`、`server/scripts/check_dict.go` 已不存在于仓库中

### 本轮结论
- 参数字典在前端可见层面的残留主链已进一步清空。
- 当前项目状态更接近：
  - `UNIT` 独立保留
  - 参数字典主体已退场
  - 零引用死文件与废弃脚本已完成物理删除

## 2026-04-09 `WAREHOUSE_CATEGORY` 报错修复：仓库分类单源漂移

### 变更概述
- 本轮不是补一个新的系统字典 entry，而是排查并修复 `WAREHOUSE_CATEGORY` 报错背后的**单源漂移**。
- 初始现象是前端在以下调用点执行 `DictionaryCoreService.getOptions('WAREHOUSE_CATEGORY')` 时抛出 critical error：
  - `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
  - `src/features/warehouse/tabs/product-inbound.tsx`
  - `src/features/trading/components/purchase/purchase-receipt-confirm-dialog.tsx`

### 根因确认

#### 1. `WAREHOUSE_CATEGORY` 不是当前仓库分类的权威事实源
- 继续向下排查后确认：仓库分类在项目里本来就有正式业务主数据链路：
  - 模型：`server/models/warehouse.go` 中 `WarehouseCategory`
  - 预置：`DefaultWarehouseCategories`
  - 接口：`GET /warehouse/categories`
  - handler：`server/handlers/warehouse_category.go`
- 这说明仓库分类的权威来源本来就是 `warehouse_categories` 业务实体，而不是字典系统。

#### 2. 报错本质是前端接错单源
- 本轮最终确认，问题不是“后端漏 seed 了一个必须存在的字典 entry”。
- 真正的问题是：部分仓储/采购收货页面把仓库分类误接到了 `DictionaryCoreService`，导致一旦字典系统里不存在 `WAREHOUSE_CATEGORY`，前端就直接 fail loudly。

### 实际修复

#### 1. 在仓库分类核心服务中补统一 options 出口
- 更新 `src/features/warehouse/services/warehouse-category-core-service.ts`
- 新增：
  - `WarehouseCategoryOption`
  - `getCategoryOptions()`
- 处理方式：
  - 读取 `/warehouse/categories`
  - 过滤 `active` 分类
  - 映射为 `{ value: code, label: name }`

#### 2. 将误接字典系统的调用面切回业务主数据
- 更新 `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
  - 改为通过 `WarehouseCategoryCoreService.getCategoryOptions()` 加载出货页分类选项
- 更新 `src/features/warehouse/tabs/product-inbound.tsx`
  - 改为通过 `WarehouseCategoryCoreService.getCategoryOptions()` 加载入库页分类选项
- 更新 `src/features/trading/components/purchase/purchase-receipt-confirm-dialog.tsx`
  - 删除 `DictionaryCoreService` 依赖
  - 改为通过 `WarehouseCategoryCoreService.getCategoryOptions()` 异步加载采购收货目标仓库分类

### 本轮效果
- 仓库分类相关页面不再依赖一个并不存在的 `WAREHOUSE_CATEGORY` 字典 entry。
- 仓储与采购收货流程重新对齐到 `warehouse_categories` 这一真实业务主数据单源。
- `DictionaryCoreService` 的 fail-loudly 行为被保留，用于继续暴露真正的错误接线，而不是被静默吞掉。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `WAREHOUSE_CATEGORY` 报错已完成根因修复。
- 最终修复方向不是“补字典”，而是“纠正错误单源”。
- 后续若再遇到类似“页面把业务主数据当字典读取”的问题，应优先检查是否存在主数据单源漂移，而不是先在字典系统中补重复定义。

## 2026-04-09 `sales_orders PATCH` 历史残留清理

### 变更概述
- 本轮不是新增功能，而是针对 `sales-order PATCH hard-cut` 之后的历史残留做专项核查与清理确认。
- 本轮范围严格限制在：
  - `server/handlers/sales_orders.go`
  - `server/services/sales_*` 最小相关调用面
  - 路由注册与最小编译面

### 核查结果

#### 1. 公开 PATCH 路由未回潮
- 核查 `routes/routing_trading.go`（实际注册文件为 `routes/routes_trading.go`）后确认：
  - `sales-order` 当前仅暴露 `GET / POST / POST transactions / DELETE`
  - **不存在** `PATCH /sales-orders/:id`

#### 2. 旧 PATCH DTO / mapper 残留已清空
- 核查后确认已不存在以下旧残留：
  - `PatchSalesOrderRequest`
  - `MapPatchSalesOrderRequestToModel`
  - 旧 `PATCH /sales-orders` 相关引用
- 说明此前 hard-cut 后的直接旧引用已不再留存在代码中。

#### 3. 当前保留的是“内部 command 边界”，不是历史残留
- 当前 `sales_order_command_service.go` 中保留的：
  - `PatchSalesOrderCommand`
  - `BuildSalesOrderSavePayload(...)`
- 这些并非旧 PATCH 路由的残留，而是第四段明确建立的**内部对称 command 抽象**，用于统一 `sales / purchase` 的写入组织方式。
- 因此，本轮不再对这部分做删除性修改，避免误伤当前有效边界。

### 本轮处理结论
- 本轮专项核查的实际结论是：
  - **旧 PATCH 残留已基本清空**
  - **公开 PATCH 路由未恢复**
  - **当前保留的是应当保留的内部 command 能力**
- 因而本轮不进行额外的业务代码删除，而是通过验证与记录将边界正式固定，避免后续误判“内部 command 抽象 = PATCH 回潮”。

### 验证
执行：
```bash
go test ./handlers -run "Sales|Trading" -count=1
go test ./services -run "Sales|Trading" -count=1
```

结果：通过。

### 本轮结论
- `sales_orders PATCH` 历史残留专项已完成。
- 当前 `sales-order` 的边界已明确固定：
  - 保留内部 command 组织能力
  - 不恢复公开 `PATCH /sales-orders/:id`
- 后续若再审视该处，不应再把当前内部 command 抽象误判为 hard-cut 失败或旧 PATCH 回潮。

## 2026-04-10 产品属性纯动态化主链收口

### 变更概述
- 本轮继续按已确认方向推进，将产品属性主链从固定字段消费切到 `ProductType -> 属性分类绑定 -> Product.attributeValues[]` 的纯动态模型。
- 本轮重点不再是补模型骨架，而是完成前后端主消费链收口，确保产品新建、编辑、展示与摘要读取都优先走动态属性值。

### 实际改动

#### 1. 后端动态属性链已纳入产品主服务
- 已通过新增模型与服务，将以下关系接入后端主链：
  - `ProductTypeAttributeBinding`
  - `ProductAttributeValue`
- 产品保存、查询、列表与批量同步已统一支持 `attributeValues[]` 的写入、替换与回显。
- 路由、handler、service、AutoMigrate 已接通，产品类型可绑定属性分类，产品实例可动态保存分类值。

#### 2. 前端产品表单已切换为按产品类型动态渲染属性区
- 更新产品表单初始化链：
  - 按 `typeId` 动态加载属性分类、属性项、绑定关系
  - 切换产品类型时刷新绑定结果
  - 编辑场景按 `attributeValues[]` 回显动态属性值
- 新增并接入 `DynamicAttributeSection`：
  - 按绑定顺序渲染动态分类下拉
  - 写入时仅更新 `attributeValues`，避免整表 `reset` 带来的状态抖动

#### 3. 前端旧固定字段主消费面已替换为动态摘要读取
- 以下主消费位已改为从 `attributeValues[]` 派生读取，而不是直接读取固定字段：
  - `product-action-dialog`
  - `use-product-form`
  - `use-product-form-init`
  - `product-form-utils`
  - `product-core-service`
  - `product-utils`
  - `engineering-sidebar`
  - `use-product-columns`
  - `rim-spec` 概览区与版本矩阵联动
- `versionLevel` 现已作为动态分类值参与 SKU 派生与多版本批量构建，不再作为主链固定事实字段写入。

#### 4. 默认草稿与展示摘要已对齐动态承载
- 产品默认草稿已补齐 `attributeValues: []`。
- 展示摘要统一通过 `getProductAttributeSummary()` 从动态属性值派生：
  - `series`
  - `brake`
  - `version`
  - `tireType`

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- 产品属性前后端主链已完成纯动态化收口。
- 当前保留在 schema 中的固定字段仅作为过渡兼容壳层存在，不再作为产品属性主链事实来源。
- 后续若继续收尾，可再单独评估：
  - schema 层固定字段的最终退场
  - 旧数据迁移脚本/补录策略的进一步显式化

## 2026-04-10 产品属性兼容壳层与无效锚点清理

### 变更概述
- 在完成产品属性纯动态化主链后，本轮继续清理会制造歧义的历史兼容层，目标是避免后续把旧固定字段误认成正式模型。
- 本轮只清理“已经无业务价值的壳层”，同时保留仍需存在的动态分类内部编码，并收敛其表达方式。

### 实际改动

#### 1. 删除前端 schema 中无效的固定属性字段壳层
- 更新 `src/features/engineering/data/schema.ts`
- 已删除 `Product` schema 中以下固定字段定义：
  - `tireType`
  - `brakeType`
  - `techSeries`
  - `versionLevel`
- 这些字段已不再作为产品属性主链事实来源，保留只会继续制造“固定字段仍有效”的误解。

#### 2. 删除未使用的分类 key 类型壳层
- 更新 `src/features/engineering/data/schema.ts`
- 已删除未再使用的：
  - `knownProductAttributeCategoryKeySchema`
  - `KnownProductAttributeCategoryKey`

#### 3. 将仍需存在的分类 key 收敛为动态分类内部编码常量
- 更新 `src/features/engineering/utils/product-attribute-utils.ts`
- 新增 `PRODUCT_ATTRIBUTE_CATEGORY_KEYS`，集中承载当前仍需使用的动态分类内部编码：
  - `series -> techSeries`
  - `tireType -> tireType`
  - `brake -> brakeType`
  - `version -> versionLevel`
- 同步将以下消费位改为引用该常量，而不是继续散落硬编码字符串：
  - `use-product-form-init.ts`
  - `product-form-utils.ts`
  - `product-action-dialog.tsx`
  - `product-attribute-utils.ts`

#### 4. 收敛版本矩阵 props 语义，避免继续表现为固定字段
- 更新 `src/features/engineering/components/specs/rim-spec.tsx`
- 更新 `src/features/engineering/components/product-action-dialog.tsx`
- 将 `SpecComponent` 传入的版本选项 props 从：
  - `versionLevel`
  收敛为：
  - `versionCategoryOptions`
- 这样版本矩阵仍能消费“版本分类”这一动态分类，但不再表现得像固定产品字段。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- 无业务价值的固定字段壳层已从前端 schema 中清理。
- 仍需保留的 `techSeries / tireType / brakeType / versionLevel` 现已被收敛为动态分类内部编码，而不是固定产品字段语义。
- 当前动态产品属性主链的表达更加单一，后续歧义成本明显降低。

## 2026-04-10 产品弹窗模板解析失败显式报错修复

### 变更概述
- 在模板主链收敛为 `ProductType.templateId -> ProductTemplate.componentKey` 后，本轮继续补齐错误暴露能力。
- 目标是禁止产品弹窗在模板解析异常时静默退化为“模板待定”，要求界面直接暴露错误并阻断提交。

### 实际改动

#### 1. 为模板解析新增专属错误状态
- 更新 `src/features/engineering/components/product-action-dialog.tsx`
- 新增 `templateResolveError` 状态，用于承载模板绑定解析失败信息。

#### 2. 将模板解析改为显式失败路径
- 更新 `src/features/engineering/components/product-action-dialog.tsx`
- 对 `getEffectiveTemplate()` 增加显式 `try/catch`。
- 现在会区分以下场景：
  - 未选择产品类型：清空模板状态，不报错
  - 选中的产品类型在当前上下文不存在：显式报错
  - 产品类型未绑定模板：按正常“无模板”路径处理，不报错
  - 产品类型绑定了模板，但模板无法解析：显式报错
  - 模板接口请求异常：显式报错

#### 3. 在界面中高亮展示模板链路错误
- 更新 `src/features/engineering/components/product-action-dialog.tsx`
- 新增红色错误提示块：
  - 标题：`Template Binding Broken`
  - 内容直接展示模板解析失败原因
  - 提示用户修复产品类型模板绑定或同步后端模板接口版本

#### 4. 模板解析失败时阻断提交
- 更新 `src/features/engineering/components/product-action-dialog.tsx`
- 提交按钮禁用条件从只依赖 `metadataInitError`，扩展为：
  - `metadataInitError || templateResolveError`
- 这样模板链路异常时，用户无法继续提交产品数据。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- 产品弹窗在模板解析失败时已不再静默掩盖问题。
- 用户现在可以直接看到模板链路哪里出错。
- 模板异常状态下的保存提交已被阻断。

## 2026-04-10 BOM 主链漏洞修复与 MRP / 采购影响面收口

### 变更概述
- 本轮目标不是扩展 BOM 功能，而是优先修复会直接污染 MRP / 采购需求的主链漏洞。
- 修复范围聚焦：
  - BOM 列表前后端协议对齐
  - BOM 编辑保存链闭环
  - BOM 唯一有效版本约束
  - `standardUsage` 后端权威化
  - MRP 禁止在多个 active BOM 时静默选取第一个
  - 删除唯一 active BOM 的保护

### 实际改动

#### 1. 对齐 BOM 列表读取协议
- 更新 `src/features/engineering/services/bom-service.ts`
- 将 `getBOMs()` 改为显式解析分页响应的 `items` 字段，而不是把 `/engineering/bom` 响应误当作 `BOM[]`。

#### 2. 统一 BOM 编辑保存链到现有 POST Save
- 更新：
  - `src/features/engineering/services/bom-service.ts`
  - `src/features/engineering/hooks/use-bom-data.ts`
  - `src/features/engineering/components/bom-action-dialog.tsx`
  - `src/features/engineering/hooks/use-bom-form.ts`
- 移除了前端对未落地 `PATCH /engineering/bom/:id` 主链的依赖。
- BOM 编辑和新建现在统一走 `POST /engineering/bom`，确保编辑可真实落库。

#### 3. 收紧 BOM 表单类型链
- 更新：
  - `src/features/engineering/components/bom-action-dialog.tsx`
  - `src/features/engineering/hooks/use-bom-form.ts`
- 收敛 `initialItems` 类型。
- 去掉已无实际用途的 `deltaTracker` 依赖。
- 改用显式 `UseFormReturn<BOM>` 与 `Resolver<BOM>`，并将 `selectedProductId` 切到 `useWatch()`，避免空 `watch()` 副作用警告。

#### 4. 将 `standardUsage` 收回后端权威计算
- 更新 `server/services/engineering_master_service.go`
- 新增 `normalizeBOMItems()`。
- 在 `SaveBOM()` 内统一按：

`standardUsage = unitUsage * (1 + wastagePercent / 100)`

进行权威重算，防止 BOM 核心用量继续由前端事实化。

#### 5. 增加同产品唯一 active BOM 约束
- 更新 `server/services/engineering_master_service.go`
- 新增 `validateUniqueActiveBOM()`。
- 当同一 `productId` 下已存在另一份 `active` BOM 时，保存直接返回冲突错误。

#### 6. 删除唯一 active BOM 时显式阻断
- 更新：
  - `server/services/engineering_master_service.go`
  - `server/handlers/bom.go`
- 删除前会校验该 BOM 是否为当前产品唯一的 `active` BOM。
- 若是唯一有效 BOM，则返回 `409` 冲突并标记为 `LOCKED_ASSET`，避免破坏下游需求链。

#### 7. MRP 不再静默选取“第一个 active BOM”
- 更新 `server/services/mrp_requirements.go`
- 新增 `buildActiveBOMIndex()`。
- 当同一产品出现多个 `active` BOM 时，MRP 直接返回显式错误，而不是依赖数据库返回顺序静默命中。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- BOM 列表读取协议已与前端消费方式对齐。
- BOM 编辑保存链已闭环，不再依赖未实现的 patch 路由。
- `standardUsage` 已改由后端统一重算。
- 同产品多个 active BOM 会在保存或 MRP 计算阶段被显式拦截。
- 删除唯一 active BOM 已被阻断，减少对采购 / MRP 下游的破坏面。

## 2026-04-10 BOM 第二轮治理：编号、导入边界与版本字段语义收紧

### 变更概述
- 本轮是在 BOM 主链 P0 / P1 收口后继续推进的 P2 治理。
- 目标不是扩展 BOM 功能，而是进一步收紧以下边界：
  - `bomNo` 权威来源
  - BOM 导入对物料主数据的副作用
  - BOM 表单中业务版本与修订号的默认语义

### 实际改动

#### 1. `bomNo` 改由后端权威生成
- 更新：
  - `server/services/engineering_master_service.go`
  - `src/features/engineering/hooks/use-bom-form.ts`
  - `src/features/engineering/data/schema.ts`
- 新增 `generateBOMNo()`，新建 BOM 时若未传 `bomNo`，由后端统一按日期序列生成。
- 前端新建 BOM 不再随机拼接编号，只接收后端返回的正式编号。

#### 2. 收紧 BOM 导入自动建料边界
- 更新 `src/features/engineering/hooks/use-bom-data.ts`
- 当 Excel 中解析出物料主数据行时，当前流程不再静默调用物料保存服务。
- 现在会：
  - 记录英文错误日志
  - 直接阻断导入
  - 给出中文错误提示，要求先到物料档案中显式维护这些物料后再导入 BOM

#### 3. 收敛 BOM 业务版本与修订号默认语义
- 更新 `src/features/engineering/hooks/use-bom-form.ts`
- `bomVersion` 继续作为 BOM 业务版本显示字段，默认 `V1.0`。
- `revisionNo` 默认改回 `R1`，不再与 `bomVersion` 混用。
- 编辑态若后端未返回修订号，也不再回退为 `bomVersion`，避免语义串线。

#### 4. 放宽创建态对 `bomNo` 的前端校验
- 更新 `src/features/engineering/data/schema.ts`
- `bomNo` 在创建态允许为空，由后端生成并返回。
- 避免前端因缺少本地随机编号而阻止新建流程。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- 新建 BOM 的编号来源已经收回后端。
- BOM 导入不会再静默污染物料主数据。
- `bomVersion` 与 `revisionNo` 的默认语义比上一轮更清晰。
- 本轮治理未破坏现有前后端主链与测试结果。

## 2026-04-10 BOM 相关链路治理：列表 / 详情 / 预览 / 打印 / DTO 口径收口

### 变更概述
- 本轮目标不是继续扩展 BOM 功能，而是治理 BOM 周边链路的一致性问题。
- 重点收口：
  - 后端 BOM 返回的事实字段完整度
  - 列表 / 预览 / 打印对产品与版本信息的展示口径
  - 详情页对 `standardUsage` 的消费方式
  - 导入初始项与表单链之间的类型边界

### 实际改动

#### 1. BOM 查询结果补齐 `Product`
- 更新 `server/services/engineering_master_service.go`
- 在 `ListBOMs()` 与 `GetBOMByID()` 中补充 `Preload("Product")`。
- 这样前端 BOM 相关页面可优先消费后端返回的 `bom.product`，减少再从全量产品列表中二次补链。

#### 2. BOM schema 显式补充 `product`
- 更新 `src/features/engineering/data/schema.ts`
- 在 `bomSchema` 中新增可选 `product: productSchema.optional()`。
- 使列表、预览、详情等链路可以在类型层直接承接后端已返回的产品对象。

#### 3. 列表与预览优先消费后端返回的产品对象
- 更新：
  - `src/features/engineering/components/bom-mgmt/bom-table.tsx`
  - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
- 现在优先使用 `bom.product`，仅在缺失时才回退到外部 `products` 列表查找。
- 减少页面层因二次查找失败导致的“未知产品”展示漂移。

#### 4. 打印模板元信息与预览口径对齐
- 更新 `src/features/print-mgmt/components/templates/bom-print-template.tsx`
- 打印模板新增并消费：
  - `bomNo`
  - `bomVersion`
  - `revisionNo`
  - `changeOrderNo`
- 让 BOM 打印标题区与预览区对编号 / 版本 / 修订号的表达更加一致。

#### 5. 详情页不再前端兜底重算 `standardUsage`
- 更新 `src/features/engineering/components/bom-detail-table.tsx`
- 详情表中的标准用量现在直接展示后端返回值，不再按前端公式重新推导。
- 避免展示层再次制造“事实来源”。

#### 6. 收紧导入初始项类型边界
- 更新 `src/features/engineering/tabs/bom-mgmt.tsx`
- `initialItems` 从 `unknown[]` 收敛为 `Array<Partial<BOMItem>>`。
- 使导入结果进入 BOM 表单链时的类型边界更明确。

#### 7. 顺手清理 `bom-detail-table.tsx` 中的历史 `any`
- 更新 `src/features/engineering/components/bom-detail-table.tsx`
- 移除了旧翻译 key 调用上的 `as any` 残留，避免这类页面继续成为链路治理中的噪音源。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- BOM 查询返回的数据事实更完整，前端不再必须自行补产品对象。
- 列表、预览、打印对 BOM 编号 / 版本 / 产品显示的口径更加一致。
- 详情页已不再前端兜底重算 `standardUsage`。
- 导入到表单的类型边界进一步收紧。

## 2026-04-10 BOM 字段归一化与 MRP / 采购展示链治理

### 变更概述
- 本轮目标不是修改 BOM 核心计算逻辑，而是继续收紧：
  - BOM 与 Change Order / Product 的字段派生边界
  - MRP 前端对 BOM 显式异常的暴露方式
- 重点原则：后端明确报错时，前端不得再把问题吞掉或模糊化。

### 实际改动

#### 1. MRP handler 不再把 BOM 异常压成统一模糊错误
- 更新 `server/handlers/mrp_requirements.go`
- 当后端检测到 BOM 选择冲突时，现返回：
  - `409`
  - `"[CRITICAL_BOM_SELECTION] ..."`
- 其他异常也会返回包含原始错误内容的服务器错误消息，便于前端与用户定位问题来源。

#### 2. MRP 前端服务与 hook 保留错误原文
- 更新：
  - `src/features/mrp/services/requirement-core-service.ts`
  - `src/features/mrp/hooks/use-requirements.ts`
- 服务层显式允许响应中携带 `errorMessage`。
- 计算失败时：
  - 清空旧的 `requirements`
  - 重置 `stats`
  - 保留后端错误消息
- 避免 UI 继续展示上一次成功计算的旧结果。

#### 3. MRP 抽屉直接展示 BOM / MRP 错误
- 更新：
  - `src/features/mrp/pages/part-requirements.tsx`
  - `src/features/mrp/components/requirements/requirement-drawer.tsx`
- 当 MRP 计算失败时，抽屉不再仅展示空列表。
- 现在会直接显示错误面板，将后端返回的 BOM / MRP 异常消息暴露给用户。

#### 4. BOM 表单减少对 Change Order 的页面级补链
- 更新 `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- 选择 Change Order 时，只有当变更单字段真实存在时才覆盖：
  - `changeType`
  - `siteCode`
  - `revisionNo`
  - `effectiveFrom`
  - `effectiveTo`
- 不再默认用页面层兜底值去覆盖 BOM 自身字段。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- MRP 前端不会再把后端返回的 BOM 选择异常吞成模糊失败。
- BOM 计算失败时，用户现在可以直接看到问题原因。
- BOM 表单对 Change Order 的字段覆盖边界进一步收紧。

## 2026-04-10 BOM 后端字段归一化与 MRP 异常空态统一

### 变更概述
- 本轮继续沿着“后端为事实来源、前端负责展示”的原则收口。
- 重点不再是 BOM 计算本身，而是：
  - BOM 关联 Change Order 后的关键字段是否仍会漂移
  - MRP 页面是否能区分“分析失败”与“分析完成但结果为空”

### 实际改动

#### 1. BOM 关联 Change Order 时后端统一同步关键字段
- 更新 `server/services/engineering_master_service.go`
- `mergeBOMFromChangeOrder()` 现在在 BOM 已关联 Change Order 时，统一同步以下字段：
  - `changeOrderNo`
  - `changeType`
  - `siteCode`
  - `isDefaultSite`
  - `revisionNo`
  - `effectiveFrom`
  - `effectiveTo`
- 这样可以进一步减少这些字段在前端页面层被再次补链、保留旧值或发生漂移的机会。

#### 2. MRP 抽屉显式区分错误态、分析后空结果态与正常结果态
- 更新：
  - `src/features/mrp/components/requirements/requirement-drawer.tsx`
  - `src/locales/messages/zh-CN/mrp.ts`
  - `src/locales/messages/en-US/mrp.ts`
- 当前逻辑分为三类：
  1. **错误态**：直接显示 BOM / MRP 错误面板
  2. **分析后空结果态**：显示“本次分析未生成任何物料需求明细”的专用提示
  3. **正常结果态**：正常展示需求列表
- 避免“分析其实出了问题或结果异常为空”时，被误当作普通无数据界面。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- BOM 关联 Change Order 后，关键主数据字段更加以后端结果为准。
- MRP 页面能够更清楚地区分错误态与异常空态。
- BOM 异常进一步减少被包装成普通空结果的可能。

## 2026-04-10 BOM DTO 收敛与 MRP 提示口径统一

### 变更概述
- 本轮重点不再是扩展新能力，而是继续降低展示链理解成本与提示分叉。
- 主要目标：
  - 给 BOM 前端主消费链补统一版本显示入口
  - 让 MRP `selection-tree` 与分析抽屉对 BOM 问题给出更一致的提示
  - 顺手清理已知低成本 warning，减少治理噪音

### 实际改动

#### 1. BOM 前端主消费链补统一显示版本字段
- 更新：
  - `src/features/engineering/data/schema.ts`
  - `src/features/engineering/hooks/use-bom-form.ts`
  - `src/features/engineering/components/bom-mgmt/bom-table.tsx`
  - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
- 新增 `bomDisplayVersion` 作为前端主展示链可优先消费的版本字段。
- 当前列表、预览、打印入口均优先使用 `bomDisplayVersion`，不存在时再回退 `bomVersion`。
- 这一步不是删除历史字段，而是先减少前端主链对多版本字段并行理解的负担。

#### 2. 统一 MRP `selection-tree` 与抽屉对 BOM 缺失的提示口径
- 更新：
  - `src/features/mrp/components/requirements/selection-tree.tsx`
  - `src/locales/messages/zh-CN/mrp.ts`
  - `src/locales/messages/en-US/mrp.ts`
- `selection-tree` 中的缺失 BOM 提示现在采用更明确的错误卡片样式与文案层级。
- 中文 / 英文文案也改为更明确表达“当前无法进入物料分析”，与抽屉中的异常 / 空结果表达更接近。

#### 3. 清理已知样式 warning
- 更新 `src/features/engineering/components/bom-editor/bom-form-header.tsx`
- 将 `!h-11` 调整为 `h-11!`，消除已知样式 warning。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- BOM 前端主消费链对版本字段的理解进一步收敛。
- MRP `selection-tree` 与分析抽屉对 BOM 问题的提示口径更一致。
- 本轮涉及文件中的已知样式 warning 已清理。

## 2026-04-10 BOM DTO 单源化与 MRP 阶段提示统一

### 变更概述
- 本轮继续沿着“后端提供事实、前端负责展示”的边界收口。
- 重点是把前端已经补出的稳定展示字段尽量收回后端提供，并让 MRP 在不同阶段对 BOM 问题的提示更可区分。

### 实际改动

#### 1. 后端开始直接返回 `bomDisplayVersion`
- 更新：
  - `server/models/product.go`
  - `server/services/engineering_master_service.go`
- BOM 模型新增仅用于响应的 `bomDisplayVersion` 字段。
- 在以下路径中统一填充：
  - `ListBOMs()`
  - `GetBOMByID()`
  - `SaveBOM()` 返回值
- 目前后端会基于 `VersionText` 统一生成 `bomDisplayVersion`，减少前端继续本地补推断。

#### 2. MRP 在选择前阶段即可阻断“缺失可用 BOM”的分析请求
- 更新：
  - `src/features/mrp/components/requirements/selection-tree.tsx`
  - `src/locales/messages/zh-CN/mrp.ts`
  - `src/locales/messages/en-US/mrp.ts`
- 现在会统计已选生产项中缺失可用 BOM 的数量。
- 若存在缺失：
  - 底部分析条显示阻断原因
  - “分析需求 / Analyze Demand”按钮直接禁用
- 这样用户可以在分析前就知道问题属于“前置缺失”，而不是等到分析后才发现异常。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- `bomDisplayVersion` 已开始由后端直接提供，BOM DTO 更接近单源化。
- MRP 页面现在可以更明确地区分“选择前就缺少可用 BOM”的阶段性问题。
- BOM 到 MRP 的提示链路比上一轮更接近完整的阶段闭环。

## 2026-04-10 BOM DTO 最终单源化与 MRP 三阶段提示模板统一

### 变更概述
- 本轮继续做尾段收口，目标不是新增能力，而是让 BOM 展示字段与 MRP 阶段提示更接近最终统一表达。
- 重点包括：
  - 让打印链也统一围绕 `bomDisplayVersion` 消费
  - 让 MRP 三阶段提示更接近同一套标题/正文模板

### 实际改动

#### 1. BOM 打印链进一步统一到 `bomDisplayVersion`
- 更新：
  - `src/features/print-mgmt/components/templates/bom-print-template.tsx`
  - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
- `BOMPrintTemplateProps` 将 `bomVersion` 收敛为 `bomDisplayVersion`。
- 预览页在传递打印参数时，也直接传入 `bomDisplayVersion`。
- 这样列表、预览、打印三条主展示链对 BOM 版本字段的主消费口径进一步统一。

#### 2. MRP 三阶段提示补统一标题/正文模板
- 更新：
  - `src/locales/messages/zh-CN/mrp.ts`
  - `src/locales/messages/en-US/mrp.ts`
  - `src/features/mrp/components/requirements/selection-tree.tsx`
  - `src/features/mrp/components/requirements/requirement-drawer.tsx`
- 新增并统一使用：
  - 选择前缺 BOM 的标题文案
  - 分析失败的标题 / 说明文案
- 当前三阶段提示已更接近同一套结构：
  1. **选择前缺 BOM**：阻断分析
  2. **分析失败**：直接展示错误来源
  3. **分析后空结果**：提示异常空态并引导检查 BOM / 物料主数据

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### 当前结论
- BOM 打印链对版本字段的主消费口径进一步收敛。
- MRP 三阶段提示在标题、正文与阶段语义上更统一。
- BOM DTO 与 MRP 提示链已经进入尾段收口状态。

## 2026-04-10 前端旧版本字段审计、MRP 三阶段提示抽象与 BOM P2 封板评估

### 变更概述
- 本轮不是继续扩展 BOM P2，而是做最后的质量收口：
  - 审计前端主链是否还残留直接读取旧版本字段
  - 将 MRP 三阶段提示抽成统一小组件
  - 输出 BOM P2 是否可正式封板的结论

### 实际改动

#### 1. 前端旧版本字段残留审计结果
- 审查范围：`src/features/engineering/**/*` 与 `src/features/print-mgmt/**/*`
- 结论：
  - **未发现** BOM 主展示链仍直接依赖后端 `_v / version` 数值字段的情况。
  - 剩余出现的 `revisionNo` 属于**业务修订号语义**，不是应被清除的历史脏字段。
  - 本轮已进一步收紧：
    - `src/features/engineering/components/bom-mgmt/bom-table.tsx`
    - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
    - `src/features/print-mgmt/components/templates/bom-print-template.tsx`
  - 这些主展示链现在进一步围绕后端返回的 `bomDisplayVersion` 消费。

#### 2. MRP 三阶段提示已抽成统一小组件
- 新增：
  - `src/features/mrp/components/requirements/requirement-stage-alert.tsx`
- 复用到：
  - `selection-tree.tsx`
  - `requirement-drawer.tsx`
- 统一覆盖三类阶段问题：
  1. **选择前缺少可用 BOM**
  2. **分析失败**
  3. **分析后空结果**
- 这样后续如果要继续调整提示样式或模板，不再需要分别修改多个重复卡片结构。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
go test ./...
```
- 结果：通过。

### BOM P2 封板评估结论

#### 结论
- **建议：BOM P2 可以正式封板。**

#### 依据
1. **主链风险已收口**
   - BOM 创建 / 保存 / 查询 / 删除主链已稳定。
   - Active BOM 冲突已由后端裁决。
   - `bomNo` 已改为后端权威生成。

2. **事实来源已明显后移到后端**
   - `bomDisplayVersion` 已由后端直接提供。
   - BOM 与 Change Order 关键字段联动已由后端同步。
   - 前端对 `standardUsage` 等关键事实不再二次制造来源。

3. **MRP 下游对 BOM 问题的暴露已成闭环**
   - 选择前缺 BOM：直接阻断
   - 分析失败：直接报错
   - 分析后空结果：显式提示异常空态

4. **验证已连续通过**
   - 多轮 `pnpm exec tsc --noEmit` 通过
   - 多轮 `go test ./...` 通过

#### 仍存在但不阻塞封板的项
- 仍可继续做少量**低风险体验优化**，例如：
  - 文案微调
  - 展示组件细节统一
  - 局部抽象进一步解耦
- 这些更适合作为 **P2 后续优化**，而不是继续阻塞本轮正式封板。

## 2026-04-09 `trading` 第四段：sales 对称 patch 包装与写入模式统一

### 变更概述
- 本轮是在 `trading` 第三段完成后继续推进，目标不是恢复 `sales-order` 公开 PATCH 路由，而是在不破坏既有 hard-cut 决策的前提下，为 `sales-order` 补充**内部对称 patch / command 包装**。
- 本轮聚焦：
  - `sales_order_command_service.go`
  - `sales / purchase` command service 的内部组织方式统一
- 本轮原则是统一**内部 command 组织模式**，而不是统一外部 HTTP 接口形态。

### 收口方式

#### 1. 为 `sales-order` 增补内部对称 patch command
- 更新 `server/services/sales_order_command_service.go`
- 新增：
  - `PatchSalesOrderCommand`
  - `PatchSalesOrder(...)`
  - `BuildSalesOrderSavePayload(...)`
- 处理方式：
  - 复用既有 `SalesTransactionIntentOrderSave`
  - 以 `SalesOrderSnapshotRequest + delta` 形式封装内部 patch/update 语义
  - 明确这只是**内部 command 抽象**，不对外恢复 `PATCH /sales-orders/:id`

#### 2. 收敛 `sales / purchase` command service 的 payload 组织方式
- `sales-order`
  - `SaveSalesOrder(...)` 改为复用 `BuildSalesOrderSavePayload(...)`
- `purchase-order`
  - 继续保持 `PatchPurchaseOrder(...)` / `SavePurchaseOrder(...)` 通过 payload builder 进入 transaction 主链
- 结果：`sales / purchase` 在内部都形成了“command -> payload builder -> ORDER_SAVE transaction”的稳定组织模式。

#### 3. 显式固定保留差异
- 本轮没有恢复 `sales-order` 公开 PATCH 路由。
- 保留差异被明确固定为：
  - `purchase-order` 仍保有外部 patch 主链
  - `sales-order` 只补内部对称包装，不恢复公开 PATCH 能力
- 结果：统一的是**内部写入组织模式**，保留的是**外部接口决策差异**。

### 本轮效果
- `sales / purchase` 的 command service 组织方式已进一步统一。
- `sales-order` 不再是“只有 save command、没有任何对称 patch 包装”的特殊孤岛。
- `trading` 在不回滚 hard-cut 决策的前提下，完成了“内部统一、外部差异显式固定”的第四段收口。

### 验证
执行：
```bash
go test ./handlers -run "Sales|Purchase|Trading|Workflow" -count=1
go test ./services -run "Sales|Purchase|Trading|Workflow" -count=1
```

结果：通过。

### 本轮结论
- `trading` 第四段已完成：
  - `sales-order` 内部对称 patch / command 包装已补齐
  - `sales / purchase` 写入组织方式进一步统一
  - `sales-order` 公开 PATCH hard-cut 边界未被破坏
- 若继续下一段，可转回 DTO 总表开始下一批模块治理，或专门清理 `sales_orders PATCH` 历史残留章节中记录的遗留编译/文档面。

## 2026-04-09 `trading` 第三段：patch 展开与写入主链继续下沉

### 变更概述
- 本轮是在 `trading` 第二段完成后继续推进，目标不是再新增 command service，而是继续清理 `purchase-order patch` 主链中仍残留在 handler 的 delta 展开与 request 组装逻辑。
- 本轮聚焦：
  - `PatchPurchaseOrderHandler`
  - `purchase_order_command_service.go`
  - `services` 侧 delta 解析能力补齐
- 本轮原则是让 handler 真正收敛到 HTTP 边界，把 `purchase patch` 的组装逻辑与 `ORDER_SAVE` payload 前置准备继续下沉到 service。

### 收口方式

#### 1. 在 `services` 侧补齐 delta 新值提取能力
- 更新 `server/services/delta_validation.go`
- 新增：
  - `deltaValue`
  - `extractDeltaNewValue(...)`
- 结果：delta 新值提取能力不再只存在于 handler 层，后续 patch assembler 可以在 service 侧直接复用。

#### 2. 在 `purchase_order_command_service.go` 中新增 patch assembler
- 扩展 `PatchPurchaseOrderCommand`，允许直接接收 `SDRTSDeltaHandlerRequest`
- 新增 `BuildPurchaseOrderPatchRequest(...)`
- 下沉内容包括：
  - `validateSupportedTopLevelDeltaKeys(...)`
  - 现有实体读取与 response 回填
  - `PatchPurchaseOrderRequest` 初始化
  - `extractDeltaNewValue(...)` 后逐字段展开
  - 最终 `PatchPurchaseOrderRequest` 组装
- 同时让 `PatchPurchaseOrder(...)` 支持：
  - 若收到 `DeltaReq`，先在 service 内完成 patch request 组装
  - 再统一封装为 `ORDER_SAVE` payload，复用既有 transaction 主链

#### 3. `PatchPurchaseOrderHandler` 进一步收敛为薄壳
- `server/handlers/purchase_orders.go`
  - 删除 handler 中原有的大段 patch 展开与字段解释逻辑
  - 改为仅：
    - 绑定 `SDRTSDeltaHandlerRequest`
    - 提取 `actor / operator / ip`
    - 调用 `services.PatchPurchaseOrder(...)`
    - 映射 400 / 404 / 409 / 500
- 结果：`purchase patch` 的业务组装职责已从 handler 退出。

### 本轮效果
- `purchase-order patch` 已从“handler 负责 delta 展开，service 只负责提交事务”推进到“service 同时负责 patch assembler + command + transaction 组织”。
- `sales / purchase` 的写入组织方式进一步对齐：
  - `sales-order` 第二段已完成 save command 下沉
  - `purchase-order` 第三段继续完成 patch assembler 下沉
- `trading` 写入主链中最重的 handler 残留逻辑已进一步收薄。

### 验证
执行：
```bash
go test ./handlers -run "Purchase|Sales|Trading|Workflow" -count=1
go test ./services -run "Purchase|Sales|Trading|Workflow" -count=1
```

结果：通过。

### 本轮结论
- `trading` 第三段已完成：
  - `PatchPurchaseOrderHandler` 中的 delta 展开与 patch request 组装下沉完成
  - `purchase-order` patch 主链 service 边界进一步完整
  - `sales / purchase` 写入组织方式进一步收敛
- 若继续下一段，可转向评估 `sales-order` 是否需要补充对称 patch command 包装，或回到 DTO 总表进入下一批模块治理。

## 2026-04-09 `trading` 第二段：订单 handler 编排下沉

### 变更概述
- 本轮是在 `trading` 第一段完成后继续推进，目标不是再扩前端 contract 面，而是继续把订单保存/patch 主链从 handler 下沉到更明确的 service / command 边界。
- 本轮聚焦：
  - `SaveSalesOrderHandler`
  - `SavePurchaseOrderHandler`
  - `PatchPurchaseOrderHandler`
- 本轮原则是**优先复用既有 transaction service**，不重新发明第二套业务规则，只补 handler 与 transaction/service 之间缺失的 command orchestration 层。

### 收口方式

#### 1. 新增 `sales-order` command service
- 新增 `server/services/sales_order_command_service.go`
- 新增：
  - `SaveSalesOrderCommand`
  - `SaveSalesOrder(...)`
  - `createSalesOrderTx(...)`
  - `MapSaveSalesOrderRequestToSnapshot(...)`
- 处理方式：
  - **新建订单**：在 command service 内承接校验、创建、状态重算、工作流实例创建与 `workflow_instance_id` 回填
  - **已有订单更新**：统一封装为 `ORDER_SAVE` payload，复用 `ExecuteSalesOrderTransaction(...)`
- 结果：`SaveSalesOrderHandler` 不再自己承担核心事务编排。

#### 2. 新增 `purchase-order` command service
- 新增 `server/services/purchase_order_command_service.go`
- 新增：
  - `SavePurchaseOrderCommand`
  - `PatchPurchaseOrderCommand`
  - `SavePurchaseOrder(...)`
  - `PatchPurchaseOrder(...)`
  - `createPurchaseOrderTx(...)`
  - `MapSavePurchaseOrderRequestToPatchRequest(...)`
- 处理方式：
  - **新建采购订单**：在 command service 内承接物料校验、创建、工作流实例挂接
  - **已有采购订单保存**：统一封装为 `ORDER_SAVE` payload，复用 `ExecutePurchaseOrderTransaction(...)`
  - **采购订单 patch**：将 handler 中展开后的完整 patch request 统一交给 `PatchPurchaseOrder(...)`，再复用 `ORDER_SAVE` transaction 语义提交
- 结果：`SavePurchaseOrderHandler` 与 `PatchPurchaseOrderHandler` 不再自己承担核心事务编排。

#### 3. handler 收敛为参数解析 + 错误码映射层
- `server/handlers/sales_orders.go`
  - `SaveSalesOrderHandler` 改为仅绑定请求、提取 `actor/operator/ip`、调用 `services.SaveSalesOrder(...)`、映射版本冲突错误
- `server/handlers/purchase_orders.go`
  - `SavePurchaseOrderHandler` 改为仅绑定请求、提取 `actor/operator/ip`、调用 `services.SavePurchaseOrder(...)`
  - `PatchPurchaseOrderHandler` 保留 delta 展开步骤，但不再自行落事务，而是交给 `services.PatchPurchaseOrder(...)`
- 结果：handler 明显收敛到 HTTP 边界职责，不再继续成为订单写入主链的事务编排中心。

### 本轮效果
- `sales-order` 的保存主链已从 handler 内联事务编排推进到 command service + transaction service 组合边界。
- `purchase-order` 的保存 / patch 主链已从 handler 内联事务编排推进到 command service + transaction service 组合边界。
- `trading` 第二段完成后，订单域已经从“前端边界先闭环”继续推进到“后端订单编排层继续下沉”。

### 验证
执行：
```bash
go test ./handlers -run "Sales|Purchase|Trading|Workflow" -count=1
go test ./services -run "Sales|Purchase|Trading|Workflow" -count=1
```

结果：通过。

### 本轮结论
- `trading` 第二段已完成：
  - `SaveSalesOrderHandler` 下沉完成
  - `SavePurchaseOrderHandler` 下沉完成
  - `PatchPurchaseOrderHandler` 下沉完成
- 下一步若继续，可优先评估是否需要将 `purchase_orders.go` 中 patch delta 展开本身也进一步收口到 service，或转向下一个模块的 DTO 闭环批次。

## 2026-04-09 `trading` 整域 DTO 闭环（第一段）

### 变更概述
- 本轮按已批准的 `trading` 整域方案，先完成第一段最关键的 DTO 收口，目标是优先清理两类最大断点：
  - 后端 `logistics` 仍直接返回 `models.LogisticsRecord`
  - 前端 `sales-order / purchase-order` 仍大量 `apiFetch<SalesOrder>` / `apiFetch<PurchaseOrder>` 直连
- 本轮没有在一次提交中把所有订单 handler 事务编排完全下沉重写，而是优先完成**后端最明显 model 直出点**与**前端最大面积 contract 断点**，先把 `trading` 拉进可持续闭环轨道。

### 收口方式

#### 1. 后端为 `logistics` 建立 DTO 出口
- 新增 `server/services/logistics_dto.go`：
  - `LogisticsRecordResponse`
  - `LogisticsRecordListResponse`
  - `MapLogisticsRecordToResponse`
  - `MapLogisticsRecordsToResponse`
- 结果：`logistics` 已具备独立 response DTO 与 mapper，不再只能直接回传 `models.LogisticsRecord`。

#### 2. `logistics` handlers 停止直接返回 `models.LogisticsRecord`
- `server/handlers/logistics.go`
  - `GetLogisticsRecordsHandler` 改为返回 `services.LogisticsRecordListResponse`
  - `GetLogisticsRecordHandler` 改为返回 `services.MapLogisticsRecordToResponse(record)`
  - `SaveLogisticsRecordHandler` 的新增/更新返回统一映射为 DTO
  - `UpdateLogisticsStatusHandler` 的最终返回统一映射为 DTO
- 结果：`trading` 域里最明显的后端 model 直出点已经收口。

#### 3. 前端为 `sales-order` 建立 `API DTO + adapter`
- 新增：
  - `src/features/trading/sales/contracts/sales-order-api-dto.ts`
  - `src/features/trading/sales/adapters/sales-order-api-adapter.ts`
- adapter 覆盖：
  - `SalesOrderApiDTO -> SalesOrder`
  - `SalesOrderLineApiDTO -> SalesOrderLine`
  - `SalesOrder -> SalesOrderApiDTO`
  - 列表分页 DTO -> 页面 contract

#### 4. `sales-order` 前端主链停止实体直连
- `src/features/trading/sales/services/sales-query-service.ts`
  - `getSalesOrders`
  - `getSalesOrderById`
  - `getSalesOrderByNo`
  改为先读取 API DTO，再经 adapter 转为页面 contract
- `src/features/trading/sales/services/sales-service.ts`
  - `createSalesOrder` 改为通过 adapter 显式映射请求与响应
- `src/features/trading/sales/services/sales-transaction-service.ts`
  - transaction 响应改为 `SalesOrderApiDTO -> SalesOrder`
- `src/features/trading/services/order-delivery-service.ts`
  - 旁路直连销售订单的读写逻辑改为经 adapter 进行转换

#### 5. 前端为 `purchase-order` 建立 `API DTO + adapter`
- 新增：
  - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
  - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`
- adapter 覆盖：
  - `PurchaseOrderApiDTO -> PurchaseOrder`
  - `PurchaseOrderLineApiDTO -> PurchaseOrderLine`
  - `PurchaseOrder -> PurchaseOrderApiDTO`
  - `ConfirmPurchaseReceiptResponseApiDTO -> 页面 contract`

#### 6. `purchase-order` 前端主链停止实体直连
- `src/features/trading/purchase/services/purchase-service.ts`
  - `getPurchaseOrders`
  - `getDeletedPurchaseOrders`
  - `getPurchaseOrderById`
  - `createPurchaseOrder`
  - `patchPurchaseOrder`
  - `confirmPurchaseReceipt`
  全部改为经 API DTO / adapter 转换
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
  - transaction 响应改为 `PurchaseOrderApiDTO -> PurchaseOrder`

### 本轮效果
- `trading` 前端已经从“销售单/采购单 service 大面积实体直连”推进到“订单主链 `API DTO + adapter + 页面 contract` 显式边界”。
- `trading` 后端已经清除 `logistics` 这一块最明显的 `model` 直出风险。
- 当前 `sales-order / purchase-order` 的后端读取与 transaction 出口虽然原本已有 DTO 样板，但经过本轮前端对齐后，前后端契约边界终于同步起来，不再形成“后端有 DTO、前端仍把页面 schema 当 API 契约”的半接入状态。

### 验证
执行：
```bash
go test ./handlers -run "Sales|Purchase|Logistics|Trading" -count=1
go test ./services -run "Sales|Purchase|Logistics|Trading" -count=1
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `trading` 已完成第一段 DTO 闭环：
  - 后端 `logistics` DTO 出口收口
  - 前端 `sales-order / purchase-order` 主链 `API DTO + adapter` 收口
- 若继续下一段，建议优先处理 `sales_orders.go` / `purchase_orders.go` 中仍留在 handler 内的 `save / patch` 事务编排，将其继续下沉到更明确的 query / command service 边界。

## 2026-04-09 `users` 读取链 DTO 收口与前端 `contract / adapter` 闭环

### 变更概述
- 本轮按已批准的专项方案，完成了 `users` 模块**读取链**的 DTO 收口，并同步补齐了前端 `contract / adapter` 边界。
- 本轮范围聚焦：
  - 后端 `GET /users` 的列表 / options 读取主链
  - 前端 `src/features/users/services/user-api.ts` 的读取链与相关返回契约
- 本轮不扩大到权限体系治理，也不重开写入链重构，只在必要范围内顺手让前端写入接口也对齐同一套 API DTO 适配边界，避免再次形成半边状态。

### 收口方式

#### 1. 后端新增 `users` 读取链 service DTO / mapper / service
- 新增 `server/services/user_query_dto.go`：
  - `UserQuery`
  - `UserResponse`
  - `UserOptionResponse`
  - `UserListResponse`
  - `MapUserToResponse` / `MapUsersToResponse`
  - `MapUserToOptionResponse` / `MapUsersToOptionResponse`
- 新增 `server/services/user_query_service.go`：
  - `ListUsers(...)`
  - `ListUserOptions(...)`
- 结果：`users` 的读取链已有独立 service DTO 与 mapper 承接层，不再只停留在 handler 内部组织查询与映射。

#### 2. `GetUsersHandler` 改为通过 service 承接读取主链
- `server/handlers/users.go`
  - `GetUsersHandler` 现在先归一化 query 参数（`page / pageSize / username / status / role`）
  - `options=true` 时调用 `services.ListUserOptions(...)`
  - 普通列表时调用 `services.ListUsers(...)`
- 结果：`GetUsersHandler` 不再在公开读取主链上直接以 `[]models.User` 作为事实载体。

#### 3. handler DTO 文件降级为兼容壳层
- `server/handlers/user_dto.go`
  - 改为通过 type alias 与 wrapper 复用 `services.UserResponse` / `services.UserListResponse` / `services.UserOptionResponse`
  - `mapUserToResponse` / `mapUsersToResponse` 改为转发到 services mapper
- 结果：`users` 的读取契约中心从 handler 层下沉到 service DTO 层，避免后续读取链继续在 handler 里散落重复 DTO 定义。

#### 4. 前端建立 `users` 的 `API DTO + adapter` 边界
- 新增：
  - `src/features/users/contracts/user-api-dto.ts`
  - `src/features/users/adapters/user-api-adapter.ts`
- adapter 负责：
  - `UserApiDTO -> User`
  - `UserOptionApiDTO -> UserOption`
  - `UserListPageApiDTO -> UserListPage`
- 同时补充了 `User -> UserApiDTO` 的反向映射，为后续写入链统一契约提供基础。

#### 5. 前端 `user-api.ts` 停止 `apiFetch<User>` / `apiFetch<User[]>` 直连
- `src/features/users/services/user-api.ts`
  - `fetchUsers` 改为 `apiFetch<UserListPageApiDTO>` 后经 adapter 转成 `UserListPage`
  - `fetchUserOptions` 改为 `apiFetch<UserOptionApiDTO[]>` 后经 adapter 转成 `UserOption[]`
  - `createUser` / `patchUser` / `replaceUser` 的响应也统一改为 `UserApiDTO -> User`
- 结果：`users` 前端已不再直接把页面 schema 当作后端 API 契约使用。

### 本轮效果
- 后端 `users` 已从“读取链主要停留在 handler，`[]models.User` 为公开事实载体”推进到“读取链 service DTO 化”。
- 前端 `users` 已从“`apiFetch<User>` / `apiFetch<User[]>` 类型化直连”推进到“`API DTO + adapter + 页面 contract` 显式边界”。
- 这使 `users` 成为继 `org-personnel`、`partner` 之后第三个完成核心主链 DTO 闭环的模块级样板。

### 验证
执行：
```bash
go test ./handlers -run "User" -count=1
go test ./services -run User -count=1
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `users` 已完成本轮计划中的读取链 DTO 收口与前端 `contract / adapter` 闭环。
- 下一轮可优先推进 `trading`（尤其订单前端 contract / adapter）做第四个整域样板，或回到全局总表继续分批执行下一组模块。

## 2026-04-09 `partner`（`customers / suppliers`）整域 DTO 闭环

### 变更概述
- 本轮按已批准的整域方案，完成了 `partner` 域中 `customers / suppliers` 的主链 DTO 闭环，范围覆盖：
  - 后端 `list / options / save / patch / transactions` 的公共 service / handler 边界
  - 前端 `customer-service`、`supplier-service` 的 API 消费边界
- 本轮目标不是扩散到交易明细或其他邻接域，而是先把 `partner` 做成继 `org-personnel` 之后的第二个整域闭环样板。

### 收口方式

#### 1. 后端新增 `partner` 统一 DTO / mapper / service
- 在 `server/services/partner_list_dto.go` 中补齐并统一了 `partner` 域 DTO：
  - `CustomerResponse`
  - `SupplierResponse`
  - `CustomerListResponse`
  - `SupplierListResponse`
  - `SaveCustomerRequest`
  - `PatchCustomerRequest`
  - 对应 customer / supplier mapper 与 snapshot mapper
- 新增 `server/services/partner_service.go`：
  - `ListCustomers`
  - `ListSuppliers`
  - `SaveCustomer`
  - `SaveSupplier`
  - `PatchCustomer`
  - `PatchSupplier`
- 结果：`partner` 的 `list / options / save / patch` 主链有了明确的 service DTO 承接层，不再由 handler 直接成为主链事实中心。

#### 2. `customers.go` / `suppliers.go` 不再直接编排主链 DB 行为
- `server/handlers/customers.go`
  - `GetCustomersHandler` 改为通过 `services.ListCustomers(...)`
  - `SaveCustomerHandler` 改为通过 `services.SaveCustomer(...)`
  - `PatchCustomerHandler` 改为通过 `services.PatchCustomer(...)`
- `server/handlers/suppliers.go`
  - `GetSuppliersHandler` 改为通过 `services.ListSuppliers(...)`
  - `SaveSupplierHandler` 改为通过 `services.SaveSupplier(...)`
  - `PatchSupplierHandler` 改为通过 `services.PatchSupplier(...)`
- 结果：handler 现在只承担 handler DTO 解析、错误码映射与 service 调用，不再直接作为 save / patch 主链的 DB 编排层。

#### 3. `Select("*").Updates(...)` 不再作为主链默认更新语义
- 本轮关键目标之一是把 `customers / suppliers` 从“DTO 入口 + 实体覆盖式更新”推进到真正的 service 主链。
- 实际做法：
  - 对 `customers / suppliers` 的更新主链，优先复用现有 `partner_transaction_service.go`
  - 由 `partner_service.go` 组装 save snapshot / delta 后，调用：
    - `ExecuteCustomerTransaction(...)`
    - `ExecuteSupplierTransaction(...)`
- 结果：`save / patch` 主链已不再以 handler 内联 `Select("*").Updates(...)` 作为默认更新方式，而是切到已有的事务型 service 样板。

#### 4. transaction handler 返回统一 DTO
- `server/handlers/partner_transaction_handlers.go`：
  - `ExecuteCustomerTransactionHandler` 改为返回 `services.MapCustomerToResponse(*result)`
  - `ExecuteSupplierTransactionHandler` 改为返回 `services.MapSupplierToResponse(*result)`
- 结果：即使 transaction service 当前内部仍返回 `models.*`，对外 handler 已统一返回 `partner` DTO，而不再直接暴露实体。

#### 5. 前端建立 `customer / supplier` 的 `API DTO + adapter` 边界
- 新增客户前端契约文件：
  - `src/features/trading/customer/contracts/customer-api-dto.ts`
  - `src/features/trading/customer/adapters/customer-api-adapter.ts`
- 新增供应商前端契约文件：
  - `src/features/trading/supplier/contracts/supplier-api-dto.ts`
  - `src/features/trading/supplier/adapters/supplier-api-adapter.ts`
- 这些文件承担两类职责：
  - `API DTO -> 页面 contract` 的响应映射
  - `页面 contract -> API DTO` 的请求映射

#### 6. 前端 service 停止 `apiFetch<Customer>` / `apiFetch<Supplier>` 直连
- `src/features/trading/customer/services/customer-service.ts`
  - 改为 `apiFetch<CustomerApiDTO>` / `apiFetch<CustomerApiDTO[]>`
  - 列表响应 `items` 经 adapter 转为 `Customer[]`
  - 创建、patch、transaction 响应统一经 adapter 转为 `Customer`
- `src/features/trading/supplier/services/supplier-service.ts`
  - 改为 `apiFetch<SupplierApiDTO>` / `apiFetch<SupplierApiDTO[]>`
  - `mainProducts` 的字符串 / 数组兼容由 adapter 统一消化
  - 创建、patch、transaction 响应统一经 adapter 转为 `Supplier`
- 结果：`partner` 前端主链已不再直接把页面 schema 当作 API 契约使用。

### 本轮效果
- 后端 `partner` 已从“handler 已局部 DTO 化，但 service 缺位、更新仍偏实体覆盖”推进到“后端主链公共契约 DTO 化 + service 主链承接”。
- 前端 `partner` 已从“`apiFetch<Customer>` / `apiFetch<Supplier>` 类型化直连”推进到“`API DTO + adapter + 页面 contract` 显式边界”。
- 这使 `partner` 成为当前仓库里继 `org-personnel` 之后第二个真正同时覆盖**后端 service 边界**与**前端消费边界**的模块级闭环样板。

### 验证
执行：
```bash
go test ./services -run "Customer|Supplier|Partner" -count=1
go test ./handlers -run "Customer|Supplier|Partner" -count=1
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `partner`（`customers / suppliers`）已完成本轮计划中的整域主链 DTO 闭环。
- 下一轮可优先推进 `users` 的读取链 DTO 化，或转向 `trading`（尤其前端 contract / adapter）做第三个整域闭环。

## 2026-04-09 `org-personnel` 整域 DTO 闭环

### 变更概述
- 本轮按已批准的整域方案，完成了 `org-personnel` 的主链 DTO 闭环，范围覆盖：
  - 后端 `list / tree / save / patch / bulk sync` 的公共 service / handler 边界
  - 前端 `employee-core-service`、`employee-maintenance-service`、`org-service` 的 API 消费边界
- 本轮目标不是继续扩散到相邻模块，而是先把 `org-personnel` 做成一个可以复制到 `partner`、`users`、`trading` 的整域样板。

### 收口方式

#### 1. 后端 `list / tree / patch` 公共契约改为 DTO
- 在 `server/services/org_personnel_dto.go` 中新增并接入：
  - `OrganizationTreeNodeResponse`
  - `EmployeeListItemResponse`
  - 对应 `MapOrganizationTreeToResponse` / `MapOrganizationNodeToResponse` / `MapEmployeeToListItemResponse` / `MapEmployeesToListItemResponse`
- `server/services/organization_service.go` 公开签名已完成收口：
  - `ListOrganizationTree() ([]OrganizationTreeNodeResponse, error)`
  - `ListEmployees() ([]EmployeeListItemResponse, error)`
  - `PatchOrganization(...) (OrganizationTreeNodeResponse, error)`
  - `PatchEmployee(...) (EmployeeListItemResponse, error)`
- `server/services/org_personnel_patch_service.go` 中 patch 主链不再把 `models.Organization` / `models.Employee` 作为 service 出口，而是统一返回 DTO。

#### 2. handlers 不再以 `models.* -> gin.H` 作为公开响应主链
- `server/handlers/org_handlers.go`：
  - `GetOrgTreeHandler` 直接返回 `[]OrganizationTreeNodeResponse`
  - `PatchOrgHandler` 直接返回 `OrganizationTreeNodeResponse`
  - `SaveOrgHandler` 在保存后复查组织树时，改为在 DTO 树中定位目标节点
- `server/handlers/employee_handlers.go`：
  - `GetEmployeesHandler` 直接返回 `[]EmployeeListItemResponse`
  - `PatchEmployeeHandler` 直接返回 `EmployeeListItemResponse`
- 结果：`org-personnel` 的 list / tree / patch 主链已不再公开暴露 `models.Organization` / `models.Employee`。

#### 3. 前端建立 `API DTO + adapter` 边界
- 新增前端契约文件：
  - `src/features/org-personnel/contracts/employee-api-dto.ts`
  - `src/features/org-personnel/contracts/org-api-dto.ts`
- 新增前端适配器文件：
  - `src/features/org-personnel/adapters/employee-api-adapter.ts`
  - `src/features/org-personnel/adapters/org-api-adapter.ts`
- 这些文件承担两类职责：
  - `API DTO -> 页面 contract` 的响应映射
  - `页面 contract -> API DTO` 的请求映射

#### 4. 前端 service 停止 `apiFetch<Employee>` / `apiFetch<OrgNode>` 直连
- `src/features/org-personnel/services/org-service.ts`
  - 改为 `apiFetch<OrgNodeApiDTO>` / `apiFetch<OrgNodeApiDTO[]>`
  - 经 `org-api-adapter` 转换为 `OrgNode`
- `src/features/org-personnel/services/employee-core-service.ts`
  - 改为 `apiFetch<EmployeeApiDTO>` / `apiFetch<EmployeeApiDTO[]>`
  - 经 `employee-api-adapter` 转换为 `Employee`
- `src/features/org-personnel/services/employee-maintenance-service.ts`
  - 保存与 patch 响应统一走 `EmployeeApiDTO -> Employee`
  - 保存请求与 fallback 保存统一走 `Employee -> EmployeeApiDTO`
- 结果：`org-personnel` 前端主链已不再直接把页面 schema 当作 API 契约使用。

### 本轮效果
- 后端 `org-personnel` 已从“save 链 DTO 化，但 list/tree/patch 仍泄漏 model”推进到“后端主链公共契约 DTO 化”。
- 前端 `org-personnel` 已从“`apiFetch<Employee>` / `apiFetch<OrgNode>` 类型化直连”推进到“`API DTO + adapter + 页面 contract` 显式边界”。
- 这使 `org-personnel` 成为当前仓库里少数真正同时覆盖**后端 service 边界**与**前端消费边界**的模块级闭环样板。

### 验证
执行：
```bash
go test ./services -run "Organization|Employee" -count=1
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `org-personnel` 已完成本轮计划中的整域主链 DTO 闭环。
- 下一轮可优先复用该样板收口 `partner`（`customers` / `suppliers`），其次推进 `trading` 前端 contract / adapter 收口。

## 2026-04-09 DTO 现状总表（按模块 / 五层链路）

### 本轮目标
- 在既有 DTO 审计框架基础上，进一步沉淀一份可执行的模块级现状总表。
- 总表统一按五层链路记录：`HTTP 入站`、`service 边界`、`持久化/模型`、`HTTP 出站`、`前端契约消费`。
- 本轮不直接进入新的 DTO 代码改造，而是先给出可支撑下一轮排期的全局台账与优先级排序。

### 总表

| 模块 | 所属域 | HTTP 入站 | service 边界 | 持久化/模型 | HTTP 出站 | 前端契约消费 | 综合等级 | 关键证据 | 主要断点 | 建议动作 | 下一轮优先级 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `production-topology` | 后端生产域 | 已使用 `services.SaveProductionLineHandlerRequest` / `PatchProductionLineHandlerRequest` | `ProductionService` 已暴露 `SaveProductionLineRequest` / `PatchProductionLineRequest` / `ProductionLineDTO` | model 已主要收敛到 service / repository 内部 | `GetProductionLinesHandler` 返回 `services.ProductionLinesResponse`，save/patch 返回 `ProductionLineDTO` | 前端消费侧尚未在本轮发现对应 contract / adapter 样板 | **A-** | `production_topology_handlers.go` 中 `ShouldBindJSON(&input)` 绑定的是 service request；`production_service.go` 中存在 `mapProductionLineToDTO` / `mapProductionLineDTOToModel` | 后端主链基本闭环，但前端消费层未见系统化 contract 证据 | 后续补前端 query contract / adapter，避免生产域只完成后端半边 | 中 |
| `workflow` | 后端工作流域 | 已具备独立 request struct | `workflow_dto.go` 提供 `SaveWorkflowDefinitionRequest`、`CreateWorkflowInstanceRequest`、`WorkflowTaskDecisionRequest` | model 通过 `workflow_mapper.go` 转成 response | 已具备 `WorkflowDefinitionResponse` / `WorkflowInstanceResponse` / `WorkflowTaskResponse` | 前端消费层未在本轮发现同等级 contract / adapter 样板 | **A-** | `workflow_dto.go` + `workflow_mapper.go` | 后端 DTO 完整度高，但前端契约层证据不足 | 优先补前端工作流消费侧 contract / adapter，形成前后端闭环 | 中 |
| `quality` | 后端质量域 | 首批已从 `models.*` 直绑收口为 handler DTO | service 边界未在本轮发现完整统一 DTO 样板 | 持久化层仍以 model 为事实源，但不再直接裸露到 handler | 已从实体集合直返收口为 response | 前端质量只读服务仍偏 `apiFetch<T>` 直连模式 | **B** | 首批 DTO 治理记录；`src/features/quality/services/quality-core-service.ts` 属于直接 `apiFetch` 服务 | handler 已样板化，但 service / frontend 未形成闭环 | 下一轮若进入质量域，应从 service 边界与前端 contract 同时补齐 | 中 |
| `warehouse-category` | 后端仓储域 | 首批已从 `models.WarehouseCategory` 直绑收口为 request DTO | service DTO 样板未在本轮发现成体系铺开 | 持久化仍由 model 驱动 | 列表/保存已改为 response DTO | 前端仓储服务仍以 `apiFetch<T>` 为主 | **B** | 首批 DTO 治理记录；`inventory-core-service.ts` 为直接 `apiFetch` 风格 | handler 已收口，service 与前端仍偏半接入 | 下一轮可与 `quality` 合并处理为“首批 handler 样板后的 service/frontend 收口” | 中 |
| `customers` | partner 域 | `SaveCustomerHandler` 已绑定 `CustomerRequest`，patch 也使用显式 delta request | 未见独立 customer service DTO 边界，handler 内仍直接编排 DB | `SaveCustomerHandler` 仍有 `tx.Model(&existing).Select("*").Updates(input)` | list/options/save/patch 已使用 response DTO | 前端客户服务仍以 `apiFetch<Customer>` / schema 直连为主 | **B-** | `customers.go` 中 `ShouldBindJSON(&req)`、`mapCustomerRequestToModel(req)` 与 `Select("*").Updates(input)` 并存 | handler 已收口，但 service 缺位、更新链仍是实体覆盖式、前端仍未脱离实体 shape | 适合作为下一轮“从 handler DTO 过渡到 service DTO + frontend contract”的重点模块 | 高 |
| `suppliers` | partner 域 | `SaveSupplierHandler` 绑定 `services.SaveSupplierRequest`，patch 使用 `services.PatchSupplierRequest` | save/patch request 已上浮到 service package，但 service 公开边界未形成完整域服务承接 | `SaveSupplierHandler` 仍有 `Select("*").Updates(input)` | list/options/save/patch 已用 response DTO | 前端供应商服务仍以 `apiFetch<Supplier>` 直连为主 | **B-** | `suppliers.go` 中 `ShouldBindJSON(&req)` + `services.MapSaveSupplierRequestToModel(req)` + `Select("*").Updates(input)` | request/response 已有，但 service 域边界未闭环，持久化仍是实体覆盖式，前端未 contract 化 | 与 `customers` 作为同一 partner 收口批次推进收益最高 | 高 |
| `users` | 用户域 | 已具备 `CreateUserRequest` / `UpdateUserRequest` / `ReplaceUserRequest` / `BulkSyncUserRequest` | service 层并未形成独立 user service DTO 边界，主要逻辑仍在 handler | 查询中间态仍直接使用 `[]models.User` | 列表与写操作响应已切到 `UserListResponse` / `UserResponse` / option response | 前端 `src/features/users/services/user-api.ts` 仍偏接口类型直连 | **B** | `users.go` 中 `var items []models.User`、`c.JSON(http.StatusOK, UserListResponse{...})` 并存 | 响应已收口，但读取主链和 service 边界仍未解耦；前端未建立 adapter | 适合作为“读取链 DTO 化 + frontend contract 收口”的中高优先级模块 | 中高 |
| `org-personnel` | 组织人事域 | save/bulk sync 已接入 handler DTO | `SaveOrganization` / `SaveEmployee` / bulk sync 已 DTO 化；但 `ListOrganizationTree() ([]*models.Organization, error)`、`ListEmployees() ([]models.Employee, error)`、patch 仍暴露 model | model 仍在 tree/list/patch 主链中作为公开返回或中间契约 | save 响应已有 `OrganizationSaveResponse` / `EmployeeSaveResponse`，但 list/tree/patch 未完全统一 | 前端 `employee-core-service.ts` 直接 `apiFetch<Employee[]>('/employees')`、`apiFetch<Employee>(...)`；未见 API DTO -> contract adapter | **B-** | `organization_service.go` 中 `ListOrganizationTree() ([]*models.Organization, error)`、`ListEmployees() ([]models.Employee, error)`；`org_personnel_dto.go` 中 save DTO 已完整；前端 `employee-core-service.ts` 直接吃 `Employee` | 这是当前最典型的“双层断点”：后端 save 链已收口，但 list/patch 仍泄漏 model，前端也仍直吃实体 | 建议作为下一轮第一优先，完成 org-personnel 整域闭环：list/tree/patch DTO + frontend contract / adapter | **最高** |
| `sales-order` | 交易域 | 已具备 `SaveSalesOrderRequest` / snapshot request | service DTO 与 mapper 已形成样板 | model 与 DTO 映射显式存在 | `SalesOrderResponse` / `SalesOrderListResponse` 完整 | 前端 `sales-service.ts` 仍直接 `apiFetch<SalesOrder>`，以 `data/schema` 中实体形态作为事实源 | **A-/B+** | `sales_order_dto.go` 中 request/response 完整；`sales-service.ts` 中 `apiFetch<SalesOrder>('/sales-orders', ...)` | 后端是强样板，但前端仍未 contract / adapter 化 | 下一轮不必重做后端，应优先用 sales-order 建立交易域前端 contract / adapter 样板 | 高 |
| `purchase-order` | 交易域 | 已具备 `SavePurchaseOrderRequest` / `PatchPurchaseOrderRequest` / receipt request | service DTO 样板完整 | model 到 response 的分层明确 | `PurchaseOrderResponse` / `PurchaseOrderListResponse` / `ConfirmPurchaseReceiptResponse` 完整 | 前端 `purchase-service.ts` 仍直接 `apiFetch<PurchaseOrder>` / `PaginatedResponse<PurchaseOrder>` | **A-/B+** | `purchase_order_dto.go` 完整；`purchase-service.ts` 中 `apiFetch<PurchaseOrder>`、`apiFetch<PaginatedResponse<PurchaseOrder>>` | 后端完整度高，前端仍是类型化直连 | 与 `sales-order` 合并为交易域前端 contract 收口批次 | 高 |
| `voucher` | 财务域 | 查询参数已存在 `FinancialVoucherQueryRequest` | service DTO 已存在，但本轮未见更完整命令侧服务边界样板 | model 通过 mapper 转 response | `FinancialVoucherResponse` / `ClearingEntryResponse` 已存在 | 前端财务消费侧未在本轮发现同等级契约样板 | **A-/B+** | `voucher_dto.go` / `voucher_mapper.go` | 后端读取链较清晰，但前端与更深层服务边界仍需复核 | 可作为 finance 样板保留，优先级低于 org-personnel / trading / partner | 中低 |
| `wheel-trace` | 扫码平台 / 前端契约样板域 | 前端通过 gateway 组装 request DTO | 以前端 use-case / gateway contract 为边界，而非页面直接调接口 | API DTO 与页面 contract 显式分层 | `WheelTraceLookupApiResponseDTO` 经 `toWheelTraceLookupResponseContract` 转换 | 已具备 `contracts + adapters + gateway + response contract` 完整样板 | **A** | `wheel-trace-api-dto.ts`、`api-wheel-trace-gateway.ts` | 该模块主要缺的是后端对应链路是否同样达到同等级样板，本轮前端样板已足够成熟 | 建议将其作为前端 contract / adapter 的复制模板，横向推广到 trading / org-personnel | 高（作为样板，不是作为问题模块） |
| `共享契约域` | 跨域基础设施 | 无统一入站概念 | 后端已存在 `*_dto.go` / `*_mapper.go` 分布；前端缺统一 API DTO 约束 | model 是否泄漏取决于各域实现 | 响应规则分散在各域 | 前端整体仍以 `apiFetch<T>` + schema 直连为主，只有少数模块有 contract / adapter | **B/C 混合** | `server/services` 下存在 14 个 `*_dto.go` 与 8 个 `*_mapper.go`；`src` 侧大量 service 直接 `apiFetch<T>` | 后端样板已丰富，但前端没有形成统一准入规则，导致全仓闭环不均衡 | 下一轮需要补“前端 contract / adapter 准入规则”，否则 DTO 会长期停留在后端半边 | **最高（规则层）** |

### 综合判断
- 当前 DTO 治理已经完成了“全局审计规则 + 三批后端治理 + 局部前端样板”的前半段。
- 当前最突出的断点不是“完全没有 DTO”，而是**模块闭环程度严重不均衡**：
  - 后端生产 / workflow / trading / voucher 已有 A 级或接近 A 级样板。
  - `customers` / `suppliers` / `users` / `org-personnel` 处于典型 B 级或 B-：handler 已收口，但 service 或前端仍未闭环。
  - 前端除了 `wheel-trace` 这类样板外，大多数 feature 仍停留在 `apiFetch<T>` 直接消费实体形态的阶段。

### 下一轮整体收口顺序

#### 第一优先：`org-personnel` 整域闭环
- 原因：当前最典型地同时暴露了两个断点：
  - 后端 `ListOrganizationTree` / `ListEmployees` / patch 仍泄漏 `models.*`
  - 前端 `employee-core-service.ts` 仍直接消费 `Employee`
- 目标：把 `org-personnel` 做成首个“handler DTO + service DTO + list/tree DTO + frontend contract / adapter”完整样板。

#### 第二优先：`partner`（`customers` + `suppliers`）
- 原因：
  - handler request / response 已经铺好
  - 仍残留 `Select("*").Updates(input)` 这类实体覆盖式更新
  - 前端客户/供应商服务仍未脱离实体 shape
- 目标：从当前半接入态升级为真正的 service DTO + frontend contract 闭环。

#### 第三优先：`trading` 前端 contract 收口（`sales-order` + `purchase-order`）
- 原因：
  - 后端 DTO 样板已经成熟
  - 前端仍直接 `apiFetch<SalesOrder>` / `apiFetch<PurchaseOrder>`
- 目标：不再重复改后端，而是以交易域作为前端 API DTO / contract / adapter 的复制样板。

#### 第四优先：`users` 读取链与前端 contract 收口
- 原因：响应已收口，但读取主链仍大量以 `[]models.User` 为中间载体，前端也未形成 adapter。
- 目标：完成 query/list 主链的 DTO 化，并与前端用户域契约对齐。

#### 第五优先：规则层收口（共享契约域）
- 原因：如果前端继续允许默认 `apiFetch<T>` 直接吃实体结构，后续每个模块都可能重新漂移。
- 目标：沉淀前端新增接口的 contract / adapter 准入样板，避免 DTO 永远停留在后端半边。

### 本轮结论
- 这份总表已经可以直接支撑下一轮 DTO 治理排期。
- 下一轮不建议再从零散 handler 开始，而应转向**按模块闭环**推进。
- 若只做单点补丁，最容易再次回到“后端局部 DTO 化、前端继续直吃实体”的半完成状态。

## 2026-04-09 第三批 DTO 治理（organization_service / org-personnel）

### 变更概述
- 已完成第三批 DTO 治理，范围覆盖：
  - `server/services/organization_service.go`
  - `server/services/org_personnel_dto.go`
  - `server/services/org_personnel_patch_service.go`
  - `server/handlers/org_handlers.go`
  - `server/handlers/employee_handlers.go`
  - `server/handlers/org_bulk_sync_handlers.go`
  - `server/handlers/org_personnel_dto.go`

### 收口方式

#### 1. service 边界正式 DTO 化
- 新增 service DTO / mapper：
  - `OrganizationSaveRequest / Response`
  - `EmployeeSaveRequest / Response`
  - `BulkSyncOrganizationRequest`
  - `BulkSyncEmployeeRequest`
- `organization_service.go` 公开签名已完成收口：
  - `SaveOrganization`
  - `SaveEmployee`
  - `BulkSyncOrganizations`
  - `BulkSyncEmployees`
- 上述 public service API 不再直接以 `models.Organization` / `models.Employee` 作为保存与批量同步契约。

#### 2. handler 入站 DTO 接线
- 新增 handler DTO / mapper：
  - `OrganizationSaveHandlerRequest`
  - `EmployeeSaveHandlerRequest`
  - `BulkSyncOrganizationHandlerRequest`
  - `BulkSyncEmployeeHandlerRequest`
- 已接线：
  - `SaveOrgHandler`
  - `SaveEmployeeHandler`
  - `BulkSyncOrgHandler`
  - `BulkSyncEmployeesHandler`
- 结果：上述入口不再直接 `ShouldBindJSON(&models.Organization)` / `ShouldBindJSON(&models.Employee)`，而是通过 handler DTO -> service DTO -> model 的显式链路进入服务层。

#### 3. 现有 patch / response 主链保持兼容
- `PatchOrgHandler` / `PatchEmployeeHandler` 继续沿用既有 patch DTO。
- `personnel_response_helpers.go` 继续承担 org / employee 响应映射职责，本轮未强制改为新 response struct，以避免扩大改动面。

### 验证
执行：
```bash
go test ./services -run "Organization|Employee" -count=1
```

结果：通过。

### 补充说明
- 当前 `handlers` 包全量编译仍受 `sales_orders.go` 对已删除 PATCH DTO / mapper 的残留引用阻塞，这是另一条由销售单 hard-cut 引出的独立问题，不是本轮 org-personnel DTO 改造引入的新阻塞。

### 本轮结论
- 第三批已把 `organization_service / org-personnel` 从“handler 局部 DTO + service 直接暴露 model”收口为“service DTO + handler DTO”双层边界。
- 到这一步，DTO 治理的重点已经从“继续找明显 handler 直通”逐步转向“更深层 service 边界与前端 contract 的系统收口”。

## 2026-04-09 第二批 DTO 治理（customers / suppliers / users）

### 变更概述
- 已完成第二批半接入链 DTO 收口：
  - `server/handlers/customers.go`
  - `server/handlers/suppliers.go`
  - `server/handlers/users.go`
- 新增独立 DTO / mapper 文件：
  - `server/handlers/customer_dto.go`
  - `server/handlers/supplier_dto.go`
  - `server/handlers/user_dto.go`

### 收口方式

#### 1. `customers`
- 新增：
  - `CustomerRequest`
  - `CustomerResponse`
  - `CustomerListResponse`
  - `BulkSyncCustomerRequest`
- 新增映射：
  - `mapCustomerRequestToModel`
  - `mapBulkSyncCustomerRequestToModel`
  - `mapCustomerToResponse`
- 结果：
  - `SaveCustomerHandler` 不再直接绑定 `models.Customer`；
  - `options` 不再直接返回 `[]models.Customer`；
  - `PatchCustomerHandler` 响应不再直接回传实体；
  - `BulkSyncCustomersHandler` 不再直接接收 `[]models.Customer`。

#### 2. `suppliers`
- 新增：
  - `SupplierResponse`
  - `SupplierListResponse`
  - `BulkSyncSupplierRequest`
- 新增映射：
  - `mapBulkSyncSupplierRequestToModel`
  - `mapSupplierToResponse`
- 结果：
  - `options` 不再直接返回 `[]models.Supplier`；
  - `SaveSupplierHandler` / `PatchSupplierHandler` 响应不再直接回传实体；
  - `BulkSyncSuppliersHandler` 不再直接接收 `[]models.Supplier`。

#### 3. `users`
- 新增：
  - `UserResponse`
  - `UserListResponse`
- 新增映射：
  - `mapUserToResponse`
  - `mapUsersToResponse`
- 结果：
  - `GetUsersHandler` 列表响应不再直接回传 `[]models.User`；
  - `CreateUserHandler`、`PatchUserHandler`、`ReplaceUserHandler` 响应统一改为 `UserResponse`；
  - `users` 这条链当前主要剩余问题已从“响应直通”收口为更深层 service / 领域边界问题。

### 本轮设计边界
- 本轮继续沿用第一批 handler DTO 样板，优先处理半接入链中的高风险直通入口。
- 本轮未扩散到：
  - `organization_service` service 层签名
  - 更深层 partner/user service 边界改造
  - 前端 contract 联动收口

### 验证
执行：
```bash
go test ./handlers -run ^$
```

结果：通过。

### 本轮结论
- 第二批已把 `customers / suppliers / users` 从“局部 DTO + 局部实体直通”进一步收口到更一致的 handler DTO 边界。
- 当前下一批若继续推进，优先级应转向：
  - `organization_service` 的 service 层签名泄漏
  - partner/user 相关 service 边界与前端 contract 的进一步解耦

## 2026-04-09 首批 C 级 DTO 样板治理

### 变更概述
- 已完成三处首批 C 级 handler DTO 样板治理：
  - `server/handlers/workflow_routing.go`
  - `server/handlers/quality.go`
  - `server/handlers/warehouse_category.go`
- 新增独立 DTO / mapper 文件：
  - `server/handlers/workflow_routing_dto.go`
  - `server/handlers/quality_dto.go`
  - `server/handlers/warehouse_category_dto.go`

### 收口方式

#### 1. `workflow_routing`
- 新增：
  - `StandardCommandRequest`
  - `StandardCommandResponse`
  - `NotificationRuleRequest`
  - `NotificationRuleResponse`
- 新增映射：
  - `mapStandardCommandRequestToModel`
  - `mapStandardCommandToResponse`
  - `mapNotificationRuleRequestToModel`
  - `mapNotificationRuleToResponse`
- 结果：
  - handler 不再直接 `ShouldBindJSON(&models.StandardCommand)` / `ShouldBindJSON(&models.NotificationRule)`；
  - 列表与保存响应不再直接回传实体。

#### 2. `warehouse_category`
- 新增：
  - `WarehouseCategoryRequest`
  - `WarehouseCategoryResponse`
  - `WarehouseCategoryListResponse`
- 新增映射：
  - `mapWarehouseCategoryRequestToModel`
  - `mapWarehouseCategoryToResponse`
- 结果：
  - handler 不再直接 `ShouldBindJSON(&models.WarehouseCategory)`；
  - `options` 与分页列表均改为返回 DTO response；
  - 保存后返回显式 DTO，而不是匿名 message 或实体直返。

#### 3. `quality`
- 新增：
  - `InspectionStandardRequest / Response / ListResponse`
  - `InspectionTaskRequest / Response / ListResponse`
  - `QualityAbnormalityResponse`
- 新增映射：
  - `mapInspectionStandardRequestToModel`
  - `mapInspectionStandardToResponse`
  - `mapInspectionTaskRequestToModel`
  - `mapInspectionTaskToResponse`
  - `mapQualityAbnormalityToResponse`
- 结果：
  - `SaveInspectionStandardHandler` 不再直接绑定 `models.InspectionStandard`；
  - `SaveInspectionTaskHandler` 不再直接绑定 `models.InspectionTask`；
  - 标准列表、检验任务列表、异常列表均不再直接返回实体集合。

### 本轮设计边界
- 本轮只做 handler DTO 样板治理，未扩散到：
  - `organization_service`
  - `customers / suppliers / users` 半接入链
  - 全仓 service 层签名重构
- 本轮目标是先固定“最小可复制样板”，后续再把同一模式复制到更多 C/B 级模块。

### 验证
执行：
```bash
go test ./handlers -run ^$
```

结果：通过。

### 本轮结论
- 三处 C 级直通链已完成第一批 DTO 样板化，handler 边界已从“直接绑/直接回 model”收口为“request/response + mapper”。
- 当前已经形成一套可复制的 handler DTO 样板，后续可优先复制到 `customers`、`suppliers`、`users` 与 `organization_service` 相邻链路。

## 专项：DTO 全局接入审计与分级治理首轮盘点（2026-04-09）

### 本轮目标
本轮没有直接进入“逐个接口补 DTO”，而是先完成全仓 DTO 接入现状审计，建立统一的分级口径与后续治理顺序，避免继续靠个案记忆补洞。

### 审计方法
本轮采用统一“五层链路”审计法，而不是仅按命名搜索 `DTO`：

1. HTTP 入站层：检查 `handler` 是否直接 `ShouldBindJSON(&models.X)`。
2. 服务边界层：检查 `service` 公共入参/出参是否直接暴露 `models.*`。
3. 持久化/模型层：检查 ORM model 是否被复用为 API contract。
4. HTTP 出站层：检查 `c.JSON(...)` 是否直接回传 model 或 model 列表。
5. 前端契约消费层：检查前端 `services / data / schema / types` 是否形成独立 contract，而不是默认镜像后端实体。

### 审计结论概览
当前仓库的 DTO 现状不是“统一已接入”也不是“完全没有”，而是明显的并存态：

#### A 级：完整 DTO 链（可作为样板）
- `server/services/production_dto.go`
- `server/services/production_process_dto.go`
- `server/services/workflow_dto.go`
- `server/services/workflow_mapper.go`
- `server/services/sales_order_dto.go`
- `server/services/sales_order_mapper.go`
- `server/services/purchase_order_dto.go`
- `server/services/purchase_order_mapper.go`
- `server/services/voucher_dto.go`
- `server/services/voucher_mapper.go`

这些链路具备较完整特征：

- 请求结构与响应结构独立存在；
- model -> response、request -> model 映射显式存在；
- handler 不再直接以数据库实体作为唯一对外契约。

#### B 级：半接入链（局部 DTO 化，边界未闭环）
- `server/handlers/customers.go`
- `server/handlers/suppliers.go`
- `server/handlers/users.go`

代表性特征：

- 某些列表/patch 链路已经开始使用显式 request/response；
- 但 save / bulk sync / options 等路径仍残留 model 直通或局部直通；
- 同一模块内部 DTO 完整度不一致，说明当前是“局部收口、未完全闭环”。

#### C 级：模型直通链（首批高优先级治理）
- `server/handlers/workflow_routing.go`
- `server/handlers/quality.go`
- `server/handlers/warehouse_category.go`
- `server/handlers/customers.go` 的 `SaveCustomerHandler`
- `server/services/organization_service.go`

已确认的高风险模式包括：

- `ShouldBindJSON(&models.StandardCommand)`
- `ShouldBindJSON(&models.NotificationRule)`
- `ShouldBindJSON(&models.InspectionStandard)`
- `ShouldBindJSON(&models.InspectionTask)`
- `ShouldBindJSON(&models.WarehouseCategory)`
- `SaveOrganization(input models.Organization) (models.Organization, error)`
- `ListEmployees() ([]models.Employee, error)`
- `SaveEmployee(input models.Employee) (models.Employee, error)`
- `BulkSyncOrganizations(input []models.Organization)`
- `BulkSyncEmployees(input []models.Employee)`

这些链路的问题不只在于“没叫 DTO”，而在于 API 契约、服务边界和 ORM 实体已经混在一起。

#### D 级：伪 DTO 风险（当前需持续复核）
本轮未把仓库内所有命名为 `Request / Response / DTO` 的结构自动视为已完成，而是明确保留了“伪 DTO”风险位：

- 若结构只是对 `models.*` 做机械镜像；
- 若不存在显式 mapping；
- 若只是把实体套进 request/response 外壳；

则后续统计时应继续单独标记为 D 级，而不能计入真正 DTO 化完成率。

### 代表性证据

#### 1. 明确的模型直通证据
`server/handlers/customers.go`

- `SaveCustomerHandler` 直接 `ShouldBindJSON(&input)`，其中 `input` 为 `models.Customer`；
- 保存完成后直接 `c.JSON(http.StatusOK, input)`；
- 更新时仍通过 `Select("*").Updates(input)` 做实体覆盖式更新。

`server/handlers/workflow_routing.go`

- `GetCommandsHandler` 直接返回 `[]models.StandardCommand`；
- `SaveCommandHandler` / `UpdateCommandHandler` 入站直接绑定 `models.StandardCommand`；
- `GetRulesHandler` 直接返回 `[]models.NotificationRule`；
- `SaveRuleHandler` / `UpdateRuleHandler` 入站直接绑定 `models.NotificationRule`。

`server/handlers/quality.go`

- `SaveInspectionStandardHandler` 直接绑定 `models.InspectionStandard`；
- `SaveInspectionTaskHandler` 直接绑定 `models.InspectionTask`；
- 列表与异常查询仍直接返回实体集合。

`server/handlers/warehouse_category.go`

- `SaveWarehouseCategoryHandler` 直接绑定 `models.WarehouseCategory`；
- `options` 场景直接返回 `[]models.WarehouseCategory`；
- 分页列表虽然包了一层 `items/total/page/pageSize`，但 `items` 仍是实体集合。

`server/services/organization_service.go`

- 服务公开方法直接以 `models.Organization`、`models.Employee` 作为输入输出契约；
- 这意味着即使 handler 未来补 request/response，service 边界仍会继续泄漏 ORM model。

#### 2. 明确的 DTO 样板证据
`server/services/sales_order_dto.go` + `server/services/sales_order_mapper.go`

- 存在独立 `SaveSalesOrderRequest`、`PatchSalesOrderRequest`、`SalesOrderResponse`、`SalesOrderListResponse`；
- 存在 `MapSaveSalesOrderRequestToModel`、`MapPatchSalesOrderRequestToModel`、`MapSalesOrderToResponse`；
- request、response、model 三者分层明确，可作为后续交易域 DTO 治理样板。

`server/services/workflow_dto.go` + `server/services/workflow_mapper.go`

- 存在独立 `SaveWorkflowDefinitionRequest`、`WorkflowDefinitionResponse`、`WorkflowInstanceResponse`、`WorkflowTaskResponse`；
- 存在 `MapWorkflowDefinitionToResponse`、`MapWorkflowInstanceToResponse`、`MapWorkflowTaskToResponse`；
- 当前 workflow 主链已经具备较完整 DTO 化表达。

### 本轮结论
本轮审计后的核心判断如下：

1. 当前仓库已经有可复用的 A 级 DTO 样板，不需要从零发明模式。
2. 真正的问题不是“少几个 DTO 文件”，而是**很多模块的 API 契约、service 边界、ORM 实体仍未解耦**。
3. 首批治理不应平均撒网，而应优先处理以下三类高风险链路：
   - 请求直接绑定 model；
   - 响应直接回传 model；
   - service 公开签名直接暴露 model。
4. 从首批收益与风险比看，建议优先治理：
   - `workflow_routing`
   - `quality`
   - `warehouse_category`
   - `organization_service` / org-personnel 主链
   - `customers` 中仍未完成 DTO 化的保存链路

### 本轮验证
本轮为架构审计与文档沉淀轮，未执行业务代码改造，也未新增运行时依赖。

已完成：

- `task.md` 同步本轮 DTO 审计事项为已完成；
- `implementation_plan.md` 沉淀全局 DTO 审计框架；
- `walkthrough.md` 记录首轮全仓 DTO 分级结论与后续治理顺序。

## 2026-04-09 Notification Gateway 硬切（Phase 1）

### 变更概览
- 新增 `src/features/system-mgmt/notifications/notification-gateway.ts`，作为通知读写、归档、快照访问、批量同步的统一基础设施边界。
- 首批调用方完成迁移并切到 gateway：
  - `src/features/trading/sales/services/sales-service.ts`
  - `src/features/ai-assistant/services/ai-context-service.ts`
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
- `notification-service.ts` 移除桥接式 store 访问导出：
  - `getNotificationStateSnapshot`
  - `getNotificationMessages`
  - `archiveNotificationsByOrderId`
- `notification-service.ts` 内部通知读写/归档改为经由 `NotificationGateway`，职责收口到“规则分发与编排”。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
node scripts/verify-permissions.mjs
```
结果：通过。

## 专项：生产 `uploads/backups` 目录权限防回归固化（2026-04-09）

### 背景
生产图片上传 `Disk write failed` 的证据链已经基本锁定为：

- `app` 容器以非 root 的 `xdfcuser` 运行；
- 宿主机 `server/uploads` 曾出现 `root:root 755`；
- 该目录挂载进容器后，普通用户没有写权限。

这类问题如果只靠一次人工 `chown` 恢复，后续部署仍可能再次回归。因此本轮改动目标不是临时补丁，而是把“容器运行身份”和“宿主机挂载目录归属”固化成同一套可重复约束。

### 固化方式

#### 1. 固定 `app` 运行用户的数值身份
文件：`server/Dockerfile`

- 为运行时镜像新增显式 build args：
  - `XDFC_APP_UID`
  - `XDFC_APP_GID`
- `xdfcuser:xdfcgroup` 不再依赖 Alpine 自动分配 UID/GID；
- `/app/uploads` 与 `/app/backups` 的镜像内默认归属也同步改为同一组数值身份。

#### 2. 让 compose 构建链显式传入同一身份
文件：`server/docker-compose.yml`

- `app.build` 改为显式 `context + args`；
- 将：
  - `XDFC_APP_UID=${XDFC_APP_UID:-10001}`
  - `XDFC_APP_GID=${XDFC_APP_GID:-10001}`
 传入镜像构建；
- 这样镜像内用户身份与部署脚本准备目录时使用的是同一组值。

#### 3. 在部署脚本中固化挂载目录准备逻辑
文件：`server/deploy-prod.sh`

- 新增 `load_deploy_env()`，先读取 `server/.env` 或 `server/.env.production`；
- 新增 `prepare_app_runtime_dir()`，在每次部署前对 `./uploads` 与 `./backups` 执行：
  - `mkdir -p`
  - `chown ${XDFC_APP_UID}:${XDFC_APP_GID}`
  - `chmod 0755`
- 这样无论目录是否首次创建，部署都会把顶层挂载目录重新收敛到容器可写状态。

#### 4. 补充环境模板
文件：`.env.example`

- 新增：
  - `XDFC_APP_UID=10001`
  - `XDFC_APP_GID=10001`
- 用于明确仓库约定的默认运行时身份，并与部署脚本和镜像构建保持一致。

### 验证
已执行：

```bash
docker compose -f server/docker-compose.yml config
```

结果：**通过**。

展开后的 compose 配置中可确认：

- `app.build.args.XDFC_APP_UID = 10001`
- `app.build.args.XDFC_APP_GID = 10001`
- `app` 仍挂载：
  - `./uploads -> /app/uploads`
  - `./backups -> /app/backups`

### 本轮结论
本轮已完成仓库侧的防回归固化：

- 容器运行用户身份已显式固定；
- 部署脚本会在每次部署前主动修正运行目录顶层属主与权限；
- 后续生产恢复不再依赖“记得手工 `chown` 一次”这种一次性动作。

## 专项：本地 DEV `/uploads` 访问链补齐（2026-04-08）

### 问题现象
图片上传主链恢复后，本地页面里上传返回已成功，浏览器对图片资源请求也显示：

- `GET /uploads/ev-*.webp 200 OK`

但页面预览仍显示坏图。

继续复核前端预览链与本地开发代理后确认：

- 前端最终预览地址来自 `getStaticEvidenceUrl(...)`；
- 上传成功后会访问 `/uploads/{fileName}`；
- 当前 `vite.config.ts` 只代理 `/api`，未代理 `/uploads`；
- 因此本地 `127.0.0.1:5173/uploads/*` 请求会落到 Vite Dev Server，而不是后端静态资源提供方。

这属于本地 DEV 访问链缺口，不是本轮 Rust 图像处理再次失败；同时仓库中的生产 Nginx 与容器内 Nginx 已存在 `/uploads/` 映射，因此该问题本质上是“本地与生产访问语义不一致”。

### 修复方式
文件：`vite.config.ts`

已执行最小修复：

- 保留现有 `/api` 代理；
- 新增 `/uploads` 代理；
- `/uploads` 与 `/api` 统一复用现有 `VITE_PROXY_TARGET` / `proxyTarget`；
- 不新增新的上传资源地址环境变量，避免本地与生产再次分叉。

### 最小验证口径
本轮代码改动完成后，应按以下口径做本地回归：

1. 重启前端 Vite Dev Server；
2. 在现有已登录 DEV 会话中重新上传一张图片；
3. 确认浏览器请求 `/uploads/ev-*.webp` 时返回真实图片内容；
4. 确认页面中的图片预览可正常显示；
5. 确认 `/api` 现有代理行为未受影响。

### 本轮结论
本轮已完成本地 DEV 上传资源访问链补齐：

- Vite 开发环境现已同时代理 `/api` 与 `/uploads`；
- 本地图片预览链路已与生产站点保持同一访问语义；
- 后续凡是依赖 `/uploads/` 的页面回显问题，都可以在 DEV 阶段更早暴露与验证。

## 专项：图片上传 pHash 长期稳定修复（2026-04-08）

### 问题现象
前端代理修正为命中正确后端后，销售订单图片上传仍返回：

- `500 Image processing failed`
- Go 后端日志显示：`rust image worker returned status: 400, body: Failed to decode image for perceptual hash`

继续下钻到 Rust `server/search-engine/src/processor.rs` 后确认，旧实现存在同一请求内的双解码：

- `image::load_from_memory(raw_data)` 用于宽高读取与 WebP 压缩
- `img_hash::image::load_from_memory(raw_data)` 再次独立解码用于 pHash

这意味着同一份原始字节会经过两套不同 crate 的解码路径，运行时兼容性一旦分叉，就会出现“第一次能解、第二次不能解”的稳定失败。

### 长期修复方式
本轮没有继续做补丁式兜底，而是改为单次权威解码与统一像素管线：

#### 1. Rust 图像处理改为单次权威解码
文件：`server/search-engine/src/processor.rs`

- 保留一次 `image::load_from_memory(raw_data)` 作为唯一权威解码入口；
- 解码成功后立即转换为统一的 `RGBA8` 像素缓冲；
- 后续处理不再从 `raw_data` 重新走第二次独立解码。

#### 2. pHash 改为消费统一像素数据
- 不再调用 `img_hash::image::load_from_memory(raw_data)`；
- 改为用统一 `RGBA8` 像素缓冲构造 `img_hash` 可接受的图像对象；
- 让 pHash、宽高读取、WebP 编码三步共享同一份图像事实来源。

#### 3. 补充最小定向验证
- 在 `server/search-engine/src/processor.rs` 新增定向测试 `process_image_handles_png_sample`；
- 直接使用仓库现成样本 `public/images/shadcn-admin.png` 调用 `process_image(...)`；
- 断言：
  - `width > 0`
  - `height > 0`
  - `phash` 非空
  - `webp_data` 非空

### 验证结果

#### 1. 本地 Rust 编译验证
执行：

```bash
cargo build -j 1
```

结果：**通过**。

说明当前 `processor.rs` 的单解码实现与现有依赖组合兼容。

#### 2. Docker 镜像重建验证
执行：

```bash
docker pull rust:1.88-alpine
docker pull alpine:latest
docker compose build search-engine
docker compose up -d search-engine
```

结果：**通过**。

说明新的 Rust 处理逻辑已成功进入 `search-engine` 镜像并完成容器重建。

#### 3. 定向函数级验证
执行：

```bash
cargo test process_image_handles_png_sample -- --nocapture
```

结果：**通过**。

说明对真实 PNG 样本，新的 `process_image(...)` 已能完成：

- 单次解码
- pHash 生成
- WebP 编码

### 运行态附注
本轮尝试过在容器内用 BusyBox `wget --post-file` 直接回放二进制图片到 `/v1/process-image`，但诊断日志显示：

- `body_len=8`
- `body_prefix=89 50 4E 47 0D 0A 1A 0A`

也就是该测试方式只发出了 PNG 文件头 8 字节，而非完整图片，因此随后出现的：

- `Failed to decode image from memory`

不能作为当前业务修复失败的结论。该现象属于容器内临时 HTTP 工具链对二进制请求体的失真，不代表新的 `process_image(...)` 处理链仍然失败。

### 本轮结论
本轮已完成图片上传 pHash 根因的长期稳定修复：

- 已移除旧的“双解码分叉”结构；
- `search-engine` 已切换为“单次权威解码 + 统一像素管线”；
- Rust 本地编译、Docker 重建、真实 PNG 样本函数级测试均已通过。

当前若要补最后一层业务闭环，只剩在现有已登录 DEV 会话中再做一次真实页面上传回归，确认前端上传不再返回 `500`。

## 专项：`search-engine` Docker 构建链修复（2026-04-08）

### 问题现象
本地执行 `pnpm run dev:stack` 后，`search-engine` 在 Docker 构建阶段失败，外层表现为：

- `cargo build --release` 退出码 `101`
- `docker compose up -d --build search-engine app nginx_lb watchdog` 失败

进一步展开构建日志后，根因分为四层：

1. `server/search-engine/Dockerfile` 使用的 `rust:1.75-alpine` 过旧；
2. Dockerfile 只复制 `Cargo.toml`，未复制仓库中已有的 `Cargo.lock`，导致依赖解析漂移；
3. `Cargo.lock` 中的 `zstd-sys 2.0.16+zstd.1.5.7` 与 `zstd-safe 6.0.6` 组合不兼容；
4. 构建链恢复后，Rust 源码本身还暴露出若干真实编译错误。

### 修复方式

#### 1. 修复 Docker 构建链
- 将 `server/search-engine/Dockerfile` 的 builder 从 `rust:1.75-alpine` 升级为 `rust:1.88-alpine`；
- 在依赖缓存层同时复制：
  - `Cargo.toml`
  - `Cargo.lock`

#### 2. 修复锁文件依赖失配
- 使用 Cargo 将 `zstd-sys` 从：
  - `2.0.16+zstd.1.5.7`
- 回退锁定到：
  - `2.0.9+zstd.1.5.5`

这样 `zstd-safe 6.0.6` 才能和底层绑定保持兼容。

#### 3. 修复 Rust 源码真实编译错误
- `src/main.rs`
  - 将 `StatusCode.OK` 修正为 `StatusCode::OK`
  - 先保存 `results.len()`，避免 `items: results` 后再次借用
- `src/processor.rs`
  - pHash 计算改为使用 `img_hash::image::load_from_memory(raw_data)` 单独解码
  - 避免 `img_hash` 内部 `image` 类型与项目直接依赖的 `image` crate 类型冲突

### 验证结果
已执行：

```bash
docker compose build search-engine
```

结果：**通过**。

日志显示：

- `server-search-engine Built`
- 最终镜像成功导出并命名为 `server-search-engine:latest`

### 本轮结论
本地 DEV 一键启动链此前失败的关键阻塞点已解除：

- `search-engine` 已恢复可构建；
- Rust 工具链与锁文件依赖已收敛到可用组合；
- Docker 构建现已能进入并完成真实业务代码编译。

## 专项：本地 DEV 一键启动链补齐（2026-04-08）

### 问题现象
本地开发时虽然已有前端与后端启动入口，但图片上传链仍会因为缺少 Rust 图像处理服务而失败：

- `pnpm dev` 只启动前端 Vite；
- `server/dev-up.ps1` 原先只启动 `db/redis/app/nginx_lb/watchdog`；
- Rust `search-engine` 未被纳入本地 DEV 启动链。

### 修复方式
已执行最小补齐：

#### 1. `server/dev-up.ps1`
- 保留原有本地数据库健康检查与 `-ResetDb` 自愈逻辑；
- 将启动服务从 `app/nginx_lb/watchdog` 扩展为：
  - `search-engine`
  - `app`
  - `nginx_lb`
  - `watchdog`
- 完成后终端会额外输出：`Search engine: http://localhost:8081`

#### 2. 根目录 `package.json`
- 新增：`pnpm run dev:stack`
- 新增：`pnpm run dev:stack:reset-db`
- 保持原有 `pnpm dev` 仅启动前端的语义不变。

### 使用方式

#### 只启动前端
```bash
pnpm dev
```

#### 启动完整本地栈（前提：已先单独开前端或按需再执行 `pnpm dev`）
```bash
pnpm run dev:stack
```

#### 本地数据库凭据不一致时重建本地 DB 数据
```bash
pnpm run dev:stack:reset-db
```

### 本轮结论
本轮已补齐本地 DEV 图片上传链的基础运行条件：

- 现有 `server/dev-up.ps1` 已纳入 Rust `search-engine`；
- 根目录已有清晰快捷入口；
- 后续本地排查图片上传问题时，不再需要手工遗漏图像处理服务。

## 专项：`search-engine` 纳入生产部署链（2026-04-08）

### 问题现象
虽然顶层部署命令会执行 `deploy.sh -> server/deploy-prod.sh`，但原有生产部署路径存在明显缺口：

- `server/docker-compose.yml` 未声明 `search-engine` 服务；
- `server/deploy-prod.sh` 默认只重建 `app`；
- 因此 `server/search-engine/src/processor.rs` 的修复不会随默认部署自动发布到服务器。

### 根因分析
当前仓库里虽然已有 `server/search-engine/Dockerfile`，但该 Rust 图像处理服务没有正式接入生产 compose 编排；同时 `app` 继续依赖宿主机 `localhost:8081` 的默认假设，不适合容器内服务间通信。

### 修复方式
已执行最小部署链修复：

#### 1. `server/docker-compose.yml`
- 新增 `search-engine` 服务，构建上下文为 `./search-engine`；
- 容器内暴露 `8081`；
- 为 `app` 注入：`SEARCH_ENGINE_URL=${SEARCH_ENGINE_URL:-http://search-engine:8081}`；
- 为 `app.depends_on` 增加 `search-engine`。

#### 2. `server/deploy-prod.sh`
- 默认部署路径由仅重建 `app`，调整为同时 `--build search-engine app`；
- `--full-build` 路径纳入 `search-engine`；
- `--no-build` 与 `--watchdog-build` 路径也通过 `DEFAULT_SERVICES` 保证 `search-engine` 会被启动。

### 使用方式
修复后，服务器仍可继续沿用你现有的部署入口：

```bash
chmod +x deploy.sh && ./deploy.sh
```

区别在于：现在默认部署会把 `search-engine` 一起构建并启动，因此 Rust 图像处理修复具备了真正发布到服务器的路径。

### 本轮结论
本轮已补齐图片上传依赖的 Rust 图像处理服务部署缺口：

- `search-engine` 已成为正式的生产 compose 服务；
- `app` 已改为使用容器内服务地址访问它；
- 默认部署命令现在可以真正把 Rust 图像处理改动发布到服务器。

## 专项：销售订单图片上传 `500 Image processing failed` 修复（2026-04-08）

### 问题现象
在上一轮修复上传路径后，销售订单图片上传已能命中后端接口，但继续报：

- `/sales-orders/evidence/upload` 返回 `500`
- 前端提示 `Image processing failed`
- 错误发生在后端 `HandleEvidenceUpload(...)` 调用 Rust 图像处理链期间

### 根因判断
本轮复核确认：

- 不是文件体积超限；超限按现有逻辑应返回 `413`
- 不是 Redis 未初始化；当前实现只会降级跳过 pHash 去重，不会返回 `500`
- 真实高风险点位于 Rust `/v1/process-image`：
  - `image::load_from_memory(...)` 图像解码
  - `webp::Encoder::from_image(...)` WebP 编码器创建

结合当前实现方式，优先判断为 WebP 编码输入格式兼容性不足，同时 Go 侧又吞掉了 Rust 的真实错误文本，导致前端只能看到笼统的 `Image processing failed`。

### 修复方式
已执行两类底层修复：

#### 1. Go 侧错误可观测性增强
文件：`server/services/search_client.go`

- `ProcessImage(...)` 在 Rust 返回非 `200` 时，现会读取响应体内容；
- 错误会同时带上：
  - Rust 返回状态码
  - Rust 真实错误文本
- 这样后端日志可直接区分“图像解码失败”与“WebP 编码失败”。

#### 2. Rust 侧 WebP 编码兼容性修复
文件：`server/search-engine/src/processor.rs`

- 不再直接把 `DynamicImage` 原样传给 `Encoder::from_image(...)`；
- 改为先显式转换为稳定的 `RGBA8` 像素缓冲；
- 再通过 `Encoder::from_rgba(...)` 进行 WebP 编码；
- 额外增加空编码结果保护，避免返回空 payload。

### 验证
已执行：

```bash
go test ./services -run ^$
```

结果：通过。

## 2026-04-09 删除 7 个旧 requirements 组件兼容壳

### 变更概述
- 物理删除以下 Trading 侧旧组件壳文件：
  - `src/features/trading/components/requirements/mold-requirement-alert.tsx`
  - `src/features/trading/components/requirements/requirement-drawer.tsx`
  - `src/features/trading/components/requirements/requirement-list.tsx`
  - `src/features/trading/components/requirements/requirement-row.tsx`
  - `src/features/trading/components/requirements/requirement-stats.tsx`
  - `src/features/trading/components/requirements/selection-tree.tsx`
  - `src/features/trading/components/requirements/supply-analysis-details.tsx`
- 删除依据：
  - 当前真实页面实现已经完全切换到 `src/features/mrp/components/requirements/*`
  - 对旧 Trading 组件路径的外部消费已清零
  - 删除不影响当前 `/trading/requirements` 路由与模块入口

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 Service 纯净化（Service Purity）第一批治理

### 变更概述
- 共享错误处理链纯化：
  - `src/lib/handle-server-error.ts`
  - 拆出 `getServerErrorPresentation(...)` 与 `showServerErrorToast(...)`
  - `handleServerError(...)` 保留为兼容 UI 适配入口，不再把“错误解析”和“错误展示”硬绑成单一实现点。
- 共享异常出口纯化：
  - `src/lib/safe-catch.ts`
  - 改为先走纯错误解析，再由 UI 展示适配函数负责 toast，降低底层工具对单一 UI 实现的耦合。
- 共享 mutation 辅助纯化：
  - `src/lib/react-query-mutation.ts`
  - 移除默认 `successMessage -> toast.success(...)` 行为。
  - 默认失败路径改为仅做日志上报，不再由底层工具自动决定 UI 提示。
- 首批 Hook 显式承接成功提示：
  - `src/features/quality/hooks/use-quality.ts`
  - `src/features/logistics/hooks/use-logistics.ts`
  - 成功提示已上浮到 Hook `onSuccess`，失败提示继续由调用方显式处理。
- 业务 Service 越权清理：
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
  - 移除 service 内 `toast.success(...)`，保持扫描函数只返回 `newCount`。
  - `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
  - 扫描完成提示已上浮到 Hook 层，根据 `scannedCount` 决定是否 toast。
- AI 相关 Service 越权清理：
  - `src/features/ai-assistant/services/ai-action-bus.ts`
  - 改为返回结构化 `ActionDispatchResult`，不再在 service 内直接 toast。
  - `src/features/ai-assistant/services/ai-agent-service.ts`
  - 不再在后台任务 service 内直接 toast，改为维护 `lastError` 状态并通知订阅方。
  - `src/features/ai-assistant/components/daily-insight-modal.tsx`
  - 接住 `ActionDispatchResult.errorMessage` 并在组件层 toast。
  - `src/features/ai-assistant/components/ai-trigger.tsx`
  - 监听 `aiAgentService` 状态，在组件层消费并清理 `lastError`。
  - `src/components/config-drawer.tsx`
  - 手动 `forceRun(...)` 的失败反馈由 UI 层显式承接。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- `Service / lib` 这条主链已经开始从“底层顺带做 UI 提示”收口到“底层返回事实，Hook / Component 决定提示”。
- `handle-server-error` 与 `react-query-mutation` 两个高扩散共享层已完成第一步纯化，为后续继续治理其他业务模块提供了统一样板。
- `dispatch-service` 与 AI 相关 service 的直接 toast 越权已被移除，提示职责已上浮到对应 Hook / Component。

### 遗留说明
- `workflow-core` 相关文件仍存在一批既有 `any` 类型 lint，属于该模块原有类型债，不是本轮 Service Purity 改造引入的新问题。
- 当前 `tsc --noEmit` 已通过；未对与本轮目标无关的 Tailwind 建议类 warning 做额外处理。

## 2026-04-09 Service 纯净化（Service Purity）第二批治理

### 变更概述
- `workflow-core` 关键类型债收口：
  - `src/features/system-mgmt/workflow-core/services/routing-service.ts`
  - `patchCommand(...)` / `patchRule(...)` 已从 `any` 切换为 `DeltaSet`。
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
  - 新增 `DispatchContext`、`OrderSnapshot`、metadata 读取辅助函数，核心扫描逻辑不再直接依赖多处 `any`。
  - 已将 `uniqueKey / OrderId / SegmentId` 等关键元数据访问改为显式字符串提取函数，降低通知扫描链路的隐式类型漂移。
- `workflow-core` Hook / 组件类型债收口：
  - `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
  - `addRule(...)` 已使用明确的 `NotificationRuleCreateInput`，去掉新增链路中的 `as any`。
  - `src/features/system-mgmt/workflow-core/components/command-mgmt/command-form.tsx`
  - 表单层 `bindType` / `nodeType` 的 `setValue(...)` 已改为消费 `StandardCommand` 对应字段类型，去掉显式 `any`。
- 通知跨域桥接收口：
  - `src/features/system-mgmt/notifications/notification-service.ts`
  - 新增 `getNotificationMessages()` 与 `archiveNotificationsByOrderId(...)` 作为通知读写桥接入口。
  - 让其他 service 不再直接把 `useNotificationStore.getState()` 当作跨域基础设施 API 使用。
- 更多 service/lib 子域边界收口：
  - `src/features/trading/sales/services/sales-service.ts`
  - 删除销售单后归档通知，已改为调用 `archiveNotificationsByOrderId(...)`。
  - `src/features/ai-assistant/services/ai-context-service.ts`
  - AI 上下文采集读取通知消息，已改为调用 `getNotificationMessages()`。
  - 同时将 `injectLocalContext(...)` 的输入从 `Record<string, any>` 收口为 `Record<string, unknown>`。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- 第二批治理已把 `workflow-core` 中最影响继续推进的关键 `any` 和通知扫描元数据访问收口到可维护状态。
- 通知能力已开始从“各处 service 直接碰 Zustand store”收口为“通过 notification-service 桥接函数访问”，降低了跨域状态耦合扩散风险。
- `sales-service` 与 `ai-context-service` 已不再直接依赖 `notification-store`，符合 `Service Purity` 中“底层 service 不直接绑状态容器细节”的目标。

### 遗留说明
- `dispatch-service.ts` 仍保留对通知写入能力的直接依赖，这是当前通知编排链路的领域事实源接入点，后续若继续纯化可再抽出更正式的 notification gateway。
- `notification-service.ts` 与 `notification-store.ts` 仍存在部分历史 `any` / 兼容性占位字段，属于通知域自己的存量类型债，当前未扩散为整域重构。
- 当前 `tsc --noEmit` 已通过；未处理与本轮目标无关的 Tailwind 建议类 warning。

### 本轮结论
- Trading 侧 `requirements` 旧组件兼容壳已完成物理清理。
- 当前 `requirements` 视图层只保留 `MRP` 新模块实现，结构进一步收敛。
- `src/features/trading/tabs/index.tsx` 中遗留的 `PartRequirements` 兼容导出已移除，Trading tabs 不再承担该页面转发职责。

## 2026-04-09 旧 requirements 组件归属收口

### 变更概述
- 盘点 `src/features/trading/components/requirements/*` 的现状后，确认当前真实页面实现已经由 `MRP` 新模块承载。
- 因此将以下旧组件统一收口为兼容导出：
  - `mold-requirement-alert.tsx`
  - `requirement-drawer.tsx`
  - `requirement-list.tsx`
  - `requirement-row.tsx`
  - `requirement-stats.tsx`
  - `selection-tree.tsx`
  - `supply-analysis-details.tsx`
- 上述文件现在均转发到：
  - `@/features/mrp/components/requirements/*`

### 本轮结论
- `Trading/components/requirements/*` 已不再承载真实实现，只保留历史兼容入口职责。
- `requirements` 视图层的真实归属已进一步收口到 `MRP` 模块。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 customer/supplier 列表接口响应显式 DTO 化

### 变更概述
- 新增 `server/services/partner_list_dto.go`：
  - `PartnerListPaginationMeta`
  - `CustomerListStats`
  - `SupplierListStats`
  - `CustomerListMetadata`
  - `SupplierListMetadata`
  - `CustomerListResponse`
  - `SupplierListResponse`
- 调整 `server/handlers/customers.go`：
  - 将列表响应从 `gin.H` 匿名拼装改为显式 `services.CustomerListResponse`。
- 调整 `server/handlers/suppliers.go`：
  - 将列表响应从 `gin.H` 匿名拼装改为显式 `services.SupplierListResponse`。

### 设计收口
- 继续保留现有前端兼容字段：`items / total / page / pageSize / metadata.pagination / metadata.stats`。
- 这次改动只把响应契约从匿名 map 收口为显式 struct，不改变接口字段名与现有消费方式。
- 后续如果再补 customer/supplier 相关测试或响应字段，可以直接围绕 DTO 结构扩展，而不是继续散落在 handler 的 `gin.H` 中。

### 验证
执行：
```bash
go test ./handlers ./services -run "Customer|Supplier|Partner"
```

结果：通过。

### 补充清理：移除销售订单前端事务路由遗留代码
- 已物理删除以下前端事务路由遗留文件：
  - `src/features/trading/hooks/sales-order-save-plan.ts`
  - `src/features/trading/hooks/sales-order-save-executor.ts`
- 复核结果：仓库内已无 `buildSalesOrderSavePlan`、`executeSalesOrderSavePlan`、`sales-order-save-plan`、`sales-order-save-executor` 剩余引用，且 `pnpm exec tsc --noEmit` 继续通过。

补充执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 销售订单保存路径后端收敛为单一入口

### 变更概述
- 前端 `src/features/trading/hooks/use-sales-order-save.ts`：
  - 编辑保存不再根据 `delta` 内容、行结构差异和状态字段组合自行选择不同 mutation；
  - 现统一调用 `saveMutation`，仅提交 `delta + finalData + expectedVersion`。
- 前端 `src/features/trading/sales/services/sales-transaction-service.ts`：
  - 新增 `SALES_TRANSACTION_INTENT_ORDER_SAVE = 'ORDER_SAVE'`；
  - 新增 `saveSalesOrderTransaction()`，统一走 `/sales-orders/:id/transactions`。
- 前端 `src/features/trading/sales/hooks/use-sales-transactions.ts`：
  - 新增 `saveMutation`，封装统一销售订单保存事务调用；
  - 保留既有细分 mutation，避免其他非本轮主链场景被强行打断。
- 后端 `server/services/sales_transaction_service.go`：
  - 新增 `SalesTransactionIntentOrderSave`；
  - 新增 `SalesOrderSavePayload`；
  - 新增 `executeOrderUnifiedSaveTx()`，由后端根据 `delta + finalData` 在服务层内部判定：
    - 客户变更
    - 分类/型号/条码变更
    - 交期变更
    - 状态迁移/作废
    - 采购单号变更
    - requirements 变更
    - 行内容变更 / 行新增 / 行删除 / 全量行变更
    - 以及通用 patch 场景
  - 对外单一入口，内部继续复用既有细分事务实现。

### 设计收口
- 前端不再充当“事务路由器”，不再根据领域语义决定调用哪条后端 mutation。
- 后端成为唯一的业务语义裁决方；若内部仍需细分事务处理，只在服务层内部完成分派。
- 继续保留 `expectedVersion` / 版本冲突语义，没有为了入口统一退回到粗暴全量覆盖保存。

### 保留项
- `sales-order-save-plan.ts` 与 `sales-order-save-executor.ts` 本轮已不再是主保存链依赖；
- 为降低本轮删除风险，暂未强行物理删除，可作为后续文档化清理项处理。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run "SalesOrder|SalesTransaction"
```

结果：通过。

### 补充收口：前端 metadata.stats 缺失态显式提示
- 增强 `src/features/trading/components/customer-list.tsx`：
  - 当 `metadata.stats.total / active / newThisMonth` 任一缺失时，在统计卡片上方显示中文/英文显式提示；
  - 统计卡片数字降为占位符 `—`；
  - 不再回退到前端基于当前列表数组的本地重算。
- 增强 `src/features/trading/components/supplier-list.tsx`：
  - 当 `metadata.stats.total / active / pendingReview` 任一缺失时，在统计卡片上方显示中文/英文显式提示；
  - 统计卡片数字降为占位符 `—`；
  - 不再回退到前端基于当前列表数组的本地重算。
- 这样即使后端契约异常退化，列表主体仍可继续浏览，但统计区会明确暴露“契约缺失”，而不是静默给出错误数字。

补充执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

另执行：

```bash
cargo check
```

结果：未完成，当前被本机 `server/search-engine/target/...` 构建产物文件锁阻塞（Windows `os error 32`，另一个进程正在占用文件），属于本地环境占用问题，不是当前代码链已确认的业务错误口径。

### 本轮结论
本轮已从底层收敛图片上传 `500` 的两个核心问题：

- Go 侧不再吞掉 Rust 真实错误上下文；
- Rust 侧 WebP 编码改为使用稳定的 `RGBA8` 输入格式；

当前剩余事项仅为：待释放本机 Rust 构建文件占用后，再补一次 `cargo check` 或实际上传回归验证。

## 专项：销售订单图片上传 404 修复（2026-04-08）

### 问题现象
在“创建销售订单”时上传订单凭据图片，前端控制台报错：

- `/trading/sales-orders/evidence/upload` 返回 `404 Not Found`
- UI 提示 `Evidence upload failed [API_ERROR] 404 Not Found`
- 页面同时显示“存储服务同步失败”

### 根因分析
本轮先完成代码级排查，确认主因不是 Redis 未就绪，也不是 Rust 图像处理服务先崩溃，而是前后端上传路径契约漂移：

1. 前端 `order-evidence-manager.tsx` 之前调用的是 `'/trading/sales-orders/evidence/upload'`；
2. `apiFetch(...)` 会统一拼接 `/api/v1` 前缀，因此真实请求变成 `/api/v1/trading/sales-orders/evidence/upload`；
3. 后端 `server/routes/routes_trading.go` 实际注册的是 `POST /api/v1/sales-orders/evidence/upload`；
4. 因此前端多出的 `/trading` 前缀直接导致 `404`，请求未命中 `HandleEvidenceUpload`；
5. 若是 Rust 不可用，后端按当前逻辑会返回 `503 Image worker offline`；若 Rust 处理失败，会返回 `500 Image processing failed`；若 Redis 未初始化，仅会降级跳过 pHash 去重，不会返回 `404`。

### 修复方式
已执行最小修复：

- 将 `src/features/trading/components/parts/order-evidence-manager.tsx` 中的上传地址从 `/trading/sales-orders/evidence/upload` 改为 `/sales-orders/evidence/upload`；
- 将 `src/locales/messages/zh-CN/tradingSalesOrder.ts` 中误导性的失败文案从“存储服务同步失败”改为“图片上传失败”。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本次订单图片上传失败的第一根因已确认并修复：

- 主因是前端上传路径多写了 `/trading` 前缀；
- Redis 与 Rust 不是本次 `404` 的主因；
- 当前前端已改为命中后端真实存在的上传接口；
- 用户侧失败提示也已与真实语义对齐，不再把路由问题误报为存储同步失败。

## 专项：`error-action-registry` / `translate` 类型对齐修复（2026-04-08）

### 问题现象
部署机构建失败，报错点位于 `src/lib/handle-server-error.ts`：

```ts
translate(locale, actionMetadata.messageKey)
translate(locale, actionMetadata.actionLabelKey)
```

`translate` 要求第二个参数为 `TranslationKey`，但 `error-action-registry.ts` 中的 `messageKey` / `actionLabelKey` 被声明为普通 `string`，导致 `tsc` 报 `TS2345`。

### 修复方式
本轮采用最小修复：

- 在 `src/lib/error-action-registry.ts` 中引入 `TranslationKey`；
- 将 `messageKey` 收紧为 `TranslationKey`；
- 将 `actionLabelKey` 收紧为 `TranslationKey | undefined`；
- 不继续扩大 `handle-server-error.ts` 中的 `as any` 覆盖范围；
- 让错误动作注册表在定义期就接受 i18n key 合法性校验。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 结论
本次失败的根因不是部署脚本，而是前端严格类型构建拦截了 `string -> TranslationKey` 的不兼容传参。修复后，`handle-server-error.ts` 对 `translate(...)` 的调用已重新满足类型约束。

## 专项：`customer / supplier` 核心标识字段变更事务化（2026-04-08）

### 本轮目标
在已完成 `customer.status` / `supplier.status` 主数据事务化后，继续为更高语义密度的主数据动作建立显式 transaction：主体核心标识字段变更。

本轮限定只处理：

- `customer.code`
- `customer.name`
- `supplier.code`
- `supplier.name`

### 本轮实际执行
已完成：

- 后端 `partner_transaction_service.go` 新增：
  - `CUSTOMER_IDENTITY_CHANGE`
  - `SUPPLIER_IDENTITY_CHANGE`
- transaction payload 仅允许 `code` / `name`；
- 事务链继续复用：
  - 乐观锁版本控制
  - 主数据存在性校验
  - 审计日志写入
  - `code` 唯一性校验
- 前端 `customer-service.ts` / `supplier-service.ts` 已新增 identity change transaction 请求；
- 前端 hooks 已新增 `identityChangeMutation`；
- `customer-list.tsx` / `supplier-list.tsx` 已在纯 `code`、纯 `name`、`code + name` 变更时优先走显式 transaction；
- 若混入其他普通档案字段，仍继续保留在原有 `patch` 链中。

### 本轮分流边界
- 仅当 delta 只包含 `code` / `name` 时命中 identity transaction；
- `status` 仍继续命中上一轮已落地的 status transaction；
- 若同时混入联系人、地址、分类、主营产品等字段，则不进入本轮 identity intent；
- 新建场景继续走现有 create；
- 前端未新增任何唯一性猜测逻辑，最终裁决仍以后端为准。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run "Customer|Supplier"
```

结果：通过。

### 本轮结论
`customer / supplier` 第二批主数据 TDO 已完成：

- 核心标识字段变更已具备显式 transaction 语义；
- 纯身份字段变更与普通混合档案编辑已形成稳定分流；
- 未破坏现有 `patch` 兜底链与前后端编译测试。

## 专项：`trading/customer` / `trading/supplier` 主数据 TDO 接入（2026-04-08）

### 本轮目标
在订单域局部事务化后，回到主数据域，优先为 `customer` 与 `supplier` 当前仍以 CRUD + `patch` 为主的编辑链路接入最窄语义的显式 TDO，同时继续保留 `patch` 作为普通混合档案编辑的兜底。

### 本轮实际执行
本轮没有强拆普通档案混合编辑，而是先落地最稳定、最单一的主数据动作：状态变更。

已完成：

- 后端新增 `customer` / `supplier` 状态变更 transaction 服务与 handler；
- 新增路由：`POST /customers/:id/transactions`、`POST /suppliers/:id/transactions`；
- 为 `customer` 补齐了现有前端已依赖但后端缺失的 `PATCH /customers/:id` 兜底链；
- 前端 `customer-service.ts` / `supplier-service.ts` 增加状态变更 transaction 请求；
- 前端 hooks 增加 `statusChangeMutation`；
- `customer-list.tsx` / `supplier-list.tsx` 已在纯 `status` 变更时优先命中显式 transaction；
- `customer-action-dialog.tsx` 增加了最小状态编辑入口，便于触发纯状态事务；
- 若混入其他普通档案字段，仍继续保留在原有 `patch` 链中。

### 本轮边界确认
- 本轮只接入 `customer.status` / `supplier.status` 这类单语义主数据动作；
- 未把 customer / supplier 的普通档案混合编辑强行包装为 transaction；
- `patch` 仍是主数据维护场景的安全兜底；
- 主数据状态校验继续以后端裁决为准，前端不做规则猜测。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run "Customer|Supplier"
```

结果：通过。

### 本轮结论
`trading/customer` / `trading/supplier` 已完成第一批主数据 TDO 接入：

- 主数据状态变更已具备显式 transaction 语义；
- 普通混合档案编辑继续保留在 `patch`，未破坏现有兜底链；
- `customer` 原先缺失的 patch 后端入口也已补齐，现有前端链路恢复闭环。

## 专项：`purchase` 头部第二刀：供应商主体变更事务化（2026-04-08）

### 本轮目标
在已完成 `purchase` 的 `expectedDate` 事务化与三类基础行级事务后，继续压缩采购订单编辑中的 `patchMutation` 承担面，并收口采购订单供应商主体切换这一稳定头部语义。

### 本轮现状复核
本轮进入实现前复核确认到：

- 前端已存在 `ORDER_SUPPLIER_CHANGE` 常量与事务请求封装；
- `use-purchase-orders.ts` 已存在 `supplierChangeMutation`；
- `purchase-order-action-dialog.tsx` 已存在纯 `supplierId` / `supplierName` 变更分流；
- 后端 `purchase_transaction_service.go` 已存在 `PurchaseTransactionIntentSupplierChange` 与 `executePurchaseOrderSupplierChangeTx(...)`；
- 该链路已按版本控制、供应商存在性校验、审计与快照返回完成闭环。

因此本轮无需新增业务代码，重点转为确认当前仓库状态与规划边界一致，并完成验证与文档收口。

### 本轮实际确认结果
- `ORDER_SUPPLIER_CHANGE` 已落地为正式 `purchase` transaction intent；
- 仅当 delta 仅涉及 `supplierId` / `supplierName` 时，采购编辑弹窗才命中 `supplierChangeMutation`；
- 若混入其他头部字段或行级字段，仍继续保留在现有 transaction / `patch` 链中；
- 后端会复用现有供应商数据源校验供应商是否存在，并在必要时回填 `supplierName`；
- 更新后仍返回最新采购订单快照并写入审计日志。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮确认 `purchase` 头部第二刀——供应商主体变更事务化——已在仓库中落地且验证通过：

- 采购头部供应商主体切换已具备独立 transaction 语义；
- `purchase` 编辑弹窗对纯供应商主体切换与混合编辑的分流边界清晰；
- 当前无需重复补码，可直接视为本轮治理项已完成并已完成验证收尾。

## 请假管理模块闭环（仅本人申请）

### 本轮完成内容
- 前端身份链补齐：`AuthUser` 新增 `employeeId`，登录成功与 `/auth/snapshot` 同步流程都会将当前用户绑定的员工档案 ID 写入 store，解决“仅本人申请”场景下前端拿不到员工身份的问题。
- 后端请假 authority 链路补齐：新增 `server/services/leave_service.go`、`server/handlers/leave_handlers.go`、`server/routes/routes_leave.go`，正式提供 `GET /leaves/my`、`GET /leaves/stats`、`POST /leaves/preview`、`POST /leaves`、`POST /leaves/:id/cancel`。
- 后端严格限定“仅本人申请”：服务层通过当前登录用户 `userId -> users.employee_id -> employees.id` 解析员工身份，创建与试算均以后端解析出的本人员工档案为准，不信任前端传入 `employeeId`。
- 后端权威试算 `durationDays`：新增请假试算逻辑，由后端依据开始/结束时间统一计算请假天数，前端不再提交终裁后的 `durationDays`。
- 前端新增独立提交链路：`leave-service.ts` 对齐新的后端契约；新增 `use-submit-leave-request.ts`；新增 `components/leave-action-dialog.tsx`，将表单、试算、提交、刷新职责隔离。
- 请假页面闭环：`leave-management.tsx` 现在可打开“新建请假申请”对话框，提交成功后自动刷新“我的请假记录”和统计卡片。

### 关键实现边界
- 本轮仅支持“本人申请”，未实现代他人申请入口。
- `employeeId` 以后端身份绑定为准，前端仅消费，不参与授权裁决。
- `durationDays` 由后端 authority 试算返回，前端只做展示。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services
```

结果：通过。

### 本轮结论
请假管理模块已从只读 mock 页面推进为“仅本人申请”的真实闭环：

- 当前登录用户可基于已绑定的员工档案发起请假申请；
- 提交前可调用后端权威试算获取请假天数；
- 提交成功后列表与统计即时刷新；
- 后端已具备正式路由、身份约束与最小撤销能力，前后端契约已对齐。

## 请假管理模块回归补强

### 本轮完成内容
- 新增 `server/services/leave_service_test.go`，覆盖请假服务的核心边界：
  - 当前登录用户绑定员工档案后，试算结果必须返回本人 `employeeId` 与 `employeeName`；
  - 创建请假申请时，记录必须以本人身份落库，并保持 `PENDING` 状态；
  - 其他员工不得撤销非本人请假申请；
  - 统计接口需正确聚合 `pending/approved/rejected` 数量，并仅累计本人已批准工日。
- 新增 `server/handlers/leave_handlers_test.go`，覆盖处理器层关键契约：
  - 未登录/缺少 `userId` 上下文时，请假试算返回 `401`；
  - 请假创建成功时，返回体需包含新建记录 ID、本人 `employeeId`、`employeeName`、`PENDING` 状态及正确 `durationDays`。
- 修复 `server/services/leave_service.go` 的隐式数据库默认值依赖：创建请假申请时改为应用层生成 ID，不再依赖数据库默认 UUID。这样既兼容现有 Postgres，也避免 SQLite 测试环境下记录 ID 为空的问题。
- 为避免 SQLite 与 Postgres 方言差异导致误报，本轮新增测试全部采用“手工建最小表结构”的方式，而不是直接对带 `gen_random_uuid()` 默认值的模型执行 `AutoMigrate`。

### 验证
执行：
```bash
go test ./handlers ./services -run Leave
go test ./handlers ./routes ./services
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理模块不仅完成了“仅本人申请”功能闭环，也补齐了自动化回归兜底：

- 关键业务约束已通过测试固化；
- 请假记录创建不再隐式依赖数据库默认主键生成；
- 前后端闭环在编译与后端回归层面均已验证通过。

## 请假管理前端交互细化

### 本轮完成内容
- 新增 `src/features/org-personnel/hooks/use-cancel-leave-request.ts`，将请假撤销能力单独封装为独立 hook，统一负责：
  - 调用 `LeaveService.cancelLeaveRequest(...)`；
  - 成功后失效“我的请假记录”和“请假统计”查询；
  - 统一 toast 成功/失败反馈。
- 增强 `src/features/org-personnel/tabs/leave-management.tsx` 的展示层：
  - 将请假状态从后端枚举值映射为中文文案：`待审批 / 已通过 / 已拒绝 / 已撤销`；
  - 为不同状态补充更清晰的 Badge 视觉区分；
  - 将请假类型从英文枚举映射为中文文案；
  - 将 `startTime / endTime` 统一格式化为 `zh-CN` 本地可读时间；
  - 对 `PENDING` 状态记录显示“撤销申请”按钮，并在请求处理中显示“撤销中...”。

### 本轮设计约束
- 本轮未引入前端权限硬拦截；“是否允许撤销”继续以后端校验为准。
- 本轮只优化展示层与交互接线，不改变后端接口结构与时间传输事实。
- 后端排班/节假日 authority 算法升级按本轮决策暂缓，未在本次执行中落地。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理页面已从“最小闭环”提升到更可用的正式交互态：

- 列表状态与请假类型不再直接暴露原始枚举；
- 时间信息对业务用户更可读；
- 待审批请假单已具备撤销入口，且撤销后能回到真实后端状态。

## 请假列表筛选、排序与详情展示

### 本轮完成内容
- 将请假列表的展示工具从页面内联逻辑中抽离到 `src/features/org-personnel/data/leave-display.ts`：
  - 统一维护请假状态中文映射；
  - 统一维护请假类型中文映射；
  - 统一维护时间格式化；
  - 新增基于现有列表数据的筛选与排序派生函数。
- 新增 `src/features/org-personnel/components/leave-list-toolbar.tsx`：
  - 支持按状态筛选；
  - 支持按请假类型筛选；
  - 支持按开始时间正序 / 倒序排序。
- 新增 `src/features/org-personnel/components/leave-detail-dialog.tsx`：
  - 可查看员工姓名与员工 ID；
  - 可查看请假类型、状态、开始时间、结束时间、工日与请假事由；
  - 与列表摘要使用同一套状态/类型/时间显示逻辑，避免展示漂移。
- 增强 `src/features/org-personnel/tabs/leave-management.tsx`：
  - 页面负责维护筛选条件、排序条件与当前选中详情记录；
  - 列表渲染改为使用派生后的 `visibleLeaves`；
  - 新增“查看详情”入口；
  - 在筛选后无结果时显示独立空态；
  - 保持现有撤销按钮与撤销刷新链路不变。

### 本轮设计约束
- 本轮继续基于现有 `LeaveService.getMyLeaveRequests()` 返回的数据完成增强，未扩展新的后端查询参数。
- 排序使用当前稳定存在的 `startTime` 字段，不依赖假设一定存在的其他时间事实。
- 详情展示采用独立 Dialog 组件，避免把列表卡片继续膨胀为复杂明细面板。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理页面已进一步具备“可浏览、可定位、可查看明细”的列表体验：

- 用户可以按状态和类型快速筛选请假记录；
- 用户可以按开始时间切换排序方式；
- 用户可以查看每条请假记录的完整详情，而不必依赖列表摘要信息。

## Trading 审计样板接入

### 本轮完成内容
- 新增后端审计模块收口文件 `server/services/audit_modules.go`：
  - 为 `sales-order` / `purchase-order` 建立统一 canonical module 值；
  - 为历史值 `SalesOrder` / `PurchaseOrder` 建立别名映射；
  - 为查询层提供别名展开能力。
- 增强 `server/services/audit_service.go`：
  - `defaultAuditLogger.Write(...)` 在落库前统一规范化 `AuditEntry.Module`；
  - 新产生的 Trading 审计日志统一写入 canonical module 值。
- 增强 `server/handlers/audit_handlers.go`：
  - `/audit/timeline` 查询从“单值精确匹配”调整为“按 canonical module + 历史别名集合兼容查询”；
  - 确保旧数据与新数据在 Trading 样板接入期间都可被时间线正常命中。
- 新增前端统一模块文件 `src/features/audit-timeline/data/audit-modules.ts`：
  - 输出 `AUDIT_MODULES`；
  - 输出 audit-engine 的模块接入配置骨架。
- 增强 Trading 前端详情页：
  - `sales-order-detail-activity.tsx` 改为使用统一 `AUDIT_MODULES.salesOrder`；
  - `purchase-order-detail.tsx` 新增 `AuditStamp`，补齐采购单详情时间线入口，并使用 `AUDIT_MODULES.purchaseOrder`。
- 收口 `src/features/audit-timeline/components/audit-engine-tab.tsx`：
  - 从静态手写 `MODULES` 切到基于 `AUDIT_ENGINE_MODULE_STATUS` 派生；
  - Trading 现在由“已接入样板实体列表”驱动状态表达，而不是裸写 `connected: true` 假象。

### 本轮设计约束
- 本轮优先做兼容式收口：既统一新写入口径，也兼容历史 `SalesOrder` / `PurchaseOrder` 数据查询。
- 本轮只把 Trading 做成“真实可验证样板”，未扩展到 Finance / Engineering / Warehouse / Equipment 全量接入。
- 本轮未新建第二套审计查询接口，继续复用 `/audit/timeline` 与既有 `AuditStamp` / `DataTimeline` 组件。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
Trading 已从“看板宣称已接入”推进为“具备真实可验证审计链路的样板模块”：

- 销售单与采购单详情均具备统一的审计时间线入口；
- Trading 审计查询不再受新旧 module 命名漂移直接阻断；
- audit-engine 中的 Trading 状态已开始建立在可维护事实映射上。

## audit-engine 真实统计升级

### 本轮完成内容
- 扩展后端审计注册表 `server/services/audit_modules.go`：
  - 为 `sales-order`、`purchase-order`、`customer`、`supplier`、`employee`、`production-line` 建立 canonical module 与历史别名归一化；
  - 新增实体到业务模块的集中映射；
  - 新增 `EntryIntegrated` 标记，沉淀“真实入口覆盖”事实；
  - 新增 audit-engine 聚合结果结构定义。
- 增强 `server/handlers/audit_handlers.go`：
  - 保持 `/audit/timeline` 的 Trading 兼容查询能力；
  - 新增 `GET /audit/engine/stats`，基于注册表与 `audit_logs` 聚合模块级真实统计；
  - 输出每个模块的目标实体数、日志覆盖数、入口覆盖数、综合覆盖率、状态与最近事件时间。
- 增强 `server/routes/routes.go`：
  - 注册 `/audit/engine/stats` 路由。
- 收口前端审计类型与 hook：
  - `src/features/audit-timeline/types.ts` 新增 `AuditEngineModuleStats` / `AuditEngineStatsResponse`；
  - 新增 `src/features/audit-timeline/hooks/use-audit-engine-stats.ts`；
  - `DiffItem` 中原有 `any` 已收口为 `unknown`。
- 收口 `src/features/audit-timeline/components/audit-engine-tab.tsx`：
  - 页面改为消费后端真实统计结果；
  - `connectedCount`、模块状态、覆盖率、最近事件时间均来自 `/audit/engine/stats`；
  - 新增 loading 态；
  - 模块卡片中显式展示 `LOG COVERAGE` 与 `ENTRY COVERAGE`，可区分“部分接入”和“完全未接入”。

### 本轮设计约束
- 本轮以“后端聚合结果”为权威源，前端不再自行裁决模块真实接入状态。
- 本轮采用“日志覆盖 + 入口覆盖”双维度统计，而非单纯看是否存在日志或是否挂了入口。
- 本轮仍基于受控注册表表达入口覆盖，未尝试动态扫描整个前端代码库来发现入口。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
audit-engine 已从“配置驱动表达”升级为“基于真实日志 / 真实入口统计”的看板：

- 模块连接数量不再来自静态数组；
- Trading 现在能同时体现“有日志 + 有入口”的真实接入状态；
- Engineering / Equipment 等存在“有日志但无入口”的模块，会被看板识别为部分接入，而不是被简单误判为未接入。

## audit-engine 真实入口补齐（方案A）

### 本轮完成内容
- 扩展前端审计 module 常量 `src/features/audit-timeline/data/audit-modules.ts`：
  - 新增 `customer`、`supplier`、`employee` canonical module 值；
  - 供各业务页面挂接真实入口时统一复用。
- 同步更新后端审计注册表 `server/services/audit_modules.go`：
  - 将 `Customer`、`Supplier`、`Employee` 的 `EntryIntegrated` 标记改为 `true`；
  - 保持 `ProductionLine` 仍为 `false`，用于真实统计继续反映“有日志无入口”现状。
- 增强 `src/features/trading/components/customer-list.tsx`：
  - 在客户卡片信息区补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.customer` + 客户 `id` 打开真实时间线。
- 增强 `src/features/trading/components/supplier-list.tsx`：
  - 在供应商卡片信息区补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.supplier` + 供应商 `id` 打开真实时间线。
- 增强 `src/features/org-personnel/data/schema.ts`：
  - 为员工前端数据模型补充可选的 `createdAt / updatedAt / createdBy / updatedBy` 字段。
- 增强 `src/features/org-personnel/components/employee-action-dialog.tsx`：
  - 在编辑弹层头部补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.employee` + 员工 `id` 打开真实时间线；
  - 仅在编辑场景展示，不对新建场景强行注入半残入口。

### 本轮设计约束
- 本轮继续复用既有 `AuditStamp` / `DataTimeline`，不新建第二套入口组件。
- 入口仅挂在现有自然承载位：客户卡片、供应商卡片、员工编辑弹层头部。
- `ProductionLine` 本轮暂未纳入，因为当前更偏结构化树/工艺配置视图，缺少稳定且自然的详情承载位；若强行接入，会引入伪详情语义。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
方案A已把 `Customer`、`Supplier`、`Employee` 从“有日志无入口”的部分接入继续推进到更完整的前端可见接入状态：

- 用户现在可以在对应业务页面直接打开这些实体的审计时间线；
- 后端真实统计中的 `entryCoverage` 将随之提升；
- `ProductionLine` 仍保留为后续单独评估项，而不是在本轮被强行塞入不合适的入口。

## 2026-04-09 客户/供应商列表统计下沉到后端 metadata/stats

### 变更概述
- 后端 `server/handlers/customers.go`：
  - 为 `GET /customers` 增加 `metadata.pagination` 与 `metadata.stats` 返回；
  - 统计口径覆盖 `total / active / newThisMonth`；
  - 保留既有 `items / total / page / pageSize` 根字段，避免现有调用方被立即打断。
- 后端 `server/handlers/suppliers.go`：
  - 为 `GET /suppliers` 增加 `metadata.pagination` 与 `metadata.stats` 返回；
  - 统计口径覆盖 `total / active / pendingReview`；
  - 同样保留既有根字段兼容结构。
- 前端 `src/features/trading/customer/services/customer-service.ts` / `hooks/use-customer.ts`：
  - 保留 `getCustomers()` 作为 `options=true` 选项数组接口；
  - 新增 `getCustomerList()` / `useGetCustomerList()` 作为列表页对象响应入口；
  - mutations 同时失效 `['customers']` 与 `['customers', 'list']`。
- 前端 `src/features/trading/supplier/services/supplier-service.ts` / `hooks/use-supplier.ts`：
  - 保留 `getSuppliers()` 作为 `options=true` 选项数组接口；
  - 新增 `getSupplierList()` / `useGetSupplierList()` 作为列表页对象响应入口；
  - mutations 同时失效 `['suppliers']` 与 `['suppliers', 'list']`。
- 前端 `src/features/trading/components/customer-list.tsx`：
  - 列表页切换为消费 `useGetCustomerList()`；
  - 头部卡片改为读取后端 `metadata.stats.total / active / newThisMonth`。
- 前端 `src/features/trading/components/supplier-list.tsx`：
  - 列表页切换为消费 `useGetSupplierList()`；
  - 头部卡片改为读取后端 `metadata.stats.total / active / pendingReview`。

### 设计收口
- 客户/供应商下拉选项与列表页统计不再共用同一响应语义：
  - 选项场景继续消费纯数组；
  - 列表场景消费对象响应与后端统计。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers -run "Customer|Supplier"
```

结果：通过。

### 补充回归：handler 级 metadata.stats 字段断言
- 新增 `server/handlers/partner_list_stats_handler_test.go`：
  - `TestGetCustomersHandlerReturnsMetadataStats`
  - `TestGetSuppliersHandlerReturnsMetadataStats`
- 覆盖点：
  - 列表接口返回 `metadata.pagination`；
  - 列表接口返回 `metadata.stats`；
  - 客户统计断言 `total / active / newThisMonth`；
  - 供应商统计断言 `total / active / pendingReview`；
  - 逻辑删除记录不会混入统计总数。

补充执行：
```bash
go test ./handlers -run "CustomersHandlerReturnsMetadataStats|SuppliersHandlerReturnsMetadataStats|Customer|Supplier"
```

结果：通过。

## 2026-04-09 MRP Phase 1 独立模块骨架迁移

### 变更概述
- 新建 `src/features/mrp` 正式模块骨架：
  - `data/requirement-schema.ts`
  - `services/requirement-core-service.ts`
  - `services/requirement-service.ts`
  - `services/requirement-export-service.ts`
  - `hooks/use-requirements.ts`
  - `hooks/use-mold-status.ts`
  - `components/requirements/*`
  - `pages/part-requirements.tsx`
  - `index.ts`
- 将 MRP 需求分析页面的真实实现迁入 `src/features/mrp/pages/part-requirements.tsx`：
  - 模块页面容器不再继续以内联方式挂在 `src/features/trading/tabs/index.tsx` 中维护。
- 保持现有 URL 不变：
  - `src/routes/_authenticated/trading/requirements.lazy.tsx` 仍承载 `/trading/requirements`
  - 但页面组件已切换为 `@/features/mrp/pages/part-requirements`
- 保留 Trading 旧路径兼容层：
  - `src/features/trading/hooks/use-requirements.ts` 改为转发到 `@/features/mrp/hooks/use-requirements`
  - `src/features/trading/hooks/use-mold-status.ts` 改为转发到 `@/features/mrp/hooks/use-mold-status`
  - `src/features/trading/services/requirement-core-service.ts` 改为转发到 `@/features/mrp/services/requirement-core-service`
  - `src/features/trading/services/requirement-service.ts` 改为兼容导出 `RequirementCoreService`
  - `src/features/trading/services/requirement-export-service.ts` 改为转发到 `@/features/mrp/services/requirement-export-service`
  - `src/features/trading/tabs/index.tsx` 当时曾保留 `PartRequirements` 兼容导出，后续已在 `2026-04-09` 清理移除

### 本轮边界
- 本轮只迁移 MRP 自有前端层：`requirements` 的 `data / services / hooks / components / page`。
- 本轮未改动 `/trading/requirements` URL，不在这一阶段强行切换导航与路由语义。
- 本轮继续复用：
  - `Trading` 的销售订单事实源
  - `Engineering` 的 BOM 服务
  - 现有国际化 key 与 API 契约

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `MRP` 已不再只是空目录，而是形成了最小可承载的前端领域骨架。
- `/trading/requirements` 现已由 `MRP` 新模块实际承载，但对现有 URL 与调用方保持兼容。
- Trading 旧路径中的 `tabs/index.tsx -> PartRequirements` 兼容导出已完成阶段性收口；其余兼容层仍可按引用面继续清理。

## 2026-04-09 删除 Trading 侧剩余 requirements 兼容层

### 变更概述
- 继续按“无引用即删除”原则，清理 Trading 侧残留的 `requirements` 兼容层与历史快照：
  - `src/features/trading/data/requirement-schema.ts`
  - `src/features/trading/hooks/use-requirements.ts`
  - `src/features/trading/services/requirement-core-service.ts`
  - `src/features/trading/services/requirement-export-service.ts`
  - `src/features/trading/services/requirement-service.ts`
  - `src/features/trading/services/requirement-export-service.ts.txt`
  - `src/features/trading/services/requirement-service.ts.txt`
- 删除依据：
  - `src` 范围内已无任何代码继续引用上述 Trading 路径；
  - 当前真实 schema / hook / service 实现均已归属到 `src/features/mrp/**`；
  - `.txt` 文件仅为旧实现快照，不参与当前构建与运行链路。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- Trading 侧 `requirements` 的 schema / hook / service 兼容壳已完成物理清理。
- `requirements` 领域的前端实现与消费入口现已统一收敛到 `src/features/mrp/**`。

## 2026-04-09 清理 Trading -> MRP 最后一层显式转发壳

### 变更概述
- 对 `src/features/trading/**` 做了进一步盘点，按文件内容扫描所有直接指向 `src/features/mrp/**` 的兼容转发。
- 盘点结果显示仅剩一处显式 Trading -> MRP 转发壳：
  - `src/features/trading/hooks/use-mold-status.ts`
- 该文件仅执行：
  - `export { useMoldStatus } from '@/features/mrp/hooks/use-mold-status'`
  - `export type { MoldAlert } from '@/features/mrp/hooks/use-mold-status'`
- 同时确认 `src` 范围内已无任何代码继续通过 Trading 路径引用该 hook，因此执行物理删除。

### 验证
- 代码搜索结果表明：删除后 `src/features/trading/**` 内已不再存在直接指向 `src/features/mrp/**` 的显式转发文件。
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- Trading -> MRP 的显式兼容转发壳已完成清零。
- 当前 `MRP` 相关实现已不再通过 Trading feature 做代码层转发，边界进一步明确。

## 2026-04-09 提升 MRP 为独立前端模块入口

### 变更概述
- 新增 `MRP` 独立前端模块骨架：
  - `src/features/mrp/module.tsx`
  - `src/features/mrp/tabs.ts`
- 新增独立路由树：
  - `src/routes/_authenticated/mrp/route.tsx`
  - `src/routes/_authenticated/mrp/route.lazy.tsx`
  - `src/routes/_authenticated/mrp/index.tsx`
  - `src/routes/_authenticated/mrp/requirements.tsx`
  - `src/routes/_authenticated/mrp/requirements.lazy.tsx`
- 新增独立访问路径：
  - `/mrp` -> 重定向到 `/mrp/requirements`
  - `/mrp/requirements` -> 直接承载 `src/features/mrp/pages/part-requirements.tsx`
- 将旧入口改为兼容跳转：
  - `src/routes/_authenticated/trading/requirements.tsx` 现统一重定向到 `/mrp/requirements`
  - `src/routes/_authenticated/trading/requirements.lazy.tsx` 不再直接挂载 MRP 页面组件
- 同步拆除 Trading 模块内的 requirements tab：
  - `src/features/trading/tabs.ts` 中移除 `requirements`
- 为新模块补齐系统级入口：
  - 侧边栏新增 `MRP` 入口
  - 命令面板搜索项与快捷动作改为指向 `/mrp/requirements`
  - `authenticated-route-catalog`、AI 协议允许路由、菜单权限映射中补入 `/mrp`
- 权限策略采取最小破坏方案：
  - `/mrp` 当前暂复用 Trading 菜单权限，避免本轮引入权限回归

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- `MRP` 已拥有独立的前端模块入口、路由树与导航入口，不再只是 Trading 模块中的一个语义附属页。
- `/trading/requirements` 仍可访问，但已退化为兼容入口；结构性宿主已切换为 `/mrp/requirements`。

## 2026-04-09 收口 MRP 语义层残留

### 变更概述
- 清理 Trading locale 中已无引用的旧 `requirements` 文案：
  - `src/locales/messages/en-US/trading.ts`
  - `src/locales/messages/zh-CN/trading.ts`
- 这意味着 `requirements` 页面的文案宿主已完全收敛到：
  - `src/locales/messages/en-US/mrp.ts`
  - `src/locales/messages/zh-CN/mrp.ts`
- 收口权限语义残留：
  - `src/features/authz/data/permission-catalog.ts` 中将 `menu_trading` 的标签/说明更新为同时覆盖 `Trading、Purchase、MRP`
  - 显式注释 `/mrp -> menu_trading` 为“继承授权”关系，而非隐式同模块
- 同步修正权限审计视图中的展示语义：
  - `src/locales/messages/en-US/systemManagement.ts`
  - `src/locales/messages/zh-CN/systemManagement.ts`
  - 审计矩阵里的 `menu_trading` 现展示为 `Trading / MRP`

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。
- 搜索确认：
  - `src` 范围内已无 `trading.requirements`
  - `src` 范围内已无 `trading.tabs.requirements`

### 本轮结论
- `MRP` 页面文案命名空间已不再依赖 Trading locale。
- `/mrp` 的权限语义已从“默默复用 Trading”收口为“显式继承 Trading 菜单授权”，为后续后端单独下发 `menu_mrp` 契约保留了清晰升级点。

## 2026-04-09 MRP schema 归属收口

### 变更概述
- 将 `src/features/trading/data/requirement-schema.ts` 收口为纯兼容导出：
  - `export type { MaterialRequirement, MrpStats } from '@/features/mrp/data/requirement-schema'`
- 这意味着 `MaterialRequirement` 与 `MrpStats` 的权威定义已统一归属到：
  - `src/features/mrp/data/requirement-schema.ts`
- `Trading` 目录下残留的 requirements 旧组件仍可继续通过兼容层获取相同类型，不会立即中断旧引用。

### 本轮结论
- MRP 的 schema 权威归属已从 `Trading` 收回到 `MRP`。
- `Trading` 的 `requirement-schema` 现在只承担向后兼容职责，不再是事实源。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。
## 2026-04-09 Sales Order Save Hard-Cut (No PATCH Fallback)

### Changes
- Frontend sales service removed `patchSalesOrder` and now keeps only create/delete in `sales-service.ts`.
- Sales mutation hook removed `patchMutation`; save flow stays on `saveSalesOrderTransaction` (`ORDER_SAVE`) only.
- Sales barrel export removed `patchSalesOrder` to prevent new call sites from re-introducing PATCH usage.
- Backend trading routes removed `PATCH /sales-orders/:id`.
- Backend handler removed `PatchSalesOrderHandler` implementation to complete hard-cut at code level.

### Verification
Executed:
```bash
pnpm exec tsc --noEmit
node scripts/verify-permissions.mjs
go test ./handlers ./routes ./services -run Sales -count=1
```

Result: passed.

### Outcome
- Sales order save path is now transaction-only for edit persistence.
- No compatibility PATCH entry remains in frontend export surface or backend route/handler path.

## 2026-04-09 Sales Hard-Cut Cleanup Retrospective

### Residual scan scope
- residual code: frontend callsites, exports, backend route/handler, service DTO naming.
- residual semantics: `Trading / MRP` permission labels and permission-audit module grouping.
- residual permission mapping: trading transaction route bindings in action catalog.

### Cleanup applied
- renamed sales save snapshot contract from patch naming:
  - `PatchSalesOrderRequest` -> `SalesOrderSnapshotRequest`
  - `MapPatchSalesOrderRequestToModel(...)` -> `MapSalesOrderSnapshotRequestToModel(...)`
- updated trading action route bindings to include current transaction routes:
  - `action_trading_sales_order_manage` binds `POST /sales-orders/:id/transactions`
  - `action_trading_customer_manage` binds customer transaction + patch routes
  - `action_trading_supplier_manage` binds supplier transaction + patch routes
  - `action_trading_purchase_order_manage` binds purchase transaction + patch routes
  - `action_trading_purchase_order_sync` stale binding cleared (`[]`) to remove non-existent route reference
- removed MRP from trading-only semantic labels and split MRP as a separate module in permission audit UI:
  - `menu_trading` label/desc now only describe Trading/Purchase
  - permission-audit modules changed from `Trading / MRP` to `Trading` + separate `MRP`

### Verification
Executed:
```bash
pnpm exec tsc --noEmit
node scripts/verify-permissions.mjs
go test ./handlers ./routes ./services -run Sales -count=1
node scripts/check-action-permission-closure.mjs
```

Result:
- `tsc` pass
- `verify-permissions` pass
- sales-focused go tests pass
- action-permission closure improved from:
  - `unbound_backend_routes: 19 -> 12`
  - `invalid_route_bindings: 1 -> 0`
- remaining 12 unbound routes are pre-existing non-sales residuals.

## 2026-04-11 `watchdog` Rust 构建失败修复

### 变更概述
- 本轮目标是修复 `server/watchdog` 在 Docker 构建阶段执行 `cargo build --release` 时的 Rust 编译错误。
- 实际阻塞点不是 Go app，而是 `watchdog/src/main.rs` 出现 `unexpected closing delimiter: '}'`。
- 本轮采取最小修复原则，只调整 `main.rs` 的块结构，不扩展到无关服务。

### 根因分析
- `server/watchdog/src/main.rs` 中主循环前存在一段损坏文本，把原本应独立存在的 `loop {` 吞进了同一行。
- 结果导致：
  - `match perform_audit(&pool).await { ... }` 没有处在正确的循环块内。
  - 末尾 `sleep(Duration::from_secs(15)).await;` 与对应闭合 `}` 的层级关系失衡。
  - Rust 编译器最终在 `Err` 分支附近将问题表现为 `unexpected closing delimiter`。

### 修复内容
- 更新文件：`server/watchdog/src/main.rs`
- 修复动作：
  - 恢复独立的 `loop { ... }` 主循环结构。
  - 去除同类损坏文本对 `if current_count != last_anomaly_count {` 和 `let busy_status = IntegrityResult { ... }` 所在行的结构污染。
- 本轮未改动 watchdog 的业务语义，只修复语法与块层级。

### 验证结果
- 在 `server/watchdog` 目录执行：`cargo build --release`
- 结果：**通过**。
- 当前仅剩一个非阻塞警告：`perform_audit(pool: &sqlx::PgPool)` 的参数 `pool` 暂未使用。

### 结论
- `watchdog` 单体 Rust 编译链已经恢复。
- 本轮未继续执行整条 `docker compose up -d --build ...`，因为当前计划优先验证首个失败点已修复，避免把新的独立问题与本次语法根因混在一起。

## 2026-04-11 - 物料档案模块治理（前端第一阶段：MaterialOption 收敛）

### 本轮目标
- 在不改动后端接口行为的前提下，先收敛 `/materials?options=true` 这条前端主链的语义边界。
- 解决“轻量 options DTO 被 adapter 补齐成完整 `Material`”导致的类型混用问题，降低后续治理风险。

### 变更内容
- 更新文件：
  - `src/features/material-archive/data/schema.ts`
  - `src/features/material-archive/adapters/material-api-adapter.ts`
  - `src/features/material-archive/services/material-core-service.ts`
  - `src/features/material-archive/components/material-assembly-manager.tsx`
  - `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
  - `src/features/trading/components/purchase/parts/purchase-order-lines-editor.tsx`
  - `src/features/engineering/hooks/use-bom-form.ts`
  - `src/features/engineering/hooks/use-bom-data.ts`
  - `src/features/engineering/components/bom-detail-table.tsx`
  - `src/features/engineering/components/bom-mgmt/bom-preview.tsx`
  - `src/features/engineering/components/bom-editor/bom-item-row.tsx`
  - `src/features/engineering/components/bom-editor/item-table.tsx`
  - `src/features/engineering/components/bom-editor/bom-recipe-editor.tsx`
  - `src/features/engineering/services/excel-service.ts`
  - `src/features/engineering/services/bom-excel-exporter.ts`
  - `src/features/engineering/services/bom-excel-parser.ts`
- 修复动作：
  - 新增 `MaterialOption` 轻量类型，用于承载物料 options / 下拉字典场景。
  - 调整 `toMaterialOptionContract()` 与 `toMaterialOptionContracts()`，不再把 options DTO 填充为完整 `Material`。
  - 调整 `MaterialCoreService.getMaterialOptions()` 返回值为 `Promise<MaterialOption[]>`。
  - 同步收敛 BOM、采购、装配管理和 BOM Excel 模板导出链上的消费类型，使其与轻量 options 语义一致。
  - 补平收敛过程中的显式类型问题，移除局部 `any`，保证前端类型链可通过检查。

### 风险控制
- 本轮未修改后端 handler / service / route，也未改变 `/materials?options=true` 的接口字段结构。
- 旧 `material-service.ts` 当前在 `src` 主链无现役引用，继续保留为运行时硬阻断壳，避免在未做全量回归前进行激进删除。
- 本轮保留 `version/_v` 兼容壳与后端 `gin.H` / model 复用问题，作为后续阶段处理项。

### 验证结果
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料档案模块前端第一阶段收敛已完成，`getMaterialOptions()` 主链已从“完整 Material 伪装”切换为明确的轻量 `MaterialOption` 语义。
- 后续如继续治理，建议下一阶段转向后端 material 输入输出 DTO 收敛，以及 `version/_v` 兼容壳的移除窗口评估。

## 2026-04-11 - 物料档案模块治理（第二阶段：后端 DTO 与兼容壳第一轮收敛）

### 本轮目标
- 在不改变物料接口业务语义的前提下，先收敛后端 material 主链上的弱类型响应与输入 DTO / 持久化模型耦合问题。
- 明确 `version` 与 `_v` 的当前兼容关系，避免后续继续在 handler 层分散扩散。

### 变更内容
- 更新文件：
  - `server/handlers/material_response_helpers.go`
  - `server/handlers/materials.go`
  - `server/services/warehouse_master_service.go`
- 修复动作：
  - 将物料单体、列表、options 成功响应从 `gin.H` 收敛为明确的 typed DTO。
  - 将 `version` 与 `_v` 的双字段兼容输出集中到统一映射层维护。
  - 将 `SaveMaterialInput` 与 `BulkSyncMaterialInput` 从 `models.Material` 直接别名改为显式输入 DTO。
  - 新增集中转换函数，将保存/批量同步请求 DTO 映射为 `models.Material`，避免继续把持久化模型直接暴露为请求契约。

### 风险控制
- 本轮未删除 `_v` 字段，仅将其降级为兼容别名，避免破坏仍可能存在的历史消费面。
- 本轮未修改前端物料主链 contract，也未改动 `/materials` 的字段语义，只做后端契约层收敛。
- 本轮未物理删除旧 `material-service.ts`，继续保持保守处理。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料档案模块第二阶段的第一轮后端治理已完成：后端响应已从弱类型 `gin.H` 向明确 DTO 收敛，请求输入也已与 `models.Material` 解耦。
- 当前 `version/_v` 仍保持兼容双写输出，但已被收口到统一映射层，后续可以在补足接口回归验证后评估正式弃用 `_v`。

## 2026-04-11 - 物料档案模块治理（第三阶段：`_v` 兼容壳直接移除）

### 本轮目标
- 将物料模块中的 `_v` 兼容壳直接移除，明确 `version` 为唯一主链版本语义。
- 保证物料前端主链、后端接口与 patch 版本控制在移除 `_v` 后仍保持稳定。

### 变更内容
- 更新文件：
  - `server/models/material.go`
  - `server/handlers/material_response_helpers.go`
  - `server/handlers/personnel_material_patch_handlers_test.go`
  - `src/features/material-archive/contracts/material-api-dto.ts`
  - `src/features/material-archive/adapters/material-api-adapter.ts`
- 修复动作：
  - 将 `models.Material.Version` 的 JSON tag 从 `_v` 统一为 `version`。
  - 从物料 response helper 的 DTO 中移除 `_v` 兼容字段，仅保留 `version`。
  - 从物料前端 API DTO 与 adapter 中移除 `_v` 兼容定义与兜底读取逻辑。
  - 同步更新物料 patch handler 测试，仅断言 `version` 新契约。

### 风险控制
- 本轮仅处理物料模块，不扩展到采购、销售、供应商等仍使用 `_v` 的其他领域模块。
- 本轮未改动 patch 请求协议，仍保持 `metadata.version` 不变。
- 先完成代码搜索与测试断言同步，再执行直接移除，避免出现“实现已变、测试仍按旧契约”的不一致状态。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料模块中的 `_v` 兼容壳已直接移除，`version` 已成为唯一正式版本语义。
- 其他领域模块若后续需要做同类治理，可按“先收口响应 DTO，再同步测试，再移除兼容字段”的顺序分阶段推进。

## 2026-04-11 - 物料档案模块治理（第四阶段：DTO 命名与语义对齐）

### 本轮目标
- 在不改变物料接口字段的前提下，进一步收敛后端 DTO 命名与前端 contract 的语义层次。
- 让 response DTO、request DTO、service input 与持久化模型的职责边界更直观，降低后续维护歧义。

### 变更内容
- 更新文件：
  - `server/handlers/material_response_helpers.go`
  - `server/handlers/materials.go`
  - `server/handlers/material_patch_handler.go`
  - `server/services/warehouse_master_service.go`
- 修复动作：
  - 将后端物料响应 DTO 命名收敛为 `MaterialApiDTO`、`MaterialOptionApiDTO`、`MaterialListPageApiDTO`、`MaterialOptionsApiDTO`。
  - 将响应映射函数命名同步收敛为 `toMaterialApiDTO*` 与 `toMaterialOptionApiDTO*`。
  - 将服务层输入 DTO 命名收敛为 `SaveMaterialAPIRequest`、`BulkSyncMaterialAPIRequest`、`BulkSyncMaterialsAPIPayload`。
  - 同步更新 handler 对新命名的引用，保持 JSON 字段与接口行为不变。

### 风险控制
- 本轮仅做命名与分层对齐，不改变物料接口字段结构。
- 本轮未调整前端 contract 内容，也未改动 patch 协议与业务流程。
- 对于可能引发连锁编译错误的类型重命名，采用“小步改名 -> 编译验证 -> 补齐引用”的方式控制风险。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料模块的后端 DTO 命名已与前端 contract 语义层次更好对齐。
- 当前物料链路已经形成较清晰分层：前端 contract / 后端 response DTO / 后端 request DTO / 服务输入转换 / 持久化模型，各层边界明显优于治理前。

## 2026-04-11 - 物料档案模块治理（第五阶段：服务层命名继续收敛）

### 本轮目标
- 继续收敛物料服务层内部命名，使查询参数与查询结果的职责表达更清晰。
- 在不改变 HTTP 契约与业务行为的前提下，减少服务层类型名中的“中间态 / 临时结构”感。

### 变更内容
- 更新文件：
  - `server/services/warehouse_master_service.go`
  - `server/handlers/material_response_helpers.go`
  - `server/handlers/materials.go`
- 修复动作：
  - 将 `MaterialOptionItem` 重命名为 `MaterialOptionQueryResult`，明确其为服务层查询结果。
  - 将 `MaterialListQuery` 重命名为 `MaterialListPageQuery`，明确其为分页查询参数。
  - 同步更新 handler 与 response helper 中对这些类型的引用。

### 风险控制
- 本轮仅收敛服务层命名，不改变 JSON 字段、接口结构与业务逻辑。
- 仅选择引用面明确、职责清晰的两个命名做收敛，避免扩大重构面。
- 采用“改类型名 -> 补齐引用 -> 编译验证”的方式控制连锁风险。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料服务层命名已进一步形成更明确的 query / result 语义边界。
- 当前物料模块的命名层次已基本形成：前端 contract、后端 HTTP DTO、服务层 request/query/result、持久化 model，各层职责较为清晰。

## 2026-04-11 - 物料档案模块治理（第六阶段：拆分独立 dto/query 文件）

### 本轮目标
- 将物料模块中散落在 handler / service 文件内的类型定义拆到独立文件。
- 在不改变接口与业务行为的前提下，让 handler / service 主文件职责更加聚焦。

### 变更内容
- 新增文件：
  - `server/handlers/material_api_dto.go`
  - `server/services/material_service_types.go`
- 更新文件：
  - `server/handlers/material_response_helpers.go`
  - `server/services/warehouse_master_service.go`
- 修复动作：
  - 将物料 handler 侧 response dto 迁移到独立 `material_api_dto.go`。
  - 将物料 service 侧 `request / query / result` 类型迁移到独立 `material_service_types.go`。
  - 从原 helper / service 主文件中删除重复类型定义，只保留逻辑实现与引用。

### 风险控制
- 本轮保持在既有 package 内部拆分，没有引入跨 package 抽象，避免循环依赖。
- 拆分粒度控制为两组文件：handler response dto 与 service types，避免碎片化过度。
- 迁移完成后立即执行后端编译测试与前端类型检查，及时发现残留引用问题。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料模块已完成从“同文件混放逻辑 + 类型定义”向“逻辑文件 + 独立 dto/query 文件”的结构收敛。
- 当前物料模块的文件结构、命名层次与职责边界都已明显优于治理前，后续若继续推进，可以把 mapper 也进一步物理拆分。

## 2026-04-11 - 物料档案模块治理（第七阶段：继续拆分 mapper 文件）

### 本轮目标
- 将物料 handler 层 mapper 按职责继续拆分，使完整物料映射与物料 options 映射各自落到独立文件。
- 在不改变 package、函数签名与接口行为的前提下，继续提升物料 handler 层的结构清晰度。

### 变更内容
- 新增文件：
  - `server/handlers/material_mapper.go`
  - `server/handlers/material_option_mapper.go`
- 更新文件：
  - `server/handlers/material_response_helpers.go`
- 修复动作：
  - 将 `toMaterialApiDTO / toMaterialApiDTOs` 迁移到 `material_mapper.go`。
  - 将 `toMaterialOptionApiDTO / toMaterialOptionApiDTOs` 迁移到 `material_option_mapper.go`。
  - 原 `material_response_helpers.go` 迁移后不再承载具体映射逻辑，当前仅保留包声明空壳。

### 风险控制
- 本轮仅做同 package 内部物理拆分，没有改变 DTO、handler 或 service 的调用链。
- mapper 拆分粒度控制为两类职责，没有继续细分为更碎的文件，避免过度拆分。
- 迁移完成后立即执行后端测试与前端类型检查，确保无残留引用问题。

### 验证结果
- 在 `server` 目录执行：`go test ./...`
- 结果：**通过**。
- 在项目根目录执行：`pnpm exec tsc --noEmit`
- 结果：**通过**。

### 结论
- 物料 handler 层已形成更明确的“dto 文件 + material mapper + material option mapper”结构。
- `material_response_helpers.go` 已不再承载实质逻辑，可作为后续清理候选，但本轮未主动删除以避免扩大改动面。
