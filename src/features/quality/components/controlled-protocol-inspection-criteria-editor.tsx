import { Plus, Scale, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ControlledProtocolInspectionCriterionFormValue } from '../services/controlled-protocol-inspection-criteria-editor'
import { ControlledProtocolConfiguredUnitSelect } from './controlled-protocol-configured-unit-select'

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
  'aLevelTolerance',
  'bLevelTolerance',
] as const

export function ControlledProtocolInspectionCriteriaEditor({
  criteria,
  readOnly,
  onCriteriaChange,
}: ControlledProtocolInspectionCriteriaEditorProps) {
  const { t } = useLanguage()

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

  function addInspectionCriterion() {
    onCriteriaChange([
      ...criteria,
      {
        id: crypto.randomUUID(),
        itemName: '',
        targetWeight: '',
        unit: '',
        aLevelTolerance: '',
        bLevelTolerance: '',
      },
    ])
  }

  return (
    <section className='rounded-3xl border border-dashed border-muted/50 bg-muted/5 p-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='flex items-center gap-2 text-xs font-bold'>
          <Scale className='size-4 text-primary' />
          {t(
            'quality.standards.dialog.controlledProtocol.fields.selectedWeights'
          )}
        </h2>
        <Button
          type='button'
          variant='outline'
          disabled={readOnly}
          onClick={addInspectionCriterion}
          className='h-8 rounded-full text-[10px]'
        >
          <Plus className='size-3.5' />
          {t(
            'quality.standards.dialog.controlledProtocol.actions.addCriterion'
          )}
        </Button>
      </div>
      <p className='mt-2 mb-4 text-[11px] leading-relaxed text-muted-foreground'>
        {t('quality.standards.dialog.controlledProtocol.gradingHint')}
      </p>
      {criteria.length === 0 ? (
        <p className='rounded-2xl border border-dashed p-4 text-[11px] text-muted-foreground'>
          {t('quality.standards.dialog.controlledProtocol.empty.criteria')}
        </p>
      ) : (
        <div className='space-y-3'>
          {criteria.map((criterion) => (
            <div
              key={criterion.id}
              className='grid gap-3 rounded-2xl bg-muted/20 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1.3fr)_minmax(110px,1fr)_minmax(60px,.6fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto]'
            >
              {INSPECTION_CRITERION_FIELDS.map((field) => {
                const isNumericField = field !== 'itemName' && field !== 'unit'
                const inputId = `inspection-criterion-${criterion.id}-${field}`
                return (
                  <div key={field} className='min-w-0 space-y-2'>
                    <Label
                      htmlFor={inputId}
                      className='text-[10px] font-medium text-muted-foreground'
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
                        min={field.endsWith('Tolerance') ? '0' : undefined}
                        inputMode={isNumericField ? 'decimal' : undefined}
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
                        className='h-9 rounded-xl bg-background text-[11px] md:text-[11px]'
                      />
                    )}
                  </div>
                )
              })}
              <Button
                type='button'
                variant='ghost'
                disabled={readOnly}
                onClick={() =>
                  onCriteriaChange(
                    criteria.filter((item) => item.id !== criterion.id)
                  )
                }
                className='h-9 self-end rounded-full text-[10px] text-destructive'
              >
                <Trash2 className='size-3.5' />
                {t(
                  'quality.standards.dialog.controlledProtocol.actions.removeCriterion'
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
