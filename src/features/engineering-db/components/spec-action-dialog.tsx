'use client'

import { useMemo, useState } from 'react'
import { FileText, Hash, Tag, Info, Save, FileType } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { FileUploader } from '@/components/file-uploader'
import { SelectDropdown } from '@/components/select-dropdown'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type TechnicalSpec } from '../data/schema'

interface SpecActionDialogProps {
  currentRow?: TechnicalSpec | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: {
    data: TechnicalSpec
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => void
  isLoading?: boolean
}

const DEFAULT_SPEC: Partial<TechnicalSpec> = {
  name: '',
  category: 'SOP',
  revisionNo: 'V1.0',
  fileUrl: '',
  fileExtension: 'pdf',
  description: '',
  version: 1,
}

function buildSpecDelta(before: TechnicalSpec, after: TechnicalSpec): DeltaSet {
  const delta: DeltaSet = {}
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)])
  ) as Array<keyof TechnicalSpec>

  keys.forEach((key) => {
    const previous = before[key]
    const next = after[key]
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      return
    }
    delta[String(key)] = {
      o: previous,
      n: next,
    }
  })

  return delta
}

export function SpecActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: SpecActionDialogProps) {
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

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return {
      ...DEFAULT_SPEC,
      id: '',
      createdAt: '',
    } as TechnicalSpec
  }, [currentRow])

  const [formData, setFormData] = useState<TechnicalSpec>(initialFormData)

  const currentDelta = useMemo(() => {
    if (!isEdit || !currentRow) {
      return {}
    }
    return buildSpecDelta(currentRow, formData)
  }, [currentRow, formData, isEdit])

  const isDirty = Object.keys(currentDelta).length > 0

  const updateField = <K extends keyof TechnicalSpec>(
    key: K,
    value: TechnicalSpec[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = () => {
    if (!formData.name) {
      toast.error('请填写规范名称')
      return
    }

    if (isEdit && currentRow) {
      const delta = currentDelta
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({
        data: formData,
        isPatch: true,
        delta,
        version: currentRow.version,
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={
        <div className='flex w-full items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <div className='rounded-xl bg-indigo-500/10 p-2'>
              <FileText className='size-5 text-indigo-500' />
            </div>
            <span className='truncate'>
              {isEdit ? '编辑技术规范' : '发布技术基准'}
            </span>
          </div>
          {isEdit && currentRow?.id ? (
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.engineeringSpec}
              targetId={currentRow.id}
              targetName={currentRow.name}
              className='h-10 shrink-0 rounded-full border-white/30 bg-background/80 px-4'
            />
          ) : null}
        </div>
      }
      description='DOCUMENT_MASTER_SPEC / 定义工艺标准、质量规范或 SOP 指引，确保生产流程合规性。'
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
            Sync_to_Knowledge_Base
          </p>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[10px] font-black tracking-widest uppercase'
            >
              取消 / CANCEL
            </Button>
            <Button
              disabled={isLoading || (isEdit && !isDirty)}
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
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Tag className='size-3' /> 规范名称 / SPEC_NAME
            </Label>
            <Input
              placeholder='例如: 轮组张力校正标准 SOP'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black shadow-inner focus-visible:ring-indigo-500/20'
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              <Hash className='size-3' /> 文档编码 / DOC_ID
            </Label>
            <Input
              readOnly
              className='h-12 cursor-not-allowed rounded-2xl border-none bg-muted/20 px-5 font-mono text-xs font-bold opacity-60'
              value={formData.id}
            />
          </div>
        </div>

        {/* 分类与版本 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              规范分类 / CATEGORY
            </Label>
            <SelectDropdown
              defaultValue={formData.category}
              onValueChange={(val) => updateField('category', val)}
              items={[
                { label: '标准作业程序 / SOP', value: 'SOP' },
                { label: '技术标准 / STANDARD', value: 'Standard' },
                { label: '质量规范 / QUALITY', value: 'Quality' },
              ]}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-bold shadow-inner'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
              修订版本 / REVISION
            </Label>
            <Input
              placeholder='V1.0'
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 text-sm font-black uppercase shadow-inner'
              value={formData.revisionNo || ''}
              onChange={(e) => updateField('revisionNo', e.target.value)}
            />
          </div>
        </div>

        {/* 附件上传 */}
        <div className='space-y-3 rounded-[32px] border border-dashed border-indigo-500/20 bg-indigo-500/5 p-6'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-indigo-600/60 uppercase'>
            <FileType className='size-3' /> 文件原始档 / SOURCE_FILE
          </Label>
          <FileUploader
            value={formData.fileUrl}
            accept='.pdf,.xlsx,.docx,.csv'
            onChange={(url, ext) => {
              setFormData((prev) => ({
                ...prev,
                fileUrl: url,
                fileExtension: ext || prev.fileExtension,
              }))
            }}
          />
        </div>

        {/* 说明文本 */}
        <div className='space-y-2'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
            <Info className='size-3' /> 修订概要 / REVISION_SUMMARY
          </Label>
          <Textarea
            placeholder='记录本次发布的主要变更点...'
            className='min-h-[120px] resize-none rounded-[24px] border-none bg-muted/40 p-5 text-sm font-bold shadow-inner'
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
