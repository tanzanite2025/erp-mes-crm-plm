import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getErrorKind, getErrorStatus } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import {
  productTypeSchema,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import { localizeTemplateDefinitions } from '../data/template-defaults'
import { type SaveProductTypeInput } from '../mutation-types'
import { productTemplateService } from '../services/product-template-service'
import { ProductTypeService } from '../services/product-type-service'
import {
  normalizeEngineeringProductTypeCode,
  normalizeProductTypeEntity,
} from '../utils/product-code-normalization'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
} from '../utils/product-type-tree'

const logger = createLogger('ProductTypeActionDialog')

const MAX_PRODUCT_TYPE_LEVEL = 2

const CODE_RULES = [
  { aliases: ['公路', 'road'], code: 'ROAD' },
  { aliases: ['山地', 'mtb'], code: 'MTB' },
  { aliases: ['碎石', '砾石', 'gravel'], code: 'GRAVEL' },
  { aliases: ['真空', 'tubeless'], code: 'TL' },
  { aliases: ['开口', 'clincher'], code: 'CL' },
  { aliases: ['管胎', 'tubular'], code: 'TU' },
  { aliases: ['碳纤维', 'carbon'], code: 'CARBON' },
  { aliases: ['铝合金', 'alu', 'aluminum'], code: 'ALU' },
] as const

type ProductTypeForm = Omit<ProductType, 'parentId' | 'templateId'> & {
  parentId: string
  templateId: string
}

type UseProductTypeDialogFormParams = {
  currentRow?: ProductType
  open: boolean
  onSubmit?: (data: SaveProductTypeInput) => void | Promise<void>
  initialTemplateId?: string
}

