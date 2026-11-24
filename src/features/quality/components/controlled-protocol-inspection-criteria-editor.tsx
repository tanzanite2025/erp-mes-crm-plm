import { useState } from 'react'
import { Layers3, Plus, Scale, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQualityInspectionStages } from '../hooks/use-quality-inspection-stages'
import { groupQualityStandardInspectionItemsByStageForDisplay } from '../presenters/group-quality-standard-inspection-items-by-stage-for-display'
import { createDefaultConfigurableInspectionGradeFormValues } from '../services/configurable-inspection-deviation-grade-rules'
import type { ControlledProtocolInspectionCriterionFormValue } from '../services/controlled-protocol-inspection-criteria-editor'
import { ConfigurableInspectionDeviationGradeEditor } from './configurable-inspection-deviation-grade-editor'
import { ControlledProtocolConfiguredUnitSelect } from './controlled-protocol-configured-unit-select'
import { QualityInspectionStageSelect } from './quality-inspection-stage-select'

interface ControlledProtocolInspectionCriteriaEditorProps {
  criteria: ControlledProtocolInspectionCriterionFormValue[]
  readOnly: boolean
  onCriteriaChange: (
    criteria: ControlledProtocolInspectionCriterionFormValue[]
  ) => void
}

const INSPECTION_CRITERION_FIELDS = [
  'itemName',
  'targetWeight',
  'unit',
] as const

