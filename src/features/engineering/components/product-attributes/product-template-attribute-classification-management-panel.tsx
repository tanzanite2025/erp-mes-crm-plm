'use client'

import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { useLanguage } from '@/context/language-provider'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../../data/schema'
import { useProductAttributeCatalogQueries } from '../../hooks/use-product-attribute-catalog-queries'
import { useProductAttributeWriteActions } from '../../hooks/use-product-attribute-write-actions'
import { type SaveProductTemplateAttributeLevelOneCategoryInput } from '../../mutation-types'
import {
  generateProductAttributeCategoryMachineKey,
  resolveProductAttributeCategoryKey,
} from '../../utils/product-attribute-machine-value'
import {
  dropProductAttributeItemToTarget,
  moveProductAttributeItem,
  toProductAttributeOrderedIds,
} from '../../utils/product-attribute-ordering'
import {
  getProductTemplateAttributeLevelOneCategoryName,
  getProductTemplateAttributeLevelTwoOptionLabel,
} from '../../utils/product-attribute-utils'
import { ProductTemplateAttributeCatalogRequestState } from './product-template-attribute-catalog-request-state'
import { ProductTemplateAttributeLevelOneCategoryCard } from './product-template-attribute-level-one-category-card'
import { ProductTemplateAttributeLevelOneCategoryDialog } from './product-template-attribute-level-one-category-dialog'
import { ProductTemplateAttributeLevelTwoOptionCard } from './product-template-attribute-level-two-option-card'
import { ProductTemplateAttributeLevelTwoOptionEditorDialog } from './product-template-attribute-level-two-option-editor-dialog'

const EMPTY_CATEGORY_FORM: SaveProductTemplateAttributeLevelOneCategoryInput = {
  key: '',
  nameZh: '',
  nameEn: '',
  description: '',
  sortOrder: 0,
  active: true,
}

export interface ProductTemplateAttributeClassificationManagementPanelProps {
  initialLevelOneCategoryKey?: string
  onLevelTwoOptionSaved?: (
    option: ProductTemplateAttributeLevelTwoOption
  ) => void
}

