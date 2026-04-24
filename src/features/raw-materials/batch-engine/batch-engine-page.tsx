import { useState } from 'react'
import { Blocks } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { BatchEngineControlPanel } from './components/batch-engine-control-panel'
import { BatchEngineCuttingPreviewDialog } from './components/batch-engine-cutting-preview-dialog'
import { BatchEngineSimulationStage } from './components/batch-engine-simulation-stage'
import { BatchEngineSummaryPanel } from './components/batch-engine-summary-panel'
import { useBatchEngineState } from './hooks/use-batch-engine-state'

export function BatchEnginePage() {
  const { t } = useLanguage()
  const [previewOpen, setPreviewOpen] = useState(false)
  const {
    metrics,
    ruleChips,
    legend,
    controls,
    updateControl,
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cutSizeUnits,
    cutSizeLoading,
    selectedCutSize,
    simulation,
  } = useBatchEngineState()

  return (
    <div className='flex flex-col gap-5'>
      <IndustrialHeader
        icon={Blocks}
        title={t('rawMaterials.batchEngine.title')}
        description={t('rawMaterials.batchEngine.description')}
        statusBadge={
          <div className='rounded-full border border-cyan-500/20 bg-cyan-500/8 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700/85'>
            {t('rawMaterials.batchEngine.status')}
          </div>
        }
      />

      <section className='rounded-[28px] border border-dashed border-slate-300/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)]'>
        <div className='flex flex-col gap-4 xl:grid xl:grid-cols-[320px_minmax(0,1fr)_300px] xl:items-start'>
          <BatchEngineControlPanel
            metrics={metrics}
            ruleChips={ruleChips}
            controls={controls}
            updateControl={updateControl}
            prepregSpecs={prepregSpecs}
            prepregLoading={prepregLoading}
            selectedPrepregSpec={selectedPrepregSpec}
            cutSizeUnits={cutSizeUnits}
            cutSizeLoading={cutSizeLoading}
            selectedCutSize={selectedCutSize}
          />
          <BatchEngineSimulationStage
            legend={legend}
            simulation={simulation}
            onOpenPreview={() => setPreviewOpen(true)}
          />
          <BatchEngineSummaryPanel simulation={simulation} />
        </div>
      </section>

      <BatchEngineCuttingPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        controls={controls}
        simulation={simulation}
      />
    </div>
  )
}