export function ControlledProtocolInspectionCriteriaEditor({
  criteria,
  readOnly,
  onCriteriaChange,
}: ControlledProtocolInspectionCriteriaEditorProps) {
  const { t } = useLanguage()
  const stagesQuery = useQualityInspectionStages(!readOnly)
  const [
    inspectionStageIdForNewWeightItem,
    setInspectionStageIdForNewWeightItem,
  ] = useState('')
  const selectedStageForNewWeightItem = stagesQuery.data?.find(
    (stage) => stage.id === inspectionStageIdForNewWeightItem && stage.active
  )
  const criteriaByInspectionStage =
    groupQualityStandardInspectionItemsByStageForDisplay(criteria)

  function updateInspectionCriterionField(
    criterionId: string,
    field: (typeof INSPECTION_CRITERION_FIELDS)[number],
    value: string
  ) {
    onCriteriaChange(
      criteria.map((criterion) =>
        criterion.id === criterionId
          ? { ...criterion, [field]: value }
          : criterion
      )
    )
  }

  function addWeightInspectionCriterionToStage(inspectionStageId: string) {
    const stage = stagesQuery.data?.find(
      (configuredStage) =>
        configuredStage.id === inspectionStageId && configuredStage.active
    )
    if (readOnly || stagesQuery.isLoading || stagesQuery.isError || !stage)
      return
    onCriteriaChange([
      ...criteria,
      {
        id: crypto.randomUUID(),
        inspectionStageId: stage.id,
        inspectionStageName: stage.name,
        gradingMode: 'DEVIATION_BANDS',
        grades: createDefaultConfigurableInspectionGradeFormValues(),
        itemName: '',
        targetWeight: '',
        unit: '',
      },
    ])
  }

  return (
    <section className='rounded-3xl border border-dashed border-muted/50 bg-muted/5 p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-sm leading-5 font-semibold'>
          <Scale className='size-4 text-primary' />
          {t('quality.standards.inspectionStages.groupedRulesTitle')}
        </h2>
      </div>
      <p className='mt-2 mb-4 text-xs leading-5 text-muted-foreground'>
        {t('quality.standards.inspectionStages.groupedRulesDescription')}
      </p>
      <div className='mb-4 grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]'>
        <QualityInspectionStageSelect
          id='inspection-stage-for-new-weight-item'
          label={t('quality.standards.inspectionStages.newItemStage')}
          emptySelectionLabel={t(
            'quality.standards.inspectionStages.chooseStage'
          )}
          value={inspectionStageIdForNewWeightItem}
          disabled={readOnly}
          onStageChange={(stage) =>
            setInspectionStageIdForNewWeightItem(stage?.id ?? '')
          }
        />
        <Button
          type='button'
          variant='outline'
          disabled={
            readOnly ||
            stagesQuery.isLoading ||
            stagesQuery.isError ||
            !selectedStageForNewWeightItem
          }
          onClick={() =>
            addWeightInspectionCriterionToStage(
              inspectionStageIdForNewWeightItem
            )
          }
          className='h-9 rounded-full sm:mt-7'
        >
          <Plus className='size-3.5' />
          {t('quality.standards.inspectionStages.addWeightItem')}
        </Button>
      </div>
      {criteria.length === 0 ? (
        <p className='rounded-2xl border border-dashed p-4 text-xs leading-5 text-muted-foreground'>
          {t('quality.standards.dialog.controlledProtocol.empty.criteria')}
        </p>
      ) : (
        <div className='space-y-3'>
          {criteriaByInspectionStage.map((stageGroup) => {
            const stageId = stageGroup.inspectionStageId
            const stageCriteria = stageGroup.items
            const catalogStage = stagesQuery.data?.find(
              (stage) => stage.id === stageId
            )
            const stageName = stageGroup.inspectionStageName
            return (
              <section
                key={stageId}
                aria-label={`${t('quality.standards.inspectionStages.stageGroup')} · ${stageName}`}
                className='min-w-0 space-y-4 rounded-2xl border bg-background p-3 sm:p-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <h3 className='flex min-w-0 items-center gap-2 text-sm leading-5 font-semibold'>
                    <Layers3 className='size-4 shrink-0 text-primary' />
                    <span className='break-words'>{stageName}</span>
                    {catalogStage && !catalogStage.active ? (
                      <span className='shrink-0 text-xs font-normal text-muted-foreground'>
                        {t('quality.standards.inspectionStages.inactive')}
                      </span>
                    ) : null}
                  </h3>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={
                      readOnly ||
                      stagesQuery.isLoading ||
                      stagesQuery.isError ||
                      !catalogStage?.active
                    }
                    onClick={() => addWeightInspectionCriterionToStage(stageId)}
                    className='h-8 rounded-full'
                  >
                    <Plus className='size-3.5' />
                    {t('quality.standards.inspectionStages.addWeightItem')}
                  </Button>
                </div>
                {stageCriteria.map((criterion) => (
                  <section
                    key={criterion.id}
                    aria-label={
                      criterion.itemName.trim() ||
                      t('quality.grading.unnamedItem')
                    }
                    className='min-w-0 space-y-4 rounded-2xl border bg-muted/20 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <h4 className='min-w-0 text-[13px] leading-5 font-semibold break-words'>
                        {criterion.itemName.trim() ||
                          t('quality.grading.unnamedItem')}
                      </h4>
                      <Button
                        type='button'
                        variant='ghost'
                        disabled={readOnly}
                        onClick={() =>
                          onCriteriaChange(
                            criteria.filter((item) => item.id !== criterion.id)
                          )
                        }
                        className='h-8 rounded-full text-destructive'
                      >
                        <Trash2 className='size-3.5' />
                        {t(
                          'quality.standards.dialog.controlledProtocol.actions.removeCriterion'
                        )}
                      </Button>
                    </div>
                    <div className='grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)]'>
                      <QualityInspectionStageSelect
                        id={`inspection-stage-${criterion.id}`}
                        value={criterion.inspectionStageId}
                        snapshotName={criterion.inspectionStageName}
                        disabled={readOnly}
                        showStatusMessages={false}
                        onStageChange={(stage) =>
                          stage &&
                          onCriteriaChange(
                            criteria.map((item) =>
                              item.id === criterion.id
                                ? {
                                    ...item,
                                    inspectionStageId: stage.id,
                                    inspectionStageName: stage.name,
                                  }
                                : item
                            )
                          )
                        }
                      />
                      {INSPECTION_CRITERION_FIELDS.map((field) => {
                        const isNumericField =
                          field !== 'itemName' && field !== 'unit'
                        const inputId = `inspection-criterion-${criterion.id}-${field}`
                        return (
                          <div key={field} className='min-w-0 space-y-2'>
                            <Label
                              htmlFor={inputId}
                              className='control-typography text-muted-foreground'
                            >
                              {t(
                                `quality.standards.dialog.controlledProtocol.fields.${field}`
                              )}
                            </Label>
                            {field === 'unit' ? (
                              <ControlledProtocolConfiguredUnitSelect
                                id={inputId}
                                value={criterion.unit}
                                disabled={readOnly}
                                onValueChange={(value) =>
                                  updateInspectionCriterionField(
                                    criterion.id,
                                    'unit',
                                    value
                                  )
                                }
                              />
                            ) : (
                              <Input
                                id={inputId}
                                type={isNumericField ? 'number' : 'text'}
                                step={isNumericField ? 'any' : undefined}
                                inputMode={
                                  isNumericField ? 'decimal' : undefined
                                }
                                disabled={readOnly}
                                value={criterion[field]}
                                onChange={(event) =>
                                  updateInspectionCriterionField(
                                    criterion.id,
                                    field,
                                    event.target.value
                                  )
                                }
                                placeholder={t(
                                  `quality.standards.dialog.controlledProtocol.placeholders.${field}`
                                )}
                                className='h-9 rounded-xl bg-background'
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <ConfigurableInspectionDeviationGradeEditor
                      criterion={criterion}
                      headingLevel='h5'
                      disabled={readOnly}
                      onChange={(next) =>
                        onCriteriaChange(
                          criteria.map((item) =>
                            item.id === next.id ? next : item
                          )
                        )
                      }
                    />
                  </section>
                ))}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
