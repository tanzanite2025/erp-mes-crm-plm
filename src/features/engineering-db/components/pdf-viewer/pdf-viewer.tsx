'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Loader2,
  Download,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PDFViewerProps {
  fileUrl: string
  className?: string
}

/**
 * PDFViewer 组件
 * 基于原生 iframe 和 Blob URL 提供 PDF 在线预览
 */
export function PDFViewer({ fileUrl, className }: PDFViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [displayUrl, setDisplayUrl] = useState<string>('')

  useEffect(() => {
    const preparePdf = async () => {
      setIsLoading(true)

      // 移除模拟延迟，直接载入本地资源

      // 如果是演示用的相对路径，直接使用
      // 真实场景下会是类似: const blob = await fetch(fileUrl).then(r => r.blob()); setDisplayUrl(URL.createObjectURL(blob));
      setDisplayUrl(fileUrl)
      setIsLoading(false)
    }

    preparePdf()
  }, [fileUrl])

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileUrl.split('/').pop() || 'blueprint.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-[20px] border bg-card/50 bg-muted/10 backdrop-blur-sm ${className}`}
    >
      {/* 加载状态 */}
      {isLoading && (
        <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'>
          <Loader2 className='mb-4 size-10 animate-spin text-indigo-500' />
          <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
            正在载入技术蓝图...
          </p>
        </div>
      )}

      {/* 内容渲染区 */}
      {!isLoading &&
        displayUrl &&
        (() => {
          const isImage =
            /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(displayUrl) ||
            displayUrl.startsWith('data:image/') ||
            (displayUrl.startsWith('blob:') &&
              fileUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/))

          if (isImage) {
            return (
              <div className='flex h-full w-full items-center justify-center bg-muted/20 p-4'>
                <img
                  src={displayUrl}
                  className='max-h-full max-w-full rounded-lg object-contain shadow-2xl'
                  alt='Preview'
                  onError={() => setIsLoading(false)} // Simple error fallback
                />
              </div>
            )
          }

          return (
            <iframe
              src={`${displayUrl}#toolbar=0&navpanes=0`}
              className='h-full w-full border-none'
              title='PDF Preview'
              onLoad={() => setIsLoading(false)}
            />
          )
        })()}

      {!isLoading && !displayUrl && (
        <div className='flex h-full flex-col items-center justify-center p-12 text-destructive'>
          <AlertTriangle className='mb-4 size-12' />
          <p className='font-black tracking-tighter uppercase'>
            文件内容解析失败或文件损坏
          </p>
        </div>
      )}

      {/* 浮动控制工具 (仅在非加载时展示) */}
      {!isLoading && (
        <div className='absolute top-4 right-4 flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 rounded-full border-none bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white'
            onClick={handleDownload}
          >
            <Download className='mr-2 size-3.5' /> 下载原件
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='size-8 rounded-full border-none bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white'
            onClick={() => window.open(fileUrl, '_blank')}
          >
            <ExternalLink className='size-3.5' />
          </Button>
        </div>
      )}

      {/* 底部版权/安全信息 */}
      {!isLoading && (
        <div className='absolute right-4 bottom-4 left-4 flex items-center justify-between rounded-full border border-indigo-500/10 bg-indigo-500/5 px-4 py-2 text-[8px] font-bold tracking-tighter text-indigo-900/40 uppercase'>
          <div className='flex items-center gap-2'>
            <FileText className='size-3' />
            TECHNICAL BLUEPRINT OVERVIEW
          </div>
          <span>CONFIDENTIAL - INTERNAL ENGINEERING DOCUMENT</span>
        </div>
      )}
    </div>
  )
}
