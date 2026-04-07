'use client'

import { useMemo } from 'react'
import { FileText, Hash, Tag, Info, Save, FileType } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { FileUploader } from '@/components/file-uploader'
import { Textarea } from '@/components/ui/textarea'
import { TechnicalSpec } from '../data/schema'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'
import { toast } from 'sonner'

interface SpecActionDialogProps {
  currentRow?: TechnicalSpec | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (params: { 
    data: TechnicalSpec; 
    isPatch: boolean; 
    delta?: any; 
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
    title: 'text-xl font-black uppercase italic tracking-tighter flex items-center gap-2',
    description: 'text-[10px] font-black uppercase tracking-widest opacity-60',
    body: 'p-8 pt-4 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar',
    footer: 'p-8 pt-4 flex items-center justify-between w-full border-t border-dashed border-muted/20 bg-muted/5',
  })

  const isEdit = !!currentRow
  const initialFormData = useMemo(() => {
    if (currentRow) return currentRow
    return { 
      ...DEFAULT_SPEC, 
      id: `SPEC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString() 
    } as TechnicalSpec
  }, [currentRow, open])

  const { data: formData, tracker, isDirty } = useDeltaTracker(initialFormData, open)

  const handleSave = () => {
    if (!formData.name) {
      toast.error('请填写规范名称')
      return
    }

    if (isEdit && currentRow) {
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        onOpenChange(false)
        return
      }
      onSave({ 
        data: formData, 
        isPatch: true, 
        delta, 
        version: currentRow.version 
      })
    } else {
      onSave({ data: formData, isPatch: false })
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={(
        <>
          <div className='p-2 bg-indigo-500/10 rounded-xl'>
            <FileText className='size-5 text-indigo-500' />
          </div>
          {isEdit ? '编辑技术规范' : '发布技术基准'}
        </>
      )}
      description="DOCUMENT_MASTER_SPEC / 定义工艺标准、质量规范或 SOP 指引，确保生产流程合规性。"
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
            Sync_to_Knowledge_Base
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
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Tag className='size-3' /> 规范名称 / SPEC_NAME
            </Label>
            <Input
              placeholder='例如: 轮组张力校正标准 SOP'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl focus-visible:ring-indigo-500/20 px-5 shadow-inner'
              value={formData.name}
              onChange={(e) => { formData.name = e.target.value }}
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
              <Hash className='size-3' /> 文档编码 / DOC_ID
            </Label>
            <Input
              readOnly
              className='h-12 font-mono font-bold text-xs bg-muted/20 border-none rounded-2xl px-5 opacity-60 cursor-not-allowed'
              value={formData.id}
            />
          </div>
        </div>

        {/* 分类与版本 */}
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>规范分类 / CATEGORY</Label>
            <SelectDropdown
              defaultValue={formData.category}
              onValueChange={(val) => { formData.category = val }}
              items={[
                { label: '标准作业程序 / SOP', value: 'SOP' },
                { label: '技术标准 / STANDARD', value: 'Standard' },
                { label: '质量规范 / QUALITY', value: 'Quality' },
              ]}
              className='h-12 rounded-2xl border-none bg-muted/40 px-5 font-bold text-sm shadow-inner'
            />
          </div>
          <div className='space-y-2'>
            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>修订版本 / REVISION</Label>
            <Input
              placeholder='V1.0'
              className='h-12 font-black text-sm bg-muted/40 border-none rounded-2xl px-5 shadow-inner uppercase'
              value={formData.revisionNo || ''}
              onChange={(e) => { formData.revisionNo = e.target.value }}
            />
          </div>
        </div>

        {/* 附件上传 */}
        <div className='bg-indigo-500/5 p-6 rounded-[32px] border border-dashed border-indigo-500/20 space-y-3'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-indigo-600/60 flex items-center gap-2'>
            <FileType className='size-3' /> 文件原始档 / SOURCE_FILE
          </Label>
          <FileUploader 
            value={formData.fileUrl} 
            accept='.pdf,.xlsx,.docx,.csv'
            onChange={(url, ext) => {
              formData.fileUrl = url
              if (ext) formData.fileExtension = ext
            }}
          />
        </div>

        {/* 说明文本 */}
        <div className='space-y-2'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2'>
            <Info className='size-3' /> 修订概要 / REVISION_SUMMARY
          </Label>
          <Textarea 
            placeholder='记录本次发布的主要变更点...'
            className='min-h-[120px] resize-none rounded-[24px] border-none bg-muted/40 p-5 font-bold text-sm shadow-inner'
            value={formData.description}
            onChange={(e) => { formData.description = e.target.value }}
          />
        </div>
      </div>
    </ActionDialogShell>
  )
}
