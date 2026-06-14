'use client'

import React, { useRef, useState } from 'react'
import { CloudUpload, FileText, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { StorageService } from '@/features/system-mgmt/services/storage-service'

const logger = createLogger('FileUploader')

interface FileUploaderProps {
  value?: string
  onChange: (url: string, extension?: string) => void
  placeholder?: string
  className?: string
  accept?: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024

export function FileUploader({
  value,
  onChange,
  placeholder,
  className,
  accept = '.pdf,.dwg,.dxf,.stp,.step,.xlsx,.docx',
}: FileUploaderProps) {
  const { t } = useLanguage()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        t('fileUploader.toasts.maxSizeExceeded', {
          size: (file.size / 1024 / 1024).toFixed(1),
          max: 50,
        })
      )
      return
    }

    const fileName = file.name
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const storageKey = `file-${Date.now()}-${fileName}`

    try {
      await StorageService.setItem(storageKey, file)
      onChange(storageKey, extension)
    } catch (error) {
      logger.error('Failed to save file to storage', error)
      toast.error(t('fileUploader.toasts.saveFailed'))
    }
  }

  const onContainerClick = () => {
    fileInputRef.current?.click()
  }

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = () => {
    setIsDragging(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('', '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const displayPlaceholder = placeholder || t('fileUploader.placeholder')

  return (
    <div
      className={cn(
        'group relative cursor-pointer transition-all duration-300',
        'min-h-[120px] rounded-2xl border-2 border-dashed p-6',
        'flex flex-col items-center justify-center gap-2',
        isDragging
          ? 'scale-[1.01] border-primary bg-primary/5'
          : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30',
        value ? 'border-emerald-500/50 bg-emerald-500/5' : '',
        className
      )}
      onClick={onContainerClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type='file'
        className='hidden'
        ref={fileInputRef}
        onChange={onFileSelect}
        accept={accept}
      />

      {!value ? (
        <>
          <div className='flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/20 group-hover:text-primary'>
            <Plus className='size-6' />
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold text-foreground'>
              {displayPlaceholder}
            </p>
            <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('fileUploader.maxSize', { max: 50 })}
            </p>
          </div>
          <CloudUpload className='absolute right-3 bottom-3 size-5 text-muted-foreground/20 transition-colors group-hover:text-primary/40' />
        </>
      ) : (
        <div className='flex w-full animate-in items-center gap-4 fade-in slide-in-from-bottom-2'>
          <div className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 shadow-inner'>
            <FileText className='size-6' />
          </div>
          <div className='min-w-0 flex-1'>
            <p className='truncate text-sm font-black text-foreground'>
              {value.split('/').pop()}
            </p>
            <p className='mt-0.5 font-mono text-[10px] font-bold text-emerald-600 uppercase'>
              {t('fileUploader.ready')}
            </p>
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='size-8 rounded-full hover:bg-destructive/10 hover:text-destructive'
            onClick={clearFile}
          >
            <X className='size-4' />
          </Button>
        </div>
      )}
    </div>
  )
}
