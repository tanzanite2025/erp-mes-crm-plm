import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit, Plus, RefreshCw, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import {
  type WorkflowDefinitionRecord,
  WorkflowDefinitionService,
} from '../workflow-core/services/workflow-definition-service'

const DEFAULT_DEFINITION_JSON = JSON.stringify(
  {
    startNodeId: 'n1',
    nodes: [
      {
        nodeId: 'n1',
        assigneeUserId: 'u-approver',
      },
    ],
  },
  null,
  2
)

type DefinitionFormState = {
  id: string
  code: string
  name: string
  version: string
  isActive: boolean
  description: string
  definitionJson: string
}

const defaultFormState: DefinitionFormState = {
  id: '',
  code: '',
  name: '',
  version: '1',
  isActive: true,
  description: '',
  definitionJson: DEFAULT_DEFINITION_JSON,
}

export function SalesWorkflowDefinitionTab() {
  const { t, locale } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const canManage =
    allowsAction('action_system_workflow_manage') || allowsAction('action_approval_config_manage')

  const [items, setItems] = useState<WorkflowDefinitionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<DefinitionFormState>(defaultFormState)

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
        return b.version - a.version
      }),
    [items]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const data = await WorkflowDefinitionService.listSalesOrderDefinitions()
      setItems(data)
    } catch (err) {
      setError(err)
      toast.error(
        t('systemManagement.salesWorkflowDefinition.toasts.loadFailed') || '加载工作流定义失败'
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleOpenCreate = () => {
    if (!canManage) return
    setForm(defaultFormState)
    setOpen(true)
  }

  const handleOpenEdit = (item: WorkflowDefinitionRecord) => {
    if (!canManage) return
    setForm({
      id: item.id,
      code: item.code,
      name: item.name,
      version: String(item.version),
      isActive: item.isActive,
      description: item.description || '',
      definitionJson: item.definitionJson || DEFAULT_DEFINITION_JSON,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!canManage) return

    const code = form.code.trim()
    const name = form.name.trim()
    const version = Number.parseInt(form.version, 10)
    const description = form.description.trim()
    const definitionJson = form.definitionJson.trim()

    if (!code || !name) {
      toast.error(t('systemManagement.salesWorkflowDefinition.toasts.required') || '请填写编码和名称')
      return
    }
    if (!Number.isFinite(version) || version <= 0) {
      toast.error(
        t('systemManagement.salesWorkflowDefinition.toasts.invalidVersion') || '版本号需为正整数'
      )
      return
    }

    try {
      JSON.parse(definitionJson)
    } catch {
      toast.error(
        t('systemManagement.salesWorkflowDefinition.toasts.invalidJson') || '流程定义 JSON 格式错误'
      )
      return
    }

    try {
      setSaving(true)
      await WorkflowDefinitionService.upsertSalesOrderDefinition({
        id: form.id || undefined,
        code,
        name,
        version,
        isActive: form.isActive,
        description,
        definitionJson,
      })
      toast.success(t('systemManagement.salesWorkflowDefinition.toasts.saveSuccess') || '保存成功')
      setOpen(false)
      setForm(defaultFormState)
      await loadData()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('systemManagement.salesWorkflowDefinition.toasts.saveFailed') || '保存失败'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item: WorkflowDefinitionRecord) => {
    if (!canManage) return
    try {
      await WorkflowDefinitionService.upsertSalesOrderDefinition({
        id: item.id,
        isActive: !item.isActive,
      })
      toast.success(t('systemManagement.salesWorkflowDefinition.toasts.saveSuccess') || '保存成功')
      await loadData()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : t('systemManagement.salesWorkflowDefinition.toasts.saveFailed') || '保存失败'
      )
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (loading) {
    return (
      <div className='animate-pulse p-8 text-center text-muted-foreground'>
        {t('systemManagement.salesWorkflowDefinition.loading') || '加载中...'}
      </div>
    )
  }

  return (
    <div className='animate-in fade-in flex flex-col gap-6 duration-700'>
      <div className='flex flex-col gap-2 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Workflow className='size-4' />
          <h3 className='text-lg font-black uppercase italic tracking-tighter'>
            {t('systemManagement.salesWorkflowDefinition.title') || '销售单工作流定义'}
          </h3>
        </div>
        <p className='text-[10px] font-bold text-muted-foreground'>
          {t('systemManagement.salesWorkflowDefinition.subtitle') ||
            '维护 SALES_ORDER 模块的流程定义，启用后新建销售订单会自动挂接工作流实例。'}
        </p>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          className='rounded-xl'
          onClick={() => void loadData()}
        >
          <RefreshCw className='mr-2 size-4' />
          {t('systemManagement.salesWorkflowDefinition.actions.refresh') || '刷新'}
        </Button>
        <Button
          type='button'
          className='rounded-xl'
          onClick={handleOpenCreate}
          disabled={!canManage}
        >
          <Plus className='mr-2 size-4' />
          {t('systemManagement.salesWorkflowDefinition.add') || '新增定义'}
        </Button>
      </div>

      <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 p-4'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('systemManagement.salesWorkflowDefinition.table.code') || '编码'}</TableHead>
              <TableHead>{t('systemManagement.salesWorkflowDefinition.table.name') || '名称'}</TableHead>
              <TableHead>{t('systemManagement.salesWorkflowDefinition.table.version') || '版本'}</TableHead>
              <TableHead>{t('systemManagement.salesWorkflowDefinition.table.status') || '状态'}</TableHead>
              <TableHead>{t('systemManagement.salesWorkflowDefinition.table.updatedAt') || '更新时间'}</TableHead>
              <TableHead className='text-right'>
                {t('systemManagement.salesWorkflowDefinition.table.actions') || '操作'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='py-8 text-center text-muted-foreground'>
                  {t('systemManagement.salesWorkflowDefinition.empty') || '暂无销售单工作流定义'}
                </TableCell>
              </TableRow>
            ) : (
              sortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='font-mono text-xs'>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.version}</TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest',
                        item.isActive
                          ? 'bg-emerald-500/15 text-emerald-700'
                          : 'bg-zinc-500/15 text-zinc-600'
                      )}
                    >
                      {item.isActive
                        ? t('systemManagement.salesWorkflowDefinition.status.active') || '启用'
                        : t('systemManagement.salesWorkflowDefinition.status.inactive') || '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(item.updatedAt).toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US')}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='inline-flex gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='rounded-lg'
                        onClick={() => handleOpenEdit(item)}
                        disabled={!canManage}
                      >
                        <Edit className='mr-1 size-3.5' />
                        {t('common.actions.edit') || '编辑'}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        className='rounded-lg'
                        onClick={() => void handleToggleActive(item)}
                        disabled={!canManage}
                      >
                        {item.isActive
                          ? t('systemManagement.salesWorkflowDefinition.actions.disable') || '停用'
                          : t('systemManagement.salesWorkflowDefinition.actions.enable') || '启用'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='rounded-[28px] border-2 sm:max-w-[760px]'>
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? t('systemManagement.salesWorkflowDefinition.dialog.editTitle') || '编辑工作流定义'
                : t('systemManagement.salesWorkflowDefinition.dialog.createTitle') || '新增工作流定义'}
            </DialogTitle>
            <DialogDescription>
              {t('systemManagement.salesWorkflowDefinition.dialog.description') ||
                '仅作用于销售单（SALES_ORDER）模块。'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>{t('systemManagement.salesWorkflowDefinition.form.code') || '编码'}</Label>
              <Input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder='SO_FLOW_V1'
              />
            </div>
            <div className='space-y-2'>
              <Label>{t('systemManagement.salesWorkflowDefinition.form.name') || '名称'}</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('systemManagement.salesWorkflowDefinition.form.namePlaceholder') || '销售单默认审批流'}
              />
            </div>
            <div className='space-y-2'>
              <Label>{t('systemManagement.salesWorkflowDefinition.form.version') || '版本'}</Label>
              <Input
                type='number'
                min={1}
                value={form.version}
                onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
              />
            </div>
            <div className='flex items-end justify-between rounded-xl border border-dashed p-3'>
              <div className='space-y-1'>
                <p className='text-sm font-semibold'>
                  {t('systemManagement.salesWorkflowDefinition.form.isActive') || '启用状态'}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {t('systemManagement.salesWorkflowDefinition.form.isActiveHint') ||
                    '启用后新建销售单会自动创建工作流实例'}
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <div className='space-y-2'>
            <Label>{t('systemManagement.salesWorkflowDefinition.form.description') || '描述'}</Label>
            <Textarea
              className='min-h-[72px]'
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('systemManagement.salesWorkflowDefinition.form.descriptionPlaceholder') || '用于说明此流程定义的业务场景'}
            />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>{t('systemManagement.salesWorkflowDefinition.form.definitionJson') || '流程定义 JSON'}</Label>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    definitionJson: DEFAULT_DEFINITION_JSON,
                  }))
                }
              >
                {t('systemManagement.salesWorkflowDefinition.form.useTemplate') || '填入模板'}
              </Button>
            </div>
            <Textarea
              className='min-h-[220px] font-mono text-xs'
              value={form.definitionJson}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  definitionJson: event.target.value,
                }))
              }
              placeholder='{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}'
            />
          </div>

          <DialogFooter className='gap-2'>
            <Button variant='ghost' onClick={() => setOpen(false)}>
              {t('common.actions.cancel') || '取消'}
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? `${t('common.actions.save') || '保存'}...` : t('common.actions.save') || '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
