import { useCallback, useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, RefreshCcw } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isForbiddenError } from '@/lib/error-status'
import { toast } from 'sonner'
import { systemConfigService, type SystemConfig } from '../services/system-config-service'
import { cn } from '@/lib/utils'

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
      const pwdConfig = data.find(config => config.key === TOPOLOGY_AUTH_KEY)
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
      const targetConfig = configs.find(config => config.key === TOPOLOGY_AUTH_KEY) || {
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
      <div className='p-12 text-center text-muted-foreground animate-pulse'>
        {t('basicSettings.securityPage.loading')}
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black italic tracking-tighter uppercase'>
            {t('basicSettings.securityPage.title')}
          </h2>
          <p className='text-[10px] text-muted-foreground font-black tracking-widest uppercase opacity-60'>
            {t('basicSettings.securityPage.subtitle')}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void loadConfigs()}
            className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest border-dashed hover:bg-primary/5 hover:text-primary transition-all'
          >
            <RefreshCcw className={cn('size-3 mr-2', isLoading && 'animate-spin')} />
            {t('common.actions.refresh') || 'REFRESH'}
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
        <Card className='rounded-[24px] border-dashed shadow-none bg-transparent overflow-hidden'>
          <CardHeader className='pb-4'>
            <CardTitle className='text-sm font-black tracking-tighter italic flex items-center gap-2'>
              <Lock className='w-4 h-4' />
              {t('basicSettings.securityPage.authCardTitle')}
            </CardTitle>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest opacity-50'>
              {t('basicSettings.securityPage.authCardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-60'>
                {t('basicSettings.securityPage.currentPassword')}
              </Label>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder={t('basicSettings.securityPage.placeholder')}
                  className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-center tracking-[0.5em] text-lg'
                />
                <Button
                  variant='ghost'
                  size='icon'
                  className='absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </Button>
              </div>
              <p className='text-[8px] font-mono opacity-40 text-rose-500'>
                {t('basicSettings.securityPage.warning')}
              </p>
            </div>

            <Button
              onClick={handleUpdatePassword}
              disabled={isSaving}
              className='w-full rounded-full h-11 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20'
            >
              {isSaving
                ? t('basicSettings.securityPage.actions.saving')
                : t('basicSettings.securityPage.actions.apply')}
            </Button>
          </CardContent>
        </Card>

        <Card className='rounded-[24px] shadow-none bg-muted/5'>
          <CardHeader>
            <CardTitle className='text-sm font-black tracking-tighter italic'>
              {t('basicSettings.securityPage.auditTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex flex-col gap-2 p-4 rounded-2xl bg-white/50 border border-dashed text-[10px] font-black tracking-tight leading-relaxed'>
              <p className='text-primary/70'>{t('basicSettings.securityPage.auditItems.first')}</p>
              <p className='text-primary/70'>{t('basicSettings.securityPage.auditItems.second')}</p>
              <p className='text-primary/70'>{t('basicSettings.securityPage.auditItems.third')}</p>
            </div>
            <div className='h-1 px-1 mt-4'>
              <div className='h-full bg-primary/20 rounded-full overflow-hidden'>
                <div className='h-full bg-primary w-2/3' />
              </div>
            </div>
            <p className='text-[8px] font-mono opacity-60 text-right uppercase tracking-widest'>
              {t('basicSettings.securityPage.version')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
