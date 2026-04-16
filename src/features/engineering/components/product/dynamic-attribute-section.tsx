'use client'

import { type UseFormReturn } from 'react-hook-form'
import { FormItem, FormLabel } from '@/components/ui/form'
import { SelectDropdown } from '@/components/select-dropdown'
import { type Product, type ProductAttributeCategory, type ProductAttributeOption, type ProductTypeAttributeBinding } from '../../data/schema'
import { getAttributeValue, getCategoryName, upsertAttributeValue, getOptionLabel } from '../../utils/product-attribute-utils'
import { areSameProductAttributeCategoryKey } from '../../utils/product-attribute-machine-value'

interface DynamicAttributeSectionProps {
  form: UseFormReturn<Product>
  locale: string
  categories: ProductAttributeCategory[]
  options: ProductAttributeOption[]
  bindings: ProductTypeAttributeBinding[]
  excludeCategoryKeys?: string[]
}

export function DynamicAttributeSection({
  form,
  locale,
  categories,
  options,
  bindings,
  excludeCategoryKeys = [],
}: DynamicAttributeSectionProps) {
  const values = form.watch()
  const visibleBindings = bindings.filter(
    (binding) => binding.active && !excludeCategoryKeys.some((item) => areSameProductAttributeCategoryKey(item, binding.categoryKey))
  )

  if (visibleBindings.length === 0) {
    return null
  }

  return (
    <div className='p-3 rounded-[24px] bg-muted/5 border border-dashed border-muted/30 space-y-3'>
      <div className='flex items-center justify-between gap-2 border-b border-dashed border-muted/30 pb-2'>
        <div className='text-[10px] font-black uppercase tracking-widest text-blue-800 italic'>Dynamic Attributes</div>
        <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>Product Type Driven</div>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
        {visibleBindings.map((binding) => {
          const category = categories.find((item) => areSameProductAttributeCategoryKey(item.key, binding.categoryKey))
          const currentValue = getAttributeValue(values, binding.categoryKey)
          const categoryOptions = options
            .filter((item) => areSameProductAttributeCategoryKey(item.categoryKey, binding.categoryKey) && item.active)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              value: item.value,
              label: getOptionLabel(locale, item),
            }))

          return (
            <FormItem key={binding.id || binding.categoryKey} className='space-y-0.5'>
              <FormLabel className='text-slate-600 font-black text-[10px] uppercase tracking-widest ml-1'>
                {getCategoryName(locale, category)}
              </FormLabel>
              <SelectDropdown
                value={currentValue}
                onValueChange={(nextValue) => {
                  const nextProduct = upsertAttributeValue(form.getValues(), binding.categoryKey, nextValue)
                  form.setValue('attributeValues', nextProduct.attributeValues, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }}
                isControlled
                items={categoryOptions}
                placeholder={getCategoryName(locale, category)}
                className='h-[42px] w-full text-[11px] font-bold rounded-2xl bg-muted/40 border-none px-4'
              />
            </FormItem>
          )
        })}
      </div>
    </div>
  )
}
