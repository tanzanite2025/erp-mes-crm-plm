'use client'

import { CircleDot, Save } from 'lucide-react'
import type { DeltaSet } from '@/lib/delta/types'
import { Button } from '@/components/ui/button'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type DrillingPlan, type DrillingPlanInput } from '../data/schema'
import { useDrillingActionDialogState } from '../hooks/use-drilling-action-dialog-state'
import { DrillingAttachmentSection } from './drilling-attachment-section'
import { DrillingBasicInfoSection } from './drilling-basic-info-section'
import { DrillingMetaSection } from './drilling-meta-section'
import { DrillingSpecSection } from './drilling-spec-section'

interface DrillingActionDialogProps {
  currentRow?: DrillingPlan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: DrillingPlanInput
    isPatch: boolean
    delta?: DeltaSet
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
    title:
      'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer:
      'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const {
    productOptions,
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

    if (
      params.isPatch &&
      params.delta &&
      Object.keys(params.delta).length === 0
    ) {
      onOpenChange(false)
      return
    }

    await onSave(params)
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <div className='rounded-xl bg-indigo-500/10 p-2'>
            <CircleDot className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑钻孔方案' : '建立钻孔基准'}
        </>
      }
      description='COMPONENT_MASTER_DRILLING / 定义轮圈钻孔方案、编织模式与标准孔数基准。'
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
            <span className='inline-block size-1.5 animate-pulse rounded-full bg-indigo-500' />
            Sync_to_Manufacturing_Module
          </p>
          <div className='flex items-center gap-3'>
            {isEdit && currentRow?.id ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.drilling}
                targetId={currentRow.id}
                targetName={currentRow.name}
                label='审计'
                className='h-11 rounded-full px-5'
              />
            ) : null}
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              取消 / CANCEL
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty())}
              onClick={handleSave}
              className='h-11 gap-2 rounded-full bg-indigo-600 px-10 text-[10px] font-black tracking-widest text-white uppercase shadow-xl shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-95'
            >
              {isLoading ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              同步存档 / SYNC_ARCHIVE
            </Button>
          </div>
        </>
      }
    >
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent' />

      <div className='relative grid gap-8'>
        {/* 核心标识组 */}
        <DrillingBasicInfoSection
          formData={formData}
          productOptions={productOptions}
          updateField={updateField}
        />

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
