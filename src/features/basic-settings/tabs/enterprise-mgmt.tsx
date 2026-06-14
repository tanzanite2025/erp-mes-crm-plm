import { useCallback, useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForbiddenState } from '@/components/forbidden-state'
import { EnterpriseService } from '../services/enterprise-service'

const logger = createLogger('EnterpriseMgmt')

export function EnterpriseMgmt() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const config = await EnterpriseService.getConfig()
      if (config) {
        setName(config.name || '')
        setPlan(config.plan || '')
      }
    } catch (loadError) {
      setError(loadError)
      logger.error('Failed to load config', loadError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      void loadConfig()
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [loadConfig])

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await EnterpriseService.saveConfig({ name, plan })
      toast.success(t('basicSettings.enterprisePage.toasts.success'), {
        description: t('basicSettings.enterprisePage.toasts.successDesc'),
      })
      // 触发侧边栏重新加载的自定义事件
      window.dispatchEvent(new CustomEvent('xdfc_enterprise_config_updated'))
    } catch (error) {
      // api-client 会弹出具体错误，这里做通用提示
      logger.error('Save failed', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex h-64 animate-in flex-col items-center justify-center gap-3 duration-500 fade-in'>
        <Loader2 className='size-8 animate-spin text-primary opacity-60' />
        <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex max-w-2xl animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-4 md:flex-row md:items-center'>
        <div className='flex-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
          <h2 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('basicSettings.enterprisePage.title')}
          </h2>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
            {t('basicSettings.enterprisePage.subtitle')}
          </p>
        </div>
      </div>

      <div className='space-y-8 rounded-[32px] border border-dashed bg-muted/5 p-4 md:p-8'>
        <div className='grid gap-8'>
          <div className='space-y-3'>
            <Label
              htmlFor='enterprise-name'
              className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'
            >
              {t('basicSettings.enterprisePage.form.nameLabel')}
            </Label>
            <Input
              id='enterprise-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t(
                'basicSettings.enterprisePage.form.namePlaceholder'
              )}
              className='h-12 rounded-2xl border-none bg-background px-4 text-sm font-bold shadow-inner transition-all outline-none focus:ring-2 focus:ring-primary/20'
            />
          </div>
          <div className='space-y-3'>
            <Label
              htmlFor='enterprise-plan'
              className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'
            >
              {t('basicSettings.enterprisePage.form.planLabel')}
            </Label>
            <Input
              id='enterprise-plan'
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder={t(
                'basicSettings.enterprisePage.form.planPlaceholder'
              )}
              className='h-12 rounded-2xl border-none bg-background px-4 text-sm font-bold shadow-inner transition-all outline-none focus:ring-2 focus:ring-primary/20'
            />
          </div>
        </div>

        <div className='flex justify-end border-t border-dashed pt-6'>
          <Button
            onClick={handleSave}
            disabled={saving}
            className='h-11 rounded-full px-10 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95'
          >
            {saving ? (
              <Loader2 className='mr-2 size-3.5 animate-spin' />
            ) : (
              <Save className='mr-2 size-3.5' />
            )}
            {saving
              ? t('basicSettings.enterprisePage.form.saving')
              : t('basicSettings.enterprisePage.form.saveButton')}
          </Button>
        </div>
      </div>

      <div className='rounded-[32px] border border-dashed border-primary/20 bg-primary/5 p-6'>
        <p className='text-[10px] leading-relaxed font-black tracking-widest text-primary/60 uppercase italic'>
          {t('basicSettings.enterprisePage.syncNotice')}
        </p>
      </div>
    </div>
  )
}
