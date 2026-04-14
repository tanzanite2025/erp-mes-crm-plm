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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { isConflictError } from '@/lib/handle-server-error'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { failLoudly } from '@/lib/safe-catch'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'

import { useWarehouseCategory, type WarehouseCategory as Category } from '../category'

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
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    const {
        categories,
        error: loadError,
        createCategory,
        patchCategory,
        deleteCategory,
        isActionLoading
    } = useWarehouseCategory()

    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState<CategoryFormState>(DEFAULT_FORM_DATA)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string, name: string } | null>(null)

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

    const handleDeleteClick = async (id: string, isSystem: boolean, name: string) => {
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

                await patchCategory({ id: editingCategory.id, delta, version: editingCategory.version })
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

    const filteredCategories = useMemo(() => categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [categories, searchTerm])

    if (isForbiddenError(loadError)) {
        return <ForbiddenState />
    }

    return (
        <>
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 relative overflow-hidden'>
                    <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
                    <div className='flex items-center gap-3 text-primary relative z-10'>
                        <Warehouse className='size-5' />
                        <h2 className='text-xl font-black uppercase italic tracking-tighter'>
                            {t('warehouse.category.title')} / WAREHOUSE_BASE_SETUP
                        </h2>
                    </div>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 relative z-10'>
                        {t('warehouse.category.subtitle')}
                    </p>
                </div>

                <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                    <div className='relative w-full sm:max-w-sm shrink-0'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                        <Input
                            placeholder={t('warehouse.category.searchPlaceholder')}
                            className='pl-10 h-11 md:h-12 rounded-xl md:rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-xs md:text-sm font-medium transition-all'
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className='flex items-center gap-3 justify-end'>
                        <Button
                            onClick={handleAdd}
                            className='h-10 md:h-11 px-4 md:px-6 rounded-full font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all gap-2 shrink-0'
                        >
                            <Plus className='size-3.5 md:size-4' />
                            <span className='truncate'>{t('warehouse.category.add')}</span>
                        </Button>
                    </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => {
                            const scopeTags = [
                                cat.allowInbound ? t('warehouse.category.card.scopeInbound') : null,
                                cat.allowShipment ? t('warehouse.category.card.scopeShipment') : null,
                                cat.allowStocktake ? t('warehouse.category.card.scopeStocktake') : null,
                                cat.allowPurchaseReceipt ? t('warehouse.category.card.scopePurchaseReceipt') : null,
                            ].filter(Boolean)

                            const defaultTags = [
                                cat.defaultForProductInbound ? t('warehouse.category.card.defaultProductInbound') : null,
                                cat.defaultForMaterialInbound ? t('warehouse.category.card.defaultMaterialInbound') : null,
                                cat.defaultForPurchaseReceipt ? t('warehouse.category.card.defaultPurchaseReceipt') : null,
                            ].filter(Boolean)

                            return (
                                <div
                                    key={cat.id}
                                    className='group relative bg-background rounded-[24px] border border-muted/60 p-6 transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 hover:border-blue-500/50'
                                >
                                    <div className='flex items-start justify-between gap-4'>
                                        <div className='flex items-center gap-4 min-w-0'>
                                            <div className='size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform shrink-0'>
                                                <Warehouse className='size-6' />
                                            </div>
                                            <div className='space-y-1 min-w-0'>
                                                <div className='flex items-center gap-2 flex-wrap'>
                                                    <h4 className='text-lg font-black text-slate-800 tracking-tighter uppercase italic truncate'>
                                                        {cat.name}
                                                    </h4>
                                                    <Badge className={cn(
                                                        'text-[8px] font-black uppercase tracking-widest border-none h-5 px-2 rounded-full',
                                                        cat.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground/60'
                                                    )}>
                                                        {cat.active ? t('warehouse.category.card.enabled') : t('warehouse.category.card.disabled')}
                                                    </Badge>
                                                </div>
                                                <Badge className='text-[8px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground/70 border-none h-4 px-2 rounded-full'>
                                                    {t('warehouse.category.codeLabel')}: {cat.code}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
                                            <Button
                                                variant='ghost'
                                                size='icon'
                                                onClick={() => handleEdit(cat)}
                                                className='size-9 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all'
                                            >
                                                <Edit2 className='size-4' />
                                            </Button>
                                            <Button
                                                variant='ghost'
                                                size='icon'
                                                onClick={() => handleDeleteClick(cat.id, cat.isSystem, cat.name)}
                                                className='size-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all'
                                            >
                                                <Trash2 className='size-4' />
                                            </Button>
                                        </div>
                                    </div>

                                    <p className='mt-4 text-[11px] leading-5 text-muted-foreground min-h-10'>
                                        {cat.description || t('warehouse.category.card.noDescription')}
                                    </p>

                                    <div className='mt-5 space-y-3'>
                                        <div className='space-y-2'>
                                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                                {t('warehouse.category.card.scopeTitle')}
                                            </div>
                                            <div className='flex flex-wrap gap-2'>
                                                {scopeTags.length > 0 ? scopeTags.map((scope) => (
                                                    <Badge key={scope} className='bg-blue-500/10 text-blue-600 border-none h-5 px-2 rounded-full text-[8px] font-black uppercase tracking-widest'>
                                                        {scope}
                                                    </Badge>
                                                )) : (
                                                    <Badge className='bg-muted text-muted-foreground/60 border-none h-5 px-2 rounded-full text-[8px] font-black uppercase tracking-widest'>
                                                        {t('warehouse.category.card.noScope')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>

                                        <div className='space-y-2'>
                                            <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
                                                {t('warehouse.category.card.defaultTitle')}
                                            </div>
                                            <div className='flex flex-wrap gap-2'>
                                                {defaultTags.length > 0 ? defaultTags.map((rule) => (
                                                    <Badge key={rule} className='bg-amber-500/10 text-amber-600 border-none h-5 px-2 rounded-full text-[8px] font-black uppercase tracking-widest'>
                                                        {rule}
                                                    </Badge>
                                                )) : (
                                                    <Badge className='bg-muted text-muted-foreground/60 border-none h-5 px-2 rounded-full text-[8px] font-black uppercase tracking-widest'>
                                                        {t('warehouse.category.card.noDefault')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {cat.isSystem ? (
                                        <div className='mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-700'>
                                            系统保护发货占用仓，真实占库存，不允许删除。
                                        </div>
                                    ) : null}

                                    <div className='mt-6 pt-5 border-t border-dashed border-muted/80 flex items-center justify-between'>
                                        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>
                                            {t('warehouse.category.permissionLevel')}
                                        </div>
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-sm font-black text-[8px]',
                                            cat.isSystem ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                                        )}>
                                            {cat.isSystem
                                                ? t('warehouse.category.systemProtected')
                                                : t('warehouse.category.userDefined')}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className='col-span-full py-32 flex flex-col items-center justify-center text-center'>
                            <div className='relative mb-6'>
                                <Database className='size-20 opacity-5' />
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <Settings2 className='size-8 opacity-10 animate-pulse' />
                                </div>
                            </div>
                            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>{t('warehouse.category.empty')}</p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='w-[95vw] sm:max-w-[720px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
                    <div className='absolute inset-0 bg-linear-to-br from-blue-600/5 via-transparent pointer-events-none' />

                    <div className='relative p-5 md:p-8'>
                        <DialogHeader className='mb-6 md:mb-8 text-left'>
                            <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase italic truncate'>
                                {editingCategory ? t('warehouse.category.dialog.editTitle') : t('warehouse.category.dialog.createTitle')}
                            </DialogTitle>
                            <DialogDescription className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1 truncate'>
                                {t('warehouse.category.dialog.description')}
                            </DialogDescription>
                        </DialogHeader>

                        <div className='space-y-6'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.category.dialog.nameLabel')}
                                    </Label>
                                    <Input
                                        id='name'
                                        value={formData.name}
                                        onChange={(e) => updateForm({ name: e.target.value })}
                                        placeholder={t('warehouse.category.dialog.namePlaceholder')}
                                        className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner text-xs md:text-sm'
                                    />
                                </div>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.category.dialog.codeLabel')}
                                    </Label>
                                    <Input
                                        id='code'
                                        value={formData.code}
                                        onChange={(e) => updateForm({ code: normalizeMachineCode(e.target.value) })}
                                        placeholder={t('warehouse.category.dialog.codePlaceholder')}
                                        className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-black text-xs md:text-sm px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner'
                                    />
                                </div>
                            </div>

                            <div className='grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4 md:gap-6'>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.category.dialog.descriptionLabel')}
                                    </Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => updateForm({ description: e.target.value })}
                                        placeholder={t('warehouse.category.dialog.descriptionPlaceholder')}
                                        className='min-h-[96px] rounded-xl bg-muted/50 border-none font-medium px-4 py-3 focus-visible:ring-blue-600 shadow-inner text-xs md:text-sm resize-none'
                                    />
                                </div>
                                <div className='space-y-2 md:space-y-3'>
                                    <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                        {t('warehouse.category.dialog.sortOrderLabel')}
                                    </Label>
                                    <Input
                                        type='number'
                                        value={formData.sortOrder}
                                        onChange={(e) => updateForm({ sortOrder: Number(e.target.value) || 0 })}
                                        placeholder='0'
                                        className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-black text-xs md:text-sm px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner'
                                    />
                                    <div className='flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3'>
                                        <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                            {t('warehouse.category.dialog.activeLabel')}
                                        </span>
                                        <Switch
                                            checked={formData.active}
                                            onCheckedChange={(checked) => updateForm({ active: checked })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6'>
                                <div className='rounded-2xl border border-dashed border-blue-500/20 bg-blue-500/5 p-4 md:p-5 space-y-4'>
                                    <div>
                                        <h4 className='text-[11px] font-black uppercase tracking-widest text-blue-700'>
                                            {t('warehouse.category.dialog.scopeTitle')}
                                        </h4>
                                        <p className='text-[10px] text-blue-700/60 mt-1'>
                                            {t('warehouse.category.dialog.scopeDescription')}
                                        </p>
                                    </div>

                                    <div className='space-y-3'>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.allowInboundLabel')}
                                            </span>
                                            <Switch checked={formData.allowInbound} onCheckedChange={(checked) => updateForm({ allowInbound: checked })} />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.allowShipmentLabel')}
                                            </span>
                                            <Switch checked={formData.allowShipment} onCheckedChange={(checked) => updateForm({ allowShipment: checked })} />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.allowStocktakeLabel')}
                                            </span>
                                            <Switch checked={formData.allowStocktake} onCheckedChange={(checked) => updateForm({ allowStocktake: checked })} />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.allowPurchaseReceiptLabel')}
                                            </span>
                                            <Switch checked={formData.allowPurchaseReceipt} onCheckedChange={(checked) => updateForm({ allowPurchaseReceipt: checked })} />
                                        </div>
                                    </div>
                                </div>

                                <div className='rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-4 md:p-5 space-y-4'>
                                    <div>
                                        <h4 className='text-[11px] font-black uppercase tracking-widest text-amber-700'>
                                            {t('warehouse.category.dialog.defaultRuleTitle')}
                                        </h4>
                                        <p className='text-[10px] text-amber-700/60 mt-1'>
                                            {t('warehouse.category.dialog.defaultRuleDescription')}
                                        </p>
                                    </div>

                                    <div className='space-y-3'>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.defaultProductInboundLabel')}
                                            </span>
                                            <Switch checked={formData.defaultForProductInbound} onCheckedChange={(checked) => updateForm({ defaultForProductInbound: checked })} />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.defaultMaterialInboundLabel')}
                                            </span>
                                            <Switch checked={formData.defaultForMaterialInbound} onCheckedChange={(checked) => updateForm({ defaultForMaterialInbound: checked })} />
                                        </div>
                                        <div className='flex items-center justify-between rounded-xl bg-background/80 px-4 py-3'>
                                            <span className='text-[10px] font-black uppercase tracking-widest text-slate-600'>
                                                {t('warehouse.category.dialog.defaultPurchaseReceiptLabel')}
                                            </span>
                                            <Switch checked={formData.defaultForPurchaseReceipt} onCheckedChange={(checked) => updateForm({ defaultForPurchaseReceipt: checked })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className='p-5 md:p-8 pt-0 bg-transparent flex flex-row items-center justify-between gap-3 md:gap-4'>
                        <Button
                            variant='ghost'
                            className='flex-1 h-10 md:h-11 rounded-full hover:bg-muted font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-colors'
                            onClick={() => setIsDialogOpen(false)}
                        >
                            {t('warehouse.category.dialog.cancel')}
                        </Button>
                        <Button
                            className='flex-1 h-10 md:h-11 rounded-full shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2'
                            onClick={handleSave}
                        >
                            <CheckCircle2 className='size-3.5 md:size-4' /> {t('warehouse.category.dialog.save')}
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
