'use client'

import { useState, useRef } from 'react'
import { Upload, FolderPlus, FileCode, X } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const logger = createLogger('FileUploadZone')

interface FileUploadZoneProps {
  fileUrl?: string
  fileName?: string
  fileExtension?: string
  onFileSelected: (name: string, ext: string, url: string) => void
  onFileClear: () => void
}

export function FileUploadZone({
  fileUrl,
  fileName,
  fileExtension,
  onFileSelected,
  onFileClear,
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const name = file.name.split('.').slice(0, -1).join('.')
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF'

    // 生成基于时间戳和文件名的唯一 ID
    const fileId = `file-${Date.now()}-${file.name}`

    try {
      // 真正将二进制流存入 IndexedDB
      const { StorageService } =
        await import('@/features/system-mgmt/services/storage-service')
      await StorageService.setItem(fileId, file)

      onFileSelected(name, ext, fileId)
      toast.success(`文件已永久存入本地库: ${file.name}`)
    } catch (e) {
      logger.error('Failed to save file binary', e)
      toast.error('文件存入本地失败，请重试')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files)
    }
  }

  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[20px] border-2 border-dashed p-10 transition-all duration-300 ${dragActive ? 'scale-[0.98] border-teal-500 bg-teal-500/5' : 'border-muted-foreground/20 hover:border-teal-500/50 hover:bg-muted/40'} ${fileUrl ? 'border-teal-500/30 bg-teal-500/5' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !fileUrl && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type='file'
        className='hidden'
        onChange={(e) => processFiles(e.target.files)}
        accept='.dwg,.dxf,.stp,.step,.pdf'
      />
      <input
        ref={folderInputRef}
        type='file'
        className='hidden'
        // @ts-expect-error - non-standard folder upload attributes are supported by Chromium
        webkitdirectory=''
        directory=''
        onChange={(e) => processFiles(e.target.files)}
      />

      {fileUrl ? (
        <div className='flex animate-in flex-col items-center duration-500 fade-in slide-in-from-bottom-2'>
          <div className='group relative mb-2 flex size-20 items-center justify-center rounded-3xl bg-teal-500/10 text-teal-600'>
            <FileCode className='size-10 transition-transform group-hover:scale-110' />
            <div className='absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-card bg-teal-500 text-white shadow-lg'>
              <div className='size-2 animate-pulse rounded-full bg-white' />
            </div>
          </div>
          <div className='text-center'>
            <p className='max-w-[200px] truncate text-sm font-black tracking-tight text-foreground/80'>
              {fileName}
            </p>
            <Badge
              variant='outline'
              className='mt-1 border-teal-500/20 bg-teal-500/5 font-mono text-[10px] font-bold text-teal-600'
            >
              .{fileExtension}
            </Badge>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='mt-4 h-8 rounded-full text-[10px] font-black tracking-widest text-muted-foreground uppercase transition-all hover:bg-rose-500/5 hover:text-rose-500'
            onClick={(e) => {
              e.stopPropagation()
              onFileClear()
            }}
          >
            <X className='mr-1 size-3' /> 移除并重新导入
          </Button>
        </div>
      ) : (
        <>
          <div className='flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground transition-all duration-300 group-hover:bg-teal-500/10 group-hover:text-teal-600'>
            <Upload className='size-7' />
          </div>
          <div className='space-y-1 text-center'>
            <p className='text-sm font-black tracking-tight'>
              拖拽文件或文件夹到此处
            </p>
            <p className='text-[11px] font-medium text-muted-foreground italic opacity-60'>
              识别系统将提取文件名并解析格式
            </p>
          </div>
          <div className='mt-2 flex gap-3' onClick={(e) => e.stopPropagation()}>
            <Button
              type='button'
              variant='secondary'
              size='sm'
              className='h-9 rounded-full px-4 text-[11px] font-black tracking-wider uppercase shadow-sm'
              onClick={() => fileInputRef.current?.click()}
            >
              选择图档
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-9 gap-2 rounded-full bg-muted/20 px-4 text-[11px] font-black tracking-wider uppercase'
              onClick={() => folderInputRef.current?.click()}
            >
              <FolderPlus className='size-3.5 text-teal-600' /> 导入文件夹
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
