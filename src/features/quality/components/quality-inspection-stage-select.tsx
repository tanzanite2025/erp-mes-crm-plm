import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useQualityInspectionStages } from '../hooks/use-quality-inspection-stages'

interface QualityInspectionStageSelectProps {
  id: string
  value?: string
  snapshotName?: string
  disabled?: boolean
  label?: string
  emptySelectionLabel?: string
  showStatusMessages?: boolean
  onStageChange: (stage?: { id: string; name: string }) => void
}

export function QualityInspectionStageSelect({
  id,
  value,
  snapshotName,
  disabled = false,
  label,
  emptySelectionLabel,
  showStatusMessages = true,
  onStageChange,
}: QualityInspectionStageSelectProps) {
  const { t } = useLanguage()
  const stagesQuery = useQualityInspectionStages(!disabled)
  const stages = stagesQuery.data ?? []
  const selectedCatalogStage = stages.find((stage) => stage.id === value)
  const isCatalogUnavailable = stagesQuery.isLoading || stagesQuery.isError
  const needsStageReselection =
    !disabled &&
    !isCatalogUnavailable &&
    value &&
    (!selectedCatalogStage ||
      (snapshotName !== undefined &&
        selectedCatalogStage.name !== snapshotName))
  const showSavedStageOption =
    value &&
    (disabled || isCatalogUnavailable) &&
    (!selectedCatalogStage ||
      (snapshotName !== undefined &&
        selectedCatalogStage.name !== snapshotName))
  return (
    <div className='min-w-0 space-y-2'>
      <Label htmlFor={id} className='control-typography text-muted-foreground'>
        {label ?? t('quality.standards.inspectionStages.stage')}
      </Label>
      <select
        id={id}
        value={needsStageReselection ? '' : (value ?? '')}
        disabled={disabled || isCatalogUnavailable}
        className='h-9 w-full min-w-0 rounded-xl border border-input bg-background px-2 disabled:opacity-60'
        onChange={(event) => {
          const selectedStage = stages.find(
            (stage) => stage.id === event.target.value
          )
          onStageChange(
            selectedStage
              ? { id: selectedStage.id, name: selectedStage.name }
              : undefined
          )
        }}
      >
        <option value='' disabled>
          {stagesQuery.isLoading
            ? t('quality.standards.inspectionStages.loading')
            : (emptySelectionLabel ??
              t('quality.standards.inspectionStages.chooseStage'))}
        </option>
        {showSavedStageOption ? (
          <option value={value}>{snapshotName || value}</option>
        ) : null}
        {stages
          .filter((stage) => !showSavedStageOption || stage.id !== value)
          .map((stage) => (
            <option key={stage.id} value={stage.id} disabled={!stage.active}>
              {stage.name}
              {!stage.active
                ? ` (${t('quality.standards.inspectionStages.inactive')})`
                : ''}
            </option>
          ))}
      </select>
      {showStatusMessages && stagesQuery.isError ? (
        <div role='alert' className='text-xs leading-5 text-destructive'>
          {t('quality.standards.inspectionStages.loadFailed')}{' '}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='rounded-full'
            onClick={() => stagesQuery.refetch()}
          >
            {t('quality.standards.inspectionStages.retry')}
          </Button>
        </div>
      ) : null}
      {showStatusMessages &&
      !stagesQuery.isLoading &&
      !stagesQuery.isError &&
      !disabled &&
      stages.length === 0 ? (
        <p className='text-xs leading-5 text-muted-foreground'>
          {t('quality.standards.inspectionStages.empty')}
        </p>
      ) : null}
    </div>
  )
}
