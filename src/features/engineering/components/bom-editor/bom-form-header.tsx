import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { cn } from '@/lib/utils'
import { type BOM, type ChangeOrder, type Product } from '../../data/schema'
import { formatProductDisplayName } from '../../utils/product-utils'

type FormFieldConfig = {
  name: keyof BOM | string
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
  changeOrders: ChangeOrder[]
  isEdit: boolean
}

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : '')

export function BOMFormHeader({ form, products, changeOrders, isEdit }: BOMFormHeaderProps) {
  const { t } = useLanguage()

  const changeOrderItems = changeOrders.map((changeOrder) => ({
    label: `${changeOrder.changeOrderNo} / ${changeOrder.title}`,
    value: changeOrder.id,
  }))

  const headerRows: FormFieldConfig[][] = [
    [
      {
        name: 'bomNo',
        label: t('engineering.bomArchive.form.bomNo'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        readOnly: isEdit,
        className: 'bg-muted/50',
      },
      {
        name: 'productId',
        label: t('engineering.bomArchive.form.product'),
        colSpan: 'col-span-full sm:col-span-5',
        type: 'select',
        placeholder: t('engineering.bomArchive.form.productPlaceholder'),
        items: products.map((product) => ({
          label: formatProductDisplayName(product),
          value: product.id,
        })),
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
        name: 'changeOrderId',
        label: t('engineering.bomArchive.form.changeOrder'),
        colSpan: 'col-span-full sm:col-span-4',
        type: 'select',
        placeholder:
          changeOrderItems.length > 0
            ? t('engineering.bomArchive.form.changeOrderPlaceholder')
            : t('engineering.bomArchive.form.changeOrderEmpty'),
        items: changeOrderItems,
      },
      {
        name: 'changeOrderNo',
        label: t('engineering.bomArchive.form.changeOrderNo'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        placeholder: t('engineering.bomArchive.form.changeOrderNoPlaceholder'),
        className: 'font-mono',
      },
      {
        name: 'changeType',
        label: t('engineering.bomArchive.form.changeType'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'select',
        items: [
          { label: t('engineering.bomArchive.form.manual'), value: 'MANUAL' },
          { label: t('engineering.bomArchive.form.eco'), value: 'ECO' },
          { label: t('engineering.bomArchive.form.ecn'), value: 'ECN' },
        ],
      },
      {
        name: 'siteCode',
        label: t('engineering.bomArchive.form.siteCode'),
        colSpan: 'col-span-full sm:col-span-2',
        type: 'input',
        placeholder: t('engineering.bomArchive.form.siteCodePlaceholder'),
        className: 'font-mono uppercase',
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
    [
      {
        name: 'effectiveFrom',
        label: t('engineering.bomArchive.form.effectiveFrom'),
        colSpan: 'col-span-full sm:col-span-6',
        type: 'input',
        inputType: 'date',
      },
      {
        name: 'effectiveTo',
        label: t('engineering.bomArchive.form.effectiveTo'),
        colSpan: 'col-span-full sm:col-span-6',
        type: 'input',
        inputType: 'date',
      },
    ],
  ]

  const handleChangeOrderSelection = (changeOrderId: string, onChange: (value: string) => void) => {
    onChange(changeOrderId)

    const selected = changeOrders.find((changeOrder) => changeOrder.id === changeOrderId)
    if (!selected) {
      form.setValue('changeOrderNo', '', { shouldDirty: true })
      return
    }

    if (!form.getValues('productId') && selected.productId) {
      form.setValue('productId', selected.productId, { shouldDirty: true })
    }

    form.setValue('changeOrderNo', selected.changeOrderNo || '', { shouldDirty: true })
    if (selected.changeType) {
      form.setValue('changeType', selected.changeType, { shouldDirty: true })
    }
    if (selected.siteCode !== undefined) {
      form.setValue('siteCode', selected.siteCode || '', { shouldDirty: true })
      form.setValue('isDefaultSite', selected.isDefaultSite ?? !selected.siteCode, { shouldDirty: true })
    }
    if (selected.revisionNo) {
      form.setValue('revisionNo', selected.revisionNo, { shouldDirty: true })
    }
    if (selected.effectiveFrom) {
      form.setValue('effectiveFrom', toDateInput(selected.effectiveFrom), { shouldDirty: true })
    }
    if (selected.effectiveTo) {
      form.setValue('effectiveTo', toDateInput(selected.effectiveTo), { shouldDirty: true })
    }
  }

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
                        if (fieldConfig.name === 'changeOrderId') {
                          handleChangeOrderSelection(value, field.onChange)
                          return
                        }
                        field.onChange(value)
                      }}
                      items={fieldConfig.items}
                      placeholder={fieldConfig.placeholder}
                      className='h-11! w-full rounded-2xl border-none bg-muted/50 text-[11px] font-bold shadow-inner'
                      disabled={
                        (isEdit && fieldConfig.name === 'productId') ||
                        (fieldConfig.name === 'changeOrderId' && changeOrderItems.length === 0)
                      }
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
