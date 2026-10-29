import { useLanguage } from '@/context/language-provider'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { PasswordRecoveryAdministratorContactGuidance } from './components/password-recovery-administrator-contact-guidance'

export function ForgotPassword() {
  const { t } = useLanguage()
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('common.auth.passwordRecovery.title')}
          </CardTitle>
          <CardDescription>
            {t('common.auth.passwordRecovery.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordRecoveryAdministratorContactGuidance />
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
