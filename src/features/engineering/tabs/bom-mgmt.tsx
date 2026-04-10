'use client'

import { useState } from 'react'
import { Layers } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { BOMActionDialog } from '../components/bom-action-dialog'
import { BOMPreview } from '../components/bom-mgmt/bom-preview'
import { BOMTable } from '../components/bom-mgmt/bom-table'
import { BOMToolbar } from '../components/bom-mgmt/bom-toolbar'
import { useBOMData } from '../hooks/use-bom-data'
import { type BOM, type BOMItem } from '../data/schema'

export function BOMMgmt() {
  const { t } = useLanguage()
  const {
    data,
    products,
    materials,
    isLoading,
    saveBOM,
    deleteBOM,
    downloadTemplate,
    parseExcel,
  } = useBOMData()

  const [open, setOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<BOM | undefined>(undefined)
  const [previewBOM, setPreviewBOM] = useState<BOM | null>(null)
  const [initialItems, setInitialItems] = useState<Array<Partial<BOMItem>> | undefined>(undefined)
  const [initialProductId, setInitialProductId] = useState<string | undefined>(undefined)

  const handleUploadExcel = async (file: File) => {
    const result = await parseExcel(file)
    if (!result) return

    setInitialItems(result.items)
    setInitialProductId(result.productId)
    setCurrentRow(undefined)
    setOpen(true)
  }

  const handleFormSubmit = async (formData: BOM) => {
    const success = await saveBOM(formData)
    if (success) setOpen(false)
  }

  if (previewBOM) {
    return (
      <BOMPreview
        bom={previewBOM}
        products={products}
        materials={materials}
        onBack={() => setPreviewBOM(null)}
      />
    )
  }

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

      <BOMToolbar
        onDownloadTemplate={downloadTemplate}
        onUploadExcel={handleUploadExcel}
        onAddBOM={() => {
          setInitialItems(undefined)
          setCurrentRow(undefined)
          setOpen(true)
        }}
      />

      <BOMTable
        data={data}
        products={products}
        isLoading={isLoading}
        onPreview={setPreviewBOM}
        onEdit={(bom) => {
          setCurrentRow(bom)
          setOpen(true)
        }}
        onDelete={deleteBOM}
      />

      <BOMActionDialog
        open={open}
        onOpenChange={setOpen}
        currentRow={currentRow}
        initialItems={initialItems}
        initialProductId={initialProductId}
        onSubmit={handleFormSubmit}
      />
    </div>
  )
}
