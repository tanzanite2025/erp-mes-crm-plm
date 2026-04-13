import useDialogState from '@/hooks/use-dialog-state'
import { useNavigate } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { PersonalWorkbenchDialog } from '@/features/personal-workbench/components/personal-workbench-dialog'
import { usePersonalWorkbenchDialogStore } from '@/features/personal-workbench/hooks/use-personal-workbench-dialog-store'

export function ProfileDropdown() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const [open, setOpen] = useDialogState()
  const setPersonalWorkbenchOpen = usePersonalWorkbenchDialogStore((state) => state.setOpen)

  const displayName = user?.username || user?.accountNo || 'User'
  const email = user?.email || 'No email'
  const fallback = displayName.slice(0, 2).toUpperCase()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='relative h-9 w-9 rounded-full border border-border/60 bg-background/80'
          >
            <Avatar className='h-8 w-8'>
              <AvatarImage src='' alt={displayName} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>{displayName}</p>
              <p className='text-xs leading-none text-muted-foreground'>{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPersonalWorkbenchOpen(true)}>
            个人记录缓冲区
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: '/personal-workbench' })}>
            打开个人记录页面
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive' onClick={() => setOpen(true)}>
            {t('common.actions.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
      <PersonalWorkbenchDialog />
    </>
  )
}
