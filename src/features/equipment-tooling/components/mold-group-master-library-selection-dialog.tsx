import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ActionDialogShell } from '@/components/action-dialog-shell'
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { Mold } from '../data/schema'
import { useMoldMasterLibraryCreateAction } from '../hooks/use-mold-master-library-create-action'
import { createMoldGroupMasterDirectoryQueryOptions } from '../queries/mold-group-master-directory-query-options'
import { createMoldMasterLibrarySelectionOptionsQueryOptions } from '../queries/mold-master-library-query-options'
import { MoldGroupMasterService } from '../services/mold-group-master-service'
import { MoldActionDialog } from './mold-action-dialog'
import { MoldGroupMasterEditorDialog } from './mold-group-master-editor-dialog'
import { MoldMasterLibraryGroupPreviewDialog } from './mold-master-library-group-preview-dialog'

export function MoldGroupMasterLibrarySelectionDialog({
  value,
  onSelect,
  onClose,
}: {
  value?: string
  onSelect: (groupId: string, groupName: string) => void
  onClose: () => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const createPermission = usePermissionBoundary('action_equipment_mold_manage')
  const [search, setSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState(value ?? '')
  const [isCreatingMold, setIsCreatingMold] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [previewGroupId, setPreviewGroupId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const selectionConfirmationLock = useRef(false)
  const moldsQuery = useQuery(
    createMoldMasterLibrarySelectionOptionsQueryOptions()
  )
  const groupsQuery = useQuery(createMoldGroupMasterDirectoryQueryOptions())
  const { createMoldInMasterLibrary } = useMoldMasterLibraryCreateAction()
  const groups = useMemo(
    () =>
      (groupsQuery.data ?? []).map((group) => ({
        ...group,
        members: (moldsQuery.data ?? []).filter(
          (mold) => mold.groupId === group.id
        ),
      })),
    [groupsQuery.data, moldsQuery.data]
  )
  const matchingGroups = groups.filter((group) =>
    [
      group.name,
      group.description,
      ...group.members.flatMap((mold) => [mold.sn, mold.name]),
    ].some((text) => text.toLowerCase().includes(search.trim().toLowerCase()))
  )
  const selectedGroup = groups.find((group) => group.id === selectedGroupId)
  const isLoading = moldsQuery.isPending || groupsQuery.isPending
  const isError = moldsQuery.isError || groupsQuery.isError

  async function refreshMoldGroupMasterLibrary() {
    await Promise.all([moldsQuery.refetch(), groupsQuery.refetch()])
  }

  async function createMoldAndRefreshMasterLibraryGroups(mold: Mold) {
    const saved = await createMoldInMasterLibrary(mold)
    setSelectedGroupId(saved.groupId ?? '')
    setSearch('')
    toast.success(
      isChineseLocale
        ? '模具已保存到主库，请确认选用分组。'
        : 'Mold saved. Confirm the group to use it.'
    )
  }

  async function confirmMoldGroupIdentityFromMasterLibrary() {
    if (!selectedGroup || selectionConfirmationLock.current) return
    selectionConfirmationLock.current = true
    setIsConfirming(true)
    try {
      const currentGroups = await MoldGroupMasterService.getMoldGroupDirectory()
      const currentGroup = currentGroups.find(
        (group) => group.id === selectedGroup.id && group.active
      )
      if (!currentGroup)
        throw new Error(
          isChineseLocale
            ? '此分组已停用或删除，请刷新后重新选择。'
            : 'This group is inactive or deleted. Refresh and choose again.'
        )
      onSelect(currentGroup.id, currentGroup.name)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '分组核对失败，请重试'
            : 'Cannot verify the group. Please retry.'
      )
      void refreshMoldGroupMasterLibrary()
    } finally {
      selectionConfirmationLock.current = false
      setIsConfirming(false)
    }
  }

  return (
    <>
      <ActionDialogShell
        open
        onOpenChange={(open) => {
          if (!open && !selectionConfirmationLock.current) onClose()
        }}
        title={isChineseLocale ? '从模具主库选用分组' : 'Select a mold group'}
        description={
          isChineseLocale
            ? '分组由设备工装统一管理，可以先建立分组再录入模具。确认选用只修改当前产品草稿，保存产品后关联生效。'
            : 'Groups belong to the Equipment & Tooling directory and can exist before molds are registered. Confirming changes the product draft; save the product to persist the link.'
        }
        contentClassName='mold-master-library-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl [&_[data-slot=button]]:rounded-full'
        headerClassName='shrink-0 border-b px-6 py-4 pr-12 text-start'
        bodyClassName='min-h-0 flex-1 overflow-y-auto p-5'
        footerClassName='shrink-0 border-t px-6 py-4'
        footer={
          <>
            <Button
              type='button'
              variant='ghost'
              disabled={isConfirming}
              onClick={onClose}
            >
              {isChineseLocale ? '取消' : 'Cancel'}
            </Button>
            <Button
              type='button'
              disabled={
                !selectedGroup?.active || isConfirming || isLoading || isError
              }
              onClick={() => void confirmMoldGroupIdentityFromMasterLibrary()}
            >
              {isConfirming
                ? isChineseLocale
                  ? '正在核对…'
                  : 'Checking…'
                : isChineseLocale
                  ? '确认选用此分组'
                  : 'Use this group'}
            </Button>
          </>
        }
      >
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            <Input
              aria-label={
                isChineseLocale ? '搜索模具分组' : 'Search mold groups'
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isChineseLocale
                  ? '搜索分组、模具编号或名称'
                  : 'Search group or mold'
              }
              className='w-full min-w-0 placeholder:text-[13px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground placeholder:opacity-100 sm:w-auto sm:flex-1'
            />
            <Button
              type='button'
              variant='outline'
              disabled={
                isConfirming || moldsQuery.isFetching || groupsQuery.isFetching
              }
              onClick={() => void refreshMoldGroupMasterLibrary()}
            >
              {isChineseLocale ? '刷新主库' : 'Refresh library'}
            </Button>
            <Button
              type='button'
              variant='outline'
              disabled={!createPermission.isAllowed || isConfirming}
              onClick={() => setIsCreatingGroup(true)}
            >
              {isChineseLocale ? '新建分组' : 'Create group'}
            </Button>
            <Button
              type='button'
              disabled={!createPermission.isAllowed || isConfirming}
              onClick={() => setIsCreatingMold(true)}
            >
              {isChineseLocale ? '新增模具' : 'Create mold'}
            </Button>
          </div>
          {isLoading ? (
            <p role='status'>
              {isChineseLocale
                ? '正在读取模具分组与资产…'
                : 'Loading groups and molds…'}
            </p>
          ) : isError ? (
            <p role='alert' className='text-sm text-destructive'>
              {isChineseLocale
                ? '模具主库读取失败，请点击“刷新主库”重试。'
                : 'Cannot load the library. Refresh to retry.'}
            </p>
          ) : matchingGroups.length ? (
            <ul className='space-y-2'>
              {matchingGroups.map((group) => (
                <li
                  key={group.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3',
                    selectedGroupId === group.id &&
                      'border-blue-500 bg-blue-600/5'
                  )}
                >
                  <label className='flex min-w-0 flex-1 cursor-pointer items-start gap-3'>
                    <input
                      type='radio'
                      name='mold-master-library-group'
                      value={group.id}
                      checked={selectedGroupId === group.id}
                      onChange={() => setSelectedGroupId(group.id)}
                      disabled={!group.active || isConfirming}
                      className='mt-1 size-4 shrink-0 accent-blue-600'
                    />
                    <span className='min-w-0'>
                      <span className='block text-sm font-semibold break-words'>
                        {group.name}
                        {!group.active
                          ? isChineseLocale
                            ? '（已停用）'
                            : ' (inactive)'
                          : ''}
                      </span>
                      <span className='mt-1 block text-xs text-muted-foreground'>
                        {isChineseLocale
                          ? `${group.members.length} 副模具`
                          : `${group.members.length} molds`}
                      </span>
                      <span className='mt-1 block text-xs leading-5 break-words text-muted-foreground'>
                        {group.members.length
                          ? group.members
                              .slice(0, 3)
                              .map((mold) => `${mold.sn} · ${mold.name}`)
                              .join('；')
                          : isChineseLocale
                            ? '暂未录入模具'
                            : 'No molds registered yet'}
                      </span>
                    </span>
                  </label>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={isConfirming}
                    onClick={() => setPreviewGroupId(group.id)}
                  >
                    {isChineseLocale ? '查看' : 'View'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p role='status' className='text-sm text-muted-foreground'>
              {isChineseLocale
                ? '暂无匹配分组，可先新建分组。'
                : 'No matching groups. Create a group first.'}
            </p>
          )}
        </div>
      </ActionDialogShell>
      {isCreatingGroup && (
        <MoldGroupMasterEditorDialog
          onClose={() => setIsCreatingGroup(false)}
          onSaved={(group) => {
            setSelectedGroupId(group.id)
            setSearch('')
          }}
        />
      )}
      {isCreatingMold && (
        <MoldActionDialog
          open
          onOpenChange={setIsCreatingMold}
          initialGroupId={selectedGroupId}
          requireGroupSelection
          onConfirm={createMoldAndRefreshMasterLibraryGroups}
        />
      )}
      {previewGroupId && (
        <MoldMasterLibraryGroupPreviewDialog
          groupId={previewGroupId}
          onClose={() => setPreviewGroupId(null)}
        />
      )}
    </>
  )
}
