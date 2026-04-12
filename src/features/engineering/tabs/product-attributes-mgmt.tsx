'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { ProductAttributeCategoryCard } from '../components/product-attributes/product-attribute-category-card'
import { ProductAttributeCategoryDialog } from '../components/product-attributes/product-attribute-category-dialog'
import { ProductAttributeOptionCard } from '../components/product-attributes/product-attribute-option-card'
import { ProductAttributeOptionDialog } from '../components/product-attributes/product-attribute-option-dialog'
import { ProductAttributeSummaryGrid } from '../components/product-attributes/product-attribute-summary-grid'
import { ProductAttributesHeader } from '../components/product-attributes/product-attributes-header'
import { type ProductAttributeCategory, type ProductAttributeOption } from '../data/schema'
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
  buildProductAttributeCategorySaveInput,
  buildProductAttributeOptionSaveInput,
  findProductAttributeMachineValueConflict,
  findProductAttributeOptionConflictInCategory,
  getProductAttributeMachineValueFormatHint,
  isValidProductAttributeMachineValue,
  normalizeProductAttributeMachineValue,
  normalizeProductAttributeCategoryInputKey,
  normalizeProductAttributeOptionInputValue,
} from '../utils/product-attribute-machine-value'

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

function getLocalizedCategoryName(locale: string, category: Pick<ProductAttributeCategory, 'key' | 'nameZh' | 'nameEn'>): string {
  if (locale === 'en-US') {
    return category.nameEn?.trim() || category.nameZh || category.key || ''
  }
  return category.nameZh || category.nameEn || category.key || ''
}

