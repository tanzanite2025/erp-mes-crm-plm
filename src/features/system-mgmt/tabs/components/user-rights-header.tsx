import { Plus, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import type { OrgRoleOption } from './user-rights-types'

type UserRightsHeaderProps = {
  isAddingMode: boolean
  newRoleId: string
  orgNodes: OrgRoleOption[]
  isConfirmDisabled?: boolean
  onNewRoleChange: (value: string) => void
  onStartAdd: () => void
  onConfirmAdd: () => void
  onCancelAdd: () => void
}

export function UserRightsHeader({
  isAddingMode,
  newRoleId,
  orgNodes,
  isConfirmDisabled,
  onNewRoleChange,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
}: UserRightsHeaderProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-end justify-between bg-muted/5 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-dashed border-muted/50 gap-6'>
      <div className='space-y-1'>
        <div className='flex items-center gap-2 text-primary'>
          <ShieldCheck className='size-4' />
          <h3 className='text-base sm:text-lg font-black tracking-tighter italic'>
            {t('systemManagement.userRights.header.title')}
          </h3>
        </div>
        <p className='text-[8px] sm:text-[9px] font-black text-muted-foreground tracking-widest opacity-60'>
          {t('systemManagement.userRights.header.subtitle')}
        </p>
      </div>

      {!isAddingMode ? (
        <Button
          size='sm'
          onClick={onStartAdd}
          title={t('systemManagement.userRights.actions.importOrgRole')}
          className='rounded-full h-11 px-8 font-black text-[10px] tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto'
        >
          <Plus className='mr-2 size-3.5' />
          {t('systemManagement.userRights.actions.importOrgRole')}
        </Button>
      ) : (
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-background/50 p-3 sm:p-2 rounded-[20px] sm:rounded-full border border-dashed border-muted/50 shadow-inner w-full sm:w-auto'>
          <SelectDropdown
            placeholder={t('systemManagement.userRights.actions.selectOrgRole')}
            aria-label={t('systemManagement.userRights.actions.selectOrgRole')}
            className='h-10 sm:h-9 w-full sm:w-64 rounded-full border-none bg-muted/20 text-[10px] font-bold px-4'
            items={orgNodes}
            defaultValue={newRoleId}
            onValueChange={onNewRoleChange}
          />
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              onClick={onConfirmAdd}
              disabled={isConfirmDisabled}
              className='flex-1 sm:flex-none rounded-full h-10 sm:h-9 px-6 font-black text-[10px] tracking-widest shadow-lg'
            >
              {t('systemManagement.userRights.actions.confirmImport')}
            </Button>
            <Button
              size='sm'
              variant='ghost'
              onClick={onCancelAdd}
              className='flex-1 sm:flex-none rounded-full h-10 sm:h-9 px-4 text-[10px] font-bold opacity-60'
            >
              {t('common.actions.cancel')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
