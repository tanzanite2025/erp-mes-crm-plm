import { SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BatchEngineControls, BatchEngineMetric, BatchEngineSimulation } from '../types'
import { BatchEngineControlMetricsGrid } from './batch-engine-control-metrics-grid'
import { BatchEngineControlPlanSection } from './batch-engine-control-plan-section'
import { BatchEngineControlRollSection } from './batch-engine-control-roll-section'

type BatchEngineControlPanelProps = {
  metrics: BatchEngineMetric[]
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => void
  prepregSpecs: PrepregMaterialSpec[]
  prepregLoading: boolean
  selectedPrepregSpec?: PrepregMaterialSpec
  cuttingPlans: CuttingPlan[]
  cuttingPlanLoading: boolean
  selectedCuttingPlan?: CuttingPlan
  simulation: BatchEngineSimulation
}

export function BatchEngineControlPanel(props: BatchEngineControlPanelProps) {
  const { t } = useLanguage()
  const {
    metrics,
    controls,
    updateControl,
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cuttingPlans,
    cuttingPlanLoading,
    selectedCuttingPlan,
    simulation,
  } = props

  return (
    <section className='rounded-[26px] border border-border/60 bg-card p-4 shadow-none'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/10'>
          <SlidersHorizontal className='size-4' />
        </div>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground/60'>
            {t('rawMaterials.batchEngine.sections.control.kicker')}
          </p>
          <h2 className='mt-2 text-base font-black tracking-tight text-foreground'>
            {t('rawMaterials.batchEngine.sections.control.title')}
          </h2>
          <p className='mt-1 text-xs leading-5 text-muted-foreground/80'>
            {t('rawMaterials.batchEngine.sections.control.description')}
          </p>
        </div>
      </div>

      <div className='mt-4 grid gap-3'>
        <BatchEngineControlRollSection
          controls={controls}
          updateControl={updateControl}
          prepregSpecs={prepregSpecs}
          prepregLoading={prepregLoading}
          selectedPrepregSpec={selectedPrepregSpec}
        />

        <BatchEngineControlPlanSection
          controls={controls}
          updateControl={updateControl}
          cuttingPlans={cuttingPlans}
          cuttingPlanLoading={cuttingPlanLoading}
          selectedCuttingPlan={selectedCuttingPlan}
          simulation={simulation}
        />
      </div>

      <BatchEngineControlMetricsGrid metrics={metrics} />
    </section>
  )
}
