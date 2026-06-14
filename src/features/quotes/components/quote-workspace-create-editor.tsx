import type { ComponentProps } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentHeaderFields } from '@/features/sales-document/components/document-header-fields'
import { DocumentLinesEditor } from '@/features/sales-document/components/document-lines-editor'
import { DocumentNotesSection } from '@/features/sales-document/components/document-notes-section'

type HeaderFieldsProps = ComponentProps<typeof DocumentHeaderFields>
type LinesEditorProps = ComponentProps<typeof DocumentLinesEditor>

type QuoteCreateResource =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready' }

type QuoteWorkspaceCreateResources = {
  customers: HeaderFieldsProps['customers']
  appearances: LinesEditorProps['appearances']
  products: LinesEditorProps['products']
  productDisplayLabelMap: LinesEditorProps['productDisplayLabelMap']
  productDisplayProjectionMap: LinesEditorProps['productDisplayProjectionMap']
  units: LinesEditorProps['units']
  drillingOptions: LinesEditorProps['drillingOptions']
  labelingOptions: LinesEditorProps['labelingOptions']
}

type QuoteWorkspaceCreateEditorProps = {
  formData: HeaderFieldsProps['formData']
  setFormData: HeaderFieldsProps['setFormData']
  createResources: QuoteWorkspaceCreateResources
  createResource: QuoteCreateResource
  onClassificationChange: HeaderFieldsProps['onClassificationChange']
  onAddLine: LinesEditorProps['onAddLine']
  onRemoveLine: LinesEditorProps['onRemoveLine']
  onLineChange: LinesEditorProps['onLineChange']
  retryCreateResources: () => void
}

export function QuoteWorkspaceCreateEditor({
  formData,
  setFormData,
  createResources,
  createResource,
  onClassificationChange,
  onAddLine,
  onRemoveLine,
  onLineChange,
  retryCreateResources,
}: QuoteWorkspaceCreateEditorProps) {
  if (createResource.status === 'error') {
    return (
      <div className='flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
        <AlertCircle className='size-8 text-rose-500' />
        <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
          报价创建字典加载失败
        </p>
        <p className='mt-3 max-w-xl text-[11px] leading-5 font-bold text-rose-700/80'>
          {createResource.error.message || '请重试后再创建报价。'}
        </p>
        <Button
          type='button'
          variant='outline'
          className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
          onClick={() => {
            void retryCreateResources()
          }}
        >
          重试
        </Button>
      </div>
    )
  }

  if (createResource.status === 'loading') {
    return (
      <div className='flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
        <Loader2 className='size-8 animate-spin text-primary/40' />
        <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          报价创建字典加载中
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      <DocumentHeaderFields
        formData={formData}
        setFormData={setFormData}
        customers={createResources.customers}
        onClassificationChange={onClassificationChange}
        compactEvidence
        denseContractFields
      />
      <DocumentLinesEditor
        appearances={createResources.appearances}
        lines={formData.lines || []}
        products={createResources.products}
        productDisplayLabelMap={createResources.productDisplayLabelMap}
        productDisplayProjectionMap={
          createResources.productDisplayProjectionMap
        }
        units={createResources.units}
        drillingOptions={createResources.drillingOptions}
        labelingOptions={createResources.labelingOptions}
        currency={formData.currency}
        onAddLine={onAddLine}
        onRemoveLine={onRemoveLine}
        onLineChange={onLineChange}
      />
      <DocumentNotesSection
        value={formData.requirements || ''}
        compact
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, requirements: value }))
        }
      />
    </div>
  )
}
