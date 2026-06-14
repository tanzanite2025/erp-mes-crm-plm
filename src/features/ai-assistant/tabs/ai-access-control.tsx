import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Cpu,
  Globe,
  KeyRound,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ForbiddenState } from '@/components/forbidden-state'
import { aiPolicyService } from '@/features/ai-assistant/services/ai-policy-service'
import { getDefaultPermissions } from '@/features/authz/data/default-permission-queries'

interface AiConfig {
  enabled: boolean
  allowedPermissions: string[]
  api: {
    provider: 'gemini' | 'openai' | 'custom'
    apiKey: string
    baseUrl: string
    model: string
    groupId?: string
  }
}

const DEFAULT_CONFIG: AiConfig = {
  enabled: true,
  allowedPermissions: [],
  api: {
    provider: 'gemini',
    apiKey: '',
    baseUrl: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
    groupId: '',
  },
}

const logger = createLogger('AiAccessControl')

export function AiAccessControl() {
  const { t } = useLanguage()
  const permissions = useMemo(() => getDefaultPermissions(), [])
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG)
  const [pendingApi, setPendingApi] = useState<AiConfig['api']>(
    DEFAULT_CONFIG.api
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true)
      try {
        setError(null)
        const remote = await aiPolicyService.getPolicy()

        const merged = {
          ...DEFAULT_CONFIG,
          ...remote,
          api: { ...DEFAULT_CONFIG.api, ...(remote?.api || {}) },
        }

        setConfig(merged)
        setPendingApi(merged.api)
      } catch (err) {
        setError(err)
        logger.error('Failed to load AI policy', err)
        // api-client 会处理熔断或错误提示
      } finally {
        setIsLoading(false)
      }
    }

    void loadConfig()
  }, [])

  const isMiniMax =
    pendingApi.baseUrl.toLowerCase().includes('minimaxi.com') ||
    pendingApi.baseUrl.toLowerCase().includes('minimax.io')

  const handleSave = async (newConfig: AiConfig, quiet = false) => {
    setConfig(newConfig)
    try {
      await aiPolicyService.savePolicy(newConfig)
      window.dispatchEvent(new CustomEvent('xdfc_ai_config_updated'))

      if (!quiet) {
        toast.success(t('aiAssistant.accessControl.api.policySuccess'), {
          description: t(
            'aiAssistant.accessControl.api.policySuccessDescription'
          ),
          icon: <ShieldCheck className='size-4 text-emerald-500' />,
        })
      }
    } catch (err) {
      logger.error('Save failed', err)
    }
  }

  const saveApiConfig = async () => {
    setIsSaving(true)
    try {
      const newConfig = { ...config, api: pendingApi }
      await handleSave(newConfig, true)
      toast.success(t('aiAssistant.accessControl.api.saveSuccess'), {
        description: t('aiAssistant.accessControl.api.saveSuccessDescription', {
          provider: pendingApi.provider.toUpperCase(),
        }),
        icon: <CheckCircle2 className='size-4 text-indigo-500' />,
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='scale-in flex h-64 items-center justify-center duration-500'>
        <Loader2 className='size-8 animate-spin text-indigo-400' />
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-6 p-6 duration-700 fade-in'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h2 className='text-base font-black tracking-tighter text-slate-800 uppercase italic md:text-xl'>
            {t('aiAssistant.accessControl.title')}
          </h2>
          <p className='text-[8px] leading-none font-black tracking-widest text-indigo-500 uppercase md:text-[10px]'>
            {t('aiAssistant.accessControl.subtitle')}
          </p>
        </div>
        <div className='shrink-0 rounded-xl border border-indigo-100 bg-indigo-50 p-2 md:rounded-2xl md:p-3'>
          <Cpu className='size-4 text-indigo-600 md:size-5' />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6'>
        <Card className='overflow-hidden rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/10 shadow-none md:rounded-[32px]'>
          <CardHeader className='flex flex-row items-center justify-between border-b border-dashed border-indigo-100 p-4 md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
                {t('aiAssistant.accessControl.global.title')}
              </CardTitle>
              <CardDescription className='text-[8px] font-bold tracking-widest text-indigo-400 uppercase md:text-[9px]'>
                {t('aiAssistant.accessControl.global.description')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='p-4 md:pt-6'>
            <div className='flex items-center justify-between gap-4 rounded-2xl border border-indigo-50 bg-white p-4 shadow-sm'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl transition-colors',
                    config.enabled
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400'
                  )}
                >
                  <Sparkles className='size-5' />
                </div>
                <div>
                  <p className='text-sm font-bold text-slate-700'>
                    {config.enabled
                      ? t('aiAssistant.accessControl.global.enabledTitle')
                      : t('aiAssistant.accessControl.global.disabledTitle')}
                  </p>
                  <p className='text-[10px] font-medium text-slate-400'>
                    {t('aiAssistant.accessControl.global.hint')}
                  </p>
                </div>
              </div>
              <Button
                variant={config.enabled ? 'destructive' : 'default'}
                className='h-9 rounded-full text-[10px] font-black tracking-widest uppercase'
                onClick={() =>
                  handleSave({ ...config, enabled: !config.enabled })
                }
              >
                {config.enabled
                  ? t('aiAssistant.accessControl.global.disable')
                  : t('aiAssistant.accessControl.global.enable')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='overflow-hidden rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/30 shadow-none md:rounded-[32px]'>
          <CardHeader className='border-b border-dashed border-slate-100 p-4 md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
                {t('aiAssistant.accessControl.permissions.title')}
              </CardTitle>
              <CardDescription className='text-[8px] font-bold tracking-widest text-slate-400 uppercase md:text-[9px]'>
                {t('aiAssistant.accessControl.permissions.description')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='p-4 md:pt-6'>
            <div className='grid grid-cols-2 gap-3'>
              {permissions.map((permission) => {
                const selected = config.allowedPermissions.includes(
                  String(permission.id)
                )
                return (
                  <div
                    key={permission.id}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition-all',
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-indigo-200'
                    )}
                    onClick={() => {
                      const nextPermissions = selected
                        ? config.allowedPermissions.filter(
                            (id) => id !== String(permission.id)
                          )
                        : [...config.allowedPermissions, String(permission.id)]
                      handleSave({
                        ...config,
                        allowedPermissions: nextPermissions,
                      })
                    }}
                  >
                    <div className='flex items-center gap-2 overflow-hidden'>
                      {selected ? (
                        <ShieldCheck className='size-3 shrink-0' />
                      ) : (
                        <UserCheck className='size-3 shrink-0 opacity-40' />
                      )}
                      <span className='truncate text-[11px] font-bold'>
                        {permission.label}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'flex size-4 items-center justify-center rounded-full border',
                        selected ? 'border-white bg-white' : 'border-slate-200'
                      )}
                    >
                      {selected && (
                        <div className='size-1.5 rounded-full bg-indigo-600' />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card className='overflow-hidden rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/5 shadow-none md:col-span-2 md:rounded-[32px]'>
          <CardHeader className='flex flex-col items-start justify-between gap-4 border-b border-dashed border-indigo-100 p-4 md:flex-row md:items-center md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
                {t('aiAssistant.accessControl.api.title')}
              </CardTitle>
              <CardDescription className='text-[8px] font-bold tracking-widest text-indigo-400 uppercase md:text-[9px]'>
                {t('aiAssistant.accessControl.api.description')}
              </CardDescription>
            </div>
            <Button
              disabled={isSaving}
              className='h-10 w-full rounded-full px-6 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-indigo-100 md:h-11 md:w-auto'
              onClick={saveApiConfig}
            >
              {isSaving ? (
                <Loader2 className='mr-2 size-3 animate-spin' />
              ) : (
                <Save className='mr-2 size-3' />
              )}
              {t('aiAssistant.accessControl.api.save')}
            </Button>
          </CardHeader>
          <CardContent className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:gap-6 md:pt-6 lg:grid-cols-4'>
            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
                <Zap className='size-3' />
                {t('aiAssistant.accessControl.api.provider')}
              </Label>
              <Select
                value={pendingApi.provider}
                onValueChange={(value: AiConfig['api']['provider']) =>
                  setPendingApi((prev) => ({ ...prev, provider: value }))
                }
              >
                <SelectTrigger className='h-11 rounded-xl border-2 border-indigo-100 bg-white'>
                  <SelectValue
                    placeholder={t(
                      'aiAssistant.accessControl.api.providerPlaceholder'
                    )}
                  />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-indigo-100'>
                  <SelectItem value='gemini'>
                    {t('aiAssistant.accessControl.api.providerGemini')}
                  </SelectItem>
                  <SelectItem value='openai'>
                    {t('aiAssistant.accessControl.api.providerOpenAI')}
                  </SelectItem>
                  <SelectItem value='custom'>
                    {t('aiAssistant.accessControl.api.providerCustom')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
                <Cpu className='size-3' />
                {t('aiAssistant.accessControl.api.model')}
              </Label>
              <Input
                placeholder={
                  pendingApi.provider === 'gemini'
                    ? 'gemini-1.5-flash'
                    : 'gpt-4o-mini'
                }
                className='h-11 rounded-xl border-2 border-indigo-100 bg-white focus-visible:ring-indigo-200'
                value={pendingApi.model}
                onChange={(e) =>
                  setPendingApi((prev) => ({ ...prev, model: e.target.value }))
                }
              />
            </div>

            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
                <KeyRound className='size-3' />
                {t('aiAssistant.accessControl.api.apiKey')}
              </Label>
              <Input
                type='password'
                placeholder='AI_****************'
                className='h-11 rounded-xl border-2 border-indigo-100 bg-white transition-all focus-visible:ring-indigo-200'
                value={pendingApi.apiKey}
                onChange={(e) =>
                  setPendingApi((prev) => ({ ...prev, apiKey: e.target.value }))
                }
              />
              {isMiniMax && (
                <div className='animate-in space-y-1 rounded-lg border border-amber-100 bg-amber-50/50 p-2 slide-in-from-top-1'>
                  <p className='text-[9px] leading-none font-black text-amber-700 uppercase'>
                    {t('aiAssistant.accessControl.api.minimaxNoteTitle')}
                  </p>
                  <p className='text-[8px] leading-tight font-medium text-amber-600'>
                    {t('aiAssistant.accessControl.api.minimaxNoteBody')}
                  </p>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
                <Globe className='size-3' />
                {t('aiAssistant.accessControl.api.baseUrl')}
              </Label>
              <Input
                placeholder='https://api.example.com'
                className='h-11 rounded-xl border-2 border-indigo-100 bg-white focus-visible:ring-indigo-200'
                value={pendingApi.baseUrl}
                onChange={(e) =>
                  setPendingApi((prev) => ({
                    ...prev,
                    baseUrl: e.target.value,
                  }))
                }
              />
            </div>

            <div className='space-y-2'>
              <Label
                className={cn(
                  'flex items-center gap-2 text-[10px] font-black tracking-widest uppercase transition-colors',
                  isMiniMax ? 'text-rose-500 opacity-100' : 'opacity-60'
                )}
              >
                <ShieldCheck className='size-3' />
                {isMiniMax
                  ? t('aiAssistant.accessControl.api.groupIdRequired')
                  : t('aiAssistant.accessControl.api.groupIdOptional')}
              </Label>
              <Input
                placeholder='20000****'
                className={cn(
                  'h-11 rounded-xl border-2 bg-white transition-all focus-visible:ring-indigo-200',
                  isMiniMax && !pendingApi.groupId?.trim()
                    ? 'border-rose-400 ring-4 ring-rose-50'
                    : 'border-indigo-100'
                )}
                value={pendingApi.groupId || ''}
                onChange={(e) =>
                  setPendingApi((prev) => ({
                    ...prev,
                    groupId: e.target.value,
                  }))
                }
              />
              {isMiniMax && !pendingApi.groupId?.trim() && (
                <p className='animate-pulse text-[8px] font-black tracking-tighter text-rose-500'>
                  {t('aiAssistant.accessControl.api.groupIdAlert')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-4 flex items-start gap-4 rounded-[24px] border border-dashed border-amber-200 bg-amber-50/50 p-4'>
        <ShieldAlert className='mt-1 size-5 text-amber-500' />
        <div className='space-y-1'>
          <p className='text-xs font-black text-amber-700 uppercase'>
            {t('aiAssistant.accessControl.governance.title')}
          </p>
          <p className='text-[10px] leading-relaxed font-medium text-amber-600'>
            {t('aiAssistant.accessControl.governance.body')}
          </p>
        </div>
      </div>
    </div>
  )
}
