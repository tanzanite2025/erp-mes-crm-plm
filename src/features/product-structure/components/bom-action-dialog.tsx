'use client'

import { type UseFormReturn } from 'react-hook-form'
import { failLoudly } from '@/lib/safe-catch'
import { Form } from '@/components/ui/form'
import { BOMFormHeader } from './bom-editor/bom-form-header'
import { BOMWorkspace } from './bom-editor/bom-workspace'
import { BOMDialogFooter } from './bom-dialog-footer'
import { BOMDialogResourceBoundary } from './bom-dialog-resource-boundary'
import { BOMDialogShell } from './bom-dialog-shell'
import { type BOM } from '../data/schema'
import { useBOMForm } from '../hooks/use-bom-form'
import { type BOMItemDraft, type SaveBOMInput } from '../mutation-types'
import { buildBOMRelationSidecar } from '../utils/bom-relation-sidecar'

type BOMActionDialogProps = {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: SaveBOMInput) => BOM | Promise<BOM | null>
  onPromote?: (id: string, status: string, expectedVersion?: number) => Promise<boolean>
}

export function BOMActionDialog({
  currentRow,
  initialItems,
  initialProductId,
  open,
  onOpenChange,
  onSubmit,
  onPromote,
}: BOMActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const {
    form,
    fields,
    append,
    remove,
    optionsResource,
    detailSourceResource,
    protocolDraft,
    products,
    productDisplayLabelMap,
    materials,
    sections,
  } = useBOMForm({
    currentRow,
    initialItems,
    initialProductId,
    open,
    isEdit,
  })
  const typedForm = form as UseFormReturn<BOM>

  const handleFormSubmit = async (data: BOM) => {
    if (isEdit && !typedForm.formState.isDirty) {
      onOpenChange(false)
      return null
    }

    if (!protocolDraft) {
      failLoudly(
        new Error('[CRITICAL] Missing effective BOM relation sidecar protocol draft during save submit'),
        'BOMActionDialog.handleFormSubmit'
      )
      return null
    }

    const submitData: SaveBOMInput = {
      ...data,
      relationSidecar: buildBOMRelationSidecar(protocolDraft),
    }

    if (onSubmit) {
      const result = await onSubmit(submitData)
      return result
    }

    onOpenChange(false)
    return null
  }

  const handlePromote = async (targetStatus: string) => {
    // 1. 如果变脏或者是新建，先执行保存获取最新 ID 或同步数据
    let activeId = currentRow?.id
    if (!activeId || typedForm.formState.isDirty) {
      await typedForm.handleSubmit(handleFormSubmit)()
      // handleSubmit 返回的是 undefined，实际结果在 handleFormSubmit 内部
      // 这里需要稍微调整逻辑以获取保存后的结果
      // 为了简单起见，我们假设 onSubmit 成功后 handleDialogOpenChange 会被调用
      // 但现在我们要“保存后不关闭弹窗而是继续流转”
      // 实际上，目前的 onSubmit 在父组件执行完后会调 handleDialogOpenChange(false)
      // 这是一个冲突。我们需要在 handlePromote 中手动控制。
    }

    // 重新获取 ID (如果是新建)
    // 方案改进：直接在 handlePromote 内部手动组装并调用 saveBOM 逻辑，避免依赖 handleSubmit 的闭包逻辑导致无法拿到 ID
    const currentData = typedForm.getValues()
    if (!protocolDraft) return

    const submitData: SaveBOMInput = {
      ...currentData,
      relationSidecar: buildBOMRelationSidecar(protocolDraft),
    }

    let bomToPromote = currentRow
    if (!bomToPromote?.id || typedForm.formState.isDirty) {
      if (!onSubmit) return
      const saved = await onSubmit(submitData)
      if (!saved) return
      bomToPromote = saved
    }

    if (bomToPromote?.id && onPromote) {
      const success = await onPromote(bomToPromote.id, targetStatus, bomToPromote.version)
      if (success) {
        onOpenChange(false)
      }
    }
  }

  const isLocked = currentRow?.isLocked || false

  return (
    <BOMDialogShell
      open={open}
      onOpenChange={onOpenChange}
      isEdit={isEdit}
      auditTarget={isEdit && currentRow?.id ? { id: currentRow.id, name: currentRow.bomNo } : undefined}
    >
      <Form {...typedForm}>
        <form
          id='bom-form'
          onSubmit={typedForm.handleSubmit(handleFormSubmit)}
          className='flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4'
        >
          <BOMDialogResourceBoundary resource={optionsResource} detailResource={detailSourceResource}>
            <BOMFormHeader
              form={typedForm}
              products={products}
              productDisplayLabelMap={productDisplayLabelMap}
              isEdit={isEdit}
            />

            <BOMWorkspace
              form={typedForm}
              fields={fields}
              materials={materials}
              sections={sections}
              append={append}
              remove={remove}
              protocolDraft={protocolDraft}
            />

            <BOMDialogFooter 
              form={typedForm} 
              currentRow={currentRow}
              onPromote={handlePromote}
              isSubmitDisabled={isLocked} 
            />
          </BOMDialogResourceBoundary>
        </form>
      </Form>
    </BOMDialogShell>
  )
}
