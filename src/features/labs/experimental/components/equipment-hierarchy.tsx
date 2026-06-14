import { useState } from 'react'
import {
  Image as ImageIcon,
  Plus,
  Edit2,
  ChevronRight,
  Folder,
  Trash2,
  Fingerprint,
  Settings,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type Equipment, type EquipmentCategory } from '../data/schema'
import { useLabExperimentalEquipment } from '../hooks/use-lab-experimental'
import { EquipmentCategoryDeleteDialog } from './equipment-category-delete-dialog'

interface EquipmentHierarchyProps {
  categories: EquipmentCategory[]
  parentCategoryId: string
  onAddSubCategory: (parentId: string) => void
  onEditCategory: (cat: EquipmentCategory) => void
  onDeleteCategory: (id: string) => void
  onAddEquipment: (categoryId: string) => void
  onEditEquipment: (equip: Equipment) => void
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
  onAddEquipment,
  onEditEquipment,
}: EquipmentHierarchyProps) {
  const { data: equipments = [], isLoading: isEquipLoading } =
    useLabExperimentalEquipment(parentCategoryId)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] =
    useState<EquipmentCategory | null>(null)

  const subCategories = categories
    .filter((c) => c.parentId === parentCategoryId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const parentCategory = categories.find((c) => c.id === parentCategoryId)

  const handleDeleteClick = (cat: EquipmentCategory) => {
    setCategoryToDelete(cat)
    setIsDeleteDialogOpen(true)
  }

  const isTopLevelParent = !parentCategory?.parentId

  return (
    <div className='animate-in space-y-6 duration-500 fade-in'>
      {/* 当前分类预览卡片 - 顶级分类不显示图片 */}
      <div
        className={
          isTopLevelParent
            ? 'relative overflow-hidden rounded-[32px] border border-dashed bg-muted/5 p-10'
            : 'grid grid-cols-1 gap-8 rounded-[32px] border border-dashed bg-muted/5 p-8 md:grid-cols-[300px_1fr]'
        }
      >
        {!isTopLevelParent && (
          <div className='group relative flex aspect-video items-center justify-center overflow-hidden rounded-[24px] border border-dashed bg-background shadow-inner md:aspect-square'>
            {parentCategory?.imageUrl ? (
              <img
                src={parentCategory.imageUrl}
                alt={parentCategory.name}
                className='h-full w-full object-cover transition-transform duration-700 group-hover:scale-110'
              />
            ) : (
              <div className='space-y-3 text-center opacity-20'>
                <ImageIcon className='mx-auto size-12' />
                <p className='text-[10px] font-black tracking-widest uppercase italic'>
                  未上传实物配图 / NO_IMAGE
                </p>
              </div>
            )}
            <div className='absolute inset-0 flex items-center justify-center bg-primary/10 opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:opacity-100'>
              <Button
                variant='secondary'
                size='sm'
                className='h-9 rounded-full text-[10px] font-black tracking-widest uppercase'
                onClick={() => onEditCategory(parentCategory!)}
              >
                更换配图
              </Button>
            </div>
          </div>
        )}

        <div className='flex h-full min-h-[160px] flex-col justify-between'>
          <div className='space-y-4'>
            <div className='flex items-center gap-3'>
              <h2
                className={
                  isTopLevelParent
                    ? 'text-3xl font-black tracking-tighter uppercase italic'
                    : 'text-2xl font-black tracking-tighter uppercase italic'
                }
              >
                {parentCategory?.name}
              </h2>
              <Badge
                variant='outline'
                className='rounded-full border-primary/30 bg-primary/10 py-0.5 text-[9px] font-black tracking-widest text-primary uppercase'
              >
                {isTopLevelParent
                  ? '顶级实验领域 / CORE_DOMAIN'
                  : '二级技术类目 / SUB_CATEGORY'}
              </Badge>
            </div>
            <p
              className={
                isTopLevelParent
                  ? 'max-w-4xl text-[11px] leading-relaxed font-medium tracking-wide text-muted-foreground'
                  : 'text-[10px] leading-relaxed font-medium tracking-wide text-muted-foreground'
              }
            >
              {parentCategory?.description ||
                '暂无详细描述。可以通过编辑功能添加分类领域说明、技术规范以及行业标准等信息。NO_DESCRIPTION_PROVIDED_IN_SYSTEM'}
            </p>
          </div>

          <div className='mt-10 flex flex-col gap-4'>
            <div className='flex items-center gap-3'>
              <Button
                variant='outline'
                size='sm'
                className='h-11 rounded-full border-2 border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
                onClick={() => onEditCategory(parentCategory!)}
              >
                <Edit2 className='mr-2 h-3.5 w-3.5' />
                编辑基本资料
              </Button>
              <Button
                variant='default'
                size='sm'
                className='ms-auto h-11 rounded-full bg-primary px-8 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95'
                onClick={() => onAddSubCategory(parentCategoryId)}
              >
                <Plus className='mr-2 h-4 w-4' />
                创建下级类目
              </Button>
            </div>

            <div className='flex justify-end border-t border-dashed pt-4'>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 rounded-full px-4 text-[9px] font-black tracking-widest text-destructive uppercase hover:bg-destructive/5 hover:text-destructive'
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
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'>
        {subCategories.map((cat) => (
          <Card
            key={cat.id}
            className='group relative flex flex-col overflow-hidden rounded-[24px] border-dashed bg-background shadow-sm transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5'
          >
            {cat.imageUrl && (
              <div className='relative flex h-52 w-full items-center justify-center overflow-hidden border-b border-dashed bg-muted/10 p-4 transition-colors group-hover:bg-muted/5'>
                {/* 背景虚化增强 - 适配非 1:1 原图 */}
                <div
                  className='pointer-events-none absolute inset-0 scale-125 opacity-15 blur-2xl'
                  style={{
                    backgroundImage: `url(${cat.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {/* 核心 1:1 正方形容器 */}
                <div className='relative z-10 flex aspect-square h-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-background/40 shadow-2xl backdrop-blur-md'>
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className='h-full w-full object-contain transition-transform duration-700 group-hover:scale-110'
                  />
                </div>
              </div>
            )}
            <CardHeader className='px-6 pt-6 pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Folder className='size-3.5 text-primary/60' />
                  <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                    {cat.name}
                  </CardTitle>
                </div>
                <div className='flex items-center gap-1'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 rounded-full text-destructive opacity-0 group-hover:opacity-100 hover:bg-destructive/10'
                    onClick={() => handleDeleteClick(cat)}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-8 w-8 rounded-full'
                    onClick={() => onEditCategory(cat)}
                  >
                    <ChevronRight className='size-4 text-muted-foreground' />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col px-6 pb-6'>
              <p className='line-clamp-2 flex-1 text-[9px] leading-relaxed font-black tracking-widest text-muted-foreground/60 uppercase'>
                {cat.description || '无下级分类描述 / NO_DESCRIPTION_AVAILABLE'}
              </p>
              <div className='mt-6 flex items-center justify-between border-t border-dashed pt-4'>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                    {categories.filter((c) => c.parentId === cat.id).length}{' '}
                    UNITS
                  </span>
                  <span className='font-mono text-[8px] text-muted-foreground uppercase'>
                    子项资产统计
                  </span>
                </div>
                <Button
                  variant='link'
                  className='h-auto p-0 text-[10px] font-black tracking-widest uppercase italic'
                  onClick={() => {}}
                >
                  VIEW_DETAILS
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <button
          onClick={() => onAddSubCategory(parentCategoryId)}
          className='group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed bg-muted/5 text-muted-foreground/30 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary'
        >
          <div className='flex size-12 items-center justify-center rounded-full border-2 border-dashed transition-transform group-hover:scale-110'>
            <Plus className='size-6' />
          </div>
          <span className='text-[10px] font-black tracking-widest uppercase italic'>
            新建设备子类 / ADD_SUB_CATEGORY
          </span>
        </button>
      </div>

      {/* 具体设备资产列表 (SDRTS Integrated) */}
      <div className='mt-12 space-y-6'>
        <div className='flex items-center justify-between px-2'>
          <div className='flex flex-col gap-1'>
            <h3 className='flex items-center gap-2 text-sm font-black tracking-tighter uppercase italic'>
              <Settings className='animate-spin-slow size-4 text-primary' />
              下属实验资产明细 / ASSET_INVENTORY
            </h3>
            <p className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              当前分类直属的精密仪器与检测设备实时清单
            </p>
          </div>
          <Button
            size='sm'
            onClick={() => onAddEquipment(parentCategoryId)}
            className='h-9 rounded-full bg-primary/10 px-6 text-[9px] font-black tracking-widest text-primary uppercase transition-all hover:bg-primary hover:text-primary-foreground'
          >
            <Plus className='mr-2 size-3.5' />
            注册新设备 / REGISTER_ASSET
          </Button>
        </div>

        {isEquipLoading ? (
          <div className='grid animate-pulse grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className='h-32 rounded-3xl border border-dashed bg-muted/20'
              />
            ))}
          </div>
        ) : equipments.length > 0 ? (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {equipments.map((equip) => (
              <div
                key={equip.id}
                onClick={() => onEditEquipment(equip)}
                className='group relative flex cursor-pointer flex-col gap-4 overflow-hidden rounded-[24px] border border-dashed bg-background p-5 transition-all hover:border-primary/50 hover:bg-primary/5'
              >
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={cn(
                        'size-2 rounded-full',
                        equip.status === 'Active'
                          ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                          : equip.status === 'Maintenance'
                            ? 'animate-pulse bg-amber-500'
                            : 'bg-muted'
                      )}
                    />
                    <span className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                      {equip.status}
                    </span>
                  </div>
                  <Fingerprint className='size-3.5 text-muted-foreground/30 transition-colors group-hover:text-primary/40' />
                </div>

                <div className='space-y-1'>
                  <h4 className='truncate text-[11px] font-black tracking-tight uppercase'>
                    {equip.name}
                  </h4>
                  <p className='truncate font-mono text-[9px] text-muted-foreground opacity-70'>
                    SN: {equip.sn}
                  </p>
                </div>

                <div className='mt-auto flex items-center justify-between border-t border-dashed pt-3'>
                  <span className='text-[8px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
                    {equip.model || 'N/A_MODEL'}
                  </span>
                  {equip.status === 'Maintenance' ? (
                    <AlertTriangle className='size-3 text-amber-500' />
                  ) : (
                    <ShieldCheck className='size-3 text-emerald-500/50' />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex h-32 flex-col items-center justify-center gap-2 rounded-[32px] border border-dashed bg-muted/5'>
            <span className='text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
              此分类下暂无已登记的资产设备 / EMPTY_INVENTORY
            </span>
          </div>
        )}
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
