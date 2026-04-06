import { useState } from 'react'
import { type EquipmentCategory } from '../data/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Plus, Edit2, ChevronRight, Folder, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EquipmentCategoryDeleteDialog } from './equipment-category-delete-dialog'

interface EquipmentHierarchyProps {
    categories: EquipmentCategory[]
    parentCategoryId: string
    onAddSubCategory: (parentId: string) => void
    onEditCategory: (cat: EquipmentCategory) => void
    onDeleteCategory: (id: string) => void
}

/**
 * 实验设备层级管理组件
 * 展示指定分类下的所有子级及其预览配图
 */
export function EquipmentHierarchy({
    categories,
    parentCategoryId,
    onAddSubCategory,
    onEditCategory,
    onDeleteCategory,
}: EquipmentHierarchyProps) {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<EquipmentCategory | null>(null)

    const subCategories = categories
        .filter(c => c.parentId === parentCategoryId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))

    const parentCategory = categories.find(c => c.id === parentCategoryId)

    const handleDeleteClick = (cat: EquipmentCategory) => {
        setCategoryToDelete(cat)
        setIsDeleteDialogOpen(true)
    }

    const isTopLevelParent = !parentCategory?.parentId

    return (
        <div className='space-y-6 animate-in fade-in duration-500'>
            {/* 当前分类预览卡片 - 顶级分类不显示图片 */}
            <div className={isTopLevelParent ? 'p-10 border rounded-[32px] bg-muted/5 border-dashed relative overflow-hidden' : 'grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 p-8 border rounded-[32px] bg-muted/5 border-dashed'}>
                {!isTopLevelParent && (
                    <div className='aspect-video md:aspect-square rounded-[24px] bg-background flex items-center justify-center border border-dashed relative overflow-hidden group shadow-inner'>
                        {parentCategory?.imageUrl ? (
                            <img
                                src={parentCategory.imageUrl}
                                alt={parentCategory.name}
                                className='w-full h-full object-cover transition-transform group-hover:scale-110 duration-700'
                            />
                        ) : (
                            <div className='text-center space-y-3 opacity-20'>
                                <ImageIcon className='mx-auto size-12' />
                                <p className='text-[10px] font-black tracking-widest uppercase italic'>未上传实物配图 / NO_IMAGE</p>
                            </div>
                        )}
                        <div className='absolute inset-0 bg-primary/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500'>
                            <Button
                                variant='secondary'
                                size='sm'
                                className='h-9 text-[10px] font-black uppercase tracking-widest rounded-full'
                                onClick={() => onEditCategory(parentCategory!)}
                            >
                                更换配图
                            </Button>
                        </div>
                    </div>
                )}

                <div className='flex flex-col justify-between h-full min-h-[160px]'>
                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <h2 className={isTopLevelParent ? 'text-3xl font-black tracking-tighter italic uppercase' : 'text-2xl font-black tracking-tighter italic uppercase'}>
                                {parentCategory?.name}
                            </h2>
                            <Badge variant='outline' className='text-[9px] uppercase font-black tracking-widest bg-primary/10 border-primary/30 text-primary py-0.5 rounded-full'>
                                {isTopLevelParent ? '顶级实验领域 / CORE_DOMAIN' : '二级技术类目 / SUB_CATEGORY'}
                            </Badge>
                        </div>
                        <p className={isTopLevelParent ? 'text-[11px] font-medium text-muted-foreground leading-relaxed max-w-4xl tracking-wide' : 'text-[10px] font-medium text-muted-foreground leading-relaxed tracking-wide'}>
                            {parentCategory?.description || '暂无详细描述。可以通过编辑功能添加分类领域说明、技术规范以及行业标准等信息。NO_DESCRIPTION_PROVIDED_IN_SYSTEM'}
                        </p>
                    </div>

                    <div className='flex flex-col gap-4 mt-10'>
                        <div className='flex items-center gap-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                className='h-11 font-black px-6 rounded-full border-dashed border-2 text-[10px] uppercase tracking-widest'
                                onClick={() => onEditCategory(parentCategory!)}
                            >
                                <Edit2 className='mr-2 h-3.5 w-3.5' />
                                编辑基本资料
                            </Button>
                            <Button
                                variant='default'
                                size='sm'
                                className='h-11 font-black px-8 rounded-full bg-primary text-primary-foreground ms-auto text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all'
                                onClick={() => onAddSubCategory(parentCategoryId)}
                            >
                                <Plus className='mr-2 h-4 w-4' />
                                创建下级类目
                            </Button>
                        </div>

                        <div className='pt-4 border-t border-dashed flex justify-end'>
                            <Button
                                variant='ghost'
                                size='sm'
                                className='h-8 text-[9px] font-black uppercase tracking-widest text-destructive hover:text-destructive hover:bg-destructive/5 rounded-full px-4'
                                onClick={() => handleDeleteClick(parentCategory!)}
                            >
                                <Trash2 className='mr-2 h-3 w-3' />
                                永久删除此业务板块 / PURGE_DOMAIN
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 下级分类动态列表 - 子类支持显示图片预览 */}
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                {subCategories.map(cat => (
                    <Card key={cat.id} className='group hover:border-primary/50 transition-all border-dashed rounded-[24px] relative overflow-hidden flex flex-col bg-background shadow-sm hover:shadow-xl hover:shadow-primary/5'>
                        {cat.imageUrl && (
                            <div className='relative h-52 w-full overflow-hidden border-b border-dashed bg-muted/10 flex items-center justify-center p-4 group-hover:bg-muted/5 transition-colors'>
                                {/* 背景虚化增强 - 适配非 1:1 原图 */}
                                <div 
                                    className='absolute inset-0 opacity-15 blur-2xl scale-125 pointer-events-none'
                                    style={{ 
                                        backgroundImage: `url(${cat.imageUrl})`, 
                                        backgroundSize: 'cover', 
                                        backgroundPosition: 'center' 
                                    }}
                                />
                                
                                {/* 核心 1:1 正方形容器 */}
                                <div className='relative z-10 h-full aspect-square rounded-2xl shadow-2xl bg-background/40 backdrop-blur-md border border-white/10 overflow-hidden flex items-center justify-center'>
                                    <img 
                                        src={cat.imageUrl} 
                                        alt={cat.name} 
                                        className='w-full h-full object-contain transition-transform group-hover:scale-110 duration-700' 
                                    />
                                </div>
                            </div>
                        )}
                        <CardHeader className='pb-3 pt-6 px-6'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <Folder className='size-3.5 text-primary/60' />
                                    <CardTitle className='text-sm font-black italic tracking-tighter uppercase'>{cat.name}</CardTitle>
                                </div>
                                <div className='flex items-center gap-1'>
                                    <Button variant='ghost' size='icon' className='h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 rounded-full hover:bg-destructive/10' onClick={() => handleDeleteClick(cat)}>
                                        <Trash2 className='size-3.5' />
                                    </Button>
                                    <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={() => onEditCategory(cat)}>
                                        <ChevronRight className='size-4 text-muted-foreground' />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className='flex-1 flex flex-col px-6 pb-6'>
                            <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 line-clamp-2 leading-relaxed flex-1'>
                                {cat.description || '无下级分类描述 / NO_DESCRIPTION_AVAILABLE'}
                            </p>
                            <div className='mt-6 pt-4 border-t border-dashed flex items-center justify-between'>
                                <div className='flex flex-col gap-0.5'>
                                    <span className='text-[10px] font-black uppercase tracking-widest text-primary/80'>
                                        {categories.filter(c => c.parentId === cat.id).length} UNITS
                                    </span>
                                    <span className='text-[8px] font-mono text-muted-foreground uppercase'>子项资产统计</span>
                                </div>
                                <Button variant='link' className='h-auto p-0 text-[10px] font-black uppercase tracking-widest italic' onClick={() => {}}>VIEW_DETAILS</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <button
                    onClick={() => onAddSubCategory(parentCategoryId)}
                    className='min-h-[220px] border-2 border-dashed rounded-[24px] bg-muted/5 flex flex-col items-center justify-center gap-3 text-muted-foreground/30 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group'
                >
                    <div className='size-12 rounded-full border-2 border-dashed flex items-center justify-center group-hover:scale-110 transition-transform'>
                        <Plus className='size-6' />
                    </div>
                    <span className='text-[10px] font-black uppercase tracking-widest italic'>新建设备子类 / ADD_SUB_CATEGORY</span>
                </button>
            </div>

            {/* 删除确认弹窗 */}
            <EquipmentCategoryDeleteDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                categoryName={categoryToDelete?.name || ''}
                onConfirm={() => {
                    if (categoryToDelete) {
                        onDeleteCategory(categoryToDelete.id)
                    }
                }}
            />
        </div>
    )
}
