import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Clipboard, FileText, ImageIcon, LinkIcon, Loader2, Smartphone, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { renderBwipBarcode } from '@/lib/bwip-renderer'
import type { PrepregFormState } from '../data/prepreg-material-spec-schema'
import {
  PrepregLabelCaptureSessionService,
  type PrepregLabelCaptureSession,
} from '../services/prepreg-label-capture-session-service'
import { PrepregLabelOcrService } from '../services/prepreg-label-ocr-service'
import { parsePrepregLabelText } from '../utils/prepreg-label-parser'

const FIELD_LABELS: Partial<Record<keyof PrepregFormState, string>> = {
  code: '产品编号',
  name: '产品名称',
  supplierProductCode: '供应商型号',
  resinContentPercent: '树脂含量',
  widthMm: '幅宽',
  areaWeightGsm: '克重',
  nominalAreaM2: '标称面积',
  supplierBatchNo: '生产批次',
  rollNo: '卷/箱号',
  productionDate: '生产日期',
}
FIELD_LABELS.resinModel = '树脂型号'

interface PrepregLabelCapturePanelProps {
  onApply: (fields: Partial<PrepregFormState>) => void
}

export function PrepregLabelCapturePanel({ onApply }: PrepregLabelCapturePanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const appliedSessionIdRef = useRef('')
  const [rawText, setRawText] = useState('')
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [message, setMessage] = useState('拍照或上传标签后，可粘贴/校正识别文本，再一键填入表单。')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [captureSession, setCaptureSession] = useState<PrepregLabelCaptureSession | null>(null)

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
        // QR is a convenience affordance; the text link remains available.
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
            setMessage('手机端已提交识别结果，请核对后保存。')
            if (Object.keys(nextSession.fields || {}).length > 0) {
              onApply(nextSession.fields)
              toast.success('手机识别结果已填入')
            }
          }
        })
        .catch(() => {
          setMessage('手机采集会话轮询失败，可重新生成链接。')
        })
    }, 2500)

    return () => window.clearInterval(intervalId)
  }, [captureSession, onApply])

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
      setMessage(result.message || '标签照片已读取，请核对识别文本后填入。')
      if (Object.keys(result.fields).length > 0) {
        onApply(result.fields)
      }
    } catch {
      setMessage('标签照片读取失败，请重新拍照或直接手填。')
    } finally {
      setIsRecognizing(false)
      event.target.value = ''
    }
  }

  const handleApply = () => {
    if (parsedEntries.length === 0) {
      toast.error('还没有可填入的识别字段，请先粘贴或校正标签文字。')
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
      setMessage('手机采集链接已生成，扫码后拍照并提交。')
    } catch {
      toast.error('手机采集链接生成失败')
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleCopyLink = async () => {
    if (!captureUrl) return
    try {
      await navigator.clipboard.writeText(captureUrl)
      toast.success('采集链接已复制')
    } catch {
      toast.error('复制失败，请手动复制链接')
    }
  }

  return (
    <section className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-3'>
      <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div className='space-y-1'>
          <div className='flex items-center gap-2 text-sm font-black'>
            <Camera className='size-4 text-primary' />
            标签拍照识别
          </div>
          <p className='max-w-2xl text-[11px] font-semibold leading-4 text-muted-foreground'>
            电脑端可直接上传；也可以生成手机采集链接，用手机拍照后提交回当前弹窗。
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
          <Button type='button' variant='outline' onClick={handlePickImage} disabled={isRecognizing} className='h-8 rounded-full px-3 text-xs font-black'>
            <ImageIcon className='size-4' />
            {isRecognizing ? '读取中' : '本机上传'}
          </Button>
          <Button type='button' variant='outline' onClick={handleCreateMobileSession} disabled={isCreatingSession} className='h-8 rounded-full px-3 text-xs font-black'>
            {isCreatingSession ? <Loader2 className='size-4 animate-spin' /> : <Smartphone className='size-4' />}
            手机采集
          </Button>
          <Button type='button' onClick={handleApply} className='h-8 rounded-full px-3 text-xs font-black'>
            <Wand2 className='size-4' />
            解析并填入
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
              手机扫码采集
            </div>
            <p className='text-[11px] font-semibold leading-4 text-muted-foreground'>
              链接 30 分钟内有效。手机提交后，此弹窗会自动接收字段。
            </p>
            <div className='flex min-w-0 items-center gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5 text-[11px] font-bold'>
              <LinkIcon className='size-3.5 shrink-0 text-muted-foreground' />
              <span className='truncate'>{captureUrl}</span>
            </div>
            <Button type='button' variant='outline' onClick={handleCopyLink} className='h-8 w-fit rounded-full text-xs font-black'>
              <Clipboard className='size-3.5' />
              复制链接
            </Button>
          </div>
        </div>
      ) : null}

      <div className='mt-3 grid gap-2.5 md:grid-cols-[150px_1fr]'>
        <div className='flex min-h-[106px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-muted-foreground/20 bg-background/70'>
          {imagePreviewUrl ? (
            <img src={imagePreviewUrl} alt='预浸料标签预览' className='h-full max-h-[128px] w-full object-contain' />
          ) : (
            <div className='flex flex-col items-center gap-1.5 text-xs font-bold text-muted-foreground'>
              <ImageIcon className='size-6 opacity-50' />
              等待标签照片
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
            placeholder='可粘贴 OCR 文本，例如：产品编号 CFS-247-75，树脂含量 37%，幅宽 1000MM，生产批次 20260306AM，箱号 23，生产日期 2026年3月6日。'
            className='min-h-[76px] resize-none rounded-xl bg-background/80 text-sm font-semibold leading-5'
          />
          <div className='flex max-h-14 flex-wrap gap-1.5 overflow-y-auto pr-1'>
            {parsedEntries.length === 0 ? (
              <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black text-muted-foreground'>
                暂无可填字段
              </Badge>
            ) : (
              parsedEntries.map(([key, value]) => (
                <Badge key={key} variant='outline' className='rounded-full bg-background text-[10px] font-black'>
                  {FIELD_LABELS[key] || key}: {value}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
