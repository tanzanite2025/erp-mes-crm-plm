import { Edit, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type ProductAttributeCategory } from '../../data/schema'

interface ProductAttributeCategoryCardProps {
  locale: string
  categories: ProductAttributeCategory[]
  getLocalizedCategoryName: (locale: string, category: ProductAttributeCategory) => string
  onCreateCategory: () => void
  onEditCategory: (row: ProductAttributeCategory) => void
  onDeleteCategory: (id: string) => void
}

export function ProductAttributeCategoryCard({
  locale,
  categories,
  getLocalizedCategoryName,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory,
}: ProductAttributeCategoryCardProps) {
  return (
    <Card className='overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'>
      <CardContent className='p-0'>
        <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/40 bg-background/50 px-5 py-5 sm:px-7'>
          <div>
            <div className='text-base font-black tracking-tight italic text-foreground'>
              {locale === 'zh-CN' ? '分类定义' : 'Category Definitions'}
            </div>
            <div className='mt-1.5 text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground/50'>
              {locale === 'zh-CN' ? '维护分类 key 与中英文名称' : 'Maintain category keys and localized names'}
            </div>
          </div>
          <Button className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10' onClick={onCreateCategory}>
            <Plus className='mr-2 size-4' />
            {locale === 'zh-CN' ? '新增分类' : 'Add category'}
          </Button>
        </div>

        <Table>
          <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='h-13 text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '内部编码' : 'Key'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '名称' : 'Name'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '排序' : 'Sort'}</TableHead>
              <TableHead className='text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '启用' : 'Active'}</TableHead>
              <TableHead className='text-right text-[9px] font-black uppercase tracking-[0.24em] text-primary/40'>{locale === 'zh-CN' ? '操作' : 'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='py-16 text-center text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/45'>
                  {locale === 'zh-CN' ? '暂无分类定义' : 'No category definitions'}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((row) => (
                <TableRow key={row.id} className='transition-colors hover:bg-background/70'>
                  <TableCell className='py-4 font-mono text-[11px] font-black'>{row.key}</TableCell>
                  <TableCell className='py-4 text-[11px] font-black tracking-tight text-foreground'>{getLocalizedCategoryName(locale, row)}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>{row.sortOrder}</TableCell>
                  <TableCell className='py-4 text-[11px] font-bold text-muted-foreground'>
                    {row.active ? (locale === 'zh-CN' ? '启用' : 'Active') : (locale === 'zh-CN' ? '停用' : 'Inactive')}
                  </TableCell>
                  <TableCell className='py-4'>
                    <div className='flex items-center justify-end gap-2'>
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
