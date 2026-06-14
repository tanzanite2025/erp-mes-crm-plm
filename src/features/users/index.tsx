import { ShieldCheck } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { type NavigateFn } from '@/hooks/use-table-url-state'
import { ForbiddenState } from '@/components/forbidden-state'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useUsersQuery } from './hooks/use-users'

type UsersSearchValue = string | number | boolean | null | undefined | string[]
type UsersSearch = Record<string, UsersSearchValue>

export interface UsersProps {
  search: UsersSearch
  navigate: NavigateFn
  showLayout?: boolean
}

export function Users({ search, navigate, showLayout = true }: UsersProps) {
  const { t } = useLanguage()
  const { data: userPage, isLoading, error } = useUsersQuery(search)

  if (isForbiddenError(error)) {
    return <ForbiddenState fullHeight={showLayout} />
  }

  if (error) {
    return (
      <div className='p-6 text-destructive'>{t('users.layout.errorLoad')}</div>
    )
  }

  const content = (
    <>
      {!showLayout && (
        <div className='mb-6 flex flex-col gap-1 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-4 sm:rounded-[32px] sm:p-6'>
          <div className='flex items-center gap-2 text-primary'>
            <ShieldCheck className='size-4' />
            <h3 className='text-base font-black tracking-tighter uppercase italic sm:text-lg'>
              {t('users.layout.title')}
            </h3>
          </div>
          <p className='text-[8px] font-black tracking-widest text-muted-foreground uppercase opacity-60 sm:text-[9px]'>
            {t('users.layout.subtitle')}
          </p>
        </div>
      )}
      <div className='flex flex-col items-start justify-between gap-4 px-1 sm:flex-row sm:items-end'>
        <div className={cn(showLayout ? '' : 'hidden')}>
          <h2 className='text-xl font-bold tracking-tight sm:text-2xl'>
            {t('users.layout.listTitle')}
          </h2>
          <p className='text-sm text-muted-foreground'>
            {t('users.layout.listSubtitle')}
          </p>
        </div>
        <div className='w-full sm:w-auto'>
          <UsersPrimaryButtons />
        </div>
      </div>
      <UsersTable
        data={userPage?.items ?? []}
        total={userPage?.total ?? 0}
        search={search}
        navigate={navigate}
        isLoading={isLoading}
      />
    </>
  )

  return (
    <UsersProvider>
      {showLayout ? (
        <>
          <Header fixed showConfigDrawer>
            <div className='flex items-center gap-2'>
              <span className='text-sm text-muted-foreground/50'>/</span>
              <h2 className='text-sm font-medium text-foreground/80'>
                {t('users.layout.title')}
              </h2>
            </div>
          </Header>
          <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>{content}</Main>
        </>
      ) : (
        <div className='flex flex-1 animate-in flex-col gap-8 duration-700 fade-in'>
          {content}
        </div>
      )}
      <UsersDialogs />
    </UsersProvider>
  )
}
