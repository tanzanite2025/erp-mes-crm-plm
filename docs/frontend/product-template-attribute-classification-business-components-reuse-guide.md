# 产品模板属性分类业务组件复用

产品模板属性分类管理页、完整管理弹窗和快捷新增弹窗共用服务、校验及缓存刷新逻辑。调用方无需传入属性分类列表、组织保存请求或生成内部标识。

## 领域与层级语义

| 界面术语                 | 英文术语                            | 代码类型                                   | 含义                                                                                  |
| ------------------------ | ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 一级属性分类             | Level 1 Attribute Category          | `ProductTemplateAttributeLevelOneCategory` | 产品模板的属性维度，如材质、颜色。                                                    |
| 二级属性分类（属性选项） | Level 2 Attribute Category (Option) | `ProductTemplateAttributeLevelTwoOption`   | 一级属性维度下的可选值，如材质下的碳纤维、铝合金。代码使用 `Option`，表示它是可选值。 |
| 产品分类                 | Product Category                    | `ProductType`                              | 独立的产品分类树及基础型号，用于组织产品并关联产品模板。                              |

产品模板通过属性绑定装配一级属性分类，产品表单在对应字段中选择二级属性选项。一级分类不从属于某个单独的模板，可以被多个产品模板复用。

业务组件、组件文件及领域类型包含 `ProductTemplateAttribute` 和层级语义。现有路由 `/engineering/product-attributes`、HTTP 端点、数据库表和请求字段保留原协议：`categoryKey` 表示一级属性分类编码，`value` / `optionValue` 表示二级属性选项的内部值，`option` 表示二级属性记录。

组件使用应用已有的 `QueryClientProvider` 和 `LanguageProvider`，请在应用上下文中调用。

## 产品分类、具体产品与展示关系

产品分类树与两级属性分类各自独立。产品分类按一级、二级、第三级基础型号组织，例如“碳纤维车圈 → 山地车车圈 → R50”。第三级的 R50 是自行命名的基础型号，在“产品管理 → 编辑分类 → 新增分类”中选择二级父分类，手填“分类名称”“分类编码”并关联模板；分类弹窗维护分类层级、基础型号和模板关系。

具体产品是 `Product` 记录，通过 `typeId` 归入基础型号 `ProductType`。在“生成产品”中选用 R50，填写具体产品的两位数字型号编码、规格和属性后保存，即形成一张独立产品卡片。继续选用同一个 R50，可分别保存碟刹、V刹等不同规格的具体产品，各自保留产品身份、规格及 BOM 关联，展示在同一型号下面。卡片数量由实际保存的产品记录决定。基础型号的分类编码与具体产品的两位型号编码分别维护。

卡片名称对应产品编辑底部“最终型号显示预览”的聚合名称。例如 R50（碟刹）中的 R50 对应三级基础型号，碟刹对应该产品选择的制动类型；完整名称及其余标签沿用现有聚合预览。工艺系列、轮圈类型等产品规格在产品编辑中维护，可选内容来自属性分类，使用哪些属性及是否必填由关联模板决定。BOM 类型、归属、归属客户、产品档次和成品重量等资料在关联的 BOM 中维护，卡片按现有展示规则读取。

## 产品与 BOM 的操作边界

BOM 是产品生命周期管理的必备资料，承载物料组成、版本和升级记录。产品建立、BOM 准备与验证、确认后的关联可以分开操作：产品可先保存，BOM 经验证确认可用后再在“BOM 配方”中关联具体产品。产品保存不以先绑定 BOM 为前提。

BOM 通过 `productId` 关联具体的 `Product` 记录；产品通过 `typeId` 对应三级基础型号。产品编辑展示当前实际关联的 BOM，关联操作在 BOM 管理中完成。“如何建立产品”说明页和分步向导应按此解释；向导本次是否继续 BOM 步骤，不改变 BOM 在生命周期管理中的必备地位。

## 快捷新增和编辑二级属性分类

入口：`src/features/engineering/components/product-attributes/product-template-attribute-level-two-option-editor-dialog.tsx`。

