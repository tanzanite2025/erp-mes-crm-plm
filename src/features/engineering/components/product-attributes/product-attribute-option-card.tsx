import { Edit, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type ProductAttributeCategory, type ProductAttributeOption } from '../../data/schema'

interface ProductAttributeOptionCardProps {
  locale: string
  selectedCategory: ProductAttributeCategory | null
  selectedCategoryKey: string
  options: ProductAttributeOption[]
  getLocalizedCategoryName: (locale: string, category: ProductAttributeCategory) => string
  getLocalizedOptionLabel: (locale: string, option: ProductAttributeOption) => string
  onCreateOption: () => void
  onEditOption: (row: ProductAttributeOption) => void
  onDeleteOption: (id: string) => void
}

export function ProductAttributeOptionCard({
  locale,
  selectedCategory,
  selectedCategoryKey,
  options,
  getLocalizedCategoryName,
  getLocalizedOptionLabel,
  onCreateOption,
  onEditOption,
  onDeleteOption,
}: ProductAttributeOptionCardProps) {
  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div>
            <div className='text-base font-black tracking-tight italic text-foreground'>
              {locale === 'zh-CN' ? '分类项定义' : 'Category Options'}
            </div>
            <div className='mt-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/50'>
              {selectedCategory
                ? `${locale === 'zh-CN' ? '当前分类' : 'Current category'} · ${getLocalizedCategoryName(locale, selectedCategory)}`
                : locale === 'zh-CN'
                  ? '请选择分类后维护分类项'
                  : 'Select a category to manage options'}
            </div>
          </div>
          <Button
            className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none'
            onClick={onCreateOption}
            disabled={!selectedCategoryKey}
          >
            <Plus className='mr-2 size-4' />
            {locale === 'zh-CN' ? '新增分类项' : 'Add option'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='h-13 text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '值' : 'Value'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '名称' : 'Name'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '排序' : 'Sort'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '启用' : 'Active'}</TableHead>
              <TableHead className='text-right text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '操作' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='py-16 text-center text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                  {locale === 'zh-CN' ? '当前分类下暂无分类项' : 'No options in this category'}
                </TableCell>
              </TableRow>
            ) : (
              options.map((row) => (
                <TableRow key={row.id} className='transition-colors hover:bg-background/70'>
                  <TableCell className='py-4 font-mono text-[11px] font-black'>{row.value}</TableCell>
                  <TableCell className='py-4 text-[11px] font-black tracking-tight text-foreground'>{getLocalizedOptionLabel(locale, row)}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>{row.sortOrder}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>
                    {row.active ? (locale === 'zh-CN' ? '启用' : 'Active') : (locale === 'zh-CN' ? '停用' : 'Inactive')}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full' onClick={() => onEditOption(row)}>
                        <Edit className='size-4' />
                      </Button>
                      <Button variant='ghost' size='icon' className='size-9 rounded-full text-destructive' onClick={() => onDeleteOption(row.id)}>
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
