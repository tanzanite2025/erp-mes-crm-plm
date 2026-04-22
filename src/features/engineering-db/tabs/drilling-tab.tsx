'use client'

import { Target } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { DrillingActionDialog } from '../components/drilling-action-dialog'
import { CADViewerDialog } from '../components/cad-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { DrillingToolbar } from '../components/drilling-toolbar'
import { DrillingTableCard } from '../components/drilling-table-card'
import { DrillingMobileList } from '../components/drilling-mobile-list'
import { useDrillingPageState } from '../hooks/use-drilling-page-state'

export function DrillingTab() {
    const { t } = useLanguage()
    const {
        searchTerm,
        setSearchTerm,
        open,
        setOpen,
        currentRow,
        filteredRows,
        isLoading,
        isSaving,
        highlightId,
        previewFile,
        cadPreviewOpen,
        setCadPreviewOpen,
        pdfPreviewOpen,
        setPdfPreviewOpen,
        excelPreviewOpen,
        setExcelPreviewOpen,
        handleCreate,
        handleEdit,
        handleDelete,
        handlePreview,
        handleSave,
    } = useDrillingPageState()

    return (
        <div className='flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700'>
            <div className='flex flex-col gap-2 bg-muted/5 p-4 md:p-8 rounded-[28px] md:rounded-[32px] border border-dashed border-muted-foreground/10 relative overflow-hidden'>
                <div className='absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent pointer-events-none' />
                <div className='flex items-center gap-2 text-indigo-600'>
                    <Target className='size-4 md:size-5 text-indigo-600' />
                    <h3 className='text-base md:text-lg font-black tracking-tighter italic uppercase'>{t('engineering.drilling.overview.title')}</h3>
                </div>
                <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                    <p className='text-[8px] md:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 max-w-2xl'>
                        {t('engineering.drilling.overview.description')}
                    </p>
                    <div className='flex items-center gap-4 px-4 py-1 rounded-full bg-indigo-500/5 border border-indigo-500/10 w-fit'>
                        <span className='text-[10px] font-black text-indigo-600/60 uppercase tracking-widest'>{t('common.status.ready')}</span>
                        <div className='size-1.5 rounded-full bg-indigo-600 animate-pulse' />
                    </div>
                </div>
            </div>

            <DrillingToolbar searchTerm={searchTerm} onSearchTermChange={setSearchTerm} onCreate={handleCreate} />

            <DrillingTableCard rows={filteredRows} isLoading={isLoading} highlightId={highlightId} onPreview={handlePreview} onEdit={handleEdit} onDelete={handleDelete} />

            <DrillingMobileList rows={filteredRows} isLoading={isLoading} highlightId={highlightId} onPreview={handlePreview} onEdit={handleEdit} onDelete={handleDelete} />

            <DrillingActionDialog
                open={open}
                onOpenChange={setOpen}
                currentRow={currentRow}
                onSave={handleSave}
                isLoading={isSaving}
            />
            <CADViewerDialog open={cadPreviewOpen} onOpenChange={setCadPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <PDFViewerDialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
            <ExcelViewerDialog open={excelPreviewOpen} onOpenChange={setExcelPreviewOpen} fileUrl={previewFile?.url || ''} fileName={previewFile?.name || ''} sku={previewFile?.sku} />
        </div>
    )
}