```tsx
import { useState } from 'react'
import { ProductTemplateAttributeLevelTwoOptionEditorDialog } from '@/features/engineering/components/product-attributes/product-template-attribute-level-two-option-editor-dialog'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '@/features/engineering/utils/product-attribute-utils'

export function ProductTechnicalSeriesQuickCreateExample() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedSeriesValue, setSelectedSeriesValue] = useState('')

  return (
    <>
      <button onClick={() => setCreateDialogOpen(true)}>新增工艺系列</button>
      <output>{selectedSeriesValue}</output>
      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        categoryKey={PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series}
        onSaved={(savedOption) => {
          if (savedOption.active) setSelectedSeriesValue(savedOption.value)
        }}
      />
    </>
  )
}
```

| 参数                   | 用途                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| `open`、`onOpenChange` | 控制弹窗开关；关闭后下次打开会创建新的表单会话。                                                 |
| `categoryKey`          | 可选，预选并锁定归属分类；不传时允许选择分类。兼容现有分类编码的大小写和分隔符规范化规则。       |
| `option`               | 可选，传入已有 `ProductTemplateAttributeLevelTwoOption` 即进入编辑模式，保留原有内部标识和版本。 |
| `onSaved`              | 可选，保存和共享查询刷新结束后，回传后端返回的完整分类项。可用于原表单自动选中。                 |

弹窗打开时自行加载分类。未加载成功、分类不存在或尚未创建分类时禁止提交。新增内部标识在当前会话生成一次，保存失败后保留表单及标识，重试不会生成另一个标识。保存期间禁止重复提交和主动关闭。

当前会话保留最初的编辑记录、版本和默认归属分类。调用方收到更新后的同一记录，或后台刷新导致分类消失时，不会覆盖草稿、改用新版本提交或自动切换到另一分类；分类消失时阻止保存，避免意外归类。

## 完整管理弹窗

入口：`src/features/engineering/components/product-attributes/product-template-attribute-classification-management-dialog.tsx`。

```tsx
<ProductTemplateAttributeClassificationManagementDialog
  open={managementDialogOpen}
  onOpenChange={setManagementDialogOpen}
  initialLevelOneCategoryKey={PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series}
  onLevelTwoOptionSaved={(savedOption) => {
    if (
      savedOption.active &&
      areSameProductAttributeCategoryKey(
        savedOption.categoryKey,
        PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series
      )
    ) {
      setSelectedSeriesValue(savedOption.value)
    }
  }}
/>
```

`ProductTemplateAttributeClassificationManagementDialog` 从上述入口导入；`areSameProductAttributeCategoryKey` 从 `utils/product-attribute-machine-value.ts` 导入。完整管理支持分类及分类项的新增、编辑、删除和排序。`initialLevelOneCategoryKey` 在每次打开时预选分类；没有有效匹配时选中列表首项。`onLevelTwoOptionSaved` 可能回传其他分类的分类项，调用方应按归属分类和启用状态决定是否回填。

需要直接嵌入现有布局时，可使用同目录的 `ProductTemplateAttributeClassificationManagementPanel`；原 `/engineering/product-attributes` 页面已使用该面板。

新增一级属性分类时，组件自动生成内部分类编码，表单与分类列表仅展示业务名称，不要求手填编码。编码在打开新增表单时生成一次，保存失败重试时沿用；关闭后重新新增会生成新的编码。编辑已有一级属性分类保留原编码和引用关系。二级属性分类的内部值同样自动生成。

## 数据刷新

`/engineering/templates` 的产品模板编辑弹窗已接入完整管理弹窗和二级选项编辑弹窗：属性配置区可管理全部产品模板属性分类；已加入的分类及待加入分类可定向打开管理；点击选项胶囊可编辑，并可在分类下直接新增二级属性选项。无需跳转页面。

分类、选项的保存即时生效并应用于所有引用模板，模板的名称、说明、属性绑定及必填状态仍需通过“保存模板”提交。子弹窗复用当前查询客户端，更新目录及预览时保留模板草稿和原始版本；子弹窗提交不触发模板提交。若分类在维护期间被删除，保留草稿中的绑定并提示移除，阻止提交失效引用。

