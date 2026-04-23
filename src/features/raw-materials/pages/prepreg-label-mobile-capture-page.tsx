import { useMemo, useRef, useState } from 'react'
import { Camera, CheckCircle2, FileText, ImageIcon, Loader2, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { PrepregFormState } from '../data/prepreg-material-spec-schema'
import { PrepregLabelCaptureSessionService } from '../services/prepreg-label-capture-session-service'
import { parsePrepregLabelText } from '../utils/prepreg-label-parser'

const FIELD_LABELS: Partial<Record<keyof PrepregFormState, string>> = {
  code: '产品编号',
  name: '产品名称',
  supplierProductCode: '供应商型号',
  resinContentPercent: '树脂含量',
  widthMm: '幅宽',
  areaWeightGsm: '克重',
  nominalAreaM2: '面积',
  supplierBatchNo: '批次',
  rollNo: '卷/箱号',
  productionDate: '生产日期',
}
FIELD_LABELS.resinModel = '树脂型号'

interface PrepregLabelMobileCapturePageProps {
  sessionId: string
  token: string
}

export function PrepregLabelMobileCapturePage({ sessionId, token }: PrepregLabelMobileCapturePageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [rawText, setRawText] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [imageSize, setImageSize] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const fields = useMemo(() => parsePrepregLabelText(rawText), [rawText])
  const entries = Object.entries(fields) as Array<[keyof PrepregFormState, string]>

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
      setError('采集链接缺少口令，请回到电脑端重新生成。')
      return
    }
    if (entries.length === 0) {
      setError('还没有解析到字段，请先输入或粘贴标签文字。')
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
      setError(submitError instanceof Error ? submitError.message : '提交失败，请重试。')
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
          <h1 className='mt-6 text-3xl font-black italic tracking-tighter'>已提交</h1>
          <p className='mt-3 text-sm font-semibold leading-6 text-muted-foreground'>
            电脑端预浸料弹窗会自动接收识别结果，请回到电脑端核对后保存。
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
              <h1 className='text-2xl font-black italic tracking-tighter'>预浸料标签采集</h1>
              <p className='mt-1 text-xs font-bold leading-5 text-muted-foreground'>
                拍照留底，粘贴或输入标签文字，系统会提取固定字段。
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
              <img src={previewUrl} alt='标签照片预览' className='max-h-[280px] w-full object-contain' />
            ) : (
              <div className='flex flex-col items-center gap-3 text-sm font-black text-muted-foreground'>
                <ImageIcon className='size-10 opacity-60' />
                拍照/上传标签
              </div>
            )}
          </button>
        </div>

        <div className='rounded-[28px] border border-dashed border-muted-foreground/20 bg-background p-4 shadow-sm'>
          <div className='mb-3 flex items-center gap-2 text-sm font-black'>
            <FileText className='size-4 text-primary' />
            标签文字
          </div>
          <Textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder='把手机 OCR / 相册识别出来的文字粘贴到这里，也可以手动输入：产品编号 CFS-247-75，37% / 260/204，1000MM，150㎡，20260306AM，箱号 23，2026年3月6日。'
            className='min-h-[160px] rounded-2xl text-base font-semibold leading-7'
          />
          <div className='mt-3 flex flex-wrap gap-2'>
            {entries.length === 0 ? (
              <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black text-muted-foreground'>
                暂无可填字段
              </Badge>
            ) : (
              entries.map(([key, value]) => (
                <Badge key={key} variant='outline' className='rounded-full text-[10px] font-black'>
                  {FIELD_LABELS[key] || key}: {value}
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
          {submitting ? <Loader2 className='size-4 animate-spin' /> : <Wand2 className='size-4' />}
          提交到电脑端
        </Button>
      </section>
    </main>
  )
}
