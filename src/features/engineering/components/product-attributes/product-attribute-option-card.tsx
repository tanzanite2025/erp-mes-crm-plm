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
  type ProductAttributeCategory,
  type ProductAttributeOption,
} from '../../data/schema'

interface ProductAttributeOptionCardProps {
  locale: string
  selectedCategory: ProductAttributeCategory | null
  selectedCategoryKey: string
  options: ProductAttributeOption[]
  isReordering: boolean
  getLocalizedCategoryName: (
    locale: string,
    category: ProductAttributeCategory
  ) => string
  getLocalizedOptionLabel: (
    locale: string,
    option: ProductAttributeOption
  ) => string
  onCreateOption: () => void
  onEditOption: (row: ProductAttributeOption) => void
  onDeleteOption: (id: string) => void
  onMoveOption: (id: string, direction: 'up' | 'down') => void
  onDropOption: (sourceId: string, targetId: string) => void
}

export function ProductAttributeOptionCard({
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
}: ProductAttributeOptionCardProps) {
  const isZh = locale === 'zh-CN'
  const draggingOptionIdRef = useRef('')

  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div>
            <div className='text-base font-black tracking-tight text-foreground italic'>
              {isZh ? '分类项定义' : 'Category Options'}
            </div>
            <div className='mt-1.5 text-[9px] font-black tracking-[0.24em] text-muted-foreground/50 uppercase'>
              {selectedCategory
                ? `${isZh ? '当前分类' : 'Current category'} · ${getLocalizedCategoryName(locale, selectedCategory)}`
                : isZh
                  ? '请选择分类后维护分类项'
                  : 'Select a category to manage options'}
            </div>
          </div>
          <Button
            className='h-11 rounded-full px-6 text-[10px] font-black tracking-[0.2em] uppercase shadow-lg shadow-primary/10 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none'
            onClick={onCreateOption}
            disabled={!selectedCategoryKey}
          >
            <Plus className='mr-2 size-4' />
            {isZh ? '新增分类项' : 'Add option'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='w-10' />
              <TableHead className='h-13 text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '值' : 'Value'}
              </TableHead>
              <TableHead className='text-[9px] font-black tracking-[0.24em] text-primary/40 uppercase'>
                {isZh ? '名称' : 'Name'}
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
                  colSpan={6}
                  className='py-16 text-center text-[10px] font-black tracking-[0.24em] text-muted-foreground/45 uppercase'
                >
                  {isZh
                    ? '当前分类下暂无分类项'
                    : 'No options in this category'}
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
                  <TableCell className='py-4 font-mono text-[11px] font-black'>
                    {row.value}
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
                        disabled={index === 0 || isReordering}
                        onClick={() => onMoveOption(row.id, 'up')}
                      >
                        <ArrowUp className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        disabled={index === options.length - 1 || isReordering}
                        onClick={() => onMoveOption(row.id, 'down')}
                      >
                        <ArrowDown className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full'
                        onClick={() => onEditOption(row)}
                      >
                        <Edit className='size-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-full text-destructive'
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
