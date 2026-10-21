# 产品外观业务组件复用

产品外观对应 `/engineering/product-appearance`，与 `/engineering/product-attributes` 的产品模板属性分类是两个独立业务。原产品外观页面已经使用共享管理面板，其他页面可以直接打开编辑弹窗或完整管理弹窗，无需跳转到管理页面。

## 组件入口

组件均位于 `src/features/engineering/components/product-appearance/`。

| 文件与导出组件 | 用途 |
| --- | --- |
| `product-appearance-editor-dialog.tsx` → `ProductAppearanceEditorDialog` | 快捷新增或编辑一项外观，保存后回传完整记录。 |
| `product-appearance-management-dialog.tsx` → `ProductAppearanceManagementDialog` | 在弹窗中浏览、新增、编辑、删除、启停和选用外观。 |
| `product-appearance-management-panel.tsx` → `ProductAppearanceManagementPanel` | 将同一套管理功能直接嵌入页面或现有布局。 |

组件使用应用已有的 `QueryClientProvider` 和 `LanguageProvider`，无需路由上下文或额外创建查询客户端。中英文文案与弹窗样式共用系统约定，操作按钮使用胶囊样式。

## 快捷新增与保存后选中

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProductAppearanceEditorDialog } from '@/features/engineering/components/product-appearance/product-appearance-editor-dialog'

export function ProductAppearanceQuickCreateAndSelectionExample() {
  const [appearanceEditorOpen, setAppearanceEditorOpen] = useState(false)
  const [selectedAppearanceId, setSelectedAppearanceId] = useState('')

  return (
    <>
      <Button
        className='rounded-full'
        onClick={() => setAppearanceEditorOpen(true)}
      >
        新增产品外观
      </Button>
      <output>{selectedAppearanceId}</output>
      <ProductAppearanceEditorDialog
        open={appearanceEditorOpen}
        onOpenChange={setAppearanceEditorOpen}
        onSaved={(savedAppearance) => {
          if (savedAppearance.active)
            setSelectedAppearanceId(savedAppearance.id)
        }}
      />
    </>
  )
}
```

| 参数 | 用途 |
| --- | --- |
| `open`、`onOpenChange` | 控制弹窗；关闭后再次打开建立新表单会话。 |
| `appearance` | 可选，传入已有完整 `ProductAppearance` 进入编辑模式；不传则新增。 |
| `onSaved` | 可选，保存及缓存刷新结束后回传后端完整记录，包含 ID、启用状态、排序和版本。后台刷新失败仍回传已成功保存的记录。 |

编辑时直接传入目录查询中的记录。弹窗自行加载目录、校验条码位值及重复项、上传图片并保存，无需调用方组织 API 请求。外观的 `barcodeCode` 是业务条码位值，限定 1–9，并非自动生成的记录 ID。

## 完整管理与选用

```tsx
import { ProductAppearanceManagementDialog } from '@/features/engineering/components/product-appearance/product-appearance-management-dialog'

<ProductAppearanceManagementDialog
  open={appearanceManagementOpen}
  onOpenChange={setAppearanceManagementOpen}
  onAppearanceSelected={(appearance) => {
    setSelectedAppearanceId(appearance.id)
  }}
  onAppearanceSaved={(appearance) => {
    if (selectedAppearanceId === appearance.id && !appearance.active)
      setSelectedAppearanceId('')
  }}
  onAppearanceDeleted={(deletedAppearanceId) => {
    if (selectedAppearanceId === deletedAppearanceId)
      setSelectedAppearanceId('')
  }}
/>
```

以上开关和选中状态由调用方管理。传入 `onAppearanceSelected` 后显示“选用”操作，仅启用项可以选用，选中后自动关闭完整管理弹窗。不传该回调时提供纯管理功能。`onAppearanceSaved` 涵盖新增、编辑和启停，可能回传停用记录；调用方应按业务需要决定是否回填。

嵌入式 `ProductAppearanceManagementPanel` 提供相同的三个业务回调，但不负责关闭调用方容器。完整管理弹窗在保存、启停或删除期间阻止主动关闭。

## 数据与失败处理

- 目录使用 `PRODUCT_APPEARANCES_QUERY_KEY`，与销售单据现有外观资源查询共享完整数据；需要选择时由业务页面筛选启用项，不要用相同查询键存放仅启用项的列表。
- 保存成功先取消未完成的旧查询、合并后端记录，再刷新目录；删除成功先移除缓存记录。后台刷新失败保留缓存并提供重试入口，已成功写入的操作不会误报为保存失败。
- 目录首次加载失败时展示错误，编辑弹窗保留输入内容并禁止保存，重试成功后继续填写。管理面板不会把查询失败展示为“没有外观”。
- 新增会话只生成一次内部 ID，保存失败后保留草稿和 ID；保存期间阻止重复提交和关闭。编辑会话保留打开时的原始记录及版本，同 ID 的后台数据更新不会覆盖草稿或替换提交基线。
- 编辑使用现有 HTTP PATCH 端点和 `{ op, delta, metadata: { id, version } }` 协议，仅提交变化字段。清空说明、移除图片和 `active: false` 都会明确提交。版本冲突返回 409，保留当前草稿，需要刷新后重新打开编辑。
- 图片通过系统 `/assets/upload` 接口上传，支持 PNG、JPG、GIF，最大 50MB。外观记录只保存返回的图片地址；兼容旧图片地址与历史内嵌图片。上传期间禁止保存和主动关闭。

组件沿用现有权限：后端写入仍要求管理员权限，跨页面调用不会绕过权限校验。调用方是否展示管理入口，应遵循其现有权限控制。

## 验证命令

前端测试覆盖真实 API 客户端请求、保存后调用方回填、共享缓存、失败重试、版本基线、图片上传、中英文嵌套弹窗及选用：

```sh
pnpm exec vitest run src/features/engineering/components/product-appearance/product-appearance-business-dialog-save-cache-refresh-and-caller-selection.spec.tsx
```

后端测试在独立内存 SQLite 中验证停用状态落库、字段清空与版本冲突，不写入开发数据库；在 `server` 目录执行：

```sh
go test ./services -run '^TestProductAppearanceBusinessComponent' -count=1
```
