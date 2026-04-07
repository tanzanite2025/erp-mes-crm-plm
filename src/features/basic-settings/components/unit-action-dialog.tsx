import { useMemo } from 'react'
import { CheckCircle2, Settings2, XCircle } from 'lucide-react'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { unitService, type Unit, type UnitCategory } from '../services/unit-service'

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
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-md rounded-[24px]',
    header: 'p-6 pb-0 border-none bg-transparent',
    title: 'flex items-center gap-2 text-primary font-black normal-case not-italic tracking-normal',
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

    onOpenChange(false)
    onSaveSuccess?.()
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={handleOpenChange}
      title={(
        <>
          <Settings2 className='size-5' />
          {unit
            ? t('basicSettings.units.dialog.editTitle')
            : t('basicSettings.units.dialog.createTitle')}
        </>
      )}
      description={t('basicSettings.units.dialog.description')}
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <Button
            variant='ghost'
            onClick={() => onOpenChange(false)}
            className='rounded-xl px-6 font-black text-[11px] uppercase'
          >
            {t('basicSettings.units.dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.code || !formData.name}
            className='rounded-xl px-10 font-black text-[11px] uppercase tracking-wider shadow-lg shadow-primary/20'
          >
            {t('basicSettings.units.dialog.save')}
          </Button>
        </>
      )}
    >
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase ml-1'>
                {t('basicSettings.units.dialog.fields.code')}
              </Label>
              <Input
                placeholder={t('basicSettings.units.dialog.placeholders.code')}
                value={formData.code}
                onChange={(e) => {
                  formData.code = e.target.value.toUpperCase()
                }}
                disabled={unit?.isSystem}
                className='h-10 font-mono font-black text-xs uppercase rounded-xl'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase ml-1'>
                {t('basicSettings.units.dialog.fields.name')}
              </Label>
              <Input
                placeholder={t('basicSettings.units.dialog.placeholders.name')}
                value={formData.name}
                onChange={(e) => {
                  formData.name = e.target.value
                }}
                className='h-10 font-bold text-xs rounded-xl'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase ml-1'>
                {t('basicSettings.units.dialog.fields.category')}
              </Label>
              <select
                className='w-full h-10 rounded-xl border border-input bg-background/50 px-3 py-1 text-xs font-black shadow-sm outline-none focus:ring-1 focus:ring-primary'
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
              <Label className='text-[10px] font-black uppercase ml-1'>
                {t('basicSettings.units.dialog.fields.precision')}
              </Label>
              <Input
                type='number'
                min={0}
                max={6}
                value={formData.precision}
                onChange={(e) => {
                  formData.precision = Math.min(6, Math.max(0, parseInt(e.target.value, 10) || 0))
                }}
                className='h-10 font-mono font-black text-xs rounded-xl'
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase ml-1'>
              {t('basicSettings.units.dialog.fields.status')}
            </Label>
            <div className='flex gap-2'>
              <button
                type='button'
                onClick={() => {
                  formData.status = 'active'
                }}
                className={`flex-1 h-10 rounded-xl border text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                  formData.status === 'active'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-background grayscale opacity-40 hover:opacity-100'
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
                className={`flex-1 h-10 rounded-xl border text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                  formData.status === 'inactive'
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-background grayscale opacity-40 hover:opacity-100'
                }`}
              >
                <XCircle className='size-3.5' />
                {t('basicSettings.units.dialog.status.inactive')}
              </button>
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase ml-1'>
              {t('basicSettings.units.dialog.fields.description')}
            </Label>
            <Input
              placeholder={t('basicSettings.units.dialog.placeholders.description')}
              value={formData.description}
              onChange={(e) => {
                formData.description = e.target.value
              }}
              className='h-10 font-medium text-xs rounded-xl'
            />
          </div>
    </ActionDialogShell>
  )
}
