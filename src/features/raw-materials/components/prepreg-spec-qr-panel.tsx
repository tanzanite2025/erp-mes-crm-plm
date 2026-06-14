import { useEffect, useMemo, useRef, useState } from 'react'
import { Printer, QrCode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  PrepregCleanedDimensionFields,
  PrepregCleanedResinBatchFields,
  PrepregFormState,
  PrepregMaterialSpec,
} from '../data/prepreg-material-spec-schema'
import {
  buildPrepregSpecQrSnapshot,
  canGeneratePrepregSpecQr,
} from '../data/prepreg-spec-qr'
import { openPrepregSpecQrPrintPreview } from '../services/prepreg-spec-qr-print-preview'

type GeneratedPrepregSpecQr = {
  fingerprint: string
  payloadText: string
  qrDataUrl: string
}

type PrepregSpecQrPanelProps = {
  form: PrepregFormState
  editingSpec?: PrepregMaterialSpec | null
  cleanedDimensions: PrepregCleanedDimensionFields
  cleanedResinBatch: PrepregCleanedResinBatchFields
}

export function PrepregSpecQrPanel({
  form,
  editingSpec,
  cleanedDimensions,
  cleanedResinBatch,
}: PrepregSpecQrPanelProps) {
  const { t } = useLanguage()
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [generated, setGenerated] = useState<GeneratedPrepregSpecQr | null>(
    null
  )
  const [isGenerating, setIsGenerating] = useState(false)

  const snapshot = useMemo(
    () =>
      buildPrepregSpecQrSnapshot({
        form,
        editingSpec,
        cleanedDimensions,
        cleanedResinBatch,
      }),
    [cleanedDimensions, cleanedResinBatch, editingSpec, form]
  )
  const canGenerate = canGeneratePrepregSpecQr(snapshot)

  useEffect(() => {
    setGenerated((current) => {
      if (!current) return current
      if (current.fingerprint === snapshot.fingerprint) return current
      return null
    })
  }, [snapshot.fingerprint])

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error(t('rawMaterials.catalog.toasts.requiredCodeAndName'))
      return
    }

    setIsGenerating(true)
    try {
      const canvas = document.createElement('canvas')
      await renderBwipBarcode({
        canvas,
        code: snapshot.payloadText,
        type: 'qrcode',
      })
      setGenerated({
        fingerprint: snapshot.fingerprint,
        payloadText: snapshot.payloadText,
        qrDataUrl: canvas.toDataURL('image/png'),
      })
      toast.success(t('rawMaterials.catalog.toasts.qrGenerated'))
    } catch {
      toast.error(t('rawMaterials.catalog.toasts.qrGenerateFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    if (!generated || !previewRef.current) {
      toast.error(t('rawMaterials.catalog.toasts.qrPrintBlocked'))
      return
    }

    openPrepregSpecQrPrintPreview({
      title: `${snapshot.payload.code || 'PREPREG'} QR`,
      contentHtml: previewRef.current.innerHTML,
      printLabel: t('rawMaterials.catalog.qr.actions.print'),
      closeLabel: t('rawMaterials.catalog.qr.actions.close'),
    })
  }

  const statusLabel = getPrepregStatusLabel(snapshot.payload.status, t)

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <p className='text-sm font-black tracking-tighter text-slate-900 italic'>
            {t('rawMaterials.catalog.qr.title')}
          </p>
          <p className='mt-1 text-[9px] font-black tracking-[0.18em] text-slate-500 uppercase'>
            {t('rawMaterials.catalog.qr.description')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className='h-9 rounded-full px-4 text-[10px] font-black tracking-[0.18em] uppercase'
          >
            {generated ? (
              <RefreshCw className='size-4' />
            ) : (
              <QrCode className='size-4' />
            )}
            {isGenerating
              ? t('rawMaterials.catalog.qr.actions.generating')
              : generated
                ? t('rawMaterials.catalog.qr.actions.regenerate')
                : t('rawMaterials.catalog.qr.actions.generate')}
          </Button>
          <Button
            type='button'
            onClick={handlePrint}
            disabled={!generated}
            className='h-9 rounded-full px-4 text-[10px] font-black tracking-[0.18em] uppercase'
          >
            <Printer className='size-4' />
            {t('rawMaterials.catalog.qr.actions.print')}
          </Button>
        </div>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]'>
        <div className='rounded-[20px] border border-dashed border-slate-300 bg-white p-4'>
          {generated ? (
            <div ref={previewRef} className='grid gap-3'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-black tracking-tighter text-slate-900 italic'>
                    {snapshot.title}
                  </p>
                  <p className='mt-1 text-[9px] font-black tracking-[0.16em] text-slate-500 uppercase'>
                    {t('rawMaterials.catalog.qr.previewDescription')}
                  </p>
                </div>
                <Badge className='h-5 rounded-full bg-slate-900 px-2.5 font-mono text-[8px] text-white'>
                  {snapshot.payload.protocol}
                </Badge>
              </div>

              <div className='rounded-[20px] border border-dashed border-slate-200 bg-slate-50 p-4'>
                <img
                  src={generated.qrDataUrl}
                  alt={t('rawMaterials.catalog.qr.previewAlt')}
                  className='mx-auto size-52 rounded-2xl bg-white p-2'
                />
              </div>

              <div className='grid gap-1 text-xs font-semibold text-slate-700'>
                <p>
                  {t('rawMaterials.catalog.form.code.label')}:{' '}
                  {snapshot.payload.code || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.name.label')}:{' '}
                  {snapshot.payload.name || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.displayAlias.label')}:{' '}
                  {snapshot.payload.displayAlias || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.supplier.label')}:{' '}
                  {snapshot.payload.supplierProductCode || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.resinContentBatchRaw.label')}:{' '}
                  {snapshot.resinLabel || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.widthMm.label')}:{' '}
                  {snapshot.payload.widthMm || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.cleanedPreview.lengthM')}:{' '}
                  {snapshot.payload.lengthM || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.nominalAreaM2.label')}:{' '}
                  {snapshot.payload.nominalAreaM2 || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.productionDate.label')}:{' '}
                  {snapshot.payload.productionDate || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.boxNo.label')}:{' '}
                  {snapshot.payload.boxNo || '--'}
                </p>
                <p>
                  {t('rawMaterials.catalog.form.status.label')}: {statusLabel}
                </p>
              </div>
            </div>
          ) : (
            <div className='flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/80 px-4 text-center'>
              <QrCode className='size-10 text-slate-400' />
              <p className='text-sm font-black tracking-tighter text-slate-700 italic'>
                {t('rawMaterials.catalog.qr.empty')}
              </p>
              <p className='max-w-xs text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase'>
                {t('rawMaterials.catalog.qr.requirements')}
              </p>
            </div>
          )}
        </div>

        <div className='grid gap-3'>
          <div className='rounded-[20px] border border-dashed border-slate-300 bg-white p-4'>
            <p className='text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase'>
              {t('rawMaterials.catalog.qr.previewTitle')}
            </p>
            <div className='mt-3 grid gap-2 md:grid-cols-2'>
              <InfoChip
                label={t('rawMaterials.catalog.form.code.label')}
                value={snapshot.payload.code || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.name.label')}
                value={snapshot.payload.name || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.displayAlias.label')}
                value={snapshot.payload.displayAlias || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.supplier.label')}
                value={snapshot.payload.supplierProductCode || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.fiberModel.label')}
                value={snapshot.payload.fiberModel || '--'}
              />
              <InfoChip
                label={t(
                  'rawMaterials.catalog.form.resinContentBatchRaw.label'
                )}
                value={snapshot.resinLabel || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.widthMm.label')}
                value={snapshot.payload.widthMm || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.cleanedPreview.lengthM')}
                value={snapshot.payload.lengthM || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.nominalAreaM2.label')}
                value={snapshot.payload.nominalAreaM2 || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.inspector.label')}
                value={snapshot.payload.inspector || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.boxNo.label')}
                value={snapshot.payload.boxNo || '--'}
              />
              <InfoChip
                label={t('rawMaterials.catalog.form.productionDate.label')}
                value={snapshot.payload.productionDate || '--'}
              />
            </div>
          </div>

          <div className='rounded-[20px] border border-dashed border-slate-300 bg-white p-4'>
            <p className='text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase'>
              {t('rawMaterials.catalog.qr.payload')}
            </p>
            <div className='mt-3 rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-3'>
              <p className='text-[9px] font-black tracking-[0.16em] text-slate-500 uppercase'>
                {t('rawMaterials.catalog.qr.generatedFromCleaned')}
              </p>
              <pre className='mt-2 overflow-x-auto font-mono text-[11px] leading-5 break-all whitespace-pre-wrap text-slate-700'>
                {generated?.payloadText || snapshot.payloadText}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getPrepregStatusLabel(
  status: PrepregMaterialSpec['status'],
  t: ReturnType<typeof useLanguage>['t']
) {
  if (status === 'Inactive') return t('rawMaterials.catalog.status.inactive')
  if (status === 'Archived') return t('rawMaterials.catalog.status.archived')
  return t('rawMaterials.catalog.status.active')
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2'>
      <p className='text-[8px] font-black tracking-[0.16em] text-slate-500 uppercase'>
        {label}
      </p>
      <p className='mt-1 text-xs font-semibold text-slate-800'>{value}</p>
    </div>
  )
}
