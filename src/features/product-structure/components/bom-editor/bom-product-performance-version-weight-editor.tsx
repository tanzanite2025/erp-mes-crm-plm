import { useId } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type BOMProductPerformanceVersionWeightComparisonEntry,
  type BOMProductPerformanceVersionWeightSource,
} from '../../utils/bom-product-performance-version-weight-comparison'
import { bomPerformanceVersionOptionInlineEditorStyles as editorStyles } from './bom-performance-version-option-management-dialog-and-inline-editor.styles'

export interface BOMProductPerformanceVersionWeightEditorContext {
  currentBOM: BOMProductPerformanceVersionWeightSource
  productLabel: string
  scopeLabel: string
  versionWeights: Map<string, BOMProductPerformanceVersionWeightComparisonEntry>
  weightUnitItems: ReadonlyArray<{ label: string; value: string }>
  isLoading: boolean
  error: unknown
  retry: () => unknown
  onSelectVersion: (versionValue: string) => void
  onWeightChange: (weight: number, unit: string) => void
}

export function BOMProductPerformanceVersionWeightEditor({
  context,
  versionValue,
  versionLabel,
  isActive,
}: {
  context: BOMProductPerformanceVersionWeightEditorContext
  versionValue?: string
  versionLabel: string
  isActive: boolean
}) {
  const { locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const fieldId = useId()
  const { currentBOM } = context
  const isCurrentVersion =
    Boolean(versionValue) && currentBOM.versionLevel === versionValue
  const entry = versionValue
    ? context.versionWeights.get(versionValue)
    : undefined
  const versionWeight = isCurrentVersion ? currentBOM : entry?.bom
  const measuredWeight = versionWeight?.measuredWeight ?? 0
  const measuredWeightUnit = versionWeight?.measuredWeightUnit ?? ''
  const isWeightEditingDisabled =
    currentBOM.isLocked || (!isCurrentVersion && !isActive)
  const weightUnitItems = [...context.weightUnitItems]
  if (
    measuredWeightUnit &&
    !weightUnitItems.some((unit) => unit.value === measuredWeightUnit)
  ) {
    weightUnitItems.push({
      label: measuredWeightUnit,
      value: measuredWeightUnit,
    })
  }

  function updateSelectedPerformanceVersionWeight(
    weight: number,
    unit: string
  ) {
    if (
      !versionValue ||
      isWeightEditingDisabled ||
      !Number.isFinite(weight) ||
      weight < 0
    )
      return
    if (!isCurrentVersion) context.onSelectVersion(versionValue)
    context.onWeightChange(weight, unit)
  }

  return (
    <div className='space-y-2 rounded-2xl border border-dashed border-blue-600/20 bg-blue-600/5 p-3'>
      <div className='flex flex-wrap items-center justify-between gap-1'>
        <h4 className='text-xs font-black'>
          {versionLabel && `${versionLabel} · `}
          {isZh ? '本型号重量' : 'Model weight'}
        </h4>
        {isCurrentVersion && (
          <span className='text-xs font-semibold text-blue-600 dark:text-blue-400'>
            {isZh ? '当前 BOM' : 'Current BOM'}
          </span>
        )}
      </div>
      {!currentBOM.productId ? (
        <p className='text-xs text-muted-foreground'>
          {isZh
            ? '请先选择产品型号。版本名称可以共用，重量由各型号的 BOM 分别保存。'
            : 'Select a product model first. Version names are shared; weights belong to each model’s BOM.'}
        </p>
      ) : !versionValue ? (
        <p className='text-xs text-muted-foreground'>
          {isZh
            ? '保存版本名称后，可按需选用于当前 BOM，无需为型号建立全套版本。'
            : 'Save the name, then choose it for this BOM if needed. Models do not need every version.'}
        </p>
      ) : (
        <>
          <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3'>
            <div className='space-y-2'>
              <Label
                htmlFor={`${fieldId}-weight`}
                className={editorStyles.fieldLabel}
              >
                {isZh ? '本版本重量' : 'Version weight'}
              </Label>
              <Input
                id={`${fieldId}-weight`}
                type='number'
                min={0}
                step='any'
                disabled={isWeightEditingDisabled}
                value={measuredWeight || ''}
                className={editorStyles.input}
                onChange={(event) =>
                  updateSelectedPerformanceVersionWeight(
                    event.target.value === '' ? 0 : Number(event.target.value),
                    measuredWeightUnit
                  )
                }
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor={`${fieldId}-unit`}
                className={editorStyles.fieldLabel}
              >
                {isZh ? '重量单位' : 'Weight unit'}
              </Label>
              <Select
                value={measuredWeightUnit}
                disabled={isWeightEditingDisabled}
                onValueChange={(unit) =>
                  updateSelectedPerformanceVersionWeight(measuredWeight, unit)
                }
              >
                <SelectTrigger
                  id={`${fieldId}-unit`}
                  className='h-10 w-full rounded-xl border-transparent bg-muted/40 text-xs shadow-none'
                >
                  <SelectValue
                    placeholder={isZh ? '选择单位' : 'Select unit'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {weightUnitItems.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {isZh
              ? '仅当前选中版本随 BOM 保存，切换版本会暂存输入。'
              : 'Only the selected version is saved with this BOM. Switching retains session drafts.'}
          </p>
        </>
      )}
    </div>
  )
}
