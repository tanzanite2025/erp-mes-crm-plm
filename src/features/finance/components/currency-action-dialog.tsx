import { useMemo } from 'react'
import { Star, RefreshCcw, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { isConflictError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { PRESET_CURRENCIES } from '../data/currency-constants'
import { type Currency } from '../data/schema'
import {
  CurrencyMaintenanceService,
  type CreateCurrencyPayload,
} from '../services/currency-maintenance-service'

interface CurrencyActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCurrency: Currency | null
  currencies: Currency[]
  onSuccess: () => Promise<unknown> | unknown
}

const DEFAULT_CURRENCY: Partial<Currency> = {
  code: '',
  name: '',
  symbol: '',
  rate: 1.0,
  precision: 2,
  status: 'Active',
  isBase: false,
}

export function CurrencyActionDialog({
  open,
  onOpenChange,
  editingCurrency,
  currencies,
  onSuccess,
}: CurrencyActionDialogProps) {
  const { t } = useLanguage()
  const isEdit = !!editingCurrency
  const baseCurrency = useMemo(
    () => currencies.find((currency) => currency.isBase) ?? null,
    [currencies]
  )
  const baseCurrencyCode = baseCurrency?.code || 'CNY'

  const shellClasses = buildActionDialogShellClasses({
    content: 'max-w-[95vw] sm:max-w-[500px] rounded-[32px]',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title:
      'text-xl font-black italic tracking-tighter uppercase flex items-center gap-3',
    description: 'text-[10px] font-bold uppercase tracking-widest opacity-50',
    body: 'p-8 pt-4 space-y-6',
    footer:
      'p-6 bg-muted/5 border-t border-dashed border-muted/20 flex items-center justify-end gap-3',
  })

  const initialFormData = useMemo(
    () => (editingCurrency ? editingCurrency : (DEFAULT_CURRENCY as Currency)),
    [editingCurrency]
  )
  const { data: formData, tracker } = useDeltaTracker(initialFormData, open)

  const handleSave = async () => {
    if (!formData.code) return

    try {
      const isPatch = isEdit
      const data = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        symbol: formData.symbol.trim(),
        id: editingCurrency?.id,
        isBase: editingCurrency?.isBase || false,
      } as Currency

      if (isPatch && editingCurrency?.id) {
        const delta = tracker.commit()
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }
        await CurrencyMaintenanceService.patchCurrency(
          editingCurrency.id,
          delta,
          editingCurrency.version
        )
      } else {
        const createPayload: CreateCurrencyPayload = {
          code: data.code,
          name: data.name,
          symbol: data.symbol,
          rate: data.rate,
          precision: data.precision,
          status: data.status,
          isBase: data.isBase,
        }
        await CurrencyMaintenanceService.saveCurrency(createPayload)
      }

      toast.success(
        isPatch
          ? t('finance.currencyRates.toast.saveSuccessUpdated')
          : t('finance.currencyRates.toast.saveSuccessCreated')
      )

      await onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isConflictError(error)) {
        toast.error(t('finance.paymentTerms.toast.conflict'))
        return
      }
      toast.error(t('finance.paymentTerms.toast.saveFailed'))
    }
  }

  const filteredPresets = PRESET_CURRENCIES.filter(
    (preset) => !currencies.some((curr) => curr.code === preset.code)
  )

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <Coins className='size-6 text-primary' />
          {isEdit
            ? t('finance.currencyRates.dialog.editTitle')
            : t('finance.currencyRates.dialog.createTitle')}
        </>
      }
      description={t('finance.currencyRates.dialog.templateHint')}
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
            className='h-12 rounded-full px-8 text-[10px] font-black tracking-widest uppercase'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.code}
            className='h-12 rounded-full bg-primary px-10 font-black tracking-widest text-primary-foreground uppercase shadow-lg shadow-primary/20'
          >
            {isEdit
              ? t('finance.currencyRates.dialog.save')
              : t('finance.currencyRates.dialog.confirm')}
          </Button>
        </>
      }
    >
      <div className='space-y-6'>
        {!isEdit && (
          <div className='space-y-3 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-emerald-600 uppercase'>
              <Star className='size-3 animate-pulse' />{' '}
              {t('finance.currencyRates.dialog.templateLabel')}
            </Label>
            <Select
              onValueChange={(val) => {
                const preset = PRESET_CURRENCIES.find((p) => p.code === val)
                if (preset) {
                  formData.code = preset.code
                  formData.name = t(
                    `finance.currencyRates.names.${preset.code}` as any
                  )
                  formData.symbol = preset.symbol
                  formData.precision = preset.precision
                }
              }}
            >
              <SelectTrigger className='h-12 rounded-2xl border-none bg-white font-bold shadow-sm'>
                <SelectValue
                  placeholder={t(
                    'finance.currencyRates.dialog.templatePlaceholder'
                  )}
                />
              </SelectTrigger>
              <SelectContent className='rounded-2xl border-none shadow-2xl'>
                {filteredPresets.map((p) => (
                  <SelectItem
                    key={p.code}
                    value={p.code}
                    className='rounded-xl py-3'
                  >
                    <span className='font-black italic'>{p.code}</span> -{' '}
                    {t(`finance.currencyRates.names.${p.code}` as any)} (
                    {p.symbol})
                  </SelectItem>
                ))}
                {filteredPresets.length === 0 && (
                  <div className='p-4 text-center text-[10px] font-bold text-muted-foreground uppercase italic'>
                    {t('finance.currencyRates.dialog.allTemplatesAdded')}
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.currencyRates.dialog.codeLabel')}
            </Label>
            <Input
              placeholder={t('finance.currencyRates.dialog.codePlaceholder')}
              value={formData.code}
              readOnly={isEdit || !!formData.code}
              onChange={(e) => {
                formData.code = e.target.value.toUpperCase()
              }}
              className={`h-12 rounded-2xl font-black italic ${isEdit || formData.code ? 'border-none bg-muted/30' : 'bg-muted/50'}`}
            />
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.currencyRates.dialog.nameLabel')}
            </Label>
            <Input
              placeholder={t('finance.currencyRates.dialog.namePlaceholder')}
              value={formData.name}
              readOnly={!!formData.code && !isEdit}
              onChange={(e) => {
                formData.name = e.target.value
              }}
              className={`h-12 rounded-2xl font-bold ${formData.code && !isEdit ? 'border-none bg-muted/30' : 'bg-muted/50'}`}
            />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.currencyRates.dialog.symbolLabel')}
            </Label>
            <Input
              placeholder={t('finance.currencyRates.dialog.symbolPlaceholder')}
              value={formData.symbol}
              readOnly={!!formData.code && !isEdit}
              onChange={(e) => {
                formData.symbol = e.target.value
              }}
              className={`h-12 rounded-2xl font-bold ${formData.code && !isEdit ? 'border-none bg-muted/30' : 'bg-muted/50'}`}
            />
          </div>
          <div className='space-y-2'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('finance.currencyRates.dialog.precisionLabel')}
            </Label>
            <Input
              type='number'
              value={formData.precision}
              readOnly={!!formData.code && !isEdit}
              onChange={(e) => {
                formData.precision = parseInt(e.target.value)
              }}
              className={`h-12 rounded-2xl font-mono font-bold ${formData.code && !isEdit ? 'border-none bg-muted/30' : 'bg-muted/50'}`}
            />
          </div>
        </div>

        {isEdit ? (
          <div className='space-y-3'>
            <Label className='pl-1 text-[10px] font-black tracking-widest uppercase'>
              {t('finance.currencyRates.dialog.rateLabel')}
            </Label>
            <div className='relative'>
              <Input
                type='number'
                step='0.0001'
                disabled={editingCurrency?.isBase}
                value={formData.rate}
                onChange={(e) => {
                  formData.rate = parseFloat(e.target.value)
                }}
                className='h-12 rounded-2xl border-dashed border-emerald-500/30 bg-emerald-500/5 font-black text-emerald-600 italic'
              />
              {editingCurrency?.isBase && (
                <div className='absolute top-1/2 right-3 -translate-y-1/2'>
                  <span className='rounded-full bg-emerald-600 px-3 py-1 text-[8px] font-black tracking-tighter text-white uppercase shadow-sm'>
                    {t('finance.currencyRates.dialog.rateLocked')}
                  </span>
                </div>
              )}
            </div>
            {editingCurrency?.isBase ? (
              <p className='flex items-center gap-2 pl-1 text-[8px] font-bold tracking-widest text-orange-500 uppercase'>
                <span className='size-1 animate-pulse rounded-full bg-orange-500' />
                {t('finance.currencyRates.dialog.baseRateHint')}
              </p>
            ) : (
              <p className='mt-2 pl-1 text-[8px] leading-relaxed font-bold tracking-widest text-muted-foreground/60 uppercase'>
                {t('finance.currencyRates.dialog.manualRateWarning')}
              </p>
            )}
            <p className='pl-1 text-[9px] font-bold tracking-wide text-muted-foreground/70'>
              {`1 ${formData.code || 'CUR'} = ${(formData.rate ?? 1).toFixed(4)} ${baseCurrencyCode}`}
            </p>
          </div>
        ) : (
          <div className='flex items-start gap-4 rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-5'>
            <div className='rounded-xl bg-amber-500/10 p-2'>
              <RefreshCcw className='animate-spin-slow size-4 text-amber-600' />
            </div>
            <div className='space-y-1.5'>
              <p className='text-[10px] font-black tracking-tight text-amber-600 uppercase italic'>
                {t('finance.currencyRates.dialog.syncModeTitle')}
              </p>
              <p className='text-[8px] leading-relaxed font-bold tracking-widest text-amber-600/60 uppercase'>
                {t('finance.currencyRates.dialog.syncModeDesc')}
              </p>
            </div>
          </div>
        )}
      </div>
    </ActionDialogShell>
  )
}
