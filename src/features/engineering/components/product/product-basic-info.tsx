'use client'

import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { ProductEngineeringTechnicalSpecificationSelectionField } from './product-engineering-technical-specification-selection-field'
import { productFormTypographyClassNames } from './product-form-typography.styles'
import { ProductMoldMasterLibraryGroupSelectionField } from './product-mold-master-library-group-selection-field'

interface ProductBasicInfoProps {
  form: UseFormReturn<Product>
  dynamicTypes: ProductType[]
  productTypes: ProductType[]
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  specOptions: { label: string; value: string }[]
  moldOptions: { label: string; value: string; active?: boolean }[]
  isEdit: boolean
  templateLabel?: string
}

function RequiredMark() {
  return (
    <span
      className={cn('text-destructive', productFormTypographyClassNames.helper)}
    >
      *
    </span>
  )
}

export function ProductBasicInfo({
  form,
  dynamicTypes,
  productTypes,
  handleImageUpload,
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
              <FormLabel
                className={cn(
                  'ml-1 text-foreground',
                  productFormTypographyClassNames.fieldLabel
                )}
              >
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
                        <span
                          className={cn(
                            'px-2 text-center text-muted-foreground',
                            productFormTypographyClassNames.helper
                          )}
                        >
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
                  <FormLabel
                    className={cn(
                      'ml-1 flex items-center gap-1 text-foreground',
                      productFormTypographyClassNames.fieldLabel
                    )}
                  >
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
                    className={cn(
                      'h-[38px] w-full rounded-xl border-none bg-muted/40 px-3',
                      productFormTypographyClassNames.control
                    )}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='modelCode'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel
                    className={cn(
                      'ml-1 flex flex-wrap items-center justify-between gap-x-1 pr-1 text-blue-600 dark:text-blue-400',
                      productFormTypographyClassNames.fieldLabel
                    )}
                  >
                    <span className='flex items-center gap-1'>
                      <RequiredMark />
                      <span>{t('engineering.productMgmt.form.modelCode')}</span>
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        'min-h-5 border-blue-200 bg-background px-0.5 text-blue-600 dark:border-blue-800 dark:text-blue-400',
                        productFormTypographyClassNames.badge
                      )}
                    >
                      {t('engineering.productMgmt.form.modelCodeLinked')}
                    </Badge>
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={cn(
                        'h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 font-maple-ui',
                        productFormTypographyClassNames.control,
                        isEdit
                          ? 'opacity-50'
                          : 'transition-all focus:bg-background focus-visible:ring-blue-400'
                      )}
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
                  <FormMessage
                    className={productFormTypographyClassNames.helper}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='engineeringSpecId'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel
                    className={cn(
                      'ml-1 text-foreground',
                      productFormTypographyClassNames.fieldLabel
                    )}
                  >
                    {t('engineering.productMgmt.form.spec')}
                  </FormLabel>
                  <ProductEngineeringTechnicalSpecificationSelectionField
                    value={field.value}
                    onValueChange={field.onChange}
                    options={specOptions}
                  />
                  <FormMessage
                    className={productFormTypographyClassNames.helper}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='moldGroupId'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel
                    className={cn(
                      'ml-1 text-blue-800 dark:text-blue-300',
                      productFormTypographyClassNames.fieldLabel
                    )}
                  >
                    {t('engineering.productMgmt.form.mold')}
                  </FormLabel>
                  <ProductMoldMasterLibraryGroupSelectionField
                    options={moldOptions}
                    value={field.value}
                    onValueChange={(groupId, groupName) => {
                      field.onChange(groupId)
                      form.setValue('moldGroup', groupName, {
                        shouldDirty: true,
                      })
                    }}
                  />
                  <FormMessage
                    className={productFormTypographyClassNames.helper}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='min-w-0 space-y-0.5'>
                  <FormLabel
                    className={cn(
                      'ml-1 text-foreground',
                      productFormTypographyClassNames.fieldLabel
                    )}
                  >
                    {t('engineering.productMgmt.form.status')}
                  </FormLabel>
                  <SelectDropdown
                    value={field.value}
                    onValueChange={field.onChange}
                    isControlled={true}
                    items={productStatusOptions}
                    className={cn(
                      'h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-foreground',
                      productFormTypographyClassNames.control
                    )}
                  />
                </FormItem>
              )}
            />
          </div>

          <p
            className={cn(
              'text-muted-foreground',
              productFormTypographyClassNames.helper
            )}
          >
            {t('engineering.productMgmt.form.baseModelSourceHelp', {
              manageCategories: t(
                'engineering.productMgmt.sidebar.editCategory'
              ),
              addCategory: t('engineering.categoryArchive.buttons.add'),
            })}
          </p>

          <div className='grid grid-cols-1 gap-2.5'>
            <div className='min-w-0 space-y-0.5'>
              <FormLabel
                className={cn(
                  'ml-1 text-blue-800 dark:text-blue-300',
                  productFormTypographyClassNames.fieldLabel
                )}
              >
                {t('engineering.productMgmt.form.template')}
              </FormLabel>
              <div
                className={cn(
                  'flex h-[38px] w-full items-center rounded-xl bg-muted/40 px-3 text-foreground',
                  productFormTypographyClassNames.control
                )}
              >
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
