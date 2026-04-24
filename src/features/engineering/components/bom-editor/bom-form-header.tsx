import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { cn } from '@/lib/utils'
import { type BOM, type Product } from '../../data/schema'
import {
  normalizeBOMControlFieldPatch,
} from '../../utils/product-code-normalization'
import { getProductAttributes } from '../../utils/product-utils'

type FormFieldName = keyof BOM | string

type FormFieldConfig = {
  name: FormFieldName
  label: string
  colSpan: string
  type: 'input' | 'select'
  readOnly?: boolean
  placeholder?: string
  inputType?: 'text' | 'date' | 'number'
  items?: { label: string; value: string }[]
  className?: string
}

interface BOMFormHeaderProps {
  form: UseFormReturn<BOM>
  products: Product[]
  isEdit: boolean
}

export function BOMFormHeader({ form, products, isEdit }: BOMFormHeaderProps) {
  const { t } = useLanguage()
  const productItems = useMemo(
    () =>
      products.map((product) => ({
        label: getProductAttributes(product).displayName,
        value: product.id,
      })),
    [products]
  )

  const headerRows: FormFieldConfig[][] = [
    [
      {
        name: 'bomNo',
        label: t('engineering.bomArchive.form.bomNo'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        readOnly: true,
        placeholder: isEdit ? undefined : t('engineering.bomArchive.form.bomNoAutoPlaceholder'),
        className: 'bg-muted/50',
      },
      {
        name: 'productId',
        label: t('engineering.bomArchive.form.product'),
        colSpan: 'col-span-full sm:col-span-5',
        type: 'select',
        placeholder: t('engineering.bomArchive.form.productPlaceholder'),
        items: productItems,
      },
      {
        name: 'bomVersion',
        label: t('engineering.bomArchive.form.version'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        readOnly: true,
        className: 'bg-blue-50/70 font-mono font-bold text-blue-600',
      },
      {
        name: 'status',
        label: t('engineering.bomArchive.form.status'),
        colSpan: 'col-span-full sm:col-span-3',
        type: 'select',
        items: [
          { label: t('engineering.bomArchive.status.active'), value: 'active' },
          { label: t('engineering.bomArchive.status.draft'), value: 'draft' },
          { label: t('engineering.bomArchive.status.archived'), value: 'archived' },
        ],
      },
    ],
    [
      {
        name: 'effectiveFrom',
        label: t('engineering.bomArchive.form.effectiveFrom'),
        colSpan: 'col-span-full sm:col-span-8',
        type: 'input',
        inputType: 'date',
      },
      {
        name: 'revisionNo',
        label: t('engineering.bomArchive.form.revisionNo'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        placeholder: t('engineering.bomArchive.form.revisionNoPlaceholder'),
        className: 'font-mono',
      },
    ],
  ]

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-3 sm:p-4'>
      {headerRows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            'grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4',
            rowIdx > 0 && 'border-t border-dashed border-muted/30 pt-3'
          )}
        >
          {row.map((fieldConfig) => (
            <FormField
              key={fieldConfig.name}
              control={form.control}
              name={fieldConfig.name as keyof BOM}
              render={({ field }) => (
                <FormItem className={fieldConfig.colSpan}>
                  <FormLabel className='mb-1.5 block text-[10px] font-black uppercase tracking-widest text-primary/80'>
                    {fieldConfig.label}
                  </FormLabel>

                  {fieldConfig.type === 'select' ? (
                    <SelectDropdown
                      value={(field.value as string | undefined) ?? ''}
                      onValueChange={(value) => {
                        if (fieldConfig.name === 'status') {
                          field.onChange(normalizeBOMControlFieldPatch({ status: value }).status)
                          return
                        }
                        field.onChange(value)
                      }}
                      items={fieldConfig.items}
                      placeholder={fieldConfig.placeholder}
                      className='h-11! w-full rounded-2xl border-none bg-muted/50 text-[11px] font-bold shadow-inner'
                      disabled={isEdit && fieldConfig.name === 'productId'}
                      isControlled
                    />
                  ) : (
                    <FormControl>
                      <Input
                        {...field}
                        value={(field.value as string | undefined) ?? ''}
                        type={fieldConfig.inputType ?? 'text'}
                        readOnly={fieldConfig.readOnly}
                        placeholder={fieldConfig.placeholder}
                        onChange={(event) => {
                          const nextValue = event.target.value

                          if (fieldConfig.name === 'revisionNo') {
                            field.onChange(normalizeBOMControlFieldPatch({ revisionNo: nextValue }).revisionNo)
                            return
                          }

                          if (fieldConfig.name === 'effectiveFrom') {
                            field.onChange(normalizeBOMControlFieldPatch({ effectiveFrom: nextValue }).effectiveFrom)
                            return
                          }

                          field.onChange(event)
                        }}
                        className={cn(
                          'h-11! rounded-2xl border-none bg-muted/50 text-[11px] font-bold shadow-inner',
                          fieldConfig.className
                        )}
                      />
                    </FormControl>
                  )}
                </FormItem>
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
