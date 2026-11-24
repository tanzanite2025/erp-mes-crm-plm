'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers3, Link2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
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
import {
  buildConfigurableInspectionGradeRules,
  createConfigurableInspectionGradeFormValues,
} from '../services/configurable-inspection-deviation-grade-rules'
import {
  getControlledProtocolInspectionCriteriaValidationError,
  type ControlledProtocolInspectionCriterionFormValue,
} from '../services/controlled-protocol-inspection-criteria-editor'
import type { ControlledProtocolDraft } from '../types/controlled-protocol'
import { ControlledProtocolInspectionCriteriaEditor } from './controlled-protocol-inspection-criteria-editor'

export type {
  ControlledProtocolCriterion,
  ControlledProtocolDraft,
} from '../types/controlled-protocol'

type ControlledProtocolCriterionFormValue =
  ControlledProtocolInspectionCriterionFormValue

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
  onManageInspectionStages?: () => void
}

const EMPTY_DRAFT: ControlledProtocolDraft = {
  productId: '',
  productName: '',
  criteria: [],
}

function numberToFormValue(value?: number) {
  return Number.isFinite(value) ? String(value) : ''
}

function toFormState(
  value?: ControlledProtocolDraft | null
): ControlledProtocolDialogFormState {
  return {
    productId: value?.productId ?? '',
    criteria:
      (value?.criteria ?? []).map((item) => ({
        ...item,
        gradingMode: 'DEVIATION_BANDS' as const,
        grades: createConfigurableInspectionGradeFormValues(item.levels),
        targetWeight: numberToFormValue(item.targetWeight),
        unit: item.unit || '',
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
  onManageInspectionStages,
}: ControlledProtocolDialogProps) {
  const { t, locale } = useLanguage()
  const readonly = mode === 'view'
  const {
    units,
    isLoading: areUnitsLoading,
    error: unitsError,
  } = useUnitsQuery({ enabled: open })
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
  const [criteria, setCriteria] = useState<
    ControlledProtocolCriterionFormValue[]
  >(initialFormState.criteria)
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

  const selectedProductLabel =
    productLabelMap.get(productId) || productId || '-'

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

    if (areUnitsLoading || unitsError) {
      toast.error(
        t(
          areUnitsLoading
            ? 'quality.standards.dialog.controlledProtocol.validation.unitsLoading'
            : 'quality.standards.dialog.controlledProtocol.validation.unitsLoadFailed'
        )
      )
      return
    }
    const validationError =
      getControlledProtocolInspectionCriteriaValidationError(
        criteria,
        units
          .filter((unit) => unit.status === 'active')
          .map((unit) => unit.code)
      )
    if (validationError) {
      toast.error(
        t(
          `quality.standards.dialog.controlledProtocol.validation.${validationError}`
        )
      )
      return
    }

    onSubmit?.({
      productId,
      productName: selectedProductLabel,
      criteria: criteria.map((item) => ({
        id: item.id,
        gradingMode: 'DEVIATION_BANDS',
        levels: buildConfigurableInspectionGradeRules(item.grades),
        itemName: item.itemName.trim(),
        inspectionStageId: item.inspectionStageId,
        inspectionStageName: item.inspectionStageName,
        targetWeight: Number(item.targetWeight),
        unit: item.unit.trim(),
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next)
      }}
    >
      <DialogContent
        data-mobile-floating-surface-layout='column'
        size='full'
        showCloseButton={false}
        className='flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-3xl p-0'
      >
        <DialogHeader className='shrink-0 border-b p-5 text-left'>
          <DialogTitle className='flex items-center gap-2 text-lg font-semibold'>
            <Link2 className='size-5 text-primary' />
            {title}
          </DialogTitle>
          <DialogDescription className='text-[13px] leading-5'>
            {t('quality.standards.dialog.controlledProtocol.description')}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5'
        >
          <div className='flex flex-wrap items-end gap-3 rounded-2xl border p-4'>
            <div className='min-w-0 flex-1 basis-64 space-y-2'>
              <Label
                htmlFor='controlled-protocol-product'
                className='control-typography text-muted-foreground'
              >
                {t(
                  'quality.standards.dialog.controlledProtocol.fields.product'
                )}
              </Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger
                  id='controlled-protocol-product'
                  className='h-9 w-full rounded-xl'
                  disabled={readonly || isSubmitting || isProductsLoading}
                >
                  <SelectValue
                    placeholder={t(
                      'quality.standards.dialog.controlledProtocol.placeholders.product'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {productOptions.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {onManageInspectionStages ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full'
                disabled={isSubmitting}
                onClick={onManageInspectionStages}
              >
                <Layers3 className='size-4' />
                {t('quality.standards.inspectionStages.manage')}
              </Button>
            ) : null}
          </div>
          <ControlledProtocolInspectionCriteriaEditor
            criteria={criteria}
            readOnly={readonly || isSubmitting}
            onCriteriaChange={setCriteria}
          />
        </div>
        <DialogFooter className='shrink-0 border-t p-4 sm:p-5'>
          <Button
            type='button'
            variant='outline'
            className='rounded-full'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {readonly
              ? t('quality.standards.dialog.controlledProtocol.actions.close')
              : t('quality.standards.dialog.controlledProtocol.actions.cancel')}
          </Button>
          {!readonly ? (
            <Button
              type='button'
              className='rounded-full'
              disabled={isSubmitting}
              onClick={handleSubmit}
            >
              {t('quality.standards.dialog.controlledProtocol.actions.submit')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
