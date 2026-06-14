'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { ForbiddenState } from '@/components/forbidden-state'
import { ProductAttributeCategoryCard } from '../components/product-attributes/product-attribute-category-card'
import { ProductAttributeCategoryDialog } from '../components/product-attributes/product-attribute-category-dialog'
import { ProductAttributeOptionCard } from '../components/product-attributes/product-attribute-option-card'
import { ProductAttributeOptionDialog } from '../components/product-attributes/product-attribute-option-dialog'
import { ProductAttributeSummaryGrid } from '../components/product-attributes/product-attribute-summary-grid'
import { ProductAttributesHeader } from '../components/product-attributes/product-attributes-header'
import {
  type ProductAttributeCategory,
  type ProductAttributeOption,
} from '../data/schema'
import { useProductAttributeWriteActions } from '../hooks/use-product-attribute-write-actions'
import {
  type SaveProductAttributeCategoryInput,
  type SaveProductAttributeOptionInput,
} from '../mutation-types'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import {
  getProductAttributeMachineValueFormatHint,
  isValidProductAttributeMachineValue,
  normalizeProductAttributeMachineValue,
  resolveProductAttributeCategoryKey,
} from '../utils/product-attribute-machine-value'
import {
  dropProductAttributeItemToTarget,
  moveProductAttributeItem,
  toProductAttributeOrderedIds,
} from '../utils/product-attribute-ordering'

const EMPTY_CATEGORY_FORM: SaveProductAttributeCategoryInput = {
  key: '',
  nameZh: '',
  nameEn: '',
  description: '',
  sortOrder: 0,
  active: true,
}

const EMPTY_OPTION_FORM: SaveProductAttributeOptionInput = {
  categoryKey: '',
  value: '',
  labelZh: '',
  labelEn: '',
  description: '',
  sortOrder: 0,
  active: true,
}

function getLocalizedCategoryName(
  locale: string,
  category: Pick<ProductAttributeCategory, 'key' | 'nameZh' | 'nameEn'>
): string {
  if (locale === 'en-US') {
    return category.nameEn?.trim() || category.nameZh || category.key || ''
  }
  return category.nameZh || category.nameEn || category.key || ''
}

function getLocalizedOptionLabel(
  locale: string,
  option: Pick<ProductAttributeOption, 'value' | 'labelZh' | 'labelEn'>
): string {
  if (locale === 'en-US') {
    return option.labelEn?.trim() || option.labelZh || option.value || ''
  }
  return option.labelZh || option.labelEn || option.value || ''
}

