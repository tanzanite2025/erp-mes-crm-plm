import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { MoldGroupMasterRecord } from '../data/mold-group-master-schema'
import { invalidateMoldMasterLibraryQueriesAfterWrite } from '../queries/invalidate-mold-master-library-queries-after-write'
import { createMoldGroupMasterDirectoryQueryOptions } from '../queries/mold-group-master-directory-query-options'
import { MoldGroupMasterService } from '../services/mold-group-master-service'
import { MoldGroupMasterEditorDialog } from './mold-group-master-editor-dialog'

export function MoldGroupMasterManagementDialog({
  onClose,
}: {
  onClose: () => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const managePermission = usePermissionBoundary('action_equipment_mold_manage')
  const queryClient = useQueryClient()
  const directoryQuery = useQuery(createMoldGroupMasterDirectoryQueryOptions())
  const [search, setSearch] = useState('')
  const [editorGroup, setEditorGroup] = useState<
    MoldGroupMasterRecord | 'new' | null
  >(null)
  const [pendingDeletionId, setPendingDeletionId] = useState<string | null>(
    null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const mutationLock = useRef(false)
  const groups = (directoryQuery.data ?? []).filter((group) =>
    `${group.name} ${group.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )

  async function changeMoldGroupAvailabilityOrDelete(
    group: MoldGroupMasterRecord,
    action: 'availability' | 'delete'
  ) {
    if (mutationLock.current || !managePermission.isAllowed) return
    mutationLock.current = true
    setIsSaving(true)
    setErrorMessage('')
    try {
      if (action === 'delete') {
        await MoldGroupMasterService.deleteMoldGroup(group)
        setPendingDeletionId(null)
      } else {
        await MoldGroupMasterService.saveMoldGroup(
          { ...group, active: !group.active },
          group.id
        )
      }
      await invalidateMoldMasterLibraryQueriesAfterWrite(queryClient)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '分组操作失败，请重试'
            : 'Cannot update the group. Please retry.'
      )
    } finally {
      mutationLock.current = false
      setIsSaving(false)
    }
  }

  return (
    <>
      <ActionDialogShell
        open
        onOpenChange={(open) => {
          if (!open && !mutationLock.current) onClose()
        }}
        title={isChineseLocale ? '模具分组管理' : 'Mold group management'}
        description={
          isChineseLocale
            ? '统一维护模具与产品共用的分组。停用后保留已有引用，禁止新增关联；被引用的分组不能删除。'
            : 'Manage the shared directory for molds and products. Inactive groups retain existing links and cannot receive new links. Referenced groups cannot be deleted.'
        }
        contentClassName='mold-master-library-floating-surface flex h-[85vh] flex-col overflow-hidden rounded-2xl sm:max-w-3xl [&_[data-slot=button]]:rounded-full'
        bodyClassName='min-h-0 flex-1 overflow-y-auto'
        footer={
          <Button
            type='button'
            variant='outline'
            disabled={isSaving}
            onClick={onClose}
          >
            {isChineseLocale ? '关闭' : 'Close'}
          </Button>
        }
      >
        <div className='space-y-4 py-2'>
          <div className='flex flex-wrap gap-2'>
            <Input
              aria-label={isChineseLocale ? '搜索分组' : 'Search groups'}
              placeholder={
                isChineseLocale
                  ? '搜索分组名称或说明'
                  : 'Search name or description'
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className='w-full min-w-0 placeholder:text-[13px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground placeholder:opacity-100 sm:w-auto sm:flex-1'
            />
            <Button
              type='button'
              variant='outline'
              disabled={directoryQuery.isFetching || isSaving}
              onClick={() => void directoryQuery.refetch()}
            >
              {isChineseLocale ? '刷新分组' : 'Refresh'}
            </Button>
            <Button
              type='button'
              disabled={!managePermission.isAllowed || isSaving}
              onClick={() => setEditorGroup('new')}
            >
              {isChineseLocale ? '新建分组' : 'Create group'}
            </Button>
          </div>
          {errorMessage && (
            <p role='alert' className='text-sm text-destructive'>
              {errorMessage}
            </p>
          )}
          {directoryQuery.isPending ? (
            <p role='status'>
              {isChineseLocale ? '正在读取分组…' : 'Loading groups…'}
            </p>
          ) : directoryQuery.isError ? (
            <p role='alert' className='text-sm text-destructive'>
              {isChineseLocale
                ? '分组读取失败，请点击刷新分组重试。'
                : 'Cannot load groups. Refresh to retry.'}
            </p>
          ) : groups.length === 0 ? (
            <p role='status' className='text-sm text-muted-foreground'>
              {isChineseLocale
                ? '暂无匹配的分组，可独立新建分组后再录入模具。'
                : 'No matching groups. Create a group before registering molds.'}
            </p>
          ) : (
            <ul className='space-y-3'>
              {groups.map((group) => (
                <li key={group.id} className='space-y-3 rounded-xl border p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <p className='font-medium break-words'>{group.name}</p>
                      <p className='mt-1 text-xs text-muted-foreground'>
                        {isChineseLocale
                          ? `${group.moldCount} 副模具 · ${group.productCount} 个产品引用`
                          : `${group.moldCount} molds · ${group.productCount} products`}
                      </p>
                      {group.description && (
                        <p className='mt-2 text-sm break-words whitespace-pre-wrap text-muted-foreground'>
                          {group.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={group.active ? 'secondary' : 'outline'}>
                      {isChineseLocale
                        ? group.active
                          ? '启用'
                          : '停用'
                        : group.active
                          ? 'Active'
                          : 'Inactive'}
                    </Badge>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={!managePermission.isAllowed || isSaving}
                      onClick={() => setEditorGroup(group)}
                    >
                      {isChineseLocale ? '编辑分组' : 'Edit'}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={!managePermission.isAllowed || isSaving}
                      onClick={() =>
                        void changeMoldGroupAvailabilityOrDelete(
                          group,
                          'availability'
                        )
                      }
                    >
                      {isChineseLocale
                        ? group.active
                          ? '停用分组'
                          : '启用分组'
                        : group.active
                          ? 'Deactivate'
                          : 'Activate'}
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      disabled={
                        !managePermission.isAllowed ||
                        isSaving ||
                        group.moldCount > 0 ||
                        group.productCount > 0
                      }
                      onClick={() => setPendingDeletionId(group.id)}
                    >
                      {isChineseLocale ? '删除分组' : 'Delete'}
                    </Button>
                  </div>
                  {pendingDeletionId === group.id && (
                    <div
                      className='space-y-2 rounded-lg border border-destructive/30 p-3'
                      role='alert'
                    >
                      <p className='text-sm'>
                        {isChineseLocale
                          ? `确认删除“${group.name}”？删除后该名称将保留，不可用于新分组。`
                          : `Delete “${group.name}”? The name will remain reserved.`}
                      </p>
                      <div className='flex gap-2'>
                        <Button
                          type='button'
                          size='sm'
                          variant='destructive'
                          disabled={isSaving}
                          onClick={() =>
                            void changeMoldGroupAvailabilityOrDelete(
                              group,
                              'delete'
                            )
                          }
                        >
                          {isChineseLocale
                            ? '确认删除分组'
                            : 'Confirm deletion'}
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          variant='ghost'
                          disabled={isSaving}
                          onClick={() => setPendingDeletionId(null)}
                        >
                          {isChineseLocale ? '取消删除' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </ActionDialogShell>
      {editorGroup && (
        <MoldGroupMasterEditorDialog
          group={editorGroup === 'new' ? undefined : editorGroup}
          onClose={() => setEditorGroup(null)}
        />
      )}
    </>
  )
}
