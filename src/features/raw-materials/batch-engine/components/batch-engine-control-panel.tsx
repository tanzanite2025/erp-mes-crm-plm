import { type ReactNode } from 'react'
import { CircuitBoard, FolderKanban, ScanSearch, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { formatCutSizeExpression } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineControls, BatchEngineMetric, BatchEngineRuleChip } from '../types'

type BatchEngineControlPanelProps = {
  metrics: BatchEngineMetric[]
  ruleChips: BatchEngineRuleChip[]
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => void
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

export function BatchEngineControlPanel(props: BatchEngineControlPanelProps) {
  const { t } = useLanguage()
  const { metrics, ruleChips, controls, updateControl, cutSizeUnits, cutSizeLoading, selectedCutSize } = props

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
            <ControlField label='卷材幅宽 (mm)'>
              <Input
                value={controls.rollWidthMm}
                onChange={(event) => updateControl('rollWidthMm', event.target.value)}
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='1000'
              />
            </ControlField>
            <ControlField label='卷材长度 (m)'>
              <Input
                value={controls.rollLengthM}
                onChange={(event) => updateControl('rollLengthM', event.target.value)}
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='150'
              />
            </ControlField>
            <ControlField label='刀缝 (mm)'>
              <Input
                value={controls.knifeGapMm}
                onChange={(event) => updateControl('knifeGapMm', event.target.value)}
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='2'
              />
            </ControlField>
            <ControlField label='修边 (mm)'>
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
            <ControlField label='引用裁切尺寸单元'>
              <Select
                value={controls.selectedCutSizeId || undefined}
                onValueChange={(value) => updateControl('selectedCutSizeId', value)}
              >
                <SelectTrigger className='h-9 rounded-lg bg-white text-xs font-semibold'>
                  <SelectValue placeholder={cutSizeLoading ? '加载中...' : '请选择尺寸单元'} />
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
                ? `角度 ${selectedCutSize.cutAngle || 0} / 叠层 ${selectedCutSize.layupCount || 1} / 用途 ${selectedCutSize.usageType || '--'}`
                : '选择尺寸单元后，模拟区将按长条优先规则实时计算'}
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
