import { ChevronDown, FolderKanban } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { BatchEngineControlField } from './batch-engine-control-field'

type BatchEngineControlPlanSectionProps = {
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => void
  cuttingPlans: CuttingPlan[]
  cuttingPlanLoading: boolean
  selectedCuttingPlan?: CuttingPlan
  simulation: BatchEngineSimulation
}

function cuttingPlanOptionLabel(item: CuttingPlan): string {
  return `${item.productCode || '--'} | ${item.name} | ${item.documentNo || item.id}`
}

export function BatchEngineControlPlanSection(props: BatchEngineControlPlanSectionProps) {
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
    <div className='rounded-[22px] border border-dashed border-border/50 bg-muted/5 p-4'>
      <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70'>
        <FolderKanban className='size-4 text-primary/80' />
        {t('rawMaterials.batchEngine.sections.control.blocks.plan.title')}
      </div>
      <div className='mt-3'>
        <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.cuttingPlanRef')}>
          <Select
            value={controls.selectedCuttingPlanId || undefined}
            onValueChange={(value) => updateControl('selectedCuttingPlanId', value)}
          >
            <SelectTrigger className='h-9 rounded-lg bg-background text-xs font-semibold'>
              <SelectValue
                placeholder={
                  cuttingPlanLoading
                    ? t('rawMaterials.batchEngine.sections.control.placeholders.loading')
                    : t('rawMaterials.batchEngine.sections.control.placeholders.selectCuttingPlan')
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
        <p className='mt-2 min-h-5 text-xs font-semibold text-muted-foreground/80'>
          {selectedCuttingPlan
            ? `${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.document')} ${selectedCuttingPlan.documentNo || '--'} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.revision')} ${selectedCuttingPlan.revisionNo || '--'} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.lines')} ${selectedCuttingPlan.lines.length} / ${t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.invalidLines')} ${simulation.invalidDemandLineCount}`
            : t('rawMaterials.batchEngine.sections.control.cuttingPlanSummary.empty')}
        </p>

        <div className='mt-3 rounded-[14px] border border-dashed border-border/40 bg-muted/5 p-3'>
          <div className='mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70'>
            {t('rawMaterials.batchEngine.sections.control.objective.title')}
          </div>
          <p className='mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/50'>
            {t('rawMaterials.batchEngine.sections.control.objective.description')}
          </p>
          <Select value={controls.objectivePreset} onValueChange={(value) => updateControl('objectivePreset', value as BatchEngineControls['objectivePreset'])}>
            <SelectTrigger className='h-9 rounded-lg bg-background text-xs font-semibold'>
              <SelectValue placeholder={t('rawMaterials.batchEngine.sections.control.objective.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='yield-first'>
                {t('rawMaterials.batchEngine.sections.control.objective.options.yieldFirst')}
              </SelectItem>
              <SelectItem value='stability-first'>
                {t('rawMaterials.batchEngine.sections.control.objective.options.stabilityFirst')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Collapsible
          defaultOpen={false}
          className='mt-3 rounded-[14px] border border-dashed border-primary/20 bg-primary/5 p-3'
        >
          <CollapsibleTrigger className='group w-full text-left hover:no-underline'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-[0.18em] text-primary/70'>
                  {t('rawMaterials.batchEngine.sections.control.scoreWeights.title')}
                </div>
                <p className='mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-primary/50'>
                  {t('rawMaterials.batchEngine.sections.control.scoreWeights.description')}
                </p>
              </div>
              <div className='flex size-8 shrink-0 items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-background/70 text-primary/60 transition-all group-data-[state=open]:rotate-180 group-data-[state=open]:text-primary'>
                <ChevronDown className='size-4' />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
            <div className='mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
              <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.scoreWeights.fields.utilization')}>
                <Input value={controls.utilizationWeight} onChange={(event) => updateControl('utilizationWeight', event.target.value)} className='h-8 rounded-lg bg-background text-xs font-semibold' placeholder='55' />
              </BatchEngineControlField>
              <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.scoreWeights.fields.stability')}>
                <Input value={controls.stabilityWeight} onChange={(event) => updateControl('stabilityWeight', event.target.value)} className='h-8 rounded-lg bg-background text-xs font-semibold' placeholder='10' />
              </BatchEngineControlField>
              <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.scoreWeights.fields.splitPenalty')}>
                <Input value={controls.splitPenaltyWeight} onChange={(event) => updateControl('splitPenaltyWeight', event.target.value)} className='h-8 rounded-lg bg-background text-xs font-semibold' placeholder='6' />
              </BatchEngineControlField>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  )
}