管理组件读取独立的完整数据缓存，包含停用项，避免与业务表单的启用项缓存混用。保存后统一按产品属性查询前缀刷新完整管理数据及已挂载业务表单的数据。未挂载的查询会标记为失效，下次使用时重新加载。组件不自行创建第二个查询客户端，也不依赖管理页面的路由或状态。

后端返回的保存结果会先合并到已有缓存，再请求刷新。若后台刷新失败，保留已有数据和正在编辑的草稿，并显示重试入口；已落库的保存仍会正常回传 `onSaved`，避免用户误以为保存失败而重复创建。启用项缓存会剔除停用项，完整缓存保留停用项。审计弹窗使用完整缓存，避免污染业务表单的启用项数据。

合并保存结果前会取消该目录尚未结束的查询，防止旧请求覆盖保存结果；首次正在加载的业务表单也会重新请求。删除成功后先从现有缓存移除记录及分类下的分类项，再刷新；即使刷新失败，也不会继续显示已删除记录和旧数量。服务端拒绝删除时保留缓存。

## 保存与引用约束

产品规格与 BOM 的属性归属需保持一致：`techSeries`、`tireType`、`brakeType` 属于产品规格；`versionLevel`（产品档次）已迁到 BOM，不再作为产品动态属性保存。产品读取适配器和写入适配器都会排除历史残留的 `versionLevel`；后端产品读取和保存也执行同一约束，兼容已打开的旧表单和旧客户端。

产品读取不修改历史数据。成功保存规格后，旧动态属性由现有替换流程软删除，历史值仍可追溯，不会用旧产品档次覆盖任何 BOM。其他缺失分类或分类项仍拒绝保存并回滚，版本冲突保护保持生效。BOM 读取和写入的档次字段不经过产品属性过滤。

新增和编辑仍使用现有 POST 保存端点。编辑请求采用 SDRTS `{ op: 'PATCH', delta, metadata: { id, version } }`，仅提交实际变化的字段。业务组件自行保留打开编辑时的原始记录；直接调用 `saveProductAttributeOption(next, current)` 或 `saveProductAttributeCategory(next, current)` 时，必须传入原始记录作为第二个参数。未发生变化时不发送请求。

清空英文名称或说明会显式提交空字符串，清空生效时间提交 `null`。历史分类编码和分类项内部值不会在编辑时自动规范化，避免破坏已有引用。后端以版本条件更新防止并发覆盖，冲突返回 409 并保留当前草稿，需刷新后重新打开编辑。

已被产品使用的分类、分类项，以及已被产品模板绑定的分类禁止删除，可通过停用控制后续使用。检查范围包含动态产品属性、旧版产品工艺系列/轮圈/制动字段和 BOM 档次。删除和排序均按兼容分类编码识别历史分类项，排序参数无效时整批回滚。

引用写入和目录删除使用同一分类行的事务锁：引用先提交则拒绝删除；删除先提交则拒绝写入失效引用。产品和模板替换引用前会验证分类、分类项仍然存在，验证失败会回滚整个保存并保留原引用。已有停用项允许保留，避免阻断历史记录编辑。

## 回归验证

前端业务交互及真实 API 客户端请求契约：

```sh
pnpm exec vitest run src/features/engineering/components/product-attributes/product-template-attribute-classification-business-dialogs.spec.tsx src/features/engineering/services/product-attribute-catalog-save-http-contract.spec.ts src/features/engineering/hooks/use-product-attribute-write-actions-cache-synchronization.spec.tsx
```

后端 HTTP → 服务 → PostgreSQL 持久化验证：设置 `PRODUCT_ATTRIBUTE_CATALOG_TEST_POSTGRES_DSN` 后，在 `server` 目录执行下列命令。测试使用临时独立 schema 并在结束时清理，覆盖停用状态、字段清空、字段列映射、历史编码、并发冲突、排序回滚及引用删除保护。

```sh
go test ./handlers -run '^TestProductAttributeCatalogHTTP' -count=1 -v
go test ./services -run '^TestProductAttributeCatalog' -count=1 -v
```
