import { useEffect, useRef, useState } from 'react'
import { Gauge, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getProductTemplateAttributeLevelTwoOptionLabel } from '@/features/engineering/utils/product-attribute-utils'
import { useBOMPerformanceVersionOptions } from '../../hooks/use-bom-performance-version-options'
import {
  type BOMPerformanceVersionOption,
  type SaveBOMPerformanceVersionOptionInput,
} from '../../services/bom-performance-version-option-service'
import { formatBOMProductPerformanceVersionWeight } from '../../utils/bom-product-performance-version-weight-comparison'
import { BOMPerformanceVersionOptionInlineEditor } from './bom-performance-version-option-inline-editor'
import {
  bomPerformanceVersionOptionInlineEditorStyles as editorStyles,
  bomPerformanceVersionOptionManagementDialogClasses as dialogClasses,
} from './bom-performance-version-option-management-dialog-and-inline-editor.styles'
import {
  BOMProductPerformanceVersionWeightEditor,
  type BOMProductPerformanceVersionWeightEditorContext,
} from './bom-product-performance-version-weight-editor'

interface BOMPerformanceVersionOptionManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productWeightContext?: BOMProductPerformanceVersionWeightEditorContext
}

interface BOMPerformanceVersionOptionEditorState {
  option?: BOMPerformanceVersionOption
  draft: SaveBOMPerformanceVersionOptionInput
}

function createEmptyBOMPerformanceVersionOptionDraft(): SaveBOMPerformanceVersionOptionInput {
  return {
    value: `performance-${globalThis.crypto.randomUUID().replace(/-/g, '')}`,
    labelZh: '',
    labelEn: '',
    description: '',
    sortOrder: 0,
    active: true,
  }
}

export function BOMPerformanceVersionOptionManagementDialog(
  props: BOMPerformanceVersionOptionManagementDialogProps
) {
  if (!props.open) return null
  return <BOMPerformanceVersionOptionManagementDialogSession {...props} />
}

