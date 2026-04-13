import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { cn } from '@/lib/utils'
import { failLoudly } from '@/lib/safe-catch'
import { type BOM, type ChangeOrder, type Product } from '../../data/schema'
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
  changeOrders: ChangeOrder[]
  isEdit: boolean
}

export function BOMFormHeader({ form, products, changeOrders, isEdit }: BOMFormHeaderProps) {
  const { t } = useLanguage()
  const productItems = useMemo(
    () =>
      products.map((product) => ({
        label: getProductAttributes(product).displayName,
        value: product.id,
      })),
    [products]
  )

  const changeOrderItems = changeOrders.map((changeOrder) => ({
    label: `${changeOrder.changeOrderNo || ''} / ${changeOrder.title}`,
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
      const error = new Error(`[CRITICAL] Missing change order for id ${changeOrderId}`)
      failLoudly(error, 'BOMFormHeader.changeOrderLookup')
      throw error
    }

    if (!form.getValues('productId') && selected.productId) {
      form.setValue('productId', selected.productId, { shouldDirty: true })
    }

    if (!selected.changeOrderNo) {
      const error = new Error('[CRITICAL] Missing changeOrderNo for selected change order')
      failLoudly(error, 'BOMFormHeader.changeOrderNo')
      throw error
    }
    const normalizedPatch = normalizeBOMControlFieldPatch({
      changeOrderNo: selected.changeOrderNo,
      changeType: selected.changeType,
      siteCode: selected.siteCode,
      isDefaultSite: selected.isDefaultSite,
      revisionNo: selected.revisionNo,
      effectiveFrom: selected.effectiveFrom,
      effectiveTo: selected.effectiveTo,
    })

    form.setValue('changeOrderNo', normalizedPatch.changeOrderNo || '', { shouldDirty: true })
    if (selected.changeType) {
      form.setValue('changeType', normalizedPatch.changeType || 'MANUAL', { shouldDirty: true })
    }
    if (selected.siteCode !== undefined) {
      form.setValue('siteCode', normalizedPatch.siteCode || '', { shouldDirty: true })
      form.setValue('isDefaultSite', Boolean(normalizedPatch.isDefaultSite), { shouldDirty: true })
    }
    if (selected.revisionNo) {
      form.setValue('revisionNo', normalizedPatch.revisionNo || '', { shouldDirty: true })
    }
    if (selected.effectiveFrom) {
      form.setValue('effectiveFrom', normalizedPatch.effectiveFrom || '', { shouldDirty: true })
    }
    if (selected.effectiveTo) {
      form.setValue('effectiveTo', normalizedPatch.effectiveTo || '', { shouldDirty: true })
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
                        if (fieldConfig.name === 'changeType') {
                          field.onChange(normalizeBOMControlFieldPatch({ changeType: value }).changeType)
                          return
                        }
                        if (fieldConfig.name === 'status') {
                          field.onChange(normalizeBOMControlFieldPatch({ status: value }).status)
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
                        onChange={(event) => {
                          const nextValue = event.target.value

                          if (fieldConfig.name === 'changeOrderNo') {
                            field.onChange(normalizeBOMControlFieldPatch({ changeOrderNo: nextValue }).changeOrderNo)
                            return
                          }

                          if (fieldConfig.name === 'siteCode') {
                            const normalizedPatch = normalizeBOMControlFieldPatch({
                              siteCode: nextValue,
                              isDefaultSite: nextValue.trim() === '',
                            })
                            field.onChange(normalizedPatch.siteCode)
                            form.setValue('isDefaultSite', Boolean(normalizedPatch.isDefaultSite), { shouldDirty: true })
                            return
                          }

                          if (fieldConfig.name === 'revisionNo') {
                            field.onChange(normalizeBOMControlFieldPatch({ revisionNo: nextValue }).revisionNo)
                            return
                          }

                          if (fieldConfig.name === 'effectiveFrom' || fieldConfig.name === 'effectiveTo') {
                            field.onChange(
                              fieldConfig.name === 'effectiveFrom'
                                ? normalizeBOMControlFieldPatch({ effectiveFrom: nextValue }).effectiveFrom
                                : normalizeBOMControlFieldPatch({ effectiveTo: nextValue }).effectiveTo
                            )
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
