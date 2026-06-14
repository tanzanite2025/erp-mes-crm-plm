'use client'

import { FileCode, Target } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CADViewer } from './cad-viewer'

interface CADViewerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileUrl: string
  fileName: string
  sku?: string
}

/**
 * CADViewerDialog
 * 提供沉浸式的 CAD 图纸预览对话框
 */
export function CADViewerDialog({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  sku,
}: CADViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[85vh] w-[95vw] flex-col overflow-hidden border-white/5 bg-[#121212] p-0 sm:max-w-[95vw]'>
        {/* 自定义抬头 */}
        <DialogHeader className='border-b border-white/5 bg-[#1a1a1a] p-6'>
          <div className='flex items-center justify-between pr-8'>
            <div className='flex items-center gap-4'>
              <div className='flex size-12 items-center justify-center rounded-2xl border border-blue-600/20 bg-blue-600/10 text-blue-500 shadow-inner'>
                <FileCode className='size-6' />
              </div>
              <div className='min-w-0 space-y-0.5'>
                <DialogTitle className='truncate text-lg font-black tracking-tight text-white uppercase'>
                  {fileName}
                </DialogTitle>
                <DialogDescription className='flex items-center gap-2 truncate text-[10px] font-bold tracking-widest text-white/30 uppercase'>
                  <Target className='size-3 text-blue-600' />
                  工程档案预览模式 | 关联型号:{' '}
                  <span className='font-mono text-blue-500'>
                    {sku || 'N/A'}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 核心查看器内容区 */}
        <div className='flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[#0d0d0d] p-8'>
          <CADViewer fileUrl={fileUrl} className='h-full w-full' />
        </div>

        {/* 页脚提示 */}
        <div className='flex items-center justify-between border-t border-white/5 bg-[#1a1a1a] px-8 py-4 text-[9px] font-black tracking-tighter text-white/20 uppercase italic'>
          <span>Autodesk Platform Services (APS) Certified Pipeline</span>
          <span>DO NOT DISTRIBUTE THIS DRAWING WITHOUT AUTHORIZATION</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
