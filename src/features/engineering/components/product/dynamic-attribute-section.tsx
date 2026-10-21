'use client'

import { type UseFormReturn } from 'react-hook-form'
import { FormItem, FormLabel } from '@/components/ui/form'
import { SelectDropdown } from '@/components/select-dropdown'
import {
  type Product,
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../../data/schema'
import { areSameProductAttributeCategoryKey } from '../../utils/product-attribute-machine-value'
import {
  getAttributeValue,
  getProductTemplateAttributeLevelOneCategoryName,
  upsertAttributeValue,
  getProductTemplateAttributeLevelTwoOptionLabel,
} from '../../utils/product-attribute-utils'

type DynamicAttributeBinding = {
  id?: string
  categoryKey: string
  sortOrder?: number
  required?: boolean
  active?: boolean
}

interface DynamicAttributeSectionProps {
  form: UseFormReturn<Product>
  locale: string
  categories: ProductTemplateAttributeLevelOneCategory[]
  options: ProductTemplateAttributeLevelTwoOption[]
  bindings: DynamicAttributeBinding[]
  excludeCategoryKeys?: string[]
  onAttributeValueChange?: (categoryKey: string, nextValue: string) => void
}

export function DynamicAttributeSection({
  form,
  locale,
  categories,
  options,
  bindings,
  excludeCategoryKeys = [],
  onAttributeValueChange,
}: DynamicAttributeSectionProps) {
  const values = form.watch()
  const visibleBindings = bindings
    .filter(
      (binding) =>
        binding.active !== false &&
        !excludeCategoryKeys.some((item) =>
          areSameProductAttributeCategoryKey(item, binding.categoryKey)
        )
    )
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))

  if (visibleBindings.length === 0) {
    return null
  }

  return (
    <div className='rounded-[18px] border border-dashed border-muted/30 bg-muted/5 p-2'>
      <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5'>
        {visibleBindings.map((binding) => {
          const category = categories.find((item) =>
            areSameProductAttributeCategoryKey(item.key, binding.categoryKey)
          )
          const currentValue = getAttributeValue(values, binding.categoryKey)
          const categoryOptions = options
            .filter(
              (item) =>
                areSameProductAttributeCategoryKey(
                  item.categoryKey,
                  binding.categoryKey
                ) && item.active
            )
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              value: item.value,
              label: getProductTemplateAttributeLevelTwoOptionLabel(
                locale,
                item
              ),
            }))

          return (
            <FormItem
              key={binding.id || binding.categoryKey}
              className='min-w-0 gap-0.5'
            >
              <FormLabel className='ml-1 text-[10px] font-black tracking-widest text-slate-600 uppercase'>
                {getProductTemplateAttributeLevelOneCategoryName(
                  locale,
                  category
                )}
              </FormLabel>
              <SelectDropdown
                value={currentValue}
                onValueChange={(nextValue) => {
                  const nextProduct = upsertAttributeValue(
                    form.getValues(),
                    binding.categoryKey,
                    nextValue
                  )
                  form.setValue(
                    'attributeValues',
                    nextProduct.attributeValues,
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    }
                  )
                  onAttributeValueChange?.(binding.categoryKey, nextValue)
                }}
                isControlled
                items={categoryOptions}
                placeholder={getProductTemplateAttributeLevelOneCategoryName(
                  locale,
                  category
                )}
                className='h-[38px] w-full rounded-xl border-none bg-muted/40 px-3 text-[11px] font-bold'
              />
            </FormItem>
          )
        })}
      </div>
    </div>
  )
}
