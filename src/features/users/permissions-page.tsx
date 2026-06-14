import { ShieldCheck, ShieldPlus, Users as UsersIcon } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
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

export function UsersPermissionsPage({
  search,
  navigate,
}: UsersPermissionsPageProps) {
  const { t } = useLanguage()
  const { data: userPage, isLoading, error } = useUsersQuery(search)

  if (isForbiddenError(error)) {
    return <ForbiddenState fullHeight={false} />
  }

  if (error) {
    return (
      <div className='p-6 text-destructive'>{t('users.layout.errorLoad')}</div>
    )
  }

  const currentPageUsers = userPage?.items ?? []
  const activeUsers = currentPageUsers.filter(
    (user) => user.status === 'active'
  ).length
  const protectedUsers = currentPageUsers.filter((user) =>
    isProtectedSystemAccount(user)
  ).length

  return (
    <UsersProvider>
      <div className='flex flex-1 animate-in flex-col gap-6 duration-700 fade-in sm:gap-8'>
        <div className='flex flex-col gap-1 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-3 sm:rounded-[32px] sm:p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <ShieldCheck className='size-4' />
            <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
              {t('users.permissionPage.title')}
            </h3>
          </div>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
            {t('users.permissionPage.subtitle')}
          </p>
        </div>

        <div className='grid gap-3 sm:gap-4 lg:grid-cols-[1.2fr_0.8fr]'>
          <div className='grid grid-cols-3 gap-1.5 sm:gap-4'>
            <div className='min-w-0 rounded-[20px] border border-dashed border-muted/50 bg-muted/5 p-2.5 sm:rounded-[24px] sm:p-4'>
              <div className='flex items-start justify-between gap-1.5 sm:gap-3'>
                <div className='min-w-0'>
                  <div className='min-h-7 text-[7px] leading-[0.9rem] font-black tracking-[0.12em] text-muted-foreground/50 uppercase sm:min-h-0 sm:text-[10px] sm:leading-tight sm:tracking-widest'>
                    {t('users.permissionPage.stats.total')}
                  </div>
                  <div className='mt-0.5 text-lg leading-none font-black tracking-tighter sm:mt-2 sm:text-3xl'>
                    {String(userPage?.total ?? 0)}
                  </div>
                </div>
                <UsersIcon className='size-3 shrink-0 text-primary/60 sm:size-4' />
              </div>
            </div>

            <div className='min-w-0 rounded-[20px] border border-dashed border-muted/50 bg-muted/5 p-2.5 sm:rounded-[24px] sm:p-4'>
              <div className='flex items-start justify-between gap-1.5 sm:gap-3'>
                <div className='min-w-0'>
                  <div className='min-h-7 text-[7px] leading-[0.9rem] font-black tracking-[0.12em] text-muted-foreground/50 uppercase sm:min-h-0 sm:text-[10px] sm:leading-tight sm:tracking-widest'>
                    {t('users.permissionPage.stats.activeInView')}
                  </div>
                  <div className='mt-0.5 text-lg leading-none font-black tracking-tighter sm:mt-2 sm:text-3xl'>
                    {String(activeUsers)}
                  </div>
                </div>
                <ShieldCheck className='size-3 shrink-0 text-emerald-600/70 sm:size-4' />
              </div>
            </div>

            <div className='min-w-0 rounded-[20px] border border-dashed border-muted/50 bg-muted/5 p-2.5 sm:rounded-[24px] sm:p-4'>
              <div className='flex items-start justify-between gap-1.5 sm:gap-3'>
                <div className='min-w-0'>
                  <div className='min-h-7 text-[7px] leading-[0.9rem] font-black tracking-[0.12em] text-muted-foreground/50 uppercase sm:min-h-0 sm:text-[10px] sm:leading-tight sm:tracking-widest'>
                    {t('users.permissionPage.stats.protectedInView')}
                  </div>
                  <div className='mt-0.5 text-lg leading-none font-black tracking-tighter sm:mt-2 sm:text-3xl'>
                    {String(protectedUsers)}
                  </div>
                </div>
                <ShieldPlus className='size-3 shrink-0 text-amber-600/70 sm:size-4' />
              </div>
            </div>
          </div>

          <div className='rounded-[20px] border border-dashed border-muted/50 bg-muted/5 p-3 sm:rounded-[24px] sm:p-4'>
            <div className='text-xs font-black tracking-tighter italic sm:text-sm'>
              {t('users.permissionPage.guideTitle')}
            </div>
            <p className='mt-1 text-[8px] font-black tracking-widest text-muted-foreground/60 uppercase sm:text-[9px]'>
              {t('users.permissionPage.guideDescription')}
            </p>
            <div className='mt-3 space-y-2 sm:mt-4 sm:space-y-3'>
              <div className='flex items-start gap-2.5 sm:gap-3'>
                <div className='flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary sm:size-6 sm:text-[10px]'>
                  1
                </div>
                <p className='text-xs leading-5 sm:text-sm sm:leading-normal'>
                  {t('users.permissionPage.steps.filter')}
                </p>
              </div>
              <div className='flex items-start gap-2.5 sm:gap-3'>
                <div className='flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary sm:size-6 sm:text-[10px]'>
                  2
                </div>
                <p className='text-xs leading-5 sm:text-sm sm:leading-normal'>
                  {t('users.permissionPage.steps.open')}
                </p>
              </div>
              <div className='flex items-start gap-2.5 sm:gap-3'>
                <div className='flex size-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary sm:size-6 sm:text-[10px]'>
                  3
                </div>
                <p className='text-xs leading-5 sm:text-sm sm:leading-normal'>
                  {t('users.permissionPage.steps.save')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='px-1'>
          <h3 className='text-sm font-black tracking-tighter uppercase italic'>
            {t('users.permissionPage.listTitle')}
          </h3>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
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
          showSelection
          leadingViewSlot={
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.userPermission}
              targetName={t('users.permissionPage.title')}
              label={t('common.audit.permissionTrigger')}
              className='h-11 w-full justify-center px-3 md:h-9 md:w-auto md:px-4'
            />
          }
        />
      </div>
      <UsersDialogs />
    </UsersProvider>
  )
}
