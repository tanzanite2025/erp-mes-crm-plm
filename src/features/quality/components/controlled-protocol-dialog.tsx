'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Layers3, Link2, Plus, Scale, Trash2 } from 'lucide-react'
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
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { useHierarchyLevelLabels } from '@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels'

export interface ControlledProtocolDraftSelection {
  stageId: string
  stageName: string
  stagePath: string
  weight: number
}

export interface ControlledProtocolDraft {
  productId: string
  selections: ControlledProtocolDraftSelection[]
}

interface ControlledProtocolDraftSelectionFormValue {
  stageId: string
  stageName: string
  stagePath: string
  weight: string
}

interface ControlledProtocolDialogFormState {
  productId: string
  selections: ControlledProtocolDraftSelectionFormValue[]
}

interface ControlledProtocolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit' | 'view'
  initialValue?: ControlledProtocolDraft | null
  onSubmit?: (draft: ControlledProtocolDraft) => void
  isSubmitting?: boolean
}

interface Level3StageOption {
  id: string
  name: string
  pathLabel: string
}

const EMPTY_DRAFT: ControlledProtocolDraft = {
  productId: '',
  selections: [],
}

function toFormState(
  value?: ControlledProtocolDraft | null
): ControlledProtocolDialogFormState {
  return {
    productId: value?.productId ?? '',
    selections:
      value?.selections.map((item) => ({
        ...item,
        weight: Number.isFinite(item.weight) ? String(item.weight) : '',
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
  const { level1Name, level2Name, level3Name } = useHierarchyLevelLabels()
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
  const { data: lines = [], isLoading: isLinesLoading } =
    useProductionLinesQuery({
      enabled: open,
    })
  const initialFormState = useMemo(
    () => toFormState(initialValue ?? EMPTY_DRAFT),
    [initialValue]
  )
  const [productId, setProductId] = useState(initialFormState.productId)
  const [pendingStageId, setPendingStageId] = useState('')
  const [selections, setSelections] = useState<
    ControlledProtocolDraftSelectionFormValue[]
  >(initialFormState.selections)
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

  const level3Options = useMemo<Level3StageOption[]>(() => {
    return lines.flatMap((line) =>
      (line.segments ?? []).flatMap((segment) =>
        (segment.jobCategories ?? []).map((jobCategory) => ({
          id: jobCategory.id,
          name: jobCategory.name,
          pathLabel: `${line.name} / ${segment.name} / ${jobCategory.name}`,
        }))
      )
    )
  }, [lines])

  const availableLevel3Options = useMemo(() => {
    const selectedIds = new Set(selections.map((item) => item.stageId))
    return level3Options.filter((option) => !selectedIds.has(option.id))
  }, [level3Options, selections])

  const selectedProductLabel = productLabelMap.get(productId) ?? '-'
  const hasLevel3Options = availableLevel3Options.length > 0

  const handleAddSelection = () => {
    if (!pendingStageId) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.selectionRequired'
        )
      )
      return
    }

    const option = level3Options.find((item) => item.id === pendingStageId)
    if (!option) {
      return
    }

    setSelections((prev) => [
      ...prev,
      {
        stageId: option.id,
        stageName: option.name,
        stagePath: option.pathLabel,
        weight: '',
      },
    ])
    setPendingStageId('')
  }

  const handleRemoveSelection = (stageId: string) => {
    setSelections((prev) => prev.filter((item) => item.stageId !== stageId))
  }

  const handleWeightChange = (stageId: string, weight: string) => {
    setSelections((prev) =>
      prev.map((item) =>
        item.stageId === stageId ? { ...item, weight } : item
      )
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

    if (selections.length === 0) {
      toast.error(
        t(
          'quality.standards.dialog.controlledProtocol.validation.selectionRequired'
        )
      )
      return
    }

    const hasInvalidWeight = selections.some(
      (item) => item.weight.trim() === '' || Number.isNaN(Number(item.weight))
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
      selections: selections.map((item) => ({
        stageId: item.stageId,
        stageName: item.stageName,
        stagePath: item.stagePath,
        weight: Number(item.weight),
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
                  <Layers3 className='size-3.5 text-primary' />
                  <span>{level1Name}</span>
                  <span>/</span>
                  <span>{level2Name}</span>
                  <span>/</span>
                  <span className='text-foreground'>{level3Name}</span>
                </div>
              </div>

              <div className='mt-1.5 grid gap-2.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)_auto] lg:items-end'>
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

                <div className='space-y-1.5'>
                  <Label className='text-[9px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                    {t(
                      'quality.standards.dialog.controlledProtocol.fields.level3'
                    )}
                  </Label>
                  <SelectDropdown
                    value={pendingStageId}
                    isControlled
                    onValueChange={setPendingStageId}
                    items={availableLevel3Options.map((option) => ({
                      label: option.pathLabel,
                      value: option.id,
                    }))}
                    isPending={isLinesLoading}
                    disabled={readonly || !hasLevel3Options}
                    placeholder={t(
                      'quality.standards.dialog.controlledProtocol.placeholders.level3'
                    )}
                    className='h-10 rounded-2xl border-none bg-background/80 px-4 text-xs font-bold shadow-inner'
                  />
                </div>

                <Button
                  type='button'
                  onClick={handleAddSelection}
                  disabled={readonly || !hasLevel3Options || !pendingStageId}
                  className='h-10 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
                >
                  <Plus className='mr-2 size-4' />
                  {t(
                    'quality.standards.dialog.controlledProtocol.actions.addSelection'
                  )}
                </Button>
              </div>

              {!isLinesLoading && !hasLevel3Options ? (
                <div className='mt-1 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[9px] font-black tracking-widest text-amber-700 uppercase'>
                  {t(
                    'quality.standards.dialog.controlledProtocol.empty.stages'
                  )}
                </div>
              ) : null}
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-3'>
              <div className='mb-1.5 flex items-center gap-2 text-sm font-black tracking-tighter italic'>
                <Scale className='size-4 text-primary' />
                {t(
                  'quality.standards.dialog.controlledProtocol.fields.selectedWeights'
                )}
              </div>

              {selections.length === 0 ? (
                <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-3 text-center text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t(
                    'quality.standards.dialog.controlledProtocol.empty.selections'
                  )}
                </div>
              ) : (
                <div className='space-y-1.5'>
                  {selections.map((item) => (
                    <div
                      key={item.stageId}
                      className='grid gap-2 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-2.5 lg:grid-cols-[minmax(0,1fr)_170px_auto]'
                    >
                      <div className='min-w-0 self-center'>
                        <div className='flex items-center gap-2 text-sm font-black tracking-tighter italic'>
                          <Layers3 className='size-4 text-primary' />
                          <span className='truncate'>{item.stageName}</span>
                        </div>
                        <p className='mt-0.5 truncate text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                          {item.stagePath}
                        </p>
                      </div>

                      <div className='space-y-1.5'>
                        <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
                          {t(
                            'quality.standards.dialog.controlledProtocol.fields.weight'
                          )}
                        </Label>
                        <Input
                          type='number'
                          step='0.01'
                          inputMode='decimal'
                          value={item.weight}
                          disabled={readonly}
                          onChange={(event) =>
                            handleWeightChange(item.stageId, event.target.value)
                          }
                          placeholder={t(
                            'quality.standards.dialog.controlledProtocol.placeholders.weight'
                          )}
                          className='h-10 rounded-2xl border-none bg-background px-4 font-mono font-black shadow-inner'
                        />
                      </div>

                      <div className='flex items-end justify-end'>
                        <Button
                          type='button'
                          variant='ghost'
                          onClick={() => handleRemoveSelection(item.stageId)}
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