export function ProductTemplateAttributeClassificationManagementPanel({
  initialLevelOneCategoryKey = '',
  onLevelTwoOptionSaved,
}: ProductTemplateAttributeClassificationManagementPanelProps) {
  const { locale } = useLanguage()
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(
    initialLevelOneCategoryKey
  )
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [optionDialogOpen, setOptionDialogOpen] = useState(false)
  const [optionEditorCategoryKey, setOptionEditorCategoryKey] = useState('')
  const [currentCategory, setCurrentCategory] =
    useState<SaveProductTemplateAttributeLevelOneCategoryInput>(
      EMPTY_CATEGORY_FORM
    )
  const categoryEditingBaselineRef = useRef<
    ProductTemplateAttributeLevelOneCategory | undefined
  >(undefined)
  const categorySaveInProgressRef = useRef(false)
  const [currentOption, setCurrentOption] = useState<
    ProductTemplateAttributeLevelTwoOption | undefined
  >(undefined)
  const {
    saveCategory,
    deleteCategory,
    reorderCategories,
    deleteOption,
    reorderOptions,
    isReorderingCategories,
    isReorderingOptions,
    isSavingCategory,
  } = useProductAttributeWriteActions()
  const { categories, options, hasLoadedCatalog, isLoading, error, retry } =
    useProductAttributeCatalogQueries()

  const effectiveSelectedCategoryKey = useMemo(() => {
    if (categories.length === 0) return ''
    const resolvedSelectedCategoryKey = resolveProductAttributeCategoryKey(
      categories,
      selectedCategoryKey
    )
    return resolvedSelectedCategoryKey &&
      categories.some((item) => item.key === resolvedSelectedCategoryKey)
      ? resolvedSelectedCategoryKey
      : categories[0].key
  }, [categories, selectedCategoryKey])

  const selectedCategory = useMemo(
    () =>
      categories.find((item) => item.key === effectiveSelectedCategoryKey) ||
      null,
    [categories, effectiveSelectedCategoryKey]
  )

  const filteredOptions = useMemo(() => {
    if (!effectiveSelectedCategoryKey) return []
    return options.filter(
      (item) =>
        resolveProductAttributeCategoryKey(categories, item.categoryKey) ===
        effectiveSelectedCategoryKey
    )
  }, [categories, options, effectiveSelectedCategoryKey])

  const optionCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()

    categories.forEach((category) => {
      counts.set(category.key, 0)
    })

    options.forEach((item) => {
      const resolvedCategoryKey = resolveProductAttributeCategoryKey(
        categories,
        item.categoryKey
      )
      counts.set(
        resolvedCategoryKey,
        (counts.get(resolvedCategoryKey) ?? 0) + 1
      )
    })

    return counts
  }, [categories, options])

  if (isLoading || (error && !hasLoadedCatalog)) {
    return (
      <ProductTemplateAttributeCatalogRequestState
        isLoading={isLoading}
        error={error}
        onRetry={() => void retry()}
      />
    )
  }

  const openCreateLevelOneAttributeCategory = () => {
    categoryEditingBaselineRef.current = undefined
    setCurrentCategory({
      ...EMPTY_CATEGORY_FORM,
      key: generateProductAttributeCategoryMachineKey(),
    })
    setCategoryDialogOpen(true)
  }

  const openEditLevelOneAttributeCategory = (
    row: ProductTemplateAttributeLevelOneCategory
  ) => {
    categoryEditingBaselineRef.current = row
    setCurrentCategory(row)
    setCategoryDialogOpen(true)
  }

  const openCreateLevelTwoAttributeOption = () => {
    if (!effectiveSelectedCategoryKey) {
      toast.error(
        locale === 'zh-CN'
          ? '请先创建并选择一级属性分类'
          : 'Please create and select a level 1 attribute category first'
      )
      return
    }
    setCurrentOption(undefined)
    setOptionEditorCategoryKey(effectiveSelectedCategoryKey)
    setOptionDialogOpen(true)
  }

  const openEditLevelTwoAttributeOption = (
    row: ProductTemplateAttributeLevelTwoOption
  ) => {
    setCurrentOption(row)
    setOptionEditorCategoryKey(row.categoryKey)
    setOptionDialogOpen(true)
  }

  const saveLevelOneAttributeCategoryDraft = async () => {
    if (categorySaveInProgressRef.current) return
    const nextCategory = {
      ...currentCategory,
      nameZh: currentCategory.nameZh?.trim(),
      nameEn: currentCategory.nameEn?.trim(),
      description: currentCategory.description?.trim(),
    }

    if (!nextCategory.nameZh) {
      toast.error(
        locale === 'zh-CN' ? '请填写中文名称' : 'Please enter the Chinese name'
      )
      return
    }

    categorySaveInProgressRef.current = true
    try {
      await saveCategory(nextCategory, categoryEditingBaselineRef.current)
      toast.success(
        locale === 'zh-CN'
          ? '一级属性分类已保存'
          : 'Level 1 attribute category saved'
      )
      setCategoryDialogOpen(false)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : locale === 'zh-CN'
            ? '保存失败'
            : 'Save failed'
      )
    } finally {
      categorySaveInProgressRef.current = false
    }
  }

  const deleteLevelOneAttributeCategory = async (id: string) => {
    if (
      !(await requestApplicationConfirmation(
        locale === 'zh-CN'
          ? '确认删除该一级属性分类及其全部二级属性分类吗？'
          : 'Delete this level 1 attribute category and all its level 2 options?'
      ))
    ) {
      return
    }

    try {
      await deleteCategory(id)
      toast.success(
        locale === 'zh-CN'
          ? '一级属性分类已删除'
          : 'Level 1 attribute category deleted'
      )
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : locale === 'zh-CN'
            ? '删除失败'
            : 'Delete failed'
      )
    }
  }

  const deleteLevelTwoAttributeOption = async (id: string) => {
    if (
      !(await requestApplicationConfirmation(
        locale === 'zh-CN'
          ? '确认删除该二级属性分类吗？'
          : 'Delete this level 2 attribute option?'
      ))
    ) {
      return
    }

    try {
      await deleteOption(id)
      toast.success(
        locale === 'zh-CN'
          ? '二级属性分类已删除'
          : 'Level 2 attribute option deleted'
      )
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : locale === 'zh-CN'
            ? '删除失败'
            : 'Delete failed'
      )
    }
  }

  const saveLevelOneAttributeCategoryOrder = async (
    nextCategories: ProductTemplateAttributeLevelOneCategory[] | null
  ) => {
    if (!nextCategories) return
    try {
      await reorderCategories(toProductAttributeOrderedIds(nextCategories))
      toast.success(
        locale === 'zh-CN'
          ? '一级属性分类显示顺序已保存'
          : 'Level 1 attribute category order saved'
      )
    } catch (reorderError) {
      toast.error(
        reorderError instanceof Error
          ? reorderError.message
          : locale === 'zh-CN'
            ? '排序保存失败'
            : 'Failed to save order'
      )
    }
  }

  const saveLevelTwoAttributeOptionOrder = async (
    nextOptions: ProductTemplateAttributeLevelTwoOption[] | null
  ) => {
    if (!nextOptions || !effectiveSelectedCategoryKey) return
    try {
      await reorderOptions({
        categoryKey: effectiveSelectedCategoryKey,
        ids: toProductAttributeOrderedIds(nextOptions),
      })
      toast.success(
        locale === 'zh-CN'
          ? '二级属性分类显示顺序已保存'
          : 'Level 2 attribute option order saved'
      )
    } catch (reorderError) {
      toast.error(
        reorderError instanceof Error
          ? reorderError.message
          : locale === 'zh-CN'
            ? '排序保存失败'
            : 'Failed to save order'
      )
    }
  }

  return (
    <div className='space-y-6'>
      <ProductTemplateAttributeCatalogRequestState
        isLoading={false}
        error={error}
        onRetry={() => void retry()}
      />
      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <ProductTemplateAttributeLevelOneCategoryCard
          locale={locale}
          categories={categories}
          selectedCategoryKey={effectiveSelectedCategoryKey}
          optionCountByCategory={optionCountByCategory}
          isReordering={isReorderingCategories}
          getLocalizedCategoryName={
            getProductTemplateAttributeLevelOneCategoryName
          }
          onSelectCategory={setSelectedCategoryKey}
          onCreateCategory={openCreateLevelOneAttributeCategory}
          onEditCategory={openEditLevelOneAttributeCategory}
          onDeleteCategory={deleteLevelOneAttributeCategory}
          onMoveCategory={(id, direction) =>
            void saveLevelOneAttributeCategoryOrder(
              moveProductAttributeItem(categories, id, direction)
            )
          }
          onDropCategory={(sourceId, targetId) =>
            void saveLevelOneAttributeCategoryOrder(
              dropProductAttributeItemToTarget(categories, sourceId, targetId)
            )
          }
        />

        <ProductTemplateAttributeLevelTwoOptionCard
          locale={locale}
          selectedCategory={selectedCategory}
          selectedCategoryKey={effectiveSelectedCategoryKey}
          options={filteredOptions}
          isReordering={isReorderingOptions}
          getLocalizedCategoryName={
            getProductTemplateAttributeLevelOneCategoryName
          }
          getLocalizedOptionLabel={
            getProductTemplateAttributeLevelTwoOptionLabel
          }
          onCreateOption={openCreateLevelTwoAttributeOption}
          onEditOption={openEditLevelTwoAttributeOption}
          onDeleteOption={deleteLevelTwoAttributeOption}
          onMoveOption={(id, direction) =>
            void saveLevelTwoAttributeOptionOrder(
              moveProductAttributeItem(filteredOptions, id, direction)
            )
          }
          onDropOption={(sourceId, targetId) =>
            void saveLevelTwoAttributeOptionOrder(
              dropProductAttributeItemToTarget(
                filteredOptions,
                sourceId,
                targetId
              )
            )
          }
        />
      </div>

      <ProductTemplateAttributeLevelOneCategoryDialog
        locale={locale}
        open={categoryDialogOpen}
        category={currentCategory}
        isSaving={isSavingCategory}
        onOpenChange={(nextOpen) => {
          if (!categorySaveInProgressRef.current)
            setCategoryDialogOpen(nextOpen)
        }}
        onCategoryChange={(updater) =>
          setCurrentCategory((prev) => updater(prev))
        }
        onSave={() => void saveLevelOneAttributeCategoryDraft()}
      />

      <ProductTemplateAttributeLevelTwoOptionEditorDialog
        open={optionDialogOpen}
        categoryKey={optionEditorCategoryKey}
        option={currentOption}
        onOpenChange={setOptionDialogOpen}
        onSaved={(savedOption) => {
          setSelectedCategoryKey(savedOption.categoryKey)
          onLevelTwoOptionSaved?.(savedOption)
        }}
      />
    </div>
  )
}
