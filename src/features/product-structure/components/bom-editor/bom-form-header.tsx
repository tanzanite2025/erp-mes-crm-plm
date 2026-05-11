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
} from '../../utils/bom-control-normalization'

type FormFieldName = keyof BOM | string

type FormFieldConfig = {
  name: FormFieldName
  label: string
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
  productDisplayLabelMap: Map<string, string>
  isEdit: boolean
}

export function BOMFormHeader({ form, products, productDisplayLabelMap, isEdit }: BOMFormHeaderProps) {
  const { t } = useLanguage()
  const productItems = useMemo(
    () =>
      products.map((product) => ({
        label: productDisplayLabelMap.get(product.id) ?? '',
        value: product.id,
      })),
    [productDisplayLabelMap, products]
  )

  const headerFields: FormFieldConfig[] = [
    {
      name: 'bomNo',
      label: t('engineering.bomArchive.form.bomNo'),
      type: 'input',
      readOnly: true,
      placeholder: isEdit ? undefined : t('engineering.bomArchive.form.bomNoAutoPlaceholder'),
      className: 'bg-muted/50',
    },
    {
      name: 'productId',
      label: t('engineering.bomArchive.form.product'),
      type: 'select',
      placeholder: t('engineering.bomArchive.form.productPlaceholder'),
      items: productItems,
    },
    {
      name: 'bomVersion',
      label: t('engineering.bomArchive.form.version'),
      type: 'input',
      readOnly: true,
      className: 'bg-blue-50/70 font-mono font-bold text-blue-600',
    },
    {
      name: 'status',
      label: t('engineering.bomArchive.form.status'),
      type: 'select',
      items: [
        { label: t('engineering.bomArchive.status.active'), value: 'active' },
        { label: t('engineering.bomArchive.status.draft'), value: 'draft' },
        { label: t('engineering.bomArchive.status.archived'), value: 'archived' },
      ],
    },
    {
      name: 'effectiveFrom',
      label: t('engineering.bomArchive.form.effectiveFrom'),
      type: 'input',
      inputType: 'date',
    },
    {
      name: 'revisionNo',
      label: t('engineering.bomArchive.form.revisionNo'),
      type: 'input',
      placeholder: t('engineering.bomArchive.form.revisionNoPlaceholder'),
      className: 'font-mono',
    },
  ]

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-3 sm:p-4'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,3.4fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1.75fr)_minmax(0,0.95fr)] lg:gap-3 xl:gap-4'>
        {headerFields.map((fieldConfig) => (
          <FormField
            key={fieldConfig.name}
            control={form.control}
            name={fieldConfig.name as keyof BOM}
            render={({ field }) => (
              <FormItem className='min-w-0'>
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
    </div>
  )
}
