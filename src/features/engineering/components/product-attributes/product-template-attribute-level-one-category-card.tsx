import { useRef } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Edit,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ProductTemplateAttributeLevelOneCategory } from '../../data/schema'

interface ProductTemplateAttributeLevelOneCategoryCardProps {
  locale: string
  categories: ProductTemplateAttributeLevelOneCategory[]
  selectedCategoryKey: string
  optionCountByCategory: ReadonlyMap<string, number>
  isReordering: boolean
  getLocalizedCategoryName: (
    locale: string,
    category: ProductTemplateAttributeLevelOneCategory
  ) => string
  onSelectCategory: (categoryKey: string) => void
  onCreateCategory: () => void
  onEditCategory: (row: ProductTemplateAttributeLevelOneCategory) => void
  onDeleteCategory: (id: string) => void
  onMoveCategory: (id: string, direction: 'up' | 'down') => void
  onDropCategory: (sourceId: string, targetId: string) => void
}

export function ProductTemplateAttributeLevelOneCategoryCard({
  locale,
  categories,
  selectedCategoryKey,
  optionCountByCategory,
  isReordering,
  getLocalizedCategoryName,
  onSelectCategory,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
  onMoveCategory,
  onDropCategory,
}: ProductTemplateAttributeLevelOneCategoryCardProps) {
  const isZh = locale === 'zh-CN'
  const draggingCategoryIdRef = useRef('')

  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div className='min-w-0 flex-1 basis-64'>
            <div className='text-base font-black tracking-tight text-foreground'>
              {isZh ? '一级属性分类' : 'Level 1 Attribute Categories'}
            </div>
            <div className='mt-1.5 text-[9px] font-black tracking-[0.24em] text-muted-foreground/50 uppercase'>
              {isZh
                ? '点击一级属性分类查看二级属性分类，名称旁显示二级数量；拖拽或点击箭头调整顺序'
                : 'Select a level 1 attribute category to view its level 2 options. Counts appear beside names. Drag or use arrows to reorder.'}
            </div>
          </div>
          <Button
            className='h-11 rounded-full px-6 text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/10'
            onClick={onCreateCategory}
          >
            <Plus className='mr-2 size-4' />
            {isZh ? '新增一级属性分类' : 'Add Level 1 Attribute Category'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='w-10' />
              <TableHead className='h-13 text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '一级属性名称' : 'Level 1 Attribute Name'}
              </TableHead>
              <TableHead className='text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '显示顺序' : 'Order'}
              </TableHead>
              <TableHead className='text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '状态' : 'Active'}
              </TableHead>
              <TableHead className='text-right text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '操作' : 'Actions'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='py-16 text-center text-[10px] font-black tracking-[0.24em] text-muted-foreground/45 uppercase'
                >
                  {isZh
                    ? '暂无一级属性分类'
                    : 'No level 1 attribute categories'}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((row, index) => (
                <TableRow
                  key={row.id}
                  draggable={!isReordering}
                  data-state={
                    selectedCategoryKey === row.key ? 'selected' : undefined
                  }
                  aria-selected={selectedCategoryKey === row.key}
                  className='cursor-pointer transition-colors hover:bg-primary/5 data-[state=selected]:bg-primary/10'
                  onClick={() => onSelectCategory(row.key)}
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
                    const sourceId =
                      event.dataTransfer.getData('text/plain') ||
                      draggingCategoryIdRef.current
                    if (sourceId && sourceId !== row.id) {
                      onDropCategory(sourceId, row.id)
                    }
                  }}
                >
                  <TableCell className='py-4'>
                    <GripVertical
                      className='size-4 cursor-grab text-muted-foreground/35 active:cursor-grabbing'
                      aria-hidden='true'
                    />
                  </TableCell>
                  <TableCell className='py-4 text-[11px] font-black tracking-tight text-foreground'>
                    <button
                      type='button'
                      aria-pressed={selectedCategoryKey === row.key}
                      className='flex w-full cursor-pointer items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:text-primary'
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectCategory(row.key)
                      }}
                    >
                      <span>{getLocalizedCategoryName(locale, row)}</span>
                      <span
                        className='inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tabular-nums'
                        aria-label={`${isZh ? '二级属性分类数量' : 'Level 2 attribute option count'}: ${optionCountByCategory.get(row.key) ?? 0}`}
                        title={
                          isZh
                            ? '二级属性分类数量'
                            : 'Level 2 attribute option count'
                        }
                      >
                        {optionCountByCategory.get(row.key) ?? 0}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>
                    {row.sortOrder}
                  </TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>
                    {row.active
                      ? isZh
                        ? '启用'
                        : 'Active'
                      : isZh
                        ? '停用'
                        : 'Inactive'}
                  </TableCell>
                  <TableCell
                    className='py-4'
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '上移一级属性分类' : 'Move Level 1 Attribute Category Up'} · ${getLocalizedCategoryName(locale, row)}`}
                        disabled={index === 0 || isReordering}
                        onClick={() => onMoveCategory(row.id, 'up')}
                      >
                        <ArrowUp className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '下移一级属性分类' : 'Move Level 1 Attribute Category Down'} · ${getLocalizedCategoryName(locale, row)}`}
                        disabled={
                          index === categories.length - 1 || isReordering
                        }
                        onClick={() => onMoveCategory(row.id, 'down')}
                      >
                        <ArrowDown className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '编辑一级属性分类' : 'Edit Level 1 Attribute Category'} · ${getLocalizedCategoryName(locale, row)}`}
                        onClick={() => onEditCategory(row)}
                      >
                        <Edit className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full text-destructive'
                        aria-label={`${isZh ? '删除一级属性分类' : 'Delete Level 1 Attribute Category'} · ${getLocalizedCategoryName(locale, row)}`}
                        onClick={() => onDeleteCategory(row.id)}
                      >
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
