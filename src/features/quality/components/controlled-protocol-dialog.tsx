'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Link2, Plus, Scale, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { resolveProductDisplayV2 } from '@/features/engineering/display/product-display-v2'
import { resolveProductDisplayMetadataV2 } from '@/features/engineering/display/product-display-v2-metadata'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
} from '@/features/engineering/query-keys'
import { ProductAttributeCategoryService } from '@/features/engineering/services/product-attribute-category-service'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { productTemplateService } from '@/features/engineering/services/product-template-service'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'

export interface ControlledProtocolCriterion {
  id: string
  itemName: string
  targetWeight: number
  unit: string
  qualifiedMin?: number
  qualifiedMax?: number
  scrapBelow?: number
  scrapAbove?: number
}

export interface ControlledProtocolDraft {
  productId: string
  criteria: ControlledProtocolCriterion[]
}

interface ControlledProtocolCriterionFormValue {
  id: string
  itemName: string
  targetWeight: string
  unit: string
  qualifiedMin: string
  qualifiedMax: string
  scrapBelow: string
  scrapAbove: string
}

interface ControlledProtocolDialogFormState {
  productId: string
  criteria: ControlledProtocolCriterionFormValue[]
}

interface ControlledProtocolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit' | 'view'
  initialValue?: ControlledProtocolDraft | null
  onSubmit?: (draft: ControlledProtocolDraft) => void
  isSubmitting?: boolean
}

const EMPTY_DRAFT: ControlledProtocolDraft = {
  productId: '',
  criteria: [],
}

function createCriterionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `criterion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function numberToFormValue(value?: number) {
  return Number.isFinite(value) ? String(value) : ''
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isNaN(parsed) ? undefined : parsed
}

function toFormState(
  value?: ControlledProtocolDraft | null
): ControlledProtocolDialogFormState {
  return {
    productId: value?.productId ?? '',
    criteria:
      value?.criteria.map((item) => ({
        ...item,
        targetWeight: numberToFormValue(item.targetWeight),
        unit: item.unit || 'g',
        qualifiedMin: numberToFormValue(item.qualifiedMin),
        qualifiedMax: numberToFormValue(item.qualifiedMax),
        scrapBelow: numberToFormValue(item.scrapBelow),
        scrapAbove: numberToFormValue(item.scrapAbove),
      })) ?? [],
  }
}

export function ControlledProtocolDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialValue,
  onSubmit,
  isSubmitting = false,
}: ControlledProtocolDialogProps) {
  const { t, locale } = useLanguage()
  const readonly = mode === 'view'
  const { data: products = [], isLoading: isProductsLoading } = useGetProducts()
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
    enabled: open,
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled: open,
  })
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories({
        activeOnly: true,
      }),
    enabled: open,
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () =>
      ProductAttributeOptionService.getProductAttributeOptions({
        activeOnly: true,
      }),
    enabled: open,
  })
  const initialFormState = useMemo(
    () => toFormState(initialValue ?? EMPTY_DRAFT),
    [initialValue]
  )
  const [productId, setProductId] = useState(initialFormState.productId)
  const [criteria, setCriteria] = useState<ControlledProtocolCriterionFormValue[]>(
    initialFormState.criteria
  )
  const hasProductDisplayMetadata = Boolean(
    productTemplatesQuery.data &&
    productTypesQuery.data &&
    productAttributeCategoriesQuery.data &&
    productAttributeOptionsQuery.data
  )

  const productDisplayEntries = useMemo(
    () =>
      products.map((product) => {
        const displayMetadata = hasProductDisplayMetadata
          ? resolveProductDisplayMetadataV2({
              locale,
              product,
              templates: productTemplatesQuery.data ?? [],
              productTypes: productTypesQuery.data ?? [],
              categories: productAttributeCategoriesQuery.data ?? [],
              options: productAttributeOptionsQuery.data ?? [],
            })
          : null
        const displayProjection =
          displayMetadata?.projection ??
          resolveProductDisplayV2({
            locale,
            product,
          })

        return {
          id: product.id,
          label: displayProjection.title,
        }
      }),
    [
      hasProductDisplayMetadata,
      productAttributeCategoriesQuery.data,
      productAttributeOptionsQuery.data,
      productTemplatesQuery.data,
      productTypesQuery.data,
      locale,
      products,
    ]
  )

  const productOptions = useMemo(
    () =>
      productDisplayEntries.map((product) => ({
        label: product.label,
        value: product.id,
      })),
    [productDisplayEntries]
  )

  const productLabelMap = useMemo(
    () =>
      new Map(
        productDisplayEntries.map((product) => [product.id, product.label])
      ),
    [productDisplayEntries]
  )

  const selectedProductLabel = productLabelMap.get(productId) ?? '-'

  const handleAddSelection = () => {
    setCriteria((prev) => [
      ...prev,
      {
        id: createCriterionId(),
        itemName: '',
        targetWeight: '',
        unit: 'g',
        qualifiedMin: '',
        qualifiedMax: '',
        scrapBelow: '',
        scrapAbove: '',
      },
    ])
  }

  const handleRemoveSelection = (id: string) => {
    setCriteria((prev) => prev.filter((item) => item.id !== id))
  }

  const handleCriterionChange = (
    id: string,
    field: keyof Omit<ControlledProtocolCriterionFormValue, 'id'>,
    value: string
  ) => {
    setCriteria((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = () => {
    if (readonly) {
      onOpenChange(false)
      return
    }

    if (!productId) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.productRequired'
        )
      )
      return
    }

    if (criteria.length === 0) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.selectionRequired'
        )
      )
      return
    }

    const hasInvalidItemName = criteria.some(
      (item) => item.itemName.trim() === ''
    )
    if (hasInvalidItemName) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.itemNameRequired'
        )
      )
      return
    }

    const hasInvalidWeight = criteria.some(
      (item) =>
        item.targetWeight.trim() === '' || Number.isNaN(Number(item.targetWeight))
    )

    if (hasInvalidWeight) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.weightRequired'
        )
      )
      return
    }

    onSubmit?.({
      productId,
      criteria: criteria.map((item) => ({
        id: item.id,
        itemName: item.itemName.trim(),
        targetWeight: Number(item.targetWeight),
        unit: item.unit.trim() || 'g',
        qualifiedMin: parseOptionalNumber(item.qualifiedMin),
        qualifiedMax: parseOptionalNumber(item.qualifiedMax),
        scrapBelow: parseOptionalNumber(item.scrapBelow),
        scrapAbove: parseOptionalNumber(item.scrapAbove),
      })),
    })
  }

  const title =
    mode === 'edit'
      ? t('quality.standards.dialog.controlledProtocol.titleEdit')
      : mode === 'view'
        ? t('quality.standards.dialog.controlledProtocol.titleView')
        : t('quality.standards.dialog.controlledProtocol.titleCreate')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='4xl'
        showCloseButton={false}
        className='h-[820px] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-[32px] border-none bg-background p-0 shadow-2xl'
      >
        <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />

        <DialogHeader className='relative gap-1.5 border-b border-dashed border-muted/40 bg-muted/10 px-6 pt-5 pb-3 text-left'>
          <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tighter uppercase italic'>
            <span className='rounded-2xl bg-primary/10 p-2 text-primary'>
              <Link2 className='size-5' />
            </span>
            {title}
          </DialogTitle>
          <DialogDescription className='max-w-3xl text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('quality.standards.dialog.controlledProtocol.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='relative min-h-0 overflow-y-auto px-6 pt-3 pb-7'>
          <div className='flex flex-col gap-2.5'>
            <div className='rounded-[24px] border border-dashed border-muted/40 bg-muted/5 p-3'>
              <div className='flex flex-wrap items-center gap-2 border-b border-dashed border-muted/30 pb-1.5'>
                <div className='inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-[8px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  <Box className='size-3.5 text-primary' />
                  <span>
                    {t(
                      'quality.standards.dialog.controlledProtocol.fields.product'
                    )}
                  </span>
                  <span className='font-mono text-foreground'>
                    {selectedProductLabel}
                  </span>
                </div>
                <div className='inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-[8px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                  <Scale className='size-3.5 text-primary' />
                  <span>
                    {t(
                      'quality.standards.dialog.controlledProtocol.fields.qualityCriteria'
                    )}
                  </span>
                  <span className='font-mono text-foreground'>
                    {criteria.length}
                  </span>
                </div>
              </div>

              <div className='mt-1.5 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end'>
                <div className='space-y-1.5'>
                  <Label className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                    {t(
                      'quality.standards.dialog.controlledProtocol.fields.product'
                    )}
                  </Label>
                  <SelectDropdown
                    value={productId}
                    isControlled
                    onValueChange={setProductId}
                    items={productOptions}
                    isPending={isProductsLoading}
                    disabled={readonly}
                    placeholder={t(
                      'quality.standards.dialog.controlledProtocol.placeholders.product'
                    )}
                    className='h-10 rounded-2xl border-none bg-background/80 px-4 text-xs font-bold shadow-inner'
                  />
                </div>

                <Button
                  type='button'
                  onClick={handleAddSelection}
                  disabled={readonly}
                  className='h-10 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
                >
                  <Plus className='mr-2 size-4' />
                  {t(
                    'quality.standards.dialog.controlledProtocol.actions.addSelection'
                  )}
                </Button>
              </div>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-3'>
              <div className='mb-1.5 flex items-center gap-2 text-sm font-black tracking-tighter italic'>
                <Scale className='size-4 text-primary' />
                {t(
                  'quality.standards.dialog.controlledProtocol.fields.selectedWeights'
                )}
              </div>

              {criteria.length === 0 ? (
                <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-3 text-center text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t(
                    'quality.standards.dialog.controlledProtocol.empty.criteria'
                  )}
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {criteria.map((item) => (
                    <div
                      key={item.id}
                      className='grid gap-2 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-2.5 xl:grid-cols-[minmax(180px,1.2fr)_120px_90px_120px_120px_120px_120px_auto]'
                    >
                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                          {t(
                            'quality.standards.dialog.controlledProtocol.fields.itemName'
                          )}
                        </Label>
                        <Input
                          value={item.itemName}
                          disabled={readonly}
                          onChange={(event) =>
                            handleCriterionChange(
                              item.id,
                              'itemName',
                              event.target.value
                            )
                          }
                          placeholder={t(
                            'quality.standards.dialog.controlledProtocol.placeholders.itemName'
                          )}
                          className='h-10 rounded-2xl border-none bg-background px-4 text-xs font-bold shadow-inner'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                          {t(
                            'quality.standards.dialog.controlledProtocol.fields.targetWeight'
                          )}
                        </Label>
                        <Input
                          type='number'
                          step='0.01'
                          inputMode='decimal'
                          value={item.targetWeight}
                          disabled={readonly}
                          onChange={(event) =>
                            handleCriterionChange(
                              item.id,
                              'targetWeight',
                              event.target.value
                            )
                          }
                          placeholder={t(
                            'quality.standards.dialog.controlledProtocol.placeholders.targetWeight'
                          )}
                          className='h-10 rounded-2xl border-none bg-background px-4 font-mono font-black shadow-inner'
                        />
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                          {t(
                            'quality.standards.dialog.controlledProtocol.fields.unit'
                          )}
                        </Label>
                        <Input
                          value={item.unit}
                          disabled={readonly}
                          onChange={(event) =>
                            handleCriterionChange(
                              item.id,
                              'unit',
                              event.target.value
                            )
                          }
                          placeholder={t(
                            'quality.standards.dialog.controlledProtocol.placeholders.unit'
                          )}
                          className='h-10 rounded-2xl border-none bg-background px-4 font-mono text-xs font-black shadow-inner'
                        />
                      </div>

                      {(
                        [
                          ['qualifiedMin', 'qualifiedMin'],
                          ['qualifiedMax', 'qualifiedMax'],
                          ['scrapBelow', 'scrapBelow'],
                          ['scrapAbove', 'scrapAbove'],
                        ] as const
                      ).map(([field, labelKey]) => (
                        <div key={field} className='space-y-1.5'>
                          <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                            {t(
                              `quality.standards.dialog.controlledProtocol.fields.${labelKey}`
                            )}
                          </Label>
                          <Input
                            type='number'
                            step='0.01'
                            inputMode='decimal'
                            value={item[field]}
                            disabled={readonly}
                            onChange={(event) =>
                              handleCriterionChange(
                                item.id,
                                field,
                                event.target.value
                              )
                            }
                            placeholder={t(
                              `quality.standards.dialog.controlledProtocol.placeholders.${labelKey}`
                            )}
                            className='h-10 rounded-2xl border-none bg-background px-4 font-mono font-black shadow-inner'
                          />
                        </div>
                      ))}

                      <div className='flex items-end justify-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          onClick={() => handleRemoveSelection(item.id)}
                          disabled={readonly}
                          className='h-10 rounded-full px-4 text-[10px] font-black tracking-widest text-rose-600 uppercase hover:text-rose-700'
                        >
                          <Trash2 className='mr-2 size-4' />
                          {t(
                            'quality.standards.dialog.controlledProtocol.actions.removeSelection'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className='relative border-t border-dashed border-muted/40 bg-muted/5 px-6 py-5 sm:justify-between'>
          <div className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Box className='size-3.5' />
            {selectedProductLabel}
          </div>
          <div className='flex items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              className='h-10 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
            >
              {readonly
                ? t('quality.standards.dialog.controlledProtocol.actions.close')
                : t(
                    'quality.standards.dialog.controlledProtocol.actions.cancel'
                  )}
            </Button>
            {!readonly ? (
              <Button
                type='button'
                disabled={isSubmitting}
                onClick={handleSubmit}
                className='h-10 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
              >
                {t(
                  'quality.standards.dialog.controlledProtocol.actions.submit'
                )}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
