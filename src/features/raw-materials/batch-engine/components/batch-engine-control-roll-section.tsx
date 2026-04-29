import { Package2, ScanSearch } from 'lucide-react'
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
import type { BatchEngineControls } from '../types'
import { BatchEngineControlField } from './batch-engine-control-field'

type BatchEngineControlRollSectionProps = {
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => void
  prepregSpecs: PrepregMaterialSpec[]
  prepregLoading: boolean
  selectedPrepregSpec?: PrepregMaterialSpec
}

function prepregOptionLabel(item: PrepregMaterialSpec): string {
  const width = item.widthMm?.trim() || '--'
  const length = item.lengthM?.trim() || '--'
  const display = item.displayAlias?.trim() || item.code
  return `${display} | ${width}mm x ${length}m`
}

export function BatchEngineControlRollSection(props: BatchEngineControlRollSectionProps) {
  const { t } = useLanguage()
  const { controls, updateControl, prepregSpecs, prepregLoading, selectedPrepregSpec } = props

  return (
    <div className='rounded-[22px] border border-dashed border-slate-300/80 bg-slate-50/75 p-4'>
      <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
        <ScanSearch className='size-4 text-cyan-700' />
        {t('rawMaterials.batchEngine.sections.control.blocks.roll.title')}
      </div>
      <div className='mt-3 grid gap-2'>
        <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.prepregRef')}>
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
        </BatchEngineControlField>

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
            <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.rollWidth')}>
              <Input
                value={controls.rollWidthMm}
                readOnly
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='--'
              />
            </BatchEngineControlField>
            <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.rollLength')}>
              <Input
                value={controls.rollLengthM}
                readOnly
                className='h-8 rounded-lg bg-white text-xs font-semibold'
                placeholder='--'
              />
            </BatchEngineControlField>
          </div>
        </div>

        <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.knifeGap')}>
          <Input
            value={controls.knifeGapMm}
            onChange={(event) => updateControl('knifeGapMm', event.target.value)}
            className='h-8 rounded-lg bg-white text-xs font-semibold'
            placeholder='2'
          />
        </BatchEngineControlField>
        <BatchEngineControlField label={t('rawMaterials.batchEngine.sections.control.fields.edgeTrim')}>
          <Input
            value={controls.edgeTrimMm}
            onChange={(event) => updateControl('edgeTrimMm', event.target.value)}
            className='h-8 rounded-lg bg-white text-xs font-semibold'
            placeholder='0'
          />
        </BatchEngineControlField>
      </div>
    </div>
  )
}
