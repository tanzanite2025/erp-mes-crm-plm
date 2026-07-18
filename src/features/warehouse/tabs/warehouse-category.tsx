/**
 * 仓库分类(库区/库位)主数据管理页。
 *
 * 此页面是仓库结构维护的入口,管理 WarehouseCategory(树形结构):
 *   - 列表 + 树形展开
 *   - 创建/编辑/删除
 *   - 默认仓库 / 默认库区标记(全局唯一)
 *   - 物料阈值告警绑定(关联到具体库位)
 *
 * 这个组件 ~700 行较大,因为包含树形 UI + 表单 + 阈值配置三态;
 * 考虑后续拆为 CategoryTree / CategoryEditor / ThresholdConfig 三组件。
 */
'use client'

import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Database,
  CheckCircle2,
  Warehouse,
  Settings2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { isForbiddenError } from '@/lib/error-status'
import { isConflictError } from '@/lib/handle-server-error'
import { failLoudly } from '@/lib/safe-catch'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import {
  useWarehouseCategory,
  type WarehouseCategory as Category,
} from '../category'

type CategoryFormState = Omit<Category, 'id' | 'version'>

const DEFAULT_FORM_DATA: CategoryFormState = {
  name: '',
  code: '',
  description: '',
  isSystem: false,
  active: true,
  sortOrder: 0,
  allowInbound: true,
  allowShipment: true,
  allowStocktake: true,
  allowPurchaseReceipt: false,
  defaultForProductInbound: false,
  defaultForMaterialInbound: false,
  defaultForPurchaseReceipt: false,
}

