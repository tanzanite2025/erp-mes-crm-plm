import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Settings2, XCircle } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { BASIC_SETTINGS_UNITS_QUERY_KEY } from '../query-keys'
import {
  unitService,
  type Unit,
  type UnitCategory,
} from '../services/unit-service'

interface UnitActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unit?: Unit | null
  onSaveSuccess?: () => void
}

const CATEGORY_OPTIONS: Array<{
  value: UnitCategory
  labelKey:
    | 'basicSettings.units.categories.quantity'
    | 'basicSettings.units.categories.weight'
    | 'basicSettings.units.categories.length'
    | 'basicSettings.units.categories.area'
    | 'basicSettings.units.categories.volume'
    | 'basicSettings.units.categories.time'
    | 'basicSettings.units.categories.other'
}> = [
  { value: 'QUANTITY', labelKey: 'basicSettings.units.categories.quantity' },
  { value: 'WEIGHT', labelKey: 'basicSettings.units.categories.weight' },
  { value: 'LENGTH', labelKey: 'basicSettings.units.categories.length' },
  { value: 'AREA', labelKey: 'basicSettings.units.categories.area' },
  { value: 'VOLUME', labelKey: 'basicSettings.units.categories.volume' },
  { value: 'TIME', labelKey: 'basicSettings.units.categories.time' },
  { value: 'OTHER', labelKey: 'basicSettings.units.categories.other' },
]

const EMPTY_FORM: Omit<Unit, 'id' | 'isSystem'> = {
  code: '',
  name: '',
  category: 'QUANTITY',
  precision: 0,
  status: 'active',
  description: '',
}

export function UnitActionDialog({
  open,
  onOpenChange,
  unit,
  onSaveSuccess,
}: UnitActionDialogProps) {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-md rounded-[24px]',
    header: 'p-6 pb-0 border-none bg-transparent',
    title:
      'flex items-center gap-2 text-primary font-black normal-case not-italic tracking-normal',
    description: 'text-[10px] font-black uppercase tracking-tighter opacity-70',
    body: 'grid gap-4 py-4 px-6',
    footer: 'gap-2 sm:gap-0 p-6 pt-0 border-none',
  })
  const initialFormData = useMemo<Omit<Unit, 'id' | 'isSystem'>>(
    () =>
      unit
        ? {
            code: unit.code,
            name: unit.name,
            category: unit.category,
            precision: unit.precision,
            status: unit.status,
            description: unit.description || '',
          }
        : EMPTY_FORM,
    [unit, open] // Include open to reset tracker when dialog re-opens
  )

  const tracker = useDeltaTracker(initialFormData)
  const formData = tracker.data

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name) return

    if (unit) {
      const delta = tracker.commit()
      // 如果没有变更，直接关闭
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      await unitService.patchUnit(unit.id, delta, unit.version)
    } else {
      await unitService.addUnit(formData)
    }

    await queryClient.invalidateQueries({
      queryKey: BASIC_SETTINGS_UNITS_QUERY_KEY,
    })
    onOpenChange(false)
    onSaveSuccess?.()
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <>
          <Settings2 className='size-5' />
          {unit
            ? t('basicSettings.units.dialog.editTitle')
            : t('basicSettings.units.dialog.createTitle')}
        </>
      }
      description={t('basicSettings.units.dialog.description')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='rounded-xl px-6 text-[11px] font-black uppercase'
          >
            {t('basicSettings.units.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.code || !formData.name}
            className='rounded-xl px-10 text-[11px] font-black tracking-wider uppercase shadow-lg shadow-primary/20'
          >
            {t('basicSettings.units.dialog.save')}
          </Button>
        </>
      }
    >
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='ml-1 text-[10px] font-black uppercase'>
            {t('basicSettings.units.dialog.fields.code')}
          </Label>
          <Input
            placeholder={t('basicSettings.units.dialog.placeholders.code')}
            value={formData.code}
            onChange={(e) => {
              formData.code = e.target.value.toUpperCase()
            }}
            disabled={unit?.isSystem}
            className='h-10 rounded-xl font-mono text-xs font-black uppercase'
          />
        </div>
        <div className='space-y-2'>
          <Label className='ml-1 text-[10px] font-black uppercase'>
            {t('basicSettings.units.dialog.fields.name')}
          </Label>
          <Input
            placeholder={t('basicSettings.units.dialog.placeholders.name')}
            value={formData.name}
            onChange={(e) => {
              formData.name = e.target.value
            }}
            className='h-10 rounded-xl text-xs font-bold'
          />
        </div>
      </div>

      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='ml-1 text-[10px] font-black uppercase'>
            {t('basicSettings.units.dialog.fields.category')}
          </Label>
          <select
            className='h-10 w-full rounded-xl border border-input bg-background/50 px-3 py-1 text-xs font-black shadow-sm outline-none focus:ring-1 focus:ring-primary'
            value={formData.category}
            onChange={(e) => {
              formData.category = e.target.value as UnitCategory
            }}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className='space-y-2'>
          <Label className='ml-1 text-[10px] font-black uppercase'>
            {t('basicSettings.units.dialog.fields.precision')}
          </Label>
          <Input
            type='number'
            min={0}
            max={6}
            value={formData.precision}
            onChange={(e) => {
              formData.precision = Math.min(
                6,
                Math.max(0, parseInt(e.target.value, 10) || 0)
              )
            }}
            className='h-10 rounded-xl font-mono text-xs font-black'
          />
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='ml-1 text-[10px] font-black uppercase'>
          {t('basicSettings.units.dialog.fields.status')}
        </Label>
        <div className='flex gap-2'>
          <button
            type='button'
            onClick={() => {
              formData.status = 'active'
            }}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
              formData.status === 'active'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                : 'bg-background opacity-40 grayscale hover:opacity-100'
            }`}
          >
            <CheckCircle2 className='size-3.5' />
            {t('basicSettings.units.dialog.status.active')}
          </button>
          <button
            type='button'
            onClick={() => {
              formData.status = 'inactive'
            }}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
              formData.status === 'inactive'
                ? 'border-red-200 bg-red-50 text-red-600'
                : 'bg-background opacity-40 grayscale hover:opacity-100'
            }`}
          >
            <XCircle className='size-3.5' />
            {t('basicSettings.units.dialog.status.inactive')}
          </button>
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='ml-1 text-[10px] font-black uppercase'>
          {t('basicSettings.units.dialog.fields.description')}
        </Label>
        <Input
          placeholder={t('basicSettings.units.dialog.placeholders.description')}
          value={formData.description}
          onChange={(e) => {
            formData.description = e.target.value
          }}
          className='h-10 rounded-xl text-xs font-medium'
        />
      </div>
    </ActionDialogShell>
  )
}
