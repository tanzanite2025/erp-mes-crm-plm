import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Coins, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { financeQueryKeys } from '@/features/finance/query-keys'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import type { PieceworkRate } from '../data/schema'
import { useGetPieceworkPayItems } from '../hooks/use-independent-piecework-payroll'
import {
  buildPieceworkFinanceActionDialogShellClasses,
  pieceworkFinanceDialogActionClassName,
  pieceworkFinanceFieldControlClassName,
  pieceworkFinanceFieldLabelClassName,
  pieceworkFinanceSecondaryActionClassName,
} from './piecework-finance-page-controls-and-action-dialog.styles'

interface RateActionDialogProps {
  currentRow?: PieceworkRate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: PieceworkRate
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void
  isLoading?: boolean
}

export function RateActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: RateActionDialogProps) {
  const { t } = useLanguage()
  const shellClasses = buildPieceworkFinanceActionDialogShellClasses()
  const { data: items = [] } = useGetPieceworkPayItems()
  const currenciesQuery = useQuery({
    queryKey: financeQueryKeys.currencies(),
    queryFn: () => CurrencyCoreService.getCurrencies(),
    enabled: open,
    select: (currencies) =>
      currencies.map(({ code, name, status }) => ({ code, name, status })),
  })
  const currencyOptions = (currenciesQuery.data ?? []).filter(
    (currency) =>
      currency.status === 'Active' || currency.code === currentRow?.currency
  )
  const initial = useMemo<PieceworkRate>(
    () =>
      currentRow
        ? { ...currentRow }
        : {
            id: '',
            payItemId: '',
            payItemCode: '',
            payItemName: '',
            unit: '',
            unitPrice: 0,
            currency: '',
            effectiveFrom: '',
            effectiveTo: '',
            status: 'active',
            version: 1,
            remarks: '',
          },
    [currentRow]
  )
  const { data, tracker } = useDeltaTracker(initial, open)
  const hasSelectedSystemCurrency =
    !currenciesQuery.isPending &&
    !currenciesQuery.isError &&
    currencyOptions.some((currency) => currency.code === data.currency)
  const updatePieceworkRateFormFields = (updates: Partial<PieceworkRate>) => {
    Object.assign(data, updates)
  }
  const handleSaveRateForm = (event: React.FormEvent) => {
    event.preventDefault()
    if (
      !data.payItemId ||
      !data.unit ||
      !data.effectiveFrom ||
      !hasSelectedSystemCurrency
    ) {
      toast.error(t('piecework.payroll.required'))
      return
    }
    if (
      !Number.isFinite(data.unitPrice) ||
      data.unitPrice < 0 ||
      data.unitPrice > 999999.9999
    ) {
      toast.error(t('piecework.payroll.invalidNumber'))
      return
    }
    if (currentRow) {
      const delta = tracker.commit()
      if (!Object.keys(delta).length) {
        onOpenChange(false)
        return
      }
      onSave({ data, isPatch: true, delta, version: currentRow.version })
    } else onSave({ data, isPatch: false })
  }
  return (
    <ActionDialogShell
      open={open}
      onOpenChange={(next) => {
        if (!isLoading) onOpenChange(next)
      }}
      title={
        <>
          <Coins className='size-5 shrink-0 text-primary' />
          {t(
            currentRow
              ? 'piecework.payroll.editRate'
              : 'piecework.payroll.addRate'
          )}
        </>
      }
      description={t('piecework.payroll.rates')}
      descriptionClassName='sr-only'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      titleClassName={shellClasses.title}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      footer={
        <>
          <Button
            className={pieceworkFinanceDialogActionClassName}
            variant='ghost'
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            {t('piecework.payroll.cancel')}
          </Button>
          <Button
            className={`${pieceworkFinanceDialogActionClassName} shadow-lg shadow-primary/20`}
            type='submit'
            form='piecework-rate-form'
            disabled={isLoading || !hasSelectedSystemCurrency}
          >
            <Save className='size-4' />
            {t('piecework.payroll.save')}
          </Button>
        </>
      }
    >
      <form
        id='piecework-rate-form'
        onSubmit={handleSaveRateForm}
        className='grid gap-4'
      >
        <fieldset disabled={isLoading} className='grid gap-4'>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='rate-pay-item'
            >
              {t('piecework.payroll.item')}
            </Label>
            <select
              id='rate-pay-item'
              required
              value={data.payItemId}
              className={pieceworkFinanceFieldControlClassName}
              onChange={(event) => {
                const item = items.find(
                  (entry) => entry.id === event.target.value
                )
                Object.assign(data, {
                  payItemId: item?.id || '',
                  unit: item?.unit || '',
                  payItemCode: item?.code || '',
                  payItemName: item?.name || '',
                })
              }}
            >
              <option value=''>{t('piecework.payroll.choose')}</option>
              {items
                .filter(
                  (item) =>
                    item.status === 'active' || item.id === data.payItemId
                )
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </option>
                ))}
            </select>
          </div>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='grid gap-2'>
              <Label
                className={pieceworkFinanceFieldLabelClassName}
                htmlFor='rate-price'
              >
                {t('piecework.payroll.unitPrice')}
              </Label>
              <Input
                id='rate-price'
                className={pieceworkFinanceFieldControlClassName}
                type='number'
                required
                min='0'
                max='999999.9999'
                step='0.0001'
                value={data.unitPrice}
                onChange={(event) => {
                  updatePieceworkRateFormFields({
                    unitPrice: Number(event.target.value),
                  })
                }}
              />
            </div>
            <div className='grid gap-2'>
              <Label
                className={pieceworkFinanceFieldLabelClassName}
                htmlFor='rate-unit'
              >
                {t('piecework.payroll.unit')}
              </Label>
              <Input
                className={pieceworkFinanceFieldControlClassName}
                id='rate-unit'
                readOnly
                value={data.unit}
              />
            </div>
            <div className='grid gap-2'>
              <Label
                className={pieceworkFinanceFieldLabelClassName}
                htmlFor='rate-start'
              >
                {t('piecework.payroll.effectiveFrom')}
              </Label>
              <Input
                id='rate-start'
                className={pieceworkFinanceFieldControlClassName}
                type='date'
                required
                value={data.effectiveFrom?.slice(0, 10) || ''}
                onChange={(event) => {
                  updatePieceworkRateFormFields({
                    effectiveFrom: event.target.value,
                  })
                }}
              />
            </div>
            <div className='grid gap-2'>
              <Label
                className={pieceworkFinanceFieldLabelClassName}
                htmlFor='rate-end'
              >
                {t('piecework.payroll.effectiveTo')}
              </Label>
              <Input
                id='rate-end'
                className={pieceworkFinanceFieldControlClassName}
                type='date'
                value={data.effectiveTo?.slice(0, 10) || ''}
                onChange={(event) => {
                  updatePieceworkRateFormFields({
                    effectiveTo: event.target.value,
                  })
                }}
              />
            </div>
          </div>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='rate-currency'
            >
              {t('piecework.payroll.currency')}
            </Label>
            <select
              id='rate-currency'
              className={pieceworkFinanceFieldControlClassName}
              required
              disabled={
                currenciesQuery.isPending ||
                currenciesQuery.isError ||
                currencyOptions.length === 0
              }
              value={data.currency}
              onChange={(event) => {
                updatePieceworkRateFormFields({
                  currency: event.target.value,
                })
              }}
            >
              <option value=''>
                {t(
                  currenciesQuery.isPending
                    ? 'piecework.payroll.loading'
                    : !currenciesQuery.isError && currencyOptions.length === 0
                      ? 'piecework.payroll.noAvailableCurrencies'
                      : 'piecework.payroll.choose'
                )}
              </option>
              {currencyOptions.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} / {currency.name}
                  {currency.status !== 'Active'
                    ? ` (${t('piecework.payroll.inactive')})`
                    : ''}
                </option>
              ))}
            </select>
            {currenciesQuery.isError && (
              <div className='flex flex-wrap items-center gap-2'>
                <p role='alert' className='text-xs text-destructive'>
                  {t('piecework.payroll.currencyLoadFailed')}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className={pieceworkFinanceSecondaryActionClassName}
                  disabled={currenciesQuery.isFetching}
                  onClick={() => void currenciesQuery.refetch()}
                >
                  <RefreshCw className='size-4' />
                  {t('piecework.payroll.refresh')}
                </Button>
              </div>
            )}
          </div>
          <div className='flex items-center justify-between gap-3 rounded-xl bg-muted/45 px-4 py-3'>
            <Switch
              id='rate-active'
              checked={data.status === 'active'}
              onCheckedChange={(checked) => {
                updatePieceworkRateFormFields({
                  status: checked ? 'active' : 'inactive',
                })
              }}
            />
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='rate-active'
            >
              {t('piecework.payroll.active')}
            </Label>
          </div>
          <div className='grid gap-2'>
            <Label
              className={pieceworkFinanceFieldLabelClassName}
              htmlFor='rate-remarks'
            >
              {t('piecework.payroll.remarks')}
            </Label>
            <Textarea
              id='rate-remarks'
              className={`${pieceworkFinanceFieldControlClassName} min-h-24 py-3`}
              value={data.remarks || ''}
              onChange={(event) => {
                updatePieceworkRateFormFields({ remarks: event.target.value })
              }}
            />
          </div>
        </fieldset>
      </form>
    </ActionDialogShell>
  )
}