export default function WarehouseCategory() {
  const { allowsAction } = usePermissionActions()
  const { t } = useLanguage()
  const {
    readResource,
    categories,
    error: loadError,
    refetch,
    createCategory,
    patchCategory,
    deleteCategory,
    isActionLoading,
  } = useWarehouseCategory()

  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormState>(DEFAULT_FORM_DATA)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string
    name: string
  } | null>(null)

  const handleAdd = () => {
    if (!allowsAction('action_warehouse_category_manage')) return
    setEditingCategory(null)
    setFormData({
      ...DEFAULT_FORM_DATA,
      sortOrder: categories.length + 1,
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (category: Category) => {
    if (!allowsAction('action_warehouse_category_manage')) return
    if (category.isSystem) {
      toast.error(t('warehouse.category.toast.systemProtected'))
      return
    }
    setEditingCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      isSystem: category.isSystem,
      active: category.active,
      sortOrder: category.sortOrder,
      allowInbound: category.allowInbound,
      allowShipment: category.allowShipment,
      allowStocktake: category.allowStocktake,
      allowPurchaseReceipt: category.allowPurchaseReceipt,
      defaultForProductInbound: category.defaultForProductInbound,
      defaultForMaterialInbound: category.defaultForMaterialInbound,
      defaultForPurchaseReceipt: category.defaultForPurchaseReceipt,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteClick = async (
    id: string,
    isSystem: boolean,
    name: string
  ) => {
    if (!allowsAction('action_warehouse_category_manage')) return
    if (isSystem) {
      toast.error(t('warehouse.category.toast.systemProtected'))
      return
    }
    setCategoryToDelete({ id, name })
    setDeleteConfirmOpen(true)
  }

  const onConfirmDelete = async () => {
    if (!categoryToDelete) return
    try {
      await deleteCategory(categoryToDelete.id)
      setDeleteConfirmOpen(false)
    } catch (error) {
      failLoudly(error, 'WarehouseCategory.onConfirmDelete')
    }
  }

  const updateForm = (patch: Partial<CategoryFormState>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch }

      if (!next.allowInbound) {
        next.defaultForProductInbound = false
        next.defaultForMaterialInbound = false
      }
      if (!next.allowPurchaseReceipt) {
        next.defaultForPurchaseReceipt = false
      }
      if (!next.active) {
        next.defaultForProductInbound = false
        next.defaultForMaterialInbound = false
        next.defaultForPurchaseReceipt = false
      }
      if (next.defaultForProductInbound || next.defaultForMaterialInbound) {
        next.allowInbound = true
        next.active = true
      }
      if (next.defaultForPurchaseReceipt) {
        next.allowPurchaseReceipt = true
        next.active = true
      }

      return next
    })
  }

  const handleSave = async () => {
    if (!allowsAction('action_warehouse_category_manage')) return
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error(t('warehouse.category.toast.formIncomplete'))
      return
    }

    try {
      if (editingCategory) {
        const tracker = trackDelta(editingCategory)
        const draft = tracker.data as Category
        Object.assign(draft, {
          ...formData,
          name: formData.name.trim(),
          code: normalizeMachineCode(formData.code),
          description: (formData.description ?? '').trim(),
        })
        const delta = tracker.commit()

        if (Object.keys(delta).length === 0) {
          setIsDialogOpen(false)
          return
        }

        await patchCategory({
          id: editingCategory.id,
          delta,
          version: editingCategory.version,
        })
      } else {
        const newCategory: Omit<Category, 'id' | 'version'> = {
          ...formData,
          name: formData.name.trim(),
          code: normalizeMachineCode(formData.code),
          description: (formData.description ?? '').trim(),
          isSystem: false,
        }
        await createCategory(newCategory)
      }

      setIsDialogOpen(false)
    } catch (error) {
      if (editingCategory && isConflictError(error)) {
        toast.error(t('warehouse.category.toast.staleData'))
        return
      }
      failLoudly(error, 'WarehouseCategory.handleSave')
    }
  }

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cat.description || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      ),
    [categories, searchTerm]
  )

  if (isForbiddenError(loadError)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/[0.03] px-6 text-center'>
          <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            仓别列表加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {readResource.error.message || '请重试后再编辑仓别配置。'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void refetch()
            }}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (readResource.status === 'loading') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
          <Loader2 className='size-8 animate-spin text-primary/40' />
          <p className='mt-4 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            仓别列表加载中
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
        <div className='relative flex flex-col gap-1 overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-6'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <div className='relative z-10 flex items-center gap-3 text-primary'>
            <Warehouse className='size-5' />
            <h2 className='text-xl font-black tracking-tighter uppercase italic'>
              {t('warehouse.category.title')} / WAREHOUSE_BASE_SETUP
            </h2>
          </div>
          <p className='relative z-10 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('warehouse.category.subtitle')}
          </p>
        </div>

        <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
          <div className='relative w-full shrink-0 sm:max-w-sm'>
            <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
            <Input
              placeholder={t('warehouse.category.searchPlaceholder')}
              className='h-11 rounded-xl border-none bg-muted/50 pl-10 text-xs font-medium transition-all focus-visible:ring-1 focus-visible:ring-primary/20 md:h-12 md:rounded-2xl md:text-sm'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className='flex items-center justify-end gap-3'>
            <Button
              onClick={handleAdd}
              className='h-10 shrink-0 gap-2 rounded-full px-4 text-[9px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 md:h-11 md:px-6 md:text-[10px]'
            >
              <Plus className='size-3.5 md:size-4' />
              <span className='truncate'>{t('warehouse.category.add')}</span>
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'>
          {filteredCategories.length > 0 ? (
            filteredCategories.map((cat) => {
              const scopeTags = [
                cat.allowInbound
                  ? t('warehouse.category.card.scopeInbound')
                  : null,
                cat.allowShipment
                  ? t('warehouse.category.card.scopeShipment')
                  : null,
                cat.allowStocktake
                  ? t('warehouse.category.card.scopeStocktake')
                  : null,
                cat.allowPurchaseReceipt
                  ? t('warehouse.category.card.scopePurchaseReceipt')
                  : null,
              ].filter(Boolean)

              const defaultTags = [
                cat.defaultForProductInbound
                  ? t('warehouse.category.card.defaultProductInbound')
                  : null,
                cat.defaultForMaterialInbound
                  ? t('warehouse.category.card.defaultMaterialInbound')
                  : null,
                cat.defaultForPurchaseReceipt
                  ? t('warehouse.category.card.defaultPurchaseReceipt')
                  : null,
              ].filter(Boolean)

              return (
                <div
                  key={cat.id}
                  className='group relative rounded-[24px] border border-muted/60 bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 md:p-5'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600 shadow-inner transition-transform group-hover:scale-105'>
                        <Warehouse className='size-5' />
                      </div>
                      <div className='min-w-0 space-y-0.5'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <h4
                            className={cn(
                              'truncate font-black tracking-tighter text-slate-800 uppercase italic',
                              cat.name.length > 4 ? 'text-sm' : 'text-base'
                            )}
                          >
                            {cat.name}
                          </h4>
                          <Badge
                            className={cn(
                              'h-5 rounded-full border-none px-2 text-[8px] font-black tracking-widest uppercase',
                              cat.active
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-muted text-muted-foreground/60'
                            )}
                          >
                            {cat.active
                              ? t('warehouse.category.card.enabled')
                              : t('warehouse.category.card.disabled')}
                          </Badge>
                        </div>
                        <Badge className='h-4 rounded-full border-none bg-muted/50 px-2 text-[8px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                          {t('warehouse.category.codeLabel')}: {cat.code}
                        </Badge>
                      </div>
                    </div>
                    {!cat.isSystem ? (
                      <div className='flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleEdit(cat)}
                          className='size-9 rounded-lg text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600'
                        >
                          <Edit2 className='size-4' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() =>
                            handleDeleteClick(cat.id, cat.isSystem, cat.name)
                          }
                          className='size-9 rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600'
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <p className='mt-3 min-h-10 text-[11px] leading-5 text-muted-foreground'>
                    {cat.description ||
                      t('warehouse.category.card.noDescription')}
                  </p>

                  <div className='mt-4 space-y-2.5'>
                    <div className='space-y-1.5'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('warehouse.category.card.scopeTitle')}
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {scopeTags.length > 0 ? (
                          scopeTags.map((scope) => (
                            <Badge
                              key={scope}
                              className='h-5 rounded-full border-none bg-blue-500/10 px-2 text-[8px] font-black tracking-widest text-blue-600 uppercase'
                            >
                              {scope}
                            </Badge>
                          ))
                        ) : (
                          <Badge className='h-5 rounded-full border-none bg-muted px-2 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            {t('warehouse.category.card.noScope')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <div className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('warehouse.category.card.defaultTitle')}
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {defaultTags.length > 0 ? (
                          defaultTags.map((rule) => (
                            <Badge
                              key={rule}
                              className='h-5 rounded-full border-none bg-amber-500/10 px-2 text-[8px] font-black tracking-widest text-amber-600 uppercase'
                            >
                              {rule}
                            </Badge>
                          ))
                        ) : (
                          <Badge className='h-5 rounded-full border-none bg-muted px-2 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                            {t('warehouse.category.card.noDefault')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {cat.isSystem ? (
                    <div className='mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700'>
                      系统保护库区，不允许编辑或删除。
                    </div>
                  ) : null}

                  <div className='mt-4 flex items-center justify-between border-t border-dashed border-muted/80 pt-3.5'>
                    <div className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                      {t('warehouse.category.permissionLevel')}
                    </div>
                    <span
                      className={cn(
                        'rounded-sm px-2 py-0.5 text-[8px] font-black',
                        cat.isSystem
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-emerald-500/10 text-emerald-600'
                      )}
                    >
                      {cat.isSystem
                        ? t('warehouse.category.systemProtected')
                        : t('warehouse.category.userDefined')}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className='col-span-full flex flex-col items-center justify-center py-32 text-center'>
              <div className='relative mb-6'>
                <Database className='size-20 opacity-5' />
                <div className='absolute inset-0 flex items-center justify-center'>
                  <Settings2 className='size-8 animate-pulse opacity-10' />
                </div>
              </div>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                {t('warehouse.category.empty')}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='w-[95vw] overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[720px] md:rounded-[32px]'>
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-blue-600/5 via-transparent' />

          <div className='relative p-5 md:p-8'>
            <DialogHeader className='mb-6 text-left md:mb-8'>
              <DialogTitle className='truncate text-lg font-black tracking-tighter uppercase italic md:text-xl'>
                {editingCategory
                  ? t('warehouse.category.dialog.editTitle')
                  : t('warehouse.category.dialog.createTitle')}
              </DialogTitle>
              <DialogDescription className='mt-1 truncate text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:text-[9px]'>
                {t('warehouse.category.dialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-6'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6'>
                <div className='space-y-2 md:space-y-3'>
                  <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                    {t('warehouse.category.dialog.nameLabel')}
                  </Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) => updateForm({ name: e.target.value })}
                    placeholder={t('warehouse.category.dialog.namePlaceholder')}
                    className='h-10 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner focus-visible:ring-blue-600 md:h-11 md:px-5 md:text-sm'
                  />
                </div>
                <div className='space-y-2 md:space-y-3'>
                  <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                    {t('warehouse.category.dialog.codeLabel')}
                  </Label>
                  <Input
                    id='code'
                    value={formData.code}
                    onChange={(e) =>
                      updateForm({ code: normalizeMachineCode(e.target.value) })
                    }
                    placeholder={t('warehouse.category.dialog.codePlaceholder')}
                    className='h-10 rounded-xl border-none bg-muted/50 px-4 font-mono text-xs font-black shadow-inner focus-visible:ring-blue-600 md:h-11 md:px-5 md:text-sm'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px] md:gap-6'>
                <div className='space-y-2 md:space-y-3'>
                  <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                    {t('warehouse.category.dialog.descriptionLabel')}
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      updateForm({ description: e.target.value })
                    }
                    placeholder={t(
                      'warehouse.category.dialog.descriptionPlaceholder'
                    )}
                    className='min-h-[96px] resize-none rounded-xl border-none bg-muted/50 px-4 py-3 text-xs font-medium shadow-inner focus-visible:ring-blue-600 md:text-sm'
                  />
                </div>
                <div className='space-y-2 md:space-y-3'>
                  <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                    {t('warehouse.category.dialog.sortOrderLabel')}
                  </Label>
                  <Input
                    type='number'
                    value={formData.sortOrder}
                    onChange={(e) =>
                      updateForm({ sortOrder: Number(e.target.value) || 0 })
                    }
                    placeholder='0'
                    className='h-10 rounded-xl border-none bg-muted/50 px-4 font-mono text-xs font-black shadow-inner focus-visible:ring-blue-600 md:h-11 md:px-5 md:text-sm'
                  />
                  <div className='flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3'>
                    <span className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('warehouse.category.dialog.activeLabel')}
                    </span>
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(checked) =>
                        updateForm({ active: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2'>
                <div className='space-y-4 rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4 md:p-5'>
                  <div>
                    <h4 className='text-[11px] font-black tracking-widest text-blue-700 uppercase'>
                      {t('warehouse.category.dialog.scopeTitle')}
                    </h4>
                    <p className='mt-1 text-[10px] text-blue-700/60'>
                      {t('warehouse.category.dialog.scopeDescription')}
                    </p>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t('warehouse.category.dialog.allowInboundLabel')}
                      </span>
                      <Switch
                        checked={formData.allowInbound}
                        onCheckedChange={(checked) =>
                          updateForm({ allowInbound: checked })
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t('warehouse.category.dialog.allowShipmentLabel')}
                      </span>
                      <Switch
                        checked={formData.allowShipment}
                        onCheckedChange={(checked) =>
                          updateForm({ allowShipment: checked })
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t('warehouse.category.dialog.allowStocktakeLabel')}
                      </span>
                      <Switch
                        checked={formData.allowStocktake}
                        onCheckedChange={(checked) =>
                          updateForm({ allowStocktake: checked })
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t(
                          'warehouse.category.dialog.allowPurchaseReceiptLabel'
                        )}
                      </span>
                      <Switch
                        checked={formData.allowPurchaseReceipt}
                        onCheckedChange={(checked) =>
                          updateForm({ allowPurchaseReceipt: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className='space-y-4 rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-4 md:p-5'>
                  <div>
                    <h4 className='text-[11px] font-black tracking-widest text-amber-700 uppercase'>
                      {t('warehouse.category.dialog.defaultRuleTitle')}
                    </h4>
                    <p className='mt-1 text-[10px] text-amber-700/60'>
                      {t('warehouse.category.dialog.defaultRuleDescription')}
                    </p>
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t(
                          'warehouse.category.dialog.defaultProductInboundLabel'
                        )}
                      </span>
                      <Switch
                        checked={formData.defaultForProductInbound}
                        onCheckedChange={(checked) =>
                          updateForm({ defaultForProductInbound: checked })
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t(
                          'warehouse.category.dialog.defaultMaterialInboundLabel'
                        )}
                      </span>
                      <Switch
                        checked={formData.defaultForMaterialInbound}
                        onCheckedChange={(checked) =>
                          updateForm({ defaultForMaterialInbound: checked })
                        }
                      />
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                      <span className='text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                        {t(
                          'warehouse.category.dialog.defaultPurchaseReceiptLabel'
                        )}
                      </span>
                      <Switch
                        checked={formData.defaultForPurchaseReceipt}
                        onCheckedChange={(checked) =>
                          updateForm({ defaultForPurchaseReceipt: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className='flex flex-row items-center justify-between gap-3 bg-transparent p-5 pt-0 md:gap-4 md:p-8'>
            <Button
              variant='ghost'
              className='h-10 flex-1 rounded-full text-[9px] font-black tracking-widest uppercase transition-colors hover:bg-muted md:h-11 md:text-[10px]'
              onClick={() => setIsDialogOpen(false)}
            >
              {t('warehouse.category.dialog.cancel')}
            </Button>
            <Button
              className='h-10 flex-1 gap-2 rounded-full bg-blue-600 text-[9px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 md:h-11 md:text-[10px]'
              onClick={handleSave}
            >
              <CheckCircle2 className='size-3.5 md:size-4' />{' '}
              {t('warehouse.category.dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t('warehouse.category.toast.deleteConfirm')}
        desc={categoryToDelete?.name || ''}
        destructive
        handleConfirm={onConfirmDelete}
        isLoading={isActionLoading}
      />
    </>
  )
}
