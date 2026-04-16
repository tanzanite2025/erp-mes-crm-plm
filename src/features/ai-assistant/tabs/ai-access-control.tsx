import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ForbiddenState } from '@/components/forbidden-state'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { aiPolicyService } from '@/features/ai-assistant/services/ai-policy-service'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'

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
  const { permissions, isInitialLoading } = useRoles()
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG)
  const [pendingApi, setPendingApi] = useState<AiConfig['api']>(DEFAULT_CONFIG.api)
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
          description: t('aiAssistant.accessControl.api.policySuccessDescription'),
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
      <div className='flex items-center justify-center h-64 scale-in duration-500'>
        <Loader2 className='size-8 animate-spin text-indigo-400' />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6 p-6 animate-in fade-in duration-700'>
      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h2 className='text-base md:text-xl font-black text-slate-800 italic uppercase tracking-tighter'>
            {t('aiAssistant.accessControl.title')}
          </h2>
          <p className='text-[8px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none'>
            {t('aiAssistant.accessControl.subtitle')}
          </p>
        </div>
        <div className='p-2 md:p-3 rounded-xl md:rounded-2xl bg-indigo-50 border border-indigo-100 shrink-0'>
          <Cpu className='size-4 md:size-5 text-indigo-600' />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
        <Card className='rounded-2xl md:rounded-[32px] border-dashed border-2 border-indigo-100 bg-indigo-50/10 shadow-none overflow-hidden'>
          <CardHeader className='border-b border-dashed border-indigo-100 flex flex-row items-center justify-between p-4 md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] md:text-sm font-black italic uppercase tracking-tight'>
                {t('aiAssistant.accessControl.global.title')}
              </CardTitle>
              <CardDescription className='text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-indigo-400'>
                {t('aiAssistant.accessControl.global.description')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='p-4 md:pt-6'>
            <div className='flex items-center justify-between p-4 rounded-2xl bg-white border border-indigo-50 shadow-sm gap-4'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'size-10 rounded-xl flex items-center justify-center transition-colors',
                    config.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
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
                  <p className='text-[10px] text-slate-400 font-medium'>
                    {t('aiAssistant.accessControl.global.hint')}
                  </p>
                </div>
              </div>
              <Button
                variant={config.enabled ? 'destructive' : 'default'}
                className='rounded-full h-9 font-black text-[10px] uppercase tracking-widest'
                onClick={() => handleSave({ ...config, enabled: !config.enabled })}
              >
                {config.enabled
                  ? t('aiAssistant.accessControl.global.disable')
                  : t('aiAssistant.accessControl.global.enable')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-2xl md:rounded-[32px] border-dashed border-2 border-slate-100 bg-slate-50/30 shadow-none overflow-hidden'>
          <CardHeader className='border-b border-dashed border-slate-100 p-4 md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] md:text-sm font-black italic uppercase tracking-tight'>
                {t('aiAssistant.accessControl.roles.title')}
              </CardTitle>
              <CardDescription className='text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-slate-400'>
                {t('aiAssistant.accessControl.roles.description')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='p-4 md:pt-6'>
            {isInitialLoading ? (
              <div className='flex items-center justify-center py-10'>
                <Loader2 className='size-6 animate-spin text-slate-300' />
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-3'>
                {permissions.map((permission) => {
                  const selected = config.allowedPermissions.includes(String(permission.id))
                  return (
                    <div
                      key={permission.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer',
                        selected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                          : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'
                      )}
                      onClick={() => {
                        const nextPermissions = selected
                          ? config.allowedPermissions.filter((id) => id !== String(permission.id))
                          : [...config.allowedPermissions, String(permission.id)]
                        handleSave({ ...config, allowedPermissions: nextPermissions })
                      }}
                    >
                      <div className='flex items-center gap-2 overflow-hidden'>
                        {selected ? (
                          <ShieldCheck className='size-3 shrink-0' />
                        ) : (
                          <UserCheck className='size-3 shrink-0 opacity-40' />
                        )}
                        <span className='text-[11px] font-bold truncate'>{permission.label}</span>
                      </div>
                      <div
                        className={cn(
                          'size-4 rounded-full border flex items-center justify-center',
                          selected ? 'bg-white border-white' : 'border-slate-200'
                        )}
                      >
                        {selected && <div className='size-1.5 rounded-full bg-indigo-600' />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='md:col-span-2 rounded-2xl md:rounded-[32px] border-dashed border-2 border-indigo-100 bg-indigo-50/5 shadow-none overflow-hidden'>
          <CardHeader className='border-b border-dashed border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 md:p-6'>
            <div className='space-y-1'>
              <CardTitle className='text-[11px] md:text-sm font-black italic uppercase tracking-tight'>
                {t('aiAssistant.accessControl.api.title')}
              </CardTitle>
              <CardDescription className='text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-indigo-400'>
                {t('aiAssistant.accessControl.api.description')}
              </CardDescription>
            </div>
            <Button
              disabled={isSaving}
              className='w-full md:w-auto rounded-full h-10 md:h-11 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100'
              onClick={saveApiConfig}
            >
              {isSaving ? <Loader2 className='size-3 animate-spin mr-2' /> : <Save className='size-3 mr-2' />}
              {t('aiAssistant.accessControl.api.save')}
            </Button>
          </CardHeader>
          <CardContent className='p-4 md:pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2'>
                <Zap className='size-3' />
                {t('aiAssistant.accessControl.api.provider')}
              </Label>
              <Select
                value={pendingApi.provider}
                onValueChange={(value: AiConfig['api']['provider']) =>
                  setPendingApi((prev) => ({ ...prev, provider: value }))
                }
              >
                <SelectTrigger className='rounded-xl h-11 border-indigo-100 bg-white border-2'>
                  <SelectValue placeholder={t('aiAssistant.accessControl.api.providerPlaceholder')} />
                </SelectTrigger>
                <SelectContent className='rounded-xl border-indigo-100'>
                  <SelectItem value='gemini'>{t('aiAssistant.accessControl.api.providerGemini')}</SelectItem>
                  <SelectItem value='openai'>{t('aiAssistant.accessControl.api.providerOpenAI')}</SelectItem>
                  <SelectItem value='custom'>{t('aiAssistant.accessControl.api.providerCustom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2'>
                <Cpu className='size-3' />
                {t('aiAssistant.accessControl.api.model')}
              </Label>
              <Input
                placeholder={pendingApi.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
                className='rounded-xl h-11 border-indigo-100 bg-white border-2 focus-visible:ring-indigo-200'
                value={pendingApi.model}
                onChange={(e) => setPendingApi((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>

            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2'>
                <KeyRound className='size-3' />
                {t('aiAssistant.accessControl.api.apiKey')}
              </Label>
              <Input
                type='password'
                placeholder='AI_****************'
                className='rounded-xl h-11 bg-white border-2 border-indigo-100 transition-all focus-visible:ring-indigo-200'
                value={pendingApi.apiKey}
                onChange={(e) => setPendingApi((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
              {isMiniMax && (
                <div className='p-2 rounded-lg bg-amber-50/50 border border-amber-100 space-y-1 animate-in slide-in-from-top-1'>
                  <p className='text-[9px] font-black text-amber-700 uppercase leading-none'>
                    {t('aiAssistant.accessControl.api.minimaxNoteTitle')}
                  </p>
                  <p className='text-[8px] text-amber-600 font-medium leading-tight'>
                    {t('aiAssistant.accessControl.api.minimaxNoteBody')}
                  </p>
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2'>
                <Globe className='size-3' />
                {t('aiAssistant.accessControl.api.baseUrl')}
              </Label>
              <Input
                placeholder='https://api.example.com'
                className='rounded-xl h-11 border-indigo-100 bg-white border-2 focus-visible:ring-indigo-200'
                value={pendingApi.baseUrl}
                onChange={(e) => setPendingApi((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </div>

            <div className='space-y-2'>
              <Label
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors',
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
                  'rounded-xl h-11 bg-white border-2 transition-all focus-visible:ring-indigo-200',
                  isMiniMax && !pendingApi.groupId?.trim()
                    ? 'border-rose-400 ring-4 ring-rose-50'
                    : 'border-indigo-100'
                )}
                value={pendingApi.groupId || ''}
                onChange={(e) => setPendingApi((prev) => ({ ...prev, groupId: e.target.value }))}
              />
              {isMiniMax && !pendingApi.groupId?.trim() && (
                <p className='text-[8px] font-black text-rose-500 animate-pulse tracking-tighter'>
                  {t('aiAssistant.accessControl.api.groupIdAlert')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-4 p-4 rounded-[24px] border border-dashed border-amber-200 bg-amber-50/50 flex items-start gap-4'>
        <ShieldAlert className='size-5 text-amber-500 mt-1' />
        <div className='space-y-1'>
          <p className='text-xs font-black text-amber-700 uppercase'>
            {t('aiAssistant.accessControl.governance.title')}
          </p>
          <p className='text-[10px] text-amber-600 leading-relaxed font-medium'>
            {t('aiAssistant.accessControl.governance.body')}
          </p>
        </div>
      </div>
    </div>
  )
}
