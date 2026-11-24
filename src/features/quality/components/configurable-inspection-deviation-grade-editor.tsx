import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ConfigurableInspectionGradeFormValue } from '../services/configurable-inspection-deviation-grade-rules'
import type { ControlledProtocolInspectionCriterionFormValue } from '../services/controlled-protocol-inspection-criteria-editor'

export function ConfigurableInspectionDeviationGradeEditor({
  criterion,
  disabled,
  headingLevel = 'h3',
  onChange,
}: {
  criterion: ControlledProtocolInspectionCriterionFormValue
  disabled: boolean
  headingLevel?: 'h3' | 'h5'
  onChange: (criterion: ControlledProtocolInspectionCriterionFormValue) => void
}) {
  const { t } = useLanguage()
  const InspectionItemGradeRulesHeading = headingLevel
  const inspectionItemGradeRulesTitle = t('quality.grading.titleForItem', {
    itemName: criterion.itemName.trim() || t('quality.grading.unnamedItem'),
  })
  function updateInspectionGradeAtIndex(
    index: number,
    changes: Partial<ConfigurableInspectionGradeFormValue>
  ) {
    onChange({
      ...criterion,
      grades: criterion.grades.map((grade, gradeIndex) =>
        gradeIndex === index ? { ...grade, ...changes } : grade
      ),
    })
  }
  return (
    <section
      className='min-w-0 space-y-3 rounded-xl border bg-background p-3 sm:col-span-full'
      aria-labelledby={`inspection-grade-rules-title-${criterion.id}`}
    >
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <InspectionItemGradeRulesHeading
          id={`inspection-grade-rules-title-${criterion.id}`}
          className='text-[13px] leading-5 font-semibold'
        >
          {inspectionItemGradeRulesTitle}
        </InspectionItemGradeRulesHeading>
        <Button
          type='button'
          variant='outline'
          className='rounded-full'
          disabled={disabled || criterion.grades.length >= 20}
          onClick={() =>
            onChange({
              ...criterion,
              grades: [
                ...criterion.grades,
                {
                  level: '',
                  lowerTolerance: '',
                  upperTolerance: '',
                  result: criterion.grades.slice(-1)[0]?.result ?? 'PASS',
                },
              ],
            })
          }
        >
          {t('quality.grading.add')}
        </Button>
      </div>
      <p className='text-xs leading-5 text-muted-foreground'>
        {t('quality.grading.description')}
      </p>
      {criterion.grades.map((grade, index) => (
        <div
          key={index}
          className='grid min-w-0 gap-3 rounded-xl bg-muted/30 p-3 sm:grid-cols-2 xl:grid-cols-5'
        >
          {(['level', 'lowerTolerance', 'upperTolerance'] as const).map(
            (field) => (
              <div key={field} className='min-w-0 space-y-2'>
                <Label
                  htmlFor={`inspection-grade-${criterion.id}-${index}-${field}`}
                  className='control-typography text-muted-foreground'
                >
                  {t(`quality.grading.${field}`)}
                </Label>
                <Input
                  id={`inspection-grade-${criterion.id}-${index}-${field}`}
                  value={grade[field]}
                  disabled={disabled}
                  type={field === 'level' ? 'text' : 'number'}
                  step={field === 'level' ? undefined : 'any'}
                  min={field === 'level' ? undefined : 0}
                  onChange={(event) =>
                    updateInspectionGradeAtIndex(index, {
                      [field]: event.target.value,
                    })
                  }
                />
              </div>
            )
          )}
          <div className='space-y-2'>
            <Label
              htmlFor={`inspection-grade-${criterion.id}-${index}-result`}
              className='control-typography text-muted-foreground'
            >
              {t('quality.grading.result')}
            </Label>
            <select
              id={`inspection-grade-${criterion.id}-${index}-result`}
              className='h-9 w-full rounded-md border bg-background px-2'
              disabled={disabled}
              value={grade.result}
              onChange={(event) =>
                updateInspectionGradeAtIndex(index, {
                  result: event.target.value as 'PASS' | 'FAIL',
                })
              }
            >
              <option value='PASS'>{t('quality.grading.pass')}</option>
              <option value='FAIL'>{t('quality.grading.fail')}</option>
            </select>
          </div>
          <Button
            type='button'
            variant='ghost'
            className='self-end rounded-full text-destructive'
            disabled={disabled || criterion.grades.length <= 1}
            onClick={() =>
              onChange({
                ...criterion,
                grades: criterion.grades.filter(
                  (_, gradeIndex) => gradeIndex !== index
                ),
              })
            }
          >
            {t('quality.grading.remove')}
          </Button>
        </div>
      ))}
    </section>
  )
}
