import { Package2, ScanSearch } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import { CuttingEnginePhysicalConstraintsPanel } from '../../engine-config/components/cutting-engine-physical-constraints-panel'
import type { BatchEngineControls } from '../types'
import { BatchEngineControlField } from './batch-engine-control-field'

type BatchEngineControlRollSectionProps = {
  controls: BatchEngineControls
  updateControl: <K extends keyof BatchEngineControls>(
    key: K,
    value: BatchEngineControls[K]
  ) => void
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

export function BatchEngineControlRollSection(
  props: BatchEngineControlRollSectionProps
) {
  const { t } = useLanguage()
  const {
    controls,
    updateControl,
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
  } = props
  const handlePhysicalConstraintChange = (
    key: keyof Pick<
      BatchEngineControls,
      'knifeGapMm' | 'edgeTrimMm' | 'maxSolveDurationSeconds'
    >,
    value: string
  ) => {
    updateControl(key, value)
  }

  return (
    <div className='rounded-[22px] border border-dashed border-border/50 bg-muted/5 p-4'>
      <div className='flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-muted-foreground/70 uppercase'>
        <ScanSearch className='size-4 text-primary/80' />
        {t('rawMaterials.batchEngine.sections.control.blocks.roll.title')}
      </div>
      <div className='mt-3 grid gap-2'>
        <BatchEngineControlField
          label={t(
            'rawMaterials.batchEngine.sections.control.fields.prepregRef'
          )}
        >
          <Select
            value={controls.selectedPrepregSpecId || '__none__'}
            onValueChange={(value) =>
              updateControl(
                'selectedPrepregSpecId',
                value === '__none__' ? '' : value
              )
            }
          >
            <SelectTrigger className='h-9 rounded-lg bg-background text-xs font-semibold'>
              <SelectValue
                placeholder={
                  prepregLoading
                    ? t(
                        'rawMaterials.batchEngine.sections.control.placeholders.loading'
                      )
                    : t(
                        'rawMaterials.batchEngine.sections.control.placeholders.selectPrepreg'
                      )
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none__'>
                {t(
                  'rawMaterials.batchEngine.sections.control.placeholders.none'
                )}
              </SelectItem>
              {prepregSpecs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {prepregOptionLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </BatchEngineControlField>

        <p className='min-h-5 text-xs font-semibold text-muted-foreground/80'>
          {selectedPrepregSpec
            ? `${t('rawMaterials.batchEngine.sections.control.prepregSummary.prefix')}: ${selectedPrepregSpec.widthMm || '--'}mm x ${selectedPrepregSpec.lengthM || '--'}m`
            : t(
                'rawMaterials.batchEngine.sections.control.prepregSummary.empty'
              )}
        </p>

        <div className='rounded-[14px] border border-dashed border-primary/30 bg-primary/5 p-3'>
          <div className='mb-2 flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-primary/80 uppercase'>
            <Package2 className='size-4' />
            {t(
              'rawMaterials.batchEngine.sections.control.blocks.rollSpec.title'
            )}
          </div>
          <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
            <BatchEngineControlField
              label={t(
                'rawMaterials.batchEngine.sections.control.fields.rollWidth'
              )}
            >
              <Input
                value={controls.rollWidthMm}
                readOnly
                className='h-8 rounded-lg bg-background text-xs font-semibold'
                placeholder='--'
              />
            </BatchEngineControlField>
            <BatchEngineControlField
              label={t(
                'rawMaterials.batchEngine.sections.control.fields.rollLength'
              )}
            >
              <Input
                value={controls.rollLengthM}
                readOnly
                className='h-8 rounded-lg bg-background text-xs font-semibold'
                placeholder='--'
              />
            </BatchEngineControlField>
          </div>
        </div>

        <div className='rounded-[14px] border border-dashed border-border/40 bg-muted/5 p-3'>
          <div className='mb-2 text-[10px] font-black tracking-[0.18em] text-muted-foreground/70 uppercase'>
            {t('rawMaterials.engineConfig.constraints.title')}
          </div>
          <p className='mb-3 text-[9px] font-black tracking-[0.16em] text-muted-foreground/50 uppercase'>
            {t('rawMaterials.engineConfig.constraints.description')}
          </p>
          <CuttingEnginePhysicalConstraintsPanel
            values={{
              knifeGapMm: controls.knifeGapMm,
              edgeTrimMm: controls.edgeTrimMm,
              maxSolveDurationSeconds: controls.maxSolveDurationSeconds,
            }}
            onChange={handlePhysicalConstraintChange}
            variant='grid'
          />
        </div>
      </div>
    </div>
  )
}
