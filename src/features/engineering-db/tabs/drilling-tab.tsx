'use client'

import { Target } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CADViewerDialog } from '../components/cad-viewer'
import { DrillingActionDialog } from '../components/drilling-action-dialog'
import { DrillingMobileList } from '../components/drilling-mobile-list'
import { DrillingTableCard } from '../components/drilling-table-card'
import { DrillingToolbar } from '../components/drilling-toolbar'
import { ExcelViewerDialog } from '../components/excel-viewer'
import { PDFViewerDialog } from '../components/pdf-viewer'
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
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <IndustrialHeader
        icon={Target}
        title={t('engineering.drilling.overview.title')}
        description={t('engineering.drilling.overview.description')}
        gradient
        innerClassName='text-indigo-600'
        statusBadge={
          <div className='flex w-fit items-center gap-4 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-4 py-1'>
            <span className='text-[10px] font-black tracking-widest text-indigo-600/60 uppercase'>
              {t('common.status.ready')}
            </span>
            <div className='size-1.5 animate-pulse rounded-full bg-indigo-600' />
          </div>
        }
        className='border-muted-foreground/10'
      />

      <DrillingToolbar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onCreate={handleCreate}
      />

      <DrillingTableCard
        rows={filteredRows}
        isLoading={isLoading}
        highlightId={highlightId}
        onPreview={handlePreview}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DrillingMobileList
        rows={filteredRows}
        isLoading={isLoading}
        highlightId={highlightId}
        onPreview={handlePreview}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <DrillingActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        onSave={handleSave}
        isLoading={isSaving}
      />
      <CADViewerDialog
        open={cadPreviewOpen}
        onOpenChange={setCadPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
      <PDFViewerDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
      <ExcelViewerDialog
        open={excelPreviewOpen}
        onOpenChange={setExcelPreviewOpen}
        fileUrl={previewFile?.url || ''}
        fileName={previewFile?.name || ''}
        sku={previewFile?.sku}
      />
    </div>
  )
}
