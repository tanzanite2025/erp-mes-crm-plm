import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { failLoudly } from '@/lib/safe-catch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionTopologyTemplate } from '../../data/production-line'
import {
  useProductionLineBOMBranchesQuery,
  useProductionLinesQuery,
} from '../../hooks/use-production-resources'
import { useTopologyTemplates } from '../../topology/use-topology-templates'
import { TemplateCard } from './components/template-card'
import {
  TemplateDialog,
  type ProductionTopologyTemplateDialogSaveRequest,
} from './components/template-dialog'

export function TopologyTemplateMgmt() {
  const { allowsPermission, isChecking } = usePermissionActions()
  const canManage = allowsPermission('perm_manage')
  const {
    templates,
    isLoaded,
    error,
    isSaving,
    captureFromLine,
    updateTemplate,
    removeTemplate,
    applyToNewLine,
    refresh,
  } = useTopologyTemplates()
  const lineQuery = useProductionLinesQuery()
  const branchQuery = useProductionLineBOMBranchesQuery()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{
    mode: 'capture' | 'edit' | 'apply'
    template?: ProductionTopologyTemplate
  } | null>(null)
  const [operationError, setOperationError] = useState('')

  const saveTopologyTemplateDialog = async (
    request: ProductionTopologyTemplateDialogSaveRequest
  ) => {
    if (!canManage) throw new Error('无拓扑模板维护权限')
    switch (request.mode) {
      case 'capture':
        await captureFromLine({
          sourceLineId: request.sourceLineId,
          sourceLineVersion: request.sourceLineVersion,
          name: request.name,
          description: request.description,
        })
        toast.success('已保存为独立拓扑模板')
        return
      case 'edit':
        await updateTemplate(request.template)
        toast.success('拓扑模板已保存')
        return
      case 'apply':
        await applyToNewLine({
          template: request.template,
          code: request.code,
        })
        toast.success(`已创建新 L1：${request.code}`)
        return
    }
  }
  const deleteIndependentTopologyTemplate = async (
    template: ProductionTopologyTemplate
  ) => {
    if (!canManage || isSaving) return
    if (
      !(await requestApplicationConfirmation(
        `确认删除模板“${template.name}”？已建立的实际生产结构不会受影响。`
      ))
    )
      return
    setOperationError('')
    try {
      await removeTemplate(template)
      toast.success('拓扑模板已删除')
    } catch (deleteError) {
      failLoudly(deleteError, 'TopologyTemplateMgmt.delete', { silentUI: true })
      setOperationError(
        deleteError instanceof Error ? deleteError.message : '删除失败，请重试'
      )
    }
  }
  if (isChecking || !isLoaded)
    return <p className='p-4 text-muted-foreground'>正在读取拓扑模板…</p>
  if (error && 'status' in error && error.status === 403)
    return <ForbiddenState />
  return (
    <div className='space-y-4'>
      <div className='rounded-xl border border-dashed p-4'>
        <h3 className='font-semibold'>生产拓扑模板</h3>
        <p className='mt-1 text-sm text-muted-foreground'>
          从已建立的 L1 保存独立副本，用于创建新的
          L1。修改或删除模板不会同步到实际生产结构。
        </p>
      </div>
      <div className='flex flex-wrap gap-3'>
        <Input
          aria-label='搜索拓扑模板'
          placeholder='搜索模板名称或说明'
          className='max-w-sm'
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canManage && (
          <Button
            disabled={isSaving || Boolean(error)}
            onClick={() => setDialog({ mode: 'capture' })}
          >
            <Plus /> 从实际 L1 生成模板
          </Button>
        )}
      </div>
      {error && (
        <div role='alert' className='space-y-2 text-sm text-destructive'>
          <p>{error.message}</p>
          <Button variant='outline' onClick={() => void refresh()}>
            重新读取模板
          </Button>
        </div>
      )}
      {operationError && (
        <p role='alert' className='text-sm text-destructive'>
          {operationError}
        </p>
      )}
      {!error &&
        templates
          .filter((template) =>
            `${template.name} ${template.description || ''}`
              .toLowerCase()
              .includes(search.toLowerCase())
          )
          .map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              canManage={canManage}
              isSaving={isSaving}
              onEdit={(item) => setDialog({ mode: 'edit', template: item })}
              onApply={(item) => setDialog({ mode: 'apply', template: item })}
              onDelete={(item) => void deleteIndependentTopologyTemplate(item)}
            />
          ))}
      {!error && templates.length === 0 && (
        <p className='p-8 text-center text-sm text-muted-foreground'>
          暂无拓扑模板。先建立实际 L1，再将其保存为模板。
        </p>
      )}
      <TemplateDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        mode={dialog?.mode || 'capture'}
        template={dialog?.template}
        lines={lineQuery.data || []}
        branches={branchQuery.data || []}
        isLoadingSources={
          dialog?.mode === 'capture'
            ? lineQuery.isLoading
            : branchQuery.isLoading
        }
        sourceError={
          dialog?.mode === 'capture'
            ? lineQuery.error
            : dialog?.mode === 'edit'
              ? branchQuery.error
              : null
        }
        onSave={saveTopologyTemplateDialog}
      />
    </div>
  )
}
