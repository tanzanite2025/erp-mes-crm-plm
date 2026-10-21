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
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../../data/schema'

interface ProductTemplateAttributeLevelTwoOptionCardProps {
  locale: string
  selectedCategory: ProductTemplateAttributeLevelOneCategory | null
  selectedCategoryKey: string
  options: ProductTemplateAttributeLevelTwoOption[]
  isReordering: boolean
  getLocalizedCategoryName: (
    locale: string,
    category: ProductTemplateAttributeLevelOneCategory
  ) => string
  getLocalizedOptionLabel: (
    locale: string,
    option: ProductTemplateAttributeLevelTwoOption
  ) => string
  onCreateOption: () => void
  onEditOption: (row: ProductTemplateAttributeLevelTwoOption) => void
  onDeleteOption: (id: string) => void
  onMoveOption: (id: string, direction: 'up' | 'down') => void
  onDropOption: (sourceId: string, targetId: string) => void
}

export function ProductTemplateAttributeLevelTwoOptionCard({
  locale,
  selectedCategory,
  selectedCategoryKey,
  options,
  isReordering,
  getLocalizedCategoryName,
  getLocalizedOptionLabel,
  onCreateOption,
  onEditOption,
  onDeleteOption,
  onMoveOption,
  onDropOption,
}: ProductTemplateAttributeLevelTwoOptionCardProps) {
  const isZh = locale === 'zh-CN'
  const draggingOptionIdRef = useRef('')

  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex flex-wrap items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div className='min-w-0 flex-1 basis-64'>
            <div className='text-base font-black tracking-tight text-foreground'>
              {isZh
                ? '二级属性分类（属性选项）'
                : 'Level 2 Attribute Categories (Options)'}
            </div>
            <div className='mt-1.5 text-[9px] font-black tracking-[0.24em] text-muted-foreground/50 uppercase'>
              {selectedCategory
                ? `${isZh ? '所属一级属性分类' : 'Parent Level 1 Attribute Category'} · ${getLocalizedCategoryName(locale, selectedCategory)}`
                : isZh
                  ? '请先选择一级属性分类，再维护二级属性分类'
                  : 'Select a level 1 attribute category to manage its level 2 options'}
            </div>
          </div>
          <Button
            className='h-11 rounded-full px-6 text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/10 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none'
            onClick={onCreateOption}
            disabled={!selectedCategoryKey}
          >
            <Plus className='mr-2 size-4' />
            {isZh ? '新增二级属性分类' : 'Add Level 2 Attribute Category'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='w-10' />
              <TableHead className='h-13 text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '二级属性名称' : 'Level 2 Attribute Name'}
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
            {options.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className='py-16 text-center text-[10px] font-black tracking-[0.24em] text-muted-foreground/45 uppercase'
                >
                  {isZh
                    ? '该一级属性分类下暂无二级属性分类'
                    : 'No level 2 attribute options in this level 1 category'}
                </TableCell>
              </TableRow>
            ) : (
              options.map((row, index) => (
                <TableRow
                  key={row.id}
                  draggable={!isReordering}
                  className='cursor-grab transition-colors hover:bg-background/70 active:cursor-grabbing'
                  onDragStart={(event) => {
                    draggingOptionIdRef.current = row.id
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', row.id)
                  }}
                  onDragEnd={() => {
                    draggingOptionIdRef.current = ''
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    const sourceId =
                      event.dataTransfer.getData('text/plain') ||
                      draggingOptionIdRef.current
                    if (sourceId && sourceId !== row.id) {
                      onDropOption(sourceId, row.id)
                    }
                  }}
                >
                  <TableCell className='py-4'>
                    <GripVertical
                      className='size-4 text-muted-foreground/35'
                      aria-hidden='true'
                    />
                  </TableCell>
                  <TableCell className='py-4 text-[11px] font-black tracking-tight text-foreground'>
                    {getLocalizedOptionLabel(locale, row)}
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
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '上移二级属性分类' : 'Move Level 2 Attribute Option Up'} · ${getLocalizedOptionLabel(locale, row)}`}
                        disabled={index === 0 || isReordering}
                        onClick={() => onMoveOption(row.id, 'up')}
                      >
                        <ArrowUp className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '下移二级属性分类' : 'Move Level 2 Attribute Option Down'} · ${getLocalizedOptionLabel(locale, row)}`}
                        disabled={index === options.length - 1 || isReordering}
                        onClick={() => onMoveOption(row.id, 'down')}
                      >
                        <ArrowDown className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        aria-label={`${isZh ? '编辑二级属性分类' : 'Edit Level 2 Attribute Category'} · ${getLocalizedOptionLabel(locale, row)}`}
                        onClick={() => onEditOption(row)}
                      >
                        <Edit className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full text-destructive'
                        aria-label={`${isZh ? '删除二级属性分类' : 'Delete Level 2 Attribute Category'} · ${getLocalizedOptionLabel(locale, row)}`}
                        onClick={() => onDeleteOption(row.id)}
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