function getLocalizedOptionLabel(locale: string, option: Pick<ProductAttributeOption, 'value' | 'labelZh' | 'labelEn'>): string {
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
  const [currentCategory, setCurrentCategory] = useState<SaveProductAttributeCategoryInput>(EMPTY_CATEGORY_FORM)
  const [currentOption, setCurrentOption] = useState<SaveProductAttributeOptionInput>(EMPTY_OPTION_FORM)
  const { saveCategory, deleteCategory, saveOption, deleteOption } = useProductAttributeWriteActions()
  const categoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories(),
  })
  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions(),
  })
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])
  const error = categoriesQuery.error ?? optionsQuery.error

  const effectiveSelectedCategoryKey = useMemo(() => {
    if (categories.length === 0) return ''
    return selectedCategoryKey && categories.some((item) => item.key === selectedCategoryKey)
      ? selectedCategoryKey
      : categories[0].key
  }, [categories, selectedCategoryKey])

  const selectedCategory = useMemo(
    () => categories.find((item) => item.key === effectiveSelectedCategoryKey) || null,
    [categories, effectiveSelectedCategoryKey]
  )

  const filteredOptions = useMemo(() => {
    if (!effectiveSelectedCategoryKey) return []
    return options.filter((item) => item.categoryKey === effectiveSelectedCategoryKey)
  }, [options, effectiveSelectedCategoryKey])

  const optionCountByCategory = useMemo(() => {
    const counts = new Map<string, number>()

    options.forEach((item) => {
      counts.set(item.categoryKey, (counts.get(item.categoryKey) ?? 0) + 1)
    })

    return counts
  }, [options])

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
    setCurrentCategory(normalizeProductAttributeCategoryInputKey(EMPTY_CATEGORY_FORM))
    setCategoryDialogOpen(true)
  }

  const openEditCategory = (row: ProductAttributeCategory) => {
    setCurrentCategory(row)
    setCategoryDialogOpen(true)
  }

  const openCreateOption = () => {
    if (!effectiveSelectedCategoryKey) {
      toast.error(locale === 'zh-CN' ? '请先创建并选择分类' : 'Please create and select a category first')
      return
    }
    setCurrentOption(normalizeProductAttributeOptionInputValue({ ...EMPTY_OPTION_FORM, categoryKey: effectiveSelectedCategoryKey }))
    setOptionDialogOpen(true)
  }

  const openEditOption = (row: ProductAttributeOption) => {
    setCurrentOption(row)
    setOptionDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    const normalizedKey = normalizeProductAttributeMachineValue(currentCategory.key || '')

    if (!normalizedKey || !currentCategory.nameZh) {
      toast.error(locale === 'zh-CN' ? '分类编码和中文名称为必填项' : 'Category key and Chinese name are required')
      return
    }

    if (!isValidProductAttributeMachineValue(normalizedKey)) {
      toast.error(getProductAttributeMachineValueFormatHint(locale))
      return
    }

    const categoryConflict = findProductAttributeMachineValueConflict(
      categories,
      normalizedKey,
      (item) => item.key,
      currentCategory.id
    )
    if (categoryConflict) {
      toast.error(locale === 'zh-CN' ? '分类编码重复，请使用新的机器值' : 'Category key already exists. Please use a different machine value.')
      return
    }

    const nextCategory = buildProductAttributeCategorySaveInput({
      ...currentCategory,
      key: currentCategory.id ? currentCategory.key : normalizedKey,
    })

    try {
      await saveCategory(nextCategory)
      toast.success(locale === 'zh-CN' ? '产品属性分类已保存' : 'Product attribute category saved')
      setCategoryDialogOpen(false)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : locale === 'zh-CN' ? '保存失败' : 'Save failed')
    }
  }

  const handleSaveOption = async () => {
    const normalizedValue = normalizeProductAttributeMachineValue(currentOption.value || '')

    if (!currentOption.categoryKey || !normalizedValue || !currentOption.labelZh) {
      toast.error(locale === 'zh-CN' ? '分类、值和中文名称为必填项' : 'Category, value and Chinese label are required')
      return
    }

    if (!isValidProductAttributeMachineValue(normalizedValue)) {
      toast.error(getProductAttributeMachineValueFormatHint(locale))
      return
    }

    const optionConflict = findProductAttributeOptionConflictInCategory(
      options,
      currentOption.categoryKey,
      normalizedValue,
      currentOption.id
    )
    if (optionConflict) {
      toast.error(locale === 'zh-CN' ? '该分类下的分类项值重复，请使用新的机器值' : 'Option value already exists in this category. Please use a different machine value.')
      return
    }

    const nextOption = buildProductAttributeOptionSaveInput({
      ...currentOption,
      categoryKey: currentOption.categoryKey,
      value: currentOption.id ? currentOption.value : normalizedValue,
    })

    try {
      await saveOption(nextOption)
      toast.success(locale === 'zh-CN' ? '产品属性项已保存' : 'Product attribute option saved')
      setOptionDialogOpen(false)
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : locale === 'zh-CN' ? '保存失败' : 'Save failed')
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(locale === 'zh-CN' ? '确认删除该分类及其分类项吗？' : 'Delete this category and its options?')) {
      return
    }

    try {
      await deleteCategory(id)
      toast.success(locale === 'zh-CN' ? '产品属性分类已删除' : 'Product attribute category deleted')
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : locale === 'zh-CN' ? '删除失败' : 'Delete failed')
    }
  }

  const handleDeleteOption = async (id: string) => {
    if (!window.confirm(locale === 'zh-CN' ? '确认删除该产品属性项吗？' : 'Delete this product attribute option?')) {
      return
    }

    try {
      await deleteOption(id)
      toast.success(locale === 'zh-CN' ? '产品属性项已删除' : 'Product attribute option deleted')
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : locale === 'zh-CN' ? '删除失败' : 'Delete failed')
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
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
          getLocalizedCategoryName={getLocalizedCategoryName}
          onCreateCategory={openCreateCategory}
          onEditCategory={openEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <ProductAttributeOptionCard
          locale={locale}
          selectedCategory={selectedCategory}
          selectedCategoryKey={selectedCategoryKey}
          options={filteredOptions}
          getLocalizedCategoryName={getLocalizedCategoryName}
          getLocalizedOptionLabel={getLocalizedOptionLabel}
          onCreateOption={openCreateOption}
          onEditOption={openEditOption}
          onDeleteOption={handleDeleteOption}
        />
      </div>

      <ProductAttributeCategoryDialog
        locale={locale}
        open={categoryDialogOpen}
        category={currentCategory}
        onOpenChange={setCategoryDialogOpen}
        onCategoryChange={(updater) => setCurrentCategory((prev) => updater(prev))}
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
