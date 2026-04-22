'use client'

import { CircleDot, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DeltaSet } from '@/lib/delta/types'
import { type DrillingPlan, type DrillingPlanInput } from '../data/schema'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDrillingActionDialogState } from '../hooks/use-drilling-action-dialog-state'
import { DrillingBasicInfoSection } from './drilling-basic-info-section'
import { DrillingSpecSection } from './drilling-spec-section'
import { DrillingAttachmentSection } from './drilling-attachment-section'
import { DrillingMetaSection } from './drilling-meta-section'

interface DrillingActionDialogProps {
  currentRow?: DrillingPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: DrillingPlanInput; 
    isPatch: boolean; 
    delta?: DeltaSet; 
    version?: number 
  }) => Promise<void>
  isLoading?: boolean
}

export function DrillingActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: DrillingActionDialogProps) {
  const shellClasses = buildActionDialogShellClasses({
    content: 'sm:max-w-[700px] rounded-[32px] overflow-hidden',
    header: 'p-8 pb-4 border-none bg-muted/5',
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const {
    products,
    formData,
    isEdit,
    isDirty,
    updateField,
    handleWeavingModeChange,
    buildSaveParams,
    weavingModeItems,
    isWeavingModesLoading,
    isWeavingModesError,
    noWeavingModesAvailable,
  } = useDrillingActionDialogState(currentRow, open)

  const handleSave = async () => {
    const params = await buildSaveParams()
    if (!params) {
      return
    }

    if (params.isPatch && params.delta && Object.keys(params.delta).length === 0) {
      onOpenChange(false)
      return
    }

    await onSave(params)
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <div className='p-2 bg-indigo-500/10 rounded-xl'>
            <CircleDot className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑钻孔方案' : '建立钻孔基准'}
        </>
      )}
      description="COMPONENT_MASTER_DRILLING / 定义轮圈钻孔方案、编织模式与标准孔数基准。"
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={(
        <>
          <p className='text-[10px] text-muted-foreground flex items-center gap-2 font-black uppercase tracking-widest opacity-50'>
            <span className='inline-block size-1.5 rounded-full bg-indigo-500 animate-pulse' />
            Sync_to_Manufacturing_Module
          </p>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)} 
              className="font-black text-[10px] uppercase tracking-widest rounded-full px-6"
            >
              取消 / CANCEL
            </Button>
            <Button 
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest px-10 h-11 rounded-full shadow-xl shadow-indigo-600/20 active:scale-95 transition-all gap-2"
            >
              {isLoading ? <span className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" /> : <Save className="size-4" />}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      )}
    >
      <div className='absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent pointer-events-none' />

      <div className='grid gap-8 relative'>
        {/* 核心标识组 */}
        <DrillingBasicInfoSection formData={formData} products={products} updateField={updateField} />

        {/* 技术规格组 */}
        <DrillingSpecSection
          formData={formData}
          weavingModeItems={weavingModeItems}
          isWeavingModesLoading={isWeavingModesLoading}
          isWeavingModesError={isWeavingModesError}
          noWeavingModesAvailable={noWeavingModesAvailable}
          onWeavingModeChange={handleWeavingModeChange}
          updateField={updateField}
        />

        {/* 附件上传 */}
        <DrillingAttachmentSection
          fileUrl={formData.fileUrl ?? ''}
          onChange={(url, ext) => {
            updateField('fileUrl', url)
            if (ext) {
              updateField('fileExtension', ext)
            }
          }}
        />

        <DrillingMetaSection id={formData.id} createdAt={formData.createdAt} />
      </div>
    </ActionDialogShell>
  )
}
