import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import type { UserRightsRole } from './user-rights-types'

type UserRightsRoleSelectorProps = {
  roles: UserRightsRole[]
  selectedRoleId: string
  onSelectRole: (roleId: string) => void
}

export function UserRightsRoleSelector({
  roles,
  selectedRoleId,
  onSelectRole,
}: UserRightsRoleSelectorProps) {
  const { t } = useLanguage()

  return (
    <div className='md:hidden flex flex-col gap-3'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground/50 pl-2'>
        {t('systemManagement.userRights.mobile.targetRole')}
      </div>
      <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none px-1'>
        {roles.map((role) => (
          <Badge
            key={role.id}
            variant={selectedRoleId === role.id ? 'default' : 'outline'}
            onClick={() => onSelectRole(role.id)}
            className={`h-9 px-4 rounded-full shrink-0 cursor-pointer font-black text-[10px] tracking-widest transition-all active:scale-95 ${
              selectedRoleId === role.id ? 'shadow-lg shadow-primary/20' : 'bg-muted/5'
            }`}
          >
            {role.label}
          </Badge>
        ))}
      </div>
    </div>
  )
}
