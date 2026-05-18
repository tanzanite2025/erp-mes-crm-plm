import { useState, useRef, useMemo } from 'react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type EquipmentCategory } from '../data/schema'
import { Upload, Trash2, ImagePlus, Box, Loader2, Save } from 'lucide-react'
import { EquipmentCategoryDeleteDialog } from './equipment-category-delete-dialog'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface CategoryActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: EquipmentCategory | null
    parentId?: string
    onSave: (payload: { data: EquipmentCategory; isPatch: boolean; delta?: any; version?: number }) => void
    onDelete?: (id: string) => void
    isLoading?: boolean
}

const DEFAULT_CATEGORY: Partial<EquipmentCategory> = {
    name: '',
    description: '',
    order: 0,
    imageUrl: '',
    version: 1,
}

/**
 * 实验领域资产中心 - 分类编辑/新增弹窗 (UDS 1.0 + SDRTS)
 */
export function CategoryActionDialog({
    open,
    onOpenChange,
    category,
    parentId,
    onSave,
    onDelete,
    isLoading,
}: CategoryActionDialogProps) {
    const { t } = useLanguage()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    const shellClasses = buildActionDialogShellClasses({
        content: 'sm:max-w-[560px] rounded-[32px] overflow-hidden',
        header: 'p-8 pb-4 border-none bg-muted/5',
        title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
        description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
        body: 'p-8 pt-4 space-y-6',
        footer: 'p-8 pt-4 flex items-center justify-between sm:justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
    })

    const isEdit = !!category
    const initialFormData = useMemo(() => {
        if (category) return category
        return { ...DEFAULT_CATEGORY, parentId, createdAt: new Date().toISOString() } as EquipmentCategory
    }, [category, parentId, open])

    const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

    const handleSave = () => {
        if (!formData.name) {
            toast.error(t('labExperimental.toasts.formIncomplete') || '请输入分类名称')
            return
        }

        const isPatch = isEdit
        if (isPatch && category) {
            const delta = tracker.commit()
            if (Object.keys(delta).length === 0) {
                onOpenChange(false)
                return
            }
            onSave({ data: formData, isPatch: true, delta, version: category.version })
        } else {
            onSave({ data: formData, isPatch: false })
        }
    }

    const handleDelete = () => {
        setIsDeleteDialogOpen(true)
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                formData.imageUrl = reader.result as string
            }
            reader.readAsDataURL(file)
        }
    }

    const isTopLevel = !parentId && !category?.parentId

    return (
        <>
            <ActionDialogShell
                open={open}
                onOpenChange={onOpenChange}
                title={(
                    <>
                        <Box className='size-5 text-primary' />
                        {category ? '编辑实验领域资产资料' : '建立全新实验技术类目'}
                    </>
                )}
                description={isTopLevel ? 'CORE_DOMAIN / 顶级分类过通过名称与描述定义业务领域。' : 'SUB_CATEGORY / 子级分类支持上传实物配图，以便快速识别。'}
                contentClassName={shellClasses.content}
                headerClassName={shellClasses.header}
                bodyClassName={shellClasses.body}
                footerClassName={shellClasses.footer}
                titleClassName={shellClasses.title}
                descriptionClassName={shellClasses.description}
                footer={(
                    <>
                        {category && onDelete && (
                            <Button
                                variant="ghost"
                                onClick={handleDelete}
                                className="text-destructive hover:bg-destructive/10 rounded-full font-black text-[10px] uppercase tracking-widest px-6"
                            >
                                <Trash2 className="mr-2 size-3.5" />
                                永久删除 / PURGE
                            </Button>
                        )}
                        <div className="flex items-center gap-3 ms-auto">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-black text-[10px] uppercase tracking-widest rounded-full px-6">取消 / CANCEL</Button>
                            <Button 
                                disabled={isLoading}
                                onClick={handleSave} 
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-primary/20 active:scale-95 transition-all gap-2"
                            >
                                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                                保存更改 / COMMIT
                            </Button>
                        </div>
                    </>
                )}
            >
                <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />
                
                <div className="space-y-6 relative">
                    <div className={isTopLevel ? "grid gap-6" : "grid grid-cols-[160px_1fr] gap-8 items-start"}>
                        {!isTopLevel && (
                            <div
                                onClick={handleUploadClick}
                                className="aspect-square rounded-[24px] bg-muted/30 border-2 border-dashed flex flex-col items-center justify-center p-0 text-center cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-all group relative overflow-hidden shadow-inner"
                            >
                                {formData.imageUrl ? (
                                    <>
                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                            <ImagePlus className="size-6 text-primary mb-1" />
                                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">更换图标</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="bg-primary/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                                            <Upload className="size-6 text-primary" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-muted-foreground/60 leading-tight px-4 tracking-widest italic">
                                            点击上传<br />设备实物图
                                        </span>
                                    </>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>
                        )}
                        <div className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">分类名称 / CATEGORY_NAME</Label>
                                <Input
                                    id="name"
                                    placeholder={isTopLevel ? "例如：压力感知中心" : "PX-900 传感器"}
                                    className="h-12 font-black text-sm rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 px-5"
                                    value={formData.name}
                                    onChange={e => { formData.name = e.target.value }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">层级归属 / HIERARCHY</Label>
                                <div className="px-5 h-12 rounded-2xl bg-muted/20 border-none text-[10px] font-black text-muted-foreground flex items-center gap-3 italic">
                                    <div className="size-2 rounded-full bg-primary/40 animate-pulse" />
                                    {parentId || category?.parentId ? `子分类_SUB (PARENT_ID: ${parentId || category?.parentId})` : '顶级业务领域_CORE'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">资产领域描述 / DOMAIN_DESCRIPTION</Label>
                        <Textarea
                            id="description"
                            placeholder="请输入分类的详细描述、功能用途及相关标准..."
                            rows={4}
                            className="resize-none font-medium text-[11px] leading-relaxed rounded-2xl border-none bg-muted/40 focus-visible:ring-primary/30 p-5"
                            value={formData.description}
                            onChange={e => { formData.description = e.target.value }}
                        />
                    </div>
                </div>
            </ActionDialogShell>

            <EquipmentCategoryDeleteDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                categoryName={category?.name || ''}
                onConfirm={() => {
                    if (category && onDelete) {
                        onDelete(category.id)
                        onOpenChange(false)
                    }
                }}
            />
        </>
    )
}
