import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUsers } from './users-provider'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
import { useLanguage } from '@/context/language-provider'

export function UsersPrimaryButtons() {
  const { t } = useLanguage()
  const { setOpen } = useUsers()
  return (
    <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
      <NonBlockingPermissionBoundary permission='user_create'>
        <Button 
          className='flex-1 sm:flex-initial rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all' 
          onClick={() => setOpen('add')}
        >
          <UserPlus className='mr-2 size-4 shrink-0' /> {t('users.actions.addUser')}
        </Button>
      </NonBlockingPermissionBoundary>
    </div>
  )
}
