import { FolderKanban } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { BatchEngineControlField } from './batch-engine-control-field'

type BatchEngineControlPlanSectionProps = {
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(
    key: K,
    value: BatchEngineControls[K]
  ) => void
  cuttingPlans: CuttingPlan[]
  cuttingPlanLoading: boolean
  selectedCuttingPlan?: CuttingPlan
  simulation: BatchEngineSimulation
}

function cuttingPlanOptionLabel(item: CuttingPlan): string {
  return `${item.productCode || '--'} | ${item.name} | ${item.documentNo || item.id}`
}

export function BatchEngineControlPlanSection(
  props: BatchEngineControlPlanSectionProps
) {
  const { t } = useLanguage()
  const {
    controls,
    updateControl,
    cuttingPlans,
    cuttingPlanLoading,
    selectedCuttingPlan,
    simulation,
  } = props

  return (
    <div className='rounded-[18px] border border-dashed border-border/50 bg-muted/5 p-3'>
      <div className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground/70 uppercase'>
        <FolderKanban className='size-4 text-primary/80' />
        {t('rawMaterials.batchEngine.sections.control.blocks.plan.title')}
      </div>
      <div className='mt-2'>
        <BatchEngineControlField
          label={t(
            'rawMaterials.batchEngine.sections.control.fields.cuttingPlanRef'
          )}
        >
          <Select
            value={controls.selectedCuttingPlanId || undefined}
            onValueChange={(value) =>
              updateControl('selectedCuttingPlanId', value)
            }
          >
            <SelectTrigger className='h-9 rounded-lg bg-background text-xs font-semibold'>
              <SelectValue
                placeholder={
                  cuttingPlanLoading
                    ? t(
                        'rawMaterials.batchEngine.sections.control.placeholders.loading'
                      )
                    : t(
                        'rawMaterials.batchEngine.sections.control.placeholders.selectCuttingPlan'
                      )
                }
              />
            </SelectTrigger>
            <SelectContent>
              {cuttingPlans.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {cuttingPlanOptionLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BatchEngineControlField>
        <p className='mt-2 text-xs leading-4 font-semibold text-muted-foreground/80'>
          {selectedCuttingPlan
            ? `${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.document')} ${selectedCuttingPlan.documentNo || '--'} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.revision')} ${selectedCuttingPlan.revisionNo || '--'} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.lines')} ${selectedCuttingPlan.lines.length} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.invalidLines')} ${simulation.invalidDemandLineCount}`
            : t(
                'rawMaterials.batchEngine.sections.control.cuttingPlanSummary.empty'
              )}
        </p>
      </div>
    </div>
  )
}
