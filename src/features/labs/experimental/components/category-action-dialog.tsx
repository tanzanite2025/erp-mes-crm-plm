import { useState, useEffect, useRef } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { type EquipmentCategory } from '../data/schema'
import { Upload, Trash2, ImagePlus, Box, Loader2, Save } from 'lucide-react'
import { EquipmentCategoryDeleteDialog } from './equipment-category-delete-dialog'

interface CategoryActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    category?: EquipmentCategory | null
    parentId?: string
    onSave: (data: Partial<EquipmentCategory>) => void
    onDelete?: (id: string) => void
    isLoading?: boolean
}

/**
 * 分类编辑/新增弹窗
 * 支持名称、描述、排序及图片预览
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
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [formData, setFormData] = useState<Partial<EquipmentCategory>>({
        name: '',
        description: '',
        order: 0,
        imageUrl: '',
    })

    useEffect(() => {
        if (category) {
            setFormData(category)
        } else {
            setFormData({
                name: '',
                description: '',
                order: 0,
                imageUrl: '',
                parentId: parentId,
            })
        }
    }, [category, parentId, open])

    const handleSave = () => {
        onSave(formData)
        onOpenChange(false)
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
                setFormData(prev => ({ ...prev, imageUrl: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    const isTopLevel = !parentId && !category?.parentId

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[560px] border-none shadow-2xl rounded-[32px] p-0 overflow-hidden bg-background">
                    <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none' />
                    
                    <DialogHeader className='p-8 pb-4'>
                        <div className='flex items-center gap-2 mb-2'>
                            <Box className='size-4 text-primary' />
                            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter">
                                {category ? '编辑实验领域资产资料' : '建立全新实验技术类目'}
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">
                            {isTopLevel ? 'CORE_DOMAIN / 顶级分类过通过名称与描述定义业务领域。' : 'SUB_CATEGORY / 子级分类支持上传实物配图，以便快速识别。'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-8 py-4 space-y-6">
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
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter className="p-8 pt-4 flex items-center justify-between sm:justify-between w-full">
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
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