export function useProductTypeDialogForm({
  currentRow,
  open,
  onSubmit,
  initialTemplateId,
}: UseProductTypeDialogFormParams) {
  const { t } = useLanguage()
  const isEdit = Boolean(currentRow)
  const [allTypes, setAllTypes] = useState<ProductType[]>([])
  const [allTemplates, setAllTemplates] = useState<ProductTemplate[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [hasCatalogLoadError, setHasCatalogLoadError] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const hasManuallyEditedCategoryCode = useRef(false)

  const form = useForm<ProductTypeForm>({
    resolver: zodResolver(productTypeSchema) as never,
    defaultValues: {
      id: '',
      parentId: '',
      name: '',
      code: '',
      templateId: 'none',
      description: '',
      active: true,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      version: 1,
    },
  })

  const categoryName = form.watch('name')
  const currentCode = form.watch('code')
  const watchedParentId = form.watch('parentId')
  const watchedTemplateId = form.watch('templateId')

  const reloadProductCategoryDialogCatalog = useCallback(async () => {
    setIsCatalogLoading(true)
    setHasCatalogLoadError(false)
    try {
      const [storedTypes, storedTemplates] = await Promise.all([
        ProductTypeService.getProductTypes({ isOptions: true }),
        productTemplateService.getTemplates(),
      ])
      setAllTypes(storedTypes || [])
      setAllTemplates(storedTemplates || [])
    } catch (error) {
      logger.error('Failed to load category dialog data', error)
      setHasCatalogLoadError(true)
    } finally {
      setIsCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    hasManuallyEditedCategoryCode.current = false
    setSubmissionError(null)
    if (isEdit && currentRow) {
      form.reset({
        ...normalizeProductTypeEntity(currentRow),
        parentId: currentRow.parentId || 'root',
        templateId: currentRow.templateId || 'none',
      })
    } else {
      form.reset({
        id: '',
        parentId: 'root',
        name: '',
        code: '',
        templateId: initialTemplateId || 'none',
        description: '',
        active: true,
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        version: 1,
      })
    }
    void reloadProductCategoryDialogCatalog()
  }, [
    currentRow,
    form,
    initialTemplateId,
    isEdit,
    open,
    reloadProductCategoryDialogCatalog,
  ])

  useEffect(() => {
    if (isEdit || !categoryName || hasManuallyEditedCategoryCode.current) return

    const normalizedName = categoryName.toLowerCase()
    const canAutofill =
      !currentCode ||
      ['ROAD', 'MTB', 'GRAVEL'].includes(currentCode) ||
      currentCode.includes('-')

    if (!canAutofill) return

    const tokens = CODE_RULES.flatMap((rule) =>
      rule.aliases.some((alias) => normalizedName.includes(alias))
        ? [rule.code]
        : []
    )

    if (tokens.length > 0) {
      form.setValue(
        'code',
        normalizeEngineeringProductTypeCode(
          Array.from(new Set(tokens)).join('-')
        ),
        {
          shouldValidate: true,
        }
      )
    }
  }, [categoryName, currentCode, form, isEdit])

  const excludedIds = useMemo(() => {
    if (!isEdit || !currentRow) return new Set<string>()

    const collected = new Set<string>([currentRow.id])

    const findChildrenRecursive = (parentId: string) => {
      allTypes.forEach((type) => {
        if (type.parentId !== parentId) return
        collected.add(type.id)
        findChildrenRecursive(type.id)
      })
    }

    findChildrenRecursive(currentRow.id)
    return collected
  }, [allTypes, currentRow, isEdit])

  const orderedTypes = useMemo(
    () => buildOrderedProductTypes(allTypes, true),
    [allTypes]
  )
  const hierarchyMetaMap = useMemo(
    () => buildProductTypeHierarchyMetaMap(allTypes, true),
    [allTypes]
  )
  const currentSubtreeHeight = currentRow
    ? (hierarchyMetaMap.get(currentRow.id)?.subtreeHeight ?? 0)
    : 0

  const selectableParents = useMemo(() => {
    const allowed = orderedTypes.filter((type) => {
      if (excludedIds.has(type.id)) return false

      const meta = hierarchyMetaMap.get(type.id)
      if (!meta) return false

      return meta.level + 1 + currentSubtreeHeight <= MAX_PRODUCT_TYPE_LEVEL
    })

    if (!isEdit || !currentRow?.parentId) {
      return allowed
    }

    const currentParent = orderedTypes.find(
      (type) => type.id === currentRow.parentId
    )
    if (
      !currentParent ||
      allowed.some((type) => type.id === currentParent.id)
    ) {
      return allowed
    }

    return [...allowed, currentParent]
  }, [
    currentRow?.parentId,
    currentSubtreeHeight,
    excludedIds,
    hierarchyMetaMap,
    isEdit,
    orderedTypes,
  ])

  const localizedTemplates = useMemo(
    () => localizeTemplateDefinitions(allTemplates, t),
    [allTemplates, t]
  )

  const resolveLevelLabel = useCallback(
    (level: number) => {
      if (level <= 0) return t('engineering.categoryArchive.labels.level1')
      if (level === 1) return t('engineering.categoryArchive.labels.level2')
      return t('engineering.categoryArchive.labels.level3')
    },
    [t]
  )

  const selectedParentMeta = useMemo(() => {
    if (!watchedParentId || watchedParentId === 'root') return null
    return hierarchyMetaMap.get(watchedParentId) || null
  }, [hierarchyMetaMap, watchedParentId])

  const targetLevel = selectedParentMeta ? selectedParentMeta.level + 1 : 0
  const targetLevelLabel = resolveLevelLabel(targetLevel)
  const parentPathLabel =
    selectedParentMeta?.pathLabel ||
    t('engineering.categoryArchive.dialog.parentNone')
  const parentItems = useMemo(
    () => [
      {
        label: t('engineering.categoryArchive.dialog.parentNone'),
        value: 'root',
      },
      ...selectableParents.map((type) => {
        const meta = hierarchyMetaMap.get(type.id)
        const levelLabel = resolveLevelLabel(meta?.level ?? 0)
        const pathLabel = meta?.pathLabel || type.name
        return {
          label: `${levelLabel} · ${pathLabel}`,
          value: type.id,
        }
      }),
    ],
    [hierarchyMetaMap, resolveLevelLabel, selectableParents, t]
  )
  const hierarchyHint =
    targetLevel <= 0
      ? t('engineering.categoryArchive.dialog.levelHintTop')
      : targetLevel === 1
        ? t('engineering.categoryArchive.dialog.levelHintMiddle')
        : t('engineering.categoryArchive.dialog.levelHintLeaf')

  const selectedTemplate = useMemo(() => {
    if (!watchedTemplateId || watchedTemplateId === 'none') return null
    return (
      allTemplates.find((template) => template.id === watchedTemplateId) || null
    )
  }, [allTemplates, watchedTemplateId])

  const templateAssembly = useMemo(
    () =>
      [...(selectedTemplate?.attributeBindings ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [selectedTemplate]
  )

  const handleFormSubmit = async (values: ProductTypeForm) => {
    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      const parentLevel =
        values.parentId === 'root'
          ? -1
          : (hierarchyMetaMap.get(values.parentId)?.level ?? -1)
      const nextTargetLevel = parentLevel + 1

      if (nextTargetLevel + currentSubtreeHeight > MAX_PRODUCT_TYPE_LEVEL) {
        form.setError('parentId', {
          type: 'manual',
          message: t('engineering.categoryArchive.dialog.levelLimitError'),
        })
        setSubmissionError(
          t('engineering.categoryArchive.dialog.levelLimitError')
        )
        return
      }

      const submissionData: SaveProductTypeInput = {
        ...normalizeProductTypeEntity(values),
        id: values.id || currentRow?.id,
        createdAt:
          values.createdAt || currentRow?.createdAt || new Date().toISOString(),
        parentId:
          values.parentId === 'root' ? undefined : values.parentId || undefined,
        templateId:
          values.templateId === 'none'
            ? undefined
            : values.templateId || undefined,
      }

      if (onSubmit) {
        await onSubmit(submissionData)
      }
    } catch (error) {
      logger.error('Failed to save product category or base model', error)
      const status = getErrorStatus(error)
      const kind = getErrorKind(error)
      const message = error instanceof Error ? error.message : ''
      if (status === 403) {
        setSubmissionError(
          t(
            /csrf/i.test(message)
              ? 'engineering.categoryArchive.dialog.saveCsrfRejected'
              : 'engineering.categoryArchive.dialog.savePermissionDenied'
          )
        )
      } else if (
        /idx_product_types_code|product_types_code_key/i.test(message) &&
        /duplicate|unique|23505/i.test(message)
      ) {
        setSubmissionError(
          t('engineering.categoryArchive.dialog.saveDuplicateCode')
        )
      } else if (status === 409) {
        setSubmissionError(t('engineering.categoryArchive.toasts.conflict'))
      } else if (
        kind === 'network' ||
        kind === 'timeout' ||
        kind === 'invalid_response' ||
        error instanceof SyntaxError
      ) {
        setSubmissionError(
          t('engineering.categoryArchive.dialog.saveResultUncertain')
        )
      } else {
        setSubmissionError(
          t('engineering.categoryArchive.toasts.saveFailed', {
            message:
              message ||
              t('engineering.categoryArchive.dialog.saveErrorUnknown'),
          })
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function markCategoryCodeAsManuallyEdited() {
    hasManuallyEditedCategoryCode.current = true
  }

  const handleFormValidationFailure = (
    errors: FieldErrors<ProductTypeForm>
  ) => {
    setSubmissionError(
      t(
        errors.name || errors.code
          ? 'engineering.categoryArchive.dialog.requiredFieldsMissing'
          : 'engineering.categoryArchive.dialog.validationFailed'
      )
    )
  }

  return {
    form,
    isEdit,
    isSubmitting,
    submissionError,
    handleFormSubmit,
    handleFormValidationFailure,
    parentItems,
    targetLevelLabel,
    selectedParentMeta,
    parentPathLabel,
    hierarchyHint,
    isCatalogLoading,
    hasCatalogLoadError,
    reloadProductCategoryDialogCatalog,
    markCategoryCodeAsManuallyEdited,
    localizedTemplates,
    selectedTemplate,
    templateAssembly,
  }
}

export type ProductTypeDialogFormState = ReturnType<
  typeof useProductTypeDialogForm
>
