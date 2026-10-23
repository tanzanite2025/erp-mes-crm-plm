import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import type { ProductType } from '../../data/schema'
import { localizeTemplateDefinitions } from '../../data/template-defaults'
import { useProductCreationGuideSubmissionLock } from '../../hooks/use-product-creation-guide-submission-lock'
import { useProductTypeWriteActions } from '../../hooks/use-product-type-write-actions'
import type { SaveProductTypeInput } from '../../mutation-types'
import {
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
} from '../../query-keys'
import { productTemplateService } from '../../services/product-template-service'
import { ProductTypeService } from '../../services/product-type-service'
import { resolveEffectiveTemplate } from '../../utils/product-template-resolution'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'
import { ProductTypeActionDialog } from '../product-type-action-dialog'
import { ProductCreationGuideBaseModelSelectionAvailabilityNotice } from './product-creation-guide-base-model-selection-availability-notice'
import { ProductCreationGuideBaseModelSelectionStepContent } from './product-creation-guide-base-model-selection-step-content'
import { ProductCreationGuideConfigurationDialog } from './product-creation-guide-configuration-dialog-shell'
import { ProductCreationGuideConfigurationRequestState } from './product-creation-guide-configuration-request-state'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'

export function ProductCreationGuideBaseModelSelectionDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedBaseModelId, setSelectedBaseModelId] = useState(
    props.progress.completedSteps.baseModel?.id ?? ''
  )
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [
    savedCategoryConfirmationMessage,
    setSavedCategoryConfirmationMessage,
  ] = useState<string | null>(null)
  const typesQuery = useQuery({
    queryKey: [...PRODUCT_TYPES_QUERY_KEY, 'options'],
    queryFn: () => ProductTypeService.getProductTypes({ isOptions: true }),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates({ fresh: true }),
  })
  const { saveProductType, isSavingProductType } = useProductTypeWriteActions()
  const selectedTemplateLabel =
    localizeTemplateDefinitions(templatesQuery.data ?? [], t).find(
      (template) => template.id === props.progress.completedSteps.template?.id
    )?.name ??
    props.progress.completedSteps.template?.label ??
    ''
  const types = typesQuery.data ?? []
  const hierarchy = buildProductTypeHierarchyMetaMap(types)
  const baseModels = types.filter(
    (type) =>
      type.active &&
      hierarchy.get(type.id)?.level === 2 &&
      resolveEffectiveTemplate(templatesQuery.data ?? [], {
        productTypes: types,
        typeId: type.id,
      }).template?.id === props.progress.completedSteps.template?.id
  )
  useProductCreationGuideSubmissionLock(
    isConfirming || isSavingProductType,
    props.onBusyChange
  )

  async function confirmProductCreationBaseModel(
    type: ProductType,
    availableTypes = types
  ) {
    const resolution = await ProductTypeService.getTemplateResolution(type.id)
    if (
      resolution.templateResolutionError ||
      resolution.resolvedTemplateId !==
        props.progress.completedSteps.template?.id
    ) {
      return false
    }
    props.onCompleted({
      id: type.id,
      label:
        buildProductTypeHierarchyMetaMap(availableTypes).get(type.id)
          ?.pathLabel ?? type.name,
    })
    return true
  }
  async function confirmExistingProductCreationBaseModel() {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const freshTypes = await ProductTypeService.getProductTypes({
        isOptions: true,
      })
      queryClient.setQueryData(
        [...PRODUCT_TYPES_QUERY_KEY, 'options'],
        freshTypes
      )
      const candidate = freshTypes.find(
        (type) => type.id === selectedBaseModelId && type.active
      )
      if (
        !candidate ||
        buildProductTypeHierarchyMetaMap(freshTypes).get(candidate.id)
          ?.level !== 2
      )
        throw new Error(
          t('engineering.productCreationGuide.baseModelSelectionUnavailable')
        )
      if (!(await confirmProductCreationBaseModel(candidate, freshTypes))) {
        toast.error(t('engineering.productCreationGuide.baseModelMismatch'))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productCreationGuide.loadFailed')
      )
    } finally {
      setIsConfirming(false)
    }
  }
  async function saveProductCreationGuideCategoryOrBaseModel(
    formData: SaveProductTypeInput
  ) {
    setIsConfirming(true)
    try {
      const savedType = await saveProductType({ formData })
      setIsEditorOpen(false)
      setSelectedBaseModelId(savedType.id)
      const updatedTypes = [
        ...(
          queryClient.getQueryData<ProductType[]>([
            ...PRODUCT_TYPES_QUERY_KEY,
            'options',
          ]) ?? types
        ).filter((type) => type.id !== savedType.id),
        savedType,
      ]
      queryClient.setQueryData(
        [...PRODUCT_TYPES_QUERY_KEY, 'options'],
        updatedTypes
      )
      if (
        buildProductTypeHierarchyMetaMap(updatedTypes).get(savedType.id)
          ?.level === 2
      ) {
        let confirmationMessage: string | null = null
        try {
          if (
            !(await confirmProductCreationBaseModel(savedType, updatedTypes))
          ) {
            confirmationMessage = t(
              'engineering.productCreationGuide.savedBaseModelTemplateMismatch'
            )
          }
        } catch (error) {
          confirmationMessage = t(
            'engineering.productCreationGuide.savedBaseModelConfirmationFailed',
            {
              message:
                error instanceof Error
                  ? error.message
                  : t('engineering.productCreationGuide.loadFailed'),
            }
          )
        }
        if (confirmationMessage) {
          setSavedCategoryConfirmationMessage(confirmationMessage)
          toast.error(confirmationMessage)
        }
      }
    } finally {
      setIsConfirming(false)
    }
  }
  if (isEditorOpen)
    return (
      <ProductTypeActionDialog
        open
        wizardHeader={props.wizardHeader}
        initialTemplateId={props.progress.completedSteps.template?.id}
        onOpenChange={(open) => {
          if (!open && !isSavingProductType) setIsEditorOpen(false)
        }}
        onSubmit={saveProductCreationGuideCategoryOrBaseModel}
      />
    )
  return (
    <ProductCreationGuideConfigurationDialog
      {...props}
      disabled={
        !baseModels.some((type) => type.id === selectedBaseModelId) ||
        Boolean(typesQuery.error || templatesQuery.error)
      }
      isConfirming={isConfirming}
      onConfirm={() => void confirmExistingProductCreationBaseModel()}
    >
      <ProductCreationGuideConfigurationRequestState
        isLoading={typesQuery.isPending || templatesQuery.isPending}
        error={typesQuery.error || templatesQuery.error}
        errorDescription={t(
          typesQuery.error
            ? 'engineering.productCreationGuide.baseModelCatalogLoadFailed'
            : 'engineering.productCreationGuide.baseModelTemplateLoadFailed'
        )}
        onRetry={() => {
          void typesQuery.refetch()
          void templatesQuery.refetch()
        }}
      />
      {savedCategoryConfirmationMessage && (
        <p
          role='alert'
          className='text-sm leading-relaxed break-words text-destructive'
        >
          {savedCategoryConfirmationMessage}
        </p>
      )}
      {props.progress.completedSteps.product && (
        <p className='text-xs text-muted-foreground'>
          {t('engineering.productCreationGuide.upstreamChangeHint')}
        </p>
      )}
      <ProductCreationGuideBaseModelSelectionStepContent
        baseModels={baseModels.map((type) => ({
          id: type.id,
          name: type.name,
          pathLabel: hierarchy.get(type.id)?.pathLabel ?? type.name,
        }))}
        selectedBaseModelId={selectedBaseModelId}
        selectedTemplateLabel={selectedTemplateLabel}
        onSelectedBaseModelChange={(value) => {
          setSelectedBaseModelId(value)
          setSavedCategoryConfirmationMessage(null)
        }}
        onCreateBaseModel={() => {
          setSavedCategoryConfirmationMessage(null)
          setIsEditorOpen(true)
        }}
        availabilityNotice={
          typesQuery.isSuccess && templatesQuery.isSuccess ? (
            <ProductCreationGuideBaseModelSelectionAvailabilityNotice
              types={types}
              templates={templatesQuery.data}
              availableBaseModels={baseModels}
              selectedTemplateId={
                props.progress.completedSteps.template?.id ?? ''
              }
              selectedTemplateLabel={selectedTemplateLabel}
              selectedBaseModelId={selectedBaseModelId}
              isRefreshing={typesQuery.isFetching || templatesQuery.isFetching}
              onReload={() => {
                void typesQuery.refetch()
                void templatesQuery.refetch()
              }}
            />
          ) : null
        }
      />
    </ProductCreationGuideConfigurationDialog>
  )
}
