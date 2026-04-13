import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, FileVideo, Image as ImageIcon, Loader2, RefreshCcw, Upload, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AssetService } from '@/services/asset-service'
import { cn } from '@/lib/utils'
import type { PersonalLocalMediaDraft } from '../data/schema'
import { useLocalMediaDrafts } from '../hooks/use-local-media-drafts'
import { useMediaRecorder } from '../hooks/use-media-recorder'
import { PersonalWorkbenchVideoRecorder } from './personal-workbench-video-recorder'

interface PersonalWorkbenchImagePickerProps {
  autoPrepareRecording?: boolean
  autoStartCamera?: boolean
  autoTriggerPhotoPicker?: boolean
  compactMode?: boolean
  initialDraftId?: string | null
  initialCaptureMode?: 'photo' | 'video'
  onDraftCreated?: (draftId: string) => void
  value?: string
  onChange: (value: string) => void
}

export function PersonalWorkbenchImagePicker({
  autoPrepareRecording = false,
  autoStartCamera = false,
  autoTriggerPhotoPicker = false,
  compactMode = false,
  initialDraftId = null,
  initialCaptureMode = 'photo',
  onDraftCreated,
  value,
  onChange,
}: PersonalWorkbenchImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [cameraMode, setCameraMode] = useState(false)
  const [cameraError, setCameraError] = useState<string>('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>(initialCaptureMode)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const { drafts, getDraftById, isReady: isDraftStoreReady, removeDraft, saveDraft, updateDraft } = useLocalMediaDrafts()
  const {
    clearLastRecordedFile,
    countdown,
    isRecording,
    isSupported: supportsVideoRecording,
    lastRecordedFile,
    startRecording,
    stopRecording,
  } = useMediaRecorder({ maxDurationSeconds: 10 })

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

  useEffect(() => {
    setCaptureMode(initialCaptureMode)
  }, [initialCaptureMode])

  const startCamera = useCallback(async (nextFacingMode: 'user' | 'environment' = facingMode) => {
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
  }, [facingMode, supportsCamera])

  const activeDraft = useMemo(() => getDraftById(activeDraftId), [activeDraftId, getDraftById])

  useEffect(() => {
    if (!initialDraftId) {
      return
    }

    setActiveDraftId(initialDraftId)
  }, [initialDraftId])

  const activeDraftPreviewUrl = useMemo(() => {
    if (!activeDraft) {
      return ''
    }
    return URL.createObjectURL(activeDraft.file)
  }, [activeDraft])

  const uploadedMediaUrl = activeDraft?.status === 'uploaded' || activeDraft?.status === 'linked_to_record' ? value : value
  const shouldShowUploadedPreview = !activeDraft && !!uploadedMediaUrl

  useEffect(() => {
    return () => {
      if (activeDraftPreviewUrl) {
        URL.revokeObjectURL(activeDraftPreviewUrl)
      }
    }
  }, [activeDraftPreviewUrl])

  const uploadDraftToServer = useCallback(async () => {
    if (!activeDraft) {
      toast.error('当前没有可上传的本地草稿')
      return
    }

    try {
      setIsUploading(true)
      await updateDraft({ ...activeDraft, status: 'uploading' })
      const response = await AssetService.uploadFile(activeDraft.file)
      onChange(response.url)
      await updateDraft({ ...activeDraft, status: 'uploaded' })
      toast.success('媒体已上传到服务器')
    } catch (error) {
      const message = error instanceof Error ? error.message : '媒体上传失败'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
  }, [activeDraft, onChange, updateDraft])

  const discardActiveDraft = useCallback(async () => {
    if (!activeDraft) {
      return
    }

    try {
      await removeDraft(activeDraft.id)
      setActiveDraftId(null)
      if ((activeDraft.status === 'uploaded' || activeDraft.status === 'linked_to_record') && value) {
        onChange('')
      }
      toast.success(
        activeDraft.status === 'uploaded' || activeDraft.status === 'linked_to_record'
          ? '本地草稿已移除，当前媒体引用已清空'
          : '本地草稿已丢弃'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '丢弃本地草稿失败'
      toast.error(message)
    }
  }, [activeDraft, onChange, removeDraft, value])

  const saveLocalDraft = useCallback(async ({
    durationSeconds,
    file,
    kind,
  }: {
    durationSeconds?: number
    file: File
    kind: 'image' | 'video'
  }): Promise<PersonalLocalMediaDraft | null> => {
    const draft = await saveDraft({ durationSeconds, file, kind })
    if (draft) {
      toast.success(kind === 'video' ? '视频已保存到本地草稿' : '图片已保存到本地草稿')
      onDraftCreated?.(draft.id)
    }
    return draft
  }, [onDraftCreated, saveDraft])

  useEffect(() => {
    if (!lastRecordedFile) {
      return
    }

    void (async () => {
      const draft = await saveLocalDraft({ durationSeconds: 10, file: lastRecordedFile, kind: 'video' })
      if (draft) {
        setActiveDraftId(draft.id)
      }
      clearLastRecordedFile()
    })()
  }, [clearLastRecordedFile, lastRecordedFile, saveLocalDraft])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const draft = await saveLocalDraft({ file, kind: 'image' })
    if (draft) {
      setActiveDraftId(draft.id)
    }
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
    const draft = await saveLocalDraft({ file, kind: 'image' })
    if (draft) {
      setActiveDraftId(draft.id)
    }
  }

  const handleToggleFacingMode = async () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment'
    await startCamera(nextMode)
  }

  const handleStartRecording = useCallback(async () => {
    if (!stream) {
      toast.error('请先打开相机')
      return
    }
    try {
      await startRecording(stream)
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法开始录制视频'
      toast.error(message)
    }
  }, [startRecording, stream])

  const handleStopRecording = useCallback(async () => {
    await stopRecording()
  }, [stopRecording])

  const handleOpenFilePicker = () => {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  const handleCloseCamera = () => {
    setCameraMode(false)
    stopStream()
  }

  useEffect(() => {
    if (!autoStartCamera || cameraMode || isStartingCamera || !supportsCamera) {
      return
    }

    void startCamera(initialCaptureMode === 'video' ? 'environment' : facingMode)
  }, [autoStartCamera, cameraMode, facingMode, initialCaptureMode, isStartingCamera, startCamera, supportsCamera])

  useEffect(() => {
    if (!autoTriggerPhotoPicker || initialCaptureMode !== 'photo' || value || activeDraft || cameraMode) {
      return
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.click()
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeDraft, autoTriggerPhotoPicker, cameraMode, initialCaptureMode, value])

  useEffect(() => {
    if (!autoPrepareRecording || captureMode !== 'video' || cameraMode || isStartingCamera || !supportsCamera) {
      return
    }

    void startCamera('environment')
  }, [autoPrepareRecording, cameraMode, captureMode, isStartingCamera, startCamera, supportsCamera])

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
          <Camera className='size-3.5' />
          图片
        </div>
        {supportsCamera ? <Badge variant='outline'>{supportsVideoRecording ? '媒体增强' : '相机增强'}</Badge> : <Badge variant='outline'>普通上传</Badge>}
      </div>
      {!compactMode && isDraftStoreReady && drafts.length > 0 ? (
        <div className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-primary'>
          当前已有 {drafts.length} 条本地媒体草稿
        </div>
      ) : null}
      {activeDraft ? (
        <div className='space-y-3 rounded-2xl border border-dashed border-primary/20 bg-background/80 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary'>
              {activeDraft.kind === 'video' ? <FileVideo className='size-4' /> : <ImageIcon className='size-4' />}
              当前本地草稿
            </div>
            <Badge variant={activeDraft.status === 'uploaded' || activeDraft.status === 'linked_to_record' ? 'secondary' : 'outline'}>
              {activeDraft.status === 'linked_to_record'
                ? '已关联记录'
                : activeDraft.status === 'uploaded'
                  ? '已上传'
                  : activeDraft.status === 'uploading'
                    ? '上传中'
                    : '本地草稿'}
            </Badge>
          </div>
          {activeDraft.kind === 'video' ? (
            <video src={activeDraftPreviewUrl} controls className='aspect-video w-full rounded-2xl object-cover' />
          ) : (
            <img src={activeDraftPreviewUrl} alt='local draft preview' className='aspect-video w-full rounded-2xl object-cover' />
          )}
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[11px] text-muted-foreground'>
              {activeDraft.status === 'linked_to_record'
                ? '该草稿已关联到个人记录，可继续保留或手动清理。'
                : activeDraft.status === 'uploaded'
                  ? '该草稿已上传到服务器，可直接保存记录。'
                  : activeDraft.status === 'uploading'
                    ? '媒体正在上传到服务器，请稍候。'
                    : '当前媒体仅保存在本地，需要你手动上传到服务器后才会写入记录。'}
            </p>
            <div className='flex flex-wrap gap-2'>
              <Button type='button' variant='outline' className='rounded-full' onClick={() => void discardActiveDraft()} disabled={isUploading}>
                <X className='size-4' />
                丢弃草稿
              </Button>
              <Button type='button' className='rounded-full' onClick={() => void uploadDraftToServer()} disabled={isUploading || activeDraft.status === 'uploaded' || activeDraft.status === 'linked_to_record' || activeDraft.status === 'uploading'}>
                {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
                上传到服务器
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {shouldShowUploadedPreview ? (
        <div className='group relative overflow-hidden rounded-2xl border border-dashed border-primary/20 bg-muted/5 aspect-video'>
          <img src={uploadedMediaUrl} alt='record cover' className='h-full w-full object-cover' />
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
            <div
              className={cn(
                'overflow-hidden rounded-2xl border border-dashed bg-muted/5 transition-colors',
                isRecording ? 'border-destructive/70 shadow-[0_0_0_1px_rgba(220,38,38,0.18)]' : 'border-primary/20'
              )}
            >
              <div className='relative aspect-video bg-black'>
                <video ref={videoRef} autoPlay playsInline muted className='h-full w-full object-cover' />
                <div className='absolute left-3 top-3 flex items-center gap-2'>
                  <Badge variant='secondary'>{facingMode === 'environment' ? '后置' : '前置'}</Badge>
                  {captureMode === 'video' ? <Badge variant='outline'>视频</Badge> : <Badge variant='outline'>拍照</Badge>}
                  {captureMode === 'video' && !isRecording ? <Badge variant='secondary'>准备录制</Badge> : null}
                </div>
              </div>
              <div className={cn('flex flex-wrap items-center justify-between gap-2 border-t bg-background/90 p-3', compactMode && 'gap-3')}>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' variant='outline' size='sm' className='rounded-full' onClick={handleToggleFacingMode} disabled={isStartingCamera || isUploading}>
                    <RefreshCcw className='size-4' />
                    切换镜头
                  </Button>
                  {!compactMode ? (
                    <Button type='button' variant='outline' size='sm' className='rounded-full' onClick={handleOpenFilePicker} disabled={isUploading}>
                      <Upload className='size-4' />
                      文件上传
                    </Button>
                  ) : null}
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button type='button' variant='ghost' size='sm' className='rounded-full' onClick={handleCloseCamera} disabled={isUploading}>
                    <CameraOff className='size-4' />
                    关闭相机
                  </Button>
                  {captureMode === 'photo' && !compactMode ? (
                    <Button type='button' size='sm' className='rounded-full' onClick={() => void handleCapturePhoto()} disabled={isUploading || isStartingCamera || isRecording}>
                      {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Camera className='size-4' />}
                      拍照保存到本地
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className='border-t bg-background/80 px-3 pb-3'>
                <Tabs value={captureMode} onValueChange={(value) => setCaptureMode(value as 'photo' | 'video')} className='gap-3 pt-3'>
                  <TabsList className={cn('grid w-full grid-cols-2 rounded-full', compactMode && 'hidden')}>
                    <TabsTrigger value='photo' className='rounded-full'>
                      <Camera className='size-4' />
                      拍照
                    </TabsTrigger>
                    <TabsTrigger value='video' className='rounded-full' disabled={!supportsVideoRecording}>
                      <Video className='size-4' />
                      录视频
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                {captureMode === 'video' ? (
                  <div className='pt-3'>
                    <PersonalWorkbenchVideoRecorder
                      countdown={countdown}
                      disabled={isUploading || isStartingCamera}
                      isRecording={isRecording}
                      isSupported={supportsVideoRecording}
                      onStart={() => void handleStartRecording()}
                      onStop={() => void handleStopRecording()}
                    />
                  </div>
                ) : null}
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
                  {isUploading ? '处理中' : compactMode ? '点击调用系统拍照' : '选择图片并保存到本地'}
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
