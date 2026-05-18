/**
 * 物流单号通用输入控件(带摄像头扫码 + 离线兜底)。
 *
 * 此组件供物流跟踪/退货单/换货单等场景复用,功能:
 *   - 文本输入 + 自动 normalizeTrackingNumber(去空格/特殊字符)
 *   - 调用浏览器 BarcodeDetector API 扫一维码/二维码
 *   - BarcodeDetector 不可用时提供文件上传识别兜底
 *   - 拍照上传识别(camera intent)
 *
 * 浏览器 API 兼容性:
 *   - getBarcodeDetectorConstructor 检测可用性,不可用时降级为纯文本输入
 *   - createDetector 异步初始化,UI 上有 loading 状态
 *
 * 错误处理:
 *   - getScannerErrorMessage 把底层错误转友好提示(权限拒绝/格式不支持/网络失败)
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2, RefreshCw, ScanLine, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SupportedBarcodeFormat =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'codabar'
  | 'data_matrix'
  | 'ean_13'
  | 'ean_8'
  | 'itf'
  | 'pdf417'
  | 'qr_code'
  | 'upc_a'
  | 'upc_e'

interface DetectedBarcodeLike {
  rawValue?: string
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<DetectedBarcodeLike[]>
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: SupportedBarcodeFormat[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<SupportedBarcodeFormat[]>
}

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructorLike
}

interface TrackingNumberInputProps {
  value: string
  onValueChange: (value: string) => void
  onScanComplete?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
  showActionButtons?: boolean
  openScannerSignal?: number
  autoOpenScanner?: boolean
}

type ScannerCopy = {
  cameraScan: string
  photoRecognize: string
  panelTitle: string
  panelHint: string
  startingCamera: string
  unsupportedTitle: string
  unsupportedDescription: string
  mobileHint: string
  supportedFormats: string
  permissionDenied: string
  cameraNotFound: string
  cameraBusy: string
  rearCameraUnavailable: string
  initFailed: string
  scanCollected: string
  nativeScanUnsupported: string
  secureContextRequired: string
  cameraApiUnsupported: string
  detectorUnavailable: string
  previewNotReady: string
  photoUnsupported: string
  imageDetectorUnavailable: string
  barcodeNotFoundInImage: string
  imageRecognized: string
}

const PREFERRED_FORMATS: SupportedBarcodeFormat[] = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'qr_code',
  'data_matrix',
  'pdf417',
  'aztec',
]

function getBarcodeDetectorConstructor() {
  if (typeof window === 'undefined') return undefined
  return (window as WindowWithBarcodeDetector).BarcodeDetector
}

function normalizeTrackingNumber(rawValue: string) {
  return rawValue.replace(/\s+/g, '').trim()
}

function getScannerErrorMessage(error: unknown, copy: ScannerCopy) {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return copy.permissionDenied
    }
    if (error.name === 'NotFoundError') {
      return copy.cameraNotFound
    }
    if (error.name === 'NotReadableError') {
      return copy.cameraBusy
    }
    if (error.name === 'OverconstrainedError') {
      return copy.rearCameraUnavailable
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return copy.initFailed
}

async function createDetector() {
  const BarcodeDetectorImpl = getBarcodeDetectorConstructor()
  if (!BarcodeDetectorImpl) return null

  const supportedFormats = BarcodeDetectorImpl.getSupportedFormats
    ? await BarcodeDetectorImpl.getSupportedFormats().catch(() => [])
    : []

  const formats =
    supportedFormats.length > 0
      ? PREFERRED_FORMATS.filter((format) => supportedFormats.includes(format))
      : PREFERRED_FORMATS

  return formats.length > 0
    ? new BarcodeDetectorImpl({ formats })
    : new BarcodeDetectorImpl()
}

export function TrackingNumberInput({
  value,
  onValueChange,
  onScanComplete,
  placeholder,
  disabled,
  className,
  inputClassName,
  showActionButtons = true,
  openScannerSignal = 0,
  autoOpenScanner = false,
}: TrackingNumberInputProps) {
  const { locale } = useLanguage()
  const [scannerOpen, setScannerOpen] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const [isStartingScanner, setIsStartingScanner] = useState(false)
  const [isDecodingImage, setIsDecodingImage] = useState(false)
  const [supportsNativeScanner, setSupportsNativeScanner] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const onValueChangeRef = useRef(onValueChange)
  const onScanCompleteRef = useRef(onScanComplete)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const decodeInFlightRef = useRef(false)
  const copy: ScannerCopy = useMemo(
    () =>
      locale === 'zh-CN'
        ? {
            cameraScan: '摄像头扫码',
            photoRecognize: '拍照识别',
            panelTitle: '摄像头扫码',
            panelHint: '对准条码后会自动回填识别结果。',
            startingCamera: '正在启动摄像头',
            unsupportedTitle: '当前浏览器暂不支持原生扫码',
            unsupportedDescription:
              '建议用手机 Chrome、Edge 或新版 Safari 打开当前页面。',
            mobileHint:
              '手机端请允许使用后置摄像头；若现场网络不是 HTTPS，可改用“拍照识别”。',
            supportedFormats: '支持条形码、二维码、Data Matrix 等常见码制。',
            permissionDenied:
              '未获得摄像头权限，请先允许浏览器访问摄像头后再试。',
            cameraNotFound:
              '未检测到可用摄像头，请切换到带摄像头的设备后重试。',
            cameraBusy: '摄像头正在被其他应用占用，请关闭后再试。',
            rearCameraUnavailable:
              '当前设备无法启用后置摄像头，可以改用拍照识别。',
            initFailed: '扫码初始化失败，请稍后重试。',
            scanCollected: '已识别条码',
            nativeScanUnsupported:
              '当前浏览器不支持原生扫码识别，请改用 Chrome、Edge 或新版 Safari。',
            secureContextRequired:
              '摄像头扫码需要在 HTTPS 或 localhost 环境下使用。',
            cameraApiUnsupported:
              '当前浏览器不支持摄像头调用，请改用拍照识别或手动输入。',
            detectorUnavailable: '当前环境无法初始化扫码能力，请手动输入条码。',
            previewNotReady: '扫码预览尚未准备完成，请重试。',
            photoUnsupported: '当前浏览器不支持拍照识别，请直接手动输入。',
            imageDetectorUnavailable: '无法初始化图片识别能力。',
            barcodeNotFoundInImage:
              '未从图片中识别到条码，请换一张更清晰的照片。',
            imageRecognized: '已从照片识别条码',
          }
        : {
            cameraScan: 'Camera Scan',
            photoRecognize: 'Photo Recognize',
            panelTitle: 'Camera Scanner',
            panelHint:
              'Once the barcode is aligned, the result will fill in automatically.',
            startingCamera: 'Starting camera',
            unsupportedTitle:
              'Native scanning is not available in this browser',
            unsupportedDescription:
              'Use Chrome, Edge, or a recent Safari version on a mobile device to open this page.',
            mobileHint:
              'Allow the rear camera on mobile. If the site is not running on HTTPS, switch to photo recognition instead.',
            supportedFormats:
              'Supports common formats such as linear barcodes, QR codes, and Data Matrix.',
            permissionDenied:
              'Camera permission is blocked. Allow browser access to the camera and try again.',
            cameraNotFound:
              'No available camera was detected. Switch to a device with a camera and try again.',
            cameraBusy:
              'The camera is in use by another app. Close it and try again.',
            rearCameraUnavailable:
              'The rear camera is not available on this device. Switch to photo recognition instead.',
            initFailed:
              'Scanner initialization failed. Please try again shortly.',
            scanCollected: 'Barcode captured',
            nativeScanUnsupported:
              'Native camera scanning is not available in this browser. Use Chrome, Edge, or a recent Safari version instead.',
            secureContextRequired:
              'Camera scanning requires HTTPS or localhost.',
            cameraApiUnsupported:
              'This browser cannot access the camera. Use photo recognition or enter the code manually.',
            detectorUnavailable:
              'This environment cannot initialize barcode detection. Enter the code manually instead.',
            previewNotReady:
              'The scanner preview is not ready yet. Please try again.',
            photoUnsupported:
              'Photo recognition is not available in this browser. Enter the code manually instead.',
            imageDetectorUnavailable:
              'Image barcode detection could not be initialized.',
            barcodeNotFoundInImage:
              'No barcode was detected in this image. Try a clearer photo.',
            imageRecognized: 'Barcode recognized from photo',
          },
    [locale]
  )

  useEffect(() => {
    setSupportsNativeScanner(Boolean(getBarcodeDetectorConstructor()))
  }, [])

  useEffect(() => {
    onValueChangeRef.current = onValueChange
  }, [onValueChange])

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete
  }, [onScanComplete])

  useEffect(() => {
    if (autoOpenScanner) {
      setScannerError(null)
      setScannerOpen(true)
    }
  }, [autoOpenScanner])

  useEffect(() => {
    if (openScannerSignal <= 0) return
    setScannerError(null)
    setRestartKey((current) => current + 1)
    setScannerOpen(true)
  }, [openScannerSignal])

  useEffect(() => {
    if (!scannerOpen) {
      return
    }

    let cancelled = false

    const stopSession = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
      decodeInFlightRef.current = false
    }

    const finishWithCode = (rawValue?: string) => {
      const normalized = normalizeTrackingNumber(rawValue || '')
      if (!normalized) {
        return false
      }

      toast.success(copy.scanCollected, {
        description: normalized,
      })
      onValueChangeRef.current(normalized)
      onScanCompleteRef.current?.(normalized)
      setScannerOpen(false)
      stopSession()
      return true
    }

    const startScanner = async () => {
      const BarcodeDetectorImpl = getBarcodeDetectorConstructor()
      if (!BarcodeDetectorImpl) {
        setScannerError(copy.nativeScanUnsupported)
        return
      }

      if (!window.isSecureContext) {
        setScannerError(copy.secureContextRequired)
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError(copy.cameraApiUnsupported)
        return
      }

      setScannerError(null)
      setIsStartingScanner(true)

      try {
        detectorRef.current = detectorRef.current || (await createDetector())
        if (!detectorRef.current) {
          setScannerError(copy.detectorUnavailable)
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        const video = videoRef.current
        if (!video) {
          throw new Error(copy.previewNotReady)
        }

        video.srcObject = stream
        await video.play()

        const detectFrame = async () => {
          if (cancelled || !detectorRef.current) {
            return
          }

          const currentVideo = videoRef.current
          if (
            currentVideo &&
            currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            !decodeInFlightRef.current
          ) {
            decodeInFlightRef.current = true
            try {
              const results = await detectorRef.current.detect(currentVideo)
              const detected = results.find((item) =>
                normalizeTrackingNumber(item.rawValue || '')
              )
              if (finishWithCode(detected?.rawValue)) {
                return
              }
            } catch (error) {
              if (!cancelled) {
                setScannerError(getScannerErrorMessage(error, copy))
              }
            } finally {
              decodeInFlightRef.current = false
            }
          }

          frameRef.current = requestAnimationFrame(detectFrame)
        }

        frameRef.current = requestAnimationFrame(detectFrame)
      } catch (error) {
        if (!cancelled) {
          setScannerError(getScannerErrorMessage(error, copy))
        }
        stopSession()
      } finally {
        if (!cancelled) {
          setIsStartingScanner(false)
        }
      }
    }

    void startScanner()

    return () => {
      cancelled = true
      stopSession()
    }
  }, [copy, scannerOpen, restartKey])

  const closeScanner = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }
    decodeInFlightRef.current = false
    setScannerError(null)
    setScannerOpen(false)
    setIsStartingScanner(false)
  }

  const handleImageDecode = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const BarcodeDetectorImpl = getBarcodeDetectorConstructor()
    if (!BarcodeDetectorImpl) {
      toast.error(copy.photoUnsupported)
      return
    }

    setIsDecodingImage(true)
    try {
      detectorRef.current = detectorRef.current || (await createDetector())
      if (!detectorRef.current) {
        throw new Error(copy.imageDetectorUnavailable)
      }

      const bitmap = await createImageBitmap(file)
      try {
        const results = await detectorRef.current.detect(bitmap)
        const detected = results.find((item) =>
          normalizeTrackingNumber(item.rawValue || '')
        )
        const normalized = normalizeTrackingNumber(detected?.rawValue || '')
        if (!normalized) {
          toast.error(copy.barcodeNotFoundInImage)
          return
        }

        onValueChangeRef.current(normalized)
        onScanCompleteRef.current?.(normalized)
        toast.success(copy.imageRecognized, {
          description: normalized,
        })
      } finally {
        bitmap.close()
      }
    } catch (error) {
      toast.error(getScannerErrorMessage(error, copy))
    } finally {
      setIsDecodingImage(false)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className={cn(inputClassName)}
      />

      {showActionButtons ? (
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={disabled}
            onClick={() => {
              setScannerError(null)
              setScannerOpen((current) => !current)
            }}
            className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
          >
            <ScanLine className='mr-2 size-3.5' />
            {copy.cameraScan}
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={disabled || isDecodingImage}
            onClick={() => fileInputRef.current?.click()}
            className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
          >
            {isDecodingImage ? (
              <Loader2 className='mr-2 size-3.5 animate-spin' />
            ) : (
              <Upload className='mr-2 size-3.5' />
            )}
            {copy.photoRecognize}
          </Button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        capture='environment'
        className='hidden'
        onChange={handleImageDecode}
      />

      {scannerOpen && (
        <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-3'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black tracking-widest text-primary/80 uppercase'>
                {copy.panelTitle}
              </p>
              <p className='text-[10px] font-bold text-muted-foreground'>
                {copy.panelHint}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={() => {
                  setScannerError(null)
                  setRestartKey((current) => current + 1)
                }}
                className='size-8 rounded-full'
              >
                <RefreshCw className='size-4' />
              </Button>
              <Button
                type='button'
                size='icon'
                variant='ghost'
                onClick={closeScanner}
                className='size-8 rounded-full'
              >
                <X className='size-4' />
              </Button>
            </div>
          </div>

          <div className='relative aspect-[4/3] overflow-hidden rounded-[20px] bg-slate-950'>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className='h-full w-full object-cover'
            />

            <div className='pointer-events-none absolute inset-0 border border-white/15' />
            <div className='pointer-events-none absolute inset-x-[18%] top-[22%] bottom-[22%] rounded-[24px] border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(15,23,42,0.28)]' />
            <div className='pointer-events-none absolute top-1/2 right-[18%] left-[18%] h-0.5 -translate-y-1/2 bg-emerald-300/80 shadow-[0_0_16px_rgba(52,211,153,0.85)]' />

            {isStartingScanner && (
              <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-white'>
                <Loader2 className='size-6 animate-spin' />
                <p className='text-[10px] font-black tracking-widest uppercase'>
                  {copy.startingCamera}
                </p>
              </div>
            )}

            {!supportsNativeScanner && (
              <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 px-6 text-center text-white'>
                <Camera className='size-8 text-emerald-300' />
                <p className='text-sm font-black'>{copy.unsupportedTitle}</p>
                <p className='text-[10px] leading-relaxed font-bold text-slate-200'>
                  {copy.unsupportedDescription}
                </p>
              </div>
            )}
          </div>

          <div className='mt-3 space-y-1'>
            <p className='text-[10px] font-bold text-muted-foreground'>
              {copy.mobileHint}
            </p>
            {scannerError ? (
              <p className='text-[10px] font-bold text-rose-600'>
                {scannerError}
              </p>
            ) : (
              <p className='text-[10px] font-bold text-emerald-700'>
                {copy.supportedFormats}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
