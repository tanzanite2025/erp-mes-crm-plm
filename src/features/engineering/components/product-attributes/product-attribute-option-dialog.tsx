import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type ProductAttributeCategory } from '../../data/schema'
import { type SaveProductAttributeOptionInput } from '../../mutation-types'
import { normalizeProductAttributeMachineValue } from '../../utils/product-attribute-machine-value'

interface ProductAttributeOptionDialogProps {
  locale: string
  open: boolean
  option: SaveProductAttributeOptionInput
  categories: ProductAttributeCategory[]
  getLocalizedCategoryName: (locale: string, category: ProductAttributeCategory) => string
  onOpenChange: (open: boolean) => void
  onOptionChange: (updater: (prev: SaveProductAttributeOptionInput) => SaveProductAttributeOptionInput) => void
  onSave: () => void
}

export function ProductAttributeOptionDialog({
  locale,
  open,
  option,
  categories,
  getLocalizedCategoryName,
  onOpenChange,
  onOptionChange,
  onSave,
}: ProductAttributeOptionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl overflow-hidden rounded-[32px] border border-dashed border-muted/40 bg-background p-0 shadow-2xl'>
        <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-6 text-start'>
          <DialogTitle className='text-xl font-black tracking-tight italic text-slate-800'>
            {option.id ? (locale === 'zh-CN' ? '编辑分类项' : 'Edit option') : (locale === 'zh-CN' ? '新增分类项' : 'Create option')}
          </DialogTitle>
          <DialogDescription className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/40'>
            {locale === 'zh-CN' ? '分类项归属于某个分类 key，并使用中英文名称展示。' : 'Options belong to a category key and are displayed with localized names.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 gap-5 px-8 py-8 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '归属分类' : 'Category'}</Label>
            <Select value={option.categoryKey || ''} onValueChange={(value) => onOptionChange((prev) => ({ ...prev, categoryKey: value }))} disabled={Boolean(option.id)}>
              <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner disabled:cursor-not-allowed disabled:opacity-70'>
                <SelectValue placeholder={locale === 'zh-CN' ? '选择分类' : 'Select category'} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.key}>{getLocalizedCategoryName(locale, category)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '值' : 'Value'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner disabled:cursor-not-allowed disabled:opacity-70' value={option.value || ''} disabled={Boolean(option.id)} onChange={(event) => onOptionChange((prev) => ({ ...prev, value: normalizeProductAttributeMachineValue(event.target.value) }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '中文名称' : 'Chinese label'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={option.labelZh || ''} onChange={(event) => onOptionChange((prev) => ({ ...prev, labelZh: event.target.value }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '英文名称' : 'English label'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={option.labelEn || ''} onChange={(event) => onOptionChange((prev) => ({ ...prev, labelEn: event.target.value }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '排序' : 'Sort order'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' type='number' value={option.sortOrder ?? 0} onChange={(event) => onOptionChange((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))} />
          </div>
          <div className='flex items-end justify-between rounded-[24px] border border-dashed border-muted/30 bg-muted/40 px-4 py-4 shadow-inner'>
            <div>
              <div className='text-sm font-black tracking-tight'>{locale === 'zh-CN' ? '启用状态' : 'Active status'}</div>
              <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
                {locale === 'zh-CN' ? '停用后不再用于产品表单下拉。' : 'Inactive options are hidden from product forms.'}
              </div>
            </div>
            <Switch checked={Boolean(option.active)} onCheckedChange={(checked) => onOptionChange((prev) => ({ ...prev, active: checked }))} />
          </div>
          <div className='space-y-2 sm:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '说明' : 'Description'}</Label>
            <Textarea className='min-h-28 rounded-2xl border-none bg-muted/50 shadow-inner' value={option.description || ''} onChange={(event) => onOptionChange((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
        </div>

        <DialogFooter className='border-t border-dashed border-muted/50 bg-muted/5 px-8 py-5'>
          <Button variant='outline' className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em]' onClick={() => onOpenChange(false)}>{locale === 'zh-CN' ? '取消' : 'Cancel'}</Button>
          <Button className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/10' onClick={onSave}>{locale === 'zh-CN' ? '保存' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
