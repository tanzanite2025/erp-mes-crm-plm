'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { FileText, Save } from 'lucide-react'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { FileUploader } from '@/components/file-uploader'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type TechnicalSpec } from '../data/schema'
import type { TechnicalSpecificationDocumentSaveParameters } from '../hooks/use-technical-specification-document-write-actions'
import { uploadTechnicalSpecificationDocumentSourceFile } from '../services/technical-specification-document-source-file-upload-service'

interface SpecActionDialogProps {
  currentRow?: TechnicalSpec | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    params: TechnicalSpecificationDocumentSaveParameters
  ) => Promise<void>
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

const technicalSpecificationDocumentInputClassName =
  'h-10 rounded-xl text-[13px] placeholder:text-[13px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case placeholder:opacity-100 md:text-[13px]'

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
  const fieldId = useId()
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const shellClasses = buildActionDialogShellClasses({
    content:
      'engineering-technical-specification-document-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 rounded-2xl sm:max-w-4xl',
    header:
      'shrink-0 border-b border-solid bg-background px-6 py-4 pr-12 text-start',
    title: 'text-base font-semibold normal-case tracking-normal',
    description:
      'text-xs font-normal normal-case tracking-normal leading-5 opacity-100',
    body: 'min-h-0 flex-1 overflow-y-auto p-6',
    footer: 'shrink-0 border-t border-solid bg-background px-6 py-4',
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
  const [isUploadingSourceFile, setIsUploadingSourceFile] = useState(false)
  const [isSubmittingDocument, setIsSubmittingDocument] = useState(false)
  const documentSubmissionLock = useRef(false)
  const isBusy = Boolean(
    isLoading || isUploadingSourceFile || isSubmittingDocument
  )

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

  const handleSave = async () => {
    if (isBusy || documentSubmissionLock.current) return
    if (!formData.name.trim()) {
      toast.error(
        isChineseLocale ? '请填写规范名称' : 'Enter a specification name'
      )
      return
    }

    documentSubmissionLock.current = true
    setIsSubmittingDocument(true)
    try {
      if (isEdit && currentRow) {
        const delta = currentDelta
        if (Object.keys(delta).length === 0) {
          onOpenChange(false)
          return
        }
        await onSave({
          data: formData,
          isPatch: true,
          delta,
          version: currentRow.version,
        })
      } else {
        await onSave({
          data: { ...formData, name: formData.name.trim() },
          isPatch: false,
        })
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '技术规范保存失败，请重试'
            : 'Cannot save specification. Please retry.'
      )
    } finally {
      documentSubmissionLock.current = false
      setIsSubmittingDocument(false)
    }
  }

  return (
    <ActionDialogShell
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isBusy) onOpenChange(nextOpen)
      }}
      title={
        <div className='flex w-full items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <div className='rounded-xl bg-muted p-2'>
              <FileText className='size-5 text-foreground' />
            </div>
            <span className='truncate'>
              {isChineseLocale
                ? isEdit
                  ? '编辑技术规范文档'
                  : '新增技术规范文档'
                : isEdit
                  ? 'Edit technical specification'
                  : 'New technical specification'}
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
      description={
        isChineseLocale
          ? '文档统一保存在工程管理的技术规范主库。新增文档后可以选用于产品，产品关联随产品保存。'
          : 'Documents are saved in the Engineering Management specification master library. After creation, select the document for a product and save the product to persist the link.'
      }
      contentClassName={shellClasses.content}
      headerClassName={shellClasses.header}
      bodyClassName={shellClasses.body}
      footerClassName={shellClasses.footer}
      titleClassName={shellClasses.title}
      descriptionClassName={shellClasses.description}
      footer={
        <>
          <p className='mr-auto text-xs leading-5 text-muted-foreground'>
            {isChineseLocale
              ? '保存位置：工程管理 → 技术规范主库'
              : 'Saved in Engineering Management → Technical Specifications'}
          </p>
          <div className='flex items-center gap-3'>
            <Button
              type='button'
              variant='outline'
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
              className='rounded-full px-6 text-[13px]'
            >
              {isChineseLocale ? '取消' : 'Cancel'}
            </Button>
            <Button
              type='button'
              disabled={isBusy || (isEdit && !isDirty)}
              onClick={handleSave}
              className='gap-2 rounded-full bg-blue-600 px-6 text-[13px] text-white hover:bg-blue-700'
            >
              {isBusy ? (
                <span className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              ) : (
                <Save className='size-4' />
              )}
              {isUploadingSourceFile
                ? isChineseLocale
                  ? '正在上传文档…'
                  : 'Uploading…'
                : isChineseLocale
                  ? '保存到技术规范主库'
                  : 'Save to master library'}
            </Button>
          </div>
        </>
      }
    >
      <fieldset
        disabled={isBusy}
        className='grid min-w-0 gap-5 [&_label]:text-xs [&_label]:font-medium'
      >
        {/* 核心标识组 */}
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor={`${fieldId}-name`}>
              {isChineseLocale ? '规范名称' : 'Specification name'}
            </Label>
            <Input
              id={`${fieldId}-name`}
              maxLength={100}
              placeholder={
                isChineseLocale
                  ? '例如：轮组张力校正标准 SOP'
                  : 'e.g. Wheel tension calibration SOP'
              }
              className={technicalSpecificationDocumentInputClassName}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor={`${fieldId}-code`}>
              {isChineseLocale ? '文档编码' : 'Document code'}
            </Label>
            <Input
              readOnly
              id={`${fieldId}-code`}
              className={`${technicalSpecificationDocumentInputClassName} bg-muted/30`}
              value={formData.code || ''}
              placeholder={
                isChineseLocale
                  ? '保存后由服务器分配'
                  : 'Assigned by the server after saving'
              }
            />
          </div>
        </div>

        {/* 分类与版本 */}
        <div className='grid grid-cols-1 gap-5 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor={`${fieldId}-category`}>
              {isChineseLocale ? '规范分类' : 'Category'}
            </Label>
            <Select
              value={formData.category}
              onValueChange={(val) => updateField('category', val)}
            >
              <SelectTrigger
                id={`${fieldId}-category`}
                className='h-10 w-full rounded-xl text-[13px]'
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='engineering-technical-specification-document-floating-surface'>
                <SelectItem value='SOP'>
                  {isChineseLocale
                    ? '标准作业程序 / SOP'
                    : 'Standard operating procedure / SOP'}
                </SelectItem>
                <SelectItem value='Standard'>
                  {isChineseLocale ? '技术标准' : 'Technical standard'}
                </SelectItem>
                <SelectItem value='Quality'>
                  {isChineseLocale ? '质量规范' : 'Quality specification'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor={`${fieldId}-revision`}>
              {isChineseLocale ? '修订版本' : 'Revision'}
            </Label>
            <Input
              placeholder='V1.0'
              id={`${fieldId}-revision`}
              className={technicalSpecificationDocumentInputClassName}
              value={formData.revisionNo || ''}
              onChange={(e) => updateField('revisionNo', e.target.value)}
            />
          </div>
        </div>

        {/* 附件上传 */}
        <div className='space-y-3'>
          <p className='text-xs font-medium'>
            {isChineseLocale ? '原始文档附件' : 'Source document attachment'}
          </p>
          <FileUploader
            value={formData.fileUrl}
            accept='.pdf,.xlsx,.docx'
            disabled={isBusy}
            uploadFile={async (file) => {
              setIsUploadingSourceFile(true)
              try {
                return await uploadTechnicalSpecificationDocumentSourceFile(
                  file
                )
              } finally {
                setIsUploadingSourceFile(false)
              }
            }}
            onChange={(url, ext) => {
              setFormData((prev) => ({
                ...prev,
                fileUrl: url,
                fileExtension: ext || prev.fileExtension,
              }))
            }}
          />
          <p className='text-xs leading-5 text-muted-foreground'>
            {isChineseLocale
              ? '支持 PDF、Excel（.xlsx）、Word（.docx），附件上传到服务器，其他电脑也可以读取。'
              : 'Supports PDF, Excel (.xlsx), and Word (.docx). Attachments are uploaded to the server for access from other computers.'}
          </p>
        </div>

        {/* 说明文本 */}
        <div className='space-y-2'>
          <Label htmlFor={`${fieldId}-description`}>
            {isChineseLocale
              ? '文档说明 / 修订概要'
              : 'Description / revision summary'}
          </Label>
          <Textarea
            id={`${fieldId}-description`}
            placeholder={
              isChineseLocale
                ? '说明适用工艺、技术要求或本次主要变更…'
                : 'Describe applicable processes, requirements or revision changes…'
            }
            className={`${technicalSpecificationDocumentInputClassName} h-auto min-h-24 resize-y`}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>
      </fieldset>
    </ActionDialogShell>
  )
}
