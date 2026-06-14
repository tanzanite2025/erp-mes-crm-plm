'use client'

import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ImageIcon, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { type Product, type ProductType } from '../../data/schema'
import { normalizeProductModelCodeValue } from '../../utils/product-code-normalization'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'

interface ProductBasicInfoProps {
  form: UseFormReturn<Product>
  dynamicTypes: ProductType[]
  productTypes: ProductType[]
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  bomOptions: { label: string; value: string }[]
  isBomOptionsPending?: boolean
  specOptions: { label: string; value: string }[]
  moldOptions: { label: string; value: string }[]
  isEdit: boolean
  templateLabel?: string
}

function RequiredMark() {
  return <span className='text-[11px] leading-none text-destructive'>*</span>
}

export function ProductBasicInfo({
  form,
  dynamicTypes,
  productTypes,
  handleImageUpload,
  bomOptions,
  isBomOptionsPending,
  specOptions,
  moldOptions,
  isEdit,
  templateLabel,
}: ProductBasicInfoProps) {
  const { locale, t } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const hierarchyMetaMap = useMemo(
    () => buildProductTypeHierarchyMetaMap(productTypes, true),
    [productTypes]
  )
  const baseModelItems = useMemo(
    () =>
      dynamicTypes.map((type: ProductType) => {
        const hierarchy = hierarchyMetaMap.get(type.id)
        const pathLabel = hierarchy?.pathLabel || type.name
        return {
          label: pathLabel,
          value: type.id,
        }
      }),
    [dynamicTypes, hierarchyMetaMap]
  )
  const productStatusOptions = [
    { label: isChineseLocale ? '启用' : 'Active', value: 'Active' },
    { label: isChineseLocale ? '开发' : 'Draft', value: 'Draft' },
    { label: isChineseLocale ? '停用' : 'Archived', value: 'Archived' },
  ]
  return (
    <div className='rounded-[24px] border border-dashed border-muted bg-muted/5 p-2.5 transition-all hover:bg-muted/10'>
      <div className='grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-start sm:gap-4'>
        <FormField
          control={form.control}
          name='image'
          render={({ field }) => (
            <FormItem className='flex shrink-0 flex-col'>
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                {t('engineering.productMgmt.form.thumbnail')}
              </FormLabel>
              <FormControl>
                <div className='group relative flex justify-center sm:block'>
                  <div className='flex size-[88px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-muted/50 bg-background shadow-inner transition-all group-hover:border-blue-400 group-hover:bg-blue-50/50 sm:size-[104px]'>
                    {field.value ? (
                      <>
                        <img
                          src={field.value}
                          alt='Preview'
                          className='size-full object-cover'
                        />
                        <button
                          type='button'
                          onClick={() => field.onChange('')}
                          className='absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-white opacity-100 transition-all hover:scale-110 sm:top-1.5 sm:right-1.5 sm:size-6 sm:opacity-0 sm:group-hover:opacity-100'
                        >
                          <X className='size-3 sm:size-3.5' />
                        </button>
                      </>
                    ) : (
                      <label className='flex size-full cursor-pointer flex-col items-center justify-center'>
                        <ImageIcon className='mb-1 size-7 text-muted-foreground/30 sm:size-8' />
                        <span className='px-2 text-center text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase sm:text-[10px]'>
                          {t('engineering.productMgmt.form.uploadImg')}
                        </span>
                        <input
                          type='file'
                          className='hidden'
                          accept='image/*'
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <div className='flex min-w-0 flex-col gap-2.5 sm:min-h-[104px]'>
          <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-6'>
            <FormField
              control={form.control}
              name='typeId'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 flex items-center gap-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                    <RequiredMark />
                    <span>
                      {t('engineering.categoryArchive.labels.baseModel')}
                    </span>
                  </FormLabel>
                  <SelectDropdown
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      form.setValue('name', '', {
                        shouldDirty: false,
                        shouldValidate: false,
                      })
                      form.setValue('sku', '', {
                        shouldDirty: false,
                        shouldValidate: false,
                      })
                    }}
                    isControlled={true}
                    items={baseModelItems}
                    placeholder={t(
                      'engineering.productMgmt.form.categoryPlaceholder'
                    )}
                    className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold'
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='bomId'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                    {t('engineering.productMgmt.form.bom')}
                  </FormLabel>
                  <SelectDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    isControlled={true}
                    isPending={isBomOptionsPending}
                    items={bomOptions}
                    placeholder={t(
                      'engineering.productMgmt.form.bomPlaceholder'
                    )}
                    className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold'
                  />
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='modelCode'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 flex items-center justify-between pr-1 text-[10px] font-black tracking-widest text-blue-600 uppercase italic'>
                    <span className='flex items-center gap-1'>
                      <RequiredMark />
                      <span>{t('engineering.productMgmt.form.modelCode')}</span>
                    </span>
                    <Badge
                      variant='outline'
                      className='h-3.5 border-blue-200 bg-white px-0.5 text-[8px] text-blue-500'
                    >
                      {t('engineering.productMgmt.form.modelCodeLinked')}
                    </Badge>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={`h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 font-mono text-[13px] font-black ${isEdit ? 'opacity-50' : 'transition-all focus:bg-background focus-visible:ring-blue-400'}`}
                      {...field}
                      value={field.value || '01'}
                      placeholder={t(
                        'engineering.productMgmt.form.modelCodePlaceholder'
                      )}
                      maxLength={2}
                      readOnly={isEdit}
                      onChange={(e) => {
                        field.onChange(
                          normalizeProductModelCodeValue(e.target.value)
                        )
                      }}
                    />
                  </FormControl>
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='engineeringSpecId'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                    {t('engineering.productMgmt.form.spec')}
                  </FormLabel>
                  <SelectDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    isControlled={true}
                    items={specOptions}
                    placeholder={t(
                      'engineering.productMgmt.form.specPlaceholder'
                    )}
                    className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold'
                  />
                  <FormMessage className='text-[10px] font-bold' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='moldGroup'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-blue-800 uppercase italic'>
                    {t('engineering.productMgmt.form.mold')}
                  </FormLabel>
                  <SelectDropdown
                    placeholder={t(
                      'engineering.productMgmt.form.moldPlaceholder'
                    )}
                    items={moldOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    isControlled={true}
                    className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold'
                  />
                  <FormMessage className='text-[8px] font-bold uppercase' />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                    {t('engineering.productMgmt.form.status')}
                  </FormLabel>
                  <SelectDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    isControlled={true}
                    items={productStatusOptions}
                    className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold text-slate-700'
                  />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 gap-2.5'>
            <div className='min-w-0 space-y-0.5'>
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-blue-800 uppercase italic'>
                {t('engineering.productMgmt.form.template')}
              </FormLabel>
              <div className='flex h-[38px] w-full items-center rounded-xl bg-muted/40 px-3 text-[11px] font-bold text-slate-700'>
                <span className='min-w-0 truncate'>
                  {templateLabel ||
                    t('engineering.productMgmt.form.templatePlaceholder')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