function BOMPerformanceVersionOptionManagementDialogSession({
  open,
  onOpenChange,
  productWeightContext,
}: BOMPerformanceVersionOptionManagementDialogProps) {
  const { locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const {
    options,
    isLoading,
    error,
    retry,
    saveOption,
    deleteOption,
    isSavingOption,
    isDeletingOption,
  } = useBOMPerformanceVersionOptions()
  const [initialNewDraft] = useState(
    createEmptyBOMPerformanceVersionOptionDraft
  )
  const [editor, setEditor] = useState<BOMPerformanceVersionOptionEditorState>()
  const mutationInProgressRef = useRef(false)
  const successfulSaveCloseTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [isClosingAfterSuccessfulSave, setIsClosingAfterSuccessfulSave] =
    useState(false)
  useEffect(
    () => () => {
      if (successfulSaveCloseTimerRef.current !== null) {
        clearTimeout(successfulSaveCloseTimerRef.current)
      }
    },
    []
  )
  const selectedOption = editor
    ? editor.option
    : (options.find(
        (option) =>
          option.value === productWeightContext?.currentBOM.versionLevel
      ) ?? options[0])
  const draft = editor?.draft ?? selectedOption ?? initialNewDraft
  const isBusy =
    isSavingOption || isDeletingOption || isClosingAfterSuccessfulSave
  const hasProductWeightContext = Boolean(
    productWeightContext?.currentBOM.productId
  )
  const optionGroups =
    hasProductWeightContext && productWeightContext
      ? [
          {
            label: isZh ? '本型号已有版本' : 'Versions used by this model',
            options: options.filter((option) =>
              productWeightContext.versionWeights.has(option.value)
            ),
          },
          {
            label: isZh ? '其他可选版本' : 'Other available versions',
            options: options.filter(
              (option) => !productWeightContext.versionWeights.has(option.value)
            ),
          },
        ]
      : [{ label: '', options }]

  function selectBOMPerformanceVersionOption(
    option: BOMPerformanceVersionOption
  ) {
    if (mutationInProgressRef.current) return
    setEditor({ option, draft: { ...option } })
    if (
      option.active &&
      productWeightContext?.currentBOM.productId &&
      !productWeightContext.currentBOM.isLocked &&
      !productWeightContext.isLoading
    ) {
      productWeightContext.onSelectVersion(option.value)
    }
  }

  function startAddingBOMPerformanceVersionOption() {
    if (mutationInProgressRef.current) return
    setEditor({ draft: createEmptyBOMPerformanceVersionOptionDraft() })
  }

  async function saveBOMPerformanceVersionOptionDraft() {
    if (mutationInProgressRef.current) return
    const labelZh = draft.labelZh.trim()
    if (!labelZh) {
      toast.error(
        isZh ? '请输入性能版本名称' : 'Enter a performance version name'
      )
      return
    }
    mutationInProgressRef.current = true
    try {
      const savedOption = await saveOption(
        {
          ...draft,
          labelZh,
          labelEn: draft.labelEn?.trim() ?? '',
          description: draft.description?.trim() ?? '',
        },
        selectedOption
      )
      setEditor({ option: savedOption, draft: { ...savedOption } })
      if (
        savedOption.active &&
        productWeightContext?.currentBOM.productId &&
        !productWeightContext.currentBOM.isLocked
      ) {
        productWeightContext.onSelectVersion(savedOption.value)
      }
      toast.success(
        isZh
          ? '性能版本已保存，可在下拉菜单中选择。'
          : 'Performance version saved. You can select it from the dropdown.'
      )
      setIsClosingAfterSuccessfulSave(true)
      successfulSaveCloseTimerRef.current = setTimeout(() => {
        successfulSaveCloseTimerRef.current = null
        mutationInProgressRef.current = false
        setIsClosingAfterSuccessfulSave(false)
        onOpenChange(false)
      }, 500)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isZh
            ? '性能版本保存失败'
            : 'Unable to save performance version'
      )
    } finally {
      if (successfulSaveCloseTimerRef.current === null) {
        mutationInProgressRef.current = false
      }
    }
  }

  async function deleteSelectedBOMPerformanceVersionOption() {
    if (!selectedOption || mutationInProgressRef.current) return
    mutationInProgressRef.current = true
    try {
      await deleteOption(selectedOption)
      const nextOption = options.find(
        (option) => option.id !== selectedOption.id
      )
      setEditor({
        option: nextOption,
        draft: nextOption
          ? { ...nextOption }
          : createEmptyBOMPerformanceVersionOptionDraft(),
      })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isZh
            ? '删除失败'
            : 'Delete failed'
      )
    } finally {
      mutationInProgressRef.current = false
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutationInProgressRef.current) onOpenChange(nextOpen)
      }}
    >
      <DialogContent size='6xl' className={dialogClasses.content}>
        <DialogHeader className={dialogClasses.header}>
          <DialogTitle className={dialogClasses.title}>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400'>
              <Gauge className='size-4.5' />
            </span>
            <span className='min-w-0 break-words'>
              {isZh ? '性能版本选项' : 'Performance version options'}
            </span>
          </DialogTitle>
          <DialogDescription className={dialogClasses.description}>
            {isZh
              ? '各型号按需选用共用版本名称，选中后直接填写本型号的重量和单位。外部下拉一起显示版本与重量，重量随当前 BOM 保存。'
              : 'Choose shared version names as needed, then edit this model’s weight and unit. The dropdown shows the version and weight together; weight is saved with the current BOM.'}
          </DialogDescription>
          {hasProductWeightContext && productWeightContext && (
            <p className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
              {productWeightContext.productLabel} ·{' '}
              {productWeightContext.scopeLabel}
            </p>
          )}
        </DialogHeader>
        <div className={dialogClasses.body}>
          <aside
            aria-label={isZh ? '已有性能版本' : 'Existing performance versions'}
            className={editorStyles.sidebar}
          >
            <div className={editorStyles.sidebarHeading}>
              <span>{isZh ? '性能版本' : 'Performance versions'}</span>
              <span className={editorStyles.optionCount}>{options.length}</span>
            </div>
            <div className={editorStyles.optionList}>
              {hasProductWeightContext && productWeightContext?.isLoading && (
                <p role='status' className='px-2 text-xs text-muted-foreground'>
                  {isZh
                    ? '正在读取本型号的版本重量…'
                    : 'Loading model version weights…'}
                </p>
              )}
              {hasProductWeightContext &&
                Boolean(productWeightContext?.error) && (
                  <div
                    role='alert'
                    className='space-y-2 px-2 text-xs text-muted-foreground'
                  >
                    <p>
                      {isZh
                        ? '本型号重量读取失败，请重试，暂不能判断哪些版本已采用。'
                        : 'Unable to load model weights. Retry to see which versions are in use.'}
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => void productWeightContext?.retry()}
                    >
                      {isZh ? '重试重量读取' : 'Retry weights'}
                    </Button>
                  </div>
                )}
              {isLoading && (
                <p role='status' className='px-2 text-sm text-muted-foreground'>
                  {isZh ? '正在加载性能版本…' : 'Loading performance versions…'}
                </p>
              )}
              {error && (
                <div role='alert' className='space-y-3 px-2 text-sm'>
                  <p>
                    {isZh
                      ? '性能版本加载失败，请重试。'
                      : 'Unable to load performance versions. Please retry.'}
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => void retry()}
                  >
                    {isZh ? '重新加载' : 'Retry'}
                  </Button>
                </div>
              )}
              {!isLoading && !error && options.length === 0 && (
                <p role='status' className='px-2 text-sm text-muted-foreground'>
                  {isZh
                    ? '暂无性能版本，可添加标准版、轻量版等选项。'
                    : 'No performance versions yet. Add Standard, Lightweight or another option.'}
                </p>
              )}
              {optionGroups.map((group) => (
                <div key={group.label} className='space-y-2'>
                  {group.label && (
                    <h4 className='px-2 pt-2 text-[11px] font-bold text-muted-foreground'>
                      {group.label}
                    </h4>
                  )}
                  {group.label &&
                    group.options.length === 0 &&
                    !productWeightContext?.isLoading &&
                    !productWeightContext?.error && (
                      <p className='px-2 text-[11px] text-muted-foreground'>
                        {isZh ? '暂无' : 'None'}
                      </p>
                    )}
                  {group.options.map((option) => (
                    <button
                      key={option.id}
                      type='button'
                      aria-pressed={selectedOption?.id === option.id}
                      aria-label={
                        getProductTemplateAttributeLevelTwoOptionLabel(
                          locale,
                          option
                        ) +
                        (!option.active ? (isZh ? '已停用' : ' Disabled') : '')
                      }
                      disabled={isBusy}
                      className={cn(
                        editorStyles.optionButton,
                        selectedOption?.id === option.id &&
                          editorStyles.selectedOptionButton
                      )}
                      onClick={() => selectBOMPerformanceVersionOption(option)}
                    >
                      <span className='min-w-0 space-y-1 break-words'>
                        <span className='block'>
                          {getProductTemplateAttributeLevelTwoOptionLabel(
                            locale,
                            option
                          )}
                        </span>
                        {productWeightContext?.versionWeights.has(
                          option.value
                        ) && (
                          <span className='block text-[10px] font-normal text-muted-foreground'>
                            {productWeightContext.versionWeights.get(
                              option.value
                            )!.isCurrentBOM
                              ? isZh
                                ? '当前 BOM'
                                : 'Current BOM'
                              : productWeightContext.versionWeights.get(
                                    option.value
                                  )!.isSessionDraft
                                ? isZh
                                  ? '本次暂存'
                                  : 'Session draft'
                                : `${productWeightContext.versionWeights.get(option.value)!.bom.bomVersion} · ${productWeightContext.versionWeights.get(option.value)!.bom.status === 'RELEASED' ? (isZh ? '已发布' : 'Released') : isZh ? '未发布' : 'Unreleased'}`}
                          </span>
                        )}
                      </span>
                      {productWeightContext?.versionWeights.has(
                        option.value
                      ) && (
                        <span className='shrink-0 text-xs font-bold tabular-nums'>
                          {formatBOMProductPerformanceVersionWeight(
                            productWeightContext.versionWeights.get(
                              option.value
                            )!.bom,
                            locale
                          )}
                        </span>
                      )}
                      {!option.active && (
                        <span className='shrink-0 text-xs text-muted-foreground'>
                          {isZh ? '已停用' : 'Disabled'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div className={dialogClasses.footer}>
              <Button
                type='button'
                variant='outline'
                className={editorStyles.addOptionButton}
                disabled={isLoading || Boolean(error) || isBusy}
                onClick={startAddingBOMPerformanceVersionOption}
              >
                <Plus className='size-4' />
                {isZh ? '添加性能版本选项' : 'Add performance version option'}
              </Button>
            </div>
          </aside>
          {!isLoading && !error && (
            <BOMPerformanceVersionOptionInlineEditor
              option={selectedOption}
              draft={draft}
              isSaving={isSavingOption}
              isClosingAfterSuccessfulSave={isClosingAfterSuccessfulSave}
              isDeleting={isDeletingOption}
              saveButtonLabel={
                hasProductWeightContext
                  ? isZh
                    ? '保存共用选项'
                    : 'Save shared option'
                  : undefined
              }
              onDraftChange={(nextDraft) =>
                setEditor({ option: selectedOption, draft: nextDraft })
              }
              onSave={() => void saveBOMPerformanceVersionOptionDraft()}
              onReset={() =>
                setEditor({
                  option: selectedOption,
                  draft: selectedOption
                    ? { ...selectedOption }
                    : createEmptyBOMPerformanceVersionOptionDraft(),
                })
              }
              onDelete={() => void deleteSelectedBOMPerformanceVersionOption()}
              productWeightEditor={
                productWeightContext ? (
                  <BOMProductPerformanceVersionWeightEditor
                    context={productWeightContext}
                    versionValue={selectedOption?.value}
                    versionLabel={draft.labelZh}
                    isActive={selectedOption?.active ?? false}
                  />
                ) : undefined
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
