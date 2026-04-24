import { type ReactNode } from 'react'
import { CircuitBoard, FolderKanban, Package2, ScanSearch, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { formatCutSizeExpression } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineControls, BatchEngineMetric, BatchEngineRuleChip } from '../types'

type BatchEngineControlPanelProps = {
  metrics: BatchEngineMetric[]
  ruleChips: BatchEngineRuleChip[]
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => void
  prepregSpecs: PrepregMaterialSpec[]
  prepregLoading: boolean
  selectedPrepregSpec?: PrepregMaterialSpec
  cutSizeUnits: CutSizeUnit[]
  cutSizeLoading: boolean
  selectedCutSize?: CutSizeUnit
}

function getChipClassName(tone: BatchEngineRuleChip['tone']) {
  switch (tone) {
    case 'accent':
      return 'border-cyan-300/70 bg-cyan-50 text-cyan-700'
    case 'warn':
      return 'border-amber-300/80 bg-amber-50 text-amber-700'
    default:
      return 'border-slate-200 bg-white text-slate-600'
  }
}

function cutSizeOptionLabel(item: CutSizeUnit): string {
  return `${item.code} | ${item.name} | ${formatCutSizeExpression(item) || '--'}`
}

function prepregOptionLabel(item: PrepregMaterialSpec): string {
  const width = item.widthMm?.trim() || '--'
  const length = item.lengthM?.trim() || '--'
  const display = item.displayAlias?.trim() || item.code
  return `${display} | ${width}mm x ${length}m`
}

export function BatchEngineControlPanel(props: BatchEngineControlPanelProps) {
  const { t } = useLanguage()
  const {
    metrics,
    ruleChips,
    controls,
    updateControl,
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cutSizeUnits,
    cutSizeLoading,
    selectedCutSize,
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
        <div className='rounded-[22px] border border-dashed border-slate-300/80 bg-slate-50/75 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <ScanSearch className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.control.blocks.roll.title')}
          </div>
          <div className='mt-3 grid gap-2'>
            <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.prepregRef')}>
              <Select
                value={controls.selectedPrepregSpecId || '__none__'}
                onValueChange={(value) =>
                  updateControl('selectedPrepregSpecId', value === '__none__' ? '' : value)
                }
              >
                <SelectTrigger className='h-9 rounded-lg bg-white text-xs font-semibold'>
                  <SelectValue
                    placeholder={
                      prepregLoading
                        ? t('rawMaterials.batchEngine.sections.control.placeholders.loading')
                        : t('rawMaterials.batchEngine.sections.control.placeholders.selectPrepreg')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>
                    {t('rawMaterials.batchEngine.sections.control.placeholders.none')}
                  </SelectItem>
                  {prepregSpecs.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {prepregOptionLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>

            <p className='min-h-5 text-xs font-semibold text-slate-600'>
              {selectedPrepregSpec
                ? `${t('rawMaterials.batchEngine.sections.control.prepregSummary.prefix')}: ${selectedPrepregSpec.widthMm || '--'}mm x ${selectedPrepregSpec.lengthM || '--'}m`
                : t('rawMaterials.batchEngine.sections.control.prepregSummary.empty')}
            </p>

            <div className='rounded-[14px] border border-dashed border-cyan-300/70 bg-cyan-50/70 p-3'>
              <div className='mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-800/80'>
                <Package2 className='size-4' />
                {t('rawMaterials.batchEngine.sections.control.blocks.rollSpec.title')}
              </div>
              <div className='grid gap-2'>
                <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.rollWidth')}>
                  <Input
                    value={controls.rollWidthMm}
                    readOnly
                    className='h-8 rounded-lg bg-white text-xs font-semibold'
                    placeholder='--'
                  />
                </ControlField>
                <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.rollLength')}>
                  <Input
                    value={controls.rollLengthM}
                    readOnly
                    className='h-8 rounded-lg bg-white text-xs font-semibold'
                    placeholder='--'
                  />
                </ControlField>
              </div>
            </div>

            <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.knifeGap')}>
              <Input
                value={controls.knifeGapMm}
                onChange={(event) => updateControl('knifeGapMm', event.target.value)}
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='2'
              />
            </ControlField>
            <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.edgeTrim')}>
              <Input
                value={controls.edgeTrimMm}
                onChange={(event) => updateControl('edgeTrimMm', event.target.value)}
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='0'
              />
            </ControlField>
          </div>
        </div>

        <div className='rounded-[22px] border border-dashed border-slate-300/80 bg-slate-50/75 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <FolderKanban className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.control.blocks.plan.title')}
          </div>
          <div className='mt-3'>
            <ControlField label={t('rawMaterials.batchEngine.sections.control.fields.cutSizeRef')}>
              <Select
                value={controls.selectedCutSizeId || undefined}
                onValueChange={(value) => updateControl('selectedCutSizeId', value)}
              >
                <SelectTrigger className='h-9 rounded-lg bg-white text-xs font-semibold'>
                  <SelectValue
                    placeholder={
                      cutSizeLoading
                        ? t('rawMaterials.batchEngine.sections.control.placeholders.loading')
                        : t('rawMaterials.batchEngine.sections.control.placeholders.selectCutSize')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {cutSizeUnits.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {cutSizeOptionLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlField>
            <p className='mt-2 min-h-5 text-xs font-semibold text-slate-600'>
              {selectedCutSize
                ? `${t('rawMaterials.batchEngine.sections.control.cutSizeSummary.angle')} ${selectedCutSize.cutAngle || 0} / ${t('rawMaterials.batchEngine.sections.control.cutSizeSummary.layup')} ${selectedCutSize.layupCount || 1} / ${t('rawMaterials.batchEngine.sections.control.cutSizeSummary.usage')} ${selectedCutSize.usageType || '--'}`
                : t('rawMaterials.batchEngine.sections.control.cutSizeSummary.empty')}
            </p>
          </div>
        </div>

        <div className='rounded-[22px] border border-dashed border-slate-300/80 bg-slate-50/75 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <CircuitBoard className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.control.blocks.engine.title')}
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            {ruleChips.map((chip) => (
              <span
                key={chip.key}
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getChipClassName(chip.tone)}`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className='mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1'>
        {metrics.map((metric) => (
          <div key={metric.key} className='rounded-[20px] border border-slate-200 bg-white p-3'>
            <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>
              {metric.label}
            </p>
            <p className='mt-2 text-lg font-black tracking-tight text-slate-950'>{metric.value}</p>
            <p className='mt-1 text-xs leading-5 text-slate-600/80'>{metric.hint}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ControlField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className='mb-1 text-[10px] font-black tracking-widest text-slate-500/70'>{label}</p>
      {children}
    </div>
  )
}
