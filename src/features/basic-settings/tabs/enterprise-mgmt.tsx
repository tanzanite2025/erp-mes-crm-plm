import { useCallback, useEffect, useState } from 'react'
import { Image, Loader2, RotateCcw, Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ForbiddenState } from '@/components/forbidden-state'
import {
  DEFAULT_ENTERPRISE_LOGO_URL,
  EnterpriseService,
} from '../services/enterprise-service'

const logger = createLogger('EnterpriseMgmt')
const MAX_ENTERPRISE_LOGO_BYTES = 512 * 1024
const ENTERPRISE_LOGO_TYPES = new Set(['image/png', 'image/jpeg'])

export function EnterpriseMgmt() {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [plan, setPlan] = useState('')
  const [logoUrl, setLogoUrl] = useState(DEFAULT_ENTERPRISE_LOGO_URL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const loadConfig = useCallback(async () => {
    setLoading(true)
    try {
      setError(null)
      const config = await EnterpriseService.getConfig()
      if (config) {
        setName(config.name || '')
        setPlan(config.plan || '')
        setLogoUrl(config.logoUrl || DEFAULT_ENTERPRISE_LOGO_URL)
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
      const savedConfig = await EnterpriseService.saveConfig({
        name,
        plan,
        logoUrl,
      })
      setLogoUrl(savedConfig.logoUrl || DEFAULT_ENTERPRISE_LOGO_URL)
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

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return
    if (!ENTERPRISE_LOGO_TYPES.has(file.type)) {
      toast.error(t('basicSettings.enterprisePage.toasts.logoTypeInvalid'))
      return
    }
    if (file.size <= 0 || file.size > MAX_ENTERPRISE_LOGO_BYTES) {
      toast.error(t('basicSettings.enterprisePage.toasts.logoSizeInvalid'))
      return
    }

    setUploadingLogo(true)
    try {
      const uploaded = await EnterpriseService.uploadLogo(file)
      setLogoUrl(uploaded.logoUrl || DEFAULT_ENTERPRISE_LOGO_URL)
      toast.success(t('basicSettings.enterprisePage.toasts.logoUploaded'))
      window.dispatchEvent(new CustomEvent('xdfc_enterprise_config_updated'))
    } catch (uploadError) {
      logger.error('Logo upload failed', uploadError)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleResetLogo = async () => {
    setSaving(true)
    try {
      const savedConfig = await EnterpriseService.saveConfig({
        name,
        plan,
        logoUrl: DEFAULT_ENTERPRISE_LOGO_URL,
      })
      setLogoUrl(savedConfig.logoUrl || DEFAULT_ENTERPRISE_LOGO_URL)
      toast.success(t('basicSettings.enterprisePage.toasts.logoReset'))
      window.dispatchEvent(new CustomEvent('xdfc_enterprise_config_updated'))
    } catch (resetError) {
      logger.error('Logo reset failed', resetError)
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
          <div className='space-y-3'>
            <Label className='pl-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('basicSettings.enterprisePage.form.logoLabel')}
            </Label>
            <div className='flex flex-col gap-4 rounded-2xl bg-background p-4 shadow-inner sm:flex-row sm:items-center'>
              <div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-muted bg-muted/20'>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={t('basicSettings.enterprisePage.form.logoPreviewAlt')}
                    className='size-full object-contain p-2'
                  />
                ) : (
                  <Image className='size-6 text-muted-foreground/60' />
                )}
              </div>
              <div className='min-w-0 flex-1 space-y-2'>
                <p className='text-[11px] leading-5 font-bold text-muted-foreground'>
                  {t('basicSettings.enterprisePage.form.logoHint')}
                </p>
                <p className='truncate font-mono text-[10px] text-muted-foreground/70'>
                  {logoUrl}
                </p>
              </div>
              <div className='flex shrink-0 flex-col gap-2 sm:flex-row'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={uploadingLogo || saving}
                  className='h-10 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
                  asChild
                >
                  <Label htmlFor='enterprise-logo-upload'>
                    {uploadingLogo ? (
                      <Loader2 className='mr-2 size-3.5 animate-spin' />
                    ) : (
                      <Upload className='mr-2 size-3.5' />
                    )}
                    {t('basicSettings.enterprisePage.form.logoUploadButton')}
                  </Label>
                </Button>
                <Input
                  id='enterprise-logo-upload'
                  type='file'
                  accept='image/png,image/jpeg'
                  className='sr-only'
                  disabled={uploadingLogo || saving}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    void handleLogoUpload(file)
                  }}
                />
                <Button
                  type='button'
                  variant='ghost'
                  disabled={
                    saving ||
                    uploadingLogo ||
                    logoUrl === DEFAULT_ENTERPRISE_LOGO_URL
                  }
                  className='h-10 rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
                  onClick={() => {
                    void handleResetLogo()
                  }}
                >
                  <RotateCcw className='mr-2 size-3.5' />
                  {t('basicSettings.enterprisePage.form.logoResetButton')}
                </Button>
              </div>
            </div>
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
