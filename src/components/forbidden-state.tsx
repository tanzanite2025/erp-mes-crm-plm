import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import { useAuthStore } from '@/stores/auth-store'

type ForbiddenStateProps = {
  fullHeight?: boolean
}

export function ForbiddenState({ fullHeight = false }: ForbiddenStateProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { history } = useRouter()
  const { reset } = useAuthStore()

  const handleRelogin = () => {
    reset()
    navigate({
      to: '/sign-in',
      search: { redirect: '/' },
      replace: true,
    })
  }

  return (
    <div className={fullHeight ? 'flex-1 h-full' : 'w-full'}>
      <div
        className={
          fullHeight
            ? 'm-auto flex h-full w-full flex-col items-center justify-center gap-2 py-12'
            : 'flex w-full flex-col items-center justify-center gap-2 rounded-[40px] border border-border/50 bg-muted/10 px-6 py-16 text-center'
        }
      >
        <h1 className='text-[7rem] leading-tight font-bold'>{t('errors.forbidden.title')}</h1>
        <span className='font-medium'>{t('errors.forbidden.subtitle')}</span>
        <p className='text-center text-muted-foreground'>
          {t('errors.forbidden.description')}
          <br />
          {t('errors.forbidden.cachedSessionHint')}
        </p>
        <div className='mt-6 flex flex-wrap justify-center gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('errors.forbidden.goBack')}
          </Button>
          <Button variant='secondary' onClick={handleRelogin}>
            {t('errors.forbidden.relogin')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>{t('errors.forbidden.backHome')}</Button>
        </div>
      </div>
    </div>
  )
}
