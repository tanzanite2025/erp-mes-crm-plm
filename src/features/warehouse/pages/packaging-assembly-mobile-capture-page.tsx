import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Loader2,
  PackageCheck,
  Plus,
  Smartphone,
  Trash2,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { TrackingNumberInput } from '@/components/tracking-number-input'
import { PackagingAssemblyService } from '../services/packaging-assembly-service'

type MobileCopy = {
  title: string
  description: string
  packageCode: string
  scanPlaceholder: string
  add: string
  submit: string
  scanned: string
  missingToken: string
  missingCode: string
  missingItems: string
  submitFailed: string
  submittedTitle: string
  submittedDescription: string
}

const copyByLocale: Record<'zh-CN' | 'en-US', MobileCopy> = {
  'zh-CN': {
    title: '装箱扫码',
    description: '逐个扫描已在系统绑定的产品一维码，确认无误后提交装箱组装。',
    packageCode: '箱码',
    scanPlaceholder: '扫描或录入产品一维码',
    add: '加入',
    submit: '提交装箱',
    scanned: '已加入产品码',
    missingToken: '扫码入口缺少安全口令，请重新在电脑端生成。',
    missingCode: '请先扫描或录入产品一维码。',
    missingItems: '请至少加入一个产品一维码。',
    submitFailed: '装箱提交失败',
    submittedTitle: '装箱完成',
    submittedDescription: '产品一维码已绑定到箱码，电脑端会自动回显装箱结果。',
  },
  'en-US': {
    title: 'Package Scan',
    description:
      'Scan product barcodes already bound in the system, then submit this package assembly.',
    packageCode: 'Package Code',
    scanPlaceholder: 'Scan or enter product barcode',
    add: 'Add',
    submit: 'Submit Package',
    scanned: 'Scanned product barcodes',
    missingToken: 'Missing secure token. Create a new entry on desktop.',
    missingCode: 'Scan or enter a product barcode first.',
    missingItems: 'Add at least one product barcode.',
    submitFailed: 'Package submit failed',
    submittedTitle: 'Package Submitted',
    submittedDescription:
      'Product barcodes are now bound to the package. The desktop page will refresh automatically.',
  },
}

interface PackagingAssemblyMobileCapturePageProps {
  sessionId: string
  token: string
  packageCode: string
}

function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, '').trim().toUpperCase()
}

export function PackagingAssemblyMobileCapturePage({
  sessionId,
  token,
  packageCode,
}: PackagingAssemblyMobileCapturePageProps) {
  const { locale } = useLanguage()
  const copy = copyByLocale[locale]
  const [rawCode, setRawCode] = useState('')
  const [productBarcodes, setProductBarcodes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => productBarcodes.length > 0 && !submitting,
    [productBarcodes.length, submitting]
  )

  const addBarcode = (value: string) => {
    const nextCode = normalizeBarcode(value)
    if (!nextCode) {
      setError(copy.missingCode)
      return
    }
    setProductBarcodes((current) =>
      current.includes(nextCode) ? current : [...current, nextCode]
    )
    setRawCode('')
    setError('')
  }

  const removeBarcode = (value: string) => {
    setProductBarcodes((current) => current.filter((item) => item !== value))
  }

  const submitAssembly = async () => {
    if (!token) {
      setError(copy.missingToken)
      return
    }
    if (productBarcodes.length === 0) {
      setError(copy.missingItems)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await PackagingAssemblyService.submitCaptureSession(sessionId, {
        token,
        productBarcodes,
      })
      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : copy.submitFailed
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
          <h1 className='mt-6 text-3xl font-black tracking-tight italic'>
            {copy.submittedTitle}
          </h1>
          <p className='mt-3 text-sm leading-6 font-semibold text-muted-foreground'>
            {copy.submittedDescription}
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
              <Smartphone className='size-7' />
            </div>
            <div>
              <h1 className='text-2xl font-black tracking-tight italic'>
                {copy.title}
              </h1>
              <p className='mt-1 text-xs leading-5 font-bold text-muted-foreground'>
                {copy.description}
              </p>
            </div>
          </div>
          <div className='mt-4 rounded-2xl bg-background/80 px-4 py-3'>
            <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {copy.packageCode}
            </div>
            <div className='mt-1 font-mono text-lg font-black break-all'>
              {packageCode || '--'}
            </div>
          </div>
        </header>

        <div className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-background p-4 shadow-sm'>
          <TrackingNumberInput
            value={rawCode}
            onValueChange={setRawCode}
            onScanComplete={addBarcode}
            placeholder={copy.scanPlaceholder}
            inputClassName='h-14 rounded-2xl border-none bg-muted/50 text-base font-black tracking-[0.08em]'
            autoOpenScanner
          />
          <Button
            type='button'
            onClick={() => addBarcode(rawCode)}
            className='mt-3 h-12 w-full rounded-full text-sm font-black tracking-widest'
          >
            <Plus className='size-4' />
            {copy.add}
          </Button>
        </div>

        <section className='rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/20 p-4'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='text-xs font-black tracking-widest text-muted-foreground uppercase'>
              {copy.scanned}
            </div>
            <div className='font-mono text-sm font-black'>
              {productBarcodes.length}
            </div>
          </div>
          <div className='space-y-2'>
            {productBarcodes.map((item) => (
              <div
                key={item}
                className='flex items-center justify-between gap-2 rounded-2xl bg-background px-3 py-2 font-mono text-sm font-black'
              >
                <span className='min-w-0 truncate'>{item}</span>
                <button
                  type='button'
                  onClick={() => removeBarcode(item)}
                  className='flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                >
                  <Trash2 className='size-4' />
                </button>
              </div>
            ))}
          </div>
        </section>

        {error ? (
          <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-bold text-destructive'>
            {error}
          </div>
        ) : null}

        <Button
          type='button'
          onClick={() => void submitAssembly()}
          disabled={!canSubmit}
          className='h-14 w-full rounded-full text-sm font-black tracking-widest'
        >
          {submitting ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <PackageCheck className='size-4' />
          )}
          {copy.submit}
        </Button>
      </section>
    </main>
  )
}
