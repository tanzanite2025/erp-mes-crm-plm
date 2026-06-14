import { UserPlus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { t } = useLanguage()
  const { setOpen } = useUsers()
  return (
    <div className='flex w-full flex-col gap-3 sm:w-auto sm:flex-row'>
      <NonBlockingPermissionBoundary permission='user_create'>
        <Button
          className='h-11 flex-1 rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95 sm:flex-initial'
          onClick={() => setOpen('add')}
        >
          <UserPlus className='mr-2 size-4 shrink-0' />{' '}
          {t('users.actions.addUser')}
        </Button>
      </NonBlockingPermissionBoundary>
    </div>
  )
}
