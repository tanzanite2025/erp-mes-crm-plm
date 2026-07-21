import {
  Cpu,
  Globe,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'
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
import type { AiGatewayConfig } from '../../services/ai-policy-service'

interface AiEngineGatewayCardProps {
  enabled: boolean
  config: AiGatewayConfig
  isSaving: boolean
  onEnabledChange: (enabled: boolean) => void
  onConfigChange: (config: AiGatewayConfig) => void
  onSave: () => void
  className?: string
}

function usesMiniMaxGateway(config: AiGatewayConfig) {
  const baseUrl = config.baseUrl.toLowerCase()
  return baseUrl.includes('minimaxi.com') || baseUrl.includes('minimax.io')
}

export function AiEngineGatewayCard({
  enabled,
  config,
  isSaving,
  onEnabledChange,
  onConfigChange,
  onSave,
  className,
}: AiEngineGatewayCardProps) {
  const { t } = useLanguage()
  const isMiniMax = usesMiniMaxGateway(config)
  const isGroupIdMissing = isMiniMax && !config.groupId?.trim()

  function updateGatewayConfig(fields: Partial<AiGatewayConfig>) {
    onConfigChange({ ...config, ...fields })
  }

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/5 shadow-none md:rounded-[32px]',
        className
      )}
    >
      <CardHeader className='flex flex-col items-start justify-between gap-4 border-b border-dashed border-indigo-100 p-4 sm:flex-row sm:items-center md:p-5'>
        <div className='space-y-1'>
          <CardTitle className='text-[11px] font-black tracking-tight uppercase italic md:text-sm'>
            {t('aiAssistant.accessControl.api.title')}
          </CardTitle>
          <CardDescription className='text-[8px] font-bold tracking-widest text-indigo-400 uppercase md:text-[9px]'>
            {t('aiAssistant.accessControl.api.description')}
          </CardDescription>
        </div>
        <Button
          type='button'
          disabled={isSaving}
          className='h-10 w-full shrink-0 rounded-full px-5 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-indigo-100 sm:w-auto'
          onClick={onSave}
        >
          {isSaving ? (
            <Loader2 className='mr-2 size-3 animate-spin' />
          ) : (
            <Save className='mr-2 size-3' />
          )}
          {t('aiAssistant.accessControl.api.save')}
        </Button>
      </CardHeader>

      <CardContent className='grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-3'>
        <div className='flex flex-col gap-4 rounded-2xl border border-indigo-50 bg-white p-4 shadow-sm sm:col-span-2 sm:flex-row sm:items-center sm:justify-between xl:col-span-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                enabled
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-400'
              )}
            >
              <Sparkles className='size-5' />
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-[9px] font-black tracking-widest text-indigo-400 uppercase'>
                {t('aiAssistant.accessControl.global.title')}
              </p>
              <p className='text-sm leading-tight font-bold text-slate-700'>
                {enabled
                  ? t('aiAssistant.accessControl.global.enabledTitle')
                  : t('aiAssistant.accessControl.global.disabledTitle')}
              </p>
              <p className='text-[10px] font-medium text-slate-400'>
                {t('aiAssistant.accessControl.global.hint')}
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant={enabled ? 'destructive' : 'default'}
            className='h-9 w-full rounded-full px-4 text-[10px] font-black tracking-widest uppercase sm:w-auto'
            onClick={() => onEnabledChange(!enabled)}
          >
            {enabled
              ? t('aiAssistant.accessControl.global.disable')
              : t('aiAssistant.accessControl.global.enable')}
          </Button>
        </div>

        <div className='space-y-2'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
            <Zap className='size-3' />
            {t('aiAssistant.accessControl.api.provider')}
          </Label>
          <Select
            value={config.provider}
            onValueChange={(provider: AiGatewayConfig['provider']) =>
              updateGatewayConfig({ provider })
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
              config.provider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'
            }
            className='h-11 rounded-xl border-2 border-indigo-100 bg-white focus-visible:ring-indigo-200'
            value={config.model}
            onChange={(event) =>
              updateGatewayConfig({ model: event.target.value })
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
            value={config.apiKey}
            onChange={(event) =>
              updateGatewayConfig({ apiKey: event.target.value })
            }
          />
          {isMiniMax ? (
            <div className='animate-in space-y-1 rounded-lg border border-amber-100 bg-amber-50/50 p-2 slide-in-from-top-1'>
              <p className='text-[9px] leading-none font-black text-amber-700 uppercase'>
                {t('aiAssistant.accessControl.api.minimaxNoteTitle')}
              </p>
              <p className='text-[8px] leading-tight font-medium text-amber-600'>
                {t('aiAssistant.accessControl.api.minimaxNoteBody')}
              </p>
            </div>
          ) : null}
        </div>

        <div className='space-y-2'>
          <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest uppercase opacity-60'>
            <Globe className='size-3' />
            {t('aiAssistant.accessControl.api.baseUrl')}
          </Label>
          <Input
            placeholder='https://api.example.com'
            className='h-11 rounded-xl border-2 border-indigo-100 bg-white focus-visible:ring-indigo-200'
            value={config.baseUrl}
            onChange={(event) =>
              updateGatewayConfig({ baseUrl: event.target.value })
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
              isGroupIdMissing
                ? 'border-rose-400 ring-4 ring-rose-50'
                : 'border-indigo-100'
            )}
            value={config.groupId || ''}
            onChange={(event) =>
              updateGatewayConfig({ groupId: event.target.value })
            }
          />
          {isGroupIdMissing ? (
            <p className='animate-pulse text-[8px] font-black tracking-tighter text-rose-500'>
              {t('aiAssistant.accessControl.api.groupIdAlert')}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
