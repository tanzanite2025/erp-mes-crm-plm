'use client'

import { useState } from 'react'
import { AlertTriangle, Layers } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { BOMActionDialog } from '../components/bom-action-dialog'
import { BOMPreview } from '../components/bom-mgmt/bom-preview'
import { BOMTable } from '../components/bom-mgmt/bom-table'
import { BOMToolbar } from '../components/bom-mgmt/bom-toolbar'
import { useBOMData } from '../hooks/use-bom-data'
import { type BOM } from '../data/schema'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'

export function BOMMgmt() {
  const { t } = useLanguage()
  const {
    readResource,
    saveBOM,
    deleteBOM,
    promoteBOM,
    deriveMBOM,
    reviseMBOM,
    downloadTemplate,
    parseExcel,
  } = useBOMData()

  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<BOM | undefined>(undefined)
  const [previewBOM, setPreviewBOM] = useState<BOM | null>(null)
  const [initialItems, setInitialItems] = useState<BOMItemDraft[] | undefined>(undefined)
  const [initialProductId, setInitialProductId] = useState<string | undefined>(undefined)

  const resetDialogState = () => {
    setCurrentRow(undefined)
    setInitialItems(undefined)
    setInitialProductId(undefined)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setOpen(true)
      return
    }

    setOpen(false)
    resetDialogState()
  }

  const openCreateDialog = () => {
    resetDialogState()
    setOpen(true)
  }

  const openEditDialog = (bom: BOM) => {
    setInitialItems(undefined)
    setInitialProductId(undefined)
    setCurrentRow(bom)
    setOpen(true)
  }

  const handleUploadExcel = async (file: File) => {
    const result = await parseExcel(file)
    if (!result) return

    setInitialItems(result.items)
    setInitialProductId(result.productId)
    setCurrentRow(undefined)
    setOpen(true)
  }

  const handleFormSubmit = async (formData: SaveBOMInput) => {
    const saved = await saveBOM({ data: formData })
    if (saved) handleDialogOpenChange(false)
    // Return null since we don't have the BOM object
    return null
  }

  const closePreview = () => {
    setPreviewBOM(null)
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='flex flex-col gap-1 bg-muted/5 p-4 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
          <div className='flex items-center gap-2 text-primary'>
            <Layers className='size-4 text-primary' />
            <h3 className='text-lg font-black tracking-tighter italic uppercase'>
              {t('engineering.bomArchive.header.title')}
            </h3>
          </div>
          <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
            {t('engineering.bomArchive.header.description')}
          </p>
        </div>

        <div className='flex flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-12 text-center'>
          <AlertTriangle className='mb-4 size-10 text-rose-500' />
          <p className='text-sm font-black tracking-widest text-foreground'>
            {t('engineering.bomArchive.toasts.loadFailed')}
          </p>
          <p className='mt-2 text-[11px] font-medium text-muted-foreground'>
            {readResource.error.message || t('engineering.bomArchive.toasts.loadFailed')}
          </p>
        </div>
      </div>
    )
  }

  const bomTableData = readResource.status === 'ready' ? readResource.data : []
  const bomProducts = readResource.status === 'ready' ? readResource.products : []
  const bomProductDisplayLabelMap = readResource.status === 'ready' ? readResource.productDisplayLabelMap : new Map<string, string>()
  const bomMaterials = readResource.status === 'ready' ? readResource.materials : []
  const bomSections = readResource.status === 'ready' ? readResource.sections : []
  const isLoading = readResource.status === 'loading'
  const viewMode = previewBOM && readResource.status === 'ready' ? 'preview' : 'list'

  const handleDerive = async (bom: BOM) => {
    if (window.confirm(t('engineering.bomArchive.table.confirmDerive'))) {
      await deriveMBOM(bom.id, {
        description: `Derived from ${bom.bomNo}`,
        revisionNo: 'R1'
      })
    }
  }

  const handleRevise = async (bom: BOM) => {
    const reason = window.prompt(
      `请填写修订原因（将记入审计与通知）\n\n当前 MBOM：${bom.bomNo} ${bom.bomVersion}`,
      ''
    )
    if (!reason || !reason.trim()) {
      return
    }
    await reviseMBOM(bom.id, { reason: reason.trim() })
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-4 sm:p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-center gap-2 text-primary'>
            <Layers className='size-4 text-primary' />
            <h3 className='text-lg font-black tracking-tighter italic uppercase'>
              {t('engineering.bomArchive.header.title')}
            </h3>
          </div>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.bom}
            targetName={t('engineering.bomArchive.header.title')}
            className='h-11 rounded-full border-dashed bg-background/80 px-4 text-[10px] font-black uppercase tracking-widest'
          />
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('engineering.bomArchive.header.description')}
        </p>
      </div>

      {viewMode === 'list' ? (
        <BOMToolbar
          onDownloadTemplate={downloadTemplate}
          onUploadExcel={handleUploadExcel}
          onAddBOM={openCreateDialog}
        />
      ) : null}

      {viewMode === 'preview' && previewBOM ? (
        <div className='rounded-[32px] border border-dashed border-muted/50 bg-background/80 overflow-hidden'>
          <BOMPreview
            bom={previewBOM}
            products={bomProducts}
            productDisplayLabelMap={bomProductDisplayLabelMap}
            materials={bomMaterials}
            sections={bomSections}
            onBack={closePreview}
          />
        </div>
      ) : (
        <BOMTable
          data={bomTableData}
          products={bomProducts}
          sections={bomSections}
          isLoading={isLoading}
          onPreview={setPreviewBOM}
          onEdit={openEditDialog}
          onDerive={handleDerive}
          onRevise={handleRevise}
          onDelete={deleteBOM}
        />
      )}

      <BOMActionDialog
        open={open}
        onOpenChange={handleDialogOpenChange}
        currentRow={currentRow}
        initialItems={initialItems}
        initialProductId={initialProductId}
        onSubmit={handleFormSubmit}
        onPromote={(id, status, expectedVersion) => promoteBOM(id, status, expectedVersion ?? 0)}
      />
    </div>
  )
}
