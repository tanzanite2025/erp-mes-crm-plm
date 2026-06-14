import { useMemo, useRef, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  Wand2,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PrepregFormState } from '../data/prepreg-material-spec-schema'
import { PrepregLabelCaptureSessionService } from '../services/prepreg-label-capture-session-service'
import { parsePrepregLabelText } from '../utils/prepreg-label-parser'

interface PrepregLabelMobileCapturePageProps {
  sessionId: string
  token: string
}

export function PrepregLabelMobileCapturePage({
  sessionId,
  token,
}: PrepregLabelMobileCapturePageProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [rawText, setRawText] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [imageSize, setImageSize] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const fieldLabels = useMemo<Partial<Record<keyof PrepregFormState, string>>>(
    () => ({
      code: t('rawMaterials.catalog.form.code.label'),
      name: t('rawMaterials.catalog.form.name.label'),
      supplierProductCode: t('rawMaterials.catalog.form.supplier.label'),
      resinContentBatchRaw: t(
        'rawMaterials.catalog.form.resinContentBatchRaw.label'
      ),
      widthMm: t('rawMaterials.catalog.form.widthMm.label'),
      nominalAreaM2: t('rawMaterials.catalog.form.nominalAreaM2.label'),
      inspector: t('rawMaterials.catalog.form.inspector.label'),
      boxNo: t('rawMaterials.catalog.form.boxNo.label'),
      productionDate: t('rawMaterials.catalog.form.productionDate.label'),
    }),
    [t]
  )

  const fields = useMemo(() => parsePrepregLabelText(rawText), [rawText])
  const entries = Object.entries(fields) as Array<
    [keyof PrepregFormState, string]
  >

  const handlePickImage = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(file))
    setImageName(file.name)
    setImageSize(file.size)
    event.target.value = ''
  }

  const handleSubmit = async () => {
    if (!token) {
      setError(t('rawMaterials.catalog.mobileCapture.errors.missingToken'))
      return
    }
    if (entries.length === 0) {
      setError(t('rawMaterials.catalog.mobileCapture.errors.emptyFields'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await PrepregLabelCaptureSessionService.submit(sessionId, {
        token,
        rawText,
        fields,
        imageName,
        imageSize,
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('rawMaterials.catalog.mobileCapture.errors.submitFailed')
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className='min-h-dvh bg-background px-5 py-8 text-foreground'>
        <section className='mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center text-center'>
          <div className='flex size-20 items-center justify-center rounded-[28px] bg-emerald-500/10 text-emerald-600'>
            <CheckCircle2 className='size-10' />
          </div>
          <h1 className='mt-6 text-3xl font-black tracking-tighter italic'>
            {t('rawMaterials.catalog.mobileCapture.submitted.title')}
          </h1>
          <p className='mt-3 text-sm leading-6 font-semibold text-muted-foreground'>
            {t('rawMaterials.catalog.mobileCapture.submitted.description')}
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className='min-h-dvh bg-background px-4 py-5 text-foreground'>
      <section className='mx-auto max-w-md space-y-4'>
        <header className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-muted/30 p-5'>
          <div className='flex items-center gap-3'>
            <div className='flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
              <Camera className='size-7' />
            </div>
            <div>
              <h1 className='text-2xl font-black tracking-tighter italic'>
                {t('rawMaterials.catalog.mobileCapture.title')}
              </h1>
              <p className='mt-1 text-xs leading-5 font-bold text-muted-foreground'>
                {t('rawMaterials.catalog.mobileCapture.description')}
              </p>
            </div>
          </div>
        </header>

        <div className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-background p-4 shadow-sm'>
          <input
            ref={inputRef}
            type='file'
            accept='image/*'
            capture='environment'
            className='hidden'
            onChange={handleFileChange}
          />
          <button
            type='button'
            onClick={handlePickImage}
            className='flex min-h-[230px] w-full items-center justify-center overflow-hidden rounded-3xl border border-dashed border-muted-foreground/25 bg-muted/20'
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={t('rawMaterials.catalog.mobileCapture.previewAlt')}
                className='max-h-[280px] w-full object-contain'
              />
            ) : (
              <div className='flex flex-col items-center gap-3 text-sm font-black text-muted-foreground'>
                <ImageIcon className='size-10 opacity-60' />
                {t('rawMaterials.catalog.mobileCapture.imagePlaceholder')}
              </div>
            )}
          </button>
        </div>

        <div className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-background p-4 shadow-sm'>
          <div className='mb-3 flex items-center gap-2 text-sm font-black'>
            <FileText className='size-4 text-primary' />
            {t('rawMaterials.catalog.mobileCapture.textTitle')}
          </div>
          <Textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={t(
              'rawMaterials.catalog.mobileCapture.textPlaceholder'
            )}
            className='min-h-[160px] rounded-2xl text-base leading-7 font-semibold'
          />
          <div className='mt-3 flex flex-wrap gap-2'>
            {entries.length === 0 ? (
              <Badge
                variant='outline'
                className='rounded-full border-dashed text-[10px] font-black text-muted-foreground'
              >
                {t('rawMaterials.catalog.ocr.emptyParsedFields')}
              </Badge>
            ) : (
              entries.map(([key, value]) => (
                <Badge
                  key={key}
                  variant='outline'
                  className='rounded-full text-[10px] font-black'
                >
                  {fieldLabels[key] || key}: {value}
                </Badge>
              ))
            )}
          </div>
        </div>

        {error ? (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive'>
            {error}
          </div>
        ) : null}

        <Button
          type='button'
          onClick={handleSubmit}
          disabled={submitting}
          className='h-14 w-full rounded-full text-sm font-black tracking-widest'
        >
          {submitting ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Wand2 className='size-4' />
          )}
          {t('rawMaterials.catalog.mobileCapture.actions.submit')}
        </Button>
      </section>
    </main>
  )
}
