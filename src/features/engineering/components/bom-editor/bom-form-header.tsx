import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { cn } from '@/lib/utils'
import { failLoudly } from '@/lib/safe-catch'
import { normalizeBomChangeType, normalizeBomEffectiveDate, normalizeBomNo, normalizeBomStatus, normalizeBomVersion, normalizeChangeOrderNo, normalizeRevisionNo, normalizeSiteCode } from '@/lib/codecs/code-normalization'
import { type BOM, type ChangeOrder, type Product } from '../../data/schema'
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
    label: `${normalizeChangeOrderNo(changeOrder.changeOrderNo)} / ${changeOrder.title}`,
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
    form.setValue('changeOrderNo', normalizeChangeOrderNo(selected.changeOrderNo), { shouldDirty: true })
    if (selected.changeType) {
      form.setValue('changeType', normalizeBomChangeType(selected.changeType), { shouldDirty: true })
    }
    if (selected.siteCode !== undefined) {
      const normalizedSiteCode = normalizeSiteCode(selected.siteCode)
      form.setValue('siteCode', normalizedSiteCode, { shouldDirty: true })
      form.setValue('isDefaultSite', selected.isDefaultSite ?? !normalizedSiteCode, { shouldDirty: true })
    }
    if (selected.revisionNo) {
      form.setValue('revisionNo', normalizeRevisionNo(selected.revisionNo), { shouldDirty: true })
    }
    if (selected.effectiveFrom) {
      form.setValue('effectiveFrom', normalizeBomEffectiveDate(selected.effectiveFrom), { shouldDirty: true })
    }
    if (selected.effectiveTo) {
      form.setValue('effectiveTo', normalizeBomEffectiveDate(selected.effectiveTo), { shouldDirty: true })
    }
  }

  const getNormalizedFieldValue = (name: FormFieldName, value: string | undefined) => {
    if (name === 'bomNo') return normalizeBomNo(value)
    if (name === 'bomVersion') return normalizeBomVersion(value)
    if (name === 'changeType') return normalizeBomChangeType(value)
    if (name === 'status') return normalizeBomStatus(value)
    if (name === 'effectiveFrom' || name === 'effectiveTo') return normalizeBomEffectiveDate(value)
    return value ?? ''
  }

  const handleNormalizedFieldChange = (name: FormFieldName, value: string, onChange: (value: string) => void) => {
    if (name === 'bomNo') {
      onChange(normalizeBomNo(value))
      return
    }
    if (name === 'bomVersion') {
      onChange(normalizeBomVersion(value))
      return
    }
    if (name === 'changeType') {
      onChange(normalizeBomChangeType(value))
      return
    }
    if (name === 'status') {
      onChange(normalizeBomStatus(value))
      return
    }
    if (name === 'effectiveFrom' || name === 'effectiveTo') {
      onChange(normalizeBomEffectiveDate(value))
      return
    }
    onChange(value)
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
                      value={getNormalizedFieldValue(fieldConfig.name, field.value as string | undefined)}
                      onValueChange={(value) => {
                        if (fieldConfig.name === 'changeOrderId') {
                          handleChangeOrderSelection(value, field.onChange)
                          return
                        }
                        handleNormalizedFieldChange(fieldConfig.name, value, field.onChange)
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
                        value={getNormalizedFieldValue(fieldConfig.name, field.value as string | undefined)}
                        type={fieldConfig.inputType ?? 'text'}
                        readOnly={fieldConfig.readOnly}
                        placeholder={fieldConfig.placeholder}
                        onChange={(event) => {
                          handleNormalizedFieldChange(fieldConfig.name, event.target.value, field.onChange)
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
