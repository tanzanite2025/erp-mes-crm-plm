import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForbiddenState } from '@/components/forbidden-state'
import {
  systemConfigService,
  type SystemConfig,
} from '../services/system-config-service'

const TOPOLOGY_AUTH_KEY = 'topology_auth_password'
const TOPOLOGY_AUTH_LABEL = '产线拓扑操作授权码'

export function SecuritySettings() {
  const { t } = useLanguage()
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [authPassword, setAuthPassword] = useState('')
  const [error, setError] = useState<unknown>(null)

  const loadConfigs = useCallback(async () => {
    setIsLoading(true)
    try {
      setError(null)
      const data = await systemConfigService.getConfigs()
      setConfigs(data)
      const pwdConfig = data.find((config) => config.key === TOPOLOGY_AUTH_KEY)
      if (pwdConfig) {
        setAuthPassword(pwdConfig.value)
      }
    } catch (loadError) {
      setError(loadError)
      toast.error(t('basicSettings.securityPage.toasts.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadConfigs()
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [loadConfigs])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleUpdatePassword = async () => {
    if (authPassword.length < 4) {
      toast.error(t('basicSettings.securityPage.toasts.minLength'))
      return
    }

    setIsSaving(true)
    try {
      const targetConfig = configs.find(
        (config) => config.key === TOPOLOGY_AUTH_KEY
      ) || {
        key: TOPOLOGY_AUTH_KEY,
        value: authPassword,
        label: TOPOLOGY_AUTH_LABEL,
      }

      await systemConfigService.updateConfig({
        ...targetConfig,
        value: authPassword,
      })

      toast.success(t('basicSettings.securityPage.toasts.saved'))
      await loadConfigs()
    } catch (_error) {
      toast.error(t('basicSettings.securityPage.toasts.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className='animate-pulse p-12 text-center text-muted-foreground'>
        {t('basicSettings.securityPage.loading')}
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('basicSettings.securityPage.title')}
          </h2>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('basicSettings.securityPage.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void loadConfigs()}
            className='h-9 rounded-full border-dashed text-[10px] font-black tracking-widest uppercase transition-all hover:bg-primary/5 hover:text-primary'
          >
            <RefreshCcw
              className={cn('mr-2 size-3', isLoading && 'animate-spin')}
            />
            {t('common.actions.refresh') || 'REFRESH'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        <Card className='overflow-hidden rounded-[24px] border-dashed bg-transparent shadow-none'>
          <CardHeader className='pb-4'>
            <CardTitle className='flex items-center gap-2 text-sm font-black tracking-tighter italic'>
              <Lock className='h-4 w-4' />
              {t('basicSettings.securityPage.authCardTitle')}
            </CardTitle>
            <CardDescription className='text-[10px] font-black tracking-widest uppercase opacity-50'>
              {t('basicSettings.securityPage.authCardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest uppercase opacity-60'>
                {t('basicSettings.securityPage.currentPassword')}
              </Label>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={t('basicSettings.securityPage.placeholder')}
                  className='h-12 rounded-2xl border-none bg-muted/50 text-center font-mono text-lg tracking-[0.5em]'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute top-1/2 right-2 h-8 w-8 -translate-y-1/2 rounded-xl'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </Button>
              </div>
              <p className='font-mono text-[8px] text-rose-500 opacity-40'>
                {t('basicSettings.securityPage.warning')}
              </p>
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={isSaving}
              className='h-11 w-full rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20'
            >
              {isSaving
                ? t('basicSettings.securityPage.actions.saving')
                : t('basicSettings.securityPage.actions.apply')}
            </Button>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] bg-muted/5 shadow-none'>
          <CardHeader>
            <CardTitle className='text-sm font-black tracking-tighter italic'>
              {t('basicSettings.securityPage.auditTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col gap-2 rounded-2xl border border-dashed bg-white/50 p-4 text-[10px] leading-relaxed font-black tracking-tight'>
              <p className='text-primary/70'>
                {t('basicSettings.securityPage.auditItems.first')}
              </p>
              <p className='text-primary/70'>
                {t('basicSettings.securityPage.auditItems.second')}
              </p>
              <p className='text-primary/70'>
                {t('basicSettings.securityPage.auditItems.third')}
              </p>
            </div>
            <div className='mt-4 h-1 px-1'>
              <div className='h-full overflow-hidden rounded-full bg-primary/20'>
                <div className='h-full w-2/3 bg-primary' />
              </div>
            </div>
            <p className='text-right font-mono text-[8px] tracking-widest uppercase opacity-60'>
              {t('basicSettings.securityPage.version')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
