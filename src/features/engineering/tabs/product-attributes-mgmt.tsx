'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Plus, Settings2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { type ProductAttributeCategory, type ProductAttributeOption } from '../data/schema'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'

const EMPTY_CATEGORY_FORM: Partial<ProductAttributeCategory> = {
  key: '',
  nameZh: '',
  nameEn: '',
  description: '',
  sortOrder: 0,
  active: true,
}

const EMPTY_OPTION_FORM: Partial<ProductAttributeOption> = {
  categoryKey: '',
  value: '',
  labelZh: '',
  labelEn: '',
  description: '',
  sortOrder: 0,
  active: true,
}

function getLocalizedCategoryName(locale: string, category: Partial<ProductAttributeCategory>): string {
  if (locale === 'en-US') {
    return category.nameEn?.trim() || category.nameZh || category.key || ''
  }
  return category.nameZh || category.nameEn || category.key || ''
}

function getLocalizedOptionLabel(locale: string, option: Partial<ProductAttributeOption>): string {
  if (locale === 'en-US') {
    return option.labelEn?.trim() || option.labelZh || option.value || ''
  }
  return option.labelZh || option.labelEn || option.value || ''
}

export function ProductAttributesMgmt() {
  const { locale } = useLanguage()
  const [categories, setCategories] = useState<ProductAttributeCategory[]>([])
  const [options, setOptions] = useState<ProductAttributeOption[]>([])
  const [error, setError] = useState<unknown>(null)
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [optionDialogOpen, setOptionDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<Partial<ProductAttributeCategory>>(EMPTY_CATEGORY_FORM)
  const [currentOption, setCurrentOption] = useState<Partial<ProductAttributeOption>>(EMPTY_OPTION_FORM)

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [nextCategories, nextOptions] = await Promise.all([
        ProductAttributeCategoryService.getProductAttributeCategories(),
        ProductAttributeOptionService.getProductAttributeOptions(),
      ])
      setCategories(nextCategories || [])
      setOptions(nextOptions || [])
      setSelectedCategoryKey((prev) => prev || nextCategories?.[0]?.key || '')
    } catch (loadError) {
      setError(loadError)
    }
  }, [])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadData()
    }, 0)
    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [loadData])

  const selectedCategory = useMemo(
    () => categories.find((item) => item.key === selectedCategoryKey) || null,
    [categories, selectedCategoryKey]
  )

  const filteredOptions = useMemo(() => {
    if (!selectedCategoryKey) return []
    return options.filter((item) => item.categoryKey === selectedCategoryKey)
  }, [options, selectedCategoryKey])

  const groupedCounts = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: options.filter((item) => item.categoryKey === category.key).length,
    }))
  }, [categories, options])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const openCreateCategory = () => {
    setCurrentCategory(EMPTY_CATEGORY_FORM)
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (row: ProductAttributeCategory) => {
    setCurrentCategory(row)
    setCategoryDialogOpen(true)
  }

  const openCreateOption = () => {
    if (!selectedCategoryKey) {
      toast.error(locale === 'zh-CN' ? '请先创建并选择分类' : 'Please create and select a category first')
      return
    }
    setCurrentOption({ ...EMPTY_OPTION_FORM, categoryKey: selectedCategoryKey })
    setOptionDialogOpen(true)
  }

  const openEditOption = (row: ProductAttributeOption) => {
    setCurrentOption(row)
    setOptionDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!currentCategory.key || !currentCategory.nameZh) {
      toast.error(locale === 'zh-CN' ? '分类编码和中文名称为必填项' : 'Category key and Chinese name are required')
      return
    }

    try {
      await ProductAttributeCategoryService.saveProductAttributeCategory(currentCategory)
      toast.success(locale === 'zh-CN' ? '产品属性分类已保存' : 'Product attribute category saved')
      setCategoryDialogOpen(false)
      await loadData()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : locale === 'zh-CN' ? '保存失败' : 'Save failed')
    }
  }

  const handleSaveOption = async () => {
    if (!currentOption.categoryKey || !currentOption.value || !currentOption.labelZh) {
      toast.error(locale === 'zh-CN' ? '分类、值和中文名称为必填项' : 'Category, value and Chinese label are required')
      return
    }

    try {
      await ProductAttributeOptionService.saveProductAttributeOption(currentOption)
      toast.success(locale === 'zh-CN' ? '产品属性项已保存' : 'Product attribute option saved')
      setOptionDialogOpen(false)
      await loadData()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : locale === 'zh-CN' ? '保存失败' : 'Save failed')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(locale === 'zh-CN' ? '确认删除该分类及其分类项吗？' : 'Delete this category and its options?')) {
      return
    }

    try {
      await ProductAttributeCategoryService.deleteProductAttributeCategory(id)
      toast.success(locale === 'zh-CN' ? '产品属性分类已删除' : 'Product attribute category deleted')
      await loadData()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : locale === 'zh-CN' ? '删除失败' : 'Delete failed')
    }
  }

  const handleDeleteOption = async (id: string) => {
    if (!window.confirm(locale === 'zh-CN' ? '确认删除该产品属性项吗？' : 'Delete this product attribute option?')) {
      return
    }

    try {
      await ProductAttributeOptionService.deleteProductAttributeOption(id)
      toast.success(locale === 'zh-CN' ? '产品属性项已删除' : 'Product attribute option deleted')
      await loadData()
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : locale === 'zh-CN' ? '删除失败' : 'Delete failed')
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Settings2 className='size-4 text-primary' />
          <h3 className='text-sm font-black uppercase tracking-tighter italic md:text-lg'>
            {locale === 'zh-CN' ? '产品属性配置' : 'Product Attributes'}
          </h3>
        </div>
        <p className='mt-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 md:text-[9px]'>
          {locale === 'zh-CN'
            ? '维护产品属性分类与分类项，界面展示使用你配置的中英文名称。'
            : 'Manage product attribute categories and options with localized display names.'}
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {groupedCounts.map((category) => (
          <button
            key={category.id}
            type='button'
            onClick={() => setSelectedCategoryKey(category.key)}
            className={`rounded-[24px] border border-dashed p-5 text-left transition-all ${selectedCategoryKey === category.key ? 'border-primary/40 bg-background shadow-sm' : 'border-muted/50 bg-muted/5 hover:border-primary/30 hover:bg-background/80'}`}
          >
            <div className='text-[10px] font-black uppercase tracking-widest text-primary/50'>{category.key}</div>
            <div className='mt-2 text-3xl font-black tracking-tighter text-foreground'>{category.count}</div>
            <div className='mt-2 text-sm font-bold text-foreground'>{getLocalizedCategoryName(locale, category)}</div>
            <div className='mt-2 min-h-8 text-xs text-muted-foreground'>{category.description}</div>
          </button>
        ))}
      </div>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.6fr]'>
        <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <CardContent className='p-0'>
            <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/30 px-4 py-4 sm:px-6'>
              <div>
                <div className='text-sm font-black tracking-tighter italic text-foreground'>{locale === 'zh-CN' ? '分类定义' : 'Category Definitions'}</div>
                <div className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>{locale === 'zh-CN' ? '维护分类 key 与中英文名称' : 'Maintain category keys and localized names'}</div>
              </div>
              <Button className='h-10 rounded-full px-5 text-[10px] font-black uppercase tracking-widest' onClick={openCreateCategory}>
                <Plus className='mr-2 size-4' />
                {locale === 'zh-CN' ? '新增分类' : 'Add category'}
              </Button>
            </div>

            <Table>
              <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
                <TableRow className='border-none hover:bg-transparent'>
                  <TableHead className='h-12 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '内部编码' : 'Key'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '名称' : 'Name'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '排序' : 'Sort'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '启用' : 'Active'}</TableHead>
                  <TableHead className='text-right text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '操作' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {locale === 'zh-CN' ? '暂无分类定义' : 'No category definitions'}
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((row) => (
                    <TableRow key={row.id} className='transition-colors hover:bg-slate-50/30'>
                      <TableCell className='font-mono text-[11px] font-bold'>{row.key}</TableCell>
                      <TableCell className='font-medium text-foreground'>{getLocalizedCategoryName(locale, row)}</TableCell>
                      <TableCell>{row.sortOrder}</TableCell>
                      <TableCell>{row.active ? (locale === 'zh-CN' ? '启用' : 'Active') : (locale === 'zh-CN' ? '停用' : 'Inactive')}</TableCell>
                      <TableCell>
                        <div className='flex items-center justify-end gap-2'>
                          <Button variant='ghost' size='icon' onClick={() => openEditCategory(row)}>
                            <Edit className='size-4' />
                          </Button>
                          <Button variant='ghost' size='icon' className='text-destructive' onClick={() => handleDeleteCategory(row.id)}>
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

        <Card className='overflow-hidden rounded-[24px] border-dashed border-muted/50 bg-muted/5 shadow-inner'>
          <CardContent className='p-0'>
            <div className='flex items-center justify-between gap-4 border-b border-dashed border-muted/30 px-4 py-4 sm:px-6'>
              <div>
                <div className='text-sm font-black tracking-tighter italic text-foreground'>{locale === 'zh-CN' ? '分类项定义' : 'Category Options'}</div>
                <div className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                  {selectedCategory
                    ? `${locale === 'zh-CN' ? '当前分类' : 'Current category'} · ${getLocalizedCategoryName(locale, selectedCategory)}`
                    : locale === 'zh-CN'
                      ? '请选择分类后维护分类项'
                      : 'Select a category to manage options'}
                </div>
              </div>
              <Button className='h-10 rounded-full px-5 text-[10px] font-black uppercase tracking-widest disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none' onClick={openCreateOption} disabled={!selectedCategoryKey}>
                <Plus className='mr-2 size-4' />
                {locale === 'zh-CN' ? '新增分类项' : 'Add option'}
              </Button>
            </div>

            <Table>
              <TableHeader className='border-b border-dashed border-muted/30 bg-muted/10'>
                <TableRow className='border-none hover:bg-transparent'>
                  <TableHead className='h-12 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '值' : 'Value'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '名称' : 'Name'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '排序' : 'Sort'}</TableHead>
                  <TableHead className='text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '启用' : 'Active'}</TableHead>
                  <TableHead className='text-right text-[10px] font-black uppercase tracking-[0.2em] text-primary/40'>{locale === 'zh-CN' ? '操作' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className='py-12 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {locale === 'zh-CN' ? '当前分类下暂无分类项' : 'No options in this category'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOptions.map((row) => (
                    <TableRow key={row.id} className='transition-colors hover:bg-slate-50/30'>
                      <TableCell className='font-mono text-[11px] font-bold'>{row.value}</TableCell>
                      <TableCell className='font-medium text-foreground'>{getLocalizedOptionLabel(locale, row)}</TableCell>
                      <TableCell>{row.sortOrder}</TableCell>
                      <TableCell>{row.active ? (locale === 'zh-CN' ? '启用' : 'Active') : (locale === 'zh-CN' ? '停用' : 'Inactive')}</TableCell>
                      <TableCell>
                        <div className='flex items-center justify-end gap-2'>
                          <Button variant='ghost' size='icon' onClick={() => openEditOption(row)}>
                            <Edit className='size-4' />
                          </Button>
                          <Button variant='ghost' size='icon' className='text-destructive' onClick={() => handleDeleteOption(row.id)}>
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
      </div>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className='max-w-3xl rounded-[32px] border-none p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-4 text-start'>
            <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800'>{currentCategory.id ? (locale === 'zh-CN' ? '编辑分类定义' : 'Edit category') : (locale === 'zh-CN' ? '新增分类定义' : 'Create category')}</DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {locale === 'zh-CN' ? '分类 key 作为内部承载锚点，中英文名称用于界面展示。' : 'The category key is the internal anchor, while localized names are shown in the UI.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '分类编码' : 'Category key'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' value={currentCategory.key || ''} onChange={(event) => setCurrentCategory((prev) => ({ ...prev, key: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '中文名称' : 'Chinese name'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={currentCategory.nameZh || ''} onChange={(event) => setCurrentCategory((prev) => ({ ...prev, nameZh: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '英文名称' : 'English name'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={currentCategory.nameEn || ''} onChange={(event) => setCurrentCategory((prev) => ({ ...prev, nameEn: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '排序' : 'Sort order'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' type='number' value={currentCategory.sortOrder ?? 0} onChange={(event) => setCurrentCategory((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))} />
            </div>
            <div className='flex items-end justify-between rounded-2xl border-none bg-muted/50 px-4 py-3 shadow-inner'>
              <div>
                <div className='text-sm font-semibold'>{locale === 'zh-CN' ? '启用状态' : 'Active status'}</div>
                <div className='text-xs text-muted-foreground'>{locale === 'zh-CN' ? '停用后分类仍保留，但不建议继续投放。' : 'Inactive categories are retained but should not be used further.'}</div>
              </div>
              <Switch checked={Boolean(currentCategory.active)} onCheckedChange={(checked) => setCurrentCategory((prev) => ({ ...prev, active: checked }))} />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '说明' : 'Description'}</Label>
              <Textarea className='min-h-28 rounded-2xl border-none bg-muted/50 shadow-inner' value={currentCategory.description || ''} onChange={(event) => setCurrentCategory((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </div>

          <DialogFooter className='border-t border-dashed border-muted/50 bg-muted/5 px-8 py-4'>
            <Button variant='outline' className='rounded-full px-6' onClick={() => setCategoryDialogOpen(false)}>{locale === 'zh-CN' ? '取消' : 'Cancel'}</Button>
            <Button className='rounded-full px-6' onClick={() => void handleSaveCategory()}>{locale === 'zh-CN' ? '保存' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent className='max-w-3xl rounded-[32px] border-none p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-muted/50 bg-muted/5 px-8 py-4 text-start'>
            <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800'>{currentOption.id ? (locale === 'zh-CN' ? '编辑分类项' : 'Edit option') : (locale === 'zh-CN' ? '新增分类项' : 'Create option')}</DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
              {locale === 'zh-CN' ? '分类项归属于某个分类 key，并使用中英文名称展示。' : 'Options belong to a category key and are displayed with localized names.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-4 px-8 py-6 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '归属分类' : 'Category'}</Label>
              <Select value={currentOption.categoryKey || ''} onValueChange={(value) => setCurrentOption((prev) => ({ ...prev, categoryKey: value }))}>
                <SelectTrigger className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner'>
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
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '值' : 'Value'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' value={currentOption.value || ''} onChange={(event) => setCurrentOption((prev) => ({ ...prev, value: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '中文名称' : 'Chinese label'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={currentOption.labelZh || ''} onChange={(event) => setCurrentOption((prev) => ({ ...prev, labelZh: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '英文名称' : 'English label'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-bold shadow-inner' value={currentOption.labelEn || ''} onChange={(event) => setCurrentOption((prev) => ({ ...prev, labelEn: event.target.value }))} />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '排序' : 'Sort order'}</Label>
              <Input className='h-11 rounded-2xl border-none bg-muted/50 font-mono font-bold shadow-inner' type='number' value={currentOption.sortOrder ?? 0} onChange={(event) => setCurrentOption((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))} />
            </div>
            <div className='flex items-end justify-between rounded-2xl border-none bg-muted/50 px-4 py-3 shadow-inner'>
              <div>
                <div className='text-sm font-semibold'>{locale === 'zh-CN' ? '启用状态' : 'Active status'}</div>
                <div className='text-xs text-muted-foreground'>{locale === 'zh-CN' ? '停用后不再用于产品表单下拉。' : 'Inactive options are hidden from product forms.'}</div>
              </div>
              <Switch checked={Boolean(currentOption.active)} onCheckedChange={(checked) => setCurrentOption((prev) => ({ ...prev, active: checked }))} />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{locale === 'zh-CN' ? '说明' : 'Description'}</Label>
              <Textarea className='min-h-28 rounded-2xl border-none bg-muted/50 shadow-inner' value={currentOption.description || ''} onChange={(event) => setCurrentOption((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
          </div>

          <DialogFooter className='border-t border-dashed border-muted/50 bg-muted/5 px-8 py-4'>
            <Button variant='outline' className='rounded-full px-6' onClick={() => setOptionDialogOpen(false)}>{locale === 'zh-CN' ? '取消' : 'Cancel'}</Button>
            <Button className='rounded-full px-6' onClick={() => void handleSaveOption()}>{locale === 'zh-CN' ? '保存' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
