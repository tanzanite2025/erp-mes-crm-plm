import { useRef } from 'react'
import { ArrowDown, ArrowUp, Edit, GripVertical, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type ProductAttributeCategory } from '../../data/schema'

interface ProductAttributeCategoryCardProps {
  locale: string
  categories: ProductAttributeCategory[]
  isReordering: boolean
  getLocalizedCategoryName: (locale: string, category: ProductAttributeCategory) => string
  onCreateCategory: () => void
  onEditCategory: (row: ProductAttributeCategory) => void
  onDeleteCategory: (id: string) => void
  onMoveCategory: (id: string, direction: 'up' | 'down') => void
  onDropCategory: (sourceId: string, targetId: string) => void
}

export function ProductAttributeCategoryCard({
  locale,
  categories,
  isReordering,
  getLocalizedCategoryName,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onMoveCategory,
  onDropCategory,
}: ProductAttributeCategoryCardProps) {
  const isZh = locale === 'zh-CN'
  const draggingCategoryIdRef = useRef('')

  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div>
            <div className='text-base font-black tracking-tight italic text-foreground'>
              {isZh ? '分类定义' : 'Category Definitions'}
            </div>
            <div className='mt-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/50'>
              {isZh ? '维护分类 key 与中英文名称，拖拽或点击箭头调整显示顺序' : 'Maintain category keys and localized names'}
            </div>
          </div>
          <Button className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10' onClick={onCreateCategory}>
            <Plus className='mr-2 size-4' />
            {isZh ? '新增分类' : 'Add category'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='w-10' />
              <TableHead className='h-13 text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{isZh ? '内部编码' : 'Key'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{isZh ? '名称' : 'Name'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{isZh ? '显示顺序' : 'Order'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{isZh ? '状态' : 'Active'}</TableHead>
              <TableHead className='text-right text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{isZh ? '操作' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='py-16 text-center text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                  {isZh ? '暂无分类定义' : 'No category definitions'}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((row, index) => (
                <TableRow
                  key={row.id}
                  draggable={!isReordering}
                  className='cursor-grab transition-colors hover:bg-background/70 active:cursor-grabbing'
                  onDragStart={(event) => {
                    draggingCategoryIdRef.current = row.id
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', row.id)
                  }}
                  onDragEnd={() => {
                    draggingCategoryIdRef.current = ''
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const sourceId = event.dataTransfer.getData('text/plain') || draggingCategoryIdRef.current
                    if (sourceId && sourceId !== row.id) {
                      onDropCategory(sourceId, row.id)
                    }
                  }}
                >
                  <TableCell className='py-4'>
                    <GripVertical className='size-4 text-muted-foreground/35' aria-hidden='true' />
                  </TableCell>
                  <TableCell className='py-4 font-mono text-[11px] font-black'>{row.key}</TableCell>
                  <TableCell className='py-4 text-[11px] font-black tracking-tight text-foreground'>{getLocalizedCategoryName(locale, row)}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>{row.sortOrder}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>
                    {row.active ? (isZh ? '启用' : 'Active') : (isZh ? '停用' : 'Inactive')}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full' disabled={index === 0 || isReordering} onClick={() => onMoveCategory(row.id, 'up')}>
                        <ArrowUp className='size-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full' disabled={index === categories.length - 1 || isReordering} onClick={() => onMoveCategory(row.id, 'down')}>
                        <ArrowDown className='size-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full' onClick={() => onEditCategory(row)}>
                        <Edit className='size-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full text-destructive' onClick={() => onDeleteCategory(row.id)}>
                        <Trash2 className='size-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
