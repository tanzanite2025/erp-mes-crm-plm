'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    Plus,
    Search,
    Trash2,
    Edit2,
    Database,
    CheckCircle2,
    Warehouse,
    Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
// Removed unused PageHeader
import { isForbiddenError } from '@/lib/error-status'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { isConflictError } from '@/lib/handle-server-error'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { failLoudly } from '@/lib/safe-catch'
import { trackDelta } from '@/lib/delta/proxy-tracker'

import { warehouseCategoryService, type WarehouseCategory as Category } from '../services/category-service'

export default function WarehouseCategory() {
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    const [categories, setCategories] = useState<Category[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({ name: '', code: '', description: '' })
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<{ id: string, name: string } | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [error, setError] = useState<unknown>(null)

    const refreshData = useCallback(async () => {
        try {
            setError(null)
            const data = await warehouseCategoryService.getCategories()
            setCategories(data)
        } catch (loadError) {
            setError(loadError)
            toast.error(t('warehouse.category.toast.loadFailed'))
        }
    }, [t])

    useEffect(() => {
        void refreshData()
    }, [refreshData])

    const handleAdd = () => {
        if (!allowsAction('action_warehouse_category_manage')) return
        setEditingCategory(null)
        setFormData({ name: '', code: '', description: '' })
        setIsDialogOpen(true)
    }

    const handleEdit = (category: Category) => {
        if (!allowsAction('action_warehouse_category_manage')) return
        setEditingCategory(category)
        setFormData({ name: category.name, code: category.code, description: category.description || '' })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: string, isSystem: boolean, name: string) => {
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
        setIsDeleting(true)
        try {
            await warehouseCategoryService.deleteCategory(categoryToDelete.id)
            toast.success(t('warehouse.category.toast.deleted'))
            setDeleteConfirmOpen(false)
            refreshData()
        } catch (error) {
            failLoudly(error, 'WarehouseCategory.onConfirmDelete')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleSave = async () => {
        if (!allowsAction('action_warehouse_category_manage')) return
        if (!formData.name || !formData.code) {
            toast.error(t('warehouse.category.toast.formIncomplete'))
            return
        }

        try {
            if (editingCategory) {
                // SDRTS 差量更新模式
                const tracker = trackDelta(editingCategory)
                const draft = tracker.data as Category
                Object.assign(draft, formData)
                const delta = tracker.commit()

                // 幂等性：无变动则直接关闭
                if (Object.keys(delta).length === 0) {
                    setIsDialogOpen(false)
                    return
                }

                await warehouseCategoryService.patchCategory(editingCategory.id, delta, editingCategory.version)
            } else {
                // 原子创建模式
                const newCategory: Omit<Category, 'id' | 'version'> = {
                    ...formData,
                    isSystem: false,
                    active: true,
                    sortOrder: 0
                }
                await warehouseCategoryService.createCategory(newCategory)
            }
            
            setIsDialogOpen(false)
            toast.success(
                editingCategory
                    ? t('warehouse.category.toast.updated')
                    : t('warehouse.category.toast.created')
            )
            refreshData()
        } catch (error) {
            if (isConflictError(error)) {
                toast.error(t('warehouse.category.toast.staleData'))
                return
            }
            failLoudly(error, 'WarehouseCategory.handleSave')
        }
    }

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isForbiddenError(error)) {
        return <ForbiddenState />
    }

    return (
        <>
            <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
                <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-8 relative overflow-hidden'>
                    <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent pointer-events-none' />
                    <div className='flex items-center gap-3 text-primary relative z-10'>
                        <Warehouse className='size-5' />
                        <h2 className='text-xl font-black uppercase italic tracking-tighter'>
                            {t('warehouse.category.title')} / CATEGORY_REGISTRY
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

                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((cat) => (
                            <div
                                key={cat.id}
                                className='group relative bg-background rounded-[24px] border border-muted/60 p-6 transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 hover:border-blue-500/50'
                            >
                                <div className='flex items-start justify-between'>
                                    <div className='flex items-center gap-4'>
                                        <div className='size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform'>
                                            <Warehouse className='size-6' />
                                        </div>
                                        <div className='space-y-0.5'>
                                            <h4 className='text-lg font-black text-slate-800 tracking-tighter uppercase italic'>
                                                {cat.name}
                                            </h4>
                                            <Badge className='text-[8px] font-black uppercase tracking-widest bg-muted/50 text-muted-foreground/40 border-none h-4 px-2 rounded-full'>
                                                {t('warehouse.category.codeLabel')}: {cat.code}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
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
                                            onClick={() => handleDelete(cat.id, cat.isSystem, cat.name)}
                                            className='size-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all'
                                        >
                                            <Trash2 className='size-4' />
                                        </Button>
                                    </div>
                                </div>

                                <div className='mt-8 pt-6 border-t border-dashed border-muted/80'>
                                    <div className='text-[10px] font-black font-mono text-muted-foreground/30 uppercase tracking-widest flex items-center justify-between'>
                                        {t('warehouse.category.permissionLevel')}
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
                            </div>
                        ))
                    ) : (
                        <div className='col-span-full py-32 flex flex-col items-center justify-center text-center'>
                            <div className='relative mb-6'>
                                <Database className='size-20 opacity-5' />
                                <div className='absolute inset-0 flex items-center justify-center'>
                                    <Package className='size-8 opacity-10 animate-pulse' />
                                </div>
                            </div>
                            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>{t('warehouse.category.empty')}</p>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className='w-[95vw] sm:max-w-[480px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
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

                        <div className='space-y-4 md:space-y-6'>
                            <div className='space-y-2 md:space-y-3'>
                                <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                                    {t('warehouse.category.dialog.nameLabel')}
                                </Label>
                                <Input
                                    id='name'
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder={t('warehouse.category.dialog.codePlaceholder')}
                                    className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-black text-xs md:text-sm px-4 md:px-5 focus-visible:ring-blue-600 shadow-inner'
                                />
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
                isLoading={isDeleting}
            />
        </>
    )
}
