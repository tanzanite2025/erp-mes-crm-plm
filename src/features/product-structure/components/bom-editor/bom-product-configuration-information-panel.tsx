import { useMemo } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { getCustomers } from '@/features/trading/customer'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { type BOM, type Product } from '../../data/schema'
import { useBOMPerformanceVersionWeightDrafts } from '../../hooks/use-bom-performance-version-weight-drafts'
import { BOMPerformanceVersionAndWeightField } from './bom-performance-version-and-weight-field'
import {
  getBOMProductConfigurationFields,
  type BOMProductConfigurationField,
  type BOMProductConfigurationFieldContext,
} from './bom-product-configuration-fields.config'

interface BOMProductConfigurationInformationPanelProps {
  form: UseFormReturn<BOM>
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  isEdit: boolean
}

/** Composes product/BOM metadata. Recipe editing, persistence and lifecycle transitions stay outside this panel. */
export function BOMProductConfigurationInformationPanel({
  form,
  products,
  productDisplayLabelMap,
  isEdit,
}: BOMProductConfigurationInformationPanelProps) {
  const { t, locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const weightDrafts = useBOMPerformanceVersionWeightDrafts(form)
  const { currentBOM } = weightDrafts
  const productItems = useMemo(
    () =>
      products.map((product) => ({
        label: productDisplayLabelMap.get(product.id) ?? product.name,
        value: product.id,
      })),
    [products, productDisplayLabelMap]
  )
  const customersQuery = useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
  })
  const customerItems = useMemo(
    () =>
      (customersQuery.data ?? []).map((customer) => ({
        label: customer.name,
        value: customer.id,
      })),
    [customersQuery.data]
  )
  const context: BOMProductConfigurationFieldContext = {
    isEdit,
    ownerType: currentBOM.ownerType,
    t,
    productItems,
    customerItems,
    ownerTypeItems: [
      {
        label: t('engineering.bomArchive.form.ownerTypeInternal'),
        value: 'INTERNAL',
      },
      {
        label: t('engineering.bomArchive.form.ownerTypeCustomer'),
        value: 'CUSTOMER',
      },
    ],
  }
  const productLabel =
    productItems.find((product) => product.value === currentBOM.productId)
      ?.label ?? currentBOM.productId
  const ownershipLabel =
    currentBOM.ownerType === 'CUSTOMER'
      ? (customerItems.find(
          (customer) => customer.value === currentBOM.ownerCustomerId
        )?.label ?? (isZh ? '客户专供' : 'Customer'))
      : isZh
        ? '内部'
        : 'Internal'

  return (
    <div className='space-y-3'>
      <div className='space-y-2.5'>
        {getBOMProductConfigurationFields(context).map((fieldConfig) => (
          <BOMProductConfigurationFormField
            key={fieldConfig.name}
            form={form}
            fieldConfig={fieldConfig}
            context={context}
            isLocked={currentBOM.isLocked}
            onProductOrOwnershipChange={weightDrafts.onProductOrOwnershipChange}
          />
        ))}
      </div>
      <BOMPerformanceVersionAndWeightField
        form={form}
        weightDrafts={weightDrafts}
        productLabel={productLabel}
        scopeLabel={`${currentBOM.bomType === 'MBOM' ? t('engineering.dict.MBOM') : t('engineering.dict.EBOM')} · ${ownershipLabel}`}
      />
      <FormField
        control={form.control}
        name='description'
        render={({ field }) => (
          <FormItem className='gap-1.5 border-t border-dashed border-border/60 pt-3'>
            <FormLabel className='text-[11px] font-bold text-foreground/80'>
              {isZh ? 'BOM 备注' : 'BOM remarks'}
            </FormLabel>
            <FormControl>
              <Textarea
                {...field}
                value={field.value ?? ''}
                disabled={currentBOM.isLocked}
                placeholder={t(
                  'engineering.bomArchive.dialog.remarkPlaceholder'
                )}
                className='min-h-16 resize-y rounded-xl border-transparent bg-muted/50 text-xs shadow-none'
              />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}

function BOMProductConfigurationFormField({
  form,
  fieldConfig,
  context,
  isLocked,
  onProductOrOwnershipChange,
}: {
  form: UseFormReturn<BOM>
  fieldConfig: BOMProductConfigurationField
  context: BOMProductConfigurationFieldContext
  isLocked: boolean
  onProductOrOwnershipChange: () => void
}) {
  const inputClassName =
    'h-9! w-full rounded-xl border-transparent bg-muted/50 text-xs shadow-none'
  return (
    <FormField
      control={form.control}
      name={fieldConfig.name}
      render={({ field }) => (
        <FormItem className='min-w-0 gap-1.5'>
          <FormLabel className='text-[11px] font-bold text-foreground/80'>
            {fieldConfig.label}
          </FormLabel>
          {fieldConfig.type === 'select' ? (
            <SelectDropdown
              value={field.value ?? ''}
              onValueChange={(value) => {
                // Native select synchronization during form.reset can emit an empty value.
                // Only accept an enabled option the user can actually choose.
                if (
                  isLocked ||
                  fieldConfig.isDisabled?.(context) ||
                  !fieldConfig
                    .getItems(context)
                    .some((item) => item.value === value)
                )
                  return
                if (
                  (fieldConfig.name === 'productId' ||
                    fieldConfig.name === 'ownerType' ||
                    fieldConfig.name === 'ownerCustomerId') &&
                  value !== field.value
                )
                  onProductOrOwnershipChange()
                field.onChange(value)
                if (fieldConfig.name === 'ownerType' && value !== 'CUSTOMER') {
                  form.setValue('ownerCustomerId', undefined)
                }
              }}
              items={fieldConfig.getItems(context)}
              placeholder={fieldConfig.placeholder}
              className={inputClassName}
              disabled={
                isLocked || (fieldConfig.isDisabled?.(context) ?? false)
              }
              isControlled
            />
          ) : (
            <FormControl>
              <Input
                {...field}
                value={
                  fieldConfig.getDisplayValue
                    ? fieldConfig.getDisplayValue(field.value, context)
                    : (field.value ?? '')
                }
                type={fieldConfig.inputType ?? 'text'}
                readOnly={fieldConfig.readOnly}
                disabled={isLocked}
                placeholder={fieldConfig.placeholder}
                onChange={(event) =>
                  field.onChange(
                    fieldConfig.transformOnChange
                      ? fieldConfig.transformOnChange(event.target.value)
                      : event.target.value
                  )
                }
                className={cn(inputClassName, fieldConfig.className)}
              />
            </FormControl>
          )}
        </FormItem>
      )}
    />
  )
}
