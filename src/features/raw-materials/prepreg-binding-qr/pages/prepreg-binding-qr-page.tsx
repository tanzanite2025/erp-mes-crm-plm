import { useMemo, useState } from 'react'
import { Printer, QrCode, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PrepregMaterialSpecService } from '../../services/prepreg-material-spec-service'
import { PrepregBindingQrGrid } from '../components/prepreg-binding-qr-grid'
import {
  clampPrepregBindingQrQuantity,
  type PrepregBindingQrItem,
} from '../data/prepreg-binding-qr'
import { openPrepregBindingQrPrintPreview } from '../services/prepreg-binding-qr-print-preview'
import { buildPrepregBindingQrDeepLink } from '../services/prepreg-binding-token-service'

type RenderedPrepregBindingQrItem = PrepregBindingQrItem & {
  qrDataUrl: string
}

function formatBatchExpiresAt(value: string): string {
  if (!value.trim()) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildRemainingValidityLabel(expiresAt: string): string {
  const target = new Date(expiresAt)
  if (Number.isNaN(target.getTime())) return '--'

  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return '0'

  const totalMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function PrepregBindingQrPage() {
  const { t } = useLanguage()
  const [quantityInput, setQuantityInput] = useState('24')
  const [items, setItems] = useState<RenderedPrepregBindingQrItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const batchValidity = useMemo(() => {
    const expiresAt = items[0]?.expiresAt?.trim() || ''
    if (!expiresAt) return null
    return {
      expiresAt,
      remaining: buildRemainingValidityLabel(expiresAt),
      formattedExpiresAt: formatBatchExpiresAt(expiresAt),
    }
  }, [items])

  const handleGenerate = async () => {
    const quantity = clampPrepregBindingQrQuantity(
      Number.parseInt(quantityInput || '0', 10)
    )
    setQuantityInput(String(quantity))
    setIsGenerating(true)

    try {
      const nextBatch =
        await PrepregMaterialSpecService.createBindingTokenBatch(quantity)
      const renderedItems: RenderedPrepregBindingQrItem[] = []
      for (const item of nextBatch) {
        const canvas = document.createElement('canvas')
        await renderBwipBarcode({
          canvas,
          code: buildPrepregBindingQrDeepLink(item.token),
          type: 'qrcode',
        })
        renderedItems.push({
          ...item,
          qrDataUrl: canvas.toDataURL('image/png'),
        })
      }
      setItems(renderedItems)
      toast.success(t('rawMaterials.bindingQr.toasts.generated'))
    } catch {
      toast.error(t('rawMaterials.bindingQr.toasts.generateFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClear = () => {
    if (!items.length) return
    setItems([])
    toast.success(t('rawMaterials.bindingQr.toasts.cleared'))
  }

  const handlePrint = () => {
    if (!items.length) {
      toast.error(t('rawMaterials.bindingQr.toasts.printBlocked'))
      return
    }

    try {
      openPrepregBindingQrPrintPreview(items)
    } catch {
      toast.error(t('rawMaterials.bindingQr.toasts.printBlocked'))
    }
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <section className='relative overflow-hidden rounded-[32px] border border-dashed border-border/70 bg-muted/5 px-6 py-6'>
        <div className='absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent' />
        <div className='relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
          <div className='max-w-3xl'>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {t('rawMaterials.bindingQr.hero.kicker')}
            </p>
            <h1 className='mt-3 text-lg font-black tracking-tighter text-foreground uppercase italic'>
              {t('rawMaterials.bindingQr.hero.title')}
            </h1>
            <p className='mt-3 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('rawMaterials.bindingQr.hero.description')}
            </p>
          </div>

          <div className='flex flex-wrap gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleClear}
              disabled={!items.length}
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              <Trash2 className='size-4' />
              {t('rawMaterials.bindingQr.actions.clear')}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={handlePrint}
              disabled={!items.length}
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              <Printer className='size-4' />
              {t('rawMaterials.bindingQr.actions.print')}
            </Button>
            <Button
              type='button'
              onClick={() => void handleGenerate()}
              disabled={isGenerating}
              className='h-11 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              <QrCode className='size-4' />
              {isGenerating
                ? t('rawMaterials.bindingQr.actions.generating')
                : t('rawMaterials.bindingQr.actions.generate')}
            </Button>
          </div>
        </div>
      </section>

      <section className='grid gap-8 xl:grid-cols-[360px_minmax(0,1fr)]'>
        <div className='rounded-[24px] border border-dashed border-border/70 bg-background p-5'>
          <div>
            <p className='text-sm font-black tracking-tighter text-foreground italic'>
              {t('rawMaterials.bindingQr.form.title')}
            </p>
            <p className='mt-2 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('rawMaterials.bindingQr.form.description')}
            </p>
          </div>

          {batchValidity ? (
            <div className='mt-6 rounded-[20px] border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4'>
              <p className='text-sm font-black tracking-tighter text-emerald-700 italic'>
                {t('rawMaterials.bindingQr.batchValidity.title')}
              </p>
              <div className='mt-3 grid gap-3'>
                <div className='rounded-[18px] border border-dashed border-emerald-500/20 bg-background px-3 py-3'>
                  <p className='text-[8px] font-black tracking-[0.16em] text-emerald-700/60 uppercase'>
                    {t('rawMaterials.bindingQr.batchValidity.remainingLabel')}
                  </p>
                  <p className='mt-2 font-mono text-[11px] leading-5 text-emerald-700'>
                    {t('rawMaterials.bindingQr.batchValidity.remainingValue', {
                      value: batchValidity.remaining,
                    })}
                  </p>
                </div>
                <div className='rounded-[18px] border border-dashed border-emerald-500/20 bg-background px-3 py-3'>
                  <p className='text-[8px] font-black tracking-[0.16em] text-emerald-700/60 uppercase'>
                    {t('rawMaterials.bindingQr.batchValidity.expiresAtLabel')}
                  </p>
                  <p className='mt-2 font-mono text-[10px] leading-5 text-emerald-700/90'>
                    {batchValidity.formattedExpiresAt}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className='mt-6 grid gap-3'>
            <div className='grid gap-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('rawMaterials.bindingQr.form.quantityLabel')}
              </Label>
              <Input
                type='number'
                min={1}
                max={200}
                value={quantityInput}
                onChange={(event) => setQuantityInput(event.target.value)}
                className='h-12 rounded-2xl border-none bg-muted/50 text-sm'
              />
              <p className='text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('rawMaterials.bindingQr.form.quantityHint')}
              </p>
            </div>
          </div>
        </div>

        <PrepregBindingQrGrid
          items={items}
          title={t('rawMaterials.bindingQr.grid.title')}
          emptyTitle={t('rawMaterials.bindingQr.grid.emptyTitle')}
          emptyDescription={t('rawMaterials.bindingQr.grid.emptyDescription')}
          tokenLabel={t('rawMaterials.bindingQr.grid.tokenLabel')}
          expiresAtLabel={t('rawMaterials.bindingQr.grid.expiresAtLabel')}
          cardTip={t('rawMaterials.bindingQr.grid.cardTip')}
        />
      </section>
    </div>
  )
}
