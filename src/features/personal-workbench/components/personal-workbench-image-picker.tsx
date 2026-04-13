import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Loader2, RefreshCcw, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AssetService } from '@/services/asset-service'
import { cn } from '@/lib/utils'

interface PersonalWorkbenchImagePickerProps {
  value?: string
  onChange: (value: string) => void
}

export function PersonalWorkbenchImagePicker({ value, onChange }: PersonalWorkbenchImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [cameraMode, setCameraMode] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [stream, setStream] = useState<MediaStream | null>(null)

  const supportsCamera = useMemo(() => {
    return typeof navigator !== 'undefined' &&
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      !!navigator.mediaDevices?.getUserMedia
  }, [])

  const stopStream = () => {
    setStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [])

  useEffect(() => {
    if (!stream || !videoRef.current) {
      return
    }
    videoRef.current.srcObject = stream
    void videoRef.current.play().catch(() => undefined)
  }, [stream])

  const startCamera = async (nextFacingMode: 'user' | 'environment' = facingMode) => {
    if (!supportsCamera) {
      setCameraError('当前环境不支持页面内相机，已回退为文件上传')
      setCameraMode(false)
      return
    }

    try {
      setIsStartingCamera(true)
      setCameraError('')
      stopStream()
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: nextFacingMode },
        },
      })
      setFacingMode(nextFacingMode)
      setStream(nextStream)
      setCameraMode(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法打开摄像头'
      setCameraError(message)
      setCameraMode(false)
      stopStream()
      toast.error('无法打开摄像头，已回退为普通上传')
    } finally {
      setIsStartingCamera(false)
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setIsUploading(true)
      const response = await AssetService.uploadFile(file)
      onChange(response.url)
      toast.success('图片已上传')
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片上传失败'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    await uploadFile(file)
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleCapturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast.error('相机尚未准备完成')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth
    const height = video.videoHeight

    if (!width || !height) {
      toast.error('当前画面不可用，请稍后再试')
      return
    }

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      toast.error('无法处理拍照画面')
      return
    }

    context.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (!blob) {
      toast.error('拍照失败，请重试')
      return
    }

    const file = new File([blob], `personal-record-${Date.now()}.jpg`, { type: 'image/jpeg' })
    await uploadFile(file)
  }

  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    await startCamera(nextMode)
  }

  const handleOpenFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  const handleCloseCamera = () => {
    setCameraMode(false)
    stopStream()
  }

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
          <Camera className='size-3.5' />
          图片
        </div>
        {supportsCamera ? <Badge variant='outline'>相机增强</Badge> : <Badge variant='outline'>普通上传</Badge>}
      </div>
      {value ? (
        <div className='group relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-muted/5 aspect-video'>
          <img src={value} alt='record cover' className='h-full w-full object-cover' />
          <div className='absolute inset-0 flex items-center justify-center gap-3 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100'>
            <Button type='button' size='sm' variant='secondary' className='rounded-full' onClick={handleOpenFilePicker}>
              替换
            </Button>
            <Button type='button' size='icon' variant='destructive' className='rounded-full' onClick={() => onChange('')}>
              <X className='size-4' />
            </Button>
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          {cameraMode ? (
            <div className='overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-muted/5'>
              <div className='relative aspect-video bg-black'>
                <video ref={videoRef} autoPlay playsInline muted className='h-full w-full object-cover' />
                <div className='absolute left-3 top-3 flex items-center gap-2'>
                  <Badge variant='secondary'>{facingMode === 'environment' ? '后置' : '前置'}</Badge>
                </div>
              </div>
              <div className='flex flex-wrap items-center justify-between gap-2 border-t bg-background/90 p-3'>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' variant='outline' size='sm' className='rounded-full' onClick={handleToggleFacingMode} disabled={isStartingCamera || isUploading}>
                    <RefreshCcw className='size-4' />
                    切换镜头
                  </Button>
                  <Button type='button' variant='outline' size='sm' className='rounded-full' onClick={handleOpenFilePicker} disabled={isUploading}>
                    <Upload className='size-4' />
                    文件上传
                  </Button>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' variant='ghost' size='sm' className='rounded-full' onClick={handleCloseCamera} disabled={isUploading}>
                    <CameraOff className='size-4' />
                    关闭相机
                  </Button>
                  <Button type='button' size='sm' className='rounded-full' onClick={() => void handleCapturePhoto()} disabled={isUploading || isStartingCamera}>
                    {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Camera className='size-4' />}
                    拍照上传
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className='grid gap-3'>
              <button
                type='button'
                onClick={handleOpenFilePicker}
                className={cn(
                  'flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/20 bg-muted/5 transition-colors hover:border-primary/40 hover:bg-primary/5',
                  isUploading && 'cursor-not-allowed opacity-70'
                )}
              >
                {isUploading ? <Loader2 className='size-6 animate-spin text-primary' /> : <Camera className='size-6 text-muted-foreground/50' />}
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {isUploading ? '上传中' : '上传图片'}
                </span>
              </button>
              {supportsCamera && (
                <Button type='button' variant='outline' className='rounded-full' onClick={() => void startCamera()} disabled={isUploading || isStartingCamera}>
                  {isStartingCamera ? <Loader2 className='size-4 animate-spin' /> : <Camera className='size-4' />}
                  打开相机面板
                </Button>
              )}
              {cameraError ? (
                <div className='rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-700'>
                  {cameraError}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
      <canvas ref={canvasRef} className='hidden' />
      <input ref={inputRef} type='file' accept='image/*' capture='environment' className='hidden' onChange={handleFileChange} />
    </div>
  )
}
