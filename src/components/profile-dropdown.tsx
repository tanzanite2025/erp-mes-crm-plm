import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import useDialogState from '@/hooks/use-dialog-state'
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
import { usePersonalWorkbenchBottomDrawerStore } from '@/features/personal-workbench/hooks/use-personal-workbench-bottom-drawer-store'

export function ProfileDropdown() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const [open, setOpen] = useDialogState()
  const openPersonalWorkbenchBottomDrawer = usePersonalWorkbenchBottomDrawerStore(
    (state) => state.openPersonalWorkbenchBottomDrawer
  )

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
            className='relative h-8.5 w-8.5 rounded-full border border-dashed border-border/60 bg-background/90 shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5'
          >
            <Avatar className='h-7.5 w-7.5'>
              <AvatarImage src='' alt={displayName} />
              <AvatarFallback className='bg-muted/70 text-[10px] font-black text-foreground'>
                {fallback}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-72 rounded-[28px] border border-dashed border-border/70 bg-background/95 p-2 shadow-xl backdrop-blur-xl'
          align='end'
          forceMount
          sideOffset={10}
        >
          <DropdownMenuLabel className='px-3 py-3 font-normal'>
            <div className='flex items-center gap-3'>
              <Avatar className='h-11 w-11 rounded-2xl'>
                <AvatarImage src='' alt={displayName} />
                <AvatarFallback className='rounded-2xl bg-primary/10 text-[13px] font-black text-primary'>
                  {fallback}
                </AvatarFallback>
              </Avatar>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <p className='truncate text-base leading-none font-black tracking-tight text-foreground italic'>
                  {displayName}
                </p>
                <p className='truncate text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className='my-2 bg-border/70' />
          <DropdownMenuItem
            className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-foreground focus:bg-primary/5 focus:text-foreground'
            onClick={openPersonalWorkbenchBottomDrawer}
          >
            打开个人记录底部抽屉
          </DropdownMenuItem>
          <DropdownMenuSeparator className='my-2 bg-border/70' />
          <DropdownMenuItem
            className='rounded-2xl px-3 py-3 text-[12px] font-black tracking-tight text-destructive focus:bg-destructive/10 focus:text-destructive'
            variant='destructive'
            onClick={() => setOpen(true)}
          >
            {t('common.actions.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
