'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { CADViewer } from './cad-viewer'
import { FileCode, Target } from 'lucide-react'

interface CADViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string;
    fileName: string;
    sku?: string;
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
    sku
}: CADViewerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-[95vw] w-[95vw] p-0 h-[85vh] bg-[#121212] border-white/5 overflow-hidden flex flex-col'>
                {/* 自定义抬头 */}
                <DialogHeader className='p-6 bg-[#1a1a1a] border-b border-white/5'>
                    <div className='flex items-center justify-between pr-8'>
                        <div className='flex items-center gap-4'>
                            <div className='size-12 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-500 shadow-inner'>
                                <FileCode className='size-6' />
                            </div>
                            <div className='space-y-0.5 min-w-0'>
                                <DialogTitle className='text-lg font-black tracking-tight text-white uppercase truncate'>
                                    {fileName}
                                </DialogTitle>
                                <DialogDescription className='text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2 truncate'>
                                    <Target className='size-3 text-blue-600' />
                                    工程档案预览模式 | 关联型号: <span className='text-blue-500 font-mono'>{sku || 'N/A'}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* 核心查看器内容区 */}
                <div className='flex-1 p-8 bg-[#0d0d0d] overflow-hidden flex flex-col items-center justify-center min-h-0'>
                    <CADViewer fileUrl={fileUrl} className='h-full w-full' />
                </div>

                {/* 页脚提示 */}
                <div className='px-8 py-4 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-tighter text-white/20 italic'>
                    <span>Autodesk Platform Services (APS) Certified Pipeline</span>
                    <span>DO NOT DISTRIBUTE THIS DRAWING WITHOUT AUTHORIZATION</span>
                </div>
            </DialogContent>
        </Dialog>
    )
}
