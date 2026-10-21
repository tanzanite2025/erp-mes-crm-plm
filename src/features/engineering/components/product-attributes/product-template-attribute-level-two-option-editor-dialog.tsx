import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type ProductTemplateAttributeLevelTwoOption } from '../../data/schema'
import { useProductAttributeCatalogQueries } from '../../hooks/use-product-attribute-catalog-queries'
import { useProductAttributeWriteActions } from '../../hooks/use-product-attribute-write-actions'
import { type SaveProductTemplateAttributeLevelTwoOptionInput } from '../../mutation-types'
import {
  buildProductAttributeOptionSaveInput,
  generateProductAttributeOptionMachineValue,
  resolveProductAttributeCategoryKey,
} from '../../utils/product-attribute-machine-value'
import { getProductTemplateAttributeLevelOneCategoryName } from '../../utils/product-attribute-utils'
import { ProductTemplateAttributeCatalogRequestState } from './product-template-attribute-catalog-request-state'
import { ProductTemplateAttributeLevelTwoOptionDialog } from './product-template-attribute-level-two-option-dialog'

export interface ProductTemplateAttributeLevelTwoOptionEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The parent level 1 product template attribute category key; preselected and locked when supplied. */
  categoryKey?: string
  /** Supply a level 2 product template attribute option to edit while retaining its internal value. */
  option?: ProductTemplateAttributeLevelTwoOption
  /** Runs after persistence and shared query invalidation have completed. */
  onSaved?: (option: ProductTemplateAttributeLevelTwoOption) => void
}

export function ProductTemplateAttributeLevelTwoOptionEditorDialog(
  props: ProductTemplateAttributeLevelTwoOptionEditorDialogProps
) {
  if (!props.open) return null
  return (
    <ProductTemplateAttributeLevelTwoOptionEditorDialogSession
      key={props.option?.id ?? props.categoryKey ?? 'new-option'}
      {...props}
    />
  )
}

function ProductTemplateAttributeLevelTwoOptionEditorDialogSession({
  onOpenChange,
  categoryKey,
  option,
  onSaved,
}: ProductTemplateAttributeLevelTwoOptionEditorDialogProps) {
  const { locale } = useLanguage()
  const isZh = locale === 'zh-CN'
  const { categories, isLoading, error, retry } =
    useProductAttributeCatalogQueries({ includeOptions: false })
  const { saveOption, isSavingOption } = useProductAttributeWriteActions()
  const saveInProgressRef = useRef(false)
  const [editingBaseline] = useState(option)
  const [draft, setDraft] =
    useState<SaveProductTemplateAttributeLevelTwoOptionInput>(() =>
      option
        ? { ...option }
        : {
            categoryKey: categoryKey ?? '',
            value: generateProductAttributeOptionMachineValue(),
            labelZh: '',
            labelEn: '',
            description: '',
            sortOrder: 0,
            active: true,
          }
    )
  const resolvedCategoryKey = resolveProductAttributeCategoryKey(
    categories,
    draft.categoryKey || categories[0]?.key || ''
  )
  const hasValidCategory = categories.some(
    (category) => category.key === resolvedCategoryKey
  )

  useEffect(() => {
    if (!draft.categoryKey && categories[0]) {
      const initialLevelOneCategoryKey = categories[0].key
      setDraft((currentDraft) =>
        currentDraft.categoryKey
          ? currentDraft
          : { ...currentDraft, categoryKey: initialLevelOneCategoryKey }
      )
    }
  }, [categories, draft.categoryKey])

  function handleProductTemplateAttributeLevelTwoOptionEditorOpenChange(
    nextOpen: boolean
  ) {
    if (!saveInProgressRef.current) onOpenChange(nextOpen)
  }

  async function saveProductTemplateAttributeLevelTwoOptionEditorDraft() {
    if (saveInProgressRef.current || isLoading || error) return
    if (!hasValidCategory) {
      toast.error(
        isZh
          ? '请选择有效的一级属性分类'
          : 'Please select a valid level 1 attribute category'
      )
      return
    }
    const nextOption = buildProductAttributeOptionSaveInput({
      ...draft,
      categoryKey: resolvedCategoryKey,
    })
    if (!nextOption.labelZh) {
      toast.error(isZh ? '中文名称为必填项' : 'Chinese label is required')
      return
    }

    saveInProgressRef.current = true
    let savedOption: ProductTemplateAttributeLevelTwoOption
    try {
      savedOption = await saveOption(nextOption, editingBaseline)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : isZh
            ? '保存失败'
            : 'Save failed'
      )
      return
    } finally {
      saveInProgressRef.current = false
    }

    toast.success(
      isZh ? '二级属性分类已保存' : 'Level 2 attribute option saved'
    )
    onOpenChange(false)
    onSaved?.(savedOption)
  }

  return (
    <ProductTemplateAttributeLevelTwoOptionDialog
      locale={locale}
      open
      option={{
        ...draft,
        categoryKey: hasValidCategory ? resolvedCategoryKey : '',
      }}
      categories={categories}
      categoryLocked={Boolean(categoryKey || option)}
      isSaving={isSavingOption}
      isCatalogReady={!isLoading && !error && hasValidCategory}
      catalogRequestState={
        <>
          <ProductTemplateAttributeCatalogRequestState
            isLoading={isLoading}
            error={error}
            onRetry={() => void retry()}
          />
          {!isLoading && !error && categories.length === 0 && (
            <p role='status' className='text-sm text-muted-foreground'>
              {isZh
                ? '暂无一级属性分类，请先在产品模板属性分类管理中新增一级属性分类。'
                : 'No level 1 attribute categories are available. Create one in Product Template Attribute Category Management first.'}
            </p>
          )}
          {!isLoading &&
            !error &&
            categories.length > 0 &&
            !hasValidCategory && (
              <p role='alert' className='text-sm text-destructive'>
                {isZh
                  ? '当前一级属性分类不存在，请关闭后重新选择一级属性分类。'
                  : 'This level 1 attribute category no longer exists. Close the dialog and select another level 1 attribute category.'}
              </p>
            )}
        </>
      }
      getLocalizedCategoryName={getProductTemplateAttributeLevelOneCategoryName}
      onOpenChange={
        handleProductTemplateAttributeLevelTwoOptionEditorOpenChange
      }
      onOptionChange={setDraft}
      onSave={() =>
        void saveProductTemplateAttributeLevelTwoOptionEditorDraft()
      }
    />
  )
}
