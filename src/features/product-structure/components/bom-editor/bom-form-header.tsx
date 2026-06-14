import { useMemo, type CSSProperties } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { getBomStatusOrderByType } from '@/lib/codecs/code-normalization'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/select-dropdown'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY } from '@/features/engineering/query-keys'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { areSameProductAttributeCategoryKey } from '@/features/engineering/utils/product-attribute-machine-value'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '@/features/engineering/utils/product-attribute-utils'
import { getCustomers } from '@/features/trading/customer'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { type BOM, type Product } from '../../data/schema'
import {
  buildHeaderGridTemplate,
  getBOMHeaderFields,
  type BOMHeaderField,
  type BOMHeaderFieldContext,
} from './bom-header-fields.config'

interface BOMFormHeaderProps {
  form: UseFormReturn<BOM>
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  isEdit: boolean
}

/**
 * BOM 表单顶部字段的纯渲染器。
 *
 * 字段顺序 / 列宽 / 类型 / 校验规则 全部来源于 bom-header-fields.config.ts，
 * 这里仅负责把 config 项落到 react-hook-form 的 FormField 上。
 */
export function BOMFormHeader({
  form,
  products,
  productDisplayLabelMap,
  isEdit,
}: BOMFormHeaderProps) {
  const { t, locale } = useLanguage()

  type BOMStatusLabelKey =
    | 'engineering.bomArchive.status.draft'
    | 'engineering.bomArchive.status.reviewing'
    | 'engineering.bomArchive.status.approved'
    | 'engineering.bomArchive.status.released'
    | 'engineering.bomArchive.status.obsolete'

  const productItems = useMemo(
    () =>
      products.map((product) => ({
        label: productDisplayLabelMap.get(product.id) ?? product.name,
        value: product.id,
      })),
    [productDisplayLabelMap, products]
  )

  const bomType = form.watch('bomType')
  const ownerType = form.watch('ownerType') as BOM['ownerType'] | undefined

  const statusItems = useMemo(() => {
    const STATUS_LABEL_KEY: Record<string, BOMStatusLabelKey> = {
      DRAFT: 'engineering.bomArchive.status.draft',
      REVIEWING: 'engineering.bomArchive.status.reviewing',
      APPROVED: 'engineering.bomArchive.status.approved',
      RELEASED: 'engineering.bomArchive.status.released',
      OBSOLETE: 'engineering.bomArchive.status.obsolete',
    }
    return getBomStatusOrderByType(bomType).map((code) => ({
      label: t(STATUS_LABEL_KEY[code] ?? 'engineering.bomArchive.status.draft'),
      value: code,
    }))
  }, [bomType, t])

  // 方案 B：BOM 重量单位下拉来源于 basic-settings 单位主数据，仅 WEIGHT 类目。
  const { units } = useUnitsQuery()
  const weightUnitItems = useMemo(
    () =>
      units
        .filter(
          (unit) => unit.category === 'WEIGHT' && unit.status === 'active'
        )
        .map((unit) => ({
          label: unit.code ? `${unit.code} (${unit.name})` : unit.name,
          value: unit.code,
        })),
    [units]
  )

  // 方案 B + 1:1：归属语义在 BOM 维度。下拉客户来源 trading 主数据。
  const customersQuery = useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
  })
  const ownerTypeItems = useMemo(
    () => [
      {
        label: t('engineering.bomArchive.form.ownerTypeInternal'),
        value: 'INTERNAL',
      },
      {
        label: t('engineering.bomArchive.form.ownerTypeCustomer'),
        value: 'CUSTOMER',
      },
    ],
    [t]
  )
  const customerItems = useMemo(
    () =>
      (customersQuery.data ?? []).map((customer) => ({
        label: customer.name,
        value: customer.id,
      })),
    [customersQuery.data]
  )

  // 思路 3 Step R2：BOM 档次（versionLevel）下拉来源于产品属性主数据
  // category=versionLevel 的 active options。
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () =>
      ProductAttributeOptionService.getProductAttributeOptions({
        activeOnly: true,
      }),
  })
  const versionLevelItems = useMemo(() => {
    const data = productAttributeOptionsQuery.data ?? []
    return data
      .filter(
        (option) =>
          areSameProductAttributeCategoryKey(
            option.categoryKey,
            PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version
          ) && option.active
      )
      .map((option) => ({
        label:
          locale === 'en-US' && option.labelEn?.trim()
            ? option.labelEn
            : option.labelZh,
        value: option.value,
      }))
  }, [productAttributeOptionsQuery.data, locale])

  const ctx: BOMHeaderFieldContext = useMemo(
    () => ({
      isEdit,
      hideSystemMetaFields: true,
      bomType,
      ownerType,
      t,
      productItems,
      statusItems,
      weightUnitItems,
      ownerTypeItems,
      customerItems,
      versionLevelItems,
    }),
    [
      isEdit,
      bomType,
      ownerType,
      t,
      productItems,
      statusItems,
      weightUnitItems,
      ownerTypeItems,
      customerItems,
      versionLevelItems,
    ]
  )

  const headerFields = useMemo(() => getBOMHeaderFields(ctx), [ctx])

  // lg+ 断点的 grid 模板从配置派生，避免硬编码 6 列。
  // 用 inline style 而非 Tailwind 任意值类名，因为后者要求静态可见的字符串才能被编译器识别。
  const lgGridTemplateColumns = useMemo(
    () => buildHeaderGridTemplate(headerFields).replace(/_/g, ' '),
    [headerFields]
  )
  const headerGridStyle = useMemo<CSSProperties>(
    () => ({ '--bom-header-grid': lgGridTemplateColumns }) as CSSProperties,
    [lgGridTemplateColumns]
  )

  return (
    <div className='space-y-3 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-2.5 sm:p-3'>
      <div
        className='grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3 lg:grid-cols-(--bom-header-grid) lg:gap-2.5 xl:gap-3'
        style={headerGridStyle}
      >
        {headerFields.map((fieldConfig) => (
          <BOMHeaderFormField
            key={fieldConfig.name}
            form={form}
            fieldConfig={fieldConfig}
            ctx={ctx}
          />
        ))}
      </div>
    </div>
  )
}

