'use client'

import React, { useRef, useState } from 'react'
import { CloudUpload, FileText, Plus, X } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
        'relative group cursor-pointer transition-all duration-300',
        'border-2 border-dashed rounded-2xl p-6 min-h-[120px]',
        'flex flex-col items-center justify-center gap-2',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
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
          <div className='size-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 group-hover:text-primary transition-colors'>
            <Plus className='size-6' />
          </div>
          <div className='text-center'>
            <p className='text-sm font-bold text-foreground'>{displayPlaceholder}</p>
            <p className='text-[10px] text-muted-foreground mt-1 uppercase tracking-widest font-black'>
              {t('fileUploader.maxSize', { max: 50 })}
            </p>
          </div>
          <CloudUpload className='absolute bottom-3 right-3 size-5 text-muted-foreground/20 group-hover:text-primary/40 transition-colors' />
        </>
      ) : (
        <div className='flex items-center gap-4 w-full animate-in fade-in slide-in-from-bottom-2'>
          <div className='size-12 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner'>
            <FileText className='size-6' />
          </div>
          <div className='flex-1 min-w-0'>
            <p className='text-sm font-black truncate text-foreground'>{value.split('/').pop()}</p>
            <p className='text-[10px] text-emerald-600 font-mono mt-0.5 font-bold uppercase'>
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
