import { CheckCheck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserPermissionToolbarProps = {
  permissionPresetId?: string
  presetPermissionCount: number
  effectivePermissionCount: number
  search: string
  allPermissionsSelected: boolean
  canSelectPermissions: boolean
  onSearchChange: (value: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
}

export function UserPermissionToolbar({
  permissionPresetId,
  presetPermissionCount,
  effectivePermissionCount,
  search,
  allPermissionsSelected,
  canSelectPermissions,
  onSearchChange,
  onSelectAll,
  onClearAll,
  onExpandAll,
  onCollapseAll,
}: UserPermissionToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='shrink-0 space-y-2 rounded-2xl border border-dashed border-muted/40 bg-muted/10 p-2.5 sm:p-3'>
      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black tracking-widest text-muted-foreground uppercase'>
        <span>
          {t('users.permissionAssignments.summary.permissionPreset')}:{' '}
          {permissionPresetId || t('users.permissionAssignments.summary.none')}
        </span>
        <span>
          {t('users.permissionAssignments.summary.presetPermissionCount')}:{' '}
          {presetPermissionCount}
        </span>
        <span>
          {t('users.permissionAssignments.summary.effectivePermissionCount')}:{' '}
          {effectivePermissionCount}
        </span>
      </div>
      <div className='space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:space-y-0'>
        <Input
          className='h-10 rounded-2xl border-none bg-background/80 px-4 text-[12px] shadow-sm placeholder:text-muted-foreground/35 sm:min-w-[220px] sm:flex-1 md:text-sm'
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t('users.permissionAssignments.placeholders.search')}
        />
        <div className='grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center'>
          <Button
            type='button'
            variant={allPermissionsSelected ? 'outline' : 'default'}
            className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black tracking-[0.12em] uppercase shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
            onClick={allPermissionsSelected ? onClearAll : onSelectAll}
            disabled={!canSelectPermissions}
          >
            <CheckCheck className='size-4' />
            {allPermissionsSelected
              ? t('users.permissionAssignments.actions.deselectAll')
              : t('users.permissionAssignments.actions.selectAll')}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black tracking-[0.12em] uppercase shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
            onClick={onExpandAll}
          >
            {t('users.permissionAssignments.actions.expandAll')}
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-9 w-full justify-center rounded-full px-2 text-[10px] font-black tracking-[0.12em] uppercase shadow-sm transition-all active:scale-95 sm:h-10 sm:w-auto sm:px-3 sm:tracking-widest'
            onClick={onCollapseAll}
          >
            {t('users.permissionAssignments.actions.collapseAll')}
          </Button>
        </div>
      </div>
    </div>
  )
}
