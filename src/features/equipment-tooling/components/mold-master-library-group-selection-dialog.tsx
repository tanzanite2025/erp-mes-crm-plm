import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
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
import { usePermissionBoundary } from '@/features/authz/hooks/use-permission-access'
import type { Mold } from '../data/schema'
import { useMoldMasterLibraryCreateAction } from '../hooks/use-mold-master-library-create-action'
import { createMoldMasterLibrarySelectionOptionsQueryOptions } from '../queries/mold-master-library-query-options'
import { MoldCoreService } from '../services/mold-core-service'
import { groupMoldMasterLibraryRecordsByGroupName } from '../utils/group-mold-master-library-records-by-group-name'
import { MoldActionDialog } from './mold-action-dialog'
import { MoldMasterLibraryGroupPreviewDialog } from './mold-master-library-group-preview-dialog'

export function MoldMasterLibraryGroupSelectionDialog({
  value,
  onSelect,
  onClose,
}: {
  value?: string
  onSelect: (groupName: string) => void
  onClose: () => void
}) {
  const { locale } = useLanguage()
  const isChineseLocale = locale.startsWith('zh')
  const createPermission = usePermissionBoundary('action_equipment_mold_manage')
  const [search, setSearch] = useState('')
  const [selectedGroupName, setSelectedGroupName] = useState(value ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [previewGroupName, setPreviewGroupName] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const selectionConfirmationLock = useRef(false)
  const moldsQuery = useQuery(
    createMoldMasterLibrarySelectionOptionsQueryOptions()
  )
  const { createMoldInMasterLibrary } = useMoldMasterLibraryCreateAction()
  const groups = useMemo(
    () => groupMoldMasterLibraryRecordsByGroupName(moldsQuery.data ?? []),
    [moldsQuery.data]
  )
  const matchingGroups = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return groups.filter(
      (group) =>
        !normalizedSearch ||
        [
          group.name,
          ...group.members.flatMap((mold) => [
            mold.sn,
            mold.name,
            mold.location ?? '',
          ]),
        ].some((value) => value.toLowerCase().includes(normalizedSearch))
    )
  }, [groups, search])
  const selectedGroup = groups.find((group) => group.name === selectedGroupName)

  async function createMoldAndRefreshMasterLibraryGroups(mold: Mold) {
    const saved = await createMoldInMasterLibrary(mold)
    setSelectedGroupName(saved.groupName?.trim() ?? '')
    setSearch('')
    toast.success(
      isChineseLocale
        ? '模具已保存到主库，请确认选用分组。'
        : 'Mold saved to the master library. Confirm the group to use it.'
    )
  }

  async function confirmMoldGroupFromMasterLibrary() {
    if (!selectedGroup || selectionConfirmationLock.current) return
    selectionConfirmationLock.current = true
    setIsConfirming(true)
    try {
      const currentGroupNames = await MoldCoreService.getGroupNames()
      if (!currentGroupNames.includes(selectedGroup.name)) {
        throw new Error(
          isChineseLocale
            ? '此分组已没有模具，请刷新后重新选择。'
            : 'This group no longer contains molds. Refresh and choose again.'
        )
      }
      onSelect(selectedGroup.name)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isChineseLocale
            ? '分组核对失败，请重试'
            : 'Cannot verify the group. Please retry.'
      )
      void moldsQuery.refetch()
    } finally {
      selectionConfirmationLock.current = false
      setIsConfirming(false)
    }
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !isConfirming) onClose()
        }}
      >
        <DialogContent className='mold-master-library-floating-surface flex h-[85vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-4xl'>
          <DialogHeader className='shrink-0 border-b px-6 py-4 pr-12 text-start'>
            <DialogTitle className='text-base'>
              {isChineseLocale
                ? '从模具主库选择分组'
                : 'Choose a group from the mold library'}
            </DialogTitle>
            <DialogDescription className='text-xs leading-5'>
              {isChineseLocale
                ? '分组由设备工装 → 模具管理中相同组名的模具组成。可查看、选择，或新增模具并填写已有／新组名；确认选用后，关联随产品保存。'
                : 'Groups contain molds with the same group name in Equipment & Tooling → Molds. View or choose a group, or create a mold with an existing or new group name. The product link is saved with the product.'}
            </DialogDescription>
          </DialogHeader>
          <div className='flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-3'>
            <div className='relative w-full min-w-0 sm:w-auto sm:flex-1'>
              <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                aria-label={
                  isChineseLocale ? '搜索模具分组' : 'Search mold groups'
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isChineseLocale
                    ? '搜索分组、模具编号或名称'
                    : 'Search group, mold SN or name'
                }
                className='h-10 pl-9 text-[13px] placeholder:text-[13px] placeholder:tracking-normal placeholder:text-muted-foreground placeholder:normal-case placeholder:opacity-100 md:text-[13px]'
              />
            </div>
            <Button
              type='button'
              variant='outline'
              className='flex-1 rounded-full text-[13px] sm:flex-none'
              disabled={moldsQuery.isFetching || isConfirming}
              onClick={() => void moldsQuery.refetch()}
            >
              {isChineseLocale ? '刷新主库' : 'Refresh library'}
            </Button>
            <Button
              type='button'
              className='flex-1 rounded-full bg-blue-600 text-[13px] text-white hover:bg-blue-700 sm:flex-none'
              disabled={!createPermission.isAllowed || isConfirming}
              title={
                !createPermission.isAllowed
                  ? isChineseLocale
                    ? '新增模具需要模具管理权限'
                    : 'Mold management permission is required'
                  : undefined
              }
              onClick={() => setIsCreating(true)}
            >
              <Plus className='mr-1 size-4' />
              {isChineseLocale ? '新增模具 / 分组' : 'New mold / group'}
            </Button>
          </div>
          <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-5'>
            {moldsQuery.isPending ? (
              <p role='status' className='text-sm'>
                {isChineseLocale
                  ? '正在读取模具主库…'
                  : 'Loading mold library…'}
              </p>
            ) : moldsQuery.isError ? (
              <p role='alert' className='text-sm text-destructive'>
                {isChineseLocale
                  ? '模具主库读取失败，请点击“刷新主库”重试。'
                  : 'Cannot read the mold library. Select Refresh library to retry.'}
              </p>
            ) : matchingGroups.length ? (
              <ul className='space-y-2'>
                {matchingGroups.map((group) => (
                  <li
                    key={group.name}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3',
                      selectedGroupName === group.name
                        ? 'border-blue-500 bg-blue-600/5'
                        : 'border-border'
                    )}
                  >
                    <label className='flex min-w-0 flex-1 cursor-pointer items-start gap-3'>
                      <input
                        type='radio'
                        name='mold-master-library-group'
                        value={group.name}
                        checked={selectedGroupName === group.name}
                        onChange={() => setSelectedGroupName(group.name)}
                        disabled={isConfirming}
                        className='mt-1 size-4 shrink-0 accent-blue-600'
                      />
                      <span className='min-w-0'>
                        <span className='block text-sm font-semibold break-words'>
                          {group.name}
                        </span>
                        <span className='mt-1 block text-xs leading-5 text-muted-foreground'>
                          {isChineseLocale
                            ? `${group.members.length} 副模具`
                            : `${group.members.length} molds`}
                        </span>
                        <span className='mt-1 block text-xs leading-5 break-words text-muted-foreground'>
                          {group.members
                            .slice(0, 3)
                            .map((mold) => `${mold.sn} · ${mold.name}`)
                            .join('；')}
                          {group.members.length > 3 ? ' …' : ''}
                        </span>
                      </span>
                    </label>
                    <Button
                      type='button'
                      variant='outline'
                      className='shrink-0 rounded-full text-xs'
                      disabled={isConfirming}
                      onClick={() => setPreviewGroupName(group.name)}
                    >
                      <Eye className='mr-1 size-4' />
                      {isChineseLocale ? '查看' : 'View'}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p
                role='status'
                className='text-sm leading-6 text-muted-foreground'
              >
                {groups.length
                  ? isChineseLocale
                    ? '没有匹配的分组，请调整搜索内容。'
                    : 'No matching groups. Try another search.'
                  : isChineseLocale
                    ? '主库尚无已分组的模具。通过“新增模具 / 分组”建立模具并填写组名，保存后即可选择。未填写组名的模具不会出现在分组选项中。'
                    : 'No grouped molds yet. Use New mold / group to create a mold and enter a group name. Molds without a group name are excluded from group options.'}
              </p>
            )}
          </div>
          <DialogFooter className='shrink-0 border-t px-5 py-4'>
            <p className='mr-auto text-start text-xs leading-5 break-words text-muted-foreground'>
              {selectedGroup
                ? isChineseLocale
                  ? `已选：${selectedGroup.name}`
                  : `Selected: ${selectedGroup.name}`
                : isChineseLocale
                  ? '请选择一个主库分组'
                  : 'Select a master-library group'}
            </p>
            <Button
              type='button'
              variant='outline'
              className='rounded-full'
              disabled={isConfirming}
              onClick={onClose}
            >
              {isChineseLocale ? '取消' : 'Cancel'}
            </Button>
            <Button
              type='button'
              className='rounded-full bg-blue-600 text-white hover:bg-blue-700'
              disabled={!selectedGroup || !moldsQuery.isSuccess || isConfirming}
              onClick={() => void confirmMoldGroupFromMasterLibrary()}
            >
              {isConfirming
                ? isChineseLocale
                  ? '正在核对…'
                  : 'Checking…'
                : isChineseLocale
                  ? '确认选用此分组'
                  : 'Use this group'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isCreating && (
        <MoldActionDialog
          open
          onOpenChange={setIsCreating}
          initialGroupName={selectedGroupName}
          requireGroupName
          onConfirm={createMoldAndRefreshMasterLibraryGroups}
        />
      )}
      {previewGroupName && (
        <MoldMasterLibraryGroupPreviewDialog
          groupName={previewGroupName}
          onClose={() => setPreviewGroupName(null)}
        />
      )}
    </>
  )
}
