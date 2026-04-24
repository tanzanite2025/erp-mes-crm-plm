import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Clipboard,
  FileText,
  ImageIcon,
  LinkIcon,
  Loader2,
  Smartphone,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import type { PrepregFormState } from '../data/prepreg-material-spec-schema'
import {
  PrepregLabelCaptureSessionService,
  type PrepregLabelCaptureSession,
} from '../services/prepreg-label-capture-session-service'
import { PrepregLabelOcrService } from '../services/prepreg-label-ocr-service'
import { parsePrepregLabelText } from '../utils/prepreg-label-parser'

interface PrepregLabelCapturePanelProps {
  onApply: (fields: Partial<PrepregFormState>) => void
}

export function PrepregLabelCapturePanel({ onApply }: PrepregLabelCapturePanelProps) {
  const { t } = useLanguage()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const appliedSessionIdRef = useRef('')
  const [rawText, setRawText] = useState('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [message, setMessage] = useState(t('rawMaterials.catalog.ocr.message.idle'))
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [captureSession, setCaptureSession] = useState<PrepregLabelCaptureSession | null>(null)

  useEffect(() => {
    setMessage(t('rawMaterials.catalog.ocr.message.idle'))
  }, [t])

  const fieldLabels = useMemo<Partial<Record<keyof PrepregFormState, string>>>(
    () => ({
      code: t('rawMaterials.catalog.form.code.label'),
      name: t('rawMaterials.catalog.form.name.label'),
      supplierProductCode: t('rawMaterials.catalog.form.supplier.label'),
      resinContentBatchRaw: t('rawMaterials.catalog.form.resinContentBatchRaw.label'),
      widthMm: t('rawMaterials.catalog.form.widthMm.label'),
      nominalAreaM2: t('rawMaterials.catalog.form.nominalAreaM2.label'),
      inspector: t('rawMaterials.catalog.form.inspector.label'),
      boxNo: t('rawMaterials.catalog.form.boxNo.label'),
      productionDate: t('rawMaterials.catalog.form.productionDate.label'),
    }),
    [t]
  )

  const parsedFields = useMemo(() => parsePrepregLabelText(rawText), [rawText])
  const parsedEntries = Object.entries(parsedFields) as Array<[keyof PrepregFormState, string]>

  const captureUrl = useMemo(() => {
    if (!captureSession?.uploadToken || typeof window === 'undefined') return ''
    const sessionId = encodeURIComponent(captureSession.sessionId)
    const token = encodeURIComponent(captureSession.uploadToken)
    return `${window.location.origin}/prepreg-label-capture/${sessionId}?token=${token}`
  }, [captureSession])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  useEffect(() => {
    if (!captureUrl || !qrCanvasRef.current) return
    let cancelled = false
    const render = async () => {
      try {
        if (!qrCanvasRef.current || cancelled) return
        await renderBwipBarcode({
          canvas: qrCanvasRef.current,
          code: captureUrl,
          type: 'qrcode',
        })
      } catch {
        // QR is convenience only; text link remains available.
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [captureUrl])

  useEffect(() => {
    if (!captureSession || captureSession.status !== 'Waiting') return

    const intervalId = window.setInterval(() => {
      void PrepregLabelCaptureSessionService.get(captureSession.sessionId)
        .then((nextSession) => {
          setCaptureSession((current) => ({
            ...nextSession,
            uploadToken: current?.uploadToken,
          }))
          if (
            nextSession.status === 'Submitted' &&
            appliedSessionIdRef.current !== nextSession.sessionId
          ) {
            appliedSessionIdRef.current = nextSession.sessionId
            setRawText(nextSession.rawText || '')
            setMessage(t('rawMaterials.catalog.ocr.message.mobileSubmitted'))
            if (Object.keys(nextSession.fields || {}).length > 0) {
              onApply(nextSession.fields)
              toast.success(t('rawMaterials.catalog.ocr.toasts.mobileApplied'))
            }
          }
        })
        .catch(() => {
          setMessage(t('rawMaterials.catalog.ocr.message.mobilePollingFailed'))
        })
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [captureSession, onApply, t])

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsRecognizing(true)
    try {
      const result = await PrepregLabelOcrService.recognizeImage(file)
      setImagePreviewUrl(result.imagePreviewUrl || '')
      setRawText(result.rawText)
      setMessage(result.message || t('rawMaterials.catalog.ocr.message.localUploaded'))
      if (Object.keys(result.fields).length > 0) {
        onApply(result.fields)
      }
    } catch {
      setMessage(t('rawMaterials.catalog.ocr.message.localUploadFailed'))
    } finally {
      setIsRecognizing(false)
      event.target.value = ''
    }
  }

  const handleApply = () => {
    if (parsedEntries.length === 0) {
      toast.error(t('rawMaterials.catalog.ocr.toasts.noFields'))
      return
    }
    onApply(parsedFields)
  }

  const handleCreateMobileSession = async () => {
    setIsCreatingSession(true)
    try {
      const session = await PrepregLabelCaptureSessionService.create()
      appliedSessionIdRef.current = ''
      setCaptureSession(session)
      setMessage(t('rawMaterials.catalog.ocr.message.mobileSessionCreated'))
    } catch {
      toast.error(t('rawMaterials.catalog.ocr.toasts.mobileSessionFailed'))
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleCopyLink = async () => {
    if (!captureUrl) return
    try {
      await navigator.clipboard.writeText(captureUrl)
      toast.success(t('rawMaterials.catalog.ocr.toasts.linkCopied'))
    } catch {
      toast.error(t('rawMaterials.catalog.ocr.toasts.copyFailed'))
    }
  }

  return (
    <section className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-3'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-sm font-black'>
            <Camera className='size-4 text-primary' />
            {t('rawMaterials.catalog.ocr.title')}
          </div>
          <p className='max-w-2xl text-[11px] font-semibold leading-4 text-muted-foreground'>
            {t('rawMaterials.catalog.ocr.description')}
          </p>
        </div>
        <div className='flex shrink-0 flex-wrap gap-1.5'>
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*'
            capture='environment'
            className='hidden'
            onChange={handleFileChange}
          />
          <Button
            type='button'
            variant='outline'
            onClick={handlePickImage}
            disabled={isRecognizing}
            className='h-8 rounded-full px-3 text-xs font-black'
          >
            <ImageIcon className='size-4' />
            {isRecognizing
              ? t('rawMaterials.catalog.ocr.actions.reading')
              : t('rawMaterials.catalog.ocr.actions.localUpload')}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={handleCreateMobileSession}
            disabled={isCreatingSession}
            className='h-8 rounded-full px-3 text-xs font-black'
          >
            {isCreatingSession ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Smartphone className='size-4' />
            )}
            {t('rawMaterials.catalog.ocr.actions.mobileCapture')}
          </Button>
          <Button
            type='button'
            onClick={handleApply}
            className='h-8 rounded-full px-3 text-xs font-black'
          >
            <Wand2 className='size-4' />
            {t('rawMaterials.catalog.ocr.actions.parseAndApply')}
          </Button>
        </div>
      </div>

      {captureUrl ? (
        <div className='mt-3 grid gap-2 rounded-2xl border border-dashed border-primary/20 bg-background/80 p-2.5 md:grid-cols-[104px_1fr]'>
          <div className='flex items-center justify-center rounded-xl bg-white p-2'>
            <canvas ref={qrCanvasRef} className='size-[88px]' />
          </div>
          <div className='flex min-w-0 flex-col justify-center gap-1.5'>
            <div className='flex items-center gap-2 text-sm font-black'>
              <Smartphone className='size-4 text-primary' />
              {t('rawMaterials.catalog.ocr.mobile.title')}
            </div>
            <p className='text-[11px] font-semibold leading-4 text-muted-foreground'>
              {t('rawMaterials.catalog.ocr.mobile.description')}
            </p>
            <div className='flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5 text-[11px] font-bold'>
              <LinkIcon className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='truncate'>{captureUrl}</span>
            </div>
            <Button
              type='button'
              variant='outline'
              onClick={handleCopyLink}
              className='h-8 w-fit rounded-full text-xs font-black'
            >
              <Clipboard className='size-3.5' />
              {t('rawMaterials.catalog.ocr.actions.copyLink')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className='mt-3 grid gap-2.5 md:grid-cols-[150px_1fr]'>
        <div className='flex min-h-[106px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-muted-foreground/20 bg-background/70'>
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt={t('rawMaterials.catalog.ocr.previewAlt')}
              className='h-full max-h-[128px] w-full object-contain'
            />
          ) : (
            <div className='flex flex-col items-center gap-1.5 text-xs font-bold text-muted-foreground'>
              <ImageIcon className='size-6 opacity-50' />
              {t('rawMaterials.catalog.ocr.waitingImage')}
            </div>
          )}
        </div>

        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-[11px] font-bold leading-4 text-muted-foreground'>
            <FileText className='size-3.5 shrink-0' />
            {message}
          </div>
          <Textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={t('rawMaterials.catalog.ocr.textPlaceholder')}
            className='min-h-[76px] resize-none rounded-xl bg-background/80 text-sm font-semibold leading-5'
          />
          <div className='flex max-h-14 flex-wrap gap-1.5 overflow-y-auto pr-1'>
            {parsedEntries.length === 0 ? (
              <Badge
                variant='outline'
                className='rounded-full border-dashed text-[10px] font-black text-muted-foreground'
              >
                {t('rawMaterials.catalog.ocr.emptyParsedFields')}
              </Badge>
            ) : (
              parsedEntries.map(([key, value]) => (
                <Badge
                  key={key}
                  variant='outline'
                  className='rounded-full bg-background text-[10px] font-black'
                >
                  {fieldLabels[key] || key}: {value}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
