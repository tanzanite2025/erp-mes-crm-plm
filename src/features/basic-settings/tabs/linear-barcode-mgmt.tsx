'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Barcode, Loader2, RotateCcw, Save, Settings2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { canOpenRouteEntryNonBlocking } from '@/features/authz/guards/route-entry-access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { DMRuleConfigDialog } from '../components/dm-rule-config-dialog'
import { AppearanceActionDialog } from '../components/appearance-action-dialog'
import { DMRulesTable } from '../components/dm-rules-table'
import { LinearBarcodeSimulationSection } from '../components/linear-barcode-simulation-section'
import { useAppearanceMapping } from '../hooks/use-appearance-mapping'
import { parseLinearBarcodeCode } from '../utils/linear-barcode-parser'
import { type DMRuleSegment } from '../data/linear-barcode-rules-config'
import { BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY } from '../query-keys'
import {
  createDefaultLinearBarcodeProtocolConfig,
  DAY_OPTIONS,
  type LinearBarcodeProtocolConfig,
  type LinearBarcodeMockInputs,
} from '../data/linear-barcode-protocol'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const logger = createLogger('LinearBarcodeMgmt')

export function LinearBarcodeMgmt() {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const canOpenSequences = canOpenRouteEntryNonBlocking(user, '/basic-settings/sequences')

  // --- 本地逻辑状态 (编辑态) ---
  const [rules, setRules] = useState<DMRuleSegment[] | null>(null)
  const [mockInputs, setMockInputs] = useState<LinearBarcodeMockInputs | null>(null)
  
  // --- UI 状态 ---
  const [selectedSegment, setSelectedSegment] = useState<DMRuleSegment | null>(null)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [isAppearanceDialogOpen, setIsAppearanceDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isConfigSaving, setIsConfigSaving] = useState(false)

  // --- 数据拉取 (服务端真相) ---
  const { data: products = [] } = useGetProducts()
  const { data: appearanceMapping = null } = useAppearanceMapping()
  const {
    data: protocolConfig,
    isLoading: isConfigLoading,
    refetch: refetchProtocolConfig,
  } = useQuery({
    queryKey: BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY,
    queryFn: () => linearBarcodeProtocolService.getConfig(),
  })

  // --- 水合逻辑：仅在 protocolConfig 加载完成后初始化本地状态一次 ---
  useEffect(() => {
    if (protocolConfig && !rules && !mockInputs) {
      setRules(protocolConfig.rules)
      setMockInputs(protocolConfig.mockInput)
    }
  }, [protocolConfig, rules, mockInputs])

  // --- 衍生状态 ---
  const monthOptions = useMemo(() => {
    const monthUnit = t('common.units.month')
    return [
      { label: `1${monthUnit}`, value: '1' },
      { label: `2${monthUnit}`, value: '2' },
      { label: `3${monthUnit}`, value: '3' },
      { label: `4${monthUnit}`, value: '4' },
      { label: `5${monthUnit}`, value: '5' },
      { label: `6${monthUnit}`, value: '6' },
      { label: `7${monthUnit}`, value: '7' },
      { label: `8${monthUnit}`, value: '8' },
      { label: `9${monthUnit}`, value: '9' },
      { label: `10${monthUnit} (0)`, value: '0' },
      { label: `11${monthUnit} (N)`, value: 'N' },
      { label: `12${monthUnit} (D)`, value: 'D' },
    ]
  }, [t])

  const assembledCode = useMemo(() => {
    if (!mockInputs) return ''
    const { year, month, day, model, appearance, holePrefix, holes, serial } = mockInputs
    return `${year}${month}${day}${model}${appearance}${holePrefix}${holes}${serial}`.toUpperCase()
  }, [mockInputs])

  const parsedResult = useMemo(
    () =>
      parseLinearBarcodeCode(assembledCode, {
        appearanceMapping: appearanceMapping || undefined,
        products,
      }),
    [appearanceMapping, assembledCode, products],
  )

  const statusBadgeLabel = isConfigLoading
    ? t('basicSettings.linearBarcode.page.badges.loading')
    : isConfigSaving
      ? t('basicSettings.linearBarcode.page.badges.saving')
      : t('basicSettings.linearBarcode.page.badges.synced')

  const resetConfirmationText = t('basicSettings.linearBarcode.resetDialog.verifyTarget')

  // --- 交互 Handler ---
  const handleEditLogic = (segment: DMRuleSegment) => {
    if (segment.id === 'appearance') {
      setIsAppearanceDialogOpen(true)
      return
    }
    setSelectedSegment(segment)
    setIsConfigDialogOpen(true)
  }

  const handleSaveRule = (segmentId: string, newData: unknown) => {
    if (!rules) return
    const nextRules = rules.map((segment) => {
      if (segment.id !== segmentId) return segment
      if (Array.isArray(newData)) {
        return {
          ...segment,
          examples: newData.map((item: { key: string; value: string }) => `${item.key}=${item.value}`),
        }
      }
      return { ...segment, description: String(newData) }
    })
    setRules(nextRules)
  }

  const requestNextSerial = useCallback(async () => {
    const sequenceRuleKey = protocolConfig?.sequenceRuleKey
    if (!sequenceRuleKey) {
      toast.error(t('basicSettings.linearBarcode.toasts.requestSerialFailed'))
      return
    }

    try {
      const nextSerial = await numberingService.generateNumber(sequenceRuleKey)
      if (!/^\d{4}$/.test(nextSerial)) {
        throw new Error(t('basicSettings.linearBarcode.toasts.invalidSerialFormat', { key: sequenceRuleKey }))
      }

      setMockInputs((prev) => (prev ? { ...prev, serial: nextSerial } : null))
      toast.success(t('basicSettings.linearBarcode.toasts.requestSerialSuccess', { serial: nextSerial }))
    } catch (error) {
      const message = error instanceof Error ? error.message : t('basicSettings.linearBarcode.toasts.requestSerialFailed')
      toast.error(message)
    }
  }, [protocolConfig?.sequenceRuleKey, t])

  const handleSaveProtocol = useCallback(async (
    targetRules: DMRuleSegment[] | null = rules, 
    targetMockInputs: LinearBarcodeMockInputs | null = mockInputs
  ) => {
    if (!protocolConfig || !targetRules || !targetMockInputs) {
      toast.error(t('basicSettings.linearBarcode.toasts.saveFailed'))
      return
    }

    setIsConfigSaving(true)
    try {
      const payload: LinearBarcodeProtocolConfig = {
        ...protocolConfig,
        rules: targetRules,
        mockInput: targetMockInputs,
      }
      const saved = await linearBarcodeProtocolService.updateConfig(payload)
      queryClient.setQueryData(BASIC_SETTINGS_LINEAR_BARCODE_QUERY_KEY, saved)
      setRules(saved.rules)
      setMockInputs(saved.mockInput)
      toast.success(t('basicSettings.linearBarcode.toasts.saveSuccess'))
    } catch (error) {
      logger.error('Failed to save protocol config', error)
      toast.error(t('basicSettings.linearBarcode.toasts.saveFailed'))
    } finally {
      setIsConfigSaving(false)
    }
  }, [protocolConfig, rules, mockInputs, queryClient, t])

  const handleResetToDefaults = async () => {
    if (confirmText !== resetConfirmationText) return
    const defaults = createDefaultLinearBarcodeProtocolConfig()
    await handleSaveProtocol(defaults.rules, defaults.mockInput)
    setConfirmText('')
    setIsResetDialogOpen(false)
  }

  // --- 渲染逻辑 (严格 Loading 分支) ---
  if (isConfigLoading || !rules || !mockInputs) {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='flex flex-col gap-1 bg-muted/5 p-4 md:p-6 rounded-[32px] border border-dashed border-muted/50'>
          <div className='flex items-center gap-2 text-primary'>
            <div className='size-5 bg-primary/20 rounded-lg animate-pulse' />
            <div className='h-8 w-48 bg-muted rounded-lg animate-pulse' />
          </div>
          <div className='h-3 w-32 bg-muted/40 rounded mt-1 animate-pulse' />
        </div>
        <div className='h-[400px] w-full bg-muted/10 rounded-[24px] border border-dashed border-muted/30 flex items-center justify-center'>
          <div className='flex flex-col items-center gap-3'>
            <Loader2 className='size-10 text-primary animate-spin' />
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>
              {t('basicSettings.linearBarcode.page.badges.loading')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-4 md:p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <Barcode className='size-4' />
          <h3 className='text-lg font-black tracking-tighter italic uppercase'>{t('basicSettings.linearBarcode.page.title')}</h3>
        </div>
        <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('basicSettings.linearBarcode.page.subtitle')}
        </p>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-muted/5 p-4 md:p-6 rounded-[24px] border border-dashed border-muted/50'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Badge className='bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] px-4 h-6 tracking-widest uppercase rounded-full italic'>
            {t('basicSettings.linearBarcode.page.badges.active')}
          </Badge>
          <Badge className='bg-slate-500/10 text-slate-600 border-none font-black text-[9px] px-4 h-6 tracking-widest uppercase rounded-full italic'>
            {statusBadgeLabel}
          </Badge>
        </div>

        <div className='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto'>
          <Button
            className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
            onClick={() => void handleSaveProtocol()}
            disabled={isConfigSaving}
          >
            <Save className='size-4 mr-2' />
            {isConfigSaving ? t('basicSettings.linearBarcode.page.actions.saving') : t('basicSettings.linearBarcode.page.actions.save')}
          </Button>
          {canOpenSequences && (
            <Button
              variant='ghost'
              className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest'
              onClick={() => navigate({ to: '/basic-settings/sequences' })}
            >
              <Settings2 className='size-4 mr-2' />
              {t('basicSettings.linearBarcode.page.actions.numberingRule')}
            </Button>
          )}
          <Button
            variant='ghost'
            className='w-full sm:w-auto rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest hover:text-rose-600'
            onClick={() => setIsResetDialogOpen(true)}
          >
            <RotateCcw className='size-4 mr-2' />
            {t('basicSettings.linearBarcode.page.actions.reset')}
          </Button>
        </div>
      </div>

      <DMRulesTable
        rules={rules}
        appearanceMapping={appearanceMapping}
        onEdit={handleEditLogic}
        translationPrefix='basicSettings.linearBarcode'
        lengthLabel={locale === 'zh-CN' ? '位' : 'CHAR'}
      />

      <LinearBarcodeSimulationSection
        mockInputs={mockInputs}
        setMockInputs={(updater) => {
          setMockInputs((prev) => (typeof updater === 'function' ? updater(prev!) : updater))
        }}
        assembledCode={assembledCode}
        parsedResult={parsedResult}
        products={products}
        appearanceMapping={appearanceMapping as Record<string, { label?: string }> | null}
        monthOptions={monthOptions}
        dayOptions={DAY_OPTIONS}
        onRequestNextSerial={requestNextSerial}
        sequenceRuleKey={protocolConfig.sequenceRuleKey}
      />

      <DMRuleConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        segment={selectedSegment}
        onSave={handleSaveRule}
        translationPrefix='basicSettings.linearBarcode'
        protocolLabel='LINEAR-CODE128-STABLE'
      />

      <AppearanceActionDialog open={isAppearanceDialogOpen} onOpenChange={setIsAppearanceDialogOpen} />

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className='max-w-2xl rounded-[32px] overflow-hidden'>
          <DialogHeader className='p-8'>
            <div className='size-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/20'>
              <RotateCcw className='size-7' />
            </div>
            <DialogTitle className='text-xl font-black italic uppercase'>{t('basicSettings.linearBarcode.resetDialog.title')}</DialogTitle>
            <DialogDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
              {t('basicSettings.linearBarcode.resetDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className='p-8 space-y-4'>
            <div className='p-6 bg-muted/50 rounded-2xl border border-dashed border-muted/50 text-center select-none'>
              <span className='text-[11px] font-black tracking-[0.4em] text-slate-400'>{resetConfirmationText}</span>
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={t('basicSettings.linearBarcode.resetDialog.placeholder')}
              className='h-12 rounded-2xl text-center font-black'
            />
          </div>

          <DialogFooter className='p-8 flex gap-4'>
            <Button variant='ghost' className='flex-1 rounded-full' onClick={() => setIsResetDialogOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              className='flex-1 rounded-full bg-rose-600 hover:bg-rose-700'
              disabled={confirmText !== resetConfirmationText || isConfigSaving}
              onClick={handleResetToDefaults}
            >
              {t('basicSettings.linearBarcode.resetDialog.commit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
