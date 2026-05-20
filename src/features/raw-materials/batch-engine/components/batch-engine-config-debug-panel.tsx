import { ChevronDown, Settings2 } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useLanguage } from '@/context/language-provider'
import type { BatchEngineControls } from '../types'
import type { CuttingEngineInput } from '../types/cutting-engine-wasm'

type BatchEngineConfigDebugPanelProps = {
  controls: BatchEngineControls
  request: CuttingEngineInput | null
  isResultStale: boolean
}

function formatLengthBoundary(controls: BatchEngineControls) {
  const fixed = controls.fixedDecisionLengthMm?.trim()
  return fixed
    ? `${controls.minSupportedLengthMm || '--'} - ${controls.maxSupportedLengthMm || '--'} mm / fixed ${fixed} mm`
    : `${controls.minSupportedLengthMm || '--'} - ${controls.maxSupportedLengthMm || '--'} mm`
}

export function BatchEngineConfigDebugPanel(props: BatchEngineConfigDebugPanelProps) {
  const { t } = useLanguage()
  const { controls, request, isResultStale } = props
  const requestJson = request
    ? JSON.stringify(request, null, 2)
    : t('rawMaterials.batchEngine.debug.payload.empty')

  return (
    <section className='relative rounded-[24px] border border-dashed border-border/60 bg-muted/5 p-4'>
      <div className='absolute inset-0 rounded-[24px] bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
      <div className='relative flex flex-col gap-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
              <Settings2 className='size-4' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-primary/70'>
                {t('rawMaterials.batchEngine.debug.kicker')}
              </p>
              <h2 className='mt-2 text-sm font-black tracking-tighter italic uppercase text-foreground'>
                {t('rawMaterials.batchEngine.debug.title')}
              </h2>
              <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('rawMaterials.batchEngine.debug.description')}
              </p>
            </div>
          </div>
          {isResultStale ? (
            <span className='rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-600'>
              {t('rawMaterials.batchEngine.debug.resultStale')}
            </span>
          ) : null}
        </div>

        <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-5'>
          <ConfigChip label={t('rawMaterials.batchEngine.debug.fields.preset')} value={controls.objectivePreset} />
          <ConfigChip
            label={t('rawMaterials.batchEngine.debug.fields.weights')}
            value={`${controls.utilizationWeight || '--'} / ${controls.stabilityWeight || '--'} / ${controls.splitPenaltyWeight || '--'}`}
          />
          <ConfigChip
            label={t('rawMaterials.batchEngine.debug.fields.geometry')}
            value={`${controls.knifeGapMm || '--'} mm / ${controls.edgeTrimMm || '--'} mm`}
          />
          <ConfigChip
            label={t('rawMaterials.batchEngine.debug.fields.lengthRules')}
            value={formatLengthBoundary(controls)}
          />
          <ConfigChip
            label={t('rawMaterials.batchEngine.debug.fields.directionRules')}
            value={`${controls.angleMixMode} / ${controls.sameDirectionPreferred ? 'same' : 'off'} / ${controls.directionSwitchPenaltyWeight || '--'}`}
          />
        </div>

        <Collapsible className='rounded-[18px] border border-dashed border-border/50 bg-background/60 p-3'>
          <CollapsibleTrigger className='group flex w-full items-center justify-between gap-3 text-left'>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-foreground/70'>
                {t('rawMaterials.batchEngine.debug.payload.title')}
              </p>
              <p className='mt-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60'>
                {t('rawMaterials.batchEngine.debug.payload.description')}
              </p>
            </div>
            <div className='flex size-8 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 text-muted-foreground transition-all group-data-[state=open]:rotate-180'>
              <ChevronDown className='size-4' />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
            <pre className='mt-3 max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-[10px] leading-relaxed text-slate-100'>
              {requestJson}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  )
}

function ConfigChip({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-border/50 bg-background/70 px-3 py-2'>
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{label}</p>
      <p className='mt-1 truncate font-mono text-[11px] font-black text-foreground'>{value}</p>
    </div>
  )
}