export function ProductAttributesMgmt() {
  const { locale } = useLanguage()
  const [selectedCategoryKey, setSelectedCategoryKey] = useState('')
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [optionDialogOpen, setOptionDialogOpen] = useState(false)
  const [currentCategory, setCurrentCategory] =
    useState<SaveProductAttributeCategoryInput>(EMPTY_CATEGORY_FORM)
  const [currentOption, setCurrentOption] =
    useState<SaveProductAttributeOptionInput>(EMPTY_OPTION_FORM)
  const {
    saveCategory,
    deleteCategory,
    reorderCategories,
    saveOption,
    deleteOption,
    reorderOptions,
    isReorderingCategories,
    isReorderingOptions,
  } = useProductAttributeWriteActions()
  const categoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories(),
  })
  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions(),
  })
  if (categoriesQuery.isSuccess && !categoriesQuery.data)
    throw new Error('[CRITICAL] Categories Data missing')
  if (optionsQuery.isSuccess && !optionsQuery.data)
    throw new Error('[CRITICAL] Options Data missing')

  const categories = categoriesQuery.data || []
  const options = optionsQuery.data || []
  const error = categoriesQuery.error ?? optionsQuery.error

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

  const groupedCounts = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      count: optionCountByCategory.get(category.key) ?? 0,
    }))
  }, [categories, optionCountByCategory])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const openCreateCategory = () => {
    setCurrentCategory(EMPTY_CATEGORY_FORM)
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (row: ProductAttributeCategory) => {
    setCurrentCategory(row)
    setCategoryDialogOpen(true)
  }

  const openCreateOption = () => {
    if (!effectiveSelectedCategoryKey) {
      toast.error(
        locale === 'zh-CN'
          ? '请先创建并选择分类'
          : 'Please create and select a category first'
      )
      return
    }
    setCurrentOption({
      ...EMPTY_OPTION_FORM,
      categoryKey: effectiveSelectedCategoryKey,
    })
    setOptionDialogOpen(true)
  }

  const openEditOption = (row: ProductAttributeOption) => {
    setCurrentOption({
      ...row,
      categoryKey: resolveProductAttributeCategoryKey(
        categories,
        row.categoryKey
      ),
    })
    setOptionDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    const nextCategory = {
      ...currentCategory,
      key: normalizeProductAttributeMachineValue(currentCategory.key || ''),
      nameZh: currentCategory.nameZh?.trim(),
      nameEn: currentCategory.nameEn?.trim(),
      description: currentCategory.description?.trim(),
    }

    if (!nextCategory.key || !nextCategory.nameZh) {
      toast.error(
        locale === 'zh-CN'
          ? '分类编码和中文名称为必填项'
          : 'Category key and Chinese name are required'
      )
      return
    }

    if (!isValidProductAttributeMachineValue(nextCategory.key)) {
      toast.error(getProductAttributeMachineValueFormatHint(locale))
      return
    }

    try {
      await saveCategory(nextCategory)
      toast.success(
        locale === 'zh-CN'
          ? '产品属性分类已保存'
          : 'Product attribute category saved'
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
    }
  }

  const handleSaveOption = async () => {
    const resolvedCategoryKey = resolveProductAttributeCategoryKey(
      categories,
      currentOption.categoryKey
    )
    const nextOption = {
      ...currentOption,
      categoryKey: resolvedCategoryKey.trim(),
      value: normalizeProductAttributeMachineValue(currentOption.value || ''),
      labelZh: currentOption.labelZh?.trim(),
      labelEn: currentOption.labelEn?.trim(),
      description: currentOption.description?.trim(),
    }

    if (!nextOption.categoryKey || !nextOption.value || !nextOption.labelZh) {
      toast.error(
        locale === 'zh-CN'
          ? '分类、值和中文名称为必填项'
          : 'Category, value and Chinese label are required'
      )
      return
    }

    if (!isValidProductAttributeMachineValue(nextOption.value)) {
      toast.error(getProductAttributeMachineValueFormatHint(locale))
      return
    }

    try {
      await saveOption(nextOption)
      toast.success(
        locale === 'zh-CN'
          ? '产品属性项已保存'
          : 'Product attribute option saved'
      )
      setOptionDialogOpen(false)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : locale === 'zh-CN'
            ? '保存失败'
            : 'Save failed'
      )
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (
      !window.confirm(
        locale === 'zh-CN'
          ? '确认删除该分类及其分类项吗？'
          : 'Delete this category and its options?'
      )
    ) {
      return
    }

    try {
      await deleteCategory(id)
      toast.success(
        locale === 'zh-CN'
          ? '产品属性分类已删除'
          : 'Product attribute category deleted'
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

  const handleDeleteOption = async (id: string) => {
    if (
      !window.confirm(
        locale === 'zh-CN'
          ? '确认删除该产品属性项吗？'
          : 'Delete this product attribute option?'
      )
    ) {
      return
    }

    try {
      await deleteOption(id)
      toast.success(
        locale === 'zh-CN'
          ? '产品属性项已删除'
          : 'Product attribute option deleted'
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

  const saveCategoryOrder = async (
    nextCategories: ProductAttributeCategory[] | null
  ) => {
    if (!nextCategories) return
    try {
      await reorderCategories(toProductAttributeOrderedIds(nextCategories))
      toast.success(
        locale === 'zh-CN' ? '分类显示顺序已保存' : 'Category order saved'
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

  const saveOptionOrder = async (
    nextOptions: ProductAttributeOption[] | null
  ) => {
    if (!nextOptions || !effectiveSelectedCategoryKey) return
    try {
      await reorderOptions({
        categoryKey: effectiveSelectedCategoryKey,
        ids: toProductAttributeOrderedIds(nextOptions),
      })
      toast.success(
        locale === 'zh-CN' ? '分类项显示顺序已保存' : 'Option order saved'
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <ProductAttributesHeader locale={locale} />

      <ProductAttributeSummaryGrid
        categories={groupedCounts}
        selectedCategoryKey={effectiveSelectedCategoryKey}
        locale={locale}
        getLocalizedCategoryName={getLocalizedCategoryName}
        onSelectCategory={setSelectedCategoryKey}
      />

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1.6fr]'>
        <ProductAttributeCategoryCard
          locale={locale}
          categories={categories}
          isReordering={isReorderingCategories}
          getLocalizedCategoryName={getLocalizedCategoryName}
          onCreateCategory={openCreateCategory}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onMoveCategory={(id, direction) =>
            void saveCategoryOrder(
              moveProductAttributeItem(categories, id, direction)
            )
          }
          onDropCategory={(sourceId, targetId) =>
            void saveCategoryOrder(
              dropProductAttributeItemToTarget(categories, sourceId, targetId)
            )
          }
        />

        <ProductAttributeOptionCard
          locale={locale}
          selectedCategory={selectedCategory}
          selectedCategoryKey={effectiveSelectedCategoryKey}
          options={filteredOptions}
          isReordering={isReorderingOptions}
          getLocalizedCategoryName={getLocalizedCategoryName}
          getLocalizedOptionLabel={getLocalizedOptionLabel}
          onCreateOption={openCreateOption}
          onEditOption={openEditOption}
          onDeleteOption={handleDeleteOption}
          onMoveOption={(id, direction) =>
            void saveOptionOrder(
              moveProductAttributeItem(filteredOptions, id, direction)
            )
          }
          onDropOption={(sourceId, targetId) =>
            void saveOptionOrder(
              dropProductAttributeItemToTarget(
                filteredOptions,
                sourceId,
                targetId
              )
            )
          }
        />
      </div>

      <ProductAttributeCategoryDialog
        locale={locale}
        open={categoryDialogOpen}
        category={currentCategory}
        onOpenChange={setCategoryDialogOpen}
        onCategoryChange={(updater) =>
          setCurrentCategory((prev) => updater(prev))
        }
        onSave={() => void handleSaveCategory()}
      />

      <ProductAttributeOptionDialog
        locale={locale}
        open={optionDialogOpen}
        option={currentOption}
        categories={categories}
        getLocalizedCategoryName={getLocalizedCategoryName}
        onOpenChange={setOptionDialogOpen}
        onOptionChange={(updater) => setCurrentOption((prev) => updater(prev))}
        onSave={() => void handleSaveOption()}
      />
    </div>
  )
}
