import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Factory, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import { isForbiddenError } from '@/lib/error-status'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { ProductionLineProfileDialog } from '@/features/production-shared/components/production-line-profile-dialog'
import type { ProductionLineMutationPayload } from '@/features/production-shared/contracts/production-line-mutation'
import type { ProductionLine } from '@/features/production-shared/data/production-line'
import { productionResourceQueryKeys } from '@/features/production-shared/data/production-resource-query-keys'
import { useProductionLines } from '@/features/production-shared/hooks/use-production-lines'

export function ProductionLineManagementPage() {
  const queryClient = useQueryClient()
  const { allowsAction, allowsPermission, isChecking } = usePermissionActions()
  const canRead = !isChecking && allowsPermission('menu_prod_config')
  const canManage = !isChecking && allowsPermission('perm_manage')
  const canUpdate = !isChecking && allowsAction('action_production_line_update')
  const {
    lines,
    isLoading,
    error,
    createLineStrict,
    updateLineStrict,
    deleteLineStrict,
  } = useProductionLines({ enabled: canRead })
  const [search, setSearch] = useState('')
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)

  const visibleLines = lines.filter((line) =>
    `${line.name} ${line.code}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )
  function openCreateLineDialog() {
    setEditingLine(null)
    setProfileDialogOpen(true)
  }

  function openEditLineDialog(line: ProductionLine) {
    setEditingLine(line)
    setProfileDialogOpen(true)
  }

  async function submitLineProfile(payload: ProductionLineMutationPayload) {
    if (payload.type === 'CREATE') {
      if (!canManage) return
      await createLineStrict(payload.data)
      return
    }
    if (!canUpdate) return
    await updateLineStrict(payload)
    await queryClient.invalidateQueries({
      queryKey: productionResourceQueryKeys.lines(),
    })
  }

  async function deleteLine(line: ProductionLine) {
    if (!canManage) return
    if (
      !(await requestApplicationConfirmation(`确认删除产线“${line.name}”？`))
    ) {
      return
    }
    try {
      await deleteLineStrict(line.id)
    } catch {
      // The mutation hook reports the failure and restores the line in the list.
    }
  }

  async function toggleLineActiveState(line: ProductionLine) {
    if (!canUpdate) return
    const tracker = trackDelta(line)
    tracker.data.isActive = !line.isActive
    const delta = tracker.commit()
    if (Object.keys(delta).length === 0) return
    try {
      await updateLineStrict({
        type: 'UPDATE',
        id: line.id,
        delta,
        version: line.version,
      })
    } catch {
      return
    }
    await queryClient.invalidateQueries({
      queryKey: productionResourceQueryKeys.lines(),
    })
  }

  if (isChecking || (isLoading && lines.length === 0)) {
    return (
      <div className='space-y-4 p-4'>
        <Skeleton className='h-14 rounded-2xl' />
        <Skeleton className='h-44 rounded-2xl' />
      </div>
    )
  }
  if (isForbiddenError(error) || !canRead) return <ForbiddenState />

  return (
    <div className='space-y-6 pb-10'>
      <IndustrialHeader
        icon={Factory}
        title='产线'
        description='维护产线名称、编码、启停状态和说明。'
        statusBadge={
          canManage ? (
            <Button className='rounded-full' onClick={openCreateLineDialog}>
              <Plus /> 新增产线
            </Button>
          ) : undefined
        }
      />

      <Card className='rounded-2xl'>
        <CardContent className='space-y-3 p-4'>
          <Input
            aria-label='搜索产线'
            className='max-w-md'
            placeholder='搜索产线名称或编码'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {visibleLines.length === 0 ? (
            <p className='py-8 text-center text-sm text-muted-foreground'>
              {error ? '产线读取失败，请重试。' : '暂无产线。'}
            </p>
          ) : (
            <div className='divide-y rounded-lg border'>
              {visibleLines.map((line) => (
                <div
                  key={line.id}
                  className='flex min-w-0 items-center gap-3 px-3 py-3 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/30 sm:gap-4 sm:px-4'
                >
                  <div className='min-w-0 flex-1'>
                    <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1'>
                      <span className='truncate font-medium'>{line.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${line.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground'}`}
                      >
                        {line.isActive ? '启用' : '停用'}
                      </span>
                    </div>
                    <p className='truncate text-xs text-muted-foreground'>
                      {line.code}
                      {line.description ? ` · ${line.description}` : ''}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    {canUpdate && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='rounded-full'
                        aria-label={`编辑产线：${line.name}`}
                        title={`编辑产线：${line.name}`}
                        onClick={() => openEditLineDialog(line)}
                      >
                        <Pencil />
                      </Button>
                    )}
                    {canUpdate && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='rounded-full'
                        aria-label={`${line.isActive ? '停用' : '启用'}产线：${line.name}`}
                        title={`${line.isActive ? '停用' : '启用'}产线：${line.name}`}
                        onClick={() => void toggleLineActiveState(line)}
                      >
                        <Power />
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive'
                        aria-label={`删除产线：${line.name}`}
                        title={`删除产线：${line.name}`}
                        onClick={() => void deleteLine(line)}
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductionLineProfileDialog
        open={profileDialogOpen}
        onOpenChange={(open) => {
          setProfileDialogOpen(open)
          if (!open) setEditingLine(null)
        }}
        editingLine={editingLine}
        lines={lines}
        onSubmit={submitLineProfile}
      />
    </div>
  )
}
