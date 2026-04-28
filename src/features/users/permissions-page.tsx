import { ShieldCheck, ShieldPlus, Users as UsersIcon } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { isForbiddenError } from '@/lib/error-status'
import { UsersDialogs } from './components/users-dialogs'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useUsersQuery } from './hooks/use-users'
import { isProtectedSystemAccount } from './utils/user-utils'

type UsersSearchValue = string | number | boolean | null | undefined | string[]
type UsersSearch = Record<string, UsersSearchValue>

export interface UsersPermissionsPageProps {
  search: UsersSearch
  navigate: NavigateFn
}

export function UsersPermissionsPage({ search, navigate }: UsersPermissionsPageProps) {
  const { t } = useLanguage()
  const { data: userPage, isLoading, error } = useUsersQuery(search)

  if (isForbiddenError(error)) {
    return <ForbiddenState fullHeight={false} />
  }

  if (error) {
    return <div className='p-6 text-destructive'>{t('users.layout.errorLoad')}</div>
  }

  const currentPageUsers = userPage?.items ?? []
  const activeUsers = currentPageUsers.filter((user) => user.status === 'active').length
  const protectedUsers = currentPageUsers.filter((user) => isProtectedSystemAccount(user)).length

  return (
    <UsersProvider>
      <div className='flex flex-1 flex-col gap-8 animate-in fade-in duration-700'>
        <div className='flex flex-col gap-1 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:rounded-[32px] sm:p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <ShieldCheck className='size-4' />
            <h3 className='text-base font-black uppercase italic tracking-tighter sm:text-lg'>
              {t('users.permissionPage.title')}
            </h3>
          </div>
          <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 sm:text-[9px]'>
            {t('users.permissionPage.subtitle')}
          </p>
        </div>

        <div className='grid gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='grid gap-4 sm:grid-cols-3'>
            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                    {t('users.permissionPage.stats.total')}
                  </div>
                  <div className='mt-2 text-3xl font-black tracking-tighter'>{String(userPage?.total ?? 0)}</div>
                </div>
                <UsersIcon className='size-4 text-primary/60' />
              </div>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                    {t('users.permissionPage.stats.activeInView')}
                  </div>
                  <div className='mt-2 text-3xl font-black tracking-tighter'>{String(activeUsers)}</div>
                </div>
                <ShieldCheck className='size-4 text-emerald-600/70' />
              </div>
            </div>

            <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                    {t('users.permissionPage.stats.protectedInView')}
                  </div>
                  <div className='mt-2 text-3xl font-black tracking-tighter'>{String(protectedUsers)}</div>
                </div>
                <ShieldPlus className='size-4 text-amber-600/70' />
              </div>
            </div>
          </div>

          <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4'>
            <div className='text-sm font-black italic tracking-tighter'>{t('users.permissionPage.guideTitle')}</div>
            <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('users.permissionPage.guideDescription')}
            </p>
            <div className='mt-4 space-y-3'>
              <div className='flex items-start gap-3'>
                <div className='flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>1</div>
                <p className='text-sm'>{t('users.permissionPage.steps.filter')}</p>
              </div>
              <div className='flex items-start gap-3'>
                <div className='flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>2</div>
                <p className='text-sm'>{t('users.permissionPage.steps.open')}</p>
              </div>
              <div className='flex items-start gap-3'>
                <div className='flex size-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary'>3</div>
                <p className='text-sm'>{t('users.permissionPage.steps.save')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='px-1'>
          <h3 className='text-sm font-black uppercase italic tracking-tighter'>
            {t('users.permissionPage.listTitle')}
          </h3>
          <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
            {t('users.permissionPage.listSubtitle')}
          </p>
        </div>

        <UsersTable
          data={currentPageUsers}
          total={userPage?.total ?? 0}
          search={search}
          navigate={navigate}
          isLoading={isLoading}
          mode='permissions'
          showBulkActions={false}
          showSelection={false}
        />
      </div>
      <UsersDialogs />
    </UsersProvider>
  )
}
