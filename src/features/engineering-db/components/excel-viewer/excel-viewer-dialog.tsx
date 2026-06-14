'use client'

import { Suspense, lazy } from 'react'
import { FileSpreadsheet, TableProperties } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const ExcelViewer = lazy(() =>
  import('./excel-viewer').then((module) => ({ default: module.ExcelViewer }))
)

interface ExcelViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileUrl: string
  fileName: string
  sku?: string
}

/**
 * ExcelViewerDialog
 * 提供沉浸式的 Excel 表格数据预览对话框
 */
export function ExcelViewerDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  sku,
}: ExcelViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] w-[95vw] flex-col overflow-hidden border-none bg-card p-0 sm:max-w-[95vw]'>
        {/* 装饰性页头 */}
        <DialogHeader className='border-b bg-emerald-500/5 p-6'>
          <div className='flex items-center justify-between pr-8'>
            <div className='flex items-center gap-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-inner'>
                <FileSpreadsheet className='size-6' />
              </div>
              <div className='min-w-0 space-y-0.5'>
                <DialogTitle className='truncate text-lg font-black tracking-tight uppercase'>
                  {fileName}
                </DialogTitle>
                <DialogDescription className='flex items-center gap-2 truncate text-[10px] font-bold tracking-widest text-muted-foreground uppercase'>
                  <TableProperties className='size-3 text-emerald-600' />
                  结构化报表工具 · 归档型号:{' '}
                  <span className='font-mono text-emerald-600'>
                    {sku || 'N/A'}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 预览区 */}
        <div className='min-h-0 flex-1 overflow-hidden bg-muted/5 p-6'>
          <Suspense
            fallback={
              <div className='flex h-full items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
                Loading spreadsheet preview...
              </div>
            }
          >
            {open ? (
              <ExcelViewer
                fileUrl={fileUrl}
                className='h-full shadow-2xl shadow-emerald-500/5'
              />
            ) : null}
          </Suspense>
        </div>

        {/* 页脚 */}
        <div className='flex items-center justify-center border-t bg-muted/10 px-8 py-4 text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
          Spreadsheet Analysis Module
        </div>
      </DialogContent>
    </Dialog>
  )
}
