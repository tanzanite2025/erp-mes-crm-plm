'use client'

import { useRef, useState } from 'react'
import { AssetService } from '@/services/asset-service'
import { Camera, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  value?: string
  onChange: (value: string) => void
  label: string
}

export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const { t } = useLanguage()
  const isMobile = useIsMobile()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      const res = await AssetService.uploadFile(file)
      onChange(res.url)
      toast.success(t('equipmentTooling.imageUpload.toast.uploaded'))
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t('equipmentTooling.common.unknownError')
      toast.error(t('equipmentTooling.imageUpload.toast.failed', { message }))
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = () => {
    onChange('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className='space-y-3'>
      <div className='mb-1 flex items-center gap-2'>
        <Camera className='size-3.5 text-muted-foreground/40' />
        <span className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
          {label}
        </span>
      </div>
      {value ? (
        <div className='group relative flex aspect-video items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-primary/20 bg-muted/5'>
          <img
            src={value}
            alt={t('equipmentTooling.imageUpload.previewAlt')}
            className='m-1 h-full w-full rounded-[20px] object-cover'
          />
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center gap-3 bg-black/60 backdrop-blur-sm transition-opacity',
              isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <Button
              variant='secondary'
              size='sm'
              className='h-10 rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
              onClick={() => fileInputRef.current?.click()}
            >
              {t('equipmentTooling.imageUpload.actions.replace')}
            </Button>
            <Button
              variant='destructive'
              size='icon'
              className='size-10 rounded-full'
              onClick={removeImage}
            >
              <X className='size-4' />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`group flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-6 transition-all sm:p-8 ${isUploading ? 'cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'}`}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <div className='flex size-12 items-center justify-center rounded-full bg-white text-muted-foreground/40 shadow-xl transition-transform group-hover:scale-110 sm:size-14'>
            {isUploading ? (
              <Loader2 className='size-6 animate-spin text-primary' />
            ) : (
              <Camera className='size-6 transition-colors group-hover:text-primary' />
            )}
          </div>
          <div className='space-y-1 px-4 text-center'>
            <p className='text-[10px] font-black tracking-widest text-foreground uppercase sm:text-[11px]'>
              {isUploading
                ? t('equipmentTooling.imageUpload.state.uploading')
                : t('equipmentTooling.imageUpload.state.captureOrUpload')}
            </p>
            <p className='text-[8px] font-bold tracking-tighter text-muted-foreground/40 uppercase tabular-nums sm:text-[9px]'>
              {isUploading
                ? t('equipmentTooling.imageUpload.state.waitForSync')
                : t('equipmentTooling.imageUpload.state.formatHint')}
            </p>
          </div>
        </div>
      )}

      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        accept='image/*'
        capture='environment'
        className='hidden'
      />
    </div>
  )
}