interface BOMHeaderFormFieldProps {
  form: UseFormReturn<BOM>
  fieldConfig: BOMHeaderField
  ctx: BOMHeaderFieldContext
}

function BOMHeaderFormField({
  form,
  fieldConfig,
  ctx,
}: BOMHeaderFormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={fieldConfig.name as keyof BOM}
      render={({ field }) => (
        <FormItem className='min-w-0'>
          <FormLabel className='mb-1.5 block text-[10px] font-black tracking-widest text-primary/80 uppercase'>
            {fieldConfig.label}
          </FormLabel>

          {fieldConfig.type === 'select' ? (
            <SelectDropdown
              value={(field.value as string | undefined) ?? ''}
              onValueChange={(value) => {
                const next = fieldConfig.transformOnChange
                  ? fieldConfig.transformOnChange(value)
                  : value
                field.onChange(next)
                // ownerType 切回 INTERNAL 时,强制清空 ownerCustomerId,避免脏数据被提交。
                if (fieldConfig.name === 'ownerType' && next !== 'CUSTOMER') {
                  form.setValue('ownerCustomerId', undefined as never)
                }
              }}
              items={[...fieldConfig.getItems(ctx)]}
              placeholder={fieldConfig.placeholder}
              className='h-11! w-full rounded-2xl border-none bg-muted/50 text-[11px]! font-bold shadow-inner'
              disabled={fieldConfig.isDisabled?.(ctx) ?? false}
              isControlled
            />
          ) : fieldConfig.inputType === 'number' ? (
            <FormControl>
              <Input
                type='number'
                value={(field.value as number | string | undefined) ?? ''}
                readOnly={fieldConfig.readOnly}
                placeholder={fieldConfig.placeholder}
                onChange={(event) => {
                  const raw = event.target.value
                  // 数字字段：空 → 0；非法 → 0；正常 → parseFloat
                  if (raw === '') {
                    field.onChange(0)
                    return
                  }
                  const parsed = Number.parseFloat(raw)
                  field.onChange(Number.isFinite(parsed) ? parsed : 0)
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className={cn(
                  'h-11! rounded-2xl border-none bg-muted/50 text-[11px]! font-bold shadow-inner',
                  fieldConfig.className
                )}
              />
            </FormControl>
          ) : (
            <FormControl>
              <Input
                {...field}
                value={
                  fieldConfig.getDisplayValue
                    ? fieldConfig.getDisplayValue(field.value, ctx)
                    : ((field.value as string | undefined) ?? '')
                }
                type={fieldConfig.inputType ?? 'text'}
                readOnly={fieldConfig.readOnly}
                placeholder={fieldConfig.placeholder}
                onChange={(event) => {
                  const next = fieldConfig.transformOnChange
                    ? fieldConfig.transformOnChange(event.target.value)
                    : event.target.value
                  field.onChange(next)
                }}
                className={cn(
                  'h-11! rounded-2xl border-none bg-muted/50 text-[11px]! font-bold shadow-inner',
                  fieldConfig.inputType === 'date' &&
                    '[&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-datetime-edit]:text-[11px]! [&::-webkit-datetime-edit]:font-bold',
                  fieldConfig.className
                )}
              />
            </FormControl>
          )}
        </FormItem>
      )}
    />
  )
}
