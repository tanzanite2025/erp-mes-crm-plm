import { useMemo, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { FormField, FormItem, FormLabel } from '@/components/ui/form'
import { SelectDropdown } from '@/components/select-dropdown'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { type BOM } from '../../data/schema'
import { useBOMPerformanceVersionOptions } from '../../hooks/use-bom-performance-version-options'
import { type BOMPerformanceVersionWeightDrafts } from '../../hooks/use-bom-performance-version-weight-drafts'
import { formatBOMProductPerformanceVersionWeight } from '../../utils/bom-product-performance-version-weight-comparison'
import { BOMFieldBusinessMeaningHelpPopover } from '../bom-field-business-meaning-help-popover'
import { BOMPerformanceVersionOptionManagementDialog } from './bom-performance-version-option-management-dialog'

interface BOMPerformanceVersionAndWeightFieldProps {
  form: UseFormReturn<BOM>
  weightDrafts: BOMPerformanceVersionWeightDrafts
  productLabel: string
  scopeLabel: string
}

/** Owns the combined selector and its management dialog; BOM persistence belongs to the submit orchestrator. */
export function BOMPerformanceVersionAndWeightField({
  form,
  weightDrafts,
  productLabel,
  scopeLabel,
}: BOMPerformanceVersionAndWeightFieldProps) {
  const { t, locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const [isOptionManagementOpen, setIsOptionManagementOpen] = useState(false)
  const { currentBOM, versionWeights } = weightDrafts
  const hasSelectedProduct = Boolean(currentBOM.productId)
  const { units } = useUnitsQuery()
  const currentWeightUnit = currentBOM.measuredWeightUnit
  const weightUnitItems = useMemo(() => {
    const items = units
      .filter((unit) => unit.category === 'WEIGHT' && unit.status === 'active')
      .map((unit) => ({
        label: unit.code ? `${unit.code} (${unit.name})` : unit.name,
        value: unit.code,
      }))
    if (
      currentWeightUnit &&
      !items.some((unit) => unit.value === currentWeightUnit)
    ) {
      items.push({ label: currentWeightUnit, value: currentWeightUnit })
    }
    return items
  }, [units, currentWeightUnit])
  const { options } = useBOMPerformanceVersionOptions()
  const versionItems = useMemo(
    () =>
      options
        .filter((option) => option.active)
        .map((option) => {
          const entry = versionWeights.get(option.value)
          const name =
            locale === 'en-US' && option.labelEn?.trim()
              ? option.labelEn
              : option.labelZh
          return {
            value: option.value,
            label:
              name +
              (entry
                ? ` · ${formatBOMProductPerformanceVersionWeight(entry.bom, locale)}${entry.isSessionDraft ? (isZh ? ' · 本次暂存' : ' · Session draft') : ''}`
                : ''),
          }
        }),
    [options, versionWeights, locale, isZh]
  )

  return (
    <section
      aria-label={isZh ? '性能版本与重量' : 'Performance version and weight'}
      className='space-y-2 border-t border-dashed border-border/60 pt-3'
    >
      <FormField
        control={form.control}
        name='versionLevel'
        render={({ field }) => (
          <FormItem className='min-w-0 gap-1.5'>
            <div className='flex items-center justify-between gap-2'>
              <div className='flex items-center gap-1'>
                <FormLabel className='text-[11px] font-bold text-foreground/80'>
                  {t('engineering.bomArchive.form.versionLevel')}
                </FormLabel>
                <BOMFieldBusinessMeaningHelpPopover
                  topic='performanceAndWeight'
                  fieldLabel={t('engineering.bomArchive.form.versionLevel')}
                />
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='size-7 rounded-full bg-blue-600 p-0 text-white hover:bg-blue-700 hover:text-white disabled:bg-muted disabled:text-muted-foreground dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-muted'
                disabled={!hasSelectedProduct}
                title={
                  !hasSelectedProduct
                    ? isZh
                      ? '请先选择产品'
                      : 'Select a product first'
                    : isZh
                      ? '管理性能版本和重量'
                      : 'Manage performance versions and weights'
                }
                aria-label={
                  isZh
                    ? '管理性能版本选项'
                    : 'Manage performance version options'
                }
                onClick={() => {
                  if (hasSelectedProduct) setIsOptionManagementOpen(true)
                }}
              >
                <Settings2 className='size-4' />
              </Button>
            </div>
            <SelectDropdown
              value={field.value ?? ''}
              onValueChange={weightDrafts.onSelectVersion}
              items={versionItems}
              placeholder={
                !hasSelectedProduct
                  ? isZh
                    ? '请先选择产品'
                    : 'Select a product first'
                  : t('engineering.bomArchive.form.versionLevelPlaceholder')
              }
              className='h-9! w-full rounded-xl border-transparent bg-muted/50 text-xs shadow-none'
              disabled={
                !hasSelectedProduct ||
                currentBOM.isLocked ||
                weightDrafts.isLoading
              }
              isControlled
            />
          </FormItem>
        )}
      />
      <p className='text-[11px] leading-relaxed text-muted-foreground'>
        {hasSelectedProduct
          ? isZh
            ? '在版本选项内编辑重量和单位，下拉一起显示。'
            : 'Edit weight and unit in version options; both are shown in the dropdown.'
          : isZh
            ? '请先选择产品，再设置性能版本和重量。'
            : 'Select a product before setting its performance version and weight.'}
      </p>
      <BOMPerformanceVersionOptionManagementDialog
        open={isOptionManagementOpen}
        onOpenChange={setIsOptionManagementOpen}
        productWeightContext={{
          currentBOM,
          productLabel,
          scopeLabel,
          versionWeights,
          weightUnitItems,
          isLoading: weightDrafts.isLoading,
          error: weightDrafts.error,
          retry: weightDrafts.retry,
          onSelectVersion: weightDrafts.onSelectVersion,
          onWeightChange: weightDrafts.onWeightChange,
        }}
      />
    </section>
  )
}
