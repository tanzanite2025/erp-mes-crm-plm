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
    <section className='rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.18)]'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/10'>
          <SlidersHorizontal className='size-4' />
        </div>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.24em] text-slate-500/75'>
            {t('rawMaterials.batchEngine.sections.control.kicker')}
          </p>
          <h2 className='mt-2 text-base font-black tracking-tight text-slate-950'>
            {t('rawMaterials.batchEngine.sections.control.title')}
          </h2>
          <p className='mt-1 text-xs leading-5 text-slate-600/85'>
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
