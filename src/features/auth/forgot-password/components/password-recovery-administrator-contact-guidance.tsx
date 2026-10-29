import { Link } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'

export function PasswordRecoveryAdministratorContactGuidance() {
  const { t } = useLanguage()
  return (
    <div className='grid gap-4'>
      <p className='text-sm text-muted-foreground'>
        {t('common.auth.passwordRecovery.explanation')}
      </p>
      <Button asChild>
        <Link to='/sign-in'>
          {t('common.auth.passwordRecovery.backToSignIn')}
        </Link>
      </Button>
    </div>
  )
}
