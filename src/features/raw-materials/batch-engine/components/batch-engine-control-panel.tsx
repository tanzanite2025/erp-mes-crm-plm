import { SlidersHorizontal } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { BatchEngineControlPlanSection } from './batch-engine-control-plan-section'
import { BatchEngineControlRollSection } from './batch-engine-control-roll-section'

type BatchEngineControlPanelProps = {
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(
    key: K,
    value: BatchEngineControls[K]
  ) => void
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
    <section className='rounded-[22px] border border-border/60 bg-card p-3 shadow-none'>
      <div className='flex items-start gap-2.5'>
        <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/10'>
          <SlidersHorizontal className='size-4' />
        </div>
        <div>
          <p className='text-[10px] font-black tracking-[0.24em] text-muted-foreground/60 uppercase'>
            {t('rawMaterials.batchEngine.sections.control.kicker')}
          </p>
          <h2 className='mt-1 text-sm font-black tracking-tight text-foreground'>
            {t('rawMaterials.batchEngine.sections.control.title')}
          </h2>
          <p className='mt-0.5 text-xs leading-4 text-muted-foreground/80'>
            {t('rawMaterials.batchEngine.sections.control.description')}
          </p>
        </div>
      </div>

      <div className='mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]'>
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
    </section>
  )
}
