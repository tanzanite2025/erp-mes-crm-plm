import { useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { ConfiguredActiveUnitSelect } from '@/features/basic-settings/components/configured-active-unit-select'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { useQualityMutations } from '../hooks/use-quality'
import type { QualityAbnormality } from '../services/quality-core-service'
import type { RecordQualityAbnormalityDisposalPayload } from '../services/quality-maintenance-service'

export function QualityAbnormalityDisposalConfirmationDialog({
  abnormality,
  onClose,
}: {
  abnormality: QualityAbnormality
  onClose: () => void
}) {
  const { t } = useLanguage()
  const permission = usePermissionActions()
  const { recordAbnormalityDisposalMutation: mutation } = useQualityMutations()
  const [saved, setSaved] = useState<QualityAbnormality | null>(null)
  const [method, setMethod] = useState(abnormality.disposalMethod || '')
  const [quantity, setQuantity] = useState(
    abnormality.scrapQuantity?.toString() ?? ''
  )
  const [unit, setUnit] = useState(abnormality.scrapUnit || '')
  const [error, setError] = useState('')
  const record = saved ?? abnormality
  const sourceOwnsDisposition =
    record.inspectionTask?.sourceType === 'PRODUCTION_OUTSOURCE'
  const readOnly = Boolean(
    saved ||
    record.status !== 'OPEN' ||
    permission.isChecking ||
    !permission.allowsAction('action_quality_abnormality_dispose')
  )
  const units = useUnitsQuery({
    enabled: !readOnly && !sourceOwnsDisposition && method === 'SCRAP',
  })
  const isScrapUnitAvailable = units.units.some(
    (configuredUnit) =>
      configuredUnit.code === unit && configuredUnit.status === 'active'
  )

  async function confirmQualityAbnormalityDisposalAndClose() {
    if (readOnly || mutation.isPending) return
    if (!['SCRAP', 'REWORK', 'CONCESSION'].includes(method)) {
      setError(t('quality.disposal.methodRequired'))
      return
    }
    if (
      method === 'SCRAP' &&
      (!Number.isFinite(Number(quantity)) ||
        Number(quantity) <= 0 ||
        !unit ||
        (!sourceOwnsDisposition &&
          (!isScrapUnitAvailable || units.isLoading || units.error)))
    ) {
      setError(t('quality.disposal.scrapRequired'))
      return
    }
    setError('')
    const data: RecordQualityAbnormalityDisposalPayload = {
      disposalMethod:
        method as RecordQualityAbnormalityDisposalPayload['disposalMethod'],
    }
    if (method === 'SCRAP') {
      data.scrapQuantity = Number(quantity)
      data.scrapUnit = unit
    }
    try {
      const result = await mutation.mutateAsync({ id: record.id, data })
      setSaved(result)
    } catch {
      setError(t('quality.disposal.saveFailed'))
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent
        className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          if (mutation.isPending) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('quality.disposal.title')}</DialogTitle>
          <DialogDescription>
            {t('quality.disposal.description')}
          </DialogDescription>
        </DialogHeader>
        <p className='text-sm break-words'>{record.description}</p>
        <dl className='grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2'>
          {(
            [
              ['task', record.taskId || record.inspectionTask?.id],
              [
                'product',
                record.inspectionTask?.productName || record.productId,
              ],
              ['batch', record.batchNo],
              ['plan', record.productionPlanId],
              ['order', record.orderId],
              ['occurredAt', record.occurredAt],
            ] as const
          ).map(([field, value]) => (
            <div key={field} className='min-w-0'>
              <dt className='text-muted-foreground'>
                {t(`quality.disposal.${field}`)}
              </dt>
              <dd className='break-words'>{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {readOnly ? (
          <p role='status' className='text-sm text-muted-foreground'>
            {t(
              saved || record.status === 'CLOSED'
                ? 'quality.disposal.closed'
                : record.status !== 'OPEN'
                  ? 'quality.disposal.unavailable'
                  : 'quality.disposal.readOnly'
            )}
          </p>
        ) : null}
        {sourceOwnsDisposition ? (
          <p className='text-sm text-muted-foreground'>
            {t('quality.disposal.outsourceLocked')}
          </p>
        ) : null}
        <div className='space-y-2'>
          <Label htmlFor='quality-abnormality-disposal-method'>
            {t('quality.disposal.method')}
          </Label>
          <Select
            value={method}
            onValueChange={setMethod}
            disabled={readOnly || sourceOwnsDisposition || mutation.isPending}
          >
            <SelectTrigger
              id='quality-abnormality-disposal-method'
              className='w-full'
            >
              <SelectValue placeholder={t('quality.disposal.methodRequired')} />
            </SelectTrigger>
            <SelectContent>
              {(['SCRAP', 'REWORK', 'CONCESSION'] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`quality.disposal.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {method === 'SCRAP' ? (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='quality-abnormality-scrap-quantity'>
                {t('quality.disposal.quantity')}
              </Label>
              <Input
                id='quality-abnormality-scrap-quantity'
                type='number'
                min='0'
                step='any'
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={
                  readOnly || sourceOwnsDisposition || mutation.isPending
                }
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='quality-abnormality-scrap-unit'>
                {t('quality.disposal.unit')}
              </Label>
              {readOnly || sourceOwnsDisposition ? (
                <Input
                  id='quality-abnormality-scrap-unit'
                  value={unit}
                  disabled
                />
              ) : (
                <ConfiguredActiveUnitSelect
                  labels={{
                    placeholder: t('quality.disposal.unitPlaceholder'),
                    empty: t('quality.disposal.unitsEmpty'),
                    loadFailed: t('quality.disposal.unitsLoadFailed'),
                    unavailable: t('quality.disposal.unitUnavailable'),
                  }}
                  id='quality-abnormality-scrap-unit'
                  value={unit}
                  onValueChange={setUnit}
                  disabled={mutation.isPending}
                />
              )}
            </div>
            <p className='text-sm text-muted-foreground sm:col-span-2'>
              {t('quality.disposal.quantityHint')}
            </p>
          </div>
        ) : null}
        {record.resolver ? (
          <p className='text-sm break-words'>
            {t('quality.disposal.resolver')}: {record.resolver}
          </p>
        ) : null}
        {error ? (
          <p role='alert' className='text-sm text-destructive'>
            {error}
          </p>
        ) : null}
        <div className='flex flex-wrap justify-end gap-2'>
          <Button
            variant='outline'
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('quality.disposal.close')}
          </Button>
          {!readOnly ? (
            <Button
              onClick={() => void confirmQualityAbnormalityDisposalAndClose()}
              disabled={mutation.isPending}
            >
              {t(
                mutation.isPending
                  ? 'quality.disposal.saving'
                  : 'quality.disposal.confirm'
              )}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
