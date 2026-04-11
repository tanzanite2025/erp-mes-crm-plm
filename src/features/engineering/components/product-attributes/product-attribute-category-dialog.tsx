import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type SaveProductAttributeCategoryInput } from '../../mutation-types'
import { normalizeProductAttributeMachineValue } from '../../utils/product-attribute-machine-value'

interface ProductAttributeCategoryDialogProps {
  locale: string
  open: boolean
  category: SaveProductAttributeCategoryInput
  onOpenChange: (open: boolean) => void
  onCategoryChange: (updater: (prev: SaveProductAttributeCategoryInput) => SaveProductAttributeCategoryInput) => void
  onSave: () => void
}

export function ProductAttributeCategoryDialog({
  locale,
  open,
  category,
  onOpenChange,
  onCategoryChange,
  onSave,
}: ProductAttributeCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl overflow-hidden rounded-[32px] border border-dashed border-muted/40 bg-background p-0 shadow-2xl'>
        <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-6 text-start'>
          <DialogTitle className='text-xl font-black tracking-tight italic text-slate-800'>
            {category.id ? (locale === 'zh-CN' ? '编辑分类定义' : 'Edit category') : (locale === 'zh-CN' ? '新增分类定义' : 'Create category')}
          </DialogTitle>
          <DialogDescription className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/40'>
            {locale === 'zh-CN' ? '分类 key 作为内部承载锚点，中英文名称用于界面展示。' : 'The category key is the internal anchor, while localized names are shown in the UI.'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 gap-5 px-8 py-8 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '分类编码' : 'Category key'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner disabled:cursor-not-allowed disabled:opacity-70' value={category.key || ''} disabled={Boolean(category.id)} onChange={(event) => onCategoryChange((prev) => ({ ...prev, key: normalizeProductAttributeMachineValue(event.target.value) }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '中文名称' : 'Chinese name'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={category.nameZh || ''} onChange={(event) => onCategoryChange((prev) => ({ ...prev, nameZh: event.target.value }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '英文名称' : 'English name'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={category.nameEn || ''} onChange={(event) => onCategoryChange((prev) => ({ ...prev, nameEn: event.target.value }))} />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '排序' : 'Sort order'}</Label>
            <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' type='number' value={category.sortOrder ?? 0} onChange={(event) => onCategoryChange((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))} />
          </div>
          <div className='flex items-end justify-between rounded-[24px] border border-dashed border-muted/30 bg-muted/40 px-4 py-4 shadow-inner'>
            <div>
              <div className='text-sm font-black tracking-tight'>{locale === 'zh-CN' ? '启用状态' : 'Active status'}</div>
              <div className='mt-1 text-[11px] leading-relaxed text-muted-foreground'>
                {locale === 'zh-CN' ? '停用后分类仍保留，但不建议继续投放。' : 'Inactive categories are retained but should not be used further.'}
              </div>
            </div>
            <Switch checked={Boolean(category.active)} onCheckedChange={(checked) => onCategoryChange((prev) => ({ ...prev, active: checked }))} />
          </div>
          <div className='space-y-2 sm:col-span-2'>
            <Label className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>{locale === 'zh-CN' ? '说明' : 'Description'}</Label>
            <Textarea className='min-h-28 rounded-2xl border-none bg-muted/50 shadow-inner' value={category.description || ''} onChange={(event) => onCategoryChange((prev) => ({ ...prev, description: event.target.value }))} />
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
