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
    <div className='flex flex-col gap-3'>
      <div className='text-[10px] font-black tracking-widest text-muted-foreground/50 pl-2'>
        {t('systemManagement.userRights.mobile.targetRole')}
      </div>
      <div className='flex max-h-44 flex-wrap items-center gap-2 overflow-y-auto rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-3'>
        {roles.map((role) => (
          <Badge
            key={role.id}
            variant={selectedRoleId === role.id ? 'default' : 'outline'}
            onClick={() => onSelectRole(role.id)}
            className={`h-9 max-w-[220px] px-4 rounded-full shrink-0 cursor-pointer font-black text-[10px] tracking-widest transition-all active:scale-95 ${
              selectedRoleId === role.id ? 'shadow-lg shadow-primary/20' : 'bg-muted/5'
            }`}
          >
            <span className='truncate'>{role.label}</span>
          </Badge>
        ))}
      </div>
    </div>
  )
}
