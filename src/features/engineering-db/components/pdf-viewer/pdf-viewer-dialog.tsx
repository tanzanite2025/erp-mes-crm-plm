'use client'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { PDFViewer } from './pdf-viewer'
import { FileText, ShieldCheck } from 'lucide-react'

interface PDFViewerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    fileUrl: string;
    fileName: string;
    sku?: string;
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
    sku
}: PDFViewerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-[95vw] w-[95vw] p-0 h-[85vh] bg-card border-none overflow-hidden flex flex-col'>
                {/* 装饰性页头 */}
                <DialogHeader className='p-6 border-b bg-muted/30'>
                    <div className='flex items-center justify-between pr-8'>
                        <div className='flex items-center gap-4'>
                            <div className='size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 shadow-inner'>
                                <FileText className='size-6' />
                            </div>
                            <div className='space-y-0.5 min-w-0'>
                                <DialogTitle className='text-lg font-black tracking-tight uppercase truncate'>
                                    {fileName}
                                </DialogTitle>
                                <DialogDescription className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 truncate'>
                                    <ShieldCheck className='size-3 text-indigo-600' />
                                    技术文档预览 · 归档型号: <span className='text-indigo-600 font-mono'>{sku || 'N/A'}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* 预览区 */}
                <div className='flex-1 p-6 bg-muted/5 overflow-hidden min-h-0'>
                    <PDFViewer fileUrl={fileUrl} className='shadow-2xl shadow-indigo-500/5 h-full' />
                </div>

                {/* 页脚 */}
                <div className='px-8 py-4 bg-muted/10 border-t flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/30'>
                    Powered by XDFC Next-Gen Engineering Document Engine
                </div>
            </DialogContent>
        </Dialog>
    )
}
