'use client'

import { FileText, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PDFViewer } from './pdf-viewer'

interface PDFViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileUrl: string
  fileName: string
  sku?: string
}

/**
 * PDFViewerDialog
 * 提供沉浸式的 PDF 蓝图预览对话框
 */
export function PDFViewerDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  sku,
}: PDFViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] w-[95vw] flex-col overflow-hidden border-none bg-card p-0 sm:max-w-[95vw]'>
        {/* 装饰性页头 */}
        <DialogHeader className='border-b bg-muted/30 p-6'>
          <div className='flex items-center justify-between pr-8'>
            <div className='flex items-center gap-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 shadow-inner'>
                <FileText className='size-6' />
              </div>
              <div className='min-w-0 space-y-0.5'>
                <DialogTitle className='truncate text-lg font-black tracking-tight uppercase'>
                  {fileName}
                </DialogTitle>
                <DialogDescription className='flex items-center gap-2 truncate text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>
                  <ShieldCheck className='size-3 text-indigo-600' />
                  技术文档预览 · 归档型号:{' '}
                  <span className='font-mono text-indigo-600'>
                    {sku || 'N/A'}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 预览区 */}
        <div className='min-h-0 flex-1 overflow-hidden bg-muted/5 p-6'>
          <PDFViewer
            fileUrl={fileUrl}
            className='h-full shadow-2xl shadow-indigo-500/5'
          />
        </div>

        {/* 页脚 */}
        <div className='flex items-center justify-center border-t bg-muted/10 px-8 py-4 text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
          Engineering Document Engine
        </div>
      </DialogContent>
    </Dialog>
  )
}
