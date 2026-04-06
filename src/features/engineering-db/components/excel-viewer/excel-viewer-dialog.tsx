'use client'

import { Suspense, lazy } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { FileSpreadsheet, TableProperties } from 'lucide-react'

const ExcelViewer = lazy(() => import('./excel-viewer').then((module) => ({ default: module.ExcelViewer })))

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
    sku
}: ExcelViewerDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-[95vw] w-[95vw] p-0 h-[85vh] bg-card border-none overflow-hidden flex flex-col'>
                {/* 装饰性页头 */}
                <DialogHeader className='p-6 border-b bg-emerald-500/5'>
                    <div className='flex items-center justify-between pr-8'>
                        <div className='flex items-center gap-4'>
                            <div className='size-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-inner'>
                                <FileSpreadsheet className='size-6' />
                            </div>
                            <div className='space-y-0.5 min-w-0'>
                                <DialogTitle className='text-lg font-black tracking-tight uppercase truncate'>
                                    {fileName}
                                </DialogTitle>
                                <DialogDescription className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 truncate'>
                                    <TableProperties className='size-3 text-emerald-600' />
                                    结构化报表工具 · 归档型号: <span className='text-emerald-600 font-mono'>{sku || 'N/A'}</span>
                                </DialogDescription>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                {/* 预览区 */}
                <div className='flex-1 p-6 bg-muted/5 overflow-hidden min-h-0'>
                    <Suspense
                        fallback={
                            <div className='flex h-full items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                Loading spreadsheet preview...
                            </div>
                        }
                    >
                        {open ? <ExcelViewer fileUrl={fileUrl} className='shadow-2xl shadow-emerald-500/5 h-full' /> : null}
                    </Suspense>
                </div>

                {/* 页脚 */}
                <div className='px-8 py-4 bg-muted/10 border-t flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/30'>
                    Powered by XDFC Next-Gen Spreadsheet Analysis Module
                </div>
            </DialogContent>
        </Dialog>
    )
}
